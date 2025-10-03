// =============================================================================
// Component Test Fixtures - Production Ready
// =============================================================================
// Comprehensive component fixtures and test utilities

import React from 'react';
import { render, RenderOptions, RenderResult } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ThemeProvider } from '../../contexts/ThemeContext';
import { AuthProvider } from '../../contexts/AuthContext';
import { AppStateProvider } from '../../contexts/AppStateContext';

// Test wrapper props
export interface TestWrapperProps {
  children: React.ReactNode;
  initialState?: any;
  store?: any;
  theme?: 'light' | 'dark';
  isAuthenticated?: boolean;
  user?: any;
  router?: boolean;
}

// Create test store
export const createTestStore = (initialState: any = {}) => {
  return configureStore({
    reducer: {
      auth: (state = { user: null, isAuthenticated: false }, action: any) => {
        switch (action.type) {
          case 'auth/loginSuccess':
            return { user: action.payload.user, isAuthenticated: true };
          case 'auth/logout':
            return { user: null, isAuthenticated: false };
          case 'auth/setUser':
            return { user: action.payload, isAuthenticated: true };
          default:
            return state;
        }
      },
      trading: (state = { sessions: [], positions: [], marketData: {} }, action: any) => {
        switch (action.type) {
          case 'trading/setSessions':
            return { ...state, sessions: action.payload };
          case 'trading/setPositions':
            return { ...state, positions: action.payload };
          case 'trading/setMarketData':
            return { ...state, marketData: action.payload };
          default:
            return state;
        }
      },
      ui: (state = { theme: 'light', sidebarOpen: false }, action: any) => {
        switch (action.type) {
          case 'ui/setTheme':
            return { ...state, theme: action.payload };
          case 'ui/toggleSidebar':
            return { ...state, sidebarOpen: !state.sidebarOpen };
          default:
            return state;
        }
      },
      ...initialState
    },
    preloadedState: initialState
  });
};

// Test wrapper component
export const TestWrapper: React.FC<TestWrapperProps> = ({
  children,
  initialState = {},
  store,
  theme = 'light',
  isAuthenticated = false,
  user = null,
  router = true
}) => {
  const testStore = store || createTestStore(initialState);

  // Set initial state if provided
  if (initialState.auth) {
    testStore.dispatch({ type: 'auth/setUser', payload: initialState.auth.user });
  }

  const wrapper = (
    <Provider store={testStore}>
      <ThemeProvider initialTheme={theme}>
        <AuthProvider initialUser={user} initialAuthenticated={isAuthenticated}>
          <AppStateProvider>
            {children}
          </AppStateProvider>
        </AuthProvider>
      </ThemeProvider>
    </Provider>
  );

  return router ? <BrowserRouter>{wrapper}</BrowserRouter> : wrapper;
};

// Custom render function
export const renderWithProviders = (
  ui: React.ReactElement,
  options: Omit<RenderOptions, 'wrapper'> & {
    initialState?: any;
    store?: any;
    theme?: 'light' | 'dark';
    isAuthenticated?: boolean;
    user?: any;
    router?: boolean;
  } = {}
): RenderResult => {
  const {
    initialState,
    store,
    theme,
    isAuthenticated,
    user,
    router,
    ...renderOptions
  } = options;

  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <TestWrapper
      initialState={initialState}
      store={store}
      theme={theme}
      isAuthenticated={isAuthenticated}
      user={user}
      router={router}
    >
      {children}
    </TestWrapper>
  );

  return render(ui, { wrapper: Wrapper, ...renderOptions });
};

// Component fixture scenarios
export const componentFixtures = {
  // Basic component fixture
  basic: () => ({
    initialState: {},
    theme: 'light' as const,
    isAuthenticated: false,
    user: null
  }),

  // Authenticated user fixture
  authenticated: () => ({
    initialState: {
      auth: {
        user: {
          id: 'user123',
          email: 'test@cryptopulse.com',
          name: 'Test User'
        },
        isAuthenticated: true
      }
    },
    theme: 'light' as const,
    isAuthenticated: true,
    user: {
      id: 'user123',
      email: 'test@cryptopulse.com',
      name: 'Test User'
    }
  }),

  // Admin user fixture
  admin: () => ({
    initialState: {
      auth: {
        user: {
          id: 'admin123',
          email: 'admin@cryptopulse.com',
          name: 'Admin User',
          role: 'admin'
        },
        isAuthenticated: true
      }
    },
    theme: 'light' as const,
    isAuthenticated: true,
    user: {
      id: 'admin123',
      email: 'admin@cryptopulse.com',
      name: 'Admin User',
      role: 'admin'
    }
  }),

  // Dark theme fixture
  darkTheme: () => ({
    initialState: {
      ui: { theme: 'dark' }
    },
    theme: 'dark' as const,
    isAuthenticated: false,
    user: null
  }),

  // Trading data fixture
  withTradingData: () => ({
    initialState: {
      trading: {
        sessions: [
          {
            id: 'session1',
            name: 'Test Session 1',
            status: 'active'
          }
        ],
        positions: [
          {
            id: 'position1',
            symbol: 'BTC/USDT',
            side: 'long',
            status: 'open'
          }
        ],
        marketData: {
          'BTC/USDT': { price: 50000, change24h: 2.5 }
        }
      }
    },
    theme: 'light' as const,
    isAuthenticated: true,
    user: {
      id: 'user123',
      email: 'test@cryptopulse.com',
      name: 'Test User'
    }
  }),

  // Error state fixture
  withError: () => ({
    initialState: {
      ui: {
        error: {
          message: 'Test error',
          code: 'TEST_ERROR'
        }
      }
    },
    theme: 'light' as const,
    isAuthenticated: false,
    user: null
  }),

  // Loading state fixture
  withLoading: () => ({
    initialState: {
      ui: {
        loading: true
      }
    },
    theme: 'light' as const,
    isAuthenticated: false,
    user: null
  }),

  // Empty state fixture
  withEmptyState: () => ({
    initialState: {
      trading: {
        sessions: [],
        positions: [],
        marketData: {}
      }
    },
    theme: 'light' as const,
    isAuthenticated: true,
    user: {
      id: 'user123',
      email: 'test@cryptopulse.com',
      name: 'Test User'
    }
  })
};

// Form fixture utilities
export const formFixtures = {
  // Login form data
  loginForm: () => ({
    email: 'test@cryptopulse.com',
    password: 'SecurePassword123!'
  }),

  // Registration form data
  registrationForm: () => ({
    name: 'Test User',
    email: 'test@cryptopulse.com',
    password: 'SecurePassword123!',
    confirmPassword: 'SecurePassword123!'
  }),

  // Trading session form data
  tradingSessionForm: () => ({
    name: 'Test Trading Session',
    description: 'A test trading session',
    exchange: 'binance',
    strategy: 'test-strategy',
    symbol: 'BTC/USDT',
    riskPercent: 2,
    maxPositions: 5
  }),

  // Position form data
  positionForm: () => ({
    symbol: 'BTC/USDT',
    side: 'long',
    size: 0.1,
    price: 50000,
    stopLoss: 47500,
    takeProfit: 55000
  }),

  // Settings form data
  settingsForm: () => ({
    theme: 'light',
    language: 'en',
    notifications: {
      email: true,
      push: false,
      sms: false
    },
    preferences: {
      autoSave: true,
      confirmActions: true,
      showAdvanced: false
    }
  }),

  // Profile form data
  profileForm: () => ({
    name: 'Updated User',
    email: 'updated@cryptopulse.com',
    avatar: 'https://example.com/new-avatar.jpg'
  })
};

// Event fixture utilities
export const eventFixtures = {
  // Mouse events
  mouse: {
    click: () => new MouseEvent('click', { bubbles: true, cancelable: true }),
    doubleClick: () => new MouseEvent('dblclick', { bubbles: true, cancelable: true }),
    rightClick: () => new MouseEvent('contextmenu', { bubbles: true, cancelable: true }),
    mouseOver: () => new MouseEvent('mouseover', { bubbles: true, cancelable: true }),
    mouseOut: () => new MouseEvent('mouseout', { bubbles: true, cancelable: true })
  },

  // Keyboard events
  keyboard: {
    enter: () => new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }),
    escape: () => new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
    tab: () => new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }),
    space: () => new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }),
    arrowUp: () => new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, cancelable: true }),
    arrowDown: () => new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }),
    arrowLeft: () => new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true }),
    arrowRight: () => new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true })
  },

  // Form events
  form: {
    submit: () => new Event('submit', { bubbles: true, cancelable: true }),
    reset: () => new Event('reset', { bubbles: true, cancelable: true }),
    change: (value: string) => {
      const event = new Event('change', { bubbles: true, cancelable: true });
      Object.defineProperty(event, 'target', { value: { value }, writable: false });
      return event;
    },
    input: (value: string) => {
      const event = new Event('input', { bubbles: true, cancelable: true });
      Object.defineProperty(event, 'target', { value: { value }, writable: false });
      return event;
    },
    focus: () => new FocusEvent('focus', { bubbles: true, cancelable: true }),
    blur: () => new FocusEvent('blur', { bubbles: true, cancelable: true })
  },

  // Window events
  window: {
    resize: () => new Event('resize', { bubbles: true, cancelable: true }),
    scroll: () => new Event('scroll', { bubbles: true, cancelable: true }),
    load: () => new Event('load', { bubbles: true, cancelable: true }),
    unload: () => new Event('unload', { bubbles: true, cancelable: true })
  }
};

// Async fixture utilities
export const asyncFixtures = {
  // Delay utility
  delay: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),

  // Mock async function
  mockAsync: <T>(value: T, delay: number = 100) => 
    async () => {
      await asyncFixtures.delay(delay);
      return value;
    },

  // Mock async error
  mockAsyncError: (error: Error, delay: number = 100) => 
    async () => {
      await asyncFixtures.delay(delay);
      throw error;
    },

  // Mock promise
  mockPromise: <T>(value: T, delay: number = 100) => 
    new Promise<T>(resolve => {
      setTimeout(() => resolve(value), delay);
    }),

  // Mock rejected promise
  mockRejectedPromise: (error: Error, delay: number = 100) => 
    new Promise((_, reject) => {
      setTimeout(() => reject(error), delay);
    })
};

// Test data fixtures
export const testDataFixtures = {
  // User data
  user: {
    basic: {
      id: 'user123',
      email: 'test@cryptopulse.com',
      name: 'Test User'
    },
    admin: {
      id: 'admin123',
      email: 'admin@cryptopulse.com',
      name: 'Admin User',
      role: 'admin'
    },
    trader: {
      id: 'trader123',
      email: 'trader@cryptopulse.com',
      name: 'Trader User',
      role: 'trader'
    }
  },

  // Trading data
  trading: {
    session: {
      id: 'session123',
      name: 'Test Session',
      status: 'active'
    },
    position: {
      id: 'position123',
      symbol: 'BTC/USDT',
      side: 'long',
      status: 'open'
    },
    marketData: {
      'BTC/USDT': { price: 50000, change24h: 2.5 }
    }
  },

  // UI data
  ui: {
    theme: 'light',
    sidebarOpen: false,
    loading: false,
    error: null
  }
};

// Export everything
export {
  createTestStore,
  TestWrapper,
  renderWithProviders,
  componentFixtures,
  formFixtures,
  eventFixtures,
  asyncFixtures,
  testDataFixtures
};

// Default export
export default {
  createTestStore,
  TestWrapper,
  renderWithProviders,
  componentFixtures,
  formFixtures,
  eventFixtures,
  asyncFixtures,
  testDataFixtures
};
