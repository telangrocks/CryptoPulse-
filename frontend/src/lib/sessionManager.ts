/**
 * Secure session management utilities
 * Handles session tokens, expiration, and security
 */

import { setSecureItem, getSecureItem, removeSecureItem } from './secureStorage';
import { logError, logWarn, logInfo, logDebug } from '../lib/logger';

// Simple UUID v4 generator
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
export interface SessionData {
  userId: string;
  email: string;
  sessionToken: string;
  expiresAt: number;
  lastActivity: number;
  refreshToken?: string;
}

export interface SessionOptions {
  maxIdleTime: number; // Maximum idle time in milliseconds
  maxSessionTime: number; // Maximum session time in milliseconds
  refreshThreshold: number; // Refresh token when this much time is left
}

const DEFAULT_OPTIONS: SessionOptions = {
  maxIdleTime: 30 * 60 * 1000, // 30 minutes
  maxSessionTime: 24 * 60 * 60 * 1000, // 24 hours
  refreshThreshold: 5 * 60 * 1000 // 5 minutes
};

/**
 * Create a new session
 * @param sessionData - Session data to store
 * @param options - Session options
 */
export const createSession = async (
  sessionData: Omit<SessionData, 'expiresAt' | 'lastActivity'>,
  options: Partial<SessionOptions> = {}
): Promise<void> => {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const now = Date.now();
  
  const session: SessionData = {
    ...sessionData,
    expiresAt: now + opts.maxSessionTime,
    lastActivity: now
  };
  
  await setSecureItem('cryptopulse_session', session, { 
    encrypt: true, 
    ttl: opts.maxSessionTime 
  });
  
  // Set up session monitoring
  startSessionMonitoring(opts);
};

/**
 * Get current session
 * @returns Current session data or null if not found/expired
 */
export const getCurrentSession = async (): Promise<SessionData | null> => {
  try {
    const session = await getSecureItem('cryptopulse_session');
    if (!session) return null;
    
    const now = Date.now();
    
    // Check if session is expired
    if (now > session.expiresAt) {
      await clearSession();
      return null;
    }
    
    // Check if session is idle too long
    const idleTime = now - session.lastActivity;
    if (idleTime > DEFAULT_OPTIONS.maxIdleTime) {
      await clearSession();
      return null;
    }
    
    return session;
  } catch (error) {
      logError('Failed to get current session:', 'Session', error);
    return null;
  }
};

/**
 * Update session activity
 * @param sessionData - Updated session data
 */
export const updateSessionActivity = async (sessionData?: Partial<SessionData>): Promise<void> => {
  try {
    const currentSession = await getCurrentSession();
    if (!currentSession) return;
    
    const updatedSession: SessionData = {
      ...currentSession,
      ...sessionData,
      lastActivity: Date.now()
    };
    
    await setSecureItem('cryptopulse_session', updatedSession, { 
      encrypt: true, 
      ttl: DEFAULT_OPTIONS.maxSessionTime 
    });
  } catch (error) {
      logError('Failed to update session activity:', 'Session', error);
  }
};

/**
 * Refresh session token
 * @param newToken - New session token
 */
export const refreshSessionToken = async (newToken: string): Promise<void> => {
  try {
    const currentSession = await getCurrentSession();
    if (!currentSession) return;
    
    const updatedSession: SessionData = {
      ...currentSession,
      sessionToken: newToken,
      lastActivity: Date.now()
    };
    
    await setSecureItem('cryptopulse_session', updatedSession, { 
      encrypt: true, 
      ttl: DEFAULT_OPTIONS.maxSessionTime 
    });
  } catch (error) {
      logError('Failed to refresh session token:', 'Session', error);
  }
};

/**
 * Clear current session
 */
export const clearSession = async (): Promise<void> => {
  try {
    await removeSecureItem('cryptopulse_session');
    stopSessionMonitoring();
  } catch (error) {
      logError('Failed to clear session:', 'Session', error);
  }
};

/**
 * Check if session needs refresh
 * @returns True if session needs refresh
 */
export const needsRefresh = async (): Promise<boolean> => {
  try {
    const session = await getCurrentSession();
    if (!session) return false;
    
    const now = Date.now();
    const timeUntilExpiry = session.expiresAt - now;
    
    return timeUntilExpiry < DEFAULT_OPTIONS.refreshThreshold;
  } catch (error) {
      logError('Failed to check if session needs refresh:', 'Session', error);
    return false;
  }
};

/**
 * Get session status
 * @returns Session status information
 */
export const getSessionStatus = async (): Promise<{
  isValid: boolean;
  isExpired: boolean;
  isIdle: boolean;
  timeUntilExpiry: number;
  idleTime: number;
}> => {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return {
        isValid: false,
        isExpired: true,
        isIdle: true,
        timeUntilExpiry: 0,
        idleTime: 0
      };
    }
    
    const now = Date.now();
    const timeUntilExpiry = session.expiresAt - now;
    const idleTime = now - session.lastActivity;
    
    return {
      isValid: true,
      isExpired: timeUntilExpiry <= 0,
      isIdle: idleTime > DEFAULT_OPTIONS.maxIdleTime,
      timeUntilExpiry: Math.max(0, timeUntilExpiry),
      idleTime
    };
  } catch (error) {
      logError('Failed to get session status:', 'Session', error);
    return {
      isValid: false,
      isExpired: true,
      isIdle: true,
      timeUntilExpiry: 0,
      idleTime: 0
    };
  }
};

// Session monitoring
let sessionMonitorInterval: NodeJS.Timeout | null = null;

/**
 * Start session monitoring
 * @param options - Session options
 */
const startSessionMonitoring = (options: SessionOptions): void => {
  if (sessionMonitorInterval) {
    clearInterval(sessionMonitorInterval);
  }
  
  sessionMonitorInterval = setInterval(async () => {
    const status = await getSessionStatus();
    
    if (status.isExpired || status.isIdle) {
      await clearSession();
      // Emit session expired event
      window.dispatchEvent(new CustomEvent('sessionExpired'));
    } else if (status.timeUntilExpiry < options.refreshThreshold) {
      // Emit session refresh needed event
      window.dispatchEvent(new CustomEvent('sessionRefreshNeeded'));
    }
  }, 60000); // Check every minute
};

/**
 * Stop session monitoring
 */
const stopSessionMonitoring = (): void => {
  if (sessionMonitorInterval) {
    clearInterval(sessionMonitorInterval);
    sessionMonitorInterval = null;
  }
};

/**
 * Initialize session management
 */
export const initializeSessionManagement = (): void => {
  // Listen for page visibility changes
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'visible') {
      await updateSessionActivity();
    }
  });
  
  // Listen for user activity
  const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
  const handleActivity = async () => {
    await updateSessionActivity();
  };
  
  activityEvents.forEach(event => {
    document.addEventListener(event, handleActivity, true);
  });
  
  // Listen for session events
  window.addEventListener('sessionExpired', () => {
    logInfo('Session expired');
    // Redirect to login or show session expired message
  });
  
  window.addEventListener('sessionRefreshNeeded', async () => {
    logInfo('Session refresh needed');
    // Implement token refresh logic here
  });
};
