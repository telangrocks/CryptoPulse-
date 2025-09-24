import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { ParseUser, ParseCloud, initializeParse, Back4AppConfig } from '../lib/parse-http'
import { callBack4AppFunction } from '../firebase/config'
import { createSession, getCurrentSession, clearSession, updateSessionActivity, initializeSessionManagement } from '../lib/sessionManager'

interface User {
  id: string
  email: string
  trialEnd?: string
  billingStatus: string
  sessionToken?: string
  username?: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, mobile?: string) => Promise<void>
  logout: () => void
  acceptDisclaimer: () => Promise<void>
  checkDisclaimerStatus: () => Promise<boolean>
  requestPasswordReset: (email: string) => Promise<void>
  resetPassword: (token: string, newPassword: string) => Promise<void>
  validateResetToken: (token: string) => Promise<boolean>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Initialize Parse with error handling
    try {
      initializeParse()
    } catch (error) {
      console.warn('Parse initialization failed, using demo mode:', error)
    }
    
    // Initialize session management with error handling
    try {
      initializeSessionManagement()
    } catch (error) {
      console.warn('Session management initialization failed:', error)
    }
    
    // Try to restore user from secure session
    const restoreUser = async () => {
      try {
        const session = await getCurrentSession()
        if (session) {
          setUser({
            id: session.userId,
            email: session.email,
            username: session.email,
            billingStatus: 'trial',
            sessionToken: session.sessionToken
          })
        } else {
          // Fallback to Parse user
          const parseUser = ParseUser.current()
          if (parseUser) {
            setUser({
              id: parseUser.id,
              email: parseUser.email || parseUser.username,
              username: parseUser.username,
              billingStatus: 'trial',
              sessionToken: parseUser.sessionToken
            })
          }
        }
      } catch (error) {
        const { logError } = await import('../lib/logger');
        logError('Failed to restore user session', 'Auth', error);
      } finally {
        setLoading(false)
      }
    }
    
    restoreUser()
    
    // Fallback timeout to ensure loading is set to false
    const timeout = setTimeout(() => {
      setLoading(false)
    }, 3000)
    
    return () => clearTimeout(timeout)
  }, [])

  const login = async (email: string, password: string) => {
    try {
      const { logInfo, logError } = await import('../lib/logger');
      logInfo('Attempting user login', 'Auth');
      
      // Use Parse SDK with HTTP fallback
      const userData = await ParseUser.logIn(email, password)
      
      const user = {
        id: userData.id,
        email: userData.email || email,
        username: userData.username,
        billingStatus: 'trial',
        trialEnd: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        sessionToken: userData.sessionToken
      }
      
      // Create secure session
      await createSession({
        userId: user.id,
        email: user.email,
        sessionToken: userData.sessionToken
      });
      
      setUser(user)
      localStorage.setItem('cryptopulse_user', JSON.stringify(user))
      logInfo('User login successful', 'Auth');
    } catch (error: unknown) {
      const { logError } = await import('../lib/logger');
      logError('Login failed', 'Auth', error);
      throw new Error(error instanceof Error ? error.message : 'Login failed')
    }
  }

  const register = async (email: string, password: string, mobile?: string) => {
    try {
      const { logInfo, logError } = await import('../lib/logger');
      logInfo('Attempting user registration', 'Auth');
      
      // Use Parse SDK with HTTP fallback
      const userData = await ParseUser.signUp(email, password, email)
      
      const user = {
        id: userData.id,
        email: userData.email || email,
        username: userData.username,
        billingStatus: 'trial',
        trialEnd: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        sessionToken: userData.sessionToken
      }
      
      setUser(user)
      localStorage.setItem('cryptopulse_user', JSON.stringify(user))
      localStorage.setItem('cryptopulse_session', userData.sessionToken)
      logInfo('User registration successful', 'Auth');
    } catch (error: unknown) {
      const { logError } = await import('../lib/logger');
      logError('Registration failed', 'Auth', error);
      throw new Error(error instanceof Error ? error.message : 'Registration failed')
    }
  }

  const logout = async () => {
    try {
      const { logInfo, logError } = await import('../lib/logger');
      logInfo('User logout initiated', 'Auth');
      
      // Use Parse logout to invalidate session on server
      await ParseUser.logOut()
      
      // Clear secure session
      await clearSession()
      
      localStorage.removeItem('cryptopulse_user')
      localStorage.removeItem('cryptopulse_session')
      // Clear all secure storage
      localStorage.removeItem('cryptopulse_api_keys')
      localStorage.removeItem('cryptopulse_master_password_set')
      setUser(null)
      logInfo('User logout successful', 'Auth');
    } catch (error) {
      const { logError } = await import('../lib/logger');
      logError('Logout failed', 'Auth', error);
      // Still clear local state even if server logout fails
      await clearSession()
      localStorage.removeItem('cryptopulse_user')
      localStorage.removeItem('cryptopulse_session')
      localStorage.removeItem('cryptopulse_api_keys')
      localStorage.removeItem('cryptopulse_master_password_set')
      setUser(null)
    }
  }

  const acceptDisclaimer = async () => {
    try {
      // Store disclaimer acceptance locally since cloud function doesn't exist
      localStorage.setItem('cryptopulse_disclaimer_accepted', 'true')
      localStorage.setItem('cryptopulse_disclaimer_accepted_date', new Date().toISOString())
      
      console.log('✅ Disclaimer accepted and stored locally')
      
      // Try to call cloud function if it exists, but don't fail if it doesn't
      try {
        const sessionToken = localStorage.getItem('cryptopulse_session')
        const response = await fetch(`${Back4AppConfig.serverURL}/functions/acceptDisclaimer`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Parse-Application-Id': Back4AppConfig.appId,
            'X-Parse-Client-Key': Back4AppConfig.clientKey,
            'X-Parse-Session-Token': sessionToken || ''
          },
          body: JSON.stringify({})
        })
        
        if (response.ok) {
          console.log('✅ Disclaimer also accepted on server')
        } else {
          console.log('⚠️ Server disclaimer function not available, using local storage')
        }
      } catch (serverError) {
        console.log('⚠️ Server disclaimer function not available, using local storage')
      }
    } catch (error: unknown) {
      console.error('❌ Failed to accept disclaimer:', error)
      throw new Error(error instanceof Error ? error.message : 'Failed to accept disclaimer')
    }
  }

  const checkDisclaimerStatus = async (): Promise<boolean> => {
    try {
      // Check local storage first
      const localAccepted = localStorage.getItem('cryptopulse_disclaimer_accepted')
      if (localAccepted === 'true') {
        console.log('✅ Disclaimer already accepted (local storage)')
        return true
      }
      
      // Try to check server status, but don't fail if it doesn't exist
      try {
        const sessionToken = localStorage.getItem('cryptopulse_session')
        const response = await fetch(`${Back4AppConfig.serverURL}/functions/getDisclaimerStatus`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Parse-Application-Id': Back4AppConfig.appId,
            'X-Parse-Client-Key': Back4AppConfig.clientKey,
            'X-Parse-Session-Token': sessionToken || ''
          },
          body: JSON.stringify({})
        })
        
        if (response.ok) {
          const result = await response.json()
          const serverAccepted = result.result?.accepted || false
          if (serverAccepted) {
            // Sync with local storage
            localStorage.setItem('cryptopulse_disclaimer_accepted', 'true')
            localStorage.setItem('cryptopulse_disclaimer_accepted_date', new Date().toISOString())
            console.log('✅ Disclaimer accepted on server, synced to local storage')
            return true
          }
        }
      } catch (serverError) {
        console.log('⚠️ Server disclaimer check not available, using local storage only')
      }
      
      return false
    } catch (error) {
      console.error('Failed to check disclaimer status:', error)
      return false
    }
  }

  const requestPasswordReset = async (email: string) => {
    try {
      const response = await callBack4AppFunction('requestPasswordReset', { email })
      return response
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to request password reset')
    }
  }

  const resetPassword = async (token: string, newPassword: string) => {
    try {
      const response = await callBack4AppFunction('resetPassword', { token, newPassword })
      return response
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to reset password')
    }
  }

  const validateResetToken = async (token: string) => {
    try {
      const response = await callBack4AppFunction('validateResetToken', { token })
      return response.valid
    } catch (error) {
      console.error('Failed to validate reset token:', error)
      return false
    }
  }

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      register,
      logout,
      acceptDisclaimer,
      checkDisclaimerStatus,
      requestPasswordReset,
      resetPassword,
      validateResetToken
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
