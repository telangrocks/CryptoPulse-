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

const MarketWithProviders = () => (
  <BrowserRouter>
    <AuthProvider>
      <AppStateProvider>
        <Dashboard />
      </AppStateProvider>
    </AuthProvider>
  </BrowserRouter>
)

describe('Market Data Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('loads market data on mount', async () => {
    const mockMarketData = {
      success: true,
      data: {
        pair: 'BTC/USDT',
        price: 45000,
        change24h: 2.5,
        volume: 1000000,
        high24h: 46000,
        low24h: 44000,
        timestamp: Date.now()
      }
    }
    
    const { callBack4AppFunction } = await import('../../back4app/config')
    callBack4AppFunction.mockResolvedValue(mockMarketData)
    
    render(<MarketWithProviders />)
    
    await waitFor(() => {
      expect(callBack4AppFunction).toHaveBeenCalledWith('getCurrentPrice', {
        pair: 'BTC/USDT'
      }, 'session123')
    })
  })

  it('displays market price information', async () => {
    const mockMarketData = {
      success: true,
      data: {
        pair: 'BTC/USDT',
        price: 45000,
        change24h: 2.5,
        volume: 1000000,
        high24h: 46000,
        low24h: 44000,
        timestamp: Date.now()
      }
    }
    
    const { callBack4AppFunction } = await import('../../back4app/config')
    callBack4AppFunction.mockResolvedValue(mockMarketData)
    
    render(<MarketWithProviders />)
    
    await waitFor(() => {
      expect(screen.getByText('$45,000.00')).toBeInTheDocument()
      expect(screen.getByText('+2.5%')).toBeInTheDocument()
    })
  })

  it('handles market data loading error', async () => {
    const { callBack4AppFunction } = await import('../../back4app/config')
    callBack4AppFunction.mockRejectedValue(new Error('Failed to load market data'))
    
    render(<MarketWithProviders />)
    
    await waitFor(() => {
      expect(screen.getByText(/failed to load market data/i)).toBeInTheDocument()
    })
  })

  it('refreshes market data', async () => {
    const mockMarketData = {
      success: true,
      data: {
        pair: 'BTC/USDT',
        price: 45000,
        change24h: 2.5,
        volume: 1000000,
        high24h: 46000,
        low24h: 44000,
        timestamp: Date.now()
      }
    }
    
    const { callBack4AppFunction } = await import('../../back4app/config')
    callBack4AppFunction.mockResolvedValue(mockMarketData)
    
    render(<MarketWithProviders />)
    
    const refreshButton = screen.getByRole('button', { name: /refresh/i })
    fireEvent.click(refreshButton)
    
    await waitFor(() => {
      expect(callBack4AppFunction).toHaveBeenCalledTimes(2) // Once on mount, once on refresh
    })
  })

  it('updates market data periodically', async () => {
    const mockMarketData = {
      success: true,
      data: {
        pair: 'BTC/USDT',
        price: 45000,
        change24h: 2.5,
        volume: 1000000,
        high24h: 46000,
        low24h: 44000,
        timestamp: Date.now()
      }
    }
    
    const { callBack4AppFunction } = await import('../../back4app/config')
    callBack4AppFunction.mockResolvedValue(mockMarketData)
    
    render(<MarketWithProviders />)
    
    // Wait for initial load
    await waitFor(() => {
      expect(callBack4AppFunction).toHaveBeenCalledWith('getCurrentPrice', {
        pair: 'BTC/USDT'
      }, 'session123')
    })
    
    // Fast-forward time to trigger periodic update
    vi.advanceTimersByTime(30000) // 30 seconds
    
    await waitFor(() => {
      expect(callBack4AppFunction).toHaveBeenCalledTimes(2)
    })
  })
})
