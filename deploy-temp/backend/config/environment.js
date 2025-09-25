/**
 * Environment Configuration Manager
 * 
 * This module handles all environment variable validation, configuration,
 * and provides a centralized way to access configuration values.
 * 
 * @author Shrikant Telang
 * @version 1.0.0
 */

const Joi = require('joi');
const { structuredLogger } = require('../structuredLogger');

// Environment validation schema
const envSchema = Joi.object({
  // Application Configuration
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().port().default(3000),
  HOST: Joi.string().hostname().default('localhost'),
  
  // Database Configuration
  DATABASE_URL: Joi.string().uri().required(),
  DATABASE_HOST: Joi.string().hostname().default('localhost'),
  DATABASE_PORT: Joi.number().port().default(5432),
  DATABASE_NAME: Joi.string().required(),
  DATABASE_USER: Joi.string().required(),
  DATABASE_PASSWORD: Joi.string().required(),
  DATABASE_SSL: Joi.boolean().default(false),
  DATABASE_POOL_MIN: Joi.number().integer().min(1).default(2),
  DATABASE_POOL_MAX: Joi.number().integer().min(1).default(10),
  
  // Redis Configuration
  REDIS_URL: Joi.string().uri().required(),
  REDIS_HOST: Joi.string().hostname().default('localhost'),
  REDIS_PORT: Joi.number().port().default(6379),
  REDIS_PASSWORD: Joi.string().optional(),
  REDIS_DB: Joi.number().integer().min(0).default(0),
  
  // Back4App Configuration
  BACK4APP_APP_ID: Joi.string().required(),
  BACK4APP_JAVASCRIPT_KEY: Joi.string().required(),
  BACK4APP_MASTER_KEY: Joi.string().required(),
  BACK4APP_SERVER_URL: Joi.string().uri().required(),
  
  // Security Configuration
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN: Joi.string().default('24h'),
  ENCRYPTION_KEY: Joi.string().length(64).required(),
  SESSION_SECRET: Joi.string().min(32).required(),
  CSRF_SECRET: Joi.string().min(32).required(),
  
  // API Keys
  BINANCE_API_KEY: Joi.string().optional(),
  BINANCE_SECRET_KEY: Joi.string().optional(),
  COINBASE_API_KEY: Joi.string().optional(),
  COINBASE_SECRET_KEY: Joi.string().optional(),
  ALPHA_VANTAGE_API_KEY: Joi.string().optional(),
  
  // Email Configuration
  SMTP_HOST: Joi.string().hostname().optional(),
  SMTP_PORT: Joi.number().port().default(587),
  SMTP_USER: Joi.string().email().optional(),
  SMTP_PASSWORD: Joi.string().optional(),
  SMTP_FROM: Joi.string().email().optional(),
  
  // SMS Configuration
  TWILIO_ACCOUNT_SID: Joi.string().optional(),
  TWILIO_AUTH_TOKEN: Joi.string().optional(),
  TWILIO_PHONE_NUMBER: Joi.string().optional(),
  
  // Payment Configuration
  STRIPE_SECRET_KEY: Joi.string().optional(),
  STRIPE_PUBLISHABLE_KEY: Joi.string().optional(),
  STRIPE_WEBHOOK_SECRET: Joi.string().optional(),
  PAYPAL_CLIENT_ID: Joi.string().optional(),
  PAYPAL_CLIENT_SECRET: Joi.string().optional(),
  RAZORPAY_KEY_ID: Joi.string().optional(),
  RAZORPAY_KEY_SECRET: Joi.string().optional(),
  CASHFREE_APP_ID: Joi.string().optional(),
  CASHFREE_SECRET_KEY: Joi.string().optional(),
  
  // Monitoring Configuration
  PROMETHEUS_PORT: Joi.number().port().default(9090),
  GRAFANA_PORT: Joi.number().port().default(3001),
  LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'debug').default('info'),
  ENABLE_CONSOLE_LOGS: Joi.boolean().default(true),
  
  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: Joi.number().integer().min(1000).default(60000),
  RATE_LIMIT_MAX_REQUESTS: Joi.number().integer().min(1).default(100),
  
  // CORS Configuration
  ALLOWED_ORIGINS: Joi.string().optional(),
  CORS_CREDENTIALS: Joi.boolean().default(true),
  
  // SSL Configuration
  SSL_CERT_PATH: Joi.string().optional(),
  SSL_KEY_PATH: Joi.string().optional(),
  SSL_CA_PATH: Joi.string().optional(),
  
  // File Upload Configuration
  MAX_FILE_SIZE: Joi.number().integer().min(1024).default(10485760), // 10MB
  UPLOAD_PATH: Joi.string().default('./uploads'),
  
  // Cache Configuration
  CACHE_TTL: Joi.number().integer().min(1).default(3600),
  CACHE_MAX_SIZE: Joi.number().integer().min(1).default(1000),
  
  // Feature Flags
  ENABLE_FEATURE_FLAGS: Joi.boolean().default(true),
  ENABLE_AUDIT_LOGGING: Joi.boolean().default(true),
  ENABLE_COMPLIANCE: Joi.boolean().default(true),
  ENABLE_MONITORING: Joi.boolean().default(true),
  
  // Trading Configuration
  TRADING_ENABLED: Joi.boolean().default(true),
  MAX_TRADE_AMOUNT: Joi.number().positive().default(10000),
  MIN_TRADE_AMOUNT: Joi.number().positive().default(10),
  TRADING_FEE_PERCENTAGE: Joi.number().min(0).max(1).default(0.001),
  
  // Risk Management
  MAX_PORTFOLIO_RISK: Joi.number().min(0).max(1).default(0.2),
  STOP_LOSS_PERCENTAGE: Joi.number().min(0).max(1).default(0.05),
  TAKE_PROFIT_PERCENTAGE: Joi.number().min(0).max(1).default(0.15),
  
  // Backup Configuration
  BACKUP_ENABLED: Joi.boolean().default(true),
  BACKUP_SCHEDULE: Joi.string().default('0 2 * * *'), // Daily at 2 AM
  BACKUP_RETENTION_DAYS: Joi.number().integer().min(1).default(30),
  
  // Alert Configuration
  ALERT_EMAIL: Joi.string().email().optional(),
  ALERT_SLACK_WEBHOOK: Joi.string().uri().optional(),
  ALERT_DISCORD_WEBHOOK: Joi.string().uri().optional(),
  
  // Development Configuration
  ENABLE_DEBUG: Joi.boolean().default(false),
  ENABLE_PROFILING: Joi.boolean().default(false),
  ENABLE_MOCK_DATA: Joi.boolean().default(false)
});

// Configuration cache
let config = null;
let validationErrors = [];

/**
 * Validate and load environment configuration
 */
function loadConfiguration() {
  try {
    // Load environment variables
    const envVars = {
      NODE_ENV: process.env.NODE_ENV,
      PORT: process.env.PORT,
      HOST: process.env.HOST,
      DATABASE_URL: process.env.DATABASE_URL,
      DATABASE_HOST: process.env.DATABASE_HOST,
      DATABASE_PORT: process.env.DATABASE_PORT,
      DATABASE_NAME: process.env.DATABASE_NAME,
      DATABASE_USER: process.env.DATABASE_USER,
      DATABASE_PASSWORD: process.env.DATABASE_PASSWORD,
      DATABASE_SSL: process.env.DATABASE_SSL,
      DATABASE_POOL_MIN: process.env.DATABASE_POOL_MIN,
      DATABASE_POOL_MAX: process.env.DATABASE_POOL_MAX,
      REDIS_URL: process.env.REDIS_URL,
      REDIS_HOST: process.env.REDIS_HOST,
      REDIS_PORT: process.env.REDIS_PORT,
      REDIS_PASSWORD: process.env.REDIS_PASSWORD,
      REDIS_DB: process.env.REDIS_DB,
      BACK4APP_APP_ID: process.env.BACK4APP_APP_ID,
      BACK4APP_JAVASCRIPT_KEY: process.env.BACK4APP_JAVASCRIPT_KEY,
      BACK4APP_MASTER_KEY: process.env.BACK4APP_MASTER_KEY,
      BACK4APP_SERVER_URL: process.env.BACK4APP_SERVER_URL,
      JWT_SECRET: process.env.JWT_SECRET,
      JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN,
      ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
      SESSION_SECRET: process.env.SESSION_SECRET,
      CSRF_SECRET: process.env.CSRF_SECRET,
      BINANCE_API_KEY: process.env.BINANCE_API_KEY,
      BINANCE_SECRET_KEY: process.env.BINANCE_SECRET_KEY,
      COINBASE_API_KEY: process.env.COINBASE_API_KEY,
      COINBASE_SECRET_KEY: process.env.COINBASE_SECRET_KEY,
      ALPHA_VANTAGE_API_KEY: process.env.ALPHA_VANTAGE_API_KEY,
      SMTP_HOST: process.env.SMTP_HOST,
      SMTP_PORT: process.env.SMTP_PORT,
      SMTP_USER: process.env.SMTP_USER,
      SMTP_PASSWORD: process.env.SMTP_PASSWORD,
      SMTP_FROM: process.env.SMTP_FROM,
      TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
      TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
      TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER,
      STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
      STRIPE_PUBLISHABLE_KEY: process.env.STRIPE_PUBLISHABLE_KEY,
      STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
      PAYPAL_CLIENT_ID: process.env.PAYPAL_CLIENT_ID,
      PAYPAL_CLIENT_SECRET: process.env.PAYPAL_CLIENT_SECRET,
      RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID,
      RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET,
      CASHFREE_APP_ID: process.env.CASHFREE_APP_ID,
      CASHFREE_SECRET_KEY: process.env.CASHFREE_SECRET_KEY,
      PROMETHEUS_PORT: process.env.PROMETHEUS_PORT,
      GRAFANA_PORT: process.env.GRAFANA_PORT,
      LOG_LEVEL: process.env.LOG_LEVEL,
      ENABLE_CONSOLE_LOGS: process.env.ENABLE_CONSOLE_LOGS,
      RATE_LIMIT_WINDOW_MS: process.env.RATE_LIMIT_WINDOW_MS,
      RATE_LIMIT_MAX_REQUESTS: process.env.RATE_LIMIT_MAX_REQUESTS,
      ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS,
      CORS_CREDENTIALS: process.env.CORS_CREDENTIALS,
      SSL_CERT_PATH: process.env.SSL_CERT_PATH,
      SSL_KEY_PATH: process.env.SSL_KEY_PATH,
      SSL_CA_PATH: process.env.SSL_CA_PATH,
      MAX_FILE_SIZE: process.env.MAX_FILE_SIZE,
      UPLOAD_PATH: process.env.UPLOAD_PATH,
      CACHE_TTL: process.env.CACHE_TTL,
      CACHE_MAX_SIZE: process.env.CACHE_MAX_SIZE,
      ENABLE_FEATURE_FLAGS: process.env.ENABLE_FEATURE_FLAGS,
      ENABLE_AUDIT_LOGGING: process.env.ENABLE_AUDIT_LOGGING,
      ENABLE_COMPLIANCE: process.env.ENABLE_COMPLIANCE,
      ENABLE_MONITORING: process.env.ENABLE_MONITORING,
      TRADING_ENABLED: process.env.TRADING_ENABLED,
      MAX_TRADE_AMOUNT: process.env.MAX_TRADE_AMOUNT,
      MIN_TRADE_AMOUNT: process.env.MIN_TRADE_AMOUNT,
      TRADING_FEE_PERCENTAGE: process.env.TRADING_FEE_PERCENTAGE,
      MAX_PORTFOLIO_RISK: process.env.MAX_PORTFOLIO_RISK,
      STOP_LOSS_PERCENTAGE: process.env.STOP_LOSS_PERCENTAGE,
      TAKE_PROFIT_PERCENTAGE: process.env.TAKE_PROFIT_PERCENTAGE,
      BACKUP_ENABLED: process.env.BACKUP_ENABLED,
      BACKUP_SCHEDULE: process.env.BACKUP_SCHEDULE,
      BACKUP_RETENTION_DAYS: process.env.BACKUP_RETENTION_DAYS,
      ALERT_EMAIL: process.env.ALERT_EMAIL,
      ALERT_SLACK_WEBHOOK: process.env.ALERT_SLACK_WEBHOOK,
      ALERT_DISCORD_WEBHOOK: process.env.ALERT_DISCORD_WEBHOOK,
      ENABLE_DEBUG: process.env.ENABLE_DEBUG,
      ENABLE_PROFILING: process.env.ENABLE_PROFILING,
      ENABLE_MOCK_DATA: process.env.ENABLE_MOCK_DATA
    };
    
    // Validate configuration
    const { error, value } = envSchema.validate(envVars, {
      abortEarly: false,
      stripUnknown: true
    });
    
    if (error) {
      validationErrors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));
      
      structuredLogger.error('Environment configuration validation failed:', validationErrors);
      throw new Error('Environment configuration validation failed');
    }
    
    config = value;
    structuredLogger.info('Environment configuration loaded successfully');
    
    return config;
    
  } catch (error) {
    structuredLogger.error('Failed to load environment configuration:', error);
    throw error;
  }
}

/**
 * Get configuration value
 */
function get(key, defaultValue = null) {
  if (!config) {
    loadConfiguration();
  }
  
  return config[key] !== undefined ? config[key] : defaultValue;
}

/**
 * Get all configuration
 */
function getAll() {
  if (!config) {
    loadConfiguration();
  }
  
  return { ...config };
}

/**
 * Check if configuration is valid
 */
function isValid() {
  return validationErrors.length === 0;
}

/**
 * Get validation errors
 */
function getValidationErrors() {
  return [...validationErrors];
}

/**
 * Get database configuration
 */
function getDatabaseConfig() {
  return {
    url: get('DATABASE_URL'),
    host: get('DATABASE_HOST'),
    port: get('DATABASE_PORT'),
    database: get('DATABASE_NAME'),
    username: get('DATABASE_USER'),
    password: get('DATABASE_PASSWORD'),
    ssl: get('DATABASE_SSL'),
    pool: {
      min: get('DATABASE_POOL_MIN'),
      max: get('DATABASE_POOL_MAX')
    }
  };
}

/**
 * Get Redis configuration
 */
function getRedisConfig() {
  return {
    url: get('REDIS_URL'),
    host: get('REDIS_HOST'),
    port: get('REDIS_PORT'),
    password: get('REDIS_PASSWORD'),
    db: get('REDIS_DB')
  };
}

/**
 * Get Back4App configuration
 */
function getBack4AppConfig() {
  return {
    appId: get('BACK4APP_APP_ID'),
    javascriptKey: get('BACK4APP_JAVASCRIPT_KEY'),
    masterKey: get('BACK4APP_MASTER_KEY'),
    serverURL: get('BACK4APP_SERVER_URL')
  };
}

/**
 * Get security configuration
 */
function getSecurityConfig() {
  return {
    jwtSecret: get('JWT_SECRET'),
    jwtExpiresIn: get('JWT_EXPIRES_IN'),
    encryptionKey: get('ENCRYPTION_KEY'),
    sessionSecret: get('SESSION_SECRET'),
    csrfSecret: get('CSRF_SECRET')
  };
}

/**
 * Get API keys configuration
 */
function getApiKeysConfig() {
  return {
    binance: {
      apiKey: get('BINANCE_API_KEY'),
      secretKey: get('BINANCE_SECRET_KEY')
    },
    coinbase: {
      apiKey: get('COINBASE_API_KEY'),
      secretKey: get('COINBASE_SECRET_KEY')
    },
    alphaVantage: {
      apiKey: get('ALPHA_VANTAGE_API_KEY')
    }
  };
}

/**
 * Get email configuration
 */
function getEmailConfig() {
  return {
    smtp: {
      host: get('SMTP_HOST'),
      port: get('SMTP_PORT'),
      user: get('SMTP_USER'),
      password: get('SMTP_PASSWORD'),
      from: get('SMTP_FROM')
    }
  };
}

/**
 * Get payment configuration
 */
function getPaymentConfig() {
  return {
    stripe: {
      secretKey: get('STRIPE_SECRET_KEY'),
      publishableKey: get('STRIPE_PUBLISHABLE_KEY'),
      webhookSecret: get('STRIPE_WEBHOOK_SECRET')
    },
    paypal: {
      clientId: get('PAYPAL_CLIENT_ID'),
      clientSecret: get('PAYPAL_CLIENT_SECRET')
    },
    razorpay: {
      keyId: get('RAZORPAY_KEY_ID'),
      keySecret: get('RAZORPAY_KEY_SECRET')
    },
    cashfree: {
      appId: get('CASHFREE_APP_ID'),
      secretKey: get('CASHFREE_SECRET_KEY')
    }
  };
}

/**
 * Get monitoring configuration
 */
function getMonitoringConfig() {
  return {
    prometheusPort: get('PROMETHEUS_PORT'),
    grafanaPort: get('GRAFANA_PORT'),
    logLevel: get('LOG_LEVEL'),
    enableConsoleLogs: get('ENABLE_CONSOLE_LOGS'),
    enableMonitoring: get('ENABLE_MONITORING')
  };
}

/**
 * Get rate limiting configuration
 */
function getRateLimitConfig() {
  return {
    windowMs: get('RATE_LIMIT_WINDOW_MS'),
    maxRequests: get('RATE_LIMIT_MAX_REQUESTS')
  };
}

/**
 * Get CORS configuration
 */
function getCorsConfig() {
  return {
    origins: get('ALLOWED_ORIGINS') ? get('ALLOWED_ORIGINS').split(',') : ['http://localhost:3000'],
    credentials: get('CORS_CREDENTIALS')
  };
}

/**
 * Get SSL configuration
 */
function getSslConfig() {
  return {
    certPath: get('SSL_CERT_PATH'),
    keyPath: get('SSL_KEY_PATH'),
    caPath: get('SSL_CA_PATH')
  };
}

/**
 * Get trading configuration
 */
function getTradingConfig() {
  return {
    enabled: get('TRADING_ENABLED'),
    maxTradeAmount: get('MAX_TRADE_AMOUNT'),
    minTradeAmount: get('MIN_TRADE_AMOUNT'),
    feePercentage: get('TRADING_FEE_PERCENTAGE'),
    maxPortfolioRisk: get('MAX_PORTFOLIO_RISK'),
    stopLossPercentage: get('STOP_LOSS_PERCENTAGE'),
    takeProfitPercentage: get('TAKE_PROFIT_PERCENTAGE')
  };
}

/**
 * Get feature flags configuration
 */
function getFeatureFlagsConfig() {
  return {
    enabled: get('ENABLE_FEATURE_FLAGS'),
    enableAuditLogging: get('ENABLE_AUDIT_LOGGING'),
    enableCompliance: get('ENABLE_COMPLIANCE'),
    enableMonitoring: get('ENABLE_MONITORING')
  };
}

/**
 * Get backup configuration
 */
function getBackupConfig() {
  return {
    enabled: get('BACKUP_ENABLED'),
    schedule: get('BACKUP_SCHEDULE'),
    retentionDays: get('BACKUP_RETENTION_DAYS')
  };
}

/**
 * Get alert configuration
 */
function getAlertConfig() {
  return {
    email: get('ALERT_EMAIL'),
    slackWebhook: get('ALERT_SLACK_WEBHOOK'),
    discordWebhook: get('ALERT_DISCORD_WEBHOOK')
  };
}

/**
 * Get development configuration
 */
function getDevelopmentConfig() {
  return {
    enableDebug: get('ENABLE_DEBUG'),
    enableProfiling: get('ENABLE_PROFILING'),
    enableMockData: get('ENABLE_MOCK_DATA')
  };
}

/**
 * Check if running in production
 */
function isProduction() {
  return get('NODE_ENV') === 'production';
}

/**
 * Check if running in development
 */
function isDevelopment() {
  return get('NODE_ENV') === 'development';
}

/**
 * Check if running in test
 */
function isTest() {
  return get('NODE_ENV') === 'test';
}

module.exports = {
  loadConfiguration,
  get,
  getAll,
  isValid,
  getValidationErrors,
  getDatabaseConfig,
  getRedisConfig,
  getBack4AppConfig,
  getSecurityConfig,
  getApiKeysConfig,
  getEmailConfig,
  getPaymentConfig,
  getMonitoringConfig,
  getRateLimitConfig,
  getCorsConfig,
  getSslConfig,
  getTradingConfig,
  getFeatureFlagsConfig,
  getBackupConfig,
  getAlertConfig,
  getDevelopmentConfig,
  isProduction,
  isDevelopment,
  isTest
};
