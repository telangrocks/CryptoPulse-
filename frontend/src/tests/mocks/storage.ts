// =============================================================================
// Storage Mock Utilities - Production Ready
// =============================================================================
// Comprehensive mocking utilities for storage testing

import { vi } from 'vitest';

// Mock storage types
export interface MockStorageData {
  [key: string]: string;
}

export interface MockStorageOptions {
  initialData?: MockStorageData;
  throwOnAccess?: boolean;
  throwOnSet?: boolean;
  throwOnRemove?: boolean;
  throwOnClear?: boolean;
}

// LocalStorage mock
export class MockLocalStorage {
  private storage: MockStorageData;
  private options: MockStorageOptions;

  constructor(options: MockStorageOptions = {}) {
    this.options = options;
    this.storage = { ...options.initialData };
  }

  getItem(key: string): string | null {
    if (this.options.throwOnAccess) {
      throw new Error('Mock localStorage access error');
    }
    return this.storage[key] || null;
  }

  setItem(key: string, value: string): void {
    if (this.options.throwOnSet) {
      throw new Error('Mock localStorage set error');
    }
    this.storage[key] = value;
  }

  removeItem(key: string): void {
    if (this.options.throwOnRemove) {
      throw new Error('Mock localStorage remove error');
    }
    delete this.storage[key];
  }

  clear(): void {
    if (this.options.throwOnClear) {
      throw new Error('Mock localStorage clear error');
    }
    this.storage = {};
  }

  key(index: number): string | null {
    const keys = Object.keys(this.storage);
    return keys[index] || null;
  }

  get length(): number {
    return Object.keys(this.storage).length;
  }

  // Additional methods for testing
  getStorage(): MockStorageData {
    return { ...this.storage };
  }

  setStorage(data: MockStorageData): void {
    this.storage = { ...data };
  }

  hasItem(key: string): boolean {
    return key in this.storage;
  }

  getKeys(): string[] {
    return Object.keys(this.storage);
  }

  getValues(): string[] {
    return Object.values(this.storage);
  }
}

// SessionStorage mock
export class MockSessionStorage {
  private storage: MockStorageData;
  private options: MockStorageOptions;

  constructor(options: MockStorageOptions = {}) {
    this.options = options;
    this.storage = { ...options.initialData };
  }

  getItem(key: string): string | null {
    if (this.options.throwOnAccess) {
      throw new Error('Mock sessionStorage access error');
    }
    return this.storage[key] || null;
  }

  setItem(key: string, value: string): void {
    if (this.options.throwOnSet) {
      throw new Error('Mock sessionStorage set error');
    }
    this.storage[key] = value;
  }

  removeItem(key: string): void {
    if (this.options.throwOnRemove) {
      throw new Error('Mock sessionStorage remove error');
    }
    delete this.storage[key];
  }

  clear(): void {
    if (this.options.throwOnClear) {
      throw new Error('Mock sessionStorage clear error');
    }
    this.storage = {};
  }

  key(index: number): string | null {
    const keys = Object.keys(this.storage);
    return keys[index] || null;
  }

  get length(): number {
    return Object.keys(this.storage).length;
  }

  // Additional methods for testing
  getStorage(): MockStorageData {
    return { ...this.storage };
  }

  setStorage(data: MockStorageData): void {
    this.storage = { ...data };
  }

  hasItem(key: string): boolean {
    return key in this.storage;
  }

  getKeys(): string[] {
    return Object.keys(this.storage);
  }

  getValues(): string[] {
    return Object.values(this.storage);
  }
}

// SecureStorage mock
export class MockSecureStorage {
  private storage: MockStorageData;
  private options: MockStorageOptions;

  constructor(options: MockStorageOptions = {}) {
    this.options = options;
    this.storage = { ...options.initialData };
  }

  set(key: string, value: any): void {
    if (this.options.throwOnSet) {
      throw new Error('Mock secureStorage set error');
    }
    this.storage[key] = JSON.stringify(value);
  }

  get(key: string): any {
    if (this.options.throwOnAccess) {
      throw new Error('Mock secureStorage access error');
    }
    const value = this.storage[key];
    if (value === undefined) return null;
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  remove(key: string): void {
    if (this.options.throwOnRemove) {
      throw new Error('Mock secureStorage remove error');
    }
    delete this.storage[key];
  }

  clear(): void {
    if (this.options.throwOnClear) {
      throw new Error('Mock secureStorage clear error');
    }
    this.storage = {};
  }

  clearAll(): void {
    this.clear();
  }

  // Additional methods for testing
  getStorage(): MockStorageData {
    return { ...this.storage };
  }

  setStorage(data: MockStorageData): void {
    this.storage = { ...data };
  }

  hasItem(key: string): boolean {
    return key in this.storage;
  }

  getKeys(): string[] {
    return Object.keys(this.storage);
  }

  getValues(): string[] {
    return Object.values(this.storage);
  }
}

// Storage mock setup for Vitest
export const setupStorageMocks = (options: {
  localStorage?: MockStorageOptions;
  sessionStorage?: MockStorageOptions;
  secureStorage?: MockStorageOptions;
} = {}) => {
  const mockLocalStorage = new MockLocalStorage(options.localStorage);
  const mockSessionStorage = new MockSessionStorage(options.sessionStorage);
  const mockSecureStorage = new MockSecureStorage(options.secureStorage);

  // Mock localStorage
  Object.defineProperty(window, 'localStorage', {
    value: mockLocalStorage,
    writable: true
  });

  // Mock sessionStorage
  Object.defineProperty(window, 'sessionStorage', {
    value: mockSessionStorage,
    writable: true
  });

  // Mock secureStorage
  vi.mock('../../lib/secureStorage', () => ({
    SecureStorage: vi.fn().mockImplementation(() => mockSecureStorage)
  }));

  return {
    localStorage: mockLocalStorage,
    sessionStorage: mockSessionStorage,
    secureStorage: mockSecureStorage
  };
};

// Storage test utilities
export const storageTestUtils = {
  // Create test data
  createTestData: (count: number = 5): MockStorageData => {
    const data: MockStorageData = {};
    for (let i = 0; i < count; i++) {
      data[`key${i}`] = `value${i}`;
    }
    return data;
  },

  // Create auth test data
  createAuthData: () => ({
    authToken: 'mock-auth-token',
    refreshToken: 'mock-refresh-token',
    user: JSON.stringify({
      id: 'user123',
      email: 'test@cryptopulse.com',
      name: 'Test User'
    })
  }),

  // Create trading test data
  createTradingData: () => ({
    tradingSessions: JSON.stringify([
      {
        id: 'session1',
        name: 'Test Session 1',
        status: 'active'
      },
      {
        id: 'session2',
        name: 'Test Session 2',
        status: 'paused'
      }
    ]),
    marketData: JSON.stringify({
      'BTC/USDT': 50000,
      'ETH/USDT': 3000
    })
  }),

  // Create settings test data
  createSettingsData: () => ({
    theme: 'dark',
    language: 'en',
    notifications: JSON.stringify({
      email: true,
      push: false,
      sms: false
    }),
    preferences: JSON.stringify({
      autoSave: true,
      confirmActions: true,
      showAdvanced: false
    })
  }),

  // Verify storage content
  verifyStorage: (
    storage: MockLocalStorage | MockSessionStorage | MockSecureStorage,
    expectedData: MockStorageData
  ) => {
    const actualData = storage.getStorage();
    expect(actualData).toEqual(expectedData);
  },

  // Verify storage has specific keys
  verifyStorageKeys: (
    storage: MockLocalStorage | MockSessionStorage | MockSecureStorage,
    expectedKeys: string[]
  ) => {
    const actualKeys = storage.getKeys();
    expectedKeys.forEach(key => {
      expect(actualKeys).toContain(key);
    });
  },

  // Verify storage doesn't have specific keys
  verifyStorageNotKeys: (
    storage: MockLocalStorage | MockSessionStorage | MockSecureStorage,
    unexpectedKeys: string[]
  ) => {
    const actualKeys = storage.getKeys();
    unexpectedKeys.forEach(key => {
      expect(actualKeys).not.toContain(key);
    });
  },

  // Verify storage is empty
  verifyStorageEmpty: (
    storage: MockLocalStorage | MockSessionStorage | MockSecureStorage
  ) => {
    expect(storage.length).toBe(0);
    expect(storage.getKeys()).toHaveLength(0);
  },

  // Verify storage has specific value
  verifyStorageValue: (
    storage: MockLocalStorage | MockSessionStorage | MockSecureStorage,
    key: string,
    expectedValue: string
  ) => {
    const actualValue = storage.getItem(key);
    expect(actualValue).toBe(expectedValue);
  },

  // Verify secure storage has specific value
  verifySecureStorageValue: (
    storage: MockSecureStorage,
    key: string,
    expectedValue: any
  ) => {
    const actualValue = storage.get(key);
    expect(actualValue).toEqual(expectedValue);
  }
};

// Storage mock scenarios
export const storageScenarios = {
  // Empty storage
  empty: () => ({}),

  // Storage with auth data
  withAuth: () => storageTestUtils.createAuthData(),

  // Storage with trading data
  withTrading: () => storageTestUtils.createTradingData(),

  // Storage with settings
  withSettings: () => storageTestUtils.createSettingsData(),

  // Storage with all data
  withAll: () => ({
    ...storageTestUtils.createAuthData(),
    ...storageTestUtils.createTradingData(),
    ...storageTestUtils.createSettingsData()
  }),

  // Storage with corrupted data
  withCorrupted: () => ({
    validKey: 'validValue',
    corruptedKey: '{"invalid": json}',
    emptyKey: '',
    nullKey: 'null'
  }),

  // Storage with large data
  withLarge: () => {
    const data: MockStorageData = {};
    for (let i = 0; i < 1000; i++) {
      data[`key${i}`] = `value${i}`.repeat(100);
    }
    return data;
  }
};

// Storage error scenarios
export const storageErrorScenarios = {
  // Access errors
  accessError: () => ({
    throwOnAccess: true
  }),

  // Set errors
  setError: () => ({
    throwOnSet: true
  }),

  // Remove errors
  removeError: () => ({
    throwOnRemove: true
  }),

  // Clear errors
  clearError: () => ({
    throwOnClear: true
  }),

  // All errors
  allErrors: () => ({
    throwOnAccess: true,
    throwOnSet: true,
    throwOnRemove: true,
    throwOnClear: true
  })
};

// Export everything
export default {
  MockLocalStorage,
  MockSessionStorage,
  MockSecureStorage,
  setupStorageMocks,
  storageTestUtils,
  storageScenarios,
  storageErrorScenarios
};
