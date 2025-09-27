/**
 * Advanced form validation system with real-time validation
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { z } from 'zod'

// Common validation schemas
export const emailSchema = z.string().email('Invalid email address')
export const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/\d/, 'Password must contain at least one number')
  .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Password must contain at least one special character')

export const apiKeySchema = z.string()
  .min(20, 'API key must be at least 20 characters')
  .regex(/^[A-Za-z0-9]+$/, 'API key must contain only alphanumeric characters')

export const apiSecretSchema = z.string()
  .min(20, 'API secret must be at least 20 characters')
  .regex(/^[A-Za-z0-9]+$/, 'API secret must contain only alphanumeric characters')

// Trading form schemas
export const tradeFormSchema = z.object({
  symbol: z.string().min(1, 'Symbol is required'),
  side: z.enum(['BUY', 'SELL'], { required_error: 'Side is required' }),
  type: z.enum(['MARKET', 'LIMIT', 'STOP_LOSS', 'STOP_LOSS_LIMIT'], { required_error: 'Type is required' }),
  quantity: z.number().positive('Quantity must be positive'),
  price: z.number().positive('Price must be positive').optional(),
  stopPrice: z.number().positive('Stop price must be positive').optional(),
  timeInForce: z.enum(['GTC', 'IOC', 'FOK']).optional(),
})

export const botConfigSchema = z.object({
  name: z.string().min(1, 'Bot name is required'),
  strategy: z.string().min(1, 'Strategy is required'),
  symbol: z.string().min(1, 'Symbol is required'),
  timeframe: z.string().min(1, 'Timeframe is required'),
  riskLevel: z.enum(['LOW', 'MEDIUM', 'HIGH'], { required_error: 'Risk level is required' }),
  maxPositions: z.number().int().positive('Max positions must be a positive integer'),
  stopLoss: z.number().min(0).max(100, 'Stop loss must be between 0 and 100'),
  takeProfit: z.number().min(0).max(100, 'Take profit must be between 0 and 100'),
  enabled: z.boolean().default(false),
})

// Validation error types
export interface ValidationError {
  field: string
  message: string
  code: string
}

export interface ValidationResult {
  success: boolean
  errors: ValidationError[]
  data?: any
}

// Advanced validator class
export class FormValidator {
  private schema: z.ZodSchema
  private customValidators: Map<string, (value: any) => string | null> = new Map()

  constructor(schema: z.ZodSchema) {
    this.schema = schema
  }

  addCustomValidator(field: string, validator: (value: any) => string | null) {
    this.customValidators.set(field, validator)
  }

  validate(data: any): ValidationResult {
    try {
      // Run Zod validation
      const result = this.schema.safeParse(data)
      
      if (result.success) {
        // Run custom validators
        const customErrors: ValidationError[] = []
        
        for (const [field, validator] of this.customValidators) {
          const error = validator(data[field])
          if (error) {
            customErrors.push({
              field,
              message: error,
              code: 'CUSTOM_VALIDATION'
            })
          }
        }

        if (customErrors.length > 0) {
          return {
            success: false,
            errors: customErrors
          }
        }

        return {
          success: true,
          errors: [],
          data: result.data
        }
      } else {
        const errors: ValidationError[] = result.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }))

        return {
          success: false,
          errors
        }
      }
    } catch (error) {
      return {
        success: false,
        errors: [{
          field: 'general',
          message: 'Validation failed',
          code: 'UNKNOWN_ERROR'
        }]
      }
    }
  }

  validateField(field: string, value: any): ValidationError | null {
    try {
      const fieldSchema = (this.schema as any).shape?.[field]
      if (!fieldSchema) return null

      const result = fieldSchema.safeParse(value)
      if (!result.success) {
        return {
          field,
          message: result.error.errors[0].message,
          code: result.error.errors[0].code
        }
      }

      // Check custom validators
      const customValidator = this.customValidators.get(field)
      if (customValidator) {
        const error = customValidator(value)
        if (error) {
          return {
            field,
            message: error,
            code: 'CUSTOM_VALIDATION'
          }
        }
      }

      return null
    } catch (error) {
      return {
        field,
        message: 'Field validation failed',
        code: 'UNKNOWN_ERROR'
      }
    }
  }
}

// Real-time validation hook
export function useFormValidation(schema: z.ZodSchema) {
  const [errors, setErrors] = useState<Map<string, ValidationError>>(new Map())
  const [touched, setTouched] = useState<Set<string>>(new Set())
  const [isValidating, setIsValidating] = useState(false)

  const validator = useMemo(() => new FormValidator(schema), [schema])

  const validateField = useCallback(async (field: string, value: any) => {
    setIsValidating(true)
    
    // Debounce validation
    const timeoutId = setTimeout(() => {
      const error = validator.validateField(field, value)
      
      setErrors(prev => {
        const newErrors = new Map(prev)
        if (error) {
          newErrors.set(field, error)
        } else {
          newErrors.delete(field)
        }
        return newErrors
      })
      
      setIsValidating(false)
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [validator])

  const validateForm = useCallback((data: any) => {
    const result = validator.validate(data)
    
    if (!result.success) {
      const errorMap = new Map<string, ValidationError>()
      result.errors.forEach(error => {
        errorMap.set(error.field, error)
      })
      setErrors(errorMap)
    } else {
      setErrors(new Map())
    }
    
    return result
  }, [validator])

  const markFieldTouched = useCallback((field: string) => {
    setTouched(prev => new Set(prev).add(field))
  }, [])

  const clearErrors = useCallback(() => {
    setErrors(new Map())
  }, [])

  const clearFieldError = useCallback((field: string) => {
    setErrors(prev => {
      const newErrors = new Map(prev)
      newErrors.delete(field)
      return newErrors
    })
  }, [])

  const getFieldError = useCallback((field: string) => {
    return errors.get(field)
  }, [errors])

  const hasFieldError = useCallback((field: string) => {
    return errors.has(field) && touched.has(field)
  }, [errors, touched])

  const hasAnyError = useCallback(() => {
    return errors.size > 0
  }, [errors])

  const isFormValid = useCallback(() => {
    return errors.size === 0
  }, [errors])

  return {
    errors,
    touched,
    isValidating,
    validateField,
    validateForm,
    markFieldTouched,
    clearErrors,
    clearFieldError,
    getFieldError,
    hasFieldError,
    hasAnyError,
    isFormValid
  }
}

// Field validation component
export function ValidationField({ 
  children, 
  field, 
  value, 
  onValidate 
}: { 
  children: React.ReactNode
  field: string
  value: any
  onValidate: (field: string, value: any) => void
}) {
  useEffect(() => {
    onValidate(field, value)
  }, [field, value, onValidate])

  return React.createElement(React.Fragment, null, children);
}

// Common validation rules
export const validationRules = {
  required: (message = 'This field is required') => 
    z.string().min(1, message),
  
  minLength: (min: number, message?: string) => 
    z.string().min(min, message || `Must be at least ${min} characters`),
  
  maxLength: (max: number, message?: string) => 
    z.string().max(max, message || `Must be no more than ${max} characters`),
  
  min: (min: number, message?: string) => 
    z.number().min(min, message || `Must be at least ${min}`),
  
  max: (max: number, message?: string) => 
    z.number().max(max, message || `Must be no more than ${max}`),
  
  positive: (message = 'Must be positive') => 
    z.number().positive(message),
  
  email: (message = 'Invalid email address') => 
    z.string().email(message),
  
  url: (message = 'Invalid URL') => 
    z.string().url(message),
  
  phone: (message = 'Invalid phone number') => 
    z.string().regex(/^\+?[\d\s\-\(\)]+$/, message),
  
  alphanumeric: (message = 'Must contain only letters and numbers') => 
    z.string().regex(/^[a-zA-Z0-9]+$/, message),
  
  noSpaces: (message = 'Must not contain spaces') => 
    z.string().regex(/^\S+$/, message),
  
  strongPassword: (message = 'Password must be strong') => 
    z.string()
      .min(8, 'At least 8 characters')
      .regex(/[A-Z]/, 'At least one uppercase letter')
      .regex(/[a-z]/, 'At least one lowercase letter')
      .regex(/\d/, 'At least one number')
      .regex(/[!@#$%^&*(),.?":{}|<>]/, 'At least one special character'),
}

// Async validation
export function createAsyncValidator<T>(
  validator: (value: T) => Promise<ValidationError | null>
) {
  return async (value: T): Promise<ValidationError | null> => {
    try {
      return await validator(value)
    } catch (error) {
      return {
        field: 'general',
        message: 'Validation failed',
        code: 'ASYNC_ERROR'
      }
    }
  }
}

// Example async validators
export const asyncValidators = {
  checkUsernameAvailability: createAsyncValidator(async (username: string) => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    if (username === 'admin' || username === 'test') {
      return {
        field: 'username',
        message: 'Username is already taken',
        code: 'USERNAME_TAKEN'
      }
    }
    
    return null
  }),
  
  checkEmailAvailability: createAsyncValidator(async (email: string) => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    if (email === 'test@example.com') {
      return {
        field: 'email',
        message: 'Email is already registered',
        code: 'EMAIL_TAKEN'
      }
    }
    
    return null
  }),
  
  validateAPIKeys: createAsyncValidator(async (keys: { key: string; secret: string }) => {
    // Simulate API validation
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    if (keys.key === 'invalid' || keys.secret === 'invalid') {
      return {
        field: 'apiKeys',
        message: 'Invalid API credentials',
        code: 'INVALID_API_KEYS'
      }
    }
    
    return null
  })
}
