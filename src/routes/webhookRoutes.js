/**
 * Webhook Routes
 * Handles external webhook endpoints (Stripe, retailer notifications, etc.)
 *
 * IMPORTANT: Webhooks require raw body for signature verification
 */

const express = require('express');
const router = express.Router();
const StripeWebhookController = require('../controllers/stripeWebhookController');

/**
 * Stripe Webhooks
 * POST /api/v1/webhooks/stripe
 *
 * CRITICAL: This route uses express.raw() middleware for Stripe signature verification
 * The body must be the raw Buffer, not parsed JSON
 */
router.post(
  '/stripe',
  express.raw({ type: 'application/json' }),
  StripeWebhookController.handleWebhook
);

module.exports = router;
