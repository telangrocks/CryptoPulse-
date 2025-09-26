/**
 * Production-Ready Metrics Collection System for Back4App
 * Implements comprehensive metrics collection and analysis
 * 
 * @author Shrikant Telang
 * @version 2.0.0
 */

const winston = require('winston');

// Configure logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/metrics.log' })
  ]
});

// Metrics storage
const metrics = {
  requests: {
    total: 0,
    successful: 0,
    failed: 0,
    byEndpoint: new Map(),
    byMethod: new Map(),
    byStatus: new Map()
  },
  performance: {
    responseTimes: [],
    averageResponseTime: 0,
    p95ResponseTime: 0,
    p99ResponseTime: 0,
    slowestEndpoints: []
  },
  errors: {
    total: 0,
    byType: new Map(),
    byEndpoint: new Map(),
    recent: []
  },
  trading: {
    totalTrades: 0,
    successfulTrades: 0,
    failedTrades: 0,
    totalVolume: 0,
    totalProfit: 0,
    byStrategy: new Map(),
    byPair: new Map()
  },
  system: {
    memoryUsage: [],
    cpuUsage: [],
    uptime: 0,
    startTime: Date.now()
  },
  cache: {
    hits: 0,
    misses: 0,
    hitRate: 0,
    byKey: new Map()
  },
  security: {
    failedLogins: 0,
    blockedRequests: 0,
    suspiciousActivities: 0,
    rateLimitHits: 0
  }
};

// Configuration
const METRICS_CONFIG = {
  MAX_RESPONSE_TIMES: 1000,
  MAX_ERROR_HISTORY: 100,
  MAX_MEMORY_SAMPLES: 100,
  COLLECTION_INTERVAL: 60000, // 1 minute
  RETENTION_PERIOD: 24 * 60 * 60 * 1000 // 24 hours
};

/**
 * Record request metric
 */
function recordRequest(endpoint, method, statusCode, responseTime, userId = null) {
  const isSuccess = statusCode >= 200 && statusCode < 400;
  
  // Update counters
  metrics.requests.total++;
  if (isSuccess) {
    metrics.requests.successful++;
  } else {
    metrics.requests.failed++;
  }
  
  // Update by endpoint
  const endpointKey = `${method} ${endpoint}`;
  if (!metrics.requests.byEndpoint.has(endpointKey)) {
    metrics.requests.byEndpoint.set(endpointKey, { total: 0, successful: 0, failed: 0 });
  }
  const endpointMetrics = metrics.requests.byEndpoint.get(endpointKey);
  endpointMetrics.total++;
  if (isSuccess) {
    endpointMetrics.successful++;
  } else {
    endpointMetrics.failed++;
  }
  
  // Update by method
  if (!metrics.requests.byMethod.has(method)) {
    metrics.requests.byMethod.set(method, { total: 0, successful: 0, failed: 0 });
  }
  const methodMetrics = metrics.requests.byMethod.get(method);
  methodMetrics.total++;
  if (isSuccess) {
    methodMetrics.successful++;
  } else {
    methodMetrics.failed++;
  }
  
  // Update by status
  if (!metrics.requests.byStatus.has(statusCode)) {
    metrics.requests.byStatus.set(statusCode, 0);
  }
  metrics.requests.byStatus.set(statusCode, metrics.requests.byStatus.get(statusCode) + 1);
  
  // Update performance metrics
  metrics.performance.responseTimes.push({
    endpoint: endpointKey,
    responseTime,
    timestamp: Date.now()
  });
  
  // Keep only recent response times
  if (metrics.performance.responseTimes.length > METRICS_CONFIG.MAX_RESPONSE_TIMES) {
    metrics.performance.responseTimes = metrics.performance.responseTimes.slice(-METRICS_CONFIG.MAX_RESPONSE_TIMES);
  }
  
  // Update average response time
  updateAverageResponseTime();
  
  // Log slow requests
  if (responseTime > 5000) { // 5 seconds
    logger.warn('Slow request detected', {
      endpoint: endpointKey,
      responseTime,
      userId
    });
  }
}

/**
 * Record error metric
 */
function recordError(error, endpoint, userId = null) {
  metrics.errors.total++;
  
  const errorType = error.constructor.name;
  if (!metrics.errors.byType.has(errorType)) {
    metrics.errors.byType.set(errorType, 0);
  }
  metrics.errors.byType.set(errorType, metrics.errors.byType.get(errorType) + 1);
  
  if (!metrics.errors.byEndpoint.has(endpoint)) {
    metrics.errors.byEndpoint.set(endpoint, 0);
  }
  metrics.errors.byEndpoint.set(endpoint, metrics.errors.byEndpoint.get(endpoint) + 1);
  
  // Store recent errors
  metrics.errors.recent.push({
    error: error.message,
    type: errorType,
    endpoint,
    userId,
    timestamp: Date.now(),
    stack: error.stack
  });
  
  // Keep only recent errors
  if (metrics.errors.recent.length > METRICS_CONFIG.MAX_ERROR_HISTORY) {
    metrics.errors.recent = metrics.errors.recent.slice(-METRICS_CONFIG.MAX_ERROR_HISTORY);
  }
  
  logger.error('Error recorded', {
    error: error.message,
    type: errorType,
    endpoint,
    userId
  });
}

/**
 * Record trading metric
 */
function recordTrading(pair, strategy, action, amount, success, profit = 0) {
  metrics.trading.totalTrades++;
  
  if (success) {
    metrics.trading.successfulTrades++;
    metrics.trading.totalVolume += amount;
    metrics.trading.totalProfit += profit;
  } else {
    metrics.trading.failedTrades++;
  }
  
  // Update by strategy
  if (!metrics.trading.byStrategy.has(strategy)) {
    metrics.trading.byStrategy.set(strategy, { total: 0, successful: 0, failed: 0, volume: 0, profit: 0 });
  }
  const strategyMetrics = metrics.trading.byStrategy.get(strategy);
  strategyMetrics.total++;
  if (success) {
    strategyMetrics.successful++;
    strategyMetrics.volume += amount;
    strategyMetrics.profit += profit;
  } else {
    strategyMetrics.failed++;
  }
  
  // Update by pair
  if (!metrics.trading.byPair.has(pair)) {
    metrics.trading.byPair.set(pair, { total: 0, successful: 0, failed: 0, volume: 0, profit: 0 });
  }
  const pairMetrics = metrics.trading.byPair.get(pair);
  pairMetrics.total++;
  if (success) {
    pairMetrics.successful++;
    pairMetrics.volume += amount;
    pairMetrics.profit += profit;
  } else {
    pairMetrics.failed++;
  }
  
  logger.info('Trading metric recorded', {
    pair,
    strategy,
    action,
    amount,
    success,
    profit
  });
}

/**
 * Record cache metric
 */
function recordCacheHit(key) {
  metrics.cache.hits++;
  updateCacheHitRate();
  
  if (!metrics.cache.byKey.has(key)) {
    metrics.cache.byKey.set(key, { hits: 0, misses: 0 });
  }
  const keyMetrics = metrics.cache.byKey.get(key);
  keyMetrics.hits++;
}

function recordCacheMiss(key) {
  metrics.cache.misses++;
  updateCacheHitRate();
  
  if (!metrics.cache.byKey.has(key)) {
    metrics.cache.byKey.set(key, { hits: 0, misses: 0 });
  }
  const keyMetrics = metrics.cache.byKey.get(key);
  keyMetrics.misses++;
}

/**
 * Record security metric
 */
function recordSecurityEvent(eventType, details = {}) {
  switch (eventType) {
    case 'failed_login':
      metrics.security.failedLogins++;
      break;
    case 'blocked_request':
      metrics.security.blockedRequests++;
      break;
    case 'suspicious_activity':
      metrics.security.suspiciousActivities++;
      break;
    case 'rate_limit_hit':
      metrics.security.rateLimitHits++;
      break;
  }
  
  logger.warn('Security event recorded', {
    eventType,
    details
  });
}

/**
 * Update average response time
 */
function updateAverageResponseTime() {
  if (metrics.performance.responseTimes.length === 0) {
    metrics.performance.averageResponseTime = 0;
    return;
  }
  
  const totalTime = metrics.performance.responseTimes.reduce((sum, req) => sum + req.responseTime, 0);
  metrics.performance.averageResponseTime = totalTime / metrics.performance.responseTimes.length;
  
  // Calculate percentiles
  const sortedTimes = metrics.performance.responseTimes
    .map(req => req.responseTime)
    .sort((a, b) => a - b);
  
  const p95Index = Math.floor(sortedTimes.length * 0.95);
  const p99Index = Math.floor(sortedTimes.length * 0.99);
  
  metrics.performance.p95ResponseTime = sortedTimes[p95Index] || 0;
  metrics.performance.p99ResponseTime = sortedTimes[p99Index] || 0;
  
  // Update slowest endpoints
  const endpointTimes = new Map();
  metrics.performance.responseTimes.forEach(req => {
    if (!endpointTimes.has(req.endpoint)) {
      endpointTimes.set(req.endpoint, []);
    }
    endpointTimes.get(req.endpoint).push(req.responseTime);
  });
  
  metrics.performance.slowestEndpoints = Array.from(endpointTimes.entries())
    .map(([endpoint, times]) => ({
      endpoint,
      averageTime: times.reduce((sum, time) => sum + time, 0) / times.length,
      maxTime: Math.max(...times),
      count: times.length
    }))
    .sort((a, b) => b.averageTime - a.averageTime)
    .slice(0, 10);
}

/**
 * Update cache hit rate
 */
function updateCacheHitRate() {
  const total = metrics.cache.hits + metrics.cache.misses;
  metrics.cache.hitRate = total > 0 ? (metrics.cache.hits / total) * 100 : 0;
}

/**
 * Collect system metrics
 */
function collectSystemMetrics() {
  const memoryUsage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();
  
  metrics.system.memoryUsage.push({
    rss: memoryUsage.rss,
    heapTotal: memoryUsage.heapTotal,
    heapUsed: memoryUsage.heapUsed,
    external: memoryUsage.external,
    timestamp: Date.now()
  });
  
  metrics.system.cpuUsage.push({
    user: cpuUsage.user,
    system: cpuUsage.system,
    timestamp: Date.now()
  });
  
  // Keep only recent samples
  if (metrics.system.memoryUsage.length > METRICS_CONFIG.MAX_MEMORY_SAMPLES) {
    metrics.system.memoryUsage = metrics.system.memoryUsage.slice(-METRICS_CONFIG.MAX_MEMORY_SAMPLES);
  }
  
  if (metrics.system.cpuUsage.length > METRICS_CONFIG.MAX_MEMORY_SAMPLES) {
    metrics.system.cpuUsage = metrics.system.cpuUsage.slice(-METRICS_CONFIG.MAX_MEMORY_SAMPLES);
  }
  
  metrics.system.uptime = process.uptime();
}

/**
 * Get metrics summary
 */
function getMetricsSummary() {
  return {
    requests: {
      total: metrics.requests.total,
      successful: metrics.requests.successful,
      failed: metrics.requests.failed,
      successRate: metrics.requests.total > 0 ? (metrics.requests.successful / metrics.requests.total) * 100 : 0,
      byEndpoint: Object.fromEntries(metrics.requests.byEndpoint),
      byMethod: Object.fromEntries(metrics.requests.byMethod),
      byStatus: Object.fromEntries(metrics.requests.byStatus)
    },
    performance: {
      averageResponseTime: metrics.performance.averageResponseTime,
      p95ResponseTime: metrics.performance.p95ResponseTime,
      p99ResponseTime: metrics.performance.p99ResponseTime,
      slowestEndpoints: metrics.performance.slowestEndpoints
    },
    errors: {
      total: metrics.errors.total,
      byType: Object.fromEntries(metrics.errors.byType),
      byEndpoint: Object.fromEntries(metrics.errors.byEndpoint),
      recent: metrics.errors.recent.slice(-10)
    },
    trading: {
      totalTrades: metrics.trading.totalTrades,
      successfulTrades: metrics.trading.successfulTrades,
      failedTrades: metrics.trading.failedTrades,
      successRate: metrics.trading.totalTrades > 0 ? (metrics.trading.successfulTrades / metrics.trading.totalTrades) * 100 : 0,
      totalVolume: metrics.trading.totalVolume,
      totalProfit: metrics.trading.totalProfit,
      byStrategy: Object.fromEntries(metrics.trading.byStrategy),
      byPair: Object.fromEntries(metrics.trading.byPair)
    },
    system: {
      uptime: metrics.system.uptime,
      memoryUsage: metrics.system.memoryUsage[metrics.system.memoryUsage.length - 1],
      cpuUsage: metrics.system.cpuUsage[metrics.system.cpuUsage.length - 1]
    },
    cache: {
      hits: metrics.cache.hits,
      misses: metrics.cache.misses,
      hitRate: metrics.cache.hitRate,
      byKey: Object.fromEntries(metrics.cache.byKey)
    },
    security: {
      failedLogins: metrics.security.failedLogins,
      blockedRequests: metrics.security.blockedRequests,
      suspiciousActivities: metrics.security.suspiciousActivities,
      rateLimitHits: metrics.security.rateLimitHits
    }
  };
}

/**
 * Get detailed metrics
 */
function getDetailedMetrics() {
  return {
    ...getMetricsSummary(),
    raw: {
      responseTimes: metrics.performance.responseTimes,
      memoryHistory: metrics.system.memoryUsage,
      cpuHistory: metrics.system.cpuUsage,
      errorHistory: metrics.errors.recent
    }
  };
}

/**
 * Reset metrics
 */
function resetMetrics() {
  metrics.requests = {
    total: 0,
    successful: 0,
    failed: 0,
    byEndpoint: new Map(),
    byMethod: new Map(),
    byStatus: new Map()
  };
  
  metrics.performance = {
    responseTimes: [],
    averageResponseTime: 0,
    p95ResponseTime: 0,
    p99ResponseTime: 0,
    slowestEndpoints: []
  };
  
  metrics.errors = {
    total: 0,
    byType: new Map(),
    byEndpoint: new Map(),
    recent: []
  };
  
  metrics.trading = {
    totalTrades: 0,
    successfulTrades: 0,
    failedTrades: 0,
    totalVolume: 0,
    totalProfit: 0,
    byStrategy: new Map(),
    byPair: new Map()
  };
  
  metrics.cache = {
    hits: 0,
    misses: 0,
    hitRate: 0,
    byKey: new Map()
  };
  
  metrics.security = {
    failedLogins: 0,
    blockedRequests: 0,
    suspiciousActivities: 0,
    rateLimitHits: 0
  };
  
  logger.info('Metrics reset');
}

/**
 * Start metrics collection
 */
function startMetricsCollection() {
  // Collect system metrics every minute
  setInterval(collectSystemMetrics, METRICS_CONFIG.COLLECTION_INTERVAL);
  
  // Clean up old data every hour
  setInterval(() => {
    const now = Date.now();
    const cutoff = now - METRICS_CONFIG.RETENTION_PERIOD;
    
    // Clean up old response times
    metrics.performance.responseTimes = metrics.performance.responseTimes.filter(req => req.timestamp > cutoff);
    
    // Clean up old memory samples
    metrics.system.memoryUsage = metrics.system.memoryUsage.filter(sample => sample.timestamp > cutoff);
    metrics.system.cpuUsage = metrics.system.cpuUsage.filter(sample => sample.timestamp > cutoff);
    
    // Clean up old errors
    metrics.errors.recent = metrics.errors.recent.filter(error => error.timestamp > cutoff);
    
  }, 60 * 60 * 1000); // Every hour
  
  logger.info('Metrics collection started');
}

module.exports = {
  recordRequest,
  recordError,
  recordTrading,
  recordCacheHit,
  recordCacheMiss,
  recordSecurityEvent,
  getMetricsSummary,
  getDetailedMetrics,
  resetMetrics,
  startMetricsCollection,
  collectSystemMetrics
};
