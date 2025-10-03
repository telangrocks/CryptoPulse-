// =============================================================================
// Secure Session Management System - Production Ready
// =============================================================================
// Comprehensive session management with Redis storage, encryption, and security features

const crypto = require('crypto');
const { logger } = require('./logging');
const { securityLogger } = require('./logging');
const { auditLogger } = require('./logging');
const { encryptAES, decryptAES, hashSHA256, generateSecureRandom } = require('./encryption');

// Session configuration
const SESSION_CONFIG = {
  // Session settings
  SESSION: {
    name: 'cryptopulse.session',
    secret: process.env.SESSION_SECRET || 'fallback-secret-key',
    resave: false,
    saveUninitialized: false,
    rolling: true, // Reset expiration on activity
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  },
  
  // Redis configuration
  REDIS: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || null,
    db: process.env.REDIS_DB || 0,
    keyPrefix: 'session:',
    ttl: 24 * 60 * 60, // 24 hours in seconds
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3
  },
  
  // Security settings
  SECURITY: {
    enableEncryption: true,
    enableCompression: true,
    enableSessionFixation: true,
    enableConcurrentSessions: true,
    maxConcurrentSessions: 5,
    sessionRotationInterval: 60 * 60 * 1000, // 1 hour
    invalidateOnPasswordChange: true,
    invalidateOnLogout: true
  },
  
  // Session data structure
  SESSION_DATA: {
    userId: null,
    email: null,
    loginTime: null,
    lastActivity: null,
    ipAddress: null,
    userAgent: null,
    sessionId: null,
    isActive: true,
    permissions: [],
    mfaVerified: false,
    deviceFingerprint: null,
    location: null
  }
};

// Session status
const SESSION_STATUS = {
  ACTIVE: 'active',
  EXPIRED: 'expired',
  INVALID: 'invalid',
  REVOKED: 'revoked',
  SUSPENDED: 'suspended'
};

// Session events
const SESSION_EVENTS = {
  CREATED: 'session_created',
  UPDATED: 'session_updated',
  EXPIRED: 'session_expired',
  REVOKED: 'session_revoked',
  SUSPENDED: 'session_suspended',
  RESTORED: 'session_restored'
};

// Session metrics
const sessionMetrics = {
  operations: {
    create: 0,
    update: 0,
    delete: 0,
    validate: 0,
    rotate: 0,
    revoke: 0
  },
  errors: {
    create: 0,
    update: 0,
    delete: 0,
    validate: 0,
    rotate: 0,
    revoke: 0
  },
  timings: {
    create: [],
    update: [],
    delete: [],
    validate: [],
    rotate: []
  },
  activeSessions: 0,
  expiredSessions: 0,
  revokedSessions: 0
};

// Session Manager class
class SessionManager {
  constructor() {
    this.redisClient = null;
    this.encryptionKey = null;
    this.sessionStore = new Map(); // Fallback in-memory store
    this.activeSessions = new Map(); // userId -> sessionIds
    this.sessionRotation = new Map(); // sessionId -> rotation data
    this.initialized = false;
  }
  
  // Initialize session manager
  async initialize() {
    try {
      // Generate encryption key
      this.encryptionKey = generateSecureRandom(32);
      
      // Initialize Redis client
      await this.initializeRedis();
      
      // Start cleanup scheduler
      this.startCleanupScheduler();
      
      // Start session rotation scheduler
      this.startRotationScheduler();
      
      this.initialized = true;
      
      logger.info('Session manager initialized successfully', {
        redisConnected: !!this.redisClient,
        encryptionEnabled: SESSION_CONFIG.SECURITY.enableEncryption,
        compressionEnabled: SESSION_CONFIG.SECURITY.enableCompression
      });
      
      auditLogger.systemEvent('session_manager_initialized', 'SessionManager', {
        redisConnected: !!this.redisClient,
        encryptionEnabled: SESSION_CONFIG.SECURITY.enableEncryption
      });
      
    } catch (error) {
      logger.error('Failed to initialize session manager:', error);
      throw new Error(`Session manager initialization failed: ${error.message}`);
    }
  }
  
  // Initialize Redis client
  async initializeRedis() {
    try {
      // Try to connect to Redis
      const redis = require('redis');
      
      this.redisClient = redis.createClient({
        host: SESSION_CONFIG.REDIS.host,
        port: SESSION_CONFIG.REDIS.port,
        password: SESSION_CONFIG.REDIS.password,
        db: SESSION_CONFIG.REDIS.db,
        retryDelayOnFailover: SESSION_CONFIG.REDIS.retryDelayOnFailover,
        maxRetriesPerRequest: SESSION_CONFIG.REDIS.maxRetriesPerRequest
      });
      
      this.redisClient.on('error', (error) => {
        logger.error('Redis connection error:', error);
      });
      
      this.redisClient.on('connect', () => {
        logger.info('Redis connected successfully');
      });
      
      await this.redisClient.connect();
      
    } catch (error) {
      logger.warn('Redis connection failed, using in-memory store:', error.message);
      this.redisClient = null;
    }
  }
  
  // Create a new session
  async createSession(userId, sessionData, req) {
    const start = Date.now();
    
    try {
      if (!userId || !sessionData) {
        throw new Error('User ID and session data are required');
      }
      
      // Generate unique session ID
      const sessionId = this.generateSessionId();
      
      // Prepare session data
      const session = {
        ...SESSION_CONFIG.SESSION_DATA,
        ...sessionData,
        sessionId,
        userId,
        loginTime: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        ipAddress: req.ip || req.connection?.remoteAddress || 'unknown',
        userAgent: req.get('User-Agent') || 'unknown',
        isActive: true,
        status: SESSION_STATUS.ACTIVE
      };
      
      // Add device fingerprint
      session.deviceFingerprint = this.generateDeviceFingerprint(req);
      
      // Store session
      await this.storeSession(sessionId, session);
      
      // Track active sessions
      if (SESSION_CONFIG.SECURITY.enableConcurrentSessions) {
        this.trackActiveSession(userId, sessionId);
      }
      
      // Update metrics
      sessionMetrics.operations.create++;
      sessionMetrics.timings.create.push(Date.now() - start);
      sessionMetrics.activeSessions++;
      
      logger.info('Session created successfully', {
        sessionId,
        userId,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
        duration: Date.now() - start
      });
      
      auditLogger.systemEvent(SESSION_EVENTS.CREATED, 'SessionManager', {
        sessionId,
        userId,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent
      });
      
      return session;
      
    } catch (error) {
      sessionMetrics.errors.create++;
      logger.error('Session creation failed:', error);
      throw new Error(`Session creation failed: ${error.message}`);
    }
  }
  
  // Update session data
  async updateSession(sessionId, updates, req) {
    const start = Date.now();
    
    try {
      if (!sessionId || !updates) {
        throw new Error('Session ID and updates are required');
      }
      
      // Get existing session
      const session = await this.getSession(sessionId);
      if (!session) {
        throw new Error('Session not found');
      }
      
      // Check if session is active
      if (session.status !== SESSION_STATUS.ACTIVE) {
        throw new Error('Session is not active');
      }
      
      // Update session data
      const updatedSession = {
        ...session,
        ...updates,
        lastActivity: new Date().toISOString()
      };
      
      // Store updated session
      await this.storeSession(sessionId, updatedSession);
      
      // Update metrics
      sessionMetrics.operations.update++;
      sessionMetrics.timings.update.push(Date.now() - start);
      
      logger.debug('Session updated successfully', {
        sessionId,
        userId: session.userId,
        duration: Date.now() - start
      });
      
      auditLogger.systemEvent(SESSION_EVENTS.UPDATED, 'SessionManager', {
        sessionId,
        userId: session.userId,
        updates: Object.keys(updates)
      });
      
      return updatedSession;
      
    } catch (error) {
      sessionMetrics.errors.update++;
      logger.error('Session update failed:', error);
      throw new Error(`Session update failed: ${error.message}`);
    }
  }
  
  // Get session data
  async getSession(sessionId) {
    const start = Date.now();
    
    try {
      if (!sessionId) {
        throw new Error('Session ID is required');
      }
      
      let sessionData;
      
      // Try Redis first
      if (this.redisClient) {
        try {
          const redisKey = `${SESSION_CONFIG.REDIS.keyPrefix}${sessionId}`;
          const encryptedData = await this.redisClient.get(redisKey);
          
          if (encryptedData) {
            sessionData = this.decryptSessionData(encryptedData);
          }
        } catch (error) {
          logger.warn('Redis get failed, trying fallback:', error.message);
        }
      }
      
      // Fallback to in-memory store
      if (!sessionData && this.sessionStore.has(sessionId)) {
        sessionData = this.sessionStore.get(sessionId);
      }
      
      if (!sessionData) {
        return null;
      }
      
      // Check if session is expired
      if (this.isSessionExpired(sessionData)) {
        await this.deleteSession(sessionId);
        sessionMetrics.expiredSessions++;
        return null;
      }
      
      // Update metrics
      sessionMetrics.operations.validate++;
      sessionMetrics.timings.validate.push(Date.now() - start);
      
      return sessionData;
      
    } catch (error) {
      logger.error('Session retrieval failed:', error);
      return null;
    }
  }
  
  // Delete session
  async deleteSession(sessionId) {
    const start = Date.now();
    
    try {
      if (!sessionId) {
        throw new Error('Session ID is required');
      }
      
      // Get session data for cleanup
      const session = await this.getSession(sessionId);
      
      // Remove from Redis
      if (this.redisClient) {
        try {
          const redisKey = `${SESSION_CONFIG.REDIS.keyPrefix}${sessionId}`;
          await this.redisClient.del(redisKey);
        } catch (error) {
          logger.warn('Redis delete failed:', error.message);
        }
      }
      
      // Remove from in-memory store
      this.sessionStore.delete(sessionId);
      
      // Clean up active sessions tracking
      if (session && session.userId) {
        this.untrackActiveSession(session.userId, sessionId);
      }
      
      // Update metrics
      sessionMetrics.operations.delete++;
      sessionMetrics.timings.delete.push(Date.now() - start);
      sessionMetrics.activeSessions--;
      
      logger.info('Session deleted successfully', {
        sessionId,
        userId: session?.userId,
        duration: Date.now() - start
      });
      
      if (session) {
        auditLogger.systemEvent('session_deleted', 'SessionManager', {
          sessionId,
          userId: session.userId,
          reason: 'manual_deletion'
        });
      }
      
      return true;
      
    } catch (error) {
      sessionMetrics.errors.delete++;
      logger.error('Session deletion failed:', error);
      throw new Error(`Session deletion failed: ${error.message}`);
    }
  }
  
  // Rotate session ID
  async rotateSession(sessionId) {
    const start = Date.now();
    
    try {
      if (!sessionId) {
        throw new Error('Session ID is required');
      }
      
      // Get existing session
      const session = await this.getSession(sessionId);
      if (!session) {
        throw new Error('Session not found');
      }
      
      // Generate new session ID
      const newSessionId = this.generateSessionId();
      
      // Update session with new ID
      const rotatedSession = {
        ...session,
        sessionId: newSessionId,
        lastActivity: new Date().toISOString()
      };
      
      // Store new session
      await this.storeSession(newSessionId, rotatedSession);
      
      // Delete old session
      await this.deleteSession(sessionId);
      
      // Update active sessions tracking
      if (SESSION_CONFIG.SECURITY.enableConcurrentSessions) {
        this.untrackActiveSession(session.userId, sessionId);
        this.trackActiveSession(session.userId, newSessionId);
      }
      
      // Update metrics
      sessionMetrics.operations.rotate++;
      sessionMetrics.timings.rotate.push(Date.now() - start);
      
      logger.info('Session rotated successfully', {
        oldSessionId: sessionId,
        newSessionId,
        userId: session.userId,
        duration: Date.now() - start
      });
      
      auditLogger.systemEvent('session_rotated', 'SessionManager', {
        oldSessionId: sessionId,
        newSessionId,
        userId: session.userId
      });
      
      return rotatedSession;
      
    } catch (error) {
      sessionMetrics.errors.rotate++;
      logger.error('Session rotation failed:', error);
      throw new Error(`Session rotation failed: ${error.message}`);
    }
  }
  
  // Revoke session
  async revokeSession(sessionId, reason = 'manual') {
    const start = Date.now();
    
    try {
      if (!sessionId) {
        throw new Error('Session ID is required');
      }
      
      // Get existing session
      const session = await this.getSession(sessionId);
      if (!session) {
        throw new Error('Session not found');
      }
      
      // Update session status
      const revokedSession = {
        ...session,
        status: SESSION_STATUS.REVOKED,
        revokedAt: new Date().toISOString(),
        revokedReason: reason,
        isActive: false
      };
      
      // Store revoked session
      await this.storeSession(sessionId, revokedSession);
      
      // Update metrics
      sessionMetrics.operations.revoke++;
      sessionMetrics.revokedSessions++;
      
      logger.info('Session revoked successfully', {
        sessionId,
        userId: session.userId,
        reason,
        duration: Date.now() - start
      });
      
      auditLogger.systemEvent(SESSION_EVENTS.REVOKED, 'SessionManager', {
        sessionId,
        userId: session.userId,
        reason
      });
      
      return revokedSession;
      
    } catch (error) {
      sessionMetrics.errors.revoke++;
      logger.error('Session revocation failed:', error);
      throw new Error(`Session revocation failed: ${error.message}`);
    }
  }
  
  // Revoke all sessions for a user
  async revokeUserSessions(userId, reason = 'password_change') {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }
      
      const activeSessions = this.activeSessions.get(userId) || [];
      const revokedSessions = [];
      
      for (const sessionId of activeSessions) {
        try {
          const revokedSession = await this.revokeSession(sessionId, reason);
          revokedSessions.push(revokedSession);
        } catch (error) {
          logger.warn('Failed to revoke session:', error.message);
        }
      }
      
      // Clear active sessions tracking
      this.activeSessions.delete(userId);
      
      logger.info('User sessions revoked successfully', {
        userId,
        revokedCount: revokedSessions.length,
        reason
      });
      
      auditLogger.systemEvent('user_sessions_revoked', 'SessionManager', {
        userId,
        revokedCount: revokedSessions.length,
        reason
      });
      
      return revokedSessions;
      
    } catch (error) {
      logger.error('User session revocation failed:', error);
      throw new Error(`User session revocation failed: ${error.message}`);
    }
  }
  
  // Store session data
  async storeSession(sessionId, sessionData) {
    try {
      let dataToStore = sessionData;
      
      // Encrypt session data if enabled
      if (SESSION_CONFIG.SECURITY.enableEncryption) {
        dataToStore = this.encryptSessionData(sessionData);
      }
      
      // Store in Redis
      if (this.redisClient) {
        try {
          const redisKey = `${SESSION_CONFIG.REDIS.keyPrefix}${sessionId}`;
          await this.redisClient.setEx(redisKey, SESSION_CONFIG.REDIS.ttl, dataToStore);
        } catch (error) {
          logger.warn('Redis store failed, using fallback:', error.message);
        }
      }
      
      // Store in fallback in-memory store
      this.sessionStore.set(sessionId, sessionData);
      
    } catch (error) {
      logger.error('Session storage failed:', error);
      throw new Error(`Session storage failed: ${error.message}`);
    }
  }
  
  // Encrypt session data
  encryptSessionData(sessionData) {
    try {
      const dataString = JSON.stringify(sessionData);
      const encryptedData = encryptAES(dataString, this.encryptionKey);
      return encryptedData.toString('base64');
    } catch (error) {
      logger.error('Session encryption failed:', error);
      throw new Error(`Session encryption failed: ${error.message}`);
    }
  }
  
  // Decrypt session data
  decryptSessionData(encryptedData) {
    try {
      const encryptedBuffer = Buffer.from(encryptedData, 'base64');
      const decryptedData = decryptAES(encryptedBuffer, this.encryptionKey);
      return JSON.parse(decryptedData);
    } catch (error) {
      logger.error('Session decryption failed:', error);
      throw new Error(`Session decryption failed: ${error.message}`);
    }
  }
  
  // Generate session ID
  generateSessionId() {
    return crypto.randomUUID();
  }
  
  // Generate device fingerprint
  generateDeviceFingerprint(req) {
    try {
      const fingerprintData = [
        req.get('User-Agent') || '',
        req.get('Accept-Language') || '',
        req.get('Accept-Encoding') || '',
        req.ip || ''
      ].join('|');
      
      return hashSHA256(fingerprintData).toString('hex');
    } catch (error) {
      logger.error('Device fingerprint generation failed:', error);
      return 'unknown';
    }
  }
  
  // Check if session is expired
  isSessionExpired(sessionData) {
    if (!sessionData.lastActivity) {
      return true;
    }
    
    const lastActivity = new Date(sessionData.lastActivity);
    const now = new Date();
    const maxAge = SESSION_CONFIG.SESSION.maxAge;
    
    return (now.getTime() - lastActivity.getTime()) > maxAge;
  }
  
  // Track active session
  trackActiveSession(userId, sessionId) {
    if (!this.activeSessions.has(userId)) {
      this.activeSessions.set(userId, []);
    }
    
    const userSessions = this.activeSessions.get(userId);
    userSessions.push(sessionId);
    
    // Enforce max concurrent sessions
    if (SESSION_CONFIG.SECURITY.enableConcurrentSessions && 
        userSessions.length > SESSION_CONFIG.SECURITY.maxConcurrentSessions) {
      // Remove oldest session
      const oldestSessionId = userSessions.shift();
      this.deleteSession(oldestSessionId);
    }
  }
  
  // Untrack active session
  untrackActiveSession(userId, sessionId) {
    if (!this.activeSessions.has(userId)) {
      return;
    }
    
    const userSessions = this.activeSessions.get(userId);
    const index = userSessions.indexOf(sessionId);
    
    if (index > -1) {
      userSessions.splice(index, 1);
      
      if (userSessions.length === 0) {
        this.activeSessions.delete(userId);
      }
    }
  }
  
  // Start cleanup scheduler
  startCleanupScheduler() {
    // Run cleanup every 30 minutes
    setInterval(() => {
      this.performCleanup();
    }, 30 * 60 * 1000);
    
    logger.info('Session cleanup scheduler started');
  }
  
  // Start session rotation scheduler
  startRotationScheduler() {
    // Run rotation check every hour
    setInterval(() => {
      this.performSessionRotation();
    }, 60 * 60 * 1000);
    
    logger.info('Session rotation scheduler started');
  }
  
  // Perform session cleanup
  async performCleanup() {
    try {
      let cleanedCount = 0;
      
      // Clean up expired sessions from in-memory store
      for (const [sessionId, sessionData] of this.sessionStore) {
        if (this.isSessionExpired(sessionData)) {
          this.sessionStore.delete(sessionId);
          cleanedCount++;
        }
      }
      
      if (cleanedCount > 0) {
        logger.info('Session cleanup completed', {
          cleanedCount,
          remainingSessions: this.sessionStore.size
        });
        
        auditLogger.systemEvent('session_cleanup_completed', 'SessionManager', {
          cleanedCount,
          remainingSessions: this.sessionStore.size
        });
      }
      
    } catch (error) {
      logger.error('Session cleanup failed:', error);
    }
  }
  
  // Perform session rotation
  async performSessionRotation() {
    try {
      const now = Date.now();
      let rotatedCount = 0;
      
      for (const [sessionId, sessionData] of this.sessionStore) {
        if (sessionData.lastActivity) {
          const lastActivity = new Date(sessionData.lastActivity).getTime();
          const timeSinceActivity = now - lastActivity;
          
          if (timeSinceActivity > SESSION_CONFIG.SECURITY.sessionRotationInterval) {
            try {
              await this.rotateSession(sessionId);
              rotatedCount++;
            } catch (error) {
              logger.warn('Session rotation failed:', error.message);
            }
          }
        }
      }
      
      if (rotatedCount > 0) {
        logger.info('Session rotation completed', {
          rotatedCount
        });
      }
      
    } catch (error) {
      logger.error('Session rotation failed:', error);
    }
  }
  
  // Get session statistics
  getSessionStats() {
    return {
      activeSessions: sessionMetrics.activeSessions,
      expiredSessions: sessionMetrics.expiredSessions,
      revokedSessions: sessionMetrics.revokedSessions,
      totalUsers: this.activeSessions.size,
      operations: sessionMetrics.operations,
      errors: sessionMetrics.errors,
      redisConnected: !!this.redisClient,
      inMemorySessions: this.sessionStore.size
    };
  }
  
  // Get session metrics
  getMetrics() {
    const calculateAverage = (timings) => {
      if (timings.length === 0) return 0;
      return timings.reduce((sum, time) => sum + time, 0) / timings.length;
    };
    
    const calculatePercentile = (timings, percentile) => {
      if (timings.length === 0) return 0;
      const sorted = [...timings].sort((a, b) => a - b);
      const index = Math.ceil((percentile / 100) * sorted.length) - 1;
      return sorted[index] || 0;
    };
    
    return {
      operations: sessionMetrics.operations,
      errors: sessionMetrics.errors,
      performance: {
        create: {
          average: calculateAverage(sessionMetrics.timings.create),
          p95: calculatePercentile(sessionMetrics.timings.create, 95),
          p99: calculatePercentile(sessionMetrics.timings.create, 99),
          max: Math.max(...sessionMetrics.timings.create, 0),
          min: Math.min(...sessionMetrics.timings.create, 0)
        },
        update: {
          average: calculateAverage(sessionMetrics.timings.update),
          p95: calculatePercentile(sessionMetrics.timings.update, 95),
          p99: calculatePercentile(sessionMetrics.timings.update, 99),
          max: Math.max(...sessionMetrics.timings.update, 0),
          min: Math.min(...sessionMetrics.timings.update, 0)
        },
        validate: {
          average: calculateAverage(sessionMetrics.timings.validate),
          p95: calculatePercentile(sessionMetrics.timings.validate, 95),
          p99: calculatePercentile(sessionMetrics.timings.validate, 99),
          max: Math.max(...sessionMetrics.timings.validate, 0),
          min: Math.min(...sessionMetrics.timings.validate, 0)
        }
      },
      system: {
        activeSessions: sessionMetrics.activeSessions,
        expiredSessions: sessionMetrics.expiredSessions,
        revokedSessions: sessionMetrics.revokedSessions,
        totalUsers: this.activeSessions.size,
        redisConnected: !!this.redisClient,
        inMemorySessions: this.sessionStore.size
      }
    };
  }
}

// Create global session manager instance
const sessionManager = new SessionManager();

// Export session manager and utilities
module.exports = {
  sessionManager,
  SessionManager,
  SESSION_CONFIG,
  SESSION_STATUS,
  SESSION_EVENTS
};
