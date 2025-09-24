#!/usr/bin/env node

/**
 * CryptoPulse Trading Bot - Doctor Script
 * 
 * This script performs a comprehensive health check of the CryptoPulse Trading Bot
 * to ensure all components are properly configured for Back4App deployment.
 * 
 * Usage: node doctor.js
 */

const fs = require('fs');
const path = require('path');

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Doctor configuration
const config = {
  appName: 'CryptoPulse',
  version: '1.0.0',
  requiredFiles: [
    'back4app.json',
    'cloud/main.js',
    'frontend/dist/index.html',
    'frontend/dist/manifest.json',
    'frontend/dist/sw.js',
    'frontend/dist/404.html',
    'frontend/dist/offline.html',
    'frontend/dist/robots.txt',
    'frontend/dist/sitemap.xml',
    'frontend/package.json',
    'frontend/vite.config.ts',
    'frontend/tailwind.config.js',
    'frontend/tsconfig.json',
    'frontend/src/main.tsx',
    'frontend/src/App.tsx',
    'frontend/src/lib/parse.ts',
    'frontend/src/lib/parse-http.ts',
    'frontend/src/contexts/AuthContext.tsx',
    'frontend/src/components/Dashboard.tsx',
    'frontend/src/components/AuthScreen.tsx',
    'frontend/src/components/APIKeySetup.tsx',
    'frontend/src/components/CryptoPairSelection.tsx',
    'frontend/src/components/BotSetup.tsx',
    'frontend/src/components/TradeExecution.tsx',
    'frontend/src/components/Backtesting.tsx',
    'frontend/src/components/AlertsSettings.tsx',
    'frontend/src/components/AIAutomation.tsx',
    'frontend/src/components/MonitoringDashboard.tsx',
    'frontend/src/components/PerformanceAnalytics.tsx',
    'frontend/src/components/EndToEndAutomation.tsx',
    'frontend/src/components/ComprehensiveTestPanel.tsx',
    'frontend/src/components/SecurityTestPanel.tsx',
    'frontend/src/components/WorldClassDashboard.tsx',
    'frontend/src/components/AIAssistant.tsx',
    'frontend/src/components/AutomationDashboard.tsx',
    'frontend/src/components/EnhancedTradeConfirmation.tsx',
    'frontend/src/components/NotificationCenter.tsx',
    'frontend/src/components/PaymentSuccess.tsx',
    'frontend/src/components/CashfreePayment.tsx',
    'frontend/src/components/DisclaimerScreen.tsx',
    'frontend/src/components/SplashScreen.tsx',
    'frontend/src/components/ErrorBoundary.tsx',
    'frontend/src/components/ErrorBoundaryWrapper.tsx',
    'frontend/src/components/ErrorFallback.tsx',
    'frontend/src/components/GlobalLoadingIndicator.tsx',
    'frontend/src/components/LoadingSkeletons.tsx',
    'frontend/src/components/AccessibilityProvider.tsx',
    'frontend/src/components/AccessibleButton.tsx',
    'frontend/src/components/AccessibleCard.tsx',
    'frontend/src/components/AdvancedCharts.tsx',
    'frontend/src/hooks/useAIAssistant.ts',
    'frontend/src/hooks/useAuthenticatedAPI.ts',
    'frontend/src/hooks/useDocumentHead.ts',
    'frontend/src/hooks/use-mobile.tsx',
    'frontend/src/hooks/use-toast.ts',
    'frontend/src/lib/advancedCache.ts',
    'frontend/src/lib/analytics.ts',
    'frontend/src/lib/apiKeyManager.ts',
    'frontend/src/lib/automationService.ts',
    'frontend/src/lib/cache.ts',
    'frontend/src/lib/csrfProtection.ts',
    'frontend/src/lib/encryption.ts',
    'frontend/src/lib/exchangeIntegration.ts',
    'frontend/src/lib/exchangeTest.ts',
    'frontend/src/lib/formValidation.ts',
    'frontend/src/lib/logger.ts',
    'frontend/src/lib/performance.ts',
    'frontend/src/lib/rateLimiter.ts',
    'frontend/src/lib/riskManagement.ts',
    'frontend/src/lib/secureStorage.ts',
    'frontend/src/lib/security.ts',
    'frontend/src/lib/sessionManager.ts',
    'frontend/src/lib/utils.ts',
    'frontend/src/lib/validation.ts',
    'frontend/src/lib/websocket.ts',
    'frontend/src/lib/websocketManager.ts',
    'frontend/src/store/index.ts',
    'frontend/src/store/hooks.ts',
    'frontend/src/store/slices/authSlice.ts',
    'frontend/src/store/slices/tradingSlice.ts',
    'frontend/src/styles/globals.css',
    'frontend/src/index.css',
    'frontend/src/App.css',
    'frontend/src/vite-env.d.ts',
    'frontend/src/polyfills/events.js',
    'frontend/src/test/setup.ts',
    'frontend/src/test/test-utils.tsx',
    'frontend/src/test/utils.tsx',
    'frontend/src/test/components/ErrorBoundary.test.tsx',
    'frontend/src/contexts/AppStateContext.tsx',
    'frontend/src/contexts/ThemeContext.tsx',
    'frontend/src/back4app/config.ts',
    'frontend/src/assets/react.svg',
    'frontend/src/components/ui/alert.tsx',
    'frontend/src/components/ui/badge.tsx',
    'frontend/src/components/ui/button.tsx',
    'frontend/src/components/ui/card.tsx',
    'frontend/src/components/ui/checkbox.tsx',
    'frontend/src/components/ui/input.tsx',
    'frontend/src/components/ui/label.tsx',
    'frontend/src/components/ui/progress.tsx',
    'frontend/src/components/ui/scroll-area.tsx',
    'frontend/src/components/ui/select.tsx',
    'frontend/src/components/ui/skeleton.tsx',
    'frontend/src/components/ui/slider.tsx',
    'frontend/src/components/ui/switch.tsx',
    'frontend/src/components/ui/tabs.tsx',
    'frontend/src/components/ui/toast.tsx',
    'frontend/src/components/ui/toaster.tsx',
    'frontend/index.html',
    'frontend/components.json',
    'frontend/eslint.config.js',
    'frontend/lint-staged.config.js',
    'frontend/postcss.config.js',
    'frontend/vitest.config.ts',
    'frontend/tsconfig.app.json',
    'frontend/tsconfig.node.json',
    'frontend/env.example',
    'frontend/README.md',
    'backend/cloud-functions.js',
    'backend/env.example',
    'backend/README.md',
    'BACK4APP_DEPLOYMENT_GUIDE.md',
    'package.json',
    'README.md'
  ],
  optionalFiles: [
    'frontend/package-simple.json',
    'frontend/src/App-simple.tsx',
    'frontend/public'
  ],
  requiredDirectories: [
    'frontend/node_modules',
    'frontend/dist'
  ],
  excludedFiles: [
    'node_modules',
    '.git',
    '.gitignore',
    '.env',
    '.env.local',
    '.env.development.local',
    '.env.test.local',
    '.env.production.local',
    'coverage',
    '.nyc_output',
    'dist',
    'build',
    '.cache',
    '.parcel-cache',
    '.next',
    '.nuxt',
    '.vuepress/dist',
    '.serverless',
    '.fusebox',
    '.dynamodb',
    '.tern-port',
    'logs',
    '*.log',
    'npm-debug.log*',
    'yarn-debug.log*',
    'yarn-error.log*',
    'lerna-debug.log*',
    '.DS_Store',
    '.vscode',
    '.idea',
    '*.swp',
    '*.swo',
    '*~',
    '.eslintcache',
    '.stylelintcache',
    '.rpt2_cache',
    '.rts2_cache_cjs',
    '.rts2_cache_es',
    '.rts2_cache_umd',
    '.cache',
    '.parcel-cache',
    '.next',
    '.nuxt',
    '.vuepress/dist',
    '.serverless',
    '.fusebox',
    '.dynamodb',
    '.tern-port',
    'logs',
    '*.log',
    'npm-debug.log*',
    'yarn-debug.log*',
    'yarn-error.log*',
    'lerna-debug.log*',
    '.DS_Store',
    '.vscode',
    '.idea',
    '*.swp',
    '*.swo',
    '*~',
    '.eslintcache',
    '.stylelintcache',
    '.rpt2_cache',
    '.rts2_cache_cjs',
    '.rts2_cache_es',
    '.rts2_cache_umd'
  ]
};

// Health check results
let results = {
  passed: 0,
  failed: 0,
  warnings: 0,
  errors: []
};

/**
 * Print colored output
 */
function print(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Check if a file exists
 */
function fileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch (error) {
    return false;
  }
}

/**
 * Check if a directory exists
 */
function dirExists(dirPath) {
  try {
    return fs.statSync(dirPath).isDirectory();
  } catch (error) {
    return false;
  }
}

/**
 * Get file size
 */
function getFileSize(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return stats.size;
  } catch (error) {
    return 0;
  }
}

/**
 * Check file content for specific patterns
 */
function checkFileContent(filePath, patterns) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const results = {};
    
    for (const pattern of patterns) {
      results[pattern.name] = pattern.regex.test(content);
    }
    
    return results;
  } catch (error) {
    return {};
  }
}

/**
 * Check Back4App configuration
 */
function checkBack4AppConfig() {
  print('cyan', '\n🔧 Checking Back4App Configuration...');
  
  const configFile = 'back4app.json';
  if (!fileExists(configFile)) {
    results.failed++;
    results.errors.push(`❌ ${configFile} not found`);
    return false;
  }
  
  try {
    const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
    
    // Check required fields
    const requiredFields = ['appName', 'parseVersion', 'cloudCode', 'webHosting'];
    let configValid = true;
    
    for (const field of requiredFields) {
      if (!config[field]) {
        results.failed++;
        results.errors.push(`❌ Missing required field: ${field}`);
        configValid = false;
      }
    }
    
    if (configValid) {
      results.passed++;
      print('green', `✅ ${configFile} is valid`);
      print('blue', `   App Name: ${config.appName}`);
      print('blue', `   Parse Version: ${config.parseVersion}`);
      print('blue', `   Cloud Code: ${config.cloudCode.main}`);
      print('blue', `   Web Hosting: ${config.webHosting.public}`);
    }
    
    return configValid;
  } catch (error) {
    results.failed++;
    results.errors.push(`❌ Invalid JSON in ${configFile}: ${error.message}`);
    return false;
  }
}

/**
 * Check cloud functions
 */
function checkCloudFunctions() {
  print('cyan', '\n☁️ Checking Cloud Functions...');
  
  const cloudFile = 'cloud/main.js';
  if (!fileExists(cloudFile)) {
    results.failed++;
    results.errors.push(`❌ ${cloudFile} not found`);
    return false;
  }
  
  const patterns = [
    { name: 'Parse.Cloud.define', regex: /Parse\.Cloud\.define/g },
    { name: 'tradingBot', regex: /tradingBot/g },
    { name: 'marketAnalysis', regex: /marketAnalysis/g },
    { name: 'userAuthentication', regex: /userAuthentication/g },
    { name: 'portfolioManagement', regex: /portfolioManagement/g },
    { name: 'riskAssessment', regex: /riskAssessment/g }
  ];
  
  const contentCheck = checkFileContent(cloudFile, patterns);
  
  let cloudValid = true;
  for (const [name, exists] of Object.entries(contentCheck)) {
    if (!exists) {
      results.failed++;
      results.errors.push(`❌ Missing ${name} in ${cloudFile}`);
      cloudValid = false;
    }
  }
  
  if (cloudValid) {
    results.passed++;
    print('green', `✅ ${cloudFile} is valid`);
    print('blue', `   Cloud functions: ${Object.keys(contentCheck).length}`);
  }
  
  return cloudValid;
}

/**
 * Check frontend build
 */
function checkFrontendBuild() {
  print('cyan', '\n🎨 Checking Frontend Build...');
  
  const distDir = 'frontend/dist';
  if (!dirExists(distDir)) {
    results.failed++;
    results.errors.push(`❌ ${distDir} directory not found`);
    return false;
  }
  
  const requiredFiles = [
    'index.html',
    'manifest.json',
    'sw.js',
    '404.html',
    'offline.html',
    'robots.txt',
    'sitemap.xml'
  ];
  
  let buildValid = true;
  for (const file of requiredFiles) {
    const filePath = path.join(distDir, file);
    if (!fileExists(filePath)) {
      results.failed++;
      results.errors.push(`❌ Missing ${file} in ${distDir}`);
      buildValid = false;
    }
  }
  
  if (buildValid) {
    results.passed++;
    print('green', `✅ Frontend build is valid`);
    print('blue', `   Build files: ${requiredFiles.length}`);
  }
  
  return buildValid;
}

/**
 * Check package.json
 */
function checkPackageJson() {
  print('cyan', '\n📦 Checking Package Configuration...');
  
  const packageFile = 'frontend/package.json';
  if (!fileExists(packageFile)) {
    results.failed++;
    results.errors.push(`❌ ${packageFile} not found`);
    return false;
  }
  
  try {
    const pkg = JSON.parse(fs.readFileSync(packageFile, 'utf8'));
    
    // Check required dependencies
    const requiredDeps = [
      'react',
      'react-dom',
      'react-router-dom',
      'parse',
      'tailwindcss',
      'vite'
    ];
    
    let depsValid = true;
    for (const dep of requiredDeps) {
      if (!pkg.dependencies[dep] && !pkg.devDependencies[dep]) {
        results.failed++;
        results.errors.push(`❌ Missing dependency: ${dep}`);
        depsValid = false;
      }
    }
    
    if (depsValid) {
      results.passed++;
      print('green', `✅ ${packageFile} is valid`);
      print('blue', `   Dependencies: ${Object.keys(pkg.dependencies || {}).length}`);
      print('blue', `   Dev Dependencies: ${Object.keys(pkg.devDependencies || {}).length}`);
    }
    
    return depsValid;
  } catch (error) {
    results.failed++;
    results.errors.push(`❌ Invalid JSON in ${packageFile}: ${error.message}`);
    return false;
  }
}

/**
 * Check environment files
 */
function checkEnvironmentFiles() {
  print('cyan', '\n🔐 Checking Environment Configuration...');
  
  const envFiles = [
    'frontend/env.example',
    'backend/env.example'
  ];
  
  let envValid = true;
  for (const envFile of envFiles) {
    if (!fileExists(envFile)) {
      results.failed++;
      results.errors.push(`❌ ${envFile} not found`);
      envValid = false;
    } else {
      results.passed++;
      print('green', `✅ ${envFile} exists`);
    }
  }
  
  return envValid;
}

/**
 * Check for unnecessary files
 */
function checkUnnecessaryFiles() {
  print('cyan', '\n🧹 Checking for Unnecessary Files...');
  
  const unnecessaryFiles = [
    'frontend/package-simple.json',
    'frontend/src/App-simple.tsx',
    'frontend/public'
  ];
  
  let cleanupNeeded = false;
  for (const file of unnecessaryFiles) {
    if (fileExists(file) || dirExists(file)) {
      results.warnings++;
      print('yellow', `⚠️  Unnecessary file/directory: ${file}`);
      cleanupNeeded = true;
    }
  }
  
  if (!cleanupNeeded) {
    results.passed++;
    print('green', '✅ No unnecessary files found');
  }
  
  return !cleanupNeeded;
}

/**
 * Check required directories
 */
function checkRequiredDirectories() {
  print('cyan', '\n📁 Checking Required Directories...');
  
  let directoriesValid = true;
  for (const dir of config.requiredDirectories) {
    if (!dirExists(dir)) {
      results.failed++;
      results.errors.push(`❌ Missing required directory: ${dir}`);
      directoriesValid = false;
    } else {
      results.passed++;
      print('green', `✅ ${dir} exists`);
    }
  }
  
  return directoriesValid;
}

/**
 * Check file structure
 */
function checkFileStructure() {
  print('cyan', '\n📁 Checking File Structure...');
  
  let structureValid = true;
  for (const file of config.requiredFiles) {
    if (!fileExists(file)) {
      results.failed++;
      results.errors.push(`❌ Missing required file: ${file}`);
      structureValid = false;
    }
  }
  
  if (structureValid) {
    results.passed++;
    print('green', `✅ File structure is valid`);
    print('blue', `   Required files: ${config.requiredFiles.length}`);
  }
  
  return structureValid;
}

/**
 * Generate deployment summary
 */
function generateDeploymentSummary() {
  print('cyan', '\n📋 Back4App Deployment Summary...');
  
  print('blue', 'Required for Back4App Deployment:');
  print('blue', '✅ back4app.json - Parse app configuration');
  print('blue', '✅ cloud/main.js - Cloud functions');
  print('blue', '✅ frontend/dist/ - Built frontend files');
  print('blue', '✅ frontend/package.json - Dependencies');
  print('blue', '✅ frontend/vite.config.ts - Build configuration');
  print('blue', '✅ frontend/tailwind.config.js - Styling configuration');
  print('blue', '✅ frontend/tsconfig.json - TypeScript configuration');
  print('blue', '✅ BACK4APP_DEPLOYMENT_GUIDE.md - Deployment instructions');
  
  print('blue', '\nDeployment Steps:');
  print('blue', '1. Upload cloud/main.js to Back4App Cloud Code');
  print('blue', '2. Upload frontend/dist/ contents to Back4App Web Hosting');
  print('blue', '3. Configure environment variables in Back4App');
  print('blue', '4. Set up Parse classes in Back4App Dashboard');
  print('blue', '5. Configure security rules and CORS');
}

/**
 * Main doctor function
 */
function runDoctor() {
  print('bright', `\n🏥 CryptoPulse Trading Bot - Doctor Check v${config.version}`);
  print('bright', '=' .repeat(60));
  
  // Run all checks
  checkBack4AppConfig();
  checkCloudFunctions();
  checkFrontendBuild();
  checkPackageJson();
  checkEnvironmentFiles();
  checkUnnecessaryFiles();
  checkRequiredDirectories();
  checkFileStructure();
  
  // Generate summary
  generateDeploymentSummary();
  
  // Print results
  print('bright', '\n📊 Health Check Results:');
  print('bright', '=' .repeat(40));
  print('green', `✅ Passed: ${results.passed}`);
  print('yellow', `⚠️  Warnings: ${results.warnings}`);
  print('red', `❌ Failed: ${results.failed}`);
  
  if (results.errors.length > 0) {
    print('red', '\n❌ Errors Found:');
    results.errors.forEach(error => print('red', `   ${error}`));
  }
  
  // Overall status
  if (results.failed === 0) {
    print('green', '\n🎉 All checks passed! Your app is ready for Back4App deployment.');
  } else {
    print('red', '\n⚠️  Some checks failed. Please fix the errors before deploying.');
  }
  
  print('bright', '\n' + '=' .repeat(60));
  print('blue', 'For deployment instructions, see: BACK4APP_DEPLOYMENT_GUIDE.md');
  print('blue', 'For support, visit: https://github.com/your-repo/cryptopulse-trading-bot');
  print('bright', '=' .repeat(60));
}

// Run the doctor
if (require.main === module) {
  runDoctor();
}

module.exports = {
  runDoctor,
  checkBack4AppConfig,
  checkCloudFunctions,
  checkFrontendBuild,
  checkPackageJson,
  checkEnvironmentFiles,
  checkUnnecessaryFiles,
  checkFileStructure,
  generateDeploymentSummary
};
