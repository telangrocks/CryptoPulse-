/**
 * Production-ready Secure Session Management
 * Implements secure session handling with encryption and validation
 */

const crypto = require('crypto');
const { getAuditLogger } = require('./auditLogger');

class SecureSessionManager {
  constructor(options = {}) {
    this.options = {
      sessionSecret: options.sessionSecret || process.env.SESSION_SECRET,
      encryptionKey: options.encryptionKey || process.env.SESSION_ENCRYPTION_KEY,
      sessionTimeout: options.sessionTimeout || 24 * 60 * 60 * 1000, // 24 hours
      maxSessionsPerUser: options.maxSessionsPerUser || 5,
      sessionCleanupInterval: options.sessionCleanupInterval || 60 * 60 * 1000, // 1 hour
      ...options
    };
    
    this.sessions = new Map(); // In production, use Redis
    this.userSessions = new Map(); // Track sessions per user
    this.auditLogger = getAuditLogger();
    
    this.validateConfiguration();
    this.startSessionCleanup();
  }

  validateConfiguration() {
    if (!this.options.sessionSecret) {
      throw new Error('SESSION_SECRET environment variable is required');
    }
    
    if (!this.options.encryptionKey) {
      this.options.encryptionKey = crypto.randomBytes(32).toString('hex');
    }
  }

  generateSessionId() {
    return crypto.randomBytes(32).toString('hex');
  }

  generateCSRFToken(sessionId) {
    const data = `${sessionId}:${Date.now()}`;
    return crypto.createHmac('sha256', this.options.sessionSecret)
      .update(data)
      .digest('hex');
  }

  encryptSessionData(data) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher('aes-256-gcm', this.options.encryptionKey);
    cipher.setAAD(Buffer.from(this.options.sessionSecret));
    
    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  }

  decryptSessionData(encryptedData) {
    try {
      const { encrypted, iv, authTag } = encryptedData;
      
      const decipher = crypto.createDecipher('aes-256-gcm', this.options.encryptionKey);
      decipher.setAAD(Buffer.from(this.options.sessionSecret));
      decipher.setAuthTag(Buffer.from(authTag, 'hex'));
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return JSON.parse(decrypted);
    } catch (error) {
      throw new Error('Failed to decrypt session data');
    }
  }

  createSession(userId, userData, ipAddress, userAgent) {
    const sessionId = this.generateSessionId();
    const csrfToken = this.generateCSRFToken(sessionId);
    const now = Date.now();
    
    const sessionData = {
      userId,
      userData,
      createdAt: now,
      lastAccessed: now,
      ipAddress,
      userAgent,
      csrfToken,
      isActive: true
    };
    
    // Encrypt session data
    const encryptedSession = this.encryptSessionData(sessionData);
    
    // Store session
    this.sessions.set(sessionId, {
      ...encryptedSession,
      expires: now + this.options.sessionTimeout
    });
    
    // Track user sessions
    if (!this.userSessions.has(userId)) {
      this.userSessions.set(userId, new Set());
    }
    this.userSessions.get(userId).add(sessionId);
    
    // Clean up old sessions for user if limit exceeded
    this.cleanupUserSessions(userId);
    
    // Log session creation
    this.auditLogger.logUserLogin(userId, ipAddress, userAgent, true);
    
    return {
      sessionId,
      csrfToken,
      expires: now + this.options.sessionTimeout
    };
  }

  validateSession(sessionId, csrfToken, ipAddress, userAgent) {
    try {
      const sessionRecord = this.sessions.get(sessionId);
      
      if (!sessionRecord) {
        return { valid: false, reason: 'Session not found' };
      }
      
      // Check expiration
      if (Date.now() > sessionRecord.expires) {
        this.sessions.delete(sessionId);
        return { valid: false, reason: 'Session expired' };
      }
      
      // Decrypt session data
      const sessionData = this.decryptSessionData(sessionRecord);
      
      // Validate CSRF token
      if (csrfToken && sessionData.csrfToken !== csrfToken) {
        this.auditLogger.logSecurityEvent('CSRF_TOKEN_INVALID', {
          sessionId,
          ipAddress,
          userAgent,
          userId: sessionData.userId
        });
        return { valid: false, reason: 'Invalid CSRF token' };
      }
      
      // Check IP address (optional, can be disabled for mobile users)
      if (process.env.VALIDATE_SESSION_IP === 'true' && 
          sessionData.ipAddress !== ipAddress) {
        this.auditLogger.logSecurityEvent('SESSION_IP_MISMATCH', {
          sessionId,
          expectedIp: sessionData.ipAddress,
          actualIp: ipAddress,
          userId: sessionData.userId
        });
        return { valid: false, reason: 'IP address mismatch' };
      }
      
      // Update last accessed time
      sessionData.lastAccessed = Date.now();
      const updatedEncryptedSession = this.encryptSessionData(sessionData);
      this.sessions.set(sessionId, {
        ...updatedEncryptedSession,
        expires: sessionData.lastAccessed + this.options.sessionTimeout
      });
      
      return {
        valid: true,
        sessionData: {
          userId: sessionData.userId,
          userData: sessionData.userData,
          csrfToken: sessionData.csrfToken
        }
      };
    } catch (error) {
      this.auditLogger.logSecurityEvent('SESSION_VALIDATION_ERROR', {
        sessionId,
        error: error.message,
        ipAddress,
        userAgent
      });
      return { valid: false, reason: 'Session validation error' };
    }
  }

  destroySession(sessionId, userId) {
    const sessionRecord = this.sessions.get(sessionId);
    
    if (sessionRecord) {
      this.sessions.delete(sessionId);
      
      // Remove from user sessions
      if (userId && this.userSessions.has(userId)) {
        this.userSessions.get(userId).delete(sessionId);
        
        if (this.userSessions.get(userId).size === 0) {
          this.userSessions.delete(userId);
        }
      }
      
      // Log session destruction
      this.auditLogger.logUserLogout(userId, 'unknown', 'unknown');
    }
  }

  destroyAllUserSessions(userId) {
    const userSessionIds = this.userSessions.get(userId);
    
    if (userSessionIds) {
      for (const sessionId of userSessionIds) {
        this.sessions.delete(sessionId);
      }
      this.userSessions.delete(userId);
      
      this.auditLogger.logSystemEvent('ALL_SESSIONS_DESTROYED', {
        userId,
        sessionCount: userSessionIds.size
      });
    }
  }

  cleanupUserSessions(userId) {
    const userSessionIds = this.userSessions.get(userId);
    
    if (userSessionIds && userSessionIds.size > this.options.maxSessionsPerUser) {
      const sessions = Array.from(userSessionIds);
      const sortedSessions = sessions.sort((a, b) => {
        const sessionA = this.sessions.get(a);
        const sessionB = this.sessions.get(b);
        
        if (!sessionA || !sessionB) return 0;
        
        try {
          const dataA = this.decryptSessionData(sessionA);
          const dataB = this.decryptSessionData(sessionB);
          return dataB.lastAccessed - dataA.lastAccessed;
        } catch (error) {
          return 0;
        }
      });
      
      // Remove oldest sessions
      const sessionsToRemove = sortedSessions.slice(this.options.maxSessionsPerUser);
      
      for (const sessionId of sessionsToRemove) {
        this.sessions.delete(sessionId);
        userSessionIds.delete(sessionId);
      }
    }
  }

  startSessionCleanup() {
    setInterval(() => {
      this.cleanupExpiredSessions();
    }, this.options.sessionCleanupInterval);
  }

  cleanupExpiredSessions() {
    const now = Date.now();
    const expiredSessions = [];
    
    for (const [sessionId, sessionRecord] of this.sessions.entries()) {
      if (now > sessionRecord.expires) {
        expiredSessions.push(sessionId);
      }
    }
    
    for (const sessionId of expiredSessions) {
      this.sessions.delete(sessionId);
    }
    
    if (expiredSessions.length > 0) {
      this.auditLogger.logSystemEvent('EXPIRED_SESSIONS_CLEANED', {
        expiredCount: expiredSessions.length
      });
    }
  }

  getSessionStats() {
    return {
      totalSessions: this.sessions.size,
      activeUsers: this.userSessions.size,
      averageSessionsPerUser: this.userSessions.size > 0 ? 
        this.sessions.size / this.userSessions.size : 0
    };
  }

  // Middleware for Express
  middleware() {
    return (req, res, next) => {
      const sessionId = req.headers['x-session-id'] || 
                       req.cookies?.sessionId || 
                       req.body?.sessionId;
      
      const csrfToken = req.headers['x-csrf-token'] || 
                       req.body?._csrf;
      
      const ipAddress = req.ip || 
                       req.connection.remoteAddress || 
                       req.socket.remoteAddress;
      
      const userAgent = req.get('User-Agent') || 'unknown';
      
      if (sessionId) {
        const validation = this.validateSession(sessionId, csrfToken, ipAddress, userAgent);
        
        if (validation.valid) {
          req.session = validation.sessionData;
          req.sessionId = sessionId;
        } else {
          req.session = null;
          req.sessionId = null;
          
          // Clear invalid session cookie
          res.clearCookie('sessionId');
        }
      } else {
        req.session = null;
        req.sessionId = null;
      }
      
      next();
    };
  }

  // Helper method to set secure session cookie
  setSessionCookie(res, sessionId, expires) {
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: expires - Date.now(),
      path: '/'
    };
    
    res.cookie('sessionId', sessionId, cookieOptions);
  }

  // Helper method to clear session cookie
  clearSessionCookie(res) {
    res.clearCookie('sessionId', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/'
    });
  }
}

// Singleton instance
let sessionManager = null;

function getSessionManager(options = {}) {
  if (!sessionManager) {
    sessionManager = new SecureSessionManager(options);
  }
  return sessionManager;
}

module.exports = {
  SecureSessionManager,
  getSessionManager
};
