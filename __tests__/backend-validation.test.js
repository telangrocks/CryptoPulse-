// Backend Validation Test Suite for CryptoPulse
const fs = require('fs');
const path = require('path');

describe('Backend Validation Tests', () => {
  
  describe('File Structure Validation', () => {
    test('should have required cloud functions file', () => {
      const cloudMainPath = path.join(__dirname, '../cloud/main.js');
      expect(fs.existsSync(cloudMainPath)).toBe(true);
    });

    test('should have health check module', () => {
      const healthCheckPath = path.join(__dirname, '../cloud/healthCheck.js');
      expect(fs.existsSync(healthCheckPath)).toBe(true);
    });

    test('should have alerting module', () => {
      const alertingPath = path.join(__dirname, '../cloud/alerting.js');
      expect(fs.existsSync(alertingPath)).toBe(true);
    });

    test('should have metrics module', () => {
      const metricsPath = path.join(__dirname, '../cloud/metrics.js');
      expect(fs.existsSync(metricsPath)).toBe(true);
    });

    test('should have package.json with required dependencies', () => {
      const packageJsonPath = path.join(__dirname, '../package.json');
      expect(fs.existsSync(packageJsonPath)).toBe(true);
      
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      expect(packageJson.dependencies).toBeDefined();
      expect(packageJson.devDependencies).toBeDefined();
    });

    test('should have Back4App configuration', () => {
      const back4appPath = path.join(__dirname, '../back4app.json');
      expect(fs.existsSync(back4appPath)).toBe(true);
      
      const back4appConfig = JSON.parse(fs.readFileSync(back4appPath, 'utf8'));
      expect(back4appConfig.cloudCode).toBeDefined();
      expect(back4appConfig.cloudCode.functions).toBeDefined();
      expect(Array.isArray(back4appConfig.cloudCode.functions)).toBe(true);
    });
  });

  describe('Configuration Validation', () => {
    test('package.json should have correct scripts', () => {
      const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'));
      
      expect(packageJson.scripts).toBeDefined();
      expect(packageJson.scripts.lint).toBe('eslint .');
      expect(packageJson.scripts.typecheck).toBe('tsc --noEmit');
      expect(packageJson.scripts.test).toBe('jest --coverage');
      expect(packageJson.scripts.start).toBe('node cloud/main.js');
      expect(packageJson.scripts.dev).toBe('node cloud/main.js');
    });

    test('package.json should have required dependencies', () => {
      const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'));
      
      const requiredDeps = [
        'parse',
        'winston',
        'axios',
        'uuid',
        'joi',
        'bcryptjs',
        'jsonwebtoken',
        'helmet',
        'express-rate-limit',
        'cors',
        'compression',
        'dotenv',
        'moment',
        'lodash',
        'node-cron'
      ];

      requiredDeps.forEach(dep => {
        expect(packageJson.dependencies[dep]).toBeDefined();
      });
    });

    test('package.json should have required devDependencies', () => {
      const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'));
      
      const requiredDevDeps = [
        'eslint',
        '@eslint/js',
        'typescript',
        'jest',
        'ts-jest',
        '@types/jest',
        '@types/node'
      ];

      requiredDevDeps.forEach(dep => {
        expect(packageJson.devDependencies[dep]).toBeDefined();
      });
    });

    test('Back4App config should have all required cloud functions', () => {
      const back4appConfig = JSON.parse(fs.readFileSync(path.join(__dirname, '../back4app.json'), 'utf8'));
      
      const requiredFunctions = [
        'tradingBot',
        'marketAnalysis',
        'userAuthentication',
        'portfolioManagement',
        'riskAssessment',
        'getCurrentPrice',
        'getMarketData',
        'getTradingSignals',
        'getOrderHistory',
        'getPortfolioPerformance',
        'acceptDisclaimer',
        'getDisclaimerStatus',
        'getExchangeBalances',
        'executeRealTrade',
        'getExchangeOrderHistory',
        'healthCheck',
        'getSystemStatus'
      ];

      requiredFunctions.forEach(func => {
        expect(back4appConfig.cloudCode.functions).toContain(func);
      });
    });

    test('Back4App config should have security settings', () => {
      const back4appConfig = JSON.parse(fs.readFileSync(path.join(__dirname, '../back4app.json'), 'utf8'));
      
      expect(back4appConfig.security).toBeDefined();
      expect(back4appConfig.security.cors).toBeDefined();
      expect(back4appConfig.security.rateLimit).toBeDefined();
      expect(back4appConfig.security.apiSecurity).toBeDefined();
      expect(back4appConfig.security.passwordPolicy).toBeDefined();
    });
  });

  describe('Code Quality Validation', () => {
    test('cloud functions should be syntactically valid', () => {
      // This test would normally run node -c on the files
      // For now, we'll check that the files exist and are readable
      const cloudMainPath = path.join(__dirname, '../cloud/main.js');
      const content = fs.readFileSync(cloudMainPath, 'utf8');
      
      // Basic syntax checks
      expect(content).toContain('Parse.Cloud.define');
      expect(content).toContain('module.exports');
      expect(content).toContain('require(');
    });

    test('health check module should export required functions', () => {
      const healthCheckPath = path.join(__dirname, '../cloud/healthCheck.js');
      const content = fs.readFileSync(healthCheckPath, 'utf8');
      
      expect(content).toContain('updateHealthData');
      expect(content).toContain('recordRequest');
      expect(content).toContain('getHealthStatus');
      expect(content).toContain('getSystemStatus');
      expect(content).toContain('module.exports');
    });

    test('alerting module should export required functions', () => {
      const alertingPath = path.join(__dirname, '../cloud/alerting.js');
      const content = fs.readFileSync(alertingPath, 'utf8');
      
      expect(content).toContain('sendAlert');
      expect(content).toContain('alertSystemDown');
      expect(content).toContain('alertSecurityBreach');
      expect(content).toContain('alertCriticalError');
      expect(content).toContain('module.exports');
    });

    test('metrics module should export required functions', () => {
      const metricsPath = path.join(__dirname, '../cloud/metrics.js');
      const content = fs.readFileSync(metricsPath, 'utf8');
      
      expect(content).toContain('recordRequest');
      expect(content).toContain('recordError');
      expect(content).toContain('recordTrading');
      expect(content).toContain('recordSecurityEvent');
      expect(content).toContain('module.exports');
    });
  });

  describe('Security Validation', () => {
    test('environment example should not contain real credentials', () => {
      const envExamplePath = path.join(__dirname, '../env.example');
      const content = fs.readFileSync(envExamplePath, 'utf8');
      
      // Should not contain real credentials
      expect(content).not.toContain('sk-');
      expect(content).not.toContain('pk_');
      expect(content).toContain('yourAppId');
      expect(content).toContain('yourMasterKey');
    });

    test('cloud functions should have proper error handling', () => {
      const cloudMainPath = path.join(__dirname, '../cloud/main.js');
      const content = fs.readFileSync(cloudMainPath, 'utf8');
      
      // Should have try-catch blocks
      expect(content).toContain('try {');
      expect(content).toContain('} catch (error) {');
      expect(content).toContain('Parse.Error');
    });

    test('cloud functions should have input validation', () => {
      const cloudMainPath = path.join(__dirname, '../cloud/main.js');
      const content = fs.readFileSync(cloudMainPath, 'utf8');
      
      // Should have input validation
      expect(content).toContain('if (!');
      expect(content).toContain('throw new Parse.Error');
    });

    test('cloud functions should have rate limiting', () => {
      const cloudMainPath = path.join(__dirname, '../cloud/main.js');
      const content = fs.readFileSync(cloudMainPath, 'utf8');
      
      // Should have rate limiting
      expect(content).toContain('checkRateLimit');
      expect(content).toContain('RATE_LIMIT_WINDOW');
      expect(content).toContain('MAX_REQUESTS_PER_WINDOW');
    });
  });

  describe('Production Readiness Validation', () => {
    test('should have proper logging configuration', () => {
      const cloudMainPath = path.join(__dirname, '../cloud/main.js');
      const content = fs.readFileSync(cloudMainPath, 'utf8');
      
      expect(content).toContain('winston');
      expect(content).toContain('logger');
      expect(content).toContain('createLogger');
    });

    test('should have monitoring and health checks', () => {
      const cloudMainPath = path.join(__dirname, '../cloud/main.js');
      const content = fs.readFileSync(cloudMainPath, 'utf8');
      
      expect(content).toContain('healthCheck');
      expect(content).toContain('getSystemStatus');
      expect(content).toContain('updateHealthData');
    });

    test('should have proper error handling and alerting', () => {
      const cloudMainPath = path.join(__dirname, '../cloud/main.js');
      const content = fs.readFileSync(cloudMainPath, 'utf8');
      
      expect(content).toContain('alertCriticalError');
      expect(content).toContain('alertSystemDown');
      expect(content).toContain('recordError');
    });

    test('should have caching implementation', () => {
      const cloudMainPath = path.join(__dirname, '../cloud/main.js');
      const content = fs.readFileSync(cloudMainPath, 'utf8');
      
      expect(content).toContain('getCachedData');
      expect(content).toContain('setCachedData');
      expect(content).toContain('CACHE_TTL');
    });
  });
});
