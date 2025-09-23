import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '../contexts/AuthContext'
import { ThemeProvider } from '../contexts/ThemeContext'
import { AppStateProvider } from '../contexts/AppStateContext'

// Mock user for testing
const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  username: 'testuser',
  billingStatus: 'trial',
  trialEnd: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
  sessionToken: 'test-session-token'
}

// Mock auth context
const mockAuthContext = {
  user: mockUser,
  loading: false,
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  acceptDisclaimer: vi.fn(),
  checkDisclaimerStatus: vi.fn().mockResolvedValue(true),
  requestPasswordReset: vi.fn(),
  resetPassword: vi.fn(),
  validateResetToken: vi.fn().mockResolvedValue(true),
}

// Mock theme context
const mockThemeContext = {
  theme: 'dark',
  actualTheme: 'dark',
  setTheme: vi.fn(),
  toggleTheme: vi.fn(),
}

// Mock app state context
const mockAppStateContext = {
  isLoading: false,
  setIsLoading: vi.fn(),
  error: null,
  setError: vi.fn(),
  connectionStatus: 'connected',
  setConnectionStatus: vi.fn(),
}

// Custom render function with providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <BrowserRouter>
      <ThemeProvider defaultTheme="dark" storageKey="cryptopulse-theme">
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

// Mock API functions
export const mockAPI = {
  callBack4AppFunction: vi.fn(),
  setupApiKeys: vi.fn(),
  getDecryptedApiKeys: vi.fn(),
  executeTrade: vi.fn(),
  getTradeHistory: vi.fn(),
  runBacktesting: vi.fn(),
  getAccountInfo: vi.fn(),
  getMarketData: vi.fn(),
  getBillingStatus: vi.fn(),
  getTradeStatistics: vi.fn(),
}

// Mock successful API responses
export const mockSuccessResponse = (data: any) => ({
  success: true,
  ...data
})

// Mock error API responses
export const mockErrorResponse = (message: string) => ({
  success: false,
  error: message
})

// Test data factories
export const createMockTrade = (overrides = {}) => ({
  id: 'trade-1',
  pair: 'BTC/USDT',
  action: 'BUY',
  entry: 45000,
  stopLoss: 43000,
  takeProfit: 47000,
  confidence: 85,
  status: 'EXECUTED',
  timestamp: new Date().toISOString(),
  ...overrides
})

export const createMockMarketData = (overrides = {}) => ({
  symbol: 'BTC/USDT',
  price: 45000,
  volume: 1000000,
  change24h: 2.5,
  high24h: 46000,
  low24h: 44000,
  timestamp: Date.now(),
  ...overrides
})

export const createMockAccountInfo = (overrides = {}) => ({
  balances: [
    { asset: 'USDT', free: '1000.00', locked: '0.00' },
    { asset: 'BTC', free: '0.05', locked: '0.00' }
  ],
  permissions: ['SPOT', 'MARGIN'],
  canTrade: true,
  canWithdraw: true,
  canDeposit: true,
  ...overrides
})

// Mock WebSocket
export const createMockWebSocket = () => ({
  send: vi.fn(),
  close: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  readyState: WebSocket.OPEN,
})

// Mock crypto functions
export const mockCrypto = {
  encryptData: vi.fn().mockResolvedValue('encrypted-data'),
  decryptData: vi.fn().mockResolvedValue('decrypted-data'),
  generateSecureKey: vi.fn().mockReturnValue('secure-key-32-chars'),
  hashPassword: vi.fn().mockResolvedValue('hashed-password'),
  generateSalt: vi.fn().mockReturnValue(new Uint8Array(16)),
}

// Mock cache
export const mockCache = {
  get: vi.fn(),
  set: vi.fn(),
  has: vi.fn(),
  delete: vi.fn(),
  clear: vi.fn(),
}

// Mock logger
export const mockLogger = {
  logInfo: vi.fn(),
  logWarn: vi.fn(),
  logError: vi.fn(),
  logDebug: vi.fn(),
}

// Re-export everything from testing library
export * from '@testing-library/react'
export { customRender as render }
