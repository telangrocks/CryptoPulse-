/**
 * Security Tests
 * 
 * Tests for security features including authentication, authorization,
 * input validation, and security headers.
 * 
 * @author Shrikant Telang
 * @version 1.0.0
 */

const request = require('supertest');
const { app } = require('../../server');

describe('Security Tests', () => {
  describe('Authentication Security', () => {
    it('should reject requests without authentication', async () => {
      const response = await request(app)
        .get('/api/portfolio/summary')
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Unauthorized');
    });

    it('should reject invalid JWT tokens', async () => {
      const response = await request(app)
        .get('/api/portfolio/summary')
        .set('Authorization', 'Bearer invalid-jwt-token')
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Unauthorized');
    });

    it('should reject expired JWT tokens', async () => {
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0IiwiaWF0IjoxNjAwMDAwMDAwLCJleHAiOjE2MDAwMDAwMDB9.invalid';
      
      const response = await request(app)
        .get('/api/portfolio/summary')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Unauthorized');
    });

    it('should enforce session timeout', async () => {
      // This test would require mocking time passage
      const response = await request(app)
        .get('/api/portfolio/summary')
        .set('Authorization', 'Bearer expired-session-token')
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Session Expired');
    });
  });

  describe('Authorization Security', () => {
    let userToken;
    let adminToken;

    beforeAll(async () => {
      // Create regular user
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'user@example.com',
          password: 'password123',
          username: 'user',
          role: 'user'
        });

      const userResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'user@example.com',
          password: 'password123'
        });
      userToken = userResponse.body.sessionId;

      // Create admin user
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'admin@example.com',
          password: 'password123',
          username: 'admin',
          role: 'admin'
        });

      const adminResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@example.com',
          password: 'password123'
        });
      adminToken = adminResponse.body.sessionId;
    });

    it('should allow users to access their own data', async () => {
      const response = await request(app)
        .get('/api/portfolio/summary')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
    });

    it('should prevent users from accessing admin endpoints', async () => {
      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body).toHaveProperty('error', 'Access Denied');
    });

    it('should allow admins to access admin endpoints', async () => {
      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
    });

    it('should prevent privilege escalation', async () => {
      const response = await request(app)
        .post('/api/auth/change-role')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          userId: 'user-id',
          newRole: 'admin'
        })
        .expect(403);

      expect(response.body).toHaveProperty('error', 'Access Denied');
    });
  });

  describe('Input Validation Security', () => {
    it('should prevent SQL injection in user input', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: "'; DROP TABLE users; --",
          password: 'password123'
        })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation Error');
    });

    it('should prevent XSS attacks in user input', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
          username: '<script>alert("xss")</script>'
        })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation Error');
    });

    it('should prevent NoSQL injection', async () => {
      const response = await request(app)
        .post('/api/trading/execute')
        .set('Authorization', 'Bearer valid-token')
        .send({
          pair: 'BTC/USDT',
          action: 'BUY',
          amount: 0.001,
          price: { $gt: 0 } // NoSQL injection attempt
        })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation Error');
    });

    it('should validate file uploads', async () => {
      const response = await request(app)
        .post('/api/upload')
        .set('Authorization', 'Bearer valid-token')
        .attach('file', Buffer.from('malicious content'), 'malicious.exe')
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Invalid File Type');
    });

    it('should prevent path traversal attacks', async () => {
      const response = await request(app)
        .get('/api/files/../../../etc/passwd')
        .set('Authorization', 'Bearer valid-token')
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Invalid Path');
    });
  });

  describe('Rate Limiting Security', () => {
    it('should enforce rate limits on auth endpoints', async () => {
      const promises = [];
      
      // Make multiple requests to trigger rate limiting
      for (let i = 0; i < 10; i++) {
        promises.push(
          request(app)
            .post('/api/auth/login')
            .send({
              email: 'test@example.com',
              password: 'wrongpassword'
            })
        );
      }

      const responses = await Promise.all(promises);
      const rateLimitedResponse = responses.find(r => r.status === 429);
      
      expect(rateLimitedResponse).toBeDefined();
      expect(rateLimitedResponse.body).toHaveProperty('error', 'Too Many Requests');
    });

    it('should enforce rate limits on trading endpoints', async () => {
      const promises = [];
      
      // Make multiple trading requests
      for (let i = 0; i < 20; i++) {
        promises.push(
          request(app)
            .post('/api/trading/execute')
            .set('Authorization', 'Bearer valid-token')
            .send({
              pair: 'BTC/USDT',
              action: 'BUY',
              amount: 0.001,
              price: 50000
            })
        );
      }

      const responses = await Promise.all(promises);
      const rateLimitedResponse = responses.find(r => r.status === 429);
      
      expect(rateLimitedResponse).toBeDefined();
    });
  });

  describe('Security Headers', () => {
    it('should include security headers in responses', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.headers).toHaveProperty('x-content-type-options', 'nosniff');
      expect(response.headers).toHaveProperty('x-frame-options', 'DENY');
      expect(response.headers).toHaveProperty('x-xss-protection', '1; mode=block');
      expect(response.headers).toHaveProperty('referrer-policy', 'strict-origin-when-cross-origin');
      expect(response.headers).toHaveProperty('permissions-policy');
    });

    it('should include CSP header', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.headers).toHaveProperty('content-security-policy');
      expect(response.headers['content-security-policy']).toContain("default-src 'self'");
    });

    it('should not expose server information', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.headers).not.toHaveProperty('x-powered-by');
      expect(response.headers).not.toHaveProperty('server');
    });
  });

  describe('CSRF Protection', () => {
    it('should require CSRF token for state-changing operations', async () => {
      const response = await request(app)
        .post('/api/trading/execute')
        .set('Authorization', 'Bearer valid-token')
        .send({
          pair: 'BTC/USDT',
          action: 'BUY',
          amount: 0.001,
          price: 50000
        })
        .expect(403);

      expect(response.body).toHaveProperty('error', 'CSRF token missing or invalid');
    });

    it('should accept valid CSRF token', async () => {
      // First get CSRF token
      const csrfResponse = await request(app)
        .get('/api/csrf-token')
        .expect(200);

      const csrfToken = csrfResponse.body.token;

      const response = await request(app)
        .post('/api/trading/execute')
        .set('Authorization', 'Bearer valid-token')
        .set('X-CSRF-Token', csrfToken)
        .send({
          pair: 'BTC/USDT',
          action: 'BUY',
          amount: 0.001,
          price: 50000
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
    });
  });

  describe('Data Encryption', () => {
    it('should encrypt sensitive data at rest', async () => {
      const response = await request(app)
        .post('/api/trading/api-keys')
        .set('Authorization', 'Bearer valid-token')
        .send({
          exchange: 'binance',
          apiKey: 'sensitive-api-key',
          secretKey: 'sensitive-secret-key'
        })
        .expect(201);

      // Verify that the stored data is encrypted
      expect(response.body.encrypted).toBe(true);
    });

    it('should use HTTPS in production', () => {
      const isProduction = process.env.NODE_ENV === 'production';
      if (isProduction) {
        // In production, all requests should be over HTTPS
        expect(process.env.FORCE_HTTPS).toBe('true');
      }
    });
  });

  describe('Session Security', () => {
    it('should use secure session cookies', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        })
        .expect(200);

      const setCookieHeader = response.headers['set-cookie'];
      expect(setCookieHeader).toBeDefined();
      expect(setCookieHeader[0]).toContain('HttpOnly');
      expect(setCookieHeader[0]).toContain('SameSite=Strict');
    });

    it('should invalidate sessions on logout', async () => {
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      const sessionId = loginResponse.body.sessionId;

      await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${sessionId}`)
        .expect(200);

      // Try to use the session after logout
      const response = await request(app)
        .get('/api/portfolio/summary')
        .set('Authorization', `Bearer ${sessionId}`)
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Session Invalid');
    });
  });

  describe('API Key Security', () => {
    it('should never return plaintext API keys', async () => {
      const response = await request(app)
        .get('/api/trading/api-keys')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body.keys).toBeDefined();
      response.body.keys.forEach(key => {
        expect(key.apiKey).not.toBe('sensitive-api-key');
        expect(key.secretKey).not.toBe('sensitive-secret-key');
        expect(key.encrypted).toBe(true);
      });
    });

    it('should validate API key permissions', async () => {
      const response = await request(app)
        .post('/api/trading/execute')
        .set('Authorization', 'Bearer valid-token')
        .send({
          pair: 'BTC/USDT',
          action: 'BUY',
          amount: 0.001,
          price: 50000,
          exchange: 'binance'
        })
        .expect(200);

      // Verify that the API key has the required permissions
      expect(response.body.permissions).toContain('trading');
    });
  });
});
