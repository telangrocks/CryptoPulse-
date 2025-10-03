/**
 * WazirX Exchange Adapter
 * Production-ready WazirX API integration for Indian market
 */

import { Exchange, ExchangeConfig, Ticker, Balance, OrderRequest, OrderResponse, ExchangeInfo } from './index';

interface WazirXCredentials {
  apiKey: string;
  apiSecret: string;
  sandbox?: boolean;
  baseUrl?: string;
}

export class WazirXExchange implements Exchange {
  private credentials: WazirXCredentials;
  private baseUrl: string;
  private productionUrl = 'https://api.wazirx.com/api/v2';
  private sandboxUrl = 'https://sandbox.wazirx.com/api/v2';

  constructor(credentials: WazirXCredentials) {
    this.credentials = credentials;
    this.baseUrl = credentials.baseUrl || (credentials.sandbox ? this.sandboxUrl : this.productionUrl);
  }

  async getExchangeInfo(): Promise<ExchangeInfo> {
    try {
      const response = await fetch(`${this.baseUrl}/markets`);
      if (!response.ok) {
        throw new Error(`Failed to fetch exchange info: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      return {
        name: 'WazirX',
        timezone: 'Asia/Kolkata',
        serverTime: Date.now(),
        rateLimits: [],
        exchangeFilters: [],
        symbols: data.map((market: any) => ({
          symbol: market.symbol,
          status: 'TRADING',
          baseAsset: market.baseAsset,
          quoteAsset: market.quoteAsset,
          orderTypes: ['LIMIT', 'MARKET'],
          filters: []
        }))
      };
    } catch (error) {
      throw new Error(`Failed to get exchange info: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getTicker(symbol: string): Promise<Ticker> {
    try {
      const response = await fetch(`${this.baseUrl}/ticker/24hr?symbol=${symbol}`);
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
        count: parseInt(data.count || '0'),
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
      
      const url = `${this.baseUrl}/funds?${queryString}&signature=${signature}`;
      
      const response = await fetch(url, {
        headers: {
          'X-Api-Key': this.credentials.apiKey,
          'X-Api-Signature': signature,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch balance: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      return data
        .filter((balance: any) => parseFloat(balance.free) > 0 || parseFloat(balance.locked) > 0)
        .map((balance: any) => ({
          asset: balance.currency,
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
        side: orderRequest.side.toLowerCase(),
        type: orderRequest.type?.toLowerCase() || 'market',
        quantity: orderRequest.quantity.toString(),
        timestamp: timestamp
      };

      if (orderRequest.price) {
        params.price = orderRequest.price.toString();
      }

      const queryString = Object.keys(params)
        .map(key => `${key}=${encodeURIComponent(params[key])}`)
        .join('&');

      const signature = await this.createSignature(queryString);
      const url = `${this.baseUrl}/orders`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'X-Api-Key': this.credentials.apiKey,
          'X-Api-Signature': signature,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(params)
      });

      if (!response.ok) {
        throw new Error(`Failed to create order: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        orderId: data.id.toString(),
        symbol: data.symbol,
        status: data.status,
        side: data.side,
        type: data.type,
        quantity: parseFloat(data.quantity),
        price: parseFloat(data.price || 0),
        executedQuantity: parseFloat(data.executedQuantity || 0),
        timestamp: data.createdAt,
        clientOrderId: data.id.toString()
      };
    } catch (error) {
      throw new Error(`Failed to create order: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async cancelOrder(orderId: string, symbol: string): Promise<OrderResponse> {
    try {
      const timestamp = Date.now();
      const params = {
        orderId: orderId,
        timestamp: timestamp
      };

      const queryString = Object.keys(params)
        .map(key => `${key}=${encodeURIComponent(params[key])}`)
        .join('&');

      const signature = await this.createSignature(queryString);
      const url = `${this.baseUrl}/orders?${queryString}&signature=${signature}`;

      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'X-Api-Key': this.credentials.apiKey,
          'X-Api-Signature': signature,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to cancel order: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        orderId: data.id.toString(),
        symbol: data.symbol,
        status: data.status,
        side: data.side,
        type: data.type,
        quantity: parseFloat(data.quantity),
        price: parseFloat(data.price || 0),
        executedQuantity: parseFloat(data.executedQuantity || 0),
        timestamp: data.createdAt,
        clientOrderId: data.id.toString()
      };
    } catch (error) {
      throw new Error(`Failed to cancel order: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getOrderStatus(orderId: string, symbol: string): Promise<OrderResponse> {
    try {
      const timestamp = Date.now();
      const params = {
        orderId: orderId,
        timestamp: timestamp
      };

      const queryString = Object.keys(params)
        .map(key => `${key}=${encodeURIComponent(params[key])}`)
        .join('&');

      const signature = await this.createSignature(queryString);
      const url = `${this.baseUrl}/orders?${queryString}&signature=${signature}`;

      const response = await fetch(url, {
        headers: {
          'X-Api-Key': this.credentials.apiKey,
          'X-Api-Signature': signature,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to get order status: ${response.statusText}`);
      }

      const data = await response.json();
      const order = data.find((o: any) => o.id.toString() === orderId);

      if (!order) {
        throw new Error('Order not found');
      }

      return {
        orderId: order.id.toString(),
        symbol: order.symbol,
        status: order.status,
        side: order.side,
        type: order.type,
        quantity: parseFloat(order.quantity),
        price: parseFloat(order.price || 0),
        executedQuantity: parseFloat(order.executedQuantity || 0),
        timestamp: order.createdAt,
        clientOrderId: order.id.toString()
      };
    } catch (error) {
      throw new Error(`Failed to get order status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  formatSymbol(symbol: string): string {
    // WazirX uses uppercase symbols
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