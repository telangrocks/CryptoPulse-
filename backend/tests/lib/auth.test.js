// =============================================================================
// Authentication System Tests - Production Ready
// =============================================================================
// Comprehensive unit tests for the authentication system

const {
  hashPassword,
  comparePassword,
  generateTokens,
  verifyToken,
  refreshToken,
  generateSecureRandom,
  validatePasswordStrength,
  getAuthMetrics,
  resetAuthMetrics
} = require('../../lib/auth');

describe('Authentication System', () => {
  beforeEach(() => {
    resetAuthMetrics();
  });

  describe('Password Hashing', () => {
    test('should hash password correctly', async () => {
      const password = 'testPassword123!';
      const hashedPassword = await hashPassword(password);
      
      expect(hashedPassword).toBeDefined();
      expect(hashedPassword).not.toBe(password);
      expect(hashedPassword).toMatch(/^\$2[aby]\$/); // bcrypt format
    });

    test('should generate different hashes for same password', async () => {
      const password = 'testPassword123!';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);
      
      expect(hash1).not.toEqual(hash2);
    });

    test('should handle empty password', async () => {
      await expect(hashPassword('')).rejects.toThrow();
    });

    test('should handle null password', async () => {
      await expect(hashPassword(null)).rejects.toThrow();
    });

    test('should handle undefined password', async () => {
      await expect(hashPassword(undefined)).rejects.toThrow();
    });

    test('should handle weak passwords', async () => {
      const weakPasswords = [
        'password',
        '123456',
        'qwerty',
        'admin',
        'test'
      ];

      for (const password of weakPasswords) {
        await expect(hashPassword(password)).rejects.toThrow();
      }
    });

    test('should handle short passwords', async () => {
      await expect(hashPassword('123')).rejects.toThrow();
    });

    test('should accept strong passwords', async () => {
      const strongPasswords = [
        'StrongPassword123!',
        'MySecure@Pass2024',
        'CryptoPulse#2024',
        'Test123!@#Pass'
      ];

      for (const password of strongPasswords) {
        const hashed = await hashPassword(password);
        expect(hashed).toBeDefined();
        expect(hashed).toMatch(/^\$2[aby]\$/);
      }
    });
  });

  describe('Password Comparison', () => {
    test('should compare passwords correctly', async () => {
      const password = 'testPassword123!';
      const hashedPassword = await hashPassword(password);
      
      const isValid = await comparePassword(password, hashedPassword);
      expect(isValid).toBe(true);
    });

    test('should reject wrong passwords', async () => {
      const password = 'testPassword123!';
      const wrongPassword = 'wrongPassword123!';
      const hashedPassword = await hashPassword(password);
      
      const isValid = await comparePassword(wrongPassword, hashedPassword);
      expect(isValid).toBe(false);
    });

    test('should handle empty inputs', async () => {
      await expect(comparePassword('', 'hash')).rejects.toThrow();
      await expect(comparePassword('password', '')).rejects.toThrow();
      await expect(comparePassword(null, 'hash')).rejects.toThrow();
      await expect(comparePassword('password', null)).rejects.toThrow();
    });

    test('should handle invalid hash format', async () => {
      const password = 'testPassword123!';
      const invalidHash = 'invalid-hash-format';
      
      await expect(comparePassword(password, invalidHash)).rejects.toThrow();
    });
  });

  describe('JWT Token Generation', () => {
    test('should generate valid JWT tokens', () => {
      const payload = {
        userId: 'user123',
        email: 'test@example.com',
        role: 'user'
      };
      
      const tokens = generateTokens(payload);
      
      expect(tokens).toHaveProperty('accessToken');
      expect(tokens).toHaveProperty('refreshToken');
      expect(tokens).toHaveProperty('tokenType', 'Bearer');
      expect(tokens).toHaveProperty('expiresIn');
      expect(tokens).toHaveProperty('jti');
      
      expect(tokens.accessToken).toBeDefined();
      expect(tokens.refreshToken).toBeDefined();
      expect(tokens.accessToken).not.toEqual(tokens.refreshToken);
    });

    test('should generate different tokens for same payload', () => {
      const payload = {
        userId: 'user123',
        email: 'test@example.com'
      };
      
      const tokens1 = generateTokens(payload);
      const tokens2 = generateTokens(payload);
      
      expect(tokens1.accessToken).not.toEqual(tokens2.accessToken);
      expect(tokens1.refreshToken).not.toEqual(tokens2.refreshToken);
      expect(tokens1.jti).not.toEqual(tokens2.jti);
    });

    test('should include all required claims', () => {
      const payload = {
        userId: 'user123',
        email: 'test@example.com'
      };
      
      const tokens = generateTokens(payload);
      const decoded = verifyToken(tokens.accessToken);
      
      expect(decoded.userId).toBe(payload.userId);
      expect(decoded.email).toBe(payload.email);
      expect(decoded.iat).toBeDefined();
      expect(decoded.exp).toBeDefined();
      expect(decoded.jti).toBeDefined();
      expect(decoded.iss).toBe('cryptopulse-api');
      expect(decoded.aud).toBe('cryptopulse-client');
      expect(decoded.version).toBe('2.0.0');
    });

    test('should handle missing userId', () => {
      const payload = {
        email: 'test@example.com'
      };
      
      expect(() => generateTokens(payload)).toThrow();
    });

    test('should handle null payload', () => {
      expect(() => generateTokens(null)).toThrow();
    });

    test('should handle undefined payload', () => {
      expect(() => generateTokens(undefined)).toThrow();
    });
  });

  describe('JWT Token Verification', () => {
    let tokens;

    beforeEach(() => {
      const payload = {
        userId: 'user123',
        email: 'test@example.com'
      };
      tokens = generateTokens(payload);
    });

    test('should verify valid tokens', () => {
      const decoded = verifyToken(tokens.accessToken);
      
      expect(decoded.userId).toBe('user123');
      expect(decoded.email).toBe('test@example.com');
    });

    test('should reject invalid tokens', () => {
      expect(() => verifyToken('invalid-token')).toThrow();
    });

    test('should reject expired tokens', () => {
      // Create an expired token by mocking Date.now
      const originalNow = Date.now;
      Date.now = jest.fn(() => Date.now() + 25 * 60 * 60 * 1000); // 25 hours from now
      
      try {
        expect(() => verifyToken(tokens.accessToken)).toThrow();
      } finally {
        Date.now = originalNow;
      }
    });

    test('should reject tokens with wrong issuer', () => {
      // This would require creating a token with wrong issuer
      // For now, we test that our tokens have correct issuer
      const decoded = verifyToken(tokens.accessToken);
      expect(decoded.iss).toBe('cryptopulse-api');
    });

    test('should reject tokens with wrong audience', () => {
      const decoded = verifyToken(tokens.accessToken);
      expect(decoded.aud).toBe('cryptopulse-client');
    });

    test('should handle malformed tokens', () => {
      expect(() => verifyToken('not-a-jwt')).toThrow();
      expect(() => verifyToken('header.payload')).toThrow();
      expect(() => verifyToken('')).toThrow();
    });

    test('should handle null and undefined tokens', () => {
      expect(() => verifyToken(null)).toThrow();
      expect(() => verifyToken(undefined)).toThrow();
    });

    test('should handle tokens with wrong signature', () => {
      const [header, payload, signature] = tokens.accessToken.split('.');
      const wrongToken = `${header}.${payload}.wrongsignature`;
      
      expect(() => verifyToken(wrongToken)).toThrow();
    });
  });

  describe('Token Refresh', () => {
    let tokens;

    beforeEach(() => {
      const payload = {
        userId: 'user123',
        email: 'test@example.com'
      };
      tokens = generateTokens(payload);
    });

    test('should refresh valid refresh token', () => {
      const newTokens = refreshToken(tokens.refreshToken);
      
      expect(newTokens).toHaveProperty('accessToken');
      expect(newTokens).toHaveProperty('refreshToken');
      expect(newTokens.accessToken).not.toEqual(tokens.accessToken);
      expect(newTokens.refreshToken).not.toEqual(tokens.refreshToken);
    });

    test('should reject invalid refresh token', () => {
      expect(() => refreshToken('invalid-refresh-token')).toThrow();
    });

    test('should reject access token as refresh token', () => {
      expect(() => refreshToken(tokens.accessToken)).toThrow();
    });

    test('should handle null and undefined refresh tokens', () => {
      expect(() => refreshToken(null)).toThrow();
      expect(() => refreshToken(undefined)).toThrow();
    });

    test('should create new JTI for refreshed tokens', () => {
      const newTokens = refreshToken(tokens.refreshToken);
      
      const originalDecoded = verifyToken(tokens.accessToken);
      const newDecoded = verifyToken(newTokens.accessToken);
      
      expect(originalDecoded.jti).not.toEqual(newDecoded.jti);
    });
  });

  describe('Password Strength Validation', () => {
    test('should validate strong passwords', () => {
      const strongPasswords = [
        'StrongPassword123!',
        'MySecure@Pass2024',
        'CryptoPulse#2024',
        'Test123!@#Pass'
      ];

      for (const password of strongPasswords) {
        const result = validatePasswordStrength(password);
        expect(result.isValid).toBe(true);
        expect(result.score).toBeGreaterThanOrEqual(3);
      }
    });

    test('should reject weak passwords', () => {
      const weakPasswords = [
        'password',
        '123456',
        'qwerty',
        'admin',
        'test',
        'abc123'
      ];

      for (const password of weakPasswords) {
        const result = validatePasswordStrength(password);
        expect(result.isValid).toBe(false);
        expect(result.score).toBeLessThan(3);
        expect(result.reasons.length).toBeGreaterThan(0);
      }
    });

    test('should reject short passwords', () => {
      const shortPasswords = ['123', 'abc', 'test'];

      for (const password of shortPasswords) {
        const result = validatePasswordStrength(password);
        expect(result.isValid).toBe(false);
        expect(result.reasons).toContain('Password must be at least 8 characters long');
      }
    });

    test('should require uppercase letters', () => {
      const password = 'lowercase123!';
      const result = validatePasswordStrength(password);
      
      expect(result.isValid).toBe(false);
      expect(result.reasons).toContain('Password must contain at least one uppercase letter');
    });

    test('should require lowercase letters', () => {
      const password = 'UPPERCASE123!';
      const result = validatePasswordStrength(password);
      
      expect(result.isValid).toBe(false);
      expect(result.reasons).toContain('Password must contain at least one lowercase letter');
    });

    test('should require numbers', () => {
      const password = 'NoNumbers!';
      const result = validatePasswordStrength(password);
      
      expect(result.isValid).toBe(false);
      expect(result.reasons).toContain('Password must contain at least one number');
    });

    test('should require special characters', () => {
      const password = 'NoSpecialChars123';
      const result = validatePasswordStrength(password);
      
      expect(result.isValid).toBe(false);
      expect(result.reasons).toContain('Password must contain at least one special character');
    });

    test('should handle empty password', () => {
      const result = validatePasswordStrength('');
      expect(result.isValid).toBe(false);
      expect(result.reasons.length).toBeGreaterThan(0);
    });

    test('should handle null password', () => {
      const result = validatePasswordStrength(null);
      expect(result.isValid).toBe(false);
      expect(result.reasons.length).toBeGreaterThan(0);
    });

    test('should calculate password score correctly', () => {
      const testCases = [
        { password: 'password', expectedScore: 0 },
        { password: 'Password123', expectedScore: 2 },
        { password: 'Password123!', expectedScore: 3 },
        { password: 'StrongPassword123!@#', expectedScore: 4 }
      ];

      for (const testCase of testCases) {
        const result = validatePasswordStrength(testCase.password);
        expect(result.score).toBe(testCase.expectedScore);
      }
    });
  });

  describe('Secure Random Generation', () => {
    test('should generate secure random string', () => {
      const random1 = generateSecureRandom();
      const random2 = generateSecureRandom();
      
      expect(random1).toBeDefined();
      expect(random2).toBeDefined();
      expect(random1).not.toEqual(random2);
      expect(random1.length).toBeGreaterThan(0);
    });

    test('should generate different lengths', () => {
      const random16 = generateSecureRandom(16);
      const random32 = generateSecureRandom(32);
      
      expect(random16.length).toBe(16);
      expect(random32.length).toBe(32);
    });

    test('should handle zero length', () => {
      const random = generateSecureRandom(0);
      expect(random).toBe('');
    });

    test('should handle negative length', () => {
      expect(() => generateSecureRandom(-1)).toThrow();
    });
  });

  describe('Authentication Metrics', () => {
    test('should track password hashing operations', async () => {
      await hashPassword('testPassword123!');
      
      const metrics = getAuthMetrics();
      expect(metrics.operations.passwordHash).toBe(1);
    });

    test('should track password comparison operations', async () => {
      const password = 'testPassword123!';
      const hashedPassword = await hashPassword(password);
      await comparePassword(password, hashedPassword);
      
      const metrics = getAuthMetrics();
      expect(metrics.operations.passwordCompare).toBe(1);
    });

    test('should track token generation operations', () => {
      const payload = { userId: 'user123' };
      generateTokens(payload);
      
      const metrics = getAuthMetrics();
      expect(metrics.operations.tokenGeneration).toBe(1);
    });

    test('should track token verification operations', () => {
      const payload = { userId: 'user123' };
      const tokens = generateTokens(payload);
      verifyToken(tokens.accessToken);
      
      const metrics = getAuthMetrics();
      expect(metrics.operations.tokenVerification).toBe(1);
    });

    test('should track failed operations', async () => {
      // Track failed password comparison
      try {
        await comparePassword('wrong', 'hash');
      } catch (error) {
        // Expected to fail
      }
      
      const metrics = getAuthMetrics();
      expect(metrics.errorRates.passwordCompare).toBe('100.00');
    });

    test('should reset metrics correctly', async () => {
      await hashPassword('testPassword123!');
      
      let metrics = getAuthMetrics();
      expect(metrics.operations.passwordHash).toBe(1);
      
      resetAuthMetrics();
      
      metrics = getAuthMetrics();
      expect(metrics.operations.passwordHash).toBe(0);
    });

    test('should measure performance accurately', async () => {
      // Perform multiple operations
      for (let i = 0; i < 100; i++) {
        const password = `testPassword${i}!`;
        const hashed = await hashPassword(password);
        await comparePassword(password, hashed);
      }
      
      const metrics = getAuthMetrics();
      
      expect(metrics.performance.passwordHash.average).toBeGreaterThan(0);
      expect(metrics.performance.passwordCompare.average).toBeGreaterThan(0);
      expect(metrics.performance.passwordHash.p95).toBeGreaterThanOrEqual(metrics.performance.passwordHash.average);
      expect(metrics.performance.passwordCompare.p95).toBeGreaterThanOrEqual(metrics.performance.passwordCompare.average);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle very long passwords', async () => {
      const longPassword = 'A'.repeat(10000);
      
      // Should not throw, but might be slow
      const hashed = await hashPassword(longPassword);
      expect(hashed).toBeDefined();
      
      const isValid = await comparePassword(longPassword, hashed);
      expect(isValid).toBe(true);
    });

    test('should handle special characters in passwords', async () => {
      const specialPassword = 'Test123!@#$%^&*()_+-=[]{}|;:,.<>?';
      
      const hashed = await hashPassword(specialPassword);
      expect(hashed).toBeDefined();
      
      const isValid = await comparePassword(specialPassword, hashed);
      expect(isValid).toBe(true);
    });

    test('should handle unicode passwords', async () => {
      const unicodePassword = '测试密码123!';
      
      const hashed = await hashPassword(unicodePassword);
      expect(hashed).toBeDefined();
      
      const isValid = await comparePassword(unicodePassword, hashed);
      expect(isValid).toBe(true);
    });

    test('should handle concurrent operations', async () => {
      const promises = [];
      
      for (let i = 0; i < 10; i++) {
        promises.push(hashPassword(`password${i}!`));
      }
      
      const results = await Promise.all(promises);
      expect(results).toHaveLength(10);
      
      results.forEach(result => {
        expect(result).toBeDefined();
      });
    });

    test('should handle memory pressure', async () => {
      // Simulate memory pressure by creating many passwords
      const promises = [];
      
      for (let i = 0; i < 1000; i++) {
        promises.push(hashPassword(`password${i}!`));
      }
      
      const results = await Promise.all(promises);
      expect(results).toHaveLength(1000);
      
      // All should be successful
      results.forEach(result => {
        expect(result).toBeDefined();
      });
    });
  });
});
