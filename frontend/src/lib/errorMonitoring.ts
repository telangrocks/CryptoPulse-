/**
 * Error monitoring and reporting utilities
 */

import { logError } from './logger';

export interface ErrorContext {
  userId?: string;
  component?: string;
  action?: string;
  metadata?: Record<string, any>;
}

export function handleAuthError(error: Error, context?: ErrorContext): void {
  logError('Authentication error occurred', {
    message: error.message,
    stack: error.stack,
    context,
    timestamp: Date.now(),
  });

  // In production, you would send this to your error monitoring service
  if (import.meta.env.PROD) {
    // sendToErrorService(error, context);
  }
}

export function handleValidationError(error: Error, context?: ErrorContext): void {
  logError('Validation error occurred', {
    message: error.message,
    stack: error.stack,
    context,
    timestamp: Date.now(),
  });

  // In production, you would send this to your error monitoring service
  if (import.meta.env.PROD) {
    // sendToErrorService(error, context);
  }
}

export function handleNetworkError(error: Error, context?: ErrorContext): void {
  logError('Network error occurred', {
    message: error.message,
    stack: error.stack,
    context,
    timestamp: Date.now(),
  });
}

export function handleUnexpectedError(error: Error, context?: ErrorContext): void {
  logError('Unexpected error occurred', {
    message: error.message,
    stack: error.stack,
    context,
    timestamp: Date.now(),
  });
}

// Global error handler for unhandled promise rejections
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    handleUnexpectedError(
      event.reason instanceof Error ? event.reason : new Error(String(event.reason)),
      { component: 'global', action: 'unhandledRejection' },
    );
  });
}

// Error monitoring service
export const errorMonitoring = {
  logError: handleUnexpectedError,
  logAuth: handleAuthError,
  logValidation: handleValidationError,
  logNetwork: handleNetworkError,
  retryOperation: async (operation: () => Promise<any>, maxRetries = 3) => {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await operation();
      } catch (error) {
        if (i === maxRetries - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
      }
    }
  },
  reportError: (error: Error, context?: ErrorContext) => {
    logError('Error reported', error, context);
  },
};

export default errorMonitoring;
