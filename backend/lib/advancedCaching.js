// =============================================================================
// Advanced Caching System - Production Ready
// =============================================================================
// Multi-tier caching with intelligent invalidation and optimization strategies

const NodeCache = require('node-cache');
const Redis = require('redis');
const crypto = require('crypto');
const logger = require('./logging');

// Advanced caching strategies
const CACHE_STRATEGIES = {
  // Write-through: Write to cache and database simultaneously
  WRITE_THROUGH: 'write_through',
  
  // Write-behind: Write to cache immediately, database asynchronously
  WRITE_BEHIND: 'write_behind',
  
  // Write-around: Write directly to database, bypassing cache
  WRITE_AROUND: 'write_around',
  
  // Cache-aside: Application manages cache manually
  CACHE_ASIDE: 'cache_aside',
  
  // Read-through: Cache loads data from database on miss
  READ_THROUGH: 'read_through'
};

// Cache eviction policies
const EVICTION_POLICIES = {
  LRU: 'lru',           // Least Recently Used
  LFU: 'lfu',           // Least Frequently Used
  FIFO: 'fifo',         // First In, First Out
  TTL: 'ttl',           // Time To Live
  RANDOM: 'random'      // Random eviction
};

// Advanced cache configuration
const cacheConfig = {
  // Memory cache configuration
  memory: {
    stdTTL: 300, // 5 minutes default
    checkperiod: 30,
    useClones: false,
    maxKeys: 50000, // Increased for production
    deleteOnExpire: true,
    forceString: false,
    maxMemoryUsage: 500 * 1024 * 1024, // 500MB
    checkOnExpire: true,
    enableLegacyCallbacks: false,
    maxAge: 3600000, // 1 hour max age
    memoryPressureThreshold: 0.85,
    aggressiveCleanup: true
  },
  
  // Redis configuration
  redis: {
    connectTimeout: 10000,
    commandTimeout: 5000,
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3,
    lazyConnect: true,
    keepAlive: 30000,
    family: 4,
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    }
  },
  
  // Cache warming configuration
  warming: {
    batchSize: 50,
    concurrency: 5,
    delayBetweenBatches: 100,
    maxRetries: 3
  },
  
  // Invalidation configuration
  invalidation: {
    batchSize: 100,
    delay: 50,
    maxRetries: 3,
    exponentialBackoff: true
  }
};

// Multi-tier cache implementation
class AdvancedCache {
  constructor(options = {}) {
    this.config = { ...cacheConfig, ...options };
    this.memoryCache = null;
    this.redisClient = null;
    this.strategies = new Map();
    this.metrics = {
      hits: 0,
      misses: 0,
      memoryHits: 0,
      redisHits: 0,
      errors: 0,
      evictions: 0,
      size: 0
    };
    this.warmingQueue = [];
    this.invalidationQueue = [];
    this.isInitialized = false;
  }

  // Initialize cache system
  async initialize() {
    try {
      // Initialize memory cache
      this.memoryCache = new NodeCache(this.config.memory);
      
      // Initialize Redis if available
      if (process.env.REDIS_URL) {
        await this.initializeRedis();
      }
      
      // Setup cache event handlers
      this.setupEventHandlers();
      
      // Start background processes
      this.startBackgroundProcesses();
      
      this.isInitialized = true;
      logger.info('✅ Advanced cache system initialized');
      
    } catch (error) {
      logger.error('❌ Failed to initialize advanced cache system:', error);
      throw error;
    }
  }

  // Initialize Redis connection
  async initializeRedis() {
    try {
      this.redisClient = Redis.createClient({
        url: process.env.REDIS_URL,
        socket: this.config.redis
      });

      this.redisClient.on('error', (err) => {
        logger.error('Redis Client Error:', err);
        this.metrics.errors++;
      });

      this.redisClient.on('connect', () => {
        logger.info('Redis client connecting...');
      });

      this.redisClient.on('ready', () => {
        logger.info('Redis client ready');
      });

      await this.redisClient.connect();
      logger.info('✅ Redis connected successfully');
      
    } catch (error) {
      logger.warn('⚠️ Redis connection failed, using memory cache only:', error.message);
      this.redisClient = null;
    }
  }

  // Setup cache event handlers
  setupEventHandlers() {
    // Memory cache events
    this.memoryCache.on('set', (key, value) => {
      this.metrics.size++;
      logger.debug(`Cache set: ${key}`);
    });

    this.memoryCache.on('del', (key, value) => {
      this.metrics.size--;
      logger.debug(`Cache delete: ${key}`);
    });

    this.memoryCache.on('expired', (key, value) => {
      this.metrics.evictions++;
      logger.debug(`Cache expired: ${key}`);
    });

    // Graceful shutdown
    process.on('SIGINT', () => this.shutdown());
    process.on('SIGTERM', () => this.shutdown());
  }

  // Start background processes
  startBackgroundProcesses() {
    // Cache warming process
    setInterval(async () => {
      await this.processWarmingQueue();
    }, 1000);

    // Cache invalidation process
    setInterval(async () => {
      await this.processInvalidationQueue();
    }, 500);

    // Metrics collection
    setInterval(() => {
      this.collectMetrics();
    }, 60000); // Every minute

    // Memory cleanup
    setInterval(() => {
      this.performMemoryCleanup();
    }, 30000); // Every 30 seconds
  }

  // Smart cache key generation
  generateCacheKey(prefix, params = {}, options = {}) {
    const { version = 'v1', hash = true } = options;
    
    // Create base key
    let key = `${prefix}:${version}`;
    
    // Add parameters
    if (Object.keys(params).length > 0) {
      const paramString = JSON.stringify(params, Object.keys(params).sort());
      if (hash) {
        const hashString = crypto.createHash('sha256').update(paramString).digest('hex').substring(0, 16);
        key += `:${hashString}`;
      } else {
        key += `:${paramString}`;
      }
    }
    
    return key;
  }

  // Get value from cache with fallback strategies
  async get(key, options = {}) {
    if (!this.isInitialized) {
      throw new Error('Cache not initialized');
    }

    const { strategy = CACHE_STRATEGIES.CACHE_ASIDE, fallback = null, ttl = null } = options;
    
    try {
      // Try memory cache first
      const memoryValue = this.memoryCache.get(key);
      if (memoryValue !== undefined) {
        this.metrics.hits++;
        this.metrics.memoryHits++;
        return memoryValue;
      }

      // Try Redis cache
      if (this.redisClient) {
        try {
          const redisValue = await this.redisClient.get(key);
          if (redisValue) {
            const parsedValue = JSON.parse(redisValue);
            
            // Store in memory cache with smart TTL
            const smartTTL = this.getSmartTTL(key, ttl);
            this.memoryCache.set(key, parsedValue, smartTTL);
            
            this.metrics.hits++;
            this.metrics.redisHits++;
            return parsedValue;
          }
        } catch (redisError) {
          logger.error('Redis get error:', redisError);
          this.metrics.errors++;
        }
      }

      // Cache miss
      this.metrics.misses++;
      
      // Apply fallback strategy
      if (strategy === CACHE_STRATEGIES.READ_THROUGH && fallback) {
        const value = await fallback();
        await this.set(key, value, { ttl });
        return value;
      }
      
      return null;
      
    } catch (error) {
      logger.error('Cache get error:', error);
      this.metrics.errors++;
      return null;
    }
  }

  // Set value in cache with strategy
  async set(key, value, options = {}) {
    if (!this.isInitialized) {
      throw new Error('Cache not initialized');
    }

    const { 
      strategy = CACHE_STRATEGIES.WRITE_THROUGH, 
      ttl = null, 
      tags = [], 
      priority = 'normal',
      writeToDB = null 
    } = options;

    try {
      // Determine TTL
      const finalTTL = this.getSmartTTL(key, ttl);
      
      // Store in memory cache
      this.memoryCache.set(key, value, finalTTL);
      
      // Store in Redis cache
      if (this.redisClient) {
        try {
          await this.redisClient.setEx(key, finalTTL, JSON.stringify(value));
          
          // Store tags for invalidation
          if (tags.length > 0) {
            await this.setTags(key, tags);
          }
        } catch (redisError) {
          logger.error('Redis set error:', redisError);
          this.metrics.errors++;
        }
      }
      
      // Apply write strategy
      if (strategy === CACHE_STRATEGIES.WRITE_THROUGH && writeToDB) {
        await writeToDB(value);
      } else if (strategy === CACHE_STRATEGIES.WRITE_BEHIND && writeToDB) {
        // Queue for async write
        this.queueWriteBehind(key, value, writeToDB);
      }
      
      logger.debug(`Cache set: ${key} (TTL: ${finalTTL}s)`);
      
    } catch (error) {
      logger.error('Cache set error:', error);
      this.metrics.errors++;
    }
  }

  // Delete value from cache
  async del(key, options = {}) {
    if (!this.isInitialized) {
      throw new Error('Cache not initialized');
    }

    const { strategy = CACHE_STRATEGIES.WRITE_THROUGH, writeToDB = null } = options;

    try {
      // Remove from memory cache
      this.memoryCache.del(key);
      
      // Remove from Redis cache
      if (this.redisClient) {
        try {
          await this.redisClient.del(key);
          
          // Remove tags
          await this.removeTags(key);
        } catch (redisError) {
          logger.error('Redis del error:', redisError);
          this.metrics.errors++;
        }
      }
      
      // Apply write strategy
      if (strategy === CACHE_STRATEGIES.WRITE_THROUGH && writeToDB) {
        await writeToDB();
      }
      
      logger.debug(`Cache delete: ${key}`);
      
    } catch (error) {
      logger.error('Cache del error:', error);
      this.metrics.errors++;
    }
  }

  // Batch operations
  async mget(keys, options = {}) {
    if (!Array.isArray(keys) || keys.length === 0) {
      return {};
    }

    const results = {};
    const { strategy = CACHE_STRATEGIES.CACHE_ASIDE, fallback = null } = options;

    try {
      // Try memory cache first
      for (const key of keys) {
        const value = this.memoryCache.get(key);
        if (value !== undefined) {
          results[key] = value;
          this.metrics.hits++;
          this.metrics.memoryHits++;
        }
      }

      // Try Redis for remaining keys
      const remainingKeys = keys.filter(key => !(key in results));
      if (remainingKeys.length > 0 && this.redisClient) {
        try {
          const redisValues = await this.redisClient.mGet(remainingKeys);
          for (let i = 0; i < remainingKeys.length; i++) {
            const key = remainingKeys[i];
            const value = redisValues[i];
            if (value) {
              const parsedValue = JSON.parse(value);
              results[key] = parsedValue;
              
              // Store in memory cache
              const smartTTL = this.getSmartTTL(key);
              this.memoryCache.set(key, parsedValue, smartTTL);
              
              this.metrics.hits++;
              this.metrics.redisHits++;
            }
          }
        } catch (redisError) {
          logger.error('Redis mget error:', redisError);
          this.metrics.errors++;
        }
      }

      // Apply fallback for missing keys
      const missingKeys = keys.filter(key => !(key in results));
      if (missingKeys.length > 0 && fallback) {
        const fallbackResults = await fallback(missingKeys);
        Object.assign(results, fallbackResults);
        
        // Cache fallback results
        for (const [key, value] of Object.entries(fallbackResults)) {
          await this.set(key, value, options);
        }
      }

      // Record misses
      this.metrics.misses += missingKeys.length;

      return results;
      
    } catch (error) {
      logger.error('Cache mget error:', error);
      this.metrics.errors++;
      return {};
    }
  }

  async mset(keyValuePairs, options = {}) {
    if (!Array.isArray(keyValuePairs) || keyValuePairs.length === 0) {
      return;
    }

    try {
      // Set in memory cache
      for (const { key, value, ttl } of keyValuePairs) {
        const finalTTL = this.getSmartTTL(key, ttl);
        this.memoryCache.set(key, value, finalTTL);
      }

      // Set in Redis cache
      if (this.redisClient) {
        try {
          const redisPairs = keyValuePairs.map(({ key, value, ttl }) => {
            const finalTTL = this.getSmartTTL(key, ttl);
            return ['setEx', key, finalTTL, JSON.stringify(value)];
          });
          
          await Promise.all(redisPairs.map(([cmd, ...args]) => 
            this.redisClient[cmd](...args)
          ));
        } catch (redisError) {
          logger.error('Redis mset error:', redisError);
          this.metrics.errors++;
        }
      }

      logger.debug(`Cache mset: ${keyValuePairs.length} keys`);
      
    } catch (error) {
      logger.error('Cache mset error:', error);
      this.metrics.errors++;
    }
  }

  // Cache invalidation strategies
  async invalidateByPattern(pattern, options = {}) {
    const { regex = false, batchSize = this.config.invalidation.batchSize } = options;
    
    try {
      const keys = this.memoryCache.keys();
      let matchingKeys = [];
      
      if (regex) {
        const regexPattern = new RegExp(pattern);
        matchingKeys = keys.filter(key => regexPattern.test(key));
      } else {
        matchingKeys = keys.filter(key => key.includes(pattern));
      }

      // Process in batches
      for (let i = 0; i < matchingKeys.length; i += batchSize) {
        const batch = matchingKeys.slice(i, i + batchSize);
        
        // Remove from memory cache
        batch.forEach(key => this.memoryCache.del(key));
        
        // Remove from Redis cache
        if (this.redisClient && batch.length > 0) {
          try {
            await this.redisClient.del(batch);
          } catch (redisError) {
            logger.error('Redis batch delete error:', redisError);
            this.metrics.errors++;
          }
        }
        
        // Add delay between batches
        if (i + batchSize < matchingKeys.length) {
          await new Promise(resolve => setTimeout(resolve, this.config.invalidation.delay));
        }
      }

      logger.info(`Cache invalidation: ${matchingKeys.length} keys matching pattern '${pattern}'`);
      return { invalidated: matchingKeys.length, keys: matchingKeys };
      
    } catch (error) {
      logger.error('Cache invalidation error:', error);
      this.metrics.errors++;
      return { invalidated: 0, error: error.message };
    }
  }

  async invalidateByTag(tag, options = {}) {
    try {
      if (!this.redisClient) {
        logger.warn('Tag-based invalidation requires Redis');
        return { invalidated: 0, error: 'Redis not available' };
      }

      // Get keys for tag
      const tagKey = `tag:${tag}`;
      const keys = await this.redisClient.sMembers(tagKey);
      
      if (keys.length === 0) {
        return { invalidated: 0, keys: [] };
      }

      // Invalidate keys
      const result = await this.invalidateByPattern('', { 
        regex: false, 
        specificKeys: keys 
      });

      // Remove tag
      await this.redisClient.del(tagKey);
      
      logger.info(`Cache invalidation by tag: ${tag} - ${result.invalidated} keys`);
      return result;
      
    } catch (error) {
      logger.error('Tag invalidation error:', error);
      this.metrics.errors++;
      return { invalidated: 0, error: error.message };
    }
  }

  // Cache warming
  async warmCache(data, options = {}) {
    const { 
      strategy = 'batch', 
      concurrency = this.config.warming.concurrency,
      batchSize = this.config.warming.batchSize 
    } = options;

    if (!Array.isArray(data) || data.length === 0) {
      return { warmed: 0, errors: 0 };
    }

    let warmed = 0;
    let errors = 0;

    try {
      if (strategy === 'batch') {
        // Batch warming
        for (let i = 0; i < data.length; i += batchSize) {
          const batch = data.slice(i, i + batchSize);
          
          const batchPromises = batch.map(async (item) => {
            try {
              const { key, value, ttl, tags } = item;
              await this.set(key, value, { ttl, tags });
              return { success: true, key };
            } catch (error) {
              logger.error(`Cache warming error for key: ${item.key}`, error);
              return { success: false, key: item.key, error: error.message };
            }
          });

          const results = await Promise.all(batchPromises);
          
          for (const result of results) {
            if (result.success) {
              warmed++;
            } else {
              errors++;
            }
          }

          // Delay between batches
          if (i + batchSize < data.length) {
            await new Promise(resolve => 
              setTimeout(resolve, this.config.warming.delayBetweenBatches)
            );
          }
        }
      } else if (strategy === 'concurrent') {
        // Concurrent warming with limited concurrency
        const chunks = [];
        for (let i = 0; i < data.length; i += concurrency) {
          chunks.push(data.slice(i, i + concurrency));
        }

        for (const chunk of chunks) {
          const chunkPromises = chunk.map(async (item) => {
            try {
              const { key, value, ttl, tags } = item;
              await this.set(key, value, { ttl, tags });
              return { success: true, key };
            } catch (error) {
              logger.error(`Cache warming error for key: ${item.key}`, error);
              return { success: false, key: item.key, error: error.message };
            }
          });

          const results = await Promise.all(chunkPromises);
          
          for (const result of results) {
            if (result.success) {
              warmed++;
            } else {
              errors++;
            }
          }
        }
      }

      logger.info(`Cache warming completed: ${warmed} warmed, ${errors} errors`);
      return { warmed, errors, total: data.length };
      
    } catch (error) {
      logger.error('Cache warming error:', error);
      return { warmed, errors: errors + 1, total: data.length };
    }
  }

  // Smart TTL detection
  getSmartTTL(key, customTTL = null) {
    if (customTTL !== null) {
      return customTTL;
    }

    // Smart TTL based on key patterns
    if (key.includes(':user:')) return 3600; // 1 hour
    if (key.includes(':session:')) return 86400; // 24 hours
    if (key.includes(':market:')) return 30; // 30 seconds
    if (key.includes(':price:')) return 10; // 10 seconds
    if (key.includes(':order:')) return 60; // 1 minute
    if (key.includes(':balance:')) return 120; // 2 minutes
    if (key.includes(':config:')) return 86400; // 24 hours
    if (key.includes(':static:')) return 604800; // 7 days
    if (key.includes(':api:')) return 300; // 5 minutes
    if (key.includes(':auth:')) return 3600; // 1 hour

    // Default TTL
    return 300; // 5 minutes
  }

  // Tag management
  async setTags(key, tags) {
    if (!this.redisClient || !Array.isArray(tags) || tags.length === 0) {
      return;
    }

    try {
      for (const tag of tags) {
        const tagKey = `tag:${tag}`;
        await this.redisClient.sAdd(tagKey, key);
        await this.redisClient.expire(tagKey, 86400); // 24 hours
      }
    } catch (error) {
      logger.error('Set tags error:', error);
      this.metrics.errors++;
    }
  }

  async removeTags(key) {
    if (!this.redisClient) {
      return;
    }

    try {
      // Get all tags for this key
      const pattern = `tag:*`;
      const tagKeys = await this.redisClient.keys(pattern);
      
      for (const tagKey of tagKeys) {
        await this.redisClient.sRem(tagKey, key);
        
        // Remove tag if empty
        const count = await this.redisClient.sCard(tagKey);
        if (count === 0) {
          await this.redisClient.del(tagKey);
        }
      }
    } catch (error) {
      logger.error('Remove tags error:', error);
      this.metrics.errors++;
    }
  }

  // Background processes
  async processWarmingQueue() {
    if (this.warmingQueue.length === 0) {
      return;
    }

    const batch = this.warmingQueue.splice(0, this.config.warming.batchSize);
    
    for (const item of batch) {
      try {
        const { key, value, ttl, tags, retries = 0 } = item;
        await this.set(key, value, { ttl, tags });
      } catch (error) {
        logger.error('Warming queue processing error:', error);
        
        // Retry logic
        if (item.retries < this.config.warming.maxRetries) {
          item.retries++;
          this.warmingQueue.push(item);
        }
      }
    }
  }

  async processInvalidationQueue() {
    if (this.invalidationQueue.length === 0) {
      return;
    }

    const batch = this.invalidationQueue.splice(0, this.config.invalidation.batchSize);
    
    for (const item of batch) {
      try {
        const { pattern, options, retries = 0 } = item;
        await this.invalidateByPattern(pattern, options);
      } catch (error) {
        logger.error('Invalidation queue processing error:', error);
        
        // Retry logic
        if (item.retries < this.config.invalidation.maxRetries) {
          item.retries++;
          this.invalidationQueue.push(item);
        }
      }
    }
  }

  // Queue write-behind operations
  queueWriteBehind(key, value, writeToDB) {
    this.warmingQueue.push({
      key,
      value,
      writeToDB,
      timestamp: Date.now(),
      retries: 0
    });
  }

  // Memory cleanup
  performMemoryCleanup() {
    const stats = this.memoryCache.getStats();
    const memoryUsage = process.memoryUsage();
    const memoryRatio = memoryUsage.heapUsed / this.config.memory.maxMemoryUsage;

    if (memoryRatio > this.config.memory.memoryPressureThreshold) {
      // Aggressive cleanup
      const keys = this.memoryCache.keys();
      const keysToDelete = keys.slice(0, Math.floor(keys.length * 0.3));
      
      keysToDelete.forEach(key => this.memoryCache.del(key));
      
      logger.warn(`Memory cleanup: removed ${keysToDelete.length} cache keys`);
      this.metrics.evictions += keysToDelete.length;
    }
  }

  // Metrics collection
  collectMetrics() {
    const stats = this.memoryCache.getStats();
    const memoryUsage = process.memoryUsage();
    
    const metrics = {
      timestamp: new Date().toISOString(),
      memory: {
        keys: stats.keys || 0,
        hits: stats.hits || 0,
        misses: stats.misses || 0,
        hitRate: stats.hits && stats.misses ? 
          ((stats.hits / (stats.hits + stats.misses)) * 100).toFixed(2) + '%' : '0%'
      },
      redis: {
        connected: this.redisClient ? 'connected' : 'disconnected'
      },
      system: {
        hits: this.metrics.hits,
        misses: this.metrics.misses,
        errors: this.metrics.errors,
        evictions: this.metrics.evictions,
        size: this.metrics.size,
        hitRate: this.getHitRate()
      },
      memoryUsage: {
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        rss: Math.round(memoryUsage.rss / 1024 / 1024)
      }
    };

    logger.info('Cache metrics:', metrics);
    return metrics;
  }

  // Utility methods
  getHitRate() {
    const total = this.metrics.hits + this.metrics.misses;
    return total > 0 ? ((this.metrics.hits / total) * 100).toFixed(2) + '%' : '0%';
  }

  getStats() {
    return {
      initialized: this.isInitialized,
      memory: this.memoryCache.getStats(),
      redis: this.redisClient ? 'connected' : 'disconnected',
      metrics: this.metrics,
      hitRate: this.getHitRate(),
      queues: {
        warming: this.warmingQueue.length,
        invalidation: this.invalidationQueue.length
      }
    };
  }

  // Clear all cache
  async clear() {
    try {
      this.memoryCache.flushAll();
      
      if (this.redisClient) {
        await this.redisClient.flushAll();
      }
      
      this.metrics = {
        hits: 0,
        misses: 0,
        memoryHits: 0,
        redisHits: 0,
        errors: 0,
        evictions: 0,
        size: 0
      };
      
      logger.info('Cache cleared successfully');
      
    } catch (error) {
      logger.error('Cache clear error:', error);
      this.metrics.errors++;
    }
  }

  // Graceful shutdown
  async shutdown() {
    try {
      logger.info('Shutting down advanced cache system...');
      
      // Process remaining queues
      await this.processWarmingQueue();
      await this.processInvalidationQueue();
      
      // Close Redis connection
      if (this.redisClient) {
        await this.redisClient.quit();
      }
      
      // Clear memory cache
      this.memoryCache.close();
      
      logger.info('Advanced cache system shut down successfully');
      
    } catch (error) {
      logger.error('Cache shutdown error:', error);
    }
  }
}

// Export singleton instance
const advancedCache = new AdvancedCache();
module.exports = {
  advancedCache,
  AdvancedCache,
  CACHE_STRATEGIES,
  EVICTION_POLICIES,
  cacheConfig
};
