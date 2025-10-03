/**
 * Frontend Validation Utilities - Production-Ready Client-Side Validation
 * 
 * This module provides comprehensive validation utilities for the frontend,
 * complementing the backend risk management system.
 * 
 * Features:
 * - Input validation and sanitization
 * - Form validation
 * - Trading signal validation
 * - API response validation
 * - Real-time validation feedback
 * - Security validation
 * - Performance validation
 */

import { z } from 'zod';
import { generateRandomId } from './utils';

// Validation schemas using Zod
export const validationSchemas = {
  // User authentication schemas
  login: z.object({
    email: z.string().email('Invalid email format').min(1, 'Email is required'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
  }),

  register: z.object({
    email: z.string().email('Invalid email format').min(1, 'Email is required'),
    password: z.string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
        'Password must contain uppercase, lowercase, number, and special character'),
    confirmPassword: z.string().min(1, 'Password confirmation is required'),
    username: z.string().min(3, 'Username must be at least 3 characters').max(20, 'Username too long'),
    termsAccepted: z.boolean().refine(val => val === true, 'You must accept the terms'),
  }).refine(data => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  }),

  // Trading signal schemas
  tradingSignal: z.object({
    symbol: z.string().regex(/^[A-Z]{2,10}\/[A-Z]{2,10}$/, 'Invalid trading pair format'),
    action: z.enum(['BUY', 'SELL'], { errorMap: () => ({ message: 'Action must be BUY or SELL' }) }),
    entry: z.number().positive('Entry price must be positive'),
    stopLoss: z.number().positive('Stop loss must be positive'),
    takeProfit: z.number().positive('Take profit must be positive'),
    confidence: z.number().min(0, 'Confidence must be between 0 and 100').max(100, 'Confidence must be between 0 and 100'),
    amount: z.number().positive('Amount must be positive').optional(),
    leverage: z.number().min(1, 'Leverage must be at least 1x').max(100, 'Leverage cannot exceed 100x').optional(),
    timeframe: z.string().min(1, 'Timeframe is required').optional(),
    strategy: z.string().min(1, 'Strategy is required').optional(),
  }).refine(data => {
    if (data.action === 'BUY') {
      return data.stopLoss < data.entry && data.takeProfit > data.entry;
    } else {
      return data.stopLoss > data.entry && data.takeProfit < data.entry;
    }
  }, {
    message: 'Invalid stop loss or take profit for the selected action',
  }),

  // API key validation
  apiKey: z.object({
    name: z.string().min(1, 'API key name is required').max(50, 'Name too long'),
    key: z.string().min(10, 'API key too short').max(200, 'API key too long'),
    secret: z.string().min(10, 'Secret key too short').max(200, 'Secret key too long'),
    exchange: z.enum(['binance', 'wazirx', 'coindcx', 'delta', 'coinbase'], {
      errorMap: () => ({ message: 'Invalid exchange' })
    }),
    permissions: z.array(z.string()).min(1, 'At least one permission is required'),
    isTestnet: z.boolean().optional(),
  }),

  // Portfolio configuration
  portfolioConfig: z.object({
    totalValue: z.number().positive('Portfolio value must be positive'),
    riskPerTrade: z.number().min(0.001, 'Risk per trade too low').max(0.1, 'Risk per trade too high'),
    maxDrawdown: z.number().min(0.01, 'Max drawdown too low').max(0.5, 'Max drawdown too high'),
    maxConcurrentTrades: z.number().min(1, 'Must allow at least 1 trade').max(20, 'Too many concurrent trades'),
    dailyTradeLimit: z.number().min(1, 'Must allow at least 1 trade per day').max(100, 'Daily trade limit too high'),
  }),

  // User profile
  userProfile: z.object({
    firstName: z.string().min(1, 'First name is required').max(50, 'First name too long'),
    lastName: z.string().min(1, 'Last name is required').max(50, 'Last name too long'),
    phone: z.string().regex(/^\+?[\d\s-()]+$/, 'Invalid phone number format').optional(),
    country: z.string().min(2, 'Country code is required').max(3, 'Invalid country code'),
    timezone: z.string().min(1, 'Timezone is required'),
    notifications: z.object({
      email: z.boolean(),
      sms: z.boolean(),
      push: z.boolean(),
      trading: z.boolean(),
      risk: z.boolean(),
    }),
  }),

  // Exchange configuration
  exchangeConfig: z.object({
    name: z.string().min(1, 'Exchange name is required'),
    baseUrl: z.string().url('Invalid base URL'),
    apiVersion: z.string().min(1, 'API version is required'),
    rateLimits: z.object({
      requestsPerSecond: z.number().positive('Rate limit must be positive'),
      requestsPerMinute: z.number().positive('Rate limit must be positive'),
      requestsPerHour: z.number().positive('Rate limit must be positive'),
    }),
    supportedPairs: z.array(z.string()).min(1, 'Must support at least one trading pair'),
    fees: z.object({
      maker: z.number().min(0, 'Fee cannot be negative').max(0.1, 'Fee too high'),
      taker: z.number().min(0, 'Fee cannot be negative').max(0.1, 'Fee too high'),
    }),
  }),
};

// Validation utility functions
export class ValidationUtils {
  /**
   * Validate data against a schema
   */
  static validate(schema, data) {
    try {
      const result = schema.safeParse(data);
      return {
        success: result.success,
        data: result.success ? result.data : null,
        errors: result.success ? [] : result.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
        })),
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        errors: [{ field: 'unknown', message: 'Validation failed', code: 'custom' }],
      };
    }
  }

  /**
   * Validate trading signal
   */
  static validateTradingSignal(signal) {
    const validation = this.validate(validationSchemas.tradingSignal, signal);
    
    if (!validation.success) {
      return validation;
    }

    // Additional business logic validation
    const warnings = [];
    
    // Check risk-reward ratio
    const riskRewardRatio = Math.abs(signal.takeProfit - signal.entry) / Math.abs(signal.entry - signal.stopLoss);
    if (riskRewardRatio < 1.5) {
      warnings.push({
        field: 'riskReward',
        message: 'Risk-reward ratio is below recommended 1.5:1',
        code: 'warning',
      });
    }

    // Check confidence threshold
    if (signal.confidence < 70) {
      warnings.push({
        field: 'confidence',
        message: 'Signal confidence is below recommended 70%',
        code: 'warning',
      });
    }

    // Check position size
    if (signal.amount) {
      const positionSize = signal.amount;
      if (positionSize < 10) {
        warnings.push({
          field: 'amount',
          message: 'Position size is below minimum $10',
          code: 'warning',
        });
      }
    }

    return {
      ...validation,
      warnings,
    };
  }

  /**
   * Validate API key configuration
   */
  static validateApiKey(apiKey) {
    const validation = this.validate(validationSchemas.apiKey, apiKey);
    
    if (!validation.success) {
      return validation;
    }

    const warnings = [];
    
    // Check for testnet configuration
    if (apiKey.isTestnet && apiKey.exchange !== 'binance') {
      warnings.push({
        field: 'isTestnet',
        message: 'Testnet is only supported for Binance',
        code: 'warning',
      });
    }

    // Check permissions
    const requiredPermissions = ['read', 'trade'];
    const missingPermissions = requiredPermissions.filter(perm => !apiKey.permissions.includes(perm));
    if (missingPermissions.length > 0) {
      warnings.push({
        field: 'permissions',
        message: `Missing required permissions: ${missingPermissions.join(', ')}`,
        code: 'warning',
      });
    }

    return {
      ...validation,
      warnings,
    };
  }

  /**
   * Validate portfolio configuration
   */
  static validatePortfolioConfig(config) {
    const validation = this.validate(validationSchemas.portfolioConfig, config);
    
    if (!validation.success) {
      return validation;
    }

    const warnings = [];
    
    // Check risk per trade vs max drawdown
    if (config.riskPerTrade * config.maxConcurrentTrades > config.maxDrawdown) {
      warnings.push({
        field: 'riskPerTrade',
        message: 'Total risk exposure may exceed maximum drawdown',
        code: 'warning',
      });
    }

    // Check daily trade limit vs concurrent trades
    if (config.dailyTradeLimit < config.maxConcurrentTrades * 2) {
      warnings.push({
        field: 'dailyTradeLimit',
        message: 'Daily trade limit should be at least 2x the concurrent trade limit',
        code: 'warning',
      });
    }

    return {
      ...validation,
      warnings,
    };
  }

  /**
   * Sanitize input data
   */
  static sanitizeInput(input) {
    if (typeof input !== 'string') {
      return input;
    }

    // Remove potentially dangerous characters
    return input
      .replace(/[<>\"']/g, '') // Remove HTML/JS injection characters
      .replace(/script/gi, '') // Remove script tags
      .replace(/javascript/gi, '') // Remove javascript
      .replace(/on\w+=/gi, '') // Remove event handlers
      .trim();
  }

  /**
   * Validate email format
   */
  static validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate password strength
   */
  static validatePasswordStrength(password) {
    const result = {
      isValid: true,
      score: 0,
      feedback: [],
    };

    // Length check
    if (password.length < 8) {
      result.isValid = false;
      result.feedback.push('Password must be at least 8 characters long');
    } else if (password.length >= 12) {
      result.score += 1;
    }

    // Character variety checks
    if (/[a-z]/.test(password)) result.score += 1;
    else result.feedback.push('Password must contain lowercase letters');

    if (/[A-Z]/.test(password)) result.score += 1;
    else result.feedback.push('Password must contain uppercase letters');

    if (/\d/.test(password)) result.score += 1;
    else result.feedback.push('Password must contain numbers');

    if (/[@$!%*?&]/.test(password)) result.score += 1;
    else result.feedback.push('Password must contain special characters');

    // Common password check
    const commonPasswords = ['password', '123456', 'qwerty', 'abc123', 'password123'];
    if (commonPasswords.includes(password.toLowerCase())) {
      result.isValid = false;
      result.feedback.push('Password is too common');
    }

    // Sequential characters check
    if (/(.)\1{2,}/.test(password)) {
      result.isValid = false;
      result.feedback.push('Password contains too many repeated characters');
    }

    return result;
  }

  /**
   * Validate trading symbol format
   */
  static validateTradingSymbol(symbol) {
    const symbolRegex = /^[A-Z]{2,10}\/[A-Z]{2,10}$/;
    return symbolRegex.test(symbol);
  }

  /**
   * Validate numeric input
   */
  static validateNumber(value, min = 0, max = Infinity, decimals = 2) {
    const num = parseFloat(value);
    
    if (isNaN(num)) {
      return { isValid: false, message: 'Invalid number format' };
    }

    if (num < min) {
      return { isValid: false, message: `Value must be at least ${min}` };
    }

    if (num > max) {
      return { isValid: false, message: `Value must not exceed ${max}` };
    }

    // Check decimal places
    const decimalPlaces = (num.toString().split('.')[1] || '').length;
    if (decimalPlaces > decimals) {
      return { isValid: false, message: `Maximum ${decimals} decimal places allowed` };
    }

    return { isValid: true, value: num };
  }

  /**
   * Validate URL format
   */
  static validateUrl(url) {
    try {
      new URL(url);
      return { isValid: true };
    } catch {
      return { isValid: false, message: 'Invalid URL format' };
    }
  }

  /**
   * Real-time validation for form fields
   */
  static createFieldValidator(schema, fieldName) {
    return (value) => {
      try {
        const fieldSchema = schema.shape[fieldName];
        if (!fieldSchema) {
          return { isValid: true, message: '' };
        }

        const result = fieldSchema.safeParse(value);
        return {
          isValid: result.success,
          message: result.success ? '' : result.error.errors[0]?.message || 'Invalid value',
        };
      } catch {
        return { isValid: true, message: '' };
      }
    };
  }

  /**
   * Validate API response structure
   */
  static validateApiResponse(response, expectedSchema) {
    if (!response || typeof response !== 'object') {
      return {
        isValid: false,
        message: 'Invalid response format',
      };
    }

    try {
      const result = expectedSchema.safeParse(response);
      return {
        isValid: result.success,
        data: result.success ? result.data : null,
        errors: result.success ? [] : result.error.errors,
      };
    } catch (error) {
      return {
        isValid: false,
        message: 'Response validation failed',
        error,
      };
    }
  }

  /**
   * Validate file upload
   */
  static validateFileUpload(file, options = {}) {
    const {
      maxSize = 10 * 1024 * 1024, // 10MB default
      allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
      allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.pdf'],
    } = options;

    const errors = [];

    // Check file size
    if (file.size > maxSize) {
      errors.push(`File size cannot exceed ${maxSize / (1024 * 1024)}MB`);
    }

    // Check file type
    if (!allowedTypes.includes(file.type)) {
      errors.push(`File type not allowed. Allowed types: ${allowedTypes.join(', ')}`);
    }

    // Check file extension
    const extension = '.' + file.name.split('.').pop().toLowerCase();
    if (!allowedExtensions.includes(extension)) {
      errors.push(`File extension not allowed. Allowed extensions: ${allowedExtensions.join(', ')}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate JSON data
   */
  static validateJson(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      return {
        isValid: true,
        data: parsed,
      };
    } catch (error) {
      return {
        isValid: false,
        message: 'Invalid JSON format',
        error: error.message,
      };
    }
  }

  /**
   * Validate date range
   */
  static validateDateRange(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const now = new Date();

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return {
        isValid: false,
        message: 'Invalid date format',
      };
    }

    if (start >= end) {
      return {
        isValid: false,
        message: 'Start date must be before end date',
      };
    }

    if (start > now) {
      return {
        isValid: false,
        message: 'Start date cannot be in the future',
      };
    }

    const diffDays = (end - start) / (1000 * 60 * 60 * 24);
    if (diffDays > 365) {
      return {
        isValid: false,
        message: 'Date range cannot exceed 365 days',
      };
    }

    return {
      isValid: true,
      startDate: start,
      endDate: end,
      diffDays,
    };
  }

  /**
   * Validate trading pair
   */
  static validateTradingPair(pair) {
    const parts = pair.split('/');
    if (parts.length !== 2) {
      return {
        isValid: false,
        message: 'Trading pair must be in format BASE/QUOTE',
      };
    }

    const [base, quote] = parts;
    const validCurrencies = ['BTC', 'ETH', 'USDT', 'USDC', 'BNB', 'ADA', 'DOT', 'LINK', 'LTC', 'XRP'];

    if (!validCurrencies.includes(base) || !validCurrencies.includes(quote)) {
      return {
        isValid: false,
        message: 'Unsupported trading pair',
      };
    }

    return {
      isValid: true,
      base,
      quote,
    };
  }
}

// Real-time validation hooks
export class ValidationHooks {
  /**
   * Create a validation hook for form fields
   */
  static useFieldValidation(schema, fieldName) {
    const validator = ValidationUtils.createFieldValidator(schema, fieldName);
    
    return {
      validate: validator,
      validateAsync: async (value) => {
        // Simulate async validation (e.g., API calls)
        await new Promise(resolve => setTimeout(resolve, 100));
        return validator(value);
      },
    };
  }

  /**
   * Create a debounced validation hook
   */
  static useDebouncedValidation(validator, delay = 300) {
    let timeoutId = null;

    return {
      validate: (value, callback) => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }

        timeoutId = setTimeout(() => {
          const result = validator(value);
          callback(result);
        }, delay);
      },
    };
  }
}

// Validation middleware for API calls
export class ValidationMiddleware {
  /**
   * Validate request data before API call
   */
  static validateRequest(schema) {
    return (data) => {
      const validation = ValidationUtils.validate(schema, data);
      
      if (!validation.success) {
        throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
      }

      return validation.data;
    };
  }

  /**
   * Validate response data after API call
   */
  static validateResponse(schema) {
    return (response) => {
      const validation = ValidationUtils.validateApiResponse(response, schema);
      
      if (!validation.isValid) {
        throw new Error(`Response validation failed: ${validation.message}`);
      }

      return validation.data;
    };
  }
}

// Export validation schemas and utilities
export default {
  schemas: validationSchemas,
  utils: ValidationUtils,
  hooks: ValidationHooks,
  middleware: ValidationMiddleware,
};
