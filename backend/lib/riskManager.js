/**
 * Risk Management Service - Production-Ready Risk/Safety/Validation Logic
 * 
 * This service provides comprehensive risk management, safety validation,
 * and threat detection for the CryptoPulse trading platform.
 * 
 * Features:
 * - Signal validation and risk assessment
 * - Portfolio risk management
 * - Position sizing optimization
 * - Drawdown protection
 * - Daily limits enforcement
 * - Correlation risk analysis
 * - Market risk assessment
 * - Circuit breaker pattern
 * - Resource management
 * - Threat detection and anomaly monitoring
 */

const { logger } = require('./logging');
const { User, Trade, TradingStrategy, ExchangeConfig } = require('./database');
const { performance } = require('./performance');
const riskConfig = require('../config/risk.config');

class RiskManager {
  constructor() {
    // Risk Configuration - Load from production config
    this.config = {
      ...riskConfig.risk,
      monitoring: riskConfig.monitoring,
      logging: riskConfig.logging,
    };

    // Risk Tracking
    this.dailyMetrics = {
      trades: 0,
      totalRisk: 0,
      realizedPnL: 0,
      unrealizedPnL: 0,
      maxDrawdown: 0,
      startTime: Date.now(),
    };

    // Risk Alerts
    this.alerts = [];
    this.riskLevels = {
      LOW: 0.5,
      MEDIUM: 1.0,
      HIGH: 2.0,
      CRITICAL: 5.0,
    };

    // Circuit Breaker State
    this.circuitBreakerState = {
      isOpen: false,
      failureCount: 0,
      lastFailureTime: null,
      timeout: null,
    };

    // Resource Monitoring
    this.resourceMetrics = {
      memoryUsage: 0,
      cpuUsage: 0,
      activeConnections: 0,
      requestsPerMinute: 0,
      lastUpdate: Date.now(),
    };

    // Threat Detection
    this.threatMetrics = {
      suspiciousActivities: [],
      failedAttempts: new Map(),
      anomalies: [],
      lastAnalysis: Date.now(),
    };

    // Initialize monitoring
    this.initializeMonitoring();
  }

  /**
   * Initialize risk monitoring systems
   */
  initializeMonitoring() {
    // Start periodic risk monitoring with configurable intervals
    setInterval(() => {
      this.monitorRiskMetrics();
    }, this.config.monitoring.riskMonitoringInterval);

    // Start resource monitoring
    setInterval(() => {
      this.monitorResources();
    }, this.config.monitoring.resourceMonitoringInterval);

    // Start threat detection
    setInterval(() => {
      this.detectThreats();
    }, this.config.monitoring.threatDetectionInterval);

    // Start circuit breaker monitoring
    setInterval(() => {
      this.monitorCircuitBreaker();
    }, this.config.monitoring.circuitBreakerMonitoringInterval);

    logger.info('Risk monitoring systems initialized');
  }

  /**
   * Comprehensive signal validation
   */
  async validateSignal(signal, userId, portfolioValue) {
    const validation = {
      valid: true,
      warnings: [],
      errors: [],
      riskScore: 0,
      adjustedSignal: { ...signal },
      metadata: {
        validationTime: Date.now(),
        userId,
        signalId: signal.id,
      },
    };

    try {
      // Check circuit breaker
      if (this.circuitBreakerState.isOpen) {
        validation.valid = false;
        validation.errors.push('Circuit breaker is open - trading suspended');
        return validation;
      }

      // 1. Basic signal validation
      const basicValidation = this.validateBasicSignal(signal);
      if (!basicValidation.valid) {
        validation.valid = false;
        validation.errors.push(...basicValidation.errors);
        return validation;
      }

      // 2. Portfolio risk assessment
      const portfolioRisk = await this.assessPortfolioRisk(userId, signal, portfolioValue);
      validation.warnings.push(...portfolioRisk.warnings);
      if (!portfolioRisk.valid) {
        validation.valid = false;
        validation.errors.push(...portfolioRisk.errors);
      }

      // 3. Position sizing validation
      const positionValidation = this.validatePositionSize(signal, portfolioValue);
      validation.warnings.push(...positionValidation.warnings);
      if (!positionValidation.valid) {
        validation.valid = false;
        validation.errors.push(...positionValidation.errors);
      } else {
        validation.adjustedSignal = positionValidation.adjustedSignal;
      }

      // 4. Correlation risk assessment
      const correlationRisk = await this.assessCorrelationRisk(userId, signal);
      validation.warnings.push(...correlationRisk.warnings);
      if (!correlationRisk.valid) {
        validation.valid = false;
        validation.errors.push(...correlationRisk.errors);
      }

      // 5. Market risk assessment
      const marketRisk = await this.assessMarketRisk(signal);
      validation.warnings.push(...marketRisk.warnings);
      if (!marketRisk.valid) {
        validation.valid = false;
        validation.errors.push(...marketRisk.errors);
      }

      // 6. Calculate overall risk score
      validation.riskScore = this.calculateRiskScore(signal, portfolioRisk, marketRisk);

      // 7. Daily limits check
      const dailyLimits = await this.checkDailyLimits(userId);
      if (!dailyLimits.valid) {
        validation.valid = false;
        validation.errors.push(...dailyLimits.errors);
      }

      // 8. Drawdown protection
      const drawdownCheck = await this.checkDrawdownProtection(userId);
      if (!drawdownCheck.valid) {
        validation.valid = false;
        validation.errors.push(...drawdownCheck.errors);
      }

      // 9. Threat detection
      const threatCheck = await this.checkThreats(userId, signal);
      if (!threatCheck.valid) {
        validation.valid = false;
        validation.errors.push(...threatCheck.errors);
      }

      // 10. Resource availability check
      const resourceCheck = this.checkResourceAvailability();
      if (!resourceCheck.valid) {
        validation.valid = false;
        validation.errors.push(...resourceCheck.errors);
      }

      logger.info('Signal risk validation completed', {
        signalId: signal.id,
        userId,
        valid: validation.valid,
        riskScore: validation.riskScore,
        warnings: validation.warnings.length,
        errors: validation.errors.length,
      });

      return validation;
    } catch (error) {
      logger.error('Risk validation error:', error);
      validation.valid = false;
      validation.errors.push('Risk validation failed');
      return validation;
    }
  }

  /**
   * Basic signal validation
   */
  validateBasicSignal(signal) {
    const validation = { valid: true, errors: [] };

    // Required fields
    if (!signal.symbol || !signal.action || !signal.entry || !signal.stopLoss || !signal.takeProfit) {
      validation.valid = false;
      validation.errors.push('Missing required signal fields');
    }

    // Action validation
    if (!['BUY', 'SELL'].includes(signal.action)) {
      validation.valid = false;
      validation.errors.push('Invalid signal action');
    }

    // Price validation
    if (signal.entry <= 0 || signal.stopLoss <= 0 || signal.takeProfit <= 0) {
      validation.valid = false;
      validation.errors.push('Invalid price values');
    }

    // Confidence validation
    if (signal.confidence < 0 || signal.confidence > 100) {
      validation.valid = false;
      validation.errors.push('Invalid confidence value');
    }

    // Stop loss and take profit logic
    if (signal.action === 'BUY') {
      if (signal.stopLoss >= signal.entry || signal.takeProfit <= signal.entry) {
        validation.valid = false;
        validation.errors.push('Invalid BUY signal stop loss or take profit');
      }
    } else {
      if (signal.stopLoss <= signal.entry || signal.takeProfit >= signal.entry) {
        validation.valid = false;
        validation.errors.push('Invalid SELL signal stop loss or take profit');
      }
    }

    // Symbol validation
    if (!this.isValidSymbol(signal.symbol)) {
      validation.valid = false;
      validation.errors.push('Invalid trading symbol');
    }

    // Timestamp validation
    if (signal.timestamp && new Date(signal.timestamp) > new Date()) {
      validation.valid = false;
      validation.errors.push('Future timestamp not allowed');
    }

    return validation;
  }

  /**
   * Portfolio risk assessment
   */
  async assessPortfolioRisk(userId, signal, portfolioValue) {
    const assessment = { valid: true, warnings: [], errors: [] };

    try {
      // Get current positions
      const activeTrades = await Trade.findActiveByUser(userId);
      const totalExposure = activeTrades.reduce((sum, trade) => sum + trade.positionSize, 0);

      // Check total exposure
      const exposureRatio = totalExposure / portfolioValue;
      if (exposureRatio > this.config.maxPositionSize) {
        assessment.valid = false;
        assessment.errors.push(`Total exposure exceeds limit: ${(exposureRatio * 100).toFixed(1)}%`);
      } else if (exposureRatio > this.config.maxPositionSize * 0.8) {
        assessment.warnings.push(`High exposure: ${(exposureRatio * 100).toFixed(1)}%`);
      }

      // Check number of concurrent trades
      if (activeTrades.length >= this.config.maxConcurrentTrades) {
        assessment.valid = false;
        assessment.errors.push(`Maximum concurrent trades reached: ${activeTrades.length}`);
      }

      // Check risk per trade
      const tradeRisk = this.calculateTradeRisk(signal, portfolioValue);
      if (tradeRisk > this.config.maxRiskPerTrade) {
        assessment.valid = false;
        assessment.errors.push(`Trade risk exceeds limit: ${(tradeRisk * 100).toFixed(1)}%`);
      }

      // Check portfolio concentration
      const concentration = this.calculatePortfolioConcentration(activeTrades, signal);
      if (concentration > 0.8) {
        assessment.warnings.push(`High portfolio concentration: ${(concentration * 100).toFixed(1)}%`);
      }

      return assessment;
    } catch (error) {
      logger.error('Portfolio risk assessment error:', error);
      assessment.valid = false;
      assessment.errors.push('Portfolio risk assessment failed');
      return assessment;
    }
  }

  /**
   * Position sizing validation
   */
  validatePositionSize(signal, portfolioValue) {
    const validation = { valid: true, warnings: [], adjustedSignal: { ...signal } };

    // Calculate optimal position size based on risk
    const stopLossDistance = Math.abs(signal.entry - signal.stopLoss) / signal.entry;
    const maxPositionSize = (this.config.maxRiskPerTrade * portfolioValue) / (stopLossDistance * signal.entry);

    // Adjust position size if needed
    if (signal.amount && signal.amount > maxPositionSize) {
      validation.adjustedSignal.amount = maxPositionSize;
      validation.warnings.push(`Position size adjusted from ${signal.amount} to ${maxPositionSize}`);
    }

    // Check minimum position size
    const minPositionSize = 10; // $10 minimum
    if (signal.amount && signal.amount < minPositionSize) {
      validation.valid = false;
      validation.errors.push(`Position size too small: $${signal.amount}`);
    }

    // Check maximum position size
    const maxPositionSizeAbsolute = portfolioValue * this.config.maxPositionSize;
    if (signal.amount && signal.amount > maxPositionSizeAbsolute) {
      validation.valid = false;
      validation.errors.push(`Position size too large: $${signal.amount}`);
    }

    // Leverage validation
    if (signal.leverage && signal.leverage > this.config.maxLeverage) {
      validation.valid = false;
      validation.errors.push(`Leverage too high: ${signal.leverage}x`);
    }

    return validation;
  }

  /**
   * Correlation risk assessment
   */
  async assessCorrelationRisk(userId, signal) {
    const assessment = { valid: true, warnings: [], errors: [] };

    try {
      // Get existing positions
      const activeTrades = await Trade.findActiveByUser(userId);
      
      // Check for similar symbols
      const similarPositions = activeTrades.filter(trade => 
        trade.symbol.includes(signal.symbol.split('/')[0]) || 
        signal.symbol.includes(trade.symbol.split('/')[0])
      );

      if (similarPositions.length > 0) {
        const correlationWarning = `Similar positions detected: ${similarPositions.length}`;
        assessment.warnings.push(correlationWarning);
      }

      // Check for excessive correlation
      if (similarPositions.length >= 3) {
        assessment.valid = false;
        assessment.errors.push('Too many correlated positions');
      }

      // Calculate correlation coefficient
      const correlation = this.calculateCorrelation(activeTrades, signal);
      if (correlation > this.config.correlationLimit) {
        assessment.warnings.push(`High correlation detected: ${(correlation * 100).toFixed(1)}%`);
      }

      return assessment;
    } catch (error) {
      logger.error('Correlation risk assessment error:', error);
      assessment.valid = false;
      assessment.errors.push('Correlation risk assessment failed');
      return assessment;
    }
  }

  /**
   * Market risk assessment
   */
  async assessMarketRisk(signal) {
    const assessment = { valid: true, warnings: [], errors: [] };

    try {
      // Check market volatility
      const volatility = await this.estimateVolatility(signal.symbol);
      if (volatility > this.config.volatilityLimit) {
        assessment.warnings.push(`High volatility detected: ${(volatility * 100).toFixed(1)}%`);
      }

      // Check liquidity
      const liquidity = await this.estimateLiquidity(signal.symbol);
      if (liquidity < this.config.liquidityThreshold) {
        assessment.warnings.push(`Low liquidity detected: $${liquidity.toLocaleString()}`);
      }

      // Check market hours
      if (await this.isMarketClosed(signal.symbol)) {
        assessment.warnings.push('Market may be closed or have reduced liquidity');
      }

      // Check for market anomalies
      const anomalies = await this.detectMarketAnomalies(signal.symbol);
      if (anomalies.length > 0) {
        assessment.warnings.push(`Market anomalies detected: ${anomalies.length}`);
      }

      return assessment;
    } catch (error) {
      logger.error('Market risk assessment error:', error);
      assessment.valid = false;
      assessment.errors.push('Market risk assessment failed');
      return assessment;
    }
  }

  /**
   * Calculate overall risk score
   */
  calculateRiskScore(signal, portfolioRisk, marketRisk) {
    let score = 0;

    // Base risk from signal confidence
    score += (100 - signal.confidence) * 0.1;

    // Portfolio risk contribution
    if (portfolioRisk.warnings.length > 0) {
      score += portfolioRisk.warnings.length * 5;
    }

    // Market risk contribution
    if (marketRisk.warnings.length > 0) {
      score += marketRisk.warnings.length * 3;
    }

    // Leverage risk
    if (signal.leverage) {
      score += Math.min(signal.leverage * 2, 20);
    }

    // Volatility risk
    const volatility = this.estimateVolatility(signal.symbol);
    if (volatility > 0.1) {
      score += (volatility - 0.1) * 100;
    }

    return Math.min(score, 100);
  }

  /**
   * Check daily limits
   */
  async checkDailyLimits(userId) {
    const limits = { valid: true, errors: [] };

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const dailyTrades = await Trade.countDailyTrades(userId, today);
      if (dailyTrades >= this.config.maxDailyTrades) {
        limits.valid = false;
        limits.errors.push(`Daily trade limit reached: ${dailyTrades}`);
      }

      const dailyLoss = await this.calculateDailyLoss(userId, today);
      if (dailyLoss > this.config.maxDailyLoss) {
        limits.valid = false;
        limits.errors.push(`Daily loss limit exceeded: ${(dailyLoss * 100).toFixed(1)}%`);
      }

      return limits;
    } catch (error) {
      logger.error('Daily limits check error:', error);
      limits.valid = false;
      limits.errors.push('Daily limits check failed');
      return limits;
    }
  }

  /**
   * Check drawdown protection
   */
  async checkDrawdownProtection(userId) {
    const protection = { valid: true, errors: [] };

    try {
      const currentDrawdown = await this.calculateCurrentDrawdown(userId);
      if (currentDrawdown > this.config.maxDrawdown) {
        protection.valid = false;
        protection.errors.push(`Maximum drawdown exceeded: ${(currentDrawdown * 100).toFixed(1)}%`);
      }

      // Check if circuit breaker should be triggered
      if (currentDrawdown > this.config.circuitBreakerThreshold) {
        this.triggerCircuitBreaker('High drawdown detected');
        protection.valid = false;
        protection.errors.push('Circuit breaker triggered due to high drawdown');
      }

      return protection;
    } catch (error) {
      logger.error('Drawdown protection check error:', error);
      protection.valid = false;
      protection.errors.push('Drawdown protection check failed');
      return protection;
    }
  }

  /**
   * Check for threats and anomalies
   */
  async checkThreats(userId, signal) {
    const threatCheck = { valid: true, errors: [] };

    try {
      // Check for suspicious activity patterns
      const suspiciousActivity = await this.detectSuspiciousActivity(userId, signal);
      if (suspiciousActivity.length > 0) {
        threatCheck.warnings.push(`Suspicious activity detected: ${suspiciousActivity.length} patterns`);
      }

      // Check for failed attempts
      const failedAttempts = this.threatMetrics.failedAttempts.get(userId) || 0;
      if (failedAttempts >= this.config.maxFailedAttempts) {
        threatCheck.valid = false;
        threatCheck.errors.push('Too many failed attempts - account temporarily locked');
      }

      // Check for anomalies
      const anomalies = await this.detectAnomalies(userId, signal);
      if (anomalies.length > 0) {
        threatCheck.warnings.push(`Anomalies detected: ${anomalies.length}`);
      }

      return threatCheck;
    } catch (error) {
      logger.error('Threat check error:', error);
      threatCheck.valid = false;
      threatCheck.errors.push('Threat check failed');
      return threatCheck;
    }
  }

  /**
   * Check resource availability
   */
  checkResourceAvailability() {
    const resourceCheck = { valid: true, errors: [] };

    // Check memory usage
    if (this.resourceMetrics.memoryUsage > this.config.maxMemoryUsage) {
      resourceCheck.valid = false;
      resourceCheck.errors.push(`High memory usage: ${(this.resourceMetrics.memoryUsage * 100).toFixed(1)}%`);
    }

    // Check CPU usage
    if (this.resourceMetrics.cpuUsage > this.config.maxCpuUsage) {
      resourceCheck.valid = false;
      resourceCheck.errors.push(`High CPU usage: ${(this.resourceMetrics.cpuUsage * 100).toFixed(1)}%`);
    }

    // Check connection count
    if (this.resourceMetrics.activeConnections > this.config.maxConnections) {
      resourceCheck.valid = false;
      resourceCheck.errors.push(`Too many active connections: ${this.resourceMetrics.activeConnections}`);
    }

    // Check request rate
    if (this.resourceMetrics.requestsPerMinute > this.config.maxRequestsPerMinute) {
      resourceCheck.valid = false;
      resourceCheck.errors.push(`Request rate too high: ${this.resourceMetrics.requestsPerMinute}/min`);
    }

    return resourceCheck;
  }

  /**
   * Circuit breaker management
   */
  triggerCircuitBreaker(reason) {
    this.circuitBreakerState.isOpen = true;
    this.circuitBreakerState.failureCount++;
    this.circuitBreakerState.lastFailureTime = Date.now();
    this.circuitBreakerState.timeout = setTimeout(() => {
      this.resetCircuitBreaker();
    }, this.config.circuitBreakerTimeout);

    this.generateRiskAlert('CRITICAL', `Circuit breaker triggered: ${reason}`, {
      failureCount: this.circuitBreakerState.failureCount,
      reason,
    });

    logger.error('Circuit breaker triggered', { reason, failureCount: this.circuitBreakerState.failureCount });
  }

  resetCircuitBreaker() {
    this.circuitBreakerState.isOpen = false;
    this.circuitBreakerState.failureCount = 0;
    this.circuitBreakerState.lastFailureTime = null;
    this.circuitBreakerState.timeout = null;

    this.generateRiskAlert('INFO', 'Circuit breaker reset', {});
    logger.info('Circuit breaker reset');
  }

  monitorCircuitBreaker() {
    if (this.circuitBreakerState.isOpen) {
      const timeSinceLastFailure = Date.now() - this.circuitBreakerState.lastFailureTime;
      if (timeSinceLastFailure >= this.config.circuitBreakerTimeout) {
        this.resetCircuitBreaker();
      }
    }
  }

  /**
   * Resource monitoring
   */
  monitorResources() {
    try {
      const memUsage = process.memoryUsage();
      const totalMem = memUsage.heapTotal + memUsage.external;
      const usedMem = memUsage.heapUsed + memUsage.external;
      
      this.resourceMetrics.memoryUsage = usedMem / totalMem;
      this.resourceMetrics.cpuUsage = process.cpuUsage().user / 1000000; // Convert to percentage
      this.resourceMetrics.lastUpdate = Date.now();

      // Check for resource warnings
      if (this.resourceMetrics.memoryUsage > this.config.maxMemoryUsage * 0.8) {
        this.generateRiskAlert('WARNING', 'High memory usage detected', {
          usage: this.resourceMetrics.memoryUsage,
          limit: this.config.maxMemoryUsage,
        });
      }

      if (this.resourceMetrics.cpuUsage > this.config.maxCpuUsage * 0.8) {
        this.generateRiskAlert('WARNING', 'High CPU usage detected', {
          usage: this.resourceMetrics.cpuUsage,
          limit: this.config.maxCpuUsage,
        });
      }
    } catch (error) {
      logger.error('Resource monitoring error:', error);
    }
  }

  /**
   * Threat detection
   */
  detectThreats() {
    try {
      // Analyze suspicious activities
      const suspiciousActivities = this.threatMetrics.suspiciousActivities;
      if (suspiciousActivities.length > this.config.suspiciousActivityThreshold) {
        this.generateRiskAlert('HIGH', 'Multiple suspicious activities detected', {
          count: suspiciousActivities.length,
          threshold: this.config.suspiciousActivityThreshold,
        });
      }

      // Analyze anomalies
      const anomalies = this.threatMetrics.anomalies;
      if (anomalies.length > 0) {
        this.generateRiskAlert('MEDIUM', 'Anomalies detected in system', {
          count: anomalies.length,
          latest: anomalies[anomalies.length - 1],
        });
      }

      // Clean up old data
      const now = Date.now();
      this.threatMetrics.suspiciousActivities = suspiciousActivities.filter(
        activity => now - activity.timestamp < 3600000 // Keep last hour
      );
      this.threatMetrics.anomalies = anomalies.filter(
        anomaly => now - anomaly.timestamp < 3600000 // Keep last hour
      );
    } catch (error) {
      logger.error('Threat detection error:', error);
    }
  }

  /**
   * Risk monitoring
   */
  monitorRiskMetrics() {
    try {
      // Update daily metrics
      this.dailyMetrics.totalRisk = this.calculateTotalRisk();
      this.dailyMetrics.maxDrawdown = Math.max(
        this.dailyMetrics.maxDrawdown,
        this.calculateCurrentDrawdown()
      );

      // Check for risk alerts
      if (this.dailyMetrics.maxDrawdown > this.config.maxDrawdown * 0.8) {
        this.generateRiskAlert('WARNING', 'Approaching maximum drawdown', {
          current: this.dailyMetrics.maxDrawdown,
          limit: this.config.maxDrawdown,
        });
      }

      if (this.dailyMetrics.totalRisk > this.config.maxRiskPerTrade * 10) {
        this.generateRiskAlert('HIGH', 'High total risk exposure', {
          total: this.dailyMetrics.totalRisk,
          limit: this.config.maxRiskPerTrade * 10,
        });
      }
    } catch (error) {
      logger.error('Risk monitoring error:', error);
    }
  }

  /**
   * Utility methods
   */
  isValidSymbol(symbol) {
    // Basic symbol validation
    return /^[A-Z]{2,10}\/[A-Z]{2,10}$/.test(symbol);
  }

  calculateTradeRisk(signal, portfolioValue) {
    const stopLossDistance = Math.abs(signal.entry - signal.stopLoss) / signal.entry;
    const positionSize = signal.amount || (portfolioValue * this.config.maxRiskPerTrade / stopLossDistance);
    const potentialLoss = positionSize * stopLossDistance;
    return potentialLoss / portfolioValue;
  }

  calculatePortfolioConcentration(activeTrades, newSignal) {
    // Simplified concentration calculation
    const totalValue = activeTrades.reduce((sum, trade) => sum + trade.positionSize, 0);
    const newPositionValue = newSignal.amount || 0;
    return (totalValue + newPositionValue) / (totalValue + newPositionValue);
  }

  calculateCorrelation(activeTrades, newSignal) {
    // Simplified correlation calculation
    // In production, this would use actual correlation data
    return 0.3; // Default correlation
  }

  async estimateVolatility(symbol) {
    // In production, this would use historical data
    return 0.05; // 5% default volatility
  }

  async estimateLiquidity(symbol) {
    // In production, this would query exchange data
    return 10000000; // $10M default liquidity
  }

  async isMarketClosed(symbol) {
    // In production, this would check actual market hours
    return false;
  }

  async detectMarketAnomalies(symbol) {
    // In production, this would analyze market data
    return [];
  }

  async detectSuspiciousActivity(userId, signal) {
    // In production, this would analyze user behavior patterns
    return [];
  }

  async detectAnomalies(userId, signal) {
    // In production, this would use machine learning models
    return [];
  }

  async calculateDailyLoss(userId, date) {
    try {
      const dailyTrades = await Trade.findDailyTrades(userId, date);
      const totalLoss = dailyTrades
        .filter(trade => trade.profit < 0)
        .reduce((sum, trade) => sum + Math.abs(trade.profit), 0);
      
      const user = await User.findById(userId);
      return totalLoss / user.portfolioValue;
    } catch (error) {
      logger.error('Daily loss calculation error:', error);
      return 0;
    }
  }

  async calculateCurrentDrawdown(userId) {
    try {
      const user = await User.findById(userId);
      const peakValue = user.peakPortfolioValue || user.portfolioValue;
      const currentValue = user.portfolioValue;
      
      if (currentValue >= peakValue) {
        await User.updatePeakValue(userId, currentValue);
        return 0;
      }
      
      return (peakValue - currentValue) / peakValue;
    } catch (error) {
      logger.error('Drawdown calculation error:', error);
      return 0;
    }
  }

  calculateTotalRisk() {
    // Simplified total risk calculation
    return this.dailyMetrics.totalRisk;
  }

  /**
   * Alert generation
   */
  generateRiskAlert(level, message, data = {}) {
    const alert = {
      id: `risk_${Date.now()}`,
      level,
      message,
      data,
      timestamp: Date.now(),
    };

    this.alerts.push(alert);
    logger.warn(`Risk alert [${level}]: ${message}`, data);

    return alert;
  }

  /**
   * Risk summary and reporting
   */
  async getRiskSummary(userId) {
    try {
      const activeTrades = await Trade.findActiveByUser(userId);
      const dailyTrades = await Trade.countDailyTrades(userId, new Date());
      const currentDrawdown = await this.calculateCurrentDrawdown(userId);
      const dailyLoss = await this.calculateDailyLoss(userId, new Date());

      return {
        activeTrades: activeTrades.length,
        dailyTrades,
        currentDrawdown,
        dailyLoss,
        maxConcurrentTrades: this.config.maxConcurrentTrades,
        maxDailyTrades: this.config.maxDailyTrades,
        maxDrawdown: this.config.maxDrawdown,
        maxDailyLoss: this.config.maxDailyLoss,
        riskLevel: this.getRiskLevel(currentDrawdown, dailyLoss),
        circuitBreakerStatus: this.circuitBreakerState.isOpen ? 'OPEN' : 'CLOSED',
        resourceStatus: this.getResourceStatus(),
        threatLevel: this.getThreatLevel(),
        alerts: this.alerts.slice(-10), // Last 10 alerts
        dailyMetrics: this.dailyMetrics,
        config: this.config,
      };
    } catch (error) {
      logger.error('Risk summary error:', error);
      return null;
    }
  }

  getRiskLevel(drawdown, dailyLoss) {
    if (drawdown > 0.08 || dailyLoss > 0.04) return 'CRITICAL';
    if (drawdown > 0.05 || dailyLoss > 0.02) return 'HIGH';
    if (drawdown > 0.02 || dailyLoss > 0.01) return 'MEDIUM';
    return 'LOW';
  }

  getResourceStatus() {
    return {
      memory: this.resourceMetrics.memoryUsage,
      cpu: this.resourceMetrics.cpuUsage,
      connections: this.resourceMetrics.activeConnections,
      requestsPerMinute: this.resourceMetrics.requestsPerMinute,
      status: this.resourceMetrics.memoryUsage > this.config.maxMemoryUsage || 
              this.resourceMetrics.cpuUsage > this.config.maxCpuUsage ? 'CRITICAL' : 'NORMAL',
    };
  }

  getThreatLevel() {
    const suspiciousCount = this.threatMetrics.suspiciousActivities.length;
    const anomalyCount = this.threatMetrics.anomalies.length;
    
    if (suspiciousCount > 10 || anomalyCount > 5) return 'HIGH';
    if (suspiciousCount > 5 || anomalyCount > 2) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Configuration management
   */
  updateConfig(newConfig) {
    Object.assign(this.config, newConfig);
    logger.info('Risk manager configuration updated', newConfig);
  }

  resetDailyMetrics() {
    this.dailyMetrics = {
      trades: 0,
      totalRisk: 0,
      realizedPnL: 0,
      unrealizedPnL: 0,
      maxDrawdown: 0,
      startTime: Date.now(),
    };
    logger.info('Daily risk metrics reset');
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      const summary = await this.getRiskSummary();
      return {
        status: 'healthy',
        timestamp: Date.now(),
        summary,
        circuitBreaker: this.circuitBreakerState,
        resources: this.resourceMetrics,
        threats: this.threatMetrics,
      };
    } catch (error) {
      logger.error('Risk manager health check error:', error);
      return {
        status: 'unhealthy',
        timestamp: Date.now(),
        error: error.message,
      };
    }
  }
}

// Create and export singleton instance
const riskManager = new RiskManager();

module.exports = {
  riskManager,
  RiskManager,
};