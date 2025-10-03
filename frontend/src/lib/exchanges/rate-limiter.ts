/**
 * Rate Limiter for Exchange API Calls
 * Production-ready rate limiting for exchange integrations
 */

export interface RateLimitConfig {
  requestsPerSecond: number;
  requestsPerMinute: number;
  requestsPerHour: number;
  burstLimit?: number;
}

export interface RateLimitState {
  requests: number[];
  lastCleanup: number;
  isBlocked: boolean;
  blockUntil?: number;
}

export class ExchangeRateLimiter {
  private state: RateLimitState;
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
    this.state = {
      requests: [],
      lastCleanup: Date.now(),
      isBlocked: false,
    };
  }

  /**
   * Check if a request can be made
   */
  canMakeRequest(): boolean {
    const now = Date.now();
    
    // Check if currently blocked
    if (this.state.isBlocked && this.state.blockUntil && now < this.state.blockUntil) {
      return false;
    }
    
    // Clear block if time has passed
    if (this.state.isBlocked && this.state.blockUntil && now >= this.state.blockUntil) {
      this.state.isBlocked = false;
      this.state.blockUntil = undefined;
    }
    
    // Cleanup old requests
    this.cleanupOldRequests(now);
    
    // Check rate limits
    const canMake = this.checkRateLimits(now);
    
    if (!canMake) {
      // Block for a short period
      this.state.isBlocked = true;
      this.state.blockUntil = now + 1000; // Block for 1 second
      return false;
    }
    
    return true;
  }

  /**
   * Record a request
   */
  recordRequest(): void {
    const now = Date.now();
    this.state.requests.push(now);
  }

  /**
   * Get wait time until next request can be made
   */
  getWaitTime(): number {
    const now = Date.now();
    
    if (this.state.isBlocked && this.state.blockUntil) {
      return Math.max(0, this.state.blockUntil - now);
    }
    
    this.cleanupOldRequests(now);
    
    // Calculate wait time based on rate limits
    const waitTimes = [
      this.getWaitTimeForLimit(this.config.requestsPerSecond, 1000),
      this.getWaitTimeForLimit(this.config.requestsPerMinute, 60000),
      this.getWaitTimeForLimit(this.config.requestsPerHour, 3600000),
    ];
    
    return Math.max(...waitTimes);
  }

  /**
   * Get current request count for different time windows
   */
  getRequestCounts(): { second: number; minute: number; hour: number } {
    const now = Date.now();
    this.cleanupOldRequests(now);
    
    return {
      second: this.getRequestCountInWindow(1000),
      minute: this.getRequestCountInWindow(60000),
      hour: this.getRequestCountInWindow(3600000),
    };
  }

  /**
   * Reset rate limiter state
   */
  reset(): void {
    this.state = {
      requests: [],
      lastCleanup: Date.now(),
      isBlocked: false,
    };
  }

  /**
   * Update rate limit configuration
   */
  updateConfig(newConfig: RateLimitConfig): void {
    this.config = { ...this.config, ...newConfig };
  }

  private cleanupOldRequests(now: number): void {
    // Cleanup requests older than 1 hour
    const oneHourAgo = now - 3600000;
    this.state.requests = this.state.requests.filter(time => time > oneHourAgo);
    this.state.lastCleanup = now;
  }

  private checkRateLimits(now: number): boolean {
    // Check requests per second
    if (this.getRequestCountInWindow(1000) >= this.config.requestsPerSecond) {
      return false;
    }
    
    // Check requests per minute
    if (this.getRequestCountInWindow(60000) >= this.config.requestsPerMinute) {
      return false;
    }
    
    // Check requests per hour
    if (this.getRequestCountInWindow(3600000) >= this.config.requestsPerHour) {
      return false;
    }
    
    return true;
  }

  private getRequestCountInWindow(windowMs: number): number {
    const now = Date.now();
    const windowStart = now - windowMs;
    return this.state.requests.filter(time => time > windowStart).length;
  }

  private getWaitTimeForLimit(limit: number, windowMs: number): number {
    const now = Date.now();
    const windowStart = now - windowMs;
    const requestsInWindow = this.state.requests.filter(time => time > windowStart);
    
    if (requestsInWindow.length < limit) {
      return 0;
    }
    
    // Find the oldest request in the window
    const oldestRequest = Math.min(...requestsInWindow);
    return Math.max(0, oldestRequest + windowMs - now);
  }
}

/**
 * Global rate limiter manager for multiple exchanges
 */
export class ExchangeRateLimitManager {
  private limiters: Map<string, ExchangeRateLimiter> = new Map();

  /**
   * Get or create a rate limiter for an exchange
   */
  getLimiter(exchangeName: string, config: RateLimitConfig): ExchangeRateLimiter {
    if (!this.limiters.has(exchangeName)) {
      this.limiters.set(exchangeName, new ExchangeRateLimiter(config));
    }
    return this.limiters.get(exchangeName)!;
  }

  /**
   * Check if a request can be made for an exchange
   */
  canMakeRequest(exchangeName: string, config: RateLimitConfig): boolean {
    const limiter = this.getLimiter(exchangeName, config);
    return limiter.canMakeRequest();
  }

  /**
   * Record a request for an exchange
   */
  recordRequest(exchangeName: string, config: RateLimitConfig): void {
    const limiter = this.getLimiter(exchangeName, config);
    limiter.recordRequest();
  }

  /**
   * Get wait time for an exchange
   */
  getWaitTime(exchangeName: string, config: RateLimitConfig): number {
    const limiter = this.getLimiter(exchangeName, config);
    return limiter.getWaitTime();
  }

  /**
   * Get request counts for an exchange
   */
  getRequestCounts(exchangeName: string, config: RateLimitConfig) {
    const limiter = this.getLimiter(exchangeName, config);
    return limiter.getRequestCounts();
  }

  /**
   * Reset rate limiter for an exchange
   */
  resetLimiter(exchangeName: string, config: RateLimitConfig): void {
    const limiter = this.getLimiter(exchangeName, config);
    limiter.reset();
  }

  /**
   * Reset all rate limiters
   */
  resetAll(): void {
    this.limiters.forEach(limiter => limiter.reset());
  }

  /**
   * Get all active limiters
   */
  getActiveLimiters(): string[] {
    return Array.from(this.limiters.keys());
  }
}

// Global rate limit manager instance
export const globalRateLimitManager = new ExchangeRateLimitManager();
