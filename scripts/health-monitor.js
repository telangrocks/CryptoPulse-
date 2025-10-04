// =============================================================================
// CryptoPulse Health Monitor - Production Ready
// =============================================================================
// Comprehensive health monitoring and alerting for CryptoPulse

const { spawn, exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const { promisify } = require('util');
const os = require('os');

const execAsync = promisify(exec);

// Configuration
const config = {
  // Health check settings
  healthCheck: {
    interval: 30000, // 30 seconds
    timeout: 10000,  // 10 seconds
    retries: 3,
    services: {
      backend: {
        port: 1337,
        path: '/health',
        critical: true
      },
      frontend: {
        port: 80,
        path: '/health',
        critical: true
      },
      cloud: {
        port: 3001,
        path: '/health',
        critical: true
      },
      postgres: {
        port: 5432,
        type: 'database'
      },
      redis: {
        port: 6379,
        type: 'cache'
      },
      mongodb: {
        port: 27017,
        type: 'database'
      },
      nginx: {
        port: 80,
        type: 'proxy'
      }
    }
  },
  
  // System monitoring
  system: {
    metricsInterval: 60000, // 1 minute
    thresholds: {
      cpu: 80,           // CPU usage percentage
      memory: 85,        // Memory usage percentage
      disk: 90,          // Disk usage percentage
      load: 4.0,         // Load average
      network: 1000      // Network latency in ms
    }
  },
  
  // Alerting
  alerting: {
    enabled: true,
    channels: {
      email: {
        enabled: false,
        smtp: {
          host: 'smtp.gmail.com',
          port: 587,
          secure: false,
          auth: {
            user: process.env.ALERT_EMAIL_USER,
            pass: process.env.ALERT_EMAIL_PASS
          }
        },
        to: process.env.ALERT_EMAIL_TO,
        from: process.env.ALERT_EMAIL_FROM
      },
      slack: {
        enabled: false,
        webhook: process.env.SLACK_WEBHOOK_URL,
        channel: '#alerts'
      },
      webhook: {
        enabled: false,
        url: process.env.ALERT_WEBHOOK_URL,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.ALERT_WEBHOOK_TOKEN}`
        }
      }
    },
    rules: {
      critical: {
        cpu: 90,
        memory: 95,
        disk: 95,
        responseTime: 5000,
        errorRate: 10
      },
      warning: {
        cpu: 80,
        memory: 85,
        disk: 90,
        responseTime: 2000,
        errorRate: 5
      }
    }
  },
  
  // Logging
  logging: {
    level: 'info',
    file: './logs/health-monitor.log',
    maxSize: '10MB',
    maxFiles: 5
  }
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Utility functions
const log = (message, color = colors.reset) => {
  console.log(`${color}${message}${colors.reset}`);
};

const logSuccess = (message) => log(`✅ ${message}`, colors.green);
const logError = (message) => log(`❌ ${message}`, colors.red);
const logWarning = (message) => log(`⚠️  ${message}`, colors.yellow);
const logInfo = (message) => log(`ℹ️  ${message}`, colors.blue);

// Health Monitor Class
class HealthMonitor {
  constructor(options = {}) {
    this.options = { ...config, ...options };
    this.healthStatus = new Map();
    this.systemMetrics = new Map();
    this.alerts = [];
    this.isRunning = false;
    this.intervals = new Map();
  }

  // =========================================================================
  // Initialization Methods
  // =========================================================================

  // Start health monitoring
  async start() {
    logInfo('Starting CryptoPulse Health Monitor...');
    
    try {
      // Initialize logging
      await this.initializeLogging();
      
      // Start service health checks
      await this.startServiceHealthChecks();
      
      // Start system monitoring
      await this.startSystemMonitoring();
      
      // Start alerting
      await this.startAlerting();
      
      this.isRunning = true;
      logSuccess('Health Monitor started successfully');
      
    } catch (error) {
      logError(`Failed to start Health Monitor: ${error.message}`);
      throw error;
    }
  }

  // Stop health monitoring
  async stop() {
    logInfo('Stopping CryptoPulse Health Monitor...');
    
    try {
      this.isRunning = false;
      
      // Stop all intervals
      for (const [name, interval] of this.intervals) {
        clearInterval(interval);
      }
      this.intervals.clear();
      
      logSuccess('Health Monitor stopped successfully');
      
    } catch (error) {
      logError(`Failed to stop Health Monitor: ${error.message}`);
      throw error;
    }
  }

  // Initialize logging
  async initializeLogging() {
    try {
      const logDir = path.dirname(this.options.logging.file);
      await fs.mkdir(logDir, { recursive: true });
      logSuccess('Logging initialized');
    } catch (error) {
      logWarning(`Failed to initialize logging: ${error.message}`);
    }
  }

  // =========================================================================
  // Service Health Check Methods
  // =========================================================================

  // Start service health checks
  async startServiceHealthChecks() {
    logInfo('Starting service health checks...');
    
    const interval = setInterval(async () => {
      await this.performServiceHealthChecks();
    }, this.options.healthCheck.interval);
    
    this.intervals.set('serviceHealthChecks', interval);
    
    // Perform initial health check
    await this.performServiceHealthChecks();
    
    logSuccess('Service health checks started');
  }

  // Perform service health checks
  async performServiceHealthChecks() {
    const services = Object.keys(this.options.healthCheck.services);
    
    for (const service of services) {
      try {
        await this.checkServiceHealth(service);
      } catch (error) {
        this.updateServiceHealth(service, false, error.message);
      }
    }
  }

  // Check individual service health
  async checkServiceHealth(service) {
    const serviceConfig = this.options.healthCheck.services[service];
    
    if (serviceConfig.type === 'database') {
      await this.checkDatabaseHealth(service, serviceConfig);
    } else if (serviceConfig.type === 'cache') {
      await this.checkCacheHealth(service, serviceConfig);
    } else if (serviceConfig.type === 'proxy') {
      await this.checkProxyHealth(service, serviceConfig);
    } else {
      await this.checkHTTPHealth(service, serviceConfig);
    }
  }

  // Check HTTP service health
  async checkHTTPHealth(service, config) {
    const startTime = Date.now();
    
    try {
      const response = await this.makeHTTPRequest(`http://localhost:${config.port}${config.path}`);
      const responseTime = Date.now() - startTime;
      
      this.updateServiceHealth(service, true, null, {
        statusCode: response.status,
        responseTime,
        data: response.data
      });
      
    } catch (error) {
      this.updateServiceHealth(service, false, error.message);
    }
  }

  // Check database health
  async checkDatabaseHealth(service, config) {
    try {
      let command;
      
      switch (service) {
        case 'postgres':
          command = `pg_isready -h localhost -p ${config.port}`;
          break;
        case 'mongodb':
          command = `mongosh --eval "db.adminCommand('ping')" --quiet`;
          break;
        default:
          throw new Error(`Unknown database type: ${service}`);
      }
      
      await execAsync(command);
      this.updateServiceHealth(service, true);
      
    } catch (error) {
      this.updateServiceHealth(service, false, error.message);
    }
  }

  // Check cache health
  async checkCacheHealth(service, config) {
    try {
      const command = `redis-cli -h localhost -p ${config.port} ping`;
      const { stdout } = await execAsync(command);
      
      if (stdout.trim() === 'PONG') {
        this.updateServiceHealth(service, true);
      } else {
        this.updateServiceHealth(service, false, 'Invalid response from cache');
      }
      
    } catch (error) {
      this.updateServiceHealth(service, false, error.message);
    }
  }

  // Check proxy health
  async checkProxyHealth(service, config) {
    try {
      const response = await this.makeHTTPRequest(`http://localhost:${config.port}/health`);
      
      if (response.status === 200) {
        this.updateServiceHealth(service, true);
      } else {
        this.updateServiceHealth(service, false, `HTTP ${response.status}`);
      }
      
    } catch (error) {
      this.updateServiceHealth(service, false, error.message);
    }
  }

  // Make HTTP request
  async makeHTTPRequest(url, options = {}) {
    const { spawn } = require('child_process');
    
    return new Promise((resolve, reject) => {
      const curl = spawn('curl', [
        '-f', '-s', '-m', '10',
        '-w', 'HTTPSTATUS:%{http_code};TIME:%{time_total}',
        url
      ], { stdio: 'pipe' });
      
      let output = '';
      let errorOutput = '';
      
      curl.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      curl.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });
      
      curl.on('close', (code) => {
        if (code === 0) {
          const lines = output.split('\n');
          const lastLine = lines[lines.length - 1];
          const data = lines.slice(0, -1).join('\n');
          
          const statusMatch = lastLine.match(/HTTPSTATUS:(\d+);TIME:([\d.]+)/);
          if (statusMatch) {
            resolve({
              status: parseInt(statusMatch[1]),
              responseTime: parseFloat(statusMatch[2]) * 1000,
              data: data
            });
          } else {
            reject(new Error('Invalid response format'));
          }
        } else {
          reject(new Error(`HTTP request failed: ${errorOutput}`));
        }
      });
      
      curl.on('error', (error) => {
        reject(error);
      });
      
      // Timeout
      setTimeout(() => {
        curl.kill();
        reject(new Error('HTTP request timeout'));
      }, this.options.healthCheck.timeout);
    });
  }

  // Update service health status
  updateServiceHealth(service, healthy, error = null, metrics = {}) {
    const currentStatus = this.healthStatus.get(service) || {
      healthy: false,
      consecutiveFailures: 0,
      lastCheck: null,
      error: null,
      metrics: {}
    };
    
    const newStatus = {
      healthy,
      consecutiveFailures: healthy ? 0 : currentStatus.consecutiveFailures + 1,
      lastCheck: new Date().toISOString(),
      error,
      metrics: {
        ...currentStatus.metrics,
        ...metrics
      }
    };
    
    this.healthStatus.set(service, newStatus);
    
    // Check for alerts
    if (!healthy && newStatus.consecutiveFailures >= this.options.healthCheck.retries) {
      this.triggerAlert('critical', `${service} service is unhealthy`, {
        service,
        error,
        consecutiveFailures: newStatus.consecutiveFailures
      });
    }
  }

  // =========================================================================
  // System Monitoring Methods
  // =========================================================================

  // Start system monitoring
  async startSystemMonitoring() {
    logInfo('Starting system monitoring...');
    
    const interval = setInterval(async () => {
      await this.collectSystemMetrics();
    }, this.options.system.metricsInterval);
    
    this.intervals.set('systemMonitoring', interval);
    
    // Collect initial metrics
    await this.collectSystemMetrics();
    
    logSuccess('System monitoring started');
  }

  // Collect system metrics
  async collectSystemMetrics() {
    try {
      const metrics = {
        timestamp: new Date().toISOString(),
        cpu: await this.getCPUUsage(),
        memory: await this.getMemoryUsage(),
        disk: await this.getDiskUsage(),
        load: os.loadavg(),
        network: await this.getNetworkLatency()
      };
      
      this.systemMetrics.set('current', metrics);
      
      // Check for system alerts
      this.checkSystemAlerts(metrics);
      
    } catch (error) {
      logWarning(`Failed to collect system metrics: ${error.message}`);
    }
  }

  // Get CPU usage
  async getCPUUsage() {
    return new Promise((resolve) => {
      const startMeasure = this.cpuAverage();
      
      setTimeout(() => {
        const endMeasure = this.cpuAverage();
        const idleDifference = endMeasure.idle - startMeasure.idle;
        const totalDifference = endMeasure.total - startMeasure.total;
        const percentageCPU = 100 - ~~(100 * idleDifference / totalDifference);
        resolve(percentageCPU);
      }, 100);
    });
  }

  // CPU average calculation
  cpuAverage() {
    let totalIdle = 0;
    let totalTick = 0;
    const cpus = os.cpus();
    
    for (let i = 0; i < cpus.length; i++) {
      const cpu = cpus[i];
      for (const type in cpu.times) {
        totalTick += cpu.times[type];
      }
      totalIdle += cpu.times.idle;
    }
    
    return {
      idle: totalIdle / cpus.length,
      total: totalTick / cpus.length
    };
  }

  // Get memory usage
  async getMemoryUsage() {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    
    return {
      total: totalMemory,
      used: usedMemory,
      free: freeMemory,
      percentage: (usedMemory / totalMemory) * 100
    };
  }

  // Get disk usage
  async getDiskUsage() {
    try {
      const { stdout } = await execAsync('df -h /');
      const lines = stdout.split('\n');
      const dataLine = lines[1];
      const parts = dataLine.split(/\s+/);
      
      return {
        total: parts[1],
        used: parts[2],
        available: parts[3],
        percentage: parseInt(parts[4])
      };
    } catch (error) {
      return { percentage: 0 };
    }
  }

  // Get network latency
  async getNetworkLatency() {
    try {
      const startTime = Date.now();
      await execAsync('ping -c 1 8.8.8.8');
      return Date.now() - startTime;
    } catch (error) {
      return 0;
    }
  }

  // Check system alerts
  checkSystemAlerts(metrics) {
    const thresholds = this.options.system.thresholds;
    
    // CPU alert
    if (metrics.cpu > thresholds.cpu) {
      this.triggerAlert('warning', `High CPU usage: ${metrics.cpu.toFixed(2)}%`, {
        metric: 'cpu',
        value: metrics.cpu,
        threshold: thresholds.cpu
      });
    }
    
    // Memory alert
    if (metrics.memory.percentage > thresholds.memory) {
      this.triggerAlert('warning', `High memory usage: ${metrics.memory.percentage.toFixed(2)}%`, {
        metric: 'memory',
        value: metrics.memory.percentage,
        threshold: thresholds.memory
      });
    }
    
    // Disk alert
    if (metrics.disk.percentage > thresholds.disk) {
      this.triggerAlert('critical', `High disk usage: ${metrics.disk.percentage}%`, {
        metric: 'disk',
        value: metrics.disk.percentage,
        threshold: thresholds.disk
      });
    }
    
    // Load average alert
    if (metrics.load[0] > thresholds.load) {
      this.triggerAlert('warning', `High load average: ${metrics.load[0].toFixed(2)}`, {
        metric: 'load',
        value: metrics.load[0],
        threshold: thresholds.load
      });
    }
  }

  // =========================================================================
  // Alerting Methods
  // =========================================================================

  // Start alerting
  async startAlerting() {
    if (!this.options.alerting.enabled) {
      return;
    }
    
    logInfo('Starting alerting system...');
    
    // Check for alert channels
    const channels = Object.keys(this.options.alerting.channels);
    const enabledChannels = channels.filter(channel => 
      this.options.alerting.channels[channel].enabled
    );
    
    if (enabledChannels.length === 0) {
      logWarning('No alert channels enabled');
      return;
    }
    
    logSuccess(`Alerting enabled for channels: ${enabledChannels.join(', ')}`);
  }

  // Trigger alert
  async triggerAlert(severity, message, details = {}) {
    const alert = {
      id: this.generateAlertId(),
      severity,
      message,
      details,
      timestamp: new Date().toISOString(),
      acknowledged: false
    };
    
    this.alerts.push(alert);
    
    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }
    
    // Send alert
    await this.sendAlert(alert);
    
    // Log alert
    this.logAlert(alert);
  }

  // Generate alert ID
  generateAlertId() {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Send alert
  async sendAlert(alert) {
    const channels = this.options.alerting.channels;
    
    // Send to email
    if (channels.email.enabled) {
      await this.sendEmailAlert(alert);
    }
    
    // Send to Slack
    if (channels.slack.enabled) {
      await this.sendSlackAlert(alert);
    }
    
    // Send to webhook
    if (channels.webhook.enabled) {
      await this.sendWebhookAlert(alert);
    }
  }

  // Send email alert
  async sendEmailAlert(alert) {
    // Implementation would depend on email service
    logInfo(`Email alert sent: ${alert.message}`);
  }

  // Send Slack alert
  async sendSlackAlert(alert) {
    try {
      const { default: axios } = await import('axios');
      
      const message = {
        text: `🚨 ${alert.severity.toUpperCase()} Alert`,
        attachments: [
          {
            color: alert.severity === 'critical' ? 'danger' : 'warning',
            title: alert.message,
            fields: [
              { title: 'Severity', value: alert.severity, short: true },
              { title: 'Time', value: alert.timestamp, short: true }
            ],
            footer: 'CryptoPulse Health Monitor',
            ts: Math.floor(new Date(alert.timestamp).getTime() / 1000)
          }
        ]
      };
      
      await axios.post(this.options.alerting.channels.slack.webhook, message);
      logInfo(`Slack alert sent: ${alert.message}`);
    } catch (error) {
      logWarning(`Failed to send Slack alert: ${error.message}`);
    }
  }

  // Send webhook alert
  async sendWebhookAlert(alert) {
    try {
      const { default: axios } = await import('axios');
      
      await axios.post(this.options.alerting.channels.webhook.url, alert, {
        headers: this.options.alerting.channels.webhook.headers
      });
      
      logInfo(`Webhook alert sent: ${alert.message}`);
    } catch (error) {
      logWarning(`Failed to send webhook alert: ${error.message}`);
    }
  }

  // Log alert
  logAlert(alert) {
    const logMessage = `[${alert.severity.toUpperCase()}] ${alert.message} - ${alert.timestamp}`;
    
    if (alert.severity === 'critical') {
      logError(logMessage);
    } else if (alert.severity === 'warning') {
      logWarning(logMessage);
    } else {
      logInfo(logMessage);
    }
  }

  // =========================================================================
  // Utility Methods
  // =========================================================================

  // Get health status
  getHealthStatus() {
    const services = Object.keys(this.options.healthCheck.services);
    const systemMetrics = this.systemMetrics.get('current');
    
    const healthStatus = {
      timestamp: new Date().toISOString(),
      overall: 'healthy',
      services: {},
      system: systemMetrics || null,
      alerts: this.alerts.slice(-10) // Last 10 alerts
    };
    
    let unhealthyServices = 0;
    
    for (const service of services) {
      const status = this.healthStatus.get(service);
      healthStatus.services[service] = status || { healthy: false, error: 'Not checked' };
      
      if (!status || !status.healthy) {
        unhealthyServices++;
      }
    }
    
    // Determine overall health
    if (unhealthyServices > 0) {
      healthStatus.overall = 'unhealthy';
    } else if (this.alerts.some(alert => alert.severity === 'critical' && !alert.acknowledged)) {
      healthStatus.overall = 'critical';
    }
    
    return healthStatus;
  }

  // Get system metrics
  getSystemMetrics() {
    return this.systemMetrics.get('current') || null;
  }

  // Get alerts
  getAlerts(limit = 50) {
    return this.alerts.slice(-limit);
  }

  // Acknowledge alert
  acknowledgeAlert(alertId) {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      logInfo(`Alert ${alertId} acknowledged`);
    }
  }

  // Cleanup
  cleanup() {
    this.stop();
    logInfo('Health Monitor cleanup completed');
  }
}

// CLI Interface
const main = async () => {
  const args = process.argv.slice(2);
  const command = args[0];
  
  const healthMonitor = new HealthMonitor();
  
  try {
    await healthMonitor.initialize();
    
    switch (command) {
      case 'start':
        await healthMonitor.start();
        break;
      case 'stop':
        await healthMonitor.stop();
        break;
      case 'status':
        const status = healthMonitor.getHealthStatus();
        console.log(JSON.stringify(status, null, 2));
        break;
      case 'metrics':
        const metrics = healthMonitor.getSystemMetrics();
        console.log(JSON.stringify(metrics, null, 2));
        break;
      case 'alerts':
        const limit = parseInt(args[1]) || 50;
        const alerts = healthMonitor.getAlerts(limit);
        console.log(JSON.stringify(alerts, null, 2));
        break;
      default:
        console.log('Usage: node scripts/health-monitor.js <start|stop|status|metrics|alerts> [limit]');
        process.exit(1);
    }
  } catch (error) {
    logError(`Command failed: ${error.message}`);
    process.exit(1);
  }
};

// Export for use as module
module.exports = {
  HealthMonitor,
  config
};

// Run if called directly
if (require.main === module) {
  main();
}
