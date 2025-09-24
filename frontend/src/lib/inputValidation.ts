/**
 * Comprehensive Input Validation and Sanitization
 * Production-ready validation for all user inputs
 */

import { z } from 'zod';
import { logWarn, logError } from './logger';

// Base validation schemas
export const emailSchema = z.string()
  .email('Invalid email format')
  .min(5, 'Email too short')
  .max(254, 'Email too long')
  .toLowerCase();

export const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password too long')
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
    'Password must contain uppercase, lowercase, number, and special character');

export const apiKeySchema = z.string()
  .min(20, 'API key too short')
  .max(200, 'API key too long')
  .regex(/^[A-Za-z0-9_-]+$/, 'Invalid API key format');

export const symbolSchema = z.string()
  .regex(/^[A-Z]{2,10}\/[A-Z]{2,10}$/, 'Invalid trading pair format (e.g., BTC/USDT)')
  .max(20, 'Trading pair too long');

export const amountSchema = z.number()
  .positive('Amount must be positive')
  .max(1000000, 'Amount too large')
  .multipleOf(0.000001, 'Amount precision too high');

export const percentageSchema = z.number()
  .min(0, 'Percentage must be non-negative')
  .max(100, 'Percentage cannot exceed 100%');

// Trading validation schemas
export const tradeOrderSchema = z.object({
  symbol: symbolSchema,
  side: z.enum(['BUY', 'SELL'], { errorMap: () => ({ message: 'Side must be BUY or SELL' }) }),
  type: z.enum(['MARKET', 'LIMIT', 'STOP_LOSS', 'STOP_LOSS_LIMIT'], {
    errorMap: () => ({ message: 'Invalid order type' })
  }),
  quantity: amountSchema,
  price: amountSchema.optional(),
  stopPrice: amountSchema.optional(),
  timeInForce: z.enum(['GTC', 'IOC', 'FOK']).optional().default('GTC')
});

export const backtestConfigSchema = z.object({
  symbol: symbolSchema,
  strategy: z.enum(['RSI', 'MA_CROSSOVER', 'BOLLINGER_BANDS', 'MACD']),
  timeframe: z.enum(['1m', '5m', '15m', '1h', '4h', '1d']),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  initialBalance: amountSchema.default(10000),
  riskPercentage: percentageSchema.default(2)
});

export const apiKeyConfigSchema = z.object({
  apiKey: apiKeySchema,
  apiSecret: apiKeySchema,
  exchange: z.enum(['BINANCE', 'COINBASE', 'KRAKEN']),
  permissions: z.array(z.string()).optional(),
  testnet: z.boolean().default(false)
});

// User input schemas
export const userRegistrationSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
  mobile: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid mobile number').optional(),
  termsAccepted: z.boolean().refine(val => val === true, 'Terms must be accepted'),
  marketingConsent: z.boolean().default(false)
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword']
});

export const userLoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().default(false),
  twoFactorCode: z.string().optional()
});

// Sanitization functions
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') return '';
  
  return input
    .trim()
    .replace(/[<>\"'&]/g, (match) => {
      const escapeMap: Record<string, string> = {
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '&': '&amp;'
      };
      return escapeMap[match] || match;
    });
}

export function sanitizeNumber(input: any): number | null {
  if (typeof input === 'number' && !isNaN(input)) return input;
  
  const parsed = parseFloat(input);
  if (isNaN(parsed)) return null;
  
  return parsed;
}

export function sanitizeEmail(input: string): string {
  return sanitizeString(input).toLowerCase().replace(/[^a-z0-9@._+-]/g, '');
}

export function sanitizeApiKey(input: string): string {
  return sanitizeString(input).replace(/[^A-Za-z0-9_-]/g, '');
}

// Validation functions with error handling
export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown, context: string): {
  success: boolean;
  data?: T;
  errors?: string[];
} {
  try {
    const result = schema.safeParse(data);
    
    if (result.success) {
      return { success: true, data: result.data };
    } else {
      const errors = result.error.errors.map(err => err.message);
      logWarn(`Validation failed for ${context}: ${errors.join(', ')}`, 'InputValidation');
      
      return { success: false, errors };
    }
  } catch (error) {
    logError(`Validation error for ${context}`, 'InputValidation', error);
    return { success: false, errors: ['Validation failed'] };
  }
}

// Rate limiting validation
export function validateRateLimit(
  identifier: string, 
  limit: number, 
  windowMs: number,
  context: string
): boolean {
  try {
    // This would integrate with Redis in production
    const key = `rate_limit:${context}:${identifier}`;
    const now = Date.now();
    
    // In-memory fallback for development
    if (!window.rateLimitStore) {
      window.rateLimitStore = new Map();
    }
    
    const store = window.rateLimitStore;
    const record = store.get(key);
    
    if (!record) {
      store.set(key, { count: 1, resetTime: now + windowMs });
      return true;
    }
    
    if (now > record.resetTime) {
      store.set(key, { count: 1, resetTime: now + windowMs });
      return true;
    }
    
    if (record.count >= limit) {
      logWarn(`Rate limit exceeded for ${identifier} in ${context}`, 'RateLimit');
      return false;
    }
    
    record.count++;
    return true;
  } catch (error) {
    logError('Rate limit validation error', 'RateLimit', error);
    return true; // Allow on error to prevent blocking
  }
}

// SQL injection prevention
export function sanitizeForDatabase(input: string): string {
  return sanitizeString(input)
    .replace(/[';--]/g, '') // Remove SQL injection patterns
    .replace(/union\s+select/gi, '') // Remove union select
    .replace(/drop\s+table/gi, '') // Remove drop table
    .replace(/delete\s+from/gi, ''); // Remove delete from
}

// XSS prevention
export function sanitizeForXSS(input: string): string {
  return sanitizeString(input)
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .replace(/<script/gi, '&lt;script')
    .replace(/<\/script>/gi, '&lt;/script&gt;')
    .replace(/<iframe/gi, '&lt;iframe')
    .replace(/<object/gi, '&lt;object')
    .replace(/<embed/gi, '&lt;embed');
}

// File upload validation
export function validateFileUpload(
  file: File,
  allowedTypes: string[],
  maxSizeBytes: number
): { valid: boolean; error?: string } {
  // Check file type
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'File type not allowed' };
  }
  
  // Check file size
  if (file.size > maxSizeBytes) {
    return { valid: false, error: 'File too large' };
  }
  
  // Check file name for security
  const fileName = sanitizeString(file.name);
  if (fileName !== file.name) {
    return { valid: false, error: 'Invalid file name' };
  }
  
  return { valid: true };
}

// Export validation utilities
export const validationUtils = {
  validateInput,
  validateRateLimit,
  sanitizeString,
  sanitizeNumber,
  sanitizeEmail,
  sanitizeApiKey,
  sanitizeForDatabase,
  sanitizeForXSS,
  validateFileUpload
};

// Global rate limit store for development
declare global {
  interface Window {
    rateLimitStore?: Map<string, { count: number; resetTime: number }>;
  }
}
