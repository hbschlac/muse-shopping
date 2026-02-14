/**
 * Circuit Breaker
 * Prevents cascading failures by stopping requests to failing services
 * Implements the circuit breaker pattern for external API calls
 */

const logger = require('./logger');
const AlertService = require('../services/alertService');

class CircuitBreaker {
  constructor(name, options = {}) {
    this.name = name;
    this.failureThreshold = options.failureThreshold || 5;
    this.successThreshold = options.successThreshold || 2;
    this.timeout = options.timeout || 60000; // 1 minute default
    this.halfOpenMaxAttempts = options.halfOpenMaxAttempts || 1;

    // State tracking
    this.failures = 0;
    this.successes = 0;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.nextAttempt = Date.now();
    this.lastFailureTime = null;
    this.halfOpenAttempts = 0;

    // Metrics
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      rejectedRequests: 0,
      stateChanges: [],
    };

    logger.info(`Circuit breaker created: ${name}`, {
      failureThreshold: this.failureThreshold,
      timeout: this.timeout,
    });
  }

  /**
   * Execute function with circuit breaker protection
   * @param {Function} fn - Function to execute
   * @param {Function} fallback - Fallback function if circuit is open
   * @returns {Promise<*>} Function result or fallback result
   */
  async execute(fn, fallback = null) {
    this.metrics.totalRequests++;

    // Check if circuit is open
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        logger.warn(`Circuit breaker ${this.name} is OPEN, request rejected`, {
          nextAttempt: new Date(this.nextAttempt).toISOString(),
        });
        this.metrics.rejectedRequests++;

        if (fallback) {
          return await fallback();
        }

        throw new Error(`Circuit breaker ${this.name} is OPEN - service unavailable`);
      }

      // Transition to HALF_OPEN
      this.transitionTo('HALF_OPEN');
      this.halfOpenAttempts = 0;
    }

    // Check half-open attempt limit
    if (this.state === 'HALF_OPEN') {
      if (this.halfOpenAttempts >= this.halfOpenMaxAttempts) {
        logger.warn(`Circuit breaker ${this.name} HALF_OPEN max attempts reached`);
        this.metrics.rejectedRequests++;

        if (fallback) {
          return await fallback();
        }

        throw new Error(`Circuit breaker ${this.name} is testing - please retry later`);
      }
      this.halfOpenAttempts++;
    }

    // Execute function
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error);

      if (fallback) {
        logger.info(`Circuit breaker ${this.name} using fallback`, {
          error: error.message,
        });
        return await fallback();
      }

      throw error;
    }
  }

  /**
   * Handle successful execution
   */
  onSuccess() {
    this.failures = 0;
    this.metrics.successfulRequests++;

    if (this.state === 'HALF_OPEN') {
      this.successes++;

      if (this.successes >= this.successThreshold) {
        this.transitionTo('CLOSED');
        this.successes = 0;
        this.halfOpenAttempts = 0;
      }
    }
  }

  /**
   * Handle failed execution
   * @param {Error} error - Error that occurred
   */
  onFailure(error) {
    this.failures++;
    this.successes = 0;
    this.lastFailureTime = Date.now();
    this.metrics.failedRequests++;

    logger.error(`Circuit breaker ${this.name} failure`, {
      failures: this.failures,
      threshold: this.failureThreshold,
      state: this.state,
      error: error.message,
    });

    if (this.state === 'HALF_OPEN') {
      // Immediately reopen on failure in half-open state
      this.transitionTo('OPEN');
      this.failures = this.failureThreshold; // Set to threshold to prevent immediate retry
    } else if (this.failures >= this.failureThreshold) {
      this.transitionTo('OPEN');
    }
  }

  /**
   * Transition to new state
   * @param {string} newState - New state (OPEN, CLOSED, HALF_OPEN)
   */
  transitionTo(newState) {
    const oldState = this.state;
    this.state = newState;

    // Set next attempt time for OPEN state
    if (newState === 'OPEN') {
      this.nextAttempt = Date.now() + this.timeout;
    }

    // Record state change
    this.metrics.stateChanges.push({
      from: oldState,
      to: newState,
      timestamp: new Date().toISOString(),
      failures: this.failures,
    });

    logger.warn(`Circuit breaker ${this.name} state changed: ${oldState} → ${newState}`, {
      failures: this.failures,
      nextAttempt: newState === 'OPEN' ? new Date(this.nextAttempt).toISOString() : null,
    });

    // Send alert on state change
    if (newState === 'OPEN') {
      AlertService.sendSlackAlert(
        'critical',
        `🔌 Circuit Breaker Opened: ${this.name}`,
        `Circuit breaker for ${this.name} has opened after ${this.failures} consecutive failures`,
        {
          'Circuit': this.name,
          'Failures': this.failures,
          'State': newState,
          'Next Attempt': new Date(this.nextAttempt).toISOString(),
        }
      );
    } else if (newState === 'CLOSED' && oldState === 'HALF_OPEN') {
      AlertService.sendSlackAlert(
        'info',
        `✅ Circuit Breaker Closed: ${this.name}`,
        `Circuit breaker for ${this.name} has recovered and is now closed`,
        {
          'Circuit': this.name,
          'State': newState,
          'Successes': this.successes,
        }
      );
    }
  }

  /**
   * Get current state
   * @returns {string} Current state
   */
  getState() {
    return this.state;
  }

  /**
   * Get metrics
   * @returns {Object} Circuit breaker metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      nextAttempt: this.state === 'OPEN' ? new Date(this.nextAttempt).toISOString() : null,
      lastFailureTime: this.lastFailureTime ? new Date(this.lastFailureTime).toISOString() : null,
    };
  }

  /**
   * Reset circuit breaker
   */
  reset() {
    this.failures = 0;
    this.successes = 0;
    this.state = 'CLOSED';
    this.nextAttempt = Date.now();
    this.lastFailureTime = null;
    this.halfOpenAttempts = 0;

    logger.info(`Circuit breaker ${this.name} has been manually reset`);
  }

  /**
   * Force open circuit (for testing or maintenance)
   */
  forceOpen() {
    this.transitionTo('OPEN');
    this.failures = this.failureThreshold;
    logger.warn(`Circuit breaker ${this.name} has been manually opened`);
  }

  /**
   * Check if circuit is healthy
   * @returns {boolean} True if circuit is closed
   */
  isHealthy() {
    return this.state === 'CLOSED';
  }
}

/**
 * Circuit Breaker Manager
 * Manages multiple circuit breakers for different services
 */
class CircuitBreakerManager {
  constructor() {
    this.breakers = new Map();
  }

  /**
   * Get or create circuit breaker for service
   * @param {string} name - Service name
   * @param {Object} options - Circuit breaker options
   * @returns {CircuitBreaker} Circuit breaker instance
   */
  getBreaker(name, options = {}) {
    if (!this.breakers.has(name)) {
      this.breakers.set(name, new CircuitBreaker(name, options));
    }
    return this.breakers.get(name);
  }

  /**
   * Get all circuit breaker states
   * @returns {Object} Map of circuit breaker states
   */
  getAllStates() {
    const states = {};
    for (const [name, breaker] of this.breakers.entries()) {
      states[name] = {
        state: breaker.getState(),
        metrics: breaker.getMetrics(),
      };
    }
    return states;
  }

  /**
   * Check if all circuits are healthy
   * @returns {boolean} True if all circuits are closed
   */
  areAllHealthy() {
    for (const breaker of this.breakers.values()) {
      if (!breaker.isHealthy()) {
        return false;
      }
    }
    return true;
  }

  /**
   * Reset all circuit breakers
   */
  resetAll() {
    for (const breaker of this.breakers.values()) {
      breaker.reset();
    }
    logger.info('All circuit breakers have been reset');
  }
}

// Export singleton manager
const manager = new CircuitBreakerManager();

module.exports = {
  CircuitBreaker,
  CircuitBreakerManager: manager,
};
