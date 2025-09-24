/**
 * Jest Test Setup
 * Global test configuration and mocks
 */

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.PORT = '3001';
process.env.SESSION_SECRET = 'test-session-secret';
process.env.ENCRYPTION_KEY = 'test-encryption-key-32-characters';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.REDIS_PASSWORD = 'test-redis-password';
process.env.MONGO_URL = 'mongodb://localhost:27017/cryptopulse_test';
process.env.MONGO_INITDB_ROOT_USERNAME = 'test-user';
process.env.MONGO_INITDB_ROOT_PASSWORD = 'test-password';

// Mock console methods to reduce noise during tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Global test timeout
jest.setTimeout(30000);

// Mock external dependencies
jest.mock('redis', () => ({
  createClient: jest.fn(() => ({
    connect: jest.fn().mockResolvedValue(true),
    quit: jest.fn().mockResolvedValue(true),
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    setex: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    exists: jest.fn().mockResolvedValue(0),
    expire: jest.fn().mockResolvedValue(1),
    on: jest.fn(),
    ping: jest.fn().mockResolvedValue('PONG')
  }))
}));

jest.mock('prom-client', () => ({
  register: {
    metrics: jest.fn().mockResolvedValue('# HELP test_metric Test metric\n# TYPE test_metric counter\ntest_metric 1'),
    clear: jest.fn(),
    contentType: 'text/plain'
  },
  Counter: jest.fn().mockImplementation(() => ({
    labels: jest.fn().mockReturnThis(),
    inc: jest.fn(),
    set: jest.fn()
  })),
  Gauge: jest.fn().mockImplementation(() => ({
    labels: jest.fn().mockReturnThis(),
    set: jest.fn(),
    inc: jest.fn(),
    dec: jest.fn()
  })),
  Histogram: jest.fn().mockImplementation(() => ({
    labels: jest.fn().mockReturnThis(),
    observe: jest.fn()
  })),
  Summary: jest.fn().mockImplementation(() => ({
    labels: jest.fn().mockReturnThis(),
    observe: jest.fn()
  }))
}));

// Mock winston logger
jest.mock('winston', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    end: jest.fn()
  })),
  format: {
    combine: jest.fn(),
    timestamp: jest.fn(),
    errors: jest.fn(),
    json: jest.fn(),
    printf: jest.fn(),
    colorize: jest.fn(),
    simple: jest.fn()
  },
  transports: {
    Console: jest.fn(),
    File: jest.fn()
  }
}));

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-1234')
}));

// Mock axios
jest.mock('axios', () => ({
  get: jest.fn().mockResolvedValue({ data: {}, status: 200 }),
  post: jest.fn().mockResolvedValue({ data: {}, status: 200 }),
  put: jest.fn().mockResolvedValue({ data: {}, status: 200 }),
  delete: jest.fn().mockResolvedValue({ data: {}, status: 200 })
}));

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
});
