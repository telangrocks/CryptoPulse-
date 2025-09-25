/**
 * Secret Management Service
 * Handles secrets, credentials management
 */

class SecretManagementService {
  constructor() {
    this.secrets = new Map();
    this.encryptionKey = process.env.ENCRYPTION_KEY;
  }

  async encryptSecret(secret) {
    const crypto = require('crypto');
    const cipher = crypto.createCipher('aes-256-gcm', this.encryptionKey);
    let encrypted = cipher.update(secret, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }

  async decryptSecret(encryptedSecret) {
    const crypto = require('crypto');
    const decipher = crypto.createDecipher('aes-256-gcm', this.encryptionKey);
    let decrypted = decipher.update(encryptedSecret, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  async storeSecret(key, secret) {
    const encrypted = await this.encryptSecret(secret);
    this.secrets.set(key, encrypted);
  }

  async getSecret(key) {
    const encrypted = this.secrets.get(key);
    if (!encrypted) return null;
    return await this.decryptSecret(encrypted);
  }

  async rotateSecret(key) {
    const currentSecret = await this.getSecret(key);
    if (currentSecret) {
      const newSecret = require('crypto').randomBytes(32).toString('hex');
      await this.storeSecret(key, newSecret);
      return newSecret;
    }
  }
}

module.exports = new SecretManagementService();
