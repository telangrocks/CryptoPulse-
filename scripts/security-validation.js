/**
 * Security Implementation Validation Framework
 * Comprehensive validation of all security implementations
 */

const axios = require('axios');
const crypto = require('crypto');

class SecurityValidator {
  constructor(config = {}) {
    this.config = {
      baseUrl: config.baseUrl || 'http://localhost:3000',
      timeout: config.timeout || 10000,
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
      status, // 'passed', 'failed', 'warning'
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

  // Test 1: Input Validation with Zod Schemas
  async testInputValidation() {
    console.log('\n🔒 Testing Input Validation...');
    
    try {
      // Test email validation
      const invalidEmails = [
        'invalid-email',
        '@domain.com',
        'user@',
        'user@domain'
      ];
      
      for (const email of invalidEmails) {
        const response = await axios.post(`${this.config.baseUrl}/api/auth/login`, {
          email,
          password: 'TestPassword123!'
        }).catch(error => error.response);
        
        if (response.status === 400) {
          this.logResult('Email Validation', 'passed', `Rejected invalid email: ${email}`);
        } else {
          this.logResult('Email Validation', 'failed', `Accepted invalid email: ${email}`);
        }
      }
      
      // Test password validation
      const weakPasswords = ['password', '12345678', 'Password', 'PASSWORD123'];
      
      for (const password of weakPasswords) {
        const response = await axios.post(`${this.config.baseUrl}/api/auth/login`, {
          email: 'test@example.com',
          password
        }).catch(error => error.response);
        
        if (response.status === 400) {
          this.logResult('Password Validation', 'passed', `Rejected weak password: ${password}`);
        } else {
          this.logResult('Password Validation', 'failed', `Accepted weak password: ${password}`);
        }
      }
      
    } catch (error) {
      this.logResult('Input Validation', 'failed', null, error);
    }
  }

  // Test 2: Rate Limiting
  async testRateLimiting() {
    console.log('\n🚦 Testing Rate Limiting...');
    
    try {
      const promises = [];
      
      // Send rapid requests to trigger rate limiting
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
        this.logResult('Rate Limiting', 'passed', 'Rate limiting triggered successfully');
      } else {
        this.logResult('Rate Limiting', 'failed', 'Rate limiting not triggered');
      }
      
      // Check rate limit headers
      const response = responses[0];
      if (response && response.headers['x-rate-limit-limit']) {
        this.logResult('Rate Limit Headers', 'passed', 'Rate limit headers present');
      } else {
        this.logResult('Rate Limit Headers', 'warning', 'Rate limit headers missing');
      }
      
    } catch (error) {
      this.logResult('Rate Limiting', 'failed', null, error);
    }
  }

  // Test 3: CSRF Protection
  async testCSRFProtection() {
    console.log('\n🛡️ Testing CSRF Protection...');
    
    try {
      // Test without CSRF token
      const response = await axios.post(`${this.config.baseUrl}/api/auth/login`, {
        email: 'test@example.com',
        password: 'TestPassword123!'
      }).catch(error => error.response);
      
      if (response.status === 403) {
        this.logResult('CSRF Protection (No Token)', 'passed', 'CSRF protection active');
      } else {
        this.logResult('CSRF Protection (No Token)', 'failed', 'CSRF protection not active');
      }
      
      // Test CSRF token endpoint
      const tokenResponse = await axios.get(`${this.config.baseUrl}/api/csrf-token`);
      
      if (tokenResponse.status === 200 && tokenResponse.data.csrfToken) {
        this.logResult('CSRF Token Generation', 'passed', 'CSRF token generated successfully');
        
        // Test with valid CSRF token
        const validResponse = await axios.post(`${this.config.baseUrl}/api/auth/login`, {
          email: 'test@example.com',
          password: 'TestPassword123!'
        }, {
          headers: {
            'X-CSRF-Token': tokenResponse.data.csrfToken
          }
        }).catch(error => error.response);
        
        if (validResponse.status !== 403) {
          this.logResult('CSRF Protection (Valid Token)', 'passed', 'Valid CSRF token accepted');
        } else {
          this.logResult('CSRF Protection (Valid Token)', 'failed', 'Valid CSRF token rejected');
        }
      } else {
        this.logResult('CSRF Token Generation', 'failed', 'CSRF token not generated');
      }
      
    } catch (error) {
      this.logResult('CSRF Protection', 'failed', null, error);
    }
  }

  // Test 4: Security Headers
  async testSecurityHeaders() {
    console.log('\n🔐 Testing Security Headers...');
    
    try {
      const response = await axios.get(`${this.config.baseUrl}/`);
      
      const requiredHeaders = {
        'x-frame-options': 'DENY',
        'x-content-type-options': 'nosniff',
        'x-xss-protection': '1; mode=block',
        'content-security-policy': null,
        'referrer-policy': 'strict-origin-when-cross-origin'
      };
      
      let headersPassed = 0;
      let totalHeaders = Object.keys(requiredHeaders).length;
      
      for (const [header, expectedValue] of Object.entries(requiredHeaders)) {
        const actualValue = response.headers[header] || response.headers[header.toLowerCase()];
        
        if (actualValue) {
          if (expectedValue === null || actualValue.includes(expectedValue)) {
            this.logResult(`Security Header: ${header}`, 'passed', `Value: ${actualValue}`);
            headersPassed++;
          } else {
            this.logResult(`Security Header: ${header}`, 'warning', `Expected: ${expectedValue}, Got: ${actualValue}`);
          }
        } else {
          this.logResult(`Security Header: ${header}`, 'failed', 'Header missing');
        }
      }
      
      if (headersPassed === totalHeaders) {
        this.logResult('Security Headers Overall', 'passed', 'All security headers present');
      } else if (headersPassed >= totalHeaders * 0.8) {
        this.logResult('Security Headers Overall', 'warning', `${headersPassed}/${totalHeaders} headers present`);
      } else {
        this.logResult('Security Headers Overall', 'failed', `Only ${headersPassed}/${totalHeaders} headers present`);
      }
      
    } catch (error) {
      this.logResult('Security Headers', 'failed', null, error);
    }
  }

  // Test 5: SQL Injection Prevention
  async testSQLInjectionPrevention() {
    console.log('\n💉 Testing SQL Injection Prevention...');
    
    try {
      const sqlInjectionAttempts = [
        "'; DROP TABLE users; --",
        "' OR '1'='1",
        "UNION SELECT * FROM users",
        "'; DELETE FROM accounts; --"
      ];
      
      for (const payload of sqlInjectionAttempts) {
        const response = await axios.post(`${this.config.baseUrl}/api/auth/login`, {
          email: payload,
          password: 'TestPassword123!'
        }).catch(error => error.response);
        
        if (response.status === 400) {
          this.logResult('SQL Injection Prevention', 'passed', `Blocked payload: ${payload.substring(0, 20)}...`);
        } else {
          this.logResult('SQL Injection Prevention', 'failed', `Accepted payload: ${payload.substring(0, 20)}...`);
        }
      }
      
    } catch (error) {
      this.logResult('SQL Injection Prevention', 'failed', null, error);
    }
  }

  // Test 6: XSS Prevention
  async testXSSPrevention() {
    console.log('\n🎯 Testing XSS Prevention...');
    
    try {
      const xssPayloads = [
        '<script>alert("xss")</script>',
        'javascript:alert("xss")',
        'onload=alert("xss")',
        '<img src=x onerror=alert("xss")>'
      ];
      
      for (const payload of xssPayloads) {
        const response = await axios.post(`${this.config.baseUrl}/api/auth/login`, {
          email: payload,
          password: 'TestPassword123!'
        }).catch(error => error.response);
        
        if (response.status === 400) {
          this.logResult('XSS Prevention', 'passed', `Blocked payload: ${payload.substring(0, 20)}...`);
        } else {
          this.logResult('XSS Prevention', 'failed', `Accepted payload: ${payload.substring(0, 20)}...`);
        }
      }
      
    } catch (error) {
      this.logResult('XSS Prevention', 'failed', null, error);
    }
  }

  // Test 7: Session Security
  async testSessionSecurity() {
    console.log('\n🔑 Testing Session Security...');
    
    try {
      // Test session creation
      const loginResponse = await axios.post(`${this.config.baseUrl}/api/auth/login`, {
        email: 'test@example.com',
        password: 'TestPassword123!'
      }).catch(error => error.response);
      
      if (loginResponse.status === 200 && loginResponse.data.session) {
        this.logResult('Session Creation', 'passed', 'Session created successfully');
        
        // Check session cookie security
        const setCookieHeader = loginResponse.headers['set-cookie'];
        if (setCookieHeader) {
          const cookieSecure = setCookieHeader.some(cookie => cookie.includes('Secure'));
          const cookieHttpOnly = setCookieHeader.some(cookie => cookie.includes('HttpOnly'));
          const cookieSameSite = setCookieHeader.some(cookie => cookie.includes('SameSite=Strict'));
          
          if (cookieHttpOnly) {
            this.logResult('Session Cookie HttpOnly', 'passed', 'HttpOnly flag present');
          } else {
            this.logResult('Session Cookie HttpOnly', 'warning', 'HttpOnly flag missing');
          }
          
          if (cookieSecure) {
            this.logResult('Session Cookie Secure', 'passed', 'Secure flag present');
          } else {
            this.logResult('Session Cookie Secure', 'warning', 'Secure flag missing');
          }
          
          if (cookieSameSite) {
            this.logResult('Session Cookie SameSite', 'passed', 'SameSite flag present');
          } else {
            this.logResult('Session Cookie SameSite', 'warning', 'SameSite flag missing');
          }
        } else {
          this.logResult('Session Cookies', 'warning', 'No session cookies found');
        }
      } else {
        this.logResult('Session Creation', 'failed', 'Session creation failed');
      }
      
    } catch (error) {
      this.logResult('Session Security', 'failed', null, error);
    }
  }

  // Run all security tests
  async runAllTests() {
    console.log('🔒 Starting Security Validation Tests');
    console.log(`Base URL: ${this.config.baseUrl}`);
    console.log('='.repeat(60));
    
    const startTime = Date.now();
    
    await this.testInputValidation();
    await this.testRateLimiting();
    await this.testCSRFProtection();
    await this.testSecurityHeaders();
    await this.testSQLInjectionPrevention();
    await this.testXSSPrevention();
    await this.testSessionSecurity();
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    this.printResults(duration);
    
    return this.results;
  }

  // Print results
  printResults(duration) {
    console.log('\n📊 Security Validation Results');
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
    
    console.log('\n🎯 Security Assessment:');
    const successRate = (this.results.passed / (this.results.passed + this.results.failed + this.results.warnings)) * 100;
    
    if (successRate >= 90) {
      console.log('✅ Security implementation is excellent');
    } else if (successRate >= 75) {
      console.log('⚠️  Security implementation is good with minor issues');
    } else {
      console.log('❌ Security implementation needs significant improvements');
    }
  }
}

// CLI interface
async function main() {
  const baseUrl = process.argv[2] || 'http://localhost:3000';
  const validator = new SecurityValidator({ baseUrl });
  
  await validator.runAllTests();
  
  // Exit with appropriate code
  process.exit(validator.results.failed > 0 ? 1 : 0);
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Security validation failed:', error);
    process.exit(1);
  });
}

module.exports = SecurityValidator;
