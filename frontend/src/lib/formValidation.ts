import { z } from 'zod';

/**
 * Advanced form validation system with real-time validation
 */

// Common validation schemas
export const emailSchema = z.string().email('Invalid email address');

export const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/\d/, 'Password must contain at least one number')
  .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Password must contain at least one special character');

export const apiKeySchema = z.string()
  .min(20, 'API key must be at least 20 characters')
  .regex(/^[A-Za-z0-9]+$/, 'API key must contain only alphanumeric characters');

export const apiSecretSchema = z.string()
  .min(20, 'API secret must be at least 20 characters')
  .regex(/^[A-Za-z0-9]+$/, 'API secret must contain only alphanumeric characters');

export const tradingPairSchema = z.string()
  .regex(/^[A-Z]{2,10}[/-][A-Z]{2,10}$/, 'Invalid trading pair format');

export const priceSchema = z.number()
  .positive('Price must be positive')
  .max(1000000, 'Price is too high');

export const percentageSchema = z.number()
  .min(0, 'Percentage must be non-negative')
  .max(100, 'Percentage cannot exceed 100');

// Form validation schemas
export const loginFormSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export const registerFormSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

export const apiKeysFormSchema = z.object({
  exchange: z.string().min(1, 'Exchange is required'),
  apiKey: apiKeySchema,
  apiSecret: apiSecretSchema,
  passphrase: z.string().optional(),
});

export const tradeFormSchema = z.object({
  pair: tradingPairSchema,
  action: z.enum(['BUY', 'SELL']),
  entry: priceSchema,
  stopLoss: priceSchema,
  takeProfit: priceSchema,
  amount: z.number().positive('Amount must be positive').optional(),
  leverage: z.number().min(1).max(100).optional(),
});

export const portfolioFormSchema = z.object({
  totalBalance: z.number().positive('Total balance must be positive'),
  riskLevel: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  allocations: z.record(z.string(), percentageSchema),
});

// Validation helper functions
export function validateForm<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
): { success: true; data: T } | { success: false; errors: Record<string, string> } {
  try {
    const validatedData = schema.parse(data);
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string> = {};
      error.errors.forEach((err) => {
        const path = err.path.join('.');
        errors[path] = err.message;
      });
      return { success: false, errors };
    }
    return { success: false, errors: { general: 'Validation failed' } };
  }
}

export function validateField<T>(
  schema: z.ZodSchema<T>,
  value: unknown,
): { success: true; data: T } | { success: false; error: string } {
  try {
    const validatedData = schema.parse(value);
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0]?.message || 'Validation failed' };
    }
    return { success: false, error: 'Validation failed' };
  }
}

// React hook for form validation
export function useFormValidation<T>(schema: z.ZodSchema<T>) {
  return {
    validate: (data: unknown) => validateForm(schema, data),
    validateField: (field: keyof T, value: unknown) => {
      const fieldSchema = schema.shape[field] as z.ZodSchema;
      return validateField(fieldSchema, value);
    },
  };
}
