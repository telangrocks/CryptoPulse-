#!/usr/bin/env node

// =============================================================================
// CryptoPulse Auto-Scaler - Production Ready
// =============================================================================
// Intelligent auto-scaling system for CryptoPulse infrastructure

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');
const os = require('os');

// Colors for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  reset: '\x1b[0m',
  bright: '\x1b[1m'
};

// Auto-scaling configuration
const SCALING_CONFIG = {
  services: {
    backend: {
      minReplicas: 2,
      maxReplicas: 10,
      targetCPU: 70,
      targetMemory: 80,
      targetResponseTime: 2000,
      scaleUpThreshold: 75,
      scaleDownThreshold: 25,
      cooldownPeriod: 300000, // 5 minutes
      evaluationPeriod: 60000, // 1 minute
    },
    frontend: {
      minReplicas: 1,
      maxReplicas: 5,
      targetCPU: 70,
      targetMemory: 80,
      scaleUpThreshold: 75,
      scaleDownThreshold: 25,
      cooldownPeriod: 300000,
      evaluationPeriod: 60000,
    },
    cloud: {
      minReplicas: 1,
      maxReplicas: 3,
      targetCPU: 70,
      targetMemory: 80,
      scaleUpThreshold: 75,
      scaleDownThreshold: 25,
      cooldownPeriod: 300000,
      evaluationPeriod: 60000,
    }
  },
  metrics: {
    prometheusUrl: process.env.PROMETHEUS_URL || 'http://localhost:9090',
    queryInterval: 30000, // 30 seconds
    retentionPeriod: 3600000, // 1 hour
  },
  alerts: {
    enabled: true,
    slackWebhook: process.env.SLACK_WEBHOOK_URL,
    email: process.env.ALERT_EMAIL,
  }
};

// Scaling state
const scalingState = {
  lastScaling: {},
  cooldowns: {},
  metrics: {},
  alerts: []
};

// Utility functions
function log(message, color = 'white') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

function logHeader(message) {
  log(`\n${colors.bright}${colors.cyan}${'='.repeat(60)}${colors.reset}`);
  log(`${colors.bright}${colors.cyan}${message}${colors.reset}`);
  log(`${colors.bright}${colors.cyan}${'='.repeat(60)}${colors.reset}\n`);
}

// Metrics collection
async function collectMetrics() {
  logInfo('Collecting system metrics...');
  
  try {
    const metrics = {
      timestamp: new Date().toISOString(),
      services: {},
      system: {
        cpu: await getSystemCPUUsage(),
        memory: await getSystemMemoryUsage(),
        load: os.loadavg()
      }
    };

    // Collect metrics for each service
    for (const [serviceName, config] of Object.entries(SCALING_CONFIG.services)) {
      try {
        const serviceMetrics = await getServiceMetrics(serviceName);
        metrics.services[serviceName] = serviceMetrics;
      } catch (error) {
        logWarning(`Failed to collect metrics for ${serviceName}: ${error.message}`);
        metrics.services[serviceName] = null;
      }
    }

    scalingState.metrics = metrics;
    logSuccess('Metrics collected successfully');
    return metrics;
  } catch (error) {
    logError(`Failed to collect metrics: ${error.message}`);
    throw error;
  }
}

function getSystemCPUUsage() {
  return new Promise((resolve) => {
    const startUsage = process.cpuUsage();
    setTimeout(() => {
      const endUsage = process.cpuUsage(startUsage);
      const cpuUsage = (endUsage.user + endUsage.system) / 1000000; // Convert to seconds
      resolve(cpuUsage);
    }, 100);
  });
}

function getSystemMemoryUsage() {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  
  return {
    total: totalMem,
    used: usedMem,
    free: freeMem,
    usage: (usedMem / totalMem) * 100
  };
}

async function getServiceMetrics(serviceName) {
  try {
    // Query Prometheus for service metrics
    const queries = {
      cpu: `rate(container_cpu_usage_seconds_total{name="${serviceName}"}[5m]) * 100`,
      memory: `container_memory_usage_bytes{name="${serviceName}"} / container_spec_memory_limit_bytes{name="${serviceName}"} * 100`,
      responseTime: `histogram_quantile(0.95, rate(http_request_duration_seconds_bucket{job="${serviceName}"}[5m]))`,
      requestRate: `rate(http_requests_total{job="${serviceName}"}[5m])`,
      errorRate: `rate(http_requests_total{job="${serviceName}",status=~"5.."}[5m]) / rate(http_requests_total{job="${serviceName}"}[5m]) * 100`
    };

    const metrics = {};
    
    for (const [metricName, query] of Object.entries(queries)) {
      try {
        const result = await queryPrometheus(query);
        metrics[metricName] = result;
      } catch (error) {
        logWarning(`Failed to query ${metricName} for ${serviceName}: ${error.message}`);
        metrics[metricName] = null;
      }
    }

    return metrics;
  } catch (error) {
    logError(`Failed to get metrics for ${serviceName}: ${error.message}`);
    return null;
  }
}

async function queryPrometheus(query) {
  try {
    const url = `${SCALING_CONFIG.metrics.prometheusUrl}/api/v1/query?query=${encodeURIComponent(query)}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Prometheus query failed: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.status === 'success' && data.data.result.length > 0) {
      return parseFloat(data.data.result[0].value[1]);
    }
    
    return 0;
  } catch (error) {
    logWarning(`Prometheus query failed: ${error.message}`);
    return 0;
  }
}

// Scaling decisions
function evaluateScaling(serviceName, metrics) {
  const config = SCALING_CONFIG.services[serviceName];
  if (!config || !metrics) {
    return null;
  }

  const currentReplicas = getCurrentReplicas(serviceName);
  const scalingDecision = {
    service: serviceName,
    currentReplicas,
    action: 'none',
    reason: '',
    newReplicas: currentReplicas,
    timestamp: new Date().toISOString()
  };

  // Check if in cooldown period
  if (isInCooldown(serviceName)) {
    scalingDecision.reason = 'In cooldown period';
    return scalingDecision;
  }

  // Evaluate CPU usage
  if (metrics.cpu > config.scaleUpThreshold) {
    scalingDecision.action = 'scale_up';
    scalingDecision.newReplicas = Math.min(currentReplicas + 1, config.maxReplicas);
    scalingDecision.reason = `High CPU usage: ${metrics.cpu.toFixed(1)}%`;
  } else if (metrics.cpu < config.scaleDownThreshold && currentReplicas > config.minReplicas) {
    scalingDecision.action = 'scale_down';
    scalingDecision.newReplicas = Math.max(currentReplicas - 1, config.minReplicas);
    scalingDecision.reason = `Low CPU usage: ${metrics.cpu.toFixed(1)}%`;
  }

  // Evaluate memory usage
  if (metrics.memory > config.scaleUpThreshold) {
    if (scalingDecision.action === 'none') {
      scalingDecision.action = 'scale_up';
      scalingDecision.newReplicas = Math.min(currentReplicas + 1, config.maxReplicas);
    }
    scalingDecision.reason += ` High memory usage: ${metrics.memory.toFixed(1)}%`;
  }

  // Evaluate response time
  if (metrics.responseTime > config.targetResponseTime) {
    if (scalingDecision.action === 'none') {
      scalingDecision.action = 'scale_up';
      scalingDecision.newReplicas = Math.min(currentReplicas + 1, config.maxReplicas);
    }
    scalingDecision.reason += ` High response time: ${metrics.responseTime.toFixed(0)}ms`;
  }

  return scalingDecision;
}

function getCurrentReplicas(serviceName) {
  try {
    const result = execSync(`docker-compose -f docker-compose.production.yml ps ${serviceName} --format json`, { encoding: 'utf8' });
    const containers = JSON.parse(result);
    return containers.filter(container => container.State === 'running').length;
  } catch (error) {
    logWarning(`Failed to get current replicas for ${serviceName}: ${error.message}`);
    return 1;
  }
}

function isInCooldown(serviceName) {
  const lastScaling = scalingState.lastScaling[serviceName];
  if (!lastScaling) {
    return false;
  }
  
  const cooldownPeriod = SCALING_CONFIG.services[serviceName].cooldownPeriod;
  const timeSinceLastScaling = Date.now() - new Date(lastScaling.timestamp).getTime();
  
  return timeSinceLastScaling < cooldownPeriod;
}

// Scaling execution
async function executeScaling(decision) {
  if (decision.action === 'none') {
    return;
  }

  logInfo(`Executing scaling for ${decision.service}: ${decision.action} to ${decision.newReplicas} replicas`);
  logInfo(`Reason: ${decision.reason}`);

  try {
    // Update Docker Compose file
    await updateDockerComposeReplicas(decision.service, decision.newReplicas);
    
    // Apply changes
    await applyDockerComposeChanges();
    
    // Update scaling state
    scalingState.lastScaling[decision.service] = {
      timestamp: new Date().toISOString(),
      action: decision.action,
      replicas: decision.newReplicas,
      reason: decision.reason
    };

    // Send alert
    await sendScalingAlert(decision);
    
    logSuccess(`Successfully scaled ${decision.service} to ${decision.newReplicas} replicas`);
  } catch (error) {
    logError(`Failed to execute scaling for ${decision.service}: ${error.message}`);
    throw error;
  }
}

async function updateDockerComposeReplicas(serviceName, replicas) {
  try {
    const composeFile = 'docker-compose.production.yml';
    let content = fs.readFileSync(composeFile, 'utf8');
    
    // Update replicas in deploy section
    const regex = new RegExp(`(deploy:\\s*\\n(?:\\s+[^\\n]+\\n)*?\\s+replicas:\\s*)\\d+`, 'g');
    content = content.replace(regex, `$1${replicas}`);
    
    fs.writeFileSync(composeFile, content);
    logInfo(`Updated ${composeFile} with ${replicas} replicas for ${serviceName}`);
  } catch (error) {
    logError(`Failed to update Docker Compose file: ${error.message}`);
    throw error;
  }
}

async function applyDockerComposeChanges() {
  try {
    logInfo('Applying Docker Compose changes...');
    
    // Scale services
    execSync('docker-compose -f docker-compose.production.yml up -d --scale', { stdio: 'inherit' });
    
    // Wait for services to be healthy
    await waitForHealthyServices();
    
    logSuccess('Docker Compose changes applied successfully');
  } catch (error) {
    logError(`Failed to apply Docker Compose changes: ${error.message}`);
    throw error;
  }
}

async function waitForHealthyServices() {
  logInfo('Waiting for services to be healthy...');
  
  const maxWaitTime = 300000; // 5 minutes
  const checkInterval = 10000; // 10 seconds
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWaitTime) {
    try {
      const result = execSync('docker-compose -f docker-compose.production.yml ps --format json', { encoding: 'utf8' });
      const containers = JSON.parse(result);
      
      const unhealthyContainers = containers.filter(container => 
        container.State !== 'running' || container.Health !== 'healthy'
      );
      
      if (unhealthyContainers.length === 0) {
        logSuccess('All services are healthy');
        return;
      }
      
      logInfo(`Waiting for ${unhealthyContainers.length} services to be healthy...`);
      await new Promise(resolve => setTimeout(resolve, checkInterval));
    } catch (error) {
      logWarning(`Health check failed: ${error.message}`);
      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }
  }
  
  logWarning('Timeout waiting for services to be healthy');
}

// Alerting
async function sendScalingAlert(decision) {
  if (!SCALING_CONFIG.alerts.enabled) {
    return;
  }

  const alert = {
    timestamp: new Date().toISOString(),
    service: decision.service,
    action: decision.action,
    replicas: decision.newReplicas,
    reason: decision.reason,
    severity: decision.action === 'scale_up' ? 'warning' : 'info'
  };

  scalingState.alerts.push(alert);

  try {
    // Send Slack alert
    if (SCALING_CONFIG.alerts.slackWebhook) {
      await sendSlackAlert(alert);
    }

    // Send email alert
    if (SCALING_CONFIG.alerts.email) {
      await sendEmailAlert(alert);
    }

    logInfo(`Alert sent for scaling action: ${decision.action}`);
  } catch (error) {
    logError(`Failed to send alert: ${error.message}`);
  }
}

async function sendSlackAlert(alert) {
  try {
    const message = {
      text: `🚀 CryptoPulse Auto-Scaling Alert`,
      attachments: [{
        color: alert.severity === 'warning' ? 'warning' : 'good',
        fields: [
          { title: 'Service', value: alert.service, short: true },
          { title: 'Action', value: alert.action, short: true },
          { title: 'Replicas', value: alert.replicas.toString(), short: true },
          { title: 'Reason', value: alert.reason, short: false },
          { title: 'Timestamp', value: alert.timestamp, short: true }
        ]
      }]
    };

    const response = await fetch(SCALING_CONFIG.alerts.slackWebhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message)
    });

    if (!response.ok) {
      throw new Error(`Slack alert failed: ${response.status}`);
    }
  } catch (error) {
    logError(`Failed to send Slack alert: ${error.message}`);
  }
}

async function sendEmailAlert(alert) {
  try {
    // This would integrate with an email service
    logInfo(`Email alert would be sent to ${SCALING_CONFIG.alerts.email}`);
    logInfo(`Subject: CryptoPulse Auto-Scaling - ${alert.action}`);
    logInfo(`Body: Service ${alert.service} scaled to ${alert.replicas} replicas. Reason: ${alert.reason}`);
  } catch (error) {
    logError(`Failed to send email alert: ${error.message}`);
  }
}

// Main scaling loop
async function scalingLoop() {
  logHeader('CryptoPulse Auto-Scaler');
  logInfo('Starting auto-scaling monitoring...\n');

  while (true) {
    try {
      // Collect metrics
      const metrics = await collectMetrics();
      
      // Evaluate scaling for each service
      for (const [serviceName, serviceMetrics] of Object.entries(metrics.services)) {
        const scalingDecision = evaluateScaling(serviceName, serviceMetrics);
        
        if (scalingDecision && scalingDecision.action !== 'none') {
          await executeScaling(scalingDecision);
        }
      }
      
      // Wait for next evaluation
      await new Promise(resolve => setTimeout(resolve, SCALING_CONFIG.services.backend.evaluationPeriod));
      
    } catch (error) {
      logError(`Scaling loop error: ${error.message}`);
      await new Promise(resolve => setTimeout(resolve, 30000)); // Wait 30 seconds on error
    }
  }
}

// Health check endpoint
function startHealthCheckServer() {
  const express = require('express');
  const app = express();
  
  app.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'cryptopulse-auto-scaler',
      version: '2.0.0',
      metrics: scalingState.metrics,
      scalingState: scalingState.lastScaling,
      alerts: scalingState.alerts.slice(-10) // Last 10 alerts
    });
  });
  
  app.get('/metrics', (req, res) => {
    res.json({
      timestamp: new Date().toISOString(),
      metrics: scalingState.metrics,
      scalingState: scalingState.lastScaling,
      alerts: scalingState.alerts
    });
  });
  
  const port = process.env.AUTO_SCALER_PORT || 3002;
  app.listen(port, () => {
    logInfo(`Auto-scaler health check server running on port ${port}`);
  });
}

// CLI interface
function showUsage() {
  logHeader('CryptoPulse Auto-Scaler');
  logInfo('Usage: node scripts/auto-scaler.js [command]');
  logInfo('');
  logInfo('Commands:');
  logInfo('  start     Start the auto-scaler');
  logInfo('  status    Show current scaling status');
  logInfo('  metrics   Show current metrics');
  logInfo('  reset     Reset scaling state');
  logInfo('  help      Show this help message');
  logInfo('');
  logInfo('Environment Variables:');
  logInfo('  PROMETHEUS_URL      Prometheus server URL');
  logInfo('  SLACK_WEBHOOK_URL   Slack webhook for alerts');
  logInfo('  ALERT_EMAIL         Email for alerts');
  logInfo('  AUTO_SCALER_PORT    Health check server port');
}

// Main function
async function main() {
  const command = process.argv[2];
  
  switch (command) {
    case 'start':
      startHealthCheckServer();
      await scalingLoop();
      break;
    case 'status':
      logHeader('Current Scaling Status');
      logInfo(`Last scaling actions: ${Object.keys(scalingState.lastScaling).length}`);
      Object.entries(scalingState.lastScaling).forEach(([service, state]) => {
        logInfo(`${service}: ${state.action} to ${state.replicas} replicas (${state.timestamp})`);
      });
      break;
    case 'metrics':
      logHeader('Current Metrics');
      if (scalingState.metrics.timestamp) {
        logInfo(`Last updated: ${scalingState.metrics.timestamp}`);
        logInfo(`System CPU: ${scalingState.metrics.system?.cpu || 'N/A'}`);
        logInfo(`System Memory: ${scalingState.metrics.system?.memory?.usage?.toFixed(1) || 'N/A'}%`);
      } else {
        logInfo('No metrics available. Run "start" command to begin monitoring.');
      }
      break;
    case 'reset':
      scalingState.lastScaling = {};
      scalingState.cooldowns = {};
      scalingState.alerts = [];
      logSuccess('Scaling state reset');
      break;
    case 'help':
    case '--help':
    case '-h':
      showUsage();
      break;
    default:
      logError(`Unknown command: ${command}`);
      showUsage();
      process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    logError(`Auto-scaler failed: ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  scalingLoop,
  collectMetrics,
  evaluateScaling,
  executeScaling,
  SCALING_CONFIG,
  scalingState
};
