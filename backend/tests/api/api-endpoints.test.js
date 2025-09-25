/**
 * API Endpoints Comprehensive Tests
 * 
 * Tests all API endpoints for proper functionality, validation, and error handling.
 * 
 * @author Shrikant Telang
 * @version 1.0.0
 */

const request = require('supertest');
const { app } = require('../../server');

describe('API Endpoints Tests', () => {
  let authToken;
  let userId;

  beforeAll(async () => {
    // Setup test user
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'apitest@example.com',
        password: 'TestPassword123!',
        username: 'apitest',
        firstName: 'API',
        lastName: 'Test'
      });

    userId = registerResponse.body.user.id;

    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'apitest@example.com',
        password: 'TestPassword123!'
      });

    authToken = loginResponse.body.sessionId;
  });

  describe('Authentication Endpoints', () => {
    describe('POST /api/auth/register', () => {
      it('should register a new user with valid data', async () => {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email: 'newuser@example.com',
            password: 'NewPassword123!',
            username: 'newuser',
            firstName: 'New',
            lastName: 'User',
            country: 'US',
            phone: '+1234567890'
          })
          .expect(201);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('user');
        expect(response.body.user).toHaveProperty('id');
        expect(response.body.user).toHaveProperty('email', 'newuser@example.com');
      });

      it('should reject registration with invalid email', async () => {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email: 'invalid-email',
            password: 'Password123!',
            username: 'testuser'
          })
          .expect(400);

        expect(response.body).toHaveProperty('error', 'Validation Error');
      });

      it('should reject registration with weak password', async () => {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email: 'test@example.com',
            password: '123',
            username: 'testuser'
          })
          .expect(400);

        expect(response.body).toHaveProperty('error', 'Validation Error');
      });

      it('should reject duplicate email registration', async () => {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email: 'apitest@example.com',
            password: 'Password123!',
            username: 'duplicate'
          })
          .expect(409);

        expect(response.body).toHaveProperty('error', 'User Already Exists');
      });
    });

    describe('POST /api/auth/login', () => {
      it('should login with valid credentials', async () => {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'apitest@example.com',
            password: 'TestPassword123!'
          })
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('sessionId');
        expect(response.body).toHaveProperty('user');
      });

      it('should reject login with invalid credentials', async () => {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'apitest@example.com',
            password: 'WrongPassword'
          })
          .expect(401);

        expect(response.body).toHaveProperty('error', 'Authentication Failed');
      });

      it('should reject login with non-existent user', async () => {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'nonexistent@example.com',
            password: 'Password123!'
          })
          .expect(401);

        expect(response.body).toHaveProperty('error', 'Authentication Failed');
      });
    });

    describe('POST /api/auth/logout', () => {
      it('should logout successfully', async () => {
        const response = await request(app)
          .post('/api/auth/logout')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
      });

      it('should handle logout without authentication', async () => {
        const response = await request(app)
          .post('/api/auth/logout')
          .expect(401);

        expect(response.body).toHaveProperty('error', 'Unauthorized');
      });
    });
  });

  describe('Trading Endpoints', () => {
    describe('POST /api/trading/execute', () => {
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
      });

      it('should reject invalid trading parameters', async () => {
        const response = await request(app)
          .post('/api/trading/execute')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            pair: 'INVALID/PAIR',
            action: 'BUY',
            amount: -0.001,
            price: 50000
          })
          .expect(400);

        expect(response.body).toHaveProperty('error', 'Validation Error');
      });

      it('should reject trading without authentication', async () => {
        const response = await request(app)
          .post('/api/trading/execute')
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

    describe('GET /api/trading/orders', () => {
      it('should get trading orders', async () => {
        const response = await request(app)
          .get('/api/trading/orders')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('orders');
        expect(Array.isArray(response.body.orders)).toBe(true);
      });

      it('should filter orders by status', async () => {
        const response = await request(app)
          .get('/api/trading/orders?status=executed')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('orders');
      });

      it('should paginate orders', async () => {
        const response = await request(app)
          .get('/api/trading/orders?page=1&limit=10')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('pagination');
      });
    });
  });

  describe('Portfolio Endpoints', () => {
    describe('GET /api/portfolio/summary', () => {
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

      it('should reject portfolio access without authentication', async () => {
        const response = await request(app)
          .get('/api/portfolio/summary')
          .expect(401);

        expect(response.body).toHaveProperty('error', 'Unauthorized');
      });
    });

    describe('GET /api/portfolio/performance', () => {
      it('should get portfolio performance', async () => {
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
  });

  describe('Market Data Endpoints', () => {
    describe('GET /api/market/price/:symbol', () => {
      it('should get current price for valid symbol', async () => {
        const response = await request(app)
          .get('/api/market/price/BTC/USDT')
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('price');
        expect(typeof response.body.price).toBe('number');
      });

      it('should reject invalid symbol', async () => {
        const response = await request(app)
          .get('/api/market/price/INVALID/SYMBOL')
          .expect(400);

        expect(response.body).toHaveProperty('error', 'Invalid Symbol');
      });
    });

    describe('GET /api/market/history/:symbol', () => {
      it('should get historical data', async () => {
        const response = await request(app)
          .get('/api/market/history/BTC/USDT?interval=1h&limit=24')
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(Array.isArray(response.body.data)).toBe(true);
      });

      it('should validate interval parameter', async () => {
        const response = await request(app)
          .get('/api/market/history/BTC/USDT?interval=invalid')
          .expect(400);

        expect(response.body).toHaveProperty('error', 'Invalid Interval');
      });
    });

    describe('GET /api/market/signals/:symbol', () => {
      it('should get trading signals', async () => {
        const response = await request(app)
          .get('/api/market/signals/BTC/USDT')
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('signals');
        expect(Array.isArray(response.body.signals)).toBe(true);
      });
    });
  });

  describe('Admin Endpoints', () => {
    let adminToken;

    beforeAll(async () => {
      // Create admin user
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'admin@example.com',
          password: 'AdminPassword123!',
          username: 'admin',
          firstName: 'Admin',
          lastName: 'User',
          role: 'admin'
        });

      const adminLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@example.com',
          password: 'AdminPassword123!'
        });

      adminToken = adminLoginResponse.body.sessionId;
    });

    describe('GET /api/admin/users', () => {
      it('should get all users for admin', async () => {
        const response = await request(app)
          .get('/api/admin/users')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('users');
        expect(Array.isArray(response.body.users)).toBe(true);
      });

      it('should reject non-admin access', async () => {
        const response = await request(app)
          .get('/api/admin/users')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(403);

        expect(response.body).toHaveProperty('error', 'Access Denied');
      });
    });

    describe('GET /api/admin/audit-logs', () => {
      it('should get audit logs for admin', async () => {
        const response = await request(app)
          .get('/api/admin/audit-logs')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('logs');
        expect(Array.isArray(response.body.logs)).toBe(true);
      });
    });
  });

  describe('Health Check Endpoints', () => {
    describe('GET /health', () => {
      it('should return health status', async () => {
        const response = await request(app)
          .get('/health')
          .expect(200);

        expect(response.body).toHaveProperty('status', 'healthy');
        expect(response.body).toHaveProperty('timestamp');
        expect(response.body).toHaveProperty('uptime');
        expect(response.body).toHaveProperty('version');
      });
    });

    describe('GET /metrics', () => {
      it('should return metrics data', async () => {
        const response = await request(app)
          .get('/metrics')
          .expect(200);

        expect(response.text).toBeDefined();
        expect(response.headers['content-type']).toContain('text/plain');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 for unknown routes', async () => {
      const response = await request(app)
        .get('/api/unknown-route')
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Not Found');
    });

    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/trading/execute')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should handle rate limiting', async () => {
      const promises = [];
      
      // Make multiple requests to trigger rate limiting
      for (let i = 0; i < 20; i++) {
        promises.push(
          request(app)
            .get('/api/market/price/BTC/USDT')
        );
      }

      const responses = await Promise.all(promises);
      const rateLimitedResponse = responses.find(r => r.status === 429);
      
      expect(rateLimitedResponse).toBeDefined();
    });
  });
});

