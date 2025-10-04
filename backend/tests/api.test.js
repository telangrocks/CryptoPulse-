// =============================================================================
// API Endpoint Tests - Production Ready
// =============================================================================
// Comprehensive tests for all API endpoints and routes

// Set up test environment before importing API modules
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'ScuL1geP4LHWyMrIb8KkqWaVrTzVOQyeGAhUbV1bHDdTNfZYws6W9Skx5JtGAO35TjgsqjSdIx5kqrpPGYQ';

const express = require('express');
const request = require('supertest');
const { createMockRequest, createMockResponse, createMockNext } = require('./testHelpers');

// Mock logger to avoid console output during tests
jest.mock('../lib/logging', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
}));

// Mock authentication middleware
jest.mock('../lib/auth', () => ({
  authenticateToken: (req, res, next) => {
    req.user = { id: 'test-user-123', email: 'test@example.com', role: 'user' };
    next();
  },
  requireRole: (roles) => (req, res, next) => {
    if (roles.includes(req.user.role)) {
      next();
    } else {
      res.status(403).json({ success: false, error: 'Insufficient permissions' });
    }
  },
  rateLimitByUser: () => (req, res, next) => next()
}));

// Mock risk manager
jest.mock('../lib/riskManager', () => ({
  riskManager: {
    getRiskSummary: jest.fn(),
    calculatePositionSize: jest.fn(),
    checkRiskLimits: jest.fn(),
    evaluateRisk: jest.fn(),
    updateRiskMetrics: jest.fn(),
    getRiskMetrics: jest.fn(),
    setRiskLimits: jest.fn(),
    getRiskAlerts: jest.fn(),
    acknowledgeRiskAlert: jest.fn()
  }
}));

// Mock backtesting engine
jest.mock('../lib/backtestingEngine', () => ({
  backtestingEngine: {
    runBacktest: jest.fn(),
    getBacktestResults: jest.fn(),
    getBacktestHistory: jest.fn(),
    deleteBacktest: jest.fn(),
    optimizeStrategy: jest.fn(),
    getPerformanceMetrics: jest.fn()
  }
}));

// Mock database
jest.mock('../lib/database', () => ({
  User: {
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn()
  },
  Trade: {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn()
  },
  TradingStrategy: {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn()
  },
  ExchangeConfig: {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn()
  }
}));

// Import routes after mocking
const riskRoutes = require('../routes/risk');
const backtestingRoutes = require('../routes/backtesting');

describe('API Endpoints', () => {
  let app;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    
    // Create Express app for testing
    app = express();
    app.use(express.json());
    app.use('/api/risk', riskRoutes);
    app.use('/api/backtesting', backtestingRoutes);
  });

  describe('Risk Management API', () => {
    describe('GET /api/risk/summary', () => {
      test('should get risk summary successfully', async () => {
        const mockRiskSummary = {
          userId: 'test-user-123',
          totalRisk: 0.05,
          currentDrawdown: 0.02,
          riskScore: 75,
          portfolioValue: 10000,
          riskLevel: 'medium',
          lastUpdated: new Date().toISOString()
        };

        const { riskManager } = require('../lib/riskManager');
        riskManager.getRiskSummary.mockResolvedValue(mockRiskSummary);

        const response = await request(app)
          .get('/api/risk/summary')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toEqual(mockRiskSummary);
        expect(riskManager.getRiskSummary).toHaveBeenCalledWith('test-user-123');
      });

      test('should return 404 when risk summary not found', async () => {
        const { riskManager } = require('../lib/riskManager');
        riskManager.getRiskSummary.mockResolvedValue(null);

        const response = await request(app)
          .get('/api/risk/summary')
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Risk summary not found');
      });

      test('should handle server errors', async () => {
        const { riskManager } = require('../lib/riskManager');
        riskManager.getRiskSummary.mockRejectedValue(new Error('Database error'));

        const response = await request(app)
          .get('/api/risk/summary')
          .expect(500);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Failed to fetch risk summary');
      });
    });

    describe('POST /api/risk/calculate-position-size', () => {
      test('should calculate position size successfully', async () => {
        const requestData = {
          symbol: 'BTC/USDT',
          riskAmount: 100,
          entryPrice: 50000,
          stopLossPrice: 49000
        };

        const mockCalculation = {
          positionSize: 0.001,
          riskAmount: 100,
          leverage: 1,
          marginRequired: 50
        };

        const { riskManager } = require('../lib/riskManager');
        riskManager.calculatePositionSize.mockResolvedValue(mockCalculation);

        const response = await request(app)
          .post('/api/risk/calculate-position-size')
          .send(requestData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toEqual(mockCalculation);
        expect(riskManager.calculatePositionSize).toHaveBeenCalledWith(requestData);
      });

      test('should validate request data', async () => {
        const invalidData = {
          symbol: '', // Invalid symbol
          riskAmount: -100, // Invalid amount
          entryPrice: 0 // Invalid price
        };

        const response = await request(app)
          .post('/api/risk/calculate-position-size')
          .send(invalidData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('validation');
      });
    });

    describe('POST /api/risk/check-limits', () => {
      test('should check risk limits successfully', async () => {
        const requestData = {
          symbol: 'BTC/USDT',
          amount: 0.001,
          price: 50000,
          side: 'buy'
        };

        const mockRiskCheck = {
          allowed: true,
          reason: null,
          riskScore: 25,
          warnings: []
        };

        const { riskManager } = require('../lib/riskManager');
        riskManager.checkRiskLimits.mockResolvedValue(mockRiskCheck);

        const response = await request(app)
          .post('/api/risk/check-limits')
          .send(requestData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toEqual(mockRiskCheck);
      });

      test('should reject trade when limits exceeded', async () => {
        const requestData = {
          symbol: 'BTC/USDT',
          amount: 1.0, // Large amount
          price: 50000,
          side: 'buy'
        };

        const mockRiskCheck = {
          allowed: false,
          reason: 'Position size exceeds maximum allowed',
          riskScore: 95,
          warnings: ['High risk trade']
        };

        const { riskManager } = require('../lib/riskManager');
        riskManager.checkRiskLimits.mockResolvedValue(mockRiskCheck);

        const response = await request(app)
          .post('/api/risk/check-limits')
          .send(requestData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.data.allowed).toBe(false);
      });
    });

    describe('GET /api/risk/metrics', () => {
      test('should get risk metrics successfully', async () => {
        const mockMetrics = {
          sharpeRatio: 1.5,
          maxDrawdown: 0.08,
          volatility: 0.15,
          var95: 500,
          expectedShortfall: 750,
          beta: 0.8,
          correlation: 0.65
        };

        const { riskManager } = require('../lib/riskManager');
        riskManager.getRiskMetrics.mockResolvedValue(mockMetrics);

        const response = await request(app)
          .get('/api/risk/metrics')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toEqual(mockMetrics);
      });
    });

    describe('POST /api/risk/set-limits', () => {
      test('should set risk limits successfully', async () => {
        const requestData = {
          maxPositionSize: 0.01,
          maxDailyLoss: 500,
          maxDrawdown: 0.1,
          riskPerTrade: 0.02
        };

        const { riskManager } = require('../lib/riskManager');
        riskManager.setRiskLimits.mockResolvedValue({ success: true });

        const response = await request(app)
          .post('/api/risk/set-limits')
          .send(requestData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(riskManager.setRiskLimits).toHaveBeenCalledWith('test-user-123', requestData);
      });
    });

    describe('GET /api/risk/alerts', () => {
      test('should get risk alerts successfully', async () => {
        const mockAlerts = [
          {
            id: 'alert-1',
            type: 'high_risk',
            message: 'Portfolio risk exceeds threshold',
            severity: 'high',
            timestamp: new Date().toISOString(),
            acknowledged: false
          }
        ];

        const { riskManager } = require('../lib/riskManager');
        riskManager.getRiskAlerts.mockResolvedValue(mockAlerts);

        const response = await request(app)
          .get('/api/risk/alerts')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toEqual(mockAlerts);
      });
    });

    describe('POST /api/risk/alerts/:alertId/acknowledge', () => {
      test('should acknowledge risk alert successfully', async () => {
        const { riskManager } = require('../lib/riskManager');
        riskManager.acknowledgeRiskAlert.mockResolvedValue({ success: true });

        const response = await request(app)
          .post('/api/risk/alerts/alert-123/acknowledge')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(riskManager.acknowledgeRiskAlert).toHaveBeenCalledWith('test-user-123', 'alert-123');
      });
    });
  });

  describe('Backtesting API', () => {
    describe('POST /api/backtesting/run', () => {
      test('should run backtest successfully', async () => {
        const requestData = {
          strategy: {
            name: 'RSI Strategy',
            parameters: {
              rsiPeriod: 14,
              oversold: 30,
              overbought: 70
            }
          },
          startDate: '2023-01-01',
          endDate: '2023-12-31',
          initialCapital: 10000,
          symbols: ['BTC/USDT', 'ETH/USDT']
        };

        const mockBacktestResult = {
          id: 'backtest-123',
          strategyName: 'RSI Strategy',
          totalReturn: 15.5,
          sharpeRatio: 1.8,
          maxDrawdown: 5.2,
          winRate: 65,
          totalTrades: 150,
          startDate: '2023-01-01',
          endDate: '2023-12-31',
          status: 'completed'
        };

        const { backtestingEngine } = require('../lib/backtestingEngine');
        backtestingEngine.runBacktest.mockResolvedValue(mockBacktestResult);

        const response = await request(app)
          .post('/api/backtesting/run')
          .send(requestData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toEqual(mockBacktestResult);
        expect(backtestingEngine.runBacktest).toHaveBeenCalledWith(requestData);
      });

      test('should validate backtest parameters', async () => {
        const invalidData = {
          strategy: {
            name: '', // Invalid name
            parameters: {}
          },
          startDate: 'invalid-date',
          endDate: '2023-12-31',
          initialCapital: -1000, // Invalid capital
          symbols: [] // Empty symbols
        };

        const response = await request(app)
          .post('/api/backtesting/run')
          .send(invalidData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('validation');
      });
    });

    describe('GET /api/backtesting/results/:backtestId', () => {
      test('should get backtest results successfully', async () => {
        const mockResults = {
          id: 'backtest-123',
          strategyName: 'RSI Strategy',
          totalReturn: 15.5,
          sharpeRatio: 1.8,
          maxDrawdown: 5.2,
          winRate: 65,
          totalTrades: 150,
          trades: [
            {
              id: 'trade-1',
              symbol: 'BTC/USDT',
              side: 'buy',
              price: 50000,
              amount: 0.001,
              timestamp: '2023-01-15T10:30:00Z',
              profit: 50
            }
          ],
          equityCurve: [
            { date: '2023-01-01', value: 10000 },
            { date: '2023-12-31', value: 11550 }
          ]
        };

        const { backtestingEngine } = require('../lib/backtestingEngine');
        backtestingEngine.getBacktestResults.mockResolvedValue(mockResults);

        const response = await request(app)
          .get('/api/backtesting/results/backtest-123')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toEqual(mockResults);
      });

      test('should return 404 when backtest not found', async () => {
        const { backtestingEngine } = require('../lib/backtestingEngine');
        backtestingEngine.getBacktestResults.mockResolvedValue(null);

        const response = await request(app)
          .get('/api/backtesting/results/non-existent')
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Backtest not found');
      });
    });

    describe('GET /api/backtesting/history', () => {
      test('should get backtest history successfully', async () => {
        const mockHistory = [
          {
            id: 'backtest-123',
            strategyName: 'RSI Strategy',
            totalReturn: 15.5,
            status: 'completed',
            createdAt: '2023-01-01T00:00:00Z'
          },
          {
            id: 'backtest-124',
            strategyName: 'MACD Strategy',
            totalReturn: 12.3,
            status: 'completed',
            createdAt: '2023-01-02T00:00:00Z'
          }
        ];

        const { backtestingEngine } = require('../lib/backtestingEngine');
        backtestingEngine.getBacktestHistory.mockResolvedValue(mockHistory);

        const response = await request(app)
          .get('/api/backtesting/history')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toEqual(mockHistory);
      });

      test('should support pagination', async () => {
        const { backtestingEngine } = require('../lib/backtestingEngine');
        backtestingEngine.getBacktestHistory.mockResolvedValue([]);

        const response = await request(app)
          .get('/api/backtesting/history?page=2&limit=10')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(backtestingEngine.getBacktestHistory).toHaveBeenCalledWith({
          userId: 'test-user-123',
          page: 2,
          limit: 10
        });
      });
    });

    describe('DELETE /api/backtesting/:backtestId', () => {
      test('should delete backtest successfully', async () => {
        const { backtestingEngine } = require('../lib/backtestingEngine');
        backtestingEngine.deleteBacktest.mockResolvedValue({ success: true });

        const response = await request(app)
          .delete('/api/backtesting/backtest-123')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(backtestingEngine.deleteBacktest).toHaveBeenCalledWith('test-user-123', 'backtest-123');
      });

      test('should return 404 when backtest not found', async () => {
        const { backtestingEngine } = require('../lib/backtestingEngine');
        backtestingEngine.deleteBacktest.mockResolvedValue({ success: false });

        const response = await request(app)
          .delete('/api/backtesting/non-existent')
          .expect(404);

        expect(response.body.success).toBe(false);
      });
    });

    describe('POST /api/backtesting/optimize', () => {
      test('should optimize strategy parameters successfully', async () => {
        const requestData = {
          strategy: {
            name: 'RSI Strategy',
            parameters: {
              rsiPeriod: { min: 10, max: 20, step: 2 },
              oversold: { min: 20, max: 40, step: 5 },
              overbought: { min: 60, max: 80, step: 5 }
            }
          },
          optimizationTarget: 'sharpe_ratio',
          startDate: '2023-01-01',
          endDate: '2023-12-31',
          initialCapital: 10000
        };

        const mockOptimization = {
          bestParameters: {
            rsiPeriod: 14,
            oversold: 30,
            overbought: 70
          },
          bestScore: 1.8,
          optimizationResults: [
            {
              parameters: { rsiPeriod: 14, oversold: 30, overbought: 70 },
              score: 1.8,
              totalReturn: 15.5
            }
          ]
        };

        const { backtestingEngine } = require('../lib/backtestingEngine');
        backtestingEngine.optimizeStrategy.mockResolvedValue(mockOptimization);

        const response = await request(app)
          .post('/api/backtesting/optimize')
          .send(requestData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toEqual(mockOptimization);
      });
    });

    describe('GET /api/backtesting/performance/:backtestId', () => {
      test('should get performance metrics successfully', async () => {
        const mockPerformance = {
          totalReturn: 15.5,
          annualizedReturn: 15.5,
          volatility: 12.3,
          sharpeRatio: 1.8,
          sortinoRatio: 2.1,
          maxDrawdown: 5.2,
          calmarRatio: 2.9,
          winRate: 65,
          profitFactor: 1.8,
          totalTrades: 150,
          avgTradeReturn: 0.103,
          bestTrade: 5.2,
          worstTrade: -2.1
        };

        const { backtestingEngine } = require('../lib/backtestingEngine');
        backtestingEngine.getPerformanceMetrics.mockResolvedValue(mockPerformance);

        const response = await request(app)
          .get('/api/backtesting/performance/backtest-123')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toEqual(mockPerformance);
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle authentication errors', async () => {
      // Mock authentication failure
      const { authenticateToken } = require('../lib/auth');
      authenticateToken.mockImplementation((req, res, next) => {
        res.status(401).json({ success: false, error: 'Unauthorized' });
      });

      const response = await request(app)
        .get('/api/risk/summary')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Unauthorized');
    });

    test('should handle authorization errors', async () => {
      // Mock user with insufficient role
      const { authenticateToken, requireRole } = require('../lib/auth');
      authenticateToken.mockImplementation((req, res, next) => {
        req.user = { id: 'test-user-123', role: 'user' };
        next();
      });
      requireRole.mockImplementation(() => (req, res, next) => {
        res.status(403).json({ success: false, error: 'Insufficient permissions' });
      });

      const response = await request(app)
        .get('/api/risk/summary')
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Insufficient permissions');
    });

    test('should handle rate limiting', async () => {
      // Mock rate limiting
      const { rateLimitByUser } = require('../lib/auth');
      rateLimitByUser.mockImplementation(() => (req, res, next) => {
        res.status(429).json({ 
          success: false, 
          error: 'Rate limit exceeded',
          retryAfter: 3600
        });
      });

      const response = await request(app)
        .get('/api/risk/summary')
        .expect(429);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Rate limit exceeded');
    });

    test('should handle validation errors', async () => {
      const invalidData = {
        symbol: '', // Invalid
        amount: -1, // Invalid
        price: 0 // Invalid
      };

      const response = await request(app)
        .post('/api/risk/calculate-position-size')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('validation');
    });

    test('should handle server errors gracefully', async () => {
      const { riskManager } = require('../lib/riskManager');
      riskManager.getRiskSummary.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .get('/api/risk/summary')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Failed to fetch risk summary');
    });
  });

  describe('Performance and Load Testing', () => {
    test('should handle concurrent requests', async () => {
      const { riskManager } = require('../lib/riskManager');
      riskManager.getRiskSummary.mockResolvedValue({
        userId: 'test-user-123',
        totalRisk: 0.05,
        riskScore: 75
      });

      const requests = Array(10).fill().map(() =>
        request(app)
          .get('/api/risk/summary')
          .expect(200)
      );

      const responses = await Promise.all(requests);

      responses.forEach(response => {
        expect(response.body.success).toBe(true);
        expect(response.body.data.userId).toBe('test-user-123');
      });
    });

    test('should handle large payloads', async () => {
      const largeRequestData = {
        strategy: {
          name: 'Complex Strategy',
          parameters: {
            // Large parameter set
            ...Object.fromEntries(Array(100).fill().map((_, i) => [`param${i}`, i]))
          }
        },
        startDate: '2020-01-01',
        endDate: '2023-12-31',
        initialCapital: 100000,
        symbols: Array(50).fill().map((_, i) => `SYMBOL${i}/USDT`)
      };

      const { backtestingEngine } = require('../lib/backtestingEngine');
      backtestingEngine.runBacktest.mockResolvedValue({
        id: 'backtest-large',
        status: 'completed',
        totalReturn: 10.5
      });

      const response = await request(app)
        .post('/api/backtesting/run')
        .send(largeRequestData)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });
});