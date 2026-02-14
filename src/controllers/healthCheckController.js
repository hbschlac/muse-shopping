/**
 * Health Check Controller
 * Provides liveness and readiness endpoints for monitoring
 */

const pool = require('../db/pool');
const StripeService = require('../services/stripeService');
const { CircuitBreakerManager } = require('../utils/circuitBreaker');
const logger = require('../utils/logger');
const performanceMonitoring = require('../middleware/performanceMonitoring');

class HealthCheckController {
  /**
   * Liveness check - Is the server alive?
   * GET /api/v1/health
   */
  static async liveness(req, res) {
    res.status(200).json({
      success: true,
      data: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
      },
    });
  }

  /**
   * Readiness check - Can the server handle requests?
   * GET /api/v1/health/ready
   */
  static async readiness(req, res) {
    const checks = {
      database: false,
      stripe: false,
      memory: false,
    };

    const startTime = Date.now();
    let overallReady = true;

    // Check database connection
    try {
      await pool.query('SELECT 1');
      checks.database = true;
    } catch (error) {
      checks.database = false;
      overallReady = false;
      logger.error('Database health check failed:', error);
    }

    // Check Stripe API
    try {
      const stripeHealthy = await StripeService.healthCheck();
      checks.stripe = stripeHealthy;
      if (!stripeHealthy) {
        overallReady = false;
      }
    } catch (error) {
      checks.stripe = false;
      overallReady = false;
      logger.error('Stripe health check failed:', error);
    }

    // Check memory usage
    const memoryUsage = process.memoryUsage();
    const memoryLimitMB = 512; // 512 MB threshold
    const heapUsedMB = memoryUsage.heapUsed / 1024 / 1024;
    checks.memory = heapUsedMB < memoryLimitMB;
    checks.memoryUsageMB = Math.round(heapUsedMB);

    if (!checks.memory) {
      overallReady = false;
      logger.warn('Memory usage high', { heapUsedMB, limit: memoryLimitMB });
    }

    const duration = Date.now() - startTime;

    res.status(overallReady ? 200 : 503).json({
      success: overallReady,
      data: {
        status: overallReady ? 'ready' : 'not_ready',
        checks,
        healthCheckDurationMs: duration,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Detailed health check with circuit breaker states
   * GET /api/v1/health/detailed
   */
  static async detailed(req, res) {
    const checks = {
      database: { healthy: false, latencyMs: null },
      stripe: { healthy: false, latencyMs: null },
      memory: { healthy: false, usage: null },
      circuitBreakers: {},
      performance: {},
    };

    // Database check with latency
    const dbStart = Date.now();
    try {
      await pool.query('SELECT 1');
      checks.database.healthy = true;
      checks.database.latencyMs = Date.now() - dbStart;
    } catch (error) {
      checks.database.error = error.message;
    }

    // Stripe check with latency
    const stripeStart = Date.now();
    try {
      const stripeHealthy = await StripeService.healthCheck();
      checks.stripe.healthy = stripeHealthy;
      checks.stripe.latencyMs = Date.now() - stripeStart;
    } catch (error) {
      checks.stripe.error = error.message;
    }

    // Memory check
    const memoryUsage = process.memoryUsage();
    checks.memory = {
      healthy: (memoryUsage.heapUsed / 1024 / 1024) < 512,
      heapUsedMB: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      heapTotalMB: Math.round(memoryUsage.heapTotal / 1024 / 1024),
      rssMB: Math.round(memoryUsage.rss / 1024 / 1024),
    };

    // Circuit breaker states
    checks.circuitBreakers = CircuitBreakerManager.getAllStates();

    // Performance metrics
    checks.performance = performanceMonitoring.getMetrics();

    // Overall health
    const overallHealthy = checks.database.healthy &&
                          checks.stripe.healthy &&
                          checks.memory.healthy &&
                          CircuitBreakerManager.areAllHealthy();

    res.status(overallHealthy ? 200 : 503).json({
      success: overallHealthy,
      data: {
        status: overallHealthy ? 'healthy' : 'degraded',
        checks,
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
      },
    });
  }

  /**
   * Circuit breaker status
   * GET /api/v1/health/circuit-breakers
   */
  static async circuitBreakers(req, res) {
    const states = CircuitBreakerManager.getAllStates();

    res.status(200).json({
      success: true,
      data: {
        circuitBreakers: states,
        allHealthy: CircuitBreakerManager.areAllHealthy(),
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Performance metrics
   * GET /api/v1/health/metrics
   */
  static async metrics(req, res) {
    const metrics = performanceMonitoring.getMetrics();
    const memoryUsage = process.memoryUsage();

    res.status(200).json({
      success: true,
      data: {
        requests: metrics.requestCounts,
        errors: metrics.errorCounts,
        memory: {
          heapUsedMB: Math.round(memoryUsage.heapUsed / 1024 / 1024),
          heapTotalMB: Math.round(memoryUsage.heapTotal / 1024 / 1024),
          rssMB: Math.round(memoryUsage.rss / 1024 / 1024),
        },
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      },
    });
  }
}

module.exports = HealthCheckController;
