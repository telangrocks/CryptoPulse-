/**
 * @fileoverview Comprehensive type definitions for the Redux store
 * @version 1.0.0
 * @author CryptoPulse Team
 */

// ============================================================================
// CORE API TYPES
// ============================================================================

/**
 * Standard API response wrapper
 */
export interface ApiResponse<T = any> {
  data: T;
  success: boolean;
  error?: string;
  message?: string;
  timestamp: number;
  requestId?: string;
}

/**
 * Paginated API response
 */
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * Error response structure
 */
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
  timestamp: number;
  requestId?: string;
}

// ============================================================================
// AUTHENTICATION TYPES
// ============================================================================

/**
 * User subscription information
 */
export interface UserSubscription {
  id: string;
  status: 'trial' | 'active' | 'expired' | 'cancelled';
  trialActive: boolean;
  trialEnd?: string;
  amount?: number;
  daysRemaining?: number;
  planType: 'basic' | 'premium' | 'enterprise';
  features: string[];
  billingCycle: 'monthly' | 'yearly';
  nextBillingDate?: string;
}

/**
 * User profile information
 */
export interface User {
  id: string;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  isEmailVerified: boolean;
  isTwoFactorEnabled: boolean;
  subscription?: UserSubscription;
  preferences: UserPreferences;
}

/**
 * User preferences
 */
export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  timezone: string;
  notifications: NotificationPreferences;
  trading: TradingPreferences;
}

/**
 * Notification preferences
 */
export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  sms: boolean;
  tradeAlerts: boolean;
  priceAlerts: boolean;
  systemUpdates: boolean;
}

/**
 * Trading preferences
 */
export interface TradingPreferences {
  defaultRiskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  defaultStopLoss: number;
  defaultTakeProfit: number;
  maxPositions: number;
  autoCloseOnLoss: boolean;
  autoCloseOnProfit: boolean;
}

/**
 * Authentication state
 */
export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: ApiError | null;
  sessionExpiry: number | null;
  refreshToken: string | null;
  lastActivity: number;
  loginAttempts: number;
  isLocked: boolean;
  lockoutUntil?: number;
}

// ============================================================================
// TRADING TYPES
// ============================================================================

/**
 * Trade order types
 */
export type OrderType = 'MARKET' | 'LIMIT' | 'STOP_LOSS' | 'STOP_LOSS_LIMIT' | 'TAKE_PROFIT' | 'TAKE_PROFIT_LIMIT';

/**
 * Trade side
 */
export type TradeSide = 'BUY' | 'SELL';

/**
 * Trade status
 */
export type TradeStatus = 'PENDING' | 'FILLED' | 'PARTIALLY_FILLED' | 'CANCELLED' | 'REJECTED' | 'EXPIRED';

/**
 * Risk levels
 */
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';

/**
 * Individual trade record
 */
export interface Trade {
  id: string;
  symbol: string;
  side: TradeSide;
  type: OrderType;
  quantity: number;
  price: number;
  stopPrice?: number;
  status: TradeStatus;
  timestamp: string;
  filledAt?: string;
  cancelledAt?: string;
  profit?: number;
  profitPercent?: number;
  fees: number;
  feesAsset: string;
  clientOrderId?: string;
  exchangeOrderId?: string;
  timeInForce: 'GTC' | 'IOC' | 'FOK';
  icebergQuantity?: number;
  strategy?: string;
  tags?: string[];
}

/**
 * Position information
 */
export interface Position {
  id: string;
  symbol: string;
  side: 'LONG' | 'SHORT';
  quantity: number;
  entryPrice: number;
  currentPrice: number;
  unrealizedPnl: number;
  unrealizedPnlPercent: number;
  realizedPnl: number;
  margin: number;
  leverage: number;
  marginRatio: number;
  liquidationPrice: number;
  markPrice: number;
  notional: number;
  createdAt: string;
  updatedAt: string;
  strategy?: string;
  tags?: string[];
}

/**
 * Trading state
 */
export interface TradingState {
  trades: Trade[];
  positions: Position[];
  activeOrders: Trade[];
  isLoading: boolean;
  error: ApiError | null;
  selectedSymbol: string;
  tradingEnabled: boolean;
  riskLevel: RiskLevel;
  maxPositions: number;
  stopLoss: number;
  takeProfit: number;
  dailyPnL: number;
  totalPnL: number;
  winRate: number;
  totalTrades: number;
  lastTradeAt?: string;
  isMarketOpen: boolean;
  tradingSession: {
    startTime: string;
    endTime: string;
    timezone: string;
  };
}

// ============================================================================
// MARKET DATA TYPES
// ============================================================================

/**
 * Market data for a trading pair
 */
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
  bid: number;
  ask: number;
  bidSize: number;
  askSize: number;
  lastTradeId: string;
  trades24h: number;
  volume24h: number;
  priceChange24h: number;
  priceChangePercent24h: number;
  weightedAvgPrice: number;
  prevClosePrice: number;
  lastQty: number;
  count: number;
}

/**
 * Market data state
 */
export interface MarketDataState {
  data: MarketData[];
  selectedSymbol: string;
  lastUpdate: number;
  loading: boolean;
  error: ApiError | null;
  subscriptions: string[];
  isConnected: boolean;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  reconnectAttempts: number;
  maxReconnectAttempts: number;
}

// ============================================================================
// BOT TYPES
// ============================================================================

/**
 * Bot strategy types
 */
export type BotStrategy = 'DCA' | 'GRID' | 'MOMENTUM' | 'MEAN_REVERSION' | 'ARBITRAGE' | 'SCALPING';

/**
 * Bot configuration
 */
export interface BotConfig {
  id: string;
  name: string;
  description?: string;
  strategy: BotStrategy;
  symbol: string;
  isActive: boolean;
  riskLevel: RiskLevel;
  maxPositions: number;
  stopLoss: number;
  takeProfit: number;
  createdAt: number;
  updatedAt: number;
  createdBy: string;
  settings: BotSettings;
  performance: BotPerformance;
  status: 'idle' | 'running' | 'paused' | 'stopped' | 'error';
  lastRunAt?: number;
  nextRunAt?: number;
  tags?: string[];
}

/**
 * Bot settings
 */
export interface BotSettings {
  entryConditions: EntryCondition[];
  exitConditions: ExitCondition[];
  riskManagement: RiskManagementSettings;
  notifications: BotNotificationSettings;
  schedule?: BotSchedule;
}

/**
 * Entry conditions for bot trading
 */
export interface EntryCondition {
  id: string;
  type: 'price' | 'volume' | 'indicator' | 'time';
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  value: number | string;
  enabled: boolean;
}

/**
 * Exit conditions for bot trading
 */
export interface ExitCondition {
  id: string;
  type: 'price' | 'volume' | 'indicator' | 'time' | 'profit' | 'loss';
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  value: number | string;
  enabled: boolean;
}

/**
 * Risk management settings
 */
export interface RiskManagementSettings {
  maxDailyLoss: number;
  maxPositionSize: number;
  maxDrawdown: number;
  positionSizing: 'fixed' | 'percentage' | 'kelly';
  stopLossType: 'percentage' | 'atr' | 'support_resistance';
  takeProfitType: 'percentage' | 'atr' | 'support_resistance';
}

/**
 * Bot notification settings
 */
export interface BotNotificationSettings {
  onTrade: boolean;
  onError: boolean;
  onStatusChange: boolean;
  onPerformanceAlert: boolean;
  channels: ('email' | 'push' | 'sms')[];
}

/**
 * Bot schedule
 */
export interface BotSchedule {
  enabled: boolean;
  startTime: string;
  endTime: string;
  timezone: string;
  daysOfWeek: number[];
  holidays: string[];
}

/**
 * Bot performance metrics
 */
export interface BotPerformance {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalPnL: number;
  maxDrawdown: number;
  sharpeRatio: number;
  profitFactor: number;
  averageWin: number;
  averageLoss: number;
  bestTrade: number;
  worstTrade: number;
  lastUpdated: number;
}

/**
 * Bot state
 */
export interface BotState {
  bots: BotConfig[];
  activeBots: string[];
  selectedBot: string | null;
  loading: boolean;
  error: ApiError | null;
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  lastActivity: number;
}

// ============================================================================
// UI TYPES
// ============================================================================

/**
 * UI notification
 */
export interface UINotification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  timestamp: number;
  duration?: number;
  persistent?: boolean;
  actions?: NotificationAction[];
}

/**
 * Notification action
 */
export interface NotificationAction {
  label: string;
  action: () => void;
  style?: 'primary' | 'secondary' | 'danger';
}

/**
 * UI state
 */
export interface UIState {
  theme: 'light' | 'dark' | 'auto';
  sidebarOpen: boolean;
  loading: boolean;
  notifications: UINotification[];
  modals: ModalState[];
  toasts: ToastState[];
  layout: LayoutState;
  accessibility: AccessibilityState;
}

/**
 * Modal state
 */
export interface ModalState {
  id: string;
  component: string;
  props?: Record<string, any>;
  isOpen: boolean;
  zIndex: number;
}

/**
 * Toast state
 */
export interface ToastState {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration: number;
  timestamp: number;
}

/**
 * Layout state
 */
export interface LayoutState {
  sidebarWidth: number;
  headerHeight: number;
  footerHeight: number;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  breakpoint: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

/**
 * Accessibility state
 */
export interface AccessibilityState {
  highContrast: boolean;
  reducedMotion: boolean;
  fontSize: 'small' | 'medium' | 'large';
  screenReader: boolean;
  keyboardNavigation: boolean;
}

// ============================================================================
// NOTIFICATION TYPES
// ============================================================================

/**
 * System notification
 */
export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info' | 'trade' | 'system';
  timestamp: number;
  read: boolean;
  persistent: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: string;
  data?: Record<string, any>;
  actions?: NotificationAction[];
  expiresAt?: number;
}

/**
 * Notification state
 */
export interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  settings: NotificationSettings;
  isConnected: boolean;
  lastSync: number;
}

/**
 * Notification settings
 */
export interface NotificationSettings {
  enabled: boolean;
  channels: {
    email: boolean;
    push: boolean;
    sms: boolean;
    inApp: boolean;
  };
  categories: {
    [key: string]: {
      enabled: boolean;
      channels: string[];
      priority: 'low' | 'medium' | 'high' | 'urgent';
    };
  };
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
    timezone: string;
  };
}

// ============================================================================
// VALIDATION TYPES
// ============================================================================

/**
 * Validation rule
 */
export interface ValidationRule {
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'email' | 'url' | 'date';
  min?: number;
  max?: number;
  pattern?: RegExp;
  custom?: (value: any) => string | null;
  message?: string;
}

/**
 * Validation schema
 */
export interface ValidationSchema {
  [key: string]: ValidationRule;
}

/**
 * Validation result
 */
export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

// ============================================================================
// ERROR TYPES
// ============================================================================

/**
 * Error state
 */
export interface ErrorState {
  code: string;
  message: string;
  details?: Record<string, any>;
  recoverable: boolean;
  retryCount: number;
  lastRetry?: number;
  maxRetries: number;
  timestamp: number;
  context?: string;
}

/**
 * Error action
 */
export interface ErrorAction {
  type: string;
  payload: ErrorState;
  meta?: {
    retryable: boolean;
    retryAfter?: number;
  };
}

// ============================================================================
// PERFORMANCE TYPES
// ============================================================================

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
  renderTime: number;
  memoryUsage: number;
  networkLatency: number;
  errorRate: number;
  timestamp: number;
}

/**
 * Performance state
 */
export interface PerformanceState {
  metrics: PerformanceMetrics[];
  isMonitoring: boolean;
  thresholds: PerformanceThresholds;
  alerts: PerformanceAlert[];
}

/**
 * Performance thresholds
 */
export interface PerformanceThresholds {
  maxRenderTime: number;
  maxMemoryUsage: number;
  maxNetworkLatency: number;
  maxErrorRate: number;
}

/**
 * Performance alert
 */
export interface PerformanceAlert {
  id: string;
  type: 'render' | 'memory' | 'network' | 'error';
  message: string;
  timestamp: number;
  resolved: boolean;
}

// ============================================================================
// ROOT STATE TYPE
// ============================================================================

/**
 * Root application state
 */
export interface RootState {
  auth: AuthState;
  trading: TradingState;
  marketData: MarketDataState;
  bot: BotState;
  ui: UIState;
  notification: NotificationState;
  performance: PerformanceState;
  _persist: {
    version: number;
    rehydrated: boolean;
  };
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Generic action with payload
 */
export interface ActionWithPayload<T = any> {
  type: string;
  payload: T;
  meta?: Record<string, any>;
}

/**
 * Async thunk states
 */
export interface AsyncThunkState<T = any> {
  data: T | null;
  loading: boolean;
  error: ApiError | null;
  lastFetched?: number;
}

/**
 * Selector function type
 */
export type Selector<T, R> = (state: T) => R;

// ============================================================================
// ERROR CREATION UTILITIES
// ============================================================================

/**
 * Create API error object
 */
export const createApiError = (
  code: string,
  message: string,
  details?: Record<string, any>
): ApiError => ({
  code,
  message,
  details: details || {},
  timestamp: Date.now()
});

/**
 * Create network error object
 */
export const createNetworkError = (message = 'Network error occurred'): ApiError => 
  createApiError('NETWORK_ERROR', message);

/**
 * Create authentication error object
 */
export const createAuthError = (message = 'Authentication failed'): ApiError => 
  createApiError('AUTH_ERROR', message);

/**
 * Memoized selector function type
 */
export type MemoizedSelector<T, R> = Selector<T, R> & {
  resultFunc: (state: T) => R;
  dependencies: Selector<T, any>[];
  recomputations: number;
  lastResult: R;
};
