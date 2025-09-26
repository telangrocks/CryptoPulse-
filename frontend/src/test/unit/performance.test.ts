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

const PerformanceWithProviders = () => (
  <BrowserRouter>
    <AuthProvider>
      <AppStateProvider>
        <Dashboard />
      </AppStateProvider>
    </AuthProvider>
  </BrowserRouter>
)

describe('Performance Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('loads dashboard within acceptable time', async () => {
    const startTime = performance.now()
    
    render(<PerformanceWithProviders />)
    
    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument()
    })
    
    const endTime = performance.now()
    const loadTime = endTime - startTime
    
    // Dashboard should load within 1 second
    expect(loadTime).toBeLessThan(1000)
  })

  it('handles large datasets efficiently', async () => {
    const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
      id: i,
      name: `Item ${i}`,
      value: Math.random() * 1000
    }))
    
    const { callBack4AppFunction } = await import('../../back4app/config')
    callBack4AppFunction.mockResolvedValue({
      success: true,
      data: largeDataset
    })
    
    const startTime = performance.now()
    
    render(<PerformanceWithProviders />)
    
    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument()
    })
    
    const endTime = performance.now()
    const loadTime = endTime - startTime
    
    // Should handle large datasets within 2 seconds
    expect(loadTime).toBeLessThan(2000)
  })

  it('implements lazy loading for charts', async () => {
    render(<PerformanceWithProviders />)
    
    // Check that charts are not rendered immediately
    expect(screen.queryByTestId('chart-container')).not.toBeInTheDocument()
    
    // Scroll to trigger lazy loading
    fireEvent.scroll(window, { target: { scrollY: 1000 } })
    
    await waitFor(() => {
      expect(screen.getByTestId('chart-container')).toBeInTheDocument()
    })
  })

  it('caches API responses', async () => {
    const { callBack4AppFunction } = await import('../../back4app/config')
    callBack4AppFunction.mockResolvedValue({
      success: true,
      data: { price: 45000 }
    })
    
    render(<PerformanceWithProviders />)
    
    // First call
    await waitFor(() => {
      expect(callBack4AppFunction).toHaveBeenCalledWith('getCurrentPrice', {
        pair: 'BTC/USDT'
      }, 'session123')
    })
    
    // Second call should use cache
    const refreshButton = screen.getByRole('button', { name: /refresh/i })
    fireEvent.click(refreshButton)
    
    // Should not make another API call due to caching
    expect(callBack4AppFunction).toHaveBeenCalledTimes(1)
  })

  it('handles memory leaks', async () => {
    const initialMemory = performance.memory?.usedJSHeapSize || 0
    
    render(<PerformanceWithProviders />)
    
    // Simulate multiple renders
    for (let i = 0; i < 100; i++) {
      fireEvent.click(screen.getByRole('button', { name: /refresh/i }))
    }
    
    const finalMemory = performance.memory?.usedJSHeapSize || 0
    const memoryIncrease = finalMemory - initialMemory
    
    // Memory increase should be reasonable (less than 10MB)
    expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024)
  })
})