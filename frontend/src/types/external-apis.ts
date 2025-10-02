/**
 * TypeScript type definitions for external APIs used in CryptoPulse
 *
 * This module contains comprehensive type definitions for all external API integrations
 * including exchange APIs, payment gateways, market data providers, and third-party services.
 *
 * @fileoverview External API type definitions for production-ready crypto trading platform
 * @version 1.0.0
 * @author CryptoPulse Team
 */

// ============================================================================
// EXCHANGE API TYPES
// ============================================================================

/**
 * Exchange API credentials for authentication
 *
 * @interface ExchangeCredentials
 * @property {string} apiKey - The API key for authentication
 * @property {string} secret - The secret key for HMAC signing
 * @property {string} [passphrase] - Additional passphrase for exchanges like Coinbase
 * @property {string} [subAccountId] - Sub-account ID for multi-account setups
 * @property {boolean} [isTestnet] - Whether using testnet environment
 */
export interface ExchangeCredentials {
  /** The API key for authentication */
  apiKey: string;
  /** The secret key for HMAC signing */
  secret: string;
  /** Additional passphrase for exchanges like Coinbase */
  passphrase?: string;
  /** Sub-account ID for multi-account setups */
  subAccountId?: string;
  /** Whether using testnet environment */
  isTestnet?: boolean;
}

/**
 * Exchange configuration for API integration
 *
 * @interface ExchangeConfig
 * @property {string} name - Exchange name identifier
 * @property {string} baseUrl - Base URL for production API
 * @property {string} [sandboxUrl] - Sandbox URL for testing
 * @property {ExchangeEndpoints} endpoints - API endpoint definitions
 * @property {AuthType} authType - Authentication method used
 * @property {RateLimit} rateLimit - Rate limiting configuration
 * @property {SecurityConfig} security - Security and compliance settings
 * @property {string[]} supportedPairs - List of supported trading pairs
 * @property {ExchangeLimits} limits - Trading and API limits
 */
export interface ExchangeConfig {
  /** Exchange name identifier */
  name: string;
  /** Base URL for production API */
  baseUrl: string;
  /** Sandbox URL for testing */
  sandboxUrl?: string;
  /** API endpoint definitions */
  endpoints: ExchangeEndpoints;
  /** Authentication method used */
  authType: AuthType;
  /** Rate limiting configuration */
  rateLimit: RateLimit;
  /** Security and compliance settings */
  security: SecurityConfig;
  /** List of supported trading pairs */
  supportedPairs: string[];
  /** Trading and API limits */
  limits: ExchangeLimits;
}

/**
 * API endpoint definitions for exchange integration
 *
 * @interface ExchangeEndpoints
 * @property {string} account - Account information endpoint
 * @property {string} order - Order management endpoint
 * @property {string} ticker - Market data ticker endpoint
 * @property {string} exchangeInfo - Exchange information endpoint
 * @property {string} [websocket] - WebSocket connection endpoint
 * @property {string} [history] - Historical data endpoint
 * @property {string} [balance] - Balance information endpoint
 */
export interface ExchangeEndpoints {
  /** Account information endpoint */
  account: string;
  /** Order management endpoint */
  order: string;
  /** Market data ticker endpoint */
  ticker: string;
  /** Exchange information endpoint */
  exchangeInfo: string;
  /** WebSocket connection endpoint */
  websocket?: string;
  /** Historical data endpoint */
  history?: string;
  /** Balance information endpoint */
  balance?: string;
}

/**
 * Rate limiting configuration
 *
 * @interface RateLimit
 * @property {number} requests - Maximum requests allowed
 * @property {number} window - Time window in milliseconds
 * @property {number} [burst] - Burst limit for short-term spikes
 * @property {number} [retryAfter] - Retry delay in milliseconds
 */
export interface RateLimit {
  /** Maximum requests allowed */
  requests: number;
  /** Time window in milliseconds */
  window: number;
  /** Burst limit for short-term spikes */
  burst?: number;
  /** Retry delay in milliseconds */
  retryAfter?: number;
}

/**
 * Security configuration for exchange integration
 *
 * @interface SecurityConfig
 * @property {boolean} requireIPWhitelist - Whether IP whitelisting is required
 * @property {string[]} allowedIPs - List of allowed IP addresses
 * @property {boolean} require2FA - Whether 2FA is required for trading
 * @property {string[]} requiredPermissions - Required API permissions
 * @property {boolean} enableAuditLog - Whether to enable audit logging
 */
export interface SecurityConfig {
  /** Whether IP whitelisting is required */
  requireIPWhitelist: boolean;
  /** List of allowed IP addresses */
  allowedIPs: string[];
  /** Whether 2FA is required for trading */
  require2FA: boolean;
  /** Required API permissions */
  requiredPermissions: string[];
  /** Whether to enable audit logging */
  enableAuditLog: boolean;
}

/**
 * Exchange trading and API limits
 *
 * @interface ExchangeLimits
 * @property {number} minOrderSize - Minimum order size
 * @property {number} maxOrderSize - Maximum order size
 * @property {number} minPrice - Minimum price increment
 * @property {number} maxPrice - Maximum price
 * @property {number} maxDailyVolume - Maximum daily trading volume
 * @property {number} maxOpenOrders - Maximum open orders
 */
export interface ExchangeLimits {
  /** Minimum order size */
  minOrderSize: number;
  /** Maximum order size */
  maxOrderSize: number;
  /** Minimum price increment */
  minPrice: number;
  /** Maximum price */
  maxPrice: number;
  /** Maximum daily trading volume */
  maxDailyVolume: number;
  /** Maximum open orders */
  maxOpenOrders: number;
}

/**
 * Authentication types for exchange APIs
 */
export type AuthType = 'HMAC-SHA256' | 'HMAC-SHA512' | 'API-KEY' | 'OAUTH2' | 'JWT';

// ============================================================================
// BINANCE API TYPES
// ============================================================================

/**
 * Binance account information response
 *
 * @interface BinanceAccountInfo
 * @property {number} makerCommission - Maker commission rate
 * @property {number} takerCommission - Taker commission rate
 * @property {number} buyerCommission - Buyer commission rate
 * @property {number} sellerCommission - Seller commission rate
 * @property {boolean} canTrade - Whether account can trade
 * @property {boolean} canWithdraw - Whether account can withdraw
 * @property {boolean} canDeposit - Whether account can deposit
 * @property {number} updateTime - Last update timestamp
 * @property {string} accountType - Type of account (SPOT, MARGIN, FUTURES)
 * @property {BinanceBalance[]} balances - Account balances
 * @property {string[]} permissions - Account permissions
 * @property {string} [accountId] - Account ID
 * @property {boolean} [isSubAccount] - Whether this is a sub-account
 */
export interface BinanceAccountInfo {
  /** Maker commission rate */
  makerCommission: number;
  /** Taker commission rate */
  takerCommission: number;
  /** Buyer commission rate */
  buyerCommission: number;
  /** Seller commission rate */
  sellerCommission: number;
  /** Whether account can trade */
  canTrade: boolean;
  /** Whether account can withdraw */
  canWithdraw: boolean;
  /** Whether account can deposit */
  canDeposit: boolean;
  /** Last update timestamp */
  updateTime: number;
  /** Type of account (SPOT, MARGIN, FUTURES) */
  accountType: string;
  /** Account balances */
  balances: BinanceBalance[];
  /** Account permissions */
  permissions: string[];
  /** Account ID */
  accountId?: string;
  /** Whether this is a sub-account */
  isSubAccount?: boolean;
}

/**
 * Binance account balance information
 *
 * @interface BinanceBalance
 * @property {string} asset - Asset symbol (e.g., BTC, ETH)
 * @property {string} free - Available balance
 * @property {string} locked - Locked balance
 * @property {string} [frozen] - Frozen balance
 * @property {string} [borrowed] - Borrowed amount (for margin)
 * @property {string} [interest] - Interest amount (for margin)
 * @property {string} [netAsset] - Net asset value
 */
export interface BinanceBalance {
  /** Asset symbol (e.g., BTC, ETH) */
  asset: string;
  /** Available balance */
  free: string;
  /** Locked balance */
  locked: string;
  /** Frozen balance */
  frozen?: string;
  /** Borrowed amount (for margin) */
  borrowed?: string;
  /** Interest amount (for margin) */
  interest?: string;
  /** Net asset value */
  netAsset?: string;
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
  status: 'NEW' | 'PARTIALLY-FILLED' | 'FILLED' | 'CANCELED' | 'PENDING-CANCEL' | 'REJECTED' | 'EXPIRED';
  timeInForce: 'GTC' | 'IOC' | 'FOK';
  type: 'LIMIT' | 'MARKET' | 'STOP-LOSS' | 'STOP_LOSS-LIMIT' | 'TAKE-PROFIT' | 'TAKE_PROFIT-LIMIT' | 'LIMIT-MAKER';
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

// WazirX API Types;
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
  order: 'market' | 'limit';
  status: 'open' | 'filled' | 'cancelled';
  quantity: string;
  price: string;
  filled: string;
  remaining: string;
  avg: string;
  created: string;
  updated: string;
}

// CoinDCX API Types;
export interface CoinDCXAccountInfo {
  balances: CoinDCXBalance[];
}

export interface CoinDCXBalance {
  currency: string;
  balance: string;
  locked: string;
  available: string;
}

export interface CoinDCXOrder {
  id: string;
  market: string;
  side: 'buy' | 'sell';
  order: 'market-order' | 'limit-order';
  status: 'open' | 'filled' | 'cancelled';
  quantity: string;
  price: string;
  filled: string;
  remaining: string;
  avg: string;
  created: string;
  updated: string;
}

// Market Data API Types;
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

// Technical Analysis Types;
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

// Risk Management Types;
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
  action: 'INCREASE-POSITION' | 'DECREASE-POSITION' | 'HOLD' | 'EXIT';
  reason: string;
  confidence: number;
  suggestedAllocation: number;
}

// Order Management Types;
export interface OrderRequest {
  symbol: string;
  side: 'BUY' | 'SELL';
  type: 'MARKET' | 'LIMIT' | 'STOP-LOSS' | 'TAKE-PROFIT';
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

// Payment Gateway Types (Cashfree);
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
  type: 'PAYMENT_SUCCESS-WEBHOOK' | 'PAYMENT_FAILED-WEBHOOK';
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

// Health Check Types;
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

// Notification Types;
export interface NotificationData {
  type: 'TRADE-EXECUTED' | 'TRADE-FAILED' | 'PRICE-ALERT' | 'SYSTEM-ALERT';
  title: string;
  message: string;
  data?: unknown;
  timestamp: number;
  read: boolean;
}

// Subscription Types;
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

// ============================================================================
// ERROR HANDLING TYPES
// ============================================================================

/**
 * Standardized API error response
 *
 * @interface APIError
 * @property {string} code - Error code identifier
 * @property {string} message - Human-readable error message
 * @property {unknown} [details] - Additional error details
 * @property {number} timestamp - Error timestamp
 * @property {string} [requestId] - Request ID for tracking
 * @property {ErrorSeverity} [severity] - Error severity level
 * @property {string} [category] - Error category
 * @property {boolean} [retryable] - Whether the error is retryable
 */
export interface APIError {
  /** Error code identifier */
  code: string;
  /** Human-readable error message */
  message: string;
  /** Additional error details */
  details?: unknown;
  /** Error timestamp */
  timestamp: number;
  /** Request ID for tracking */
  requestId?: string;
  /** Error severity level */
  severity?: ErrorSeverity;
  /** Error category */
  category?: string;
  /** Whether the error is retryable */
  retryable?: boolean;
}

/**
 * Validation error details
 *
 * @interface ValidationError
 * @property {string} field - Field name that failed validation
 * @property {string} message - Validation error message
 * @property {unknown} [value] - The value that failed validation
 * @property {string} [rule] - The validation rule that failed
 * @property {string[]} [suggestions] - Suggested corrections
 */
export interface ValidationError {
  /** Field name that failed validation */
  field: string;
  /** Validation error message */
  message: string;
  /** The value that failed validation */
  value?: unknown;
  /** The validation rule that failed */
  rule?: string;
  /** Suggested corrections */
  suggestions?: string[];
}

/**
 * Error severity levels
 */
export type ErrorSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

/**
 * Error categories for better classification
 */
export type ErrorCategory =
  | 'AUTHENTICATION'
  | 'AUTHORIZATION'
  | 'VALIDATION'
  | 'RATE_LIMIT'
  | 'NETWORK'
  | 'EXCHANGE'
  | 'PAYMENT'
  | 'SYSTEM'
  | 'UNKNOWN';

/**
 * Comprehensive error response with context
 *
 * @interface ErrorResponse
 * @property {APIError} error - The main error
 * @property {ValidationError[]} [validationErrors] - Validation errors if any
 * @property {string} [traceId] - Distributed tracing ID
 * @property {string} [correlationId] - Request correlation ID
 * @property {ErrorContext} [context] - Additional error context
 */
export interface ErrorResponse {
  /** The main error */
  error: APIError;
  /** Validation errors if any */
  validationErrors?: ValidationError[];
  /** Distributed tracing ID */
  traceId?: string;
  /** Request correlation ID */
  correlationId?: string;
  /** Additional error context */
  context?: ErrorContext;
}

/**
 * Additional error context information
 *
 * @interface ErrorContext
 * @property {string} [userId] - User ID if authenticated
 * @property {string} [sessionId] - Session ID
 * @property {string} [userAgent] - Client user agent
 * @property {string} [ipAddress] - Client IP address
 * @property {string} [endpoint] - API endpoint that failed
 * @property {string} [method] - HTTP method used
 */
export interface ErrorContext {
  /** User ID if authenticated */
  userId?: string;
  /** Session ID */
  sessionId?: string;
  /** Client user agent */
  userAgent?: string;
  /** Client IP address */
  ipAddress?: string;
  /** API endpoint that failed */
  endpoint?: string;
  /** HTTP method used */
  method?: string;
}

// ============================================================================
// UTILITY TYPES AND CONSTANTS
// ============================================================================

/**
 * Supported exchange names
 */
export type ExchangeName = 'binance' | 'wazirx' | 'coindcx' | 'coinbase' | 'kraken';

/**
 * Trading pair format (e.g., "BTC/USDT", "ETH/BTC")
 */
export type TradingPair = string;

/**
 * Supported timeframes for market data
 */
export type Timeframe = '1m' | '3m' | '5m' | '15m' | '30m' | '1h' | '2h' | '4h' | '6h' | '8h' | '12h' | '1d' | '3d' | '1w' | '1M';

/**
 * Order sides
 */
export type OrderSide = 'BUY' | 'SELL';

/**
 * Order types
 */
export type OrderType = 'MARKET' | 'LIMIT' | 'STOP' | 'STOP_LIMIT' | 'TAKE_PROFIT' | 'TAKE_PROFIT_LIMIT' | 'LIMIT_MAKER';

/**
 * Comprehensive order status types
 */
export type OrderStatus =
  | 'NEW'           // Order has been accepted by the exchange
  | 'PENDING_NEW'   // Order is being processed
  | 'PARTIALLY_FILLED' // Order has been partially filled
  | 'FILLED'        // Order has been completely filled
  | 'CANCELED'      // Order has been canceled
  | 'PENDING_CANCEL' // Order cancellation is being processed
  | 'REJECTED'      // Order has been rejected
  | 'EXPIRED'       // Order has expired
  | 'REPLACED'      // Order has been replaced
  | 'PENDING_REPLACE' // Order replacement is being processed
  | 'CALCULATED'    // Order has been calculated
  | 'SUSPENDED'     // Order has been suspended
  | 'DONE_FOR_DAY'  // Order is done for the day
  | 'STOPPED'       // Order has been stopped
  | 'STOPPED_OUT'   // Order has been stopped out
  | 'UNKNOWN';      // Unknown status

/**
 * Time in force options
 */
export type TimeInForce = 'GTC' | 'IOC' | 'FOK' | 'GTX';

/**
 * Order execution types
 */
export type ExecutionType = 'NEW' | 'CANCELED' | 'REPLACED' | 'REJECTED' | 'TRADE' | 'EXPIRED';

/**
 * Market data subscription types
 */
export type SubscriptionType = 'ticker' | 'orderbook' | 'trades' | 'kline' | 'depth';

/**
 * WebSocket message types
 */
export type WebSocketMessageType =
  | 'ping'
  | 'pong'
  | 'subscribe'
  | 'unsubscribe'
  | 'data'
  | 'error'
  | 'connection'
  | 'disconnection';

/**
 * API response status
 */
export type APIResponseStatus = 'success' | 'error' | 'warning' | 'info';

/**
 * Trading session types
 */
export type TradingSession = 'PRE_MARKET' | 'REGULAR' | 'AFTER_HOURS' | 'CLOSED';

/**
 * Risk levels for trading
 */
export type RiskLevel = 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE' | 'VERY_AGGRESSIVE';

/**
 * Account types
 */
export type AccountType = 'SPOT' | 'MARGIN' | 'FUTURES' | 'OPTIONS' | 'OTC';

/**
 * Order book side
 */
export type OrderBookSide = 'BID' | 'ASK';

/**
 * Chart types
 */
export type ChartType = 'CANDLESTICK' | 'LINE' | 'AREA' | 'BAR' | 'HEIKIN_ASHI';

/**
 * Technical indicator types
 */
export type TechnicalIndicatorType =
  | 'SMA' | 'EMA' | 'WMA' | 'DEMA' | 'TEMA' | 'TRIMA' | 'KAMA' | 'MAMA' | 'VWMA' | 'T3'
  | 'RSI' | 'STOCH' | 'STOCHF' | 'STOCHRSI' | 'WILLR' | 'ADX' | 'ADXR' | 'APO' | 'PPO' | 'MOM' | 'BOP'
  | 'CCI' | 'CMO' | 'ROC' | 'ROCP' | 'ROCR' | 'ROCR100' | 'TRIX' | 'ULTOSC' | 'DX' | 'MINUS_DI' | 'PLUS_DI'
  | 'MINUS_DM' | 'PLUS_DM' | 'BBANDS' | 'MIDPOINT' | 'MIDPRICE' | 'SAR' | 'TRANGE' | 'ATR' | 'NATR' | 'TRANGE'
  | 'AD' | 'ADOSC' | 'OBV' | 'HT_DCPERIOD' | 'HT_DCPHASE' | 'HT_PHASOR' | 'HT_SINE' | 'HT_TRENDMODE'
  | 'MACD' | 'MACDEXT' | 'MACDFIX' | 'MOM' | 'PPO' | 'APO' | 'BOP' | 'CCI' | 'CMO' | 'ROC' | 'ROCP' | 'ROCR'
  | 'ROCR100' | 'TRIX' | 'ULTOSC' | 'DX' | 'MINUS_DI' | 'PLUS_DI' | 'MINUS_DM' | 'PLUS_DM' | 'BBANDS'
  | 'MIDPOINT' | 'MIDPRICE' | 'SAR' | 'TRANGE' | 'ATR' | 'NATR' | 'TRANGE' | 'AD' | 'ADOSC' | 'OBV'
  | 'HT_DCPERIOD' | 'HT_DCPHASE' | 'HT_PHASOR' | 'HT_SINE' | 'HT_TRENDMODE';

/**
 * Exchange-specific constants
 */
export const EXCHANGE_CONSTANTS = {
  BINANCE: {
    name: 'binance',
    baseUrl: 'https://api.binance.com',
    sandboxUrl: 'https://testnet.binance.vision',
    supportedPairs: ['BTCUSDT', 'ETHUSDT', 'BNBUSDT'],
    maxConnections: 5,
    rateLimit: { requests: 1200, window: 60000 },
  },
  WAZIRX: {
    name: 'wazirx',
    baseUrl: 'https://api.wazirx.com',
    sandboxUrl: 'https://sandbox.wazirx.com',
    supportedPairs: ['btcinr', 'ethinr', 'wrxinr'],
    maxConnections: 3,
    rateLimit: { requests: 100, window: 60000 },
  },
  COINDCX: {
    name: 'coindcx',
    baseUrl: 'https://api.coindcx.com',
    sandboxUrl: 'https://api-sandbox.coindcx.com',
    supportedPairs: ['BTCINR', 'ETHINR', 'WRXINR'],
    maxConnections: 3,
    rateLimit: { requests: 100, window: 60000 },
  },
} as const;

/**
 * Order status constants for easy reference
 */
export const ORDER_STATUS = {
  NEW: 'NEW',
  PENDING_NEW: 'PENDING_NEW',
  PARTIALLY_FILLED: 'PARTIALLY_FILLED',
  FILLED: 'FILLED',
  CANCELED: 'CANCELED',
  PENDING_CANCEL: 'PENDING_CANCEL',
  REJECTED: 'REJECTED',
  EXPIRED: 'EXPIRED',
  REPLACED: 'REPLACED',
  PENDING_REPLACE: 'PENDING_REPLACE',
  CALCULATED: 'CALCULATED',
  SUSPENDED: 'SUSPENDED',
  DONE_FOR_DAY: 'DONE_FOR_DAY',
  STOPPED: 'STOPPED',
  STOPPED_OUT: 'STOPPED_OUT',
  UNKNOWN: 'UNKNOWN',
} as const;

/**
 * Error codes for different scenarios
 */
export const ERROR_CODES = {
  // Authentication errors
  INVALID_API_KEY: 'INVALID_API_KEY',
  INVALID_SIGNATURE: 'INVALID_SIGNATURE',
  API_KEY_EXPIRED: 'API_KEY_EXPIRED',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',

  // Rate limiting errors
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',

  // Validation errors
  INVALID_SYMBOL: 'INVALID_SYMBOL',
  INVALID_ORDER_TYPE: 'INVALID_ORDER_TYPE',
  INVALID_QUANTITY: 'INVALID_QUANTITY',
  INVALID_PRICE: 'INVALID_PRICE',
  INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',

  // Exchange errors
  EXCHANGE_MAINTENANCE: 'EXCHANGE_MAINTENANCE',
  EXCHANGE_ERROR: 'EXCHANGE_ERROR',
  ORDER_NOT_FOUND: 'ORDER_NOT_FOUND',
  ORDER_ALREADY_EXISTS: 'ORDER_ALREADY_EXISTS',

  // Network errors
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',
  CONNECTION_LOST: 'CONNECTION_LOST',

  // System errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;
