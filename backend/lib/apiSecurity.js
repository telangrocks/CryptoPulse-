// =============================================================================
// Advanced API Security System - Production Ready
// =============================================================================
// Comprehensive API security with advanced rate limiting, API key management,
// request validation, and threat detection

const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const { logger } = require('./logging');
const { securityLogger } = require('./logging');
const { auditLogger } = require('./logging');
const crypto = require('crypto');

// API Security configuration
const API_SECURITY_CONFIG = {
  // Rate limiting configuration
  RATE_LIMITING: {
    // General API rate limits
    GENERAL: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // 100 requests per window
      message: 'Too many requests, please try again later.',
      standardHeaders: true,
      legacyHeaders: false
    },
    
    // Authentication endpoints
    AUTH: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // 5 attempts per window
      message: 'Too many authentication attempts, please try again later.',
      standardHeaders: true,
      legacyHeaders: false
    },
    
    // Trading endpoints
    TRADING: {
      windowMs: 60 * 1000, // 1 minute
      max: 10, // 10 requests per minute
      message: 'Trading rate limit exceeded, please slow down.',
      standardHeaders: true,
      legacyHeaders: false
    },
    
    // Market data endpoints
    MARKET_DATA: {
      windowMs: 60 * 1000, // 1 minute
      max: 50, // 50 requests per minute
      message: 'Market data rate limit exceeded.',
      standardHeaders: true,
      legacyHeaders: false
    },
    
    // Admin endpoints
    ADMIN: {
      windowMs: 60 * 1000, // 1 minute
      max: 20, // 20 requests per minute
      message: 'Admin rate limit exceeded.',
      standardHeaders: true,
      legacyHeaders: false
    }
  },
  
  // Speed limiting configuration
  SPEED_LIMITING: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    delayAfter: 50, // Start slowing down after 50 requests
    delayMs: 500, // Add 500ms delay per request
    maxDelayMs: 20000, // Maximum delay of 20 seconds
    skipSuccessfulRequests: true
  },
  
  // API Key configuration
  API_KEY: {
    length: 32,
    prefix: 'cp_',
    algorithm: 'sha256',
    encoding: 'hex'
  },
  
  // Request validation
  REQUEST_VALIDATION: {
    maxBodySize: 10 * 1024 * 1024, // 10MB
    maxQueryLength: 2048,
    maxHeaderCount: 50,
    maxHeaderLength: 8192,
    allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedContentTypes: [
      'application/json',
      'application/x-www-form-urlencoded',
      'multipart/form-data'
    ]
  },
  
  // Threat detection
  THREAT_DETECTION: {
    maxRequestsPerSecond: 10,
    suspiciousPatterns: [
      /union\s+select/i,
      /<script/i,
      /javascript:/i,
      /\.\.\//,
      /\.\.\\/,
      /eval\s*\(/i,
      /exec\s*\(/i
    ],
    blockedUserAgents: [
      /bot/i,
      /crawler/i,
      /spider/i,
      /scraper/i
    ],
    maxFailedAttempts: 5,
    lockoutDuration: 15 * 60 * 1000 // 15 minutes
  }
};

// API Security metrics
const apiSecurityMetrics = {
  operations: {
    requestsProcessed: 0,
    requestsBlocked: 0,
    rateLimitHits: 0,
    speedLimitHits: 0,
    apiKeyValidations: 0,
    threatDetections: 0
  },
  errors: {
    rateLimitExceeded: 0,
    speedLimitExceeded: 0,
    invalidApiKey: 0,
    threatDetected: 0,
    requestValidationFailed: 0
  },
  timings: {
    requestProcessing: [],
    rateLimitCheck: [],
    speedLimitCheck: [],
    apiKeyValidation: [],
    threatDetection: []
  },
  threats: {
    sqlInjection: 0,
    xss: 0,
    pathTraversal: 0,
    suspiciousUserAgent: 0,
    excessiveRequests: 0
  }
};

// API Key Manager class
class APIKeyManager {
  constructor() {
    this.apiKeys = new Map(); // apiKey -> keyData
    this.keyUsage = new Map(); // apiKey -> usage stats
    this.blockedKeys = new Set(); // Blocked API keys
  }
  
  // Generate API key
  generateAPIKey(userId, permissions = [], description = '') {
    try {
      const keyId = crypto.randomUUID();
      const keyValue = `${API_SECURITY_CONFIG.API_KEY.prefix}${crypto.randomBytes(API_SECURITY_CONFIG.API_KEY.length).toString(API_SECURITY_CONFIG.API_KEY.encoding)}`;
      
      const keyData = {
        keyId,
        keyValue,
        userId,
        permissions,
        description,
        createdAt: new Date().toISOString(),
        lastUsed: null,
        usageCount: 0,
        isActive: true,
        expiresAt: null // Never expires by default
      };
      
      this.apiKeys.set(keyValue, keyData);
      this.keyUsage.set(keyValue, {
        requests: 0,
        lastRequest: null,
        errors: 0
      });
      
      logger.info('API key generated', {
        keyId,
        userId,
        permissions: permissions.length,
        description
      });
      
      auditLogger.systemEvent('api_key_generated', 'APIKeyManager', {
        keyId,
        userId,
        permissions: permissions.length
      });
      
      return keyData;
      
    } catch (error) {
      logger.error('API key generation failed:', error);
      throw new Error(`API key generation failed: ${error.message}`);
    }
  }
  
  // Validate API key
  validateAPIKey(apiKey) {
    const start = Date.now();
    
    try {
      if (!apiKey || typeof apiKey !== 'string') {
        return {
          valid: false,
          error: 'API key is required'
        };
      }
      
      // Check if key is blocked
      if (this.blockedKeys.has(apiKey)) {
        apiSecurityMetrics.errors.invalidApiKey++;
        return {
          valid: false,
          error: 'API key is blocked'
        };
      }
      
      // Get key data
      const keyData = this.apiKeys.get(apiKey);
      if (!keyData) {
        apiSecurityMetrics.errors.invalidApiKey++;
        return {
          valid: false,
          error: 'Invalid API key'
        };
      }
      
      // Check if key is active
      if (!keyData.isActive) {
        apiSecurityMetrics.errors.invalidApiKey++;
        return {
          valid: false,
          error: 'API key is inactive'
        };
      }
      
      // Check if key is expired
      if (keyData.expiresAt && new Date() > new Date(keyData.expiresAt)) {
        apiSecurityMetrics.errors.invalidApiKey++;
        return {
          valid: false,
          error: 'API key has expired'
        };
      }
      
      // Update usage statistics
      keyData.usageCount++;
      keyData.lastUsed = new Date().toISOString();
      
      const usageStats = this.keyUsage.get(apiKey);
      if (usageStats) {
        usageStats.requests++;
        usageStats.lastRequest = new Date().toISOString();
      }
      
      // Update metrics
      apiSecurityMetrics.operations.apiKeyValidations++;
      apiSecurityMetrics.timings.apiKeyValidation.push(Date.now() - start);
      
      return {
        valid: true,
        keyData
      };
      
    } catch (error) {
      apiSecurityMetrics.errors.invalidApiKey++;
      logger.error('API key validation failed:', error);
      return {
        valid: false,
        error: 'API key validation failed'
      };
    }
  }
  
  // Block API key
  blockAPIKey(apiKey, reason = 'manual') {
    try {
      this.blockedKeys.add(apiKey);
      
      const keyData = this.apiKeys.get(apiKey);
      if (keyData) {
        keyData.isActive = false;
        keyData.blockedAt = new Date().toISOString();
        keyData.blockedReason = reason;
      }
      
      logger.warn('API key blocked', {
        apiKey: apiKey.substring(0, 10) + '...',
        reason
      });
      
      auditLogger.systemEvent('api_key_blocked', 'APIKeyManager', {
        apiKey: apiKey.substring(0, 10) + '...',
        reason
      });
      
    } catch (error) {
      logger.error('Failed to block API key:', error);
      throw new Error(`Failed to block API key: ${error.message}`);
    }
  }
  
  // Get API key statistics
  getAPIKeyStats(apiKey) {
    const keyData = this.apiKeys.get(apiKey);
    const usageStats = this.keyUsage.get(apiKey);
    
    if (!keyData) {
      return null;
    }
    
    return {
      ...keyData,
      usageStats
    };
  }
}

// Threat Detector class
class ThreatDetector {
  constructor() {
    this.suspiciousIPs = new Map(); // ip -> threat data
    this.blockedIPs = new Set(); // Blocked IPs
    this.threatPatterns = API_SECURITY_CONFIG.THREAT_DETECTION.suspiciousPatterns;
    this.blockedUserAgents = API_SECURITY_CONFIG.THREAT_DETECTION.blockedUserAgents;
  }
  
  // Detect threats in request
  detectThreats(req) {
    const start = Date.now();
    
    try {
      const threats = [];
      const ip = req.ip || req.connection?.remoteAddress || 'unknown';
      const userAgent = req.get('User-Agent') || '';
      const url = req.url || '';
      const method = req.method || '';
      const body = JSON.stringify(req.body || {});
      const query = JSON.stringify(req.query || {});
      const headers = JSON.stringify(req.headers || {});
      
      const requestData = `${url} ${body} ${query} ${headers}`;
      
      // Check for SQL injection patterns
      if (this.threatPatterns.some(pattern => pattern.test(requestData))) {
        threats.push({
          type: 'sql_injection',
          severity: 'high',
          pattern: 'SQL injection pattern detected',
          location: 'request_data'
        });
        apiSecurityMetrics.threats.sqlInjection++;
      }
      
      // Check for XSS patterns
      if (/<script|javascript:|onload=|onerror=|onclick=/i.test(requestData)) {
        threats.push({
          type: 'xss',
          severity: 'high',
          pattern: 'XSS pattern detected',
          location: 'request_data'
        });
        apiSecurityMetrics.threats.xss++;
      }
      
      // Check for path traversal
      if (/\.\.\/|\.\.\\/.test(requestData)) {
        threats.push({
          type: 'path_traversal',
          severity: 'high',
          pattern: 'Path traversal pattern detected',
          location: 'request_data'
        });
        apiSecurityMetrics.threats.pathTraversal++;
      }
      
      // Check for suspicious user agents
      if (this.blockedUserAgents.some(pattern => pattern.test(userAgent))) {
        threats.push({
          type: 'suspicious_user_agent',
          severity: 'medium',
          pattern: 'Suspicious user agent detected',
          location: 'user_agent'
        });
        apiSecurityMetrics.threats.suspiciousUserAgent++;
      }
      
      // Check for excessive requests
      if (this.isExcessiveRequests(ip)) {
        threats.push({
          type: 'excessive_requests',
          severity: 'medium',
          pattern: 'Excessive request rate detected',
          location: 'ip'
        });
        apiSecurityMetrics.threats.excessiveRequests++;
      }
      
      // Update metrics
      apiSecurityMetrics.operations.threatDetections++;
      apiSecurityMetrics.timings.threatDetection.push(Date.now() - start);
      
      if (threats.length > 0) {
        apiSecurityMetrics.errors.threatDetected++;
        
        // Log threat detection
        securityLogger.warn('Threat detected', {
          ip,
          userAgent,
          url,
          method,
          threats,
          timestamp: new Date().toISOString()
        });
        
        // Update suspicious IP tracking
        this.updateSuspiciousIP(ip, threats);
      }
      
      return threats;
      
    } catch (error) {
      logger.error('Threat detection failed:', error);
      return [];
    }
  }
  
  // Check if IP is making excessive requests
  isExcessiveRequests(ip) {
    const now = Date.now();
    const threatData = this.suspiciousIPs.get(ip);
    
    if (!threatData) {
      return false;
    }
    
    // Check requests in the last second
    const recentRequests = threatData.requests.filter(
      timestamp => now - timestamp < 1000
    );
    
    return recentRequests.length > API_SECURITY_CONFIG.THREAT_DETECTION.maxRequestsPerSecond;
  }
  
  // Update suspicious IP tracking
  updateSuspiciousIP(ip, threats) {
    const now = Date.now();
    const threatData = this.suspiciousIPs.get(ip) || {
      requests: [],
      threats: [],
      firstSeen: now,
      lastSeen: now,
      threatCount: 0
    };
    
    threatData.requests.push(now);
    threatData.threats.push(...threats);
    threatData.lastSeen = now;
    threatData.threatCount += threats.length;
    
    // Cleanup old requests (older than 1 minute)
    threatData.requests = threatData.requests.filter(
      timestamp => now - timestamp < 60000
    );
    
    this.suspiciousIPs.set(ip, threatData);
    
    // Block IP if too many threats
    if (threatData.threatCount > API_SECURITY_CONFIG.THREAT_DETECTION.maxFailedAttempts) {
      this.blockIP(ip, 'excessive_threats');
    }
  }
  
  // Block IP address
  blockIP(ip, reason = 'manual') {
    this.blockedIPs.add(ip);
    
    logger.warn('IP address blocked', {
      ip,
      reason
    });
    
    auditLogger.systemEvent('ip_blocked', 'ThreatDetector', {
      ip,
      reason
    });
  }
  
  // Check if IP is blocked
  isIPBlocked(ip) {
    return this.blockedIPs.has(ip);
  }
}

// Request Validator class
class RequestValidator {
  constructor() {
    this.config = API_SECURITY_CONFIG.REQUEST_VALIDATION;
  }
  
  // Validate request
  validateRequest(req) {
    const start = Date.now();
    
    try {
      const errors = [];
      
      // Validate method
      if (!this.config.allowedMethods.includes(req.method)) {
        errors.push({
          type: 'invalid_method',
          message: `Method ${req.method} is not allowed`,
          severity: 'high'
        });
      }
      
      // Validate content type
      const contentType = req.get('Content-Type') || '';
      if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
        if (!this.config.allowedContentTypes.some(type => contentType.includes(type))) {
          errors.push({
            type: 'invalid_content_type',
            message: `Content-Type ${contentType} is not allowed`,
            severity: 'medium'
          });
        }
      }
      
      // Validate body size
      const contentLength = parseInt(req.get('Content-Length') || '0');
      if (contentLength > this.config.maxBodySize) {
        errors.push({
          type: 'body_too_large',
          message: `Request body too large: ${contentLength} bytes`,
          severity: 'high'
        });
      }
      
      // Validate query length
      const queryString = req.url.split('?')[1] || '';
      if (queryString.length > this.config.maxQueryLength) {
        errors.push({
          type: 'query_too_long',
          message: `Query string too long: ${queryString.length} characters`,
          severity: 'medium'
        });
      }
      
      // Validate header count
      const headerCount = Object.keys(req.headers).length;
      if (headerCount > this.config.maxHeaderCount) {
        errors.push({
          type: 'too_many_headers',
          message: `Too many headers: ${headerCount}`,
          severity: 'medium'
        });
      }
      
      // Validate header length
      for (const [key, value] of Object.entries(req.headers)) {
        if (key.length + value.length > this.config.maxHeaderLength) {
          errors.push({
            type: 'header_too_long',
            message: `Header ${key} is too long`,
            severity: 'medium'
          });
        }
      }
      
      // Update metrics
      if (errors.length > 0) {
        apiSecurityMetrics.errors.requestValidationFailed++;
      }
      
      return {
        valid: errors.length === 0,
        errors
      };
      
    } catch (error) {
      logger.error('Request validation failed:', error);
      return {
        valid: false,
        errors: [{
          type: 'validation_error',
          message: 'Request validation failed',
          severity: 'high'
        }]
      };
    }
  }
}

// Create global instances
const apiKeyManager = new APIKeyManager();
const threatDetector = new ThreatDetector();
const requestValidator = new RequestValidator();

// Enhanced rate limiting middleware
const createRateLimiter = (config) => {
  return rateLimit({
    windowMs: config.windowMs,
    max: config.max,
    message: {
      success: false,
      error: config.message,
      retryAfter: Math.ceil(config.windowMs / 1000)
    },
    standardHeaders: config.standardHeaders,
    legacyHeaders: config.legacyHeaders,
    keyGenerator: (req) => {
      // Use API key if available, otherwise use IP
      const apiKey = req.headers['x-api-key'];
      return apiKey || req.ip;
    },
    skip: (req) => {
      // Skip rate limiting for health checks
      return req.url === '/health' || req.url === '/health/detailed';
    },
    onLimitReached: (req, res, options) => {
      apiSecurityMetrics.operations.rateLimitHits++;
      apiSecurityMetrics.errors.rateLimitExceeded++;
      
      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        url: req.url,
        method: req.method,
        userAgent: req.get('User-Agent'),
        apiKey: req.headers['x-api-key'] ? 'present' : 'none'
      });
      
      auditLogger.systemEvent('rate_limit_exceeded', 'APISecurity', {
        ip: req.ip,
        url: req.url,
        method: req.method
      });
    }
  });
};

// Speed limiting middleware
const speedLimiter = slowDown({
  windowMs: API_SECURITY_CONFIG.SPEED_LIMITING.windowMs,
  delayAfter: API_SECURITY_CONFIG.SPEED_LIMITING.delayAfter,
  delayMs: API_SECURITY_CONFIG.SPEED_LIMITING.delayMs,
  maxDelayMs: API_SECURITY_CONFIG.SPEED_LIMITING.maxDelayMs,
  skipSuccessfulRequests: API_SECURITY_CONFIG.SPEED_LIMITING.skipSuccessfulRequests,
  keyGenerator: (req) => {
    const apiKey = req.headers['x-api-key'];
    return apiKey || req.ip;
  },
  onLimitReached: (req, res, options) => {
    apiSecurityMetrics.operations.speedLimitHits++;
    apiSecurityMetrics.errors.speedLimitExceeded++;
    
    logger.warn('Speed limit exceeded', {
      ip: req.ip,
      url: req.url,
      method: req.method
    });
  }
});

// API Security middleware
const apiSecurityMiddleware = (req, res, next) => {
  const start = Date.now();
  
  try {
    // Update request processing metrics
    apiSecurityMetrics.operations.requestsProcessed++;
    apiSecurityMetrics.timings.requestProcessing.push(Date.now() - start);
    
    // Check if IP is blocked
    if (threatDetector.isIPBlocked(req.ip)) {
      apiSecurityMetrics.operations.requestsBlocked++;
      return res.status(403).json({
        success: false,
        error: 'IP address is blocked',
        code: 'IP_BLOCKED'
      });
    }
    
    // Validate request
    const validation = requestValidator.validateRequest(req);
    if (!validation.valid) {
      apiSecurityMetrics.operations.requestsBlocked++;
      return res.status(400).json({
        success: false,
        error: 'Request validation failed',
        details: validation.errors,
        code: 'REQUEST_VALIDATION_FAILED'
      });
    }
    
    // Detect threats
    const threats = threatDetector.detectThreats(req);
    if (threats.length > 0) {
      apiSecurityMetrics.operations.requestsBlocked++;
      return res.status(403).json({
        success: false,
        error: 'Threat detected',
        threats,
        code: 'THREAT_DETECTED'
      });
    }
    
    // Validate API key if present
    const apiKey = req.headers['x-api-key'];
    if (apiKey) {
      const keyValidation = apiKeyManager.validateAPIKey(apiKey);
      if (!keyValidation.valid) {
        apiSecurityMetrics.operations.requestsBlocked++;
        return res.status(401).json({
          success: false,
          error: keyValidation.error,
          code: 'INVALID_API_KEY'
        });
      }
      
      // Add API key data to request
      req.apiKey = keyValidation.keyData;
    }
    
    next();
    
  } catch (error) {
    logger.error('API security middleware failed:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'SECURITY_MIDDLEWARE_ERROR'
    });
  }
};

// Get API security metrics
function getAPISecurityMetrics() {
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
    operations: apiSecurityMetrics.operations,
    errors: apiSecurityMetrics.errors,
    threats: apiSecurityMetrics.threats,
    performance: {
      requestProcessing: {
        average: calculateAverage(apiSecurityMetrics.timings.requestProcessing),
        p95: calculatePercentile(apiSecurityMetrics.timings.requestProcessing, 95),
        p99: calculatePercentile(apiSecurityMetrics.timings.requestProcessing, 99),
        max: Math.max(...apiSecurityMetrics.timings.requestProcessing, 0),
        min: Math.min(...apiSecurityMetrics.timings.requestProcessing, 0)
      },
      rateLimitCheck: {
        average: calculateAverage(apiSecurityMetrics.timings.rateLimitCheck),
        p95: calculatePercentile(apiSecurityMetrics.timings.rateLimitCheck, 95),
        p99: calculatePercentile(apiSecurityMetrics.timings.rateLimitCheck, 99),
        max: Math.max(...apiSecurityMetrics.timings.rateLimitCheck, 0),
        min: Math.min(...apiSecurityMetrics.timings.rateLimitCheck, 0)
      }
    },
    system: {
      apiKeys: apiKeyManager.apiKeys.size,
      blockedKeys: apiKeyManager.blockedKeys.size,
      suspiciousIPs: threatDetector.suspiciousIPs.size,
      blockedIPs: threatDetector.blockedIPs.size
    },
    successRate: apiSecurityMetrics.operations.requestsProcessed > 0 ? 
      ((apiSecurityMetrics.operations.requestsProcessed - apiSecurityMetrics.operations.requestsBlocked) / apiSecurityMetrics.operations.requestsProcessed * 100).toFixed(2) : 100
  };
}

// Export API security utilities
module.exports = {
  API_SECURITY_CONFIG,
  apiKeyManager,
  threatDetector,
  requestValidator,
  createRateLimiter,
  speedLimiter,
  apiSecurityMiddleware,
  getAPISecurityMetrics
};
