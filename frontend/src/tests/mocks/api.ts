// =============================================================================
// API Mock Utilities - Production Ready
// =============================================================================
// Comprehensive mocking utilities for API testing

import { vi } from 'vitest';

// Mock response types
export interface MockResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
}

export interface MockError {
  message: string;
  status?: number;
  code?: string;
  response?: {
    data: any;
    status: number;
    statusText: string;
  };
}

// API mock configuration
export interface ApiMockConfig {
  delay?: number;
  status?: number;
  headers?: Record<string, string>;
  shouldThrow?: boolean;
  error?: MockError;
}

// Mock data factories
export const mockUser = (overrides: Partial<any> = {}) => ({
  id: 'user123',
  email: 'test@cryptopulse.com',
  name: 'Test User',
  firstName: 'Test',
  lastName: 'User',
  avatar: 'https://example.com/avatar.jpg',
  isEmailVerified: true,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  ...overrides
});

export const mockTradingSession = (overrides: Partial<any> = {}) => ({
  id: 'session123',
  name: 'Test Trading Session',
  exchange: 'binance',
  strategy: 'test-strategy',
  status: 'active',
  userId: 'user123',
  config: {
    symbol: 'BTC/USDT',
    riskPercent: 2,
    maxPositions: 5
  },
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  ...overrides
});

export const mockPosition = (overrides: Partial<any> = {}) => ({
  id: 'position123',
  sessionId: 'session123',
  symbol: 'BTC/USDT',
  side: 'long',
  size: 0.1,
  price: 50000,
  status: 'open',
  pnl: 0,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  ...overrides
});

export const mockMarketData = (overrides: Partial<any> = {}) => ({
  symbol: 'BTC/USDT',
  price: 50000,
  change24h: 2.5,
  volume24h: 1000000,
  high24h: 51000,
  low24h: 49000,
  timestamp: '2024-01-01T00:00:00Z',
  ...overrides
});

export const mockOrderBook = (overrides: Partial<any> = {}) => ({
  symbol: 'BTC/USDT',
  bids: [
    [49999, 0.1],
    [49998, 0.2],
    [49997, 0.3]
  ],
  asks: [
    [50001, 0.1],
    [50002, 0.2],
    [50003, 0.3]
  ],
  timestamp: '2024-01-01T00:00:00Z',
  ...overrides
});

// Mock response helpers
export const createMockResponse = <T>(
  data: T,
  config: ApiMockConfig = {}
): MockResponse<T> => ({
  data,
  status: config.status || 200,
  statusText: config.status === 200 ? 'OK' : 'Error',
  headers: {
    'Content-Type': 'application/json',
    ...config.headers
  }
});

export const createMockError = (config: ApiMockConfig = {}): MockError => ({
  message: config.error?.message || 'Mock error',
  status: config.error?.status || config.status || 500,
  code: config.error?.code || 'MOCK_ERROR',
  response: config.error?.response || {
    data: { error: config.error?.message || 'Mock error' },
    status: config.error?.status || config.status || 500,
    statusText: 'Internal Server Error'
  }
});

// API client mock
export class ApiClientMock {
  private responses: Map<string, any> = new Map();
  private delays: Map<string, number> = new Map();
  private errors: Map<string, MockError> = new Map();

  // Set mock response for a specific endpoint
  mockGet<T>(endpoint: string, response: T, config: ApiMockConfig = {}) {
    this.responses.set(`GET:${endpoint}`, response);
    if (config.delay) this.delays.set(`GET:${endpoint}`, config.delay);
    if (config.shouldThrow || config.error) {
      this.errors.set(`GET:${endpoint}`, createMockError(config));
    }
  }

  mockPost<T>(endpoint: string, response: T, config: ApiMockConfig = {}) {
    this.responses.set(`POST:${endpoint}`, response);
    if (config.delay) this.delays.set(`POST:${endpoint}`, config.delay);
    if (config.shouldThrow || config.error) {
      this.errors.set(`POST:${endpoint}`, createMockError(config));
    }
  }

  mockPut<T>(endpoint: string, response: T, config: ApiMockConfig = {}) {
    this.responses.set(`PUT:${endpoint}`, response);
    if (config.delay) this.delays.set(`PUT:${endpoint}`, config.delay);
    if (config.shouldThrow || config.error) {
      this.errors.set(`PUT:${endpoint}`, createMockError(config));
    }
  }

  mockDelete<T>(endpoint: string, response: T, config: ApiMockConfig = {}) {
    this.responses.set(`DELETE:${endpoint}`, response);
    if (config.delay) this.delays.set(`DELETE:${endpoint}`, config.delay);
    if (config.shouldThrow || config.error) {
      this.errors.set(`DELETE:${endpoint}`, createMockError(config));
    }
  }

  // Simulate API call
  async call(method: string, endpoint: string, data?: any): Promise<any> {
    const key = `${method.toUpperCase()}:${endpoint}`;
    
    // Check for errors
    if (this.errors.has(key)) {
      const error = this.errors.get(key);
      throw error;
    }
    
    // Check for delay
    if (this.delays.has(key)) {
      await new Promise(resolve => setTimeout(resolve, this.delays.get(key)));
    }
    
    // Return mock response
    if (this.responses.has(key)) {
      const response = this.responses.get(key);
      return createMockResponse(response);
    }
    
    // Default response
    return createMockResponse({ success: true });
  }

  // Clear all mocks
  clear() {
    this.responses.clear();
    this.delays.clear();
    this.errors.clear();
  }

  // Get mock call history
  getCallHistory(): Array<{ method: string; endpoint: string; data?: any }> {
    // This would be implemented to track actual calls
    return [];
  }
}

// Vitest mock setup
export const setupApiMocks = () => {
  const apiClientMock = new ApiClientMock();
  
  // Mock the API client
  vi.mock('../../lib/api', () => ({
    apiClient: {
      get: vi.fn((endpoint: string) => apiClientMock.call('GET', endpoint)),
      post: vi.fn((endpoint: string, data?: any) => apiClientMock.call('POST', endpoint, data)),
      put: vi.fn((endpoint: string, data?: any) => apiClientMock.call('PUT', endpoint, data)),
      delete: vi.fn((endpoint: string) => apiClientMock.call('DELETE', endpoint))
    }
  }));

  return apiClientMock;
};

// Common mock scenarios
export const mockScenarios = {
  // Authentication scenarios
  auth: {
    successfulLogin: () => ({
      data: {
        success: true,
        user: mockUser(),
        tokens: {
          accessToken: 'mock-access-token',
          refreshToken: 'mock-refresh-token'
        }
      }
    }),
    
    failedLogin: () => ({
      status: 401,
      data: {
        success: false,
        error: 'Invalid credentials'
      }
    }),
    
    tokenExpired: () => ({
      status: 401,
      data: {
        success: false,
        error: 'Token expired'
      }
    }),
    
    successfulRegistration: () => ({
      status: 201,
      data: {
        success: true,
        user: mockUser(),
        tokens: {
          accessToken: 'mock-access-token',
          refreshToken: 'mock-refresh-token'
        }
      }
    }),
    
    emailAlreadyExists: () => ({
      status: 400,
      data: {
        success: false,
        error: 'User already exists with this email'
      }
    })
  },

  // Trading scenarios
  trading: {
    sessionsList: () => ({
      data: {
        success: true,
        sessions: [
          mockTradingSession({ id: 'session1', name: 'Session 1' }),
          mockTradingSession({ id: 'session2', name: 'Session 2' })
        ]
      }
    }),
    
    sessionDetails: (id: string) => ({
      data: {
        success: true,
        session: mockTradingSession({ id })
      }
    }),
    
    positionsList: () => ({
      data: {
        success: true,
        positions: [
          mockPosition({ id: 'position1', symbol: 'BTC/USDT' }),
          mockPosition({ id: 'position2', symbol: 'ETH/USDT' })
        ]
      }
    }),
    
    marketData: () => ({
      data: {
        success: true,
        prices: {
          'BTC/USDT': 50000,
          'ETH/USDT': 3000,
          'ADA/USDT': 0.5
        }
      }
    }),
    
    orderBook: () => ({
      data: {
        success: true,
        depth: mockOrderBook()
      }
    })
  },

  // Error scenarios
  errors: {
    networkError: () => {
      const error = new Error('Network error');
      error.name = 'NetworkError';
      throw error;
    },
    
    serverError: () => ({
      status: 500,
      data: {
        success: false,
        error: 'Internal server error'
      }
    }),
    
    validationError: () => ({
      status: 400,
      data: {
        success: false,
        error: 'Validation failed',
        details: ['Field is required', 'Invalid format']
      }
    }),
    
    unauthorized: () => ({
      status: 401,
      data: {
        success: false,
        error: 'Unauthorized'
      }
    }),
    
    forbidden: () => ({
      status: 403,
      data: {
        success: false,
        error: 'Forbidden'
      }
    }),
    
    notFound: () => ({
      status: 404,
      data: {
        success: false,
        error: 'Not found'
      }
    })
  }
};

// Mock data generators
export const generateMockData = {
  // Generate multiple users
  users: (count: number) => 
    Array.from({ length: count }, (_, i) => 
      mockUser({ 
        id: `user${i + 1}`, 
        email: `user${i + 1}@cryptopulse.com`,
        name: `User ${i + 1}`
      })
    ),

  // Generate multiple trading sessions
  tradingSessions: (count: number) => 
    Array.from({ length: count }, (_, i) => 
      mockTradingSession({ 
        id: `session${i + 1}`, 
        name: `Trading Session ${i + 1}`,
        status: i % 2 === 0 ? 'active' : 'paused'
      })
    ),

  // Generate multiple positions
  positions: (count: number) => 
    Array.from({ length: count }, (_, i) => 
      mockPosition({ 
        id: `position${i + 1}`,
        symbol: i % 2 === 0 ? 'BTC/USDT' : 'ETH/USDT',
        side: i % 2 === 0 ? 'long' : 'short',
        pnl: (Math.random() - 0.5) * 1000
      })
    ),

  // Generate market data for multiple symbols
  marketData: (symbols: string[]) => 
    symbols.reduce((acc, symbol) => {
      acc[symbol] = mockMarketData({ 
        symbol,
        price: Math.random() * 100000,
        change24h: (Math.random() - 0.5) * 10
      });
      return acc;
    }, {} as Record<string, any>),

  // Generate order book data
  orderBook: (symbol: string, levels: number = 10) => ({
    symbol,
    bids: Array.from({ length: levels }, (_, i) => [
      50000 - i * 10,
      Math.random() * 1
    ]),
    asks: Array.from({ length: levels }, (_, i) => [
      50000 + i * 10,
      Math.random() * 1
    ]),
    timestamp: new Date().toISOString()
  })
};

// Mock utility functions
export const mockUtils = {
  // Wait for a specified amount of time
  delay: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),

  // Generate random ID
  randomId: () => Math.random().toString(36).substr(2, 9),

  // Generate random email
  randomEmail: () => `${Math.random().toString(36).substr(2, 9)}@example.com`,

  // Generate random price
  randomPrice: (min: number = 1000, max: number = 100000) => 
    Math.random() * (max - min) + min,

  // Generate random percentage
  randomPercentage: (min: number = -100, max: number = 100) => 
    Math.random() * (max - min) + min,

  // Generate random boolean
  randomBoolean: () => Math.random() > 0.5,

  // Generate random array element
  randomElement: <T>(array: T[]): T => 
    array[Math.floor(Math.random() * array.length)],

  // Generate random date
  randomDate: (start: Date = new Date(2020, 0, 1), end: Date = new Date()) => 
    new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime())),

  // Generate random string
  randomString: (length: number = 10) => 
    Math.random().toString(36).substr(2, length),

  // Generate random number
  randomNumber: (min: number = 0, max: number = 100) => 
    Math.floor(Math.random() * (max - min + 1)) + min
};

// Export everything
export default {
  ApiClientMock,
  setupApiMocks,
  mockScenarios,
  generateMockData,
  mockUtils,
  mockUser,
  mockTradingSession,
  mockPosition,
  mockMarketData,
  mockOrderBook,
  createMockResponse,
  createMockError
};
