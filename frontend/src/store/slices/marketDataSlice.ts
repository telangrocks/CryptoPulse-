import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface MarketData {
  symbol: string
  price: number
  volume: number
  change: number
  changePercent: number
  high: number
  low: number
  open: number
  close: number
  timestamp: number
}

interface MarketDataState {
  data: MarketData[]
  selectedSymbol: string
  lastUpdate: number
  loading: boolean
  error: string | null
}

const initialState: MarketDataState = {
  data: [],
  selectedSymbol: 'BTCUSDT',
  lastUpdate: 0,
  loading: false,
  error: null
}

const marketDataSlice = createSlice({
  name: 'marketData',
  initialState,
  reducers: {
    setMarketData: (state, action: PayloadAction<MarketData[]>) => {
      state.data = action.payload
      state.lastUpdate = Date.now()
    },
    updateMarketData: (state, action: PayloadAction<MarketData>) => {
      const index = state.data.findIndex(item => item.symbol === action.payload.symbol)
      if (index !== -1) {
        state.data[index] = action.payload
      } else {
        state.data.push(action.payload)
      }
      state.lastUpdate = Date.now()
    },
    setSelectedSymbol: (state, action: PayloadAction<string>) => {
      state.selectedSymbol = action.payload
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload
    },
    clearError: (state) => {
      state.error = null
    }
  }
})

export const { setMarketData, updateMarketData, setSelectedSymbol, setLoading, setError, clearError } = marketDataSlice.actions
export default marketDataSlice.reducer
