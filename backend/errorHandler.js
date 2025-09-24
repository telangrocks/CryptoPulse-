/**
 * Production-Grade Error Handling System
 * Global error handling with proper fallback UI and retry logic
 */

const { logger } = require('./structuredLogger');
const { getMonitoringSystem } = require('./monitoring');

class ErrorHandler {
  constructor() {
    this.monitoring = getMonitoringSystem();
    this.retryConfig = {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      backoffMultiplier: 2
    };
  }

  // Global error handler middleware
  globalErrorHandler() {
    return (error, req, res, next) => {
      // Log error with context
      logger.logError(error, {
        endpoint: req.path,
        method: req.method,
        userId: req.user?.id,
        requestId: req.requestId,
        userAgent: req.get('User-Agent'),
        ip: req.ip
      });

      // Record error metrics
      this.monitoring.recordError(error.name, req.path, req.method);

      // Determine error response
      const errorResponse = this.formatErrorResponse(error, req);

      // Send error response
      res.status(errorResponse.statusCode).json(errorResponse);
    };
  }

  // Format error response based on environment and error type
  formatErrorResponse(error, req) {
    const isDevelopment = process.env.NODE_ENV === 'development';
    const isProduction = process.env.NODE_ENV === 'production';

    // Base error response
    const errorResponse = {
      success: false,
      error: {
        type: error.name || 'InternalServerError',
        message: isProduction ? this.getSafeErrorMessage(error) : error.message,
        code: error.code || 'INTERNAL_ERROR',
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
        path: req.path,
        method: req.method
      }
    };

    // Add stack trace in development
    if (isDevelopment) {
      errorResponse.error.stack = error.stack;
      errorResponse.error.details = error.details;
    }

    // Determine status code
    errorResponse.statusCode = this.getStatusCode(error);

    // Add specific error handling
    switch (error.name) {
      case 'ValidationError':
        errorResponse.error.validationErrors = error.validationErrors;
        break;
      case 'AuthenticationError':
        errorResponse.error.authenticated = false;
        break;
      case 'AuthorizationError':
        errorResponse.error.permissions = error.permissions;
        break;
      case 'RateLimitError':
        errorResponse.error.retryAfter = error.retryAfter;
        break;
      case 'DatabaseError':
        errorResponse.error.operation = error.operation;
        break;
      case 'ExternalServiceError':
        errorResponse.error.service = error.service;
        errorResponse.error.endpoint = error.endpoint;
        break;
    }

    return errorResponse;
  }

  // Get safe error message for production
  getSafeErrorMessage(error) {
    const safeMessages = {
      'ValidationError': 'Invalid input provided',
      'AuthenticationError': 'Authentication failed',
      'AuthorizationError': 'Access denied',
      'RateLimitError': 'Too many requests',
      'DatabaseError': 'Database operation failed',
      'ExternalServiceError': 'External service unavailable',
      'InternalServerError': 'Internal server error'
    };

    return safeMessages[error.name] || 'An error occurred';
  }

  // Get appropriate HTTP status code
  getStatusCode(error) {
    const statusCodes = {
      'ValidationError': 400,
      'AuthenticationError': 401,
      'AuthorizationError': 403,
      'NotFoundError': 404,
      'ConflictError': 409,
      'RateLimitError': 429,
      'DatabaseError': 500,
      'ExternalServiceError': 502,
      'InternalServerError': 500
    };

    return statusCodes[error.name] || 500;
  }

  // Retry logic with exponential backoff
  async withRetry(operation, options = {}) {
    const config = { ...this.retryConfig, ...options };
    let lastError;

    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        // Don't retry on certain errors
        if (this.isNonRetryableError(error)) {
          throw error;
        }

        // Don't retry on last attempt
        if (attempt === config.maxRetries) {
          break;
        }

        // Calculate delay with exponential backoff
        const delay = Math.min(
          config.baseDelay * Math.pow(config.backoffMultiplier, attempt),
          config.maxDelay
        );

        logger.warn(`Operation failed, retrying in ${delay}ms`, {
          attempt: attempt + 1,
          maxRetries: config.maxRetries,
          error: error.message,
          type: 'retry_attempt'
        });

        await this.sleep(delay);
      }
    }

    logger.error('Operation failed after all retries', {
      maxRetries: config.maxRetries,
      error: lastError.message,
      type: 'retry_exhausted'
    });

    throw lastError;
  }

  // Check if error is non-retryable
  isNonRetryableError(error) {
    const nonRetryableErrors = [
      'ValidationError',
      'AuthenticationError',
      'AuthorizationError',
      'NotFoundError',
      'ConflictError'
    ];

    return nonRetryableErrors.includes(error.name);
  }

  // Sleep utility
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Circuit breaker pattern
  createCircuitBreaker(serviceName, options = {}) {
    const config = {
      failureThreshold: 5,
      successThreshold: 2,
      timeout: 10000,
      resetTimeout: 5000,
      ...options
    };

    let state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    let failureCount = 0;
    let successCount = 0;
    let lastFailureTime = 0;

    return async (operation) => {
      const now = Date.now();

      // Check if circuit should transition to HALF_OPEN
      if (state === 'OPEN' && now - lastFailureTime > config.timeout) {
        state = 'HALF_OPEN';
        successCount = 0;
        logger.info(`Circuit breaker for ${serviceName} transitioned to HALF_OPEN`);
      }

      // Check if circuit is open
      if (state === 'OPEN') {
        throw new Error(`Circuit breaker for ${serviceName} is OPEN`);
      }

      try {
        const result = await operation();
        
        if (state === 'HALF_OPEN') {
          successCount++;
          if (successCount >= config.successThreshold) {
            state = 'CLOSED';
            failureCount = 0;
            logger.info(`Circuit breaker for ${serviceName} transitioned to CLOSED`);
          }
        } else if (state === 'CLOSED') {
          failureCount = 0; // Reset failure count on success
        }

        return result;
      } catch (error) {
        failureCount++;
        lastFailureTime = now;

        if (state === 'HALF_OPEN') {
          state = 'OPEN';
          logger.warn(`Circuit breaker for ${serviceName} transitioned back to OPEN from HALF_OPEN`);
        } else if (state === 'CLOSED' && failureCount >= config.failureThreshold) {
          state = 'OPEN';
          logger.warn(`Circuit breaker for ${serviceName} transitioned to OPEN due to ${failureCount} failures`);
        }

        throw error;
      }
    };
  }

  // Async error wrapper
  asyncHandler(fn) {
    return (req, res, next) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }

  // Database error handler
  handleDatabaseError(error, operation, table) {
    logger.error('Database operation failed', {
      operation,
      table,
      error: error.message,
      code: error.code,
      type: 'database_error'
    });

    const dbError = new Error(`Database ${operation} failed`);
    dbError.name = 'DatabaseError';
    dbError.operation = operation;
    dbError.table = table;
    dbError.originalError = error;

    return dbError;
  }

  // External service error handler
  handleExternalServiceError(error, service, endpoint) {
    logger.error('External service call failed', {
      service,
      endpoint,
      error: error.message,
      statusCode: error.status,
      type: 'external_service_error'
    });

    const serviceError = new Error(`External service ${service} unavailable`);
    serviceError.name = 'ExternalServiceError';
    serviceError.service = service;
    serviceError.endpoint = endpoint;
    serviceError.originalError = error;

    return serviceError;
  }

  // Validation error handler
  handleValidationError(errors, field) {
    logger.warn('Validation failed', {
      field,
      errors,
      type: 'validation_error'
    });

    const validationError = new Error('Validation failed');
    validationError.name = 'ValidationError';
    validationError.validationErrors = errors;
    validationError.field = field;

    return validationError;
  }

  // Authentication error handler
  handleAuthenticationError(reason, userId) {
    logger.warn('Authentication failed', {
      reason,
      userId,
      type: 'authentication_error'
    });

    const authError = new Error('Authentication failed');
    authError.name = 'AuthenticationError';
    authError.reason = reason;
    authError.userId = userId;

    return authError;
  }

  // Authorization error handler
  handleAuthorizationError(requiredPermissions, userId) {
    logger.warn('Authorization failed', {
      requiredPermissions,
      userId,
      type: 'authorization_error'
    });

    const authError = new Error('Access denied');
    authError.name = 'AuthorizationError';
    authError.permissions = requiredPermissions;
    authError.userId = userId;

    return authError;
  }

  // Rate limit error handler
  handleRateLimitError(limit, window, userId) {
    logger.warn('Rate limit exceeded', {
      limit,
      window,
      userId,
      type: 'rate_limit_error'
    });

    const rateLimitError = new Error('Too many requests');
    rateLimitError.name = 'RateLimitError';
    rateLimitError.limit = limit;
    rateLimitError.window = window;
    rateLimitError.retryAfter = window;

    return rateLimitError;
  }

  // Health check error handler
  handleHealthCheckError(component, status, details) {
    logger.error('Health check failed', {
      component,
      status,
      details,
      type: 'health_check_error'
    });

    const healthError = new Error(`Health check failed for ${component}`);
    healthError.name = 'HealthCheckError';
    healthError.component = component;
    healthError.status = status;
    healthError.details = details;

    return healthError;
  }
}

// Create singleton instance
const errorHandler = new ErrorHandler();

module.exports = errorHandler;
