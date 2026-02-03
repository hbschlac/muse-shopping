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
}

module.exports = StoreAccountService;
