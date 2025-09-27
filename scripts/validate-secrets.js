#!/usr/bin/env node

/**
 * Production Secrets Validation Script
 * Validates all required secrets for CryptoPulse production deployment
 */

const fs = require('fs');
const path = require('path');

// Required secrets configuration
const REQUIRED_SECRETS = {
  production: {
    // Back4App Configuration
    BACK4APP_APP_ID: { minLength: 10, description: 'Back4App Application ID' },
    BACK4APP_MASTER_KEY: { minLength: 20, description: 'Back4App Master Key' },
    BACK4APP_JAVASCRIPT_KEY: { minLength: 10, description: 'Back4App JavaScript Key' },
    BACK4APP_SERVER_URL: { minLength: 20, description: 'Back4App Server URL' },
    
    // Exchange API Keys
    BINANCE_API_KEY: { minLength: 20, description: 'Binance API Key' },
    BINANCE_SECRET_KEY: { minLength: 20, description: 'Binance Secret Key' },
    WAZIRX_API_KEY: { minLength: 20, description: 'WazirX API Key' },
    WAZIRX_SECRET_KEY: { minLength: 20, description: 'WazirX Secret Key' },
    COINDCX_API_KEY: { minLength: 20, description: 'CoinDCX API Key' },
    COINDCX_SECRET_KEY: { minLength: 20, description: 'CoinDCX Secret Key' },
    DELTA_API_KEY: { minLength: 20, description: 'Delta Exchange API Key' },
    DELTA_SECRET_KEY: { minLength: 20, description: 'Delta Exchange Secret Key' },
    
    // Security Keys
    JWT_SECRET: { minLength: 32, description: 'JWT Secret Key (32+ chars)' },
    ENCRYPTION_KEY: { minLength: 32, description: 'Encryption Key (32+ chars)' },
    CSRF_SECRET: { minLength: 20, description: 'CSRF Secret' },
    SESSION_SECRET: { minLength: 20, description: 'Session Secret' },
    
    // External Services
    SLACK_WEBHOOK: { minLength: 50, description: 'Slack Webhook URL' },
    PRODUCTION_URL: { minLength: 10, description: 'Production URL' },
    STAGING_URL: { minLength: 10, description: 'Staging URL' }
  },
  
  staging: {
    // Back4App Configuration
    BACK4APP_STAGING_APP_ID: { minLength: 10, description: 'Back4App Staging App ID' },
    BACK4APP_STAGING_MASTER_KEY: { minLength: 20, description: 'Back4App Staging Master Key' },
    BACK4APP_STAGING_JAVASCRIPT_KEY: { minLength: 10, description: 'Back4App Staging JavaScript Key' },
    BACK4APP_SERVER_URL: { minLength: 20, description: 'Back4App Server URL' },
    
    // Exchange API Keys (can use test keys for staging)
    BINANCE_API_KEY: { minLength: 20, description: 'Binance API Key' },
    BINANCE_SECRET_KEY: { minLength: 20, description: 'Binance Secret Key' },
    DELTA_API_KEY: { minLength: 20, description: 'Delta Exchange API Key' },
    DELTA_SECRET_KEY: { minLength: 20, description: 'Delta Exchange Secret Key' },
    
    // Security Keys
    JWT_SECRET: { minLength: 32, description: 'JWT Secret Key (32+ chars)' },
    ENCRYPTION_KEY: { minLength: 32, description: 'Encryption Key (32+ chars)' },
    CSRF_SECRET: { minLength: 20, description: 'CSRF Secret' },
    SESSION_SECRET: { minLength: 20, description: 'Session Secret' },
    
    // External Services
    SLACK_WEBHOOK: { minLength: 50, description: 'Slack Webhook URL' },
    STAGING_URL: { minLength: 10, description: 'Staging URL' }
  }
};

// Validation functions
function validateSecret(value, config) {
  if (!value || typeof value !== 'string') {
    return { valid: false, error: 'Secret is missing or not a string' };
  }
  
  if (value.length < config.minLength) {
    return { valid: false, error: `Secret must be at least ${config.minLength} characters long` };
  }
  
  // Check for placeholder values
  const placeholderPatterns = [
    /^your_.*$/i,
    /^<.*>$/,
    /^\[.*\]$/,
    /^\{.*\}$/,
    /^placeholder/i,
    /^example/i,
    /^test/i,
    /^demo/i
  ];
  
  for (const pattern of placeholderPatterns) {
    if (pattern.test(value)) {
      return { valid: false, error: 'Secret appears to be a placeholder value' };
    }
  }
  
  return { valid: true };
}

function validateEnvironment(environment) {
  const secrets = REQUIRED_SECRETS[environment];
  if (!secrets) {
    console.error(`❌ Unknown environment: ${environment}`);
    console.log('Available environments: production, staging');
    process.exit(1);
  }
  
  console.log(`🔍 Validating secrets for ${environment} environment...\n`);
  
  const results = {
    valid: true,
    errors: [],
    warnings: [],
    summary: {
      total: Object.keys(secrets).length,
      valid: 0,
      invalid: 0,
      missing: 0
    }
  };
  
  // Check each required secret
  for (const [secretName, config] of Object.entries(secrets)) {
    const value = process.env[secretName];
    
    if (!value) {
      results.errors.push({
        secret: secretName,
        error: 'Secret is not set in environment variables',
        description: config.description
      });
      results.summary.missing++;
      results.valid = false;
    } else {
      const validation = validateSecret(value, config);
      
      if (validation.valid) {
        console.log(`✅ ${secretName}: Valid`);
        results.summary.valid++;
      } else {
        results.errors.push({
          secret: secretName,
          error: validation.error,
          description: config.description
        });
        results.summary.invalid++;
        results.valid = false;
      }
    }
  }
  
  // Display results
  console.log('\n📊 Validation Summary:');
  console.log(`   Total secrets: ${results.summary.total}`);
  console.log(`   ✅ Valid: ${results.summary.valid}`);
  console.log(`   ❌ Invalid: ${results.summary.invalid}`);
  console.log(`   ⚠️  Missing: ${results.summary.missing}`);
  
  if (results.errors.length > 0) {
    console.log('\n❌ Validation Errors:');
    results.errors.forEach(error => {
      console.log(`   • ${error.secret}: ${error.error}`);
      console.log(`     Description: ${error.description}`);
    });
  }
  
  if (results.warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    results.warnings.forEach(warning => {
      console.log(`   • ${warning.secret}: ${warning.message}`);
    });
  }
  
  if (results.valid) {
    console.log('\n🎉 All secrets are valid! Ready for deployment.');
  } else {
    console.log('\n💥 Secret validation failed! Please fix the errors above.');
    process.exit(1);
  }
  
  return results;
}

// Main execution
function main() {
  const environment = process.argv[2] || 'production';
  
  console.log('🔐 CryptoPulse Secrets Validation Tool');
  console.log('=====================================\n');
  
  try {
    validateEnvironment(environment);
  } catch (error) {
    console.error('❌ Validation failed with error:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  validateEnvironment,
  validateSecret,
  REQUIRED_SECRETS
};
