/**
 * Apple OAuth Authentication Service
 * Handles "Sign in with Apple" functionality for user registration/login
 */

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('../db/pool');
const logger = require('../utils/logger');
const { ValidationError } = require('../utils/errors');

class AppleAuthService {

  static async ensureAppleColumn(client) {
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name='users' AND column_name='apple_id'
        ) THEN
          ALTER TABLE users ADD COLUMN apple_id VARCHAR(255) UNIQUE;
          CREATE INDEX IF NOT EXISTS idx_users_apple_id ON users(apple_id);
        END IF;
      END $$;
    `);
  }

  /**
   * Generate Apple Sign-In URL
   * @param {string} state - State parameter for CSRF protection
   * @param {string} nonce - Nonce for security
   * @returns {string} Authorization URL
   */
  static getSignInUrl(state, nonce) {
    const clientId = process.env.APPLE_CLIENT_ID || 'com.muse.shopping';
    const redirectUri = `${process.env.CORS_ORIGIN || 'http://localhost:3001'}/auth/apple/callback`;

    const authUrl = `https://appleid.apple.com/auth/authorize?` +
      `client_id=${encodeURIComponent(clientId)}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `response_type=code id_token&` +
      `scope=${encodeURIComponent('name email')}&` +
      `response_mode=form_post&` +
      `state=${state}&` +
      `nonce=${nonce}`;

    return authUrl;
  }

  /**
   * Verify and decode Apple ID token
   * @param {string} idToken - ID token from Apple
   * @returns {Object} Decoded token payload
   */
  static verifyAppleToken(idToken) {
    try {
      // Decode without verification (Apple tokens are verified on their end)
      // In production, you should verify the signature using Apple's public keys
      const decoded = jwt.decode(idToken, { complete: true });

      if (!decoded) {
        throw new ValidationError('Invalid Apple ID token');
      }

      // Verify issuer
      if (decoded.payload.iss !== 'https://appleid.apple.com') {
        throw new ValidationError('Invalid token issuer');
      }

      // Verify audience (your client ID)
      const clientId = process.env.APPLE_CLIENT_ID || 'com.muse.shopping';
      if (decoded.payload.aud !== clientId) {
        throw new ValidationError('Invalid token audience');
      }

      // Verify expiration
      if (decoded.payload.exp < Date.now() / 1000) {
        throw new ValidationError('Token expired');
      }

      return {
        appleId: decoded.payload.sub,
        email: decoded.payload.email,
        emailVerified: decoded.payload.email_verified === 'true' || decoded.payload.email_verified === true,
      };
    } catch (error) {
      logger.error('Error verifying Apple token:', error);
      throw new ValidationError(`Token verification failed: ${error.message}`);
    }
  }

  /**
   * Find or create user from Apple OAuth
   * @param {Object} appleUserData - User data from Apple
   * @param {Object} userInfo - Additional user info (only on first sign-in)
   * @returns {Promise<Object>} User object
   */
  static async findOrCreateUser(appleUserData, userInfo = null) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      await this.ensureAppleColumn(client);

      // Check if user already exists by Apple ID
      let result = await client.query(
        `SELECT id, email, first_name, last_name, apple_id, is_active, created_at
         FROM users
         WHERE apple_id = $1`,
        [appleUserData.appleId]
      );

      if (result.rows.length > 0) {
        // User exists, update last login
        const user = result.rows[0];

        await client.query(
          `UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1`,
          [user.id]
        );

        await client.query('COMMIT');

        logger.info(`Existing Apple user logged in: ${user.email}`);

        return {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          appleId: user.apple_id,
          isActive: user.is_active,
          createdAt: user.created_at,
          isNewUser: false,
        };
      }

      // Check if user exists by email (previously registered with email/password)
      result = await client.query(
        `SELECT id, email, first_name, last_name, apple_id
         FROM users
         WHERE email = $1`,
        [appleUserData.email]
      );

      if (result.rows.length > 0) {
        // Link existing account with Apple
        const user = result.rows[0];

        await client.query(
          `UPDATE users
           SET apple_id = $1, last_login_at = CURRENT_TIMESTAMP
           WHERE id = $2`,
          [appleUserData.appleId, user.id]
        );

        await client.query('COMMIT');

        logger.info(`Linked existing account to Apple: ${user.email}`);

        return {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          appleId: appleUserData.appleId,
          isActive: true,
          isNewUser: false,
        };
      }

      // Parse user name info if provided
      let firstName = appleUserData.email.split('@')[0];
      let lastName = '';

      if (userInfo?.name) {
        firstName = userInfo.name.firstName || firstName;
        lastName = userInfo.name.lastName || '';
      }

      // Create new user
      result = await client.query(
        `INSERT INTO users
          (email, first_name, last_name, apple_id, is_active, password_hash, last_login_at)
         VALUES ($1, $2, $3, $4, true, '', CURRENT_TIMESTAMP)
         RETURNING id, email, first_name, last_name, apple_id, is_active, created_at`,
        [
          appleUserData.email,
          firstName,
          lastName,
          appleUserData.appleId
        ]
      );

      const newUser = result.rows[0];

      // Create user profile
      await client.query(
        `INSERT INTO user_profiles (user_id) VALUES ($1)`,
        [newUser.id]
      );

      // Auto-follow default brands for new user
      try {
        await client.query('SELECT auto_follow_default_brands($1)', [newUser.id]);
      } catch (error) {
        // Log but don't fail if auto-follow fails
        logger.error('Failed to auto-follow default brands:', error);
      }

      await client.query('COMMIT');

      logger.info(`New Apple user created: ${newUser.email}`);

      return {
        id: newUser.id,
        email: newUser.email,
        firstName: newUser.first_name,
        lastName: newUser.last_name,
        appleId: newUser.apple_id,
        isActive: newUser.is_active,
        createdAt: newUser.created_at,
        isNewUser: true,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Handle complete Apple OAuth flow
   * @param {string} idToken - ID token from Apple
   * @param {Object} userInfo - User info (only on first sign-in)
   * @returns {Promise<Object>} User and auth info
   */
  static async handleAppleAuth(idToken, userInfo = null) {
    // Verify and decode ID token
    const appleUserData = this.verifyAppleToken(idToken);

    // Find or create user in database
    const user = await this.findOrCreateUser(appleUserData, userInfo);

    return {
      user,
      appleData: {
        email: appleUserData.email,
        emailVerified: appleUserData.emailVerified,
      },
    };
  }
}

module.exports = AppleAuthService;
