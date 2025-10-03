// =============================================================================
// Test Mocks Index - Production Ready
// =============================================================================
// Centralized export for all mock utilities

// API mocks
export * from './api';

// Storage mocks
export * from './storage';

// Component mocks
export * from './components';

// Re-export everything for convenience
export { default as apiMocks } from './api';
export { default as storageMocks } from './storage';
export { default as componentMocks } from './components';

// Mock setup function
export const setupAllMocks = (options: {
  api?: any;
  storage?: any;
  components?: any;
} = {}) => {
  // Setup API mocks
  const apiClientMock = require('./api').setupApiMocks();
  
  // Setup storage mocks
  const storageMocks = require('./storage').setupStorageMocks(options.storage);
  
  // Setup component mocks
  require('./components').setupComponentMocks();
  
  return {
    api: apiClientMock,
    storage: storageMocks,
    components: {}
  };
};

// Mock cleanup function
export const cleanupAllMocks = () => {
  // Clear all mocks
  vi.clearAllMocks();
  vi.resetAllMocks();
  vi.restoreAllMocks();
};

// Export vi for convenience
export { vi } from 'vitest';
