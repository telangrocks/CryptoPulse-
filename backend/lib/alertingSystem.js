// =============================================================================
// Intelligent Alerting and Notification System - 100% Production Ready
// =============================================================================
// Advanced alerting with intelligent filtering, escalation, and multiple notification channels

const logger = require('./logging');
const { systemMetrics, healthChecks } = require('./monitoring');
const { metricsCollector } = require('./metricsCollector');

// Alerting system
const alertingSystem = {
  // Alert storage
  alerts: new Map(),
  alertHistory: [],
  notificationChannels: new Map(),
  
  // Configuration
  config: {
    maxAlerts: 1000,
    alertHistorySize: 10000,
    checkInterval: 30000, // 30 seconds
    escalationDelay: 300000, // 5 minutes
    maxAlertFrequency: 60000, // 1 minute between same alerts
    maxHistoryAge: 24 * 60 * 60 * 1000 // 24 hours
  },

  // Alert severity levels
  severity: {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    CRITICAL: 'critical',
    EMERGENCY: 'emergency'
  },

  // Alert status
  status: {
    ACTIVE: 'active',
    ACKNOWLEDGED: 'acknowledged',
    RESOLVED: 'resolved',
    SUPPRESSED: 'suppressed'
  },

  // Initialize alerting system
  init: () => {
    // Start alert checking
    setInterval(() => {
      alertingSystem.checkAlerts();
    }, alertingSystem.config.checkInterval);

    // Start cleanup
    setInterval(() => {
      alertingSystem.cleanup();
    }, 60 * 60 * 1000); // 1 hour

    logger.info('Alerting system initialized', {
      event: 'alerting_system_init',
      config: alertingSystem.config
    });
  },

  // Create alert
  createAlert: (alertData) => {
    const alertId = alertingSystem.generateAlertId();
    const timestamp = new Date().toISOString();
    
    const alert = {
      alertId,
      timestamp,
      status: alertingSystem.status.ACTIVE,
      severity: alertData.severity || alertingSystem.severity.MEDIUM,
      category: alertData.category || 'system',
      title: alertData.title,
      message: alertData.message,
      source: alertData.source || 'system',
      metrics: alertData.metrics || {},
      labels: alertData.labels || {},
      acknowledgedBy: null,
      acknowledgedAt: null,
      resolvedAt: null,
      escalationLevel: 0,
      lastNotification: null,
      notificationCount: 0
    };

    // Check for duplicate alerts
    const duplicate = alertingSystem.findDuplicateAlert(alert);
    if (duplicate) {
      alertingSystem.updateExistingAlert(duplicate, alert);
      return duplicate.alertId;
    }

    // Store alert
    alertingSystem.alerts.set(alertId, alert);
    alertingSystem.alertHistory.push(alert);

    // Send initial notification
    alertingSystem.sendNotification(alert);

    logger.warn('Alert created', {
      event: 'alert_created',
      alertId,
      severity: alert.severity,
      category: alert.category,
      title: alert.title
    });

    return alertId;
  },

  // Update existing alert
  updateExistingAlert: (existingAlert, newAlert) => {
    existingAlert.message = newAlert.message;
    existingAlert.metrics = { ...existingAlert.metrics, ...newAlert.metrics };
    existingAlert.labels = { ...existingAlert.labels, ...newAlert.labels };
    existingAlert.lastUpdate = new Date().toISOString();
    existingAlert.notificationCount++;

    // Update in storage
    alertingSystem.alerts.set(existingAlert.alertId, existingAlert);

    // Check if we should send another notification
    const timeSinceLastNotification = Date.now() - (existingAlert.lastNotification || 0);
    if (timeSinceLastNotification > alertingSystem.config.maxAlertFrequency) {
      alertingSystem.sendNotification(existingAlert);
    }
  },

  // Find duplicate alert
  findDuplicateAlert: (alert) => {
    for (const [alertId, existingAlert] of alertingSystem.alerts.entries()) {
      if (existingAlert.status !== alertingSystem.status.RESOLVED &&
          existingAlert.category === alert.category &&
          existingAlert.title === alert.title &&
          existingAlert.source === alert.source) {
        return existingAlert;
      }
    }
    return null;
  },

  // Acknowledge alert
  acknowledgeAlert: (alertId, acknowledgedBy, comment = '') => {
    const alert = alertingSystem.alerts.get(alertId);
    if (!alert) {
      throw new Error(`Alert ${alertId} not found`);
    }

    alert.status = alertingSystem.status.ACKNOWLEDGED;
    alert.acknowledgedBy = acknowledgedBy;
    alert.acknowledgedAt = new Date().toISOString();
    alert.comment = comment;

    alertingSystem.alerts.set(alertId, alert);

    logger.info('Alert acknowledged', {
      event: 'alert_acknowledged',
      alertId,
      acknowledgedBy,
      comment
    });

    return alert;
  },

  // Resolve alert
  resolveAlert: (alertId, resolvedBy, comment = '') => {
    const alert = alertingSystem.alerts.get(alertId);
    if (!alert) {
      throw new Error(`Alert ${alertId} not found`);
    }

    alert.status = alertingSystem.status.RESOLVED;
    alert.resolvedAt = new Date().toISOString();
    alert.resolvedBy = resolvedBy;
    alert.resolutionComment = comment;

    alertingSystem.alerts.set(alertId, alert);

    logger.info('Alert resolved', {
      event: 'alert_resolved',
      alertId,
      resolvedBy,
      comment
    });

    return alert;
  },

  // Check for alerts based on system metrics
  checkAlerts: async () => {
    try {
      const alerts = [];

      // Check system health
      const health = await healthChecks.getOverallHealth();
      if (health.status !== 'healthy') {
        alerts.push({
          category: 'health',
          severity: health.status === 'unhealthy' ? alertingSystem.severity.CRITICAL : alertingSystem.severity.HIGH,
          title: 'System Health Check Failed',
          message: `System health status: ${health.status}`,
          source: 'health_check',
          metrics: health
        });
      }

      // Check system metrics
      const metrics = systemMetrics.getCurrentMetrics();
      
      // Memory usage alert
      if (parseFloat(metrics.memoryUsage.usagePercentage) > 90) {
        alerts.push({
          category: 'system',
          severity: alertingSystem.severity.CRITICAL,
          title: 'High Memory Usage',
          message: `Memory usage is at ${metrics.memoryUsage.usagePercentage}%`,
          source: 'system_metrics',
          metrics: { memoryUsage: metrics.memoryUsage }
        });
      } else if (parseFloat(metrics.memoryUsage.usagePercentage) > 80) {
        alerts.push({
          category: 'system',
          severity: alertingSystem.severity.HIGH,
          title: 'Elevated Memory Usage',
          message: `Memory usage is at ${metrics.memoryUsage.usagePercentage}%`,
          source: 'system_metrics',
          metrics: { memoryUsage: metrics.memoryUsage }
        });
      }

      // Error rate alert
      if (parseFloat(metrics.errorRate) > 10) {
        alerts.push({
          category: 'system',
          severity: alertingSystem.severity.CRITICAL,
          title: 'High Error Rate',
          message: `Error rate is at ${metrics.errorRate}%`,
          source: 'system_metrics',
          metrics: { errorRate: metrics.errorRate, errorCount: metrics.errorCount }
        });
      } else if (parseFloat(metrics.errorRate) > 5) {
        alerts.push({
          category: 'system',
          severity: alertingSystem.severity.HIGH,
          title: 'Elevated Error Rate',
          message: `Error rate is at ${metrics.errorRate}%`,
          source: 'system_metrics',
          metrics: { errorRate: metrics.errorRate, errorCount: metrics.errorCount }
        });
      }

      // Response time alert
      if (metrics.averageResponseTime > 5000) {
        alerts.push({
          category: 'performance',
          severity: alertingSystem.severity.CRITICAL,
          title: 'High Response Time',
          message: `Average response time is ${metrics.averageResponseTime}ms`,
          source: 'system_metrics',
          metrics: { responseTime: metrics.averageResponseTime }
        });
      } else if (metrics.averageResponseTime > 2000) {
        alerts.push({
          category: 'performance',
          severity: alertingSystem.severity.HIGH,
          title: 'Elevated Response Time',
          message: `Average response time is ${metrics.averageResponseTime}ms`,
          source: 'system_metrics',
          metrics: { responseTime: metrics.averageResponseTime }
        });
      }

      // Process alerts
      for (const alertData of alerts) {
        alertingSystem.createAlert(alertData);
      }

      // Check for escalation
      alertingSystem.checkEscalation();

    } catch (error) {
      logger.error('Alert check failed', {
        event: 'alert_check_failed',
        error: error.message,
        stack: error.stack
      });
    }
  },

  // Check for alert escalation
  checkEscalation: () => {
    const now = Date.now();
    const escalationDelay = alertingSystem.config.escalationDelay;

    for (const [alertId, alert] of alertingSystem.alerts.entries()) {
      if (alert.status === alertingSystem.status.ACTIVE) {
        const alertAge = now - new Date(alert.timestamp).getTime();
        
        if (alertAge > escalationDelay && alert.escalationLevel < 3) {
          alert.escalationLevel++;
          alert.lastNotification = now;
          alert.notificationCount++;

          // Escalate alert
          alertingSystem.sendNotification(alert, true);
          
          logger.warn('Alert escalated', {
            event: 'alert_escalated',
            alertId,
            escalationLevel: alert.escalationLevel,
            alertAge
          });
        }
      }
    }
  },

  // Send notification
  sendNotification: (alert, isEscalation = false) => {
    const notification = {
      alertId: alert.alertId,
      severity: alert.severity,
      category: alert.category,
      title: alert.title,
      message: alert.message,
      timestamp: new Date().toISOString(),
      isEscalation,
      escalationLevel: alert.escalationLevel
    };

    // Send to all configured channels
    for (const [channelName, channel] of alertingSystem.notificationChannels.entries()) {
      try {
        channel.send(notification);
      } catch (error) {
        logger.error('Notification send failed', {
          event: 'notification_send_failed',
          channel: channelName,
          alertId: alert.alertId,
          error: error.message
        });
      }
    }

    alert.lastNotification = Date.now();
    alertingSystem.alerts.set(alert.alertId, alert);
  },

  // Register notification channel
  registerChannel: (name, channel) => {
    alertingSystem.notificationChannels.set(name, channel);
    logger.info('Notification channel registered', {
      event: 'notification_channel_registered',
      channel: name
    });
  },

  // Get alerts
  getAlerts: (filters = {}) => {
    let alerts = Array.from(alertingSystem.alerts.values());

    // Apply filters
    if (filters.status) {
      alerts = alerts.filter(alert => alert.status === filters.status);
    }
    
    if (filters.severity) {
      alerts = alerts.filter(alert => alert.severity === filters.severity);
    }
    
    if (filters.category) {
      alerts = alerts.filter(alert => alert.category === filters.category);
    }
    
    if (filters.source) {
      alerts = alerts.filter(alert => alert.source === filters.source);
    }

    // Sort by timestamp (newest first)
    alerts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Apply pagination
    if (filters.limit) {
      alerts = alerts.slice(0, filters.limit);
    }

    return {
      alerts,
      total: alertingSystem.alerts.size,
      filtered: alerts.length
    };
  },

  // Get alert statistics
  getStatistics: () => {
    const alerts = Array.from(alertingSystem.alerts.values());
    const now = Date.now();
    
    const stats = {
      total: alerts.length,
      byStatus: {},
      bySeverity: {},
      byCategory: {},
      recent: {
        lastHour: 0,
        last24Hours: 0,
        last7Days: 0
      },
      topSources: {},
      averageResolutionTime: 0
    };

    let totalResolutionTime = 0;
    let resolvedCount = 0;

    alerts.forEach(alert => {
      const alertTime = new Date(alert.timestamp).getTime();
      const age = now - alertTime;

      // Status statistics
      stats.byStatus[alert.status] = (stats.byStatus[alert.status] || 0) + 1;
      
      // Severity statistics
      stats.bySeverity[alert.severity] = (stats.bySeverity[alert.severity] || 0) + 1;
      
      // Category statistics
      stats.byCategory[alert.category] = (stats.byCategory[alert.category] || 0) + 1;
      
      // Recent activity
      if (age <= 60 * 60 * 1000) stats.recent.lastHour++;
      if (age <= 24 * 60 * 60 * 1000) stats.recent.last24Hours++;
      if (age <= 7 * 24 * 60 * 60 * 1000) stats.recent.last7Days++;
      
      // Top sources
      stats.topSources[alert.source] = (stats.topSources[alert.source] || 0) + 1;
      
      // Resolution time
      if (alert.resolvedAt) {
        const resolutionTime = new Date(alert.resolvedAt).getTime() - alertTime;
        totalResolutionTime += resolutionTime;
        resolvedCount++;
      }
    });

    // Calculate average resolution time
    if (resolvedCount > 0) {
      stats.averageResolutionTime = Math.round(totalResolutionTime / resolvedCount / 1000); // in seconds
    }

    return stats;
  },

  // Cleanup old alerts
  cleanup: () => {
    const now = Date.now();
    const cutoff = now - alertingSystem.config.maxHistoryAge;
    let cleanedCount = 0;

    // Cleanup resolved alerts older than cutoff
    for (const [alertId, alert] of alertingSystem.alerts.entries()) {
      if (alert.status === alertingSystem.status.RESOLVED) {
        const alertTime = new Date(alert.timestamp).getTime();
        if (alertTime < cutoff) {
          alertingSystem.alerts.delete(alertId);
          cleanedCount++;
        }
      }
    }

    // Cleanup alert history
    const originalHistorySize = alertingSystem.alertHistory.length;
    alertingSystem.alertHistory = alertingSystem.alertHistory
      .filter(alert => new Date(alert.timestamp).getTime() > cutoff)
      .slice(-alertingSystem.config.alertHistorySize);
    
    cleanedCount += originalHistorySize - alertingSystem.alertHistory.length;

    if (cleanedCount > 0) {
      logger.info('Alert cleanup completed', {
        event: 'alert_cleanup',
        cleanedCount,
        remainingAlerts: alertingSystem.alerts.size
      });
    }

    return cleanedCount;
  },

  // Helper functions
  generateAlertId: () => {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
};

// Notification channels
const notificationChannels = {
  // Console notification channel
  console: {
    send: (notification) => {
      const prefix = notification.isEscalation ? '🚨 ESCALATED' : '⚠️';
      console.log(`${prefix} [${notification.severity.toUpperCase()}] ${notification.title}: ${notification.message}`);
    }
  },

  // Slack notification channel
  slack: {
    send: async (notification) => {
      if (!process.env.SLACK_WEBHOOK_URL) {
        throw new Error('Slack webhook URL not configured');
      }

      const axios = require('axios');
      const color = {
        low: '#36a64f',
        medium: '#ff9900',
        high: '#ff6600',
        critical: '#ff0000',
        emergency: '#8b0000'
      }[notification.severity] || '#ff9900';

      const message = {
        text: `${notification.isEscalation ? '🚨 ESCALATED' : '⚠️'} ${notification.title}`,
        attachments: [{
          color,
          fields: [
            { title: 'Severity', value: notification.severity.toUpperCase(), short: true },
            { title: 'Category', value: notification.category, short: true },
            { title: 'Alert ID', value: notification.alertId, short: true },
            { title: 'Time', value: notification.timestamp, short: true },
            { title: 'Message', value: notification.message, short: false }
          ],
          footer: 'CryptoPulse Alerting System',
          ts: Math.floor(new Date(notification.timestamp).getTime() / 1000)
        }]
      };

      if (notification.isEscalation) {
        message.attachments[0].fields.push({
          title: 'Escalation Level',
          value: notification.escalationLevel.toString(),
          short: true
        });
      }

      await axios.post(process.env.SLACK_WEBHOOK_URL, message);
    }
  },

  // Email notification channel
  email: {
    send: async (notification) => {
      if (!process.env.SMTP_HOST || !process.env.ALERT_EMAIL) {
        throw new Error('Email configuration not found');
      }

      const nodemailer = require('nodemailer');
      
      const transporter = nodemailer.createTransporter({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });

      const mailOptions = {
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: process.env.ALERT_EMAIL,
        subject: `${notification.isEscalation ? '[ESCALATED]' : '[ALERT]'} ${notification.title}`,
        html: `
          <h2>${notification.title}</h2>
          <p><strong>Severity:</strong> ${notification.severity.toUpperCase()}</p>
          <p><strong>Category:</strong> ${notification.category}</p>
          <p><strong>Alert ID:</strong> ${notification.alertId}</p>
          <p><strong>Time:</strong> ${notification.timestamp}</p>
          <p><strong>Message:</strong> ${notification.message}</p>
          ${notification.isEscalation ? `<p><strong>Escalation Level:</strong> ${notification.escalationLevel}</p>` : ''}
        `
      };

      await transporter.sendMail(mailOptions);
    }
  },

  // Webhook notification channel
  webhook: {
    send: async (notification) => {
      if (!process.env.ALERT_WEBHOOK_URL) {
        throw new Error('Alert webhook URL not configured');
      }

      const axios = require('axios');
      
      await axios.post(process.env.ALERT_WEBHOOK_URL, {
        type: 'alert',
        ...notification
      });
    }
  }
};

// Initialize default notification channels
const initializeNotificationChannels = () => {
  // Always register console channel
  alertingSystem.registerChannel('console', notificationChannels.console);

  // Register other channels if configured
  if (process.env.SLACK_WEBHOOK_URL) {
    alertingSystem.registerChannel('slack', notificationChannels.slack);
  }

  if (process.env.SMTP_HOST && process.env.ALERT_EMAIL) {
    alertingSystem.registerChannel('email', notificationChannels.email);
  }

  if (process.env.ALERT_WEBHOOK_URL) {
    alertingSystem.registerChannel('webhook', notificationChannels.webhook);
  }
};

// Export alerting system
module.exports = {
  alertingSystem,
  notificationChannels,
  initializeNotificationChannels
};
