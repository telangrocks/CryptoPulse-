#!/usr/bin/env node
// =============================================================================
// CryptoPulse Backend Production Setup Script
// =============================================================================
// This script helps set up the backend for production deployment

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const logger = require('./lib/logging');

logger.info('🚀 CryptoPulse Backend Production Setup');
logger.info('=====================================\n');

// Generate secure secrets
function generateSecret(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

// Create production environment file
function createProductionEnv() {
  const envContent = `# =============================================================================
# CryptoPulse Backend - Production Environment Configuration
# =============================================================================
# PRODUCTION ENVIRONMENT - DO NOT COMMIT TO VERSION CONTROL
# Generated on: ${new Date().toISOString()}

# Node Environment
NODE_ENV=production

# Server Configuration
PORT=1337
HOST=0.0.0.0

# Database Configuration (REQUIRED - Replace with your production database)
DATABASE_URL=postgresql://cryptopulse_prod:your_secure_production_password@your-db-host:5432/cryptopulse_prod?sslmode=require

# Security Keys (REQUIRED - Cryptographically secure secrets)
JWT_SECRET=${generateSecret()}
ENCRYPTION_KEY=${generateSecret()}
CSRF_SECRET=${generateSecret()}
SESSION_SECRET=${generateSecret()}

# Exchange API Keys (Configure with your production exchange API keys)
BINANCE_API_KEY=your_production_binance_api_key
BINANCE_SECRET_KEY=your_production_binance_secret_key
WAZIRX_API_KEY=your_production_wazirx_api_key
WAZIRX_SECRET_KEY=your_production_wazirx_secret_key
COINDCX_API_KEY=your_production_coindcx_api_key
COINDCX_SECRET_KEY=your_production_coindcx_secret_key
DELTA_API_KEY=your_production_delta_api_key
DELTA_SECRET_KEY=your_production_delta_secret_key
COINBASE_API_KEY=your_production_coinbase_api_key
COINBASE_SECRET_KEY=your_production_coinbase_secret_key
COINBASE_PASSPHRASE=your_production_coinbase_passphrase

# Payment Configuration (REQUIRED for payments)
CASHFREE_APP_ID=your_production_cashfree_app_id
CASHFREE_SECRET_KEY=your_production_cashfree_secret_key
CASHFREE_WEBHOOK_SECRET=your_production_cashfree_webhook_secret
CASHFREE_MODE=live

# Cache Configuration (Recommended for production)
REDIS_URL=redis://username:password@your-redis-host:6379/0
MONGODB_URL=mongodb://username:password@your-mongodb-host:27017/cryptopulse_prod

# URLs (REQUIRED in production)
FRONTEND_URL=https://app.cryptopulse.com
BACKEND_URL=https://api.cryptopulse.com

# Monitoring & Logging
LOG_LEVEL=info
SLACK_WEBHOOK_URL=your_slack_webhook_url_for_production_alerts

# Rate Limiting (Production settings)
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Feature Flags (Production settings)
ENABLE_ANALYTICS=true
ENABLE_DEBUG=false
ENABLE_MOCK_DATA=false

# Security Features (Production settings)
ENABLE_CSRF_PROTECTION=true
ENABLE_RATE_LIMITING=true
ENABLE_CORS=true

# HTTPS Configuration (Production)
HTTPS_ENABLED=true
SSL_CERT_PATH=/etc/ssl/certs/cryptopulse.crt
SSL_KEY_PATH=/etc/ssl/private/cryptopulse.key
`;

  const envPath = path.join(__dirname, '.env.production');
  fs.writeFileSync(envPath, envContent);
  logger.info('✅ Created .env.production with secure secrets');
  return envPath;
}

// Create development environment file
function createDevelopmentEnv() {
  const envContent = `# =============================================================================
# CryptoPulse Backend Environment Configuration - Development
# =============================================================================
# This file is loaded by the application in development mode

# Node Environment
NODE_ENV=development

# Server Configuration
PORT=1337
HOST=0.0.0.0

# Database Configuration
DATABASE_URL=postgresql://cryptopulse_user:dev_password@localhost:5432/cryptopulse_dev

# Security Keys (Development - Use different keys for production)
JWT_SECRET=dev_jwt_secret_key_32_characters_long_for_development_only
ENCRYPTION_KEY=dev_encryption_key_32_characters_long_for_development_only
CSRF_SECRET=dev_csrf_secret_key_32_characters_long_for_development_only
SESSION_SECRET=dev_session_secret_key_32_characters_long_for_development_only

# Exchange API Keys (Development - Use testnet keys)
BINANCE_API_KEY=
BINANCE_SECRET_KEY=
WAZIRX_API_KEY=
WAZIRX_SECRET_KEY=
COINDCX_API_KEY=
COINDCX_SECRET_KEY=
DELTA_API_KEY=
DELTA_SECRET_KEY=
COINBASE_API_KEY=
COINBASE_SECRET_KEY=
COINBASE_PASSPHRASE=

# Payment Configuration (Development)
CASHFREE_APP_ID=
CASHFREE_SECRET_KEY=
CASHFREE_WEBHOOK_SECRET=
CASHFREE_MODE=sandbox

# Cache
REDIS_URL=redis://localhost:6379

# URLs
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:1337

# Monitoring & Logging
LOG_LEVEL=debug
SLACK_WEBHOOK_URL=

# Rate Limiting (More lenient for development)
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000

# Feature Flags (Development settings)
ENABLE_ANALYTICS=true
ENABLE_DEBUG=true
ENABLE_MOCK_DATA=true

# Security Features
ENABLE_CSRF_PROTECTION=true
ENABLE_RATE_LIMITING=true
ENABLE_CORS=true

# HTTPS Configuration
HTTPS_ENABLED=false
SSL_CERT_PATH=
SSL_KEY_PATH=
`;

  const envPath = path.join(__dirname, '.env.backend');
  fs.writeFileSync(envPath, envContent);
  logger.info('✅ Created .env.backend for development');
  return envPath;
}

// Main setup function
async function setupProduction() {
  try {
    logger.info('📝 Setting up environment files...\n');

    // Create development environment
    createDevelopmentEnv();

    // Create production environment
    const prodEnvPath = createProductionEnv();

    // Run configuration validation
    logger.info('\n🔍 Running configuration validation...');
    try {
      const { execSync } = require('child_process');
      execSync('node scripts/config-validator.js', { stdio: 'inherit' });
      logger.info('✅ Configuration validation passed');
    } catch (validationError) {
      logger.warn('⚠️  Configuration validation failed - please review and fix issues');
    }

    // Run secrets audit
    logger.info('\n🔐 Running secrets audit...');
    try {
      const { execSync } = require('child_process');
      execSync('node scripts/secrets-manager.js audit', { stdio: 'inherit' });
      logger.info('✅ Secrets audit completed');
    } catch (auditError) {
      logger.warn('⚠️  Secrets audit found issues - please review');
    }

    logger.info('\n🔒 Security Notes:');
    logger.info('   - Production secrets have been generated securely');
    logger.info('   - Never commit .env files to version control');
    logger.info('   - Store production secrets in a secure secret management system');
    logger.info('   - Rotate secrets regularly in production (every 90 days)');
    logger.info('   - Use HTTPS and SSL certificates in production');

    logger.info('\n📋 Next Steps:');
    logger.info('   1. Update DATABASE_URL with your production database');
    logger.info('   2. Configure exchange API keys if needed');
    logger.info('   3. Set up payment configuration (Cashfree)');
    logger.info('   4. Configure monitoring and alerting');
    logger.info('   5. Set up SSL certificates for HTTPS');
    logger.info('   6. Run production readiness check: pnpm run verify:production');
    logger.info('   7. Deploy to production environment');

    logger.info('\n✅ Production setup complete!');
    logger.info(`   Environment file: ${prodEnvPath}`);
    logger.info('   Configuration guide: CONFIGURATION_GUIDE.md');

  } catch (error) {
    logger.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

// Run setup if called directly
if (require.main === module) {
  setupProduction();
}

module.exports = { setupProduction, generateSecret };
