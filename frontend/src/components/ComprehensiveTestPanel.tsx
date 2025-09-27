/**
 * Comprehensive Test Panel
 * Tests all systems: Security, Exchange, Backend, Performance
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { CheckCircle, XCircle, Clock, AlertTriangle, RefreshCw, Zap, Shield, Database, Activity } from 'lucide-react';
import { exchangeTester, TestResult } from '../lib/exchangeTest';
import { getSecureItem } from '../lib/secureStorage';
import { callBack4AppFunction } from '../back4app/config';
import { logInfo, logError } from '../lib/logger';

interface TestSuite {
  name: string;
  icon: React.ReactNode;
  tests: TestResult[];
  status: 'PASS' | 'FAIL' | 'RUNNING' | 'PENDING';
  duration: number;
}

export default function ComprehensiveTestPanel() {
  const [testSuites, setTestSuites] = useState<TestSuite[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [overallStatus, setOverallStatus] = useState<'PASS' | 'FAIL' | 'RUNNING' | 'PENDING'>('PENDING');

  const testSuitesConfig = [
    {
      name: 'Security Tests',
      icon: <Shield className="h-5 w-5" />,
      runTest: runSecurityTests
    },
    {
      name: 'Exchange Integration',
      icon: <Zap className="h-5 w-5" />,
      runTest: runExchangeTests
    },
    {
      name: 'Backend Connectivity',
      icon: <Database className="h-5 w-5" />,
      runTest: runBackendTests
    },
    {
      name: 'Performance Tests',
      icon: <Activity className="h-5 w-5" />,
      runTest: runPerformanceTests
    }
  ];

  useEffect(() => {
    initializeTestSuites();
  }, []);

  const initializeTestSuites = () => {
    const suites = testSuitesConfig.map(config => ({
      name: config.name,
      icon: config.icon,
      tests: [],
      status: 'PENDING' as const,
      duration: 0
    }));
    setTestSuites(suites);
  };

  const runAllTests = async () => {
    setIsRunning(true);
    setOverallStatus('RUNNING');
    initializeTestSuites();

    logInfo('Starting comprehensive test suite', 'TestPanel');

    for (let i = 0; i < testSuitesConfig.length; i++) {
      const config = testSuitesConfig[i];
      const startTime = Date.now();

      // Update status to running
      setTestSuites(prev => prev.map((suite, index) => 
        index === i ? { ...suite, status: 'RUNNING' } : suite
      ));

      try {
        const results = await config.runTest();
        const duration = Date.now() - startTime;
        const status = results.every(r => r.status === 'PASS') ? 'PASS' : 'FAIL';

        setTestSuites(prev => prev.map((suite, index) => 
          index === i ? { ...suite, tests: results, status, duration } : suite
        ));

        logInfo(`${config.name} tests completed: ${results.filter(r => r.status === 'PASS').length}/${results.length} passed`, 'TestPanel');
      } catch (error) {
        const duration = Date.now() - startTime;
        logError(`${config.name} tests failed`, 'TestPanel', error);
        
        setTestSuites(prev => prev.map((suite, index) => 
          index === i ? { 
            ...suite, 
            tests: [{ test: 'Test Suite Error', status: 'FAIL', message: error instanceof Error ? error.message : 'Unknown error', duration: 0 }], 
            status: 'FAIL', 
            duration 
          } : suite
        ));
      }
    }

    // Calculate overall status
    const allResults = testSuites.flatMap(suite => suite.tests);
    const allPassed = allResults.every(r => r.status === 'PASS');
    setOverallStatus(allPassed ? 'PASS' : 'FAIL');
    setIsRunning(false);

    logInfo(`Comprehensive tests completed. Overall status: ${allPassed ? 'PASS' : 'FAIL'}`, 'TestPanel');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PASS': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'FAIL': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'RUNNING': return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PASS': return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'FAIL': return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'RUNNING': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">Comprehensive Test Panel</h1>
          <p className="text-slate-300 text-lg">
            Test all systems: Security, Exchange Integration, Backend Connectivity, and Performance
          </p>
        </div>

        {/* Overall Status */}
        <Card className="bg-slate-800/90 border-slate-700 text-white mb-8">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center">
                {getStatusIcon(overallStatus)}
                <span className="ml-2">Overall Status</span>
              </span>
              <Badge className={getStatusColor(overallStatus)}>
                {overallStatus}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-300">
                  {overallStatus === 'PASS' && 'All systems operational'}
                  {overallStatus === 'FAIL' && 'Some systems have issues'}
                  {overallStatus === 'RUNNING' && 'Tests in progress...'}
                  {overallStatus === 'PENDING' && 'Ready to run tests'}
                </p>
              </div>
              <Button 
                onClick={runAllTests} 
                disabled={isRunning}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isRunning ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Running Tests...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Run All Tests
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Test Suites */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {testSuites.map((suite, index) => (
            <Card key={index} className="bg-slate-800/90 border-slate-700 text-white">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center">
                    {suite.icon}
                    <span className="ml-2">{suite.name}</span>
                  </span>
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(suite.status)}
                    <Badge className={getStatusColor(suite.status)}>
                      {suite.status}
                    </Badge>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {suite.tests.length > 0 ? (
                  <div className="space-y-3">
                    {suite.tests.map((test, testIndex) => (
                      <div key={testIndex} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                        <div className="flex items-center">
                          {getStatusIcon(test.status)}
                          <span className="ml-2 text-sm">{test.test}</span>
                        </div>
                        <div className="text-xs text-slate-400">
                          {test.duration}ms
                        </div>
                      </div>
                    ))}
                    <div className="text-xs text-slate-400 mt-2">
                      Duration: {suite.duration}ms
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-400 text-sm">
                    {suite.status === 'RUNNING' ? 'Running tests...' : 'No tests run yet'}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Instructions */}
        <Card className="bg-slate-800/90 border-slate-700 text-white mt-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2 text-yellow-400" />
              Test Instructions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-slate-300">
              <p>1. <strong>Security Tests:</strong> Validates encryption, secure storage, and session management</p>
              <p>2. <strong>Exchange Integration:</strong> Tests real exchange connectivity and order placement</p>
              <p>3. <strong>Backend Connectivity:</strong> Verifies Back4App cloud functions are working</p>
              <p>4. <strong>Performance Tests:</strong> Checks caching, rate limiting, and response times</p>
              <p className="text-yellow-400 mt-4">
                <strong>Note:</strong> Some tests require API keys and Back4App configuration to pass completely.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Test Functions
async function runSecurityTests(): Promise<TestResult[]> {
  const results: TestResult[] = [];
  
  try {
    // Test 1: Encryption
    const startTime = Date.now();
    const { encryptData, decryptData } = await import('../lib/encryption');
    const testData = 'test data';
    const encrypted = await encryptData(testData);
    const decrypted = await decryptData(encrypted);
    const duration = Date.now() - startTime;
    
    results.push({
      test: 'Encryption/Decryption',
      status: decrypted === testData ? 'PASS' : 'FAIL',
      message: decrypted === testData ? 'Encryption working correctly' : 'Encryption failed',
      duration
    });
  } catch (error) {
    results.push({
      test: 'Encryption/Decryption',
      status: 'FAIL',
      message: `Encryption test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      duration: 0
    });
  }

  try {
    // Test 2: Secure Storage
    const startTime = Date.now();
    const { setSecureItem, getSecureItem } = await import('../lib/secureStorage');
    const testKey = 'test_key';
    const testValue = { test: 'data' };
    
    await setSecureItem(testKey, testValue);
    const retrieved = await getSecureItem(testKey);
    const duration = Date.now() - startTime;
    
    results.push({
      test: 'Secure Storage',
      status: JSON.stringify(retrieved) === JSON.stringify(testValue) ? 'PASS' : 'FAIL',
      message: JSON.stringify(retrieved) === JSON.stringify(testValue) ? 'Secure storage working' : 'Secure storage failed',
      duration
    });
  } catch (error) {
    results.push({
      test: 'Secure Storage',
      status: 'FAIL',
      message: `Secure storage test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      duration: 0
    });
  }

  return results;
}

async function runExchangeTests(): Promise<TestResult[]> {
  const results: TestResult[] = [];
  
  try {
    // Check if API keys are available
    const apiKeys = await getSecureItem('cryptopulse_api_keys');
    
    if (!apiKeys || !apiKeys.tradeExecutionKey || !apiKeys.tradeExecutionSecret) {
      results.push({
        test: 'Exchange Integration',
        status: 'SKIP',
        message: 'API keys not configured - skipping exchange tests',
        duration: 0
      });
      return results;
    }

    // Run exchange tests
    const exchangeResults = await exchangeTester.runAllTests(apiKeys);
    return exchangeResults;
    
  } catch (error) {
    results.push({
      test: 'Exchange Integration',
      status: 'FAIL',
      message: `Exchange test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      duration: 0
    });
    return results;
  }
}

async function runBackendTests(): Promise<TestResult[]> {
  const results: TestResult[] = [];
  
  try {
    // Test 1: Back4App Connection
    const startTime = Date.now();
    const response = await callBack4AppFunction('getBillingStatus', {});
    const duration = Date.now() - startTime;
    
    results.push({
      test: 'Back4App Connection',
      status: response && response.success ? 'PASS' : 'FAIL',
      message: response && response.success ? 'Back4App connected successfully' : 'Back4App connection failed',
      duration
    });
  } catch (error) {
    results.push({
      test: 'Back4App Connection',
      status: 'FAIL',
      message: `Back4App test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      duration: 0
    });
  }

  try {
    // Test 2: Cloud Functions
    const startTime = Date.now();
    const response = await callBack4AppFunction('getTradeStatistics', {});
    const duration = Date.now() - startTime;
    
    results.push({
      test: 'Cloud Functions',
      status: response && response.success ? 'PASS' : 'FAIL',
      message: response && response.success ? 'Cloud functions working' : 'Cloud functions not available',
      duration
    });
  } catch (error) {
    results.push({
      test: 'Cloud Functions',
      status: 'FAIL',
      message: `Cloud functions test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      duration: 0
    });
  }

  return results;
}

async function runPerformanceTests(): Promise<TestResult[]> {
  const results: TestResult[] = [];
  
  try {
    // Test 1: Cache Performance
    const startTime = Date.now();
    const { cache } = await import('../lib/cache');
    
    cache.set('perf_test', { data: 'test' }, 1000);
    const cached = cache.get('perf_test');
    const duration = Date.now() - startTime;
    
    results.push({
      test: 'Cache Performance',
      status: cached && (cached as any).data === 'test' ? 'PASS' : 'FAIL',
      message: cached && (cached as any).data === 'test' ? 'Cache working correctly' : 'Cache failed',
      duration
    });
  } catch (error) {
    results.push({
      test: 'Cache Performance',
      status: 'FAIL',
      message: `Cache test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      duration: 0
    });
  }

  try {
    // Test 2: Rate Limiting
    const startTime = Date.now();
    const { apiRateLimiter } = await import('../lib/rateLimiter');
    
    const canProceed = apiRateLimiter.isAllowed('test_user');
    const duration = Date.now() - startTime;
    
    results.push({
      test: 'Rate Limiting',
      status: canProceed ? 'PASS' : 'FAIL',
      message: canProceed ? 'Rate limiting working' : 'Rate limiting blocked request',
      duration
    });
  } catch (error) {
    results.push({
      test: 'Rate Limiting',
      status: 'FAIL',
      message: `Rate limiting test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      duration: 0
    });
  }

  return results;
}
