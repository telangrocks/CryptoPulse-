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

const RiskWithProviders = () => (
  <BrowserRouter>
    <AuthProvider>
      <AppStateProvider>
        <Dashboard />
      </AppStateProvider>
    </AuthProvider>
  </BrowserRouter>
)

describe('Risk Assessment Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('loads risk assessment data', async () => {
    const mockRiskData = {
      success: true,
      riskMetrics: {
        volatility: 0.15,
        sharpeRatio: 1.2,
        maxDrawdown: 0.08,
        var95: 0.03,
        beta: 1.1,
        riskLevel: 'medium'
      },
      recommendations: [
        {
          type: 'info',
          message: 'Portfolio risk is within acceptable limits',
          action: 'maintain'
        }
      ]
    }
    
    const { callBack4AppFunction } = await import('../../back4app/config')
    callBack4AppFunction.mockResolvedValue(mockRiskData)
    
    render(<RiskWithProviders />)
    
    await waitFor(() => {
      expect(callBack4AppFunction).toHaveBeenCalledWith('riskAssessment', {
        portfolio: expect.any(Object)
      }, 'session123')
    })
  })

  it('displays risk metrics', async () => {
    const mockRiskData = {
      success: true,
      riskMetrics: {
        volatility: 0.15,
        sharpeRatio: 1.2,
        maxDrawdown: 0.08,
        var95: 0.03,
        beta: 1.1,
        riskLevel: 'medium'
      },
      recommendations: []
    }
    
    const { callBack4AppFunction } = await import('../../back4app/config')
    callBack4AppFunction.mockResolvedValue(mockRiskData)
    
    render(<RiskWithProviders />)
    
    await waitFor(() => {
      expect(screen.getByText('Risk Level')).toBeInTheDocument()
      expect(screen.getByText('Medium')).toBeInTheDocument()
      expect(screen.getByText('Volatility')).toBeInTheDocument()
      expect(screen.getByText('15%')).toBeInTheDocument()
    })
  })

  it('displays risk recommendations', async () => {
    const mockRiskData = {
      success: true,
      riskMetrics: {
        volatility: 0.15,
        sharpeRatio: 1.2,
        maxDrawdown: 0.08,
        var95: 0.03,
        beta: 1.1,
        riskLevel: 'medium'
      },
      recommendations: [
        {
          type: 'warning',
          message: 'High volatility detected. Consider reducing position sizes.',
          action: 'reduce_exposure'
        },
        {
          type: 'info',
          message: 'Portfolio diversification is good.',
          action: 'maintain'
        }
      ]
    }
    
    const { callBack4AppFunction } = await import('../../back4app/config')
    callBack4AppFunction.mockResolvedValue(mockRiskData)
    
    render(<RiskWithProviders />)
    
    await waitFor(() => {
      expect(screen.getByText('High volatility detected. Consider reducing position sizes.')).toBeInTheDocument()
      expect(screen.getByText('Portfolio diversification is good.')).toBeInTheDocument()
    })
  })

  it('handles risk assessment error', async () => {
    const { callBack4AppFunction } = await import('../../back4app/config')
    callBack4AppFunction.mockRejectedValue(new Error('Failed to assess risk'))
    
    render(<RiskWithProviders />)
    
    await waitFor(() => {
      expect(screen.getByText(/failed to assess risk/i)).toBeInTheDocument()
    })
  })

  it('refreshes risk assessment', async () => {
    const mockRiskData = {
      success: true,
      riskMetrics: {
        volatility: 0.15,
        sharpeRatio: 1.2,
        maxDrawdown: 0.08,
        var95: 0.03,
        beta: 1.1,
        riskLevel: 'medium'
      },
      recommendations: []
    }
    
    const { callBack4AppFunction } = await import('../../back4app/config')
    callBack4AppFunction.mockResolvedValue(mockRiskData)
    
    render(<RiskWithProviders />)
    
    const refreshButton = screen.getByRole('button', { name: /refresh risk assessment/i })
    fireEvent.click(refreshButton)
    
    await waitFor(() => {
      expect(callBack4AppFunction).toHaveBeenCalledTimes(2) // Once on mount, once on refresh
    })
  })
})
