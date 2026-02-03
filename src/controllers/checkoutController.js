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
      const { paymentMethodId } = req.body;

      if (!paymentMethodId) {
        return res.status(400).json(
          errorResponse('VALIDATION_ERROR', 'Payment method ID is required')
        );
      }

      const session = await CheckoutService.addPaymentMethod(
        sessionId,
        userId,
        paymentMethodId
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
}

module.exports = CheckoutController;
