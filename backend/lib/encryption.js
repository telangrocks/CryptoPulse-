// =============================================================================
// Comprehensive Encryption System - Production Ready
// =============================================================================
// Advanced encryption utilities for CryptoPulse backend with multiple algorithms
// Supports AES-256-GCM, ChaCha20-Poly1305, and RSA encryption for different use cases

const crypto = require('crypto');
const { logger } = require('./logging');
const { performanceLogger } = require('./logging');

// Encryption configuration
const ENCRYPTION_CONFIG = {
  // AES-256-GCM configuration (recommended for most use cases)
  AES: {
    algorithm: 'aes-256-gcm',
    keyLength: 32, // 256 bits
    ivLength: 16,  // 128 bits
    tagLength: 16, // 128 bits
    saltLength: 32 // 256 bits for key derivation
  },
  
  // ChaCha20-Poly1305 configuration (modern alternative to AES)
  CHACHA20: {
    algorithm: 'chacha20-poly1305',
    keyLength: 32, // 256 bits
    ivLength: 12,  // 96 bits
    tagLength: 16, // 128 bits
    saltLength: 32 // 256 bits for key derivation
  },
  
  // RSA configuration for asymmetric encryption
  RSA: {
    algorithm: 'rsa',
    keySize: 4096, // 4096-bit keys for maximum security
    padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
    hash: 'sha256'
  },
  
  // Key derivation configuration
  PBKDF2: {
    iterations: 100000, // OWASP recommended minimum
    digest: 'sha256',
    keyLength: 32
  },
  
  // HMAC configuration
  HMAC: {
    algorithm: 'sha256'
  }
};

// Performance metrics for encryption operations
const encryptionMetrics = {
  operations: {
    encrypt: 0,
    decrypt: 0,
    keyGeneration: 0,
    keyDerivation: 0
  },
  timings: {
    encrypt: [],
    decrypt: [],
    keyGeneration: [],
    keyDerivation: []
  },
  errors: {
    encrypt: 0,
    decrypt: 0,
    keyGeneration: 0,
    keyDerivation: 0
  }
};

// Generate cryptographically secure random bytes
function generateSecureRandom(length) {
  const start = Date.now();
  
  try {
    const randomBytes = crypto.randomBytes(length);
    encryptionMetrics.operations.keyGeneration++;
    encryptionMetrics.timings.keyGeneration.push(Date.now() - start);
    
    logger.debug('Generated secure random bytes', {
      length,
      duration: Date.now() - start
    });
    
    return randomBytes;
  } catch (error) {
    encryptionMetrics.errors.keyGeneration++;
    logger.error('Failed to generate secure random bytes:', error);
    throw new Error('Failed to generate secure random bytes');
  }
}

// Generate a random salt for key derivation
function generateSalt(length = ENCRYPTION_CONFIG.AES.saltLength) {
  return generateSecureRandom(length);
}

// Derive a key from a password using PBKDF2
function deriveKey(password, salt, iterations = ENCRYPTION_CONFIG.PBKDF2.iterations) {
  const start = Date.now();
  
  try {
    if (!password || typeof password !== 'string') {
      throw new Error('Password must be a non-empty string');
    }
    
    if (!salt || !Buffer.isBuffer(salt)) {
      throw new Error('Salt must be a Buffer');
    }
    
    const key = crypto.pbkdf2Sync(
      password,
      salt,
      iterations,
      ENCRYPTION_CONFIG.PBKDF2.keyLength,
      ENCRYPTION_CONFIG.PBKDF2.digest
    );
    
    encryptionMetrics.operations.keyDerivation++;
    encryptionMetrics.timings.keyDerivation.push(Date.now() - start);
    
    logger.debug('Derived key from password', {
      iterations,
      duration: Date.now() - start,
      saltLength: salt.length
    });
    
    return key;
  } catch (error) {
    encryptionMetrics.errors.keyDerivation++;
    logger.error('Failed to derive key from password:', error);
    throw new Error('Failed to derive key from password');
  }
}

// Generate a secure encryption key
function generateEncryptionKey(algorithm = 'AES') {
  const config = ENCRYPTION_CONFIG[algorithm];
  if (!config) {
    throw new Error(`Unsupported encryption algorithm: ${algorithm}`);
  }
  
  return generateSecureRandom(config.keyLength);
}

// Encrypt data using AES-256-GCM
function encryptAES(data, key, additionalData = null) {
  const start = Date.now();
  
  try {
    if (!data) {
      throw new Error('Data to encrypt cannot be empty');
    }
    
    if (!key || !Buffer.isBuffer(key) || key.length !== ENCRYPTION_CONFIG.AES.keyLength) {
      throw new Error('Invalid encryption key');
    }
    
    // Generate random IV
    const iv = generateSecureRandom(ENCRYPTION_CONFIG.AES.ivLength);
    
    // Create cipher
    const cipher = crypto.createCipher(ENCRYPTION_CONFIG.AES.algorithm, key, {
      ivLength: ENCRYPTION_CONFIG.AES.ivLength
    });
    
    // Set additional authenticated data if provided
    if (additionalData) {
      cipher.setAAD(Buffer.from(additionalData));
    }
    
    // Encrypt data
    let encrypted = cipher.update(data, 'utf8');
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    
    // Get authentication tag
    const tag = cipher.getAuthTag();
    
    // Combine IV + tag + encrypted data
    const result = Buffer.concat([iv, tag, encrypted]);
    
    encryptionMetrics.operations.encrypt++;
    encryptionMetrics.timings.encrypt.push(Date.now() - start);
    
    performanceLogger.info('Data encrypted with AES-256-GCM', {
      operation: 'encrypt',
      algorithm: ENCRYPTION_CONFIG.AES.algorithm,
      dataSize: Buffer.byteLength(data),
      resultSize: result.length,
      duration: Date.now() - start,
      hasAdditionalData: !!additionalData
    });
    
    return result;
  } catch (error) {
    encryptionMetrics.errors.encrypt++;
    logger.error('AES encryption failed:', error);
    throw new Error(`AES encryption failed: ${error.message}`);
  }
}

// Decrypt data using AES-256-GCM
function decryptAES(encryptedData, key, additionalData = null) {
  const start = Date.now();
  
  try {
    if (!encryptedData || !Buffer.isBuffer(encryptedData)) {
      throw new Error('Invalid encrypted data');
    }
    
    if (!key || !Buffer.isBuffer(key) || key.length !== ENCRYPTION_CONFIG.AES.keyLength) {
      throw new Error('Invalid decryption key');
    }
    
    // Check minimum length (IV + tag + at least 1 byte of data)
    const minLength = ENCRYPTION_CONFIG.AES.ivLength + ENCRYPTION_CONFIG.AES.tagLength + 1;
    if (encryptedData.length < minLength) {
      throw new Error('Encrypted data too short');
    }
    
    // Extract IV, tag, and encrypted data
    const iv = encryptedData.subarray(0, ENCRYPTION_CONFIG.AES.ivLength);
    const tag = encryptedData.subarray(ENCRYPTION_CONFIG.AES.ivLength, ENCRYPTION_CONFIG.AES.ivLength + ENCRYPTION_CONFIG.AES.tagLength);
    const encrypted = encryptedData.subarray(ENCRYPTION_CONFIG.AES.ivLength + ENCRYPTION_CONFIG.AES.tagLength);
    
    // Create decipher
    const decipher = crypto.createDecipher(ENCRYPTION_CONFIG.AES.algorithm, key, {
      ivLength: ENCRYPTION_CONFIG.AES.ivLength
    });
    
    // Set authentication tag
    decipher.setAuthTag(tag);
    
    // Set additional authenticated data if provided
    if (additionalData) {
      decipher.setAAD(Buffer.from(additionalData));
    }
    
    // Decrypt data
    let decrypted = decipher.update(encrypted, undefined, 'utf8');
    decrypted += decipher.final('utf8');
    
    encryptionMetrics.operations.decrypt++;
    encryptionMetrics.timings.decrypt.push(Date.now() - start);
    
    performanceLogger.info('Data decrypted with AES-256-GCM', {
      operation: 'decrypt',
      algorithm: ENCRYPTION_CONFIG.AES.algorithm,
      encryptedSize: encryptedData.length,
      decryptedSize: Buffer.byteLength(decrypted),
      duration: Date.now() - start,
      hasAdditionalData: !!additionalData
    });
    
    return decrypted;
  } catch (error) {
    encryptionMetrics.errors.decrypt++;
    logger.error('AES decryption failed:', error);
    throw new Error(`AES decryption failed: ${error.message}`);
  }
}

// Encrypt data using ChaCha20-Poly1305
function encryptChaCha20(data, key, additionalData = null) {
  const start = Date.now();
  
  try {
    if (!data) {
      throw new Error('Data to encrypt cannot be empty');
    }
    
    if (!key || !Buffer.isBuffer(key) || key.length !== ENCRYPTION_CONFIG.CHACHA20.keyLength) {
      throw new Error('Invalid encryption key');
    }
    
    // Generate random IV
    const iv = generateSecureRandom(ENCRYPTION_CONFIG.CHACHA20.ivLength);
    
    // Create cipher
    const cipher = crypto.createCipher(ENCRYPTION_CONFIG.CHACHA20.algorithm, key, {
      ivLength: ENCRYPTION_CONFIG.CHACHA20.ivLength
    });
    
    // Set additional authenticated data if provided
    if (additionalData) {
      cipher.setAAD(Buffer.from(additionalData));
    }
    
    // Encrypt data
    let encrypted = cipher.update(data, 'utf8');
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    
    // Get authentication tag
    const tag = cipher.getAuthTag();
    
    // Combine IV + tag + encrypted data
    const result = Buffer.concat([iv, tag, encrypted]);
    
    encryptionMetrics.operations.encrypt++;
    encryptionMetrics.timings.encrypt.push(Date.now() - start);
    
    performanceLogger.info('Data encrypted with ChaCha20-Poly1305', {
      operation: 'encrypt',
      algorithm: ENCRYPTION_CONFIG.CHACHA20.algorithm,
      dataSize: Buffer.byteLength(data),
      resultSize: result.length,
      duration: Date.now() - start,
      hasAdditionalData: !!additionalData
    });
    
    return result;
  } catch (error) {
    encryptionMetrics.errors.encrypt++;
    logger.error('ChaCha20 encryption failed:', error);
    throw new Error(`ChaCha20 encryption failed: ${error.message}`);
  }
}

// Decrypt data using ChaCha20-Poly1305
function decryptChaCha20(encryptedData, key, additionalData = null) {
  const start = Date.now();
  
  try {
    if (!encryptedData || !Buffer.isBuffer(encryptedData)) {
      throw new Error('Invalid encrypted data');
    }
    
    if (!key || !Buffer.isBuffer(key) || key.length !== ENCRYPTION_CONFIG.CHACHA20.keyLength) {
      throw new Error('Invalid decryption key');
    }
    
    // Check minimum length (IV + tag + at least 1 byte of data)
    const minLength = ENCRYPTION_CONFIG.CHACHA20.ivLength + ENCRYPTION_CONFIG.CHACHA20.tagLength + 1;
    if (encryptedData.length < minLength) {
      throw new Error('Encrypted data too short');
    }
    
    // Extract IV, tag, and encrypted data
    const iv = encryptedData.subarray(0, ENCRYPTION_CONFIG.CHACHA20.ivLength);
    const tag = encryptedData.subarray(ENCRYPTION_CONFIG.CHACHA20.ivLength, ENCRYPTION_CONFIG.CHACHA20.ivLength + ENCRYPTION_CONFIG.CHACHA20.tagLength);
    const encrypted = encryptedData.subarray(ENCRYPTION_CONFIG.CHACHA20.ivLength + ENCRYPTION_CONFIG.CHACHA20.tagLength);
    
    // Create decipher
    const decipher = crypto.createDecipher(ENCRYPTION_CONFIG.CHACHA20.algorithm, key, {
      ivLength: ENCRYPTION_CONFIG.CHACHA20.ivLength
    });
    
    // Set authentication tag
    decipher.setAuthTag(tag);
    
    // Set additional authenticated data if provided
    if (additionalData) {
      decipher.setAAD(Buffer.from(additionalData));
    }
    
    // Decrypt data
    let decrypted = decipher.update(encrypted, undefined, 'utf8');
    decrypted += decipher.final('utf8');
    
    encryptionMetrics.operations.decrypt++;
    encryptionMetrics.timings.decrypt.push(Date.now() - start);
    
    performanceLogger.info('Data decrypted with ChaCha20-Poly1305', {
      operation: 'decrypt',
      algorithm: ENCRYPTION_CONFIG.CHACHA20.algorithm,
      encryptedSize: encryptedData.length,
      decryptedSize: Buffer.byteLength(decrypted),
      duration: Date.now() - start,
      hasAdditionalData: !!additionalData
    });
    
    return decrypted;
  } catch (error) {
    encryptionMetrics.errors.decrypt++;
    logger.error('ChaCha20 decryption failed:', error);
    throw new Error(`ChaCha20 decryption failed: ${error.message}`);
  }
}

// Generate RSA key pair
function generateRSAKeyPair() {
  const start = Date.now();
  
  try {
    const keyPair = crypto.generateKeyPairSync('rsa', {
      modulusLength: ENCRYPTION_CONFIG.RSA.keySize,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem'
      }
    });
    
    encryptionMetrics.operations.keyGeneration++;
    encryptionMetrics.timings.keyGeneration.push(Date.now() - start);
    
    logger.info('RSA key pair generated', {
      keySize: ENCRYPTION_CONFIG.RSA.keySize,
      duration: Date.now() - start
    });
    
    return keyPair;
  } catch (error) {
    encryptionMetrics.errors.keyGeneration++;
    logger.error('Failed to generate RSA key pair:', error);
    throw new Error('Failed to generate RSA key pair');
  }
}

// Encrypt data using RSA
function encryptRSA(data, publicKey) {
  const start = Date.now();
  
  try {
    if (!data) {
      throw new Error('Data to encrypt cannot be empty');
    }
    
    if (!publicKey) {
      throw new Error('Public key is required for RSA encryption');
    }
    
    const encrypted = crypto.publicEncrypt({
      key: publicKey,
      padding: ENCRYPTION_CONFIG.RSA.padding,
      oaepHash: ENCRYPTION_CONFIG.RSA.hash
    }, Buffer.from(data));
    
    encryptionMetrics.operations.encrypt++;
    encryptionMetrics.timings.encrypt.push(Date.now() - start);
    
    performanceLogger.info('Data encrypted with RSA', {
      operation: 'encrypt',
      algorithm: 'rsa',
      dataSize: Buffer.byteLength(data),
      resultSize: encrypted.length,
      duration: Date.now() - start
    });
    
    return encrypted;
  } catch (error) {
    encryptionMetrics.errors.encrypt++;
    logger.error('RSA encryption failed:', error);
    throw new Error(`RSA encryption failed: ${error.message}`);
  }
}

// Decrypt data using RSA
function decryptRSA(encryptedData, privateKey) {
  const start = Date.now();
  
  try {
    if (!encryptedData || !Buffer.isBuffer(encryptedData)) {
      throw new Error('Invalid encrypted data');
    }
    
    if (!privateKey) {
      throw new Error('Private key is required for RSA decryption');
    }
    
    const decrypted = crypto.privateDecrypt({
      key: privateKey,
      padding: ENCRYPTION_CONFIG.RSA.padding,
      oaepHash: ENCRYPTION_CONFIG.RSA.hash
    }, encryptedData);
    
    encryptionMetrics.operations.decrypt++;
    encryptionMetrics.timings.decrypt.push(Date.now() - start);
    
    performanceLogger.info('Data decrypted with RSA', {
      operation: 'decrypt',
      algorithm: 'rsa',
      encryptedSize: encryptedData.length,
      decryptedSize: decrypted.length,
      duration: Date.now() - start
    });
    
    return decrypted.toString('utf8');
  } catch (error) {
    encryptionMetrics.errors.decrypt++;
    logger.error('RSA decryption failed:', error);
    throw new Error(`RSA decryption failed: ${error.message}`);
  }
}

// Generate HMAC for data integrity
function generateHMAC(data, key) {
  const start = Date.now();
  
  try {
    if (!data) {
      throw new Error('Data for HMAC cannot be empty');
    }
    
    if (!key || !Buffer.isBuffer(key)) {
      throw new Error('Key for HMAC must be a Buffer');
    }
    
    const hmac = crypto.createHmac(ENCRYPTION_CONFIG.HMAC.algorithm, key);
    hmac.update(data);
    const result = hmac.digest();
    
    logger.debug('HMAC generated', {
      algorithm: ENCRYPTION_CONFIG.HMAC.algorithm,
      dataSize: Buffer.byteLength(data),
      duration: Date.now() - start
    });
    
    return result;
  } catch (error) {
    logger.error('HMAC generation failed:', error);
    throw new Error(`HMAC generation failed: ${error.message}`);
  }
}

// Verify HMAC for data integrity
function verifyHMAC(data, key, expectedHMAC) {
  const start = Date.now();
  
  try {
    if (!data) {
      throw new Error('Data for HMAC verification cannot be empty');
    }
    
    if (!key || !Buffer.isBuffer(key)) {
      throw new Error('Key for HMAC verification must be a Buffer');
    }
    
    if (!expectedHMAC || !Buffer.isBuffer(expectedHMAC)) {
      throw new Error('Expected HMAC must be a Buffer');
    }
    
    const actualHMAC = generateHMAC(data, key);
    const isValid = crypto.timingSafeEqual(actualHMAC, expectedHMAC);
    
    logger.debug('HMAC verification completed', {
      algorithm: ENCRYPTION_CONFIG.HMAC.algorithm,
      dataSize: Buffer.byteLength(data),
      isValid,
      duration: Date.now() - start
    });
    
    return isValid;
  } catch (error) {
    logger.error('HMAC verification failed:', error);
    throw new Error(`HMAC verification failed: ${error.message}`);
  }
}

// Hash data using SHA-256
function hashSHA256(data) {
  const start = Date.now();
  
  try {
    if (!data) {
      throw new Error('Data to hash cannot be empty');
    }
    
    const hash = crypto.createHash('sha256');
    hash.update(data);
    const result = hash.digest();
    
    logger.debug('SHA-256 hash generated', {
      dataSize: Buffer.byteLength(data),
      duration: Date.now() - start
    });
    
    return result;
  } catch (error) {
    logger.error('SHA-256 hashing failed:', error);
    throw new Error(`SHA-256 hashing failed: ${error.message}`);
  }
}

// Hash data using SHA-512
function hashSHA512(data) {
  const start = Date.now();
  
  try {
    if (!data) {
      throw new Error('Data to hash cannot be empty');
    }
    
    const hash = crypto.createHash('sha512');
    hash.update(data);
    const result = hash.digest();
    
    logger.debug('SHA-512 hash generated', {
      dataSize: Buffer.byteLength(data),
      duration: Date.now() - start
    });
    
    return result;
  } catch (error) {
    logger.error('SHA-512 hashing failed:', error);
    throw new Error(`SHA-512 hashing failed: ${error.message}`);
  }
}

// Get encryption metrics
function getEncryptionMetrics() {
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
    operations: encryptionMetrics.operations,
    errors: encryptionMetrics.errors,
    performance: {
      encrypt: {
        average: calculateAverage(encryptionMetrics.timings.encrypt),
        p95: calculatePercentile(encryptionMetrics.timings.encrypt, 95),
        p99: calculatePercentile(encryptionMetrics.timings.encrypt, 99),
        max: Math.max(...encryptionMetrics.timings.encrypt, 0),
        min: Math.min(...encryptionMetrics.timings.encrypt, 0)
      },
      decrypt: {
        average: calculateAverage(encryptionMetrics.timings.decrypt),
        p95: calculatePercentile(encryptionMetrics.timings.decrypt, 95),
        p99: calculatePercentile(encryptionMetrics.timings.decrypt, 99),
        max: Math.max(...encryptionMetrics.timings.decrypt, 0),
        min: Math.min(...encryptionMetrics.timings.decrypt, 0)
      },
      keyGeneration: {
        average: calculateAverage(encryptionMetrics.timings.keyGeneration),
        p95: calculatePercentile(encryptionMetrics.timings.keyGeneration, 95),
        p99: calculatePercentile(encryptionMetrics.timings.keyGeneration, 99),
        max: Math.max(...encryptionMetrics.timings.keyGeneration, 0),
        min: Math.min(...encryptionMetrics.timings.keyGeneration, 0)
      },
      keyDerivation: {
        average: calculateAverage(encryptionMetrics.timings.keyDerivation),
        p95: calculatePercentile(encryptionMetrics.timings.keyDerivation, 95),
        p99: calculatePercentile(encryptionMetrics.timings.keyDerivation, 99),
        max: Math.max(...encryptionMetrics.timings.keyDerivation, 0),
        min: Math.min(...encryptionMetrics.timings.keyDerivation, 0)
      }
    },
    errorRates: {
      encrypt: encryptionMetrics.operations.encrypt > 0 ? 
        (encryptionMetrics.errors.encrypt / encryptionMetrics.operations.encrypt * 100).toFixed(2) : 0,
      decrypt: encryptionMetrics.operations.decrypt > 0 ? 
        (encryptionMetrics.errors.decrypt / encryptionMetrics.operations.decrypt * 100).toFixed(2) : 0,
      keyGeneration: encryptionMetrics.operations.keyGeneration > 0 ? 
        (encryptionMetrics.errors.keyGeneration / encryptionMetrics.operations.keyGeneration * 100).toFixed(2) : 0,
      keyDerivation: encryptionMetrics.operations.keyDerivation > 0 ? 
        (encryptionMetrics.errors.keyDerivation / encryptionMetrics.operations.keyDerivation * 100).toFixed(2) : 0
    }
  };
}

// Reset encryption metrics
function resetEncryptionMetrics() {
  encryptionMetrics.operations = {
    encrypt: 0,
    decrypt: 0,
    keyGeneration: 0,
    keyDerivation: 0
  };
  encryptionMetrics.timings = {
    encrypt: [],
    decrypt: [],
    keyGeneration: [],
    keyDerivation: []
  };
  encryptionMetrics.errors = {
    encrypt: 0,
    decrypt: 0,
    keyGeneration: 0,
    keyDerivation: 0
  };
  
  logger.info('Encryption metrics reset');
}

// Export encryption utilities
module.exports = {
  // Configuration
  ENCRYPTION_CONFIG,
  
  // Key generation and derivation
  generateSecureRandom,
  generateSalt,
  deriveKey,
  generateEncryptionKey,
  generateRSAKeyPair,
  
  // Symmetric encryption (AES-256-GCM)
  encryptAES,
  decryptAES,
  
  // Symmetric encryption (ChaCha20-Poly1305)
  encryptChaCha20,
  decryptChaCha20,
  
  // Asymmetric encryption (RSA)
  encryptRSA,
  decryptRSA,
  
  // Integrity verification
  generateHMAC,
  verifyHMAC,
  
  // Hashing
  hashSHA256,
  hashSHA512,
  
  // Metrics and monitoring
  getEncryptionMetrics,
  resetEncryptionMetrics,
  
  // Utility functions
  encrypt: encryptAES, // Default to AES-256-GCM
  decrypt: decryptAES  // Default to AES-256-GCM
};
