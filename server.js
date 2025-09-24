const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;

// Add request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  try {
    const distPath = path.join(__dirname, 'frontend/dist');
    const indexHtmlPath = path.join(distPath, 'index.html');
    const assetsDirPath = path.join(distPath, 'assets');
    
    const healthStatus = {
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      distPath,
      filesExist: {
        indexHtml: fs.existsSync(indexHtmlPath),
        assetsDir: fs.existsSync(assetsDirPath)
      }
    };
    
    // Check if critical files exist
    if (!healthStatus.filesExist.indexHtml) {
      healthStatus.status = 'WARNING';
      healthStatus.message = 'Frontend build files not found';
    }
    
    res.status(200).json(healthStatus);
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
