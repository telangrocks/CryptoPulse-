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
  
  const back4appEnv = parseEnvFile(path.join(__dirname, '..', 'back4app-env.example'));
  const frontendEnv = parseEnvFile(path.join(__dirname, '..', 'frontend', 'env.production.example'));
  
  // Required Back4App environment variables
  const back4appRequiredVars = [
    'BACK4APP_APP_ID',
    'BACK4APP_JAVASCRIPT_KEY',
    'BACK4APP_MASTER_KEY',
    'BACK4APP_SERVER_URL',
    'BINANCE_API_KEY',
    'BINANCE_SECRET_KEY',
    'COINBASE_API_KEY',
    'COINBASE_SECRET_KEY',
    'ALPHA_VANTAGE_API_KEY',
    'JWT_SECRET',
    'SESSION_SECRET',
    'CSRF_SECRET'
  ];
  
  // Required frontend environment variables
  const frontendRequiredVars = [
    'VITE_BACK4APP_APP_ID',
    'VITE_BACK4APP_CLIENT_KEY',
    'VITE_BACK4APP_MASTER_KEY',
    'VITE_BACK4APP_SERVER_URL',
    'VITE_CASHFREE_MODE',
    'VITE_CASHFREE_SANDBOX_APP_ID',
    'VITE_CASHFREE_LIVE_APP_ID'
  ];
  
  let allValid = true;
  const issues = [];
  
  // Check Back4App environment
  log('\n🔧 Back4App Environment (back4app-env.example):', 'yellow');
  back4appRequiredVars.forEach(varName => {
    if (back4appEnv[varName]) {
      log(`  ✅ ${varName}`, 'green');
    } else {
      log(`  ❌ ${varName} - MISSING`, 'red');
      issues.push(`Back4App missing: ${varName}`);
      allValid = false;
    }
  });
  
  // Check frontend environment
  log('\n📁 Frontend Environment (frontend/env.production.example):', 'yellow');
  frontendRequiredVars.forEach(varName => {
    if (frontendEnv[varName]) {
      log(`  ✅ ${varName}`, 'green');
    } else {
      log(`  ❌ ${varName} - MISSING`, 'red');
      issues.push(`Frontend missing: ${varName}`);
      allValid = false;
    }
  });
  
  // Check for inconsistencies between Back4App and Frontend
  log('\n🔄 Checking for inconsistencies:', 'yellow');
  const inconsistencies = [];
  
  // Check Back4App vs Frontend consistency
  const back4appToFrontendMapping = {
    'BACK4APP_APP_ID': 'VITE_BACK4APP_APP_ID',
    'BACK4APP_JAVASCRIPT_KEY': 'VITE_BACK4APP_CLIENT_KEY',
    'BACK4APP_MASTER_KEY': 'VITE_BACK4APP_MASTER_KEY',
    'BACK4APP_SERVER_URL': 'VITE_BACK4APP_SERVER_URL'
  };
  
  Object.entries(back4appToFrontendMapping).forEach(([back4appKey, frontendKey]) => {
    const back4appValue = back4appEnv[back4appKey];
    const frontendValue = frontendEnv[frontendKey];
    
    if (back4appValue && frontendValue && back4appValue !== frontendValue) {
      inconsistencies.push(`${back4appKey} vs ${frontendKey}: "${back4appValue}" vs "${frontendValue}"`);
      allValid = false;
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
    { file: 'Back4App', env: back4appEnv },
    { file: 'Frontend', env: frontendEnv }
  ];
  
  placeholderChecks.forEach(({ file, env }) => {
    Object.entries(env).forEach(([key, value]) => {
      if (value.includes('your-') || value.includes('YOUR_') || value === 'your-domain.com' || value.includes('your-app-id') || value.includes('your-javascript-key')) {
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
