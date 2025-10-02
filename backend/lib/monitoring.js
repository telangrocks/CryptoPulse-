// =============================================================================
// Comprehensive Production Monitoring System - 100% Production Ready
// =============================================================================
// Advanced monitoring, alerting, and health checks for production deployment

const logger = require('./logging');
const { getQueryMetrics } = require('./database');
const { memoryManager } = require('./performance');

// System metrics collection
const systemMetrics = {
  startTime: Date.now(),
  requestCount: 0,
  errorCount: 0,
  averageResponseTime: 0,
  peakMemoryUsage: 0,
  peakCPUUsage: 0,

  // Update metrics
  updateRequestCount: () => {
    systemMetrics.requestCount++;
  },

  updateErrorCount: () => {
    systemMetrics.errorCount++;
  },

  updateResponseTime: (responseTime) => {
    const totalRequests = systemMetrics.requestCount;
    systemMetrics.averageResponseTime =
      (systemMetrics.averageResponseTime * (totalRequests - 1) + responseTime) / totalRequests;
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

  // Get current metrics
  getCurrentMetrics: () => {
    const memoryUsage = memoryManager.getCurrentMemoryUsage();
    const uptime = Date.now() - systemMetrics.startTime;

    return {
      uptime: Math.floor(uptime / 1000), // seconds
      requestCount: systemMetrics.requestCount,
      errorCount: systemMetrics.errorCount,
      errorRate: systemMetrics.requestCount > 0 ?
        (systemMetrics.errorCount / systemMetrics.requestCount * 100).toFixed(2) : 0,
      averageResponseTime: Math.round(systemMetrics.averageResponseTime),
      memoryUsage: {
        current: memoryUsage.heapUsedMB,
        peak: systemMetrics.peakMemoryUsage,
        total: memoryUsage.heapTotalMB,
        rss: memoryUsage.rssMB
      },
      cpuUsage: {
        peak: systemMetrics.peakCPUUsage,
        current: process.cpuUsage()
      },
      timestamp: new Date().toISOString()
    };
  }
};

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

// Performance monitoring
const performanceMonitoring = {
  // Track request metrics
  trackRequest: (req, res, responseTime) => {
    systemMetrics.updateRequestCount();
    systemMetrics.updateResponseTime(responseTime);
    systemMetrics.updateMemoryUsage();
    systemMetrics.updateCPUUsage();

    // Log slow requests
    if (responseTime > 1000) {
      logger.warn('Slow request detected', {
        method: req.method,
        url: req.url,
        responseTime: `${responseTime}ms`,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString()
      });
    }
  },

  // Track errors
  trackError: (error, req) => {
    systemMetrics.updateErrorCount();

    logger.error('Request error tracked', {
      error: error.message,
      stack: error.stack,
      method: req?.method,
      url: req?.url,
      ip: req?.ip,
      timestamp: new Date().toISOString()
    });
  },

  // Get performance metrics
  getPerformanceMetrics: () => {
    return {
      system: systemMetrics.getCurrentMetrics(),
      database: getQueryMetrics(),
      cache: require('./performance').cache.getStats(),
      memory: memoryManager.getCurrentMemoryUsage()
    };
  }
};

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
