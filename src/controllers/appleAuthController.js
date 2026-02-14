/**
 * Apple OAuth Controller
 * Handles "Sign in with Apple" endpoints
 */

const AppleAuthService = require('../services/appleAuthService');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const logger = require('../utils/logger');
const { successResponse } = require('../utils/responseFormatter');

class AppleAuthController {
  static stateStore = new Map();

  static _rememberState(state) {
    const expiresAt = Date.now() + 10 * 60 * 1000;
    this.stateStore.set(state, expiresAt);
  }

  static _consumeState(state) {
    const expiresAt = this.stateStore.get(state);
    if (!expiresAt) return false;
    this.stateStore.delete(state);
    return expiresAt > Date.now();
  }

  static async initiateAppleAuth(req, res, next) {
    try {
      const state = crypto.randomBytes(32).toString('hex');
      const nonce = crypto.randomBytes(32).toString('hex');

      AppleAuthController._rememberState(state);
      const authUrl = AppleAuthService.getSignInUrl(state, nonce);

      res.status(200).json({ authUrl, state, nonce });
    } catch (error) {
      next(error);
    }
  }

  static async handleAppleCallback(req, res, next) {
    try {
      const { code, id_token, state, user: userInfo } = req.body;

      if (!code || !id_token || !state) {
        return res.status(400).json({
          success: false,
          error: 'Missing required parameters: code, id_token, and state are required',
        });
      }

      if (!AppleAuthController._consumeState(state)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid state parameter',
        });
      }

      let parsedUserInfo = null;
      if (userInfo) {
        try {
          parsedUserInfo = typeof userInfo === 'string' ? JSON.parse(userInfo) : userInfo;
        } catch (e) {
          logger.error('Failed to parse Apple user info:', e);
        }
      }

      const { user } = await AppleAuthService.handleAppleAuth(id_token, parsedUserInfo);

      // Generate JWT tokens using AuthService (consistent with Google OAuth)
      const AuthService = require('../services/authService');
      const tokens = await AuthService.generateTokens(user.id);

      // Determine onboarding status
      const onboardingCompleted = !user.isNewUser;

      logger.info(
        `Apple auth for user ${user.id} (${user.email}) - isNewUser: ${user.isNewUser}, onboarding_completed: ${onboardingCompleted}`
      );

      // Return user data and tokens (consistent with Google OAuth)
      res.status(200).json(
        successResponse(
          {
            user: {
              id: user.id,
              email: user.email,
              username: null,
              full_name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || null,
              is_verified: true,
              onboarding_completed: onboardingCompleted,
            },
            tokens,
          },
          user.isNewUser ? 'Account created successfully' : 'Login successful'
        )
      );

      logger.info(
        `Apple auth successful for user ${user.id} (${user.email})${user.isNewUser ? ' - NEW USER' : ' - EXISTING USER'}`
      );
    } catch (error) {
      logger.error('Error in Apple auth callback:', error);
      next(error);
    }
  }
}

module.exports = AppleAuthController;
