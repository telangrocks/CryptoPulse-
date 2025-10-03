// =============================================================================
// Authentication & Authorization - Production Ready
// =============================================================================
// JWT authentication, password hashing, and authorization middleware

const jwt = require('jsonwebtoken');
const { hash, compare } = require('@node-rs/bcrypt');
const crypto = require('crypto');
const logger = require('./logging');

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

// Enhanced JWT_SECRET validation
if (!JWT_SECRET || JWT_SECRET.length < 64) {
  throw new Error('JWT_SECRET must be at least 64 characters long for production security');
}

// Check for weak secrets
const weakSecrets = ['test', 'development', 'production', 'secret', 'key', 'jwt'];
if (weakSecrets.some(weak => JWT_SECRET.toLowerCase().includes(weak))) {
  throw new Error('JWT_SECRET appears to be weak or contains common words');
}

// Check entropy (basic check for randomness)
const uniqueChars = new Set(JWT_SECRET).size;
if (uniqueChars < 16) {
  throw new Error('JWT_SECRET has insufficient entropy - use a more random secret');
}

// Additional security checks for JWT_SECRET
const jwtSecretValidation = {
  // Check for dictionary words
  hasDictionaryWords: /password|secret|key|token|jwt|auth|login|admin/i.test(JWT_SECRET),
  
  // Check for sequential characters
  hasSequentialChars: /(.)\1{2,}/.test(JWT_SECRET),
  
  // Check for common patterns
  hasCommonPatterns: /123|abc|qwe|asd|zxc/i.test(JWT_SECRET),
  
  // Check for base64-like patterns (too structured)
  isBase64Like: /^[A-Za-z0-9+/=]+$/.test(JWT_SECRET) && JWT_SECRET.length % 4 === 0
};

// Validate JWT_SECRET against security criteria
if (jwtSecretValidation.hasDictionaryWords) {
  throw new Error('JWT_SECRET contains dictionary words - use cryptographically random values');
}

if (jwtSecretValidation.hasSequentialChars) {
  throw new Error('JWT_SECRET contains sequential characters - use more random values');
}

if (jwtSecretValidation.hasCommonPatterns) {
  throw new Error('JWT_SECRET contains common patterns - use more random values');
}

if (jwtSecretValidation.isBase64Like) {
  logger.warn('JWT_SECRET appears to be base64-like - ensure it is cryptographically random');
}

// Log JWT_SECRET validation success
logger.info('JWT_SECRET validation passed', {
  length: JWT_SECRET.length,
  uniqueChars,
  entropy: Math.log2(uniqueChars).toFixed(2)
});

// Enhanced password hashing with additional security
const hashPassword = async(password) => {
  if (!password || typeof password !== 'string') {
    throw new Error('Password must be a non-empty string');
  }
  
  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters long');
  }
  
  // Check for weak passwords
  const weakPasswordPatterns = [
    /password/i,
    /123456/,
    /qwerty/i,
    /admin/i,
    /user/i,
    /test/i,
    /demo/i
  ];
  
  if (weakPasswordPatterns.some(pattern => pattern.test(password))) {
    throw new Error('Password appears to be weak - choose a stronger password');
  }
  
  const saltRounds = 14; // Increased from 12 for better security
  return await hash(password, saltRounds);
};

const comparePassword = async(password, hashedPassword) => {
  if (!password || !hashedPassword) {
    throw new Error('Both password and hashed password are required');
  }
  
  try {
    return await compare(password, hashedPassword);
  } catch (error) {
    logger.error('Password comparison failed:', error);
    throw new Error('Password comparison failed');
  }
};

// Enhanced JWT token generation with additional security
const generateTokens = (payload) => {
  if (!payload || !payload.userId) {
    throw new Error('Valid payload with userId is required');
  }
  
  // Add additional security claims
  const enhancedPayload = {
    ...payload,
    iat: Math.floor(Date.now() / 1000),
    jti: require('crypto').randomUUID(), // Unique token identifier
    iss: 'cryptopulse-api',
    aud: 'cryptopulse-client',
    version: '2.0.0'
  };
  
  const accessToken = jwt.sign(enhancedPayload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'cryptopulse-api',
    audience: 'cryptopulse-client',
    algorithm: 'HS256'
  });

  const refreshToken = jwt.sign(
    { 
      ...enhancedPayload, 
      type: 'refresh' 
    },
    JWT_SECRET,
    {
      expiresIn: JWT_REFRESH_EXPIRES_IN,
      issuer: 'cryptopulse-api',
      audience: 'cryptopulse-client',
      algorithm: 'HS256'
    }
  );

  logger.info('JWT tokens generated', {
    userId: payload.userId,
    jti: enhancedPayload.jti,
    expiresIn: JWT_EXPIRES_IN
  });

  return {
    accessToken,
    refreshToken,
    tokenType: 'Bearer',
    expiresIn: JWT_EXPIRES_IN,
    jti: enhancedPayload.jti
  };
};

// JWT token verification with enhanced security
const verifyToken = (token) => {
  try {
    if (!token || typeof token !== 'string') {
      throw new Error('Token is required');
    }

    // Additional token format validation
    if (!token.includes('.')) {
      throw new Error('Invalid token format');
    }

    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid token structure');
    }

    return jwt.verify(token, JWT_SECRET, {
      issuer: 'cryptopulse-api',
      audience: 'cryptopulse-client',
      algorithms: ['HS256'], // Explicitly specify algorithm
      clockTolerance: 30 // Allow 30 seconds clock skew
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token has expired');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid token');
    } else if (error.name === 'NotBeforeError') {
      throw new Error('Token not active');
    } else if (error.name === 'TokenInvalidError') {
      throw new Error('Token is invalid');
    }
    throw new Error('Token verification failed');
  }
};

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Access token required'
    });
  }

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch {
    return res.status(403).json({
      success: false,
      error: 'Invalid or expired token'
    });
  }
};

// Optional authentication middleware (doesn't fail if no token)
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    try {
      const decoded = verifyToken(token);
      req.user = decoded;
    } catch {
    // Token is invalid, but we don't fail the request
      req.user = null;
    }
  } else {
    req.user = null;
  }

  next();
};

// Role-based authorization
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
    }

    next();
  };
};

// API key authentication
const authenticateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: 'API key required'
    });
  }

  // In a real implementation, you would:
  // 1. Validate API key against database
  // 2. Check permissions and rate limits
  // 3. Set user context

  req.apiKey = apiKey;
  next();
};

// Rate limiting by user with enhanced memory management
const rateLimitByUser = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
  const requests = new Map();
  const maxMemoryEntries = 10000; // Prevent memory leaks
  let lastCleanup = Date.now();
  const cleanupInterval = 60000; // Cleanup every minute

  // Enhanced cleanup function
  const performCleanup = () => {
    const now = Date.now();
    const windowStart = now - windowMs;
    let cleanedCount = 0;

    // Clean old entries
    for (const [key, timestamps] of requests.entries()) {
      const validTimestamps = timestamps.filter(ts => ts > windowStart);
      if (validTimestamps.length === 0) {
        requests.delete(key);
        cleanedCount++;
      } else {
        requests.set(key, validTimestamps);
      }
    }

    // Force cleanup if memory usage is high
    if (requests.size > maxMemoryEntries) {
      const entries = Array.from(requests.entries());
      const toDelete = entries.slice(0, Math.floor(maxMemoryEntries / 2));
      toDelete.forEach(([key]) => requests.delete(key));
      cleanedCount += toDelete.length;
    }

    if (cleanedCount > 0) {
      logger.info(`Rate limit cleanup: removed ${cleanedCount} entries, ${requests.size} remaining`);
    }
  };

  return (req, res, next) => {
    const userId = req.user?.userId || req.ip;
    const now = Date.now();
    const windowStart = now - windowMs;

    // Perform periodic cleanup
    if (now - lastCleanup > cleanupInterval) {
      performCleanup();
      lastCleanup = now;
    }

    // Check current user's requests
    const userRequests = requests.get(userId) || [];
    const recentRequests = userRequests.filter(ts => ts > windowStart);

    if (recentRequests.length >= maxRequests) {
      logger.warn('Rate limit exceeded', {
        userId: userId.substring(0, 8) + '...',
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        requests: recentRequests.length,
        limit: maxRequests
      });

      return res.status(429).json({
        success: false,
        error: 'Rate limit exceeded',
        retryAfter: Math.ceil((recentRequests[0] + windowMs - now) / 1000)
      });
    }

    // Add current request
    recentRequests.push(now);
    requests.set(userId, recentRequests);

    next();
  };
};

// Session management with Redis integration
const SessionManager = {
  // Create session
  async createSession(userId, deviceInfo = {}) {
    if (!userId || typeof userId !== 'string') {
      throw new Error('Valid userId is required');
    }

    const sessionId = crypto.randomBytes(32).toString('hex');
    const sessionData = {
      sessionId,
      userId,
      deviceInfo: {
        userAgent: deviceInfo.userAgent || 'unknown',
        ip: deviceInfo.ip || 'unknown',
        ...deviceInfo
      },
      createdAt: new Date().toISOString(),
      lastAccessedAt: new Date().toISOString(),
      isActive: true,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
    };

    try {
      // Store session in Redis if available
      const { getRedisSafe } = require('./database');
      const redis = getRedisSafe();

      if (redis) {
        const sessionKey = `session:${sessionId}`;
        const userSessionsKey = `user_sessions:${userId}`;

        // Store session data with TTL
        await redis.setEx(sessionKey, 7 * 24 * 60 * 60, JSON.stringify(sessionData));

        // Add session to user's session list
        await redis.sAdd(userSessionsKey, sessionId);
        await redis.expire(userSessionsKey, 7 * 24 * 60 * 60);

        logger.info('Session created and stored in Redis', { sessionId, userId });
      } else {
        logger.warn('Redis not available, session created in memory only', { sessionId, userId });
      }

      return sessionData;
    } catch (error) {
      logger.error('Session creation error:', error);
      throw new Error('Failed to create session');
    }
  },

  // Validate session
  async validateSession(sessionId) {
    if (!sessionId || typeof sessionId !== 'string') {
      return null;
    }

    try {
      // Check if sessionId format is valid (64 hex characters)
      if (!/^[a-f0-9]{64}$/.test(sessionId)) {
        return null;
      }

      const { getRedisSafe } = require('./database');
      const redis = getRedisSafe();

      if (redis) {
        const sessionKey = `session:${sessionId}`;
        const sessionDataStr = await redis.get(sessionKey);

        if (!sessionDataStr) {
          logger.info('Session not found in Redis', { sessionId });
          return null;
        }

        const sessionData = JSON.parse(sessionDataStr);

        // Check if session is expired
        const now = new Date();
        const expiresAt = new Date(sessionData.expiresAt);

        if (now > expiresAt) {
          logger.info('Session expired', { sessionId, expiresAt });
          // Clean up expired session
          await SessionManager.destroySession(sessionId);
          return null;
        }

        // Update last accessed time
        sessionData.lastAccessedAt = new Date().toISOString();
        await redis.setEx(sessionKey, 7 * 24 * 60 * 60, JSON.stringify(sessionData));

        logger.info('Session validated successfully', { sessionId, userId: sessionData.userId });
        return sessionData;
      } else {
        logger.warn('Redis not available for session validation', { sessionId });
        return null;
      }
    } catch (error) {
      logger.error('Session validation error:', error);
      return null;
    }
  },

  // Destroy session
  async destroySession(sessionId) {
    if (!sessionId || typeof sessionId !== 'string') {
      throw new Error('Valid sessionId is required');
    }

    try {
      const { getRedisSafe } = require('./database');
      const redis = getRedisSafe();

      if (redis) {
        const sessionKey = `session:${sessionId}`;

        // Get session data to find userId
        const sessionDataStr = await redis.get(sessionKey);
        if (sessionDataStr) {
          const sessionData = JSON.parse(sessionDataStr);
          const userSessionsKey = `user_sessions:${sessionData.userId}`;

          // Remove session from user's session list
          await redis.sRem(userSessionsKey, sessionId);
        }

        // Delete session
        await redis.del(sessionKey);

        logger.info('Session destroyed successfully', { sessionId });
      } else {
        logger.warn('Redis not available for session destruction', { sessionId });
      }

      return true;
    } catch (error) {
      logger.error('Session destruction error:', error);
      throw new Error('Failed to destroy session');
    }
  },

  // Get all sessions for a user
  async getUserSessions(userId) {
    if (!userId || typeof userId !== 'string') {
      return [];
    }

    try {
      const { getRedisSafe } = require('./database');
      const redis = getRedisSafe();

      if (redis) {
        const userSessionsKey = `user_sessions:${userId}`;
        const sessionIds = await redis.sMembers(userSessionsKey);

        const sessions = [];
        for (const sessionId of sessionIds) {
          const session = await SessionManager.validateSession(sessionId);
          if (session) {
            sessions.push(session);
          }
        }

        return sessions;
      } else {
        logger.warn('Redis not available for getting user sessions', { userId });
        return [];
      }
    } catch (error) {
      logger.error('Get user sessions error:', error);
      return [];
    }
  },

  // Destroy all sessions for a user
  async destroyUserSessions(userId) {
    if (!userId || typeof userId !== 'string') {
      throw new Error('Valid userId is required');
    }

    try {
      const sessions = await SessionManager.getUserSessions(userId);

      for (const session of sessions) {
        await SessionManager.destroySession(session.sessionId);
      }

      logger.info('All user sessions destroyed', { userId, count: sessions.length });
      return true;
    } catch (error) {
      logger.error('Destroy user sessions error:', error);
      throw new Error('Failed to destroy user sessions');
    }
  }
};

// Password validation
const validatePassword = (password) => {
  const errors = [];

  if (!password || typeof password !== 'string') {
    errors.push('Password is required');
    return { isValid: false, errors };
  }

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (password.length > 128) {
    errors.push('Password must be less than 128 characters long');
  }

  if (!/(?=.*[a-z])/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/(?=.*[A-Z])/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/(?=.*\d)/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (!/(?=.*[@$!%*?&])/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  // Check for common weak passwords
  const commonPasswords = [
    'password', '123456', 'qwerty', 'abc123', 'password123',
    'admin', 'root', 'user', 'test', 'guest', 'welcome',
    'letmein', 'monkey', 'dragon', 'master', 'hello',
    'login', 'pass', '123', '12345', '1234567890'
  ];
  if (commonPasswords.includes(password.toLowerCase())) {
    errors.push('Password is too common, please choose a stronger password');
  }

  // Check for repeated characters
  if (/(.)\1{2,}/.test(password)) {
    errors.push('Password cannot contain more than 2 consecutive identical characters');
  }

  // Check for keyboard patterns
  const keyboardPatterns = [
    'qwerty', 'asdfgh', 'zxcvbn', 'qwertyuiop', 'asdfghjkl',
    'zxcvbnm', '1234567890', '0987654321'
  ];
  if (keyboardPatterns.some(pattern => password.toLowerCase().includes(pattern))) {
    errors.push('Password cannot contain keyboard patterns');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Email validation
const validateEmail = (email) => {
  if (!email || typeof email !== 'string') {
    return false;
  }

  // More comprehensive email validation
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

  if (!emailRegex.test(email)) {
    return false;
  }

  // Check email length
  if (email.length > 254) {
    return false;
  }

  // Check for consecutive dots
  if (email.includes('..')) {
    return false;
  }

  return true;
};

// Input sanitization utilities
const sanitizeInput = (input) => {
  if (typeof input !== 'string') {return input;}
  return input.trim().replace(/[<>"'&]/g, '');
};

const sanitizeEmail = (email) => {
  if (!email || typeof email !== 'string') {return null;}
  return email.trim().toLowerCase().replace(/[^a-z0-9@._-]/g, '');
};

const sanitizeUserId = (userId) => {
  if (!userId || typeof userId !== 'string') {return null;}
  return userId.replace(/[^a-zA-Z0-9_-]/g, '');
};

// Generate secure random string
const generateSecureString = (length = 32) => {
  if (!Number.isInteger(length) || length < 1 || length > 1024) {
    throw new Error('Length must be an integer between 1 and 1024');
  }
  return crypto.randomBytes(length).toString('hex');
};

// Token blacklist for logout functionality with Redis integration
const tokenBlacklist = {
  // Add token to blacklist
  async add(token) {
    if (!token || typeof token !== 'string') {
      return false;
    }

    try {
      const { getRedisSafe } = require('./database');
      const redis = getRedisSafe();

      if (redis) {
        // Store token in Redis with expiration (24 hours)
        const blacklistKey = `blacklist:${token}`;
        await redis.setEx(blacklistKey, 24 * 60 * 60, '1');

        logger.info('Token blacklisted in Redis:', token.substring(0, 20) + '...');
        return true;
      } else {
        // Fallback to in-memory storage if Redis not available
        logger.warn('Redis not available, using in-memory token blacklist');
        // Note: In production, you should have Redis available
        return false;
      }
    } catch (error) {
      logger.error('Token blacklist error:', error);
      return false;
    }
  },

  // Check if token is blacklisted
  async isBlacklisted(token) {
    if (!token || typeof token !== 'string') {
      return false;
    }

    try {
      const { getRedisSafe } = require('./database');
      const redis = getRedisSafe();

      if (redis) {
        const blacklistKey = `blacklist:${token}`;
        const exists = await redis.exists(blacklistKey);
        return exists === 1;
      } else {
        logger.warn('Redis not available for token blacklist check');
        return false;
      }
    } catch (error) {
      logger.error('Token blacklist check error:', error);
      return false;
    }
  },

  // Remove token from blacklist (for testing purposes)
  async remove(token) {
    if (!token || typeof token !== 'string') {
      return false;
    }

    try {
      const { getRedisSafe } = require('./database');
      const redis = getRedisSafe();

      if (redis) {
        const blacklistKey = `blacklist:${token}`;
        await redis.del(blacklistKey);
        logger.info('Token removed from blacklist:', token.substring(0, 20) + '...');
        return true;
      } else {
        logger.warn('Redis not available for token blacklist removal');
        return false;
      }
    } catch (error) {
      logger.error('Token blacklist removal error:', error);
      return false;
    }
  },

  // Clear all blacklisted tokens (for testing purposes)
  async clear() {
    try {
      const { getRedisSafe } = require('./database');
      const redis = getRedisSafe();

      if (redis) {
        const keys = await redis.keys('blacklist:*');
        if (keys.length > 0) {
          await redis.del(keys);
          logger.info('All blacklisted tokens cleared:', keys.length);
        }
        return true;
      } else {
        logger.warn('Redis not available for clearing token blacklist');
        return false;
      }
    } catch (error) {
      logger.error('Token blacklist clear error:', error);
      return false;
    }
  }
};

// Legacy function wrappers for backward compatibility
const blacklistToken = (token) => {
  return tokenBlacklist.add(token);
};

const isTokenBlacklisted = (token) => {
  return tokenBlacklist.isBlacklisted(token);
};

// Enhanced token verification with blacklist check
const verifyTokenWithBlacklist = async(token) => {
  const isBlacklisted = await tokenBlacklist.isBlacklisted(token);
  if (isBlacklisted) {
    throw new Error('Token has been revoked');
  }
  return verifyToken(token);
};

// Refresh token rotation
const rotateRefreshToken = async(oldRefreshToken, payload) => {
  // Blacklist old refresh token
  await tokenBlacklist.add(oldRefreshToken);

  // Generate new tokens
  return generateTokens(payload);
};

// Export authentication utilities
module.exports = {
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
  blacklistToken,
  isTokenBlacklisted,
  rotateRefreshToken,
  tokenBlacklist, // Export the full tokenBlacklist object for advanced usage
  // Enhanced security utilities
  sanitizeInput,
  sanitizeEmail,
  sanitizeUserId
};
