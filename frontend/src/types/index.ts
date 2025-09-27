// Core type definitions for CryptoPulse frontend

// Back4App Configuration Types
export interface Back4AppConfig {
  appId: string;
  clientKey: string;
  masterKey: string;
  serverURL: string;
}

// User Types
export interface User {
  id: string;
  email: string;
  username?: string;
  sessionToken?: string;
  disclaimerAccepted?: boolean;
  disclaimerAcceptedAt?: Date;
  billingStatus?: string;
  subscriptionStatus?: string;
}

// Trading Types
export interface TradeSignal {
  pair: string;
  action: 'BUY' | 'SELL';
  entry: number;
  stopLoss: number;
  takeProfit: number;
  confidence: number;
  timestamp: string;
  riskLevel?: 'low' | 'medium' | 'high';
  reasons?: string[];
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
  price: number;
  volume: number;
  priceChange: number;
  high: number;
  low: number;
  open: number;
  close: number;
  marketCap: number;
  timestamp: number;
  spread: string;
  volatility: string;
  bidDepth: number;
  askDepth: number;
  recommendations: string[];
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ValidationResult {
  success: boolean;
  data?: any;
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
  onConfirm: (confirmed: boolean, tradeData?: any) => void;
  onClose: () => void;
}

// Performance Types
export interface PerformanceMetrics {
  totalReturn: number;
  winRate: number;
  sharpeRatio: number;
  maxDrawdown: number;
  profitFactor: number;
  totalTrades: number;
  avgTradeReturn: number;
  bestTrade: number;
  worstTrade: number;
  avgHoldingPeriod: number;
}

export interface TradeHistory {
  id: string;
  pair: string;
  action: 'BUY' | 'SELL';
  amount: number;
  price: number;
  timestamp: string;
  profit?: number;
  status: 'pending' | 'executed' | 'failed' | 'cancelled';
}

export interface ChartData {
  timestamp: string;
  value: number;
  cumulativeReturn: number;
}

// AI Assistant Types
export interface Message {
  id: string;
  type: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  category?: 'trading' | 'technical' | 'risk' | 'general' | 'troubleshooting';
  suggestions?: string[];
  relatedFeatures?: string[];
}

// Trial Management Types
export interface TrialInfo {
  daysRemaining: number;
  isActive: boolean;
  features: string[];
}

// Notification Types
export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

// Market Data Types
export interface MarketData {
  symbol: string;
  price: number;
  volume: number;
  change: number;
  change24h: number;
  high24h: number;
  low24h: number;
  timestamp: number;
}

export interface OrderRequest {
  symbol: string;
  side: 'BUY' | 'SELL';
  type: 'MARKET' | 'LIMIT';
  quantity: number;
  price?: number;
}

export interface OrderResponse {
  orderId: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  type: 'MARKET' | 'LIMIT';
  quantity: number;
  price: number;
  status: string;
  timestamp: number;
  filledQuantity: number;
  remainingQuantity: number;
  averagePrice: number;
  exchange: string;
}

// Security Types
export interface SecurityEvent {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: any;
  timestamp: Date;
  ip: string;
  userAgent: string;
  userId?: string;
}

// Cache Types
export interface CacheItem<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
}

// Rate Limiter Types
export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

// Exchange Integration Types
export interface ExchangeCredentials {
  apiKey: string;
  secretKey: string;
  exchange: string;
}

export interface Balance {
  asset: string;
  free: string;
  locked: string;
}

// Form Validation Types
export interface FormField {
  name: string;
  value: any;
  error?: string;
  touched: boolean;
  required: boolean;
}

export interface FormState {
  fields: Record<string, FormField>;
  isValid: boolean;
  isSubmitting: boolean;
}

// Error Types
export interface AppError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
  component?: string;
}

// Theme Types
export interface ThemeConfig {
  mode: 'light' | 'dark';
  primaryColor: string;
  secondaryColor: string;
}

// WebSocket Types
export interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: number;
}

export interface WebSocketConfig {
  url: string;
  reconnectInterval: number;
  maxReconnectAttempts: number;
}

// Automation Types
export interface AutomationSettings {
  enabled: boolean;
  learningMode: boolean;
  autoTrading: boolean;
  riskLevel: 'low' | 'medium' | 'high';
  maxDailyTrades: number;
  stopLossPercentage: number;
  takeProfitPercentage: number;
}

export interface AIPerformance {
  totalSignals: number;
  successfulTrades: number;
  winRate: number;
  totalProfit: number;
  learningProgress: number;
  strategiesOptimized: number;
}

// Subscription Types
export interface Subscription {
  id: string;
  userId: string;
  planType: 'monthly' | 'quarterly' | 'yearly';
  status: 'active' | 'cancelled' | 'expired';
  amount: number;
  currency: string;
  createdAt: Date;
  expiresAt?: Date;
}

// Payment Types
export interface PaymentConfig {
  orderId: string;
  amount: number;
  currency: string;
  customerId: string;
  customerEmail: string;
  customerName: string;
  customerPhone?: string;
}

export interface PaymentResponse {
  success: boolean;
  orderId: string;
  paymentUrl?: string;
  orderToken?: string;
  amount: number;
  currency: string;
  environment: 'LIVE' | 'SANDBOX';
}

// Test Types
export interface TestResult {
  test: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  message: string;
  duration: number;
}

// Global Window Extensions
declare global {
  interface Window {
    apiKeyManager?: {
      getKeys: () => Promise<UserApiKeys>;
      setKeys: (keys: UserApiKeys) => Promise<void>;
      clearCache: () => void;
    };
  }
}

export {};
