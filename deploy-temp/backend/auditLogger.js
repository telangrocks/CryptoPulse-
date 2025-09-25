/**
 * Production-ready Audit Logging System
 * Comprehensive audit trails for security events and user actions
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

class AuditLogger {
  constructor(options = {}) {
    this.options = {
      logDirectory: options.logDirectory || './logs/audit',
      maxFileSize: options.maxFileSize || 10 * 1024 * 1024, // 10MB
      maxFiles: options.maxFiles || 5,
      logLevel: options.logLevel || 'info',
      enableEncryption: options.enableEncryption || false,
      encryptionKey: options.encryptionKey || process.env.AUDIT_ENCRYPTION_KEY,
      ...options
    };
    
    this.ensureLogDirectory();
    this.initializeEncryption();
  }

  ensureLogDirectory() {
    if (!fs.existsSync(this.options.logDirectory)) {
      fs.mkdirSync(this.options.logDirectory, { recursive: true });
    }
  }

  initializeEncryption() {
    if (this.options.enableEncryption && this.options.encryptionKey) {
      this.cipher = crypto.createCipher('aes-256-gcm', this.options.encryptionKey);
    }
  }

  generateAuditId() {
    return crypto.randomUUID();
  }

  createAuditEntry(event, details = {}) {
    const timestamp = new Date().toISOString();
    const auditId = this.generateAuditId();
    
    return {
      auditId,
      timestamp,
      event,
      details: {
        ...details,
        userAgent: details.userAgent || 'unknown',
        ipAddress: details.ipAddress || 'unknown',
        sessionId: details.sessionId || 'unknown'
      },
      severity: this.getEventSeverity(event),
      hash: this.generateHash(event, details)
    };
  }

  getEventSeverity(event) {
    const severityMap = {
      // Authentication events
      'USER_LOGIN': 'info',
      'USER_LOGOUT': 'info',
      'LOGIN_FAILED': 'warn',
      'PASSWORD_RESET': 'warn',
      'ACCOUNT_LOCKED': 'error',
      
      // Trading events
      'TRADE_EXECUTED': 'info',
      'TRADE_FAILED': 'warn',
      'API_KEY_ADDED': 'warn',
      'API_KEY_REMOVED': 'warn',
      
      // Security events
      'SUSPICIOUS_ACTIVITY': 'error',
      'RATE_LIMIT_EXCEEDED': 'warn',
      'CSRF_TOKEN_INVALID': 'warn',
      'UNAUTHORIZED_ACCESS': 'error',
      
      // System events
      'SYSTEM_ERROR': 'error',
      'CONFIGURATION_CHANGE': 'warn',
      'DATA_EXPORT': 'info',
      'DATA_DELETION': 'warn'
    };
    
    return severityMap[event] || 'info';
  }

  generateHash(event, details) {
    const data = JSON.stringify({ event, details });
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  async log(event, details = {}) {
    try {
      const auditEntry = this.createAuditEntry(event, details);
      const logLine = JSON.stringify(auditEntry) + '\n';
      
      // Encrypt if enabled
      const logData = this.options.enableEncryption ? 
        this.encrypt(logLine) : logLine;
      
      // Write to current log file
      const logFile = this.getCurrentLogFile();
      await this.writeToFile(logFile, logData);
      
      // Rotate log files if needed
      await this.rotateLogsIfNeeded(logFile);
      
      // Also log to console for development
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[AUDIT] ${auditEntry.severity.toUpperCase()}: ${event}`, details);
      }
      
      return auditEntry.auditId;
    } catch (error) {
      console.error('Audit logging failed:', error);
      // Don't throw error to prevent breaking application flow
    }
  }

  async writeToFile(filePath, data) {
    return new Promise((resolve, reject) => {
      fs.appendFile(filePath, data, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  getCurrentLogFile() {
    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    return path.join(this.options.logDirectory, `audit-${date}.log`);
  }

  async rotateLogsIfNeeded(currentFile) {
    try {
      const stats = await fs.promises.stat(currentFile);
      
      if (stats.size >= this.options.maxFileSize) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const rotatedFile = currentFile.replace('.log', `-${timestamp}.log`);
        
        await fs.promises.rename(currentFile, rotatedFile);
        
        // Clean up old log files
        await this.cleanupOldLogs();
      }
    } catch (error) {
      // File doesn't exist or other error, ignore
    }
  }

  async cleanupOldLogs() {
    try {
      const files = await fs.promises.readdir(this.options.logDirectory);
      const logFiles = files
        .filter(file => file.startsWith('audit-') && file.endsWith('.log'))
        .sort()
        .reverse();
      
      if (logFiles.length > this.options.maxFiles) {
        const filesToDelete = logFiles.slice(this.options.maxFiles);
        
        for (const file of filesToDelete) {
          await fs.promises.unlink(path.join(this.options.logDirectory, file));
        }
      }
    } catch (error) {
      console.error('Failed to cleanup old log files:', error);
    }
  }

  encrypt(data) {
    if (!this.cipher) {
      return data;
    }
    
    try {
      const encrypted = this.cipher.update(data, 'utf8', 'hex');
      return encrypted + this.cipher.final('hex');
    } catch (error) {
      console.error('Encryption failed:', error);
      return data; // Return unencrypted data on failure
    }
  }

  // Specific logging methods for common events
  async logUserLogin(userId, ipAddress, userAgent, success = true) {
    return this.log('USER_LOGIN', {
      userId,
      ipAddress,
      userAgent,
      success,
      event: success ? 'USER_LOGIN' : 'LOGIN_FAILED'
    });
  }

  async logUserLogout(userId, ipAddress, userAgent) {
    return this.log('USER_LOGOUT', {
      userId,
      ipAddress,
      userAgent
    });
  }

  async logTradeExecution(userId, tradeDetails, success = true) {
    return this.log('TRADE_EXECUTED', {
      userId,
      tradeDetails,
      success,
      event: success ? 'TRADE_EXECUTED' : 'TRADE_FAILED'
    });
  }

  async logSecurityEvent(event, details) {
    return this.log(event, {
      ...details,
      securityEvent: true
    });
  }

  async logSystemEvent(event, details) {
    return this.log(event, {
      ...details,
      systemEvent: true
    });
  }

  // Query methods for audit logs
  async searchLogs(query = {}) {
    try {
      const files = await fs.promises.readdir(this.options.logDirectory);
      const logFiles = files.filter(file => file.startsWith('audit-') && file.endsWith('.log'));
      
      const results = [];
      
      for (const file of logFiles) {
        const filePath = path.join(this.options.logDirectory, file);
        const content = await fs.promises.readFile(filePath, 'utf8');
        
        const lines = content.trim().split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          try {
            const entry = JSON.parse(line);
            
            // Apply filters
            if (this.matchesQuery(entry, query)) {
              results.push(entry);
            }
          } catch (error) {
            // Skip invalid JSON lines
            continue;
          }
        }
      }
      
      return results.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    } catch (error) {
      console.error('Failed to search audit logs:', error);
      return [];
    }
  }

  matchesQuery(entry, query) {
    if (query.event && entry.event !== query.event) return false;
    if (query.userId && entry.details.userId !== query.userId) return false;
    if (query.ipAddress && entry.details.ipAddress !== query.ipAddress) return false;
    if (query.severity && entry.severity !== query.severity) return false;
    if (query.dateFrom && new Date(entry.timestamp) < new Date(query.dateFrom)) return false;
    if (query.dateTo && new Date(entry.timestamp) > new Date(query.dateTo)) return false;
    
    return true;
  }
}

// Singleton instance
let auditLogger = null;

function getAuditLogger(options = {}) {
  if (!auditLogger) {
    auditLogger = new AuditLogger(options);
  }
  return auditLogger;
}

module.exports = {
  AuditLogger,
  getAuditLogger
};
