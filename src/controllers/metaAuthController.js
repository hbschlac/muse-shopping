/**
 * Meta (Instagram/Facebook) OAuth Controller
 * Handles social media connection endpoints
 */

const MetaAuthService = require('../services/metaAuthService');
const { successResponse } = require('../utils/responseFormatter');
const logger = require('../utils/logger');

class MetaAuthController {
  /**
   * Initiate Instagram connection flow
   * @route   GET /api/v1/social/instagram/connect
   * @access  Private (requires authentication)
   */
  static async initiateInstagramAuth(req, res, next) {
    try {
      const userId = req.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      // Generate state for CSRF protection
      const state = `instagram_${userId}_${Date.now()}`;

      // Get Instagram auth URL
      const authUrl = MetaAuthService.getInstagramAuthUrl(userId, state);

      res.status(200).json(
        successResponse(
          { authUrl, state, provider: 'instagram' },
          'Visit the authorization URL to connect your Instagram account'
        )
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Initiate Facebook connection flow
   * @route   GET /api/v1/social/facebook/connect
   * @access  Private (requires authentication)
   */
  static async initiateFacebookAuth(req, res, next) {
    try {
      const userId = req.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      // Generate state for CSRF protection
      const state = `facebook_${userId}_${Date.now()}`;

      // Get Facebook auth URL
      const authUrl = MetaAuthService.getFacebookAuthUrl(userId, state);

      res.status(200).json(
        successResponse(
          { authUrl, state, provider: 'facebook' },
          'Visit the authorization URL to connect your Facebook account'
        )
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Handle Meta OAuth callback (Instagram & Facebook)
   * @route   GET /api/v1/social/meta/callback
   * @access  Public (called by Meta)
   */
  static async handleMetaCallback(req, res, next) {
    try {
      const { code, state, error, error_description } = req.query;

      // Handle OAuth errors
      if (error) {
        logger.error('Meta OAuth error:', error, error_description);

        return res.status(400).send(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Connection Error - Muse</title>
              <style>
                body {
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                  padding: 40px;
                  text-align: center;
                  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                  min-height: 100vh;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                }
                .card {
                  background: white;
                  padding: 40px;
                  border-radius: 16px;
                  box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                  max-width: 500px;
                }
                .error-icon { color: #d32f2f; font-size: 64px; margin: 20px 0; }
                .error-title { font-size: 24px; font-weight: bold; color: #333; margin: 20px 0; }
                .error-message { color: #666; margin: 20px 0; }
                .btn {
                  display: inline-block;
                  background: #667eea;
                  color: white;
                  padding: 12px 24px;
                  border-radius: 8px;
                  text-decoration: none;
                  margin-top: 20px;
                }
              </style>
            </head>
            <body>
              <div class="card">
                <div class="error-icon">❌</div>
                <div class="error-title">Connection Failed</div>
                <p class="error-message">${error_description || 'Failed to connect social account'}</p>
                <a href="${process.env.CORS_ORIGIN || 'http://localhost:3001'}/settings/connections" class="btn">
                  Back to Settings
                </a>
              </div>
            </body>
          </html>
        `);
      }

      if (!code || !state) {
        return res.status(400).send(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Connection Error - Muse</title>
              <style>
                body {
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                  padding: 40px;
                  text-align: center;
                  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                  min-height: 100vh;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                }
                .card {
                  background: white;
                  padding: 40px;
                  border-radius: 16px;
                  box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                  max-width: 500px;
                }
                .error-icon { color: #d32f2f; font-size: 64px; margin: 20px 0; }
                .error-message { color: #666; margin: 20px 0; }
                .btn {
                  display: inline-block;
                  background: #667eea;
                  color: white;
                  padding: 12px 24px;
                  border-radius: 8px;
                  text-decoration: none;
                  margin-top: 20px;
                }
              </style>
            </head>
            <body>
              <div class="card">
                <div class="error-icon">❌</div>
                <p class="error-message">Missing authorization code or state parameter</p>
                <a href="${process.env.CORS_ORIGIN || 'http://localhost:3001'}/settings/connections" class="btn">
                  Back to Settings
                </a>
              </div>
            </body>
          </html>
        `);
      }

      // Extract userId and provider from state
      const stateParts = state.split('_');
      const provider = stateParts[0]; // 'instagram' or 'facebook'
      const userId = parseInt(stateParts[1]);

      if (!userId || isNaN(userId)) {
        throw new Error('Invalid state parameter - could not extract user ID');
      }

      // Handle auth based on provider
      let result;
      if (provider === 'instagram') {
        result = await MetaAuthService.handleInstagramAuth(userId, code);
      } else if (provider === 'facebook') {
        result = await MetaAuthService.handleFacebookAuth(userId, code);
      } else {
        throw new Error(`Unknown provider: ${provider}`);
      }

      const { connection, accountInfo } = result;

      // Return success page with auto-redirect
      const providerName = provider === 'instagram' ? 'Instagram' : 'Facebook';
      const providerColor = provider === 'instagram'
        ? 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)'
        : '#1877f2';

      res.status(200).send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>${providerName} Connected - Muse</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                padding: 40px;
                text-align: center;
                background: ${providerColor};
                color: white;
                min-height: 100vh;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
              }
              .card {
                background: white;
                color: #333;
                padding: 40px;
                border-radius: 16px;
                box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                max-width: 450px;
              }
              .success-icon { font-size: 72px; margin: 20px 0; }
              .profile-pic {
                width: 100px;
                height: 100px;
                border-radius: 50%;
                margin: 20px auto;
                border: 4px solid ${provider === 'instagram' ? '#e1306c' : '#1877f2'};
              }
              .username {
                font-size: 24px;
                font-weight: bold;
                margin: 10px 0;
                color: #333;
              }
              .display-name {
                font-size: 16px;
                color: #666;
                margin: 5px 0;
              }
              .message {
                color: #666;
                margin: 20px 0;
                line-height: 1.6;
              }
              .stats {
                display: flex;
                justify-content: space-around;
                margin: 20px 0;
                padding: 20px;
                background: #f5f5f5;
                border-radius: 8px;
              }
              .stat {
                text-align: center;
              }
              .stat-value {
                font-size: 24px;
                font-weight: bold;
                color: ${provider === 'instagram' ? '#e1306c' : '#1877f2'};
              }
              .stat-label {
                font-size: 12px;
                color: #999;
                text-transform: uppercase;
              }
            </style>
            <script>
              // Redirect to settings page
              setTimeout(() => {
                window.location.href = '${process.env.CORS_ORIGIN || 'http://localhost:3001'}/settings/connections';
              }, 3000);
            </script>
          </head>
          <body>
            <div class="card">
              <div class="success-icon">✓</div>
              <div class="username">@${accountInfo.username || accountInfo.displayName}</div>
              ${accountInfo.displayName && accountInfo.username ? `<div class="display-name">${accountInfo.displayName}</div>` : ''}
              ${accountInfo.profilePictureUrl ? `<img src="${accountInfo.profilePictureUrl}" class="profile-pic" alt="Profile" />` : ''}
              <p class="message">
                Your ${providerName} account has been successfully connected to Muse!
              </p>
              ${provider === 'instagram' && accountInfo.followersCount ? `
                <div class="stats">
                  <div class="stat">
                    <div class="stat-value">${accountInfo.followersCount.toLocaleString()}</div>
                    <div class="stat-label">Followers</div>
                  </div>
                  <div class="stat">
                    <div class="stat-value">${accountInfo.mediaCount || 0}</div>
                    <div class="stat-label">Posts</div>
                  </div>
                </div>
              ` : ''}
              <p style="color: #999; font-size: 14px; margin-top: 30px;">Redirecting to settings...</p>
            </div>
          </body>
        </html>
      `);

      logger.info(
        `${providerName} connected for user ${userId} (@${accountInfo.username || accountInfo.displayName})`
      );
    } catch (error) {
      logger.error('Error in Meta auth callback:', error);

      res.status(500).send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Connection Error - Muse</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                padding: 40px;
                text-align: center;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
              }
              .card {
                background: white;
                padding: 40px;
                border-radius: 16px;
                box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                max-width: 500px;
              }
              .error-icon { color: #d32f2f; font-size: 64px; margin: 20px 0; }
              .error-title { font-size: 24px; font-weight: bold; color: #333; margin: 20px 0; }
              .error-message { color: #666; margin: 20px 0; line-height: 1.6; }
              .btn {
                display: inline-block;
                background: #667eea;
                color: white;
                padding: 12px 24px;
                border-radius: 8px;
                text-decoration: none;
                margin-top: 20px;
              }
            </style>
          </head>
          <body>
            <div class="card">
              <div class="error-icon">❌</div>
              <div class="error-title">Connection Failed</div>
              <p class="error-message">${error.message}</p>
              ${error.message.includes('Instagram Business') ? `
                <p style="color: #999; font-size: 14px; margin-top: 20px;">
                  💡 Tip: Make sure your Instagram account is set to Business or Creator mode
                  and linked to a Facebook Page.
                </p>
              ` : ''}
              <a href="${process.env.CORS_ORIGIN || 'http://localhost:3001'}/settings/connections" class="btn">
                Back to Settings
              </a>
            </div>
          </body>
        </html>
      `);
    }
  }

  /**
   * Get user's social connections
   * @route   GET /api/v1/social/connections
   * @access  Private (requires authentication)
   */
  static async getUserConnections(req, res, next) {
    try {
      const userId = req.userId;
      const { provider } = req.query;

      const connections = await MetaAuthService.getUserConnections(userId, provider);

      res.json(
        successResponse(
          { connections, count: connections.length },
          'Social connections retrieved successfully'
        )
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Disconnect social account
   * @route   DELETE /api/v1/social/:provider/disconnect
   * @access  Private (requires authentication)
   */
  static async disconnectAccount(req, res, next) {
    try {
      const userId = req.userId;
      const { provider } = req.params;

      if (!['instagram', 'facebook'].includes(provider)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid provider. Must be instagram or facebook'
        });
      }

      await MetaAuthService.disconnectAccount(userId, provider);

      res.json(
        successResponse(
          { provider, disconnected: true },
          `${provider.charAt(0).toUpperCase() + provider.slice(1)} account disconnected successfully`
        )
      );
    } catch (error) {
      next(error);
    }
  }
}

module.exports = MetaAuthController;
