/**
 * Comprehensive Risk Management System
 * Implements position sizing, risk controls, and safety limits
 */

import { logError, logInfo, logWarn } from '../lib/logger';

export interface RiskLimits {
  maxPositionSize: number; // Maximum position size as percentage of account
  maxDailyLoss: number; // Maximum daily loss as percentage of account
  maxDrawdown: number; // Maximum drawdown as percentage of account
  maxLeverage: number; // Maximum leverage allowed
  maxOpenPositions: number; // Maximum number of open positions
  stopLossPercentage: number; // Default stop loss percentage
  takeProfitPercentage: number; // Default take profit percentage
}

export interface Position {
  symbol: string;
  side: 'LONG' | 'SHORT';
  size: number;
  entryPrice: number;
  currentPrice: number;
  stopLoss: number;
  takeProfit: number;
  leverage: number;
  unrealizedPnL: number;
  timestamp: number;
}

export interface AccountRisk {
  totalBalance: number;
  availableBalance: number;
  usedMargin: number;
  totalPnL: number;
  dailyPnL: number;
  maxDrawdown: number;
  riskScore: number; // 0-100, higher is riskier
}

export interface RiskCheckResult {
  allowed: boolean;
  reason?: string;
  warnings: string[];
  suggestedSize?: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

class RiskManager {
  private limits: RiskLimits;
  private positions: Map<string, Position> = new Map();
  private dailyPnL: number = 0;
  private maxBalance: number = 0;
  private lastResetDate: string = '';

  constructor(limits: RiskLimits) {
    this.limits = limits;
    this.initializeDailyTracking();
  }

  /**
   * Initialize daily tracking
   */
  private initializeDailyTracking(): void {
    const today = new Date().toDateString();
    if (this.lastResetDate !== today) {
      this.dailyPnL = 0;
      this.lastResetDate = today;
      logInfo('Daily risk tracking reset', 'RiskManagement');
    }
  }

  /**
   * Check if a trade is allowed based on risk limits
   */
  checkTradeRisk(
    symbol: string,
    side: 'LONG' | 'SHORT',
    size: number,
    price: number,
    accountRisk: AccountRisk
  ): RiskCheckResult {
    const warnings: string[] = [];
    let allowed = true;
    let reason = '';
    let suggestedSize = size;

    // Initialize daily tracking
    this.initializeDailyTracking();

    // Check 1: Position size limit
    const positionValue = size * price;
    const positionSizePercent = (positionValue / accountRisk.totalBalance) * 100;
    
    if (positionSizePercent > this.limits.maxPositionSize) {
      allowed = false;
      reason = `Position size ${positionSizePercent.toFixed(2)}% exceeds maximum ${this.limits.maxPositionSize}%`;
      suggestedSize = (accountRisk.totalBalance * this.limits.maxPositionSize / 100) / price;
    } else if (positionSizePercent > this.limits.maxPositionSize * 0.8) {
      warnings.push(`Position size ${positionSizePercent.toFixed(2)}% is close to maximum ${this.limits.maxPositionSize}%`);
    }

    // Check 2: Daily loss limit
    const currentDailyLoss = Math.abs(Math.min(0, this.dailyPnL));
    const dailyLossPercent = (currentDailyLoss / accountRisk.totalBalance) * 100;
    
    if (dailyLossPercent >= this.limits.maxDailyLoss) {
      allowed = false;
      reason = `Daily loss limit reached: ${dailyLossPercent.toFixed(2)}%`;
    } else if (dailyLossPercent >= this.limits.maxDailyLoss * 0.8) {
      warnings.push(`Daily loss ${dailyLossPercent.toFixed(2)}% is close to limit ${this.limits.maxDailyLoss}%`);
    }

    // Check 3: Maximum open positions
    if (this.positions.size >= this.limits.maxOpenPositions) {
      allowed = false;
      reason = `Maximum open positions limit reached: ${this.limits.maxOpenPositions}`;
    }

    // Check 4: Account drawdown
    const currentDrawdown = this.calculateDrawdown(accountRisk);
    if (currentDrawdown >= this.limits.maxDrawdown) {
      allowed = false;
      reason = `Maximum drawdown limit reached: ${currentDrawdown.toFixed(2)}%`;
    } else if (currentDrawdown >= this.limits.maxDrawdown * 0.8) {
      warnings.push(`Drawdown ${currentDrawdown.toFixed(2)}% is close to limit ${this.limits.maxDrawdown}%`);
    }

    // Check 5: Available balance
    if (positionValue > accountRisk.availableBalance) {
      allowed = false;
      reason = `Insufficient balance. Required: ${positionValue.toFixed(2)}, Available: ${accountRisk.availableBalance.toFixed(2)}`;
    }

    // Check 6: Leverage limit
    const leverage = positionValue / accountRisk.availableBalance;
    if (leverage > this.limits.maxLeverage) {
      allowed = false;
      reason = `Leverage ${leverage.toFixed(2)}x exceeds maximum ${this.limits.maxLeverage}x`;
      suggestedSize = (accountRisk.availableBalance * this.limits.maxLeverage * price) / price;
    }

    // Check 7: Risk score
    const riskScore = this.calculateRiskScore(accountRisk, positionSizePercent, leverage);
    if (riskScore > 80) {
      allowed = false;
      reason = `Risk score too high: ${riskScore}/100`;
    } else if (riskScore > 60) {
      warnings.push(`High risk score: ${riskScore}/100`);
    }

    // Determine risk level
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
    if (riskScore > 80) riskLevel = 'CRITICAL';
    else if (riskScore > 60) riskLevel = 'HIGH';
    else if (riskScore > 30) riskLevel = 'MEDIUM';

    return {
      allowed,
      reason,
      warnings,
      suggestedSize,
      riskLevel
    };
  }

  /**
   * Add a new position
   */
  addPosition(position: Position): boolean {
    try {
      // Check if position already exists
      if (this.positions.has(position.symbol)) {
        logWarn(`Position already exists for ${position.symbol}`, 'RiskManagement');
        return false;
      }

      this.positions.set(position.symbol, position);
      logInfo(`Position added: ${position.symbol} ${position.side} ${position.size}`, 'RiskManagement');
      return true;
    } catch (error) {
      logError('Failed to add position', 'RiskManagement', error);
      return false;
    }
  }

  /**
   * Update position
   */
  updatePosition(symbol: string, updates: Partial<Position>): boolean {
    try {
      const position = this.positions.get(symbol);
      if (!position) {
        logWarn(`Position not found: ${symbol}`, 'RiskManagement');
        return false;
      }

      const updatedPosition = { ...position, ...updates };
      this.positions.set(symbol, updatedPosition);
      
      // Update daily PnL
      if (updates.unrealizedPnL !== undefined) {
        this.dailyPnL += (updates.unrealizedPnL - position.unrealizedPnL);
      }

      logInfo(`Position updated: ${symbol}`, 'RiskManagement');
      return true;
    } catch (error) {
      logError('Failed to update position', 'RiskManagement', error);
      return false;
    }
  }

  /**
   * Remove position
   */
  removePosition(symbol: string): boolean {
    try {
      const position = this.positions.get(symbol);
      if (!position) {
        logWarn(`Position not found: ${symbol}`, 'RiskManagement');
        return false;
      }

      // Update daily PnL with final PnL
      this.dailyPnL += position.unrealizedPnL;
      
      this.positions.delete(symbol);
      logInfo(`Position removed: ${symbol}`, 'RiskManagement');
      return true;
    } catch (error) {
      logError('Failed to remove position', 'RiskManagement', error);
      return false;
    }
  }

  /**
   * Get all positions
   */
  getPositions(): Position[] {
    return Array.from(this.positions.values());
  }

  /**
   * Get position by symbol
   */
  getPosition(symbol: string): Position | undefined {
    return this.positions.get(symbol);
  }

  /**
   * Calculate current drawdown
   */
  private calculateDrawdown(accountRisk: AccountRisk): number {
    if (this.maxBalance === 0) {
      this.maxBalance = accountRisk.totalBalance;
    }
    
    if (accountRisk.totalBalance > this.maxBalance) {
      this.maxBalance = accountRisk.totalBalance;
    }
    
    return ((this.maxBalance - accountRisk.totalBalance) / this.maxBalance) * 100;
  }

  /**
   * Calculate risk score
   */
  private calculateRiskScore(
    accountRisk: AccountRisk,
    positionSizePercent: number,
    leverage: number
  ): number {
    let score = 0;

    // Position size factor (0-30 points)
    score += Math.min(30, (positionSizePercent / this.limits.maxPositionSize) * 30);

    // Leverage factor (0-25 points)
    score += Math.min(25, (leverage / this.limits.maxLeverage) * 25);

    // Drawdown factor (0-20 points)
    const drawdown = this.calculateDrawdown(accountRisk);
    score += Math.min(20, (drawdown / this.limits.maxDrawdown) * 20);

    // Daily loss factor (0-15 points)
    const dailyLossPercent = (Math.abs(Math.min(0, this.dailyPnL)) / accountRisk.totalBalance) * 100;
    score += Math.min(15, (dailyLossPercent / this.limits.maxDailyLoss) * 15);

    // Number of positions factor (0-10 points)
    score += Math.min(10, (this.positions.size / this.limits.maxOpenPositions) * 10);

    return Math.min(100, Math.round(score));
  }

  /**
   * Get risk summary
   */
  getRiskSummary(accountRisk: AccountRisk): {
    totalPositions: number;
    totalExposure: number;
    dailyPnL: number;
    drawdown: number;
    riskScore: number;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    warnings: string[];
  } {
    const totalExposure = Array.from(this.positions.values())
      .reduce((sum, pos) => sum + (pos.size * pos.currentPrice), 0);
    
    const drawdown = this.calculateDrawdown(accountRisk);
    const riskScore = this.calculateRiskScore(accountRisk, 0, 0);
    
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
    if (riskScore > 80) riskLevel = 'CRITICAL';
    else if (riskScore > 60) riskLevel = 'HIGH';
    else if (riskScore > 30) riskLevel = 'MEDIUM';

    const warnings: string[] = [];
    if (drawdown > this.limits.maxDrawdown * 0.8) {
      warnings.push(`High drawdown: ${drawdown.toFixed(2)}%`);
    }
    if (this.dailyPnL < -this.limits.maxDailyLoss * accountRisk.totalBalance / 100 * 0.8) {
      warnings.push(`High daily loss: ${this.dailyPnL.toFixed(2)}`);
    }
    if (this.positions.size > this.limits.maxOpenPositions * 0.8) {
      warnings.push(`High position count: ${this.positions.size}`);
    }

    return {
      totalPositions: this.positions.size,
      totalExposure,
      dailyPnL: this.dailyPnL,
      drawdown,
      riskScore,
      riskLevel,
      warnings
    };
  }

  /**
   * Update risk limits
   */
  updateLimits(newLimits: Partial<RiskLimits>): void {
    this.limits = { ...this.limits, ...newLimits };
    logInfo('Risk limits updated', 'RiskManagement');
  }

  /**
   * Get current limits
   */
  getLimits(): RiskLimits {
    return { ...this.limits };
  }

  /**
   * Reset daily tracking
   */
  resetDailyTracking(): void {
    this.dailyPnL = 0;
    this.lastResetDate = new Date().toDateString();
    logInfo('Daily tracking reset', 'RiskManagement');
  }
}

// Default risk limits for conservative trading
export const DEFAULT_RISK_LIMITS: RiskLimits = {
  maxPositionSize: 10, // 10% of account per position
  maxDailyLoss: 5, // 5% daily loss limit
  maxDrawdown: 20, // 20% maximum drawdown
  maxLeverage: 3, // 3x maximum leverage
  maxOpenPositions: 5, // Maximum 5 open positions
  stopLossPercentage: 2, // 2% default stop loss
  takeProfitPercentage: 4 // 4% default take profit
};

// Factory function to create risk manager
export function createRiskManager(limits?: Partial<RiskLimits>): RiskManager {
  const finalLimits = { ...DEFAULT_RISK_LIMITS, ...limits };
  return new RiskManager(finalLimits);
}

export default RiskManager;
