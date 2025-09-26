// Health Check Module for CryptoPulse Cloud Functions
const winston = require('winston');

// Configure logger for health check
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

// Health data storage
let healthData = {
  status: 'healthy',
  uptime: process.uptime(),
  memory: process.memoryUsage(),
  services: {
    database: 'healthy',
    api: 'healthy',
    cache: 'healthy',
    monitoring: 'healthy'
  },
  lastUpdate: new Date(),
  requestCount: 0,
  errorCount: 0,
  averageResponseTime: 0
};

// Update health data
function updateHealthData() {
  try {
    healthData.uptime = process.uptime();
    healthData.memory = process.memoryUsage();
    healthData.lastUpdate = new Date();
    
    // Check memory usage
    const memoryUsage = healthData.memory.heapUsed / healthData.memory.heapTotal;
    if (memoryUsage > 0.9) {
      healthData.services.monitoring = 'unhealthy';
      healthData.status = 'degraded';
    } else {
      healthData.services.monitoring = 'healthy';
    }
    
    // Check if any services are unhealthy
    const unhealthyServices = Object.values(healthData.services).filter(status => status === 'unhealthy');
    if (unhealthyServices.length > 0) {
      healthData.status = 'degraded';
    } else {
      healthData.status = 'healthy';
    }
    
    logger.debug('Health data updated', { healthData });
  } catch (error) {
    logger.error('Error updating health data:', error);
    healthData.status = 'unhealthy';
  }
}

// Record request metrics
function recordRequest(endpoint, method, statusCode, responseTime) {
  try {
    healthData.requestCount++;
    
    if (statusCode >= 400) {
      healthData.errorCount++;
    }
    
    // Update average response time
    const totalRequests = healthData.requestCount;
    const currentAvg = healthData.averageResponseTime;
    healthData.averageResponseTime = ((currentAvg * (totalRequests - 1)) + responseTime) / totalRequests;
    
    logger.debug('Request recorded', { endpoint, method, statusCode, responseTime });
  } catch (error) {
    logger.error('Error recording request:', error);
  }
}

// Get current health status
function getHealthStatus() {
  return {
    status: healthData.status,
    uptime: healthData.uptime,
    memory: healthData.memory,
    services: healthData.services,
    lastUpdate: healthData.lastUpdate,
    requestCount: healthData.requestCount,
    errorCount: healthData.errorCount,
    averageResponseTime: healthData.averageResponseTime,
    errorRate: healthData.requestCount > 0 ? (healthData.errorCount / healthData.requestCount) * 100 : 0
  };
}

// Get detailed system status
function getSystemStatus() {
  return {
    ...getHealthStatus(),
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    cpuUsage: process.cpuUsage(),
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date()
  };
}

// Production health check with external service validation
async function checkDatabaseHealth() {
  try {
    // Test Parse database connection
    const TestObject = Parse.Object.extend('HealthTest');
    const testObj = new TestObject();
    testObj.set('test', 'health_check');
    testObj.set('timestamp', new Date());
    
    await testObj.save();
    await testObj.destroy();
    
    return {
      status: 'healthy',
      responseTime: Date.now(),
      lastCheck: new Date()
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      lastCheck: new Date()
    };
  }
}

// Check external exchange APIs
async function checkExchangeAPIs() {
  const exchanges = {
    binance: { status: 'unknown', responseTime: 0 },
    wazirx: { status: 'unknown', responseTime: 0 },
    coindcx: { status: 'unknown', responseTime: 0 }
  };
  
  try {
    // Test Binance API
    const binanceStart = Date.now();
    const binanceResponse = await fetch('https://api.binance.com/api/v3/ping');
    exchanges.binance = {
      status: binanceResponse.ok ? 'healthy' : 'unhealthy',
      responseTime: Date.now() - binanceStart,
      lastCheck: new Date()
    };
  } catch (error) {
    exchanges.binance = {
      status: 'unhealthy',
      error: error.message,
      lastCheck: new Date()
    };
  }
  
  try {
    // Test WazirX API
    const wazirxStart = Date.now();
    const wazirxResponse = await fetch('https://api.wazirx.com/api/v2/tickers');
    exchanges.wazirx = {
      status: wazirxResponse.ok ? 'healthy' : 'unhealthy',
      responseTime: Date.now() - wazirxStart,
      lastCheck: new Date()
    };
  } catch (error) {
    exchanges.wazirx = {
      status: 'unhealthy',
      error: error.message,
      lastCheck: new Date()
    };
  }
  
  try {
    // Test CoinDCX API
    const coindcxStart = Date.now();
    const coindcxResponse = await fetch('https://api.coindcx.com/exchange/ticker');
    exchanges.coindcx = {
      status: coindcxResponse.ok ? 'healthy' : 'unhealthy',
      responseTime: Date.now() - coindcxStart,
      lastCheck: new Date()
    };
  } catch (error) {
    exchanges.coindcx = {
      status: 'unhealthy',
      error: error.message,
      lastCheck: new Date()
    };
  }
  
  return exchanges;
}

// Production health check endpoint
async function productionHealthCheck() {
  try {
    const startTime = Date.now();
    
    // Check all services
    const databaseHealth = await checkDatabaseHealth();
    const exchangeHealth = await checkExchangeAPIs();
    
    // Calculate overall health
    const allServicesHealthy = 
      databaseHealth.status === 'healthy' &&
      Object.values(exchangeHealth).every(exchange => exchange.status === 'healthy');
    
    const health = {
      status: allServicesHealthy ? 'healthy' : 'degraded',
      timestamp: new Date(),
      responseTime: Date.now() - startTime,
      services: {
        database: databaseHealth,
        exchanges: exchangeHealth,
        memory: process.memoryUsage(),
        uptime: process.uptime()
      },
      metrics: {
        requestCount: healthData.requestCount,
        errorCount: healthData.errorCount,
        averageResponseTime: healthData.averageResponseTime,
        errorRate: healthData.requestCount > 0 ? (healthData.errorCount / healthData.requestCount) * 100 : 0
      },
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0'
    };
    
    return health;
  } catch (error) {
    logger.error('Production health check failed:', error);
    return {
      status: 'unhealthy',
      timestamp: new Date(),
      error: error.message,
      services: {
        database: { status: 'unknown' },
        exchanges: { status: 'unknown' }
      }
    };
  }
}

module.exports = {
  updateHealthData,
  recordRequest,
  getHealthStatus,
  getSystemStatus,
  checkDatabaseHealth,
  checkExchangeAPIs,
  productionHealthCheck
};
