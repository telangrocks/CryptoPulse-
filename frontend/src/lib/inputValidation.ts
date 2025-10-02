/**
 * Input Validation Utilities for CryptoPulse
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  sanitizedValue?: string;
}

export class InputValidator {
  private static readonly EMAIL_PATTERN = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  private static readonly API_KEY_PATTERN = /^[a-zA-Z0-9]{32,256}$/;
  private static readonly PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

  static sanitizeInput(input: string): string {
    if (typeof input !== 'string') return '';
    return input.trim().replace(/[<>"'&]/g, '').slice(0, 1000);
  }

  static validateEmail(email: string): ValidationResult {
    const sanitized = this.sanitizeInput(email);
    
    if (!sanitized) {
      return { isValid: false, error: 'Email is required' };
    }

    if (!this.EMAIL_PATTERN.test(sanitized)) {
      return { isValid: false, error: 'Invalid email format' };
    }

    return { isValid: true, sanitizedValue: sanitized };
  }

  static validatePassword(password: string): ValidationResult {
    if (!password) {
      return { isValid: false, error: 'Password is required' };
    }

    if (password.length < 8) {
      return { isValid: false, error: 'Password must be at least 8 characters' };
    }

    if (!this.PASSWORD_PATTERN.test(password)) {
      return { 
        isValid: false, 
        error: 'Password must contain uppercase, lowercase, number, and special character' 
      };
    }

    return { isValid: true };
  }

  static validateApiKey(apiKey: string): ValidationResult {
    const sanitized = this.sanitizeInput(apiKey);
    
    if (!sanitized) {
      return { isValid: false, error: 'API key is required' };
    }

    if (!this.API_KEY_PATTERN.test(sanitized)) {
      return { isValid: false, error: 'Invalid API key format' };
    }

    return { isValid: true, sanitizedValue: sanitized };
  }

  static validateTradingPair(pair: string): ValidationResult {
    const sanitized = this.sanitizeInput(pair).toUpperCase();
    
    if (!sanitized) {
      return { isValid: false, error: 'Trading pair is required' };
    }

    const pairPattern = /^[A-Z]{2,10}[/-][A-Z]{2,10}$/;
    if (!pairPattern.test(sanitized)) {
      return { isValid: false, error: 'Invalid trading pair format (e.g., BTC/USDT)' };
    }

    return { isValid: true, sanitizedValue: sanitized };
  }

  static validateNumericInput(value: string, min?: number, max?: number): ValidationResult {
    const sanitized = this.sanitizeInput(value);
    
    if (!sanitized) {
      return { isValid: false, error: 'Value is required' };
    }

    const numericValue = parseFloat(sanitized);
    if (isNaN(numericValue)) {
      return { isValid: false, error: 'Must be a valid number' };
    }

    if (min !== undefined && numericValue < min) {
      return { isValid: false, error: `Value must be at least ${min}` };
    }

    if (max !== undefined && numericValue > max) {
      return { isValid: false, error: `Value must not exceed ${max}` };
    }

    return { isValid: true, sanitizedValue: numericValue.toString() };
  }
}
