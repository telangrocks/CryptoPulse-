#!/usr/bin/env node

/**
 * Environment Configuration Validation Script
 * Ensures all required environment variables are present and consistent
 */

const fs = require('fs');
const path = require('path');

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function parseEnvFile(filePath) {
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

function validateEnvironment() {
  log('🔍 Validating Environment Configuration...', 'blue');
  log('=' .repeat(60), 'cyan');
  
  const frontendEnv = parseEnvFile(path.join(__dirname, '..', 'frontend', 'env.example'));
  const productionEnv = parseEnvFile(path.join(__dirname, '..', 'env.production.example'));
  
  // Required environment variables
  const requiredVars = [
    'VITE_BACK4APP_APP_ID',
    'VITE_BACK4APP_CLIENT_KEY',
    'VITE_BACK4APP_MASTER_KEY',
    'VITE_BACK4APP_SERVER_URL',
    'VITE_APP_NAME',
    'VITE_APP_VERSION',
    'VITE_APP_ENVIRONMENT',
    'VITE_API_URL',
    'VITE_API_TIMEOUT',
    'VITE_ENABLE_LIVE_TRADING',
    'VITE_ENABLE_AI_AUTOMATION',
    'VITE_ENABLE_BACKTESTING',
    'VITE_ENABLE_ANALYTICS',
    'VITE_DEFAULT_PAIRS',
    'VITE_DEFAULT_STRATEGY',
    'VITE_RISK_LEVEL',
    'VITE_THEME',
    'VITE_LANGUAGE',
    'VITE_CURRENCY',
    'VITE_LOG_LEVEL',
    'VITE_ENABLE_CONSOLE_LOGS',
    'VITE_CACHE_DURATION',
    'VITE_MAX_RETRY_ATTEMPTS',
    'VITE_REQUEST_TIMEOUT',
    'VITE_ENCRYPTION_KEY',
    'VITE_ENABLE_2FA',
    'VITE_SESSION_TIMEOUT',
    'VITE_SSL_ENABLED',
    'VITE_FORCE_HTTPS',
    'VITE_BINANCE_API_URL',
    'VITE_COINGECKO_API_URL',
    'VITE_CASHFREE_MODE',
    'VITE_CASHFREE_SANDBOX_APP_ID',
    'VITE_CASHFREE_LIVE_APP_ID'
  ];
  
  let allValid = true;
  const issues = [];
  
  // Check frontend environment
  log('\n📁 Frontend Environment (frontend/env.example):', 'yellow');
  requiredVars.forEach(varName => {
    if (frontendEnv[varName]) {
      log(`  ✅ ${varName}`, 'green');
    } else {
      log(`  ❌ ${varName} - MISSING`, 'red');
      issues.push(`Frontend missing: ${varName}`);
      allValid = false;
    }
  });
  
  // Check production environment
  log('\n🏭 Production Environment (env.production.example):', 'yellow');
  requiredVars.forEach(varName => {
    if (productionEnv[varName]) {
      log(`  ✅ ${varName}`, 'green');
    } else {
      log(`  ❌ ${varName} - MISSING`, 'red');
      issues.push(`Production missing: ${varName}`);
      allValid = false;
    }
  });
  
  // Check for inconsistencies
  log('\n🔄 Checking for inconsistencies:', 'yellow');
  const inconsistencies = [];
  
  requiredVars.forEach(varName => {
    const frontendValue = frontendEnv[varName];
    const productionValue = productionEnv[varName];
    
    if (frontendValue && productionValue && frontendValue !== productionValue) {
      // Some variables are expected to be different
      const allowedDifferences = [
        'VITE_APP_ENVIRONMENT',
        'VITE_CASHFREE_MODE',
        'VITE_LOG_LEVEL',
        'VITE_ENABLE_CONSOLE_LOGS'
      ];
      
      if (!allowedDifferences.includes(varName)) {
        inconsistencies.push(`${varName}: Frontend="${frontendValue}" vs Production="${productionValue}"`);
        allValid = false;
      }
    }
  });
  
  if (inconsistencies.length > 0) {
    inconsistencies.forEach(issue => {
      log(`  ⚠️  ${issue}`, 'yellow');
    });
  } else {
    log('  ✅ No inconsistencies found', 'green');
  }
  
  // Check for placeholder values
  log('\n🔍 Checking for placeholder values:', 'yellow');
  const placeholderChecks = [
    { file: 'Frontend', env: frontendEnv },
    { file: 'Production', env: productionEnv }
  ];
  
  placeholderChecks.forEach(({ file, env }) => {
    Object.entries(env).forEach(([key, value]) => {
      if (value.includes('your-') || value.includes('YOUR_') || value === 'your-domain.com') {
        log(`  ⚠️  ${file}: ${key} contains placeholder value`, 'yellow');
      }
    });
  });
  
  // Summary
  log('\n' + '=' .repeat(60), 'cyan');
  if (allValid) {
    log('✅ Environment configuration is valid and consistent!', 'green');
    log('🚀 Ready for production deployment', 'green');
  } else {
    log('❌ Environment configuration has issues:', 'red');
    issues.forEach(issue => {
      log(`  • ${issue}`, 'red');
    });
    log('\n🔧 Please fix the issues above before deploying', 'yellow');
  }
  
  return allValid;
}

// Run validation
if (require.main === module) {
  const isValid = validateEnvironment();
  process.exit(isValid ? 0 : 1);
}

module.exports = { validateEnvironment };
