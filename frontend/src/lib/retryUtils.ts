import { logError, logWarn, logInfo } from './logger';

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryCondition?: (error: any) => boolean;
  onRetry?: (attempt: number, error: any) => void;
}

export const defaultRetryConfig: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  retryCondition: (error) => {
    // Retry on network errors, timeouts, and 5xx server errors
    if (!error) return false;
    
    // Network errors
    if (error.name === 'NetworkError' || error.code === 'NETWORK_ERROR') return true;
    
    // Timeout errors
    if (error.name === 'TimeoutError' || error.code === 'TIMEOUT') return true;
    
    // HTTP status codes
    if (error.status || error.statusCode) {
      const status = error.status || error.statusCode;
      // Retry on server errors (5xx) and rate limiting (429)
      return status >= 500 || status === 429;
    }
    
    // Connection errors
    if (error.message?.includes('fetch')) return true;
    if (error.message?.includes('network')) return true;
    if (error.message?.includes('timeout')) return true;
    
    return false;
  }
};

export async function withRetry<T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const finalConfig = { ...defaultRetryConfig, ...config };
  let lastError: any;
  
  for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
    try {
      const result = await operation();
      
      if (attempt > 1) {
        logInfo(`Operation succeeded on attempt ${attempt}`, 'RetryUtils');
      }
      
      return result;
    } catch (error) {
      lastError = error;
      
      // Check if we should retry
      const shouldRetry = attempt < finalConfig.maxAttempts && 
        (!finalConfig.retryCondition || finalConfig.retryCondition(error));
      
      if (!shouldRetry) {
        logError(`Operation failed after ${attempt} attempts`, 'RetryUtils', error);
        throw error;
      }
      
      // Calculate delay with exponential backoff
      const delay = Math.min(
        finalConfig.baseDelay * Math.pow(finalConfig.backoffMultiplier, attempt - 1),
        finalConfig.maxDelay
      );
      
      logWarn(`Operation failed on attempt ${attempt}, retrying in ${delay}ms`, 'RetryUtils', error);
      
      // Call retry callback if provided
      if (finalConfig.onRetry) {
        finalConfig.onRetry(attempt, error);
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

// Specialized retry configurations for different types of operations
export const retryConfigs = {
  // For API calls to external services
  apiCall: {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 5000,
    backoffMultiplier: 2,
    retryCondition: (error: any) => {
      const status = error.status || error.statusCode;
      return status >= 500 || status === 429 || !error.status;
    }
  },
  
  // For WebSocket connections
  websocket: {
    maxAttempts: 5,
    baseDelay: 500,
    maxDelay: 5000,
    backoffMultiplier: 1.5,
    retryCondition: (error: any) => {
      return error.code === 'ECONNREFUSED' || 
             error.code === 'TIMEOUT' || 
             error.message?.includes('connection');
    }
  },
  
  // For file uploads
  upload: {
    maxAttempts: 2,
    baseDelay: 2000,
    maxDelay: 10000,
    backoffMultiplier: 2,
    retryCondition: (error: any) => {
      const status = error.status || error.statusCode;
      return status >= 500 || status === 413 || !error.status;
    }
  },
  
  // For critical operations (like trade execution)
  critical: {
    maxAttempts: 2,
    baseDelay: 500,
    maxDelay: 2000,
    backoffMultiplier: 2,
    retryCondition: (error: any) => {
      // Only retry on network issues, not on business logic errors
      return !error.status || error.status >= 500;
    }
  }
};

// Utility function to wrap fetch calls with retry
export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  config: Partial<RetryConfig> = {}
): Promise<Response> {
  return withRetry(
    async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout
      
      try {
        const response = await fetch(url, {
          ...options,
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
          (error as any).status = response.status;
          (error as any).statusCode = response.status;
          throw error;
        }
        
        return response;
      } catch (error) {
        clearTimeout(timeoutId);
        
        if ((error as any).name === 'AbortError') {
          const timeoutError = new Error('Request timeout');
          (timeoutError as any).code = 'TIMEOUT';
          throw timeoutError;
        }
        
        throw error;
      }
    },
    config
  );
}

// Utility function to wrap async operations with circuit breaker and retry
export async function withResilience<T>(
  operation: () => Promise<T>,
  options: {
    retryConfig?: Partial<RetryConfig>;
    circuitBreakerName?: string;
  } = {}
): Promise<T> {
  let wrappedOperation = operation;
  
  // Add retry if configured
  if (options.retryConfig) {
    wrappedOperation = () => withRetry(operation, options.retryConfig);
  }
  
  // Add circuit breaker if configured
  if (options.circuitBreakerName) {
    const { withCircuitBreaker } = await import('./circuitBreaker');
    wrappedOperation = () => withCircuitBreaker(options.circuitBreakerName!, operation);
  }
  
  return wrappedOperation();
}
