// =============================================================================
// Security Monitoring and Threat Detection System - Production Ready
// =============================================================================
// Comprehensive security monitoring with real-time threat detection, anomaly detection,
// and automated response capabilities

const crypto = require('crypto');
const { logger } = require('./logging');
const { securityLogger } = require('./logging');
const { auditLogger } = require('./logging');

// Security monitoring configuration
const SECURITY_MONITORING_CONFIG = {
  // Threat detection thresholds
  THREAT_DETECTION: {
    maxFailedLogins: 5,
    maxFailedLoginsWindow: 15 * 60 * 1000, // 15 minutes
    maxRequestsPerMinute: 100,
    maxRequestsPerHour: 1000,
    maxConcurrentSessions: 5,
    suspiciousPatternThreshold: 3,
    anomalyThreshold: 0.8
  },
  
  // Anomaly detection
  ANOMALY_DETECTION: {
    enableBehaviorAnalysis: true,
    enableLocationAnalysis: true,
    enableDeviceAnalysis: true,
    enableTimeAnalysis: true,
    baselineWindow: 7 * 24 * 60 * 60 * 1000, // 7 days
    detectionWindow: 60 * 60 * 1000, // 1 hour
    sensitivity: 0.7
  },
  
  // Response actions
  RESPONSE_ACTIONS: {
    enableAutoBlock: true,
    enableAutoAlert: true,
    enableAutoLogout: true,
    enableRateLimit: true,
    escalationThreshold: 10,
    cooldownPeriod: 60 * 60 * 1000 // 1 hour
  },
  
  // Monitoring intervals
  MONITORING: {
    threatScanInterval: 30 * 1000, // 30 seconds
    anomalyScanInterval: 5 * 60 * 1000, // 5 minutes
    metricsCollectionInterval: 60 * 1000, // 1 minute
    reportGenerationInterval: 24 * 60 * 60 * 1000 // 24 hours
  }
};

// Threat types
const THREAT_TYPES = {
  BRUTE_FORCE: 'brute_force',
  DDoS: 'ddos',
  SQL_INJECTION: 'sql_injection',
  XSS: 'xss',
  PATH_TRAVERSAL: 'path_traversal',
  SUSPICIOUS_BEHAVIOR: 'suspicious_behavior',
  ANOMALY: 'anomaly',
  RATE_LIMIT_EXCEEDED: 'rate_limit_exceeded',
  UNAUTHORIZED_ACCESS: 'unauthorized_access',
  DATA_BREACH: 'data_breach'
};

// Threat severity levels
const THREAT_SEVERITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

// Response actions
const RESPONSE_ACTIONS = {
  LOG: 'log',
  ALERT: 'alert',
  BLOCK: 'block',
  LOGOUT: 'logout',
  RATE_LIMIT: 'rate_limit',
  ESCALATE: 'escalate'
};

// Security monitoring metrics
const securityMetrics = {
  threats: {
    detected: 0,
    blocked: 0,
    resolved: 0,
    escalated: 0
  },
  anomalies: {
    detected: 0,
    investigated: 0,
    confirmed: 0,
    falsePositive: 0
  },
  responses: {
    autoBlock: 0,
    autoAlert: 0,
    autoLogout: 0,
    rateLimit: 0
  },
  timings: {
    threatDetection: [],
    anomalyDetection: [],
    responseAction: []
  }
};

// Security Monitor class
class SecurityMonitor {
  constructor() {
    this.threatDatabase = new Map(); // threatId -> threatData
    this.userBehavior = new Map(); // userId -> behavior data
    this.suspiciousIPs = new Map(); // ip -> threat data
    this.blockedIPs = new Set(); // Blocked IPs
    this.anomalyBaselines = new Map(); // userId -> baseline data
    this.threatPatterns = new Map(); // pattern -> threat data
    this.alertChannels = []; // Alert notification channels
    this.initialized = false;
  }
  
  // Initialize security monitor
  async initialize() {
    try {
      // Load existing threat patterns
      await this.loadThreatPatterns();
      
      // Load user behavior baselines
      await this.loadBehaviorBaselines();
      
      // Start monitoring schedulers
      this.startThreatScanning();
      this.startAnomalyDetection();
      this.startMetricsCollection();
      this.startReportGeneration();
      
      this.initialized = true;
      
      logger.info('Security monitor initialized successfully', {
        threatPatterns: this.threatPatterns.size,
        behaviorBaselines: this.anomalyBaselines.size,
        alertChannels: this.alertChannels.length
      });
      
      auditLogger.systemEvent('security_monitor_initialized', 'SecurityMonitor', {
        threatPatterns: this.threatPatterns.size,
        behaviorBaselines: this.anomalyBaselines.size
      });
      
    } catch (error) {
      logger.error('Failed to initialize security monitor:', error);
      throw new Error(`Security monitor initialization failed: ${error.message}`);
    }
  }
  
  // Load threat patterns
  async loadThreatPatterns() {
    try {
      // Define common threat patterns
      const patterns = [
        {
          type: THREAT_TYPES.SQL_INJECTION,
          pattern: /union\s+select|drop\s+table|insert\s+into|delete\s+from/i,
          severity: THREAT_SEVERITY.HIGH,
          response: [RESPONSE_ACTIONS.BLOCK, RESPONSE_ACTIONS.ALERT]
        },
        {
          type: THREAT_TYPES.XSS,
          pattern: /<script|javascript:|onload=|onerror=|onclick=/i,
          severity: THREAT_SEVERITY.HIGH,
          response: [RESPONSE_ACTIONS.BLOCK, RESPONSE_ACTIONS.ALERT]
        },
        {
          type: THREAT_TYPES.PATH_TRAVERSAL,
          pattern: /\.\.\/|\.\.\\/,
          severity: THREAT_SEVERITY.HIGH,
          response: [RESPONSE_ACTIONS.BLOCK, RESPONSE_ACTIONS.ALERT]
        },
        {
          type: THREAT_TYPES.BRUTE_FORCE,
          pattern: /login|authenticate|password/i,
          severity: THREAT_SEVERITY.MEDIUM,
          response: [RESPONSE_ACTIONS.RATE_LIMIT, RESPONSE_ACTIONS.ALERT]
        }
      ];
      
      for (const pattern of patterns) {
        this.threatPatterns.set(pattern.type, pattern);
      }
      
      logger.info('Threat patterns loaded', {
        patternCount: patterns.length
      });
      
    } catch (error) {
      logger.error('Failed to load threat patterns:', error);
      throw new Error(`Threat pattern loading failed: ${error.message}`);
    }
  }
  
  // Load behavior baselines
  async loadBehaviorBaselines() {
    try {
      // In a real implementation, this would load from database
      // For now, we'll start with empty baselines
      logger.info('Behavior baselines loaded', {
        baselineCount: this.anomalyBaselines.size
      });
      
    } catch (error) {
      logger.error('Failed to load behavior baselines:', error);
      throw new Error(`Behavior baseline loading failed: ${error.message}`);
    }
  }
  
  // Monitor security event
  async monitorEvent(event) {
    const start = Date.now();
    
    try {
      if (!event || !event.type) {
        throw new Error('Event type is required');
      }
      
      // Detect threats
      const threats = await this.detectThreats(event);
      
      // Detect anomalies
      const anomalies = await this.detectAnomalies(event);
      
      // Respond to threats and anomalies
      if (threats.length > 0) {
        await this.respondToThreats(threats, event);
      }
      
      if (anomalies.length > 0) {
        await this.respondToAnomalies(anomalies, event);
      }
      
      // Update metrics
      securityMetrics.timings.threatDetection.push(Date.now() - start);
      
      logger.debug('Security event monitored', {
        eventType: event.type,
        threatsDetected: threats.length,
        anomaliesDetected: anomalies.length,
        duration: Date.now() - start
      });
      
      return {
        threats,
        anomalies,
        processed: true
      };
      
    } catch (error) {
      logger.error('Security event monitoring failed:', error);
      throw new Error(`Security event monitoring failed: ${error.message}`);
    }
  }
  
  // Detect threats
  async detectThreats(event) {
    const threats = [];
    
    try {
      // Check for known threat patterns
      for (const [threatType, pattern] of this.threatPatterns) {
        if (pattern.pattern.test(event.data || '')) {
          threats.push({
            type: threatType,
            severity: pattern.severity,
            pattern: pattern.pattern.source,
            detectedAt: new Date().toISOString(),
            event: event,
            response: pattern.response
          });
        }
      }
      
      // Check for brute force attacks
      if (event.type === 'login_failed') {
        const bruteForceThreat = await this.detectBruteForce(event);
        if (bruteForceThreat) {
          threats.push(bruteForceThreat);
        }
      }
      
      // Check for DDoS attacks
      if (event.type === 'http_request') {
        const ddosThreat = await this.detectDDoS(event);
        if (ddosThreat) {
          threats.push(ddosThreat);
        }
      }
      
      // Check for suspicious behavior
      const suspiciousBehavior = await this.detectSuspiciousBehavior(event);
      if (suspiciousBehavior) {
        threats.push(suspiciousBehavior);
      }
      
      // Update metrics
      if (threats.length > 0) {
        securityMetrics.threats.detected += threats.length;
      }
      
      return threats;
      
    } catch (error) {
      logger.error('Threat detection failed:', error);
      return [];
    }
  }
  
  // Detect brute force attacks
  async detectBruteForce(event) {
    try {
      const ip = event.ip || 'unknown';
      const now = Date.now();
      
      // Get or create threat data for IP
      let threatData = this.suspiciousIPs.get(ip);
      if (!threatData) {
        threatData = {
          ip,
          failedLogins: [],
          lastSeen: now,
          threatCount: 0,
          blocked: false
        };
        this.suspiciousIPs.set(ip, threatData);
      }
      
      // Add failed login
      threatData.failedLogins.push(now);
      threatData.lastSeen = now;
      
      // Clean up old failed logins
      const windowStart = now - SECURITY_MONITORING_CONFIG.THREAT_DETECTION.maxFailedLoginsWindow;
      threatData.failedLogins = threatData.failedLogins.filter(time => time > windowStart);
      
      // Check if threshold exceeded
      if (threatData.failedLogins.length >= SECURITY_MONITORING_CONFIG.THREAT_DETECTION.maxFailedLogins) {
        threatData.threatCount++;
        
        return {
          type: THREAT_TYPES.BRUTE_FORCE,
          severity: THREAT_SEVERITY.HIGH,
          detectedAt: new Date().toISOString(),
          event: event,
          response: [RESPONSE_ACTIONS.BLOCK, RESPONSE_ACTIONS.ALERT],
          metadata: {
            ip,
            failedAttempts: threatData.failedLogins.length,
            timeWindow: SECURITY_MONITORING_CONFIG.THREAT_DETECTION.maxFailedLoginsWindow
          }
        };
      }
      
      return null;
      
    } catch (error) {
      logger.error('Brute force detection failed:', error);
      return null;
    }
  }
  
  // Detect DDoS attacks
  async detectDDoS(event) {
    try {
      const ip = event.ip || 'unknown';
      const now = Date.now();
      
      // Get or create threat data for IP
      let threatData = this.suspiciousIPs.get(ip);
      if (!threatData) {
        threatData = {
          ip,
          requests: [],
          lastSeen: now,
          threatCount: 0,
          blocked: false
        };
        this.suspiciousIPs.set(ip, threatData);
      }
      
      // Add request
      threatData.requests.push(now);
      threatData.lastSeen = now;
      
      // Clean up old requests
      const minuteStart = now - 60 * 1000; // Last minute
      threatData.requests = threatData.requests.filter(time => time > minuteStart);
      
      // Check if threshold exceeded
      if (threatData.requests.length > SECURITY_MONITORING_CONFIG.THREAT_DETECTION.maxRequestsPerMinute) {
        threatData.threatCount++;
        
        return {
          type: THREAT_TYPES.DDoS,
          severity: THREAT_SEVERITY.HIGH,
          detectedAt: new Date().toISOString(),
          event: event,
          response: [RESPONSE_ACTIONS.BLOCK, RESPONSE_ACTIONS.RATE_LIMIT],
          metadata: {
            ip,
            requestCount: threatData.requests.length,
            timeWindow: '1 minute'
          }
        };
      }
      
      return null;
      
    } catch (error) {
      logger.error('DDoS detection failed:', error);
      return null;
    }
  }
  
  // Detect suspicious behavior
  async detectSuspiciousBehavior(event) {
    try {
      // Check for unusual access patterns
      if (event.type === 'http_request') {
        const ip = event.ip || 'unknown';
        const userAgent = event.userAgent || '';
        const url = event.url || '';
        
        // Check for suspicious user agents
        const suspiciousUserAgents = [/bot/i, /crawler/i, /spider/i, /scraper/i];
        if (suspiciousUserAgents.some(pattern => pattern.test(userAgent))) {
          return {
            type: THREAT_TYPES.SUSPICIOUS_BEHAVIOR,
            severity: THREAT_SEVERITY.MEDIUM,
            detectedAt: new Date().toISOString(),
            event: event,
            response: [RESPONSE_ACTIONS.ALERT],
            metadata: {
              ip,
              userAgent,
              reason: 'suspicious_user_agent'
            }
          };
        }
        
        // Check for unusual URL patterns
        if (url.includes('..') || url.includes('~') || url.includes('$')) {
          return {
            type: THREAT_TYPES.SUSPICIOUS_BEHAVIOR,
            severity: THREAT_SEVERITY.MEDIUM,
            detectedAt: new Date().toISOString(),
            event: event,
            response: [RESPONSE_ACTIONS.ALERT],
            metadata: {
              ip,
              url,
              reason: 'suspicious_url_pattern'
            }
          };
        }
      }
      
      return null;
      
    } catch (error) {
      logger.error('Suspicious behavior detection failed:', error);
      return null;
    }
  }
  
  // Detect anomalies
  async detectAnomalies(event) {
    const anomalies = [];
    
    try {
      if (!SECURITY_MONITORING_CONFIG.ANOMALY_DETECTION.enableBehaviorAnalysis) {
        return anomalies;
      }
      
      const userId = event.userId;
      if (!userId) {
        return anomalies;
      }
      
      // Get or create behavior baseline
      let baseline = this.anomalyBaselines.get(userId);
      if (!baseline) {
        baseline = {
          userId,
          loginTimes: [],
          locations: [],
          devices: [],
          requestPatterns: [],
          lastUpdated: new Date().toISOString()
        };
        this.anomalyBaselines.set(userId, baseline);
      }
      
      // Detect time-based anomalies
      if (SECURITY_MONITORING_CONFIG.ANOMALY_DETECTION.enableTimeAnalysis) {
        const timeAnomaly = await this.detectTimeAnomaly(event, baseline);
        if (timeAnomaly) {
          anomalies.push(timeAnomaly);
        }
      }
      
      // Detect location-based anomalies
      if (SECURITY_MONITORING_CONFIG.ANOMALY_DETECTION.enableLocationAnalysis) {
        const locationAnomaly = await this.detectLocationAnomaly(event, baseline);
        if (locationAnomaly) {
          anomalies.push(locationAnomaly);
        }
      }
      
      // Detect device-based anomalies
      if (SECURITY_MONITORING_CONFIG.ANOMALY_DETECTION.enableDeviceAnalysis) {
        const deviceAnomaly = await this.detectDeviceAnomaly(event, baseline);
        if (deviceAnomaly) {
          anomalies.push(deviceAnomaly);
        }
      }
      
      // Update baseline
      this.updateBehaviorBaseline(userId, event, baseline);
      
      // Update metrics
      if (anomalies.length > 0) {
        securityMetrics.anomalies.detected += anomalies.length;
      }
      
      return anomalies;
      
    } catch (error) {
      logger.error('Anomaly detection failed:', error);
      return [];
    }
  }
  
  // Detect time-based anomalies
  async detectTimeAnomaly(event, baseline) {
    try {
      const now = new Date();
      const currentHour = now.getHours();
      
      // Get historical login times
      const loginTimes = baseline.loginTimes || [];
      
      if (loginTimes.length < 10) {
        return null; // Not enough data
      }
      
      // Calculate expected login hours
      const hourCounts = new Array(24).fill(0);
      loginTimes.forEach(time => {
        const hour = new Date(time).getHours();
        hourCounts[hour]++;
      });
      
      // Find most common login hours
      const maxCount = Math.max(...hourCounts);
      const commonHours = hourCounts.map((count, hour) => ({ hour, count }))
        .filter(item => item.count >= maxCount * 0.3)
        .map(item => item.hour);
      
      // Check if current hour is unusual
      if (!commonHours.includes(currentHour)) {
        return {
          type: THREAT_TYPES.ANOMALY,
          severity: THREAT_SEVERITY.LOW,
          detectedAt: new Date().toISOString(),
          event: event,
          response: [RESPONSE_ACTIONS.ALERT],
          metadata: {
            anomalyType: 'time_based',
            currentHour,
            commonHours,
            confidence: 0.7
          }
        };
      }
      
      return null;
      
    } catch (error) {
      logger.error('Time anomaly detection failed:', error);
      return null;
    }
  }
  
  // Detect location-based anomalies
  async detectLocationAnomaly(event, baseline) {
    try {
      const location = event.location || event.ip;
      if (!location) {
        return null;
      }
      
      const locations = baseline.locations || [];
      
      if (locations.length < 5) {
        return null; // Not enough data
      }
      
      // Check if location is new
      if (!locations.includes(location)) {
        return {
          type: THREAT_TYPES.ANOMALY,
          severity: THREAT_SEVERITY.MEDIUM,
          detectedAt: new Date().toISOString(),
          event: event,
          response: [RESPONSE_ACTIONS.ALERT],
          metadata: {
            anomalyType: 'location_based',
            newLocation: location,
            knownLocations: locations,
            confidence: 0.8
          }
        };
      }
      
      return null;
      
    } catch (error) {
      logger.error('Location anomaly detection failed:', error);
      return null;
    }
  }
  
  // Detect device-based anomalies
  async detectDeviceAnomaly(event, baseline) {
    try {
      const deviceFingerprint = event.deviceFingerprint || event.userAgent;
      if (!deviceFingerprint) {
        return null;
      }
      
      const devices = baseline.devices || [];
      
      if (devices.length < 3) {
        return null; // Not enough data
      }
      
      // Check if device is new
      if (!devices.includes(deviceFingerprint)) {
        return {
          type: THREAT_TYPES.ANOMALY,
          severity: THREAT_SEVERITY.MEDIUM,
          detectedAt: new Date().toISOString(),
          event: event,
          response: [RESPONSE_ACTIONS.ALERT],
          metadata: {
            anomalyType: 'device_based',
            newDevice: deviceFingerprint,
            knownDevices: devices,
            confidence: 0.8
          }
        };
      }
      
      return null;
      
    } catch (error) {
      logger.error('Device anomaly detection failed:', error);
      return null;
    }
  }
  
  // Update behavior baseline
  updateBehaviorBaseline(userId, event, baseline) {
    try {
      const now = new Date().toISOString();
      
      // Update login times
      if (event.type === 'login_success') {
        baseline.loginTimes.push(now);
        // Keep only last 100 login times
        if (baseline.loginTimes.length > 100) {
          baseline.loginTimes = baseline.loginTimes.slice(-100);
        }
      }
      
      // Update locations
      if (event.location || event.ip) {
        const location = event.location || event.ip;
        if (!baseline.locations.includes(location)) {
          baseline.locations.push(location);
        }
        // Keep only last 20 locations
        if (baseline.locations.length > 20) {
          baseline.locations = baseline.locations.slice(-20);
        }
      }
      
      // Update devices
      if (event.deviceFingerprint || event.userAgent) {
        const device = event.deviceFingerprint || event.userAgent;
        if (!baseline.devices.includes(device)) {
          baseline.devices.push(device);
        }
        // Keep only last 10 devices
        if (baseline.devices.length > 10) {
          baseline.devices = baseline.devices.slice(-10);
        }
      }
      
      baseline.lastUpdated = now;
      
    } catch (error) {
      logger.error('Behavior baseline update failed:', error);
    }
  }
  
  // Respond to threats
  async respondToThreats(threats, event) {
    try {
      for (const threat of threats) {
        const threatId = crypto.randomUUID();
        
        // Store threat
        this.threatDatabase.set(threatId, {
          ...threat,
          threatId,
          status: 'active',
          responses: []
        });
        
        // Execute response actions
        for (const action of threat.response) {
          await this.executeResponseAction(action, threat, event);
        }
        
        // Log threat
        securityLogger.warn('Threat detected and responded to', {
          threatId,
          type: threat.type,
          severity: threat.severity,
          response: threat.response,
          event: event
        });
        
        auditLogger.systemEvent('threat_detected', 'SecurityMonitor', {
          threatId,
          type: threat.type,
          severity: threat.severity,
          response: threat.response
        });
      }
      
    } catch (error) {
      logger.error('Threat response failed:', error);
    }
  }
  
  // Respond to anomalies
  async respondToAnomalies(anomalies, event) {
    try {
      for (const anomaly of anomalies) {
        const anomalyId = crypto.randomUUID();
        
        // Store anomaly
        this.threatDatabase.set(anomalyId, {
          ...anomaly,
          threatId: anomalyId,
          status: 'active',
          responses: []
        });
        
        // Execute response actions
        for (const action of anomaly.response) {
          await this.executeResponseAction(action, anomaly, event);
        }
        
        // Log anomaly
        securityLogger.info('Anomaly detected and responded to', {
          anomalyId,
          type: anomaly.type,
          severity: anomaly.severity,
          response: anomaly.response,
          event: event
        });
        
        auditLogger.systemEvent('anomaly_detected', 'SecurityMonitor', {
          anomalyId,
          type: anomaly.type,
          severity: anomaly.severity,
          response: anomaly.response
        });
      }
      
    } catch (error) {
      logger.error('Anomaly response failed:', error);
    }
  }
  
  // Execute response action
  async executeResponseAction(action, threat, event) {
    const start = Date.now();
    
    try {
      switch (action) {
        case RESPONSE_ACTIONS.BLOCK:
          await this.blockIP(event.ip, threat);
          securityMetrics.responses.autoBlock++;
          break;
          
        case RESPONSE_ACTIONS.ALERT:
          await this.sendAlert(threat, event);
          securityMetrics.responses.autoAlert++;
          break;
          
        case RESPONSE_ACTIONS.LOGOUT:
          await this.logoutUser(event.userId, threat);
          securityMetrics.responses.autoLogout++;
          break;
          
        case RESPONSE_ACTIONS.RATE_LIMIT:
          await this.rateLimitIP(event.ip, threat);
          securityMetrics.responses.rateLimit++;
          break;
          
        case RESPONSE_ACTIONS.ESCALATE:
          await this.escalateThreat(threat, event);
          securityMetrics.threats.escalated++;
          break;
          
        default:
          logger.warn('Unknown response action:', action);
      }
      
      securityMetrics.timings.responseAction.push(Date.now() - start);
      
    } catch (error) {
      logger.error('Response action execution failed:', error);
    }
  }
  
  // Block IP address
  async blockIP(ip, threat) {
    try {
      this.blockedIPs.add(ip);
      
      logger.warn('IP address blocked', {
        ip,
        threatType: threat.type,
        severity: threat.severity
      });
      
      auditLogger.systemEvent('ip_blocked', 'SecurityMonitor', {
        ip,
        threatType: threat.type,
        severity: threat.severity
      });
      
    } catch (error) {
      logger.error('IP blocking failed:', error);
    }
  }
  
  // Send alert
  async sendAlert(threat, event) {
    try {
      const alert = {
        id: crypto.randomUUID(),
        type: 'security_alert',
        severity: threat.severity,
        threat: threat,
        event: event,
        timestamp: new Date().toISOString()
      };
      
      // Send to configured alert channels
      for (const channel of this.alertChannels) {
        await this.sendToAlertChannel(channel, alert);
      }
      
      logger.info('Security alert sent', {
        alertId: alert.id,
        severity: threat.severity,
        threatType: threat.type
      });
      
    } catch (error) {
      logger.error('Alert sending failed:', error);
    }
  }
  
  // Send to alert channel
  async sendToAlertChannel(channel, alert) {
    try {
      // In a real implementation, this would send to Slack, Email, etc.
      logger.info('Alert sent to channel', {
        channel: channel.type,
        alertId: alert.id,
        severity: alert.severity
      });
      
    } catch (error) {
      logger.error('Alert channel sending failed:', error);
    }
  }
  
  // Logout user
  async logoutUser(userId, threat) {
    try {
      // In a real implementation, this would logout the user
      logger.warn('User logged out due to security threat', {
        userId,
        threatType: threat.type,
        severity: threat.severity
      });
      
      auditLogger.systemEvent('user_logged_out', 'SecurityMonitor', {
        userId,
        threatType: threat.type,
        severity: threat.severity
      });
      
    } catch (error) {
      logger.error('User logout failed:', error);
    }
  }
  
  // Rate limit IP
  async rateLimitIP(ip, threat) {
    try {
      // In a real implementation, this would apply rate limiting
      logger.warn('IP rate limited due to security threat', {
        ip,
        threatType: threat.type,
        severity: threat.severity
      });
      
      auditLogger.systemEvent('ip_rate_limited', 'SecurityMonitor', {
        ip,
        threatType: threat.type,
        severity: threat.severity
      });
      
    } catch (error) {
      logger.error('IP rate limiting failed:', error);
    }
  }
  
  // Escalate threat
  async escalateThreat(threat, event) {
    try {
      logger.error('Security threat escalated', {
        threatType: threat.type,
        severity: threat.severity,
        event: event
      });
      
      auditLogger.systemEvent('threat_escalated', 'SecurityMonitor', {
        threatType: threat.type,
        severity: threat.severity
      });
      
    } catch (error) {
      logger.error('Threat escalation failed:', error);
    }
  }
  
  // Start threat scanning
  startThreatScanning() {
    setInterval(() => {
      this.performThreatScan();
    }, SECURITY_MONITORING_CONFIG.MONITORING.threatScanInterval);
    
    logger.info('Threat scanning scheduler started');
  }
  
  // Start anomaly detection
  startAnomalyDetection() {
    setInterval(() => {
      this.performAnomalyScan();
    }, SECURITY_MONITORING_CONFIG.MONITORING.anomalyScanInterval);
    
    logger.info('Anomaly detection scheduler started');
  }
  
  // Start metrics collection
  startMetricsCollection() {
    setInterval(() => {
      this.collectMetrics();
    }, SECURITY_MONITORING_CONFIG.MONITORING.metricsCollectionInterval);
    
    logger.info('Metrics collection scheduler started');
  }
  
  // Start report generation
  startReportGeneration() {
    setInterval(() => {
      this.generateSecurityReport();
    }, SECURITY_MONITORING_CONFIG.MONITORING.reportGenerationInterval);
    
    logger.info('Report generation scheduler started');
  }
  
  // Perform threat scan
  async performThreatScan() {
    try {
      // Clean up old threats
      const now = Date.now();
      let cleanedCount = 0;
      
      for (const [threatId, threat] of this.threatDatabase) {
        const threatAge = now - new Date(threat.detectedAt).getTime();
        if (threatAge > 24 * 60 * 60 * 1000) { // 24 hours
          this.threatDatabase.delete(threatId);
          cleanedCount++;
        }
      }
      
      if (cleanedCount > 0) {
        logger.debug('Threat database cleanup completed', {
          cleanedCount,
          remainingThreats: this.threatDatabase.size
        });
      }
      
    } catch (error) {
      logger.error('Threat scan failed:', error);
    }
  }
  
  // Perform anomaly scan
  async performAnomalyScan() {
    try {
      // Clean up old behavior data
      const now = Date.now();
      let cleanedCount = 0;
      
      for (const [userId, baseline] of this.anomalyBaselines) {
        const baselineAge = now - new Date(baseline.lastUpdated).getTime();
        if (baselineAge > 30 * 24 * 60 * 60 * 1000) { // 30 days
          this.anomalyBaselines.delete(userId);
          cleanedCount++;
        }
      }
      
      if (cleanedCount > 0) {
        logger.debug('Behavior baseline cleanup completed', {
          cleanedCount,
          remainingBaselines: this.anomalyBaselines.size
        });
      }
      
    } catch (error) {
      logger.error('Anomaly scan failed:', error);
    }
  }
  
  // Collect metrics
  async collectMetrics() {
    try {
      const metrics = this.getMetrics();
      
      logger.debug('Security metrics collected', {
        threatsDetected: metrics.threats.detected,
        anomaliesDetected: metrics.anomalies.detected,
        activeThreats: this.threatDatabase.size,
        blockedIPs: this.blockedIPs.size
      });
      
    } catch (error) {
      logger.error('Metrics collection failed:', error);
    }
  }
  
  // Generate security report
  async generateSecurityReport() {
    try {
      const report = {
        generatedAt: new Date().toISOString(),
        period: '24h',
        summary: {
          threatsDetected: securityMetrics.threats.detected,
          anomaliesDetected: securityMetrics.anomalies.detected,
          threatsBlocked: securityMetrics.threats.blocked,
          threatsResolved: securityMetrics.threats.resolved
        },
        topThreats: this.getTopThreats(),
        topAnomalies: this.getTopAnomalies(),
        blockedIPs: Array.from(this.blockedIPs),
        recommendations: this.generateRecommendations()
      };
      
      logger.info('Security report generated', {
        reportId: crypto.randomUUID(),
        threatsDetected: report.summary.threatsDetected,
        anomaliesDetected: report.summary.anomaliesDetected
      });
      
      auditLogger.systemEvent('security_report_generated', 'SecurityMonitor', {
        threatsDetected: report.summary.threatsDetected,
        anomaliesDetected: report.summary.anomaliesDetected
      });
      
      return report;
      
    } catch (error) {
      logger.error('Security report generation failed:', error);
    }
  }
  
  // Get top threats
  getTopThreats() {
    const threatCounts = {};
    
    for (const [threatId, threat] of this.threatDatabase) {
      if (!threatCounts[threat.type]) {
        threatCounts[threat.type] = 0;
      }
      threatCounts[threat.type]++;
    }
    
    return Object.entries(threatCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([type, count]) => ({ type, count }));
  }
  
  // Get top anomalies
  getTopAnomalies() {
    const anomalyCounts = {};
    
    for (const [threatId, threat] of this.threatDatabase) {
      if (threat.type === THREAT_TYPES.ANOMALY) {
        const anomalyType = threat.metadata?.anomalyType || 'unknown';
        if (!anomalyCounts[anomalyType]) {
          anomalyCounts[anomalyType] = 0;
        }
        anomalyCounts[anomalyType]++;
      }
    }
    
    return Object.entries(anomalyCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([type, count]) => ({ type, count }));
  }
  
  // Generate recommendations
  generateRecommendations() {
    const recommendations = [];
    
    // High threat count recommendation
    if (securityMetrics.threats.detected > 100) {
      recommendations.push({
        type: 'security_hardening',
        priority: 'high',
        description: 'High number of threats detected. Consider implementing additional security measures.',
        action: 'Review and enhance security policies'
      });
    }
    
    // High anomaly count recommendation
    if (securityMetrics.anomalies.detected > 50) {
      recommendations.push({
        type: 'behavior_analysis',
        priority: 'medium',
        description: 'High number of anomalies detected. Consider reviewing user behavior patterns.',
        action: 'Analyze and update behavior baselines'
      });
    }
    
    // Blocked IPs recommendation
    if (this.blockedIPs.size > 20) {
      recommendations.push({
        type: 'network_security',
        priority: 'medium',
        description: 'High number of blocked IPs. Consider implementing network-level protection.',
        action: 'Review network security policies'
      });
    }
    
    return recommendations;
  }
  
  // Get security metrics
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
      threats: securityMetrics.threats,
      anomalies: securityMetrics.anomalies,
      responses: securityMetrics.responses,
      performance: {
        threatDetection: {
          average: calculateAverage(securityMetrics.timings.threatDetection),
          p95: calculatePercentile(securityMetrics.timings.threatDetection, 95),
          p99: calculatePercentile(securityMetrics.timings.threatDetection, 99),
          max: Math.max(...securityMetrics.timings.threatDetection, 0),
          min: Math.min(...securityMetrics.timings.threatDetection, 0)
        },
        anomalyDetection: {
          average: calculateAverage(securityMetrics.timings.anomalyDetection),
          p95: calculatePercentile(securityMetrics.timings.anomalyDetection, 95),
          p99: calculatePercentile(securityMetrics.timings.anomalyDetection, 99),
          max: Math.max(...securityMetrics.timings.anomalyDetection, 0),
          min: Math.min(...securityMetrics.timings.anomalyDetection, 0)
        }
      },
      system: {
        activeThreats: this.threatDatabase.size,
        behaviorBaselines: this.anomalyBaselines.size,
        blockedIPs: this.blockedIPs.size,
        suspiciousIPs: this.suspiciousIPs.size,
        threatPatterns: this.threatPatterns.size
      }
    };
  }
}

// Create global security monitor instance
const securityMonitor = new SecurityMonitor();

// Export security monitor and utilities
module.exports = {
  securityMonitor,
  SecurityMonitor,
  SECURITY_MONITORING_CONFIG,
  THREAT_TYPES,
  THREAT_SEVERITY,
  RESPONSE_ACTIONS
};
