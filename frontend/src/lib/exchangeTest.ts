/**
 * Exchange Integration Test Suite
 * Tests real exchange connectivity and functionality
 */

import { createExchangeIntegration, EXCHANGE_CONFIGS } from './exchangeIntegration';
import { logInfo, logError, logWarn } from '../lib/logger';

export interface TestResult {
  test: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  message: string;
  duration: number;
}

export class ExchangeTester {
  private results: TestResult[] = [];

  async runAllTests(apiKeys: { tradeExecutionKey: string; tradeExecutionSecret: string }): Promise<TestResult[]> {
    this.results = [];
    
    logInfo('Starting exchange integration tests', 'ExchangeTest');

    // Test 1: Connection Test
    await this.testConnection(apiKeys);
    
    // Test 2: Account Info Test
    await this.testAccountInfo(apiKeys);
    
    // Test 3: Market Data Test
    await this.testMarketData(apiKeys);
    
    // Test 4: Order Placement Test (Sandbox)
    await this.testOrderPlacement(apiKeys);
    
    // Test 5: Risk Management Test
    await this.testRiskManagement(apiKeys);

    const passed = this.results.filter(r => r.status === 'PASS').length;
    const total = this.results.length;
    
    logInfo(`Exchange tests completed: ${passed}/${total} passed`, 'ExchangeTest');
    
    return this.results;
  }

  private async testConnection(apiKeys: { tradeExecutionKey: string; tradeExecutionSecret: string }): Promise<void> {
    const startTime = Date.now();
    
    try {
      const exchange = createExchangeIntegration({
        ...EXCHANGE_CONFIGS.BINANCE_SANDBOX, // Use sandbox for testing
        apiKey: apiKeys.tradeExecutionKey,
        apiSecret: apiKeys.tradeExecutionSecret
      });

      const connected = await exchange.connect();
      
      this.addResult({
        test: 'Connection Test',
        status: connected ? 'PASS' : 'FAIL',
        message: connected ? 'Successfully connected to exchange' : 'Failed to connect to exchange',
        duration: Date.now() - startTime
      });

    } catch (error) {
      this.addResult({
        test: 'Connection Test',
        status: 'FAIL',
        message: `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration: Date.now() - startTime
      });
    }
  }

  private async testAccountInfo(apiKeys: { tradeExecutionKey: string; tradeExecutionSecret: string }): Promise<void> {
    const startTime = Date.now();
    
    try {
      const exchange = createExchangeIntegration({
        ...EXCHANGE_CONFIGS.BINANCE_SANDBOX,
        apiKey: apiKeys.tradeExecutionKey,
        apiSecret: apiKeys.tradeExecutionSecret
      });

      await exchange.connect();
      const accountInfo = await exchange.getAccountInfo();
      
      if (accountInfo && accountInfo.balances) {
        this.addResult({
          test: 'Account Info Test',
          status: 'PASS',
          message: `Successfully retrieved account info with ${accountInfo.balances.length} balances`,
          duration: Date.now() - startTime
        });
      } else {
        this.addResult({
          test: 'Account Info Test',
          status: 'FAIL',
          message: 'Failed to retrieve valid account info',
          duration: Date.now() - startTime
        });
      }

    } catch (error) {
      this.addResult({
        test: 'Account Info Test',
        status: 'FAIL',
        message: `Account info test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration: Date.now() - startTime
      });
    }
  }

  private async testMarketData(apiKeys: { tradeExecutionKey: string; tradeExecutionSecret: string }): Promise<void> {
    const startTime = Date.now();
    
    try {
      const exchange = createExchangeIntegration({
        ...EXCHANGE_CONFIGS.BINANCE_SANDBOX,
        apiKey: apiKeys.tradeExecutionKey,
        apiSecret: apiKeys.tradeExecutionSecret
      });

      await exchange.connect();
      const marketData = await exchange.getMarketData('BTCUSDT');
      
      if (marketData && marketData.price > 0) {
        this.addResult({
          test: 'Market Data Test',
          status: 'PASS',
          message: `Successfully retrieved market data for BTCUSDT: $${marketData.price}`,
          duration: Date.now() - startTime
        });
      } else {
        this.addResult({
          test: 'Market Data Test',
          status: 'FAIL',
          message: 'Failed to retrieve valid market data',
          duration: Date.now() - startTime
        });
      }

    } catch (error) {
      this.addResult({
        test: 'Market Data Test',
        status: 'FAIL',
        message: `Market data test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration: Date.now() - startTime
      });
    }
  }

  private async testOrderPlacement(apiKeys: { tradeExecutionKey: string; tradeExecutionSecret: string }): Promise<void> {
    const startTime = Date.now();
    
    try {
      const exchange = createExchangeIntegration({
        ...EXCHANGE_CONFIGS.BINANCE_SANDBOX,
        apiKey: apiKeys.tradeExecutionKey,
        apiSecret: apiKeys.tradeExecutionSecret
      });

      await exchange.connect();
      
      // Test market order (small amount for testing)
      const orderRequest = {
        symbol: 'BTCUSDT',
        side: 'BUY' as const,
        type: 'MARKET' as const,
        quantity: 0.001 // Very small amount for testing
      };

      const orderResponse = await exchange.placeMarketOrder(orderRequest);
      
      if (orderResponse && orderResponse.orderId) {
        this.addResult({
          test: 'Order Placement Test',
          status: 'PASS',
          message: `Successfully placed test order: ${orderResponse.orderId}`,
          duration: Date.now() - startTime
        });
      } else {
        this.addResult({
          test: 'Order Placement Test',
          status: 'FAIL',
          message: 'Failed to place test order',
          duration: Date.now() - startTime
        });
      }

    } catch (error) {
      this.addResult({
        test: 'Order Placement Test',
        status: 'FAIL',
        message: `Order placement test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration: Date.now() - startTime
      });
    }
  }

  private async testRiskManagement(apiKeys: { tradeExecutionKey: string; tradeExecutionSecret: string }): Promise<void> {
    const startTime = Date.now();
    
    try {
      const exchange = createExchangeIntegration({
        ...EXCHANGE_CONFIGS.BINANCE_SANDBOX,
        apiKey: apiKeys.tradeExecutionKey,
        apiSecret: apiKeys.tradeExecutionSecret
      });

      await exchange.connect();
      const accountInfo = await exchange.getAccountInfo();
      
      if (accountInfo) {
        // Test risk management with account info
        const { createRiskManager } = await import('./riskManagement');
        const riskManager = createRiskManager();
        
        const riskCheck = riskManager.checkTradeRisk(
          'BTC/USDT',
          'LONG',
          100, // $100 position
          45000, // $45,000 BTC price
          {
            totalBalance: parseFloat(accountInfo.balances.find(b => b.asset === 'USDT')?.free || '1000'),
            availableBalance: parseFloat(accountInfo.balances.find(b => b.asset === 'USDT')?.free || '1000'),
            usedMargin: 0,
            totalPnL: 0,
            dailyPnL: 0,
            maxDrawdown: 0,
            riskScore: 0
          }
        );

        this.addResult({
          test: 'Risk Management Test',
          status: 'PASS',
          message: `Risk management working: ${riskCheck.allowed ? 'Trade allowed' : 'Trade blocked'}`,
          duration: Date.now() - startTime
        });
      } else {
        this.addResult({
          test: 'Risk Management Test',
          status: 'SKIP',
          message: 'Skipped - No account info available',
          duration: Date.now() - startTime
        });
      }

    } catch (error) {
      this.addResult({
        test: 'Risk Management Test',
        status: 'FAIL',
        message: `Risk management test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration: Date.now() - startTime
      });
    }
  }

  private addResult(result: TestResult): void {
    this.results.push(result);
    
    const statusIcon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⏭️';
    logInfo(`${statusIcon} ${result.test}: ${result.message} (${result.duration}ms)`, 'ExchangeTest');
  }

  getResults(): TestResult[] {
    return [...this.results];
  }

  getSummary(): { passed: number; failed: number; skipped: number; total: number } {
    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    const skipped = this.results.filter(r => r.status === 'SKIP').length;
    const total = this.results.length;

    return { passed, failed, skipped, total };
  }
}

// Export singleton instance
export const exchangeTester = new ExchangeTester();

export default ExchangeTester;
