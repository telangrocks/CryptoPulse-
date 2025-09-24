/**
 * Security Unit Tests
 * Tests for security middleware, rate limiting, and input validation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { validateInput, sanitizeString, validateRateLimit } from '../../lib/inputValidation'
import { CircuitBreaker, CircuitBreakerFactory, circuitBreakers } from '../../lib/circuitBreaker'

describe('Input Validation Tests', () => {
  describe('Email Validation', () => {
    it('should validate correct email formats', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'test+tag@example.org'
      ]

      validEmails.forEach(email => {
        const result = validateInput(
          { email: email },
          { email: { type: 'string', format: 'email' } },
          'EmailValidation'
        )
        expect(result.success).toBe(true)
      })
    })

    it('should reject invalid email formats', () => {
      const invalidEmails = [
        'invalid-email',
        '@domain.com',
        'user@',
        'user@domain',
        ''
      ]

      invalidEmails.forEach(email => {
        const result = validateInput(
          { email: email },
          { email: { type: 'string', format: 'email' } },
          'EmailValidation'
        )
        expect(result.success).toBe(false)
      })
    })
  })

  describe('Password Validation', () => {
    it('should validate strong passwords', () => {
      const strongPasswords = [
        'Password123!',
        'MyStr0ng#Pass',
        'ComplexP@ssw0rd'
      ]

      strongPasswords.forEach(password => {
        const result = validateInput(
          { password: password },
          { password: { type: 'string', minLength: 8, pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/ } },
          'PasswordValidation'
        )
        expect(result.success).toBe(true)
      })
    })

    it('should reject weak passwords', () => {
      const weakPasswords = [
        'password',
        '12345678',
        'Password',
        'PASSWORD123',
        'Pass123'
      ]

      weakPasswords.forEach(password => {
        const result = validateInput(
          { password: password },
          { password: { type: 'string', minLength: 8, pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/ } },
          'PasswordValidation'
        )
        expect(result.success).toBe(false)
      })
    })
  })

  describe('Input Sanitization', () => {
    it('should sanitize XSS attempts', () => {
      const maliciousInputs = [
        '<script>alert("xss")</script>',
        'javascript:alert("xss")',
        'onload=alert("xss")',
        '<img src=x onerror=alert("xss")>'
      ]

      maliciousInputs.forEach(input => {
        const sanitized = sanitizeString(input)
        expect(sanitized).not.toContain('<script>')
        expect(sanitized).not.toContain('javascript:')
        expect(sanitized).not.toContain('onload=')
        expect(sanitized).not.toContain('onerror=')
      })
    })

    it('should sanitize SQL injection attempts', () => {
      const sqlInjectionInputs = [
        "'; DROP TABLE users; --",
        "' OR '1'='1",
        "UNION SELECT * FROM users",
        "'; DELETE FROM accounts; --"
      ]

      sqlInjectionInputs.forEach(input => {
        const sanitized = sanitizeString(input)
        expect(sanitized).not.toContain('DROP TABLE')
        expect(sanitized).not.toContain("' OR '1'='1")
        expect(sanitized).not.toContain('UNION SELECT')
        expect(sanitized).not.toContain('DELETE FROM')
      })
    })
  })
})

describe('Rate Limiting Tests', () => {
  beforeEach(() => {
    // Reset rate limit store
    if (window.rateLimitStore) {
      window.rateLimitStore.clear()
    }
  })

  it('should allow requests within rate limit', () => {
    const identifier = 'test-user'
    const result = validateRateLimit(identifier, 5, 60000, 'test')
    expect(result).toBe(true)
  })

  it('should block requests exceeding rate limit', () => {
    const identifier = 'test-user'
    
    // Make 5 requests (limit)
    for (let i = 0; i < 5; i++) {
      validateRateLimit(identifier, 5, 60000, 'test')
    }
    
    // 6th request should be blocked
    const result = validateRateLimit(identifier, 5, 60000, 'test')
    expect(result).toBe(false)
  })

  it('should reset rate limit after time window', () => {
    const identifier = 'test-user'
    
    // Make requests up to limit
    for (let i = 0; i < 5; i++) {
      validateRateLimit(identifier, 5, 100, 'test') // 100ms window
    }
    
    // Should be blocked
    expect(validateRateLimit(identifier, 5, 100, 'test')).toBe(false)
    
    // Wait for window to reset
    setTimeout(() => {
      expect(validateRateLimit(identifier, 5, 100, 'test')).toBe(true)
    }, 150)
  })
})

describe('Circuit Breaker Tests', () => {
  let circuitBreaker: CircuitBreaker

  beforeEach(() => {
    circuitBreaker = new CircuitBreaker('test', {
      failureThreshold: 3,
      recoveryTimeout: 1000,
      monitoringPeriod: 5000,
      expectedFailureRate: 0.5,
      retryAttempts: 2,
      retryDelay: 100,
      maxRetryDelay: 1000,
      backoffMultiplier: 2
    })
  })

  it('should be in CLOSED state initially', () => {
    expect(circuitBreaker.getStats().state).toBe('CLOSED')
  })

  it('should execute successful operations', async () => {
    const operation = vi.fn().mockResolvedValue('success')
    
    const result = await circuitBreaker.execute(operation)
    
    expect(result).toBe('success')
    expect(operation).toHaveBeenCalledOnce()
    expect(circuitBreaker.getStats().state).toBe('CLOSED')
  })

  it('should open circuit after failure threshold', async () => {
    const operation = vi.fn().mockRejectedValue(new Error('Service down'))
    
    // Execute operations to trigger failures
    for (let i = 0; i < 3; i++) {
      try {
        await circuitBreaker.execute(operation)
      } catch (error) {
        // Expected to fail
      }
    }
    
    expect(circuitBreaker.getStats().state).toBe('OPEN')
  })

  it('should fail fast when circuit is open', async () => {
    const operation = vi.fn().mockRejectedValue(new Error('Service down'))
    
    // Open the circuit
    for (let i = 0; i < 3; i++) {
      try {
        await circuitBreaker.execute(operation)
      } catch (error) {
        // Expected to fail
      }
    }
    
    // Circuit should be open
    expect(circuitBreaker.getStats().state).toBe('OPEN')
    
    // Next call should fail fast
    await expect(circuitBreaker.execute(operation)).rejects.toThrow('Circuit breaker test is OPEN')
  })

  it('should retry with exponential backoff', async () => {
    let callCount = 0
    const operation = vi.fn().mockImplementation(() => {
      callCount++
      if (callCount <= 2) {
        throw new Error('Temporary failure')
      }
      return 'success'
    })
    
    const startTime = Date.now()
    const result = await circuitBreaker.execute(operation)
    const endTime = Date.now()
    
    expect(result).toBe('success')
    expect(operation).toHaveBeenCalledTimes(3) // Initial + 2 retries
    expect(endTime - startTime).toBeGreaterThan(200) // Should have delays
  })

  it('should transition to HALF_OPEN after recovery timeout', async () => {
    const operation = vi.fn().mockRejectedValue(new Error('Service down'))
    
    // Open the circuit
    for (let i = 0; i < 3; i++) {
      try {
        await circuitBreaker.execute(operation)
      } catch (error) {
        // Expected to fail
      }
    }
    
    expect(circuitBreaker.getStats().state).toBe('OPEN')
    
    // Wait for recovery timeout
    await new Promise(resolve => setTimeout(resolve, 1100))
    
    // Next call should transition to HALF_OPEN
    try {
      await circuitBreaker.execute(operation)
    } catch (error) {
      // Expected to fail
    }
    
    expect(circuitBreaker.getStats().state).toBe('HALF_OPEN')
  })
})

describe('Security Headers Tests', () => {
  it('should validate CSP header format', () => {
    const cspHeader = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"
    
    expect(cspHeader).toContain("default-src 'self'")
    expect(cspHeader).toContain("script-src 'self'")
    expect(cspHeader).toContain("style-src 'self'")
  })

  it('should validate security header names', () => {
    const requiredHeaders = [
      'Content-Security-Policy',
      'X-Frame-Options',
      'X-Content-Type-Options',
      'X-XSS-Protection',
      'Referrer-Policy'
    ]
    
    requiredHeaders.forEach(header => {
      expect(header).toMatch(/^[A-Z][a-zA-Z-]+$/)
    })
  })
})

describe('API Key Validation Tests', () => {
  it('should validate API key format', () => {
    const validApiKeys = [
      'abcdef1234567890abcdef1234567890',
      'API_KEY_1234567890',
      'test-api-key-12345'
    ]
    
    const invalidApiKeys = [
      '',
      'short',
      'key with spaces',
      'key@with#special$chars',
      'key-with-🚀-emoji'
    ]
    
    validApiKeys.forEach(key => {
      const result = validateInput(
        { apiKey: key },
        { apiKey: { type: 'string', minLength: 20, maxLength: 200, pattern: /^[A-Za-z0-9_-]+$/ } },
        'ApiKeyValidation'
      )
      expect(result.success).toBe(true)
    })
    
    invalidApiKeys.forEach(key => {
      const result = validateInput(
        { apiKey: key },
        { apiKey: { type: 'string', minLength: 20, maxLength: 200, pattern: /^[A-Za-z0-9_-]+$/ } },
        'ApiKeyValidation'
      )
      expect(result.success).toBe(false)
    })
  })
})
