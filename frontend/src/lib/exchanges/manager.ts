/**
 * Exchange Manager
 * Unified interface for managing multiple exchanges
 */

import { logError, logInfo, logWarn } from '../logger';

// import { BinanceExchange } from './binance';
// import { CoinbaseExchange } from './coinbase';
// import { CoinDCXExchange } from './coindcx';
// import { DeltaExchange } from './delta';
// import { WazirXExchange } from './wazirx';

import {
  Exchange,
  ExchangeConfig,
  Ticker,
  Balance,
  OrderRequest,
  OrderResponse,
  ExchangeInfo,
} from './index';

export interface ExchangeCredentials {
  [exchangeName: string]: {
    apiKey: string;
    apiSecret: string;
    sandbox?: boolean;
    baseUrl?: string;
  };
}

export interface TradingConfig {
  primaryExchange: string;
  fallbackExchanges: string[];
  maxSlippage: number;
  maxOrderSize: number;
  minOrderSize: number;
  enableArbitrage: boolean;
  riskManagement: {
    maxDailyLoss: number;
    maxPositionSize: number;
    stopLossPercentage: number;
  };
}

export class ExchangeManager {
  private exchanges: Map<string, Exchange> = new Map();
  private credentials: ExchangeCredentials = {};
  private config: TradingConfig;
  private requestCache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 30000; // 30 seconds

  constructor(credentials: ExchangeCredentials, config: TradingConfig) {
    this.credentials = credentials;
    this.config = config;
    this.initializeExchanges();
  }

  private initializeExchanges(): void {
    // Initialize exchanges dynamically
    const exchangeClasses = {
      binance: () => import('./binance').then(m => new m.BinanceExchange({
        apiKey: this.credentials.binance!.apiKey,
        apiSecret: this.credentials.binance!.apiSecret,
        sandbox: this.credentials.binance!.sandbox,
        baseUrl: this.credentials.binance!.baseUrl,
      })),
      wazirx: () => import('./wazirx').then(m => new m.WazirXExchange({
        apiKey: this.credentials.wazirx!.apiKey,
        apiSecret: this.credentials.wazirx!.apiSecret,
        sandbox: this.credentials.wazirx!.sandbox,
        baseUrl: this.credentials.wazirx!.baseUrl,
      })),
      coindcx: () => import('./coindcx').then(m => new m.CoinDCXExchange({
        apiKey: this.credentials.coindcx!.apiKey,
        apiSecret: this.credentials.coindcx!.apiSecret,
        sandbox: this.credentials.coindcx!.sandbox,
        baseUrl: this.credentials.coindcx!.baseUrl,
      })),
      delta: () => import('./delta').then(m => new m.DeltaExchange({
        apiKey: this.credentials.delta!.apiKey,
        apiSecret: this.credentials.delta!.apiSecret,
        sandbox: this.credentials.delta!.sandbox,
        baseUrl: this.credentials.delta!.baseUrl,
      })),
      coinbase: () => import('./coinbase').then(m => new m.CoinbaseExchange({
        apiKey: this.credentials.coinbase!.apiKey,
        apiSecret: this.credentials.coinbase!.apiSecret,
        sandbox: this.credentials.coinbase!.sandbox,
        baseUrl: this.credentials.coinbase!.baseUrl,
      })),
    };

    // Initialize exchanges
    Object.entries(exchangeClasses).forEach(async ([name, initFn]) => {
      if (this.credentials[name]) {
        try {
          const exchange = await initFn();
          this.exchanges.set(name, exchange);
        } catch (error) {
          logError(`Failed to initialize ${name} exchange`, error);
        }
      }
    });

    logInfo('Exchange Manager initialized', 'ExchangeManager', {
      exchanges: Array.from(this.exchanges.keys()),
      primaryExchange: this.config.primaryExchange,
    });
  }

  async authenticateAll(): Promise<{ [exchangeName: string]: boolean }> {
    const results: { [exchangeName: string]: boolean } = {};

    for (const [name, exchange] of this.exchanges) {
      try {
        results[name] = await exchange.authenticate();
        logInfo(`Authentication ${results[name] ? 'successful' : 'failed'}`, 'ExchangeManager', { exchange: name });
      } catch (error) {
        results[name] = false;
        logError(`Authentication failed for ${name}`, 'ExchangeManager', error);
      }
    }

    return results;
  }

  async getBestTicker(symbol: string): Promise<{ exchange: string; ticker: Ticker }> {
    const cacheKey = `ticker_${symbol}`;
    const cached = this.getCachedData(cacheKey);
    if (cached) {
      return cached;
    }

    const tickers: { exchange: string; ticker: Ticker }[] = [];

    for (const [name, exchange] of this.exchanges) {
      try {
        if (exchange.validateSymbol(symbol)) {
          const ticker = await exchange.getTicker(symbol);
          tickers.push({ exchange: name, ticker });
        }
      } catch (error) {
        logWarn(`Failed to get ticker from ${name}`, 'ExchangeManager', error);
      }
    }

    if (tickers.length === 0) {
      throw new Error(`No exchanges support symbol ${symbol}`);
    }

    // Return the ticker with the best price (highest for sell, lowest for buy)
    const bestTicker = tickers[0]; // For now, return the first available ticker
    this.setCachedData(cacheKey, bestTicker);
    return bestTicker;
  }

  async getBestOrderBook(symbol: string): Promise<{ exchange: string; orderBook: any }> {
    const cacheKey = `orderbook_${symbol}`;
    const cached = this.getCachedData(cacheKey);
    if (cached) {
      return cached;
    }

    const orderBooks: { exchange: string; orderBook: any }[] = [];

    for (const [name, exchange] of this.exchanges) {
      try {
        if (exchange.validateSymbol(symbol)) {
          const orderBook = await exchange.getOrderBook(symbol);
          orderBooks.push({ exchange: name, orderBook });
        }
      } catch (error) {
        logWarn(`Failed to get order book from ${name}`, 'ExchangeManager', error);
      }
    }

    if (orderBooks.length === 0) {
      throw new Error(`No exchanges support symbol ${symbol}`);
    }

    const bestOrderBook = orderBooks[0];
    this.setCachedData(cacheKey, bestOrderBook);
    return bestOrderBook;
  }

  async createOrder(order: OrderRequest, preferredExchange?: string): Promise<OrderResponse> {
    const exchangeName = preferredExchange || this.config.primaryExchange;
    const exchange = this.exchanges.get(exchangeName);

    if (!exchange) {
      throw new Error(`Exchange ${exchangeName} not available`);
    }

    if (!exchange.validateSymbol(order.symbol)) {
      throw new Error(`Symbol ${order.symbol} not supported by ${exchangeName}`);
    }

    // Validate order size
    if (order.quantity < this.config.minOrderSize) {
      throw new Error(`Order size too small. Minimum: ${this.config.minOrderSize}`);
    }

    if (order.quantity > this.config.maxOrderSize) {
      throw new Error(`Order size too large. Maximum: ${this.config.maxOrderSize}`);
    }

    try {
      const result = await exchange.createOrder(order);
      logInfo('Order created successfully', 'ExchangeManager', {
        exchange: exchangeName,
        orderId: result.orderId,
        symbol: result.symbol,
        side: result.side,
        quantity: result.quantity,
      });
      return result;
    } catch (error) {
      logError(`Failed to create order on ${exchangeName}`, 'ExchangeManager', error);

      // Try fallback exchanges
      for (const fallbackExchange of this.config.fallbackExchanges) {
        const fallback = this.exchanges.get(fallbackExchange);
        if (fallback && fallback.validateSymbol(order.symbol)) {
          try {
            logInfo(`Trying fallback exchange: ${fallbackExchange}`, 'ExchangeManager');
            const result = await fallback.createOrder(order);
            return result;
          } catch (fallbackError) {
            logWarn(`Fallback exchange ${fallbackExchange} also failed`, 'ExchangeManager', fallbackError);
          }
        }
      }

      throw error;
    }
  }

  async cancelOrder(symbol: string, orderId: string, exchangeName?: string): Promise<boolean> {
    const exchange = this.exchanges.get(exchangeName || this.config.primaryExchange);

    if (!exchange) {
      throw new Error(`Exchange ${exchangeName || this.config.primaryExchange} not available`);
    }

    try {
      const result = await exchange.cancelOrder(symbol, orderId);
      logInfo('Order cancelled successfully', 'ExchangeManager', {
        exchange: exchangeName || this.config.primaryExchange,
        orderId,
        symbol,
      });
      return result;
    } catch (error) {
      logError(`Failed to cancel order on ${exchangeName || this.config.primaryExchange}`, 'ExchangeManager', error);
      return false;
    }
  }

  async getOrder(symbol: string, orderId: string, exchangeName?: string): Promise<OrderResponse> {
    const exchange = this.exchanges.get(exchangeName || this.config.primaryExchange);

    if (!exchange) {
      throw new Error(`Exchange ${exchangeName || this.config.primaryExchange} not available`);
    }

    return await exchange.getOrder(symbol, orderId);
  }

  async getOpenOrders(symbol?: string, exchangeName?: string): Promise<OrderResponse[]> {
    const exchange = this.exchanges.get(exchangeName || this.config.primaryExchange);

    if (!exchange) {
      throw new Error(`Exchange ${exchangeName || this.config.primaryExchange} not available`);
    }

    return await exchange.getOpenOrders(symbol);
  }

  async getOrderHistory(symbol?: string, limit?: number, exchangeName?: string): Promise<OrderResponse[]> {
    const exchange = this.exchanges.get(exchangeName || this.config.primaryExchange);

    if (!exchange) {
      throw new Error(`Exchange ${exchangeName || this.config.primaryExchange} not available`);
    }

    return await exchange.getOrderHistory(symbol, limit);
  }

  async getAllBalances(): Promise<{ [exchangeName: string]: Balance[] }> {
    const allBalances: { [exchangeName: string]: Balance[] } = {};

    for (const [name, exchange] of this.exchanges) {
      try {
        allBalances[name] = await exchange.getBalances();
      } catch (error) {
        logWarn(`Failed to get balances from ${name}`, 'ExchangeManager', error);
        allBalances[name] = [];
      }
    }

    return allBalances;
  }

  async getBalance(asset: string, exchangeName?: string): Promise<Balance> {
    const exchange = this.exchanges.get(exchangeName || this.config.primaryExchange);

    if (!exchange) {
      throw new Error(`Exchange ${exchangeName || this.config.primaryExchange} not available`);
    }

    return await exchange.getBalance(asset);
  }

  getExchangeInfo(exchangeName?: string): ExchangeInfo | { [exchangeName: string]: ExchangeInfo } {
    if (exchangeName) {
      const exchange = this.exchanges.get(exchangeName);
      if (!exchange) {
        throw new Error(`Exchange ${exchangeName} not available`);
      }
      return exchange.getExchangeInfo();
    }

    const allInfo: { [exchangeName: string]: ExchangeInfo } = {};
    for (const [name, exchange] of this.exchanges) {
      allInfo[name] = exchange.getExchangeInfo();
    }
    return allInfo;
  }

  getAvailableExchanges(): string[] {
    return Array.from(this.exchanges.keys());
  }

  getIndiaApprovedExchanges(): string[] {
    const indiaApproved: string[] = [];
    for (const [name, exchange] of this.exchanges) {
      if (exchange.getExchangeInfo().isIndiaApproved) {
        indiaApproved.push(name);
      }
    }
    return indiaApproved;
  }

  async validateOrder(order: OrderRequest): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Check if any exchange supports the symbol
    let symbolSupported = false;
    for (const exchange of this.exchanges.values()) {
      if (exchange.validateSymbol(order.symbol)) {
        symbolSupported = true;
        break;
      }
    }

    if (!symbolSupported) {
      errors.push(`Symbol ${order.symbol} not supported by any exchange`);
    }

    // Check order size
    if (order.quantity < this.config.minOrderSize) {
      errors.push(`Order size too small. Minimum: ${this.config.minOrderSize}`);
    }

    if (order.quantity > this.config.maxOrderSize) {
      errors.push(`Order size too large. Maximum: ${this.config.maxOrderSize}`);
    }

    // Check required fields
    if (!order.symbol) {
      errors.push('Symbol is required');
    }

    if (!order.side || !['BUY', 'SELL'].includes(order.side)) {
      errors.push('Valid side (BUY/SELL) is required');
    }

    if (!order.type || !['MARKET', 'LIMIT', 'STOP-LOSS', 'STOP_LOSS-LIMIT'].includes(order.type)) {
      errors.push('Valid order type is required');
    }

    if (order.quantity <= 0) {
      errors.push('Quantity must be greater than 0');
    }

    if (order.type === 'LIMIT' && !order.price) {
      errors.push('Price is required for LIMIT orders');
    }

    if ((order.type === 'STOP-LOSS' || order.type === 'STOP_LOSS-LIMIT') && !order.stopPrice) {
      errors.push('Stop price is required for STOP-LOSS orders');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  updateCredentials(credentials: ExchangeCredentials): void {
    this.credentials = { ...this.credentials, ...credentials };
    this.initializeExchanges();
  }

  updateConfig(config: Partial<TradingConfig>): void {
    this.config = { ...this.config, ...config };
  }

  private getCachedData(key: string): any {
    const cached = this.requestCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }
    return null;
  }

  private setCachedData(key: string, data: any): void {
    this.requestCache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  // Health check method
  async healthCheck(): Promise<{ [exchangeName: string]: { status: string; latency: number } }> {
    const results: { [exchangeName: string]: { status: string; latency: number } } = {};

    for (const [name, exchange] of this.exchanges) {
      const startTime = Date.now();
      try {
        await exchange.authenticate();
        const latency = Date.now() - startTime;
        results[name] = { status: 'healthy', latency };
      } catch (error) {
        const latency = Date.now() - startTime;
        results[name] = { status: 'unhealthy', latency };
        logError(`Health check failed for ${name}`, 'ExchangeManager', error);
      }
    }

    return results;
  }
}