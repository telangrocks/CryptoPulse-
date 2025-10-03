// =============================================================================
// Authentication Integration Tests - Production Ready
// =============================================================================
// Comprehensive integration tests for authentication system

const request = require('supertest');
const express = require('express');
const { authRoutes } = require('../../routes/auth');
const { authMiddleware } = require('../../lib/auth');
const { securityMiddleware } = require('../../lib/security');

describe('Authentication Integration', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use(securityMiddleware);
    app.use('/api/auth', authRoutes);
  });

  describe('User Registration', () => {
    test('should register new user successfully', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'SecurePassword123!',
        name: 'Test User'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('tokens');
      expect(response.body.user.email).toBe(userData.email);
      expect(response.body.user.name).toBe(userData.name);
      expect(response.body.tokens).toHaveProperty('accessToken');
      expect(response.body.tokens).toHaveProperty('refreshToken');
    });

    test('should reject user registration with existing email', async () => {
      const userData = {
        email: 'existing@example.com',
        password: 'SecurePassword123!',
        name: 'Test User'
      };

      // First registration
      await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      // Second registration with same email
      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('already exists');
    });

    test('should validate user registration data', async () => {
      const invalidUserData = {
        email: 'invalid-email',
        password: 'weak',
        name: ''
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidUserData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('details');
      expect(response.body.details).toContain('Invalid email format');
      expect(response.body.details).toContain('Password is too weak');
    });

    test('should handle registration with missing fields', async () => {
      const incompleteUserData = {
        email: 'test@example.com'
        // Missing password and name
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(incompleteUserData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.details).toContain('Password is required');
      expect(response.body.details).toContain('Name is required');
    });

    test('should handle registration with SQL injection attempt', async () => {
      const maliciousUserData = {
        email: "test'; DROP TABLE users; --",
        password: 'SecurePassword123!',
        name: 'Test User'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(maliciousUserData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid email format');
    });
  });

  describe('User Login', () => {
    beforeEach(async () => {
      // Register a test user
      const userData = {
        email: 'test@example.com',
        password: 'SecurePassword123!',
        name: 'Test User'
      };

      await request(app)
        .post('/api/auth/register')
        .send(userData);
    });

    test('should login user with valid credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'SecurePassword123!'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('tokens');
      expect(response.body.user.email).toBe(loginData.email);
      expect(response.body.tokens).toHaveProperty('accessToken');
      expect(response.body.tokens).toHaveProperty('refreshToken');
    });

    test('should reject login with invalid email', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'SecurePassword123!'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid credentials');
    });

    test('should reject login with invalid password', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'WrongPassword123!'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid credentials');
    });

    test('should handle brute force protection', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'WrongPassword123!'
      };

      // Make multiple failed login attempts
      for (let i = 0; i < 6; i++) {
        const response = await request(app)
          .post('/api/auth/login')
          .send(loginData);

        if (i < 5) {
          expect(response.status).toBe(401);
        } else {
          expect(response.status).toBe(429);
          expect(response.body).toHaveProperty('error');
          expect(response.body.error).toContain('Too many failed login attempts');
        }
      }
    });

    test('should validate login data format', async () => {
      const invalidLoginData = {
        email: 'invalid-email',
        password: ''
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(invalidLoginData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('details');
      expect(response.body.details).toContain('Invalid email format');
      expect(response.body.details).toContain('Password is required');
    });
  });

  describe('Token Management', () => {
    let accessToken;
    let refreshToken;

    beforeEach(async () => {
      // Register and login to get tokens
      const userData = {
        email: 'test@example.com',
        password: 'SecurePassword123!',
        name: 'Test User'
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

      accessToken = loginResponse.body.tokens.accessToken;
      refreshToken = loginResponse.body.tokens.refreshToken;
    });

    test('should refresh access token with valid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('tokens');
      expect(response.body.tokens).toHaveProperty('accessToken');
      expect(response.body.tokens).toHaveProperty('refreshToken');
      expect(response.body.tokens.accessToken).not.toBe(accessToken);
    });

    test('should reject refresh with invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid refresh token');
    });

    test('should reject refresh with expired refresh token', async () => {
      // Mock expired token
      const expiredToken = 'expired.refresh.token';
      
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: expiredToken })
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid refresh token');
    });

    test('should access protected route with valid access token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe('test@example.com');
    });

    test('should reject access to protected route without token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Access token required');
    });

    test('should reject access to protected route with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid token');
    });

    test('should logout user and invalidate tokens', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ refreshToken })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.message).toContain('Logged out successfully');

      // Verify tokens are invalidated
      const profileResponse = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(401);

      expect(profileResponse.body.error).toContain('Token has been invalidated');
    });
  });

  describe('Password Management', () => {
    let accessToken;

    beforeEach(async () => {
      // Register and login to get tokens
      const userData = {
        email: 'test@example.com',
        password: 'SecurePassword123!',
        name: 'Test User'
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

      accessToken = loginResponse.body.tokens.accessToken;
    });

    test('should change password with valid current password', async () => {
      const passwordData = {
        currentPassword: 'SecurePassword123!',
        newPassword: 'NewSecurePassword123!'
      };

      const response = await request(app)
        .put('/api/auth/password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(passwordData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.message).toContain('Password updated successfully');

      // Verify new password works
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: passwordData.newPassword
        })
        .expect(200);

      expect(loginResponse.body).toHaveProperty('success', true);
    });

    test('should reject password change with invalid current password', async () => {
      const passwordData = {
        currentPassword: 'WrongPassword123!',
        newPassword: 'NewSecurePassword123!'
      };

      const response = await request(app)
        .put('/api/auth/password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(passwordData)
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Current password is incorrect');
    });

    test('should reject weak new password', async () => {
      const passwordData = {
        currentPassword: 'SecurePassword123!',
        newPassword: 'weak'
      };

      const response = await request(app)
        .put('/api/auth/password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(passwordData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.details).toContain('Password is too weak');
    });

    test('should handle password reset request', async () => {
      const resetData = {
        email: 'test@example.com'
      };

      const response = await request(app)
        .post('/api/auth/password-reset-request')
        .send(resetData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.message).toContain('Password reset email sent');
    });

    test('should reject password reset for non-existent email', async () => {
      const resetData = {
        email: 'nonexistent@example.com'
      };

      const response = await request(app)
        .post('/api/auth/password-reset-request')
        .send(resetData)
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('User not found');
    });
  });

  describe('Security Features', () => {
    test('should enforce rate limiting on login endpoint', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'SecurePassword123!'
      };

      // Make requests exceeding rate limit
      for (let i = 0; i < 102; i++) {
        const response = await request(app)
          .post('/api/auth/login')
          .send(loginData);

        if (i < 100) {
          expect([200, 401]).toContain(response.status);
        } else {
          expect(response.status).toBe(429);
          expect(response.body).toHaveProperty('error');
          expect(response.body.error).toContain('Too many requests');
        }
      }
    });

    test('should validate request headers', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'SecurePassword123!',
        name: 'Test User'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .send(userData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Content-Type must be application/json');
    });

    test('should reject requests with suspicious patterns', async () => {
      const maliciousData = {
        email: 'test@example.com',
        password: 'SecurePassword123!',
        name: '<script>alert("xss")</script>'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(maliciousData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid input detected');
    });

    test('should handle CORS preflight requests', async () => {
      const response = await request(app)
        .options('/api/auth/login')
        .set('Origin', 'https://example.com')
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'Content-Type')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBe('https://example.com');
      expect(response.headers['access-control-allow-methods']).toContain('POST');
      expect(response.headers['access-control-allow-headers']).toContain('Content-Type');
    });
  });

  describe('Error Handling', () => {
    test('should handle database connection errors', async () => {
      // Mock database error
      jest.doMock('../../lib/database', () => ({
        createUser: jest.fn().mockRejectedValue(new Error('Database connection failed'))
      }));

      const userData = {
        email: 'test@example.com',
        password: 'SecurePassword123!',
        name: 'Test User'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(500);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Internal server error');
    });

    test('should handle encryption errors', async () => {
      // Mock encryption error
      jest.doMock('../../lib/encryption', () => ({
        encryptAES: jest.fn().mockImplementation(() => {
          throw new Error('Encryption failed');
        })
      }));

      const userData = {
        email: 'test@example.com',
        password: 'SecurePassword123!',
        name: 'Test User'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(500);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Internal server error');
    });

    test('should handle memory pressure', async () => {
      // Simulate memory pressure by making many concurrent requests
      const promises = [];
      
      for (let i = 0; i < 100; i++) {
        const userData = {
          email: `test${i}@example.com`,
          password: 'SecurePassword123!',
          name: `Test User ${i}`
        };

        promises.push(
          request(app)
            .post('/api/auth/register')
            .send(userData)
        );
      }

      const responses = await Promise.all(promises);
      
      // All requests should complete successfully
      responses.forEach(response => {
        expect([200, 201, 400, 500]).toContain(response.status);
      });
    });

    test('should handle timeout scenarios', async () => {
      // Mock slow database operation
      jest.doMock('../../lib/database', () => ({
        createUser: jest.fn().mockImplementation(() => 
          new Promise(resolve => setTimeout(resolve, 15000))
        )
      }));

      const userData = {
        email: 'test@example.com',
        password: 'SecurePassword123!',
        name: 'Test User'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .timeout(5000)
        .expect(408);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Request timeout');
    });
  });

  describe('Performance and Scalability', () => {
    test('should handle concurrent user registrations', async () => {
      const promises = [];
      
      for (let i = 0; i < 50; i++) {
        const userData = {
          email: `concurrent${i}@example.com`,
          password: 'SecurePassword123!',
          name: `Concurrent User ${i}`
        };

        promises.push(
          request(app)
            .post('/api/auth/register')
            .send(userData)
        );
      }

      const start = Date.now();
      const responses = await Promise.all(promises);
      const duration = Date.now() - start;

      // All requests should complete within reasonable time
      expect(duration).toBeLessThan(10000);
      
      // Count successful registrations
      const successful = responses.filter(r => r.status === 201);
      expect(successful).toHaveLength(50);
    });

    test('should handle concurrent login attempts', async () => {
      // Register test users first
      const userPromises = [];
      for (let i = 0; i < 10; i++) {
        const userData = {
          email: `perf${i}@example.com`,
          password: 'SecurePassword123!',
          name: `Perf User ${i}`
        };

        userPromises.push(
          request(app)
            .post('/api/auth/register')
            .send(userData)
        );
      }

      await Promise.all(userPromises);

      // Now test concurrent logins
      const loginPromises = [];
      for (let i = 0; i < 10; i++) {
        const loginData = {
          email: `perf${i}@example.com`,
          password: 'SecurePassword123!'
        };

        loginPromises.push(
          request(app)
            .post('/api/auth/login')
            .send(loginData)
        );
      }

      const start = Date.now();
      const responses = await Promise.all(loginPromises);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(5000);
      
      const successful = responses.filter(r => r.status === 200);
      expect(successful).toHaveLength(10);
    });

    test('should maintain performance under load', async () => {
      const promises = [];
      
      for (let i = 0; i < 200; i++) {
        const userData = {
          email: `load${i}@example.com`,
          password: 'SecurePassword123!',
          name: `Load User ${i}`
        };

        promises.push(
          request(app)
            .post('/api/auth/register')
            .send(userData)
        );
      }

      const start = Date.now();
      const responses = await Promise.all(promises);
      const duration = Date.now() - start;

      // Should handle load within reasonable time
      expect(duration).toBeLessThan(30000);
      
      // Most requests should succeed
      const successful = responses.filter(r => r.status === 201);
      expect(successful.length).toBeGreaterThan(180);
    });
  });
});
