import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '../../contexts/AuthContext'
import { AppStateProvider } from '../../contexts/AppStateContext'
import TradeExecution from '../../components/TradeExecution'

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

const TradingWithProviders = () => (
  <BrowserRouter>
    <AuthProvider>
      <AppStateProvider>
        <TradeExecution />
      </AppStateProvider>
    </AuthProvider>
  </BrowserRouter>
)

describe('Trading Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders trading form', () => {
    render(<TradingWithProviders />)
    expect(screen.getByText('Execute Trade')).toBeInTheDocument()
  })

  it('validates trading pair selection', async () => {
    render(<TradingWithProviders />)
    const pairSelect = screen.getByLabelText('Trading Pair')
    const submitButton = screen.getByRole('button', { name: /execute trade/i })
    
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/please select a trading pair/i)).toBeInTheDocument()
    })
  })

  it('validates amount input', async () => {
    render(<TradingWithProviders />)
    const amountInput = screen.getByLabelText('Amount')
    const submitButton = screen.getByRole('button', { name: /execute trade/i })
    
    fireEvent.change(amountInput, { target: { value: '0' } })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/amount must be greater than 0/i)).toBeInTheDocument()
    })
  })

  it('validates strategy selection', async () => {
    render(<TradingWithProviders />)
    const strategySelect = screen.getByLabelText('Strategy')
    const submitButton = screen.getByRole('button', { name: /execute trade/i })
    
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/please select a strategy/i)).toBeInTheDocument()
    })
  })

  it('handles successful trade execution', async () => {
    const mockTradeResult = {
      success: true,
      result: {
        orderId: 'order123',
        status: 'executed',
        executionPrice: 45000,
        executedAmount: 0.1
      }
    }
    
    const { callBack4AppFunction } = await import('../../back4app/config')
    callBack4AppFunction.mockResolvedValue(mockTradeResult)
    
    render(<TradingWithProviders />)
    
    const pairSelect = screen.getByLabelText('Trading Pair')
    const amountInput = screen.getByLabelText('Amount')
    const strategySelect = screen.getByLabelText('Strategy')
    const actionSelect = screen.getByLabelText('Action')
    const submitButton = screen.getByRole('button', { name: /execute trade/i })
    
    fireEvent.change(pairSelect, { target: { value: 'BTC/USDT' } })
    fireEvent.change(amountInput, { target: { value: '0.1' } })
    fireEvent.change(strategySelect, { target: { value: 'conservative' } })
    fireEvent.change(actionSelect, { target: { value: 'BUY' } })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(callBack4AppFunction).toHaveBeenCalledWith('tradingBot', {
        action: 'BUY',
        pair: 'BTC/USDT',
        amount: 0.1,
        strategy: 'conservative'
      }, 'session123')
    })
    
    await waitFor(() => {
      expect(screen.getByText(/trade executed successfully/i)).toBeInTheDocument()
    })
  })

  it('handles trade execution error', async () => {
    const { callBack4AppFunction } = await import('../../back4app/config')
    callBack4AppFunction.mockRejectedValue(new Error('Insufficient balance'))
    
    render(<TradingWithProviders />)
    
    const pairSelect = screen.getByLabelText('Trading Pair')
    const amountInput = screen.getByLabelText('Amount')
    const strategySelect = screen.getByLabelText('Strategy')
    const actionSelect = screen.getByLabelText('Action')
    const submitButton = screen.getByRole('button', { name: /execute trade/i })
    
    fireEvent.change(pairSelect, { target: { value: 'BTC/USDT' } })
    fireEvent.change(amountInput, { target: { value: '0.1' } })
    fireEvent.change(strategySelect, { target: { value: 'conservative' } })
    fireEvent.change(actionSelect, { target: { value: 'BUY' } })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/insufficient balance/i)).toBeInTheDocument()
    })
  })
})
