// =============================================================================
// Frontend Security Utilities - Production Ready
// =============================================================================
// Comprehensive security utilities for CryptoPulse frontend

import CryptoJS from 'crypto-js';
import DOMPurify from 'dompurify';

// Security configuration
const SECURITY_CONFIG = {
  // Content Security Policy
  CSP: {
    'default-src': ["'self'"],
    'script-src': ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
    'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://cdn.jsdelivr.net'],
    'img-src': ["'self'", 'data:', 'https:', 'blob:'],
    'connect-src': [
      "'self'",
      'https://api.binance.com',
      'https://api.wazirx.com',
      'https://api.coindcx.com',
      'https://api.coingecko.com',
      process.env.VITE_API_BASE_URL || 'http://localhost:1337',
    ],
    'font-src': ["'self'", 'https://fonts.gstatic.com'],
    'object-src': ["'none'"],
    'media-src': ["'self'"],
    'frame-src': ["'none'"],
    'worker-src': ["'self'", 'blob:'],
    'child-src': ["'self'"],
    'form-action': ["'self'"],
    'base-uri': ["'self'"],
    'manifest-src': ["'self'"],
  },

  // Rate limiting
  RATE_LIMITS: {
    API_CALLS: 30, // per minute
    AUTH_ATTEMPTS: 5, // per 15 minutes
    GENERAL_REQUESTS: 50, // per 15 minutes
  },

  // Input validation
  VALIDATION: {
    EMAIL_REGEX: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    PASSWORD_MIN_LENGTH: 8,
    PASSWORD_MAX_LENGTH: 128,
    API_KEY_MIN_LENGTH: 20,
    API_KEY_MAX_LENGTH: 200,
    SYMBOL_REGEX: /^[A-Z0-9]{3,10}$/,
    AMOUNT_MIN: 0.01,
    AMOUNT_MAX: 1000000,
  },

  // Security headers
  SECURITY_HEADERS: {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=(), payment=(), usb=()',
  },
};

// Input sanitization
export const sanitizeInput = (input: string): string => {
  if (typeof input !== 'string') return input;

  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  }).trim();
};

// XSS protection
export const sanitizeHTML = (html: string): string => {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
    ALLOWED_ATTR: [],
  });
};

// Input validation
export const validateEmail = (email: string): boolean => {
  return SECURITY_CONFIG.VALIDATION.EMAIL_REGEX.test(email);
};

export const validatePassword = (password: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (password.length < SECURITY_CONFIG.VALIDATION.PASSWORD_MIN_LENGTH) {
    errors.push(`Password must be at least ${SECURITY_CONFIG.VALIDATION.PASSWORD_MIN_LENGTH} characters`);
  }

  if (password.length > SECURITY_CONFIG.VALIDATION.PASSWORD_MAX_LENGTH) {
    errors.push(`Password must be no more than ${SECURITY_CONFIG.VALIDATION.PASSWORD_MAX_LENGTH} characters`);
  }

  if (!/(?=.*[a-z])/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/(?=.*[A-Z])/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/(?=.*\d)/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (!/(?=.*[@$!%*?&])/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  // Check for common weak patterns
  const weakPatterns = ['password', '123456', 'qwerty', 'admin', 'user'];
  if (weakPatterns.some(pattern => password.toLowerCase().includes(pattern))) {
    errors.push('Password contains common weak patterns');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

export const validateApiKey = (apiKey: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (apiKey.length < SECURITY_CONFIG.VALIDATION.API_KEY_MIN_LENGTH) {
    errors.push(`API key must be at least ${SECURITY_CONFIG.VALIDATION.API_KEY_MIN_LENGTH} characters`);
  }

  if (apiKey.length > SECURITY_CONFIG.VALIDATION.API_KEY_MAX_LENGTH) {
    errors.push(`API key must be no more than ${SECURITY_CONFIG.VALIDATION.API_KEY_MAX_LENGTH} characters`);
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(apiKey)) {
    errors.push('API key contains invalid characters');
  }

  if (apiKey.includes('test') || apiKey.includes('demo') || apiKey.includes('example')) {
    errors.push('API key appears to be a test/demo key');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

export const validateSymbol = (symbol: string): boolean => {
  return SECURITY_CONFIG.VALIDATION.SYMBOL_REGEX.test(symbol);
};

export const validateAmount = (amount: number): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (amount < SECURITY_CONFIG.VALIDATION.AMOUNT_MIN) {
    errors.push(`Amount must be at least ${SECURITY_CONFIG.VALIDATION.AMOUNT_MIN}`);
  }

  if (amount > SECURITY_CONFIG.VALIDATION.AMOUNT_MAX) {
    errors.push(`Amount must be no more than ${SECURITY_CONFIG.VALIDATION.AMOUNT_MAX}`);
  }

  if (!Number.isFinite(amount)) {
    errors.push('Amount must be a valid number');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

// Rate limiting
class RateLimiter {
  private requests: Map<string, number[]> = new Map();

  isAllowed(key: string, limit: number, windowMs: number): boolean {
    const now = Date.now();
    const requests = this.requests.get(key) || [];

    // Remove old requests outside the window
    const validRequests = requests.filter(time => now - time < windowMs);

    if (validRequests.length >= limit) {
      return false;
    }

    // Add current request
    validRequests.push(now);
    this.requests.set(key, validRequests);

    return true;
  }

  getRemainingRequests(key: string, limit: number, windowMs: number): number {
    const now = Date.now();
    const requests = this.requests.get(key) || [];
    const validRequests = requests.filter(time => now - time < windowMs);

    return Math.max(0, limit - validRequests.length);
  }

  getResetTime(key: string, windowMs: number): number {
    const now = Date.now();
    const requests = this.requests.get(key) || [];
    const validRequests = requests.filter(time => now - time < windowMs);

    if (validRequests.length === 0) return now;

    return Math.min(...validRequests) + windowMs;
  }
}

export const rateLimiter = new RateLimiter();

// CSRF protection
export const generateCSRFToken = (): string => {
  return CryptoJS.lib.WordArray.random(32).toString();
};

export const validateCSRFToken = (token: string, expectedToken: string): boolean => {
  return token === expectedToken;
};

// Secure storage
export const secureStorage = {
  setItem: (key: string, value: string): void => {
    try {
      const encrypted = CryptoJS.AES.encrypt(value, process.env.VITE_ENCRYPTION_KEY || 'default-key').toString();
      localStorage.setItem(key, encrypted);
    } catch (error) {
      console.error('Failed to store item securely:', error);
    }
  },

  getItem: (key: string): string | null => {
    try {
      const encrypted = localStorage.getItem(key);
      if (!encrypted) return null;

      const decrypted = CryptoJS.AES.decrypt(encrypted, process.env.VITE_ENCRYPTION_KEY || 'default-key');
      return decrypted.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      console.error('Failed to retrieve item securely:', error);
      return null;
    }
  },

  removeItem: (key: string): void => {
    localStorage.removeItem(key);
  },

  clear: (): void => {
    localStorage.clear();
  },
};

// Security monitoring
export const securityMonitor = {
  logSuspiciousActivity: (activity: string, details: Record<string, any>): void => {
    console.warn('Suspicious activity detected:', {
      activity,
      details,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    });
  },

  logSecurityEvent: (event: string, details: Record<string, any>): void => {
    console.info('Security event:', {
      event,
      details,
      timestamp: new Date().toISOString(),
    });
  },
};

// Content Security Policy
export const setCSP = (): void => {
  const cspHeader = Object.entries(SECURITY_CONFIG.CSP)
    .map(([directive, sources]) => `${directive} ${sources.join(' ')}`)
    .join('; ');

  const meta = document.createElement('meta');
  meta.httpEquiv = 'Content-Security-Policy';
  meta.content = cspHeader;
  document.head.appendChild(meta);
};

// Security headers
export const setSecurityHeaders = (): void => {
  Object.entries(SECURITY_CONFIG.SECURITY_HEADERS).forEach(([header, value]) => {
    // Note: In a real application, these would be set by the server
    // This is just for demonstration
    console.log(`Security header: ${header}: ${value}`);
  });
};

// Initialize security
export const initializeSecurity = (): void => {
  setCSP();
  setSecurityHeaders();

  // Monitor for suspicious activity
  window.addEventListener('beforeunload', () => {
    securityMonitor.logSecurityEvent('page_unload', {
      url: window.location.href,
      timestamp: new Date().toISOString(),
    });
  });

  // Monitor for XSS attempts
  const originalConsoleError = console.error;
  console.error = (...args) => {
    const message = args.join(' ');
    if (message.includes('script') || message.includes('javascript:')) {
      securityMonitor.logSuspiciousActivity('potential_xss', { message });
    }
    originalConsoleError.apply(console, args);
  };
};

// Export security configuration
export { SECURITY_CONFIG };
