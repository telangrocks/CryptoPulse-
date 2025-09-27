import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface BotConfig {
  id: string
  name: string
  strategy: string
  symbol: string
  isActive: boolean
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'
  maxPositions: number
  stopLoss: number
  takeProfit: number
  createdAt: number
  updatedAt: number
}

interface BotState {
  bots: BotConfig[]
  activeBots: string[]
  selectedBot: string | null
  loading: boolean
  error: string | null
}

const initialState: BotState = {
  bots: [],
  activeBots: [],
  selectedBot: null,
  loading: false,
  error: null
}

const botSlice = createSlice({
  name: 'bot',
  initialState,
  reducers: {
    addBot: (state, action: PayloadAction<BotConfig>) => {
      state.bots.push(action.payload)
    },
    updateBot: (state, action: PayloadAction<{ id: string; updates: Partial<BotConfig> }>) => {
      const index = state.bots.findIndex(bot => bot.id === action.payload.id)
      if (index !== -1) {
        state.bots[index] = { ...state.bots[index], ...action.payload.updates }
      }
    },
    removeBot: (state, action: PayloadAction<string>) => {
      state.bots = state.bots.filter(bot => bot.id !== action.payload)
      state.activeBots = state.activeBots.filter(id => id !== action.payload)
      if (state.selectedBot === action.payload) {
        state.selectedBot = null
      }
    },
    activateBot: (state, action: PayloadAction<string>) => {
      if (!state.activeBots.includes(action.payload)) {
        state.activeBots.push(action.payload)
      }
    },
    deactivateBot: (state, action: PayloadAction<string>) => {
      state.activeBots = state.activeBots.filter(id => id !== action.payload)
    },
    setSelectedBot: (state, action: PayloadAction<string | null>) => {
      state.selectedBot = action.payload
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

export const { 
  addBot, 
  updateBot, 
  removeBot, 
  activateBot, 
  deactivateBot, 
  setSelectedBot, 
  setLoading, 
  setError, 
  clearError 
} = botSlice.actions
export default botSlice.reducer
