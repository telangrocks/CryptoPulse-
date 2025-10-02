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
  if (process.env.NODE_ENV === 'production') {
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
  if (process.env.NODE_ENV === 'production') {
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
};

export default errorMonitoring;
