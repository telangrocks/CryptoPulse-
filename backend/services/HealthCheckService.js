/**
 * Health Check Service
 * Handles health monitoring, status checks
 */

class HealthCheckService {
  constructor() {
    this.checks = new Map();
  }

  async checkDatabase() {
    try {
      const db = require('../database/connection');
      await db.admin().ping();
      return { status: 'healthy', responseTime: Date.now() };
    } catch (error) {
      return { status: 'unhealthy', error: error.message };
    }
  }

  async checkRedis() {
    try {
      const redis = require('redis');
      const client = redis.createClient(process.env.REDIS_URL);
      await client.ping();
      return { status: 'healthy', responseTime: Date.now() };
    } catch (error) {
      return { status: 'unhealthy', error: error.message };
    }
  }

  async checkExternalAPIs() {
    const apis = ['binance', 'coinbase'];
    const results = {};
    
    for (const api of apis) {
      try {
        const response = await fetch(`https://api.${api}.com/v1/ping`);
        results[api] = { status: 'healthy', responseTime: Date.now() };
      } catch (error) {
        results[api] = { status: 'unhealthy', error: error.message };
      }
    }
    
    return results;
  }

  async getOverallHealth() {
    const [db, redis, apis] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkExternalAPIs()
    ]);

    return {
      database: db,
      redis,
      externalAPIs: apis,
      overall: db.status === 'healthy' && redis.status === 'healthy' ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = new HealthCheckService();
