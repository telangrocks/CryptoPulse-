// =============================================================================
// Advanced Connection Pooling System - Production Ready
// =============================================================================
// Multi-database connection pooling with intelligent management and optimization

const { Pool } = require('pg');
const { MongoClient } = require('mongodb');
const Redis = require('redis');
const EventEmitter = require('events');
const logger = require('./logging');

// Connection pool types
const POOL_TYPES = {
  POSTGRES: 'postgres',
  MONGODB: 'mongodb',
  REDIS: 'redis',
  CUSTOM: 'custom'
};

// Connection pool states
const POOL_STATES = {
  INITIALIZING: 'initializing',
  READY: 'ready',
  DEGRADED: 'degraded',
  ERROR: 'error',
  SHUTDOWN: 'shutdown'
};

// Connection pool configuration
const poolConfigs = {
  postgres: {
    // Connection settings
    max: 25, // Maximum connections
    min: 5,  // Minimum connections
    idleTimeoutMillis: 30000, // 30 seconds
    connectionTimeoutMillis: 10000, // 10 seconds
    acquireTimeoutMillis: 60000, // 60 seconds
    createTimeoutMillis: 30000, // 30 seconds
    destroyTimeoutMillis: 5000, // 5 seconds
    
    // Connection lifecycle
    maxUses: 7500, // Recycle connections after 7500 uses
    maxLifetime: 1800000, // 30 minutes max lifetime
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
    
    // Pool management
    reapIntervalMillis: 1000, // Check for idle connections every second
    createRetryIntervalMillis: 200,
    propagateCreateError: false,
    allowExitOnIdle: false,
    
    // Query settings
    statement_timeout: 30000, // 30 seconds
    query_timeout: 30000, // 30 seconds
    
    // SSL settings
    ssl: process.env.NODE_ENV === 'production' ? { 
      rejectUnauthorized: false 
    } : false,
    
    // Application settings
    application_name: 'cryptopulse-backend'
  },
  
  mongodb: {
    // Connection settings
    maxPoolSize: 25, // Maximum connections
    minPoolSize: 5,  // Minimum connections
    maxIdleTimeMS: 30000, // 30 seconds
    connectTimeoutMS: 10000, // 10 seconds
    socketTimeoutMS: 30000, // 30 seconds
    serverSelectionTimeoutMS: 10000, // 10 seconds
    
    // Connection lifecycle
    maxStalenessSeconds: 90, // 90 seconds
    heartbeatFrequencyMS: 10000, // 10 seconds
    
    // Pool management
    retryWrites: true,
    retryReads: true,
    readPreference: 'primary',
    readConcern: { level: 'majority' },
    writeConcern: { w: 'majority', j: true },
    
    // Compression
    compressors: ['zstd', 'zlib', 'snappy'],
    zlibCompressionLevel: 6
  },
  
  redis: {
    // Connection settings
    socket: {
      connectTimeout: 10000,
      commandTimeout: 5000,
      keepAlive: 30000,
      family: 4
    },
    
    // Retry settings
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3,
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    
    // Pool settings
    lazyConnect: true,
    maxRetriesPerRequest: 3,
    
    // Connection lifecycle
    keepAlive: 30000,
    family: 4
  }
};

// Advanced connection pool manager
class ConnectionPoolManager extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.pools = new Map();
    this.metrics = {
      totalConnections: 0,
      activeConnections: 0,
      idleConnections: 0,
      failedConnections: 0,
      totalQueries: 0,
      successfulQueries: 0,
      failedQueries: 0,
      averageQueryTime: 0,
      poolCreations: 0,
      poolDestructions: 0
    };
    
    this.config = {
      maxPools: 10,
      poolCheckInterval: 30000, // 30 seconds
      metricsInterval: 60000, // 1 minute
      healthCheckInterval: 15000, // 15 seconds
      ...options
    };
    
    this.isInitialized = false;
    this.intervals = new Map();
    
    this.setupEventHandlers();
  }

  // Initialize pool manager
  async initialize() {
    try {
      logger.info('Initializing connection pool manager...');
      
      // Start monitoring intervals
      this.startMonitoring();
      
      this.isInitialized = true;
      this.emit('initialized');
      
      logger.info('✅ Connection pool manager initialized');
      
    } catch (error) {
      logger.error('❌ Failed to initialize connection pool manager:', error);
      throw error;
    }
  }

  // Setup event handlers
  setupEventHandlers() {
    this.on('pool:created', (name) => {
      this.metrics.poolCreations++;
      logger.info(`Connection pool created: ${name}`);
    });

    this.on('pool:destroyed', (name) => {
      this.metrics.poolDestructions++;
      logger.info(`Connection pool destroyed: ${name}`);
    });

    this.on('pool:error', (name, error) => {
      logger.error(`Connection pool error: ${name}`, error);
    });

    this.on('pool:health:degraded', (name, details) => {
      logger.warn(`Connection pool health degraded: ${name}`, details);
    });

    // Graceful shutdown
    process.on('SIGINT', () => this.shutdown());
    process.on('SIGTERM', () => this.shutdown());
  }

  // Create PostgreSQL connection pool
  async createPostgresPool(name, options = {}) {
    try {
      const config = { ...poolConfigs.postgres, ...options };
      
      if (!config.connectionString && !config.host) {
        throw new Error('PostgreSQL connection string or host required');
      }

      const pool = new Pool(config);
      
      // Setup pool event handlers
      this.setupPostgresPoolEvents(pool, name);
      
      // Test connection
      await this.testPostgresConnection(pool);
      
      // Store pool
      this.pools.set(name, {
        type: POOL_TYPES.POSTGRES,
        pool,
        config,
        state: POOL_STATES.READY,
        created: new Date(),
        lastUsed: new Date(),
        metrics: {
          totalCreated: 0,
          totalDestroyed: 0,
          totalAcquired: 0,
          totalReleased: 0,
          currentSize: 0,
          waiting: 0,
          queries: 0,
          errors: 0
        }
      });
      
      this.emit('pool:created', name);
      logger.info(`✅ PostgreSQL pool '${name}' created successfully`);
      
      return pool;
      
    } catch (error) {
      logger.error(`❌ Failed to create PostgreSQL pool '${name}':`, error);
      this.emit('pool:error', name, error);
      throw error;
    }
  }

  // Setup PostgreSQL pool events
  setupPostgresPoolEvents(pool, name) {
    pool.on('connect', (client) => {
      this.metrics.totalConnections++;
      this.metrics.activeConnections++;
      
      const poolData = this.pools.get(name);
      if (poolData) {
        poolData.metrics.totalCreated++;
        poolData.metrics.currentSize++;
        poolData.lastUsed = new Date();
      }
      
      logger.debug(`PostgreSQL client connected: ${name}`);
    });

    pool.on('acquire', (client) => {
      const poolData = this.pools.get(name);
      if (poolData) {
        poolData.metrics.totalAcquired++;
        poolData.lastUsed = new Date();
      }
      
      logger.debug(`PostgreSQL client acquired: ${name}`);
    });

    pool.on('release', (client) => {
      this.metrics.activeConnections--;
      this.metrics.idleConnections++;
      
      const poolData = this.pools.get(name);
      if (poolData) {
        poolData.metrics.totalReleased++;
      }
      
      logger.debug(`PostgreSQL client released: ${name}`);
    });

    pool.on('remove', (client) => {
      this.metrics.totalConnections--;
      this.metrics.idleConnections--;
      
      const poolData = this.pools.get(name);
      if (poolData) {
        poolData.metrics.totalDestroyed++;
        poolData.metrics.currentSize--;
      }
      
      logger.debug(`PostgreSQL client removed: ${name}`);
    });

    pool.on('error', (error) => {
      this.metrics.failedConnections++;
      
      const poolData = this.pools.get(name);
      if (poolData) {
        poolData.metrics.errors++;
        poolData.state = POOL_STATES.ERROR;
      }
      
      logger.error(`PostgreSQL pool error: ${name}`, error);
      this.emit('pool:error', name, error);
    });
  }

  // Test PostgreSQL connection
  async testPostgresConnection(pool) {
    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount < maxRetries) {
      try {
        const client = await pool.connect();
        await client.query('SELECT NOW()');
        client.release();
        return;
      } catch (error) {
        retryCount++;
        if (retryCount >= maxRetries) {
          throw error;
        }
        
        logger.info(`PostgreSQL connection test attempt ${retryCount} failed, retrying...`);
        const delay = 2000 * retryCount;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // Create MongoDB connection pool
  async createMongoPool(name, options = {}) {
    try {
      const config = { ...poolConfigs.mongodb, ...options };
      
      if (!config.connectionString && !config.host) {
        throw new Error('MongoDB connection string or host required');
      }

      const client = new MongoClient(config.connectionString || config.host, config);
      
      // Setup MongoDB client events
      this.setupMongoClientEvents(client, name);
      
      // Connect and test
      await client.connect();
      await this.testMongoConnection(client);
      
      // Store pool
      this.pools.set(name, {
        type: POOL_TYPES.MONGODB,
        client,
        config,
        state: POOL_STATES.READY,
        created: new Date(),
        lastUsed: new Date(),
        metrics: {
          totalCreated: 0,
          totalDestroyed: 0,
          totalAcquired: 0,
          totalReleased: 0,
          currentSize: 0,
          waiting: 0,
          queries: 0,
          errors: 0
        }
      });
      
      this.emit('pool:created', name);
      logger.info(`✅ MongoDB pool '${name}' created successfully`);
      
      return client;
      
    } catch (error) {
      logger.error(`❌ Failed to create MongoDB pool '${name}':`, error);
      this.emit('pool:error', name, error);
      throw error;
    }
  }

  // Setup MongoDB client events
  setupMongoClientEvents(client, name) {
    client.on('connectionCreated', (event) => {
      this.metrics.totalConnections++;
      this.metrics.activeConnections++;
      
      const poolData = this.pools.get(name);
      if (poolData) {
        poolData.metrics.totalCreated++;
        poolData.metrics.currentSize++;
        poolData.lastUsed = new Date();
      }
      
      logger.debug(`MongoDB connection created: ${name}`);
    });

    client.on('connectionClosed', (event) => {
      this.metrics.totalConnections--;
      this.metrics.activeConnections--;
      
      const poolData = this.pools.get(name);
      if (poolData) {
        poolData.metrics.totalDestroyed++;
        poolData.metrics.currentSize--;
      }
      
      logger.debug(`MongoDB connection closed: ${name}`);
    });

    client.on('serverHeartbeatFailed', (event) => {
      const poolData = this.pools.get(name);
      if (poolData) {
        poolData.state = POOL_STATES.DEGRADED;
        poolData.metrics.errors++;
      }
      
      logger.warn(`MongoDB server heartbeat failed: ${name}`, event);
      this.emit('pool:health:degraded', name, { reason: 'heartbeat_failed', event });
    });

    client.on('error', (error) => {
      this.metrics.failedConnections++;
      
      const poolData = this.pools.get(name);
      if (poolData) {
        poolData.metrics.errors++;
        poolData.state = POOL_STATES.ERROR;
      }
      
      logger.error(`MongoDB client error: ${name}`, error);
      this.emit('pool:error', name, error);
    });
  }

  // Test MongoDB connection
  async testMongoConnection(client) {
    try {
      await client.db().admin().ping();
      logger.debug('MongoDB connection test successful');
    } catch (error) {
      logger.error('MongoDB connection test failed:', error);
      throw error;
    }
  }

  // Create Redis connection pool
  async createRedisPool(name, options = {}) {
    try {
      const config = { ...poolConfigs.redis, ...options };
      
      if (!config.url && !config.host) {
        throw new Error('Redis URL or host required');
      }

      const client = Redis.createClient(config);
      
      // Setup Redis client events
      this.setupRedisClientEvents(client, name);
      
      // Connect and test
      await client.connect();
      await this.testRedisConnection(client);
      
      // Store pool
      this.pools.set(name, {
        type: POOL_TYPES.REDIS,
        client,
        config,
        state: POOL_STATES.READY,
        created: new Date(),
        lastUsed: new Date(),
        metrics: {
          totalCreated: 0,
          totalDestroyed: 0,
          totalAcquired: 0,
          totalReleased: 0,
          currentSize: 0,
          waiting: 0,
          queries: 0,
          errors: 0
        }
      });
      
      this.emit('pool:created', name);
      logger.info(`✅ Redis pool '${name}' created successfully`);
      
      return client;
      
    } catch (error) {
      logger.error(`❌ Failed to create Redis pool '${name}':`, error);
      this.emit('pool:error', name, error);
      throw error;
    }
  }

  // Setup Redis client events
  setupRedisClientEvents(client, name) {
    client.on('connect', () => {
      this.metrics.totalConnections++;
      
      const poolData = this.pools.get(name);
      if (poolData) {
        poolData.metrics.totalCreated++;
        poolData.metrics.currentSize++;
        poolData.lastUsed = new Date();
      }
      
      logger.debug(`Redis client connected: ${name}`);
    });

    client.on('ready', () => {
      const poolData = this.pools.get(name);
      if (poolData) {
        poolData.state = POOL_STATES.READY;
      }
      
      logger.debug(`Redis client ready: ${name}`);
    });

    client.on('error', (error) => {
      this.metrics.failedConnections++;
      
      const poolData = this.pools.get(name);
      if (poolData) {
        poolData.metrics.errors++;
        poolData.state = POOL_STATES.ERROR;
      }
      
      logger.error(`Redis client error: ${name}`, error);
      this.emit('pool:error', name, error);
    });

    client.on('end', () => {
      this.metrics.totalConnections--;
      
      const poolData = this.pools.get(name);
      if (poolData) {
        poolData.metrics.totalDestroyed++;
        poolData.metrics.currentSize--;
        poolData.state = POOL_STATES.SHUTDOWN;
      }
      
      logger.debug(`Redis client disconnected: ${name}`);
    });

    client.on('reconnecting', () => {
      const poolData = this.pools.get(name);
      if (poolData) {
        poolData.state = POOL_STATES.DEGRADED;
      }
      
      logger.debug(`Redis client reconnecting: ${name}`);
      this.emit('pool:health:degraded', name, { reason: 'reconnecting' });
    });
  }

  // Test Redis connection
  async testRedisConnection(client) {
    try {
      const result = await client.ping();
      if (result !== 'PONG') {
        throw new Error('Redis ping failed');
      }
      logger.debug('Redis connection test successful');
    } catch (error) {
      logger.error('Redis connection test failed:', error);
      throw error;
    }
  }

  // Get pool by name
  getPool(name) {
    const poolData = this.pools.get(name);
    if (!poolData) {
      throw new Error(`Pool '${name}' not found`);
    }
    
    poolData.lastUsed = new Date();
    return poolData;
  }

  // Get PostgreSQL pool
  getPostgresPool(name) {
    const poolData = this.getPool(name);
    if (poolData.type !== POOL_TYPES.POSTGRES) {
      throw new Error(`Pool '${name}' is not a PostgreSQL pool`);
    }
    
    return poolData.pool;
  }

  // Get MongoDB pool
  getMongoPool(name) {
    const poolData = this.getPool(name);
    if (poolData.type !== POOL_TYPES.MONGODB) {
      throw new Error(`Pool '${name}' is not a MongoDB pool`);
    }
    
    return poolData.client;
  }

  // Get Redis pool
  getRedisPool(name) {
    const poolData = this.getPool(name);
    if (poolData.type !== POOL_TYPES.REDIS) {
      throw new Error(`Pool '${name}' is not a Redis pool`);
    }
    
    return poolData.client;
  }

  // Execute query with metrics
  async executeQuery(poolName, queryFn, options = {}) {
    const start = Date.now();
    const { timeout = 30000, retries = 3 } = options;
    
    try {
      this.metrics.totalQueries++;
      
      const poolData = this.pools.get(poolName);
      if (!poolData) {
        throw new Error(`Pool '${poolName}' not found`);
      }
      
      poolData.metrics.queries++;
      poolData.lastUsed = new Date();
      
      // Execute query with timeout
      const result = await Promise.race([
        queryFn(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Query timeout')), timeout)
        )
      ]);
      
      const duration = Date.now() - start;
      
      // Update metrics
      this.metrics.successfulQueries++;
      this.metrics.averageQueryTime = 
        (this.metrics.averageQueryTime * (this.metrics.totalQueries - 1) + duration) / 
        this.metrics.totalQueries;
      
      // Log slow queries
      if (duration > 1000) {
        logger.warn(`Slow query detected in pool '${poolName}': ${duration}ms`);
      }
      
      return result;
      
    } catch (error) {
      this.metrics.failedQueries++;
      
      const poolData = this.pools.get(poolName);
      if (poolData) {
        poolData.metrics.errors++;
      }
      
      logger.error(`Query failed in pool '${poolName}':`, error);
      throw error;
    }
  }

  // Health check for all pools
  async healthCheck() {
    const healthStatus = {
      timestamp: new Date().toISOString(),
      overall: 'healthy',
      pools: {}
    };
    
    let unhealthyPools = 0;
    let degradedPools = 0;
    
    for (const [name, poolData] of this.pools) {
      try {
        const poolHealth = await this.checkPoolHealth(name, poolData);
        healthStatus.pools[name] = poolHealth;
        
        if (poolHealth.status === 'unhealthy') {
          unhealthyPools++;
        } else if (poolHealth.status === 'degraded') {
          degradedPools++;
        }
        
      } catch (error) {
        healthStatus.pools[name] = {
          status: 'error',
          error: error.message,
          timestamp: new Date().toISOString()
        };
        unhealthyPools++;
      }
    }
    
    // Determine overall health
    if (unhealthyPools > 0) {
      healthStatus.overall = 'unhealthy';
    } else if (degradedPools > 0) {
      healthStatus.overall = 'degraded';
    }
    
    return healthStatus;
  }

  // Check individual pool health
  async checkPoolHealth(name, poolData) {
    const health = {
      name,
      type: poolData.type,
      status: 'healthy',
      state: poolData.state,
      created: poolData.created,
      lastUsed: poolData.lastUsed,
      metrics: poolData.metrics,
      timestamp: new Date().toISOString()
    };
    
    try {
      // Check pool state
      if (poolData.state === POOL_STATES.ERROR) {
        health.status = 'unhealthy';
        health.reason = 'pool_in_error_state';
        return health;
      }
      
      if (poolData.state === POOL_STATES.DEGRADED) {
        health.status = 'degraded';
        health.reason = 'pool_degraded';
        return health;
      }
      
      // Test connection based on type
      if (poolData.type === POOL_TYPES.POSTGRES) {
        const client = await poolData.pool.connect();
        await client.query('SELECT 1');
        client.release();
      } else if (poolData.type === POOL_TYPES.MONGODB) {
        await poolData.client.db().admin().ping();
      } else if (poolData.type === POOL_TYPES.REDIS) {
        const result = await poolData.client.ping();
        if (result !== 'PONG') {
          health.status = 'unhealthy';
          health.reason = 'redis_ping_failed';
          return health;
        }
      }
      
      // Check metrics for issues
      const errorRate = poolData.metrics.queries > 0 ? 
        (poolData.metrics.errors / poolData.metrics.queries) * 100 : 0;
      
      if (errorRate > 10) {
        health.status = 'degraded';
        health.reason = 'high_error_rate';
        health.errorRate = errorRate.toFixed(2) + '%';
      }
      
      return health;
      
    } catch (error) {
      health.status = 'unhealthy';
      health.reason = 'health_check_failed';
      health.error = error.message;
      return health;
    }
  }

  // Start monitoring
  startMonitoring() {
    // Pool health monitoring
    const healthInterval = setInterval(async () => {
      try {
        const health = await this.healthCheck();
        
        // Log health status if not healthy
        if (health.overall !== 'healthy') {
          logger.warn('Pool health check:', health);
        }
        
        // Emit health events
        this.emit('health:check', health);
        
      } catch (error) {
        logger.error('Health check error:', error);
      }
    }, this.config.healthCheckInterval);
    
    this.intervals.set('health', healthInterval);
    
    // Metrics collection
    const metricsInterval = setInterval(() => {
      this.collectMetrics();
    }, this.config.metricsInterval);
    
    this.intervals.set('metrics', metricsInterval);
    
    // Pool cleanup monitoring
    const cleanupInterval = setInterval(() => {
      this.performPoolCleanup();
    }, this.config.poolCheckInterval);
    
    this.intervals.set('cleanup', cleanupInterval);
  }

  // Collect metrics
  collectMetrics() {
    const metrics = {
      timestamp: new Date().toISOString(),
      global: this.metrics,
      pools: {}
    };
    
    for (const [name, poolData] of this.pools) {
      metrics.pools[name] = {
        type: poolData.type,
        state: poolData.state,
        created: poolData.created,
        lastUsed: poolData.lastUsed,
        metrics: poolData.metrics
      };
    }
    
    logger.info('Connection pool metrics:', metrics);
    this.emit('metrics:collected', metrics);
    
    return metrics;
  }

  // Perform pool cleanup
  performPoolCleanup() {
    const now = Date.now();
    const maxIdleTime = 30 * 60 * 1000; // 30 minutes
    
    for (const [name, poolData] of this.pools) {
      const idleTime = now - poolData.lastUsed.getTime();
      
      if (idleTime > maxIdleTime) {
        logger.info(`Pool '${name}' has been idle for ${Math.round(idleTime / 1000)}s`);
        // Could implement pool destruction logic here
      }
    }
  }

  // Get statistics
  getStatistics() {
    return {
      initialized: this.isInitialized,
      totalPools: this.pools.size,
      metrics: this.metrics,
      pools: Array.from(this.pools.entries()).map(([name, poolData]) => ({
        name,
        type: poolData.type,
        state: poolData.state,
        created: poolData.created,
        lastUsed: poolData.lastUsed,
        metrics: poolData.metrics
      }))
    };
  }

  // Destroy pool
  async destroyPool(name) {
    const poolData = this.pools.get(name);
    if (!poolData) {
      throw new Error(`Pool '${name}' not found`);
    }
    
    try {
      if (poolData.type === POOL_TYPES.POSTGRES) {
        await poolData.pool.end();
      } else if (poolData.type === POOL_TYPES.MONGODB) {
        await poolData.client.close();
      } else if (poolData.type === POOL_TYPES.REDIS) {
        await poolData.client.quit();
      }
      
      this.pools.delete(name);
      this.emit('pool:destroyed', name);
      
      logger.info(`Pool '${name}' destroyed successfully`);
      
    } catch (error) {
      logger.error(`Failed to destroy pool '${name}':`, error);
      throw error;
    }
  }

  // Graceful shutdown
  async shutdown() {
    try {
      logger.info('Shutting down connection pool manager...');
      
      // Stop monitoring intervals
      for (const [name, interval] of this.intervals) {
        clearInterval(interval);
      }
      this.intervals.clear();
      
      // Destroy all pools
      const poolNames = Array.from(this.pools.keys());
      for (const name of poolNames) {
        await this.destroyPool(name);
      }
      
      this.isInitialized = false;
      this.emit('shutdown');
      
      logger.info('Connection pool manager shut down successfully');
      
    } catch (error) {
      logger.error('Connection pool manager shutdown error:', error);
      throw error;
    }
  }
}

// Export singleton instance
const connectionPoolManager = new ConnectionPoolManager();
module.exports = {
  connectionPoolManager,
  ConnectionPoolManager,
  POOL_TYPES,
  POOL_STATES,
  poolConfigs
};
