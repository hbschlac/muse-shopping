/**
 * Meta (Instagram/Facebook) OAuth Authentication Service
 * Handles OAuth flow for connecting Instagram and Facebook accounts
 */

const axios = require('axios');
const pool = require('../db/pool');
const { encrypt, decrypt } = require('../utils/encryption');
const logger = require('../utils/logger');
const { ValidationError } = require('../utils/errors');

// Meta OAuth Configuration
const META_APP_ID = process.env.META_APP_ID;
const META_APP_SECRET = process.env.META_APP_SECRET;
const META_REDIRECT_URI = process.env.META_REDIRECT_URI || 'http://localhost:3000/api/v1/social/meta/callback';

// Instagram Basic Display API Scopes
const INSTAGRAM_SCOPES = [
  'instagram_basic',
  'instagram_content_publish',
  'pages_show_list',
  'pages_read_engagement',
];

// Facebook Scopes
const FACEBOOK_SCOPES = [
  'public_profile',
  'email',
  'pages_show_list',
  'pages_read_engagement',
  'instagram_basic',
  'instagram_manage_insights',
];

class MetaAuthService {
  /**
   * Generate Instagram OAuth URL
   * @param {number} userId - User ID for state parameter
   * @param {string} state - Optional custom state
   * @returns {string} Authorization URL
   */
  static getInstagramAuthUrl(userId, state = null) {
    if (!META_APP_ID || !META_REDIRECT_URI) {
      throw new Error('Meta OAuth credentials not configured');
    }

    const stateParam = state || `instagram_${userId}_${Date.now()}`;
    const scope = INSTAGRAM_SCOPES.join(',');

    // Instagram OAuth uses Facebook's OAuth endpoint
    const authUrl = new URL('https://www.facebook.com/v18.0/dialog/oauth');
    authUrl.searchParams.append('client_id', META_APP_ID);
    authUrl.searchParams.append('redirect_uri', META_REDIRECT_URI);
    authUrl.searchParams.append('scope', scope);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('state', stateParam);

    return authUrl.toString();
  }

  /**
   * Generate Facebook OAuth URL
   * @param {number} userId - User ID for state parameter
   * @param {string} state - Optional custom state
   * @returns {string} Authorization URL
   */
  static getFacebookAuthUrl(userId, state = null) {
    if (!META_APP_ID || !META_REDIRECT_URI) {
      throw new Error('Meta OAuth credentials not configured');
    }

    const stateParam = state || `facebook_${userId}_${Date.now()}`;
    const scope = FACEBOOK_SCOPES.join(',');

    const authUrl = new URL('https://www.facebook.com/v18.0/dialog/oauth');
    authUrl.searchParams.append('client_id', META_APP_ID);
    authUrl.searchParams.append('redirect_uri', META_REDIRECT_URI);
    authUrl.searchParams.append('scope', scope);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('state', stateParam);

    return authUrl.toString();
  }

  /**
   * Exchange authorization code for access token
   * @param {string} code - Authorization code from OAuth callback
   * @returns {Promise<Object>} Token data
   */
  static async exchangeCodeForToken(code) {
    if (!code) {
      throw new ValidationError('Authorization code is required');
    }

    try {
      const tokenUrl = 'https://graph.facebook.com/v18.0/oauth/access_token';

      const response = await axios.get(tokenUrl, {
        params: {
          client_id: META_APP_ID,
          client_secret: META_APP_SECRET,
          redirect_uri: META_REDIRECT_URI,
          code: code,
        },
      });

      const { access_token, token_type, expires_in } = response.data;

      if (!access_token) {
        throw new Error('No access token received from Meta');
      }

      // Calculate token expiration
      const expiresAt = expires_in
        ? new Date(Date.now() + expires_in * 1000)
        : new Date(Date.now() + 60 * 24 * 60 * 60 * 1000); // Default 60 days

      return {
        accessToken: access_token,
        tokenType: token_type,
        expiresAt,
      };
    } catch (error) {
      logger.error('Error exchanging code for Meta token:', error.response?.data || error);

      if (error.response?.data?.error?.message) {
        throw new ValidationError(error.response.data.error.message);
      }

      throw new Error('Failed to exchange authorization code for access token');
    }
  }

  /**
   * Get Instagram account information
   * @param {string} accessToken - Meta access token
   * @returns {Promise<Object>} Instagram account data
   */
  static async getInstagramAccountInfo(accessToken) {
    try {
      // First, get Facebook user's pages (business accounts)
      const pagesResponse = await axios.get('https://graph.facebook.com/v18.0/me/accounts', {
        params: {
          access_token: accessToken,
          fields: 'id,name,access_token,instagram_business_account',
        },
      });

      const pages = pagesResponse.data.data || [];

      // Find a page with an Instagram business account
      const pageWithInstagram = pages.find(page => page.instagram_business_account);

      if (!pageWithInstagram) {
        throw new ValidationError('No Instagram Business Account found. Please connect an Instagram Business or Creator account.');
      }

      const igAccountId = pageWithInstagram.instagram_business_account.id;

      // Get Instagram account details
      const igResponse = await axios.get(`https://graph.facebook.com/v18.0/${igAccountId}`, {
        params: {
          access_token: accessToken,
          fields: 'id,username,name,profile_picture_url,followers_count,media_count',
        },
      });

      return {
        provider: 'instagram',
        providerUserId: igResponse.data.id,
        username: igResponse.data.username,
        displayName: igResponse.data.name,
        profilePictureUrl: igResponse.data.profile_picture_url,
        followersCount: igResponse.data.followers_count,
        mediaCount: igResponse.data.media_count,
        pageId: pageWithInstagram.id,
        pageName: pageWithInstagram.name,
      };
    } catch (error) {
      logger.error('Error getting Instagram account info:', error.response?.data || error);

      if (error.message.includes('No Instagram Business Account')) {
        throw error;
      }

      throw new Error('Failed to fetch Instagram account information');
    }
  }

  /**
   * Get Facebook account information
   * @param {string} accessToken - Meta access token
   * @returns {Promise<Object>} Facebook account data
   */
  static async getFacebookAccountInfo(accessToken) {
    try {
      const response = await axios.get('https://graph.facebook.com/v18.0/me', {
        params: {
          access_token: accessToken,
          fields: 'id,name,email,picture.width(200).height(200)',
        },
      });

      return {
        provider: 'facebook',
        providerUserId: response.data.id,
        username: null, // Facebook doesn't use usernames anymore
        displayName: response.data.name,
        email: response.data.email,
        profilePictureUrl: response.data.picture?.data?.url,
      };
    } catch (error) {
      logger.error('Error getting Facebook account info:', error.response?.data || error);
      throw new Error('Failed to fetch Facebook account information');
    }
  }

  /**
   * Save or update social connection in database
   * @param {number} userId - User ID
   * @param {Object} connectionData - Connection data
   * @param {string} accessToken - Access token
   * @param {Date} expiresAt - Token expiration
   * @returns {Promise<Object>} Saved connection
   */
  static async saveSocialConnection(userId, connectionData, accessToken, expiresAt) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Encrypt access token
      const encryptedToken = encrypt(accessToken);

      // Upsert social connection
      const query = `
        INSERT INTO social_connections (
          user_id,
          provider,
          provider_user_id,
          username,
          display_name,
          profile_picture_url,
          access_token_encrypted,
          token_expires_at,
          scopes,
          is_active,
          last_synced_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, CURRENT_TIMESTAMP)
        ON CONFLICT (user_id, provider)
        DO UPDATE SET
          provider_user_id = EXCLUDED.provider_user_id,
          username = EXCLUDED.username,
          display_name = EXCLUDED.display_name,
          profile_picture_url = EXCLUDED.profile_picture_url,
          access_token_encrypted = EXCLUDED.access_token_encrypted,
          token_expires_at = EXCLUDED.token_expires_at,
          scopes = EXCLUDED.scopes,
          is_active = true,
          last_synced_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        RETURNING *
      `;

      const scopes = connectionData.provider === 'instagram'
        ? INSTAGRAM_SCOPES
        : FACEBOOK_SCOPES;

      const result = await client.query(query, [
        userId,
        connectionData.provider,
        connectionData.providerUserId,
        connectionData.username,
        connectionData.displayName,
        connectionData.profilePictureUrl,
        encryptedToken,
        expiresAt,
        scopes,
      ]);

      await client.query('COMMIT');

      const connection = result.rows[0];

      logger.info(`${connectionData.provider} connection saved for user ${userId} (@${connectionData.username})`);

      return {
        id: connection.id,
        userId: connection.user_id,
        provider: connection.provider,
        username: connection.username,
        displayName: connection.display_name,
        profilePictureUrl: connection.profile_picture_url,
        isActive: connection.is_active,
        createdAt: connection.created_at,
        expiresAt: connection.token_expires_at,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error saving social connection:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Handle complete Instagram OAuth flow
   * @param {number} userId - User ID
   * @param {string} code - Authorization code
   * @returns {Promise<Object>} Connection data
   */
  static async handleInstagramAuth(userId, code) {
    // Exchange code for token
    const tokenData = await this.exchangeCodeForToken(code);

    // Get Instagram account info
    const accountInfo = await this.getInstagramAccountInfo(tokenData.accessToken);

    // Save connection
    const connection = await this.saveSocialConnection(
      userId,
      accountInfo,
      tokenData.accessToken,
      tokenData.expiresAt
    );

    return {
      connection,
      accountInfo,
    };
  }

  /**
   * Handle complete Facebook OAuth flow
   * @param {number} userId - User ID
   * @param {string} code - Authorization code
   * @returns {Promise<Object>} Connection data
   */
  static async handleFacebookAuth(userId, code) {
    // Exchange code for token
    const tokenData = await this.exchangeCodeForToken(code);

    // Get Facebook account info
    const accountInfo = await this.getFacebookAccountInfo(tokenData.accessToken);

    // Save connection
    const connection = await this.saveSocialConnection(
      userId,
      accountInfo,
      tokenData.accessToken,
      tokenData.expiresAt
    );

    return {
      connection,
      accountInfo,
    };
  }

  /**
   * Get user's social connections
   * @param {number} userId - User ID
   * @param {string} provider - Optional provider filter
   * @returns {Promise<Array>} Social connections
   */
  static async getUserConnections(userId, provider = null) {
    let query = `
      SELECT
        id,
        user_id,
        provider,
        username,
        display_name,
        profile_picture_url,
        token_expires_at,
        is_active,
        last_synced_at,
        created_at
      FROM social_connections
      WHERE user_id = $1
    `;

    const params = [userId];

    if (provider) {
      query += ' AND provider = $2';
      params.push(provider);
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);
    return result.rows;
  }

  /**
   * Disconnect social account
   * @param {number} userId - User ID
   * @param {string} provider - Provider name
   * @returns {Promise<boolean>} Success status
   */
  static async disconnectAccount(userId, provider) {
    const result = await pool.query(
      'DELETE FROM social_connections WHERE user_id = $1 AND provider = $2 RETURNING id',
      [userId, provider]
    );

    if (result.rows.length === 0) {
      throw new ValidationError(`No ${provider} connection found for this user`);
    }

    logger.info(`${provider} connection removed for user ${userId}`);
    return true;
  }

  /**
   * Check if token is expired
   * @param {Date} expiresAt - Token expiration date
   * @returns {boolean} Is expired
   */
  static isTokenExpired(expiresAt) {
    if (!expiresAt) return false;
    return new Date() >= new Date(expiresAt);
  }
}

module.exports = MetaAuthService;
