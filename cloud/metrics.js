// Metrics Module for CryptoPulse Cloud Functions
const winston = require('winston');

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

// Metrics storage (in production, this would be stored in a time-series database)
let metrics = {
  requests: [],
  errors: [],
  trading: [],
  security: []
};

// Record request metric
function recordRequest(endpoint, method, statusCode, responseTime) {
  try {
    const metric = {
      endpoint,
      method,
      statusCode,
      responseTime,
      timestamp: new Date()
    };
    
    metrics.requests.push(metric);
    
    // Keep only last 1000 requests to prevent memory issues
    if (metrics.requests.length > 1000) {
      metrics.requests = metrics.requests.slice(-1000);
    }
    
    logger.debug('Request metric recorded', { metric });
  } catch (error) {
    logger.error('Error recording request metric:', error);
  }
}

// Record error metric
function recordError(error, context) {
  try {
    const metric = {
      error: error.message,
      context,
      stack: error.stack,
      timestamp: new Date()
    };
    
    metrics.errors.push(metric);
    
    // Keep only last 500 errors
    if (metrics.errors.length > 500) {
      metrics.errors = metrics.errors.slice(-500);
    }
    
    logger.debug('Error metric recorded', { metric });
  } catch (err) {
    logger.error('Error recording error metric:', err);
  }
}

// Record trading metric
function recordTrading(pair, strategy, action, amount, success, profit) {
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
    
    metrics.trading.push(metric);
    
    // Keep only last 1000 trading records
    if (metrics.trading.length > 1000) {
      metrics.trading = metrics.trading.slice(-1000);
    }
    
    logger.debug('Trading metric recorded', { metric });
  } catch (error) {
    logger.error('Error recording trading metric:', error);
  }
}

// Record security event metric
function recordSecurityEvent(eventType, details) {
  try {
    const metric = {
      eventType,
      details,
      timestamp: new Date()
    };
    
    metrics.security.push(metric);
    
    // Keep only last 500 security events
    if (metrics.security.length > 500) {
      metrics.security = metrics.security.slice(-500);
    }
    
    logger.debug('Security event metric recorded', { metric });
  } catch (error) {
    logger.error('Error recording security event metric:', error);
  }
}

// Get request metrics
function getRequestMetrics(timeframe = '1h') {
  const now = new Date();
  const timeframeMs = getTimeframeMs(timeframe);
  const cutoff = new Date(now.getTime() - timeframeMs);
  
  const recentRequests = metrics.requests.filter(r => r.timestamp >= cutoff);
  
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
}

// Get trading metrics
function getTradingMetrics(timeframe = '1h') {
  const now = new Date();
  const timeframeMs = getTimeframeMs(timeframe);
  const cutoff = new Date(now.getTime() - timeframeMs);
  
  const recentTrades = metrics.trading.filter(t => t.timestamp >= cutoff);
  
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
}

// Get error metrics
function getErrorMetrics(timeframe = '1h') {
  const now = new Date();
  const timeframeMs = getTimeframeMs(timeframe);
  const cutoff = new Date(now.getTime() - timeframeMs);
  
  const recentErrors = metrics.errors.filter(e => e.timestamp >= cutoff);
  
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
}

// Get security metrics
function getSecurityMetrics(timeframe = '1h') {
  const now = new Date();
  const timeframeMs = getTimeframeMs(timeframe);
  const cutoff = new Date(now.getTime() - timeframeMs);
  
  const recentSecurityEvents = metrics.security.filter(s => s.timestamp >= cutoff);
  
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
}

// Get comprehensive metrics
function getAllMetrics(timeframe = '1h') {
  return {
    requests: getRequestMetrics(timeframe),
    trading: getTradingMetrics(timeframe),
    errors: getErrorMetrics(timeframe),
    security: getSecurityMetrics(timeframe),
    timestamp: new Date()
  };
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

// Clear old metrics
function clearOldMetrics(olderThanDays = 7) {
  const cutoff = new Date(Date.now() - (olderThanDays * 24 * 60 * 60 * 1000));
  
  metrics.requests = metrics.requests.filter(r => r.timestamp >= cutoff);
  metrics.errors = metrics.errors.filter(e => e.timestamp >= cutoff);
  metrics.trading = metrics.trading.filter(t => t.timestamp >= cutoff);
  metrics.security = metrics.security.filter(s => s.timestamp >= cutoff);
  
  logger.info('Old metrics cleared', { cutoff, olderThanDays });
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
  clearOldMetrics
};
