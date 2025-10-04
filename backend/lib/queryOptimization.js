// =============================================================================
// Database Query Optimization & Indexing - Production Ready
// =============================================================================
// Advanced query optimization, indexing strategies, and performance monitoring

const { Pool } = require('pg');
const { MongoClient } = require('mongodb');
const logger = require('./logging');

// Query optimization strategies
const OPTIMIZATION_STRATEGIES = {
  INDEX_USAGE: 'index_usage',
  QUERY_CACHING: 'query_caching',
  CONNECTION_POOLING: 'connection_pooling',
  BATCH_OPERATIONS: 'batch_operations',
  ASYNC_PROCESSING: 'async_processing',
  QUERY_ANALYSIS: 'query_analysis'
};

// Query types
const QUERY_TYPES = {
  SELECT: 'SELECT',
  INSERT: 'INSERT',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  UPSERT: 'UPSERT',
  AGGREGATE: 'AGGREGATE',
  JOIN: 'JOIN',
  SUBQUERY: 'SUBQUERY'
};

// Index types
const INDEX_TYPES = {
  B_TREE: 'btree',
  HASH: 'hash',
  GIN: 'gin',
  GIST: 'gist',
  BRIN: 'brin',
  COMPOSITE: 'composite',
  PARTIAL: 'partial',
  EXPRESSION: 'expression'
};

// Query optimization configuration
const optimizationConfig = {
  // Query analysis
  queryAnalysis: {
    enabled: true,
    slowQueryThreshold: 1000, // 1 second
    criticalQueryThreshold: 5000, // 5 seconds
    logSlowQueries: true,
    logCriticalQueries: true,
    maxQueryLogSize: 1000
  },
  
  // Indexing
  indexing: {
    autoCreate: false, // Manual control for production
    analyzeFrequency: 86400, // 24 hours
    vacuumFrequency: 604800, // 7 days
    reindexFrequency: 2592000, // 30 days
    indexUsageThreshold: 0.1 // 10% usage threshold
  },
  
  // Caching
  caching: {
    enabled: true,
    defaultTTL: 300, // 5 minutes
    maxCacheSize: 10000,
    cacheHitThreshold: 0.8 // 80% hit rate threshold
  },
  
  // Batch operations
  batchOperations: {
    maxBatchSize: 1000,
    batchTimeout: 5000, // 5 seconds
    parallelBatches: 5
  },
  
  // Performance monitoring
  monitoring: {
    enabled: true,
    metricsInterval: 60000, // 1 minute
    alertThresholds: {
      slowQueries: 10,
      errorRate: 0.05, // 5%
      connectionPool: 0.8 // 80% utilization
    }
  }
};

// Query optimizer class
class QueryOptimizer {
  constructor(options = {}) {
    this.config = { ...optimizationConfig, ...options };
    this.queryCache = new Map();
    this.queryMetrics = new Map();
    this.slowQueries = [];
    this.indexRecommendations = new Map();
    this.isInitialized = false;
    
    this.metrics = {
      totalQueries: 0,
      slowQueries: 0,
      criticalQueries: 0,
      cachedQueries: 0,
      failedQueries: 0,
      averageQueryTime: 0,
      cacheHitRate: 0,
      indexUsageRate: 0
    };
  }

  // Initialize query optimizer
  async initialize(poolManager) {
    try {
      this.poolManager = poolManager;
      
      // Start monitoring
      this.startMonitoring();
      
      this.isInitialized = true;
      logger.info('✅ Query optimizer initialized');
      
    } catch (error) {
      logger.error('❌ Failed to initialize query optimizer:', error);
      throw error;
    }
  }

  // Optimize PostgreSQL query
  async optimizePostgresQuery(query, params = [], options = {}) {
    const {
      poolName = 'default',
      cache = true,
      timeout = 30000,
      retries = 3,
      explain = false
    } = options;

    const queryId = this.generateQueryId(query, params);
    const start = Date.now();

    try {
      // Check query cache
      if (cache && this.config.caching.enabled) {
        const cachedResult = this.getCachedQuery(queryId);
        if (cachedResult) {
          this.metrics.cachedQueries++;
          this.metrics.cacheHitRate = this.calculateCacheHitRate();
          return cachedResult;
        }
      }

      // Get pool
      const pool = this.poolManager.getPostgresPool(poolName);
      
      // Execute query with retry logic
      let result;
      let lastError;
      
      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          // Add query analysis if enabled
          if (explain || this.config.queryAnalysis.enabled) {
            await this.analyzePostgresQuery(pool, query, params);
          }
          
          // Execute query
          result = await this.executePostgresQuery(pool, query, params, timeout);
          break;
          
        } catch (error) {
          lastError = error;
          
          if (attempt < retries) {
            logger.warn(`Query attempt ${attempt} failed, retrying...`, error.message);
            await this.delay(1000 * attempt); // Exponential backoff
          }
        }
      }
      
      if (!result) {
        throw lastError;
      }

      // Calculate execution time
      const duration = Date.now() - start;
      
      // Update metrics
      this.updateQueryMetrics(queryId, duration, true);
      
      // Log slow queries
      if (duration > this.config.queryAnalysis.slowQueryThreshold) {
        this.logSlowQuery(queryId, query, params, duration);
      }
      
      // Cache result if enabled
      if (cache && this.config.caching.enabled) {
        this.cacheQueryResult(queryId, result);
      }
      
      return result;
      
    } catch (error) {
      const duration = Date.now() - start;
      this.updateQueryMetrics(queryId, duration, false);
      
      logger.error(`Query failed: ${queryId}`, error);
      throw error;
    }
  }

  // Optimize MongoDB query
  async optimizeMongoQuery(collection, operation, options = {}) {
    const {
      poolName = 'default',
      cache = true,
      timeout = 30000,
      retries = 3,
      explain = false
    } = options;

    const queryId = this.generateQueryId(collection, operation);
    const start = Date.now();

    try {
      // Check query cache
      if (cache && this.config.caching.enabled) {
        const cachedResult = this.getCachedQuery(queryId);
        if (cachedResult) {
          this.metrics.cachedQueries++;
          this.metrics.cacheHitRate = this.calculateCacheHitRate();
          return cachedResult;
        }
      }

      // Get client
      const client = this.poolManager.getMongoPool(poolName);
      const db = client.db();
      const coll = db.collection(collection);
      
      // Execute operation with retry logic
      let result;
      let lastError;
      
      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          // Add query analysis if enabled
          if (explain || this.config.queryAnalysis.enabled) {
            await this.analyzeMongoQuery(coll, operation);
          }
          
          // Execute operation
          result = await this.executeMongoOperation(coll, operation, timeout);
          break;
          
        } catch (error) {
          lastError = error;
          
          if (attempt < retries) {
            logger.warn(`Mongo operation attempt ${attempt} failed, retrying...`, error.message);
            await this.delay(1000 * attempt);
          }
        }
      }
      
      if (result === undefined) {
        throw lastError;
      }

      // Calculate execution time
      const duration = Date.now() - start;
      
      // Update metrics
      this.updateQueryMetrics(queryId, duration, true);
      
      // Log slow queries
      if (duration > this.config.queryAnalysis.slowQueryThreshold) {
        this.logSlowQuery(queryId, collection, operation, duration);
      }
      
      // Cache result if enabled
      if (cache && this.config.caching.enabled) {
        this.cacheQueryResult(queryId, result);
      }
      
      return result;
      
    } catch (error) {
      const duration = Date.now() - start;
      this.updateQueryMetrics(queryId, duration, false);
      
      logger.error(`Mongo operation failed: ${queryId}`, error);
      throw error;
    }
  }

  // Execute PostgreSQL query with optimization
  async executePostgresQuery(pool, query, params, timeout) {
    return new Promise(async (resolve, reject) => {
      let client;
      
      try {
        // Get client from pool
        client = await Promise.race([
          pool.connect(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Connection timeout')), 5000)
          )
        ]);
        
        // Execute query with timeout
        const result = await Promise.race([
          client.query(query, params),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Query timeout')), timeout)
          )
        ]);
        
        resolve(result);
        
      } catch (error) {
        reject(error);
      } finally {
        if (client) {
          client.release();
        }
      }
    });
  }

  // Execute MongoDB operation with optimization
  async executeMongoOperation(collection, operation, timeout) {
    return new Promise(async (resolve, reject) => {
      try {
        const result = await Promise.race([
          this.performMongoOperation(collection, operation),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Operation timeout')), timeout)
          )
        ]);
        
        resolve(result);
        
      } catch (error) {
        reject(error);
      }
    });
  }

  // Perform MongoDB operation
  async performMongoOperation(collection, operation) {
    const { type, ...params } = operation;
    
    switch (type) {
      case 'find':
        return await collection.find(params.filter || {}, params.options || {}).toArray();
      
      case 'findOne':
        return await collection.findOne(params.filter || {}, params.options || {});
      
      case 'insertOne':
        return await collection.insertOne(params.document);
      
      case 'insertMany':
        return await collection.insertMany(params.documents);
      
      case 'updateOne':
        return await collection.updateOne(params.filter, params.update, params.options || {});
      
      case 'updateMany':
        return await collection.updateMany(params.filter, params.update, params.options || {});
      
      case 'deleteOne':
        return await collection.deleteOne(params.filter, params.options || {});
      
      case 'deleteMany':
        return await collection.deleteMany(params.filter, params.options || {});
      
      case 'aggregate':
        return await collection.aggregate(params.pipeline, params.options || {}).toArray();
      
      case 'count':
        return await collection.countDocuments(params.filter || {}, params.options || {});
      
      case 'distinct':
        return await collection.distinct(params.field, params.filter || {}, params.options || {});
      
      default:
        throw new Error(`Unsupported MongoDB operation: ${type}`);
    }
  }

  // Analyze PostgreSQL query
  async analyzePostgresQuery(pool, query, params) {
    if (!this.config.queryAnalysis.enabled) {
      return;
    }

    try {
      const explainQuery = `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${query}`;
      const result = await this.executePostgresQuery(pool, explainQuery, params, 10000);
      
      if (result.rows && result.rows.length > 0) {
        const analysis = result.rows[0]['QUERY PLAN'][0];
        
        // Check for missing indexes
        if (analysis['Plan']['Node Type'] === 'Seq Scan') {
          this.recommendIndex(query, analysis);
        }
        
        // Log query plan for slow queries
        if (analysis['Execution Time'] > this.config.queryAnalysis.slowQueryThreshold) {
          logger.warn('Slow query detected:', {
            query: query.substring(0, 100) + '...',
            executionTime: analysis['Execution Time'],
            plan: analysis['Plan']
          });
        }
      }
      
    } catch (error) {
      logger.error('Query analysis failed:', error);
    }
  }

  // Analyze MongoDB query
  async analyzeMongoQuery(collection, operation) {
    if (!this.config.queryAnalysis.enabled) {
      return;
    }

    try {
      const { type, ...params } = operation;
      
      if (type === 'find' || type === 'findOne') {
        const explainResult = await collection.find(params.filter || {}, params.options || {})
          .explain('executionStats');
        
        // Check for missing indexes
        if (explainResult.executionStats.executionStages.stage === 'COLLSCAN') {
          this.recommendMongoIndex(collection.collectionName, params.filter);
        }
        
        // Log execution stats for slow queries
        if (explainResult.executionStats.executionTimeMillis > this.config.queryAnalysis.slowQueryThreshold) {
          logger.warn('Slow MongoDB query detected:', {
            collection: collection.collectionName,
            operation: type,
            executionTime: explainResult.executionStats.executionTimeMillis,
            stages: explainResult.executionStats.executionStages
          });
        }
      }
      
    } catch (error) {
      logger.error('MongoDB query analysis failed:', error);
    }
  }

  // Recommend index for PostgreSQL
  recommendIndex(query, analysis) {
    // Simple index recommendation based on table and column usage
    const tableMatch = query.match(/FROM\s+(\w+)/i);
    const columnMatch = query.match(/WHERE\s+(\w+)\s*=/i);
    
    if (tableMatch && columnMatch) {
      const table = tableMatch[1];
      const column = columnMatch[1];
      const indexName = `idx_${table}_${column}`;
      
      this.indexRecommendations.set(indexName, {
        type: INDEX_TYPES.B_TREE,
        table,
        columns: [column],
        reason: 'Sequential scan detected',
        query: query.substring(0, 100) + '...',
        recommendation: `CREATE INDEX ${indexName} ON ${table} (${column});`
      });
      
      logger.info(`Index recommendation: ${indexName}`, {
        table,
        column,
        reason: 'Sequential scan detected'
      });
    }
  }

  // Recommend index for MongoDB
  recommendMongoIndex(collection, filter) {
    if (!filter || typeof filter !== 'object') {
      return;
    }

    const fields = Object.keys(filter);
    if (fields.length === 0) {
      return;
    }

    const indexName = `idx_${collection}_${fields.join('_')}`;
    
    this.indexRecommendations.set(indexName, {
      type: 'compound',
      collection,
      fields,
      reason: 'Collection scan detected',
      recommendation: `db.${collection}.createIndex(${JSON.stringify(filter)})`
    });
    
    logger.info(`MongoDB index recommendation: ${indexName}`, {
      collection,
      fields,
      reason: 'Collection scan detected'
    });
  }

  // Batch operations
  async batchPostgresQueries(queries, options = {}) {
    const {
      poolName = 'default',
      batchSize = this.config.batchOperations.maxBatchSize,
      parallel = this.config.batchOperations.parallelBatches,
      timeout = this.config.batchOperations.batchTimeout
    } = options;

    if (!Array.isArray(queries) || queries.length === 0) {
      return [];
    }

    const results = [];
    const batches = this.createBatches(queries, batchSize);

    // Process batches in parallel
    const batchPromises = batches.map(async (batch, index) => {
      try {
        const batchResults = await this.processPostgresBatch(poolName, batch, timeout);
        return { index, results: batchResults, success: true };
      } catch (error) {
        logger.error(`Batch ${index} failed:`, error);
        return { index, error, success: false };
      }
    });

    const batchResults = await Promise.all(batchPromises);

    // Combine results in order
    for (const batchResult of batchResults) {
      if (batchResult.success) {
        results.push(...batchResult.results);
      } else {
        throw batchResult.error;
      }
    }

    return results;
  }

  async batchMongoOperations(collection, operations, options = {}) {
    const {
      poolName = 'default',
      batchSize = this.config.batchOperations.maxBatchSize,
      parallel = this.config.batchOperations.parallelBatches,
      timeout = this.config.batchOperations.batchTimeout
    } = options;

    if (!Array.isArray(operations) || operations.length === 0) {
      return [];
    }

    const results = [];
    const batches = this.createBatches(operations, batchSize);

    // Process batches in parallel
    const batchPromises = batches.map(async (batch, index) => {
      try {
        const batchResults = await this.processMongoBatch(poolName, collection, batch, timeout);
        return { index, results: batchResults, success: true };
      } catch (error) {
        logger.error(`Mongo batch ${index} failed:`, error);
        return { index, error, success: false };
      }
    });

    const batchResults = await Promise.all(batchPromises);

    // Combine results in order
    for (const batchResult of batchResults) {
      if (batchResult.success) {
        results.push(...batchResult.results);
      } else {
        throw batchResult.error;
      }
    }

    return results;
  }

  // Process PostgreSQL batch
  async processPostgresBatch(poolName, batch, timeout) {
    const pool = this.poolManager.getPostgresPool(poolName);
    const client = await pool.connect();
    
    try {
      const results = [];
      
      for (const { query, params } of batch) {
        const result = await Promise.race([
          client.query(query, params),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Batch query timeout')), timeout)
          )
        ]);
        results.push(result);
      }
      
      return results;
      
    } finally {
      client.release();
    }
  }

  // Process MongoDB batch
  async processMongoBatch(poolName, collection, batch, timeout) {
    const client = this.poolManager.getMongoPool(poolName);
    const db = client.db();
    const coll = db.collection(collection);
    
    const results = [];
    
    for (const operation of batch) {
      const result = await Promise.race([
        this.performMongoOperation(coll, operation),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Batch operation timeout')), timeout)
        )
      ]);
      results.push(result);
    }
    
    return results;
  }

  // Create batches
  createBatches(items, batchSize) {
    const batches = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  // Query caching
  generateQueryId(query, params) {
    const queryString = typeof query === 'string' ? query : JSON.stringify(query);
    const paramsString = JSON.stringify(params || {});
    return require('crypto')
      .createHash('sha256')
      .update(queryString + paramsString)
      .digest('hex')
      .substring(0, 16);
  }

  getCachedQuery(queryId) {
    const cached = this.queryCache.get(queryId);
    if (cached && cached.expires > Date.now()) {
      return cached.data;
    }
    
    if (cached) {
      this.queryCache.delete(queryId);
    }
    
    return null;
  }

  cacheQueryResult(queryId, data) {
    if (this.queryCache.size >= this.config.caching.maxCacheSize) {
      // Remove oldest entries
      const keys = Array.from(this.queryCache.keys());
      const keysToDelete = keys.slice(0, Math.floor(this.config.caching.maxCacheSize * 0.1));
      keysToDelete.forEach(key => this.queryCache.delete(key));
    }
    
    this.queryCache.set(queryId, {
      data,
      expires: Date.now() + (this.config.caching.defaultTTL * 1000),
      created: Date.now()
    });
  }

  // Metrics and monitoring
  updateQueryMetrics(queryId, duration, success) {
    this.metrics.totalQueries++;
    
    if (!success) {
      this.metrics.failedQueries++;
      return;
    }
    
    // Update average query time
    this.metrics.averageQueryTime = 
      (this.metrics.averageQueryTime * (this.metrics.totalQueries - 1) + duration) / 
      this.metrics.totalQueries;
    
    // Track slow queries
    if (duration > this.config.queryAnalysis.slowQueryThreshold) {
      this.metrics.slowQueries++;
      
      if (duration > this.config.queryAnalysis.criticalQueryThreshold) {
        this.metrics.criticalQueries++;
      }
    }
    
    // Update cache hit rate
    this.metrics.cacheHitRate = this.calculateCacheHitRate();
  }

  calculateCacheHitRate() {
    const total = this.metrics.totalQueries;
    const cached = this.metrics.cachedQueries;
    return total > 0 ? (cached / total) : 0;
  }

  logSlowQuery(queryId, query, params, duration) {
    const slowQuery = {
      queryId,
      query: typeof query === 'string' ? query.substring(0, 200) : JSON.stringify(query).substring(0, 200),
      params,
      duration,
      timestamp: new Date().toISOString()
    };
    
    this.slowQueries.push(slowQuery);
    
    // Keep only recent slow queries
    if (this.slowQueries.length > this.config.queryAnalysis.maxQueryLogSize) {
      this.slowQueries = this.slowQueries.slice(-this.config.queryAnalysis.maxQueryLogSize);
    }
    
    if (this.config.queryAnalysis.logSlowQueries) {
      logger.warn('Slow query detected:', slowQuery);
    }
  }

  // Start monitoring
  startMonitoring() {
    if (!this.config.monitoring.enabled) {
      return;
    }

    // Metrics collection
    setInterval(() => {
      this.collectMetrics();
    }, this.config.monitoring.metricsInterval);

    // Cache cleanup
    setInterval(() => {
      this.cleanupCache();
    }, 300000); // 5 minutes
  }

  collectMetrics() {
    const metrics = {
      timestamp: new Date().toISOString(),
      ...this.metrics,
      cacheSize: this.queryCache.size,
      slowQueriesCount: this.slowQueries.length,
      indexRecommendations: this.indexRecommendations.size
    };

    logger.info('Query optimization metrics:', metrics);
    return metrics;
  }

  cleanupCache() {
    const now = Date.now();
    const expiredKeys = [];

    for (const [key, value] of this.queryCache) {
      if (value.expires <= now) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => this.queryCache.delete(key));

    if (expiredKeys.length > 0) {
      logger.debug(`Cleaned up ${expiredKeys.length} expired cache entries`);
    }
  }

  // Utility methods
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Get statistics
  getStatistics() {
    return {
      initialized: this.isInitialized,
      metrics: this.metrics,
      cacheSize: this.queryCache.size,
      slowQueries: this.slowQueries.slice(-10), // Last 10 slow queries
      indexRecommendations: Array.from(this.indexRecommendations.values())
    };
  }

  // Get slow queries
  getSlowQueries(limit = 50) {
    return this.slowQueries
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit);
  }

  // Get index recommendations
  getIndexRecommendations() {
    return Array.from(this.indexRecommendations.values());
  }

  // Clear cache
  clearCache() {
    this.queryCache.clear();
    logger.info('Query cache cleared');
  }

  // Clear metrics
  clearMetrics() {
    this.metrics = {
      totalQueries: 0,
      slowQueries: 0,
      criticalQueries: 0,
      cachedQueries: 0,
      failedQueries: 0,
      averageQueryTime: 0,
      cacheHitRate: 0,
      indexUsageRate: 0
    };
    
    this.slowQueries = [];
    this.indexRecommendations.clear();
    
    logger.info('Query metrics cleared');
  }
}

// Export singleton instance
const queryOptimizer = new QueryOptimizer();
module.exports = {
  queryOptimizer,
  QueryOptimizer,
  OPTIMIZATION_STRATEGIES,
  QUERY_TYPES,
  INDEX_TYPES,
  optimizationConfig
};
