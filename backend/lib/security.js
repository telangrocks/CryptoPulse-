// =============================================================================
// Enhanced Security Middleware - Production Ready
// =============================================================================
// Comprehensive security middleware for CryptoPulse backend

const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const { body, validationResult } = require('express-validator');
const compression = require('compression');
const helmet = require('helmet');
const logger = require('./logging');
const cors = require('cors');
const csrf = require('csurf');

// Enhanced brute force protection using rate limiting
const bruteForceProtection = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // limit each IP to 3 failed attempts per windowMs
  message: {
    success: false,
    error: 'Too many failed attempts, please try again later.',
    retryAfter: 15 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
  keyGenerator: (req) => {
  // Use IP + user agent for more specific tracking
    return `${req.ip}-${req.get('User-Agent')}`;
  }
});

// Enhanced rate limiting configurations with stricter limits
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Reduced from 100 - stricter limit
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: 15 * 60 // seconds
  },
  standardHeaders: true,
  legacyHeaders: false,
  trustProxy: true, // Trust proxy for accurate IP detection
  keyGenerator: (req) => {
  // Use the real IP address from trusted proxy
    return req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
  },
  skip: (req) => {
  // Skip rate limiting for health checks and static assets
    return req.path === '/health' ||
     req.path === '/health/detailed' ||
     req.path.startsWith('/assets/') ||
     req.path.startsWith('/static/');
  },
  // Enhanced security features
  onLimitReached: (req, _res, _options) => {
    logger.warn('Rate limit reached', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.url,
      method: req.method,
      timestamp: new Date().toISOString()
    });
  }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 auth requests per windowMs
  message: {
    success: false,
    error: 'Too many authentication attempts, please try again later.',
    retryAfter: 15 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  trustProxy: true,
  keyGenerator: (req) => {
    return req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
  }
});

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // limit each IP to 30 API requests per minute
  message: {
    success: false,
    error: 'API rate limit exceeded, please slow down.',
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  trustProxy: true,
  keyGenerator: (req) => {
    return req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
  }
});

// Slow down configuration
const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 50, // allow 50 requests per 15 minutes, then...
  delayMs: () => 500, // add 500ms delay per request above delayAfter
  maxDelayMs: 20000, // max delay of 20 seconds
  skip: (req) => {
    return req.path === '/health' || req.path === '/health/detailed';
  }
});

// Enhanced Helmet configuration
const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ['\'self\''],
      scriptSrc: ['\'self\'', '\'unsafe-inline\'', 'https://cdn.jsdelivr.net'],
      styleSrc: ['\'self\'', '\'unsafe-inline\'', 'https://fonts.googleapis.com', 'https://cdn.jsdelivr.net'],
      imgSrc: ['\'self\'', 'data:', 'https:', 'blob:'],
      connectSrc: [
        '\'self\'',
        'https://api.binance.com',
        'https://api.wazirx.com',
        'https://api.coindcx.com',
        'https://api.coingecko.com'
      ],
      fontSrc: ['\'self\'', 'https://fonts.gstatic.com'],
      objectSrc: ['\'none\''],
      mediaSrc: ['\'self\''],
      frameSrc: ['\'none\''],
      workerSrc: ['\'self\'', 'blob:'],
      childSrc: ['\'self\''],
      formAction: ['\'self\''],
      baseUri: ['\'self\''],
      manifestSrc: ['\'self\'']
    }
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  permittedCrossDomainPolicies: false,
  crossOriginOpenerPolicy: { policy: 'same-origin' },
  crossOriginResourcePolicy: { policy: 'cross-origin' }
});

// CORS configuration for production
const corsConfig = cors({
  origin: (origin, callback) => {
  // Get allowed origins from environment variables
    const envOrigins = process.env.ALLOWED_ORIGINS;
    const allowedOrigins = envOrigins ?
      envOrigins.split(',').map(origin => origin.trim()) :
      [
      // Production URLs
        'https://app.cryptopulse.com',
        'https://cryptopulse.com',
        // Development URLs
        'http://localhost:3000',
        'http://localhost:1337',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:1337'
      ];

    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) {return callback(null, true);}

    // In development, be more permissive but still log
    if (process.env.NODE_ENV === 'development') {
      if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
        return callback(null, true);
      }
      logger.warn(`CORS allowing unknown origin in development: ${origin}`);
      return callback(null, true);
    }

    // In production, be strict
    if (process.env.NODE_ENV === 'production') {
    // Block localhost in production
      if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
        logger.warn(`CORS blocked localhost in production: ${origin}`);
        return callback(new Error('Not allowed by CORS'));
      }

      // Check if origin is in allowed list
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // Block unknown origins in production
      logger.error(`CORS blocked unknown origin in production: ${origin}`);
      return callback(new Error('Not allowed by CORS'));
    }

    // Default: allow if in allowed list
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Block by default
    logger.warn(`CORS blocked origin: ${origin}`);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'X-CSRF-Token',
    'X-API-Key',
    'X-Session-Token',
    'X-Auth-Token',
    'Authorization',
    'Accept',
    'Origin',
    'User-Agent'
  ],
  exposedHeaders: [
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset',
    'X-Content-Type-Options',
    'X-Frame-Options'
  ],
  maxAge: 86400, // 24 hours
  optionsSuccessStatus: 200, // Some legacy browsers choke on 204
  preflightContinue: false
});

// Input validation middleware
const validateInput = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

// Enhanced validation rules with additional security checks
const validationRules = {
  email: body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email required')
    .isLength({ max: 254 })
    .withMessage('Email too long')
    .custom((value) => {
      // Check for suspicious patterns
      if (value.includes('..') || value.includes('--')) {
        throw new Error('Email contains suspicious patterns');
      }
      return true;
    }),
  password: body('password')
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be 8-128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain uppercase, lowercase, number and special character')
    .custom((value) => {
      // Check for common weak patterns
      const weakPatterns = ['password', '123456', 'qwerty', 'admin', 'user'];
      if (weakPatterns.some(pattern => value.toLowerCase().includes(pattern))) {
        throw new Error('Password contains common weak patterns');
      }
      return true;
    }),
  apiKey: body('apiKey')
    .isLength({ min: 20, max: 200 })
    .withMessage('API key must be 20-200 characters')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('API key contains invalid characters')
    .custom((value) => {
      // Check for suspicious patterns
      if (value.includes('test') || value.includes('demo') || value.includes('example')) {
        throw new Error('API key appears to be a test/demo key');
      }
      return true;
    }),
  amount: body('amount')
    .isFloat({ min: 0.01, max: 1000000 })
    .withMessage('Amount must be between 0.01 and 1,000,000')
    .custom((value) => {
      // Check for suspicious amounts
      if (value > 100000) {
        logger.warn('Large amount detected', { amount: value });
      }
      return true;
    }),
  symbol: body('symbol')
    .isLength({ min: 3, max: 10 })
    .withMessage('Symbol must be 3-10 characters')
    .matches(/^[A-Z0-9]+$/)
    .withMessage('Symbol must contain only uppercase letters and numbers')
    .custom((value) => {
      // Check for valid crypto symbols
      const validSymbols = ['BTC', 'ETH', 'USDT', 'BNB', 'ADA', 'DOT', 'LINK', 'LTC', 'BCH', 'XRP'];
      if (!validSymbols.includes(value)) {
        logger.warn('Unusual symbol detected', { symbol: value });
      }
      return true;
    }),
  userId: body('userId')
    .isUUID()
    .withMessage('Valid user ID required')
    .custom((value) => {
      // Check for suspicious patterns
      if (value.includes('admin') || value.includes('test')) {
        throw new Error('User ID contains suspicious patterns');
      }
      return true;
    }),
  exchange: body('exchange')
    .isIn(['binance', 'wazirx', 'coindcx', 'delta', 'coinbase'])
    .withMessage('Invalid exchange')
    .custom((value) => {
      // Log exchange usage for monitoring
      logger.info('Exchange access attempt', { exchange: value });
      return true;
    })
};

// Enhanced input sanitization
const sanitizeInput = (input) => {
  if (typeof input !== 'string') {return input;}

  // Remove potentially dangerous characters
  return input
    .trim()
    .replace(/[<>"'&]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .replace(/<script/gi, '')
    .replace(/<\/script>/gi, '');
};

// Security monitoring middleware
const securityMonitor = (req, res, next) => {
  const suspiciousPatterns = [
    /union\s+select/i,
    /drop\s+table/i,
    /insert\s+into/i,
    /delete\s+from/i,
    /update\s+set/i,
    /script\s*>/i,
    /javascript:/i,
    /onload=/i,
    /onerror=/i,
    /eval\s*\(/i,
    /expression\s*\(/i
  ];

  const checkSuspiciousActivity = (input) => {
    if (typeof input === 'string') {
      return suspiciousPatterns.some(pattern => pattern.test(input));
    }
    if (typeof input === 'object' && input !== null) {
      return Object.values(input).some(value => checkSuspiciousActivity(value));
    }
    return false;
  };

  // Check request body, query, and params
  if (checkSuspiciousActivity(req.body) ||
      checkSuspiciousActivity(req.query) ||
      checkSuspiciousActivity(req.params)) {

    logger.warn('Suspicious activity detected', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.url,
      method: req.method,
      body: req.body,
      query: req.query,
      params: req.params,
      timestamp: new Date().toISOString()
    });

    return res.status(400).json({
      success: false,
      error: 'Suspicious activity detected'
    });
  }

  next();
};

// CSRF protection configuration
const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 3600000 // 1 hour
  },
  ignoreMethods: ['GET', 'HEAD', 'OPTIONS'],
  value: (req) => {
    // Get CSRF token from header or body
    return req.headers['x-csrf-token'] || req.body._csrf;
  }
});

// CSRF error handler
const csrfErrorHandler = (err, req, res, next) => {
  if (err.code === 'EBADCSRFTOKEN') {
    return res.status(403).json({
      success: false,
      error: 'Invalid CSRF token',
      code: 'CSRF_TOKEN_INVALID'
    });
  }
  next(err);
};

// Enhanced security headers middleware with additional hardening
const securityHeaders = (req, res, next) => {
  // Remove X-Powered-By header
  res.removeHeader('X-Powered-By');

  // Add comprehensive security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=(), geolocation=(), microphone=(), camera=()');

  // HSTS only in production with HTTPS
  if (process.env.NODE_ENV === 'production' && process.env.HTTPS_ENABLED === 'true') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  res.setHeader('X-DNS-Prefetch-Control', 'off');
  res.setHeader('X-Download-Options', 'noopen');
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');

  // Additional security headers
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, nosnippet, noarchive');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  // Server information hiding
  res.setHeader('Server', 'CryptoPulse-API/2.0');

  // Enhanced Content Security Policy for API responses
  res.setHeader('Content-Security-Policy', 'default-src \'none\'; frame-ancestors \'none\'; base-uri \'none\'; form-action \'none\'; object-src \'none\'; script-src \'none\'; style-src \'none\'');

  // Additional production security headers
  res.setHeader('X-Request-ID', req.headers['x-request-id'] || 'unknown');
  res.setHeader('X-Response-Time', `${Date.now() - req.startTime || Date.now()}ms`);

  // API versioning header
  res.setHeader('X-API-Version', '2.0.0');

  // Rate limiting headers (will be set by rate limiting middleware)
  if (res.get('X-RateLimit-Limit')) {
    res.setHeader('X-RateLimit-Policy', 'sliding-window');
  }

  // Additional security headers for production
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');

  // Security headers for API protection
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Download-Options', 'noopen');
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');

  // Additional headers for enhanced security
  res.setHeader('Expect-CT', 'max-age=86400, enforce');
  res.setHeader('Feature-Policy', 'geolocation \'none\'; microphone \'none\'; camera \'none\'; payment \'none\'; usb \'none\'; magnetometer \'none\'; gyroscope \'none\'; accelerometer \'none\'');

  next();
};

// Request logging middleware
const requestLogger = (req, res, next) => {
  const start = Date.now();
  req.startTime = start; // Store for use in security headers

  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id'] || 'unknown',
      contentLength: res.get('Content-Length') || 0
    };

    // Sanitize sensitive URLs
    if (logData.url.includes('password') || logData.url.includes('token')) {
      logData.url = logData.url.replace(/[?&](password|token|secret|key)=[^&]*/gi, '&$1=***');
    }

    if (res.statusCode >= 400) {
      logger.warn('Request completed with error:', logData);
    } else if (duration > 1000) {
      logger.warn('Slow request detected:', logData);
    } else {
      logger.info('Request completed:', logData);
    }
  });

  next();
};

// Error handling middleware
const errorHandler = (err, req, res, _next) => {
  logger.error('Error occurred:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    timestamp: new Date().toISOString()
  });

  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';

  res.status(err.status || 500).json({
    success: false,
    error: isDevelopment ? err.message : 'Internal server error',
    ...(isDevelopment && { stack: err.stack })
  });
};

// Export security middleware
module.exports = {
  // Rate limiting
  generalLimiter,
  authLimiter,
  apiLimiter,
  speedLimiter,

  // Brute force protection
  bruteForceProtection,

  // Security headers
  helmetConfig,
  corsConfig,
  securityHeaders,

  // CSRF protection
  csrfProtection,
  csrfErrorHandler,

  // Compression
  compression: compression({
    level: 6,
    threshold: 1024,
    filter: (req, res) => {
      if (req.headers['x-no-compression']) {
        return false;
      }
      return compression.filter(req, res);
    }
  }),

  // Validation
  validateInput,
  validationRules,

  // Logging and error handling
  requestLogger,
  errorHandler,

  // Enhanced security features
  sanitizeInput,
  securityMonitor
};

