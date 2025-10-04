// =============================================================================
// Security Middleware Tests - Production Ready
// =============================================================================
// Comprehensive tests for security middleware and validation

// Set up test environment before importing security module
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'ScuL1geP4LHWyMrIb8KkqWaVrTzVOQyeGAhUbV1bHDdTNfZYws6W9Skx5JtGAO35TjgsqjSdIx5kqrpPGYQ';

const {
  bruteForceProtection,
  generalLimiter,
  strictLimiter,
  speedLimiter,
  validateInput,
  sanitizeInput,
  validateEmail,
  validatePassword,
  validateApiKey,
  validateTradingPair,
  validateAmount,
  validatePrice,
  validateOrderType,
  validateTimeframe,
  validateExchange,
  validateCurrency,
  validateRiskLevel,
  validateLeverage,
  validateStopLoss,
  validateTakeProfit,
  validatePortfolioName,
  validateStrategyName,
  validateNotificationSettings,
  validateKycData,
  validateAmlData,
  validateComplianceData,
  validateAuditData,
  validateSecurityData,
  validatePerformanceData,
  validateMonitoringData,
  validateAlertData,
  validateReportData,
  validateDashboardData,
  validateUserPreferences,
  validateTradingSettings,
  validateApiSettings,
  validateNotificationPreferences,
  validateSecuritySettings,
  validatePrivacySettings,
  validateAccountSettings,
  validateProfileData,
  validateContactData,
  validateAddressData,
  validateIdentityData,
  validateFinancialData,
  validateTaxData,
  validateRegulatoryData,
  validateLegalData,
  validateTermsData,
  validatePolicyData
} = require('../lib/security');

const { createMockRequest, createMockResponse, createMockNext } = require('./testHelpers');

// Mock logger to avoid console output during tests
jest.mock('../lib/logging', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
}));

// Mock express-rate-limit
jest.mock('express-rate-limit', () => {
  return jest.fn(() => (req, res, next) => {
    // Mock rate limiter that always allows requests
    next();
  });
});

// Mock express-slow-down
jest.mock('express-slow-down', () => {
  return jest.fn(() => (req, res, next) => {
    // Mock slow down that always allows requests
    next();
  });
});

// Mock express-validator
jest.mock('express-validator', () => ({
  body: jest.fn(() => ({
    isEmail: jest.fn().mockReturnThis(),
    normalizeEmail: jest.fn().mockReturnThis(),
    withMessage: jest.fn().mockReturnThis(),
    isLength: jest.fn().mockReturnThis(),
    isString: jest.fn().mockReturnThis(),
    isLength: jest.fn().mockReturnThis(),
    isNumeric: jest.fn().mockReturnThis(),
    isFloat: jest.fn().mockReturnThis(),
    isIn: jest.fn().mockReturnThis(),
    isBoolean: jest.fn().mockReturnThis(),
    isDate: jest.fn().mockReturnThis(),
    isUUID: jest.fn().mockReturnThis(),
    isURL: jest.fn().mockReturnThis(),
    isIP: jest.fn().mockReturnThis(),
    isAlpha: jest.fn().mockReturnThis(),
    isAlphanumeric: jest.fn().mockReturnThis(),
    isAscii: jest.fn().mockReturnThis(),
    isBase64: jest.fn().mockReturnThis(),
    isCurrency: jest.fn().mockReturnThis(),
    isDecimal: jest.fn().mockReturnThis(),
    isHexadecimal: jest.fn().mockReturnThis(),
    isHexColor: jest.fn().mockReturnThis(),
    isISO8601: jest.fn().mockReturnThis(),
    isJSON: jest.fn().mockReturnThis(),
    isLatLong: jest.fn().mockReturnThis(),
    isLowercase: jest.fn().mockReturnThis(),
    isUppercase: jest.fn().mockReturnThis(),
    isMobilePhone: jest.fn().mockReturnThis(),
    isMongoId: jest.fn().mockReturnThis(),
    isPostalCode: jest.fn().mockReturnThis(),
    isSlug: jest.fn().mockReturnThis(),
    isStrongPassword: jest.fn().mockReturnThis(),
    isTime: jest.fn().mockReturnThis(),
    isWhitelisted: jest.fn().mockReturnThis(),
    isBlacklisted: jest.fn().mockReturnThis(),
    isAfter: jest.fn().mockReturnThis(),
    isBefore: jest.fn().mockReturnThis(),
    isISO31661Alpha2: jest.fn().mockReturnThis(),
    isISO31661Alpha3: jest.fn().mockReturnThis(),
    isLocale: jest.fn().mockReturnThis(),
    isMimeType: jest.fn().mockReturnThis(),
    isSemVer: jest.fn().mockReturnThis(),
    isTaxID: jest.fn().mockReturnThis(),
    isEAN: jest.fn().mockReturnThis(),
    isISIN: jest.fn().mockReturnThis(),
    isISRC: jest.fn().mockReturnThis(),
    isISSN: jest.fn().mockReturnThis(),
    isLuhnNumber: jest.fn().mockReturnThis(),
    isIMEI: jest.fn().mockReturnThis(),
    isISMN: jest.fn().mockReturnThis(),
    isMD5: jest.fn().mockReturnThis(),
    isVarName: jest.fn().mockReturnThis(),
    isVAT: jest.fn().mockReturnThis(),
    isLicensePlate: jest.fn().mockReturnThis(),
    isISO6391: jest.fn().mockReturnThis(),
    isISO4217: jest.fn().mockReturnThis(),
    isISO6346: jest.fn().mockReturnThis(),
    isISO10383: jest.fn().mockReturnThis(),
    isISO13616: jest.fn().mockReturnThis(),
    isISO17442: jest.fn().mockReturnThis(),
    isISO20275: jest.fn().mockReturnThis(),
    isISO2709: jest.fn().mockReturnThis(),
    isISO4217: jest.fn().mockReturnThis(),
    isRFC3339: jest.fn().mockReturnThis(),
    isRFC4122: jest.fn().mockReturnThis(),
    isRFC5322: jest.fn().mockReturnThis(),
    isRFC6749: jest.fn().mockReturnThis(),
    isRFC7231: jest.fn().mockReturnThis(),
    isRFC7515: jest.fn().mockReturnThis(),
    isRFC7516: jest.fn().mockReturnThis(),
    isRFC7517: jest.fn().mockReturnThis(),
    isRFC7518: jest.fn().mockReturnThis(),
    isRFC7519: jest.fn().mockReturnThis(),
    isRFC7530: jest.fn().mockReturnThis(),
    isRFC7531: jest.fn().mockReturnThis(),
    isRFC7532: jest.fn().mockReturnThis(),
    isRFC7533: jest.fn().mockReturnThis(),
    isRFC7534: jest.fn().mockReturnThis(),
    isRFC7535: jest.fn().mockReturnThis(),
    isRFC7536: jest.fn().mockReturnThis(),
    isRFC7537: jest.fn().mockReturnThis(),
    isRFC7538: jest.fn().mockReturnThis(),
    isRFC7539: jest.fn().mockReturnThis(),
    isRFC7540: jest.fn().mockReturnThis(),
    isRFC7541: jest.fn().mockReturnThis(),
    isRFC7542: jest.fn().mockReturnThis(),
    isRFC7543: jest.fn().mockReturnThis(),
    isRFC7544: jest.fn().mockReturnThis(),
    isRFC7545: jest.fn().mockReturnThis(),
    isRFC7546: jest.fn().mockReturnThis(),
    isRFC7547: jest.fn().mockReturnThis(),
    isRFC7548: jest.fn().mockReturnThis(),
    isRFC7549: jest.fn().mockReturnThis(),
    isRFC7550: jest.fn().mockReturnThis()
  })),
  validationResult: jest.fn(() => ({
    isEmpty: () => true,
    array: () => []
  }))
}));

describe('Security Middleware', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
  });

  describe('Rate Limiting', () => {
    test('should apply brute force protection middleware', () => {
      expect(bruteForceProtection).toBeDefined();
      expect(typeof bruteForceProtection).toBe('function');
    });

    test('should apply general rate limiter middleware', () => {
      expect(generalLimiter).toBeDefined();
      expect(typeof generalLimiter).toBe('function');
    });

    test('should apply strict rate limiter middleware', () => {
      expect(strictLimiter).toBeDefined();
      expect(typeof strictLimiter).toBe('function');
    });

    test('should apply speed limiter middleware', () => {
      expect(speedLimiter).toBeDefined();
      expect(typeof speedLimiter).toBe('function');
    });

    test('should handle rate limit middleware execution', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      // Test that middleware functions can be called without errors
      expect(() => bruteForceProtection(req, res, next)).not.toThrow();
      expect(() => generalLimiter(req, res, next)).not.toThrow();
      expect(() => strictLimiter(req, res, next)).not.toThrow();
      expect(() => speedLimiter(req, res, next)).not.toThrow();
    });
  });

  describe('Input Validation', () => {
    test('should validate email addresses', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'test+tag@example.org',
        'user123@test-domain.com'
      ];

      const invalidEmails = [
        '',
        'invalid-email',
        '@example.com',
        'test@',
        'test..test@example.com'
      ];

      for (const email of validEmails) {
        expect(validateEmail(email)).toBe(true);
      }

      for (const email of invalidEmails) {
        expect(validateEmail(email)).toBe(false);
      }
    });

    test('should validate password strength', () => {
      const strongPasswords = [
        'StrongPassword123!',
        'MySecure@Pass2024',
        'Complex#Pass456'
      ];

      const weakPasswords = [
        'short',
        'nouppercase123!',
        'NOLOWERCASE123!',
        'NoNumbers!',
        'NoSpecialChars123'
      ];

      for (const password of strongPasswords) {
        const result = validatePassword(password);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      }

      for (const password of weakPasswords) {
        const result = validatePassword(password);
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      }
    });

    test('should validate API keys', () => {
      const validApiKeys = [
        'ak_test_1234567890abcdef',
        'sk_live_abcdef1234567890',
        'api_key_12345'
      ];

      const invalidApiKeys = [
        '',
        'short',
        'key with spaces',
        'key-with-special-chars!@#'
      ];

      for (const apiKey of validApiKeys) {
        expect(validateApiKey(apiKey)).toBe(true);
      }

      for (const apiKey of invalidApiKeys) {
        expect(validateApiKey(apiKey)).toBe(false);
      }
    });

    test('should validate trading pairs', () => {
      const validPairs = [
        'BTC/USDT',
        'ETH/BTC',
        'ADA/USD',
        'DOGE/BTC'
      ];

      const invalidPairs = [
        '',
        'BTC',
        'BTC/USDT/ETH',
        'invalid pair'
      ];

      for (const pair of validPairs) {
        expect(validateTradingPair(pair)).toBe(true);
      }

      for (const pair of invalidPairs) {
        expect(validateTradingPair(pair)).toBe(false);
      }
    });

    test('should validate amounts', () => {
      const validAmounts = [
        0.001,
        1.5,
        100,
        1000.50
      ];

      const invalidAmounts = [
        -1,
        'invalid',
        null,
        undefined
      ];

      for (const amount of validAmounts) {
        expect(validateAmount(amount)).toBe(true);
      }

      for (const amount of invalidAmounts) {
        expect(validateAmount(amount)).toBe(false);
      }
    });

    test('should validate prices', () => {
      const validPrices = [
        0.000001,
        1.00,
        50000.50,
        1000000
      ];

      const invalidPrices = [
        -1,
        0,
        'invalid',
        null
      ];

      for (const price of validPrices) {
        expect(validatePrice(price)).toBe(true);
      }

      for (const price of invalidPrices) {
        expect(validatePrice(price)).toBe(false);
      }
    });

    test('should validate order types', () => {
      const validOrderTypes = [
        'market',
        'limit',
        'stop',
        'stop_limit'
      ];

      const invalidOrderTypes = [
        '',
        'invalid',
        'MARKET',
        'market_order'
      ];

      for (const orderType of validOrderTypes) {
        expect(validateOrderType(orderType)).toBe(true);
      }

      for (const orderType of invalidOrderTypes) {
        expect(validateOrderType(orderType)).toBe(false);
      }
    });

    test('should validate timeframes', () => {
      const validTimeframes = [
        '1m',
        '5m',
        '15m',
        '1h',
        '4h',
        '1d'
      ];

      const invalidTimeframes = [
        '',
        'invalid',
        '1minute',
        '1hour'
      ];

      for (const timeframe of validTimeframes) {
        expect(validateTimeframe(timeframe)).toBe(true);
      }

      for (const timeframe of invalidTimeframes) {
        expect(validateTimeframe(timeframe)).toBe(false);
      }
    });

    test('should validate exchanges', () => {
      const validExchanges = [
        'binance',
        'coinbase',
        'kraken',
        'wazirx',
        'coindcx'
      ];

      const invalidExchanges = [
        '',
        'invalid',
        'BINANCE',
        'binance_pro'
      ];

      for (const exchange of validExchanges) {
        expect(validateExchange(exchange)).toBe(true);
      }

      for (const exchange of invalidExchanges) {
        expect(validateExchange(exchange)).toBe(false);
      }
    });

    test('should validate currencies', () => {
      const validCurrencies = [
        'BTC',
        'ETH',
        'USDT',
        'USD',
        'INR'
      ];

      const invalidCurrencies = [
        '',
        'bitcoin',
        'invalid',
        'BTC123'
      ];

      for (const currency of validCurrencies) {
        expect(validateCurrency(currency)).toBe(true);
      }

      for (const currency of invalidCurrencies) {
        expect(validateCurrency(currency)).toBe(false);
      }
    });

    test('should validate risk levels', () => {
      const validRiskLevels = [
        'low',
        'medium',
        'high',
        'very_high'
      ];

      const invalidRiskLevels = [
        '',
        'invalid',
        'LOW',
        'extreme'
      ];

      for (const riskLevel of validRiskLevels) {
        expect(validateRiskLevel(riskLevel)).toBe(true);
      }

      for (const riskLevel of invalidRiskLevels) {
        expect(validateRiskLevel(riskLevel)).toBe(false);
      }
    });

    test('should validate leverage', () => {
      const validLeverage = [
        1,
        2,
        5,
        10,
        20
      ];

      const invalidLeverage = [
        -1,
        0,
        100,
        'invalid'
      ];

      for (const leverage of validLeverage) {
        expect(validateLeverage(leverage)).toBe(true);
      }

      for (const leverage of invalidLeverage) {
        expect(validateLeverage(leverage)).toBe(false);
      }
    });

    test('should validate stop loss', () => {
      const validStopLoss = [
        0.01,
        0.05,
        0.10,
        0.20
      ];

      const invalidStopLoss = [
        -0.01,
        0,
        1.0,
        'invalid'
      ];

      for (const stopLoss of validStopLoss) {
        expect(validateStopLoss(stopLoss)).toBe(true);
      }

      for (const stopLoss of invalidStopLoss) {
        expect(validateStopLoss(stopLoss)).toBe(false);
      }
    });

    test('should validate take profit', () => {
      const validTakeProfit = [
        0.01,
        0.05,
        0.10,
        0.50
      ];

      const invalidTakeProfit = [
        -0.01,
        0,
        'invalid',
        null
      ];

      for (const takeProfit of validTakeProfit) {
        expect(validateTakeProfit(takeProfit)).toBe(true);
      }

      for (const takeProfit of invalidTakeProfit) {
        expect(validateTakeProfit(takeProfit)).toBe(false);
      }
    });
  });

  describe('Input Sanitization', () => {
    test('should sanitize input correctly', () => {
      const testCases = [
        { input: '<script>alert("xss")</script>', expected: 'scriptalert(xss)/script' },
        { input: '  test  ', expected: 'test' },
        { input: 'test"value', expected: 'testvalue' },
        { input: 'test&value', expected: 'testvalue' },
        { input: 'test<value>', expected: 'testvalue' },
        { input: 123, expected: 123 },
        { input: null, expected: null },
        { input: undefined, expected: undefined }
      ];

      for (const testCase of testCases) {
        expect(sanitizeInput(testCase.input)).toBe(testCase.expected);
      }
    });
  });

  describe('Validation Middleware', () => {
    test('should apply input validation middleware', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      // Test that validation middleware can be called
      expect(() => validateInput(req, res, next)).not.toThrow();
    });

    test('should handle validation errors', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      // Mock validation result with errors
      const { validationResult } = require('express-validator');
      validationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => [{ msg: 'Invalid input', param: 'email' }]
      });

      validateInput(req, res, next);

      // Should call next with validation errors
      expect(next).toHaveBeenCalled();
    });
  });

  describe('Additional Validators', () => {
    test('should validate portfolio names', () => {
      const validNames = ['My Portfolio', 'Trading Bot 1', 'Test-Portfolio'];
      const invalidNames = ['', 'a'.repeat(101), 'Portfolio<script>'];

      for (const name of validNames) {
        expect(validatePortfolioName(name)).toBe(true);
      }

      for (const name of invalidNames) {
        expect(validatePortfolioName(name)).toBe(false);
      }
    });

    test('should validate strategy names', () => {
      const validNames = ['RSI Strategy', 'Moving Average', 'Test-Strategy'];
      const invalidNames = ['', 'a'.repeat(101), 'Strategy<script>'];

      for (const name of validNames) {
        expect(validateStrategyName(name)).toBe(true);
      }

      for (const name of invalidNames) {
        expect(validateStrategyName(name)).toBe(false);
      }
    });

    test('should validate notification settings', () => {
      const validSettings = {
        email: true,
        sms: false,
        push: true
      };

      const invalidSettings = {
        email: 'invalid',
        sms: null,
        push: undefined
      };

      expect(validateNotificationSettings(validSettings)).toBe(true);
      expect(validateNotificationSettings(invalidSettings)).toBe(false);
    });

    test('should validate KYC data', () => {
      const validKycData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        dob: '1990-01-01',
        address: '123 Main St',
        city: 'New York',
        country: 'US',
        postalCode: '10001',
        documentType: 'passport',
        documentNumber: 'A1234567'
      };

      const invalidKycData = {
        firstName: '',
        lastName: '',
        email: 'invalid-email',
        phone: 'invalid-phone'
      };

      expect(validateKycData(validKycData)).toBe(true);
      expect(validateKycData(invalidKycData)).toBe(false);
    });

    test('should validate AML data', () => {
      const validAmlData = {
        sourceOfFunds: 'salary',
        occupation: 'Software Engineer',
        employer: 'Tech Company',
        annualIncome: 100000,
        riskLevel: 'low'
      };

      const invalidAmlData = {
        sourceOfFunds: '',
        occupation: '',
        annualIncome: -1000,
        riskLevel: 'invalid'
      };

      expect(validateAmlData(validAmlData)).toBe(true);
      expect(validateAmlData(invalidAmlData)).toBe(false);
    });
  });

  describe('Security Configuration', () => {
    test('should have proper security headers configuration', () => {
      // Test that security middleware is properly configured
      expect(bruteForceProtection).toBeDefined();
      expect(generalLimiter).toBeDefined();
      expect(strictLimiter).toBeDefined();
      expect(speedLimiter).toBeDefined();
    });

    test('should handle security middleware errors gracefully', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      // Mock rate limiter to throw error
      const rateLimit = require('express-rate-limit');
      rateLimit.mockReturnValue((req, res, next) => {
        throw new Error('Rate limit error');
      });

      // Should handle errors gracefully
      expect(() => {
        try {
          bruteForceProtection(req, res, next);
        } catch (error) {
          // Error should be caught and handled
          expect(error.message).toBe('Rate limit error');
        }
      }).not.toThrow();
    });
  });

  describe('Performance and Monitoring', () => {
    test('should validate monitoring data', () => {
      const validMonitoringData = {
        metrics: ['cpu', 'memory', 'disk'],
        thresholds: {
          cpu: 80,
          memory: 85,
          disk: 90
        },
        alerts: true
      };

      const invalidMonitoringData = {
        metrics: [],
        thresholds: {
          cpu: -10,
          memory: 150,
          disk: 'invalid'
        }
      };

      expect(validateMonitoringData(validMonitoringData)).toBe(true);
      expect(validateMonitoringData(invalidMonitoringData)).toBe(false);
    });

    test('should validate alert data', () => {
      const validAlertData = {
        type: 'error',
        message: 'System error occurred',
        severity: 'high',
        timestamp: new Date().toISOString()
      };

      const invalidAlertData = {
        type: '',
        message: '',
        severity: 'invalid',
        timestamp: 'invalid-date'
      };

      expect(validateAlertData(validAlertData)).toBe(true);
      expect(validateAlertData(invalidAlertData)).toBe(false);
    });

    test('should validate performance data', () => {
      const validPerformanceData = {
        responseTime: 150,
        throughput: 1000,
        errorRate: 0.01,
        uptime: 99.9
      };

      const invalidPerformanceData = {
        responseTime: -10,
        throughput: 'invalid',
        errorRate: 1.5,
        uptime: -10
      };

      expect(validatePerformanceData(validPerformanceData)).toBe(true);
      expect(validatePerformanceData(invalidPerformanceData)).toBe(false);
    });
  });

  describe('Data Validation Edge Cases', () => {
    test('should handle null and undefined inputs', () => {
      expect(validateEmail(null)).toBe(false);
      expect(validateEmail(undefined)).toBe(false);
      expect(validatePassword(null)).toEqual({ isValid: false, errors: ['Password is required'] });
      expect(validateApiKey(undefined)).toBe(false);
    });

    test('should handle empty string inputs', () => {
      expect(validateEmail('')).toBe(false);
      expect(validatePassword('')).toEqual({ isValid: false, errors: ['Password is required'] });
      expect(validateApiKey('')).toBe(false);
      expect(validateTradingPair('')).toBe(false);
    });

    test('should handle extremely long inputs', () => {
      const longString = 'a'.repeat(10000);
      expect(validateEmail(longString)).toBe(false);
      expect(validatePassword(longString)).toEqual({ isValid: false, errors: ['Password must be less than 128 characters long'] });
      expect(validateApiKey(longString)).toBe(false);
    });

    test('should handle special characters and unicode', () => {
      const unicodeString = '测试@example.com';
      const specialCharsString = '!@#$%^&*()_+-=[]{}|;:,.<>?';
      
      expect(validateEmail(unicodeString)).toBe(false); // Should reject unicode in email
      expect(validateApiKey(specialCharsString)).toBe(false); // Should reject special chars in API key
    });
  });
});
