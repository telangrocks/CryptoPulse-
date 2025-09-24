/**
 * CoinDCX Exchange Integration
 * India-approved exchange with advanced trading features
 */

import { Exchange, ExchangeConfig, OrderRequest, OrderResponse, Balance, Ticker, ExchangeInfo } from './index';
import { logError, logInfo } from '../logger';

export class CoinDCXExchange implements Exchange {
  name = 'CoinDCX';
  config: ExchangeConfig;
  private baseUrl: string;

  constructor(config: ExchangeConfig) {
    this.config = config;
    this.baseUrl = config.baseUrl || 'https://api.coindcx.com';
  }

  async authenticate(): Promise<boolean> {
    try {
      const response = await this.makeRequest('GET', '/exchange/v1/users/balances');
      return response && Array.isArray(response);
    } catch (error) {
      logError('CoinDCX authentication failed', 'CoinDCXExchange', error);
      return false;
    }
  }

  async getTicker(symbol: string): Promise<Ticker> {
    try {
      const formattedSymbol = this.formatSymbol(symbol);
      const response = await this.makeRequest('GET', '/exchange/ticker', { market: formattedSymbol });
      
      return {
        symbol: response.market,
        price: response.last_price,
        bidPrice: response.bid,
        askPrice: response.ask,
        volume: response.volume_24h,
        quoteVolume: response.volume_24h,
        openPrice: response.open,
        highPrice: response.high,
        lowPrice: response.low,
        closePrice: response.last_price,
        priceChange: response.change_24h,
        priceChangePercent: response.change_24h_percent,
        count: 0,
        timestamp: Date.now()
      };
    } catch (error) {
      logError('Failed to get CoinDCX ticker', 'CoinDCXExchange', error);
      throw error;
    }
  }

  async getOrderBook(symbol: string, limit: number = 100): Promise<any> {
    try {
      const formattedSymbol = this.formatSymbol(symbol);
      return await this.makeRequest('GET', '/exchange/v1/orders/depth', { market: formattedSymbol, limit });
    } catch (error) {
      logError('Failed to get CoinDCX order book', 'CoinDCXExchange', error);
      throw error;
    }
  }

  async getKlines(symbol: string, interval: string, limit: number = 100): Promise<any[]> {
    try {
      const formattedSymbol = this.formatSymbol(symbol);
      const response = await this.makeRequest('GET', '/exchange/v1/markets/candles', {
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
      logError('Failed to get CoinDCX klines', 'CoinDCXExchange', error);
      throw error;
    }
  }

  async getAccountInfo(): Promise<any> {
    try {
      return await this.makeRequest('GET', '/exchange/v1/users/info');
    } catch (error) {
      logError('Failed to get CoinDCX account info', 'CoinDCXExchange', error);
      throw error;
    }
  }

  async getBalances(): Promise<Balance[]> {
    try {
      const response = await this.makeRequest('GET', '/exchange/v1/users/balances');
      return response.map((balance: any) => ({
        asset: balance.currency,
        free: balance.available_balance,
        locked: balance.locked_balance,
        total: (parseFloat(balance.available_balance) + parseFloat(balance.locked_balance)).toString()
      }));
    } catch (error) {
      logError('Failed to get CoinDCX balances', 'CoinDCXExchange', error);
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
      logError('Failed to get CoinDCX balance', 'CoinDCXExchange', error);
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
        ...(order.price && { price_per_unit: order.price.toString() }),
        ...(order.stopPrice && { stop_price: order.stopPrice.toString() }),
        ...(order.timeInForce && { time_in_force: order.timeInForce }),
        timestamp: Date.now()
      };

      const response = await this.makeRequest('POST', '/exchange/v1/orders/create', orderData);
      
      return {
        orderId: response.id.toString(),
        symbol: response.market,
        side: response.side.toUpperCase(),
        type: response.order_type.toUpperCase(),
        quantity: parseFloat(response.quantity),
        price: parseFloat(response.price_per_unit || '0'),
        status: this.mapOrderStatus(response.status),
        executedQty: parseFloat(response.filled_quantity || '0'),
        cummulativeQuoteQty: parseFloat(response.filled_quantity || '0') * parseFloat(response.price_per_unit || '0'),
        timestamp: response.created_at,
        clientOrderId: response.client_order_id
      };
    } catch (error) {
      logError('Failed to create CoinDCX order', 'CoinDCXExchange', error);
      throw error;
    }
  }

  async cancelOrder(symbol: string, orderId: string): Promise<boolean> {
    try {
      const formattedSymbol = this.formatSymbol(symbol);
      await this.makeRequest('POST', '/exchange/v1/orders/cancel', {
        market: formattedSymbol,
        order_id: orderId
      });
      return true;
    } catch (error) {
      logError('Failed to cancel CoinDCX order', 'CoinDCXExchange', error);
      return false;
    }
  }

  async getOrder(symbol: string, orderId: string): Promise<OrderResponse> {
    try {
      const formattedSymbol = this.formatSymbol(symbol);
      const response = await this.makeRequest('GET', '/exchange/v1/orders/status', {
        market: formattedSymbol,
        order_id: orderId
      });

      return {
        orderId: response.id.toString(),
        symbol: response.market,
        side: response.side.toUpperCase(),
        type: response.order_type.toUpperCase(),
        quantity: parseFloat(response.quantity),
        price: parseFloat(response.price_per_unit || '0'),
        status: this.mapOrderStatus(response.status),
        executedQty: parseFloat(response.filled_quantity || '0'),
        cummulativeQuoteQty: parseFloat(response.filled_quantity || '0') * parseFloat(response.price_per_unit || '0'),
        timestamp: response.created_at,
        clientOrderId: response.client_order_id
      };
    } catch (error) {
      logError('Failed to get CoinDCX order', 'CoinDCXExchange', error);
      throw error;
    }
  }

  async getOpenOrders(symbol?: string): Promise<OrderResponse[]> {
    try {
      const params: any = {};
      if (symbol) {
        params.market = this.formatSymbol(symbol);
      }

      const response = await this.makeRequest('GET', '/exchange/v1/orders/active_orders', params);
      
      return response.map((order: any) => ({
        orderId: order.id.toString(),
        symbol: order.market,
        side: order.side.toUpperCase(),
        type: order.order_type.toUpperCase(),
        quantity: parseFloat(order.quantity),
        price: parseFloat(order.price_per_unit || '0'),
        status: this.mapOrderStatus(order.status),
        executedQty: parseFloat(order.filled_quantity || '0'),
        cummulativeQuoteQty: parseFloat(order.filled_quantity || '0') * parseFloat(order.price_per_unit || '0'),
        timestamp: order.created_at,
        clientOrderId: order.client_order_id
      }));
    } catch (error) {
      logError('Failed to get CoinDCX open orders', 'CoinDCXExchange', error);
      throw error;
    }
  }

  async getOrderHistory(symbol?: string, limit: number = 50): Promise<OrderResponse[]> {
    try {
      const params: any = { limit };
      if (symbol) {
        params.market = this.formatSymbol(symbol);
      }

      const response = await this.makeRequest('GET', '/exchange/v1/orders/trade_history', params);
      
      return response.map((order: any) => ({
        orderId: order.id.toString(),
        symbol: order.market,
        side: order.side.toUpperCase(),
        type: order.order_type.toUpperCase(),
        quantity: parseFloat(order.quantity),
        price: parseFloat(order.price_per_unit || '0'),
        status: this.mapOrderStatus(order.status),
        executedQty: parseFloat(order.filled_quantity || '0'),
        cummulativeQuoteQty: parseFloat(order.filled_quantity || '0') * parseFloat(order.price_per_unit || '0'),
        timestamp: order.created_at,
        clientOrderId: order.client_order_id
      }));
    } catch (error) {
      logError('Failed to get CoinDCX order history', 'CoinDCXExchange', error);
      throw error;
    }
  }

  getExchangeInfo(): ExchangeInfo {
    return {
      name: 'CoinDCX',
      country: 'India',
      isIndiaApproved: true,
      supportedPairs: [
        'BTCINR', 'ETHINR', 'WRXINR', 'ADAINR', 'TRXINR',
        'XRPINR', 'EOSINR', 'ZILINR', 'BATINR', 'USDTINR'
      ],
      tradingFees: {
        maker: 0.001,
        taker: 0.001
      },
      withdrawalFees: {
        'BTC': 0.0005,
        'ETH': 0.01,
        'INR': 0
      },
      minOrderSize: {
        'BTCINR': 0.0001,
        'ETHINR': 0.001
      },
      maxOrderSize: {
        'BTCINR': 10,
        'ETHINR': 100
      },
      supportedOrderTypes: ['MARKET', 'LIMIT', 'STOP_LOSS'],
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
      'X-AUTH-APIKEY': this.config.apiKey,
      'Content-Type': 'application/json'
    };

    // Add signature for authenticated requests
    if (endpoint.includes('/exchange/v1/') && !endpoint.includes('/ticker')) {
      const queryString = new URLSearchParams(params).toString();
      const signature = this.generateSignature(queryString);
      headers['X-AUTH-SIGNATURE'] = signature;
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
      throw new Error(`CoinDCX API Error: ${errorData.message || response.statusText}`);
    }

    return await response.json();
  }

  private generateSignature(queryString: string): string {
    // This would need to be implemented with HMAC-SHA256
    // For now, returning a placeholder
    return 'signature_placeholder';
  }
}
