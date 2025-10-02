// =============================================================================
// Jest Test Setup for CryptoPulse Backend
// =============================================================================
// Global test setup and configuration

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2g3h4';
process.env.ENCRYPTION_KEY = 'b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2g3h5';
process.env.CSRF_SECRET = 'c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2g3h6';
process.env.SESSION_SECRET = 'd4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2g3h7';
process.env.PORT = '3001';
process.env.DATABASE_URL = 'mongodb://localhost:27017/cryptopulse-test';
process.env.MONGODB_URL = 'mongodb://localhost:27017/cryptopulse-test';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.LOG_LEVEL = 'error';

// Mock external services
jest.mock('mongodb', () => ({
  MongoClient: {
    connect: jest.fn().mockResolvedValue({
      db: jest.fn().mockReturnValue({
        collection: jest.fn().mockReturnValue({
          find: jest.fn().mockReturnValue({
            toArray: jest.fn().mockResolvedValue([])
          }),
          insertOne: jest.fn().mockResolvedValue({ insertedId: '123' }),
          updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
          deleteOne: jest.fn().mockResolvedValue({ deletedCount: 1 })
        })
      }),
      close: jest.fn()
    })
  }
}));

jest.mock('redis', () => ({
  createClient: jest.fn().mockReturnValue({
    connect: jest.fn().mockResolvedValue(),
    disconnect: jest.fn().mockResolvedValue(),
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    on: jest.fn()
  })
}));

// Global test utilities
global.testUtils = {
  createMockRequest: (overrides = {}) => ({
    body: {},
    params: {},
    query: {},
    headers: {},
    user: null,
    ...overrides
  }),
  
  createMockResponse: () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    res.cookie = jest.fn().mockReturnValue(res);
    res.clearCookie = jest.fn().mockReturnValue(res);
    return res;
  },
  
  createMockNext: () => jest.fn()
};

// Console suppression for cleaner test output
const originalConsole = global.console;
global.console = {
  ...originalConsole,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Restore console after all tests
afterAll(() => {
  global.console = originalConsole;
});
