import { logError, logWarn, logInfo, logDebug } from '../lib/logger'

// Parse SDK Configuration for Back4App
// This file configures Parse SDK for Back4App integration

// TypeScript declaration for Parse global
declare global {
  interface Window {
    Parse?: any;
  }
}

// Back4App Configuration
const Back4AppConfig = {
  appId: 'ytwtdHef9kXxVjtB4a5oJ00Dv9rwUQNg0IqjrN9W',
  clientKey: 'DE1zoPv2RBiyuWQIhWCcrneFTix8PBxWciQPmOcF',
  serverURL: 'https://parseapi.back4app.com/parse'
};

// Parse initialization function
export function initializeParse() {
  // Initialize Parse with Back4App configuration
  if (typeof window !== 'undefined' && window.Parse) {
    window.Parse.initialize(
      Back4AppConfig.appId,
      Back4AppConfig.clientKey
    );
    window.Parse.serverURL = Back4AppConfig.serverURL;
    logInfo('Parse SDK initialized successfully');
  } else {
    logInfo('Parse SDK not available, using HTTP fallback');
  }
}

// Parse User operations with HTTP fallback
export class ParseUser {
  static async logIn(username: string, password: string) {
    if (typeof window !== 'undefined' && window.Parse) {
      return await window.Parse.User.logIn(username, password);
    }
    
    // HTTP fallback
    const response = await fetch(`${Back4AppConfig.serverURL}/login`, {
      method: 'POST',
      headers: {
        'X-Parse-Application-Id': Back4AppConfig.appId,
        'X-Parse-Client-Key': Back4AppConfig.clientKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    });
    
    if (!response.ok) {
      throw new Error('Login failed');
    }
    
    const data = await response.json();
    return {
      id: data.objectId,
      email: data.email || username,
      username: data.username,
      sessionToken: data.sessionToken
    };
  }

  static async signUp(username: string, password: string, email?: string) {
    if (typeof window !== 'undefined' && window.Parse) {
      return await window.Parse.User.signUp(username, password, { email });
    }
    
    // HTTP fallback
    const response = await fetch(`${Back4AppConfig.serverURL}/users`, {
      method: 'POST',
      headers: {
        'X-Parse-Application-Id': Back4AppConfig.appId,
        'X-Parse-Client-Key': Back4AppConfig.clientKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        username, 
        password, 
        email: email || username 
      })
    });
    
    if (!response.ok) {
      throw new Error('Registration failed');
    }
    
    const data = await response.json();
    return {
      id: data.objectId,
      email: data.email || username,
      username: data.username,
      sessionToken: data.sessionToken
    };
  }

  static async logOut() {
    if (typeof window !== 'undefined' && window.Parse) {
      return await window.Parse.User.logOut();
    }
    
    // Clear local session
    localStorage.removeItem('parse_session_token');
    return null;
  }

  static current() {
    if (typeof window !== 'undefined' && window.Parse) {
      return window.Parse.User.current();
    }
    
    // Check localStorage for session
    const token = localStorage.getItem('parse_session_token');
    return token ? { sessionToken: token } : null;
  }
}

// Parse Cloud Functions with HTTP fallback
export class ParseCloud {
  static async run(functionName: string, params: Record<string, unknown> = {}) {
    if (typeof window !== 'undefined' && window.Parse) {
      return await window.Parse.Cloud.run(functionName, params);
    }
    
    // HTTP fallback
    const response = await fetch(`${Back4AppConfig.serverURL}/functions/${functionName}`, {
      method: 'POST',
      headers: {
        'X-Parse-Application-Id': Back4AppConfig.appId,
        'X-Parse-Client-Key': Back4AppConfig.clientKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    });
    
    if (!response.ok) {
      throw new Error(`Cloud function ${functionName} failed`);
    }
    
    return await response.json();
  }
}

// Export configuration for manual HTTP calls
export { Back4AppConfig };
