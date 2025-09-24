/**
 * Production-ready Rate Limiting Middleware
 * Redis-based rate limiting with fallback to in-memory storage
 */

const redis = require('redis');
const crypto = require('crypto');

class RateLimiter {
  constructor(options = {}) {
    this.redisClient = null;
    this.memoryStore = new Map();
    this.options = {
      windowMs: options.windowMs || 15 * 60 * 1000, // 15 minutes
      maxRequests: options.maxRequests || 100,
      skipSuccessfulRequests: options.skipSuccessfulRequests || false,
      skipFailedRequests: options.skipFailedRequests || false,
      keyGenerator: options.keyGenerator || this.defaultKeyGenerator,
      onLimitReached: options.onLimitReached || this.defaultLimitHandler,
      ...options
    };
    
    this.initializeRedis();
  }

  async initializeRedis() {
    try {
      if (process.env.REDIS_URL) {
        this.redisClient = redis.createClient({
          url: process.env.REDIS_URL,
          retry_strategy: (options) => {
            if (options.error && options.error.code === 'ECONNREFUSED') {
              console.warn('Redis connection refused, falling back to memory store');
              return undefined;
            }
            if (options.total_retry_time > 1000 * 60 * 60) {
              console.error('Redis retry time exhausted');
              return new Error('Retry time exhausted');
            }
            if (options.attempt > 10) {
              console.error('Redis retry attempts exhausted');
              return undefined;
            }
            return Math.min(options.attempt * 100, 3000);
          }
        });

        this.redisClient.on('error', (err) => {
          console.warn('Redis error, falling back to memory store:', err.message);
          this.redisClient = null;
        });

        this.redisClient.on('connect', () => {
          console.log('Redis connected for rate limiting');
        });

        await this.redisClient.connect();
      }
    } catch (error) {
      console.warn('Redis initialization failed, using memory store:', error.message);
      this.redisClient = null;
    }
  }

  defaultKeyGenerator(req) {
    // Use IP address and user agent for key generation
    const ip = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
    const userAgent = req.get('User-Agent') || '';
    const key = `${ip}:${crypto.createHash('sha256').update(userAgent).digest('hex').substring(0, 8)}`;
    return key;
  }

  defaultLimitHandler(req, res, next) {
    res.status(429).json({
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter: Math.ceil(this.options.windowMs / 1000)
    });
  }

  async checkLimit(key) {
    const now = Date.now();
    const windowStart = now - this.options.windowMs;

    if (this.redisClient) {
      return await this.checkLimitRedis(key, now, windowStart);
    } else {
      return await this.checkLimitMemory(key, now, windowStart);
    }
  }

  async checkLimitRedis(key, now, windowStart) {
    try {
      const pipeline = this.redisClient.multi();
      
      // Remove old entries
      pipeline.zRemRangeByScore(key, 0, windowStart);
      
      // Count current requests
      pipeline.zCard(key);
      
      // Add current request
      pipeline.zAdd(key, { score: now, value: now.toString() });
      
      // Set expiration
      pipeline.expire(key, Math.ceil(this.options.windowMs / 1000));
      
      const results = await pipeline.exec();
      const currentCount = results[1];
      
      return {
        allowed: currentCount < this.options.maxRequests,
        remaining: Math.max(0, this.options.maxRequests - currentCount - 1),
        resetTime: now + this.options.windowMs,
        totalHits: currentCount + 1
      };
    } catch (error) {
      console.error('Redis rate limit error:', error);
      // Fallback to memory store
      return await this.checkLimitMemory(key, now, windowStart);
    }
  }

  async checkLimitMemory(key, now, windowStart) {
    if (!this.memoryStore.has(key)) {
      this.memoryStore.set(key, []);
    }

    const requests = this.memoryStore.get(key);
    
    // Remove old requests
    const validRequests = requests.filter(timestamp => timestamp > windowStart);
    
    // Check if limit exceeded
    const allowed = validRequests.length < this.options.maxRequests;
    
    if (allowed) {
      validRequests.push(now);
      this.memoryStore.set(key, validRequests);
    }
    
    // Clean up old entries periodically
    if (Math.random() < 0.01) { // 1% chance
      this.cleanupMemoryStore();
    }
    
    return {
      allowed,
      remaining: Math.max(0, this.options.maxRequests - validRequests.length - 1),
      resetTime: now + this.options.windowMs,
      totalHits: validRequests.length + 1
    };
  }

  cleanupMemoryStore() {
    const now = Date.now();
    const windowStart = now - this.options.windowMs;
    
    for (const [key, requests] of this.memoryStore.entries()) {
      const validRequests = requests.filter(timestamp => timestamp > windowStart);
      if (validRequests.length === 0) {
        this.memoryStore.delete(key);
      } else {
        this.memoryStore.set(key, validRequests);
      }
    }
  }

  middleware() {
    return async (req, res, next) => {
      try {
        const key = this.options.keyGenerator(req);
        const limitInfo = await this.checkLimit(key);
        
        // Set rate limit headers
        res.set({
          'X-RateLimit-Limit': this.options.maxRequests.toString(),
          'X-RateLimit-Remaining': limitInfo.remaining.toString(),
          'X-RateLimit-Reset': new Date(limitInfo.resetTime).toISOString()
        });
        
        if (!limitInfo.allowed) {
          return this.options.onLimitReached(req, res, next);
        }
        
        next();
      } catch (error) {
        console.error('Rate limiting middleware error:', error);
        // Allow request on error to prevent blocking
        next();
      }
    };
  }
}

// Pre-configured rate limiters for different endpoints
const createRateLimiters = () => {
  return {
    // General API rate limiting
    general: new RateLimiter({
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 100,
      keyGenerator: (req) => {
        const ip = req.ip || req.connection.remoteAddress;
        return `api:${ip}`;
      }
    }),

    // Authentication rate limiting
    auth: new RateLimiter({
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 5, // 5 login attempts per 15 minutes
      keyGenerator: (req) => {
        const ip = req.ip || req.connection.remoteAddress;
        const email = req.body?.email || '';
        return `auth:${ip}:${email}`;
      }
    }),

    // Trading API rate limiting
    trading: new RateLimiter({
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 30, // 30 trading requests per minute
      keyGenerator: (req) => {
        const userId = req.user?.id || 'anonymous';
        return `trading:${userId}`;
      }
    }),

    // File upload rate limiting
    upload: new RateLimiter({
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 10, // 10 uploads per hour
      keyGenerator: (req) => {
        const userId = req.user?.id || req.ip;
        return `upload:${userId}`;
      }
    }),

    // Password reset rate limiting
    passwordReset: new RateLimiter({
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 3, // 3 password reset attempts per hour
      keyGenerator: (req) => {
        const ip = req.ip || req.connection.remoteAddress;
        return `password-reset:${ip}`;
      }
    })
  };
};

module.exports = {
  RateLimiter,
  createRateLimiters
};
