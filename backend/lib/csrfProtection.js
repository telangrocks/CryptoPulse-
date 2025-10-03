// =============================================================================
// CSRF Protection System - Production Ready
// =============================================================================
// Modern CSRF protection implementation for CryptoPulse backend
// Uses double-submit cookie pattern and token validation

const crypto = require('crypto');
const { logger } = require('./logging');
const { securityLogger } = require('./logging');
const { auditLogger } = require('./logging');

// CSRF protection configuration
const CSRF_CONFIG = {
  // Token configuration
  TOKEN: {
    length: 32, // 32 bytes = 256 bits
    algorithm: 'sha256',
    encoding: 'hex'
  },
  
  // Cookie configuration
  COOKIE: {
    name: 'csrf-token',
    httpOnly: false, // Must be accessible to JavaScript for double-submit
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 1000, // 1 hour
    path: '/'
  },
  
  // Header configuration
  HEADER: {
    name: 'x-csrf-token'
  },
  
  // Security settings
  SECURITY: {
    requireReferer: true,
    allowedOrigins: [
      'http://localhost:3000',
      'https://cryptopulse.app',
      'https://www.cryptopulse.app'
    ],
    allowedMethods: ['GET', 'HEAD', 'OPTIONS'],
    tokenRotationInterval: 60 * 60 * 1000 // 1 hour
  }
};

// CSRF token storage (in-memory for simplicity, consider Redis for production)
const tokenStore = new Map();

// CSRF metrics
const csrfMetrics = {
  operations: {
    tokenGeneration: 0,
    tokenValidation: 0,
    tokenRotation: 0,
    blockedRequests: 0
  },
  errors: {
    tokenGeneration: 0,
    tokenValidation: 0,
    invalidToken: 0,
    missingToken: 0,
    originMismatch: 0
  },
  timings: {
    tokenGeneration: [],
    tokenValidation: []
  }
};

// Generate a cryptographically secure CSRF token
function generateCSRFToken() {
  const start = Date.now();
  
  try {
    const token = crypto.randomBytes(CSRF_CONFIG.TOKEN.length).toString(CSRF_CONFIG.TOKEN.encoding);
    
    // Store token with metadata
    tokenStore.set(token, {
      createdAt: Date.now(),
      lastUsed: null,
      usageCount: 0,
      isValid: true
    });
    
    // Cleanup old tokens
    cleanupExpiredTokens();
    
    csrfMetrics.operations.tokenGeneration++;
    csrfMetrics.timings.tokenGeneration.push(Date.now() - start);
    
    logger.debug('CSRF token generated', {
      tokenLength: token.length,
      duration: Date.now() - start
    });
    
    return token;
    
  } catch (error) {
    csrfMetrics.errors.tokenGeneration++;
    logger.error('CSRF token generation failed:', error);
    throw new Error('Failed to generate CSRF token');
  }
}

// Validate CSRF token
function validateCSRFToken(token, req) {
  const start = Date.now();
  
  try {
    if (!token || typeof token !== 'string') {
      csrfMetrics.errors.missingToken++;
      return {
        valid: false,
        error: 'Missing CSRF token'
      };
    }
    
    // Check if token exists in store
    const tokenData = tokenStore.get(token);
    if (!tokenData || !tokenData.isValid) {
      csrfMetrics.errors.invalidToken++;
      return {
        valid: false,
        error: 'Invalid CSRF token'
      };
    }
    
    // Check token age
    const tokenAge = Date.now() - tokenData.createdAt;
    if (tokenAge > CSRF_CONFIG.SECURITY.tokenRotationInterval) {
      csrfMetrics.errors.invalidToken++;
      tokenData.isValid = false; // Mark as invalid
      return {
        valid: false,
        error: 'CSRF token expired'
      };
    }
    
    // Validate origin/referer if required
    if (CSRF_CONFIG.SECURITY.requireReferer) {
      const origin = req.get('Origin');
      const referer = req.get('Referer');
      
      if (!origin && !referer) {
        csrfMetrics.errors.originMismatch++;
        return {
          valid: false,
          error: 'Missing origin or referer'
        };
      }
      
      const requestOrigin = origin || new URL(referer).origin;
      const isAllowedOrigin = CSRF_CONFIG.SECURITY.allowedOrigins.some(allowedOrigin => {
        return requestOrigin === allowedOrigin || requestOrigin.endsWith(allowedOrigin);
      });
      
      if (!isAllowedOrigin) {
        csrfMetrics.errors.originMismatch++;
        securityLogger.warn('CSRF validation failed: origin mismatch', {
          requestOrigin,
          allowedOrigins: CSRF_CONFIG.SECURITY.allowedOrigins,
          ip: req.ip,
          userAgent: req.get('User-Agent')
        });
        return {
          valid: false,
          error: 'Invalid origin'
        };
      }
    }
    
    // Update token usage
    tokenData.lastUsed = Date.now();
    tokenData.usageCount++;
    
    csrfMetrics.operations.tokenValidation++;
    csrfMetrics.timings.tokenValidation.push(Date.now() - start);
    
    logger.debug('CSRF token validated successfully', {
      tokenAge,
      usageCount: tokenData.usageCount,
      duration: Date.now() - start
    });
    
    return {
      valid: true,
      tokenData
    };
    
  } catch (error) {
    csrfMetrics.errors.tokenValidation++;
    logger.error('CSRF token validation failed:', error);
    return {
      valid: false,
      error: 'Token validation failed'
    };
  }
}

// Cleanup expired tokens
function cleanupExpiredTokens() {
  const now = Date.now();
  let cleanedCount = 0;
  
  for (const [token, tokenData] of tokenStore) {
    const tokenAge = now - tokenData.createdAt;
    if (tokenAge > CSRF_CONFIG.SECURITY.tokenRotationInterval || !tokenData.isValid) {
      tokenStore.delete(token);
      cleanedCount++;
    }
  }
  
  if (cleanedCount > 0) {
    logger.debug('CSRF tokens cleaned up', { cleanedCount });
  }
}

// CSRF protection middleware
function csrfProtection(req, res, next) {
  // Skip CSRF protection for safe methods
  if (CSRF_CONFIG.SECURITY.allowedMethods.includes(req.method)) {
    return next();
  }
  
  // Get token from header or body
  const tokenFromHeader = req.get(CSRF_CONFIG.HEADER.name);
  const tokenFromBody = req.body?._csrf;
  const token = tokenFromHeader || tokenFromBody;
  
  // Validate token
  const validation = validateCSRFToken(token, req);
  
  if (!validation.valid) {
    csrfMetrics.operations.blockedRequests++;
    
    securityLogger.warn('CSRF protection blocked request', {
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      origin: req.get('Origin'),
      referer: req.get('Referer'),
      error: validation.error,
      hasToken: !!token
    });
    
    auditLogger.systemEvent('csrf_blocked', 'CSRFProtection', {
      method: req.method,
      url: req.url,
      ip: req.ip,
      error: validation.error
    });
    
    return res.status(403).json({
      success: false,
      error: 'CSRF token validation failed',
      code: 'CSRF_TOKEN_INVALID'
    });
  }
  
  // Add CSRF token to request for downstream use
  req.csrfToken = token;
  req.csrfValidated = true;
  
  next();
}

// CSRF token generation middleware
function generateCSRFTokenMiddleware(req, res, next) {
  try {
    const token = generateCSRFToken();
    
    // Set token in cookie for double-submit pattern
    res.cookie(CSRF_CONFIG.COOKIE.name, token, {
      httpOnly: CSRF_CONFIG.COOKIE.httpOnly,
      secure: CSRF_CONFIG.COOKIE.secure,
      sameSite: CSRF_CONFIG.COOKIE.sameSite,
      maxAge: CSRF_CONFIG.COOKIE.maxAge,
      path: CSRF_CONFIG.COOKIE.path
    });
    
    // Add token to response headers
    res.setHeader('X-CSRF-Token', token);
    
    // Add token to request for downstream use
    req.csrfToken = token;
    
    logger.debug('CSRF token generated and set', {
      tokenLength: token.length,
      cookieSet: true,
      headerSet: true
    });
    
    next();
    
  } catch (error) {
    logger.error('CSRF token generation middleware failed:', error);
    next(error);
  }
}

// CSRF token refresh middleware
function refreshCSRFToken(req, res, next) {
  try {
    // Check if token needs refresh
    const currentToken = req.csrfToken;
    if (currentToken) {
      const tokenData = tokenStore.get(currentToken);
      if (tokenData) {
        const tokenAge = Date.now() - tokenData.createdAt;
        if (tokenAge > CSRF_CONFIG.SECURITY.tokenRotationInterval * 0.8) { // Refresh at 80% of lifetime
          const newToken = generateCSRFToken();
          
          // Set new token in cookie
          res.cookie(CSRF_CONFIG.COOKIE.name, newToken, {
            httpOnly: CSRF_CONFIG.COOKIE.httpOnly,
            secure: CSRF_CONFIG.COOKIE.secure,
            sameSite: CSRF_CONFIG.COOKIE.sameSite,
            maxAge: CSRF_CONFIG.COOKIE.maxAge,
            path: CSRF_CONFIG.COOKIE.path
          });
          
          // Add new token to response headers
          res.setHeader('X-CSRF-Token', newToken);
          
          // Invalidate old token
          tokenData.isValid = false;
          
          csrfMetrics.operations.tokenRotation++;
          
          logger.debug('CSRF token refreshed', {
            oldTokenAge: tokenAge,
            newTokenLength: newToken.length
          });
        }
      }
    }
    
    next();
    
  } catch (error) {
    logger.error('CSRF token refresh failed:', error);
    next(error);
  }
}

// Get CSRF protection metrics
function getCSRFMetrics() {
  const calculateAverage = (timings) => {
    if (timings.length === 0) return 0;
    return timings.reduce((sum, time) => sum + time, 0) / timings.length;
  };
  
  const calculatePercentile = (timings, percentile) => {
    if (timings.length === 0) return 0;
    const sorted = [...timings].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index] || 0;
  };
  
  return {
    operations: csrfMetrics.operations,
    errors: csrfMetrics.errors,
    activeTokens: tokenStore.size,
    performance: {
      tokenGeneration: {
        average: calculateAverage(csrfMetrics.timings.tokenGeneration),
        p95: calculatePercentile(csrfMetrics.timings.tokenGeneration, 95),
        p99: calculatePercentile(csrfMetrics.timings.tokenGeneration, 99),
        max: Math.max(...csrfMetrics.timings.tokenGeneration, 0),
        min: Math.min(...csrfMetrics.timings.tokenGeneration, 0)
      },
      tokenValidation: {
        average: calculateAverage(csrfMetrics.timings.tokenValidation),
        p95: calculatePercentile(csrfMetrics.timings.tokenValidation, 95),
        p99: calculatePercentile(csrfMetrics.timings.tokenValidation, 99),
        max: Math.max(...csrfMetrics.timings.tokenValidation, 0),
        min: Math.min(...csrfMetrics.timings.tokenValidation, 0)
      }
    },
    errorRates: {
      tokenGeneration: csrfMetrics.operations.tokenGeneration > 0 ? 
        (csrfMetrics.errors.tokenGeneration / csrfMetrics.operations.tokenGeneration * 100).toFixed(2) : 0,
      tokenValidation: csrfMetrics.operations.tokenValidation > 0 ? 
        (csrfMetrics.errors.tokenValidation / csrfMetrics.operations.tokenValidation * 100).toFixed(2) : 0,
      blockedRequests: csrfMetrics.operations.blockedRequests
    }
  };
}

// Reset CSRF metrics
function resetCSRFMetrics() {
  csrfMetrics.operations = {
    tokenGeneration: 0,
    tokenValidation: 0,
    tokenRotation: 0,
    blockedRequests: 0
  };
  csrfMetrics.errors = {
    tokenGeneration: 0,
    tokenValidation: 0,
    invalidToken: 0,
    missingToken: 0,
    originMismatch: 0
  };
  csrfMetrics.timings = {
    tokenGeneration: [],
    tokenValidation: []
  };
  
  logger.info('CSRF metrics reset');
}

// Start token cleanup scheduler
function startTokenCleanupScheduler() {
  // Cleanup expired tokens every 5 minutes
  setInterval(() => {
    cleanupExpiredTokens();
  }, 5 * 60 * 1000);
  
  logger.info('CSRF token cleanup scheduler started');
}

// Export CSRF protection utilities
module.exports = {
  CSRF_CONFIG,
  
  // Core functions
  generateCSRFToken,
  validateCSRFToken,
  cleanupExpiredTokens,
  
  // Middleware
  csrfProtection,
  generateCSRFTokenMiddleware,
  refreshCSRFToken,
  
  // Metrics and monitoring
  getCSRFMetrics,
  resetCSRFMetrics,
  
  // Lifecycle
  startTokenCleanupScheduler
};
