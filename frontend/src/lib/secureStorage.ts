/**
 * Secure storage utilities with encryption
 * Provides encrypted localStorage for sensitive data
 */

import { encryptData, decryptData } from './encryption';


import { logError, logWarn, logInfo, logDebug } from '../lib/logger'
interface SecureStorageOptions {
  encrypt?: boolean;
  ttl?: number; // Time to live in milliseconds
}

/**
 * Store data securely with optional encryption
 * @param key - Storage key
 * @param data - Data to store
 * @param options - Storage options
 */
export const setSecureItem = async (
  key: string, 
  data: any, 
  options: SecureStorageOptions = { encrypt: true }
): Promise<void> => {
  try {
    const dataString = JSON.stringify(data);
    let storedData = dataString;
    
    // Add timestamp if TTL is specified
    if (options.ttl) {
      const itemWithTimestamp = {
        data: dataString,
        timestamp: Date.now(),
        ttl: options.ttl
      };
      storedData = JSON.stringify(itemWithTimestamp);
    }
    
    // Encrypt if requested
    if (options.encrypt) {
      storedData = await encryptData(storedData);
    }
    
    localStorage.setItem(key, storedData);
  } catch (error) {
    logError('Failed to store secure item:', error);
    throw new Error('Failed to store data securely');
  }
};

/**
 * Retrieve data securely with optional decryption
 * @param key - Storage key
 * @param options - Storage options
 * @returns Retrieved data or null if not found/expired
 */
export const getSecureItem = async (
  key: string, 
  options: SecureStorageOptions = { encrypt: true }
): Promise<any | null> => {
  try {
    const storedData = localStorage.getItem(key);
    if (!storedData) return null;
    
    let decryptedData = storedData;
    
    // Decrypt if encrypted
    if (options.encrypt) {
      decryptedData = await decryptData(storedData);
    }
    
    // Check if data has TTL
    try {
      const parsedData = JSON.parse(decryptedData);
      if (parsedData.timestamp && parsedData.ttl) {
        const now = Date.now();
        const itemAge = now - parsedData.timestamp;
        
        if (itemAge > parsedData.ttl) {
          // Data has expired
          localStorage.removeItem(key);
          return null;
        }
        
        return JSON.parse(parsedData.data);
      }
    } catch {
      // Not a TTL item, return as-is
    }
    
    return JSON.parse(decryptedData);
  } catch (error) {
    logError('Failed to retrieve secure item:', error);
    return null;
  }
};

/**
 * Remove secure item
 * @param key - Storage key
 */
export const removeSecureItem = (key: string): void => {
  localStorage.removeItem(key);
};

/**
 * Clear all secure items
 */
export const clearSecureStorage = (): void => {
  // Only clear items that start with our prefix
  const prefix = 'cryptopulse_';
  const keysToRemove: string[] = [];
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(prefix)) {
      keysToRemove.push(key);
    }
  }
  
  keysToRemove.forEach(key => localStorage.removeItem(key));
};

/**
 * Check if secure item exists and is not expired
 * @param key - Storage key
 * @returns True if item exists and is valid
 */
export const hasSecureItem = async (key: string): Promise<boolean> => {
  const item = await getSecureItem(key);
  return item !== null;
};

/**
 * Get storage usage statistics
 * @returns Storage usage info
 */
export const getStorageStats = (): { used: number; available: number; total: number } => {
  let used = 0;
  const prefix = 'cryptopulse_';
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(prefix)) {
      const value = localStorage.getItem(key);
      if (value) {
        used += key.length + value.length;
      }
    }
  }
  
  // Estimate available space (most browsers have 5-10MB limit)
  const estimatedTotal = 5 * 1024 * 1024; // 5MB
  const available = estimatedTotal - used;
  
  return {
    used,
    available: Math.max(0, available),
    total: estimatedTotal
  };
};
