import React from 'react'
import { useWebSocket } from './websocketManager'
import { useAppState } from '../contexts/AppStateContext'
import { logInfo, logError, logWarn } from './logger'

interface TradeSignal {
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
  exchange: string
  timeframe: string
}

interface SignalServiceConfig {
  enabled: boolean
  reconnectInterval: number
  maxReconnectAttempts: number
  signalChannels: string[]
}

class RealTimeSignalService {
  private wsManager: any = null
  private config: SignalServiceConfig
  private isConnected: boolean = false
  private reconnectAttempts: number = 0
  private reconnectTimer: NodeJS.Timeout | null = null
  private signalCallbacks: ((signal: TradeSignal) => void)[] = []

  constructor(config: Partial<SignalServiceConfig> = {}) {
    this.config = {
      enabled: true,
      reconnectInterval: 5000,
      maxReconnectAttempts: 5,
      signalChannels: ['btcusdt@ticker', 'ethusdt@ticker', 'bnbusdt@ticker'],
      ...config
    }
  }

  /**
   * Initialize the real-time signal service
   */
  async initialize() {
    if (!this.config.enabled) {
      logWarn('Real-time signal service is disabled', 'RealTimeSignalService')
      return
    }

    try {
      // Initialize WebSocket connection
      this.wsManager = useWebSocket({
        url: 'wss://stream.binance.com:9443/ws/btcusdt@ticker',
        onOpen: this.handleConnectionOpen.bind(this),
        onClose: this.handleConnectionClose.bind(this),
        onError: this.handleConnectionError.bind(this),
        onMessage: this.handleMessage.bind(this)
      })

      await this.wsManager.connect()
      logInfo('Real-time signal service initialized', 'RealTimeSignalService')
    } catch (error) {
      logError('Failed to initialize real-time signal service', 'RealTimeSignalService', error)
      this.scheduleReconnect()
    }
  }

  /**
   * Subscribe to signal updates
   */
  onSignal(callback: (signal: TradeSignal) => void) {
    this.signalCallbacks.push(callback)
    return () => {
      const index = this.signalCallbacks.indexOf(callback)
      if (index > -1) {
        this.signalCallbacks.splice(index, 1)
      }
    }
  }

  /**
   * Handle WebSocket connection open
   */
  private handleConnectionOpen() {
    this.isConnected = true
    this.reconnectAttempts = 0
    logInfo('WebSocket connected for real-time signals', 'RealTimeSignalService')
  }

  /**
   * Handle WebSocket connection close
   */
  private handleConnectionClose(event: CloseEvent) {
    this.isConnected = false
    logWarn(`WebSocket closed: ${event.code} ${event.reason}`, 'RealTimeSignalService')
    
    if (this.reconnectAttempts < this.config.maxReconnectAttempts) {
      this.scheduleReconnect()
    }
  }

  /**
   * Handle WebSocket connection error
   */
  private handleConnectionError(error: Event) {
    this.isConnected = false
    logError('WebSocket connection error', 'RealTimeSignalService', error)
    this.scheduleReconnect()
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(data: any) {
    try {
      // Parse the message data
      const message = typeof data === 'string' ? JSON.parse(data) : data
      
      // Check if this is a trade signal
      if (message.type === 'trade_signal' || message.e === '24hrTicker') {
        this.processSignal(message)
      }
    } catch (error) {
      logError('Failed to process WebSocket message', 'RealTimeSignalService', error)
    }
  }

  /**
   * Process incoming signal data
   */
  private processSignal(data: any) {
    try {
      // Generate trade signal based on market data
      const signal = this.generateTradeSignal(data)
      
      if (signal) {
        // Notify all subscribers
        this.signalCallbacks.forEach(callback => {
          try {
            callback(signal)
          } catch (error) {
            logError('Error in signal callback', 'RealTimeSignalService', error)
          }
        })
      }
    } catch (error) {
      logError('Failed to process signal', 'RealTimeSignalService', error)
    }
  }

  /**
   * Generate trade signal from market data
   */
  private generateTradeSignal(data: any): TradeSignal | null {
    try {
      // This is a simplified signal generation
      // In production, this would use sophisticated technical analysis
      const pair = data.s?.replace('USDT', '/USDT') || 'BTC/USDT'
      const currentPrice = parseFloat(data.c || data.price || '0')
      
      if (currentPrice <= 0) return null

      // Simple signal logic (replace with actual strategy)
      const priceChange = parseFloat(data.P || '0')
      const volume = parseFloat(data.v || '0')
      
      // Only generate signals for significant price movements and volume
      if (Math.abs(priceChange) < 1 || volume < 1000) return null

      const signal: TradeSignal = {
        id: `signal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        pair,
        entry: currentPrice,
        stopLoss: currentPrice * (priceChange > 0 ? 0.98 : 1.02), // 2% stop loss
        takeProfit: currentPrice * (priceChange > 0 ? 1.05 : 0.95), // 5% take profit
        strategy: 'Real-time Momentum',
        confidence: Math.min(95, Math.max(60, Math.abs(priceChange) * 10 + 60)),
        riskLevel: Math.abs(priceChange) > 5 ? 'high' : Math.abs(priceChange) > 2 ? 'medium' : 'low',
        quantity: 1, // Default quantity
        side: priceChange > 0 ? 'BUY' : 'SELL',
        timestamp: new Date(),
        exchange: 'binance',
        timeframe: '1m'
      }

      return signal
    } catch (error) {
      logError('Failed to generate trade signal', 'RealTimeSignalService', error)
      return null
    }
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
    }

    this.reconnectTimer = setTimeout(() => {
      if (this.reconnectAttempts < this.config.maxReconnectAttempts) {
        this.reconnectAttempts++
        logInfo(`Attempting to reconnect (${this.reconnectAttempts}/${this.config.maxReconnectAttempts})`, 'RealTimeSignalService')
        this.initialize()
      } else {
        logError('Max reconnection attempts reached', 'RealTimeSignalService')
      }
    }, this.config.reconnectInterval)
  }

  /**
   * Disconnect the service
   */
  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }

    if (this.wsManager) {
      this.wsManager.disconnect()
      this.wsManager = null
    }

    this.isConnected = false
    this.signalCallbacks = []
    logInfo('Real-time signal service disconnected', 'RealTimeSignalService')
  }

  /**
   * Get connection status
   */
  getStatus() {
    return {
      connected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      subscribers: this.signalCallbacks.length
    }
  }
}

// Singleton instance
let signalServiceInstance: RealTimeSignalService | null = null

export function getRealTimeSignalService(): RealTimeSignalService {
  if (!signalServiceInstance) {
    signalServiceInstance = new RealTimeSignalService()
  }
  return signalServiceInstance
}

export function initializeRealTimeSignalService(config?: Partial<SignalServiceConfig>) {
  const service = getRealTimeSignalService()
  if (config) {
    Object.assign(service['config'], config)
  }
  return service.initialize()
}

export function destroyRealTimeSignalService() {
  if (signalServiceInstance) {
    signalServiceInstance.disconnect()
    signalServiceInstance = null
  }
}

// React hook for using the signal service
export function useRealTimeSignals() {
  const { addTradeSignalNotification } = useAppState()
  const [isConnected, setIsConnected] = React.useState(false)
  const [signals, setSignals] = React.useState<TradeSignal[]>([])

  React.useEffect(() => {
    const service = getRealTimeSignalService()
    
    // Subscribe to signals
    const unsubscribe = service.onSignal((signal) => {
      setSignals(prev => [signal, ...prev.slice(0, 49)]) // Keep last 50 signals
      
      // Auto-create notification for high-confidence signals
      if (signal.confidence >= 75) {
        addTradeSignalNotification({
          pair: signal.pair,
          entry: signal.entry,
          stopLoss: signal.stopLoss,
          takeProfit: signal.takeProfit,
          strategy: signal.strategy,
          confidence: signal.confidence,
          riskLevel: signal.riskLevel,
          quantity: signal.quantity,
          side: signal.side,
          timestamp: signal.timestamp
        })
      }
    })

    // Initialize service
    service.initialize().then(() => {
      setIsConnected(true)
    }).catch((error) => {
      logError('Failed to initialize signal service', 'useRealTimeSignals', error)
    })

    // Check connection status periodically
    const statusInterval = setInterval(() => {
      const status = service.getStatus()
      setIsConnected(status.connected)
    }, 1000)

    return () => {
      unsubscribe()
      clearInterval(statusInterval)
    }
  }, [addTradeSignalNotification])

  return {
    isConnected,
    signals,
    service: getRealTimeSignalService()
  }
}

export default RealTimeSignalService
