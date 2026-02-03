/**
 * Stripe Payment Service
 * Handles all Stripe payment operations with PCI compliance
 *
 * PCI COMPLIANCE NOTES:
 * - We NEVER store raw credit card numbers
 * - All card data handled client-side via Stripe.js
 * - Only store Stripe tokens/payment method IDs
 * - All communication with Stripe over HTTPS
 * - Webhook signatures verified for security
 */

const Stripe = require('stripe');
const logger = require('../utils/logger');
const { PaymentError, ValidationError } = require('../utils/errors');

// Initialize Stripe with secret key (skip if not configured to avoid boot failures)
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia', // Use latest stable API version
  maxNetworkRetries: 3,
  timeout: 30000, // 30 second timeout
}) : null;

if (!stripe) {
  logger.warn('Stripe secret key not configured. Stripe operations will fail until STRIPE_SECRET_KEY is set.');
}

function ensureStripeConfigured() {
  if (!stripe) {
    throw new PaymentError('Stripe is not configured');
  }
}

class StripeService {
  /**
   * Create a Payment Intent
   * This is the first step - creates an intent to charge the customer
   *
   * @param {Object} params - Payment intent parameters
   * @param {number} params.amountCents - Amount in cents
   * @param {string} params.currency - Currency code (USD, EUR, etc.)
   * @param {number} params.userId - User ID for metadata
   * @param {string} params.checkoutSessionId - Checkout session ID
   * @param {string} params.description - Payment description
   * @returns {Promise<Object>} Payment intent object
   */
  static async createPaymentIntent({
    amountCents,
    currency = 'USD',
    userId,
    checkoutSessionId,
    description,
  }) {
    try {
      ensureStripeConfigured();
      // Validate amount
      if (!amountCents || amountCents < 50) {
        throw new ValidationError('Amount must be at least $0.50 (50 cents)');
      }

      // Validate currency
      if (!currency || currency.length !== 3) {
        throw new ValidationError('Invalid currency code');
      }

      // Create payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountCents,
        currency: currency.toLowerCase(),
        description: description || `Muse Shopping - Order ${checkoutSessionId}`,

        // Metadata for tracking and reconciliation
        metadata: {
          userId: userId.toString(),
          checkoutSessionId,
          platform: 'muse-shopping',
        },

        // Automatic payment methods
        automatic_payment_methods: {
          enabled: true,
          allow_redirects: 'never', // Don't allow redirects (Klarna, etc.) for now
        },

        // Statement descriptor (shows on customer's credit card statement)
        statement_descriptor: 'MUSE SHOPPING',
        statement_descriptor_suffix: checkoutSessionId.slice(-10), // Add session ID for tracking

        // Capture method: manual allows us to authorize first, then capture later
        // For now using automatic (immediate capture)
        capture_method: 'automatic',
      });

      logger.info(`Payment intent created: ${paymentIntent.id} for $${amountCents / 100}`);

      return {
        id: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
        amountCents: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: paymentIntent.status,
      };
    } catch (error) {
      logger.error('Error creating payment intent:', error);

      if (error.type === 'StripeCardError') {
        throw new PaymentError(error.message);
      }

      throw error;
    }
  }

  /**
   * Confirm a Payment Intent
   * Called after customer provides payment method
   *
   * @param {string} paymentIntentId - Payment intent ID
   * @param {string} paymentMethodId - Stripe payment method ID
   * @returns {Promise<Object>} Confirmed payment intent
   */
  static async confirmPaymentIntent(paymentIntentId, paymentMethodId) {
    try {
      ensureStripeConfigured();
      const paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId, {
        payment_method: paymentMethodId,
        return_url: `${process.env.APP_URL}/orders`, // For 3D Secure redirects
      });

      logger.info(`Payment intent confirmed: ${paymentIntent.id} - ${paymentIntent.status}`);

      return {
        id: paymentIntent.id,
        status: paymentIntent.status,
        amountCents: paymentIntent.amount,
        charges: paymentIntent.charges.data,
      };
    } catch (error) {
      logger.error('Error confirming payment intent:', error);

      if (error.type === 'StripeCardError') {
        throw new PaymentError(`Card error: ${error.message}`);
      }

      if (error.code === 'payment_intent_authentication_failure') {
        throw new PaymentError('Payment authentication failed. Please try again.');
      }

      throw new PaymentError('Payment confirmation failed');
    }
  }

  /**
   * Capture a Payment Intent
   * Used when capture_method is 'manual' - captures a previously authorized payment
   *
   * @param {string} paymentIntentId - Payment intent ID
   * @param {number} amountCents - Optional: amount to capture (for partial captures)
   * @returns {Promise<Object>} Captured payment intent
   */
  static async capturePaymentIntent(paymentIntentId, amountCents = null) {
    try {
      ensureStripeConfigured();
      const params = {};
      if (amountCents) {
        params.amount_to_capture = amountCents;
      }

      const paymentIntent = await stripe.paymentIntents.capture(paymentIntentId, params);

      logger.info(`Payment intent captured: ${paymentIntent.id} for $${paymentIntent.amount / 100}`);

      return {
        id: paymentIntent.id,
        status: paymentIntent.status,
        amountCaptured: paymentIntent.amount_capturable,
        chargeId: paymentIntent.charges.data[0]?.id,
      };
    } catch (error) {
      logger.error('Error capturing payment intent:', error);
      throw new PaymentError('Payment capture failed');
    }
  }

  /**
   * Retrieve a Payment Intent
   * Get current status and details
   *
   * @param {string} paymentIntentId - Payment intent ID
   * @returns {Promise<Object>} Payment intent details
   */
  static async getPaymentIntent(paymentIntentId) {
    try {
      ensureStripeConfigured();
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

      return {
        id: paymentIntent.id,
        status: paymentIntent.status,
        amountCents: paymentIntent.amount,
        currency: paymentIntent.currency,
        paymentMethodId: paymentIntent.payment_method,
        chargeId: paymentIntent.charges.data[0]?.id,
        metadata: paymentIntent.metadata,
        created: new Date(paymentIntent.created * 1000),
      };
    } catch (error) {
      logger.error('Error retrieving payment intent:', error);
      throw new PaymentError('Failed to retrieve payment details');
    }
  }

  /**
   * Create a Refund
   * Refund a charge (full or partial)
   *
   * @param {string} paymentIntentId - Payment intent ID
   * @param {number} amountCents - Optional: amount to refund (for partial refunds)
   * @param {string} reason - Reason for refund
   * @returns {Promise<Object>} Refund object
   */
  static async createRefund(paymentIntentId, amountCents = null, reason = null) {
    try {
      ensureStripeConfigured();
      const params = {
        payment_intent: paymentIntentId,
      };

      if (amountCents) {
        params.amount = amountCents;
      }

      if (reason) {
        params.reason = reason; // 'duplicate', 'fraudulent', 'requested_by_customer'
        params.metadata = { reason };
      }

      const refund = await stripe.refunds.create(params);

      logger.info(`Refund created: ${refund.id} for $${refund.amount / 100}`);

      return {
        id: refund.id,
        amountCents: refund.amount,
        status: refund.status,
        reason: refund.reason,
        created: new Date(refund.created * 1000),
      };
    } catch (error) {
      logger.error('Error creating refund:', error);
      throw new PaymentError('Refund failed');
    }
  }

  /**
   * Get customer's payment methods
   * Retrieve saved payment methods for a customer
   *
   * @param {string} customerId - Stripe customer ID
   * @returns {Promise<Array>} List of payment methods
   */
  static async getPaymentMethods(customerId) {
    try {
      ensureStripeConfigured();
      const paymentMethods = await stripe.paymentMethods.list({
        customer: customerId,
        type: 'card',
      });

      return paymentMethods.data.map(pm => ({
        id: pm.id,
        type: pm.type,
        brand: pm.card.brand,
        last4: pm.card.last4,
        expMonth: pm.card.exp_month,
        expYear: pm.card.exp_year,
        isDefault: false, // TODO: Track default payment method
      }));
    } catch (error) {
      logger.error('Error retrieving payment methods:', error);
      return [];
    }
  }

  /**
   * Create or retrieve a Stripe Customer
   * Associates a user with a Stripe customer for saved payment methods
   *
   * @param {number} userId - User ID
   * @param {string} email - User email
   * @param {string} name - User name
   * @returns {Promise<Object>} Stripe customer object
   */
  static async createOrGetCustomer(userId, email, name = null) {
    try {
      ensureStripeConfigured();
      // First, try to find existing customer by metadata
      const existingCustomers = await stripe.customers.search({
        query: `metadata['userId']:'${userId}'`,
        limit: 1,
      });

      if (existingCustomers.data.length > 0) {
        return existingCustomers.data[0];
      }

      // Create new customer
      const customer = await stripe.customers.create({
        email,
        name,
        metadata: {
          userId: userId.toString(),
          platform: 'muse-shopping',
        },
      });

      logger.info(`Stripe customer created: ${customer.id} for user ${userId}`);

      return customer;
    } catch (error) {
      logger.error('Error creating/getting Stripe customer:', error);
      throw new PaymentError('Failed to create customer profile');
    }
  }

  /**
   * Attach payment method to customer
   * Saves a payment method for future use
   *
   * @param {string} paymentMethodId - Payment method ID
   * @param {string} customerId - Stripe customer ID
   * @returns {Promise<Object>} Attached payment method
   */
  static async attachPaymentMethod(paymentMethodId, customerId) {
    try {
      ensureStripeConfigured();
      const paymentMethod = await stripe.paymentMethods.attach(paymentMethodId, {
        customer: customerId,
      });

      logger.info(`Payment method ${paymentMethodId} attached to customer ${customerId}`);

      return paymentMethod;
    } catch (error) {
      logger.error('Error attaching payment method:', error);
      throw new PaymentError('Failed to save payment method');
    }
  }

  /**
   * Verify webhook signature
   * Ensures webhook came from Stripe (CRITICAL for security)
   *
   * @param {string} payload - Raw request body
   * @param {string} signature - Stripe-Signature header
   * @returns {Object} Verified event object
   */
  static verifyWebhookSignature(payload, signature) {
    try {
      ensureStripeConfigured();
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

      if (!webhookSecret) {
        throw new Error('Stripe webhook secret not configured');
      }

      const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);

      logger.info(`Webhook verified: ${event.type}`);

      return event;
    } catch (error) {
      logger.error('Webhook signature verification failed:', error);
      throw new Error('Invalid webhook signature');
    }
  }

  /**
   * Calculate platform fee
   * For future use with Stripe Connect (split payments to retailers)
   *
   * @param {number} orderTotalCents - Order total
   * @param {number} platformFeePercent - Platform fee percentage
   * @returns {number} Platform fee in cents
   */
  static calculatePlatformFee(orderTotalCents, platformFeePercent = 5) {
    return Math.round(orderTotalCents * (platformFeePercent / 100));
  }

  /**
   * Format amount for display
   * Convert cents to dollar string
   *
   * @param {number} cents - Amount in cents
   * @param {string} currency - Currency code
   * @returns {string} Formatted amount
   */
  static formatAmount(cents, currency = 'USD') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(cents / 100);
  }

  /**
   * Health check - verify Stripe API is accessible
   * @returns {Promise<boolean>} True if Stripe is accessible
   */
  static async healthCheck() {
    try {
      ensureStripeConfigured();
      await stripe.balance.retrieve();
      return true;
    } catch (error) {
      logger.error('Stripe health check failed:', error);
      return false;
    }
  }
}

module.exports = StripeService;
