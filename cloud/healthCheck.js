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

module.exports = {
  updateHealthData,
  recordRequest,
  getHealthStatus,
  getSystemStatus
};
