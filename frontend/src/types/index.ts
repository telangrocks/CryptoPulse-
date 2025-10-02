/**
 * Core type definitions for CryptoPulse frontend
 *
 * This module contains the main type definitions used throughout the frontend application.
 * It serves as the central hub for all type definitions and re-exports from other modules.
 *
 * @fileoverview Core frontend type definitions for production-ready crypto trading platform
 * @version 1.0.0
 * @author CryptoPulse Team
 */

// Re-export all external API types
export * from './external-apis';

// ============================================================================
// CORE ENUMS AND TYPES
// ============================================================================

/**
 * Risk level enumeration
 */
export type RiskLevel = 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE' | 'VERY_AGGRESSIVE';

/**
 * Chart type enumeration
 */
export type ChartType = 'CANDLESTICK' | 'LINE' | 'AREA' | 'OHLC' | 'VOLUME';

/**
 * Order side enumeration
 */
export type OrderSide = 'BUY' | 'SELL';

/**
 * Trade side enumeration (alias for OrderSide)
 */
export type TradeSide = OrderSide;

/**
 * Position side enumeration
 */
export type PositionSide = 'LONG' | 'SHORT';

/**
 * Order type enumeration
 */
export type OrderType = 'MARKET' | 'LIMIT' | 'STOP' | 'STOP_LIMIT';

/**
 * Order status enumeration
 */
export type OrderStatus = 'PENDING' | 'FILLED' | 'PARTIALLY_FILLED' | 'CANCELLED' | 'REJECTED';

// ============================================================================
// USER MANAGEMENT TYPES
// ============================================================================

/**
 * User account information
 *
 * @interface User
 * @property {string} id - Unique user identifier
 * @property {string} email - User email address
 * @property {string} [username] - Display username
 * @property {string} [sessionToken] - Current session token
 * @property {boolean} [disclaimerAccepted] - Whether user accepted disclaimer
 * @property {Date} [disclaimerAcceptedAt] - When disclaimer was accepted
 * @property {BillingStatus} [billingStatus] - Current billing status
 * @property {SubscriptionStatus} [subscriptionStatus] - Current subscription status
 * @property {UserProfile} [profile] - User profile information
 * @property {UserPreferences} [preferences] - User preferences and settings
 * @property {Date} [createdAt] - Account creation date
 * @property {Date} [lastLoginAt] - Last login timestamp
 * @property {boolean} [isEmailVerified] - Whether email is verified
 * @property {boolean} [is2FAEnabled] - Whether 2FA is enabled
 * @property {string[]} [permissions] - User permissions
 */
export interface User {
  /** Unique user identifier */
  id: string;
  /** User email address */
  email: string;
  /** Display username */
  username?: string;
  /** Current session token */
  sessionToken?: string;
  /** Whether user accepted disclaimer */
  disclaimerAccepted?: boolean;
  /** When disclaimer was accepted */
  disclaimerAcceptedAt?: Date;
  /** Current billing status */
  billingStatus?: BillingStatus;
  /** Current subscription status */
  subscriptionStatus?: SubscriptionStatus;
  /** User profile information */
  profile?: UserProfile;
  /** User preferences and settings */
  preferences?: UserPreferences;
  /** Account creation date */
  createdAt?: Date;
  /** Last login timestamp */
  lastLoginAt?: Date;
  /** Whether email is verified */
  isEmailVerified?: boolean;
  /** Whether 2FA is enabled */
  is2FAEnabled?: boolean;
  /** User permissions */
  permissions?: string[];
}

/**
 * User profile information
 *
 * @interface UserProfile
 * @property {string} [firstName] - User's first name
 * @property {string} [lastName] - User's last name
 * @property {string} [phone] - User's phone number
 * @property {string} [country] - User's country
 * @property {string} [timezone] - User's timezone
 * @property {string} [avatar] - User's avatar URL
 * @property {Date} [dateOfBirth] - User's date of birth
 * @property {string} [bio] - User's bio/description
 */
export interface UserProfile {
  /** User's first name */
  firstName?: string;
  /** User's last name */
  lastName?: string;
  /** User's phone number */
  phone?: string;
  /** User's country */
  country?: string;
  /** User's timezone */
  timezone?: string;
  /** User's avatar URL */
  avatar?: string;
  /** User's date of birth */
  dateOfBirth?: Date;
  /** User's bio/description */
  bio?: string;
}

/**
 * User preferences and settings
 *
 * @interface UserPreferences
 * @property {Theme} theme - UI theme preference
 * @property {string} language - Language preference
 * @property {NotificationSettings} notifications - Notification preferences
 * @property {TradingSettings} trading - Trading preferences
 * @property {DisplaySettings} display - Display preferences
 * @property {PrivacySettings} privacy - Privacy preferences
 */
export interface UserPreferences {
  /** UI theme preference */
  theme: Theme;
  /** Language preference */
  language: string;
  /** Notification preferences */
  notifications: NotificationSettings;
  /** Trading preferences */
  trading: TradingSettings;
  /** Display preferences */
  display: DisplaySettings;
  /** Privacy preferences */
  privacy: PrivacySettings;
}

/**
 * Billing status types
 */
export type BillingStatus = 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'UNPAID' | 'TRIAL' | 'PENDING';

/**
 * Subscription status types
 */
export type SubscriptionStatus = 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | 'PENDING' | 'SUSPENDED' | 'TRIAL';

/**
 * UI theme types
 */
export type Theme = 'light' | 'dark' | 'system' | 'auto';

/**
 * Notification settings configuration
 *
 * @interface NotificationSettings
 * @property {boolean} email - Email notifications enabled
 * @property {boolean} push - Push notifications enabled
 * @property {boolean} sms - SMS notifications enabled
 * @property {boolean} inApp - In-app notifications enabled
 * @property {NotificationTypes} types - Specific notification types
 */
export interface NotificationSettings {
  /** Email notifications enabled */
  email: boolean;
  /** Push notifications enabled */
  push: boolean;
  /** SMS notifications enabled */
  sms: boolean;
  /** In-app notifications enabled */
  inApp: boolean;
  /** Specific notification types */
  types: NotificationTypes;
}

/**
 * Trading settings configuration
 *
 * @interface TradingSettings
 * @property {boolean} autoConfirm - Auto-confirm trades
 * @property {RiskLevel} defaultRiskLevel - Default risk level
 * @property {number} maxPositions - Maximum open positions
 * @property {boolean} enableStopLoss - Enable stop loss by default
 * @property {boolean} enableTakeProfit - Enable take profit by default
 * @property {number} defaultStopLossPercent - Default stop loss percentage
 * @property {number} defaultTakeProfitPercent - Default take profit percentage
 */
export interface TradingSettings {
  /** Auto-confirm trades */
  autoConfirm: boolean;
  /** Default risk level */
  defaultRiskLevel: RiskLevel;
  /** Maximum open positions */
  maxPositions: number;
  /** Enable stop loss by default */
  enableStopLoss: boolean;
  /** Enable take profit by default */
  enableTakeProfit: boolean;
  /** Default stop loss percentage */
  defaultStopLossPercent: number;
  /** Default take profit percentage */
  defaultTakeProfitPercent: number;
}

/**
 * Display settings configuration
 *
 * @interface DisplaySettings
 * @property {boolean} showAdvancedCharts - Show advanced chart features
 * @property {boolean} showOrderBook - Show order book
 * @property {boolean} showTradeHistory - Show trade history
 * @property {boolean} showMarketDepth - Show market depth
 * @property {ChartType} defaultChartType - Default chart type
 * @property {string} defaultTimeframe - Default timeframe
 * @property {boolean} showGridLines - Show chart grid lines
 * @property {boolean} showVolume - Show volume indicators
 */
export interface DisplaySettings {
  /** Show advanced chart features */
  showAdvancedCharts: boolean;
  /** Show order book */
  showOrderBook: boolean;
  /** Show trade history */
  showTradeHistory: boolean;
  /** Show market depth */
  showMarketDepth: boolean;
  /** Default chart type */
  defaultChartType: ChartType;
  /** Default timeframe */
  defaultTimeframe: string;
  /** Show chart grid lines */
  showGridLines: boolean;
  /** Show volume indicators */
  showVolume: boolean;
}

/**
 * Privacy settings configuration
 *
 * @interface PrivacySettings
 * @property {boolean} shareAnalytics - Share analytics data
 * @property {boolean} shareCrashReports - Share crash reports
 * @property {boolean} allowPersonalization - Allow personalization
 * @property {boolean} showOnlineStatus - Show online status
 * @property {boolean} allowDataCollection - Allow data collection
 */
export interface PrivacySettings {
  /** Share analytics data */
  shareAnalytics: boolean;
  /** Share crash reports */
  shareCrashReports: boolean;
  /** Allow personalization */
  allowPersonalization: boolean;
  /** Show online status */
  showOnlineStatus: boolean;
  /** Allow data collection */
  allowDataCollection: boolean;
}

/**
 * Notification types configuration
 *
 * @interface NotificationTypes
 * @property {boolean} tradeExecuted - Trade execution notifications
 * @property {boolean} tradeFailed - Trade failure notifications
 * @property {boolean} priceAlerts - Price alert notifications
 * @property {boolean} systemAlerts - System alert notifications
 * @property {boolean} securityAlerts - Security alert notifications
 * @property {boolean} marketUpdates - Market update notifications
 */
export interface NotificationTypes {
  /** Trade execution notifications */
  tradeExecuted: boolean;
  /** Trade failure notifications */
  tradeFailed: boolean;
  /** Price alert notifications */
  priceAlerts: boolean;
  /** System alert notifications */
  systemAlerts: boolean;
  /** Security alert notifications */
  securityAlerts: boolean;
  /** Market update notifications */
  marketUpdates: boolean;
}

// ============================================================================
// TRADING TYPES
// ============================================================================

/**
 * Trading signal for automated trading
 *
 * @interface TradeSignal
 * @property {string} pair - Trading pair symbol
 * @property {OrderSide} action - Buy or sell action
 * @property {number} entry - Entry price
 * @property {number} stopLoss - Stop loss price
 * @property {number} takeProfit - Take profit price
 * @property {number} confidence - Signal confidence (0-100)
 * @property {string} timestamp - Signal timestamp
 * @property {RiskLevel} [riskLevel] - Risk level assessment
 * @property {string[]} [reasons] - Reasons for the signal
 * @property {string} [id] - Unique signal identifier
 * @property {string} [source] - Signal source (AI, manual, etc.)
 * @property {number} [expectedReturn] - Expected return percentage
 * @property {number} [maxDrawdown] - Maximum expected drawdown
 */
export interface TradeSignal {
  /** Trading pair symbol */
  pair: string;
  /** Buy or sell action */
  action: OrderSide;
  /** Entry price */
  entry: number;
  /** Stop loss price */
  stopLoss: number;
  /** Take profit price */
  takeProfit: number;
  /** Signal confidence (0-100) */
  confidence: number;
  /** Signal timestamp */
  timestamp: string;
  /** Risk level assessment */
  riskLevel?: RiskLevel;
  /** Reasons for the signal */
  reasons?: string[];
  /** Unique signal identifier */
  id?: string;
  /** Signal source (AI, manual, etc.) */
  source?: string;
  /** Expected return percentage */
  expectedReturn?: number;
  /** Maximum expected drawdown */
  maxDrawdown?: number;
}

export interface UserApiKeys {
  marketDataKey: string;
  marketDataSecret: string;
  tradeExecutionKey: string;
  tradeExecutionSecret: string;
  exchange: string;
}

export interface SelectedPair {
  symbol: string;
  category?: 'scalping' | 'day-trading';
  score?: number;
  metrics?: {
    liquidity: number;
    volume: number;
    volatility: number;
    price: number;
    change24h: number;
    volume24h: number;
  };
}

export interface PairAnalysis {
  symbol: string;
  score: number;
  metrics: {
    liquidity: number;
    volume: number;
    volatility: number;
    price: number;
    change24h: number;
    volume24h: number;
  };
  technicalIndicators: {
    rsi: number;
    macd: number;
    bollingerBands: {
      upper: number;
      middle: number;
      lower: number;
    };
  };
  sentiment: {
    bullish: number;
    bearish: number;
    neutral: number;
  };
}

// API Response Types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ValidationResult {
  success: boolean;
  data?: unknown;
  errors?: string[];
}

// Component Props Types
export interface AIAssistantProps {
  isOpen: boolean;
  onClose: () => void;
}

export interface EnhancedTradeConfirmationProps {
  signal: TradeSignal;
  userApiKeys: UserApiKeys;
  onConfirm: (confirmed: boolean, tradeData?: unknown) => void;
  onClose: () => void;
}

// Performance Types
export interface PerformanceMetrics {
  totalReturn: number;
  winRate: number;
  sharpeRatio: number;
  maxDrawdown: number;
  profitFactor: number;
  averageWin: number;
  averageLoss: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
}

export interface TradeHistory {
  id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  amount: number;
  price: number;
  timestamp: string;
  pnl?: number;
  status: 'open' | 'closed' | 'cancelled';
}

// ============================================================================
// EXCHANGE TYPES (Re-exported from external-apis.ts)
// ============================================================================

// Note: ExchangeConfig is now imported from external-apis.ts to avoid conflicts

export interface OrderBook {
  symbol: string;
  bids: [number, number][];
  asks: [number, number][];
  timestamp: number;
}

export interface Ticker {
  symbol: string;
  price: number;
  change24h: number;
  volume24h: number;
  high24h: number;
  low24h: number;
  timestamp: number;
}

// Risk Management Types
export interface RiskLimits {
  maxPositionSize: number;
  maxDailyLoss: number;
  maxDrawdown: number;
  maxLeverage: number;
  maxOpenPositions: number;
  stopLossPercentage: number;
  takeProfitPercentage: number;
}

export interface Position {
  symbol: string;
  side: 'LONG' | 'SHORT';
  size: number;
  entryPrice: number;
  currentPrice: number;
  stopLoss: number;
  takeProfit: number;
  leverage: number;
  unrealizedPnL: number;
  timestamp: number;
}

// Notification Types
export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
}

// ============================================================================
// SETTINGS TYPES (Consolidated)
// ============================================================================

/**
 * Legacy user settings interface (deprecated - use UserPreferences instead)
 *
 * @deprecated Use UserPreferences interface instead for better type safety
 * @interface UserSettings
 */
export interface UserSettings {
  /** UI theme preference */
  theme: Theme;
  /** Language preference */
  language: string;
  /** Notification settings */
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  /** Trading settings */
  trading: {
    autoConfirm: boolean;
    defaultRiskLevel: RiskLevel;
    maxPositions: number;
  };
  /** Display settings */
  display: {
    showAdvancedCharts: boolean;
    showOrderBook: boolean;
    showTradeHistory: boolean;
  };
}

// Chart Types
export interface ChartData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TechnicalIndicator {
  name: string;
  values: number[];
  color?: string;
  lineWidth?: number;
}

// WebSocket Types
export interface WebSocketMessage {
  type: string;
  data: unknown;
  timestamp: number;
}

export interface WebSocketConfig {
  url: string;
  protocols?: string | string[];
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
}

// Error Types
export interface AppError {
  code: string;
  message: string;
  details?: unknown;
  timestamp: number;
  stack?: string;
}

// State Types
export interface AppState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: AppError | null;
  settings: UserSettings;
  notifications: Notification[];
}

// Hook Types
export interface UseApiResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export interface UseWebSocketResult {
  isConnected: boolean;
  connectionState: number;
  connect: () => Promise<void>;
  disconnect: () => void;
  send: (data: unknown) => void;
  subscribe: (id: string, channel: string, callback: (data: unknown) => void) => void;
  unsubscribe: (id: string) => void;
}

// Form Types
export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'number' | 'select' | 'checkbox';
  required: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
}

export interface FormData {
  [key: string]: unknown;
}

// Utility Types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type Required<T, K extends keyof T> = T & { [P in K]-?: T[P] };

// Event Types
export interface CustomEvent<T = unknown> {
  type: string;
  payload: T;
  timestamp: number;
}

// ============================================================================
// VALIDATION SCHEMAS AND RUNTIME TYPE CHECKING
// ============================================================================

/**
 * Runtime validation schemas for critical types
 * These can be used with libraries like Zod or Yup for runtime validation
 */
export const VALIDATION_SCHEMAS = {
  /**
   * User validation schema
   */
  User: {
    id: { type: 'string', required: true, minLength: 1 },
    email: { type: 'string', required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
    username: { type: 'string', required: false, minLength: 3, maxLength: 50 },
    sessionToken: { type: 'string', required: false, minLength: 10 },
    disclaimerAccepted: { type: 'boolean', required: false },
    disclaimerAcceptedAt: { type: 'date', required: false },
    billingStatus: { type: 'string', required: false, enum: ['ACTIVE', 'PAST_DUE', 'CANCELED', 'UNPAID', 'TRIAL', 'PENDING'] },
    subscriptionStatus: { type: 'string', required: false, enum: ['ACTIVE', 'EXPIRED', 'CANCELLED', 'PENDING', 'SUSPENDED', 'TRIAL'] },
  },

  /**
   * TradeSignal validation schema
   */
  TradeSignal: {
    pair: { type: 'string', required: true, minLength: 3, maxLength: 20 },
    action: { type: 'string', required: true, enum: ['BUY', 'SELL'] },
    entry: { type: 'number', required: true, min: 0 },
    stopLoss: { type: 'number', required: true, min: 0 },
    takeProfit: { type: 'number', required: true, min: 0 },
    confidence: { type: 'number', required: true, min: 0, max: 100 },
    timestamp: { type: 'string', required: true },
    riskLevel: { type: 'string', required: false, enum: ['CONSERVATIVE', 'MODERATE', 'AGGRESSIVE', 'VERY_AGGRESSIVE'] },
  },

  /**
   * API Response validation schema
   */
  ApiResponse: {
    success: { type: 'boolean', required: true },
    data: { type: 'any', required: false },
    error: { type: 'string', required: false },
    message: { type: 'string', required: false },
  },
} as const;

/**
 * Type guard functions for runtime type checking
 */
export const TypeGuards = {
  /**
   * Check if value is a valid User object
   */
  isUser: (value: unknown): value is User => {
    return (
      typeof value === 'object' &&
      value !== null &&
      typeof (value as User).id === 'string' &&
      typeof (value as User).email === 'string'
    );
  },

  /**
   * Check if value is a valid TradeSignal object
   */
  isTradeSignal: (value: unknown): value is TradeSignal => {
    return (
      typeof value === 'object' &&
      value !== null &&
      typeof (value as TradeSignal).pair === 'string' &&
      typeof (value as TradeSignal).action === 'string' &&
      ['BUY', 'SELL'].includes((value as TradeSignal).action) &&
      typeof (value as TradeSignal).entry === 'number' &&
      typeof (value as TradeSignal).stopLoss === 'number' &&
      typeof (value as TradeSignal).takeProfit === 'number' &&
      typeof (value as TradeSignal).confidence === 'number' &&
      typeof (value as TradeSignal).timestamp === 'string'
    );
  },

  /**
   * Check if value is a valid API Response
   */
  isApiResponse: (value: unknown): value is ApiResponse => {
    return (
      typeof value === 'object' &&
      value !== null &&
      typeof (value as ApiResponse).success === 'boolean'
    );
  },

  /**
   * Check if value is a valid OrderSide
   */
  isOrderSide: (value: unknown): value is OrderSide => {
    return typeof value === 'string' && ['BUY', 'SELL'].includes(value);
  },

  /**
   * Check if value is a valid RiskLevel
   */
  isRiskLevel: (value: unknown): value is RiskLevel => {
    return typeof value === 'string' && ['CONSERVATIVE', 'MODERATE', 'AGGRESSIVE', 'VERY_AGGRESSIVE'].includes(value);
  },
};

// ============================================================================
// CONSTANTS AND ENUMS
// ============================================================================

/**
 * Exchange name constants
 */
export const EXCHANGE_NAMES = {
  BINANCE: 'binance',
  WAZIRX: 'wazirx',
  COINDCX: 'coindcx',
  COINBASE: 'coinbase',
  KRAKEN: 'kraken',
} as const;

/**
 * Trade side constants
 */
export const TRADE_SIDES = {
  BUY: 'BUY',
  SELL: 'SELL',
} as const;

/**
 * Risk level constants
 */
export const RISK_LEVELS = {
  CONSERVATIVE: 'CONSERVATIVE',
  MODERATE: 'MODERATE',
  AGGRESSIVE: 'AGGRESSIVE',
  VERY_AGGRESSIVE: 'VERY_AGGRESSIVE',
} as const;

/**
 * Notification type constants
 */
export const NOTIFICATION_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info',
} as const;

/**
 * Theme constants
 */
export const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
  SYSTEM: 'system',
  AUTO: 'auto',
} as const;

/**
 * Chart type constants
 */
export const CHART_TYPES = {
  CANDLESTICK: 'CANDLESTICK',
  LINE: 'LINE',
  AREA: 'AREA',
  BAR: 'BAR',
  HEIKIN_ASHI: 'HEIKIN_ASHI',
} as const;

/**
 * Order status constants (aligned with external-apis.ts)
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