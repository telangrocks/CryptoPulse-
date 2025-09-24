/**
 * Unit Tests for Error Handler
 * Comprehensive testing with 80%+ coverage
 */

const errorHandler = require('../../errorHandler');

describe('ErrorHandler', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      path: '/api/test',
      method: 'GET',
      user: { id: 'user123' },
      requestId: 'test-request-123',
      get: jest.fn().mockReturnValue('Mozilla/5.0'),
      ip: '192.168.1.1'
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      set: jest.fn()
    };
    next = jest.fn();
  });

  describe('Global Error Handler Middleware', () => {
    it('should create global error handler middleware', () => {
      const middleware = errorHandler.globalErrorHandler();
      expect(typeof middleware).toBe('function');
    });

    it('should handle validation errors', () => {
      const middleware = errorHandler.globalErrorHandler();
      const error = new Error('Validation failed');
      error.name = 'ValidationError';
      error.validationErrors = [{ field: 'email', message: 'Invalid email' }];

      middleware(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            type: 'ValidationError',
            message: 'Validation failed',
            code: 'VALIDATION_ERROR',
            validationErrors: [{ field: 'email', message: 'Invalid email' }]
          })
        })
      );
    });

    it('should handle authentication errors', () => {
      const middleware = errorHandler.globalErrorHandler();
      const error = new Error('Authentication failed');
      error.name = 'AuthenticationError';

      middleware(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            type: 'AuthenticationError',
            message: 'Authentication failed',
            code: 'AUTH_ERROR'
          })
        })
      );
    });

    it('should handle rate limit errors', () => {
      const middleware = errorHandler.globalErrorHandler();
      const error = new Error('Too many requests');
      error.name = 'RateLimitError';
      error.retryAfter = 900;

      middleware(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            type: 'RateLimitError',
            message: 'Too many requests',
            code: 'RATE_LIMIT_ERROR',
            retryAfter: 900
          })
        })
      );
    });

    it('should handle internal server errors', () => {
      const middleware = errorHandler.globalErrorHandler();
      const error = new Error('Internal server error');
      error.name = 'InternalServerError';

      middleware(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            type: 'InternalServerError',
            message: 'Internal server error',
            code: 'INTERNAL_ERROR'
          })
        })
      );
    });

    it('should include request context in error response', () => {
      const middleware = errorHandler.globalErrorHandler();
      const error = new Error('Test error');

      middleware(error, req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            requestId: 'test-request-123',
            path: '/api/test',
            method: 'GET'
          })
        })
      );
    });
  });

  describe('Retry Logic with Exponential Backoff', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should retry failed operations with exponential backoff', async () => {
      let attemptCount = 0;
      const operation = jest.fn().mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error('Temporary failure');
        }
        return 'success';
      });

      const promise = errorHandler.withRetry(operation, {
        maxRetries: 3,
        baseDelay: 100,
        maxDelay: 1000,
        backoffMultiplier: 2
      });

      // Fast-forward timers to simulate delays
      jest.advanceTimersByTime(1000);

      await expect(promise).resolves.toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should not retry non-retryable errors', async () => {
      const operation = jest.fn().mockImplementation(() => {
        const error = new Error('Validation failed');
        error.name = 'ValidationError';
        throw error;
      });

      await expect(errorHandler.withRetry(operation)).rejects.toThrow('Validation failed');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should throw error after max retries', async () => {
      const operation = jest.fn().mockImplementation(() => {
        throw new Error('Persistent failure');
      });

      const promise = errorHandler.withRetry(operation, { maxRetries: 2 });
      
      jest.advanceTimersByTime(1000);

      await expect(promise).rejects.toThrow('Persistent failure');
      expect(operation).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });
  });

  describe('Circuit Breaker Pattern', () => {
    it('should create circuit breaker', () => {
      const circuitBreaker = errorHandler.createCircuitBreaker('test-service', {
        failureThreshold: 3,
        successThreshold: 2,
        timeout: 1000,
        resetTimeout: 500
      });

      expect(typeof circuitBreaker).toBe('function');
    });

    it('should allow requests when circuit is closed', async () => {
      const circuitBreaker = errorHandler.createCircuitBreaker('test-service', {
        failureThreshold: 3,
        successThreshold: 2,
        timeout: 1000
      });

      const operation = jest.fn().mockResolvedValue('success');

      await expect(circuitBreaker(operation)).resolves.toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should open circuit after failure threshold', async () => {
      const circuitBreaker = errorHandler.createCircuitBreaker('test-service', {
        failureThreshold: 2,
        successThreshold: 2,
        timeout: 1000
      });

      const operation = jest.fn().mockRejectedValue(new Error('Service error'));

      // First failure
      await expect(circuitBreaker(operation)).rejects.toThrow('Service error');
      
      // Second failure - should open circuit
      await expect(circuitBreaker(operation)).rejects.toThrow('Service error');
      
      // Third call should be blocked
      await expect(circuitBreaker(operation)).rejects.toThrow('Circuit breaker for test-service is OPEN');
      
      expect(operation).toHaveBeenCalledTimes(2);
    });
  });

  describe('Async Error Wrapper', () => {
    it('should wrap async functions and catch errors', async () => {
      const asyncFn = jest.fn().mockRejectedValue(new Error('Async error'));
      const wrappedFn = errorHandler.asyncHandler(asyncFn);

      await wrappedFn(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should pass through successful async functions', async () => {
      const asyncFn = jest.fn().mockResolvedValue('success');
      const wrappedFn = errorHandler.asyncHandler(asyncFn);

      await wrappedFn(req, res, next);

      expect(asyncFn).toHaveBeenCalledWith(req, res, next);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('Specialized Error Handlers', () => {
    it('should handle database errors', () => {
      const originalError = new Error('Connection failed');
      const dbError = errorHandler.handleDatabaseError(originalError, 'SELECT', 'users');

      expect(dbError.name).toBe('DatabaseError');
      expect(dbError.operation).toBe('SELECT');
      expect(dbError.table).toBe('users');
      expect(dbError.originalError).toBe(originalError);
    });

    it('should handle external service errors', () => {
      const originalError = new Error('Service unavailable');
      originalError.status = 503;
      const serviceError = errorHandler.handleExternalServiceError(originalError, 'binance', '/api/v3/ticker');

      expect(serviceError.name).toBe('ExternalServiceError');
      expect(serviceError.service).toBe('binance');
      expect(serviceError.endpoint).toBe('/api/v3/ticker');
      expect(serviceError.originalError).toBe(originalError);
    });

    it('should handle validation errors', () => {
      const errors = [
        { field: 'email', message: 'Invalid email format' },
        { field: 'password', message: 'Password too short' }
      ];
      const validationError = errorHandler.handleValidationError(errors, 'user');

      expect(validationError.name).toBe('ValidationError');
      expect(validationError.validationErrors).toEqual(errors);
      expect(validationError.field).toBe('user');
    });

    it('should handle authentication errors', () => {
      const authError = errorHandler.handleAuthenticationError('invalid_credentials', 'user123');

      expect(authError.name).toBe('AuthenticationError');
      expect(authError.reason).toBe('invalid_credentials');
      expect(authError.userId).toBe('user123');
    });

    it('should handle authorization errors', () => {
      const authError = errorHandler.handleAuthorizationError(['admin', 'user'], 'user123');

      expect(authError.name).toBe('AuthorizationError');
      expect(authError.permissions).toEqual(['admin', 'user']);
      expect(authError.userId).toBe('user123');
    });

    it('should handle rate limit errors', () => {
      const rateLimitError = errorHandler.handleRateLimitError(100, 900, 'user123');

      expect(rateLimitError.name).toBe('RateLimitError');
      expect(rateLimitError.limit).toBe(100);
      expect(rateLimitError.window).toBe(900);
      expect(rateLimitError.retryAfter).toBe(900);
    });

    it('should handle health check errors', () => {
      const healthError = errorHandler.handleHealthCheckError('database', 'unhealthy', { error: 'connection failed' });

      expect(healthError.name).toBe('HealthCheckError');
      expect(healthError.component).toBe('database');
      expect(healthError.status).toBe('unhealthy');
      expect(healthError.details).toEqual({ error: 'connection failed' });
    });
  });

  describe('Error Response Formatting', () => {
    it('should format error response for development', () => {
      process.env.NODE_ENV = 'development';
      const error = new Error('Test error');
      error.stack = 'Error: Test error\n    at test.js:1:1';
      error.details = { test: true };

      const response = errorHandler.formatErrorResponse(error, req);

      expect(response.error.stack).toBeDefined();
      expect(response.error.details).toEqual({ test: true });
      expect(response.error.message).toBe('Test error');
    });

    it('should format error response for production', () => {
      process.env.NODE_ENV = 'production';
      const error = new Error('Test error');
      error.stack = 'Error: Test error\n    at test.js:1:1';

      const response = errorHandler.formatErrorResponse(error, req);

      expect(response.error.stack).toBeUndefined();
      expect(response.error.details).toBeUndefined();
      expect(response.error.message).toBe('An error occurred');
    });

    it('should get appropriate status codes for different error types', () => {
      const testCases = [
        { name: 'ValidationError', expectedStatus: 400 },
        { name: 'AuthenticationError', expectedStatus: 401 },
        { name: 'AuthorizationError', expectedStatus: 403 },
        { name: 'NotFoundError', expectedStatus: 404 },
        { name: 'RateLimitError', expectedStatus: 429 },
        { name: 'DatabaseError', expectedStatus: 500 },
        { name: 'UnknownError', expectedStatus: 500 }
      ];

      testCases.forEach(({ name, expectedStatus }) => {
        const error = new Error('Test error');
        error.name = name;
        const response = errorHandler.formatErrorResponse(error, req);
        expect(response.statusCode).toBe(expectedStatus);
      });
    });
  });
});
