/**
 * Coinbase Exchange Adapter
 * Production-ready Coinbase Pro API integration
 */

import { Exchange, ExchangeConfig, Ticker, Balance, OrderRequest, OrderResponse, ExchangeInfo } from './index';

interface CoinbaseCredentials {
  apiKey: string;
  apiSecret: string;
  passphrase?: string;
  sandbox?: boolean;
  baseUrl?: string;
}

export class CoinbaseExchange implements Exchange {
  private credentials: CoinbaseCredentials;
  private baseUrl: string;
  private productionUrl = 'https://api.exchange.coinbase.com';
  private sandboxUrl = 'https://api-public.sandbox.exchange.coinbase.com';

  constructor(credentials: CoinbaseCredentials) {
    this.credentials = credentials;
    this.baseUrl = credentials.baseUrl || (credentials.sandbox ? this.sandboxUrl : this.productionUrl);
  }

  async getExchangeInfo(): Promise<ExchangeInfo> {
    try {
      const response = await fetch(`${this.baseUrl}/products`);
      if (!response.ok) {
        throw new Error(`Failed to fetch exchange info: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      return {
        name: 'Coinbase Pro',
        timezone: 'UTC',
        serverTime: Date.now(),
        rateLimits: [],
        exchangeFilters: [],
        symbols: data.map((product: any) => ({
          symbol: product.id,
          status: product.status === 'online' ? 'TRADING' : 'HALTED',
          baseAsset: product.base_currency,
          quoteAsset: product.quote_currency,
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
      const response = await fetch(`${this.baseUrl}/products/${symbol}/ticker`);
      if (!response.ok) {
        throw new Error(`Failed to fetch ticker: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      return {
        symbol: symbol,
        price: parseFloat(data.price),
        bidPrice: parseFloat(data.bid),
        askPrice: parseFloat(data.ask),
        volume: parseFloat(data.volume || '0'),
        quoteVolume: parseFloat(data.volume || '0'),
        openPrice: 0,
        highPrice: 0,
        lowPrice: 0,
        priceChange: 0,
        priceChangePercent: 0,
        count: 0,
        timestamp: Date.now()
      };
    } catch (error) {
      throw new Error(`Failed to get ticker: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getBalance(): Promise<Balance[]> {
    try {
      const timestamp = Date.now();
      const signature = await this.createSignature('GET', '/accounts', '', timestamp);
      
      const url = `${this.baseUrl}/accounts`;
      
      const response = await fetch(url, {
        headers: {
          'CB-ACCESS-KEY': this.credentials.apiKey,
          'CB-ACCESS-SIGN': signature,
          'CB-ACCESS-TIMESTAMP': timestamp.toString(),
          'CB-ACCESS-PASSPHRASE': this.credentials.passphrase || '',
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch balance: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      return data
        .filter((account: any) => parseFloat(account.balance || '0') > 0)
        .map((account: any) => ({
          asset: account.currency,
          free: parseFloat(account.available || '0'),
          locked: parseFloat(account.hold || '0'),
          total: parseFloat(account.balance || '0')
        }));
    } catch (error) {
      throw new Error(`Failed to get balance: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async createOrder(orderRequest: OrderRequest): Promise<OrderResponse> {
    try {
      const timestamp = Date.now();
      const body = {
        type: orderRequest.type?.toLowerCase() === 'market' ? 'market' : 'limit',
        side: orderRequest.side.toLowerCase(),
        product_id: orderRequest.symbol,
        size: orderRequest.quantity.toString(),
        time_in_force: 'GTC'
      };

      if (orderRequest.price && orderRequest.type?.toLowerCase() !== 'market') {
        body.price = orderRequest.price.toString();
      }

      const bodyString = JSON.stringify(body);
      const signature = await this.createSignature('POST', '/orders', bodyString, timestamp);
      const url = `${this.baseUrl}/orders`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'CB-ACCESS-KEY': this.credentials.apiKey,
          'CB-ACCESS-SIGN': signature,
          'CB-ACCESS-TIMESTAMP': timestamp.toString(),
          'CB-ACCESS-PASSPHRASE': this.credentials.passphrase || '',
          'Content-Type': 'application/json'
        },
        body: bodyString
      });

      if (!response.ok) {
        throw new Error(`Failed to create order: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        orderId: data.id,
        symbol: data.product_id,
        status: data.status,
        side: data.side,
        type: data.type,
        quantity: parseFloat(data.size || '0'),
        price: parseFloat(data.price || '0'),
        executedQuantity: parseFloat(data.filled_size || '0'),
        timestamp: Date.now(),
        clientOrderId: data.client_oid || data.id
      };
    } catch (error) {
      throw new Error(`Failed to create order: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async cancelOrder(orderId: string, symbol: string): Promise<OrderResponse> {
    try {
      const timestamp = Date.now();
      const signature = await this.createSignature('DELETE', `/orders/${orderId}`, '', timestamp);
      const url = `${this.baseUrl}/orders/${orderId}`;

      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'CB-ACCESS-KEY': this.credentials.apiKey,
          'CB-ACCESS-SIGN': signature,
          'CB-ACCESS-TIMESTAMP': timestamp.toString(),
          'CB-ACCESS-PASSPHRASE': this.credentials.passphrase || '',
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to cancel order: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        orderId: data.id,
        symbol: symbol,
        status: data.status,
        side: data.side,
        type: data.type,
        quantity: parseFloat(data.size || '0'),
        price: parseFloat(data.price || '0'),
        executedQuantity: parseFloat(data.filled_size || '0'),
        timestamp: Date.now(),
        clientOrderId: data.client_oid || data.id
      };
    } catch (error) {
      throw new Error(`Failed to cancel order: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getOrderStatus(orderId: string, symbol: string): Promise<OrderResponse> {
    try {
      const timestamp = Date.now();
      const signature = await this.createSignature('GET', `/orders/${orderId}`, '', timestamp);
      const url = `${this.baseUrl}/orders/${orderId}`;

      const response = await fetch(url, {
        headers: {
          'CB-ACCESS-KEY': this.credentials.apiKey,
          'CB-ACCESS-SIGN': signature,
          'CB-ACCESS-TIMESTAMP': timestamp.toString(),
          'CB-ACCESS-PASSPHRASE': this.credentials.passphrase || '',
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to get order status: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        orderId: data.id,
        symbol: data.product_id,
        status: data.status,
        side: data.side,
        type: data.type,
        quantity: parseFloat(data.size || '0'),
        price: parseFloat(data.price || '0'),
        executedQuantity: parseFloat(data.filled_size || '0'),
        timestamp: Date.now(),
        clientOrderId: data.client_oid || data.id
      };
    } catch (error) {
      throw new Error(`Failed to get order status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  formatSymbol(symbol: string): string {
    // Coinbase Pro uses format like "BTC-USD", "ETH-USD"
    return symbol.replace('/', '-').toUpperCase();
  }

  private async createSignature(method: string, path: string, body: string, timestamp: number): Promise<string> {
    const message = `${timestamp}${method}${path}${body}`;
    
    // Use Web Crypto API for HMAC-SHA256 in browser environment
    const encoder = new TextEncoder();
    const keyData = encoder.encode(this.credentials.apiSecret);
    const messageData = encoder.encode(message);

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
    const hashArray = Array.from(new Uint8Array(signature));
    return btoa(String.fromCharCode(...hashArray));
  }
}