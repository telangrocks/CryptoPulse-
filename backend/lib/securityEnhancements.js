// =============================================================================
// Advanced Security & Threat Detection - Production Ready
// =============================================================================
// Comprehensive security enhancements including threat detection, anomaly detection, and security monitoring

// const crypto = require('crypto'); // Unused but kept for future use
const logger = require('./logging');
const { performanceMetrics } = require('./tracing');

// Threat detection and anomaly monitoring
class ThreatDetector {
  constructor() {
    this.suspiciousIPs = new Map();
    this.failedAttempts = new Map();
    this.userBehavior = new Map();
    this.geoLocationCache = new Map();
    this.securityEvents = [];

    // Thresholds for threat detection
    this.thresholds = {
      maxFailedAttempts: 5,
      maxFailedAttemptsWindow: 15 * 60 * 1000, // 15 minutes
      suspiciousRequestFrequency: 100, // requests per minute
      unusualLocationThreshold: 1000, // km from usual location
      unusualTimeThreshold: 8 * 60 * 60 * 1000, // 8 hours from usual time
      maxSuspiciousEvents: 10
    };

    // Start monitoring
    this.startMonitoring();
  }

  // Track login attempts
  trackLoginAttempt(ip, email, success, userAgent, location = null) {
    const key = `${ip}:${email}`;
    const timestamp = Date.now();

    if (!success) {
      if (!this.failedAttempts.has(key)) {
        this.failedAttempts.set(key, []);
      }

      const attempts = this.failedAttempts.get(key);
      attempts.push({ timestamp, userAgent, location });

      // Clean old attempts
      const cutoff = timestamp - this.thresholds.maxFailedAttemptsWindow;
      const recentAttempts = attempts.filter(a => a.timestamp > cutoff);
      this.failedAttempts.set(key, recentAttempts);

      // Check for brute force
      if (recentAttempts.length >= this.thresholds.maxFailedAttempts) {
        this.flagSuspiciousActivity('brute_force', {
          ip,
          email,
          attempts: recentAttempts.length,
          timeWindow: this.thresholds.maxFailedAttemptsWindow
        });
      }
    } else {
      // Clear failed attempts on successful login
      this.failedAttempts.delete(key);
    }

    // Track user behavior
    this.trackUserBehavior(ip, email, success, userAgent, location);
  }

  // Track user behavior patterns
  trackUserBehavior(ip, email, success, userAgent, location = null) {
    if (!email) {return;}

    const userKey = email;
    if (!this.userBehavior.has(userKey)) {
      this.userBehavior.set(userKey, {
        locations: [],
        times: [],
        userAgents: [],
        ips: [],
        lastSeen: null
      });
    }

    const behavior = this.userBehavior.get(userKey);
    const now = Date.now();

    // Track location
    if (location) {
      behavior.locations.push({ ...location, timestamp: now });
      // Keep only last 10 locations
      if (behavior.locations.length > 10) {
        behavior.locations.shift();
      }
    }

    // Track access times
    behavior.times.push(now);
    if (behavior.times.length > 50) {
      behavior.times.shift();
    }

    // Track user agents
    if (userAgent && !behavior.userAgents.includes(userAgent)) {
      behavior.userAgents.push(userAgent);
      // Keep only last 5 user agents
      if (behavior.userAgents.length > 5) {
        behavior.userAgents.shift();
      }
    }

    // Track IPs
    if (!behavior.ips.includes(ip)) {
      behavior.ips.push(ip);
      // Keep only last 10 IPs
      if (behavior.ips.length > 10) {
        behavior.ips.shift();
      }
    }

    behavior.lastSeen = now;

    // Check for anomalies
    this.checkUserAnomalies(userKey, behavior, { ip, location, now });
  }

  // Check for user behavior anomalies
  checkUserAnomalies(userKey, behavior, currentSession) {
    const { ip, location, now } = currentSession;

    // Check for unusual location
    if (location && behavior.locations.length > 1) {
      const recentLocations = behavior.locations.slice(-3);
      const distances = recentLocations.map(prev =>
        this.calculateDistance(prev, location)
      );

      const avgDistance = distances.reduce((sum, dist) => sum + dist, 0) / distances.length;
      if (avgDistance > this.thresholds.unusualLocationThreshold) {
        this.flagSuspiciousActivity('unusual_location', {
          userKey,
          ip,
          location,
          averageDistance: avgDistance,
          recentLocations
        });
      }
    }

    // Check for unusual access time
    if (behavior.times.length > 10) {
      const recentTimes = behavior.times.slice(-10);
      const timeDiffs = recentTimes.map(time => now - time);
      const avgTimeDiff = timeDiffs.reduce((sum, diff) => sum + diff, 0) / timeDiffs.length;

      if (avgTimeDiff > this.thresholds.unusualTimeThreshold) {
        this.flagSuspiciousActivity('unusual_access_time', {
          userKey,
          ip,
          currentTime: now,
          averageTimeDifference: avgTimeDiff
        });
      }
    }

    // Check for new IP address
    if (behavior.ips.length > 1 && !behavior.ips.includes(ip)) {
      this.flagSuspiciousActivity('new_ip_address', {
        userKey,
        ip,
        previousIPs: behavior.ips,
        isFirstTime: behavior.ips.length === 1
      });
    }

    // Check for new user agent
    if (behavior.userAgents.length > 1) {
      const currentUserAgent = this.getUserAgent();
      if (!behavior.userAgents.includes(currentUserAgent)) {
        this.flagSuspiciousActivity('new_user_agent', {
          userKey,
          ip,
          userAgent: currentUserAgent,
          previousUserAgents: behavior.userAgents
        });
      }
    }
  }

  // Calculate distance between two locations
  calculateDistance(loc1, loc2) {
    if (!loc1.latitude || !loc1.longitude || !loc2.latitude || !loc2.longitude) {
      return 0;
    }

    const R = 6371; // Earth's radius in km
    const dLat = (loc2.latitude - loc1.latitude) * Math.PI / 180;
    const dLon = (loc2.longitude - loc1.longitude) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(loc1.latitude * Math.PI / 180) * Math.cos(loc2.latitude * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // Flag suspicious activity
  flagSuspiciousActivity(type, details) {
    const event = {
      type,
      details,
      timestamp: new Date().toISOString(),
      severity: this.getSeverity(type)
    };

    this.securityEvents.push(event);

    // Keep only last 1000 events
    if (this.securityEvents.length > 1000) {
      this.securityEvents.shift();
    }

    // Log security event
    logger.warn('Suspicious activity detected:', event);

    // Send alert if high severity
    if (event.severity === 'high') {
      this.sendSecurityAlert(event);
    }

    // Track metrics
    performanceMetrics.counter('security.suspicious_activity', 1, { type });
  }

  // Get severity level for security event
  getSeverity(type) {
    const highSeverityTypes = ['brute_force', 'unusual_location', 'account_takeover'];
    const mediumSeverityTypes = ['new_ip_address', 'unusual_access_time', 'rate_limit_exceeded'];

    if (highSeverityTypes.includes(type)) {return 'high';}
    if (mediumSeverityTypes.includes(type)) {return 'medium';}
    return 'low';
  }

  // Send security alert
  async sendSecurityAlert(event) {
    try {
      // Log high severity alert
      logger.error('High severity security alert:', event);

      // Send to external monitoring if configured
      if (process.env.SECURITY_WEBHOOK_URL) {
        await this.sendWebhookAlert(event);
      }

      // Send email alert if configured
      if (process.env.SECURITY_EMAIL) {
        await this.sendEmailAlert(event);
      }

    } catch (error) {
      logger.error('Failed to send security alert:', error);
    }
  }

  // Send webhook alert
  async sendWebhookAlert(event) {
    try {
      const axios = require('axios');
      const payload = {
        text: `🚨 Security Alert: ${event.type}`,
        attachments: [{
          color: 'danger',
          title: `Security Event: ${event.type}`,
          fields: [
            { title: 'Type', value: event.type, short: true },
            { title: 'Severity', value: event.severity, short: true },
            { title: 'Timestamp', value: event.timestamp, short: true },
            { title: 'Details', value: JSON.stringify(event.details, null, 2), short: false }
          ],
          ts: Math.floor(new Date(event.timestamp).getTime() / 1000)
        }]
      };

      await axios.post(process.env.SECURITY_WEBHOOK_URL, payload);
    } catch (error) {
      logger.error('Failed to send webhook alert:', error);
    }
  }

  // Send email alert
  async sendEmailAlert(event) {
    // Implementation would depend on email service (SendGrid, SES, etc.)
    logger.info('Email alert would be sent:', event);
  }

  // Get current user agent (placeholder)
  getUserAgent() {
    return 'unknown';
  }

  // Check if IP is suspicious
  isSuspiciousIP(ip) {
    const suspicious = this.suspiciousIPs.get(ip);
    if (!suspicious) {return false;}

    // Check if IP was flagged recently (within 24 hours)
    const dayAgo = Date.now() - (24 * 60 * 60 * 1000);
    return suspicious.lastFlagged > dayAgo;
  }

  // Block IP address
  blockIP(ip, reason, duration = 24 * 60 * 60 * 1000) {
    this.suspiciousIPs.set(ip, {
      blocked: true,
      reason,
      blockedAt: Date.now(),
      blockedUntil: Date.now() + duration,
      lastFlagged: Date.now()
    });

    logger.warn(`IP blocked: ${ip}`, { reason, duration });
    performanceMetrics.counter('security.ip_blocked', 1, { ip, reason });
  }

  // Unblock IP address
  unblockIP(ip) {
    if (this.suspiciousIPs.has(ip)) {
      this.suspiciousIPs.delete(ip);
      logger.info(`IP unblocked: ${ip}`);
    }
  }

  // Check if request should be blocked
  shouldBlockRequest(ip, email = null) {
    // Check if IP is blocked
    if (this.isSuspiciousIP(ip)) {
      return { blocked: true, reason: 'IP blocked due to suspicious activity' };
    }

    // Check for too many failed attempts
    if (email) {
      const key = `${ip}:${email}`;
      const attempts = this.failedAttempts.get(key) || [];
      const recentAttempts = attempts.filter(a =>
        a.timestamp > Date.now() - this.thresholds.maxFailedAttemptsWindow
      );

      if (recentAttempts.length >= this.thresholds.maxFailedAttempts) {
        return { blocked: true, reason: 'Too many failed attempts' };
      }
    }

    return { blocked: false };
  }

  // Get security statistics
  getSecurityStats() {
    const now = Date.now();
    const dayAgo = now - (24 * 60 * 60 * 1000);

    const recentEvents = this.securityEvents.filter(e =>
      new Date(e.timestamp).getTime() > dayAgo
    );

    const eventsByType = recentEvents.reduce((acc, event) => {
      acc[event.type] = (acc[event.type] || 0) + 1;
      return acc;
    }, {});

    const blockedIPs = Array.from(this.suspiciousIPs.entries()).filter(([_ip, data]) =>
      data.blockedUntil > now
    ).length;

    return {
      totalEvents: recentEvents.length,
      eventsByType,
      blockedIPs,
      monitoredUsers: this.userBehavior.size,
      failedAttempts: this.failedAttempts.size,
      lastEvent: this.securityEvents[this.securityEvents.length - 1]?.timestamp
    };
  }

  // Start monitoring and cleanup
  startMonitoring() {
    // Cleanup old data every hour
    setInterval(() => {
      this.cleanup();
    }, 60 * 60 * 1000);

    // Log security stats every 6 hours
    setInterval(() => {
      const stats = this.getSecurityStats();
      logger.info('Security statistics:', stats);
    }, 6 * 60 * 60 * 1000);
  }

  // Cleanup old data
  cleanup() {
    const now = Date.now();
    const cutoff = now - (7 * 24 * 60 * 60 * 1000); // 7 days

    // Clean old security events
    this.securityEvents = this.securityEvents.filter(e =>
      new Date(e.timestamp).getTime() > cutoff
    );

    // Clean old failed attempts
    for (const [key, attempts] of this.failedAttempts.entries()) {
      const recentAttempts = attempts.filter(a => a.timestamp > cutoff);
      if (recentAttempts.length === 0) {
        this.failedAttempts.delete(key);
      } else {
        this.failedAttempts.set(key, recentAttempts);
      }
    }

    // Clean old user behavior data
    for (const [userKey, behavior] of this.userBehavior.entries()) {
      behavior.times = behavior.times.filter(t => t > cutoff);
      behavior.locations = behavior.locations.filter(l => l.timestamp > cutoff);

      if (behavior.times.length === 0 && behavior.locations.length === 0) {
        this.userBehavior.delete(userKey);
      }
    }

    // Clean expired IP blocks
    for (const [ip, data] of this.suspiciousIPs.entries()) {
      if (data.blockedUntil && data.blockedUntil < now) {
        this.suspiciousIPs.delete(ip);
      }
    }
  }
}

// Input sanitization and validation
const inputSanitizer = {
  // Sanitize HTML content
  sanitizeHTML: (input) => {
    if (typeof input !== 'string') {return input;}

    return input
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  },

  // Sanitize SQL input (basic)
  sanitizeSQL: (input) => {
    if (typeof input !== 'string') {return input;}

    return input
      .replace(/['"]/g, '')
      .replace(/;/g, '')
      .replace(/--/g, '')
      .replace(/\/\*/g, '')
      .replace(/\*\//g, '');
  },

  // Validate and sanitize email
  sanitizeEmail: (email) => {
    if (typeof email !== 'string') {return null;}

    const sanitized = email.trim().toLowerCase();
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

    return emailRegex.test(sanitized) ? sanitized : null;
  },

  // Validate and sanitize phone number
  sanitizePhone: (phone) => {
    if (typeof phone !== 'string') {return null;}

    const sanitized = phone.replace(/[^\d+]/g, '');
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;

    return phoneRegex.test(sanitized) ? sanitized : null;
  },

  // Sanitize file upload
  sanitizeFileUpload: (filename, mimetype, size) => {
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf', 'text/plain', 'application/json'
    ];

    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf', '.txt', '.json'];

    const maxSize = 10 * 1024 * 1024; // 10MB

    const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));

    return {
      valid: allowedTypes.includes(mimetype) &&
             allowedExtensions.includes(extension) &&
             size <= maxSize,
      sanitizedFilename: filename.replace(/[^a-zA-Z0-9.-]/g, '_')
    };
  }
};

// Rate limiting with advanced features
const advancedRateLimiter = {
  // IP-based rate limiting with sliding window
  ipLimiter: new Map(),

  // Check rate limit for IP
  checkIPRateLimit: (ip, limit = 100, windowMs = 15 * 60 * 1000) => {
    const now = Date.now();
    const key = `ip:${ip}`;

    if (!this.ipLimiter.has(key)) {
      this.ipLimiter.set(key, []);
    }

    const requests = this.ipLimiter.get(key);
    const cutoff = now - windowMs;

    // Remove old requests
    const recentRequests = requests.filter(timestamp => timestamp > cutoff);
    this.ipLimiter.set(key, recentRequests);

    if (recentRequests.length >= limit) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: recentRequests[0] + windowMs,
        retryAfter: Math.ceil((recentRequests[0] + windowMs - now) / 1000)
      };
    }

    // Add current request
    recentRequests.push(now);

    return {
      allowed: true,
      remaining: limit - recentRequests.length - 1,
      resetTime: now + windowMs,
      retryAfter: 0
    };
  },

  // Cleanup old rate limit data
  cleanup: () => {
    const now = Date.now();
    const cutoff = now - (60 * 60 * 1000); // 1 hour

    for (const [key, requests] of this.ipLimiter.entries()) {
      const recentRequests = requests.filter(timestamp => timestamp > cutoff);
      if (recentRequests.length === 0) {
        this.ipLimiter.delete(key);
      } else {
        this.ipLimiter.set(key, recentRequests);
      }
    }
  }
};

// Start cleanup for rate limiter
setInterval(() => {
  advancedRateLimiter.cleanup();
}, 15 * 60 * 1000); // Every 15 minutes

// Global threat detector instance
const threatDetector = new ThreatDetector();

// Express middleware for security enhancements
const securityEnhancementMiddleware = (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  const _userAgent = req.get('User-Agent');
  const email = req.body?.email || req.query?.email;

  // Check if request should be blocked
  const blockCheck = threatDetector.shouldBlockRequest(ip, email);
  if (blockCheck.blocked) {
    logger.warn('Request blocked:', { ip, email, reason: blockCheck.reason });
    return res.status(429).json({
      success: false,
      error: 'Request blocked due to security policy',
      retryAfter: 900 // 15 minutes
    });
  }

  // Check rate limit
  const rateLimit = advancedRateLimiter.checkIPRateLimit(ip);
  if (!rateLimit.allowed) {
    res.setHeader('X-RateLimit-Limit', '100');
    res.setHeader('X-RateLimit-Remaining', '0');
    res.setHeader('X-RateLimit-Reset', new Date(rateLimit.resetTime).toISOString());
    res.setHeader('Retry-After', rateLimit.retryAfter);

    return res.status(429).json({
      success: false,
      error: 'Rate limit exceeded',
      retryAfter: rateLimit.retryAfter
    });
  }

  // Set rate limit headers
  res.setHeader('X-RateLimit-Limit', '100');
  res.setHeader('X-RateLimit-Remaining', rateLimit.remaining);
  res.setHeader('X-RateLimit-Reset', new Date(rateLimit.resetTime).toISOString());

  // Add security headers
  res.setHeader('X-Security-Policy', 'strict');
  res.setHeader('X-Threat-Detection', 'enabled');

  next();
};

// Export security enhancements
module.exports = {
  ThreatDetector,
  threatDetector,
  inputSanitizer,
  advancedRateLimiter,
  securityEnhancementMiddleware
};
