/**
 * Performance and Load Testing Suite
 * Comprehensive testing for performance optimization
 */

const axios = require('axios');
const { performance } = require('perf_hooks');

class LoadTestSuite {
  constructor(config = {}) {
    this.config = {
      baseUrl: config.baseUrl || 'http://localhost:3000',
      concurrency: config.concurrency || 10,
      duration: config.duration || 60, // seconds
      rampUpTime: config.rampUpTime || 10, // seconds
      ...config
    };
    
    this.results = {
      requests: {
        total: 0,
        successful: 0,
        failed: 0,
        timeouts: 0
      },
      responseTimes: {
        min: Infinity,
        max: 0,
        average: 0,
        p50: 0,
        p90: 0,
        p95: 0,
        p99: 0
      },
      throughput: {
        requestsPerSecond: 0,
        bytesPerSecond: 0
      },
      errors: [],
      startTime: 0,
      endTime: 0
    };
  }

  // Generate load with increasing concurrency
  async generateLoad(testFunction, options = {}) {
    const { 
      concurrency = this.config.concurrency,
      duration = this.config.duration,
      rampUpTime = this.config.rampUpTime 
    } = options;

    this.results.startTime = performance.now();
    const endTime = this.results.startTime + (duration * 1000);

    console.log(`🚀 Starting load test with ${concurrency} concurrent users for ${duration} seconds`);
    console.log(`📈 Ramp-up time: ${rampUpTime} seconds`);

    // Ramp up concurrency gradually
    const rampUpSteps = Math.ceil(rampUpTime);
    const rampUpDelay = (rampUpTime * 1000) / rampUpSteps;
    const concurrencyPerStep = Math.ceil(concurrency / rampUpSteps);

    let currentConcurrency = 0;
    const activeWorkers = [];

    // Ramp up phase
    for (let step = 0; step < rampUpSteps; step++) {
      currentConcurrency += concurrencyPerStep;
      const actualConcurrency = Math.min(currentConcurrency, concurrency);

      console.log(`📊 Ramping up to ${actualConcurrency} concurrent users`);

      // Start workers for this step
      for (let i = 0; i < concurrencyPerStep && currentConcurrency <= concurrency; i++) {
        const worker = this.startWorker(testFunction, endTime);
        activeWorkers.push(worker);
      }

      // Wait for ramp-up delay
      await this.sleep(rampUpDelay);
    }

    // Wait for all workers to complete
    await Promise.all(activeWorkers);

    this.results.endTime = performance.now();
    this.calculateStatistics();

    return this.results;
  }

  // Start a worker that executes test function until end time
  async startWorker(testFunction, endTime) {
    const workerResults = {
      requests: 0,
      successful: 0,
      failed: 0,
      timeouts: 0,
      responseTimes: []
    };

    while (performance.now() < endTime) {
      try {
        const startTime = performance.now();
        
        await testFunction();
        
        const responseTime = performance.now() - startTime;
        
        workerResults.requests++;
        workerResults.successful++;
        workerResults.responseTimes.push(responseTime);

        // Aggregate results
        this.results.requests.total++;
        this.results.requests.successful++;
        
      } catch (error) {
        workerResults.requests++;
        workerResults.failed++;
        this.results.requests.total++;
        this.results.requests.failed++;

        if (error.code === 'ECONNABORTED') {
          workerResults.timeouts++;
          this.results.requests.timeouts++;
        }

        this.results.errors.push({
          message: error.message,
          timestamp: new Date().toISOString()
        });
      }

      // Small delay to prevent overwhelming the system
      await this.sleep(10);
    }

    // Merge worker response times
    this.results.responseTimes = this.results.responseTimes.concat(workerResults.responseTimes);

    return workerResults;
  }

  // Calculate performance statistics
  calculateStatistics() {
    const { responseTimes, requests, startTime, endTime } = this.results;
    
    if (responseTimes.length === 0) return;

    // Sort response times for percentile calculations
    responseTimes.sort((a, b) => a - b);

    // Calculate response time statistics
    this.results.responseTimes.min = Math.min(...responseTimes);
    this.results.responseTimes.max = Math.max(...responseTimes);
    this.results.responseTimes.average = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    this.results.responseTimes.p50 = this.percentile(responseTimes, 50);
    this.results.responseTimes.p90 = this.percentile(responseTimes, 90);
    this.results.responseTimes.p95 = this.percentile(responseTimes, 95);
    this.results.responseTimes.p99 = this.percentile(responseTimes, 99);

    // Calculate throughput
    const duration = (endTime - startTime) / 1000; // seconds
    this.results.throughput.requestsPerSecond = requests.total / duration;
  }

  // Calculate percentile
  percentile(sortedArray, percentile) {
    const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
    return sortedArray[index];
  }

  // Sleep utility
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Print results
  printResults() {
    console.log('\n📊 Load Test Results');
    console.log('='.repeat(50));
    
    console.log(`Total Requests: ${this.results.requests.total}`);
    console.log(`Successful: ${this.results.requests.successful}`);
    console.log(`Failed: ${this.results.requests.failed}`);
    console.log(`Timeouts: ${this.results.requests.timeouts}`);
    
    const successRate = (this.results.requests.successful / this.results.requests.total) * 100;
    console.log(`Success Rate: ${successRate.toFixed(2)}%`);
    
    console.log('\n⏱️  Response Times (ms):');
    console.log(`Min: ${this.results.responseTimes.min.toFixed(2)}`);
    console.log(`Max: ${this.results.responseTimes.max.toFixed(2)}`);
    console.log(`Average: ${this.results.responseTimes.average.toFixed(2)}`);
    console.log(`P50: ${this.results.responseTimes.p50.toFixed(2)}`);
    console.log(`P90: ${this.results.responseTimes.p90.toFixed(2)}`);
    console.log(`P95: ${this.results.responseTimes.p95.toFixed(2)}`);
    console.log(`P99: ${this.results.responseTimes.p99.toFixed(2)}`);
    
    console.log('\n🚀 Throughput:');
    console.log(`Requests/sec: ${this.results.throughput.requestsPerSecond.toFixed(2)}`);
    
    if (this.results.errors.length > 0) {
      console.log('\n❌ Errors:');
      this.results.errors.slice(0, 10).forEach((error, index) => {
        console.log(`${index + 1}. ${error.message}`);
      });
      if (this.results.errors.length > 10) {
        console.log(`... and ${this.results.errors.length - 10} more errors`);
      }
    }
  }
}

// Specific load tests
class CryptoPulseLoadTests extends LoadTestSuite {
  constructor(config = {}) {
    super(config);
    this.testUser = {
      email: 'loadtest@example.com',
      password: 'LoadTestPassword123!'
    };
  }

  // Health check load test
  async healthCheckLoadTest() {
    console.log('\n🏥 Health Check Load Test');
    
    const testFunction = async () => {
      const response = await axios.get(`${this.config.baseUrl}/health`, {
        timeout: 5000
      });
      
      if (response.status !== 200) {
        throw new Error(`Health check failed with status ${response.status}`);
      }
    };

    return await this.generateLoad(testFunction, {
      concurrency: 50,
      duration: 30,
      rampUpTime: 5
    });
  }

  // API endpoint load test
  async apiLoadTest() {
    console.log('\n🔗 API Endpoint Load Test');
    
    const testFunction = async () => {
      // Test various API endpoints
      const endpoints = [
        '/api/trading/status',
        '/api/market/data?symbols=BTC/USDT',
        '/api/user/profile'
      ];
      
      const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
      const response = await axios.get(`${this.config.baseUrl}${endpoint}`, {
        timeout: 5000,
        headers: {
          'Authorization': 'Bearer test-token'
        }
      });
      
      if (response.status >= 400) {
        throw new Error(`API request failed with status ${response.status}`);
      }
    };

    return await this.generateLoad(testFunction, {
      concurrency: 20,
      duration: 60,
      rampUpTime: 10
    });
  }

  // Authentication load test
  async authLoadTest() {
    console.log('\n🔐 Authentication Load Test');
    
    const testFunction = async () => {
      const response = await axios.post(`${this.config.baseUrl}/api/auth/login`, {
        email: this.testUser.email,
        password: this.testUser.password
      }, {
        timeout: 5000
      });
      
      if (response.status !== 200) {
        throw new Error(`Authentication failed with status ${response.status}`);
      }
    };

    return await this.generateLoad(testFunction, {
      concurrency: 10,
      duration: 30,
      rampUpTime: 5
    });
  }

  // Trading operations load test
  async tradingLoadTest() {
    console.log('\n📈 Trading Operations Load Test');
    
    const testFunction = async () => {
      // Simulate trading operations
      const operations = [
        // Get trading status
        () => axios.get(`${this.config.baseUrl}/api/trading/status`, { timeout: 5000 }),
        // Get market data
        () => axios.get(`${this.config.baseUrl}/api/market/data?symbols=BTC/USDT`, { timeout: 5000 }),
        // Get order history
        () => axios.get(`${this.config.baseUrl}/api/trading/orders?limit=10`, { timeout: 5000 })
      ];
      
      const operation = operations[Math.floor(Math.random() * operations.length)];
      const response = await operation();
      
      if (response.status >= 400) {
        throw new Error(`Trading operation failed with status ${response.status}`);
      }
    };

    return await this.generateLoad(testFunction, {
      concurrency: 15,
      duration: 45,
      rampUpTime: 10
    });
  }

  // Database load test
  async databaseLoadTest() {
    console.log('\n🗄️ Database Load Test');
    
    const testFunction = async () => {
      // Test database-heavy operations
      const response = await axios.get(`${this.config.baseUrl}/api/trading/orders?limit=100&offset=${Math.floor(Math.random() * 1000)}`, {
        timeout: 10000
      });
      
      if (response.status >= 400) {
        throw new Error(`Database operation failed with status ${response.status}`);
      }
    };

    return await this.generateLoad(testFunction, {
      concurrency: 25,
      duration: 60,
      rampUpTime: 15
    });
  }

  // Memory leak test
  async memoryLeakTest() {
    console.log('\n🧠 Memory Leak Test');
    
    const testFunction = async () => {
      // Perform operations that might cause memory leaks
      const response = await axios.get(`${this.config.baseUrl}/api/monitoring/dashboard`, {
        timeout: 5000
      });
      
      if (response.status >= 400) {
        throw new Error(`Memory leak test failed with status ${response.status}`);
      }
    };

    return await this.generateLoad(testFunction, {
      concurrency: 30,
      duration: 120, // 2 minutes
      rampUpTime: 20
    });
  }

  // Stress test
  async stressTest() {
    console.log('\n💥 Stress Test');
    
    const testFunction = async () => {
      // Gradually increase load to find breaking point
      const response = await axios.get(`${this.config.baseUrl}/health`, {
        timeout: 2000
      });
      
      if (response.status >= 400) {
        throw new Error(`Stress test failed with status ${response.status}`);
      }
    };

    return await this.generateLoad(testFunction, {
      concurrency: 100,
      duration: 30,
      rampUpTime: 5
    });
  }

  // Run all load tests
  async runAllLoadTests() {
    console.log('🚀 Starting Comprehensive Load Testing Suite');
    console.log(`Base URL: ${this.config.baseUrl}`);
    console.log('='.repeat(60));

    const tests = [
      { name: 'Health Check', test: () => this.healthCheckLoadTest() },
      { name: 'API Endpoints', test: () => this.apiLoadTest() },
      { name: 'Authentication', test: () => this.authLoadTest() },
      { name: 'Trading Operations', test: () => this.tradingLoadTest() },
      { name: 'Database Operations', test: () => this.databaseLoadTest() },
      { name: 'Memory Leak', test: () => this.memoryLeakTest() },
      { name: 'Stress Test', test: () => this.stressTest() }
    ];

    const results = {};

    for (const { name, test } of tests) {
      try {
        console.log(`\n🧪 Running ${name} Test...`);
        results[name] = await test();
        this.printResults();
        
        // Wait between tests
        await this.sleep(5000);
      } catch (error) {
        console.error(`❌ ${name} test failed:`, error.message);
        results[name] = { error: error.message };
      }
    }

    return results;
  }
}

// CLI interface
async function main() {
  const baseUrl = process.argv[2] || 'http://localhost:3000';
  const loadTests = new CryptoPulseLoadTests({ baseUrl });
  
  try {
    await loadTests.runAllLoadTests();
    console.log('\n✅ Load testing completed successfully');
  } catch (error) {
    console.error('❌ Load testing failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { LoadTestSuite, CryptoPulseLoadTests };
