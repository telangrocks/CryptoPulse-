/**
 * Production-Ready Authentication Module for CryptoPulse Backend
 * Implements secure authentication and session management
 * 
 * @author Shrikant Telang
 * @version 2.0.0
 */

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Security configuration
const SECURITY_CONFIG = {
  JWT_SECRET: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY || 'your-encryption-key-32-chars-long',
  CSRF_SECRET: process.env.CSRF_SECRET || 'your-csrf-secret-key',
  BCRYPT_ROUNDS: 12,
  TOKEN_EXPIRY: '24h',
  REFRESH_TOKEN_EXPIRY: '7d'
};

/**
 * Password hashing utility
 */
const hashPassword = async (password) => {
  return await bcrypt.hash(password, SECURITY_CONFIG.BCRYPT_ROUNDS);
};

/**
 * Password verification utility
 */
const verifyPassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};

/**
 * JWT token generation
 */
const generateTokens = (userId, email) => {
  const payload = { userId, email, iat: Math.floor(Date.now() / 1000) };
  
  const accessToken = jwt.sign(payload, SECURITY_CONFIG.JWT_SECRET, {
    expiresIn: SECURITY_CONFIG.TOKEN_EXPIRY,
    issuer: 'cryptopulse',
    audience: 'cryptopulse-users'
  });
  
  const refreshToken = jwt.sign(
    { userId, type: 'refresh' }, 
    SECURITY_CONFIG.JWT_SECRET, 
    { expiresIn: SECURITY_CONFIG.REFRESH_TOKEN_EXPIRY }
  );
  
  return { accessToken, refreshToken };
};

/**
 * JWT token verification
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, SECURITY_CONFIG.JWT_SECRET, {
      issuer: 'cryptopulse',
      audience: 'cryptopulse-users'
    });
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};

/**
 * Authentication middleware
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({
      error: 'Access denied',
      message: 'No token provided'
    });
  }
  
  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({
      error: 'Access denied',
      message: 'Invalid or expired token'
    });
  }
};

/**
 * CSRF protection middleware
 */
const csrfProtection = (req, res, next) => {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    return next();
  }
  
  const csrfToken = req.headers['x-csrf-token'];
  const sessionToken = req.headers['x-session-token'];
  
  if (!csrfToken || !sessionToken) {
    return res.status(403).json({
      error: 'CSRF token missing',
      message: 'CSRF token and session token are required'
    });
  }
  
  // Verify CSRF token
  const expectedToken = crypto
    .createHmac('sha256', SECURITY_CONFIG.CSRF_SECRET)
    .update(sessionToken)
    .digest('hex');
  
  if (csrfToken !== expectedToken) {
    return res.status(403).json({
      error: 'Invalid CSRF token',
      message: 'CSRF token verification failed'
    });
  }
  
  next();
};

/**
 * Data encryption utility
 */
const encryptData = (data) => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipher('aes-256-cbc', SECURITY_CONFIG.ENCRYPTION_KEY);
  let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
};

/**
 * Data decryption utility
 */
const decryptData = (encryptedData) => {
  try {
    const parts = encryptedData.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const decipher = crypto.createDecipher('aes-256-cbc', SECURITY_CONFIG.ENCRYPTION_KEY);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return JSON.parse(decrypted);
  } catch (error) {
    throw new Error('Failed to decrypt data');
  }
};

module.exports = {
  // Authentication
  authenticateToken,
  generateTokens,
  verifyToken,
  hashPassword,
  verifyPassword,
  
  // Security
  csrfProtection,
  encryptData,
  decryptData,
  
  // Configuration
  SECURITY_CONFIG
};
