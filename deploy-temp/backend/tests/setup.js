/**
 * Jest Test Setup
 * 
 * This file sets up the test environment for all tests.
 * It includes global mocks, test utilities, and configuration.
 * 
 * @author Shrikant Telang
 * @version 1.0.0
 */

const { jest } = require('@jest/globals');

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';
process.env.ENABLE_CONSOLE_LOGS = 'false';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/cryptopulse_test';
process.env.REDIS_URL = 'redis://localhost:6379/1';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.ENCRYPTION_KEY = 'test-encryption-key-for-testing-only-32-chars';
process.env.SESSION_SECRET = 'test-session-secret-for-testing-only';
process.env.CSRF_SECRET = 'test-csrf-secret-for-testing-only';

// Global test timeout
jest.setTimeout(30000);

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Mock structured logger
jest.mock('../structuredLogger', () => ({
  structuredLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    http: jest.fn(),
    auth: jest.fn(),
    trading: jest.fn(),
    security: jest.fn(),
    performance: jest.fn(),
    database: jest.fn(),
    api: jest.fn(),
    audit: jest.fn(),
    health: jest.fn(),
    metrics: jest.fn()
  }
}));

// Mock monitoring
jest.mock('../monitoring', () => ({
  monitoring: {
    initializeMetrics: jest.fn().mockResolvedValue(true),
    startMonitoring: jest.fn().mockResolvedValue(true),
    recordHttpRequest: jest.fn(),
    recordAuthAttempt: jest.fn(),
    recordTradeOrder: jest.fn(),
    recordSystemMetrics: jest.fn(),
    recordError: jest.fn(),
    recordRateLimitHit: jest.fn(),
    recordCircuitBreakerState: jest.fn(),
    recordCircuitBreakerFailure: jest.fn(),
    getHealthStatus: jest.fn().mockResolvedValue({
      status: 'healthy',
      services: {
        database: 'connected',
        redis: 'connected',
        externalApis: 'operational'
      }
    }),
    getMetrics: jest.fn().mockResolvedValue(''),
    requestLogger: jest.fn(() => (req, res, next) => next())
  }
}));

// Mock error handler
jest.mock('../errorHandler', () => ({
  errorHandler: {
    globalErrorHandler: jest.fn((err, req, res, next) => {
      res.status(500).json({ error: err.message });
    }),
    formatErrorResponse: jest.fn((err) => ({ error: err.message })),
    getSafeErrorMessage: jest.fn((err) => err.message),
    getStatusCode: jest.fn((err) => 500),
    withRetry: jest.fn((fn) => fn),
    isNonRetryableError: jest.fn(() => false),
    createCircuitBreaker: jest.fn(() => ({
      execute: jest.fn((fn) => fn()),
      state: 'CLOSED'
    })),
    asyncHandler: jest.fn((fn) => fn)
  }
}));

// Mock performance optimizer
jest.mock('../performanceOptimizer', () => ({
  performanceOptimizer: {
    initialize: jest.fn().mockResolvedValue(true),
    middleware: jest.fn(() => (req, res, next) => next()),
    cleanup: jest.fn().mockResolvedValue(true)
  }
}));

// Mock security middleware
jest.mock('../securityMiddleware', () => ({
  securityMiddleware: {
    getAllMiddleware: jest.fn(() => [
      (req, res, next) => next(),
      (req, res, next) => next(),
      (req, res, next) => next()
    ])
  }
}));

// Mock environment security
jest.mock('../environmentSecurity', () => ({
  environmentSecurity: {
    validateEnvironment: jest.fn().mockResolvedValue(true)
  }
}));

// Mock secure session manager
jest.mock('../secureSessionManager', () => ({
  secureSessionManager: {
    middleware: jest.fn(() => (req, res, next) => {
      req.session = { sessionId: 'test-session-id', userId: 'test-user-id' };
      next();
    }),
    createSession: jest.fn().mockResolvedValue({
      sessionId: 'test-session-id',
      userId: 'test-user-id'
    }),
    validateSession: jest.fn().mockResolvedValue({
      sessionId: 'test-session-id',
      userId: 'test-user-id'
    }),
    destroySession: jest.fn().mockResolvedValue(true),
    setSessionCookie: jest.fn(),
    clearSessionCookie: jest.fn()
  }
}));

// Mock rate limiter
jest.mock('../rateLimiter', () => ({
  rateLimiter: {
    createRateLimitMiddleware: jest.fn(() => (req, res, next) => next())
  }
}));

// Mock feature flag system
jest.mock('../featureFlagSystem', () => ({
  featureFlagSystem: {
    initialize: jest.fn().mockResolvedValue(true),
    featureFlagMiddleware: jest.fn(() => (req, res, next) => {
      req.featureFlags = {};
      next();
    }),
    cleanup: jest.fn().mockResolvedValue(true)
  }
}));

// Mock compliance manager
jest.mock('../complianceManager', () => ({
  complianceManager: {
    initialize: jest.fn().mockResolvedValue(true),
    assessPortfolioRisk: jest.fn().mockResolvedValue({
      riskLevel: 'medium',
      score: 0.5
    }),
    cleanup: jest.fn().mockResolvedValue(true)
  }
}));

// Mock audit logger
jest.mock('../auditLogger', () => ({
  auditLogger: {
    initialize: jest.fn().mockResolvedValue(true),
    logUserLogin: jest.fn().mockResolvedValue(true),
    logUserLogout: jest.fn().mockResolvedValue(true),
    logTradeExecution: jest.fn().mockResolvedValue(true),
    logSecurityEvent: jest.fn().mockResolvedValue(true),
    logSystemEvent: jest.fn().mockResolvedValue(true)
  }
}));

// Mock database connections
jest.mock('../database/connection', () => ({
  initializeConnections: jest.fn().mockResolvedValue(true),
  getPostgreSQLConnection: jest.fn(() => ({
    query: jest.fn().mockResolvedValue([[], {}]),
    authenticate: jest.fn().mockResolvedValue(true),
    close: jest.fn().mockResolvedValue(true)
  })),
  getMongoDBClient: jest.fn(() => ({
    db: jest.fn(() => ({
      collection: jest.fn(() => ({
        find: jest.fn().mockReturnValue({
          toArray: jest.fn().mockResolvedValue([])
        }),
        findOne: jest.fn().mockResolvedValue(null),
        insertOne: jest.fn().mockResolvedValue({ insertedId: 'test-id' }),
        updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
        deleteOne: jest.fn().mockResolvedValue({ deletedCount: 1 })
      }))
    })),
    close: jest.fn().mockResolvedValue(true)
  })),
  getMongoDBDatabase: jest.fn(() => ({
    collection: jest.fn(() => ({
      find: jest.fn().mockReturnValue({
        toArray: jest.fn().mockResolvedValue([])
      }),
      findOne: jest.fn().mockResolvedValue(null),
      insertOne: jest.fn().mockResolvedValue({ insertedId: 'test-id' }),
      updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
      deleteOne: jest.fn().mockResolvedValue({ deletedCount: 1 })
    }))
  })),
  getMongooseConnection: jest.fn(() => ({
    close: jest.fn().mockResolvedValue(true)
  })),
  getRedisClient: jest.fn(() => ({
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    ping: jest.fn().mockResolvedValue('PONG'),
    quit: jest.fn().mockResolvedValue('OK')
  })),
  checkConnectionsHealth: jest.fn().mockResolvedValue({
    postgresql: true,
    mongodb: true,
    redis: true,
    overall: true
  }),
  closeConnections: jest.fn().mockResolvedValue(true),
  reconnect: jest.fn().mockResolvedValue(true),
  getConnectionStatus: jest.fn().mockReturnValue({
    isConnected: true,
    postgresql: true,
    mongodb: true,
    redis: true,
    retries: 0
  }),
  withTransaction: jest.fn((callback) => callback({})),
  withMongoTransaction: jest.fn((callback) => callback({}))
}));

// Mock environment configuration
jest.mock('../config/environment', () => ({
  loadConfiguration: jest.fn().mockResolvedValue(true),
  get: jest.fn((key, defaultValue) => {
    const config = {
      NODE_ENV: 'test',
      PORT: 3000,
      DATABASE_URL: 'postgresql://test:test@localhost:5432/cryptopulse_test',
      REDIS_URL: 'redis://localhost:6379/1',
      JWT_SECRET: 'test-jwt-secret-key-for-testing-only',
      ENCRYPTION_KEY: 'test-encryption-key-for-testing-only-32-chars',
      SESSION_SECRET: 'test-session-secret-for-testing-only',
      CSRF_SECRET: 'test-csrf-secret-for-testing-only'
    };
    return config[key] || defaultValue;
  }),
  getAll: jest.fn(() => ({
    NODE_ENV: 'test',
    PORT: 3000,
    DATABASE_URL: 'postgresql://test:test@localhost:5432/cryptopulse_test',
    REDIS_URL: 'redis://localhost:6379/1',
    JWT_SECRET: 'test-jwt-secret-key-for-testing-only',
    ENCRYPTION_KEY: 'test-encryption-key-for-testing-only-32-chars',
    SESSION_SECRET: 'test-session-secret-for-testing-only',
    CSRF_SECRET: 'test-csrf-secret-for-testing-only'
  })),
  isValid: jest.fn(() => true),
  getValidationErrors: jest.fn(() => []),
  getDatabaseConfig: jest.fn(() => ({
    url: 'postgresql://test:test@localhost:5432/cryptopulse_test',
    host: 'localhost',
    port: 5432,
    database: 'cryptopulse_test',
    username: 'test',
    password: 'test',
    ssl: false,
    pool: { min: 2, max: 10 }
  })),
  getRedisConfig: jest.fn(() => ({
    url: 'redis://localhost:6379/1',
    host: 'localhost',
    port: 6379,
    password: null,
    db: 1
  })),
  isProduction: jest.fn(() => false),
  isDevelopment: jest.fn(() => false),
  isTest: jest.fn(() => true)
}));

// Global test utilities
global.testUtils = {
  // Create mock request
  createMockRequest: (overrides = {}) => ({
    method: 'GET',
    url: '/',
    headers: {},
    body: {},
    query: {},
    params: {},
    session: { sessionId: 'test-session-id', userId: 'test-user-id' },
    ip: '127.0.0.1',
    get: jest.fn(),
    ...overrides
  }),
  
  // Create mock response
  createMockResponse: () => {
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      cookie: jest.fn().mockReturnThis(),
      clearCookie: jest.fn().mockReturnThis(),
      end: jest.fn().mockReturnThis()
    };
    return res;
  },
  
  // Create mock next function
  createMockNext: () => jest.fn(),
  
  // Wait for async operations
  waitFor: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Create test user data
  createTestUser: (overrides = {}) => ({
    id: 'test-user-id',
    email: 'test@example.com',
    username: 'testuser',
    firstName: 'Test',
    lastName: 'User',
    isVerified: true,
    kycStatus: 'verified',
    role: 'user',
    ...overrides
  }),
  
  // Create test trade data
  createTestTrade: (overrides = {}) => ({
    id: 'test-trade-id',
    userId: 'test-user-id',
    pair: 'BTC/USDT',
    action: 'BUY',
    amount: 0.1,
    price: 50000,
    status: 'executed',
    ...overrides
  }),
  
  // Create test portfolio data
  createTestPortfolio: (overrides = {}) => ({
    id: 'test-portfolio-id',
    userId: 'test-user-id',
    name: 'Test Portfolio',
    totalValue: 10000,
    totalCost: 9500,
    totalReturn: 500,
    ...overrides
  })
};

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});

// Global error handler for unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Global error handler for uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});