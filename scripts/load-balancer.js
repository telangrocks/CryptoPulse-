// =============================================================================
// CryptoPulse Load Balancer - Production Ready
// =============================================================================
// Advanced load balancing and auto-scaling for CryptoPulse

const { spawn, exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const { promisify } = require('util');
const os = require('os');

const execAsync = promisify(exec);

// Configuration
const config = {
  // Load balancing settings
  loadBalancer: {
    // Backend instances
    backend: {
      minInstances: 2,
      maxInstances: 10,
      targetCPU: 70,        // CPU percentage
      targetMemory: 80,     // Memory percentage
      targetResponseTime: 500, // Response time in ms
      scaleUpThreshold: 85,    // Scale up when metrics exceed this
      scaleDownThreshold: 30,  // Scale down when metrics below this
      cooldownPeriod: 300000,  // 5 minutes cooldown
      healthCheckInterval: 30000, // 30 seconds
      metricsWindow: 300000,  // 5 minutes metrics window
    },
    
    // Frontend instances
    frontend: {
      minInstances: 1,
      maxInstances: 5,
      targetCPU: 70,
      targetMemory: 80,
      targetResponseTime: 200,
      scaleUpThreshold: 85,
      scaleDownThreshold: 30,
      cooldownPeriod: 300000,
      healthCheckInterval: 30000,
      metricsWindow: 300000,
    },
    
    // Cloud services instances
    cloud: {
      minInstances: 1,
      maxInstances: 3,
      targetCPU: 70,
      targetMemory: 80,
      targetResponseTime: 300,
      scaleUpThreshold: 85,
      scaleDownThreshold: 30,
      cooldownPeriod: 300000,
      healthCheckInterval: 30000,
      metricsWindow: 300000,
    }
  },
  
  // Load balancing algorithms
  algorithms: {
    roundRobin: 'round_robin',
    leastConnections: 'least_connections',
    weightedRoundRobin: 'weighted_round_robin',
    ipHash: 'ip_hash',
    leastResponseTime: 'least_response_time'
  },
  
  // Health check configuration
  healthCheck: {
    timeout: 10000,
    interval: 30000,
    retries: 3,
    endpoints: {
      backend: '/health',
      frontend: '/health',
      cloud: '/health'
    }
  },
  
  // Metrics collection
  metrics: {
    collectionInterval: 60000, // 1 minute
    retentionPeriod: 3600000,  // 1 hour
    alertThresholds: {
      cpu: 90,
      memory: 95,
      responseTime: 2000,
      errorRate: 5
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

// Load Balancer Class
class LoadBalancer {
  constructor(options = {}) {
    this.options = { ...config, ...options };
    this.instances = new Map();
    this.metrics = new Map();
    this.healthStatus = new Map();
    this.scalingHistory = new Map();
    this.lastScalingAction = new Map();
    this.isRunning = false;
  }

  // =========================================================================
  // Initialization Methods
  // =========================================================================

  // Start load balancer
  async start() {
    logInfo('Starting CryptoPulse Load Balancer...');
    
    try {
      // Initialize instances
      await this.initializeInstances();
      
      // Start health checks
      await this.startHealthChecks();
      
      // Start metrics collection
      await this.startMetricsCollection();
      
      // Start auto-scaling
      await this.startAutoScaling();
      
      // Start load balancing
      await this.startLoadBalancing();
      
      this.isRunning = true;
      logSuccess('Load Balancer started successfully');
      
    } catch (error) {
      logError(`Failed to start Load Balancer: ${error.message}`);
      throw error;
    }
  }

  // Stop load balancer
  async stop() {
    logInfo('Stopping CryptoPulse Load Balancer...');
    
    try {
      this.isRunning = false;
      
      // Stop health checks
      this.stopHealthChecks();
      
      // Stop metrics collection
      this.stopMetricsCollection();
      
      // Stop auto-scaling
      this.stopAutoScaling();
      
      logSuccess('Load Balancer stopped successfully');
      
    } catch (error) {
      logError(`Failed to stop Load Balancer: ${error.message}`);
      throw error;
    }
  }

  // Initialize instances
  async initializeInstances() {
    logInfo('Initializing service instances...');
    
    const services = ['backend', 'frontend', 'cloud'];
    
    for (const service of services) {
      try {
        const instances = await this.getServiceInstances(service);
        this.instances.set(service, instances);
        logSuccess(`Initialized ${instances.length} instances for ${service}`);
      } catch (error) {
        logWarning(`Failed to initialize ${service} instances: ${error.message}`);
        this.instances.set(service, []);
      }
    }
  }

  // =========================================================================
  // Health Check Methods
  // =========================================================================

  // Start health checks
  async startHealthChecks() {
    logInfo('Starting health checks...');
    
    const services = ['backend', 'frontend', 'cloud'];
    
    for (const service of services) {
      const healthCheck = setInterval(async () => {
        await this.performHealthCheck(service);
      }, this.options.healthCheck.interval);
      
      this.healthStatus.set(`${service}_health_check`, healthCheck);
    }
    
    logSuccess('Health checks started');
  }

  // Perform health check for a service
  async performHealthCheck(service) {
    const instances = this.instances.get(service) || [];
    const endpoint = this.options.healthCheck.endpoints[service];
    
    for (const instance of instances) {
      try {
        const isHealthy = await this.checkInstanceHealth(instance, endpoint);
        this.updateInstanceHealth(service, instance, isHealthy);
      } catch (error) {
        this.updateInstanceHealth(service, instance, false, error.message);
      }
    }
  }

  // Check instance health
  async checkInstanceHealth(instance, endpoint) {
    const { spawn } = require('child_process');
    
    return new Promise((resolve) => {
      const curl = spawn('curl', [
        '-f', '-s', '-m', '10',
        `http://${instance.host}:${instance.port}${endpoint}`
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
        resolve(code === 0);
      });
      
      curl.on('error', () => {
        resolve(false);
      });
      
      // Timeout
      setTimeout(() => {
        curl.kill();
        resolve(false);
      }, this.options.healthCheck.timeout);
    });
  }

  // Update instance health status
  updateInstanceHealth(service, instance, isHealthy, error = '') {
    const status = this.healthStatus.get(`${service}_${instance.id}`) || {
      healthy: false,
      consecutiveFailures: 0,
      lastCheck: null,
      error: ''
    };
    
    const newStatus = {
      healthy: isHealthy,
      consecutiveFailures: isHealthy ? 0 : status.consecutiveFailures + 1,
      lastCheck: new Date().toISOString(),
      error: error
    };
    
    this.healthStatus.set(`${service}_${instance.id}`, newStatus);
    
    if (!isHealthy && newStatus.consecutiveFailures >= this.options.healthCheck.retries) {
      logWarning(`Instance ${instance.id} (${service}) is unhealthy: ${error}`);
      this.handleUnhealthyInstance(service, instance);
    }
  }

  // Handle unhealthy instance
  async handleUnhealthyInstance(service, instance) {
    try {
      // Remove from load balancer
      await this.removeInstance(service, instance);
      
      // Attempt to restart
      await this.restartInstance(service, instance);
      
      logInfo(`Attempted to restart unhealthy instance ${instance.id} (${service})`);
    } catch (error) {
      logError(`Failed to handle unhealthy instance ${instance.id}: ${error.message}`);
    }
  }

  // Stop health checks
  stopHealthChecks() {
    for (const [key, interval] of this.healthStatus) {
      if (key.endsWith('_health_check')) {
        clearInterval(interval);
      }
    }
    logSuccess('Health checks stopped');
  }

  // =========================================================================
  // Metrics Collection Methods
  // =========================================================================

  // Start metrics collection
  async startMetricsCollection() {
    logInfo('Starting metrics collection...');
    
    this.metricsInterval = setInterval(async () => {
      await this.collectMetrics();
    }, this.options.metrics.collectionInterval);
    
    logSuccess('Metrics collection started');
  }

  // Collect metrics
  async collectMetrics() {
    try {
      // Collect system metrics
      const systemMetrics = await this.collectSystemMetrics();
      
      // Collect service metrics
      const serviceMetrics = await this.collectServiceMetrics();
      
      // Store metrics
      this.storeMetrics('system', systemMetrics);
      
      for (const [service, metrics] of Object.entries(serviceMetrics)) {
        this.storeMetrics(service, metrics);
      }
      
      // Clean old metrics
      this.cleanOldMetrics();
      
    } catch (error) {
      logWarning(`Failed to collect metrics: ${error.message}`);
    }
  }

  // Collect system metrics
  async collectSystemMetrics() {
    const cpus = os.cpus();
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    
    return {
      cpu: {
        count: cpus.length,
        usage: await this.getCPUUsage(),
        loadAverage: os.loadavg()
      },
      memory: {
        total: totalMemory,
        used: usedMemory,
        free: freeMemory,
        usagePercentage: (usedMemory / totalMemory) * 100
      },
      timestamp: new Date().toISOString()
    };
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

  // Collect service metrics
  async collectServiceMetrics() {
    const services = ['backend', 'frontend', 'cloud'];
    const metrics = {};
    
    for (const service of services) {
      try {
        const serviceMetrics = await this.getServiceMetrics(service);
        metrics[service] = serviceMetrics;
      } catch (error) {
        logWarning(`Failed to collect metrics for ${service}: ${error.message}`);
        metrics[service] = null;
      }
    }
    
    return metrics;
  }

  // Get service metrics
  async getServiceMetrics(service) {
    try {
      // Get PM2 metrics for the service
      const { stdout } = await execAsync(`pm2 describe ${service}`);
      const processes = JSON.parse(stdout);
      
      const metrics = {
        instances: processes.length,
        healthyInstances: 0,
        totalCPU: 0,
        totalMemory: 0,
        averageResponseTime: 0,
        errorRate: 0
      };
      
      for (const process of processes) {
        if (process.pm2_env.status === 'online') {
          metrics.healthyInstances++;
          metrics.totalCPU += process.monit.cpu || 0;
          metrics.totalMemory += process.monit.memory || 0;
        }
      }
      
      if (metrics.healthyInstances > 0) {
        metrics.averageCPU = metrics.totalCPU / metrics.healthyInstances;
        metrics.averageMemory = metrics.totalMemory / metrics.healthyInstances;
      }
      
      return metrics;
    } catch (error) {
      return null;
    }
  }

  // Store metrics
  storeMetrics(service, metrics) {
    const timestamp = Date.now();
    const serviceMetrics = this.metrics.get(service) || [];
    
    serviceMetrics.push({
      timestamp,
      data: metrics
    });
    
    this.metrics.set(service, serviceMetrics);
  }

  // Clean old metrics
  cleanOldMetrics() {
    const cutoffTime = Date.now() - this.options.metrics.retentionPeriod;
    
    for (const [service, metrics] of this.metrics) {
      const filteredMetrics = metrics.filter(m => m.timestamp > cutoffTime);
      this.metrics.set(service, filteredMetrics);
    }
  }

  // Stop metrics collection
  stopMetricsCollection() {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }
    logSuccess('Metrics collection stopped');
  }

  // =========================================================================
  // Auto-Scaling Methods
  // =========================================================================

  // Start auto-scaling
  async startAutoScaling() {
    logInfo('Starting auto-scaling...');
    
    this.scalingInterval = setInterval(async () => {
      await this.evaluateScaling();
    }, 60000); // Check every minute
    
    logSuccess('Auto-scaling started');
  }

  // Evaluate scaling needs
  async evaluateScaling() {
    const services = ['backend', 'frontend', 'cloud'];
    
    for (const service of services) {
      try {
        await this.evaluateServiceScaling(service);
      } catch (error) {
        logWarning(`Failed to evaluate scaling for ${service}: ${error.message}`);
      }
    }
  }

  // Evaluate scaling for a specific service
  async evaluateServiceScaling(service) {
    const config = this.options.loadBalancer[service];
    const metrics = this.getLatestMetrics(service);
    const instances = this.instances.get(service) || [];
    
    if (!metrics || !instances.length) {
      return;
    }
    
    const currentInstances = instances.length;
    const shouldScaleUp = this.shouldScaleUp(service, metrics, config);
    const shouldScaleDown = this.shouldScaleDown(service, metrics, config);
    
    if (shouldScaleUp && currentInstances < config.maxInstances) {
      await this.scaleUp(service, currentInstances + 1);
    } else if (shouldScaleDown && currentInstances > config.minInstances) {
      await this.scaleDown(service, currentInstances - 1);
    }
  }

  // Check if should scale up
  shouldScaleUp(service, metrics, config) {
    const systemMetrics = this.getLatestMetrics('system');
    
    return (
      metrics.averageCPU > config.scaleUpThreshold ||
      metrics.averageMemory > config.scaleUpThreshold ||
      systemMetrics.cpu.usage > config.scaleUpThreshold ||
      systemMetrics.memory.usagePercentage > config.scaleUpThreshold
    );
  }

  // Check if should scale down
  shouldScaleDown(service, metrics, config) {
    const systemMetrics = this.getLatestMetrics('system');
    
    return (
      metrics.averageCPU < config.scaleDownThreshold &&
      metrics.averageMemory < config.scaleDownThreshold &&
      systemMetrics.cpu.usage < config.scaleDownThreshold &&
      systemMetrics.memory.usagePercentage < config.scaleDownThreshold
    );
  }

  // Scale up service
  async scaleUp(service, targetInstances) {
    const now = Date.now();
    const lastScaling = this.lastScalingAction.get(service) || 0;
    
    if (now - lastScaling < this.options.loadBalancer[service].cooldownPeriod) {
      return; // Still in cooldown period
    }
    
    try {
      await execAsync(`pm2 scale ${service} ${targetInstances}`);
      
      this.lastScalingAction.set(service, now);
      this.recordScalingAction(service, 'scale_up', targetInstances);
      
      logSuccess(`Scaled up ${service} to ${targetInstances} instances`);
    } catch (error) {
      logError(`Failed to scale up ${service}: ${error.message}`);
    }
  }

  // Scale down service
  async scaleDown(service, targetInstances) {
    const now = Date.now();
    const lastScaling = this.lastScalingAction.get(service) || 0;
    
    if (now - lastScaling < this.options.loadBalancer[service].cooldownPeriod) {
      return; // Still in cooldown period
    }
    
    try {
      await execAsync(`pm2 scale ${service} ${targetInstances}`);
      
      this.lastScalingAction.set(service, now);
      this.recordScalingAction(service, 'scale_down', targetInstances);
      
      logSuccess(`Scaled down ${service} to ${targetInstances} instances`);
    } catch (error) {
      logError(`Failed to scale down ${service}: ${error.message}`);
    }
  }

  // Record scaling action
  recordScalingAction(service, action, instances) {
    const history = this.scalingHistory.get(service) || [];
    
    history.push({
      action,
      instances,
      timestamp: new Date().toISOString()
    });
    
    // Keep only last 50 actions
    if (history.length > 50) {
      history.splice(0, history.length - 50);
    }
    
    this.scalingHistory.set(service, history);
  }

  // Stop auto-scaling
  stopAutoScaling() {
    if (this.scalingInterval) {
      clearInterval(this.scalingInterval);
    }
    logSuccess('Auto-scaling stopped');
  }

  // =========================================================================
  // Load Balancing Methods
  // =========================================================================

  // Start load balancing
  async startLoadBalancing() {
    logInfo('Starting load balancing...');
    
    // Update Nginx configuration with current instances
    await this.updateNginxConfig();
    
    logSuccess('Load balancing started');
  }

  // Update Nginx configuration
  async updateNginxConfig() {
    try {
      const nginxConfig = this.generateNginxConfig();
      await fs.writeFile('/tmp/nginx-upstream.conf', nginxConfig);
      
      // Reload Nginx
      await execAsync('nginx -s reload');
      
      logSuccess('Nginx configuration updated');
    } catch (error) {
      logWarning(`Failed to update Nginx configuration: ${error.message}`);
    }
  }

  // Generate Nginx configuration
  generateNginxConfig() {
    let config = '';
    
    for (const [service, instances] of this.instances) {
      config += `upstream ${service} {\n`;
      config += `    least_conn;\n`;
      
      for (const instance of instances) {
        const healthStatus = this.healthStatus.get(`${service}_${instance.id}`);
        if (healthStatus && healthStatus.healthy) {
          config += `    server ${instance.host}:${instance.port} weight=${instance.weight || 1};\n`;
        } else {
          config += `    server ${instance.host}:${instance.port} weight=${instance.weight || 1} down;\n`;
        }
      }
      
      config += `}\n\n`;
    }
    
    return config;
  }

  // =========================================================================
  // Utility Methods
  // =========================================================================

  // Get service instances
  async getServiceInstances(service) {
    try {
      const { stdout } = await execAsync(`pm2 describe ${service}`);
      const processes = JSON.parse(stdout);
      
      return processes.map((process, index) => ({
        id: `${service}-${index}`,
        host: 'localhost',
        port: process.pm2_env.PORT || this.getDefaultPort(service),
        weight: 1,
        status: process.pm2_env.status
      }));
    } catch (error) {
      return [];
    }
  }

  // Get default port for service
  getDefaultPort(service) {
    const ports = {
      backend: 1337,
      frontend: 80,
      cloud: 3001
    };
    return ports[service] || 3000;
  }

  // Get latest metrics
  getLatestMetrics(service) {
    const metrics = this.metrics.get(service);
    if (!metrics || metrics.length === 0) {
      return null;
    }
    return metrics[metrics.length - 1].data;
  }

  // Remove instance
  async removeInstance(service, instance) {
    const instances = this.instances.get(service) || [];
    const filteredInstances = instances.filter(i => i.id !== instance.id);
    this.instances.set(service, filteredInstances);
  }

  // Restart instance
  async restartInstance(service, instance) {
    try {
      await execAsync(`pm2 restart ${instance.id}`);
      logInfo(`Restarted instance ${instance.id} (${service})`);
    } catch (error) {
      logError(`Failed to restart instance ${instance.id}: ${error.message}`);
    }
  }

  // Get status
  getStatus() {
    return {
      running: this.isRunning,
      instances: Object.fromEntries(this.instances),
      healthStatus: Object.fromEntries(
        Array.from(this.healthStatus.entries())
          .filter(([key]) => !key.endsWith('_health_check'))
      ),
      scalingHistory: Object.fromEntries(this.scalingHistory),
      metrics: Object.fromEntries(
        Array.from(this.metrics.entries())
          .map(([service, metrics]) => [service, metrics.slice(-10)])
      )
    };
  }

  // Cleanup
  cleanup() {
    this.stop();
    logInfo('Load Balancer cleanup completed');
  }
}

// CLI Interface
const main = async () => {
  const args = process.argv.slice(2);
  const command = args[0];
  
  const loadBalancer = new LoadBalancer();
  
  try {
    switch (command) {
      case 'start':
        await loadBalancer.start();
        break;
      case 'stop':
        await loadBalancer.stop();
        break;
      case 'status':
        const status = loadBalancer.getStatus();
        console.log(JSON.stringify(status, null, 2));
        break;
      default:
        console.log('Usage: node scripts/load-balancer.js <start|stop|status>');
        process.exit(1);
    }
  } catch (error) {
    logError(`Command failed: ${error.message}`);
    process.exit(1);
  }
};

// Export for use as module
module.exports = {
  LoadBalancer,
  config
};

// Run if called directly
if (require.main === module) {
  main();
}
