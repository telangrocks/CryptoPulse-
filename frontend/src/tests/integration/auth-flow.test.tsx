// =============================================================================
// Authentication Flow Integration Tests - Production Ready
// =============================================================================
// Comprehensive integration tests for authentication flow

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { AuthProvider } from '../../contexts/AuthContext';
import App from '../../App';

// Mock dependencies
vi.mock('../../lib/api', () => ({
  apiClient: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

vi.mock('../../lib/secureStorage', () => ({
  SecureStorage: vi.fn().mockImplementation(() => ({
    set: vi.fn(),
    get: vi.fn(),
    clear: vi.fn(),
    clearAll: vi.fn(),
  })),
}));

// Mock Redux store
const createMockStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      auth: (state = { user: null, isAuthenticated: false }, action) => {
        switch (action.type) {
          case 'auth/loginSuccess':
            return { user: action.payload.user, isAuthenticated: true };
          case 'auth/logout':
            return { user: null, isAuthenticated: false };
          default:
            return state;
        }
      },
      ...initialState,
    },
  });
};

// Test wrapper component
const TestWrapper = ({ children, store }: any) => (
  <BrowserRouter>
    <Provider store={store}>
      <AuthProvider>
        {children}
      </AuthProvider>
    </Provider>
  </BrowserRouter>
);

describe('Authentication Flow Integration', () => {
  let mockStore: any;

  beforeEach(() => {
    mockStore = createMockStore();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('User Registration Flow', () => {
    test('should complete full registration flow', async () => {
      const { apiClient } = await import('../../lib/api');
      vi.mocked(apiClient.post).mockResolvedValue({
        data: {
          success: true,
          user: {
            id: 'user123',
            email: 'test@example.com',
            name: 'Test User',
          },
          tokens: {
            accessToken: 'access-token',
            refreshToken: 'refresh-token',
          },
        },
      });

      render(
        <TestWrapper store={mockStore}>
          <App />
        </TestWrapper>
      );

      // Navigate to registration page
      const registerLink = screen.getByText('Register');
      fireEvent.click(registerLink);

      await waitFor(() => {
        expect(screen.getByText('Create Account')).toBeInTheDocument();
      });

      // Fill registration form
      const nameInput = screen.getByLabelText('Full Name');
      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const confirmPasswordInput = screen.getByLabelText('Confirm Password');

      fireEvent.change(nameInput, { target: { value: 'Test User' } });
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'SecurePassword123!' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'SecurePassword123!' } });

      // Submit form
      const registerButton = screen.getByText('Create Account');
      fireEvent.click(registerButton);

      await waitFor(() => {
        expect(apiClient.post).toHaveBeenCalledWith('/api/auth/register', {
          name: 'Test User',
          email: 'test@example.com',
          password: 'SecurePassword123!',
        });
      });

      // Should redirect to dashboard
      await waitFor(() => {
        expect(screen.getByText('Welcome, Test User')).toBeInTheDocument();
      });
    });

    test('should handle registration validation errors', async () => {
      const { apiClient } = await import('../../lib/api');
      vi.mocked(apiClient.post).mockRejectedValue({
        response: {
          status: 400,
          data: {
            error: 'Validation failed',
            details: ['Invalid email format', 'Password is too weak'],
          },
        },
      });

      render(
        <TestWrapper store={mockStore}>
          <App />
        </TestWrapper>
      );

      // Navigate to registration page
      const registerLink = screen.getByText('Register');
      fireEvent.click(registerLink);

      await waitFor(() => {
        expect(screen.getByText('Create Account')).toBeInTheDocument();
      });

      // Fill form with invalid data
      const nameInput = screen.getByLabelText('Full Name');
      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');

      fireEvent.change(nameInput, { target: { value: 'Test User' } });
      fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
      fireEvent.change(passwordInput, { target: { value: 'weak' } });

      // Submit form
      const registerButton = screen.getByText('Create Account');
      fireEvent.click(registerButton);

      await waitFor(() => {
        expect(screen.getByText('Invalid email format')).toBeInTheDocument();
        expect(screen.getByText('Password is too weak')).toBeInTheDocument();
      });
    });

    test('should handle registration with existing email', async () => {
      const { apiClient } = await import('../../lib/api');
      vi.mocked(apiClient.post).mockRejectedValue({
        response: {
          status: 400,
          data: {
            error: 'User with this email already exists',
          },
        },
      });

      render(
        <TestWrapper store={mockStore}>
          <App />
        </TestWrapper>
      );

      // Navigate to registration page
      const registerLink = screen.getByText('Register');
      fireEvent.click(registerLink);

      await waitFor(() => {
        expect(screen.getByText('Create Account')).toBeInTheDocument();
      });

      // Fill form with existing email
      const nameInput = screen.getByLabelText('Full Name');
      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');

      fireEvent.change(nameInput, { target: { value: 'Test User' } });
      fireEvent.change(emailInput, { target: { value: 'existing@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'SecurePassword123!' } });

      // Submit form
      const registerButton = screen.getByText('Create Account');
      fireEvent.click(registerButton);

      await waitFor(() => {
        expect(screen.getByText('User with this email already exists')).toBeInTheDocument();
      });
    });
  });

  describe('User Login Flow', () => {
    test('should complete full login flow', async () => {
      const { apiClient } = await import('../../lib/api');
      vi.mocked(apiClient.post).mockResolvedValue({
        data: {
          success: true,
          user: {
            id: 'user123',
            email: 'test@example.com',
            name: 'Test User',
          },
          tokens: {
            accessToken: 'access-token',
            refreshToken: 'refresh-token',
          },
        },
      });

      render(
        <TestWrapper store={mockStore}>
          <App />
        </TestWrapper>
      );

      // Navigate to login page
      const loginLink = screen.getByText('Login');
      fireEvent.click(loginLink);

      await waitFor(() => {
        expect(screen.getByText('Sign In')).toBeInTheDocument();
      });

      // Fill login form
      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'SecurePassword123!' } });

      // Submit form
      const loginButton = screen.getByText('Sign In');
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(apiClient.post).toHaveBeenCalledWith('/api/auth/login', {
          email: 'test@example.com',
          password: 'SecurePassword123!',
        });
      });

      // Should redirect to dashboard
      await waitFor(() => {
        expect(screen.getByText('Welcome, Test User')).toBeInTheDocument();
      });
    });

    test('should handle login with invalid credentials', async () => {
      const { apiClient } = await import('../../lib/api');
      vi.mocked(apiClient.post).mockRejectedValue({
        response: {
          status: 401,
          data: {
            error: 'Invalid email or password',
          },
        },
      });

      render(
        <TestWrapper store={mockStore}>
          <App />
        </TestWrapper>
      );

      // Navigate to login page
      const loginLink = screen.getByText('Login');
      fireEvent.click(loginLink);

      await waitFor(() => {
        expect(screen.getByText('Sign In')).toBeInTheDocument();
      });

      // Fill login form with invalid credentials
      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'WrongPassword123!' } });

      // Submit form
      const loginButton = screen.getByText('Sign In');
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(screen.getByText('Invalid email or password')).toBeInTheDocument();
      });
    });

    test('should handle login with missing fields', async () => {
      render(
        <TestWrapper store={mockStore}>
          <App />
        </TestWrapper>
      );

      // Navigate to login page
      const loginLink = screen.getByText('Login');
      fireEvent.click(loginLink);

      await waitFor(() => {
        expect(screen.getByText('Sign In')).toBeInTheDocument();
      });

      // Submit form without filling fields
      const loginButton = screen.getByText('Sign In');
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(screen.getByText('Email is required')).toBeInTheDocument();
        expect(screen.getByText('Password is required')).toBeInTheDocument();
      });
    });
  });

  describe('Authentication State Management', () => {
    test('should persist authentication state', async () => {
      const { SecureStorage } = await import('../../lib/secureStorage');
      const mockSecureStorage = {
        set: vi.fn(),
        get: vi.fn().mockReturnValue({
          accessToken: 'stored-access-token',
          refreshToken: 'stored-refresh-token',
        }),
        clear: vi.fn(),
        clearAll: vi.fn(),
      };
      vi.mocked(SecureStorage).mockReturnValue(mockSecureStorage);

      const { apiClient } = await import('../../lib/api');
      vi.mocked(apiClient.get).mockResolvedValue({
        data: {
          success: true,
          user: {
            id: 'user123',
            email: 'test@example.com',
            name: 'Test User',
          },
        },
      });

      render(
        <TestWrapper store={mockStore}>
          <App />
        </TestWrapper>
      );

      // Should automatically authenticate with stored tokens
      await waitFor(() => {
        expect(apiClient.get).toHaveBeenCalledWith('/api/auth/profile');
      });

      await waitFor(() => {
        expect(screen.getByText('Welcome, Test User')).toBeInTheDocument();
      });
    });

    test('should handle token expiration', async () => {
      const { SecureStorage } = await import('../../lib/secureStorage');
      const mockSecureStorage = {
        set: vi.fn(),
        get: vi.fn().mockReturnValue({
          accessToken: 'expired-access-token',
          refreshToken: 'valid-refresh-token',
        }),
        clear: vi.fn(),
        clearAll: vi.fn(),
      };
      vi.mocked(SecureStorage).mockReturnValue(mockSecureStorage);

      const { apiClient } = await import('../../lib/api');
      vi.mocked(apiClient.get)
        .mockRejectedValueOnce({
          response: { status: 401, data: { error: 'Token expired' } },
        })
        .mockResolvedValue({
          data: {
            success: true,
            tokens: {
              accessToken: 'new-access-token',
              refreshToken: 'new-refresh-token',
            },
          },
        })
        .mockResolvedValue({
          data: {
            success: true,
            user: {
              id: 'user123',
              email: 'test@example.com',
              name: 'Test User',
            },
          },
        });

      render(
        <TestWrapper store={mockStore}>
          <App />
        </TestWrapper>
      );

      // Should refresh token and continue
      await waitFor(() => {
        expect(apiClient.post).toHaveBeenCalledWith('/api/auth/refresh', {
          refreshToken: 'valid-refresh-token',
        });
      });

      await waitFor(() => {
        expect(screen.getByText('Welcome, Test User')).toBeInTheDocument();
      });
    });

    test('should handle refresh token expiration', async () => {
      const { SecureStorage } = await import('../../lib/secureStorage');
      const mockSecureStorage = {
        set: vi.fn(),
        get: vi.fn().mockReturnValue({
          accessToken: 'expired-access-token',
          refreshToken: 'expired-refresh-token',
        }),
        clear: vi.fn(),
        clearAll: vi.fn(),
      };
      vi.mocked(SecureStorage).mockReturnValue(mockSecureStorage);

      const { apiClient } = await import('../../lib/api');
      vi.mocked(apiClient.get).mockRejectedValue({
        response: { status: 401, data: { error: 'Token expired' } },
      });
      vi.mocked(apiClient.post).mockRejectedValue({
        response: { status: 401, data: { error: 'Refresh token expired' } },
      });

      render(
        <TestWrapper store={mockStore}>
          <App />
        </TestWrapper>
      );

      // Should redirect to login page
      await waitFor(() => {
        expect(screen.getByText('Sign In')).toBeInTheDocument();
      });

      // Should clear stored tokens
      expect(mockSecureStorage.clearAll).toHaveBeenCalled();
    });
  });

  describe('Logout Flow', () => {
    test('should complete logout flow', async () => {
      // Start with authenticated state
      const authenticatedStore = createMockStore({
        auth: {
          user: {
            id: 'user123',
            email: 'test@example.com',
            name: 'Test User',
          },
          isAuthenticated: true,
        },
      });

      const { apiClient } = await import('../../lib/api');
      vi.mocked(apiClient.post).mockResolvedValue({
        data: { success: true },
      });

      const { SecureStorage } = await import('../../lib/secureStorage');
      const mockSecureStorage = {
        set: vi.fn(),
        get: vi.fn(),
        clear: vi.fn(),
        clearAll: vi.fn(),
      };
      vi.mocked(SecureStorage).mockReturnValue(mockSecureStorage);

      render(
        <TestWrapper store={authenticatedStore}>
          <App />
        </TestWrapper>
      );

      // Should show dashboard
      await waitFor(() => {
        expect(screen.getByText('Welcome, Test User')).toBeInTheDocument();
      });

      // Click logout button
      const logoutButton = screen.getByText('Logout');
      fireEvent.click(logoutButton);

      await waitFor(() => {
        expect(apiClient.post).toHaveBeenCalledWith('/api/auth/logout');
      });

      // Should redirect to login page
      await waitFor(() => {
        expect(screen.getByText('Sign In')).toBeInTheDocument();
      });

      // Should clear stored tokens
      expect(mockSecureStorage.clearAll).toHaveBeenCalled();
    });

    test('should handle logout errors gracefully', async () => {
      // Start with authenticated state
      const authenticatedStore = createMockStore({
        auth: {
          user: {
            id: 'user123',
            email: 'test@example.com',
            name: 'Test User',
          },
          isAuthenticated: true,
        },
      });

      const { apiClient } = await import('../../lib/api');
      vi.mocked(apiClient.post).mockRejectedValue({
        response: {
          status: 500,
          data: { error: 'Server error' },
        },
      });

      const { SecureStorage } = await import('../../lib/secureStorage');
      const mockSecureStorage = {
        set: vi.fn(),
        get: vi.fn(),
        clear: vi.fn(),
        clearAll: vi.fn(),
      };
      vi.mocked(SecureStorage).mockReturnValue(mockSecureStorage);

      render(
        <TestWrapper store={authenticatedStore}>
          <App />
        </TestWrapper>
      );

      // Should show dashboard
      await waitFor(() => {
        expect(screen.getByText('Welcome, Test User')).toBeInTheDocument();
      });

      // Click logout button
      const logoutButton = screen.getByText('Logout');
      fireEvent.click(logoutButton);

      // Should still logout locally even if server request fails
      await waitFor(() => {
        expect(screen.getByText('Sign In')).toBeInTheDocument();
      });

      // Should clear stored tokens
      expect(mockSecureStorage.clearAll).toHaveBeenCalled();
    });
  });

  describe('Password Reset Flow', () => {
    test('should handle password reset request', async () => {
      const { apiClient } = await import('../../lib/api');
      vi.mocked(apiClient.post).mockResolvedValue({
        data: {
          success: true,
          message: 'Password reset email sent',
        },
      });

      render(
        <TestWrapper store={mockStore}>
          <App />
        </TestWrapper>
      );

      // Navigate to login page
      const loginLink = screen.getByText('Login');
      fireEvent.click(loginLink);

      await waitFor(() => {
        expect(screen.getByText('Sign In')).toBeInTheDocument();
      });

      // Click forgot password link
      const forgotPasswordLink = screen.getByText('Forgot Password?');
      fireEvent.click(forgotPasswordLink);

      await waitFor(() => {
        expect(screen.getByText('Reset Password')).toBeInTheDocument();
      });

      // Fill email
      const emailInput = screen.getByLabelText('Email');
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

      // Submit
      const resetButton = screen.getByText('Send Reset Email');
      fireEvent.click(resetButton);

      await waitFor(() => {
        expect(apiClient.post).toHaveBeenCalledWith('/api/auth/password-reset-request', {
          email: 'test@example.com',
        });
      });

      // Should show success message
      await waitFor(() => {
        expect(screen.getByText('Password reset email sent')).toBeInTheDocument();
      });
    });

    test('should handle password reset with invalid email', async () => {
      const { apiClient } = await import('../../lib/api');
      vi.mocked(apiClient.post).mockRejectedValue({
        response: {
          status: 404,
          data: {
            error: 'User not found',
          },
        },
      });

      render(
        <TestWrapper store={mockStore}>
          <App />
        </TestWrapper>
      );

      // Navigate to password reset page
      const loginLink = screen.getByText('Login');
      fireEvent.click(loginLink);

      await waitFor(() => {
        expect(screen.getByText('Sign In')).toBeInTheDocument();
      });

      const forgotPasswordLink = screen.getByText('Forgot Password?');
      fireEvent.click(forgotPasswordLink);

      await waitFor(() => {
        expect(screen.getByText('Reset Password')).toBeInTheDocument();
      });

      // Fill invalid email
      const emailInput = screen.getByLabelText('Email');
      fireEvent.change(emailInput, { target: { value: 'nonexistent@example.com' } });

      // Submit
      const resetButton = screen.getByText('Send Reset Email');
      fireEvent.click(resetButton);

      await waitFor(() => {
        expect(screen.getByText('User not found')).toBeInTheDocument();
      });
    });
  });

  describe('Route Protection', () => {
    test('should redirect to login for protected routes', async () => {
      render(
        <TestWrapper store={mockStore}>
          <App />
        </TestWrapper>
      );

      // Try to access protected route
      const dashboardLink = screen.getByText('Dashboard');
      fireEvent.click(dashboardLink);

      // Should redirect to login
      await waitFor(() => {
        expect(screen.getByText('Sign In')).toBeInTheDocument();
      });
    });

    test('should allow access to protected routes when authenticated', async () => {
      const authenticatedStore = createMockStore({
        auth: {
          user: {
            id: 'user123',
            email: 'test@example.com',
            name: 'Test User',
          },
          isAuthenticated: true,
        },
      });

      render(
        <TestWrapper store={authenticatedStore}>
          <App />
        </TestWrapper>
      );

      // Should show dashboard
      await waitFor(() => {
        expect(screen.getByText('Welcome, Test User')).toBeInTheDocument();
      });
    });

    test('should redirect authenticated users away from login page', async () => {
      const authenticatedStore = createMockStore({
        auth: {
          user: {
            id: 'user123',
            email: 'test@example.com',
            name: 'Test User',
          },
          isAuthenticated: true,
        },
      });

      render(
        <TestWrapper store={authenticatedStore}>
          <App />
        </TestWrapper>
      );

      // Should show dashboard instead of login
      await waitFor(() => {
        expect(screen.getByText('Welcome, Test User')).toBeInTheDocument();
      });
    });
  });

  describe('Form Validation', () => {
    test('should validate email format', async () => {
      render(
        <TestWrapper store={mockStore}>
          <App />
        </TestWrapper>
      );

      // Navigate to registration page
      const registerLink = screen.getByText('Register');
      fireEvent.click(registerLink);

      await waitFor(() => {
        expect(screen.getByText('Create Account')).toBeInTheDocument();
      });

      // Fill invalid email
      const emailInput = screen.getByLabelText('Email');
      fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
      fireEvent.blur(emailInput);

      await waitFor(() => {
        expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
      });
    });

    test('should validate password strength', async () => {
      render(
        <TestWrapper store={mockStore}>
          <App />
        </TestWrapper>
      );

      // Navigate to registration page
      const registerLink = screen.getByText('Register');
      fireEvent.click(registerLink);

      await waitFor(() => {
        expect(screen.getByText('Create Account')).toBeInTheDocument();
      });

      // Fill weak password
      const passwordInput = screen.getByLabelText('Password');
      fireEvent.change(passwordInput, { target: { value: 'weak' } });
      fireEvent.blur(passwordInput);

      await waitFor(() => {
        expect(screen.getByText('Password must be at least 8 characters long')).toBeInTheDocument();
        expect(screen.getByText('Password must contain at least one uppercase letter')).toBeInTheDocument();
        expect(screen.getByText('Password must contain at least one number')).toBeInTheDocument();
      });
    });

    test('should validate password confirmation', async () => {
      render(
        <TestWrapper store={mockStore}>
          <App />
        </TestWrapper>
      );

      // Navigate to registration page
      const registerLink = screen.getByText('Register');
      fireEvent.click(registerLink);

      await waitFor(() => {
        expect(screen.getByText('Create Account')).toBeInTheDocument();
      });

      // Fill passwords that don't match
      const passwordInput = screen.getByLabelText('Password');
      const confirmPasswordInput = screen.getByLabelText('Confirm Password');

      fireEvent.change(passwordInput, { target: { value: 'SecurePassword123!' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'DifferentPassword123!' } });
      fireEvent.blur(confirmPasswordInput);

      await waitFor(() => {
        expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle network errors gracefully', async () => {
      const { apiClient } = await import('../../lib/api');
      vi.mocked(apiClient.post).mockRejectedValue(new Error('Network error'));

      render(
        <TestWrapper store={mockStore}>
          <App />
        </TestWrapper>
      );

      // Navigate to login page
      const loginLink = screen.getByText('Login');
      fireEvent.click(loginLink);

      await waitFor(() => {
        expect(screen.getByText('Sign In')).toBeInTheDocument();
      });

      // Fill login form
      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'SecurePassword123!' } });

      // Submit form
      const loginButton = screen.getByText('Sign In');
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(screen.getByText('Network error. Please try again.')).toBeInTheDocument();
      });
    });

    test('should handle server errors gracefully', async () => {
      const { apiClient } = await import('../../lib/api');
      vi.mocked(apiClient.post).mockRejectedValue({
        response: {
          status: 500,
          data: { error: 'Internal server error' },
        },
      });

      render(
        <TestWrapper store={mockStore}>
          <App />
        </TestWrapper>
      );

      // Navigate to login page
      const loginLink = screen.getByText('Login');
      fireEvent.click(loginLink);

      await waitFor(() => {
        expect(screen.getByText('Sign In')).toBeInTheDocument();
      });

      // Fill login form
      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'SecurePassword123!' } });

      // Submit form
      const loginButton = screen.getByText('Sign In');
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(screen.getByText('Internal server error')).toBeInTheDocument();
      });
    });
  });
});
