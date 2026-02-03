/**
 * Return Service
 * Manages returns via retailer APIs
 *
 * IMPORTANT: Returns are registered in RETAILER'S system (source of truth)
 * Muse maintains a reference/cache for display and tracking
 */

const pool = require('../db/pool');
const logger = require('../utils/logger');
const { NotFoundError, ValidationError } = require('../utils/errors');
const StoreConnectionService = require('./storeConnectionService');
const RetailerAPIFactory = require('./retailerAPIFactory');

class ReturnService {
  /**
   * Check return eligibility for an order
   * @param {number} userId - User ID
   * @param {number} orderId - Order ID
   * @returns {Promise<Object>} Eligibility info
   */
  static async checkReturnEligibility(userId, orderId) {
    // Get order details
    const orderResult = await pool.query(
      `SELECT o.*, s.id as store_id, s.name as store_name
       FROM orders o
       JOIN stores s ON o.store_id = s.id
       WHERE o.id = $1 AND o.user_id = $2`,
      [orderId, userId]
    );

    if (orderResult.rows.length === 0) {
      throw new NotFoundError('Order not found');
    }

    const order = orderResult.rows[0];

    // Check if user is connected to this store
    const connection = await StoreConnectionService.getConnection(userId, order.store_id);
    if (!connection || !connection.isConnected) {
      throw new ValidationError('Store connection required for returns');
    }

    // Get access token
    const accessToken = await StoreConnectionService.getAccessToken(userId, order.store_id);

    // Get retailer API client
    const apiClient = RetailerAPIFactory.getClient(order.store_id, { accessToken });

    // Check eligibility via retailer API
    const eligibility = await apiClient.getReturnEligibility(order.store_order_number);

    return {
      orderId: order.id,
      storeOrderNumber: order.store_order_number,
      eligible: eligibility.eligible,
      reason: eligibility.reason,
      daysRemaining: eligibility.daysRemaining,
      returnMethods: eligibility.returnMethods, // ['ship', 'in_store', 'pickup']
      returnWindow: eligibility.returnWindow, // e.g., "30 days"
      items: eligibility.items, // Items eligible for return
    };
  }

  /**
   * Initiate return via retailer API
   * @param {number} userId - User ID
   * @param {Object} returnData - Return details
   * @returns {Promise<Object>} Return result
   */
  static async initiateReturn(userId, returnData) {
    const {
      orderId,
      items, // [{ orderItemId, quantity, reason }]
      returnMethod = 'ship', // 'ship', 'in_store', 'pickup'
      reasonDetails = '',
    } = returnData;

    // Get order
    const orderResult = await pool.query(
      `SELECT o.*, s.id as store_id
       FROM orders o
       JOIN stores s ON o.store_id = s.id
       WHERE o.id = $1 AND o.user_id = $2`,
      [orderId, userId]
    );

    if (orderResult.rows.length === 0) {
      throw new NotFoundError('Order not found');
    }

    const order = orderResult.rows[0];

    // Verify all items belong to this order
    const orderItemIds = items.map(item => item.orderItemId);
    const orderItemsResult = await pool.query(
      `SELECT * FROM order_items WHERE id = ANY($1) AND order_id = $2`,
      [orderItemIds, orderId]
    );

    if (orderItemsResult.rows.length !== items.length) {
      throw new ValidationError('One or more items do not belong to this order');
    }

    // Get access token
    const accessToken = await StoreConnectionService.getAccessToken(userId, order.store_id);

    // Get retailer API client
    const apiClient = RetailerAPIFactory.getClient(order.store_id, { accessToken });

    // Format items for retailer API
    const formattedItems = items.map(item => {
      const orderItem = orderItemsResult.rows.find(oi => oi.id === item.orderItemId);
      return {
        itemId: orderItem.store_item_id, // Retailer's item ID
        quantity: item.quantity,
        reason: item.reason,
      };
    });

    // Initiate return via retailer API
    logger.info(`Initiating return for order ${orderId} via ${order.store_id} API`);

    const returnResult = await apiClient.initiateReturn(
      order.store_order_number,
      formattedItems,
      returnMethod
    );

    // Calculate total refund amount
    let totalRefundCents = 0;
    for (const item of items) {
      const orderItem = orderItemsResult.rows.find(oi => oi.id === item.orderItemId);
      totalRefundCents += orderItem.price_cents * item.quantity;
    }

    // Create return record in Muse database (reference to retailer's return)
    const returnRecord = await pool.query(
      `INSERT INTO returns (
        user_id,
        order_id,
        store_id,
        store_return_id,
        store_return_number,
        return_reason,
        return_reason_details,
        return_method,
        return_label_url,
        return_label_qr_code,
        return_tracking_number,
        return_carrier,
        refund_amount_cents,
        refund_method,
        refund_status,
        estimated_refund_date,
        return_status,
        label_created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, CURRENT_TIMESTAMP)
      RETURNING *`,
      [
        userId,
        orderId,
        order.store_id,
        returnResult.returnId, // Retailer's return ID (source of truth)
        returnResult.returnNumber,
        items[0].reason, // Primary reason
        reasonDetails,
        returnMethod,
        returnResult.returnLabel?.pdfUrl,
        returnResult.returnLabel?.qrCode,
        returnResult.trackingNumber,
        returnResult.carrier,
        totalRefundCents,
        returnResult.refundMethod,
        'pending',
        returnResult.estimatedRefundDate,
        'label_created',
      ]
    );

    const returnId = returnRecord.rows[0].id;

    // Create return items
    for (const item of items) {
      const orderItem = orderItemsResult.rows.find(oi => oi.id === item.orderItemId);

      await pool.query(
        `INSERT INTO return_items (
          return_id,
          order_item_id,
          product_id,
          quantity,
          item_price_cents,
          refund_amount_cents
        )
        VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          returnId,
          item.orderItemId,
          orderItem.product_id,
          item.quantity,
          orderItem.price_cents,
          orderItem.price_cents * item.quantity,
        ]
      );

      // Update order item
      await pool.query(
        `UPDATE order_items
         SET is_returned = true,
             returned_quantity = returned_quantity + $1,
             return_id = $2
         WHERE id = $3`,
        [item.quantity, returnId, item.orderItemId]
      );
    }

    logger.info(`Return created: ID ${returnId}, Store Return ID ${returnResult.returnId}`);

    return {
      returnId,
      storeReturnId: returnResult.returnId,
      storeReturnNumber: returnResult.returnNumber,
      returnLabel: returnResult.returnLabel,
      trackingNumber: returnResult.trackingNumber,
      estimatedRefundDate: returnResult.estimatedRefundDate,
      refundAmount: totalRefundCents / 100,
    };
  }

  /**
   * Get return details
   * @param {number} userId - User ID
   * @param {number} returnId - Return ID
   * @returns {Promise<Object>} Return details
   */
  static async getReturn(userId, returnId) {
    const result = await pool.query(
      `SELECT
        r.*,
        o.store_order_number,
        s.name as store_name,
        s.display_name as store_display_name,
        s.logo_url as store_logo
       FROM returns r
       JOIN orders o ON r.order_id = o.id
       JOIN stores s ON r.store_id = s.id
       WHERE r.id = $1 AND r.user_id = $2`,
      [returnId, userId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Return not found');
    }

    const returnData = result.rows[0];

    // Get return items
    const itemsResult = await pool.query(
      `SELECT
        ri.*,
        oi.product_name,
        oi.product_image_url,
        p.brand_id,
        b.name as brand_name
       FROM return_items ri
       JOIN order_items oi ON ri.order_item_id = oi.id
       LEFT JOIN products p ON ri.product_id = p.id
       LEFT JOIN brands b ON p.brand_id = b.id
       WHERE ri.return_id = $1`,
      [returnId]
    );

    return this.formatReturn(returnData, itemsResult.rows);
  }

  /**
   * Get user's returns
   * @param {number} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} List of returns
   */
  static async getUserReturns(userId, options = {}) {
    const { limit = 20, offset = 0, status = null } = options;

    let query = `
      SELECT
        r.*,
        o.store_order_number,
        s.name as store_name,
        s.display_name as store_display_name,
        s.logo_url as store_logo
      FROM returns r
      JOIN orders o ON r.order_id = o.id
      JOIN stores s ON r.store_id = s.id
      WHERE r.user_id = $1
    `;

    const params = [userId];

    if (status) {
      params.push(status);
      query += ` AND r.return_status = $${params.length}`;
    }

    query += ` ORDER BY r.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Get items for each return
    const returns = [];
    for (const returnData of result.rows) {
      const itemsResult = await pool.query(
        `SELECT ri.*, oi.product_name, oi.product_image_url
         FROM return_items ri
         JOIN order_items oi ON ri.order_item_id = oi.id
         WHERE ri.return_id = $1`,
        [returnData.id]
      );

      returns.push(this.formatReturn(returnData, itemsResult.rows));
    }

    return returns;
  }

  /**
   * Sync return status from retailer
   * @param {number} userId - User ID
   * @param {number} returnId - Return ID
   * @returns {Promise<Object>} Updated return
   */
  static async syncReturnStatus(userId, returnId) {
    const returnData = await this.getReturn(userId, returnId);

    // Get access token
    const accessToken = await StoreConnectionService.getAccessToken(userId, returnData.storeId);

    // Get retailer API client
    const apiClient = RetailerAPIFactory.getClient(returnData.storeId, { accessToken });

    // Get latest status from retailer
    const status = await apiClient.getReturnStatus(returnData.storeReturnId);

    // Update return record
    await pool.query(
      `UPDATE returns
       SET return_status = $1,
           refund_status = $2,
           actual_refund_date = $3,
           last_synced_at = CURRENT_TIMESTAMP
       WHERE id = $4`,
      [status.returnStatus, status.refundStatus, status.refundDate, returnId]
    );

    logger.info(`Return ${returnId} synced: status ${status.returnStatus}`);

    return await this.getReturn(userId, returnId);
  }

  /**
   * Format return for response
   */
  static formatReturn(returnData, items) {
    return {
      id: returnData.id,
      orderId: returnData.order_id,
      storeOrderNumber: returnData.store_order_number,
      storeId: returnData.store_id,
      storeName: returnData.store_display_name || returnData.store_name,
      storeLogo: returnData.store_logo,
      storeReturnId: returnData.store_return_id,
      storeReturnNumber: returnData.store_return_number,
      returnStatus: returnData.return_status,
      returnMethod: returnData.return_method,
      returnLabel: {
        pdfUrl: returnData.return_label_url,
        qrCode: returnData.return_label_qr_code,
      },
      trackingNumber: returnData.return_tracking_number,
      carrier: returnData.return_carrier,
      refundAmount: returnData.refund_amount_cents / 100,
      refundMethod: returnData.refund_method,
      refundStatus: returnData.refund_status,
      estimatedRefundDate: returnData.estimated_refund_date,
      actualRefundDate: returnData.actual_refund_date,
      items: items.map(item => ({
        id: item.id,
        productName: item.product_name,
        productImage: item.product_image_url,
        brandName: item.brand_name,
        quantity: item.quantity,
        refundAmount: item.refund_amount_cents / 100,
        status: item.item_status,
      })),
      createdAt: returnData.created_at,
      lastSyncedAt: returnData.last_synced_at,
    };
  }
}

module.exports = ReturnService;
