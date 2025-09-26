/**
 * Backup and Recovery Testing Suite
 * Tests backup creation, restoration, and data integrity
 */

const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

class BackupTestingSuite {
  constructor(config) {
    this.config = {
      mongodbUri: config.mongodbUri || process.env.MONGODB_URI,
      backupDir: config.backupDir || './backups',
      testDataSize: config.testDataSize || 1000,
      ...config
    };
    this.client = null;
    this.db = null;
    this.testResults = {
      backupCreation: null,
      dataIntegrity: null,
      restoration: null,
      performance: null
    };
  }

  async connect() {
    this.client = new MongoClient(this.config.mongodbUri);
    await this.client.connect();
    this.db = this.client.db('cryptopulse');
  }

  async disconnect() {
    if (this.client) {
      await this.client.close();
    }
  }

  async runFullBackupTest() {
    console.log('🚀 Starting comprehensive backup and recovery testing...');
    
    try {
      await this.connect();
      
      // Step 1: Create test data
      console.log('📊 Creating test data...');
      await this.createTestData();
      
      // Step 2: Test backup creation
      console.log('💾 Testing backup creation...');
      await this.testBackupCreation();
      
      // Step 3: Test data integrity
      console.log('🔍 Testing data integrity...');
      await this.testDataIntegrity();
      
      // Step 4: Test restoration
      console.log('🔄 Testing data restoration...');
      await this.testDataRestoration();
      
      // Step 5: Test performance
      console.log('⚡ Testing backup performance...');
      await this.testBackupPerformance();
      
      // Step 6: Generate report
      console.log('📋 Generating test report...');
      this.generateTestReport();
      
      console.log('✅ Backup and recovery testing completed successfully!');
      
    } catch (error) {
      console.error('❌ Backup testing failed:', error);
      throw error;
    } finally {
      await this.disconnect();
    }
  }

  async createTestData() {
    const collections = [
      'User', 'TradingBot', 'Portfolio', 'Transaction', 
      'Order', 'MarketData', 'TradingSignal', 'RiskAssessment', 'AuditLog'
    ];

    for (const collectionName of collections) {
      const collection = this.db.collection(collectionName);
      
      // Clear existing test data
      await collection.deleteMany({ isTestData: true });
      
      // Generate test data based on collection type
      const testData = this.generateTestDataForCollection(collectionName);
      
      if (testData.length > 0) {
        await collection.insertMany(testData);
        console.log(`✓ Created ${testData.length} test records for ${collectionName}`);
      }
    }
  }

  generateTestDataForCollection(collectionName) {
    const testData = [];
    const count = this.config.testDataSize;

    for (let i = 0; i < count; i++) {
      const baseRecord = {
        isTestData: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      switch (collectionName) {
        case 'User':
          testData.push({
            ...baseRecord,
            email: `testuser${i}@example.com`,
            username: `testuser${i}`,
            isActive: true,
            subscriptionStatus: i % 4 === 0 ? 'trial' : 'active',
            trialEndDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
            lastLoginAt: new Date()
          });
          break;

        case 'TradingBot':
          testData.push({
            ...baseRecord,
            userId: new ObjectId(),
            name: `Test Bot ${i}`,
            strategy: ['AI_POWERED', 'MOMENTUM', 'MEAN_REVERSION'][i % 3],
            isActive: i % 2 === 0,
            settings: {
              riskLevel: 'medium',
              maxPositionSize: 0.1,
              stopLoss: 0.02
            },
            lastRunAt: new Date()
          });
          break;

        case 'Portfolio':
          testData.push({
            ...baseRecord,
            userId: new ObjectId(),
            totalValue: Math.random() * 10000,
            availableBalance: Math.random() * 5000,
            investedAmount: Math.random() * 5000,
            totalPnL: (Math.random() - 0.5) * 1000,
            dailyPnL: (Math.random() - 0.5) * 100,
            positions: []
          });
          break;

        case 'Transaction':
          testData.push({
            ...baseRecord,
            userId: new ObjectId(),
            type: ['deposit', 'withdrawal', 'trade', 'fee'][i % 4],
            amount: Math.random() * 1000,
            currency: 'USDT',
            status: ['pending', 'completed', 'failed'][i % 3],
            description: `Test transaction ${i}`,
            metadata: { test: true }
          });
          break;

        case 'Order':
          testData.push({
            ...baseRecord,
            userId: new ObjectId(),
            pair: ['BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'ADA/USDT'][i % 4],
            action: ['BUY', 'SELL'][i % 2],
            amount: Math.random() * 10,
            price: Math.random() * 50000,
            orderValue: Math.random() * 1000,
            fees: Math.random() * 10,
            totalCost: Math.random() * 1010,
            strategy: 'AI_POWERED',
            status: ['pending', 'executed', 'failed'][i % 3],
            confidence: Math.random(),
            riskLevel: ['low', 'medium', 'high'][i % 3],
            stopLoss: Math.random() * 1000,
            takeProfit: Math.random() * 2000,
            analysis: { test: true },
            signals: { test: true },
            exchangeOrderId: `test_order_${i}`,
            exchangeUsed: 'binance',
            executedAt: i % 3 === 0 ? new Date() : null
          });
          break;

        case 'MarketData':
          testData.push({
            ...baseRecord,
            pair: ['BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'ADA/USDT'][i % 4],
            price: Math.random() * 50000,
            volume: Math.random() * 1000000,
            high: Math.random() * 55000,
            low: Math.random() * 45000,
            open: Math.random() * 50000,
            close: Math.random() * 50000,
            change: (Math.random() - 0.5) * 1000,
            changePercent: (Math.random() - 0.5) * 10,
            timestamp: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000),
            timeframe: ['1m', '5m', '15m', '1h', '4h', '1d'][i % 6],
            source: 'binance'
          });
          break;

        case 'TradingSignal':
          testData.push({
            ...baseRecord,
            pair: ['BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'ADA/USDT'][i % 4],
            action: ['BUY', 'SELL', 'HOLD'][i % 3],
            confidence: Math.random(),
            strength: ['weak', 'medium', 'strong'][i % 3],
            timeframe: ['1m', '5m', '15m', '1h', '4h', '1d'][i % 6],
            strategy: 'AI_POWERED',
            indicators: { rsi: Math.random() * 100, macd: Math.random() * 10 },
            price: Math.random() * 50000,
            stopLoss: Math.random() * 1000,
            takeProfit: Math.random() * 2000,
            riskLevel: ['low', 'medium', 'high'][i % 3],
            timestamp: new Date(Date.now() - Math.random() * 60 * 60 * 1000),
            processed: i % 2 === 0,
            processedAt: i % 2 === 0 ? new Date() : null
          });
          break;

        case 'RiskAssessment':
          testData.push({
            ...baseRecord,
            userId: new ObjectId(),
            riskScore: Math.random() * 100,
            riskLevel: ['low', 'medium', 'high', 'critical'][i % 4],
            factors: ['market_volatility', 'position_size', 'leverage'][i % 3],
            recommendations: ['reduce_position', 'increase_stop_loss', 'monitor_closely'][i % 3],
            timestamp: new Date(),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
          });
          break;

        case 'AuditLog':
          testData.push({
            ...baseRecord,
            userId: new ObjectId(),
            action: ['login', 'trade', 'withdraw', 'deposit'][i % 4],
            resource: 'trading',
            details: { test: true },
            ipAddress: `192.168.1.${i % 255}`,
            userAgent: 'Mozilla/5.0 (Test Browser)',
            timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
            severity: ['low', 'medium', 'high', 'critical'][i % 4]
          });
          break;
      }
    }

    return testData;
  }

  async testBackupCreation() {
    const startTime = Date.now();
    
    try {
      // Ensure backup directory exists
      if (!fs.existsSync(this.config.backupDir)) {
        fs.mkdirSync(this.config.backupDir, { recursive: true });
      }

      const backupPath = path.join(this.config.backupDir, `backup_${Date.now()}.json`);
      
      // Create backup using mongodump
      const dumpCommand = `mongodump --uri="${this.config.mongodbUri}" --out="${this.config.backupDir}/mongodump_${Date.now()}"`;
      const { stdout, stderr } = await execAsync(dumpCommand);
      
      if (stderr && !stderr.includes('done dumping')) {
        throw new Error(`Mongodump failed: ${stderr}`);
      }

      // Also create JSON backup for testing
      const collections = await this.db.listCollections().toArray();
      const backupData = {};

      for (const collection of collections) {
        const data = await this.db.collection(collection.name).find({}).toArray();
        backupData[collection.name] = data;
      }

      fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));

      const endTime = Date.now();
      const duration = endTime - startTime;

      this.testResults.backupCreation = {
        success: true,
        duration,
        backupSize: fs.statSync(backupPath).size,
        collections: collections.length,
        records: Object.values(backupData).reduce((sum, arr) => sum + arr.length, 0)
      };

      console.log(`✓ Backup created successfully in ${duration}ms`);
      console.log(`  - Size: ${(this.testResults.backupCreation.backupSize / 1024 / 1024).toFixed(2)} MB`);
      console.log(`  - Collections: ${this.testResults.backupCreation.collections}`);
      console.log(`  - Records: ${this.testResults.backupCreation.records}`);

    } catch (error) {
      this.testResults.backupCreation = {
        success: false,
        error: error.message
      };
      throw error;
    }
  }

  async testDataIntegrity() {
    const startTime = Date.now();
    
    try {
      const collections = await this.db.listCollections().toArray();
      const integrityResults = {};

      for (const collection of collections) {
        const coll = this.db.collection(collection.name);
        
        // Test 1: Count records
        const count = await coll.countDocuments();
        
        // Test 2: Check for required fields
        const sample = await coll.findOne({});
        const hasRequiredFields = sample ? Object.keys(sample).length > 0 : false;
        
        // Test 3: Check data types
        const typeErrors = await this.checkDataTypes(coll);
        
        // Test 4: Check indexes
        const indexes = await coll.indexes();
        const hasProperIndexes = indexes.length > 1; // More than just _id index

        integrityResults[collection.name] = {
          recordCount: count,
          hasRequiredFields,
          typeErrors: typeErrors.length,
          hasProperIndexes,
          healthScore: this.calculateHealthScore(count, hasRequiredFields, typeErrors.length, hasProperIndexes)
        };
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      this.testResults.dataIntegrity = {
        success: true,
        duration,
        collections: integrityResults,
        overallHealthScore: Object.values(integrityResults).reduce((sum, result) => sum + result.healthScore, 0) / Object.keys(integrityResults).length
      };

      console.log(`✓ Data integrity check completed in ${duration}ms`);
      console.log(`  - Overall health score: ${this.testResults.dataIntegrity.overallHealthScore.toFixed(2)}/100`);

    } catch (error) {
      this.testResults.dataIntegrity = {
        success: false,
        error: error.message
      };
      throw error;
    }
  }

  async checkDataTypes(collection) {
    const errors = [];
    const sample = await collection.findOne({});
    
    if (!sample) return errors;

    // Basic type checking for common fields
    const typeChecks = {
      createdAt: 'date',
      updatedAt: 'date',
      email: 'string',
      username: 'string',
      amount: 'number',
      price: 'number'
    };

    for (const [field, expectedType] of Object.entries(typeChecks)) {
      if (sample[field] !== undefined) {
        const actualType = typeof sample[field];
        if (actualType !== expectedType) {
          errors.push(`Field ${field} expected ${expectedType}, got ${actualType}`);
        }
      }
    }

    return errors;
  }

  calculateHealthScore(count, hasRequiredFields, typeErrors, hasProperIndexes) {
    let score = 0;
    
    if (count > 0) score += 25;
    if (hasRequiredFields) score += 25;
    if (typeErrors === 0) score += 25;
    if (hasProperIndexes) score += 25;
    
    return score;
  }

  async testDataRestoration() {
    const startTime = Date.now();
    
    try {
      // Create a test database for restoration
      const testDbName = `cryptopulse_test_restore_${Date.now()}`;
      const testClient = new MongoClient(this.config.mongodbUri.replace('/cryptopulse', `/${testDbName}`));
      await testClient.connect();
      const testDb = testClient.db(testDbName);

      // Find the most recent backup
      const backupFiles = fs.readdirSync(this.config.backupDir)
        .filter(file => file.endsWith('.json'))
        .sort()
        .reverse();

      if (backupFiles.length === 0) {
        throw new Error('No backup files found for restoration test');
      }

      const latestBackup = path.join(this.config.backupDir, backupFiles[0]);
      const backupData = JSON.parse(fs.readFileSync(latestBackup, 'utf8'));

      // Restore data to test database
      for (const [collectionName, data] of Object.entries(backupData)) {
        if (data.length > 0) {
          await testDb.collection(collectionName).insertMany(data);
        }
      }

      // Verify restoration
      const restoredCollections = await testDb.listCollections().toArray();
      const verificationResults = {};

      for (const collection of restoredCollections) {
        const originalCount = backupData[collection.name]?.length || 0;
        const restoredCount = await testDb.collection(collection.name).countDocuments();
        
        verificationResults[collection.name] = {
          originalCount,
          restoredCount,
          match: originalCount === restoredCount
        };
      }

      // Clean up test database
      await testClient.close();
      await execAsync(`mongo ${this.config.mongodbUri.replace('/cryptopulse', `/${testDbName}`)} --eval "db.dropDatabase()"`);

      const endTime = Date.now();
      const duration = endTime - startTime;

      this.testResults.restoration = {
        success: true,
        duration,
        collections: verificationResults,
        allCollectionsMatch: Object.values(verificationResults).every(result => result.match)
      };

      console.log(`✓ Data restoration test completed in ${duration}ms`);
      console.log(`  - All collections match: ${this.testResults.restoration.allCollectionsMatch}`);

    } catch (error) {
      this.testResults.restoration = {
        success: false,
        error: error.message
      };
      throw error;
    }
  }

  async testBackupPerformance() {
    const startTime = Date.now();
    
    try {
      // Test backup creation performance
      const performanceResults = [];
      const testSizes = [100, 500, 1000, 2000];

      for (const size of testSizes) {
        const testStart = Date.now();
        
        // Create test data of specific size
        await this.createTestDataOfSize(size);
        
        // Measure backup time
        const backupStart = Date.now();
        const backupPath = path.join(this.config.backupDir, `perf_test_${size}_${Date.now()}.json`);
        
        const collections = await this.db.listCollections().toArray();
        const backupData = {};
        
        for (const collection of collections) {
          const data = await this.db.collection(collection.name).find({}).toArray();
          backupData[collection.name] = data;
        }
        
        fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));
        const backupEnd = Date.now();
        
        const totalTime = backupEnd - testStart;
        const backupTime = backupEnd - backupStart;
        const backupSize = fs.statSync(backupPath).size;
        
        performanceResults.push({
          recordCount: size,
          totalTime,
          backupTime,
          backupSize,
          recordsPerSecond: size / (backupTime / 1000),
          mbPerSecond: (backupSize / 1024 / 1024) / (backupTime / 1000)
        });
        
        // Clean up test data
        for (const collection of collections) {
          await this.db.collection(collection.name).deleteMany({ isTestData: true });
        }
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      this.testResults.performance = {
        success: true,
        duration,
        results: performanceResults,
        averageRecordsPerSecond: performanceResults.reduce((sum, result) => sum + result.recordsPerSecond, 0) / performanceResults.length,
        averageMbPerSecond: performanceResults.reduce((sum, result) => sum + result.mbPerSecond, 0) / performanceResults.length
      };

      console.log(`✓ Performance testing completed in ${duration}ms`);
      console.log(`  - Average records/second: ${this.testResults.performance.averageRecordsPerSecond.toFixed(2)}`);
      console.log(`  - Average MB/second: ${this.testResults.performance.averageMbPerSecond.toFixed(2)}`);

    } catch (error) {
      this.testResults.performance = {
        success: false,
        error: error.message
      };
      throw error;
    }
  }

  async createTestDataOfSize(size) {
    // Create minimal test data of specific size
    const testData = [];
    for (let i = 0; i < size; i++) {
      testData.push({
        isTestData: true,
        testId: i,
        createdAt: new Date(),
        data: 'x'.repeat(100) // 100 character string for size testing
      });
    }
    
    await this.db.collection('TestData').insertMany(testData);
  }

  generateTestReport() {
    const report = {
      timestamp: new Date().toISOString(),
      testResults: this.testResults,
      summary: {
        totalTests: 4,
        passedTests: Object.values(this.testResults).filter(result => result && result.success).length,
        failedTests: Object.values(this.testResults).filter(result => result && !result.success).length,
        overallSuccess: Object.values(this.testResults).every(result => !result || result.success)
      }
    };

    // Save report to file
    const reportPath = path.join(this.config.backupDir, `backup_test_report_${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log('\n📋 BACKUP TEST REPORT');
    console.log('====================');
    console.log(`Total Tests: ${report.summary.totalTests}`);
    console.log(`Passed: ${report.summary.passedTests}`);
    console.log(`Failed: ${report.summary.failedTests}`);
    console.log(`Overall Success: ${report.summary.overallSuccess ? '✅' : '❌'}`);
    console.log(`Report saved to: ${reportPath}`);

    if (this.testResults.backupCreation?.success) {
      console.log(`\nBackup Creation:`);
      console.log(`  - Duration: ${this.testResults.backupCreation.duration}ms`);
      console.log(`  - Size: ${(this.testResults.backupCreation.backupSize / 1024 / 1024).toFixed(2)} MB`);
      console.log(`  - Records: ${this.testResults.backupCreation.records}`);
    }

    if (this.testResults.dataIntegrity?.success) {
      console.log(`\nData Integrity:`);
      console.log(`  - Health Score: ${this.testResults.dataIntegrity.overallHealthScore.toFixed(2)}/100`);
    }

    if (this.testResults.restoration?.success) {
      console.log(`\nData Restoration:`);
      console.log(`  - All Collections Match: ${this.testResults.restoration.allCollectionsMatch ? '✅' : '❌'}`);
    }

    if (this.testResults.performance?.success) {
      console.log(`\nPerformance:`);
      console.log(`  - Avg Records/sec: ${this.testResults.performance.averageRecordsPerSecond.toFixed(2)}`);
      console.log(`  - Avg MB/sec: ${this.testResults.performance.averageMbPerSecond.toFixed(2)}`);
    }

    return report;
  }
}

// Run backup testing if called directly
if (require.main === module) {
  const config = {
    mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/cryptopulse',
    backupDir: process.env.BACKUP_DIR || './backups',
    testDataSize: parseInt(process.env.TEST_DATA_SIZE) || 1000
  };

  const backupTest = new BackupTestingSuite(config);
  
  backupTest.runFullBackupTest()
    .then(() => {
      console.log('Backup testing completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('Backup testing failed:', error);
      process.exit(1);
    });
}

module.exports = BackupTestingSuite;
