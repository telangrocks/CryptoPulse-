/**
 * Advanced WebSocket manager for real-time data
 */

import React from 'react'
import { logInfo, logWarn, logError } from './logger'

interface WebSocketConfig {
  url: string
  protocols?: string | string[]
  reconnectInterval?: number
  maxReconnectAttempts?: number
  heartbeatInterval?: number
  onOpen?: () => void
  onClose?: (event: CloseEvent) => void
  onError?: (event: Event) => void
  onMessage?: (data: any) => void
}

interface Subscription {
  id: string
  channel: string
  callback: (data: any) => void
  active: boolean
}

class WebSocketManager {
  private ws: WebSocket | null = null
  private config: WebSocketConfig
  private reconnectAttempts = 0
  private reconnectTimer: NodeJS.Timeout | null = null
  private heartbeatTimer: NodeJS.Timeout | null = null
  private subscriptions = new Map<string, Subscription>()
  private messageQueue: any[] = []
  private isConnecting = false

  constructor(config: WebSocketConfig) {
    this.config = {
      reconnectInterval: 5000,
      maxReconnectAttempts: 10,
      heartbeatInterval: 30000,
      ...config
    }
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        resolve()
        return
      }

      if (this.isConnecting) {
        reject(new Error('Connection already in progress'))
        return
      }

      this.isConnecting = true

      try {
        this.ws = new WebSocket(this.config.url, this.config.protocols)

        this.ws.onopen = () => {
          this.isConnecting = false
          this.reconnectAttempts = 0
          this.startHeartbeat()
          this.processMessageQueue()
          this.config.onOpen?.()
          resolve()
        }

        this.ws.onclose = (event) => {
          this.isConnecting = false
          this.stopHeartbeat()
          this.config.onClose?.(event)
          this.handleReconnect()
        }

        this.ws.onerror = (event) => {
          this.isConnecting = false
          this.config.onError?.(event)
          reject(new Error('WebSocket connection failed'))
        }

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            this.handleMessage(data)
          } catch (error) {
            logError('Failed to parse WebSocket message', 'WebSocketManager', error)
          }
        }
      } catch (error) {
        this.isConnecting = false
        reject(error)
      }
    })
  }

  disconnect(): void {
    this.stopHeartbeat()
    this.clearReconnectTimer()
    
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect')
      this.ws = null
    }
  }

  send(data: any): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data))
    } else {
      this.messageQueue.push(data)
    }
  }

  subscribe(channel: string, callback: (data: any) => void): string {
    const id = `${channel}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    this.subscriptions.set(id, {
      id,
      channel,
      callback,
      active: true
    })

    // Send subscription message
    this.send({
      type: 'subscribe',
      channel,
      id
    })

    return id
  }

  unsubscribe(id: string): void {
    const subscription = this.subscriptions.get(id)
    if (subscription) {
      subscription.active = false
      this.subscriptions.delete(id)

      // Send unsubscription message
      this.send({
        type: 'unsubscribe',
        channel: subscription.channel,
        id
      })
    }
  }

  private handleMessage(data: any): void {
    this.config.onMessage?.(data)

    // Handle different message types
    switch (data.type) {
      case 'subscription_confirmed':
        logInfo(`Subscription confirmed: ${data.channel}`, 'WebSocketManager')
        break
      
      case 'unsubscription_confirmed':
        logInfo(`Unsubscription confirmed: ${data.channel}`, 'WebSocketManager')
        break
      
      case 'error':
        logError(`WebSocket error: ${data.message}`, 'WebSocketManager')
        break
      
      case 'heartbeat':
        // Respond to heartbeat
        this.send({ type: 'heartbeat_ack' })
        break
      
      default:
        // Route to subscribers
        this.routeToSubscribers(data)
        break
    }
  }

  private routeToSubscribers(data: any): void {
    this.subscriptions.forEach(subscription => {
      if (subscription.active && data.channel === subscription.channel) {
        try {
          subscription.callback(data)
        } catch (error) {
          logError('Error in subscription callback', 'WebSocketManager', error)
        }
      }
    })
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts!) {
      logError('Max reconnection attempts reached', 'WebSocketManager')
      return
    }

    this.reconnectAttempts++
    logInfo(`Attempting to reconnect (${this.reconnectAttempts}/${this.config.maxReconnectAttempts})`, 'WebSocketManager')

    this.reconnectTimer = setTimeout(() => {
      this.connect().catch(error => {
        logError('Reconnection failed', 'WebSocketManager', error)
      })
    }, this.config.reconnectInterval)
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.send({ type: 'heartbeat' })
      }
    }, this.config.heartbeatInterval)
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
  }

  private processMessageQueue(): void {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift()
      this.send(message)
    }
  }

  getStatus(): {
    connected: boolean
    connecting: boolean
    reconnectAttempts: number
    subscriptions: number
  } {
    return {
      connected: this.ws?.readyState === WebSocket.OPEN,
      connecting: this.isConnecting,
      reconnectAttempts: this.reconnectAttempts,
      subscriptions: this.subscriptions.size
    }
  }
}

// Binance WebSocket manager
export class BinanceWebSocketManager extends WebSocketManager {
  constructor() {
    super({
      url: 'wss://stream.binance.com:9443/ws/btcusdt@ticker',
      onOpen: () => logInfo('Connected to Binance WebSocket', 'BinanceWS'),
      onClose: (event) => logInfo(`Disconnected from Binance WebSocket: ${event.code}`, 'BinanceWS'),
      onError: (event) => logError('Binance WebSocket error', 'BinanceWS', event)
    })
  }

  subscribeToTicker(symbol: string, callback: (data: any) => void): string {
    const channel = `${symbol.toLowerCase()}@ticker`
    return this.subscribe(channel, callback)
  }

  subscribeToKline(symbol: string, interval: string, callback: (data: any) => void): string {
    const channel = `${symbol.toLowerCase()}@kline_${interval}`
    return this.subscribe(channel, callback)
  }

  subscribeToDepth(symbol: string, callback: (data: any) => void): string {
    const channel = `${symbol.toLowerCase()}@depth`
    return this.subscribe(channel, callback)
  }

  subscribeToTrade(symbol: string, callback: (data: any) => void): string {
    const channel = `${symbol.toLowerCase()}@trade`
    return this.subscribe(channel, callback)
  }
}

// React hook for WebSocket
export function useWebSocket(config: WebSocketConfig) {
  const [manager] = React.useState(() => new WebSocketManager(config))
  const [status, setStatus] = React.useState(manager.getStatus())

  React.useEffect(() => {
    const interval = setInterval(() => {
      setStatus(manager.getStatus())
    }, 1000)

    return () => clearInterval(interval)
  }, [manager])

  React.useEffect(() => {
    return () => {
      manager.disconnect()
    }
  }, [manager])

  return {
    manager,
    status,
    connect: () => manager.connect(),
    disconnect: () => manager.disconnect(),
    send: (data: any) => manager.send(data),
    subscribe: (channel: string, callback: (data: any) => void) => 
      manager.subscribe(channel, callback),
    unsubscribe: (id: string) => manager.unsubscribe(id)
  }
}

// Singleton instances
export const binanceWS = new BinanceWebSocketManager()

// Auto-connect on import
if (typeof window !== 'undefined') {
  binanceWS.connect().catch(error => logError('Auto-connect failed', 'BinanceWS', error))
}
