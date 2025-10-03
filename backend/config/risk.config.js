/**
 * Risk Management Production Configuration
 * 
 * This configuration file provides production-ready settings
 * for the risk management system.
 */

const config = {
  // Environment-specific configurations
  development: {
    risk: {
      maxRiskPerTrade: 0.05, // 5% for development
      maxDailyLoss: 0.10, // 10% for development
      maxDrawdown: 0.15, // 15% for development
      maxConcurrentTrades: 10,
      maxDailyTrades: 100,
      minConfidenceThreshold: 60,
      maxLeverage: 20,
      maxPositionSize: 0.8,
      correlationLimit: 0.8,
      volatilityLimit: 0.5,
      liquidityThreshold: 500000,
      circuitBreakerThreshold: 0.20,
      circuitBreakerTimeout: 1800000, // 30 minutes
      circuitBreakerMaxFailures: 5,
      maxMemoryUsage: 0.9,
      maxCpuUsage: 0.9,
      maxConnections: 200,
      maxRequestsPerMinute: 2000,
      anomalyThreshold: 2.5,
      suspiciousActivityThreshold: 15,
      maxFailedAttempts: 10,
      lockoutDuration: 600000, // 10 minutes
    },
    monitoring: {
      riskMonitoringInterval: 60000, // 1 minute
      resourceMonitoringInterval: 30000, // 30 seconds
      threatDetectionInterval: 120000, // 2 minutes
      circuitBreakerMonitoringInterval: 10000, // 10 seconds
    },
    logging: {
      level: 'debug',
      enableDetailedLogging: true,
      enablePerformanceLogging: true,
    },
  },

  staging: {
    risk: {
      maxRiskPerTrade: 0.03, // 3% for staging
      maxDailyLoss: 0.07, // 7% for staging
      maxDrawdown: 0.12, // 12% for staging
      maxConcurrentTrades: 8,
      maxDailyTrades: 75,
      minConfidenceThreshold: 70,
      maxLeverage: 15,
      maxPositionSize: 0.6,
      correlationLimit: 0.75,
      volatilityLimit: 0.4,
      liquidityThreshold: 750000,
      circuitBreakerThreshold: 0.15,
      circuitBreakerTimeout: 2700000, // 45 minutes
      circuitBreakerMaxFailures: 4,
      maxMemoryUsage: 0.85,
      maxCpuUsage: 0.85,
      maxConnections: 150,
      maxRequestsPerMinute: 1500,
      anomalyThreshold: 2.8,
      suspiciousActivityThreshold: 12,
      maxFailedAttempts: 7,
      lockoutDuration: 450000, // 7.5 minutes
    },
    monitoring: {
      riskMonitoringInterval: 45000, // 45 seconds
      resourceMonitoringInterval: 25000, // 25 seconds
      threatDetectionInterval: 90000, // 1.5 minutes
      circuitBreakerMonitoringInterval: 8000, // 8 seconds
    },
    logging: {
      level: 'info',
      enableDetailedLogging: true,
      enablePerformanceLogging: true,
    },
  },

  production: {
    risk: {
      maxRiskPerTrade: 0.02, // 2% for production
      maxDailyLoss: 0.05, // 5% for production
      maxDrawdown: 0.10, // 10% for production
      maxConcurrentTrades: 5,
      maxDailyTrades: 50,
      minConfidenceThreshold: 75,
      maxLeverage: 10,
      maxPositionSize: 0.5,
      correlationLimit: 0.7,
      volatilityLimit: 0.3,
      liquidityThreshold: 1000000,
      circuitBreakerThreshold: 0.12,
      circuitBreakerTimeout: 3600000, // 1 hour
      circuitBreakerMaxFailures: 3,
      maxMemoryUsage: 0.8,
      maxCpuUsage: 0.8,
      maxConnections: 100,
      maxRequestsPerMinute: 1000,
      anomalyThreshold: 3.0,
      suspiciousActivityThreshold: 10,
      maxFailedAttempts: 5,
      lockoutDuration: 300000, // 5 minutes
    },
    monitoring: {
      riskMonitoringInterval: 30000, // 30 seconds
      resourceMonitoringInterval: 20000, // 20 seconds
      threatDetectionInterval: 60000, // 1 minute
      circuitBreakerMonitoringInterval: 5000, // 5 seconds
    },
    logging: {
      level: 'warn',
      enableDetailedLogging: false,
      enablePerformanceLogging: true,
    },
  },
};

// Get current environment
const environment = process.env.NODE_ENV || 'development';

// Export configuration for current environment
const currentConfig = config[environment] || config.development;

// Export with metadata
module.exports = {
  ...currentConfig,
  environment,
  version: '1.0.0',
  lastUpdated: new Date().toISOString(),
  metadata: {
    description: 'Risk Management Production Configuration',
    author: 'CryptoPulse Team',
    license: 'MIT',
  },
};
