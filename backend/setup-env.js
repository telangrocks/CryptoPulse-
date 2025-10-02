#!/usr/bin/env node
// =============================================================================
// CryptoPulse Backend Environment Setup Script
// =============================================================================
// This script helps set up environment files for different environments

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const logger = require('./lib/logging');

// Generate secure random secrets
function generateSecret(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

// Environment configurations
const environments = {
  development: {
    NODE_ENV: 'development',
    PORT: '1337',
    HOST: '0.0.0.0',
    DATABASE_URL: 'postgresql://cryptopulse_user:dev_password@localhost:5432/cryptopulse_dev',
    JWT_SECRET: generateSecret(32),
    ENCRYPTION_KEY: generateSecret(32),
    CSRF_SECRET: generateSecret(32),
    SESSION_SECRET: generateSecret(32),
    REDIS_URL: 'redis://localhost:6379',
    FRONTEND_URL: 'http://localhost:3000',
    BACKEND_URL: 'http://localhost:1337',
    LOG_LEVEL: 'debug',
    RATE_LIMIT_MAX_REQUESTS: '1000',
    ENABLE_DEBUG: 'true',
    ENABLE_MOCK_DATA: 'true',
    HTTPS_ENABLED: 'false'
  },
  production: {
    NODE_ENV: 'production',
    PORT: '1337',
    HOST: '0.0.0.0',
    DATABASE_URL: 'postgresql://cryptopulse_prod:CHANGE_ME@your-db-host:5432/cryptopulse_prod?sslmode=require',
    JWT_SECRET: generateSecret(32),
    ENCRYPTION_KEY: generateSecret(32),
    CSRF_SECRET: generateSecret(32),
    SESSION_SECRET: generateSecret(32),
    REDIS_URL: 'redis://username:password@your-redis-host:6379/0',
    FRONTEND_URL: 'https://app.cryptopulse.com',
    BACKEND_URL: 'https://api.cryptopulse.com',
    LOG_LEVEL: 'info',
    RATE_LIMIT_MAX_REQUESTS: '100',
    ENABLE_DEBUG: 'false',
    ENABLE_MOCK_DATA: 'false',
    HTTPS_ENABLED: 'true'
  }
};

// Common environment variables
const commonVars = {
  // Exchange API Keys (empty by default)
  BINANCE_API_KEY: '',
  BINANCE_SECRET_KEY: '',
  WAZIRX_API_KEY: '',
  WAZIRX_SECRET_KEY: '',
  COINDCX_API_KEY: '',
  COINDCX_SECRET_KEY: '',
  DELTA_API_KEY: '',
  DELTA_SECRET_KEY: '',
  COINBASE_API_KEY: '',
  COINBASE_SECRET_KEY: '',
  COINBASE_PASSPHRASE: '',

  // Payment Configuration
  CASHFREE_APP_ID: '',
  CASHFREE_SECRET_KEY: '',
  CASHFREE_WEBHOOK_SECRET: '',
  CASHFREE_MODE: 'sandbox',

  // Monitoring
  SLACK_WEBHOOK_URL: '',

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: '900000',

  // Feature Flags
  ENABLE_ANALYTICS: 'true',

  // Security Features
  ENABLE_CSRF_PROTECTION: 'true',
  ENABLE_RATE_LIMITING: 'true',
  ENABLE_CORS: 'true',

  // HTTPS
  SSL_CERT_PATH: '',
  SSL_KEY_PATH: ''
};

// Generate environment file content
function generateEnvContent(env, isProduction = false) {
  const config = { ...commonVars, ...environments[env] };

  let content = '# =============================================================================\n';
  content += `# CryptoPulse Backend Environment Configuration - ${env.toUpperCase()}\n`;
  content += '# =============================================================================\n';
  content += `# ${isProduction ? 'PRODUCTION' : 'Development'} environment configuration\n`;
  content += `# Generated on ${new Date().toISOString()}\n\n`;

  // Server Configuration
  content += '# Server Configuration\n';
  content += `NODE_ENV=${config.NODE_ENV}\n`;
  content += `PORT=${config.PORT}\n`;
  content += `HOST=${config.HOST}\n\n`;

  // Database Configuration
  content += '# Database Configuration\n';
  content += `DATABASE_URL=${config.DATABASE_URL}\n\n`;

  // Security Keys
  content += `# Security Keys (${isProduction ? 'Generated secure secrets' : 'Development keys'})\n`;
  content += `JWT_SECRET=${config.JWT_SECRET}\n`;
  content += `ENCRYPTION_KEY=${config.ENCRYPTION_KEY}\n`;
  content += `CSRF_SECRET=${config.CSRF_SECRET}\n`;
  content += `SESSION_SECRET=${config.SESSION_SECRET}\n\n`;

  // Exchange API Keys
  content += `# Exchange API Keys (${isProduction ? 'Configure with your production keys' : 'Development - Use testnet keys'})\n`;
  content += `BINANCE_API_KEY=${config.BINANCE_API_KEY}\n`;
  content += `BINANCE_SECRET_KEY=${config.BINANCE_SECRET_KEY}\n`;
  content += `WAZIRX_API_KEY=${config.WAZIRX_API_KEY}\n`;
  content += `WAZIRX_SECRET_KEY=${config.WAZIRX_SECRET_KEY}\n`;
  content += `COINDCX_API_KEY=${config.COINDCX_API_KEY}\n`;
  content += `COINDCX_SECRET_KEY=${config.COINDCX_SECRET_KEY}\n`;
  content += `DELTA_API_KEY=${config.DELTA_API_KEY}\n`;
  content += `DELTA_SECRET_KEY=${config.DELTA_SECRET_KEY}\n`;
  content += `COINBASE_API_KEY=${config.COINBASE_API_KEY}\n`;
  content += `COINBASE_SECRET_KEY=${config.COINBASE_SECRET_KEY}\n`;
  content += `COINBASE_PASSPHRASE=${config.COINBASE_PASSPHRASE}\n\n`;

  // Payment Configuration
  content += '# Payment Configuration\n';
  content += `CASHFREE_APP_ID=${config.CASHFREE_APP_ID}\n`;
  content += `CASHFREE_SECRET_KEY=${config.CASHFREE_SECRET_KEY}\n`;
  content += `CASHFREE_WEBHOOK_SECRET=${config.CASHFREE_WEBHOOK_SECRET}\n`;
  content += `CASHFREE_MODE=${config.CASHFREE_MODE}\n\n`;

  // Cache
  content += '# Cache Configuration\n';
  content += `REDIS_URL=${config.REDIS_URL}\n\n`;

  // URLs
  content += '# URLs\n';
  content += `FRONTEND_URL=${config.FRONTEND_URL}\n`;
  content += `BACKEND_URL=${config.BACKEND_URL}\n\n`;

  // Monitoring & Logging
  content += '# Monitoring & Logging\n';
  content += `LOG_LEVEL=${config.LOG_LEVEL}\n`;
  content += `SLACK_WEBHOOK_URL=${config.SLACK_WEBHOOK_URL}\n\n`;

  // Rate Limiting
  content += '# Rate Limiting\n';
  content += `RATE_LIMIT_WINDOW_MS=${config.RATE_LIMIT_WINDOW_MS}\n`;
  content += `RATE_LIMIT_MAX_REQUESTS=${config.RATE_LIMIT_MAX_REQUESTS}\n\n`;

  // Feature Flags
  content += '# Feature Flags\n';
  content += `ENABLE_ANALYTICS=${config.ENABLE_ANALYTICS}\n`;
  content += `ENABLE_DEBUG=${config.ENABLE_DEBUG}\n`;
  content += `ENABLE_MOCK_DATA=${config.ENABLE_MOCK_DATA}\n\n`;

  // Security Features
  content += '# Security Features\n';
  content += `ENABLE_CSRF_PROTECTION=${config.ENABLE_CSRF_PROTECTION}\n`;
  content += `ENABLE_RATE_LIMITING=${config.ENABLE_RATE_LIMITING}\n`;
  content += `ENABLE_CORS=${config.ENABLE_CORS}\n\n`;

  // HTTPS Configuration
  content += '# HTTPS Configuration\n';
  content += `HTTPS_ENABLED=${config.HTTPS_ENABLED}\n`;
  content += `SSL_CERT_PATH=${config.SSL_CERT_PATH}\n`;
  content += `SSL_KEY_PATH=${config.SSL_KEY_PATH}\n`;

  return content;
}

// Main function
function main() {
  const args = process.argv.slice(2);
  const environment = args[0] || 'development';

  if (!environments[environment]) {
    logger.error(`❌ Invalid environment: ${environment}`);
    logger.error('Available environments: development, production');
    process.exit(1);
  }

  const isProduction = environment === 'production';
  const fileName = isProduction ? '.env.production' : '.env.backend';
  const filePath = path.join(__dirname, fileName);

  try {
    const content = generateEnvContent(environment, isProduction);
    fs.writeFileSync(filePath, content);

    logger.info(`✅ Environment file created: ${fileName}`);
    logger.info(`📁 Location: ${filePath}`);
    logger.info(`🔐 Generated secure secrets for ${environment} environment`);

    if (isProduction) {
      logger.info('\n⚠️  PRODUCTION SETUP REQUIRED:');
      logger.info('1. Update DATABASE_URL with your production database credentials');
      logger.info('2. Configure exchange API keys with your production keys');
      logger.info('3. Set up Redis and MongoDB URLs');
      logger.info('4. Configure payment gateway credentials');
      logger.info('5. Set up SSL certificates');
      logger.info('6. Configure monitoring and alerting');
    } else {
      logger.info('\n🚀 DEVELOPMENT SETUP:');
      logger.info('1. Start PostgreSQL and Redis locally');
      logger.info('2. Run: npm run dev');
      logger.info('3. Backend will be available at http://localhost:1337');
    }

  } catch (error) {
    logger.error(`❌ Error creating environment file: ${error.message}`);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { generateEnvContent, environments };
