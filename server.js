const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Add logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    distPath: path.join(__dirname, 'frontend/dist'),
    filesExist: {
      indexHtml: require('fs').existsSync(path.join(__dirname, 'frontend/dist/index.html')),
      assetsDir: require('fs').existsSync(path.join(__dirname, 'frontend/dist/assets'))
    }
  });
});

// Test endpoint to verify static serving
app.get('/test', (req, res) => {
  res.sendFile(path.join(__dirname, 'test.html'));
});

// Simple working app endpoint
app.get('/simple', (req, res) => {
  res.sendFile(path.join(__dirname, 'simple-app.html'));
});

// Debug endpoint to check if React assets are accessible
app.get('/debug', (req, res) => {
  const fs = require('fs');
  const distPath = path.join(__dirname, 'frontend/dist');
  
  try {
    const files = fs.readdirSync(path.join(distPath, 'assets'));
    res.json({
      status: 'OK',
      assetsPath: path.join(distPath, 'assets'),
      availableAssets: files,
      indexHtmlContent: fs.readFileSync(path.join(distPath, 'index.html'), 'utf8').substring(0, 500) + '...'
    });
  } catch (error) {
    res.json({
      status: 'ERROR',
      error: error.message,
      distPath: distPath,
      distExists: fs.existsSync(distPath),
      assetsExists: fs.existsSync(path.join(distPath, 'assets'))
    });
  }
});

// Serve static files from the dist directory
app.use(express.static(path.join(__dirname, 'frontend/dist')));

// Handle React routing, return all requests to React app
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, 'frontend/dist/index.html');
  console.log(`Serving index.html from: ${indexPath}`);
  res.sendFile(indexPath);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`CryptoPulse Trading Bot server running on port ${PORT}`);
  console.log(`Health check available at http://localhost:${PORT}/health`);
  console.log(`Serving static files from: ${path.join(__dirname, 'frontend/dist')}`);
});
