module.exports = {
  // Test environment
  testEnvironment: 'node',
  
  // Test file patterns
  testMatch: [
    '**/__tests__/**/*.js',
    '**/?(*.)+(spec|test).js',
    '**/backend/tests/**/*.test.js'
  ],
  
  // Coverage configuration
  collectCoverage: true,
  collectCoverageFrom: [
    '**/*.js',
    '!**/node_modules/**',
    '!**/coverage/**',
    '!**/dist/**',
    '!**/build/**',
    '!**/migrations/**',
    '!**/test/**',
    '!**/tests/**',
    '!**/*.config.js',
    '!**/jest.config.js'
  ],
  
  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  
  // Coverage reporters
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov',
    'json'
  ],
  
  // Coverage directory
  coverageDirectory: 'coverage',
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/backend/tests/setup.js'],
  
  // Test timeout
  testTimeout: 30000,
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Restore mocks after each test
  restoreMocks: true,
  
  // Verbose output
  verbose: true,
  
  // Force exit after tests complete
  forceExit: true,
  
  // Detect open handles
  detectOpenHandles: true,
  
  // Detect leaks
  detectLeaks: true,
  
  // Module name mapping
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/backend/$1',
    '^@config/(.*)$': '<rootDir>/backend/config/$1',
    '^@database/(.*)$': '<rootDir>/backend/database/$1',
    '^@routes/(.*)$': '<rootDir>/backend/routes/$1',
    '^@utils/(.*)$': '<rootDir>/backend/$1',
    '^@tests/(.*)$': '<rootDir>/backend/tests/$1'
  },
  
  // Transform configuration
  transform: {
    '^.+\\.js$': 'babel-jest'
  },
  
  // Module file extensions
  moduleFileExtensions: ['js', 'json', 'node'],
  
  // Test path ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/coverage/',
    '/dist/',
    '/build/'
  ],
  
  // Coverage path ignore patterns
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/coverage/',
    '/dist/',
    '/build/',
    '/migrations/',
    '/test/',
    '/tests/',
    'setup.js',
    'jest.config.js'
  ],
  
  // Global setup
  globalSetup: '<rootDir>/backend/tests/globalSetup.js',
  
  // Global teardown
  globalTeardown: '<rootDir>/backend/tests/globalTeardown.js',
  
  // Test suites
  projects: [
    {
      displayName: 'unit',
      testMatch: ['<rootDir>/backend/tests/unit/**/*.test.js']
    },
    {
      displayName: 'integration',
      testMatch: ['<rootDir>/backend/tests/integration/**/*.test.js']
    },
    {
      displayName: 'e2e',
      testMatch: ['<rootDir>/backend/tests/e2e/**/*.test.js']
    },
    {
      displayName: 'api',
      testMatch: ['<rootDir>/backend/tests/api/**/*.test.js']
    },
    {
      displayName: 'security',
      testMatch: ['<rootDir>/backend/tests/security/**/*.test.js']
    },
    {
      displayName: 'performance',
      testMatch: ['<rootDir>/backend/tests/performance/**/*.test.js']
    }
  ],
  
  // Parallel execution
  maxWorkers: '50%',
  
  // Cache directory
  cacheDirectory: '<rootDir>/.jest-cache',
  
  // Watch plugins (removed - not needed for CI/production)
};
