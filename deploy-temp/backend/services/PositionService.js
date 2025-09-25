/**
 * Position Service
 * Handles position tracking, P&L calculation
 */

class PositionService {
  constructor() {
    this.db = require('../database/connection');
  }

  async getPositions(userId) {
    return await this.db.collection('positions').find({ userId }).toArray();
  }

  async updatePosition(userId, symbol, quantity, price) {
    const position = await this.db.collection('positions').findOne({ userId, symbol });
    
    if (position) {
      const newQuantity = position.quantity + quantity;
      const newAvgPrice = ((position.quantity * position.avgPrice) + (quantity * price)) / newQuantity;
      
      return await this.db.collection('positions').updateOne(
        { userId, symbol },
        { $set: { quantity: newQuantity, avgPrice: newAvgPrice, updatedAt: new Date() } }
      );
    } else {
      return await this.db.collection('positions').insertOne({
        userId,
        symbol,
        quantity,
        avgPrice: price,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
  }

  async calculatePnL(userId, symbol, currentPrice) {
    const position = await this.db.collection('positions').findOne({ userId, symbol });
    if (!position) return 0;
    
    return (currentPrice - position.avgPrice) * position.quantity;
  }
}

module.exports = new PositionService();
