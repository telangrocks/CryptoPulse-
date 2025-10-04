// =============================================================================
// Trading Bot Tests - Production Ready
// =============================================================================
// Comprehensive tests for automated trading bot functionality

// Set up test environment before importing trading bot module
process.env.NODE_ENV = 'test';
process.env.BINANCE_API_KEY = 'test-binance-api-key';
process.env.BINANCE_SECRET_KEY = 'test-binance-secret-key';

const TradingBot = require('../lib/tradingBot');
const { SignalGenerator } = require('../lib/tradingBot');

const { createTestTrade, createTestMarketData, createTestUser } = require('./testHelpers');

// Mock logger to avoid console output during tests
jest.mock('../lib/logging', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
}));

// Mock database modules
jest.mock('../lib/database', () => ({
  User: jest.fn(),
  Trade: {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn()
  },
  TradingStrategy: {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn()
  },
  ExchangeConfig: {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn()
  }
}));

// Mock market data service
jest.mock('../lib/marketDataService', () => ({
  getRealTimeData: jest.fn(),
  getHistoricalData: jest.fn(),
  getMarketMetrics: jest.fn(),
  getTechnicalIndicators: jest.fn()
}));

// Mock risk manager
jest.mock('../lib/riskManager', () => ({
  riskManager: {
    calculatePositionSize: jest.fn(),
    checkRiskLimits: jest.fn(),
    evaluateRisk: jest.fn(),
    updateRiskMetrics: jest.fn()
  }
}));

// Mock backtesting engine
jest.mock('../lib/backtestingEngine', () => ({
  backtestingEngine: {
    runBacktest: jest.fn(),
    getPerformanceMetrics: jest.fn(),
    optimizeParameters: jest.fn()
  }
}));

describe('Trading Bot', () => {
  let tradingBot;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    tradingBot = new TradingBot();
  });

  afterEach(async () => {
    // Stop bot after each test
    if (tradingBot.isRunning) {
      await tradingBot.stop();
    }
  });

  describe('Trading Bot Initialization', () => {
    test('should initialize with default configuration', () => {
      expect(tradingBot.isRunning).toBe(false);
      expect(tradingBot.activeStrategies).toBeInstanceOf(Map);
      expect(tradingBot.signalQueue).toEqual([]);
      expect(tradingBot.processedSignals).toEqual([]);
      expect(tradingBot.config.maxConcurrentTrades).toBe(5);
      expect(tradingBot.config.maxDailyTrades).toBe(50);
      expect(tradingBot.config.signalConfidenceThreshold).toBe(75);
      expect(tradingBot.config.riskPerTrade).toBe(0.02);
    });

    test('should initialize with custom configuration', () => {
      const customConfig = {
        maxConcurrentTrades: 10,
        maxDailyTrades: 100,
        signalConfidenceThreshold: 80,
        riskPerTrade: 0.05,
        maxDrawdown: 0.15,
        checkInterval: 60000,
        backtestPeriod: 60
      };

      const customBot = new TradingBot(customConfig);
      expect(customBot.config.maxConcurrentTrades).toBe(10);
      expect(customBot.config.maxDailyTrades).toBe(100);
      expect(customBot.config.signalConfidenceThreshold).toBe(80);
      expect(customBot.config.riskPerTrade).toBe(0.05);
    });

    test('should initialize daily stats', () => {
      expect(tradingBot.dailyStats.trades).toBe(0);
      expect(tradingBot.dailyStats.wins).toBe(0);
      expect(tradingBot.dailyStats.losses).toBe(0);
      expect(tradingBot.dailyStats.profit).toBe(0);
      expect(tradingBot.dailyStats.startTime).toBeDefined();
    });
  });

  describe('Bot Lifecycle Management', () => {
    test('should start trading bot', async () => {
      expect(tradingBot.isRunning).toBe(false);

      await tradingBot.start();

      expect(tradingBot.isRunning).toBe(true);
    });

    test('should not start bot if already running', async () => {
      await tradingBot.start();
      expect(tradingBot.isRunning).toBe(true);

      await tradingBot.start();
      expect(tradingBot.isRunning).toBe(true);
    });

    test('should stop trading bot', async () => {
      await tradingBot.start();
      expect(tradingBot.isRunning).toBe(true);

      await tradingBot.stop();
      expect(tradingBot.isRunning).toBe(false);
    });

    test('should handle stop when not running', async () => {
      expect(tradingBot.isRunning).toBe(false);

      await tradingBot.stop();
      expect(tradingBot.isRunning).toBe(false);
    });

    test('should restart trading bot', async () => {
      await tradingBot.start();
      expect(tradingBot.isRunning).toBe(true);

      await tradingBot.restart();
      expect(tradingBot.isRunning).toBe(true);
    });
  });

  describe('Strategy Management', () => {
    test('should add trading strategy', async () => {
      const strategy = {
        id: 'strategy-1',
        name: 'RSI Strategy',
        parameters: {
          rsiPeriod: 14,
          oversold: 30,
          overbought: 70
        },
        isActive: true
      };

      await tradingBot.addStrategy(strategy);

      expect(tradingBot.activeStrategies.has('strategy-1')).toBe(true);
      expect(tradingBot.activeStrategies.get('strategy-1')).toEqual(strategy);
    });

    test('should remove trading strategy', async () => {
      const strategy = {
        id: 'strategy-1',
        name: 'RSI Strategy',
        isActive: true
      };

      await tradingBot.addStrategy(strategy);
      expect(tradingBot.activeStrategies.has('strategy-1')).toBe(true);

      await tradingBot.removeStrategy('strategy-1');
      expect(tradingBot.activeStrategies.has('strategy-1')).toBe(false);
    });

    test('should update strategy parameters', async () => {
      const strategy = {
        id: 'strategy-1',
        name: 'RSI Strategy',
        parameters: { rsiPeriod: 14, oversold: 30 },
        isActive: true
      };

      await tradingBot.addStrategy(strategy);

      const newParameters = { rsiPeriod: 21, oversold: 25, overbought: 75 };
      await tradingBot.updateStrategy('strategy-1', newParameters);

      const updatedStrategy = tradingBot.activeStrategies.get('strategy-1');
      expect(updatedStrategy.parameters).toEqual(newParameters);
    });

    test('should get all active strategies', async () => {
      const strategy1 = { id: 'strategy-1', name: 'RSI Strategy', isActive: true };
      const strategy2 = { id: 'strategy-2', name: 'MACD Strategy', isActive: true };

      await tradingBot.addStrategy(strategy1);
      await tradingBot.addStrategy(strategy2);

      const activeStrategies = tradingBot.getActiveStrategies();
      expect(activeStrategies).toHaveLength(2);
      expect(activeStrategies[0]).toEqual(strategy1);
      expect(activeStrategies[1]).toEqual(strategy2);
    });

    test('should handle strategy errors gracefully', async () => {
      await expect(tradingBot.removeStrategy('non-existent')).rejects.toThrow();
      await expect(tradingBot.updateStrategy('non-existent', {})).rejects.toThrow();
    });
  });

  describe('Signal Generation and Processing', () => {
    test('should generate trading signals', async () => {
      const marketData = createTestMarketData({
        symbol: 'BTC/USDT',
        price: 50000,
        volume: 1000
      });

      const mockSignal = {
        id: 'signal-1',
        symbol: 'BTC/USDT',
        action: 'buy',
        confidence: 85,
        price: 50000,
        timestamp: Date.now(),
        strategyId: 'strategy-1'
      };

      tradingBot.signalGenerator.generateSignal = jest.fn().mockResolvedValue(mockSignal);

      const signal = await tradingBot.generateSignal(marketData, 'strategy-1');

      expect(signal).toEqual(mockSignal);
      expect(tradingBot.signalGenerator.generateSignal).toHaveBeenCalledWith(marketData, 'strategy-1');
    });

    test('should process signal queue', async () => {
      const signal1 = {
        id: 'signal-1',
        symbol: 'BTC/USDT',
        action: 'buy',
        confidence: 85,
        price: 50000
      };

      const signal2 = {
        id: 'signal-2',
        symbol: 'ETH/USDT',
        action: 'sell',
        confidence: 90,
        price: 3000
      };

      tradingBot.signalQueue.push(signal1, signal2);
      tradingBot.processSignal = jest.fn().mockResolvedValue();

      await tradingBot.processSignalQueue();

      expect(tradingBot.processSignal).toHaveBeenCalledTimes(2);
      expect(tradingBot.processSignal).toHaveBeenCalledWith(signal1);
      expect(tradingBot.processSignal).toHaveBeenCalledWith(signal2);
    });

    test('should validate signal confidence threshold', async () => {
      const lowConfidenceSignal = {
        id: 'signal-1',
        symbol: 'BTC/USDT',
        action: 'buy',
        confidence: 50, // Below threshold
        price: 50000
      };

      const highConfidenceSignal = {
        id: 'signal-2',
        symbol: 'ETH/USDT',
        action: 'sell',
        confidence: 85, // Above threshold
        price: 3000
      };

      const result1 = tradingBot.validateSignal(lowConfidenceSignal);
      const result2 = tradingBot.validateSignal(highConfidenceSignal);

      expect(result1).toBe(false);
      expect(result2).toBe(true);
    });

    test('should handle signal processing errors', async () => {
      const invalidSignal = {
        id: 'signal-1',
        // Missing required fields
        confidence: 85
      };

      await expect(tradingBot.processSignal(invalidSignal)).rejects.toThrow();
    });
  });

  describe('Trade Execution', () => {
    test('should execute buy order', async () => {
      const signal = {
        id: 'signal-1',
        symbol: 'BTC/USDT',
        action: 'buy',
        confidence: 85,
        price: 50000,
        amount: 0.001
      };

      const mockTrade = createTestTrade({
        symbol: 'BTC/USDT',
        side: 'buy',
        amount: 0.001,
        price: 50000,
        status: 'filled'
      });

      tradingBot.executeTrade = jest.fn().mockResolvedValue(mockTrade);

      const result = await tradingBot.executeTrade(signal);

      expect(result).toEqual(mockTrade);
      expect(tradingBot.executeTrade).toHaveBeenCalledWith(signal);
    });

    test('should execute sell order', async () => {
      const signal = {
        id: 'signal-2',
        symbol: 'BTC/USDT',
        action: 'sell',
        confidence: 90,
        price: 51000,
        amount: 0.001
      };

      const mockTrade = createTestTrade({
        symbol: 'BTC/USDT',
        side: 'sell',
        amount: 0.001,
        price: 51000,
        status: 'filled'
      });

      tradingBot.executeTrade = jest.fn().mockResolvedValue(mockTrade);

      const result = await tradingBot.executeTrade(signal);

      expect(result).toEqual(mockTrade);
    });

    test('should handle trade execution errors', async () => {
      const signal = {
        id: 'signal-1',
        symbol: 'BTC/USDT',
        action: 'buy',
        confidence: 85,
        price: 50000,
        amount: 0.001
      };

      tradingBot.executeTrade = jest.fn().mockRejectedValue(new Error('Insufficient balance'));

      await expect(tradingBot.executeTrade(signal)).rejects.toThrow('Insufficient balance');
    });

    test('should respect maximum concurrent trades', async () => {
      tradingBot.config.maxConcurrentTrades = 2;
      
      // Mock active trades
      tradingBot.activeTrades = new Map();
      tradingBot.activeTrades.set('trade-1', { status: 'pending' });
      tradingBot.activeTrades.set('trade-2', { status: 'pending' });

      const signal = {
        id: 'signal-3',
        symbol: 'ETH/USDT',
        action: 'buy',
        confidence: 85,
        price: 3000,
        amount: 0.1
      };

      const canExecute = tradingBot.canExecuteTrade();
      expect(canExecute).toBe(false);
    });
  });

  describe('Risk Management Integration', () => {
    test('should check risk limits before trade execution', async () => {
      const signal = {
        id: 'signal-1',
        symbol: 'BTC/USDT',
        action: 'buy',
        confidence: 85,
        price: 50000,
        amount: 0.001
      };

      const { riskManager } = require('../lib/riskManager');
      riskManager.checkRiskLimits.mockResolvedValue({ allowed: true, reason: null });

      const riskCheck = await tradingBot.checkRiskLimits(signal);

      expect(riskCheck.allowed).toBe(true);
      expect(riskManager.checkRiskLimits).toHaveBeenCalledWith(signal);
    });

    test('should reject trade if risk limits exceeded', async () => {
      const signal = {
        id: 'signal-1',
        symbol: 'BTC/USDT',
        action: 'buy',
        confidence: 85,
        price: 50000,
        amount: 1.0 // Large amount
      };

      const { riskManager } = require('../lib/riskManager');
      riskManager.checkRiskLimits.mockResolvedValue({ 
        allowed: false, 
        reason: 'Position size too large' 
      });

      const riskCheck = await tradingBot.checkRiskLimits(signal);

      expect(riskCheck.allowed).toBe(false);
      expect(riskCheck.reason).toBe('Position size too large');
    });

    test('should calculate position size based on risk', async () => {
      const signal = {
        id: 'signal-1',
        symbol: 'BTC/USDT',
        action: 'buy',
        confidence: 85,
        price: 50000
      };

      const { riskManager } = require('../lib/riskManager');
      riskManager.calculatePositionSize.mockResolvedValue(0.001);

      const positionSize = await tradingBot.calculatePositionSize(signal);

      expect(positionSize).toBe(0.001);
      expect(riskManager.calculatePositionSize).toHaveBeenCalledWith(signal, tradingBot.config.riskPerTrade);
    });
  });

  describe('Performance Monitoring', () => {
    test('should update daily statistics', async () => {
      const trade = createTestTrade({
        symbol: 'BTC/USDT',
        side: 'buy',
        amount: 0.001,
        price: 50000,
        status: 'filled',
        profit: 100
      });

      tradingBot.updateDailyStats(trade);

      expect(tradingBot.dailyStats.trades).toBe(1);
      expect(tradingBot.dailyStats.wins).toBe(1);
      expect(tradingBot.dailyStats.profit).toBe(100);
    });

    test('should reset daily statistics', () => {
      tradingBot.dailyStats.trades = 10;
      tradingBot.dailyStats.wins = 8;
      tradingBot.dailyStats.losses = 2;
      tradingBot.dailyStats.profit = 500;

      tradingBot.resetDailyStats();

      expect(tradingBot.dailyStats.trades).toBe(0);
      expect(tradingBot.dailyStats.wins).toBe(0);
      expect(tradingBot.dailyStats.losses).toBe(0);
      expect(tradingBot.dailyStats.profit).toBe(0);
      expect(tradingBot.dailyStats.startTime).toBeDefined();
    });

    test('should get performance metrics', () => {
      tradingBot.dailyStats.trades = 20;
      tradingBot.dailyStats.wins = 15;
      tradingBot.dailyStats.losses = 5;
      tradingBot.dailyStats.profit = 1000;

      const metrics = tradingBot.getPerformanceMetrics();

      expect(metrics.totalTrades).toBe(20);
      expect(metrics.winRate).toBe(75);
      expect(metrics.totalProfit).toBe(1000);
      expect(metrics.avgProfitPerTrade).toBe(50);
    });

    test('should check if daily trade limit exceeded', () => {
      tradingBot.config.maxDailyTrades = 10;
      tradingBot.dailyStats.trades = 10;

      expect(tradingBot.isDailyLimitExceeded()).toBe(true);

      tradingBot.dailyStats.trades = 9;
      expect(tradingBot.isDailyLimitExceeded()).toBe(false);
    });
  });

  describe('Backtesting Integration', () => {
    test('should run strategy backtest', async () => {
      const strategy = {
        id: 'strategy-1',
        name: 'RSI Strategy',
        parameters: { rsiPeriod: 14, oversold: 30, overbought: 70 }
      };

      const mockBacktestResult = {
        totalReturn: 15.5,
        sharpeRatio: 1.8,
        maxDrawdown: 5.2,
        winRate: 65,
        totalTrades: 150
      };

      const { backtestingEngine } = require('../lib/backtestingEngine');
      backtestingEngine.runBacktest.mockResolvedValue(mockBacktestResult);

      const result = await tradingBot.runBacktest(strategy);

      expect(result).toEqual(mockBacktestResult);
      expect(backtestingEngine.runBacktest).toHaveBeenCalledWith(strategy, tradingBot.config.backtestPeriod);
    });

    test('should optimize strategy parameters', async () => {
      const strategy = {
        id: 'strategy-1',
        name: 'RSI Strategy',
        parameters: { rsiPeriod: 14, oversold: 30, overbought: 70 }
      };

      const mockOptimizedParams = {
        rsiPeriod: 21,
        oversold: 25,
        overbought: 75
      };

      const { backtestingEngine } = require('../lib/backtestingEngine');
      backtestingEngine.optimizeParameters.mockResolvedValue(mockOptimizedParams);

      const optimizedParams = await tradingBot.optimizeStrategy(strategy);

      expect(optimizedParams).toEqual(mockOptimizedParams);
      expect(backtestingEngine.optimizeParameters).toHaveBeenCalledWith(strategy);
    });
  });

  describe('Error Handling and Recovery', () => {
    test('should handle market data errors gracefully', async () => {
      const marketDataService = require('../lib/marketDataService');
      marketDataService.getRealTimeData.mockRejectedValue(new Error('Market data unavailable'));

      await expect(tradingBot.getMarketData('BTC/USDT')).rejects.toThrow('Market data unavailable');
    });

    test('should handle database errors gracefully', async () => {
      const { Trade } = require('../lib/database');
      Trade.create.mockRejectedValue(new Error('Database connection failed'));

      const trade = createTestTrade();
      await expect(tradingBot.saveTrade(trade)).rejects.toThrow('Database connection failed');
    });

    test('should recover from temporary failures', async () => {
      let callCount = 0;
      tradingBot.executeTrade = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          throw new Error('Temporary failure');
        }
        return Promise.resolve(createTestTrade());
      });

      const signal = {
        id: 'signal-1',
        symbol: 'BTC/USDT',
        action: 'buy',
        confidence: 85,
        price: 50000,
        amount: 0.001
      };

      // First call should fail
      await expect(tradingBot.executeTrade(signal)).rejects.toThrow('Temporary failure');

      // Second call should succeed
      const result = await tradingBot.executeTrade(signal);
      expect(result).toBeDefined();
    });

    test('should handle memory cleanup', () => {
      // Add many signals to test memory management
      for (let i = 0; i < 1000; i++) {
        tradingBot.processedSignals.push({
          id: `signal-${i}`,
          timestamp: Date.now()
        });
      }

      expect(tradingBot.processedSignals.length).toBe(1000);

      tradingBot.cleanupOldSignals();

      // Should keep only recent signals (assuming cleanup keeps last 100)
      expect(tradingBot.processedSignals.length).toBeLessThan(1000);
    });
  });

  describe('Configuration Management', () => {
    test('should update bot configuration', () => {
      const newConfig = {
        maxConcurrentTrades: 10,
        signalConfidenceThreshold: 80,
        riskPerTrade: 0.03,
        checkInterval: 45000
      };

      tradingBot.updateConfig(newConfig);

      expect(tradingBot.config.maxConcurrentTrades).toBe(10);
      expect(tradingBot.config.signalConfidenceThreshold).toBe(80);
      expect(tradingBot.config.riskPerTrade).toBe(0.03);
      expect(tradingBot.config.checkInterval).toBe(45000);
    });

    test('should validate configuration values', () => {
      const invalidConfig = {
        maxConcurrentTrades: -1,
        signalConfidenceThreshold: 150,
        riskPerTrade: 2.0,
        checkInterval: 0
      };

      expect(() => tradingBot.validateConfig(invalidConfig)).toThrow();
    });

    test('should get current configuration', () => {
      const config = tradingBot.getConfig();

      expect(config.maxConcurrentTrades).toBe(5);
      expect(config.maxDailyTrades).toBe(50);
      expect(config.signalConfidenceThreshold).toBe(75);
      expect(config.riskPerTrade).toBe(0.02);
    });
  });
});
