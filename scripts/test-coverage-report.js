// =============================================================================
// Test Coverage Report Generator - Production Ready
// =============================================================================
// Comprehensive test coverage analysis and reporting

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const CONFIG = {
  coverageThresholds: {
    statements: 80,
    branches: 70,
    functions: 80,
    lines: 80
  },
  reportFormats: ['text', 'html', 'json', 'lcov'],
  outputDir: 'coverage-reports',
  packages: ['backend', 'frontend']
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

function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function runTestsWithCoverage(packageName) {
  log(`🧪 Running tests with coverage for ${packageName}...`, 'blue');
  
  try {
    const command = `pnpm --filter ${packageName} test:coverage`;
    execSync(command, { stdio: 'inherit' });
    log(`✅ Tests completed for ${packageName}`, 'green');
    return true;
  } catch (error) {
    log(`❌ Tests failed for ${packageName}: ${error.message}`, 'red');
    return false;
  }
}

function collectCoverageData(packageName) {
  const coveragePath = path.join(packageName, 'coverage', 'coverage-summary.json');
  
  if (!fs.existsSync(coveragePath)) {
    log(`⚠️  Coverage file not found for ${packageName}`, 'yellow');
    return null;
  }
  
  try {
    const coverageData = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
    return coverageData;
  } catch (error) {
    log(`❌ Error reading coverage data for ${packageName}: ${error.message}`, 'red');
    return null;
  }
}

function analyzeCoverage(coverageData) {
  const analysis = {
    total: coverageData.total,
    packages: {},
    overall: {
      statements: 0,
      branches: 0,
      functions: 0,
      lines: 0
    },
    thresholds: CONFIG.coverageThresholds,
    passed: true
  };
  
  // Calculate overall coverage
  let totalFiles = 0;
  Object.keys(coverageData).forEach(key => {
    if (key !== 'total' && coverageData[key].statements) {
      const pkg = coverageData[key];
      analysis.packages[key] = {
        statements: pkg.statements.pct,
        branches: pkg.branches.pct,
        functions: pkg.functions.pct,
        lines: pkg.lines.pct
      };
      
      analysis.overall.statements += pkg.statements.pct;
      analysis.overall.branches += pkg.branches.pct;
      analysis.overall.functions += pkg.functions.pct;
      analysis.overall.lines += pkg.lines.pct;
      totalFiles++;
    }
  });
  
  // Calculate averages
  if (totalFiles > 0) {
    analysis.overall.statements /= totalFiles;
    analysis.overall.branches /= totalFiles;
    analysis.overall.functions /= totalFiles;
    analysis.overall.lines /= totalFiles;
  }
  
  // Check if thresholds are met
  Object.keys(analysis.thresholds).forEach(metric => {
    if (analysis.overall[metric] < analysis.thresholds[metric]) {
      analysis.passed = false;
    }
  });
  
  return analysis;
}

function generateCoverageReport(analysis) {
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      overall: analysis.overall,
      thresholds: analysis.thresholds,
      passed: analysis.passed
    },
    packages: analysis.packages,
    recommendations: generateRecommendations(analysis)
  };
  
  return report;
}

function generateRecommendations(analysis) {
  const recommendations = [];
  
  Object.keys(analysis.thresholds).forEach(metric => {
    const current = analysis.overall[metric];
    const threshold = analysis.thresholds[metric];
    
    if (current < threshold) {
      const diff = threshold - current;
      recommendations.push({
        type: 'coverage',
        metric: metric,
        current: current.toFixed(2),
        threshold: threshold,
        difference: diff.toFixed(2),
        message: `${metric} coverage is ${current.toFixed(2)}%, needs ${diff.toFixed(2)}% more to reach ${threshold}%`
      });
    }
  });
  
  // Add general recommendations
  if (analysis.overall.statements < 80) {
    recommendations.push({
      type: 'general',
      message: 'Consider adding more unit tests to improve statement coverage'
    });
  }
  
  if (analysis.overall.branches < 70) {
    recommendations.push({
      type: 'general',
      message: 'Add tests for edge cases and error conditions to improve branch coverage'
    });
  }
  
  if (analysis.overall.functions < 80) {
    recommendations.push({
      type: 'general',
      message: 'Ensure all functions have corresponding test cases'
    });
  }
  
  return recommendations;
}

function displayCoverageReport(analysis) {
  log('\n📊 Test Coverage Report', 'cyan');
  log('='.repeat(50), 'cyan');
  
  // Overall coverage
  log('\n📈 Overall Coverage:', 'blue');
  Object.keys(analysis.overall).forEach(metric => {
    const value = analysis.overall[metric];
    const threshold = analysis.thresholds[metric];
    const status = value >= threshold ? '✅' : '❌';
    const color = value >= threshold ? 'green' : 'red';
    
    log(`  ${status} ${metric}: ${value.toFixed(2)}% (threshold: ${threshold}%)`, color);
  });
  
  // Package coverage
  log('\n📦 Package Coverage:', 'blue');
  Object.keys(analysis.packages).forEach(pkg => {
    const pkgData = analysis.packages[pkg];
    log(`\n  ${pkg}:`, 'yellow');
    
    Object.keys(pkgData).forEach(metric => {
      const value = pkgData[metric];
      const threshold = analysis.thresholds[metric];
      const status = value >= threshold ? '✅' : '❌';
      const color = value >= threshold ? 'green' : 'red';
      
      log(`    ${status} ${metric}: ${value.toFixed(2)}%`, color);
    });
  });
  
  // Recommendations
  if (analysis.recommendations && analysis.recommendations.length > 0) {
    log('\n💡 Recommendations:', 'yellow');
    analysis.recommendations.forEach(rec => {
      log(`  • ${rec.message}`, 'blue');
    });
  }
  
  // Summary
  log('\n📋 Summary:', 'cyan');
  if (analysis.passed) {
    log('  ✅ All coverage thresholds met!', 'green');
  } else {
    log('  ❌ Some coverage thresholds not met', 'red');
  }
}

function saveCoverageReport(report) {
  ensureDirectoryExists(CONFIG.outputDir);
  
  const reportPath = path.join(CONFIG.outputDir, 'coverage-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  log(`\n📄 Detailed report saved to ${reportPath}`, 'green');
}

function copyCoverageFiles() {
  ensureDirectoryExists(CONFIG.outputDir);
  
  CONFIG.packages.forEach(pkg => {
    const sourceDir = path.join(pkg, 'coverage');
    const targetDir = path.join(CONFIG.outputDir, pkg);
    
    if (fs.existsSync(sourceDir)) {
      // Copy coverage files
      execSync(`cp -r "${sourceDir}" "${targetDir}"`, { stdio: 'inherit' });
      log(`📁 Coverage files copied for ${pkg}`, 'green');
    }
  });
}

function generateHTMLReport() {
  log('\n🌐 Generating HTML coverage report...', 'blue');
  
  try {
    // Generate combined HTML report
    const command = `npx nyc report --reporter=html --report-dir=${CONFIG.outputDir}/html`;
    execSync(command, { stdio: 'inherit' });
    
    log(`📄 HTML report generated at ${CONFIG.outputDir}/html/index.html`, 'green');
  } catch (error) {
    log(`⚠️  HTML report generation failed: ${error.message}`, 'yellow');
  }
}

async function generateTestCoverageReport() {
  log('🚀 Starting test coverage analysis...', 'cyan');
  
  const allTestsPassed = CONFIG.packages.every(pkg => runTestsWithCoverage(pkg));
  
  if (!allTestsPassed) {
    log('❌ Some tests failed. Coverage analysis may be incomplete.', 'red');
  }
  
  // Collect coverage data
  const coverageData = {};
  CONFIG.packages.forEach(pkg => {
    const data = collectCoverageData(pkg);
    if (data) {
      coverageData[pkg] = data;
    }
  });
  
  if (Object.keys(coverageData).length === 0) {
    log('❌ No coverage data found. Make sure tests are running with coverage enabled.', 'red');
    return;
  }
  
  // Analyze coverage
  const analysis = analyzeCoverage(coverageData);
  analysis.recommendations = generateRecommendations(analysis);
  
  // Generate report
  const report = generateCoverageReport(analysis);
  
  // Display report
  displayCoverageReport(analysis);
  
  // Save report
  saveCoverageReport(report);
  
  // Copy coverage files
  copyCoverageFiles();
  
  // Generate HTML report
  generateHTMLReport();
  
  log('\n🎉 Test coverage analysis completed!', 'green');
  
  // Exit with error code if thresholds not met
  if (!analysis.passed) {
    process.exit(1);
  }
}

// Run the coverage report generation
if (require.main === module) {
  generateTestCoverageReport().catch(error => {
    log(`❌ Coverage report generation failed: ${error.message}`, 'red');
    process.exit(1);
  });
}

module.exports = {
  generateTestCoverageReport,
  analyzeCoverage,
  generateCoverageReport,
  CONFIG
};
