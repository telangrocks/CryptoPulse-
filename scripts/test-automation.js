// =============================================================================
// Test Automation Script - Production Ready
// =============================================================================
// Comprehensive test automation for CI/CD pipeline

const { spawn, exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const config = {
  testTypes: ['unit', 'integration', 'e2e', 'performance', 'security'],
  environments: ['development', 'staging', 'production'],
  coverageThresholds: {
    statements: 80,
    branches: 75,
    functions: 80,
    lines: 80
  },
  timeout: {
    unit: 30000,
    integration: 60000,
    e2e: 120000,
    performance: 300000,
    security: 60000
  },
  retries: {
    unit: 1,
    integration: 2,
    e2e: 3,
    performance: 1,
    security: 1
  }
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

// Execute command with promise
const executeCommand = (command, options = {}) => {
  return new Promise((resolve, reject) => {
    const process = spawn(command, options.args || [], {
      stdio: 'inherit',
      shell: true,
      cwd: options.cwd || process.cwd(),
      env: { ...process.env, ...options.env }
    });

    process.on('close', (code) => {
      if (code === 0) {
        resolve(code);
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });

    process.on('error', (error) => {
      reject(error);
    });
  });
};

// Run tests with retry logic
const runTestsWithRetry = async (testType, options = {}) => {
  const maxRetries = config.retries[testType] || 1;
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logInfo(`Running ${testType} tests (attempt ${attempt}/${maxRetries})`);
      
      const result = await runTestSuite(testType, options);
      logSuccess(`${testType} tests passed on attempt ${attempt}`);
      return result;
    } catch (error) {
      lastError = error;
      logWarning(`${testType} tests failed on attempt ${attempt}: ${error.message}`);
      
      if (attempt < maxRetries) {
        logInfo(`Retrying ${testType} tests in 5 seconds...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
  }

  throw lastError;
};

// Run specific test suite
const runTestSuite = async (testType, options = {}) => {
  const timeout = options.timeout || config.timeout[testType] || 30000;
  
  switch (testType) {
    case 'unit':
      return await runUnitTests(options);
    case 'integration':
      return await runIntegrationTests(options);
    case 'e2e':
      return await runE2ETests(options);
    case 'performance':
      return await runPerformanceTests(options);
    case 'security':
      return await runSecurityTests(options);
    default:
      throw new Error(`Unknown test type: ${testType}`);
  }
};

// Run unit tests
const runUnitTests = async (options = {}) => {
  const commands = [];
  
  // Backend unit tests
  commands.push({
    name: 'Backend Unit Tests',
    command: 'cd backend && npm run test:ci'
  });
  
  // Frontend unit tests
  commands.push({
    name: 'Frontend Unit Tests',
    command: 'cd frontend && npm run test:run'
  });

  const results = [];
  
  for (const cmd of commands) {
    try {
      logInfo(`Running ${cmd.name}...`);
      await executeCommand(cmd.command, { timeout: config.timeout.unit });
      results.push({ name: cmd.name, status: 'passed' });
      logSuccess(`${cmd.name} passed`);
    } catch (error) {
      results.push({ name: cmd.name, status: 'failed', error: error.message });
      logError(`${cmd.name} failed: ${error.message}`);
      throw error;
    }
  }

  return results;
};

// Run integration tests
const runIntegrationTests = async (options = {}) => {
  const commands = [];
  
  // Backend integration tests
  commands.push({
    name: 'Backend Integration Tests',
    command: 'cd backend && npm run test:integration'
  });
  
  // Frontend integration tests
  commands.push({
    name: 'Frontend Integration Tests',
    command: 'cd frontend && npm run test:integration'
  });

  const results = [];
  
  for (const cmd of commands) {
    try {
      logInfo(`Running ${cmd.name}...`);
      await executeCommand(cmd.command, { timeout: config.timeout.integration });
      results.push({ name: cmd.name, status: 'passed' });
      logSuccess(`${cmd.name} passed`);
    } catch (error) {
      results.push({ name: cmd.name, status: 'failed', error: error.message });
      logError(`${cmd.name} failed: ${error.message}`);
      throw error;
    }
  }

  return results;
};

// Run E2E tests
const runE2ETests = async (options = {}) => {
  try {
    logInfo('Running E2E tests...');
    
    // Start test environment
    await startTestEnvironment();
    
    // Run Playwright tests
    await executeCommand('npx playwright test', {
      timeout: config.timeout.e2e,
      env: {
        ...process.env,
        TEST_ENVIRONMENT: options.environment || 'staging'
      }
    });
    
    logSuccess('E2E tests passed');
    return [{ name: 'E2E Tests', status: 'passed' }];
  } catch (error) {
    logError(`E2E tests failed: ${error.message}`);
    throw error;
  } finally {
    // Cleanup test environment
    await cleanupTestEnvironment();
  }
};

// Run performance tests
const runPerformanceTests = async (options = {}) => {
  try {
    logInfo('Running performance tests...');
    
    // Run Lighthouse tests
    await executeCommand('cd frontend && npm run test:performance', {
      timeout: config.timeout.performance
    });
    
    // Run load tests
    await executeCommand('cd backend && npm run test:load', {
      timeout: config.timeout.performance
    });
    
    logSuccess('Performance tests passed');
    return [{ name: 'Performance Tests', status: 'passed' }];
  } catch (error) {
    logError(`Performance tests failed: ${error.message}`);
    throw error;
  }
};

// Run security tests
const runSecurityTests = async (options = {}) => {
  try {
    logInfo('Running security tests...');
    
    // Run security audit
    await executeCommand('node scripts/security-audit.js', {
      timeout: config.timeout.security
    });
    
    // Run dependency audit
    await executeCommand('pnpm audit --audit-level=moderate', {
      timeout: config.timeout.security
    });
    
    // Run SAST scan
    await executeCommand('node scripts/sast-scan.js', {
      timeout: config.timeout.security
    });
    
    logSuccess('Security tests passed');
    return [{ name: 'Security Tests', status: 'passed' }];
  } catch (error) {
    logError(`Security tests failed: ${error.message}`);
    throw error;
  }
};

// Generate test coverage report
const generateCoverageReport = async (options = {}) => {
  try {
    logInfo('Generating coverage report...');
    
    // Backend coverage
    await executeCommand('cd backend && npm run test:coverage');
    
    // Frontend coverage
    await executeCommand('cd frontend && npm run test:coverage');
    
    // Merge coverage reports
    await executeCommand('npx nyc merge coverage/backend coverage/frontend coverage/merged');
    
    // Generate HTML report
    await executeCommand('npx nyc report --reporter=html --report-dir=coverage/html');
    
    // Check coverage thresholds
    await checkCoverageThresholds();
    
    logSuccess('Coverage report generated');
  } catch (error) {
    logError(`Coverage report generation failed: ${error.message}`);
    throw error;
  }
};

// Check coverage thresholds
const checkCoverageThresholds = async () => {
  try {
    const coveragePath = path.join(process.cwd(), 'coverage', 'coverage-summary.json');
    const coverage = JSON.parse(await fs.readFile(coveragePath, 'utf8'));
    
    const thresholds = config.coverageThresholds;
    let failed = false;
    
    for (const [metric, threshold] of Object.entries(thresholds)) {
      const value = coverage.total[metric].pct;
      if (value < threshold) {
        logError(`${metric} coverage ${value}% is below threshold ${threshold}%`);
        failed = true;
      } else {
        logSuccess(`${metric} coverage ${value}% meets threshold ${threshold}%`);
      }
    }
    
    if (failed) {
      throw new Error('Coverage thresholds not met');
    }
  } catch (error) {
    logError(`Coverage threshold check failed: ${error.message}`);
    throw error;
  }
};

// Start test environment
const startTestEnvironment = async () => {
  try {
    logInfo('Starting test environment...');
    
    // Start backend test server
    await executeCommand('cd backend && npm run test:server:start', {
      timeout: 30000
    });
    
    // Start frontend test server
    await executeCommand('cd frontend && npm run test:server:start', {
      timeout: 30000
    });
    
    // Wait for services to be ready
    await waitForServices();
    
    logSuccess('Test environment started');
  } catch (error) {
    logError(`Failed to start test environment: ${error.message}`);
    throw error;
  }
};

// Wait for services to be ready
const waitForServices = async () => {
  const maxAttempts = 30;
  const delay = 2000;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      // Check backend health
      await executeCommand('curl -f http://localhost:1337/health');
      
      // Check frontend health
      await executeCommand('curl -f http://localhost:3000');
      
      logSuccess('Services are ready');
      return;
    } catch (error) {
      if (attempt === maxAttempts) {
        throw new Error('Services failed to start within timeout');
      }
      
      logInfo(`Waiting for services... (attempt ${attempt}/${maxAttempts})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

// Cleanup test environment
const cleanupTestEnvironment = async () => {
  try {
    logInfo('Cleaning up test environment...');
    
    // Stop test servers
    await executeCommand('cd backend && npm run test:server:stop');
    await executeCommand('cd frontend && npm run test:server:stop');
    
    // Clean up test data
    await executeCommand('node scripts/cleanup-test-data.js');
    
    logSuccess('Test environment cleaned up');
  } catch (error) {
    logWarning(`Cleanup failed: ${error.message}`);
  }
};

// Generate test report
const generateTestReport = async (results) => {
  try {
    logInfo('Generating test report...');
    
    const report = {
      timestamp: new Date().toISOString(),
      environment: process.env.TEST_ENVIRONMENT || 'development',
      results: results,
      summary: {
        total: results.length,
        passed: results.filter(r => r.status === 'passed').length,
        failed: results.filter(r => r.status === 'failed').length,
        duration: Date.now() - startTime
      }
    };
    
    // Save JSON report
    await fs.writeFile(
      path.join(process.cwd(), 'test-results.json'),
      JSON.stringify(report, null, 2)
    );
    
    // Generate HTML report
    await generateHTMLReport(report);
    
    logSuccess('Test report generated');
    return report;
  } catch (error) {
    logError(`Test report generation failed: ${error.message}`);
    throw error;
  }
};

// Generate HTML report
const generateHTMLReport = async (report) => {
  const html = `
<!DOCTYPE html>
<html>
<head>
    <title>CryptoPulse Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 5px; }
        .summary { display: flex; gap: 20px; margin: 20px 0; }
        .summary-item { background: #e9ecef; padding: 15px; border-radius: 5px; text-align: center; }
        .passed { color: #28a745; }
        .failed { color: #dc3545; }
        .test-result { margin: 10px 0; padding: 10px; border-radius: 5px; }
        .test-result.passed { background: #d4edda; border: 1px solid #c3e6cb; }
        .test-result.failed { background: #f8d7da; border: 1px solid #f5c6cb; }
    </style>
</head>
<body>
    <div class="header">
        <h1>CryptoPulse Test Report</h1>
        <p>Generated: ${report.timestamp}</p>
        <p>Environment: ${report.environment}</p>
    </div>
    
    <div class="summary">
        <div class="summary-item">
            <h3>Total</h3>
            <p>${report.summary.total}</p>
        </div>
        <div class="summary-item">
            <h3 class="passed">Passed</h3>
            <p>${report.summary.passed}</p>
        </div>
        <div class="summary-item">
            <h3 class="failed">Failed</h3>
            <p>${report.summary.failed}</p>
        </div>
        <div class="summary-item">
            <h3>Duration</h3>
            <p>${Math.round(report.summary.duration / 1000)}s</p>
        </div>
    </div>
    
    <h2>Test Results</h2>
    ${report.results.map(result => `
        <div class="test-result ${result.status}">
            <h3>${result.name}</h3>
            <p>Status: <span class="${result.status}">${result.status.toUpperCase()}</span></p>
            ${result.error ? `<p>Error: ${result.error}</p>` : ''}
        </div>
    `).join('')}
</body>
</html>`;

  await fs.writeFile(
    path.join(process.cwd(), 'test-report.html'),
    html
  );
};

// Main execution
const main = async () => {
  const startTime = Date.now();
  const args = process.argv.slice(2);
  const testTypes = args.length > 0 ? args : config.testTypes;
  const options = {
    environment: process.env.TEST_ENVIRONMENT || 'development',
    generateCoverage: process.env.GENERATE_COVERAGE === 'true',
    generateReport: process.env.GENERATE_REPORT === 'true'
  };

  logInfo('Starting test automation...');
  logInfo(`Test types: ${testTypes.join(', ')}`);
  logInfo(`Environment: ${options.environment}`);

  const results = [];

  try {
    // Run tests
    for (const testType of testTypes) {
      try {
        const result = await runTestsWithRetry(testType, options);
        results.push({ name: testType, status: 'passed', details: result });
        logSuccess(`${testType} tests completed successfully`);
      } catch (error) {
        results.push({ name: testType, status: 'failed', error: error.message });
        logError(`${testType} tests failed: ${error.message}`);
        
        // Continue with other test types unless it's a critical failure
        if (testType === 'security') {
          throw error;
        }
      }
    }

    // Generate coverage report if requested
    if (options.generateCoverage) {
      try {
        await generateCoverageReport(options);
        results.push({ name: 'Coverage Report', status: 'passed' });
      } catch (error) {
        results.push({ name: 'Coverage Report', status: 'failed', error: error.message });
        logError(`Coverage report generation failed: ${error.message}`);
      }
    }

    // Generate test report if requested
    if (options.generateReport) {
      try {
        await generateTestReport(results);
        results.push({ name: 'Test Report', status: 'passed' });
      } catch (error) {
        results.push({ name: 'Test Report', status: 'failed', error: error.message });
        logError(`Test report generation failed: ${error.message}`);
      }
    }

    // Summary
    const passed = results.filter(r => r.status === 'passed').length;
    const failed = results.filter(r => r.status === 'failed').length;
    const duration = Date.now() - startTime;

    logInfo('Test automation completed');
    logInfo(`Duration: ${Math.round(duration / 1000)}s`);
    logInfo(`Passed: ${passed}, Failed: ${failed}`);

    if (failed > 0) {
      logError('Some tests failed');
      process.exit(1);
    } else {
      logSuccess('All tests passed');
      process.exit(0);
    }

  } catch (error) {
    logError(`Test automation failed: ${error.message}`);
    process.exit(1);
  }
};

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logError(`Uncaught exception: ${error.message}`);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logError(`Unhandled rejection: ${reason}`);
  process.exit(1);
});

// Export for use as module
module.exports = {
  runTestsWithRetry,
  runTestSuite,
  generateCoverageReport,
  generateTestReport,
  config
};

// Run if called directly
if (require.main === module) {
  main();
}
