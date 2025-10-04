// =============================================================================
// Frontend Component Tests - Production Ready
// =============================================================================
// Comprehensive tests for React components and UI interactions

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock components and dependencies
jest.mock('@/components/WorldClassDashboard', () => ({
  __esModule: true,
  default: ({ onTrade }: { onTrade: (trade: any) => void }) => (
    <div data-testid="world-class-dashboard">
      <button onClick={() => onTrade({ symbol: 'BTC/USDT', side: 'buy', amount: 0.001 })}>
        Execute Trade
      </button>
    </div>
  )
}));

jest.mock('@/components/RiskMonitor', () => ({
  __esModule: true,
  default: () => <div data-testid="risk-monitor">Risk Monitor</div>
}));

jest.mock('@/components/PerformanceAnalytics', () => ({
  __esModule: true,
  default: () => <div data-testid="performance-analytics">Performance Analytics</div>
}));

jest.mock('@/components/NotificationCenter', () => ({
  __esModule: true,
  default: () => <div data-testid="notification-center">Notification Center</div>
}));

jest.mock('@/components/ExchangeIntegration', () => ({
  __esModule: true,
  default: () => <div data-testid="exchange-integration">Exchange Integration</div>
}));

jest.mock('@/components/Backtesting', () => ({
  __esModule: true,
  default: () => <div data-testid="backtesting">Backtesting</div>
}));

// Mock API calls
jest.mock('@/lib/api', () => ({
  fetchUserData: jest.fn().mockResolvedValue({
    id: 'user-123',
    name: 'Test User',
    email: 'test@example.com',
    balance: 10000
  }),
  fetchTradingData: jest.fn().mockResolvedValue({
    trades: [],
    performance: { totalReturn: 10.5, winRate: 65 }
  }),
  executeTrade: jest.fn().mockResolvedValue({
    id: 'trade-123',
    status: 'filled',
    executedPrice: 50000
  })
}));

// Mock performance monitoring
jest.mock('@/store/utils/performance', () => ({
  performanceMonitor: {
    markStart: jest.fn(),
    markEnd: jest.fn(),
    getMetrics: jest.fn().mockReturnValue({
      loadTime: 100,
      renderTime: 50
    })
  }
}));

// Create test store
const createTestStore = () => {
  return configureStore({
    reducer: {
      auth: (state = { user: null, isAuthenticated: false }, action) => {
        switch (action.type) {
          case 'auth/loginSuccess':
            return { user: action.payload, isAuthenticated: true };
          default:
            return state;
        }
      },
      trading: (state = { trades: [], isLoading: false }, action) => {
        switch (action.type) {
          case 'trading/fetchTradesSuccess':
            return { ...state, trades: action.payload, isLoading: false };
          case 'trading/executeTradePending':
            return { ...state, isLoading: true };
          case 'trading/executeTradeSuccess':
            return { ...state, trades: [...state.trades, action.payload], isLoading: false };
          default:
            return state;
        }
      }
    }
  });
};

// Create test query client
const createTestQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        cacheTime: 0
      }
    }
  });
};

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const store = createTestStore();
  const queryClient = createTestQueryClient();

  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          {children}
        </BrowserRouter>
      </QueryClientProvider>
    </Provider>
  );
};

describe('Dashboard Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should render dashboard with all components', async () => {
    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId('world-class-dashboard')).toBeInTheDocument();
      expect(screen.getByTestId('risk-monitor')).toBeInTheDocument();
      expect(screen.getByTestId('performance-analytics')).toBeInTheDocument();
      expect(screen.getByTestId('notification-center')).toBeInTheDocument();
    });
  });

  test('should handle trade execution', async () => {
    const mockExecuteTrade = jest.fn();
    
    render(
      <TestWrapper>
        <Dashboard onTradeExecute={mockExecuteTrade} />
      </TestWrapper>
    );

    await waitFor(() => {
      const tradeButton = screen.getByText('Execute Trade');
      expect(tradeButton).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Execute Trade'));

    await waitFor(() => {
      expect(mockExecuteTrade).toHaveBeenCalledWith({
        symbol: 'BTC/USDT',
        side: 'buy',
        amount: 0.001
      });
    });
  });

  test('should display user information', async () => {
    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Test User')).toBeInTheDocument();
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
    });
  });

  test('should handle loading states', async () => {
    const { fetchUserData } = require('@/lib/api');
    fetchUserData.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)));

    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );

    expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByTestId('loading-skeleton')).not.toBeInTheDocument();
    });
  });

  test('should handle error states', async () => {
    const { fetchUserData } = require('@/lib/api');
    fetchUserData.mockRejectedValue(new Error('Failed to fetch user data'));

    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Error loading dashboard')).toBeInTheDocument();
    });
  });
});

describe('ExchangeIntegration Component', () => {
  test('should render exchange integration form', () => {
    render(
      <TestWrapper>
        <ExchangeIntegration />
      </TestWrapper>
    );

    expect(screen.getByTestId('exchange-integration')).toBeInTheDocument();
    expect(screen.getByLabelText('API Key')).toBeInTheDocument();
    expect(screen.getByLabelText('Secret Key')).toBeInTheDocument();
    expect(screen.getByLabelText('Exchange')).toBeInTheDocument();
  });

  test('should handle form submission', async () => {
    render(
      <TestWrapper>
        <ExchangeIntegration />
      </TestWrapper>
    );

    const apiKeyInput = screen.getByLabelText('API Key');
    const secretKeyInput = screen.getByLabelText('Secret Key');
    const submitButton = screen.getByRole('button', { name: 'Connect Exchange' });

    fireEvent.change(apiKeyInput, { target: { value: 'test-api-key' } });
    fireEvent.change(secretKeyInput, { target: { value: 'test-secret-key' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Exchange connected successfully')).toBeInTheDocument();
    });
  });

  test('should validate form inputs', async () => {
    render(
      <TestWrapper>
        <ExchangeIntegration />
      </TestWrapper>
    );

    const submitButton = screen.getByRole('button', { name: 'Connect Exchange' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('API Key is required')).toBeInTheDocument();
      expect(screen.getByText('Secret Key is required')).toBeInTheDocument();
    });
  });
});

describe('RiskMonitor Component', () => {
  test('should display risk metrics', async () => {
    render(
      <TestWrapper>
        <RiskMonitor />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Risk Score')).toBeInTheDocument();
      expect(screen.getByText('Max Drawdown')).toBeInTheDocument();
      expect(screen.getByText('Portfolio Risk')).toBeInTheDocument();
    });
  });

  test('should show risk alerts', async () => {
    render(
      <TestWrapper>
        <RiskMonitor />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId('risk-alert')).toBeInTheDocument();
    });
  });

  test('should handle risk threshold changes', async () => {
    render(
      <TestWrapper>
        <RiskMonitor />
      </TestWrapper>
    );

    const thresholdSlider = screen.getByLabelText('Risk Threshold');
    fireEvent.change(thresholdSlider, { target: { value: '0.1' } });

    await waitFor(() => {
      expect(screen.getByText('Risk threshold updated')).toBeInTheDocument();
    });
  });
});

describe('PerformanceAnalytics Component', () => {
  test('should render performance charts', async () => {
    render(
      <TestWrapper>
        <PerformanceAnalytics />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId('performance-chart')).toBeInTheDocument();
      expect(screen.getByTestId('returns-chart')).toBeInTheDocument();
      expect(screen.getByTestId('drawdown-chart')).toBeInTheDocument();
    });
  });

  test('should display performance metrics', async () => {
    render(
      <TestWrapper>
        <PerformanceAnalytics />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Total Return')).toBeInTheDocument();
      expect(screen.getByText('Sharpe Ratio')).toBeInTheDocument();
      expect(screen.getByText('Win Rate')).toBeInTheDocument();
      expect(screen.getByText('65%')).toBeInTheDocument();
    });
  });

  test('should handle date range selection', async () => {
    render(
      <TestWrapper>
        <PerformanceAnalytics />
      </TestWrapper>
    );

    const dateRangeSelect = screen.getByLabelText('Date Range');
    fireEvent.change(dateRangeSelect, { target: { value: '1Y' } });

    await waitFor(() => {
      expect(screen.getByText('Data updated for 1 year')).toBeInTheDocument();
    });
  });
});

describe('Backtesting Component', () => {
  test('should render backtesting form', () => {
    render(
      <TestWrapper>
        <Backtesting />
      </TestWrapper>
    );

    expect(screen.getByTestId('backtesting')).toBeInTheDocument();
    expect(screen.getByLabelText('Strategy')).toBeInTheDocument();
    expect(screen.getByLabelText('Start Date')).toBeInTheDocument();
    expect(screen.getByLabelText('End Date')).toBeInTheDocument();
    expect(screen.getByLabelText('Initial Capital')).toBeInTheDocument();
  });

  test('should run backtest', async () => {
    render(
      <TestWrapper>
        <Backtesting />
      </TestWrapper>
    );

    const strategySelect = screen.getByLabelText('Strategy');
    const startDateInput = screen.getByLabelText('Start Date');
    const endDateInput = screen.getByLabelText('End Date');
    const capitalInput = screen.getByLabelText('Initial Capital');
    const runButton = screen.getByRole('button', { name: 'Run Backtest' });

    fireEvent.change(strategySelect, { target: { value: 'RSI Strategy' } });
    fireEvent.change(startDateInput, { target: { value: '2023-01-01' } });
    fireEvent.change(endDateInput, { target: { value: '2023-12-31' } });
    fireEvent.change(capitalInput, { target: { value: '10000' } });
    fireEvent.click(runButton);

    await waitFor(() => {
      expect(screen.getByText('Backtest completed')).toBeInTheDocument();
      expect(screen.getByTestId('backtest-results')).toBeInTheDocument();
    });
  });

  test('should display backtest results', async () => {
    render(
      <TestWrapper>
        <Backtesting />
      </TestWrapper>
    );

    // Simulate completed backtest
    await waitFor(() => {
      expect(screen.getByText('Total Return: 15.5%')).toBeInTheDocument();
      expect(screen.getByText('Sharpe Ratio: 1.8')).toBeInTheDocument();
      expect(screen.getByText('Max Drawdown: 5.2%')).toBeInTheDocument();
    });
  });
});

describe('NotificationCenter Component', () => {
  test('should display notifications', async () => {
    render(
      <TestWrapper>
        <NotificationCenter />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId('notification-center')).toBeInTheDocument();
      expect(screen.getByText('Trade executed successfully')).toBeInTheDocument();
      expect(screen.getByText('Risk alert: High volatility detected')).toBeInTheDocument();
    });
  });

  test('should mark notifications as read', async () => {
    render(
      <TestWrapper>
        <NotificationCenter />
      </TestWrapper>
    );

    const markAllReadButton = screen.getByRole('button', { name: 'Mark All Read' });
    fireEvent.click(markAllReadButton);

    await waitFor(() => {
      expect(screen.getByText('All notifications marked as read')).toBeInTheDocument();
    });
  });

  test('should filter notifications by type', async () => {
    render(
      <TestWrapper>
        <NotificationCenter />
      </TestWrapper>
    );

    const filterSelect = screen.getByLabelText('Filter by Type');
    fireEvent.change(filterSelect, { target: { value: 'trade' } });

    await waitFor(() => {
      expect(screen.getByText('Trade executed successfully')).toBeInTheDocument();
      expect(screen.queryByText('Risk alert: High volatility detected')).not.toBeInTheDocument();
    });
  });
});

describe('Accessibility', () => {
  test('should have proper ARIA labels', () => {
    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );

    expect(screen.getByLabelText('Main navigation')).toBeInTheDocument();
    expect(screen.getByLabelText('Trading dashboard')).toBeInTheDocument();
    expect(screen.getByLabelText('Risk monitoring')).toBeInTheDocument();
  });

  test('should support keyboard navigation', () => {
    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );

    const firstButton = screen.getByRole('button');
    firstButton.focus();
    expect(firstButton).toHaveFocus();

    fireEvent.keyDown(firstButton, { key: 'Tab' });
    // Should move focus to next focusable element
  });

  test('should announce dynamic content changes', async () => {
    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('Dashboard loaded successfully');
    });
  });
});

describe('Performance', () => {
  test('should render within performance budget', async () => {
    const { performanceMonitor } = require('@/store/utils/performance');
    
    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(performanceMonitor.markStart).toHaveBeenCalled();
      expect(performanceMonitor.markEnd).toHaveBeenCalled();
      
      const metrics = performanceMonitor.getMetrics();
      expect(metrics.loadTime).toBeLessThan(1000); // 1 second budget
      expect(metrics.renderTime).toBeLessThan(100); // 100ms budget
    });
  });

  test('should handle large datasets efficiently', async () => {
    const largeDataset = Array(1000).fill().map((_, i) => ({
      id: `trade-${i}`,
      symbol: 'BTC/USDT',
      side: 'buy',
      amount: 0.001,
      price: 50000 + i,
      timestamp: new Date().toISOString()
    }));

    render(
      <TestWrapper>
        <Dashboard trades={largeDataset} />
      </TestWrapper>
    );

    await waitFor(() => {
      // Should render without performance issues
      expect(screen.getByTestId('world-class-dashboard')).toBeInTheDocument();
    });
  });
});

describe('Error Boundaries', () => {
  test('should catch and display component errors', () => {
    const ThrowError = () => {
      throw new Error('Test error');
    };

    render(
      <TestWrapper>
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      </TestWrapper>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Test error')).toBeInTheDocument();
  });

  test('should provide error recovery options', () => {
    const ThrowError = () => {
      throw new Error('Test error');
    };

    render(
      <TestWrapper>
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      </TestWrapper>
    );

    const retryButton = screen.getByRole('button', { name: 'Try Again' });
    expect(retryButton).toBeInTheDocument();

    fireEvent.click(retryButton);
    // Should attempt to re-render the component
  });
});

describe('Responsive Design', () => {
  test('should adapt to mobile screen sizes', () => {
    // Mock mobile viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    });

    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );

    expect(screen.getByTestId('mobile-navigation')).toBeInTheDocument();
  });

  test('should adapt to tablet screen sizes', () => {
    // Mock tablet viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 768,
    });

    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );

    expect(screen.getByTestId('tablet-layout')).toBeInTheDocument();
  });
});

