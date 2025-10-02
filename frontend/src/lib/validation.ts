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

export interface PortfolioValidationData {
  totalBalance: number;
  allocations: Record<string, number>;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

/**
 * Validate trading pair format
 */
export function validateTradingPair(pair: string): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: []
  };

  if (!pair || typeof pair !== 'string') {
    result.isValid = false;
    result.errors.push('Trading pair is required');
    return result;
  }

  const pairRegex = /^[A-Z]{2,10}[/-][A-Z]{2,10}$/;
  if (!pairRegex.test(pair.toUpperCase())) {
    result.isValid = false;
    result.errors.push('Invalid trading pair format. Expected format: BTC/USDT or BTC-USDT');
  }

  return result;
}

/**
 * Validate price value
 */
export function validatePrice(price: number, label = 'Price'): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: []
  };

  if (typeof price !== 'number' || isNaN(price)) {
    result.isValid = false;
    result.errors.push(`${label} must be a valid number`);
    return result;
  }

  if (price <= 0) {
    result.isValid = false;
    result.errors.push(`${label} must be greater than 0`);
  }

  if (price > 1000000) {
    result.warnings.push(`${label} is unusually high`);
  }

  return result;
}
