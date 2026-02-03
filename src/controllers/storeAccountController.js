/**
 * Store Account Controller
 * Handles store account linking endpoints
 */

const StoreAccountService = require('../services/storeAccountService');
const { successResponse } = require('../utils/responseFormatter');
const logger = require('../utils/logger');

class StoreAccountController {
  /**
   * Get all store accounts for current user
   * @route   GET /api/v1/store-accounts
   * @access  Private
   */
  static async getUserStoreAccounts(req, res, next) {
    try {
      const accounts = await StoreAccountService.getUserStoreAccounts(req.userId);
      const summary = await StoreAccountService.getAccountSummary(req.userId);

      res.status(200).json(
        successResponse(
          { accounts, summary },
          'Store accounts retrieved successfully'
        )
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get detected (not linked) stores
   * @route   GET /api/v1/store-accounts/detected
   * @access  Private
   */
  static async getDetectedStores(req, res, next) {
    try {
      const detected = await StoreAccountService.getDetectedStores(req.userId);

      res.status(200).json(
        successResponse(
          { detected, count: detected.length },
          `Found ${detected.length} store${detected.length !== 1 ? 's' : ''} you shop at`
        )
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get order history for a store
   * @route   GET /api/v1/store-accounts/:storeId/orders
   * @access  Private
   */
  static async getStoreOrderHistory(req, res, next) {
    try {
      const storeId = parseInt(req.params.storeId);
      const orders = await StoreAccountService.getStoreOrderHistory(req.userId, storeId);

      res.status(200).json(
        successResponse(
          { orders, count: orders.length },
          'Order history retrieved successfully'
        )
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Link a store account
   * @route   POST /api/v1/store-accounts/:storeId/link
   * @access  Private
   */
  static async linkStore(req, res, next) {
    try {
      const storeId = parseInt(req.params.storeId);
      const account = await StoreAccountService.linkStoreAccount(req.userId, storeId);

      logger.info(`User ${req.userId} linked store account ${storeId}`);

      res.status(200).json(
        successResponse(
          { account },
          'Store account linked successfully'
        )
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Unlink a store account
   * @route   DELETE /api/v1/store-accounts/:storeId
   * @access  Private
   */
  static async unlinkStore(req, res, next) {
    try {
      const storeId = parseInt(req.params.storeId);
      await StoreAccountService.unlinkStoreAccount(req.userId, storeId);

      logger.info(`User ${req.userId} unlinked store account ${storeId}`);

      res.status(200).json(
        successResponse(null, 'Store account unlinked successfully')
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get account summary
   * @route   GET /api/v1/store-accounts/summary
   * @access  Private
   */
  static async getAccountSummary(req, res, next) {
    try {
      const summary = await StoreAccountService.getAccountSummary(req.userId);

      res.status(200).json(
        successResponse(
          { summary },
          'Account summary retrieved successfully'
        )
      );
    } catch (error) {
      next(error);
    }
  }
}

module.exports = StoreAccountController;
