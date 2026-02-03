/**
 * Order Controller
 * Handles HTTP requests for order management and tracking
 */

const OrderService = require('../services/orderService');
const { successResponse, errorResponse } = require('../utils/responseFormatter');
const logger = require('../utils/logger');

class OrderController {
  /**
   * Get all orders for authenticated user
   * GET /api/v1/orders
   */
  static async getUserOrders(req, res, next) {
    try {
      const userId = req.userId;
      const { limit, offset, status } = req.query;

      const options = {
        limit: limit ? parseInt(limit) : 50,
        offset: offset ? parseInt(offset) : 0,
        status: status || null,
      };

      const orders = await OrderService.getUserOrders(userId, options);

      return res.status(200).json(
        successResponse(orders, 'Orders retrieved successfully')
      );
    } catch (error) {
      logger.error('Error getting user orders:', error);
      next(error);
    }
  }

  /**
   * Get order by Muse order number
   * GET /api/v1/orders/:orderNumber
   */
  static async getOrder(req, res, next) {
    try {
      const userId = req.userId;
      const { orderNumber } = req.params;

      const order = await OrderService.getOrderByNumber(orderNumber, userId);

      return res.status(200).json(
        successResponse(order, 'Order retrieved successfully')
      );
    } catch (error) {
      logger.error('Error getting order:', error);
      next(error);
    }
  }

  /**
   * Get order statistics
   * GET /api/v1/orders/stats
   */
  static async getOrderStats(req, res, next) {
    try {
      const userId = req.userId;

      const stats = await OrderService.getOrderStats(userId);

      return res.status(200).json(
        successResponse(stats, 'Order statistics retrieved')
      );
    } catch (error) {
      logger.error('Error getting order stats:', error);
      next(error);
    }
  }

  /**
   * Update order tracking
   * PUT /api/v1/orders/:orderNumber/tracking
   * (Admin/webhook endpoint)
   */
  static async updateTracking(req, res, next) {
    try {
      const { orderNumber } = req.params;
      const trackingInfo = req.body;

      const order = await OrderService.updateOrderTracking(orderNumber, trackingInfo);

      return res.status(200).json(
        successResponse(order, 'Tracking information updated')
      );
    } catch (error) {
      logger.error('Error updating order tracking:', error);
      next(error);
    }
  }
}

module.exports = OrderController;
