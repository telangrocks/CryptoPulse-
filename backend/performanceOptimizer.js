/**
 * Performance Optimization System
 * Advanced caching, connection pooling, and performance monitoring
 */

const redis = require('redis');
const { logger } = require('./structuredLogger');
const { getEnhancedMonitoring } = require('./enhancedMonitoring');

class PerformanceOptimizer {
  constructor() {
    this.monitoring = getEnhancedMonitoring();
    this.cacheStrategies = new Map();
    this.connectionPools = new Map();
    this.performanceBudgets = new Map();
    this.initializeCaching();
    this.initializeConnectionPools();
    this.setupPerformanceMonitoring();
  }

  // Advanced Caching System
  initializeCaching() {
    this.cacheStrategies = new Map([
      ['market_data', {
        ttl: 1000, // 1 second
        maxSize: 10000,
        strategy: 'write_through',
        warming: true
      }],
      ['user_sessions', {
        ttl: 3600000, // 1 hour
        maxSize: 100000,
        strategy: 'write_behind',
        warming: false
      }],
      ['trading_history', {
        ttl: 300000, // 5 minutes
        maxSize: 50000,
        strategy: 'write_around',
        warming: true
      }],
      ['portfolio_data', {
        ttl: 60000, // 1 minute
        maxSize: 25000,
        strategy: 'write_through',
        warming: true
      }],
      ['api_responses', {
        ttl: 30000, // 30 seconds
        maxSize: 15000,
        strategy: 'write_around',
        warming: false
      }]
    ]);

    this.cacheLayers = {
      l1: new Map(), // In-memory cache
      l2: null, // Redis cache (initialized separately)
      l3: new Map() // Disk cache (for large objects)
    };

    this.cacheMetrics = {
      hits: 0,
      misses: 0,
      evictions: 0,
      warming: 0
    };

    this.startCacheWarming();
  }

  // Multi-layer caching with intelligent strategies
  async get(key, cacheType = 'market_data') {
    const strategy = this.cacheStrategies.get(cacheType);
    if (!strategy) {
      throw new Error(`Unknown cache type: ${cacheType}`);
    }

    // L1 Cache (In-memory)
    if (this.cacheLayers.l1.has(key)) {
      this.cacheMetrics.hits++;
      const value = this.cacheLayers.l1.get(key);
      
      // Check TTL
      if (this.isExpired(value, strategy.ttl)) {
        this.cacheLayers.l1.delete(key);
        this.cacheMetrics.evictions++;
      } else {
        return value.data;
      }
    }

    // L2 Cache (Redis)
    if (this.cacheLayers.l2) {
      try {
        const value = await this.cacheLayers.l2.get(key);
        if (value) {
          this.cacheMetrics.hits++;
          const parsedValue = JSON.parse(value);
          
          // Store in L1 cache
          this.setL1Cache(key, parsedValue, strategy.ttl);
          return parsedValue;
        }
      } catch (error) {
        logger.warn('L2 cache read failed', {
          type: 'cache_error',
          layer: 'l2',
          key,
          error: error.message
        });
      }
    }

    // Cache miss
    this.cacheMetrics.misses++;
    return null;
  }

  async set(key, value, cacheType = 'market_data', options = {}) {
    const strategy = this.cacheStrategies.get(cacheType);
    if (!strategy) {
      throw new Error(`Unknown cache type: ${cacheType}`);
    }

    const { ttl = strategy.ttl, warming = false } = options;
    const cacheValue = {
      data: value,
      timestamp: Date.now(),
      ttl,
      warming
    };

    try {
      switch (strategy.strategy) {
        case 'write_through':
          await this.writeThrough(key, cacheValue, strategy);
          break;
        case 'write_behind':
          this.writeBehind(key, cacheValue, strategy);
          break;
        case 'write_around':
          await this.writeAround(key, cacheValue, strategy);
          break;
        default:
          await this.writeThrough(key, cacheValue, strategy);
      }

      logger.debug('Cache set successful', {
        type: 'cache_set',
        key,
        cacheType,
        strategy: strategy.strategy,
        ttl
      });

    } catch (error) {
      logger.error('Cache set failed', {
        type: 'cache_error',
        key,
        cacheType,
        error: error.message
      });
      throw error;
    }
  }

  // Write-through cache strategy
  async writeThrough(key, value, strategy) {
    // Write to all cache layers
    this.setL1Cache(key, value, value.ttl);
    
    if (this.cacheLayers.l2) {
      await this.cacheLayers.l2.setex(key, Math.ceil(value.ttl / 1000), JSON.stringify(value.data));
    }
  }

  // Write-behind cache strategy
  writeBehind(key, value, strategy) {
    // Write to L1 immediately
    this.setL1Cache(key, value, value.ttl);
    
    // Queue for L2 write
    this.queueL2Write(key, value, strategy);
  }

  // Write-around cache strategy
  async writeAround(key, value, strategy) {
    // Write directly to L2, bypass L1
    if (this.cacheLayers.l2) {
      await this.cacheLayers.l2.setex(key, Math.ceil(value.ttl / 1000), JSON.stringify(value.data));
    }
  }

  setL1Cache(key, value, ttl) {
    // Check cache size limits
    if (this.cacheLayers.l1.size >= 100000) { // Max L1 cache size
      this.evictL1Cache();
    }

    this.cacheLayers.l1.set(key, value);
  }

  evictL1Cache() {
    // LRU eviction
    const keys = Array.from(this.cacheLayers.l1.keys());
    const keysToEvict = keys.slice(0, Math.ceil(keys.length * 0.1)); // Evict 10%
    
    keysToEvict.forEach(key => {
      this.cacheLayers.l1.delete(key);
      this.cacheMetrics.evictions++;
    });
  }

  queueL2Write(key, value, strategy) {
    // Implementation would queue writes for batch processing
    setImmediate(async () => {
      try {
        if (this.cacheLayers.l2) {
          await this.cacheLayers.l2.setex(key, Math.ceil(value.ttl / 1000), JSON.stringify(value.data));
        }
      } catch (error) {
        logger.error('Queued L2 write failed', {
          type: 'cache_error',
          key,
          error: error.message
        });
      }
    });
  }

  isExpired(value, ttl) {
    return Date.now() - value.timestamp > ttl;
  }

  // Cache warming strategies
  startCacheWarming() {
    setInterval(async () => {
      try {
        await this.warmCache();
      } catch (error) {
        logger.error('Cache warming failed', {
          type: 'cache_warming',
          error: error.message
        });
      }
    }, 60000); // Warm cache every minute
  }

  async warmCache() {
    const warmingTasks = [];

    for (const [cacheType, strategy] of this.cacheStrategies.entries()) {
      if (strategy.warming) {
        warmingTasks.push(this.warmCacheType(cacheType, strategy));
      }
    }

    await Promise.all(warmingTasks);
  }

  async warmCacheType(cacheType, strategy) {
    try {
      switch (cacheType) {
        case 'market_data':
          await this.warmMarketDataCache();
          break;
        case 'trading_history':
          await this.warmTradingHistoryCache();
          break;
        case 'portfolio_data':
          await this.warmPortfolioDataCache();
          break;
      }
      
      this.cacheMetrics.warming++;
      
    } catch (error) {
      logger.error(`Cache warming failed for ${cacheType}`, {
        type: 'cache_warming',
        cacheType,
        error: error.message
      });
    }
  }

  async warmMarketDataCache() {
    // Warm frequently accessed market data
    const symbols = ['BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'ADA/USDT', 'SOL/USDT'];
    
    for (const symbol of symbols) {
      try {
        const marketData = await this.fetchMarketData(symbol);
        await this.set(`market_data:${symbol}`, marketData, 'market_data');
      } catch (error) {
        logger.warn(`Failed to warm market data for ${symbol}`, {
          type: 'cache_warming',
          symbol,
          error: error.message
        });
      }
    }
  }

  async warmTradingHistoryCache() {
    // Warm recent trading history for active users
    const activeUsers = await this.getActiveUsers();
    
    for (const userId of activeUsers.slice(0, 100)) { // Limit to top 100 users
      try {
        const tradingHistory = await this.fetchTradingHistory(userId, 50); // Last 50 trades
        await this.set(`trading_history:${userId}`, tradingHistory, 'trading_history');
      } catch (error) {
        logger.warn(`Failed to warm trading history for user ${userId}`, {
          type: 'cache_warming',
          userId,
          error: error.message
        });
      }
    }
  }

  async warmPortfolioDataCache() {
    // Warm portfolio data for active users
    const activeUsers = await this.getActiveUsers();
    
    for (const userId of activeUsers.slice(0, 50)) { // Limit to top 50 users
      try {
        const portfolioData = await this.fetchPortfolioData(userId);
        await this.set(`portfolio_data:${userId}`, portfolioData, 'portfolio_data');
      } catch (error) {
        logger.warn(`Failed to warm portfolio data for user ${userId}`, {
          type: 'cache_warming',
          userId,
          error: error.message
        });
      }
    }
  }

  // Connection Pool Management
  initializeConnectionPools() {
    this.connectionPools = new Map([
      ['database', {
        min: 5,
        max: 50,
        idle: 10000,
        acquire: 30000,
        evict: 60000
      }],
      ['redis', {
        min: 2,
        max: 20,
        idle: 10000,
        acquire: 30000,
        evict: 60000
      }],
      ['external_apis', {
        min: 3,
        max: 30,
        idle: 5000,
        acquire: 15000,
        evict: 30000
      }]
    ]);

    this.startConnectionPoolMonitoring();
  }

  startConnectionPoolMonitoring() {
    setInterval(async () => {
      try {
        await this.monitorConnectionPools();
      } catch (error) {
        logger.error('Connection pool monitoring failed', {
          type: 'connection_pool',
          error: error.message
        });
      }
    }, 30000); // Monitor every 30 seconds
  }

  async monitorConnectionPools() {
    for (const [poolName, pool] of this.connectionPools.entries()) {
      try {
        const stats = await this.getConnectionPoolStats(poolName);
        
        this.monitoring.systemHealth.databaseConnections.set(
          { state: 'active' }, 
          stats.active
        );
        
        this.monitoring.systemHealth.databaseConnections.set(
          { state: 'idle' }, 
          stats.idle
        );

        // Alert if pool is near capacity
        if (stats.active > pool.max * 0.9) {
          logger.warn('Connection pool near capacity', {
            type: 'connection_pool',
            pool: poolName,
            active: stats.active,
            max: pool.max
          });
        }

      } catch (error) {
        logger.error(`Failed to monitor connection pool ${poolName}`, {
          type: 'connection_pool',
          pool: poolName,
          error: error.message
        });
      }
    }
  }

  async getConnectionPoolStats(poolName) {
    // Implementation would return actual pool statistics
    // For now, return mock data
    return {
      active: Math.floor(Math.random() * 20) + 5,
      idle: Math.floor(Math.random() * 10) + 2,
      total: Math.floor(Math.random() * 30) + 10
    };
  }

  // Performance Budget Monitoring
  setupPerformanceMonitoring() {
    this.performanceBudgets = new Map([
      ['response_time', { max: 2000, warning: 1000 }], // 2s max, 1s warning
      ['memory_usage', { max: 80, warning: 70 }], // 80% max, 70% warning
      ['cpu_usage', { max: 85, warning: 75 }], // 85% max, 75% warning
      ['cache_hit_rate', { min: 80, warning: 85 }], // 80% min, 85% warning
      ['database_connections', { max: 40, warning: 30 }], // 40 max, 30 warning
      ['error_rate', { max: 1, warning: 0.5 }] // 1% max, 0.5% warning
    ]);

    this.startPerformanceBudgetMonitoring();
  }

  startPerformanceBudgetMonitoring() {
    setInterval(async () => {
      try {
        await this.checkPerformanceBudgets();
      } catch (error) {
        logger.error('Performance budget monitoring failed', {
          type: 'performance_budget',
          error: error.message
        });
      }
    }, 60000); // Check every minute
  }

  async checkPerformanceBudgets() {
    const metrics = await this.collectPerformanceMetrics();

    for (const [metric, budget] of this.performanceBudgets.entries()) {
      const currentValue = metrics[metric];
      
      if (currentValue !== undefined) {
        if (budget.max && currentValue > budget.max) {
          logger.error('Performance budget exceeded', {
            type: 'performance_budget',
            metric,
            current: currentValue,
            budget: budget.max,
            severity: 'critical'
          });
        } else if (budget.warning && currentValue > budget.warning) {
          logger.warn('Performance budget warning', {
            type: 'performance_budget',
            metric,
            current: currentValue,
            budget: budget.warning,
            severity: 'warning'
          });
        } else if (budget.min && currentValue < budget.min) {
          logger.warn('Performance budget below minimum', {
            type: 'performance_budget',
            metric,
            current: currentValue,
            budget: budget.min,
            severity: 'warning'
          });
        }
      }
    }
  }

  async collectPerformanceMetrics() {
    const metrics = {};

    // Response time
    metrics.response_time = await this.getAverageResponseTime();

    // Memory usage
    const memoryUsage = process.memoryUsage();
    metrics.memory_usage = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;

    // CPU usage
    metrics.cpu_usage = await this.getCPUUsage();

    // Cache hit rate
    const totalRequests = this.cacheMetrics.hits + this.cacheMetrics.misses;
    metrics.cache_hit_rate = totalRequests > 0 ? (this.cacheMetrics.hits / totalRequests) * 100 : 0;

    // Database connections
    const dbStats = await this.getConnectionPoolStats('database');
    metrics.database_connections = dbStats.active;

    // Error rate
    metrics.error_rate = await this.getErrorRate();

    return metrics;
  }

  async getAverageResponseTime() {
    // Implementation would calculate average response time
    return Math.random() * 3000; // Mock data
  }

  async getCPUUsage() {
    // Implementation would get actual CPU usage
    return Math.random() * 100; // Mock data
  }

  async getErrorRate() {
    // Implementation would calculate error rate
    return Math.random() * 5; // Mock data
  }

  // Lazy Loading Implementation
  async lazyLoad(resource, loader, cacheType = 'api_responses', ttl = 30000) {
    const cacheKey = `lazy_load:${resource}`;
    
    // Try to get from cache first
    const cached = await this.get(cacheKey, cacheType);
    if (cached) {
      return cached;
    }

    // Load resource
    const startTime = Date.now();
    try {
      const data = await loader();
      const loadTime = Date.now() - startTime;
      
      // Cache the result
      await this.set(cacheKey, data, cacheType, { ttl });
      
      logger.info('Lazy load completed', {
        type: 'lazy_load',
        resource,
        loadTime,
        cacheType
      });
      
      return data;
      
    } catch (error) {
      logger.error('Lazy load failed', {
        type: 'lazy_load',
        resource,
        error: error.message
      });
      throw error;
    }
  }

  // Code Splitting Implementation
  async loadModule(moduleName, condition) {
    if (condition()) {
      try {
        const startTime = Date.now();
        const module = await import(moduleName);
        const loadTime = Date.now() - startTime;
        
        logger.info('Module loaded', {
          type: 'code_splitting',
          module: moduleName,
          loadTime
        });
        
        return module;
      } catch (error) {
        logger.error('Module load failed', {
          type: 'code_splitting',
          module: moduleName,
          error: error.message
        });
        throw error;
      }
    }
    return null;
  }

  // Cache statistics
  getCacheStats() {
    return {
      metrics: this.cacheMetrics,
      layers: {
        l1: {
          size: this.cacheLayers.l1.size,
          maxSize: 100000
        },
        l2: {
          size: this.cacheLayers.l2 ? 'unknown' : 0,
          connected: !!this.cacheLayers.l2
        }
      },
      strategies: Array.from(this.cacheStrategies.entries()).map(([type, strategy]) => ({
        type,
        ...strategy
      }))
    };
  }

  // Initialize Redis connection
  async initializeRedis() {
    try {
      this.cacheLayers.l2 = redis.createClient({
        url: process.env.REDIS_URL,
        password: process.env.REDIS_PASSWORD
      });

      await this.cacheLayers.l2.connect();
      
      logger.info('Redis cache layer initialized', {
        type: 'cache_initialization',
        layer: 'l2'
      });
      
    } catch (error) {
      logger.error('Failed to initialize Redis cache layer', {
        type: 'cache_initialization',
        layer: 'l2',
        error: error.message
      });
      this.cacheLayers.l2 = null;
    }
  }

  // Mock data methods (would be replaced with actual implementations)
  async fetchMarketData(symbol) {
    return {
      symbol,
      price: Math.random() * 100000,
      timestamp: Date.now()
    };
  }

  async fetchTradingHistory(userId, limit) {
    return Array.from({ length: limit }, (_, i) => ({
      id: `trade_${userId}_${i}`,
      symbol: 'BTC/USDT',
      side: i % 2 === 0 ? 'BUY' : 'SELL',
      quantity: Math.random() * 1,
      price: Math.random() * 100000,
      timestamp: Date.now() - (i * 60000)
    }));
  }

  async fetchPortfolioData(userId) {
    return {
      userId,
      totalValue: Math.random() * 100000,
      holdings: [
        { symbol: 'BTC', quantity: Math.random() * 1, value: Math.random() * 50000 },
        { symbol: 'ETH', quantity: Math.random() * 10, value: Math.random() * 30000 }
      ]
    };
  }

  async getActiveUsers() {
    return Array.from({ length: 150 }, (_, i) => `user_${i}`);
  }
}

// Create singleton instance
let performanceOptimizerInstance;

function getPerformanceOptimizer() {
  if (!performanceOptimizerInstance) {
    performanceOptimizerInstance = new PerformanceOptimizer();
  }
  return performanceOptimizerInstance;
}

module.exports = { PerformanceOptimizer, getPerformanceOptimizer };
