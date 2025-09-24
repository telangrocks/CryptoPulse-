/**
 * Environment Configuration Utility
 * Centralized configuration management for the application
 */

import { logError, logWarn, logInfo } from './logger'

// Environment configuration interface
interface AppConfig {
  // Back4App Configuration
  back4app: {
    appId: string
    clientKey: string
    serverURL: string
    masterKey: string
  }
  
  // Application Configuration
  app: {
    name: string
    version: string
    environment: string
  }
  
  // API Configuration
  api: {
    baseURL: string
    cloudFunctionsURL: string
  }
  
  // Trading Configuration
  trading: {
    defaultPairs: string[]
    defaultStrategy: string
    riskLevel: string
  }
  
  // UI Configuration
  ui: {
    theme: string
    language: string
    currency: string
  }
  
  // Security Configuration
  security: {
    enable2FA: boolean
    sessionTimeout: number
    encryptionKey: string
  }
}

// Validate environment variables
function validateEnvironmentVariables(): void {
  const requiredVars = [
    'VITE_BACK4APP_APP_ID',
    'VITE_BACK4APP_CLIENT_KEY',
    'VITE_BACK4APP_SERVER_URL'
  ]
  
  const missingVars = requiredVars.filter(varName => !import.meta.env[varName])
  
  if (missingVars.length > 0) {
    const errorMessage = `Missing required environment variables: ${missingVars.join(', ')}`
    logError(errorMessage, 'Config')
    throw new Error(errorMessage)
  }
  
  // Validate encryption key if provided
  const encryptionKey = import.meta.env.VITE_ENCRYPTION_KEY
  if (encryptionKey && encryptionKey.length !== 32) {
    logWarn('Encryption key should be 32 characters long for optimal security', 'Config')
  }
}

// Get configuration from environment variables
function getConfig(): AppConfig {
  try {
    validateEnvironmentVariables()
    
    return {
      back4app: {
        appId: import.meta.env.VITE_BACK4APP_APP_ID || '',
        clientKey: import.meta.env.VITE_BACK4APP_CLIENT_KEY || '',
        serverURL: import.meta.env.VITE_BACK4APP_SERVER_URL || 'https://parseapi.back4app.com/parse',
        masterKey: import.meta.env.VITE_BACK4APP_MASTER_KEY || ''
      },
      
      app: {
        name: import.meta.env.VITE_APP_NAME || 'CryptoPulse Trading Bot',
        version: import.meta.env.VITE_APP_VERSION || '1.0.0',
        environment: import.meta.env.VITE_APP_ENVIRONMENT || 'development'
      },
      
      api: {
        baseURL: import.meta.env.VITE_API_BASE_URL || 'https://parseapi.back4app.com/parse',
        cloudFunctionsURL: import.meta.env.VITE_CLOUD_FUNCTIONS_URL || 'https://parseapi.back4app.com/parse/functions'
      },
      
      trading: {
        defaultPairs: (import.meta.env.VITE_DEFAULT_PAIRS || 'BTC/USDT,ETH/USDT,ADA/USDT').split(','),
        defaultStrategy: import.meta.env.VITE_DEFAULT_STRATEGY || 'AI_POWERED',
        riskLevel: import.meta.env.VITE_RISK_LEVEL || 'MEDIUM'
      },
      
      ui: {
        theme: import.meta.env.VITE_THEME || 'dark',
        language: import.meta.env.VITE_LANGUAGE || 'en',
        currency: import.meta.env.VITE_CURRENCY || 'USD'
      },
      
      security: {
        enable2FA: import.meta.env.VITE_ENABLE_2FA === 'true',
        sessionTimeout: parseInt(import.meta.env.VITE_SESSION_TIMEOUT || '3600', 10),
        encryptionKey: import.meta.env.VITE_ENCRYPTION_KEY || ''
      }
    }
  } catch (error) {
    logError('Failed to load configuration', 'Config', error)
    throw error
  }
}

// Export configuration
export const config = getConfig()

// Export individual configuration sections for convenience
export const { back4app, app, api, trading, ui, security } = config

// Log configuration status
logInfo('Configuration loaded successfully', 'Config', {
  environment: config.app.environment,
  version: config.app.version,
  back4appConfigured: !!config.back4app.appId && !!config.back4app.clientKey,
  encryptionConfigured: !!config.security.encryptionKey
})

export default config
