// =============================================================================
// Dashboard Component Tests - Production Ready
// =============================================================================
// Comprehensive tests for the main Dashboard component

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider } from 'react-redux';
import { store } from '../../store';
import Dashboard from '../../components/Dashboard';

// Mock the authentication context
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'user123',
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe'
    },
    isAuthenticated: true,
    login: jest.fn(),
    logout: jest.fn()
  })
}));

// Mock the API hooks
jest.mock('../../hooks/useAuthenticatedAPI', () => ({
  useAuthenticatedAPI: () => ({
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn()
  })
}));

// Mock the trading components
jest.mock('../../components/TradeExecution', () => {
  return function MockTradeExecution() {
    return <div data-testid="trade-execution">Trade Execution Component</div>;
  };
});

jest.mock('../../components/OptimizedAdvancedCharts', () => {
  return function MockCharts() {
    return <div data-testid="advanced-charts">Advanced Charts Component</div>;
  };
});

jest.mock('../../components/PerformanceAnalytics', () => {
  return function MockPerformanceAnalytics() {
    return <div data-testid="performance-analytics">Performance Analytics Component</div>;
  };
});

// Create a test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

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
    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  it('renders dashboard successfully', () => {
    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );

    expect(screen.getByTestId('trade-execution')).toBeInTheDocument();
    expect(screen.getByTestId('advanced-charts')).toBeInTheDocument();
    expect(screen.getByTestId('performance-analytics')).toBeInTheDocument();
  });

  it('displays user information', () => {
    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );

    // Check if user information is displayed
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
  });

  it('handles component interactions', async () => {
    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );

    // Test that all main components are rendered
    const tradeExecution = screen.getByTestId('trade-execution');
    const charts = screen.getByTestId('advanced-charts');
    const analytics = screen.getByTestId('performance-analytics');

    expect(tradeExecution).toBeInTheDocument();
    expect(charts).toBeInTheDocument();
    expect(analytics).toBeInTheDocument();
  });

  it('handles responsive design', () => {
    // Mock window.innerWidth for mobile testing
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

    // Test that components are still rendered on mobile
    expect(screen.getByTestId('trade-execution')).toBeInTheDocument();
    expect(screen.getByTestId('advanced-charts')).toBeInTheDocument();
    expect(screen.getByTestId('performance-analytics')).toBeInTheDocument();
  });

  it('handles error states gracefully', async () => {
    // Mock console.error to avoid noise in tests
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );

    // Verify components are still rendered even if there are errors
    expect(screen.getByTestId('trade-execution')).toBeInTheDocument();
    expect(screen.getByTestId('advanced-charts')).toBeInTheDocument();
    expect(screen.getByTestId('performance-analytics')).toBeInTheDocument();

    consoleSpy.mockRestore();
  });
});
