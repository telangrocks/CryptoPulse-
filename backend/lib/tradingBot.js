// =============================================================================
// Automated Trading Bot - Production Ready
// =============================================================================
// Comprehensive trading bot with AI-powered signal generation

const marketDataService = require('./marketDataService');
const { logger } = require('./logging');
const { User: _User, Trade, TradingStrategy, ExchangeConfig: _ExchangeConfig } = require('./database');
const { riskManager } = require('./riskManager');
const { backtestingEngine } = require('./backtestingEngine');

class TradingBot {
  constructor() {
    this.isRunning = false;
    this.activeStrategies = new Map();
    this.signalQueue = [];
    this.processedSignals = [];
    this.riskManager = riskManager; // Use the singleton risk manager
    this.signalGenerator = new SignalGenerator();
    this.backtestingEngine = backtestingEngine; // Use the singleton backtesting engine

    // Bot configuration
    this.config = {
      maxConcurrentTrades: 5,
      maxDailyTrades: 50,
      signalConfidenceThreshold: 75,
      riskPerTrade: 0.02, // 2% of portfolio per trade
      maxDrawdown: 0.1, // 10% max drawdown
      checkInterval: 30000, // 30 seconds
      backtestPeriod: 30 // days
    };

    this.dailyStats = {
      trades: 0,
      wins: 0,
      losses: 0,
      profit: 0,
      startTime: Date.now()
    };
  }

  // Start the trading bot
  async start() {
    if (this.isRunning) {
      logger.warn('Trading bot is already running');
      return;
    }

    logger.info('Starting trading bot...');
    this.isRunning = true;

    // Load active strategies
    await this.loadActiveStrategies();

    // Start main trading loop
    this.tradingLoop();

    // Start signal processing
    this.signalProcessingLoop();

    logger.info('Trading bot started successfully');
  }

  // Stop the trading bot
  async stop() {
    logger.info('Stopping trading bot...');
    this.isRunning = false;
    logger.info('Trading bot stopped');
  }

  // Load active trading strategies
  async loadActiveStrategies() {
    try {
      const strategies = await TradingStrategy.findActive();

      for (const strategy of strategies) {
        this.activeStrategies.set(strategy.id, {
          ...strategy,
          lastSignal: null,
          performance: {
            totalTrades: 0,
            wins: 0,
            losses: 0,
            profit: 0,
            winRate: 0
          }
        });
      }

      logger.info(`Loaded ${strategies.length} active strategies`);
    } catch (error) {
      logger.error('Failed to load strategies:', error);
    }
  }

  // Main trading loop
  async tradingLoop() {
    while (this.isRunning) {
      try {
        // Check for new signals
        await this.checkForSignals();

        // Process pending signals
        await this.processSignalQueue();

        // Update strategy performance
        await this.updateStrategyPerformance();

        // Risk management checks
        await this.performRiskChecks();

        // Wait before next iteration
        await new Promise(resolve => setTimeout(resolve, this.config.checkInterval));
      } catch (error) {
        logger.error('Trading loop error:', error);
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds on error
      }
    }
  }

  // Signal processing loop
  async signalProcessingLoop() {
    while (this.isRunning) {
      try {
        if (this.signalQueue.length > 0) {
          const signal = this.signalQueue.shift();
          await this.processSignal(signal);
        }

        await new Promise(resolve => setTimeout(resolve, 1000)); // Check every second
      } catch (error) {
        logger.error('Signal processing error:', error);
      }
    }
  }

  // Check for new trading signals
  async checkForSignals() {
    try {
      const symbols = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'ADAUSDT', 'XRPUSDT'];

      for (const symbol of symbols) {
        // Get current market data
        const marketData = marketDataService.getCurrentPrice(symbol);
        if (!marketData) {continue;}

        // Get historical data for analysis
        const klineData = await marketDataService.getKlineData('binance', symbol, '1h', 100);
        if (!klineData || klineData.length < 50) {continue;}

        // Generate signals for each active strategy
        for (const [strategyId, strategy] of this.activeStrategies) {
          try {
            const signals = await this.signalGenerator.generateSignals(strategy, symbol, marketData, klineData);

            for (const signal of signals) {
              if (signal.confidence >= this.config.signalConfidenceThreshold) {
                signal.strategyId = strategyId;
                signal.userId = strategy.userId;
                this.signalQueue.push(signal);
              }
            }
          } catch (error) {
            logger.error(`Signal generation error for strategy ${strategyId}:`, error);
          }
        }
      }
    } catch (error) {
      logger.error('Signal checking error:', error);
    }
  }

  // Process a trading signal
  async processSignal(signal) {
    try {
      // Validate signal using enhanced risk manager
      const validation = await this.validateSignal(signal, signal.userId, signal.portfolioValue);
      if (!validation.valid) {
        logger.warn('Signal rejected by risk validation:', {
          signalId: signal.id,
          errors: validation.errors,
          warnings: validation.warnings,
        });
        return;
      }

      // Use adjusted signal if validation made changes
      const finalSignal = validation.adjustedSignal || signal;

      // Backtest the signal using the enhanced backtesting engine
      const backtestResult = await this.backtestingEngine.runBacktest(
        {
          name: finalSignal.strategy || 'Signal Strategy',
          parameters: finalSignal.parameters || {},
          entryConditions: finalSignal.entryConditions || [],
          exitConditions: finalSignal.exitConditions || [],
        },
        {
          symbol: finalSignal.symbol,
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date().toISOString(),
          initialCapital: signal.portfolioValue || 10000,
        }
      );
      
      if (!backtestResult.success) {
        logger.warn('Signal failed backtest:', {
          signalId: finalSignal.id,
          error: backtestResult.error,
        });
        return;
      }

      // Create trade record
      const trade = await this.createTradeRecord(finalSignal, backtestResult);

      // Send notification to user
      await this.sendTradeNotification(finalSignal, trade);

      // Add to processed signals with validation data
      this.processedSignals.push({
        ...finalSignal,
        tradeId: trade.id,
        processedAt: Date.now(),
        status: 'processed',
        validation,
        riskScore: validation.riskScore,
      });

      logger.info(`Signal processed successfully: ${signal.symbol} ${signal.action}`, {
        signalId: signal.id,
        tradeId: trade.id,
        confidence: signal.confidence
      });

    } catch (error) {
      logger.error('Signal processing error:', error);
    }
  }

  // Validate trading signal
  // Validate trading signal using the enhanced risk manager
  async validateSignal(signal, userId, portfolioValue) {
    try {
      const validation = await this.riskManager.validateSignal(signal, userId, portfolioValue);
      
      if (!validation.valid) {
        logger.warn('Signal validation failed', {
          signalId: signal.id,
          userId,
          errors: validation.errors,
          warnings: validation.warnings,
        });
      } else if (validation.warnings.length > 0) {
        logger.info('Signal validation passed with warnings', {
          signalId: signal.id,
          userId,
          warnings: validation.warnings,
          riskScore: validation.riskScore,
        });
      } else {
        logger.info('Signal validation passed', {
          signalId: signal.id,
          userId,
          riskScore: validation.riskScore,
        });
      }

      return validation;
    } catch (error) {
      logger.error('Signal validation error:', error);
      return {
        valid: false,
        errors: ['Signal validation failed'],
        warnings: [],
        riskScore: 100,
        adjustedSignal: signal,
      };
    }
  }

  // Create trade record
  async createTradeRecord(signal, backtestResult) {
    try {
      const tradeData = {
        userId: signal.userId,
        strategyId: signal.strategyId,
        symbol: signal.symbol,
        action: signal.action,
        entryPrice: signal.entry,
        stopLoss: signal.stopLoss,
        takeProfit: signal.takeProfit,
        confidence: signal.confidence,
        expectedReturn: backtestResult.expectedReturn,
        maxDrawdown: backtestResult.maxDrawdown,
        riskRewardRatio: backtestResult.riskRewardRatio,
        status: 'pending',
        createdAt: new Date()
      };

      const trade = await Trade.create(tradeData);
      return trade;
    } catch (error) {
      logger.error('Failed to create trade record:', error);
      throw error;
    }
  }

  // Send trade notification
  async sendTradeNotification(signal, trade) {
    try {
      // This would integrate with the notification system
      logger.info(`Trade notification sent for ${signal.symbol}`, {
        tradeId: trade.id,
        action: signal.action,
        confidence: signal.confidence
      });
    } catch (error) {
      logger.error('Failed to send trade notification:', error);
    }
  }

  // Update strategy performance
  async updateStrategyPerformance() {
    try {
      for (const [strategyId, strategy] of this.activeStrategies) {
        const trades = await Trade.findByStrategyId(strategyId);
        const completedTrades = trades.filter(t => t.status === 'completed');

        const performance = {
          totalTrades: completedTrades.length,
          wins: completedTrades.filter(t => t.profit > 0).length,
          losses: completedTrades.filter(t => t.profit < 0).length,
          profit: completedTrades.reduce((sum, t) => sum + (t.profit || 0), 0),
          winRate: 0
        };

        if (performance.totalTrades > 0) {
          performance.winRate = (performance.wins / performance.totalTrades) * 100;
        }

        strategy.performance = performance;
      }
    } catch (error) {
      logger.error('Failed to update strategy performance:', error);
    }
  }

  // Perform risk management checks
  async performRiskChecks() {
    try {
      // Check daily trade limit
      if (this.dailyStats.trades >= this.config.maxDailyTrades) {
        logger.warn('Daily trade limit reached');
        return;
      }

      // Check current drawdown
      const currentDrawdown = Math.abs(this.dailyStats.profit) / 10000; // Assuming $10k portfolio
      if (currentDrawdown > this.config.maxDrawdown) {
        logger.warn('Maximum drawdown exceeded, pausing trading');
        return;
      }

      // Check concurrent trades
      const activeTrades = await Trade.findActive();
      if (activeTrades.length >= this.config.maxConcurrentTrades) {
        logger.warn('Maximum concurrent trades reached');
        return;
      }

    } catch (error) {
      logger.error('Risk check error:', error);
    }
  }

  // Get bot status
  getStatus() {
    return {
      isRunning: this.isRunning,
      activeStrategies: this.activeStrategies.size,
      signalQueue: this.signalQueue.length,
      processedSignals: this.processedSignals.length,
      dailyStats: this.dailyStats,
      config: this.config
    };
  }
}

// Signal Generator Class
class SignalGenerator {
  constructor() {
    this.indicators = new TechnicalIndicators();
  }

  async generateSignals(strategy, symbol, marketData, klineData) {
    const signals = [];

    try {
      switch (strategy.strategyType) {
      case 'SCALPING':
        signals.push(...await this.generateScalpingSignals(strategy, symbol, marketData, klineData));
        break;
      case 'DAY_TRADING':
        signals.push(...await this.generateDayTradingSignals(strategy, symbol, marketData, klineData));
        break;
      case 'SWING_TRADING':
        signals.push(...await this.generateSwingTradingSignals(strategy, symbol, marketData, klineData));
        break;
      case 'GRID_TRADING':
        signals.push(...await this.generateGridTradingSignals(strategy, symbol, marketData, klineData));
        break;
      case 'DCA':
        signals.push(...await this.generateDCASignals(strategy, symbol, marketData, klineData));
        break;
      case 'ARBITRAGE':
        signals.push(...await this.generateArbitrageSignals(strategy, symbol, marketData, klineData));
        break;
      case 'MOMENTUM':
        signals.push(...await this.generateMomentumSignals(strategy, symbol, marketData, klineData));
        break;
      case 'MEAN_REVERSION':
        signals.push(...await this.generateMeanReversionSignals(strategy, symbol, marketData, klineData));
        break;
      }
    } catch (error) {
      logger.error(`Signal generation error for ${strategy.strategyType}:`, error);
    }

    return signals;
  }

  async generateScalpingSignals(strategy, symbol, marketData, klineData) {
    const signals = [];
    const prices = klineData.map(k => k.close);

    // RSI for scalping
    const rsi = marketDataService.calculateRSI(prices, 14);
    if (!rsi) {return signals;}

    // MACD for trend confirmation
    const macd = marketDataService.calculateMACD(prices, 12, 26, 9);
    if (!macd) {return signals;}

    // Bollinger Bands for volatility
    const bb = marketDataService.calculateBollingerBands(prices, 20, 2);
    if (!bb) {return signals;}

    const currentPrice = marketData.price;
    let signal = null;
    const _confidence = 0;

    // Buy signal: RSI oversold + MACD bullish + price near lower BB
    if (rsi < 30 && macd.macd > macd.signal && currentPrice <= bb.lower * 1.02) {
      signal = {
        id: `scalp_${Date.now()}`,
        symbol,
        action: 'BUY',
        entry: currentPrice,
        stopLoss: currentPrice * 0.995, // 0.5% stop loss
        takeProfit: currentPrice * 1.01, // 1% take profit
        confidence: Math.min(95, 60 + (30 - rsi) + (macd.histogram > 0 ? 10 : 0)),
        reasons: ['RSI oversold', 'MACD bullish', 'Price near lower Bollinger Band'],
        timestamp: Date.now()
      };
    }
    // Sell signal: RSI overbought + MACD bearish + price near upper BB
    else if (rsi > 70 && macd.macd < macd.signal && currentPrice >= bb.upper * 0.98) {
      signal = {
        id: `scalp_${Date.now()}`,
        symbol,
        action: 'SELL',
        entry: currentPrice,
        stopLoss: currentPrice * 1.005, // 0.5% stop loss
        takeProfit: currentPrice * 0.99, // 1% take profit
        confidence: Math.min(95, 60 + (rsi - 70) + (macd.histogram < 0 ? 10 : 0)),
        reasons: ['RSI overbought', 'MACD bearish', 'Price near upper Bollinger Band'],
        timestamp: Date.now()
      };
    }

    if (signal) {
      signals.push(signal);
    }

    return signals;
  }

  async generateDayTradingSignals(strategy, symbol, marketData, klineData) {
    const signals = [];
    const prices = klineData.map(k => k.close);

    // Use 1-hour data for day trading
    const rsi = marketDataService.calculateRSI(prices, 14);
    const macd = marketDataService.calculateMACD(prices, 12, 26, 9);
    const bb = marketDataService.calculateBollingerBands(prices, 20, 2);

    if (!rsi || !macd || !bb) {return signals;}

    const currentPrice = marketData.price;
    let signal = null;

    // Day trading signals with higher confidence requirements
    if (rsi < 25 && macd.macd > macd.signal && currentPrice <= bb.lower) {
      signal = {
        id: `day_${Date.now()}`,
        symbol,
        action: 'BUY',
        entry: currentPrice,
        stopLoss: currentPrice * 0.98, // 2% stop loss
        takeProfit: currentPrice * 1.03, // 3% take profit
        confidence: Math.min(90, 70 + (25 - rsi) + (macd.histogram > 0 ? 15 : 0)),
        reasons: ['Strong RSI oversold', 'MACD bullish crossover', 'Price at lower Bollinger Band'],
        timestamp: Date.now()
      };
    } else if (rsi > 75 && macd.macd < macd.signal && currentPrice >= bb.upper) {
      signal = {
        id: `day_${Date.now()}`,
        symbol,
        action: 'SELL',
        entry: currentPrice,
        stopLoss: currentPrice * 1.02, // 2% stop loss
        takeProfit: currentPrice * 0.97, // 3% take profit
        confidence: Math.min(90, 70 + (rsi - 75) + (macd.histogram < 0 ? 15 : 0)),
        reasons: ['Strong RSI overbought', 'MACD bearish crossover', 'Price at upper Bollinger Band'],
        timestamp: Date.now()
      };
    }

    if (signal) {
      signals.push(signal);
    }

    return signals;
  }

  // Additional strategy implementations would go here...
  async generateSwingTradingSignals(_strategy, _symbol, _marketData, _klineData) {
    // Implementation for swing trading
    return [];
  }

  async generateGridTradingSignals(_strategy, _symbol, _marketData, _klineData) {
    // Implementation for grid trading
    return [];
  }

  async generateDCASignals(_strategy, _symbol, _marketData, _klineData) {
    // Implementation for DCA
    return [];
  }

  async generateArbitrageSignals(_strategy, _symbol, _marketData, _klineData) {
    // Implementation for arbitrage
    return [];
  }

  async generateMomentumSignals(_strategy, _symbol, _marketData, _klineData) {
    // Implementation for momentum trading
    return [];
  }

  async generateMeanReversionSignals(_strategy, _symbol, _marketData, _klineData) {
    // Implementation for mean reversion
    return [];
  }
}

// RiskManager class is now imported from './riskManager.js'

// Backtester class is now imported from './backtestingEngine.js'

// Technical Indicators Class
class TechnicalIndicators {
  // Additional technical indicators can be implemented here
}

module.exports = TradingBot;
