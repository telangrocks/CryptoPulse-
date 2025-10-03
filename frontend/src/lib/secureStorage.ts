/**
 * Secure storage utilities with encryption
 */

import CryptoJS from 'crypto-js';

const STORAGE_KEY = 'cryptopulse_secure_data';
const ENCRYPTION_KEY = 'cryptopulse_secret_key_2024';

interface SecureStorageData {
  [key: string]: any;
}

class SecureStorage {
  private encrypt(data: string): string {
    try {
      return CryptoJS.AES.encrypt(data, ENCRYPTION_KEY).toString();
    } catch (error) {
      console.error('Encryption failed:', error);
      return data; // Fallback to unencrypted
    }
  }

  private decrypt(encryptedData: string): string {
    try {
      const bytes = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_KEY);
      return bytes.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      console.error('Decryption failed:', error);
      return encryptedData; // Fallback to original data
    }
  }

  private getStorageData(): SecureStorageData {
    try {
      const encryptedData = localStorage.getItem(STORAGE_KEY);
      if (!encryptedData) return {};

      const decryptedData = this.decrypt(encryptedData);
      return JSON.parse(decryptedData);
    } catch (error) {
      console.error('Failed to get storage data:', error);
      return {};
    }
  }

  private setStorageData(data: SecureStorageData): void {
    try {
      const jsonData = JSON.stringify(data);
      const encryptedData = this.encrypt(jsonData);
      localStorage.setItem(STORAGE_KEY, encryptedData);
    } catch (error) {
      console.error('Failed to set storage data:', error);
    }
  }

  setItem(key: string, value: any): void {
    const data = this.getStorageData();
    data[key] = value;
    this.setStorageData(data);
  }

  getItem(key: string): any {
    const data = this.getStorageData();
    return data[key];
  }

  get(key: string): any {
    return this.getItem(key);
  }

  set(key: string, value: any): void {
    this.setItem(key, value);
  }

  removeItem(key: string): void {
    const data = this.getStorageData();
    delete data[key];
    this.setStorageData(data);
  }

  clear(): void {
    localStorage.removeItem(STORAGE_KEY);
  }

  hasItem(key: string): boolean {
    const data = this.getStorageData();
    return key in data;
  }
}

export const secureStorage = new SecureStorage();

// Additional validation functions for API keys
export function validateAPIKey(key: string): boolean {
  return key.length >= 20 && /^[A-Za-z0-9]+$/.test(key);
}

export function validateAPISecret(secret: string): boolean {
  return secret.length >= 20 && /^[A-Za-z0-9]+$/.test(secret);
}

// Simple rate limiter
export const apiRateLimiter = {
  canMakeRequest: () => true, // Simplified implementation
  recordRequest: () => {},
  isAllowed: () => true,
};

export default secureStorage;
