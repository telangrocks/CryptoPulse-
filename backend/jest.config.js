// =============================================================================
// Jest Configuration for CryptoPulse Backend
// =============================================================================
// Production-ready Jest configuration

module.exports = {
  // Test environment
  testEnvironment: 'node',

  // Test file patterns
  testMatch: [
    '**/tests/**/*.test.js',
    '**/tests/**/*.spec.js',
    '**/__tests__/**/*.js',
    '**/?(*.)+(spec|test).js'
  ],

  // Coverage configuration
  collectCoverage: true,
  collectCoverageFrom: [
    '**/*.js',
    '!**/node_modules/**',
    '!**/coverage/**',
    '!**/tests/**',
    '!jest.config.js',
    '!**/dist/**',
    '!**/build/**'
  ],

  // Coverage thresholds (production ready - minimal for backend)
  coverageThreshold: {
    global: {
      branches: 0.25,
      functions: 0.25,
      lines: 0.25,
      statements: 0.25
    }
  },

  // Coverage reporters
  coverageReporters: [
    'text',
    'lcov',
    'html',
    'json-summary'
  ],

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],

  // Module paths
  moduleDirectories: ['node_modules', '<rootDir>'],

  // Test timeout
  testTimeout: 30000,

  // Clear mocks between tests
  clearMocks: true,

  // Restore mocks after each test
  restoreMocks: true,

  // Verbose output
  verbose: true,

  // Error handling
  errorOnDeprecated: true,

  // Transform configuration
  transform: {
    '^.+\\.js$': 'babel-jest'
  },

  // Module file extensions
  moduleFileExtensions: ['js', 'json', 'node'],

  // Global variables
  globals: {
    NODE_ENV: 'test'
  }
};
