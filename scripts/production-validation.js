/**
 * Production Validation Framework
 * Comprehensive validation for production readiness
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

class ProductionValidator {
  constructor(config = {}) {
    this.config = {
      baseUrl: config.baseUrl || 'http://localhost:3000',
      timeout: config.timeout || 30000,
      ...config
    };
    
    this.results = {
      passed: 0,
      failed: 0,
      warnings: 0,
      tests: []
    };
  }

  logResult(testName, status, details = null, error = null) {
    const result = {
      name: testName,
      status,
      details,
      error: error ? error.message : null,
      timestamp: new Date().toISOString()
    };
    
    this.results.tests.push(result);
    
    if (status === 'passed') {
      this.results.passed++;
      console.log(`✅ ${testName}`);
    } else if (status === 'warning') {
      this.results.warnings++;
      console.log(`⚠️  ${testName}: ${details || 'Warning'}`);
    } else {
      this.results.failed++;
      console.log(`❌ ${testName}: ${error ? error.message : 'Failed'}`);
    }
  }

  // Test 1: Environment Configuration
  async testEnvironmentConfiguration() {
    console.log('\n🔧 Testing Environment Configuration...');
    
    try {
      // Check required environment variables
      const requiredEnvVars = [
        'NODE_ENV',
        'PORT',
        'SESSION_SECRET',
        'ENCRYPTION_KEY'
      ];
      
      let envVarsPassed = 0;
      for (const envVar of requiredEnvVars) {
        if (process.env[envVar]) {
          this.logResult(`Environment Variable: ${envVar}`, 'passed', 'Present');
          envVarsPassed++;
        } else {
          this.logResult(`Environment Variable: ${envVar}`, 'warning', 'Missing');
        }
      }
      
      if (envVarsPassed === requiredEnvVars.length) {
        this.logResult('Environment Configuration', 'passed', 'All required variables present');
      } else {
        this.logResult('Environment Configuration', 'warning', `${envVarsPassed}/${requiredEnvVars.length} variables present`);
      }
      
    } catch (error) {
      this.logResult('Environment Configuration', 'failed', null, error);
    }
  }

  // Test 2: Database Connectivity
  async testDatabaseConnectivity() {
    console.log('\n🗄️ Testing Database Connectivity...');
    
    try {
      const response = await axios.get(`${this.config.baseUrl}/health`);
      
      if (response.status === 200 && response.data.services) {
        const dbStatus = response.data.services.database;
        if (dbStatus === 'healthy') {
          this.logResult('Database Connectivity', 'passed', 'Database connection healthy');
        } else {
          this.logResult('Database Connectivity', 'failed', `Database status: ${dbStatus}`);
        }
      } else {
        this.logResult('Database Connectivity', 'warning', 'Health check not available');
      }
      
    } catch (error) {
      this.logResult('Database Connectivity', 'failed', null, error);
    }
  }

  // Test 3: Redis Connectivity
  async testRedisConnectivity() {
    console.log('\n🔴 Testing Redis Connectivity...');
    
    try {
      const response = await axios.get(`${this.config.baseUrl}/health`);
      
      if (response.status === 200 && response.data.services) {
        const redisStatus = response.data.services.redis;
        if (redisStatus === 'healthy') {
          this.logResult('Redis Connectivity', 'passed', 'Redis connection healthy');
        } else {
          this.logResult('Redis Connectivity', 'failed', `Redis status: ${redisStatus}`);
        }
      } else {
        this.logResult('Redis Connectivity', 'warning', 'Health check not available');
      }
      
    } catch (error) {
      this.logResult('Redis Connectivity', 'failed', null, error);
    }
  }

  // Test 4: SSL/TLS Configuration
  async testSSLConfiguration() {
    console.log('\n🔒 Testing SSL/TLS Configuration...');
    
    try {
      const httpsUrl = this.config.baseUrl.replace('http://', 'https://');
      
      const response = await axios.get(httpsUrl, {
        timeout: 5000,
        validateStatus: () => true // Accept any status code
      });
      
      if (response.status === 200) {
        this.logResult('SSL/TLS Configuration', 'passed', 'HTTPS connection successful');
        
        // Check SSL headers
        if (response.headers['strict-transport-security']) {
          this.logResult('HSTS Header', 'passed', 'HSTS header present');
        } else {
          this.logResult('HSTS Header', 'warning', 'HSTS header missing');
        }
      } else {
        this.logResult('SSL/TLS Configuration', 'warning', 'HTTPS not available or configured');
      }
      
    } catch (error) {
      this.logResult('SSL/TLS Configuration', 'warning', 'HTTPS not available');
    }
  }

  // Test 5: Monitoring and Metrics
  async testMonitoringSystem() {
    console.log('\n📊 Testing Monitoring System...');
    
    try {
      // Test metrics endpoint
      const metricsResponse = await axios.get(`${this.config.baseUrl}/metrics`);
      
      if (metricsResponse.status === 200) {
        this.logResult('Prometheus Metrics', 'passed', 'Metrics endpoint accessible');
        
        // Check for key metrics
        const metrics = metricsResponse.data;
        const keyMetrics = [
          'http_requests_total',
          'auth_attempts_total',
          'trade_orders_total',
          'errors_total'
        ];
        
        let metricsFound = 0;
        for (const metric of keyMetrics) {
          if (metrics.includes(metric)) {
            metricsFound++;
          }
        }
        
        if (metricsFound === keyMetrics.length) {
          this.logResult('Key Metrics', 'passed', 'All key metrics present');
        } else {
          this.logResult('Key Metrics', 'warning', `${metricsFound}/${keyMetrics.length} metrics present`);
        }
      } else {
        this.logResult('Prometheus Metrics', 'failed', 'Metrics endpoint not accessible');
      }
      
      // Test monitoring dashboard
      const dashboardResponse = await axios.get(`${this.config.baseUrl}/api/monitoring/dashboard`);
      
      if (dashboardResponse.status === 200 && dashboardResponse.data.health) {
        this.logResult('Monitoring Dashboard', 'passed', 'Dashboard accessible');
      } else {
        this.logResult('Monitoring Dashboard', 'failed', 'Dashboard not accessible');
      }
      
    } catch (error) {
      this.logResult('Monitoring System', 'failed', null, error);
    }
  }

  // Test 6: Backup System
  async testBackupSystem() {
    console.log('\n💾 Testing Backup System...');
    
    try {
      // Check if backup scripts exist
      const backupScripts = [
        'scripts/backup.sh',
        'scripts/backup.ps1'
      ];
      
      let scriptsFound = 0;
      for (const script of backupScripts) {
        if (fs.existsSync(script)) {
          this.logResult(`Backup Script: ${script}`, 'passed', 'Script exists');
          scriptsFound++;
        } else {
          this.logResult(`Backup Script: ${script}`, 'warning', 'Script not found');
        }
      }
      
      if (scriptsFound > 0) {
        this.logResult('Backup System', 'passed', `${scriptsFound} backup scripts found`);
      } else {
        this.logResult('Backup System', 'failed', 'No backup scripts found');
      }
      
    } catch (error) {
      this.logResult('Backup System', 'failed', null, error);
    }
  }

  // Test 7: Database Migration System
  async testMigrationSystem() {
    console.log('\n🔄 Testing Database Migration System...');
    
    try {
      // Check if migration system exists
      const migrationFiles = [
        'scripts/db-migrate.js',
        'migrations'
      ];
      
      let migrationComponents = 0;
      for (const component of migrationFiles) {
        if (fs.existsSync(component)) {
          this.logResult(`Migration Component: ${component}`, 'passed', 'Component exists');
          migrationComponents++;
        } else {
          this.logResult(`Migration Component: ${component}`, 'warning', 'Component not found');
        }
      }
      
      if (migrationComponents === migrationFiles.length) {
        this.logResult('Migration System', 'passed', 'All migration components present');
      } else {
        this.logResult('Migration System', 'warning', `${migrationComponents}/${migrationFiles.length} components present`);
      }
      
    } catch (error) {
      this.logResult('Migration System', 'failed', null, error);
    }
  }

  // Test 8: Error Handling
  async testErrorHandling() {
    console.log('\n🚨 Testing Error Handling...');
    
    try {
      // Test 404 error handling
      const notFoundResponse = await axios.get(`${this.config.baseUrl}/api/non-existent-endpoint`, {
        validateStatus: () => true
      });
      
      if (notFoundResponse.status === 404) {
        this.logResult('404 Error Handling', 'passed', 'Proper 404 response');
      } else {
        this.logResult('404 Error Handling', 'failed', `Expected 404, got ${notFoundResponse.status}`);
      }
      
      // Test 500 error handling (if possible to trigger)
      const serverErrorResponse = await axios.post(`${this.config.baseUrl}/api/auth/login`, {
        email: 'test@example.com',
        password: 'TestPassword123!'
      }).catch(error => error.response);
      
      if (serverErrorResponse && serverErrorResponse.status >= 400 && serverErrorResponse.status < 500) {
        this.logResult('Client Error Handling', 'passed', 'Proper client error response');
      } else {
        this.logResult('Client Error Handling', 'warning', 'Error handling not fully tested');
      }
      
    } catch (error) {
      this.logResult('Error Handling', 'failed', null, error);
    }
  }

  // Test 9: Performance Validation
  async testPerformance() {
    console.log('\n⚡ Testing Performance...');
    
    try {
      const startTime = Date.now();
      
      // Test health endpoint response time
      const response = await axios.get(`${this.config.baseUrl}/health`);
      
      const responseTime = Date.now() - startTime;
      
      if (responseTime < 1000) {
        this.logResult('Response Time', 'passed', `${responseTime}ms`);
      } else if (responseTime < 3000) {
        this.logResult('Response Time', 'warning', `${responseTime}ms (slow)`);
      } else {
        this.logResult('Response Time', 'failed', `${responseTime}ms (too slow)`);
      }
      
      // Test concurrent requests
      const concurrentRequests = 10;
      const concurrentStartTime = Date.now();
      
      const promises = [];
      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(axios.get(`${this.config.baseUrl}/health`));
      }
      
      await Promise.all(promises);
      
      const concurrentResponseTime = Date.now() - concurrentStartTime;
      
      if (concurrentResponseTime < 2000) {
        this.logResult('Concurrent Requests', 'passed', `${concurrentRequests} requests in ${concurrentResponseTime}ms`);
      } else {
        this.logResult('Concurrent Requests', 'warning', `${concurrentRequests} requests in ${concurrentResponseTime}ms (slow)`);
      }
      
    } catch (error) {
      this.logResult('Performance', 'failed', null, error);
    }
  }

  // Test 10: Security Validation
  async testSecurityValidation() {
    console.log('\n🔐 Testing Security Validation...');
    
    try {
      // Test security headers
      const response = await axios.get(`${this.config.baseUrl}/`);
      
      const securityHeaders = [
        'x-frame-options',
        'x-content-type-options',
        'x-xss-protection',
        'content-security-policy'
      ];
      
      let securityHeadersPresent = 0;
      for (const header of securityHeaders) {
        if (response.headers[header] || response.headers[header.toLowerCase()]) {
          securityHeadersPresent++;
        }
      }
      
      if (securityHeadersPresent === securityHeaders.length) {
        this.logResult('Security Headers', 'passed', 'All security headers present');
      } else {
        this.logResult('Security Headers', 'warning', `${securityHeadersPresent}/${securityHeaders.length} headers present`);
      }
      
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
        this.logResult('Rate Limiting', 'passed', 'Rate limiting active');
      } else {
        this.logResult('Rate Limiting', 'warning', 'Rate limiting not detected');
      }
      
    } catch (error) {
      this.logResult('Security Validation', 'failed', null, error);
    }
  }

  // Run all production validation tests
  async runAllTests() {
    console.log('🚀 Starting Production Validation Tests');
    console.log(`Base URL: ${this.config.baseUrl}`);
    console.log('='.repeat(60));
    
    const startTime = Date.now();
    
    await this.testEnvironmentConfiguration();
    await this.testDatabaseConnectivity();
    await this.testRedisConnectivity();
    await this.testSSLConfiguration();
    await this.testMonitoringSystem();
    await this.testBackupSystem();
    await this.testMigrationSystem();
    await this.testErrorHandling();
    await this.testPerformance();
    await this.testSecurityValidation();
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    this.printResults(duration);
    
    return this.results;
  }

  // Print results
  printResults(duration) {
    console.log('\n📊 Production Validation Results');
    console.log('='.repeat(60));
    console.log(`Total Tests: ${this.results.passed + this.results.failed + this.results.warnings}`);
    console.log(`Passed: ${this.results.passed}`);
    console.log(`Failed: ${this.results.failed}`);
    console.log(`Warnings: ${this.results.warnings}`);
    console.log(`Success Rate: ${((this.results.passed / (this.results.passed + this.results.failed + this.results.warnings)) * 100).toFixed(2)}%`);
    console.log(`Duration: ${duration}ms`);
    
    if (this.results.failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.results.tests.filter(t => t.status === 'failed').forEach(test => {
        console.log(`  - ${test.name}: ${test.error || 'Failed'}`);
      });
    }
    
    if (this.results.warnings > 0) {
      console.log('\n⚠️  Warnings:');
      this.results.tests.filter(t => t.status === 'warning').forEach(test => {
        console.log(`  - ${test.name}: ${test.details || 'Warning'}`);
      });
    }
    
    console.log('\n🎯 Production Readiness Assessment:');
    const successRate = (this.results.passed / (this.results.passed + this.results.failed + this.results.warnings)) * 100;
    
    if (successRate >= 90) {
      console.log('✅ Production ready with excellent configuration');
    } else if (successRate >= 75) {
      console.log('⚠️  Production ready with minor configuration issues');
    } else if (successRate >= 60) {
      console.log('⚠️  Near production ready, address configuration issues');
    } else {
      console.log('❌ Not production ready, significant issues need resolution');
    }
  }
}

// CLI interface
async function main() {
  const baseUrl = process.argv[2] || 'http://localhost:3000';
  const validator = new ProductionValidator({ baseUrl });
  
  await validator.runAllTests();
  
  // Exit with appropriate code
  process.exit(validator.results.failed > 0 ? 1 : 0);
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Production validation failed:', error);
    process.exit(1);
  });
}

module.exports = ProductionValidator;
