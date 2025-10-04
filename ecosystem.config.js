// =============================================================================
// CryptoPulse PM2 Ecosystem Configuration - Production Ready
// =============================================================================
// Comprehensive process management configuration for CryptoPulse

module.exports = {
  apps: [
    // =========================================================================
    // Backend API Application
    // =========================================================================
    {
      name: 'cryptopulse-backend',
      script: 'backend/index.js',
      cwd: './backend',
      instances: 'max', // Use all available CPU cores
      exec_mode: 'cluster',
      
      // Environment configuration
      env: {
        NODE_ENV: 'development',
        PORT: 1337,
        HOST: '0.0.0.0'
      },
      
      env_production: {
        NODE_ENV: 'production',
        PORT: 1337,
        HOST: '0.0.0.0',
        // Add production environment variables
        DATABASE_URL: process.env.DATABASE_URL,
        REDIS_URL: process.env.REDIS_URL,
        MONGODB_URL: process.env.MONGODB_URL,
        JWT_SECRET: process.env.JWT_SECRET,
        ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
        CSRF_SECRET: process.env.CSRF_SECRET,
        SESSION_SECRET: process.env.SESSION_SECRET,
        LOG_LEVEL: 'info',
        ENABLE_MONITORING: 'true',
        ENABLE_TRACING: 'true'
      },
      
      env_staging: {
        NODE_ENV: 'staging',
        PORT: 1337,
        HOST: '0.0.0.0',
        LOG_LEVEL: 'debug',
        ENABLE_MONITORING: 'true',
        ENABLE_TRACING: 'true'
      },
      
      // Process management
      autorestart: true,
      watch: false, // Disable file watching in production
      max_memory_restart: '1G',
      min_uptime: '10s',
      max_restarts: 10,
      
      // Logging
      log_file: './logs/backend/combined.log',
      out_file: './logs/backend/out.log',
      error_file: './logs/backend/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      
      // Advanced process management
      kill_timeout: 5000,
      listen_timeout: 8000,
      shutdown_with_message: true,
      
      // Health monitoring
      health_check_grace_period: 3000,
      health_check_fatal_exceptions: true,
      
      // Performance monitoring
      pmx: true,
      monitoring: true,
      
      // Error handling
      error_file: './logs/backend/error.log',
      out_file: './logs/backend/out.log',
      
      // Graceful shutdown
      kill_timeout: 5000,
      wait_ready: true,
      
      // Source map support
      source_map_support: true,
      
      // Advanced restart strategies
      restart_delay: 4000,
      exp_backoff_restart_delay: 100,
      
      // Process title
      name: 'cryptopulse-backend',
      
      // Node.js specific options
      node_args: [
        '--max-old-space-size=1024',
        '--enable-source-maps',
        '--trace-warnings'
      ],
      
      // Environment-specific overrides
      env_development: {
        NODE_ENV: 'development',
        PORT: 1337,
        LOG_LEVEL: 'debug',
        ENABLE_MONITORING: 'false',
        ENABLE_TRACING: 'false'
      }
    },

    // =========================================================================
    // Cloud Services Application
    // =========================================================================
    {
      name: 'cryptopulse-cloud',
      script: 'cloud/main.js',
      cwd: './cloud',
      instances: 2, // Fixed number of instances for cloud services
      exec_mode: 'cluster',
      
      // Environment configuration
      env: {
        NODE_ENV: 'development',
        PORT: 3001,
        HOST: '0.0.0.0'
      },
      
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
        HOST: '0.0.0.0',
        DATABASE_URL: process.env.DATABASE_URL,
        REDIS_URL: process.env.REDIS_URL,
        LOG_LEVEL: 'info',
        ENABLE_MONITORING: 'true'
      },
      
      env_staging: {
        NODE_ENV: 'staging',
        PORT: 3001,
        HOST: '0.0.0.0',
        LOG_LEVEL: 'debug',
        ENABLE_MONITORING: 'true'
      },
      
      // Process management
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      min_uptime: '10s',
      max_restarts: 5,
      
      // Logging
      log_file: './logs/cloud/combined.log',
      out_file: './logs/cloud/out.log',
      error_file: './logs/cloud/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      
      // Health monitoring
      health_check_grace_period: 3000,
      
      // Performance monitoring
      pmx: true,
      monitoring: true,
      
      // Graceful shutdown
      kill_timeout: 5000,
      wait_ready: true,
      
      // Node.js specific options
      node_args: [
        '--max-old-space-size=512',
        '--enable-source-maps'
      ]
    },

    // =========================================================================
    // WebSocket Service (if needed)
    // =========================================================================
    {
      name: 'cryptopulse-websocket',
      script: 'backend/websocketServer.js',
      cwd: './backend',
      instances: 2,
      exec_mode: 'cluster',
      
      env_production: {
        NODE_ENV: 'production',
        PORT: 1338,
        HOST: '0.0.0.0',
        REDIS_URL: process.env.REDIS_URL,
        JWT_SECRET: process.env.JWT_SECRET,
        LOG_LEVEL: 'info'
      },
      
      // Process management
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      min_uptime: '10s',
      max_restarts: 5,
      
      // Logging
      log_file: './logs/websocket/combined.log',
      out_file: './logs/websocket/out.log',
      error_file: './logs/websocket/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      
      // Health monitoring
      health_check_grace_period: 3000,
      
      // Performance monitoring
      pmx: true,
      monitoring: true,
      
      // Graceful shutdown
      kill_timeout: 5000,
      wait_ready: true,
      
      // Node.js specific options
      node_args: [
        '--max-old-space-size=512'
      ]
    }
  ],

  // =========================================================================
  // Deployment Configuration
  // =========================================================================
  deploy: {
    // Production deployment
    production: {
      user: 'cryptopulse',
      host: ['production-server-1', 'production-server-2'],
      ref: 'origin/main',
      repo: 'https://github.com/your-org/Cryptopulse-.git',
      path: '/var/www/cryptopulse',
      'pre-deploy-local': '',
      'post-deploy': 'pnpm install --production && pm2 reload ecosystem.config.js --env production',
      'pre-setup': '',
      'post-setup': 'pnpm install --production'
    },
    
    // Staging deployment
    staging: {
      user: 'cryptopulse',
      host: 'staging-server',
      ref: 'origin/develop',
      repo: 'https://github.com/your-org/Cryptopulse-.git',
      path: '/var/www/cryptopulse-staging',
      'pre-deploy-local': '',
      'post-deploy': 'pnpm install --production && pm2 reload ecosystem.config.js --env staging',
      'pre-setup': '',
      'post-setup': 'pnpm install --production'
    }
  }
};
