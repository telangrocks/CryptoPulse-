/**
 * Audit Trail Service
 * Handles financial audit logging
 */

class AuditTrailService {
  constructor() {
    this.db = require('../database/connection');
  }

  async logAction(userId, action, resource, details = {}) {
    const auditLog = {
      id: require('uuid').v4(),
      userId,
      action,
      resource,
      details,
      timestamp: new Date(),
      ip: details.ip || 'unknown',
      userAgent: details.userAgent || 'unknown'
    };

    return await this.db.collection('audit_logs').insertOne(auditLog);
  }

  async getAuditLogs(userId, filters = {}) {
    const query = { userId, ...filters };
    return await this.db.collection('audit_logs').find(query).sort({ timestamp: -1 }).toArray();
  }

  async logTradeExecution(userId, tradeData) {
    return await this.logAction(userId, 'TRADE_EXECUTION', 'trading', {
      symbol: tradeData.symbol,
      side: tradeData.side,
      amount: tradeData.amount,
      price: tradeData.price
    });
  }

  async logLogin(userId, ip, userAgent) {
    return await this.logAction(userId, 'LOGIN', 'authentication', { ip, userAgent });
  }

  async logLogout(userId, ip) {
    return await this.logAction(userId, 'LOGOUT', 'authentication', { ip });
  }
}

module.exports = new AuditTrailService();
