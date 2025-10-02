const crypto = require('crypto');

/**
 * UI Slice for CryptoPulse
 * 
 * Handles user interface state, theming, modals, and UI interactions.
 * Includes comprehensive state management, persistence, and error handling.
 * 
 * @fileoverview Production-ready UI state management
 * @version 1.0.0
 * @author CryptoPulse Team
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../index';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

/**
 * Theme types
 */
export type Theme = 'light' | 'dark' | 'auto';

/**
 * Toast types
 */
export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading';

/**
 * Modal types
 */
export type ModalType = 'settings' | 'confirm' | 'alert' | 'custom';

/**
 * Sidebar state types
 */
export type SidebarState = 'open' | 'closed' | 'collapsed';

/**
 * Layout types
 */
export type LayoutType = 'default' | 'compact' | 'wide' | 'fullscreen';

/**
 * Toast interface
 */
export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
  persistent?: boolean;
  actions?: ToastAction[];
  metadata?: {
    [key: string]: unknown;
  };
  createdAt: number;
  expiresAt?: number;
}

/**
 * Toast action interface
 */
export interface ToastAction {
  id: string;
  label: string;
  action: () => void;
  style?: 'primary' | 'secondary' | 'danger' | 'success';
}

/**
 * Modal interface
 */
export interface Modal {
  id: string;
  type: ModalType;
  isOpen: boolean;
  title?: string;
  content?: string;
  data?: {
    [key: string]: unknown;
  };
  onClose?: () => void;
  onConfirm?: () => void;
  onCancel?: () => void;
  persistent?: boolean;
  closable?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  position?: 'center' | 'top' | 'bottom' | 'left' | 'right';
  backdrop?: boolean;
  keyboard?: boolean;
  createdAt: number;
  updatedAt: number;
}

/**
 * UI preferences interface
 */
export interface UIPreferences {
  theme: Theme;
  layout: LayoutType;
  sidebar: SidebarState;
  language: string;
  timezone: string;
  dateFormat: string;
  timeFormat: '12h' | '24h';
  currency: string;
  numberFormat: {
    decimalPlaces: number;
    thousandSeparator: string;
    decimalSeparator: string;
  };
  animations: {
    enabled: boolean;
    duration: number;
    easing: string;
  };
  sounds: {
    enabled: boolean;
    volume: number;
    notifications: boolean;
    trades: boolean;
    alerts: boolean;
  };
  accessibility: {
    highContrast: boolean;
    reducedMotion: boolean;
    largeText: boolean;
    screenReader: boolean;
  };
  notifications: {
    position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
    maxVisible: number;
    stack: boolean;
    pauseOnHover: boolean;
    pauseOnFocusLoss: boolean;
  };
  charts: {
    defaultTimeframe: string;
    defaultType: 'line' | 'candlestick' | 'bar' | 'area';
    gridLines: boolean;
    crosshair: boolean;
    volume: boolean;
    indicators: string[];
  };
  trading: {
    defaultOrderType: string;
    defaultQuantity: number;
    confirmOrders: boolean;
    soundOnTrade: boolean;
    showPnl: boolean;
  };
}

/**
 * UI state interface
 */
export interface UIState {
  theme: Theme;
  sidebarOpen: boolean;
  sidebarState: SidebarState;
  layout: LayoutType;
  isLoading: boolean;
  isInitialized: boolean;
  error: UIError | null;
  notifications: Array<{
    id: string;
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
    timestamp: number;
  }>;
  modals: {
    [key: string]: Modal;
  };
  toasts: Toast[];
  preferences: UIPreferences;
  viewport: {
    width: number;
    height: number;
    isMobile: boolean;
    isTablet: boolean;
    isDesktop: boolean;
  };
  navigation: {
    currentRoute: string;
    previousRoute: string;
    breadcrumbs: string[];
    history: string[];
  };
  focus: {
    element: string | null;
    trap: boolean;
    restore: string | null;
  };
  keyboard: {
    shortcuts: {
      [key: string]: string;
    };
    enabled: boolean;
    helpVisible: boolean;
  };
  search: {
    query: string;
    results: unknown[];
    isOpen: boolean;
    isLoading: boolean;
    filters: {
      [key: string]: unknown;
    };
  };
  tooltips: {
    [key: string]: {
      content: string;
      position: 'top' | 'bottom' | 'left' | 'right';
      visible: boolean;
    };
  };
  dragAndDrop: {
    isDragging: boolean;
    draggedItem: unknown;
    dropTarget: string | null;
    allowedTypes: string[];
  };
  clipboard: {
    content: string;
    type: 'text' | 'json' | 'image';
    timestamp: number;
  };
  persistence: {
    enabled: boolean;
    lastSaved: number;
    autoSave: boolean;
    autoSaveInterval: number;
  };
  performance: {
    renderTime: number;
    memoryUsage: number;
    fps: number;
    lastUpdate: number;
  };
}

/**
 * UI error interface
 */
export interface UIError {
  code: string;
  message: string;
  details?: unknown;
  timestamp: number;
  component?: string;
  retryable: boolean;
}

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialState: UIState = {
  theme: 'dark',
  sidebarOpen: true,
  sidebarState: 'open',
  layout: 'default',
  isLoading: false,
  isInitialized: false,
  error: null,
  notifications: [],
  modals: {},
  toasts: [],
  preferences: {
    theme: 'dark',
    layout: 'default',
    sidebar: 'open',
    language: 'en',
    timezone: 'UTC',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '24h',
    currency: 'USD',
    numberFormat: {
      decimalPlaces: 2,
      thousandSeparator: ',',
      decimalSeparator: '.',
    },
    animations: {
      enabled: true,
      duration: 300,
      easing: 'ease-in-out',
    },
    sounds: {
      enabled: true,
      volume: 0.7,
      notifications: true,
      trades: true,
      alerts: true,
    },
    accessibility: {
      highContrast: false,
      reducedMotion: false,
      largeText: false,
      screenReader: false,
    },
    notifications: {
      position: 'top-right',
      maxVisible: 5,
      stack: true,
      pauseOnHover: true,
      pauseOnFocusLoss: false,
    },
    charts: {
      defaultTimeframe: '1h',
      defaultType: 'candlestick',
      gridLines: true,
      crosshair: true,
      volume: true,
      indicators: ['SMA', 'EMA', 'RSI'],
    },
    trading: {
      defaultOrderType: 'MARKET',
      defaultQuantity: 0.1,
      confirmOrders: true,
      soundOnTrade: true,
      showPnl: true,
    },
  },
  viewport: {
    width: 1920,
    height: 1080,
    isMobile: false,
    isTablet: false,
    isDesktop: true,
  },
  navigation: {
    currentRoute: '/',
    previousRoute: '',
    breadcrumbs: [],
    history: [],
  },
  focus: {
    element: null,
    trap: false,
    restore: null,
  },
  keyboard: {
    shortcuts: {
      'ctrl+k': 'search',
      'ctrl+shift+p': 'command-palette',
      'ctrl+shift+s': 'settings',
      'ctrl+shift+t': 'toggle-theme',
      'ctrl+shift+n': 'new-trade',
      'ctrl+shift+h': 'help',
      'escape': 'close-modal',
    },
    enabled: true,
    helpVisible: false,
  },
  search: {
    query: '',
    results: [],
    isOpen: false,
    isLoading: false,
    filters: {},
  },
  tooltips: {},
  dragAndDrop: {
    isDragging: false,
    draggedItem: null,
    dropTarget: null,
    allowedTypes: [],
  },
  clipboard: {
    content: '',
    type: 'text',
    timestamp: 0,
  },
  persistence: {
    enabled: true,
    lastSaved: 0,
    autoSave: true,
    autoSaveInterval: 30000, // 30 seconds
  },
  performance: {
    renderTime: 0,
    memoryUsage: 0,
    fps: 60,
    lastUpdate: Date.now(),
  },
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Creates a toast ID
 */
const createToastId = (): string => {
  // Use native crypto.randomUUID() if available
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `toast_${crypto.randomUUID()}`;
  }
  
  // Fallback for older environments
  return `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Creates a modal ID
 */
const createModalId = (): string => {
  // Use native crypto.randomUUID() if available
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `modal_${crypto.randomUUID()}`;
  }
  
  // Fallback for older environments
  return `modal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Updates viewport information
 */
const updateViewport = (state: UIState) => {
  if (typeof window !== 'undefined') {
    state.viewport.width = window.innerWidth;
    state.viewport.height = window.innerHeight;
    state.viewport.isMobile = window.innerWidth < 768;
    state.viewport.isTablet = window.innerWidth >= 768 && window.innerWidth < 1024;
    state.viewport.isDesktop = window.innerWidth >= 1024;
  }
};

// ============================================================================
// ASYNC THUNKS
// ============================================================================

/**
 * Save UI preferences
 */
export const saveUIPreferences = createAsyncThunk<
  UIPreferences,
  Partial<UIPreferences>,
  { rejectValue: UIError }
>(
  'ui/savePreferences',
  async (preferences, { rejectWithValue }) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // In a real app, this would save to localStorage or API
      if (typeof window !== 'undefined') {
        localStorage.setItem('ui-preferences', JSON.stringify(preferences));
      }
      
      return preferences as UIPreferences;
    } catch (error) {
      return rejectWithValue({
        code: 'PREFERENCES_SAVE_FAILED',
        message: 'Failed to save UI preferences. Please try again.',
        details: error,
        timestamp: Date.now(),
        retryable: true,
      });
    }
  }
);

/**
 * Load UI preferences
 */
export const loadUIPreferences = createAsyncThunk<
  UIPreferences,
  void,
  { rejectValue: UIError }
>(
  'ui/loadPreferences',
  async (_, { rejectWithValue }) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // In a real app, this would load from localStorage or API
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('ui-preferences');
        if (saved) {
          return JSON.parse(saved);
        }
      }
      
      return initialState.preferences;
    } catch (error) {
      return rejectWithValue({
        code: 'PREFERENCES_LOAD_FAILED',
        message: 'Failed to load UI preferences. Using defaults.',
        details: error,
        timestamp: Date.now(),
        retryable: true,
      });
    }
  }
);

// ============================================================================
// SLICE DEFINITION
// ============================================================================

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    /**
     * Set theme
     */
    setTheme: (state, action: PayloadAction<Theme>) => {
      state.theme = action.payload;
      state.preferences.theme = action.payload;
    },

    /**
     * Toggle sidebar
     */
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
      state.sidebarState = state.sidebarOpen ? 'open' : 'closed';
    },

    /**
     * Set sidebar state
     */
    setSidebarState: (state, action: PayloadAction<SidebarState>) => {
      state.sidebarState = action.payload;
      state.sidebarOpen = action.payload === 'open';
    },

    /**
     * Set layout
     */
    setLayout: (state, action: PayloadAction<LayoutType>) => {
      state.layout = action.payload;
      state.preferences.layout = action.payload;
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
    setError: (state, action: PayloadAction<UIError | null>) => {
      state.error = action.payload;
    },

    /**
     * Clear error state
     */
    clearError: (state) => {
      state.error = null;
    },

    /**
     * Add notification
     */
    addNotification: (state, action: PayloadAction<Omit<UIState['notifications'][0], 'id' | 'timestamp'>>) => {
      const notification = {
        ...action.payload,
        id: Date.now().toString(),
        timestamp: Date.now(),
      };
      state.notifications.push(notification);
    },

    /**
     * Remove notification
     */
    removeNotification: (state, action: PayloadAction<string>) => {
      state.notifications = state.notifications.filter(n => n.id !== action.payload);
    },

    /**
     * Clear notifications
     */
    clearNotifications: (state) => {
      state.notifications = [];
    },

    /**
     * Add toast
     */
    addToast: (state, action: PayloadAction<Omit<Toast, 'id' | 'createdAt'>>) => {
      const toast: Toast = {
        ...action.payload,
        id: createToastId(),
        createdAt: Date.now(),
        expiresAt: action.payload.duration ? Date.now() + action.payload.duration : undefined,
      };
      state.toasts.push(toast);
    },

    /**
     * Remove toast
     */
    removeToast: (state, action: PayloadAction<string>) => {
      state.toasts = state.toasts.filter(toast => toast.id !== action.payload);
    },

    /**
     * Clear toasts
     */
    clearToasts: (state) => {
      state.toasts = [];
    },

    /**
     * Open modal
     */
    openModal: (state, action: PayloadAction<Omit<Modal, 'id' | 'isOpen' | 'createdAt' | 'updatedAt'>>) => {
      const modal: Modal = {
        ...action.payload,
        id: createModalId(),
        isOpen: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      state.modals[modal.id] = modal;
    },

    /**
     * Close modal
     */
    closeModal: (state, action: PayloadAction<string>) => {
      if (state.modals[action.payload]) {
        state.modals[action.payload].isOpen = false;
        state.modals[action.payload].updatedAt = Date.now();
      }
    },

    /**
     * Remove modal
     */
    removeModal: (state, action: PayloadAction<string>) => {
      delete state.modals[action.payload];
    },

    /**
     * Clear modals
     */
    clearModals: (state) => {
      state.modals = {};
    },

    /**
     * Update preferences
     */
    updatePreferences: (state, action: PayloadAction<Partial<UIPreferences>>) => {
      state.preferences = { ...state.preferences, ...action.payload };
    },

    /**
     * Update viewport
     */
    updateViewport: (state) => {
      updateViewport(state);
    },

    /**
     * Set current route
     */
    setCurrentRoute: (state, action: PayloadAction<string>) => {
      state.navigation.previousRoute = state.navigation.currentRoute;
      state.navigation.currentRoute = action.payload;
      state.navigation.history.push(action.payload);
      
      // Keep only last 50 routes
      if (state.navigation.history.length > 50) {
        state.navigation.history = state.navigation.history.slice(-50);
      }
    },

    /**
     * Set breadcrumbs
     */
    setBreadcrumbs: (state, action: PayloadAction<string[]>) => {
      state.navigation.breadcrumbs = action.payload;
    },

    /**
     * Set focus element
     */
    setFocusElement: (state, action: PayloadAction<string | null>) => {
      state.focus.element = action.payload;
    },

    /**
     * Set focus trap
     */
    setFocusTrap: (state, action: PayloadAction<boolean>) => {
      state.focus.trap = action.payload;
    },

    /**
     * Set keyboard shortcuts
     */
    setKeyboardShortcuts: (state, action: PayloadAction<{ [key: string]: string }>) => {
      state.keyboard.shortcuts = { ...state.keyboard.shortcuts, ...action.payload };
    },

    /**
     * Toggle keyboard help
     */
    toggleKeyboardHelp: (state) => {
      state.keyboard.helpVisible = !state.keyboard.helpVisible;
    },

    /**
     * Set search query
     */
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.search.query = action.payload;
    },

    /**
     * Set search results
     */
    setSearchResults: (state, action: PayloadAction<unknown[]>) => {
      state.search.results = action.payload;
    },

    /**
     * Toggle search
     */
    toggleSearch: (state) => {
      state.search.isOpen = !state.search.isOpen;
    },

    /**
     * Set search loading
     */
    setSearchLoading: (state, action: PayloadAction<boolean>) => {
      state.search.isLoading = action.payload;
    },

    /**
     * Set tooltip
     */
    setTooltip: (state, action: PayloadAction<{ id: string; content: string; position: 'top' | 'bottom' | 'left' | 'right'; visible: boolean }>) => {
      state.tooltips[action.payload.id] = {
        content: action.payload.content,
        position: action.payload.position,
        visible: action.payload.visible,
      };
    },

    /**
     * Remove tooltip
     */
    removeTooltip: (state, action: PayloadAction<string>) => {
      delete state.tooltips[action.payload];
    },

    /**
     * Set drag and drop state
     */
    setDragAndDrop: (state, action: PayloadAction<Partial<UIState['dragAndDrop']>>) => {
      state.dragAndDrop = { ...state.dragAndDrop, ...action.payload };
    },

    /**
     * Set clipboard content
     */
    setClipboard: (state, action: PayloadAction<{ content: string; type: 'text' | 'json' | 'image' }>) => {
      state.clipboard = {
        content: action.payload.content,
        type: action.payload.type,
        timestamp: Date.now(),
      };
    },

    /**
     * Update performance metrics
     */
    updatePerformance: (state, action: PayloadAction<Partial<UIState['performance']>>) => {
      state.performance = { ...state.performance, ...action.payload, lastUpdate: Date.now() };
    },

    /**
     * Initialize UI
     */
    initializeUI: (state) => {
      state.isInitialized = true;
    },

    /**
     * Clean up expired items
     */
    cleanup: (state) => {
      const now = Date.now();
      state.toasts = state.toasts.filter(toast => {
        if (toast.persistent) return true;
        if (toast.expiresAt && toast.expiresAt < now) return false;
        if (toast.duration && (toast.createdAt + toast.duration) < now) return false;
        return true;
      });
      state.performance.lastUpdate = now;
    },
  },
  extraReducers: (builder) => {
    builder
      // Save UI preferences
      .addCase(saveUIPreferences.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(saveUIPreferences.fulfilled, (state, action) => {
        state.isLoading = false;
        state.preferences = action.payload;
        state.persistence.lastSaved = Date.now();
      })
      .addCase(saveUIPreferences.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || {
          code: 'PREFERENCES_SAVE_FAILED',
          message: 'Preferences save failed',
          timestamp: Date.now(),
          retryable: true,
        };
      })
      
      // Load UI preferences
      .addCase(loadUIPreferences.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loadUIPreferences.fulfilled, (state, action) => {
        state.isLoading = false;
        state.preferences = action.payload;
      })
      .addCase(loadUIPreferences.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || {
          code: 'PREFERENCES_LOAD_FAILED',
          message: 'Preferences load failed',
          timestamp: Date.now(),
          retryable: true,
        };
      });
  }
});

// ============================================================================
// SELECTORS
// ============================================================================

/**
 * Select UI state
 */
export const selectUIState = (state: RootState) => state.ui;

/**
 * Select theme
 */
export const selectTheme = (state: RootState) => state.ui?.theme || 'light';

/**
 * Select sidebar state
 */
export const selectSidebarState = (state: RootState) => state.ui?.sidebarState || 'collapsed';

/**
 * Select layout
 */
export const selectLayout = (state: RootState) => state.ui?.layout || 'default';

/**
 * Select loading state
 */
export const selectIsLoading = (state: RootState) => state.ui?.isLoading || false;

/**
 * Select error state
 */
export const selectError = (state: RootState) => state.ui?.error || null;

/**
 * Select notifications
 */
export const selectNotifications = (state: RootState) => state.ui.notifications;

/**
 * Select toasts
 */
export const selectToasts = (state: RootState) => state.ui.toasts;

/**
 * Select modals
 */
export const selectModals = (state: RootState) => state.ui.modals;

/**
 * Select preferences
 */
export const selectPreferences = (state: RootState) => state.ui.preferences;

/**
 * Select viewport
 */
export const selectViewport = (state: RootState) => state.ui.viewport;

/**
 * Select navigation
 */
export const selectNavigation = (state: RootState) => state.ui.navigation;

/**
 * Select focus state
 */
export const selectFocus = (state: RootState) => state.ui.focus;

/**
 * Select keyboard shortcuts
 */
export const selectKeyboardShortcuts = (state: RootState) => state.ui.keyboard.shortcuts;

/**
 * Select search state
 */
export const selectSearch = (state: RootState) => state.ui.search;

/**
 * Select tooltips
 */
export const selectTooltips = (state: RootState) => state.ui.tooltips;

/**
 * Select drag and drop state
 */
export const selectDragAndDrop = (state: RootState) => state.ui.dragAndDrop;

/**
 * Select clipboard
 */
export const selectClipboard = (state: RootState) => state.ui.clipboard;

/**
 * Select performance metrics
 */
export const selectPerformance = (state: RootState) => state.ui.performance;

// ============================================================================
// EXPORTS
// ============================================================================

export const {
  setTheme,
  toggleSidebar,
  setSidebarState,
  setLayout,
  setLoading,
  setError,
  clearError,
  addNotification,
  removeNotification,
  clearNotifications,
  addToast,
  removeToast,
  clearToasts,
  openModal,
  closeModal,
  removeModal,
  clearModals,
  updatePreferences,
  updateViewport,
  setCurrentRoute,
  setBreadcrumbs,
  setFocusElement,
  setFocusTrap,
  setKeyboardShortcuts,
  toggleKeyboardHelp,
  setSearchQuery,
  setSearchResults,
  toggleSearch,
  setSearchLoading,
  setTooltip,
  removeTooltip,
  setDragAndDrop,
  setClipboard,
  updatePerformance,
  initializeUI,
  cleanup,
} = uiSlice.actions;

export default uiSlice.reducer;