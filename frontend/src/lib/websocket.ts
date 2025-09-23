/**
 * WebSocket connection manager for real-time updates
 * Handles connection, reconnection, and message broadcasting
 */

import React from 'react';
import { logInfo, logWarn, logError } from '../lib/logger';

export interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: number;
}

export interface WebSocketConfig {
  url: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
}

type MessageHandler = (message: WebSocketMessage) => void;
type ConnectionHandler = (connected: boolean) => void;

class WebSocketManager {
  private ws: WebSocket | null = null;
  private config: Required<WebSocketConfig>;
  private messageHandlers = new Set<MessageHandler>();
  private connectionHandlers = new Set<ConnectionHandler>();
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private isConnecting = false;
  private isDestroyed = false;

  constructor(config: WebSocketConfig) {
    this.config = {
      url: config.url,
      reconnectInterval: config.reconnectInterval || 5000,
      maxReconnectAttempts: config.maxReconnectAttempts || 10,
      heartbeatInterval: config.heartbeatInterval || 30000,
    };
  }

  /**
   * Connect to WebSocket
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isConnecting || this.isDestroyed) {
        reject(new Error('Already connecting or destroyed'));
        return;
      }

      this.isConnecting = true;

      try {
        this.ws = new WebSocket(this.config.url);

        this.ws.onopen = () => {
          logInfo('WebSocket connected', 'WebSocket');
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          this.notifyConnectionHandlers(true);
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            this.notifyMessageHandlers(message);
          } catch (error) {
            logError('Failed to parse WebSocket message', 'WebSocket', error);
          }
        };

        this.ws.onclose = (event) => {
          logWarn(`WebSocket closed: ${event.code} ${event.reason}`, 'WebSocket');
          this.isConnecting = false;
          this.stopHeartbeat();
          this.notifyConnectionHandlers(false);
          
          if (!this.isDestroyed && this.reconnectAttempts < this.config.maxReconnectAttempts) {
            this.scheduleReconnect();
          }
        };

        this.ws.onerror = (error) => {
          logError('WebSocket error', 'WebSocket', error);
          this.isConnecting = false;
          reject(error);
        };

      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect(): void {
    this.isDestroyed = true;
    this.stopHeartbeat();
    this.stopReconnect();

    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }

    logInfo('WebSocket disconnected', 'WebSocket');
  }

  /**
   * Send message through WebSocket
   */
  send(message: WebSocketMessage): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      logWarn('WebSocket not connected, cannot send message', 'WebSocket');
      return false;
    }

    try {
      this.ws.send(JSON.stringify(message));
      return true;
    } catch (error) {
      logError('Failed to send WebSocket message', 'WebSocket', error);
      return false;
    }
  }

  /**
   * Subscribe to message events
   */
  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler);
    
    return () => {
      this.messageHandlers.delete(handler);
    };
  }

  /**
   * Subscribe to connection events
   */
  onConnection(handler: ConnectionHandler): () => void {
    this.connectionHandlers.add(handler);
    
    return () => {
      this.connectionHandlers.delete(handler);
    };
  }

  /**
   * Get connection status
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Get connection state
   */
  getReadyState(): number {
    return this.ws?.readyState ?? WebSocket.CLOSED;
  }

  /**
   * Schedule reconnection
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      return;
    }

    this.reconnectAttempts++;
    const delay = this.config.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1);
    
    logInfo(`Scheduling WebSocket reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`, 'WebSocket');

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect().catch((error) => {
        logError('Reconnect failed', 'WebSocket', error);
      });
    }, delay);
  }

  /**
   * Stop reconnection attempts
   */
  private stopReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  /**
   * Start heartbeat to keep connection alive
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();
    
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected()) {
        this.send({
          type: 'ping',
          data: { timestamp: Date.now() },
          timestamp: Date.now(),
        });
      }
    }, this.config.heartbeatInterval);
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Notify message handlers
   */
  private notifyMessageHandlers(message: WebSocketMessage): void {
    this.messageHandlers.forEach(handler => {
      try {
        handler(message);
      } catch (error) {
        logError('Error in message handler', 'WebSocket', error);
      }
    });
  }

  /**
   * Notify connection handlers
   */
  private notifyConnectionHandlers(connected: boolean): void {
    this.connectionHandlers.forEach(handler => {
      try {
        handler(connected);
      } catch (error) {
        logError('Error in connection handler', 'WebSocket', error);
      }
    });
  }
}

// Create singleton WebSocket manager
let wsManager: WebSocketManager | null = null;

export function createWebSocketManager(config: WebSocketConfig): WebSocketManager {
  if (wsManager) {
    wsManager.disconnect();
  }
  
  wsManager = new WebSocketManager(config);
  return wsManager;
}

export function getWebSocketManager(): WebSocketManager | null {
  return wsManager;
}

export function destroyWebSocketManager(): void {
  if (wsManager) {
    wsManager.disconnect();
    wsManager = null;
  }
}

// React hook for WebSocket
export function useWebSocket(config: WebSocketConfig) {
  const [isConnected, setIsConnected] = React.useState(false);
  const [messages, setMessages] = React.useState<WebSocketMessage[]>([]);
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    const manager = createWebSocketManager(config);
    
    const unsubscribeConnection = manager.onConnection((connected) => {
      setIsConnected(connected);
      if (connected) {
        setError(null);
      }
    });

    const unsubscribeMessage = manager.onMessage((message) => {
      setMessages(prev => [...prev.slice(-99), message]); // Keep last 100 messages
    });

    manager.connect().catch((err) => {
      setError(err);
    });

    return () => {
      unsubscribeConnection();
      unsubscribeMessage();
      manager.disconnect();
    };
  }, [config.url]);

  const sendMessage = React.useCallback((message: Omit<WebSocketMessage, 'timestamp'>) => {
    const manager = getWebSocketManager();
    if (manager) {
      return manager.send({
        ...message,
        timestamp: Date.now(),
      });
    }
    return false;
  }, []);

  return {
    isConnected,
    messages,
    error,
    sendMessage,
  };
}

export default WebSocketManager;
