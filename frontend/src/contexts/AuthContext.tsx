import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';

import config from '../lib/config';
import { logInfo, logWarn, logError } from '../lib/logger';
import { createSession, getCurrentSession, clearSession, initializeSessionManagement } from '../lib/sessionManager';

interface User {
  id: string;
  email: string;
  trialEnd?: string;
  billingStatus: string;
  sessionToken?: string;
  username?: string;
  lastLogin?: string;
  isEmailVerified?: boolean;
}

interface AuthError {
  code: string;
  message: string;
  details?: any;
}

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: AuthError | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, mobile?: string) => Promise<void>;
  logout: () => Promise<void>;
  acceptDisclaimer: () => Promise<void>;
  checkDisclaimerStatus: () => Promise<boolean>;
  requestPasswordReset: (email: string) => Promise<{ message: string; resetToken?: string }>;
  resetPassword: (token: string, newPassword: string) => Promise<{ message: string }>;
  validateResetToken: (token: string) => Promise<boolean>;
  clearError: () => void;
  refreshSession: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Security utilities
const sanitizeEmail = (email: string): string => {
  return email.toLowerCase().trim();
};

const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePassword = (password: string): { valid: boolean; message?: string } => {
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters long' };
  }
  if (!/(?=.*[a-z])/.test(password)) {
    return { valid: false, message: 'Password must contain at least one lowercase letter' };
  }
  if (!/(?=.*[A-Z])/.test(password)) {
    return { valid: false, message: 'Password must contain at least one uppercase letter' };
  }
  if (!/(?=.*\d)/.test(password)) {
    return { valid: false, message: 'Password must contain at least one number' };
  }
  return { valid: true };
};

const createAuthError = (code: string, message: string, details?: any): AuthError => ({
  code,
  message,
  details,
});

const API_TIMEOUT = 10000; // 10 seconds
const MAX_RETRIES = 3;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AuthError | null>(null);
  const isMountedRef = useRef(true);
  const retryCountRef = useRef(0);
  useEffect(() => {
    // Initialize session management with error handling
    try {
      initializeSessionManagement();
    } catch (error) {
      logWarn('Session management initialization failed', 'AuthContext', error);
    }

    // Try to restore user from secure session
    const restoreUser = async () => {
      try {
        const session = await getCurrentSession();
        if (session) {
          setUser({
            id: session.userId,
            email: session.email,
            username: session.email,
            billingStatus: 'trial',
            sessionToken: session.sessionToken,
          });
        } else {
          // Check localStorage for user data
          const storedUser = localStorage.getItem('cryptopulse-user');
          if (storedUser) {
            try {
              const userData = JSON.parse(storedUser);
              setUser(userData);
            } catch (error) {
              logWarn('Failed to parse stored user data', 'AuthContext', error);
            }
          }
        }
      } catch (error) {
        const { logError } = await import('../lib/logger');
        logError('Failed to restore user session', 'Auth', error);
      } finally {
        setLoading(false);
      }
    };

    restoreUser();
    // Fallback timeout to ensure loading is set to false
    const timeout = setTimeout(() => {
      setLoading(false);
    }, 3000);
    return () => clearTimeout(timeout);
  }, []);
  const login = async (email: string, password: string) => {
    try {
      const { logInfo, logError } = await import('../lib/logger');
      logInfo('Attempting user login', 'Auth');

      // Use REST API for authentication
      const response = await fetch(`${config.api.backendURL}/api/v1/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Login failed');
      }

      const userData = await response.json();
      const user = {
        id: userData.user.id,
        email: userData.user.email || email,
        username: userData.user.username || email,
        billingStatus: userData.user.billingStatus || 'trial',
        trialEnd: userData.user.trialEnd || new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        sessionToken: userData.sessionToken,
      };

      // Create secure session
      await createSession({
        userId: user.id,
        email: user.email,
        sessionToken: userData.sessionToken,
      });

      setUser(user);
      localStorage.setItem('cryptopulse-user', JSON.stringify(user));
      localStorage.setItem('cryptopulse-session', userData.sessionToken);
      logInfo('User login successful', 'Auth');
    } catch (error: unknown) {
      const { logError } = await import('../lib/logger');
      logError('Login failed', 'Auth', error);
      throw new Error(error instanceof Error ? error.message : 'Login failed');
    }
  };

  const register = async (email: string, password: string, mobile?: string) => {
    try {
      const { logInfo, logError } = await import('../lib/logger');
      const { getTrialManagementService } = await import('../lib/trialManagement');

      logInfo('Attempting user registration', 'Auth');

      // Check if user can start a new trial
      const trialService = getTrialManagementService();
      const trialCheck = trialService.canStartTrial(email);

      if (!trialCheck.allowed) {
        throw new Error(trialCheck.reason || 'Cannot start new trial');
      }

      // Use REST API for registration
      const response = await fetch(`${config.api.backendURL}/api/v1/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, mobile }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Registration failed');
      }

      const userData = await response.json();
      // Start trial for the user
      const trialInfo = trialService.startTrial(email);

      const user = {
        id: userData.user.id,
        email: userData.user.email || email,
        username: userData.user.username || email,
        billingStatus: 'trial',
        trialEnd: trialInfo.trialEndDate.toISOString(),
        sessionToken: userData.sessionToken,
      };

      setUser(user);
      localStorage.setItem('cryptopulse-user', JSON.stringify(user));
      localStorage.setItem('cryptopulse-session', userData.sessionToken);
      logInfo('User registration successful with trial started', 'Auth');
    } catch (error: unknown) {
      const { logError } = await import('../lib/logger');
      logError('Registration failed', 'Auth', error);
      throw new Error(error instanceof Error ? error.message : 'Registration failed');
    }
  };

  const logout = async () => {
    try {
      const { logInfo, logError } = await import('../lib/logger');
      logInfo('User logout initiated', 'Auth');

      // Use REST API to invalidate session on server
      try {
        const sessionToken = localStorage.getItem('cryptopulse-session');
        await fetch(`${config.api.backendURL}/api/v1/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionToken || ''}`,
          },
        });
      } catch (serverError) {
        logWarn('Server logout failed, continuing with local logout', 'Auth', serverError);
      }

      // Clear secure session
      await clearSession();
      localStorage.removeItem('cryptopulse-user');
      localStorage.removeItem('cryptopulse-session');
      // Clear all secure storage
      localStorage.removeItem('cryptopulse_api-keys');
      localStorage.removeItem('cryptopulse_master_password-set');
      setUser(null);
      logInfo('User logout successful', 'Auth');
    } catch (error) {
      const { logError } = await import('../lib/logger');
      logError('Logout failed', 'Auth', error);
      // Still clear local state even if server logout fails
      await clearSession();
      localStorage.removeItem('cryptopulse-user');
      localStorage.removeItem('cryptopulse-session');
      localStorage.removeItem('cryptopulse_api-keys');
      localStorage.removeItem('cryptopulse_master_password-set');
      setUser(null);
    }
  };

  const acceptDisclaimer = async () => {
    try {
      // Store disclaimer acceptance locally since cloud function doesn't exist
      localStorage.setItem('cryptopulse_disclaimer-accepted', 'true');
      localStorage.setItem('cryptopulse_disclaimer_accepted-date', new Date().toISOString());
      logInfo('Disclaimer accepted and stored locally', 'AuthContext');
      // Try to call server API if available
      try {
        const sessionToken = localStorage.getItem('cryptopulse-session');
        const response = await fetch(`${config.api.backendURL}/api/v1/disclaimer/accept`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionToken || ''}`,
          },
          body: JSON.stringify({}),
        });
        if (response.ok) {
          logInfo('Disclaimer also accepted on server', 'AuthContext');
        } else {
          logWarn('Server disclaimer function not available, using local storage', 'AuthContext');
        }
      } catch (serverError) {
        logWarn('Server disclaimer function not available, using local storage', 'AuthContext');
      }
    } catch (error: unknown) {
      logError('Failed to accept disclaimer', 'AuthContext', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to accept disclaimer');
    }
  };

  const checkDisclaimerStatus = async (): Promise<boolean> => {
    try {
      // Check local storage first
      const localAccepted = localStorage.getItem('cryptopulse_disclaimer-accepted');
      if (localAccepted === 'true') {
        logInfo('Disclaimer already accepted (local storage)', 'AuthContext');
        return true;
      }

      // Try to check server status, but don't fail if it doesn't exist
      try {
        const sessionToken = localStorage.getItem('cryptopulse-session');
        const response = await fetch(`${config.api.backendURL}/api/v1/disclaimer/status`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionToken || ''}`,
          },
          body: JSON.stringify({}),
        });
        if (response.ok) {
          const result = await response.json();
          const serverAccepted = result.result?.accepted || false;
          if (serverAccepted) {
            // Sync with local storage
            localStorage.setItem('cryptopulse_disclaimer-accepted', 'true');
            localStorage.setItem('cryptopulse_disclaimer_accepted-date', new Date().toISOString());
            logInfo('Disclaimer accepted on server, synced to local storage', 'AuthContext');
            return true;
          }
        }
      } catch (serverError) {
        logWarn('Server disclaimer check not available, using local storage only', 'AuthContext');
      }

      return false;
    } catch (error) {
      logError('Failed to check disclaimer status', 'AuthContext', error);
      return false;
    }
  };

  const requestPasswordReset = async (email: string) => {
    try {
      const response = await fetch(`${config.api.backendURL}/api/v1/auth/request-password-reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });
      if (!response.ok) {
        throw new Error('Failed to request password reset');
      }

      return await response.json();
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to request password reset');
    }
  };

  const resetPassword = async (token: string, newPassword: string) => {
    try {
      const response = await fetch(`${config.api.backendURL}/api/v1/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, newPassword }),
      });
      if (!response.ok) {
        throw new Error('Failed to reset password');
      }

      return await response.json();
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to reset password');
    }
  };

  const validateResetToken = async (token: string) => {
    try {
      const response = await fetch(`${config.api.backendURL}/api/v1/auth/validate-reset-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });
      if (!response.ok) {
        return false;
      }

      const result = await response.json();
      return result.valid || false;
    } catch (error) {
      logError('Failed to validate reset token', 'AuthContext', error);
      return false;
    }
  };

  const clearError = () => {
    setError(null);
  };

  const refreshSession = async (): Promise<boolean> => {
    try {
      const sessionToken = localStorage.getItem('cryptopulse-session');
      if (!sessionToken) {
        return false;
      }

      const response = await fetch(`${config.api.backendURL}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setUser(prevUser => prevUser ? { ...prevUser, ...data.data } : null);
          return true;
        }
      }
      return false;
    } catch (error) {
      logError('Failed to refresh session', 'AuthContext', error);
      return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        login,
        register,
        logout,
        acceptDisclaimer,
        checkDisclaimerStatus,
        requestPasswordReset,
        resetPassword,
        validateResetToken,
        clearError,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
