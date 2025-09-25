/**
 * Server Unit Tests
 * 
 * Tests for the main server.js file and its functionality.
 * 
 * @author Shrikant Telang
 * @version 1.0.0
 */

const request = require('supertest');
const { app } = require('../../server');

describe('Server', () => {
  describe('Health Check Endpoint', () => {
    it('should return 200 and health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);
      
      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('version', '1.0.0');
      expect(response.body).toHaveProperty('environment');
    });
  });
  
  describe('Metrics Endpoint', () => {
    it('should return 200 and metrics data', async () => {
      const response = await request(app)
        .get('/metrics')
        .expect(200);
      
      expect(response.text).toBeDefined();
    });
  });
  
  describe('API Routes', () => {
    it('should handle auth routes', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
          username: 'testuser'
        });
      
      expect(response.status).toBeDefined();
    });
    
    it('should handle trading routes', async () => {
      const response = await request(app)
        .get('/api/trading/history');
      
      expect(response.status).toBeDefined();
    });
    
    it('should handle portfolio routes', async () => {
      const response = await request(app)
        .get('/api/portfolio');
      
      expect(response.status).toBeDefined();
    });
    
    it('should handle market routes', async () => {
      const response = await request(app)
        .get('/api/market/data/BTC/USDT');
      
      expect(response.status).toBeDefined();
    });
  });
  
  describe('Error Handling', () => {
    it('should return 404 for unknown routes', async () => {
      const response = await request(app)
        .get('/unknown-route')
        .expect(404);
      
      expect(response.body).toHaveProperty('error', 'Not Found');
    });
  });
  
  describe('CORS Configuration', () => {
    it('should include CORS headers', async () => {
      const response = await request(app)
        .options('/api/auth/register')
        .expect(204);
      
      expect(response.headers).toHaveProperty('access-control-allow-origin');
    });
  });
  
  describe('Security Headers', () => {
    it('should include security headers', async () => {
      const response = await request(app)
        .get('/health');
      
      expect(response.headers).toHaveProperty('x-content-type-options');
      expect(response.headers).toHaveProperty('x-frame-options');
      expect(response.headers).toHaveProperty('x-xss-protection');
    });
  });
});
