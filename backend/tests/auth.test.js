// =============================================================================
// Authentication System Tests - Production Ready
// =============================================================================
// Comprehensive tests for authentication, authorization, and security features

// Set up test environment before importing auth module
process.env.JWT_SECRET = 'ScuL1geP4LHWyMrIb8KkqWaVrTzVOQyeGAhUbV1bHDdTNfZYws6W9Skx5JtGAO35TjgsqjSdIx5kqrpPGYQ';
process.env.NODE_ENV = 'test';

const { 
  hashPassword, 
  comparePassword, 
  generateTokens, 
  verifyToken,
  verifyTokenWithBlacklist,
  authenticateToken,
  optionalAuth,
  requireRole,
  authenticateApiKey,
  rateLimitByUser,
  SessionManager,
  validatePassword,
  validateEmail,
  generateSecureString,
  tokenBlacklist,
  rotateRefreshToken,
  sanitizeInput,
  sanitizeEmail,
  sanitizeUserId
} = require('../lib/auth');

const jwt = require('jsonwebtoken');
const { createMockRequest, createMockResponse, createMockNext } = require('./testHelpers');

// Mock logger to avoid console output during tests
jest.mock('../lib/logging', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
}));

// Mock database module
jest.mock('../lib/database', () => ({
  getRedisSafe: jest.fn(() => ({
    setEx: jest.fn(),
    get: jest.fn(),
    del: jest.fn(),
    exists: jest.fn(),
    sAdd: jest.fn(),
    sRem: jest.fn(),
    sMembers: jest.fn(),
    keys: jest.fn(),
    expire: jest.fn()
  }))
}));

describe('Authentication System', () => {
  // Set up test JWT secret
  beforeAll(() => {
    process.env.JWT_SECRET = 'a'.repeat(64) + 'b'.repeat(64); // 128 character secure secret
    process.env.JWT_EXPIRES_IN = '1h';
    process.env.JWT_REFRESH_EXPIRES_IN = '7d';
  });

  afterAll(() => {
    delete process.env.JWT_SECRET;
    delete process.env.JWT_EXPIRES_IN;
    delete process.env.JWT_REFRESH_EXPIRES_IN;
  });

  describe('Password Hashing', () => {
    test('should hash password with correct salt rounds', async () => {
      const password = 'StrongPassword123!';
      const hashedPassword = await hashPassword(password);
      
      expect(hashedPassword).toBeDefined();
      expect(hashedPassword).not.toBe(password);
      expect(hashedPassword.length).toBeGreaterThan(50); // bcrypt hash length
    });

    test('should reject empty password', async () => {
      await expect(hashPassword('')).rejects.toThrow('Password must be a non-empty string');
      await expect(hashPassword(null)).rejects.toThrow('Password must be a non-empty string');
      await expect(hashPassword(undefined)).rejects.toThrow('Password must be a non-empty string');
    });

    test('should reject short passwords', async () => {
      await expect(hashPassword('short')).rejects.toThrow('Password must be at least 8 characters long');
    });

    test('should reject weak passwords', async () => {
      const weakPasswords = ['password123!', '123456789!', 'qwerty123!', 'admin123!', 'user123!', 'test123!', 'demo123!'];
      
      for (const weakPassword of weakPasswords) {
        await expect(hashPassword(weakPassword)).rejects.toThrow('Password appears to be weak');
      }
    });

    test('should accept strong passwords', async () => {
      const strongPasswords = [
        'StrongPassword123!',
        'MySecure@Pass2024',
        'Complex#Pass456',
        'UltraSecure$789'
      ];
      
      for (const strongPassword of strongPasswords) {
        const hashedPassword = await hashPassword(strongPassword);
        expect(hashedPassword).toBeDefined();
        expect(hashedPassword).not.toBe(strongPassword);
      }
    });
  });

  describe('Password Comparison', () => {
    test('should compare passwords correctly', async () => {
      const password = 'StrongPassword123!';
      const hashedPassword = await hashPassword(password);
      
      const isValid = await comparePassword(password, hashedPassword);
      expect(isValid).toBe(true);
      
      const isInvalid = await comparePassword('WrongPassword', hashedPassword);
      expect(isInvalid).toBe(false);
    });

    test('should reject missing parameters', async () => {
      await expect(comparePassword('password', null)).rejects.toThrow('Both password and hashed password are required');
      await expect(comparePassword(null, 'hash')).rejects.toThrow('Both password and hashed password are required');
    });
  });

  describe('JWT Token Generation', () => {
    test('should generate valid access and refresh tokens', () => {
      const payload = {
        userId: 'test-user-123',
        email: 'test@example.com',
        role: 'user'
      };
      
      const tokens = generateTokens(payload);
      
      expect(tokens).toHaveProperty('accessToken');
      expect(tokens).toHaveProperty('refreshToken');
      expect(tokens).toHaveProperty('tokenType', 'Bearer');
      expect(tokens).toHaveProperty('expiresIn');
      expect(tokens).toHaveProperty('jti');
      
      // Verify token structure
      expect(tokens.accessToken.split('.')).toHaveLength(3);
      expect(tokens.refreshToken.split('.')).toHaveLength(3);
    });

    test('should reject invalid payload', () => {
      expect(() => generateTokens(null)).toThrow('Valid payload with userId is required');
      expect(() => generateTokens({})).toThrow('Valid payload with userId is required');
      expect(() => generateTokens({ email: 'test@example.com' })).toThrow('Valid payload with userId is required');
    });

    test('should include security claims in tokens', () => {
      const payload = {
        userId: 'test-user-123',
        email: 'test@example.com',
        role: 'user'
      };
      
      const tokens = generateTokens(payload);
      
      // Decode access token (without verification for testing)
      const decodedAccess = jwt.decode(tokens.accessToken);
      expect(decodedAccess).toHaveProperty('iss', 'cryptopulse-api');
      expect(decodedAccess).toHaveProperty('aud', 'cryptopulse-client');
      expect(decodedAccess).toHaveProperty('version', '2.0.0');
      expect(decodedAccess).toHaveProperty('jti');
      
      // Decode refresh token
      const decodedRefresh = jwt.decode(tokens.refreshToken);
      expect(decodedRefresh).toHaveProperty('type', 'refresh');
    });
  });

  describe('JWT Token Verification', () => {
    test('should verify valid tokens', () => {
      const payload = {
        userId: 'test-user-123',
        email: 'test@example.com',
        role: 'user'
      };
      
      const tokens = generateTokens(payload);
      const decoded = verifyToken(tokens.accessToken);
      
      expect(decoded).toHaveProperty('userId', 'test-user-123');
      expect(decoded).toHaveProperty('email', 'test@example.com');
      expect(decoded).toHaveProperty('role', 'user');
    });

    test('should reject invalid tokens', () => {
      expect(() => verifyToken('invalid.token.here')).toThrow('Invalid token');
      expect(() => verifyToken('')).toThrow('Token verification failed');
      expect(() => verifyToken(null)).toThrow('Token verification failed');
      expect(() => verifyToken('not-a-token')).toThrow('Invalid token format');
    });

    test('should reject expired tokens', () => {
      // Create a token with immediate expiration
      const payload = {
        userId: 'test-user-123',
        email: 'test@example.com',
        role: 'user'
      };
      
      const expiredToken = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: '-1h',
        algorithm: 'HS256'
      });
      
      expect(() => verifyToken(expiredToken)).toThrow('Invalid token');
    });
  });

  describe('Authentication Middleware', () => {
    test('should authenticate valid tokens', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();
      
      const payload = {
        userId: 'test-user-123',
        email: 'test@example.com',
        role: 'user'
      };
      
      const tokens = generateTokens(payload);
      req.headers.authorization = `Bearer ${tokens.accessToken}`;
      
      authenticateToken(req, res, next);
      
      expect(req.user).toBeDefined();
      expect(req.user.userId).toBe('test-user-123');
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('should reject missing tokens', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();
      
      authenticateToken(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Access token required'
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('should reject invalid tokens', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();
      
      req.headers.authorization = 'Bearer invalid.token.here';
      
      authenticateToken(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid or expired token'
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('should handle optional authentication', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();
      
      // Test with no token
      optionalAuth(req, res, next);
      expect(req.user).toBeNull();
      expect(next).toHaveBeenCalled();
      
      // Reset mocks
      next.mockClear();
      
      // Test with valid token
      const payload = {
        userId: 'test-user-123',
        email: 'test@example.com',
        role: 'user'
      };
      
      const tokens = generateTokens(payload);
      req.headers.authorization = `Bearer ${tokens.accessToken}`;
      
      optionalAuth(req, res, next);
      
      expect(req.user).toBeDefined();
      expect(req.user.userId).toBe('test-user-123');
      expect(next).toHaveBeenCalled();
    });
  });

  describe('Role-Based Authorization', () => {
    test('should allow authorized roles', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();
      
      req.user = { role: 'admin', userId: 'test-user-123' };
      
      const adminOnly = requireRole(['admin', 'moderator']);
      adminOnly(req, res, next);
      
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('should reject unauthorized roles', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();
      
      req.user = { role: 'user', userId: 'test-user-123' };
      
      const adminOnly = requireRole(['admin']);
      adminOnly(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Insufficient permissions'
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('should reject unauthenticated requests', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();
      
      req.user = null;
      
      const adminOnly = requireRole(['admin']);
      adminOnly(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Authentication required'
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('API Key Authentication', () => {
    test('should authenticate valid API keys', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();
      
      req.headers['x-api-key'] = 'valid-api-key-123';
      
      authenticateApiKey(req, res, next);
      
      expect(req.apiKey).toBe('valid-api-key-123');
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('should reject missing API keys', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();
      
      authenticateApiKey(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'API key required'
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('Rate Limiting', () => {
    test('should allow requests within limit', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();
      
      req.user = { userId: 'test-user-123' };
      req.ip = '127.0.0.1';
      
      const rateLimiter = rateLimitByUser(10, 1000); // 10 requests per second
      
      // Make 5 requests
      for (let i = 0; i < 5; i++) {
        rateLimiter(req, res, next);
        expect(next).toHaveBeenCalled();
        next.mockClear();
      }
    });

    test('should reject requests exceeding limit', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();
      
      req.user = { userId: 'test-user-123' };
      req.ip = '127.0.0.1';
      req.get = jest.fn().mockReturnValue('test-user-agent');
      
      const rateLimiter = rateLimitByUser(2, 1000); // 2 requests per second
      
      // Make 2 requests (should pass)
      rateLimiter(req, res, next);
      expect(next).toHaveBeenCalled();
      next.mockClear();
      
      rateLimiter(req, res, next);
      expect(next).toHaveBeenCalled();
      next.mockClear();
      
      // Make 3rd request (should fail)
      rateLimiter(req, res, next);
      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Rate limit exceeded',
        retryAfter: expect.any(Number)
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('Session Management', () => {
    test('should create session successfully', async () => {
      const userId = 'test-user-123';
      const deviceInfo = {
        userAgent: 'test-browser',
        ip: '127.0.0.1'
      };
      
      const session = await SessionManager.createSession(userId, deviceInfo);
      
      expect(session).toHaveProperty('sessionId');
      expect(session).toHaveProperty('userId', userId);
      expect(session).toHaveProperty('deviceInfo');
      expect(session).toHaveProperty('isActive', true);
      expect(session.sessionId).toMatch(/^[a-f0-9]{64}$/);
    });

    test('should reject invalid user ID', async () => {
      await expect(SessionManager.createSession('')).rejects.toThrow('Valid userId is required');
      await expect(SessionManager.createSession(null)).rejects.toThrow('Valid userId is required');
    });

    test('should validate session successfully', async () => {
      const userId = 'test-user-123';
      const session = await SessionManager.createSession(userId);
      
      // Mock Redis to return session data
      const { getRedisSafe } = require('../lib/database');
      const mockRedis = getRedisSafe();
      mockRedis.get.mockResolvedValue(JSON.stringify(session));
      
      const validatedSession = await SessionManager.validateSession(session.sessionId);
      
      expect(validatedSession).toBeDefined();
      if (validatedSession) {
        expect(validatedSession.userId).toBe(userId);
      }
    });

    test('should reject invalid session ID format', async () => {
      const result = await SessionManager.validateSession('invalid-session-id');
      expect(result).toBeNull();
    });

    test('should destroy session successfully', async () => {
      const userId = 'test-user-123';
      const session = await SessionManager.createSession(userId);
      
      // Mock Redis to return session data for destruction
      const { getRedisSafe } = require('../lib/database');
      const mockRedis = getRedisSafe();
      mockRedis.get.mockResolvedValue(JSON.stringify(session));
      mockRedis.del.mockResolvedValue(1);
      mockRedis.sRem.mockResolvedValue(1);
      
      const result = await SessionManager.destroySession(session.sessionId);
      expect(result).toBe(true);
    });
  });

  describe('Password Validation', () => {
    test('should validate strong passwords', () => {
      const strongPasswords = [
        'StrongPassword123!',
        'MySecure@Pass2024',
        'Complex#Pass456',
        'UltraSecure$789'
      ];
      
      for (const password of strongPasswords) {
        const result = validatePassword(password);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      }
    });

    test('should reject weak passwords', () => {
      const testCases = [
        { password: '', expected: 'Password is required' },
        { password: 'short', expected: 'Password must be at least 8 characters long' },
        { password: 'nouppercase123!', expected: 'Password must contain at least one uppercase letter' },
        { password: 'NOLOWERCASE123!', expected: 'Password must contain at least one lowercase letter' },
        { password: 'NoNumbers!', expected: 'Password must contain at least one number' },
        { password: 'NoSpecialChars123', expected: 'Password must contain at least one special character' },
        { password: 'password', expected: 'Password must contain at least one uppercase letter' },
        { password: 'aaa123!', expected: 'Password cannot contain more than 2 consecutive identical characters' },
        { password: 'qwerty123!', expected: 'Password cannot contain keyboard patterns' }
      ];
      
      for (const testCase of testCases) {
        const result = validatePassword(testCase.password);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(testCase.expected);
      }
    });

    test('should reject long passwords', () => {
      const longPassword = 'a'.repeat(129) + '123!';
      const result = validatePassword(longPassword);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must be less than 128 characters long');
    });
  });

  describe('Email Validation', () => {
    test('should validate correct email formats', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'test+tag@example.org',
        'user123@test-domain.com'
      ];
      
      for (const email of validEmails) {
        expect(validateEmail(email)).toBe(true);
      }
    });

    test('should reject invalid email formats', () => {
      const invalidEmails = [
        '',
        null,
        undefined,
        'not-an-email',
        '@example.com',
        'test@',
        'test..test@example.com',
        'test@.com',
        'a'.repeat(255) + '@example.com' // Too long
      ];
      
      for (const email of invalidEmails) {
        expect(validateEmail(email)).toBe(false);
      }
    });
  });

  describe('Input Sanitization', () => {
    test('should sanitize input correctly', () => {
      expect(sanitizeInput('<script>alert("xss")</script>')).toBe('scriptalert(xss)/script');
      expect(sanitizeInput('  test  ')).toBe('test');
      expect(sanitizeInput('test"value')).toBe('testvalue');
      expect(sanitizeInput(123)).toBe(123); // Non-string input
    });

    test('should sanitize email correctly', () => {
      expect(sanitizeEmail('  TEST@EXAMPLE.COM  ')).toBe('test@example.com');
      expect(sanitizeEmail('test+tag@example.com')).toBe('testtag@example.com');
      expect(sanitizeEmail('test<script>@example.com')).toBe('testscript@example.com');
      expect(sanitizeEmail(null)).toBeNull();
    });

    test('should sanitize user ID correctly', () => {
      expect(sanitizeUserId('user-123_test')).toBe('user-123_test');
      expect(sanitizeUserId('user@domain.com')).toBe('userdomaincom');
      expect(sanitizeUserId('user<script>')).toBe('userscript');
      expect(sanitizeUserId(null)).toBeNull();
    });
  });

  describe('Secure String Generation', () => {
    test('should generate secure strings of specified length', () => {
      const string16 = generateSecureString(16);
      expect(string16).toHaveLength(32); // 16 bytes = 32 hex characters
      
      const string32 = generateSecureString(32);
      expect(string32).toHaveLength(64); // 32 bytes = 64 hex characters
    });

    test('should generate unique strings', () => {
      const strings = new Set();
      for (let i = 0; i < 100; i++) {
        strings.add(generateSecureString(16));
      }
      expect(strings.size).toBe(100);
    });

    test('should reject invalid lengths', () => {
      expect(() => generateSecureString(0)).toThrow('Length must be an integer between 1 and 1024');
      expect(() => generateSecureString(-1)).toThrow('Length must be an integer between 1 and 1024');
      expect(() => generateSecureString(1025)).toThrow('Length must be an integer between 1 and 1024');
      expect(() => generateSecureString('invalid')).toThrow('Length must be an integer between 1 and 1024');
    });
  });

  describe('Token Blacklist', () => {
    beforeEach(() => {
      // Reset mocks before each test
      jest.clearAllMocks();
    });

    test('should add token to blacklist', async () => {
      const { getRedisSafe } = require('../lib/database');
      const mockRedis = getRedisSafe();
      mockRedis.setEx.mockResolvedValue('OK');
      
      const result = await tokenBlacklist.add('test-token');
      expect(result).toBe(true);
      expect(mockRedis.setEx).toHaveBeenCalledWith('blacklist:test-token', 24 * 60 * 60, '1');
    });

    test('should check if token is blacklisted', async () => {
      const { getRedisSafe } = require('../lib/database');
      const mockRedis = getRedisSafe();
      mockRedis.exists.mockResolvedValue(1);
      
      const result = await tokenBlacklist.isBlacklisted('test-token');
      expect(result).toBe(true);
      expect(mockRedis.exists).toHaveBeenCalledWith('blacklist:test-token');
    });

    test('should remove token from blacklist', async () => {
      const { getRedisSafe } = require('../lib/database');
      const mockRedis = getRedisSafe();
      mockRedis.del.mockResolvedValue(1);
      
      const result = await tokenBlacklist.remove('test-token');
      expect(result).toBe(true);
      expect(mockRedis.del).toHaveBeenCalledWith('blacklist:test-token');
    });

    test('should handle invalid tokens', async () => {
      expect(await tokenBlacklist.add('')).toBe(false);
      expect(await tokenBlacklist.add(null)).toBe(false);
      expect(await tokenBlacklist.isBlacklisted('')).toBe(false);
      expect(await tokenBlacklist.isBlacklisted(null)).toBe(false);
    });
  });

  describe('Token Verification with Blacklist', () => {
    test('should verify non-blacklisted tokens', async () => {
      const { getRedisSafe } = require('../lib/database');
      const mockRedis = getRedisSafe();
      mockRedis.exists.mockResolvedValue(0); // Not blacklisted
      
      const payload = {
        userId: 'test-user-123',
        email: 'test@example.com',
        role: 'user'
      };
      
      const tokens = generateTokens(payload);
      const decoded = await verifyTokenWithBlacklist(tokens.accessToken);
      
      expect(decoded).toHaveProperty('userId', 'test-user-123');
    });

    test('should reject blacklisted tokens', async () => {
      const { getRedisSafe } = require('../lib/database');
      const mockRedis = getRedisSafe();
      mockRedis.exists.mockResolvedValue(1); // Blacklisted
      
      const payload = {
        userId: 'test-user-123',
        email: 'test@example.com',
        role: 'user'
      };
      
      const tokens = generateTokens(payload);
      
      await expect(verifyTokenWithBlacklist(tokens.accessToken)).rejects.toThrow('Token has been revoked');
    });
  });

  describe('Refresh Token Rotation', () => {
    test('should rotate refresh token successfully', async () => {
      const { getRedisSafe } = require('../lib/database');
      const mockRedis = getRedisSafe();
      mockRedis.setEx.mockResolvedValue('OK');
      
      const payload = {
        userId: 'test-user-123',
        email: 'test@example.com',
        role: 'user'
      };
      
      const oldTokens = generateTokens(payload);
      const newTokens = await rotateRefreshToken(oldTokens.refreshToken, payload);
      
      expect(newTokens).toHaveProperty('accessToken');
      expect(newTokens).toHaveProperty('refreshToken');
      expect(newTokens.refreshToken).not.toBe(oldTokens.refreshToken);
      expect(mockRedis.setEx).toHaveBeenCalledWith(
        `blacklist:${oldTokens.refreshToken}`,
        24 * 60 * 60,
        '1'
      );
    });
  });
});