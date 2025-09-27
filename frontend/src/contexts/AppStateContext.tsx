import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react'

interface AppState {
  isLoading: boolean
  isOnline: boolean
  lastActivity: Date
  notifications: Notification[]
  userPreferences: UserPreferences
}

interface TradeDetails {
  pair: string
  entry: number
  stopLoss: number
  takeProfit: number
  strategy: string
  confidence: number
  riskLevel: 'low' | 'medium' | 'high'
  quantity: number
  side: 'BUY' | 'SELL'
  timestamp: Date
}

interface Notification {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message: string
  timestamp: Date
  read: boolean
  tradeDetails?: TradeDetails
  action?: {
    label: string
    onClick: () => void
  }
}

interface UserPreferences {
  theme: 'light' | 'dark' | 'system'
  language: string
  timezone: string
  notifications: {
    email: boolean
    push: boolean
    sound: boolean
  }
  trading: {
    defaultTimeframe: string
    riskLevel: 'low' | 'medium' | 'high'
    autoTrading: boolean
  }
}

interface AppStateContextType {
  state: AppState
  setLoading: (loading: boolean) => void
  setOnline: (online: boolean) => void
  updateActivity: () => void
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void
  addTradeSignalNotification: (tradeDetails: TradeDetails) => void
  removeNotification: (id: string) => void
  markNotificationRead: (id: string) => void
  clearAllNotifications: () => void
  updatePreferences: (preferences: Partial<UserPreferences>) => void
  resetState: () => void
}

const AppStateContext = createContext<AppStateContextType | undefined>(undefined)

interface AppStateProviderProps {
  children: ReactNode
}

const defaultPreferences: UserPreferences = {
  theme: 'system',
  language: 'en',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  notifications: {
    email: true,
    push: true,
    sound: true
  },
  trading: {
    defaultTimeframe: '15m',
    riskLevel: 'medium',
    autoTrading: false
  }
}

export function AppStateProvider({ children }: AppStateProviderProps) {
  const [state, setState] = useState<AppState>({
    isLoading: false,
    isOnline: navigator.onLine,
    lastActivity: new Date(),
    notifications: [],
    userPreferences: defaultPreferences
  })

  const setLoading = useCallback((loading: boolean) => {
    setState(prev => ({ ...prev, isLoading: loading }))
  }, [])

  const setOnline = useCallback((online: boolean) => {
    setState(prev => ({ ...prev, isOnline: online }))
  }, [])

  const updateActivity = useCallback(() => {
    setState(prev => ({ ...prev, lastActivity: new Date() }))
  }, [])

  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp'>) => {
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      timestamp: new Date()
    }
    
    setState(prev => ({
      ...prev,
      notifications: [newNotification, ...prev.notifications].slice(0, 50) // Keep only last 50
    }))

    // Auto-remove success notifications after 5 seconds
    if (notification.type === 'success') {
      setTimeout(() => {
        setState(prev => ({
          ...prev,
          notifications: prev.notifications.filter(n => n.id !== newNotification.id)
        }))
      }, 5000)
    }
  }, [])

  const addTradeSignalNotification = useCallback((tradeDetails: TradeDetails) => {
    const notification: Omit<Notification, 'id' | 'timestamp'> = {
      type: 'success',
      title: `Trade Signal Detected - ${tradeDetails.pair}`,
      message: `${tradeDetails.side} signal for ${tradeDetails.pair} at $${tradeDetails.entry.toFixed(2)}`,
      read: false,
      tradeDetails,
      action: {
        label: 'View Details',
        onClick: () => {
          // This will be handled by the notification component
          // View trade details - handled by app state context
        }
      }
    }
    
    addNotification(notification)
  }, [addNotification])

  const removeNotification = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      notifications: prev.notifications.filter(n => n.id !== id)
    }))
  }, [])

  const markNotificationRead = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      notifications: prev.notifications.map(n => 
        n.id === id ? { ...n, read: true } : n
      )
    }))
  }, [])

  const clearAllNotifications = useCallback(() => {
    setState(prev => ({ ...prev, notifications: [] }))
  }, [])

  const updatePreferences = useCallback((preferences: Partial<UserPreferences>) => {
    setState(prev => ({
      ...prev,
      userPreferences: { ...prev.userPreferences, ...preferences }
    }))
  }, [])

  const resetState = useCallback(() => {
    setState({
      isLoading: false,
      isOnline: navigator.onLine,
      lastActivity: new Date(),
      notifications: [],
      userPreferences: defaultPreferences
    })
  }, [])

  // Listen for online/offline events
  React.useEffect(() => {
    const handleOnline = () => setOnline(true)
    const handleOffline = () => setOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [setOnline])

  // Track user activity
  React.useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart']
    
    const handleActivity = () => {
      updateActivity()
    }

    events.forEach(event => {
      document.addEventListener(event, handleActivity, true)
    })

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true)
      })
    }
  }, [updateActivity])

  const value: AppStateContextType = {
    state,
    setLoading,
    setOnline,
    updateActivity,
    addNotification,
    addTradeSignalNotification,
    removeNotification,
    markNotificationRead,
    clearAllNotifications,
    updatePreferences,
    resetState
  }

  return (
    <AppStateContext.Provider value={value}>
      {children}
    </AppStateContext.Provider>
  )
}

export function useAppState() {
  const context = useContext(AppStateContext)
  if (context === undefined) {
    throw new Error('useAppState must be used within an AppStateProvider')
  }
  return context
}
