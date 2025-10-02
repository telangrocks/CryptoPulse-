/**
 * @fileoverview Comprehensive validation utilities for Redux store
 * @version 1.0.0
 * @author CryptoPulse Team
 */

import { ValidationRule, ValidationSchema, ValidationResult, ApiError } from '../types';

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

/**
 * Validates a value against a validation rule
 * @param value - The value to validate
 * @param rule - The validation rule to apply
 * @param fieldName - The name of the field being validated
 * @returns Error message or null if valid
 */
export const validateField = (
  value: any,
  rule: ValidationRule,
  fieldName: string,
): string | null => {
  // Required check
  if (rule.required && (value === null || value === undefined || value === '')) {
    return rule.message || `${fieldName} is required`;
  }

  // Skip other validations if value is empty and not required
  if (!rule.required && (value === null || value === undefined || value === '')) {
    return null;
  }

  // Type validation
  if (rule.type) {
    const typeError = validateType(value, rule.type, fieldName);
    if (typeError) return typeError;
  }

  // String validations
  if (typeof value === 'string') {
    if (rule.min !== undefined && value.length < rule.min) {
      return rule.message || `${fieldName} must be at least ${rule.min} characters`;
    }
    if (rule.max !== undefined && value.length > rule.max) {
      return rule.message || `${fieldName} must be no more than ${rule.max} characters`;
    }
    if (rule.pattern && !rule.pattern.test(value)) {
      return rule.message || `${fieldName} format is invalid`;
    }
  }

  // Number validations
  if (typeof value === 'number') {
    if (rule.min !== undefined && value < rule.min) {
      return rule.message || `${fieldName} must be at least ${rule.min}`;
    }
    if (rule.max !== undefined && value > rule.max) {
      return rule.message || `${fieldName} must be no more than ${rule.max}`;
    }
  }

  // Custom validation
  if (rule.custom) {
    const customError = rule.custom(value);
    if (customError) return customError;
  }

  return null;
};

/**
 * Validates the type of a value
 * @param value - The value to validate
 * @param expectedType - The expected type
 * @param fieldName - The name of the field
 * @returns Error message or null if valid
 */
const validateType = (value: any, expectedType: string, fieldName: string): string | null => {
  switch (expectedType) {
    case 'string':
      return typeof value === 'string' ? null : `${fieldName} must be a string`;
    case 'number':
      return typeof value === 'number' && !isNaN(value) ? null : `${fieldName} must be a number`;
    case 'boolean':
      return typeof value === 'boolean' ? null : `${fieldName} must be a boolean`;
    case 'email':
      return isValidEmail(value) ? null : `${fieldName} must be a valid email address`;
    case 'url':
      return isValidUrl(value) ? null : `${fieldName} must be a valid URL`;
    case 'date':
      return isValidDate(value) ? null : `${fieldName} must be a valid date`;
    default:
      return null;
  }
};

/**
 * Validates an object against a schema
 * @param data - The data to validate
 * @param schema - The validation schema
 * @returns Validation result
 */
export const validateSchema = (data: Record<string, any>, schema: ValidationSchema): ValidationResult => {
  const errors: Record<string, string> = {};

  for (const [fieldName, rule] of Object.entries(schema)) {
    const error = validateField(data[fieldName], rule, fieldName);
    if (error) {
      errors[fieldName] = error;
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

// ============================================================================
// SPECIFIC VALIDATORS
// ============================================================================

/**
 * Validates email format
 * @param email - Email to validate
 * @returns True if valid email
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validates URL format
 * @param url - URL to validate
 * @returns True if valid URL
 */
export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Validates date format
 * @param date - Date to validate
 * @returns True if valid date
 */
export const isValidDate = (date: any): boolean => {
  if (date instanceof Date) {
    return !isNaN(date.getTime());
  }
  if (typeof date === 'string') {
    const parsed = new Date(date);
    return !isNaN(parsed.getTime());
  }
  return false;
};

/**
 * Validates trading symbol format
 * @param symbol - Trading symbol to validate
 * @returns True if valid symbol
 */
export const isValidTradingSymbol = (symbol: string): boolean => {
  const symbolRegex = /^[A-Z]{2,10}(USDT|BTC|ETH|BNB)$/;
  return symbolRegex.test(symbol);
};

/**
 * Validates price format
 * @param price - Price to validate
 * @returns True if valid price
 */
export const isValidPrice = (price: number): boolean => {
  return typeof price === 'number' && price > 0 && !isNaN(price) && isFinite(price);
};

/**
 * Validates quantity format
 * @param quantity - Quantity to validate
 * @returns True if valid quantity
 */
export const isValidQuantity = (quantity: number): boolean => {
  return typeof quantity === 'number' && quantity > 0 && !isNaN(quantity) && isFinite(quantity);
};

// ============================================================================
// COMMON VALIDATION SCHEMAS
// ============================================================================

/**
 * User registration validation schema
 */
export const userRegistrationSchema: ValidationSchema = {
  username: {
    required: true,
    type: 'string',
    min: 3,
    max: 20,
    pattern: /^[a-zA-Z0-9_]+$/,
    message: 'Username must be 3-20 characters, alphanumeric and underscores only',
  },
  email: {
    required: true,
    type: 'email',
    message: 'Please provide a valid email address',
  },
  password: {
    required: true,
    type: 'string',
    min: 8,
    max: 128,
    pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    message: 'Password must be 8-128 characters with uppercase, lowercase, number and special character',
  },
  firstName: {
    required: false,
    type: 'string',
    min: 1,
    max: 50,
    pattern: /^[a-zA-Z\s]+$/,
    message: 'First name must contain only letters and spaces',
  },
  lastName: {
    required: false,
    type: 'string',
    min: 1,
    max: 50,
    pattern: /^[a-zA-Z\s]+$/,
    message: 'Last name must contain only letters and spaces',
  },
};

/**
 * User login validation schema
 */
export const userLoginSchema: ValidationSchema = {
  username: {
    required: true,
    type: 'string',
    min: 1,
    message: 'Username is required',
  },
  password: {
    required: true,
    type: 'string',
    min: 1,
    message: 'Password is required',
  },
};

/**
 * Trade execution validation schema
 */
export const tradeExecutionSchema: ValidationSchema = {
  symbol: {
    required: true,
    type: 'string',
    custom: (value: string) => isValidTradingSymbol(value) ? null : 'Invalid trading symbol format',
  },
  side: {
    required: true,
    type: 'string',
    custom: (value: string) => ['BUY', 'SELL'].includes(value) ? null : 'Side must be BUY or SELL',
  },
  type: {
    required: true,
    type: 'string',
    custom: (value: string) =>
      ['MARKET', 'LIMIT', 'STOP_LOSS', 'STOP_LOSS_LIMIT', 'TAKE_PROFIT', 'TAKE_PROFIT_LIMIT'].includes(value)
        ? null
        : 'Invalid order type',
  },
  quantity: {
    required: true,
    type: 'number',
    min: 0.00000001,
    custom: (value: number) => isValidQuantity(value) ? null : 'Invalid quantity',
  },
  price: {
    required: false,
    type: 'number',
    min: 0.00000001,
    custom: (value: number) => value ? isValidPrice(value) : null || 'Invalid price',
  },
  stopPrice: {
    required: false,
    type: 'number',
    min: 0.00000001,
    custom: (value: number) => value ? isValidPrice(value) : null || 'Invalid stop price',
  },
};

/**
 * Bot configuration validation schema
 */
export const botConfigSchema: ValidationSchema = {
  name: {
    required: true,
    type: 'string',
    min: 3,
    max: 50,
    pattern: /^[a-zA-Z0-9\s_-]+$/,
    message: 'Bot name must be 3-50 characters, alphanumeric, spaces, hyphens and underscores only',
  },
  strategy: {
    required: true,
    type: 'string',
    custom: (value: string) =>
      ['DCA', 'GRID', 'MOMENTUM', 'MEAN_REVERSION', 'ARBITRAGE', 'SCALPING'].includes(value)
        ? null
        : 'Invalid strategy',
  },
  symbol: {
    required: true,
    type: 'string',
    custom: (value: string) => isValidTradingSymbol(value) ? null : 'Invalid trading symbol',
  },
  riskLevel: {
    required: true,
    type: 'string',
    custom: (value: string) =>
      ['LOW', 'MEDIUM', 'HIGH', 'EXTREME'].includes(value) ? null : 'Invalid risk level',
  },
  maxPositions: {
    required: true,
    type: 'number',
    min: 1,
    max: 100,
    message: 'Max positions must be between 1 and 100',
  },
  stopLoss: {
    required: true,
    type: 'number',
    min: 0.1,
    max: 50,
    message: 'Stop loss must be between 0.1% and 50%',
  },
  takeProfit: {
    required: true,
    type: 'number',
    min: 0.1,
    max: 1000,
    message: 'Take profit must be between 0.1% and 1000%',
  },
};

// ============================================================================
// ERROR CREATION UTILITIES
// ============================================================================

/**
 * Creates a standardized API error
 * @param code - Error code
 * @param message - Error message
 * @param details - Additional error details
 * @returns API error object
 */
export const createApiError = (
  code: string,
  message: string,
  details?: Record<string, any>,
): ApiError => ({
  code,
  message,
  details,
  timestamp: Date.now(),
});

/**
 * Creates a validation error
 * @param field - Field name
 * @param message - Error message
 * @returns API error object
 */
export const createValidationError = (field: string, message: string): ApiError =>
  createApiError('VALIDATION_ERROR', message, { field });

/**
 * Creates a network error
 * @param message - Error message
 * @returns API error object
 */
export const createNetworkError = (message: string = 'Network error occurred'): ApiError =>
  createApiError('NETWORK_ERROR', message);

/**
 * Creates an authentication error
 * @param message - Error message
 * @returns API error object
 */
export const createAuthError = (message: string = 'Authentication failed'): ApiError =>
  createApiError('AUTH_ERROR', message);

/**
 * Creates a permission error
 * @param message - Error message
 * @returns API error object
 */
export const createPermissionError = (message: string = 'Insufficient permissions'): ApiError =>
  createApiError('PERMISSION_ERROR', message);

// ============================================================================
// SANITIZATION UTILITIES
// ============================================================================

/**
 * Sanitizes string input to prevent XSS
 * @param input - Input string
 * @returns Sanitized string
 */
export const sanitizeString = (input: string): string => {
  return input
    .replace(/[<>]/g, '') // Remove < and >
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
};

/**
 * Sanitizes object input recursively
 * @param input - Input object
 * @returns Sanitized object
 */
export const sanitizeObject = (input: any): any => {
  if (typeof input === 'string') {
    return sanitizeString(input);
  }
  if (Array.isArray(input)) {
    return input.map(sanitizeObject);
  }
  if (input && typeof input === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(input)) {
      sanitized[sanitizeString(key)] = sanitizeObject(value);
    }
    return sanitized;
  }
  return input;
};

/**
 * Sanitizes trade data
 * @param tradeData - Trade data to sanitize
 * @returns Sanitized trade data
 */
export const sanitizeTradeData = (tradeData: any) => {
  const sanitized = sanitizeObject(tradeData);

  // Additional trade-specific sanitization
  if (sanitized.symbol) {
    sanitized.symbol = sanitized.symbol.toUpperCase().replace(/[^A-Z0-9]/g, '');
  }

  if (sanitized.side) {
    sanitized.side = sanitized.side.toUpperCase();
  }

  if (sanitized.type) {
    sanitized.type = sanitized.type.toUpperCase().replace(/[^A-Z_]/g, '');
  }

  return sanitized;
};
