// =============================================================================
// Database Operation Tests - Production Ready
// =============================================================================
// Comprehensive tests for database connections, queries, and operations

// Set up test environment before importing database module
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/cryptopulse_test';
process.env.REDIS_URL = 'redis://localhost:6379/15';
process.env.MONGODB_URI = 'mongodb://localhost:27017/cryptopulse_test';

const { 
  initPostgreSQL,
  initMongoDB,
  initRedis,
  getPostgreSQL,
  getMongoDB,
  getRedis,
  getRedisSafe,
  executeQuery,
  executeTransaction,
  closeConnections,
  healthCheck,
  getConnectionStats
} = require('../lib/database');

const { createMockDbResponse, createMockRedisClient } = require('./testHelpers');

// Mock logger to avoid console output during tests
jest.mock('../lib/logging', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
}));

// Mock database clients
jest.mock('pg', () => ({
  Pool: jest.fn().mockImplementation(() => ({
    connect: jest.fn(),
    query: jest.fn(),
    end: jest.fn(),
    on: jest.fn(),
    totalCount: 0,
    idleCount: 0,
    waitingCount: 0
  }))
}));

jest.mock('mongodb', () => ({
  MongoClient: {
    connect: jest.fn()
  }
}));

jest.mock('redis', () => ({
  createClient: jest.fn().mockImplementation(() => ({
    connect: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    exists: jest.fn(),
    expire: jest.fn(),
    quit: jest.fn(),
    on: jest.fn(),
    ping: jest.fn()
  }))
}));

describe('Database Operations', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
  });

  afterEach(async () => {
    // Clean up connections after each test
    await closeConnections();
  });

  describe('PostgreSQL Connection', () => {
    test('should initialize PostgreSQL connection', async () => {
      const { Pool } = require('pg');
      const mockPool = {
        connect: jest.fn(),
        query: jest.fn().mockResolvedValue(createMockDbResponse()),
        end: jest.fn(),
        on: jest.fn(),
        totalCount: 5,
        idleCount: 3,
        waitingCount: 0
      };
      Pool.mockImplementation(() => mockPool);

      await initPostgreSQL();
      
      expect(Pool).toHaveBeenCalledWith({
        connectionString: process.env.DATABASE_URL,
        ssl: false,
        max: 25,
        min: 3,
        idleTimeoutMillis: 20000,
        connectionTimeoutMillis: 8000,
        acquireTimeoutMillis: 8000,
        createTimeoutMillis: 8000,
        allowExitOnIdle: false,
        statement_timeout: 15000,
        query_timeout: 15000,
        application_name: 'cryptopulse-backend',
        keepAlive: true,
        keepAliveInitialDelayMillis: 10000,
        maxUses: 7500,
        maxLifetime: 1800000
      });
    });

    test('should handle PostgreSQL connection errors', async () => {
      const { Pool } = require('pg');
      const mockPool = {
        connect: jest.fn().mockRejectedValue(new Error('Connection failed')),
        query: jest.fn(),
        end: jest.fn(),
        on: jest.fn()
      };
      Pool.mockImplementation(() => mockPool);

      await expect(initPostgreSQL()).rejects.toThrow('Connection failed');
    });

    test('should get PostgreSQL pool instance', async () => {
      const { Pool } = require('pg');
      const mockPool = {
        connect: jest.fn(),
        query: jest.fn().mockResolvedValue(createMockDbResponse()),
        end: jest.fn(),
        on: jest.fn(),
        totalCount: 5,
        idleCount: 3,
        waitingCount: 0
      };
      Pool.mockImplementation(() => mockPool);

      await initPostgreSQL();
      const pool = getPostgreSQL();
      
      expect(pool).toBeDefined();
      expect(pool.query).toBeDefined();
    });

    test('should execute PostgreSQL queries', async () => {
      const { Pool } = require('pg');
      const mockPool = {
        connect: jest.fn(),
        query: jest.fn().mockResolvedValue(createMockDbResponse([{ id: 1, name: 'test' }])),
        end: jest.fn(),
        on: jest.fn()
      };
      Pool.mockImplementation(() => mockPool);

      await initPostgreSQL();
      
      const result = await executeQuery('SELECT * FROM users WHERE id = $1', [1]);
      
      expect(mockPool.query).toHaveBeenCalledWith('SELECT * FROM users WHERE id = $1', [1]);
      expect(result).toBeDefined();
      expect(result.rows).toHaveLength(1);
    });

    test('should handle PostgreSQL query errors', async () => {
      const { Pool } = require('pg');
      const mockPool = {
        connect: jest.fn(),
        query: jest.fn().mockRejectedValue(new Error('Query failed')),
        end: jest.fn(),
        on: jest.fn()
      };
      Pool.mockImplementation(() => mockPool);

      await initPostgreSQL();
      
      await expect(executeQuery('SELECT * FROM invalid_table')).rejects.toThrow('Query failed');
    });

    test('should execute PostgreSQL transactions', async () => {
      const { Pool } = require('pg');
      const mockClient = {
        query: jest.fn().mockResolvedValue(createMockDbResponse()),
        release: jest.fn()
      };
      const mockPool = {
        connect: jest.fn().mockResolvedValue(mockClient),
        query: jest.fn(),
        end: jest.fn(),
        on: jest.fn()
      };
      Pool.mockImplementation(() => mockPool);

      await initPostgreSQL();
      
      const queries = [
        'INSERT INTO users (name) VALUES ($1)',
        'UPDATE users SET updated_at = NOW() WHERE name = $1'
      ];
      const params = [['John'], ['John']];
      
      await executeTransaction(queries, params);
      
      expect(mockClient.query).toHaveBeenCalledTimes(3); // BEGIN, queries, COMMIT
      expect(mockClient.release).toHaveBeenCalled();
    });

    test('should rollback PostgreSQL transactions on error', async () => {
      const { Pool } = require('pg');
      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce(createMockDbResponse()) // BEGIN
          .mockRejectedValueOnce(new Error('Query failed')), // First query fails
        release: jest.fn()
      };
      const mockPool = {
        connect: jest.fn().mockResolvedValue(mockClient),
        query: jest.fn(),
        end: jest.fn(),
        on: jest.fn()
      };
      Pool.mockImplementation(() => mockPool);

      await initPostgreSQL();
      
      const queries = ['SELECT * FROM invalid_table'];
      const params = [[]];
      
      await expect(executeTransaction(queries, params)).rejects.toThrow('Query failed');
      
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('MongoDB Connection', () => {
    test('should initialize MongoDB connection', async () => {
      const { MongoClient } = require('mongodb');
      const mockClient = {
        db: jest.fn().mockReturnValue({
          collection: jest.fn().mockReturnValue({
            find: jest.fn().mockReturnValue({
              toArray: jest.fn().mockResolvedValue([])
            }),
            insertOne: jest.fn().mockResolvedValue({ insertedId: 'test-id' }),
            updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
            deleteOne: jest.fn().mockResolvedValue({ deletedCount: 1 })
          })
        }),
        close: jest.fn()
      };
      MongoClient.connect.mockResolvedValue(mockClient);

      await initMongoDB();
      
      expect(MongoClient.connect).toHaveBeenCalledWith(process.env.MONGODB_URI);
    });

    test('should handle MongoDB connection errors', async () => {
      const { MongoClient } = require('mongodb');
      MongoClient.connect.mockRejectedValue(new Error('MongoDB connection failed'));

      await expect(initMongoDB()).rejects.toThrow('MongoDB connection failed');
    });

    test('should get MongoDB client instance', async () => {
      const { MongoClient } = require('mongodb');
      const mockClient = {
        db: jest.fn().mockReturnValue({
          collection: jest.fn().mockReturnValue({
            find: jest.fn().mockReturnValue({
              toArray: jest.fn().mockResolvedValue([])
            })
          })
        }),
        close: jest.fn()
      };
      MongoClient.connect.mockResolvedValue(mockClient);

      await initMongoDB();
      const client = getMongoDB();
      
      expect(client).toBeDefined();
      expect(client.db).toBeDefined();
    });

    test('should perform MongoDB operations', async () => {
      const { MongoClient } = require('mongodb');
      const mockCollection = {
        find: jest.fn().mockReturnValue({
          toArray: jest.fn().mockResolvedValue([{ _id: 'test-id', name: 'test' }])
        }),
        insertOne: jest.fn().mockResolvedValue({ insertedId: 'new-id' }),
        updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
        deleteOne: jest.fn().mockResolvedValue({ deletedCount: 1 })
      };
      const mockDb = {
        collection: jest.fn().mockReturnValue(mockCollection)
      };
      const mockClient = {
        db: jest.fn().mockReturnValue(mockDb),
        close: jest.fn()
      };
      MongoClient.connect.mockResolvedValue(mockClient);

      await initMongoDB();
      const client = getMongoDB();
      const db = client.db('cryptopulse_test');
      const collection = db.collection('users');

      // Test find operation
      const documents = await collection.find({}).toArray();
      expect(documents).toHaveLength(1);
      expect(mockCollection.find).toHaveBeenCalledWith({});

      // Test insert operation
      const insertResult = await collection.insertOne({ name: 'new user' });
      expect(insertResult.insertedId).toBe('new-id');
      expect(mockCollection.insertOne).toHaveBeenCalledWith({ name: 'new user' });

      // Test update operation
      const updateResult = await collection.updateOne({ _id: 'test-id' }, { $set: { name: 'updated' } });
      expect(updateResult.modifiedCount).toBe(1);
      expect(mockCollection.updateOne).toHaveBeenCalledWith({ _id: 'test-id' }, { $set: { name: 'updated' } });

      // Test delete operation
      const deleteResult = await collection.deleteOne({ _id: 'test-id' });
      expect(deleteResult.deletedCount).toBe(1);
      expect(mockCollection.deleteOne).toHaveBeenCalledWith({ _id: 'test-id' });
    });
  });

  describe('Redis Connection', () => {
    test('should initialize Redis connection', async () => {
      const Redis = require('redis');
      const mockClient = createMockRedisClient();
      mockClient.connect.mockResolvedValue();
      Redis.createClient.mockReturnValue(mockClient);

      await initRedis();
      
      expect(Redis.createClient).toHaveBeenCalledWith({
        url: process.env.REDIS_URL,
        socket: {
          connectTimeout: 5000,
          lazyConnect: true,
          keepAlive: true
        },
        retry_strategy: expect.any(Function)
      });
      expect(mockClient.connect).toHaveBeenCalled();
    });

    test('should handle Redis connection errors', async () => {
      const Redis = require('redis');
      const mockClient = createMockRedisClient();
      mockClient.connect.mockRejectedValue(new Error('Redis connection failed'));
      Redis.createClient.mockReturnValue(mockClient);

      await expect(initRedis()).rejects.toThrow('Redis connection failed');
    });

    test('should get Redis client instance', async () => {
      const Redis = require('redis');
      const mockClient = createMockRedisClient();
      mockClient.connect.mockResolvedValue();
      Redis.createClient.mockReturnValue(mockClient);

      await initRedis();
      const client = getRedis();
      
      expect(client).toBeDefined();
      expect(client.get).toBeDefined();
    });

    test('should get Redis client safely (handles null)', () => {
      // Test when Redis is not initialized
      const client = getRedisSafe();
      expect(client).toBeNull();
    });

    test('should perform Redis operations', async () => {
      const Redis = require('redis');
      const mockClient = createMockRedisClient();
      mockClient.connect.mockResolvedValue();
      Redis.createClient.mockReturnValue(mockClient);

      await initRedis();
      const client = getRedis();

      // Test set operation
      await client.set('test:key', 'test:value');
      expect(mockClient.set).toHaveBeenCalledWith('test:key', 'test:value');

      // Test get operation
      mockClient.get.mockResolvedValue('test:value');
      const value = await client.get('test:key');
      expect(value).toBe('test:value');
      expect(mockClient.get).toHaveBeenCalledWith('test:key');

      // Test exists operation
      mockClient.exists.mockResolvedValue(1);
      const exists = await client.exists('test:key');
      expect(exists).toBe(1);
      expect(mockClient.exists).toHaveBeenCalledWith('test:key');

      // Test delete operation
      mockClient.del.mockResolvedValue(1);
      const deleted = await client.del('test:key');
      expect(deleted).toBe(1);
      expect(mockClient.del).toHaveBeenCalledWith('test:key');

      // Test expire operation
      mockClient.expire.mockResolvedValue(1);
      const expired = await client.expire('test:key', 3600);
      expect(expired).toBe(1);
      expect(mockClient.expire).toHaveBeenCalledWith('test:key', 3600);
    });

    test('should handle Redis operation errors', async () => {
      const Redis = require('redis');
      const mockClient = createMockRedisClient();
      mockClient.connect.mockResolvedValue();
      mockClient.get.mockRejectedValue(new Error('Redis operation failed'));
      Redis.createClient.mockReturnValue(mockClient);

      await initRedis();
      const client = getRedis();

      await expect(client.get('test:key')).rejects.toThrow('Redis operation failed');
    });
  });

  describe('Health Checks', () => {
    test('should perform health check for all databases', async () => {
      // Mock PostgreSQL
      const { Pool } = require('pg');
      const mockPool = {
        query: jest.fn().mockResolvedValue(createMockDbResponse([{ version: 'PostgreSQL 13.0' }])),
        totalCount: 5,
        idleCount: 3,
        waitingCount: 0
      };
      Pool.mockImplementation(() => mockPool);

      // Mock MongoDB
      const { MongoClient } = require('mongodb');
      const mockClient = {
        db: jest.fn().mockReturnValue({
          admin: jest.fn().mockReturnValue({
            ping: jest.fn().mockResolvedValue({ ok: 1 })
          })
        })
      };
      MongoClient.connect.mockResolvedValue(mockClient);

      // Mock Redis
      const Redis = require('redis');
      const mockRedisClient = createMockRedisClient();
      mockRedisClient.connect.mockResolvedValue();
      mockRedisClient.ping.mockResolvedValue('PONG');
      Redis.createClient.mockReturnValue(mockRedisClient);

      await initPostgreSQL();
      await initMongoDB();
      await initRedis();

      const health = await healthCheck();
      
      expect(health).toHaveProperty('postgresql');
      expect(health).toHaveProperty('mongodb');
      expect(health).toHaveProperty('redis');
      expect(health.postgresql.status).toBe('healthy');
      expect(health.mongodb.status).toBe('healthy');
      expect(health.redis.status).toBe('healthy');
    });

    test('should detect unhealthy databases', async () => {
      // Mock PostgreSQL with error
      const { Pool } = require('pg');
      const mockPool = {
        query: jest.fn().mockRejectedValue(new Error('Connection failed')),
        totalCount: 0,
        idleCount: 0,
        waitingCount: 0
      };
      Pool.mockImplementation(() => mockPool);

      await initPostgreSQL();

      const health = await healthCheck();
      
      expect(health.postgresql.status).toBe('unhealthy');
      expect(health.postgresql.error).toBeDefined();
    });
  });

  describe('Connection Statistics', () => {
    test('should get connection statistics', async () => {
      const { Pool } = require('pg');
      const mockPool = {
        query: jest.fn().mockResolvedValue(createMockDbResponse()),
        totalCount: 10,
        idleCount: 5,
        waitingCount: 2
      };
      Pool.mockImplementation(() => mockPool);

      await initPostgreSQL();
      const stats = getConnectionStats();
      
      expect(stats).toHaveProperty('postgresql');
      expect(stats.postgresql.totalConnections).toBe(10);
      expect(stats.postgresql.idleConnections).toBe(5);
      expect(stats.postgresql.waitingConnections).toBe(2);
    });

    test('should handle null connections in stats', () => {
      const stats = getConnectionStats();
      
      expect(stats).toHaveProperty('postgresql');
      expect(stats).toHaveProperty('mongodb');
      expect(stats).toHaveProperty('redis');
      expect(stats.postgresql.totalConnections).toBe(0);
    });
  });

  describe('Connection Cleanup', () => {
    test('should close all database connections', async () => {
      const { Pool } = require('pg');
      const mockPool = {
        end: jest.fn().mockResolvedValue(),
        totalCount: 0,
        idleCount: 0,
        waitingCount: 0
      };
      Pool.mockImplementation(() => mockPool);

      const { MongoClient } = require('mongodb');
      const mockClient = {
        close: jest.fn().mockResolvedValue()
      };
      MongoClient.connect.mockResolvedValue(mockClient);

      const Redis = require('redis');
      const mockRedisClient = createMockRedisClient();
      mockRedisClient.connect.mockResolvedValue();
      mockRedisClient.quit.mockResolvedValue();
      Redis.createClient.mockReturnValue(mockRedisClient);

      await initPostgreSQL();
      await initMongoDB();
      await initRedis();

      await closeConnections();

      expect(mockPool.end).toHaveBeenCalled();
      expect(mockClient.close).toHaveBeenCalled();
      expect(mockRedisClient.quit).toHaveBeenCalled();
    });

    test('should handle cleanup errors gracefully', async () => {
      const { Pool } = require('pg');
      const mockPool = {
        end: jest.fn().mockRejectedValue(new Error('Cleanup failed')),
        totalCount: 0,
        idleCount: 0,
        waitingCount: 0
      };
      Pool.mockImplementation(() => mockPool);

      await initPostgreSQL();

      // Should not throw error during cleanup
      await expect(closeConnections()).resolves.not.toThrow();
    });
  });

  describe('Error Handling', () => {
    test('should handle missing environment variables', async () => {
      delete process.env.DATABASE_URL;
      
      await expect(initPostgreSQL()).rejects.toThrow('DATABASE_URL environment variable is not set');
    });

    test('should handle connection timeouts', async () => {
      const { Pool } = require('pg');
      const mockPool = {
        connect: jest.fn().mockImplementation(() => 
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Connection timeout')), 100)
          )
        ),
        query: jest.fn(),
        end: jest.fn(),
        on: jest.fn()
      };
      Pool.mockImplementation(() => mockPool);

      await expect(initPostgreSQL()).rejects.toThrow('Connection timeout');
    });

    test('should handle query timeouts', async () => {
      const { Pool } = require('pg');
      const mockPool = {
        connect: jest.fn(),
        query: jest.fn().mockImplementation(() => 
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Query timeout')), 100)
          )
        ),
        end: jest.fn(),
        on: jest.fn()
      };
      Pool.mockImplementation(() => mockPool);

      await initPostgreSQL();
      
      await expect(executeQuery('SELECT pg_sleep(10)')).rejects.toThrow('Query timeout');
    });
  });

  describe('Performance and Monitoring', () => {
    test('should track query execution time', async () => {
      const { Pool } = require('pg');
      const mockPool = {
        connect: jest.fn(),
        query: jest.fn().mockImplementation(() => 
          new Promise(resolve => setTimeout(() => resolve(createMockDbResponse()), 50))
        ),
        end: jest.fn(),
        on: jest.fn()
      };
      Pool.mockImplementation(() => mockPool);

      await initPostgreSQL();
      
      const startTime = Date.now();
      await executeQuery('SELECT * FROM users');
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeGreaterThanOrEqual(50);
    });

    test('should handle high connection usage', async () => {
      const { Pool } = require('pg');
      const mockPool = {
        connect: jest.fn(),
        query: jest.fn().mockResolvedValue(createMockDbResponse()),
        end: jest.fn(),
        on: jest.fn(),
        totalCount: 25, // Max connections
        idleCount: 0,
        waitingCount: 5 // Connections waiting
      };
      Pool.mockImplementation(() => mockPool);

      await initPostgreSQL();
      const stats = getConnectionStats();
      
      expect(stats.postgresql.totalConnections).toBe(25);
      expect(stats.postgresql.waitingConnections).toBe(5);
    });
  });
});
