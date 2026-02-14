/**
 * Checkout Controller
 * Handles HTTP requests for unified checkout flow
 */

const CheckoutService = require('../services/checkoutService');
const { successResponse, errorResponse } = require('../utils/responseFormatter');
const logger = require('../utils/logger');

class CheckoutController {
  /**
   * Initiate checkout session
   * POST /api/v1/checkout/sessions
   */
  static async initiateCheckout(req, res, next) {
    try {
      const userId = req.userId;

      const session = await CheckoutService.initiateCheckout(userId);

      return res.status(201).json(
        successResponse(session, 'Checkout session created')
      );
    } catch (error) {
      logger.error('Error initiating checkout:', error);
      next(error);
    }
  }

  /**
   * Get checkout session
   * GET /api/v1/checkout/sessions/:sessionId
   */
  static async getCheckoutSession(req, res, next) {
    try {
      const userId = req.userId;
      const { sessionId } = req.params;

      const session = await CheckoutService.getCheckoutSession(sessionId, userId);

      return res.status(200).json(
        successResponse(session, 'Checkout session retrieved')
      );
    } catch (error) {
      logger.error('Error getting checkout session:', error);
      next(error);
    }
  }

  /**
   * Add shipping address to checkout
   * PUT /api/v1/checkout/sessions/:sessionId/shipping
   */
  static async addShippingAddress(req, res, next) {
    try {
      const userId = req.userId;
      const { sessionId } = req.params;
      const address = req.body;

      const session = await CheckoutService.addShippingAddress(
        sessionId,
        userId,
        address
      );

      return res.status(200).json(
        successResponse(session, 'Shipping address added')
      );
    } catch (error) {
      logger.error('Error adding shipping address:', error);
      next(error);
    }
  }

  /**
   * Add payment method to checkout
   * PUT /api/v1/checkout/sessions/:sessionId/payment
   */
  static async addPaymentMethod(req, res, next) {
    try {
      const userId = req.userId;
      const { sessionId } = req.params;
      const { paymentMethodId, storeId } = req.body;

      if (!paymentMethodId) {
        return res.status(400).json(
          errorResponse('VALIDATION_ERROR', 'Payment method ID is required')
        );
      }

      const parsedStoreId = storeId === undefined || storeId === null
        ? null
        : parseInt(storeId, 10);

      if (storeId !== undefined && (Number.isNaN(parsedStoreId) || parsedStoreId < 1)) {
        return res.status(400).json(
          errorResponse('VALIDATION_ERROR', 'storeId must be a positive integer when provided')
        );
      }

      const session = await CheckoutService.addPaymentMethod(
        sessionId,
        userId,
        paymentMethodId,
        parsedStoreId
      );

      return res.status(200).json(
        successResponse(session, 'Payment method added')
      );
    } catch (error) {
      logger.error('Error adding payment method:', error);
      next(error);
    }
  }

  /**
   * Save recipient info for checkout
   * PUT /api/v1/checkout/sessions/:sessionId/recipient
   */
  static async setRecipientInfo(req, res, next) {
    try {
      const userId = req.userId;
      const { sessionId } = req.params;
      const recipient = req.body || {};

      const session = await CheckoutService.setRecipientInfo(sessionId, userId, recipient);
      return res.status(200).json(successResponse(session, 'Recipient information saved'));
    } catch (error) {
      logger.error('Error setting recipient info:', error);
      next(error);
    }
  }

  /**
   * Save billing preferences/address
   * PUT /api/v1/checkout/sessions/:sessionId/billing
   */
  static async setBillingPreferences(req, res, next) {
    try {
      const userId = req.userId;
      const { sessionId } = req.params;
      const payload = req.body || {};

      const session = await CheckoutService.setBillingPreferences(sessionId, userId, payload);
      return res.status(200).json(successResponse(session, 'Billing preferences saved'));
    } catch (error) {
      logger.error('Error setting billing preferences:', error);
      next(error);
    }
  }

  /**
   * Apply promo code to checkout session
   * PUT /api/v1/checkout/sessions/:sessionId/promo
   */
  static async applyPromoCode(req, res, next) {
    try {
      const userId = req.userId;
      const { sessionId } = req.params;
      const payload = req.body || {};

      const session = await CheckoutService.applyPromoCode(sessionId, userId, payload);
      return res.status(200).json(successResponse(session, 'Promo code applied'));
    } catch (error) {
      logger.error('Error applying promo code:', error);
      next(error);
    }
  }

  /**
   * Save per-store shipping selections
   * PUT /api/v1/checkout/sessions/:sessionId/shipping-options
   */
  static async setShippingSelections(req, res, next) {
    try {
      const userId = req.userId;
      const { sessionId } = req.params;
      const payload = req.body || {};

      const session = await CheckoutService.setShippingSelections(sessionId, userId, payload);
      return res.status(200).json(successResponse(session, 'Shipping selections saved'));
    } catch (error) {
      logger.error('Error setting shipping selections:', error);
      next(error);
    }
  }

  /**
   * Place orders with all retailers
   * POST /api/v1/checkout/sessions/:sessionId/place
   */
  static async placeOrders(req, res, next) {
    try {
      const userId = req.userId;
      const { sessionId } = req.params;

      const result = await CheckoutService.placeOrders(sessionId, userId);

      return res.status(200).json(
        successResponse(
          result,
          `Orders placed: ${result.summary.successfulOrders} successful, ${result.summary.failedOrders} failed`
        )
      );
    } catch (error) {
      logger.error('Error placing orders:', error);
      next(error);
    }
  }

  /**
   * Get checkout readiness for current cart
   * GET /api/v1/checkout/readiness
   */
  static async getCheckoutReadiness(req, res, next) {
    try {
      const userId = req.userId;
      const readiness = await CheckoutService.getCheckoutReadiness(userId);

      return res.status(200).json(
        successResponse(readiness, readiness.ready ? 'Checkout ready' : 'Checkout not ready')
      );
    } catch (error) {
      logger.error('Error getting checkout readiness:', error);
      next(error);
    }
  }
}

module.exports = CheckoutController;
