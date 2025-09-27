// Redis-backed Metrics Module for CryptoPulse Cloud Functions
const winston = require('winston');
const Redis = require('redis');

// Configure logger for metrics
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console()
  ]
});

// Redis client configuration
let redisClient = null;
const REDIS_CONFIG = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || null,
  db: process.env.REDIS_DB || 0,
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  lazyConnect: true
};

// Initialize Redis connection
async function initializeRedis() {
  try {
    if (!redisClient) {
      redisClient = Redis.createClient(REDIS_CONFIG);
      
      redisClient.on('error', (err) => {
        logger.error('Redis connection error:', err);
        // Fallback to in-memory storage if Redis fails
        redisClient = null;
      });
      
      redisClient.on('connect', () => {
        logger.info('Redis connected successfully');
      });
      
      redisClient.on('ready', () => {
        logger.info('Redis ready for operations');
      });
      
      await redisClient.connect();
    }
    return redisClient;
  } catch (error) {
    logger.error('Failed to initialize Redis:', error);
    redisClient = null;
    return null;
  }
}

// Fallback in-memory storage for when Redis is unavailable
let fallbackMetrics = {
  requests: [],
  errors: [],
  trading: [],
  security: []
};

// Key prefixes for Redis storage
const KEY_PREFIXES = {
  REQUESTS: 'metrics:requests',
  ERRORS: 'metrics:errors',
  TRADING: 'metrics:trading',
  SECURITY: 'metrics:security'
};

// TTL for different metric types (in seconds)
const METRIC_TTL = {
  REQUESTS: 7 * 24 * 60 * 60, // 7 days
  ERRORS: 30 * 24 * 60 * 60,  // 30 days
  TRADING: 90 * 24 * 60 * 60, // 90 days
  SECURITY: 365 * 24 * 60 * 60 // 1 year
};

/**
 * Store metric in Redis with TTL
 * @param {string} key - Redis key
 * @param {Object} metric - Metric data
 * @param {number} ttl - Time to live in seconds
 */
async function storeMetric(key, metric, ttl) {
  try {
    const client = await initializeRedis();
    if (client) {
      const metricJson = JSON.stringify(metric);
      await client.setEx(key, ttl, metricJson);
      return true;
    } else {
      // Fallback to in-memory storage
      return storeMetricFallback(key, metric);
    }
  } catch (error) {
    logger.error('Error storing metric in Redis:', error);
    return storeMetricFallback(key, metric);
  }
}

/**
 * Store metric in fallback in-memory storage
 * @param {string} key - Storage key
 * @param {Object} metric - Metric data
 */
function storeMetricFallback(key, metric) {
  try {
    const keyParts = key.split(':');
    const metricType = keyParts[1];
    const timestamp = keyParts[2];
    
    if (fallbackMetrics[metricType]) {
      fallbackMetrics[metricType].push({
        ...metric,
        timestamp: new Date(parseInt(timestamp))
      });
      
      // Keep only last 1000 records per type
      if (fallbackMetrics[metricType].length > 1000) {
        fallbackMetrics[metricType] = fallbackMetrics[metricType].slice(-1000);
      }
    }
    return true;
  } catch (error) {
    logger.error('Error storing metric in fallback storage:', error);
    return false;
  }
}

/**
 * Get metrics from Redis within time range
 * @param {string} prefix - Key prefix
 * @param {Date} startTime - Start time
 * @param {Date} endTime - End time
 */
async function getMetricsInRange(prefix, startTime, endTime) {
  try {
    const client = await initializeRedis();
    if (client) {
      const pattern = `${prefix}:*`;
      const keys = await client.keys(pattern);
      
      const metrics = [];
      for (const key of keys) {
        const metricJson = await client.get(key);
        if (metricJson) {
          const metric = JSON.parse(metricJson);
          const metricTime = new Date(metric.timestamp);
          
          if (metricTime >= startTime && metricTime <= endTime) {
            metrics.push(metric);
          }
        }
      }
      
      return metrics.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    } else {
      // Fallback to in-memory storage
      return getMetricsInRangeFallback(prefix, startTime, endTime);
    }
  } catch (error) {
    logger.error('Error getting metrics from Redis:', error);
    return getMetricsInRangeFallback(prefix, startTime, endTime);
  }
}

/**
 * Get metrics from fallback in-memory storage
 * @param {string} prefix - Key prefix
 * @param {Date} startTime - Start time
 * @param {Date} endTime - End time
 */
function getMetricsInRangeFallback(prefix, startTime, endTime) {
  try {
    const keyParts = prefix.split(':');
    const metricType = keyParts[1];
    
    if (fallbackMetrics[metricType]) {
      return fallbackMetrics[metricType].filter(metric => {
        const metricTime = new Date(metric.timestamp);
        return metricTime >= startTime && metricTime <= endTime;
      });
    }
    return [];
  } catch (error) {
    logger.error('Error getting metrics from fallback storage:', error);
    return [];
  }
}

// Record request metric
async function recordRequest(endpoint, method, statusCode, responseTime) {
  try {
    const metric = {
      endpoint,
      method,
      statusCode,
      responseTime,
      timestamp: new Date()
    };
    
    const timestamp = Date.now();
    const key = `${KEY_PREFIXES.REQUESTS}:${timestamp}:${Math.random().toString(36).substr(2, 9)}`;
    
    await storeMetric(key, metric, METRIC_TTL.REQUESTS);
    logger.debug('Request metric recorded', { metric });
  } catch (error) {
    logger.error('Error recording request metric:', error);
  }
}

// Record error metric
async function recordError(error, context) {
  try {
    const metric = {
      error: error.message,
      context,
      stack: error.stack,
      timestamp: new Date()
    };
    
    const timestamp = Date.now();
    const key = `${KEY_PREFIXES.ERRORS}:${timestamp}:${Math.random().toString(36).substr(2, 9)}`;
    
    await storeMetric(key, metric, METRIC_TTL.ERRORS);
    logger.debug('Error metric recorded', { metric });
  } catch (err) {
    logger.error('Error recording error metric:', err);
  }
}

// Record trading metric
async function recordTrading(pair, strategy, action, amount, success, profit) {
  try {
    const metric = {
      pair,
      strategy,
      action,
      amount,
      success,
      profit,
      timestamp: new Date()
    };
    
    const timestamp = Date.now();
    const key = `${KEY_PREFIXES.TRADING}:${timestamp}:${Math.random().toString(36).substr(2, 9)}`;
    
    await storeMetric(key, metric, METRIC_TTL.TRADING);
    logger.debug('Trading metric recorded', { metric });
  } catch (error) {
    logger.error('Error recording trading metric:', error);
  }
}

// Record security event metric
async function recordSecurityEvent(eventType, details) {
  try {
    const metric = {
      eventType,
      details,
      timestamp: new Date()
    };
    
    const timestamp = Date.now();
    const key = `${KEY_PREFIXES.SECURITY}:${timestamp}:${Math.random().toString(36).substr(2, 9)}`;
    
    await storeMetric(key, metric, METRIC_TTL.SECURITY);
    logger.debug('Security event metric recorded', { metric });
  } catch (error) {
    logger.error('Error recording security event metric:', error);
  }
}

// Get request metrics
async function getRequestMetrics(timeframe = '1h') {
  try {
    const now = new Date();
    const timeframeMs = getTimeframeMs(timeframe);
    const startTime = new Date(now.getTime() - timeframeMs);
    
    const recentRequests = await getMetricsInRange(KEY_PREFIXES.REQUESTS, startTime, now);
    
    const totalRequests = recentRequests.length;
    const successfulRequests = recentRequests.filter(r => r.statusCode < 400).length;
    const errorRate = totalRequests > 0 ? ((totalRequests - successfulRequests) / totalRequests) * 100 : 0;
    
    const avgResponseTime = totalRequests > 0 
      ? recentRequests.reduce((sum, r) => sum + r.responseTime, 0) / totalRequests 
      : 0;
    
    const requestsByEndpoint = recentRequests.reduce((acc, r) => {
      acc[r.endpoint] = (acc[r.endpoint] || 0) + 1;
      return acc;
    }, {});
    
    const requestsByMethod = recentRequests.reduce((acc, r) => {
      acc[r.method] = (acc[r.method] || 0) + 1;
      return acc;
    }, {});
    
    return {
      totalRequests,
      successfulRequests,
      errorRate,
      avgResponseTime,
      requestsByEndpoint,
      requestsByMethod,
      timeframe
    };
  } catch (error) {
    logger.error('Error getting request metrics:', error);
    return {
      totalRequests: 0,
      successfulRequests: 0,
      errorRate: 0,
      avgResponseTime: 0,
      requestsByEndpoint: {},
      requestsByMethod: {},
      timeframe
    };
  }
}

// Get trading metrics
async function getTradingMetrics(timeframe = '1h') {
  try {
    const now = new Date();
    const timeframeMs = getTimeframeMs(timeframe);
    const startTime = new Date(now.getTime() - timeframeMs);
    
    const recentTrades = await getMetricsInRange(KEY_PREFIXES.TRADING, startTime, now);
    
    const totalTrades = recentTrades.length;
    const successfulTrades = recentTrades.filter(t => t.success).length;
    const successRate = totalTrades > 0 ? (successfulTrades / totalTrades) * 100 : 0;
    
    const totalProfit = recentTrades.reduce((sum, t) => sum + (t.profit || 0), 0);
    const avgProfit = totalTrades > 0 ? totalProfit / totalTrades : 0;
    
    const tradesByPair = recentTrades.reduce((acc, t) => {
      acc[t.pair] = (acc[t.pair] || 0) + 1;
      return acc;
    }, {});
    
    const tradesByStrategy = recentTrades.reduce((acc, t) => {
      acc[t.strategy] = (acc[t.strategy] || 0) + 1;
      return acc;
    }, {});
    
    return {
      totalTrades,
      successfulTrades,
      successRate,
      totalProfit,
      avgProfit,
      tradesByPair,
      tradesByStrategy,
      timeframe
    };
  } catch (error) {
    logger.error('Error getting trading metrics:', error);
    return {
      totalTrades: 0,
      successfulTrades: 0,
      successRate: 0,
      totalProfit: 0,
      avgProfit: 0,
      tradesByPair: {},
      tradesByStrategy: {},
      timeframe
    };
  }
}

// Get error metrics
async function getErrorMetrics(timeframe = '1h') {
  try {
    const now = new Date();
    const timeframeMs = getTimeframeMs(timeframe);
    const startTime = new Date(now.getTime() - timeframeMs);
    
    const recentErrors = await getMetricsInRange(KEY_PREFIXES.ERRORS, startTime, now);
    
    const totalErrors = recentErrors.length;
    const errorsByContext = recentErrors.reduce((acc, e) => {
      acc[e.context] = (acc[e.context] || 0) + 1;
      return acc;
    }, {});
    
    const errorsByType = recentErrors.reduce((acc, e) => {
      const errorType = e.error.split(':')[0];
      acc[errorType] = (acc[errorType] || 0) + 1;
      return acc;
    }, {});
    
    return {
      totalErrors,
      errorsByContext,
      errorsByType,
      timeframe
    };
  } catch (error) {
    logger.error('Error getting error metrics:', error);
    return {
      totalErrors: 0,
      errorsByContext: {},
      errorsByType: {},
      timeframe
    };
  }
}

// Get security metrics
async function getSecurityMetrics(timeframe = '1h') {
  try {
    const now = new Date();
    const timeframeMs = getTimeframeMs(timeframe);
    const startTime = new Date(now.getTime() - timeframeMs);
    
    const recentSecurityEvents = await getMetricsInRange(KEY_PREFIXES.SECURITY, startTime, now);
    
    const totalEvents = recentSecurityEvents.length;
    const eventsByType = recentSecurityEvents.reduce((acc, e) => {
      acc[e.eventType] = (acc[e.eventType] || 0) + 1;
      return acc;
    }, {});
    
    return {
      totalEvents,
      eventsByType,
      timeframe
    };
  } catch (error) {
    logger.error('Error getting security metrics:', error);
    return {
      totalEvents: 0,
      eventsByType: {},
      timeframe
    };
  }
}

// Get comprehensive metrics
async function getAllMetrics(timeframe = '1h') {
  try {
    const [requests, trading, errors, security] = await Promise.all([
      getRequestMetrics(timeframe),
      getTradingMetrics(timeframe),
      getErrorMetrics(timeframe),
      getSecurityMetrics(timeframe)
    ]);
    
    return {
      requests,
      trading,
      errors,
      security,
      timestamp: new Date()
    };
  } catch (error) {
    logger.error('Error getting all metrics:', error);
    return {
      requests: { totalRequests: 0, successfulRequests: 0, errorRate: 0, avgResponseTime: 0, requestsByEndpoint: {}, requestsByMethod: {}, timeframe },
      trading: { totalTrades: 0, successfulTrades: 0, successRate: 0, totalProfit: 0, avgProfit: 0, tradesByPair: {}, tradesByStrategy: {}, timeframe },
      errors: { totalErrors: 0, errorsByContext: {}, errorsByType: {}, timeframe },
      security: { totalEvents: 0, eventsByType: {}, timeframe },
      timestamp: new Date()
    };
  }
}

// Helper function to convert timeframe to milliseconds
function getTimeframeMs(timeframe) {
  const timeframes = {
    '5m': 5 * 60 * 1000,
    '15m': 15 * 60 * 1000,
    '1h': 60 * 60 * 1000,
    '4h': 4 * 60 * 60 * 1000,
    '1d': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000
  };
  
  return timeframes[timeframe] || timeframes['1h'];
}

// Clear old metrics (Redis handles TTL automatically)
async function clearOldMetrics(olderThanDays = 7) {
  try {
    const client = await initializeRedis();
    if (client) {
      // Redis TTL handles this automatically, but we can manually clean up if needed
      const cutoff = new Date(Date.now() - (olderThanDays * 24 * 60 * 60 * 1000));
      
      // Clean up old keys manually if needed
      for (const prefix of Object.values(KEY_PREFIXES)) {
        const pattern = `${prefix}:*`;
        const keys = await client.keys(pattern);
        
        for (const key of keys) {
          const metricJson = await client.get(key);
          if (metricJson) {
            const metric = JSON.parse(metricJson);
            if (new Date(metric.timestamp) < cutoff) {
              await client.del(key);
            }
          }
        }
      }
      
      logger.info('Old metrics cleared from Redis', { cutoff, olderThanDays });
    } else {
      // Clear fallback storage
      const cutoff = new Date(Date.now() - (olderThanDays * 24 * 60 * 60 * 1000));
      
      Object.keys(fallbackMetrics).forEach(metricType => {
        fallbackMetrics[metricType] = fallbackMetrics[metricType].filter(metric => 
          new Date(metric.timestamp) >= cutoff
        );
      });
      
      logger.info('Old metrics cleared from fallback storage', { cutoff, olderThanDays });
    }
  } catch (error) {
    logger.error('Error clearing old metrics:', error);
  }
}

// Close Redis connection
async function closeRedis() {
  try {
    if (redisClient) {
      await redisClient.quit();
      redisClient = null;
      logger.info('Redis connection closed');
    }
  } catch (error) {
    logger.error('Error closing Redis connection:', error);
  }
}

module.exports = {
  recordRequest,
  recordError,
  recordTrading,
  recordSecurityEvent,
  getRequestMetrics,
  getTradingMetrics,
  getErrorMetrics,
  getSecurityMetrics,
  getAllMetrics,
  clearOldMetrics,
  closeRedis,
  initializeRedis
};
