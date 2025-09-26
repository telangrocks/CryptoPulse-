/**
 * Database Migration Script - Initial Schema
 * Creates all required collections and indexes for CryptoPulse
 */

const { MongoClient } = require('mongodb');

class DatabaseMigration {
  constructor(connectionString) {
    this.connectionString = connectionString;
    this.client = null;
    this.db = null;
  }

  async connect() {
    this.client = new MongoClient(this.connectionString);
    await this.client.connect();
    this.db = this.client.db('cryptopulse');
  }

  async disconnect() {
    if (this.client) {
      await this.client.close();
    }
  }

  async runMigration() {
    try {
      console.log('Starting database migration...');
      
      await this.createCollections();
      await this.createIndexes();
      await this.createInitialData();
      
      console.log('Database migration completed successfully');
    } catch (error) {
      console.error('Migration failed:', error);
      throw error;
    }
  }

  async createCollections() {
    console.log('Creating collections...');

    const collections = [
      {
        name: 'User',
        options: {
          validator: {
            $jsonSchema: {
              bsonType: 'object',
              required: ['email', 'username', 'createdAt'],
              properties: {
                email: { bsonType: 'string', pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$' },
                username: { bsonType: 'string', minLength: 3, maxLength: 50 },
                createdAt: { bsonType: 'date' },
                updatedAt: { bsonType: 'date' },
                isActive: { bsonType: 'bool' },
                subscriptionStatus: { 
                  bsonType: 'string', 
                  enum: ['trial', 'active', 'cancelled', 'expired'] 
                },
                trialEndDate: { bsonType: 'date' },
                lastLoginAt: { bsonType: 'date' }
              }
            }
          }
        }
      },
      {
        name: 'TradingBot',
        options: {
          validator: {
            $jsonSchema: {
              bsonType: 'object',
              required: ['userId', 'name', 'strategy', 'isActive', 'createdAt'],
              properties: {
                userId: { bsonType: 'objectId' },
                name: { bsonType: 'string', minLength: 1, maxLength: 100 },
                strategy: { 
                  bsonType: 'string', 
                  enum: ['AI_POWERED', 'MOMENTUM', 'MEAN_REVERSION', 'SCALPING', 'SWING', 'ARBITRAGE'] 
                },
                isActive: { bsonType: 'bool' },
                settings: { bsonType: 'object' },
                createdAt: { bsonType: 'date' },
                updatedAt: { bsonType: 'date' },
                lastRunAt: { bsonType: 'date' }
              }
            }
          }
        }
      },
      {
        name: 'Portfolio',
        options: {
          validator: {
            $jsonSchema: {
              bsonType: 'object',
              required: ['userId', 'totalValue', 'createdAt'],
              properties: {
                userId: { bsonType: 'objectId' },
                totalValue: { bsonType: 'number', minimum: 0 },
                availableBalance: { bsonType: 'number', minimum: 0 },
                investedAmount: { bsonType: 'number', minimum: 0 },
                totalPnL: { bsonType: 'number' },
                dailyPnL: { bsonType: 'number' },
                positions: { bsonType: 'array' },
                createdAt: { bsonType: 'date' },
                updatedAt: { bsonType: 'date' }
              }
            }
          }
        }
      },
      {
        name: 'Transaction',
        options: {
          validator: {
            $jsonSchema: {
              bsonType: 'object',
              required: ['userId', 'type', 'amount', 'status', 'createdAt'],
              properties: {
                userId: { bsonType: 'objectId' },
                type: { 
                  bsonType: 'string', 
                  enum: ['deposit', 'withdrawal', 'trade', 'fee', 'refund'] 
                },
                amount: { bsonType: 'number' },
                currency: { bsonType: 'string', minLength: 3, maxLength: 10 },
                status: { 
                  bsonType: 'string', 
                  enum: ['pending', 'completed', 'failed', 'cancelled'] 
                },
                description: { bsonType: 'string' },
                metadata: { bsonType: 'object' },
                createdAt: { bsonType: 'date' },
                updatedAt: { bsonType: 'date' }
              }
            }
          }
        }
      },
      {
        name: 'Order',
        options: {
          validator: {
            $jsonSchema: {
              bsonType: 'object',
              required: ['userId', 'pair', 'action', 'amount', 'status', 'createdAt'],
              properties: {
                userId: { bsonType: 'objectId' },
                pair: { bsonType: 'string', pattern: '^[A-Z]{3,10}/[A-Z]{3,10}$' },
                action: { bsonType: 'string', enum: ['BUY', 'SELL'] },
                amount: { bsonType: 'number', minimum: 0 },
                price: { bsonType: 'number', minimum: 0 },
                orderValue: { bsonType: 'number', minimum: 0 },
                fees: { bsonType: 'number', minimum: 0 },
                totalCost: { bsonType: 'number', minimum: 0 },
                strategy: { bsonType: 'string' },
                status: { 
                  bsonType: 'string', 
                  enum: ['pending', 'executed', 'failed', 'cancelled', 'rejected'] 
                },
                confidence: { bsonType: 'number', minimum: 0, maximum: 1 },
                riskLevel: { bsonType: 'string', enum: ['low', 'medium', 'high'] },
                stopLoss: { bsonType: 'number' },
                takeProfit: { bsonType: 'number' },
                analysis: { bsonType: 'object' },
                signals: { bsonType: 'object' },
                exchangeOrderId: { bsonType: 'string' },
                exchangeUsed: { bsonType: 'string' },
                executedAt: { bsonType: 'date' },
                createdAt: { bsonType: 'date' },
                updatedAt: { bsonType: 'date' }
              }
            }
          }
        }
      },
      {
        name: 'MarketData',
        options: {
          validator: {
            $jsonSchema: {
              bsonType: 'object',
              required: ['pair', 'price', 'volume', 'timestamp'],
              properties: {
                pair: { bsonType: 'string', pattern: '^[A-Z]{3,10}/[A-Z]{3,10}$' },
                price: { bsonType: 'number', minimum: 0 },
                volume: { bsonType: 'number', minimum: 0 },
                high: { bsonType: 'number', minimum: 0 },
                low: { bsonType: 'number', minimum: 0 },
                open: { bsonType: 'number', minimum: 0 },
                close: { bsonType: 'number', minimum: 0 },
                change: { bsonType: 'number' },
                changePercent: { bsonType: 'number' },
                timestamp: { bsonType: 'date' },
                timeframe: { bsonType: 'string', enum: ['1m', '5m', '15m', '1h', '4h', '1d'] },
                source: { bsonType: 'string' }
              }
            }
          }
        }
      },
      {
        name: 'TradingSignal',
        options: {
          validator: {
            $jsonSchema: {
              bsonType: 'object',
              required: ['pair', 'action', 'confidence', 'timestamp'],
              properties: {
                pair: { bsonType: 'string', pattern: '^[A-Z]{3,10}/[A-Z]{3,10}$' },
                action: { bsonType: 'string', enum: ['BUY', 'SELL', 'HOLD'] },
                confidence: { bsonType: 'number', minimum: 0, maximum: 1 },
                strength: { bsonType: 'string', enum: ['weak', 'medium', 'strong'] },
                timeframe: { bsonType: 'string', enum: ['1m', '5m', '15m', '1h', '4h', '1d'] },
                strategy: { bsonType: 'string' },
                indicators: { bsonType: 'object' },
                price: { bsonType: 'number', minimum: 0 },
                stopLoss: { bsonType: 'number' },
                takeProfit: { bsonType: 'number' },
                riskLevel: { bsonType: 'string', enum: ['low', 'medium', 'high'] },
                timestamp: { bsonType: 'date' },
                processed: { bsonType: 'bool' },
                processedAt: { bsonType: 'date' }
              }
            }
          }
        }
      },
      {
        name: 'RiskAssessment',
        options: {
          validator: {
            $jsonSchema: {
              bsonType: 'object',
              required: ['userId', 'riskScore', 'timestamp'],
              properties: {
                userId: { bsonType: 'objectId' },
                riskScore: { bsonType: 'number', minimum: 0, maximum: 100 },
                riskLevel: { bsonType: 'string', enum: ['low', 'medium', 'high', 'critical'] },
                factors: { bsonType: 'array' },
                recommendations: { bsonType: 'array' },
                timestamp: { bsonType: 'date' },
                expiresAt: { bsonType: 'date' }
              }
            }
          }
        }
      },
      {
        name: 'AuditLog',
        options: {
          validator: {
            $jsonSchema: {
              bsonType: 'object',
              required: ['userId', 'action', 'timestamp'],
              properties: {
                userId: { bsonType: 'objectId' },
                action: { bsonType: 'string' },
                resource: { bsonType: 'string' },
                details: { bsonType: 'object' },
                ipAddress: { bsonType: 'string' },
                userAgent: { bsonType: 'string' },
                timestamp: { bsonType: 'date' },
                severity: { bsonType: 'string', enum: ['low', 'medium', 'high', 'critical'] }
              }
            }
          }
        }
      },
      {
        name: 'SystemHealth',
        options: {
          validator: {
            $jsonSchema: {
              bsonType: 'object',
              required: ['status', 'timestamp'],
              properties: {
                status: { bsonType: 'string', enum: ['healthy', 'degraded', 'unhealthy'] },
                services: { bsonType: 'object' },
                metrics: { bsonType: 'object' },
                timestamp: { bsonType: 'date' },
                uptime: { bsonType: 'number' },
                memoryUsage: { bsonType: 'number' },
                cpuUsage: { bsonType: 'number' }
              }
            }
          }
        }
      }
    ];

    for (const collection of collections) {
      try {
        await this.db.createCollection(collection.name, collection.options);
        console.log(`✓ Created collection: ${collection.name}`);
      } catch (error) {
        if (error.code === 48) { // Collection already exists
          console.log(`✓ Collection already exists: ${collection.name}`);
        } else {
          throw error;
        }
      }
    }
  }

  async createIndexes() {
    console.log('Creating indexes...');

    const indexes = [
      // User collection indexes
      { collection: 'User', index: { email: 1 }, options: { unique: true } },
      { collection: 'User', index: { username: 1 }, options: { unique: true } },
      { collection: 'User', index: { createdAt: 1 } },
      { collection: 'User', index: { subscriptionStatus: 1 } },

      // TradingBot collection indexes
      { collection: 'TradingBot', index: { userId: 1 } },
      { collection: 'TradingBot', index: { isActive: 1 } },
      { collection: 'TradingBot', index: { strategy: 1 } },
      { collection: 'TradingBot', index: { userId: 1, isActive: 1 } },

      // Portfolio collection indexes
      { collection: 'Portfolio', index: { userId: 1 }, options: { unique: true } },
      { collection: 'Portfolio', index: { totalValue: 1 } },
      { collection: 'Portfolio', index: { updatedAt: 1 } },

      // Transaction collection indexes
      { collection: 'Transaction', index: { userId: 1 } },
      { collection: 'Transaction', index: { type: 1 } },
      { collection: 'Transaction', index: { status: 1 } },
      { collection: 'Transaction', index: { createdAt: 1 } },
      { collection: 'Transaction', index: { userId: 1, createdAt: 1 } },

      // Order collection indexes
      { collection: 'Order', index: { userId: 1 } },
      { collection: 'Order', index: { pair: 1 } },
      { collection: 'Order', index: { status: 1 } },
      { collection: 'Order', index: { createdAt: 1 } },
      { collection: 'Order', index: { userId: 1, createdAt: 1 } },
      { collection: 'Order', index: { pair: 1, createdAt: 1 } },
      { collection: 'Order', index: { exchangeOrderId: 1 } },

      // MarketData collection indexes
      { collection: 'MarketData', index: { pair: 1 } },
      { collection: 'MarketData', index: { timestamp: 1 } },
      { collection: 'MarketData', index: { pair: 1, timestamp: 1 } },
      { collection: 'MarketData', index: { timeframe: 1 } },
      { collection: 'MarketData', index: { pair: 1, timeframe: 1, timestamp: 1 } },

      // TradingSignal collection indexes
      { collection: 'TradingSignal', index: { pair: 1 } },
      { collection: 'TradingSignal', index: { timestamp: 1 } },
      { collection: 'TradingSignal', index: { pair: 1, timestamp: 1 } },
      { collection: 'TradingSignal', index: { processed: 1 } },
      { collection: 'TradingSignal', index: { confidence: 1 } },
      { collection: 'TradingSignal', index: { action: 1, confidence: 1 } },

      // RiskAssessment collection indexes
      { collection: 'RiskAssessment', index: { userId: 1 } },
      { collection: 'RiskAssessment', index: { timestamp: 1 } },
      { collection: 'RiskAssessment', index: { userId: 1, timestamp: 1 } },
      { collection: 'RiskAssessment', index: { riskLevel: 1 } },

      // AuditLog collection indexes
      { collection: 'AuditLog', index: { userId: 1 } },
      { collection: 'AuditLog', index: { action: 1 } },
      { collection: 'AuditLog', index: { timestamp: 1 } },
      { collection: 'AuditLog', index: { userId: 1, action: 1, timestamp: 1 } },
      { collection: 'AuditLog', index: { severity: 1 } },

      // SystemHealth collection indexes
      { collection: 'SystemHealth', index: { timestamp: 1 } },
      { collection: 'SystemHealth', index: { status: 1 } },
      { collection: 'SystemHealth', index: { timestamp: 1 }, options: { expireAfterSeconds: 86400 } } // TTL: 24 hours
    ];

    for (const indexConfig of indexes) {
      try {
        await this.db.collection(indexConfig.collection).createIndex(
          indexConfig.index, 
          { ...indexConfig.options, background: true }
        );
        console.log(`✓ Created index on ${indexConfig.collection}: ${JSON.stringify(indexConfig.index)}`);
      } catch (error) {
        if (error.code === 85) { // Index already exists
          console.log(`✓ Index already exists on ${indexConfig.collection}: ${JSON.stringify(indexConfig.index)}`);
        } else {
          throw error;
        }
      }
    }
  }

  async createInitialData() {
    console.log('Creating initial data...');

    // Create default system health record
    await this.db.collection('SystemHealth').insertOne({
      status: 'healthy',
      services: {
        database: 'healthy',
        api: 'healthy',
        exchanges: 'healthy'
      },
      metrics: {
        uptime: 0,
        memoryUsage: 0,
        cpuUsage: 0
      },
      timestamp: new Date(),
      uptime: 0,
      memoryUsage: 0,
      cpuUsage: 0
    });

    console.log('✓ Created initial system health record');
  }
}

// Run migration if called directly
if (require.main === module) {
  const connectionString = process.env.MONGODB_URI || 'mongodb://localhost:27017/cryptopulse';
  
  const migration = new DatabaseMigration(connectionString);
  
  migration.runMigration()
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('Migration failed:', error);
      process.exit(1);
    })
    .finally(() => {
      migration.disconnect();
    });
}

module.exports = DatabaseMigration;
