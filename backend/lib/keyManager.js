// =============================================================================
// Secure Key Management System - Production Ready
// =============================================================================
// Comprehensive key management system for CryptoPulse with key rotation,
// secure storage, and compliance features

const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');
const { logger } = require('./logging');
const { securityLogger } = require('./logging');
const { auditLogger } = require('./logging');
const {
  generateSecureRandom,
  generateEncryptionKey,
  generateRSAKeyPair,
  encryptAES,
  decryptAES,
  generateHMAC,
  verifyHMAC,
  hashSHA256
} = require('./encryption');

// Key management configuration
const KEY_MANAGEMENT_CONFIG = {
  // Key types and their configurations
  KEY_TYPES: {
    ENCRYPTION: {
      algorithm: 'AES',
      keyLength: 32,
      rotationInterval: 90 * 24 * 60 * 60 * 1000, // 90 days
      maxKeys: 10 // Keep last 10 keys for rotation
    },
    SIGNING: {
      algorithm: 'HMAC',
      keyLength: 32,
      rotationInterval: 30 * 24 * 60 * 60 * 1000, // 30 days
      maxKeys: 20 // Keep last 20 keys for rotation
    },
    API: {
      algorithm: 'AES',
      keyLength: 32,
      rotationInterval: 365 * 24 * 60 * 60 * 1000, // 1 year
      maxKeys: 5 // Keep last 5 keys for rotation
    },
    RSA: {
      algorithm: 'RSA',
      keySize: 4096,
      rotationInterval: 365 * 24 * 60 * 60 * 1000, // 1 year
      maxKeys: 3 // Keep last 3 key pairs for rotation
    }
  },
  
  // Storage configuration
  STORAGE: {
    keysDirectory: path.join(process.cwd(), 'keys'),
    backupDirectory: path.join(process.cwd(), 'keys', 'backups'),
    tempDirectory: path.join(process.cwd(), 'keys', 'temp'),
    permissions: 0o600, // Read/write for owner only
    backupRetentionDays: 365 // Keep backups for 1 year
  },
  
  // Security configuration
  SECURITY: {
    masterKeyDerivationIterations: 100000,
    keyEncryptionAlgorithm: 'aes-256-gcm',
    keyDerivationAlgorithm: 'pbkdf2',
    keyDerivationDigest: 'sha256',
    keyDerivationLength: 32
  }
};

// Key metadata structure
class KeyMetadata {
  constructor(type, algorithm, keyId, createdAt, expiresAt, version = 1) {
    this.type = type;
    this.algorithm = algorithm;
    this.keyId = keyId;
    this.createdAt = createdAt;
    this.expiresAt = expiresAt;
    this.version = version;
    this.usageCount = 0;
    this.lastUsed = null;
    this.status = 'active'; // active, expired, revoked, compromised
    this.tags = [];
    this.description = '';
    this.createdBy = 'system';
    this.rotationReason = 'automatic';
  }
  
  toJSON() {
    return {
      type: this.type,
      algorithm: this.algorithm,
      keyId: this.keyId,
      createdAt: this.createdAt,
      expiresAt: this.expiresAt,
      version: this.version,
      usageCount: this.usageCount,
      lastUsed: this.lastUsed,
      status: this.status,
      tags: this.tags,
      description: this.description,
      createdBy: this.createdBy,
      rotationReason: this.rotationReason
    };
  }
  
  static fromJSON(data) {
    const metadata = new KeyMetadata(data.type, data.algorithm, data.keyId, data.createdAt, data.expiresAt, data.version);
    metadata.usageCount = data.usageCount || 0;
    metadata.lastUsed = data.lastUsed || null;
    metadata.status = data.status || 'active';
    metadata.tags = data.tags || [];
    metadata.description = data.description || '';
    metadata.createdBy = data.createdBy || 'system';
    metadata.rotationReason = data.rotationReason || 'automatic';
    return metadata;
  }
}

// Key management metrics
const keyManagementMetrics = {
  operations: {
    keyGeneration: 0,
    keyRotation: 0,
    keyRetrieval: 0,
    keyRevocation: 0,
    keyBackup: 0,
    keyRestore: 0
  },
  timings: {
    keyGeneration: [],
    keyRotation: [],
    keyRetrieval: [],
    keyRevocation: [],
    keyBackup: [],
    keyRestore: []
  },
  errors: {
    keyGeneration: 0,
    keyRotation: 0,
    keyRetrieval: 0,
    keyRevocation: 0,
    keyBackup: 0,
    keyRestore: 0
  },
  keyCounts: {
    total: 0,
    active: 0,
    expired: 0,
    revoked: 0,
    compromised: 0
  }
};

// Key Manager class
class KeyManager {
  constructor() {
    this.masterKey = null;
    this.keys = new Map(); // keyId -> { metadata, encryptedKey }
    this.keyIndex = new Map(); // type -> [keyIds]
    this.initialized = false;
    this.rotationScheduler = null;
  }
  
  // Initialize the key manager
  async initialize(masterPassword = null) {
    const start = Date.now();
    
    try {
      // Create directories if they don't exist
      await this.ensureDirectories();
      
      // Load or generate master key
      this.masterKey = await this.loadOrGenerateMasterKey(masterPassword);
      
      // Load existing keys
      await this.loadKeys();
      
      // Start key rotation scheduler
      this.startRotationScheduler();
      
      this.initialized = true;
      
      logger.info('Key manager initialized successfully', {
        keyCount: this.keys.size,
        keyTypes: Array.from(this.keyIndex.keys()),
        duration: Date.now() - start
      });
      
      auditLogger.systemEvent('key_manager_initialized', 'KeyManager', {
        keyCount: this.keys.size,
        keyTypes: Array.from(this.keyIndex.keys())
      });
      
    } catch (error) {
      logger.error('Failed to initialize key manager:', error);
      throw new Error(`Key manager initialization failed: ${error.message}`);
    }
  }
  
  // Ensure required directories exist
  async ensureDirectories() {
    const directories = [
      KEY_MANAGEMENT_CONFIG.STORAGE.keysDirectory,
      KEY_MANAGEMENT_CONFIG.STORAGE.backupDirectory,
      KEY_MANAGEMENT_CONFIG.STORAGE.tempDirectory
    ];
    
    for (const dir of directories) {
      try {
        await fs.mkdir(dir, { recursive: true, mode: KEY_MANAGEMENT_CONFIG.STORAGE.permissions });
      } catch (error) {
        if (error.code !== 'EEXIST') {
          throw error;
        }
      }
    }
  }
  
  // Load or generate master key
  async loadOrGenerateMasterKey(masterPassword = null) {
    const masterKeyPath = path.join(KEY_MANAGEMENT_CONFIG.STORAGE.keysDirectory, 'master.key');
    
    try {
      // Try to load existing master key
      const masterKeyData = await fs.readFile(masterKeyPath);
      const masterKeyInfo = JSON.parse(masterKeyData.toString());
      
      if (masterPassword) {
        // Derive master key from password
        const salt = Buffer.from(masterKeyInfo.salt, 'hex');
        const masterKey = crypto.pbkdf2Sync(
          masterPassword,
          salt,
          KEY_MANAGEMENT_CONFIG.SECURITY.masterKeyDerivationIterations,
          KEY_MANAGEMENT_CONFIG.SECURITY.keyDerivationLength,
          KEY_MANAGEMENT_CONFIG.SECURITY.keyDerivationDigest
        );
        
        // Verify master key by decrypting a test value
        try {
          const testData = Buffer.from(masterKeyInfo.testData, 'hex');
          decryptAES(testData, masterKey);
          return masterKey;
        } catch (error) {
          throw new Error('Invalid master password');
        }
      } else {
        throw new Error('Master password required for existing key manager');
      }
    } catch (error) {
      if (error.code === 'ENOENT' || error.message === 'Master password required for existing key manager') {
        // Generate new master key
        if (!masterPassword) {
          throw new Error('Master password required for new key manager');
        }
        
        const salt = generateSecureRandom(32);
        const masterKey = crypto.pbkdf2Sync(
          masterPassword,
          salt,
          KEY_MANAGEMENT_CONFIG.SECURITY.masterKeyDerivationIterations,
          KEY_MANAGEMENT_CONFIG.SECURITY.keyDerivationLength,
          KEY_MANAGEMENT_CONFIG.SECURITY.keyDerivationDigest
        );
        
        // Create test data for verification
        const testData = encryptAES('test', masterKey);
        
        // Save master key info
        const masterKeyInfo = {
          salt: salt.toString('hex'),
          testData: testData.toString('hex'),
          createdAt: new Date().toISOString(),
          version: 1
        };
        
        await fs.writeFile(masterKeyPath, JSON.stringify(masterKeyInfo, null, 2), {
          mode: KEY_MANAGEMENT_CONFIG.STORAGE.permissions
        });
        
        logger.info('Master key generated and saved');
        return masterKey;
      }
      
      throw error;
    }
  }
  
  // Load existing keys
  async loadKeys() {
    const keysPath = path.join(KEY_MANAGEMENT_CONFIG.STORAGE.keysDirectory, 'keys.json');
    
    try {
      const keysData = await fs.readFile(keysPath);
      const keysInfo = JSON.parse(keysData.toString());
      
      for (const [keyId, keyInfo] of Object.entries(keysInfo)) {
        const metadata = KeyMetadata.fromJSON(keyInfo.metadata);
        this.keys.set(keyId, {
          metadata,
          encryptedKey: Buffer.from(keyInfo.encryptedKey, 'hex')
        });
        
        // Update index
        if (!this.keyIndex.has(metadata.type)) {
          this.keyIndex.set(metadata.type, []);
        }
        this.keyIndex.get(metadata.type).push(keyId);
      }
      
      this.updateKeyCounts();
      
      logger.info('Keys loaded successfully', {
        keyCount: this.keys.size,
        keyTypes: Array.from(this.keyIndex.keys())
      });
      
    } catch (error) {
      if (error.code === 'ENOENT') {
        logger.info('No existing keys found, starting with empty key store');
      } else {
        throw error;
      }
    }
  }
  
  // Save keys to disk
  async saveKeys() {
    const keysPath = path.join(KEY_MANAGEMENT_CONFIG.STORAGE.keysDirectory, 'keys.json');
    
    try {
      const keysInfo = {};
      
      for (const [keyId, keyData] of this.keys) {
        keysInfo[keyId] = {
          metadata: keyData.metadata.toJSON(),
          encryptedKey: keyData.encryptedKey.toString('hex')
        };
      }
      
      await fs.writeFile(keysPath, JSON.stringify(keysInfo, null, 2), {
        mode: KEY_MANAGEMENT_CONFIG.STORAGE.permissions
      });
      
      logger.debug('Keys saved successfully', {
        keyCount: this.keys.size
      });
      
    } catch (error) {
      logger.error('Failed to save keys:', error);
      throw new Error(`Failed to save keys: ${error.message}`);
    }
  }
  
  // Generate a new key
  async generateKey(type, description = '', tags = [], createdBy = 'system') {
    const start = Date.now();
    
    try {
      if (!this.initialized) {
        throw new Error('Key manager not initialized');
      }
      
      const keyConfig = KEY_MANAGEMENT_CONFIG.KEY_TYPES[type];
      if (!keyConfig) {
        throw new Error(`Unsupported key type: ${type}`);
      }
      
      // Generate key ID
      const keyId = this.generateKeyId(type);
      
      // Generate key based on type
      let key;
      let algorithm;
      
      if (type === 'RSA') {
        const keyPair = generateRSAKeyPair();
        key = {
          privateKey: keyPair.privateKey,
          publicKey: keyPair.publicKey
        };
        algorithm = 'RSA';
      } else {
        key = generateEncryptionKey(keyConfig.algorithm);
        algorithm = keyConfig.algorithm;
      }
      
      // Encrypt key with master key
      const keyData = JSON.stringify(key);
      const encryptedKey = encryptAES(keyData, this.masterKey);
      
      // Create metadata
      const now = new Date();
      const expiresAt = new Date(now.getTime() + keyConfig.rotationInterval);
      
      const metadata = new KeyMetadata(type, algorithm, keyId, now.toISOString(), expiresAt.toISOString());
      metadata.description = description;
      metadata.tags = tags;
      metadata.createdBy = createdBy;
      
      // Store key
      this.keys.set(keyId, {
        metadata,
        encryptedKey
      });
      
      // Update index
      if (!this.keyIndex.has(type)) {
        this.keyIndex.set(type, []);
      }
      this.keyIndex.get(type).push(keyId);
      
      // Save to disk
      await this.saveKeys();
      
      // Update metrics
      keyManagementMetrics.operations.keyGeneration++;
      keyManagementMetrics.timings.keyGeneration.push(Date.now() - start);
      this.updateKeyCounts();
      
      logger.info('Key generated successfully', {
        keyId,
        type,
        algorithm,
        expiresAt: expiresAt.toISOString(),
        duration: Date.now() - start
      });
      
      auditLogger.systemEvent('key_generated', 'KeyManager', {
        keyId,
        type,
        algorithm,
        createdBy
      });
      
      return {
        keyId,
        metadata: metadata.toJSON(),
        publicKey: type === 'RSA' ? key.publicKey : null
      };
      
    } catch (error) {
      keyManagementMetrics.errors.keyGeneration++;
      logger.error('Key generation failed:', error);
      throw new Error(`Key generation failed: ${error.message}`);
    }
  }
  
  // Get a key by ID
  async getKey(keyId, incrementUsage = true) {
    const start = Date.now();
    
    try {
      if (!this.initialized) {
        throw new Error('Key manager not initialized');
      }
      
      const keyData = this.keys.get(keyId);
      if (!keyData) {
        throw new Error(`Key not found: ${keyId}`);
      }
      
      if (keyData.metadata.status !== 'active') {
        throw new Error(`Key is not active: ${keyData.metadata.status}`);
      }
      
      // Check if key is expired
      const now = new Date();
      const expiresAt = new Date(keyData.metadata.expiresAt);
      if (now > expiresAt) {
        keyData.metadata.status = 'expired';
        await this.saveKeys();
        throw new Error(`Key has expired: ${keyId}`);
      }
      
      // Decrypt key
      const decryptedKeyData = decryptAES(keyData.encryptedKey, this.masterKey);
      const key = JSON.parse(decryptedKeyData);
      
      // Update usage statistics
      if (incrementUsage) {
        keyData.metadata.usageCount++;
        keyData.metadata.lastUsed = now.toISOString();
        await this.saveKeys();
      }
      
      // Update metrics
      keyManagementMetrics.operations.keyRetrieval++;
      keyManagementMetrics.timings.keyRetrieval.push(Date.now() - start);
      
      logger.debug('Key retrieved successfully', {
        keyId,
        type: keyData.metadata.type,
        usageCount: keyData.metadata.usageCount,
        duration: Date.now() - start
      });
      
      return {
        keyId,
        metadata: keyData.metadata.toJSON(),
        key
      };
      
    } catch (error) {
      keyManagementMetrics.errors.keyRetrieval++;
      logger.error('Key retrieval failed:', error);
      throw new Error(`Key retrieval failed: ${error.message}`);
    }
  }
  
  // Get the latest active key of a specific type
  async getLatestKey(type) {
    try {
      if (!this.initialized) {
        throw new Error('Key manager not initialized');
      }
      
      const keyIds = this.keyIndex.get(type);
      if (!keyIds || keyIds.length === 0) {
        throw new Error(`No keys found for type: ${type}`);
      }
      
      // Find the most recent active key
      let latestKey = null;
      let latestTime = 0;
      
      for (const keyId of keyIds) {
        const keyData = this.keys.get(keyId);
        if (keyData && keyData.metadata.status === 'active') {
          const createdAt = new Date(keyData.metadata.createdAt).getTime();
          if (createdAt > latestTime) {
            latestTime = createdAt;
            latestKey = keyData;
          }
        }
      }
      
      if (!latestKey) {
        throw new Error(`No active keys found for type: ${type}`);
      }
      
      return await this.getKey(latestKey.metadata.keyId, false);
      
    } catch (error) {
      logger.error('Failed to get latest key:', error);
      throw new Error(`Failed to get latest key: ${error.message}`);
    }
  }
  
  // Rotate a key
  async rotateKey(keyId, reason = 'automatic') {
    const start = Date.now();
    
    try {
      if (!this.initialized) {
        throw new Error('Key manager not initialized');
      }
      
      const keyData = this.keys.get(keyId);
      if (!keyData) {
        throw new Error(`Key not found: ${keyId}`);
      }
      
      const oldMetadata = keyData.metadata;
      
      // Generate new key
      const newKey = await this.generateKey(
        oldMetadata.type,
        `${oldMetadata.description} (rotated)`,
        oldMetadata.tags,
        'system'
      );
      
      // Mark old key as expired
      keyData.metadata.status = 'expired';
      keyData.metadata.rotationReason = reason;
      await this.saveKeys();
      
      // Update metrics
      keyManagementMetrics.operations.keyRotation++;
      keyManagementMetrics.timings.keyRotation.push(Date.now() - start);
      this.updateKeyCounts();
      
      logger.info('Key rotated successfully', {
        oldKeyId: keyId,
        newKeyId: newKey.keyId,
        type: oldMetadata.type,
        reason,
        duration: Date.now() - start
      });
      
      auditLogger.systemEvent('key_rotated', 'KeyManager', {
        oldKeyId: keyId,
        newKeyId: newKey.keyId,
        type: oldMetadata.type,
        reason
      });
      
      return newKey;
      
    } catch (error) {
      keyManagementMetrics.errors.keyRotation++;
      logger.error('Key rotation failed:', error);
      throw new Error(`Key rotation failed: ${error.message}`);
    }
  }
  
  // Revoke a key
  async revokeKey(keyId, reason = 'manual') {
    const start = Date.now();
    
    try {
      if (!this.initialized) {
        throw new Error('Key manager not initialized');
      }
      
      const keyData = this.keys.get(keyId);
      if (!keyData) {
        throw new Error(`Key not found: ${keyId}`);
      }
      
      keyData.metadata.status = 'revoked';
      keyData.metadata.rotationReason = reason;
      await this.saveKeys();
      
      // Update metrics
      keyManagementMetrics.operations.keyRevocation++;
      keyManagementMetrics.timings.keyRevocation.push(Date.now() - start);
      this.updateKeyCounts();
      
      logger.info('Key revoked successfully', {
        keyId,
        type: keyData.metadata.type,
        reason,
        duration: Date.now() - start
      });
      
      auditLogger.systemEvent('key_revoked', 'KeyManager', {
        keyId,
        type: keyData.metadata.type,
        reason
      });
      
      return keyData.metadata.toJSON();
      
    } catch (error) {
      keyManagementMetrics.errors.keyRevocation++;
      logger.error('Key revocation failed:', error);
      throw new Error(`Key revocation failed: ${error.message}`);
    }
  }
  
  // Start key rotation scheduler
  startRotationScheduler() {
    if (this.rotationScheduler) {
      clearInterval(this.rotationScheduler);
    }
    
    // Check for key rotation every hour
    this.rotationScheduler = setInterval(async () => {
      await this.checkAndRotateKeys();
    }, 60 * 60 * 1000);
    
    logger.info('Key rotation scheduler started');
  }
  
  // Check and rotate keys that need rotation
  async checkAndRotateKeys() {
    try {
      const now = new Date();
      const rotationThreshold = 7 * 24 * 60 * 60 * 1000; // 7 days before expiry
      
      for (const [keyId, keyData] of this.keys) {
        if (keyData.metadata.status !== 'active') {
          continue;
        }
        
        const expiresAt = new Date(keyData.metadata.expiresAt);
        const timeUntilExpiry = expiresAt.getTime() - now.getTime();
        
        if (timeUntilExpiry <= rotationThreshold) {
          logger.info('Key rotation required', {
            keyId,
            type: keyData.metadata.type,
            expiresAt: expiresAt.toISOString(),
            timeUntilExpiry
          });
          
          try {
            await this.rotateKey(keyId, 'automatic_rotation');
          } catch (error) {
            logger.error('Automatic key rotation failed:', error);
          }
        }
      }
    } catch (error) {
      logger.error('Key rotation check failed:', error);
    }
  }
  
  // Generate key ID
  generateKeyId(type) {
    const timestamp = Date.now();
    const random = generateSecureRandom(16);
    return `${type}_${timestamp}_${random.toString('hex').substring(0, 8)}`;
  }
  
  // Update key counts
  updateKeyCounts() {
    let total = 0;
    let active = 0;
    let expired = 0;
    let revoked = 0;
    let compromised = 0;
    
    for (const [keyId, keyData] of this.keys) {
      total++;
      switch (keyData.metadata.status) {
        case 'active':
          active++;
          break;
        case 'expired':
          expired++;
          break;
        case 'revoked':
          revoked++;
          break;
        case 'compromised':
          compromised++;
          break;
      }
    }
    
    keyManagementMetrics.keyCounts = {
      total,
      active,
      expired,
      revoked,
      compromised
    };
  }
  
  // Get key management metrics
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
      operations: keyManagementMetrics.operations,
      errors: keyManagementMetrics.errors,
      keyCounts: keyManagementMetrics.keyCounts,
      performance: {
        keyGeneration: {
          average: calculateAverage(keyManagementMetrics.timings.keyGeneration),
          p95: calculatePercentile(keyManagementMetrics.timings.keyGeneration, 95),
          p99: calculatePercentile(keyManagementMetrics.timings.keyGeneration, 99),
          max: Math.max(...keyManagementMetrics.timings.keyGeneration, 0),
          min: Math.min(...keyManagementMetrics.timings.keyGeneration, 0)
        },
        keyRotation: {
          average: calculateAverage(keyManagementMetrics.timings.keyRotation),
          p95: calculatePercentile(keyManagementMetrics.timings.keyRotation, 95),
          p99: calculatePercentile(keyManagementMetrics.timings.keyRotation, 99),
          max: Math.max(...keyManagementMetrics.timings.keyRotation, 0),
          min: Math.min(...keyManagementMetrics.timings.keyRotation, 0)
        },
        keyRetrieval: {
          average: calculateAverage(keyManagementMetrics.timings.keyRetrieval),
          p95: calculatePercentile(keyManagementMetrics.timings.keyRetrieval, 95),
          p99: calculatePercentile(keyManagementMetrics.timings.keyRetrieval, 99),
          max: Math.max(...keyManagementMetrics.timings.keyRetrieval, 0),
          min: Math.min(...keyManagementMetrics.timings.keyRetrieval, 0)
        }
      },
      errorRates: {
        keyGeneration: keyManagementMetrics.operations.keyGeneration > 0 ? 
          (keyManagementMetrics.errors.keyGeneration / keyManagementMetrics.operations.keyGeneration * 100).toFixed(2) : 0,
        keyRotation: keyManagementMetrics.operations.keyRotation > 0 ? 
          (keyManagementMetrics.errors.keyRotation / keyManagementMetrics.operations.keyRotation * 100).toFixed(2) : 0,
        keyRetrieval: keyManagementMetrics.operations.keyRetrieval > 0 ? 
          (keyManagementMetrics.errors.keyRetrieval / keyManagementMetrics.operations.keyRetrieval * 100).toFixed(2) : 0
      }
    };
  }
  
  // Get key information
  getKeyInfo(keyId) {
    const keyData = this.keys.get(keyId);
    if (!keyData) {
      return null;
    }
    
    return {
      keyId,
      metadata: keyData.metadata.toJSON()
    };
  }
  
  // List all keys
  listKeys(type = null, status = null) {
    const keys = [];
    
    for (const [keyId, keyData] of this.keys) {
      if (type && keyData.metadata.type !== type) {
        continue;
      }
      
      if (status && keyData.metadata.status !== status) {
        continue;
      }
      
      keys.push({
        keyId,
        metadata: keyData.metadata.toJSON()
      });
    }
    
    return keys.sort((a, b) => new Date(b.metadata.createdAt) - new Date(a.metadata.createdAt));
  }
  
  // Cleanup expired keys
  async cleanupExpiredKeys() {
    try {
      const now = new Date();
      const cleanupThreshold = 30 * 24 * 60 * 60 * 1000; // 30 days after expiry
      let cleanedCount = 0;
      
      for (const [keyId, keyData] of this.keys) {
        if (keyData.metadata.status === 'expired') {
          const expiresAt = new Date(keyData.metadata.expiresAt);
          const timeSinceExpiry = now.getTime() - expiresAt.getTime();
          
          if (timeSinceExpiry > cleanupThreshold) {
            this.keys.delete(keyId);
            
            // Remove from index
            const keyIds = this.keyIndex.get(keyData.metadata.type);
            if (keyIds) {
              const index = keyIds.indexOf(keyId);
              if (index > -1) {
                keyIds.splice(index, 1);
              }
            }
            
            cleanedCount++;
          }
        }
      }
      
      if (cleanedCount > 0) {
        await this.saveKeys();
        this.updateKeyCounts();
        
        logger.info('Expired keys cleaned up', {
          cleanedCount,
          remainingKeys: this.keys.size
        });
        
        auditLogger.systemEvent('keys_cleaned_up', 'KeyManager', {
          cleanedCount,
          remainingKeys: this.keys.size
        });
      }
      
      return cleanedCount;
      
    } catch (error) {
      logger.error('Key cleanup failed:', error);
      throw new Error(`Key cleanup failed: ${error.message}`);
    }
  }
  
  // Shutdown key manager
  async shutdown() {
    try {
      if (this.rotationScheduler) {
        clearInterval(this.rotationScheduler);
        this.rotationScheduler = null;
      }
      
      await this.saveKeys();
      
      this.initialized = false;
      
      logger.info('Key manager shutdown completed');
      
    } catch (error) {
      logger.error('Key manager shutdown failed:', error);
      throw new Error(`Key manager shutdown failed: ${error.message}`);
    }
  }
}

// Create global key manager instance
const keyManager = new KeyManager();

// Export key manager and utilities
module.exports = {
  keyManager,
  KeyManager,
  KeyMetadata,
  KEY_MANAGEMENT_CONFIG
};
