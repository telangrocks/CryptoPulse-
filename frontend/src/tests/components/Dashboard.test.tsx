// =============================================================================
// Dashboard Component Tests - Production Ready
// =============================================================================
// Comprehensive unit tests for the Dashboard component

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import Dashboard from '../../components/Dashboard';
import { AppStateContext } from '../../contexts/AppStateContext';

// Mock dependencies
vi.mock('../../lib/api', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../../hooks/useAuthenticatedAPI', () => ({
  useAuthenticatedAPI: () => ({
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  }),
}));

vi.mock('../../hooks/useAIAssistant', () => ({
  useAIAssistant: () => ({
    sendMessage: vi.fn(),
    isLoading: false,
    messages: [],
  }),
}));

// Mock Redux store
const createMockStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      auth: (state = { user: null, isAuthenticated: false }, action) => state,
      trading: (state = { sessions: [], positions: [] }, action) => state,
      market: (state = { prices: {}, trends: {} }, action) => state,
      ...initialState,
    },
  });
};

// Mock context provider
const MockAppStateProvider = ({ children, value = {} }: any) => {
  const defaultValue = {
    theme: 'light',
    setTheme: vi.fn(),
    notifications: [],
    addNotification: vi.fn(),
    removeNotification: vi.fn(),
    ...value,
  };

  return (
    <AppStateContext.Provider value={defaultValue}>
      {children}
    </AppStateContext.Provider>
  );
};

// Test wrapper component
const TestWrapper = ({ children, store, appStateValue }: any) => (
  <BrowserRouter>
    <Provider store={store}>
      <MockAppStateProvider value={appStateValue}>
        {children}
      </MockAppStateProvider>
    </Provider>
  </BrowserRouter>
);

describe('Dashboard Component', () => {
  let mockStore: any;

  beforeEach(() => {
    mockStore = createMockStore({
      auth: {
        user: {
          id: 'user123',
          email: 'test@example.com',
          name: 'Test User',
        },
        isAuthenticated: true,
      },
      trading: {
        sessions: [
          {
            id: 'session1',
            name: 'Test Session',
            status: 'active',
            exchange: 'binance',
            strategy: 'test-strategy',
          },
        ],
        positions: [
          {
            id: 'position1',
            symbol: 'BTC/USDT',
            side: 'long',
            size: 0.1,
            price: 50000,
            pnl: 100,
          },
        ],
      },
      market: {
        prices: {
          'BTC/USDT': 50000,
          'ETH/USDT': 3000,
        },
        trends: {
          'BTC/USDT': 'up',
          'ETH/USDT': 'down',
        },
      },
    });

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Rendering', () => {
    test('should render dashboard with user information', () => {
      render(
        <TestWrapper store={mockStore}>
          <Dashboard />
        </TestWrapper>
      );

      expect(screen.getByText('Test User')).toBeInTheDocument();
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
    });

    test('should render trading sessions', () => {
      render(
        <TestWrapper store={mockStore}>
          <Dashboard />
        </TestWrapper>
      );

      expect(screen.getByText('Test Session')).toBeInTheDocument();
      expect(screen.getByText('active')).toBeInTheDocument();
      expect(screen.getByText('binance')).toBeInTheDocument();
    });

    test('should render trading positions', () => {
      render(
        <TestWrapper store={mockStore}>
          <Dashboard />
        </TestWrapper>
      );

      expect(screen.getByText('BTC/USDT')).toBeInTheDocument();
      expect(screen.getByText('long')).toBeInTheDocument();
      expect(screen.getByText('0.1')).toBeInTheDocument();
      expect(screen.getByText('$50000')).toBeInTheDocument();
    });

    test('should render market prices', () => {
      render(
        <TestWrapper store={mockStore}>
          <Dashboard />
        </TestWrapper>
      );

      expect(screen.getByText('$50000')).toBeInTheDocument();
      expect(screen.getByText('$3000')).toBeInTheDocument();
    });

    test('should render dashboard sections', () => {
      render(
        <TestWrapper store={mockStore}>
          <Dashboard />
        </TestWrapper>
      );

      expect(screen.getByText('Trading Overview')).toBeInTheDocument();
      expect(screen.getByText('Active Sessions')).toBeInTheDocument();
      expect(screen.getByText('Open Positions')).toBeInTheDocument();
      expect(screen.getByText('Market Prices')).toBeInTheDocument();
    });

    test('should render with dark theme', () => {
      const darkThemeValue = {
        theme: 'dark',
        setTheme: vi.fn(),
      };

      render(
        <TestWrapper store={mockStore} appStateValue={darkThemeValue}>
          <Dashboard />
        </TestWrapper>
      );

      // Check if dark theme classes are applied
      const dashboard = screen.getByTestId('dashboard');
      expect(dashboard).toHaveClass('dark');
    });
  });

  describe('User Interactions', () => {
    test('should handle session start', async () => {
      const mockPost = vi.fn().mockResolvedValue({ data: { success: true } });
      const { useAuthenticatedAPI } = await import('../../hooks/useAuthenticatedAPI');
      vi.mocked(useAuthenticatedAPI).mockReturnValue({
        post: mockPost,
        get: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
      });

      render(
        <TestWrapper store={mockStore}>
          <Dashboard />
        </TestWrapper>
      );

      const startButton = screen.getByText('Start New Session');
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(mockPost).toHaveBeenCalledWith('/api/trading/sessions', {
          name: expect.any(String),
          exchange: expect.any(String),
          strategy: expect.any(String),
        });
      });
    });

    test('should handle session stop', async () => {
      const mockDelete = vi.fn().mockResolvedValue({ data: { success: true } });
      const { useAuthenticatedAPI } = await import('../../hooks/useAuthenticatedAPI');
      vi.mocked(useAuthenticatedAPI).mockReturnValue({
        delete: mockDelete,
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
      });

      render(
        <TestWrapper store={mockStore}>
          <Dashboard />
        </TestWrapper>
      );

      const stopButton = screen.getByText('Stop Session');
      fireEvent.click(stopButton);

      await waitFor(() => {
        expect(mockDelete).toHaveBeenCalledWith('/api/trading/sessions/session1');
      });
    });

    test('should handle position close', async () => {
      const mockPost = vi.fn().mockResolvedValue({ data: { success: true } });
      const { useAuthenticatedAPI } = await import('../../hooks/useAuthenticatedAPI');
      vi.mocked(useAuthenticatedAPI).mockReturnValue({
        post: mockPost,
        get: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
      });

      render(
        <TestWrapper store={mockStore}>
          <Dashboard />
        </TestWrapper>
      );

      const closeButton = screen.getByText('Close Position');
      fireEvent.click(closeButton);

      await waitFor(() => {
        expect(mockPost).toHaveBeenCalledWith('/api/trading/positions/position1/close');
      });
    });

    test('should handle theme toggle', () => {
      const mockSetTheme = vi.fn();
      const appStateValue = {
        theme: 'light',
        setTheme: mockSetTheme,
      };

      render(
        <TestWrapper store={mockStore} appStateValue={appStateValue}>
          <Dashboard />
        </TestWrapper>
      );

      const themeToggle = screen.getByText('Toggle Theme');
      fireEvent.click(themeToggle);

      expect(mockSetTheme).toHaveBeenCalledWith('dark');
    });

    test('should handle refresh data', async () => {
      const mockGet = vi.fn().mockResolvedValue({ data: {} });
      const { useAuthenticatedAPI } = await import('../../hooks/useAuthenticatedAPI');
      vi.mocked(useAuthenticatedAPI).mockReturnValue({
        get: mockGet,
        post: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
      });

      render(
        <TestWrapper store={mockStore}>
          <Dashboard />
        </TestWrapper>
      );

      const refreshButton = screen.getByText('Refresh Data');
      fireEvent.click(refreshButton);

      await waitFor(() => {
        expect(mockGet).toHaveBeenCalledWith('/api/trading/sessions');
        expect(mockGet).toHaveBeenCalledWith('/api/trading/positions');
        expect(mockGet).toHaveBeenCalledWith('/api/market/prices');
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle API errors gracefully', async () => {
      const mockGet = vi.fn().mockRejectedValue(new Error('API Error'));
      const { useAuthenticatedAPI } = await import('../../hooks/useAuthenticatedAPI');
      vi.mocked(useAuthenticatedAPI).mockReturnValue({
        get: mockGet,
        post: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
      });

      render(
        <TestWrapper store={mockStore}>
          <Dashboard />
        </TestWrapper>
      );

      const refreshButton = screen.getByText('Refresh Data');
      fireEvent.click(refreshButton);

      await waitFor(() => {
        expect(screen.getByText('Error loading data')).toBeInTheDocument();
      });
    });

    test('should handle network errors', async () => {
      const mockPost = vi.fn().mockRejectedValue(new Error('Network Error'));
      const { useAuthenticatedAPI } = await import('../../hooks/useAuthenticatedAPI');
      vi.mocked(useAuthenticatedAPI).mockReturnValue({
        post: mockPost,
        get: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
      });

      render(
        <TestWrapper store={mockStore}>
          <Dashboard />
        </TestWrapper>
      );

      const startButton = screen.getByText('Start New Session');
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(screen.getByText('Failed to start session')).toBeInTheDocument();
      });
    });

    test('should handle validation errors', async () => {
      const mockPost = vi.fn().mockRejectedValue({
        response: {
          status: 400,
          data: { error: 'Validation failed', details: ['Name is required'] },
        },
      });
      const { useAuthenticatedAPI } = await import('../../hooks/useAuthenticatedAPI');
      vi.mocked(useAuthenticatedAPI).mockReturnValue({
        post: mockPost,
        get: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
      });

      render(
        <TestWrapper store={mockStore}>
          <Dashboard />
        </TestWrapper>
      );

      const startButton = screen.getByText('Start New Session');
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(screen.getByText('Validation failed')).toBeInTheDocument();
        expect(screen.getByText('Name is required')).toBeInTheDocument();
      });
    });

    test('should handle unauthorized errors', async () => {
      const mockGet = vi.fn().mockRejectedValue({
        response: {
          status: 401,
          data: { error: 'Unauthorized' },
        },
      });
      const { useAuthenticatedAPI } = await import('../../hooks/useAuthenticatedAPI');
      vi.mocked(useAuthenticatedAPI).mockReturnValue({
        get: mockGet,
        post: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
      });

      render(
        <TestWrapper store={mockStore}>
          <Dashboard />
        </TestWrapper>
      );

      const refreshButton = screen.getByText('Refresh Data');
      fireEvent.click(refreshButton);

      await waitFor(() => {
        expect(screen.getByText('Session expired. Please login again.')).toBeInTheDocument();
      });
    });
  });

  describe('Loading States', () => {
    test('should show loading state during data fetch', async () => {
      const mockGet = vi.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ data: {} }), 100))
      );
      const { useAuthenticatedAPI } = await import('../../hooks/useAuthenticatedAPI');
      vi.mocked(useAuthenticatedAPI).mockReturnValue({
        get: mockGet,
        post: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
      });

      render(
        <TestWrapper store={mockStore}>
          <Dashboard />
        </TestWrapper>
      );

      const refreshButton = screen.getByText('Refresh Data');
      fireEvent.click(refreshButton);

      expect(screen.getByText('Loading...')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });
    });

    test('should show loading state during session start', async () => {
      const mockPost = vi.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ data: { success: true } }), 100))
      );
      const { useAuthenticatedAPI } = await import('../../hooks/useAuthenticatedAPI');
      vi.mocked(useAuthenticatedAPI).mockReturnValue({
        post: mockPost,
        get: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
      });

      render(
        <TestWrapper store={mockStore}>
          <Dashboard />
        </TestWrapper>
      );

      const startButton = screen.getByText('Start New Session');
      fireEvent.click(startButton);

      expect(screen.getByText('Starting session...')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.queryByText('Starting session...')).not.toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    test('should have proper ARIA labels', () => {
      render(
        <TestWrapper store={mockStore}>
          <Dashboard />
        </TestWrapper>
      );

      expect(screen.getByLabelText('Trading Overview')).toBeInTheDocument();
      expect(screen.getByLabelText('Active Sessions')).toBeInTheDocument();
      expect(screen.getByLabelText('Open Positions')).toBeInTheDocument();
      expect(screen.getByLabelText('Market Prices')).toBeInTheDocument();
    });

    test('should support keyboard navigation', () => {
      render(
        <TestWrapper store={mockStore}>
          <Dashboard />
        </TestWrapper>
      );

      const startButton = screen.getByText('Start New Session');
      startButton.focus();
      expect(startButton).toHaveFocus();

      fireEvent.keyDown(startButton, { key: 'Enter' });
      // Should trigger the click event
    });

    test('should have proper focus management', () => {
      render(
        <TestWrapper store={mockStore}>
          <Dashboard />
        </TestWrapper>
      );

      const firstButton = screen.getByText('Start New Session');
      firstButton.focus();
      expect(firstButton).toHaveFocus();

      fireEvent.keyDown(firstButton, { key: 'Tab' });
      // Focus should move to next focusable element
    });
  });

  describe('Performance', () => {
    test('should handle large datasets efficiently', () => {
      const largeStore = createMockStore({
        auth: {
          user: { id: 'user123', email: 'test@example.com', name: 'Test User' },
          isAuthenticated: true,
        },
        trading: {
          sessions: Array.from({ length: 1000 }, (_, i) => ({
            id: `session${i}`,
            name: `Session ${i}`,
            status: 'active',
            exchange: 'binance',
            strategy: 'test-strategy',
          })),
          positions: Array.from({ length: 1000 }, (_, i) => ({
            id: `position${i}`,
            symbol: `SYMBOL${i}/USDT`,
            side: 'long',
            size: 0.1,
            price: 50000,
            pnl: 100,
          })),
        },
        market: {
          prices: Object.fromEntries(
            Array.from({ length: 1000 }, (_, i) => [`SYMBOL${i}/USDT`, 50000])
          ),
          trends: Object.fromEntries(
            Array.from({ length: 1000 }, (_, i) => [`SYMBOL${i}/USDT`, 'up'])
          ),
        },
      });

      const start = Date.now();
      render(
        <TestWrapper store={largeStore}>
          <Dashboard />
        </TestWrapper>
      );
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(1000); // Should render within 1 second
    });

    test('should handle rapid state updates', async () => {
      const mockGet = vi.fn().mockResolvedValue({ data: {} });
      const { useAuthenticatedAPI } = await import('../../hooks/useAuthenticatedAPI');
      vi.mocked(useAuthenticatedAPI).mockReturnValue({
        get: mockGet,
        post: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
      });

      render(
        <TestWrapper store={mockStore}>
          <Dashboard />
        </TestWrapper>
      );

      const refreshButton = screen.getByText('Refresh Data');

      // Rapid clicks
      for (let i = 0; i < 10; i++) {
        fireEvent.click(refreshButton);
      }

      await waitFor(() => {
        expect(mockGet).toHaveBeenCalledTimes(10);
      });
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty state', () => {
      const emptyStore = createMockStore({
        auth: {
          user: { id: 'user123', email: 'test@example.com', name: 'Test User' },
          isAuthenticated: true,
        },
        trading: {
          sessions: [],
          positions: [],
        },
        market: {
          prices: {},
          trends: {},
        },
      });

      render(
        <TestWrapper store={emptyStore}>
          <Dashboard />
        </TestWrapper>
      );

      expect(screen.getByText('No active sessions')).toBeInTheDocument();
      expect(screen.getByText('No open positions')).toBeInTheDocument();
      expect(screen.getByText('No market data available')).toBeInTheDocument();
    });

    test('should handle null user', () => {
      const nullUserStore = createMockStore({
        auth: {
          user: null,
          isAuthenticated: false,
        },
      });

      render(
        <TestWrapper store={nullUserStore}>
          <Dashboard />
        </TestWrapper>
      );

      expect(screen.getByText('Please login to view your dashboard')).toBeInTheDocument();
    });

    test('should handle malformed data', () => {
      const malformedStore = createMockStore({
        auth: {
          user: { id: 'user123', email: 'test@example.com', name: 'Test User' },
          isAuthenticated: true,
        },
        trading: {
          sessions: [
            {
              id: 'session1',
              name: null,
              status: undefined,
              exchange: 'binance',
              strategy: 'test-strategy',
            },
          ],
          positions: [
            {
              id: 'position1',
              symbol: 'BTC/USDT',
              side: 'long',
              size: 'invalid',
              price: null,
              pnl: undefined,
            },
          ],
        },
      });

      render(
        <TestWrapper store={malformedStore}>
          <Dashboard />
        </TestWrapper>
      );

      // Should handle malformed data gracefully
      expect(screen.getByText('binance')).toBeInTheDocument();
      expect(screen.getByText('BTC/USDT')).toBeInTheDocument();
    });
  });
});