// =============================================================================
// Circuit Breaker Pattern Implementation - Production Ready
// =============================================================================
// Circuit breaker for external API calls with exponential backoff and health monitoring

const EventEmitter = require('events');
const logger = require('./logging');
const { performanceMetrics } = require('./tracing');

// Circuit breaker states
const CIRCUIT_STATES = {
  CLOSED: 'CLOSED', // Normal operation
  OPEN: 'OPEN', // Circuit is open, failing fast
  HALF_OPEN: 'HALF_OPEN' // Testing if service is back
};

// Circuit breaker configuration
const DEFAULT_CONFIG = {
  failureThreshold: 5, // Number of failures before opening
  resetTimeout: 60000, // Time to wait before trying again (ms)
  monitoringPeriod: 10000, // Time window for failure counting (ms)
  successThreshold: 3, // Successes needed to close circuit
  timeout: 30000, // Request timeout (ms)
  volumeThreshold: 10, // Minimum requests before circuit can open
  errorFilter: (error) => { // Which errors should count as failures
    return error.code === 'ECONNREFUSED' ||
           error.code === 'ETIMEDOUT' ||
           error.status >= 500;
  }
};

// Circuit breaker class
class CircuitBreaker extends EventEmitter {
  constructor(name, options = {}) {
    super();
    this.name = name;
    this.config = { ...DEFAULT_CONFIG, ...options };
    this.state = CIRCUIT_STATES.CLOSED;
    this.failures = [];
    this.successes = 0;
    this.lastFailureTime = null;
    this.nextAttemptTime = null;

    // Statistics
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      circuitOpened: 0,
      circuitClosed: 0,
      timeouts: 0
    };

    // Start monitoring
    this.startMonitoring();

    logger.info(`Circuit breaker '${name}' initialized`, {
      config: this.config,
      state: this.state
    });
  }

  // Execute function with circuit breaker protection
  async execute(fn, context = {}) {
    this.stats.totalRequests++;

    // Check if circuit is open and should fail fast
    if (this.state === CIRCUIT_STATES.OPEN) {
      if (Date.now() < this.nextAttemptTime) {
        this.stats.failedRequests++;
        this.emit('circuitOpen', { name: this.name, context });
        performanceMetrics.counter('circuit_breaker.rejected', 1, { name: this.name });

        throw new Error(`Circuit breaker '${this.name}' is OPEN. Request rejected.`);
      } else {
        // Move to half-open state
        this.setState(CIRCUIT_STATES.HALF_OPEN);
      }
    }

    // Check if we have enough volume for circuit to be meaningful
    if (this.stats.totalRequests < this.config.volumeThreshold) {
      return this.executeRequest(fn, context);
    }

    // Execute with timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Circuit breaker '${this.name}' request timeout`));
      }, this.config.timeout);
    });

    try {
      const result = await Promise.race([
        this.executeRequest(fn, context),
        timeoutPromise
      ]);

      this.onSuccess();
      return result;
    } catch (error) {
      this.stats.timeouts++;
      this.onFailure(error, context);
      throw error;
    }
  }

  // Execute the actual request
  async executeRequest(fn, _context) {
    const startTime = Date.now();

    try {
      const result = await fn();
      const duration = Date.now() - startTime;

      performanceMetrics.timer('circuit_breaker.request_duration', duration, {
        name: this.name,
        success: true
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      performanceMetrics.timer('circuit_breaker.request_duration', duration, {
        name: this.name,
        success: false,
        error: error.message
      });

      throw error;
    }
  }

  // Handle successful request
  onSuccess() {
    this.stats.successfulRequests++;

    if (this.state === CIRCUIT_STATES.HALF_OPEN) {
      this.successes++;

      if (this.successes >= this.config.successThreshold) {
        this.setState(CIRCUIT_STATES.CLOSED);
        this.emit('circuitClosed', { name: this.name });
        performanceMetrics.counter('circuit_breaker.closed', 1, { name: this.name });
      }
    }

    this.emit('success', { name: this.name });
  }

  // Handle failed request
  onFailure(error, context = {}) {
    this.stats.failedRequests++;
    this.lastFailureTime = Date.now();

    // Only count errors that match our filter
    if (this.config.errorFilter(error)) {
      this.failures.push({
        timestamp: Date.now(),
        error: error.message,
        context
      });

      this.emit('failure', { name: this.name, error: error.message, context });
    }

    if (this.state === CIRCUIT_STATES.HALF_OPEN) {
      // If we're in half-open and get a failure, immediately open
      this.setState(CIRCUIT_STATES.OPEN);
      this.emit('circuitOpened', { name: this.name, reason: 'failure_in_half_open' });
      performanceMetrics.counter('circuit_breaker.opened', 1, { name: this.name });
    }
  }

  // Set circuit breaker state
  setState(newState) {
    const oldState = this.state;
    this.state = newState;

    if (newState === CIRCUIT_STATES.OPEN) {
      this.stats.circuitOpened++;
      this.nextAttemptTime = Date.now() + this.config.resetTimeout;
      this.successes = 0;

      logger.warn(`Circuit breaker '${this.name}' opened`, {
        oldState,
        newState,
        nextAttemptTime: new Date(this.nextAttemptTime).toISOString(),
        failures: this.failures.length
      });
    } else if (newState === CIRCUIT_STATES.CLOSED) {
      this.stats.circuitClosed++;
      this.failures = [];
      this.successes = 0;
      this.nextAttemptTime = null;

      logger.info(`Circuit breaker '${this.name}' closed`, {
        oldState,
        newState,
        stats: this.stats
      });
    } else if (newState === CIRCUIT_STATES.HALF_OPEN) {
      this.successes = 0;

      logger.info(`Circuit breaker '${this.name}' moved to half-open`, {
        oldState,
        newState
      });
    }

    this.emit('stateChange', {
      name: this.name,
      oldState,
      newState,
      timestamp: new Date().toISOString()
    });
  }

  // Start monitoring circuit breaker state
  startMonitoring() {
    setInterval(() => {
      this.cleanupOldFailures();

      if (this.state === CIRCUIT_STATES.CLOSED && this.shouldOpen()) {
        this.setState(CIRCUIT_STATES.OPEN);
        this.emit('circuitOpened', { name: this.name, reason: 'failure_threshold' });
        performanceMetrics.counter('circuit_breaker.opened', 1, { name: this.name });
      }
    }, this.config.monitoringPeriod);
  }

  // Check if circuit should open
  shouldOpen() {
    if (this.failures.length < this.config.failureThreshold) {
      return false;
    }

    // Check if failures are within the monitoring period
    const cutoffTime = Date.now() - this.config.monitoringPeriod;
    const recentFailures = this.failures.filter(f => f.timestamp > cutoffTime);

    return recentFailures.length >= this.config.failureThreshold;
  }

  // Clean up old failures
  cleanupOldFailures() {
    const cutoffTime = Date.now() - (this.config.monitoringPeriod * 2);
    this.failures = this.failures.filter(f => f.timestamp > cutoffTime);
  }

  // Get circuit breaker status
  getStatus() {
    return {
      name: this.name,
      state: this.state,
      stats: this.stats,
      failures: this.failures.length,
      successes: this.successes,
      lastFailureTime: this.lastFailureTime,
      nextAttemptTime: this.nextAttemptTime,
      config: this.config
    };
  }

  // Reset circuit breaker
  reset() {
    this.setState(CIRCUIT_STATES.CLOSED);
    this.failures = [];
    this.successes = 0;
    this.lastFailureTime = null;
    this.nextAttemptTime = null;

    logger.info(`Circuit breaker '${this.name}' manually reset`);
    this.emit('reset', { name: this.name });
  }
}

// Circuit breaker manager for multiple services
class CircuitBreakerManager {
  constructor() {
    this.breakers = new Map();
    this.defaultConfig = DEFAULT_CONFIG;
  }

  // Create or get circuit breaker
  getBreaker(name, config = {}) {
    if (!this.breakers.has(name)) {
      const breaker = new CircuitBreaker(name, { ...this.defaultConfig, ...config });
      this.breakers.set(name, breaker);

      // Set up event listeners
      breaker.on('circuitOpened', (data) => {
        logger.warn('Circuit breaker opened', data);
        performanceMetrics.counter('circuit_breaker.manager.opened', 1, { name: data.name });
      });

      breaker.on('circuitClosed', (data) => {
        logger.info('Circuit breaker closed', data);
        performanceMetrics.counter('circuit_breaker.manager.closed', 1, { name: data.name });
      });
    }

    return this.breakers.get(name);
  }

  // Execute with circuit breaker
  async execute(name, fn, config = {}, context = {}) {
    const breaker = this.getBreaker(name, config);
    return breaker.execute(fn, context);
  }

  // Get all circuit breaker statuses
  getStatuses() {
    const statuses = {};
    for (const [name, breaker] of this.breakers) {
      statuses[name] = breaker.getStatus();
    }
    return statuses;
  }

  // Reset all circuit breakers
  resetAll() {
    for (const [_name, breaker] of this.breakers) {
      breaker.reset();
    }
  }

  // Reset specific circuit breaker
  reset(name) {
    const breaker = this.breakers.get(name);
    if (breaker) {
      breaker.reset();
    }
  }

  // Get health status
  getHealth() {
    const statuses = this.getStatuses();
    const openBreakers = Object.values(statuses).filter(s => s.state === CIRCUIT_STATES.OPEN);

    return {
      healthy: openBreakers.length === 0,
      totalBreakers: Object.keys(statuses).length,
      openBreakers: openBreakers.length,
      statuses
    };
  }
}

// Global circuit breaker manager instance
const circuitBreakerManager = new CircuitBreakerManager();

// Pre-configured circuit breakers for common services
const exchangeBreakers = {
  binance: circuitBreakerManager.getBreaker('binance-api', {
    failureThreshold: 3,
    resetTimeout: 30000,
    timeout: 15000
  }),

  wazirx: circuitBreakerManager.getBreaker('wazirx-api', {
    failureThreshold: 3,
    resetTimeout: 30000,
    timeout: 15000
  }),

  coindcx: circuitBreakerManager.getBreaker('coindcx-api', {
    failureThreshold: 3,
    resetTimeout: 30000,
    timeout: 15000
  }),

  coinbase: circuitBreakerManager.getBreaker('coinbase-api', {
    failureThreshold: 3,
    resetTimeout: 30000,
    timeout: 15000
  })
};

// Database circuit breaker
const databaseBreaker = circuitBreakerManager.getBreaker('database', {
  failureThreshold: 5,
  resetTimeout: 60000,
  timeout: 30000,
  errorFilter: (error) => {
    return error.code === 'ECONNREFUSED' ||
           error.code === 'ETIMEDOUT' ||
           error.message.includes('timeout') ||
           error.message.includes('connection');
  }
});

// External API circuit breaker
const externalApiBreaker = circuitBreakerManager.getBreaker('external-api', {
  failureThreshold: 3,
  resetTimeout: 45000,
  timeout: 20000,
  errorFilter: (error) => {
    return error.code === 'ECONNREFUSED' ||
           error.code === 'ETIMEDOUT' ||
           error.status >= 500 ||
           error.status === 429; // Rate limited
  }
});

// Express middleware for circuit breaker monitoring
const circuitBreakerMiddleware = (req, res, next) => {
  const health = circuitBreakerManager.getHealth();

  res.setHeader('X-Circuit-Breaker-Status', JSON.stringify({
    healthy: health.healthy,
    openBreakers: health.openBreakers,
    totalBreakers: health.totalBreakers
  }));

  next();
};

// Export circuit breaker utilities
module.exports = {
  CircuitBreaker,
  CircuitBreakerManager,
  circuitBreakerManager,
  exchangeBreakers,
  databaseBreaker,
  externalApiBreaker,
  circuitBreakerMiddleware,
  CIRCUIT_STATES,
  DEFAULT_CONFIG
};
