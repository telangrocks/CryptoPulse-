// =============================================================================
// Enhanced Error Handling System - Production Ready
// =============================================================================
// Comprehensive error handling with logging, monitoring, and user-friendly responses

const winston = require('winston');
const { createHash } = require('crypto');

// Error types and their corresponding HTTP status codes
const ERROR_TYPES = {
  VALIDATION_ERROR: { status: 400, type: 'ValidationError' },
  AUTHENTICATION_ERROR: { status: 401, type: 'AuthenticationError' },
  AUTHORIZATION_ERROR: { status: 403, type: 'AuthorizationError' },
  NOT_FOUND_ERROR: { status: 404, type: 'NotFoundError' },
  CONFLICT_ERROR: { status: 409, type: 'ConflictError' },
  RATE_LIMIT_ERROR: { status: 429, type: 'RateLimitError' },
  EXTERNAL_API_ERROR: { status: 502, type: 'ExternalAPIError' },
  DATABASE_ERROR: { status: 503, type: 'DatabaseError' },
  INTERNAL_ERROR: { status: 500, type: 'InternalError' },
  SERVICE_UNAVAILABLE: { status: 503, type: 'ServiceUnavailableError' }
};

// Custom error classes
class AppError extends Error {
  constructor(message, statusCode, errorType, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.errorType = errorType;
    this.isOperational = isOperational;
    this.timestamp = new Date().toISOString();
    this.errorId = this.generateErrorId();

    Error.captureStackTrace(this, this.constructor);
  }

  generateErrorId() {
    return createHash('md5')
      .update(`${this.message}-${this.timestamp}-${Math.random()}`)
      .digest('hex')
      .substring(0, 8);
  }
}

class ValidationError extends AppError {
  constructor(message, details = []) {
    super(message, ERROR_TYPES.VALIDATION_ERROR.status, ERROR_TYPES.VALIDATION_ERROR.type);
    this.details = details;
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, ERROR_TYPES.AUTHENTICATION_ERROR.status, ERROR_TYPES.AUTHENTICATION_ERROR.type);
  }
}

class AuthorizationError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(message, ERROR_TYPES.AUTHORIZATION_ERROR.status, ERROR_TYPES.AUTHORIZATION_ERROR.type);
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, ERROR_TYPES.NOT_FOUND_ERROR.status, ERROR_TYPES.NOT_FOUND_ERROR.type);
  }
}

class ConflictError extends AppError {
  constructor(message = 'Resource conflict') {
    super(message, ERROR_TYPES.CONFLICT_ERROR.status, ERROR_TYPES.CONFLICT_ERROR.type);
  }
}

class RateLimitError extends AppError {
  constructor(message = 'Rate limit exceeded') {
    super(message, ERROR_TYPES.RATE_LIMIT_ERROR.status, ERROR_TYPES.RATE_LIMIT_ERROR.type);
  }
}

class ExternalAPIError extends AppError {
  constructor(message, service, originalError = null) {
    super(message, ERROR_TYPES.EXTERNAL_API_ERROR.status, ERROR_TYPES.EXTERNAL_API_ERROR.type);
    this.service = service;
    this.originalError = originalError;
  }
}

class DatabaseError extends AppError {
  constructor(message, operation, originalError = null) {
    super(message, ERROR_TYPES.DATABASE_ERROR.status, ERROR_TYPES.DATABASE_ERROR.type);
    this.operation = operation;
    this.originalError = originalError;
  }
}

class ServiceUnavailableError extends AppError {
  constructor(message = 'Service temporarily unavailable') {
    super(message, ERROR_TYPES.SERVICE_UNAVAILABLE.status, ERROR_TYPES.SERVICE_UNAVAILABLE.type);
  }
}

// Error logger configuration
const errorLogger = winston.createLogger({
  level: 'error',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({
      filename: 'logs/error.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Error monitoring and alerting
const errorMonitor = {
  trackError: (error, context = {}) => {
    const errorData = {
      errorId: error.errorId || 'unknown',
      message: error.message,
      stack: error.stack,
      statusCode: error.statusCode || 500,
      errorType: error.errorType || 'UnknownError',
      timestamp: error.timestamp || new Date().toISOString(),
      context: {
        ...context,
        userAgent: context.userAgent || 'unknown',
        ip: context.ip || 'unknown',
        url: context.url || 'unknown',
        method: context.method || 'unknown'
      }
    };

    // Log error
    errorLogger.error('Application Error', errorData);

    // Send to monitoring service (e.g., Sentry, DataDog)
    if (process.env.SENTRY_DSN) {
      // Sentry integration would go here
      // console.log('Sending error to Sentry:', errorData.errorId);
    }

    // Send alerts for critical errors
    if (error.statusCode >= 500) {
      sendCriticalErrorAlert(errorData);
    }
  },

  trackPerformance: (operation, duration, context = {}) => {
    if (duration > 1000) { // Log slow operations
      errorLogger.warn('Slow Operation', {
        operation,
        duration: `${duration}ms`,
        context,
        timestamp: new Date().toISOString()
      });
    }
  }
};

// Critical error alerting
function sendCriticalErrorAlert(_errorData) {
  // In production, this would send alerts via email, Slack, PagerDuty, etc.
  // console.error('🚨 CRITICAL ERROR ALERT:', {
  //   errorId: errorData.errorId,
  //   message: errorData.message,
  //   statusCode: errorData.statusCode,
  //   timestamp: errorData.timestamp
  // });

  // Example: Send to Slack webhook
  if (process.env.SLACK_WEBHOOK_URL) {
    // Slack notification would go here
  }
}

// Error response formatter
const formatErrorResponse = (error, isDevelopment = false) => {
  const baseResponse = {
    success: false,
    error: error.message,
    errorId: error.errorId,
    timestamp: error.timestamp,
    type: error.errorType
  };

  // Add additional details in development
  if (isDevelopment) {
    baseResponse.stack = error.stack;
    baseResponse.details = error.details || null;
    baseResponse.originalError = error.originalError || null;
  }

  // Add retry information for rate limits
  if (error instanceof RateLimitError) {
    baseResponse.retryAfter = 60; // seconds
  }

  return baseResponse;
};

// Global error handler middleware
const globalErrorHandler = (error, req, res, _next) => {
  // Track error with context
  errorMonitor.trackError(error, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    url: req.url,
    method: req.method,
    body: req.body,
    query: req.query,
    params: req.params,
    userId: req.user?.userId || 'anonymous'
  });

  // Determine if error is operational
  if (!error.isOperational) {
    // Log unexpected errors
    errorLogger.error('Unexpected Error', {
      error: error.message,
      stack: error.stack,
      context: {
        ip: req.ip,
        url: req.url,
        method: req.method
      }
    });

    // Don't leak error details in production
    if (process.env.NODE_ENV === 'production') {
      error = new AppError('Internal server error', 500, 'InternalError');
    }
  }

  // Format and send response
  const response = formatErrorResponse(error, process.env.NODE_ENV === 'development');
  res.status(error.statusCode || 500).json(response);
};

// Async error wrapper
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Error boundary for unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  errorLogger.error('Unhandled Promise Rejection', {
    reason: reason?.message || reason,
    stack: reason?.stack,
    promise: promise.toString(),
    timestamp: new Date().toISOString()
  });

  // In production, you might want to exit the process
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

// Error boundary for uncaught exceptions
process.on('uncaughtException', (error) => {
  errorLogger.error('Uncaught Exception', {
    error: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString()
  });

  // Always exit on uncaught exceptions
  process.exit(1);
});

// Validation error handler
const handleValidationError = (errors) => {
  const details = errors.array().map(error => ({
    field: error.path || error.param,
    message: error.msg,
    value: error.value
  }));

  return new ValidationError('Validation failed', details);
};

// Database error handler
const handleDatabaseError = (error, operation) => {
  let message = 'Database operation failed';

  if (error.code === '23505') {
    message = 'Duplicate entry found';
  } else if (error.code === '23503') {
    message = 'Referenced record not found';
  } else if (error.code === '23502') {
    message = 'Required field is missing';
  } else if (error.code === '42P01') {
    message = 'Table does not exist';
  } else if (error.code === '42703') {
    message = 'Column does not exist';
  }

  return new DatabaseError(message, operation, error);
};

// External API error handler
const handleExternalAPIError = (error, service) => {
  let message = `External API error: ${service}`;

  if (error.response) {
    message = `${service} API returned ${error.response.status}: ${error.response.statusText}`;
  } else if (error.request) {
    message = `Failed to connect to ${service} API`;
  } else {
    message = `Error configuring ${service} API request`;
  }

  return new ExternalAPIError(message, service, error);
};

// Health check error handler
const handleHealthCheckError = (service, error) => {
  return new ServiceUnavailableError(`${service} is not available: ${error.message}`);
};

// Export error classes and utilities
module.exports = {
  // Error classes
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  ExternalAPIError,
  DatabaseError,
  ServiceUnavailableError,

  // Error types
  ERROR_TYPES,

  // Error handlers
  globalErrorHandler,
  asyncHandler,
  handleValidationError,
  handleDatabaseError,
  handleExternalAPIError,
  handleHealthCheckError,

  // Error monitoring
  errorMonitor,

  // Utilities
  formatErrorResponse
};
