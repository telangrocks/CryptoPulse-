/**
 * Binance Exchange Adapter
 * Production-ready Binance API integration
 */

import { Exchange, ExchangeConfig, Ticker, Balance, OrderRequest, OrderResponse, ExchangeInfo } from './index';

interface BinanceCredentials {
  apiKey: string;
  apiSecret: string;
  sandbox?: boolean;
  baseUrl?: string;
}

export class BinanceExchange implements Exchange {
  private credentials: BinanceCredentials;
  private baseUrl: string;
  private testnetUrl = 'https://testnet.binance.vision';
  private productionUrl = 'https://api.binance.com';

  constructor(credentials: BinanceCredentials) {
    this.credentials = credentials;
    this.baseUrl = credentials.baseUrl || (credentials.sandbox ? this.testnetUrl : this.productionUrl);
  }

  async getExchangeInfo(): Promise<ExchangeInfo> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v3/exchangeInfo`);
      if (!response.ok) {
        throw new Error(`Failed to fetch exchange info: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      return {
        name: 'Binance',
        timezone: 'UTC',
        serverTime: data.serverTime,
        rateLimits: data.rateLimits,
        exchangeFilters: data.exchangeFilters,
        symbols: data.symbols.map((symbol: any) => ({
          symbol: symbol.symbol,
          status: symbol.status,
          baseAsset: symbol.baseAsset,
          quoteAsset: symbol.quoteAsset,
          orderTypes: symbol.orderTypes,
          filters: symbol.filters
        }))
      };
    } catch (error) {
      throw new Error(`Failed to get exchange info: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getTicker(symbol: string): Promise<Ticker> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v3/ticker/24hr?symbol=${symbol.toUpperCase()}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch ticker: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      return {
        symbol: data.symbol,
        price: parseFloat(data.lastPrice),
        bidPrice: parseFloat(data.bidPrice),
        askPrice: parseFloat(data.askPrice),
        volume: parseFloat(data.volume),
        quoteVolume: parseFloat(data.quoteVolume),
        openPrice: parseFloat(data.openPrice),
        highPrice: parseFloat(data.highPrice),
        lowPrice: parseFloat(data.lowPrice),
        priceChange: parseFloat(data.priceChange),
        priceChangePercent: parseFloat(data.priceChangePercent),
        count: parseInt(data.count),
        timestamp: data.closeTime
      };
    } catch (error) {
      throw new Error(`Failed to get ticker: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getBalance(): Promise<Balance[]> {
    try {
      const timestamp = Date.now();
      const queryString = `timestamp=${timestamp}`;
      const signature = await this.createSignature(queryString);
      
      const url = `${this.baseUrl}/api/v3/account?${queryString}&signature=${signature}`;
      
      const response = await fetch(url, {
        headers: {
          'X-MBX-APIKEY': this.credentials.apiKey,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch balance: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      return data.balances
        .filter((balance: any) => parseFloat(balance.free) > 0 || parseFloat(balance.locked) > 0)
        .map((balance: any) => ({
          asset: balance.asset,
          free: parseFloat(balance.free),
          locked: parseFloat(balance.locked),
          total: parseFloat(balance.free) + parseFloat(balance.locked)
        }));
    } catch (error) {
      throw new Error(`Failed to get balance: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async createOrder(orderRequest: OrderRequest): Promise<OrderResponse> {
    try {
      const timestamp = Date.now();
      const params = {
        symbol: orderRequest.symbol.toUpperCase(),
        side: orderRequest.side.toUpperCase(),
        type: orderRequest.type?.toUpperCase() || 'MARKET',
        quantity: orderRequest.quantity.toString(),
        timestamp: timestamp
      };

      if (orderRequest.price) {
        params.price = orderRequest.price.toString();
        params.timeInForce = 'GTC';
      }

      const queryString = Object.keys(params)
        .map(key => `${key}=${encodeURIComponent(params[key])}`)
        .join('&');

      const signature = await this.createSignature(queryString);
      const url = `${this.baseUrl}/api/v3/order?${queryString}&signature=${signature}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'X-MBX-APIKEY': this.credentials.apiKey,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to create order: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        orderId: data.orderId.toString(),
        symbol: data.symbol,
        status: data.status,
        side: data.side,
        type: data.type,
        quantity: parseFloat(data.origQty),
        price: parseFloat(data.price || 0),
        executedQuantity: parseFloat(data.executedQty),
        timestamp: data.transactTime,
        clientOrderId: data.clientOrderId
      };
    } catch (error) {
      throw new Error(`Failed to create order: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async cancelOrder(orderId: string, symbol: string): Promise<OrderResponse> {
    try {
      const timestamp = Date.now();
      const params = {
        symbol: symbol.toUpperCase(),
        orderId: orderId,
        timestamp: timestamp
      };

      const queryString = Object.keys(params)
        .map(key => `${key}=${encodeURIComponent(params[key])}`)
        .join('&');

      const signature = await this.createSignature(queryString);
      const url = `${this.baseUrl}/api/v3/order?${queryString}&signature=${signature}`;

      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'X-MBX-APIKEY': this.credentials.apiKey,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to cancel order: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        orderId: data.orderId.toString(),
        symbol: data.symbol,
        status: data.status,
        side: data.side,
        type: data.type,
        quantity: parseFloat(data.origQty),
        price: parseFloat(data.price || 0),
        executedQuantity: parseFloat(data.executedQty),
        timestamp: data.transactTime,
        clientOrderId: data.clientOrderId
      };
    } catch (error) {
      throw new Error(`Failed to cancel order: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getOrderStatus(orderId: string, symbol: string): Promise<OrderResponse> {
    try {
      const timestamp = Date.now();
      const params = {
        symbol: symbol.toUpperCase(),
        orderId: orderId,
        timestamp: timestamp
      };

      const queryString = Object.keys(params)
        .map(key => `${key}=${encodeURIComponent(params[key])}`)
        .join('&');

      const signature = await this.createSignature(queryString);
      const url = `${this.baseUrl}/api/v3/order?${queryString}&signature=${signature}`;

      const response = await fetch(url, {
        headers: {
          'X-MBX-APIKEY': this.credentials.apiKey,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to get order status: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        orderId: data.orderId.toString(),
        symbol: data.symbol,
        status: data.status,
        side: data.side,
        type: data.type,
        quantity: parseFloat(data.origQty),
        price: parseFloat(data.price || 0),
        executedQuantity: parseFloat(data.executedQty),
        timestamp: data.time,
        clientOrderId: data.clientOrderId
      };
    } catch (error) {
      throw new Error(`Failed to get order status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  formatSymbol(symbol: string): string {
    // Binance uses uppercase symbols
    return symbol.toUpperCase();
  }

  private async createSignature(queryString: string): Promise<string> {
    // Use Web Crypto API for HMAC-SHA256 in browser environment
    const encoder = new TextEncoder();
    const keyData = encoder.encode(this.credentials.apiSecret);
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
}