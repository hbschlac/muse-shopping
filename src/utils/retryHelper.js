/**
 * Retry Helper
 * Implements exponential backoff retry logic for transient failures
 */

const logger = require('./logger');

class RetryHelper {
  /**
   * Execute function with retry logic
   * @param {Function} fn - Function to execute
   * @param {Object} options - Retry options
   * @returns {Promise<*>} Function result
   */
  static async withRetry(fn, options = {}) {
    const {
      maxRetries = 3,
      initialDelayMs = 1000,
      maxDelayMs = 10000,
      backoffMultiplier = 2,
      retryableErrors = ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNREFUSED'],
      retryableStatusCodes = [408, 429, 500, 502, 503, 504],
      onRetry = null, // Callback(attempt, error) => void
    } = options;

    let lastError;
    let delayMs = initialDelayMs;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;

        // Check if error is retryable
        if (!this.isRetryable(error, retryableErrors, retryableStatusCodes)) {
          logger.warn('Non-retryable error, failing immediately', {
            error: error.message,
            code: error.code,
            statusCode: error.statusCode,
          });
          throw error;
        }

        // Don't retry on last attempt
        if (attempt === maxRetries) {
          logger.error('Max retries reached, failing', {
            error: error.message,
            attempts: maxRetries + 1,
          });
          break;
        }

        // Log retry attempt
        logger.warn(`Retry attempt ${attempt + 1}/${maxRetries} after ${delayMs}ms`, {
          error: error.message,
          code: error.code,
          statusCode: error.statusCode,
          attempt: attempt + 1,
          delayMs,
        });

        // Call onRetry callback if provided
        if (onRetry) {
          try {
            await onRetry(attempt + 1, error);
          } catch (callbackError) {
            logger.error('Error in onRetry callback:', callbackError);
          }
        }

        // Wait before retry
        await this.sleep(delayMs);

        // Increase delay with exponential backoff
        delayMs = Math.min(delayMs * backoffMultiplier, maxDelayMs);
      }
    }

    // All retries exhausted
    throw lastError;
  }

  /**
   * Check if error is retryable
   * @param {Error} error - Error object
   * @param {Array<string>} retryableErrors - List of retryable error codes
   * @param {Array<number>} retryableStatusCodes - List of retryable HTTP status codes
   * @returns {boolean} True if retryable
   */
  static isRetryable(error, retryableErrors, retryableStatusCodes) {
    // Check error code (network errors)
    if (error.code && retryableErrors.includes(error.code)) {
      return true;
    }

    // Check HTTP status code
    if (error.statusCode && retryableStatusCodes.includes(error.statusCode)) {
      return true;
    }

    // Check if error message indicates transient failure
    if (error.message) {
      const transientMessages = [
        'timeout',
        'timed out',
        'connection reset',
        'socket hang up',
        'network error',
        'rate limit',
      ];

      const lowerMessage = error.message.toLowerCase();
      if (transientMessages.some(msg => lowerMessage.includes(msg))) {
        return true;
      }
    }

    return false;
  }

  /**
   * Sleep for specified milliseconds
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise<void>}
   */
  static sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Execute with timeout
   * @param {Function} fn - Function to execute
   * @param {number} timeoutMs - Timeout in milliseconds
   * @returns {Promise<*>} Function result
   */
  static async withTimeout(fn, timeoutMs) {
    return Promise.race([
      fn(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs)
      ),
    ]);
  }

  /**
   * Execute with retry and timeout
   * @param {Function} fn - Function to execute
   * @param {Object} retryOptions - Retry options
   * @param {number} timeoutMs - Timeout in milliseconds
   * @returns {Promise<*>} Function result
   */
  static async withRetryAndTimeout(fn, retryOptions = {}, timeoutMs = 30000) {
    return this.withRetry(
      () => this.withTimeout(fn, timeoutMs),
      retryOptions
    );
  }

  /**
   * Batch retry - Execute multiple functions with retry
   * @param {Array<Function>} functions - Array of functions to execute
   * @param {Object} options - Retry options
   * @returns {Promise<Array>} Array of results
   */
  static async batchWithRetry(functions, options = {}) {
    const results = await Promise.allSettled(
      functions.map(fn => this.withRetry(fn, options))
    );

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return { success: true, data: result.value };
      } else {
        logger.error(`Batch retry failed for function ${index}:`, result.reason);
        return { success: false, error: result.reason };
      }
    });
  }

  /**
   * Execute with jitter to prevent thundering herd
   * @param {Function} fn - Function to execute
   * @param {Object} options - Retry options with jitter
   * @returns {Promise<*>} Function result
   */
  static async withRetryAndJitter(fn, options = {}) {
    const enhancedOptions = {
      ...options,
      initialDelayMs: options.initialDelayMs || 1000,
    };

    let delayMs = enhancedOptions.initialDelayMs;
    const originalSleep = this.sleep;

    // Override sleep to add jitter
    this.sleep = async (ms) => {
      const jitter = Math.random() * 0.3 * ms; // +/- 30% jitter
      const actualDelay = ms + jitter;
      return originalSleep(actualDelay);
    };

    try {
      return await this.withRetry(fn, enhancedOptions);
    } finally {
      // Restore original sleep
      this.sleep = originalSleep;
    }
  }
}

module.exports = RetryHelper;
