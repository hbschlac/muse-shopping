/**
 * Stripe Webhook Controller
 * Handles webhook events from Stripe
 *
 * SECURITY: Webhook signature verification is CRITICAL
 * Never trust webhook data without verifying the signature
 */

const StripeService = require('../services/stripeService');
const pool = require('../db/pool');
const logger = require('../utils/logger');

class StripeWebhookController {
  /**
   * Handle Stripe webhook events
   * POST /api/v1/webhooks/stripe
   *
   * IMPORTANT: This endpoint needs raw body (not JSON parsed)
   * Configure in Express with express.raw({ type: 'application/json' })
   */
  static async handleWebhook(req, res) {
    const signature = req.headers['stripe-signature'];

    if (!signature) {
      logger.error('Missing Stripe signature header');
      return res.status(400).json({ error: 'Missing signature' });
    }

    try {
      // Verify webhook signature (CRITICAL for security)
      const event = StripeService.verifyWebhookSignature(
        req.body, // Raw body
        signature
      );

      logger.info(`Webhook received: ${event.type} - ${event.id}`);

      // Route to appropriate handler
      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.handlePaymentIntentSucceeded(event.data.object);
          break;

        case 'payment_intent.payment_failed':
          await this.handlePaymentIntentFailed(event.data.object);
          break;

        case 'payment_intent.canceled':
          await this.handlePaymentIntentCanceled(event.data.object);
          break;

        case 'charge.refunded':
          await this.handleChargeRefunded(event.data.object);
          break;

        case 'charge.dispute.created':
          await this.handleDisputeCreated(event.data.object);
          break;

        case 'payment_method.attached':
          await this.handlePaymentMethodAttached(event.data.object);
          break;

        default:
          logger.info(`Unhandled webhook event type: ${event.type}`);
      }

      // Always return 200 to acknowledge receipt
      return res.status(200).json({ received: true });
    } catch (error) {
      logger.error('Webhook handling error:', error);
      return res.status(400).json({ error: 'Webhook error' });
    }
  }

  /**
   * Payment Intent Succeeded
   * Payment was successfully captured
   */
  static async handlePaymentIntentSucceeded(paymentIntent) {
    try {
      const { id, amount, metadata } = paymentIntent;

      logger.info(`Payment succeeded: ${id} - $${amount / 100}`);

      // Update payment transaction status
      await pool.query(
        `UPDATE payment_transactions
         SET status = 'succeeded',
             updated_at = CURRENT_TIMESTAMP
         WHERE stripe_payment_intent_id = $1`,
        [id]
      );

      // Update checkout session status if needed
      if (metadata.checkoutSessionId) {
        await pool.query(
          `UPDATE checkout_sessions
           SET status = CASE
             WHEN status = 'pending' THEN 'payment_captured'
             ELSE status
           END,
           payment_captured_at = COALESCE(payment_captured_at, CURRENT_TIMESTAMP)
           WHERE session_id = $1`,
          [metadata.checkoutSessionId]
        );
      }

      logger.info(`Payment intent ${id} marked as succeeded in database`);
    } catch (error) {
      logger.error('Error handling payment_intent.succeeded:', error);
    }
  }

  /**
   * Payment Intent Failed
   * Payment failed (card declined, insufficient funds, etc.)
   */
  static async handlePaymentIntentFailed(paymentIntent) {
    try {
      const { id, last_payment_error, metadata } = paymentIntent;

      logger.error(`Payment failed: ${id} - ${last_payment_error?.message}`);

      // Update payment transaction status
      await pool.query(
        `UPDATE payment_transactions
         SET status = 'failed',
             failure_reason = $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE stripe_payment_intent_id = $2`,
        [last_payment_error?.message || 'Payment failed', id]
      );

      // Update checkout session status
      if (metadata.checkoutSessionId) {
        await pool.query(
          `UPDATE checkout_sessions
           SET status = 'failed',
               error_message = $1,
               updated_at = CURRENT_TIMESTAMP
           WHERE session_id = $2`,
          [last_payment_error?.message || 'Payment failed', metadata.checkoutSessionId]
        );
      }

      // TODO: Send email notification to user about payment failure
      // TODO: Trigger retry flow or alternative payment method request
    } catch (error) {
      logger.error('Error handling payment_intent.payment_failed:', error);
    }
  }

  /**
   * Payment Intent Canceled
   * Payment was canceled before completion
   */
  static async handlePaymentIntentCanceled(paymentIntent) {
    try {
      const { id, metadata } = paymentIntent;

      logger.info(`Payment canceled: ${id}`);

      // Update payment transaction status
      await pool.query(
        `UPDATE payment_transactions
         SET status = 'cancelled',
             updated_at = CURRENT_TIMESTAMP
         WHERE stripe_payment_intent_id = $1`,
        [id]
      );

      // Update checkout session status
      if (metadata.checkoutSessionId) {
        await pool.query(
          `UPDATE checkout_sessions
           SET status = 'cancelled',
               updated_at = CURRENT_TIMESTAMP
           WHERE session_id = $1`,
          [metadata.checkoutSessionId]
        );
      }
    } catch (error) {
      logger.error('Error handling payment_intent.canceled:', error);
    }
  }

  /**
   * Charge Refunded
   * A charge was refunded (full or partial)
   */
  static async handleChargeRefunded(charge) {
    try {
      const { id, amount_refunded, refunds } = charge;

      logger.info(`Charge refunded: ${id} - $${amount_refunded / 100}`);

      // Get the payment intent ID from charge
      const paymentIntentId = charge.payment_intent;

      // Find the original transaction
      const result = await pool.query(
        `SELECT checkout_session_id FROM payment_transactions
         WHERE stripe_payment_intent_id = $1`,
        [paymentIntentId]
      );

      if (result.rows.length === 0) {
        logger.error(`No transaction found for payment intent: ${paymentIntentId}`);
        return;
      }

      const checkoutSessionId = result.rows[0].checkout_session_id;

      // Create refund transaction record for each refund
      for (const refund of refunds.data) {
        await pool.query(
          `INSERT INTO payment_transactions (
            checkout_session_id,
            transaction_id,
            stripe_payment_intent_id,
            stripe_charge_id,
            amount_cents,
            transaction_type,
            status,
            metadata
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (transaction_id) DO NOTHING`,
          [
            checkoutSessionId,
            `txn_refund_${refund.id}`,
            paymentIntentId,
            id,
            refund.amount,
            refund.amount < charge.amount ? 'partial_refund' : 'refund',
            refund.status,
            JSON.stringify({ refundId: refund.id, reason: refund.reason }),
          ]
        );
      }

      // TODO: Update order statuses to 'refunded'
      // TODO: Send email notification about refund
    } catch (error) {
      logger.error('Error handling charge.refunded:', error);
    }
  }

  /**
   * Dispute Created
   * Customer disputed a charge (chargeback)
   */
  static async handleDisputeCreated(dispute) {
    try {
      const { id, amount, reason, charge } = dispute;

      logger.warn(`Dispute created: ${id} - $${amount / 100} - Reason: ${reason}`);

      // TODO: Create dispute record in database
      // TODO: Alert admin team for dispute resolution
      // TODO: Gather evidence for dispute response

      // Log critical dispute information
      logger.error(`DISPUTE ALERT: Dispute ${id} for charge ${charge}`, {
        disputeId: id,
        chargeId: charge,
        amount,
        reason,
        status: dispute.status,
      });

      // TODO: Send urgent email to ops team
    } catch (error) {
      logger.error('Error handling charge.dispute.created:', error);
    }
  }

  /**
   * Payment Method Attached
   * Payment method was attached to a customer
   */
  static async handlePaymentMethodAttached(paymentMethod) {
    try {
      const { id, customer } = paymentMethod;

      logger.info(`Payment method attached: ${id} to customer ${customer}`);

      // TODO: Update user's saved payment methods
      // TODO: Send confirmation email about saved card
    } catch (error) {
      logger.error('Error handling payment_method.attached:', error);
    }
  }
}

module.exports = StripeWebhookController;
