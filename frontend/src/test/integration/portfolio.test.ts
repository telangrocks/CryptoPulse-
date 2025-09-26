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

const PortfolioWithProviders = () => (
  <BrowserRouter>
    <AuthProvider>
      <AppStateProvider>
        <Dashboard />
      </AppStateProvider>
    </AuthProvider>
  </BrowserRouter>
)

describe('Portfolio Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders portfolio dashboard', () => {
    render(<PortfolioWithProviders />)
    expect(screen.getByText('Portfolio')).toBeInTheDocument()
  })

  it('loads portfolio data on mount', async () => {
    const mockPortfolioData = {
      success: true,
      data: {
        totalValue: 10000,
        totalCost: 9500,
        totalReturn: 500,
        totalReturnPercentage: 5.26,
        portfolios: [
          {
            id: 'portfolio1',
            name: 'Main Portfolio',
            value: 10000,
            cost: 9500,
            return: 500,
            returnPercentage: 5.26,
            assets: 3
          }
        ]
      }
    }
    
    const { callBack4AppFunction } = await import('../../back4app/config')
    callBack4AppFunction.mockResolvedValue(mockPortfolioData)
    
    render(<PortfolioWithProviders />)
    
    await waitFor(() => {
      expect(callBack4AppFunction).toHaveBeenCalledWith('getPortfolioPerformance', {}, 'session123')
    })
    
    await waitFor(() => {
      expect(screen.getByText('Main Portfolio')).toBeInTheDocument()
      expect(screen.getByText('$10,000.00')).toBeInTheDocument()
      expect(screen.getByText('+5.26%')).toBeInTheDocument()
    })
  })

  it('handles portfolio loading error', async () => {
    const { callBack4AppFunction } = await import('../../back4app/config')
    callBack4AppFunction.mockRejectedValue(new Error('Failed to load portfolio'))
    
    render(<PortfolioWithProviders />)
    
    await waitFor(() => {
      expect(screen.getByText(/failed to load portfolio/i)).toBeInTheDocument()
    })
  })

  it('displays portfolio performance metrics', async () => {
    const mockPortfolioData = {
      success: true,
      data: {
        totalValue: 10000,
        totalCost: 9500,
        totalReturn: 500,
        totalReturnPercentage: 5.26,
        portfolios: []
      }
    }
    
    const { callBack4AppFunction } = await import('../../back4app/config')
    callBack4AppFunction.mockResolvedValue(mockPortfolioData)
    
    render(<PortfolioWithProviders />)
    
    await waitFor(() => {
      expect(screen.getByText('Total Value')).toBeInTheDocument()
      expect(screen.getByText('Total Return')).toBeInTheDocument()
      expect(screen.getByText('Return %')).toBeInTheDocument()
    })
  })

  it('refreshes portfolio data', async () => {
    const mockPortfolioData = {
      success: true,
      data: {
        totalValue: 10000,
        totalCost: 9500,
        totalReturn: 500,
        totalReturnPercentage: 5.26,
        portfolios: []
      }
    }
    
    const { callBack4AppFunction } = await import('../../back4app/config')
    callBack4AppFunction.mockResolvedValue(mockPortfolioData)
    
    render(<PortfolioWithProviders />)
    
    const refreshButton = screen.getByRole('button', { name: /refresh/i })
    fireEvent.click(refreshButton)
    
    await waitFor(() => {
      expect(callBack4AppFunction).toHaveBeenCalledTimes(2) // Once on mount, once on refresh
    })
  })
})
