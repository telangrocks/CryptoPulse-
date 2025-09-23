import { logError, logWarn, logInfo, logDebug } from '../lib/logger'

/**
 * Secure encryption utilities for sensitive data
 * Uses Web Crypto API for AES-GCM encryption
 */

// Get encryption key from environment or generate a secure one
const getEncryptionKey = async (): Promise<CryptoKey> => {
  const keyString = import.meta.env.VITE_ENCRYPTION_KEY;
  
  if (!keyString || keyString.length !== 32) {
    throw new Error('VITE_ENCRYPTION_KEY must be a 32-character string. Please set it in your .env.local file.');
  }

  // Convert string to ArrayBuffer
  const keyBuffer = new TextEncoder().encode(keyString);
  
  // Import the key for AES-GCM
  return await crypto.subtle.importKey(
    'raw',
    keyBuffer,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
};

/**
 * Encrypt sensitive data using AES-GCM
 * @param data - The data to encrypt
 * @returns Encrypted data with IV prepended
 */
export const encryptData = async (data: string): Promise<string> => {
  try {
    const key = await getEncryptionKey();
    const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for GCM
    const dataBuffer = new TextEncoder().encode(data);
    
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      dataBuffer
    );
    
    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);
    
    // Convert to base64 for storage
    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    logError('Encryption failed:', error);
    throw new Error('Failed to encrypt data. Please check your encryption key.');
  }
};

/**
 * Decrypt sensitive data using AES-GCM
 * @param encryptedData - The encrypted data (base64 encoded)
 * @returns Decrypted data
 */
export const decryptData = async (encryptedData: string): Promise<string> => {
  try {
    const key = await getEncryptionKey();
    
    // Convert from base64
    const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
    
    // Extract IV and encrypted data
    const iv = combined.slice(0, 12);
    const encrypted = combined.slice(12);
    
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encrypted
    );
    
    return new TextDecoder().decode(decrypted);
  } catch (error) {
    logError('Decryption failed:', error);
    throw new Error('Failed to decrypt data. Please check your encryption key or data integrity.');
  }
};

/**
 * Generate a secure random string for keys
 * @param length - Length of the string to generate
 * @returns Secure random string
 */
export const generateSecureKey = (length: number = 32): string => {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

/**
 * Hash a password using PBKDF2
 * @param password - Password to hash
 * @param salt - Salt for the hash
 * @returns Hashed password
 */
export const hashPassword = async (password: string, salt: Uint8Array): Promise<string> => {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    256
  );
  
  return Array.from(new Uint8Array(derivedBits), byte => 
    byte.toString(16).padStart(2, '0')
  ).join('');
};

/**
 * Generate a random salt for password hashing
 * @returns Random salt
 */
export const generateSalt = (): Uint8Array => {
  return crypto.getRandomValues(new Uint8Array(16));
};

/**
 * Validate encryption key format
 * @param key - Key to validate
 * @returns True if valid
 */
export const validateEncryptionKey = (key: string): boolean => {
  return key && key.length === 32 && /^[a-zA-Z0-9]+$/.test(key);
};
