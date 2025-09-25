/**
 * End-to-End User Journey Tests
 * 
 * Tests complete user workflows from registration to trading execution.
 * 
 * @author Shrikant Telang
 * @version 1.0.0
 */

const request = require('supertest');
const { app } = require('../../server');

describe('E2E User Journey Tests', () => {
  let authToken;
  let userId;
  let apiKeyId;

  describe('Complete User Registration and Trading Journey', () => {
    it('should complete full user journey from registration to trade execution', async () => {
      // Step 1: User Registration
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'e2e-user@example.com',
          password: 'SecurePassword123!',
          username: 'e2euser',
          firstName: 'E2E',
          lastName: 'User',
          country: 'US',
          phone: '+1234567890'
        })
        .expect(201);

      expect(registerResponse.body).toHaveProperty('success', true);
      expect(registerResponse.body).toHaveProperty('user');
      userId = registerResponse.body.user.id;

      // Step 2: User Login
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'e2e-user@example.com',
          password: 'SecurePassword123!',
          rememberMe: true
        })
        .expect(200);

      expect(loginResponse.body).toHaveProperty('success', true);
      expect(loginResponse.body).toHaveProperty('sessionId');
      authToken = loginResponse.body.sessionId;

      // Step 3: Accept Terms and Conditions
      const termsResponse = await request(app)
        .post('/api/auth/accept-terms')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          termsVersion: '1.0',
          accepted: true
        })
        .expect(200);

      expect(termsResponse.body).toHaveProperty('success', true);

      // Step 4: Complete KYC Verification
      const kycResponse = await request(app)
        .post('/api/auth/kyc-verification')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          documentType: 'passport',
          documentNumber: 'A1234567',
          country: 'US',
          dateOfBirth: '1990-01-01'
        })
        .expect(200);

      expect(kycResponse.body).toHaveProperty('success', true);

      // Step 5: Add API Keys
      const apiKeyResponse = await request(app)
        .post('/api/trading/api-keys')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          exchange: 'binance',
          apiKey: 'test-api-key-12345',
          secretKey: 'test-secret-key-67890',
          label: 'Test Exchange',
          permissions: ['spot', 'futures']
        })
        .expect(201);

      expect(apiKeyResponse.body).toHaveProperty('success', true);
      expect(apiKeyResponse.body).toHaveProperty('keyId');
      apiKeyId = apiKeyResponse.body.keyId;

      // Step 6: Validate API Keys
      const validateResponse = await request(app)
        .post('/api/trading/validate-api-keys')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          keyId: apiKeyId
        })
        .expect(200);

      expect(validateResponse.body).toHaveProperty('success', true);
      expect(validateResponse.body).toHaveProperty('valid', true);

      // Step 7: Get Market Data
      const marketDataResponse = await request(app)
        .get('/api/market/price/BTC/USDT')
        .expect(200);

      expect(marketDataResponse.body).toHaveProperty('success', true);
      expect(marketDataResponse.body).toHaveProperty('price');
      expect(typeof marketDataResponse.body.price).toBe('number');

      // Step 8: Get Trading Signals
      const signalsResponse = await request(app)
        .get('/api/market/signals/BTC/USDT')
        .expect(200);

      expect(signalsResponse.body).toHaveProperty('success', true);
      expect(signalsResponse.body).toHaveProperty('signals');
      expect(Array.isArray(signalsResponse.body.signals)).toBe(true);

      // Step 9: Execute Test Trade
      const tradeResponse = await request(app)
        .post('/api/trading/execute')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          pair: 'BTC/USDT',
          action: 'BUY',
          amount: 0.001,
          price: 50000,
          orderType: 'LIMIT',
          exchange: 'binance'
        })
        .expect(200);

      expect(tradeResponse.body).toHaveProperty('success', true);
      expect(tradeResponse.body).toHaveProperty('orderId');

      // Step 10: Check Order Status
      const orderStatusResponse = await request(app)
        .get(`/api/trading/orders/${tradeResponse.body.orderId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(orderStatusResponse.body).toHaveProperty('success', true);
      expect(orderStatusResponse.body).toHaveProperty('order');
      expect(orderStatusResponse.body.order).toHaveProperty('status');

      // Step 11: Get Portfolio Summary
      const portfolioResponse = await request(app)
        .get('/api/portfolio/summary')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(portfolioResponse.body).toHaveProperty('success', true);
      expect(portfolioResponse.body).toHaveProperty('totalValue');
      expect(portfolioResponse.body).toHaveProperty('totalReturn');

      // Step 12: Get Trading History
      const historyResponse = await request(app)
        .get('/api/trading/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(historyResponse.body).toHaveProperty('success', true);
      expect(historyResponse.body).toHaveProperty('orders');
      expect(Array.isArray(historyResponse.body.orders)).toBe(true);

      // Step 13: Risk Assessment
      const riskResponse = await request(app)
        .get('/api/trading/risk-assessment')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(riskResponse.body).toHaveProperty('success', true);
      expect(riskResponse.body).toHaveProperty('riskLevel');
      expect(riskResponse.body).toHaveProperty('riskScore');

      // Step 14: Set Stop Loss
      const stopLossResponse = await request(app)
        .post('/api/trading/set-stop-loss')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          pair: 'BTC/USDT',
          stopLossPrice: 45000,
          takeProfitPrice: 55000
        })
        .expect(200);

      expect(stopLossResponse.body).toHaveProperty('success', true);

      // Step 15: User Logout
      const logoutResponse = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(logoutResponse.body).toHaveProperty('success', true);
    });

    it('should handle trading bot configuration and execution', async () => {
      // Login first
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'e2e-user@example.com',
          password: 'SecurePassword123!'
        })
        .expect(200);

      authToken = loginResponse.body.sessionId;

      // Configure Trading Bot
      const botConfigResponse = await request(app)
        .post('/api/trading/bots')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'E2E Test Bot',
          strategy: 'RSI_MA_CROSSOVER',
          pairs: ['BTC/USDT', 'ETH/USDT'],
          riskLevel: 'medium',
          maxTradeAmount: 1000,
          stopLossPercentage: 0.05,
          takeProfitPercentage: 0.15,
          enabled: true
        })
        .expect(201);

      expect(botConfigResponse.body).toHaveProperty('success', true);
      expect(botConfigResponse.body).toHaveProperty('botId');

      const botId = botConfigResponse.body.botId;

      // Start Trading Bot
      const startBotResponse = await request(app)
        .post(`/api/trading/bots/${botId}/start`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(startBotResponse.body).toHaveProperty('success', true);

      // Check Bot Status
      const botStatusResponse = await request(app)
        .get(`/api/trading/bots/${botId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(botStatusResponse.body).toHaveProperty('success', true);
      expect(botStatusResponse.body).toHaveProperty('bot');
      expect(botStatusResponse.body.bot).toHaveProperty('status', 'running');

      // Stop Trading Bot
      const stopBotResponse = await request(app)
        .post(`/api/trading/bots/${botId}/stop`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(stopBotResponse.body).toHaveProperty('success', true);

      // Delete Trading Bot
      const deleteBotResponse = await request(app)
        .delete(`/api/trading/bots/${botId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(deleteBotResponse.body).toHaveProperty('success', true);
    });

    it('should handle error scenarios gracefully', async () => {
      // Test with invalid credentials
      const invalidLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'e2e-user@example.com',
          password: 'WrongPassword'
        })
        .expect(401);

      expect(invalidLoginResponse.body).toHaveProperty('error', 'Authentication Failed');

      // Test with invalid API key
      const invalidApiKeyResponse = await request(app)
        .post('/api/trading/api-keys')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          exchange: 'binance',
          apiKey: 'invalid-key',
          secretKey: 'invalid-secret'
        })
        .expect(400);

      expect(invalidApiKeyResponse.body).toHaveProperty('error', 'Validation Error');

      // Test with insufficient balance
      const insufficientBalanceResponse = await request(app)
        .post('/api/trading/execute')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          pair: 'BTC/USDT',
          action: 'BUY',
          amount: 1000000, // Very large amount
          price: 50000
        })
        .expect(400);

      expect(insufficientBalanceResponse.body).toHaveProperty('error', 'Insufficient Balance');
    });
  });

  describe('Admin User Journey', () => {
    let adminToken;

    it('should complete admin user journey', async () => {
      // Create admin user
      const adminRegisterResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'admin@example.com',
          password: 'AdminPassword123!',
          username: 'admin',
          firstName: 'Admin',
          lastName: 'User',
          role: 'admin'
        })
        .expect(201);

      // Login as admin
      const adminLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@example.com',
          password: 'AdminPassword123!'
        })
        .expect(200);

      adminToken = adminLoginResponse.body.sessionId;

      // Get all users
      const usersResponse = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(usersResponse.body).toHaveProperty('success', true);
      expect(usersResponse.body).toHaveProperty('users');
      expect(Array.isArray(usersResponse.body.users)).toBe(true);

      // Get system settings
      const settingsResponse = await request(app)
        .get('/api/admin/settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(settingsResponse.body).toHaveProperty('success', true);
      expect(settingsResponse.body).toHaveProperty('settings');

      // Get audit logs
      const auditLogsResponse = await request(app)
        .get('/api/admin/audit-logs')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(auditLogsResponse.body).toHaveProperty('success', true);
      expect(auditLogsResponse.body).toHaveProperty('logs');
      expect(Array.isArray(auditLogsResponse.body.logs)).toBe(true);
    });
  });
});

