import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '../contexts/AuthContext'
import { ThemeProvider } from '../contexts/ThemeContext'
import { AppStateProvider } from '../contexts/AppStateContext'

// Mock Parse
jest.mock('parse', () => ({
  initialize: jest.fn(),
  serverURL: '',
  User: {
    current: jest.fn(),
    logIn: jest.fn(),
    logOut: jest.fn(),
    signUp: jest.fn(),
  },
  Query: jest.fn(),
  Cloud: {
    run: jest.fn(),
  },
}))

// Mock analytics
jest.mock('../lib/analytics', () => ({
  analytics: {
    track: jest.fn(),
    trackPageView: jest.fn(),
    trackClick: jest.fn(),
    trackScroll: jest.fn(),
    trackFormInteraction: jest.fn(),
    trackAPICall: jest.fn(),
    trackTradeEvent: jest.fn(),
    trackError: jest.fn(),
  },
  useAnalytics: () => ({
    track: jest.fn(),
    trackPageView: jest.fn(),
    trackClick: jest.fn(),
    trackScroll: jest.fn(),
    trackFormInteraction: jest.fn(),
    trackAPICall: jest.fn(),
    trackTradeEvent: jest.fn(),
    trackError: jest.fn(),
  }),
  initializeAnalytics: jest.fn(),
}))

// Mock performance monitoring
jest.mock('../lib/performance', () => ({
  performanceMonitor: {
    recordMetric: jest.fn(),
    mark: jest.fn(),
    measure: jest.fn(),
    getMetrics: jest.fn(() => []),
    getAverageMetric: jest.fn(() => 0),
    cleanup: jest.fn(),
  },
  usePerformanceMonitor: () => ({
    mark: jest.fn(),
    measure: jest.fn(),
    recordMetric: jest.fn(),
  }),
  measureAsync: jest.fn((name, fn) => fn()),
  measureSync: jest.fn((name, fn) => fn()),
}))

// Mock advanced cache
jest.mock('../lib/advancedCache', () => ({
  apiCache: {
    get: jest.fn(),
    set: jest.fn(),
    has: jest.fn(),
    delete: jest.fn(),
    clear: jest.fn(),
  },
  userCache: {
    get: jest.fn(),
    set: jest.fn(),
    has: jest.fn(),
    delete: jest.fn(),
    clear: jest.fn(),
  },
  marketDataCache: {
    get: jest.fn(),
    set: jest.fn(),
    has: jest.fn(),
    delete: jest.fn(),
    clear: jest.fn(),
  },
  useCache: jest.fn(() => ({
    get: jest.fn(),
    set: jest.fn(),
    invalidate: jest.fn(),
    cache: {},
  })),
  cached: jest.fn((fn) => fn),
}))

// Mock security
jest.mock('../lib/security', () => ({
  rateLimiter: {
    isAllowed: jest.fn(() => true),
    getRemainingRequests: jest.fn(() => 100),
    reset: jest.fn(),
  },
  sanitizeInput: jest.fn((input) => input),
  validateEmail: jest.fn(() => true),
  validatePassword: jest.fn(() => ({ isValid: true, errors: [] })),
  validateAPIKey: jest.fn(() => true),
  validateAPISecret: jest.fn(() => true),
  escapeHtml: jest.fn((text) => text),
  csrfManager: {
    generateToken: jest.fn(() => 'mock-token'),
    getToken: jest.fn(() => 'mock-token'),
    validateToken: jest.fn(() => true),
    invalidateToken: jest.fn(),
  },
  secureStorage: {
    setItem: jest.fn(),
    getItem: jest.fn(),
    removeItem: jest.fn(),
  },
  sessionManager: {
    startSession: jest.fn(() => 'mock-session'),
    getSessionId: jest.fn(() => 'mock-session'),
    isSessionValid: jest.fn(() => true),
    updateActivity: jest.fn(),
    endSession: jest.fn(),
  },
  getSecurityHeaders: jest.fn(() => ({})),
  getCSPHeader: jest.fn(() => ''),
  logSecurityEvent: jest.fn(),
  initializeSecurity: jest.fn(),
}))

// Mock useAuthenticatedAPI
jest.mock('../hooks/useAuthenticatedAPI', () => ({
  useAuthenticatedAPI: () => ({
    authenticatedCall: jest.fn(),
    isLoading: false,
    error: null,
  }),
}))

// Mock useDocumentHead
jest.mock('../hooks/useDocumentHead', () => ({
  useDocumentHead: jest.fn(),
}))

// Mock useToast
jest.mock('../hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
    dismiss: jest.fn(),
  }),
}))

// Mock useAIAssistant
jest.mock('../hooks/useAIAssistant', () => ({
  useAIAssistant: () => ({
    sendMessage: jest.fn(),
    isLoading: false,
    messages: [],
    clearMessages: jest.fn(),
  }),
}))

// Mock use-mobile
jest.mock('../hooks/use-mobile', () => ({
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
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(data),
      text: () => Promise.resolve(JSON.stringify(data)),
    })
  ) as jest.Mock
}

export const mockWebSocket = () => {
  const mockWS = {
    send: jest.fn(),
    close: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    readyState: WebSocket.OPEN,
  }
  
  global.WebSocket = jest.fn(() => mockWS) as any
  return mockWS
}
