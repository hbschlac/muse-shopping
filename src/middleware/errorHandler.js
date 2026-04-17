const logger = require('../utils/logger');
const { errorResponse } = require('../utils/responseFormatter');
const AlertService = require('../services/alertService');

const errorHandler = (err, req, res, _next) => {
  // Log error with context
  console.error('[ERROR HANDLER]', err.message);
  console.error('[ERROR STACK]', err.stack);
  logger.error('Error occurred:', {
    message: err.message,
    stack: err.stack,
    code: err.code,
    statusCode: err.statusCode,
    path: req.path,
    method: req.method,
    userId: req.userId,
    userMessage: err.userMessage,
  });

  // Send alerts for critical errors
  if (err.statusCode >= 500 || err.code === 'PAYMENT_ERROR') {
    // Don't await to avoid blocking response
    AlertService.sendSlackAlert(
      err.statusCode >= 500 ? 'critical' : 'warning',
      `API Error: ${err.code || 'UNKNOWN'}`,
      err.message,
      {
        'Endpoint': `${req.method} ${req.path}`,
        'User ID': req.userId || 'anonymous',
        'Status': err.statusCode || 500,
        'Error Code': err.code || 'UNKNOWN',
      }
    ).catch(alertError => {
      logger.error('Failed to send error alert:', alertError);
    });
  }

  // Operational errors (known errors with user-friendly messages)
  if (err.isOperational) {
    const response = {
      success: false,
      error: {
        code: err.code,
        message: err.message, // Technical message for logging/debugging
        userMessage: err.userMessage, // User-friendly message
        recoverable: err.recoverable,
        suggestedActions: err.suggestedActions || [],
      }
    };

    // Include details in development
    if (err.details && process.env.NODE_ENV === 'development') {
      response.error.details = err.details;
    }

    // Include retry information for rate limits
    if (err.retryAfterSeconds) {
      response.error.retryAfterSeconds = err.retryAfterSeconds;
    }

    return res.status(err.statusCode).json(response);
  }

  // Programming errors (unknown errors - don't expose internals)
  const response = {
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      userMessage: 'Something went wrong on our end. We\'re working to fix it. Please try again in a few moments.',
      recoverable: true,
      suggestedActions: [
        'Refresh the page',
        'Try again in a few minutes',
        'Contact support if the problem persists'
      ],
      // Include the raw error message (not stack) so Vercel's truncated logs
      // aren't the only diagnostic surface. Scope leaks ~Error.message only,
      // which is typically DB column / constraint text — useful, not secret.
      debugMessage: err.message,
    }
  };

  // Include stack trace in development only
  if (process.env.NODE_ENV === 'development') {
    response.error.details = {
      stack: err.stack,
      originalMessage: err.message,
    };
  }

  res.status(500).json(response);
};

module.exports = errorHandler;
