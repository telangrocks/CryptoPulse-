// Production Security Module for CryptoPulse Cloud Functions
const crypto = require('crypto');
const winston = require('winston');

// Configure logger for security
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console()
  ]
});

// Security configuration
const SECURITY_CONFIG = {
  // Rate limiting configuration
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false
  },
  
  // Helmet security headers
  helmet: {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "https://api.binance.com", "https://api.wazirx.com", "https://api.coindcx.com"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"]
      }
    },
    crossOriginEmbedderPolicy: false,
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  },
  
  // Input validation
  inputValidation: {
    maxStringLength: 1000,
    maxArrayLength: 100,
    allowedFileTypes: ['image/jpeg', 'image/png', 'image/gif'],
    maxFileSize: 5 * 1024 * 1024 // 5MB
  },
  
  // Password policy
  passwordPolicy: {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    maxLength: 128,
    preventCommonPasswords: true
  },
  
  // Session security
  sessionSecurity: {
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    secure: true,
    httpOnly: true,
    sameSite: 'strict'
  },
  
  // API key security
  apiKeySecurity: {
    minLength: 20,
    maxLength: 100,
    requireSpecialChars: true,
    rotationPeriod: 90 * 24 * 60 * 60 * 1000 // 90 days
  }
};

// Security event tracking
const securityEvents = [];

// Track security events
function trackSecurityEvent(eventType, details, severity = 'medium') {
  const event = {
    id: crypto.randomUUID(),
    type: eventType,
    severity,
    details,
    timestamp: new Date(),
    ip: details.ip || 'unknown',
    userAgent: details.userAgent || 'unknown',
    userId: details.userId || null
  };
  
  securityEvents.push(event);
  
  // Keep only last 1000 events
  if (securityEvents.length > 1000) {
    securityEvents.splice(0, securityEvents.length - 1000);
  }
  
  logger.warn('Security event tracked', event);
  
  // Alert on high severity events
  if (severity === 'high' || severity === 'critical') {
    alertSecurityEvent(event);
  }
}

// Alert security events
async function alertSecurityEvent(event) {
  try {
    // In production, this would send to external alerting services
    logger.error('SECURITY ALERT', event);
    
    // Send to Slack if configured
    if (process.env.SLACK_WEBHOOK) {
      const message = {
        text: `🚨 Security Alert: ${event.type}`,
        attachments: [{
          color: event.severity === 'critical' ? 'danger' : 'warning',
          fields: [
            { title: 'Event Type', value: event.type, short: true },
            { title: 'Severity', value: event.severity, short: true },
            { title: 'Timestamp', value: event.timestamp.toISOString(), short: true },
            { title: 'IP Address', value: event.ip, short: true },
            { title: 'Details', value: JSON.stringify(event.details, null, 2), short: false }
          ]
        }]
      };
      
      // Send to Slack (implementation would use actual Slack API)
      console.log('Slack alert:', JSON.stringify(message, null, 2));
    }
  } catch (error) {
    logger.error('Failed to send security alert:', error);
  }
}

// Input validation
function validateInput(input, rules) {
  const errors = [];
  
  if (rules.required && (input === undefined || input === null || input === '')) {
    errors.push('Field is required');
    return { valid: false, errors };
  }
  
  if (input !== undefined && input !== null) {
    // String validation
    if (rules.type === 'string') {
      if (typeof input !== 'string') {
        errors.push('Field must be a string');
      } else {
        if (rules.minLength && input.length < rules.minLength) {
          errors.push(`Field must be at least ${rules.minLength} characters long`);
        }
        if (rules.maxLength && input.length > rules.maxLength) {
          errors.push(`Field must be no more than ${rules.maxLength} characters long`);
        }
        if (rules.pattern && !rules.pattern.test(input)) {
          errors.push('Field format is invalid');
        }
      }
    }
    
    // Number validation
    if (rules.type === 'number') {
      if (typeof input !== 'number' || isNaN(input)) {
        errors.push('Field must be a number');
      } else {
        if (rules.min !== undefined && input < rules.min) {
          errors.push(`Field must be at least ${rules.min}`);
        }
        if (rules.max !== undefined && input > rules.max) {
          errors.push(`Field must be no more than ${rules.max}`);
        }
      }
    }
    
    // Array validation
    if (rules.type === 'array') {
      if (!Array.isArray(input)) {
        errors.push('Field must be an array');
      } else {
        if (rules.minLength && input.length < rules.minLength) {
          errors.push(`Array must have at least ${rules.minLength} items`);
        }
        if (rules.maxLength && input.length > rules.maxLength) {
          errors.push(`Array must have no more than ${rules.maxLength} items`);
        }
      }
    }
    
    // Email validation
    if (rules.type === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(input)) {
        errors.push('Field must be a valid email address');
      }
    }
    
    // URL validation
    if (rules.type === 'url') {
      try {
        new URL(input);
      } catch {
        errors.push('Field must be a valid URL');
      }
    }
  }
  
  return { valid: errors.length === 0, errors };
}

// Password validation
function validatePassword(password) {
  const errors = [];
  const policy = SECURITY_CONFIG.passwordPolicy;
  
  if (!password || typeof password !== 'string') {
    errors.push('Password is required');
    return { valid: false, errors };
  }
  
  if (password.length < policy.minLength) {
    errors.push(`Password must be at least ${policy.minLength} characters long`);
  }
  
  if (password.length > policy.maxLength) {
    errors.push(`Password must be no more than ${policy.maxLength} characters long`);
  }
  
  if (policy.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (policy.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (policy.requireNumbers && !/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (policy.requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  if (policy.preventCommonPasswords) {
    const commonPasswords = [
      'password', '123456', '123456789', 'qwerty', 'abc123',
      'password123', 'admin', 'letmein', 'welcome', 'monkey'
    ];
    
    if (commonPasswords.includes(password.toLowerCase())) {
      errors.push('Password is too common, please choose a stronger password');
    }
  }
  
  return { valid: errors.length === 0, errors };
}

// API key validation
function validateApiKey(apiKey) {
  const errors = [];
  const policy = SECURITY_CONFIG.apiKeySecurity;
  
  if (!apiKey || typeof apiKey !== 'string') {
    errors.push('API key is required');
    return { valid: false, errors };
  }
  
  if (apiKey.length < policy.minLength) {
    errors.push(`API key must be at least ${policy.minLength} characters long`);
  }
  
  if (apiKey.length > policy.maxLength) {
    errors.push(`API key must be no more than ${policy.maxLength} characters long`);
  }
  
  if (policy.requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(apiKey)) {
    errors.push('API key must contain at least one special character');
  }
  
  return { valid: errors.length === 0, errors };
}

// Sanitize input
function sanitizeInput(input) {
  if (typeof input === 'string') {
    // Remove potentially dangerous characters
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<[^>]*>/g, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .trim();
  }
  
  if (Array.isArray(input)) {
    return input.map(item => sanitizeInput(item));
  }
  
  if (typeof input === 'object' && input !== null) {
    const sanitized = {};
    for (const key in input) {
      if (input.hasOwnProperty(key)) {
        sanitized[key] = sanitizeInput(input[key]);
      }
    }
    return sanitized;
  }
  
  return input;
}

// Rate limiting
const rateLimitMap = new Map();

function checkRateLimit(identifier, windowMs = SECURITY_CONFIG.rateLimit.windowMs, max = SECURITY_CONFIG.rateLimit.max) {
  const now = Date.now();
  const windowStart = now - windowMs;
  
  if (!rateLimitMap.has(identifier)) {
    rateLimitMap.set(identifier, []);
  }
  
  const requests = rateLimitMap.get(identifier);
  const validRequests = requests.filter(time => time > windowStart);
  
  if (validRequests.length >= max) {
    trackSecurityEvent('rate_limit_exceeded', {
      identifier,
      requestCount: validRequests.length,
      windowMs,
      max
    }, 'medium');
    
    return false;
  }
  
  validRequests.push(now);
  rateLimitMap.set(identifier, validRequests);
  
  return true;
}

// IP whitelist/blacklist
const IP_BLACKLIST = new Set();
const IP_WHITELIST = new Set();

function isIPAllowed(ip) {
  if (IP_WHITELIST.size > 0) {
    return IP_WHITELIST.has(ip);
  }
  
  return !IP_BLACKLIST.has(ip);
}

function addToBlacklist(ip, reason) {
  IP_BLACKLIST.add(ip);
  trackSecurityEvent('ip_blacklisted', { ip, reason }, 'high');
}

function addToWhitelist(ip, reason) {
  IP_WHITELIST.add(ip);
  trackSecurityEvent('ip_whitelisted', { ip, reason }, 'low');
}

// Security headers
function getSecurityHeaders() {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://api.binance.com https://api.wazirx.com https://api.coindcx.com; font-src 'self'; object-src 'none'; media-src 'self'; frame-src 'none'"
  };
}

// Audit logging
function auditLog(action, details) {
  const auditEntry = {
    id: crypto.randomUUID(),
    action,
    details,
    timestamp: new Date(),
    ip: details.ip || 'unknown',
    userAgent: details.userAgent || 'unknown',
    userId: details.userId || null,
    sessionId: details.sessionId || null
  };
  
  logger.info('Audit log entry', auditEntry);
  
  // In production, this would be stored in a secure audit database
  return auditEntry;
}

// Get security statistics
function getSecurityStats() {
  const now = new Date();
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  
  const recentEvents = securityEvents.filter(event => event.timestamp >= last24h);
  
  const stats = {
    totalEvents: securityEvents.length,
    recentEvents: recentEvents.length,
    eventsByType: {},
    eventsBySeverity: {},
    topIPs: {},
    topUserAgents: {}
  };
  
  recentEvents.forEach(event => {
    // Count by type
    stats.eventsByType[event.type] = (stats.eventsByType[event.type] || 0) + 1;
    
    // Count by severity
    stats.eventsBySeverity[event.severity] = (stats.eventsBySeverity[event.severity] || 0) + 1;
    
    // Count by IP
    stats.topIPs[event.ip] = (stats.topIPs[event.ip] || 0) + 1;
    
    // Count by user agent
    stats.topUserAgents[event.userAgent] = (stats.topUserAgents[event.userAgent] || 0) + 1;
  });
  
  return stats;
}

module.exports = {
  SECURITY_CONFIG,
  trackSecurityEvent,
  alertSecurityEvent,
  validateInput,
  validatePassword,
  validateApiKey,
  sanitizeInput,
  checkRateLimit,
  isIPAllowed,
  addToBlacklist,
  addToWhitelist,
  getSecurityHeaders,
  auditLog,
  getSecurityStats
};
