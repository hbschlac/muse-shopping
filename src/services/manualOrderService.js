/**
 * Manual Order Service
 * Manages orders that require manual placement by operations team
 */

const pool = require('../db/pool');
const logger = require('../utils/logger');
const { NotFoundError, ValidationError } = require('../utils/errors');

class ManualOrderService {
  /**
   * Get all pending manual orders
   * Orders that need ops team to manually place with retailers
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Pending manual orders
   */
  static async getPendingOrders(options = {}) {
    const { limit = 50, offset = 0 } = options;

    const result = await pool.query(
      `SELECT
        o.*,
        s.name as store_name,
        s.display_name as store_display_name,
        s.website_url as store_website,
        s.logo_url as store_logo,
        u.email as user_email,
        u.full_name as user_name,
        cs.shipping_address
      FROM orders o
      JOIN stores s ON o.store_id = s.id
      JOIN users u ON o.user_id = u.id
      JOIN checkout_sessions cs ON o.checkout_session_id = cs.id
      WHERE o.placement_method = 'manual'
        AND o.status = 'pending'
      ORDER BY o.created_at ASC
      LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    return result.rows.map(this.formatManualOrder);
  }

  /**
   * Get manual order with full details
   * @param {string} museOrderNumber - Muse order number
   * @returns {Promise<Object>} Order with items and customer info
   */
  static async getOrderDetails(museOrderNumber) {
    // Get order
    const orderResult = await pool.query(
      `SELECT
        o.*,
        s.name as store_name,
        s.display_name as store_display_name,
        s.website_url as store_website,
        s.logo_url as store_logo,
        u.email as user_email,
        u.full_name as user_name,
        u.phone_number as user_phone,
        cs.shipping_address,
        cs.billing_address
      FROM orders o
      JOIN stores s ON o.store_id = s.id
      JOIN users u ON o.user_id = u.id
      JOIN checkout_sessions cs ON o.checkout_session_id = cs.id
      WHERE o.muse_order_number = $1`,
      [museOrderNumber]
    );

    if (orderResult.rows.length === 0) {
      throw new NotFoundError('Order not found');
    }

    const order = orderResult.rows[0];

    // Get order items
    const itemsResult = await pool.query(
      `SELECT * FROM order_items WHERE order_id = $1`,
      [order.id]
    );

    order.items = itemsResult.rows;

    return this.formatManualOrder(order, true);
  }

  /**
   * Mark order as placed manually
   * Ops team uses this after placing order on retailer site
   * @param {string} museOrderNumber - Muse order number
   * @param {Object} placementData - Placement details
   * @returns {Promise<Object>} Updated order
   */
  static async markAsPlaced(museOrderNumber, placementData) {
    const {
      storeOrderNumber,
      trackingNumber = null,
      carrier = null,
      estimatedDelivery = null,
      notes = null,
    } = placementData;

    if (!storeOrderNumber) {
      throw new ValidationError('Store order number is required');
    }

    const result = await pool.query(
      `UPDATE orders
       SET status = 'placed',
           store_order_number = $1,
           tracking_number = $2,
           carrier = $3,
           estimated_delivery_at = $4,
           placed_at = CURRENT_TIMESTAMP,
           metadata = metadata || jsonb_build_object('manual_placement_notes', $5)
       WHERE muse_order_number = $6
       RETURNING *`,
      [storeOrderNumber, trackingNumber, carrier, estimatedDelivery, notes, museOrderNumber]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Order not found');
    }

    logger.info(`Order ${museOrderNumber} manually placed with store order #${storeOrderNumber}`);

    return result.rows[0];
  }

  /**
   * Mark order as failed
   * If ops team cannot place the order
   * @param {string} museOrderNumber - Muse order number
   * @param {string} reason - Failure reason
   * @returns {Promise<Object>} Updated order
   */
  static async markAsFailed(museOrderNumber, reason) {
    if (!reason) {
      throw new ValidationError('Failure reason is required');
    }

    const result = await pool.query(
      `UPDATE orders
       SET status = 'failed',
           placement_error = $1,
           placement_attempts = placement_attempts + 1
       WHERE muse_order_number = $2
       RETURNING *`,
      [reason, museOrderNumber]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Order not found');
    }

    logger.warn(`Order ${museOrderNumber} marked as failed: ${reason}`);

    // TODO: Send notification to customer about order issue
    // TODO: Initiate refund if needed

    return result.rows[0];
  }

  /**
   * Get manual order statistics
   * @returns {Promise<Object>} Stats for manual orders
   */
  static async getStatistics() {
    const result = await pool.query(
      `SELECT
        COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
        COUNT(*) FILTER (WHERE status = 'placed') as placed_count,
        COUNT(*) FILTER (WHERE status = 'failed') as failed_count,
        COUNT(*) FILTER (WHERE placed_at > NOW() - INTERVAL '24 hours') as placed_today,
        AVG(EXTRACT(EPOCH FROM (placed_at - created_at))) FILTER (WHERE placed_at IS NOT NULL) as avg_processing_seconds
      FROM orders
      WHERE placement_method = 'manual'`
    );

    const stats = result.rows[0];

    return {
      pendingOrders: parseInt(stats.pending_count) || 0,
      placedOrders: parseInt(stats.placed_count) || 0,
      failedOrders: parseInt(stats.failed_count) || 0,
      placedToday: parseInt(stats.placed_today) || 0,
      averageProcessingTime: stats.avg_processing_seconds
        ? `${Math.round(stats.avg_processing_seconds / 60)} minutes`
        : 'N/A',
    };
  }

  /**
   * Create manual order task
   * Called by checkoutService when manual placement is needed
   * @param {Object} order - Order object
   * @param {string} failureReason - Why automated placement failed
   * @returns {Promise<Object>} Task details
   */
  static async createManualOrderTask(order, failureReason = 'Automated placement not available') {
    // Create task in manual order queue
    const taskResult = await pool.query(
      `INSERT INTO manual_order_tasks (
        order_id,
        user_id,
        store_id,
        task_status,
        priority,
        failure_reason,
        automated_attempts,
        last_automated_attempt_at
      )
      VALUES ($1, $2, $3, 'pending', 'normal', $4, 0, NOW())
      RETURNING *`,
      [order.id, order.user_id, order.store_id, failureReason]
    );

    const task = taskResult.rows[0];

    // Mark order as pending manual placement
    await pool.query(
      `UPDATE orders
       SET metadata = metadata || jsonb_build_object(
         'manual_task_id', $1,
         'manual_task_created_at', NOW(),
         'requires_manual_placement', true
       )
       WHERE id = $2`,
      [task.id, order.id]
    );

    logger.info(`Manual order task ${task.id} created for order ${order.muse_order_number}`);

    // TODO: Send notification to ops team (email, Slack, etc.)
    // TODO: Trigger Slack webhook or email notification

    return {
      taskId: task.id,
      orderId: order.id,
      museOrderNumber: order.muse_order_number,
      taskCreated: true,
      message: 'Order queued for manual placement',
      failureReason,
    };
  }

  /**
   * Get all manual order tasks (for ops dashboard)
   * @param {Object} filters - Query filters
   * @returns {Promise<Array>} Manual order tasks
   */
  static async getManualTasks(filters = {}) {
    const { status = 'pending', assignedTo = null, limit = 50, offset = 0 } = filters;

    let query = `
      SELECT
        mot.*,
        o.muse_order_number,
        o.total_cents,
        s.name as store_name,
        s.display_name as store_display_name,
        u.email as user_email,
        u.full_name as user_name
      FROM manual_order_tasks mot
      JOIN orders o ON mot.order_id = o.id
      JOIN stores s ON mot.store_id = s.id
      JOIN users u ON mot.user_id = u.id
      WHERE 1=1
    `;

    const params = [];
    let paramCount = 1;

    if (status) {
      query += ` AND mot.task_status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    if (assignedTo) {
      query += ` AND mot.assigned_to = $${paramCount}`;
      params.push(assignedTo);
      paramCount++;
    }

    query += ` ORDER BY mot.priority DESC, mot.created_at ASC`;
    query += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    return result.rows;
  }

  /**
   * Claim a manual task
   * @param {number} taskId - Task ID
   * @param {number} userId - Ops team member user ID
   * @returns {Promise<Object>} Claimed task
   */
  static async claimTask(taskId, userId) {
    const result = await pool.query(
      `UPDATE manual_order_tasks
       SET task_status = 'claimed',
           assigned_to = $1,
           claimed_at = NOW(),
           updated_at = NOW()
       WHERE id = $2 AND task_status = 'pending'
       RETURNING *`,
      [userId, taskId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Task not found or already claimed');
    }

    logger.info(`Task ${taskId} claimed by user ${userId}`);
    return result.rows[0];
  }

  /**
   * Complete a manual task
   * @param {number} taskId - Task ID
   * @param {Object} completionData - Completion details
   * @returns {Promise<Object>} Completed task
   */
  static async completeTask(taskId, completionData = {}) {
    const { notes = null } = completionData;

    const result = await pool.query(
      `UPDATE manual_order_tasks
       SET task_status = 'completed',
           completed_at = NOW(),
           notes = COALESCE($1, notes),
           updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [notes, taskId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Task not found');
    }

    logger.info(`Task ${taskId} completed`);
    return result.rows[0];
  }

  /**
   * Generate order placement instructions for ops team
   * @param {string} museOrderNumber - Muse order number
   * @returns {Promise<Object>} Step-by-step instructions
   */
  static async getPlacementInstructions(museOrderNumber) {
    const order = await this.getOrderDetails(museOrderNumber);

    const instructions = {
      orderNumber: order.museOrderNumber,
      storeName: order.storeName,
      storeWebsite: order.storeWebsite,
      totalAmount: order.totalDisplay,
      steps: [
        {
          step: 1,
          title: 'Navigate to retailer website',
          action: `Go to ${order.storeWebsite}`,
          url: order.storeWebsite,
        },
        {
          step: 2,
          title: 'Add items to cart',
          action: 'Add the following items to cart:',
          items: order.items.map(item => ({
            name: item.productName,
            sku: item.productSku,
            size: item.size,
            color: item.color,
            quantity: item.quantity,
            url: item.productUrl,
          })),
        },
        {
          step: 3,
          title: 'Enter shipping address',
          action: 'Use the following shipping address:',
          address: order.shippingAddress,
        },
        {
          step: 4,
          title: 'Select shipping method',
          action: 'Choose standard shipping (or fastest available)',
        },
        {
          step: 5,
          title: 'Enter payment',
          action: 'Use company card for payment',
          note: 'DO NOT use customer payment method',
        },
        {
          step: 6,
          title: 'Place order',
          action: 'Complete checkout and get confirmation',
        },
        {
          step: 7,
          title: 'Record order number',
          action: 'Copy retailer order number and enter in system',
          field: 'storeOrderNumber',
        },
      ],
      notes: [
        'Verify all items are in stock before placing order',
        'If any items are out of stock, contact customer before substituting',
        'Save order confirmation email',
        'Enter tracking number when available',
      ],
    };

    return instructions;
  }

  /**
   * Format manual order for response
   * @param {Object} order - Raw order from database
   * @param {boolean} includeDetails - Include full details
   * @returns {Object} Formatted order
   */
  static formatManualOrder(order, includeDetails = false) {
    const formatted = {
      id: order.id,
      museOrderNumber: order.muse_order_number,
      storeOrderNumber: order.store_order_number,
      storeName: order.store_display_name || order.store_name,
      storeWebsite: order.store_website,
      storeLogo: order.store_logo,
      status: order.status,
      totalCents: order.total_cents,
      totalDisplay: `$${(order.total_cents / 100).toFixed(2)}`,
      createdAt: order.created_at,
      placedAt: order.placed_at,
      customerEmail: order.user_email,
      customerName: order.user_name,
    };

    if (includeDetails && order.items) {
      formatted.items = order.items.map(item => ({
        productName: item.product_name,
        productSku: item.product_sku,
        productUrl: item.product_url,
        productImageUrl: item.product_image_url,
        size: item.size,
        color: item.color,
        quantity: item.quantity,
        unitPriceCents: item.unit_price_cents,
        unitPriceDisplay: `$${(item.unit_price_cents / 100).toFixed(2)}`,
      }));

      formatted.shippingAddress = order.shipping_address;
      formatted.billingAddress = order.billing_address;
      formatted.customerPhone = order.user_phone;
    }

    return formatted;
  }
}

module.exports = ManualOrderService;
