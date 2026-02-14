/**
 * Checkout Service
 * Orchestrates unified checkout across multiple stores
 *
 * Flow:
 * 1. User clicks "Checkout" from cart
 * 2. Create checkout session with cart snapshot
 * 3. Collect shipping address
 * 4. Collect payment method (Stripe)
 * 5. Capture payment from user
 * 6. Create orders for each store
 * 7. Place orders with retailers (parallel)
 * 8. Track order placement status
 */

const pool = require('../db/pool');
const logger = require('../utils/logger');
const { NotFoundError, ValidationError, PaymentError } = require('../utils/errors');
const CartService = require('./cartService');
const StoreConnectionService = require('./storeConnectionService');
const RetailerAPIFactory = require('./retailerAPIFactory');
const ManualOrderService = require('./manualOrderService');
const HeadlessAutomationService = require('./headlessAutomationService');
const StripeService = require('./stripeService');
const StoreAccountService = require('./storeAccountService');
const RequirementAdapterService = require('./requirementAdapterService');
const TaxCalculationService = require('./taxCalculationService');
const ShippingCalculationService = require('./shippingCalculationService');
const { nanoid } = require('nanoid');

class CheckoutService {
  /**
   * Initiate checkout session
   * Creates a checkout session from current cart
   * @param {number} userId - User ID
   * @returns {Promise<Object>} Checkout session
   */
  static async initiateCheckout(userId) {
    try {
      // Get current cart
      const cart = await CartService.getCart(userId);

      if (!cart.stores || cart.stores.length === 0) {
        throw new ValidationError('Cart is empty');
      }

      RequirementAdapterService.enforceCheckoutCart(cart);

      // Generate session ID
      const sessionId = `cs_${nanoid(24)}`;

      // Calculate expiration (30 minutes)
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

      // Load store configs for placement decisions
      const storeConfigs = await this.getStoreConfigs(cart.stores.map(s => s.storeId));

      // Prepare stores to process
      const storesToProcess = cart.stores.map(store => {
        const config = storeConfigs.get(store.storeId) || {};
        const placementMethod = this.determinePlacementMethod(config);
        return {
          storeId: store.storeId,
          storeName: store.storeName,
          storeSlug: store.storeSlug,
          itemCount: store.itemCount,
          subtotalCents: store.subtotalCents,
          status: 'pending', // pending, processing, completed, failed
          integrationType: config.integrationType || null,
          supportsCheckout: config.supportsCheckout || false,
          placementMethod,
        };
      });

      // Require all stores to support in-app checkout for this flow
      const blocked = storesToProcess.filter(store => !['api', 'headless'].includes(store.placementMethod));
      if (blocked.length > 0) {
        const names = blocked.map(s => s.storeName || s.storeSlug || s.storeId).join(', ');
        throw new ValidationError(`These stores are not configured for in-app checkout: ${names}`);
      }

      // Attach any existing retailer payment methods to the session
      const existingPaymentMethods = await StoreAccountService.getPaymentMethodsForStores(
        userId,
        cart.stores.map(s => s.storeId)
      );
      const checkoutMetadata = await this.buildCheckoutScaffoldMetadata(
        userId,
        cart,
        storesToProcess,
        existingPaymentMethods
      );

      // Create checkout session
      const result = await pool.query(
        `INSERT INTO checkout_sessions (
          user_id,
          session_id,
          cart_snapshot,
          subtotal_cents,
          total_cents,
          stores_to_process,
          retailer_payment_methods,
          checkout_metadata,
          expires_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *`,
        [
          userId,
          sessionId,
          JSON.stringify(cart),
          cart.summary.subtotalCents,
          cart.summary.grandTotalCents,
          JSON.stringify(storesToProcess),
          JSON.stringify(existingPaymentMethods || {}),
          JSON.stringify(checkoutMetadata || {}),
          expiresAt,
        ]
      );

      logger.info(`Checkout session initiated: ${sessionId} for user ${userId}`);

      return this.formatCheckoutSession(result.rows[0]);
    } catch (error) {
      logger.error('Error initiating checkout:', error);
      throw error;
    }
  }

  /**
   * Add shipping address to checkout session
   * @param {string} sessionId - Checkout session ID
   * @param {number} userId - User ID
   * @param {Object} address - Shipping address
   * @returns {Promise<Object>} Updated checkout session
   */
  static async addShippingAddress(sessionId, userId, address) {
    // Validate address
    this.validateAddress(address);

    const result = await pool.query(
      `UPDATE checkout_sessions
       SET shipping_address = $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE session_id = $2 AND user_id = $3
       RETURNING *`,
      [JSON.stringify(address), sessionId, userId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Checkout session not found');
    }

    logger.info(`Shipping address added to session ${sessionId}`);

    return this.formatCheckoutSession(result.rows[0]);
  }

  /**
   * Save recipient/contact information for checkout
   * @param {string} sessionId
   * @param {number} userId
   * @param {Object} recipient
   * @returns {Promise<Object>}
   */
  static async setRecipientInfo(sessionId, userId, recipient) {
    const normalizedRecipient = this.normalizeRecipientInfo(recipient);
    if (!normalizedRecipient.email) {
      throw new ValidationError('Recipient email is required');
    }
    if (!normalizedRecipient.phone) {
      throw new ValidationError('Recipient phone is required');
    }

    return this.patchCheckoutMetadata(sessionId, userId, {
      recipient: normalizedRecipient,
    });
  }

  /**
   * Set billing preferences / address
   * @param {string} sessionId
   * @param {number} userId
   * @param {Object} payload
   * @returns {Promise<Object>}
   */
  static async setBillingPreferences(sessionId, userId, payload = {}) {
    const sameAsShipping = payload.sameAsShipping !== false;
    const billingAddress = payload.billingAddress || null;

    if (!sameAsShipping && !billingAddress) {
      throw new ValidationError('billingAddress is required when sameAsShipping is false');
    }
    if (!sameAsShipping) {
      this.validateAddress(billingAddress);
    }

    const result = await pool.query(
      `UPDATE checkout_sessions
       SET billing_address = $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE session_id = $2 AND user_id = $3
       RETURNING *`,
      [sameAsShipping ? null : JSON.stringify(billingAddress), sessionId, userId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Checkout session not found');
    }

    return this.patchCheckoutMetadata(sessionId, userId, {
      billing: {
        sameAsShipping: !!sameAsShipping,
      },
    });
  }

  /**
   * Apply promo code to checkout session (scaffold-level validation)
   * @param {string} sessionId
   * @param {number} userId
   * @param {Object} payload
   * @returns {Promise<Object>}
   */
  static async applyPromoCode(sessionId, userId, payload = {}) {
    const code = String(payload.code || '').trim();
    if (!code) {
      throw new ValidationError('Promo code is required');
    }

    const session = await this.getCheckoutSession(sessionId, userId);
    const eligibleStoreIds = (session.cartSnapshot?.stores || []).map(store => store.storeId);

    return this.patchCheckoutMetadata(sessionId, userId, {
      promo: {
        code,
        eligibleStoreIds,
        appliedAt: new Date().toISOString(),
      },
    });
  }

  /**
   * Set per-store shipping selections for checkout
   * @param {string} sessionId
   * @param {number} userId
   * @param {Object} payload
   * @returns {Promise<Object>}
   */
  static async setShippingSelections(sessionId, userId, payload = {}) {
    const selections = payload.selections || {};
    if (typeof selections !== 'object' || Array.isArray(selections)) {
      throw new ValidationError('selections must be an object keyed by storeId');
    }

    const session = await this.getCheckoutSession(sessionId, userId);
    const storeIds = new Set((session.cartSnapshot?.stores || []).map(s => String(s.storeId)));

    for (const [storeId, selection] of Object.entries(selections)) {
      if (!storeIds.has(String(storeId))) {
        throw new ValidationError(`Invalid storeId in shipping selections: ${storeId}`);
      }
      if (!selection || typeof selection !== 'object') {
        throw new ValidationError(`Shipping selection for store ${storeId} must be an object`);
      }
      if (!selection.optionId) {
        throw new ValidationError(`Shipping selection for store ${storeId} requires optionId`);
      }
    }

    return this.patchCheckoutMetadata(sessionId, userId, {
      shipping: {
        selections,
      },
    });
  }

  /**
   * Add payment method to checkout session
   * @param {string} sessionId - Checkout session ID
   * @param {number} userId - User ID
   * @param {string} stripePaymentMethodId - Stripe payment method ID
   * @returns {Promise<Object>} Updated checkout session
   */
  static async addPaymentMethod(sessionId, userId, stripePaymentMethodId, storeId = null) {
    if (storeId !== null && (!Number.isInteger(storeId) || storeId < 1)) {
      throw new ValidationError('storeId must be a positive integer when provided');
    }

    let result;
    if (storeId) {
      result = await pool.query(
        `UPDATE checkout_sessions
         SET retailer_payment_methods = COALESCE(retailer_payment_methods, '{}'::jsonb) || jsonb_build_object($1::text, $2::text),
             updated_at = CURRENT_TIMESTAMP
         WHERE session_id = $3 AND user_id = $4
         RETURNING *`,
        [String(storeId), stripePaymentMethodId, sessionId, userId]
      );

      // Persist for future checkouts
      await StoreAccountService.savePaymentMethod(userId, storeId, { token: stripePaymentMethodId });
    } else {
      result = await pool.query(
        `UPDATE checkout_sessions
         SET payment_method_id = $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE session_id = $2 AND user_id = $3
         RETURNING *`,
        [stripePaymentMethodId, sessionId, userId]
      );
    }

    if (result.rows.length === 0) {
      throw new NotFoundError('Checkout session not found');
    }

    logger.info(`Payment method added to session ${sessionId}`);

    return this.formatCheckoutSession(result.rows[0]);
  }

  /**
   * Place orders with all retailers
   * This is the main orchestration method
   * @param {string} sessionId - Checkout session ID
   * @param {number} userId - User ID
   * @returns {Promise<Object>} Order placement results
   */
  static async placeOrders(sessionId, userId) {
    try {
      // Get checkout session
      const session = await this.getCheckoutSession(sessionId, userId);

      // Validate session is ready
      this.validateSessionForPlacement(session);
      this.validateStoresForInAppCheckout(session);

      // Update status to processing
      await this.updateSessionStatus(sessionId, 'processing');

      // Step 1: Capture payment from customer ONLY if Muse is merchant of record
      if (this.requiresMusePayment(session)) {
        const paymentResult = await this.capturePayment(session);

        if (!paymentResult.success) {
          await this.updateSessionStatus(sessionId, 'failed');
          throw new PaymentError(paymentResult.error || 'Payment failed');
        }
      }

      // Step 2: Create order records for each store
      const orders = await this.createOrdersFromSession(session);

      // Step 3: Place orders with retailers (in parallel)
      const placementResults = await this.placeOrdersWithRetailers(orders, session);

      const successfulOrders = placementResults.filter(o => o.status === 'placed').length;
      const failedOrders = placementResults.filter(o => o.status === 'failed').length;

      // Step 4: Update checkout session and cart state based on placement outcome
      if (failedOrders === 0) {
        await this.updateSessionStatus(sessionId, 'completed');
        await CartService.clearCart(userId);
      } else {
        await this.clearSuccessfullyPlacedItemsFromCart(userId, orders, placementResults);
        await this.updateSessionStatus(
          sessionId,
          'failed',
          `${failedOrders} of ${orders.length} orders failed during placement`
        );
      }

      logger.info(
        `Checkout finalized for session ${sessionId}: ${successfulOrders} successful, ${failedOrders} failed`
      );

      return {
        checkoutSessionId: sessionId,
        orders: placementResults,
        summary: {
          totalOrders: orders.length,
          successfulOrders,
          failedOrders,
          status: failedOrders === 0 ? 'completed' : 'partial_failure',
        },
      };
    } catch (error) {
      logger.error(`Error placing orders for session ${sessionId}:`, error);
      await this.updateSessionStatus(sessionId, 'failed', error.message);
      throw error;
    }
  }

  /**
   * Create order records for each store in the checkout session
   * @param {Object} session - Checkout session
   * @returns {Promise<Array>} Created orders
   */
  static async createOrdersFromSession(session) {
    const orders = [];
    const cartSnapshot = session.cartSnapshot;
    const storePlacementMethods = new Map(
      (session.storesToProcess || []).map(store => [store.storeId, store.placementMethod])
    );

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      for (const store of cartSnapshot.stores) {
        // Generate Muse order number
        const museOrderNumber = `MO-${nanoid(10).toUpperCase()}`;

        // Calculate shipping for this store
        const shippingResult = await ShippingCalculationService.calculateShipping({
          subtotalCents: store.subtotalCents,
          itemCount: store.itemCount,
          shippingAddress: session.shippingAddress,
          shippingMethod: session.checkoutMetadata?.shipping?.selections?.[store.storeId]?.optionId || 'standard',
          storeId: store.storeId,
        });

        // Calculate tax for this store
        const taxResult = await TaxCalculationService.calculateTax({
          subtotalCents: store.subtotalCents,
          shippingAddress: session.shippingAddress,
          items: store.items,
        });

        const shippingCents = shippingResult.shippingCents || 0;
        const taxCents = taxResult.taxCents || 0;
        const totalCents = store.subtotalCents + shippingCents + taxCents;

        // Create order record
        const orderResult = await client.query(
          `INSERT INTO orders (
            user_id,
            checkout_session_id,
            store_id,
            muse_order_number,
            subtotal_cents,
            shipping_cents,
            tax_cents,
            total_cents,
            shipping_address,
            status,
            placement_method,
            metadata
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          RETURNING *`,
          [
            session.userId,
            session.id,
            store.storeId,
            museOrderNumber,
            store.subtotalCents,
            shippingCents,
            taxCents,
            totalCents,
            session.shippingAddress,
            'pending',
            storePlacementMethods.get(store.storeId) || 'manual',
            JSON.stringify({
              shippingMethod: shippingResult.method,
              shippingCarrier: shippingResult.carrier,
              estimatedDelivery: shippingResult.estimatedDelivery,
              taxJurisdiction: taxResult.taxJurisdiction,
              taxRate: taxResult.taxRate,
            }),
          ]
        );

        const order = orderResult.rows[0];
        order.items = [];

        // Create order items
        for (const item of store.items) {
          const itemResult = await client.query(
            `INSERT INTO order_items (
              order_id,
              product_name,
              product_sku,
              product_url,
              product_image_url,
              product_description,
              size,
              color,
              quantity,
              unit_price_cents,
              total_price_cents,
              original_price_cents
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING *`,
            [
              order.id,
              item.productName,
              item.productSku,
              item.productUrl,
              item.productImageUrl,
              item.productDescription,
              item.size,
              item.color,
              item.quantity,
              item.priceCents,
              item.totalPriceCents,
              item.originalPriceCents,
            ]
          );

          order.items.push(itemResult.rows[0]);
        }

        orders.push(order);
      }

      await client.query('COMMIT');
      logger.info(`Created ${orders.length} order records for session ${session.sessionId}`);
      return orders;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Place orders with retailers (orchestration point)
   * @param {Array} orders - Order records to place
   * @param {Object} session - Checkout session
   * @returns {Promise<Array>} Placement results
   */
  static async placeOrdersWithRetailers(orders, session) {
    const placementPromises = orders.map(order =>
      this.placeOrderWithRetailer(order, session)
    );

    // Execute all placements in parallel
    const results = await Promise.allSettled(placementPromises);

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        logger.error(`Failed to place order ${orders[index].museOrderNumber}:`, result.reason);
        return {
          orderId: orders[index].id,
          museOrderNumber: orders[index].museOrderNumber,
          status: 'failed',
          error: result.reason.message,
        };
      }
    });
  }

  /**
   * Place a single order with a retailer
   * This method routes to the appropriate placement strategy
   * @param {Object} order - Order to place
   * @param {Object} session - Checkout session
   * @returns {Promise<Object>} Placement result
   */
  static async placeOrderWithRetailer(order, session) {
    const { placement_method: method, store_id: storeId } = order;

    logger.info(`Placing order ${order.muse_order_number} with store ${storeId} via ${method}`);

    try {
      let result;

      switch (method) {
        case 'api':
          result = await this.placeOrderViaAPI(order, session);
          break;
        case 'headless':
          result = await this.placeOrderViaHeadless(order, session);
          break;
        case 'manual':
          result = await this.placeOrderManually(order, session);
          break;
        default:
          throw new Error(`Unknown placement method: ${method}`);
      }

      // Update order with placement result
      await this.updateOrderAfterPlacement(order.id, result);

      return {
        orderId: order.id,
        museOrderNumber: order.muse_order_number,
        storeOrderNumber: result.storeOrderNumber,
        status: 'placed',
        placedAt: new Date(),
      };
    } catch (error) {
      logger.error(`Failed to place order ${order.muse_order_number}:`, error);

      // Update order as failed
      await pool.query(
        `UPDATE orders
         SET status = 'failed',
             placement_error = $1,
             placement_attempts = placement_attempts + 1
         WHERE id = $2`,
        [error.message, order.id]
      );

      throw error;
    }
  }

  /**
   * Place order via retailer API (OAuth-based)
   * User's retailer account places the order, payment goes directly to retailer
   * @param {Object} order - Order to place
   * @param {Object} session - Checkout session
   * @returns {Promise<Object>} API response
   */
  static async placeOrderViaAPI(order, session) {
    logger.info(`Placing order ${order.muse_order_number} via retailer API`);

    try {
      // Get user's OAuth connection to this store
      const connection = await StoreConnectionService.getConnection(
        session.userId,
        order.store_id
      );

      if (!connection || !connection.isConnected) {
        throw new Error(`User not connected to store ID ${order.store_id}`);
      }

      // Get valid access token (auto-refreshes if needed)
      const accessToken = await StoreConnectionService.getAccessToken(
        session.userId,
        order.store_id
      );

      // Get retailer API client
      const apiClient = RetailerAPIFactory.getClient(order.store_id, {
        accessToken,
      });

      // Get order items from database
      const itemsResult = await pool.query(
        `SELECT * FROM order_items WHERE order_id = $1`,
        [order.id]
      );

      // Get payment method from session
      const paymentMethodId = session.paymentMethods?.[String(order.store_id)];

      // Place order with retailer
      // Payment is processed by RETAILER using user's saved card
      // NOT processed by Muse
      const orderPayload = {
        items: itemsResult.rows.map(item => ({
          sku: item.product_sku,
          quantity: item.quantity,
          size: item.size,
          color: item.color,
        })),
        shippingAddress: session.shippingAddress,
      };

      if (paymentMethodId) {
        orderPayload.paymentMethodId = paymentMethodId; // User's saved card at retailer
      }

      const orderResult = await apiClient.createOrder(orderPayload);

      logger.info(`Order placed successfully with retailer: ${orderResult.orderNumber}`);

      return {
        storeOrderNumber: orderResult.orderNumber,
        success: true,
        trackingNumber: orderResult.trackingNumber,
        total: orderResult.total,
      };
    } catch (error) {
      logger.error(`Failed to place order via API: ${error.message}`);
      throw error;
    }
  }

  /**
   * Place order via headless browser automation (Tier 2)
   * @param {Object} order - Order to place
   * @param {Object} session - Checkout session
   * @returns {Promise<Object>} Automation result
   */
  static async placeOrderViaHeadless(order, session) {
    logger.info(`Placing order ${order.muse_order_number} via headless automation`);

    try {
      // Use headless automation service
      const result = await HeadlessAutomationService.placeOrder(order, session);

      logger.info(`Headless automation successful: ${result.storeOrderNumber}`);

      return result;
    } catch (error) {
      logger.error(`Headless automation failed for ${order.muse_order_number}:`, error);

      // If automation fails, fall back to manual placement
      logger.info('Falling back to manual placement...');
      return await this.placeOrderManually(order, session);
    }
  }

  /**
   * Mark order for manual placement
   * @param {Object} order - Order to place
   * @param {Object} session - Checkout session
   * @returns {Promise<Object>} Manual placement info
   */
  static async placeOrderManually(order, session) {
    logger.info(`Creating manual order task for ${order.muse_order_number}`);

    // Create task for operations team
    const task = await ManualOrderService.createManualOrderTask(order);

    // TODO: Send notification to ops team
    // - Email notification
    // - Slack notification
    // - Dashboard alert

    return {
      storeOrderNumber: null,
      success: true,
      requiresManualPlacement: true,
      taskId: task.orderId,
      message: task.message,
    };
  }

  /**
   * Capture payment from customer via Stripe
   * @param {Object} session - Checkout session
   * @returns {Promise<Object>} Payment result
   */
  static async capturePayment(session) {
    try {
      logger.info(`Capturing payment for session ${session.sessionId}: $${session.totalCents / 100}`);

      // Validate payment method exists
      if (!session.paymentMethodId) {
        throw new PaymentError('Payment method is required');
      }

      // Create payment intent with Stripe
      const paymentIntent = await StripeService.createPaymentIntent({
        amountCents: session.totalCents,
        currency: session.currency || 'USD',
        userId: session.userId,
        checkoutSessionId: session.sessionId,
        description: `Muse Order - ${session.storesToProcess.length} stores`,
      });

      // Confirm payment intent with payment method
      const confirmedPayment = await StripeService.confirmPaymentIntent(
        paymentIntent.id,
        session.paymentMethodId
      );

      // Check if payment succeeded
      if (confirmedPayment.status !== 'succeeded') {
        throw new PaymentError(
          `Payment failed with status: ${confirmedPayment.status}`
        );
      }

      // Get charge ID for transaction record
      const chargeId = confirmedPayment.charges[0]?.id;

      // Record transaction in database
      const transactionId = `txn_${nanoid(24)}`;

      await pool.query(
        `INSERT INTO payment_transactions (
          checkout_session_id,
          transaction_id,
          stripe_payment_intent_id,
          stripe_charge_id,
          amount_cents,
          currency,
          transaction_type,
          status,
          payment_method_type,
          last4,
          metadata
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          session.id,
          transactionId,
          paymentIntent.id,
          chargeId,
          session.totalCents,
          session.currency || 'USD',
          'charge',
          'succeeded',
          'card', // TODO: Get actual payment method type
          null, // TODO: Get last4 from payment method
          JSON.stringify({
            sessionId: session.sessionId,
            storeCount: session.storesToProcess.length,
          }),
        ]
      );

      // Update checkout session with payment info
      await pool.query(
        `UPDATE checkout_sessions
         SET payment_captured_at = CURRENT_TIMESTAMP,
             stripe_payment_intent_id = $1
         WHERE id = $2`,
        [paymentIntent.id, session.id]
      );

      logger.info(`Payment captured successfully: ${paymentIntent.id} - Charge: ${chargeId}`);

      return {
        success: true,
        transactionId,
        paymentIntentId: paymentIntent.id,
        chargeId,
        amountCents: session.totalCents,
      };
    } catch (error) {
      logger.error('Payment capture failed:', error);

      // Record failed transaction
      try {
        await pool.query(
          `INSERT INTO payment_transactions (
            checkout_session_id,
            transaction_id,
            amount_cents,
            currency,
            transaction_type,
            status,
            failure_reason
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            session.id,
            `txn_${nanoid(24)}`,
            session.totalCents,
            session.currency || 'USD',
            'charge',
            'failed',
            error.message,
          ]
        );
      } catch (dbError) {
        logger.error('Failed to record failed transaction:', dbError);
      }

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Update order after placement with retailer
   * @param {number} orderId - Order ID
   * @param {Object} result - Placement result
   */
  static async updateOrderAfterPlacement(orderId, result) {
    await pool.query(
      `UPDATE orders
       SET status = 'placed',
           store_order_number = $1,
           placed_at = CURRENT_TIMESTAMP,
           tracking_number = $2
       WHERE id = $3`,
      [result.storeOrderNumber, result.trackingNumber, orderId]
    );
  }

  /**
   * Remove cart items that were successfully placed
   * @param {number} userId
   * @param {Array} orders
   * @param {Array} placementResults
   */
  static async clearSuccessfullyPlacedItemsFromCart(userId, orders, placementResults) {
    const placedOrderIds = new Set(
      placementResults
        .filter(result => result.status === 'placed')
        .map(result => result.orderId)
    );

    if (placedOrderIds.size === 0) {
      return;
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      for (const order of orders) {
        if (!placedOrderIds.has(order.id)) {
          continue;
        }

        for (const item of order.items || []) {
          await client.query(
            `DELETE FROM cart_items
             WHERE user_id = $1
               AND store_id = $2
               AND product_sku IS NOT DISTINCT FROM $3
               AND COALESCE(size, '') = COALESCE($4, '')
               AND COALESCE(color, '') = COALESCE($5, '')`,
            [
              userId,
              order.store_id,
              item.product_sku,
              item.size,
              item.color,
            ]
          );
        }
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to clear successfully placed cart items:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get checkout session
   * @param {string} sessionId - Session ID
   * @param {number} userId - User ID
   * @returns {Promise<Object>} Checkout session
   */
  static async getCheckoutSession(sessionId, userId) {
    const result = await pool.query(
      `SELECT * FROM checkout_sessions
       WHERE session_id = $1 AND user_id = $2`,
      [sessionId, userId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Checkout session not found');
    }

    return this.formatCheckoutSession(result.rows[0]);
  }

  /**
   * Get order by ID with items
   * @param {number} orderId - Order ID
   * @returns {Promise<Object>} Order with items
   */
  static async getOrderById(orderId) {
    const orderResult = await pool.query(
      `SELECT * FROM orders WHERE id = $1`,
      [orderId]
    );

    if (orderResult.rows.length === 0) {
      throw new NotFoundError('Order not found');
    }

    const order = orderResult.rows[0];

    // Get order items
    const itemsResult = await pool.query(
      `SELECT * FROM order_items WHERE order_id = $1`,
      [orderId]
    );

    order.items = itemsResult.rows;

    return order;
  }

  /**
   * Update checkout session status
   * @param {string} sessionId - Session ID
   * @param {string} status - New status
   * @param {string} errorMessage - Optional error message
   */
  static async updateSessionStatus(sessionId, status, errorMessage = null) {
    await pool.query(
      `UPDATE checkout_sessions
       SET status = $1,
           error_message = $2,
           completed_at = CASE
             WHEN $1 IN ('completed', 'failed', 'cancelled') THEN CURRENT_TIMESTAMP
             ELSE completed_at
           END,
           updated_at = CURRENT_TIMESTAMP
       WHERE session_id = $3`,
      [status, errorMessage, sessionId]
    );
  }

  /**
   * Validate checkout session is ready for order placement
   * @param {Object} session - Checkout session
   */
  static validateSessionForPlacement(session) {
    if (!session.shippingAddress) {
      throw new ValidationError('Shipping address is required');
    }

    if (this.requiresMusePayment(session) && !session.paymentMethodId) {
      throw new ValidationError('Payment method is required');
    }

    if (session.status !== 'pending') {
      throw new ValidationError(`Session status must be pending, current: ${session.status}`);
    }

    // Check expiration
    if (new Date(session.expiresAt) < new Date()) {
      throw new ValidationError('Checkout session has expired');
    }

    RequirementAdapterService.enforceCheckoutCart(session.cartSnapshot);
  }

  /**
   * Ensure all stores can be checked out in-app and required retailer payment methods exist
   * @param {Object} session - Checkout session
   */
  static validateStoresForInAppCheckout(session) {
    const stores = session.storesToProcess || [];
    const inAppStores = stores.filter(store =>
      ['api', 'headless'].includes((store.placementMethod || '').toLowerCase())
    );

    const invalidStores = stores.filter(store =>
      !['api', 'headless'].includes((store.placementMethod || '').toLowerCase())
    );

    if (invalidStores.length > 0) {
      const names = invalidStores.map(s => s.storeName || s.storeSlug || s.storeId).join(', ');
      throw new ValidationError(
        `These stores are not configured for in-app checkout: ${names}`
      );
    }

    const unsupportedHeadless = inAppStores.filter(store =>
      (store.placementMethod || '').toLowerCase() === 'headless' &&
      !HeadlessAutomationService.isSupported(store.storeId)
    );

    if (unsupportedHeadless.length > 0) {
      const names = unsupportedHeadless.map(s => s.storeName || s.storeSlug || s.storeId).join(', ');
      throw new ValidationError(
        `Headless checkout not yet supported for: ${names}`
      );
    }

    const paymentMethods = session.paymentMethods || {};
    const missingPayments = inAppStores.filter(store => !paymentMethods[String(store.storeId)]);

    if (missingPayments.length > 0) {
      const names = missingPayments.map(s => s.storeName || s.storeSlug || s.storeId).join(', ');
      throw new ValidationError(
        `Missing retailer payment method for: ${names}`
      );
    }
  }

  /**
   * Compute checkout readiness for current cart
   * @param {number} userId
   * @returns {Promise<Object>}
   */
  static async getCheckoutReadiness(userId) {
    const cart = await CartService.getCart(userId);

    if (!cart.stores || cart.stores.length === 0) {
      return {
        ready: false,
        reason: 'empty_cart',
        stores: [],
      };
    }

    const storeConfigs = await this.getStoreConfigs(cart.stores.map(s => s.storeId));
    const paymentMethods = await StoreAccountService.getPaymentMethodsForStores(
      userId,
      cart.stores.map(s => s.storeId)
    );

    const accounts = await StoreAccountService.getUserStoreAccounts(userId);
    const accountByStoreId = new Map(accounts.map(a => [a.store_id, a]));
    const stores = cart.stores.map(store => {
      const config = storeConfigs.get(store.storeId) || {};
      const placementMethod = this.determinePlacementMethod(config);
      const issues = [];
      const account = accountByStoreId.get(store.storeId) || null;

      if (!['api', 'headless'].includes(placementMethod)) {
        issues.push('not_in_app_enabled');
      }

      if (placementMethod === 'headless' && !HeadlessAutomationService.isSupported(store.storeId)) {
        issues.push('headless_not_supported');
      }

      if (!paymentMethods[String(store.storeId)]) {
        issues.push('missing_retailer_payment_method');
      }

      return {
        storeId: store.storeId,
        storeName: store.storeName,
        storeSlug: store.storeSlug,
        placementMethod,
        supportsCheckout: !!config.supportsCheckout,
        connection: {
          isLinked: !!account?.is_linked,
          connectAction: {
            method: 'POST',
            path: `/api/v1/store-accounts/${store.storeId}/link`,
          },
        },
        shippingOptions: this.buildShippingOptionsForStore(store),
        ready: issues.length === 0,
        issues,
      };
    });

    const requirementEvaluation = RequirementAdapterService.evaluateCheckoutCart(cart);

    if (requirementEvaluation.blockers.includes('out_of_stock_items_present')) {
      for (const store of stores) {
        const cartStore = cart.stores.find(s => s.storeId === store.storeId);
        if ((cartStore?.items || []).some(item => item.inStock === false)) {
          store.ready = false;
          if (!store.issues.includes('out_of_stock_items_present')) {
            store.issues.push('out_of_stock_items_present');
          }
        }
      }
    }

    for (const storeRule of requirementEvaluation.details.storeRules || []) {
      const store = stores.find(s => s.storeId === storeRule.storeId);
      if (store) {
        store.ready = false;
        if (!store.issues.includes(storeRule.code)) {
          store.issues.push(storeRule.code);
        }
      }
    }

    for (const productRule of requirementEvaluation.details.productTypeRules || []) {
      const store = stores.find(s => s.storeId === productRule.storeId);
      if (store) {
        store.ready = false;
        if (!store.issues.includes(productRule.code)) {
          store.issues.push(productRule.code);
        }
      }
    }

    const ready = stores.every(s => s.ready) && requirementEvaluation.passed;
    return {
      ready,
      stores,
      payment: {
        supportsApplePay: !!process.env.STRIPE_SECRET_KEY,
        museSavedPaymentMethods: [],
        retailerSavedPaymentMethods: Object.keys(paymentMethods).map(storeId => ({
          storeId: parseInt(storeId, 10),
          token: paymentMethods[storeId],
        })),
      },
      promo: {
        eligibleStoreIds: cart.stores.map(store => store.storeId),
      },
      requirementIssues: requirementEvaluation.blockers,
      requirementWarnings: requirementEvaluation.warnings,
      requirementDetails: requirementEvaluation.details,
      requirementPolicy: requirementEvaluation.policy,
    };
  }

  /**
   * Validate shipping address
   * @param {Object} address - Address to validate
   */
  static validateAddress(address) {
    if (!address || typeof address !== 'object') {
      throw new ValidationError('Address is required');
    }

    const required = ['name', 'address1', 'city', 'state', 'zip', 'country'];

    for (const field of required) {
      if (!address[field]) {
        throw new ValidationError(`${field} is required`);
      }
    }

    // Basic US zip code validation
    if (address.country === 'US' && !/^\d{5}(-\d{4})?$/.test(address.zip)) {
      throw new ValidationError('Invalid US zip code');
    }
  }

  /**
   * Determine placement method for a store
   * @param {Object} config - Store config
   * @returns {string} Placement method
   */
  static determinePlacementMethod(config) {
    const integrationType = (config.integrationType || '').toLowerCase();
    const supportsCheckout = !!config.supportsCheckout;

    if (!supportsCheckout) {
      return 'manual';
    }

    if (integrationType === 'api' || integrationType === 'oauth') {
      return 'api';
    }

    if (integrationType === 'headless') {
      return 'headless';
    }

    if (integrationType === 'manual' || integrationType === 'redirect') {
      return 'manual';
    }

    return 'manual';
  }

  /**
   * Fetch store configs for placement decisions
   * @param {number[]} storeIds
   * @returns {Promise<Map<number, Object>>}
   */
  static async getStoreConfigs(storeIds) {
    if (!storeIds || storeIds.length === 0) {
      return new Map();
    }

    const result = await pool.query(
      `SELECT id, integration_type, supports_checkout
       FROM stores
       WHERE id = ANY($1::int[])`,
      [storeIds]
    );

    const map = new Map();
    for (const row of result.rows) {
      map.set(row.id, {
        integrationType: row.integration_type,
        supportsCheckout: row.supports_checkout,
      });
    }

    return map;
  }

  /**
   * Determine if Muse should capture payment
   * @param {Object} session
   * @returns {boolean}
   */
  static requiresMusePayment(session) {
    const stores = session.storesToProcess || [];
    return stores.some(store => store.placementMethod === 'muse');
  }

  /**
   * Format checkout session for response
   * @param {Object} session - Raw session from DB
   * @returns {Object} Formatted session
   */
  static formatCheckoutSession(session) {
    const checkoutMetadata = session.checkout_metadata || {};
    return {
      id: session.id,
      sessionId: session.session_id,
      userId: session.user_id,
      cartSnapshot: session.cart_snapshot,
      shippingAddress: session.shipping_address,
      billingAddress: session.billing_address,
      paymentMethodId: session.payment_method_id,
      paymentMethods: session.retailer_payment_methods || {},
      subtotalCents: session.subtotal_cents,
      shippingCents: session.shipping_cents,
      taxCents: session.tax_cents,
      totalCents: session.total_cents,
      currency: session.currency,
      status: session.status,
      storesToProcess: session.stores_to_process,
      checkoutMetadata,
      recipient: checkoutMetadata.recipient || null,
      billingPreferences: checkoutMetadata.billing || { sameAsShipping: true },
      promo: checkoutMetadata.promo || null,
      shippingPreferences: checkoutMetadata.shipping || { selections: {} },
      paymentPreferences: checkoutMetadata.payment || {
        supportsApplePay: !!process.env.STRIPE_SECRET_KEY,
      },
      errorMessage: session.error_message,
      startedAt: session.started_at,
      completedAt: session.completed_at,
      expiresAt: session.expires_at,
      createdAt: session.created_at,
    };
  }

  /**
   * Build default checkout metadata scaffold for frontend
   * @param {number} userId
   * @param {Object} cart
   * @param {Array} storesToProcess
   * @param {Object} retailerPaymentMethods
   * @returns {Promise<Object>}
   */
  static async buildCheckoutScaffoldMetadata(userId, cart, storesToProcess, retailerPaymentMethods) {
    const accounts = await StoreAccountService.getUserStoreAccounts(userId);
    const accountByStoreId = new Map(accounts.map(a => [a.store_id, a]));

    const shippingDefaults = {};
    const storeConnect = {};
    for (const store of cart.stores || []) {
      const options = this.buildShippingOptionsForStore(store);
      shippingDefaults[String(store.storeId)] = {
        optionId: options[0]?.id || 'standard',
      };
      const account = accountByStoreId.get(store.storeId) || null;
      storeConnect[String(store.storeId)] = {
        isLinked: !!account?.is_linked,
        connectAction: {
          method: 'POST',
          path: `/api/v1/store-accounts/${store.storeId}/link`,
        },
      };
    }

    return {
      recipient: null,
      billing: { sameAsShipping: true },
      promo: {
        code: null,
        eligibleStoreIds: (cart.stores || []).map(store => store.storeId),
      },
      shipping: {
        selections: shippingDefaults,
      },
      payment: {
        supportsApplePay: !!process.env.STRIPE_SECRET_KEY,
        retailerPaymentMethods: retailerPaymentMethods || {},
      },
      storeConnect,
      stores: (storesToProcess || []).map(store => ({
        storeId: store.storeId,
        shippingOptions: this.buildShippingOptionsForStore(
          (cart.stores || []).find(s => s.storeId === store.storeId) || { storeId: store.storeId, items: [] }
        ),
      })),
    };
  }

  /**
   * Merge and persist checkout metadata
   * @param {string} sessionId
   * @param {number} userId
   * @param {Object} patch
   * @returns {Promise<Object>}
   */
  static async patchCheckoutMetadata(sessionId, userId, patch) {
    const existing = await pool.query(
      `SELECT checkout_metadata
       FROM checkout_sessions
       WHERE session_id = $1 AND user_id = $2`,
      [sessionId, userId]
    );

    if (existing.rows.length === 0) {
      throw new NotFoundError('Checkout session not found');
    }

    const current = existing.rows[0].checkout_metadata || {};
    const merged = { ...current, ...(patch || {}) };

    const updated = await pool.query(
      `UPDATE checkout_sessions
       SET checkout_metadata = $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE session_id = $2 AND user_id = $3
       RETURNING *`,
      [JSON.stringify(merged), sessionId, userId]
    );

    return this.formatCheckoutSession(updated.rows[0]);
  }

  /**
   * Build shipping options with SLA hints per store
   * @param {Object} store
   * @returns {Array}
   */
  static buildShippingOptionsForStore(store) {
    const sla = this.deriveStoreSlaDays(store);
    return [
      {
        id: 'standard',
        label: 'Standard',
        sla: `${sla.min}-${sla.max} business days`,
        estimatedDeliveryWindowDays: { min: sla.min, max: sla.max },
      },
      {
        id: 'express',
        label: 'Express',
        sla: `${Math.max(1, sla.min - 2)}-${Math.max(2, sla.max - 2)} business days`,
        estimatedDeliveryWindowDays: {
          min: Math.max(1, sla.min - 2),
          max: Math.max(2, sla.max - 2),
        },
      },
    ];
  }

  /**
   * Derive best-effort SLA from cart item metadata
   * @param {Object} store
   * @returns {{min:number,max:number}}
   */
  static deriveStoreSlaDays(store) {
    const days = [];
    for (const item of store.items || []) {
      const metadata = item.metadata || {};
      const min = parseInt(metadata.shippingSlaMinDays || metadata.shipping_sla_min_days, 10);
      const max = parseInt(metadata.shippingSlaMaxDays || metadata.shipping_sla_max_days, 10);
      if (Number.isInteger(min)) days.push(min);
      if (Number.isInteger(max)) days.push(max);
    }
    if (days.length === 0) {
      return { min: 5, max: 8 };
    }
    return {
      min: Math.max(1, Math.min(...days)),
      max: Math.max(2, Math.max(...days)),
    };
  }

  /**
   * Normalize recipient payload
   * @param {Object} recipient
   * @returns {Object}
   */
  static normalizeRecipientInfo(recipient = {}) {
    return {
      name: recipient.name ? String(recipient.name).trim() : null,
      email: recipient.email ? String(recipient.email).trim().toLowerCase() : null,
      phone: recipient.phone ? String(recipient.phone).trim() : null,
    };
  }
}

module.exports = CheckoutService;
