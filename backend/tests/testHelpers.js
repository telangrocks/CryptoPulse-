// =============================================================================
// Test Helper Functions - Production Ready
// =============================================================================
// Utility functions for testing Express middleware and routes

/**
 * Creates a mock Express request object
 */
const createMockRequest = (overrides = {}) => {
  const req = {
    body: {},
    params: {},
    query: {},
    headers: {},
    ip: '127.0.0.1',
    method: 'GET',
    url: '/',
    originalUrl: '/',
    path: '/',
    protocol: 'http',
    hostname: 'localhost',
    get: jest.fn(),
    ...overrides
  };

  // Mock header getter
  req.get.mockImplementation((name) => {
    return req.headers[name.toLowerCase()];
  });

  return req;
};

/**
 * Creates a mock Express response object
 */
const createMockResponse = () => {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    end: jest.fn().mockReturnThis(),
    cookie: jest.fn().mockReturnThis(),
    clearCookie: jest.fn().mockReturnThis(),
    redirect: jest.fn().mockReturnThis(),
    setHeader: jest.fn().mockReturnThis(),
    getHeader: jest.fn(),
    locals: {}
  };

  return res;
};

/**
 * Creates a mock Express next function
 */
const createMockNext = () => {
  return jest.fn();
};

/**
 * Creates a mock Express app with basic routing
 */
const createMockApp = () => {
  const app = {
    use: jest.fn(),
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    patch: jest.fn(),
    listen: jest.fn(),
    set: jest.fn()
  };

  return app;
};

/**
 * Waits for a specified amount of time
 */
const wait = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Generates a random test user ID
 */
const generateTestUserId = () => {
  return `test-user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Generates a random test email
 */
const generateTestEmail = () => {
  return `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}@example.com`;
};

/**
 * Creates test user data
 */
const createTestUser = (overrides = {}) => {
  return {
    userId: generateTestUserId(),
    email: generateTestEmail(),
    firstName: 'Test',
    lastName: 'User',
    role: 'user',
    ...overrides
  };
};

/**
 * Creates test trade data
 */
const createTestTrade = (overrides = {}) => {
  return {
    id: `trade-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    userId: generateTestUserId(),
    exchange: 'binance',
    symbol: 'BTC/USDT',
    side: 'buy',
    amount: 0.001,
    price: 50000,
    status: 'pending',
    ...overrides
  };
};

/**
 * Creates test market data
 */
const createTestMarketData = (overrides = {}) => {
  return {
    symbol: 'BTC/USDT',
    price: 50000,
    volume: 1000,
    change: 2.5,
    timestamp: new Date().toISOString(),
    ...overrides
  };
};

/**
 * Mock database response
 */
const createMockDbResponse = (data = [], count = 0) => {
  return {
    rows: data,
    rowCount: count || data.length,
    command: 'SELECT',
    oid: 0,
    fields: []
  };
};

/**
 * Mock Redis client
 */
const createMockRedisClient = () => {
  const store = new Map();
  
  return {
    get: jest.fn().mockImplementation((key) => {
      return Promise.resolve(store.get(key) || null);
    }),
    set: jest.fn().mockImplementation((key, value) => {
      store.set(key, value);
      return Promise.resolve('OK');
    }),
    setEx: jest.fn().mockImplementation((key, seconds, value) => {
      store.set(key, value);
      return Promise.resolve('OK');
    }),
    del: jest.fn().mockImplementation((key) => {
      const existed = store.has(key);
      store.delete(key);
      return Promise.resolve(existed ? 1 : 0);
    }),
    exists: jest.fn().mockImplementation((key) => {
      return Promise.resolve(store.has(key) ? 1 : 0);
    }),
    sAdd: jest.fn().mockImplementation((key, member) => {
      if (!store.has(key)) {
        store.set(key, new Set());
      }
      const set = store.get(key);
      set.add(member);
      return Promise.resolve(1);
    }),
    sRem: jest.fn().mockImplementation((key, member) => {
      const set = store.get(key);
      if (set && set.has(member)) {
        set.delete(member);
        return Promise.resolve(1);
      }
      return Promise.resolve(0);
    }),
    sMembers: jest.fn().mockImplementation((key) => {
      const set = store.get(key);
      return Promise.resolve(set ? Array.from(set) : []);
    }),
    keys: jest.fn().mockImplementation((pattern) => {
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      return Promise.resolve(Array.from(store.keys()).filter(key => regex.test(key)));
    }),
    expire: jest.fn().mockImplementation((key, seconds) => {
      return Promise.resolve(store.has(key) ? 1 : 0);
    }),
    flushAll: jest.fn().mockImplementation(() => {
      store.clear();
      return Promise.resolve('OK');
    })
  };
};

/**
 * Mock logger
 */
const createMockLogger = () => {
  return {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    verbose: jest.fn(),
    silly: jest.fn()
  };
};

/**
 * Creates a test environment
 */
const createTestEnvironment = () => {
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-jwt-secret-64-characters-long-for-testing-purposes-only';
  process.env.JWT_EXPIRES_IN = '1h';
  process.env.JWT_REFRESH_EXPIRES_IN = '7d';
  process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/cryptopulse_test';
  process.env.REDIS_URL = 'redis://localhost:6379/15';
};

/**
 * Cleans up test environment
 */
const cleanupTestEnvironment = () => {
  delete process.env.NODE_ENV;
  delete process.env.JWT_SECRET;
  delete process.env.JWT_EXPIRES_IN;
  delete process.env.JWT_REFRESH_EXPIRES_IN;
  delete process.env.DATABASE_URL;
  delete process.env.REDIS_URL;
};

/**
 * Asserts that a response has the expected structure
 */
const assertResponseStructure = (response, expectedFields = []) => {
  expect(response).toBeDefined();
  
  for (const field of expectedFields) {
    expect(response).toHaveProperty(field);
  }
};

/**
 * Asserts that an error response has the expected structure
 */
const assertErrorResponse = (response, expectedError = null) => {
  expect(response).toHaveProperty('success', false);
  expect(response).toHaveProperty('error');
  
  if (expectedError) {
    expect(response.error).toBe(expectedError);
  }
};

/**
 * Asserts that a success response has the expected structure
 */
const assertSuccessResponse = (response, expectedData = null) => {
  expect(response).toHaveProperty('success', true);
  
  if (expectedData) {
    expect(response).toHaveProperty('data');
    expect(response.data).toEqual(expectedData);
  }
};

/**
 * Mock file system operations
 */
const createMockFileSystem = () => {
  const files = new Map();
  
  return {
    readFileSync: jest.fn().mockImplementation((path) => {
      return files.get(path) || Buffer.from('');
    }),
    writeFileSync: jest.fn().mockImplementation((path, data) => {
      files.set(path, data);
    }),
    existsSync: jest.fn().mockImplementation((path) => {
      return files.has(path);
    }),
    mkdirSync: jest.fn(),
    rmdirSync: jest.fn(),
    unlinkSync: jest.fn().mockImplementation((path) => {
      files.delete(path);
    }),
    statSync: jest.fn().mockImplementation((path) => {
      return {
        isFile: () => files.has(path),
        isDirectory: () => false,
        size: files.get(path)?.length || 0
      };
    }),
    readdirSync: jest.fn().mockImplementation((dir) => {
      return Array.from(files.keys()).filter(path => path.startsWith(dir));
    })
  };
};

/**
 * Mock crypto operations
 */
const createMockCrypto = () => {
  return {
    randomBytes: jest.fn().mockImplementation((size) => {
      return Buffer.alloc(size, '0');
    }),
    randomUUID: jest.fn().mockImplementation(() => {
      return 'test-uuid-' + Date.now();
    }),
    createHash: jest.fn().mockImplementation(() => {
      return {
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue('mocked-hash')
      };
    })
  };
};

module.exports = {
  createMockRequest,
  createMockResponse,
  createMockNext,
  createMockApp,
  wait,
  generateTestUserId,
  generateTestEmail,
  createTestUser,
  createTestTrade,
  createTestMarketData,
  createMockDbResponse,
  createMockRedisClient,
  createMockLogger,
  createTestEnvironment,
  cleanupTestEnvironment,
  assertResponseStructure,
  assertErrorResponse,
  assertSuccessResponse,
  createMockFileSystem,
  createMockCrypto
};
