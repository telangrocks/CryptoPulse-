/**
 * Input validation utilities for trading operations
 * Provides comprehensive validation for all user inputs
 */

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface TradeValidationData {
  pair: string;
  action: 'BUY' | 'SELL';
  entry: number;
  stopLoss: number;
  takeProfit: number;
  confidence: number;
  amount?: number;
  leverage?: number;
}

export interface APIKeyValidationData {
  marketDataKey: string;
  marketDataSecret: string;
  tradeExecutionKey: string;
  tradeExecutionSecret: string;
  exchange: string;
  masterPassword: string;
}

/**
 * Validate trading pair format
 * @param pair - Trading pair string
 * @returns Validation result
 */
export const validateTradingPair = (pair: string): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!pair) {
    errors.push('Trading pair is required');
    return { isValid: false, errors, warnings };
  }

  // Check format (e.g., BTC/USDT, ETH/USD)
  const pairRegex = /^[A-Z]{2,10}\/[A-Z]{2,10}$/;
  if (!pairRegex.test(pair)) {
    errors.push('Invalid trading pair format. Use format like BTC/USDT');
  }

  // Check for common valid pairs
  const validPairs = [
    'BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'ADA/USDT', 'SOL/USDT',
    'XRP/USDT', 'DOT/USDT', 'DOGE/USDT', 'AVAX/USDT', 'MATIC/USDT'
  ];
  
  if (!validPairs.includes(pair)) {
    warnings.push('Trading pair not in recommended list. Verify it exists on your exchange.');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

/**
 * Validate trade parameters
 * @param tradeData - Trade data to validate
 * @returns Validation result
 */
export const validateTradeData = (tradeData: TradeValidationData): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate trading pair
  const pairValidation = validateTradingPair(tradeData.pair);
  errors.push(...pairValidation.errors);
  warnings.push(...pairValidation.warnings);

  // Validate action
  if (!['BUY', 'SELL'].includes(tradeData.action)) {
    errors.push('Invalid action. Must be BUY or SELL');
  }

  // Validate prices
  if (tradeData.entry <= 0) {
    errors.push('Entry price must be greater than 0');
  }

  if (tradeData.stopLoss <= 0) {
    errors.push('Stop loss must be greater than 0');
  }

  if (tradeData.takeProfit <= 0) {
    errors.push('Take profit must be greater than 0');
  }

  // Validate price relationships
  if (tradeData.action === 'BUY') {
    if (tradeData.stopLoss >= tradeData.entry) {
      errors.push('Stop loss must be below entry price for BUY orders');
    }
    if (tradeData.takeProfit <= tradeData.entry) {
      errors.push('Take profit must be above entry price for BUY orders');
    }
  } else if (tradeData.action === 'SELL') {
    if (tradeData.stopLoss <= tradeData.entry) {
      errors.push('Stop loss must be above entry price for SELL orders');
    }
    if (tradeData.takeProfit >= tradeData.entry) {
      errors.push('Take profit must be below entry price for SELL orders');
    }
  }

  // Validate confidence level
  if (tradeData.confidence < 0 || tradeData.confidence > 100) {
    errors.push('Confidence must be between 0 and 100');
  }

  if (tradeData.confidence < 60) {
    warnings.push('Low confidence trade. Consider waiting for better signals.');
  }

  // Validate risk/reward ratio
  const riskAmount = Math.abs(tradeData.entry - tradeData.stopLoss);
  const rewardAmount = Math.abs(tradeData.takeProfit - tradeData.entry);
  const riskRewardRatio = rewardAmount / riskAmount;

  if (riskRewardRatio < 1) {
    warnings.push('Risk/reward ratio is less than 1:1. Consider adjusting stop loss or take profit.');
  }

  if (riskRewardRatio > 5) {
    warnings.push('Very high risk/reward ratio. Verify take profit target is realistic.');
  }

  // Validate amount if provided
  if (tradeData.amount !== undefined) {
    if (tradeData.amount <= 0) {
      errors.push('Trade amount must be greater than 0');
    }
    if (tradeData.amount > 1000000) {
      warnings.push('Large trade amount detected. Verify this is intentional.');
    }
  }

  // Validate leverage if provided
  if (tradeData.leverage !== undefined) {
    if (tradeData.leverage < 1 || tradeData.leverage > 100) {
      errors.push('Leverage must be between 1 and 100');
    }
    if (tradeData.leverage > 10) {
      warnings.push('High leverage detected. This significantly increases risk.');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

/**
 * Validate API key format
 * @param key - API key to validate
 * @param keyType - Type of API key
 * @returns Validation result
 */
export const validateAPIKey = (key: string, keyType: string): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!key) {
    errors.push(`${keyType} is required`);
    return { isValid: false, errors, warnings };
  }

  // Check minimum length
  if (key.length < 20) {
    errors.push(`${keyType} appears too short. Verify the key is correct.`);
  }

  // Check maximum length
  if (key.length > 200) {
    errors.push(`${keyType} appears too long. Verify the key is correct.`);
  }

  // Check for common invalid patterns
  if (key.includes(' ')) {
    errors.push(`${keyType} contains spaces. Remove any spaces.`);
  }

  if (key.includes('\n') || key.includes('\r') || key.includes('\t')) {
    errors.push(`${keyType} contains line breaks. Remove any line breaks.`);
  }

  // Check for common test patterns
  if (key.toLowerCase().includes('test') || key.toLowerCase().includes('demo')) {
    warnings.push(`${keyType} appears to be a test key. Use production keys for live trading.`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

/**
 * Validate API key setup data
 * @param apiKeyData - API key data to validate
 * @returns Validation result
 */
export const validateAPIKeyData = (apiKeyData: APIKeyValidationData): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate individual keys
  const marketDataKeyValidation = validateAPIKey(apiKeyData.marketDataKey, 'Market Data API Key');
  const marketDataSecretValidation = validateAPIKey(apiKeyData.marketDataSecret, 'Market Data API Secret');
  const tradeExecutionKeyValidation = validateAPIKey(apiKeyData.tradeExecutionKey, 'Trade Execution API Key');
  const tradeExecutionSecretValidation = validateAPIKey(apiKeyData.tradeExecutionSecret, 'Trade Execution API Secret');

  errors.push(...marketDataKeyValidation.errors);
  errors.push(...marketDataSecretValidation.errors);
  errors.push(...tradeExecutionKeyValidation.errors);
  errors.push(...tradeExecutionSecretValidation.errors);

  warnings.push(...marketDataKeyValidation.warnings);
  warnings.push(...marketDataSecretValidation.warnings);
  warnings.push(...tradeExecutionKeyValidation.warnings);
  warnings.push(...tradeExecutionSecretValidation.warnings);

  // Validate exchange
  const validExchanges = ['binance', 'delta', 'coinbase', 'kraken'];
  if (!validExchanges.includes(apiKeyData.exchange.toLowerCase())) {
    errors.push('Invalid exchange selected');
  }

  // Validate master password
  if (!apiKeyData.masterPassword) {
    errors.push('Master password is required');
  } else if (apiKeyData.masterPassword.length < 8) {
    errors.push('Master password must be at least 8 characters long');
  } else if (apiKeyData.masterPassword.length > 128) {
    errors.push('Master password is too long');
  }

  // Check for password strength
  const passwordStrength = checkPasswordStrength(apiKeyData.masterPassword);
  if (passwordStrength.score < 3) {
    warnings.push('Master password is weak. Use a stronger password for better security.');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

/**
 * Check password strength
 * @param password - Password to check
 * @returns Password strength score and feedback
 */
export const checkPasswordStrength = (password: string): { score: number; feedback: string[] } => {
  let score = 0;
  const feedback: string[] = [];

  if (password.length >= 8) score++;
  else feedback.push('Use at least 8 characters');

  if (password.length >= 12) score++;
  else feedback.push('Use at least 12 characters for better security');

  if (/[a-z]/.test(password)) score++;
  else feedback.push('Include lowercase letters');

  if (/[A-Z]/.test(password)) score++;
  else feedback.push('Include uppercase letters');

  if (/[0-9]/.test(password)) score++;
  else feedback.push('Include numbers');

  if (/[^A-Za-z0-9]/.test(password)) score++;
  else feedback.push('Include special characters');

  return { score, feedback };
};

/**
 * Sanitize user input
 * @param input - Input to sanitize
 * @returns Sanitized input
 */
export const sanitizeInput = (input: string): string => {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/['"]/g, '') // Remove quotes
    .replace(/[;]/g, '') // Remove semicolons
    .substring(0, 1000); // Limit length
};

/**
 * Validate numeric input
 * @param value - Value to validate
 * @param min - Minimum value
 * @param max - Maximum value
 * @param fieldName - Name of the field
 * @returns Validation result
 */
export const validateNumericInput = (
  value: number | string,
  min: number,
  max: number,
  fieldName: string
): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  const numValue = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(numValue)) {
    errors.push(`${fieldName} must be a valid number`);
    return { isValid: false, errors, warnings };
  }

  if (numValue < min) {
    errors.push(`${fieldName} must be at least ${min}`);
  }

  if (numValue > max) {
    errors.push(`${fieldName} must be no more than ${max}`);
  }

  if (numValue === 0) {
    warnings.push(`${fieldName} is zero. Verify this is intentional.`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};
