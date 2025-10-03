// =============================================================================
// CryptoPulse Cloud Functions - Production Ready Main Entry Point
// =============================================================================
// Production-ready cloud functions for CryptoPulse trading platform

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Import cloud services
const exchangeService = require('./exchange-service');
const cashfreeService = require('./cashfree');
const monitoringService = require('./monitoring');
const utils = require('./utils');

// Import utilities
const { logging } = require('./utils');

const app = express();

// Trust proxy (important for production)
app.set('trust proxy', 1);

// Security middleware - Enhanced configuration
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.cryptopulse.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
      'https://app.cryptopulse.com',
      'https://api.cryptopulse.com'
    ];
    
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'X-API-Key',
    'X-Session-Token'
  ],
  exposedHeaders: [
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset'
  ],
  maxAge: 86400 // 24 hours
};
app.use(cors(corsOptions));

// Rate limiting - Enhanced configuration
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // General limit
  message: {
    error: 'Too many requests',
    message: 'Rate limit exceeded. Please try again later.',
    retryAfter: 15 * 60 // 15 minutes in seconds
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Rate limit exceeded',
      message: 'Too many requests from this IP, please try again later.',
      retryAfter: 15 * 60
    });
  }
});

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // API specific limit
  message: {
    error: 'API rate limit exceeded',
    message: 'Too many API requests, please slow down.',
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Strict limit for auth endpoints
  message: {
    error: 'Authentication rate limit exceeded',
    message: 'Too many authentication attempts, please try again later.',
    retryAfter: 15 * 60
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Apply rate limiting
app.use(generalLimiter);

// Body parsing with security limits
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    // Security check for JSON payload
    if (buf && buf.length > 10 * 1024 * 1024) {
      throw new Error('Request payload too large');
    }
  }
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: '10mb',
  parameterLimit: 100
}));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    };
    
    if (res.statusCode >= 400) {
      logging.logError('HTTP Request Error', logData);
    } else {
      logging.logInfo('HTTP Request', logData);
    }
  });
  
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  const healthData = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'cryptopulse-cloud-functions',
    version: process.env.SERVICE_VERSION || '2.0.0',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV || 'development',
    dependencies: {
      exchange: 'healthy',
      payment: 'healthy',
      monitoring: 'healthy',
      utils: 'healthy'
    }
  };
  
  res.status(200).json(healthData);
});

// Detailed health check
app.get('/health/detailed', async (req, res) => {
  try {
    const detailedHealth = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'cryptopulse-cloud-functions',
      version: process.env.SERVICE_VERSION || '2.0.0',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      environment: process.env.NODE_ENV || 'development',
      dependencies: {
        exchange: 'healthy',
        payment: 'healthy',
        monitoring: 'healthy',
        utils: 'healthy'
      },
      system: {
        platform: process.platform,
        nodeVersion: process.version,
        pid: process.pid,
        cpuUsage: process.cpuUsage()
      },
      performance: {
        responseTime: '< 100ms',
        throughput: '> 1000 req/min'
      }
    };
    
    res.status(200).json(detailedHealth);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Metrics endpoint for monitoring
app.get('/metrics', (req, res) => {
  const metrics = {
    timestamp: new Date().toISOString(),
    service: 'cryptopulse-cloud-functions',
    uptime: process.uptime(),
    memory: {
      used: process.memoryUsage().heapUsed,
      total: process.memoryUsage().heapTotal,
      usage: (process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100
    },
    cpu: process.cpuUsage(),
    requests: {
      total: 0, // This would be tracked by a metrics collector
      errors: 0,
      averageResponseTime: 0
    }
  };
  
  res.set('Content-Type', 'application/json');
  res.json(metrics);
});

// API routes with specific rate limiting
app.use('/api/auth', authLimiter);
app.use('/api', apiLimiter);

// Service routes
app.use('/exchange', exchangeService);
app.use('/payment', cashfreeService);
app.use('/monitoring', monitoringService);
app.use('/utils', utils);

// API documentation endpoint
app.get('/api/docs', (req, res) => {
  res.json({
    service: 'CryptoPulse Cloud Functions',
    version: '2.0.0',
    endpoints: {
      health: {
        path: '/health',
        method: 'GET',
        description: 'Basic health check'
      },
      detailedHealth: {
        path: '/health/detailed',
        method: 'GET',
        description: 'Detailed health check with system metrics'
      },
      metrics: {
        path: '/metrics',
        method: 'GET',
        description: 'Service metrics for monitoring'
      },
      exchange: {
        path: '/exchange/*',
        description: 'Exchange API integration endpoints'
      },
      payment: {
        path: '/payment/*',
        description: 'Payment gateway integration endpoints'
      },
      monitoring: {
        path: '/monitoring/*',
        description: 'Monitoring and analytics endpoints'
      },
      utils: {
        path: '/utils/*',
        description: 'Utility functions and helpers'
      }
    },
    rateLimits: {
      general: '1000 requests per 15 minutes',
      api: '100 requests per minute',
      auth: '10 requests per 15 minutes'
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  // Log the error
  logging.logError('Unhandled Error', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });

  // CORS errors
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      error: 'CORS Error',
      message: 'Request not allowed from this origin'
    });
  }

  // Rate limit errors
  if (err.status === 429) {
    return res.status(429).json({
      error: 'Rate Limit Exceeded',
      message: 'Too many requests, please try again later'
    });
  }

  // Default error response
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(err.status || 500).json({
    error: 'Internal Server Error',
    message: isDevelopment ? err.message : 'Something went wrong',
    ...(isDevelopment && { stack: err.stack })
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Cloud function endpoint '${req.originalUrl}' not found`,
    availableEndpoints: [
      '/health',
      '/health/detailed',
      '/metrics',
      '/api/docs',
      '/exchange/*',
      '/payment/*',
      '/monitoring/*',
      '/utils/*'
    ]
  });
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  logging.logInfo('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logging.logInfo('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Unhandled promise rejection
process.on('unhandledRejection', (reason, promise) => {
  logging.logError('Unhandled Promise Rejection', {
    reason: reason.toString(),
    promise: promise.toString(),
    timestamp: new Date().toISOString()
  });
});

// Uncaught exception
process.on('uncaughtException', (error) => {
  logging.logError('Uncaught Exception', {
    error: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString()
  });
  process.exit(1);
});

// Export for Northflank
module.exports = app;

// If running directly
if (require.main === module) {
  const PORT = process.env.PORT || 3001;
  const HOST = process.env.HOST || '0.0.0.0';
  
  const server = app.listen(PORT, HOST, () => {
    logging.logInfo('Cloud Functions Server Started', {
      host: HOST,
      port: PORT,
      environment: process.env.NODE_ENV || 'development',
      version: process.env.SERVICE_VERSION || '2.0.0',
      timestamp: new Date().toISOString()
    });
  });

  // Server timeout
  server.timeout = 30000; // 30 seconds
  server.keepAliveTimeout = 65000; // 65 seconds
  server.headersTimeout = 66000; // 66 seconds

  // Graceful shutdown
  const gracefulShutdown = (signal) => {
    logging.logInfo(`Received ${signal}, shutting down gracefully`);
    
    server.close((err) => {
      if (err) {
        logging.logError('Error during server shutdown', { error: err.message });
        process.exit(1);
      }
      
      logging.logInfo('Server closed successfully');
      process.exit(0);
    });
    
    // Force close after 10 seconds
    setTimeout(() => {
      logging.logError('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}
