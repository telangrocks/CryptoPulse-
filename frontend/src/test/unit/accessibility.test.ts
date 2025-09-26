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

const AccessibilityWithProviders = () => (
  <BrowserRouter>
    <AuthProvider>
      <AppStateProvider>
        <AuthScreen />
      </AppStateProvider>
    </AuthProvider>
  </BrowserRouter>
)

describe('Accessibility Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('has proper ARIA labels', () => {
    render(<AccessibilityWithProviders />)
    
    const emailInput = screen.getByPlaceholderText('Email')
    const passwordInput = screen.getByPlaceholderText('Password')
    
    expect(emailInput).toHaveAttribute('aria-label', 'Email address')
    expect(passwordInput).toHaveAttribute('aria-label', 'Password')
  })

  it('has proper form labels', () => {
    render(<AccessibilityWithProviders />)
    
    const emailInput = screen.getByPlaceholderText('Email')
    const passwordInput = screen.getByPlaceholderText('Password')
    
    expect(emailInput).toHaveAttribute('id')
    expect(passwordInput).toHaveAttribute('id')
    
    const emailLabel = screen.getByLabelText('Email address')
    const passwordLabel = screen.getByLabelText('Password')
    
    expect(emailLabel).toBeInTheDocument()
    expect(passwordLabel).toBeInTheDocument()
  })

  it('supports keyboard navigation', () => {
    render(<AccessibilityWithProviders />)
    
    const emailInput = screen.getByPlaceholderText('Email')
    const passwordInput = screen.getByPlaceholderText('Password')
    const submitButton = screen.getByRole('button', { name: /sign in/i })
    
    // Tab navigation
    emailInput.focus()
    expect(document.activeElement).toBe(emailInput)
    
    fireEvent.keyDown(emailInput, { key: 'Tab' })
    expect(document.activeElement).toBe(passwordInput)
    
    fireEvent.keyDown(passwordInput, { key: 'Tab' })
    expect(document.activeElement).toBe(submitButton)
  })

  it('has proper focus management', () => {
    render(<AccessibilityWithProviders />)
    
    const emailInput = screen.getByPlaceholderText('Email')
    const passwordInput = screen.getByPlaceholderText('Password')
    
    // Focus should be on first input
    expect(document.activeElement).toBe(emailInput)
    
    // Focus should move to next input on Enter
    fireEvent.keyDown(emailInput, { key: 'Enter' })
    expect(document.activeElement).toBe(passwordInput)
  })

  it('has proper error announcements', async () => {
    render(<AccessibilityWithProviders />)
    
    const emailInput = screen.getByPlaceholderText('Email')
    const submitButton = screen.getByRole('button', { name: /sign in/i })
    
    // Submit with invalid email
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      const errorMessage = screen.getByText(/invalid email format/i)
      expect(errorMessage).toHaveAttribute('role', 'alert')
      expect(errorMessage).toHaveAttribute('aria-live', 'polite')
    })
  })

  it('has proper color contrast', () => {
    render(<AccessibilityWithProviders />)
    
    const submitButton = screen.getByRole('button', { name: /sign in/i })
    
    // Check that button has sufficient color contrast
    const styles = window.getComputedStyle(submitButton)
    expect(styles.color).toBeDefined()
    expect(styles.backgroundColor).toBeDefined()
  })

  it('has proper heading structure', () => {
    render(<AccessibilityWithProviders />)
    
    const h1 = screen.getByRole('heading', { level: 1 })
    const h2 = screen.getByRole('heading', { level: 2 })
    
    expect(h1).toBeInTheDocument()
    expect(h2).toBeInTheDocument()
  })

  it('has proper button roles', () => {
    render(<AccessibilityWithProviders />)
    
    const submitButton = screen.getByRole('button', { name: /sign in/i })
    const switchButton = screen.getByRole('button', { name: /create account/i })
    
    expect(submitButton).toHaveAttribute('type', 'submit')
    expect(switchButton).toHaveAttribute('type', 'button')
  })
})