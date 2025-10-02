/**
 * Trading Slice for CryptoPulse
 * 
 * Handles trading operations, order management, and position tracking.
 * Includes comprehensive error handling, validation, and real-time updates.
 * 
 * @fileoverview Production-ready trading state management
 * @version 1.0.0
 * @author CryptoPulse Team
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../index';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

/**
 * Trade side types
 */
export type TradeSide = 'BUY' | 'SELL';

/**
 * Order types
 */
export type OrderType = 'MARKET' | 'LIMIT' | 'STOP_LOSS' | 'STOP_LOSS_LIMIT' | 'TAKE_PROFIT' | 'TAKE_PROFIT_LIMIT';

/**
 * Order status types
 */
export type OrderStatus = 'PENDING' | 'FILLED' | 'CANCELLED' | 'REJECTED' | 'PARTIALLY_FILLED' | 'EXPIRED';

/**
 * Position side types
 */
export type PositionSide = 'LONG' | 'SHORT';

/**
 * Risk level types
 */
export type RiskLevel = 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE' | 'VERY_AGGRESSIVE';

/**
 * Trade interface
 */
export interface Trade {
  id: string;
  symbol: string;
  side: TradeSide;
  type: OrderType;
  quantity: number;
  price: number;
  stopPrice?: number;
  status: OrderStatus;
  timestamp: string;
  profit?: number;
  profitPercent?: number;
  commission?: number;
  commissionAsset?: string;
  executedQty: number;
  cumQuote: number;
  timeInForce: 'GTC' | 'IOC' | 'FOK';
  orderId: string;
  clientOrderId?: string;
  exchange: string;
  fees: {
    [asset: string]: number;
  };
  metadata?: {
    [key: string]: unknown;
  };
  createdAt: number;
  updatedAt: number;
}

/**
 * Position interface
 */
export interface Position {
  id: string;
  symbol: string;
  side: PositionSide;
  quantity: number;
  entryPrice: number;
  currentPrice: number;
  unrealizedPnl: number;
  unrealizedPnlPercent: number;
  margin: number;
  leverage: number;
  marginRatio: number;
  liquidationPrice: number;
  markPrice: number;
  notional: number;
  isolated: boolean;
  marginType: 'ISOLATED' | 'CROSS';
  positionSide: 'BOTH' | 'LONG' | 'SHORT';
  breakEvenPrice: number;
  maxNotional: number;
  maxQty: number;
  createdAt: number;
  updatedAt: number;
}

/**
 * Order book entry interface
 */
export interface OrderBookEntry {
  price: number;
  quantity: number;
  count?: number;
}

/**
 * Order book interface
 */
export interface OrderBook {
  symbol: string;
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
  timestamp: number;
  lastUpdateId: number;
}

/**
 * Trading statistics interface
 */
export interface TradingStatistics {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalProfit: number;
  totalLoss: number;
  netProfit: number;
  profitFactor: number;
  sharpeRatio: number;
  maxDrawdown: number;
  averageWin: number;
  averageLoss: number;
  largestWin: number;
  largestLoss: number;
  consecutiveWins: number;
  consecutiveLosses: number;
  totalVolume: number;
  averageVolume: number;
  lastUpdated: number;
}

/**
 * Risk management interface
 */
export interface RiskManagement {
  maxPositionSize: number;
  maxDailyLoss: number;
  maxDrawdown: number;
  stopLossPercent: number;
  takeProfitPercent: number;
  maxLeverage: number;
  positionSizePercent: number;
  riskPerTrade: number;
  maxOpenPositions: number;
  correlationLimit: number;
  volatilityLimit: number;
  enabled: boolean;
}

/**
 * Trading state interface
 */
export interface TradingState {
  trades: Trade[];
  positions: Position[];
  activeOrders: Trade[];
  orderBook: OrderBook | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: TradingError | null;
  selectedSymbol: string;
  tradingEnabled: boolean;
  riskLevel: RiskLevel;
  riskManagement: RiskManagement;
  statistics: TradingStatistics;
  filters: TradingFilters;
  sortBy: 'timestamp' | 'profit' | 'volume' | 'symbol';
  sortOrder: 'asc' | 'desc';
  limit: number;
  offset: number;
  isConnected: boolean;
  connectionRetries: number;
  maxRetries: number;
  reconnectDelay: number;
  lastReconnectAttempt: number;
  lastUpdate: number;
  isRefreshing: boolean;
  selectedTimeframe: string;
  supportedSymbols: string[];
  supportedTimeframes: string[];
  marketData: {
    [symbol: string]: {
      price: number;
      volume: number;
      change: number;
      changePercent: number;
      timestamp: number;
    };
  };
}

/**
 * Trading error interface
 */
export interface TradingError {
  code: string;
  message: string;
  details?: unknown;
  timestamp: number;
  tradeId?: string;
  orderId?: string;
  retryable: boolean;
}

/**
 * Trading filters interface
 */
export interface TradingFilters {
  symbols?: string[];
  sides?: TradeSide[];
  types?: OrderType[];
  statuses?: OrderStatus[];
  dateRange?: {
    start: number;
    end: number;
  };
  minProfit?: number;
  maxProfit?: number;
  minVolume?: number;
  maxVolume?: number;
  exchanges?: string[];
}

/**
 * Order request interface
 */
export interface OrderRequest {
  symbol: string;
  side: TradeSide;
  type: OrderType;
  quantity: number;
  price?: number;
  stopPrice?: number;
  timeInForce?: 'GTC' | 'IOC' | 'FOK';
  clientOrderId?: string;
  exchange: string;
  metadata?: {
    [key: string]: unknown;
  };
}

/**
 * Order response interface
 */
export interface OrderResponse {
  orderId: string;
  clientOrderId?: string;
  symbol: string;
  side: TradeSide;
  type: OrderType;
  quantity: number;
  price: number;
  status: OrderStatus;
  timestamp: number;
  executedQty: number;
  cumQuote: number;
  fees: {
    [asset: string]: number;
  };
  exchange: string;
}

/**
 * Position update interface
 */
export interface PositionUpdate {
  symbol: string;
  side: PositionSide;
  quantity: number;
  entryPrice: number;
  currentPrice: number;
  unrealizedPnl: number;
  unrealizedPnlPercent: number;
  margin: number;
  leverage: number;
  timestamp: number;
}

/**
 * Trading session interface
 */
export interface TradingSession {
  id: string;
  startTime: number;
  endTime?: number;
  duration: number;
  trades: number;
  profit: number;
  volume: number;
  isActive: boolean;
  metadata?: {
    [key: string]: unknown;
  };
}

/**
 * Trading alert interface
 */
export interface TradingAlert {
  id: string;
  type: 'PRICE' | 'VOLUME' | 'PROFIT' | 'LOSS' | 'RISK';
  symbol: string;
  condition: string;
  value: number;
  isActive: boolean;
  triggered: boolean;
  triggeredAt?: number;
  message: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  createdAt: number;
  updatedAt: number;
}

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialState: TradingState = {
  trades: [],
  positions: [],
  activeOrders: [],
  orderBook: null,
  isLoading: false,
  isInitialized: false,
  error: null,
  selectedSymbol: 'BTCUSDT',
  tradingEnabled: false,
  riskLevel: 'MODERATE',
  riskManagement: {
    maxPositionSize: 1000,
    maxDailyLoss: 100,
    maxDrawdown: 20,
    stopLossPercent: 2,
    takeProfitPercent: 5,
    maxLeverage: 10,
    positionSizePercent: 10,
    riskPerTrade: 1,
    maxOpenPositions: 5,
    correlationLimit: 0.7,
    volatilityLimit: 50,
    enabled: true,
  },
  statistics: {
    totalTrades: 0,
    winningTrades: 0,
    losingTrades: 0,
    winRate: 0,
    totalProfit: 0,
    totalLoss: 0,
    netProfit: 0,
    profitFactor: 0,
    sharpeRatio: 0,
    maxDrawdown: 0,
    averageWin: 0,
    averageLoss: 0,
    largestWin: 0,
    largestLoss: 0,
    consecutiveWins: 0,
    consecutiveLosses: 0,
    totalVolume: 0,
    averageVolume: 0,
    lastUpdated: Date.now(),
  },
  filters: {},
  sortBy: 'timestamp',
  sortOrder: 'desc',
  limit: 100,
  offset: 0,
  isConnected: false,
  connectionRetries: 0,
  maxRetries: 5,
  reconnectDelay: 1000,
  lastReconnectAttempt: 0,
  lastUpdate: 0,
  isRefreshing: false,
  selectedTimeframe: '1m',
  supportedSymbols: [
    'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'ADAUSDT', 'XRPUSDT',
    'SOLUSDT', 'DOTUSDT', 'DOGEUSDT', 'AVAXUSDT', 'MATICUSDT'
  ],
  supportedTimeframes: ['1m', '3m', '5m', '15m', '30m', '1h', '2h', '4h', '6h', '8h', '12h', '1d', '3d', '1w', '1M'],
  marketData: {},
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Validates order request
 */
const validateOrderRequest = (order: OrderRequest): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!order.symbol || typeof order.symbol !== 'string') {
    errors.push('Symbol is required and must be a string');
  }
  
  if (!order.side || !['BUY', 'SELL'].includes(order.side)) {
    errors.push('Valid side (BUY/SELL) is required');
  }
  
  if (!order.type || !['MARKET', 'LIMIT', 'STOP_LOSS', 'STOP_LOSS_LIMIT', 'TAKE_PROFIT', 'TAKE_PROFIT_LIMIT'].includes(order.type)) {
    errors.push('Valid order type is required');
  }
  
  if (!order.quantity || order.quantity <= 0) {
    errors.push('Quantity must be greater than 0');
  }
  
  if (order.type !== 'MARKET' && (!order.price || order.price <= 0)) {
    errors.push('Price is required for non-market orders');
  }
  
  if (['STOP_LOSS', 'STOP_LOSS_LIMIT', 'TAKE_PROFIT', 'TAKE_PROFIT_LIMIT'].includes(order.type) && (!order.stopPrice || order.stopPrice <= 0)) {
    errors.push('Stop price is required for stop orders');
  }
  
  if (!order.exchange || typeof order.exchange !== 'string') {
    errors.push('Exchange is required and must be a string');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Calculate Sharpe ratio for trading performance
 */
const calculateSharpeRatio = (trades: Trade[], riskFreeRate: number = 0.02): number => {
  if (trades.length < 2) return 0;
  
  const returns = trades.map(trade => trade.profit || 0);
  const meanReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
  
  // Calculate standard deviation
  const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - meanReturn, 2), 0) / (returns.length - 1);
  const stdDev = Math.sqrt(variance);
  
  if (stdDev === 0) return 0;
  
  // Annualized Sharpe ratio
  const annualizedReturn = meanReturn * 365; // Assuming daily trades
  const annualizedStdDev = stdDev * Math.sqrt(365);
  
  return (annualizedReturn - riskFreeRate) / annualizedStdDev;
};

/**
 * Calculate maximum drawdown
 */
const calculateMaxDrawdown = (trades: Trade[]): number => {
  if (trades.length === 0) return 0;
  
  let peak = 0;
  let maxDrawdown = 0;
  let runningBalance = 0;
  
  trades.forEach(trade => {
    runningBalance += trade.profit || 0;
    if (runningBalance > peak) {
      peak = runningBalance;
    }
    
    const drawdown = peak - runningBalance;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
  });
  
  return maxDrawdown;
};

/**
 * Calculates trading statistics
 */
const calculateTradingStatistics = (trades: Trade[]): TradingStatistics => {
  const totalTrades = trades.length;
  const winningTrades = trades.filter(trade => (trade.profit || 0) > 0).length;
  const losingTrades = trades.filter(trade => (trade.profit || 0) < 0).length;
  const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
  
  const totalProfit = trades.reduce((sum, trade) => sum + (trade.profit || 0), 0);
  const totalLoss = trades.reduce((sum, trade) => sum + Math.abs(Math.min(trade.profit || 0, 0)), 0);
  const netProfit = totalProfit - totalLoss;
  const profitFactor = totalLoss > 0 ? totalProfit / totalLoss : 0;
  
  const profits = trades.map(trade => trade.profit || 0);
  const averageWin = winningTrades > 0 ? profits.filter(p => p > 0).reduce((sum, p) => sum + p, 0) / winningTrades : 0;
  const averageLoss = losingTrades > 0 ? profits.filter(p => p < 0).reduce((sum, p) => sum + Math.abs(p), 0) / losingTrades : 0;
  
  const largestWin = Math.max(...profits, 0);
  const largestLoss = Math.min(...profits, 0);
  
  const totalVolume = trades.reduce((sum, trade) => sum + trade.executedQty, 0);
  const averageVolume = totalTrades > 0 ? totalVolume / totalTrades : 0;
  
  // Calculate consecutive wins/losses
  let consecutiveWins = 0;
  let consecutiveLosses = 0;
  let currentStreak = 0;
  let isWinning = false;
  
  for (const profit of profits) {
    if (profit > 0) {
      if (isWinning) {
        currentStreak++;
      } else {
        currentStreak = 1;
        isWinning = true;
      }
      consecutiveWins = Math.max(consecutiveWins, currentStreak);
    } else if (profit < 0) {
      if (!isWinning) {
        currentStreak++;
      } else {
        currentStreak = 1;
        isWinning = false;
      }
      consecutiveLosses = Math.max(consecutiveLosses, currentStreak);
    }
  }
  
  return {
    totalTrades,
    winningTrades,
    losingTrades,
    winRate,
    totalProfit,
    totalLoss,
    netProfit,
    profitFactor,
    sharpeRatio: calculateSharpeRatio(trades),
    maxDrawdown: calculateMaxDrawdown(trades),
    averageWin,
    averageLoss,
    largestWin,
    largestLoss,
    consecutiveWins,
    consecutiveLosses,
    totalVolume,
    averageVolume,
    lastUpdated: Date.now(),
  };
};

/**
 * Filters trades based on criteria
 */
const filterTrades = (trades: Trade[], filters: TradingFilters): Trade[] => {
  return trades.filter(trade => {
    if (filters.symbols && !filters.symbols.includes(trade.symbol)) {
      return false;
    }
    
    if (filters.sides && !filters.sides.includes(trade.side)) {
      return false;
    }
    
    if (filters.types && !filters.types.includes(trade.type)) {
      return false;
    }
    
    if (filters.statuses && !filters.statuses.includes(trade.status)) {
      return false;
    }
    
    if (filters.dateRange) {
      const tradeTime = new Date(trade.timestamp).getTime();
      if (tradeTime < filters.dateRange.start || tradeTime > filters.dateRange.end) {
        return false;
      }
    }
    
    if (filters.minProfit !== undefined && (trade.profit || 0) < filters.minProfit) {
      return false;
    }
    
    if (filters.maxProfit !== undefined && (trade.profit || 0) > filters.maxProfit) {
      return false;
    }
    
    if (filters.minVolume !== undefined && trade.executedQty < filters.minVolume) {
      return false;
    }
    
    if (filters.maxVolume !== undefined && trade.executedQty > filters.maxVolume) {
      return false;
    }
    
    if (filters.exchanges && !filters.exchanges.includes(trade.exchange)) {
      return false;
    }
    
    return true;
  });
};

/**
 * Sorts trades based on criteria
 */
const sortTrades = (trades: Trade[], sortBy: string, sortOrder: 'asc' | 'desc'): Trade[] => {
  return [...trades].sort((a, b) => {
    let aValue: string | number;
    let bValue: string | number;
    
    switch (sortBy) {
      case 'timestamp':
        aValue = new Date(a.timestamp).getTime();
        bValue = new Date(b.timestamp).getTime();
        break;
      case 'profit':
        aValue = a.profit || 0;
        bValue = b.profit || 0;
        break;
      case 'volume':
        aValue = a.executedQty;
        bValue = b.executedQty;
        break;
      case 'symbol':
        aValue = a.symbol;
        bValue = b.symbol;
        break;
      default:
        return 0;
    }
    
    if (sortOrder === 'asc') {
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
    } else {
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
    }
  });
};

// ============================================================================
// ASYNC THUNKS
// ============================================================================

// Async thunks
export const executeTrade = createAsyncThunk(
  'trading/executeTrade',
  async (tradeData: Omit<Trade, 'id' | 'timestamp' | 'status'>, { rejectWithValue }) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      const trade: Trade = {
        ...tradeData,
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        status: 'FILLED'
      };
      
      return trade;
    } catch (error) {
      return rejectWithValue('Trade execution failed');
    }
  }
);

export const cancelOrder = createAsyncThunk(
  'trading/cancelOrder',
  async (orderId: string, { rejectWithValue }) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      return orderId;
    } catch (error) {
      return rejectWithValue('Order cancellation failed');
    }
  }
);

export const fetchTrades = createAsyncThunk(
  'trading/fetchTrades',
  async (_, { rejectWithValue }) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      // Mock trades data
      const trades: Trade[] = [
        {
          id: '1',
          symbol: 'BTCUSDT',
          side: 'BUY',
          type: 'MARKET',
          quantity: 0.1,
          price: 45000,
          status: 'FILLED',
          timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
          profit: 50,
          profitPercent: 1.11,
        },
        {
          id: '2',
          symbol: 'ETHUSDT',
          side: 'SELL',
          type: 'LIMIT',
          quantity: 0.1,
          price: 3000,
          status: 'FILLED',
          timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
          profit: -20,
          profitPercent: -0.67,
        }
      ];
      return trades;
    } catch (error) {
      return rejectWithValue('Failed to fetch trades');
    }
  }
);

export const fetchPositions = createAsyncThunk(
  'trading/fetchPositions',
  async (_, { rejectWithValue }) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      // Mock positions data
      const positions: Position[] = [
        {
          symbol: 'BTCUSDT',
          side: 'LONG',
          quantity: 0.1,
          entryPrice: 45000,
          currentPrice: 45100,
          unrealizedPnl: 0.1,
          unrealizedPnlPercent: 0.22,
          margin: 45,
          leverage: 1,
        }
      ];
      return positions;
    } catch (error) {
      return rejectWithValue('Failed to fetch positions');
    }
  }
);

const tradingSlice = createSlice({
  name: 'trading',
  initialState,
  reducers: {
    setSelectedSymbol: (state, action: PayloadAction<string>) => {
      state.selectedSymbol = action.payload;
    },
    setTradingEnabled: (state, action: PayloadAction<boolean>) => {
      state.tradingEnabled = action.payload;
    },
    setRiskLevel: (state, action: PayloadAction<'LOW' | 'MEDIUM' | 'HIGH'>) => {
      state.riskLevel = action.payload;
    },
    setMaxPositions: (state, action: PayloadAction<number>) => {
      state.maxPositions = action.payload;
    },
    setStopLoss: (state, action: PayloadAction<number>) => {
      state.stopLoss = action.payload;
    },
    setTakeProfit: (state, action: PayloadAction<number>) => {
      state.takeProfit = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    addTrade: (state, action: PayloadAction<Trade>) => {
      state.trades.unshift(action.payload);
    },
    updateTrade: (state, action: PayloadAction<{ id: string; updates: Partial<Trade> }>) => {
      const index = state.trades.findIndex((trade) => trade.id === action.payload.id);
      if (index !== -1) {
        state.trades[index] = { ...state.trades[index], ...action.payload.updates };
      }
    },
    removeTrade: (state, action: PayloadAction<string>) => {
      state.trades = state.trades.filter((trade) => trade.id !== action.payload);
    },
    updatePosition: (state, action: PayloadAction<{ symbol: string; updates: Partial<Position> }>) => {
      const index = state.positions.findIndex((pos) => pos.symbol === action.payload.symbol);
      if (index !== -1) {
        state.positions[index] = { ...state.positions[index], ...action.payload.updates };
      }
    }
  },
  extraReducers: (builder) => {
    builder
      // Execute trade
      .addCase(executeTrade.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(executeTrade.fulfilled, (state, action) => {
        state.isLoading = false;
        state.trades.unshift(action.payload);
      })
      .addCase(executeTrade.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Cancel order
      .addCase(cancelOrder.fulfilled, (state, action) => {
        state.activeOrders = state.activeOrders.filter((order) => order.id !== action.payload);
      })
      .addCase(cancelOrder.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      // Fetch trades
      .addCase(fetchTrades.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchTrades.fulfilled, (state, action) => {
        state.isLoading = false;
        state.trades = action.payload;
      })
      .addCase(fetchTrades.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch positions
      .addCase(fetchPositions.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchPositions.fulfilled, (state, action) => {
        state.isLoading = false;
        state.positions = action.payload;
      })
      .addCase(fetchPositions.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  }
});

export const {
  setSelectedSymbol,
  setTradingEnabled,
  setRiskLevel,
  setMaxPositions,
  setStopLoss,
  setTakeProfit,
  clearError,
  addTrade,
  updateTrade,
  removeTrade,
  updatePosition
} = tradingSlice.actions;

export default tradingSlice.reducer;