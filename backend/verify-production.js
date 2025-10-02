#!/usr/bin/env node
// =============================================================================
// CryptoPulse Backend Production Readiness Verification
// =============================================================================
// This script verifies that the backend is ready for production deployment

const fs = require('fs');
const path = require('path');
const { execSync: _execSync } = require('child_process');
const logger = require('./lib/logging');

logger.info('🔍 CryptoPulse Backend Production Readiness Check');
logger.info('================================================\n');

let score = 0;
let maxScore = 0;
const issues = [];
const warnings = [];

// Check function
function check(description, test, points = 1) {
  maxScore += points;
  logger.info(`Checking: ${description}...`);

  try {
    if (test()) {
      score += points;
      logger.info(`  ✅ PASS (${points} point${points > 1 ? 's' : ''})`);
    } else {
      logger.warn('  ❌ FAIL (0 points)');
    }
  } catch (error) {
    logger.error(`  ❌ ERROR: ${error.message}`);
    issues.push(`${description}: ${error.message}`);
  }
}

// Warning function
function warn(description, message) {
  warnings.push(`${description}: ${message}`);
  logger.warn(`  ⚠️  WARNING: ${message}`);
}

// Check if file exists
function fileExists(filePath) {
  return fs.existsSync(path.join(__dirname, filePath));
}

// Check if file has content
function _fileHasContent(filePath) {
  if (!fileExists(filePath)) {return false;}
  const content = fs.readFileSync(path.join(__dirname, filePath), 'utf8');
  return content.trim().length > 0;
}

// Check if file contains placeholder values
function _hasPlaceholders(filePath) {
  if (!fileExists(filePath)) {return false;}
  const content = fs.readFileSync(path.join(__dirname, filePath), 'utf8');
  const placeholders = [
    'your_', 'YOUR_', 'placeholder', 'PLACEHOLDER',
    'localhost', '127.0.0.1', 'example.com'
  ];
  return placeholders.some(placeholder => content.includes(placeholder));
}

// Check if secret is secure
function isSecureSecret(secret) {
  if (!secret || secret.length < 32) {return false;}
  const weakPatterns = ['test', 'dev', 'development', 'secret', 'key'];
  return !weakPatterns.some(pattern =>
    secret.toLowerCase().includes(pattern.toLowerCase())
  );
}

// Environment file checks
logger.info('📁 Environment Configuration:');
check('Environment file exists', () => fileExists('.env.backend') || fileExists('env.backend'), 2);
check('Production environment file exists', () => fileExists('.env.production') || fileExists('env.production.secure'), 2);

if (fileExists('.env.backend') || fileExists('env.backend')) {
  const envFile = fileExists('.env.backend') ? '.env.backend' : 'env.backend';
  const envContent = fs.readFileSync(path.join(__dirname, envFile), 'utf8');

  check('JWT_SECRET is configured', () => envContent.includes('JWT_SECRET='), 1);
  check('DATABASE_URL is configured', () => envContent.includes('DATABASE_URL='), 1);
  check('ENCRYPTION_KEY is configured', () => envContent.includes('ENCRYPTION_KEY='), 1);

  if (envContent.includes('JWT_SECRET=')) {
    const jwtSecret = envContent.match(/JWT_SECRET=(.+)/)?.[1];
    if (jwtSecret && !isSecureSecret(jwtSecret)) {
      warn('JWT_SECRET', 'Secret appears to be weak or placeholder');
    }
  }
}

// Package.json checks
logger.info('\n📦 Package Configuration:');
check('package.json exists', () => fileExists('package.json'), 1);
check('package-lock.json exists', () => fileExists('package-lock.json'), 1);

if (fileExists('package.json')) {
  const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));

  check('Node.js version specified', () => packageJson.engines?.node, 1);
  check('Production start script', () => packageJson.scripts?.start, 1);
  check('Security dependencies present', () => {
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    return deps.helmet && deps['express-rate-limit'] && deps.bcryptjs;
  }, 2);
}


// Database schema checks
logger.info('\n🗄️  Database Schema:');
check('Schema file exists', () => fileExists('schema.sql'), 2);
check('Schema has tables', () => {
  if (!fileExists('schema.sql')) {return false;}
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  return schema.includes('CREATE TABLE') && schema.includes('users');
}, 2);
check('Schema has indexes', () => {
  if (!fileExists('schema.sql')) {return false;}
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  return schema.includes('CREATE INDEX');
}, 1);

// Security checks
logger.info('\n🔒 Security Configuration:');
check('Security middleware exists', () => fileExists('lib/security.js'), 2);
check('Authentication module exists', () => fileExists('lib/auth.js'), 2);
check('Environment validation exists', () => fileExists('lib/envValidation.js'), 2);

// Main application checks
logger.info('\n🚀 Application Code:');
check('Main application exists', () => fileExists('index.js'), 2);
check('Error handling', () => {
  if (!fileExists('index.js')) {return false;}
  const index = fs.readFileSync(path.join(__dirname, 'index.js'), 'utf8');
  return index.includes('errorHandler') && index.includes('try') && index.includes('catch');
}, 2);
check('Health endpoints', () => {
  if (!fileExists('index.js')) {return false;}
  const index = fs.readFileSync(path.join(__dirname, 'index.js'), 'utf8');
  return index.includes('/health') && index.includes('/health/detailed');
}, 2);
check('Rate limiting', () => {
  if (!fileExists('index.js')) {return false;}
  const index = fs.readFileSync(path.join(__dirname, 'index.js'), 'utf8');
  return index.includes('rateLimit') || index.includes('limiter');
}, 2);

// Test for production-specific issues
logger.warn('\n⚠️  Production Warnings:');
if (fileExists('.env.backend') || fileExists('env.backend')) {
  const envFile = fileExists('.env.backend') ? '.env.backend' : 'env.backend';
  const envContent = fs.readFileSync(path.join(__dirname, envFile), 'utf8');

  if (envContent.includes('localhost')) {
    warn('Environment', 'Contains localhost URLs - not suitable for production');
  }
  if (envContent.includes('dev_password')) {
    warn('Environment', 'Contains development passwords - not suitable for production');
  }
  if (envContent.includes('ENABLE_DEBUG=true')) {
    warn('Environment', 'Debug mode enabled - should be false in production');
  }
}

// Calculate final score
const percentage = Math.round((score / maxScore) * 100);

logger.info('\n📊 Production Readiness Score:');
logger.info(`   Score: ${score}/${maxScore} (${percentage}%)`);

if (percentage >= 90) {
  logger.info('   🎉 EXCELLENT - Ready for production!');
} else if (percentage >= 80) {
  logger.info('   ✅ GOOD - Minor issues to address');
} else if (percentage >= 70) {
  logger.warn('   ⚠️  FAIR - Several issues need attention');
} else {
  logger.error('   ❌ POOR - Major issues must be fixed');
}

// Display issues
if (issues.length > 0) {
  logger.error('\n❌ Issues Found:');
  issues.forEach(issue => logger.error(`   - ${issue}`));
}

// Display warnings
if (warnings.length > 0) {
  logger.warn('\n⚠️  Warnings:');
  warnings.forEach(warning => logger.warn(`   - ${warning}`));
}

// Recommendations
logger.info('\n💡 Recommendations:');
if (percentage < 90) {
  logger.info('   - Fix all issues above before production deployment');
  logger.info('   - Run security audit: npm run audit:security');
  logger.info('   - Test all endpoints: npm run test');
  logger.info('   - Verify environment configuration');
} else {
  logger.info('   - Run final security audit: npm run audit:security');
  logger.info('   - Test in staging environment');
  logger.info('   - Set up monitoring and alerting');
  logger.info('   - Configure backup and disaster recovery');
}

logger.info('\n🚀 Production readiness check complete!');

// Exit with appropriate code
process.exit(percentage >= 80 ? 0 : 1);
