/**
 * Global error handling utilities
 */

import { logError } from './logger';

export interface ErrorInfo {
  message: string;
  stack?: string;
  code?: string;
  timestamp: Date;
  context?: Record<string, any>;
}

export type ErrorHandler = (error: ErrorInfo) => void;

class GlobalErrorHandler {
  private handlers: ErrorHandler[] = [];
  private errors: ErrorInfo[] = [];
  private maxErrors = 100;

  addHandler(handler: ErrorHandler): void {
    this.handlers.push(handler);
  }

  removeHandler(handler: ErrorHandler): void {
    const index = this.handlers.indexOf(handler);
    if (index > -1) {
      this.handlers.splice(index, 1);
    }
  }

  handleError(error: Error | string, context?: Record<string, any>): void {
    const errorInfo: ErrorInfo = {
      message: typeof error === 'string' ? error : error.message,
      stack: typeof error === 'object' ? error.stack : undefined,
      timestamp: new Date(),
      context,
    };

    // Store error
    this.errors.push(errorInfo);
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(-this.maxErrors);
    }

    // Log error
    logError(errorInfo.message, errorInfo);

    // Notify handlers
    this.handlers.forEach(handler => {
      try {
        handler(errorInfo);
      } catch (handlerError) {
        console.error('Error in error handler:', handlerError);
      }
    });
  }

  getErrors(): ErrorInfo[] {
    return [...this.errors];
  }

  clearErrors(): void {
    this.errors = [];
  }
}

// Global instance
const globalErrorHandler = new GlobalErrorHandler();

// Set up global error handlers
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    globalErrorHandler.handleError(event.error || event.message, {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    globalErrorHandler.handleError(
      event.reason instanceof Error ? event.reason : String(event.reason),
      { type: 'unhandledRejection' },
    );
  });
}

export const handleError = globalErrorHandler.handleError.bind(globalErrorHandler);
export const addErrorHandler = globalErrorHandler.addHandler.bind(globalErrorHandler);
export const removeErrorHandler = globalErrorHandler.removeHandler.bind(globalErrorHandler);
export const getErrors = globalErrorHandler.getErrors.bind(globalErrorHandler);
export const clearErrors = globalErrorHandler.clearErrors.bind(globalErrorHandler);

export default globalErrorHandler;
