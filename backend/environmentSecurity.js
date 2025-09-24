/**
 * Environment Security Enhancement System
 * Comprehensive environment validation and secrets management
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { logger } = require('./structuredLogger');

class EnvironmentSecurity {
  constructor() {
    this.requiredEnvVars = [
      'NODE_ENV',
      'PORT',
      'SESSION_SECRET',
      'ENCRYPTION_KEY',
      'REDIS_URL',
      'REDIS_PASSWORD',
      'MONGO_URL',
      'MONGO_INITDB_ROOT_USERNAME',
      'MONGO_INITDB_ROOT_PASSWORD'
    ];

    this.sensitiveEnvVars = [
      'SESSION_SECRET',
      'ENCRYPTION_KEY',
      'REDIS_PASSWORD',
      'MONGO_INITDB_ROOT_PASSWORD',
      'JWT_SECRET',
      'API_SECRET',
      'ENCRYPTION_KEY'
    ];

    this.envValidationRules = {
      'NODE_ENV': { type: 'string', values: ['development', 'production', 'test'] },
      'PORT': { type: 'number', min: 1, max: 65535 },
      'SESSION_SECRET': { type: 'string', minLength: 32 },
      'ENCRYPTION_KEY': { type: 'string', minLength: 32 },
      'REDIS_URL': { type: 'string', format: 'url' },
      'MONGO_URL': { type: 'string', format: 'url' },
      'LOG_LEVEL': { type: 'string', values: ['error', 'warn', 'info', 'debug'] }
    };

    this.secretsRotation = new Map();
    this.vaultConnections = new Map();
  }

  // Validate environment variables
  validateEnvironment() {
    const errors = [];
    const warnings = [];

    // Check required variables
    for (const envVar of this.requiredEnvVars) {
      if (!process.env[envVar]) {
        errors.push(`Missing required environment variable: ${envVar}`);
      }
    }

    // Validate variable formats
    for (const [envVar, rules] of Object.entries(this.envValidationRules)) {
      const value = process.env[envVar];
      
      if (value) {
        const validationResult = this.validateVariable(envVar, value, rules);
        if (validationResult.error) {
          errors.push(validationResult.error);
        }
        if (validationResult.warning) {
          warnings.push(validationResult.warning);
        }
      }
    }

    // Check for sensitive variables in production
    if (process.env.NODE_ENV === 'production') {
      for (const envVar of this.sensitiveEnvVars) {
        const value = process.env[envVar];
        if (value && this.isDefaultValue(value)) {
          warnings.push(`Using default value for sensitive variable in production: ${envVar}`);
        }
      }
    }

    // Log results
    if (errors.length > 0) {
      logger.error('Environment validation failed', {
        type: 'environment_validation',
        errors,
        warnings
      });
      throw new Error(`Environment validation failed: ${errors.join(', ')}`);
    }

    if (warnings.length > 0) {
      logger.warn('Environment validation warnings', {
        type: 'environment_validation',
        warnings
      });
    }

    logger.info('Environment validation passed', {
      type: 'environment_validation',
      validatedVariables: Object.keys(this.envValidationRules).length
    });

    return { errors, warnings };
  }

  // Validate individual variable
  validateVariable(name, value, rules) {
    const result = {};

    // Type validation
    if (rules.type === 'number') {
      const numValue = parseInt(value);
      if (isNaN(numValue)) {
        result.error = `Environment variable ${name} must be a number, got: ${value}`;
        return result;
      }

      if (rules.min !== undefined && numValue < rules.min) {
        result.error = `Environment variable ${name} must be >= ${rules.min}, got: ${numValue}`;
        return result;
      }

      if (rules.max !== undefined && numValue > rules.max) {
        result.error = `Environment variable ${name} must be <= ${rules.max}, got: ${numValue}`;
        return result;
      }
    }

    // String validation
    if (rules.type === 'string') {
      if (rules.minLength && value.length < rules.minLength) {
        result.error = `Environment variable ${name} must be at least ${rules.minLength} characters long`;
        return result;
      }

      if (rules.maxLength && value.length > rules.maxLength) {
        result.error = `Environment variable ${name} must be at most ${rules.maxLength} characters long`;
        return result;
      }

      if (rules.values && !rules.values.includes(value)) {
        result.error = `Environment variable ${name} must be one of: ${rules.values.join(', ')}, got: ${value}`;
        return result;
      }

      if (rules.format === 'url') {
        try {
          new URL(value);
        } catch {
          result.error = `Environment variable ${name} must be a valid URL, got: ${value}`;
          return result;
        }
      }
    }

    return result;
  }

  // Check if value is a default value
  isDefaultValue(value) {
    const defaultValues = [
      'supersecretdefaultsessionkey',
      'a_very_strong_32_char_encryption_key!',
      'password',
      'admin',
      'secret',
      'default'
    ];

    return defaultValues.includes(value);
  }

  // Generate secure random values
  generateSecureValue(type, length = 32) {
    switch (type) {
      case 'session_secret':
        return crypto.randomBytes(32).toString('hex');
      case 'encryption_key':
        return crypto.randomBytes(32).toString('hex');
      case 'jwt_secret':
        return crypto.randomBytes(64).toString('hex');
      case 'api_secret':
        return crypto.randomBytes(16).toString('hex');
      default:
        return crypto.randomBytes(length).toString('hex');
    }
  }

  // Rotate secrets
  async rotateSecret(secretName, newValue = null) {
    const rotationId = crypto.randomBytes(16).toString('hex');
    const timestamp = new Date().toISOString();

    try {
      const oldValue = process.env[secretName];
      const secretValue = newValue || this.generateSecureValue(secretName);

      // Store rotation record
      this.secretsRotation.set(rotationId, {
        secretName,
        oldValue: oldValue ? this.maskValue(oldValue) : null,
        newValue: this.maskValue(secretValue),
        timestamp,
        status: 'pending'
      });

      // Update environment variable
      process.env[secretName] = secretValue;

      // Update rotation status
      this.secretsRotation.get(rotationId).status = 'completed';

      logger.info('Secret rotated successfully', {
        type: 'secret_rotation',
        secretName,
        rotationId,
        timestamp
      });

      return { rotationId, timestamp, status: 'completed' };
    } catch (error) {
      // Update rotation status
      if (this.secretsRotation.has(rotationId)) {
        this.secretsRotation.get(rotationId).status = 'failed';
        this.secretsRotation.get(rotationId).error = error.message;
      }

      logger.error('Secret rotation failed', {
        type: 'secret_rotation',
        secretName,
        rotationId,
        error: error.message
      });

      throw error;
    }
  }

  // Mask sensitive values for logging
  maskValue(value) {
    if (!value || value.length < 8) {
      return '***';
    }
    return value.substring(0, 4) + '***' + value.substring(value.length - 4);
  }

  // Vault-based secret management
  async connectToVault(vaultConfig) {
    const connectionId = crypto.randomBytes(16).toString('hex');
    
    try {
      // Simulate vault connection (replace with actual vault implementation)
      const vaultConnection = {
        id: connectionId,
        url: vaultConfig.url,
        token: vaultConfig.token,
        connected: true,
        connectedAt: new Date().toISOString()
      };

      this.vaultConnections.set(connectionId, vaultConnection);

      logger.info('Connected to vault', {
        type: 'vault_connection',
        connectionId,
        url: vaultConfig.url
      });

      return connectionId;
    } catch (error) {
      logger.error('Failed to connect to vault', {
        type: 'vault_connection',
        error: error.message
      });
      throw error;
    }
  }

  // Get secret from vault
  async getSecretFromVault(connectionId, secretPath) {
    try {
      const connection = this.vaultConnections.get(connectionId);
      if (!connection) {
        throw new Error('Vault connection not found');
      }

      // Simulate vault secret retrieval (replace with actual vault implementation)
      const secret = {
        path: secretPath,
        value: crypto.randomBytes(32).toString('hex'),
        retrievedAt: new Date().toISOString()
      };

      logger.info('Secret retrieved from vault', {
        type: 'vault_secret',
        connectionId,
        secretPath: this.maskValue(secretPath)
      });

      return secret;
    } catch (error) {
      logger.error('Failed to retrieve secret from vault', {
        type: 'vault_secret',
        connectionId,
        secretPath,
        error: error.message
      });
      throw error;
    }
  }

  // Environment-specific security configurations
  getSecurityConfig() {
    const isProduction = process.env.NODE_ENV === 'production';
    const isDevelopment = process.env.NODE_ENV === 'development';
    const isTest = process.env.NODE_ENV === 'test';

    const baseConfig = {
      cors: {
        origin: isProduction ? ['https://cryptopulse.com'] : true,
        credentials: true,
        optionsSuccessStatus: 200
      },
      session: {
        secure: isProduction,
        httpOnly: true,
        sameSite: isProduction ? 'strict' : 'lax',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      },
      logging: {
        level: isProduction ? 'info' : 'debug',
        console: !isProduction,
        file: true
      },
      rateLimit: {
        enabled: true,
        strict: isProduction
      },
      ssl: {
        required: isProduction,
        redirect: isProduction
      }
    };

    // Add environment-specific overrides
    if (isDevelopment) {
      baseConfig.cors.origin = true;
      baseConfig.session.secure = false;
      baseConfig.logging.console = true;
    }

    if (isTest) {
      baseConfig.rateLimit.enabled = false;
      baseConfig.logging.level = 'error';
    }

    return baseConfig;
  }

  // Security headers configuration
  getSecurityHeaders() {
    const isProduction = process.env.NODE_ENV === 'production';

    return {
      'Strict-Transport-Security': isProduction ? 'max-age=31536000; includeSubDomains; preload' : '',
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
      'Content-Security-Policy': this.getCSPHeader(isProduction)
    };
  }

  // Content Security Policy header
  getCSPHeader(isProduction) {
    const baseCSP = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' https://fonts.gstatic.com",
      "connect-src 'self' https://api.binance.com wss://stream.binance.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'"
    ];

    if (isProduction) {
      baseCSP.push("upgrade-insecure-requests");
    }

    return baseCSP.join('; ');
  }

  // Get environment security report
  getSecurityReport() {
    const report = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      validation: {
        required: this.requiredEnvVars.length,
        present: this.requiredEnvVars.filter(v => process.env[v]).length,
        sensitive: this.sensitiveEnvVars.filter(v => process.env[v] && !this.isDefaultValue(process.env[v])).length
      },
      secrets: {
        rotations: this.secretsRotation.size,
        vaultConnections: this.vaultConnections.size
      },
      security: this.getSecurityConfig(),
      headers: this.getSecurityHeaders()
    };

    return report;
  }

  // Cleanup old rotation records
  cleanup() {
    const now = Date.now();
    const cleanupThreshold = 7 * 24 * 60 * 60 * 1000; // 7 days

    for (const [rotationId, record] of this.secretsRotation.entries()) {
      if (now - new Date(record.timestamp).getTime() > cleanupThreshold) {
        this.secretsRotation.delete(rotationId);
      }
    }

    logger.info('Environment security cleanup completed', {
      type: 'environment_security_cleanup',
      rotationsCleaned: this.secretsRotation.size
    });
  }
}

// Create singleton instance
let environmentSecurityInstance;

function getEnvironmentSecurity() {
  if (!environmentSecurityInstance) {
    environmentSecurityInstance = new EnvironmentSecurity();
    
    // Setup cleanup interval
    setInterval(() => {
      environmentSecurityInstance.cleanup();
    }, 24 * 60 * 60 * 1000); // Cleanup every day
  }
  
  return environmentSecurityInstance;
}

module.exports = { EnvironmentSecurity, getEnvironmentSecurity };
