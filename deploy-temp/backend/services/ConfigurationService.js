/**
 * Configuration Service
 * Handles configuration management
 */

class ConfigurationService {
  constructor() {
    this.config = new Map();
    this.loadConfiguration();
  }

  loadConfiguration() {
    // Load from environment variables
    this.config.set('database.url', process.env.DATABASE_URL);
    this.config.set('redis.url', process.env.REDIS_URL);
    this.config.set('jwt.secret', process.env.JWT_SECRET);
    this.config.set('api.rateLimit', process.env.RATE_LIMIT || 1000);
    this.config.set('trading.enabled', process.env.TRADING_ENABLED === 'true');
  }

  get(key, defaultValue = null) {
    return this.config.get(key) || defaultValue;
  }

  set(key, value) {
    this.config.set(key, value);
  }

  getAll() {
    return Object.fromEntries(this.config);
  }

  async reload() {
    this.loadConfiguration();
  }
}

module.exports = new ConfigurationService();
