// =============================================================================
// Environment Validation - Production Ready
// =============================================================================
// Centralized environment variable validation with fail-fast behavior
// Ensures all required secrets and configuration are properly set

const { cleanEnv, str, bool, num, makeValidator } = require('envalid');
const { logger } = require('./logging');

// Security patterns to detect weak or placeholder values
const WEAK_PATTERNS = [
  'your_', 'YOUR_', 'here', 'HERE', 'placeholder', 'PLACEHOLDER',
  'test_', 'TEST_', 'demo_', 'DEMO_', 'example_', 'EXAMPLE_',
  'localhost', '127.0.0.1', 'example.com', 'your-domain.com',
  'change_me', 'CHANGE_ME', 'replace_me', 'REPLACE_ME',
  'dev_password', 'development', 'prod_password',
  'default_', 'DEFAULT_', 'admin_', 'ADMIN_'
];

// Custom validators
const nonEmptyString = makeValidator((x) => {
  if (typeof x !== 'string' || x.trim().length === 0) {
    throw new Error('Expected non-empty string');
  }
  return x.trim();
});

// Cryptographically secure secret key validator
const productionSecretKey = makeValidator((x) => {
  if (!x || typeof x !== 'string' || x.length < 32) {
    throw new Error('Secret key must be at least 32 characters long');
  }
  
  // Check for weak patterns
  const hasWeakPattern = WEAK_PATTERNS.some(pattern => 
    x.toLowerCase().includes(pattern.toLowerCase())
  );
  
  if (hasWeakPattern) {
    throw new Error('Secret key appears to be a placeholder or weak pattern. Please set a cryptographically secure secret.');
  }
  
  // Additional entropy check for production
  if (process.env.NODE_ENV === 'production') {
    const entropy = calculateEntropy(x);
    if (entropy < 4.5) {
      throw new Error('Secret key has insufficient entropy for production use');
    }
  }
  
  return x;
});

// Optional secret key validator (allows empty values for optional services)
const optionalSecretKey = makeValidator((x) => {
  if (!x || x === '') {
    return 'optional-service-not-configured';
  }
  if (typeof x !== 'string' || x.length < 32) {
    return 'optional-service-default-key-32-chars-minimum';
  }
  
  // Check for weak patterns in optional keys too
  const hasWeakPattern = WEAK_PATTERNS.some(pattern => 
    x.toLowerCase().includes(pattern.toLowerCase())
  );
  
  if (hasWeakPattern) {
    logger.warn('Optional secret key appears to be a placeholder or weak pattern');
  }
  
  return x;
});

// Calculate entropy of a string for security validation
function calculateEntropy(str) {
  const frequency = {};
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    frequency[char] = (frequency[char] || 0) + 1;
  }
  
  let entropy = 0;
  const length = str.length;
  for (const count of Object.values(frequency)) {
    const probability = count / length;
    entropy -= probability * Math.log2(probability);
  }
  
  return entropy;
}

// Production-ready API key validator
const productionApiKey = makeValidator((x) => {
  if (!x || x === '') {
    return ''; // Allow empty for optional APIs
  }

  if (typeof x !== 'string' || x.trim().length < 20) {
    throw new Error('API key must be at least 20 characters long');
  }

  // Check for weak patterns
  const hasWeakPattern = WEAK_PATTERNS.some(pattern => 
    x.toLowerCase().includes(pattern.toLowerCase())
  );
  
  if (hasWeakPattern) {
    throw new Error('API key appears to be a placeholder or weak pattern. Please set a real API key.');
  }

  // Validate API key format
  const trimmedKey = x.trim();
  if (!/^[a-zA-Z0-9_-]+$/.test(trimmedKey)) {
    throw new Error('API key contains invalid characters. Only alphanumeric characters, hyphens, and underscores are allowed.');
  }

  return trimmedKey;
});

// Database URL validator with security checks
const databaseUrl = makeValidator((x) => {
  if (!x || typeof x !== 'string' || x.trim().length === 0) {
    throw new Error('Database URL is required');
  }

  const url = x.trim();
  
  // Check for weak patterns
  const hasWeakPattern = WEAK_PATTERNS.some(pattern => 
    url.toLowerCase().includes(pattern.toLowerCase())
  );
  
  if (hasWeakPattern) {
    throw new Error('Database URL appears to contain placeholder values. Please set a real database URL.');
  }

  // Validate URL format
  try {
    const parsedUrl = new URL(url);
    if (!['postgresql:', 'postgres:'].includes(parsedUrl.protocol)) {
      throw new Error('Database URL must use postgresql:// or postgres:// protocol');
    }
    
    // Production-specific checks
    if (process.env.NODE_ENV === 'production') {
      if (parsedUrl.hostname === 'localhost' || parsedUrl.hostname === '127.0.0.1') {
        throw new Error('Cannot use localhost database in production');
      }
      
      if (!parsedUrl.searchParams.has('sslmode')) {
        logger.warn('Database URL does not specify SSL mode. Consider adding ?sslmode=require for production');
      }
    }
  } catch (error) {
    throw new Error(`Invalid database URL format: ${error.message}`);
  }

  return url;
});

// Environment validation schema
const env = cleanEnv(process.env, {
  // Node Environment
  NODE_ENV: str({ choices: ['development', 'production', 'test'], default: 'development' }),

  // Server Configuration
  PORT: num({ default: 1337 }),
  HOST: str({ default: '0.0.0.0' }),

  // Database Configuration (Required)
  DATABASE_URL: databaseUrl({ desc: 'PostgreSQL database connection URL' }),

  // Security Keys (Required)
  JWT_SECRET: productionSecretKey({ desc: 'JWT Secret Key (32+ chars)' }),
  ENCRYPTION_KEY: productionSecretKey({ desc: 'Encryption Key (32+ chars)' }),
  CSRF_SECRET: productionSecretKey({ desc: 'CSRF Secret Key (32+ chars)' }),
  SESSION_SECRET: productionSecretKey({ desc: 'Session Secret Key (32+ chars)' }),

  // Exchange API Keys (Optional for trading)
  BINANCE_API_KEY: productionApiKey({ desc: 'Binance API Key' }),
  BINANCE_SECRET_KEY: optionalSecretKey({ desc: 'Binance Secret Key' }),
  WAZIRX_API_KEY: productionApiKey({ desc: 'WazirX API Key' }),
  WAZIRX_SECRET_KEY: optionalSecretKey({ desc: 'WazirX Secret Key' }),
  COINDCX_API_KEY: productionApiKey({ desc: 'CoinDCX API Key' }),
  COINDCX_SECRET_KEY: optionalSecretKey({ desc: 'CoinDCX Secret Key' }),
  DELTA_API_KEY: productionApiKey({ desc: 'Delta Exchange API Key' }),
  DELTA_SECRET_KEY: optionalSecretKey({ desc: 'Delta Exchange Secret Key' }),
  COINBASE_API_KEY: productionApiKey({ desc: 'Coinbase API Key' }),
  COINBASE_SECRET_KEY: optionalSecretKey({ desc: 'Coinbase Secret Key' }),
  COINBASE_PASSPHRASE: str({ default: '' }),

  // Payment Configuration (Required for payments)
  CASHFREE_APP_ID: str({ default: '' }),
  CASHFREE_SECRET_KEY: productionSecretKey({ desc: 'Cashfree Secret Key' }),
  CASHFREE_WEBHOOK_SECRET: productionSecretKey({ desc: 'Cashfree Webhook Secret' }),
  CASHFREE_MODE: str({ choices: ['sandbox', 'live'], default: 'sandbox' }),

  // Cache (Optional)
  REDIS_URL: str({ default: '' }),
  MONGODB_URL: str({ default: '' }),

  // WebSocket Configuration (Optional)
  WEBSOCKET_ENABLED: bool({ default: true }),
  WEBSOCKET_PORT: num({ default: 8080 }),
  WEBSOCKET_MAX_CONNECTIONS: num({ default: 1000 }),
  WEBSOCKET_MESSAGE_RATE_LIMIT: num({ default: 100 }),
  WEBSOCKET_HEARTBEAT_INTERVAL: num({ default: 30000 }),
  WEBSOCKET_MAX_MESSAGE_SIZE: num({ default: 1048576 }),

  // URLs (Required in production)
  FRONTEND_URL: str({ default: process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3000' }),
  BACKEND_URL: str({ default: process.env.NODE_ENV === 'production' ? '' : 'http://localhost:1337' }),

  // CORS Configuration
  ALLOWED_ORIGINS: str({ default: process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3000,http://localhost:5173' }),
  CORS_ORIGIN: str({ default: process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3000' }),

  // Monitoring & Logging
  LOG_LEVEL: str({ choices: ['error', 'warn', 'info', 'debug'], default: 'info' }),
  SLACK_WEBHOOK_URL: str({ default: '' }),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: num({ default: 900000 }), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: num({ default: 100 }),

  // Feature Flags
  ENABLE_ANALYTICS: bool({ default: true }),
  ENABLE_DEBUG: bool({ default: false }),
  ENABLE_MOCK_DATA: bool({ default: false }),

  // Security Features
  ENABLE_CSRF_PROTECTION: bool({ default: true }),
  ENABLE_RATE_LIMITING: bool({ default: true }),
  ENABLE_CORS: bool({ default: true }),

  // HTTPS Configuration
  HTTPS_ENABLED: bool({ default: false }),
  SSL_CERT_PATH: str({ default: '' }),
  SSL_KEY_PATH: str({ default: '' })
}, {
  // Enhanced error handling with security warnings
  reporter: ({ errors, env }) => {
    if (Object.keys(errors).length > 0) {
      logger.error('❌ Environment validation failed:');
      logger.error('Missing or invalid environment variables:');
      Object.entries(errors).forEach(([key, error]) => {
        logger.error(`  - ${key}: ${error.message}`);
      });
      
      // Security warnings
      const securityIssues = Object.entries(errors).filter(([key, error]) => 
        error.message.includes('placeholder') || 
        error.message.includes('weak pattern') ||
        error.message.includes('insufficient entropy')
      );
      
      if (securityIssues.length > 0) {
        logger.error('\n🚨 Security Issues Detected:');
        securityIssues.forEach(([key, error]) => {
          logger.error(`  - ${key}: ${error.message}`);
        });
        logger.error('   These issues must be fixed for production deployment.');
      }
      
      logger.error('\n🔧 Please fix these issues before starting the application.');
      logger.error('   For production, ensure all secrets are cryptographically secure.');
      logger.error('   Refer to env-templates/backend.env for the complete configuration template.');

      // Don't exit in test environment
      if (process.env.NODE_ENV !== 'test') {
        process.exit(1);
      }
    } else {
      logger.info('✅ Environment validation passed');
      
      // Additional production checks
      if (env.NODE_ENV === 'production') {
        const warnings = [];
        
        if (env.DATABASE_URL && !env.DATABASE_URL.includes('sslmode=require')) {
          warnings.push('Database URL should include sslmode=require for production');
        }
        
        if (env.ENABLE_DEBUG === true) {
          warnings.push('Debug mode should be disabled in production');
        }
        
        if (env.ENABLE_MOCK_DATA === true) {
          warnings.push('Mock data should be disabled in production');
        }
        
        if (env.HTTPS_ENABLED === false) {
          warnings.push('HTTPS should be enabled in production');
        }
        
        if (warnings.length > 0) {
          logger.warn('⚠️  Production warnings:');
          warnings.forEach(warning => logger.warn(`  - ${warning}`));
        }
      }
    }
  }
});

// Additional validation for production environment
if (env.NODE_ENV === 'production') {
  const productionWarnings = [];
  const productionErrors = [];

  // Check for development URLs in production
  if (env.FRONTEND_URL.includes('localhost') || env.FRONTEND_URL.includes('127.0.0.1')) {
    productionErrors.push('FRONTEND_URL should not use localhost in production');
  }

  if (env.BACKEND_URL.includes('localhost') || env.BACKEND_URL.includes('127.0.0.1')) {
    productionErrors.push('BACKEND_URL should not use localhost in production');
  }

  // Check for empty URLs in production
  if (!env.FRONTEND_URL || env.FRONTEND_URL === '') {
    productionErrors.push('FRONTEND_URL is required in production');
  }

  if (!env.BACKEND_URL || env.BACKEND_URL === '') {
    productionErrors.push('BACKEND_URL is required in production');
  }

  // Check for HTTPS in production
  if (!env.FRONTEND_URL.startsWith('https://')) {
    productionWarnings.push('FRONTEND_URL should use HTTPS in production');
  }

  if (!env.BACKEND_URL.startsWith('https://')) {
    productionWarnings.push('BACKEND_URL should use HTTPS in production');
  }

  // Check for sandbox mode in production
  if (env.CASHFREE_MODE === 'sandbox') {
    productionWarnings.push('CASHFREE_MODE is set to sandbox in production');
  }

  // Check for debug mode in production
  if (env.ENABLE_DEBUG) {
    productionWarnings.push('ENABLE_DEBUG is true in production');
  }

  // Check for mock data in production
  if (env.ENABLE_MOCK_DATA) {
    productionWarnings.push('ENABLE_MOCK_DATA is true in production');
  }

  // Check for missing Redis in production
  if (!env.REDIS_URL || env.REDIS_URL === '') {
    productionWarnings.push('REDIS_URL is not set in production - caching will be disabled');
  }

  // Check for weak secrets in production
  const weakSecretPatterns = [
    'test', 'development', 'production', 'secret', 'key', 'jwt',
    'placeholder', 'default', 'example', 'demo'
  ];

  const secretsToCheck = [
    { name: 'JWT_SECRET', value: env.JWT_SECRET },
    { name: 'ENCRYPTION_KEY', value: env.ENCRYPTION_KEY },
    { name: 'CSRF_SECRET', value: env.CSRF_SECRET },
    { name: 'SESSION_SECRET', value: env.SESSION_SECRET }
  ];

  secretsToCheck.forEach(({ name, value }) => {
    if (weakSecretPatterns.some(pattern =>
      value.toLowerCase().includes(pattern.toLowerCase())
    )) {
      productionWarnings.push(`${name} appears to contain weak patterns - consider using a more secure secret`);
    }
  });

  // Check for missing monitoring in production
  if (!env.SLACK_WEBHOOK_URL || env.SLACK_WEBHOOK_URL === '') {
    productionWarnings.push('SLACK_WEBHOOK_URL is not set - monitoring alerts will be disabled');
  }

  if (productionErrors.length > 0) {
    logger.error('❌ Production environment errors:');
    productionErrors.forEach(error => logger.error(`  - ${error}`));
    process.exit(1);
  }

  if (productionWarnings.length > 0) {
    logger.warn('⚠️  Production environment warnings:');
    productionWarnings.forEach(warning => logger.warn(`  - ${warning}`));
  }
}

// Export validated environment
module.exports = env;
