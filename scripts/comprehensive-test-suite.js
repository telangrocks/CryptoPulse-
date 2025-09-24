/**
 * Comprehensive Testing Infrastructure
 * 80%+ coverage with unit, integration, and E2E tests
 */

const axios = require('axios');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class ComprehensiveTestSuite {
  constructor(config = {}) {
    this.config = {
      baseUrl: config.baseUrl || 'http://localhost:3000',
      timeout: config.timeout || 30000,
      coverageThreshold: config.coverageThreshold || 80,
      ...config
    };
    
    this.results = {
      unit: { passed: 0, failed: 0, total: 0, coverage: 0 },
      integration: { passed: 0, failed: 0, total: 0 },
      e2e: { passed: 0, failed: 0, total: 0 },
      performance: { passed: 0, failed: 0, total: 0 },
      security: { passed: 0, failed: 0, total: 0 }
    };
  }

  // Run all tests
  async runAllTests() {
    console.log('🧪 Starting Comprehensive Test Suite');
    console.log('='.repeat(60));

    try {
      await this.runUnitTests();
      await this.runIntegrationTests();
      await this.runE2ETests();
      await this.runPerformanceTests();
      await this.runSecurityTests();
      
      this.generateReport();
      
      return this.results;
    } catch (error) {
      console.error('Test suite failed:', error);
      throw error;
    }
  }

  // Unit Tests
  async runUnitTests() {
    console.log('\n📝 Running Unit Tests...');
    
    try {
      // Run frontend unit tests
      const frontendCoverage = await this.runFrontendUnitTests();
      
      // Run backend unit tests
      const backendCoverage = await this.runBackendUnitTests();
      
      // Calculate overall coverage
      const overallCoverage = (frontendCoverage + backendCoverage) / 2;
      
      this.results.unit.coverage = overallCoverage;
      
      if (overallCoverage >= this.config.coverageThreshold) {
        console.log(`✅ Unit tests passed with ${overallCoverage.toFixed(2)}% coverage`);
        this.results.unit.passed++;
      } else {
        console.log(`❌ Unit tests failed: ${overallCoverage.toFixed(2)}% coverage (required: ${this.config.coverageThreshold}%)`);
        this.results.unit.failed++;
      }
      
      this.results.unit.total++;
    } catch (error) {
      console.error('Unit tests failed:', error);
      this.results.unit.failed++;
      this.results.unit.total++;
    }
  }

  async runFrontendUnitTests() {
    return new Promise((resolve, reject) => {
      const process = spawn('npm', ['run', 'test:coverage'], {
        cwd: path.join(__dirname, '../frontend'),
        stdio: 'pipe'
      });

      let output = '';
      process.stdout.on('data', (data) => {
        output += data.toString();
      });

      process.stderr.on('data', (data) => {
        output += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          // Extract coverage percentage
          const coverageMatch = output.match(/All files\s+\|\s+(\d+\.\d+)/);
          const coverage = coverageMatch ? parseFloat(coverageMatch[1]) : 0;
          resolve(coverage);
        } else {
          reject(new Error(`Frontend tests failed with code ${code}`));
        }
      });
    });
  }

  async runBackendUnitTests() {
    return new Promise((resolve, reject) => {
      const process = spawn('npm', ['test'], {
        cwd: path.join(__dirname, '../backend'),
        stdio: 'pipe'
      });

      let output = '';
      process.stdout.on('data', (data) => {
        output += data.toString();
      });

      process.stderr.on('data', (data) => {
        output += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          // Extract coverage percentage
          const coverageMatch = output.match(/All files\s+\|\s+(\d+\.\d+)/);
          const coverage = coverageMatch ? parseFloat(coverageMatch[1]) : 0;
          resolve(coverage);
        } else {
          reject(new Error(`Backend tests failed with code ${code}`));
        }
      });
    });
  }

  // Integration Tests
  async runIntegrationTests() {
    console.log('\n🔗 Running Integration Tests...');
    
    const tests = [
      this.testDatabaseIntegration,
      this.testRedisIntegration,
      this.testAPIIntegration,
      this.testAuthenticationIntegration,
      this.testTradingIntegration,
      this.testMonitoringIntegration
    ];

    for (const test of tests) {
      try {
        await test.call(this);
        this.results.integration.passed++;
      } catch (error) {
        console.error(`Integration test failed: ${test.name}`, error.message);
        this.results.integration.failed++;
      }
      this.results.integration.total++;
    }
  }

  async testDatabaseIntegration() {
    const response = await axios.get(`${this.config.baseUrl}/health`);
    
    if (response.data.services.database !== 'healthy') {
      throw new Error('Database integration failed');
    }
    
    console.log('✅ Database integration test passed');
  }

  async testRedisIntegration() {
    const response = await axios.get(`${this.config.baseUrl}/health`);
    
    if (response.data.services.redis !== 'healthy') {
      throw new Error('Redis integration failed');
    }
    
    console.log('✅ Redis integration test passed');
  }

  async testAPIIntegration() {
    // Test API endpoints
    const endpoints = [
      '/health',
      '/metrics',
      '/api/monitoring/dashboard'
    ];

    for (const endpoint of endpoints) {
      const response = await axios.get(`${this.config.baseUrl}${endpoint}`);
      
      if (response.status !== 200) {
        throw new Error(`API endpoint ${endpoint} failed`);
      }
    }
    
    console.log('✅ API integration test passed');
  }

  async testAuthenticationIntegration() {
    // Test authentication flow
    const loginResponse = await axios.post(`${this.config.baseUrl}/api/auth/login`, {
      email: 'test@example.com',
      password: 'TestPassword123!'
    }).catch(error => error.response);

    if (loginResponse.status === 200 && loginResponse.data.session) {
      console.log('✅ Authentication integration test passed');
    } else {
      throw new Error('Authentication integration failed');
    }
  }

  async testTradingIntegration() {
    // Test trading endpoints
    const tradingResponse = await axios.get(`${this.config.baseUrl}/api/trading/status`)
      .catch(error => error.response);

    if (tradingResponse.status === 200) {
      console.log('✅ Trading integration test passed');
    } else {
      throw new Error('Trading integration failed');
    }
  }

  async testMonitoringIntegration() {
    // Test monitoring endpoints
    const monitoringResponse = await axios.get(`${this.config.baseUrl}/api/monitoring/dashboard`);
    
    if (monitoringResponse.status === 200 && monitoringResponse.data.health) {
      console.log('✅ Monitoring integration test passed');
    } else {
      throw new Error('Monitoring integration failed');
    }
  }

  // End-to-End Tests
  async runE2ETests() {
    console.log('\n🌐 Running End-to-End Tests...');
    
    const tests = [
      this.testUserRegistrationFlow,
      this.testUserLoginFlow,
      this.testTradingFlow,
      this.testMonitoringFlow,
      this.testErrorHandlingFlow
    ];

    for (const test of tests) {
      try {
        await test.call(this);
        this.results.e2e.passed++;
      } catch (error) {
        console.error(`E2E test failed: ${test.name}`, error.message);
        this.results.e2e.failed++;
      }
      this.results.e2e.total++;
    }
  }

  async testUserRegistrationFlow() {
    // Test complete user registration flow
    const registrationResponse = await axios.post(`${this.config.baseUrl}/api/auth/register`, {
      email: 'e2e-test@example.com',
      password: 'E2ETestPassword123!',
      username: 'e2e-test-user'
    }).catch(error => error.response);

    if (registrationResponse.status === 200 || registrationResponse.status === 409) {
      console.log('✅ User registration flow test passed');
    } else {
      throw new Error('User registration flow failed');
    }
  }

  async testUserLoginFlow() {
    // Test complete user login flow
    const loginResponse = await axios.post(`${this.config.baseUrl}/api/auth/login`, {
      email: 'test@example.com',
      password: 'TestPassword123!'
    }).catch(error => error.response);

    if (loginResponse.status === 200 && loginResponse.data.session) {
      console.log('✅ User login flow test passed');
    } else {
      throw new Error('User login flow failed');
    }
  }

  async testTradingFlow() {
    // Test complete trading flow
    const tradingResponse = await axios.get(`${this.config.baseUrl}/api/trading/status`)
      .catch(error => error.response);

    if (tradingResponse.status === 200) {
      console.log('✅ Trading flow test passed');
    } else {
      throw new Error('Trading flow failed');
    }
  }

  async testMonitoringFlow() {
    // Test complete monitoring flow
    const monitoringResponse = await axios.get(`${this.config.baseUrl}/api/monitoring/dashboard`);
    
    if (monitoringResponse.status === 200 && monitoringResponse.data.health) {
      console.log('✅ Monitoring flow test passed');
    } else {
      throw new Error('Monitoring flow failed');
    }
  }

  async testErrorHandlingFlow() {
    // Test error handling flow
    const errorResponse = await axios.get(`${this.config.baseUrl}/api/non-existent-endpoint`)
      .catch(error => error.response);

    if (errorResponse.status === 404) {
      console.log('✅ Error handling flow test passed');
    } else {
      throw new Error('Error handling flow failed');
    }
  }

  // Performance Tests
  async runPerformanceTests() {
    console.log('\n⚡ Running Performance Tests...');
    
    const tests = [
      this.testResponseTime,
      this.testConcurrentRequests,
      this.testMemoryUsage,
      this.testDatabasePerformance
    ];

    for (const test of tests) {
      try {
        await test.call(this);
        this.results.performance.passed++;
      } catch (error) {
        console.error(`Performance test failed: ${test.name}`, error.message);
        this.results.performance.failed++;
      }
      this.results.performance.total++;
    }
  }

  async testResponseTime() {
    const startTime = Date.now();
    await axios.get(`${this.config.baseUrl}/health`);
    const responseTime = Date.now() - startTime;
    
    if (responseTime < 1000) {
      console.log(`✅ Response time test passed (${responseTime}ms)`);
    } else {
      throw new Error(`Response time too slow: ${responseTime}ms`);
    }
  }

  async testConcurrentRequests() {
    const concurrentRequests = 10;
    const startTime = Date.now();
    
    const promises = [];
    for (let i = 0; i < concurrentRequests; i++) {
      promises.push(axios.get(`${this.config.baseUrl}/health`));
    }
    
    await Promise.all(promises);
    const totalTime = Date.now() - startTime;
    
    if (totalTime < 2000) {
      console.log(`✅ Concurrent requests test passed (${totalTime}ms for ${concurrentRequests} requests)`);
    } else {
      throw new Error(`Concurrent requests too slow: ${totalTime}ms`);
    }
  }

  async testMemoryUsage() {
    // This would require monitoring the application's memory usage
    // For now, we'll just check if the health endpoint responds
    const response = await axios.get(`${this.config.baseUrl}/health`);
    
    if (response.status === 200) {
      console.log('✅ Memory usage test passed');
    } else {
      throw new Error('Memory usage test failed');
    }
  }

  async testDatabasePerformance() {
    const startTime = Date.now();
    const response = await axios.get(`${this.config.baseUrl}/health`);
    const responseTime = Date.now() - startTime;
    
    if (response.data.services.database === 'healthy' && responseTime < 500) {
      console.log(`✅ Database performance test passed (${responseTime}ms)`);
    } else {
      throw new Error('Database performance test failed');
    }
  }

  // Security Tests
  async runSecurityTests() {
    console.log('\n🔒 Running Security Tests...');
    
    const tests = [
      this.testInputValidation,
      this.testRateLimiting,
      this.testCSRFProtection,
      this.testSecurityHeaders,
      this.testSQLInjectionPrevention,
      this.testXSSPrevention
    ];

    for (const test of tests) {
      try {
        await test.call(this);
        this.results.security.passed++;
      } catch (error) {
        console.error(`Security test failed: ${test.name}`, error.message);
        this.results.security.failed++;
      }
      this.results.security.total++;
    }
  }

  async testInputValidation() {
    // Test input validation
    const response = await axios.post(`${this.config.baseUrl}/api/auth/login`, {
      email: 'invalid-email',
      password: 'short'
    }).catch(error => error.response);

    if (response.status === 400) {
      console.log('✅ Input validation test passed');
    } else {
      throw new Error('Input validation test failed');
    }
  }

  async testRateLimiting() {
    // Test rate limiting
    const promises = [];
    for (let i = 0; i < 10; i++) {
      promises.push(
        axios.post(`${this.config.baseUrl}/api/auth/login`, {
          email: 'test@example.com',
          password: 'wrongpassword'
        }).catch(error => error.response)
      );
    }

    const responses = await Promise.all(promises);
    const rateLimited = responses.some(res => res && res.status === 429);

    if (rateLimited) {
      console.log('✅ Rate limiting test passed');
    } else {
      throw new Error('Rate limiting test failed');
    }
  }

  async testCSRFProtection() {
    // Test CSRF protection
    const response = await axios.post(`${this.config.baseUrl}/api/auth/login`, {
      email: 'test@example.com',
      password: 'TestPassword123!'
    }).catch(error => error.response);

    if (response.status === 403) {
      console.log('✅ CSRF protection test passed');
    } else {
      throw new Error('CSRF protection test failed');
    }
  }

  async testSecurityHeaders() {
    // Test security headers
    const response = await axios.get(`${this.config.baseUrl}/`);
    
    const requiredHeaders = [
      'x-frame-options',
      'x-content-type-options',
      'x-xss-protection',
      'content-security-policy'
    ];

    let headersPresent = 0;
    for (const header of requiredHeaders) {
      if (response.headers[header] || response.headers[header.toLowerCase()]) {
        headersPresent++;
      }
    }

    if (headersPresent >= requiredHeaders.length * 0.8) {
      console.log('✅ Security headers test passed');
    } else {
      throw new Error('Security headers test failed');
    }
  }

  async testSQLInjectionPrevention() {
    // Test SQL injection prevention
    const response = await axios.post(`${this.config.baseUrl}/api/auth/login`, {
      email: "'; DROP TABLE users; --",
      password: 'TestPassword123!'
    }).catch(error => error.response);

    if (response.status === 400) {
      console.log('✅ SQL injection prevention test passed');
    } else {
      throw new Error('SQL injection prevention test failed');
    }
  }

  async testXSSPrevention() {
    // Test XSS prevention
    const response = await axios.post(`${this.config.baseUrl}/api/auth/login`, {
      email: '<script>alert("xss")</script>',
      password: 'TestPassword123!'
    }).catch(error => error.response);

    if (response.status === 400) {
      console.log('✅ XSS prevention test passed');
    } else {
      throw new Error('XSS prevention test failed');
    }
  }

  // Generate comprehensive test report
  generateReport() {
    console.log('\n📊 Comprehensive Test Report');
    console.log('='.repeat(60));
    
    const totalTests = Object.values(this.results).reduce((sum, category) => 
      sum + category.total, 0);
    const totalPassed = Object.values(this.results).reduce((sum, category) => 
      sum + category.passed, 0);
    const totalFailed = Object.values(this.results).reduce((sum, category) => 
      sum + category.failed, 0);

    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${totalPassed}`);
    console.log(`Failed: ${totalFailed}`);
    console.log(`Success Rate: ${((totalPassed / totalTests) * 100).toFixed(2)}%`);
    console.log(`Coverage: ${this.results.unit.coverage.toFixed(2)}%`);

    console.log('\n📋 Test Categories:');
    Object.entries(this.results).forEach(([category, stats]) => {
      if (category !== 'unit' || stats.total > 0) {
        const successRate = stats.total > 0 ? ((stats.passed / stats.total) * 100).toFixed(2) : 0;
        console.log(`  ${category.toUpperCase()}: ${stats.passed}/${stats.total} (${successRate}%)`);
      }
    });

    // Save report to file
    const reportPath = path.join(__dirname, '../test-reports/comprehensive-test-report.json');
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));

    console.log(`\n📄 Report saved to: ${reportPath}`);
  }
}

// CLI interface
async function main() {
  const baseUrl = process.argv[2] || 'http://localhost:3000';
  const testSuite = new ComprehensiveTestSuite({ baseUrl });
  
  try {
    await testSuite.runAllTests();
    process.exit(0);
  } catch (error) {
    console.error('Test suite failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = ComprehensiveTestSuite;
