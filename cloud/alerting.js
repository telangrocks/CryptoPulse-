// Alerting Module for CryptoPulse Cloud Functions
const winston = require('winston');

// Configure logger for alerting
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

// Alert levels
const ALERT_LEVELS = {
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  CRITICAL: 'critical'
};

// Alert storage (in production, this would be stored in a database)
let alerts = [];

// Send alert
async function sendAlert(level, message, details = {}) {
  try {
    const alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      level,
      message,
      details,
      timestamp: new Date(),
      resolved: false
    };
    
    alerts.push(alert);
    
    // Log the alert
    logger[level](`ALERT: ${message}`, { alert, details });
    
    // In production, this would send to external alerting services
    // like PagerDuty, Slack, email, etc.
    console.log(`🚨 ALERT [${level.toUpperCase()}]: ${message}`);
    
    return alert;
  } catch (error) {
    logger.error('Error sending alert:', error);
    throw error;
  }
}

// System down alert
async function alertSystemDown(services, error) {
  try {
    const message = `System services down: ${services}`;
    const details = {
      services: services.split(', '),
      error: error.message,
      stack: error.stack,
      timestamp: new Date()
    };
    
    return await sendAlert(ALERT_LEVELS.CRITICAL, message, details);
  } catch (error) {
    logger.error('Error sending system down alert:', error);
    throw error;
  }
}

// Security breach alert
async function alertSecurityBreach(breachType, details) {
  try {
    const message = `Security breach detected: ${breachType}`;
    const alertDetails = {
      breachType,
      ...details,
      timestamp: new Date()
    };
    
    return await sendAlert(ALERT_LEVELS.CRITICAL, message, alertDetails);
  } catch (error) {
    logger.error('Error sending security breach alert:', error);
    throw error;
  }
}

// Critical error alert
async function alertCriticalError(error, context) {
  try {
    const message = `Critical error in ${context}: ${error.message}`;
    const details = {
      context,
      error: error.message,
      stack: error.stack,
      timestamp: new Date()
    };
    
    return await sendAlert(ALERT_LEVELS.ERROR, message, details);
  } catch (alertError) {
    logger.error('Error sending critical error alert:', alertError);
    throw alertError;
  }
}

// Get recent alerts
function getRecentAlerts(limit = 50) {
  return alerts
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, limit);
}

// Resolve alert
function resolveAlert(alertId) {
  const alert = alerts.find(a => a.id === alertId);
  if (alert) {
    alert.resolved = true;
    alert.resolvedAt = new Date();
    logger.info(`Alert resolved: ${alertId}`);
    return true;
  }
  return false;
}

// Get alert statistics
function getAlertStats() {
  const total = alerts.length;
  const resolved = alerts.filter(a => a.resolved).length;
  const unresolved = total - resolved;
  
  const byLevel = alerts.reduce((acc, alert) => {
    acc[alert.level] = (acc[alert.level] || 0) + 1;
    return acc;
  }, {});
  
  return {
    total,
    resolved,
    unresolved,
    byLevel,
    resolutionRate: total > 0 ? (resolved / total) * 100 : 0
  };
}

module.exports = {
  sendAlert,
  alertSystemDown,
  alertSecurityBreach,
  alertCriticalError,
  getRecentAlerts,
  resolveAlert,
  getAlertStats,
  ALERT_LEVELS
};
