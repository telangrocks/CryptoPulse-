/**
 * WazirX Exchange Integration
 * India-approved exchange with comprehensive trading API
 */

import { logError, logInfo, logWarn } from '../logger';
import { Exchange, ExchangeConfig, Ticker, Balance, OrderRequest, OrderResponse, ExchangeInfo } from './index';

export class WazirXExchange implements Exchange {
  name = 'WazirX';
  config: ExchangeConfig;
  private baseUrl: string;
  private rateLimiter: Map<string, number> = new Map();
  private readonly RATE_LIMIT_WINDOW = 60000; // 1 minute
  private readonly MAX_REQUESTS_PER_MINUTE = 1000;

  constructor(config: ExchangeConfig) {
    this.config = config;
    this.baseUrl = config.baseUrl || 'https://api.wazirx.com';
  }

  async authenticate(): Promise<boolean> {
    try {
      const response = await this.makeRequest('GET', '/api/v2/account');
      return response && response.status === 'success';
    } catch (error) {
      logError('WazirX authentication failed', 'WazirXExchange', error);
      return false;
    }
  }

  async getTicker(symbol: string): Promise<Ticker> {
    try {
      const formattedSymbol = this.formatSymbol(symbol);
      const response = await this.makeRequest('GET', '/api/v2/ticker', { market: formattedSymbol });
      
      return {
        symbol: response.symbol,
        price: response.last,
        bidPrice: response.buy,
        askPrice: response.sell,
        volume: response.volume,
        quoteVolume: response.volume,
        openPrice: response.open,
        highPrice: response.high,
        lowPrice: response.low,
        closePrice: response.last,
        priceChange: response.change,
        priceChangePercent: response.changePercent,
        count: 0,
        timestamp: Date.now()
      };
    } catch (error) {
      logError('Failed to get WazirX ticker', 'WazirXExchange', error);
      throw error;
    }
  }

  async getOrderBook(symbol: string, limit: number = 100): Promise<any> {
    try {
      const formattedSymbol = this.formatSymbol(symbol);
      return await this.makeRequest('GET', '/api/v2/depth', { market: formattedSymbol, limit });
    } catch (error) {
      logError('Failed to get WazirX order book', 'WazirXExchange', error);
      throw error;
    }
  }

  async getKlines(symbol: string, interval: string, limit: number = 100): Promise<any[]> {
    try {
      const formattedSymbol = this.formatSymbol(symbol);
      const response = await this.makeRequest('GET', '/api/v2/klines', {
        market: formattedSymbol,
        interval,
        limit
      });
      
      return response.map((kline: any) => [
        kline[0], // Open time
        kline[1], // Open
        kline[2], // High
        kline[3], // Low
        kline[4], // Close
        kline[5], // Volume
        kline[6], // Close time
        kline[7], // Quote asset volume
        kline[8], // Number of trades
        kline[9], // Taker buy base asset volume
        kline[10], // Taker buy quote asset volume
        kline[11]  // Ignore
      ]);
    } catch (error) {
      logError('Failed to get WazirX klines', 'WazirXExchange', error);
      throw error;
    }
  }

  async getAccountInfo(): Promise<any> {
    try {
      return await this.makeRequest('GET', '/api/v2/account');
    } catch (error) {
      logError('Failed to get WazirX account info', 'WazirXExchange', error);
      throw error;
    }
  }

  async getBalances(): Promise<Balance[]> {
    try {
      const account = await this.getAccountInfo();
      return account.balances.map((balance: any) => ({
        asset: balance.currency,
        free: balance.available,
        locked: balance.locked,
        total: (parseFloat(balance.available) + parseFloat(balance.locked)).toString()
      }));
    } catch (error) {
      logError('Failed to get WazirX balances', 'WazirXExchange', error);
      throw error;
    }
  }

  async getBalance(asset: string): Promise<Balance> {
    try {
      const balances = await this.getBalances();
      const balance = balances.find(b => b.asset === asset);
      if (!balance) {
        return {
          asset,
          free: '0',
          locked: '0',
          total: '0'
        };
      }
      return balance;
    } catch (error) {
      logError('Failed to get WazirX balance', 'WazirXExchange', error);
      throw error;
    }
  }

  async createOrder(order: OrderRequest): Promise<OrderResponse> {
    try {
      const formattedSymbol = this.formatSymbol(order.symbol);
      const orderData = {
        market: formattedSymbol,
        side: order.side.toLowerCase(),
        order_type: order.type.toLowerCase(),
        quantity: order.quantity.toString(),
        ...(order.price && { price: order.price.toString() }),
        ...(order.stopPrice && { stop: order.stopPrice.toString() }),
        ...(order.timeInForce && { time: order.timeInForce }),
        timestamp: Date.now()
      };

      const response = await this.makeRequest('POST', '/api/v2/orders', orderData);
      
      return {
        orderId: response.id.toString(),
        symbol: response.market,
        side: response.side.toUpperCase(),
        type: response.order_type.toUpperCase(),
        quantity: parseFloat(response.quantity),
        price: parseFloat(response.price || '0'),
        status: this.mapOrderStatus(response.status),
        executedQty: parseFloat(response.executed_quantity || '0'),
        cummulativeQuoteQty: parseFloat(response.executed_quantity || '0') * parseFloat(response.price || '0'),
        timestamp: response.created_at,
        clientOrderId: response.client_order_id
      };
    } catch (error) {
      logError('Failed to create WazirX order', 'WazirXExchange', error);
      throw error;
    }
  }

  async cancelOrder(symbol: string, orderId: string): Promise<boolean> {
    try {
      const formattedSymbol = this.formatSymbol(symbol);
      await this.makeRequest('DELETE', '/api/v2/orders', {
        market: formattedSymbol,
        order_id: orderId
      });
      return true;
    } catch (error) {
      logError('Failed to cancel WazirX order', 'WazirXExchange', error);
      return false;
    }
  }

  async getOrder(symbol: string, orderId: string): Promise<OrderResponse> {
    try {
      const formattedSymbol = this.formatSymbol(symbol);
      const response = await this.makeRequest('GET', '/api/v2/orders', {
        market: formattedSymbol,
        order_id: orderId
      });

      return {
        orderId: response.id.toString(),
        symbol: response.market,
        side: response.side.toUpperCase(),
        type: response.order_type.toUpperCase(),
        quantity: parseFloat(response.quantity),
        price: parseFloat(response.price || '0'),
        status: this.mapOrderStatus(response.status),
        executedQty: parseFloat(response.executed_quantity || '0'),
        cummulativeQuoteQty: parseFloat(response.executed_quantity || '0') * parseFloat(response.price || '0'),
        timestamp: response.created_at,
        clientOrderId: response.client_order_id
      };
    } catch (error) {
      logError('Failed to get WazirX order', 'WazirXExchange', error);
      throw error;
    }
  }

  async getOpenOrders(symbol?: string): Promise<OrderResponse[]> {
    try {
      const params: any = {};
      if (symbol) {
        params.market = this.formatSymbol(symbol);
      }

      const response = await this.makeRequest('GET', '/api/v2/orders', params);
      
      return response.map((order: any) => ({
        orderId: order.id.toString(),
        symbol: order.market,
        side: order.side.toUpperCase(),
        type: order.order_type.toUpperCase(),
        quantity: parseFloat(order.quantity),
        price: parseFloat(order.price || '0'),
        status: this.mapOrderStatus(order.status),
        executedQty: parseFloat(order.executed_quantity || '0'),
        cummulativeQuoteQty: parseFloat(order.executed_quantity || '0') * parseFloat(order.price || '0'),
        timestamp: order.created_at,
        clientOrderId: order.client_order_id
      }));
    } catch (error) {
      logError('Failed to get WazirX open orders', 'WazirXExchange', error);
      throw error;
    }
  }

  async getOrderHistory(symbol?: string, limit: number = 50): Promise<OrderResponse[]> {
    try {
      const params: any = { limit };
      if (symbol) {
        params.market = this.formatSymbol(symbol);
      }

      const response = await this.makeRequest('GET', '/api/v2/orders', params);
      
      return response.map((order: any) => ({
        orderId: order.id.toString(),
        symbol: order.market,
        side: order.side.toUpperCase(),
        type: order.order_type.toUpperCase(),
        quantity: parseFloat(order.quantity),
        price: parseFloat(order.price || '0'),
        status: this.mapOrderStatus(order.status),
        executedQty: parseFloat(order.executed_quantity || '0'),
        cummulativeQuoteQty: parseFloat(order.executed_quantity || '0') * parseFloat(order.price || '0'),
        timestamp: order.created_at,
        clientOrderId: order.client_order_id
      }));
    } catch (error) {
      logError('Failed to get WazirX order history', 'WazirXExchange', error);
      throw error;
    }
  }

  getExchangeInfo(): ExchangeInfo {
    return {
      name: 'WazirX',
      country: 'India',
      isIndiaApproved: true,
      supportedPairs: [
        'btcinr', 'ethinr', 'wrxinr', 'adainr', 'trxinr',
        'xrpinr', 'eosinr', 'zilinr', 'batinr', 'usdtinr'
      ],
      tradingFees: {
        maker: 0.2,
        taker: 0.2
      },
      withdrawalFees: {
        'BTC': 0.5,
        'ETH': 0.1,
        'INR': 0
      },
      minOrderSize: {
        'btcinr': 0.1,
        'ethinr': 0.1
      },
      maxOrderSize: {
        'btcinr': 10,
        'ethinr': 100
      },
      supportedOrderTypes: ['MARKET', 'LIMIT', 'STOP-LOSS'],
      apiLimits: {
        requestsPerMinute: 1000,
        ordersPerSecond: 5
      }
    };
  }

  validateSymbol(symbol: string): boolean {
    const formattedSymbol = this.formatSymbol(symbol);
    const supportedPairs = this.getExchangeInfo().supportedPairs;
    return supportedPairs.includes(formattedSymbol);
  }

  formatSymbol(symbol: string): string {
    return symbol.replace('/', '').toLowerCase();
  }

  private mapOrderStatus(status: string): 'NEW' | 'PARTIALLY-FILLED' | 'FILLED' | 'CANCELED' | 'REJECTED' | 'EXPIRED' {
    const statusMap: { [key: string]: 'NEW' | 'PARTIALLY-FILLED' | 'FILLED' | 'CANCELED' | 'REJECTED' | 'EXPIRED' } = {
      'open': 'NEW',
      'partially-filled': 'PARTIALLY-FILLED',
      'filled': 'FILLED',
      'cancelled': 'CANCELED',
      'rejected': 'REJECTED',
      'expired': 'EXPIRED'
    };
    return statusMap[status.toLowerCase()] || 'NEW';
  }

  private async makeRequest(method: string, endpoint: string, params: any = {}): Promise<any> {
    // Rate limiting
    await this.checkRateLimit();

    const url = new URL(this.baseUrl + endpoint);
    
    // Add query parameters for GET requests
    if (method === 'GET') {
      Object.keys(params).forEach(key => {
        url.searchParams.append(key, params[key]);
      });
    }

    const headers: any = {
      'X-Api-Key': this.config.apiKey,
      'Content-Type': 'application/json'
    };

    // Add signature for authenticated requests
    if (endpoint.includes('/api/v2/') && !endpoint.includes('/api/v2/ticker')) {
      const queryString = new URLSearchParams(params).toString();
      const signature = await this.generateSignature(queryString);
      headers['X-Api-Signature'] = signature;
    }

    const requestOptions: RequestInit = {
      method,
      headers
    };

    if (method === 'POST' && Object.keys(params).length > 0) {
      requestOptions.body = JSON.stringify(params);
    }

    try {
      const response = await fetch(url.toString(), requestOptions);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`WazirX API Error: ${errorData.message || response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      logError(`WazirX API request failed: ${method} ${endpoint}`, 'WazirXExchange', error);
      throw error;
    }
  }

  private async generateSignature(queryString: string): Promise<string> {
    // Use Web Crypto API for frontend compatibility
    const encoder = new TextEncoder();
    const keyData = encoder.encode(this.config.apiSecret);
    const messageData = encoder.encode(queryString);
    
    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signature = await crypto.subtle.sign('HMAC', key, messageData);
    const hashArray = Array.from(new Uint8Array(signature));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  private async checkRateLimit(): Promise<void> {
    const now = Date.now();
    const windowStart = now - this.RATE_LIMIT_WINDOW;
    
    // Clean old entries
    for (const [timestamp] of this.rateLimiter) {
      if (timestamp < windowStart) {
        this.rateLimiter.delete(timestamp);
      }
    }
    
    // Check if we're within limits
    if (this.rateLimiter.size >= this.MAX_REQUESTS_PER_MINUTE) {
      const oldestRequest = Math.min(...this.rateLimiter.keys());
      const waitTime = this.RATE_LIMIT_WINDOW - (now - oldestRequest);
      
      if (waitTime > 0) {
        logWarn(`Rate limit reached, waiting ${waitTime}ms`, 'WazirXExchange');
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
    
    this.rateLimiter.set(now, 1);
  }
}