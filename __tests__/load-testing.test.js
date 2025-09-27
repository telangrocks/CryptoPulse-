/**
 * Comprehensive Load Testing Suite
 * Tests application performance under high user load
 */

const axios = require('axios');
const { performance } = require('perf_hooks');

describe('Load Testing Suite', () => {
  const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
  const API_BASE_URL = process.env.API_BASE_URL || 'https://parseapi.back4app.com/parse/functions';
  
  // Test configuration
  const LOAD_TEST_CONFIG = {
    concurrentUsers: 100,
    requestsPerUser: 10,
    rampUpTime: 30, // seconds
    testDuration: 300, // 5 minutes
    maxResponseTime: 2000, // 2 seconds
    maxErrorRate: 0.05 // 5%
  };

  let testResults = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    responseTimes: [],
    errors: [],
    startTime: null,
    endTime: null
  };

  beforeAll(() => {
    testResults.startTime = performance.now();
  });

  afterAll(() => {
    testResults.endTime = performance.now();
    generateLoadTestReport();
  });

  describe('API Endpoint Load Tests', () => {
    test('Health Check Endpoint Load Test', async () => {
      const endpoint = `${API_BASE_URL}/healthCheck`;
      const results = await runLoadTest(endpoint, 'GET', 50, 20);
      
      expect(results.successRate).toBeGreaterThan(0.95);
      expect(results.averageResponseTime).toBeLessThan(1000);
      expect(results.maxResponseTime).toBeLessThan(2000);
    });

    test('Market Data Endpoint Load Test', async () => {
      const endpoint = `${API_BASE_URL}/getCurrentPrice`;
      const payload = { pair: 'BTC/USDT' };
      const results = await runLoadTest(endpoint, 'POST', 30, 15, payload);
      
      expect(results.successRate).toBeGreaterThan(0.90);
      expect(results.averageResponseTime).toBeLessThan(1500);
    });

    test('Trading Signals Endpoint Load Test', async () => {
      const endpoint = `${API_BASE_URL}/getTradingSignals`;
      const payload = { pair: 'BTC/USDT', timeframe: '1h' };
      const results = await runLoadTest(endpoint, 'POST', 20, 10, payload);
      
      expect(results.successRate).toBeGreaterThan(0.85);
      expect(results.averageResponseTime).toBeLessThan(2000);
    });

    test('Portfolio Management Load Test', async () => {
      const endpoint = `${API_BASE_URL}/getPortfolioPerformance`;
      const results = await runLoadTest(endpoint, 'POST', 25, 12);
      
      expect(results.successRate).toBeGreaterThan(0.90);
      expect(results.averageResponseTime).toBeLessThan(1500);
    });
  });

  describe('Concurrent User Simulation', () => {
    test('Simultaneous User Login Load Test', async () => {
      const endpoint = `${API_BASE_URL}/userAuthentication`;
      const payload = {
        email: 'test@example.com',
        password: process.env.TEST_PASSWORD || 'testpassword123',
        action: 'login'
      };

      const results = await runConcurrentLoadTest(endpoint, 'POST', 50, payload);
      
      expect(results.successRate).toBeGreaterThan(0.95);
      expect(results.averageResponseTime).toBeLessThan(2000);
      expect(results.concurrentErrors).toBeLessThan(5);
    });

    test('Concurrent Trading Signal Requests', async () => {
      const endpoint = `${API_BASE_URL}/getTradingSignals`;
      const pairs = ['BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'ADA/USDT', 'SOL/USDT'];
      
      const promises = pairs.map(pair => 
        runConcurrentLoadTest(endpoint, 'POST', 20, { pair, timeframe: '1h' })
      );

      const results = await Promise.all(promises);
      
      results.forEach(result => {
        expect(result.successRate).toBeGreaterThan(0.85);
        expect(result.averageResponseTime).toBeLessThan(2000);
      });
    });
  });

  describe('Database Load Tests', () => {
    test('High-Frequency Order Creation', async () => {
      const endpoint = `${API_BASE_URL}/executeRealTrade`;
      const payload = {
        action: 'BUY',
        pair: 'BTC/USDT',
        amount: 0.001,
        strategy: 'AI_POWERED',
        useRealExecution: false
      };

      const results = await runLoadTest(endpoint, 'POST', 100, 50, payload);
      
      expect(results.successRate).toBeGreaterThan(0.90);
      expect(results.averageResponseTime).toBeLessThan(3000);
    });

    test('Concurrent Market Data Updates', async () => {
      const endpoint = `${API_BASE_URL}/getMarketData`;
      const payload = { pair: 'BTC/USDT', timeframe: '1h' };

      const results = await runConcurrentLoadTest(endpoint, 'POST', 75, payload);
      
      expect(results.successRate).toBeGreaterThan(0.90);
      expect(results.averageResponseTime).toBeLessThan(1000);
    });
  });

  describe('Memory and Resource Tests', () => {
    test('Memory Leak Detection', async () => {
      const initialMemory = process.memoryUsage();
      
      // Run intensive operations
      for (let i = 0; i < 1000; i++) {
        await axios.get(`${API_BASE_URL}/healthCheck`).catch(() => {});
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      
      // Memory increase should be reasonable (less than 100MB)
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);
    });

    test('Connection Pool Handling', async () => {
      const promises = [];
      
      // Create many concurrent connections
      for (let i = 0; i < 200; i++) {
        promises.push(
          axios.get(`${API_BASE_URL}/healthCheck`).catch(() => ({}))
        );
      }

      const results = await Promise.all(promises);
      const successCount = results.filter(r => r.status === 200).length;
      
      expect(successCount).toBeGreaterThan(150); // At least 75% success rate
    });
  });

  describe('Error Handling Under Load', () => {
    test('Rate Limiting Under High Load', async () => {
      const endpoint = `${API_BASE_URL}/healthCheck`;
      
      // Make requests faster than rate limit
      const promises = [];
      for (let i = 0; i < 1000; i++) {
        promises.push(
          axios.get(endpoint).catch(error => ({
            status: error.response?.status,
            message: error.message
          }))
        );
      }

      const results = await Promise.all(promises);
      const rateLimitedCount = results.filter(r => r.status === 429).length;
      const successCount = results.filter(r => r.status === 200).length;
      
      // Should have some rate limiting but still handle most requests
      expect(successCount).toBeGreaterThan(rateLimitedCount);
    });

    test('Graceful Degradation Under Load', async () => {
      const endpoint = `${API_BASE_URL}/getTradingSignals`;
      const payload = { pair: 'BTC/USDT', timeframe: '1h' };

      const results = await runLoadTest(endpoint, 'POST', 200, 100, payload);
      
      // Even under high load, should maintain reasonable performance
      expect(results.successRate).toBeGreaterThan(0.70);
      expect(results.averageResponseTime).toBeLessThan(5000);
    });
  });

  // Helper function to run load tests
  async function runLoadTest(endpoint, method, totalRequests, concurrentRequests, payload = null) {
    const results = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      responseTimes: [],
      errors: [],
      startTime: performance.now()
    };

    const batches = Math.ceil(totalRequests / concurrentRequests);
    
    for (let batch = 0; batch < batches; batch++) {
      const batchSize = Math.min(concurrentRequests, totalRequests - (batch * concurrentRequests));
      const promises = [];

      for (let i = 0; i < batchSize; i++) {
        const requestPromise = makeRequest(endpoint, method, payload)
          .then(response => {
            results.successfulRequests++;
            results.responseTimes.push(response.responseTime);
          })
          .catch(error => {
            results.failedRequests++;
            results.errors.push(error.message);
          });
        
        promises.push(requestPromise);
        results.totalRequests++;
      }

      await Promise.all(promises);
      
      // Small delay between batches to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    results.endTime = performance.now();
    results.duration = results.endTime - results.startTime;
    results.successRate = results.successfulRequests / results.totalRequests;
    results.averageResponseTime = results.responseTimes.reduce((a, b) => a + b, 0) / results.responseTimes.length;
    results.maxResponseTime = Math.max(...results.responseTimes);

    return results;
  }

  // Helper function to run concurrent load tests
  async function runConcurrentLoadTest(endpoint, method, concurrentUsers, payload = null) {
    const promises = [];

    for (let i = 0; i < concurrentUsers; i++) {
      promises.push(
        makeRequest(endpoint, method, payload)
          .catch(error => ({
            status: error.response?.status,
            message: error.message,
            responseTime: 0
          }))
      );
    }

    const results = await Promise.all(promises);
    const successful = results.filter(r => r.status === 200);
    const failed = results.filter(r => r.status !== 200);
    
    return {
      totalRequests: results.length,
      successfulRequests: successful.length,
      failedRequests: failed.length,
      successRate: successful.length / results.length,
      averageResponseTime: successful.reduce((sum, r) => sum + r.responseTime, 0) / successful.length,
      concurrentErrors: failed.length
    };
  }

  // Helper function to make individual requests
  async function makeRequest(endpoint, method, payload = null) {
    const startTime = performance.now();
    
    try {
      const config = {
        method,
        url: endpoint,
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
          'X-Parse-Application-Id': process.env.PARSE_APP_ID || 'test',
          'X-Parse-REST-API-Key': process.env.PARSE_REST_API_KEY || 'test'
        }
      };

      if (payload) {
        config.data = payload;
      }

      const response = await axios(config);
      const responseTime = performance.now() - startTime;
      
      return {
        status: response.status,
        data: response.data,
        responseTime
      };
    } catch (error) {
      const responseTime = performance.now() - startTime;
      throw {
        status: error.response?.status || 500,
        message: error.message,
        responseTime
      };
    }
  }

  // Generate comprehensive load test report
  function generateLoadTestReport() {
    const duration = testResults.endTime - testResults.startTime;
    const successRate = testResults.successfulRequests / testResults.totalRequests;
    const averageResponseTime = testResults.responseTimes.reduce((a, b) => a + b, 0) / testResults.responseTimes.length;
    const maxResponseTime = Math.max(...testResults.responseTimes);
    const minResponseTime = Math.min(...testResults.responseTimes);

    console.log('\n=== LOAD TEST REPORT ===');
    console.log(`Total Requests: ${testResults.totalRequests}`);
    console.log(`Successful Requests: ${testResults.successfulRequests}`);
    console.log(`Failed Requests: ${testResults.failedRequests}`);
    console.log(`Success Rate: ${(successRate * 100).toFixed(2)}%`);
    console.log(`Test Duration: ${(duration / 1000).toFixed(2)}s`);
    console.log(`Average Response Time: ${averageResponseTime.toFixed(2)}ms`);
    console.log(`Max Response Time: ${maxResponseTime.toFixed(2)}ms`);
    console.log(`Min Response Time: ${minResponseTime.toFixed(2)}ms`);
    console.log(`Requests per Second: ${(testResults.totalRequests / (duration / 1000)).toFixed(2)}`);
    
    if (testResults.errors.length > 0) {
      console.log('\n=== ERROR SUMMARY ===');
      const errorCounts = {};
      testResults.errors.forEach(error => {
        errorCounts[error] = (errorCounts[error] || 0) + 1;
      });
      Object.entries(errorCounts).forEach(([error, count]) => {
        console.log(`${error}: ${count} occurrences`);
      });
    }

    // Performance assertions
    expect(successRate).toBeGreaterThan(0.90);
    expect(averageResponseTime).toBeLessThan(2000);
    expect(maxResponseTime).toBeLessThan(5000);
  }
});
