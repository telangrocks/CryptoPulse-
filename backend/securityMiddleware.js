/**
 * Production-Ready Security Middleware for CryptoPulse Backend
 * Implements comprehensive security measures for Back4App deployment
 * 
 * @author Shrikant Telang
 * @version 2.0.0
 */

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Joi = require('joi');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');

// Security configuration
const SECURITY_CONFIG = {
  JWT_SECRET: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY || 'your-encryption-key-32-chars-long',
  CSRF_SECRET: process.env.CSRF_SECRET || 'your-csrf-secret-key',
  BCRYPT_ROUNDS: 12,
  TOKEN_EXPIRY: '24h',
  REFRESH_TOKEN_EXPIRY: '7d',
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_TIME: 15 * 60 * 1000, // 15 minutes
  RATE_LIMIT_WINDOW: 15 * 60 * 1000, // 15 minutes
  MAX_REQUESTS: 100
};

// Rate limiting storage
const loginAttempts = new Map();
const requestCounts = new Map();

/**
 * Advanced Rate Limiting with IP and User-based limits
 */
const createRateLimiter = (windowMs, max, keyGenerator = (req) => req.ip) => {
  return rateLimit({
    windowMs,
    max,
    keyGenerator,
    message: {
      error: 'Too many requests',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter: Math.ceil(windowMs / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({
        error: 'Rate limit exceeded',
        message: 'Too many requests from this IP, please try again later.',
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }
  });
};

/**
 * Login attempt rate limiting
 */
const loginRateLimiter = (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  const attempts = loginAttempts.get(ip) || { count: 0, lastAttempt: 0 };
  
  // Reset if lockout time has passed
  if (now - attempts.lastAttempt > SECURITY_CONFIG.LOCKOUT_TIME) {
    attempts.count = 0;
  }
  
  // Check if too many attempts
  if (attempts.count >= SECURITY_CONFIG.MAX_LOGIN_ATTEMPTS) {
    return res.status(429).json({
      error: 'Too many login attempts',
      message: 'Account temporarily locked due to too many failed login attempts.',
      retryAfter: Math.ceil((SECURITY_CONFIG.LOCKOUT_TIME - (now - attempts.lastAttempt)) / 1000)
    });
  }
  
  // Record attempt
  attempts.count++;
  attempts.lastAttempt = now;
  loginAttempts.set(ip, attempts);
  
  next();
};

/**
 * API rate limiting
 */
const apiRateLimiter = createRateLimiter(
  SECURITY_CONFIG.RATE_LIMIT_WINDOW,
  SECURITY_CONFIG.MAX_REQUESTS
);

/**
 * Trading API rate limiting (more restrictive)
 */
const tradingRateLimiter = createRateLimiter(
  5 * 60 * 1000, // 5 minutes
  20 // 20 requests per 5 minutes
);

module.exports = {
  // Rate limiters
  apiRateLimiter,
  tradingRateLimiter,
  loginRateLimiter,
  
  // Configuration
  SECURITY_CONFIG
};