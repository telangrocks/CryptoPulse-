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

const ResponsiveWithProviders = () => (
  <BrowserRouter>
    <AuthProvider>
      <AppStateProvider>
        <AuthScreen />
      </AppStateProvider>
    </AuthProvider>
  </BrowserRouter>
)

describe('Responsive Design Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders correctly on mobile devices', () => {
    // Mock mobile viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375
    })
    
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 667
    })
    
    render(<ResponsiveWithProviders />)
    
    // Check for mobile-specific elements
    expect(screen.getByTestId('mobile-layout')).toBeInTheDocument()
  })

  it('renders correctly on tablet devices', () => {
    // Mock tablet viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 768
    })
    
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 1024
    })
    
    render(<ResponsiveWithProviders />)
    
    // Check for tablet-specific elements
    expect(screen.getByTestId('tablet-layout')).toBeInTheDocument()
  })

  it('renders correctly on desktop devices', () => {
    // Mock desktop viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1920
    })
    
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 1080
    })
    
    render(<ResponsiveWithProviders />)
    
    // Check for desktop-specific elements
    expect(screen.getByTestId('desktop-layout')).toBeInTheDocument()
  })

  it('adapts to different screen orientations', () => {
    // Mock landscape orientation
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024
    })
    
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 768
    })
    
    render(<ResponsiveWithProviders />)
    
    // Check for landscape-specific layout
    expect(screen.getByTestId('landscape-layout')).toBeInTheDocument()
  })

  it('handles viewport changes', () => {
    render(<ResponsiveWithProviders />)
    
    // Initial mobile viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375
    })
    
    // Trigger resize event
    fireEvent.resize(window)
    
    // Check for mobile layout
    expect(screen.getByTestId('mobile-layout')).toBeInTheDocument()
    
    // Change to desktop viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1920
    })
    
    // Trigger resize event
    fireEvent.resize(window)
    
    // Check for desktop layout
    expect(screen.getByTestId('desktop-layout')).toBeInTheDocument()
  })

  it('handles touch events on mobile', () => {
    // Mock mobile viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375
    })
    
    render(<ResponsiveWithProviders />)
    
    const submitButton = screen.getByRole('button', { name: /sign in/i })
    
    // Test touch events
    fireEvent.touchStart(submitButton)
    fireEvent.touchEnd(submitButton)
    
    // Check that touch events are handled
    expect(submitButton).toHaveClass('touch-active')
  })

  it('handles hover events on desktop', () => {
    // Mock desktop viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1920
    })
    
    render(<ResponsiveWithProviders />)
    
    const submitButton = screen.getByRole('button', { name: /sign in/i })
    
    // Test hover events
    fireEvent.mouseEnter(submitButton)
    fireEvent.mouseLeave(submitButton)
    
    // Check that hover events are handled
    expect(submitButton).toHaveClass('hover-active')
  })

  it('handles keyboard navigation on all devices', () => {
    render(<ResponsiveWithProviders />)
    
    const emailInput = screen.getByPlaceholderText('Email')
    const passwordInput = screen.getByPlaceholderText('Password')
    const submitButton = screen.getByRole('button', { name: /sign in/i })
    
    // Test keyboard navigation
    emailInput.focus()
    expect(document.activeElement).toBe(emailInput)
    
    fireEvent.keyDown(emailInput, { key: 'Tab' })
    expect(document.activeElement).toBe(passwordInput)
    
    fireEvent.keyDown(passwordInput, { key: 'Tab' })
    expect(document.activeElement).toBe(submitButton)
  })
})