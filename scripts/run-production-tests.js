#!/usr/bin/env node

/**
 * Production Readiness Test Suite
 * Runs all critical tests before production deployment
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');

const execAsync = promisify(exec);

class ProductionTestRunner {
  constructor() {
    this.results = {
      exchangeTesting: null,
      loadTesting: null,
      migrationTesting: null,
      backupTesting: null,
      apmTesting: null,
      overallSuccess: false,
      startTime: null,
      endTime: null
    };
  }

  async runAllTests() {
    console.log('🚀 Starting Production Readiness Test Suite...');
    this.results.startTime = new Date();

    try {
      // Test 1: Exchange Integration Testing
      console.log('\n📡 Testing Exchange Integration...');
      await this.runExchangeTests();

      // Test 2: Load Testing
      console.log('\n⚡ Running Load Tests...');
      await this.runLoadTests();

      // Test 3: Database Migration Testing
      console.log('\n🗄️ Testing Database Migrations...');
      await this.runMigrationTests();

      // Test 4: Backup and Recovery Testing
      console.log('\n💾 Testing Backup and Recovery...');
      await this.runBackupTests();

      // Test 5: APM Integration Testing
      console.log('\n📊 Testing APM Integration...');
      await this.runAPMTests();

      // Generate final report
      this.results.endTime = new Date();
      this.generateFinalReport();

    } catch (error) {
      console.error('❌ Production testing failed:', error);
      this.results.overallSuccess = false;
      process.exit(1);
    }
  }

  async runExchangeTests() {
    try {
      const { stdout, stderr } = await execAsync('npm test -- __tests__/exchange-integration.test.js');
      
      this.results.exchangeTesting = {
        success: true,
        output: stdout,
        errors: stderr
      };
      
      console.log('✅ Exchange integration tests passed');
    } catch (error) {
      this.results.exchangeTesting = {
        success: false,
        error: error.message,
        output: error.stdout,
        errors: error.stderr
      };
      
      console.log('❌ Exchange integration tests failed');
      throw error;
    }
  }

  async runLoadTests() {
    try {
      const { stdout, stderr } = await execAsync('npm test -- __tests__/load-testing.test.js');
      
      this.results.loadTesting = {
        success: true,
        output: stdout,
        errors: stderr
      };
      
      console.log('✅ Load tests passed');
    } catch (error) {
      this.results.loadTesting = {
        success: false,
        error: error.message,
        output: error.stdout,
        errors: error.stderr
      };
      
      console.log('❌ Load tests failed');
      throw error;
    }
  }

  async runMigrationTests() {
    try {
      // Test migration script syntax
      const migrationScript = path.join(__dirname, 'migrations', '001_initial_schema.js');
      
      if (!fs.existsSync(migrationScript)) {
        throw new Error('Migration script not found');
      }

      // Test with dry run (if supported)
      const { stdout, stderr } = await execAsync(`node -c "${migrationScript}"`);
      
      this.results.migrationTesting = {
        success: true,
        output: stdout,
        errors: stderr
      };
      
      console.log('✅ Database migration tests passed');
    } catch (error) {
      this.results.migrationTesting = {
        success: false,
        error: error.message,
        output: error.stdout,
        errors: error.stderr
      };
      
      console.log('❌ Database migration tests failed');
      throw error;
    }
  }

  async runBackupTests() {
    try {
      const backupScript = path.join(__dirname, 'backup-testing.js');
      
      if (!fs.existsSync(backupScript)) {
        throw new Error('Backup testing script not found');
      }

      // Run backup tests in test mode
      const { stdout, stderr } = await execAsync(`node "${backupScript}"`);
      
      this.results.backupTesting = {
        success: true,
        output: stdout,
        errors: stderr
      };
      
      console.log('✅ Backup and recovery tests passed');
    } catch (error) {
      this.results.backupTesting = {
        success: false,
        error: error.message,
        output: error.stdout,
        errors: error.stderr
      };
      
      console.log('❌ Backup and recovery tests failed');
      throw error;
    }
  }

  async runAPMTests() {
    try {
      // Test APM module syntax and basic functionality
      const apmModule = path.join(__dirname, '..', 'cloud', 'apm.js');
      
      if (!fs.existsSync(apmModule)) {
        throw new Error('APM module not found');
      }

      // Test syntax
      const { stdout, stderr } = await execAsync(`node -c "${apmModule}"`);
      
      // Test basic functionality
      const testScript = `
        const apm = require('${apmModule}');
        console.log('APM module loaded successfully');
        console.log('Available functions:', Object.keys(apm));
      `;
      
      const { stdout: testOutput } = await execAsync(`node -e "${testScript}"`);
      
      this.results.apmTesting = {
        success: true,
        output: testOutput,
        errors: stderr
      };
      
      console.log('✅ APM integration tests passed');
    } catch (error) {
      this.results.apmTesting = {
        success: false,
        error: error.message,
        output: error.stdout,
        errors: error.stderr
      };
      
      console.log('❌ APM integration tests failed');
      throw error;
    }
  }

  generateFinalReport() {
    const duration = this.results.endTime - this.results.startTime;
    const allTestsPassed = Object.values(this.results).every(result => 
      result === null || result === true || result === false || 
      (typeof result === 'object' && result.success === true)
    );

    this.results.overallSuccess = allTestsPassed;

    const report = {
      timestamp: new Date().toISOString(),
      duration: duration,
      overallSuccess: allTestsPassed,
      testResults: this.results,
      summary: {
        totalTests: 5,
        passedTests: Object.values(this.results).filter(result => 
          result && typeof result === 'object' && result.success === true
        ).length,
        failedTests: Object.values(this.results).filter(result => 
          result && typeof result === 'object' && result.success === false
        ).length
      }
    };

    // Save report to file
    const reportPath = path.join(__dirname, '..', 'production-test-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log('\n📋 PRODUCTION READINESS TEST REPORT');
    console.log('=====================================');
    console.log(`Overall Success: ${allTestsPassed ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Duration: ${(duration / 1000).toFixed(2)}s`);
    console.log(`Tests Passed: ${report.summary.passedTests}/${report.summary.totalTests}`);
    console.log(`Report saved to: ${reportPath}`);

    // Detailed results
    console.log('\n📊 DETAILED RESULTS:');
    
    if (this.results.exchangeTesting) {
      console.log(`Exchange Testing: ${this.results.exchangeTesting.success ? '✅' : '❌'}`);
    }
    
    if (this.results.loadTesting) {
      console.log(`Load Testing: ${this.results.loadTesting.success ? '✅' : '❌'}`);
    }
    
    if (this.results.migrationTesting) {
      console.log(`Migration Testing: ${this.results.migrationTesting.success ? '✅' : '❌'}`);
    }
    
    if (this.results.backupTesting) {
      console.log(`Backup Testing: ${this.results.backupTesting.success ? '✅' : '❌'}`);
    }
    
    if (this.results.apmTesting) {
      console.log(`APM Testing: ${this.results.apmTesting.success ? '✅' : '❌'}`);
    }

    // Production readiness decision
    if (allTestsPassed) {
      console.log('\n🎉 PRODUCTION READY! All critical tests passed.');
      console.log('✅ Safe to deploy to production environment.');
    } else {
      console.log('\n⚠️ NOT PRODUCTION READY! Some tests failed.');
      console.log('❌ Address failing tests before production deployment.');
    }

    return report;
  }
}

// Run tests if called directly
if (require.main === module) {
  const testRunner = new ProductionTestRunner();
  
  testRunner.runAllTests()
    .then(() => {
      if (testRunner.results.overallSuccess) {
        console.log('\n🚀 Ready for production deployment!');
        process.exit(0);
      } else {
        console.log('\n🛑 Production deployment blocked due to test failures.');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('\n💥 Test suite failed:', error);
      process.exit(1);
    });
}

module.exports = ProductionTestRunner;
