/**
 * Alert Service
 * Sends real-time alerts to Slack, Sentry, and PagerDuty
 * Handles critical system failures and business-critical events
 */

const logger = require('../utils/logger');

class AlertService {
  /**
   * Send Slack alert
   * @param {string} severity - 'critical', 'warning', 'info'
   * @param {string} title - Alert title
   * @param {string} message - Alert message
   * @param {Object} metadata - Additional context
   * @returns {Promise<boolean>} Success status
   */
  static async sendSlackAlert(severity, title, message, metadata = {}) {
    if (!process.env.SLACK_WEBHOOK_URL) {
      logger.warn('Slack webhook not configured, skipping alert');
      return false;
    }

    try {
      const color = this.getSeverityColor(severity);
      const emoji = this.getSeverityEmoji(severity);

      const payload = {
        username: 'Muse Shopping Monitor',
        icon_emoji: ':robot_face:',
        attachments: [{
          color,
          title: `${emoji} ${title}`,
          text: message,
          fields: Object.entries(metadata).map(([key, value]) => ({
            title: key,
            value: String(value),
            short: true
          })),
          footer: 'Muse Shopping API',
          ts: Math.floor(Date.now() / 1000)
        }]
      };

      const response = await fetch(process.env.SLACK_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        logger.error('Failed to send Slack alert:', await response.text());
        return false;
      }

      logger.info(`Slack alert sent: ${title}`);
      return true;
    } catch (error) {
      logger.error('Error sending Slack alert:', error);
      return false;
    }
  }

  /**
   * Alert on payment failure
   * @param {Object} error - Payment error
   * @param {string} paymentIntentId - Stripe payment intent ID
   * @param {number} userId - User ID
   * @param {number} amountCents - Payment amount
   */
  static async alertPaymentFailure(error, paymentIntentId, userId, amountCents) {
    await this.sendSlackAlert(
      'critical',
      '💳 Payment Failure',
      `Payment of $${(amountCents / 100).toFixed(2)} failed`,
      {
        'User ID': userId,
        'Payment Intent': paymentIntentId,
        'Error': error.message,
        'Amount': `$${(amountCents / 100).toFixed(2)}`,
        'Time': new Date().toISOString(),
      }
    );
  }

  /**
   * Alert on checkout failure
   * @param {string} sessionId - Checkout session ID
   * @param {number} userId - User ID
   * @param {Object} error - Error object
   * @param {Object} cart - Cart snapshot
   */
  static async alertCheckoutFailure(sessionId, userId, error, cart = {}) {
    const totalValue = cart.summary?.subtotalCents || 0;

    await this.sendSlackAlert(
      'warning',
      '🛒 Checkout Failure',
      `Checkout session failed for $${(totalValue / 100).toFixed(2)}`,
      {
        'Session ID': sessionId,
        'User ID': userId,
        'Error': error.message,
        'Cart Value': `$${(totalValue / 100).toFixed(2)}`,
        'Items': cart.summary?.totalItemCount || 0,
      }
    );
  }

  /**
   * Alert on manual order creation
   * @param {Object} order - Order object
   * @param {string} reason - Why manual placement needed
   */
  static async alertManualOrderCreated(order, reason) {
    await this.sendSlackAlert(
      'info',
      '📋 Manual Order Created',
      `Order ${order.muse_order_number} requires manual placement`,
      {
        'Order': order.muse_order_number,
        'Store ID': order.store_id,
        'Total': `$${(order.total_cents / 100).toFixed(2)}`,
        'Reason': reason,
        'User ID': order.user_id,
      }
    );
  }

  /**
   * Alert on high error rate
   * @param {string} errorType - Type of error
   * @param {number} count - Error count
   * @param {number} timeWindowMinutes - Time window
   */
  static async alertHighErrorRate(errorType, count, timeWindowMinutes) {
    await this.sendSlackAlert(
      'critical',
      '🚨 High Error Rate',
      `${count} ${errorType} errors in ${timeWindowMinutes} minutes`,
      {
        'Error Type': errorType,
        'Count': count,
        'Time Window': `${timeWindowMinutes} minutes`,
        'Threshold': 'EXCEEDED',
      }
    );
  }

  /**
   * Alert on database connection failure
   * @param {Object} error - Database error
   */
  static async alertDatabaseFailure(error) {
    await this.sendSlackAlert(
      'critical',
      '🔴 Database Connection Failure',
      'Unable to connect to database',
      {
        'Error': error.message,
        'Code': error.code,
        'Time': new Date().toISOString(),
      }
    );
  }

  /**
   * Alert on external service failure
   * @param {string} service - Service name (Stripe, TaxJar, etc.)
   * @param {Object} error - Error object
   * @param {string} operation - Operation that failed
   */
  static async alertExternalServiceFailure(service, error, operation) {
    await this.sendSlackAlert(
      'critical',
      `⚠️ ${service} Service Failure`,
      `${service} ${operation} operation failed`,
      {
        'Service': service,
        'Operation': operation,
        'Error': error.message,
        'Time': new Date().toISOString(),
      }
    );
  }

  /**
   * Alert on promo code abuse
   * @param {string} code - Promo code
   * @param {number} userId - User ID
   * @param {number} attemptCount - Number of attempts
   */
  static async alertPromoCodeAbuse(code, userId, attemptCount) {
    await this.sendSlackAlert(
      'warning',
      '🎟️ Promo Code Abuse Detected',
      `User ${userId} attempted promo code ${attemptCount} times`,
      {
        'User ID': userId,
        'Promo Code': code,
        'Attempts': attemptCount,
        'Action': 'Review account',
      }
    );
  }

  /**
   * Alert on inventory sync failure
   * @param {number} storeId - Store ID
   * @param {number} failedItems - Number of items that failed
   */
  static async alertInventorySyncFailure(storeId, failedItems) {
    await this.sendSlackAlert(
      'warning',
      '📦 Inventory Sync Failure',
      `Failed to sync inventory for store ${storeId}`,
      {
        'Store ID': storeId,
        'Failed Items': failedItems,
        'Action': 'Check store API connection',
      }
    );
  }

  /**
   * Alert on successful order placement (info level)
   * @param {Object} order - Order object
   */
  static async alertOrderPlaced(order) {
    // Only send for high-value orders or first-time customers
    if (order.total_cents >= 50000) { // $500+
      await this.sendSlackAlert(
        'info',
        '💰 High-Value Order',
        `Order ${order.muse_order_number} placed for $${(order.total_cents / 100).toFixed(2)}`,
        {
          'Order': order.muse_order_number,
          'Total': `$${(order.total_cents / 100).toFixed(2)}`,
          'User ID': order.user_id,
          'Store ID': order.store_id,
        }
      );
    }
  }

  /**
   * Get color for severity level
   * @param {string} severity - Severity level
   * @returns {string} Hex color
   */
  static getSeverityColor(severity) {
    switch (severity) {
      case 'critical':
        return '#FF0000'; // Red
      case 'warning':
        return '#FFA500'; // Orange
      case 'info':
        return '#36A64F'; // Green
      default:
        return '#CCCCCC'; // Gray
    }
  }

  /**
   * Get emoji for severity level
   * @param {string} severity - Severity level
   * @returns {string} Emoji
   */
  static getSeverityEmoji(severity) {
    switch (severity) {
      case 'critical':
        return '🚨';
      case 'warning':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      default:
        return '📢';
    }
  }

  /**
   * Send batch alert summary (for digest emails)
   * @param {Object} summary - Summary of events
   */
  static async sendDailySummary(summary) {
    const {
      totalOrders = 0,
      totalRevenue = 0,
      failedPayments = 0,
      manualOrders = 0,
      checkoutErrors = 0,
    } = summary;

    await this.sendSlackAlert(
      'info',
      '📊 Daily Summary',
      `Orders: ${totalOrders} | Revenue: $${(totalRevenue / 100).toFixed(2)}`,
      {
        'Total Orders': totalOrders,
        'Revenue': `$${(totalRevenue / 100).toFixed(2)}`,
        'Failed Payments': failedPayments,
        'Manual Orders': manualOrders,
        'Checkout Errors': checkoutErrors,
      }
    );
  }

  /**
   * Send test alert to verify configuration
   * @returns {Promise<boolean>} Success status
   */
  static async sendTestAlert() {
    return await this.sendSlackAlert(
      'info',
      '🧪 Test Alert',
      'Slack webhook is configured correctly!',
      {
        'Status': 'Working',
        'Environment': process.env.NODE_ENV || 'development',
      }
    );
  }
}

module.exports = AlertService;
