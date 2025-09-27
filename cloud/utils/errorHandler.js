/**
 * Standardized Error Handling Utility for CryptoPulse
 * Provides consistent error handling patterns across all cloud functions
 */

const winston = require('winston');

// Configure error logger
const errorLogger = winston.createLogger({
  level: 'error',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
    winston.format.errors({ stack: true })
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/errors.log' })
  ]
});

/**
 * Standard error types for consistent error handling
 */
const ERROR_TYPES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  NOT_FOUND_ERROR: 'NOT_FOUND_ERROR',
  RATE_LIMIT_ERROR: 'RATE_LIMIT_ERROR',
  EXTERNAL_API_ERROR: 'EXTERNAL_API_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  BUSINESS_LOGIC_ERROR: 'BUSINESS_LOGIC_ERROR'
};

/**
 * Standard error response format
 */
class StandardError extends Error {
  constructor(type, message, statusCode = 500, details = null) {
    super(message);
    this.name = 'StandardError';
    this.type = type;
    this.statusCode = statusCode;
    this.details = details;
    this.timestamp = new Date().toISOString();
    this.id = this.generateErrorId();
  }

  generateErrorId() {
    return `ERR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  toJSON() {
    return {
      error: true,
      type: this.type,
      message: this.message,
      statusCode: this.statusCode,
      details: this.details,
      timestamp: this.timestamp,
      id: this.id
    };
  }
}

/**
 * Standardized error handling middleware for cloud functions
 */
function withErrorHandling(cloudFunction) {
  return async (request) => {
    try {
      return await cloudFunction(request);
    } catch (error) {
      return handleError(error, request);
    }
  };
}

/**
 * Central error handling function
 */
function handleError(error, request = null) {
  let standardError;

  // Convert different error types to StandardError
  if (error instanceof StandardError) {
    standardError = error;
  } else if (error instanceof Parse.Error) {
    standardError = convertParseError(error);
  } else if (error.name === 'ValidationError') {
    standardError = new StandardError(
      ERROR_TYPES.VALIDATION_ERROR,
      error.message,
      400,
      error.details
    );
  } else if (error.name === 'AuthenticationError') {
    standardError = new StandardError(
      ERROR_TYPES.AUTHENTICATION_ERROR,
      error.message,
      401
    );
  } else if (error.name === 'AuthorizationError') {
    standardError = new StandardError(
      ERROR_TYPES.AUTHORIZATION_ERROR,
      error.message,
      403
    );
  } else {
    standardError = new StandardError(
      ERROR_TYPES.INTERNAL_SERVER_ERROR,
      error.message || 'An unexpected error occurred',
      500,
      process.env.NODE_ENV === 'development' ? error.stack : null
    );
  }

  // Log error with context
  logError(standardError, request);

  // Return standardized error response
  throw new Parse.Error(standardError.statusCode, standardError.message, standardError);
}

/**
 * Convert Parse.Error to StandardError
 */
function convertParseError(parseError) {
  const errorTypeMap = {
    [Parse.Error.INVALID_QUERY]: ERROR_TYPES.VALIDATION_ERROR,
    [Parse.Error.OBJECT_NOT_FOUND]: ERROR_TYPES.NOT_FOUND_ERROR,
    [Parse.Error.SESSION_MISSING]: ERROR_TYPES.AUTHENTICATION_ERROR,
    [Parse.Error.ACCESS_DENIED]: ERROR_TYPES.AUTHORIZATION_ERROR,
    [Parse.Error.RATE_LIMIT_EXCEEDED]: ERROR_TYPES.RATE_LIMIT_ERROR,
    [Parse.Error.SCRIPT_FAILED]: ERROR_TYPES.INTERNAL_SERVER_ERROR
  };

  const type = errorTypeMap[parseError.code] || ERROR_TYPES.INTERNAL_SERVER_ERROR;
  const statusCode = parseError.code || 500;

  return new StandardError(type, parseError.message, statusCode);
}

/**
 * Log error with context
 */
function logError(error, request = null) {
  const logData = {
    error: error.toJSON(),
    request: request ? {
      ip: request.ip,
      userAgent: request.headers?.['user-agent'],
      userId: request.user?.id,
      endpoint: request.functionName || 'unknown'
    } : null,
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  };

  errorLogger.error('Cloud Function Error', logData);
}

/**
 * Validation error helper
 */
function createValidationError(message, details = null) {
  return new StandardError(ERROR_TYPES.VALIDATION_ERROR, message, 400, details);
}

/**
 * Authentication error helper
 */
function createAuthenticationError(message = 'Authentication required') {
  return new StandardError(ERROR_TYPES.AUTHENTICATION_ERROR, message, 401);
}

/**
 * Authorization error helper
 */
function createAuthorizationError(message = 'Access denied') {
  return new StandardError(ERROR_TYPES.AUTHORIZATION_ERROR, message, 403);
}

/**
 * Not found error helper
 */
function createNotFoundError(resource = 'Resource') {
  return new StandardError(ERROR_TYPES.NOT_FOUND_ERROR, `${resource} not found`, 404);
}

/**
 * External API error helper
 */
function createExternalAPIError(service, message) {
  return new StandardError(
    ERROR_TYPES.EXTERNAL_API_ERROR,
    `${service} API error: ${message}`,
    502
  );
}

/**
 * Business logic error helper
 */
function createBusinessLogicError(message, details = null) {
  return new StandardError(ERROR_TYPES.BUSINESS_LOGIC_ERROR, message, 422, details);
}

/**
 * Rate limit error helper
 */
function createRateLimitError(message = 'Rate limit exceeded') {
  return new StandardError(ERROR_TYPES.RATE_LIMIT_ERROR, message, 429);
}

module.exports = {
  StandardError,
  ERROR_TYPES,
  withErrorHandling,
  handleError,
  createValidationError,
  createAuthenticationError,
  createAuthorizationError,
  createNotFoundError,
  createExternalAPIError,
  createBusinessLogicError,
  createRateLimitError,
  logError
};
