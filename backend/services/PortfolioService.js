/**
 * Portfolio Service
 * Handles portfolio management, rebalancing
 */

class PortfolioService {
  constructor() {
    this.db = require('../database/connection');
  }

  async getPortfolio(userId) {
    return await this.db.collection('portfolios').findOne({ userId });
  }

  async updatePortfolio(userId, portfolioData) {
    return await this.db.collection('portfolios').updateOne(
      { userId },
      { $set: { ...portfolioData, updatedAt: new Date() } },
      { upsert: true }
    );
  }

  async calculateTotalValue(portfolio) {
    return portfolio.assets.reduce((total, asset) => total + (asset.quantity * asset.currentPrice), 0);
  }

  async rebalancePortfolio(userId, targetAllocation) {
    const portfolio = await this.getPortfolio(userId);
    const totalValue = await this.calculateTotalValue(portfolio);
    
    const rebalancedAssets = portfolio.assets.map(asset => {
      const targetValue = totalValue * (targetAllocation[asset.symbol] || 0);
      return {
        ...asset,
        targetQuantity: targetValue / asset.currentPrice
      };
    });

    return await this.updatePortfolio(userId, { assets: rebalancedAssets });
  }
}

module.exports = new PortfolioService();
