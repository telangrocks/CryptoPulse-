import React from 'react'
import { getRealTimeSignalService } from './realTimeSignalService'
import { getSignalProcessor } from './signalProcessor'
import { useAppState } from '../contexts/AppStateContext'
import { logInfo, logError, logWarn } from './logger'

interface WebSocketSignalIntegrationConfig {
  enabled: boolean
  autoProcessSignals: boolean
  minConfidence: number
  maxSignalsPerMinute: number
}

class WebSocketSignalIntegration {
  private config: WebSocketSignalIntegrationConfig
  private isInitialized: boolean = false
  private signalService: any = null
  private signalProcessor: any = null
  private appStateContext: any = null

  constructor(config: Partial<WebSocketSignalIntegrationConfig> = {}) {
    this.config = {
      enabled: true,
      autoProcessSignals: true,
      minConfidence: 75,
      maxSignalsPerMinute: 10,
      ...config
    }
  }

  /**
   * Initialize the WebSocket signal integration
   */
  async initialize(appStateContext?: any) {
    if (!this.config.enabled) {
      logWarn('WebSocket signal integration is disabled', 'WebSocketSignalIntegration')
      return
    }

    try {
      this.appStateContext = appStateContext

      // Initialize signal service
      this.signalService = getRealTimeSignalService()
      await this.signalService.initialize()

      // Initialize signal processor
      this.signalProcessor = getSignalProcessor()
      this.signalProcessor.start()

      // Set up signal processing pipeline
      this.setupSignalPipeline()

      this.isInitialized = true
      logInfo('WebSocket signal integration initialized', 'WebSocketSignalIntegration')
    } catch (error) {
      logError('Failed to initialize WebSocket signal integration', 'WebSocketSignalIntegration', error)
    }
  }

  /**
   * Set up the signal processing pipeline
   */
  private setupSignalPipeline() {
    if (!this.signalService || !this.signalProcessor) {
      logError('Signal service or processor not initialized', 'WebSocketSignalIntegration')
      return
    }

    // Subscribe to raw signals from WebSocket
    this.signalService.onSignal((rawSignal: any) => {
      try {
        // Process the raw signal
        const processed = this.signalProcessor.addSignal({
          pair: rawSignal.pair,
          entry: rawSignal.entry,
          stopLoss: rawSignal.stopLoss,
          takeProfit: rawSignal.takeProfit,
          strategy: rawSignal.strategy,
          confidence: rawSignal.confidence,
          riskLevel: rawSignal.riskLevel,
          quantity: rawSignal.quantity,
          side: rawSignal.side,
          timestamp: rawSignal.timestamp
        })

        if (processed) {
          logInfo(`Signal processed: ${rawSignal.pair} (${rawSignal.side})`, 'WebSocketSignalIntegration')
        }
      } catch (error) {
        logError('Error processing raw signal', 'WebSocketSignalIntegration', error)
      }
    })

    // Subscribe to processed signals
    this.signalProcessor.onProcessedSignal((processedSignal: any) => {
      try {
        // Create notification if app state context is available
        if (this.appStateContext && this.appStateContext.addTradeSignalNotification) {
          this.appStateContext.addTradeSignalNotification({
            pair: processedSignal.pair,
            entry: processedSignal.entry,
            stopLoss: processedSignal.stopLoss,
            takeProfit: processedSignal.takeProfit,
            strategy: processedSignal.strategy,
            confidence: processedSignal.confidence,
            riskLevel: processedSignal.riskLevel,
            quantity: processedSignal.quantity,
            side: processedSignal.side,
            timestamp: processedSignal.timestamp
          })

          logInfo(`Notification created for signal: ${processedSignal.pair}`, 'WebSocketSignalIntegration')
        }
      } catch (error) {
        logError('Error creating notification for processed signal', 'WebSocketSignalIntegration', error)
      }
    })
  }

  /**
   * Get integration status
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      signalServiceStatus: this.signalService?.getStatus() || null,
      signalProcessorStatus: this.signalProcessor?.getStatus() || null,
      config: this.config
    }
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<WebSocketSignalIntegrationConfig>) {
    this.config = { ...this.config, ...newConfig }
    
    if (this.signalProcessor) {
      this.signalProcessor.updateConfig({
        minConfidence: this.config.minConfidence,
        maxSignalsPerMinute: this.config.maxSignalsPerMinute
      })
    }

    logInfo('WebSocket signal integration configuration updated', 'WebSocketSignalIntegration')
  }

  /**
   * Disconnect and cleanup
   */
  disconnect() {
    try {
      if (this.signalService) {
        this.signalService.disconnect()
        this.signalService = null
      }

      if (this.signalProcessor) {
        this.signalProcessor.stop()
        this.signalProcessor = null
      }

      this.isInitialized = false
      this.appStateContext = null

      logInfo('WebSocket signal integration disconnected', 'WebSocketSignalIntegration')
    } catch (error) {
      logError('Error disconnecting WebSocket signal integration', 'WebSocketSignalIntegration', error)
    }
  }
}

// Singleton instance
let integrationInstance: WebSocketSignalIntegration | null = null

export function getWebSocketSignalIntegration(): WebSocketSignalIntegration {
  if (!integrationInstance) {
    integrationInstance = new WebSocketSignalIntegration()
  }
  return integrationInstance
}

export function initializeWebSocketSignalIntegration(
  config?: Partial<WebSocketSignalIntegrationConfig>,
  appStateContext?: any
) {
  const integration = getWebSocketSignalIntegration()
  if (config) {
    integration.updateConfig(config)
  }
  return integration.initialize(appStateContext)
}

export function destroyWebSocketSignalIntegration() {
  if (integrationInstance) {
    integrationInstance.disconnect()
    integrationInstance = null
  }
}

// React hook for using the integration
export function useWebSocketSignalIntegration() {
  const appStateContext = useAppState()
  const [isConnected, setIsConnected] = React.useState(false)
  const [status, setStatus] = React.useState<any>(null)

  React.useEffect(() => {
    const integration = getWebSocketSignalIntegration()
    
    // Initialize integration
    integration.initialize(appStateContext).then(() => {
      setIsConnected(true)
    }).catch((error) => {
      logError('Failed to initialize WebSocket signal integration', 'useWebSocketSignalIntegration', error)
    })

    // Check status periodically
    const statusInterval = setInterval(() => {
      const currentStatus = integration.getStatus()
      setStatus(currentStatus)
      setIsConnected(currentStatus.initialized)
    }, 5000)

    return () => {
      clearInterval(statusInterval)
    }
  }, [appStateContext])

  return {
    isConnected,
    status,
    integration: getWebSocketSignalIntegration()
  }
}

export default WebSocketSignalIntegration
