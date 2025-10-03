// =============================================================================
// Database Integration - Production Ready
// =============================================================================
// Database connection and query utilities for CryptoPulse backend

const { Pool } = require('pg');
const { MongoClient } = require('mongodb');
const Redis = require('redis');
const logger = require('./logging');

// Database connections
let postgresPool = null;
let mongoClient = null;
let redisClient = null;

// PostgreSQL connection
const initPostgreSQL = async() => {
  try {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not set');
    }

    postgresPool = new Pool({
      connectionString,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 25, // Increased for production
      min: 3, // Increased minimum connections
      idleTimeoutMillis: 20000, // Reduced for better resource management
      connectionTimeoutMillis: 8000, // Reduced timeout
      acquireTimeoutMillis: 8000, // Reduced timeout
      createTimeoutMillis: 8000, // Reduced timeout
      // Enhanced connection pool settings
      allowExitOnIdle: false, // Keep connections alive
      statement_timeout: 15000, // Reduced to 15 seconds
      query_timeout: 15000, // Reduced to 15 seconds
      application_name: 'cryptopulse-backend',
      // Connection validation
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000,
      // Production optimizations
      maxUses: 7500, // Recycle connections after 7500 uses
      maxLifetime: 1800000, // 30 minutes max lifetime
      // Enhanced monitoring
      log: (message, level) => {
        if (level === 'error') {
          logger.error('PostgreSQL Pool Error:', message);
        } else if (level === 'warn') {
          logger.warn('PostgreSQL Pool Warning:', message);
        }
      }
    });

    // Test connection with retry logic
    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount < maxRetries) {
      try {
        const client = await postgresPool.connect();
        await client.query('SELECT NOW()');
        client.release();
        break;
      } catch (error) {
        retryCount++;
        if (retryCount >= maxRetries) {
          throw error;
        }
        logger.info(`PostgreSQL connection attempt ${retryCount} failed, retrying...`);
        const delay = 2000 * retryCount;
        await new Promise(resolve => setTimeout(() => resolve(), delay));
      }
    }

    logger.info('✅ PostgreSQL connected successfully');
    return postgresPool;
  } catch (error) {
    logger.error('❌ PostgreSQL connection failed:', error.message);
    throw error;
  }
};

// MongoDB connection
const initMongoDB = async() => {
  try {
    const connectionString = process.env.MONGODB_URL;

    if (!connectionString) {
      logger.warn('⚠️ MONGODB_URL not set, skipping MongoDB connection');
      return null;
    }

    mongoClient = new MongoClient(connectionString, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      maxIdleTimeMS: 30000,
      retryWrites: true,
      retryReads: true
    });

    await mongoClient.connect();
    await mongoClient.db('admin').command({ ping: 1 });

    logger.info('✅ MongoDB connected successfully');
    return mongoClient;
  } catch (error) {
    logger.error('❌ MongoDB connection failed:', error.message);
    // Don't throw error for MongoDB as it's optional
    logger.warn('⚠️ Continuing without MongoDB connection');
    return null;
  }
};

// Redis connection
const initRedis = async() => {
  try {
    const connectionString = process.env.REDIS_URL;

    if (!connectionString) {
      logger.warn('⚠️ REDIS_URL not set, skipping Redis connection');
      return null;
    }

    redisClient = Redis.createClient({
      url: connectionString,
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
      logger.info('Redis client connected');
    });

    redisClient.on('ready', () => {
      logger.info('Redis client ready');
    });

    await redisClient.connect();

    logger.info('✅ Redis connected successfully');
    return redisClient;
  } catch (error) {
    logger.error('❌ Redis connection failed:', error.message);
    // Don't throw error for Redis as it's optional
    logger.warn('⚠️ Continuing without Redis connection');
    return null;
  }
};

// Initialize all databases
const initDatabases = async() => {
  try {
  // PostgreSQL is required, others are optional
    const results = await Promise.allSettled([
      initPostgreSQL(),
      initMongoDB(),
      initRedis()
    ]);

    const [postgresResult, mongoResult, redisResult] = results;

    // Check if PostgreSQL (required) succeeded
    if (postgresResult.status === 'rejected') {
      throw new Error(`PostgreSQL initialization failed: ${postgresResult.reason.message}`);
    }

    // Log optional service results
    if (mongoResult.status === 'fulfilled' && mongoResult.value) {
      logger.info('✅ MongoDB initialized successfully');
    } else {
      logger.warn('⚠️ MongoDB not available');
    }

    if (redisResult.status === 'fulfilled' && redisResult.value) {
      logger.info('✅ Redis initialized successfully');
    } else {
      logger.warn('⚠️ Redis not available');
    }

    logger.info('✅ Database initialization completed');
  } catch (error) {
    logger.error('❌ Database initialization failed:', error.message);
    throw error;
  }
};

// Enhanced query helper with production optimizations
const query = async(text, params = [], options = {}) => {
  if (!postgresPool) {
    throw new Error('PostgreSQL not initialized');
  }

  const start = Date.now();
  let client = null;
  const timeout = options.timeout || 15000; // Default 15s timeout
  const queryId = options.queryId || `query_${Date.now()}_${require('crypto').randomBytes(6).toString('hex')}`;

  try {
    // Get client from pool with timeout
    client = await Promise.race([
      postgresPool.connect(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Connection timeout')), 5000)
      )
    ]);

    // Execute query with configurable timeout
    const result = await Promise.race([
      client.query(text, params),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Query timeout')), timeout)
      )
    ]);

    const duration = Date.now() - start;

    // Enhanced query monitoring with different thresholds
    const queryType = text.trim().split(' ')[0].toUpperCase();
    const isSlow = duration > 1000;
    const isModerate = duration > 500;
    const isCritical = duration > 5000;

    if (isCritical) {
      logger.error('Critical slow query detected', {
        queryId,
        text: text.substring(0, 200) + '...',
        duration: `${duration}ms`,
        rows: result.rowCount,
        queryType,
        timestamp: new Date().toISOString(),
        params: params.length > 0 ? params.slice(0, 3) : [] // Log first 3 params only
      });
    } else if (isSlow) {
      logger.warn('Slow query detected', {
        queryId,
        text: text.substring(0, 100) + '...',
        duration: `${duration}ms`,
        rows: result.rowCount,
        queryType,
        timestamp: new Date().toISOString()
      });
    } else if (isModerate) {
      logger.info('Moderate query time', {
        queryId,
        text: text.substring(0, 50) + '...',
        duration: `${duration}ms`,
        rows: result.rowCount,
        queryType
      });
    } else {
      logger.debug('Query executed', {
        queryId,
        duration: `${duration}ms`,
        rows: result.rowCount,
        queryType
      });
    }

    // Track query metrics for monitoring
    trackQueryMetrics(queryType, duration, result.rowCount, isSlow);

    return result;
  } catch (error) {
    const duration = Date.now() - start;
    logger.error('Query error', {
      queryId,
      text: text.substring(0, 100) + '...',
      duration: `${duration}ms`,
      error: error.message,
      code: error.code,
      detail: error.detail,
      params: params.length > 0 ? params.slice(0, 3) : []
    });

    // Handle specific PostgreSQL errors with retry logic
    if (error.code === 'ECONNRESET' || error.code === 'ENOTFOUND') {
      logger.error('Database connection lost, attempting to reconnect...');
      // Trigger reconnection attempt
      setTimeout(() => {
        initPostgreSQL().catch(err =>
          logger.error('Reconnection attempt failed:', err.message)
        );
      }, 1000);
    }

    throw error;
  } finally {
    // Always release the client back to the pool
    if (client) {
      client.release();
    }
  }
};

// Query metrics tracking for monitoring
const queryMetrics = {
  totalQueries: 0,
  slowQueries: 0,
  errors: 0,
  byType: new Map(),
  averageDuration: 0,
  maxDuration: 0
};

const trackQueryMetrics = (queryType, duration, rowCount, isSlow) => {
  queryMetrics.totalQueries++;
  if (isSlow) {queryMetrics.slowQueries++;}

  queryMetrics.averageDuration =
    (queryMetrics.averageDuration * (queryMetrics.totalQueries - 1) + duration) / queryMetrics.totalQueries;

  queryMetrics.maxDuration = Math.max(queryMetrics.maxDuration, duration);

  if (!queryMetrics.byType.has(queryType)) {
    queryMetrics.byType.set(queryType, { count: 0, totalDuration: 0, slowCount: 0 });
  }

  const typeMetrics = queryMetrics.byType.get(queryType);
  typeMetrics.count++;
  typeMetrics.totalDuration += duration;
  if (isSlow) {typeMetrics.slowCount++;}
};

// Get query performance metrics
const getQueryMetrics = () => {
  const slowQueryRate = queryMetrics.totalQueries > 0 ?
    (queryMetrics.slowQueries / queryMetrics.totalQueries * 100).toFixed(2) : 0;

  return {
    totalQueries: queryMetrics.totalQueries,
    slowQueries: queryMetrics.slowQueries,
    slowQueryRate: `${slowQueryRate}%`,
    averageDuration: `${queryMetrics.averageDuration.toFixed(2)}ms`,
    maxDuration: `${queryMetrics.maxDuration}ms`,
    byType: Object.fromEntries(
      Array.from(queryMetrics.byType.entries()).map(([type, metrics]) => [
        type,
        {
          count: metrics.count,
          averageDuration: `${(metrics.totalDuration / metrics.count).toFixed(2)}ms`,
          slowCount: metrics.slowCount,
          slowRate: `${(metrics.slowCount / metrics.count * 100).toFixed(2)}%`
        }
      ])
    )
  };
};

// MongoDB helper
const getMongoDB = () => {
  if (!mongoClient) {
    throw new Error('MongoDB not initialized');
  }
  return mongoClient.db('cryptopulse');
};

// Safe MongoDB helper that returns null if not available
const getMongoDBSafe = () => {
  if (!mongoClient) {
    return null;
  }
  return mongoClient.db('cryptopulse');
};

// Redis helper
const getRedis = () => {
  if (!redisClient) {
    throw new Error('Redis not initialized');
  }
  return redisClient;
};

// Safe Redis helper that returns null if not available
const getRedisSafe = () => {
  if (!redisClient) {
    return null;
  }
  return redisClient;
};

// Database models
const User = {
  async create(userData) {
    const { email, password, firstName, lastName } = userData;
    const queryText = `
    INSERT INTO users (email, password, first_name, last_name, created_at, updated_at)
    VALUES ($1, $2, $3, $4, NOW(), NOW())
    RETURNING id, email, first_name, last_name, created_at
  `;
    const values = [email, password, firstName, lastName];
    const result = await query(queryText, values);
    return result.rows[0];
  },

  async findByEmail(email) {
    const queryText = 'SELECT * FROM users WHERE email = $1';
    const result = await query(queryText, [email]);
    return result.rows[0];
  },

  async findById(id) {
    const queryText = 'SELECT * FROM users WHERE id = $1';
    const result = await query(queryText, [id]);
    return result.rows[0];
  },

  async update(id, updateData) {
    const fields = Object.keys(updateData).map((key, index) => `${key} = $${index + 2}`);
    const values = Object.values(updateData);
    const queryText = `
    UPDATE users
    SET ${fields.join(', ')}, updated_at = NOW()
    WHERE id = $1
    RETURNING *
  `;
    const result = await query(queryText, [id, ...values]);
    return result.rows[0];
  }
};

const Trade = {
  async create(tradeData) {
    const { userId, exchange, symbol, side, amount, price, status } = tradeData;
    const queryText = `
    INSERT INTO trades (user_id, exchange, symbol, side, amount, price, status, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
    RETURNING *
  `;
    const values = [userId, exchange, symbol, side, amount, price, status];
    const result = await query(queryText, values);
    return result.rows[0];
  },

  async findByUserId(userId, limit = 50, offset = 0) {
    const queryText = `
    SELECT * FROM trades
    WHERE user_id = $1
    ORDER BY created_at DESC
    LIMIT $2 OFFSET $3
  `;
    const result = await query(queryText, [userId, limit, offset]);
    return result.rows;
  },

  async findByExchange(exchange, limit = 50, offset = 0) {
    const queryText = `
    SELECT * FROM trades
    WHERE exchange = $1
    ORDER BY created_at DESC
    LIMIT $2 OFFSET $3
  `;
    const result = await query(queryText, [exchange, limit, offset]);
    return result.rows;
  }
};

const ExchangeConfig = {
  async create(configData) {
    const { userId, exchange, apiKey, secretKey, passphrase } = configData;
    const queryText = `
    INSERT INTO exchange_configs (user_id, exchange, api_key, secret_key, passphrase, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
    ON CONFLICT (user_id, exchange)
    DO UPDATE SET api_key = $3, secret_key = $4, passphrase = $5, updated_at = NOW()
    RETURNING *
  `;
    const values = [userId, exchange, apiKey, secretKey, passphrase];
    const result = await query(queryText, values);
    return result.rows[0];
  },

  async findByUserId(userId) {
    const queryText = 'SELECT * FROM exchange_configs WHERE user_id = $1';
    const result = await query(queryText, [userId]);
    return result.rows;
  },

  async findByExchange(userId, exchange) {
    const queryText = 'SELECT * FROM exchange_configs WHERE user_id = $1 AND exchange = $2';
    const result = await query(queryText, [userId, exchange]);
    return result.rows[0];
  }
};

const TradingStrategy = {
  async create(strategyData) {
    const { userId, name, description, strategyType, parameters, isActive } = strategyData;
    const queryText = `
      INSERT INTO trading_strategies (user_id, name, description, strategy_type, parameters, is_active, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      RETURNING *
    `;
    const values = [userId, name, description, strategyType, JSON.stringify(parameters), isActive];
    const result = await query(queryText, values);
    return result.rows[0];
  },

  async findByUserId(userId) {
    const queryText = 'SELECT * FROM trading_strategies WHERE user_id = $1 ORDER BY created_at DESC';
    const result = await query(queryText, [userId]);
    return result.rows.map(row => ({
      ...row,
      parameters: JSON.parse(row.parameters)
    }));
  },

  async findByIdAndUpdate(filter, updates, _options = {}) {
    const { _id, userId } = filter;
    const setClause = Object.keys(updates)
      .map((key, index) => `${key} = $${index + 3}`)
      .join(', ');

    const queryText = `
      UPDATE trading_strategies 
      SET ${setClause}, updated_at = NOW()
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `;

    const values = [_id, userId, ...Object.values(updates)];
    const result = await query(queryText, values);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      ...row,
      parameters: JSON.parse(row.parameters)
    };
  },

  async findOneAndDelete(filter) {
    const { _id, userId } = filter;
    const queryText = 'DELETE FROM trading_strategies WHERE id = $1 AND user_id = $2 RETURNING *';
    const result = await query(queryText, [_id, userId]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      ...row,
      parameters: JSON.parse(row.parameters)
    };
  },

  async findActive() {
    const queryText = 'SELECT * FROM trading_strategies WHERE is_active = true ORDER BY created_at DESC';
    const result = await query(queryText);
    return result.rows.map(row => ({
      ...row,
      parameters: JSON.parse(row.parameters)
    }));
  },

  async find(filter) {
    const { userId, isActive } = filter;
    let queryText = 'SELECT * FROM trading_strategies WHERE 1=1';
    const values = [];
    let paramCount = 0;

    if (userId) {
      paramCount++;
      queryText += ` AND user_id = $${paramCount}`;
      values.push(userId);
    }

    if (isActive !== undefined) {
      paramCount++;
      queryText += ` AND is_active = $${paramCount}`;
      values.push(isActive);
    }

    queryText += ' ORDER BY created_at DESC';

    const result = await query(queryText, values);
    return result.rows.map(row => ({
      ...row,
      parameters: JSON.parse(row.parameters)
    }));
  }
};

// Cache helpers
const Cache = {
  async get(key) {
    if (!redisClient) {
      return null;
    }
    try {
      const value = await redisClient.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Cache get error:', error);
      return null;
    }
  },

  async set(key, value, ttl = 300) {
    if (!redisClient) {
      return;
    }
    try {
      await redisClient.setEx(key, ttl, JSON.stringify(value));
    } catch (error) {
      logger.error('Cache set error:', error);
    }
  },

  async del(key) {
    if (!redisClient) {
      return;
    }
    try {
      await redisClient.del(key);
    } catch (error) {
      logger.error('Cache del error:', error);
    }
  },

  async clear() {
    if (!redisClient) {
      return;
    }
    try {
      await redisClient.flushAll();
    } catch (error) {
      logger.error('Cache clear error:', error);
    }
  }
};

// Connection health monitoring
const healthCheck = async() => {
  const health = {
    postgres: { status: 'unknown', latency: null, error: null },
    mongo: { status: 'unknown', latency: null, error: null },
    redis: { status: 'unknown', latency: null, error: null },
    timestamp: new Date().toISOString()
  };

  // Check PostgreSQL
  if (postgresPool) {
    try {
      const start = Date.now();
      const client = await postgresPool.connect();
      await client.query('SELECT 1');
      client.release();
      health.postgres = {
        status: 'healthy',
        latency: Date.now() - start,
        error: null
      };
    } catch (error) {
      health.postgres = {
        status: 'unhealthy',
        latency: null,
        error: error.message
      };
    }
  } else {
    health.postgres = { status: 'not_initialized', latency: null, error: null };
  }

  // Check MongoDB
  if (mongoClient) {
    try {
      const start = Date.now();
      await mongoClient.db('admin').command({ ping: 1 });
      health.mongo = {
        status: 'healthy',
        latency: Date.now() - start,
        error: null
      };
    } catch (error) {
      health.mongo = {
        status: 'unhealthy',
        latency: null,
        error: error.message
      };
    }
  } else {
    health.mongo = { status: 'not_initialized', latency: null, error: null };
  }

  // Check Redis
  if (redisClient) {
    try {
      const start = Date.now();
      await redisClient.ping();
      health.redis = {
        status: 'healthy',
        latency: Date.now() - start,
        error: null
      };
    } catch (error) {
      health.redis = {
        status: 'unhealthy',
        latency: null,
        error: error.message
      };
    }
  } else {
    health.redis = { status: 'not_initialized', latency: null, error: null };
  }

  return health;
};

// Automatic reconnection for failed connections
const reconnectOnFailure = async() => {
  const health = await healthCheck();

  // Reconnect PostgreSQL if unhealthy
  if (health.postgres.status === 'unhealthy') {
    logger.info('Attempting to reconnect PostgreSQL...');
    try {
      await initPostgreSQL();
      logger.info('✅ PostgreSQL reconnected successfully');
    } catch (error) {
      logger.error('❌ PostgreSQL reconnection failed:', error.message);
    }
  }

  // Reconnect MongoDB if unhealthy
  if (health.mongo.status === 'unhealthy') {
    logger.info('Attempting to reconnect MongoDB...');
    try {
      await initMongoDB();
      logger.info('✅ MongoDB reconnected successfully');
    } catch (error) {
      logger.error('❌ MongoDB reconnection failed:', error.message);
    }
  }

  // Reconnect Redis if unhealthy
  if (health.redis.status === 'unhealthy') {
    logger.info('Attempting to reconnect Redis...');
    try {
      await initRedis();
      logger.info('✅ Redis reconnected successfully');
    } catch (error) {
      logger.error('❌ Redis reconnection failed:', error.message);
    }
  }
};

// Start health monitoring
const startHealthMonitoring = () => {
  // Check health every 30 seconds
  const healthInterval = setInterval(async() => {
    const health = await healthCheck();

    // Log any unhealthy services
    if (health.postgres.status === 'unhealthy') {
      logger.warn('PostgreSQL health check failed:', health.postgres.error);
    }
    if (health.mongo.status === 'unhealthy') {
      logger.warn('MongoDB health check failed:', health.mongo.error);
    }
    if (health.redis.status === 'unhealthy') {
      logger.warn('Redis health check failed:', health.redis.error);
    }

    // Attempt reconnection if any service is unhealthy
    const hasUnhealthyServices =
      health.postgres.status === 'unhealthy' ||
      health.mongo.status === 'unhealthy' ||
      health.redis.status === 'unhealthy';

    if (hasUnhealthyServices) {
      await reconnectOnFailure();
    }
  }, 30000); // 30 seconds

  // Return cleanup function
  return () => clearInterval(healthInterval);
};

// Close all connections
const closeConnections = async() => {
  try {
    if (postgresPool) {
      await postgresPool.end();
      logger.info('✅ PostgreSQL connection closed');
    }
    if (mongoClient) {
      await mongoClient.close();
      logger.info('✅ MongoDB connection closed');
    }
    if (redisClient) {
      await redisClient.quit();
      logger.info('✅ Redis connection closed');
    }
  } catch (error) {
    logger.error('Error closing connections:', error);
  }
};

// Export database utilities
module.exports = {
  initDatabases,
  query,
  getMongoDB,
  getMongoDBSafe,
  getRedis,
  getRedisSafe,
  User,
  Trade,
  ExchangeConfig,
  TradingStrategy,
  Cache,
  healthCheck,
  reconnectOnFailure,
  startHealthMonitoring,
  closeConnections,
  // Enhanced monitoring
  getQueryMetrics,
  trackQueryMetrics
};
