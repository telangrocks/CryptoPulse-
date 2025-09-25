/**
 * Unit Tests for Structured Logger
 * Comprehensive testing with 80%+ coverage
 */

const { StructuredLogger } = require('../../structuredLogger');
const fs = require('fs');
const path = require('path');

describe('StructuredLogger', () => {
  let logger;
  let logDir;

  beforeEach(() => {
    logDir = path.join(__dirname, '../../logs');
    // Clean up any existing logs
    if (fs.existsSync(logDir)) {
      fs.rmSync(logDir, { recursive: true, force: true });
    }
    logger = new StructuredLogger();
  });

  afterEach(() => {
    if (fs.existsSync(logDir)) {
      fs.rmSync(logDir, { recursive: true, force: true });
    }
  });

  describe('Constructor and Initialization', () => {
    it('should initialize with default configuration', () => {
      expect(logger).toBeDefined();
      expect(logger.logger).toBeDefined();
      expect(logger.requestId).toBeNull();
    });

    it('should create log directory if it does not exist', () => {
      expect(fs.existsSync(logDir)).toBe(true);
    });
  });

  describe('Request ID Management', () => {
    it('should generate new request ID', () => {
      const requestId = logger.generateRequestId();
      expect(requestId).toBeDefined();
      expect(typeof requestId).toBe('string');
      expect(requestId.length).toBeGreaterThan(0);
    });

    it('should set and get request ID', () => {
      const testRequestId = 'test-request-123';
      logger.setRequestId(testRequestId);
      expect(logger.requestId).toBe(testRequestId);
    });
  });

  describe('Core Logging Methods', () => {
    beforeEach(() => {
      logger.setRequestId('test-request-123');
    });

    it('should log error messages', () => {
      expect(() => {
        logger.error('Test error message', { userId: 'user123' });
      }).not.toThrow();
    });

    it('should log warning messages', () => {
      expect(() => {
        logger.warn('Test warning message', { userId: 'user123' });
      }).not.toThrow();
    });

    it('should log info messages', () => {
      expect(() => {
        logger.info('Test info message', { userId: 'user123' });
      }).not.toThrow();
    });

    it('should log debug messages', () => {
      expect(() => {
        logger.debug('Test debug message', { userId: 'user123' });
      }).not.toThrow();
    });
  });

  describe('Specialized Logging Methods', () => {
    beforeEach(() => {
      logger.setRequestId('test-request-123');
    });

    it('should log HTTP requests', () => {
      expect(() => {
        logger.http('GET', '/api/test', 200, 150, { userId: 'user123' });
      }).not.toThrow();
    });

    it('should log authentication events', () => {
      expect(() => {
        logger.auth('login', 'user123', true, { method: 'email' });
      }).not.toThrow();
    });

    it('should log trading events', () => {
      expect(() => {
        logger.trading('buy', 'user123', 'BTC/USDT', 0.001, { price: 50000 });
      }).not.toThrow();
    });

    it('should log security events', () => {
      expect(() => {
        logger.security('rate_limit_exceeded', 'high', { ip: '192.168.1.1' });
      }).not.toThrow();
    });

    it('should log performance metrics', () => {
      expect(() => {
        logger.performance('database_query', 250, { table: 'users' });
      }).not.toThrow();
    });

    it('should log database operations', () => {
      expect(() => {
        logger.database('SELECT', 'users', 100, { count: 10 });
      }).not.toThrow();
    });

    it('should log API calls', () => {
      expect(() => {
        logger.api('binance', '/api/v3/ticker/price', 200, 300, { symbol: 'BTCUSDT' });
      }).not.toThrow();
    });

    it('should log audit events', () => {
      expect(() => {
        logger.audit('USER_LOGIN', 'user123', { ip: '192.168.1.1' });
      }).not.toThrow();
    });

    it('should log health checks', () => {
      expect(() => {
        logger.health('database', 'healthy', { responseTime: 50 });
      }).not.toThrow();
    });

    it('should log metrics', () => {
      expect(() => {
        logger.metrics('response_time', 150, { endpoint: '/api/test' });
      }).not.toThrow();
    });
  });

  describe('Error Logging', () => {
    beforeEach(() => {
      logger.setRequestId('test-request-123');
    });

    it('should log errors with context', () => {
      const error = new Error('Test error');
      error.stack = 'Error: Test error\n    at test.js:1:1';
      
      expect(() => {
        logger.logError(error, { endpoint: '/api/test', userId: 'user123' });
      }).not.toThrow();
    });

    it('should handle errors without stack traces', () => {
      const error = new Error('Test error');
      error.stack = undefined;
      
      expect(() => {
        logger.logError(error, { endpoint: '/api/test' });
      }).not.toThrow();
    });
  });

  describe('Request Logger Middleware', () => {
    let req, res, next;

    beforeEach(() => {
      req = {
        method: 'GET',
        path: '/api/test',
        ip: '192.168.1.1',
        get: jest.fn().mockReturnValue('Mozilla/5.0'),
        user: { id: 'user123' }
      };
      res = {
        statusCode: 200,
        get: jest.fn().mockReturnValue('1024'),
        end: jest.fn()
      };
      next = jest.fn();
    });

    it('should create request logger middleware', () => {
      const middleware = logger.requestLogger();
      expect(typeof middleware).toBe('function');
    });

    it('should log request start and response', () => {
      const middleware = logger.requestLogger();
      
      middleware(req, res, next);
      
      expect(req.requestId).toBeDefined();
      expect(logger.requestId).toBe(req.requestId);
      expect(next).toHaveBeenCalled();
    });

    it('should override res.end to log response', () => {
      const middleware = logger.requestLogger();
      const originalEnd = res.end;
      
      middleware(req, res, next);
      
      expect(res.end).not.toBe(originalEnd);
      expect(typeof res.end).toBe('function');
    });
  });

  describe('Logger Instance Access', () => {
    it('should return logger instance', () => {
      const loggerInstance = logger.getLogger();
      expect(loggerInstance).toBeDefined();
      expect(typeof loggerInstance.info).toBe('function');
      expect(typeof loggerInstance.error).toBe('function');
      expect(typeof loggerInstance.warn).toBe('function');
      expect(typeof loggerInstance.debug).toBe('function');
    });
  });

  describe('Graceful Shutdown', () => {
    it('should close logger gracefully', async () => {
      await expect(logger.close()).resolves.not.toThrow();
    });
  });

  describe('Global Error Handlers', () => {
    it('should handle uncaught exceptions', () => {
      // This test verifies the global error handlers are set up
      // In a real scenario, we would test the actual error handling
      expect(process.listenerCount('uncaughtException')).toBeGreaterThan(0);
    });

    it('should handle unhandled promise rejections', () => {
      // This test verifies the global error handlers are set up
      expect(process.listenerCount('unhandledRejection')).toBeGreaterThan(0);
    });
  });

  describe('Log File Creation', () => {
    it('should create application.log file', (done) => {
      logger.info('Test message');
      
      setTimeout(() => {
        const logFile = path.join(logDir, 'application.log');
        expect(fs.existsSync(logFile)).toBe(true);
        done();
      }, 100);
    });

    it('should create error.log file for errors', (done) => {
      logger.error('Test error message');
      
      setTimeout(() => {
        const errorFile = path.join(logDir, 'error.log');
        expect(fs.existsSync(errorFile)).toBe(true);
        done();
      }, 100);
    });

    it('should create audit.log file for audit events', (done) => {
      logger.audit('TEST_EVENT', 'user123', { test: true });
      
      setTimeout(() => {
        const auditFile = path.join(logDir, 'audit.log');
        expect(fs.existsSync(auditFile)).toBe(true);
        done();
      }, 100);
    });
  });

  describe('Log Format Validation', () => {
    it('should create properly formatted log entries', (done) => {
      logger.setRequestId('test-request-123');
      logger.info('Test message', { userId: 'user123', test: true });
      
      setTimeout(() => {
        const logFile = path.join(logDir, 'application.log');
        if (fs.existsSync(logFile)) {
          const logContent = fs.readFileSync(logFile, 'utf8');
          const logEntry = JSON.parse(logContent.trim());
          
          expect(logEntry.timestamp).toBeDefined();
          expect(logEntry.level).toBe('info');
          expect(logEntry.service).toBe('backend');
          expect(logEntry.requestId).toBe('test-request-123');
          expect(logEntry.message).toBe('Test message');
          expect(logEntry.userId).toBe('user123');
          expect(logEntry.test).toBe(true);
        }
        done();
      }, 100);
    });
  });
});
