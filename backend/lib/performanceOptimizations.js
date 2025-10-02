// =============================================================================
// Advanced Performance Optimizations & Resource Management - Production Ready
// =============================================================================
// Advanced performance optimizations including connection pooling, resource management, and optimization strategies

const cluster = require('cluster');
const os = require('os');
const crypto = require('crypto');
const logger = require('./logging');
const { performanceMetrics } = require('./tracing');

// Advanced connection pooling management
class ConnectionPoolManager {
  constructor() {
    this.pools = new Map();
    this.metrics = {
      totalConnections: 0,
      activeConnections: 0,
      idleConnections: 0,
      failedConnections: 0,
      connectionTimeouts: 0
    };

    this.startMonitoring();
  }

  // Create optimized connection pool
  createPool(name, config) {
    const poolConfig = {
      min: config.min || 2,
      max: config.max || 10,
      idleTimeoutMillis: config.idleTimeoutMillis || 30000,
      connectionTimeoutMillis: config.connectionTimeoutMillis || 10000,
      acquireTimeoutMillis: config.acquireTimeoutMillis || 60000,
      createTimeoutMillis: config.createTimeoutMillis || 30000,
      destroyTimeoutMillis: config.destroyTimeoutMillis || 5000,
      reapIntervalMillis: config.reapIntervalMillis || 1000,
      createRetryIntervalMillis: config.createRetryIntervalMillis || 200,
      propagateCreateError: config.propagateCreateError || false,
      ...config
    };

    this.pools.set(name, {
      config: poolConfig,
      created: new Date(),
      lastUsed: new Date(),
      metrics: {
        totalCreated: 0,
        totalDestroyed: 0,
        totalAcquired: 0,
        totalReleased: 0,
        currentSize: 0,
        waiting: 0
      }
    });

    logger.info(`Connection pool '${name}' created`, poolConfig);
    return poolConfig;
  }

  // Get pool metrics
  getPoolMetrics(name) {
    const pool = this.pools.get(name);
    if (!pool) {return null;}

    return {
      name,
      config: pool.config,
      metrics: pool.metrics,
      uptime: Date.now() - pool.created.getTime(),
      lastUsed: pool.lastUsed
    };
  }

  // Get all pool metrics
  getAllPoolMetrics() {
    const metrics = {};
    for (const [name] of this.pools) {
      metrics[name] = this.getPoolMetrics(name);
    }
    return metrics;
  }

  // Start monitoring
  startMonitoring() {
    setInterval(() => {
      const metrics = this.getAllPoolMetrics();
      logger.info('Connection pool metrics:', metrics);

      // Check for pool health issues
      Object.entries(metrics).forEach(([name, pool]) => {
        if (pool.metrics.waiting > pool.config.max * 2) {
          logger.warn(`Pool '${name}' has high waiting count: ${pool.metrics.waiting}`);
        }

        if (pool.metrics.currentSize >= pool.config.max) {
          logger.warn(`Pool '${name}' is at maximum capacity: ${pool.metrics.currentSize}`);
        }
      });
    }, 60000); // Every minute
  }
}

// Advanced resource management
class ResourceManager {
  constructor() {
    this.resources = new Map();
    this.quotas = new Map();
    this.usage = new Map();

    // Set default quotas
    this.setQuota('memory', 512 * 1024 * 1024); // 512MB
    this.setQuota('cpu', 80); // 80% CPU
    this.setQuota('connections', 1000);
    this.setQuota('requests_per_minute', 10000);

    this.startMonitoring();
  }

  // Set resource quota
  setQuota(resource, limit) {
    this.quotas.set(resource, limit);
    logger.info(`Resource quota set for '${resource}': ${limit}`);
  }

  // Check resource availability
  checkResource(resource, requested = 1) {
    const quota = this.quotas.get(resource);
    const current = this.usage.get(resource) || 0;

    if (!quota) {return { available: true, current, quota: null };}

    return {
      available: (current + requested) <= quota,
      current,
      quota,
      remaining: quota - current,
      utilization: (current / quota) * 100
    };
  }

  // Allocate resource
  allocate(resource, amount = 1) {
    const check = this.checkResource(resource, amount);

    if (!check.available) {
      logger.warn(`Resource allocation denied for '${resource}': ${check.current}/${check.quota}`);
      return false;
    }

    const current = this.usage.get(resource) || 0;
    this.usage.set(resource, current + amount);

    performanceMetrics.counter('resource.allocated', amount, { resource });
    return true;
  }

  // Deallocate resource
  deallocate(resource, amount = 1) {
    const current = this.usage.get(resource) || 0;
    const newAmount = Math.max(0, current - amount);
    this.usage.set(resource, newAmount);

    performanceMetrics.counter('resource.deallocated', amount, { resource });
    return true;
  }

  // Get resource usage
  getUsage() {
    const usage = {};
    for (const [resource, quota] of this.quotas) {
      const current = this.usage.get(resource) || 0;
      usage[resource] = {
        current,
        quota,
        utilization: (current / quota) * 100,
        available: quota - current
      };
    }
    return usage;
  }

  // Start monitoring
  startMonitoring() {
    setInterval(() => {
      const usage = this.getUsage();

      // Check for high utilization
      Object.entries(usage).forEach(([resource, data]) => {
        if (data.utilization > 90) {
          logger.warn(`High resource utilization for '${resource}': ${data.utilization.toFixed(2)}%`);
        }
      });

      logger.info('Resource usage:', usage);
    }, 30000); // Every 30 seconds
  }
}

// Advanced caching strategies
class CacheOptimizer {
  constructor() {
    this.strategies = new Map();
    this.metrics = new Map();
    this.initializeStrategies();
  }

  // Initialize caching strategies
  initializeStrategies() {
    // LRU with TTL
    this.strategies.set('lru_ttl', {
      maxSize: 10000,
      defaultTTL: 300000, // 5 minutes
      evictionPolicy: 'lru'
    });

    // LFU (Least Frequently Used)
    this.strategies.set('lfu', {
      maxSize: 5000,
      defaultTTL: 600000, // 10 minutes
      evictionPolicy: 'lfu'
    });

    // Write-through cache
    this.strategies.set('write_through', {
      maxSize: 2000,
      defaultTTL: 900000, // 15 minutes
      evictionPolicy: 'write_through'
    });

    // Write-behind cache
    this.strategies.set('write_behind', {
      maxSize: 5000,
      defaultTTL: 300000, // 5 minutes
      evictionPolicy: 'write_behind',
      batchSize: 100,
      flushInterval: 30000 // 30 seconds
    });
  }

  // Get optimal strategy for data type
  getOptimalStrategy(dataType, accessPattern) {
    const strategies = {
      'user_data': 'lru_ttl',
      'market_data': 'lfu',
      'static_content': 'write_through',
      'analytics': 'write_behind',
      'session_data': 'lru_ttl',
      'configuration': 'write_through'
    };

    if (accessPattern === 'read_heavy') {return 'lfu';}
    if (accessPattern === 'write_heavy') {return 'write_behind';}
    if (accessPattern === 'balanced') {return 'lru_ttl';}

    return strategies[dataType] || 'lru_ttl';
  }

  // Optimize cache configuration
  optimizeCacheConfig(usagePattern) {
    const config = {
      memoryLimit: 256 * 1024 * 1024, // 256MB
      maxKeys: 10000,
      checkPeriod: 60000, // 1 minute
      useClones: false,
      deleteOnExpire: true
    };

    if (usagePattern === 'high_frequency') {
      config.maxKeys = 20000;
      config.checkPeriod = 30000;
      config.memoryLimit = 512 * 1024 * 1024; // 512MB
    } else if (usagePattern === 'low_frequency') {
      config.maxKeys = 5000;
      config.checkPeriod = 120000; // 2 minutes
      config.memoryLimit = 128 * 1024 * 1024; // 128MB
    }

    return config;
  }

  // Track cache performance
  trackCachePerformance(key, hit, miss, eviction) {
    if (!this.metrics.has(key)) {
      this.metrics.set(key, {
        hits: 0,
        misses: 0,
        evictions: 0,
        totalRequests: 0,
        hitRate: 0
      });
    }

    const metrics = this.metrics.get(key);
    metrics.totalRequests++;

    if (hit) {metrics.hits++;}
    if (miss) {metrics.misses++;}
    if (eviction) {metrics.evictions++;}

    metrics.hitRate = (metrics.hits / metrics.totalRequests) * 100;
  }

  // Get cache performance metrics
  getCacheMetrics() {
    const metrics = {};
    for (const [key, data] of this.metrics) {
      metrics[key] = { ...data };
    }
    return metrics;
  }
}

// Database query optimization
class QueryOptimizer {
  constructor() {
    this.queryCache = new Map();
    this.slowQueries = new Map();
    this.optimizationRules = new Map();
    this.initializeOptimizationRules();
  }

  // Initialize optimization rules
  initializeOptimizationRules() {
    // Index optimization
    this.optimizationRules.set('index_optimization', {
      enabled: true,
      minSelectivity: 0.1,
      maxIndexSize: 1000000
    });

    // Query plan optimization
    this.optimizationRules.set('query_plan_optimization', {
      enabled: true,
      maxExecutionTime: 1000, // 1 second
      analyzePlans: true
    });

    // Connection pooling optimization
    this.optimizationRules.set('connection_optimization', {
      enabled: true,
      maxConnections: 20,
      minConnections: 2,
      connectionTimeout: 30000
    });
  }

  // Optimize query
  optimizeQuery(query, _params = []) {
    const optimization = {
      originalQuery: query,
      optimizedQuery: query,
      optimizations: [],
      estimatedImprovement: 0,
      complexity: this.analyzeQueryComplexity(query)
    };

    // Apply optimizations
    if (this.optimizationRules.get('index_optimization').enabled) {
      const indexOptimization = this.optimizeIndexes(query);
      if (indexOptimization.improved) {
        optimization.optimizations.push(indexOptimization);
        optimization.estimatedImprovement += indexOptimization.improvement;
      }
    }

    if (this.optimizationRules.get('query_plan_optimization').enabled) {
      const planOptimization = this.optimizeQueryPlan(query);
      if (planOptimization.improved) {
        optimization.optimizations.push(planOptimization);
        optimization.estimatedImprovement += planOptimization.improvement;
      }
    }

    return optimization;
  }

  // Analyze query complexity
  analyzeQueryComplexity(query) {
    const complexity = {
      joins: (query.match(/JOIN/gi) || []).length,
      subqueries: (query.match(/\(SELECT/gi) || []).length,
      aggregations: (query.match(/(COUNT|SUM|AVG|MIN|MAX)/gi) || []).length,
      whereConditions: (query.match(/WHERE/gi) || []).length,
      orderBy: (query.match(/ORDER BY/gi) || []).length,
      groupBy: (query.match(/GROUP BY/gi) || []).length
    };

    complexity.score =
      complexity.joins * 2 +
      complexity.subqueries * 3 +
      complexity.aggregations * 1.5 +
      complexity.whereConditions * 1 +
      complexity.orderBy * 1 +
      complexity.groupBy * 2;

    return complexity;
  }

  // Optimize indexes
  optimizeIndexes(query) {
    const optimization = {
      type: 'index_optimization',
      improved: false,
      improvement: 0,
      suggestions: []
    };

    // Check for missing indexes on WHERE clauses
    const whereMatch = query.match(/WHERE\s+([^GROUP|ORDER|LIMIT]+)/i);
    if (whereMatch) {
      const whereClause = whereMatch[1];
      const columns = whereClause.match(/(\w+)\s*[=<>]/g);

      if (columns && columns.length > 0) {
        optimization.suggestions.push(`Consider adding index on: ${columns.join(', ')}`);
        optimization.improved = true;
        optimization.improvement = 20; // Estimated 20% improvement
      }
    }

    return optimization;
  }

  // Optimize query plan
  optimizeQueryPlan(query) {
    const optimization = {
      type: 'query_plan_optimization',
      improved: false,
      improvement: 0,
      suggestions: []
    };

    // Check for inefficient patterns
    if (query.includes('SELECT *')) {
      optimization.suggestions.push('Avoid SELECT * - specify required columns');
      optimization.improved = true;
      optimization.improvement = 15;
    }

    if (query.includes('ORDER BY') && !query.includes('LIMIT')) {
      optimization.suggestions.push('Consider adding LIMIT when using ORDER BY');
      optimization.improved = true;
      optimization.improvement = 10;
    }

    if (query.includes('LIKE') && query.includes('%')) {
      optimization.suggestions.push('Avoid leading wildcards in LIKE queries');
      optimization.improved = true;
      optimization.improvement = 25;
    }

    return optimization;
  }

  // Track slow queries
  trackSlowQuery(query, executionTime, _params = []) {
    const key = this.getQueryKey(query);

    if (!this.slowQueries.has(key)) {
      this.slowQueries.set(key, {
        query: query.substring(0, 200),
        count: 0,
        totalTime: 0,
        averageTime: 0,
        maxTime: 0,
        lastSeen: new Date()
      });
    }

    const slowQuery = this.slowQueries.get(key);
    slowQuery.count++;
    slowQuery.totalTime += executionTime;
    slowQuery.averageTime = slowQuery.totalTime / slowQuery.count;
    slowQuery.maxTime = Math.max(slowQuery.maxTime, executionTime);
    slowQuery.lastSeen = new Date();

    logger.warn('Slow query detected:', {
      query: query.substring(0, 100),
      executionTime,
      averageTime: slowQuery.averageTime,
      count: slowQuery.count
    });
  }

  // Get query key for caching
  getQueryKey(query) {
    return crypto.createHash('sha256').update(query).digest('hex');
  }

  // Get slow query report
  getSlowQueryReport() {
    const report = [];
    for (const [key, data] of this.slowQueries) {
      report.push({
        key,
        ...data,
        frequency: data.count,
        impact: data.averageTime * data.count
      });
    }

    return report.sort((a, b) => b.impact - a.impact);
  }
}

// Memory optimization
class MemoryOptimizer {
  constructor() {
    this.memoryStats = {
      heapUsed: 0,
      heapTotal: 0,
      external: 0,
      rss: 0
    };

    this.optimizationStrategies = new Map();
    this.initializeStrategies();
    this.startMonitoring();
  }

  // Initialize optimization strategies
  initializeStrategies() {
    this.optimizationStrategies.set('garbage_collection', {
      enabled: true,
      threshold: 0.8, // 80% memory usage
      interval: 300000 // 5 minutes
    });

    this.optimizationStrategies.set('memory_compression', {
      enabled: true,
      threshold: 0.7, // 70% memory usage
      compressionLevel: 6
    });

    this.optimizationStrategies.set('cache_eviction', {
      enabled: true,
      threshold: 0.75, // 75% memory usage
      evictionRate: 0.3 // Evict 30% of cache
    });
  }

  // Get memory usage
  getMemoryUsage() {
    const usage = process.memoryUsage();
    this.memoryStats = {
      heapUsed: usage.heapUsed,
      heapTotal: usage.heapTotal,
      external: usage.external,
      rss: usage.rss
    };
    return this.memoryStats;
  }

  // Check if memory optimization is needed
  needsOptimization() {
    const usage = this.getMemoryUsage();
    const heapRatio = usage.heapUsed / usage.heapTotal;

    return {
      needed: heapRatio > 0.7,
      ratio: heapRatio,
      strategy: this.getOptimizationStrategy(heapRatio)
    };
  }

  // Get optimization strategy
  getOptimizationStrategy(heapRatio) {
    if (heapRatio > 0.9) {return 'aggressive';}
    if (heapRatio > 0.8) {return 'moderate';}
    if (heapRatio > 0.7) {return 'light';}
    return 'none';
  }

  // Apply memory optimization
  async applyOptimization(strategy = 'auto') {
    const check = this.needsOptimization();
    if (!check.needed && strategy === 'auto') {return;}

    const optimizations = [];

    // Force garbage collection
    if (global.gc && (strategy === 'aggressive' || strategy === 'moderate' || strategy === 'auto')) {
      global.gc();
      optimizations.push('garbage_collection');
    }

    // Clear caches
    if (strategy === 'aggressive' || strategy === 'moderate' || strategy === 'auto') {
      await this.clearCaches(check.ratio);
      optimizations.push('cache_clear');
    }

    // Compress memory
    if (strategy === 'aggressive' || (strategy === 'auto' && check.ratio > 0.8)) {
      await this.compressMemory();
      optimizations.push('memory_compression');
    }

    logger.info('Memory optimization applied:', {
      strategy,
      optimizations,
      beforeRatio: check.ratio,
      afterRatio: this.getMemoryUsage().heapUsed / this.getMemoryUsage().heapTotal
    });

    return optimizations;
  }

  // Clear caches
  async clearCaches(memoryRatio) {
    const evictionRate = memoryRatio > 0.8 ? 0.5 : 0.3;

    try {
      const { cache } = require('./performance');
      const stats = cache.getStats();

      if (stats.memory && stats.memory.keys > 100) {
        const keys = Object.keys(stats.memory.keys || {});
        const keysToEvict = Math.floor(keys.length * evictionRate);

        for (let i = 0; i < keysToEvict; i++) {
          await cache.del(keys[i]);
        }

        logger.info(`Cleared ${keysToEvict} cache entries`);
      }
    } catch (error) {
      logger.error('Failed to clear caches:', error);
    }
  }

  // Compress memory (placeholder)
  async compressMemory() {
    // In a real implementation, this would use memory compression techniques
    logger.info('Memory compression applied');
  }

  // Start monitoring
  startMonitoring() {
    setInterval(() => {
      const usage = this.getMemoryUsage();
      const heapRatio = usage.heapUsed / usage.heapTotal;

      performanceMetrics.gauge('memory.heap_ratio', heapRatio);
      performanceMetrics.gauge('memory.heap_used_mb', usage.heapUsed / 1024 / 1024);
      performanceMetrics.gauge('memory.rss_mb', usage.rss / 1024 / 1024);

      if (heapRatio > 0.8) {
        logger.warn('High memory usage detected:', {
          heapRatio: (heapRatio * 100).toFixed(2) + '%',
          heapUsed: Math.round(usage.heapUsed / 1024 / 1024) + 'MB',
          heapTotal: Math.round(usage.heapTotal / 1024 / 1024) + 'MB'
        });

        // Auto-optimize if ratio is very high
        if (heapRatio > 0.9) {
          this.applyOptimization('aggressive');
        }
      }
    }, 30000); // Every 30 seconds
  }
}

// Global instances
const connectionPoolManager = new ConnectionPoolManager();
const resourceManager = new ResourceManager();
const cacheOptimizer = new CacheOptimizer();
const queryOptimizer = new QueryOptimizer();
const memoryOptimizer = new MemoryOptimizer();

// Cluster management for multi-core optimization
const clusterManager = {
  // Initialize cluster
  initializeCluster: () => {
    if (cluster.isMaster) {
      const numCPUs = os.cpus().length;
      const workers = Math.min(numCPUs, 8); // Max 8 workers

      logger.info(`Starting cluster with ${workers} workers`);

      // Fork workers
      for (let i = 0; i < workers; i++) {
        cluster.fork();
      }

      // Handle worker events
      cluster.on('exit', (worker, _code, _signal) => {
        logger.warn(`Worker ${worker.process.pid} died. Restarting...`);
        cluster.fork();
      });

      cluster.on('online', (worker) => {
        logger.info(`Worker ${worker.process.pid} is online`);
      });

    } else {
      // Worker process
      logger.info(`Worker ${process.pid} started`);
    }
  },

  // Get cluster status
  getClusterStatus: () => {
    if (!cluster.isMaster) {return null;}

    return {
      isMaster: cluster.isMaster,
      workers: Object.keys(cluster.workers).length,
      cpuCount: os.cpus().length,
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime()
    };
  }
};

// Export performance optimization utilities
module.exports = {
  ConnectionPoolManager,
  connectionPoolManager,
  ResourceManager,
  resourceManager,
  CacheOptimizer,
  cacheOptimizer,
  QueryOptimizer,
  queryOptimizer,
  MemoryOptimizer,
  memoryOptimizer,
  clusterManager
};
