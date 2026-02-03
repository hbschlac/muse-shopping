/**
 * Return Controller
 * Handles return operations via retailer APIs
 */

const ReturnService = require('../services/returnService');
const logger = require('../utils/logger');

class ReturnController {
  /**
   * Check return eligibility for an order
   * GET /api/returns/eligibility/:orderId
   */
  static async checkEligibility(req, res, next) {
    try {
      const userId = req.user.id;
      const orderId = parseInt(req.params.orderId);

      const eligibility = await ReturnService.checkReturnEligibility(userId, orderId);

      res.json({
        success: true,
        eligibility,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Initiate return
   * POST /api/returns
   */
  static async initiateReturn(req, res, next) {
    try {
      const userId = req.user.id;
      const { orderId, items, returnMethod, reasonDetails } = req.body;

      // Validate items
      if (!items || items.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'At least one item is required',
        });
      }

      // Validate item structure
      for (const item of items) {
        if (!item.orderItemId || !item.quantity || !item.reason) {
          return res.status(400).json({
            success: false,
            error: 'Each item must have orderItemId, quantity, and reason',
          });
        }
      }

      const returnResult = await ReturnService.initiateReturn(userId, {
        orderId,
        items,
        returnMethod,
        reasonDetails,
      });

      logger.info(`Return initiated by user ${userId}: ${returnResult.returnId}`);

      res.status(201).json({
        success: true,
        return: returnResult,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get return details
   * GET /api/returns/:returnId
   */
  static async getReturn(req, res, next) {
    try {
      const userId = req.user.id;
      const returnId = parseInt(req.params.returnId);

      const returnData = await ReturnService.getReturn(userId, returnId);

      res.json({
        success: true,
        return: returnData,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user's returns
   * GET /api/returns
   */
  static async getUserReturns(req, res, next) {
    try {
      const userId = req.user.id;
      const { limit, offset, status } = req.query;

      const returns = await ReturnService.getUserReturns(userId, {
        limit: limit ? parseInt(limit) : 20,
        offset: offset ? parseInt(offset) : 0,
        status,
      });

      res.json({
        success: true,
        returns,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Sync return status from retailer
   * POST /api/returns/:returnId/sync
   */
  static async syncStatus(req, res, next) {
    try {
      const userId = req.user.id;
      const returnId = parseInt(req.params.returnId);

      const returnData = await ReturnService.syncReturnStatus(userId, returnId);

      res.json({
        success: true,
        return: returnData,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = ReturnController;
