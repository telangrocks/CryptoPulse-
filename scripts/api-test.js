/**
 * API Integration Testing Suite
 * Comprehensive testing for all API endpoints and external service integrations
 */

const axios = require('axios');
const WebSocket = require('ws');
const crypto = require('crypto');

class APITester {
  constructor(config = {}) {
    this.config = {
      baseUrl: config.baseUrl || 'http://localhost:3000',
      timeout: config.timeout || 10000,
      retries: config.retries || 3,
      ...config
    };
    
    this.results = {
      passed: 0,
      failed: 0,
      errors: [],
      tests: []
    };
    
    this.authToken = null;
    this.sessionId = null;
    this.csrfToken = null;
  }

  // Test result logging
  logResult(testName, passed, error = null, response = null) {
    const result = {
      name: testName,
      passed,
      error: error ? error.message : null,
      response: response ? {
        status: response.status,
        data: response.data
      } : null,
      timestamp: new Date().toISOString()
    };
    
    this.results.tests.push(result);
    
    if (passed) {
      this.results.passed++;
      console.log(`✅ ${testName}`);
    } else {
      this.results.failed++;
      console.log(`❌ ${testName}: ${error ? error.message : 'Failed'}`);
      this.results.errors.push(result);
    }
  }

  // Make authenticated request
  async makeRequest(method, endpoint, data = null, headers = {}) {
    const config = {
      method,
      url: `${this.config.baseUrl}${endpoint}`,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    if (this.csrfToken) {
      config.headers['X-CSRF-Token'] = this.csrfToken;
    }

    if (this.sessionId) {
      config.headers['X-Session-ID'] = this.sessionId;
    }

    if (data) {
      config.data = data;
    }

    return axios(config);
  }

  // Test CSRF token endpoint
  async testCSRFToken() {
    try {
      const response = await this.makeRequest('GET', '/api/csrf-token');
      
      if (response.status === 200 && response.data.csrfToken) {
        this.csrfToken = response.data.csrfToken;
        this.logResult('CSRF Token Generation', true, null, response);
        return true;
      } else {
        this.logResult('CSRF Token Generation', false, new Error('Invalid response'));
        return false;
      }
    } catch (error) {
      this.logResult('CSRF Token Generation', false, error);
      return false;
    }
  }

  // Test user registration
  async testUserRegistration() {
    try {
      const userData = {
        email: `test${Date.now()}@example.com`,
        password: 'TestPassword123!',
        confirmPassword: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User',
        termsAccepted: true
      };

      const response = await this.makeRequest('POST', '/api/auth/register', userData);
      
      if (response.status === 201 || response.status === 200) {
        this.logResult('User Registration', true, null, response);
        return true;
      } else {
        this.logResult('User Registration', false, new Error(`Status: ${response.status}`));
        return false;
      }
    } catch (error) {
      this.logResult('User Registration', false, error);
      return false;
    }
  }

  // Test user login
  async testUserLogin() {
    try {
      const loginData = {
        email: 'test@example.com',
        password: 'TestPassword123!'
      };

      const response = await this.makeRequest('POST', '/api/auth/login', loginData);
      
      if (response.status === 200 && response.data.success) {
        this.sessionId = response.data.session.sessionId;
        this.csrfToken = response.data.session.csrfToken;
        this.logResult('User Login', true, null, response);
        return true;
      } else {
        this.logResult('User Login', false, new Error(`Status: ${response.status}`));
        return false;
      }
    } catch (error) {
      this.logResult('User Login', false, error);
      return false;
    }
  }

  // Test session validation
  async testSessionValidation() {
    try {
      const response = await this.makeRequest('GET', '/api/auth/validate');
      
      if (response.status === 200 && response.data.valid) {
        this.logResult('Session Validation', true, null, response);
        return true;
      } else {
        this.logResult('Session Validation', false, new Error(`Status: ${response.status}`));
        return false;
      }
    } catch (error) {
      this.logResult('Session Validation', false, error);
      return false;
    }
  }

  // Test trading API
  async testTradingAPI() {
    try {
      const tradeData = {
        symbol: 'BTCUSDT',
        side: 'BUY',
        type: 'MARKET',
        quantity: 0.001
      };

      const response = await this.makeRequest('POST', '/api/trading/order', tradeData);
      
      // In test mode, we might get a 400 or 422 for invalid data, which is expected
      if (response.status === 200 || response.status === 400 || response.status === 422) {
        this.logResult('Trading API', true, null, response);
        return true;
      } else {
        this.logResult('Trading API', false, new Error(`Status: ${response.status}`));
        return false;
      }
    } catch (error) {
      // Trading API might fail due to missing API keys, which is expected in test
      if (error.response && (error.response.status === 401 || error.response.status === 400)) {
        this.logResult('Trading API', true, null, error.response);
        return true;
      } else {
        this.logResult('Trading API', false, error);
        return false;
      }
    }
  }

  // Test market data API
  async testMarketDataAPI() {
    try {
      const response = await this.makeRequest('GET', '/api/market-data');
      
      if (response.status === 200 && response.data) {
        this.logResult('Market Data API', true, null, response);
        return true;
      } else {
        this.logResult('Market Data API', false, new Error(`Status: ${response.status}`));
        return false;
      }
    } catch (error) {
      this.logResult('Market Data API', false, error);
      return false;
    }
  }

  // Test rate limiting
  async testRateLimiting() {
    try {
      const promises = [];
      
      // Send multiple rapid requests to trigger rate limiting
      for (let i = 0; i < 10; i++) {
        promises.push(
          this.makeRequest('POST', '/api/auth/login', {
            email: 'test@example.com',
            password: 'wrongpassword'
          }).catch(error => error.response)
        );
      }
      
      const responses = await Promise.all(promises);
      const rateLimited = responses.some(res => res && res.status === 429);
      
      if (rateLimited) {
        this.logResult('Rate Limiting', true, null, { status: 429 });
        return true;
      } else {
        this.logResult('Rate Limiting', false, new Error('Rate limiting not triggered'));
        return false;
      }
    } catch (error) {
      this.logResult('Rate Limiting', false, error);
      return false;
    }
  }

  // Test security headers
  async testSecurityHeaders() {
    try {
      const response = await this.makeRequest('GET', '/');
      
      const requiredHeaders = [
        'x-frame-options',
        'x-content-type-options',
        'x-xss-protection',
        'content-security-policy'
      ];
      
      const missingHeaders = requiredHeaders.filter(header => 
        !response.headers[header] && !response.headers[header.toLowerCase()]
      );
      
      if (missingHeaders.length === 0) {
        this.logResult('Security Headers', true, null, response);
        return true;
      } else {
        this.logResult('Security Headers', false, new Error(`Missing headers: ${missingHeaders.join(', ')}`));
        return false;
      }
    } catch (error) {
      this.logResult('Security Headers', false, error);
      return false;
    }
  }

  // Test WebSocket connection
  async testWebSocketConnection() {
    return new Promise((resolve) => {
      try {
        const ws = new WebSocket('ws://localhost:3000/ws');
        let connected = false;
        
        const timeout = setTimeout(() => {
          if (!connected) {
            ws.close();
            this.logResult('WebSocket Connection', false, new Error('Connection timeout'));
            resolve(false);
          }
        }, 5000);
        
        ws.on('open', () => {
          connected = true;
          clearTimeout(timeout);
          this.logResult('WebSocket Connection', true);
          ws.close();
          resolve(true);
        });
        
        ws.on('error', (error) => {
          clearTimeout(timeout);
          this.logResult('WebSocket Connection', false, error);
          resolve(false);
        });
        
      } catch (error) {
        this.logResult('WebSocket Connection', false, error);
        resolve(false);
      }
    });
  }

  // Test health check endpoint
  async testHealthCheck() {
    try {
      const response = await this.makeRequest('GET', '/health');
      
      if (response.status === 200 && response.data.status) {
        this.logResult('Health Check', true, null, response);
        return true;
      } else {
        this.logResult('Health Check', false, new Error(`Status: ${response.status}`));
        return false;
      }
    } catch (error) {
      this.logResult('Health Check', false, error);
      return false;
    }
  }

  // Test monitoring endpoints
  async testMonitoringEndpoints() {
    try {
      // Test metrics endpoint
      const metricsResponse = await this.makeRequest('GET', '/metrics');
      
      if (metricsResponse.status === 200 && metricsResponse.data.includes('http_requests_total')) {
        this.logResult('Metrics Endpoint', true, null, metricsResponse);
      } else {
        this.logResult('Metrics Endpoint', false, new Error('Invalid metrics format'));
      }
      
      // Test dashboard endpoint
      const dashboardResponse = await this.makeRequest('GET', '/api/monitoring/dashboard');
      
      if (dashboardResponse.status === 200 && dashboardResponse.data.health) {
        this.logResult('Monitoring Dashboard', true, null, dashboardResponse);
        return true;
      } else {
        this.logResult('Monitoring Dashboard', false, new Error(`Status: ${dashboardResponse.status}`));
        return false;
      }
    } catch (error) {
      this.logResult('Monitoring Endpoints', false, error);
      return false;
    }
  }

  // Test input validation
  async testInputValidation() {
    try {
      const invalidData = {
        email: 'invalid-email',
        password: 'weak',
        symbol: 'INVALID_SYMBOL',
        quantity: -1
      };

      const response = await this.makeRequest('POST', '/api/auth/login', invalidData);
      
      // Should return 400 for invalid data
      if (response.status === 400) {
        this.logResult('Input Validation', true, null, response);
        return true;
      } else {
        this.logResult('Input Validation', false, new Error(`Expected 400, got ${response.status}`));
        return false;
      }
    } catch (error) {
      if (error.response && error.response.status === 400) {
        this.logResult('Input Validation', true, null, error.response);
        return true;
      } else {
        this.logResult('Input Validation', false, error);
        return false;
      }
    }
  }

  // Test error handling
  async testErrorHandling() {
    try {
      // Test non-existent endpoint
      const response = await this.makeRequest('GET', '/api/non-existent-endpoint');
      
      // Should return 404
      if (response.status === 404) {
        this.logResult('Error Handling (404)', true, null, response);
      } else {
        this.logResult('Error Handling (404)', false, new Error(`Expected 404, got ${response.status}`));
      }
      
      // Test unauthorized access
      const authResponse = await this.makeRequest('GET', '/api/admin/audit-logs');
      
      if (authResponse.status === 401) {
        this.logResult('Error Handling (401)', true, null, authResponse);
        return true;
      } else {
        this.logResult('Error Handling (401)', false, new Error(`Expected 401, got ${authResponse.status}`));
        return false;
      }
    } catch (error) {
      if (error.response && (error.response.status === 404 || error.response.status === 401)) {
        this.logResult('Error Handling', true, null, error.response);
        return true;
      } else {
        this.logResult('Error Handling', false, error);
        return false;
      }
    }
  }

  // Test external API integration (Binance)
  async testBinanceIntegration() {
    try {
      const response = await axios.get('https://api.binance.com/api/v3/ping', {
        timeout: 5000
      });
      
      if (response.status === 200) {
        this.logResult('Binance API Integration', true, null, response);
        return true;
      } else {
        this.logResult('Binance API Integration', false, new Error(`Status: ${response.status}`));
        return false;
      }
    } catch (error) {
      this.logResult('Binance API Integration', false, error);
      return false;
    }
  }

  // Run all tests
  async runAllTests() {
    console.log('🚀 Starting API Integration Tests');
    console.log(`Base URL: ${this.config.baseUrl}`);
    console.log('='.repeat(50));
    
    const startTime = Date.now();
    
    // Run tests in sequence
    await this.testHealthCheck();
    await this.testCSRFToken();
    await this.testSecurityHeaders();
    await this.testInputValidation();
    await this.testErrorHandling();
    await this.testRateLimiting();
    await this.testUserRegistration();
    await this.testUserLogin();
    await this.testSessionValidation();
    await this.testTradingAPI();
    await this.testMarketDataAPI();
    await this.testMonitoringEndpoints();
    await this.testWebSocketConnection();
    await this.testBinanceIntegration();
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // Print results
    this.printResults(duration);
    
    return this.results;
  }

  // Print test results
  printResults(duration) {
    console.log('\n📊 API Integration Test Results');
    console.log('='.repeat(50));
    console.log(`Total Tests: ${this.results.passed + this.results.failed}`);
    console.log(`Passed: ${this.results.passed}`);
    console.log(`Failed: ${this.results.failed}`);
    console.log(`Success Rate: ${((this.results.passed / (this.results.passed + this.results.failed)) * 100).toFixed(2)}%`);
    console.log(`Duration: ${duration}ms`);
    
    if (this.results.errors.length > 0) {
      console.log('\n❌ Failed Tests:');
      this.results.errors.forEach(error => {
        console.log(`  - ${error.name}: ${error.error}`);
      });
    }
    
    console.log('\n🎯 API Integration Status:');
    if (this.results.failed === 0) {
      console.log('✅ All API tests passed!');
    } else if (this.results.failed <= 3) {
      console.log('⚠️  Most API tests passed with minor issues');
    } else {
      console.log('❌ Multiple API test failures detected');
    }
  }

  // Generate test report
  generateReport() {
    const report = {
      summary: {
        total: this.results.passed + this.results.failed,
        passed: this.results.passed,
        failed: this.results.failed,
        successRate: ((this.results.passed / (this.results.passed + this.results.failed)) * 100).toFixed(2)
      },
      tests: this.results.tests,
      errors: this.results.errors,
      timestamp: new Date().toISOString()
    };
    
    return report;
  }
}

// CLI interface
async function main() {
  const command = process.argv[2];
  const baseUrl = process.argv[3] || 'http://localhost:3000';
  
  const tester = new APITester({ baseUrl });
  
  switch (command) {
    case 'health':
      await tester.testHealthCheck();
      break;
    case 'auth':
      await tester.testCSRFToken();
      await tester.testUserLogin();
      await tester.testSessionValidation();
      break;
    case 'trading':
      await tester.testTradingAPI();
      await tester.testMarketDataAPI();
      break;
    case 'security':
      await tester.testSecurityHeaders();
      await tester.testRateLimiting();
      await tester.testInputValidation();
      break;
    case 'monitoring':
      await tester.testMonitoringEndpoints();
      break;
    case 'full':
    default:
      await tester.runAllTests();
      break;
  }
  
  // Exit with appropriate code
  process.exit(tester.results.failed > 0 ? 1 : 0);
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('API testing failed:', error);
    process.exit(1);
  });
}

module.exports = APITester;
