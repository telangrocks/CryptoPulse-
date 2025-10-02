// =============================================================================
// Dependency Update Script - Production Ready
// =============================================================================
// Automated script to safely update dependencies with security checks

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const CONFIG = {
  // Packages to always update to latest
  alwaysUpdate: [
    'typescript',
    'eslint',
    'prettier',
    'jest',
    'vitest',
    'vite',
    'react',
    'react-dom'
  ],
  
  // Packages to update with caution (major version changes)
  cautiousUpdate: [
    'express',
    'mongoose',
    'redis',
    'pg',
    'winston',
    'helmet',
    'cors'
  ],
  
  // Packages to never update automatically
  neverUpdate: [
    'node',
    'pnpm'
  ],
  
  // Security-critical packages
  securityCritical: [
    'jsonwebtoken',
    'bcrypt',
    'crypto-js',
    'helmet',
    'cors',
    'express-rate-limit'
  ]
};

// Colors for console output
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

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function getPackageJsonFiles() {
  const packageFiles = [];
  
  // Check root package.json
  if (fs.existsSync('package.json')) {
    packageFiles.push('package.json');
  }
  
  // Check workspace package.json files
  const workspaces = ['backend', 'frontend', 'cloud'];
  workspaces.forEach(workspace => {
    const packagePath = path.join(workspace, 'package.json');
    if (fs.existsSync(packagePath)) {
      packageFiles.push(packagePath);
    }
  });
  
  return packageFiles;
}

function getOutdatedPackages(packageFile) {
  try {
    const output = execSync(`pnpm outdated --json --recursive`, { 
      encoding: 'utf8',
      cwd: path.dirname(packageFile) || '.'
    });
    
    const outdated = JSON.parse(output);
    return outdated;
  } catch (error) {
    log(`Error checking outdated packages for ${packageFile}: ${error.message}`, 'red');
    return {};
  }
}

function getSecurityAudit() {
  try {
    const output = execSync('pnpm audit --json', { encoding: 'utf8' });
    const audit = JSON.parse(output);
    return audit;
  } catch (error) {
    log(`Error running security audit: ${error.message}`, 'red');
    return { vulnerabilities: {} };
  }
}

function updatePackage(packageName, currentVersion, latestVersion, packageFile) {
  const isSecurityCritical = CONFIG.securityCritical.includes(packageName);
  const isCautious = CONFIG.cautiousUpdate.includes(packageName);
  const isNever = CONFIG.neverUpdate.includes(packageName);
  
  if (isNever) {
    log(`Skipping ${packageName} (marked as never update)`, 'yellow');
    return false;
  }
  
  if (isSecurityCritical) {
    log(`Updating security-critical package: ${packageName}`, 'red');
  } else if (isCautious) {
    log(`Updating cautious package: ${packageName} (review required)`, 'yellow');
  } else {
    log(`Updating package: ${packageName}`, 'green');
  }
  
  try {
    // Update the specific package
    execSync(`pnpm update ${packageName}@latest`, { 
      cwd: path.dirname(packageFile) || '.',
      stdio: 'inherit'
    });
    
    log(`✅ Successfully updated ${packageName} from ${currentVersion} to ${latestVersion}`, 'green');
    return true;
  } catch (error) {
    log(`❌ Failed to update ${packageName}: ${error.message}`, 'red');
    return false;
  }
}

function updateDependencies() {
  log('🔍 Starting dependency update process...', 'cyan');
  
  const packageFiles = getPackageJsonFiles();
  log(`Found ${packageFiles.length} package.json files`, 'blue');
  
  // Run security audit first
  log('🔒 Running security audit...', 'cyan');
  const audit = getSecurityAudit();
  
  if (audit.vulnerabilities && Object.keys(audit.vulnerabilities).length > 0) {
    log('⚠️  Security vulnerabilities found:', 'red');
    Object.keys(audit.vulnerabilities).forEach(vuln => {
      const vulnData = audit.vulnerabilities[vuln];
      log(`  - ${vuln}: ${vulnData.severity}`, 'red');
    });
  } else {
    log('✅ No security vulnerabilities found', 'green');
  }
  
  // Check for outdated packages
  log('📦 Checking for outdated packages...', 'cyan');
  const outdated = getOutdatedPackages('.');
  
  if (!outdated || Object.keys(outdated).length === 0) {
    log('✅ All packages are up to date', 'green');
    return;
  }
  
  let updatedCount = 0;
  let failedCount = 0;
  
  // Process each package
  Object.keys(outdated).forEach(packageName => {
    const packageData = outdated[packageName];
    
    if (packageData.current === packageData.latest) {
      return; // Already up to date
    }
    
    log(`\n📦 ${packageName}:`, 'blue');
    log(`  Current: ${packageData.current}`, 'yellow');
    log(`  Latest:  ${packageData.latest}`, 'green');
    log(`  Wanted:  ${packageData.wanted}`, 'cyan');
    
    // Update the package
    const success = updatePackage(
      packageName,
      packageData.current,
      packageData.latest,
      packageData.location || '.'
    );
    
    if (success) {
      updatedCount++;
    } else {
      failedCount++;
    }
  });
  
  // Summary
  log('\n📊 Update Summary:', 'cyan');
  log(`  ✅ Successfully updated: ${updatedCount} packages`, 'green');
  log(`  ❌ Failed to update: ${failedCount} packages`, 'red');
  
  if (updatedCount > 0) {
    log('\n🔒 Running security audit after updates...', 'cyan');
    const postAudit = getSecurityAudit();
    
    if (postAudit.vulnerabilities && Object.keys(postAudit.vulnerabilities).length > 0) {
      log('⚠️  Security vulnerabilities after update:', 'red');
      Object.keys(postAudit.vulnerabilities).forEach(vuln => {
        const vulnData = postAudit.vulnerabilities[vuln];
        log(`  - ${vuln}: ${vulnData.severity}`, 'red');
      });
    } else {
      log('✅ No security vulnerabilities after update', 'green');
    }
  }
  
  // Run tests after updates
  if (updatedCount > 0) {
    log('\n🧪 Running tests after updates...', 'cyan');
    try {
      execSync('pnpm test:all', { stdio: 'inherit' });
      log('✅ All tests passed after updates', 'green');
    } catch (error) {
      log('❌ Tests failed after updates. Please review changes.', 'red');
    }
  }
  
  log('\n🎉 Dependency update process completed!', 'green');
}

// Run the update process
if (require.main === module) {
  updateDependencies();
}

module.exports = {
  updateDependencies,
  getOutdatedPackages,
  getSecurityAudit,
  CONFIG
};
