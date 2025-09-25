#!/usr/bin/env node

/**
 * CryptoPulse Trading Bot - Production Server
 * 
 * This is the main entry point for the CryptoPulse Trading Bot application.
 * It handles all server initialization, middleware setup, and error handling.
 * 
 * @author Shrikant Telang
 * @version 1.0.0
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');
const fs = require('fs');

// Import production modules
const { structuredLogger } = require('./backend/structuredLogger');
const { monitoring } = require('./backend/monitoring');
const { errorHandler } = require('./backend/errorHandler');
const { performanceOptimizer } = require('./backend/performanceOptimizer');
const { securityMiddleware } = require('./backend/securityMiddleware');
const { environmentSecurity } = require('./backend/environmentSecurity');
const { secureSessionManager } = require('./backend/secureSessionManager');
const { rateLimiter } = require('./backend/rateLimiter');
const { featureFlagSystem } = require('./backend/featureFlagSystem');
const { complianceManager } = require('./backend/complianceManager');
const { auditLogger } = require('./backend/auditLogger');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Initialize production systems
let isShuttingDown = false;

/**
 * Graceful shutdown handler
 */
async function gracefulShutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  
  structuredLogger.info(`Received ${signal}. Starting graceful shutdown...`);
  
  try {
    // Stop accepting new connections
    server.close(() => {
      structuredLogger.info('HTTP server closed');
    });
    
    // Close database connections
    // await database.close();
    
    // Close Redis connections
    // await redisClient.quit();
    
    // Cleanup other resources
    await performanceOptimizer.cleanup();
    await featureFlagSystem.cleanup();
    await complianceManager.cleanup();
    
    structuredLogger.info('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    structuredLogger.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
}

// Register shutdown handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2')); // For nodemon

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  structuredLogger.error('Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  structuredLogger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});

/**
 * Initialize production systems
 */
async function initializeProductionSystems() {
  try {
    structuredLogger.info('Initializing production systems...');
    
    // 1. Validate environment configuration
    await environmentSecurity.validateEnvironment();
    structuredLogger.info('Environment validation completed');
    
    // 2. Initialize monitoring
    await monitoring.initializeMetrics();
    await monitoring.startMonitoring();
    structuredLogger.info('Monitoring system initialized');
    
    // 3. Initialize performance optimizer
    await performanceOptimizer.initialize();
    structuredLogger.info('Performance optimizer initialized');
    
    // 4. Initialize feature flags
    await featureFlagSystem.initialize();
    structuredLogger.info('Feature flag system initialized');
    
    // 5. Initialize compliance manager
    await complianceManager.initialize();
    structuredLogger.info('Compliance manager initialized');
    
    // 6. Initialize audit logger
    await auditLogger.initialize();
    structuredLogger.info('Audit logger initialized');
    
    structuredLogger.info('All production systems initialized successfully');
    
  } catch (error) {
    structuredLogger.error('Failed to initialize production systems:', error);
    throw error;
  }
}

/**
 * Setup middleware
 */
function setupMiddleware() {
  // Trust proxy (for rate limiting and IP detection)
  app.set('trust proxy', 1);
  
  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "https://api.binance.com", "https://parseapi.back4app.com"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false
  }));
  
  // CORS configuration
  app.use(cors({
    origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:3000', 'https://cryptopulse.app'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-CSRF-Token']
  }));
  
  // Compression
  app.use(compression());
  
  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  
  // Request logging
  app.use(monitoring.requestLogger());
  
  // Security middleware
  app.use(securityMiddleware.getAllMiddleware());
  
  // Rate limiting
  app.use('/api/', rateLimiter.createRateLimitMiddleware('general'));
  app.use('/api/auth/', rateLimiter.createRateLimitMiddleware('auth'));
  app.use('/api/trading/', rateLimiter.createRateLimitMiddleware('trading'));
  
  // Session management
  app.use(secureSessionManager.middleware());
  
  // Feature flags
  app.use(featureFlagSystem.featureFlagMiddleware(featureFlagSystem));
  
  // Performance optimization
  app.use(performanceOptimizer.middleware());
}

/**
 * Setup routes
 */
function setupRoutes() {
  // Health check endpoint
  app.get('/health', async (req, res) => {
    try {
      const healthStatus = await monitoring.getHealthStatus();
      res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: '1.0.0',
        environment: NODE_ENV,
        ...healthStatus
      });
    } catch (error) {
      structuredLogger.error('Health check failed:', error);
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message
      });
    }
  });
  
  // Metrics endpoint for Prometheus
  app.get('/metrics', async (req, res) => {
    try {
      const metrics = await monitoring.getMetrics();
      res.set('Content-Type', 'text/plain');
      res.send(metrics);
    } catch (error) {
      structuredLogger.error('Metrics endpoint failed:', error);
      res.status(500).json({ error: 'Failed to retrieve metrics' });
    }
  });
  
  // API routes
  app.use('/api/auth', require('./backend/routes/auth'));
  app.use('/api/trading', require('./backend/routes/trading'));
  app.use('/api/portfolio', require('./backend/routes/portfolio'));
  app.use('/api/market', require('./backend/routes/market'));
  app.use('/api/admin', require('./backend/routes/admin'));
  
  // Serve static files in production
  if (NODE_ENV === 'production') {
    const frontendPath = path.join(__dirname, 'frontend', 'dist');
    
    if (fs.existsSync(frontendPath)) {
      app.use(express.static(frontendPath));
      
      // SPA fallback
      app.get('*', (req, res) => {
        res.sendFile(path.join(frontendPath, 'index.html'));
      });
    } else {
      structuredLogger.warn('Frontend build not found. Serving API only.');
    }
  }
  
  // 404 handler
  app.use('*', (req, res) => {
    res.status(404).json({
      error: 'Not Found',
      message: 'The requested resource was not found',
      timestamp: new Date().toISOString()
    });
  });
}

/**
 * Setup error handling
 */
function setupErrorHandling() {
  // Global error handler
  app.use(errorHandler.globalErrorHandler);
  
  // Handle 404 errors
  app.use((req, res, next) => {
    const error = new Error('Not Found');
    error.status = 404;
    next(error);
  });
}

/**
 * Start server
 */
async function startServer() {
  try {
    // Initialize production systems
    await initializeProductionSystems();
    
    // Setup middleware
    setupMiddleware();
    
    // Setup routes
    setupRoutes();
    
    // Setup error handling
    setupErrorHandling();
    
    // Start server
    const server = app.listen(PORT, () => {
      structuredLogger.info(`CryptoPulse Trading Bot server started on port ${PORT}`);
      structuredLogger.info(`Environment: ${NODE_ENV}`);
      structuredLogger.info(`Health check: http://localhost:${PORT}/health`);
      structuredLogger.info(`Metrics: http://localhost:${PORT}/metrics`);
    });
    
    // Handle server errors
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        structuredLogger.error(`Port ${PORT} is already in use`);
        process.exit(1);
      } else {
        structuredLogger.error('Server error:', error);
        throw error;
      }
    });
    
    return server;
    
  } catch (error) {
    structuredLogger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
if (require.main === module) {
  startServer().catch((error) => {
    structuredLogger.error('Fatal error starting server:', error);
    process.exit(1);
  });
}

module.exports = { app, startServer };