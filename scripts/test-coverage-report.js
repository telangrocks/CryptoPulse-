// =============================================================================
// Test Coverage Report Script - Production Ready
// =============================================================================
// Comprehensive test coverage analysis and reporting

const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

// Configuration
const config = {
  coverageThresholds: {
    statements: 80,
    branches: 75,
    functions: 80,
    lines: 80
  },
  coveragePaths: {
    backend: 'backend/coverage',
    frontend: 'frontend/coverage',
    merged: 'coverage'
  },
  reportFormats: ['html', 'json', 'lcov', 'text'],
  excludePatterns: [
    '**/node_modules/**',
    '**/coverage/**',
    '**/dist/**',
    '**/build/**',
    '**/*.test.js',
    '**/*.spec.js',
    '**/*.test.ts',
    '**/*.spec.ts',
    '**/tests/**',
    '**/__tests__/**'
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

// Utility functions
const log = (message, color = colors.reset) => {
  console.log(`${color}${message}${colors.reset}`);
};

const logSuccess = (message) => log(`✅ ${message}`, colors.green);
const logError = (message) => log(`❌ ${message}`, colors.red);
const logWarning = (message) => log(`⚠️  ${message}`, colors.yellow);
const logInfo = (message) => log(`ℹ️  ${message}`, colors.blue);

// Generate coverage report for a specific service
const generateServiceCoverage = async (service, options = {}) => {
  try {
    logInfo(`Generating coverage for ${service}...`);
    
    const servicePath = service === 'backend' ? 'backend' : 'frontend';
    const coveragePath = config.coveragePaths[service];
    
    // Run tests with coverage
    const testCommand = service === 'backend' 
      ? 'cd backend && npm run test:coverage'
      : 'cd frontend && npm run test:coverage';
    
    await execAsync(testCommand, { timeout: 300000 });
    
    // Ensure coverage directory exists
    await fs.mkdir(coveragePath, { recursive: true });
    
    logSuccess(`Coverage generated for ${service}`);
    
    return {
      service,
      coveragePath,
      status: 'success'
    };
  } catch (error) {
    logError(`Failed to generate coverage for ${service}: ${error.message}`);
    return {
      service,
      status: 'failed',
      error: error.message
    };
  }
};

// Merge coverage reports from multiple services
const mergeCoverageReports = async (services) => {
  try {
    logInfo('Merging coverage reports...');
    
    const coverageFiles = [];
    
    // Collect coverage files from each service
    for (const service of services) {
      const coveragePath = config.coveragePaths[service];
      const coverageFile = path.join(coveragePath, 'coverage-final.json');
      
      try {
        await fs.access(coverageFile);
        coverageFiles.push(coverageFile);
        logSuccess(`Found coverage file for ${service}`);
      } catch (error) {
        logWarning(`No coverage file found for ${service}`);
      }
    }
    
    if (coverageFiles.length === 0) {
      throw new Error('No coverage files found to merge');
    }
    
    // Create merged coverage directory
    await fs.mkdir(config.coveragePaths.merged, { recursive: true });
    
    // Merge coverage files using nyc
    const mergeCommand = `npx nyc merge ${coverageFiles.join(' ')} ${path.join(config.coveragePaths.merged, 'coverage-final.json')}`;
    await execAsync(mergeCommand);
    
    logSuccess('Coverage reports merged');
    
    return {
      status: 'success',
      mergedFile: path.join(config.coveragePaths.merged, 'coverage-final.json')
    };
  } catch (error) {
    logError(`Failed to merge coverage reports: ${error.message}`);
    return {
      status: 'failed',
      error: error.message
    };
  }
};

// Generate coverage reports in multiple formats
const generateCoverageReports = async (coverageFile) => {
  try {
    logInfo('Generating coverage reports in multiple formats...');
    
    const reportsDir = path.join(config.coveragePaths.merged, 'reports');
    await fs.mkdir(reportsDir, { recursive: true });
    
    // Generate HTML report
    await execAsync(`npx nyc report --reporter=html --report-dir=${path.join(reportsDir, 'html')}`, {
      cwd: config.coveragePaths.merged
    });
    
    // Generate JSON report
    await execAsync(`npx nyc report --reporter=json --report-dir=${path.join(reportsDir, 'json')}`, {
      cwd: config.coveragePaths.merged
    });
    
    // Generate LCOV report
    await execAsync(`npx nyc report --reporter=lcov --report-dir=${path.join(reportsDir, 'lcov')}`, {
      cwd: config.coveragePaths.merged
    });
    
    // Generate text report
    await execAsync(`npx nyc report --reporter=text`, {
      cwd: config.coveragePaths.merged
    });
    
    logSuccess('Coverage reports generated in multiple formats');
    
    return {
      status: 'success',
      reportsDir
    };
  } catch (error) {
    logError(`Failed to generate coverage reports: ${error.message}`);
    return {
      status: 'failed',
      error: error.message
    };
  }
};

// Analyze coverage data
const analyzeCoverage = async (coverageFile) => {
  try {
    logInfo('Analyzing coverage data...');
    
    const coverageData = JSON.parse(await fs.readFile(coverageFile, 'utf8'));
    
    // Calculate overall coverage
    const stats = {
      statements: { total: 0, covered: 0 },
      branches: { total: 0, covered: 0 },
      functions: { total: 0, covered: 0 },
      lines: { total: 0, covered: 0 }
    };
    
    // Process coverage data
    for (const [filePath, fileData] of Object.entries(coverageData)) {
      if (fileData.s) {
        stats.statements.total += Object.keys(fileData.s).length;
        stats.statements.covered += Object.values(fileData.s).filter(count => count > 0).length;
      }
      
      if (fileData.b) {
        stats.branches.total += Object.values(fileData.b).reduce((sum, branch) => sum + branch.length, 0);
        stats.branches.covered += Object.values(fileData.b).reduce((sum, branch) => 
          sum + branch.filter(count => count > 0).length, 0);
      }
      
      if (fileData.f) {
        stats.functions.total += Object.keys(fileData.f).length;
        stats.functions.covered += Object.values(fileData.f).filter(count => count > 0).length;
      }
      
      if (fileData.l) {
        stats.lines.total += Object.keys(fileData.l).length;
        stats.lines.covered += Object.values(fileData.l).filter(count => count > 0).length;
      }
    }
    
    // Calculate percentages
    const percentages = {};
    for (const [metric, data] of Object.entries(stats)) {
      percentages[metric] = data.total > 0 ? (data.covered / data.total * 100) : 0;
    }
    
    // Find files with low coverage
    const lowCoverageFiles = [];
    for (const [filePath, fileData] of Object.entries(coverageData)) {
      const fileStats = {
        statements: { total: 0, covered: 0 },
        branches: { total: 0, covered: 0 },
        functions: { total: 0, covered: 0 },
        lines: { total: 0, covered: 0 }
      };
      
      if (fileData.s) {
        fileStats.statements.total = Object.keys(fileData.s).length;
        fileStats.statements.covered = Object.values(fileData.s).filter(count => count > 0).length;
      }
      
      if (fileData.b) {
        fileStats.branches.total = Object.values(fileData.b).reduce((sum, branch) => sum + branch.length, 0);
        fileStats.branches.covered = Object.values(fileData.b).reduce((sum, branch) => 
          sum + branch.filter(count => count > 0).length, 0);
      }
      
      if (fileData.f) {
        fileStats.functions.total = Object.keys(fileData.f).length;
        fileStats.functions.covered = Object.values(fileData.f).filter(count => count > 0).length;
      }
      
      if (fileData.l) {
        fileStats.lines.total = Object.keys(fileData.l).length;
        fileStats.lines.covered = Object.values(fileData.l).filter(count => count > 0).length;
      }
      
      const filePercentages = {};
      for (const [metric, data] of Object.entries(fileStats)) {
        filePercentages[metric] = data.total > 0 ? (data.covered / data.total * 100) : 0;
      }
      
      const avgCoverage = (filePercentages.statements + filePercentages.branches + 
                          filePercentages.functions + filePercentages.lines) / 4;
      
      if (avgCoverage < 50) {
        lowCoverageFiles.push({
          file: filePath,
          coverage: avgCoverage,
          stats: filePercentages
        });
      }
    }
    
    // Sort by coverage (lowest first)
    lowCoverageFiles.sort((a, b) => a.coverage - b.coverage);
    
    logSuccess('Coverage analysis completed');
    
    return {
      status: 'success',
      stats,
      percentages,
      lowCoverageFiles
    };
  } catch (error) {
    logError(`Failed to analyze coverage: ${error.message}`);
    return {
      status: 'failed',
      error: error.message
    };
  }
};

// Check coverage thresholds
const checkCoverageThresholds = async (percentages) => {
  try {
    logInfo('Checking coverage thresholds...');
    
    const thresholds = config.coverageThresholds;
    const results = {};
    let allPassed = true;
    
    for (const [metric, threshold] of Object.entries(thresholds)) {
      const value = percentages[metric] || 0;
      const passed = value >= threshold;
      
      results[metric] = {
        value: Math.round(value * 100) / 100,
        threshold,
        passed
      };
      
      if (passed) {
        logSuccess(`${metric} coverage: ${value.toFixed(2)}% (threshold: ${threshold}%)`);
      } else {
        logError(`${metric} coverage: ${value.toFixed(2)}% (threshold: ${threshold}%)`);
        allPassed = false;
      }
    }
    
    if (allPassed) {
      logSuccess('All coverage thresholds met');
    } else {
      logError('Some coverage thresholds not met');
    }
    
    return {
      status: 'success',
      results,
      allPassed
    };
  } catch (error) {
    logError(`Failed to check coverage thresholds: ${error.message}`);
    return {
      status: 'failed',
      error: error.message
    };
  }
};

// Generate coverage summary report
const generateCoverageSummary = async (analysis, thresholdResults) => {
  try {
    logInfo('Generating coverage summary report...');
    
    const summary = {
      timestamp: new Date().toISOString(),
      coverage: {
        statements: {
          covered: analysis.stats.statements.covered,
          total: analysis.stats.statements.total,
          percentage: Math.round(analysis.percentages.statements * 100) / 100
        },
        branches: {
          covered: analysis.stats.branches.covered,
          total: analysis.stats.branches.total,
          percentage: Math.round(analysis.percentages.branches * 100) / 100
        },
        functions: {
          covered: analysis.stats.functions.covered,
          total: analysis.stats.functions.total,
          percentage: Math.round(analysis.percentages.functions * 100) / 100
        },
        lines: {
          covered: analysis.stats.lines.covered,
          total: analysis.stats.lines.total,
          percentage: Math.round(analysis.percentages.lines * 100) / 100
        }
      },
      thresholds: thresholdResults.results,
      thresholdsPassed: thresholdResults.allPassed,
      lowCoverageFiles: analysis.lowCoverageFiles.slice(0, 10), // Top 10 lowest coverage files
      recommendations: generateRecommendations(analysis, thresholdResults)
    };
    
    // Save summary to file
    await fs.writeFile(
      path.join(config.coveragePaths.merged, 'coverage-summary.json'),
      JSON.stringify(summary, null, 2)
    );
    
    logSuccess('Coverage summary report generated');
    
    return summary;
  } catch (error) {
    logError(`Failed to generate coverage summary: ${error.message}`);
    return {
      status: 'failed',
      error: error.message
    };
  }
};

// Generate recommendations based on coverage analysis
const generateRecommendations = (analysis, thresholdResults) => {
  const recommendations = [];
  
  // Check threshold failures
  for (const [metric, result] of Object.entries(thresholdResults.results)) {
    if (!result.passed) {
      recommendations.push({
        type: 'threshold',
        metric,
        current: result.value,
        target: result.threshold,
        message: `${metric} coverage (${result.value}%) is below threshold (${result.threshold}%)`
      });
    }
  }
  
  // Check for files with very low coverage
  const veryLowCoverage = analysis.lowCoverageFiles.filter(file => file.coverage < 20);
  if (veryLowCoverage.length > 0) {
    recommendations.push({
      type: 'low_coverage',
      count: veryLowCoverage.length,
      message: `${veryLowCoverage.length} files have very low coverage (< 20%)`
    });
  }
  
  // Check for untested files
  const untestedFiles = analysis.lowCoverageFiles.filter(file => file.coverage === 0);
  if (untestedFiles.length > 0) {
    recommendations.push({
      type: 'untested',
      count: untestedFiles.length,
      message: `${untestedFiles.length} files have no test coverage`
    });
  }
  
  return recommendations;
};

// Generate HTML coverage report
const generateHTMLCoverageReport = async (summary) => {
  try {
    logInfo('Generating HTML coverage report...');
    
    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>CryptoPulse Coverage Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .header { background: #2c3e50; color: white; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
        .metric { background: #ecf0f1; padding: 15px; border-radius: 5px; text-align: center; }
        .metric.passed { border-left: 4px solid #27ae60; }
        .metric.failed { border-left: 4px solid #e74c3c; }
        .metric h3 { margin: 0 0 10px 0; color: #2c3e50; }
        .metric .percentage { font-size: 24px; font-weight: bold; margin: 10px 0; }
        .metric.passed .percentage { color: #27ae60; }
        .metric.failed .percentage { color: #e74c3c; }
        .recommendations { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .recommendations h3 { color: #856404; margin-top: 0; }
        .recommendation { margin: 10px 0; padding: 10px; background: white; border-radius: 3px; }
        .recommendation.threshold { border-left: 4px solid #e74c3c; }
        .recommendation.low_coverage { border-left: 4px solid #f39c12; }
        .recommendation.untested { border-left: 4px solid #e67e22; }
        .low-coverage-files { margin: 20px 0; }
        .low-coverage-files h3 { color: #2c3e50; }
        .file-item { background: #f8f9fa; padding: 10px; margin: 5px 0; border-radius: 3px; border-left: 4px solid #f39c12; }
        .file-item .file { font-weight: bold; color: #2c3e50; }
        .file-item .coverage { color: #e74c3c; font-weight: bold; }
        .footer { text-align: center; margin-top: 30px; padding: 20px; border-top: 1px solid #ecf0f1; color: #7f8c8d; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>CryptoPulse Coverage Report</h1>
            <p>Generated: ${summary.timestamp}</p>
        </div>
        
        <div class="summary">
            <div class="metric ${summary.coverage.statements.percentage >= config.coverageThresholds.statements ? 'passed' : 'failed'}">
                <h3>Statements</h3>
                <div class="percentage">${summary.coverage.statements.percentage}%</div>
                <div>${summary.coverage.statements.covered} / ${summary.coverage.statements.total}</div>
            </div>
            <div class="metric ${summary.coverage.branches.percentage >= config.coverageThresholds.branches ? 'passed' : 'failed'}">
                <h3>Branches</h3>
                <div class="percentage">${summary.coverage.branches.percentage}%</div>
                <div>${summary.coverage.branches.covered} / ${summary.coverage.branches.total}</div>
            </div>
            <div class="metric ${summary.coverage.functions.percentage >= config.coverageThresholds.functions ? 'passed' : 'failed'}">
                <h3>Functions</h3>
                <div class="percentage">${summary.coverage.functions.percentage}%</div>
                <div>${summary.coverage.functions.covered} / ${summary.coverage.functions.total}</div>
            </div>
            <div class="metric ${summary.coverage.lines.percentage >= config.coverageThresholds.lines ? 'passed' : 'failed'}">
                <h3>Lines</h3>
                <div class="percentage">${summary.coverage.lines.percentage}%</div>
                <div>${summary.coverage.lines.covered} / ${summary.coverage.lines.total}</div>
            </div>
        </div>
        
        ${summary.recommendations.length > 0 ? `
        <div class="recommendations">
            <h3>Recommendations</h3>
            ${summary.recommendations.map(rec => `
                <div class="recommendation ${rec.type}">
                    <strong>${rec.type.replace('_', ' ').toUpperCase()}:</strong> ${rec.message}
                </div>
            `).join('')}
        </div>
        ` : ''}
        
        ${summary.lowCoverageFiles.length > 0 ? `
        <div class="low-coverage-files">
            <h3>Files with Low Coverage</h3>
            ${summary.lowCoverageFiles.map(file => `
                <div class="file-item">
                    <div class="file">${file.file}</div>
                    <div class="coverage">Coverage: ${file.coverage.toFixed(2)}%</div>
                </div>
            `).join('')}
        </div>
        ` : ''}
        
        <div class="footer">
            <p>CryptoPulse Test Coverage Report</p>
        </div>
    </div>
</body>
</html>`;

    await fs.writeFile(
      path.join(config.coveragePaths.merged, 'coverage-report.html'),
      html
    );
    
    logSuccess('HTML coverage report generated');
  } catch (error) {
    logError(`Failed to generate HTML coverage report: ${error.message}`);
  }
};

// Main execution
const main = async () => {
  const startTime = Date.now();
  const args = process.argv.slice(2);
  const services = args.length > 0 ? args : ['backend', 'frontend'];
  
  logInfo('Starting coverage report generation...');
  logInfo(`Services: ${services.join(', ')}`);
  
  try {
    // Generate coverage for each service
    const serviceResults = [];
    for (const service of services) {
      const result = await generateServiceCoverage(service);
      serviceResults.push(result);
    }
    
    // Check if any service failed
    const failedServices = serviceResults.filter(result => result.status === 'failed');
    if (failedServices.length > 0) {
      logWarning(`${failedServices.length} services failed to generate coverage`);
    }
    
    // Merge coverage reports
    const mergeResult = await mergeCoverageReports(services);
    if (mergeResult.status === 'failed') {
      throw new Error(`Failed to merge coverage reports: ${mergeResult.error}`);
    }
    
    // Generate coverage reports in multiple formats
    const reportsResult = await generateCoverageReports(mergeResult.mergedFile);
    if (reportsResult.status === 'failed') {
      throw new Error(`Failed to generate coverage reports: ${reportsResult.error}`);
    }
    
    // Analyze coverage data
    const analysisResult = await analyzeCoverage(mergeResult.mergedFile);
    if (analysisResult.status === 'failed') {
      throw new Error(`Failed to analyze coverage: ${analysisResult.error}`);
    }
    
    // Check coverage thresholds
    const thresholdResult = await checkCoverageThresholds(analysisResult.percentages);
    if (thresholdResult.status === 'failed') {
      throw new Error(`Failed to check coverage thresholds: ${thresholdResult.error}`);
    }
    
    // Generate coverage summary
    const summary = await generateCoverageSummary(analysisResult, thresholdResult);
    
    // Generate HTML report
    await generateHTMLCoverageReport(summary);
    
    // Summary
    const duration = Date.now() - startTime;
    logInfo('Coverage report generation completed');
    logInfo(`Duration: ${Math.round(duration / 1000)}s`);
    
    // Display coverage summary
    logInfo('Coverage Summary:');
    logInfo(`  Statements: ${summary.coverage.statements.percentage}%`);
    logInfo(`  Branches: ${summary.coverage.branches.percentage}%`);
    logInfo(`  Functions: ${summary.coverage.functions.percentage}%`);
    logInfo(`  Lines: ${summary.coverage.lines.percentage}%`);
    
    if (summary.thresholdsPassed) {
      logSuccess('All coverage thresholds met');
      process.exit(0);
    } else {
      logError('Some coverage thresholds not met');
      process.exit(1);
    }
    
  } catch (error) {
    logError(`Coverage report generation failed: ${error.message}`);
    process.exit(1);
  }
};

// Export for use as module
module.exports = {
  generateServiceCoverage,
  mergeCoverageReports,
  generateCoverageReports,
  analyzeCoverage,
  checkCoverageThresholds,
  generateCoverageSummary,
  config
};

// Run if called directly
if (require.main === module) {
  main();
}