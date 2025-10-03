#!/usr/bin/env node
// =============================================================================
// CryptoPulse Configuration Validator - Production Ready
// =============================================================================
// Comprehensive configuration validation for production deployment

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

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

// Security patterns to detect weak or placeholder values
const WEAK_PATTERNS = [
  'your_', 'YOUR_', 'here', 'HERE', 'placeholder', 'PLACEHOLDER',
  'test_', 'TEST_', 'demo_', 'DEMO_', 'example_', 'EXAMPLE_',
  'localhost', '127.0.0.1', 'example.com', 'your-domain.com',
  'change_me', 'CHANGE_ME', 'replace_me', 'REPLACE_ME',
  'dev_password', 'development', 'prod_password',
  'default_', 'DEFAULT_', 'admin_', 'ADMIN_'
];

// Configuration validation results
let results = {
  passed: 0,
  failed: 0,
  warnings: 0,
  errors: [],
  warnings_list: [],
  score: 0
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

// Check if a value contains weak patterns
function hasWeakPattern(value) {
  if (!value || typeof value !== 'string') return false;
  return WEAK_PATTERNS.some(pattern => 
    value.toLowerCase().includes(pattern.toLowerCase())
  );
}

// Validate secret key
function validateSecret(secret, name) {
  if (!secret || typeof secret !== 'string') {
    results.errors.push(`${name}: Secret is required`);
    results.failed++;
    return false;
  }

  if (secret.length < 32) {
    results.errors.push(`${name}: Secret must be at least 32 characters long`);
    results.failed++;
    return false;
  }

  if (hasWeakPattern(secret)) {
    results.errors.push(`${name}: Secret appears to be a placeholder or weak pattern`);
    results.failed++;
    return false;
  }

  const entropy = calculateEntropy(secret);
  if (entropy < 4.5) {
    results.warnings_list.push(`${name}: Secret has low entropy (${entropy.toFixed(2)})`);
    results.warnings++;
  }

  results.passed++;
  return true;
}

// Validate URL
function validateUrl(url, name) {
  if (!url || typeof url !== 'string') {
    results.errors.push(`${name}: URL is required`);
    results.failed++;
    return false;
  }

  if (hasWeakPattern(url)) {
    results.errors.push(`${name}: URL appears to contain placeholder values`);
    results.failed++;
    return false;
  }

  try {
    new URL(url);
    results.passed++;
    return true;
  } catch (error) {
    results.errors.push(`${name}: Invalid URL format`);
    results.failed++;
    return false;
  }
}

// Validate API key
function validateApiKey(apiKey, name) {
  if (!apiKey || apiKey === '') {
    results.warnings_list.push(`${name}: API key is empty (optional service)`);
    results.warnings++;
    return true; // Empty is OK for optional services
  }

  if (typeof apiKey !== 'string' || apiKey.length < 20) {
    results.errors.push(`${name}: API key must be at least 20 characters long`);
    results.failed++;
    return false;
  }

  if (hasWeakPattern(apiKey)) {
    results.errors.push(`${name}: API key appears to be a placeholder`);
    results.failed++;
    return false;
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(apiKey)) {
    results.errors.push(`${name}: API key contains invalid characters`);
    results.failed++;
    return false;
  }

  results.passed++;
  return true;
}

// Load and parse environment file
function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
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

// Validate backend configuration
function validateBackendConfig() {
  log('\n🔧 Backend Configuration Validation', 'cyan');
  log('=====================================');

  const envPaths = [
    path.join(__dirname, '../backend/.env.backend'),
    path.join(__dirname, '../backend/env.backend'),
    path.join(__dirname, '../backend/.env.production'),
    path.join(__dirname, '../backend/env.production')
  ];

  let env = null;
  let envPath = null;

  for (const envPathCandidate of envPaths) {
    if (fs.existsSync(envPathCandidate)) {
      env = loadEnvFile(envPathCandidate);
      envPath = envPathCandidate;
      break;
    }
  }

  if (!env) {
    logError('No backend environment file found');
    results.errors.push('Backend environment file not found');
    results.failed++;
    return;
  }

  logInfo(`Using environment file: ${path.basename(envPath)}`);

  // Required secrets
  const requiredSecrets = [
    'JWT_SECRET',
    'ENCRYPTION_KEY',
    'CSRF_SECRET',
    'SESSION_SECRET'
  ];

  requiredSecrets.forEach(secret => {
    if (validateSecret(env[secret], secret)) {
      logSuccess(`${secret} is valid`);
    } else {
      logError(`${secret} validation failed`);
    }
  });

  // Database URL
  if (validateUrl(env.DATABASE_URL, 'DATABASE_URL')) {
    logSuccess('DATABASE_URL is valid');
    
    // Additional database checks
    if (env.NODE_ENV === 'production') {
      if (env.DATABASE_URL.includes('localhost')) {
        results.errors.push('DATABASE_URL: Cannot use localhost in production');
        results.failed++;
        logError('DATABASE_URL uses localhost in production');
      } else if (!env.DATABASE_URL.includes('sslmode=require')) {
        results.warnings_list.push('DATABASE_URL: Should include sslmode=require for production');
        results.warnings++;
        logWarning('DATABASE_URL does not specify SSL mode');
      }
    }
  } else {
    logError('DATABASE_URL validation failed');
  }

  // Exchange API keys (optional)
  const exchangeKeys = [
    'BINANCE_API_KEY', 'BINANCE_SECRET_KEY',
    'WAZIRX_API_KEY', 'WAZIRX_SECRET_KEY',
    'COINDCX_API_KEY', 'COINDCX_SECRET_KEY',
    'DELTA_API_KEY', 'DELTA_SECRET_KEY',
    'COINBASE_API_KEY', 'COINBASE_SECRET_KEY'
  ];

  exchangeKeys.forEach(key => {
    if (validateApiKey(env[key], key)) {
      if (env[key] && env[key] !== '') {
        logSuccess(`${key} is valid`);
      }
    } else {
      logError(`${key} validation failed`);
    }
  });

  // Payment configuration
  if (env.CASHFREE_APP_ID && env.CASHFREE_APP_ID !== '') {
    if (hasWeakPattern(env.CASHFREE_APP_ID)) {
      results.errors.push('CASHFREE_APP_ID appears to be a placeholder');
      results.failed++;
      logError('CASHFREE_APP_ID validation failed');
    } else {
      results.passed++;
      logSuccess('CASHFREE_APP_ID is valid');
    }
  }

  if (env.CASHFREE_SECRET_KEY && env.CASHFREE_SECRET_KEY !== '') {
    if (validateSecret(env.CASHFREE_SECRET_KEY, 'CASHFREE_SECRET_KEY')) {
      logSuccess('CASHFREE_SECRET_KEY is valid');
    } else {
      logError('CASHFREE_SECRET_KEY validation failed');
    }
  }

  // Production-specific checks
  if (env.NODE_ENV === 'production') {
    log('\n🚨 Production Environment Checks', 'magenta');
    
    if (env.ENABLE_DEBUG === 'true') {
      results.warnings_list.push('ENABLE_DEBUG should be false in production');
      results.warnings++;
      logWarning('Debug mode is enabled in production');
    }

    if (env.ENABLE_MOCK_DATA === 'true') {
      results.warnings_list.push('ENABLE_MOCK_DATA should be false in production');
      results.warnings++;
      logWarning('Mock data is enabled in production');
    }

    if (env.HTTPS_ENABLED === 'false') {
      results.warnings_list.push('HTTPS_ENABLED should be true in production');
      results.warnings++;
      logWarning('HTTPS is disabled in production');
    }

    if (env.LOG_LEVEL === 'debug') {
      results.warnings_list.push('LOG_LEVEL should be info or higher in production');
      results.warnings++;
      logWarning('Log level is set to debug in production');
    }
  }
}

// Validate frontend configuration
function validateFrontendConfig() {
  log('\n🎨 Frontend Configuration Validation', 'cyan');
  log('=====================================');

  const envPaths = [
    path.join(__dirname, '../frontend/.env.local'),
    path.join(__dirname, '../frontend/.env.production'),
    path.join(__dirname, '../frontend/.env')
  ];

  let env = null;
  let envPath = null;

  for (const envPathCandidate of envPaths) {
    if (fs.existsSync(envPathCandidate)) {
      env = loadEnvFile(envPathCandidate);
      envPath = envPathCandidate;
      break;
    }
  }

  if (!env) {
    logWarning('No frontend environment file found');
    results.warnings_list.push('Frontend environment file not found');
    results.warnings++;
    return;
  }

  logInfo(`Using environment file: ${path.basename(envPath)}`);

  // API URLs
  const apiUrls = [
    'VITE_API_BASE_URL',
    'VITE_BACKEND_URL'
  ];

  apiUrls.forEach(url => {
    if (env[url]) {
      if (validateUrl(env[url], url)) {
        logSuccess(`${url} is valid`);
      } else {
        logError(`${url} validation failed`);
      }
    } else {
      results.warnings_list.push(`${url} is not set`);
      results.warnings++;
      logWarning(`${url} is not configured`);
    }
  });

  // External API keys
  const externalKeys = [
    'VITE_COINGECKO_API_KEY',
    'VITE_NEWS_API_KEY',
    'VITE_GA_TRACKING_ID',
    'VITE_SENTRY_DSN'
  ];

  externalKeys.forEach(key => {
    if (env[key]) {
      if (hasWeakPattern(env[key])) {
        results.errors.push(`${key} appears to be a placeholder`);
        results.failed++;
        logError(`${key} validation failed`);
      } else {
        results.passed++;
        logSuccess(`${key} is valid`);
      }
    }
  });

  // Production checks
  if (env.NODE_ENV === 'production') {
    if (env.VITE_API_BASE_URL && env.VITE_API_BASE_URL.includes('localhost')) {
      results.errors.push('VITE_API_BASE_URL should not use localhost in production');
      results.failed++;
      logError('API URL uses localhost in production');
    }

    if (env.VITE_ENABLE_DEBUG === 'true') {
      results.warnings_list.push('VITE_ENABLE_DEBUG should be false in production');
      results.warnings++;
      logWarning('Debug mode is enabled in production');
    }
  }
}

// Check for placeholder values in templates
function validateTemplates() {
  log('\n📄 Template Validation', 'cyan');
  log('======================');

  const templatePaths = [
    path.join(__dirname, '../env-templates/backend.env'),
    path.join(__dirname, '../env-templates/frontend.env'),
    path.join(__dirname, '../env-templates/backend.env.production'),
    path.join(__dirname, '../env-templates/frontend.env.production')
  ];

  templatePaths.forEach(templatePath => {
    if (fs.existsSync(templatePath)) {
      const content = fs.readFileSync(templatePath, 'utf8');
      
      // Check for old placeholder patterns
      const oldPatterns = ['your_', 'YOUR_', 'here', 'HERE'];
      const hasOldPatterns = oldPatterns.some(pattern => content.includes(pattern));
      
      if (hasOldPatterns) {
        results.warnings_list.push(`Template ${path.basename(templatePath)} contains old placeholder patterns`);
        results.warnings++;
        logWarning(`Template ${path.basename(templatePath)} contains old placeholder patterns`);
      } else {
        results.passed++;
        logSuccess(`Template ${path.basename(templatePath)} is up to date`);
      }
    }
  });
}

// Generate secure secrets
function generateSecrets() {
  log('\n🔐 Secure Secret Generation', 'cyan');
  log('============================');

  const secrets = {
    JWT_SECRET: crypto.randomBytes(32).toString('hex'),
    ENCRYPTION_KEY: crypto.randomBytes(32).toString('hex'),
    CSRF_SECRET: crypto.randomBytes(32).toString('hex'),
    SESSION_SECRET: crypto.randomBytes(32).toString('hex')
  };

  logInfo('Generated cryptographically secure secrets:');
  Object.entries(secrets).forEach(([key, value]) => {
    log(`${key}=${value}`, 'dim');
  });

  return secrets;
}

// Main validation function
function main() {
  log('🔍 CryptoPulse Configuration Validator', 'bright');
  log('=======================================');
  log('Comprehensive configuration validation for production deployment\n');

  // Validate backend
  validateBackendConfig();

  // Validate frontend
  validateFrontendConfig();

  // Validate templates
  validateTemplates();

  // Calculate score
  const total = results.passed + results.failed;
  results.score = total > 0 ? Math.round((results.passed / total) * 100) : 0;

  // Display results
  log('\n📊 Validation Results', 'cyan');
  log('=====================');
  log(`Passed: ${results.passed}`, 'green');
  log(`Failed: ${results.failed}`, 'red');
  log(`Warnings: ${results.warnings}`, 'yellow');
  log(`Score: ${results.score}%`, results.score >= 90 ? 'green' : results.score >= 70 ? 'yellow' : 'red');

  // Display errors
  if (results.errors.length > 0) {
    log('\n❌ Errors:', 'red');
    results.errors.forEach(error => log(`  - ${error}`, 'red'));
  }

  // Display warnings
  if (results.warnings_list.length > 0) {
    log('\n⚠️  Warnings:', 'yellow');
    results.warnings_list.forEach(warning => log(`  - ${warning}`, 'yellow'));
  }

  // Recommendations
  log('\n💡 Recommendations:', 'blue');
  if (results.score < 90) {
    log('  - Fix all errors before production deployment', 'yellow');
    log('  - Address warnings for optimal security', 'yellow');
    log('  - Run "node scripts/config-validator.js --generate-secrets" to generate secure secrets', 'blue');
  } else {
    log('  - Configuration is production-ready!', 'green');
    log('  - Consider running security audit: pnpm run audit:security', 'blue');
    log('  - Set up monitoring and alerting', 'blue');
  }

  // Generate secrets if requested
  if (process.argv.includes('--generate-secrets')) {
    const secrets = generateSecrets();
    
    log('\n📝 To use these secrets, add them to your environment file:', 'blue');
    log('Example:', 'dim');
    log('JWT_SECRET=' + secrets.JWT_SECRET, 'dim');
    log('ENCRYPTION_KEY=' + secrets.ENCRYPTION_KEY, 'dim');
    log('CSRF_SECRET=' + secrets.CSRF_SECRET, 'dim');
    log('SESSION_SECRET=' + secrets.SESSION_SECRET, 'dim');
  }

  // Exit with appropriate code
  const exitCode = results.failed > 0 ? 1 : 0;
  process.exit(exitCode);
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  validateBackendConfig,
  validateFrontendConfig,
  validateTemplates,
  generateSecrets,
  results
};
