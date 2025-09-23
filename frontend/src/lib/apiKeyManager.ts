/**
 * API Key Manager
 * Handles secure API key retrieval and validation for exchange integration
 */

import { getSecureItem } from './secureStorage';
import { logError, logWarn, logInfo } from '../lib/logger';

export interface APIKeys {
  marketDataKey: string;
  marketDataSecret: string;
  tradeExecutionKey: string;
  tradeExecutionSecret: string;
  exchange: string;
}

export interface APIKeyValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

class APIKeyManager {
  private cachedKeys: APIKeys | null = null;
  private lastValidation: APIKeyValidation | null = null;

  /**
   * Get API keys from secure storage
   */
  async getAPIKeys(): Promise<APIKeys | null> {
    try {
      if (this.cachedKeys) {
        return this.cachedKeys;
      }

      const keys = await getSecureItem('cryptopulse_api_keys');
      if (keys) {
        this.cachedKeys = keys;
        logInfo('API keys retrieved from secure storage', 'APIKeyManager');
        return keys;
      }

      logWarn('No API keys found in secure storage', 'APIKeyManager');
      return null;
    } catch (error) {
      logError('Failed to retrieve API keys', 'APIKeyManager', error);
      return null;
    }
  }

  /**
   * Validate API key format and structure
   */
  validateAPIKeys(keys: APIKeys): APIKeyValidation {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if all required keys are present
    if (!keys.marketDataKey) errors.push('Market data API key is missing');
    if (!keys.marketDataSecret) errors.push('Market data API secret is missing');
    if (!keys.tradeExecutionKey) errors.push('Trade execution API key is missing');
    if (!keys.tradeExecutionSecret) errors.push('Trade execution API secret is missing');
    if (!keys.exchange) errors.push('Exchange is not specified');

    // Validate API key format (basic validation)
    if (keys.marketDataKey && keys.marketDataKey.length < 20) {
      errors.push('Market data API key appears to be invalid (too short)');
    }
    if (keys.tradeExecutionKey && keys.tradeExecutionKey.length < 20) {
      errors.push('Trade execution API key appears to be invalid (too short)');
    }

    // Check if keys are the same (potential security issue)
    if (keys.marketDataKey === keys.tradeExecutionKey) {
      warnings.push('Market data and trade execution keys are identical');
    }

    // Validate exchange
    const supportedExchanges = ['binance', 'binance_sandbox'];
    if (keys.exchange && !supportedExchanges.includes(keys.exchange.toLowerCase())) {
      warnings.push(`Exchange '${keys.exchange}' may not be supported`);
    }

    const isValid = errors.length === 0;
    
    this.lastValidation = { isValid, errors, warnings };
    
    if (isValid) {
      logInfo('API keys validation passed', 'APIKeyManager');
    } else {
      logWarn(`API keys validation failed: ${errors.join(', ')}`, 'APIKeyManager');
    }

    return this.lastValidation;
  }

  /**
   * Get validated API keys for exchange integration
   */
  async getValidatedAPIKeys(): Promise<{ keys: APIKeys; validation: APIKeyValidation } | null> {
    try {
      const keys = await this.getAPIKeys();
      if (!keys) {
        return null;
      }

      const validation = this.validateAPIKeys(keys);
      return { keys, validation };
    } catch (error) {
      logError('Failed to get validated API keys', 'APIKeyManager', error);
      return null;
    }
  }

  /**
   * Clear cached keys (call when keys are updated)
   */
  clearCache(): void {
    this.cachedKeys = null;
    this.lastValidation = null;
    logInfo('API key cache cleared', 'APIKeyManager');
  }

  /**
   * Get last validation result
   */
  getLastValidation(): APIKeyValidation | null {
    return this.lastValidation;
  }

  /**
   * Check if API keys are ready for trading
   */
  async areKeysReadyForTrading(): Promise<boolean> {
    const result = await this.getValidatedAPIKeys();
    return result ? result.validation.isValid : false;
  }
}

// Export singleton instance
export const apiKeyManager = new APIKeyManager();
export default APIKeyManager;
