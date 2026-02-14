/**
 * Custom error classes for the application
 * Enhanced with user-friendly messages and suggested actions
 */

class AppError extends Error {
  constructor(message, statusCode, code, isOperational = true, userMessage = null, suggestedActions = [], recoverable = true) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    this.userMessage = userMessage || message;
    this.suggestedActions = suggestedActions;
    this.recoverable = recoverable;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, details = null, userMessage = null, suggestedActions = []) {
    super(
      message,
      400,
      'VALIDATION_ERROR',
      true,
      userMessage || 'Please check your input and try again.',
      suggestedActions.length > 0 ? suggestedActions : ['Review your information', 'Correct any errors'],
      true
    );
    this.details = details;
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed', userMessage = null) {
    super(
      message,
      401,
      'AUTHENTICATION_ERROR',
      true,
      userMessage || 'Please sign in to continue.',
      ['Sign in to your account', 'Reset your password if needed'],
      true
    );
  }
}

class AuthorizationError extends AppError {
  constructor(message = 'Insufficient permissions', userMessage = null) {
    super(
      message,
      403,
      'AUTHORIZATION_ERROR',
      true,
      userMessage || 'You don\'t have permission to access this resource.',
      ['Contact support if you believe this is an error'],
      false
    );
  }
}

class NotFoundError extends AppError {
  constructor(resource = 'Resource', userMessage = null) {
    super(
      `${resource} not found`,
      404,
      'NOT_FOUND',
      true,
      userMessage || `We couldn't find what you're looking for.`,
      ['Go back to the previous page', 'Return to home'],
      false
    );
  }
}

class ConflictError extends AppError {
  constructor(message = 'Resource already exists', userMessage = null, suggestedActions = []) {
    super(
      message,
      409,
      'CONFLICT',
      true,
      userMessage || 'This item already exists.',
      suggestedActions.length > 0 ? suggestedActions : ['Try a different option'],
      true
    );
  }
}

class RateLimitError extends AppError {
  constructor(message = 'Too many requests', retryAfterSeconds = 60) {
    super(
      message,
      429,
      'RATE_LIMIT_EXCEEDED',
      true,
      'You\'re making requests too quickly. Please slow down and try again in a moment.',
      [`Wait ${retryAfterSeconds} seconds before trying again`],
      true
    );
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

class PaymentError extends AppError {
  constructor(message = 'Payment processing failed', userMessage = null, suggestedActions = [], recoverable = true) {
    const defaultActions = [
      'Try a different payment method',
      'Check your card details',
      'Contact your bank if the problem persists'
    ];

    super(
      message,
      402,
      'PAYMENT_ERROR',
      true,
      userMessage || 'We couldn\'t process your payment. Please try again.',
      suggestedActions.length > 0 ? suggestedActions : defaultActions,
      recoverable
    );
  }
}

class CheckoutError extends AppError {
  constructor(message, userMessage = null, suggestedActions = [], recoverable = true) {
    const defaultActions = ['Review your cart', 'Try again'];

    super(
      message,
      400,
      'CHECKOUT_ERROR',
      true,
      userMessage || 'There was an issue with your checkout. Please try again.',
      suggestedActions.length > 0 ? suggestedActions : defaultActions,
      recoverable
    );
  }
}

class ServiceUnavailableError extends AppError {
  constructor(service = 'Service', estimatedDowntimeMinutes = null) {
    const downtimeMessage = estimatedDowntimeMinutes
      ? ` We expect to be back in approximately ${estimatedDowntimeMinutes} minutes.`
      : ' Please try again shortly.';

    super(
      `${service} is temporarily unavailable`,
      503,
      'SERVICE_UNAVAILABLE',
      true,
      `We're experiencing technical difficulties.${downtimeMessage}`,
      ['Refresh the page', 'Try again in a few minutes'],
      true
    );
    this.estimatedDowntimeMinutes = estimatedDowntimeMinutes;
  }
}

module.exports = {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  PaymentError,
  CheckoutError,
  ServiceUnavailableError,
};
