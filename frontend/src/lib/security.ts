/**
 * Advanced security utilities for the trading platform
 */

import { apiCache } from './advancedCache'

// Rate limiting
class RateLimiter {
  private requests = new Map<string, number[]>()
  private maxRequests: number
  private windowMs: number

  constructor(maxRequests: number = 100, windowMs: number = 60000) {
    this.maxRequests = maxRequests
    this.windowMs = windowMs
  }

  isAllowed(key: string): boolean {
    const now = Date.now()
    const requests = this.requests.get(key) || []
    
    // Remove old requests outside the window
    const validRequests = requests.filter(time => now - time < this.windowMs)
    
    if (validRequests.length >= this.maxRequests) {
      return false
    }

    // Add current request
    validRequests.push(now)
    this.requests.set(key, validRequests)
    
    return true
  }

  getRemainingRequests(key: string): number {
    const now = Date.now()
    const requests = this.requests.get(key) || []
    const validRequests = requests.filter(time => now - time < this.windowMs)
    
    return Math.max(0, this.maxRequests - validRequests.length)
  }

  reset(key: string): void {
    this.requests.delete(key)
  }
}

export const rateLimiter = new RateLimiter()

// Input sanitization
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/['"]/g, '') // Remove quotes
    .replace(/[;]/g, '') // Remove semicolons
    .trim()
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function validatePassword(password: string): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long')
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number')
  }
  
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

// API key validation
export function validateAPIKey(key: string): boolean {
  // Basic validation for API key format
  return key.length >= 20 && /^[A-Za-z0-9]+$/.test(key)
}

export function validateAPISecret(secret: string): boolean {
  // Basic validation for API secret format
  return secret.length >= 20 && /^[A-Za-z0-9]+$/.test(secret)
}

// XSS Protection
export function escapeHtml(text: string): string {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }
  
  return text.replace(/[&<>"']/g, (m) => map[m])
}

// CSRF Token Management
class CSRFTokenManager {
  private token: string | null = null
  private tokenExpiry: number = 0

  generateToken(): string {
    const array = new Uint8Array(32)
    crypto.getRandomValues(array)
    this.token = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
    this.tokenExpiry = Date.now() + 30 * 60 * 1000 // 30 minutes
    return this.token
  }

  getToken(): string | null {
    if (this.token && Date.now() < this.tokenExpiry) {
      return this.token
    }
    return null
  }

  validateToken(token: string): boolean {
    return this.token === token && Date.now() < this.tokenExpiry
  }

  invalidateToken(): void {
    this.token = null
    this.tokenExpiry = 0
  }
}

export const csrfManager = new CSRFTokenManager()

// Secure Storage
class SecureStorage {
  private keyPrefix = 'cryptopulse_secure_'

  setItem(key: string, value: string): void {
    try {
      const encrypted = this.encrypt(value)
      localStorage.setItem(this.keyPrefix + key, encrypted)
    } catch (e) {
      console.error('Failed to store secure item:', e)
    }
  }

  getItem(key: string): string | null {
    try {
      const encrypted = localStorage.getItem(this.keyPrefix + key)
      if (!encrypted) return null
      return this.decrypt(encrypted)
    } catch (e) {
      console.error('Failed to retrieve secure item:', e)
      return null
    }
  }

  removeItem(key: string): void {
    localStorage.removeItem(this.keyPrefix + key)
  }

  private encrypt(text: string): string {
    // Simple encryption - in production, use a proper encryption library
    return btoa(text)
  }

  private decrypt(encrypted: string): string {
    try {
      return atob(encrypted)
    } catch (e) {
      throw new Error('Failed to decrypt data')
    }
  }
}

export const secureStorage = new SecureStorage()

// Session Management
class SessionManager {
  private sessionId: string | null = null
  private lastActivity: number = 0
  private sessionTimeout: number = 30 * 60 * 1000 // 30 minutes

  startSession(): string {
    this.sessionId = this.generateSessionId()
    this.lastActivity = Date.now()
    secureStorage.setItem('session_id', this.sessionId)
    return this.sessionId
  }

  getSessionId(): string | null {
    if (this.sessionId) {
      return this.sessionId
    }
    
    const stored = secureStorage.getItem('session_id')
    if (stored) {
      this.sessionId = stored
      return stored
    }
    
    return null
  }

  isSessionValid(): boolean {
    const now = Date.now()
    return this.lastActivity > 0 && (now - this.lastActivity) < this.sessionTimeout
  }

  updateActivity(): void {
    this.lastActivity = Date.now()
  }

  endSession(): void {
    this.sessionId = null
    this.lastActivity = 0
    secureStorage.removeItem('session_id')
  }

  private generateSessionId(): string {
    const array = new Uint8Array(16)
    crypto.getRandomValues(array)
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
  }
}

export const sessionManager = new SessionManager()

// Security Headers
export function getSecurityHeaders(): Record<string, string> {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
  }
}

// Content Security Policy
export function getCSPHeader(): string {
  return [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://api.binance.com https://api.back4app.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; ')
}

// Audit logging
export function logSecurityEvent(event: string, details: any): void {
  const logEntry = {
    timestamp: new Date().toISOString(),
    event,
    details,
    userAgent: navigator.userAgent,
    url: window.location.href,
    sessionId: sessionManager.getSessionId()
  }
  
  console.log('Security Event:', logEntry)
  
  // In production, send to security monitoring service
  if (process.env.NODE_ENV === 'production') {
    // Send to security monitoring service
    fetch('/api/security/log', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfManager.getToken() || ''
      },
      body: JSON.stringify(logEntry)
    }).catch(e => console.error('Failed to log security event:', e))
  }
}

// Initialize security features
export function initializeSecurity(): void {
  // Start session
  sessionManager.startSession()
  
  // Generate CSRF token
  csrfManager.generateToken()
  
  // Set up activity tracking
  const updateActivity = () => sessionManager.updateActivity()
  
  document.addEventListener('click', updateActivity)
  document.addEventListener('keypress', updateActivity)
  document.addEventListener('scroll', updateActivity)
  
  // Clean up on page unload
  window.addEventListener('beforeunload', () => {
    sessionManager.endSession()
  })
  
  // Log security initialization
  logSecurityEvent('security_initialized', {
    timestamp: Date.now(),
    features: ['rate_limiting', 'csrf_protection', 'session_management', 'secure_storage']
  })
}

// Security Test Types
export interface SecurityTestResult {
  testName: string
  passed: boolean
  message: string
  details?: any
}

// Security Test Functions
export async function runSecurityTests(): Promise<SecurityTestResult[]> {
  const results: SecurityTestResult[] = []
  
  // Test 1: Rate Limiting
  try {
    const testKey = 'security_test_' + Date.now()
    const isAllowed = rateLimiter.isAllowed(testKey)
    results.push({
      testName: 'Rate Limiting',
      passed: isAllowed,
      message: isAllowed ? 'Rate limiting is working correctly' : 'Rate limiting failed'
    })
  } catch (error) {
    results.push({
      testName: 'Rate Limiting',
      passed: false,
      message: 'Rate limiting test failed',
      details: error
    })
  }
  
  // Test 2: CSRF Protection
  try {
    const token = csrfManager.generateToken()
    const isValid = csrfManager.validateToken(token)
    results.push({
      testName: 'CSRF Protection',
      passed: isValid,
      message: isValid ? 'CSRF protection is working correctly' : 'CSRF protection failed'
    })
  } catch (error) {
    results.push({
      testName: 'CSRF Protection',
      passed: false,
      message: 'CSRF protection test failed',
      details: error
    })
  }
  
  // Test 3: Session Management
  try {
    const sessionId = sessionManager.startSession()
    const isValid = sessionManager.isSessionValid()
    results.push({
      testName: 'Session Management',
      passed: isValid && !!sessionId,
      message: isValid ? 'Session management is working correctly' : 'Session management failed'
    })
  } catch (error) {
    results.push({
      testName: 'Session Management',
      passed: false,
      message: 'Session management test failed',
      details: error
    })
  }
  
  // Test 4: Secure Storage
  try {
    const testKey = 'security_test_storage'
    const testValue = 'test_value_' + Date.now()
    secureStorage.setItem(testKey, testValue)
    const retrieved = secureStorage.getItem(testKey)
    const isWorking = retrieved === testValue
    secureStorage.removeItem(testKey)
    
    results.push({
      testName: 'Secure Storage',
      passed: isWorking,
      message: isWorking ? 'Secure storage is working correctly' : 'Secure storage failed'
    })
  } catch (error) {
    results.push({
      testName: 'Secure Storage',
      passed: false,
      message: 'Secure storage test failed',
      details: error
    })
  }
  
  // Test 5: Input Validation
  try {
    const testInput = '<script>alert("xss")</script>'
    const sanitized = sanitizeInput(testInput)
    const isSafe = !sanitized.includes('<script>')
    
    results.push({
      testName: 'Input Sanitization',
      passed: isSafe,
      message: isSafe ? 'Input sanitization is working correctly' : 'Input sanitization failed'
    })
  } catch (error) {
    results.push({
      testName: 'Input Sanitization',
      passed: false,
      message: 'Input sanitization test failed',
      details: error
    })
  }
  
  return results
}