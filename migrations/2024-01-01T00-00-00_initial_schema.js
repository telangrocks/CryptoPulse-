/**
 * Migration: Initial Database Schema
 * Description: Create initial collections and indexes for CryptoPulse
 * Generated: 2024-01-01T00:00:00.000Z
 */

module.exports = {
  version: '2024-01-01T00-00-00',
  name: 'initial_schema',
  description: 'Create initial collections and indexes for CryptoPulse',
  
  async up(db) {
    console.log('Running migration: initial_schema');
    
    // Users collection
    await db.createCollection('users', {
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['email', 'createdAt', 'updatedAt'],
          properties: {
            email: { 
              bsonType: 'string', 
              pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
              description: 'User email address'
            },
            password: { 
              bsonType: 'string',
              minLength: 8,
              description: 'Encrypted password hash'
            },
            firstName: { bsonType: 'string' },
            lastName: { bsonType: 'string' },
            phone: { bsonType: 'string' },
            isActive: { bsonType: 'bool' },
            isVerified: { bsonType: 'bool' },
            role: { 
              bsonType: 'string',
              enum: ['user', 'admin', 'moderator'],
              description: 'User role'
            },
            preferences: {
              bsonType: 'object',
              properties: {
                theme: { bsonType: 'string', enum: ['light', 'dark'] },
                language: { bsonType: 'string' },
                currency: { bsonType: 'string' },
                notifications: { bsonType: 'bool' },
                twoFactorEnabled: { bsonType: 'bool' }
              }
            },
            lastLoginAt: { bsonType: 'date' },
            loginAttempts: { bsonType: 'int', minimum: 0 },
            lockedUntil: { bsonType: 'date' },
            createdAt: { bsonType: 'date' },
            updatedAt: { bsonType: 'date' }
          }
        }
      }
    });

    // Trades collection
    await db.createCollection('trades', {
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['userId', 'symbol', 'side', 'quantity', 'price', 'status', 'createdAt'],
          properties: {
            userId: { bsonType: 'objectId', description: 'Reference to users collection' },
            symbol: { 
              bsonType: 'string',
              pattern: '^[A-Z]{2,10}\\/[A-Z]{2,10}$',
              description: 'Trading pair symbol (e.g., BTC/USDT)'
            },
            side: { bsonType: 'string', enum: ['BUY', 'SELL'] },
            type: { bsonType: 'string', enum: ['MARKET', 'LIMIT', 'STOP_LOSS', 'STOP_LOSS_LIMIT'] },
            quantity: { bsonType: 'number', minimum: 0 },
            price: { bsonType: 'number', minimum: 0 },
            stopPrice: { bsonType: 'number', minimum: 0 },
            timeInForce: { bsonType: 'string', enum: ['GTC', 'IOC', 'FOK'] },
            status: { 
              bsonType: 'string', 
              enum: ['PENDING', 'FILLED', 'PARTIALLY_FILLED', 'CANCELLED', 'REJECTED', 'EXPIRED']
            },
            orderId: { bsonType: 'string', description: 'Exchange order ID' },
            exchange: { bsonType: 'string', enum: ['BINANCE', 'COINBASE', 'KRAKEN'] },
            fees: { bsonType: 'number', minimum: 0 },
            executedQuantity: { bsonType: 'number', minimum: 0 },
            executedPrice: { bsonType: 'number', minimum: 0 },
            strategy: { bsonType: 'string', description: 'Trading strategy used' },
            metadata: { bsonType: 'object' },
            createdAt: { bsonType: 'date' },
            updatedAt: { bsonType: 'date' }
          }
        }
      }
    });

    // Orders collection (for order management)
    await db.createCollection('orders', {
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['userId', 'symbol', 'side', 'quantity', 'price', 'status', 'createdAt'],
          properties: {
            userId: { bsonType: 'objectId' },
            symbol: { bsonType: 'string' },
            side: { bsonType: 'string', enum: ['BUY', 'SELL'] },
            quantity: { bsonType: 'number', minimum: 0 },
            price: { bsonType: 'number', minimum: 0 },
            status: { 
              bsonType: 'string', 
              enum: ['PENDING', 'SUBMITTED', 'FILLED', 'CANCELLED', 'REJECTED']
            },
            exchangeOrderId: { bsonType: 'string' },
            exchange: { bsonType: 'string' },
            createdAt: { bsonType: 'date' },
            updatedAt: { bsonType: 'date' }
          }
        }
      }
    });

    // Sessions collection
    await db.createCollection('sessions', {
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['userId', 'sessionId', 'expiresAt', 'createdAt'],
          properties: {
            userId: { bsonType: 'objectId' },
            sessionId: { bsonType: 'string' },
            ipAddress: { bsonType: 'string' },
            userAgent: { bsonType: 'string' },
            isActive: { bsonType: 'bool' },
            expiresAt: { bsonType: 'date' },
            lastAccessedAt: { bsonType: 'date' },
            createdAt: { bsonType: 'date' }
          }
        }
      }
    });

    // Audit logs collection
    await db.createCollection('audit_logs', {
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['event', 'timestamp', 'severity'],
          properties: {
            auditId: { bsonType: 'string' },
            event: { bsonType: 'string' },
            userId: { bsonType: 'objectId' },
            details: { bsonType: 'object' },
            severity: { bsonType: 'string', enum: ['info', 'warn', 'error'] },
            ipAddress: { bsonType: 'string' },
            userAgent: { bsonType: 'string' },
            timestamp: { bsonType: 'date' }
          }
        }
      }
    });

    // API keys collection
    await db.createCollection('api_keys', {
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['userId', 'exchange', 'apiKey', 'isActive', 'createdAt'],
          properties: {
            userId: { bsonType: 'objectId' },
            exchange: { bsonType: 'string', enum: ['BINANCE', 'COINBASE', 'KRAKEN'] },
            apiKey: { bsonType: 'string' },
            apiSecret: { bsonType: 'string' },
            permissions: { bsonType: 'array' },
            isActive: { bsonType: 'bool' },
            testnet: { bsonType: 'bool' },
            lastUsed: { bsonType: 'date' },
            createdAt: { bsonType: 'date' },
            updatedAt: { bsonType: 'date' }
          }
        }
      }
    });

    // Trading signals collection
    await db.createCollection('trading_signals', {
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['symbol', 'strategy', 'signal', 'confidence', 'createdAt'],
          properties: {
            symbol: { bsonType: 'string' },
            strategy: { bsonType: 'string', enum: ['RSI', 'MA_CROSSOVER', 'BOLLINGER_BANDS', 'MACD', 'AI_POWERED'] },
            signal: { bsonType: 'string', enum: ['BUY', 'SELL', 'HOLD'] },
            confidence: { bsonType: 'number', minimum: 0, maximum: 1 },
            price: { bsonType: 'number', minimum: 0 },
            quantity: { bsonType: 'number', minimum: 0 },
            stopLoss: { bsonType: 'number', minimum: 0 },
            takeProfit: { bsonType: 'number', minimum: 0 },
            metadata: { bsonType: 'object' },
            executed: { bsonType: 'bool' },
            executedAt: { bsonType: 'date' },
            createdAt: { bsonType: 'date' }
          }
        }
      }
    });

    // Portfolio collection
    await db.createCollection('portfolio', {
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['userId', 'symbol', 'quantity', 'updatedAt'],
          properties: {
            userId: { bsonType: 'objectId' },
            symbol: { bsonType: 'string' },
            quantity: { bsonType: 'number' },
            averagePrice: { bsonType: 'number', minimum: 0 },
            currentPrice: { bsonType: 'number', minimum: 0 },
            totalValue: { bsonType: 'number', minimum: 0 },
            profitLoss: { bsonType: 'number' },
            profitLossPercentage: { bsonType: 'number' },
            updatedAt: { bsonType: 'date' }
          }
        }
      }
    });

    // Transactions collection
    await db.createCollection('transactions', {
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['userId', 'type', 'amount', 'currency', 'status', 'createdAt'],
          properties: {
            userId: { bsonType: 'objectId' },
            type: { bsonType: 'string', enum: ['DEPOSIT', 'WITHDRAWAL', 'TRADE', 'FEE', 'REWARD'] },
            amount: { bsonType: 'number' },
            currency: { bsonType: 'string' },
            status: { bsonType: 'string', enum: ['PENDING', 'COMPLETED', 'FAILED', 'CANCELLED'] },
            reference: { bsonType: 'string' },
            description: { bsonType: 'string' },
            metadata: { bsonType: 'object' },
            createdAt: { bsonType: 'date' },
            updatedAt: { bsonType: 'date' }
          }
        }
      }
    });

    // Create indexes for performance
    console.log('Creating indexes...');
    
    // Users indexes
    await db.collection('users').createIndex({ email: 1 }, { unique: true });
    await db.collection('users').createIndex({ createdAt: 1 });
    await db.collection('users').createIndex({ lastLoginAt: 1 });
    
    // Trades indexes
    await db.collection('trades').createIndex({ userId: 1, createdAt: -1 });
    await db.collection('trades').createIndex({ symbol: 1, createdAt: -1 });
    await db.collection('trades').createIndex({ status: 1 });
    await db.collection('trades').createIndex({ orderId: 1 }, { unique: true, sparse: true });
    
    // Orders indexes
    await db.collection('orders').createIndex({ userId: 1, createdAt: -1 });
    await db.collection('orders').createIndex({ status: 1 });
    await db.collection('orders').createIndex({ exchangeOrderId: 1 }, { unique: true, sparse: true });
    
    // Sessions indexes
    await db.collection('sessions').createIndex({ sessionId: 1 }, { unique: true });
    await db.collection('sessions').createIndex({ userId: 1 });
    await db.collection('sessions').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    
    // Audit logs indexes
    await db.collection('audit_logs').createIndex({ timestamp: -1 });
    await db.collection('audit_logs').createIndex({ event: 1, timestamp: -1 });
    await db.collection('audit_logs').createIndex({ userId: 1, timestamp: -1 });
    await db.collection('audit_logs').createIndex({ severity: 1, timestamp: -1 });
    await db.collection('audit_logs').createIndex({ auditId: 1 }, { unique: true });
    
    // API keys indexes
    await db.collection('api_keys').createIndex({ userId: 1 });
    await db.collection('api_keys').createIndex({ exchange: 1 });
    await db.collection('api_keys').createIndex({ isActive: 1 });
    
    // Trading signals indexes
    await db.collection('trading_signals').createIndex({ symbol: 1, createdAt: -1 });
    await db.collection('trading_signals').createIndex({ strategy: 1, createdAt: -1 });
    await db.collection('trading_signals').createIndex({ signal: 1, createdAt: -1 });
    await db.collection('trading_signals').createIndex({ executed: 1 });
    
    // Portfolio indexes
    await db.collection('portfolio').createIndex({ userId: 1, symbol: 1 }, { unique: true });
    await db.collection('portfolio').createIndex({ userId: 1, updatedAt: -1 });
    
    // Transactions indexes
    await db.collection('transactions').createIndex({ userId: 1, createdAt: -1 });
    await db.collection('transactions').createIndex({ type: 1, createdAt: -1 });
    await db.collection('transactions').createIndex({ status: 1 });
    await db.collection('transactions').createIndex({ reference: 1 }, { unique: true, sparse: true });
    
    console.log('Migration initial_schema completed successfully');
  },
  
  async down(db) {
    console.log('Rolling back migration: initial_schema');
    
    // Drop all collections
    const collections = [
      'users', 'trades', 'orders', 'sessions', 'audit_logs',
      'api_keys', 'trading_signals', 'portfolio', 'transactions'
    ];
    
    for (const collectionName of collections) {
      try {
        await db.collection(collectionName).drop();
        console.log(`Dropped collection: ${collectionName}`);
      } catch (error) {
        console.log(`Collection ${collectionName} may not exist`);
      }
    }
    
    console.log('Migration initial_schema rolled back successfully');
  }
};
