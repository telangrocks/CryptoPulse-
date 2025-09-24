/**
 * Delta Exchange Integration
 * India-approved derivatives exchange with spot and futures trading
 */

import { Exchange, ExchangeConfig, OrderRequest, OrderResponse, Balance, Ticker, ExchangeInfo } from './index';
import { logError, logInfo } from '../logger';

export class DeltaExchange implements Exchange {
  name = 'Delta Exchange';
  config: ExchangeConfig;
  private baseUrl: string;

  constructor(config: ExchangeConfig) {
    this.config = config;
    this.baseUrl = config.baseUrl || 'https://api.delta.exchange';
  }

  async authenticate(): Promise<boolean> {
    try {
      const response = await this.makeRequest('GET', '/v2/portfolio/balances');
      return response && response.meta && response.meta.success;
    } catch (error) {
      logError('Delta Exchange authentication failed', 'DeltaExchange', error);
      return false;
    }
  }

  async getTicker(symbol: string): Promise<Ticker> {
    try {
      const formattedSymbol = this.formatSymbol(symbol);
      const response = await this.makeRequest('GET', '/v2/tickers', { symbols: formattedSymbol });
      
      if (!response.result || response.result.length === 0) {
        throw new Error('Symbol not found');
      }

      const ticker = response.result[0];
      return {
        symbol: ticker.symbol,
        price: ticker.close,
        bidPrice: ticker.best_bid_price,
        askPrice: ticker.best_ask_price,
        volume: ticker.volume,
        quoteVolume: ticker.volume,
        openPrice: ticker.open,
        highPrice: ticker.high,
        lowPrice: ticker.low,
        closePrice: ticker.close,
        priceChange: ticker.change,
        priceChangePercent: ticker.change_percent,
        count: 0,
        timestamp: ticker.timestamp
      };
    } catch (error) {
      logError('Failed to get Delta Exchange ticker', 'DeltaExchange', error);
      throw error;
    }
  }

  async getOrderBook(symbol: string, limit: number = 100): Promise<any> {
    try {
      const formattedSymbol = this.formatSymbol(symbol);
      return await this.makeRequest('GET', '/v2/l2/snapshot', { symbol: formattedSymbol, depth: limit });
    } catch (error) {
      logError('Failed to get Delta Exchange order book', 'DeltaExchange', error);
      throw error;
    }
  }

  async getKlines(symbol: string, interval: string, limit: number = 100): Promise<any[]> {
    try {
      const formattedSymbol = this.formatSymbol(symbol);
      const response = await this.makeRequest('GET', '/v2/history/candles', {
        symbol: formattedSymbol,
        resolution: interval,
        size: limit
      });
      
      return response.result.map((kline: any) => [
        kline.start, // Open time
        kline.open,  // Open
        kline.high,  // High
        kline.low,   // Low
        kline.close, // Close
        kline.volume, // Volume
        kline.end,   // Close time
        kline.volume, // Quote asset volume
        0,           // Number of trades
        kline.volume, // Taker buy base asset volume
        kline.volume, // Taker buy quote asset volume
        0            // Ignore
      ]);
    } catch (error) {
      logError('Failed to get Delta Exchange klines', 'DeltaExchange', error);
      throw error;
    }
  }

  async getAccountInfo(): Promise<any> {
    try {
      return await this.makeRequest('GET', '/v2/portfolio/account_summary');
    } catch (error) {
      logError('Failed to get Delta Exchange account info', 'DeltaExchange', error);
      throw error;
    }
  }

  async getBalances(): Promise<Balance[]> {
    try {
      const response = await this.makeRequest('GET', '/v2/portfolio/balances');
      return response.result.map((balance: any) => ({
        asset: balance.asset.symbol,
        free: balance.available_balance,
        locked: balance.reserved_balance,
        total: balance.total_balance
      }));
    } catch (error) {
      logError('Failed to get Delta Exchange balances', 'DeltaExchange', error);
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
      logError('Failed to get Delta Exchange balance', 'DeltaExchange', error);
      throw error;
    }
  }

  async createOrder(order: OrderRequest): Promise<OrderResponse> {
    try {
      const formattedSymbol = this.formatSymbol(order.symbol);
      const orderData = {
        product_id: formattedSymbol,
        side: order.side.toLowerCase(),
        order_type: order.type.toLowerCase(),
        size: order.quantity.toString(),
        ...(order.price && { limit_price: order.price.toString() }),
        ...(order.stopPrice && { stop_price: order.stopPrice.toString() }),
        ...(order.timeInForce && { time_in_force: order.timeInForce }),
        timestamp: Date.now()
      };

      const response = await this.makeRequest('POST', '/v2/orders', orderData);
      
      return {
        orderId: response.result.id.toString(),
        symbol: response.result.product_id,
        side: response.result.side.toUpperCase(),
        type: response.result.order_type.toUpperCase(),
        quantity: parseFloat(response.result.size),
        price: parseFloat(response.result.limit_price || '0'),
        status: this.mapOrderStatus(response.result.state),
        executedQty: parseFloat(response.result.filled_size || '0'),
        cummulativeQuoteQty: parseFloat(response.result.filled_size || '0') * parseFloat(response.result.limit_price || '0'),
        timestamp: response.result.created_at,
        clientOrderId: response.result.client_order_id
      };
    } catch (error) {
      logError('Failed to create Delta Exchange order', 'DeltaExchange', error);
      throw error;
    }
  }

  async cancelOrder(symbol: string, orderId: string): Promise<boolean> {
    try {
      const formattedSymbol = this.formatSymbol(symbol);
      await this.makeRequest('DELETE', '/v2/orders', {
        product_id: formattedSymbol,
        order_id: orderId
      });
      return true;
    } catch (error) {
      logError('Failed to cancel Delta Exchange order', 'DeltaExchange', error);
      return false;
    }
  }

  async getOrder(symbol: string, orderId: string): Promise<OrderResponse> {
    try {
      const formattedSymbol = this.formatSymbol(symbol);
      const response = await this.makeRequest('GET', '/v2/orders', {
        product_id: formattedSymbol,
        order_id: orderId
      });

      const order = response.result[0];
      return {
        orderId: order.id.toString(),
        symbol: order.product_id,
        side: order.side.toUpperCase(),
        type: order.order_type.toUpperCase(),
        quantity: parseFloat(order.size),
        price: parseFloat(order.limit_price || '0'),
        status: this.mapOrderStatus(order.state),
        executedQty: parseFloat(order.filled_size || '0'),
        cummulativeQuoteQty: parseFloat(order.filled_size || '0') * parseFloat(order.limit_price || '0'),
        timestamp: order.created_at,
        clientOrderId: order.client_order_id
      };
    } catch (error) {
      logError('Failed to get Delta Exchange order', 'DeltaExchange', error);
      throw error;
    }
  }

  async getOpenOrders(symbol?: string): Promise<OrderResponse[]> {
    try {
      const params: any = { state: 'open' };
      if (symbol) {
        params.product_id = this.formatSymbol(symbol);
      }

      const response = await this.makeRequest('GET', '/v2/orders', params);
      
      return response.result.map((order: any) => ({
        orderId: order.id.toString(),
        symbol: order.product_id,
        side: order.side.toUpperCase(),
        type: order.order_type.toUpperCase(),
        quantity: parseFloat(order.size),
        price: parseFloat(order.limit_price || '0'),
        status: this.mapOrderStatus(order.state),
        executedQty: parseFloat(order.filled_size || '0'),
        cummulativeQuoteQty: parseFloat(order.filled_size || '0') * parseFloat(order.limit_price || '0'),
        timestamp: order.created_at,
        clientOrderId: order.client_order_id
      }));
    } catch (error) {
      logError('Failed to get Delta Exchange open orders', 'DeltaExchange', error);
      throw error;
    }
  }

  async getOrderHistory(symbol?: string, limit: number = 50): Promise<OrderResponse[]> {
    try {
      const params: any = { limit };
      if (symbol) {
        params.product_id = this.formatSymbol(symbol);
      }

      const response = await this.makeRequest('GET', '/v2/orders', params);
      
      return response.result.map((order: any) => ({
        orderId: order.id.toString(),
        symbol: order.product_id,
        side: order.side.toUpperCase(),
        type: order.order_type.toUpperCase(),
        quantity: parseFloat(order.size),
        price: parseFloat(order.limit_price || '0'),
        status: this.mapOrderStatus(order.state),
        executedQty: parseFloat(order.filled_size || '0'),
        cummulativeQuoteQty: parseFloat(order.filled_size || '0') * parseFloat(order.limit_price || '0'),
        timestamp: order.created_at,
        clientOrderId: order.client_order_id
      }));
    } catch (error) {
      logError('Failed to get Delta Exchange order history', 'DeltaExchange', error);
      throw error;
    }
  }

  getExchangeInfo(): ExchangeInfo {
    return {
      name: 'Delta Exchange',
      country: 'India',
      isIndiaApproved: true,
      supportedPairs: [
        'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'ADAUSDT', 'SOLUSDT',
        'XRPUSDT', 'DOTUSDT', 'DOGEUSDT', 'AVAXUSDT', 'MATICUSDT'
      ],
      tradingFees: {
        maker: 0.0005,
        taker: 0.0005
      },
      withdrawalFees: {
        'BTC': 0.0005,
        'ETH': 0.01,
        'USDT': 1.0
      },
      minOrderSize: {
        'BTCUSDT': 0.0001,
        'ETHUSDT': 0.001
      },
      maxOrderSize: {
        'BTCUSDT': 100,
        'ETHUSDT': 1000
      },
      supportedOrderTypes: ['MARKET', 'LIMIT', 'STOP_LOSS', 'STOP_LOSS_LIMIT'],
      apiLimits: {
        requestsPerMinute: 1000,
        ordersPerSecond: 10
      }
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

  private mapOrderStatus(status: string): 'NEW' | 'PARTIALLY_FILLED' | 'FILLED' | 'CANCELED' | 'REJECTED' | 'EXPIRED' {
    const statusMap: { [key: string]: any } = {
      'open': 'NEW',
      'partially_filled': 'PARTIALLY_FILLED',
      'filled': 'FILLED',
      'cancelled': 'CANCELED',
      'rejected': 'REJECTED',
      'expired': 'EXPIRED'
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
      'api-key': this.config.apiKey,
      'Content-Type': 'application/json'
    };

    // Add signature for authenticated requests
    if (endpoint.includes('/v2/') && !endpoint.includes('/tickers')) {
      const queryString = new URLSearchParams(params).toString();
      const signature = this.generateSignature(queryString);
      headers['signature'] = signature;
    }

    const requestOptions: RequestInit = {
      method,
      headers
    };

    if (method === 'POST' && Object.keys(params).length > 0) {
      requestOptions.body = JSON.stringify(params);
    }

    const response = await fetch(url.toString(), requestOptions);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Delta Exchange API Error: ${errorData.message || response.statusText}`);
    }

    return await response.json();
  }

  private generateSignature(queryString: string): string {
    // Generate HMAC-SHA256 signature for Delta Exchange API
    const crypto = require('crypto');
    return crypto
      .createHmac('sha256', this.config.apiSecret)
      .update(queryString)
      .digest('hex');
  }
}
