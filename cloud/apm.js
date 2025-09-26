/**
 * Application Performance Monitoring (APM) Integration
 * Provides comprehensive monitoring and observability for CryptoPulse
 */

const winston = require('winston');
const os = require('os');
const process = require('process');

// Configure APM logger
const apmLogger = winston.createLogger({
  level: process.env.APM_LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/apm.log' })
  ]
});

class APMMonitor {
  constructor() {
    this.metrics = {
      requests: {
        total: 0,
        successful: 0,
        failed: 0,
        responseTimes: []
      },
      trading: {
        ordersExecuted: 0,
        ordersFailed: 0,
        totalVolume: 0,
        totalPnL: 0
      },
      system: {
        memoryUsage: 0,
        cpuUsage: 0,
        uptime: 0,
        activeConnections: 0
      },
      errors: {
        total: 0,
        byType: {},
        byEndpoint: {}
      }
    };
    
    this.startTime = Date.now();
    this.initializeMonitoring();
  }

  initializeMonitoring() {
    // Start system monitoring
    setInterval(() => {
      this.updateSystemMetrics();
    }, 5000); // Update every 5 seconds

    // Start performance monitoring
    setInterval(() => {
      this.logPerformanceMetrics();
    }, 60000); // Log every minute

    // Start health check monitoring
    setInterval(() => {
      this.performHealthCheck();
    }, 30000); // Check every 30 seconds
  }

  // Request monitoring
  recordRequest(endpoint, method, statusCode, responseTime, userId = null) {
    this.metrics.requests.total++;
    
    if (statusCode >= 200 && statusCode < 400) {
      this.metrics.requests.successful++;
    } else {
      this.metrics.requests.failed++;
      this.recordError('request_failed', { endpoint, method, statusCode });
    }

    this.metrics.requests.responseTimes.push(responseTime);
    
    // Keep only last 1000 response times for memory efficiency
    if (this.metrics.requests.responseTimes.length > 1000) {
      this.metrics.requests.responseTimes = this.metrics.requests.responseTimes.slice(-1000);
    }

    // Log high response times
    if (responseTime > 5000) {
      apmLogger.warn('Slow request detected', {
        endpoint,
        method,
        responseTime,
        userId,
        threshold: 5000
      });
    }

    // Log request details for debugging
    apmLogger.debug('Request recorded', {
      endpoint,
      method,
      statusCode,
      responseTime,
      userId,
      timestamp: new Date().toISOString()
    });
  }

  // Trading monitoring
  recordTradingActivity(activity) {
    const { type, pair, amount, price, success, pnl, userId } = activity;

    if (success) {
      this.metrics.trading.ordersExecuted++;
      this.metrics.trading.totalVolume += amount * price;
      this.metrics.trading.totalPnL += pnl || 0;
    } else {
      this.metrics.trading.ordersFailed++;
      this.recordError('trading_failed', { type, pair, amount, price, userId });
    }

    apmLogger.info('Trading activity recorded', {
      type,
      pair,
      amount,
      price,
      success,
      pnl,
      userId,
      timestamp: new Date().toISOString()
    });
  }

  // Error monitoring
  recordError(errorType, details = {}) {
    this.metrics.errors.total++;
    
    if (!this.metrics.errors.byType[errorType]) {
      this.metrics.errors.byType[errorType] = 0;
    }
    this.metrics.errors.byType[errorType]++;

    if (details.endpoint) {
      if (!this.metrics.errors.byEndpoint[details.endpoint]) {
        this.metrics.errors.byEndpoint[details.endpoint] = 0;
      }
      this.metrics.errors.byEndpoint[details.endpoint]++;
    }

    apmLogger.error('Error recorded', {
      errorType,
      details,
      timestamp: new Date().toISOString(),
      totalErrors: this.metrics.errors.total
    });

    // Alert on high error rates
    this.checkErrorRates();
  }

  // System metrics monitoring
  updateSystemMetrics() {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    this.metrics.system.memoryUsage = memUsage.heapUsed / 1024 / 1024; // MB
    this.metrics.system.cpuUsage = (cpuUsage.user + cpuUsage.system) / 1000000; // seconds
    this.metrics.system.uptime = process.uptime();

    // Log memory warnings
    if (this.metrics.system.memoryUsage > 500) { // 500MB
      apmLogger.warn('High memory usage detected', {
        memoryUsage: this.metrics.system.memoryUsage,
        threshold: 500
      });
    }
  }

  // Performance metrics logging
  logPerformanceMetrics() {
    const avgResponseTime = this.calculateAverageResponseTime();
    const errorRate = this.calculateErrorRate();
    const successRate = this.calculateSuccessRate();

    const performanceData = {
      timestamp: new Date().toISOString(),
      requests: {
        total: this.metrics.requests.total,
        successful: this.metrics.requests.successful,
        failed: this.metrics.requests.failed,
        successRate: successRate,
        errorRate: errorRate,
        averageResponseTime: avgResponseTime,
        maxResponseTime: Math.max(...this.metrics.requests.responseTimes),
        minResponseTime: Math.min(...this.metrics.requests.responseTimes)
      },
      trading: {
        ordersExecuted: this.metrics.trading.ordersExecuted,
        ordersFailed: this.metrics.trading.ordersFailed,
        totalVolume: this.metrics.trading.totalVolume,
        totalPnL: this.metrics.trading.totalPnL,
        successRate: this.metrics.trading.ordersExecuted / 
          (this.metrics.trading.ordersExecuted + this.metrics.trading.ordersFailed) || 0
      },
      system: {
        memoryUsage: this.metrics.system.memoryUsage,
        cpuUsage: this.metrics.system.cpuUsage,
        uptime: this.metrics.system.uptime,
        loadAverage: os.loadavg(),
        freeMemory: os.freemem() / 1024 / 1024 / 1024, // GB
        totalMemory: os.totalmem() / 1024 / 1024 / 1024 // GB
      },
      errors: {
        total: this.metrics.errors.total,
        byType: this.metrics.errors.byType,
        byEndpoint: this.metrics.errors.byEndpoint
      }
    };

    apmLogger.info('Performance metrics', performanceData);

    // Send to external APM service if configured
    this.sendToExternalAPM(performanceData);
  }

  // Health check monitoring
  performHealthCheck() {
    const healthStatus = {
      timestamp: new Date().toISOString(),
      status: 'healthy',
      checks: {
        memory: this.checkMemoryHealth(),
        cpu: this.checkCPUHealth(),
        errorRate: this.checkErrorRateHealth(),
        responseTime: this.checkResponseTimeHealth(),
        trading: this.checkTradingHealth()
      }
    };

    // Determine overall health
    const allChecks = Object.values(healthStatus.checks);
    if (allChecks.some(check => check.status === 'critical')) {
      healthStatus.status = 'critical';
    } else if (allChecks.some(check => check.status === 'warning')) {
      healthStatus.status = 'warning';
    }

    apmLogger.info('Health check performed', healthStatus);

    // Alert on health issues
    if (healthStatus.status !== 'healthy') {
      this.alertHealthIssue(healthStatus);
    }

    return healthStatus;
  }

  // Individual health checks
  checkMemoryHealth() {
    const memoryUsage = this.metrics.system.memoryUsage;
    if (memoryUsage > 1000) { // 1GB
      return { status: 'critical', value: memoryUsage, threshold: 1000 };
    } else if (memoryUsage > 500) { // 500MB
      return { status: 'warning', value: memoryUsage, threshold: 500 };
    }
    return { status: 'healthy', value: memoryUsage };
  }

  checkCPUHealth() {
    const cpuUsage = this.metrics.system.cpuUsage;
    if (cpuUsage > 10) { // 10 seconds
      return { status: 'critical', value: cpuUsage, threshold: 10 };
    } else if (cpuUsage > 5) { // 5 seconds
      return { status: 'warning', value: cpuUsage, threshold: 5 };
    }
    return { status: 'healthy', value: cpuUsage };
  }

  checkErrorRateHealth() {
    const errorRate = this.calculateErrorRate();
    if (errorRate > 0.1) { // 10%
      return { status: 'critical', value: errorRate, threshold: 0.1 };
    } else if (errorRate > 0.05) { // 5%
      return { status: 'warning', value: errorRate, threshold: 0.05 };
    }
    return { status: 'healthy', value: errorRate };
  }

  checkResponseTimeHealth() {
    const avgResponseTime = this.calculateAverageResponseTime();
    if (avgResponseTime > 5000) { // 5 seconds
      return { status: 'critical', value: avgResponseTime, threshold: 5000 };
    } else if (avgResponseTime > 2000) { // 2 seconds
      return { status: 'warning', value: avgResponseTime, threshold: 2000 };
    }
    return { status: 'healthy', value: avgResponseTime };
  }

  checkTradingHealth() {
    const totalTrades = this.metrics.trading.ordersExecuted + this.metrics.trading.ordersFailed;
    if (totalTrades === 0) {
      return { status: 'healthy', value: 0 };
    }

    const tradingSuccessRate = this.metrics.trading.ordersExecuted / totalTrades;
    if (tradingSuccessRate < 0.8) { // 80%
      return { status: 'critical', value: tradingSuccessRate, threshold: 0.8 };
    } else if (tradingSuccessRate < 0.9) { // 90%
      return { status: 'warning', value: tradingSuccessRate, threshold: 0.9 };
    }
    return { status: 'healthy', value: tradingSuccessRate };
  }

  // Utility methods
  calculateAverageResponseTime() {
    if (this.metrics.requests.responseTimes.length === 0) return 0;
    return this.metrics.requests.responseTimes.reduce((a, b) => a + b, 0) / this.metrics.requests.responseTimes.length;
  }

  calculateErrorRate() {
    if (this.metrics.requests.total === 0) return 0;
    return this.metrics.requests.failed / this.metrics.requests.total;
  }

  calculateSuccessRate() {
    if (this.metrics.requests.total === 0) return 0;
    return this.metrics.requests.successful / this.metrics.requests.total;
  }

  checkErrorRates() {
    const errorRate = this.calculateErrorRate();
    if (errorRate > 0.1) { // 10% error rate
      apmLogger.error('High error rate detected', {
        errorRate,
        threshold: 0.1,
        totalRequests: this.metrics.requests.total,
        failedRequests: this.metrics.requests.failed
      });
    }
  }

  // External APM integration
  sendToExternalAPM(data) {
    // Integration with external APM services like DataDog, New Relic, etc.
    if (process.env.DATADOG_API_KEY) {
      this.sendToDataDog(data);
    }
    
    if (process.env.NEW_RELIC_LICENSE_KEY) {
      this.sendToNewRelic(data);
    }
  }

  sendToDataDog(data) {
    // DataDog integration
    const datadogData = {
      series: [
        {
          metric: 'cryptopulse.requests.total',
          points: [[Math.floor(Date.now() / 1000), data.requests.total]],
          type: 'count'
        },
        {
          metric: 'cryptopulse.requests.success_rate',
          points: [[Math.floor(Date.now() / 1000), data.requests.successRate]],
          type: 'gauge'
        },
        {
          metric: 'cryptopulse.response_time.avg',
          points: [[Math.floor(Date.now() / 1000), data.requests.averageResponseTime]],
          type: 'gauge'
        },
        {
          metric: 'cryptopulse.memory.usage',
          points: [[Math.floor(Date.now() / 1000), data.system.memoryUsage]],
          type: 'gauge'
        }
      ]
    };

    // Send to DataDog (implementation would use DataDog API)
    apmLogger.debug('Sending data to DataDog', { dataPoints: datadogData.series.length });
  }

  sendToNewRelic(data) {
    // New Relic integration
    const newRelicData = {
      timestamp: Date.now(),
      metrics: {
        'Custom/Requests/Total': data.requests.total,
        'Custom/Requests/SuccessRate': data.requests.successRate,
        'Custom/ResponseTime/Average': data.requests.averageResponseTime,
        'Custom/Memory/Usage': data.system.memoryUsage,
        'Custom/Trading/OrdersExecuted': data.trading.ordersExecuted,
        'Custom/Trading/SuccessRate': data.trading.successRate
      }
    };

    // Send to New Relic (implementation would use New Relic API)
    apmLogger.debug('Sending data to New Relic', { metrics: Object.keys(newRelicData.metrics).length });
  }

  // Alerting
  alertHealthIssue(healthStatus) {
    const alertData = {
      level: healthStatus.status,
      message: `System health status: ${healthStatus.status}`,
      details: healthStatus,
      timestamp: new Date().toISOString()
    };

    apmLogger.error('Health alert triggered', alertData);

    // Send to alerting services
    if (process.env.SLACK_WEBHOOK) {
      this.sendSlackAlert(alertData);
    }

    if (process.env.PAGERDUTY_INTEGRATION_KEY) {
      this.sendPagerDutyAlert(alertData);
    }
  }

  sendSlackAlert(alertData) {
    const slackMessage = {
      text: `🚨 CryptoPulse Health Alert: ${alertData.level.toUpperCase()}`,
      attachments: [
        {
          color: alertData.level === 'critical' ? 'danger' : 'warning',
          fields: [
            {
              title: 'Status',
              value: alertData.level,
              short: true
            },
            {
              title: 'Timestamp',
              value: alertData.timestamp,
              short: true
            },
            {
              title: 'Details',
              value: JSON.stringify(alertData.details, null, 2),
              short: false
            }
          ]
        }
      ]
    };

    // Send to Slack (implementation would use Slack API)
    apmLogger.debug('Sending Slack alert', { level: alertData.level });
  }

  sendPagerDutyAlert(alertData) {
    const pagerDutyData = {
      routing_key: process.env.PAGERDUTY_INTEGRATION_KEY,
      event_action: 'trigger',
      dedup_key: 'cryptopulse-health',
      payload: {
        summary: `CryptoPulse Health Alert: ${alertData.level}`,
        source: 'cryptopulse-apm',
        severity: alertData.level === 'critical' ? 'critical' : 'warning',
        custom_details: alertData.details
      }
    };

    // Send to PagerDuty (implementation would use PagerDuty API)
    apmLogger.debug('Sending PagerDuty alert', { level: alertData.level });
  }

  // Get current metrics
  getMetrics() {
    return {
      ...this.metrics,
      uptime: Date.now() - this.startTime,
      timestamp: new Date().toISOString()
    };
  }

  // Reset metrics (useful for testing)
  resetMetrics() {
    this.metrics = {
      requests: { total: 0, successful: 0, failed: 0, responseTimes: [] },
      trading: { ordersExecuted: 0, ordersFailed: 0, totalVolume: 0, totalPnL: 0 },
      system: { memoryUsage: 0, cpuUsage: 0, uptime: 0, activeConnections: 0 },
      errors: { total: 0, byType: {}, byEndpoint: {} }
    };
    this.startTime = Date.now();
  }
}

// Create singleton instance
const apmMonitor = new APMMonitor();

// Export functions for use in cloud functions
module.exports = {
  recordRequest: (endpoint, method, statusCode, responseTime, userId) => {
    apmMonitor.recordRequest(endpoint, method, statusCode, responseTime, userId);
  },
  
  recordTradingActivity: (activity) => {
    apmMonitor.recordTradingActivity(activity);
  },
  
  recordError: (errorType, details) => {
    apmMonitor.recordError(errorType, details);
  },
  
  getMetrics: () => {
    return apmMonitor.getMetrics();
  },
  
  performHealthCheck: () => {
    return apmMonitor.performHealthCheck();
  },
  
  resetMetrics: () => {
    apmMonitor.resetMetrics();
  }
};
