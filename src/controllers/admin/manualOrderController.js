/**
 * Admin Manual Order Controller
 * Handles manual order placement by operations team
 */

const ManualOrderService = require('../../services/manualOrderService');
const { successResponse, errorResponse } = require('../../utils/responseFormatter');
const logger = require('../../utils/logger');

class ManualOrderController {
  /**
   * Get all pending manual orders
   * GET /api/v1/admin/manual-orders
   */
  static async getPendingOrders(req, res, next) {
    try {
      const { limit, offset } = req.query;

      const orders = await ManualOrderService.getPendingOrders({
        limit: limit ? parseInt(limit) : 50,
        offset: offset ? parseInt(offset) : 0,
      });

      return res.status(200).json(
        successResponse(orders, 'Pending manual orders retrieved')
      );
    } catch (error) {
      logger.error('Error getting pending manual orders:', error);
      next(error);
    }
  }

  /**
   * Get manual order details
   * GET /api/v1/admin/manual-orders/:orderNumber
   */
  static async getOrderDetails(req, res, next) {
    try {
      const { orderNumber } = req.params;

      const order = await ManualOrderService.getOrderDetails(orderNumber);

      return res.status(200).json(
        successResponse(order, 'Order details retrieved')
      );
    } catch (error) {
      logger.error('Error getting order details:', error);
      next(error);
    }
  }

  /**
   * Get placement instructions for order
   * GET /api/v1/admin/manual-orders/:orderNumber/instructions
   */
  static async getPlacementInstructions(req, res, next) {
    try {
      const { orderNumber } = req.params;

      const instructions = await ManualOrderService.getPlacementInstructions(orderNumber);

      return res.status(200).json(
        successResponse(instructions, 'Placement instructions generated')
      );
    } catch (error) {
      logger.error('Error generating instructions:', error);
      next(error);
    }
  }

  /**
   * Mark order as placed
   * POST /api/v1/admin/manual-orders/:orderNumber/place
   */
  static async markAsPlaced(req, res, next) {
    try {
      const { orderNumber } = req.params;
      const placementData = req.body;

      const order = await ManualOrderService.markAsPlaced(orderNumber, placementData);

      return res.status(200).json(
        successResponse(order, 'Order marked as placed successfully')
      );
    } catch (error) {
      logger.error('Error marking order as placed:', error);
      next(error);
    }
  }

  /**
   * Mark order as failed
   * POST /api/v1/admin/manual-orders/:orderNumber/fail
   */
  static async markAsFailed(req, res, next) {
    try {
      const { orderNumber } = req.params;
      const { reason } = req.body;

      const order = await ManualOrderService.markAsFailed(orderNumber, reason);

      return res.status(200).json(
        successResponse(order, 'Order marked as failed')
      );
    } catch (error) {
      logger.error('Error marking order as failed:', error);
      next(error);
    }
  }

  /**
   * Get manual order statistics
   * GET /api/v1/admin/manual-orders/stats
   */
  static async getStatistics(req, res, next) {
    try {
      const stats = await ManualOrderService.getStatistics();

      return res.status(200).json(
        successResponse(stats, 'Manual order statistics retrieved')
      );
    } catch (error) {
      logger.error('Error getting manual order statistics:', error);
      next(error);
    }
  }
}

module.exports = ManualOrderController;
