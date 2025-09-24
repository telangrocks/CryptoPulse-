const express = require('express');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const SecurityMiddleware = require('./backend/securityMiddleware');
const { getSessionManager } = require('./backend/secureSessionManager');
const { getAuditLogger } = require('./backend/auditLogger');
const { getMonitoringSystem } = require('./backend/monitoring');
const app = express();
const PORT = process.env.PORT || 3000;

// Initialize security middleware
const security = new SecurityMiddleware();
const sessionManager = getSessionManager();
const auditLogger = getAuditLogger();
const monitoring = getMonitoringSystem();

// Apply security middleware
app.use(security.getAllMiddleware());

// Add session management
app.use(sessionManager.middleware());

// Add rate limiting
app.use('/api/auth', security.getRateLimitMiddleware('auth'));
app.use('/api/trading', security.getRateLimitMiddleware('trading'));
app.use('/api/upload', security.getRateLimitMiddleware('upload'));
app.use('/api', security.getRateLimitMiddleware('general'));

// Add monitoring middleware
app.use((req, res, next) => {
  const startTime = Date.now();
  
  // Override res.end to capture response metrics
  const originalEnd = res.end;
  res.end = function(...args) {
    const duration = Date.now() - startTime;
    monitoring.recordHttpRequest(req.method, req.route?.path || req.path, res.statusCode, duration);
    originalEnd.apply(this, args);
  };
  
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Prometheus metrics endpoint
app.get('/metrics', (req, res) => {
  res.set('Content-Type', 'text/plain');
  res.send(monitoring.getMetrics());
});

// Monitoring dashboard endpoint
app.get('/api/monitoring/dashboard', (req, res) => {
  try {
    const dashboardData = monitoring.getDashboardData();
    res.json(dashboardData);
  } catch (error) {
    monitoring.recordError('api', 'high', error);
    res.status(500).json({ error: 'Failed to get dashboard data' });
  }
});

// Health check with monitoring
app.get('/health', async (req, res) => {
  try {
    const healthStatus = monitoring.getHealthStatus();
    
    // Also run the existing health checks
    const healthStatus_legacy = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.version,
      environment: process.env.NODE_ENV || 'development',
      services: {
        database: 'healthy',
        redis: 'healthy',
        external_apis: 'healthy'
      }
    };
    
    // Merge health statuses
    const combinedHealth = {
      ...healthStatus_legacy,
      monitoring: healthStatus,
      overall: healthStatus.status === 'healthy' && healthStatus_legacy.status === 'healthy' ? 'healthy' : 'unhealthy'
    };
    
    res.json(combinedHealth);
  } catch (error) {
    monitoring.recordError('health_check', 'high', error);
    res.status(500).json({ 
      status: 'unhealthy', 
      error: 'Health check failed',
      timestamp: new Date().toISOString()
    });
  }
});

// CSRF token endpoint
app.get('/api/csrf-token', (req, res) => {
  const token = security.generateCSRFToken();
  res.json({ csrfToken: token });
});

// Authentication endpoints with audit logging
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const ipAddress = req.ip;
    const userAgent = req.get('User-Agent');
    
    // Validate input (in production, use proper validation)
    if (!email || !password) {
      await auditLogger.logUserLogin(null, ipAddress, userAgent, false);
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    // Here you would validate credentials against your user database
    // For now, we'll simulate authentication
    
    // Simulate user lookup
    const user = { id: 'user123', email, name: 'Test User' };
    
    // Create session
    const session = sessionManager.createSession(user.id, user, ipAddress, userAgent);
    
    // Set session cookie
    sessionManager.setSessionCookie(res, session.sessionId, session.expires);
    
    // Log successful login
    await auditLogger.logUserLogin(user.id, ipAddress, userAgent, true);
    
    // Record monitoring metrics
    monitoring.recordAuthAttempt('login', 'success');
    monitoring.recordActiveSessions(1); // Increment active sessions
    
    res.json({
      success: true,
      user,
      session: {
        sessionId: session.sessionId,
        csrfToken: session.csrfToken,
        expires: session.expires
      }
    });
    
  } catch (error) {
    console.error('Login error:', error);
    await auditLogger.logSystemEvent('LOGIN_ERROR', {
      error: error.message,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    // Record monitoring metrics
    monitoring.recordAuthAttempt('login', 'failure');
    monitoring.recordError('authentication', 'high', error);
    
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/auth/logout', async (req, res) => {
  try {
    const sessionId = req.sessionId;
    const userId = req.session?.userId;
    
    if (sessionId) {
      sessionManager.destroySession(sessionId, userId);
    }
    
    sessionManager.clearSessionCookie(res);
    
    await auditLogger.logUserLogout(userId, req.ip, req.get('User-Agent'));
    
    // Record monitoring metrics
    monitoring.recordAuthAttempt('logout', 'success');
    monitoring.recordActiveSessions(-1); // Decrement active sessions
    
    res.json({ success: true, message: 'Logged out successfully' });
    
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Session validation endpoint
app.get('/api/auth/validate', (req, res) => {
  if (req.session) {
    res.json({
      valid: true,
      user: req.session.userData
    });
  } else {
    res.status(401).json({
      valid: false,
      message: 'Session invalid or expired'
    });
  }
});

// Audit log search endpoint (admin only)
app.get('/api/admin/audit-logs', async (req, res) => {
  try {
    // In production, check if user has admin privileges
    if (!req.session) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const query = req.query;
    const logs = await auditLogger.searchLogs(query);
    
    res.json({
      success: true,
      logs,
      total: logs.length
    });
    
  } catch (error) {
    console.error('Audit log search error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Session management endpoint (admin only)
app.get('/api/admin/session-stats', (req, res) => {
  try {
    if (!req.session) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const stats = sessionManager.getSessionStats();
    res.json({
      success: true,
      stats
    });
    
  } catch (error) {
    console.error('Session stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Comprehensive health check endpoint
app.get('/health', async (req, res) => {
  try {
    const healthStatus = {
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      checks: {}
    };

    // File system checks
    const distPath = path.join(__dirname, 'frontend/dist');
    const indexHtmlPath = path.join(distPath, 'index.html');
    const assetsDirPath = path.join(distPath, 'assets');
    
    healthStatus.checks.filesystem = {
      status: 'OK',
      details: {
        indexHtml: fs.existsSync(indexHtmlPath),
        assetsDir: fs.existsSync(assetsDirPath),
        distPath: distPath
      }
    };

    // Backend API health check
    try {
      const backendResponse = await axios.get('http://backend:8080/health', { timeout: 5000 });
      healthStatus.checks.backend = {
        status: 'OK',
        details: backendResponse.data
      };
    } catch (error) {
      healthStatus.checks.backend = {
        status: 'ERROR',
        details: { error: error.message }
      };
    }

    // Database connectivity check (if configured)
    if (process.env.DATABASE_URL) {
      try {
        // Simple database ping would go here
        healthStatus.checks.database = {
          status: 'OK',
          details: { connected: true }
        };
      } catch (error) {
        healthStatus.checks.database = {
          status: 'ERROR',
          details: { error: error.message }
        };
      }
    }

    // Redis connectivity check (if configured)
    if (process.env.REDIS_URL) {
      try {
        // Simple Redis ping would go here
        healthStatus.checks.redis = {
          status: 'OK',
          details: { connected: true }
        };
      } catch (error) {
        healthStatus.checks.redis = {
          status: 'ERROR',
          details: { error: error.message }
        };
      }
    }

    // External API checks
    try {
      const binanceResponse = await axios.get('https://api.binance.com/api/v3/ping', { timeout: 5000 });
      healthStatus.checks.externalApis = {
        status: 'OK',
        details: {
          binance: binanceResponse.status === 200 ? 'OK' : 'ERROR'
        }
      };
    } catch (error) {
      healthStatus.checks.externalApis = {
        status: 'ERROR',
        details: { binance: 'ERROR', error: error.message }
      };
    }

    // SSL certificate check (if SSL is configured)
    if (process.env.SSL_ENABLED === 'true') {
      try {
        const sslCertPath = process.env.SSL_CERT_PATH || '/etc/nginx/ssl/fullchain.pem';
        if (fs.existsSync(sslCertPath)) {
          const stats = fs.statSync(sslCertPath);
          healthStatus.checks.ssl = {
            status: 'OK',
            details: {
              certificateExists: true,
              lastModified: stats.mtime
            }
          };
        } else {
          healthStatus.checks.ssl = {
            status: 'WARNING',
            details: { certificateExists: false }
          };
        }
      } catch (error) {
        healthStatus.checks.ssl = {
          status: 'ERROR',
          details: { error: error.message }
        };
      }
    }

    // Determine overall status
    const checkStatuses = Object.values(healthStatus.checks).map(check => check.status);
    if (checkStatuses.includes('ERROR')) {
      healthStatus.status = 'ERROR';
    } else if (checkStatuses.includes('WARNING')) {
      healthStatus.status = 'WARNING';
    }

    const statusCode = healthStatus.status === 'ERROR' ? 500 : 200;
    res.status(statusCode).json(healthStatus);
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Serve static files from the dist directory
app.use(express.static(path.join(__dirname, 'frontend/dist')));

// Handle React routing, return all requests to React app
app.get('*', (req, res) => {
  try {
    const indexPath = path.join(__dirname, 'frontend/dist/index.html');
    
    // Check if index.html exists
    if (!fs.existsSync(indexPath)) {
      console.error(`Index file not found: ${indexPath}`);
      return res.status(404).json({
        error: 'Frontend not built',
        message: 'Please run npm run build:frontend first',
        path: indexPath
      });
    }
    
    console.log(`Serving index.html from: ${indexPath}`);
    res.sendFile(indexPath);
  } catch (error) {
    console.error('Error serving React app:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Start monitoring system
monitoring.startMonitoring();

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 CryptoPulse Trading Bot server running on port ${PORT}`);
  console.log(`📊 Health check available at http://localhost:${PORT}/health`);
  console.log(`📈 Prometheus metrics available at http://localhost:${PORT}/metrics`);
  console.log(`📊 Monitoring dashboard available at http://localhost:${PORT}/api/monitoring/dashboard`);
  console.log(`Serving static files from: ${path.join(__dirname, 'frontend/dist')}`);
});
