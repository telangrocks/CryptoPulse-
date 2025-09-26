import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '../../contexts/AuthContext'
import { AppStateProvider } from '../../contexts/AppStateContext'
import Dashboard from '../../components/Dashboard'

// Mock Parse SDK
const mockParse = {
  User: {
    current: vi.fn(() => ({
      id: 'user123',
      get: vi.fn((key) => {
        if (key === 'email') return 'test@example.com'
        if (key === 'username') return 'testuser'
        return null
      }),
      getSessionToken: vi.fn(() => 'session123')
    }))
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

const ErrorHandlingWithProviders = () => (
  <BrowserRouter>
    <AuthProvider>
      <AppStateProvider>
        <Dashboard />
      </AppStateProvider>
    </AuthProvider>
  </BrowserRouter>
)

describe('Error Handling Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('handles network errors gracefully', async () => {
    const { callBack4AppFunction } = await import('../../back4app/config')
    callBack4AppFunction.mockRejectedValue(new Error('Network error'))
    
    render(<ErrorHandlingWithProviders />)
    
    await waitFor(() => {
      expect(screen.getByText(/network error/i)).toBeInTheDocument()
    })
  })

  it('handles API errors gracefully', async () => {
    const { callBack4AppFunction } = await import('../../back4app/config')
    callBack4AppFunction.mockRejectedValue(new Error('API error'))
    
    render(<ErrorHandlingWithProviders />)
    
    await waitFor(() => {
      expect(screen.getByText(/api error/i)).toBeInTheDocument()
    })
  })

  it('handles authentication errors gracefully', async () => {
    const { callBack4AppFunction } = await import('../../back4app/config')
    callBack4AppFunction.mockRejectedValue(new Error('Authentication failed'))
    
    render(<ErrorHandlingWithProviders />)
    
    await waitFor(() => {
      expect(screen.getByText(/authentication failed/i)).toBeInTheDocument()
    })
  })

  it('handles validation errors gracefully', async () => {
    const { callBack4AppFunction } = await import('../../back4app/config')
    callBack4AppFunction.mockRejectedValue(new Error('Validation failed'))
    
    render(<ErrorHandlingWithProviders />)
    
    await waitFor(() => {
      expect(screen.getByText(/validation failed/i)).toBeInTheDocument()
    })
  })

  it('handles timeout errors gracefully', async () => {
    const { callBack4AppFunction } = await import('../../back4app/config')
    callBack4AppFunction.mockRejectedValue(new Error('Request timeout'))
    
    render(<ErrorHandlingWithProviders />)
    
    await waitFor(() => {
      expect(screen.getByText(/request timeout/i)).toBeInTheDocument()
    })
  })

  it('handles server errors gracefully', async () => {
    const { callBack4AppFunction } = await import('../../back4app/config')
    callBack4AppFunction.mockRejectedValue(new Error('Internal server error'))
    
    render(<ErrorHandlingWithProviders />)
    
    await waitFor(() => {
      expect(screen.getByText(/internal server error/i)).toBeInTheDocument()
    })
  })

  it('provides retry functionality', async () => {
    const { callBack4AppFunction } = await import('../../back4app/config')
    callBack4AppFunction.mockRejectedValue(new Error('Temporary error'))
    
    render(<ErrorHandlingWithProviders />)
    
    await waitFor(() => {
      expect(screen.getByText(/temporary error/i)).toBeInTheDocument()
    })
    
    const retryButton = screen.getByRole('button', { name: /retry/i })
    fireEvent.click(retryButton)
    
    await waitFor(() => {
      expect(callBack4AppFunction).toHaveBeenCalledTimes(2)
    })
  })

  it('logs errors properly', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    
    const { callBack4AppFunction } = await import('../../back4app/config')
    callBack4AppFunction.mockRejectedValue(new Error('Test error'))
    
    render(<ErrorHandlingWithProviders />)
    
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Error:', expect.any(Error))
    })
    
    consoleSpy.mockRestore()
  })
})