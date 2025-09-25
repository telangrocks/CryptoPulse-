/**
 * Trading Integration Tests
 * 
 * Tests for trading functionality including API key management,
 * trade execution, and portfolio management.
 * 
 * @author Shrikant Telang
 * @version 1.0.0
 */

const request = require('supertest');
const { app } = require('../../server');

describe('Trading Integration Tests', () => {
  let authToken;
  let userId;

  beforeAll(async () => {
    // Setup test user and authentication
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'trader@example.com',
        password: 'password123',
        username: 'trader',
        firstName: 'Test',
        lastName: 'Trader'
      });
    
    userId = registerResponse.body.user.id;
    
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'trader@example.com',
        password: 'password123'
      });
    
    authToken = loginResponse.body.sessionId;
  });

  describe('API Key Management', () => {
    it('should store encrypted API keys', async () => {
      const response = await request(app)
        .post('/api/trading/api-keys')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          exchange: 'binance',
          apiKey: 'test-api-key',
          secretKey: 'test-secret-key',
          label: 'Test Exchange'
        })
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'API keys stored successfully');
      expect(response.body).toHaveProperty('keyId');
    });

    it('should retrieve API keys (encrypted)', async () => {
      const response = await request(app)
        .get('/api/trading/api-keys')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('keys');
      expect(Array.isArray(response.body.keys)).toBe(true);
    });

    it('should validate API keys with exchange', async () => {
      const response = await request(app)
        .post('/api/trading/validate-api-keys')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          exchange: 'binance',
          apiKey: 'test-api-key',
          secretKey: 'test-secret-key'
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('valid', true);
    });
  });

  describe('Trade Execution', () => {
    it('should execute a buy order', async () => {
      const response = await request(app)
        .post('/api/trading/execute')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          pair: 'BTC/USDT',
          action: 'BUY',
          amount: 0.001,
          price: 50000,
          orderType: 'LIMIT'
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('orderId');
      expect(response.body).toHaveProperty('status', 'PENDING');
    });

    it('should execute a sell order', async () => {
      const response = await request(app)
        .post('/api/trading/execute')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          pair: 'BTC/USDT',
          action: 'SELL',
          amount: 0.001,
          price: 51000,
          orderType: 'LIMIT'
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('orderId');
      expect(response.body).toHaveProperty('status', 'PENDING');
    });

    it('should reject invalid trade parameters', async () => {
      const response = await request(app)
        .post('/api/trading/execute')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          pair: 'INVALID/PAIR',
          action: 'BUY',
          amount: -0.001, // Invalid negative amount
          price: 50000
        })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation Error');
    });

    it('should enforce trading limits', async () => {
      const response = await request(app)
        .post('/api/trading/execute')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          pair: 'BTC/USDT',
          action: 'BUY',
          amount: 1000000, // Exceeds maximum trade amount
          price: 50000
        })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Trade Limit Exceeded');
    });
  });

  describe('Portfolio Management', () => {
    it('should get portfolio summary', async () => {
      const response = await request(app)
        .get('/api/portfolio/summary')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('totalValue');
      expect(response.body).toHaveProperty('totalReturn');
      expect(response.body).toHaveProperty('assets');
    });

    it('should get asset details', async () => {
      const response = await request(app)
        .get('/api/portfolio/assets')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('assets');
      expect(Array.isArray(response.body.assets)).toBe(true);
    });

    it('should calculate portfolio performance', async () => {
      const response = await request(app)
        .get('/api/portfolio/performance')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('performance');
      expect(response.body.performance).toHaveProperty('totalReturn');
      expect(response.body.performance).toHaveProperty('totalReturnPercentage');
    });
  });

  describe('Market Data', () => {
    it('should get real-time price data', async () => {
      const response = await request(app)
        .get('/api/market/price/BTC/USDT')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('price');
      expect(response.body).toHaveProperty('symbol', 'BTC/USDT');
      expect(typeof response.body.price).toBe('number');
    });

    it('should get historical data', async () => {
      const response = await request(app)
        .get('/api/market/history/BTC/USDT?interval=1h&limit=24')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeLessThanOrEqual(24);
    });

    it('should get trading signals', async () => {
      const response = await request(app)
        .get('/api/market/signals/BTC/USDT')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('signals');
      expect(Array.isArray(response.body.signals)).toBe(true);
    });
  });

  describe('Risk Management', () => {
    it('should calculate portfolio risk', async () => {
      const response = await request(app)
        .get('/api/trading/risk-assessment')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('riskLevel');
      expect(response.body).toHaveProperty('riskScore');
      expect(response.body).toHaveProperty('recommendations');
    });

    it('should enforce stop-loss limits', async () => {
      const response = await request(app)
        .post('/api/trading/set-stop-loss')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          pair: 'BTC/USDT',
          stopLossPrice: 45000,
          takeProfitPrice: 55000
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Stop-loss and take-profit set successfully');
    });
  });

  describe('Order Management', () => {
    it('should get order history', async () => {
      const response = await request(app)
        .get('/api/trading/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('orders');
      expect(Array.isArray(response.body.orders)).toBe(true);
    });

    it('should cancel an order', async () => {
      // First create an order
      const createResponse = await request(app)
        .post('/api/trading/execute')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          pair: 'BTC/USDT',
          action: 'BUY',
          amount: 0.001,
          price: 50000,
          orderType: 'LIMIT'
        });

      const orderId = createResponse.body.orderId;

      // Then cancel it
      const response = await request(app)
        .delete(`/api/trading/orders/${orderId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Order cancelled successfully');
    });

    it('should get order status', async () => {
      const response = await request(app)
        .get('/api/trading/orders/status/test-order-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('status');
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      // Mock network error
      const response = await request(app)
        .post('/api/trading/execute')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          pair: 'BTC/USDT',
          action: 'BUY',
          amount: 0.001,
          price: 50000
        })
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });

    it('should handle invalid authentication', async () => {
      const response = await request(app)
        .post('/api/trading/execute')
        .set('Authorization', 'Bearer invalid-token')
        .send({
          pair: 'BTC/USDT',
          action: 'BUY',
          amount: 0.001,
          price: 50000
        })
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Unauthorized');
    });
  });
});