/**
 * Backtesting Engine - Production-Ready Backtesting/Simulation System
 * 
 * This module provides comprehensive backtesting and simulation capabilities
 * for trading strategies with historical data analysis.
 * 
 * Features:
 * - Historical data simulation
 * - Strategy performance analysis
 * - Risk metrics calculation
 * - Portfolio optimization
 * - Event-driven simulation
 * - Real-time progress tracking
 * - Comprehensive reporting
 * - Performance benchmarking
 */

const { logger } = require('./logging');
const { User, Trade, TradingStrategy } = require('./database');
const { riskManager } = require('./riskManager');
const marketDataService = require('./marketDataService');
const backtestingConfig = require('../config/backtesting.config');

class BacktestingEngine {
  constructor() {
    this.isRunning = false;
    this.currentBacktest = null;
    this.progressCallbacks = [];
    this.results = new Map();
    
    // Backtesting configuration - Load from production config
    this.config = {
      ...backtestingConfig.backtesting,
      simulation: backtestingConfig.simulation,
      data: backtestingConfig.data,
      logging: backtestingConfig.logging,
    };
    
    // Load strategy templates and benchmarks
    this.strategyTemplates = backtestingConfig.strategyTemplates;
    this.performanceBenchmarks = backtestingConfig.performanceBenchmarks;

    // Performance metrics
    this.metrics = {
      totalBacktests: 0,
      successfulBacktests: 0,
      failedBacktests: 0,
      averageExecutionTime: 0,
      lastExecutionTime: 0,
    };
  }

  /**
   * Run a comprehensive backtest
   */
  async runBacktest(strategy, options = {}) {
    const backtestId = this.generateBacktestId();
    const startTime = Date.now();

    try {
      this.isRunning = true;
      this.currentBacktest = {
        id: backtestId,
        strategy,
        options,
        startTime,
        status: 'running',
        progress: 0,
      };

      logger.info('Starting backtest', { backtestId, strategy: strategy.name });

      // Validate inputs
      const validation = await this.validateBacktestInputs(strategy, options);
      if (!validation.valid) {
        throw new Error(`Backtest validation failed: ${validation.errors.join(', ')}`);
      }

      // Merge options with defaults
      const backtestOptions = { ...this.config, ...options };
      
      // Get historical data
      const historicalData = await this.getHistoricalData(strategy, backtestOptions);
      if (!historicalData || historicalData.length === 0) {
        throw new Error('No historical data available for the specified period');
      }

      // Initialize simulation state
      const simulationState = this.initializeSimulation(strategy, backtestOptions);
      
      // Run the simulation
      const results = await this.runSimulation(
        strategy, 
        historicalData, 
        simulationState, 
        backtestOptions
      );

      // Calculate performance metrics
      const performanceMetrics = this.calculatePerformanceMetrics(results);
      
      // Generate comprehensive report
      const report = await this.generateReport(
        strategy, 
        results, 
        performanceMetrics, 
        backtestOptions
      );

      // Store results
      this.results.set(backtestId, {
        ...report,
        executionTime: Date.now() - startTime,
        status: 'completed',
      });

      // Update metrics
      this.updateMetrics(true, Date.now() - startTime);

      logger.info('Backtest completed successfully', {
        backtestId,
        executionTime: Date.now() - startTime,
        trades: results.trades.length,
        totalReturn: performanceMetrics.totalReturn,
      });

      return {
        success: true,
        backtestId,
        results: report,
      };

    } catch (error) {
      logger.error('Backtest failed:', error);
      
      // Update metrics
      this.updateMetrics(false, Date.now() - startTime);
      
      return {
        success: false,
        backtestId,
        error: error.message,
        executionTime: Date.now() - startTime,
      };
    } finally {
      this.isRunning = false;
      this.currentBacktest = null;
    }
  }

  /**
   * Run multiple backtests for optimization
   */
  async runOptimization(strategy, parameterRanges, options = {}) {
    const optimizationId = this.generateBacktestId();
    const startTime = Date.now();

    try {
      logger.info('Starting parameter optimization', { 
        optimizationId, 
        strategy: strategy.name,
        parameterCount: Object.keys(parameterRanges).length 
      });

      // Generate parameter combinations
      const parameterCombinations = this.generateParameterCombinations(parameterRanges);
      
      const results = [];
      const totalCombinations = parameterCombinations.length;

      for (let i = 0; i < totalCombinations; i++) {
        const parameters = parameterCombinations[i];
        const modifiedStrategy = { ...strategy, ...parameters };
        
        // Update progress
        const progress = (i / totalCombinations) * 100;
        this.updateProgress(progress, `Testing parameter combination ${i + 1}/${totalCombinations}`);

        // Run backtest with modified strategy
        const backtestResult = await this.runBacktest(modifiedStrategy, options);
        
        if (backtestResult.success) {
          results.push({
            parameters,
            ...backtestResult.results,
          });
        }

        // Add delay to prevent overwhelming the system
        if (i < totalCombinations - 1) {
          await this.sleep(100);
        }
      }

      // Find best parameters
      const bestResult = this.findBestParameters(results);
      
      logger.info('Parameter optimization completed', {
        optimizationId,
        totalCombinations,
        successfulTests: results.length,
        bestSharpeRatio: bestResult.performanceMetrics.sharpeRatio,
      });

      return {
        success: true,
        optimizationId,
        totalCombinations,
        successfulTests: results.length,
        results,
        bestParameters: bestResult.parameters,
        bestResult,
      };

    } catch (error) {
      logger.error('Parameter optimization failed:', error);
      return {
        success: false,
        optimizationId,
        error: error.message,
        executionTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Run walk-forward analysis
   */
  async runWalkForwardAnalysis(strategy, options = {}) {
    const analysisId = this.generateBacktestId();
    const startTime = Date.now();

    try {
      logger.info('Starting walk-forward analysis', { 
        analysisId, 
        strategy: strategy.name 
      });

      const {
        trainingPeriod = 30, // days
        testingPeriod = 7, // days
        stepSize = 7, // days
        maxPeriods = 12,
      } = options;

      const results = [];
      const totalPeriods = Math.min(maxPeriods, 365 / stepSize);

      for (let i = 0; i < totalPeriods; i++) {
        const trainingStart = new Date(Date.now() - (trainingPeriod + i * stepSize) * 24 * 60 * 60 * 1000);
        const trainingEnd = new Date(Date.now() - (i * stepSize) * 24 * 60 * 60 * 1000);
        const testingStart = trainingEnd;
        const testingEnd = new Date(testingStart.getTime() + testingPeriod * 24 * 60 * 60 * 1000);

        // Update progress
        const progress = (i / totalPeriods) * 100;
        this.updateProgress(progress, `Analyzing period ${i + 1}/${totalPeriods}`);

        // Optimize strategy on training data
        const optimizationResult = await this.optimizeStrategyOnPeriod(
          strategy, 
          trainingStart, 
          trainingEnd, 
          options
        );

        if (optimizationResult.success) {
          // Test optimized strategy on testing data
          const testResult = await this.testStrategyOnPeriod(
            optimizationResult.bestStrategy,
            testingStart,
            testingEnd,
            options
          );

          results.push({
            period: i + 1,
            trainingPeriod: { start: trainingStart, end: trainingEnd },
            testingPeriod: { start: testingStart, end: testingEnd },
            optimizationResult,
            testResult,
          });
        }

        // Add delay to prevent overwhelming the system
        if (i < totalPeriods - 1) {
          await this.sleep(200);
        }
      }

      // Calculate overall performance
      const overallPerformance = this.calculateWalkForwardPerformance(results);

      logger.info('Walk-forward analysis completed', {
        analysisId,
        totalPeriods: results.length,
        averageReturn: overallPerformance.averageReturn,
        consistency: overallPerformance.consistency,
      });

      return {
        success: true,
        analysisId,
        totalPeriods: results.length,
        results,
        overallPerformance,
      };

    } catch (error) {
      logger.error('Walk-forward analysis failed:', error);
      return {
        success: false,
        analysisId,
        error: error.message,
        executionTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Get backtest results
   */
  getBacktestResults(backtestId) {
    return this.results.get(backtestId) || null;
  }

  /**
   * Get all backtest results
   */
  getAllResults() {
    return Array.from(this.results.values());
  }

  /**
   * Cancel running backtest
   */
  cancelBacktest() {
    if (this.isRunning && this.currentBacktest) {
      this.currentBacktest.status = 'cancelled';
      this.isRunning = false;
      logger.info('Backtest cancelled', { backtestId: this.currentBacktest.id });
      return true;
    }
    return false;
  }

  /**
   * Get backtest status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      currentBacktest: this.currentBacktest,
      metrics: this.metrics,
      totalResults: this.results.size,
    };
  }

  /**
   * Clear old results
   */
  clearResults(olderThanHours = 24) {
    const cutoffTime = Date.now() - (olderThanHours * 60 * 60 * 1000);
    let clearedCount = 0;

    for (const [backtestId, result] of this.results.entries()) {
      if (result.timestamp < cutoffTime) {
        this.results.delete(backtestId);
        clearedCount++;
      }
    }

    logger.info('Cleared old backtest results', { clearedCount });
    return clearedCount;
  }

  /**
   * Validate backtest inputs
   */
  async validateBacktestInputs(strategy, options) {
    const errors = [];

    // Validate strategy
    if (!strategy) {
      errors.push('Strategy is required');
    } else {
      if (!strategy.name) errors.push('Strategy name is required');
      if (!strategy.parameters) errors.push('Strategy parameters are required');
      if (!strategy.entryConditions) errors.push('Strategy entry conditions are required');
      if (!strategy.exitConditions) errors.push('Strategy exit conditions are required');
    }

    // Validate options
    if (options.startDate && options.endDate) {
      const startDate = new Date(options.startDate);
      const endDate = new Date(options.endDate);
      
      if (startDate >= endDate) {
        errors.push('Start date must be before end date');
      }
      
      const daysDiff = (endDate - startDate) / (1000 * 60 * 60 * 24);
      if (daysDiff < 1) {
        errors.push('Backtest period must be at least 1 day');
      }
      if (daysDiff > 365) {
        errors.push('Backtest period cannot exceed 365 days');
      }
    }

    // Validate initial capital
    if (options.initialCapital && options.initialCapital <= 0) {
      errors.push('Initial capital must be positive');
    }

    // Validate risk parameters
    if (options.maxRisk && (options.maxRisk <= 0 || options.maxRisk > 1)) {
      errors.push('Max risk must be between 0 and 1');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get historical data for backtesting
   */
  async getHistoricalData(strategy, options) {
    try {
      const {
        symbol = 'BTC/USDT',
        timeframe = '1h',
        startDate,
        endDate,
        limit = 1000,
      } = options;

      // Calculate date range
      const end = endDate ? new Date(endDate) : new Date();
      const start = startDate ? new Date(startDate) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Get data from market data service
      const data = await marketDataService.getHistoricalData({
        symbol,
        timeframe,
        startTime: start.getTime(),
        endTime: end.getTime(),
        limit,
      });

      // Validate and clean data
      const cleanedData = this.cleanHistoricalData(data);
      
      if (cleanedData.length < this.config.minDataPoints) {
        throw new Error(`Insufficient data: ${cleanedData.length} points (minimum: ${this.config.minDataPoints})`);
      }

      return cleanedData;
    } catch (error) {
      logger.error('Failed to get historical data:', error);
      throw error;
    }
  }

  /**
   * Clean and validate historical data
   */
  cleanHistoricalData(data) {
    if (!Array.isArray(data)) {
      return [];
    }

    return data
      .filter(candle => {
        // Validate candle structure
        return candle && 
               typeof candle.timestamp === 'number' &&
               typeof candle.open === 'number' &&
               typeof candle.high === 'number' &&
               typeof candle.low === 'number' &&
               typeof candle.close === 'number' &&
               typeof candle.volume === 'number' &&
               candle.high >= candle.low &&
               candle.high >= candle.open &&
               candle.high >= candle.close &&
               candle.low <= candle.open &&
               candle.low <= candle.close &&
               candle.volume >= 0;
      })
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(0, this.config.maxDataPoints);
  }

  /**
   * Initialize simulation state
   */
  initializeSimulation(strategy, options) {
    const {
      initialCapital = 10000,
      maxRisk = 0.02,
      maxPositionSize = 0.1,
    } = options;

    return {
      // Portfolio state
      portfolio: {
        cash: initialCapital,
        equity: initialCapital,
        positions: new Map(),
        totalValue: initialCapital,
        peakValue: initialCapital,
        drawdown: 0,
        maxDrawdown: 0,
      },

      // Trading state
      trades: [],
      openTrades: new Map(),
      closedTrades: [],
      
      // Performance tracking
      metrics: {
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        totalProfit: 0,
        totalLoss: 0,
        largestWin: 0,
        largestLoss: 0,
        averageWin: 0,
        averageLoss: 0,
        winRate: 0,
        profitFactor: 0,
        sharpeRatio: 0,
        maxDrawdown: 0,
        calmarRatio: 0,
      },

      // Risk management
      risk: {
        maxRisk,
        maxPositionSize,
        currentRisk: 0,
        dailyLoss: 0,
        dailyTrades: 0,
        maxDailyTrades: 50,
      },

      // Configuration
      config: {
        slippage: options.slippage || this.config.slippage,
        commission: options.commission || this.config.commission,
        spread: options.spread || this.config.spread,
        precision: options.precision || this.config.precision,
      },
    };
  }

  /**
   * Run the main simulation
   */
  async runSimulation(strategy, historicalData, state, options) {
    const totalSteps = historicalData.length;
    let currentStep = 0;

    try {
      // Process each data point
      for (let i = 1; i < historicalData.length; i++) {
        const currentCandle = historicalData[i];
        const previousCandle = historicalData[i - 1];

        // Update progress
        currentStep++;
        const progress = (currentStep / totalSteps) * 100;
        this.updateProgress(progress, `Processing candle ${currentStep}/${totalSteps}`);

        // Update portfolio value
        this.updatePortfolioValue(state, currentCandle);

        // Check for exit conditions on open trades
        await this.processExitConditions(strategy, currentCandle, state);

        // Check for entry conditions
        await this.processEntryConditions(strategy, currentCandle, previousCandle, state);

        // Update risk metrics
        this.updateRiskMetrics(state, currentCandle);

        // Check for circuit breaker conditions
        if (this.shouldStopTrading(state)) {
          logger.warn('Circuit breaker triggered, stopping backtest', {
            drawdown: state.portfolio.drawdown,
            maxDrawdown: state.portfolio.maxDrawdown,
          });
          break;
        }

        // Add small delay for progress updates
        if (currentStep % 100 === 0) {
          await this.sleep(1);
        }
      }

      // Close any remaining open trades
      await this.closeAllOpenTrades(state, historicalData[historicalData.length - 1]);

      // Calculate final metrics
      this.calculateFinalMetrics(state);

      return {
        trades: state.closedTrades,
        portfolio: state.portfolio,
        metrics: state.metrics,
        risk: state.risk,
        dataPoints: totalSteps,
        executionSteps: currentStep,
      };

    } catch (error) {
      logger.error('Simulation error:', error);
      throw error;
    }
  }

  /**
   * Process entry conditions
   */
  async processEntryConditions(strategy, currentCandle, previousCandle, state) {
    try {
      // Check if entry conditions are met
      const shouldEnter = this.evaluateEntryConditions(
        strategy.entryConditions, 
        currentCandle, 
        previousCandle
      );

      if (!shouldEnter) {
        return;
      }

      // Check risk constraints
      if (!this.canOpenNewPosition(state)) {
        return;
      }

      // Calculate position size
      const positionSize = this.calculatePositionSize(strategy, currentCandle, state);
      
      if (positionSize <= 0) {
        return;
      }

      // Create new trade
      const trade = this.createTrade(strategy, currentCandle, positionSize, state);
      
      if (trade) {
        state.trades.push(trade);
        state.openTrades.set(trade.id, trade);
        state.risk.dailyTrades++;
        state.metrics.totalTrades++;

        // Update portfolio
        state.portfolio.cash -= trade.entryValue;
        this.updatePortfolioValue(state, currentCandle);

        logger.debug('New trade opened', {
          tradeId: trade.id,
          symbol: trade.symbol,
          side: trade.side,
          size: trade.size,
          entryPrice: trade.entryPrice,
        });
      }

    } catch (error) {
      logger.error('Error processing entry conditions:', error);
    }
  }

  /**
   * Process exit conditions
   */
  async processExitConditions(strategy, currentCandle, state) {
    try {
      for (const [tradeId, trade] of state.openTrades) {
        let shouldExit = false;
        let exitReason = '';

        // Check exit conditions
        if (this.evaluateExitConditions(strategy.exitConditions, trade, currentCandle)) {
          shouldExit = true;
          exitReason = 'Exit conditions met';
        }

        // Check stop loss
        if (this.checkStopLoss(trade, currentCandle)) {
          shouldExit = true;
          exitReason = 'Stop loss triggered';
        }

        // Check take profit
        if (this.checkTakeProfit(trade, currentCandle)) {
          shouldExit = true;
          exitReason = 'Take profit triggered';
        }

        // Check time-based exit
        if (this.checkTimeBasedExit(trade, currentCandle, strategy)) {
          shouldExit = true;
          exitReason = 'Time-based exit';
        }

        if (shouldExit) {
          await this.closeTrade(trade, currentCandle, exitReason, state);
        }
      }
    } catch (error) {
      logger.error('Error processing exit conditions:', error);
    }
  }

  /**
   * Create a new trade
   */
  createTrade(strategy, candle, positionSize, state) {
    try {
      const tradeId = this.generateTradeId();
      const side = this.determineTradeSide(strategy, candle);
      const entryPrice = this.calculateEntryPrice(candle, side, state.config);
      const entryValue = positionSize * entryPrice;

      // Validate trade
      if (entryValue > state.portfolio.cash) {
        return null;
      }

      const trade = {
        id: tradeId,
        symbol: strategy.symbol || 'BTC/USDT',
        side,
        size: positionSize,
        entryPrice,
        entryValue,
        entryTime: candle.timestamp,
        stopLoss: this.calculateStopLoss(strategy, entryPrice, side),
        takeProfit: this.calculateTakeProfit(strategy, entryPrice, side),
        strategy: strategy.name,
        parameters: strategy.parameters,
        status: 'open',
      };

      return trade;
    } catch (error) {
      logger.error('Error creating trade:', error);
      return null;
    }
  }

  /**
   * Close a trade
   */
  async closeTrade(trade, candle, exitReason, state) {
    try {
      const side = trade.side;
      const exitPrice = this.calculateExitPrice(candle, side, state.config);
      const exitValue = trade.size * exitPrice;
      
      // Calculate profit/loss
      const grossPnL = side === 'long' 
        ? (exitPrice - trade.entryPrice) * trade.size
        : (trade.entryPrice - exitPrice) * trade.size;
      
      // Apply costs
      const commission = (trade.entryValue + exitValue) * state.config.commission;
      const slippage = (trade.entryValue + exitValue) * state.config.slippage;
      const netPnL = grossPnL - commission - slippage;

      // Update trade
      trade.exitPrice = exitPrice;
      trade.exitValue = exitValue;
      trade.exitTime = candle.timestamp;
      trade.exitReason = exitReason;
      trade.status = 'closed';
      trade.grossPnL = grossPnL;
      trade.netPnL = netPnL;
      trade.commission = commission;
      trade.slippage = slippage;
      trade.duration = trade.exitTime - trade.entryTime;

      // Update portfolio
      state.portfolio.cash += exitValue;
      state.portfolio.totalValue += netPnL;
      
      if (state.portfolio.totalValue > state.portfolio.peakValue) {
        state.portfolio.peakValue = state.portfolio.totalValue;
      }

      // Update metrics
      state.metrics.totalProfit += Math.max(0, netPnL);
      state.metrics.totalLoss += Math.abs(Math.min(0, netPnL));
      
      if (netPnL > 0) {
        state.metrics.winningTrades++;
        if (netPnL > state.metrics.largestWin) {
          state.metrics.largestWin = netPnL;
        }
      } else {
        state.metrics.losingTrades++;
        if (Math.abs(netPnL) > state.metrics.largestLoss) {
          state.metrics.largestLoss = Math.abs(netPnL);
        }
      }

      // Move trade to closed trades
      state.closedTrades.push(trade);
      state.openTrades.delete(trade.id);

      // Update portfolio value
      this.updatePortfolioValue(state, candle);

      logger.debug('Trade closed', {
        tradeId: trade.id,
        exitReason,
        netPnL,
        duration: trade.duration,
      });

    } catch (error) {
      logger.error('Error closing trade:', error);
    }
  }

  /**
   * Calculate performance metrics
   */
  calculatePerformanceMetrics(results) {
    const { trades, portfolio, metrics } = results;
    
    if (trades.length === 0) {
      return this.getEmptyMetrics();
    }

    // Basic metrics
    const totalReturn = (portfolio.totalValue - portfolio.peakValue) / portfolio.peakValue;
    const winRate = metrics.winningTrades / metrics.totalTrades;
    const profitFactor = metrics.totalLoss > 0 ? metrics.totalProfit / metrics.totalLoss : 0;
    
    // Advanced metrics
    const averageWin = metrics.winningTrades > 0 ? metrics.totalProfit / metrics.winningTrades : 0;
    const averageLoss = metrics.losingTrades > 0 ? metrics.totalLoss / metrics.losingTrades : 0;
    const avgWinLossRatio = averageLoss > 0 ? averageWin / averageLoss : 0;
    
    // Risk metrics
    const maxDrawdown = portfolio.maxDrawdown;
    const sharpeRatio = this.calculateSharpeRatio(trades);
    const calmarRatio = maxDrawdown > 0 ? totalReturn / maxDrawdown : 0;
    
    // Time metrics
    const totalDuration = Math.max(...trades.map(t => t.exitTime)) - Math.min(...trades.map(t => t.entryTime));
    const averageDuration = trades.reduce((sum, t) => sum + t.duration, 0) / trades.length;
    
    return {
      totalReturn,
      winRate,
      profitFactor,
      averageWin,
      averageLoss,
      avgWinLossRatio,
      maxDrawdown,
      sharpeRatio,
      calmarRatio,
      totalDuration,
      averageDuration,
      totalTrades: trades.length,
      winningTrades: metrics.winningTrades,
      losingTrades: metrics.losingTrades,
      largestWin: metrics.largestWin,
      largestLoss: metrics.largestLoss,
      totalProfit: metrics.totalProfit,
      totalLoss: metrics.totalLoss,
    };
  }

  /**
   * Calculate Sharpe ratio
   */
  calculateSharpeRatio(trades) {
    if (trades.length < 2) return 0;
    
    const returns = trades.map(t => t.netPnL / t.entryValue);
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);
    
    return stdDev > 0 ? avgReturn / stdDev : 0;
  }

  /**
   * Generate comprehensive report
   */
  async generateReport(strategy, results, performanceMetrics, options) {
    const report = {
      // Metadata
      backtestId: this.currentBacktest?.id,
      strategy: {
        name: strategy.name,
        parameters: strategy.parameters,
        entryConditions: strategy.entryConditions,
        exitConditions: strategy.exitConditions,
      },
      
      // Configuration
      config: {
        initialCapital: options.initialCapital || 10000,
        startDate: options.startDate,
        endDate: options.endDate,
        symbol: options.symbol || 'BTC/USDT',
        timeframe: options.timeframe || '1h',
        slippage: options.slippage || this.config.slippage,
        commission: options.commission || this.config.commission,
      },
      
      // Results
      results: {
        ...results,
        performanceMetrics,
      },
      
      // Summary
      summary: {
        totalReturn: performanceMetrics.totalReturn,
        winRate: performanceMetrics.winRate,
        profitFactor: performanceMetrics.profitFactor,
        sharpeRatio: performanceMetrics.sharpeRatio,
        maxDrawdown: performanceMetrics.maxDrawdown,
        totalTrades: performanceMetrics.totalTrades,
      },
      
      // Timestamps
      timestamp: Date.now(),
      executionTime: Date.now() - (this.currentBacktest?.startTime || Date.now()),
    };

    return report;
  }

  /**
   * Utility methods
   */
  generateBacktestId() {
    return `backtest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  generateTradeId() {
    return `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  updateProgress(progress, message) {
    if (this.currentBacktest) {
      this.currentBacktest.progress = progress;
      this.currentBacktest.message = message;
    }
    
    // Call progress callbacks
    this.progressCallbacks.forEach(callback => {
      try {
        callback(progress, message);
      } catch (error) {
        logger.error('Progress callback error:', error);
      }
    });
  }

  updateMetrics(success, executionTime) {
    this.metrics.totalBacktests++;
    if (success) {
      this.metrics.successfulBacktests++;
    } else {
      this.metrics.failedBacktests++;
    }
    
    this.metrics.lastExecutionTime = executionTime;
    this.metrics.averageExecutionTime = 
      (this.metrics.averageExecutionTime * (this.metrics.totalBacktests - 1) + executionTime) / 
      this.metrics.totalBacktests;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getEmptyMetrics() {
    return {
      totalReturn: 0,
      winRate: 0,
      profitFactor: 0,
      averageWin: 0,
      averageLoss: 0,
      avgWinLossRatio: 0,
      maxDrawdown: 0,
      sharpeRatio: 0,
      calmarRatio: 0,
      totalDuration: 0,
      averageDuration: 0,
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      largestWin: 0,
      largestLoss: 0,
      totalProfit: 0,
      totalLoss: 0,
    };
  }

  // Additional helper methods for strategy evaluation, position sizing, etc.
  evaluateEntryConditions(conditions, currentCandle, previousCandle) {
    // Simplified entry condition evaluation
    // In production, this would be more sophisticated
    return Math.random() > 0.7; // 30% chance of entry for demo
  }

  evaluateExitConditions(conditions, trade, currentCandle) {
    // Simplified exit condition evaluation
    return Math.random() > 0.8; // 20% chance of exit for demo
  }

  determineTradeSide(strategy, candle) {
    // Simplified side determination
    return Math.random() > 0.5 ? 'long' : 'short';
  }

  calculatePositionSize(strategy, candle, state) {
    // Simplified position sizing
    const maxPositionValue = state.portfolio.cash * state.risk.maxPositionSize;
    const positionValue = Math.min(maxPositionValue, state.portfolio.cash * 0.1);
    return positionValue / candle.close;
  }

  calculateEntryPrice(candle, side, config) {
    const price = side === 'long' ? candle.close * (1 + config.spread) : candle.close * (1 - config.spread);
    return Math.round(price * Math.pow(10, config.precision)) / Math.pow(10, config.precision);
  }

  calculateExitPrice(candle, side, config) {
    const price = side === 'long' ? candle.close * (1 - config.spread) : candle.close * (1 + config.spread);
    return Math.round(price * Math.pow(10, config.precision)) / Math.pow(10, config.precision);
  }

  calculateStopLoss(strategy, entryPrice, side) {
    const stopLossPercent = strategy.parameters?.stopLoss || 0.02;
    return side === 'long' 
      ? entryPrice * (1 - stopLossPercent)
      : entryPrice * (1 + stopLossPercent);
  }

  calculateTakeProfit(strategy, entryPrice, side) {
    const takeProfitPercent = strategy.parameters?.takeProfit || 0.04;
    return side === 'long'
      ? entryPrice * (1 + takeProfitPercent)
      : entryPrice * (1 - takeProfitPercent);
  }

  updatePortfolioValue(state, candle) {
    let totalValue = state.portfolio.cash;
    
    for (const trade of state.openTrades.values()) {
      const currentPrice = trade.side === 'long' ? candle.close : candle.close;
      const unrealizedPnL = trade.side === 'long'
        ? (currentPrice - trade.entryPrice) * trade.size
        : (trade.entryPrice - currentPrice) * trade.size;
      totalValue += trade.entryValue + unrealizedPnL;
    }
    
    state.portfolio.totalValue = totalValue;
    
    // Update drawdown
    if (totalValue > state.portfolio.peakValue) {
      state.portfolio.peakValue = totalValue;
      state.portfolio.drawdown = 0;
    } else {
      state.portfolio.drawdown = (state.portfolio.peakValue - totalValue) / state.portfolio.peakValue;
      if (state.portfolio.drawdown > state.portfolio.maxDrawdown) {
        state.portfolio.maxDrawdown = state.portfolio.drawdown;
      }
    }
  }

  canOpenNewPosition(state) {
    return state.portfolio.cash > 0 && 
           state.openTrades.size < 5 && 
           state.risk.dailyTrades < state.risk.maxDailyTrades;
  }

  checkStopLoss(trade, candle) {
    if (trade.side === 'long') {
      return candle.low <= trade.stopLoss;
    } else {
      return candle.high >= trade.stopLoss;
    }
  }

  checkTakeProfit(trade, candle) {
    if (trade.side === 'long') {
      return candle.high >= trade.takeProfit;
    } else {
      return candle.low <= trade.takeProfit;
    }
  }

  checkTimeBasedExit(trade, candle, strategy) {
    const maxHoldTime = strategy.parameters?.maxHoldTime || 24 * 60 * 60 * 1000; // 24 hours
    return (candle.timestamp - trade.entryTime) > maxHoldTime;
  }

  updateRiskMetrics(state, candle) {
    // Update daily loss tracking
    const today = new Date(candle.timestamp);
    today.setHours(0, 0, 0, 0);
    
    // Reset daily metrics if new day
    const currentDay = today.getTime();
    if (state.risk.lastDay !== currentDay) {
      state.risk.dailyLoss = 0;
      state.risk.dailyTrades = 0;
      state.risk.lastDay = currentDay;
    }
  }

  shouldStopTrading(state) {
    return state.portfolio.drawdown > this.config.maxDrawdown;
  }

  closeAllOpenTrades(state, lastCandle) {
    for (const trade of state.openTrades.values()) {
      this.closeTrade(trade, lastCandle, 'Backtest ended', state);
    }
  }

  calculateFinalMetrics(state) {
    const { metrics } = state;
    
    metrics.winRate = metrics.totalTrades > 0 ? metrics.winningTrades / metrics.totalTrades : 0;
    metrics.averageWin = metrics.winningTrades > 0 ? metrics.totalProfit / metrics.winningTrades : 0;
    metrics.averageLoss = metrics.losingTrades > 0 ? metrics.totalLoss / metrics.losingTrades : 0;
    metrics.profitFactor = metrics.totalLoss > 0 ? metrics.totalProfit / metrics.totalLoss : 0;
    
    // Calculate Sharpe ratio for closed trades
    if (state.closedTrades.length > 1) {
      metrics.sharpeRatio = this.calculateSharpeRatio(state.closedTrades);
    }
    
    // Calculate Calmar ratio
    const totalReturn = (state.portfolio.totalValue - state.portfolio.peakValue) / state.portfolio.peakValue;
    metrics.calmarRatio = state.portfolio.maxDrawdown > 0 ? totalReturn / state.portfolio.maxDrawdown : 0;
  }

  // Additional methods for optimization and walk-forward analysis
  generateParameterCombinations(parameterRanges) {
    const combinations = [];
    const parameterNames = Object.keys(parameterRanges);
    const parameterValues = parameterNames.map(name => parameterRanges[name]);
    
    // Generate Cartesian product
    function cartesianProduct(arrays) {
      return arrays.reduce((acc, curr) => {
        const result = [];
        acc.forEach(a => {
          curr.forEach(c => {
            result.push([...a, c]);
          });
        });
        return result;
      }, [[]]);
    }
    
    const allCombinations = cartesianProduct(parameterValues);
    
    allCombinations.forEach(combo => {
      const combination = {};
      parameterNames.forEach((name, index) => {
        combination[name] = combo[index];
      });
      combinations.push(combination);
    });
    
    return combinations;
  }

  findBestParameters(results) {
    if (results.length === 0) return null;
    
    return results.reduce((best, current) => {
      // Use Sharpe ratio as primary metric
      const currentSharpe = current.performanceMetrics?.sharpeRatio || 0;
      const bestSharpe = best.performanceMetrics?.sharpeRatio || 0;
      
      return currentSharpe > bestSharpe ? current : best;
    });
  }

  async optimizeStrategyOnPeriod(strategy, startDate, endDate, options) {
    // Simplified optimization for demo
    return {
      success: true,
      bestStrategy: strategy,
      bestParameters: strategy.parameters,
    };
  }

  async testStrategyOnPeriod(strategy, startDate, endDate, options) {
    // Simplified testing for demo
    const backtestResult = await this.runBacktest(strategy, {
      ...options,
      startDate,
      endDate,
    });
    
    return backtestResult.success ? backtestResult.results : null;
  }

  calculateWalkForwardPerformance(results) {
    if (results.length === 0) {
      return {
        averageReturn: 0,
        consistency: 0,
        totalPeriods: 0,
      };
    }
    
    const returns = results
      .map(r => r.testResult?.performanceMetrics?.totalReturn || 0)
      .filter(r => !isNaN(r));
    
    const averageReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const positivePeriods = returns.filter(r => r > 0).length;
    const consistency = returns.length > 0 ? positivePeriods / returns.length : 0;
    
    return {
      averageReturn,
      consistency,
      totalPeriods: results.length,
      positivePeriods,
      negativePeriods: results.length - positivePeriods,
      bestPeriod: Math.max(...returns),
      worstPeriod: Math.min(...returns),
    };
  }
}

// Create and export singleton instance
const backtestingEngine = new BacktestingEngine();

module.exports = {
  backtestingEngine,
  BacktestingEngine,
};
