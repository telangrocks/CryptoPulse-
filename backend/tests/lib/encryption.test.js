// =============================================================================
// Encryption System Tests - Production Ready
// =============================================================================
// Comprehensive unit tests for the encryption system

const {
  generateSecureRandom,
  generateSalt,
  deriveKey,
  generateEncryptionKey,
  encryptAES,
  decryptAES,
  encryptChaCha20,
  decryptChaCha20,
  generateRSAKeyPair,
  encryptRSA,
  decryptRSA,
  generateHMAC,
  verifyHMAC,
  hashSHA256,
  hashSHA512,
  getEncryptionMetrics,
  resetEncryptionMetrics
} = require('../../lib/encryption');

describe('Encryption System', () => {
  beforeEach(() => {
    resetEncryptionMetrics();
  });

  describe('Secure Random Generation', () => {
    test('should generate secure random bytes of specified length', () => {
      const length = 32;
      const randomBytes = generateSecureRandom(length);
      
      expect(randomBytes).toBeInstanceOf(Buffer);
      expect(randomBytes.length).toBe(length);
    });

    test('should generate different values on each call', () => {
      const random1 = generateSecureRandom(16);
      const random2 = generateSecureRandom(16);
      
      expect(random1).not.toEqual(random2);
    });

    test('should handle zero length gracefully', () => {
      const randomBytes = generateSecureRandom(0);
      expect(randomBytes).toBeInstanceOf(Buffer);
      expect(randomBytes.length).toBe(0);
    });
  });

  describe('Salt Generation', () => {
    test('should generate salt of default length', () => {
      const salt = generateSalt();
      expect(salt).toBeInstanceOf(Buffer);
      expect(salt.length).toBe(32); // Default length
    });

    test('should generate salt of specified length', () => {
      const length = 16;
      const salt = generateSalt(length);
      expect(salt).toBeInstanceOf(Buffer);
      expect(salt.length).toBe(length);
    });

    test('should generate unique salts', () => {
      const salt1 = generateSalt();
      const salt2 = generateSalt();
      expect(salt1).not.toEqual(salt2);
    });
  });

  describe('Key Derivation', () => {
    test('should derive key from password and salt', () => {
      const password = 'test-password';
      const salt = generateSalt();
      const key = deriveKey(password, salt);
      
      expect(key).toBeInstanceOf(Buffer);
      expect(key.length).toBe(32);
    });

    test('should generate same key for same password and salt', () => {
      const password = 'test-password';
      const salt = generateSalt();
      const key1 = deriveKey(password, salt);
      const key2 = deriveKey(password, salt);
      
      expect(key1).toEqual(key2);
    });

    test('should generate different keys for different passwords', () => {
      const salt = generateSalt();
      const key1 = deriveKey('password1', salt);
      const key2 = deriveKey('password2', salt);
      
      expect(key1).not.toEqual(key2);
    });

    test('should handle invalid inputs gracefully', () => {
      expect(() => deriveKey(null, generateSalt())).toThrow();
      expect(() => deriveKey('password', null)).toThrow();
    });
  });

  describe('AES Encryption/Decryption', () => {
    let key;

    beforeEach(() => {
      key = generateEncryptionKey('AES');
    });

    test('should encrypt and decrypt data correctly', () => {
      const data = 'Hello, World! This is a test message.';
      const encrypted = encryptAES(data, key);
      const decrypted = decryptAES(encrypted, key);
      
      expect(decrypted).toBe(data);
    });

    test('should handle empty data', () => {
      const data = '';
      const encrypted = encryptAES(data, key);
      const decrypted = decryptAES(encrypted, key);
      
      expect(decrypted).toBe(data);
    });

    test('should handle large data', () => {
      const data = 'A'.repeat(10000);
      const encrypted = encryptAES(data, key);
      const decrypted = decryptAES(encrypted, key);
      
      expect(decrypted).toBe(data);
    });

    test('should handle unicode characters', () => {
      const data = 'Hello 世界! 🌍 测试';
      const encrypted = encryptAES(data, key);
      const decrypted = decryptAES(encrypted, key);
      
      expect(decrypted).toBe(data);
    });

    test('should fail with wrong key', () => {
      const data = 'test message';
      const wrongKey = generateEncryptionKey('AES');
      const encrypted = encryptAES(data, key);
      
      expect(() => decryptAES(encrypted, wrongKey)).toThrow();
    });

    test('should fail with corrupted data', () => {
      const data = 'test message';
      const encrypted = encryptAES(data, key);
      const corrupted = Buffer.from(encrypted);
      corrupted[0] = 0xFF; // Corrupt first byte
      
      expect(() => decryptAES(corrupted, key)).toThrow();
    });

    test('should handle additional authenticated data', () => {
      const data = 'test message';
      const aad = 'additional data';
      const encrypted = encryptAES(data, key, aad);
      const decrypted = decryptAES(encrypted, key, aad);
      
      expect(decrypted).toBe(data);
    });

    test('should fail with wrong additional authenticated data', () => {
      const data = 'test message';
      const aad = 'additional data';
      const wrongAad = 'wrong data';
      const encrypted = encryptAES(data, key, aad);
      
      expect(() => decryptAES(encrypted, key, wrongAad)).toThrow();
    });
  });

  describe('ChaCha20 Encryption/Decryption', () => {
    let key;

    beforeEach(() => {
      key = generateEncryptionKey('CHACHA20');
    });

    test('should encrypt and decrypt data correctly', () => {
      const data = 'Hello, World! This is a test message.';
      const encrypted = encryptChaCha20(data, key);
      const decrypted = decryptChaCha20(encrypted, key);
      
      expect(decrypted).toBe(data);
    });

    test('should handle empty data', () => {
      const data = '';
      const encrypted = encryptChaCha20(data, key);
      const decrypted = decryptChaCha20(encrypted, key);
      
      expect(decrypted).toBe(data);
    });

    test('should handle large data', () => {
      const data = 'A'.repeat(10000);
      const encrypted = encryptChaCha20(data, key);
      const decrypted = decryptChaCha20(encrypted, key);
      
      expect(decrypted).toBe(data);
    });

    test('should fail with wrong key', () => {
      const data = 'test message';
      const wrongKey = generateEncryptionKey('CHACHA20');
      const encrypted = encryptChaCha20(data, key);
      
      expect(() => decryptChaCha20(encrypted, wrongKey)).toThrow();
    });
  });

  describe('RSA Encryption/Decryption', () => {
    let keyPair;

    beforeEach(() => {
      keyPair = generateRSAKeyPair();
    });

    test('should encrypt and decrypt data correctly', () => {
      const data = 'Hello, World! This is a test message.';
      const encrypted = encryptRSA(data, keyPair.publicKey);
      const decrypted = decryptRSA(encrypted, keyPair.privateKey);
      
      expect(decrypted).toBe(data);
    });

    test('should handle empty data', () => {
      const data = '';
      const encrypted = encryptRSA(data, keyPair.publicKey);
      const decrypted = decryptRSA(encrypted, keyPair.privateKey);
      
      expect(decrypted).toBe(data);
    });

    test('should fail with wrong private key', () => {
      const data = 'test message';
      const wrongKeyPair = generateRSAKeyPair();
      const encrypted = encryptRSA(data, keyPair.publicKey);
      
      expect(() => decryptRSA(encrypted, wrongKeyPair.privateKey)).toThrow();
    });

    test('should handle data larger than RSA block size', () => {
      const data = 'A'.repeat(1000);
      expect(() => encryptRSA(data, keyPair.publicKey)).toThrow();
    });
  });

  describe('HMAC Generation and Verification', () => {
    let key;

    beforeEach(() => {
      key = generateEncryptionKey('AES');
    });

    test('should generate HMAC for data', () => {
      const data = 'test message';
      const hmac = generateHMAC(data, key);
      
      expect(hmac).toBeInstanceOf(Buffer);
      expect(hmac.length).toBe(32); // SHA-256 output length
    });

    test('should verify correct HMAC', () => {
      const data = 'test message';
      const hmac = generateHMAC(data, key);
      const isValid = verifyHMAC(data, key, hmac);
      
      expect(isValid).toBe(true);
    });

    test('should reject incorrect HMAC', () => {
      const data = 'test message';
      const wrongData = 'wrong message';
      const hmac = generateHMAC(data, key);
      const isValid = verifyHMAC(wrongData, key, hmac);
      
      expect(isValid).toBe(false);
    });

    test('should reject HMAC with wrong key', () => {
      const data = 'test message';
      const wrongKey = generateEncryptionKey('AES');
      const hmac = generateHMAC(data, key);
      const isValid = verifyHMAC(data, wrongKey, hmac);
      
      expect(isValid).toBe(false);
    });

    test('should generate same HMAC for same data and key', () => {
      const data = 'test message';
      const hmac1 = generateHMAC(data, key);
      const hmac2 = generateHMAC(data, key);
      
      expect(hmac1).toEqual(hmac2);
    });

    test('should generate different HMAC for different data', () => {
      const data1 = 'message 1';
      const data2 = 'message 2';
      const hmac1 = generateHMAC(data1, key);
      const hmac2 = generateHMAC(data2, key);
      
      expect(hmac1).not.toEqual(hmac2);
    });
  });

  describe('Hash Functions', () => {
    test('should generate SHA-256 hash', () => {
      const data = 'test message';
      const hash = hashSHA256(data);
      
      expect(hash).toBeInstanceOf(Buffer);
      expect(hash.length).toBe(32); // SHA-256 output length
    });

    test('should generate SHA-512 hash', () => {
      const data = 'test message';
      const hash = hashSHA512(data);
      
      expect(hash).toBeInstanceOf(Buffer);
      expect(hash.length).toBe(64); // SHA-512 output length
    });

    test('should generate consistent hashes', () => {
      const data = 'test message';
      const hash1 = hashSHA256(data);
      const hash2 = hashSHA256(data);
      
      expect(hash1).toEqual(hash2);
    });

    test('should generate different hashes for different data', () => {
      const data1 = 'message 1';
      const data2 = 'message 2';
      const hash1 = hashSHA256(data1);
      const hash2 = hashSHA256(data2);
      
      expect(hash1).not.toEqual(hash2);
    });

    test('should handle empty data', () => {
      const data = '';
      const hash = hashSHA256(data);
      
      expect(hash).toBeInstanceOf(Buffer);
      expect(hash.length).toBe(32);
    });

    test('should handle large data', () => {
      const data = 'A'.repeat(100000);
      const hash = hashSHA256(data);
      
      expect(hash).toBeInstanceOf(Buffer);
      expect(hash.length).toBe(32);
    });
  });

  describe('Performance and Metrics', () => {
    test('should track encryption metrics', async () => {
      const key = generateEncryptionKey('AES');
      const data = 'test message';
      
      // Perform some operations
      for (let i = 0; i < 10; i++) {
        const encrypted = encryptAES(data, key);
        decryptAES(encrypted, key);
      }
      
      const metrics = getEncryptionMetrics();
      
      expect(metrics.operations.encrypt).toBeGreaterThan(0);
      expect(metrics.operations.decrypt).toBeGreaterThan(0);
      expect(metrics.operations.keyGeneration).toBeGreaterThan(0);
    });

    test('should reset metrics correctly', async () => {
      const key = generateEncryptionKey('AES');
      const data = 'test message';
      
      // Perform some operations
      encryptAES(data, key);
      
      const metricsBefore = getEncryptionMetrics();
      expect(metricsBefore.operations.encrypt).toBeGreaterThan(0);
      
      resetEncryptionMetrics();
      
      const metricsAfter = getEncryptionMetrics();
      expect(metricsAfter.operations.encrypt).toBe(0);
    });

    test('should measure performance accurately', async () => {
      const key = generateEncryptionKey('AES');
      const data = 'test message';
      
      // Perform multiple operations
      for (let i = 0; i < 100; i++) {
        const encrypted = encryptAES(data, key);
        decryptAES(encrypted, key);
      }
      
      const metrics = getEncryptionMetrics();
      
      expect(metrics.performance.encrypt.average).toBeGreaterThan(0);
      expect(metrics.performance.decrypt.average).toBeGreaterThan(0);
      expect(metrics.performance.encrypt.p95).toBeGreaterThanOrEqual(metrics.performance.encrypt.average);
      expect(metrics.performance.decrypt.p95).toBeGreaterThanOrEqual(metrics.performance.decrypt.average);
    });

    test('should track error rates', async () => {
      const key = generateEncryptionKey('AES');
      const wrongKey = generateEncryptionKey('AES');
      const data = 'test message';
      
      // Perform successful operations
      for (let i = 0; i < 10; i++) {
        const encrypted = encryptAES(data, key);
        decryptAES(encrypted, key);
      }
      
      // Perform failed operations
      for (let i = 0; i < 5; i++) {
        const encrypted = encryptAES(data, key);
        try {
          decryptAES(encrypted, wrongKey);
        } catch (error) {
          // Expected to fail
        }
      }
      
      const metrics = getEncryptionMetrics();
      
      expect(metrics.errorRates.decrypt).toBe('50.00'); // 5 failures out of 10 attempts
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle null and undefined inputs', () => {
      expect(() => encryptAES(null, generateEncryptionKey('AES'))).toThrow();
      expect(() => encryptAES(undefined, generateEncryptionKey('AES'))).toThrow();
      expect(() => encryptAES('data', null)).toThrow();
      expect(() => encryptAES('data', undefined)).toThrow();
    });

    test('should handle invalid key lengths', () => {
      const shortKey = Buffer.alloc(16); // Too short for AES-256
      expect(() => encryptAES('data', shortKey)).toThrow();
    });

    test('should handle invalid data types', () => {
      const key = generateEncryptionKey('AES');
      expect(() => encryptAES(123, key)).toThrow();
      expect(() => encryptAES({}, key)).toThrow();
      expect(() => encryptAES([], key)).toThrow();
    });

    test('should handle corrupted encrypted data', () => {
      const key = generateEncryptionKey('AES');
      const data = 'test message';
      const encrypted = encryptAES(data, key);
      
      // Test with too short data
      expect(() => decryptAES(Buffer.alloc(10), key)).toThrow();
      
      // Test with invalid format
      expect(() => decryptAES(Buffer.alloc(100), key)).toThrow();
    });

    test('should handle very long data', () => {
      const key = generateEncryptionKey('AES');
      const data = 'A'.repeat(1000000); // 1MB
      
      expect(() => {
        const encrypted = encryptAES(data, key);
        const decrypted = decryptAES(encrypted, key);
        expect(decrypted).toBe(data);
      }).not.toThrow();
    });
  });
});
