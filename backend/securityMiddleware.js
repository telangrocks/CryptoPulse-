/**
 * Production-ready Security Middleware
 * Comprehensive security headers, CSRF protection, and security policies
 */

const crypto = require('crypto');
const { createRateLimiters } = require('./rateLimiter');

class SecurityMiddleware {
  constructor() {
    this.rateLimiters = createRateLimiters();
    this.csrfTokens = new Map(); // In production, use Redis
    this.initializeSecurity();
  }

  initializeSecurity() {
    // Generate CSRF secret if not provided
    if (!process.env.CSRF_SECRET) {
      process.env.CSRF_SECRET = crypto.randomBytes(32).toString('hex');
    }
  }

  // Content Security Policy
  getCSPHeader() {
    const isProduction = process.env.NODE_ENV === 'production';
    
    const cspDirectives = {
      'default-src': ["'self'"],
      'script-src': [
        "'self'",
        "'unsafe-inline'", // Required for React in development
        "'unsafe-eval'", // Required for development
        'https://api.binance.com',
        'https://parseapi.back4app.com'
      ],
      'style-src': [
        "'self'",
        "'unsafe-inline'", // Required for styled components
        'https://fonts.googleapis.com'
      ],
      'font-src': [
        "'self'",
        'https://fonts.gstatic.com',
        'data:'
      ],
      'img-src': [
        "'self'",
        'data:',
        'https:',
        'blob:'
      ],
      'connect-src': [
        "'self'",
        'https://api.binance.com',
        'https://parseapi.back4app.com',
        'wss://stream.binance.com',
        'wss://ws-api.coinbase.com'
      ],
      'frame-ancestors': ["'none'"],
      'base-uri': ["'self'"],
      'form-action': ["'self'"],
      'object-src': ["'none'"],
      'upgrade-insecure-requests': isProduction ? [] : null,
      'block-all-mixed-content': isProduction ? [] : null
    };

    // Remove null values and convert to CSP string
    const cspString = Object.entries(cspDirectives)
      .filter(([_, values]) => values !== null)
      .map(([directive, values]) => `${directive} ${values.join(' ')}`)
      .join('; ');

    return cspString;
  }

  // Security Headers Middleware
  securityHeaders() {
    return (req, res, next) => {
      const isProduction = process.env.NODE_ENV === 'production';
      
      // Content Security Policy
      res.setHeader('Content-Security-Policy', this.getCSPHeader());
      
      // HTTP Strict Transport Security
      if (isProduction && req.secure) {
        res.setHeader('Strict-Transport-Security', 
          'max-age=31536000; includeSubDomains; preload');
      }
      
      // X-Frame-Options (prevent clickjacking)
      res.setHeader('X-Frame-Options', 'DENY');
      
      // X-Content-Type-Options (prevent MIME sniffing)
      res.setHeader('X-Content-Type-Options', 'nosniff');
      
      // X-XSS-Protection
      res.setHeader('X-XSS-Protection', '1; mode=block');
      
      // Referrer Policy
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
      
      // Permissions Policy (formerly Feature Policy)
      res.setHeader('Permissions-Policy', 
        'camera=(), microphone=(), geolocation=(), payment=(), usb=()');
      
      // Cross-Origin Embedder Policy
      res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
      
      // Cross-Origin Opener Policy
      res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
      
      // Cross-Origin Resource Policy
      res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
      
      // Remove X-Powered-By header
      res.removeHeader('X-Powered-By');
      
      // Add custom security headers
      res.setHeader('X-Security-Policy', 'enabled');
      res.setHeader('X-DNS-Prefetch-Control', 'off');
      
      next();
    };
  }

  // CSRF Protection
  generateCSRFToken() {
    const token = crypto.randomBytes(32).toString('hex');
    const timestamp = Date.now();
    
    // Store token with timestamp (expires in 1 hour)
    this.csrfTokens.set(token, {
      timestamp,
      expires: timestamp + (60 * 60 * 1000)
    });
    
    // Clean up expired tokens
    this.cleanupExpiredTokens();
    
    return token;
  }

  verifyCSRFToken(token) {
    if (!token) return false;
    
    const tokenData = this.csrfTokens.get(token);
    if (!tokenData) return false;
    
    // Check if token is expired
    if (Date.now() > tokenData.expires) {
      this.csrfTokens.delete(token);
      return false;
    }
    
    return true;
  }

  cleanupExpiredTokens() {
    const now = Date.now();
    for (const [token, data] of this.csrfTokens.entries()) {
      if (now > data.expires) {
        this.csrfTokens.delete(token);
      }
    }
  }

  csrfProtection() {
    return (req, res, next) => {
      // Skip CSRF for GET, HEAD, OPTIONS
      if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        return next();
      }
      
      // Skip CSRF for API endpoints with proper authentication
      if (req.path.startsWith('/api/') && req.headers.authorization) {
        return next();
      }
      
      const token = req.headers['x-csrf-token'] || req.body._csrf;
      
      if (!this.verifyCSRFToken(token)) {
        return res.status(403).json({
          error: 'CSRF token missing or invalid',
          message: 'Please refresh the page and try again'
        });
      }
      
      next();
    };
  }

  // Request Size Limiting
  requestSizeLimit() {
    return (req, res, next) => {
      const maxSize = 10 * 1024 * 1024; // 10MB
      let dataSize = 0;
      
      req.on('data', (chunk) => {
        dataSize += chunk.length;
        
        if (dataSize > maxSize) {
          res.status(413).json({
            error: 'Payload Too Large',
            message: 'Request size exceeds maximum allowed size'
          });
          return;
        }
      });
      
      req.on('end', () => {
        next();
      });
    };
  }

  // IP Whitelist/Blacklist
  ipFilter() {
    const allowedIPs = process.env.ALLOWED_IPS ? 
      process.env.ALLOWED_IPS.split(',') : null;
    const blockedIPs = process.env.BLOCKED_IPS ? 
      process.env.BLOCKED_IPS.split(',') : [];
    
    return (req, res, next) => {
      const clientIP = req.ip || req.connection.remoteAddress;
      
      // Check blacklist
      if (blockedIPs.includes(clientIP)) {
        return res.status(403).json({
          error: 'Access Denied',
          message: 'Your IP address is blocked'
        });
      }
      
      // Check whitelist (if configured)
      if (allowedIPs && !allowedIPs.includes(clientIP)) {
        return res.status(403).json({
          error: 'Access Denied',
          message: 'Your IP address is not authorized'
        });
      }
      
      next();
    };
  }

  // Request Validation
  validateRequest() {
    return (req, res, next) => {
      // Validate Content-Type for POST/PUT requests
      if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
        const contentType = req.headers['content-type'];
        
        if (!contentType || !contentType.includes('application/json')) {
          return res.status(400).json({
            error: 'Invalid Content-Type',
            message: 'Content-Type must be application/json'
          });
        }
      }
      
      // Validate User-Agent
      const userAgent = req.headers['user-agent'];
      if (!userAgent || userAgent.length < 10) {
        return res.status(400).json({
          error: 'Invalid User-Agent',
          message: 'User-Agent header is required'
        });
      }
      
      // Check for suspicious patterns
      const suspiciousPatterns = [
        /<script/i,
        /javascript:/i,
        /onload=/i,
        /onerror=/i,
        /union.*select/i,
        /drop.*table/i,
        /delete.*from/i
      ];
      
      const url = req.url;
      const body = JSON.stringify(req.body || {});
      
      for (const pattern of suspiciousPatterns) {
        if (pattern.test(url) || pattern.test(body)) {
          // Log suspicious activity
          console.warn(`Suspicious request detected from ${req.ip}:`, {
            url: req.url,
            userAgent: req.headers['user-agent'],
            pattern: pattern.toString()
          });
          
          return res.status(400).json({
            error: 'Invalid Request',
            message: 'Request contains invalid content'
          });
        }
      }
      
      next();
    };
  }

  // Session Security
  sessionSecurity() {
    return (req, res, next) => {
      // Generate session ID if not present
      if (!req.sessionID) {
        req.sessionID = crypto.randomBytes(16).toString('hex');
      }
      
      // Set secure session cookie options
      if (req.session && req.session.cookie) {
        req.session.cookie.secure = process.env.NODE_ENV === 'production';
        req.session.cookie.httpOnly = true;
        req.session.cookie.sameSite = 'strict';
        req.session.cookie.maxAge = 24 * 60 * 60 * 1000; // 24 hours
      }
      
      next();
    };
  }

  // Get all security middleware
  getAllMiddleware() {
    return [
      this.securityHeaders(),
      this.requestSizeLimit(),
      this.validateRequest(),
      this.sessionSecurity(),
      this.ipFilter(),
      this.csrfProtection()
    ];
  }

  // Get rate limiting middleware
  getRateLimitMiddleware(type) {
    return this.rateLimiters[type]?.middleware() || this.rateLimiters.general.middleware();
  }
}

module.exports = SecurityMiddleware;
