/**
 * Security Middleware
 * Comprehensive security controls for API endpoints
 */

const pool = require('../db/pool');
const logger = require('../utils/logger');
const { AuthenticationError } = require('../utils/errors');

/**
 * Rate Limiting Middleware
 * Limits requests per time window
 */
class RateLimiter {
  constructor(options = {}) {
    this.windowMs = options.windowMs || 60000; // 1 minute default
    this.maxRequests = options.maxRequests || 100;
    this.identifierType = options.identifierType || 'user'; // 'user', 'ip', or 'both'
  }

  async middleware(req, res, next) {
    try {
      const identifier = this._getIdentifier(req);
      const endpoint = req.path;

      // Check rate limit
      const isAllowed = await this._checkRateLimit(identifier, endpoint);

      if (!isAllowed) {
        // Log rate limit violation
        await this._logSecurityEvent(req, 'rate_limit_exceeded', 'warning');

        return res.status(429).json({
          success: false,
          error: 'Too many requests. Please try again later.',
          retryAfter: Math.ceil(this.windowMs / 1000)
        });
      }

      // Increment counter
      await this._incrementCounter(identifier, endpoint);

      next();
    } catch (error) {
      logger.error('Rate limiter error:', error);
      // On error, allow the request but log it
      next();
    }
  }

  _getIdentifier(req) {
    if (this.identifierType === 'user' && req.userId) {
      return `user:${req.userId}`;
    } else if (this.identifierType === 'ip') {
      return `ip:${this._getClientIp(req)}`;
    } else {
      // Both: prefer user, fallback to IP
      return req.userId ? `user:${req.userId}` : `ip:${this._getClientIp(req)}`;
    }
  }

  _getClientIp(req) {
    return req.headers['x-forwarded-for']?.split(',')[0] ||
           req.headers['x-real-ip'] ||
           req.connection?.remoteAddress ||
           'unknown';
  }

  async _checkRateLimit(identifier, endpoint) {
    const windowStart = new Date(Date.now() - this.windowMs);

    const query = `
      SELECT requests_count, is_blocked, blocked_until
      FROM rate_limit_tracking
      WHERE identifier = $1
        AND endpoint = $2
        AND window_start >= $3
      ORDER BY window_start DESC
      LIMIT 1
    `;

    const result = await pool.query(query, [identifier, endpoint, windowStart]);

    if (result.rows.length === 0) {
      return true; // No records, allow request
    }

    const record = result.rows[0];

    // Check if blocked
    if (record.is_blocked && record.blocked_until && new Date(record.blocked_until) > new Date()) {
      return false;
    }

    // Check if exceeded limit
    if (record.requests_count >= this.maxRequests) {
      // Block for next window
      await pool.query(
        `UPDATE rate_limit_tracking
         SET is_blocked = true, blocked_until = $1
         WHERE identifier = $2 AND endpoint = $3`,
        [new Date(Date.now() + this.windowMs), identifier, endpoint]
      );
      return false;
    }

    return true;
  }

  async _incrementCounter(identifier, endpoint) {
    const windowStart = new Date(Date.now() - this.windowMs);

    const query = `
      INSERT INTO rate_limit_tracking (identifier, identifier_type, endpoint, requests_count, window_start)
      VALUES ($1, $2, $3, 1, CURRENT_TIMESTAMP)
      ON CONFLICT (identifier, endpoint, window_start)
      DO UPDATE SET
        requests_count = rate_limit_tracking.requests_count + 1,
        updated_at = CURRENT_TIMESTAMP
    `;

    await pool.query(query, [identifier, this.identifierType, endpoint]);
  }

  async _logSecurityEvent(req, eventType, severity) {
    const query = `
      INSERT INTO security_events (
        event_type, severity, user_id, ip_address, user_agent, description
      ) VALUES ($1, $2, $3, $4, $5, $6)
    `;

    await pool.query(query, [
      eventType,
      severity,
      req.userId || null,
      this._getClientIp(req),
      req.headers['user-agent'],
      `Rate limit exceeded for ${req.path}`
    ]);
  }
}

/**
 * Input Validation Middleware
 * Validates and sanitizes input
 */
const validateInput = (schema) => {
  return (req, res, next) => {
    const errors = [];

    // Validate required fields
    if (schema.required) {
      schema.required.forEach(field => {
        if (req.body[field] === undefined || req.body[field] === null || req.body[field] === '') {
          errors.push(`${field} is required`);
        }
      });
    }

    // Validate field types
    if (schema.fields) {
      Object.keys(schema.fields).forEach(field => {
        const value = req.body[field];
        const rules = schema.fields[field];

        if (value === undefined || value === null) {
          return; // Skip if not provided (required check handles this)
        }

        // Type validation
        if (rules.type) {
          const actualType = Array.isArray(value) ? 'array' : typeof value;
          if (actualType !== rules.type) {
            errors.push(`${field} must be of type ${rules.type}`);
          }
        }

        // String validations
        if (rules.type === 'string') {
          if (rules.minLength && value.length < rules.minLength) {
            errors.push(`${field} must be at least ${rules.minLength} characters`);
          }
          if (rules.maxLength && value.length > rules.maxLength) {
            errors.push(`${field} must be at most ${rules.maxLength} characters`);
          }
          if (rules.pattern && !rules.pattern.test(value)) {
            errors.push(`${field} has invalid format`);
          }
        }

        // Number validations
        if (rules.type === 'number') {
          if (rules.min !== undefined && value < rules.min) {
            errors.push(`${field} must be at least ${rules.min}`);
          }
          if (rules.max !== undefined && value > rules.max) {
            errors.push(`${field} must be at most ${rules.max}`);
          }
        }

        // Enum validation
        if (rules.enum && !rules.enum.includes(value)) {
          errors.push(`${field} must be one of: ${rules.enum.join(', ')}`);
        }
      });
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors
      });
    }

    next();
  };
};

/**
 * Sanitize input to prevent XSS and injection attacks
 */
const sanitizeInput = (req, res, next) => {
  const sanitize = (obj) => {
    if (typeof obj === 'string') {
      // Remove potentially dangerous characters
      return obj
        // Remove all HTML tags
        .replace(/<[^>]*>/g, '')
        // Remove event handlers
        .replace(/on\w+\s*=/gi, '')
        // Remove javascript: protocol
        .replace(/javascript:/gi, '')
        // Remove data: protocol (can be used for XSS)
        .replace(/data:text\/html/gi, '')
        .trim();
    } else if (Array.isArray(obj)) {
      return obj.map(sanitize);
    } else if (obj && typeof obj === 'object') {
      const sanitized = {};
      Object.keys(obj).forEach(key => {
        sanitized[key] = sanitize(obj[key]);
      });
      return sanitized;
    }
    return obj;
  };

  if (req.body) {
    req.body = sanitize(req.body);
  }
  if (req.query) {
    req.query = sanitize(req.query);
  }

  next();
};

/**
 * Audit logging middleware
 */
const auditLog = (action, resourceType) => {
  return async (req, res, next) => {
    const startTime = Date.now();

    // Capture the original send function
    const originalSend = res.send;

    // Override send to capture response
    res.send = function(data) {
      const duration = Date.now() - startTime;
      const status = res.statusCode < 400 ? 'success' : 'failure';

      // Log the audit entry (async, don't block response)
      logAuditEntry(req, action, resourceType, status, duration, data).catch(err => {
        logger.error('Failed to log audit entry:', err);
      });

      // Call original send
      originalSend.call(this, data);
    };

    next();
  };
};

async function logAuditEntry(req, action, resourceType, status, duration, responseData) {
  try {
    const query = `
      INSERT INTO audit_logs (
        user_id,
        session_id,
        ip_address,
        user_agent,
        action,
        resource_type,
        resource_id,
        description,
        metadata,
        status,
        severity
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `;

    const clientIp = req.headers['x-forwarded-for']?.split(',')[0] ||
                     req.headers['x-real-ip'] ||
                     req.connection?.remoteAddress;

    await pool.query(query, [
      req.userId || null,
      req.sessionId || null,
      clientIp,
      req.headers['user-agent'],
      action,
      resourceType,
      req.params.id || req.params.productId || req.params.sessionId || null,
      `${action} ${resourceType}`,
      JSON.stringify({
        path: req.path,
        method: req.method,
        duration_ms: duration,
        body_keys: Object.keys(req.body || {})
      }),
      status,
      status === 'failure' ? 'warning' : 'info'
    ]);
  } catch (error) {
    logger.error('Audit log error:', error);
  }
}

/**
 * Data access logging (for GDPR compliance)
 */
const logDataAccess = (dataType) => {
  return async (req, res, next) => {
    try {
      const query = `
        INSERT INTO data_access_logs (
          accessor_user_id,
          accessor_role,
          subject_user_id,
          data_type,
          access_type,
          ip_address,
          query_details
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `;

      const clientIp = req.headers['x-forwarded-for']?.split(',')[0] ||
                       req.headers['x-real-ip'] ||
                       req.connection?.remoteAddress;

      await pool.query(query, [
        req.userId || null,
        req.userRole || 'user',
        req.params.userId || req.userId,
        dataType,
        req.method === 'GET' ? 'read' : 'write',
        clientIp,
        JSON.stringify({ path: req.path, params: req.params, query: req.query })
      ]);
    } catch (error) {
      logger.error('Data access log error:', error);
    }

    next();
  };
};

/**
 * Require specific role
 */
const requireRole = (...allowedRoles) => {
  return async (req, res, next) => {
    try {
      if (!req.userId) {
        throw new AuthenticationError('Authentication required');
      }

      // Fetch user role
      const result = await pool.query(
        'SELECT role, account_locked FROM users WHERE id = $1',
        [req.userId]
      );

      if (result.rows.length === 0) {
        throw new AuthenticationError('User not found');
      }

      const user = result.rows[0];

      // Check if account is locked
      if (user.account_locked) {
        await logSecurityEvent(req, 'locked_account_access_attempt', 'warning');
        return res.status(403).json({
          success: false,
          error: 'Account is locked. Please contact support.'
        });
      }

      // Check role
      if (!allowedRoles.includes(user.role)) {
        await logSecurityEvent(req, 'unauthorized_role_access', 'warning');
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions'
        });
      }

      // Attach role to request
      req.userRole = user.role;
      next();
    } catch (error) {
      next(error);
    }
  };
};

async function logSecurityEvent(req, eventType, severity) {
  try {
    const query = `
      INSERT INTO security_events (
        event_type, severity, user_id, ip_address, user_agent, description
      ) VALUES ($1, $2, $3, $4, $5, $6)
    `;

    const clientIp = req.headers['x-forwarded-for']?.split(',')[0] ||
                     req.headers['x-real-ip'] ||
                     req.connection?.remoteAddress;

    await pool.query(query, [
      eventType,
      severity,
      req.userId || null,
      clientIp,
      req.headers['user-agent'],
      `${eventType} from ${req.path}`
    ]);
  } catch (error) {
    logger.error('Security event log error:', error);
  }
}

/**
 * CORS security headers
 */
const securityHeaders = (req, res, next) => {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');

  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Enable XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Content Security Policy
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';"
  );

  next();
};

module.exports = {
  RateLimiter,
  validateInput,
  sanitizeInput,
  auditLog,
  logDataAccess,
  requireRole,
  securityHeaders
};
