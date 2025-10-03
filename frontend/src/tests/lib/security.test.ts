// =============================================================================
// Security Utilities Tests - Production Ready
// =============================================================================
// Comprehensive tests for security utilities

import {
  sanitizeInput,
  sanitizeHTML,
  validateEmail,
  validatePassword,
  validateApiKey,
  validateSymbol,
  validateAmount,
  rateLimiter,
  generateCSRFToken,
  validateCSRFToken,
  secureStorage,
  securityMonitor,
} from '../../lib/security';

describe('Security Utilities', () => {
  describe('sanitizeInput', () => {
    it('should sanitize malicious input', () => {
      const maliciousInput = '<script>alert("xss")</script>';
      const result = sanitizeInput(maliciousInput);
      expect(result).not.toContain('<script>');
      expect(result).not.toContain('alert');
    });

    it('should handle normal input correctly', () => {
      const normalInput = 'Hello World';
      const result = sanitizeInput(normalInput);
      expect(result).toBe('Hello World');
    });

    it('should handle empty input', () => {
      const result = sanitizeInput('');
      expect(result).toBe('');
    });

    it('should handle non-string input', () => {
      const result = sanitizeInput(123 as any);
      expect(result).toBe(123);
    });
  });

  describe('sanitizeHTML', () => {
    it('should sanitize dangerous HTML', () => {
      const dangerousHTML = '<script>alert("xss")</script><p>Safe content</p>';
      const result = sanitizeHTML(dangerousHTML);
      expect(result).not.toContain('<script>');
      expect(result).toContain('<p>Safe content</p>');
    });

    it('should allow safe HTML tags', () => {
      const safeHTML = '<b>Bold</b> <i>Italic</i> <p>Paragraph</p>';
      const result = sanitizeHTML(safeHTML);
      expect(result).toContain('<b>Bold</b>');
      expect(result).toContain('<i>Italic</i>');
      expect(result).toContain('<p>Paragraph</p>');
    });
  });

  describe('validateEmail', () => {
    it('should validate correct email addresses', () => {
      expect(validateEmail('test@example.com')).toBe(true);
      expect(validateEmail('user.name@domain.co.uk')).toBe(true);
      expect(validateEmail('user+tag@example.org')).toBe(true);
    });

    it('should reject invalid email addresses', () => {
      expect(validateEmail('invalid-email')).toBe(false);
      expect(validateEmail('@example.com')).toBe(false);
      expect(validateEmail('test@')).toBe(false);
      expect(validateEmail('')).toBe(false);
    });
  });

  describe('validatePassword', () => {
    it('should validate strong passwords', () => {
      const result = validatePassword('StrongPass123!');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject weak passwords', () => {
      const result = validatePassword('weak');
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject passwords with common patterns', () => {
      const result = validatePassword('password123!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password contains common weak patterns');
    });

    it('should require minimum length', () => {
      const result = validatePassword('Short1!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters');
    });

    it('should require uppercase letter', () => {
      const result = validatePassword('lowercase123!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
    });

    it('should require lowercase letter', () => {
      const result = validatePassword('UPPERCASE123!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one lowercase letter');
    });

    it('should require number', () => {
      const result = validatePassword('NoNumbers!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one number');
    });

    it('should require special character', () => {
      const result = validatePassword('NoSpecial123');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one special character');
    });
  });

  describe('validateApiKey', () => {
    it('should validate correct API keys', () => {
      const result = validateApiKey('valid-api-key-1234567890');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject short API keys', () => {
      const result = validateApiKey('short');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('API key must be at least 20 characters');
    });

    it('should reject API keys with invalid characters', () => {
      const result = validateApiKey('invalid@key#with$special%chars');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('API key contains invalid characters');
    });

    it('should reject test/demo API keys', () => {
      const result = validateApiKey('test-api-key-1234567890');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('API key appears to be a test/demo key');
    });
  });

  describe('validateSymbol', () => {
    it('should validate correct symbols', () => {
      expect(validateSymbol('BTC')).toBe(true);
      expect(validateSymbol('ETHUSDT')).toBe(true);
      expect(validateSymbol('BTC123')).toBe(true);
    });

    it('should reject invalid symbols', () => {
      expect(validateSymbol('btc')).toBe(false); // lowercase
      expect(validateSymbol('BTC-USD')).toBe(false); // hyphen
      expect(validateSymbol('BT')).toBe(false); // too short
      expect(validateSymbol('BTCUSDT123456789')).toBe(false); // too long
    });
  });

  describe('validateAmount', () => {
    it('should validate correct amounts', () => {
      const result = validateAmount(100);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject amounts below minimum', () => {
      const result = validateAmount(0.005);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Amount must be at least 0.01');
    });

    it('should reject amounts above maximum', () => {
      const result = validateAmount(2000000);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Amount must be no more than 1000000');
    });

    it('should reject invalid amounts', () => {
      const result = validateAmount(NaN);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Amount must be a valid number');
    });
  });

  describe('rateLimiter', () => {
    beforeEach(() => {
      // Clear rate limiter state
      (rateLimiter as any).requests.clear();
    });

    it('should allow requests within limit', () => {
      const key = 'test-key';
      const limit = 5;
      const windowMs = 60000;

      for (let i = 0; i < limit; i++) {
        expect(rateLimiter.isAllowed(key, limit, windowMs)).toBe(true);
      }
    });

    it('should block requests exceeding limit', () => {
      const key = 'test-key';
      const limit = 3;
      const windowMs = 60000;

      // Make requests up to limit
      for (let i = 0; i < limit; i++) {
        expect(rateLimiter.isAllowed(key, limit, windowMs)).toBe(true);
      }

      // Next request should be blocked
      expect(rateLimiter.isAllowed(key, limit, windowMs)).toBe(false);
    });

    it('should track remaining requests correctly', () => {
      const key = 'test-key';
      const limit = 5;
      const windowMs = 60000;

      expect(rateLimiter.getRemainingRequests(key, limit, windowMs)).toBe(5);

      rateLimiter.isAllowed(key, limit, windowMs);
      expect(rateLimiter.getRemainingRequests(key, limit, windowMs)).toBe(4);
    });
  });

  describe('CSRF Protection', () => {
    it('should generate valid CSRF tokens', () => {
      const token1 = generateCSRFToken();
      const token2 = generateCSRFToken();

      expect(token1).toBeDefined();
      expect(token2).toBeDefined();
      expect(token1).not.toBe(token2);
      expect(token1.length).toBeGreaterThan(0);
    });

    it('should validate correct CSRF tokens', () => {
      const token = generateCSRFToken();
      expect(validateCSRFToken(token, token)).toBe(true);
    });

    it('should reject incorrect CSRF tokens', () => {
      const token1 = generateCSRFToken();
      const token2 = generateCSRFToken();
      expect(validateCSRFToken(token1, token2)).toBe(false);
    });
  });

  describe('secureStorage', () => {
    beforeEach(() => {
      // Clear localStorage before each test
      localStorage.clear();
    });

    it('should store and retrieve encrypted data', () => {
      const key = 'test-key';
      const value = 'test-value';

      secureStorage.setItem(key, value);
      const retrieved = secureStorage.getItem(key);

      expect(retrieved).toBe(value);
    });

    it('should handle non-existent keys', () => {
      const retrieved = secureStorage.getItem('non-existent');
      expect(retrieved).toBeNull();
    });

    it('should remove items correctly', () => {
      const key = 'test-key';
      const value = 'test-value';

      secureStorage.setItem(key, value);
      expect(secureStorage.getItem(key)).toBe(value);

      secureStorage.removeItem(key);
      expect(secureStorage.getItem(key)).toBeNull();
    });

    it('should clear all items', () => {
      secureStorage.setItem('key1', 'value1');
      secureStorage.setItem('key2', 'value2');

      secureStorage.clear();

      expect(secureStorage.getItem('key1')).toBeNull();
      expect(secureStorage.getItem('key2')).toBeNull();
    });
  });

  describe('securityMonitor', () => {
    let consoleSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it('should log suspicious activity', () => {
      securityMonitor.logSuspiciousActivity('test-activity', { details: 'test' });
      expect(consoleSpy).toHaveBeenCalledWith(
        'Suspicious activity detected:',
        expect.objectContaining({
          activity: 'test-activity',
          details: { details: 'test' },
        }),
      );
    });

    it('should log security events', () => {
      const consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation(() => {});

      securityMonitor.logSecurityEvent('test-event', { details: 'test' });
      expect(consoleInfoSpy).toHaveBeenCalledWith(
        'Security event:',
        expect.objectContaining({
          event: 'test-event',
          details: { details: 'test' },
        }),
      );

      consoleInfoSpy.mockRestore();
    });
  });
});
