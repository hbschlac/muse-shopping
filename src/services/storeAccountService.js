/**
 * Store Account Service
 * Detects and manages user store accounts
 */

const pool = require('../db/pool');
const emailParser = require('../utils/emailParser');
const logger = require('../utils/logger');
const { NotFoundError } = require('../utils/errors');

class StoreAccountService {
  /**
   * Match email sender domain to store
   * @param {string} senderEmail - Email sender address
   * @returns {Promise<Object|null>} Matched store or null
   */
  static async matchEmailToStore(senderEmail) {
    if (!senderEmail) return null;

    const domain = emailParser.extractSenderDomain(senderEmail);
    if (!domain) return null;

    // Query store_aliases table
    const result = await pool.query(
      `SELECT s.*, sa.alias_value
       FROM stores s
       JOIN store_aliases sa ON s.id = sa.store_id
       WHERE sa.alias_value = $1 AND sa.is_active = true AND s.is_active = true
       LIMIT 1`,
      [domain]
    );

    if (result.rows.length === 0) {
      logger.debug(`No store found for domain: ${domain}`);
      return null;
    }

    return result.rows[0];
  }

  /**
   * Create or update user store account from email scan
   * @param {number} userId - User ID
   * @param {Object} storeData - Store data from email
   * @returns {Promise<Object>} User store account
   */
  static async createOrUpdateStoreAccount(userId, storeData) {
    const {
      storeId,
      accountEmail,
      orderNumber,
      orderDate,
      orderTotal,
      gmailMessageId,
    } = storeData;

    // Create or update user_store_accounts
    const accountResult = await pool.query(
      `INSERT INTO user_store_accounts (
        user_id,
        store_id,
        account_email,
        linking_method,
        first_detected_at,
        last_order_detected_at,
        total_orders_detected
      )
      VALUES ($1, $2, $3, 'auto_detected', NOW(), $4, 1)
      ON CONFLICT (user_id, store_id)
      DO UPDATE SET
        last_order_detected_at = GREATEST(
          user_store_accounts.last_order_detected_at,
          EXCLUDED.last_order_detected_at
        ),
        total_orders_detected = user_store_accounts.total_orders_detected + 1,
        updated_at = NOW()
      RETURNING *`,
      [userId, storeId, accountEmail, orderDate || new Date()]
    );

    const account = accountResult.rows[0];

    // Create order history record if we have order details
    if (orderNumber || orderTotal) {
      await pool.query(
        `INSERT INTO store_order_history (
          user_id,
          store_id,
          user_store_account_id,
          order_number,
          order_date,
          order_total_cents,
          detected_from,
          source_email_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, 'email_scan', $7)
        ON CONFLICT DO NOTHING`,
        [
          userId,
          storeId,
          account.id,
          orderNumber,
          orderDate || new Date(),
          orderTotal,
          gmailMessageId,
        ]
      );
    }

    return account;
  }

  /**
   * Get all store accounts for user
   * @param {number} userId - User ID
   * @returns {Promise<Array>} Array of store accounts
   */
  static async getUserStoreAccounts(userId) {
    const result = await pool.query(
      `SELECT
        usa.id,
        usa.user_id,
        usa.store_id,
        usa.account_email,
        usa.is_linked,
        usa.linking_method,
        usa.first_detected_at,
        usa.last_order_detected_at,
        usa.total_orders_detected,
        usa.created_at,
        s.name as store_name,
        s.display_name as store_display_name,
        s.slug as store_slug,
        s.logo_url as store_logo_url,
        s.website_url as store_website_url,
        s.integration_type,
        s.supports_checkout
       FROM user_store_accounts usa
       JOIN stores s ON usa.store_id = s.id
       WHERE usa.user_id = $1
       ORDER BY usa.total_orders_detected DESC, usa.last_order_detected_at DESC`,
      [userId]
    );

    return result.rows;
  }

  /**
   * Get detected (but not linked) stores for user
   * @param {number} userId - User ID
   * @returns {Promise<Array>} Array of detected stores
   */
  static async getDetectedStores(userId) {
    const result = await pool.query(
      `SELECT
        usa.id,
        usa.store_id,
        usa.account_email,
        usa.first_detected_at,
        usa.last_order_detected_at,
        usa.total_orders_detected,
        s.name as store_name,
        s.display_name as store_display_name,
        s.slug as store_slug,
        s.logo_url as store_logo_url,
        s.website_url as store_website_url,
        s.integration_type,
        s.supports_checkout
       FROM user_store_accounts usa
       JOIN stores s ON usa.store_id = s.id
       WHERE usa.user_id = $1 AND usa.is_linked = false
       ORDER BY usa.total_orders_detected DESC`,
      [userId]
    );

    return result.rows;
  }

  /**
   * Get order history for a store
   * @param {number} userId - User ID
   * @param {number} storeId - Store ID
   * @returns {Promise<Array>} Array of orders
   */
  static async getStoreOrderHistory(userId, storeId) {
    const result = await pool.query(
      `SELECT
        soh.id,
        soh.order_number,
        soh.order_date,
        soh.order_total_cents,
        soh.order_currency,
        soh.detected_from,
        soh.items_detected,
        soh.created_at
       FROM store_order_history soh
       WHERE soh.user_id = $1 AND soh.store_id = $2
       ORDER BY soh.order_date DESC
       LIMIT 50`,
      [userId, storeId]
    );

    return result.rows;
  }

  /**
   * Link store account (mark as authorized)
   * @param {number} userId - User ID
   * @param {number} storeId - Store ID
   * @returns {Promise<Object>} Updated account
   */
  static async linkStoreAccount(userId, storeId) {
    const result = await pool.query(
      `UPDATE user_store_accounts
       SET is_linked = true,
           linking_method = 'manual',
           is_verified = true,
           verified_at = NOW(),
           updated_at = NOW()
       WHERE user_id = $1 AND store_id = $2
       RETURNING *`,
      [userId, storeId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Store account not found');
    }

    return result.rows[0];
  }

  /**
   * Unlink store account
   * @param {number} userId - User ID
   * @param {number} storeId - Store ID
   * @returns {Promise<void>}
   */
  static async unlinkStoreAccount(userId, storeId) {
    const result = await pool.query(
      `UPDATE user_store_accounts
       SET is_linked = false,
           is_verified = false,
           oauth_access_token_encrypted = NULL,
           oauth_refresh_token_encrypted = NULL,
           updated_at = NOW()
       WHERE user_id = $1 AND store_id = $2
       RETURNING id`,
      [userId, storeId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Store account not found');
    }
  }

  /**
   * Get summary of user's store accounts
   * @param {number} userId - User ID
   * @returns {Promise<Object>} Summary stats
   */
  static async getAccountSummary(userId) {
    const result = await pool.query(
      `SELECT
        COUNT(*) as total_stores,
        COUNT(*) FILTER (WHERE is_linked = true) as linked_stores,
        COUNT(*) FILTER (WHERE is_linked = false) as detected_stores,
        SUM(total_orders_detected) as total_orders
       FROM user_store_accounts
       WHERE user_id = $1`,
      [userId]
    );

    return result.rows[0];
  }

  /**
   * Save retailer payment method for a store
   * @param {number} userId - User ID
   * @param {number} storeId - Store ID
   * @param {Object} paymentMethod - Payment method data { token, type, last4, expiryMonth, expiryYear }
   * @returns {Promise<Object>} Saved payment method
   */
  static async savePaymentMethod(userId, storeId, paymentMethod) {
    const { token, type = 'card', last4, expiryMonth, expiryYear } = paymentMethod;

    const result = await pool.query(
      `INSERT INTO user_store_payment_methods (
        user_id,
        store_id,
        payment_token,
        payment_type,
        last4,
        expiry_month,
        expiry_year,
        is_default
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, false)
      ON CONFLICT (user_id, store_id, payment_token)
      DO UPDATE SET
        last4 = EXCLUDED.last4,
        expiry_month = EXCLUDED.expiry_month,
        expiry_year = EXCLUDED.expiry_year,
        updated_at = NOW()
      RETURNING *`,
      [userId, storeId, token, type, last4 || null, expiryMonth || null, expiryYear || null]
    );

    logger.info(`Payment method saved for user ${userId}, store ${storeId}`);
    return result.rows[0];
  }

  /**
   * Get payment methods for multiple stores
   * Returns map of storeId -> payment token
   * @param {number} userId - User ID
   * @param {Array<number>} storeIds - Array of store IDs
   * @returns {Promise<Object>} Map of storeId to payment token
   */
  static async getPaymentMethodsForStores(userId, storeIds) {
    if (!storeIds || storeIds.length === 0) {
      return {};
    }

    const result = await pool.query(
      `SELECT
        store_id,
        payment_token,
        payment_type,
        last4,
        expiry_month,
        expiry_year,
        is_default
       FROM user_store_payment_methods
       WHERE user_id = $1 AND store_id = ANY($2::int[])
       ORDER BY is_default DESC, created_at DESC`,
      [userId, storeIds]
    );

    // Build map of storeId -> payment token (use first/default method per store)
    const paymentMap = {};
    const seen = new Set();

    for (const row of result.rows) {
      const storeIdStr = String(row.store_id);
      if (!seen.has(storeIdStr)) {
        paymentMap[storeIdStr] = row.payment_token;
        seen.add(storeIdStr);
      }
    }

    return paymentMap;
  }

  /**
   * Get all payment methods for a specific store
   * @param {number} userId - User ID
   * @param {number} storeId - Store ID
   * @returns {Promise<Array>} Array of payment methods
   */
  static async getPaymentMethodsForStore(userId, storeId) {
    const result = await pool.query(
      `SELECT
        id,
        payment_token,
        payment_type,
        last4,
        expiry_month,
        expiry_year,
        is_default,
        created_at
       FROM user_store_payment_methods
       WHERE user_id = $1 AND store_id = $2
       ORDER BY is_default DESC, created_at DESC`,
      [userId, storeId]
    );

    return result.rows;
  }

  /**
   * Delete a payment method
   * @param {number} userId - User ID
   * @param {number} paymentMethodId - Payment method ID
   * @returns {Promise<void>}
   */
  static async deletePaymentMethod(userId, paymentMethodId) {
    const result = await pool.query(
      `DELETE FROM user_store_payment_methods
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [paymentMethodId, userId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Payment method not found');
    }

    logger.info(`Payment method ${paymentMethodId} deleted for user ${userId}`);
  }

  /**
   * Set payment method as default for a store
   * @param {number} userId - User ID
   * @param {number} paymentMethodId - Payment method ID
   * @returns {Promise<Object>} Updated payment method
   */
  static async setDefaultPaymentMethod(userId, paymentMethodId) {
    // First, get the store_id for this payment method
    const pmResult = await pool.query(
      `SELECT store_id FROM user_store_payment_methods WHERE id = $1 AND user_id = $2`,
      [paymentMethodId, userId]
    );

    if (pmResult.rows.length === 0) {
      throw new NotFoundError('Payment method not found');
    }

    const storeId = pmResult.rows[0].store_id;

    // Unset all defaults for this user/store
    await pool.query(
      `UPDATE user_store_payment_methods
       SET is_default = false, updated_at = NOW()
       WHERE user_id = $1 AND store_id = $2`,
      [userId, storeId]
    );

    // Set the new default
    const result = await pool.query(
      `UPDATE user_store_payment_methods
       SET is_default = true, updated_at = NOW()
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [paymentMethodId, userId]
    );

    logger.info(`Payment method ${paymentMethodId} set as default for user ${userId}`);
    return result.rows[0];
  }
}

module.exports = StoreAccountService;
