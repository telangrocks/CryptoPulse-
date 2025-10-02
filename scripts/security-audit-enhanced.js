// =============================================================================
// Enhanced Security Audit Script - Production Ready
// =============================================================================
// Comprehensive security audit with detailed reporting and recommendations

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
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
    '**/yarn.lock',
    '**/pnpm-lock.yaml'
  ],
  
  // Directories to exclude
  excludePatterns: [
    'node_modules/**',
    'dist/**',
    'build/**',
    'coverage/**',
    '.git/**',
    'test-results/**',
    'e2e/test-results/**',
    'logs/**'
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
      /encryption[_-]?key\s*=\s*['"][^'"]+['"]/gi,
      /database[_-]?url\s*=\s*['"][^'"]+['"]/gi,
      /redis[_-]?url\s*=\s*['"][^'"]+['"]/gi,
      /mongodb[_-]?url\s*=\s*['"][^'"]+['"]/gi
    ],
    
    // SQL injection patterns
    sqlInjection: [
      /query\s*\(\s*['"][^'"]*\+/gi,
      /query\s*\(\s*`[^`]*\$\{/gi,
      /\.query\s*\(\s*['"][^'"]*\+/gi,
      /\.query\s*\(\s*`[^`]*\$\{/gi,
      /SELECT\s+.*\s+FROM\s+.*\s+WHERE\s+.*\+/gi,
      /INSERT\s+INTO\s+.*\s+VALUES\s*\([^)]*\+/gi,
      /UPDATE\s+.*\s+SET\s+.*\s+WHERE\s+.*\+/gi,
      /DELETE\s+FROM\s+.*\s+WHERE\s+.*\+/gi
    ],
    
    // XSS patterns
    xssPatterns: [
      /innerHTML\s*=/gi,
      /outerHTML\s*=/gi,
      /document\.write\s*\(/gi,
      /eval\s*\(/gi,
      /Function\s*\(/gi,
      /setTimeout\s*\(\s*['"][^'"]*['"]/gi,
      /setInterval\s*\(\s*['"][^'"]*['"]/gi,
      /dangerouslySetInnerHTML/gi,
      /<script[^>]*>.*<\/script>/gi
    ],
    
    // Unsafe redirects
    unsafeRedirects: [
      /window\.location\s*=\s*[^;]+/gi,
      /location\.href\s*=\s*[^;]+/gi,
      /document\.location\s*=\s*[^;]+/gi,
      /res\.redirect\s*\(\s*[^)]*\+/gi
    ],
    
    // Debug statements
    debugStatements: [
      /console\.log\s*\(/gi,
      /console\.debug\s*\(/gi,
      /console\.warn\s*\(/gi,
      /console\.error\s*\(/gi,
      /debugger\s*;/gi,
      /alert\s*\(/gi,
      /print\s*\(/gi
    ],
    
    // Weak crypto
    weakCrypto: [
      /crypto\.createHash\s*\(\s*['"]md5['"]/gi,
      /crypto\.createHash\s*\(\s*['"]sha1['"]/gi,
      /crypto\.createCipher\s*\(/gi,
      /crypto\.createDecipher\s*\(/gi,
      /Math\.random\s*\(/gi,
      /new Date\(\)\.getTime\s*\(/gi
    ],
    
    // Insecure random
    insecureRandom: [
      /Math\.random\s*\(/gi,
      /new Date\(\)\.getTime\s*\(/gi
    ],
    
    // File system vulnerabilities
    fileSystemVulns: [
      /fs\.readFile\s*\(/gi,
      /fs\.writeFile\s*\(/gi,
      /fs\.unlink\s*\(/gi,
      /fs\.rmdir\s*\(/gi,
      /fs\.mkdir\s*\(/gi,
      /fs\.chmod\s*\(/gi,
      /fs\.chown\s*\(/gi
    ],
    
    // Command injection
    commandInjection: [
      /exec\s*\(/gi,
      /spawn\s*\(/gi,
      /execSync\s*\(/gi,
      /execFile\s*\(/gi,
      /child_process/gi
    ],
    
    // Prototype pollution
    prototypePollution: [
      /__proto__/gi,
      /constructor\.prototype/gi,
      /Object\.prototype/gi,
      /JSON\.parse\s*\([^)]*\)/gi
    ]
  },
  
  // Dependency vulnerabilities
  dependencyChecks: {
    highRiskPackages: [
      'request',
      'axios@<1.6.0',
      'lodash@<4.17.21',
      'moment@<2.29.0',
      'express@<4.19.0',
      'mongoose@<6.0.0',
      'jsonwebtoken@<9.0.0',
      'bcrypt@<5.0.0',
      'cors@<2.8.5',
      'helmet@<6.0.0'
    ],
    
    knownVulnerabilities: [
      'CVE-2021-23337',
      'CVE-2021-23336',
      'CVE-2020-8203',
      'CVE-2020-28469',
      'CVE-2021-23337',
      'CVE-2021-23336'
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
function log(level, message, file = '', line = 0, details = {}) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${file}:${line} - ${message}`;
  
  auditResults[level].push({
    file,
    line,
    message,
    details,
    timestamp,
    id: crypto.randomBytes(4).toString('hex')
  });
  
  auditResults.summary.totalIssues++;
  auditResults.summary[`${level}Count`]++;
  
  console.log(logMessage);
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
          log('critical', 'Potential hardcoded secret detected', filePath, lineNumber, {
            pattern: pattern.toString(),
            line: line.trim()
          });
        }
      });
      
      // Check for SQL injection
      AUDIT_CONFIG.securityPatterns.sqlInjection.forEach(pattern => {
        if (pattern.test(line)) {
          log('high', 'Potential SQL injection vulnerability', filePath, lineNumber, {
            pattern: pattern.toString(),
            line: line.trim()
          });
        }
      });
      
      // Check for XSS patterns
      AUDIT_CONFIG.securityPatterns.xssPatterns.forEach(pattern => {
        if (pattern.test(line)) {
          log('high', 'Potential XSS vulnerability', filePath, lineNumber, {
            pattern: pattern.toString(),
            line: line.trim()
          });
        }
      });
      
      // Check for unsafe redirects
      AUDIT_CONFIG.securityPatterns.unsafeRedirects.forEach(pattern => {
        if (pattern.test(line)) {
          log('medium', 'Potential unsafe redirect', filePath, lineNumber, {
            pattern: pattern.toString(),
            line: line.trim()
          });
        }
      });
      
      // Check for debug statements
      AUDIT_CONFIG.securityPatterns.debugStatements.forEach(pattern => {
        if (pattern.test(line)) {
          log('low', 'Debug statement found (remove in production)', filePath, lineNumber, {
            pattern: pattern.toString(),
            line: line.trim()
          });
        }
      });
      
      // Check for weak crypto
      AUDIT_CONFIG.securityPatterns.weakCrypto.forEach(pattern => {
        if (pattern.test(line)) {
          log('high', 'Weak cryptographic algorithm detected', filePath, lineNumber, {
            pattern: pattern.toString(),
            line: line.trim()
          });
        }
      });
      
      // Check for insecure random
      AUDIT_CONFIG.securityPatterns.insecureRandom.forEach(pattern => {
        if (pattern.test(line)) {
          log('medium', 'Insecure random number generation', filePath, lineNumber, {
            pattern: pattern.toString(),
            line: line.trim()
          });
        }
      });
      
      // Check for file system vulnerabilities
      AUDIT_CONFIG.securityPatterns.fileSystemVulns.forEach(pattern => {
        if (pattern.test(line)) {
          log('medium', 'Potential file system vulnerability', filePath, lineNumber, {
            pattern: pattern.toString(),
            line: line.trim()
          });
        }
      });
      
      // Check for command injection
      AUDIT_CONFIG.securityPatterns.commandInjection.forEach(pattern => {
        if (pattern.test(line)) {
          log('high', 'Potential command injection vulnerability', filePath, lineNumber, {
            pattern: pattern.toString(),
            line: line.trim()
          });
        }
      });
      
      // Check for prototype pollution
      AUDIT_CONFIG.securityPatterns.prototypePollution.forEach(pattern => {
        if (pattern.test(line)) {
          log('medium', 'Potential prototype pollution vulnerability', filePath, lineNumber, {
            pattern: pattern.toString(),
            line: line.trim()
          });
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

function checkDependencies() {
  const packageFiles = [
    'package.json',
    'frontend/package.json',
    'backend/package.json',
    'cloud/package.json'
  ];
  
  packageFiles.forEach(packageFile => {
    if (fs.existsSync(packageFile)) {
      try {
        const packageData = JSON.parse(fs.readFileSync(packageFile, 'utf8'));
        const dependencies = { ...packageData.dependencies, ...packageData.devDependencies };
        
        // Check for high-risk packages
        Object.keys(dependencies).forEach(packageName => {
          const version = dependencies[packageName];
          
          AUDIT_CONFIG.dependencyChecks.highRiskPackages.forEach(riskPackage => {
            const [pkgName, versionConstraint] = riskPackage.split('@');
            
            if (packageName === pkgName) {
              if (versionConstraint && versionConstraint.startsWith('<')) {
                const minVersion = versionConstraint.substring(1);
                const currentVersion = version.replace(/[\^~]/, '');
                
                if (compareVersions(currentVersion, minVersion) < 0) {
                  log('high', `High-risk package detected: ${packageName}@${version} (requires >= ${minVersion})`, packageFile, 0, {
                    package: packageName,
                    currentVersion: version,
                    minVersion: minVersion
                  });
                }
              } else if (!versionConstraint) {
                log('high', `High-risk package detected: ${packageName}@${version}`, packageFile, 0, {
                  package: packageName,
                  version: version
                });
              }
            }
          });
        });
        
        // Check for missing security fields
        if (!packageData.engines) {
          log('medium', 'Missing engines field in package.json', packageFile, 0);
        }
        
        if (!packageData.scripts || (!packageData.scripts.audit && !packageData.scripts['audit:security'])) {
          log('low', 'Missing audit script in package.json', packageFile, 0);
        }
        
      } catch (error) {
        log('info', `Could not parse package.json: ${error.message}`, packageFile);
      }
    }
  });
}

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

function checkEnvironmentFiles() {
  const envFiles = [
    '.env',
    '.env.local',
    '.env.production',
    'backend/.env.backend',
    'frontend/.env.local',
    'cloud/.env.cloud'
  ];
  
  envFiles.forEach(envFile => {
    if (fs.existsSync(envFile)) {
      log('info', `Environment file found: ${envFile}`, envFile);
      
      // Check if environment file is in .gitignore
      const gitignorePath = '.gitignore';
      if (fs.existsSync(gitignorePath)) {
        const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
        if (!gitignoreContent.includes(envFile)) {
          log('high', `Environment file not in .gitignore: ${envFile}`, envFile);
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
          log('info', `Security middleware detected (${hasHelmet ? 'Helmet.js' : 'Custom security middleware'})`, file);
        }
      } catch (error) {
        log('info', `Could not check security headers: ${error.message}`, file);
      }
    }
  });
}

function runNpmAudit() {
  try {
    log('info', 'Running npm audit...');
    const auditOutput = execSync('npm audit --json', { encoding: 'utf8' });
    const auditData = JSON.parse(auditOutput);
    
    if (auditData.vulnerabilities) {
      Object.keys(auditData.vulnerabilities).forEach(vuln => {
        const vulnData = auditData.vulnerabilities[vuln];
        const severity = vulnData.severity || 'unknown';
        
        log(severity, `Vulnerability found: ${vuln}`, 'package.json', 0, {
          vulnerability: vuln,
          severity: vulnData.severity,
          title: vulnData.title,
          description: vulnData.description,
          recommendation: vulnData.recommendation
        });
      });
    }
  } catch (error) {
    log('info', `Could not run npm audit: ${error.message}`);
  }
}

function generateReport() {
  const report = {
    timestamp: new Date().toISOString(),
    summary: auditResults.summary,
    issues: auditResults,
    recommendations: generateRecommendations(),
    metadata: {
      totalFilesScanned: 0, // This would be calculated during scanning
      scanDuration: Date.now() - startTime,
      nodeVersion: process.version,
      platform: process.platform
    }
  };
  
  // Save report to file
  const reportPath = 'security-audit-report.json';
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  // Generate HTML report
  generateHTMLReport(report);
  
  console.log('\n' + '='.repeat(80));
  console.log('SECURITY AUDIT COMPLETE');
  console.log('='.repeat(80));
  console.log(`Total Issues: ${auditResults.summary.totalIssues}`);
  console.log(`Critical: ${auditResults.summary.criticalCount}`);
  console.log(`High: ${auditResults.summary.highCount}`);
  console.log(`Medium: ${auditResults.summary.mediumCount}`);
  console.log(`Low: ${auditResults.summary.lowCount}`);
  console.log(`Info: ${auditResults.summary.infoCount}`);
  console.log('='.repeat(80));
  
  // Exit with error code if critical issues found
  if (auditResults.summary.criticalCount > 0) {
    console.log('❌ CRITICAL ISSUES FOUND - DEPLOYMENT BLOCKED');
    process.exit(1);
  } else if (auditResults.summary.highCount > 0) {
    console.log('⚠️  HIGH PRIORITY ISSUES FOUND - REVIEW REQUIRED');
  } else {
    console.log('✅ SECURITY AUDIT PASSED');
  }
}

function generateRecommendations() {
  const recommendations = [];
  
  if (auditResults.summary.criticalCount > 0) {
    recommendations.push({
      priority: 'critical',
      category: 'secrets',
      title: 'Remove hardcoded secrets',
      description: 'Replace all hardcoded secrets with environment variables',
      action: 'Use process.env for all sensitive data'
    });
  }
  
  if (auditResults.summary.highCount > 0) {
    recommendations.push({
      priority: 'high',
      category: 'vulnerabilities',
      title: 'Address security vulnerabilities',
      description: 'Fix all high-priority security issues',
      action: 'Review and fix SQL injection, XSS, and command injection vulnerabilities'
    });
  }
  
  recommendations.push({
    priority: 'medium',
    category: 'monitoring',
    title: 'Implement security monitoring',
    description: 'Set up continuous security monitoring',
    action: 'Integrate with security monitoring tools like Snyk or SonarQube'
  });
  
  recommendations.push({
    priority: 'low',
    category: 'maintenance',
    title: 'Regular security audits',
    description: 'Schedule regular security audits',
    action: 'Run security audits weekly and before each deployment'
  });
  
  return recommendations;
}

function generateHTMLReport(report) {
  const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Security Audit Report - ${new Date().toLocaleDateString()}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f4f4f4; padding: 20px; border-radius: 5px; }
        .summary { display: flex; gap: 20px; margin: 20px 0; }
        .summary-item { background: #e9e9e9; padding: 15px; border-radius: 5px; text-align: center; }
        .critical { background: #ffebee; border-left: 4px solid #f44336; }
        .high { background: #fff3e0; border-left: 4px solid #ff9800; }
        .medium { background: #fff8e1; border-left: 4px solid #ffc107; }
        .low { background: #e8f5e8; border-left: 4px solid #4caf50; }
        .issue { margin: 10px 0; padding: 10px; border-radius: 3px; }
        .recommendations { background: #f0f8ff; padding: 20px; border-radius: 5px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Security Audit Report</h1>
        <p>Generated: ${report.timestamp}</p>
        <p>Total Issues: ${report.summary.totalIssues}</p>
    </div>
    
    <div class="summary">
        <div class="summary-item critical">
            <h3>Critical</h3>
            <p>${report.summary.criticalCount}</p>
        </div>
        <div class="summary-item high">
            <h3>High</h3>
            <p>${report.summary.highCount}</p>
        </div>
        <div class="summary-item medium">
            <h3>Medium</h3>
            <p>${report.summary.mediumCount}</p>
        </div>
        <div class="summary-item low">
            <h3>Low</h3>
            <p>${report.summary.lowCount}</p>
        </div>
    </div>
    
    <h2>Issues</h2>
    ${Object.keys(report.issues).filter(level => level !== 'summary').map(level => `
        <h3>${level.toUpperCase()}</h3>
        ${report.issues[level].map(issue => `
            <div class="issue ${level}">
                <strong>${issue.file}:${issue.line}</strong> - ${issue.message}
                ${issue.details ? `<br><small>Details: ${JSON.stringify(issue.details)}</small>` : ''}
            </div>
        `).join('')}
    `).join('')}
    
    <div class="recommendations">
        <h2>Recommendations</h2>
        ${report.recommendations.map(rec => `
            <div class="issue">
                <strong>${rec.title}</strong> (${rec.priority})
                <p>${rec.description}</p>
                <p><em>Action: ${rec.action}</em></p>
            </div>
        `).join('')}
    </div>
</body>
</html>`;
  
  fs.writeFileSync('security-audit-report.html', html);
}

// Main audit function
const startTime = Date.now();

function runSecurityAudit() {
  console.log('🔍 Starting comprehensive security audit...');
  
  // Scan source code
  scanDirectory('.');
  
  // Check dependencies
  checkDependencies();
  
  // Check environment files
  checkEnvironmentFiles();
  
  // Check security headers
  checkSecurityHeaders();
  
  // Run npm audit
  runNpmAudit();
  
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
