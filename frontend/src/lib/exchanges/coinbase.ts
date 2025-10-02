/**
 * Coinbase Pro Exchange Integration
 * US-based exchange with institutional-grade API
 */

import { logError } from '../logger';

import { Exchange, ExchangeConfig, Ticker, Balance, OrderRequest, OrderResponse, ExchangeInfo } from './index';

export class CoinbaseExchange implements Exchange {
  name = 'Coinbase Pro';
  config: ExchangeConfig;
  private baseUrl: string;

  constructor(config: ExchangeConfig) {
    this.config = config;
    this.baseUrl = config.baseUrl || (config.sandbox ? 'https://api-public.sandbox.pro.coinbase.com' : 'https://api.pro.coinbase.com');
  }

  async authenticate(): Promise<boolean> {
    try {
      const response = await this.makeRequest('GET', '/accounts');
      return response && Array.isArray(response);
    } catch (error) {
      logError('Coinbase Pro authentication failed', 'CoinbaseExchange', error);
      return false;
    }
  }

  async getTicker(symbol: string): Promise<Ticker> {
    try {
      const formattedSymbol = this.formatSymbol(symbol);
      const response = await this.makeRequest('GET', `/products/${formattedSymbol}/ticker`);

      return {
        symbol: response.product_id,
        price: response.price,
        bidPrice: response.bid,
        askPrice: response.ask,
        volume: response.volume,
        quoteVolume: response.volume,
        openPrice: '0',
        highPrice: '0',
        lowPrice: '0',
        closePrice: response.price,
        priceChange: '0',
        priceChangePercent: '0',
        count: 0,
        timestamp: Date.now(),
      };
    } catch (error) {
      logError('Failed to get Coinbase Pro ticker', 'CoinbaseExchange', error);
      throw error;
    }
  }

  async getOrderBook(symbol: string, limit: number = 100): Promise<unknown> {
    try {
      const formattedSymbol = this.formatSymbol(symbol);
      return await this.makeRequest('GET', `/products/${formattedSymbol}/book`, { level: 2 });
    } catch (error) {
      logError('Failed to get Coinbase Pro order book', 'CoinbaseExchange', error);
      throw error;
    }
  }

  async getKlines(symbol: string, interval: string, limit: number = 100): Promise<any[]> {
    try {
      const formattedSymbol = this.formatSymbol(symbol);
      const response = await this.makeRequest('GET', `/products/${formattedSymbol}/candles`, {
        granularity: this.mapInterval(interval),
        limit,
      });

      return response.map((kline: any) => [
        kline[0], // Time
        kline[3], // Low
        kline[2], // High
        kline[1], // Open
        kline[4], // Close
        kline[5], // Volume
        kline[0] + (this.mapInterval(interval) * 1000), // Close time
        kline[5], // Quote asset volume
        0,        // Number of trades
        kline[5], // Taker buy base asset volume
        kline[5], // Taker buy quote asset volume
        0,         // Ignore
      ]);
    } catch (error) {
      logError('Failed to get Coinbase Pro klines', 'CoinbaseExchange', error);
      throw error;
    }
  }

  async getAccountInfo(): Promise<unknown> {
    try {
      return await this.makeRequest('GET', '/accounts');
    } catch (error) {
      logError('Failed to get Coinbase Pro account info', 'CoinbaseExchange', error);
      throw error;
    }
  }

  async getBalances(): Promise<Balance[]> {
    try {
      const accounts = await this.getAccountInfo();
      return accounts.map((account: any) => ({
        asset: account.currency,
        free: account.available,
        locked: account.hold,
        total: account.balance,
      }));
    } catch (error) {
      logError('Failed to get Coinbase Pro balances', 'CoinbaseExchange', error);
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
          total: '0',
        };
      }
      return balance;
    } catch (error) {
      logError('Failed to get Coinbase Pro balance', 'CoinbaseExchange', error);
      throw error;
    }
  }

  async createOrder(order: OrderRequest): Promise<OrderResponse> {
    try {
      const formattedSymbol = this.formatSymbol(order.symbol);
      const orderData = {
        product: formattedSymbol,
        side: order.side.toLowerCase(),
        type: order.type.toLowerCase(),
        size: order.quantity.toString(),
        ...(order.price && { price: order.price.toString() }),
        ...(order.stopPrice && { stop: order.stopPrice.toString() }),
        ...(order.timeInForce && { time: order.timeInForce }),
        post: order.type === 'LIMIT',
      };

      const response = await this.makeRequest('POST', '/orders', orderData);

      return {
        orderId: response.id,
        symbol: response.product_id,
        side: response.side.toUpperCase(),
        type: response.type.toUpperCase(),
        quantity: parseFloat(response.size),
        price: parseFloat(response.price || '0'),
        status: this.mapOrderStatus(response.status),
        executedQty: parseFloat(response['filled-size'] || '0'),
        cummulativeQuoteQty: parseFloat(response['filled-size'] || '0') * parseFloat(response.price || '0'),
        timestamp: Date.now(),
        clientOrderId: response['client-oid'],
      };
    } catch (error) {
      logError('Failed to create Coinbase Pro order', 'CoinbaseExchange', error);
      throw error;
    }
  }

  async cancelOrder(symbol: string, orderId: string): Promise<boolean> {
    try {
      await this.makeRequest('DELETE', `/orders/${orderId}`);
      return true;
    } catch (error) {
      logError('Failed to cancel Coinbase Pro order', 'CoinbaseExchange', error);
      return false;
    }
  }

  async getOrder(symbol: string, orderId: string): Promise<OrderResponse> {
    try {
      const response = await this.makeRequest('GET', `/orders/${orderId}`);

      return {
        orderId: response.id,
        symbol: response.product_id,
        side: response.side.toUpperCase(),
        type: response.type.toUpperCase(),
        quantity: parseFloat(response.size),
        price: parseFloat(response.price || '0'),
        status: this.mapOrderStatus(response.status),
        executedQty: parseFloat(response['filled-size'] || '0'),
        cummulativeQuoteQty: parseFloat(response['filled-size'] || '0') * parseFloat(response.price || '0'),
        timestamp: Date.now(),
        clientOrderId: response['client-oid'],
      };
    } catch (error) {
      logError('Failed to get Coinbase Pro order', 'CoinbaseExchange', error);
      throw error;
    }
  }

  async getOpenOrders(symbol?: string): Promise<OrderResponse[]> {
    try {
      const params: any = { status: 'open' };
      if (symbol) {
        params.productId = this.formatSymbol(symbol);
      }

      const response = await this.makeRequest('GET', '/orders', params);

      return response.map((order: any) => ({
        orderId: order.id,
        symbol: order.product_id,
        side: order.side.toUpperCase(),
        type: order.type.toUpperCase(),
        quantity: parseFloat(order.size),
        price: parseFloat(order.price || '0'),
        status: this.mapOrderStatus(order.status),
        executedQty: parseFloat(order['filled-size'] || '0'),
        cummulativeQuoteQty: parseFloat(order['filled-size'] || '0') * parseFloat(order.price || '0'),
        timestamp: Date.now(),
        clientOrderId: order['client-oid'],
      }));
    } catch (error) {
      logError('Failed to get Coinbase Pro open orders', 'CoinbaseExchange', error);
      throw error;
    }
  }

  async getOrderHistory(symbol?: string, limit: number = 50): Promise<OrderResponse[]> {
    try {
      const params: any = { limit };
      if (symbol) {
        params.productId = this.formatSymbol(symbol);
      }

      const response = await this.makeRequest('GET', '/orders', params);

      return response.map((order: any) => ({
        orderId: order.id,
        symbol: order.product_id,
        side: order.side.toUpperCase(),
        type: order.type.toUpperCase(),
        quantity: parseFloat(order.size),
        price: parseFloat(order.price || '0'),
        status: this.mapOrderStatus(order.status),
        executedQty: parseFloat(order['filled-size'] || '0'),
        cummulativeQuoteQty: parseFloat(order['filled-size'] || '0') * parseFloat(order.price || '0'),
        timestamp: Date.now(),
        clientOrderId: order['client-oid'],
      }));
    } catch (error) {
      logError('Failed to get Coinbase Pro order history', 'CoinbaseExchange', error);
      throw error;
    }
  }

  getExchangeInfo(): ExchangeInfo {
    return {
      name: 'Coinbase Pro',
      country: 'United States',
      isIndiaApproved: false,
      supportedPairs: [
        'BTC-USD', 'ETH-USD', 'LTC-USD', 'BCH-USD', 'XRP-USD',
        'ADA-USD', 'DOT-USD', 'LINK-USD', 'UNI-USD', 'AAVE-USD',
      ],
      tradingFees: {
        maker: 0.5,
        taker: 0.5,
      },
      withdrawalFees: {
        'BTC': 0.5,
        'ETH': 0.1,
        'USD': 0,
      },
      minOrderSize: {
        'BTC-USD': 0.1,
        'ETH-USD': 0.1,
      },
      maxOrderSize: {
        'BTC-USD': 100,
        'ETH-USD': 1000,
      },
      supportedOrderTypes: ['MARKET', 'LIMIT', 'STOP-LOSS'],
      apiLimits: {
        requestsPerMinute: 1000,
        ordersPerSecond: 5,
      },
    };
  }

  validateSymbol(symbol: string): boolean {
    const formattedSymbol = this.formatSymbol(symbol);
    const supportedPairs = this.getExchangeInfo().supportedPairs;
    return supportedPairs.includes(formattedSymbol);
  }

  formatSymbol(symbol: string): string {
    return symbol.replace('/', '-').toUpperCase();
  }

  private mapInterval(interval: string): number {
    const intervalMap: { [key: string]: number } = {
      '1m': 60,
      '5m': 300,
      '15m': 900,
      '1h': 3600,
      '6h': 21600,
      '1d': 86400,
    };
    return intervalMap[interval] || 3600;
  }

  private mapOrderStatus(status: string): 'NEW' | 'PARTIALLY-FILLED' | 'FILLED' | 'CANCELED' | 'REJECTED' | 'EXPIRED' {
    const statusMap: { [key: string]: 'NEW' | 'PARTIALLY-FILLED' | 'FILLED' | 'CANCELED' | 'REJECTED' | 'EXPIRED' } = {
      'open': 'NEW',
      'pending': 'NEW',
      'active': 'NEW',
      'partially-filled': 'PARTIALLY-FILLED',
      'filled': 'FILLED',
      'cancelled': 'CANCELED',
      'rejected': 'REJECTED',
      'expired': 'EXPIRED',
    };
    return statusMap[status.toLowerCase()] || 'NEW';
  }

  private async makeRequest(method: string, endpoint: string, params: any = {}): Promise<any> {
    const url = new URL(this.baseUrl + endpoint);

    // Add query parameters for GET requests
    if (method === 'GET') {
      Object.keys(params).forEach(key => {
        url.searchParams.append(key, params[key]);
      });
    }

    const headers: any = {
      'CB-ACCESS-KEY': this.config.apiKey,
      'Content-Type': 'application/json',
    };

    // Add signature for authenticated requests
    if (endpoint.includes('/orders') || endpoint.includes('/accounts')) {
      const queryString = new URLSearchParams(params).toString();
      const signature = await this.generateSignature(queryString);
      headers['CB-ACCESS-SIGN'] = signature;
      headers['CB-ACCESS-TIMESTAMP'] = Date.now().toString();
    }

    const requestOptions: RequestInit = {
      method,
      headers,
    };

    if (method === 'POST' && Object.keys(params).length > 0) {
      requestOptions.body = JSON.stringify(params);
    }

    const response = await fetch(url.toString(), requestOptions);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Coinbase Pro API Error: ${errorData.message || response.statusText}`);
    }

    return await response.json();
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
      ['sign'],
    );

    const signature = await crypto.subtle.sign('HMAC', key, messageData);
    const hashArray = Array.from(new Uint8Array(signature));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
}
