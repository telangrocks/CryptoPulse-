/**
 * Order Management Service
 * Handles order lifecycle, status tracking
 */

class OrderManagementService {
  constructor() {
    this.db = require('../database/connection');
    this.orderStatuses = ['pending', 'filled', 'cancelled', 'rejected'];
  }

  async createOrder(orderData) {
    const order = {
      ...orderData,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    return await this.db.collection('orders').insertOne(order);
  }

  async getOrderById(orderId) {
    return await this.db.collection('orders').findOne({ _id: orderId });
  }

  async updateOrderStatus(orderId, status) {
    return await this.db.collection('orders').updateOne(
      { _id: orderId },
      { $set: { status, updatedAt: new Date() } }
    );
  }

  async getOrdersByUser(userId, filters = {}) {
    return await this.db.collection('orders').find({ userId, ...filters }).toArray();
  }

  async cancelOrder(orderId) {
    return await this.updateOrderStatus(orderId, 'cancelled');
  }
}

module.exports = new OrderManagementService();
