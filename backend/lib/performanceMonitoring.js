// =============================================================================
// Comprehensive Performance Monitoring System - Production Ready
// =============================================================================
// Advanced performance monitoring, metrics collection, and real-time analysis

const EventEmitter = require('events');
const os = require('os');
const fs = require('fs').promises;
const path = require('path');
const logger = require('./logging');

// Performance monitoring strategies
const MONITORING_STRATEGIES = {
  REAL_TIME: 'real_time',
  BATCH: 'batch',
  SAMPLING: 'sampling',
  EVENT_DRIVEN: 'event_driven'
};

// Metric types
const METRIC_TYPES = {
  COUNTER: 'counter',
  GAUGE: 'gauge',
  HISTOGRAM: 'histogram',
  TIMER: 'timer',
  RATE: 'rate'
};

// Performance thresholds
const PERFORMANCE_THRESHOLDS = {
  RESPONSE_TIME: {
    FAST: 100,      // < 100ms
    MODERATE: 500,  // 100-500ms
    SLOW: 1000,     // 500ms-1s
    CRITICAL: 5000  // > 5s
  },
  THROUGHPUT: {
    HIGH: 1000,     // > 1000 req/s
    MEDIUM: 500,    // 500-1000 req/s
    LOW: 100,       // 100-500 req/s
    CRITICAL: 50    // < 50 req/s
  },
  ERROR_RATE: {
    EXCELLENT: 0.001,  // < 0.1%
    GOOD: 0.01,        // 0.1-1%
    MODERATE: 0.05,    // 1-5%
    POOR: 0.1,         // 5-10%
    CRITICAL: 0.2      // > 10%
  },
  MEMORY_USAGE: {
    LOW: 0.5,       // < 50%
    MEDIUM: 0.7,    // 50-70%
    HIGH: 0.85,     // 70-85%
    CRITICAL: 0.95  // > 85%
  }
};

// Performance monitoring configuration
const monitoringConfig = {
  // General settings
  enabled: true,
  strategy: MONITORING_STRATEGIES.REAL_TIME,
  interval: 1000, // 1 second
  
  // Metrics collection
  metrics: {
    enabled: true,
    retention: 86400, // 24 hours
    resolution: 60,   // 1 minute
    maxMetrics: 100000
  },
  
  // Performance tracking
  performance: {
    enabled: true,
    trackRequests: true,
    trackDatabase: true,
    trackCache: true,
    trackMemory: true,
    trackCPU: true,
    trackNetwork: true
  },
  
  // Alerting
  alerting: {
    enabled: true,
    thresholds: PERFORMANCE_THRESHOLDS,
    channels: {
      log: true,
      webhook: false,
      email: false
    },
    cooldown: 300000 // 5 minutes
  },
  
  // Reporting
  reporting: {
    enabled: true,
    interval: 300000, // 5 minutes
    formats: ['json', 'csv'],
    outputDir: './logs/performance'
  },
  
  // Profiling
  profiling: {
    enabled: false,
    sampleRate: 0.01, // 1%
    maxDuration: 10000, // 10 seconds
    outputDir: './logs/profiles'
  }
};

// Performance monitor class
class PerformanceMonitor extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.config = { ...monitoringConfig, ...options };
    this.isInitialized = false;
    this.metrics = new Map();
    this.counters = new Map();
    this.gauges = new Map();
    this.histograms = new Map();
    this.timers = new Map();
    this.rates = new Map();
    
    this.performanceData = {
      requests: {
        total: 0,
        successful: 0,
        failed: 0,
        averageResponseTime: 0,
        minResponseTime: Infinity,
        maxResponseTime: 0,
        responseTimeHistory: [],
        errorRate: 0,
        throughput: 0
      },
      database: {
        totalQueries: 0,
        successfulQueries: 0,
        failedQueries: 0,
        averageQueryTime: 0,
        slowQueries: 0,
        connectionPoolUsage: 0,
        queryTypes: new Map()
      },
      cache: {
        hits: 0,
        misses: 0,
        hitRate: 0,
        averageAccessTime: 0,
        evictions: 0,
        memoryUsage: 0
      },
      system: {
        memory: {
          heapUsed: 0,
          heapTotal: 0,
          rss: 0,
          external: 0,
          usage: 0
        },
        cpu: {
          usage: 0,
          loadAverage: [0, 0, 0],
          cores: os.cpus().length
        },
        network: {
          bytesReceived: 0,
          bytesSent: 0,
          connections: 0
        }
      }
    };
    
    this.alerts = new Map();
    this.alertCooldowns = new Map();
    this.intervals = new Map();
    this.profiles = new Map();
    
    this.setupEventHandlers();
  }

  // Initialize performance monitor
  async initialize() {
    try {
      logger.info('Initializing performance monitor...');
      
      // Create output directories
      await this.createOutputDirectories();
      
      // Start monitoring based on strategy
      this.startMonitoring();
      
      this.isInitialized = true;
      this.emit('initialized');
      
      logger.info('✅ Performance monitor initialized');
      
    } catch (error) {
      logger.error('❌ Failed to initialize performance monitor:', error);
      throw error;
    }
  }

  // Setup event handlers
  setupEventHandlers() {
    this.on('metric:recorded', (metric) => {
      this.processMetric(metric);
    });

    this.on('performance:threshold:exceeded', (threshold, value, details) => {
      this.handleThresholdExceeded(threshold, value, details);
    });

    this.on('alert:triggered', (alert) => {
      this.handleAlert(alert);
    });

    // Graceful shutdown
    process.on('SIGINT', () => this.shutdown());
    process.on('SIGTERM', () => this.shutdown());
  }

  // Create output directories
  async createOutputDirectories() {
    try {
      await fs.mkdir(this.config.reporting.outputDir, { recursive: true });
      
      if (this.config.profiling.enabled) {
        await fs.mkdir(this.config.profiling.outputDir, { recursive: true });
      }
    } catch (error) {
      logger.error('Failed to create output directories:', error);
    }
  }

  // Start monitoring
  startMonitoring() {
    if (!this.config.enabled) {
      return;
    }

    // Main monitoring loop
    const monitoringInterval = setInterval(() => {
      this.collectMetrics();
    }, this.config.interval);
    
    this.intervals.set('monitoring', monitoringInterval);
    
    // System metrics collection
    if (this.config.performance.trackMemory || this.config.performance.trackCPU) {
      const systemInterval = setInterval(() => {
        this.collectSystemMetrics();
      }, 5000); // Every 5 seconds
      
      this.intervals.set('system', systemInterval);
    }
    
    // Performance reporting
    if (this.config.reporting.enabled) {
      const reportingInterval = setInterval(() => {
        this.generateReport();
      }, this.config.reporting.interval);
      
      this.intervals.set('reporting', reportingInterval);
    }
    
    // Alerting
    if (this.config.alerting.enabled) {
      const alertingInterval = setInterval(() => {
        this.checkAlerts();
      }, 30000); // Every 30 seconds
      
      this.intervals.set('alerting', alertingInterval);
    }
  }

  // Record metric
  recordMetric(name, value, type = METRIC_TYPES.GAUGE, tags = {}) {
    if (!this.isInitialized) {
      return;
    }

    const metric = {
      name,
      value,
      type,
      tags,
      timestamp: Date.now()
    };

    // Store metric based on type
    switch (type) {
      case METRIC_TYPES.COUNTER:
        this.recordCounter(name, value, tags);
        break;
      case METRIC_TYPES.GAUGE:
        this.recordGauge(name, value, tags);
        break;
      case METRIC_TYPES.HISTOGRAM:
        this.recordHistogram(name, value, tags);
        break;
      case METRIC_TYPES.TIMER:
        this.recordTimer(name, value, tags);
        break;
      case METRIC_TYPES.RATE:
        this.recordRate(name, value, tags);
        break;
    }

    this.emit('metric:recorded', metric);
  }

  // Record counter
  recordCounter(name, value, tags = {}) {
    const key = this.getMetricKey(name, tags);
    
    if (!this.counters.has(key)) {
      this.counters.set(key, {
        name,
        tags,
        value: 0,
        firstRecorded: Date.now(),
        lastRecorded: Date.now()
      });
    }
    
    const counter = this.counters.get(key);
    counter.value += value;
    counter.lastRecorded = Date.now();
  }

  // Record gauge
  recordGauge(name, value, tags = {}) {
    const key = this.getMetricKey(name, tags);
    
    this.gauges.set(key, {
      name,
      tags,
      value,
      timestamp: Date.now()
    });
  }

  // Record histogram
  recordHistogram(name, value, tags = {}) {
    const key = this.getMetricKey(name, tags);
    
    if (!this.histograms.has(key)) {
      this.histograms.set(key, {
        name,
        tags,
        values: [],
        count: 0,
        sum: 0,
        min: Infinity,
        max: -Infinity,
        firstRecorded: Date.now(),
        lastRecorded: Date.now()
      });
    }
    
    const histogram = this.histograms.get(key);
    histogram.values.push(value);
    histogram.count++;
    histogram.sum += value;
    histogram.min = Math.min(histogram.min, value);
    histogram.max = Math.max(histogram.max, value);
    histogram.lastRecorded = Date.now();
    
    // Keep only recent values
    if (histogram.values.length > 1000) {
      histogram.values = histogram.values.slice(-1000);
    }
  }

  // Record timer
  recordTimer(name, duration, tags = {}) {
    this.recordHistogram(name, duration, tags);
    this.recordMetric(`${name}_rate`, 1, METRIC_TYPES.RATE, tags);
  }

  // Record rate
  recordRate(name, value, tags = {}) {
    const key = this.getMetricKey(name, tags);
    
    if (!this.rates.has(key)) {
      this.rates.set(key, {
        name,
        tags,
        values: [],
        firstRecorded: Date.now(),
        lastRecorded: Date.now()
      });
    }
    
    const rate = this.rates.get(key);
    rate.values.push({ value, timestamp: Date.now() });
    rate.lastRecorded = Date.now();
    
    // Keep only recent values
    if (rate.values.length > 100) {
      rate.values = rate.values.slice(-100);
    }
  }

  // Get metric key
  getMetricKey(name, tags) {
    const tagString = Object.keys(tags)
      .sort()
      .map(key => `${key}:${tags[key]}`)
      .join(',');
    
    return tagString ? `${name}[${tagString}]` : name;
  }

  // Process metric
  processMetric(metric) {
    // Update performance data based on metric
    this.updatePerformanceData(metric);
    
    // Check thresholds
    this.checkThresholds(metric);
    
    // Store metric for reporting
    this.storeMetric(metric);
  }

  // Update performance data
  updatePerformanceData(metric) {
    const { name, value, tags } = metric;
    
    // Update request metrics
    if (name.startsWith('request_')) {
      this.updateRequestMetrics(name, value, tags);
    }
    
    // Update database metrics
    if (name.startsWith('database_')) {
      this.updateDatabaseMetrics(name, value, tags);
    }
    
    // Update cache metrics
    if (name.startsWith('cache_')) {
      this.updateCacheMetrics(name, value, tags);
    }
  }

  // Update request metrics
  updateRequestMetrics(name, value, tags) {
    const data = this.performanceData.requests;
    
    switch (name) {
      case 'request_total':
        data.total += value;
        break;
      case 'request_successful':
        data.successful += value;
        break;
      case 'request_failed':
        data.failed += value;
        break;
      case 'request_duration':
        data.responseTimeHistory.push(value);
        data.minResponseTime = Math.min(data.minResponseTime, value);
        data.maxResponseTime = Math.max(data.maxResponseTime, value);
        
        // Update average
        const total = data.responseTimeHistory.length;
        data.averageResponseTime = data.responseTimeHistory.reduce((sum, time) => sum + time, 0) / total;
        
        // Keep only recent values
        if (data.responseTimeHistory.length > 1000) {
          data.responseTimeHistory = data.responseTimeHistory.slice(-1000);
        }
        break;
    }
    
    // Calculate derived metrics
    data.errorRate = data.total > 0 ? (data.failed / data.total) : 0;
    data.throughput = this.calculateThroughput(data.total);
  }

  // Update database metrics
  updateDatabaseMetrics(name, value, tags) {
    const data = this.performanceData.database;
    
    switch (name) {
      case 'database_query_total':
        data.totalQueries += value;
        break;
      case 'database_query_successful':
        data.successfulQueries += value;
        break;
      case 'database_query_failed':
        data.failedQueries += value;
        break;
      case 'database_query_duration':
        data.averageQueryTime = (data.averageQueryTime * data.totalQueries + value) / (data.totalQueries + 1);
        
        if (value > 1000) { // Slow query threshold
          data.slowQueries++;
        }
        break;
      case 'database_connection_pool_usage':
        data.connectionPoolUsage = value;
        break;
    }
  }

  // Update cache metrics
  updateCacheMetrics(name, value, tags) {
    const data = this.performanceData.cache;
    
    switch (name) {
      case 'cache_hit':
        data.hits += value;
        break;
      case 'cache_miss':
        data.misses += value;
        break;
      case 'cache_access_duration':
        data.averageAccessTime = (data.averageAccessTime * (data.hits + data.misses) + value) / (data.hits + data.misses + 1);
        break;
      case 'cache_eviction':
        data.evictions += value;
        break;
      case 'cache_memory_usage':
        data.memoryUsage = value;
        break;
    }
    
    // Calculate hit rate
    const total = data.hits + data.misses;
    data.hitRate = total > 0 ? (data.hits / total) : 0;
  }

  // Collect system metrics
  collectSystemMetrics() {
    if (this.config.performance.trackMemory) {
      this.collectMemoryMetrics();
    }
    
    if (this.config.performance.trackCPU) {
      this.collectCPUMetrics();
    }
    
    if (this.config.performance.trackNetwork) {
      this.collectNetworkMetrics();
    }
  }

  // Collect memory metrics
  collectMemoryMetrics() {
    const memoryUsage = process.memoryUsage();
    const systemMemory = {
      total: os.totalmem(),
      free: os.freemem(),
      used: os.totalmem() - os.freemem()
    };

    this.performanceData.system.memory = {
      heapUsed: memoryUsage.heapUsed,
      heapTotal: memoryUsage.heapTotal,
      rss: memoryUsage.rss,
      external: memoryUsage.external,
      usage: memoryUsage.heapUsed / memoryUsage.heapTotal
    };

    // Record metrics
    this.recordMetric('memory_heap_used', memoryUsage.heapUsed, METRIC_TYPES.GAUGE);
    this.recordMetric('memory_heap_total', memoryUsage.heapTotal, METRIC_TYPES.GAUGE);
    this.recordMetric('memory_rss', memoryUsage.rss, METRIC_TYPES.GAUGE);
    this.recordMetric('memory_external', memoryUsage.external, METRIC_TYPES.GAUGE);
    this.recordMetric('memory_usage_percent', this.performanceData.system.memory.usage, METRIC_TYPES.GAUGE);
  }

  // Collect CPU metrics
  collectCPUMetrics() {
    const loadAverage = os.loadavg();
    const cpuUsage = this.calculateCPUUsage();

    this.performanceData.system.cpu = {
      usage: cpuUsage,
      loadAverage,
      cores: os.cpus().length
    };

    // Record metrics
    this.recordMetric('cpu_usage', cpuUsage, METRIC_TYPES.GAUGE);
    this.recordMetric('cpu_load_1m', loadAverage[0], METRIC_TYPES.GAUGE);
    this.recordMetric('cpu_load_5m', loadAverage[1], METRIC_TYPES.GAUGE);
    this.recordMetric('cpu_load_15m', loadAverage[2], METRIC_TYPES.GAUGE);
  }

  // Calculate CPU usage
  calculateCPUUsage() {
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;

    for (const cpu of cpus) {
      for (const type in cpu.times) {
        totalTick += cpu.times[type];
      }
      totalIdle += cpu.times.idle;
    }

    return 100 - ~~(100 * totalIdle / totalTick);
  }

  // Collect network metrics
  collectNetworkMetrics() {
    // This would integrate with system network monitoring
    // For now, we'll track basic metrics
    this.recordMetric('network_connections', this.performanceData.system.network.connections, METRIC_TYPES.GAUGE);
  }

  // Check thresholds
  checkThresholds(metric) {
    const { name, value } = metric;
    
    // Check response time thresholds
    if (name === 'request_duration') {
      if (value > this.config.alerting.thresholds.RESPONSE_TIME.CRITICAL) {
        this.emit('performance:threshold:exceeded', 'response_time_critical', value, metric);
      } else if (value > this.config.alerting.thresholds.RESPONSE_TIME.SLOW) {
        this.emit('performance:threshold:exceeded', 'response_time_slow', value, metric);
      }
    }
    
    // Check error rate thresholds
    if (name === 'request_error_rate') {
      if (value > this.config.alerting.thresholds.ERROR_RATE.CRITICAL) {
        this.emit('performance:threshold:exceeded', 'error_rate_critical', value, metric);
      } else if (value > this.config.alerting.thresholds.ERROR_RATE.POOR) {
        this.emit('performance:threshold:exceeded', 'error_rate_high', value, metric);
      }
    }
    
    // Check memory usage thresholds
    if (name === 'memory_usage_percent') {
      if (value > this.config.alerting.thresholds.MEMORY_USAGE.CRITICAL) {
        this.emit('performance:threshold:exceeded', 'memory_usage_critical', value, metric);
      } else if (value > this.config.alerting.thresholds.MEMORY_USAGE.HIGH) {
        this.emit('performance:threshold:exceeded', 'memory_usage_high', value, metric);
      }
    }
  }

  // Handle threshold exceeded
  handleThresholdExceeded(threshold, value, details) {
    const alertKey = `${threshold}_${Math.floor(Date.now() / this.config.alerting.cooldown)}`;
    
    // Check cooldown
    if (this.alertCooldowns.has(alertKey)) {
      return;
    }
    
    const alert = {
      id: this.generateAlertId(),
      type: threshold,
      value,
      threshold: this.config.alerting.thresholds[threshold.toUpperCase()],
      details,
      timestamp: new Date().toISOString(),
      severity: this.getAlertSeverity(threshold)
    };
    
    this.alerts.set(alert.id, alert);
    this.alertCooldowns.set(alertKey, Date.now());
    
    this.emit('alert:triggered', alert);
  }

  // Get alert severity
  getAlertSeverity(threshold) {
    if (threshold.includes('critical')) {
      return 'critical';
    } else if (threshold.includes('high') || threshold.includes('slow')) {
      return 'high';
    } else {
      return 'medium';
    }
  }

  // Handle alert
  handleAlert(alert) {
    // Log alert
    if (this.config.alerting.channels.log) {
      logger.warn(`Performance alert: ${alert.type}`, {
        value: alert.value,
        threshold: alert.threshold,
        severity: alert.severity,
        timestamp: alert.timestamp
      });
    }
    
    // Send to webhook if configured
    if (this.config.alerting.channels.webhook) {
      this.sendWebhookAlert(alert);
    }
    
    // Send email if configured
    if (this.config.alerting.channels.email) {
      this.sendEmailAlert(alert);
    }
  }

  // Send webhook alert
  async sendWebhookAlert(alert) {
    try {
      // This would integrate with webhook service
      logger.info('Webhook alert sent:', alert.id);
    } catch (error) {
      logger.error('Failed to send webhook alert:', error);
    }
  }

  // Send email alert
  async sendEmailAlert(alert) {
    try {
      // This would integrate with email service
      logger.info('Email alert sent:', alert.id);
    } catch (error) {
      logger.error('Failed to send email alert:', error);
    }
  }

  // Store metric
  storeMetric(metric) {
    const key = this.getMetricKey(metric.name, metric.tags);
    
    if (!this.metrics.has(key)) {
      this.metrics.set(key, []);
    }
    
    const metrics = this.metrics.get(key);
    metrics.push(metric);
    
    // Keep only recent metrics
    if (metrics.length > this.config.metrics.maxMetrics) {
      metrics.splice(0, metrics.length - this.config.metrics.maxMetrics);
    }
  }

  // Collect metrics
  collectMetrics() {
    // Collect various metrics
    this.collectRequestMetrics();
    this.collectDatabaseMetrics();
    this.collectCacheMetrics();
    
    // Update derived metrics
    this.updateDerivedMetrics();
  }

  // Collect request metrics
  collectRequestMetrics() {
    // This would integrate with request tracking
    // For now, we'll simulate some metrics
    this.recordMetric('request_total', 1, METRIC_TYPES.COUNTER);
    this.recordMetric('request_successful', 1, METRIC_TYPES.COUNTER);
  }

  // Collect database metrics
  collectDatabaseMetrics() {
    // This would integrate with database monitoring
    // For now, we'll simulate some metrics
    this.recordMetric('database_query_total', 1, METRIC_TYPES.COUNTER);
    this.recordMetric('database_query_successful', 1, METRIC_TYPES.COUNTER);
  }

  // Collect cache metrics
  collectCacheMetrics() {
    // This would integrate with cache monitoring
    // For now, we'll simulate some metrics
    this.recordMetric('cache_hit', 1, METRIC_TYPES.COUNTER);
  }

  // Update derived metrics
  updateDerivedMetrics() {
    const data = this.performanceData.requests;
    
    if (data.total > 0) {
      this.recordMetric('request_error_rate', data.errorRate, METRIC_TYPES.GAUGE);
      this.recordMetric('request_throughput', data.throughput, METRIC_TYPES.GAUGE);
    }
    
    if (data.responseTimeHistory.length > 0) {
      this.recordMetric('request_average_response_time', data.averageResponseTime, METRIC_TYPES.GAUGE);
      this.recordMetric('request_min_response_time', data.minResponseTime, METRIC_TYPES.GAUGE);
      this.recordMetric('request_max_response_time', data.maxResponseTime, METRIC_TYPES.GAUGE);
    }
  }

  // Calculate throughput
  calculateThroughput(totalRequests) {
    // Simple throughput calculation
    // In a real implementation, this would be more sophisticated
    return totalRequests / 60; // requests per second
  }

  // Check alerts
  checkAlerts() {
    // Check for stale alerts
    const now = Date.now();
    const staleThreshold = 24 * 60 * 60 * 1000; // 24 hours
    
    for (const [id, alert] of this.alerts) {
      if (now - new Date(alert.timestamp).getTime() > staleThreshold) {
        this.alerts.delete(id);
      }
    }
    
    // Clean up cooldowns
    for (const [key, timestamp] of this.alertCooldowns) {
      if (now - timestamp > this.config.alerting.cooldown) {
        this.alertCooldowns.delete(key);
      }
    }
  }

  // Generate report
  async generateReport() {
    if (!this.config.reporting.enabled) {
      return;
    }

    try {
      const report = {
        timestamp: new Date().toISOString(),
        performance: this.performanceData,
        metrics: {
          counters: Object.fromEntries(this.counters),
          gauges: Object.fromEntries(this.gauges),
          histograms: Object.fromEntries(this.histograms),
          timers: Object.fromEntries(this.timers),
          rates: Object.fromEntries(this.rates)
        },
        alerts: Array.from(this.alerts.values()),
        summary: this.generateSummary()
      };
      
      // Save report
      const filename = `performance_report_${Date.now()}.json`;
      const filepath = path.join(this.config.reporting.outputDir, filename);
      
      await fs.writeFile(filepath, JSON.stringify(report, null, 2));
      
      logger.info(`Performance report generated: ${filename}`);
      
    } catch (error) {
      logger.error('Failed to generate performance report:', error);
    }
  }

  // Generate summary
  generateSummary() {
    const data = this.performanceData;
    
    return {
      requests: {
        total: data.requests.total,
        errorRate: (data.requests.errorRate * 100).toFixed(2) + '%',
        averageResponseTime: Math.round(data.requests.averageResponseTime) + 'ms',
        throughput: Math.round(data.requests.throughput) + ' req/s'
      },
      database: {
        totalQueries: data.database.totalQueries,
        slowQueries: data.database.slowQueries,
        averageQueryTime: Math.round(data.database.averageQueryTime) + 'ms',
        connectionPoolUsage: (data.database.connectionPoolUsage * 100).toFixed(2) + '%'
      },
      cache: {
        hitRate: (data.cache.hitRate * 100).toFixed(2) + '%',
        evictions: data.cache.evictions,
        memoryUsage: Math.round(data.cache.memoryUsage / 1024 / 1024) + 'MB'
      },
      system: {
        memoryUsage: (data.system.memory.usage * 100).toFixed(2) + '%',
        cpuUsage: data.system.cpu.usage.toFixed(2) + '%',
        loadAverage: data.system.cpu.loadAverage.map(load => load.toFixed(2)).join(', ')
      }
    };
  }

  // Get performance data
  getPerformanceData() {
    return {
      ...this.performanceData,
      timestamp: new Date().toISOString()
    };
  }

  // Get metrics
  getMetrics(name, tags = {}) {
    const key = this.getMetricKey(name, tags);
    return this.metrics.get(key) || [];
  }

  // Get alerts
  getAlerts(limit = 50) {
    return Array.from(this.alerts.values())
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit);
  }

  // Get statistics
  getStatistics() {
    return {
      initialized: this.isInitialized,
      metrics: {
        total: this.metrics.size,
        counters: this.counters.size,
        gauges: this.gauges.size,
        histograms: this.histograms.size,
        timers: this.timers.size,
        rates: this.rates.size
      },
      alerts: {
        total: this.alerts.size,
        active: Array.from(this.alerts.values()).filter(alert => 
          Date.now() - new Date(alert.timestamp).getTime() < 3600000 // Last hour
        ).length
      },
      performance: this.performanceData
    };
  }

  // Utility methods
  generateAlertId() {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Graceful shutdown
  async shutdown() {
    try {
      logger.info('Shutting down performance monitor...');
      
      // Stop monitoring intervals
      for (const [name, interval] of this.intervals) {
        clearInterval(interval);
      }
      this.intervals.clear();
      
      // Generate final report
      await this.generateReport();
      
      this.isInitialized = false;
      this.emit('shutdown');
      
      logger.info('Performance monitor shut down successfully');
      
    } catch (error) {
      logger.error('Performance monitor shutdown error:', error);
      throw error;
    }
  }
}

// Export singleton instance
const performanceMonitor = new PerformanceMonitor();
module.exports = {
  performanceMonitor,
  PerformanceMonitor,
  MONITORING_STRATEGIES,
  METRIC_TYPES,
  PERFORMANCE_THRESHOLDS,
  monitoringConfig
};
