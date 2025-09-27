/**
 * Production-ready Circuit Breaker Pattern
 * Implements circuit breaker with retry logic and exponential backoff
 */

import { logError, logWarn, logInfo } from './logger';

export enum CircuitState {
  CLOSED = 'CLOSED',     // Normal operation
  OPEN = 'OPEN',         // Circuit is open, failing fast
  HALF_OPEN = 'HALF_OPEN' // Testing if service is back
}

export interface CircuitBreakerConfig {
  failureThreshold: number;    // Number of failures before opening circuit
  recoveryTimeout: number;     // Time to wait before trying again (ms)
  monitoringPeriod: number;    // Time window for failure counting (ms)
  expectedFailureRate: number; // Expected failure rate (0-1)
  retryAttempts: number;       // Number of retry attempts
  retryDelay: number;          // Initial retry delay (ms)
  maxRetryDelay: number;       // Maximum retry delay (ms)
  backoffMultiplier: number;   // Multiplier for exponential backoff
}

export interface CircuitBreakerStats {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailureTime: number;
  nextAttemptTime: number;
  totalRequests: number;
  failureRate: number;
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failures: number = 0;
  private successes: number = 0;
  private lastFailureTime: number = 0;
  private nextAttemptTime: number = 0;
  private totalRequests: number = 0;
  private requestHistory: Array<{ timestamp: number; success: boolean }> = [];
  
  constructor(
    private name: string,
    private config: CircuitBreakerConfig
  ) {
    this.startMonitoring();
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    return this.executeWithRetry(operation, 0);
  }

  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    attempt: number
  ): Promise<T> {
    this.totalRequests++;

    // Check if circuit is open
    if (this.state === CircuitState.OPEN) {
      if (Date.now() < this.nextAttemptTime) {
        const error = new Error(`Circuit breaker ${this.name} is OPEN`);
        logWarn(`Circuit breaker ${this.name} is OPEN, failing fast`, 'CircuitBreaker');
        throw error;
      } else {
        this.state = CircuitState.HALF_OPEN;
        logInfo(`Circuit breaker ${this.name} transitioning to HALF_OPEN`, 'CircuitBreaker');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      
      // Check if we should retry
      if (attempt < this.config.retryAttempts && (this.state === CircuitState.CLOSED || this.state === CircuitState.HALF_OPEN)) {
        const delay = this.calculateRetryDelay(attempt);
        logWarn(`Operation failed, retrying in ${delay}ms (attempt ${attempt + 1}/${this.config.retryAttempts})`, 'CircuitBreaker');
        
        await this.sleep(delay);
        return this.executeWithRetry(operation, attempt + 1);
      }
      
      throw error;
    }
  }

  private onSuccess(): void {
    this.successes++;
    this.addToHistory(true);
    
    if (this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.CLOSED;
      this.failures = 0;
      logInfo(`Circuit breaker ${this.name} reset to CLOSED`, 'CircuitBreaker');
    }
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
    this.addToHistory(false);
    
    const failureRate = this.getFailureRate();
    
    if (failureRate >= this.config.expectedFailureRate || 
        this.failures >= this.config.failureThreshold) {
      this.state = CircuitState.OPEN;
      this.nextAttemptTime = Date.now() + this.config.recoveryTimeout;
      logError(`Circuit breaker ${this.name} opened due to high failure rate: ${failureRate.toFixed(2)}`, 'CircuitBreaker');
    }
  }

  private calculateRetryDelay(attempt: number): number {
    const delay = Math.min(
      this.config.retryDelay * Math.pow(this.config.backoffMultiplier, attempt),
      this.config.maxRetryDelay
    );
    
    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 0.1 * delay;
    return Math.floor(delay + jitter);
  }

  private addToHistory(success: boolean): void {
    const now = Date.now();
    this.requestHistory.push({ timestamp: now, success });
    
    // Remove old entries outside monitoring period
    this.requestHistory = this.requestHistory.filter(
      entry => now - entry.timestamp <= this.config.monitoringPeriod
    );
  }

  private getFailureRate(): number {
    if (this.requestHistory.length === 0) return 0;
    
    const failures = this.requestHistory.filter(entry => !entry.success).length;
    return failures / this.requestHistory.length;
  }

  private startMonitoring(): void {
    // Clean up old history entries periodically
    setInterval(() => {
      const now = Date.now();
      this.requestHistory = this.requestHistory.filter(
        entry => now - entry.timestamp <= this.config.monitoringPeriod
      );
    }, this.config.monitoringPeriod / 2);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      lastFailureTime: this.lastFailureTime,
      nextAttemptTime: this.nextAttemptTime,
      totalRequests: this.totalRequests,
      failureRate: this.getFailureRate()
    };
  }

  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failures = 0;
    this.successes = 0;
    this.lastFailureTime = 0;
    this.nextAttemptTime = 0;
    this.totalRequests = 0;
    this.requestHistory = [];
    logInfo(`Circuit breaker ${this.name} manually reset`, 'CircuitBreaker');
  }
}

// Circuit breaker factory with pre-configured settings
export class CircuitBreakerFactory {
  private static breakers = new Map<string, CircuitBreaker>();

  static create(name: string, config?: Partial<CircuitBreakerConfig>): CircuitBreaker {
    const defaultConfig: CircuitBreakerConfig = {
      failureThreshold: 5,
      recoveryTimeout: 60000,     // 1 minute
      monitoringPeriod: 300000,   // 5 minutes
      expectedFailureRate: 0.5,   // 50%
      retryAttempts: 3,
      retryDelay: 1000,           // 1 second
      maxRetryDelay: 30000,       // 30 seconds
      backoffMultiplier: 2,
      ...config
    };

    if (!this.breakers.has(name)) {
      this.breakers.set(name, new CircuitBreaker(name, defaultConfig));
    }

    return this.breakers.get(name)!;
  }

  static get(name: string): CircuitBreaker | undefined {
    return this.breakers.get(name);
  }

  static getAll(): Map<string, CircuitBreaker> {
    return new Map(this.breakers);
  }

  static reset(name: string): void {
    this.breakers.get(name)?.reset();
  }

  static resetAll(): void {
    this.breakers.forEach(breaker => breaker.reset());
  }
}

// Pre-configured circuit breakers for different services
export const circuitBreakers = {
  // Binance API circuit breaker
  binance: CircuitBreakerFactory.create('binance', {
    failureThreshold: 3,
    recoveryTimeout: 30000,     // 30 seconds
    retryAttempts: 2,
    retryDelay: 2000,           // 2 seconds
    expectedFailureRate: 0.3    // 30%
  }),

  // Backend API circuit breaker
  backend: CircuitBreakerFactory.create('backend', {
    failureThreshold: 5,
    recoveryTimeout: 60000,     // 1 minute
    retryAttempts: 3,
    retryDelay: 1000,           // 1 second
    expectedFailureRate: 0.4    // 40%
  }),

  // WebSocket circuit breaker
  websocket: CircuitBreakerFactory.create('websocket', {
    failureThreshold: 2,
    recoveryTimeout: 15000,     // 15 seconds
    retryAttempts: 5,
    retryDelay: 500,            // 500ms
    expectedFailureRate: 0.2    // 20%
  }),

  // File upload circuit breaker
  upload: CircuitBreakerFactory.create('upload', {
    failureThreshold: 3,
    recoveryTimeout: 120000,    // 2 minutes
    retryAttempts: 2,
    retryDelay: 5000,           // 5 seconds
    expectedFailureRate: 0.3    // 30%
  })
};

// Utility function to wrap API calls with circuit breaker
export async function withCircuitBreaker<T>(
  circuitBreakerName: string,
  operation: () => Promise<T>
): Promise<T> {
  const breaker = CircuitBreakerFactory.get(circuitBreakerName);
  if (!breaker) {
    throw new Error(`Circuit breaker ${circuitBreakerName} not found`);
  }
  
  return breaker.execute(operation);
}

// Export for use in other modules
export default {
  CircuitBreaker,
  CircuitBreakerFactory,
  circuitBreakers,
  withCircuitBreaker
};
