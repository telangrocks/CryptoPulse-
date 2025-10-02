// =============================================================================
// Enhanced Logging Configuration - Production Ready
// =============================================================================
// Centralized logging with structured output, multiple transports, and monitoring

const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Ensure logs directory exists with proper error handling
const logsDir = path.join(__dirname, '../logs');

const ensureLogsDirectory = () => {
  try {
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
      // Logs directory created successfully
    }
    return true;
  } catch {
    // Failed to create logs directory - using console fallback
    // Logging will continue with console output only
    return false;
  }
};

// Initialize logs directory
const logsDirExists = ensureLogsDirectory();

// Custom log format
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss.SSS'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    return JSON.stringify({
      timestamp,
      level,
      message,
      ...meta
    });
  })
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: 'HH:mm:ss'
  }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    return `${timestamp} [${level}]: ${message} ${metaStr}`;
  })
);

// Create transports array
const transports = [
  // Console transport
  new winston.transports.Console({
    format: process.env.NODE_ENV === 'production' ? logFormat : consoleFormat,
    silent: process.env.NODE_ENV === 'test'
  })
];

// Add file transports only if logs directory exists
if (logsDirExists) {
  transports.push(
  // Error log file with enhanced rotation
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 52428800, // 50MB - increased for production
      maxFiles: 10, // Increased for production
      tailable: true,
      zippedArchive: true, // Compress old logs
      format: logFormat
    }),
    // Combined log file with enhanced rotation
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 52428800, // 50MB - increased for production
      maxFiles: 10, // Increased for production
      tailable: true,
      zippedArchive: true, // Compress old logs
      format: logFormat
    }),
    // Production-specific log file
    new winston.transports.File({
      filename: path.join(logsDir, 'production.log'),
      level: 'info',
      maxsize: 104857600, // 100MB
      maxFiles: 5,
      tailable: true,
      zippedArchive: true,
      format: logFormat
    })
  );
}

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: {
    service: 'cryptopulse-backend',
    version: '2.0.0',
    environment: process.env.NODE_ENV || 'development'
  },
  transports,
  exitOnError: false, // Don't exit on handled exceptions
  silent: process.env.NODE_ENV === 'test'
});

// Add exception and rejection handlers only if logs directory exists and not in test mode
if (logsDirExists && process.env.NODE_ENV !== 'test') {
  if (logger.exceptions && logger.exceptions.handle) {
    logger.exceptions.handle(
      new winston.transports.File({
        filename: path.join(logsDir, 'exceptions.log'),
        format: logFormat,
        maxsize: 52428800, // 50MB - increased for production
        maxFiles: 5, // Increased for production
        tailable: true,
        zippedArchive: true
      })
    );
  }

  if (logger.rejections && logger.rejections.handle) {
    logger.rejections.handle(
      new winston.transports.File({
        filename: path.join(logsDir, 'rejections.log'),
        format: logFormat,
        maxsize: 52428800, // 50MB - increased for production
        maxFiles: 5, // Increased for production
        tailable: true,
        zippedArchive: true
      })
    );
  }
}

// Log cleanup and maintenance utilities
const logMaintenance = {
  // Clean up old log files
  cleanupOldLogs: () => {
    if (!logsDirExists) {return;}

    try {
      const files = fs.readdirSync(logsDir);
      const now = Date.now();
      const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
      let cleanedCount = 0;

      files.forEach(file => {
        const filePath = path.join(logsDir, file);
        const stats = fs.statSync(filePath);

        if (now - stats.mtime.getTime() > maxAge) {
          fs.unlinkSync(filePath);
          cleanedCount++;
          logger.info(`Cleaned up old log file: ${file}`);
        }
      });

      if (cleanedCount > 0) {
        logger.info(`Log cleanup completed: removed ${cleanedCount} old files`);
      }
    } catch (error) {
      logger.error('Log cleanup failed:', error);
    }
  },

  // Get log file statistics
  getLogStats: () => {
    if (!logsDirExists) {return null;}

    try {
      const files = fs.readdirSync(logsDir);
      const stats = {
        totalFiles: files.length,
        totalSize: 0,
        files: []
      };

      files.forEach(file => {
        const filePath = path.join(logsDir, file);
        const fileStats = fs.statSync(filePath);
        const fileSize = fileStats.size;

        stats.totalSize += fileSize;
        stats.files.push({
          name: file,
          size: fileSize,
          sizeMB: (fileSize / 1024 / 1024).toFixed(2),
          modified: fileStats.mtime.toISOString()
        });
      });

      stats.totalSizeMB = (stats.totalSize / 1024 / 1024).toFixed(2);
      return stats;
    } catch (error) {
      logger.error('Failed to get log stats:', error);
      return null;
    }
  },

  // Compress old log files
  compressOldLogs: () => {
    if (!logsDirExists) {return;}

    try {
      const files = fs.readdirSync(logsDir);
      const now = Date.now();
      const compressAge = 7 * 24 * 60 * 60 * 1000; // 7 days

      files.forEach(file => {
        if (file.endsWith('.gz')) {return;} // Already compressed

        const filePath = path.join(logsDir, file);
        const stats = fs.statSync(filePath);

        if (now - stats.mtime.getTime() > compressAge) {
          const gzip = require('zlib').createGzip();
          const input = fs.createReadStream(filePath);
          const output = fs.createWriteStream(filePath + '.gz');

          input.pipe(gzip).pipe(output);

          output.on('finish', () => {
            fs.unlinkSync(filePath);
            logger.info(`Compressed log file: ${file}`);
          });
        }
      });
    } catch (error) {
      logger.error('Log compression failed:', error);
    }
  }
};

// Start log maintenance tasks
const startLogMaintenance = () => {
  // Clean up old logs daily
  setInterval(() => {
    logMaintenance.cleanupOldLogs();
  }, 24 * 60 * 60 * 1000); // 24 hours

  // Compress old logs weekly
  setInterval(() => {
    logMaintenance.compressOldLogs();
  }, 7 * 24 * 60 * 60 * 1000); // 7 days

  logger.info('Log maintenance tasks started');
};

// Handle uncaught exceptions and unhandled rejections
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', {
    error: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString()
  });

  // Give time for logging to complete before exit
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', {
    reason: reason?.message || reason,
    stack: reason?.stack,
    promise: promise.toString(),
    timestamp: new Date().toISOString()
  });
});

// Add request logging middleware
const requestLogger = (req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip || req.connection?.remoteAddress || 'unknown',
      userAgent: req.get('User-Agent') || 'unknown',
      contentLength: res.get('Content-Length'),
      referer: req.get('Referer'),
      requestId: req.headers['x-request-id'] || 'unknown'
    };

    // Sanitize sensitive data
    if (logData.url.includes('password') || logData.url.includes('token')) {
      logData.url = logData.url.replace(/[?&](password|token|secret|key)=[^&]*/gi, '&$1=***');
    }

    if (res.statusCode >= 400) {
      logger.warn('HTTP Request', logData);
    } else {
      logger.info('HTTP Request', logData);
    }
  });

  next();
};

// Add error logging middleware
const errorLogger = (err, req, res, next) => {
  const errorData = {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip || req.connection?.remoteAddress || 'unknown',
    userAgent: req.get('User-Agent') || 'unknown',
    requestId: req.headers['x-request-id'] || 'unknown',
    timestamp: new Date().toISOString()
  };

  // Sanitize sensitive data from request
  if (req.body) {
    const sanitizedBody = { ...req.body };
    Object.keys(sanitizedBody).forEach(key => {
      if (key.toLowerCase().includes('password') ||
    key.toLowerCase().includes('token') ||
    key.toLowerCase().includes('secret') ||
    key.toLowerCase().includes('key')) {
        sanitizedBody[key] = '***';
      }
    });
    errorData.body = sanitizedBody;
  }

  errorData.query = req.query;
  errorData.params = req.params;

  logger.error('Unhandled Error', errorData);

  next(err);
};

// Performance monitoring
const performanceLogger = {
  startTimer: (operation) => {
    const start = Date.now();
    return {
      end: (metadata = {}) => {
        const duration = Date.now() - start;
        logger.info('Performance', {
          operation,
          duration: `${duration}ms`,
          ...metadata
        });
        return duration;
      }
    };
  }
};

// Security event logging
const securityLogger = {
  loginAttempt: (ip, email, success, reason = null) => {
    logger.info('Security Event', {
      event: 'login_attempt',
      ip,
      email,
      success,
      reason,
      timestamp: new Date().toISOString()
    });
  },

  apiKeyUsage: (apiKey, endpoint, success, responseTime) => {
    logger.info('API Key Usage', {
      event: 'api_key_usage',
      apiKey: apiKey.substring(0, 8) + '...', // Mask API key
      endpoint,
      success,
      responseTime: `${responseTime}ms`,
      timestamp: new Date().toISOString()
    });
  },

  suspiciousActivity: (ip, activity, details) => {
    logger.warn('Suspicious Activity', {
      event: 'suspicious_activity',
      ip,
      activity,
      details,
      timestamp: new Date().toISOString()
    });
  },

  rateLimitHit: (ip, endpoint, limit) => {
    logger.warn('Rate Limit Hit', {
      event: 'rate_limit_hit',
      ip,
      endpoint,
      limit,
      timestamp: new Date().toISOString()
    });
  }
};

// Trading event logging
const tradingLogger = {
  tradeExecuted: (tradeData) => {
    logger.info('Trade Executed', {
      event: 'trade_executed',
      ...tradeData,
      timestamp: new Date().toISOString()
    });
  },

  tradeFailed: (tradeData, error) => {
    logger.error('Trade Failed', {
      event: 'trade_failed',
      ...tradeData,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  },

  portfolioUpdate: (portfolioData) => {
    logger.info('Portfolio Update', {
      event: 'portfolio_update',
      ...portfolioData,
      timestamp: new Date().toISOString()
    });
  }
};

// Health check logging
const healthLogger = {
  systemHealth: (healthData) => {
    logger.info('System Health', {
      event: 'system_health',
      ...healthData,
      timestamp: new Date().toISOString()
    });
  },

  serviceStatus: (service, status, details) => {
    logger.info('Service Status', {
      event: 'service_status',
      service,
      status,
      details,
      timestamp: new Date().toISOString()
    });
  }
};

// Export logging utilities
module.exports = {
  logger,
  requestLogger,
  errorLogger,
  performanceLogger,
  securityLogger,
  tradingLogger,
  healthLogger,
  // Enhanced log management
  logMaintenance,
  startLogMaintenance
};
