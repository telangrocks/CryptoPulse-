/**
 * CSRF Protection utilities
 * Implements CSRF token generation and validation
 */

import { generateSecureKey } from './encryption';
import { logError, logWarn, logInfo, logDebug } from '../lib/logger';

// Simple UUID v4 generator
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
const CSRF_TOKEN_KEY = 'cryptopulse_csrf_token';
const CSRF_TOKEN_EXPIRY = 60 * 60 * 1000; // 1 hour

export interface CSRFToken {
  token: string;
  expiresAt: number;
  createdAt: number;
}

/**
 * Generate a new CSRF token
 * @returns CSRF token
 */
export const generateCSRFToken = (): CSRFToken => {
  const token = generateSecureKey(32);
  const now = Date.now();
  
  const csrfToken: CSRFToken = {
    token,
    expiresAt: now + CSRF_TOKEN_EXPIRY,
    createdAt: now
  };
  
  // Store token in sessionStorage (not localStorage for security)
  sessionStorage.setItem(CSRF_TOKEN_KEY, JSON.stringify(csrfToken));
  
  return csrfToken;
};

/**
 * Get current CSRF token
 * @returns Current CSRF token or null if expired/not found
 */
export const getCSRFToken = (): string | null => {
  try {
    const stored = sessionStorage.getItem(CSRF_TOKEN_KEY);
    if (!stored) return null;
    
    const csrfToken: CSRFToken = JSON.parse(stored);
    const now = Date.now();
    
    // Check if token is expired
    if (now > csrfToken.expiresAt) {
      sessionStorage.removeItem(CSRF_TOKEN_KEY);
      return null;
    }
    
    return csrfToken.token;
  } catch (error) {
    logError('Failed to get CSRF token:', error);
    return null;
  }
};

/**
 * Validate CSRF token
 * @param token - Token to validate
 * @returns True if valid
 */
export const validateCSRFToken = (token: string): boolean => {
  const currentToken = getCSRFToken();
  return currentToken !== null && currentToken === token;
};

/**
 * Clear CSRF token
 */
export const clearCSRFToken = (): void => {
  sessionStorage.removeItem(CSRF_TOKEN_KEY);
};

/**
 * Get CSRF token for API requests
 * @returns CSRF token or generates new one if needed
 */
export const getCSRFTokenForRequest = (): string => {
  let token = getCSRFToken();
  if (!token) {
    const csrfToken = generateCSRFToken();
    token = csrfToken.token;
  }
  return token;
};

/**
 * Add CSRF token to request headers
 * @param headers - Existing headers object
 * @returns Headers with CSRF token
 */
export const addCSRFTokenToHeaders = (headers: Record<string, string> = {}): Record<string, string> => {
  const token = getCSRFTokenForRequest();
  return {
    ...headers,
    'X-CSRF-Token': token
  };
};

/**
 * Initialize CSRF protection
 * Generates initial token if none exists
 */
export const initializeCSRFProtection = (): void => {
  if (!getCSRFToken()) {
    generateCSRFToken();
  }
};

/**
 * Refresh CSRF token
 * @returns New CSRF token
 */
export const refreshCSRFToken = (): CSRFToken => {
  clearCSRFToken();
  return generateCSRFToken();
};

/**
 * Check if CSRF token needs refresh
 * @returns True if token needs refresh
 */
export const needsCSRFTokenRefresh = (): boolean => {
  try {
    const stored = sessionStorage.getItem(CSRF_TOKEN_KEY);
    if (!stored) return true;
    
    const csrfToken: CSRFToken = JSON.parse(stored);
    const now = Date.now();
    const timeUntilExpiry = csrfToken.expiresAt - now;
    
    // Refresh if less than 5 minutes left
    return timeUntilExpiry < 5 * 60 * 1000;
  } catch (error) {
    logError('Failed to check CSRF token refresh:', error);
    return true;
  }
};
