const logger = require('../utils/logger');
const { errorResponse } = require('../utils/responseFormatter');

const errorHandler = (err, req, res, _next) => {
  logger.error('Error occurred:', {
    message: err.message,
    stack: err.stack,
    code: err.code,
    path: req.path,
    method: req.method,
  });

  // Operational errors (known errors)
  if (err.isOperational) {
    return res.status(err.statusCode).json(
      errorResponse(err.code, err.message, err.details)
    );
  }

  // Programming errors (unknown errors)
  res.status(500).json(
    errorResponse(
      'INTERNAL_ERROR',
      'An unexpected error occurred',
      process.env.NODE_ENV === 'development' ? err.stack : null
    )
  );
};

module.exports = errorHandler;
