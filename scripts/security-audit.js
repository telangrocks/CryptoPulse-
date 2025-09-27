#!/usr/bin/env node
/**
 * Security Audit Script for CryptoPulse
 * Scans for hardcoded credentials and security vulnerabilities
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Sensitive patterns to check for
const SENSITIVE_PATTERNS = [
  { pattern: /api[_-]?key\s*[:=]\s*['"][^'"]{10,}['"]/gi, type: 'API Key' },
  { pattern: /secret\s*[:=]\s*['"][^'"]{10,}['"]/gi, type: 'Secret' },
  { pattern: /password\s*[:=]\s*['"][^'"]{6,}['"]/gi, type: 'Password' },
  { pattern: /token\s*[:=]\s*['"][^'"]{10,}['"]/gi, type: 'Token' },
  { pattern: /master[_-]?key\s*[:=]\s*['"][^'"]{10,}['"]/gi, type: 'Master Key' },
  { pattern: /private[_-]?key\s*[:=]\s*['"][^'"]{10,}['"]/gi, type: 'Private Key' },
  { pattern: /webhook[_-]?url\s*[:=]\s*['"][^'"]{10,}['"]/gi, type: 'Webhook URL' },
  { pattern: /connection[_-]?string\s*[:=]\s*['"][^'"]{10,}['"]/gi, type: 'Connection String' }
];

// Files to exclude from scanning
const EXCLUDE_PATTERNS = [
  /node_modules/,
  /\.git/,
  /dist/,
  /build/,
  /coverage/,
  /\.env\.example$/,
  /\.env\.production\.example$/,
  /README\.md$/,
  /\.md$/,
  /security-audit\.js$/
];

// File extensions to scan
const SCAN_EXTENSIONS = ['.js', '.ts', '.tsx', '.jsx', '.json', '.env'];

let findings = [];
let totalFilesScanned = 0;

/**
 * Check if file should be excluded
 */
function shouldExcludeFile(filePath) {
  return EXCLUDE_PATTERNS.some(pattern => pattern.test(filePath));
}

/**
 * Scan a single file for sensitive patterns
 */
function scanFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      SENSITIVE_PATTERNS.forEach(({ pattern, type }) => {
        const matches = line.match(pattern);
        if (matches) {
          matches.forEach(match => {
            // Skip if it's clearly an environment variable reference
            if (match.includes('process.env.') || match.includes('import.meta.env.')) {
              return;
            }
            
            // Skip if it's a placeholder value
            if (match.includes('your_') || match.includes('YOUR_') || match.includes('placeholder')) {
              return;
            }
            
            findings.push({
              file: filePath,
              line: index + 1,
              type: type,
              match: match.trim(),
              severity: 'HIGH'
            });
          });
        }
      });
    });
    
    totalFilesScanned++;
  } catch (error) {
    console.warn(`Warning: Could not read file ${filePath}: ${error.message}`);
  }
}

/**
 * Recursively scan directory
 */
function scanDirectory(dirPath) {
  try {
    const items = fs.readdirSync(dirPath);
    
    items.forEach(item => {
      const fullPath = path.join(dirPath, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        if (!shouldExcludeFile(fullPath)) {
          scanDirectory(fullPath);
        }
      } else if (stat.isFile()) {
        const ext = path.extname(fullPath);
        if (SCAN_EXTENSIONS.includes(ext) && !shouldExcludeFile(fullPath)) {
          scanFile(fullPath);
        }
      }
    });
  } catch (error) {
    console.warn(`Warning: Could not scan directory ${dirPath}: ${error.message}`);
  }
}

/**
 * Generate security report
 */
function generateReport() {
  console.log('\n🔐 CRYPTOPULSE SECURITY AUDIT REPORT');
  console.log('=====================================\n');
  
  console.log(`📊 Scan Summary:`);
  console.log(`   Files Scanned: ${totalFilesScanned}`);
  console.log(`   Security Issues Found: ${findings.length}\n`);
  
  if (findings.length === 0) {
    console.log('✅ No hardcoded credentials found!');
    console.log('✅ Security audit passed successfully!');
    return;
  }
  
  console.log('🚨 SECURITY ISSUES FOUND:\n');
  
  // Group findings by type
  const groupedFindings = findings.reduce((acc, finding) => {
    if (!acc[finding.type]) {
      acc[finding.type] = [];
    }
    acc[finding.type].push(finding);
    return acc;
  }, {});
  
  Object.entries(groupedFindings).forEach(([type, items]) => {
    console.log(`🔴 ${type} (${items.length} issues):`);
    items.forEach(finding => {
      console.log(`   File: ${finding.file}:${finding.line}`);
      console.log(`   Match: ${finding.match}`);
      console.log('');
    });
  });
  
  console.log('🛠️  RECOMMENDED ACTIONS:');
  console.log('   1. Replace hardcoded values with environment variables');
  console.log('   2. Use process.env.VARIABLE_NAME for backend');
  console.log('   3. Use import.meta.env.VITE_VARIABLE_NAME for frontend');
  console.log('   4. Never commit .env files to version control');
  console.log('   5. Use a secrets management service for production');
}

/**
 * Main execution
 */
function main() {
  console.log('🔍 Starting security audit...\n');
  
  const projectRoot = process.cwd();
  console.log(`Scanning project: ${projectRoot}\n`);
  
  // Scan the entire project
  scanDirectory(projectRoot);
  
  // Generate and display report
  generateReport();
  
  // Exit with error code if issues found
  if (findings.length > 0) {
    console.log('\n❌ Security audit failed! Please fix the issues above.');
    process.exit(1);
  } else {
    console.log('\n✅ Security audit passed!');
    process.exit(0);
  }
}

// Run the audit
main();
