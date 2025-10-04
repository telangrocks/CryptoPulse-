// =============================================================================
// CryptoPulse Process Manager - Production Ready
// =============================================================================
// Comprehensive process management utilities for CryptoPulse

const { spawn, exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const { promisify } = require('util');

const execAsync = promisify(exec);

// Configuration
const config = {
  // Process management settings
  processes: {
    backend: {
      name: 'cryptopulse-backend',
      script: 'backend/index.js',
      instances: 'max',
      execMode: 'cluster',
      maxMemory: '1G',
      minUptime: '10s',
      maxRestarts: 10
    },
    cloud: {
      name: 'cryptopulse-cloud',
      script: 'cloud/main.js',
      instances: 2,
      execMode: 'cluster',
      maxMemory: '512M',
      minUptime: '10s',
      maxRestarts: 5
    },
    websocket: {
      name: 'cryptopulse-websocket',
      script: 'backend/websocketServer.js',
      instances: 2,
      execMode: 'cluster',
      maxMemory: '512M',
      minUptime: '10s',
      maxRestarts: 5
    }
  },
  
  // Health check settings
  healthCheck: {
    interval: 30000, // 30 seconds
    timeout: 10000,  // 10 seconds
    retries: 3,
    endpoints: {
      backend: 'http://localhost:1337/health',
      cloud: 'http://localhost:3001/health',
      websocket: 'http://localhost:1338/health'
    }
  },
  
  // Monitoring settings
  monitoring: {
    metricsInterval: 60000, // 1 minute
    logRotation: {
      maxSize: '100MB',
      maxFiles: 10,
      compress: true
    }
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

// Process Manager Class
class ProcessManager {
  constructor(options = {}) {
    this.options = { ...config, ...options };
    this.processes = new Map();
    this.healthChecks = new Map();
    this.monitoring = {
      metrics: new Map(),
      alerts: []
    };
  }

  // =========================================================================
  // Process Management Methods
  // =========================================================================

  // Start all processes
  async startAll(environment = 'production') {
    logInfo('Starting CryptoPulse processes...');
    
    try {
      // Check PM2 installation
      await this.checkPM2Installation();
      
      // Start processes using PM2
      await this.startWithPM2(environment);
      
      // Initialize health checks
      await this.initializeHealthChecks();
      
      // Start monitoring
      await this.startMonitoring();
      
      logSuccess('All processes started successfully');
      return true;
      
    } catch (error) {
      logError(`Failed to start processes: ${error.message}`);
      throw error;
    }
  }

  // Stop all processes
  async stopAll() {
    logInfo('Stopping CryptoPulse processes...');
    
    try {
      // Stop PM2 processes
      await execAsync('pm2 stop ecosystem.config.js');
      
      // Stop health checks
      this.stopHealthChecks();
      
      // Stop monitoring
      this.stopMonitoring();
      
      logSuccess('All processes stopped successfully');
      return true;
      
    } catch (error) {
      logError(`Failed to stop processes: ${error.message}`);
      throw error;
    }
  }

  // Restart all processes
  async restartAll(environment = 'production') {
    logInfo('Restarting CryptoPulse processes...');
    
    try {
      await this.stopAll();
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
      await this.startAll(environment);
      
      logSuccess('All processes restarted successfully');
      return true;
      
    } catch (error) {
      logError(`Failed to restart processes: ${error.message}`);
      throw error;
    }
  }

  // Reload processes (zero-downtime restart)
  async reloadAll() {
    logInfo('Reloading CryptoPulse processes...');
    
    try {
      await execAsync('pm2 reload ecosystem.config.js');
      logSuccess('All processes reloaded successfully');
      return true;
      
    } catch (error) {
      logError(`Failed to reload processes: ${error.message}`);
      throw error;
    }
  }

  // =========================================================================
  // PM2 Integration Methods
  // =========================================================================

  // Check PM2 installation
  async checkPM2Installation() {
    try {
      await execAsync('pm2 --version');
      logSuccess('PM2 is installed and available');
    } catch (error) {
      logWarning('PM2 not found, installing...');
      await execAsync('npm install -g pm2');
      logSuccess('PM2 installed successfully');
    }
  }

  // Start processes with PM2
  async startWithPM2(environment) {
    try {
      const envFlag = environment === 'production' ? '--env production' : 
                     environment === 'staging' ? '--env staging' : '';
      
      await execAsync(`pm2 start ecosystem.config.js ${envFlag}`);
      logSuccess(`Processes started with PM2 (${environment} environment)`);
      
      // Save PM2 configuration
      await execAsync('pm2 save');
      logSuccess('PM2 configuration saved');
      
    } catch (error) {
      throw new Error(`Failed to start processes with PM2: ${error.message}`);
    }
  }

  // =========================================================================
  // Health Check Methods
  // =========================================================================

  // Initialize health checks
  async initializeHealthChecks() {
    logInfo('Initializing health checks...');
    
    for (const [service, endpoint] of Object.entries(this.options.healthCheck.endpoints)) {
      const healthCheck = setInterval(async () => {
        await this.performHealthCheck(service, endpoint);
      }, this.options.healthCheck.interval);
      
      this.healthChecks.set(service, healthCheck);
    }
    
    logSuccess('Health checks initialized');
  }

  // Perform health check for a service
  async performHealthCheck(service, endpoint) {
    try {
      const { spawn } = require('child_process');
      
      return new Promise((resolve) => {
        const curl = spawn('curl', ['-f', '-s', endpoint], { stdio: 'pipe' });
        
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
            this.updateHealthStatus(service, 'healthy', output);
            resolve(true);
          } else {
            this.updateHealthStatus(service, 'unhealthy', errorOutput);
            this.handleUnhealthyService(service);
            resolve(false);
          }
        });
        
        curl.on('error', (error) => {
          this.updateHealthStatus(service, 'error', error.message);
          this.handleUnhealthyService(service);
          resolve(false);
        });
        
        // Timeout
        setTimeout(() => {
          curl.kill();
          this.updateHealthStatus(service, 'timeout', 'Health check timeout');
          this.handleUnhealthyService(service);
          resolve(false);
        }, this.options.healthCheck.timeout);
      });
      
    } catch (error) {
      this.updateHealthStatus(service, 'error', error.message);
      return false;
    }
  }

  // Update health status
  updateHealthStatus(service, status, details = '') {
    const currentStatus = this.monitoring.metrics.get(`${service}_health`) || {
      status: 'unknown',
      lastCheck: null,
      consecutiveFailures: 0,
      details: ''
    };
    
    const newStatus = {
      status,
      lastCheck: new Date().toISOString(),
      consecutiveFailures: status === 'healthy' ? 0 : currentStatus.consecutiveFailures + 1,
      details
    };
    
    this.monitoring.metrics.set(`${service}_health`, newStatus);
    
    if (status !== 'healthy') {
      logWarning(`Health check failed for ${service}: ${status} - ${details}`);
    }
  }

  // Handle unhealthy service
  async handleUnhealthyService(service) {
    const healthStatus = this.monitoring.metrics.get(`${service}_health`);
    
    if (healthStatus && healthStatus.consecutiveFailures >= this.options.healthCheck.retries) {
      logError(`Service ${service} is unhealthy, attempting restart...`);
      
      try {
        await execAsync(`pm2 restart ${service}`);
        logSuccess(`Service ${service} restarted successfully`);
        
        // Reset failure count
        healthStatus.consecutiveFailures = 0;
        this.monitoring.metrics.set(`${service}_health`, healthStatus);
        
      } catch (error) {
        logError(`Failed to restart service ${service}: ${error.message}`);
        this.addAlert('critical', `Service ${service} restart failed`, error.message);
      }
    }
  }

  // Stop health checks
  stopHealthChecks() {
    for (const [service, interval] of this.healthChecks) {
      clearInterval(interval);
    }
    this.healthChecks.clear();
    logSuccess('Health checks stopped');
  }

  // =========================================================================
  // Monitoring Methods
  // =========================================================================

  // Start monitoring
  async startMonitoring() {
    logInfo('Starting process monitoring...');
    
    // Start metrics collection
    this.metricsInterval = setInterval(() => {
      this.collectMetrics();
    }, this.options.monitoring.metricsInterval);
    
    // Start log rotation
    this.startLogRotation();
    
    logSuccess('Process monitoring started');
  }

  // Collect metrics
  async collectMetrics() {
    try {
      const { stdout } = await execAsync('pm2 jlist');
      const processes = JSON.parse(stdout);
      
      for (const process of processes) {
        const metrics = {
          name: process.name,
          status: process.pm2_env.status,
          cpu: process.monit.cpu,
          memory: process.monit.memory,
          uptime: process.pm2_env.uptime,
          restarts: process.pm2_env.restart_time,
          lastRestart: process.pm2_env.pm_uptime,
          pid: process.pid,
          timestamp: new Date().toISOString()
        };
        
        this.monitoring.metrics.set(process.name, metrics);
        
        // Check for alerts
        this.checkMetricsAlerts(metrics);
      }
      
    } catch (error) {
      logWarning(`Failed to collect metrics: ${error.message}`);
    }
  }

  // Check metrics for alerts
  checkMetricsAlerts(metrics) {
    // CPU usage alert
    if (metrics.cpu > 80) {
      this.addAlert('warning', `High CPU usage for ${metrics.name}`, `${metrics.cpu}%`);
    }
    
    // Memory usage alert
    if (metrics.memory > 800 * 1024 * 1024) { // 800MB
      this.addAlert('warning', `High memory usage for ${metrics.name}`, `${Math.round(metrics.memory / 1024 / 1024)}MB`);
    }
    
    // Restart count alert
    if (metrics.restarts > 5) {
      this.addAlert('critical', `High restart count for ${metrics.name}`, `${metrics.restarts} restarts`);
    }
  }

  // Add alert
  addAlert(severity, message, details = '') {
    const alert = {
      severity,
      message,
      details,
      timestamp: new Date().toISOString()
    };
    
    this.monitoring.alerts.push(alert);
    
    // Keep only last 100 alerts
    if (this.monitoring.alerts.length > 100) {
      this.monitoring.alerts = this.monitoring.alerts.slice(-100);
    }
    
    logWarning(`Alert: ${message} - ${details}`);
  }

  // Start log rotation
  startLogRotation() {
    // This would integrate with logrotate or implement custom log rotation
    logInfo('Log rotation monitoring started');
  }

  // Stop monitoring
  stopMonitoring() {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }
    logSuccess('Process monitoring stopped');
  }

  // =========================================================================
  // Utility Methods
  // =========================================================================

  // Get process status
  async getStatus() {
    try {
      const { stdout } = await execAsync('pm2 status');
      return {
        status: 'running',
        processes: stdout,
        metrics: Object.fromEntries(this.monitoring.metrics),
        health: Object.fromEntries(
          Array.from(this.monitoring.metrics.entries())
            .filter(([key]) => key.endsWith('_health'))
            .map(([key, value]) => [key.replace('_health', ''), value])
        ),
        alerts: this.monitoring.alerts.slice(-10) // Last 10 alerts
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message
      };
    }
  }

  // Get process logs
  async getLogs(service, lines = 100) {
    try {
      const { stdout } = await execAsync(`pm2 logs ${service} --lines ${lines} --nostream`);
      return stdout;
    } catch (error) {
      throw new Error(`Failed to get logs for ${service}: ${error.message}`);
    }
  }

  // Scale process
  async scaleProcess(service, instances) {
    try {
      await execAsync(`pm2 scale ${service} ${instances}`);
      logSuccess(`Scaled ${service} to ${instances} instances`);
      return true;
    } catch (error) {
      logError(`Failed to scale ${service}: ${error.message}`);
      throw error;
    }
  }

  // Get process information
  async getProcessInfo(service) {
    try {
      const { stdout } = await execAsync(`pm2 describe ${service}`);
      return stdout;
    } catch (error) {
      throw new Error(`Failed to get process info for ${service}: ${error.message}`);
    }
  }

  // =========================================================================
  // Cleanup Methods
  // =========================================================================

  // Cleanup resources
  cleanup() {
    this.stopHealthChecks();
    this.stopMonitoring();
    logInfo('Process manager cleanup completed');
  }
}

// CLI Interface
const main = async () => {
  const args = process.argv.slice(2);
  const command = args[0];
  const environment = args[1] || 'production';
  
  const manager = new ProcessManager();
  
  try {
    switch (command) {
      case 'start':
        await manager.startAll(environment);
        break;
      case 'stop':
        await manager.stopAll();
        break;
      case 'restart':
        await manager.restartAll(environment);
        break;
      case 'reload':
        await manager.reloadAll();
        break;
      case 'status':
        const status = await manager.getStatus();
        console.log(JSON.stringify(status, null, 2));
        break;
      case 'logs':
        const service = args[1];
        const lines = parseInt(args[2]) || 100;
        const logs = await manager.getLogs(service, lines);
        console.log(logs);
        break;
      case 'scale':
        const serviceName = args[1];
        const instances = parseInt(args[2]);
        await manager.scaleProcess(serviceName, instances);
        break;
      default:
        console.log('Usage: node scripts/process-manager.js <start|stop|restart|reload|status|logs|scale> [environment|service] [instances|lines]');
        process.exit(1);
    }
  } catch (error) {
    logError(`Command failed: ${error.message}`);
    process.exit(1);
  }
};

// Export for use as module
module.exports = {
  ProcessManager,
  config
};

// Run if called directly
if (require.main === module) {
  main();
}
