/**
 * Database Connection Manager
 * 
 * This module handles database connections, connection pooling,
 * and provides a centralized way to access database instances.
 * 
 * @author Shrikant Telang
 * @version 1.0.0
 */

const { Sequelize } = require('sequelize');
const { MongoClient } = require('mongodb');
const mongoose = require('mongoose');
const { structuredLogger } = require('../structuredLogger');
const { getDatabaseConfig, getRedisConfig } = require('../config/environment');

// Database instances
let sequelize = null;
let mongoClient = null;
let mongooseConnection = null;
let redisClient = null;

// Connection status
let isConnected = false;
let connectionRetries = 0;
const maxRetries = 5;
const retryDelay = 5000;

/**
 * Initialize database connections
 */
async function initializeConnections() {
  try {
    structuredLogger.info('Initializing database connections...');
    
    // Initialize PostgreSQL connection
    await initializePostgreSQL();
    
    // Initialize MongoDB connection
    await initializeMongoDB();
    
    // Initialize Redis connection
    await initializeRedis();
    
    isConnected = true;
    structuredLogger.info('All database connections initialized successfully');
    
  } catch (error) {
    structuredLogger.error('Failed to initialize database connections:', error);
    throw error;
  }
}

/**
 * Initialize PostgreSQL connection
 */
async function initializePostgreSQL() {
  try {
    const dbConfig = getDatabaseConfig();
    
    sequelize = new Sequelize(dbConfig.url, {
      dialect: 'postgres',
      host: dbConfig.host,
      port: dbConfig.port,
      database: dbConfig.database,
      username: dbConfig.username,
      password: dbConfig.password,
      ssl: dbConfig.ssl,
      pool: {
        min: dbConfig.pool.min,
        max: dbConfig.pool.max,
        acquire: 30000,
        idle: 10000
      },
      logging: (msg) => structuredLogger.debug(msg),
      define: {
        timestamps: true,
        underscored: true,
        freezeTableName: true
      }
    });
    
    // Test connection
    await sequelize.authenticate();
    structuredLogger.info('PostgreSQL connection established successfully');
    
  } catch (error) {
    structuredLogger.error('Failed to initialize PostgreSQL connection:', error);
    throw error;
  }
}

/**
 * Initialize MongoDB connection
 */
async function initializeMongoDB() {
  try {
    const dbConfig = getDatabaseConfig();
    
    // MongoDB connection string
    const mongoUrl = `mongodb://${dbConfig.username}:${dbConfig.password}@${dbConfig.host}:${dbConfig.port || 27017}/${dbConfig.database}`;
    
    // Initialize MongoDB client
    mongoClient = new MongoClient(mongoUrl, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    
    // Connect to MongoDB
    await mongoClient.connect();
    structuredLogger.info('MongoDB connection established successfully');
    
    // Initialize Mongoose connection
    await mongoose.connect(mongoUrl, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    
    mongooseConnection = mongoose.connection;
    structuredLogger.info('Mongoose connection established successfully');
    
  } catch (error) {
    structuredLogger.error('Failed to initialize MongoDB connection:', error);
    throw error;
  }
}

/**
 * Initialize Redis connection
 */
async function initializeRedis() {
  try {
    const redisConfig = getRedisConfig();
    
    // Import Redis client
    const { createClient } = require('redis');
    
    redisClient = createClient({
      url: redisConfig.url,
      host: redisConfig.host,
      port: redisConfig.port,
      password: redisConfig.password,
      db: redisConfig.db,
      retry_strategy: (options) => {
        if (options.error && options.error.code === 'ECONNREFUSED') {
          structuredLogger.error('Redis server connection refused');
          return new Error('Redis server connection refused');
        }
        if (options.total_retry_time > 1000 * 60 * 60) {
          structuredLogger.error('Redis retry time exhausted');
          return new Error('Retry time exhausted');
        }
        if (options.attempt > 10) {
          structuredLogger.error('Redis max retry attempts reached');
          return undefined;
        }
        return Math.min(options.attempt * 100, 3000);
      }
    });
    
    // Handle Redis events
    redisClient.on('error', (err) => {
      structuredLogger.error('Redis client error:', err);
    });
    
    redisClient.on('connect', () => {
      structuredLogger.info('Redis client connected');
    });
    
    redisClient.on('ready', () => {
      structuredLogger.info('Redis client ready');
    });
    
    redisClient.on('end', () => {
      structuredLogger.warn('Redis client connection ended');
    });
    
    // Connect to Redis
    await redisClient.connect();
    structuredLogger.info('Redis connection established successfully');
    
  } catch (error) {
    structuredLogger.error('Failed to initialize Redis connection:', error);
    throw error;
  }
}

/**
 * Get PostgreSQL connection
 */
function getPostgreSQLConnection() {
  if (!sequelize) {
    throw new Error('PostgreSQL connection not initialized');
  }
  return sequelize;
}

/**
 * Get MongoDB client
 */
function getMongoDBClient() {
  if (!mongoClient) {
    throw new Error('MongoDB client not initialized');
  }
  return mongoClient;
}

/**
 * Get MongoDB database
 */
function getMongoDBDatabase(dbName = null) {
  const client = getMongoDBClient();
  const dbConfig = getDatabaseConfig();
  return client.db(dbName || dbConfig.database);
}

/**
 * Get Mongoose connection
 */
function getMongooseConnection() {
  if (!mongooseConnection) {
    throw new Error('Mongoose connection not initialized');
  }
  return mongooseConnection;
}

/**
 * Get Redis client
 */
function getRedisClient() {
  if (!redisClient) {
    throw new Error('Redis client not initialized');
  }
  return redisClient;
}

/**
 * Check if all connections are healthy
 */
async function checkConnectionsHealth() {
  const health = {
    postgresql: false,
    mongodb: false,
    redis: false,
    overall: false
  };
  
  try {
    // Check PostgreSQL
    if (sequelize) {
      await sequelize.authenticate();
      health.postgresql = true;
    }
  } catch (error) {
    structuredLogger.error('PostgreSQL health check failed:', error);
  }
  
  try {
    // Check MongoDB
    if (mongoClient) {
      await mongoClient.db().admin().ping();
      health.mongodb = true;
    }
  } catch (error) {
    structuredLogger.error('MongoDB health check failed:', error);
  }
  
  try {
    // Check Redis
    if (redisClient) {
      await redisClient.ping();
      health.redis = true;
    }
  } catch (error) {
    structuredLogger.error('Redis health check failed:', error);
  }
  
  health.overall = health.postgresql && health.mongodb && health.redis;
  
  return health;
}

/**
 * Close all connections
 */
async function closeConnections() {
  try {
    structuredLogger.info('Closing database connections...');
    
    // Close PostgreSQL connection
    if (sequelize) {
      await sequelize.close();
      structuredLogger.info('PostgreSQL connection closed');
    }
    
    // Close MongoDB connection
    if (mongoClient) {
      await mongoClient.close();
      structuredLogger.info('MongoDB connection closed');
    }
    
    // Close Mongoose connection
    if (mongooseConnection) {
      await mongoose.connection.close();
      structuredLogger.info('Mongoose connection closed');
    }
    
    // Close Redis connection
    if (redisClient) {
      await redisClient.quit();
      structuredLogger.info('Redis connection closed');
    }
    
    isConnected = false;
    structuredLogger.info('All database connections closed');
    
  } catch (error) {
    structuredLogger.error('Error closing database connections:', error);
    throw error;
  }
}

/**
 * Reconnect to all databases
 */
async function reconnect() {
  try {
    structuredLogger.info('Reconnecting to databases...');
    
    // Close existing connections
    await closeConnections();
    
    // Wait before reconnecting
    await new Promise(resolve => setTimeout(resolve, retryDelay));
    
    // Reinitialize connections
    await initializeConnections();
    
    structuredLogger.info('Database reconnection completed');
    
  } catch (error) {
    structuredLogger.error('Database reconnection failed:', error);
    throw error;
  }
}

/**
 * Get connection status
 */
function getConnectionStatus() {
  return {
    isConnected,
    postgresql: !!sequelize,
    mongodb: !!mongoClient,
    redis: !!redisClient,
    retries: connectionRetries
  };
}

/**
 * Handle connection errors
 */
function handleConnectionError(error, connectionType) {
  structuredLogger.error(`${connectionType} connection error:`, error);
  
  connectionRetries++;
  
  if (connectionRetries < maxRetries) {
    structuredLogger.info(`Retrying ${connectionType} connection in ${retryDelay}ms...`);
    setTimeout(() => {
      reconnect();
    }, retryDelay);
  } else {
    structuredLogger.error(`Max retries reached for ${connectionType} connection`);
    throw error;
  }
}

/**
 * Transaction wrapper for PostgreSQL
 */
async function withTransaction(callback) {
  const transaction = await sequelize.transaction();
  
  try {
    const result = await callback(transaction);
    await transaction.commit();
    return result;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

/**
 * Transaction wrapper for MongoDB
 */
async function withMongoTransaction(callback) {
  const session = mongoClient.startSession();
  
  try {
    await session.withTransaction(async () => {
      return await callback(session);
    });
  } finally {
    await session.endSession();
  }
}

module.exports = {
  initializeConnections,
  getPostgreSQLConnection,
  getMongoDBClient,
  getMongoDBDatabase,
  getMongooseConnection,
  getRedisClient,
  checkConnectionsHealth,
  closeConnections,
  reconnect,
  getConnectionStatus,
  handleConnectionError,
  withTransaction,
  withMongoTransaction
};
