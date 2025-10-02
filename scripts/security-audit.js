// =============================================================================
// CryptoPulse Security Audit Script
// =============================================================================
// Comprehensive security audit for CryptoPulse trading platform
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
// Security audit configuration
const AUDIT_CONFIG = {
  // File patterns to scan
  filePatterns: [
    '**/*.js',
    '**/*.ts',
    '**/*.tsx',
    '**/*.json',
    '**/*.env*',
    '**/*.config.*',
    '**/package.json',
    '**/package-lock.json',
    '**/yarn.lock'
  ],
  // Directories to exclude
  excludePatterns: [
    'node_modules/**',
    'dist/**',
    'build/**',
    'coverage/**',
    '.git/**',
    'test-results/**',
    'e2e/test-results/**'
  ],
  // Security patterns to check
  securityPatterns: {
    // Hardcoded secrets
    hardcodedSecrets: [
      /password\s*=\s*['"][^'"]+['"]/gi,
      /secret\s*=\s*['"][^'"]+['"]/gi,
      /key\s*=\s*['"][^'"]+['"]/gi,
      /token\s*=\s*['"][^'"]+['"]/gi,
      /api[_-]?key\s*=\s*['"][^'"]+['"]/gi,
      /private[_-]?key\s*=\s*['"][^'"]+['"]/gi,
      /jwt[_-]?secret\s*=\s*['"][^'"]+['"]/gi,
      /encryption[_-]?key\s*=\s*['"][^'"]+['"]/gi
    ],
    // SQL injection patterns
    sqlInjection: [
      /query\s*\(\s*['"][^'"]*\+/gi,
      /query\s*\(\s*`[^`]*\$\{/gi,
      /\.query\s*\(\s*['"][^'"]*\+/gi,
      /\.query\s*\(\s*`[^`]*\$\{/gi
    ],
    // XSS patterns
    xssPatterns: [
      /innerHTML\s*=/gi,
      /outerHTML\s*=/gi,
      /document\.write\s*\(/gi,
      /eval\s*\(/gi,
      /Function\s*\(/gi,
      /setTimeout\s*\(\s*['"][^'"]*['"]/gi,
      /setInterval\s*\(\s*['"][^'"]*['"]/gi
    ],
    // Unsafe redirects
    unsafeRedirects: [
      /window\.location\s*=\s*[^;]+/gi,
      /location\.href\s*=\s*[^;]+/gi,
      /document\.location\s*=\s*[^;]+/gi
    ],
    // Debug statements
    debugStatements: [
      /console\.log\s*\(/gi,
      /console\.debug\s*\(/gi,
      /console\.warn\s*\(/gi,
      /console\.error\s*\(/gi,
      /debugger\s*;/gi,
      /alert\s*\(/gi
    ],
    // Weak crypto
    weakCrypto: [
      /crypto\.createHash\s*\(\s*['"]md5['"]/gi,
      /crypto\.createHash\s*\(\s*['"]sha1['"]/gi,
      /crypto\.createCipher\s*\(/gi,
      /crypto\.createDecipher\s*\(/gi
    ],
    // Insecure random
    insecureRandom: [
      /Math\.random\s*\(/gi,
      /new Date\(\)\.getTime\s*\(/gi
    ]
  },
  // Dependency vulnerabilities
  dependencyChecks: {
    highRiskPackages: [
      'request',
      'axios@<1.6.0',
      'lodash@<4.17.21',
      'moment@<2.29.0',
      'express@<4.19.0'
    ],
    knownVulnerabilities: [
      'CVE-2021-23337',
      'CVE-2021-23336',
      'CVE-2020-8203',
      'CVE-2020-28469'
    ]
  }
};
// Audit results
const auditResults = {
  critical: [],
  high: [],
  medium: [],
  low: [],
  info: [],
  summary: {
    totalIssues: 0,
    criticalCount: 0,
    highCount: 0,
    mediumCount: 0,
    lowCount: 0,
    infoCount: 0
  }
};
// Utility functions
function log(level, message, file = '', line = 0) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${file}:${line} - ${message}`;
  auditResults[level].push({
    file,
    line,
    message,
    timestamp
  });
  auditResults.summary.totalIssues++;
  auditResults.summary[`${level}Count`]++;
}
function scanFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    lines.forEach((line, index) => {
      const lineNumber = index + 1;
      // Check for hardcoded secrets
      AUDIT_CONFIG.securityPatterns.hardcodedSecrets.forEach(pattern => {
        if (pattern.test(line)) {
          log('critical', 'Potential hardcoded secret detected', filePath, lineNumber);
        }
      });
      // Check for SQL injection
      AUDIT_CONFIG.securityPatterns.sqlInjection.forEach(pattern => {
        if (pattern.test(line)) {
          log('high', 'Potential SQL injection vulnerability', filePath, lineNumber);
        }
      });
      // Check for XSS patterns
      AUDIT_CONFIG.securityPatterns.xssPatterns.forEach(pattern => {
        if (pattern.test(line)) {
          log('high', 'Potential XSS vulnerability', filePath, lineNumber);
        }
      });
      // Check for unsafe redirects
      AUDIT_CONFIG.securityPatterns.unsafeRedirects.forEach(pattern => {
        if (pattern.test(line)) {
          log('medium', 'Potential unsafe redirect', filePath, lineNumber);
        }
      });
      // Check for debug statements
      AUDIT_CONFIG.securityPatterns.debugStatements.forEach(pattern => {
        if (pattern.test(line)) {
          log('low', 'Debug statement found (remove in production)', filePath, lineNumber);
        }
      });
      // Check for weak crypto
      AUDIT_CONFIG.securityPatterns.weakCrypto.forEach(pattern => {
        if (pattern.test(line)) {
          log('high', 'Weak cryptographic algorithm detected', filePath, lineNumber);
        }
      });
      // Check for insecure random
      AUDIT_CONFIG.securityPatterns.insecureRandom.forEach(pattern => {
        if (pattern.test(line)) {
          log('medium', 'Insecure random number generation', filePath, lineNumber);
        }
      });
    });
  } catch (error) {
    log('info', `Could not read file: ${error.message}`, filePath);
  }
}
function scanDirectory(dirPath) {
  try {
    const items = fs.readdirSync(dirPath);
    items.forEach(item => {
      const fullPath = path.join(dirPath, item);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        // Skip excluded directories
        const shouldExclude = AUDIT_CONFIG.excludePatterns.some(pattern => {
          const regex = new RegExp(pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*'));
          return regex.test(fullPath);
        });
        if (!shouldExclude) {
          scanDirectory(fullPath);
        }
      } else if (stat.isFile()) {
        // Check if file matches patterns
        const shouldScan = AUDIT_CONFIG.filePatterns.some(pattern => {
          const regex = new RegExp(pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*'));
          return regex.test(fullPath);
        });
        if (shouldScan) {
          scanFile(fullPath);
        }
      }
    });
  } catch (error) {
    log('info', `Could not scan directory: ${error.message}`, dirPath);
  }
}
// Simple version comparison function
function compareVersions(version1, version2) {
  const v1parts = version1.split('.').map(Number);
  const v2parts = version2.split('.').map(Number);
  
  for (let i = 0; i < Math.max(v1parts.length, v2parts.length); i++) {
    const v1part = v1parts[i] || 0;
    const v2part = v2parts[i] || 0;
    
    if (v1part < v2part) return -1;
    if (v1part > v2part) return 1;
  }
  return 0;
}

function checkDependencies() {
  const packageFiles = ['package.json', 'frontend/package.json', 'backend/package.json'];
  packageFiles.forEach(packageFile => {
    if (fs.existsSync(packageFile)) {
      try {
        const packageData = JSON.parse(fs.readFileSync(packageFile, 'utf8'));
        const dependencies = { ...packageData.dependencies, ...packageData.devDependencies };
        // Check for high-risk packages with version constraints
        Object.keys(dependencies).forEach(packageName => {
          const version = dependencies[packageName];
          AUDIT_CONFIG.dependencyChecks.highRiskPackages.forEach(riskPackage => {
            const [pkgName, versionConstraint] = riskPackage.split('@');
            if (packageName === pkgName) {
              // Only flag if version constraint is specified and current version is vulnerable
              if (versionConstraint && versionConstraint.startsWith('<')) {
                const minVersion = versionConstraint.substring(1);
                const currentVersion = version.replace(/[\^~]/, '');
                // Simple version comparison - in production, use semver library
                if (compareVersions(currentVersion, minVersion) < 0) {
                  log('high', `High-risk package detected: ${packageName}@${version} (requires >= ${minVersion})`, packageFile);
                }
              } else if (!versionConstraint) {
                // Package is inherently risky regardless of version
                log('high', `High-risk package detected: ${packageName}@${version}`, packageFile);
              }
            }
          });
        });
        // Check for missing security fields
        if (!packageData.engines) {
          log('medium', 'Missing engines field in package.json', packageFile);
        }
        if (!packageData.scripts || (!packageData.scripts.audit && !packageData.scripts['audit:security'] && !packageData.scripts['security:scan'])) {
          log('low', 'Missing audit script in package.json', packageFile);
        }
      } catch (error) {
        log('info', `Could not parse package.json: ${error.message}`, packageFile);
      }
    }
  });
}
function checkEnvironmentFiles() {
  const envFiles = [
    '.env',
    '.env.local',
    '.env.production',
    'backend/.env.backend',
    'frontend/.env.local'
  ];
  envFiles.forEach(envFile => {
    if (fs.existsSync(envFile)) {
      log('info', `Environment file found: ${envFile}`);
      // Check if environment file is in .gitignore
      const gitignorePath = '.gitignore';
      if (fs.existsSync(gitignorePath)) {
        const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
        if (!gitignoreContent.includes(envFile)) {
          log('high', `Environment file not in .gitignore: ${envFile}`);
        }
      }
    }
  });
}
function checkSecurityHeaders() {
  const securityFiles = [
    'frontend/public/index.html',
    'backend/index.js',
    'nginx.conf'
  ];
  securityFiles.forEach(file => {
    if (fs.existsSync(file)) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        // Check for security headers or security middleware
        const hasHelmet = content.includes('helmet') || content.includes('helmetConfig');
        const hasSecurityMiddleware = content.includes('securityHeaders') || content.includes('security.js');
        
        if (!hasHelmet && !hasSecurityMiddleware) {
          const securityHeaders = [
            'Content-Security-Policy',
            'X-Frame-Options',
            'X-Content-Type-Options',
            'X-XSS-Protection',
            'Strict-Transport-Security'
          ];
          securityHeaders.forEach(header => {
            if (!content.includes(header)) {
              log('medium', `Missing security header: ${header}`, file);
            }
          });
        } else {
          // Security middleware detected - headers are handled dynamically
          log('info', `Security middleware detected (${hasHelmet ? 'Helmet.js' : 'Custom security middleware'})`, file);
        }
      } catch (error) {
        log('info', `Could not check security headers: ${error.message}`, file);
      }
    }
  });
}
function generateReport() {
  const report = {
    timestamp: new Date().toISOString(),
    summary: auditResults.summary,
    issues: auditResults,
    recommendations: generateRecommendations()
  };
  // Save report to file
  const reportPath = 'security-audit-report.json';
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log('\n' + '='.repeat(80));
  console.log('='.repeat(80));
  console.log('='.repeat(80));
  if (auditResults.critical.length > 0) {
    auditResults.critical.forEach(issue => {
    });
  }
  if (auditResults.high.length > 0) {
    auditResults.high.forEach(issue => {
    });
  }
  // Exit with error code if critical issues found
  if (auditResults.summary.criticalCount > 0) {
    process.exit(1);
  }
}
function generateRecommendations() {
  const recommendations = [];
  if (auditResults.summary.criticalCount > 0) {
    recommendations.push('Fix all critical security issues immediately');
  }
  if (auditResults.summary.highCount > 0) {
    recommendations.push('Address high-priority security issues as soon as possible');
  }
  recommendations.push('Implement automated security scanning in CI/CD pipeline');
  recommendations.push('Regular dependency updates and vulnerability scanning');
  recommendations.push('Code review process for security-sensitive changes');
  recommendations.push('Security training for development team');
  return recommendations;
}
// Main audit function
function runSecurityAudit() {
  // Scan source code
  scanDirectory('.');
  // Check dependencies
  checkDependencies();
  // Check environment files
  checkEnvironmentFiles();
  // Check security headers
  checkSecurityHeaders();
  // Generate report
  generateReport();
}
// Run the audit
if (require.main === module) {
  runSecurityAudit();
}
module.exports = {
  runSecurityAudit,
  auditResults
};
