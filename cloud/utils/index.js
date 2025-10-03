// =============================================================================
// CryptoPulse Cloud Utils - Utility Functions
// =============================================================================
// Common utility functions for cloud functions
const crypto = require('crypto');
const { format, addDays, addHours, isBefore, differenceInMilliseconds } = require('date-fns');
// Data validation utilities
const validationUtils = {
  isValidEmail: (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },
  isValidPhone: (phone) => {
    const phoneRegex = /^[6-9]\d{9}$/;
    return phoneRegex.test(phone);
  },
  isValidTradingPair: (pair) => {
    const pairRegex = /^[A-Z]{3,10}\/[A-Z]{3,10}$/;
    return pairRegex.test(pair);
  },
  isValidAmount: (amount) => {
    return !isNaN(amount) && parseFloat(amount) > 0;
  },
  isValidPrice: (price) => {
    return !isNaN(price) && parseFloat(price) >= 0;
  }
};
// Encryption utilities
const encryptionUtils = {
  encrypt: (text, key) => {
    const algorithm = 'aes-256-cbc';
    const iv = crypto.randomBytes(16);
    const keyBuffer = crypto.scryptSync(key, 'salt', 32);
    const cipher = crypto.createCipheriv(algorithm, keyBuffer, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  },
  decrypt: (encryptedText, key) => {
    const algorithm = 'aes-256-cbc';
    const textParts = encryptedText.split(':');
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encrypted = textParts.join(':');
    const keyBuffer = crypto.scryptSync(key, 'salt', 32);
    const decipher = crypto.createDecipheriv(algorithm, keyBuffer, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  },
  hash: (text) => {
    return crypto.createHash('sha256').update(text).digest('hex');
  },
  generateRandomString: (length = 32) => {
    return crypto.randomBytes(length).toString('hex');
  }
};
// Date and time utilities
const dateUtils = {
  formatDate: (date, formatStr = 'yyyy-MM-dd HH:mm:ss') => {
    return format(new Date(date), formatStr);
  },
  getTimestamp: () => {
    return Date.now();
  },
  getISOTimestamp: () => {
    return new Date().toISOString();
  },
  addDays: (date, days) => {
    return addDays(new Date(date), days);
  },
  addHours: (date, hours) => {
    return addHours(new Date(date), hours);
  },
  isExpired: (date) => {
    return isBefore(new Date(date), new Date());
  },
  getTimeDifference: (startDate, endDate) => {
    return differenceInMilliseconds(new Date(endDate), new Date(startDate));
  }
};
// Trading utilities
const tradingUtils = {
  calculateProfitLoss: (entryPrice, exitPrice, quantity, side) => {
    const priceDiff = side === 'buy' ? exitPrice - entryPrice : entryPrice - exitPrice;
    return priceDiff * quantity;
  },
  calculateProfitPercentage: (entryPrice, exitPrice, side) => {
    const priceDiff = side === 'buy' ? exitPrice - entryPrice : entryPrice - exitPrice;
    return (priceDiff / entryPrice) * 100;
  },
  calculatePositionSize: (accountBalance, riskPercentage, stopLossPrice, entryPrice) => {
    const riskAmount = accountBalance * (riskPercentage / 100);
    const priceRisk = Math.abs(entryPrice - stopLossPrice);
    return riskAmount / priceRisk;
  },
  formatTradingPair: (pair) => {
    return pair.replace('/', '').toUpperCase();
  },
  parseTradingPair: (pair) => {
    const match = pair.match(/^([A-Z]{3,10})([A-Z]{3,10})$/);
    if (match) {
      return {
        base: match[1],
        quote: match[2],
        formatted: `${match[1]}/${match[2]}`
      };
    }
    return null;
  },
  calculateMovingAverage: (prices, period) => {
    if (prices.length < period) return null;
    const sum = prices.slice(-period).reduce((a, b) => a + b, 0);
    return sum / period;
  },
  calculateRSI: (prices, period = 14) => {
    if (prices.length < period + 1) return null;
    let gains = 0;
    let losses = 0;
    for (let i = 1; i <= period; i++) {
      const change = prices[i] - prices[i - 1];
      if (change > 0) gains += change;
      else losses -= change;
    }
    const avgGain = gains / period;
    const avgLoss = losses / period;
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }
};
// API utilities
const apiUtils = {
  createSignature: (queryString, secret, algorithm = 'sha256') => {
    return crypto.createHmac(algorithm, secret).update(queryString).digest('hex');
  },
  generateNonce: () => {
    return Date.now().toString();
  },
  formatQueryString: (params) => {
    return Object.keys(params)
      .sort()
      .map(key => `${key}=${encodeURIComponent(params[key])}`)
      .join('&');
  },
  makeRequest: async (url, options = {}) => {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      throw error;
    }
  }
};
// Error handling utilities
const errorUtils = {
  createError: (message, code = 'UNKNOWN_ERROR', statusCode = 500) => {
    const error = new Error(message);
    error.code = code;
    error.statusCode = statusCode;
    return error;
  },
  handleError: (error, context = '') => {
    return {
      success: false,
      error: error.message || 'An unknown error occurred',
      code: error.code || 'UNKNOWN_ERROR',
      timestamp: new Date().toISOString()
    };
  },
  isRetryableError: (error) => {
    const retryableCodes = ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNREFUSED'];
    return retryableCodes.includes(error.code) || error.status >= 500;
  }
};
// Logging utilities
const loggingUtils = {
  logInfo: (message, data = {}) => {
    const logEntry = {
      level: 'info',
      message,
      data,
      timestamp: new Date().toISOString(),
      service: 'cloud-functions'
    };
    console.log(JSON.stringify(logEntry));
  },
  logError: (message, error = {}) => {
    const logEntry = {
      level: 'error',
      message,
      error: error.message || error,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      service: 'cloud-functions'
    };
    console.error(JSON.stringify(logEntry));
  },
  logWarning: (message, data = {}) => {
    const logEntry = {
      level: 'warn',
      message,
      data,
      timestamp: new Date().toISOString(),
      service: 'cloud-functions'
    };
    console.warn(JSON.stringify(logEntry));
  },
  logDebug: (message, data = {}) => {
    if (process.env.NODE_ENV === 'development') {
      const logEntry = {
        level: 'debug',
        message,
        data,
        timestamp: new Date().toISOString(),
        service: 'cloud-functions'
      };
      console.debug(JSON.stringify(logEntry));
    }
  }
};
// Rate limiting utilities
const rateLimitUtils = {
  createRateLimiter: (maxRequests, windowMs) => {
    const requests = new Map();
    return (identifier) => {
      const now = Date.now();
      const windowStart = now - windowMs;
      // Clean old requests
      for (const [key, timestamp] of requests.entries()) {
        if (timestamp < windowStart) {
          requests.delete(key);
        }
      }
      // Check current requests
      const currentRequests = Array.from(requests.values())
        .filter(timestamp => timestamp > windowStart).length;
      if (currentRequests >= maxRequests) {
        return false; // Rate limit exceeded
      }
      requests.set(identifier, now);
      return true; // Request allowed
    };
  }
};
// Export all utilities
module.exports = {
  validation: validationUtils,
  encryption: encryptionUtils,
  date: dateUtils,
  trading: tradingUtils,
  api: apiUtils,
  error: errorUtils,
  logging: loggingUtils,
  rateLimit: rateLimitUtils
};
