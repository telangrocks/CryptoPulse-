// =============================================================================
// API Integration Tests - Production Ready
// =============================================================================
// Comprehensive API testing suite

const request = require('supertest');
const app = require('../index');
const { User: _User, Trade, ExchangeConfig } = require('../lib/database');

// Mock external dependencies
jest.mock('../lib/database');
jest.mock('../lib/auth');

describe('API Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/status', () => {
    it('should return API status', async() => {
      const response = await request(app)
        .get('/api/status')
        .expect(200);

      expect(response.body.message).toBe('CryptoPulse API is running');
      expect(response.body.version).toBe('2.0.0');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('GET /health', () => {
    it('should return health status', async() => {
      // Mock database query
      const { query } = require('../lib/database');
      query.mockResolvedValue([{ result: 1 }]);

      // Mock Redis
      const { getRedisSafe } = require('../lib/database');
      const mockRedis = {
        ping: jest.fn().mockResolvedValue('PONG')
      };
      getRedisSafe.mockReturnValue(mockRedis);

      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.status).toBe('healthy');
      expect(response.body.version).toBe('2.0.0');
      expect(response.body.services.database).toBe('Connected');
      expect(response.body.services.redis).toBe('Connected');
    });

    it('should return degraded status when database is down', async() => {
      // Mock database query to fail
      const { query } = require('../lib/database');
      query.mockRejectedValue(new Error('Database connection failed'));

      // Mock Redis
      const { getRedisSafe } = require('../lib/database');
      const mockRedis = {
        ping: jest.fn().mockResolvedValue('PONG')
      };
      getRedisSafe.mockReturnValue(mockRedis);

      const response = await request(app)
        .get('/health')
        .expect(503);

      expect(response.body.status).toBe('degraded');
      expect(response.body.services.database).toBe('Disconnected');
    });
  });

  describe('GET /health/detailed', () => {
    it('should return detailed health status', async() => {
      // Mock database query
      const { query } = require('../lib/database');
      query.mockResolvedValue([{ result: 1 }]);

      // Mock Redis
      const { getRedisSafe } = require('../lib/database');
      const mockRedis = {
        ping: jest.fn().mockResolvedValue('PONG')
      };
      getRedisSafe.mockReturnValue(mockRedis);

      const response = await request(app)
        .get('/health/detailed')
        .expect(200);

      expect(response.body.status).toBe('healthy');
      expect(response.body.services.database).toHaveProperty('status');
      expect(response.body.services.database).toHaveProperty('responseTime');
      expect(response.body.services.redis).toHaveProperty('status');
      expect(response.body.services.redis).toHaveProperty('responseTime');
    });
  });

  describe('POST /api/v1/exchanges/balances', () => {
    it('should return exchange balances', async() => {
      // Mock authentication
      const { authenticateToken } = require('../lib/auth');
      authenticateToken.mockImplementation((req, res, next) => {
        req.user = { userId: 'user123' };
        next();
      });

      const balanceData = {
        exchange: 'binance',
        apiKey: 'test-api-key',
        secretKey: 'test-secret-key'
      };

      const _response = await request(app)
        .post('/api/v1/exchanges/balances')
        .send(balanceData)
        .expect(200);

      expect(_response.body.success).toBe(true);
      expect(_response.body.data.exchange).toBe('binance');
      expect(_response.body.data.balances).toBeInstanceOf(Array);
      expect(_response.body.data.balances.length).toBeGreaterThan(0);
    });

    it('should return 400 for missing exchange', async() => {
      // Mock authentication
      const { authenticateToken } = require('../lib/auth');
      authenticateToken.mockImplementation((req, res, next) => {
        req.user = { userId: 'user123' };
        next();
      });

      const response = await request(app)
        .post('/api/v1/exchanges/balances')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Exchange is required');
    });

    it('should return 401 for unauthenticated request', async() => {
      const balanceData = {
        exchange: 'binance',
        apiKey: 'test-api-key',
        secretKey: 'test-secret-key'
      };

      const _response = await request(app)
        .post('/api/v1/exchanges/balances')
        .send(balanceData)
        .expect(401);
    });
  });

  describe('POST /api/v1/trades/execute', () => {
    it('should execute trade successfully', async() => {
      // Mock authentication
      const { authenticateToken } = require('../lib/auth');
      authenticateToken.mockImplementation((req, res, next) => {
        req.user = { userId: 'user123' };
        next();
      });

      // Mock trade creation
      Trade.create.mockResolvedValue({
        id: 'trade123',
        exchange: 'binance',
        symbol: 'BTCUSDT',
        side: 'buy',
        amount: 0.1,
        price: 50000,
        status: 'completed',
        created_at: new Date()
      });

      const tradeData = {
        exchange: 'binance',
        symbol: 'BTCUSDT',
        side: 'buy',
        amount: 0.1,
        price: 50000,
        apiKey: 'test-api-key',
        secretKey: 'test-secret-key'
      };

      const response = await request(app)
        .post('/api/v1/trades/execute')
        .send(tradeData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.tradeId).toBe('trade123');
      expect(response.body.data.exchange).toBe('binance');
      expect(response.body.data.symbol).toBe('BTCUSDT');
    });

    it('should return 400 for missing trade parameters', async() => {
      // Mock authentication
      const { authenticateToken } = require('../lib/auth');
      authenticateToken.mockImplementation((req, res, next) => {
        req.user = { userId: 'user123' };
        next();
      });

      const response = await request(app)
        .post('/api/v1/trades/execute')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Missing required trade parameters');
    });

    it('should return 400 for invalid trade side', async() => {
      // Mock authentication
      const { authenticateToken } = require('../lib/auth');
      authenticateToken.mockImplementation((req, res, next) => {
        req.user = { userId: 'user123' };
        next();
      });

      const tradeData = {
        exchange: 'binance',
        symbol: 'BTCUSDT',
        side: 'invalid',
        amount: 0.1,
        apiKey: 'test-api-key',
        secretKey: 'test-secret-key'
      };

      const response = await request(app)
        .post('/api/v1/trades/execute')
        .send(tradeData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid trade side. Must be "buy" or "sell"');
    });
  });

  describe('GET /api/v1/trades/history', () => {
    it('should return trading history', async() => {
      // Mock authentication
      const { authenticateToken } = require('../lib/auth');
      authenticateToken.mockImplementation((req, res, next) => {
        req.user = { userId: 'user123' };
        next();
      });

      // Mock trade history
      const mockTrades = [
        {
          id: 'trade1',
          exchange: 'binance',
          symbol: 'BTCUSDT',
          side: 'buy',
          amount: 0.1,
          price: 50000,
          status: 'completed',
          created_at: new Date()
        },
        {
          id: 'trade2',
          exchange: 'binance',
          symbol: 'ETHUSDT',
          side: 'sell',
          amount: 1.0,
          price: 3000,
          status: 'completed',
          created_at: new Date()
        }
      ];

      Trade.findByUserId.mockResolvedValue(mockTrades);

      const response = await request(app)
        .get('/api/v1/trades/history')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.trades).toHaveLength(2);
      expect(response.body.data.trades[0].tradeId).toBe('trade1');
      expect(response.body.data.trades[1].tradeId).toBe('trade2');
    });

    it('should return 401 for unauthenticated request', async() => {
      const _response = await request(app)
        .get('/api/v1/trades/history')
        .expect(401);
    });
  });

  describe('GET /api/v1/portfolio/summary', () => {
    it('should return portfolio summary', async() => {
      // Mock authentication
      const { authenticateToken } = require('../lib/auth');
      authenticateToken.mockImplementation((req, res, next) => {
        req.user = { userId: 'user123' };
        next();
      });

      const response = await request(app)
        .get('/api/v1/portfolio/summary')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalValue');
      expect(response.body.data).toHaveProperty('totalInvested');
      expect(response.body.data).toHaveProperty('totalProfit');
      expect(response.body.data).toHaveProperty('assets');
    });

    it('should return 401 for unauthenticated request', async() => {
      const _response = await request(app)
        .get('/api/v1/portfolio/summary')
        .expect(401);
    });
  });

  describe('POST /api/v1/exchanges/configure', () => {
    it('should configure exchange successfully', async() => {
      // Mock authentication
      const { authenticateToken } = require('../lib/auth');
      authenticateToken.mockImplementation((req, res, next) => {
        req.user = { userId: 'user123' };
        next();
      });

      // Mock exchange configuration creation
      ExchangeConfig.create.mockResolvedValue({
        id: 'config123',
        exchange: 'binance',
        is_active: true,
        created_at: new Date()
      });

      const configData = {
        exchange: 'binance',
        apiKey: 'test-api-key',
        secretKey: 'test-secret-key'
      };

      const response = await request(app)
        .post('/api/v1/exchanges/configure')
        .send(configData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.exchange).toBe('binance');
      expect(response.body.data.status).toBe('connected');
    });

    it('should return 400 for missing required fields', async() => {
      // Mock authentication
      const { authenticateToken } = require('../lib/auth');
      authenticateToken.mockImplementation((req, res, next) => {
        req.user = { userId: 'user123' };
        next();
      });

      const response = await request(app)
        .post('/api/v1/exchanges/configure')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Exchange, API key, and secret key are required');
    });

    it('should return 400 for invalid exchange', async() => {
      // Mock authentication
      const { authenticateToken } = require('../lib/auth');
      authenticateToken.mockImplementation((req, res, next) => {
        req.user = { userId: 'user123' };
        next();
      });

      const configData = {
        exchange: 'invalid-exchange',
        apiKey: 'test-api-key',
        secretKey: 'test-secret-key'
      };

      const response = await request(app)
        .post('/api/v1/exchanges/configure')
        .send(configData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid exchange');
    });
  });

  describe('GET /api/v1/exchanges/configured', () => {
    it('should return configured exchanges', async() => {
      // Mock authentication
      const { authenticateToken } = require('../lib/auth');
      authenticateToken.mockImplementation((req, res, next) => {
        req.user = { userId: 'user123' };
        next();
      });

      // Mock configured exchanges
      const mockConfigs = [
        {
          exchange: 'binance',
          is_active: true,
          created_at: new Date()
        },
        {
          exchange: 'wazirx',
          is_active: false,
          created_at: new Date()
        }
      ];

      ExchangeConfig.findByUserId.mockResolvedValue(mockConfigs);

      const response = await request(app)
        .get('/api/v1/exchanges/configured')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.exchanges).toHaveLength(2);
      expect(response.body.data.exchanges[0].name).toBe('binance');
      expect(response.body.data.exchanges[0].status).toBe('connected');
    });

    it('should return 401 for unauthenticated request', async() => {
      const _response = await request(app)
        .get('/api/v1/exchanges/configured')
        .expect(401);
    });
  });
});
