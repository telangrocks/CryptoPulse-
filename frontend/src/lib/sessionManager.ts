/**
 * Session Management for Authentication
 * Handles secure session storage and management
 */

interface Session {
  token: string;
  refreshToken: string;
  expiresAt: number;
  user: {
    id: string;
    email: string;
  };
}

class SessionManager {
  private static instance: SessionManager;
  private session: Session | null = null;

  private constructor() {
    this.loadSession();
  }

  static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  private loadSession(): void {
    try {
      const sessionData = localStorage.getItem('cryptopulse_session');
      if (sessionData) {
        this.session = JSON.parse(sessionData);
      }
    } catch (error) {
      console.warn('Failed to load session:', error);
      this.clearSession();
    }
  }

  private saveSession(): void {
    if (this.session) {
      try {
        localStorage.setItem('cryptopulse_session', JSON.stringify(this.session));
      } catch (error) {
        console.warn('Failed to save session:', error);
      }
    }
  }

  createSession(sessionData: Session): void {
    this.session = sessionData;
    this.saveSession();
  }

  getCurrentSession(): Session | null {
    if (this.session && this.session.expiresAt > Date.now()) {
      return this.session;
    }
    this.clearSession();
    return null;
  }

  clearSession(): void {
    this.session = null;
    localStorage.removeItem('cryptopulse_session');
  }

  isSessionValid(): boolean {
    const session = this.getCurrentSession();
    return session !== null;
  }

  getToken(): string | null {
    const session = this.getCurrentSession();
    return session?.token || null;
  }

  refreshToken(): Promise<string | null> {
    const session = this.getCurrentSession();
    if (!session) {
      return Promise.resolve(null);
    }

    // TODO: Implement actual token refresh logic
    return Promise.resolve(session.token);
  }
}

// Export singleton instance and functions
const sessionManager = SessionManager.getInstance();

export const initializeSessionManagement = (): void => {
  // Initialize session management
  console.log('Session management initialized');
};

export const createSession = (sessionData: Session): void => {
  sessionManager.createSession(sessionData);
};

export const getCurrentSession = (): Session | null => {
  return sessionManager.getCurrentSession();
};

export const clearSession = (): void => {
  sessionManager.clearSession();
};

export const isSessionValid = (): boolean => {
  return sessionManager.isSessionValid();
};

export const getToken = (): string | null => {
  return sessionManager.getToken();
};

export const refreshToken = (): Promise<string | null> => {
  return sessionManager.refreshToken();
};

export default sessionManager;
