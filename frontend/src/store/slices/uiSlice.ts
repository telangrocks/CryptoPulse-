import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface UIState {
  theme: 'light' | 'dark'
  sidebarOpen: boolean
  loading: boolean
  notifications: Array<{
    id: string
    message: string
    type: 'success' | 'error' | 'warning' | 'info'
    timestamp: number
  }>
}

const initialState: UIState = {
  theme: 'dark',
  sidebarOpen: true,
  loading: false,
  notifications: []
}

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setTheme: (state, action: PayloadAction<'light' | 'dark'>) => {
      state.theme = action.payload
    },
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload
    },
    addNotification: (state, action: PayloadAction<Omit<UIState['notifications'][0], 'id' | 'timestamp'>>) => {
      const notification = {
        ...action.payload,
        id: Date.now().toString(),
        timestamp: Date.now()
      }
      state.notifications.push(notification)
    },
    removeNotification: (state, action: PayloadAction<string>) => {
      state.notifications = state.notifications.filter(n => n.id !== action.payload)
    },
    clearNotifications: (state) => {
      state.notifications = []
    }
  }
})

export const { setTheme, toggleSidebar, setLoading, addNotification, removeNotification, clearNotifications } = uiSlice.actions
export default uiSlice.reducer
