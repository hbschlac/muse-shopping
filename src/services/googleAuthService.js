/**
 * Google OAuth Authentication Service
 * Handles "Sign in with Google" functionality for user registration/login
 */

const { google } = require('googleapis');
const pool = require('../db/pool');
const { encrypt } = require('../utils/encryption');
const logger = require('../utils/logger');
const { ValidationError } = require('../utils/errors');

// Google OAuth Scopes for user auth (not Gmail scanning)
const USER_AUTH_SCOPES = [
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
  'openid',
];

class GoogleAuthService {
  /**
   * Create OAuth2 client for user authentication
   * @returns {OAuth2Client} Configured OAuth2 client
   */
  static createUserAuthClient() {
    return new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.CORS_ORIGIN || 'http://localhost:3001'}/auth/google/callback`
    );
  }

  /**
   * Generate Google Sign-In URL
   * @param {string} state - State parameter for CSRF protection
   * @returns {string} Authorization URL
   */
  static getSignInUrl(state) {
    const oauth2Client = this.createUserAuthClient();

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: USER_AUTH_SCOPES,
      prompt: 'select_account', // Let user choose account
      state: state || 'web_auth',
    });

    return authUrl;
  }

  /**
   * Exchange authorization code for user info and tokens
   * @param {string} code - Authorization code from OAuth callback
   * @returns {Promise<Object>} User info and tokens
   */
  static async getUserFromCode(code) {
    if (!code) {
      throw new ValidationError('Authorization code is required');
    }

    try {
      const oauth2Client = this.createUserAuthClient();

      // Exchange code for tokens
      const { tokens } = await oauth2Client.getToken(code);

      // Set credentials
      oauth2Client.setCredentials(tokens);

      // Get user info
      const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
      const userInfo = await oauth2.userinfo.get();

      return {
        googleId: userInfo.data.id,
        email: userInfo.data.email,
        firstName: userInfo.data.given_name,
        lastName: userInfo.data.family_name,
        profilePicture: userInfo.data.picture,
        emailVerified: userInfo.data.verified_email,
        tokens: {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          expiresAt: new Date(tokens.expiry_date),
        },
      };
    } catch (error) {
      logger.error('Error getting user from Google code:', error);

      if (error.message?.includes('invalid_grant')) {
        throw new ValidationError('Invalid or expired authorization code');
      }

      throw error;
    }
  }

  /**
   * Find or create user from Google OAuth
   * @param {Object} googleUserData - User data from Google
   * @returns {Promise<Object>} User object
   */
  static async findOrCreateUser(googleUserData) {
    // Check if user already exists by Google ID
    let result = await pool.query(
      `SELECT id, email, first_name, last_name, google_id, is_active, created_at
       FROM users
       WHERE google_id = $1`,
      [googleUserData.googleId]
    );

    if (result.rows.length > 0) {
      // User exists, update last login
      const user = result.rows[0];

      await pool.query(
        `UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [user.id]
      );

      logger.info(`Existing Google user logged in: ${user.email}`);

      return {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        googleId: user.google_id,
        isActive: user.is_active,
        createdAt: user.created_at,
        isNewUser: false,
      };
    }

    // Check if user exists by email (previously registered with email/password)
    result = await pool.query(
      `SELECT id, email, first_name, last_name, google_id
       FROM users
       WHERE email = $1`,
      [googleUserData.email]
    );

    if (result.rows.length > 0) {
      // Link existing account with Google
      const user = result.rows[0];

      await pool.query(
        `UPDATE users
         SET google_id = $1, last_login_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [googleUserData.googleId, user.id]
      );

      logger.info(`Linked existing account to Google: ${user.email}`);

      return {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        googleId: googleUserData.googleId,
        isActive: true,
        isNewUser: false,
      };
    }

    // Create new user
    result = await pool.query(
      `INSERT INTO users
        (email, first_name, last_name, google_id, email_verified, is_active, last_login_at)
       VALUES ($1, $2, $3, $4, $5, true, CURRENT_TIMESTAMP)
       RETURNING id, email, first_name, last_name, google_id, is_active, created_at`,
      [
        googleUserData.email,
        googleUserData.firstName || '',
        googleUserData.lastName || '',
        googleUserData.googleId,
        googleUserData.emailVerified || false,
      ]
    );

    const newUser = result.rows[0];

    // Auto-follow default brands for new user
    await pool.query(
      `INSERT INTO user_brand_follows (user_id, brand_id, is_default)
       SELECT $1, brand_id, true
       FROM default_brands
       WHERE is_active = true`,
      [newUser.id]
    );

    logger.info(`New Google user created: ${newUser.email}`);

    return {
      id: newUser.id,
      email: newUser.email,
      firstName: newUser.first_name,
      lastName: newUser.last_name,
      googleId: newUser.google_id,
      isActive: newUser.is_active,
      createdAt: newUser.created_at,
      isNewUser: true,
    };
  }

  /**
   * Handle complete Google OAuth flow
   * @param {string} code - Authorization code
   * @returns {Promise<Object>} User and auth info
   */
  static async handleGoogleAuth(code) {
    // Get user info from Google
    const googleUserData = await this.getUserFromCode(code);

    // Find or create user in database
    const user = await this.findOrCreateUser(googleUserData);

    return {
      user,
      googleData: {
        email: googleUserData.email,
        emailVerified: googleUserData.emailVerified,
        profilePicture: googleUserData.profilePicture,
      },
    };
  }
}

module.exports = GoogleAuthService;
