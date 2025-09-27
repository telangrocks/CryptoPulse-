/**
 * Real Exchange Integration System
 * Provides actual trading functionality with real exchanges
 */

import { logError, logInfo, logWarn } from '../lib/logger';
import { circuitBreakers, withCircuitBreaker } from './circuitBreaker';
import type { 
  ExchangeCredentials, 
  OrderRequest as ExternalOrderRequest, 
  OrderResponse as ExternalOrderResponse, 
  MarketData as ExternalMarketData,
  TradingPair,
  OrderSide,
  ExchangeName
} from '../types/external-apis';

// Local type definitions to avoid conflicts
export interface OrderRequest {
  symbol: string;
  side: 'BUY' | 'SELL';
  type: 'MARKET' | 'LIMIT' | 'STOP_LOSS' | 'TAKE_PROFIT';
  quantity: number;
  price?: number;
  stopPrice?: number;
  timeInForce?: 'GTC' | 'IOC' | 'FOK';
}

export interface OrderResponse {
  orderId: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  type: 'MARKET' | 'LIMIT';
  quantity: number;
  price: number;
  status: string;
  timestamp: number;
  filledQuantity: number;
  remainingQuantity: number;
  averagePrice: number;
  exchange: string;
  fills?: Array<{
    price: number;
    quantity: number;
    commission: number;
    commissionAsset: string;
  }>;
}

export interface MarketData {
  symbol: string;
  price: number;
  volume: number;
  change: number;
  change24h: number;
  high24h: number;
  low24h: number;
  timestamp: number;
}

export interface ExchangeConfig {
  name: string;
  apiKey: string;
  apiSecret: string;
  baseUrl: string;
  sandbox?: boolean;
}

export interface AccountInfo {
  balances: Array<{
    asset: string;
    free: string;
    locked: string;
  }>;
  permissions: string[];
  canTrade: boolean;
  canWithdraw: boolean;
  canDeposit: boolean;
}

class ExchangeIntegration {
  private config: ExchangeConfig;
  private isConnected: boolean = false;

  constructor(config: ExchangeConfig) {
    this.config = config;
  }

  /**
   * Initialize connection to exchange
   */
  async connect(): Promise<boolean> {
    try {
      logInfo(`Connecting to ${this.config.name} exchange`, 'Exchange');
      
      // Test API credentials
      const accountInfo = await this.getAccountInfo();
      if (accountInfo) {
        this.isConnected = true;
        logInfo(`Successfully connected to ${this.config.name}`, 'Exchange');
        return true;
      }
      
      return false;
    } catch (error) {
      logError(`Failed to connect to ${this.config.name}`, 'Exchange', error);
      return false;
    }
  }

  /**
   * Get account information
   */
  async getAccountInfo(): Promise<AccountInfo | null> {
    try {
      const response = await this.makeRequest('GET', '/api/v3/account');
      return {
        balances: response.balances || [],
        permissions: response.permissions || [],
        canTrade: response.canTrade || false,
        canWithdraw: response.canWithdraw || false,
        canDeposit: response.canDeposit || false
      };
    } catch (error) {
      logError('Failed to get account info', 'Exchange', error);
      return null;
    }
  }

  /**
   * Get market data for a symbol
   */
  async getMarketData(symbol: string): Promise<MarketData | null> {
    try {
      const response = await this.makeRequest('GET', `/api/v3/ticker/24hr?symbol=${symbol}`);
      return {
        symbol: response.symbol,
        price: parseFloat(response.lastPrice),
        volume: parseFloat(response.volume),
        change: parseFloat(response.priceChangePercent),
        change24h: parseFloat(response.priceChangePercent),
        high24h: parseFloat(response.highPrice),
        low24h: parseFloat(response.lowPrice),
        timestamp: response.closeTime
      };
    } catch (error) {
      logError(`Failed to get market data for ${symbol}`, 'Exchange', error);
      return null;
    }
  }

  /**
   * Place a market order
   */
  async placeMarketOrder(order: OrderRequest): Promise<OrderResponse | null> {
    try {
      if (!this.isConnected) {
        throw new Error('Not connected to exchange');
      }

      logInfo(`Placing market order: ${order.side} ${order.quantity} ${order.symbol}`, 'Exchange');

      const orderData = {
        symbol: order.symbol,
        side: order.side,
        type: 'MARKET',
        quantity: order.quantity,
        newOrderRespType: 'FULL'
      };

      const response = await this.makeRequest('POST', '/api/v3/order', orderData);
      
      const orderResponse: OrderResponse = {
        orderId: response.orderId,
        symbol: response.symbol,
        side: response.side,
        type: response.type,
        quantity: parseFloat(response.origQty),
        price: parseFloat(response.price || response.fills?.[0]?.price || 0),
        status: response.status,
        timestamp: response.transactTime,
        filledQuantity: parseFloat(response.executedQty || '0'),
        remainingQuantity: parseFloat(response.origQty) - parseFloat(response.executedQty || '0'),
        averagePrice: parseFloat(response.price || response.fills?.[0]?.price || 0),
        exchange: 'binance',
        fills: response.fills?.map((fill: any) => ({
          price: parseFloat(fill.price),
          quantity: parseFloat(fill.qty),
          commission: parseFloat(fill.commission),
          commissionAsset: fill.commissionAsset
        }))
      };

      logInfo(`Order placed successfully: ${orderResponse.orderId}`, 'Exchange');
      return orderResponse;
    } catch (error) {
      logError('Failed to place market order', 'Exchange', error);
      return null;
    }
  }

  /**
   * Place a limit order
   */
  async placeLimitOrder(order: OrderRequest): Promise<OrderResponse | null> {
    try {
      if (!this.isConnected) {
        throw new Error('Not connected to exchange');
      }

      if (!order.price) {
        throw new Error('Price is required for limit orders');
      }

      logInfo(`Placing limit order: ${order.side} ${order.quantity} ${order.symbol} @ ${order.price}`, 'Exchange');

      const orderData = {
        symbol: order.symbol,
        side: order.side,
        type: 'LIMIT',
        quantity: order.quantity,
        price: order.price,
        timeInForce: order.timeInForce || 'GTC',
        newOrderRespType: 'FULL'
      };

      const response = await this.makeRequest('POST', '/api/v3/order', orderData);
      
      const orderResponse: OrderResponse = {
        orderId: response.orderId,
        symbol: response.symbol,
        side: response.side,
        type: response.type,
        quantity: parseFloat(response.origQty),
        price: parseFloat(response.price),
        status: response.status,
        timestamp: response.transactTime,
        filledQuantity: parseFloat(response.executedQty || '0'),
        remainingQuantity: parseFloat(response.origQty) - parseFloat(response.executedQty || '0'),
        averagePrice: parseFloat(response.price),
        exchange: 'binance'
      };

      logInfo(`Limit order placed successfully: ${orderResponse.orderId}`, 'Exchange');
      return orderResponse;
    } catch (error) {
      logError('Failed to place limit order', 'Exchange', error);
      return null;
    }
  }

  /**
   * Place stop loss order
   */
  async placeStopLossOrder(order: OrderRequest): Promise<OrderResponse | null> {
    try {
      if (!this.isConnected) {
        throw new Error('Not connected to exchange');
      }

      if (!order.stopPrice) {
        throw new Error('Stop price is required for stop loss orders');
      }

      logInfo(`Placing stop loss order: ${order.side} ${order.quantity} ${order.symbol} @ ${order.stopPrice}`, 'Exchange');

      const orderData = {
        symbol: order.symbol,
        side: order.side,
        type: 'STOP_LOSS_LIMIT',
        quantity: order.quantity,
        price: order.price,
        stopPrice: order.stopPrice,
        timeInForce: order.timeInForce || 'GTC',
        newOrderRespType: 'FULL'
      };

      const response = await this.makeRequest('POST', '/api/v3/order', orderData);
      
      const orderResponse: OrderResponse = {
        orderId: response.orderId,
        symbol: response.symbol,
        side: response.side,
        type: response.type,
        quantity: parseFloat(response.origQty),
        price: parseFloat(response.price),
        status: response.status,
        timestamp: response.transactTime,
        filledQuantity: parseFloat(response.executedQty || '0'),
        remainingQuantity: parseFloat(response.origQty) - parseFloat(response.executedQty || '0'),
        averagePrice: parseFloat(response.price),
        exchange: 'binance'
      };

      logInfo(`Stop loss order placed successfully: ${orderResponse.orderId}`, 'Exchange');
      return orderResponse;
    } catch (error) {
      logError('Failed to place stop loss order', 'Exchange', error);
      return null;
    }
  }

  /**
   * Cancel an order
   */
  async cancelOrder(symbol: string, orderId: string): Promise<boolean> {
    try {
      if (!this.isConnected) {
        throw new Error('Not connected to exchange');
      }

      logInfo(`Canceling order: ${orderId} for ${symbol}`, 'Exchange');

      await this.makeRequest('DELETE', `/api/v3/order?symbol=${symbol}&orderId=${orderId}`);
      
      logInfo(`Order canceled successfully: ${orderId}`, 'Exchange');
      return true;
    } catch (error) {
      logError(`Failed to cancel order ${orderId}`, 'Exchange', error);
      return false;
    }
  }

  /**
   * Get order status
   */
  async getOrderStatus(symbol: string, orderId: string): Promise<OrderResponse | null> {
    try {
      if (!this.isConnected) {
        throw new Error('Not connected to exchange');
      }

      const response = await this.makeRequest('GET', `/api/v3/order?symbol=${symbol}&orderId=${orderId}`);
      
      return {
        orderId: response.orderId,
        symbol: response.symbol,
        side: response.side,
        type: response.type,
        quantity: parseFloat(response.origQty),
        price: parseFloat(response.price),
        status: response.status,
        timestamp: response.time,
        filledQuantity: parseFloat(response.executedQty || '0'),
        remainingQuantity: parseFloat(response.origQty) - parseFloat(response.executedQty || '0'),
        averagePrice: parseFloat(response.cummulativeQuoteQty || response.price),
        exchange: this.config.name
      };
    } catch (error) {
      logError(`Failed to get order status for ${orderId}`, 'Exchange', error);
      return null;
    }
  }

  /**
   * Get open orders
   */
  async getOpenOrders(symbol?: string): Promise<OrderResponse[]> {
    try {
      if (!this.isConnected) {
        throw new Error('Not connected to exchange');
      }

      const url = symbol ? `/api/v3/openOrders?symbol=${symbol}` : '/api/v3/openOrders';
      const response = await this.makeRequest('GET', url);
      
      return response.map((order: any) => ({
        orderId: order.orderId,
        symbol: order.symbol,
        side: order.side,
        type: order.type,
        quantity: parseFloat(order.origQty),
        price: parseFloat(order.price),
        status: order.status,
        timestamp: order.time
      }));
    } catch (error) {
      logError('Failed to get open orders', 'Exchange', error);
      return [];
    }
  }

  /**
   * Make authenticated request to exchange with circuit breaker protection
   */
  private async makeRequest(method: string, endpoint: string, data?: any): Promise<any> {
    return withCircuitBreaker('binance', async () => {
      const timestamp = Date.now();
      const queryParams = new URLSearchParams();
      
      // Add timestamp to query parameters
      queryParams.append('timestamp', timestamp.toString());
      
      // Add data parameters to query string for signature
      if (data) {
        Object.keys(data).forEach(key => {
          queryParams.append(key, data[key].toString());
        });
      }
      
      const queryString = queryParams.toString();
      
      // Create signature for Binance API
      const signature = await this.createSignature(queryString);
      
      const headers: Record<string, string> = {
        'X-MBX-APIKEY': this.config.apiKey,
        'Content-Type': 'application/json'
      };

      if (method === 'GET') {
        const url = `${this.config.baseUrl}${endpoint}?${queryString}&signature=${signature}`;
        const response = await fetch(url, { method, headers });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`HTTP ${response.status}: ${errorData.msg || response.statusText}`);
        }
        
        return await response.json();
      } else {
        // For POST requests, add signature to the data
        const requestBody = {
          ...data,
          timestamp,
          signature
        };
        
        const url = `${this.config.baseUrl}${endpoint}`;
        const response = await fetch(url, { 
          method, 
          headers, 
          body: JSON.stringify(requestBody) 
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`HTTP ${response.status}: ${errorData.msg || response.statusText}`);
        }
        
        return await response.json();
      }
    });
  }

  /**
   * Create HMAC signature for Binance API authentication
   * Binance requires: HMAC-SHA256(queryString, secretKey)
   */
  private async createSignature(queryString: string): Promise<string> {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(this.config.apiSecret);
    const messageData = encoder.encode(queryString);
    
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
    const hashArray = Array.from(new Uint8Array(signature));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Check if connected to exchange
   */
  isExchangeConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Disconnect from exchange
   */
  disconnect(): void {
    this.isConnected = false;
    logInfo(`Disconnected from ${this.config.name}`, 'Exchange');
  }
}

// Factory function to create exchange instances
export function createExchangeIntegration(config: ExchangeConfig): ExchangeIntegration {
  return new ExchangeIntegration(config);
}

// Predefined exchange configurations
export const EXCHANGE_CONFIGS = {
  BINANCE: {
    name: 'Binance',
    baseUrl: 'https://api.binance.com',
    sandbox: false
  },
  BINANCE_SANDBOX: {
    name: 'Binance Sandbox',
    baseUrl: 'https://testnet.binance.vision',
    sandbox: true
  }
};

export default ExchangeIntegration;
