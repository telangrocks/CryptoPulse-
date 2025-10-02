// =============================================================================
// Performance Optimization Utilities - Production Ready
// =============================================================================
// Caching, compression, and performance monitoring

const NodeCache = require('node-cache');
const Redis = require('redis');
const logger = require('./logging');

// Enhanced in-memory cache with production-optimized memory management
const memoryCache = new NodeCache({
  stdTTL: 300, // 5 minutes default TTL
  checkperiod: 30, // Check for expired keys every 30 seconds (more frequent cleanup)
  useClones: false, // Don't clone objects for better performance
  maxKeys: 20000, // Increased for production - Maximum number of keys
  deleteOnExpire: true, // Automatically delete expired keys
  forceString: false, // Allow objects to be stored
  // Enhanced memory management - Production optimized
  maxMemoryUsage: 200 * 1024 * 1024, // Increased to 200MB for production workload
  checkOnExpire: true, // Check memory usage on expiration
  // Additional production optimizations
  enableLegacyCallbacks: false, // Disable legacy callbacks for better performance
  maxAge: 300000, // 5 minutes max age for any key
  // Memory pressure handling
  memoryPressureThreshold: 0.8, // 80% memory usage threshold
  aggressiveCleanup: true // Enable aggressive cleanup when memory pressure is high
});

// Redis client for distributed caching
let redisClient = null;

// Initialize Redis connection
const initRedis = async() => {
  try {
    if (!process.env.REDIS_URL) {
      logger.warn('⚠️ REDIS_URL not set, using memory cache only');
      return null;
    }

    redisClient = Redis.createClient({
      url: process.env.REDIS_URL,
      socket: {
        connectTimeout: 10000,
        commandTimeout: 5000,
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            return new Error('Redis retry limit exceeded');
          }
          return Math.min(retries * 100, 3000);
        }
      }
    });

    redisClient.on('error', (err) => {
      logger.error('Redis Client Error:', err);
    });

    redisClient.on('connect', () => {
      logger.info('Redis client connecting...');
    });

    redisClient.on('ready', () => {
      logger.info('Redis client ready');
    });

    await redisClient.connect();
    logger.info('✅ Redis connected successfully');
    return redisClient;
  } catch (error) {
    logger.warn('⚠️ Redis connection failed, using memory cache only:', error.message);
    redisClient = null;
    return null;
  }
};

// Cache metrics tracking
const cacheMetrics = {
  hits: 0,
  misses: 0,
  memoryHits: 0,
  redisHits: 0,
  errors: 0,
  getHitRate: () => {
    const total = cacheMetrics.hits + cacheMetrics.misses;
    return total > 0 ? (cacheMetrics.hits / total * 100).toFixed(2) + '%' : '0%';
  },
  getMemoryHitRate: () => {
    const total = cacheMetrics.memoryHits + cacheMetrics.redisHits;
    return total > 0 ? (cacheMetrics.memoryHits / total * 100).toFixed(2) + '%' : '0%';
  },
  reset: () => {
    cacheMetrics.hits = 0;
    cacheMetrics.misses = 0;
    cacheMetrics.memoryHits = 0;
    cacheMetrics.redisHits = 0;
    cacheMetrics.errors = 0;
  }
};

// Granular cache TTL strategies based on data types
const CACHE_TTL_STRATEGIES = {
  // User data - longer TTL for stable data
  USER_PROFILE: 3600, // 1 hour
  USER_PREFERENCES: 1800, // 30 minutes
  USER_SESSIONS: 86400, // 24 hours

  // Trading data - shorter TTL for real-time data
  MARKET_DATA: 30, // 30 seconds
  PRICE_DATA: 10, // 10 seconds
  ORDER_BOOK: 5, // 5 seconds
  TRADE_HISTORY: 300, // 5 minutes

  // Exchange data - moderate TTL
  EXCHANGE_CONFIG: 7200, // 2 hours
  EXCHANGE_BALANCE: 120, // 2 minutes
  EXCHANGE_ORDERS: 60, // 1 minute

  // System data - various TTLs
  SYSTEM_CONFIG: 86400, // 24 hours
  SYSTEM_HEALTH: 60, // 1 minute
  SYSTEM_STATS: 300, // 5 minutes

  // API responses - short TTL
  API_RESPONSE: 300, // 5 minutes
  API_RATE_LIMIT: 60, // 1 minute

  // Static content - long TTL
  STATIC_CONTENT: 86400, // 24 hours
  ASSETS: 604800, // 7 days

  // Authentication - medium TTL
  AUTH_TOKENS: 3600, // 1 hour
  PERMISSIONS: 1800, // 30 minutes

  // Analytics - longer TTL for processed data
  ANALYTICS: 3600, // 1 hour
  REPORTS: 86400, // 24 hours
  DASHBOARD_DATA: 600 // 10 minutes
};

// Cache key patterns for automatic TTL detection
const CACHE_KEY_PATTERNS = {
  'user:': CACHE_TTL_STRATEGIES.USER_PROFILE,
  'user:preferences:': CACHE_TTL_STRATEGIES.USER_PREFERENCES,
  'session:': CACHE_TTL_STRATEGIES.USER_SESSIONS,
  'market:': CACHE_TTL_STRATEGIES.MARKET_DATA,
  'price:': CACHE_TTL_STRATEGIES.PRICE_DATA,
  'orderbook:': CACHE_TTL_STRATEGIES.ORDER_BOOK,
  'trades:': CACHE_TTL_STRATEGIES.TRADE_HISTORY,
  'exchange:config:': CACHE_TTL_STRATEGIES.EXCHANGE_CONFIG,
  'exchange:balance:': CACHE_TTL_STRATEGIES.EXCHANGE_BALANCE,
  'exchange:orders:': CACHE_TTL_STRATEGIES.EXCHANGE_ORDERS,
  'system:config:': CACHE_TTL_STRATEGIES.SYSTEM_CONFIG,
  'system:health:': CACHE_TTL_STRATEGIES.SYSTEM_HEALTH,
  'system:stats:': CACHE_TTL_STRATEGIES.SYSTEM_STATS,
  'api:': CACHE_TTL_STRATEGIES.API_RESPONSE,
  'rate_limit:': CACHE_TTL_STRATEGIES.API_RATE_LIMIT,
  'static:': CACHE_TTL_STRATEGIES.STATIC_CONTENT,
  'assets:': CACHE_TTL_STRATEGIES.ASSETS,
  'auth:': CACHE_TTL_STRATEGIES.AUTH_TOKENS,
  'permissions:': CACHE_TTL_STRATEGIES.PERMISSIONS,
  'analytics:': CACHE_TTL_STRATEGIES.ANALYTICS,
  'reports:': CACHE_TTL_STRATEGIES.REPORTS,
  'dashboard:': CACHE_TTL_STRATEGIES.DASHBOARD_DATA
};

// Smart TTL detection based on cache key
const getSmartTTL = (key, customTTL = null) => {
  if (customTTL !== null) {
    return customTTL;
  }

  // Check for exact pattern matches
  for (const [pattern, ttl] of Object.entries(CACHE_KEY_PATTERNS)) {
    if (key.startsWith(pattern)) {
      return ttl;
    }
  }

  // Check for data type in key structure
  if (key.includes(':user:')) {return CACHE_TTL_STRATEGIES.USER_PROFILE;}
  if (key.includes(':market:')) {return CACHE_TTL_STRATEGIES.MARKET_DATA;}
  if (key.includes(':price:')) {return CACHE_TTL_STRATEGIES.PRICE_DATA;}
  if (key.includes(':exchange:')) {return CACHE_TTL_STRATEGIES.EXCHANGE_BALANCE;}
  if (key.includes(':system:')) {return CACHE_TTL_STRATEGIES.SYSTEM_HEALTH;}
  if (key.includes(':api:')) {return CACHE_TTL_STRATEGIES.API_RESPONSE;}

  // Default TTL based on key characteristics
  if (key.includes('real-time') || key.includes('live')) {return 10;}
  if (key.includes('frequent') || key.includes('dynamic')) {return 60;}
  if (key.includes('static') || key.includes('config')) {return 3600;}

  // Default fallback
  return 300; // 5 minutes
};

// Enhanced cache utilities with smart TTL
const cache = {
  // Get from cache (memory first, then Redis)
  async get(key) {
    if (!key || typeof key !== 'string') {
      cacheMetrics.misses++;
      return null;
    }

    // Try memory cache first
    const memoryValue = memoryCache.get(key);
    if (memoryValue !== undefined) {
      cacheMetrics.hits++;
      cacheMetrics.memoryHits++;
      return memoryValue;
    }

    // Try Redis if available
    if (redisClient) {
      try {
        const redisValue = await redisClient.get(key);
        if (redisValue) {
          const parsedValue = JSON.parse(redisValue);
          // Store in memory cache for faster access with smart TTL
          const smartTTL = getSmartTTL(key);
          memoryCache.set(key, parsedValue, smartTTL);
          cacheMetrics.hits++;
          cacheMetrics.redisHits++;
          return parsedValue;
        }
      } catch (error) {
        logger.error('Redis get error:', error);
        cacheMetrics.errors++;
      // If Redis fails, continue with memory cache only
      }
    }

    cacheMetrics.misses++;
    return null;
  },

  // Set cache value with smart TTL detection
  async set(key, value, ttl = null) {
    if (!key || typeof key !== 'string') {
      return;
    }

    // Use smart TTL if not specified
    const finalTTL = getSmartTTL(key, ttl);

    // Validate TTL
    if (!Number.isInteger(finalTTL) || finalTTL < 0) {
      ttl = 300; // Default to 5 minutes
    }

    // Store in memory cache
    memoryCache.set(key, value, finalTTL);

    // Store in Redis if available
    if (redisClient) {
      try {
        await redisClient.setEx(key, finalTTL, JSON.stringify(value));
      } catch (error) {
        logger.error('Redis set error:', error);
      // Continue with memory cache only
      }
    }
  },

  // Set with specific data type for optimized TTL
  async setByType(key, value, dataType) {
    const ttl = CACHE_TTL_STRATEGIES[dataType] || CACHE_TTL_STRATEGIES.API_RESPONSE;
    return this.set(key, value, ttl);
  },

  // Delete from cache
  async del(key) {
    if (!key || typeof key !== 'string') {
      return;
    }

    memoryCache.del(key);
    if (redisClient) {
      try {
        await redisClient.del(key);
      } catch (error) {
        logger.error('Redis del error:', error);
      }
    }
  },

  // Clear all cache
  async clear() {
    memoryCache.flushAll();
    if (redisClient) {
      try {
        await redisClient.flushAll();
      } catch (error) {
        logger.error('Redis flush error:', error);
      }
    }
  },

  // Get cache statistics
  getStats() {
    return {
      memory: memoryCache.getStats(),
      redis: redisClient ? 'connected' : 'disconnected',
      metrics: {
        hits: cacheMetrics.hits,
        misses: cacheMetrics.misses,
        hitRate: cacheMetrics.getHitRate(),
        memoryHits: cacheMetrics.memoryHits,
        redisHits: cacheMetrics.redisHits,
        memoryHitRate: cacheMetrics.getMemoryHitRate(),
        errors: cacheMetrics.errors
      }
    };
  },

  // Cache invalidation strategies
  invalidateByPattern: (pattern) => {
    if (!pattern || typeof pattern !== 'string') {
      return { invalidated: 0, error: 'Invalid pattern' };
    }

    try {
      const regex = new RegExp(pattern);
      const keys = memoryCache.keys();
      const matchingKeys = keys.filter(key => regex.test(key));

      matchingKeys.forEach(key => memoryCache.del(key));

      // Also invalidate in Redis if available
      if (redisClient) {
        matchingKeys.forEach(async key => {
          try {
            await redisClient.del(key);
          } catch (error) {
            logger.error('Redis invalidation error:', error);
          }
        });
      }

      return { invalidated: matchingKeys.length, keys: matchingKeys };
    } catch (error) {
      return { invalidated: 0, error: error.message };
    }
  },

  invalidateByTag: (tag) => {
    if (!tag || typeof tag !== 'string') {
      return { invalidated: 0, error: 'Invalid tag' };
    }

    const tagPattern = `.*:${tag}:.*`;
    return cache.invalidateByPattern(tagPattern);
  },

  invalidateByPrefix: (prefix) => {
    if (!prefix || typeof prefix !== 'string') {
      return { invalidated: 0, error: 'Invalid prefix' };
    }

    const prefixPattern = `^${prefix}.*`;
    return cache.invalidateByPattern(prefixPattern);
  },

  // Warm cache with frequently accessed data
  warmCache: async(warmData) => {
    if (!Array.isArray(warmData)) {
      return { warmed: 0, error: 'Warm data must be an array' };
    }

    let warmed = 0;
    let errors = 0;

    // Process in batches to avoid overwhelming the system
    const batchSize = 10;
    for (let i = 0; i < warmData.length; i += batchSize) {
      const batch = warmData.slice(i, i + batchSize);

      const batchPromises = batch.map(async(item) => {
        if (item.key && item.value) {
          try {
            await cache.set(item.key, item.value, item.ttl || 300);
            return { success: true, key: item.key };
          } catch (error) {
            logger.error('Cache warming error for key:', item.key, error);
            return { success: false, key: item.key, error: error.message };
          }
        }
        return { success: false, key: 'invalid', error: 'Missing key or value' };
      });

      const results = await Promise.all(batchPromises);
      for (const result of results) {
        if (result.success) {
          warmed++;
        } else {
          errors++;
        }
      }

      // Small delay between batches to prevent overwhelming
      if (i + batchSize < warmData.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    logger.info('Cache warming completed', { warmed, errors, total: warmData.length });
    return { warmed, errors, total: warmData.length };
  },

  // Advanced cache warming for common data patterns
  warmCommonData: async() => {
    const commonData = [
      { key: 'system:health', value: { status: 'healthy', timestamp: new Date().toISOString() }, ttl: 60 },
      { key: 'system:config', value: { version: '2.0.0', environment: process.env.NODE_ENV }, ttl: 300 },
      { key: 'system:stats', value: { uptime: process.uptime(), memory: process.memoryUsage() }, ttl: 120 }
    ];

    return await cache.warmCache(commonData);
  }
};

// API response caching middleware
const cacheMiddleware = (ttl = 300) => {
  return async(req, res, next) => {
  // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    const cacheKey = `api:${req.originalUrl}:${JSON.stringify(req.query)}`;

    try {
      const cachedResponse = await cache.get(cacheKey);
      if (cachedResponse) {
        return res.json(cachedResponse);
      }
    } catch (error) {
      logger.error('Cache get error:', error);
    }

    // Store original res.json
    const originalJson = res.json;

    // Override res.json to cache the response
    res.json = function(data) {
    // Cache the response
      cache.set(cacheKey, data, ttl).catch(error => {
        logger.error('Cache set error:', error);
      });

      // Call original res.json
      return originalJson.call(this, data);
    };

    next();
  };
};

// Database query optimization
const queryOptimizer = {
  // Pagination helper
  paginate: (page = 1, limit = 10) => {
    const offset = (page - 1) * limit;
    return { offset, limit, page };
  },

  // Sort helper
  sort: (sortBy = 'createdAt', sortOrder = 'DESC') => {
    return { [sortBy]: sortOrder };
  },

  // Field selection helper
  select: (fields) => {
    if (Array.isArray(fields)) {
      return fields.join(' ');
    }
    return fields;
  }
};

// Performance monitoring
const performanceMonitor = {
  // Track API response times
  trackResponseTime: (req, res, next) => {
    const start = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - start;
      const logData = {
        method: req.method,
        url: req.url,
        status: res.statusCode,
        duration: `${duration}ms`,
        ip: req.ip
      };

      // Log slow requests
      if (duration > 1000) {
        logger.warn('Slow request detected:', logData);
      }
    });

    next();
  },

  // Memory usage monitoring
  getMemoryUsage: () => {
    const usage = process.memoryUsage();
    return {
      rss: `${Math.round(usage.rss / 1024 / 1024)} MB`,
      heapTotal: `${Math.round(usage.heapTotal / 1024 / 1024)} MB`,
      heapUsed: `${Math.round(usage.heapUsed / 1024 / 1024)} MB`,
      external: `${Math.round(usage.external / 1024 / 1024)} MB`
    };
  },

  // CPU usage monitoring
  getCPUUsage: () => {
    const usage = process.cpuUsage();
    return {
      user: usage.user,
      system: usage.system
    };
  }
};

// Rate limiting with Redis
const rateLimiter = {
  // Simple rate limiter using sliding window
  async checkLimit(key, limit, window) {
    if (!redisClient) {
      return true; // Allow if Redis not available
    }

    try {
      const current = await redisClient.incr(key);

      if (current === 1) {
        await redisClient.expire(key, window);
      }

      return current <= limit;
    } catch (error) {
      logger.error('Rate limiter error:', error);
      return true; // Allow on error
    }
  }
};

// Enhanced memory management system
const memoryManager = {
  maxMemoryUsage: 200 * 1024 * 1024, // 200MB
  warningThreshold: 0.7, // 70% warning threshold
  criticalThreshold: 0.85, // 85% critical threshold
  emergencyThreshold: 0.95, // 95% emergency threshold

  // Get current memory usage
  getCurrentMemoryUsage: () => {
    const usage = process.memoryUsage();
    return {
      rss: usage.rss,
      heapTotal: usage.heapTotal,
      heapUsed: usage.heapUsed,
      external: usage.external,
      heapUsedMB: Math.round(usage.heapUsed / 1024 / 1024),
      heapTotalMB: Math.round(usage.heapTotal / 1024 / 1024),
      rssMB: Math.round(usage.rss / 1024 / 1024)
    };
  },

  // Check if memory usage is critical
  isMemoryCritical: () => {
    const usage = memoryManager.getCurrentMemoryUsage();
    return usage.heapUsed > (memoryManager.maxMemoryUsage * memoryManager.criticalThreshold);
  },

  // Check if memory usage is in emergency state
  isMemoryEmergency: () => {
    const usage = memoryManager.getCurrentMemoryUsage();
    return usage.heapUsed > (memoryManager.maxMemoryUsage * memoryManager.emergencyThreshold);
  },

  // Perform memory cleanup
  performCleanup: (level = 'normal') => {
    const usage = memoryManager.getCurrentMemoryUsage();
    const cacheStats = cache.getStats();
    const keys = memoryCache.keys();

    logger.info(`Memory cleanup (${level}):`, {
      heapUsedMB: usage.heapUsedMB,
      cacheKeys: keys.length,
      hitRate: cacheStats.metrics?.hitRate || '0%'
    });

    if (level === 'emergency') {
      // Emergency: Clear all cache
      memoryCache.flushAll();
      logger.warn('Emergency memory cleanup: cleared all cache');
    } else if (level === 'critical') {
      // Critical: Clear 50% of cache
      const keysToDelete = keys.slice(0, Math.floor(keys.length * 0.5));
      keysToDelete.forEach(key => memoryCache.del(key));
      logger.warn(`Critical memory cleanup: cleared ${keysToDelete.length} cache keys`);
    } else if (level === 'warning') {
      // Warning: Clear 25% of cache
      const keysToDelete = keys.slice(0, Math.floor(keys.length * 0.25));
      keysToDelete.forEach(key => memoryCache.del(key));
      logger.info(`Warning memory cleanup: cleared ${keysToDelete.length} cache keys`);
    }

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
      logger.info('Forced garbage collection');
    }
  },

  // Monitor memory usage and trigger cleanup if needed
  monitor: () => {
    const usage = memoryManager.getCurrentMemoryUsage();
    const memoryRatio = usage.heapUsed / memoryManager.maxMemoryUsage;

    if (memoryRatio > memoryManager.emergencyThreshold) {
      memoryManager.performCleanup('emergency');
    } else if (memoryRatio > memoryManager.criticalThreshold) {
      memoryManager.performCleanup('critical');
    } else if (memoryRatio > memoryManager.warningThreshold) {
      memoryManager.performCleanup('warning');
    }
  }
};

// Initialize performance monitoring with enhanced memory management
const initPerformanceMonitoring = () => {
  // Monitor memory usage every 30 seconds (more frequent monitoring)
  const memoryInterval = setInterval(() => {
    memoryManager.monitor();

    const memoryUsage = performanceMonitor.getMemoryUsage();
    const cacheStats = cache.getStats();

    logger.debug('Memory Usage:', {
      ...memoryUsage,
      cacheKeys: cacheStats.memory?.keys || 0,
      cacheHitRate: cacheStats.metrics?.hitRate || '0%'
    });
  }, 30 * 1000); // Check every 30 seconds

  // Monitor cache statistics every 5 minutes
  const cacheInterval = setInterval(() => {
    const stats = cache.getStats();
    logger.info('Cache Stats:', {
      memoryKeys: stats.memory?.keys || 0,
      hitRate: stats.metrics?.hitRate || '0%',
      memoryHitRate: stats.metrics?.memoryHitRate || '0%',
      errors: stats.metrics?.errors || 0,
      redisStatus: stats.redis || 'disconnected'
    });

    // Clear cache if it's getting too large (increased threshold)
    if (stats.memory && stats.memory.keys > 12000) {
      // Clear oldest 30% of keys instead of all
      const keys = memoryCache.keys();
      const keysToDelete = keys.slice(0, Math.floor(keys.length * 0.3));
      keysToDelete.forEach(key => memoryCache.del(key));
      logger.warn('Cleared 30% of cache keys due to high key count');
    }
  }, 5 * 60 * 1000); // Check every 5 minutes

  // Monitor Redis connection with enhanced error handling
  let redisInterval = null;
  if (redisClient) {
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;

    redisInterval = setInterval(async() => {
      try {
        await redisClient.ping();
        reconnectAttempts = 0; // Reset on successful ping
      } catch (error) {
        logger.error('Redis connection lost:', error.message);
        reconnectAttempts++;

        if (reconnectAttempts <= maxReconnectAttempts) {
          // Attempt to reconnect with exponential backoff
          const backoffDelay = Math.min(1000 * Math.pow(2, reconnectAttempts - 1), 30000);
          logger.info(`Attempting Redis reconnection (attempt ${reconnectAttempts}/${maxReconnectAttempts}) in ${backoffDelay}ms`);

          setTimeout(async() => {
            try {
              await redisClient.connect();
              logger.info('Redis reconnected successfully');
              reconnectAttempts = 0;
            } catch (reconnectError) {
              logger.error(`Redis reconnection failed (attempt ${reconnectAttempts}):`, reconnectError.message);

              if (reconnectAttempts >= maxReconnectAttempts) {
                logger.error('Redis reconnection failed after maximum attempts, disabling Redis features');
                redisClient = null;
              }
            }
          }, backoffDelay);
        } else {
          logger.error('Redis reconnection failed after maximum attempts, disabling Redis features');
          redisClient = null;
        }
      }
    }, 30 * 1000); // Check every 30 seconds
  }

  // Cleanup function
  const cleanup = () => {
    if (memoryInterval) {clearInterval(memoryInterval);}
    if (cacheInterval) {clearInterval(cacheInterval);}
    if (redisInterval) {clearInterval(redisInterval);}
  };

  // Handle graceful shutdown
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  return cleanup;
};

// Advanced monitoring and alerting capabilities
const advancedMonitoring = {
  // Custom metrics collection
  metrics: {
    requestLatency: new Map(),
    errorRates: new Map(),
    throughput: new Map(),
    resourceUsage: new Map(),

    // Record request latency
    recordLatency(endpoint, latency) {
      if (!this.requestLatency.has(endpoint)) {
        this.requestLatency.set(endpoint, []);
      }
      const latencies = this.requestLatency.get(endpoint);
      latencies.push(latency);

      // Keep only last 100 measurements
      if (latencies.length > 100) {
        latencies.shift();
      }
    },

    // Record error rate
    recordError(endpoint, error) {
      if (!this.errorRates.has(endpoint)) {
        this.errorRates.set(endpoint, { total: 0, errors: 0, lastError: null });
      }
      const stats = this.errorRates.get(endpoint);
      stats.total++;
      stats.errors++;
      stats.lastError = { error: error.message, timestamp: new Date().toISOString() };
    },

    // Record successful request
    recordSuccess(endpoint) {
      if (!this.errorRates.has(endpoint)) {
        this.errorRates.set(endpoint, { total: 0, errors: 0, lastError: null });
      }
      const stats = this.errorRates.get(endpoint);
      stats.total++;
    },

    // Get error rate percentage
    getErrorRate(endpoint) {
      const stats = this.errorRates.get(endpoint);
      if (!stats || stats.total === 0) {return 0;}
      return (stats.errors / stats.total) * 100;
    },

    // Get average latency
    getAverageLatency(endpoint) {
      const latencies = this.requestLatency.get(endpoint);
      if (!latencies || latencies.length === 0) {return 0;}
      return latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length;
    },

    // Get all metrics
    getAllMetrics() {
      const metrics = {};

      for (const [endpoint] of this.requestLatency) {
        metrics[endpoint] = {
          averageLatency: this.getAverageLatency(endpoint),
          errorRate: this.getErrorRate(endpoint),
          requestCount: this.errorRates.get(endpoint)?.total || 0,
          errorCount: this.errorRates.get(endpoint)?.errors || 0,
          lastError: this.errorRates.get(endpoint)?.lastError
        };
      }

      return metrics;
    }
  },

  // Health checks with detailed metrics
  healthChecks: {
    // Check cache health
    async checkCacheHealth() {
      const stats = cache.getStats();
      const memoryUsage = performanceMonitor.getMemoryUsage();

      return {
        status: stats.memory?.keys < 10000 ? 'healthy' : 'warning',
        details: {
          memoryKeys: stats.memory?.keys || 0,
          hitRate: stats.metrics?.hitRate || '0%',
          redisStatus: stats.redis || 'disconnected',
          memoryUsage: memoryUsage.heapUsed,
          errors: stats.metrics?.errors || 0
        }
      };
    },

    // Check database health
    async checkDatabaseHealth() {
      try {
        const { healthCheck } = require('./database');
        const health = await healthCheck();

        const hasUnhealthyServices = Object.values(health).some(service =>
          service.status === 'unhealthy'
        );

        return {
          status: hasUnhealthyServices ? 'unhealthy' : 'healthy',
          details: health
        };
      } catch (error) {
        return {
          status: 'unhealthy',
          details: { error: error.message }
        };
      }
    },

    // Check system resources
    checkSystemResources() {
      const memoryUsage = performanceMonitor.getMemoryUsage();
      const cpuUsage = performanceMonitor.getCPUUsage();

      const heapUsedMB = parseInt(memoryUsage.heapUsed, 10);
      const isHighMemory = heapUsedMB > 500;
      const isHighCPU = cpuUsage.user > 1000000; // 1 second of CPU time

      return {
        status: (isHighMemory || isHighCPU) ? 'warning' : 'healthy',
        details: {
          memory: memoryUsage,
          cpu: cpuUsage,
          uptime: process.uptime(),
          pid: process.pid,
          nodeVersion: process.version,
          platform: process.platform
        }
      };
    },

    // Comprehensive health check
    async getOverallHealth() {
      const [cacheHealth, dbHealth, systemHealth] = await Promise.all([
        this.checkCacheHealth(),
        this.checkDatabaseHealth(),
        this.checkSystemResources()
      ]);

      const overallStatus = [cacheHealth, dbHealth, systemHealth].every(h => h.status === 'healthy')
        ? 'healthy'
        : [cacheHealth, dbHealth, systemHealth].some(h => h.status === 'unhealthy')
          ? 'unhealthy'
          : 'warning';

      return {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        components: {
          cache: cacheHealth,
          database: dbHealth,
          system: systemHealth
        },
        metrics: advancedMonitoring.metrics.getAllMetrics()
      };
    }
  },

  // Alerting system
  alerts: {
    thresholds: {
      errorRate: 5, // 5% error rate
      latency: 2000, // 2 seconds
      memoryUsage: 80, // 80% memory usage
      cpuUsage: 90 // 90% CPU usage
    },

    async checkAlerts() {
      const alerts = [];
      const metrics = advancedMonitoring.metrics.getAllMetrics();

      // Check error rates
      for (const [endpoint, metric] of Object.entries(metrics)) {
        if (metric.errorRate > this.thresholds.errorRate) {
          alerts.push({
            type: 'error_rate',
            severity: 'high',
            message: `High error rate detected for ${endpoint}: ${metric.errorRate.toFixed(2)}%`,
            endpoint,
            value: metric.errorRate,
            threshold: this.thresholds.errorRate,
            timestamp: new Date().toISOString()
          });
        }

        if (metric.averageLatency > this.thresholds.latency) {
          alerts.push({
            type: 'latency',
            severity: 'medium',
            message: `High latency detected for ${endpoint}: ${metric.averageLatency.toFixed(2)}ms`,
            endpoint,
            value: metric.averageLatency,
            threshold: this.thresholds.latency,
            timestamp: new Date().toISOString()
          });
        }
      }

      // Check system resources
      const systemHealth = advancedMonitoring.healthChecks.checkSystemResources();
      const heapUsedMB = parseInt(systemHealth.details.memory.heapUsed, 10);

      if (heapUsedMB > (this.thresholds.memoryUsage * 1024)) { // Convert MB to percentage
        alerts.push({
          type: 'memory',
          severity: 'high',
          message: `High memory usage: ${systemHealth.details.memory.heapUsed}`,
          value: heapUsedMB,
          threshold: this.thresholds.memoryUsage * 1024,
          timestamp: new Date().toISOString()
        });
      }

      return alerts;
    },

    async sendAlerts(alerts) {
      if (alerts.length === 0) {return;}

      // Log alerts
      alerts.forEach(alert => {
        if (alert.severity === 'high') {
          logger.error('High severity alert:', alert);
        } else {
          logger.warn('Alert:', alert);
        }
      });

      // Send to external monitoring service if configured
      if (process.env.SLACK_WEBHOOK_URL) {
        await this.sendSlackAlerts(alerts);
      }
    },

    async sendSlackAlerts(alerts) {
      try {
        const axios = require('axios');
        const highSeverityAlerts = alerts.filter(a => a.severity === 'high');

        if (highSeverityAlerts.length > 0) {
          const message = {
            text: `🚨 ${highSeverityAlerts.length} High Severity Alert(s)`,
            attachments: highSeverityAlerts.map(alert => ({
              color: 'danger',
              title: alert.message,
              fields: [
                { title: 'Type', value: alert.type, short: true },
                { title: 'Endpoint', value: alert.endpoint || 'System', short: true },
                { title: 'Value', value: alert.value, short: true },
                { title: 'Threshold', value: alert.threshold, short: true }
              ],
              ts: Math.floor(new Date(alert.timestamp).getTime() / 1000)
            }))
          };

          await axios.post(process.env.SLACK_WEBHOOK_URL, message);
        }
      } catch (error) {
        logger.error('Failed to send Slack alerts:', error);
      }
    }
  }
};

// Enhanced performance monitoring with alerting
const startAdvancedMonitoring = () => {
  const monitoringInterval = setInterval(async() => {
    try {
      // Check for alerts
      const alerts = await advancedMonitoring.alerts.checkAlerts();
      await advancedMonitoring.alerts.sendAlerts(alerts);

      // Log comprehensive health status
      const health = await advancedMonitoring.healthChecks.getOverallHealth();
      logger.info('System health check:', health);

    } catch (error) {
      logger.error('Advanced monitoring error:', error);
    }
  }, 60000); // Check every minute

  return () => clearInterval(monitoringInterval);
};

// Export enhanced performance utilities
module.exports = {
  initRedis,
  cache,
  cacheMiddleware,
  queryOptimizer,
  performanceMonitor,
  rateLimiter,
  initPerformanceMonitoring,
  // Enhanced features
  CACHE_TTL_STRATEGIES,
  getSmartTTL,
  advancedMonitoring,
  startAdvancedMonitoring,
  // Memory management
  memoryManager
};
