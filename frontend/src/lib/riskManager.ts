/**
 * Frontend Risk Management System
 * Production-ready risk management for client-side operations
 */

export interface RiskConfig {
  maxRiskPerTrade: number;
  maxDailyLoss: number;
  maxDrawdown: number;
  maxConcurrentTrades: number;
  maxDailyTrades: number;
  minConfidenceThreshold: number;
  maxLeverage: number;
  maxPositionSize: number;
  correlationLimit: number;
  volatilityLimit: number;
  liquidityThreshold: number;
}

export interface RiskAssessment {
  valid: boolean;
  warnings: string[];
  errors: string[];
  riskScore: number;
  adjustedSignal?: any;
}

export interface RiskSummary {
  activeTrades: number;
  dailyTrades: number;
  currentDrawdown: number;
  dailyLoss: number;
  maxConcurrentTrades: number;
  maxDailyTrades: number;
  maxDrawdown: number;
  maxDailyLoss: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  alerts: RiskAlert[];
}

export interface RiskAlert {
  id: string;
  level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  data: any;
  timestamp: number;
}

export interface TradeSignal {
  id: string;
  symbol: string;
  action: 'BUY' | 'SELL';
  entry: number;
  stopLoss: number;
  takeProfit: number;
  confidence: number;
  amount?: number;
  leverage?: number;
  userId: string;
}

export class FrontendRiskManager {
  private config: RiskConfig;
  private alerts: RiskAlert[] = [];
  private dailyMetrics = {
    trades: 0,
    totalRisk: 0,
    realizedPnL: 0,
    unrealizedPnL: 0,
    maxDrawdown: 0,
    startTime: Date.now(),
  };

  constructor(config?: Partial<RiskConfig>) {
    this.config = {
      maxRiskPerTrade: 0.02, // 2% of portfolio per trade
      maxDailyLoss: 0.05, // 5% max daily loss
      maxDrawdown: 0.1, // 10% max drawdown
      maxConcurrentTrades: 5,
      maxDailyTrades: 50,
      minConfidenceThreshold: 75,
      maxLeverage: 10,
      maxPositionSize: 0.5, // 50% of portfolio in single position
      correlationLimit: 0.7, // Max correlation between positions
      volatilityLimit: 0.3, // Max volatility for position
      liquidityThreshold: 1000000, // Min daily volume
      ...config,
    };
  }

  /**
   * Validate trading signal against risk parameters
   */
  async validateSignal(signal: TradeSignal, portfolioValue: number, activeTrades: any[] = []): Promise<RiskAssessment> {
    const assessment: RiskAssessment = {
      valid: true,
      warnings: [],
      errors: [],
      riskScore: 0,
    };

    try {
      // 1. Basic signal validation
      const basicValidation = this.validateBasicSignal(signal);
      if (!basicValidation.valid) {
        assessment.valid = false;
        assessment.errors.push(...basicValidation.errors);
        return assessment;
      }

      // 2. Portfolio risk assessment
      const portfolioRisk = this.assessPortfolioRisk(signal, portfolioValue, activeTrades);
      assessment.warnings.push(...portfolioRisk.warnings);
      if (!portfolioRisk.valid) {
        assessment.valid = false;
        assessment.errors.push(...portfolioRisk.errors);
      }

      // 3. Position sizing validation
      const positionValidation = this.validatePositionSize(signal, portfolioValue);
      assessment.warnings.push(...positionValidation.warnings);
      if (!positionValidation.valid) {
        assessment.valid = false;
        assessment.errors.push(...positionValidation.errors);
      } else if (positionValidation.adjustedSignal) {
        assessment.adjustedSignal = positionValidation.adjustedSignal;
      }

      // 4. Correlation risk assessment
      const correlationRisk = this.assessCorrelationRisk(signal, activeTrades);
      assessment.warnings.push(...correlationRisk.warnings);
      if (!correlationRisk.valid) {
        assessment.valid = false;
        assessment.errors.push(...correlationRisk.errors);
      }

      // 5. Market risk assessment
      const marketRisk = this.assessMarketRisk(signal);
      assessment.warnings.push(...marketRisk.warnings);
      if (!marketRisk.valid) {
        assessment.valid = false;
        assessment.errors.push(...marketRisk.errors);
      }

      // 6. Calculate overall risk score
      assessment.riskScore = this.calculateRiskScore(signal, portfolioRisk, marketRisk);

      // 7. Daily limits check
      const dailyLimits = this.checkDailyLimits();
      if (!dailyLimits.valid) {
        assessment.valid = false;
        assessment.errors.push(...dailyLimits.errors);
      }

      // 8. Confidence threshold check
      if (signal.confidence < this.config.minConfidenceThreshold) {
        assessment.valid = false;
        assessment.errors.push(`Signal confidence below threshold: ${signal.confidence}%`);
      }

      return assessment;
    } catch (error) {
      console.error('Risk validation error:', error);
      assessment.valid = false;
      assessment.errors.push('Risk validation failed');
      return assessment;
    }
  }

  /**
   * Basic signal validation
   */
  private validateBasicSignal(signal: TradeSignal): { valid: boolean; errors: string[] } {
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

    // Leverage validation
    if (signal.leverage && (signal.leverage < 1 || signal.leverage > this.config.maxLeverage)) {
      validation.valid = false;
      validation.errors.push(`Invalid leverage: ${signal.leverage}`);
    }

    return validation;
  }

  /**
   * Assess portfolio risk
   */
  private assessPortfolioRisk(signal: TradeSignal, portfolioValue: number, activeTrades: any[]): { valid: boolean; warnings: string[]; errors: string[] } {
    const assessment = { valid: true, warnings: [], errors: [] };

    // Calculate total exposure
    const totalExposure = activeTrades.reduce((sum, trade) => sum + (trade.positionSize || 0), 0);
    const exposureRatio = totalExposure / portfolioValue;

    // Check total exposure
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

    return assessment;
  }

  /**
   * Validate position size
   */
  private validatePositionSize(signal: TradeSignal, portfolioValue: number): { valid: boolean; warnings: string[]; adjustedSignal?: TradeSignal } {
    const validation = { valid: true, warnings: [], adjustedSignal: undefined as TradeSignal | undefined };

    if (signal.amount) {
      // Calculate optimal position size based on risk
      const stopLossDistance = Math.abs(signal.entry - signal.stopLoss) / signal.entry;
      const maxPositionSize = (this.config.maxRiskPerTrade * portfolioValue) / (stopLossDistance * signal.entry);

      // Adjust position size if needed
      if (signal.amount > maxPositionSize) {
        validation.adjustedSignal = { ...signal, amount: maxPositionSize };
        validation.warnings.push(`Position size adjusted from ${signal.amount} to ${maxPositionSize}`);
      }

      // Check minimum position size
      const minPositionSize = 10; // $10 minimum
      if (signal.amount < minPositionSize) {
        validation.valid = false;
        validation.errors = [`Position size too small: $${signal.amount}`];
      }
    }

    return validation;
  }

  /**
   * Assess correlation risk
   */
  private assessCorrelationRisk(signal: TradeSignal, activeTrades: any[]): { valid: boolean; warnings: string[]; errors: string[] } {
    const assessment = { valid: true, warnings: [], errors: [] };

    // Check for similar symbols
    const baseSymbol = signal.symbol.split('/')[0];
    const similarPositions = activeTrades.filter(trade => {
      const tradeBaseSymbol = trade.symbol.split('/')[0];
      return tradeBaseSymbol === baseSymbol;
    });

    if (similarPositions.length > 0) {
      const correlationWarning = `Similar positions detected: ${similarPositions.length}`;
      assessment.warnings.push(correlationWarning);
    }

    // Check for excessive correlation
    if (similarPositions.length >= 3) {
      assessment.valid = false;
      assessment.errors.push('Too many correlated positions');
    }

    return assessment;
  }

  /**
   * Assess market risk
   */
  private assessMarketRisk(signal: TradeSignal): { valid: boolean; warnings: string[]; errors: string[] } {
    const assessment = { valid: true, warnings: [], errors: [] };

    // Check market volatility (simplified)
    const volatility = this.estimateVolatility(signal.symbol);
    if (volatility > this.config.volatilityLimit) {
      assessment.warnings.push(`High volatility detected: ${(volatility * 100).toFixed(1)}%`);
    }

    // Check liquidity (simplified)
    const liquidity = this.estimateLiquidity(signal.symbol);
    if (liquidity < this.config.liquidityThreshold) {
      assessment.warnings.push(`Low liquidity detected: $${liquidity.toLocaleString()}`);
    }

    // Check market hours (for traditional markets)
    if (this.isMarketClosed(signal.symbol)) {
      assessment.warnings.push('Market may be closed or have reduced liquidity');
    }

    return assessment;
  }

  /**
   * Calculate risk score
   */
  private calculateRiskScore(signal: TradeSignal, portfolioRisk: any, marketRisk: any): number {
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

    return Math.min(score, 100);
  }

  /**
   * Check daily limits
   */
  private checkDailyLimits(): { valid: boolean; errors: string[] } {
    const limits = { valid: true, errors: [] };

    if (this.dailyMetrics.trades >= this.config.maxDailyTrades) {
      limits.valid = false;
      limits.errors.push(`Daily trade limit reached: ${this.dailyMetrics.trades}`);
    }

    const dailyLossRatio = Math.abs(this.dailyMetrics.realizedPnL) / 10000; // Assuming $10k portfolio
    if (dailyLossRatio > this.config.maxDailyLoss) {
      limits.valid = false;
      limits.errors.push(`Daily loss limit exceeded: ${(dailyLossRatio * 100).toFixed(1)}%`);
    }

    return limits;
  }

  /**
   * Calculate trade risk
   */
  private calculateTradeRisk(signal: TradeSignal, portfolioValue: number): number {
    const stopLossDistance = Math.abs(signal.entry - signal.stopLoss) / signal.entry;
    const positionSize = signal.amount || (portfolioValue * this.config.maxRiskPerTrade / stopLossDistance);
    const potentialLoss = positionSize * stopLossDistance;
    return potentialLoss / portfolioValue;
  }

  /**
   * Estimate volatility
   */
  private estimateVolatility(symbol: string): number {
    // Simplified volatility estimation
    // In production, this would use historical data
    return 0.05; // 5% default volatility
  }

  /**
   * Estimate liquidity
   */
  private estimateLiquidity(symbol: string): number {
    // Simplified liquidity estimation
    // In production, this would query exchange data
    return 10000000; // $10M default liquidity
  }

  /**
   * Check if market is closed
   */
  private isMarketClosed(symbol: string): boolean {
    // Simplified market hours check
    // In production, this would check actual market hours
    return false;
  }

  /**
   * Generate risk alert
   */
  generateRiskAlert(level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL', message: string, data: any = {}): RiskAlert {
    const alert: RiskAlert = {
      id: `risk_${Date.now()}`,
      level,
      message,
      data,
      timestamp: Date.now(),
    };

    this.alerts.push(alert);
    console.warn(`Risk alert [${level}]: ${message}`, data);

    return alert;
  }

  /**
   * Get risk summary
   */
  getRiskSummary(activeTrades: any[] = [], portfolioValue: number = 10000): RiskSummary {
    const currentDrawdown = Math.abs(this.dailyMetrics.realizedPnL) / portfolioValue;
    const dailyLoss = Math.abs(this.dailyMetrics.realizedPnL) / portfolioValue;

    return {
      activeTrades: activeTrades.length,
      dailyTrades: this.dailyMetrics.trades,
      currentDrawdown,
      dailyLoss,
      maxConcurrentTrades: this.config.maxConcurrentTrades,
      maxDailyTrades: this.config.maxDailyTrades,
      maxDrawdown: this.config.maxDrawdown,
      maxDailyLoss: this.config.maxDailyLoss,
      riskLevel: this.getRiskLevel(currentDrawdown, dailyLoss),
      alerts: this.alerts.slice(-10), // Last 10 alerts
    };
  }

  /**
   * Get risk level
   */
  private getRiskLevel(drawdown: number, dailyLoss: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (drawdown > 0.08 || dailyLoss > 0.04) return 'CRITICAL';
    if (drawdown > 0.05 || dailyLoss > 0.02) return 'HIGH';
    if (drawdown > 0.02 || dailyLoss > 0.01) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<RiskConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.info('Risk manager configuration updated', newConfig);
  }

  /**
   * Reset daily metrics
   */
  resetDailyMetrics(): void {
    this.dailyMetrics = {
      trades: 0,
      totalRisk: 0,
      realizedPnL: 0,
      unrealizedPnL: 0,
      maxDrawdown: 0,
      startTime: Date.now(),
    };
    console.info('Daily risk metrics reset');
  }

  /**
   * Record trade
   */
  recordTrade(profit: number): void {
    this.dailyMetrics.trades++;
    this.dailyMetrics.realizedPnL += profit;
    
    if (profit < 0) {
      this.dailyMetrics.maxDrawdown = Math.max(this.dailyMetrics.maxDrawdown, Math.abs(profit));
    }
  }

  /**
   * Get configuration
   */
  getConfig(): RiskConfig {
    return { ...this.config };
  }
}

// Global risk manager instance
export const globalRiskManager = new FrontendRiskManager();
