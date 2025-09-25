/**
 * Production-Grade Structured Logging System
 * Replaces all console.log statements with proper logging
 */

const fs = require('fs');
const path = require('path');
const winston = require('winston');
const { v4: uuidv4 } = require('uuid');

class StructuredLogger {
  constructor() {
    this.logDir = path.join(__dirname, '../logs');
    this.ensureLogDirectory();
    this.setupLogger();
    this.requestId = null;
  }

  ensureLogDirectory() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  setupLogger() {
    // Define log format
    const logFormat = winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
      winston.format.errors({ stack: true }),
      winston.format.json(),
      winston.format.printf(({ timestamp, level, message, service, requestId, userId, ...meta }) => {
        const logEntry = {
          timestamp,
          level,
          service: service || 'backend',
          requestId: requestId || this.requestId,
          userId,
          message,
          ...meta
        };
        return JSON.stringify(logEntry);
      })
    );

    // Create logger instance
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: logFormat,
      defaultMeta: { service: 'backend' },
      transports: [
        // Console transport for development
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          ),
          silent: process.env.NODE_ENV === 'production' && !process.env.ENABLE_CONSOLE_LOGS
        }),
        
        // File transport for all logs
        new winston.transports.File({
          filename: path.join(this.logDir, 'application.log'),
          maxsize: 5242880, // 5MB
          maxFiles: 5,
          tailable: true
        }),
        
        // Error log file
        new winston.transports.File({
          filename: path.join(this.logDir, 'error.log'),
          level: 'error',
          maxsize: 5242880, // 5MB
          maxFiles: 5,
          tailable: true
        }),
        
        // Audit log file
        new winston.transports.File({
          filename: path.join(this.logDir, 'audit.log'),
          level: 'info',
          maxsize: 10485760, // 10MB
          maxFiles: 10,
          tailable: true
        })
      ]
    });

    // Handle uncaught exceptions
    this.logger.exceptions.handle(
      new winston.transports.File({ 
        filename: path.join(this.logDir, 'exceptions.log'),
        maxsize: 5242880,
        maxFiles: 3
      })
    );

    // Handle unhandled promise rejections
    this.logger.rejections.handle(
      new winston.transports.File({ 
        filename: path.join(this.logDir, 'rejections.log'),
        maxsize: 5242880,
        maxFiles: 3
      })
    );
  }

  // Set request ID for request correlation
  setRequestId(requestId) {
    this.requestId = requestId;
  }

  // Generate new request ID
  generateRequestId() {
    this.requestId = uuidv4();
    return this.requestId;
  }

  // Core logging methods
  error(message, meta = {}) {
    this.logger.error(message, { ...meta, requestId: this.requestId });
  }

  warn(message, meta = {}) {
    this.logger.warn(message, { ...meta, requestId: this.requestId });
  }

  info(message, meta = {}) {
    this.logger.info(message, { ...meta, requestId: this.requestId });
  }

  debug(message, meta = {}) {
    this.logger.debug(message, { ...meta, requestId: this.requestId });
  }

  // Specialized logging methods
  http(method, path, statusCode, duration, meta = {}) {
    this.info(`HTTP ${method} ${path}`, {
      type: 'http_request',
      method,
      path,
      statusCode,
      duration,
      ...meta
    });
  }

  auth(action, userId, success, meta = {}) {
    this.info(`Auth ${action}`, {
      type: 'authentication',
      action,
      userId,
      success,
      ...meta
    });
  }

  trading(action, userId, symbol, quantity, meta = {}) {
    this.info(`Trading ${action}`, {
      type: 'trading',
      action,
      userId,
      symbol,
      quantity,
      ...meta
    });
  }

  security(event, severity, meta = {}) {
    const level = severity === 'critical' ? 'error' : severity === 'high' ? 'warn' : 'info';
    this.logger[level](`Security event: ${event}`, {
      type: 'security',
      event,
      severity,
      ...meta
    });
  }

  performance(operation, duration, meta = {}) {
    this.info(`Performance: ${operation}`, {
      type: 'performance',
      operation,
      duration,
      ...meta
    });
  }

  database(operation, table, duration, meta = {}) {
    this.info(`Database ${operation}`, {
      type: 'database',
      operation,
      table,
      duration,
      ...meta
    });
  }

  api(externalService, endpoint, statusCode, duration, meta = {}) {
    this.info(`External API call: ${externalService}`, {
      type: 'external_api',
      service: externalService,
      endpoint,
      statusCode,
      duration,
      ...meta
    });
  }

  // Audit logging for compliance
  audit(eventType, userId, details, meta = {}) {
    this.info(`Audit: ${eventType}`, {
      type: 'audit',
      eventType,
      userId,
      details,
      timestamp: new Date().toISOString(),
      ...meta
    });
  }

  // System health logging
  health(component, status, details, meta = {}) {
    this.info(`Health check: ${component}`, {
      type: 'health',
      component,
      status,
      details,
      ...meta
    });
  }

  // Business metrics logging
  metrics(metricName, value, tags = {}) {
    this.info(`Metric: ${metricName}`, {
      type: 'metric',
      metricName,
      value,
      tags,
      timestamp: new Date().toISOString()
    });
  }

  // Error logging with context
  logError(error, context = {}) {
    this.error('Application error', {
      type: 'error',
      message: error.message,
      stack: error.stack,
      name: error.name,
      ...context
    });
  }

  // Request logging middleware
  requestLogger() {
    return (req, res, next) => {
      const requestId = this.generateRequestId();
      req.requestId = requestId;
      this.setRequestId(requestId);

      const startTime = Date.now();
      
      // Log request start
      this.info(`Request started: ${req.method} ${req.path}`, {
        type: 'request_start',
        method: req.method,
        path: req.path,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
        userId: req.user?.id
      });

      // Override res.end to log response
      const originalEnd = res.end;
      res.end = function(...args) {
        const duration = Date.now() - startTime;
        
        // Log response
        logger.http(req.method, req.path, res.statusCode, duration, {
          userId: req.user?.id,
          responseSize: res.get('Content-Length') || 0
        });

        originalEnd.apply(this, args);
      };

      next();
    };
  }

  // Get logger instance for external use
  getLogger() {
    return this.logger;
  }

  // Close logger (for graceful shutdown)
  close() {
    return new Promise((resolve) => {
      this.logger.end(() => {
        resolve();
      });
    });
  }
}

// Create singleton instance
const logger = new StructuredLogger();

// Export both class and instance
module.exports = { StructuredLogger, logger };

// Global error handlers
process.on('uncaughtException', (error) => {
  logger.logError(error, { type: 'uncaught_exception' });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled promise rejection', {
    type: 'unhandled_rejection',
    reason: reason?.toString(),
    promise: promise?.toString()
  });
});
