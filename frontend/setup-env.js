#!/usr/bin/env node

/**
 * Environment Setup Script
 * Creates .env files with proper Back4App configuration
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Environment configurations
const environments = {
  development: {
    VITE_BACK4APP_APP_ID: 'your-app-id-here',
    VITE_BACK4APP_CLIENT_KEY: 'your-client-key-here',
    VITE_BACK4APP_SERVER_URL: 'https://parseapi.back4app.com/parse',
    VITE_BACK4APP_MASTER_KEY: 'your-master-key-here',
    VITE_APP_NAME: 'CryptoPulse Trading Bot',
    VITE_APP_VERSION: '1.0.0',
    VITE_APP_ENVIRONMENT: 'development',
    VITE_API_BASE_URL: 'https://parseapi.back4app.com/parse',
    VITE_CLOUD_FUNCTIONS_URL: 'https://parseapi.back4app.com/parse/functions',
    VITE_DEFAULT_PAIRS: 'BTC/USDT,ETH/USDT,ADA/USDT',
    VITE_DEFAULT_STRATEGY: 'AI_POWERED',
    VITE_RISK_LEVEL: 'MEDIUM',
    VITE_THEME: 'dark',
    VITE_LANGUAGE: 'en',
    VITE_CURRENCY: 'USD',
    VITE_ENABLE_2FA: 'true',
    VITE_SESSION_TIMEOUT: '3600',
    VITE_ENCRYPTION_KEY: 'your-32-character-encryption-key-here'
  },
  production: {
    VITE_BACK4APP_APP_ID: 'your-app-id-here',
    VITE_BACK4APP_CLIENT_KEY: 'your-client-key-here',
    VITE_BACK4APP_SERVER_URL: 'https://parseapi.back4app.com/parse',
    VITE_BACK4APP_MASTER_KEY: 'your-master-key-here',
    VITE_APP_NAME: 'CryptoPulse Trading Bot',
    VITE_APP_VERSION: '1.0.0',
    VITE_APP_ENVIRONMENT: 'production',
    VITE_API_BASE_URL: 'https://parseapi.back4app.com/parse',
    VITE_CLOUD_FUNCTIONS_URL: 'https://parseapi.back4app.com/parse/functions',
    VITE_DEFAULT_PAIRS: 'BTC/USDT,ETH/USDT,ADA/USDT',
    VITE_DEFAULT_STRATEGY: 'AI_POWERED',
    VITE_RISK_LEVEL: 'MEDIUM',
    VITE_THEME: 'dark',
    VITE_LANGUAGE: 'en',
    VITE_CURRENCY: 'USD',
    VITE_ENABLE_2FA: 'true',
    VITE_SESSION_TIMEOUT: '3600',
    VITE_ENCRYPTION_KEY: 'your-32-character-encryption-key-here'
  }
};

// Create .env file content
function createEnvContent(envVars) {
  return Object.entries(envVars)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
}

// Create .env files
function createEnvFiles() {
  const envDir = path.join(__dirname);
  
  // Create .env (default)
  const defaultEnv = createEnvContent(environments.development);
  fs.writeFileSync(path.join(envDir, '.env'), defaultEnv);
  console.log('✅ Created .env file');
  
  // Create .env.local
  fs.writeFileSync(path.join(envDir, '.env.local'), defaultEnv);
  console.log('✅ Created .env.local file');
  
  // Create .env.production
  const productionEnv = createEnvContent(environments.production);
  fs.writeFileSync(path.join(envDir, '.env.production'), productionEnv);
  console.log('✅ Created .env.production file');
  
  // Create .env.example
  const exampleEnv = createEnvContent(
    Object.fromEntries(
      Object.entries(environments.development).map(([key, value]) => [
        key,
        value.includes('your-') ? value : 'your-value-here'
      ])
    )
  );
  fs.writeFileSync(path.join(envDir, '.env.example'), exampleEnv);
  console.log('✅ Created .env.example file');
}

// Main execution
try {
  createEnvFiles();
  console.log('\n🎉 Environment files created successfully!');
  console.log('\n📝 Next steps:');
  console.log('1. Update the values in .env files with your actual credentials');
  console.log('2. Never commit .env files to version control');
  console.log('3. Use .env.example as a template for other environments');
} catch (error) {
  console.error('❌ Error creating environment files:', error.message);
  process.exit(1);
}

export { createEnvFiles, environments };
