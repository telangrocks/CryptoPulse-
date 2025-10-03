#!/usr/bin/env node

// =============================================================================
// CryptoPulse Deployment Automation - Production Ready
// =============================================================================
// Comprehensive deployment automation system for CryptoPulse

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');
const crypto = require('crypto');

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

// Deployment configuration
const DEPLOYMENT_CONFIG = {
  environments: {
    development: {
      namespace: 'cryptopulse-dev',
      domain: 'dev.cryptopulse.com',
      replicas: { backend: 1, frontend: 1, cloud: 1 },
      resources: { cpu: '100m', memory: '256Mi' }
    },
    staging: {
      namespace: 'cryptopulse-staging',
      domain: 'staging.cryptopulse.com',
      replicas: { backend: 2, frontend: 1, cloud: 2 },
      resources: { cpu: '500m', memory: '512Mi' }
    },
    production: {
      namespace: 'cryptopulse-prod',
      domain: 'cryptopulse.com',
      replicas: { backend: 3, frontend: 2, cloud: 3 },
      resources: { cpu: '1000m', memory: '1Gi' }
    }
  },
  services: ['backend', 'frontend', 'cloud'],
  healthCheckTimeout: 300000, // 5 minutes
  rollbackTimeout: 600000, // 10 minutes
  deploymentTimeout: 1800000 // 30 minutes
};

// Deployment state
const deploymentState = {
  current: null,
  history: [],
  rollbacks: [],
  metrics: {
    deployments: 0,
    successes: 0,
    failures: 0,
    rollbacks: 0
  }
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

// Validation functions
async function validateEnvironment(environment) {
  logInfo(`Validating environment: ${environment}`);
  
  const config = DEPLOYMENT_CONFIG.environments[environment];
  if (!config) {
    throw new Error(`Unknown environment: ${environment}`);
  }

  // Check required files
  const requiredFiles = [
    `env-templates/backend.env.${environment}`,
    `env-templates/frontend.env.${environment}`,
    'docker-compose.production.yml',
    'Dockerfile'
  ];

  for (const file of requiredFiles) {
    if (!fs.existsSync(file)) {
      throw new Error(`Required file missing: ${file}`);
    }
  }

  // Validate configuration
  try {
    execSync('node scripts/config-validator.js', { stdio: 'inherit' });
    execSync('node scripts/infrastructure-validator.js', { stdio: 'inherit' });
  } catch (error) {
    throw new Error(`Configuration validation failed: ${error.message}`);
  }

  logSuccess(`Environment validation passed: ${environment}`);
  return config;
}

async function validateDependencies() {
  logInfo('Validating deployment dependencies...');
  
  const dependencies = ['docker', 'pnpm', 'node'];
  
  for (const dep of dependencies) {
    try {
      execSync(`which ${dep}`, { stdio: 'pipe' });
      logSuccess(`Dependency found: ${dep}`);
    } catch (error) {
      throw new Error(`Missing dependency: ${dep}`);
    }
  }

  // Check Docker daemon
  try {
    execSync('docker info', { stdio: 'pipe' });
    logSuccess('Docker daemon is running');
  } catch (error) {
    throw new Error('Docker daemon is not running');
  }

  logSuccess('All dependencies validated');
}

// Build functions
async function buildServices(environment, services = ['all']) {
  logHeader(`Building Services for ${environment}`);
  
  const config = DEPLOYMENT_CONFIG.environments[environment];
  const servicesToBuild = services.includes('all') ? DEPLOYMENT_CONFIG.services : services;
  
  const buildResults = {};
  
  for (const service of servicesToBuild) {
    try {
      logInfo(`Building ${service}...`);
      
      switch (service) {
        case 'backend':
          buildResults.backend = await buildBackend(environment);
          break;
        case 'frontend':
          buildResults.frontend = await buildFrontend(environment);
          break;
        case 'cloud':
          buildResults.cloud = await buildCloud(environment);
          break;
      }
      
      logSuccess(`${service} build completed`);
    } catch (error) {
      logError(`Failed to build ${service}: ${error.message}`);
      throw error;
    }
  }

  return buildResults;
}

async function buildBackend(environment) {
  const config = DEPLOYMENT_CONFIG.environments[environment];
  
  // Install dependencies
  execSync('pnpm install --frozen-lockfile', { stdio: 'inherit' });
  
  // Run tests
  execSync('pnpm test:backend', { stdio: 'inherit' });
  
  // Build application
  execSync('pnpm build:backend', { stdio: 'inherit' });
  
  // Build Docker image
  const imageTag = `cryptopulse-backend:${environment}-${Date.now()}`;
  execSync(`docker build -t ${imageTag} ./backend`, { stdio: 'inherit' });
  
  return { imageTag, service: 'backend' };
}

async function buildFrontend(environment) {
  const config = DEPLOYMENT_CONFIG.environments[environment];
  
  // Install dependencies
  execSync('cd frontend && pnpm install --frozen-lockfile', { stdio: 'inherit' });
  
  // Run tests
  execSync('cd frontend && pnpm test', { stdio: 'inherit' });
  
  // Build application
  execSync('cd frontend && pnpm build', { stdio: 'inherit' });
  
  // Build Docker image
  const imageTag = `cryptopulse-frontend:${environment}-${Date.now()}`;
  execSync(`docker build -t ${imageTag} ./frontend`, { stdio: 'inherit' });
  
  return { imageTag, service: 'frontend' };
}

async function buildCloud(environment) {
  const config = DEPLOYMENT_CONFIG.environments[environment];
  
  // Install dependencies
  execSync('cd cloud && pnpm install --frozen-lockfile', { stdio: 'inherit' });
  
  // Run tests
  execSync('cd cloud && pnpm test', { stdio: 'inherit' });
  
  // Build Docker image
  const imageTag = `cryptopulse-cloud:${environment}-${Date.now()}`;
  execSync(`docker build -t ${imageTag} ./cloud`, { stdio: 'inherit' });
  
  return { imageTag, service: 'cloud' };
}

// Deployment functions
async function deployServices(environment, services, buildResults) {
  logHeader(`Deploying Services to ${environment}`);
  
  const config = DEPLOYMENT_CONFIG.environments[environment];
  const servicesToDeploy = services.includes('all') ? DEPLOYMENT_CONFIG.services : services;
  
  const deploymentResults = {};
  
  for (const service of servicesToDeploy) {
    try {
      logInfo(`Deploying ${service}...`);
      
      const buildResult = buildResults[service];
      if (!buildResult) {
        throw new Error(`No build result found for ${service}`);
      }

      switch (service) {
        case 'backend':
          deploymentResults.backend = await deployBackend(environment, buildResult, config);
          break;
        case 'frontend':
          deploymentResults.frontend = await deployFrontend(environment, buildResult, config);
          break;
        case 'cloud':
          deploymentResults.cloud = await deployCloud(environment, buildResult, config);
          break;
      }
      
      logSuccess(`${service} deployment completed`);
    } catch (error) {
      logError(`Failed to deploy ${service}: ${error.message}`);
      throw error;
    }
  }

  return deploymentResults;
}

async function deployBackend(environment, buildResult, config) {
  // Update docker-compose with new image
  const composeFile = 'docker-compose.production.yml';
  let content = fs.readFileSync(composeFile, 'utf8');
  
  // Replace image tag
  content = content.replace(
    /image: cryptopulse-backend:.*/g,
    `image: ${buildResult.imageTag}`
  );
  
  fs.writeFileSync(composeFile, content);
  
  // Deploy using docker-compose
  execSync(`docker-compose -f ${composeFile} up -d backend`, { stdio: 'inherit' });
  
  // Wait for health check
  await waitForHealthCheck('backend', config);
  
  return { service: 'backend', status: 'deployed' };
}

async function deployFrontend(environment, buildResult, config) {
  // Update docker-compose with new image
  const composeFile = 'docker-compose.production.yml';
  let content = fs.readFileSync(composeFile, 'utf8');
  
  // Replace image tag
  content = content.replace(
    /image: cryptopulse-frontend:.*/g,
    `image: ${buildResult.imageTag}`
  );
  
  fs.writeFileSync(composeFile, content);
  
  // Deploy using docker-compose
  execSync(`docker-compose -f ${composeFile} up -d frontend`, { stdio: 'inherit' });
  
  // Wait for health check
  await waitForHealthCheck('frontend', config);
  
  return { service: 'frontend', status: 'deployed' };
}

async function deployCloud(environment, buildResult, config) {
  // Update docker-compose with new image
  const composeFile = 'docker-compose.production.yml';
  let content = fs.readFileSync(composeFile, 'utf8');
  
  // Replace image tag
  content = content.replace(
    /image: cryptopulse-cloud:.*/g,
    `image: ${buildResult.imageTag}`
  );
  
  fs.writeFileSync(composeFile, content);
  
  // Deploy using docker-compose
  execSync(`docker-compose -f ${composeFile} up -d cloud`, { stdio: 'inherit' });
  
  // Wait for health check
  await waitForHealthCheck('cloud', config);
  
  return { service: 'cloud', status: 'deployed' };
}

async function waitForHealthCheck(service, config) {
  logInfo(`Waiting for ${service} health check...`);
  
  const maxAttempts = 30;
  const interval = 10000; // 10 seconds
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      // Check service health
      const healthUrl = `http://localhost:${getServicePort(service)}/health`;
      execSync(`curl -f ${healthUrl}`, { stdio: 'pipe' });
      
      logSuccess(`${service} is healthy`);
      return true;
    } catch (error) {
      if (attempt === maxAttempts) {
        throw new Error(`${service} health check failed after ${maxAttempts} attempts`);
      }
      
      logInfo(`${service} health check attempt ${attempt}/${maxAttempts} failed, retrying...`);
      await new Promise(resolve => setTimeout(resolve, interval));
    }
  }
}

function getServicePort(service) {
  const ports = {
    backend: 1337,
    frontend: 3000,
    cloud: 3001
  };
  return ports[service] || 3000;
}

// Rollback functions
async function rollbackDeployment(environment, services) {
  logHeader(`Rolling Back Deployment in ${environment}`);
  
  const config = DEPLOYMENT_CONFIG.environments[environment];
  const servicesToRollback = services.includes('all') ? DEPLOYMENT_CONFIG.services : services;
  
  const rollbackResults = {};
  
  for (const service of servicesToRollback) {
    try {
      logInfo(`Rolling back ${service}...`);
      
      // Get previous deployment
      const previousDeployment = getPreviousDeployment(service, environment);
      if (!previousDeployment) {
        logWarning(`No previous deployment found for ${service}, skipping rollback`);
        continue;
      }

      // Rollback to previous version
      rollbackResults[service] = await rollbackService(service, previousDeployment, config);
      
      logSuccess(`${service} rollback completed`);
    } catch (error) {
      logError(`Failed to rollback ${service}: ${error.message}`);
      throw error;
    }
  }

  // Update deployment state
  deploymentState.rollbacks.push({
    timestamp: new Date().toISOString(),
    environment,
    services: servicesToRollback,
    results: rollbackResults
  });
  
  deploymentState.metrics.rollbacks++;

  return rollbackResults;
}

function getPreviousDeployment(service, environment) {
  // Find the last successful deployment for this service and environment
  const history = deploymentState.history.filter(d => 
    d.environment === environment && 
    d.results[service] && 
    d.results[service].status === 'deployed'
  );
  
  return history.length > 0 ? history[history.length - 1] : null;
}

async function rollbackService(service, previousDeployment, config) {
  // Implement rollback logic based on deployment method
  // For now, we'll use docker-compose to rollback
  
  const composeFile = 'docker-compose.production.yml';
  
  // Restore previous image
  const previousBuildResult = previousDeployment.buildResults[service];
  if (previousBuildResult) {
    let content = fs.readFileSync(composeFile, 'utf8');
    content = content.replace(
      /image: cryptopulse-${service}:.*/g,
      `image: ${previousBuildResult.imageTag}`
    );
    fs.writeFileSync(composeFile, content);
  }
  
  // Restart service
  execSync(`docker-compose -f ${composeFile} restart ${service}`, { stdio: 'inherit' });
  
  // Wait for health check
  await waitForHealthCheck(service, config);
  
  return { service, status: 'rolled_back' };
}

// Monitoring and validation
async function runPostDeploymentTests(environment, services) {
  logHeader('Running Post-Deployment Tests');
  
  const config = DEPLOYMENT_CONFIG.environments[environment];
  
  try {
    // Health checks
    logInfo('Running health checks...');
    for (const service of services) {
      const port = getServicePort(service);
      execSync(`curl -f http://localhost:${port}/health`, { stdio: 'inherit' });
      logSuccess(`${service} health check passed`);
    }

    // Smoke tests
    logInfo('Running smoke tests...');
    execSync('pnpm test:smoke', { stdio: 'inherit' });
    logSuccess('Smoke tests passed');

    // Integration tests
    logInfo('Running integration tests...');
    execSync('pnpm test:integration', { stdio: 'inherit' });
    logSuccess('Integration tests passed');

    // Performance tests
    logInfo('Running performance tests...');
    execSync('pnpm test:performance', { stdio: 'inherit' });
    logSuccess('Performance tests passed');

  } catch (error) {
    logError(`Post-deployment tests failed: ${error.message}`);
    throw error;
  }

  logSuccess('All post-deployment tests passed');
}

// Deployment orchestration
async function deploy(environment, services = ['all'], options = {}) {
  const startTime = Date.now();
  
  try {
    logHeader(`Starting Deployment to ${environment}`);
    logInfo(`Services: ${services.join(', ')}`);
    logInfo(`Environment: ${environment}`);
    
    // Validate prerequisites
    await validateEnvironment(environment);
    await validateDependencies();
    
    // Build services
    const buildResults = await buildServices(environment, services);
    
    // Deploy services
    const deploymentResults = await deployServices(environment, services, buildResults);
    
    // Run post-deployment tests
    await runPostDeploymentTests(environment, services);
    
    // Update deployment state
    const deployment = {
      timestamp: new Date().toISOString(),
      environment,
      services,
      buildResults,
      results: deploymentResults,
      duration: Date.now() - startTime,
      status: 'success'
    };
    
    deploymentState.current = deployment;
    deploymentState.history.push(deployment);
    deploymentState.metrics.deployments++;
    deploymentState.metrics.successes++;
    
    logSuccess(`Deployment completed successfully in ${(deployment.duration / 1000).toFixed(2)} seconds`);
    
    return deployment;
    
  } catch (error) {
    // Update metrics
    deploymentState.metrics.deployments++;
    deploymentState.metrics.failures++;
    
    logError(`Deployment failed: ${error.message}`);
    
    // Attempt rollback if configured
    if (options.autoRollback !== false) {
      logWarning('Attempting automatic rollback...');
      try {
        await rollbackDeployment(environment, services);
        logSuccess('Automatic rollback completed');
      } catch (rollbackError) {
        logError(`Rollback failed: ${rollbackError.message}`);
      }
    }
    
    throw error;
  }
}

// Utility functions
function getDeploymentStatus() {
  return {
    current: deploymentState.current,
    metrics: deploymentState.metrics,
    recentDeployments: deploymentState.history.slice(-5),
    recentRollbacks: deploymentState.rollbacks.slice(-5)
  };
}

function getDeploymentHistory(limit = 10) {
  return deploymentState.history.slice(-limit);
}

function getRollbackHistory(limit = 10) {
  return deploymentState.rollbacks.slice(-limit);
}

// CLI interface
function showUsage() {
  logHeader('CryptoPulse Deployment Automation');
  logInfo('Usage: node scripts/deployment-automation.js [command] [options]');
  logInfo('');
  logInfo('Commands:');
  logInfo('  deploy <env> [services]    Deploy to environment');
  logInfo('  rollback <env> [services]  Rollback deployment');
  logInfo('  status                     Show deployment status');
  logInfo('  history [limit]            Show deployment history');
  logInfo('  validate <env>             Validate environment');
  logInfo('  build <env> [services]     Build services');
  logInfo('  help                       Show this help');
  logInfo('');
  logInfo('Environments:');
  logInfo('  development                Development environment');
  logInfo('  staging                    Staging environment');
  logInfo('  production                 Production environment');
  logInfo('');
  logInfo('Services:');
  logInfo('  all                        All services (default)');
  logInfo('  backend                    Backend service only');
  logInfo('  frontend                   Frontend service only');
  logInfo('  cloud                      Cloud functions only');
  logInfo('');
  logInfo('Examples:');
  logInfo('  node scripts/deployment-automation.js deploy production');
  logInfo('  node scripts/deployment-automation.js deploy staging backend frontend');
  logInfo('  node scripts/deployment-automation.js rollback production');
  logInfo('  node scripts/deployment-automation.js status');
}

// Main function
async function main() {
  const command = process.argv[2];
  
  try {
    switch (command) {
      case 'deploy':
        const environment = process.argv[3];
        const services = process.argv.slice(4) || ['all'];
        if (!environment) {
          logError('Environment is required for deploy command');
          process.exit(1);
        }
        await deploy(environment, services);
        break;
        
      case 'rollback':
        const rollbackEnv = process.argv[3];
        const rollbackServices = process.argv.slice(4) || ['all'];
        if (!rollbackEnv) {
          logError('Environment is required for rollback command');
          process.exit(1);
        }
        await rollbackDeployment(rollbackEnv, rollbackServices);
        break;
        
      case 'status':
        logHeader('Deployment Status');
        const status = getDeploymentStatus();
        logInfo(`Current deployment: ${status.current ? status.current.environment : 'None'}`);
        logInfo(`Total deployments: ${status.metrics.deployments}`);
        logInfo(`Successful: ${status.metrics.successes}`);
        logInfo(`Failed: ${status.metrics.failures}`);
        logInfo(`Rollbacks: ${status.metrics.rollbacks}`);
        break;
        
      case 'history':
        const limit = parseInt(process.argv[3]) || 10;
        logHeader('Deployment History');
        const history = getDeploymentHistory(limit);
        history.forEach((deployment, index) => {
          logInfo(`${index + 1}. ${deployment.environment} - ${deployment.services.join(', ')} - ${deployment.status} - ${new Date(deployment.timestamp).toLocaleString()}`);
        });
        break;
        
      case 'validate':
        const validateEnv = process.argv[3];
        if (!validateEnv) {
          logError('Environment is required for validate command');
          process.exit(1);
        }
        await validateEnvironment(validateEnv);
        break;
        
      case 'build':
        const buildEnv = process.argv[3];
        const buildServices = process.argv.slice(4) || ['all'];
        if (!buildEnv) {
          logError('Environment is required for build command');
          process.exit(1);
        }
        await buildServices(buildEnv, buildServices);
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
  } catch (error) {
    logError(`Command failed: ${error.message}`);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  deploy,
  rollbackDeployment,
  getDeploymentStatus,
  getDeploymentHistory,
  getRollbackHistory,
  validateEnvironment,
  buildServices,
  DEPLOYMENT_CONFIG,
  deploymentState
};
