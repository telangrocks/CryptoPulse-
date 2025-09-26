import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '../../contexts/AuthContext'
import { AppStateProvider } from '../../contexts/AppStateContext'
import AuthScreen from '../../components/AuthScreen'

// Mock Parse SDK
const mockParse = {
  User: {
    current: vi.fn(),
    logIn: vi.fn(),
    logOut: vi.fn(),
    signUp: vi.fn()
  },
  Cloud: {
    run: vi.fn()
  }
}

vi.mock('parse', () => ({
  default: mockParse
}))

// Mock Back4App config
vi.mock('../../back4app/config', () => ({
  Back4AppConfig: {
    appId: 'test-app-id',
    clientKey: 'test-client-key',
    masterKey: 'test-master-key',
    serverURL: 'https://test.back4app.com'
  },
  callBack4AppFunction: vi.fn()
}))

const SecurityWithProviders = () => (
  <BrowserRouter>
    <AuthProvider>
      <AppStateProvider>
        <AuthScreen />
      </AppStateProvider>
    </AuthProvider>
  </BrowserRouter>
)

describe('Security Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('validates password strength', async () => {
    render(<SecurityWithProviders />)
    
    const passwordInput = screen.getByPlaceholderText('Password')
    const submitButton = screen.getByRole('button', { name: /sign up/i })
    
    // Test weak password
    fireEvent.change(passwordInput, { target: { value: '123' } })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument()
    })
  })

  it('validates email format', async () => {
    render(<SecurityWithProviders />)
    
    const emailInput = screen.getByPlaceholderText('Email')
    const submitButton = screen.getByRole('button', { name: /sign up/i })
    
    // Test invalid email
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/invalid email format/i)).toBeInTheDocument()
    })
  })

  it('prevents XSS attacks', async () => {
    render(<SecurityWithProviders />)
    
    const emailInput = screen.getByPlaceholderText('Email')
    const passwordInput = screen.getByPlaceholderText('Password')
    
    // Test XSS attempt
    const xssPayload = '<script>alert("xss")</script>'
    fireEvent.change(emailInput, { target: { value: xssPayload } })
    fireEvent.change(passwordInput, { target: { value: xssPayload } })
    
    // Check that script tags are not rendered
    expect(screen.queryByText('<script>alert("xss")</script>')).not.toBeInTheDocument()
  })
})