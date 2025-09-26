import { logInfo, logError, logWarn } from './logger'

interface BalanceInfo {
  totalBalance: number
  availableBalance: number
  lockedBalance: number
  currency: string
  exchange: string
  lastUpdated: Date
}

interface TradingStrategy {
  name: string
  minBalance: number
  maxPositionSize: number
  riskLevel: 'low' | 'medium' | 'high'
  recommendedPairs: string[]
  description: string
}

interface BalanceBasedNotification {
  type: 'low_balance' | 'trading_opportunity' | 'balance_alert' | 'strategy_recommendation'
  title: string
  message: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  action?: {
    label: string
    onClick: () => void
  }
  balanceInfo: BalanceInfo
  recommendedStrategy?: TradingStrategy
}

class BalanceBasedTradingService {
  private balanceThresholds = {
    low: 100,        // Below $100 - low balance alert
    medium: 500,     // $100-$500 - conservative trading
    high: 1000,      // $500-$1000 - moderate trading
    premium: 5000    // Above $1000 - aggressive trading
  }

  private tradingStrategies: TradingStrategy[] = [
    {
      name: 'Conservative',
      minBalance: 100,
      maxPositionSize: 0.05, // 5% of balance
      riskLevel: 'low',
      recommendedPairs: ['BTC/USDT', 'ETH/USDT'],
      description: 'Low-risk trading with small position sizes'
    },
    {
      name: 'Moderate',
      minBalance: 500,
      maxPositionSize: 0.1, // 10% of balance
      riskLevel: 'medium',
      recommendedPairs: ['BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'ADA/USDT'],
      description: 'Balanced risk with moderate position sizes'
    },
    {
      name: 'Aggressive',
      minBalance: 1000,
      maxPositionSize: 0.2, // 20% of balance
      riskLevel: 'high',
      recommendedPairs: ['BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'ADA/USDT', 'SOL/USDT', 'DOT/USDT'],
      description: 'High-risk trading with larger position sizes'
    },
    {
      name: 'Premium',
      minBalance: 5000,
      maxPositionSize: 0.3, // 30% of balance
      riskLevel: 'high',
      recommendedPairs: ['BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'ADA/USDT', 'SOL/USDT', 'DOT/USDT', 'MATIC/USDT', 'AVAX/USDT'],
      description: 'Maximum risk with premium position sizes'
    }
  ]

  private notificationCallbacks: ((notification: BalanceBasedNotification) => void)[] = []

  /**
   * Analyze user's balance and generate appropriate trading strategy
   */
  analyzeBalanceAndGenerateStrategy(balanceInfo: BalanceInfo): {
    recommendedStrategy: TradingStrategy
    notifications: BalanceBasedNotification[]
    positionSize: number
    riskAssessment: string
  } {
    try {
      const { availableBalance, currency } = balanceInfo
      const notifications: BalanceBasedNotification[] = []
      
      // Find appropriate strategy based on balance
      const recommendedStrategy = this.tradingStrategies
        .filter(strategy => availableBalance >= strategy.minBalance)
        .sort((a, b) => b.minBalance - a.minBalance)[0] || this.tradingStrategies[0]

      // Calculate position size based on balance
      const positionSize = Math.min(
        availableBalance * recommendedStrategy.maxPositionSize,
        availableBalance * 0.1 // Never risk more than 10% in a single trade
      )

      // Generate balance-based notifications
      if (availableBalance < this.balanceThresholds.low) {
        notifications.push({
          type: 'low_balance',
          title: 'Low Balance Alert',
          message: `Your balance (${currency} ${availableBalance.toFixed(2)}) is below the recommended minimum. Consider depositing more funds for better trading opportunities.`,
          priority: 'critical',
          balanceInfo,
          recommendedStrategy
        })
      } else if (availableBalance < this.balanceThresholds.medium) {
        notifications.push({
          type: 'balance_alert',
          title: 'Conservative Trading Mode',
          message: `With ${currency} ${availableBalance.toFixed(2)}, we recommend conservative trading with small position sizes.`,
          priority: 'medium',
          balanceInfo,
          recommendedStrategy
        })
      } else if (availableBalance >= this.balanceThresholds.premium) {
        notifications.push({
          type: 'trading_opportunity',
          title: 'Premium Trading Available',
          message: `Your balance (${currency} ${availableBalance.toFixed(2)}) qualifies for premium trading strategies with larger position sizes.`,
          priority: 'high',
          balanceInfo,
          recommendedStrategy
        })
      }

      // Strategy recommendation notification
      notifications.push({
        type: 'strategy_recommendation',
        title: 'Recommended Trading Strategy',
        message: `Based on your balance, we recommend the "${recommendedStrategy.name}" strategy: ${recommendedStrategy.description}`,
        priority: 'medium',
        action: {
          label: 'Apply Strategy',
          onClick: () => this.applyStrategy(recommendedStrategy)
        },
        balanceInfo,
        recommendedStrategy
      })

      // Risk assessment
      let riskAssessment = 'Low Risk'
      if (availableBalance < this.balanceThresholds.low) {
        riskAssessment = 'High Risk - Low Balance'
      } else if (availableBalance < this.balanceThresholds.medium) {
        riskAssessment = 'Medium Risk - Limited Capital'
      } else if (availableBalance >= this.balanceThresholds.premium) {
        riskAssessment = 'Controlled Risk - Premium Capital'
      }

      logInfo(`Balance analysis completed for ${currency} ${availableBalance}`, 'BalanceBasedTradingService')

      return {
        recommendedStrategy,
        notifications,
        positionSize,
        riskAssessment
      }
    } catch (error) {
      logError('Failed to analyze balance and generate strategy', 'BalanceBasedTradingService', error)
      throw error
    }
  }

  /**
   * Generate trading signals based on balance and market conditions
   */
  generateBalanceBasedSignals(
    balanceInfo: BalanceInfo,
    marketSignals: any[],
    userPreferences: any
  ): {
    filteredSignals: any[]
    positionSizes: { [pair: string]: number }
    notifications: BalanceBasedNotification[]
  } {
    try {
      const { recommendedStrategy, positionSize } = this.analyzeBalanceAndGenerateStrategy(balanceInfo)
      const notifications: BalanceBasedNotification[] = []
      const positionSizes: { [pair: string]: number } = {}
      
      // Filter signals based on balance and strategy
      const filteredSignals = marketSignals.filter(signal => {
        // Only include signals for recommended pairs
        const isRecommendedPair = recommendedStrategy.recommendedPairs.includes(signal.pair)
        
        // Filter by confidence based on balance level
        const minConfidence = this.getMinConfidenceForBalance(balanceInfo.availableBalance)
        const meetsConfidence = signal.confidence >= minConfidence
        
        // Filter by risk level
        const meetsRiskLevel = this.matchesRiskLevel(signal.riskLevel, recommendedStrategy.riskLevel)
        
        return isRecommendedPair && meetsConfidence && meetsRiskLevel
      })

      // Calculate position sizes for each signal
      filteredSignals.forEach(signal => {
        const basePositionSize = positionSize
        const riskMultiplier = this.getRiskMultiplier(signal.riskLevel)
        const confidenceMultiplier = signal.confidence / 100
        
        positionSizes[signal.pair] = Math.round(
          basePositionSize * riskMultiplier * confidenceMultiplier * 100
        ) / 100
      })

      // Generate notifications for filtered signals
      if (filteredSignals.length > 0) {
        notifications.push({
          type: 'trading_opportunity',
          title: 'Trading Opportunities Available',
          message: `Found ${filteredSignals.length} trading opportunities matching your balance and risk profile.`,
          priority: 'high',
          balanceInfo,
          recommendedStrategy
        })
      } else {
        notifications.push({
          type: 'balance_alert',
          title: 'No Suitable Opportunities',
          message: 'No trading signals match your current balance and risk profile. Consider adjusting your strategy or waiting for better market conditions.',
          priority: 'medium',
          balanceInfo,
          recommendedStrategy
        })
      }

      logInfo(`Generated ${filteredSignals.length} balance-based signals`, 'BalanceBasedTradingService')

      return {
        filteredSignals,
        positionSizes,
        notifications
      }
    } catch (error) {
      logError('Failed to generate balance-based signals', 'BalanceBasedTradingService', error)
      throw error
    }
  }

  /**
   * Get minimum confidence threshold based on balance
   */
  private getMinConfidenceForBalance(balance: number): number {
    if (balance < this.balanceThresholds.low) return 90 // Very high confidence for low balance
    if (balance < this.balanceThresholds.medium) return 80 // High confidence for medium balance
    if (balance < this.balanceThresholds.high) return 70 // Medium confidence for high balance
    return 60 // Lower confidence for premium balance
  }

  /**
   * Get risk multiplier based on risk level
   */
  private getRiskMultiplier(riskLevel: string): number {
    switch (riskLevel) {
      case 'low': return 1.0
      case 'medium': return 0.8
      case 'high': return 0.6
      default: return 0.5
    }
  }

  /**
   * Check if signal risk level matches strategy risk level
   */
  private matchesRiskLevel(signalRisk: string, strategyRisk: string): boolean {
    const riskLevels = { low: 1, medium: 2, high: 3 }
    return riskLevels[signalRisk as keyof typeof riskLevels] <= riskLevels[strategyRisk as keyof typeof riskLevels]
  }

  /**
   * Apply recommended strategy
   */
  private applyStrategy(strategy: TradingStrategy): void {
    logInfo(`Applying strategy: ${strategy.name}`, 'BalanceBasedTradingService')
    // This would integrate with the trading system to apply the strategy
  }

  /**
   * Subscribe to balance-based notifications
   */
  onBalanceNotification(callback: (notification: BalanceBasedNotification) => void) {
    this.notificationCallbacks.push(callback)
    return () => {
      const index = this.notificationCallbacks.indexOf(callback)
      if (index > -1) {
        this.notificationCallbacks.splice(index, 1)
      }
    }
  }

  /**
   * Send notification to all subscribers
   */
  private sendNotification(notification: BalanceBasedNotification) {
    this.notificationCallbacks.forEach(callback => {
      try {
        callback(notification)
      } catch (error) {
        logError('Error in balance notification callback', 'BalanceBasedTradingService', error)
      }
    })
  }

  /**
   * Process balance updates and generate notifications
   */
  processBalanceUpdate(balanceInfo: BalanceInfo) {
    try {
      const { notifications } = this.analyzeBalanceAndGenerateStrategy(balanceInfo)
      
      // Send all notifications
      notifications.forEach(notification => {
        this.sendNotification(notification)
      })

      logInfo(`Processed balance update and sent ${notifications.length} notifications`, 'BalanceBasedTradingService')
    } catch (error) {
      logError('Failed to process balance update', 'BalanceBasedTradingService', error)
    }
  }

  /**
   * Get balance thresholds
   */
  getBalanceThresholds() {
    return this.balanceThresholds
  }

  /**
   * Get available trading strategies
   */
  getTradingStrategies() {
    return this.tradingStrategies
  }
}

// Singleton instance
let balanceBasedTradingInstance: BalanceBasedTradingService | null = null

export function getBalanceBasedTradingService(): BalanceBasedTradingService {
  if (!balanceBasedTradingInstance) {
    balanceBasedTradingInstance = new BalanceBasedTradingService()
  }
  return balanceBasedTradingInstance
}

export function destroyBalanceBasedTradingService() {
  if (balanceBasedTradingInstance) {
    balanceBasedTradingInstance = null
  }
}

export default BalanceBasedTradingService
