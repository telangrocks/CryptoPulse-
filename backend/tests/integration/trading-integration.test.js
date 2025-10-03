// =============================================================================
// Trading Integration Tests - Production Ready
// =============================================================================
// Comprehensive integration tests for trading system

const request = require('supertest');
const express = require('express');
const { tradingRoutes } = require('../../routes/trading');
const { authMiddleware } = require('../../lib/auth');
const { securityMiddleware } = require('../../lib/security');
const { rateLimitMiddleware } = require('../../lib/security');

describe('Trading Integration', () => {
  let app;
  let userToken;
  let userId;

  beforeEach(async () => {
    app = express();
    app.use(express.json());
    app.use(securityMiddleware);
    app.use(rateLimitMiddleware);
    app.use('/api/trading', tradingRoutes);

    // Register and login to get user token
    const userData = {
      email: 'trader@example.com',
      password: 'SecurePassword123!',
      name: 'Test Trader'
    };

    await request(app)
      .post('/api/auth/register')
      .send(userData);

    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: userData.email,
        password: userData.password
      });

    userToken = loginResponse.body.tokens.accessToken;
    userId = loginResponse.body.user.id;
  });

  describe('Trading Session Management', () => {
    test('should create new trading session', async () => {
      const sessionData = {
        name: 'Test Trading Session',
        exchange: 'binance',
        strategy: 'test-strategy',
        config: {
          symbol: 'BTC/USDT',
          riskPercent: 2,
          maxPositions: 5
        }
      };

      const response = await request(app)
        .post('/api/trading/sessions')
        .set('Authorization', `Bearer ${userToken}`)
        .send(sessionData)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('session');
      expect(response.body.session.name).toBe(sessionData.name);
      expect(response.body.session.exchange).toBe(sessionData.exchange);
      expect(response.body.session.strategy).toBe(sessionData.strategy);
      expect(response.body.session.status).toBe('active');
    });

    test('should get user trading sessions', async () => {
      // Create a session first
      const sessionData = {
        name: 'Test Session',
        exchange: 'binance',
        strategy: 'test-strategy'
      };

      await request(app)
        .post('/api/trading/sessions')
        .set('Authorization', `Bearer ${userToken}`)
        .send(sessionData);

      const response = await request(app)
        .get('/api/trading/sessions')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('sessions');
      expect(Array.isArray(response.body.sessions)).toBe(true);
      expect(response.body.sessions.length).toBeGreaterThan(0);
    });

    test('should update trading session', async () => {
      // Create a session first
      const sessionData = {
        name: 'Test Session',
        exchange: 'binance',
        strategy: 'test-strategy'
      };

      const createResponse = await request(app)
        .post('/api/trading/sessions')
        .set('Authorization', `Bearer ${userToken}`)
        .send(sessionData);

      const sessionId = createResponse.body.session.id;

      const updateData = {
        name: 'Updated Session',
        config: {
          symbol: 'ETH/USDT',
          riskPercent: 3
        }
      };

      const response = await request(app)
        .put(`/api/trading/sessions/${sessionId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.session.name).toBe(updateData.name);
      expect(response.body.session.config.symbol).toBe(updateData.config.symbol);
    });

    test('should stop trading session', async () => {
      // Create a session first
      const sessionData = {
        name: 'Test Session',
        exchange: 'binance',
        strategy: 'test-strategy'
      };

      const createResponse = await request(app)
        .post('/api/trading/sessions')
        .set('Authorization', `Bearer ${userToken}`)
        .send(sessionData);

      const sessionId = createResponse.body.session.id;

      const response = await request(app)
        .post(`/api/trading/sessions/${sessionId}/stop`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.session.status).toBe('stopped');
    });

    test('should delete trading session', async () => {
      // Create a session first
      const sessionData = {
        name: 'Test Session',
        exchange: 'binance',
        strategy: 'test-strategy'
      };

      const createResponse = await request(app)
        .post('/api/trading/sessions')
        .set('Authorization', `Bearer ${userToken}`)
        .send(sessionData);

      const sessionId = createResponse.body.session.id;

      const response = await request(app)
        .delete(`/api/trading/sessions/${sessionId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.message).toContain('deleted successfully');
    });

    test('should validate session data', async () => {
      const invalidSessionData = {
        name: '', // Empty name
        exchange: 'invalid-exchange',
        strategy: 'test-strategy'
      };

      const response = await request(app)
        .post('/api/trading/sessions')
        .set('Authorization', `Bearer ${userToken}`)
        .send(invalidSessionData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('details');
      expect(response.body.details).toContain('Session name is required');
      expect(response.body.details).toContain('Invalid exchange');
    });
  });

  describe('Position Management', () => {
    let sessionId;

    beforeEach(async () => {
      // Create a trading session
      const sessionData = {
        name: 'Test Session',
        exchange: 'binance',
        strategy: 'test-strategy'
      };

      const createResponse = await request(app)
        .post('/api/trading/sessions')
        .set('Authorization', `Bearer ${userToken}`)
        .send(sessionData);

      sessionId = createResponse.body.session.id;
    });

    test('should open new position', async () => {
      const positionData = {
        sessionId,
        symbol: 'BTC/USDT',
        side: 'long',
        size: 0.1,
        price: 50000,
        stopLoss: 45000,
        takeProfit: 55000
      };

      const response = await request(app)
        .post('/api/trading/positions')
        .set('Authorization', `Bearer ${userToken}`)
        .send(positionData)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('position');
      expect(response.body.position.symbol).toBe(positionData.symbol);
      expect(response.body.position.side).toBe(positionData.side);
      expect(response.body.position.size).toBe(positionData.size);
      expect(response.body.position.status).toBe('open');
    });

    test('should get user positions', async () => {
      // Create a position first
      const positionData = {
        sessionId,
        symbol: 'BTC/USDT',
        side: 'long',
        size: 0.1,
        price: 50000
      };

      await request(app)
        .post('/api/trading/positions')
        .set('Authorization', `Bearer ${userToken}`)
        .send(positionData);

      const response = await request(app)
        .get('/api/trading/positions')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('positions');
      expect(Array.isArray(response.body.positions)).toBe(true);
      expect(response.body.positions.length).toBeGreaterThan(0);
    });

    test('should update position', async () => {
      // Create a position first
      const positionData = {
        sessionId,
        symbol: 'BTC/USDT',
        side: 'long',
        size: 0.1,
        price: 50000
      };

      const createResponse = await request(app)
        .post('/api/trading/positions')
        .set('Authorization', `Bearer ${userToken}`)
        .send(positionData);

      const positionId = createResponse.body.position.id;

      const updateData = {
        stopLoss: 45000,
        takeProfit: 55000
      };

      const response = await request(app)
        .put(`/api/trading/positions/${positionId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.position.stopLoss).toBe(updateData.stopLoss);
      expect(response.body.position.takeProfit).toBe(updateData.takeProfit);
    });

    test('should close position', async () => {
      // Create a position first
      const positionData = {
        sessionId,
        symbol: 'BTC/USDT',
        side: 'long',
        size: 0.1,
        price: 50000
      };

      const createResponse = await request(app)
        .post('/api/trading/positions')
        .set('Authorization', `Bearer ${userToken}`)
        .send(positionData);

      const positionId = createResponse.body.position.id;

      const response = await request(app)
        .post(`/api/trading/positions/${positionId}/close`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ closePrice: 51000 })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.position.status).toBe('closed');
      expect(response.body.position.closePrice).toBe(51000);
    });

    test('should validate position data', async () => {
      const invalidPositionData = {
        sessionId,
        symbol: '', // Empty symbol
        side: 'invalid-side',
        size: -0.1, // Negative size
        price: 0 // Zero price
      };

      const response = await request(app)
        .post('/api/trading/positions')
        .set('Authorization', `Bearer ${userToken}`)
        .send(invalidPositionData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('details');
      expect(response.body.details).toContain('Symbol is required');
      expect(response.body.details).toContain('Invalid side');
      expect(response.body.details).toContain('Size must be positive');
      expect(response.body.details).toContain('Price must be positive');
    });
  });

  describe('Market Data', () => {
    test('should get market prices', async () => {
      const response = await request(app)
        .get('/api/trading/market/prices')
        .set('Authorization', `Bearer ${userToken}`)
        .query({ symbols: 'BTC/USDT,ETH/USDT' })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('prices');
      expect(response.body.prices).toHaveProperty('BTC/USDT');
      expect(response.body.prices).toHaveProperty('ETH/USDT');
    });

    test('should get market depth', async () => {
      const response = await request(app)
        .get('/api/trading/market/depth')
        .set('Authorization', `Bearer ${userToken}`)
        .query({ symbol: 'BTC/USDT', limit: 10 })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('depth');
      expect(response.body.depth).toHaveProperty('bids');
      expect(response.body.depth).toHaveProperty('asks');
      expect(Array.isArray(response.body.depth.bids)).toBe(true);
      expect(Array.isArray(response.body.depth.asks)).toBe(true);
    });

    test('should get market trades', async () => {
      const response = await request(app)
        .get('/api/trading/market/trades')
        .set('Authorization', `Bearer ${userToken}`)
        .query({ symbol: 'BTC/USDT', limit: 50 })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('trades');
      expect(Array.isArray(response.body.trades)).toBe(true);
    });

    test('should get market candles', async () => {
      const response = await request(app)
        .get('/api/trading/market/candles')
        .set('Authorization', `Bearer ${userToken}`)
        .query({ 
          symbol: 'BTC/USDT', 
          timeframe: '1h', 
          limit: 100 
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('candles');
      expect(Array.isArray(response.body.candles)).toBe(true);
    });

    test('should validate market data parameters', async () => {
      const response = await request(app)
        .get('/api/trading/market/prices')
        .set('Authorization', `Bearer ${userToken}`)
        .query({ symbols: '' }) // Empty symbols
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Symbols parameter is required');
    });
  });

  describe('Trading Analytics', () => {
    let sessionId;

    beforeEach(async () => {
      // Create a trading session with some positions
      const sessionData = {
        name: 'Analytics Session',
        exchange: 'binance',
        strategy: 'test-strategy'
      };

      const createResponse = await request(app)
        .post('/api/trading/sessions')
        .set('Authorization', `Bearer ${userToken}`)
        .send(sessionData);

      sessionId = createResponse.body.session.id;

      // Create some positions
      const positions = [
        {
          sessionId,
          symbol: 'BTC/USDT',
          side: 'long',
          size: 0.1,
          price: 50000,
          closePrice: 51000
        },
        {
          sessionId,
          symbol: 'ETH/USDT',
          side: 'short',
          size: 1.0,
          price: 3000,
          closePrice: 2900
        }
      ];

      for (const position of positions) {
        const createPosResponse = await request(app)
          .post('/api/trading/positions')
          .set('Authorization', `Bearer ${userToken}`)
          .send(position);

        // Close the position
        await request(app)
          .post(`/api/trading/positions/${createPosResponse.body.position.id}/close`)
          .set('Authorization', `Bearer ${userToken}`)
          .send({ closePrice: position.closePrice });
      }
    });

    test('should get session performance', async () => {
      const response = await request(app)
        .get(`/api/trading/sessions/${sessionId}/performance`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('performance');
      expect(response.body.performance).toHaveProperty('totalTrades');
      expect(response.body.performance).toHaveProperty('winRate');
      expect(response.body.performance).toHaveProperty('totalPnL');
      expect(response.body.performance).toHaveProperty('profitFactor');
    });

    test('should get user trading statistics', async () => {
      const response = await request(app)
        .get('/api/trading/statistics')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('statistics');
      expect(response.body.statistics).toHaveProperty('totalSessions');
      expect(response.body.statistics).toHaveProperty('activePositions');
      expect(response.body.statistics).toHaveProperty('totalPnL');
      expect(response.body.statistics).toHaveProperty('winRate');
    });

    test('should get trading history', async () => {
      const response = await request(app)
        .get('/api/trading/history')
        .set('Authorization', `Bearer ${userToken}`)
        .query({ 
          startDate: '2024-01-01',
          endDate: '2024-12-31',
          limit: 100
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('history');
      expect(Array.isArray(response.body.history)).toBe(true);
    });

    test('should get risk metrics', async () => {
      const response = await request(app)
        .get('/api/trading/risk-metrics')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('riskMetrics');
      expect(response.body.riskMetrics).toHaveProperty('var');
      expect(response.body.riskMetrics).toHaveProperty('maxDrawdown');
      expect(response.body.riskMetrics).toHaveProperty('sharpeRatio');
      expect(response.body.riskMetrics).toHaveProperty('exposure');
    });
  });

  describe('Risk Management', () => {
    test('should enforce position size limits', async () => {
      // Create a session
      const sessionData = {
        name: 'Risk Test Session',
        exchange: 'binance',
        strategy: 'test-strategy',
        config: {
          maxPositionSize: 0.5,
          maxRiskPerTrade: 2
        }
      };

      const createResponse = await request(app)
        .post('/api/trading/sessions')
        .set('Authorization', `Bearer ${userToken}`)
        .send(sessionData);

      const sessionId = createResponse.body.session.id;

      // Try to create position exceeding size limit
      const positionData = {
        sessionId,
        symbol: 'BTC/USDT',
        side: 'long',
        size: 1.0, // Exceeds max position size
        price: 50000
      };

      const response = await request(app)
        .post('/api/trading/positions')
        .set('Authorization', `Bearer ${userToken}`)
        .send(positionData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Position size exceeds maximum allowed');
    });

    test('should enforce daily loss limits', async () => {
      // Create a session with daily loss limit
      const sessionData = {
        name: 'Loss Limit Session',
        exchange: 'binance',
        strategy: 'test-strategy',
        config: {
          dailyLossLimit: 1000
        }
      };

      const createResponse = await request(app)
        .post('/api/trading/sessions')
        .set('Authorization', `Bearer ${userToken}`)
        .send(sessionData);

      const sessionId = createResponse.body.session.id;

      // Create positions that would exceed daily loss limit
      const positions = [
        {
          sessionId,
          symbol: 'BTC/USDT',
          side: 'long',
          size: 0.1,
          price: 50000
        }
      ];

      for (const position of positions) {
        const createPosResponse = await request(app)
          .post('/api/trading/positions')
          .set('Authorization', `Bearer ${userToken}`)
          .send(position);

        // Close with loss
        await request(app)
          .post(`/api/trading/positions/${createPosResponse.body.position.id}/close`)
          .set('Authorization', `Bearer ${userToken}`)
          .send({ closePrice: 40000 }); // 1000 loss
      }

      // Try to create another position
      const newPositionData = {
        sessionId,
        symbol: 'ETH/USDT',
        side: 'long',
        size: 0.1,
        price: 3000
      };

      const response = await request(app)
        .post('/api/trading/positions')
        .set('Authorization', `Bearer ${userToken}`)
        .send(newPositionData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Daily loss limit exceeded');
    });

    test('should stop trading on circuit breaker', async () => {
      // Create a session
      const sessionData = {
        name: 'Circuit Breaker Session',
        exchange: 'binance',
        strategy: 'test-strategy',
        config: {
          circuitBreakerLoss: 500,
          circuitBreakerTrades: 5
        }
      };

      const createResponse = await request(app)
        .post('/api/trading/sessions')
        .set('Authorization', `Bearer ${userToken}`)
        .send(sessionData);

      const sessionId = createResponse.body.session.id;

      // Create multiple losing trades to trigger circuit breaker
      for (let i = 0; i < 5; i++) {
        const positionData = {
          sessionId,
          symbol: 'BTC/USDT',
          side: 'long',
          size: 0.1,
          price: 50000
        };

        const createPosResponse = await request(app)
          .post('/api/trading/positions')
          .set('Authorization', `Bearer ${userToken}`)
          .send(positionData);

        // Close with loss
        await request(app)
          .post(`/api/trading/positions/${createPosResponse.body.position.id}/close`)
          .set('Authorization', `Bearer ${userToken}`)
          .send({ closePrice: 49500 }); // 50 loss per trade
      }

      // Check if session is stopped
      const sessionResponse = await request(app)
        .get(`/api/trading/sessions/${sessionId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(sessionResponse.body.session.status).toBe('stopped');
      expect(sessionResponse.body.session.reason).toContain('Circuit breaker triggered');
    });
  });

  describe('Performance and Scalability', () => {
    test('should handle concurrent position creation', async () => {
      // Create a session
      const sessionData = {
        name: 'Concurrent Session',
        exchange: 'binance',
        strategy: 'test-strategy'
      };

      const createResponse = await request(app)
        .post('/api/trading/sessions')
        .set('Authorization', `Bearer ${userToken}`)
        .send(sessionData);

      const sessionId = createResponse.body.session.id;

      // Create multiple positions concurrently
      const promises = [];
      for (let i = 0; i < 10; i++) {
        const positionData = {
          sessionId,
          symbol: `SYMBOL${i}/USDT`,
          side: 'long',
          size: 0.1,
          price: 50000
        };

        promises.push(
          request(app)
            .post('/api/trading/positions')
            .set('Authorization', `Bearer ${userToken}`)
            .send(positionData)
        );
      }

      const responses = await Promise.all(promises);
      
      // All should succeed
      const successful = responses.filter(r => r.status === 201);
      expect(successful).toHaveLength(10);
    });

    test('should handle high-frequency market data requests', async () => {
      const promises = [];
      
      // Make many market data requests
      for (let i = 0; i < 100; i++) {
        promises.push(
          request(app)
            .get('/api/trading/market/prices')
            .set('Authorization', `Bearer ${userToken}`)
            .query({ symbols: 'BTC/USDT,ETH/USDT' })
        );
      }

      const start = Date.now();
      const responses = await Promise.all(promises);
      const duration = Date.now() - start;

      // Should complete within reasonable time
      expect(duration).toBeLessThan(10000);
      
      // Most requests should succeed
      const successful = responses.filter(r => r.status === 200);
      expect(successful.length).toBeGreaterThan(90);
    });

    test('should handle large position history queries', async () => {
      // Create a session with many positions
      const sessionData = {
        name: 'Large History Session',
        exchange: 'binance',
        strategy: 'test-strategy'
      };

      const createResponse = await request(app)
        .post('/api/trading/sessions')
        .set('Authorization', `Bearer ${userToken}`)
        .send(sessionData);

      const sessionId = createResponse.body.session.id;

      // Create many positions
      for (let i = 0; i < 100; i++) {
        const positionData = {
          sessionId,
          symbol: 'BTC/USDT',
          side: 'long',
          size: 0.01,
          price: 50000
        };

        const createPosResponse = await request(app)
          .post('/api/trading/positions')
          .set('Authorization', `Bearer ${userToken}`)
          .send(positionData);

        // Close immediately
        await request(app)
          .post(`/api/trading/positions/${createPosResponse.body.position.id}/close`)
          .set('Authorization', `Bearer ${userToken}`)
          .send({ closePrice: 50000 });
      }

      // Query large history
      const response = await request(app)
        .get('/api/trading/history')
        .set('Authorization', `Bearer ${userToken}`)
        .query({ limit: 1000 })
        .expect(200);

      expect(response.body.history.length).toBeGreaterThan(100);
    });
  });
});
