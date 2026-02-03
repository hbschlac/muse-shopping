/**
 * Store Connection Service
 * Manages OAuth connections between users and retailer accounts
 *
 * SECURITY:
 * - OAuth tokens are ALWAYS encrypted at rest
 * - Tokens decrypted only when making API calls
 * - State tokens prevent CSRF attacks
 * - Tokens refreshed automatically before expiry
 */

const pool = require('../db/pool');
const logger = require('../utils/logger');
const { NotFoundError, ValidationError } = require('../utils/errors');
const crypto = require('crypto');

// Encryption using Node.js crypto
const ALGORITHM = 'aes-256-gcm';
const ENCRYPTION_KEY = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');

class StoreConnectionService {
  /**
   * Encrypt sensitive data
   * @param {string} text - Plain text to encrypt
   * @returns {string} Encrypted text with IV and auth tag
   */
  static encrypt(text) {
    if (!text) return null;

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Return: iv:authTag:encrypted
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  /**
   * Decrypt sensitive data
   * @param {string} encryptedText - Encrypted text with IV and auth tag
   * @returns {string} Plain text
   */
  static decrypt(encryptedText) {
    if (!encryptedText) return null;

    const parts = encryptedText.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted format');
    }

    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];

    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Create OAuth state token for CSRF protection
   * @param {number} userId - User ID
   * @param {number} storeId - Store ID
   * @param {string} returnUrl - URL to return to after OAuth
   * @returns {Promise<string>} State token
   */
  static async createOAuthState(userId, storeId, returnUrl = null) {
    const stateToken = crypto.randomBytes(32).toString('hex');
    const nonce = crypto.randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await pool.query(
      `INSERT INTO oauth_states (state_token, user_id, store_id, nonce, return_url, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [stateToken, userId, storeId, nonce, returnUrl, expiresAt]
    );

    return stateToken;
  }

  /**
   * Verify and consume OAuth state token
   * @param {string} stateToken - State token from OAuth callback
   * @returns {Promise<Object>} State data
   */
  static async verifyOAuthState(stateToken) {
    const result = await pool.query(
      `SELECT * FROM oauth_states
       WHERE state_token = $1 AND is_used = false AND expires_at > NOW()`,
      [stateToken]
    );

    if (result.rows.length === 0) {
      throw new ValidationError('Invalid or expired OAuth state');
    }

    const state = result.rows[0];

    // Mark as used
    await pool.query(
      `UPDATE oauth_states SET is_used = true, used_at = NOW() WHERE id = $1`,
      [state.id]
    );

    return {
      userId: state.user_id,
      storeId: state.store_id,
      returnUrl: state.return_url,
    };
  }

  /**
   * Create store connection after OAuth
   * @param {Object} connectionData - Connection details
   * @returns {Promise<Object>} Created connection
   */
  static async createConnection(connectionData) {
    const {
      userId,
      storeId,
      accessToken,
      refreshToken,
      expiresIn,
      retailerCustomerId = null,
      retailerEmail = null,
      scopes = [],
    } = connectionData;

    // Calculate expiry
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    // Encrypt tokens
    const encryptedAccessToken = this.encrypt(accessToken);
    const encryptedRefreshToken = this.encrypt(refreshToken);

    const result = await pool.query(
      `INSERT INTO user_store_connections (
        user_id,
        store_id,
        oauth_access_token_encrypted,
        oauth_refresh_token_encrypted,
        oauth_token_expires_at,
        retailer_customer_id,
        retailer_email,
        scopes_granted,
        is_connected,
        connection_status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, 'active')
      ON CONFLICT (user_id, store_id)
      DO UPDATE SET
        oauth_access_token_encrypted = EXCLUDED.oauth_access_token_encrypted,
        oauth_refresh_token_encrypted = EXCLUDED.oauth_refresh_token_encrypted,
        oauth_token_expires_at = EXCLUDED.oauth_token_expires_at,
        retailer_customer_id = EXCLUDED.retailer_customer_id,
        retailer_email = EXCLUDED.retailer_email,
        scopes_granted = EXCLUDED.scopes_granted,
        is_connected = true,
        connection_status = 'active',
        connected_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *`,
      [
        userId,
        storeId,
        encryptedAccessToken,
        encryptedRefreshToken,
        expiresAt,
        retailerCustomerId,
        retailerEmail,
        scopes,
      ]
    );

    logger.info(`Store connection created: user ${userId} → store ${storeId}`);

    return this.formatConnection(result.rows[0], false);
  }

  /**
   * Get user's connection to a store
   * @param {number} userId - User ID
   * @param {number} storeId - Store ID
   * @param {boolean} includeTokens - Include decrypted tokens (use with caution)
   * @returns {Promise<Object|null>} Connection or null
   */
  static async getConnection(userId, storeId, includeTokens = false) {
    const result = await pool.query(
      `SELECT
        usc.*,
        s.name as store_name,
        s.display_name as store_display_name,
        s.logo_url as store_logo
       FROM user_store_connections usc
       JOIN stores s ON usc.store_id = s.id
       WHERE usc.user_id = $1 AND usc.store_id = $2`,
      [userId, storeId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.formatConnection(result.rows[0], includeTokens);
  }

  /**
   * Get all user's store connections
   * @param {number} userId - User ID
   * @returns {Promise<Array>} List of connections
   */
  static async getUserConnections(userId) {
    const result = await pool.query(
      `SELECT
        usc.*,
        s.name as store_name,
        s.display_name as store_display_name,
        s.logo_url as store_logo,
        s.website_url as store_website
       FROM user_store_connections usc
       JOIN stores s ON usc.store_id = s.id
       WHERE usc.user_id = $1
       ORDER BY usc.connected_at DESC`,
      [userId]
    );

    return result.rows.map(row => this.formatConnection(row, false));
  }

  /**
   * Get active access token (refresh if needed)
   * @param {number} userId - User ID
   * @param {number} storeId - Store ID
   * @returns {Promise<string>} Valid access token
   */
  static async getAccessToken(userId, storeId) {
    const connection = await this.getConnection(userId, storeId, true);

    if (!connection || !connection.isConnected) {
      throw new Error('Store not connected');
    }

    // Check if token is expired or expiring soon (5 min buffer)
    const expiresAt = new Date(connection.tokenExpiresAt);
    const now = new Date();
    const buffer = 5 * 60 * 1000; // 5 minutes

    if (expiresAt.getTime() - now.getTime() < buffer) {
      // Token expired or expiring soon, refresh it
      logger.info(`Refreshing expired token for user ${userId}, store ${storeId}`);
      return await this.refreshAccessToken(userId, storeId);
    }

    return connection.accessToken;
  }

  /**
   * Refresh access token using refresh token
   * @param {number} userId - User ID
   * @param {number} storeId - Store ID
   * @returns {Promise<string>} New access token
   */
  static async refreshAccessToken(userId, storeId) {
    const connection = await this.getConnection(userId, storeId, true);

    if (!connection) {
      throw new Error('Connection not found');
    }

    // Get retailer API client
    const RetailerAPIFactory = require('./retailerAPIFactory');
    const apiClient = RetailerAPIFactory.getOAuthClient(storeId);

    // Refresh token
    const tokens = await apiClient.refreshToken(connection.refreshToken);

    // Update connection with new tokens
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    await pool.query(
      `UPDATE user_store_connections
       SET oauth_access_token_encrypted = $1,
           oauth_token_expires_at = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $3 AND store_id = $4`,
      [this.encrypt(tokens.access_token), expiresAt, userId, storeId]
    );

    logger.info(`Access token refreshed for user ${userId}, store ${storeId}`);

    return tokens.access_token;
  }

  /**
   * Disconnect store (revoke OAuth)
   * @param {number} userId - User ID
   * @param {number} storeId - Store ID
   * @returns {Promise<void>}
   */
  static async disconnectStore(userId, storeId) {
    const connection = await this.getConnection(userId, storeId, true);

    if (!connection) {
      throw new NotFoundError('Connection not found');
    }

    // Revoke token at retailer (if supported)
    try {
      const RetailerAPIFactory = require('./retailerAPIFactory');
      const apiClient = RetailerAPIFactory.getOAuthClient(storeId);
      await apiClient.revokeToken(connection.accessToken);
    } catch (error) {
      logger.error('Error revoking token at retailer:', error);
      // Continue with disconnect even if revoke fails
    }

    // Mark as disconnected
    await pool.query(
      `UPDATE user_store_connections
       SET is_connected = false,
           connection_status = 'revoked',
           disconnected_at = CURRENT_TIMESTAMP
       WHERE user_id = $1 AND store_id = $2`,
      [userId, storeId]
    );

    logger.info(`Store connection disconnected: user ${userId} → store ${storeId}`);
  }

  /**
   * Format connection for response
   * @param {Object} connection - Raw connection from DB
   * @param {boolean} includeTokens - Include decrypted tokens
   * @returns {Object} Formatted connection
   */
  static formatConnection(connection, includeTokens = false) {
    const formatted = {
      id: connection.id,
      userId: connection.user_id,
      storeId: connection.store_id,
      storeName: connection.store_display_name || connection.store_name,
      storeLogo: connection.store_logo,
      isConnected: connection.is_connected,
      connectionStatus: connection.connection_status,
      retailerCustomerId: connection.retailer_customer_id,
      retailerEmail: connection.retailer_email,
      scopesGranted: connection.scopes_granted,
      connectedAt: connection.connected_at,
      lastSyncedAt: connection.last_synced_at,
    };

    // Only include tokens when explicitly requested and needed
    if (includeTokens) {
      formatted.accessToken = this.decrypt(connection.oauth_access_token_encrypted);
      formatted.refreshToken = this.decrypt(connection.oauth_refresh_token_encrypted);
      formatted.tokenExpiresAt = connection.oauth_token_expires_at;
    }

    return formatted;
  }
}

module.exports = StoreConnectionService;
