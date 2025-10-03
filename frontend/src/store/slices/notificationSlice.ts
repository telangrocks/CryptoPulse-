/**
 * Notification Slice for CryptoPulse
 *
 * Handles system notifications, alerts, and user messages.
 * Includes comprehensive error handling, persistence, and notification management.
 *
 * @fileoverview Production-ready notification state management
 * @version 1.0.0
 * @author CryptoPulse Team
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

import { generateRandomId } from '../../lib/utils';
import { RootState } from '../index';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

/**
 * Notification types
 */
export type NotificationType = 'success' | 'error' | 'warning' | 'info' | 'trade' | 'system' | 'security' | 'market';

/**
 * Notification priority levels
 */
export type NotificationPriority = 'low' | 'medium' | 'high' | 'critical';

/**
 * Notification channels
 */
export type NotificationChannel = 'inApp' | 'email' | 'push' | 'sms' | 'webhook';

/**
 * Notification status
 */
export type NotificationStatus = 'pending' | 'sent' | 'delivered' | 'failed' | 'read' | 'archived';

/**
 * Notification interface
 */
export interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  priority: NotificationPriority;
  status: NotificationStatus;
  timestamp: number;
  read: boolean;
  persistent: boolean;
  channels: NotificationChannel[];
  metadata?: {
    [key: string]: unknown;
  };
  actions?: NotificationAction[];
  expiresAt?: number;
  userId?: string;
  category?: string;
  tags?: string[];
  source?: string;
  relatedId?: string;
  relatedType?: string;
}

/**
 * Notification action interface
 */
export interface NotificationAction {
  id: string;
  label: string;
  type: 'button' | 'link' | 'dismiss';
  action?: string;
  url?: string;
  style?: 'primary' | 'secondary' | 'danger' | 'success';
  disabled?: boolean;
}

/**
 * Notification settings interface
 */
export interface NotificationSettings {
  enabled: boolean;
  channels: {
    inApp: boolean;
    email: boolean;
    push: boolean;
    sms: boolean;
    webhook: boolean;
  };
  types: {
    [key in NotificationType]: boolean;
  };
  quietHours: {
    enabled: boolean;
    start: string; // HH:mm format
    end: string; // HH:mm format
    timezone: string;
  };
  frequency: {
    maxPerMinute: number;
    maxPerHour: number;
    maxPerDay: number;
  };
  retention: {
    days: number;
    maxNotifications: number;
  };
  sound: {
    enabled: boolean;
    volume: number;
    customSound?: string;
  };
  vibration: {
    enabled: boolean;
    pattern?: number[];
  };
}

/**
 * Notification template interface
 */
export interface NotificationTemplate {
  id: string;
  name: string;
  type: NotificationType;
  title: string;
  message: string;
  channels: NotificationChannel[];
  priority: NotificationPriority;
  persistent: boolean;
  expiresAt?: number;
  metadata?: {
    [key: string]: unknown;
  };
  actions?: NotificationAction[];
  variables: string[];
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

/**
 * Notification state interface
 */
export interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  isInitialized: boolean;
  error: NotificationError | null;
  settings: NotificationSettings;
  templates: NotificationTemplate[];
  statistics: NotificationStatistics;
  filters: NotificationFilters;
  sortBy: 'timestamp' | 'priority' | 'type' | 'status';
  sortOrder: 'asc' | 'desc';
  limit: number;
  offset: number;
  lastCleanup: number;
  isConnected: boolean;
  connectionRetries: number;
  maxRetries: number;
  reconnectDelay: number;
  lastReconnectAttempt: number;
}

/**
 * Notification error interface
 */
export interface NotificationError {
  code: string;
  message: string;
  details?: unknown;
  timestamp: number;
  notificationId?: string;
  retryable: boolean;
}

/**
 * Notification filters interface
 */
export interface NotificationFilters {
  types?: NotificationType[];
  priorities?: NotificationPriority[];
  statuses?: NotificationStatus[];
  channels?: NotificationChannel[];
  read?: boolean;
  persistent?: boolean;
  dateRange?: {
    start: number;
    end: number;
  };
  search?: string;
  tags?: string[];
  category?: string;
  source?: string;
}

/**
 * Notification statistics interface
 */
export interface NotificationStatistics {
  total: number;
  unread: number;
  read: number;
  archived: number;
  byType: {
    [key in NotificationType]: number;
  };
  byPriority: {
    [key in NotificationPriority]: number;
  };
  byChannel: {
    [key in NotificationChannel]: number;
  };
  byStatus: {
    [key in NotificationStatus]: number;
  };
  averageReadTime: number;
  clickThroughRate: number;
  lastUpdated: number;
}

/**
 * Notification batch operation interface
 */
export interface NotificationBatchOperation {
  operation: 'markAsRead' | 'markAsUnread' | 'archive' | 'delete' | 'updateStatus';
  notificationIds: string[];
  data?: {
    status?: NotificationStatus;
    [key: string]: unknown;
  };
}

/**
 * Notification subscription interface
 */
export interface NotificationSubscription {
  id: string;
  userId: string;
  type: NotificationType;
  filters: NotificationFilters;
  channels: NotificationChannel[];
  isActive: boolean;
  createdAt: number;
  lastUpdate: number;
}

/**
 * Notification delivery interface
 */
export interface NotificationDelivery {
  id: string;
  notificationId: string;
  channel: NotificationChannel;
  status: NotificationStatus;
  attempts: number;
  maxAttempts: number;
  nextRetryAt?: number;
  deliveredAt?: number;
  error?: string;
  metadata?: {
    [key: string]: unknown;
  };
  createdAt: number;
  updatedAt: number;
}

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialState: NotificationState = {
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  isInitialized: false,
  error: null,
  settings: {
    enabled: true,
    channels: {
      inApp: true,
      email: true,
      push: true,
      sms: false,
      webhook: false,
    },
    types: {
      success: true,
      error: true,
      warning: true,
      info: true,
      trade: true,
      system: true,
      security: true,
      market: true,
    },
    quietHours: {
      enabled: false,
      start: '22:00',
      end: '08:00',
      timezone: 'UTC',
    },
    frequency: {
      maxPerMinute: 10,
      maxPerHour: 50,
      maxPerDay: 200,
    },
    retention: {
      days: 30,
      maxNotifications: 1000,
    },
    sound: {
      enabled: true,
      volume: 0.7,
    },
    vibration: {
      enabled: true,
      pattern: [200, 100, 200],
    },
  },
  templates: [],
  statistics: {
    total: 0,
    unread: 0,
    read: 0,
    archived: 0,
    byType: {
      success: 0,
      error: 0,
      warning: 0,
      info: 0,
      trade: 0,
      system: 0,
      security: 0,
      market: 0,
    },
    byPriority: {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    },
    byChannel: {
      inApp: 0,
      email: 0,
      push: 0,
      sms: 0,
      webhook: 0,
    },
    byStatus: {
      pending: 0,
      sent: 0,
      delivered: 0,
      failed: 0,
      read: 0,
      archived: 0,
    },
    averageReadTime: 0,
    clickThroughRate: 0,
    lastUpdated: Date.now(),
  },
  filters: {},
  sortBy: 'timestamp',
  sortOrder: 'desc',
  limit: 50,
  offset: 0,
  lastCleanup: Date.now(),
  isConnected: false,
  connectionRetries: 0,
  maxRetries: 5,
  reconnectDelay: 1000,
  lastReconnectAttempt: 0,
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Validates notification data
 */
const validateNotification = (notification: Partial<Notification>): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!notification.title || typeof notification.title !== 'string' || notification.title.trim().length === 0) {
    errors.push('Title is required and must be a non-empty string');
  }

  if (!notification.message || typeof notification.message !== 'string' || notification.message.trim().length === 0) {
    errors.push('Message is required and must be a non-empty string');
  }

  if (notification.type && !['success', 'error', 'warning', 'info', 'trade', 'system', 'security', 'market'].includes(notification.type)) {
    errors.push('Invalid notification type');
  }

  if (notification.priority && !['low', 'medium', 'high', 'critical'].includes(notification.priority)) {
    errors.push('Invalid notification priority');
  }

  if (notification.status && !['pending', 'sent', 'delivered', 'failed', 'read', 'archived'].includes(notification.status)) {
    errors.push('Invalid notification status');
  }

  if (notification.timestamp && (typeof notification.timestamp !== 'number' || notification.timestamp <= 0)) {
    errors.push('Timestamp must be a positive number');
  }

  if (notification.expiresAt && notification.timestamp && notification.expiresAt <= notification.timestamp) {
    errors.push('Expiration time must be after creation time');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

/**
 * Creates a notification ID
 */
const createNotificationId = (): string => {
  return `notif_${Date.now()}_${generateRandomId()}`;
};

/**
 * Checks if notification should be sent based on settings
 */
const shouldSendNotification = (notification: Notification, settings: NotificationSettings): boolean => {
  if (!settings.enabled) {
    return false;
  }

  // Check if notification type is enabled
  if (!settings.types[notification.type]) {
    return false;
  }

  // Check quiet hours
  if (settings.quietHours.enabled) {
    const now = new Date();
    const currentTime = now.toLocaleTimeString('en-US', {
      hour12: false,
      timeZone: settings.quietHours.timezone,
    });

    if (currentTime >= settings.quietHours.start || currentTime <= settings.quietHours.end) {
      return false;
    }
  }

  return true;
};

/**
 * Filters notifications based on criteria
 */
const filterNotifications = (notifications: Notification[], filters: NotificationFilters): Notification[] => {
  return notifications.filter(notification => {
    if (filters.types && !filters.types.includes(notification.type)) {
      return false;
    }

    if (filters.priorities && !filters.priorities.includes(notification.priority)) {
      return false;
    }

    if (filters.statuses && !filters.statuses.includes(notification.status)) {
      return false;
    }

    if (filters.channels && !notification.channels.some(channel => filters.channels!.includes(channel))) {
      return false;
    }

    if (filters.read !== undefined && notification.read !== filters.read) {
      return false;
    }

    if (filters.persistent !== undefined && notification.persistent !== filters.persistent) {
      return false;
    }

    if (filters.dateRange) {
      if (notification.timestamp < filters.dateRange.start || notification.timestamp > filters.dateRange.end) {
        return false;
      }
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      if (!notification.title.toLowerCase().includes(searchLower) &&
          !notification.message.toLowerCase().includes(searchLower)) {
        return false;
      }
    }

    if (filters.tags && (!notification.tags || !notification.tags.some(tag => filters.tags!.includes(tag)))) {
      return false;
    }

    if (filters.category && notification.category !== filters.category) {
      return false;
    }

    if (filters.source && notification.source !== filters.source) {
      return false;
    }

    return true;
  });
};

/**
 * Sorts notifications based on criteria
 */
const sortNotifications = (notifications: Notification[], sortBy: string, sortOrder: 'asc' | 'desc'): Notification[] => {
  return [...notifications].sort((a, b) => {
    let aValue: string | number;
    let bValue: string | number;

    switch (sortBy) {
      case 'timestamp':
        aValue = a.timestamp;
        bValue = b.timestamp;
        break;
      case 'priority':
        const priorityOrder = { low: 0, medium: 1, high: 2, critical: 3 };
        aValue = priorityOrder[a.priority];
        bValue = priorityOrder[b.priority];
        break;
      case 'type':
        aValue = a.type;
        bValue = b.type;
        break;
      case 'status':
        aValue = a.status;
        bValue = b.status;
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

/**
 * Calculates notification statistics
 */
const calculateStatistics = (notifications: Notification[]): NotificationStatistics => {
  const total = notifications.length;
  const unread = notifications.filter(n => !n.read).length;
  const read = notifications.filter(n => n.read).length;
  const archived = notifications.filter(n => n.status === 'archived').length;

  const byType = {
    success: 0,
    error: 0,
    warning: 0,
    info: 0,
    trade: 0,
    system: 0,
    security: 0,
    market: 0,
  };

  const byPriority = {
    low: 0,
    medium: 0,
    high: 0,
    critical: 0,
  };

  const byChannel = {
    inApp: 0,
    email: 0,
    push: 0,
    sms: 0,
    webhook: 0,
  };

  const byStatus = {
    pending: 0,
    sent: 0,
    delivered: 0,
    failed: 0,
    read: 0,
    archived: 0,
  };

  notifications.forEach(notification => {
    byType[notification.type]++;
    byPriority[notification.priority]++;
    byStatus[notification.status]++;

    notification.channels.forEach(channel => {
      byChannel[channel]++;
    });
  });

  // Calculate average read time
  const readNotifications = notifications.filter(n => n.read && n.readAt);
  const averageReadTime = readNotifications.length > 0
    ? readNotifications.reduce((sum, n) => {
      const readTime = n.readAt ? new Date(n.readAt).getTime() - new Date(n.timestamp).getTime() : 0;
      return sum + readTime;
    }, 0) / readNotifications.length
    : 0;

  // Calculate click-through rate
  const notificationsWithActions = notifications.filter(n => n.actions && n.actions.length > 0);
  const totalClicks = notificationsWithActions.reduce((sum, n) => {
    return sum + (n.actions?.reduce((actionSum, action) => actionSum + (action.clicks || 0), 0) || 0);
  }, 0);
  const clickThroughRate = notificationsWithActions.length > 0
    ? (totalClicks / notificationsWithActions.length) * 100
    : 0;

  return {
    total,
    unread,
    read,
    archived,
    byType,
    byPriority,
    byChannel,
    byStatus,
    averageReadTime,
    clickThroughRate,
    lastUpdated: Date.now(),
  };
};

// ============================================================================
// ASYNC THUNKS
// ============================================================================

/**
 * Create a new notification
 */
export const createNotification = createAsyncThunk<
  Notification,
  Omit<Notification, 'id' | 'timestamp' | 'read' | 'status'>,
  { rejectValue: NotificationError }
>(
  'notification/createNotification',
  async (notificationData, { rejectWithValue }) => {
    try {
      // Validate notification data
      const validation = validateNotification(notificationData);
      if (!validation.valid) {
        return rejectWithValue({
          code: 'VALIDATION_ERROR',
          message: validation.errors.join(', '),
          timestamp: Date.now(),
          retryable: false,
        });
      }

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));

      // Create notification
      const notification: Notification = {
        ...notificationData,
        id: createNotificationId(),
        timestamp: Date.now(),
        read: false,
        status: 'pending',
      };

      return notification;
    } catch (error) {
      return rejectWithValue({
        code: 'NOTIFICATION_CREATION_FAILED',
        message: 'Failed to create notification. Please try again.',
        details: error,
        timestamp: Date.now(),
        retryable: true,
      });
    }
  },
);

/**
 * Mark notification as read
 */
export const markNotificationAsRead = createAsyncThunk<
  string,
  string,
  { rejectValue: NotificationError }
>(
  'notification/markAsRead',
  async (notificationId, { rejectWithValue }) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 200));

      return notificationId;
    } catch (error) {
      return rejectWithValue({
        code: 'MARK_READ_FAILED',
        message: 'Failed to mark notification as read. Please try again.',
        details: error,
        timestamp: Date.now(),
        notificationId,
        retryable: true,
      });
    }
  },
);

/**
 * Update notification settings
 */
export const updateNotificationSettings = createAsyncThunk<
  NotificationSettings,
  Partial<NotificationSettings>,
  { rejectValue: NotificationError }
>(
  'notification/updateSettings',
  async (settings, { rejectWithValue }) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 300));

      return settings as NotificationSettings;
    } catch (error) {
      return rejectWithValue({
        code: 'SETTINGS_UPDATE_FAILED',
        message: 'Failed to update notification settings. Please try again.',
        details: error,
        timestamp: Date.now(),
        retryable: true,
      });
    }
  },
);

// ============================================================================
// SLICE DEFINITION
// ============================================================================

const notificationSlice = createSlice({
  name: 'notification',
  initialState,
  reducers: {
    /**
     * Add notification to state
     */
    addNotification: (state, action: PayloadAction<Notification>) => {
      state.notifications.unshift(action.payload);
      if (!action.payload.read) {
        state.unreadCount += 1;
      }
      state.statistics = calculateStatistics(state.notifications);
    },

    /**
     * Mark notification as read
     */
    markAsRead: (state, action: PayloadAction<string>) => {
      const notification = state.notifications.find(n => n.id === action.payload);
      if (notification && !notification.read) {
        notification.read = true;
        notification.status = 'read';
        state.unreadCount -= 1;
        state.statistics = calculateStatistics(state.notifications);
      }
    },

    /**
     * Mark all notifications as read
     */
    markAllAsRead: (state) => {
      state.notifications.forEach(notification => {
        if (!notification.read) {
          notification.read = true;
          notification.status = 'read';
        }
      });
      state.unreadCount = 0;
      state.statistics = calculateStatistics(state.notifications);
    },

    /**
     * Remove notification
     */
    removeNotification: (state, action: PayloadAction<string>) => {
      const notification = state.notifications.find(n => n.id === action.payload);
      if (notification && !notification.read) {
        state.unreadCount -= 1;
      }
      state.notifications = state.notifications.filter(n => n.id !== action.payload);
      state.statistics = calculateStatistics(state.notifications);
    },

    /**
     * Clear all notifications
     */
    clearNotifications: (state) => {
      state.notifications = [];
      state.unreadCount = 0;
      state.statistics = calculateStatistics(state.notifications);
    },

    /**
     * Clear old notifications
     */
    clearOldNotifications: (state, action: PayloadAction<number>) => {
      const cutoffTime = Date.now() - action.payload;
      state.notifications = state.notifications.filter(notification => {
        if (notification.timestamp < cutoffTime && !notification.persistent) {
          if (!notification.read) {
            state.unreadCount -= 1;
          }
          return false;
        }
        return true;
      });
      state.statistics = calculateStatistics(state.notifications);
    },

    /**
     * Set loading state
     */
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },

    /**
     * Set error state
     */
    setError: (state, action: PayloadAction<NotificationError | null>) => {
      state.error = action.payload;
    },

    /**
     * Clear error state
     */
    clearError: (state) => {
      state.error = null;
    },

    /**
     * Set filters
     */
    setFilters: (state, action: PayloadAction<NotificationFilters>) => {
      state.filters = { ...state.filters, ...action.payload };
    },

    /**
     * Set sort criteria
     */
    setSortCriteria: (state, action: PayloadAction<{ sortBy: string; sortOrder: 'asc' | 'desc' }>) => {
      state.sortBy = action.payload.sortBy as any;
      state.sortOrder = action.payload.sortOrder;
    },

    /**
     * Set pagination
     */
    setPagination: (state, action: PayloadAction<{ limit: number; offset: number }>) => {
      state.limit = action.payload.limit;
      state.offset = action.payload.offset;
    },

    /**
     * Update notification settings
     */
    updateSettings: (state, action: PayloadAction<Partial<NotificationSettings>>) => {
      state.settings = { ...state.settings, ...action.payload };
    },

    /**
     * Initialize notifications
     */
    initializeNotifications: (state) => {
      state.isInitialized = true;
    },

    /**
     * Set connection status
     */
    setConnectionStatus: (state, action: PayloadAction<{ isConnected: boolean; isReconnecting?: boolean }>) => {
      state.isConnected = action.payload.isConnected;
      if (action.payload.isReconnecting !== undefined) {
        state.isReconnecting = action.payload.isReconnecting;
      }
    },

    /**
     * Set connection retries
     */
    setConnectionRetries: (state, action: PayloadAction<number>) => {
      state.connectionRetries = action.payload;
    },

    /**
     * Update notification status
     */
    updateNotificationStatus: (state, action: PayloadAction<{ id: string; status: NotificationStatus }>) => {
      const notification = state.notifications.find(n => n.id === action.payload.id);
      if (notification) {
        notification.status = action.payload.status;
        state.statistics = calculateStatistics(state.notifications);
      }
    },

    /**
     * Archive notification
     */
    archiveNotification: (state, action: PayloadAction<string>) => {
      const notification = state.notifications.find(n => n.id === action.payload);
      if (notification) {
        notification.status = 'archived';
        state.statistics = calculateStatistics(state.notifications);
      }
    },

    /**
     * Clean up expired notifications
     */
    cleanupExpiredNotifications: (state) => {
      const now = Date.now();
      state.notifications = state.notifications.filter(notification => {
        if (notification.expiresAt && notification.expiresAt < now) {
          if (!notification.read) {
            state.unreadCount -= 1;
          }
          return false;
        }
        return true;
      });
      state.lastCleanup = now;
      state.statistics = calculateStatistics(state.notifications);
    },
  },
  extraReducers: (builder) => {
    builder
      // Create notification
      .addCase(createNotification.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createNotification.fulfilled, (state, action) => {
        state.isLoading = false;
        state.notifications.unshift(action.payload);
        if (!action.payload.read) {
          state.unreadCount += 1;
        }
        state.statistics = calculateStatistics(state.notifications);
      })
      .addCase(createNotification.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || {
          code: 'NOTIFICATION_CREATION_FAILED',
          message: 'Notification creation failed',
          timestamp: Date.now(),
          retryable: true,
        };
      })

      // Mark notification as read
      .addCase(markNotificationAsRead.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(markNotificationAsRead.fulfilled, (state, action) => {
        state.isLoading = false;
        const notification = state.notifications.find(n => n.id === action.payload);
        if (notification && !notification.read) {
          notification.read = true;
          notification.status = 'read';
          state.unreadCount -= 1;
          state.statistics = calculateStatistics(state.notifications);
        }
      })
      .addCase(markNotificationAsRead.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || {
          code: 'MARK_READ_FAILED',
          message: 'Mark as read failed',
          timestamp: Date.now(),
          retryable: true,
        };
      })

      // Update notification settings
      .addCase(updateNotificationSettings.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateNotificationSettings.fulfilled, (state, action) => {
        state.isLoading = false;
        state.settings = action.payload;
      })
      .addCase(updateNotificationSettings.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || {
          code: 'SETTINGS_UPDATE_FAILED',
          message: 'Settings update failed',
          timestamp: Date.now(),
          retryable: true,
        };
      });
  },
});

// ============================================================================
// SELECTORS
// ============================================================================

/**
 * Select notification state
 */
export const selectNotificationState = (state: RootState) => state.notification;

/**
 * Select notifications
 */
export const selectNotifications = (state: RootState) => state.notification?.notifications || [];

/**
 * Select filtered and sorted notifications
 */
export const selectFilteredNotifications = (state: RootState) => {
  if (!state.notification) return [];
  const { notifications, filters, sortBy, sortOrder, limit, offset } = state.notification;
  let filteredNotifications = filterNotifications(notifications, filters);
  filteredNotifications = sortNotifications(filteredNotifications, sortBy, sortOrder);
  return filteredNotifications.slice(offset, offset + limit);
};

/**
 * Select unread count
 */
export const selectUnreadCount = (state: RootState) => state.notification?.unreadCount || 0;

/**
 * Select notification by ID
 */
export const selectNotificationById = (id: string) => (state: RootState) =>
  state.notification?.notifications.find(n => n.id === id);

/**
 * Select notification settings
 */
export const selectNotificationSettings = (state: RootState) => state.notification?.settings;

/**
 * Select notification templates
 */
export const selectNotificationTemplates = (state: RootState) => state.notification?.templates;

/**
 * Select notification statistics
 */
export const selectNotificationStatistics = (state: RootState) => state.notification?.statistics;

// ============================================================================
// EXPORTS
// ============================================================================

export const {
  addNotification,
  markAsRead,
  markAllAsRead,
  removeNotification,
  clearNotifications,
  clearOldNotifications,
  setLoading,
  setError,
  clearError,
  setFilters,
  setSortCriteria,
  setPagination,
  updateSettings,
  initializeNotifications,
  setConnectionStatus,
  setConnectionRetries,
  updateNotificationStatus,
  archiveNotification,
  cleanupExpiredNotifications,
} = notificationSlice.actions;

export default notificationSlice.reducer;