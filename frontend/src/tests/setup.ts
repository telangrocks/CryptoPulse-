// =============================================================================
// Vitest Test Setup for CryptoPulse Frontend
// =============================================================================
// Global test setup and configuration

import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers);

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
vi.stubGlobal('localStorage', localStorageMock);

// Mock sessionStorage
const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
vi.stubGlobal('sessionStorage', sessionStorageMock);

// Mock crypto
const cryptoMock = {
  randomUUID: vi.fn(() => 'mock-uuid'),
  getRandomValues: vi.fn((arr) => arr),
};
vi.stubGlobal('crypto', cryptoMock);

// Mock fetch
global.fetch = vi.fn();

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

// Mock environment variables
vi.stubEnv('NODE_ENV', 'test');
vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:1337');
vi.stubEnv('VITE_FRONTEND_URL', 'http://localhost:3000');

// Global test utilities
declare global {
  var testUtils: {
    createMockProps: (overrides?: Record<string, any>) => Record<string, any>;
    createMockUser: (overrides?: Record<string, any>) => any;
    createMockEvent: (overrides?: Record<string, any>) => Event;
  };
}

global.testUtils = {
  createMockProps: (overrides = {}) => ({
    className: 'test-class',
    ...overrides,
  }),
  
  createMockUser: (overrides = {}) => ({
    id: '1',
    email: 'test@example.com',
    name: 'Test User',
    ...overrides,
  }),
  
  createMockEvent: (overrides = {}) => ({
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
    target: { value: 'test' },
    ...overrides,
  }) as Event,
};
