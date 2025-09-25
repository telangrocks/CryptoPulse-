/**
 * Production-Grade Advanced Rate Limiting System
 * Redis-based distributed rate limiting with adaptive behavior
 */

const redis = require('redis');
const crypto = require('crypto');
const { logger } = require('./structuredLogger');
const { getAuditLogger } = require('./auditLogger');

class AdvancedRateLimiter {
  constructor(options = {}) {
    this.redisClient = null;
    this.memoryStore = new Map();
    this.auditLogger = getAuditLogger();
    
    this.options = {
      windowMs: options.windowMs || 15 * 60 * 1000, // 15 minutes
      maxRequests: options.maxRequests || 100,
      skipSuccessfulRequests: options.skipSuccessfulRequests || false,
      skipFailedRequests: options.skipFailedRequests || false,
      keyGenerator: options.keyGenerator || this.defaultKeyGenerator,
      onLimitReached: options.onLimitReached || this.defaultLimitHandler,
      enableAdaptiveRateLimit: options.enableAdaptiveRateLimit || true,
      enableDistributedRateLimit: options.enableDistributedRateLimit || true,
      enableEmergencyBypass: options.enableEmergencyBypass || true,
      ...options
    };
    
    this.rateLimiters = {
      // General API requests: 100 requests per 15 minutes per IP
      general: {
        windowMs: 15 * 60 * 1000,
        maxRequests: 100,
        skipSuccessfulRequests: false,
        adaptiveMultiplier: 1.0
      },
      // Authentication endpoints: 10 requests per 15 minutes per IP
      auth: {
        windowMs: 15 * 60 * 1000,
        maxRequests: 10,
        skipSuccessfulRequests: false,
        adaptiveMultiplier: 1.0
      },
      // Trading operations: 30 requests per 15 minutes per IP
      trading: {
        windowMs: 15 * 60 * 1000,
        maxRequests: 30,
        skipSuccessfulRequests: false,
        adaptiveMultiplier: 1.0
      },
      // File uploads: 5 requests per 15 minutes per IP
      upload: {
        windowMs: 15 * 60 * 1000,
        maxRequests: 5,
        skipSuccessfulRequests: false,
        adaptiveMultiplier: 1.0
      },
      // Admin operations: 50 requests per 15 minutes per IP
      admin: {
        windowMs: 15 * 60 * 1000,
        maxRequests: 50,
        skipSuccessfulRequests: false,
        adaptiveMultiplier: 1.0
      }
    };
    
    this.emergencyBypassTokens = new Set();
    this.userBehaviorPatterns = new Map();
    
    this.initializeRedis();
  }

  async initializeRedis() {
    try {
      if (process.env.REDIS_URL) {
        this.redisClient = redis.createClient({
          url: process.env.REDIS_URL,
          password: process.env.REDIS_PASSWORD,
          retry_strategy: (options) => {
            if (options.error && options.error.code === 'ECONNREFUSED') {
              logger.warn('Redis connection refused, falling back to memory store', { 
                type: 'redis_connection' 
              });
              return undefined;
            }
            if (options.total_retry_time > 1000 * 60 * 60) {
              logger.error('Redis retry time exhausted', { type: 'redis_retry' });
              return new Error('Retry time exhausted');
            }
            if (options.attempt > 10) {
              logger.error('Redis retry attempts exhausted', { type: 'redis_retry' });
              return undefined;
            }
            return Math.min(options.attempt * 100, 3000);
          }
        });

        this.redisClient.on('error', (err) => {
          logger.warn('Redis error, falling back to memory store', { 
            type: 'redis_error', 
            error: err.message 
          });
          this.redisClient = null;
        });

        this.redisClient.on('connect', () => {
          logger.info('Redis connected for advanced rate limiting', { 
            type: 'redis_connection' 
          });
        });

        await this.redisClient.connect();
      }
    } catch (error) {
      logger.warn('Redis initialization failed, using memory store', { 
        type: 'redis_init', 
        error: error.message 
      });
      this.redisClient = null;
    }
  }

  // Default key generator
  defaultKeyGenerator(req) {
    return `rate_limit:${req.ip}:${req.route?.path || req.path}`;
  }

  // Default limit handler
  defaultLimitHandler(req, res, key, limit) {
    const retryAfter = Math.round(this.options.windowMs / 1000);
    
    res.set({
      'X-RateLimit-Limit': limit,
      'X-RateLimit-Remaining': 0,
      'X-RateLimit-Reset': new Date(Date.now() + this.options.windowMs).toISOString(),
      'Retry-After': retryAfter
    });

    // Log rate limit violation
    logger.warn('Rate limit exceeded', {
      type: 'rate_limit_violation',
      ip: req.ip,
      endpoint: req.path,
      limit,
      retryAfter,
      userAgent: req.get('User-Agent')
    });

    // Audit log rate limit violation
    this.auditLogger.logSystemEvent('RATE_LIMIT_EXCEEDED', {
      ip: req.ip,
      endpoint: req.path,
      limit,
      retryAfter
    });

    res.status(429).json({
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter,
      limit
    });
  }

  // Generate emergency bypass token
  generateEmergencyBypassToken() {
    const token = crypto.randomBytes(32).toString('hex');
    const expires = Date.now() + (60 * 60 * 1000); // 1 hour
    
    this.emergencyBypassTokens.add(token);
    
    // Auto-remove token after expiration
    setTimeout(() => {
      this.emergencyBypassTokens.delete(token);
    }, 60 * 60 * 1000);

    logger.info('Emergency bypass token generated', {
      type: 'emergency_bypass_token',
      expires: new Date(expires).toISOString()
    });

    return token;
  }

  // Check emergency bypass token
  isEmergencyBypassToken(token) {
    return this.emergencyBypassTokens.has(token);
  }

  // Adaptive rate limiting based on user behavior
  calculateAdaptiveMultiplier(userId, endpoint) {
    if (!this.options.enableAdaptiveRateLimit) {
      return 1.0;
    }

    const userKey = `${userId}:${endpoint}`;
    const pattern = this.userBehaviorPatterns.get(userKey) || {
      requestCount: 0,
      successRate: 1.0,
      lastActivity: Date.now(),
      violationCount: 0
    };

    let multiplier = 1.0;

    // Increase limit for users with high success rate
    if (pattern.successRate > 0.9) {
      multiplier = 1.2;
    } else if (pattern.successRate > 0.8) {
      multiplier = 1.1;
    }

    // Decrease limit for users with high violation rate
    if (pattern.violationCount > 5) {
      multiplier = 0.5;
    } else if (pattern.violationCount > 2) {
      multiplier = 0.8;
    }

    return Math.max(0.1, Math.min(2.0, multiplier)); // Clamp between 0.1 and 2.0
  }

  // Update user behavior pattern
  updateUserBehavior(userId, endpoint, success, isViolation = false) {
    if (!this.options.enableAdaptiveRateLimit) {
      return;
    }

    const userKey = `${userId}:${endpoint}`;
    const pattern = this.userBehaviorPatterns.get(userKey) || {
      requestCount: 0,
      successCount: 0,
      successRate: 1.0,
      lastActivity: Date.now(),
      violationCount: 0
    };

    pattern.requestCount++;
    pattern.lastActivity = Date.now();

    if (success) {
      pattern.successCount++;
    }

    if (isViolation) {
      pattern.violationCount++;
    }

    pattern.successRate = pattern.successCount / pattern.requestCount;

    this.userBehaviorPatterns.set(userKey, pattern);

    // Clean up old patterns (older than 24 hours)
    if (Date.now() - pattern.lastActivity > 24 * 60 * 60 * 1000) {
      this.userBehaviorPatterns.delete(userKey);
    }
  }

  // Distributed rate limiting with Redis
  async checkDistributedLimit(key, limit, windowMs) {
    if (!this.redisClient || !this.options.enableDistributedRateLimit) {
      return await this.checkLimitMemory(key, limit, windowMs);
    }

    try {
      const now = Date.now();
      const windowStart = now - windowMs;

      // Use Redis sorted set for sliding window
      const pipeline = this.redisClient.multi();
      
      // Remove expired entries
      pipeline.zRemRangeByScore(key, 0, windowStart);
      
      // Count current requests
      pipeline.zCard(key);
      
      // Add current request
      pipeline.zAdd(key, { score: now, value: `${now}-${crypto.randomBytes(8).toString('hex')}` });
      
      // Set expiration
      pipeline.expire(key, Math.ceil(windowMs / 1000));

      const results = await pipeline.exec();
      const currentCount = results[1][1];

      return {
        allowed: currentCount < limit,
        remaining: Math.max(0, limit - currentCount - 1),
        resetTime: new Date(now + windowMs),
        total: limit
      };
    } catch (error) {
      logger.error('Redis distributed rate limit error', { 
        type: 'redis_rate_limit', 
        error: error.message 
      });
      // Fallback to memory store
      return await this.checkLimitMemory(key, limit, windowMs);
    }
  }

  // Memory-based rate limiting (fallback)
  async checkLimitMemory(key, limit, windowMs) {
    const now = Date.now();
    const windowStart = now - windowMs;

    // Get or create rate limit entry
    let entry = this.memoryStore.get(key) || {
      requests: [],
      lastCleanup: now
    };

    // Clean up old requests
    if (now - entry.lastCleanup > 60000) { // Cleanup every minute
      entry.requests = entry.requests.filter(timestamp => timestamp > windowStart);
      entry.lastCleanup = now;
    }

    // Count current requests in window
    const currentCount = entry.requests.filter(timestamp => timestamp > windowStart).length;

    // Add current request
    entry.requests.push(now);

    // Update store
    this.memoryStore.set(key, entry);

    return {
      allowed: currentCount < limit,
      remaining: Math.max(0, limit - currentCount - 1),
      resetTime: new Date(now + windowMs),
      total: limit
    };
  }

  // Main rate limiting middleware
  createRateLimitMiddleware(type) {
    const config = this.rateLimiters[type];
    if (!config) {
      throw new Error(`Unknown rate limiter type: ${type}`);
    }

    return async (req, res, next) => {
      try {
        // Check for emergency bypass token
        const bypassToken = req.headers['x-emergency-bypass-token'];
        if (bypassToken && this.isEmergencyBypassToken(bypassToken)) {
          logger.info('Emergency bypass token used', {
            type: 'emergency_bypass',
            ip: req.ip,
            endpoint: req.path
          });
          return next();
        }

        // Generate rate limit key
        const key = this.options.keyGenerator(req, type);
        
        // Calculate adaptive limit
        const userId = req.user?.id;
        const adaptiveMultiplier = userId ? 
          this.calculateAdaptiveMultiplier(userId, req.path) : 1.0;
        
        const adaptiveLimit = Math.floor(config.maxRequests * adaptiveMultiplier);

        // Check rate limit
        const result = await this.checkDistributedLimit(key, adaptiveLimit, config.windowMs);

        // Set rate limit headers
        res.set({
          'X-RateLimit-Limit': result.total,
          'X-RateLimit-Remaining': result.remaining,
          'X-RateLimit-Reset': result.resetTime.toISOString(),
          'X-RateLimit-Type': type,
          'X-RateLimit-Adaptive': adaptiveMultiplier.toFixed(2)
        });

        if (!result.allowed) {
          // Update user behavior (violation)
          if (userId) {
            this.updateUserBehavior(userId, req.path, false, true);
          }

          // Call limit handler
          this.options.onLimitReached(req, res, key, result.total);
          return;
        }

        // Update user behavior (success)
        if (userId) {
          this.updateUserBehavior(userId, req.path, true, false);
        }

        // Override res.end to track response status
        const originalEnd = res.end;
        res.end = function(...args) {
          // Update user behavior based on response status
          if (userId) {
            const success = res.statusCode < 400;
            this.updateUserBehavior(userId, req.path, success, false);
          }
          originalEnd.apply(this, args);
        };

        next();
      } catch (error) {
        logger.error('Rate limiting middleware error', { 
          type: 'rate_limit_middleware', 
          error: error.message 
        });
        // Allow request on error to prevent blocking
        next();
      }
    };
  }

  // Get rate limit statistics
  getRateLimitStats() {
    const stats = {
      memoryStoreSize: this.memoryStore.size,
      userBehaviorPatterns: this.userBehaviorPatterns.size,
      emergencyBypassTokens: this.emergencyBypassTokens.size,
      redisConnected: !!this.redisClient,
      rateLimiters: {}
    };

    Object.entries(this.rateLimiters).forEach(([type, config]) => {
      stats.rateLimiters[type] = {
        maxRequests: config.maxRequests,
        windowMs: config.windowMs,
        adaptiveMultiplier: config.adaptiveMultiplier
      };
    });

    return stats;
  }

  // Clean up old data
  cleanup() {
    const now = Date.now();
    const cleanupThreshold = 24 * 60 * 60 * 1000; // 24 hours

    // Clean up memory store
    for (const [key, entry] of this.memoryStore.entries()) {
      if (now - entry.lastCleanup > cleanupThreshold) {
        this.memoryStore.delete(key);
      }
    }

    // Clean up user behavior patterns
    for (const [key, pattern] of this.userBehaviorPatterns.entries()) {
      if (now - pattern.lastActivity > cleanupThreshold) {
        this.userBehaviorPatterns.delete(key);
      }
    }

    logger.info('Rate limiter cleanup completed', {
      type: 'rate_limit_cleanup',
      memoryStoreSize: this.memoryStore.size,
      userBehaviorPatterns: this.userBehaviorPatterns.size
    });
  }

  // Close connections
  async close() {
    if (this.redisClient) {
      await this.redisClient.quit();
    }
  }
}

// Create singleton instance
let advancedRateLimiterInstance;

function getAdvancedRateLimiter(options = {}) {
  if (!advancedRateLimiterInstance) {
    advancedRateLimiterInstance = new AdvancedRateLimiter(options);
    
    // Setup cleanup interval
    setInterval(() => {
      advancedRateLimiterInstance.cleanup();
    }, 60 * 60 * 1000); // Cleanup every hour
  }
  
  return advancedRateLimiterInstance;
}

module.exports = { AdvancedRateLimiter, getAdvancedRateLimiter };
