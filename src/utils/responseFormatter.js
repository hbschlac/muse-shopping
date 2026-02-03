/**
 * Standardized API response formatter
 */

const successResponse = (data, message = null) => {
  const response = {
    success: true,
    data,
  };

  if (message) {
    response.message = message;
  }

  return response;
};

const errorResponse = (code, message, details = null) => {
  const response = {
    success: false,
    error: {
      code,
      message,
    },
  };

  if (details && process.env.NODE_ENV === 'development') {
    response.error.details = details;
  }

  return response;
};

module.exports = {
  successResponse,
  errorResponse,
};
