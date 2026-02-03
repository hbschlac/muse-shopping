const jwt = require('jsonwebtoken');
const pool = require('../db/pool');
const logger = require('../utils/logger');
const { AuthenticationError } = require('../utils/errors');

const authMiddleware = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthenticationError('No token provided');
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach user ID to request
    req.userId = decoded.userId;

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      next(new AuthenticationError('Invalid token'));
    } else if (error.name === 'TokenExpiredError') {
      next(new AuthenticationError('Token expired'));
    } else {
      next(error);
    }
  }
};

/**
 * Optional auth middleware - attaches userId if token is present,
 * but doesn't fail if token is missing
 */
const optionalAuthMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.userId = decoded.userId;
    }

    // Continue regardless of whether token was present
    next();
  } catch (error) {
    // If token is invalid, just continue without userId
    // (Don't fail the request)
    next();
  }
};

/**
 * Admin auth middleware - requires valid token and admin role
 */
const requireAdmin = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthenticationError('No token provided');
    }

    const token = authHeader.substring(7);

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach user ID to request
    req.userId = decoded.userId;

    // Check if user has admin role
    const result = await pool.query(
      'SELECT id, email, role, account_locked FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      throw new AuthenticationError('User not found');
    }

    const user = result.rows[0];

    // Check if account is locked
    if (user.account_locked) {
      logger.warn(`Locked account attempted admin access: ${user.email}`);

      // Log security event
      await pool.query(
        `INSERT INTO security_events (event_type, severity, user_id, email, description)
         VALUES ($1, $2, $3, $4, $5)`,
        ['locked_account_access', 'warning', user.id, user.email, 'Locked account attempted admin access']
      ).catch(err => logger.error('Failed to log security event:', err));

      throw new AuthenticationError('Account is locked');
    }

    // Check if user is admin or super_admin
    if (!['admin', 'super_admin'].includes(user.role)) {
      logger.warn(`Non-admin user attempted admin access: ${user.email} (role: ${user.role})`);

      // Log security event
      await pool.query(
        `INSERT INTO security_events (event_type, severity, user_id, email, description)
         VALUES ($1, $2, $3, $4, $5)`,
        ['unauthorized_admin_access', 'warning', user.id, user.email, 'Attempted to access admin endpoint without admin role']
      ).catch(err => logger.error('Failed to log security event:', err));

      throw new AuthenticationError('Admin access required');
    }

    // Attach role to request for further checks
    req.userRole = user.role;

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      next(new AuthenticationError('Invalid token'));
    } else if (error.name === 'TokenExpiredError') {
      next(new AuthenticationError('Token expired'));
    } else {
      next(error);
    }
  }
};

module.exports = authMiddleware;
module.exports.optionalAuthMiddleware = optionalAuthMiddleware;
module.exports.requireAdmin = requireAdmin;
