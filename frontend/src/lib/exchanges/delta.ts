/**
 * Delta Exchange Adapter
 * Production-ready Delta Exchange API integration for Indian market
 */

import { Exchange, ExchangeConfig, Ticker, Balance, OrderRequest, OrderResponse, ExchangeInfo } from './index';

interface DeltaExchangeCredentials {
  apiKey: string;
  apiSecret: string;
  sandbox?: boolean;
  baseUrl?: string;
}

export class DeltaExchange implements Exchange {
  private credentials: DeltaExchangeCredentials;
  private baseUrl: string;
  private productionUrl = 'https://api.delta.exchange';
  private sandboxUrl = 'https://sandbox.delta.exchange';

  constructor(credentials: DeltaExchangeCredentials) {
    this.credentials = credentials;
    this.baseUrl = credentials.baseUrl || (credentials.sandbox ? this.sandboxUrl : this.productionUrl);
  }

  async getExchangeInfo(): Promise<ExchangeInfo> {
    try {
      const response = await fetch(`${this.baseUrl}/v2/products`);
      if (!response.ok) {
        throw new Error(`Failed to fetch exchange info: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      return {
        name: 'Delta Exchange',
        timezone: 'UTC',
        serverTime: Date.now(),
        rateLimits: [],
        exchangeFilters: [],
        symbols: data.result.map((product: any) => ({
          symbol: product.symbol,
          status: product.state === 'live' ? 'TRADING' : 'HALTED',
          baseAsset: product.base_currency?.symbol || '',
          quoteAsset: product.quote_currency?.symbol || '',
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
      const response = await fetch(`${this.baseUrl}/v2/tickers/${symbol}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch ticker: ${response.statusText}`);
      }
      
      const data = await response.json();
      const ticker = data.result;
      
      return {
        symbol: ticker.symbol,
        price: parseFloat(ticker.close),
        bidPrice: parseFloat(ticker.best_bid_price || '0'),
        askPrice: parseFloat(ticker.best_ask_price || '0'),
        volume: parseFloat(ticker.volume || '0'),
        quoteVolume: parseFloat(ticker.volume || '0'),
        openPrice: parseFloat(ticker.open || '0'),
        highPrice: parseFloat(ticker.high || '0'),
        lowPrice: parseFloat(ticker.low || '0'),
        priceChange: parseFloat(ticker.change || '0'),
        priceChangePercent: parseFloat(ticker.change_percentage || '0'),
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
      const signature = await this.createSignature('GET', '/v2/accounts', '', timestamp);
      
      const url = `${this.baseUrl}/v2/accounts?timestamp=${timestamp}`;
      
      const response = await fetch(url, {
        headers: {
          'api-key': this.credentials.apiKey,
          'signature': signature,
          'timestamp': timestamp.toString(),
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch balance: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      return data.result.map((balance: any) => ({
        asset: balance.currency,
        free: parseFloat(balance.available_balance || '0'),
        locked: parseFloat(balance.balance) - parseFloat(balance.available_balance || '0'),
        total: parseFloat(balance.balance || '0')
      })).filter((balance: Balance) => balance.total > 0);
    } catch (error) {
      throw new Error(`Failed to get balance: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async createOrder(orderRequest: OrderRequest): Promise<OrderResponse> {
    try {
      const timestamp = Date.now();
      const body = {
        product_id: await this.getProductId(orderRequest.symbol),
        side: orderRequest.side.toLowerCase(),
        order_type: orderRequest.type?.toLowerCase() === 'market' ? 'market_order' : 'limit_order',
        size: orderRequest.quantity,
        time_in_force: 'gtc'
      };

      if (orderRequest.price && orderRequest.type?.toLowerCase() !== 'market') {
        body.limit_price = orderRequest.price;
      }

      const bodyString = JSON.stringify(body);
      const signature = await this.createSignature('POST', '/v2/orders', bodyString, timestamp);
      const url = `${this.baseUrl}/v2/orders`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'api-key': this.credentials.apiKey,
          'signature': signature,
          'timestamp': timestamp.toString(),
          'Content-Type': 'application/json'
        },
        body: bodyString
      });

      if (!response.ok) {
        throw new Error(`Failed to create order: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        orderId: data.result.id.toString(),
        symbol: orderRequest.symbol,
        status: data.result.state,
        side: data.result.side,
        type: data.result.order_type,
        quantity: parseFloat(data.result.size || '0'),
        price: parseFloat(data.result.limit_price || '0'),
        executedQuantity: parseFloat(data.result.filled_size || '0'),
        timestamp: Date.now(),
        clientOrderId: data.result.id.toString()
      };
    } catch (error) {
      throw new Error(`Failed to create order: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async cancelOrder(orderId: string, symbol: string): Promise<OrderResponse> {
    try {
      const timestamp = Date.now();
      const signature = await this.createSignature('DELETE', `/v2/orders/${orderId}`, '', timestamp);
      const url = `${this.baseUrl}/v2/orders/${orderId}`;

      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'api-key': this.credentials.apiKey,
          'signature': signature,
          'timestamp': timestamp.toString(),
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to cancel order: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        orderId: data.result.id.toString(),
        symbol: symbol,
        status: data.result.state,
        side: data.result.side,
        type: data.result.order_type,
        quantity: parseFloat(data.result.size || '0'),
        price: parseFloat(data.result.limit_price || '0'),
        executedQuantity: parseFloat(data.result.filled_size || '0'),
        timestamp: Date.now(),
        clientOrderId: data.result.id.toString()
      };
    } catch (error) {
      throw new Error(`Failed to cancel order: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getOrderStatus(orderId: string, symbol: string): Promise<OrderResponse> {
    try {
      const timestamp = Date.now();
      const signature = await this.createSignature('GET', `/v2/orders/${orderId}`, '', timestamp);
      const url = `${this.baseUrl}/v2/orders/${orderId}?timestamp=${timestamp}`;

      const response = await fetch(url, {
        headers: {
          'api-key': this.credentials.apiKey,
          'signature': signature,
          'timestamp': timestamp.toString(),
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to get order status: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        orderId: data.result.id.toString(),
        symbol: symbol,
        status: data.result.state,
        side: data.result.side,
        type: data.result.order_type,
        quantity: parseFloat(data.result.size || '0'),
        price: parseFloat(data.result.limit_price || '0'),
        executedQuantity: parseFloat(data.result.filled_size || '0'),
        timestamp: Date.now(),
        clientOrderId: data.result.id.toString()
      };
    } catch (error) {
      throw new Error(`Failed to get order status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  formatSymbol(symbol: string): string {
    // Delta Exchange uses specific format
    return symbol.toUpperCase();
  }

  private async getProductId(symbol: string): Promise<number> {
    try {
      const response = await fetch(`${this.baseUrl}/v2/products`);
      if (!response.ok) {
        throw new Error(`Failed to fetch products: ${response.statusText}`);
      }
      
      const data = await response.json();
      const product = data.result.find((p: any) => p.symbol === symbol.toUpperCase());
      
      if (!product) {
        throw new Error(`Product not found for symbol: ${symbol}`);
      }
      
      return product.id;
    } catch (error) {
      throw new Error(`Failed to get product ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
}
}