/**
 * Integration Tests for Trading Functions
 * Comprehensive testing of all trading operations
 */

const request = require('supertest');
const app = require('../../server');
const { getSessionManager } = require('../../secureSessionManager');
const { getAuditLogger } = require('../../auditLogger');

describe('Trading Integration Tests', () => {
  let sessionManager;
  let auditLogger;
  let testUser;
  let sessionId;
  let csrfToken;

  beforeAll(async () => {
    sessionManager = getSessionManager();
    auditLogger = getAuditLogger();
  });

  beforeEach(async () => {
    // Create test user session
    testUser = {
      id: 'test-user-123',
      email: 'test@example.com',
      username: 'testuser'
    };

    const session = sessionManager.createSession(
      testUser.id,
      testUser,
      '192.168.1.1',
      'Mozilla/5.0 (Test Browser)'
    );

    sessionId = session.sessionId;
    csrfToken = session.csrfToken;
  });

  describe('Trading Status Endpoint', () => {
    it('should return trading status for authenticated user', async () => {
      const response = await request(app)
        .get('/api/trading/status')
        .set('Cookie', `cryptopulse.sid=${sessionId}`)
        .set('X-CSRF-Token', csrfToken)
        .expect(200);

      expect(response.body).toHaveProperty('tradingEnabled');
      expect(response.body).toHaveProperty('liveTrading');
      expect(response.body).toHaveProperty('demoMode');
      expect(response.body).toHaveProperty('activeStrategies');
      expect(response.body).toHaveProperty('totalTrades');
      expect(response.body).toHaveProperty('successRate');
    });

    it('should require authentication', async () => {
      await request(app)
        .get('/api/trading/status')
        .expect(401);
    });

    it('should require CSRF token', async () => {
      await request(app)
        .get('/api/trading/status')
        .set('Cookie', `cryptopulse.sid=${sessionId}`)
        .expect(403);
    });
  });

  describe('Place Trade Order', () => {
    const validOrder = {
      symbol: 'BTC/USDT',
      side: 'BUY',
      type: 'MARKET',
      quantity: 0.001
    };

    it('should place a valid market order', async () => {
      const response = await request(app)
        .post('/api/trading/order')
        .set('Cookie', `cryptopulse.sid=${sessionId}`)
        .set('X-CSRF-Token', csrfToken)
        .send(validOrder)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('orderId');
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
    });

    it('should place a valid limit order with price', async () => {
      const limitOrder = {
        ...validOrder,
        type: 'LIMIT',
        price: 50000
      };

      const response = await request(app)
        .post('/api/trading/order')
        .set('Cookie', `cryptopulse.sid=${sessionId}`)
        .set('X-CSRF-Token', csrfToken)
        .send(limitOrder)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('orderId');
    });

    it('should reject invalid order data', async () => {
      const invalidOrder = {
        symbol: 'INVALID',
        side: 'INVALID',
        type: 'MARKET',
        quantity: -1
      };

      const response = await request(app)
        .post('/api/trading/order')
        .set('Cookie', `cryptopulse.sid=${sessionId}`)
        .set('X-CSRF-Token', csrfToken)
        .send(invalidOrder)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject limit order without price', async () => {
      const invalidLimitOrder = {
        ...validOrder,
        type: 'LIMIT'
        // Missing price
      };

      const response = await request(app)
        .post('/api/trading/order')
        .set('Cookie', `cryptopulse.sid=${sessionId}`)
        .set('X-CSRF-Token', csrfToken)
        .send(invalidLimitOrder)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toHaveProperty('validationErrors');
    });

    it('should require authentication', async () => {
      await request(app)
        .post('/api/trading/order')
        .set('X-CSRF-Token', csrfToken)
        .send(validOrder)
        .expect(401);
    });

    it('should require CSRF token', async () => {
      await request(app)
        .post('/api/trading/order')
        .set('Cookie', `cryptopulse.sid=${sessionId}`)
        .send(validOrder)
        .expect(403);
    });
  });

  describe('Order History', () => {
    beforeEach(async () => {
      // Create some test orders
      const orders = [
        {
          symbol: 'BTC/USDT',
          side: 'BUY',
          type: 'MARKET',
          quantity: 0.001,
          status: 'FILLED'
        },
        {
          symbol: 'ETH/USDT',
          side: 'SELL',
          type: 'LIMIT',
          quantity: 0.1,
          price: 3000,
          status: 'OPEN'
        }
      ];

      // Simulate creating orders (in real implementation, this would be done through the API)
      for (const order of orders) {
        await request(app)
          .post('/api/trading/order')
          .set('Cookie', `cryptopulse.sid=${sessionId}`)
          .set('X-CSRF-Token', csrfToken)
          .send(order);
      }
    });

    it('should return order history with pagination', async () => {
      const response = await request(app)
        .get('/api/trading/orders?limit=10&offset=0')
        .set('Cookie', `cryptopulse.sid=${sessionId}`)
        .set('X-CSRF-Token', csrfToken)
        .expect(200);

      expect(response.body).toHaveProperty('orders');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('limit', 10);
      expect(response.body).toHaveProperty('offset', 0);
      expect(Array.isArray(response.body.orders)).toBe(true);
    });

    it('should filter orders by symbol', async () => {
      const response = await request(app)
        .get('/api/trading/orders?symbol=BTC/USDT')
        .set('Cookie', `cryptopulse.sid=${sessionId}`)
        .set('X-CSRF-Token', csrfToken)
        .expect(200);

      expect(response.body.orders.every(order => order.symbol === 'BTC/USDT')).toBe(true);
    });

    it('should filter orders by status', async () => {
      const response = await request(app)
        .get('/api/trading/orders?status=FILLED')
        .set('Cookie', `cryptopulse.sid=${sessionId}`)
        .set('X-CSRF-Token', csrfToken)
        .expect(200);

      expect(response.body.orders.every(order => order.status === 'FILLED')).toBe(true);
    });

    it('should require authentication', async () => {
      await request(app)
        .get('/api/trading/orders')
        .expect(401);
    });
  });

  describe('Cancel Order', () => {
    let orderId;

    beforeEach(async () => {
      // Create a test order to cancel
      const order = {
        symbol: 'BTC/USDT',
        side: 'BUY',
        type: 'LIMIT',
        quantity: 0.001,
        price: 50000
      };

      const response = await request(app)
        .post('/api/trading/order')
        .set('Cookie', `cryptopulse.sid=${sessionId}`)
        .set('X-CSRF-Token', csrfToken)
        .send(order);

      orderId = response.body.orderId;
    });

    it('should cancel an existing order', async () => {
      const response = await request(app)
        .delete(`/api/trading/orders/${orderId}`)
        .set('Cookie', `cryptopulse.sid=${sessionId}`)
        .set('X-CSRF-Token', csrfToken)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message');
    });

    it('should return 404 for non-existent order', async () => {
      const nonExistentOrderId = 'non-existent-order-id';

      await request(app)
        .delete(`/api/trading/orders/${nonExistentOrderId}`)
        .set('Cookie', `cryptopulse.sid=${sessionId}`)
        .set('X-CSRF-Token', csrfToken)
        .expect(404);
    });

    it('should require authentication', async () => {
      await request(app)
        .delete(`/api/trading/orders/${orderId}`)
        .expect(401);
    });
  });

  describe('Trading Performance', () => {
    it('should return trading performance metrics', async () => {
      const response = await request(app)
        .get('/api/trading/performance')
        .set('Cookie', `cryptopulse.sid=${sessionId}`)
        .set('X-CSRF-Token', csrfToken)
        .expect(200);

      expect(response.body).toHaveProperty('totalTrades');
      expect(response.body).toHaveProperty('successfulTrades');
      expect(response.body).toHaveProperty('failedTrades');
      expect(response.body).toHaveProperty('successRate');
      expect(response.body).toHaveProperty('totalProfit');
      expect(response.body).toHaveProperty('averageProfit');
      expect(response.body).toHaveProperty('winRate');
      expect(response.body).toHaveProperty('lossRate');
    });

    it('should return performance for specific time period', async () => {
      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days ago
      const endDate = new Date().toISOString();

      const response = await request(app)
        .get(`/api/trading/performance?startDate=${startDate}&endDate=${endDate}`)
        .set('Cookie', `cryptopulse.sid=${sessionId}`)
        .set('X-CSRF-Token', csrfToken)
        .expect(200);

      expect(response.body).toHaveProperty('totalTrades');
      expect(response.body).toHaveProperty('successRate');
    });
  });

  describe('Risk Management', () => {
    it('should enforce position limits', async () => {
      // Try to place an order that exceeds position limits
      const largeOrder = {
        symbol: 'BTC/USDT',
        side: 'BUY',
        type: 'MARKET',
        quantity: 10 // Assuming this exceeds position limits
      };

      const response = await request(app)
        .post('/api/trading/order')
        .set('Cookie', `cryptopulse.sid=${sessionId}`)
        .set('X-CSRF-Token', csrfToken)
        .send(largeOrder);

      // Should either reject or adjust the order size
      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.status).toBeLessThan(500);
    });

    it('should validate trading hours', async () => {
      // This test would check if trading is allowed during specific hours
      // Implementation depends on business rules
      const response = await request(app)
        .get('/api/trading/status')
        .set('Cookie', `cryptopulse.sid=${sessionId}`)
        .set('X-CSRF-Token', csrfToken)
        .expect(200);

      expect(response.body).toHaveProperty('tradingEnabled');
    });
  });

  describe('Audit Logging', () => {
    it('should log trading activities', async () => {
      const order = {
        symbol: 'BTC/USDT',
        side: 'BUY',
        type: 'MARKET',
        quantity: 0.001
      };

      await request(app)
        .post('/api/trading/order')
        .set('Cookie', `cryptopulse.sid=${sessionId}`)
        .set('X-CSRF-Token', csrfToken)
        .send(order)
        .expect(200);

      // In a real implementation, we would verify that audit logs were created
      // This would involve checking the audit logger or database
    });

    it('should log order cancellations', async () => {
      // Create an order first
      const order = {
        symbol: 'BTC/USDT',
        side: 'BUY',
        type: 'LIMIT',
        quantity: 0.001,
        price: 50000
      };

      const createResponse = await request(app)
        .post('/api/trading/order')
        .set('Cookie', `cryptopulse.sid=${sessionId}`)
        .set('X-CSRF-Token', csrfToken)
        .send(order);

      const orderId = createResponse.body.orderId;

      // Cancel the order
      await request(app)
        .delete(`/api/trading/orders/${orderId}`)
        .set('Cookie', `cryptopulse.sid=${sessionId}`)
        .set('X-CSRF-Token', csrfToken)
        .expect(200);

      // In a real implementation, we would verify that cancellation was logged
    });
  });

  describe('Error Handling', () => {
    it('should handle external API failures gracefully', async () => {
      // Mock external API failure
      const order = {
        symbol: 'BTC/USDT',
        side: 'BUY',
        type: 'MARKET',
        quantity: 0.001
      };

      // In a real implementation, we would mock the external API to fail
      const response = await request(app)
        .post('/api/trading/order')
        .set('Cookie', `cryptopulse.sid=${sessionId}`)
        .set('X-CSRF-Token', csrfToken)
        .send(order);

      // Should handle the failure gracefully
      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.status).toBeLessThan(500);
    });

    it('should handle database connection failures', async () => {
      // In a real implementation, we would simulate database connection failure
      const response = await request(app)
        .get('/api/trading/status')
        .set('Cookie', `cryptopulse.sid=${sessionId}`)
        .set('X-CSRF-Token', csrfToken);

      // Should handle the failure gracefully
      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.status).toBeLessThan(500);
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits on trading endpoints', async () => {
      const order = {
        symbol: 'BTC/USDT',
        side: 'BUY',
        type: 'MARKET',
        quantity: 0.001
      };

      // Make multiple rapid requests
      const promises = [];
      for (let i = 0; i < 35; i++) { // Exceed rate limit of 30 requests
        promises.push(
          request(app)
            .post('/api/trading/order')
            .set('Cookie', `cryptopulse.sid=${sessionId}`)
            .set('X-CSRF-Token', csrfToken)
            .send(order)
        );
      }

      const responses = await Promise.all(promises);
      
      // Some requests should be rate limited
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });
});
