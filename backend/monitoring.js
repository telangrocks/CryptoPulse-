/**
 * Production-Ready Monitoring for CryptoPulse Backend
 * 
 * @author Shrikant Telang
 * @version 2.0.0
 */

const winston = require('winston');

// Configure logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/app.log' })
  ]
});

// Health check data
let healthData = {
  status: 'healthy',
  uptime: process.uptime(),
  timestamp: new Date().toISOString(),
  version: '2.0.0',
  memory: process.memoryUsage()
};

/**
 * Health check endpoint
 */
const healthCheck = (req, res) => {
  healthData.uptime = process.uptime();
  healthData.timestamp = new Date().toISOString();
  healthData.memory = process.memoryUsage();
  
  res.json(healthData);
};

/**
 * Request logging middleware
 */
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info({
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: duration,
      ip: req.ip
    });
  });
  
  next();
};

module.exports = {
  logger,
  healthCheck,
  requestLogger
};