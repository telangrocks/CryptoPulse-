import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface Notification {
  id: string
  title: string
  message: string
  type: 'success' | 'error' | 'warning' | 'info'
  timestamp: number
  read: boolean
  persistent: boolean
}

interface NotificationState {
  notifications: Notification[]
  unreadCount: number
}

const initialState: NotificationState = {
  notifications: [],
  unreadCount: 0
}

const notificationSlice = createSlice({
  name: 'notification',
  initialState,
  reducers: {
    addNotification: (state, action: PayloadAction<Omit<Notification, 'id' | 'timestamp' | 'read'>>) => {
      const notification: Notification = {
        ...action.payload,
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        timestamp: Date.now(),
        read: false
      }
      state.notifications.unshift(notification)
      state.unreadCount += 1
    },
    markAsRead: (state, action: PayloadAction<string>) => {
      const notification = state.notifications.find(n => n.id === action.payload)
      if (notification && !notification.read) {
        notification.read = true
        state.unreadCount -= 1
      }
    },
    markAllAsRead: (state) => {
      state.notifications.forEach(notification => {
        notification.read = true
      })
      state.unreadCount = 0
    },
    removeNotification: (state, action: PayloadAction<string>) => {
      const notification = state.notifications.find(n => n.id === action.payload)
      if (notification && !notification.read) {
        state.unreadCount -= 1
      }
      state.notifications = state.notifications.filter(n => n.id !== action.payload)
    },
    clearNotifications: (state) => {
      state.notifications = []
      state.unreadCount = 0
    },
    clearOldNotifications: (state, action: PayloadAction<number>) => {
      const cutoffTime = Date.now() - action.payload
      state.notifications = state.notifications.filter(notification => {
        if (notification.timestamp < cutoffTime && !notification.persistent) {
          if (!notification.read) {
            state.unreadCount -= 1
          }
          return false
        }
        return true
      })
    }
  }
})

export const { 
  addNotification, 
  markAsRead, 
  markAllAsRead, 
  removeNotification, 
  clearNotifications, 
  clearOldNotifications 
} = notificationSlice.actions
export default notificationSlice.reducer
