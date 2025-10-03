#!/usr/bin/env node
// =============================================================================
// CryptoPulse Secrets Manager - Production Ready
// =============================================================================
// Secure secrets management with rotation capabilities

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

// Utility functions
function log(message, color = 'white') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

// Secure random string generator
function generateSecureSecret(length = 32, encoding = 'hex') {
  const bytes = crypto.randomBytes(length);
  return bytes.toString(encoding);
}

// Generate cryptographically secure secrets
function generateSecrets() {
  return {
    JWT_SECRET: generateSecureSecret(64), // 64 bytes = 128 hex chars
    ENCRYPTION_KEY: generateSecureSecret(32), // 32 bytes = 64 hex chars
    CSRF_SECRET: generateSecureSecret(32),
    SESSION_SECRET: generateSecureSecret(32),
    API_SECRET: generateSecureSecret(32),
    WEBHOOK_SECRET: generateSecureSecret(32)
  };
}

// Generate API keys (simplified format)
function generateApiKey(prefix = 'CP', length = 32) {
  const randomPart = generateSecureSecret(length, 'base64')
    .replace(/[^a-zA-Z0-9]/g, '')
    .substring(0, length);
  return `${prefix}_${randomPart}`;
}

// Validate secret strength
function validateSecretStrength(secret, minLength = 32) {
  if (!secret || secret.length < minLength) {
    return { valid: false, reason: `Secret must be at least ${minLength} characters` };
  }

  const entropy = calculateEntropy(secret);
  if (entropy < 4.5) {
    return { valid: false, reason: `Secret has low entropy (${entropy.toFixed(2)})` };
  }

  return { valid: true, entropy };
}

// Calculate entropy
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

// Load environment file
function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const env = {};

  content.split('\n').forEach(line => {
    line = line.trim();
    if (line && !line.startsWith('#')) {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        env[key.trim()] = valueParts.join('=').trim();
      }
    }
  });

  return env;
}

// Save environment file
function saveEnvFile(filePath, env, comments = {}) {
  const lines = [];
  
  // Add header comment
  lines.push('# =============================================================================');
  lines.push('# CryptoPulse Environment Configuration');
  lines.push('# =============================================================================');
  lines.push(`# Generated on: ${new Date().toISOString()}`);
  lines.push('');

  // Group variables by category
  const categories = {
    'SERVER CONFIGURATION': ['NODE_ENV', 'PORT', 'HOST'],
    'DATABASE CONFIGURATION': ['DATABASE_URL', 'MONGODB_URL', 'REDIS_URL'],
    'SECURITY CONFIGURATION': ['JWT_SECRET', 'ENCRYPTION_KEY', 'CSRF_SECRET', 'SESSION_SECRET'],
    'EXCHANGE API CONFIGURATION': ['BINANCE_API_KEY', 'BINANCE_SECRET_KEY', 'WAZIRX_API_KEY', 'WAZIRX_SECRET_KEY'],
    'PAYMENT CONFIGURATION': ['CASHFREE_APP_ID', 'CASHFREE_SECRET_KEY', 'CASHFREE_WEBHOOK_SECRET'],
    'MONITORING & LOGGING': ['LOG_LEVEL', 'SLACK_WEBHOOK_URL'],
    'FEATURE FLAGS': ['ENABLE_DEBUG', 'ENABLE_MOCK_DATA', 'ENABLE_ANALYTICS']
  };

  Object.entries(categories).forEach(([category, keys]) => {
    const categoryVars = keys.filter(key => env[key] !== undefined);
    if (categoryVars.length > 0) {
      lines.push(`# =============================================================================`);
      lines.push(`# ${category}`);
      lines.push(`# =============================================================================`);
      
      categoryVars.forEach(key => {
        if (comments[key]) {
          lines.push(`# ${comments[key]}`);
        }
        lines.push(`${key}=${env[key]}`);
      });
      lines.push('');
    }
  });

  // Add any remaining variables
  const categorizedKeys = Object.values(categories).flat();
  const remainingVars = Object.keys(env).filter(key => !categorizedKeys.includes(key));
  
  if (remainingVars.length > 0) {
    lines.push(`# =============================================================================`);
    lines.push(`# OTHER CONFIGURATION`);
    lines.push(`# =============================================================================`);
    
    remainingVars.forEach(key => {
      if (comments[key]) {
        lines.push(`# ${comments[key]}`);
      }
      lines.push(`${key}=${env[key]}`);
    });
  }

  fs.writeFileSync(filePath, lines.join('\n') + '\n');
}

// Rotate secrets
function rotateSecrets(envPath, force = false) {
  log('\n🔄 Secret Rotation', 'cyan');
  log('==================');

  if (!fs.existsSync(envPath)) {
    logError(`Environment file not found: ${envPath}`);
    return false;
  }

  const env = loadEnvFile(envPath);
  const secretsToRotate = [
    'JWT_SECRET',
    'ENCRYPTION_KEY',
    'CSRF_SECRET',
    'SESSION_SECRET'
  ];

  const rotated = [];
  const skipped = [];

  secretsToRotate.forEach(secretName => {
    const currentSecret = env[secretName];
    
    if (!currentSecret) {
      logWarning(`${secretName} not found, generating new secret`);
      env[secretName] = generateSecureSecret(64);
      rotated.push(secretName);
      return;
    }

    const validation = validateSecretStrength(currentSecret);
    if (!validation.valid) {
      logWarning(`${secretName} is weak: ${validation.reason}, rotating`);
      env[secretName] = generateSecureSecret(64);
      rotated.push(secretName);
      return;
    }

    if (force) {
      env[secretName] = generateSecureSecret(64);
      rotated.push(secretName);
    } else {
      skipped.push(secretName);
    }
  });

  if (rotated.length > 0) {
    // Create backup
    const backupPath = `${envPath}.backup.${Date.now()}`;
    fs.copyFileSync(envPath, backupPath);
    logInfo(`Backup created: ${path.basename(backupPath)}`);

    // Save updated environment
    saveEnvFile(envPath, env);
    
    logSuccess(`Rotated ${rotated.length} secrets`);
    rotated.forEach(secret => log(`  - ${secret}`, 'green'));
    
    if (skipped.length > 0) {
      logInfo(`Skipped ${skipped.length} secrets (use --force to rotate)`);
      skipped.forEach(secret => log(`  - ${secret}`, 'dim'));
    }

    return true;
  } else {
    logInfo('No secrets needed rotation');
    return false;
  }
}

// Audit secrets
function auditSecrets(envPath) {
  log('\n🔍 Secret Audit', 'cyan');
  log('===============');

  if (!fs.existsSync(envPath)) {
    logError(`Environment file not found: ${envPath}`);
    return;
  }

  const env = loadEnvFile(envPath);
  const secretsToAudit = [
    'JWT_SECRET',
    'ENCRYPTION_KEY',
    'CSRF_SECRET',
    'SESSION_SECRET',
    'CASHFREE_SECRET_KEY',
    'CASHFREE_WEBHOOK_SECRET'
  ];

  let passed = 0;
  let failed = 0;

  secretsToAudit.forEach(secretName => {
    const secret = env[secretName];
    
    if (!secret) {
      logWarning(`${secretName}: Not set`);
      failed++;
      return;
    }

    const validation = validateSecretStrength(secret);
    if (validation.valid) {
      logSuccess(`${secretName}: Strong (entropy: ${validation.entropy.toFixed(2)})`);
      passed++;
    } else {
      logError(`${secretName}: ${validation.reason}`);
      failed++;
    }
  });

  log(`\nAudit Results: ${passed} passed, ${failed} failed`, passed === secretsToAudit.length ? 'green' : 'yellow');
}

// Setup new environment
function setupEnvironment(envPath, environment = 'development') {
  log('\n🛠️  Environment Setup', 'cyan');
  log('====================');

  const secrets = generateSecrets();
  
  const env = {
    // Server Configuration
    NODE_ENV: environment,
    PORT: '1337',
    HOST: '0.0.0.0',

    // Database Configuration
    DATABASE_URL: environment === 'production' 
      ? 'CHANGE_ME_TO_YOUR_PRODUCTION_DATABASE_URL'
      : 'postgresql://cryptopulse_user:CHANGE_ME_PASSWORD@localhost:5432/cryptopulse_dev',

    // Security Configuration
    ...secrets,

    // Exchange API Configuration (empty by default)
    BINANCE_API_KEY: '',
    BINANCE_SECRET_KEY: '',
    WAZIRX_API_KEY: '',
    WAZIRX_SECRET_KEY: '',

    // Payment Configuration
    CASHFREE_APP_ID: '',
    CASHFREE_SECRET_KEY: '',
    CASHFREE_WEBHOOK_SECRET: '',
    CASHFREE_MODE: environment === 'production' ? 'live' : 'sandbox',

    // Monitoring & Logging
    LOG_LEVEL: environment === 'production' ? 'info' : 'debug',
    SLACK_WEBHOOK_URL: '',

    // Feature Flags
    ENABLE_DEBUG: environment !== 'production',
    ENABLE_MOCK_DATA: environment !== 'production',
    ENABLE_ANALYTICS: true
  };

  const comments = {
    DATABASE_URL: 'PostgreSQL Database URL - REQUIRED',
    JWT_SECRET: 'JWT Secret (64+ characters, cryptographically secure)',
    ENCRYPTION_KEY: 'Encryption Key (32+ characters, cryptographically secure)',
    CSRF_SECRET: 'CSRF Secret (32+ characters, cryptographically secure)',
    SESSION_SECRET: 'Session Secret (32+ characters, cryptographically secure)',
    BINANCE_API_KEY: 'Binance API Key (optional)',
    CASHFREE_APP_ID: 'Cashfree App ID (required for payments)',
    LOG_LEVEL: 'Log Level (debug, info, warn, error)',
    ENABLE_DEBUG: 'Enable debug mode (should be false in production)'
  };

  saveEnvFile(envPath, env, comments);
  
  logSuccess(`Environment setup complete: ${path.basename(envPath)}`);
  logInfo(`Environment: ${environment}`);
  logInfo(`Generated ${Object.keys(secrets).length} secure secrets`);
}

// Main function
function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  log('🔐 CryptoPulse Secrets Manager', 'bright');
  log('==============================');
  log('Secure secrets management with rotation capabilities\n');

  switch (command) {
    case 'generate':
      log('\n🔑 Generating Secure Secrets', 'cyan');
      const secrets = generateSecrets();
      Object.entries(secrets).forEach(([key, value]) => {
        log(`${key}=${value}`, 'dim');
      });
      break;

    case 'setup':
      const envType = args[1] || 'development';
      const envPath = args[2] || `./backend/.env.${envType}`;
      setupEnvironment(envPath, envType);
      break;

    case 'rotate':
      const rotatePath = args[1] || './backend/.env.backend';
      const force = args.includes('--force');
      rotateSecrets(rotatePath, force);
      break;

    case 'audit':
      const auditPath = args[1] || './backend/.env.backend';
      auditSecrets(auditPath);
      break;

    default:
      log('Usage:', 'yellow');
      log('  node scripts/secrets-manager.js generate                    - Generate secure secrets');
      log('  node scripts/secrets-manager.js setup [env] [path]          - Setup new environment');
      log('  node scripts/secrets-manager.js rotate [path] [--force]     - Rotate secrets');
      log('  node scripts/secrets-manager.js audit [path]                - Audit secret strength');
      log('');
      log('Examples:', 'blue');
      log('  node scripts/secrets-manager.js setup production           - Setup production environment');
      log('  node scripts/secrets-manager.js rotate --force             - Force rotate all secrets');
      log('  node scripts/secrets-manager.js audit                      - Audit current secrets');
      break;
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  generateSecrets,
  generateApiKey,
  validateSecretStrength,
  rotateSecrets,
  auditSecrets,
  setupEnvironment
};
