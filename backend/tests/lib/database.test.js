// =============================================================================
// Database System Tests - Production Ready
// =============================================================================
// Comprehensive unit tests for the database system

const {
  connectDatabase,
  disconnectDatabase,
  getDatabase,
  healthCheck,
  getConnectionMetrics,
  resetConnectionMetrics,
  createUser,
  getUserById,
  updateUser,
  deleteUser,
  createTradingSession,
  getTradingSession,
  updateTradingSession,
  deleteTradingSession
} = require('../../lib/database');

describe('Database System', () => {
  let mockDb;
  let mockClient;

  beforeEach(() => {
    // Reset metrics
    resetConnectionMetrics();

    // Mock database connection
    mockDb = {
      collection: jest.fn().mockReturnValue({
        findOne: jest.fn(),
        find: jest.fn().mockReturnValue({
          toArray: jest.fn()
        }),
        insertOne: jest.fn(),
        updateOne: jest.fn(),
        deleteOne: jest.fn(),
        countDocuments: jest.fn(),
        createIndex: jest.fn(),
        dropIndex: jest.fn(),
        indexes: jest.fn().mockResolvedValue([])
      }),
      admin: jest.fn().mockReturnValue({
        ping: jest.fn().mockResolvedValue({ ok: 1 })
      }),
      stats: jest.fn().mockResolvedValue({
        collections: 5,
        dataSize: 1024000,
        indexSize: 512000,
        storageSize: 1536000
      })
    };

    mockClient = {
      db: jest.fn().mockReturnValue(mockDb),
      close: jest.fn().mockResolvedValue(),
      isConnected: jest.fn().mockReturnValue(true)
    };

    // Mock MongoDB connection
    jest.doMock('mongodb', () => ({
      MongoClient: {
        connect: jest.fn().mockResolvedValue(mockClient)
      }
    }));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Database Connection', () => {
    test('should connect to database successfully', async () => {
      const result = await connectDatabase();
      
      expect(result).toBe(true);
      expect(mockClient.db).toHaveBeenCalled();
    });

    test('should handle connection errors', async () => {
      mockClient.db.mockRejectedValue(new Error('Connection failed'));
      
      await expect(connectDatabase()).rejects.toThrow('Connection failed');
    });

    test('should disconnect from database successfully', async () => {
      await connectDatabase();
      const result = await disconnectDatabase();
      
      expect(result).toBe(true);
      expect(mockClient.close).toHaveBeenCalled();
    });

    test('should handle disconnection errors', async () => {
      mockClient.close.mockRejectedValue(new Error('Disconnect failed'));
      
      await expect(disconnectDatabase()).rejects.toThrow('Disconnect failed');
    });

    test('should get database instance', async () => {
      await connectDatabase();
      const db = getDatabase();
      
      expect(db).toBe(mockDb);
    });

    test('should return null if not connected', () => {
      const db = getDatabase();
      expect(db).toBeNull();
    });
  });

  describe('Health Check', () => {
    test('should return healthy status when connected', async () => {
      await connectDatabase();
      const health = await healthCheck();
      
      expect(health.status).toBe('healthy');
      expect(health.database.connected).toBe(true);
      expect(health.database.ping).toBe(true);
    });

    test('should return unhealthy status when not connected', async () => {
      const health = await healthCheck();
      
      expect(health.status).toBe('unhealthy');
      expect(health.database.connected).toBe(false);
      expect(health.database.ping).toBe(false);
    });

    test('should handle ping failures', async () => {
      await connectDatabase();
      mockDb.admin().ping.mockRejectedValue(new Error('Ping failed'));
      
      const health = await healthCheck();
      
      expect(health.status).toBe('unhealthy');
      expect(health.database.ping).toBe(false);
    });

    test('should include connection metrics in health check', async () => {
      await connectDatabase();
      const health = await healthCheck();
      
      expect(health.metrics).toBeDefined();
      expect(health.metrics.connections).toBeDefined();
      expect(health.metrics.performance).toBeDefined();
    });
  });

  describe('Connection Metrics', () => {
    test('should track connection attempts', async () => {
      await connectDatabase();
      
      const metrics = getConnectionMetrics();
      expect(metrics.connections.attempts).toBe(1);
      expect(metrics.connections.successful).toBe(1);
    });

    test('should track connection failures', async () => {
      mockClient.db.mockRejectedValue(new Error('Connection failed'));
      
      try {
        await connectDatabase();
      } catch (error) {
        // Expected to fail
      }
      
      const metrics = getConnectionMetrics();
      expect(metrics.connections.attempts).toBe(1);
      expect(metrics.connections.failed).toBe(1);
    });

    test('should track query operations', async () => {
      await connectDatabase();
      
      // Simulate database operations
      const db = getDatabase();
      await db.collection('users').findOne({ id: 'test' });
      
      const metrics = getConnectionMetrics();
      expect(metrics.operations.queries).toBe(1);
    });

    test('should track performance metrics', async () => {
      await connectDatabase();
      
      // Simulate multiple operations
      const db = getDatabase();
      for (let i = 0; i < 10; i++) {
        await db.collection('users').findOne({ id: `test${i}` });
      }
      
      const metrics = getConnectionMetrics();
      expect(metrics.performance.query.average).toBeGreaterThan(0);
      expect(metrics.performance.query.p95).toBeGreaterThanOrEqual(metrics.performance.query.average);
    });

    test('should reset metrics correctly', async () => {
      await connectDatabase();
      
      let metrics = getConnectionMetrics();
      expect(metrics.connections.attempts).toBeGreaterThan(0);
      
      resetConnectionMetrics();
      
      metrics = getConnectionMetrics();
      expect(metrics.connections.attempts).toBe(0);
    });
  });

  describe('User Operations', () => {
    beforeEach(async () => {
      await connectDatabase();
    });

    test('should create user successfully', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'hashedPassword',
        name: 'Test User'
      };

      mockDb.collection().insertOne.mockResolvedValue({
        insertedId: 'user123',
        acknowledged: true
      });

      const result = await createUser(userData);
      
      expect(result.success).toBe(true);
      expect(result.userId).toBe('user123');
      expect(mockDb.collection).toHaveBeenCalledWith('users');
      expect(mockDb.collection().insertOne).toHaveBeenCalledWith({
        ...userData,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date)
      });
    });

    test('should handle user creation errors', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'hashedPassword'
      };

      mockDb.collection().insertOne.mockRejectedValue(new Error('Database error'));

      await expect(createUser(userData)).rejects.toThrow('Database error');
    });

    test('should get user by ID successfully', async () => {
      const userId = 'user123';
      const userData = {
        _id: userId,
        email: 'test@example.com',
        name: 'Test User'
      };

      mockDb.collection().findOne.mockResolvedValue(userData);

      const result = await getUserById(userId);
      
      expect(result).toEqual(userData);
      expect(mockDb.collection().findOne).toHaveBeenCalledWith({ _id: userId });
    });

    test('should return null for non-existent user', async () => {
      const userId = 'nonexistent';
      mockDb.collection().findOne.mockResolvedValue(null);

      const result = await getUserById(userId);
      
      expect(result).toBeNull();
    });

    test('should update user successfully', async () => {
      const userId = 'user123';
      const updateData = {
        name: 'Updated Name',
        email: 'updated@example.com'
      };

      mockDb.collection().updateOne.mockResolvedValue({
        modifiedCount: 1,
        acknowledged: true
      });

      const result = await updateUser(userId, updateData);
      
      expect(result.success).toBe(true);
      expect(mockDb.collection().updateOne).toHaveBeenCalledWith(
        { _id: userId },
        {
          $set: {
            ...updateData,
            updatedAt: expect.any(Date)
          }
        }
      );
    });

    test('should handle user update errors', async () => {
      const userId = 'user123';
      const updateData = { name: 'Updated Name' };

      mockDb.collection().updateOne.mockRejectedValue(new Error('Database error'));

      await expect(updateUser(userId, updateData)).rejects.toThrow('Database error');
    });

    test('should delete user successfully', async () => {
      const userId = 'user123';

      mockDb.collection().deleteOne.mockResolvedValue({
        deletedCount: 1,
        acknowledged: true
      });

      const result = await deleteUser(userId);
      
      expect(result.success).toBe(true);
      expect(mockDb.collection().deleteOne).toHaveBeenCalledWith({ _id: userId });
    });

    test('should handle user deletion errors', async () => {
      const userId = 'user123';

      mockDb.collection().deleteOne.mockRejectedValue(new Error('Database error'));

      await expect(deleteUser(userId)).rejects.toThrow('Database error');
    });
  });

  describe('Trading Session Operations', () => {
    beforeEach(async () => {
      await connectDatabase();
    });

    test('should create trading session successfully', async () => {
      const sessionData = {
        userId: 'user123',
        exchange: 'binance',
        strategy: 'test-strategy',
        status: 'active'
      };

      mockDb.collection().insertOne.mockResolvedValue({
        insertedId: 'session123',
        acknowledged: true
      });

      const result = await createTradingSession(sessionData);
      
      expect(result.success).toBe(true);
      expect(result.sessionId).toBe('session123');
      expect(mockDb.collection).toHaveBeenCalledWith('trading_sessions');
      expect(mockDb.collection().insertOne).toHaveBeenCalledWith({
        ...sessionData,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date)
      });
    });

    test('should get trading session successfully', async () => {
      const sessionId = 'session123';
      const sessionData = {
        _id: sessionId,
        userId: 'user123',
        exchange: 'binance',
        status: 'active'
      };

      mockDb.collection().findOne.mockResolvedValue(sessionData);

      const result = await getTradingSession(sessionId);
      
      expect(result).toEqual(sessionData);
      expect(mockDb.collection().findOne).toHaveBeenCalledWith({ _id: sessionId });
    });

    test('should update trading session successfully', async () => {
      const sessionId = 'session123';
      const updateData = {
        status: 'paused',
        lastActivity: new Date()
      };

      mockDb.collection().updateOne.mockResolvedValue({
        modifiedCount: 1,
        acknowledged: true
      });

      const result = await updateTradingSession(sessionId, updateData);
      
      expect(result.success).toBe(true);
      expect(mockDb.collection().updateOne).toHaveBeenCalledWith(
        { _id: sessionId },
        {
          $set: {
            ...updateData,
            updatedAt: expect.any(Date)
          }
        }
      );
    });

    test('should delete trading session successfully', async () => {
      const sessionId = 'session123';

      mockDb.collection().deleteOne.mockResolvedValue({
        deletedCount: 1,
        acknowledged: true
      });

      const result = await deleteTradingSession(sessionId);
      
      expect(result.success).toBe(true);
      expect(mockDb.collection().deleteOne).toHaveBeenCalledWith({ _id: sessionId });
    });
  });

  describe('Database Performance', () => {
    beforeEach(async () => {
      await connectDatabase();
    });

    test('should handle concurrent operations', async () => {
      const db = getDatabase();
      const promises = [];

      // Start multiple concurrent operations
      for (let i = 0; i < 10; i++) {
        promises.push(
          db.collection('users').findOne({ id: `user${i}` })
        );
      }

      const results = await Promise.all(promises);
      expect(results).toHaveLength(10);

      const metrics = getConnectionMetrics();
      expect(metrics.operations.queries).toBe(10);
    });

    test('should handle large datasets', async () => {
      const db = getDatabase();
      const largeData = Array.from({ length: 1000 }, (_, i) => ({
        id: `user${i}`,
        data: 'A'.repeat(1000)
      }));

      mockDb.collection().find().toArray.mockResolvedValue(largeData);

      const result = await db.collection('users').find().toArray();
      expect(result).toHaveLength(1000);

      const metrics = getConnectionMetrics();
      expect(metrics.performance.query.average).toBeGreaterThan(0);
    });

    test('should handle connection timeouts gracefully', async () => {
      mockDb.admin().ping.mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Connection timeout')), 100)
        )
      );

      const health = await healthCheck();
      expect(health.status).toBe('unhealthy');
      expect(health.database.ping).toBe(false);
    });

    test('should handle memory pressure', async () => {
      const db = getDatabase();
      const promises = [];

      // Simulate memory pressure with many concurrent operations
      for (let i = 0; i < 100; i++) {
        promises.push(
          db.collection('users').findOne({ id: `user${i}` })
        );
      }

      const results = await Promise.all(promises);
      expect(results).toHaveLength(100);

      const metrics = getConnectionMetrics();
      expect(metrics.performance.query.max).toBeGreaterThan(0);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle database connection loss', async () => {
      await connectDatabase();
      
      // Simulate connection loss
      mockClient.isConnected.mockReturnValue(false);
      mockDb.admin().ping.mockRejectedValue(new Error('Connection lost'));

      const health = await healthCheck();
      expect(health.status).toBe('unhealthy');
    });

    test('should handle invalid user data', async () => {
      await connectDatabase();

      const invalidUserData = {
        email: null,
        password: undefined
      };

      await expect(createUser(invalidUserData)).rejects.toThrow();
    });

    test('should handle malformed ObjectIds', async () => {
      await connectDatabase();

      const invalidId = 'invalid-object-id';
      await expect(getUserById(invalidId)).rejects.toThrow();
    });

    test('should handle network interruptions', async () => {
      mockClient.db.mockRejectedValue(new Error('Network error'));

      await expect(connectDatabase()).rejects.toThrow('Network error');
    });

    test('should handle database server errors', async () => {
      await connectDatabase();

      mockDb.collection().insertOne.mockRejectedValue(new Error('Server error'));

      const userData = {
        email: 'test@example.com',
        password: 'hashedPassword'
      };

      await expect(createUser(userData)).rejects.toThrow('Server error');
    });

    test('should handle concurrent connection attempts', async () => {
      const promises = [];

      // Start multiple connection attempts
      for (let i = 0; i < 5; i++) {
        promises.push(connectDatabase());
      }

      const results = await Promise.all(promises);
      expect(results.every(result => result === true)).toBe(true);

      const metrics = getConnectionMetrics();
      expect(metrics.connections.attempts).toBe(5);
    });

    test('should handle empty query results', async () => {
      await connectDatabase();

      mockDb.collection().find().toArray.mockResolvedValue([]);

      const db = getDatabase();
      const result = await db.collection('users').find().toArray();
      expect(result).toEqual([]);
    });

    test('should handle very long field names', async () => {
      await connectDatabase();

      const longFieldName = 'a'.repeat(1000);
      const userData = {
        [longFieldName]: 'value',
        email: 'test@example.com'
      };

      await expect(createUser(userData)).rejects.toThrow();
    });

    test('should handle special characters in data', async () => {
      await connectDatabase();

      const userData = {
        email: 'test@example.com',
        name: 'User with special chars: !@#$%^&*()_+{}[]|\\:";\'<>?,./~`'
      };

      mockDb.collection().insertOne.mockResolvedValue({
        insertedId: 'user123',
        acknowledged: true
      });

      const result = await createUser(userData);
      expect(result.success).toBe(true);
    });
  });
});
