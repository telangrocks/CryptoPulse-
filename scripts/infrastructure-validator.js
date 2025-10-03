#!/usr/bin/env node

// =============================================================================
// CryptoPulse Infrastructure Validator - Production Ready
// =============================================================================
// Comprehensive infrastructure validation and health checks for production deployment

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Colors for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  reset: '\x1b[0m',
  bright: '\x1b[1m'
};

// Validation results
const results = {
  passed: 0,
  failed: 0,
  warnings: 0,
  checks: []
};

// Utility functions
function log(message, color = 'white') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
  results.passed++;
}

function logError(message) {
  log(`❌ ${message}`, 'red');
  results.failed++;
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
  results.warnings++;
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

function logHeader(message) {
  log(`\n${colors.bright}${colors.cyan}${'='.repeat(60)}${colors.reset}`);
  log(`${colors.bright}${colors.cyan}${message}${colors.reset}`);
  log(`${colors.bright}${colors.cyan}${'='.repeat(60)}${colors.reset}\n`);
}

// Validation checks
function checkFileExists(filePath, description) {
  try {
    if (fs.existsSync(filePath)) {
      logSuccess(`${description}: ${filePath}`);
      return true;
    } else {
      logError(`${description}: ${filePath} not found`);
      return false;
    }
  } catch (error) {
    logError(`${description}: Error checking ${filePath} - ${error.message}`);
    return false;
  }
}

function checkDirectoryExists(dirPath, description) {
  try {
    if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
      logSuccess(`${description}: ${dirPath}`);
      return true;
    } else {
      logError(`${description}: ${dirPath} not found or not a directory`);
      return false;
    }
  } catch (error) {
    logError(`${description}: Error checking ${dirPath} - ${error.message}`);
    return false;
  }
}

function validateDockerCompose() {
  logHeader('Docker Compose Validation');
  
  const dockerComposeFile = 'docker-compose.production.yml';
  if (!checkFileExists(dockerComposeFile, 'Docker Compose file')) {
    return false;
  }

  try {
    const content = fs.readFileSync(dockerComposeFile, 'utf8');
    const lines = content.split('\n');
    
    // Check for required services
    const requiredServices = ['postgres', 'redis', 'mongodb', 'backend', 'frontend', 'cloud', 'nginx'];
    const foundServices = [];
    
    lines.forEach(line => {
      if (line.trim().startsWith('services:')) {
        // Found services section
      } else if (line.includes(':') && !line.includes('http') && !line.includes('https') && 
                 !line.includes('=') && !line.includes('version') && !line.includes('networks') &&
                 !line.includes('volumes')) {
        const serviceName = line.trim().replace(':', '').trim();
        if (serviceName && !['postgres', 'redis', 'mongodb', 'backend', 'frontend', 'cloud', 'nginx', 'prometheus', 'grafana'].includes(serviceName)) {
          foundServices.push(serviceName);
        }
      }
    });

    // Check for critical configuration
    const criticalConfigs = [
      'restart: unless-stopped',
      'networks:',
      'healthcheck:',
      'security_opt:',
      'read_only: true'
    ];

    let configScore = 0;
    criticalConfigs.forEach(config => {
      if (content.includes(config)) {
        configScore++;
        logSuccess(`Found production config: ${config}`);
      } else {
        logWarning(`Missing production config: ${config}`);
      }
    });

    if (configScore >= criticalConfigs.length * 0.8) {
      logSuccess('Docker Compose production readiness: Good');
      return true;
    } else {
      logError('Docker Compose production readiness: Poor');
      return false;
    }
  } catch (error) {
    logError(`Error validating Docker Compose: ${error.message}`);
    return false;
  }
}

function validateEnvironmentFiles() {
  logHeader('Environment Configuration Validation');
  
  const envFiles = [
    'env-templates/backend.env',
    'env-templates/frontend.env',
    'env-templates/backend.env.production',
    'env-templates/frontend.env.production'
  ];

  let validCount = 0;
  envFiles.forEach(file => {
    if (checkFileExists(file, `Environment template: ${file}`)) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        
        // Check for placeholder values
        const placeholderPatterns = ['CHANGE_ME', 'your_', 'localhost', 'example.com'];
        let placeholderCount = 0;
        
        placeholderPatterns.forEach(pattern => {
          if (content.includes(pattern)) {
            placeholderCount++;
          }
        });

        if (placeholderCount > 0) {
          logWarning(`${file}: Contains ${placeholderCount} placeholder values`);
        } else {
          logSuccess(`${file}: No placeholder values found`);
        }

        // Check for security warnings
        if (content.includes('SECURITY WARNING') || content.includes('SECURITY NOTICE')) {
          logSuccess(`${file}: Contains security warnings`);
        } else {
          logWarning(`${file}: Missing security warnings`);
        }

        validCount++;
      } catch (error) {
        logError(`Error reading ${file}: ${error.message}`);
      }
    }
  });

  return validCount === envFiles.length;
}

function validateMonitoringSetup() {
  logHeader('Monitoring Infrastructure Validation');
  
  const monitoringFiles = [
    'monitoring/prometheus.yml',
    'monitoring/alerts.yml',
    'monitoring/grafana/dashboards/cryptopulse-overview.json',
    'monitoring/grafana/datasources/prometheus.yml'
  ];

  let validCount = 0;
  monitoringFiles.forEach(file => {
    if (checkFileExists(file, `Monitoring config: ${file}`)) {
      validCount++;
    }
  });

  // Validate Prometheus configuration
  try {
    const prometheusConfig = fs.readFileSync('monitoring/prometheus.yml', 'utf8');
    
    const requiredJobs = ['prometheus', 'cryptopulse-backend', 'cryptopulse-frontend', 'cryptopulse-cloud'];
    let jobCount = 0;
    
    requiredJobs.forEach(job => {
      if (prometheusConfig.includes(`job_name: '${job}'`)) {
        logSuccess(`Prometheus job found: ${job}`);
        jobCount++;
      } else {
        logWarning(`Prometheus job missing: ${job}`);
      }
    });

    if (jobCount >= requiredJobs.length * 0.8) {
      logSuccess('Prometheus configuration: Good');
      validCount++;
    } else {
      logError('Prometheus configuration: Incomplete');
    }
  } catch (error) {
    logError(`Error validating Prometheus config: ${error.message}`);
  }

  return validCount >= monitoringFiles.length * 0.8;
}

function validateCloudServices() {
  logHeader('Cloud Services Validation');
  
  const cloudFiles = [
    'cloud/main.js',
    'cloud/package.json',
    'cloud/monitoring.js',
    'cloud/exchange-service.js',
    'cloud/cashfree.js',
    'cloud/utils/index.js'
  ];

  let validCount = 0;
  cloudFiles.forEach(file => {
    if (checkFileExists(file, `Cloud service: ${file}`)) {
      validCount++;
    }
  });

  // Validate main.js for production readiness
  try {
    const mainJs = fs.readFileSync('cloud/main.js', 'utf8');
    
    const productionFeatures = [
      'helmet',
      'cors',
      'rateLimit',
      'trust proxy',
      'graceful shutdown',
      'error handling',
      'health check',
      'metrics'
    ];

    let featureCount = 0;
    productionFeatures.forEach(feature => {
      if (mainJs.includes(feature)) {
        logSuccess(`Production feature found: ${feature}`);
        featureCount++;
      } else {
        logWarning(`Production feature missing: ${feature}`);
      }
    });

    if (featureCount >= productionFeatures.length * 0.8) {
      logSuccess('Cloud main.js production readiness: Good');
      validCount++;
    } else {
      logError('Cloud main.js production readiness: Poor');
    }
  } catch (error) {
    logError(`Error validating cloud main.js: ${error.message}`);
  }

  return validCount >= cloudFiles.length * 0.8;
}

function validateNginxConfiguration() {
  logHeader('Nginx Configuration Validation');
  
  if (!checkFileExists('nginx.conf', 'Nginx configuration')) {
    return false;
  }

  try {
    const nginxConfig = fs.readFileSync('nginx.conf', 'utf8');
    
    const requiredConfigs = [
      'ssl_certificate',
      'ssl_protocols',
      'ssl_ciphers',
      'add_header Strict-Transport-Security',
      'add_header X-Frame-Options',
      'add_header X-Content-Type-Options',
      'limit_req_zone',
      'upstream backend',
      'upstream frontend'
    ];

    let configCount = 0;
    requiredConfigs.forEach(config => {
      if (nginxConfig.includes(config)) {
        logSuccess(`Nginx config found: ${config}`);
        configCount++;
      } else {
        logWarning(`Nginx config missing: ${config}`);
      }
    });

    if (configCount >= requiredConfigs.length * 0.8) {
      logSuccess('Nginx production readiness: Good');
      return true;
    } else {
      logError('Nginx production readiness: Poor');
      return false;
    }
  } catch (error) {
    logError(`Error validating Nginx config: ${error.message}`);
    return false;
  }
}

function validateDeploymentScripts() {
  logHeader('Deployment Scripts Validation');
  
  const deploymentFiles = [
    'scripts/deploy-northflank.sh',
    'scripts/infrastructure-validator.js'
  ];

  let validCount = 0;
  deploymentFiles.forEach(file => {
    if (checkFileExists(file, `Deployment script: ${file}`)) {
      validCount++;
    }
  });

  // Validate deploy script for production readiness
  try {
    const deployScript = fs.readFileSync('scripts/deploy-northflank.sh', 'utf8');
    
    const requiredFeatures = [
      'check_prerequisites',
      'build_frontend',
      'build_backend',
      'deploy_frontend',
      'deploy_backend',
      'run_health_checks',
      'graceful shutdown',
      'error handling'
    ];

    let featureCount = 0;
    requiredFeatures.forEach(feature => {
      if (deployScript.includes(feature)) {
        logSuccess(`Deployment feature found: ${feature}`);
        featureCount++;
      } else {
        logWarning(`Deployment feature missing: ${feature}`);
      }
    });

    if (featureCount >= requiredFeatures.length * 0.8) {
      logSuccess('Deployment script production readiness: Good');
      validCount++;
    } else {
      logError('Deployment script production readiness: Poor');
    }
  } catch (error) {
    logError(`Error validating deployment script: ${error.message}`);
  }

  return validCount >= deploymentFiles.length * 0.8;
}

function validatePackageConfigurations() {
  logHeader('Package Configuration Validation');
  
  const packageFiles = [
    'package.json',
    'backend/package.json',
    'frontend/package.json',
    'cloud/package.json'
  ];

  let validCount = 0;
  packageFiles.forEach(file => {
    if (checkFileExists(file, `Package config: ${file}`)) {
      try {
        const packageJson = JSON.parse(fs.readFileSync(file, 'utf8'));
        
        // Check for required scripts
        const requiredScripts = ['start', 'build', 'test'];
        let scriptCount = 0;
        
        requiredScripts.forEach(script => {
          if (packageJson.scripts && packageJson.scripts[script]) {
            logSuccess(`${file}: Script '${script}' found`);
            scriptCount++;
          } else {
            logWarning(`${file}: Script '${script}' missing`);
          }
        });

        // Check for production dependencies
        if (packageJson.dependencies) {
          const prodDeps = Object.keys(packageJson.dependencies).length;
          if (prodDeps > 0) {
            logSuccess(`${file}: ${prodDeps} production dependencies`);
          } else {
            logWarning(`${file}: No production dependencies`);
          }
        }

        if (scriptCount >= requiredScripts.length * 0.8) {
          validCount++;
        }
      } catch (error) {
        logError(`Error parsing ${file}: ${error.message}`);
      }
    }
  });

  return validCount >= packageFiles.length * 0.8;
}

function validateSecurityConfiguration() {
  logHeader('Security Configuration Validation');
  
  let securityScore = 0;
  const maxScore = 10;

  // Check for security files
  const securityFiles = [
    'SECURITY_AUDIT.md',
    'security-audit-report.json'
  ];

  securityFiles.forEach(file => {
    if (checkFileExists(file, `Security file: ${file}`)) {
      securityScore++;
    }
  });

  // Check for security scripts
  const securityScripts = [
    'scripts/security-audit.js',
    'scripts/security-audit-enhanced.js'
  ];

  securityScripts.forEach(script => {
    if (checkFileExists(script, `Security script: ${script}`)) {
      securityScore++;
    }
  });

  // Check for security configurations in code
  try {
    const mainJs = fs.readFileSync('cloud/main.js', 'utf8');
    const backendIndex = fs.readFileSync('backend/index.js', 'utf8');
    const nginxConfig = fs.readFileSync('nginx.conf', 'utf8');

    const securityFeatures = [
      { file: 'cloud/main.js', features: ['helmet', 'cors', 'rateLimit'] },
      { file: 'backend/index.js', features: ['helmet', 'cors', 'rateLimit'] },
      { file: 'nginx.conf', features: ['ssl_certificate', 'add_header X-Frame-Options', 'add_header X-Content-Type-Options'] }
    ];

    securityFeatures.forEach(({ file, features }) => {
      let fileScore = 0;
      features.forEach(feature => {
        const content = file === 'cloud/main.js' ? mainJs : 
                       file === 'backend/index.js' ? backendIndex : nginxConfig;
        if (content.includes(feature)) {
          fileScore++;
        }
      });
      
      if (fileScore >= features.length * 0.8) {
        logSuccess(`Security in ${file}: Good`);
        securityScore++;
      } else {
        logWarning(`Security in ${file}: Needs improvement`);
      }
    });
  } catch (error) {
    logError(`Error validating security configuration: ${error.message}`);
  }

  const securityPercentage = (securityScore / maxScore) * 100;
  
  if (securityPercentage >= 80) {
    logSuccess(`Security configuration: ${securityPercentage.toFixed(1)}% (Excellent)`);
    return true;
  } else if (securityPercentage >= 60) {
    logWarning(`Security configuration: ${securityPercentage.toFixed(1)}% (Good)`);
    return true;
  } else {
    logError(`Security configuration: ${securityPercentage.toFixed(1)}% (Poor)`);
    return false;
  }
}

function validateDocumentation() {
  logHeader('Documentation Validation');
  
  const documentationFiles = [
    'README.md',
    'INFRASTRUCTURE.md',
    'PRODUCTION_READY_GUIDE.md',
    'DEPLOYMENT_GUIDE.md',
    'DEVELOPMENT_GUIDE.md',
    'CONFIGURATION_GUIDE.md',
    'SECURITY_AUDIT.md'
  ];

  let validCount = 0;
  documentationFiles.forEach(file => {
    if (checkFileExists(file, `Documentation: ${file}`)) {
      validCount++;
    }
  });

  // Check README.md for completeness
  try {
    const readme = fs.readFileSync('README.md', 'utf8');
    
    const requiredSections = [
      '# CryptoPulse',
      '## Features',
      '## Installation',
      '## Usage',
      '## Configuration',
      '## Deployment',
      '## Contributing',
      '## License'
    ];

    let sectionCount = 0;
    requiredSections.forEach(section => {
      if (readme.includes(section)) {
        logSuccess(`README section found: ${section}`);
        sectionCount++;
      } else {
        logWarning(`README section missing: ${section}`);
      }
    });

    if (sectionCount >= requiredSections.length * 0.8) {
      logSuccess('README.md completeness: Good');
      validCount++;
    } else {
      logError('README.md completeness: Poor');
    }
  } catch (error) {
    logError(`Error validating README.md: ${error.message}`);
  }

  return validCount >= documentationFiles.length * 0.8;
}

// Main validation function
function runValidation() {
  logHeader('CryptoPulse Infrastructure Validation');
  logInfo('Starting comprehensive infrastructure validation...\n');

  const validations = [
    { name: 'Docker Compose', fn: validateDockerCompose },
    { name: 'Environment Files', fn: validateEnvironmentFiles },
    { name: 'Monitoring Setup', fn: validateMonitoringSetup },
    { name: 'Cloud Services', fn: validateCloudServices },
    { name: 'Nginx Configuration', fn: validateNginxConfiguration },
    { name: 'Deployment Scripts', fn: validateDeploymentScripts },
    { name: 'Package Configurations', fn: validatePackageConfigurations },
    { name: 'Security Configuration', fn: validateSecurityConfiguration },
    { name: 'Documentation', fn: validateDocumentation }
  ];

  let passedValidations = 0;
  validations.forEach(({ name, fn }) => {
    try {
      if (fn()) {
        passedValidations++;
      }
    } catch (error) {
      logError(`${name} validation failed: ${error.message}`);
    }
  });

  // Final results
  logHeader('Validation Results Summary');
  
  const totalChecks = results.passed + results.failed + results.warnings;
  const successRate = totalChecks > 0 ? (results.passed / totalChecks) * 100 : 0;
  const validationRate = (passedValidations / validations.length) * 100;

  logInfo(`Total Checks: ${totalChecks}`);
  logSuccess(`Passed: ${results.passed}`);
  logError(`Failed: ${results.failed}`);
  logWarning(`Warnings: ${results.warnings}`);
  logInfo(`Success Rate: ${successRate.toFixed(1)}%`);
  logInfo(`Validation Rate: ${validationRate.toFixed(1)}%`);

  if (validationRate >= 90) {
    logSuccess('\n🎉 Infrastructure is PRODUCTION READY!');
    logInfo('All critical validations passed. Safe to deploy to production.');
  } else if (validationRate >= 75) {
    logWarning('\n⚠️  Infrastructure is MOSTLY READY for production');
    logInfo('Most validations passed, but some improvements needed.');
  } else {
    logError('\n❌ Infrastructure is NOT READY for production');
    logInfo('Multiple critical issues found. Please fix before deployment.');
  }

  // Recommendations
  if (results.failed > 0 || results.warnings > 0) {
    logHeader('Recommendations');
    
    if (results.failed > 0) {
      logError('Critical Issues to Fix:');
      logInfo('1. Address all failed validations');
      logInfo('2. Review security configurations');
      logInfo('3. Ensure all required files exist');
      logInfo('4. Validate environment configurations');
    }

    if (results.warnings > 0) {
      logWarning('Improvements to Consider:');
      logInfo('1. Add missing production configurations');
      logInfo('2. Enhance security headers and policies');
      logInfo('3. Complete documentation');
      logInfo('4. Add monitoring and alerting');
    }
  }

  // Exit with appropriate code
  if (validationRate >= 75) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

// Run validation if called directly
if (require.main === module) {
  runValidation();
}

module.exports = {
  runValidation,
  validateDockerCompose,
  validateEnvironmentFiles,
  validateMonitoringSetup,
  validateCloudServices,
  validateNginxConfiguration,
  validateDeploymentScripts,
  validatePackageConfigurations,
  validateSecurityConfiguration,
  validateDocumentation
};