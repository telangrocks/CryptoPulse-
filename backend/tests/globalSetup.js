/**
 * Global Jest Setup
 * 
 * This file runs once before all tests start.
 * It sets up the global test environment.
 * 
 * @author Shrikant Telang
 * @version 1.0.0
 */

module.exports = async () => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.LOG_LEVEL = 'error';
  process.env.ENABLE_CONSOLE_LOGS = 'false';
  
  // Set test database URLs
  process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/cryptopulse_test';
  process.env.REDIS_URL = 'redis://localhost:6379/1';
  
  // Set test secrets
  process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
  process.env.ENCRYPTION_KEY = 'test-encryption-key-for-testing-only-32-chars';
  process.env.SESSION_SECRET = 'test-session-secret-for-testing-only';
  process.env.CSRF_SECRET = 'test-csrf-secret-for-testing-only';
  
  // Set test API keys
  process.env.BINANCE_API_KEY = 'test-binance-api-key';
  process.env.BINANCE_SECRET_KEY = 'test-binance-secret-key';
  
  // Set test email configuration
  process.env.SMTP_HOST = 'localhost';
  process.env.SMTP_PORT = '587';
  process.env.SMTP_USER = 'test@example.com';
  process.env.SMTP_PASSWORD = 'test-password';
  
  // Set test monitoring configuration
  process.env.PROMETHEUS_PORT = '9090';
  process.env.GRAFANA_PORT = '3001';
  
  // Set test rate limiting
  process.env.RATE_LIMIT_WINDOW_MS = '60000';
  process.env.RATE_LIMIT_MAX_REQUESTS = '1000';
  
  // Set test CORS
  process.env.ALLOWED_ORIGINS = 'http://localhost:3000,http://localhost:8080';
  
  // Set test SSL configuration
  process.env.SSL_CERT_PATH = './test-ssl/cert.pem';
  process.env.SSL_KEY_PATH = './test-ssl/key.pem';
  
  // Set test file upload
  process.env.MAX_FILE_SIZE = '10485760'; // 10MB
  process.env.UPLOAD_PATH = './test-uploads';
  
  // Set test cache configuration
  process.env.CACHE_TTL = '3600';
  process.env.CACHE_MAX_SIZE = '1000';
  
  // Set test feature flags
  process.env.ENABLE_FEATURE_FLAGS = 'true';
  process.env.ENABLE_AUDIT_LOGGING = 'true';
  process.env.ENABLE_COMPLIANCE = 'true';
  process.env.ENABLE_MONITORING = 'true';
  
  // Set test trading configuration
  process.env.TRADING_ENABLED = 'true';
  process.env.MAX_TRADE_AMOUNT = '10000';
  process.env.MIN_TRADE_AMOUNT = '10';
  process.env.TRADING_FEE_PERCENTAGE = '0.001';
  
  // Set test risk management
  process.env.MAX_PORTFOLIO_RISK = '0.2';
  process.env.STOP_LOSS_PERCENTAGE = '0.05';
  process.env.TAKE_PROFIT_PERCENTAGE = '0.15';
  
  // Set test backup configuration
  process.env.BACKUP_ENABLED = 'true';
  process.env.BACKUP_SCHEDULE = '0 2 * * *';
  process.env.BACKUP_RETENTION_DAYS = '30';
  
  // Set test alert configuration
  process.env.ALERT_EMAIL = 'test@example.com';
  process.env.ALERT_SLACK_WEBHOOK = 'https://hooks.slack.com/services/test';
  process.env.ALERT_DISCORD_WEBHOOK = 'https://discord.com/api/webhooks/test';
  
  // Set test development configuration
  process.env.ENABLE_DEBUG = 'false';
  process.env.ENABLE_PROFILING = 'false';
  process.env.ENABLE_MOCK_DATA = 'true';
  
  console.log('Global test setup completed');
};

