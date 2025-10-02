/**
 * Exchange Integration System
 * Supports multiple exchanges including India-approved exchanges
 */

export { BinanceExchange } from './binance';
export { CoinbaseExchange } from './coinbase';
export { DeltaExchange } from './delta';
export { WazirXExchange } from './wazirx';
export { CoinDCXExchange } from './coindcx';
export { ExchangeManager } from './manager';

export interface ExchangeConfig {
  apiKey: string;
  apiSecret: string;
  sandbox?: boolean;
  baseUrl?: string;
}

export interface OrderRequest {
  symbol: string;
  side: 'BUY' | 'SELL';
  type: 'MARKET' | 'LIMIT' | 'STOP-LOSS' | 'STOP_LOSS-LIMIT';
  quantity: number;
  price?: number;
  stopPrice?: number;
  timeInForce?: 'GTC' | 'IOC' | 'FOK';
}

export interface OrderResponse {
  orderId: string;
  symbol: string;
  side: string;
  type: string;
  quantity: number;
  price: number;
  status: 'NEW' | 'PARTIALLY-FILLED' | 'FILLED' | 'CANCELED' | 'REJECTED' | 'EXPIRED';
  executedQty: number;
  cummulativeQuoteQty: number;
  timestamp: number;
  clientOrderId?: string;
}

export interface Balance {
  asset: string;
  free: string;
  locked: string;
  total: string;
}

export interface Ticker {
  symbol: string;
  price: string;
  bidPrice: string;
  askPrice: string;
  volume: string;
  quoteVolume: string;
  openPrice: string;
  highPrice: string;
  lowPrice: string;
  closePrice: string;
  priceChange: string;
  priceChangePercent: string;
  count: number;
  timestamp: number;
}

export interface ExchangeInfo {
  name: string;
  country: string;
  isIndiaApproved: boolean;
  supportedPairs: string[];
  tradingFees: {
    maker: number;
    taker: number;
  };
  withdrawalFees: { [asset: string]: number };
  minOrderSize: { [pair: string]: number };
  maxOrderSize: { [pair: string]: number };
  supportedOrderTypes: string[];
  apiLimits: {
    requestsPerMinute: number;
    ordersPerSecond: number;
  };
}

export interface Exchange {
  name: string;
  config: ExchangeConfig;
  
  // Authentication
  authenticate(): Promise<boolean>;
  
  // Market Data
  getTicker(symbol: string): Promise<Ticker>;
  getOrderBook(symbol: string, limit?: number): Promise<any>;
  getKlines(symbol: string, interval: string, limit?: number): Promise<any[]>;
  
  // Account
  getAccountInfo(): Promise<any>;
  getBalances(): Promise<Balance[]>;
  getBalance(asset: string): Promise<Balance>;
  
  // Trading
  createOrder(order: OrderRequest): Promise<OrderResponse>;
  cancelOrder(symbol: string, orderId: string): Promise<boolean>;
  getOrder(symbol: string, orderId: string): Promise<OrderResponse>;
  getOpenOrders(symbol?: string): Promise<OrderResponse[]>;
  getOrderHistory(symbol?: string, limit?: number): Promise<OrderResponse[]>;
  
  // Utility
  getExchangeInfo(): ExchangeInfo;
  validateSymbol(symbol: string): boolean;
  formatSymbol(symbol: string): string;
}
