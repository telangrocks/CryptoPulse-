/**
 * Binance Exchange Integration
 * Global exchange with comprehensive API
 */

import { logError } from '../logger';

import { Exchange, ExchangeConfig, Ticker, Balance, OrderRequest, OrderResponse, ExchangeInfo } from './index';

export class BinanceExchange implements Exchange {
  name = 'Binance';
  config: ExchangeConfig;
  private baseUrl: string;

  constructor(config: ExchangeConfig) {
    this.config = config;
    this.baseUrl = config.baseUrl || (config.sandbox ? 'https://testnet.binance.vision' : 'https://api.binance.com');
  }

  async authenticate(): Promise<boolean> {
    try {
      const response = await this.makeRequest('GET', '/api/v3/account');
      return response && response.accountType;
    } catch (error) {
      logError('Binance authentication failed', 'BinanceExchange', error);
      return false;
    }
  }

  async getTicker(symbol: string): Promise<Ticker> {
    try {
      const formattedSymbol = this.formatSymbol(symbol);
      const response = await this.makeRequest('GET', '/api/v3/ticker/24hr', { symbol: formattedSymbol });

      return {
        symbol: response.symbol,
        price: response.lastPrice,
        bidPrice: response.bidPrice,
        askPrice: response.askPrice,
        volume: response.volume,
        quoteVolume: response.quoteVolume,
        openPrice: response.openPrice,
        highPrice: response.highPrice,
        lowPrice: response.lowPrice,
        closePrice: response.lastPrice,
        priceChange: response.priceChange,
        priceChangePercent: response.priceChangePercent,
        count: response.count,
        timestamp: response.closeTime,
      };
    } catch (error) {
      logError('Failed to get Binance ticker', 'BinanceExchange', error);
      throw error;
    }
  }

  async getOrderBook(symbol: string, limit: number = 100): Promise<unknown> {
    try {
      const formattedSymbol = this.formatSymbol(symbol);
      return await this.makeRequest('GET', '/api/v3/depth', { symbol: formattedSymbol, limit });
    } catch (error) {
      logError('Failed to get Binance order book', 'BinanceExchange', error);
      throw error;
    }
  }

  async getKlines(symbol: string, interval: string, limit: number = 100): Promise<any[]> {
    try {
      const formattedSymbol = this.formatSymbol(symbol);
      return await this.makeRequest('GET', '/api/v3/klines', {
        symbol: formattedSymbol,
        interval,
        limit,
      });
    } catch (error) {
      logError('Failed to get Binance klines', 'BinanceExchange', error);
      throw error;
    }
  }

  async getAccountInfo(): Promise<unknown> {
    try {
      return await this.makeRequest('GET', '/api/v3/account');
    } catch (error) {
      logError('Failed to get Binance account info', 'BinanceExchange', error);
      throw error;
    }
  }

  async getBalances(): Promise<Balance[]> {
    try {
      const account = await this.getAccountInfo();
      return account.balances.map((balance: any) => ({
        asset: balance.asset,
        free: balance.free,
        locked: balance.locked,
        total: (parseFloat(balance.free) + parseFloat(balance.locked)).toString(),
      }));
    } catch (error) {
      logError('Failed to get Binance balances', 'BinanceExchange', error);
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
      logError('Failed to get Binance balance', 'BinanceExchange', error);
      throw error;
    }
  }

  async createOrder(order: OrderRequest): Promise<OrderResponse> {
    try {
      const formattedSymbol = this.formatSymbol(order.symbol);
      const orderData = {
        symbol: formattedSymbol,
        side: order.side,
        type: order.type,
        quantity: order.quantity.toString(),
        ...(order.price && { price: order.price.toString() }),
        ...(order.stopPrice && { stopPrice: order.stopPrice.toString() }),
        ...(order.timeInForce && { timeInForce: order.timeInForce }),
        timestamp: Date.now(),
      };

      const response = await this.makeRequest('POST', '/api/v3/order', orderData);

      return {
        orderId: response.orderId.toString(),
        symbol: response.symbol,
        side: response.side,
        type: response.type,
        quantity: parseFloat(response.origQty),
        price: parseFloat(response.price),
        status: response.status,
        executedQty: parseFloat(response.executedQty),
        cummulativeQuoteQty: parseFloat(response.cummulativeQuoteQty),
        timestamp: response.transactTime,
        clientOrderId: response.clientOrderId,
      };
    } catch (error) {
      logError('Failed to create Binance order', 'BinanceExchange', error);
      throw error;
    }
  }

  async cancelOrder(symbol: string, orderId: string): Promise<boolean> {
    try {
      const formattedSymbol = this.formatSymbol(symbol);
      await this.makeRequest('DELETE', '/api/v3/order', {
        symbol: formattedSymbol,
        orderId,
        timestamp: Date.now(),
      });
      return true;
    } catch (error) {
      logError('Failed to cancel Binance order', 'BinanceExchange', error);
      return false;
    }
  }

  async getOrder(symbol: string, orderId: string): Promise<OrderResponse> {
    try {
      const formattedSymbol = this.formatSymbol(symbol);
      const response = await this.makeRequest('GET', '/api/v3/order', {
        symbol: formattedSymbol,
        orderId,
        timestamp: Date.now(),
      });

      return {
        orderId: response.orderId.toString(),
        symbol: response.symbol,
        side: response.side,
        type: response.type,
        quantity: parseFloat(response.origQty),
        price: parseFloat(response.price),
        status: response.status,
        executedQty: parseFloat(response.executedQty),
        cummulativeQuoteQty: parseFloat(response.cummulativeQuoteQty),
        timestamp: response.time,
        clientOrderId: response.clientOrderId,
      };
    } catch (error) {
      logError('Failed to get Binance order', 'BinanceExchange', error);
      throw error;
    }
  }

  async getOpenOrders(symbol?: string): Promise<OrderResponse[]> {
    try {
      const params: any = { timestamp: Date.now() };
      if (symbol) {
        params.symbol = this.formatSymbol(symbol);
      }

      const response = await this.makeRequest('GET', '/api/v3/openOrders', params);

      return response.map((order: any) => ({
        orderId: order.orderId.toString(),
        symbol: order.symbol,
        side: order.side,
        type: order.type,
        quantity: parseFloat(order.origQty),
        price: parseFloat(order.price),
        status: order.status,
        executedQty: parseFloat(order.executedQty),
        cummulativeQuoteQty: parseFloat(order.cummulativeQuoteQty),
        timestamp: order.time,
        clientOrderId: order.clientOrderId,
      }));
    } catch (error) {
      logError('Failed to get Binance open orders', 'BinanceExchange', error);
      throw error;
    }
  }

  async getOrderHistory(symbol?: string, limit: number = 50): Promise<OrderResponse[]> {
    try {
      const params: any = { timestamp: Date.now(), limit };
      if (symbol) {
        params.symbol = this.formatSymbol(symbol);
      }

      const response = await this.makeRequest('GET', '/api/v3/allOrders', params);

      return response.map((order: any) => ({
        orderId: order.orderId.toString(),
        symbol: order.symbol,
        side: order.side,
        type: order.type,
        quantity: parseFloat(order.origQty),
        price: parseFloat(order.price),
        status: order.status,
        executedQty: parseFloat(order.executedQty),
        cummulativeQuoteQty: parseFloat(order.cummulativeQuoteQty),
        timestamp: order.time,
        clientOrderId: order.clientOrderId,
      }));
    } catch (error) {
      logError('Failed to get Binance order history', 'BinanceExchange', error);
      throw error;
    }
  }

  getExchangeInfo(): ExchangeInfo {
    return {
      name: 'Binance',
      country: 'Global',
      isIndiaApproved: false,
      supportedPairs: [
        'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'ADAUSDT', 'SOLUSDT',
        'XRPUSDT', 'DOTUSDT', 'DOGEUSDT', 'AVAXUSDT', 'MATICUSDT',
      ],
      tradingFees: {
        maker: 0.1,
        taker: 0.1,
      },
      withdrawalFees: {
        'BTC': 0.5,
        'ETH': 0.1,
        'USDT': 1.0,
      },
      minOrderSize: {
        'BTCUSDT': 0.1,
        'ETHUSDT': 0.1,
      },
      maxOrderSize: {
        'BTCUSDT': 9000,
        'ETHUSDT': 90000,
      },
      supportedOrderTypes: ['MARKET', 'LIMIT', 'STOP-LOSS', 'STOP_LOSS-LIMIT'],
      apiLimits: {
        requestsPerMinute: 1200,
        ordersPerSecond: 10,
      },
    };
  }

  validateSymbol(symbol: string): boolean {
    const formattedSymbol = this.formatSymbol(symbol);
    const supportedPairs = this.getExchangeInfo().supportedPairs;
    return supportedPairs.includes(formattedSymbol);
  }

  formatSymbol(symbol: string): string {
    return symbol.replace('/', '').toUpperCase();
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
      'X-MBX-APIKEY': this.config.apiKey,
      'Content-Type': 'application/json',
    };

    // Add signature for authenticated requests
    if (endpoint.includes('/api/v3/') && !endpoint.includes('/api/v3/ticker')) {
      const queryString = new URLSearchParams(params).toString();
      const signature = await this.generateSignature(queryString);
      url.searchParams.append('signature', signature);
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
      throw new Error(`Binance API Error: ${errorData.msg || response.statusText}`);
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
