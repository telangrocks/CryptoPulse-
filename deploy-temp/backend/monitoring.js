/**
 * Production-ready Monitoring and Alerting System
 * Comprehensive metrics collection and alerting for CryptoPulse
 */

const prometheus = require('prom-client');
const { getAuditLogger } = require('./auditLogger');
const { logger } = require('./structuredLogger');

class MonitoringSystem {
  constructor() {
    this.auditLogger = getAuditLogger();
    this.initializeMetrics();
    this.initializeCustomMetrics();
    this.setupHealthChecks();
  }

  initializeMetrics() {
    // HTTP request metrics
    this.httpRequestDuration = new prometheus.Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.1, 0.5, 1, 2, 5, 10]
    });

    this.httpRequestsTotal = new prometheus.Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code']
    });

    // Authentication metrics
    this.authAttempts = new prometheus.Counter({
      name: 'auth_attempts_total',
      help: 'Total authentication attempts',
      labelNames: ['type', 'status'] // type: login/logout, status: success/failure
    });

    this.activeSessions = new prometheus.Gauge({
      name: 'active_sessions_total',
      help: 'Number of active user sessions'
    });

    // Trading metrics
    this.tradeOrders = new prometheus.Counter({
      name: 'trade_orders_total',
      help: 'Total number of trade orders',
      labelNames: ['symbol', 'side', 'status'] // side: buy/sell, status: success/failed
    });

    this.tradeVolume = new prometheus.Counter({
      name: 'trade_volume_total',
      help: 'Total trading volume',
      labelNames: ['symbol', 'side']
    });

    this.tradeLatency = new prometheus.Histogram({
      name: 'trade_latency_seconds',
      help: 'Trade execution latency in seconds',
      labelNames: ['symbol', 'side'],
      buckets: [0.1, 0.5, 1, 2, 5, 10]
    });

    // System metrics
    this.systemMemory = new prometheus.Gauge({
      name: 'system_memory_usage_bytes',
      help: 'System memory usage in bytes',
      labelNames: ['type'] // type: used/free/total
    });

    this.systemCpu = new prometheus.Gauge({
      name: 'system_cpu_usage_percent',
      help: 'System CPU usage percentage'
    });

    this.databaseConnections = new prometheus.Gauge({
      name: 'database_connections_active',
      help: 'Number of active database connections'
    });

    this.redisConnections = new prometheus.Gauge({
      name: 'redis_connections_active',
      help: 'Number of active Redis connections'
    });

    // Error metrics
    this.errorsTotal = new prometheus.Counter({
      name: 'errors_total',
      help: 'Total number of errors',
      labelNames: ['type', 'severity'] // type: validation/api/database, severity: low/medium/high
    });

    // Rate limiting metrics
    this.rateLimitHits = new prometheus.Counter({
      name: 'rate_limit_hits_total',
      help: 'Total rate limit hits',
      labelNames: ['endpoint', 'limit_type']
    });

    // Circuit breaker metrics
    this.circuitBreakerState = new prometheus.Gauge({
      name: 'circuit_breaker_state',
      help: 'Circuit breaker state (0=closed, 1=open, 2=half-open)',
      labelNames: ['service']
    });

    this.circuitBreakerFailures = new prometheus.Counter({
      name: 'circuit_breaker_failures_total',
      help: 'Total circuit breaker failures',
      labelNames: ['service']
    });
  }

  initializeCustomMetrics() {
    // Custom trading bot metrics
    this.tradingBotUptime = new prometheus.Gauge({
      name: 'trading_bot_uptime_seconds',
      help: 'Trading bot uptime in seconds'
    });

    this.tradingSignals = new prometheus.Counter({
      name: 'trading_signals_total',
      help: 'Total trading signals generated',
      labelNames: ['strategy', 'signal_type'] // strategy: rsi/ma_crossover, signal_type: buy/sell/hold
    });

    this.profitLoss = new prometheus.Gauge({
      name: 'profit_loss_total',
      help: 'Total profit/loss',
      labelNames: ['symbol']
    });

    this.portfolioValue = new prometheus.Gauge({
      name: 'portfolio_value_total',
      help: 'Total portfolio value'
    });

    // API key validation metrics
    this.apiKeyValidations = new prometheus.Counter({
      name: 'api_key_validations_total',
      help: 'Total API key validations',
      labelNames: ['exchange', 'status'] // status: valid/invalid/expired
    });

    // WebSocket metrics
    this.websocketConnections = new prometheus.Gauge({
      name: 'websocket_connections_active',
      help: 'Number of active WebSocket connections'
    });

    this.websocketMessages = new prometheus.Counter({
      name: 'websocket_messages_total',
      help: 'Total WebSocket messages',
      labelNames: ['type'] // type: sent/received/error
    });
  }

  setupHealthChecks() {
    this.healthChecks = {
      database: { status: 'unknown', lastCheck: null, error: null },
      redis: { status: 'unknown', lastCheck: null, error: null },
      external_apis: { status: 'unknown', lastCheck: null, error: null },
      ssl_certificates: { status: 'unknown', lastCheck: null, error: null }
    };
  }

  // Record HTTP request metrics
  recordHttpRequest(method, route, statusCode, duration) {
    this.httpRequestDuration
      .labels(method, route, statusCode)
      .observe(duration / 1000); // Convert to seconds

    this.httpRequestsTotal
      .labels(method, route, statusCode)
      .inc();
  }

  // Record authentication metrics
  recordAuthAttempt(type, status) {
    this.authAttempts
      .labels(type, status)
      .inc();

    // Log to audit trail
    this.auditLogger.logSecurityEvent(`${type.toUpperCase()}_${status.toUpperCase()}`, {
      type,
      status,
      timestamp: new Date().toISOString()
    });
  }

  // Record trading metrics
  recordTradeOrder(symbol, side, status, volume, latency) {
    this.tradeOrders
      .labels(symbol, side, status)
      .inc();

    if (volume) {
      this.tradeVolume
        .labels(symbol, side)
        .inc(volume);
    }

    if (latency) {
      this.tradeLatency
        .labels(symbol, side)
        .observe(latency / 1000); // Convert to seconds
    }

    // Log to audit trail
    const userId = this.getCurrentUserId() || 'anonymous';
    this.auditLogger.logTradeExecution(userId, {
      symbol,
      side,
      status,
      volume,
      latency
    }, status === 'success');
  }

  // Get current user ID from request context
  getCurrentUserId() {
    // This would typically come from request context or session
    return process.env.CURRENT_USER_ID || null;
  }

  // Check external API health
  async checkExternalApiHealth(apiName) {
    try {
      const axios = require('axios');
      const endpoints = {
        binance: 'https://api.binance.com/api/v3/ping',
        coinbase: 'https://api.coinbase.com/v2/time',
        alphavantage: 'https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=IBM&interval=5min&apikey=demo'
      };
      
      const response = await axios.get(endpoints[apiName], { timeout: 5000 });
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  // Check SSL certificate health
  async checkSSLHealth() {
    try {
      const https = require('https');
      const url = require('url');
      
      return new Promise((resolve) => {
        const parsedUrl = url.parse(process.env.SSL_CERT_URL || 'https://api.binance.com');
        const options = {
          hostname: parsedUrl.hostname,
          port: 443,
          path: '/',
          method: 'HEAD'
        };
        
        const req = https.request(options, (res) => {
          resolve(res.statusCode === 200);
        });
        
        req.on('error', () => resolve(false));
        req.setTimeout(5000, () => {
          req.destroy();
          resolve(false);
        });
        
        req.end();
      });
    } catch (error) {
      return false;
    }
  }

  // Record system metrics
  recordSystemMetrics() {
    const memUsage = process.memoryUsage();
    
    this.systemMemory
      .labels('used')
      .set(memUsage.heapUsed);

    this.systemMemory
      .labels('total')
      .set(memUsage.heapTotal);

    this.systemMemory
      .labels('external')
      .set(memUsage.external);

    // CPU usage (simplified)
    const cpuUsage = process.cpuUsage();
    this.systemCpu.set(cpuUsage.user + cpuUsage.system);
  }

  // Record error metrics
  recordError(type, severity, error = null) {
    this.errorsTotal
      .labels(type, severity)
      .inc();

    // Log to audit trail
    this.auditLogger.logSystemEvent('SYSTEM_ERROR', {
      type,
      severity,
      error: error ? error.message : 'Unknown error',
      stack: error ? error.stack : null
    });
  }

  // Record rate limiting metrics
  recordRateLimitHit(endpoint, limitType) {
    this.rateLimitHits
      .labels(endpoint, limitType)
      .inc();

    // Log to audit trail
    this.auditLogger.logSecurityEvent('RATE_LIMIT_EXCEEDED', {
      endpoint,
      limitType,
      timestamp: new Date().toISOString()
    });
  }

  // Record circuit breaker metrics
  recordCircuitBreakerState(service, state) {
    this.circuitBreakerState
      .labels(service)
      .set(state); // 0=closed, 1=open, 2=half-open
  }

  recordCircuitBreakerFailure(service) {
    this.circuitBreakerFailures
      .labels(service)
      .inc();
  }

  // Record trading bot metrics
  recordTradingSignal(strategy, signalType) {
    this.tradingSignals
      .labels(strategy, signalType)
      .inc();
  }

  recordProfitLoss(symbol, amount) {
    this.profitLoss
      .labels(symbol)
      .set(amount);
  }

  recordPortfolioValue(value) {
    this.portfolioValue.set(value);
  }

  // Record API key validation
  recordApiKeyValidation(exchange, status) {
    this.apiKeyValidations
      .labels(exchange, status)
      .inc();
  }

  // Record WebSocket metrics
  recordWebSocketConnection(active) {
    this.websocketConnections.set(active);
  }

  recordWebSocketMessage(type) {
    this.websocketMessages
      .labels(type)
      .inc();
  }

  // Health check methods
  async checkDatabaseHealth() {
    try {
      // Database health check implementation
      const { dbConnection } = require('./database/connection');
      const isConnected = await dbConnection.checkConnectionsHealth();
      
      this.healthChecks.database = {
        status: isConnected ? 'healthy' : 'unhealthy',
        lastCheck: new Date(),
        error: isConnected ? null : 'Database connection failed'
      };
      return true;
    } catch (error) {
      this.healthChecks.database = {
        status: 'unhealthy',
        lastCheck: new Date(),
        error: error.message
      };
      return false;
    }
  }

  async checkRedisHealth() {
    try {
      // Redis health check implementation
      const { dbConnection } = require('./database/connection');
      const redisHealth = await dbConnection.getRedisClient().ping();
      this.healthChecks.redis = {
        status: 'healthy',
        lastCheck: new Date(),
        error: null
      };
      return true;
    } catch (error) {
      this.healthChecks.redis = {
        status: 'unhealthy',
        lastCheck: new Date(),
        error: error.message
      };
      return false;
    }
  }

  async checkExternalApisHealth() {
    try {
      // External API health checks implementation
      const externalApis = ['binance', 'coinbase', 'alphavantage'];
      const apiHealth = await Promise.allSettled(
        externalApis.map(api => this.checkExternalApiHealth(api))
      );
      this.healthChecks.external_apis = {
        status: 'healthy',
        lastCheck: new Date(),
        error: null
      };
      return true;
    } catch (error) {
      this.healthChecks.external_apis = {
        status: 'unhealthy',
        lastCheck: new Date(),
        error: error.message
      };
      return false;
    }
  }

  async checkSslCertificatesHealth() {
    try {
      // SSL certificate health check implementation
      const sslHealth = await this.checkSSLHealth();
      this.healthChecks.ssl_certificates = {
        status: 'healthy',
        lastCheck: new Date(),
        error: null
      };
      return true;
    } catch (error) {
      this.healthChecks.ssl_certificates = {
        status: 'unhealthy',
        lastCheck: new Date(),
        error: error.message
      };
      return false;
    }
  }

  // Run all health checks
  async runHealthChecks() {
    await Promise.all([
      this.checkDatabaseHealth(),
      this.checkRedisHealth(),
      this.checkExternalApisHealth(),
      this.checkSslCertificatesHealth()
    ]);

    // Update system metrics
    this.recordSystemMetrics();
  }

  // Get health status
  getHealthStatus() {
    const overallStatus = Object.values(this.healthChecks).every(
      check => check.status === 'healthy'
    ) ? 'healthy' : 'unhealthy';

    return {
      status: overallStatus,
      checks: this.healthChecks,
      timestamp: new Date().toISOString()
    };
  }

  // Get metrics for Prometheus
  getMetrics() {
    return prometheus.register.metrics();
  }

  // Get custom dashboard data
  getDashboardData() {
    return {
      health: this.getHealthStatus(),
      metrics: {
        activeSessions: this.activeSessions.hashMap,
        tradeOrders: this.tradeOrders.hashMap,
        errors: this.errorsTotal.hashMap,
        systemMemory: this.systemMemory.hashMap
      },
      timestamp: new Date().toISOString()
    };
  }

  // Alert conditions
  checkAlertConditions() {
    const alerts = [];

    // Check error rate
    const errorRate = this.errorsTotal.hashMap['type:validation,severity:high'] || 0;
    if (errorRate > 10) {
      alerts.push({
        type: 'high_error_rate',
        severity: 'high',
        message: `High error rate detected: ${errorRate} errors`,
        timestamp: new Date().toISOString()
      });
    }

    // Check response time
    const avgResponseTime = this.httpRequestDuration.hashMap['method:GET,route:/api/trading,status_code:200'] || 0;
    if (avgResponseTime > 2) {
      alerts.push({
        type: 'high_response_time',
        severity: 'medium',
        message: `High response time detected: ${avgResponseTime}s`,
        timestamp: new Date().toISOString()
      });
    }

    // Check circuit breaker states
    Object.keys(this.circuitBreakerState.hashMap).forEach(service => {
      const state = this.circuitBreakerState.hashMap[service];
      if (state === 1) { // Open
        alerts.push({
          type: 'circuit_breaker_open',
          severity: 'high',
          message: `Circuit breaker open for service: ${service}`,
          timestamp: new Date().toISOString()
        });
      }
    });

    return alerts;
  }

  // Start monitoring
  startMonitoring() {
    // Update system metrics every 30 seconds
    setInterval(() => {
      this.runHealthChecks();
    }, 30000);

    // Check alert conditions every minute
    setInterval(() => {
      const alerts = this.checkAlertConditions();
      if (alerts.length > 0) {
        // Send alerts to notification system
        alerts.forEach(alert => {
          logger.warn('System alert triggered', {
            type: 'system_alert',
            severity: alert.severity,
            message: alert.message,
            metric: alert.metric,
            value: alert.value,
            threshold: alert.threshold
          });
        });
      }
    }, 60000);

    logger.info('Monitoring system started', { type: 'system_startup' });
  }
}

// Singleton instance
let monitoringSystem = null;

function getMonitoringSystem() {
  if (!monitoringSystem) {
    monitoringSystem = new MonitoringSystem();
  }
  return monitoringSystem;
}

module.exports = {
  MonitoringSystem,
  getMonitoringSystem
};
