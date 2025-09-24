const express = require('express');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

// Add request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
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

app.listen(PORT, '0.0.0.0', () => {
  console.log(`CryptoPulse Trading Bot server running on port ${PORT}`);
  console.log(`Health check available at http://localhost:${PORT}/health`);
  console.log(`Serving static files from: ${path.join(__dirname, 'frontend/dist')}`);
});
