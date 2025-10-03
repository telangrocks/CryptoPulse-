/**
 * Error Handler for Exchange API Calls
 * Production-ready error handling for exchange integrations
 */

export interface ExchangeError {
  code: string;
  message: string;
  exchange: string;
  timestamp: number;
  requestId?: string;
  retryable: boolean;
  category: 'network' | 'authentication' | 'rate_limit' | 'validation' | 'server' | 'unknown';
}

export interface ErrorHandlerConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableErrors: string[];
  nonRetryableErrors: string[];
}

export class ExchangeErrorHandler {
  private config: ErrorHandlerConfig;

  constructor(config: ErrorHandlerConfig) {
    this.config = {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      backoffMultiplier: 2,
      retryableErrors: [
        'NETWORK_ERROR',
        'TIMEOUT',
        'RATE_LIMIT_EXCEEDED',
        'SERVER_ERROR',
        'TEMPORARY_UNAVAILABLE',
      ],
      nonRetryableErrors: [
        'INVALID_API_KEY',
        'INSUFFICIENT_BALANCE',
        'INVALID_SYMBOL',
        'INVALID_ORDER',
        'ACCOUNT_SUSPENDED',
      ],
      ...config,
    };
  }

  /**
   * Parse and categorize an error
   */
  parseError(error: any, exchange: string, requestId?: string): ExchangeError {
    const timestamp = Date.now();
    
    // Handle different error types
    if (error instanceof Error) {
      return this.parseStandardError(error, exchange, timestamp, requestId);
    }
    
    if (typeof error === 'string') {
      return this.parseStringError(error, exchange, timestamp, requestId);
    }
    
    if (typeof error === 'object' && error !== null) {
      return this.parseObjectError(error, exchange, timestamp, requestId);
    }
    
    return {
      code: 'UNKNOWN_ERROR',
      message: 'An unknown error occurred',
      exchange,
      timestamp,
      requestId,
      retryable: false,
      category: 'unknown',
    };
  }

  /**
   * Determine if an error should be retried
   */
  shouldRetry(error: ExchangeError, attemptCount: number): boolean {
    if (attemptCount >= this.config.maxRetries) {
      return false;
    }
    
    if (!error.retryable) {
      return false;
    }
    
    return this.config.retryableErrors.includes(error.code);
  }

  /**
   * Calculate delay for retry
   */
  getRetryDelay(attemptCount: number): number {
    const delay = this.config.baseDelay * Math.pow(this.config.backoffMultiplier, attemptCount);
    return Math.min(delay, this.config.maxDelay);
  }

  /**
   * Handle error with retry logic
   */
  async handleErrorWithRetry<T>(
    operation: () => Promise<T>,
    exchange: string,
    requestId?: string,
    attemptCount = 0
  ): Promise<T> {
    try {
      const result = await operation();
      return result;
    } catch (error) {
      const parsedError = this.parseError(error, exchange, requestId);
      
      if (this.shouldRetry(parsedError, attemptCount)) {
        const delay = this.getRetryDelay(attemptCount);
        
        // Log retry attempt
        this.logRetryAttempt(parsedError, attemptCount + 1, delay);
        
        // Wait before retry
        await this.sleep(delay);
        
        // Retry the operation
        return this.handleErrorWithRetry(operation, exchange, requestId, attemptCount + 1);
      } else {
        // Log final error
        this.logFinalError(parsedError, attemptCount);
        throw parsedError;
      }
    }
  }

  /**
   * Log error for monitoring
   */
  logError(error: ExchangeError, context?: any): void {
    const logData = {
      exchange: error.exchange,
      code: error.code,
      message: error.message,
      category: error.category,
      retryable: error.retryable,
      timestamp: error.timestamp,
      requestId: error.requestId,
      context,
    };
    
    // In production, this would send to monitoring service
    if (error.category === 'server' || error.category === 'network') {
      console.error('Exchange API Error:', logData);
    } else {
      console.warn('Exchange API Warning:', logData);
    }
  }

  private parseStandardError(error: Error, exchange: string, timestamp: number, requestId?: string): ExchangeError {
    const message = error.message.toLowerCase();
    
    if (message.includes('network') || message.includes('fetch')) {
      return {
        code: 'NETWORK_ERROR',
        message: error.message,
        exchange,
        timestamp,
        requestId,
        retryable: true,
        category: 'network',
      };
    }
    
    if (message.includes('timeout')) {
      return {
        code: 'TIMEOUT',
        message: error.message,
        exchange,
        timestamp,
        requestId,
        retryable: true,
        category: 'network',
      };
    }
    
    if (message.includes('unauthorized') || message.includes('forbidden')) {
      return {
        code: 'AUTHENTICATION_ERROR',
        message: error.message,
        exchange,
        timestamp,
        requestId,
        retryable: false,
        category: 'authentication',
      };
    }
    
    return {
      code: 'UNKNOWN_ERROR',
      message: error.message,
      exchange,
      timestamp,
      requestId,
      retryable: false,
      category: 'unknown',
    };
  }

  private parseStringError(error: string, exchange: string, timestamp: number, requestId?: string): ExchangeError {
    const message = error.toLowerCase();
    
    if (message.includes('rate limit')) {
      return {
        code: 'RATE_LIMIT_EXCEEDED',
        message: error,
        exchange,
        timestamp,
        requestId,
        retryable: true,
        category: 'rate_limit',
      };
    }
    
    if (message.includes('invalid')) {
      return {
        code: 'VALIDATION_ERROR',
        message: error,
        exchange,
        timestamp,
        requestId,
        retryable: false,
        category: 'validation',
      };
    }
    
    return {
      code: 'UNKNOWN_ERROR',
      message: error,
      exchange,
      timestamp,
      requestId,
      retryable: false,
      category: 'unknown',
    };
  }

  private parseObjectError(error: any, exchange: string, timestamp: number, requestId?: string): ExchangeError {
    const code = error.code || error.error || 'UNKNOWN_ERROR';
    const message = error.message || error.msg || 'An error occurred';
    
    // Determine if error is retryable based on code
    const retryable = this.config.retryableErrors.includes(code) && 
                     !this.config.nonRetryableErrors.includes(code);
    
    // Categorize error
    let category: ExchangeError['category'] = 'unknown';
    if (code.includes('AUTH') || code.includes('UNAUTHORIZED')) {
      category = 'authentication';
    } else if (code.includes('RATE') || code.includes('LIMIT')) {
      category = 'rate_limit';
    } else if (code.includes('VALID') || code.includes('INVALID')) {
      category = 'validation';
    } else if (code.includes('SERVER') || code.includes('INTERNAL')) {
      category = 'server';
    } else if (code.includes('NETWORK') || code.includes('TIMEOUT')) {
      category = 'network';
    }
    
    return {
      code,
      message,
      exchange,
      timestamp,
      requestId,
      retryable,
      category,
    };
  }

  private logRetryAttempt(error: ExchangeError, attemptCount: number, delay: number): void {
    console.warn(`Retrying ${error.exchange} API call (attempt ${attemptCount}):`, {
      code: error.code,
      message: error.message,
      delay,
      requestId: error.requestId,
    });
  }

  private logFinalError(error: ExchangeError, attemptCount: number): void {
    console.error(`Final error after ${attemptCount} attempts for ${error.exchange}:`, {
      code: error.code,
      message: error.message,
      category: error.category,
      retryable: error.retryable,
      requestId: error.requestId,
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Global error handler instance
 */
export const globalErrorHandler = new ExchangeErrorHandler({});
