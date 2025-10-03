// =============================================================================
// Performance Testing Script - Production Ready
// =============================================================================
// Comprehensive performance testing for CryptoPulse

const { spawn, exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const { promisify } = require('util');

const execAsync = promisify(exec);

// Configuration
const config = {
  performance: {
    // Response time thresholds (ms)
    responseTime: {
      fast: 200,
      acceptable: 500,
      slow: 1000,
      verySlow: 2000
    },
    
    // Throughput thresholds (requests per second)
    throughput: {
      excellent: 1000,
      good: 500,
      acceptable: 100,
      poor: 50
    },
    
    // Memory usage thresholds (MB)
    memory: {
      excellent: 100,
      good: 200,
      acceptable: 500,
      poor: 1000
    },
    
    // CPU usage thresholds (%)
    cpu: {
      excellent: 25,
      good: 50,
      acceptable: 75,
      poor: 90
    }
  },
  
  // Test scenarios
  scenarios: [
    {
      name: 'light-load',
      description: 'Light load test with 10 concurrent users',
      users: 10,
      duration: '30s',
      rampUp: '5s'
    },
    {
      name: 'medium-load',
      description: 'Medium load test with 50 concurrent users',
      users: 50,
      duration: '60s',
      rampUp: '10s'
    },
    {
      name: 'high-load',
      description: 'High load test with 100 concurrent users',
      users: 100,
      duration: '120s',
      rampUp: '20s'
    },
    {
      name: 'stress-test',
      description: 'Stress test with 200 concurrent users',
      users: 200,
      duration: '300s',
      rampUp: '30s'
    },
    {
      name: 'spike-test',
      description: 'Spike test with sudden load increase',
      users: 150,
      duration: '60s',
      rampUp: '5s'
    }
  ],
  
  // Endpoints to test
  endpoints: [
    { path: '/', method: 'GET', weight: 30 },
    { path: '/auth', method: 'GET', weight: 20 },
    { path: '/dashboard', method: 'GET', weight: 25 },
    { path: '/trading', method: 'GET', weight: 15 },
    { path: '/api/health', method: 'GET', weight: 10 }
  ],
  
  // Performance metrics to collect
  metrics: [
    'responseTime',
    'throughput',
    'errorRate',
    'memoryUsage',
    'cpuUsage',
    'activeConnections',
    'requestsPerSecond'
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

// Performance test runner
class PerformanceTestRunner {
  constructor(options = {}) {
    this.options = { ...config, ...options };
    this.results = [];
    this.startTime = null;
  }

  // Run all performance tests
  async runAll() {
    logInfo('Starting comprehensive performance testing...');
    this.startTime = Date.now();

    try {
      // Pre-test setup
      await this.preTestSetup();

      // Run individual test scenarios
      for (const scenario of this.options.scenarios) {
        await this.runScenario(scenario);
      }

      // Post-test analysis
      await this.postTestAnalysis();

      // Generate reports
      await this.generateReports();

      logSuccess('Performance testing completed successfully');
      return this.results;

    } catch (error) {
      logError(`Performance testing failed: ${error.message}`);
      throw error;
    }
  }

  // Pre-test setup
  async preTestSetup() {
    logInfo('Setting up performance test environment...');

    // Check if application is running
    await this.checkApplicationHealth();

    // Install performance testing dependencies
    await this.installDependencies();

    // Create results directory
    await fs.mkdir('performance-results', { recursive: true });

    // Clear previous results
    await this.clearPreviousResults();

    logSuccess('Pre-test setup completed');
  }

  // Check application health
  async checkApplicationHealth() {
    try {
      const { stdout } = await execAsync('curl -f http://localhost:3000/health || curl -f http://localhost:1337/health');
      logSuccess('Application health check passed');
    } catch (error) {
      throw new Error('Application is not running or health check failed');
    }
  }

  // Install dependencies
  async installDependencies() {
    try {
      // Check if k6 is installed
      await execAsync('k6 version');
      logSuccess('k6 is already installed');
    } catch (error) {
      logWarning('k6 not found, installing...');
      // Install k6 (this would need to be adapted for different platforms)
      await execAsync('sudo apt-get update && sudo apt-get install -y k6');
    }
  }

  // Clear previous results
  async clearPreviousResults() {
    try {
      await fs.rmdir('performance-results', { recursive: true });
      await fs.mkdir('performance-results', { recursive: true });
    } catch (error) {
      // Directory might not exist, that's okay
    }
  }

  // Run individual test scenario
  async runScenario(scenario) {
    logInfo(`Running scenario: ${scenario.name}`);
    
    try {
      // Generate k6 script
      const scriptPath = await this.generateK6Script(scenario);
      
      // Run k6 test
      const result = await this.runK6Test(scriptPath, scenario);
      
      // Analyze results
      const analysis = await this.analyzeResults(result, scenario);
      
      // Store results
      this.results.push({
        scenario: scenario.name,
        description: scenario.description,
        result,
        analysis,
        timestamp: new Date().toISOString()
      });

      logSuccess(`Scenario ${scenario.name} completed`);
      
    } catch (error) {
      logError(`Scenario ${scenario.name} failed: ${error.message}`);
      this.results.push({
        scenario: scenario.name,
        description: scenario.description,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Generate k6 test script
  async generateK6Script(scenario) {
    const scriptContent = `
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('error_rate');
const responseTime = new Trend('response_time');

export const options = {
  stages: [
    { duration: '${scenario.rampUp}', target: ${scenario.users} },
    { duration: '${scenario.duration}', target: ${scenario.users} },
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.1'],
    error_rate: ['rate<0.1'],
  },
};

export default function () {
  const endpoints = ${JSON.stringify(this.options.endpoints)};
  const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
  
  const url = \`http://localhost:3000\${endpoint.path}\`;
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'k6-performance-test',
    },
  };

  const response = http.request(endpoint.method, url, null, params);
  
  // Record custom metrics
  errorRate.add(response.status >= 400);
  responseTime.add(response.timings.duration);
  
  // Check response
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
    'response time < 1000ms': (r) => r.timings.duration < 1000,
  });

  sleep(1);
}
`;

    const scriptPath = path.join('performance-results', `${scenario.name}.js`);
    await fs.writeFile(scriptPath, scriptContent);
    return scriptPath;
  }

  // Run k6 test
  async runK6Test(scriptPath, scenario) {
    logInfo(`Running k6 test for scenario: ${scenario.name}`);
    
    return new Promise((resolve, reject) => {
      const process = spawn('k6', ['run', '--out', 'json=performance-results/' + scenario.name + '.json', scriptPath], {
        stdio: 'pipe'
      });

      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          resolve({ stdout, stderr, code });
        } else {
          reject(new Error(`k6 test failed with code ${code}: ${stderr}`));
        }
      });

      process.on('error', (error) => {
        reject(error);
      });
    });
  }

  // Analyze test results
  async analyzeResults(result, scenario) {
    try {
      // Read k6 JSON output
      const jsonPath = path.join('performance-results', `${scenario.name}.json`);
      const jsonData = await fs.readFile(jsonPath, 'utf8');
      const metrics = JSON.parse(jsonData);

      // Extract key metrics
      const analysis = {
        scenario: scenario.name,
        duration: scenario.duration,
        users: scenario.users,
        metrics: {
          responseTime: this.extractResponseTimeMetrics(metrics),
          throughput: this.extractThroughputMetrics(metrics),
          errorRate: this.extractErrorRateMetrics(metrics),
          memoryUsage: this.extractMemoryMetrics(metrics),
          cpuUsage: this.extractCPUMetrics(metrics)
        },
        thresholds: this.checkThresholds(metrics),
        summary: this.generateSummary(metrics)
      };

      return analysis;

    } catch (error) {
      logWarning(`Failed to analyze results for ${scenario.name}: ${error.message}`);
      return {
        scenario: scenario.name,
        error: error.message,
        metrics: null
      };
    }
  }

  // Extract response time metrics
  extractResponseTimeMetrics(metrics) {
    const httpReqDuration = metrics.find(m => m.metric === 'http_req_duration');
    if (!httpReqDuration) return null;

    return {
      min: httpReqDuration.data.min,
      max: httpReqDuration.data.max,
      avg: httpReqDuration.data.avg,
      p50: httpReqDuration.data.med,
      p90: httpReqDuration.data['p(90)'],
      p95: httpReqDuration.data['p(95)'],
      p99: httpReqDuration.data['p(99)']
    };
  }

  // Extract throughput metrics
  extractThroughputMetrics(metrics) {
    const httpReqs = metrics.find(m => m.metric === 'http_reqs');
    const httpReqDuration = metrics.find(m => m.metric === 'http_req_duration');
    
    if (!httpReqs || !httpReqDuration) return null;

    const totalRequests = httpReqs.data.count;
    const totalDuration = httpReqDuration.data.count * (httpReqDuration.data.avg / 1000); // Convert to seconds
    
    return {
      requestsPerSecond: totalDuration > 0 ? totalRequests / totalDuration : 0,
      totalRequests: totalRequests,
      totalDuration: totalDuration
    };
  }

  // Extract error rate metrics
  extractErrorRateMetrics(metrics) {
    const httpReqFailed = metrics.find(m => m.metric === 'http_req_failed');
    if (!httpReqFailed) return null;

    return {
      rate: httpReqFailed.data.rate,
      count: httpReqFailed.data.count,
      percentage: httpReqFailed.data.rate * 100
    };
  }

  // Extract memory metrics
  extractMemoryMetrics(metrics) {
    const vusMax = metrics.find(m => m.metric === 'vus_max');
    const memUsage = metrics.find(m => m.metric === 'mem_usage');
    
    return {
      maxVirtualUsers: vusMax ? vusMax.data.max : 0,
      memoryUsage: memUsage ? memUsage.data.avg : 0
    };
  }

  // Extract CPU metrics
  extractCPUMetrics(metrics) {
    const cpuUsage = metrics.find(m => m.metric === 'cpu_usage');
    return cpuUsage ? cpuUsage.data.avg : 0;
  }

  // Check performance thresholds
  checkThresholds(metrics) {
    const thresholds = {
      responseTime: 'pass',
      throughput: 'pass',
      errorRate: 'pass',
      memory: 'pass',
      cpu: 'pass'
    };

    // Check response time
    const responseTime = this.extractResponseTimeMetrics(metrics);
    if (responseTime) {
      if (responseTime.p95 > this.options.performance.responseTime.slow) {
        thresholds.responseTime = 'fail';
      } else if (responseTime.p95 > this.options.performance.responseTime.acceptable) {
        thresholds.responseTime = 'warning';
      }
    }

    // Check throughput
    const throughput = this.extractThroughputMetrics(metrics);
    if (throughput) {
      if (throughput.requestsPerSecond < this.options.performance.throughput.poor) {
        thresholds.throughput = 'fail';
      } else if (throughput.requestsPerSecond < this.options.performance.throughput.acceptable) {
        thresholds.throughput = 'warning';
      }
    }

    // Check error rate
    const errorRate = this.extractErrorRateMetrics(metrics);
    if (errorRate && errorRate.rate > 0.05) { // 5% error rate threshold
      thresholds.errorRate = 'fail';
    }

    return thresholds;
  }

  // Generate performance summary
  generateSummary(metrics) {
    const responseTime = this.extractResponseTimeMetrics(metrics);
    const throughput = this.extractThroughputMetrics(metrics);
    const errorRate = this.extractErrorRateMetrics(metrics);

    let overallScore = 100;
    let issues = [];

    // Deduct points for poor performance
    if (responseTime && responseTime.p95 > this.options.performance.responseTime.slow) {
      overallScore -= 30;
      issues.push('High response times detected');
    }

    if (throughput && throughput.requestsPerSecond < this.options.performance.throughput.poor) {
      overallScore -= 25;
      issues.push('Low throughput detected');
    }

    if (errorRate && errorRate.rate > 0.05) {
      overallScore -= 40;
      issues.push('High error rate detected');
    }

    return {
      overallScore: Math.max(0, overallScore),
      issues,
      recommendation: this.getRecommendation(overallScore, issues)
    };
  }

  // Get performance recommendation
  getRecommendation(score, issues) {
    if (score >= 90) {
      return 'Excellent performance. No immediate action required.';
    } else if (score >= 70) {
      return 'Good performance with minor issues. Monitor and optimize as needed.';
    } else if (score >= 50) {
      return 'Acceptable performance with several issues. Optimization recommended.';
    } else {
      return 'Poor performance detected. Immediate optimization required.';
    }
  }

  // Post-test analysis
  async postTestAnalysis() {
    logInfo('Performing post-test analysis...');

    // Generate overall performance report
    const overallAnalysis = {
      totalTests: this.results.length,
      passedTests: this.results.filter(r => !r.error).length,
      failedTests: this.results.filter(r => r.error).length,
      averageScore: this.calculateAverageScore(),
      worstPerformingScenario: this.findWorstPerformingScenario(),
      bestPerformingScenario: this.findBestPerformingScenario(),
      recommendations: this.generateOverallRecommendations()
    };

    // Save overall analysis
    await fs.writeFile(
      path.join('performance-results', 'overall-analysis.json'),
      JSON.stringify(overallAnalysis, null, 2)
    );

    logSuccess('Post-test analysis completed');
    return overallAnalysis;
  }

  // Calculate average performance score
  calculateAverageScore() {
    const validResults = this.results.filter(r => r.analysis && r.analysis.summary);
    if (validResults.length === 0) return 0;

    const totalScore = validResults.reduce((sum, r) => sum + r.analysis.summary.overallScore, 0);
    return Math.round(totalScore / validResults.length);
  }

  // Find worst performing scenario
  findWorstPerformingScenario() {
    const validResults = this.results.filter(r => r.analysis && r.analysis.summary);
    if (validResults.length === 0) return null;

    return validResults.reduce((worst, current) => 
      current.analysis.summary.overallScore < worst.analysis.summary.overallScore ? current : worst
    );
  }

  // Find best performing scenario
  findBestPerformingScenario() {
    const validResults = this.results.filter(r => r.analysis && r.analysis.summary);
    if (validResults.length === 0) return null;

    return validResults.reduce((best, current) => 
      current.analysis.summary.overallScore > best.analysis.summary.overallScore ? current : best
    );
  }

  // Generate overall recommendations
  generateOverallRecommendations() {
    const recommendations = [];
    const validResults = this.results.filter(r => r.analysis && r.analysis.summary);

    // Check for common issues across scenarios
    const commonIssues = this.findCommonIssues(validResults);
    
    if (commonIssues.responseTime) {
      recommendations.push('Optimize response times across all scenarios');
    }
    
    if (commonIssues.throughput) {
      recommendations.push('Improve throughput and scalability');
    }
    
    if (commonIssues.errorRate) {
      recommendations.push('Reduce error rates and improve reliability');
    }

    if (recommendations.length === 0) {
      recommendations.push('Performance is satisfactory across all test scenarios');
    }

    return recommendations;
  }

  // Find common issues across scenarios
  findCommonIssues(results) {
    const issues = {
      responseTime: false,
      throughput: false,
      errorRate: false
    };

    results.forEach(result => {
      if (result.analysis.summary.overallScore < 70) {
        if (result.analysis.summary.issues.some(issue => issue.includes('response'))) {
          issues.responseTime = true;
        }
        if (result.analysis.summary.issues.some(issue => issue.includes('throughput'))) {
          issues.throughput = true;
        }
        if (result.analysis.summary.issues.some(issue => issue.includes('error'))) {
          issues.errorRate = true;
        }
      }
    });

    return issues;
  }

  // Generate performance reports
  async generateReports() {
    logInfo('Generating performance reports...');

    // Generate HTML report
    await this.generateHTMLReport();

    // Generate JSON report
    await this.generateJSONReport();

    // Generate Markdown report
    await this.generateMarkdownReport();

    logSuccess('Performance reports generated');
  }

  // Generate HTML report
  async generateHTMLReport() {
    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>CryptoPulse Performance Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .header { background: #2c3e50; color: white; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
        .metric { background: #ecf0f1; padding: 15px; border-radius: 5px; text-align: center; }
        .metric.pass { border-left: 4px solid #27ae60; }
        .metric.warning { border-left: 4px solid #f39c12; }
        .metric.fail { border-left: 4px solid #e74c3c; }
        .scenario { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
        .scenario h3 { margin-top: 0; color: #2c3e50; }
        .chart { margin: 20px 0; padding: 15px; background: #f8f9fa; border-radius: 5px; }
        .footer { text-align: center; margin-top: 30px; padding: 20px; border-top: 1px solid #ecf0f1; color: #7f8c8d; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>CryptoPulse Performance Test Report</h1>
            <p>Generated: ${new Date().toISOString()}</p>
        </div>
        
        <div class="summary">
            <div class="metric">
                <h3>Total Tests</h3>
                <p>${this.results.length}</p>
            </div>
            <div class="metric">
                <h3>Passed</h3>
                <p>${this.results.filter(r => !r.error).length}</p>
            </div>
            <div class="metric">
                <h3>Failed</h3>
                <p>${this.results.filter(r => r.error).length}</p>
            </div>
            <div class="metric">
                <h3>Average Score</h3>
                <p>${this.calculateAverageScore()}%</p>
            </div>
        </div>
        
        <h2>Test Scenarios</h2>
        ${this.results.map(result => `
            <div class="scenario">
                <h3>${result.scenario}</h3>
                <p>${result.description}</p>
                ${result.error ? `
                    <p style="color: red;">Error: ${result.error}</p>
                ` : `
                    <div class="summary">
                        <div class="metric ${result.analysis.thresholds.responseTime}">
                            <h4>Response Time</h4>
                            <p>${result.analysis.metrics.responseTime ? result.analysis.metrics.responseTime.p95.toFixed(2) + 'ms' : 'N/A'}</p>
                        </div>
                        <div class="metric ${result.analysis.thresholds.throughput}">
                            <h4>Throughput</h4>
                            <p>${result.analysis.metrics.throughput ? result.analysis.metrics.throughput.requestsPerSecond.toFixed(2) + ' req/s' : 'N/A'}</p>
                        </div>
                        <div class="metric ${result.analysis.thresholds.errorRate}">
                            <h4>Error Rate</h4>
                            <p>${result.analysis.metrics.errorRate ? (result.analysis.metrics.errorRate.percentage).toFixed(2) + '%' : 'N/A'}</p>
                        </div>
                        <div class="metric">
                            <h4>Score</h4>
                            <p>${result.analysis.summary.overallScore}%</p>
                        </div>
                    </div>
                    ${result.analysis.summary.issues.length > 0 ? `
                        <h4>Issues:</h4>
                        <ul>
                            ${result.analysis.summary.issues.map(issue => `<li>${issue}</li>`).join('')}
                        </ul>
                    ` : ''}
                    <p><strong>Recommendation:</strong> ${result.analysis.summary.recommendation}</p>
                `}
            </div>
        `).join('')}
        
        <div class="footer">
            <p>CryptoPulse Performance Test Report</p>
        </div>
    </div>
</body>
</html>`;

    await fs.writeFile(path.join('performance-results', 'performance-report.html'), html);
  }

  // Generate JSON report
  async generateJSONReport() {
    const report = {
      timestamp: new Date().toISOString(),
      duration: Date.now() - this.startTime,
      results: this.results,
      summary: {
        totalTests: this.results.length,
        passedTests: this.results.filter(r => !r.error).length,
        failedTests: this.results.filter(r => r.error).length,
        averageScore: this.calculateAverageScore()
      }
    };

    await fs.writeFile(
      path.join('performance-results', 'performance-report.json'),
      JSON.stringify(report, null, 2)
    );
  }

  // Generate Markdown report
  async generateMarkdownReport() {
    const markdown = `# CryptoPulse Performance Test Report

Generated: ${new Date().toISOString()}

## Summary

- **Total Tests**: ${this.results.length}
- **Passed**: ${this.results.filter(r => !r.error).length}
- **Failed**: ${this.results.filter(r => r.error).length}
- **Average Score**: ${this.calculateAverageScore()}%

## Test Scenarios

${this.results.map(result => `
### ${result.scenario}

**Description**: ${result.description}

${result.error ? `
**Status**: ❌ Failed
**Error**: ${result.error}
` : `
**Status**: ✅ Passed
**Score**: ${result.analysis.summary.overallScore}%

**Metrics**:
- Response Time (p95): ${result.analysis.metrics.responseTime ? result.analysis.metrics.responseTime.p95.toFixed(2) + 'ms' : 'N/A'}
- Throughput: ${result.analysis.metrics.throughput ? result.analysis.metrics.throughput.requestsPerSecond.toFixed(2) + ' req/s' : 'N/A'}
- Error Rate: ${result.analysis.metrics.errorRate ? (result.analysis.metrics.errorRate.percentage).toFixed(2) + '%' : 'N/A'}

**Issues**:
${result.analysis.summary.issues.length > 0 ? result.analysis.summary.issues.map(issue => `- ${issue}`).join('\n') : '- None'}

**Recommendation**: ${result.analysis.summary.recommendation}
`}
`).join('\n')}

## Overall Analysis

- **Worst Performing Scenario**: ${this.findWorstPerformingScenario()?.scenario || 'N/A'}
- **Best Performing Scenario**: ${this.findBestPerformingScenario()?.scenario || 'N/A'}

## Recommendations

${this.generateOverallRecommendations().map(rec => `- ${rec}`).join('\n')}
`;

    await fs.writeFile(path.join('performance-results', 'performance-report.md'), markdown);
  }
}

// Main execution
const main = async () => {
  const args = process.argv.slice(2);
  const options = {};

  // Parse command line arguments
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace('--', '');
    const value = args[i + 1];
    options[key] = value;
  }

  try {
    const runner = new PerformanceTestRunner(options);
    const results = await runner.runAll();
    
    logInfo('Performance testing completed successfully');
    logInfo(`Results saved to: performance-results/`);
    
  } catch (error) {
    logError(`Performance testing failed: ${error.message}`);
    process.exit(1);
  }
};

// Export for use as module
module.exports = {
  PerformanceTestRunner,
  config
};

// Run if called directly
if (require.main === module) {
  main();
}
