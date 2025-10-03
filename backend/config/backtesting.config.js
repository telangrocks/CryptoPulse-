/**
 * Backtesting Engine Production Configuration
 * 
 * This configuration file provides production-ready settings
 * for the backtesting engine system.
 */

const config = {
  // Environment-specific configurations
  development: {
    backtesting: {
      // Data settings
      maxDataPoints: 50000,
      minDataPoints: 50,
      defaultTimeframe: '1h',
      
      // Performance settings
      maxConcurrentBacktests: 5,
      maxBacktestDuration: 1800000, // 30 minutes
      progressUpdateInterval: 500, // 0.5 seconds
      
      // Calculation settings
      precision: 6, // Decimal precision for calculations
      slippage: 0.002, // 0.2% default slippage
      commission: 0.002, // 0.2% default commission
      spread: 0.001, // 0.1% default spread
      
      // Risk settings
      maxDrawdown: 0.25, // 25% max drawdown
      maxPositionSize: 0.2, // 20% max position size
      stopLossMultiplier: 1.5, // Stop loss multiplier
      
      // Reporting settings
      generateDetailedReport: true,
      includeCharts: true,
      exportFormats: ['json', 'csv'],
      
      // Optimization settings
      maxParameterCombinations: 1000,
      optimizationTimeout: 600000, // 10 minutes
      walkForwardMaxPeriods: 20,
      
      // Memory settings
      maxMemoryUsage: 0.9, // 90% of available memory
      cleanupInterval: 300000, // 5 minutes
    },
    simulation: {
      enableRealTimeSimulation: true,
      simulationSpeed: 1, // 1x real-time
      enableStepByStepMode: true,
      maxSimulationSteps: 100000,
    },
    data: {
      enableDataValidation: true,
      enableDataCleaning: true,
      maxGapSize: 3600000, // 1 hour
      enableInterpolation: true,
    },
    logging: {
      level: 'debug',
      enableDetailedLogging: true,
      enablePerformanceLogging: true,
      enableTradeLogging: true,
    },
  },

  staging: {
    backtesting: {
      // Data settings
      maxDataPoints: 75000,
      minDataPoints: 75,
      defaultTimeframe: '1h',
      
      // Performance settings
      maxConcurrentBacktests: 3,
      maxBacktestDuration: 2700000, // 45 minutes
      progressUpdateInterval: 1000, // 1 second
      
      // Calculation settings
      precision: 8, // Decimal precision for calculations
      slippage: 0.0015, // 0.15% default slippage
      commission: 0.0015, // 0.15% default commission
      spread: 0.0008, // 0.08% default spread
      
      // Risk settings
      maxDrawdown: 0.2, // 20% max drawdown
      maxPositionSize: 0.15, // 15% max position size
      stopLossMultiplier: 2.0, // Stop loss multiplier
      
      // Reporting settings
      generateDetailedReport: true,
      includeCharts: true,
      exportFormats: ['json', 'csv'],
      
      // Optimization settings
      maxParameterCombinations: 500,
      optimizationTimeout: 900000, // 15 minutes
      walkForwardMaxPeriods: 15,
      
      // Memory settings
      maxMemoryUsage: 0.85, // 85% of available memory
      cleanupInterval: 600000, // 10 minutes
    },
    simulation: {
      enableRealTimeSimulation: true,
      simulationSpeed: 2, // 2x real-time
      enableStepByStepMode: false,
      maxSimulationSteps: 75000,
    },
    data: {
      enableDataValidation: true,
      enableDataCleaning: true,
      maxGapSize: 1800000, // 30 minutes
      enableInterpolation: true,
    },
    logging: {
      level: 'info',
      enableDetailedLogging: true,
      enablePerformanceLogging: true,
      enableTradeLogging: true,
    },
  },

  production: {
    backtesting: {
      // Data settings
      maxDataPoints: 100000,
      minDataPoints: 100,
      defaultTimeframe: '1h',
      
      // Performance settings
      maxConcurrentBacktests: 3,
      maxBacktestDuration: 3600000, // 1 hour
      progressUpdateInterval: 1000, // 1 second
      
      // Calculation settings
      precision: 8, // Decimal precision for calculations
      slippage: 0.001, // 0.1% default slippage
      commission: 0.001, // 0.1% default commission
      spread: 0.0005, // 0.05% default spread
      
      // Risk settings
      maxDrawdown: 0.2, // 20% max drawdown
      maxPositionSize: 0.1, // 10% max position size
      stopLossMultiplier: 2.0, // Stop loss multiplier
      
      // Reporting settings
      generateDetailedReport: true,
      includeCharts: true,
      exportFormats: ['json', 'csv'],
      
      // Optimization settings
      maxParameterCombinations: 250,
      optimizationTimeout: 1800000, // 30 minutes
      walkForwardMaxPeriods: 12,
      
      // Memory settings
      maxMemoryUsage: 0.8, // 80% of available memory
      cleanupInterval: 900000, // 15 minutes
    },
    simulation: {
      enableRealTimeSimulation: true,
      simulationSpeed: 5, // 5x real-time
      enableStepByStepMode: false,
      maxSimulationSteps: 50000,
    },
    data: {
      enableDataValidation: true,
      enableDataCleaning: true,
      maxGapSize: 900000, // 15 minutes
      enableInterpolation: false,
    },
    logging: {
      level: 'warn',
      enableDetailedLogging: false,
      enablePerformanceLogging: true,
      enableTradeLogging: false,
    },
  },
};

// Strategy templates configuration
const strategyTemplates = {
  momentum: {
    name: 'Momentum Strategy',
    description: 'Buy on momentum breakouts, sell on reversals',
    parameters: {
      lookbackPeriod: 20,
      momentumThreshold: 0.02,
      stopLoss: 0.02,
      takeProfit: 0.04,
      maxHoldTime: 24 * 60 * 60 * 1000, // 24 hours
    },
    entryConditions: [
      'price > sma(20)',
      'rsi(14) > 50',
      'volume > avg_volume(20)',
      'momentum > momentumThreshold',
    ],
    exitConditions: [
      'price < sma(20)',
      'rsi(14) < 30',
      'momentum < -momentumThreshold',
    ],
    riskParameters: {
      maxRisk: 0.02,
      maxPositionSize: 0.1,
      maxConcurrentTrades: 3,
    },
  },
  meanReversion: {
    name: 'Mean Reversion Strategy',
    description: 'Buy oversold, sell overbought',
    parameters: {
      lookbackPeriod: 14,
      oversoldLevel: 30,
      overboughtLevel: 70,
      stopLoss: 0.03,
      takeProfit: 0.02,
      maxHoldTime: 12 * 60 * 60 * 1000, // 12 hours
    },
    entryConditions: [
      'rsi(14) < oversoldLevel',
      'price < bollinger_lower(20, 2)',
      'volume > avg_volume(14)',
    ],
    exitConditions: [
      'rsi(14) > overboughtLevel',
      'price > bollinger_upper(20, 2)',
      'rsi(14) > 50',
    ],
    riskParameters: {
      maxRisk: 0.015,
      maxPositionSize: 0.08,
      maxConcurrentTrades: 5,
    },
  },
  trendFollowing: {
    name: 'Trend Following Strategy',
    description: 'Follow the trend with moving averages',
    parameters: {
      fastPeriod: 10,
      slowPeriod: 30,
      stopLoss: 0.025,
      takeProfit: 0.05,
      maxHoldTime: 48 * 60 * 60 * 1000, // 48 hours
    },
    entryConditions: [
      'sma(fastPeriod) > sma(slowPeriod)',
      'macd_signal > 0',
      'price > sma(fastPeriod)',
      'volume > avg_volume(20)',
    ],
    exitConditions: [
      'sma(fastPeriod) < sma(slowPeriod)',
      'macd_signal < 0',
      'price < sma(fastPeriod)',
    ],
    riskParameters: {
      maxRisk: 0.025,
      maxPositionSize: 0.12,
      maxConcurrentTrades: 2,
    },
  },
  scalping: {
    name: 'Scalping Strategy',
    description: 'Quick trades on small price movements',
    parameters: {
      timeframe: '1m',
      profitTarget: 0.005,
      stopLoss: 0.003,
      maxHoldTime: 300000, // 5 minutes
      volumeThreshold: 2.0,
    },
    entryConditions: [
      'volume_spike > volumeThreshold',
      'price_volatility > 0.001',
      'spread < 0.0005',
    ],
    exitConditions: [
      'profit_target_reached',
      'time_limit_exceeded',
      'stop_loss_triggered',
    ],
    riskParameters: {
      maxRisk: 0.01,
      maxPositionSize: 0.05,
      maxConcurrentTrades: 10,
    },
  },
  arbitrage: {
    name: 'Arbitrage Strategy',
    description: 'Exploit price differences between exchanges',
    parameters: {
      minSpread: 0.01,
      maxHoldTime: 600000, // 10 minutes
      slippage: 0.001,
      volumeThreshold: 1000,
    },
    entryConditions: [
      'price_spread > minSpread',
      'volume_sufficient',
      'liquidity_adequate',
    ],
    exitConditions: [
      'spread_closed',
      'time_limit_exceeded',
      'volume_insufficient',
    ],
    riskParameters: {
      maxRisk: 0.005,
      maxPositionSize: 0.03,
      maxConcurrentTrades: 15,
    },
  },
};

// Performance benchmarks
const performanceBenchmarks = {
  excellent: {
    totalReturn: 0.20, // 20%+
    sharpeRatio: 2.0,
    maxDrawdown: 0.05, // 5%-
    winRate: 0.60, // 60%+
    profitFactor: 2.0,
    calmarRatio: 4.0,
  },
  good: {
    totalReturn: 0.10, // 10%+
    sharpeRatio: 1.5,
    maxDrawdown: 0.10, // 10%-
    winRate: 0.50, // 50%+
    profitFactor: 1.5,
    calmarRatio: 2.0,
  },
  average: {
    totalReturn: 0.05, // 5%+
    sharpeRatio: 1.0,
    maxDrawdown: 0.15, // 15%-
    winRate: 0.40, // 40%+
    profitFactor: 1.2,
    calmarRatio: 1.0,
  },
  poor: {
    totalReturn: 0.00, // 0%+
    sharpeRatio: 0.5,
    maxDrawdown: 0.25, // 25%-
    winRate: 0.30, // 30%+
    profitFactor: 1.0,
    calmarRatio: 0.5,
  },
};

// Get current environment
const environment = process.env.NODE_ENV || 'development';

// Export configuration for current environment
const currentConfig = config[environment] || config.development;

// Export with metadata
module.exports = {
  ...currentConfig,
  strategyTemplates,
  performanceBenchmarks,
  environment,
  version: '1.0.0',
  lastUpdated: new Date().toISOString(),
  metadata: {
    description: 'Backtesting Engine Production Configuration',
    author: 'CryptoPulse Team',
    license: 'MIT',
  },
};
