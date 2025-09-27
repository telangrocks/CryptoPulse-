import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Shield, CheckCircle, XCircle, Loader2, RefreshCw } from 'lucide-react';
import { runSecurityTests, SecurityTestResult } from '../lib/security';

export default function SecurityTestPanel() {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<SecurityTestResult[]>([]);
  const [lastRun, setLastRun] = useState<Date | null>(null);

  const handleRunTests = async () => {
    setIsRunning(true);
    try {
      const testResults = await runSecurityTests();
      setResults(testResults);
      setLastRun(new Date());
    } catch (error) {
      // Security tests failed - handled by error logging system
    } finally {
      setIsRunning(false);
    }
  };

  const passedCount = results.filter(r => r.passed).length;
  const totalCount = results.length;
  const allPassed = totalCount > 0 && passedCount === totalCount;

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Shield className="h-6 w-6 text-blue-500" />
          <span>Security Test Panel</span>
          {lastRun && (
            <Badge variant="outline" className="ml-auto">
              Last run: {lastRun.toLocaleTimeString()}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Run Security Tests</h3>
            <p className="text-sm text-gray-600">
              Test all security features including encryption, validation, and session management.
            </p>
          </div>
          <Button 
            onClick={handleRunTests} 
            disabled={isRunning}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isRunning ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Running Tests...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Run Security Tests
              </>
            )}
          </Button>
        </div>

        {results.length > 0 && (
          <>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                {allPassed ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
                <span className="font-semibold">
                  {passedCount}/{totalCount} tests passed
                </span>
              </div>
              <Badge 
                variant={allPassed ? "default" : "destructive"}
                className={allPassed ? "bg-green-500" : "bg-red-500"}
              >
                {allPassed ? "All Tests Passed" : "Some Tests Failed"}
              </Badge>
            </div>

            <div className="space-y-2">
              {results.map((result, index) => (
                <div 
                  key={index}
                  className={`p-3 rounded-lg border ${
                    result.passed 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {result.passed ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      <span className="font-medium">{result.testName}</span>
                    </div>
                    <Badge 
                      variant={result.passed ? "default" : "destructive"}
                      className={result.passed ? "bg-green-500" : "bg-red-500"}
                    >
                      {result.passed ? "PASS" : "FAIL"}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{result.message}</p>
                  {result.details && (
                    <pre className="text-xs text-gray-500 mt-2 bg-gray-100 p-2 rounded">
                      {JSON.stringify(result.details, null, 2)}
                    </pre>
                  )}
                </div>
              ))}
            </div>

            {allPassed ? (
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <AlertDescription className="text-green-700">
                  <strong>Excellent!</strong> All security tests passed. Your application is properly secured.
                </AlertDescription>
              </Alert>
            ) : (
              <Alert className="bg-red-50 border-red-200">
                <XCircle className="h-4 w-4 text-red-500" />
                <AlertDescription className="text-red-700">
                  <strong>Warning!</strong> Some security tests failed. Please review the results above and fix any issues.
                </AlertDescription>
              </Alert>
            )}
          </>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-semibold text-blue-800 mb-2">What These Tests Check:</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• <strong>Encryption:</strong> AES-256-GCM encryption/decryption functionality</li>
            <li>• <strong>Secure Storage:</strong> Encrypted localStorage with TTL expiration</li>
            <li>• <strong>Input Validation:</strong> Trade data and API key validation</li>
            <li>• <strong>CSRF Protection:</strong> Token generation and validation</li>
            <li>• <strong>Environment Variables:</strong> Required configuration variables</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
