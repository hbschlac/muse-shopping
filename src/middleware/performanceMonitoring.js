/**
 * Performance Monitoring Middleware
 * Tracks API response times and logs slow requests
 */

const logger = require('../utils/logger');
const AlertService = require('../services/alertService');

// Thresholds for slow request alerts (in milliseconds)
const SLOW_REQUEST_THRESHOLD = 2000; // 2 seconds
const CRITICAL_SLOW_THRESHOLD = 5000; // 5 seconds

// Track request counts for rate monitoring
const requestCounts = new Map();
const errorCounts = new Map();

const performanceMonitoring = (req, res, next) => {
  const startTime = Date.now();
  const originalSend = res.send;

  // Override res.send to capture when response is sent
  res.send = function (data) {
    const duration = Date.now() - startTime;
    const endpoint = `${req.method} ${req.route?.path || req.path}`;

    // Log request completion
    logger.info('Request completed', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      userId: req.userId,
    });

    // Track slow requests
    if (duration > SLOW_REQUEST_THRESHOLD) {
      const severity = duration > CRITICAL_SLOW_THRESHOLD ? 'critical' : 'warning';

      logger.warn('Slow request detected', {
        endpoint,
        duration,
        threshold: SLOW_REQUEST_THRESHOLD,
        statusCode: res.statusCode,
        userId: req.userId,
      });

      // Alert on critically slow requests
      if (duration > CRITICAL_SLOW_THRESHOLD) {
        AlertService.sendSlackAlert(
          severity,
          '🐌 Very Slow Request',
          `Request took ${(duration / 1000).toFixed(2)}s to complete`,
          {
            'Endpoint': endpoint,
            'Duration': `${(duration / 1000).toFixed(2)}s`,
            'Status': res.statusCode,
            'User ID': req.userId || 'anonymous',
          }
        ).catch(err => logger.error('Failed to send slow request alert:', err));
      }
    }

    // Track request counts
    incrementRequestCount(endpoint);

    // Track error counts
    if (res.statusCode >= 400) {
      incrementErrorCount(endpoint, res.statusCode);
    }

    // Call original send
    return originalSend.call(this, data);
  };

  next();
};

/**
 * Increment request count for endpoint
 * @param {string} endpoint - API endpoint
 */
function incrementRequestCount(endpoint) {
  const minute = getCurrentMinute();
  const key = `${endpoint}:${minute}`;

  if (!requestCounts.has(key)) {
    requestCounts.set(key, 0);
  }

  requestCounts.set(key, requestCounts.get(key) + 1);

  // Clean up old entries (older than 5 minutes)
  cleanupOldCounts(requestCounts);
}

/**
 * Increment error count for endpoint
 * @param {string} endpoint - API endpoint
 * @param {number} statusCode - HTTP status code
 */
function incrementErrorCount(endpoint, statusCode) {
  const minute = getCurrentMinute();
  const key = `${endpoint}:${statusCode}:${minute}`;

  if (!errorCounts.has(key)) {
    errorCounts.set(key, 0);
  }

  const count = errorCounts.get(key) + 1;
  errorCounts.set(key, count);

  // Alert on high error rate (>10 errors per minute for same endpoint)
  if (count === 10) {
    AlertService.alertHighErrorRate(
      `${endpoint} (${statusCode})`,
      count,
      1
    ).catch(err => logger.error('Failed to send high error rate alert:', err));
  }

  // Clean up old entries
  cleanupOldCounts(errorCounts);
}

/**
 * Get current minute timestamp (for grouping)
 * @returns {number} Minute timestamp
 */
function getCurrentMinute() {
  return Math.floor(Date.now() / 60000);
}

/**
 * Clean up old count entries
 * @param {Map} countsMap - Map to clean up
 */
function cleanupOldCounts(countsMap) {
  const currentMinute = getCurrentMinute();
  const fiveMinutesAgo = currentMinute - 5;

  for (const key of countsMap.keys()) {
    const minute = parseInt(key.split(':').pop());
    if (minute < fiveMinutesAgo) {
      countsMap.delete(key);
    }
  }
}

/**
 * Get request metrics
 * @returns {Object} Request metrics
 */
function getMetrics() {
  const currentMinute = getCurrentMinute();
  const metrics = {
    requestCounts: {},
    errorCounts: {},
  };

  // Aggregate request counts
  for (const [key, count] of requestCounts.entries()) {
    const [endpoint, minute] = key.split(':');
    if (!metrics.requestCounts[endpoint]) {
      metrics.requestCounts[endpoint] = 0;
    }
    metrics.requestCounts[endpoint] += count;
  }

  // Aggregate error counts
  for (const [key, count] of errorCounts.entries()) {
    const parts = key.split(':');
    const endpoint = parts[0];
    const statusCode = parts[1];
    const errorKey = `${endpoint} (${statusCode})`;

    if (!metrics.errorCounts[errorKey]) {
      metrics.errorCounts[errorKey] = 0;
    }
    metrics.errorCounts[errorKey] += count;
  }

  return metrics;
}

/**
 * Reset all metrics
 */
function resetMetrics() {
  requestCounts.clear();
  errorCounts.clear();
  logger.info('Performance metrics reset');
}

module.exports = performanceMonitoring;
module.exports.getMetrics = getMetrics;
module.exports.resetMetrics = resetMetrics;
