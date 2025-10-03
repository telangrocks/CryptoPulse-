// =============================================================================
// Frontend Encryption Utilities
// =============================================================================
// Secure encryption utilities for sensitive data in frontend storage

import CryptoJS from 'crypto-js';

// Configuration
const ENCRYPTION_CONFIG = {
  algorithm: 'AES',
  keySize: 256 / 32,
  ivSize: 128 / 32,
  iterations: 1000,
};

// Generate a secure key from password
export function generateKey(password: string, salt: string): string {
  return CryptoJS.PBKDF2(password, salt, {
    keySize: ENCRYPTION_CONFIG.keySize,
    iterations: ENCRYPTION_CONFIG.iterations,
  }).toString();
}

// Generate a random salt
export function generateSalt(): string {
  return CryptoJS.lib.WordArray.random(128 / 8).toString();
}

// Encrypt data
export function encryptData(data: string, password: string): string {
  try {
    const salt = generateSalt();
    const key = generateKey(password, salt);
    const iv = CryptoJS.lib.WordArray.random(ENCRYPTION_CONFIG.ivSize);

    const encrypted = CryptoJS.AES.encrypt(data, key, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });

    // Combine salt, iv, and encrypted data
    const result = `${salt  }:${  iv.toString()  }:${  encrypted.toString()}`;
    return result;
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Failed to encrypt data');
  }
}

// Decrypt data
export function decryptData(encryptedData: string, password: string): string {
  try {
    const parts = encryptedData.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }

    const [salt, ivStr, encrypted] = parts;
    const key = generateKey(password, salt);
    const iv = CryptoJS.enc.Hex.parse(ivStr);

    const decrypted = CryptoJS.AES.decrypt(encrypted, key, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });

    const result = decrypted.toString(CryptoJS.enc.Utf8);
    if (!result) {
      throw new Error('Decryption failed - invalid password or corrupted data');
    }

    return result;
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Failed to decrypt data');
  }
}

// Secure storage helpers
export const secureStorage = {
  // Store encrypted data in localStorage
  setItem(key: string, value: string, password: string): void {
    try {
      const encrypted = encryptData(value, password);
      localStorage.setItem(key, encrypted);
    } catch (error) {
      console.error('Failed to store encrypted data:', error);
      throw error;
    }
  },

  // Retrieve and decrypt data from localStorage
  getItem(key: string, password: string): string | null {
    try {
      const encrypted = localStorage.getItem(key);
      if (!encrypted) {
        return null;
      }
      return decryptData(encrypted, password);
    } catch (error) {
      console.error('Failed to retrieve encrypted data:', error);
      return null;
    }
  },

  // Remove item from localStorage
  removeItem(key: string): void {
    localStorage.removeItem(key);
  },

  // Check if encrypted item exists
  hasItem(key: string): boolean {
    return localStorage.getItem(key) !== null;
  },
};

// Hash utilities
export function hashData(data: string): string {
  return CryptoJS.SHA256(data).toString();
}

// Generate secure random string
export function generateSecureRandom(length: number = 32): string {
  return CryptoJS.lib.WordArray.random(length).toString();
}

// Validate encryption password strength
export function validatePasswordStrength(password: string): {
  isValid: boolean;
  score: number;
  feedback: string[];
} {
  const feedback: string[] = [];
  let score = 0;

  // Length check
  if (password.length >= 8) {
    score += 1;
  } else {
    feedback.push('Password should be at least 8 characters long');
  }

  // Character variety checks
  if (/[a-z]/.test(password)) score += 1;
  else feedback.push('Include lowercase letters');

  if (/[A-Z]/.test(password)) score += 1;
  else feedback.push('Include uppercase letters');

  if (/[0-9]/.test(password)) score += 1;
  else feedback.push('Include numbers');

  if (/[^a-zA-Z0-9]/.test(password)) score += 1;
  else feedback.push('Include special characters');

  // Common password check
  const commonPasswords = ['password', '123456', 'qwerty', 'admin'];
  if (commonPasswords.includes(password.toLowerCase())) {
    score = 0;
    feedback.push('Avoid common passwords');
  }

  return {
    isValid: score >= 4,
    score,
    feedback,
  };
}

// Export default object for convenience
export default {
  encryptData,
  decryptData,
  generateKey,
  generateSalt,
  secureStorage,
  hashData,
  generateSecureRandom,
  validatePasswordStrength,
};
