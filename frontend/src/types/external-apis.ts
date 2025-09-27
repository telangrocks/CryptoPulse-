/**
 * TypeScript type definitions for external APIs used in CryptoPulse
 */

// Exchange API Types
export interface ExchangeCredentials {
  apiKey: string;
  secret: string;
  passphrase?: string; // For some exchanges like Coinbase
}

export interface ExchangeConfig {
  name: string;
  baseUrl: string;
  sandboxUrl?: string;
  endpoints: ExchangeEndpoints;
  authType: 'HMAC_SHA256' | 'API_KEY' | 'OAUTH2';
  rateLimit: RateLimit;
}

export interface ExchangeEndpoints {
  account: string;
  order: string;
  ticker: string;
  exchangeInfo: string;
}

export interface RateLimit {
  requests: number;
  window: number; // in milliseconds
}

// Binance API Types
export interface BinanceAccountInfo {
  makerCommission: number;
  takerCommission: number;
  buyerCommission: number;
  sellerCommission: number;
  canTrade: boolean;
  canWithdraw: boolean;
  canDeposit: boolean;
  updateTime: number;
  accountType: string;
  balances: BinanceBalance[];
  permissions: string[];
}

export interface BinanceBalance {
  asset: string;
  free: string;
  locked: string;
}

export interface BinanceOrder {
  symbol: string;
  orderId: number;
  orderListId: number;
  clientOrderId: string;
  price: string;
  origQty: string;
  executedQty: string;
  cummulativeQuoteQty: string;
  status: 'NEW' | 'PARTIALLY_FILLED' | 'FILLED' | 'CANCELED' | 'PENDING_CANCEL' | 'REJECTED' | 'EXPIRED';
  timeInForce: 'GTC' | 'IOC' | 'FOK';
  type: 'LIMIT' | 'MARKET' | 'STOP_LOSS' | 'STOP_LOSS_LIMIT' | 'TAKE_PROFIT' | 'TAKE_PROFIT_LIMIT' | 'LIMIT_MAKER';
  side: 'BUY' | 'SELL';
  stopPrice: string;
  icebergQty: string;
  time: number;
  updateTime: number;
  isWorking: boolean;
  origQuoteOrderQty: string;
}

export interface BinanceTicker {
  symbol: string;
  price: string;
  time: number;
}

// WazirX API Types
export interface WazirXAccountInfo {
  status: string;
  data: {
    balances: WazirXBalance[];
  };
}

export interface WazirXBalance {
  currency: string;
  balance: string;
  locked: string;
  avgBuyPrice: string;
  pnl: string;
  pnlPercentage: string;
}

export interface WazirXOrder {
  id: string;
  market: string;
  side: 'buy' | 'sell';
  order_type: 'market' | 'limit';
  status: 'open' | 'filled' | 'cancelled';
  quantity: string;
  price: string;
  filled_quantity: string;
  remaining_quantity: string;
  avg_price: string;
  created_at: string;
  updated_at: string;
}

// CoinDCX API Types
export interface CoinDCXAccountInfo {
  balances: CoinDCXBalance[];
}

export interface CoinDCXBalance {
  currency: string;
  balance: string;
  locked_balance: string;
  available_balance: string;
}

export interface CoinDCXOrder {
  id: string;
  market: string;
  side: 'buy' | 'sell';
  order_type: 'market_order' | 'limit_order';
  status: 'open' | 'filled' | 'cancelled';
  quantity: string;
  price: string;
  filled_quantity: string;
  remaining_quantity: string;
  avg_price: string;
  created_at: string;
  updated_at: string;
}

// Market Data API Types
export interface MarketData {
  symbol: string;
  price: number;
  volume: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  open: number;
  close: number;
  timestamp: number;
}

export interface KlineData {
  openTime: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  closeTime: number;
  quoteAssetVolume: string;
  numberOfTrades: number;
  takerBuyBaseAssetVolume: string;
  takerBuyQuoteAssetVolume: string;
  ignore: string;
}

// Technical Analysis Types
export interface TechnicalIndicators {
  sma: number[];
  ema: number[];
  rsi: number[];
  macd: MACDData;
  bollingerBands: BollingerBandsData;
  volume: number[];
}

export interface MACDData {
  macd: number[];
  signal: number[];
  histogram: number[];
}

export interface BollingerBandsData {
  upper: number[];
  middle: number[];
  lower: number[];
}

export interface TradingSignal {
  action: 'BUY' | 'SELL' | 'HOLD';
  strength: 'WEAK' | 'MODERATE' | 'STRONG';
  confidence: number; // 0-100
  indicators: {
    rsi?: number;
    macd?: number;
    bollinger?: number;
  };
  timestamp: number;
}

// Risk Management Types
export interface RiskMetrics {
  portfolioValue: number;
  portfolioVolatility: number;
  sharpeRatio: number;
  maxDrawdown: number;
  var95: number; // Value at Risk 95%
  var99: number; // Value at Risk 99%
  beta: number;
  correlation: number;
}

export interface RiskRecommendation {
  action: 'INCREASE_POSITION' | 'DECREASE_POSITION' | 'HOLD' | 'EXIT';
  reason: string;
  confidence: number;
  suggestedAllocation: number;
}

// Order Management Types
export interface OrderRequest {
  symbol: string;
  side: 'BUY' | 'SELL';
  type: 'MARKET' | 'LIMIT' | 'STOP_LOSS' | 'TAKE_PROFIT';
  quantity: number;
  price?: number;
  stopPrice?: number;
  timeInForce?: 'GTC' | 'IOC' | 'FOK';
}

export interface OrderResponse {
  orderId: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  type: string;
  quantity: number;
  price: number;
  status: 'NEW' | 'FILLED' | 'CANCELLED' | 'REJECTED';
  filledQuantity: number;
  remainingQuantity: number;
  averagePrice: number;
  timestamp: number;
  exchange: string;
}

// Payment Gateway Types (Cashfree)
export interface CashfreeConfig {
  appId: string;
  secretKey: string;
  environment: 'sandbox' | 'production';
  baseUrl: string;
}

export interface PaymentRequest {
  orderId: string;
  orderAmount: number;
  orderCurrency: string;
  orderNote: string;
  customerDetails: {
    customerId: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
  };
  orderMeta: {
    returnUrl: string;
    notifyUrl: string;
  };
}

export interface PaymentResponse {
  status: 'SUCCESS' | 'FAILED';
  message: string;
  data: {
    paymentLink: string;
    orderId: string;
    orderAmount: number;
    orderCurrency: string;
  };
}

export interface PaymentWebhook {
  type: 'PAYMENT_SUCCESS_WEBHOOK' | 'PAYMENT_FAILED_WEBHOOK';
  data: {
    order: {
      orderId: string;
      orderAmount: number;
      orderCurrency: string;
      orderStatus: 'PAID' | 'FAILED';
      paymentTime: string;
      orderTime: string;
    };
    payment: {
      cfPaymentId: string;
      paymentStatus: 'SUCCESS' | 'FAILED';
      paymentAmount: number;
      paymentCurrency: string;
      paymentTime: string;
    };
  };
}

// Back4App Parse API Types
export interface ParseResponse<T = any> {
  success: boolean;
  result?: T;
  error?: string;
  timestamp: Date;
}

export interface ParseError {
  code: number;
  message: string;
}

// Health Check Types
export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: number;
  services: {
    database: ServiceStatus;
    redis: ServiceStatus;
    exchanges: ServiceStatus;
    payment: ServiceStatus;
  };
  metrics: {
    responseTime: number;
    errorRate: number;
    uptime: number;
  };
}

export interface ServiceStatus {
  status: 'up' | 'down' | 'degraded';
  responseTime: number;
  lastCheck: number;
  error?: string;
}

// Notification Types
export interface NotificationData {
  type: 'TRADE_EXECUTED' | 'TRADE_FAILED' | 'PRICE_ALERT' | 'SYSTEM_ALERT';
  title: string;
  message: string;
  data?: any;
  timestamp: number;
  read: boolean;
}

// Subscription Types
export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  duration: number; // in days
  features: string[];
  limits: {
    maxTradesPerDay: number;
    maxApiCallsPerMinute: number;
    supportedExchanges: string[];
  };
}

export interface UserSubscription {
  id: string;
  userId: string;
  planId: string;
  status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | 'PENDING';
  startDate: Date;
  endDate: Date;
  autoRenew: boolean;
  paymentMethod: string;
}

// Error Types
export interface APIError {
  code: string;
  message: string;
  details?: any;
  timestamp: number;
  requestId?: string;
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

// Utility Types
export type ExchangeName = 'binance' | 'wazirx' | 'coindcx';
export type TradingPair = string; // Format: "BTC/USDT"
export type Timeframe = '1m' | '5m' | '15m' | '1h' | '4h' | '1d' | '1w';
export type OrderSide = 'BUY' | 'SELL';
export type OrderType = 'MARKET' | 'LIMIT' | 'STOP_LOSS' | 'TAKE_PROFIT';
export type OrderStatus = 'NEW' | 'FILLED' | 'CANCELLED' | 'REJECTED' | 'PENDING';
