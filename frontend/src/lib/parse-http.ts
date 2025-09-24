// HTTP-based Parse SDK implementation for Back4App
// This provides Parse-like functionality using direct HTTP calls

// Import configuration from centralized config
import { Back4AppConfig } from '../back4app/config';
import { addCSRFTokenToHeaders } from './csrfProtection';


import { logError, logWarn, logInfo, logDebug } from '../lib/logger'
// HTTP request helper
async function makeRequest(url: string, options: RequestInit): Promise<any> {
  try {
    logInfo('Making request to:', url);
    
    // Add CSRF protection to headers
    const headers = addCSRFTokenToHeaders(options.headers as Record<string, string>);
    logInfo('Request headers:', headers);
    
    const response = await fetch(url, {
      ...options,
      headers
    });
    
    logInfo('Response status:', response.status);
    logInfo('Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      logError('Request failed:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData
      });
      throw new Error(`HTTP ${response.status}: ${errorData.error || response.statusText}`);
    }
    
    const data = await response.json();
    logInfo('Request successful:', data);
    return data;
  } catch (error) {
    logError('HTTP request error:', error);
    throw error;
  }
}

// Parse User operations using HTTP
export class ParseUser {
  private static currentUser: any = null;

  static async logIn(username: string, password: string) {
    try {
      const response = await makeRequest(`${Back4AppConfig.serverURL}/login`, {
        method: 'POST',
        headers: {
          'X-Parse-Application-Id': Back4AppConfig.appId,
          'X-Parse-REST-API-Key': Back4AppConfig.clientKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });

      this.currentUser = {
        id: response.objectId,
        username: response.username,
        email: response.email,
        sessionToken: response.sessionToken,
        createdAt: response.createdAt,
        updatedAt: response.updatedAt
      };

      // Store in localStorage
      localStorage.setItem('parse_user', JSON.stringify(this.currentUser));
      localStorage.setItem('parse_session', response.sessionToken);

      return this.currentUser;
    } catch (error) {
      logError('Login error:', error);
      throw error;
    }
  }

  static async signUp(username: string, password: string, email?: string) {
    try {
      const userData: any = { username, password };
      if (email) userData.email = email;

      const response = await makeRequest(`${Back4AppConfig.serverURL}/users`, {
        method: 'POST',
        headers: {
          'X-Parse-Application-Id': Back4AppConfig.appId,
          'X-Parse-REST-API-Key': Back4AppConfig.clientKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      });

      this.currentUser = {
        id: response.objectId,
        username: response.username,
        email: response.email,
        sessionToken: response.sessionToken,
        createdAt: response.createdAt,
        updatedAt: response.updatedAt
      };

      // Store in localStorage
      localStorage.setItem('parse_user', JSON.stringify(this.currentUser));
      localStorage.setItem('parse_session', response.sessionToken);

      return this.currentUser;
    } catch (error) {
      logError('Signup error:', error);
      throw error;
    }
  }

  static async logOut() {
    try {
      const sessionToken = this.currentUser?.sessionToken || localStorage.getItem('parse_session');
      
      if (sessionToken) {
        await makeRequest(`${Back4AppConfig.serverURL}/logout`, {
          method: 'POST',
          headers: {
            'X-Parse-Application-Id': Back4AppConfig.appId,
            'X-Parse-REST-API-Key': Back4AppConfig.clientKey,
            'X-Parse-Session-Token': sessionToken,
            'Content-Type': 'application/json'
          }
        });
      }
    } catch (error) {
      logError('Logout error:', error);
    } finally {
      this.currentUser = null;
      localStorage.removeItem('parse_user');
      localStorage.removeItem('parse_session');
    }
  }

  static current() {
    if (this.currentUser) {
      return this.currentUser;
    }

    // Try to restore from localStorage
    const storedUser = localStorage.getItem('parse_user');
    if (storedUser) {
      try {
        this.currentUser = JSON.parse(storedUser);
        return this.currentUser;
      } catch (error) {
        logError('Failed to parse stored user:', error);
        localStorage.removeItem('parse_user');
        localStorage.removeItem('parse_session');
      }
    }

    return null;
  }

  static getSessionToken() {
    const user = this.current();
    return user?.sessionToken || localStorage.getItem('parse_session');
  }
}

// Parse Cloud Functions using HTTP
export class ParseCloud {
  static async run(functionName: string, params: Record<string, unknown> = {}) {
    try {
      const sessionToken = ParseUser.getSessionToken();
      
      const headers: Record<string, string> = {
        'X-Parse-Application-Id': Back4AppConfig.appId,
        'X-Parse-REST-API-Key': Back4AppConfig.clientKey,
        'Content-Type': 'application/json'
      };

      // Use session token if available, otherwise use master key
      if (sessionToken) {
        headers['X-Parse-Session-Token'] = sessionToken;
      } else if (Back4AppConfig.masterKey && Back4AppConfig.masterKey !== 'YOUR_MASTER_KEY_HERE') {
        headers['X-Parse-Master-Key'] = Back4AppConfig.masterKey;
      } else {
        throw new Error('No authentication available. Please log in or configure master key.');
      }

      const response = await makeRequest(`${Back4AppConfig.serverURL}/functions/${functionName}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(params)
      });

      return response.result || response;
    } catch (error) {
      logError(`Parse Cloud function ${functionName} error:`, error);
      throw error;
    }
  }
}

// Initialize Parse (for compatibility)
export function initializeParse() {
  logInfo('Parse HTTP implementation initialized');
  
  // Restore user from localStorage
  ParseUser.current();
}

// Export configuration
export { Back4AppConfig };
