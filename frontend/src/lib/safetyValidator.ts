/**
 * Safety Validator for CryptoPulse
 * Comprehensive safety checks and validations for trading operations
 */

export interface SafetyValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  recommendations: string[];
  safetyScore: number;
}

export interface SecurityCheck {
  name: string;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  required: boolean;
}

export interface SafetyConfig {
  maxPositionSize: number;
  maxDailyLoss: number;
  maxDrawdown: number;
  minConfidenceThreshold: number;
  maxLeverage: number;
  requireStopLoss: boolean;
  requireTakeProfit: boolean;
  maxSlippage: number;
  minLiquidity: number;
  maxVolatility: number;
}

export class SafetyValidator {
  private config: SafetyConfig;
  private securityChecks: SecurityCheck[] = [];

  constructor(config?: Partial<SafetyConfig>) {
    this.config = {
      maxPositionSize: 0.5, // 50% of portfolio
      maxDailyLoss: 0.05, // 5%
      maxDrawdown: 0.1, // 10%
      minConfidenceThreshold: 75,
      maxLeverage: 10,
      requireStopLoss: true,
      requireTakeProfit: true,
      maxSlippage: 0.02, // 2%
      minLiquidity: 1000000, // $1M
      maxVolatility: 0.3, // 30%
      ...config,
    };

    this.initializeSecurityChecks();
  }

  /**
   * Initialize security checks
   */
  private initializeSecurityChecks(): void {
    this.securityChecks = [
      {
        name: 'Position Size Check',
        description: 'Ensures position size is within safe limits',
        severity: 'HIGH',
        required: true,
      },
      {
        name: 'Stop Loss Validation',
        description: 'Validates stop loss is properly set',
        severity: 'CRITICAL',
        required: true,
      },
      {
        name: 'Take Profit Validation',
        description: 'Validates take profit is properly set',
        severity: 'HIGH',
        required: true,
      },
      {
        name: 'Leverage Check',
        description: 'Ensures leverage is within safe limits',
        severity: 'HIGH',
        required: true,
      },
      {
        name: 'Confidence Threshold',
        description: 'Validates signal confidence meets minimum threshold',
        severity: 'MEDIUM',
        required: true,
      },
      {
        name: 'Slippage Protection',
        description: 'Checks for excessive slippage risk',
        severity: 'MEDIUM',
        required: false,
      },
      {
        name: 'Liquidity Check',
        description: 'Ensures sufficient liquidity for trade',
        severity: 'MEDIUM',
        required: false,
      },
      {
        name: 'Volatility Assessment',
        description: 'Assesses market volatility risk',
        severity: 'LOW',
        required: false,
      },
    ];
  }

  /**
   * Validate trading signal for safety
   */
  validateSignal(signal: any, portfolioValue: number, marketData?: any): SafetyValidationResult {
    const result: SafetyValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      recommendations: [],
      safetyScore: 100,
    };

    try {
      // 1. Position Size Safety Check
      const positionCheck = this.validatePositionSize(signal, portfolioValue);
      this.mergeResult(result, positionCheck);

      // 2. Stop Loss Safety Check
      const stopLossCheck = this.validateStopLoss(signal);
      this.mergeResult(result, stopLossCheck);

      // 3. Take Profit Safety Check
      const takeProfitCheck = this.validateTakeProfit(signal);
      this.mergeResult(result, takeProfitCheck);

      // 4. Leverage Safety Check
      const leverageCheck = this.validateLeverage(signal);
      this.mergeResult(result, leverageCheck);

      // 5. Confidence Safety Check
      const confidenceCheck = this.validateConfidence(signal);
      this.mergeResult(result, confidenceCheck);

      // 6. Slippage Safety Check
      if (marketData) {
        const slippageCheck = this.validateSlippage(signal, marketData);
        this.mergeResult(result, slippageCheck);
      }

      // 7. Liquidity Safety Check
      if (marketData) {
        const liquidityCheck = this.validateLiquidity(signal, marketData);
        this.mergeResult(result, liquidityCheck);
      }

      // 8. Volatility Safety Check
      if (marketData) {
        const volatilityCheck = this.validateVolatility(signal, marketData);
        this.mergeResult(result, volatilityCheck);
      }

      // 9. Risk-Reward Ratio Check
      const riskRewardCheck = this.validateRiskRewardRatio(signal);
      this.mergeResult(result, riskRewardCheck);

      // 10. Market Hours Check
      const marketHoursCheck = this.validateMarketHours(signal);
      this.mergeResult(result, marketHoursCheck);

      // Calculate final safety score
      result.safetyScore = this.calculateSafetyScore(result);

      // Generate recommendations
      result.recommendations = this.generateRecommendations(result);

      return result;
    } catch (error) {
      console.error('Safety validation error:', error);
      result.isValid = false;
      result.errors.push('Safety validation failed');
      result.safetyScore = 0;
      return result;
    }
  }

  /**
   * Validate position size
   */
  private validatePositionSize(signal: any, portfolioValue: number): SafetyValidationResult {
    const result: SafetyValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      recommendations: [],
      safetyScore: 100,
    };

    if (!signal.amount) {
      result.warnings.push('Position size not specified');
      result.safetyScore -= 10;
      return result;
    }

    const positionRatio = signal.amount / portfolioValue;

    if (positionRatio > this.config.maxPositionSize) {
      result.isValid = false;
      result.errors.push(`Position size too large: ${(positionRatio * 100).toFixed(1)}% of portfolio`);
      result.safetyScore = 0;
    } else if (positionRatio > this.config.maxPositionSize * 0.8) {
      result.warnings.push(`High position size: ${(positionRatio * 100).toFixed(1)}% of portfolio`);
      result.safetyScore -= 20;
    }

    if (signal.amount < 10) {
      result.warnings.push('Position size very small, consider minimum viable position');
      result.safetyScore -= 5;
    }

    return result;
  }

  /**
   * Validate stop loss
   */
  private validateStopLoss(signal: any): SafetyValidationResult {
    const result: SafetyValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      recommendations: [],
      safetyScore: 100,
    };

    if (!signal.stopLoss) {
      if (this.config.requireStopLoss) {
        result.isValid = false;
        result.errors.push('Stop loss is required for safety');
        result.safetyScore = 0;
      } else {
        result.warnings.push('Stop loss not set - high risk');
        result.safetyScore -= 30;
      }
      return result;
    }

    // Check stop loss logic
    if (signal.action === 'BUY') {
      if (signal.stopLoss >= signal.entry) {
        result.isValid = false;
        result.errors.push('Stop loss must be below entry price for BUY orders');
        result.safetyScore = 0;
      } else {
        const stopLossDistance = (signal.entry - signal.stopLoss) / signal.entry;
        if (stopLossDistance > 0.1) { // 10%
          result.warnings.push(`Large stop loss distance: ${(stopLossDistance * 100).toFixed(1)}%`);
          result.safetyScore -= 15;
        }
      }
    } else {
      if (signal.stopLoss <= signal.entry) {
        result.isValid = false;
        result.errors.push('Stop loss must be above entry price for SELL orders');
        result.safetyScore = 0;
      } else {
        const stopLossDistance = (signal.stopLoss - signal.entry) / signal.entry;
        if (stopLossDistance > 0.1) { // 10%
          result.warnings.push(`Large stop loss distance: ${(stopLossDistance * 100).toFixed(1)}%`);
          result.safetyScore -= 15;
        }
      }
    }

    return result;
  }

  /**
   * Validate take profit
   */
  private validateTakeProfit(signal: any): SafetyValidationResult {
    const result: SafetyValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      recommendations: [],
      safetyScore: 100,
    };

    if (!signal.takeProfit) {
      if (this.config.requireTakeProfit) {
        result.isValid = false;
        result.errors.push('Take profit is required for safety');
        result.safetyScore = 0;
      } else {
        result.warnings.push('Take profit not set - consider setting profit targets');
        result.safetyScore -= 10;
      }
      return result;
    }

    // Check take profit logic
    if (signal.action === 'BUY') {
      if (signal.takeProfit <= signal.entry) {
        result.isValid = false;
        result.errors.push('Take profit must be above entry price for BUY orders');
        result.safetyScore = 0;
      }
    } else {
      if (signal.takeProfit >= signal.entry) {
        result.isValid = false;
        result.errors.push('Take profit must be below entry price for SELL orders');
        result.safetyScore = 0;
      }
    }

    return result;
  }

  /**
   * Validate leverage
   */
  private validateLeverage(signal: any): SafetyValidationResult {
    const result: SafetyValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      recommendations: [],
      safetyScore: 100,
    };

    if (signal.leverage) {
      if (signal.leverage > this.config.maxLeverage) {
        result.isValid = false;
        result.errors.push(`Leverage too high: ${signal.leverage}x (max: ${this.config.maxLeverage}x)`);
        result.safetyScore = 0;
      } else if (signal.leverage > this.config.maxLeverage * 0.7) {
        result.warnings.push(`High leverage: ${signal.leverage}x`);
        result.safetyScore -= 25;
      }

      if (signal.leverage > 5) {
        result.recommendations.push('Consider reducing leverage for safer trading');
      }
    }

    return result;
  }

  /**
   * Validate confidence
   */
  private validateConfidence(signal: any): SafetyValidationResult {
    const result: SafetyValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      recommendations: [],
      safetyScore: 100,
    };

    if (!signal.confidence) {
      result.warnings.push('Signal confidence not specified');
      result.safetyScore -= 20;
      return result;
    }

    if (signal.confidence < this.config.minConfidenceThreshold) {
      result.isValid = false;
      result.errors.push(`Signal confidence too low: ${signal.confidence}% (min: ${this.config.minConfidenceThreshold}%)`);
      result.safetyScore = 0;
    } else if (signal.confidence < this.config.minConfidenceThreshold + 10) {
      result.warnings.push(`Low signal confidence: ${signal.confidence}%`);
      result.safetyScore -= 15;
    }

    return result;
  }

  /**
   * Validate slippage
   */
  private validateSlippage(signal: any, marketData: any): SafetyValidationResult {
    const result: SafetyValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      recommendations: [],
      safetyScore: 100,
    };

    if (marketData.spread) {
      const spreadRatio = marketData.spread / signal.entry;
      if (spreadRatio > this.config.maxSlippage) {
        result.warnings.push(`High slippage risk: ${(spreadRatio * 100).toFixed(2)}%`);
        result.safetyScore -= 10;
      }
    }

    return result;
  }

  /**
   * Validate liquidity
   */
  private validateLiquidity(signal: any, marketData: any): SafetyValidationResult {
    const result: SafetyValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      recommendations: [],
      safetyScore: 100,
    };

    if (marketData.volume24h) {
      if (marketData.volume24h < this.config.minLiquidity) {
        result.warnings.push(`Low liquidity: $${marketData.volume24h.toLocaleString()}`);
        result.safetyScore -= 15;
      }
    }

    return result;
  }

  /**
   * Validate volatility
   */
  private validateVolatility(signal: any, marketData: any): SafetyValidationResult {
    const result: SafetyValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      recommendations: [],
      safetyScore: 100,
    };

    if (marketData.volatility24h) {
      if (marketData.volatility24h > this.config.maxVolatility) {
        result.warnings.push(`High volatility: ${(marketData.volatility24h * 100).toFixed(1)}%`);
        result.safetyScore -= 20;
        result.recommendations.push('Consider reducing position size due to high volatility');
      }
    }

    return result;
  }

  /**
   * Validate risk-reward ratio
   */
  private validateRiskRewardRatio(signal: any): SafetyValidationResult {
    const result: SafetyValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      recommendations: [],
      safetyScore: 100,
    };

    if (signal.stopLoss && signal.takeProfit) {
      let risk, reward;

      if (signal.action === 'BUY') {
        risk = signal.entry - signal.stopLoss;
        reward = signal.takeProfit - signal.entry;
      } else {
        risk = signal.stopLoss - signal.entry;
        reward = signal.entry - signal.takeProfit;
      }

      const riskRewardRatio = reward / risk;

      if (riskRewardRatio < 1) {
        result.warnings.push(`Poor risk-reward ratio: ${riskRewardRatio.toFixed(2)}:1`);
        result.safetyScore -= 25;
        result.recommendations.push('Consider improving risk-reward ratio to at least 1:1');
      } else if (riskRewardRatio < 2) {
        result.warnings.push(`Moderate risk-reward ratio: ${riskRewardRatio.toFixed(2)}:1`);
        result.safetyScore -= 10;
      }
    }

    return result;
  }

  /**
   * Validate market hours
   */
  private validateMarketHours(signal: any): SafetyValidationResult {
    const result: SafetyValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      recommendations: [],
      safetyScore: 100,
    };

    // Check if it's a weekend (crypto markets are 24/7, but some traditional markets aren't)
    const now = new Date();
    const dayOfWeek = now.getDay();

    if (dayOfWeek === 0 || dayOfWeek === 6) {
      result.warnings.push('Trading on weekend - reduced liquidity may be expected');
      result.safetyScore -= 5;
    }

    // Check if it's during typical low-activity hours
    const hour = now.getHours();
    if (hour < 6 || hour > 22) {
      result.warnings.push('Trading during off-peak hours - reduced liquidity may be expected');
      result.safetyScore -= 5;
    }

    return result;
  }

  /**
   * Merge validation results
   */
  private mergeResult(target: SafetyValidationResult, source: SafetyValidationResult): void {
    target.isValid = target.isValid && source.isValid;
    target.errors.push(...source.errors);
    target.warnings.push(...source.warnings);
    target.recommendations.push(...source.recommendations);
    target.safetyScore = Math.min(target.safetyScore, source.safetyScore);
  }

  /**
   * Calculate safety score
   */
  private calculateSafetyScore(result: SafetyValidationResult): number {
    let score = 100;

    // Deduct points for errors
    score -= result.errors.length * 25;

    // Deduct points for warnings
    score -= result.warnings.length * 5;

    // Ensure score doesn't go below 0
    return Math.max(0, score);
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(result: SafetyValidationResult): string[] {
    const recommendations: string[] = [];

    if (result.safetyScore < 50) {
      recommendations.push('Consider waiting for better market conditions');
    }

    if (result.warnings.length > 3) {
      recommendations.push('Multiple warnings detected - review trade parameters carefully');
    }

    if (result.errors.length > 0) {
      recommendations.push('Fix errors before proceeding with trade');
    }

    return recommendations;
  }

  /**
   * Get security checks
   */
  getSecurityChecks(): SecurityCheck[] {
    return [...this.securityChecks];
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<SafetyConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get configuration
   */
  getConfig(): SafetyConfig {
    return { ...this.config };
  }
}

// Global safety validator instance
export const globalSafetyValidator = new SafetyValidator();
