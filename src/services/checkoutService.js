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

      // Generate session ID
      const sessionId = `cs_${nanoid(24)}`;

      // Calculate expiration (30 minutes)
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

      // Prepare stores to process
      const storesToProcess = cart.stores.map(store => ({
        storeId: store.storeId,
        storeName: store.storeName,
        storeSlug: store.storeSlug,
        itemCount: store.itemCount,
        subtotalCents: store.subtotalCents,
        status: 'pending', // pending, processing, completed, failed
        placementMethod: this.determinePlacementMethod(store.storeId),
      }));

      // Create checkout session
      const result = await pool.query(
        `INSERT INTO checkout_sessions (
          user_id,
          session_id,
          cart_snapshot,
          subtotal_cents,
          total_cents,
          stores_to_process,
          expires_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *`,
        [
          userId,
          sessionId,
          JSON.stringify(cart),
          cart.summary.subtotalCents,
          cart.summary.grandTotalCents,
          JSON.stringify(storesToProcess),
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
   * Add payment method to checkout session
   * @param {string} sessionId - Checkout session ID
   * @param {number} userId - User ID
   * @param {string} stripePaymentMethodId - Stripe payment method ID
   * @returns {Promise<Object>} Updated checkout session
   */
  static async addPaymentMethod(sessionId, userId, stripePaymentMethodId) {
    const result = await pool.query(
      `UPDATE checkout_sessions
       SET payment_method_id = $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE session_id = $2 AND user_id = $3
       RETURNING *`,
      [stripePaymentMethodId, sessionId, userId]
    );

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

      // Update status to processing
      await this.updateSessionStatus(sessionId, 'processing');

      // Step 1: Capture payment from customer
      const paymentResult = await this.capturePayment(session);

      if (!paymentResult.success) {
        await this.updateSessionStatus(sessionId, 'failed');
        throw new PaymentError(paymentResult.error || 'Payment failed');
      }

      // Step 2: Create order records for each store
      const orders = await this.createOrdersFromSession(session);

      // Step 3: Place orders with retailers (in parallel)
      const placementResults = await this.placeOrdersWithRetailers(orders, session);

      // Step 4: Update checkout session with results
      await this.updateSessionStatus(sessionId, 'completed');

      // Step 5: Clear user's cart
      await CartService.clearCart(userId);

      logger.info(`Checkout completed for session ${sessionId}: ${orders.length} orders placed`);

      return {
        checkoutSessionId: sessionId,
        orders: placementResults,
        summary: {
          totalOrders: orders.length,
          successfulOrders: placementResults.filter(o => o.status === 'placed').length,
          failedOrders: placementResults.filter(o => o.status === 'failed').length,
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

    for (const store of cartSnapshot.stores) {
      // Generate Muse order number
      const museOrderNumber = `MO-${nanoid(10).toUpperCase()}`;

      // Create order record
      const orderResult = await pool.query(
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
          placement_method
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *`,
        [
          session.userId,
          session.id,
          store.storeId,
          museOrderNumber,
          store.subtotalCents,
          0, // TODO: Calculate per-store shipping
          0, // TODO: Calculate per-store tax
          store.subtotalCents,
          session.shippingAddress,
          'pending',
          this.determinePlacementMethod(store.storeId),
        ]
      );

      const order = orderResult.rows[0];

      // Create order items
      for (const item of store.items) {
        await pool.query(
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
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
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
      }

      // Fetch complete order with items
      const completeOrder = await this.getOrderById(order.id);
      orders.push(completeOrder);
    }

    logger.info(`Created ${orders.length} order records for session ${session.sessionId}`);

    return orders;
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
      const paymentMethodId = session.paymentMethods?.[order.store_id];

      // Place order with retailer
      // Payment is processed by RETAILER using user's saved card
      // NOT processed by Muse
      const orderResult = await apiClient.createOrder({
        items: itemsResult.rows.map(item => ({
          sku: item.product_sku,
          quantity: item.quantity,
          size: item.size,
          color: item.color,
        })),
        shippingAddress: session.shippingAddress,
        paymentMethodId, // User's saved card at retailer
      });

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

    if (!session.paymentMethodId) {
      throw new ValidationError('Payment method is required');
    }

    if (session.status !== 'pending') {
      throw new ValidationError(`Session status must be pending, current: ${session.status}`);
    }

    // Check expiration
    if (new Date(session.expiresAt) < new Date()) {
      throw new ValidationError('Checkout session has expired');
    }
  }

  /**
   * Validate shipping address
   * @param {Object} address - Address to validate
   */
  static validateAddress(address) {
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
   * @param {number} storeId - Store ID
   * @returns {string} Placement method
   */
  static determinePlacementMethod(storeId) {
    // TODO: Look up store configuration
    // For now, default to manual for all stores
    return 'manual';
  }

  /**
   * Format checkout session for response
   * @param {Object} session - Raw session from DB
   * @returns {Object} Formatted session
   */
  static formatCheckoutSession(session) {
    return {
      id: session.id,
      sessionId: session.session_id,
      userId: session.user_id,
      cartSnapshot: session.cart_snapshot,
      shippingAddress: session.shipping_address,
      billingAddress: session.billing_address,
      paymentMethodId: session.payment_method_id,
      subtotalCents: session.subtotal_cents,
      shippingCents: session.shipping_cents,
      taxCents: session.tax_cents,
      totalCents: session.total_cents,
      currency: session.currency,
      status: session.status,
      storesToProcess: session.stores_to_process,
      errorMessage: session.error_message,
      startedAt: session.started_at,
      completedAt: session.completed_at,
      expiresAt: session.expires_at,
      createdAt: session.created_at,
    };
  }
}

module.exports = CheckoutService;
