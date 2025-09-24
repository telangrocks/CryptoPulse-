/**
 * CryptoPulse Load Testing Suite
 * Comprehensive performance testing for production readiness
 */

const axios = require('axios');
const WebSocket = require('ws');
const { performance } = require('perf_hooks');

class LoadTester {
  constructor(config = {}) {
    this.config = {
      baseUrl: config.baseUrl || 'http://localhost:3000',
      concurrentUsers: config.concurrentUsers || 10,
      testDuration: config.testDuration || 60000, // 1 minute
      rampUpTime: config.rampUpTime || 10000, // 10 seconds
      ...config
    };
    
    this.results = {
      requests: [],
      errors: [],
      responseTimes: [],
      throughput: 0,
      errorRate: 0
    };
    
    this.startTime = null;
    this.endTime = null;
  }

  // Generate test data
  generateTestData() {
    return {
      email: `test${Math.random().toString(36).substr(2, 9)}@example.com`,
      password: 'TestPassword123!',
      symbol: 'BTCUSDT',
      quantity: Math.random() * 0.1 + 0.01,
      price: 45000 + Math.random() * 1000
    };
  }

  // Simulate user session
  async simulateUserSession(userId) {
    const sessionResults = {
      userId,
      requests: 0,
      errors: 0,
      responseTimes: [],
      startTime: Date.now()
    };

    try {
      // 1. Login
      const loginData = this.generateTestData();
      const loginStart = performance.now();
      
      try {
        const loginResponse = await axios.post(`${this.config.baseUrl}/api/auth/login`, loginData, {
          timeout: 5000
        });
        
        const loginTime = performance.now() - loginStart;
        sessionResults.responseTimes.push(loginTime);
        sessionResults.requests++;
        
        if (loginResponse.status !== 200) {
          sessionResults.errors++;
        }
      } catch (error) {
        sessionResults.errors++;
        sessionResults.responseTimes.push(performance.now() - loginStart);
      }

      // 2. Validate session
      try {
        const validateStart = performance.now();
        const validateResponse = await axios.get(`${this.config.baseUrl}/api/auth/validate`, {
          timeout: 5000
        });
        
        const validateTime = performance.now() - validateStart;
        sessionResults.responseTimes.push(validateTime);
        sessionResults.requests++;
        
        if (validateResponse.status !== 200) {
          sessionResults.errors++;
        }
      } catch (error) {
        sessionResults.errors++;
      }

      // 3. Trading operations
      for (let i = 0; i < 5; i++) {
        try {
          const tradeData = this.generateTestData();
          const tradeStart = performance.now();
          
          const tradeResponse = await axios.post(`${this.config.baseUrl}/api/trading/order`, tradeData, {
            timeout: 10000
          });
          
          const tradeTime = performance.now() - tradeStart;
          sessionResults.responseTimes.push(tradeTime);
          sessionResults.requests++;
          
          if (tradeResponse.status !== 200) {
            sessionResults.errors++;
          }
          
          // Add delay between trades
          await this.sleep(1000 + Math.random() * 2000);
        } catch (error) {
          sessionResults.errors++;
        }
      }

      // 4. Market data requests
      for (let i = 0; i < 10; i++) {
        try {
          const marketStart = performance.now();
          
          const marketResponse = await axios.get(`${this.config.baseUrl}/api/market-data`, {
            timeout: 5000
          });
          
          const marketTime = performance.now() - marketStart;
          sessionResults.responseTimes.push(marketTime);
          sessionResults.requests++;
          
          if (marketResponse.status !== 200) {
            sessionResults.errors++;
          }
          
          // Add delay between requests
          await this.sleep(500 + Math.random() * 1000);
        } catch (error) {
          sessionResults.errors++;
        }
      }

      // 5. Logout
      try {
        const logoutStart = performance.now();
        
        const logoutResponse = await axios.post(`${this.config.baseUrl}/api/auth/logout`, {}, {
          timeout: 5000
        });
        
        const logoutTime = performance.now() - logoutStart;
        sessionResults.responseTimes.push(logoutTime);
        sessionResults.requests++;
        
        if (logoutResponse.status !== 200) {
          sessionResults.errors++;
        }
      } catch (error) {
        sessionResults.errors++;
      }

    } catch (error) {
      sessionResults.errors++;
    }

    sessionResults.endTime = Date.now();
    sessionResults.duration = sessionResults.endTime - sessionResults.startTime;
    
    return sessionResults;
  }

  // Rate limiting test
  async testRateLimiting() {
    console.log('🔒 Testing rate limiting...');
    
    const results = {
      requests: 0,
      rateLimited: 0,
      errors: 0
    };

    // Send rapid requests to trigger rate limiting
    const promises = [];
    for (let i = 0; i < 20; i++) {
      promises.push(
        axios.post(`${this.config.baseUrl}/api/auth/login`, this.generateTestData(), {
          timeout: 2000
        }).then(response => {
          results.requests++;
          if (response.status === 429) {
            results.rateLimited++;
          }
        }).catch(error => {
          results.requests++;
          if (error.response && error.response.status === 429) {
            results.rateLimited++;
          } else {
            results.errors++;
          }
        })
      );
    }

    await Promise.all(promises);
    
    console.log(`Rate limiting test results:`);
    console.log(`- Total requests: ${results.requests}`);
    console.log(`- Rate limited: ${results.rateLimited}`);
    console.log(`- Error rate: ${((results.errors / results.requests) * 100).toFixed(2)}%`);
    
    return results;
  }

  // Circuit breaker test
  async testCircuitBreaker() {
    console.log('⚡ Testing circuit breaker...');
    
    // Simulate service failures by making requests to non-existent endpoints
    const results = {
      requests: 0,
      failures: 0,
      circuitOpen: 0
    };

    for (let i = 0; i < 10; i++) {
      try {
        results.requests++;
        await axios.get(`${this.config.baseUrl}/api/non-existent-endpoint`, {
          timeout: 1000
        });
      } catch (error) {
        results.failures++;
        if (error.response && error.response.status === 503) {
          results.circuitOpen++;
        }
      }
      
      await this.sleep(100);
    }
    
    console.log(`Circuit breaker test results:`);
    console.log(`- Total requests: ${results.requests}`);
    console.log(`- Failures: ${results.failures}`);
    console.log(`- Circuit open responses: ${results.circuitOpen}`);
    
    return results;
  }

  // WebSocket load test
  async testWebSocketLoad() {
    console.log('🌐 Testing WebSocket connections...');
    
    const connections = [];
    const results = {
      connections: 0,
      messages: 0,
      errors: 0,
      avgLatency: 0
    };

    // Create multiple WebSocket connections
    for (let i = 0; i < 5; i++) {
      try {
        const ws = new WebSocket('ws://localhost:3000/ws');
        
        ws.on('open', () => {
          results.connections++;
          
          // Send test messages
          for (let j = 0; j < 10; j++) {
            const startTime = performance.now();
            ws.send(JSON.stringify({
              type: 'ping',
              timestamp: startTime
            }));
            
            ws.on('message', (data) => {
              const endTime = performance.now();
              const latency = endTime - startTime;
              results.avgLatency = (results.avgLatency + latency) / 2;
              results.messages++;
            });
          }
        });
        
        ws.on('error', (error) => {
          results.errors++;
          console.error('WebSocket error:', error);
        });
        
        connections.push(ws);
        
        await this.sleep(100);
      } catch (error) {
        results.errors++;
      }
    }

    // Wait for messages to be processed
    await this.sleep(5000);
    
    // Close connections
    connections.forEach(ws => ws.close());
    
    console.log(`WebSocket test results:`);
    console.log(`- Connections: ${results.connections}`);
    console.log(`- Messages: ${results.messages}`);
    console.log(`- Errors: ${results.errors}`);
    console.log(`- Average latency: ${results.avgLatency.toFixed(2)}ms`);
    
    return results;
  }

  // Memory usage test
  async testMemoryUsage() {
    console.log('💾 Testing memory usage...');
    
    const initialMemory = process.memoryUsage();
    const sessions = [];
    
    // Create many sessions to test memory usage
    for (let i = 0; i < 100; i++) {
      sessions.push(this.simulateUserSession(i));
    }
    
    await Promise.all(sessions);
    
    const finalMemory = process.memoryUsage();
    const memoryIncrease = {
      rss: finalMemory.rss - initialMemory.rss,
      heapUsed: finalMemory.heapUsed - initialMemory.heapUsed,
      heapTotal: finalMemory.heapTotal - initialMemory.heapTotal,
      external: finalMemory.external - initialMemory.external
    };
    
    console.log(`Memory usage test results:`);
    console.log(`- RSS increase: ${(memoryIncrease.rss / 1024 / 1024).toFixed(2)} MB`);
    console.log(`- Heap used increase: ${(memoryIncrease.heapUsed / 1024 / 1024).toFixed(2)} MB`);
    console.log(`- Heap total increase: ${(memoryIncrease.heapTotal / 1024 / 1024).toFixed(2)} MB`);
    console.log(`- External increase: ${(memoryIncrease.external / 1024 / 1024).toFixed(2)} MB`);
    
    return memoryIncrease;
  }

  // Main load test
  async runLoadTest() {
    console.log(`🚀 Starting load test with ${this.config.concurrentUsers} concurrent users`);
    console.log(`Duration: ${this.config.testDuration / 1000} seconds`);
    
    this.startTime = Date.now();
    
    // Ramp up users gradually
    const userPromises = [];
    const rampUpDelay = this.config.rampUpTime / this.config.concurrentUsers;
    
    for (let i = 0; i < this.config.concurrentUsers; i++) {
      setTimeout(() => {
        userPromises.push(this.simulateUserSession(i));
      }, i * rampUpDelay);
    }
    
    // Wait for test duration
    await this.sleep(this.config.testDuration);
    
    // Wait for all sessions to complete
    const sessionResults = await Promise.all(userPromises);
    
    this.endTime = Date.now();
    
    // Calculate results
    this.calculateResults(sessionResults);
    
    return this.results;
  }

  // Calculate test results
  calculateResults(sessionResults) {
    let totalRequests = 0;
    let totalErrors = 0;
    let totalResponseTime = 0;
    let responseTimeCount = 0;
    
    sessionResults.forEach(session => {
      totalRequests += session.requests;
      totalErrors += session.errors;
      
      session.responseTimes.forEach(time => {
        totalResponseTime += time;
        responseTimeCount++;
      });
    });
    
    this.results.requests = totalRequests;
    this.results.errors = totalErrors;
    this.results.errorRate = (totalErrors / totalRequests) * 100;
    this.results.avgResponseTime = totalResponseTime / responseTimeCount;
    this.results.throughput = totalRequests / ((this.endTime - this.startTime) / 1000);
    
    // Calculate percentiles
    const allResponseTimes = sessionResults.flatMap(s => s.responseTimes).sort((a, b) => a - b);
    this.results.p50ResponseTime = this.calculatePercentile(allResponseTimes, 50);
    this.results.p95ResponseTime = this.calculatePercentile(allResponseTimes, 95);
    this.results.p99ResponseTime = this.calculatePercentile(allResponseTimes, 99);
  }

  // Calculate percentile
  calculatePercentile(sortedArray, percentile) {
    if (sortedArray.length === 0) return 0;
    
    const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
    return sortedArray[index] || 0;
  }

  // Sleep utility
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Print results
  printResults() {
    console.log('\n📊 LOAD TEST RESULTS');
    console.log('='.repeat(50));
    console.log(`Total Requests: ${this.results.requests}`);
    console.log(`Total Errors: ${this.results.errors}`);
    console.log(`Error Rate: ${this.results.errorRate.toFixed(2)}%`);
    console.log(`Throughput: ${this.results.throughput.toFixed(2)} requests/second`);
    console.log(`Average Response Time: ${this.results.avgResponseTime.toFixed(2)}ms`);
    console.log(`50th Percentile: ${this.results.p50ResponseTime.toFixed(2)}ms`);
    console.log(`95th Percentile: ${this.results.p95ResponseTime.toFixed(2)}ms`);
    console.log(`99th Percentile: ${this.results.p99ResponseTime.toFixed(2)}ms`);
    console.log(`Test Duration: ${((this.endTime - this.startTime) / 1000).toFixed(2)} seconds`);
    
    // Performance recommendations
    console.log('\n🎯 PERFORMANCE RECOMMENDATIONS');
    console.log('='.repeat(50));
    
    if (this.results.errorRate > 5) {
      console.log('❌ High error rate detected. Check server logs and capacity.');
    }
    
    if (this.results.avgResponseTime > 1000) {
      console.log('⚠️  High response times detected. Consider optimizing database queries.');
    }
    
    if (this.results.p95ResponseTime > 2000) {
      console.log('⚠️  95th percentile response time is high. Check for performance bottlenecks.');
    }
    
    if (this.results.throughput < 10) {
      console.log('⚠️  Low throughput detected. Consider scaling horizontally.');
    }
    
    if (this.results.errorRate < 1 && this.results.avgResponseTime < 500) {
      console.log('✅ Performance metrics look good!');
    }
  }
}

// Run tests
async function runAllTests() {
  const tester = new LoadTester({
    baseUrl: process.env.TEST_BASE_URL || 'http://localhost:3000',
    concurrentUsers: parseInt(process.env.CONCURRENT_USERS) || 10,
    testDuration: parseInt(process.env.TEST_DURATION) || 60000
  });

  try {
    // Run individual tests
    await tester.testRateLimiting();
    await tester.testCircuitBreaker();
    await tester.testWebSocketLoad();
    await tester.testMemoryUsage();
    
    // Run main load test
    const results = await tester.runLoadTest();
    tester.printResults();
    
    // Exit with appropriate code
    process.exit(results.errorRate > 10 ? 1 : 0);
    
  } catch (error) {
    console.error('Load test failed:', error);
    process.exit(1);
  }
}

// CLI interface
if (require.main === module) {
  const command = process.argv[2];
  
  switch (command) {
    case 'rate-limit':
      new LoadTester().testRateLimiting();
      break;
    case 'circuit-breaker':
      new LoadTester().testCircuitBreaker();
      break;
    case 'websocket':
      new LoadTester().testWebSocketLoad();
      break;
    case 'memory':
      new LoadTester().testMemoryUsage();
      break;
    case 'full':
    default:
      runAllTests();
      break;
  }
}

module.exports = LoadTester;
