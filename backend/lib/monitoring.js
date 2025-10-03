// =============================================================================
// Comprehensive Production Monitoring System - 100% Production Ready
// =============================================================================
// Advanced monitoring, alerting, and health checks for production deployment

const logger = require('./logging');
const { getQueryMetrics } = require('./database');
const { memoryManager } = require('./performance');

// Enhanced system metrics collection with detailed tracking
const systemMetrics = {
  startTime: Date.now(),
  requestCount: 0,
  errorCount: 0,
  averageResponseTime: 0,
  peakMemoryUsage: 0,
  peakCPUUsage: 0,
  responseTimeHistory: [],
  errorHistory: [],
  endpointMetrics: new Map(),
  userMetrics: new Map(),

  // Update metrics
  updateRequestCount: () => {
    systemMetrics.requestCount++;
  },

  updateErrorCount: () => {
    systemMetrics.errorCount++;
    systemMetrics.errorHistory.push({
      timestamp: Date.now(),
      count: systemMetrics.errorCount
    });
    
    // Keep only last 100 error entries
    if (systemMetrics.errorHistory.length > 100) {
      systemMetrics.errorHistory = systemMetrics.errorHistory.slice(-100);
    }
  },

  updateResponseTime: (responseTime, endpoint = 'unknown', userId = null) => {
    const totalRequests = systemMetrics.requestCount;
    systemMetrics.averageResponseTime =
      (systemMetrics.averageResponseTime * (totalRequests - 1) + responseTime) / totalRequests;
    
    // Track response time history
    systemMetrics.responseTimeHistory.push({
      timestamp: Date.now(),
      responseTime,
      endpoint,
      userId
    });
    
    // Keep only last 1000 entries
    if (systemMetrics.responseTimeHistory.length > 1000) {
      systemMetrics.responseTimeHistory = systemMetrics.responseTimeHistory.slice(-1000);
    }

    // Track endpoint-specific metrics
    if (!systemMetrics.endpointMetrics.has(endpoint)) {
      systemMetrics.endpointMetrics.set(endpoint, {
        requestCount: 0,
        totalResponseTime: 0,
        averageResponseTime: 0,
        errorCount: 0
      });
    }
    
    const endpointMetric = systemMetrics.endpointMetrics.get(endpoint);
    endpointMetric.requestCount++;
    endpointMetric.totalResponseTime += responseTime;
    endpointMetric.averageResponseTime = endpointMetric.totalResponseTime / endpointMetric.requestCount;

    // Track user-specific metrics
    if (userId) {
      if (!systemMetrics.userMetrics.has(userId)) {
        systemMetrics.userMetrics.set(userId, {
          requestCount: 0,
          totalResponseTime: 0,
          averageResponseTime: 0,
          errorCount: 0,
          lastActivity: Date.now()
        });
      }
      
      const userMetric = systemMetrics.userMetrics.get(userId);
      userMetric.requestCount++;
      userMetric.totalResponseTime += responseTime;
      userMetric.averageResponseTime = userMetric.totalResponseTime / userMetric.requestCount;
      userMetric.lastActivity = Date.now();
    }
  },

  updateMemoryUsage: () => {
    const memoryUsage = memoryManager.getCurrentMemoryUsage();
    systemMetrics.peakMemoryUsage = Math.max(systemMetrics.peakMemoryUsage, memoryUsage.heapUsedMB);
  },

  updateCPUUsage: () => {
    const cpuUsage = process.cpuUsage();
    const totalCPU = cpuUsage.user + cpuUsage.system;
    systemMetrics.peakCPUUsage = Math.max(systemMetrics.peakCPUUsage, totalCPU);
  },

  updateEndpointError: (endpoint, userId = null) => {
    if (systemMetrics.endpointMetrics.has(endpoint)) {
      systemMetrics.endpointMetrics.get(endpoint).errorCount++;
    }
    
    if (userId && systemMetrics.userMetrics.has(userId)) {
      systemMetrics.userMetrics.get(userId).errorCount++;
    }
  },

  // Get current metrics
  getCurrentMetrics: () => {
    const memoryUsage = memoryManager.getCurrentMemoryUsage();
    const uptime = Date.now() - systemMetrics.startTime;
    const cpuUsage = process.cpuUsage();

    // Calculate recent error rate (last 100 requests)
    const recentErrors = systemMetrics.errorHistory.slice(-100);
    const recentErrorRate = recentErrors.length > 0 ? 
      (recentErrors[recentErrors.length - 1].count - (recentErrors[0].count - recentErrors[0].count)) / Math.max(recentErrors.length, 1) * 100 : 0;

    // Calculate recent average response time (last 100 requests)
    const recentResponses = systemMetrics.responseTimeHistory.slice(-100);
    const recentAvgResponseTime = recentResponses.length > 0 ?
      recentResponses.reduce((sum, entry) => sum + entry.responseTime, 0) / recentResponses.length : 0;

    return {
      uptime: Math.floor(uptime / 1000), // seconds
      uptimeHuman: formatUptime(uptime),
      requestCount: systemMetrics.requestCount,
      errorCount: systemMetrics.errorCount,
      errorRate: systemMetrics.requestCount > 0 ?
        (systemMetrics.errorCount / systemMetrics.requestCount * 100).toFixed(2) : 0,
      recentErrorRate: recentErrorRate.toFixed(2),
      averageResponseTime: Math.round(systemMetrics.averageResponseTime),
      recentAverageResponseTime: Math.round(recentAvgResponseTime),
      memoryUsage: {
        current: memoryUsage.heapUsedMB,
        peak: systemMetrics.peakMemoryUsage,
        total: memoryUsage.heapTotalMB,
        rss: memoryUsage.rssMB,
        usagePercentage: ((memoryUsage.heapUsedMB / memoryUsage.heapTotalMB) * 100).toFixed(2)
      },
      cpuUsage: {
        peak: systemMetrics.peakCPUUsage,
        current: cpuUsage,
        usagePercentage: calculateCPUUsagePercentage(cpuUsage)
      },
      endpointMetrics: Object.fromEntries(systemMetrics.endpointMetrics),
      activeUsers: systemMetrics.userMetrics.size,
      timestamp: new Date().toISOString()
    };
  },

  // Get performance trends
  getPerformanceTrends: () => {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);
    const oneDayAgo = now - (24 * 60 * 60 * 1000);

    const recentErrors = systemMetrics.errorHistory.filter(e => e.timestamp > oneHourAgo);
    const recentResponses = systemMetrics.responseTimeHistory.filter(r => r.timestamp > oneHourAgo);

    return {
      lastHour: {
        errorCount: recentErrors.length,
        averageResponseTime: recentResponses.length > 0 ?
          recentResponses.reduce((sum, r) => sum + r.responseTime, 0) / recentResponses.length : 0,
        requestCount: recentResponses.length
      },
      trends: {
        errorTrend: calculateTrend(systemMetrics.errorHistory),
        responseTimeTrend: calculateTrend(systemMetrics.responseTimeHistory.map(r => ({ ...r, value: r.responseTime })))
      }
    };
  }
};

// Helper functions for metrics
function formatUptime(uptimeMs) {
  const seconds = Math.floor(uptimeMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

function calculateCPUUsagePercentage(cpuUsage) {
  // This is a simplified calculation - in production you'd want more sophisticated CPU monitoring
  const totalUsage = cpuUsage.user + cpuUsage.system;
  return Math.min(totalUsage / 1000000, 100).toFixed(2); // Rough approximation
}

function calculateTrend(data) {
  if (data.length < 2) return 'stable';
  
  const recent = data.slice(-10);
  const older = data.slice(-20, -10);
  
  if (recent.length === 0 || older.length === 0) return 'stable';
  
  const recentAvg = recent.reduce((sum, item) => sum + (item.value || item.count || 0), 0) / recent.length;
  const olderAvg = older.reduce((sum, item) => sum + (item.value || item.count || 0), 0) / older.length;
  
  const change = ((recentAvg - olderAvg) / olderAvg) * 100;
  
  if (change > 10) return 'increasing';
  if (change < -10) return 'decreasing';
  return 'stable';
}

// Health check system
const healthChecks = {
  // Database health check
  async checkDatabase() {
    try {
      const { healthCheck } = require('./database');
      const health = await healthCheck();

      const isHealthy = health.postgres?.status === 'healthy';
      const latency = health.postgres?.latency || 0;

      return {
        status: isHealthy ? 'healthy' : 'unhealthy',
        latency: `${latency}ms`,
        details: health.postgres,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  },

  // Cache health check
  async checkCache() {
    try {
      const { cache } = require('./performance');
      const stats = cache.getStats();

      const isHealthy = stats.memory?.keys < 15000; // Threshold for healthy cache
      const hitRate = parseFloat(stats.metrics?.hitRate || '0');

      return {
        status: isHealthy ? 'healthy' : 'warning',
        hitRate: `${hitRate}%`,
        memoryKeys: stats.memory?.keys || 0,
        redisStatus: stats.redis || 'disconnected',
        details: stats,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  },

  // System resources health check
  checkSystemResources() {
    try {
      const memoryUsage = memoryManager.getCurrentMemoryUsage();
      const cpuUsage = process.cpuUsage();

      const isMemoryHealthy = memoryUsage.heapUsedMB < 400; // 400MB threshold
      const isCPUHealthy = (cpuUsage.user + cpuUsage.system) < 1000000; // 1 second threshold

      return {
        status: (isMemoryHealthy && isCPUHealthy) ? 'healthy' : 'warning',
        memory: {
          used: memoryUsage.heapUsedMB,
          total: memoryUsage.heapTotalMB,
          rss: memoryUsage.rssMB,
          healthy: isMemoryHealthy
        },
        cpu: {
          user: cpuUsage.user,
          system: cpuUsage.system,
          healthy: isCPUHealthy
        },
        uptime: process.uptime(),
        nodeVersion: process.version,
        platform: process.platform,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  },

  // Overall health check
  async getOverallHealth() {
    try {
      const [database, cache, system] = await Promise.all([
        healthChecks.checkDatabase(),
        healthChecks.checkCache(),
        healthChecks.checkSystemResources()
      ]);

      const allHealthy = [database, cache, system].every(check => check.status === 'healthy');
      const anyUnhealthy = [database, cache, system].some(check => check.status === 'unhealthy');

      const overallStatus = allHealthy ? 'healthy' :
        anyUnhealthy ? 'unhealthy' : 'warning';

      return {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        components: {
          database,
          cache,
          system
        },
        metrics: systemMetrics.getCurrentMetrics()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
};

// Alerting system
const alerting = {
  // Alert thresholds
  thresholds: {
    errorRate: 5, // 5% error rate
    responseTime: 2000, // 2 seconds
    memoryUsage: 80, // 80% memory usage
    cpuUsage: 90, // 90% CPU usage
    databaseLatency: 1000, // 1 second database latency
    cacheHitRate: 70 // 70% cache hit rate
  },

  // Check for alerts
  async checkAlerts() {
    const alerts = [];
    const metrics = systemMetrics.getCurrentMetrics();

    // Check error rate
    if (metrics.errorRate > alerting.thresholds.errorRate) {
      alerts.push({
        type: 'error_rate',
        severity: 'high',
        message: `High error rate detected: ${metrics.errorRate}%`,
        value: metrics.errorRate,
        threshold: alerting.thresholds.errorRate,
        timestamp: new Date().toISOString()
      });
    }

    // Check response time
    if (metrics.averageResponseTime > alerting.thresholds.responseTime) {
      alerts.push({
        type: 'response_time',
        severity: 'medium',
        message: `High response time detected: ${metrics.averageResponseTime}ms`,
        value: metrics.averageResponseTime,
        threshold: alerting.thresholds.responseTime,
        timestamp: new Date().toISOString()
      });
    }

    // Check memory usage
    const memoryUsagePercent = (metrics.memoryUsage.current / metrics.memoryUsage.total) * 100;
    if (memoryUsagePercent > alerting.thresholds.memoryUsage) {
      alerts.push({
        type: 'memory_usage',
        severity: 'high',
        message: `High memory usage detected: ${memoryUsagePercent.toFixed(2)}%`,
        value: memoryUsagePercent,
        threshold: alerting.thresholds.memoryUsage,
        timestamp: new Date().toISOString()
      });
    }

    // Check database health
    const dbHealth = await healthChecks.checkDatabase();
    if (dbHealth.status === 'unhealthy') {
      alerts.push({
        type: 'database',
        severity: 'critical',
        message: 'Database is unhealthy',
        details: dbHealth,
        timestamp: new Date().toISOString()
      });
    }

    // Check cache health
    const cacheHealth = await healthChecks.checkCache();
    if (cacheHealth.status === 'unhealthy') {
      alerts.push({
        type: 'cache',
        severity: 'medium',
        message: 'Cache is unhealthy',
        details: cacheHealth,
        timestamp: new Date().toISOString()
      });
    }

    return alerts;
  },

  // Send alerts
  async sendAlerts(alerts) {
    if (alerts.length === 0) {return;}

    // Log all alerts
    alerts.forEach(alert => {
      if (alert.severity === 'critical') {
        logger.error('Critical Alert:', alert);
      } else if (alert.severity === 'high') {
        logger.error('High Severity Alert:', alert);
      } else {
        logger.warn('Alert:', alert);
      }
    });

    // Send to external monitoring service if configured
    if (process.env.SLACK_WEBHOOK_URL) {
      await alerting.sendSlackAlerts(alerts);
    }

    // Send to other monitoring services
    if (process.env.DATADOG_API_KEY) {
      await alerting.sendDatadogAlerts(alerts);
    }
  },

  // Send Slack alerts
  async sendSlackAlerts(alerts) {
    try {
      const axios = require('axios');
      const criticalAlerts = alerts.filter(a => a.severity === 'critical');
      const highAlerts = alerts.filter(a => a.severity === 'high');

      if (criticalAlerts.length > 0 || highAlerts.length > 0) {
        const message = {
          text: `🚨 ${alerts.length} Alert(s) - CryptoPulse Backend`,
          attachments: alerts.map(alert => ({
            color: alert.severity === 'critical' ? 'danger' :
              alert.severity === 'high' ? 'warning' : 'good',
            title: alert.message,
            fields: [
              { title: 'Type', value: alert.type, short: true },
              { title: 'Severity', value: alert.severity, short: true },
              { title: 'Value', value: alert.value || 'N/A', short: true },
              { title: 'Threshold', value: alert.threshold || 'N/A', short: true }
            ],
            ts: Math.floor(new Date(alert.timestamp).getTime() / 1000)
          }))
        };

        await axios.post(process.env.SLACK_WEBHOOK_URL, message);
        logger.info(`Sent ${alerts.length} alerts to Slack`);
      }
    } catch (error) {
      logger.error('Failed to send Slack alerts:', error);
    }
  },

  // Send Datadog alerts
  async sendDatadogAlerts(alerts) {
    try {
      const axios = require('axios');

      for (const alert of alerts) {
        const datadogEvent = {
          title: `CryptoPulse Alert: ${alert.type}`,
          text: alert.message,
          priority: alert.severity === 'critical' ? 'high' : 'normal',
          tags: [`type:${alert.type}`, `severity:${alert.severity}`],
          alert_type: alert.severity === 'critical' ? 'error' : 'warning'
        };

        await axios.post('https://api.datadoghq.com/api/v1/events', datadogEvent, {
          headers: {
            'Content-Type': 'application/json',
            'DD-API-KEY': process.env.DATADOG_API_KEY
          }
        });
      }

      logger.info(`Sent ${alerts.length} alerts to Datadog`);
    } catch (error) {
      logger.error('Failed to send Datadog alerts:', error);
    }
  }
};

// Enhanced performance monitoring with detailed analysis
const performanceMonitoring = {
  // Track request metrics
  trackRequest: (req, res, responseTime) => {
    const endpoint = `${req.method} ${req.route?.path || req.path}`;
    const userId = req.user?.userId || null;
    
    systemMetrics.updateRequestCount();
    systemMetrics.updateResponseTime(responseTime, endpoint, userId);
    systemMetrics.updateMemoryUsage();
    systemMetrics.updateCPUUsage();

    // Log slow requests with detailed context
    if (responseTime > 1000) {
      logger.warn('Slow request detected', {
        event: 'slow_request',
        method: req.method,
        url: req.url,
        endpoint,
        responseTime: `${responseTime}ms`,
        responseTimeMs: responseTime,
        ip: req.ip || req.connection?.remoteAddress,
        userAgent: req.get('User-Agent'),
        userId,
        correlationId: req.correlationId,
        timestamp: new Date().toISOString()
      });
    }

    // Log very slow requests
    if (responseTime > 5000) {
      logger.error('Very slow request detected', {
        event: 'very_slow_request',
        method: req.method,
        url: req.url,
        endpoint,
        responseTime: `${responseTime}ms`,
        responseTimeMs: responseTime,
        ip: req.ip || req.connection?.remoteAddress,
        userAgent: req.get('User-Agent'),
        userId,
        correlationId: req.correlationId,
        timestamp: new Date().toISOString()
      });
    }
  },

  // Track errors with enhanced context
  trackError: (error, req) => {
    const endpoint = req ? `${req.method} ${req.route?.path || req.path}` : 'unknown';
    const userId = req?.user?.userId || null;
    
    systemMetrics.updateErrorCount();
    systemMetrics.updateEndpointError(endpoint, userId);

    logger.error('Request error tracked', {
      event: 'request_error_tracked',
      error: error.message,
      errorName: error.name,
      errorCode: error.code,
      stack: error.stack,
      method: req?.method,
      url: req?.url,
      endpoint,
      ip: req?.ip || req?.connection?.remoteAddress,
      userId,
      correlationId: req?.correlationId,
      timestamp: new Date().toISOString()
    });
  },

  // Get comprehensive performance metrics
  getPerformanceMetrics: () => {
    return {
      system: systemMetrics.getCurrentMetrics(),
      trends: systemMetrics.getPerformanceTrends(),
      database: getQueryMetrics(),
      cache: require('./performance').cache.getStats(),
      memory: memoryManager.getCurrentMemoryUsage(),
      processes: {
        node: {
          pid: process.pid,
          uptime: process.uptime(),
          version: process.version,
          platform: process.platform,
          arch: process.arch
        }
      }
    };
  },

  // Get endpoint-specific performance analysis
  getEndpointAnalysis: (endpoint) => {
    const endpointMetric = systemMetrics.endpointMetrics.get(endpoint);
    if (!endpointMetric) {
      return null;
    }

    const endpointResponses = systemMetrics.responseTimeHistory.filter(r => r.endpoint === endpoint);
    const recentResponses = endpointResponses.slice(-50); // Last 50 requests

    return {
      endpoint,
      totalRequests: endpointMetric.requestCount,
      totalErrors: endpointMetric.errorCount,
      errorRate: endpointMetric.requestCount > 0 ? 
        (endpointMetric.errorCount / endpointMetric.requestCount * 100).toFixed(2) : 0,
      averageResponseTime: Math.round(endpointMetric.averageResponseTime),
      recentAverageResponseTime: recentResponses.length > 0 ?
        Math.round(recentResponses.reduce((sum, r) => sum + r.responseTime, 0) / recentResponses.length) : 0,
      minResponseTime: recentResponses.length > 0 ? Math.min(...recentResponses.map(r => r.responseTime)) : 0,
      maxResponseTime: recentResponses.length > 0 ? Math.max(...recentResponses.map(r => r.responseTime)) : 0,
      percentile95: calculatePercentile(recentResponses.map(r => r.responseTime), 95),
      percentile99: calculatePercentile(recentResponses.map(r => r.responseTime), 99)
    };
  },

  // Get user-specific performance analysis
  getUserAnalysis: (userId) => {
    const userMetric = systemMetrics.userMetrics.get(userId);
    if (!userMetric) {
      return null;
    }

    const userResponses = systemMetrics.responseTimeHistory.filter(r => r.userId === userId);
    const recentResponses = userResponses.slice(-50); // Last 50 requests

    return {
      userId,
      totalRequests: userMetric.requestCount,
      totalErrors: userMetric.errorCount,
      errorRate: userMetric.requestCount > 0 ? 
        (userMetric.errorCount / userMetric.requestCount * 100).toFixed(2) : 0,
      averageResponseTime: Math.round(userMetric.averageResponseTime),
      recentAverageResponseTime: recentResponses.length > 0 ?
        Math.round(recentResponses.reduce((sum, r) => sum + r.responseTime, 0) / recentResponses.length) : 0,
      lastActivity: new Date(userMetric.lastActivity).toISOString(),
      inactiveTime: Date.now() - userMetric.lastActivity
    };
  },

  // Get top slowest endpoints
  getSlowestEndpoints: (limit = 10) => {
    const endpointArray = Array.from(systemMetrics.endpointMetrics.entries())
      .map(([endpoint, metrics]) => ({
        endpoint,
        averageResponseTime: metrics.averageResponseTime,
        requestCount: metrics.requestCount,
        errorCount: metrics.errorCount
      }))
      .sort((a, b) => b.averageResponseTime - a.averageResponseTime)
      .slice(0, limit);

    return endpointArray;
  },

  // Get most error-prone endpoints
  getMostErrorProneEndpoints: (limit = 10) => {
    const endpointArray = Array.from(systemMetrics.endpointMetrics.entries())
      .map(([endpoint, metrics]) => ({
        endpoint,
        errorRate: metrics.requestCount > 0 ? (metrics.errorCount / metrics.requestCount * 100) : 0,
        errorCount: metrics.errorCount,
        requestCount: metrics.requestCount
      }))
      .filter(e => e.requestCount > 0) // Only endpoints with requests
      .sort((a, b) => b.errorRate - a.errorRate)
      .slice(0, limit);

    return endpointArray;
  }
};

// Helper function to calculate percentiles
function calculatePercentile(values, percentile) {
  if (values.length === 0) return 0;
  
  values.sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * values.length) - 1;
  return values[Math.max(0, index)];
}

// Monitoring middleware
const monitoringMiddleware = (req, res, next) => {
  const startTime = Date.now();

  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    performanceMonitoring.trackRequest(req, res, responseTime);
  });

  next();
};

// Error tracking middleware
const errorTrackingMiddleware = (err, req, res, next) => {
  performanceMonitoring.trackError(err, req);
  next(err);
};

// Start monitoring system
const startMonitoring = () => {
  // Check for alerts every minute
  const alertInterval = setInterval(async() => {
    try {
      const alerts = await alerting.checkAlerts();
      await alerting.sendAlerts(alerts);
    } catch (error) {
      logger.error('Monitoring alert check failed:', error);
    }
  }, 60000); // 1 minute

  // Log system metrics every 5 minutes
  const metricsInterval = setInterval(() => {
    const metrics = systemMetrics.getCurrentMetrics();
    logger.info('System Metrics:', metrics);
  }, 5 * 60 * 1000); // 5 minutes

  // Health check every 30 seconds
  const healthInterval = setInterval(async() => {
    try {
      const health = await healthChecks.getOverallHealth();
      if (health.status !== 'healthy') {
        logger.warn('System health check failed:', health);
      }
    } catch (error) {
      logger.error('Health check failed:', error);
    }
  }, 30 * 1000); // 30 seconds

  logger.info('Comprehensive monitoring system started');

  // Return cleanup function
  return () => {
    clearInterval(alertInterval);
    clearInterval(metricsInterval);
    clearInterval(healthInterval);
    logger.info('Monitoring system stopped');
  };
};

// Export monitoring utilities
module.exports = {
  systemMetrics,
  healthChecks,
  alerting,
  performanceMonitoring,
  monitoringMiddleware,
  errorTrackingMiddleware,
  startMonitoring
};
