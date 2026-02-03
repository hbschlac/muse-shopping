/**
 * Order Service
 * Manages order tracking and status updates
 */

const pool = require('../db/pool');
const logger = require('../utils/logger');
const { NotFoundError } = require('../utils/errors');

class OrderService {
  /**
   * Get all orders for a user
   * @param {number} userId - User ID
   * @param {Object} options - Query options (limit, offset, status)
   * @returns {Promise<Object>} Orders grouped by checkout session
   */
  static async getUserOrders(userId, options = {}) {
    const { limit = 50, offset = 0, status = null } = options;

    let query = `
      SELECT
        o.*,
        s.name as store_name,
        s.display_name as store_display_name,
        s.logo_url as store_logo,
        cs.session_id as checkout_session_id_ref
      FROM orders o
      JOIN stores s ON o.store_id = s.id
      JOIN checkout_sessions cs ON o.checkout_session_id = cs.id
      WHERE o.user_id = $1
    `;

    const params = [userId];

    if (status) {
      query += ` AND o.status = $${params.length + 1}`;
      params.push(status);
    }

    query += ` ORDER BY o.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Group orders by checkout session
    const sessionMap = new Map();

    for (const order of result.rows) {
      const sessionId = order.checkout_session_id_ref;

      if (!sessionMap.has(sessionId)) {
        sessionMap.set(sessionId, {
          checkoutSessionId: sessionId,
          checkoutDate: order.created_at,
          orders: [],
          totalCents: 0,
        });
      }

      const session = sessionMap.get(sessionId);
      session.orders.push(this.formatOrder(order));
      session.totalCents += order.total_cents;
    }

    return {
      checkoutSessions: Array.from(sessionMap.values()),
      totalOrders: result.rows.length,
    };
  }

  /**
   * Get order by Muse order number
   * @param {string} museOrderNumber - Muse order number
   * @param {number} userId - User ID
   * @returns {Promise<Object>} Order with items
   */
  static async getOrderByNumber(museOrderNumber, userId) {
    const orderResult = await pool.query(
      `SELECT
        o.*,
        s.name as store_name,
        s.display_name as store_display_name,
        s.logo_url as store_logo
       FROM orders o
       JOIN stores s ON o.store_id = s.id
       WHERE o.muse_order_number = $1 AND o.user_id = $2`,
      [museOrderNumber, userId]
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

    order.items = itemsResult.rows.map(this.formatOrderItem);

    // Get status history
    const historyResult = await pool.query(
      `SELECT * FROM order_status_history
       WHERE order_id = $1
       ORDER BY created_at DESC`,
      [order.id]
    );

    order.statusHistory = historyResult.rows;

    return this.formatOrder(order, true);
  }

  /**
   * Update order status
   * @param {string} museOrderNumber - Muse order number
   * @param {string} newStatus - New status
   * @param {Object} metadata - Additional metadata
   * @returns {Promise<Object>} Updated order
   */
  static async updateOrderStatus(museOrderNumber, newStatus, metadata = {}) {
    const result = await pool.query(
      `UPDATE orders
       SET status = $1,
           metadata = metadata || $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE muse_order_number = $3
       RETURNING *`,
      [newStatus, JSON.stringify(metadata), museOrderNumber]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Order not found');
    }

    logger.info(`Order ${museOrderNumber} status updated to ${newStatus}`);

    return this.formatOrder(result.rows[0]);
  }

  /**
   * Update order with tracking information
   * @param {string} museOrderNumber - Muse order number
   * @param {Object} trackingInfo - Tracking details
   * @returns {Promise<Object>} Updated order
   */
  static async updateOrderTracking(museOrderNumber, trackingInfo) {
    const { trackingNumber, carrier, estimatedDelivery } = trackingInfo;

    const result = await pool.query(
      `UPDATE orders
       SET tracking_number = $1,
           carrier = $2,
           estimated_delivery_at = $3,
           status = CASE
             WHEN status = 'placed' OR status = 'confirmed' THEN 'shipped'
             ELSE status
           END,
           shipped_at = CASE
             WHEN shipped_at IS NULL THEN CURRENT_TIMESTAMP
             ELSE shipped_at
           END,
           updated_at = CURRENT_TIMESTAMP
       WHERE muse_order_number = $4
       RETURNING *`,
      [trackingNumber, carrier, estimatedDelivery, museOrderNumber]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Order not found');
    }

    logger.info(`Tracking info added to order ${museOrderNumber}: ${carrier} ${trackingNumber}`);

    return this.formatOrder(result.rows[0]);
  }

  /**
   * Get order statistics for user
   * @param {number} userId - User ID
   * @returns {Promise<Object>} Order statistics
   */
  static async getOrderStats(userId) {
    const result = await pool.query(
      `SELECT
        COUNT(*) as total_orders,
        COUNT(DISTINCT checkout_session_id) as total_checkout_sessions,
        COUNT(DISTINCT store_id) as stores_ordered_from,
        SUM(total_cents) as total_spent_cents,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_orders,
        COUNT(CASE WHEN status = 'placed' THEN 1 END) as placed_orders,
        COUNT(CASE WHEN status = 'shipped' THEN 1 END) as shipped_orders,
        COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered_orders,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_orders,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_orders
       FROM orders
       WHERE user_id = $1`,
      [userId]
    );

    return result.rows[0];
  }

  /**
   * Format order for response
   * @param {Object} order - Raw order from database
   * @param {boolean} includeDetails - Include full details
   * @returns {Object} Formatted order
   */
  static formatOrder(order, includeDetails = false) {
    const formatted = {
      id: order.id,
      museOrderNumber: order.muse_order_number,
      storeOrderNumber: order.store_order_number,
      storeName: order.store_display_name || order.store_name,
      storeLogo: order.store_logo,
      subtotalCents: order.subtotal_cents,
      shippingCents: order.shipping_cents,
      taxCents: order.tax_cents,
      totalCents: order.total_cents,
      totalDisplay: `$${(order.total_cents / 100).toFixed(2)}`,
      currency: order.currency,
      status: order.status,
      placementMethod: order.placement_method,
      trackingNumber: order.tracking_number,
      carrier: order.carrier,
      placedAt: order.placed_at,
      shippedAt: order.shipped_at,
      estimatedDeliveryAt: order.estimated_delivery_at,
      deliveredAt: order.delivered_at,
      createdAt: order.created_at,
    };

    if (includeDetails && order.items) {
      formatted.items = order.items;
      formatted.shippingAddress = order.shipping_address;
      formatted.statusHistory = order.statusHistory;
      formatted.metadata = order.metadata;
    }

    return formatted;
  }

  /**
   * Format order item for response
   * @param {Object} item - Raw order item from database
   * @returns {Object} Formatted order item
   */
  static formatOrderItem(item) {
    return {
      id: item.id,
      productName: item.product_name,
      productSku: item.product_sku,
      productUrl: item.product_url,
      productImageUrl: item.product_image_url,
      size: item.size,
      color: item.color,
      quantity: item.quantity,
      unitPriceCents: item.unit_price_cents,
      unitPriceDisplay: `$${(item.unit_price_cents / 100).toFixed(2)}`,
      totalPriceCents: item.total_price_cents,
      totalPriceDisplay: `$${(item.total_price_cents / 100).toFixed(2)}`,
      originalPriceCents: item.original_price_cents,
      itemStatus: item.item_status,
    };
  }
}

module.exports = OrderService;
