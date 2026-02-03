/**
 * Store Connection Controller
 * Handles OAuth connections to retailer accounts
 */

const StoreConnectionService = require('../services/storeConnectionService');
const RetailerAPIFactory = require('../services/retailerAPIFactory');
const logger = require('../utils/logger');
const { ValidationError } = require('../utils/errors');
const pool = require('../db/pool');

class StoreConnectionController {
  /**
   * Get all user's store connections
   * GET /api/store-connections
   */
  static async getUserConnections(req, res, next) {
    try {
      const userId = req.user.id;

      const connections = await StoreConnectionService.getUserConnections(userId);

      res.json({
        success: true,
        connections,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get connection to specific store
   * GET /api/store-connections/:storeId
   */
  static async getConnection(req, res, next) {
    try {
      const userId = req.user.id;
      const storeId = parseInt(req.params.storeId);

      const connection = await StoreConnectionService.getConnection(userId, storeId);

      if (!connection) {
        return res.status(404).json({
          success: false,
          error: 'Connection not found',
        });
      }

      res.json({
        success: true,
        connection,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Initiate OAuth flow
   * POST /api/store-connections/:storeId/connect
   */
  static async initiateOAuth(req, res, next) {
    try {
      const userId = req.user.id;
      const storeId = parseInt(req.params.storeId);
      const { returnUrl } = req.body;

      // Create state token for CSRF protection
      const stateToken = await StoreConnectionService.createOAuthState(
        userId,
        storeId,
        returnUrl || '/settings/connections'
      );

      // Get OAuth client for this retailer
      const oauthClient = RetailerAPIFactory.getOAuthClient(storeId);

      // Build authorization URL
      const authUrl = oauthClient.getAuthorizationUrl(stateToken);

      logger.info(`OAuth flow initiated: user ${userId} → store ${storeId}`);

      res.json({
        success: true,
        authUrl,
        state: stateToken,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Handle OAuth callback
   * GET /api/store-connections/callback
   */
  static async handleOAuthCallback(req, res, next) {
    try {
      const { code, state, error: oauthError } = req.query;

      // Handle OAuth errors
      if (oauthError) {
        logger.error('OAuth error:', oauthError);
        return res.redirect(`/settings/connections?error=${oauthError}`);
      }

      if (!code || !state) {
        throw new ValidationError('Missing OAuth code or state');
      }

      // Verify state token (CSRF protection)
      const stateData = await StoreConnectionService.verifyOAuthState(state);
      const { userId, storeId, returnUrl } = stateData;

      // Get OAuth client
      const oauthClient = RetailerAPIFactory.getOAuthClient(storeId);

      // Exchange code for tokens
      const tokens = await oauthClient.exchangeCodeForTokens(code);

      // Get customer profile
      const apiClient = RetailerAPIFactory.getClient(storeId, {
        accessToken: tokens.access_token,
      });
      const customerProfile = await apiClient.getCustomerProfile();

      // Create connection in database
      await StoreConnectionService.createConnection({
        userId,
        storeId,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresIn: tokens.expires_in,
        retailerCustomerId: customerProfile.customerId,
        retailerEmail: customerProfile.email,
        scopes: tokens.scope ? tokens.scope.split(' ') : [],
      });

      // Sync payment methods and addresses
      await this.syncPaymentMethods(userId, storeId, apiClient);
      await this.syncAddresses(userId, storeId, apiClient);

      logger.info(`OAuth connection successful: user ${userId} → store ${storeId}`);

      // Redirect back to app
      res.redirect(`${returnUrl}?connected=${storeId}`);
    } catch (error) {
      logger.error('OAuth callback error:', error);
      res.redirect('/settings/connections?error=connection_failed');
    }
  }

  /**
   * Disconnect store
   * DELETE /api/store-connections/:storeId
   */
  static async disconnectStore(req, res, next) {
    try {
      const userId = req.user.id;
      const storeId = parseInt(req.params.storeId);

      await StoreConnectionService.disconnectStore(userId, storeId);

      logger.info(`Store disconnected: user ${userId} → store ${storeId}`);

      res.json({
        success: true,
        message: 'Store disconnected successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user's saved payment methods from a store
   * GET /api/store-connections/:storeId/payment-methods
   */
  static async getPaymentMethods(req, res, next) {
    try {
      const userId = req.user.id;
      const storeId = parseInt(req.params.storeId);

      const result = await pool.query(
        `SELECT * FROM user_saved_payment_methods
         WHERE user_id = $1 AND store_id = $2 AND is_active = true
         ORDER BY is_default DESC, created_at DESC`,
        [userId, storeId]
      );

      const paymentMethods = result.rows.map(pm => ({
        id: pm.id,
        retailerPaymentMethodId: pm.retailer_payment_method_id,
        brand: pm.card_brand,
        last4: pm.last4,
        expMonth: pm.exp_month,
        expYear: pm.exp_year,
        paymentType: pm.payment_type,
        isDefault: pm.is_default,
        nickname: pm.nickname,
      }));

      res.json({
        success: true,
        paymentMethods,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user's saved addresses from a store
   * GET /api/store-connections/:storeId/addresses
   */
  static async getAddresses(req, res, next) {
    try {
      const userId = req.user.id;
      const storeId = parseInt(req.params.storeId);

      const result = await pool.query(
        `SELECT * FROM user_saved_addresses
         WHERE user_id = $1 AND (store_id = $2 OR store_id IS NULL) AND is_active = true
         ORDER BY is_default DESC, created_at DESC`,
        [userId, storeId]
      );

      const addresses = result.rows.map(addr => ({
        id: addr.id,
        retailerAddressId: addr.retailer_address_id,
        name: addr.name,
        address1: addr.address1,
        address2: addr.address2,
        city: addr.city,
        state: addr.state,
        zip: addr.zip,
        country: addr.country,
        phone: addr.phone,
        isDefault: addr.is_default,
        nickname: addr.nickname,
      }));

      res.json({
        success: true,
        addresses,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Sync payment methods from retailer
   * POST /api/store-connections/:storeId/sync-payment-methods
   */
  static async syncPaymentMethodsEndpoint(req, res, next) {
    try {
      const userId = req.user.id;
      const storeId = parseInt(req.params.storeId);

      const accessToken = await StoreConnectionService.getAccessToken(userId, storeId);
      const apiClient = RetailerAPIFactory.getClient(storeId, { accessToken });

      await this.syncPaymentMethods(userId, storeId, apiClient);

      res.json({
        success: true,
        message: 'Payment methods synced successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Sync addresses from retailer
   * POST /api/store-connections/:storeId/sync-addresses
   */
  static async syncAddressesEndpoint(req, res, next) {
    try {
      const userId = req.user.id;
      const storeId = parseInt(req.params.storeId);

      const accessToken = await StoreConnectionService.getAccessToken(userId, storeId);
      const apiClient = RetailerAPIFactory.getClient(storeId, { accessToken });

      await this.syncAddresses(userId, storeId, apiClient);

      res.json({
        success: true,
        message: 'Addresses synced successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Sync payment methods from retailer to database
   */
  static async syncPaymentMethods(userId, storeId, apiClient) {
    try {
      const paymentMethods = await apiClient.getPaymentMethods();

      const connection = await StoreConnectionService.getConnection(userId, storeId);

      for (const pm of paymentMethods) {
        await pool.query(
          `INSERT INTO user_saved_payment_methods (
            user_id,
            store_id,
            user_store_connection_id,
            retailer_payment_method_id,
            card_brand,
            last4,
            exp_month,
            exp_year,
            payment_type,
            is_default
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          ON CONFLICT (user_id, store_id, retailer_payment_method_id)
          DO UPDATE SET
            card_brand = EXCLUDED.card_brand,
            last4 = EXCLUDED.last4,
            exp_month = EXCLUDED.exp_month,
            exp_year = EXCLUDED.exp_year,
            is_default = EXCLUDED.is_default,
            updated_at = CURRENT_TIMESTAMP`,
          [
            userId,
            storeId,
            connection.id,
            pm.id,
            pm.brand,
            pm.last4,
            pm.expMonth,
            pm.expYear,
            pm.type,
            pm.isDefault,
          ]
        );
      }

      logger.info(`Synced ${paymentMethods.length} payment methods for user ${userId}, store ${storeId}`);
    } catch (error) {
      logger.error('Error syncing payment methods:', error);
      throw error;
    }
  }

  /**
   * Sync addresses from retailer to database
   */
  static async syncAddresses(userId, storeId, apiClient) {
    try {
      const addresses = await apiClient.getShippingAddresses();

      const connection = await StoreConnectionService.getConnection(userId, storeId);

      for (const addr of addresses) {
        await pool.query(
          `INSERT INTO user_saved_addresses (
            user_id,
            store_id,
            user_store_connection_id,
            retailer_address_id,
            name,
            address1,
            address2,
            city,
            state,
            zip,
            country,
            phone,
            is_default
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          ON CONFLICT ON CONSTRAINT user_saved_addresses_pkey
          DO NOTHING`,
          [
            userId,
            storeId,
            connection.id,
            addr.id,
            addr.name,
            addr.address1,
            addr.address2,
            addr.city,
            addr.state,
            addr.zip,
            addr.country,
            addr.phone,
            addr.isDefault,
          ]
        );
      }

      logger.info(`Synced ${addresses.length} addresses for user ${userId}, store ${storeId}`);
    } catch (error) {
      logger.error('Error syncing addresses:', error);
      throw error;
    }
  }
}

module.exports = StoreConnectionController;
