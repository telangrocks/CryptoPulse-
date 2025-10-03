// =============================================================================
// Security System Tests - Production Ready
// =============================================================================
// Comprehensive unit tests for the security system

const {
  bruteForceProtection,
  rateLimitMiddleware,
  requestSlower,
  securityHeaders,
  corsMiddleware,
  inputValidationMiddleware,
  sanitizeInput,
  getSecurityMetrics,
  resetSecurityMetrics
} = require('../../lib/security');

const { securityEnhancements } = require('../../lib/securityEnhancements');

describe('Security System', () => {
  beforeEach(() => {
    resetSecurityMetrics();
  });

  describe('Brute Force Protection', () => {
    test('should allow normal login attempts', () => {
      const req = {
        ip: '192.168.1.1',
        body: { email: 'test@example.com' }
      };
      const res = testUtils.createMockResponse();
      const next = testUtils.createMockNext();

      bruteForceProtection(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    test('should block after max failed attempts', () => {
      const req = {
        ip: '192.168.1.1',
        body: { email: 'test@example.com' }
      };
      const res = testUtils.createMockResponse();

      // Simulate multiple failed attempts
      for (let i = 0; i < 6; i++) {
        const next = testUtils.createMockNext();
        bruteForceProtection(req, res, next);
        
        if (i < 5) {
          expect(next).toHaveBeenCalled();
        } else {
          expect(res.status).toHaveBeenCalledWith(429);
          expect(res.json).toHaveBeenCalledWith({
            error: 'Too many failed login attempts. Please try again later.',
            retryAfter: expect.any(Number)
          });
        }
      }
    });

    test('should reset after successful login', () => {
      const req = {
        ip: '192.168.1.1',
        body: { email: 'test@example.com' }
      };
      const res = testUtils.createMockResponse();

      // Simulate failed attempts
      for (let i = 0; i < 3; i++) {
        const next = testUtils.createMockNext();
        bruteForceProtection(req, res, next);
        expect(next).toHaveBeenCalled();
      }

      // Simulate successful login
      req.body.loginSuccess = true;
      const next = testUtils.createMockNext();
      bruteForceProtection(req, res, next);
      expect(next).toHaveBeenCalled();

      // Should allow new attempts
      delete req.body.loginSuccess;
      const next2 = testUtils.createMockNext();
      bruteForceProtection(req, res, next2);
      expect(next2).toHaveBeenCalled();
    });

    test('should handle different IPs separately', () => {
      const req1 = { ip: '192.168.1.1', body: { email: 'test@example.com' } };
      const req2 = { ip: '192.168.1.2', body: { email: 'test@example.com' } };
      const res = testUtils.createMockResponse();

      // Block first IP
      for (let i = 0; i < 6; i++) {
        const next = testUtils.createMockNext();
        bruteForceProtection(req1, res, next);
      }

      // Second IP should still work
      const next = testUtils.createMockNext();
      bruteForceProtection(req2, res, next);
      expect(next).toHaveBeenCalled();
    });

    test('should handle missing IP', () => {
      const req = { body: { email: 'test@example.com' } };
      const res = testUtils.createMockResponse();
      const next = testUtils.createMockNext();

      bruteForceProtection(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('Rate Limiting', () => {
    test('should allow requests within limit', () => {
      const req = { ip: '192.168.1.1' };
      const res = testUtils.createMockResponse();
      const next = testUtils.createMockNext();

      rateLimitMiddleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    test('should block requests exceeding limit', () => {
      const req = { ip: '192.168.1.1' };
      const res = testUtils.createMockResponse();

      // Make requests exceeding the limit
      for (let i = 0; i < 102; i++) { // Assuming limit is 100
        const next = testUtils.createMockNext();
        rateLimitMiddleware(req, res, next);
        
        if (i < 100) {
          expect(next).toHaveBeenCalled();
        } else {
          expect(res.status).toHaveBeenCalledWith(429);
          expect(res.json).toHaveBeenCalledWith({
            error: 'Too many requests, please try again later.',
            retryAfter: expect.any(Number)
          });
        }
      }
    });

    test('should handle different endpoints separately', () => {
      const req1 = { ip: '192.168.1.1', path: '/api/auth/login' };
      const req2 = { ip: '192.168.1.1', path: '/api/trading/orders' };
      const res = testUtils.createMockResponse();

      // Both should work independently
      const next1 = testUtils.createMockNext();
      rateLimitMiddleware(req1, res, next1);
      expect(next1).toHaveBeenCalled();

      const next2 = testUtils.createMockNext();
      rateLimitMiddleware(req2, res, next2);
      expect(next2).toHaveBeenCalled();
    });

    test('should handle missing IP', () => {
      const req = { path: '/api/test' };
      const res = testUtils.createMockResponse();
      const next = testUtils.createMockNext();

      rateLimitMiddleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('Request Slowing', () => {
    test('should slow down requests', (done) => {
      const req = { ip: '192.168.1.1' };
      const res = testUtils.createMockResponse();
      const next = jest.fn(() => done());

      const start = Date.now();
      requestSlower(req, res, next);
      
      // Should take some time to complete
      setTimeout(() => {
        const duration = Date.now() - start;
        expect(duration).toBeGreaterThan(0);
      }, 10);
    });

    test('should handle concurrent requests', (done) => {
      const req = { ip: '192.168.1.1' };
      const res = testUtils.createMockResponse();
      let completed = 0;
      const total = 5;

      const next = jest.fn(() => {
        completed++;
        if (completed === total) {
          done();
        }
      });

      // Start multiple requests
      for (let i = 0; i < total; i++) {
        requestSlower(req, res, next);
      }
    });
  });

  describe('Security Headers', () => {
    test('should set security headers', () => {
      const req = testUtils.createMockRequest();
      const res = testUtils.createMockResponse();
      const next = testUtils.createMockNext();

      securityHeaders(req, res, next);

      expect(res.setHeader).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
      expect(res.setHeader).toHaveBeenCalledWith('X-Frame-Options', 'DENY');
      expect(res.setHeader).toHaveBeenCalledWith('X-XSS-Protection', '1; mode=block');
      expect(res.setHeader).toHaveBeenCalledWith('Strict-Transport-Security', expect.any(String));
      expect(res.setHeader).toHaveBeenCalledWith('Content-Security-Policy', expect.any(String));
      expect(next).toHaveBeenCalled();
    });

    test('should handle missing res.setHeader', () => {
      const req = testUtils.createMockRequest();
      const res = { setHeader: undefined };
      const next = testUtils.createMockNext();

      expect(() => securityHeaders(req, res, next)).not.toThrow();
      expect(next).toHaveBeenCalled();
    });
  });

  describe('CORS Middleware', () => {
    test('should handle preflight requests', () => {
      const req = {
        method: 'OPTIONS',
        headers: {
          origin: 'https://example.com',
          'access-control-request-method': 'POST'
        }
      };
      const res = testUtils.createMockResponse();
      const next = testUtils.createMockNext();

      corsMiddleware(req, res, next);

      expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'https://example.com');
      expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Methods', expect.any(String));
      expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Headers', expect.any(String));
      expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Credentials', 'true');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith('OK');
    });

    test('should handle regular requests', () => {
      const req = {
        method: 'GET',
        headers: { origin: 'https://example.com' }
      };
      const res = testUtils.createMockResponse();
      const next = testUtils.createMockNext();

      corsMiddleware(req, res, next);

      expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'https://example.com');
      expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Credentials', 'true');
      expect(next).toHaveBeenCalled();
    });

    test('should reject unauthorized origins', () => {
      const req = {
        method: 'GET',
        headers: { origin: 'https://malicious.com' }
      };
      const res = testUtils.createMockResponse();
      const next = testUtils.createMockNext();

      corsMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'CORS policy violation: Origin not allowed'
      });
    });

    test('should handle missing origin', () => {
      const req = { method: 'GET' };
      const res = testUtils.createMockResponse();
      const next = testUtils.createMockNext();

      corsMiddleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('Input Validation', () => {
    test('should validate request body', () => {
      const req = {
        body: { email: 'test@example.com', password: 'password123' }
      };
      const res = testUtils.createMockResponse();
      const next = testUtils.createMockNext();

      inputValidationMiddleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    test('should reject invalid email', () => {
      const req = {
        body: { email: 'invalid-email', password: 'password123' }
      };
      const res = testUtils.createMockResponse();
      const next = testUtils.createMockNext();

      inputValidationMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Validation failed',
        details: expect.any(Array)
      });
    });

    test('should reject SQL injection attempts', () => {
      const req = {
        body: { email: "test'; DROP TABLE users; --", password: 'password123' }
      };
      const res = testUtils.createMockResponse();
      const next = testUtils.createMockNext();

      inputValidationMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Validation failed',
        details: expect.any(Array)
      });
    });

    test('should reject XSS attempts', () => {
      const req = {
        body: { email: 'test@example.com', password: '<script>alert("xss")</script>' }
      };
      const res = testUtils.createMockResponse();
      const next = testUtils.createMockNext();

      inputValidationMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Validation failed',
        details: expect.any(Array)
      });
    });

    test('should handle missing body', () => {
      const req = {};
      const res = testUtils.createMockResponse();
      const next = testUtils.createMockNext();

      inputValidationMiddleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('Input Sanitization', () => {
    test('should sanitize HTML content', () => {
      const input = '<script>alert("xss")</script>Hello World';
      const sanitized = sanitizeInput(input);
      
      expect(sanitized).toBe('Hello World');
    });

    test('should sanitize SQL injection attempts', () => {
      const input = "'; DROP TABLE users; --";
      const sanitized = sanitizeInput(input);
      
      expect(sanitized).not.toContain("';");
      expect(sanitized).not.toContain('DROP');
    });

    test('should handle null input', () => {
      const sanitized = sanitizeInput(null);
      expect(sanitized).toBe('');
    });

    test('should handle undefined input', () => {
      const sanitized = sanitizeInput(undefined);
      expect(sanitized).toBe('');
    });

    test('should handle empty string', () => {
      const sanitized = sanitizeInput('');
      expect(sanitized).toBe('');
    });

    test('should preserve safe content', () => {
      const input = 'Hello World! This is safe content.';
      const sanitized = sanitizeInput(input);
      
      expect(sanitized).toBe(input);
    });

    test('should sanitize object properties', () => {
      const input = {
        name: 'John Doe',
        email: 'john@example.com',
        bio: '<script>alert("xss")</script>Safe bio content'
      };
      
      const sanitized = sanitizeInput(input);
      
      expect(sanitized.name).toBe('John Doe');
      expect(sanitized.email).toBe('john@example.com');
      expect(sanitized.bio).toBe('Safe bio content');
    });

    test('should sanitize array elements', () => {
      const input = [
        'Safe content',
        '<script>alert("xss")</script>Unsafe content',
        'More safe content'
      ];
      
      const sanitized = sanitizeInput(input);
      
      expect(sanitized[0]).toBe('Safe content');
      expect(sanitized[1]).toBe('Unsafe content');
      expect(sanitized[2]).toBe('More safe content');
    });

    test('should handle nested objects', () => {
      const input = {
        user: {
          name: 'John Doe',
          profile: {
            bio: '<script>alert("xss")</script>Bio content'
          }
        }
      };
      
      const sanitized = sanitizeInput(input);
      
      expect(sanitized.user.name).toBe('John Doe');
      expect(sanitized.user.profile.bio).toBe('Bio content');
    });
  });

  describe('Security Metrics', () => {
    test('should track brute force attempts', () => {
      const req = { ip: '192.168.1.1', body: { email: 'test@example.com' } };
      const res = testUtils.createMockResponse();

      // Simulate failed attempts
      for (let i = 0; i < 3; i++) {
        const next = testUtils.createMockNext();
        bruteForceProtection(req, res, next);
      }

      const metrics = getSecurityMetrics();
      expect(metrics.bruteForce.attempts).toBe(3);
    });

    test('should track rate limit violations', () => {
      const req = { ip: '192.168.1.1' };
      const res = testUtils.createMockResponse();

      // Simulate rate limit violations
      for (let i = 0; i < 5; i++) {
        const next = testUtils.createMockNext();
        rateLimitMiddleware(req, res, next);
      }

      const metrics = getSecurityMetrics();
      expect(metrics.rateLimit.violations).toBeGreaterThan(0);
    });

    test('should track input validation failures', () => {
      const req = {
        body: { email: 'invalid-email' }
      };
      const res = testUtils.createMockResponse();
      const next = testUtils.createMockNext();

      inputValidationMiddleware(req, res, next);

      const metrics = getSecurityMetrics();
      expect(metrics.inputValidation.failures).toBe(1);
    });

    test('should track CORS violations', () => {
      const req = {
        method: 'GET',
        headers: { origin: 'https://malicious.com' }
      };
      const res = testUtils.createMockResponse();
      const next = testUtils.createMockNext();

      corsMiddleware(req, res, next);

      const metrics = getSecurityMetrics();
      expect(metrics.cors.violations).toBe(1);
    });

    test('should reset metrics correctly', () => {
      // Generate some metrics
      const req = { ip: '192.168.1.1', body: { email: 'test@example.com' } };
      const res = testUtils.createMockResponse();
      const next = testUtils.createMockNext();

      bruteForceProtection(req, res, next);

      let metrics = getSecurityMetrics();
      expect(metrics.bruteForce.attempts).toBeGreaterThan(0);

      resetSecurityMetrics();

      metrics = getSecurityMetrics();
      expect(metrics.bruteForce.attempts).toBe(0);
    });

    test('should track performance metrics', () => {
      const req = { ip: '192.168.1.1' };
      const res = testUtils.createMockResponse();

      // Perform multiple operations
      for (let i = 0; i < 100; i++) {
        const next = testUtils.createMockNext();
        rateLimitMiddleware(req, res, next);
      }

      const metrics = getSecurityMetrics();
      
      expect(metrics.performance.rateLimit.average).toBeGreaterThan(0);
      expect(metrics.performance.rateLimit.p95).toBeGreaterThanOrEqual(metrics.performance.rateLimit.average);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle concurrent requests from same IP', (done) => {
      const req = { ip: '192.168.1.1' };
      const res = testUtils.createMockResponse();
      let completed = 0;
      const total = 10;

      const next = jest.fn(() => {
        completed++;
        if (completed === total) {
          done();
        }
      });

      // Start concurrent requests
      for (let i = 0; i < total; i++) {
        rateLimitMiddleware(req, res, next);
      }
    });

    test('should handle malformed requests', () => {
      const req = {
        ip: null,
        body: null,
        headers: null
      };
      const res = testUtils.createMockResponse();
      const next = testUtils.createMockNext();

      expect(() => bruteForceProtection(req, res, next)).not.toThrow();
      expect(() => rateLimitMiddleware(req, res, next)).not.toThrow();
      expect(() => securityHeaders(req, res, next)).not.toThrow();
    });

    test('should handle missing response methods', () => {
      const req = testUtils.createMockRequest();
      const res = {
        setHeader: undefined,
        status: undefined,
        json: undefined,
        send: undefined
      };
      const next = testUtils.createMockNext();

      expect(() => securityHeaders(req, res, next)).not.toThrow();
      expect(() => corsMiddleware(req, res, next)).not.toThrow();
    });

    test('should handle very large request bodies', () => {
      const largeBody = 'A'.repeat(1000000); // 1MB
      const req = {
        body: { data: largeBody },
        ip: '192.168.1.1'
      };
      const res = testUtils.createMockResponse();
      const next = testUtils.createMockNext();

      expect(() => inputValidationMiddleware(req, res, next)).not.toThrow();
    });

    test('should handle special characters in IP addresses', () => {
      const req = { ip: '::1' }; // IPv6 localhost
      const res = testUtils.createMockResponse();
      const next = testUtils.createMockNext();

      expect(() => bruteForceProtection(req, res, next)).not.toThrow();
      expect(() => rateLimitMiddleware(req, res, next)).not.toThrow();
    });

    test('should handle unicode content in requests', () => {
      const req = {
        body: { message: 'Hello 世界! 🌍' },
        ip: '192.168.1.1'
      };
      const res = testUtils.createMockResponse();
      const next = testUtils.createMockNext();

      expect(() => inputValidationMiddleware(req, res, next)).not.toThrow();
    });
  });
});
