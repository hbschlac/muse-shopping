/**
 * Google OAuth Controller
 * Handles "Sign in with Google" endpoints
 */

const GoogleAuthService = require('../services/googleAuthService');
const jwt = require('jsonwebtoken');
const { successResponse } = require('../utils/responseFormatter');
const logger = require('../utils/logger');

class GoogleAuthController {
  /**
   * Initiate Google Sign-In flow
   * @route   GET /api/v1/auth/google
   * @access  Public
   */
  static async initiateGoogleAuth(req, res, next) {
    try {
      // Generate state for CSRF protection
      const state = `web_auth_${Date.now()}`;

      // Get Google Sign-In URL
      const authUrl = GoogleAuthService.getSignInUrl(state);

      res.status(200).json(
        successResponse(
          { authUrl, state },
          'Visit the authorization URL to sign in with Google'
        )
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Handle Google OAuth callback
   * @route   GET /api/v1/auth/google/callback
   * @access  Public (called by Google)
   */
  static async handleGoogleCallback(req, res, next) {
    try {
      const { code, state } = req.query;

      if (!code) {
        return res.status(400).send(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Authentication Error - Muse</title>
              <style>
                body { font-family: Arial, sans-serif; padding: 40px; text-align: center; }
                .error { color: #d32f2f; margin: 20px 0; }
              </style>
            </head>
            <body>
              <h1>❌ Authentication Error</h1>
              <p class="error">No authorization code provided</p>
              <p>Please try signing in again.</p>
              <a href="${process.env.CORS_ORIGIN || 'http://localhost:3001'}/login">Return to Login</a>
            </body>
          </html>
        `);
      }

      // Handle Google auth
      const { user, googleData } = await GoogleAuthService.handleGoogleAuth(code);

      // Generate JWT tokens
      const token = jwt.sign(
        { userId: user.id },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRATION || '1h' }
      );

      const refreshToken = jwt.sign(
        { userId: user.id },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: process.env.JWT_REFRESH_EXPIRATION || '7d' }
      );

      // Return success page with auto-redirect
      res.status(200).send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Sign In Successful - Muse</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                padding: 40px;
                text-align: center;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
                border-radius: 12px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.2);
                max-width: 400px;
              }
              .success { color: #4caf50; margin: 20px 0; font-size: 48px; }
              .profile-pic {
                width: 80px;
                height: 80px;
                border-radius: 50%;
                margin: 20px auto;
              }
              .welcome { font-size: 24px; font-weight: bold; margin: 10px 0; }
              .message { color: #666; margin: 10px 0; }
            </style>
            <script>
              // Store tokens in localStorage
              localStorage.setItem('token', '${token}');
              localStorage.setItem('refreshToken', '${refreshToken}');
              localStorage.setItem('user', JSON.stringify({
                id: ${user.id},
                email: '${user.email}',
                firstName: '${user.firstName}',
                lastName: '${user.lastName}',
                isNewUser: ${user.isNewUser}
              }));

              // Redirect to app
              setTimeout(() => {
                window.location.href = '${process.env.CORS_ORIGIN || 'http://localhost:3001'}${user.isNewUser ? '/onboarding' : '/feed'}';
              }, 2000);
            </script>
          </head>
          <body>
            <div class="card">
              <div class="success">✓</div>
              <div class="welcome">Welcome${user.firstName ? `, ${user.firstName}` : ''}!</div>
              ${googleData.profilePicture ? `<img src="${googleData.profilePicture}" class="profile-pic" alt="Profile" />` : ''}
              <p class="message">${user.isNewUser ? 'Account created successfully!' : 'Signed in successfully!'}</p>
              <p style="color: #999; font-size: 14px;">Redirecting to Muse...</p>
            </div>
          </body>
        </html>
      `);

      logger.info(
        `Google auth successful for user ${user.id} (${user.email})${user.isNewUser ? ' - NEW USER' : ''}`
      );
    } catch (error) {
      logger.error('Error in Google auth callback:', error);

      res.status(500).send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Authentication Error - Muse</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 40px; text-align: center; }
              .error { color: #d32f2f; margin: 20px 0; }
            </style>
          </head>
          <body>
            <h1>❌ Authentication Error</h1>
            <p class="error">Failed to sign in with Google</p>
            <p>${error.message}</p>
            <a href="${process.env.CORS_ORIGIN || 'http://localhost:3001'}/login">Return to Login</a>
          </body>
        </html>
      `);
    }
  }
}

module.exports = GoogleAuthController;
