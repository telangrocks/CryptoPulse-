/**
 * Production Configuration for Exchange Integration
 * Optimized settings for production trading environment
 */

export interface ExchangeProductionConfig {
  rateLimits: {
    requestsPerSecond: number;
    requestsPerMinute: number;
    requestsPerHour: number;
  };
  timeouts: {
    connection: number;
    request: number;
    idle: number;
  };
  retryConfig: {
    maxRetries: number;
    baseDelay: number;
    maxDelay: number;
    backoffMultiplier: number;
  };
  security: {
    enableIPWhitelist: boolean;
    enableAPIKeyRotation: boolean;
    maxConcurrentConnections: number;
  };
  monitoring: {
    enableMetrics: boolean;
    enableAlerts: boolean;
    logLevel: 'error' | 'warn' | 'info' | 'debug';
  };
}

export const PRODUCTION_EXCHANGE_CONFIG: Record<string, ExchangeProductionConfig> = {
  binance: {
    rateLimits: {
      requestsPerSecond: 10,
      requestsPerMinute: 1200,
      requestsPerHour: 72000,
    },
    timeouts: {
      connection: 5000,
      request: 10000,
      idle: 30000,
    },
    retryConfig: {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      backoffMultiplier: 2,
    },
    security: {
      enableIPWhitelist: true,
      enableAPIKeyRotation: true,
      maxConcurrentConnections: 5,
    },
    monitoring: {
      enableMetrics: true,
      enableAlerts: true,
      logLevel: 'info',
    },
  },
  wazirx: {
    rateLimits: {
      requestsPerSecond: 5,
      requestsPerMinute: 300,
      requestsPerHour: 18000,
    },
    timeouts: {
      connection: 8000,
      request: 15000,
      idle: 45000,
    },
    retryConfig: {
      maxRetries: 3,
      baseDelay: 2000,
      maxDelay: 15000,
      backoffMultiplier: 2.5,
    },
    security: {
      enableIPWhitelist: true,
      enableAPIKeyRotation: true,
      maxConcurrentConnections: 3,
    },
    monitoring: {
      enableMetrics: true,
      enableAlerts: true,
      logLevel: 'info',
    },
  },
  coindcx: {
    rateLimits: {
      requestsPerSecond: 8,
      requestsPerMinute: 480,
      requestsPerHour: 28800,
    },
    timeouts: {
      connection: 6000,
      request: 12000,
      idle: 40000,
    },
    retryConfig: {
      maxRetries: 3,
      baseDelay: 1500,
      maxDelay: 12000,
      backoffMultiplier: 2,
    },
    security: {
      enableIPWhitelist: true,
      enableAPIKeyRotation: true,
      maxConcurrentConnections: 4,
    },
    monitoring: {
      enableMetrics: true,
      enableAlerts: true,
      logLevel: 'info',
    },
  },
  delta: {
    rateLimits: {
      requestsPerSecond: 6,
      requestsPerMinute: 360,
      requestsPerHour: 21600,
    },
    timeouts: {
      connection: 7000,
      request: 13000,
      idle: 42000,
    },
    retryConfig: {
      maxRetries: 3,
      baseDelay: 1800,
      maxDelay: 13000,
      backoffMultiplier: 2.2,
    },
    security: {
      enableIPWhitelist: true,
      enableAPIKeyRotation: true,
      maxConcurrentConnections: 3,
    },
    monitoring: {
      enableMetrics: true,
      enableAlerts: true,
      logLevel: 'info',
    },
  },
  coinbase: {
    rateLimits: {
      requestsPerSecond: 10,
      requestsPerMinute: 600,
      requestsPerHour: 36000,
    },
    timeouts: {
      connection: 5000,
      request: 10000,
      idle: 30000,
    },
    retryConfig: {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      backoffMultiplier: 2,
    },
    security: {
      enableIPWhitelist: true,
      enableAPIKeyRotation: true,
      maxConcurrentConnections: 5,
    },
    monitoring: {
      enableMetrics: true,
      enableAlerts: true,
      logLevel: 'info',
    },
  },
};

export const EXCHANGE_PRODUCTION_DEFAULTS = {
  // Global production settings
  enableCircuitBreaker: true,
  circuitBreakerThreshold: 5,
  circuitBreakerTimeout: 60000,
  
  // Risk management
  maxOrderSize: 10000, // USD
  minOrderSize: 10, // USD
  maxDailyVolume: 100000, // USD
  
  // Monitoring
  enablePerformanceMonitoring: true,
  enableErrorTracking: true,
  enableAuditLogging: true,
  
  // Security
  enableRequestSigning: true,
  enableResponseValidation: true,
  enableRateLimitEnforcement: true,
  
  // High availability
  enableFailover: true,
  enableLoadBalancing: true,
  healthCheckInterval: 30000,
  
  // Compliance
  enableComplianceChecks: true,
  enableTransactionLogging: true,
  enableRegulatoryReporting: true,
};

/**
 * Get production configuration for a specific exchange
 */
export function getProductionConfig(exchangeName: string): ExchangeProductionConfig {
  return PRODUCTION_EXCHANGE_CONFIG[exchangeName] || PRODUCTION_EXCHANGE_CONFIG.binance;
}

/**
 * Validate production configuration
 */
export function validateProductionConfig(config: ExchangeProductionConfig): boolean {
  const { rateLimits, timeouts, retryConfig, security, monitoring } = config;
  
  // Validate rate limits
  if (rateLimits.requestsPerSecond <= 0 || rateLimits.requestsPerMinute <= 0 || rateLimits.requestsPerHour <= 0) {
    return false;
  }
  
  // Validate timeouts
  if (timeouts.connection <= 0 || timeouts.request <= 0 || timeouts.idle <= 0) {
    return false;
  }
  
  // Validate retry config
  if (retryConfig.maxRetries < 0 || retryConfig.baseDelay <= 0 || retryConfig.maxDelay <= 0) {
    return false;
  }
  
  // Validate security
  if (security.maxConcurrentConnections <= 0) {
    return false;
  }
  
  return true;
}

/**
 * Apply production optimizations
 */
export function applyProductionOptimizations(exchangeName: string): ExchangeProductionConfig {
  const config = getProductionConfig(exchangeName);
  
  if (!validateProductionConfig(config)) {
    throw new Error(`Invalid production configuration for ${exchangeName}`);
  }
  
  return config;
}
