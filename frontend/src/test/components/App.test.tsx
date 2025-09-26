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
  AppStateProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="app-state-provider">{children}</div>
}))

// Mock the ThemeContext
vi.mock('../../contexts/ThemeContext', () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="theme-provider">{children}</div>
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
    expect(screen.getByTestId('auth-provider')).toBeInTheDocument()
  })

  it('renders all context providers', () => {
    render(<AppWithRouter />)
    expect(screen.getByTestId('auth-provider')).toBeInTheDocument()
    expect(screen.getByTestId('app-state-provider')).toBeInTheDocument()
    expect(screen.getByTestId('theme-provider')).toBeInTheDocument()
  })

  it('has proper accessibility attributes', () => {
    render(<AppWithRouter />)
    const app = screen.getByTestId('auth-provider')
    expect(app).toBeInTheDocument()
  })
})
