import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'

interface Trade {
  id: string
  symbol: string
  side: 'BUY' | 'SELL'
  type: 'MARKET' | 'LIMIT' | 'STOP_LOSS' | 'STOP_LOSS_LIMIT'
  quantity: number
  price: number
  stopPrice?: number
  status: 'PENDING' | 'FILLED' | 'CANCELLED' | 'REJECTED'
  timestamp: string
  profit?: number
  profitPercent?: number
}

interface Position {
  symbol: string
  side: 'LONG' | 'SHORT'
  quantity: number
  entryPrice: number
  currentPrice: number
  unrealizedPnl: number
  unrealizedPnlPercent: number
  margin: number
  leverage: number
}

interface TradingState {
  trades: Trade[]
  positions: Position[]
  activeOrders: Trade[]
  isLoading: boolean
  error: string | null
  selectedSymbol: string
  tradingEnabled: boolean
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'
  maxPositions: number
  stopLoss: number
  takeProfit: number
}

const initialState: TradingState = {
  trades: [],
  positions: [],
  activeOrders: [],
  isLoading: false,
  error: null,
  selectedSymbol: 'BTCUSDT',
  tradingEnabled: false,
  riskLevel: 'MEDIUM',
  maxPositions: 5,
  stopLoss: 2,
  takeProfit: 5,
}

// Async thunks
export const executeTrade = createAsyncThunk(
  'trading/executeTrade',
  async (tradeData: Omit<Trade, 'id' | 'timestamp' | 'status'>, { rejectWithValue }) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      const trade: Trade = {
        ...tradeData,
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        status: 'FILLED'
      }
      
      return trade
    } catch (error) {
      return rejectWithValue('Trade execution failed')
    }
  }
)

export const cancelOrder = createAsyncThunk(
  'trading/cancelOrder',
  async (orderId: string, { rejectWithValue }) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      return orderId
    } catch (error) {
      return rejectWithValue('Order cancellation failed')
    }
  }
)

export const fetchTrades = createAsyncThunk(
  'trading/fetchTrades',
  async (_, { rejectWithValue }) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Mock trades data
      const trades: Trade[] = [
        {
          id: '1',
          symbol: 'BTCUSDT',
          side: 'BUY',
          type: 'MARKET',
          quantity: 0.001,
          price: 45000,
          status: 'FILLED',
          timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
          profit: 50,
          profitPercent: 1.11
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
          profitPercent: -0.67
        }
      ]
      
      return trades
    } catch (error) {
      return rejectWithValue('Failed to fetch trades')
    }
  }
)

export const fetchPositions = createAsyncThunk(
  'trading/fetchPositions',
  async (_, { rejectWithValue }) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Mock positions data
      const positions: Position[] = [
        {
          symbol: 'BTCUSDT',
          side: 'LONG',
          quantity: 0.001,
          entryPrice: 45000,
          currentPrice: 45100,
          unrealizedPnl: 0.1,
          unrealizedPnlPercent: 0.22,
          margin: 45,
          leverage: 1
        }
      ]
      
      return positions
    } catch (error) {
      return rejectWithValue('Failed to fetch positions')
    }
  }
)

const tradingSlice = createSlice({
  name: 'trading',
  initialState,
  reducers: {
    setSelectedSymbol: (state, action: PayloadAction<string>) => {
      state.selectedSymbol = action.payload
    },
    setTradingEnabled: (state, action: PayloadAction<boolean>) => {
      state.tradingEnabled = action.payload
    },
    setRiskLevel: (state, action: PayloadAction<'LOW' | 'MEDIUM' | 'HIGH'>) => {
      state.riskLevel = action.payload
    },
    setMaxPositions: (state, action: PayloadAction<number>) => {
      state.maxPositions = action.payload
    },
    setStopLoss: (state, action: PayloadAction<number>) => {
      state.stopLoss = action.payload
    },
    setTakeProfit: (state, action: PayloadAction<number>) => {
      state.takeProfit = action.payload
    },
    clearError: (state) => {
      state.error = null
    },
    addTrade: (state, action: PayloadAction<Trade>) => {
      state.trades.unshift(action.payload)
    },
    updateTrade: (state, action: PayloadAction<{ id: string; updates: Partial<Trade> }>) => {
      const index = state.trades.findIndex(trade => trade.id === action.payload.id)
      if (index !== -1) {
        state.trades[index] = { ...state.trades[index], ...action.payload.updates }
      }
    },
    removeTrade: (state, action: PayloadAction<string>) => {
      state.trades = state.trades.filter(trade => trade.id !== action.payload)
    },
    updatePosition: (state, action: PayloadAction<{ symbol: string; updates: Partial<Position> }>) => {
      const index = state.positions.findIndex(pos => pos.symbol === action.payload.symbol)
      if (index !== -1) {
        state.positions[index] = { ...state.positions[index], ...action.payload.updates }
      }
    }
  },
  extraReducers: (builder) => {
    builder
      // Execute trade
      .addCase(executeTrade.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(executeTrade.fulfilled, (state, action) => {
        state.isLoading = false
        state.trades.unshift(action.payload)
      })
      .addCase(executeTrade.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      
      // Cancel order
      .addCase(cancelOrder.fulfilled, (state, action) => {
        state.activeOrders = state.activeOrders.filter(order => order.id !== action.payload)
      })
      .addCase(cancelOrder.rejected, (state, action) => {
        state.error = action.payload as string
      })
      
      // Fetch trades
      .addCase(fetchTrades.pending, (state) => {
        state.isLoading = true
      })
      .addCase(fetchTrades.fulfilled, (state, action) => {
        state.isLoading = false
        state.trades = action.payload
      })
      .addCase(fetchTrades.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      
      // Fetch positions
      .addCase(fetchPositions.pending, (state) => {
        state.isLoading = true
      })
      .addCase(fetchPositions.fulfilled, (state, action) => {
        state.isLoading = false
        state.positions = action.payload
      })
      .addCase(fetchPositions.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
  }
})

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
} = tradingSlice.actions

export default tradingSlice.reducer
