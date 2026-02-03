/**
 * Retailer API Factory
 * Creates appropriate API client for each retailer
 *
 * This factory pattern allows us to add new retailers easily
 * Each retailer has its own API client implementation
 */

const logger = require('../utils/logger');

class RetailerAPIFactory {
  /**
   * Get API client for a retailer
   * @param {number} storeId - Store ID
   * @param {Object} options - Client options (accessToken, etc.)
   * @returns {Object} API client instance
   */
  static getClient(storeId, options = {}) {
    const storeConfig = this.getStoreConfig(storeId);

    switch (storeConfig.apiProvider) {
      case 'target':
        const TargetAPI = require('./retailerAPIs/targetAPI');
        return new TargetAPI(options);

      case 'walmart':
        const WalmartAPI = require('./retailerAPIs/walmartAPI');
        return new WalmartAPI(options);

      case 'nordstrom':
        const NordstromAPI = require('./retailerAPIs/nordstromAPI');
        return new NordstromAPI(options);

      default:
        throw new Error(`No API client available for store ID ${storeId}`);
    }
  }

  /**
   * Get OAuth client for retailer
   * @param {number} storeId - Store ID
   * @returns {Object} OAuth client
   */
  static getOAuthClient(storeId) {
    const storeConfig = this.getStoreConfig(storeId);

    // Return OAuth-specific methods
    return {
      /**
       * Get OAuth authorization URL
       * @param {string} state - CSRF state token
       * @param {string} redirectUri - Callback URL
       * @returns {string} Authorization URL
       */
      getAuthorizationUrl(state, redirectUri) {
        const params = new URLSearchParams({
          client_id: storeConfig.clientId,
          redirect_uri: redirectUri,
          state: state,
          scope: storeConfig.scopes.join(' '),
          response_type: 'code',
        });

        return `${storeConfig.authUrl}?${params.toString()}`;
      },

      /**
       * Exchange authorization code for tokens
       * @param {string} code - Authorization code
       * @param {string} redirectUri - Callback URL
       * @returns {Promise<Object>} Tokens
       */
      async exchangeCodeForTokens(code, redirectUri) {
        const response = await fetch(storeConfig.tokenUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${Buffer.from(
              `${storeConfig.clientId}:${storeConfig.clientSecret}`
            ).toString('base64')}`,
          },
          body: new URLSearchParams({
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: redirectUri,
          }),
        });

        if (!response.ok) {
          const error = await response.text();
          logger.error('Token exchange failed:', error);
          throw new Error('Failed to exchange code for tokens');
        }

        const data = await response.json();

        return {
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          expires_in: data.expires_in,
          token_type: data.token_type,
        };
      },

      /**
       * Refresh access token
       * @param {string} refreshToken - Refresh token
       * @returns {Promise<Object>} New tokens
       */
      async refreshToken(refreshToken) {
        const response = await fetch(storeConfig.tokenUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${Buffer.from(
              `${storeConfig.clientId}:${storeConfig.clientSecret}`
            ).toString('base64')}`,
          },
          body: new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to refresh token');
        }

        const data = await response.json();

        return {
          access_token: data.access_token,
          refresh_token: data.refresh_token || refreshToken, // Some don't return new refresh token
          expires_in: data.expires_in,
        };
      },

      /**
       * Revoke access token
       * @param {string} accessToken - Access token to revoke
       * @returns {Promise<void>}
       */
      async revokeToken(accessToken) {
        if (!storeConfig.revokeUrl) {
          logger.warn(`No revoke URL for store ${storeId}`);
          return;
        }

        await fetch(storeConfig.revokeUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${Buffer.from(
              `${storeConfig.clientId}:${storeConfig.clientSecret}`
            ).toString('base64')}`,
          },
          body: new URLSearchParams({
            token: accessToken,
          }),
        });
      },
    };
  }

  /**
   * Get store configuration
   * @param {number} storeId - Store ID
   * @returns {Object} Store config
   */
  static getStoreConfig(storeId) {
    // Map store IDs to configurations
    const configs = {
      // Target (example - using real Target+ API structure)
      4: {
        apiProvider: 'target',
        clientId: process.env.TARGET_CLIENT_ID,
        clientSecret: process.env.TARGET_CLIENT_SECRET,
        authUrl: 'https://oauth.target.com/authorize',
        tokenUrl: 'https://oauth.target.com/token',
        revokeUrl: 'https://oauth.target.com/revoke',
        apiBaseUrl: 'https://api.target.com/partners/v1',
        scopes: ['orders.write', 'orders.read', 'payment_methods.read', 'profile.read'],
      },

      // Walmart (example - using Walmart Partner API structure)
      5: {
        apiProvider: 'walmart',
        clientId: process.env.WALMART_CLIENT_ID,
        clientSecret: process.env.WALMART_CLIENT_SECRET,
        authUrl: 'https://oauth.walmart.com/authorize',
        tokenUrl: 'https://oauth.walmart.com/token',
        revokeUrl: 'https://oauth.walmart.com/revoke',
        apiBaseUrl: 'https://developer.api.walmart.com/api-proxy/service',
        scopes: ['orders', 'payment', 'customer'],
      },

      // Nordstrom (example - using Nordstrom Partner API structure)
      1: {
        apiProvider: 'nordstrom',
        clientId: process.env.NORDSTROM_CLIENT_ID,
        clientSecret: process.env.NORDSTROM_CLIENT_SECRET,
        authUrl: 'https://oauth.nordstrom.com/authorize',
        tokenUrl: 'https://oauth.nordstrom.com/token',
        revokeUrl: 'https://oauth.nordstrom.com/revoke',
        apiBaseUrl: 'https://api.nordstrom.com/v1',
        scopes: ['orders.read', 'orders.write', 'payment.read', 'account.read', 'returns.write'],
      },

      // Add more retailers as partnerships are established
    };

    const config = configs[storeId];

    if (!config) {
      throw new Error(`No configuration found for store ID ${storeId}`);
    }

    return config;
  }

  /**
   * Check if store supports OAuth API integration
   * @param {number} storeId - Store ID
   * @returns {boolean} True if OAuth available
   */
  static supportsOAuth(storeId) {
    try {
      this.getStoreConfig(storeId);
      return true;
    } catch (error) {
      return false;
    }
  }
}

module.exports = RetailerAPIFactory;
