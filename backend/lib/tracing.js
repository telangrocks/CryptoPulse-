// =============================================================================
// Distributed Tracing & Observability - Production Ready
// =============================================================================
// OpenTelemetry-based distributed tracing for microservices observability

const { trace, context, SpanStatusCode, SpanKind } = require('@opentelemetry/api');
const { NodeTracerProvider } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { Resource } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');
const { JaegerExporter } = require('@opentelemetry/exporter-jaeger');
const { ZipkinExporter } = require('@opentelemetry/exporter-zipkin');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-otlp-http');
const { registerInstrumentations } = require('@opentelemetry/instrumentation');
const logger = require('./logging');

// Initialize tracing provider
let tracerProvider = null;
let tracer = null;

// Initialize distributed tracing
const initTracing = () => {
  try {
    // Create resource with service information
    const resource = new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: 'cryptopulse-backend',
      [SemanticResourceAttributes.SERVICE_VERSION]: '2.0.0',
      [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development',
      [SemanticResourceAttributes.HOST_NAME]: require('os').hostname(),
      [SemanticResourceAttributes.PROCESS_PID]: process.pid
    });

    // Create tracer provider
    tracerProvider = new NodeTracerProvider({
      resource
    });

    // Configure exporters based on environment
    const exporters = [];

    // Jaeger exporter (if configured)
    if (process.env.JAEGER_ENDPOINT) {
      exporters.push(new JaegerExporter({
        endpoint: process.env.JAEGER_ENDPOINT,
        serviceName: 'cryptopulse-backend'
      }));
    }

    // Zipkin exporter (if configured)
    if (process.env.ZIPKIN_ENDPOINT) {
      exporters.push(new ZipkinExporter({
        url: process.env.ZIPKIN_ENDPOINT,
        serviceName: 'cryptopulse-backend'
      }));
    }

    // OTLP exporter (if configured)
    if (process.env.OTLP_ENDPOINT) {
      exporters.push(new OTLPTraceExporter({
        url: process.env.OTLP_ENDPOINT
      }));
    }

    // Register exporters
    if (exporters.length > 0) {
      tracerProvider.addSpanProcessor(
        new (require('@opentelemetry/sdk-trace-base').BatchSpanProcessor)(exporters[0])
      );
    }

    // Register the provider
    tracerProvider.register();

    // Get tracer
    tracer = trace.getTracer('cryptopulse-backend', '2.0.0');

    // Register auto-instrumentations
    registerInstrumentations({
      instrumentations: [
        getNodeAutoInstrumentations({
          '@opentelemetry/instrumentation-fs': {
            enabled: false // Disable file system tracing to reduce noise
          },
          '@opentelemetry/instrumentation-http': {
            enabled: true,
            ignoreIncomingRequestHook: (req) => {
              // Ignore health checks and static assets
              return req.url === '/health' ||
                     req.url === '/health/detailed' ||
                     req.url.startsWith('/assets/') ||
                     req.url.startsWith('/static/');
            }
          },
          '@opentelemetry/instrumentation-express': {
            enabled: true
          },
          '@opentelemetry/instrumentation-pg': {
            enabled: true
          },
          '@opentelemetry/instrumentation-redis': {
            enabled: true
          }
        })
      ]
    });

    logger.info('✅ Distributed tracing initialized successfully');
    return tracer;
  } catch (error) {
    logger.error('❌ Failed to initialize distributed tracing:', error);
    // Return a no-op tracer to prevent crashes
    return trace.getTracer('cryptopulse-backend-noop', '1.0.0');
  }
};

// Create a span for a specific operation
const createSpan = (name, options = {}) => {
  if (!tracer) {
    tracer = trace.getTracer('cryptopulse-backend', '2.0.0');
  }

  return tracer.startSpan(name, {
    kind: options.kind || SpanKind.INTERNAL,
    attributes: {
      'service.name': 'cryptopulse-backend',
      'service.version': '2.0.0',
      ...options.attributes
    }
  });
};

// Trace async operations
const traceAsync = async(spanName, operation, options = {}) => {
  const span = createSpan(spanName, options);

  try {
    const result = await operation(span);
    span.setStatus({ code: SpanStatusCode.OK });
    return result;
  } catch (error) {
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error.message
    });
    span.recordException(error);
    throw error;
  } finally {
    span.end();
  }
};

// Trace database operations
const traceDatabase = async(operation, query, params = []) => {
  return traceAsync(`db.${operation}`, async(span) => {
    span.setAttributes({
      'db.operation': operation,
      'db.statement': query.substring(0, 100) + (query.length > 100 ? '...' : ''),
      'db.parameters.count': params.length
    });

    const start = Date.now();
    try {
      const result = await operation(query, params);
      const duration = Date.now() - start;

      span.setAttributes({
        'db.duration_ms': duration,
        'db.rows_affected': result.rowCount || 0
      });

      return result;
    } catch (error) {
      span.setAttributes({
        'db.error': error.message,
        'db.error_code': error.code
      });
      throw error;
    }
  }, { kind: SpanKind.CLIENT });
};

// Trace HTTP requests
const traceHttpRequest = async(method, url, requestFn, options = {}) => {
  return traceAsync(`http.${method.toLowerCase()}`, async(span) => {
    span.setAttributes({
      'http.method': method,
      'http.url': url,
      'http.scheme': options.scheme || 'https',
      'http.user_agent': options.userAgent
    });

    const start = Date.now();
    try {
      const response = await requestFn();
      const duration = Date.now() - start;

      span.setAttributes({
        'http.status_code': response.status || response.statusCode,
        'http.response_size': response.headers?.['content-length'] || 0,
        'http.duration_ms': duration
      });

      return response;
    } catch (error) {
      span.setAttributes({
        'http.error': error.message,
        'http.error_code': error.code
      });
      throw error;
    }
  }, { kind: SpanKind.CLIENT });
};

// Trace authentication operations
const traceAuth = async(operation, userId, options = {}) => {
  return traceAsync(`auth.${operation}`, async(span) => {
    span.setAttributes({
      'auth.operation': operation,
      'user.id': userId,
      'auth.success': options.success || false,
      'auth.method': options.method || 'unknown'
    });

    if (options.ip) {
      span.setAttributes({
        'user.ip': options.ip
      });
    }

    return await operation();
  }, { kind: SpanKind.INTERNAL });
};

// Trace trading operations
const traceTrading = async(operation, tradeData) => {
  return traceAsync(`trading.${operation}`, async(span) => {
    span.setAttributes({
      'trading.operation': operation,
      'trading.exchange': tradeData.exchange,
      'trading.symbol': tradeData.symbol,
      'trading.side': tradeData.side,
      'trading.amount': tradeData.amount,
      'user.id': tradeData.userId
    });

    const start = Date.now();
    try {
      const result = await operation(tradeData);
      const duration = Date.now() - start;

      span.setAttributes({
        'trading.duration_ms': duration,
        'trading.success': true,
        'trading.order_id': result.orderId || result.id
      });

      return result;
    } catch (error) {
      span.setAttributes({
        'trading.error': error.message,
        'trading.success': false
      });
      throw error;
    }
  }, { kind: SpanKind.INTERNAL });
};

// Add baggage to current context
const addBaggage = (key, value) => {
  const activeSpan = trace.getActiveSpan();
  if (activeSpan) {
    activeSpan.setAttributes({
      [`baggage.${key}`]: value
    });
  }
};

// Get baggage from current context
const getBaggage = (key) => {
  const activeSpan = trace.getActiveSpan();
  if (activeSpan) {
    return activeSpan.attributes[`baggage.${key}`];
  }
  return undefined;
};

// Express middleware for request tracing
const requestTracingMiddleware = (req, res, next) => {
  const span = createSpan(`${req.method} ${req.route?.path || req.path}`, {
    kind: SpanKind.SERVER,
    attributes: {
      'http.method': req.method,
      'http.url': req.url,
      'http.route': req.route?.path || req.path,
      'http.user_agent': req.get('User-Agent'),
      'http.request_id': req.headers['x-request-id'],
      'user.id': req.user?.userId
    }
  });

  // Add request ID to baggage
  if (req.headers['x-request-id']) {
    addBaggage('request_id', req.headers['x-request-id']);
  }

  // Add user ID to baggage
  if (req.user?.userId) {
    addBaggage('user_id', req.user.userId);
  }

  // Set span in context
  context.with(trace.setSpan(context.active(), span), () => {
    req.tracingSpan = span;
    next();
  });

  // End span when response finishes
  res.on('finish', () => {
    span.setAttributes({
      'http.status_code': res.statusCode,
      'http.response_size': res.get('Content-Length') || 0
    });

    if (res.statusCode >= 400) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: `HTTP ${res.statusCode}`
      });
    }

    span.end();
  });
};

// Performance metrics integration
const performanceMetrics = {
  // Track custom metrics
  counter: (name, value = 1, labels = {}) => {
    const span = trace.getActiveSpan();
    if (span) {
      span.setAttributes({
        [`metric.${name}`]: value,
        ...Object.entries(labels).reduce((acc, [k, v]) => {
          acc[`metric.${name}.${k}`] = v;
          return acc;
        }, {})
      });
    }
  },

  // Track timing
  timer: (name, duration, labels = {}) => {
    const span = trace.getActiveSpan();
    if (span) {
      span.setAttributes({
        [`timer.${name}`]: duration,
        ...Object.entries(labels).reduce((acc, [k, v]) => {
          acc[`timer.${name}.${k}`] = v;
          return acc;
        }, {})
      });
    }
  },

  // Track gauge values
  gauge: (name, value, labels = {}) => {
    const span = trace.getActiveSpan();
    if (span) {
      span.setAttributes({
        [`gauge.${name}`]: value,
        ...Object.entries(labels).reduce((acc, [k, v]) => {
          acc[`gauge.${name}.${k}`] = v;
          return acc;
        }, {})
      });
    }
  }
};

// Export tracing utilities
module.exports = {
  initTracing,
  createSpan,
  traceAsync,
  traceDatabase,
  traceHttpRequest,
  traceAuth,
  traceTrading,
  addBaggage,
  getBaggage,
  requestTracingMiddleware,
  performanceMetrics,
  tracer: () => tracer
};
