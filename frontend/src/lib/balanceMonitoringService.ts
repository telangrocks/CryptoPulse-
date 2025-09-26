import React from 'react'
import { getBalanceBasedTradingService } from './balanceBasedTrading'
import { useAppState } from '../contexts/AppStateContext'
import { logInfo, logError, logWarn } from './logger'

interface BalanceMonitoringConfig {
  enabled: boolean
  checkInterval: number // in milliseconds
  lowBalanceThreshold: number
  highBalanceThreshold: number
  autoGenerateSignals: boolean
}

interface BalanceUpdate {
  exchange: string
  currency: string
  totalBalance: number
  availableBalance: number
  lockedBalance: number
  timestamp: Date
}

class BalanceMonitoringService {
  private config: BalanceMonitoringConfig
  private isRunning: boolean = false
  private monitoringInterval: NodeJS.Timeout | null = null
  private lastBalances: Map<string, BalanceUpdate> = new Map()
  private appStateContext: any = null
  private balanceBasedTrading: any = null

  constructor(config: Partial<BalanceMonitoringConfig> = {}) {
    this.config = {
      enabled: true,
      checkInterval: 30000, // 30 seconds
      lowBalanceThreshold: 100,
      highBalanceThreshold: 1000,
      autoGenerateSignals: true,
      ...config
    }
    
    this.balanceBasedTrading = getBalanceBasedTradingService()
  }

  /**
   * Initialize the balance monitoring service
   */
  async initialize(appStateContext?: any) {
    if (!this.config.enabled) {
      logWarn('Balance monitoring service is disabled', 'BalanceMonitoringService')
      return
    }

    try {
      this.appStateContext = appStateContext
      
      // Set up balance-based trading notifications
      this.balanceBasedTrading.onBalanceNotification((notification) => {
        if (this.appStateContext && this.appStateContext.addNotification) {
          this.appStateContext.addNotification({
            type: this.mapPriorityToType(notification.priority),
            title: notification.title,
            message: notification.message,
            read: false,
            action: notification.action
          })
        }
      })

      this.isRunning = true
      logInfo('Balance monitoring service initialized', 'BalanceMonitoringService')
    } catch (error) {
      logError('Failed to initialize balance monitoring service', 'BalanceMonitoringService', error)
    }
  }

  /**
   * Start monitoring balances
   */
  start() {
    if (!this.config.enabled || this.isRunning) {
      return
    }

    this.monitoringInterval = setInterval(async () => {
      try {
        await this.checkBalances()
      } catch (error) {
        logError('Error during balance check', 'BalanceMonitoringService', error)
      }
    }, this.config.checkInterval)

    this.isRunning = true
    logInfo('Balance monitoring started', 'BalanceMonitoringService')
  }

  /**
   * Stop monitoring balances
   */
  stop() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = null
    }

    this.isRunning = false
    logInfo('Balance monitoring stopped', 'BalanceMonitoringService')
  }

  /**
   * Check current balances from all exchanges
   */
  private async checkBalances() {
    try {
      // This would typically fetch from the exchange APIs
      // For now, we'll simulate balance updates
      const mockBalances = await this.fetchMockBalances()
      
      for (const balance of mockBalances) {
        await this.processBalanceUpdate(balance)
      }
    } catch (error) {
      logError('Failed to check balances', 'BalanceMonitoringService', error)
    }
  }

  /**
   * Fetch mock balances for testing
   */
  private async fetchMockBalances(): Promise<BalanceUpdate[]> {
    // In production, this would fetch real balances from exchanges
    return [
      {
        exchange: 'binance',
        currency: 'USDT',
        totalBalance: 1250.50,
        availableBalance: 1000.00,
        lockedBalance: 250.50,
        timestamp: new Date()
      },
      {
        exchange: 'wazirx',
        currency: 'INR',
        totalBalance: 85000.00,
        availableBalance: 75000.00,
        lockedBalance: 10000.00,
        timestamp: new Date()
      }
    ]
  }

  /**
   * Process a balance update
   */
  private async processBalanceUpdate(balanceUpdate: BalanceUpdate) {
    try {
      const key = `${balanceUpdate.exchange}_${balanceUpdate.currency}`
      const lastBalance = this.lastBalances.get(key)
      
      // Check for significant balance changes
      if (lastBalance) {
        const balanceChange = balanceUpdate.availableBalance - lastBalance.availableBalance
        const changePercent = (balanceChange / lastBalance.availableBalance) * 100
        
        // Only process if there's a significant change (>5%)
        if (Math.abs(changePercent) < 5) {
          return
        }
      }

      // Update stored balance
      this.lastBalances.set(key, balanceUpdate)

      // Process with balance-based trading service
      this.balanceBasedTrading.processBalanceUpdate({
        totalBalance: balanceUpdate.totalBalance,
        availableBalance: balanceUpdate.availableBalance,
        lockedBalance: balanceUpdate.lockedBalance,
        currency: balanceUpdate.currency,
        exchange: balanceUpdate.exchange,
        lastUpdated: balanceUpdate.timestamp
      })

      logInfo(`Processed balance update for ${balanceUpdate.exchange} ${balanceUpdate.currency}`, 'BalanceMonitoringService')
    } catch (error) {
      logError('Failed to process balance update', 'BalanceMonitoringService', error)
    }
  }

  /**
   * Manually trigger balance check
   */
  async triggerBalanceCheck() {
    try {
      await this.checkBalances()
      logInfo('Manual balance check triggered', 'BalanceMonitoringService')
    } catch (error) {
      logError('Failed to trigger balance check', 'BalanceMonitoringService', error)
    }
  }

  /**
   * Get current balance status
   */
  getBalanceStatus() {
    const balances = Array.from(this.lastBalances.values())
    const totalAvailable = balances.reduce((sum, balance) => sum + balance.availableBalance, 0)
    const totalLocked = balances.reduce((sum, balance) => sum + balance.lockedBalance, 0)
    
    return {
      totalAvailable,
      totalLocked,
      totalBalance: totalAvailable + totalLocked,
      exchangeCount: balances.length,
      lastUpdate: balances.length > 0 ? Math.max(...balances.map(b => b.timestamp.getTime())) : null,
      isMonitoring: this.isRunning
    }
  }

  /**
   * Map priority to notification type
   */
  private mapPriorityToType(priority: string): 'success' | 'error' | 'warning' | 'info' {
    switch (priority) {
      case 'critical': return 'error'
      case 'high': return 'warning'
      case 'medium': return 'info'
      case 'low': return 'success'
      default: return 'info'
    }
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<BalanceMonitoringConfig>) {
    this.config = { ...this.config, ...newConfig }
    logInfo('Balance monitoring configuration updated', 'BalanceMonitoringService')
  }

  /**
   * Get current configuration
   */
  getConfig() {
    return { ...this.config }
  }
}

// Singleton instance
let balanceMonitoringInstance: BalanceMonitoringService | null = null

export function getBalanceMonitoringService(): BalanceMonitoringService {
  if (!balanceMonitoringInstance) {
    balanceMonitoringInstance = new BalanceMonitoringService()
  }
  return balanceMonitoringInstance
}

export function initializeBalanceMonitoring(
  config?: Partial<BalanceMonitoringConfig>,
  appStateContext?: any
) {
  const service = getBalanceMonitoringService()
  if (config) {
    service.updateConfig(config)
  }
  return service.initialize(appStateContext)
}

export function destroyBalanceMonitoringService() {
  if (balanceMonitoringInstance) {
    balanceMonitoringInstance.stop()
    balanceMonitoringInstance = null
  }
}

// React hook for using balance monitoring
export function useBalanceMonitoring() {
  const appStateContext = useAppState()
  const [isMonitoring, setIsMonitoring] = React.useState(false)
  const [balanceStatus, setBalanceStatus] = React.useState<any>(null)

  React.useEffect(() => {
    const service = getBalanceMonitoringService()
    
    // Initialize service
    service.initialize(appStateContext).then(() => {
      service.start()
      setIsMonitoring(true)
    }).catch((error) => {
      logError('Failed to initialize balance monitoring', 'useBalanceMonitoring', error)
    })

    // Update balance status periodically
    const statusInterval = setInterval(() => {
      const status = service.getBalanceStatus()
      setBalanceStatus(status)
    }, 5000)

    return () => {
      clearInterval(statusInterval)
      service.stop()
    }
  }, [appStateContext])

  return {
    isMonitoring,
    balanceStatus,
    service: getBalanceMonitoringService()
  }
}

export default BalanceMonitoringService
