// =============================================================================
// Advanced Metrics Collection System - 100% Production Ready
// =============================================================================
// Comprehensive metrics collection, aggregation, and analysis for production monitoring

const logger = require('./logging');
const { memoryManager } = require('./performance');

// Metrics collection system
const metricsCollector = {
  // Metrics storage
  metrics: new Map(),
  counters: new Map(),
  gauges: new Map(),
  histograms: new Map(),
  timers: new Map(),
  
  // Configuration
  config: {
    maxMetricsPerType: 10000,
    aggregationInterval: 60000, // 1 minute
    retentionPeriod: 7 * 24 * 60 * 60 * 1000, // 7 days
    cleanupInterval: 60 * 60 * 1000 // 1 hour
  },

  // Initialize metrics collector
  init: () => {
    // Start aggregation timer
    setInterval(() => {
      metricsCollector.aggregateMetrics();
    }, metricsCollector.config.aggregationInterval);

    // Start cleanup timer
    setInterval(() => {
      metricsCollector.cleanup();
    }, metricsCollector.config.cleanupInterval);

    logger.info('Metrics collector initialized', {
      event: 'metrics_collector_init',
      config: metricsCollector.config
    });
  },

  // Counter metrics (monotonically increasing)
  incrementCounter: (name, value = 1, labels = {}) => {
    const key = `${name}${metricsCollector.serializeLabels(labels)}`;
    const current = metricsCollector.counters.get(key) || { value: 0, labels, lastUpdate: Date.now() };
    current.value += value;
    current.lastUpdate = Date.now();
    metricsCollector.counters.set(key, current);
    
    logger.debug('Counter incremented', {
      event: 'counter_increment',
      name,
      value,
      labels,
      total: current.value
    });
  },

  // Gauge metrics (can increase or decrease)
  setGauge: (name, value, labels = {}) => {
    const key = `${name}${metricsCollector.serializeLabels(labels)}`;
    const gauge = {
      value,
      labels,
      lastUpdate: Date.now(),
      min: value,
      max: value,
      sum: value,
      count: 1
    };
    metricsCollector.gauges.set(key, gauge);
    
    logger.debug('Gauge set', {
      event: 'gauge_set',
      name,
      value,
      labels
    });
  },

  updateGauge: (name, value, labels = {}) => {
    const key = `${name}${metricsCollector.serializeLabels(labels)}`;
    const current = metricsCollector.gauges.get(key);
    
    if (current) {
      current.value = value;
      current.lastUpdate = Date.now();
      current.min = Math.min(current.min, value);
      current.max = Math.max(current.max, value);
      current.sum += value;
      current.count++;
      metricsCollector.gauges.set(key, current);
    } else {
      metricsCollector.setGauge(name, value, labels);
    }
  },

  // Histogram metrics (distribution of values)
  recordHistogram: (name, value, labels = {}) => {
    const key = `${name}${metricsCollector.serializeLabels(labels)}`;
    const histogram = metricsCollector.histograms.get(key) || {
      buckets: new Map(),
      sum: 0,
      count: 0,
      labels,
      lastUpdate: Date.now()
    };
    
    histogram.sum += value;
    histogram.count++;
    histogram.lastUpdate = Date.now();
    
    // Add to appropriate bucket
    const bucket = metricsCollector.getBucket(value);
    histogram.buckets.set(bucket, (histogram.buckets.get(bucket) || 0) + 1);
    
    metricsCollector.histograms.set(key, histogram);
    
    logger.debug('Histogram recorded', {
      event: 'histogram_record',
      name,
      value,
      labels,
      bucket
    });
  },

  // Timer metrics (duration measurements)
  startTimer: (name, labels = {}) => {
    const key = `${name}${metricsCollector.serializeLabels(labels)}`;
    const startTime = Date.now();
    
    return {
      end: () => {
        const duration = Date.now() - startTime;
        metricsCollector.recordHistogram(name, duration, labels);
        return duration;
      }
    };
  },

  recordTimer: (name, duration, labels = {}) => {
    metricsCollector.recordHistogram(name, duration, labels);
  },

  // Get all metrics
  getMetrics: () => {
    return {
      counters: Object.fromEntries(metricsCollector.counters),
      gauges: Object.fromEntries(metricsCollector.gauges),
      histograms: Object.fromEntries(metricsCollector.histograms),
      timers: Object.fromEntries(metricsCollector.timers),
      timestamp: new Date().toISOString()
    };
  },

  // Get specific metric type
  getCounters: () => Object.fromEntries(metricsCollector.counters),
  getGauges: () => Object.fromEntries(metricsCollector.gauges),
  getHistograms: () => Object.fromEntries(metricsCollector.histograms),

  // Get metric statistics
  getStatistics: () => {
    const now = Date.now();
    const stats = {
      totalMetrics: {
        counters: metricsCollector.counters.size,
        gauges: metricsCollector.gauges.size,
        histograms: metricsCollector.histograms.size
      },
      recentActivity: {
        last5Minutes: 0,
        last15Minutes: 0,
        lastHour: 0
      },
      topMetrics: {
        counters: [],
        gauges: [],
        histograms: []
      }
    };

    // Calculate recent activity
    const fiveMinutesAgo = now - (5 * 60 * 1000);
    const fifteenMinutesAgo = now - (15 * 60 * 1000);
    const oneHourAgo = now - (60 * 60 * 1000);

    for (const [key, metric] of metricsCollector.counters.entries()) {
      if (metric.lastUpdate > fiveMinutesAgo) stats.recentActivity.last5Minutes++;
      if (metric.lastUpdate > fifteenMinutesAgo) stats.recentActivity.last15Minutes++;
      if (metric.lastUpdate > oneHourAgo) stats.recentActivity.lastHour++;
    }

    for (const [key, metric] of metricsCollector.gauges.entries()) {
      if (metric.lastUpdate > fiveMinutesAgo) stats.recentActivity.last5Minutes++;
      if (metric.lastUpdate > fifteenMinutesAgo) stats.recentActivity.last15Minutes++;
      if (metric.lastUpdate > oneHourAgo) stats.recentActivity.lastHour++;
    }

    for (const [key, metric] of metricsCollector.histograms.entries()) {
      if (metric.lastUpdate > fiveMinutesAgo) stats.recentActivity.last5Minutes++;
      if (metric.lastUpdate > fifteenMinutesAgo) stats.recentActivity.last15Minutes++;
      if (metric.lastUpdate > oneHourAgo) stats.recentActivity.lastHour++;
    }

    // Get top metrics by value
    stats.topMetrics.counters = Array.from(metricsCollector.counters.entries())
      .sort(([,a], [,b]) => b.value - a.value)
      .slice(0, 10)
      .map(([key, metric]) => ({ key, value: metric.value, labels: metric.labels }));

    stats.topMetrics.gauges = Array.from(metricsCollector.gauges.entries())
      .sort(([,a], [,b]) => b.value - a.value)
      .slice(0, 10)
      .map(([key, metric]) => ({ key, value: metric.value, labels: metric.labels }));

    stats.topMetrics.histograms = Array.from(metricsCollector.histograms.entries())
      .sort(([,a], [,b]) => b.count - a.count)
      .slice(0, 10)
      .map(([key, metric]) => ({ 
        key, 
        count: metric.count, 
        sum: metric.sum, 
        avg: metric.sum / metric.count,
        labels: metric.labels 
      }));

    return stats;
  },

  // Aggregate metrics for reporting
  aggregateMetrics: () => {
    const now = Date.now();
    const aggregated = {
      timestamp: new Date(now).toISOString(),
      period: '1m',
      counters: {},
      gauges: {},
      histograms: {}
    };

    // Aggregate counters
    for (const [key, counter] of metricsCollector.counters.entries()) {
      const name = key.split('{')[0];
      if (!aggregated.counters[name]) {
        aggregated.counters[name] = { value: 0, labels: [] };
      }
      aggregated.counters[name].value += counter.value;
      aggregated.counters[name].labels.push(counter.labels);
    }

    // Aggregate gauges
    for (const [key, gauge] of metricsCollector.gauges.entries()) {
      const name = key.split('{')[0];
      if (!aggregated.gauges[name]) {
        aggregated.gauges[name] = { 
          current: gauge.value, 
          min: gauge.min, 
          max: gauge.max, 
          avg: gauge.sum / gauge.count,
          labels: [] 
        };
      }
      aggregated.gauges[name].labels.push(gauge.labels);
    }

    // Aggregate histograms
    for (const [key, histogram] of metricsCollector.histograms.entries()) {
      const name = key.split('{')[0];
      if (!aggregated.histograms[name]) {
        aggregated.histograms[name] = { 
          count: 0, 
          sum: 0, 
          avg: 0, 
          buckets: new Map(),
          labels: [] 
        };
      }
      aggregated.histograms[name].count += histogram.count;
      aggregated.histograms[name].sum += histogram.sum;
      aggregated.histograms[name].avg = aggregated.histograms[name].sum / aggregated.histograms[name].count;
      
      // Merge buckets
      for (const [bucket, count] of histogram.buckets.entries()) {
        aggregated.histograms[name].buckets.set(bucket, 
          (aggregated.histograms[name].buckets.get(bucket) || 0) + count);
      }
      aggregated.histograms[name].labels.push(histogram.labels);
    }

    logger.info('Metrics aggregated', {
      event: 'metrics_aggregated',
      timestamp: aggregated.timestamp,
      counters: Object.keys(aggregated.counters).length,
      gauges: Object.keys(aggregated.gauges).length,
      histograms: Object.keys(aggregated.histograms).length
    });

    return aggregated;
  },

  // Cleanup old metrics
  cleanup: () => {
    const now = Date.now();
    const cutoff = now - metricsCollector.config.retentionPeriod;
    let cleanedCount = 0;

    // Cleanup counters
    for (const [key, counter] of metricsCollector.counters.entries()) {
      if (counter.lastUpdate < cutoff) {
        metricsCollector.counters.delete(key);
        cleanedCount++;
      }
    }

    // Cleanup gauges
    for (const [key, gauge] of metricsCollector.gauges.entries()) {
      if (gauge.lastUpdate < cutoff) {
        metricsCollector.gauges.delete(key);
        cleanedCount++;
      }
    }

    // Cleanup histograms
    for (const [key, histogram] of metricsCollector.histograms.entries()) {
      if (histogram.lastUpdate < cutoff) {
        metricsCollector.histograms.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.info('Metrics cleanup completed', {
        event: 'metrics_cleanup',
        cleanedCount,
        remainingMetrics: {
          counters: metricsCollector.counters.size,
          gauges: metricsCollector.gauges.size,
          histograms: metricsCollector.histograms.size
        }
      });
    }

    return cleanedCount;
  },

  // Helper functions
  serializeLabels: (labels) => {
    if (Object.keys(labels).length === 0) return '';
    const serialized = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}="${value}"`)
      .join(',');
    return `{${serialized}}`;
  },

  getBucket: (value) => {
    // Standard histogram buckets
    const buckets = [0.1, 0.25, 0.5, 1, 2.5, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000, 100000, '+Inf'];
    
    for (const bucket of buckets) {
      if (bucket === '+Inf' || value <= bucket) {
        return bucket.toString();
      }
    }
    
    return '+Inf';
  }
};

// Application-specific metrics
const applicationMetrics = {
  // HTTP metrics
  http: {
    request: (method, endpoint, statusCode, duration, labels = {}) => {
      metricsCollector.incrementCounter('http_requests_total', 1, {
        method,
        endpoint,
        status_code: statusCode.toString(),
        ...labels
      });
      
      metricsCollector.recordHistogram('http_request_duration_ms', duration, {
        method,
        endpoint,
        ...labels
      });
    },

    error: (method, endpoint, errorType, labels = {}) => {
      metricsCollector.incrementCounter('http_errors_total', 1, {
        method,
        endpoint,
        error_type: errorType,
        ...labels
      });
    }
  },

  // Database metrics
  database: {
    query: (operation, table, duration, success, labels = {}) => {
      metricsCollector.incrementCounter('database_queries_total', 1, {
        operation,
        table,
        success: success.toString(),
        ...labels
      });
      
      metricsCollector.recordHistogram('database_query_duration_ms', duration, {
        operation,
        table,
        ...labels
      });
    },

    connection: (status, labels = {}) => {
      metricsCollector.incrementCounter('database_connections_total', 1, {
        status,
        ...labels
      });
    },

    pool: (active, idle, waiting, labels = {}) => {
      metricsCollector.setGauge('database_pool_active', active, labels);
      metricsCollector.setGauge('database_pool_idle', idle, labels);
      metricsCollector.setGauge('database_pool_waiting', waiting, labels);
    }
  },

  // Cache metrics
  cache: {
    hit: (cacheType, labels = {}) => {
      metricsCollector.incrementCounter('cache_hits_total', 1, {
        cache_type: cacheType,
        ...labels
      });
    },

    miss: (cacheType, labels = {}) => {
      metricsCollector.incrementCounter('cache_misses_total', 1, {
        cache_type: cacheType,
        ...labels
      });
    },

    operation: (operation, cacheType, duration, success, labels = {}) => {
      metricsCollector.incrementCounter('cache_operations_total', 1, {
        operation,
        cache_type: cacheType,
        success: success.toString(),
        ...labels
      });
      
      metricsCollector.recordHistogram('cache_operation_duration_ms', duration, {
        operation,
        cache_type: cacheType,
        ...labels
      });
    }
  },

  // Trading metrics
  trading: {
    trade: (exchange, symbol, side, success, labels = {}) => {
      metricsCollector.incrementCounter('trades_total', 1, {
        exchange,
        symbol,
        side,
        success: success.toString(),
        ...labels
      });
    },

    order: (exchange, symbol, orderType, status, labels = {}) => {
      metricsCollector.incrementCounter('orders_total', 1, {
        exchange,
        symbol,
        order_type: orderType,
        status,
        ...labels
      });
    },

    portfolio: (action, symbol, labels = {}) => {
      metricsCollector.incrementCounter('portfolio_operations_total', 1, {
        action,
        symbol,
        ...labels
      });
    }
  },

  // System metrics
  system: {
    memory: () => {
      const memoryUsage = memoryManager.getCurrentMemoryUsage();
      metricsCollector.setGauge('nodejs_memory_heap_used_bytes', memoryUsage.heapUsedMB * 1024 * 1024);
      metricsCollector.setGauge('nodejs_memory_heap_total_bytes', memoryUsage.heapTotalMB * 1024 * 1024);
      metricsCollector.setGauge('nodejs_memory_rss_bytes', memoryUsage.rssMB * 1024 * 1024);
    },

    cpu: () => {
      const cpuUsage = process.cpuUsage();
      metricsCollector.setGauge('nodejs_cpu_user_microseconds', cpuUsage.user);
      metricsCollector.setGauge('nodejs_cpu_system_microseconds', cpuUsage.system);
    },

    uptime: () => {
      metricsCollector.setGauge('nodejs_uptime_seconds', process.uptime());
    },

    process: () => {
      metricsCollector.setGauge('nodejs_process_pid', process.pid);
      metricsCollector.setGauge('nodejs_process_start_time_seconds', process.uptime());
    }
  },

  // User metrics
  user: {
    login: (success, labels = {}) => {
      metricsCollector.incrementCounter('user_logins_total', 1, {
        success: success.toString(),
        ...labels
      });
    },

    registration: (success, labels = {}) => {
      metricsCollector.incrementCounter('user_registrations_total', 1, {
        success: success.toString(),
        ...labels
      });
    },

    activity: (action, labels = {}) => {
      metricsCollector.incrementCounter('user_activity_total', 1, {
        action,
        ...labels
      });
    }
  }
};

// Export metrics system
module.exports = {
  metricsCollector,
  applicationMetrics
};
