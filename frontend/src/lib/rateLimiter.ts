/**
 * Rate limiting system for API calls and operations
 * Implements token bucket algorithm for fair rate limiting
 */

import React from 'react';
import { logWarn, logError } from '../lib/logger';

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  keyGenerator?: (identifier: string) => string;
}

interface RateLimitEntry {
  tokens: number;
  lastRefill: number;
  requests: number;
}

class RateLimiter {
  private config: Required<RateLimitConfig>;
  private buckets = new Map<string, RateLimitEntry>();
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(config: RateLimitConfig) {
    this.config = {
      maxRequests: config.maxRequests,
      windowMs: config.windowMs,
      keyGenerator: config.keyGenerator || ((id: string) => id),
    };

    this.startCleanup();
  }

  /**
   * Check if request is allowed and consume a token
   */
  isAllowed(identifier: string): boolean {
    const key = this.config.keyGenerator(identifier);
    const now = Date.now();
    
    let entry = this.buckets.get(key);
    
    if (!entry) {
      entry = {
        tokens: this.config.maxRequests - 1,
        lastRefill: now,
        requests: 1,
      };
      this.buckets.set(key, entry);
      return true;
    }

    // Refill tokens based on time passed
    const timePassed = now - entry.lastRefill;
    const tokensToAdd = Math.floor(timePassed / this.config.windowMs) * this.config.maxRequests;
    
    if (tokensToAdd > 0) {
      entry.tokens = Math.min(this.config.maxRequests, entry.tokens + tokensToAdd);
      entry.lastRefill = now;
    }

    // Check if we have tokens available
    if (entry.tokens > 0) {
      entry.tokens--;
      entry.requests++;
      return true;
    }

    // No tokens available
    logWarn(`Rate limit exceeded for ${identifier}`, 'RateLimiter');
    return false;
  }

  /**
   * Get remaining tokens for an identifier
   */
  getRemainingTokens(identifier: string): number {
    const key = this.config.keyGenerator(identifier);
    const entry = this.buckets.get(key);
    
    if (!entry) {
      return this.config.maxRequests;
    }

    const now = Date.now();
    const timePassed = now - entry.lastRefill;
    const tokensToAdd = Math.floor(timePassed / this.config.windowMs) * this.config.maxRequests;
    
    return Math.min(this.config.maxRequests, entry.tokens + tokensToAdd);
  }

  /**
   * Get reset time for an identifier
   */
  getResetTime(identifier: string): number {
    const key = this.config.keyGenerator(identifier);
    const entry = this.buckets.get(key);
    
    if (!entry) {
      return 0;
    }

    const now = Date.now();
    const timePassed = now - entry.lastRefill;
    const nextRefill = Math.ceil(timePassed / this.config.windowMs) * this.config.windowMs;
    
    return entry.lastRefill + nextRefill;
  }

  /**
   * Get rate limit info for an identifier
   */
  getRateLimitInfo(identifier: string): {
    remaining: number;
    resetTime: number;
    limit: number;
    requests: number;
  } {
    return {
      remaining: this.getRemainingTokens(identifier),
      resetTime: this.getResetTime(identifier),
      limit: this.config.maxRequests,
      requests: this.buckets.get(this.config.keyGenerator(identifier))?.requests || 0,
    };
  }

  /**
   * Reset rate limit for an identifier
   */
  reset(identifier: string): void {
    const key = this.config.keyGenerator(identifier);
    this.buckets.delete(key);
  }

  /**
   * Clear all rate limits
   */
  clear(): void {
    this.buckets.clear();
  }

  /**
   * Start cleanup timer to remove old entries
   */
  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.windowMs * 2); // Cleanup every 2 windows
  }

  /**
   * Clean up old entries
   */
  private cleanup(): void {
    const now = Date.now();
    const cutoff = now - this.config.windowMs * 2;
    
    for (const [key, entry] of this.buckets.entries()) {
      if (entry.lastRefill < cutoff) {
        this.buckets.delete(key);
      }
    }
  }

  /**
   * Destroy rate limiter
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.clear();
  }
}

// Create rate limiters for different operations
export const apiRateLimiter = new RateLimiter({
  maxRequests: 100, // 100 requests
  windowMs: 60 * 1000, // per minute
  keyGenerator: (id: string) => `api_${id}`,
});

export const tradingRateLimiter = new RateLimiter({
  maxRequests: 10, // 10 trades
  windowMs: 60 * 1000, // per minute
  keyGenerator: (id: string) => `trading_${id}`,
});

export const authRateLimiter = new RateLimiter({
  maxRequests: 5, // 5 auth attempts
  windowMs: 15 * 60 * 1000, // per 15 minutes
  keyGenerator: (id: string) => `auth_${id}`,
});

// Rate limiting decorator for functions
export function rateLimited(
  rateLimiter: RateLimiter,
  identifier: string | ((...args: any[]) => string)
) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = function (...args: any[]) {
      const id = typeof identifier === 'function' ? identifier(...args) : identifier;
      
      if (!rateLimiter.isAllowed(id)) {
        const info = rateLimiter.getRateLimitInfo(id);
        const resetTime = new Date(info.resetTime).toLocaleTimeString();
        throw new Error(`Rate limit exceeded. Try again after ${resetTime}`);
      }

      return method.apply(this, args);
    };
  };
}

// Rate limiting hook for React components
export function useRateLimit(
  identifier: string,
  rateLimiter: RateLimiter = apiRateLimiter
) {
  const [isAllowed, setIsAllowed] = React.useState(true);
  const [info, setInfo] = React.useState(rateLimiter.getRateLimitInfo(identifier));

  const checkRateLimit = React.useCallback(() => {
    const allowed = rateLimiter.isAllowed(identifier);
    const rateInfo = rateLimiter.getRateLimitInfo(identifier);
    
    setIsAllowed(allowed);
    setInfo(rateInfo);
    
    return allowed;
  }, [identifier, rateLimiter]);

  React.useEffect(() => {
    checkRateLimit();
  }, [checkRateLimit]);

  return {
    isAllowed,
    info,
    checkRateLimit,
  };
}

export default RateLimiter;
