import { logInfo, logError, logWarn } from './logger'

interface SignalProcessorConfig {
  minConfidence: number
  maxSignalsPerMinute: number
  cooldownPeriod: number // in milliseconds
  priorityThreshold: number
}

interface ProcessedSignal {
  id: string
  pair: string
  entry: number
  stopLoss: number
  takeProfit: number
  strategy: string
  confidence: number
  riskLevel: 'low' | 'medium' | 'high'
  quantity: number
  side: 'BUY' | 'SELL'
  timestamp: Date
  priority: 'low' | 'medium' | 'high'
  processed: boolean
}

class SignalProcessor {
  private config: SignalProcessorConfig
  private signalQueue: ProcessedSignal[] = []
  private lastSignalTime: Map<string, number> = new Map()
  private processingInterval: NodeJS.Timeout | null = null
  private signalCallbacks: ((signal: ProcessedSignal) => void)[] = []

  constructor(config: Partial<SignalProcessorConfig> = {}) {
    this.config = {
      minConfidence: 70,
      maxSignalsPerMinute: 10,
      cooldownPeriod: 30000, // 30 seconds
      priorityThreshold: 85,
      ...config
    }
  }

  /**
   * Start processing signals
   */
  start() {
    if (this.processingInterval) {
      clearInterval(this.processingInterval)
    }

    this.processingInterval = setInterval(() => {
      this.processQueue()
    }, 1000) // Process every second

    logInfo('Signal processor started', 'SignalProcessor')
  }

  /**
   * Stop processing signals
   */
  stop() {
    if (this.processingInterval) {
      clearInterval(this.processingInterval)
      this.processingInterval = null
    }

    logInfo('Signal processor stopped', 'SignalProcessor')
  }

  /**
   * Add signal to processing queue
   */
  addSignal(signal: Omit<ProcessedSignal, 'id' | 'priority' | 'processed'>) {
    try {
      // Check if signal meets minimum requirements
      if (signal.confidence < this.config.minConfidence) {
        logWarn(`Signal rejected: confidence too low (${signal.confidence}%)`, 'SignalProcessor')
        return false
      }

      // Check cooldown period for this pair
      const lastTime = this.lastSignalTime.get(signal.pair)
      const now = Date.now()
      if (lastTime && (now - lastTime) < this.config.cooldownPeriod) {
        logWarn(`Signal rejected: cooldown period active for ${signal.pair}`, 'SignalProcessor')
        return false
      }

      // Check rate limiting
      const recentSignals = this.signalQueue.filter(s => 
        Date.now() - s.timestamp.getTime() < 60000 // Last minute
      )
      if (recentSignals.length >= this.config.maxSignalsPerMinute) {
        logWarn('Signal rejected: rate limit exceeded', 'SignalProcessor')
        return false
      }

      // Determine priority
      const priority = this.calculatePriority(signal)

      // Create processed signal
      const processedSignal: ProcessedSignal = {
        ...signal,
        id: `processed_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        priority,
        processed: false
      }

      // Add to queue
      this.signalQueue.push(processedSignal)
      this.lastSignalTime.set(signal.pair, now)

      logInfo(`Signal added to queue: ${signal.pair} (${signal.side}) - ${signal.confidence}% confidence`, 'SignalProcessor')
      return true
    } catch (error) {
      logError('Failed to add signal to queue', 'SignalProcessor', error)
      return false
    }
  }

  /**
   * Calculate signal priority
   */
  private calculatePriority(signal: Omit<ProcessedSignal, 'id' | 'priority' | 'processed'>): 'low' | 'medium' | 'high' {
    let score = 0

    // Confidence score (0-40 points)
    score += Math.min(40, signal.confidence * 0.4)

    // Risk level score (0-20 points)
    switch (signal.riskLevel) {
      case 'low': score += 20; break
      case 'medium': score += 15; break
      case 'high': score += 10; break
    }

    // Strategy score (0-20 points)
    const strategyScores: { [key: string]: number } = {
      'Real-time Momentum': 20,
      'EMA Crossover + RSI Filter': 18,
      'Bollinger Bands Squeeze': 16,
      'MACD Divergence Strategy': 15,
      'Volume Breakout Strategy': 17,
      'Support/Resistance Breakout': 14,
      'Trend Following Strategy': 13,
      'Mean Reversion Strategy': 12,
      'Breakout Confirmation Strategy': 16,
      'Quick Scalp Strategy': 19
    }
    score += strategyScores[signal.strategy] || 10

    // Pair popularity score (0-20 points)
    const popularPairs = ['BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'ADA/USDT', 'SOL/USDT']
    if (popularPairs.includes(signal.pair)) {
      score += 20
    } else {
      score += 10
    }

    // Determine priority based on score
    if (score >= 80) return 'high'
    if (score >= 60) return 'medium'
    return 'low'
  }

  /**
   * Process the signal queue
   */
  private processQueue() {
    try {
      // Sort by priority and timestamp
      this.signalQueue.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 }
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[b.priority] - priorityOrder[a.priority]
        }
        return b.timestamp.getTime() - a.timestamp.getTime()
      })

      // Process high priority signals first
      const highPrioritySignals = this.signalQueue.filter(s => 
        s.priority === 'high' && !s.processed
      )

      for (const signal of highPrioritySignals) {
        this.processSignal(signal)
      }

      // Process medium priority signals
      const mediumPrioritySignals = this.signalQueue.filter(s => 
        s.priority === 'medium' && !s.processed
      )

      for (const signal of mediumPrioritySignals.slice(0, 3)) { // Limit to 3 per cycle
        this.processSignal(signal)
      }

      // Process low priority signals
      const lowPrioritySignals = this.signalQueue.filter(s => 
        s.priority === 'low' && !s.processed
      )

      for (const signal of lowPrioritySignals.slice(0, 2)) { // Limit to 2 per cycle
        this.processSignal(signal)
      }

      // Clean up old processed signals
      this.cleanupProcessedSignals()
    } catch (error) {
      logError('Error processing signal queue', 'SignalProcessor', error)
    }
  }

  /**
   * Process individual signal
   */
  private processSignal(signal: ProcessedSignal) {
    try {
      signal.processed = true
      
      // Notify all subscribers
      this.signalCallbacks.forEach(callback => {
        try {
          callback(signal)
        } catch (error) {
          logError('Error in signal callback', 'SignalProcessor', error)
        }
      })

      logInfo(`Signal processed: ${signal.pair} (${signal.side}) - ${signal.priority} priority`, 'SignalProcessor')
    } catch (error) {
      logError('Failed to process signal', 'SignalProcessor', error)
    }
  }

  /**
   * Clean up old processed signals
   */
  private cleanupProcessedSignals() {
    const cutoffTime = Date.now() - 300000 // 5 minutes ago
    this.signalQueue = this.signalQueue.filter(signal => 
      signal.timestamp.getTime() > cutoffTime || !signal.processed
    )
  }

  /**
   * Subscribe to processed signals
   */
  onProcessedSignal(callback: (signal: ProcessedSignal) => void) {
    this.signalCallbacks.push(callback)
    return () => {
      const index = this.signalCallbacks.indexOf(callback)
      if (index > -1) {
        this.signalCallbacks.splice(index, 1)
      }
    }
  }

  /**
   * Get processor status
   */
  getStatus() {
    return {
      queueLength: this.signalQueue.length,
      processedCount: this.signalQueue.filter(s => s.processed).length,
      pendingCount: this.signalQueue.filter(s => !s.processed).length,
      isRunning: this.processingInterval !== null
    }
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<SignalProcessorConfig>) {
    this.config = { ...this.config, ...newConfig }
    logInfo('Signal processor configuration updated', 'SignalProcessor')
  }
}

// Singleton instance
let signalProcessorInstance: SignalProcessor | null = null

export function getSignalProcessor(): SignalProcessor {
  if (!signalProcessorInstance) {
    signalProcessorInstance = new SignalProcessor()
  }
  return signalProcessorInstance
}

export function initializeSignalProcessor(config?: Partial<SignalProcessorConfig>) {
  const processor = getSignalProcessor()
  if (config) {
    processor.updateConfig(config)
  }
  processor.start()
  return processor
}

export function destroySignalProcessor() {
  if (signalProcessorInstance) {
    signalProcessorInstance.stop()
    signalProcessorInstance = null
  }
}

export default SignalProcessor
