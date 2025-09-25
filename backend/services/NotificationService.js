/**
 * Notification Service
 * Handles notification management
 */

class NotificationService {
  constructor() {
    this.emailService = require('./EmailService');
    this.channels = ['email', 'push', 'sms'];
  }

  async sendNotification(userId, type, message, metadata = {}) {
    const notification = {
      id: require('uuid').v4(),
      userId,
      type,
      message,
      metadata,
      status: 'pending',
      createdAt: new Date()
    };

    // Store notification
    await this.storeNotification(notification);

    // Send via appropriate channels
    await this.deliverNotification(notification);

    return notification;
  }

  async storeNotification(notification) {
    const db = require('../database/connection');
    return await db.collection('notifications').insertOne(notification);
  }

  async deliverNotification(notification) {
    const user = await this.getUser(notification.userId);
    const preferences = await this.getUserPreferences(notification.userId);

    if (preferences.email && notification.type === 'trading') {
      await this.emailService.sendEmail(
        user.email,
        'Trading Notification',
        notification.message
      );
    }
  }

  async getUser(userId) {
    const db = require('../database/connection');
    return await db.collection('users').findOne({ _id: userId });
  }

  async getUserPreferences(userId) {
    const db = require('../database/connection');
    const prefs = await db.collection('user_preferences').findOne({ userId });
    return prefs || { email: true, push: true, sms: false };
  }
}

module.exports = new NotificationService();
