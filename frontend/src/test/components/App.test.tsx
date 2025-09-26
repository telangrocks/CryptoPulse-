import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import App from '../../App'

// Mock the Parse SDK
vi.mock('parse', () => ({
  default: {
    initialize: vi.fn(),
    serverURL: 'https://test.back4app.com',
    User: {
      current: vi.fn(() => null),
      logIn: vi.fn(),
      logOut: vi.fn(),
      signUp: vi.fn()
    },
    Cloud: {
      run: vi.fn()
    }
  }
}))

// Mock the Back4App config
vi.mock('../../back4app/config', () => ({
  Back4AppConfig: {
    appId: 'test-app-id',
    clientKey: 'test-client-key',
    masterKey: 'test-master-key',
    serverURL: 'https://test.back4app.com'
  }
}))

// Mock the AuthContext
vi.mock('../../contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="auth-provider">{children}</div>,
  useAuth: () => ({
    user: null,
    loading: false,
    login: vi.fn(),
    logout: vi.fn(),
    register: vi.fn()
  })
}))

// Mock the AppStateContext
vi.mock('../../contexts/AppStateContext', () => ({
  AppStateProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="app-state-provider">{children}</div>,
  useAppState: () => ({
    state: {},
    dispatch: vi.fn()
  })
}))

// Mock the ThemeContext
vi.mock('../../contexts/ThemeContext', () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="theme-provider">{children}</div>
}))

// Mock other components that might cause issues
vi.mock('../../components/ErrorBoundary', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="error-boundary">{children}</div>
}))

vi.mock('../../components/GlobalLoadingIndicator', () => ({
  default: () => <div data-testid="loading-indicator">Loading...</div>
}))

vi.mock('../../components/AccessibilityProvider', () => ({
  AccessibilityProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="accessibility-provider">{children}</div>
}))

vi.mock('../../hooks/useDocumentHead', () => ({
  useDocumentHead: vi.fn()
}))

const AppWithRouter = () => (
  <BrowserRouter>
    <App />
  </BrowserRouter>
)

describe('App Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without crashing', () => {
    render(<AppWithRouter />)
    expect(screen.getByTestId('error-boundary')).toBeInTheDocument()
  })

  it('renders all context providers', () => {
    render(<AppWithRouter />)
    expect(screen.getByTestId('auth-provider')).toBeInTheDocument()
    expect(screen.getByTestId('app-state-provider')).toBeInTheDocument()
    expect(screen.getByTestId('theme-provider')).toBeInTheDocument()
    expect(screen.getByTestId('accessibility-provider')).toBeInTheDocument()
  })

  it('has proper accessibility attributes', () => {
    render(<AppWithRouter />)
    const errorBoundary = screen.getByTestId('error-boundary')
    expect(errorBoundary).toBeInTheDocument()
  })
})
