/**
 * CoinDCX Exchange Adapter
 * Production-ready CoinDCX API integration for Indian market
 */

import { Exchange, ExchangeConfig, Ticker, Balance, OrderRequest, OrderResponse, ExchangeInfo } from './index';

interface CoinDCXCredentials {
  apiKey: string;
  apiSecret: string;
  sandbox?: boolean;
  baseUrl?: string;
}

export class CoinDCXExchange implements Exchange {
  private credentials: CoinDCXCredentials;
  private baseUrl: string;
  private productionUrl = 'https://api.coindcx.com/exchange/v1';
  private sandboxUrl = 'https://api.sandbox.coindcx.com/exchange/v1';

  constructor(credentials: CoinDCXCredentials) {
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
        name: 'CoinDCX',
        timezone: 'Asia/Kolkata',
        serverTime: Date.now(),
        rateLimits: [],
        exchangeFilters: [],
        symbols: data.map((market: any) => ({
          symbol: market.market,
          status: 'TRADING',
          baseAsset: market.base_currency_short_name,
          quoteAsset: market.target_currency_short_name,
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
      const response = await fetch(`${this.baseUrl}/ticker`);
      if (!response.ok) {
        throw new Error(`Failed to fetch ticker: ${response.statusText}`);
      }
      
      const data = await response.json();
      const ticker = data.find((t: any) => t.market === symbol);
      
      if (!ticker) {
        throw new Error(`Ticker not found for symbol: ${symbol}`);
      }
      
      return {
        symbol: ticker.market,
        price: parseFloat(ticker.last_price),
        bidPrice: parseFloat(ticker.bid || '0'),
        askPrice: parseFloat(ticker.ask || '0'),
        volume: parseFloat(ticker.volume || '0'),
        quoteVolume: parseFloat(ticker.target_volume || '0'),
        openPrice: parseFloat(ticker.open || '0'),
        highPrice: parseFloat(ticker.high || '0'),
        lowPrice: parseFloat(ticker.low || '0'),
        priceChange: parseFloat(ticker.change || '0'),
        priceChangePercent: parseFloat(ticker.change_24_hour || '0'),
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
      const body = { timestamp };
      const payload = JSON.stringify(body);
      const signature = await this.createSignature(payload);
      
      const url = `${this.baseUrl}/users/balances`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'X-AUTH-APIKEY': this.credentials.apiKey,
          'X-AUTH-SIGNATURE': signature,
          'Content-Type': 'application/json'
        },
        body: payload
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch balance: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      return data
        .filter((balance: any) => parseFloat(balance.balance) > 0)
        .map((balance: any) => ({
          asset: balance.currency,
          free: parseFloat(balance.balance),
          locked: 0,
          total: parseFloat(balance.balance)
        }));
    } catch (error) {
      throw new Error(`Failed to get balance: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async createOrder(orderRequest: OrderRequest): Promise<OrderResponse> {
    try {
      const timestamp = Date.now();
      const body = {
        side: orderRequest.side.toLowerCase(),
        order_type: orderRequest.type?.toLowerCase() === 'market' ? 'market_order' : 'limit_order',
        market: orderRequest.symbol,
        total_quantity: orderRequest.quantity.toString(),
        timestamp: timestamp
      };

      if (orderRequest.price && orderRequest.type?.toLowerCase() !== 'market') {
        body.price_per_unit = orderRequest.price.toString();
      }

      const payload = JSON.stringify(body);
      const signature = await this.createSignature(payload);
      const url = `${this.baseUrl}/orders/create`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'X-AUTH-APIKEY': this.credentials.apiKey,
          'X-AUTH-SIGNATURE': signature,
          'Content-Type': 'application/json'
        },
        body: payload
      });

      if (!response.ok) {
        throw new Error(`Failed to create order: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        orderId: data.id.toString(),
        symbol: data.market,
        status: data.status,
        side: data.side,
        type: data.order_type,
        quantity: parseFloat(data.quantity || '0'),
        price: parseFloat(data.price_per_unit || '0'),
        executedQuantity: parseFloat(data.quantity || '0'),
        timestamp: data.created_at,
        clientOrderId: data.id.toString()
      };
    } catch (error) {
      throw new Error(`Failed to create order: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async cancelOrder(orderId: string, symbol: string): Promise<OrderResponse> {
    try {
      const timestamp = Date.now();
      const body = {
        id: orderId,
        timestamp: timestamp
      };

      const payload = JSON.stringify(body);
      const signature = await this.createSignature(payload);
      const url = `${this.baseUrl}/orders/cancel`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'X-AUTH-APIKEY': this.credentials.apiKey,
          'X-AUTH-SIGNATURE': signature,
          'Content-Type': 'application/json'
        },
        body: payload
      });

      if (!response.ok) {
        throw new Error(`Failed to cancel order: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        orderId: data.id.toString(),
        symbol: data.market,
        status: data.status,
        side: data.side,
        type: data.order_type,
        quantity: parseFloat(data.quantity || '0'),
        price: parseFloat(data.price_per_unit || '0'),
        executedQuantity: parseFloat(data.quantity || '0'),
        timestamp: data.created_at,
        clientOrderId: data.id.toString()
      };
    } catch (error) {
      throw new Error(`Failed to cancel order: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getOrderStatus(orderId: string, symbol: string): Promise<OrderResponse> {
    try {
      const timestamp = Date.now();
      const body = {
        id: orderId,
        timestamp: timestamp
      };

      const payload = JSON.stringify(body);
      const signature = await this.createSignature(payload);
      const url = `${this.baseUrl}/orders/status`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'X-AUTH-APIKEY': this.credentials.apiKey,
          'X-AUTH-SIGNATURE': signature,
          'Content-Type': 'application/json'
        },
        body: payload
      });

      if (!response.ok) {
        throw new Error(`Failed to get order status: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        orderId: data.id.toString(),
        symbol: data.market,
        status: data.status,
        side: data.side,
        type: data.order_type,
        quantity: parseFloat(data.quantity || '0'),
        price: parseFloat(data.price_per_unit || '0'),
        executedQuantity: parseFloat(data.quantity || '0'),
        timestamp: data.created_at,
        clientOrderId: data.id.toString()
      };
    } catch (error) {
      throw new Error(`Failed to get order status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  formatSymbol(symbol: string): string {
    // CoinDCX uses specific format like "BTCINR", "ETHINR"
    return symbol.replace('/', '').toUpperCase();
  }

  private async createSignature(payload: string): Promise<string> {
    // Use Web Crypto API for HMAC-SHA256 in browser environment
    const encoder = new TextEncoder();
    const keyData = encoder.encode(this.credentials.apiSecret);
    const messageData = encoder.encode(payload);

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