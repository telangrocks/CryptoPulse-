/**
 * Test Data Service
 * Handles test data management
 */

class TestDataService {
  constructor() {
    this.testData = new Map();
  }

  async generateUserData() {
    return {
      email: `test${Date.now()}@example.com`,
      password: 'TestPassword123!',
      username: `testuser${Date.now()}`,
      firstName: 'Test',
      lastName: 'User',
      role: 'user'
    };
  }

  async generateTradingData() {
    return {
      symbol: 'BTC/USDT',
      side: 'BUY',
      amount: 0.001,
      price: 50000,
      orderType: 'LIMIT'
    };
  }

  async generatePortfolioData() {
    return {
      assets: [
        { symbol: 'BTC', quantity: 0.5, currentPrice: 50000 },
        { symbol: 'ETH', quantity: 2.0, currentPrice: 3000 }
      ],
      totalValue: 31000
    };
  }

  async cleanupTestData() {
    const db = require('../database/connection');
    await db.collection('users').deleteMany({ email: /test.*@example\.com/ });
    await db.collection('orders').deleteMany({ testData: true });
    await db.collection('portfolios').deleteMany({ testData: true });
  }
}

module.exports = new TestDataService();
