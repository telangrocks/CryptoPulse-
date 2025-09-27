import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'

interface User {
  id: string
  username: string
  email: string
  createdAt: string
  updatedAt: string
  subscription?: {
    status: string
    trialActive: boolean
    trialEnd?: string
    amount?: number
    daysRemaining?: number
  }
}

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  sessionExpiry: number | null
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  sessionExpiry: null,
}

// Async thunks
export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async (credentials: { username: string; password: string }, { rejectWithValue }: any) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Mock successful login
      const user: User = {
        id: '1',
        username: credentials.username,
        email: `${credentials.username}@example.com`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        subscription: {
          status: 'active',
          trialActive: false,
          amount: 29.99,
          daysRemaining: 30
        }
      }
      
      return user
    } catch (error) {
      return rejectWithValue('Login failed')
    }
  }
)

export const logoutUser = createAsyncThunk(
  'auth/logoutUser',
  async (_: any, { rejectWithValue }: any) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500))
      return null
    } catch (error) {
      return rejectWithValue('Logout failed')
    }
  }
)

export const registerUser = createAsyncThunk(
  'auth/registerUser',
  async (userData: { username: string; email: string; password: string }, { rejectWithValue }: any) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const user: User = {
        id: Date.now().toString(),
        username: userData.username,
        email: userData.email,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        subscription: {
          status: 'trial',
          trialActive: true,
          trialEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          daysRemaining: 7
        }
      }
      
      return user
    } catch (error) {
      return rejectWithValue('Registration failed')
    }
  }
)

export const refreshToken = createAsyncThunk(
  'auth/refreshToken',
  async (_: any, { rejectWithValue }: any) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500))
      return { success: true }
    } catch (error) {
      return rejectWithValue('Token refresh failed')
    }
  }
)

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state: any) => {
      state.error = null
    },
    setSessionExpiry: (state: any, action: PayloadAction<number>) => {
      state.sessionExpiry = action.payload
    },
    updateUser: (state: any, action: PayloadAction<Partial<User>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload }
      }
    },
    setLoading: (state: any, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload
    }
  },
  extraReducers: (builder: any) => {
    builder
      // Login
      .addCase(loginUser.pending, (state: any) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(loginUser.fulfilled, (state: any, action: any) => {
        state.isLoading = false
        state.user = action.payload
        state.isAuthenticated = true
        state.sessionExpiry = Date.now() + 30 * 60 * 1000 // 30 minutes
      })
      .addCase(loginUser.rejected, (state: any, action: any) => {
        state.isLoading = false
        state.error = action.payload as string
        state.isAuthenticated = false
      })
      
      // Logout
      .addCase(logoutUser.pending, (state: any) => {
        state.isLoading = true
      })
      .addCase(logoutUser.fulfilled, (state: any) => {
        state.isLoading = false
        state.user = null
        state.isAuthenticated = false
        state.sessionExpiry = null
      })
      .addCase(logoutUser.rejected, (state: any, action: any) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      
      // Register
      .addCase(registerUser.pending, (state: any) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(registerUser.fulfilled, (state: any, action: any) => {
        state.isLoading = false
        state.user = action.payload
        state.isAuthenticated = true
        state.sessionExpiry = Date.now() + 30 * 60 * 1000 // 30 minutes
      })
      .addCase(registerUser.rejected, (state: any, action: any) => {
        state.isLoading = false
        state.error = action.payload as string
        state.isAuthenticated = false
      })
      
      // Refresh token
      .addCase(refreshToken.fulfilled, (state: any) => {
        state.sessionExpiry = Date.now() + 30 * 60 * 1000 // 30 minutes
      })
      .addCase(refreshToken.rejected, (state: any) => {
        state.isAuthenticated = false
        state.user = null
        state.sessionExpiry = null
      })
  }
})

export const { clearError, setSessionExpiry, updateUser, setLoading } = authSlice.actions
export default authSlice.reducer
