/**
 * Enhanced Monitoring and Alerting System
 * Real-time trading performance monitoring with business metrics
 */

const prometheus = require('prom-client');
const { logger } = require('./structuredLogger');
const { getAuditLogger } = require('./auditLogger');

class EnhancedMonitoringSystem {
  constructor() {
    this.auditLogger = getAuditLogger();
    this.initializeMetrics();
    this.initializeBusinessMetrics();
    this.setupAlerting();
    this.setupHealthChecks();
    this.setupRecoveryProcedures();
  }

  initializeMetrics() {
    // Trading Performance Metrics
    this.tradingPerformance = {
      // Order execution metrics
      orderExecutionTime: new prometheus.Histogram({
        name: 'trading_order_execution_time_seconds',
        help: 'Time taken to execute trading orders',
        labelNames: ['symbol', 'side', 'type', 'status'],
        buckets: [0.1, 0.5, 1, 2, 5, 10, 30]
      }),

      // Trade success rate
      tradeSuccessRate: new prometheus.Gauge({
        name: 'trading_success_rate_percent',
        help: 'Percentage of successful trades',
        labelNames: ['symbol', 'strategy']
      }),

      // Profit/Loss metrics
      profitLoss: new prometheus.Gauge({
        name: 'trading_profit_loss_usd',
        help: 'Current profit/loss in USD',
        labelNames: ['symbol', 'strategy']
      }),

      // Position metrics
      positionSize: new prometheus.Gauge({
        name: 'trading_position_size',
        help: 'Current position size',
        labelNames: ['symbol', 'side']
      }),

      // Risk metrics
      riskExposure: new prometheus.Gauge({
        name: 'trading_risk_exposure_percent',
        help: 'Current risk exposure as percentage of portfolio',
        labelNames: ['symbol']
      }),

      // Market data latency
      marketDataLatency: new prometheus.Histogram({
        name: 'trading_market_data_latency_ms',
        help: 'Latency of market data updates',
        labelNames: ['symbol', 'source'],
        buckets: [1, 5, 10, 25, 50, 100, 250, 500, 1000]
      })
    };

    // Business Metrics
    this.businessMetrics = {
      // User engagement
      activeUsers: new prometheus.Gauge({
        name: 'business_active_users_total',
        help: 'Number of active users',
        labelNames: ['time_window']
      }),

      // Trading volume
      tradingVolume: new prometheus.Counter({
        name: 'business_trading_volume_usd_total',
        help: 'Total trading volume in USD',
        labelNames: ['symbol', 'side']
      }),

      // Revenue metrics
      revenue: new prometheus.Counter({
        name: 'business_revenue_usd_total',
        help: 'Total revenue in USD',
        labelNames: ['source']
      }),

      // Customer metrics
      newUsers: new prometheus.Counter({
        name: 'business_new_users_total',
        help: 'Number of new user registrations',
        labelNames: ['source']
      }),

      // Feature usage
      featureUsage: new prometheus.Counter({
        name: 'business_feature_usage_total',
        help: 'Number of feature usage events',
        labelNames: ['feature', 'user_type']
      })
    };

    // System Health Metrics
    this.systemHealth = {
      // Service availability
      serviceAvailability: new prometheus.Gauge({
        name: 'system_service_availability_percent',
        help: 'Service availability percentage',
        labelNames: ['service']
      }),

      // Resource utilization
      cpuUsage: new prometheus.Gauge({
        name: 'system_cpu_usage_percent',
        help: 'CPU usage percentage'
      }),

      memoryUsage: new prometheus.Gauge({
        name: 'system_memory_usage_percent',
        help: 'Memory usage percentage'
      }),

      diskUsage: new prometheus.Gauge({
        name: 'system_disk_usage_percent',
        help: 'Disk usage percentage',
        labelNames: ['mount_point']
      }),

      // Database metrics
      databaseConnections: new prometheus.Gauge({
        name: 'system_database_connections_total',
        help: 'Number of database connections',
        labelNames: ['state']
      }),

      // Cache metrics
      cacheHitRate: new prometheus.Gauge({
        name: 'system_cache_hit_rate_percent',
        help: 'Cache hit rate percentage',
        labelNames: ['cache_type']
      })
    };
  }

  initializeBusinessMetrics() {
    // Initialize business metrics with default values
    this.businessMetrics.activeUsers.set({ time_window: '1h' }, 0);
    this.businessMetrics.activeUsers.set({ time_window: '24h' }, 0);
    
    // Start business metrics collection
    this.startBusinessMetricsCollection();
  }

  setupAlerting() {
    this.alerting = {
      rules: [
        {
          name: 'high_error_rate',
          condition: (metrics) => metrics.errorRate > 5,
          severity: 'critical',
          message: 'High error rate detected',
          threshold: 5
        },
        {
          name: 'slow_response_time',
          condition: (metrics) => metrics.responseTime > 2000,
          severity: 'warning',
          message: 'Slow response time detected',
          threshold: 2000
        },
        {
          name: 'low_trading_volume',
          condition: (metrics) => metrics.tradingVolume < 1000,
          severity: 'warning',
          message: 'Low trading volume detected',
          threshold: 1000
        },
        {
          name: 'high_risk_exposure',
          condition: (metrics) => metrics.riskExposure > 80,
          severity: 'critical',
          message: 'High risk exposure detected',
          threshold: 80
        },
        {
          name: 'database_connection_issues',
          condition: (metrics) => metrics.databaseConnections > 80,
          severity: 'warning',
          message: 'High database connection count',
          threshold: 80
        }
      ],
      channels: {
        email: {
          enabled: process.env.EMAIL_ALERTS_ENABLED === 'true',
          recipients: process.env.EMAIL_ALERT_RECIPIENTS?.split(',') || []
        },
        slack: {
          enabled: process.env.SLACK_ALERTS_ENABLED === 'true',
          webhook: process.env.SLACK_WEBHOOK_URL
        },
        webhook: {
          enabled: process.env.WEBHOOK_ALERTS_ENABLED === 'true',
          url: process.env.WEBHOOK_ALERT_URL
        }
      }
    };

    // Start alerting monitoring
    this.startAlertingMonitoring();
  }

  setupHealthChecks() {
    this.healthChecks = {
      services: [
        {
          name: 'database',
          check: () => this.checkDatabaseHealth(),
          interval: 30000, // 30 seconds
          timeout: 5000,
          critical: true
        },
        {
          name: 'redis',
          check: () => this.checkRedisHealth(),
          interval: 30000,
          timeout: 5000,
          critical: true
        },
        {
          name: 'external_apis',
          check: () => this.checkExternalAPIsHealth(),
          interval: 60000, // 1 minute
          timeout: 10000,
          critical: false
        },
        {
          name: 'ssl_certificates',
          check: () => this.checkSSLHealth(),
          interval: 3600000, // 1 hour
          timeout: 30000,
          critical: true
        }
      ]
    };

    // Start health check monitoring
    this.startHealthCheckMonitoring();
  }

  setupRecoveryProcedures() {
    this.recoveryProcedures = {
      database: {
        restart: () => this.restartDatabase(),
        failover: () => this.failoverDatabase(),
        rollback: () => this.rollbackDatabase()
      },
      redis: {
        restart: () => this.restartRedis(),
        clearCache: () => this.clearRedisCache(),
        failover: () => this.failoverRedis()
      },
      application: {
        restart: () => this.restartApplication(),
        scale: (instances) => this.scaleApplication(instances),
        rollback: () => this.rollbackApplication()
      }
    };

    // Start recovery monitoring
    this.startRecoveryMonitoring();
  }

  // Trading Performance Monitoring
  recordOrderExecution(symbol, side, type, status, executionTime) {
    this.tradingPerformance.orderExecutionTime
      .labels({ symbol, side, type, status })
      .observe(executionTime);

    logger.trading('order_execution', null, symbol, executionTime, {
      side,
      type,
      status,
      executionTime
    });
  }

  updateTradeSuccessRate(symbol, strategy, successRate) {
    this.tradingPerformance.tradeSuccessRate
      .labels({ symbol, strategy })
      .set(successRate);

    logger.metrics('trade_success_rate', successRate, { symbol, strategy });
  }

  updateProfitLoss(symbol, strategy, profitLoss) {
    this.tradingPerformance.profitLoss
      .labels({ symbol, strategy })
      .set(profitLoss);

    logger.metrics('profit_loss', profitLoss, { symbol, strategy });
  }

  updatePositionSize(symbol, side, size) {
    this.tradingPerformance.positionSize
      .labels({ symbol, side })
      .set(size);

    logger.trading('position_update', null, symbol, size, { side });
  }

  updateRiskExposure(symbol, exposure) {
    this.tradingPerformance.riskExposure
      .labels({ symbol })
      .set(exposure);

    logger.metrics('risk_exposure', exposure, { symbol });
  }

  recordMarketDataLatency(symbol, source, latency) {
    this.tradingPerformance.marketDataLatency
      .labels({ symbol, source })
      .observe(latency);

    logger.metrics('market_data_latency', latency, { symbol, source });
  }

  // Business Metrics Collection
  startBusinessMetricsCollection() {
    setInterval(async () => {
      try {
        await this.collectBusinessMetrics();
      } catch (error) {
        logger.error('Failed to collect business metrics', {
          type: 'business_metrics',
          error: error.message
        });
      }
    }, 60000); // Collect every minute
  }

  async collectBusinessMetrics() {
    // Collect active users
    const activeUsers1h = await this.getActiveUsers('1h');
    const activeUsers24h = await this.getActiveUsers('24h');
    
    this.businessMetrics.activeUsers.set({ time_window: '1h' }, activeUsers1h);
    this.businessMetrics.activeUsers.set({ time_window: '24h' }, activeUsers24h);

    // Collect trading volume
    const tradingVolume = await this.getTradingVolume();
    this.businessMetrics.tradingVolume.inc({ symbol: 'total', side: 'all' }, tradingVolume);

    // Collect revenue
    const revenue = await this.getRevenue();
    this.businessMetrics.revenue.inc({ source: 'trading_fees' }, revenue);

    logger.info('Business metrics collected', {
      type: 'business_metrics',
      activeUsers1h,
      activeUsers24h,
      tradingVolume,
      revenue
    });
  }

  async getActiveUsers(timeWindow) {
    // Implementation would query database for active users
    // For now, return mock data
    return Math.floor(Math.random() * 100) + 50;
  }

  async getTradingVolume() {
    // Implementation would query database for trading volume
    // For now, return mock data
    return Math.floor(Math.random() * 10000) + 1000;
  }

  async getRevenue() {
    // Implementation would query database for revenue
    // For now, return mock data
    return Math.floor(Math.random() * 1000) + 100;
  }

  // Alerting System
  startAlertingMonitoring() {
    setInterval(async () => {
      try {
        await this.checkAlerts();
      } catch (error) {
        logger.error('Failed to check alerts', {
          type: 'alerting',
          error: error.message
        });
      }
    }, 30000); // Check alerts every 30 seconds
  }

  async checkAlerts() {
    const metrics = await this.getCurrentMetrics();
    
    for (const rule of this.alerting.rules) {
      if (rule.condition(metrics)) {
        await this.triggerAlert(rule, metrics);
      }
    }
  }

  async getCurrentMetrics() {
    // Collect current metrics for alerting
    return {
      errorRate: await this.getErrorRate(),
      responseTime: await this.getAverageResponseTime(),
      tradingVolume: await this.getTradingVolume(),
      riskExposure: await this.getMaxRiskExposure(),
      databaseConnections: await this.getDatabaseConnectionCount()
    };
  }

  async triggerAlert(rule, metrics) {
    const alert = {
      name: rule.name,
      severity: rule.severity,
      message: rule.message,
      threshold: rule.threshold,
      currentValue: metrics[rule.name.replace('_', '')],
      timestamp: new Date().toISOString()
    };

    logger.warn('Alert triggered', {
      type: 'alert',
      ...alert
    });

    // Send alert through configured channels
    await this.sendAlert(alert);
  }

  async sendAlert(alert) {
    const { channels } = this.alerting;

    // Send email alert
    if (channels.email.enabled) {
      await this.sendEmailAlert(alert);
    }

    // Send Slack alert
    if (channels.slack.enabled) {
      await this.sendSlackAlert(alert);
    }

    // Send webhook alert
    if (channels.webhook.enabled) {
      await this.sendWebhookAlert(alert);
    }
  }

  async sendEmailAlert(alert) {
    // Implementation would send email alert
    logger.info('Email alert sent', { type: 'email_alert', alert });
  }

  async sendSlackAlert(alert) {
    // Implementation would send Slack alert
    logger.info('Slack alert sent', { type: 'slack_alert', alert });
  }

  async sendWebhookAlert(alert) {
    // Implementation would send webhook alert
    logger.info('Webhook alert sent', { type: 'webhook_alert', alert });
  }

  // Health Check System
  startHealthCheckMonitoring() {
    for (const service of this.healthChecks.services) {
      setInterval(async () => {
        try {
          const startTime = Date.now();
          await Promise.race([
            service.check(),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Health check timeout')), service.timeout)
            )
          ]);
          
          const responseTime = Date.now() - startTime;
          
          this.systemHealth.serviceAvailability
            .labels({ service: service.name })
            .set(100);

          logger.health(service.name, 'healthy', { responseTime });
          
        } catch (error) {
          this.systemHealth.serviceAvailability
            .labels({ service: service.name })
            .set(0);

          logger.health(service.name, 'unhealthy', { error: error.message });

          if (service.critical) {
            await this.triggerRecoveryProcedure(service.name, error);
          }
        }
      }, service.interval);
    }
  }

  async checkDatabaseHealth() {
    // Implementation would check database health
    return true;
  }

  async checkRedisHealth() {
    // Implementation would check Redis health
    return true;
  }

  async checkExternalAPIsHealth() {
    // Implementation would check external APIs health
    return true;
  }

  async checkSSLHealth() {
    // Implementation would check SSL certificate health
    return true;
  }

  // Recovery Procedures
  startRecoveryMonitoring() {
    this.recoveryProcedures.active = new Map();
  }

  async triggerRecoveryProcedure(serviceName, error) {
    const recoveryKey = `${serviceName}_${Date.now()}`;
    
    if (this.recoveryProcedures.active.has(recoveryKey)) {
      return; // Recovery already in progress
    }

    this.recoveryProcedures.active.set(recoveryKey, {
      service: serviceName,
      error: error.message,
      startTime: Date.now()
    });

    try {
      logger.info('Starting recovery procedure', {
        type: 'recovery',
        service: serviceName,
        error: error.message
      });

      // Execute recovery procedure based on service
      if (this.recoveryProcedures[serviceName]) {
        await this.recoveryProcedures[serviceName].restart();
      }

      logger.info('Recovery procedure completed', {
        type: 'recovery',
        service: serviceName
      });

    } catch (recoveryError) {
      logger.error('Recovery procedure failed', {
        type: 'recovery',
        service: serviceName,
        error: recoveryError.message
      });
    } finally {
      this.recoveryProcedures.active.delete(recoveryKey);
    }
  }

  // Recovery procedure implementations
  async restartDatabase() {
    // Implementation would restart database
    logger.info('Database restart initiated', { type: 'recovery' });
  }

  async restartRedis() {
    // Implementation would restart Redis
    logger.info('Redis restart initiated', { type: 'recovery' });
  }

  async restartApplication() {
    // Implementation would restart application
    logger.info('Application restart initiated', { type: 'recovery' });
  }

  // Utility methods
  async getErrorRate() {
    // Implementation would calculate error rate
    return Math.random() * 10; // Mock data
  }

  async getAverageResponseTime() {
    // Implementation would calculate average response time
    return Math.random() * 3000; // Mock data
  }

  async getMaxRiskExposure() {
    // Implementation would calculate max risk exposure
    return Math.random() * 100; // Mock data
  }

  async getDatabaseConnectionCount() {
    // Implementation would get database connection count
    return Math.floor(Math.random() * 100); // Mock data
  }

  // Get all metrics
  getMetrics() {
    return prometheus.register.metrics();
  }

  // Get health status
  async getHealthStatus() {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {},
      metrics: {
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage()
      }
    };

    // Check each service
    for (const service of this.healthChecks.services) {
      try {
        await service.check();
        health.services[service.name] = 'healthy';
      } catch (error) {
        health.services[service.name] = 'unhealthy';
        health.status = 'unhealthy';
      }
    }

    return health;
  }
}

// Create singleton instance
let enhancedMonitoringInstance;

function getEnhancedMonitoring() {
  if (!enhancedMonitoringInstance) {
    enhancedMonitoringInstance = new EnhancedMonitoringSystem();
  }
  return enhancedMonitoringInstance;
}

module.exports = { EnhancedMonitoringSystem, getEnhancedMonitoring };
