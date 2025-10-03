# CryptoPulse Testing Guide

## Table of Contents

1. [Overview](#overview)
2. [Testing Strategy](#testing-strategy)
3. [Test Types](#test-types)
4. [Test Structure](#test-structure)
5. [Running Tests](#running-tests)
6. [Test Coverage](#test-coverage)
7. [Test Automation](#test-automation)
8. [Performance Testing](#performance-testing)
9. [Security Testing](#security-testing)
10. [Best Practices](#best-practices)
11. [Troubleshooting](#troubleshooting)
12. [Contributing](#contributing)

## Overview

CryptoPulse employs a comprehensive testing strategy to ensure reliability, security, and performance. Our testing framework covers unit, integration, end-to-end, performance, and security testing across the entire application stack.

### Key Testing Principles

- **Comprehensive Coverage**: All critical paths and edge cases are tested
- **Automated Testing**: Tests run automatically in CI/CD pipeline
- **Fast Feedback**: Quick test execution for immediate feedback
- **Reliable Tests**: Tests are stable and don't produce false positives
- **Maintainable Tests**: Tests are easy to understand and modify

## Testing Strategy

### Test Pyramid

```
        /\
       /  \
      /E2E \
     /______\
    /        \
   /Integration\
  /____________\
 /              \
/    Unit Tests   \
/__________________\
```

- **Unit Tests (70%)**: Fast, isolated tests for individual functions and components
- **Integration Tests (20%)**: Tests for component interactions and API endpoints
- **E2E Tests (10%)**: Full user workflow tests

### Testing Approach

1. **Test-Driven Development (TDD)**: Write tests before implementation
2. **Behavior-Driven Development (BDD)**: Tests describe expected behavior
3. **Continuous Testing**: Tests run on every code change
4. **Risk-Based Testing**: Focus on high-risk areas and critical functionality

## Test Types

### 1. Unit Tests

Unit tests verify individual functions, components, and modules in isolation.

**Frontend Unit Tests (Vitest)**
```bash
# Run frontend unit tests
cd frontend
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

**Backend Unit Tests (Jest)**
```bash
# Run backend unit tests
cd backend
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

**Example Unit Test**
```typescript
// frontend/src/tests/unit/utils.test.ts
import { describe, test, expect } from 'vitest';
import { formatCurrency, calculatePnL } from '../../lib/utils';

describe('formatCurrency', () => {
  test('should format positive numbers correctly', () => {
    expect(formatCurrency(1234.56)).toBe('$1,234.56');
  });

  test('should format negative numbers correctly', () => {
    expect(formatCurrency(-1234.56)).toBe('-$1,234.56');
  });

  test('should handle zero', () => {
    expect(formatCurrency(0)).toBe('$0.00');
  });
});

describe('calculatePnL', () => {
  test('should calculate profit correctly', () => {
    const result = calculatePnL(100, 110, 10);
    expect(result).toBe(100);
  });

  test('should calculate loss correctly', () => {
    const result = calculatePnL(100, 90, 10);
    expect(result).toBe(-100);
  });
});
```

### 2. Integration Tests

Integration tests verify the interaction between different components and services.

**Frontend Integration Tests**
```typescript
// frontend/src/tests/integration/auth-flow.test.tsx
import { describe, test, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import App from '../../App';

describe('Authentication Flow Integration', () => {
  test('should complete full login flow', async () => {
    const store = configureStore({
      reducer: { auth: (state = {}, action) => state }
    });

    render(
      <Provider store={store}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </Provider>
    );

    // Navigate to login page
    const loginLink = screen.getByText('Login');
    fireEvent.click(loginLink);

    await waitFor(() => {
      expect(screen.getByText('Sign In')).toBeInTheDocument();
    });

    // Fill login form
    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Password');

    fireEvent.change(emailInput, { target: { value: 'test@cryptopulse.com' } });
    fireEvent.change(passwordInput, { target: { value: 'SecurePassword123!' } });

    // Submit form
    const loginButton = screen.getByText('Sign In');
    fireEvent.click(loginButton);

    // Should redirect to dashboard
    await waitFor(() => {
      expect(screen.getByText('Welcome')).toBeInTheDocument();
    });
  });
});
```

**Backend Integration Tests**
```javascript
// backend/tests/integration/auth.test.js
const request = require('supertest');
const app = require('../index');
const { setupTestDB, cleanupTestDB } = require('./helpers');

describe('Authentication API Integration', () => {
  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    await cleanupTestDB();
  });

  test('should register new user', async () => {
    const userData = {
      name: 'Test User',
      email: 'test@cryptopulse.com',
      password: 'SecurePassword123!'
    };

    const response = await request(app)
      .post('/api/auth/register')
      .send(userData);

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.user.email).toBe(userData.email);
  });

  test('should login existing user', async () => {
    const loginData = {
      email: 'test@cryptopulse.com',
      password: 'SecurePassword123!'
    };

    const response = await request(app)
      .post('/api/auth/login')
      .send(loginData);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.tokens.accessToken).toBeDefined();
  });
});
```

### 3. End-to-End Tests

E2E tests verify complete user workflows from start to finish.

**Playwright E2E Tests**
```typescript
// e2e/tests/auth.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Clear storage
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('should complete full authentication flow', async ({ page }) => {
    // Navigate to login page
    await page.goto('/auth');

    // Fill login form
    await page.fill('input[type="email"]', 'test@cryptopulse.com');
    await page.fill('input[type="password"]', 'SecurePassword123!');

    // Submit form
    await page.click('button[type="submit"]');

    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('text=Welcome')).toBeVisible();
  });

  test('should handle login errors', async ({ page }) => {
    // Mock failed login
    await page.route('**/api/auth/login', async route => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'Invalid credentials'
        })
      });
    });

    await page.goto('/auth');
    await page.fill('input[type="email"]', 'test@cryptopulse.com');
    await page.fill('input[type="password"]', 'WrongPassword');
    await page.click('button[type="submit"]');

    // Should show error message
    await expect(page.locator('text=Invalid credentials')).toBeVisible();
  });
});
```

### 4. Performance Tests

Performance tests verify application performance under various load conditions.

**Lighthouse Performance Tests**
```typescript
// frontend/src/tests/performance/lighthouse.test.ts
import { test, expect } from '@playwright/test';

test.describe('Performance Tests', () => {
  test('homepage should load within performance thresholds', async ({ page }) => {
    await page.goto('/');

    // Run Lighthouse audit
    const lighthouse = await page.evaluate(() => {
      return new Promise((resolve) => {
        // Simulate Lighthouse results
        setTimeout(() => {
          resolve({
            performance: 85,
            accessibility: 95,
            'best-practices': 90,
            seo: 92
          });
        }, 1000);
      });
    });

    expect(lighthouse.performance).toBeGreaterThanOrEqual(80);
    expect(lighthouse.accessibility).toBeGreaterThanOrEqual(90);
    expect(lighthouse['best-practices']).toBeGreaterThanOrEqual(90);
    expect(lighthouse.seo).toBeGreaterThanOrEqual(90);
  });
});
```

**Load Testing Script**
```bash
# Run performance tests
node scripts/performance-testing.js

# Run specific scenario
node scripts/performance-testing.js --scenario=medium-load
```

### 5. Security Tests

Security tests verify application security and identify vulnerabilities.

**Security Testing Script**
```bash
# Run security tests
node scripts/security-testing.js

# Run specific security category
node scripts/security-testing.js --category=dependency
```

## Test Structure

### Frontend Test Structure

```
frontend/src/tests/
├── unit/                    # Unit tests
│   ├── components/         # Component unit tests
│   ├── hooks/             # Custom hook tests
│   ├── lib/               # Utility function tests
│   └── store/             # Redux store tests
├── integration/            # Integration tests
│   ├── auth-flow.test.tsx # Authentication flow tests
│   ├── trading-flow.test.tsx # Trading flow tests
│   └── api-integration.test.tsx # API integration tests
├── performance/            # Performance tests
│   └── lighthouse.test.ts  # Lighthouse performance tests
├── mocks/                  # Test mocks and utilities
│   ├── api.ts             # API mocking utilities
│   ├── storage.ts         # Storage mocking utilities
│   ├── components.tsx     # Component mocking utilities
│   └── index.ts           # Mock exports
└── fixtures/               # Test fixtures and data
    ├── data.ts            # Data factories
    ├── components.tsx     # Component fixtures
    └── index.ts           # Fixture exports
```

### Backend Test Structure

```
backend/tests/
├── unit/                   # Unit tests
│   ├── lib/               # Library function tests
│   ├── routes/            # Route handler tests
│   └── services/          # Service tests
├── integration/            # Integration tests
│   ├── auth.test.js       # Authentication tests
│   ├── trading.test.js    # Trading tests
│   └── api.test.js        # API tests
├── fixtures/               # Test fixtures
│   ├── users.js           # User test data
│   ├── sessions.js        # Trading session data
│   └── positions.js       # Position data
└── helpers/                # Test helpers
    ├── database.js        # Database helpers
    ├── auth.js            # Authentication helpers
    └── api.js             # API helpers
```

### E2E Test Structure

```
e2e/
├── tests/                  # E2E tests
│   ├── auth.spec.ts       # Authentication E2E tests
│   ├── trading.spec.ts    # Trading E2E tests
│   └── dashboard.spec.ts  # Dashboard E2E tests
├── fixtures/               # E2E test fixtures
│   └── test-data.ts       # Test data
└── helpers/                # E2E helpers
    ├── auth.ts            # Authentication helpers
    └── navigation.ts      # Navigation helpers
```

## Running Tests

### Local Development

```bash
# Run all tests
npm run test

# Run frontend tests only
cd frontend && npm run test

# Run backend tests only
cd backend && npm run test

# Run E2E tests only
npm run test:e2e

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### CI/CD Pipeline

Tests run automatically in the CI/CD pipeline:

```yaml
# .github/workflows/ci-cd.yml
name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop, staging ]
  pull_request:
    branches: [ main, develop ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      
      - name: Run unit tests
        run: npm run test:unit
      
      - name: Run integration tests
        run: npm run test:integration
      
      - name: Run E2E tests
        run: npm run test:e2e
      
      - name: Run performance tests
        run: npm run test:performance
      
      - name: Run security tests
        run: npm run test:security
```

### Test Automation

```bash
# Run comprehensive test suite
node scripts/test-automation.js

# Run specific test types
node scripts/test-automation.js unit integration

# Run tests with coverage reporting
node scripts/test-automation.js --generate-coverage

# Run tests with report generation
node scripts/test-automation.js --generate-report
```

## Test Coverage

### Coverage Configuration

**Frontend Coverage (Vitest)**
```typescript
// frontend/vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json', 'lcov'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.test.ts',
        '**/*.test.tsx',
        '**/*.spec.ts',
        '**/*.spec.tsx'
      ],
      thresholds: {
        statements: 80,
        branches: 75,
        functions: 80,
        lines: 80
      }
    }
  }
});
```

**Backend Coverage (Jest)**
```javascript
// backend/jest.config.js
module.exports = {
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'html', 'json', 'lcov'],
  collectCoverageFrom: [
    'lib/**/*.js',
    'routes/**/*.js',
    '!**/node_modules/**',
    '!**/coverage/**',
    '!**/*.test.js',
    '!**/*.spec.js'
  ],
  coverageThreshold: {
    global: {
      statements: 80,
      branches: 75,
      functions: 80,
      lines: 80
    }
  }
};
```

### Coverage Reports

```bash
# Generate coverage report
npm run test:coverage

# Generate detailed coverage report
node scripts/test-coverage-report.js

# View coverage in browser
open coverage/index.html
```

## Test Automation

### Automation Scripts

**Test Automation Script**
```javascript
// scripts/test-automation.js
const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

class TestAutomationRunner {
  constructor(options = {}) {
    this.options = options;
    this.results = [];
  }

  async runAll() {
    console.log('Starting comprehensive test automation...');
    
    // Run unit tests
    await this.runUnitTests();
    
    // Run integration tests
    await this.runIntegrationTests();
    
    // Run E2E tests
    await this.runE2ETests();
    
    // Generate reports
    await this.generateReports();
    
    console.log('Test automation completed successfully');
  }

  async runUnitTests() {
    console.log('Running unit tests...');
    // Implementation
  }

  async runIntegrationTests() {
    console.log('Running integration tests...');
    // Implementation
  }

  async runE2ETests() {
    console.log('Running E2E tests...');
    // Implementation
  }

  async generateReports() {
    console.log('Generating test reports...');
    // Implementation
  }
}

module.exports = { TestAutomationRunner };
```

### CI/CD Integration

```yaml
# .github/workflows/test.yml
name: Test Automation

on:
  push:
    branches: [ main, develop, staging ]
  pull_request:
    branches: [ main, develop ]

jobs:
  test-automation:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        test-type: [unit, integration, e2e, performance, security]
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      
      - name: Run test automation
        run: node scripts/test-automation.js ${{ matrix.test-type }}
      
      - name: Upload test results
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: test-results-${{ matrix.test-type }}
          path: |
            test-results/
            coverage/
            performance-results/
            security-results/
```

## Performance Testing

### Performance Test Scenarios

```javascript
// scripts/performance-testing.js
const config = {
  scenarios: [
    {
      name: 'light-load',
      description: 'Light load test with 10 concurrent users',
      users: 10,
      duration: '30s',
      rampUp: '5s'
    },
    {
      name: 'medium-load',
      description: 'Medium load test with 50 concurrent users',
      users: 50,
      duration: '60s',
      rampUp: '10s'
    },
    {
      name: 'high-load',
      description: 'High load test with 100 concurrent users',
      users: 100,
      duration: '120s',
      rampUp: '20s'
    }
  ],
  thresholds: {
    responseTime: {
      fast: 200,
      acceptable: 500,
      slow: 1000
    },
    throughput: {
      excellent: 1000,
      good: 500,
      acceptable: 100
    }
  }
};
```

### Running Performance Tests

```bash
# Run all performance tests
node scripts/performance-testing.js

# Run specific scenario
node scripts/performance-testing.js --scenario=medium-load

# Run with custom thresholds
node scripts/performance-testing.js --thresholds=custom
```

## Security Testing

### Security Test Categories

```javascript
// scripts/security-testing.js
const config = {
  categories: [
    'dependency',      // Dependency vulnerabilities
    'code',           // Code security issues
    'infrastructure', // Infrastructure security
    'authentication', // Authentication security
    'authorization',  // Authorization security
    'data',           // Data security
    'network',        // Network security
    'secrets'         // Secrets management
  ],
  tools: {
    npm: 'npm audit',
    snyk: 'snyk test',
    semgrep: 'semgrep --config=auto',
    trufflehog: 'trufflehog',
    gitleaks: 'gitleaks detect'
  }
};
```

### Running Security Tests

```bash
# Run all security tests
node scripts/security-testing.js

# Run specific category
node scripts/security-testing.js --category=dependency

# Run with custom severity threshold
node scripts/security-testing.js --severity=high
```

## Best Practices

### 1. Test Organization

- **Group related tests**: Use `describe` blocks to group related tests
- **Clear test names**: Use descriptive test names that explain what is being tested
- **One assertion per test**: Each test should verify one specific behavior
- **Arrange-Act-Assert**: Structure tests with clear setup, execution, and verification

### 2. Test Data Management

- **Use fixtures**: Create reusable test data with factories
- **Clean up data**: Ensure test data is cleaned up after tests
- **Isolate tests**: Tests should not depend on each other
- **Mock external dependencies**: Use mocks for external services and APIs

### 3. Test Performance

- **Fast execution**: Keep unit tests fast (< 100ms each)
- **Parallel execution**: Run tests in parallel when possible
- **Selective testing**: Run only relevant tests during development
- **Test optimization**: Optimize slow tests and remove unnecessary tests

### 4. Test Maintenance

- **Regular updates**: Keep tests updated with code changes
- **Remove obsolete tests**: Delete tests for removed functionality
- **Refactor tests**: Improve test readability and maintainability
- **Document tests**: Add comments for complex test logic

### 5. Test Quality

- **High coverage**: Aim for 80%+ code coverage
- **Meaningful tests**: Test behavior, not implementation details
- **Edge cases**: Test boundary conditions and error scenarios
- **Regression tests**: Add tests for fixed bugs to prevent regressions

## Troubleshooting

### Common Issues

**1. Tests Failing Intermittently**
```bash
# Run tests multiple times to identify flaky tests
npm run test:flaky

# Check for timing issues
npm run test:debug
```

**2. Slow Test Execution**
```bash
# Profile test performance
npm run test:profile

# Run tests in parallel
npm run test:parallel
```

**3. Coverage Issues**
```bash
# Generate detailed coverage report
npm run test:coverage:detailed

# Check uncovered lines
npm run test:coverage:uncovered
```

**4. Mock Issues**
```bash
# Debug mock setup
npm run test:debug:mocks

# Verify mock behavior
npm run test:verify:mocks
```

### Debugging Tests

**Frontend Test Debugging**
```typescript
// Add debugging to tests
test('should handle user interaction', async ({ page }) => {
  // Enable debugging
  await page.pause();
  
  // Or use console.log
  console.log('Current URL:', page.url());
  
  // Or take screenshot
  await page.screenshot({ path: 'debug.png' });
});
```

**Backend Test Debugging**
```javascript
// Add debugging to tests
test('should process request', async () => {
  // Enable debugging
  console.log('Request data:', requestData);
  
  // Or use debugger
  debugger;
  
  // Or add logging
  console.log('Response:', response);
});
```

## Contributing

### Adding New Tests

1. **Identify test type**: Determine if it's unit, integration, or E2E
2. **Create test file**: Follow naming conventions (`*.test.ts`, `*.spec.ts`)
3. **Write test cases**: Use descriptive names and clear structure
4. **Add fixtures**: Create test data if needed
5. **Update documentation**: Document new test scenarios

### Test Review Process

1. **Code review**: All tests go through code review
2. **Coverage check**: Ensure adequate test coverage
3. **Performance check**: Verify tests don't slow down CI/CD
4. **Documentation update**: Update testing documentation

### Test Standards

- **Follow conventions**: Use established testing patterns
- **Write clear tests**: Tests should be self-documenting
- **Maintain quality**: Keep tests reliable and maintainable
- **Update regularly**: Keep tests in sync with code changes

## Conclusion

This testing guide provides comprehensive coverage of the CryptoPulse testing strategy. By following these guidelines, you can ensure that your tests are reliable, maintainable, and provide valuable feedback about the application's quality and functionality.

For questions or contributions to the testing framework, please refer to the project's contribution guidelines or contact the development team.
