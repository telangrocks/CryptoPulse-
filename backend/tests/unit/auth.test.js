/**
 * Authentication Unit Tests
 * 
 * Tests for authentication routes and functionality.
 * 
 * @author Shrikant Telang
 * @version 1.0.0
 */

const request = require('supertest');
const { app } = require('../../server');

describe('Authentication Routes', () => {
  describe('POST /api/auth/register', () => {
    it('should register a new user with valid data', async () => {
      const userData = {
        email: 'newuser@example.com',
        password: 'password123',
        username: 'newuser',
        firstName: 'New',
        lastName: 'User'
      };
      
      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'User registered successfully');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user).toHaveProperty('email', userData.email);
      expect(response.body.user).toHaveProperty('username', userData.username);
    });
    
    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com'
          // Missing password and username
        })
        .expect(400);
      
      expect(response.body).toHaveProperty('error', 'Validation Error');
      expect(response.body).toHaveProperty('message', 'Email, password, and username are required');
    });
    
    it('should return 400 for invalid email format', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'invalid-email',
          password: 'password123',
          username: 'testuser'
        })
        .expect(400);
      
      expect(response.body).toHaveProperty('error', 'Validation Error');
      expect(response.body).toHaveProperty('message', 'Invalid email format');
    });
    
    it('should return 400 for weak password', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: '123',
          username: 'testuser'
        })
        .expect(400);
      
      expect(response.body).toHaveProperty('error', 'Validation Error');
      expect(response.body).toHaveProperty('message', 'Password must be at least 8 characters long');
    });
  });
  
  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        })
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Login successful');
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('sessionId');
    });
    
    it('should return 400 for missing credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com'
          // Missing password
        })
        .expect(400);
      
      expect(response.body).toHaveProperty('error', 'Validation Error');
      expect(response.body).toHaveProperty('message', 'Email and password are required');
    });
    
    it('should return 401 for invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword'
        })
        .expect(401);
      
      expect(response.body).toHaveProperty('error', 'Authentication Failed');
      expect(response.body).toHaveProperty('message', 'Invalid email or password');
    });
  });
  
  describe('POST /api/auth/logout', () => {
    it('should logout successfully', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Logout successful');
    });
  });
  
  describe('GET /api/auth/me', () => {
    it('should return user data for authenticated user', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user).toHaveProperty('email');
      expect(response.body.user).toHaveProperty('username');
    });
    
    it('should return 401 for unauthenticated user', async () => {
      // Mock no session
      const response = await request(app)
        .get('/api/auth/me')
        .expect(401);
      
      expect(response.body).toHaveProperty('error', 'Unauthorized');
      expect(response.body).toHaveProperty('message', 'No active session');
    });
  });
  
  describe('POST /api/auth/change-password', () => {
    it('should change password with valid current password', async () => {
      const response = await request(app)
        .post('/api/auth/change-password')
        .send({
          currentPassword: 'oldpassword',
          newPassword: 'newpassword123'
        })
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Password changed successfully');
    });
    
    it('should return 400 for missing passwords', async () => {
      const response = await request(app)
        .post('/api/auth/change-password')
        .send({
          currentPassword: 'oldpassword'
          // Missing newPassword
        })
        .expect(400);
      
      expect(response.body).toHaveProperty('error', 'Validation Error');
      expect(response.body).toHaveProperty('message', 'Current password and new password are required');
    });
    
    it('should return 400 for weak new password', async () => {
      const response = await request(app)
        .post('/api/auth/change-password')
        .send({
          currentPassword: 'oldpassword',
          newPassword: '123'
        })
        .expect(400);
      
      expect(response.body).toHaveProperty('error', 'Validation Error');
      expect(response.body).toHaveProperty('message', 'New password must be at least 8 characters long');
    });
  });
  
  describe('POST /api/auth/forgot-password', () => {
    it('should send password reset email for valid email', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({
          email: 'test@example.com'
        })
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'If an account with that email exists, a password reset link has been sent');
    });
    
    it('should return 400 for missing email', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({})
        .expect(400);
      
      expect(response.body).toHaveProperty('error', 'Validation Error');
      expect(response.body).toHaveProperty('message', 'Email is required');
    });
  });
  
  describe('POST /api/auth/reset-password', () => {
    it('should reset password with valid token', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: 'valid-reset-token',
          newPassword: 'newpassword123'
        })
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Password reset successfully');
    });
    
    it('should return 400 for missing token', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          newPassword: 'newpassword123'
        })
        .expect(400);
      
      expect(response.body).toHaveProperty('error', 'Validation Error');
      expect(response.body).toHaveProperty('message', 'Token and new password are required');
    });
    
    it('should return 400 for invalid token', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: 'invalid-token',
          newPassword: 'newpassword123'
        })
        .expect(400);
      
      expect(response.body).toHaveProperty('error', 'Invalid Token');
      expect(response.body).toHaveProperty('message', 'Invalid or expired reset token');
    });
  });
});
