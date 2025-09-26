import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { vi } from 'vitest'
import { AuthProvider } from '../contexts/AuthContext'
import { ThemeProvider } from '../contexts/ThemeContext'
import { AppStateProvider } from '../contexts/AppStateContext'

// Mock Parse
vi.mock('parse', () => ({
  default: {
    initialize: vi.fn(),
    serverURL: '',
    User: {
      current: vi.fn(),
      logIn: vi.fn(),
      logOut: vi.fn(),
      signUp: vi.fn(),
    },
    Query: vi.fn(),
    Cloud: {
      run: vi.fn(),
    },
  },
}))

// Mock analytics
vi.mock('../lib/analytics', () => ({
  analytics: {
    track: vi.fn(),
    trackPageView: vi.fn(),
    trackClick: vi.fn(),
    trackScroll: vi.fn(),
    trackFormInteraction: vi.fn(),
    trackAPICall: vi.fn(),
    trackTradeEvent: vi.fn(),
    trackError: vi.fn(),
  },
  useAnalytics: () => ({
    track: vi.fn(),
    trackPageView: vi.fn(),
    trackClick: vi.fn(),
    trackScroll: vi.fn(),
    trackFormInteraction: vi.fn(),
    trackAPICall: vi.fn(),
    trackTradeEvent: vi.fn(),
    trackError: vi.fn(),
  }),
  initializeAnalytics: vi.fn(),
}))

// Mock performance monitoring
vi.mock('../lib/performance', () => ({
  performanceMonitor: {
    recordMetric: vi.fn(),
    mark: vi.fn(),
    measure: vi.fn(),
    getMetrics: vi.fn(() => []),
    getAverageMetric: vi.fn(() => 0),
    cleanup: vi.fn(),
  },
  usePerformanceMonitor: () => ({
    mark: vi.fn(),
    measure: vi.fn(),
    recordMetric: vi.fn(),
  }),
  measureAsync: vi.fn((name, fn) => fn()),
  measureSync: vi.fn((name, fn) => fn()),
}))

// Mock advanced cache
vi.mock('../lib/advancedCache', () => ({
  apiCache: {
    get: vi.fn(),
    set: vi.fn(),
    has: vi.fn(),
    delete: vi.fn(),
    clear: vi.fn(),
  },
  userCache: {
    get: vi.fn(),
    set: vi.fn(),
    has: vi.fn(),
    delete: vi.fn(),
    clear: vi.fn(),
  },
  marketDataCache: {
    get: vi.fn(),
    set: vi.fn(),
    has: vi.fn(),
    delete: vi.fn(),
    clear: vi.fn(),
  },
  useCache: vi.fn(() => ({
    get: vi.fn(),
    set: vi.fn(),
    invalidate: vi.fn(),
    cache: {},
  })),
  cached: vi.fn((fn) => fn),
}))

// Mock security
vi.mock('../lib/security', () => ({
  rateLimiter: {
    isAllowed: vi.fn(() => true),
    getRemainingRequests: vi.fn(() => 100),
    reset: vi.fn(),
  },
  sanitizeInput: vi.fn((input) => input),
  validateEmail: vi.fn(() => true),
  validatePassword: vi.fn(() => ({ isValid: true, errors: [] })),
  validateAPIKey: vi.fn(() => true),
  validateAPISecret: vi.fn(() => true),
  escapeHtml: vi.fn((text) => text),
  csrfManager: {
    generateToken: vi.fn(() => 'mock-token'),
    getToken: vi.fn(() => 'mock-token'),
    validateToken: vi.fn(() => true),
    invalidateToken: vi.fn(),
  },
  secureStorage: {
    setItem: vi.fn(),
    getItem: vi.fn(),
    removeItem: vi.fn(),
  },
  sessionManager: {
    startSession: vi.fn(() => 'mock-session'),
    getSessionId: vi.fn(() => 'mock-session'),
    isSessionValid: vi.fn(() => true),
    updateActivity: vi.fn(),
    endSession: vi.fn(),
  },
  getSecurityHeaders: vi.fn(() => ({})),
  getCSPHeader: vi.fn(() => ''),
  logSecurityEvent: vi.fn(),
  initializeSecurity: vi.fn(),
}))

// Mock useAuthenticatedAPI
vi.mock('../hooks/useAuthenticatedAPI', () => ({
  useAuthenticatedAPI: () => ({
    authenticatedCall: vi.fn(),
    isLoading: false,
    error: null,
  }),
}))

// Mock useDocumentHead
vi.mock('../hooks/useDocumentHead', () => ({
  useDocumentHead: vi.fn(),
}))

// Mock useToast
vi.mock('../hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
    dismiss: vi.fn(),
  }),
}))

// Mock useAIAssistant
vi.mock('../hooks/useAIAssistant', () => ({
  useAIAssistant: () => ({
    sendMessage: vi.fn(),
    isLoading: false,
    messages: [],
    clearMessages: vi.fn(),
  }),
}))

// Mock use-mobile
vi.mock('../hooks/use-mobile', () => ({
  useMobile: () => false,
}))

// All-in-one provider wrapper
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <BrowserRouter>
      <ThemeProvider defaultTheme="light" storageKey="cryptopulse-theme">
        <AppStateProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </AppStateProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options })

// Re-export everything
export * from '@testing-library/react'
export { customRender as render }

// Test utilities
export const createMockUser = (overrides = {}) => ({
  id: 'test-user-id',
  username: 'testuser',
  email: 'test@example.com',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})

export const createMockTrade = (overrides = {}) => ({
  id: 'test-trade-id',
  symbol: 'BTCUSDT',
  side: 'BUY',
  quantity: 0.001,
  price: 45000,
  status: 'FILLED',
  timestamp: new Date(),
  ...overrides,
})

export const createMockAPIKeys = (overrides = {}) => ({
  marketDataKey: 'test-market-key',
  marketDataSecret: 'test-market-secret',
  tradeExecutionKey: 'test-trade-key',
  tradeExecutionSecret: 'test-trade-secret',
  exchange: 'binance',
  ...overrides,
})

export const waitForLoadingToFinish = () => {
  return new Promise(resolve => setTimeout(resolve, 100))
}

export const mockFetch = (data: any, status = 200) => {
  global.fetch = vi.fn(() =>
    Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(data),
      text: () => Promise.resolve(JSON.stringify(data)),
    })
  ) as any
}

export const mockWebSocket = () => {
  const mockWS = {
    send: vi.fn(),
    close: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    readyState: WebSocket.OPEN,
  }
  
  global.WebSocket = vi.fn(() => mockWS) as any
  return mockWS
}
