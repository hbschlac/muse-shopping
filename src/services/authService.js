const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const pool = require('../db/pool');
const { sendPasswordResetEmail } = require('./emailService');
const { ValidationError, AuthenticationError, ConflictError, NotFoundError } = require('../utils/errors');

class AuthService {
  static async registerUser({ email, password, full_name, username = null, age, location_city, location_state, location_country }) {
    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      throw new ConflictError('Email already registered');
    }

    if (username) {
      const existingUsername = await User.findByUsername(username);
      if (existingUsername) {
        throw new ConflictError('Username already taken');
      }
    }

    // Hash password
    const bcryptRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    const password_hash = await bcrypt.hash(password, bcryptRounds);

    // Create user
    const user = await User.create({
      email,
      password_hash,
      username,
      full_name,
    });

    // Create user profile with optional onboarding fields
    const profileData = {
      user_id: user.id,
    };

    // Add optional fields if provided
    if (age !== undefined) profileData.age = age;
    if (location_city !== undefined) profileData.location_city = location_city;
    if (location_state !== undefined) profileData.location_state = location_state;
    if (location_country !== undefined) profileData.location_country = location_country;

    await User.createProfile(user.id, profileData);

    // Initialize personalization records immediately at registration
    await pool.query(
      `INSERT INTO user_fashion_preferences (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`,
      [user.id]
    );

    // Seed a baseline shopper profile so personalization does not start as null
    await pool.query(
      `INSERT INTO shopper_profiles (user_id, favorite_categories, common_sizes, price_range, interests)
       VALUES ($1, '{}'::jsonb, '[]'::jsonb, '{"min":0,"max":999999,"avg":0}'::jsonb, '[]'::jsonb)
       ON CONFLICT (user_id) DO NOTHING`,
      [user.id]
    );

    // Auto-follow default brands for new user
    try {
      await pool.query('SELECT auto_follow_default_brands($1)', [user.id]);
    } catch (error) {
      // Log but don't fail registration if default follows fail
      console.error('Failed to auto-follow default brands:', error);
    }

    // Generate tokens
    const tokens = await this.generateTokens(user.id);

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        full_name: user.full_name,
        is_verified: user.is_verified,
      },
      tokens,
    };
  }

  static async loginUser({ email, password }) {
    // Find user by email
    const user = await User.findByEmail(email);
    if (!user) {
      throw new AuthenticationError('Invalid email or password');
    }

    // Check if account is active
    if (!user.is_active) {
      throw new AuthenticationError('Account is deactivated');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      throw new AuthenticationError('Invalid email or password');
    }

    // Update last login
    await User.updateLastLogin(user.id);

    // Generate tokens
    const tokens = await this.generateTokens(user.id);

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        full_name: user.full_name,
        is_verified: user.is_verified,
      },
      tokens,
    };
  }

  static async refreshToken(refreshToken) {
    try {
      // Verify refresh token
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

      // Check if token exists in database and is not revoked
      const result = await pool.query(
        'SELECT * FROM refresh_tokens WHERE token_hash = $1 AND user_id = $2 AND is_revoked = FALSE AND expires_at > NOW()',
        [this.hashToken(refreshToken), decoded.userId]
      );

      if (result.rows.length === 0) {
        throw new AuthenticationError('Invalid or expired refresh token');
      }

      // Generate new tokens
      const tokens = await this.generateTokens(decoded.userId);

      // Revoke old refresh token
      await this.revokeToken(refreshToken);

      return tokens;
    } catch (error) {
      if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
        throw new AuthenticationError('Invalid or expired refresh token');
      }
      throw error;
    }
  }

  static async logout(refreshToken) {
    await this.revokeToken(refreshToken);
  }

  static async generateTokens(userId) {
    // Generate access token (short-lived)
    const accessToken = jwt.sign(
      { userId },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRATION || '1h' }
    );

    // Generate refresh token (long-lived)
    const refreshToken = jwt.sign(
      { userId },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRATION || '7d' }
    );

    // Store refresh token in database
    const decoded = jwt.decode(refreshToken);
    const expiresAt = new Date(decoded.exp * 1000);
    const tokenHash = this.hashToken(refreshToken);

    await pool.query(
      'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
      [userId, tokenHash, expiresAt]
    );

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: 3600, // 1 hour in seconds
    };
  }

  static async revokeToken(refreshToken) {
    const tokenHash = this.hashToken(refreshToken);
    await pool.query(
      'UPDATE refresh_tokens SET is_revoked = TRUE, revoked_at = NOW() WHERE token_hash = $1',
      [tokenHash]
    );
  }

  static hashToken(token) {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  static async changePassword(userId, currentPassword, newPassword) {
    // Get user
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User');
    }

    // Get password hash
    const result = await pool.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [userId]
    );
    const { password_hash } = result.rows[0];

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, password_hash);
    if (!isPasswordValid) {
      throw new AuthenticationError('Current password is incorrect');
    }

    // Hash new password
    const bcryptRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    const newPasswordHash = await bcrypt.hash(newPassword, bcryptRounds);

    // Update password
    await User.updatePassword(userId, newPasswordHash);
  }

  static async requestPasswordReset(email) {
    // Find user by email (but don't reveal if user exists for security)
    const user = await User.findByEmail(email);
    if (!user) {
      // Return success anyway to prevent email enumeration
      return;
    }

    // Generate secure random token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(resetToken);

    // Token expires in 1 hour
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    // Store token in database
    await pool.query(
      'INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
      [user.id, tokenHash, expiresAt]
    );

    // Send email with reset link
    try {
      await sendPasswordResetEmail(user.email, resetToken, user.full_name || user.username);
    } catch (error) {
      console.error('Failed to send password reset email:', error);
      // Don't throw error to prevent revealing if user exists
    }
  }

  static async verifyResetToken(token) {
    if (!token) {
      return false;
    }

    const tokenHash = this.hashToken(token);

    // Check if token exists, is not used, and is not expired
    const result = await pool.query(
      'SELECT * FROM password_reset_tokens WHERE token_hash = $1 AND is_used = FALSE AND expires_at > NOW()',
      [tokenHash]
    );

    return result.rows.length > 0;
  }

  static async resetPassword(token, newPassword) {
    if (!token) {
      throw new ValidationError('Reset token is required');
    }

    const tokenHash = this.hashToken(token);

    // Get token record
    const result = await pool.query(
      'SELECT * FROM password_reset_tokens WHERE token_hash = $1 AND is_used = FALSE AND expires_at > NOW()',
      [tokenHash]
    );

    if (result.rows.length === 0) {
      throw new ValidationError('Invalid or expired reset token');
    }

    const tokenRecord = result.rows[0];

    // Hash new password
    const bcryptRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    const newPasswordHash = await bcrypt.hash(newPassword, bcryptRounds);

    // Update password
    await User.updatePassword(tokenRecord.user_id, newPasswordHash);

    // Mark token as used
    await pool.query(
      'UPDATE password_reset_tokens SET is_used = TRUE, used_at = NOW() WHERE id = $1',
      [tokenRecord.id]
    );
  }
}

module.exports = AuthService;
