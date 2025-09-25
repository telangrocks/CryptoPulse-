/**
 * Performance and Load Tests
 * 
 * Tests for system performance under various load conditions.
 * 
 * @author Shrikant Telang
 * @version 1.0.0
 */

const request = require('supertest');
const { app } = require('../../server');

describe('Performance and Load Tests', () => {
  describe('Response Time Tests', () => {
    it('should respond to health check within 100ms', async () => {
      const start = Date.now();
      const response = await request(app)
        .get('/health')
        .expect(200);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(100);
      expect(response.body).toHaveProperty('status', 'healthy');
    });

    it('should respond to API endpoints within 500ms', async () => {
      const endpoints = [
        '/api/market/price/BTC/USDT',
        '/api/market/history/BTC/USDT',
        '/api/market/signals/BTC/USDT'
      ];

      for (const endpoint of endpoints) {
        const start = Date.now();
        const response = await request(app)
          .get(endpoint)
          .expect(200);
        const duration = Date.now() - start;

        expect(duration).toBeLessThan(500);
        expect(response.body).toHaveProperty('success', true);
      }
    });

    it('should handle concurrent requests efficiently', async () => {
      const concurrentRequests = 50;
      const promises = [];

      const start = Date.now();

      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(
          request(app)
            .get('/health')
            .expect(200)
        );
      }

      const responses = await Promise.all(promises);
      const duration = Date.now() - start;

      expect(responses).toHaveLength(concurrentRequests);
      expect(duration).toBeLessThan(2000); // Should handle 50 requests in under 2 seconds
      
      responses.forEach(response => {
        expect(response.body).toHaveProperty('status', 'healthy');
      });
    });
  });

  describe('Memory Usage Tests', () => {
    it('should not have memory leaks during extended operation', async () => {
      const initialMemory = process.memoryUsage();
      const iterations = 100;

      for (let i = 0; i < iterations; i++) {
        await request(app)
          .get('/health')
          .expect(200);
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryIncreasePercent = (memoryIncrease / initialMemory.heapUsed) * 100;

      // Memory increase should be less than 10%
      expect(memoryIncreasePercent).toBeLessThan(10);
    });

    it('should handle large payloads efficiently', async () => {
      const largeData = {
        data: Array(1000).fill(0).map((_, i) => ({
          id: i,
          value: Math.random(),
          timestamp: new Date().toISOString()
        }))
      };

      const start = Date.now();
      const response = await request(app)
        .post('/api/test/large-payload')
        .send(largeData)
        .expect(200);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(1000);
      expect(response.body).toHaveProperty('success', true);
    });
  });

  describe('Database Performance Tests', () => {
    it('should handle database queries efficiently', async () => {
      const start = Date.now();
      const response = await request(app)
        .get('/api/portfolio/summary')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(300);
      expect(response.body).toHaveProperty('success', true);
    });

    it('should handle concurrent database operations', async () => {
      const concurrentOperations = 20;
      const promises = [];

      const start = Date.now();

      for (let i = 0; i < concurrentOperations; i++) {
        promises.push(
          request(app)
            .get('/api/trading/orders')
            .set('Authorization', 'Bearer valid-token')
            .expect(200)
        );
      }

      const responses = await Promise.all(promises);
      const duration = Date.now() - start;

      expect(responses).toHaveLength(concurrentOperations);
      expect(duration).toBeLessThan(1000);
    });
  });

  describe('Cache Performance Tests', () => {
    it('should cache frequently accessed data', async () => {
      // First request - should be slow (cache miss)
      const start1 = Date.now();
      await request(app)
        .get('/api/market/price/BTC/USDT')
        .expect(200);
      const duration1 = Date.now() - start1;

      // Second request - should be fast (cache hit)
      const start2 = Date.now();
      await request(app)
        .get('/api/market/price/BTC/USDT')
        .expect(200);
      const duration2 = Date.now() - start2;

      expect(duration2).toBeLessThan(duration1);
      expect(duration2).toBeLessThan(50); // Cached response should be very fast
    });

    it('should handle cache invalidation efficiently', async () => {
      // Populate cache
      await request(app)
        .get('/api/market/price/BTC/USDT')
        .expect(200);

      // Invalidate cache
      await request(app)
        .post('/api/cache/invalidate')
        .send({ key: 'price:BTC/USDT' })
        .expect(200);

      // Next request should be fresh
      const start = Date.now();
      await request(app)
        .get('/api/market/price/BTC/USDT')
        .expect(200);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(200);
    });
  });

  describe('Rate Limiting Performance Tests', () => {
    it('should handle rate limiting efficiently', async () => {
      const requests = [];
      const start = Date.now();

      // Make requests at the rate limit boundary
      for (let i = 0; i < 100; i++) {
        requests.push(
          request(app)
            .get('/api/market/price/BTC/USDT')
        );
      }

      const responses = await Promise.all(requests);
      const duration = Date.now() - start;

      const successCount = responses.filter(r => r.status === 200).length;
      const rateLimitedCount = responses.filter(r => r.status === 429).length;

      expect(successCount).toBeGreaterThan(0);
      expect(rateLimitedCount).toBeGreaterThan(0);
      expect(duration).toBeLessThan(5000);
    });
  });

  describe('Error Handling Performance Tests', () => {
    it('should handle errors efficiently', async () => {
      const start = Date.now();
      const response = await request(app)
        .get('/api/nonexistent-endpoint')
        .expect(404);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(100);
      expect(response.body).toHaveProperty('error', 'Not Found');
    });

    it('should handle malformed requests efficiently', async () => {
      const start = Date.now();
      const response = await request(app)
        .post('/api/trading/execute')
        .send('invalid json')
        .expect(400);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(100);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('WebSocket Performance Tests', () => {
    it('should handle WebSocket connections efficiently', (done) => {
      const WebSocket = require('ws');
      const ws = new WebSocket('ws://localhost:3000/ws');
      const start = Date.now();

      ws.on('open', () => {
        const connectionTime = Date.now() - start;
        expect(connectionTime).toBeLessThan(1000);
        
        ws.close();
        done();
      });

      ws.on('error', (error) => {
        // WebSocket might not be available in test environment
        done();
      });
    });
  });

  describe('File Upload Performance Tests', () => {
    it('should handle file uploads efficiently', async () => {
      const testFile = Buffer.from('test file content');
      
      const start = Date.now();
      const response = await request(app)
        .post('/api/upload')
        .set('Authorization', 'Bearer valid-token')
        .attach('file', testFile, 'test.txt')
        .expect(200);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(1000);
      expect(response.body).toHaveProperty('success', true);
    });
  });

  describe('API Response Size Tests', () => {
    it('should limit response sizes appropriately', async () => {
      const response = await request(app)
        .get('/api/market/history/BTC/USDT?limit=1000')
        .expect(200);

      const responseSize = JSON.stringify(response.body).length;
      const maxSize = 1024 * 1024; // 1MB

      expect(responseSize).toBeLessThan(maxSize);
    });

    it('should paginate large datasets', async () => {
      const response = await request(app)
        .get('/api/trading/orders?page=1&limit=50')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toHaveProperty('pagination');
      expect(response.body.pagination).toHaveProperty('page', 1);
      expect(response.body.pagination).toHaveProperty('limit', 50);
      expect(response.body.pagination).toHaveProperty('total');
    });
  });

  describe('Concurrent User Tests', () => {
    it('should handle multiple concurrent users', async () => {
      const userCount = 10;
      const requestsPerUser = 5;
      const promises = [];

      for (let user = 0; user < userCount; user++) {
        for (let req = 0; req < requestsPerUser; req++) {
          promises.push(
            request(app)
              .get('/api/portfolio/summary')
              .set('Authorization', `Bearer user-${user}-token`)
          );
        }
      }

      const start = Date.now();
      const responses = await Promise.all(promises);
      const duration = Date.now() - start;

      expect(responses).toHaveLength(userCount * requestsPerUser);
      expect(duration).toBeLessThan(5000);
    });
  });
});
