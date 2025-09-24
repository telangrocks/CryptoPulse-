/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Back4App Configuration
  readonly VITE_BACK4APP_APP_ID: string
  readonly VITE_BACK4APP_CLIENT_KEY: string
  readonly VITE_BACK4APP_SERVER_URL: string
  readonly VITE_BACK4APP_MASTER_KEY: string
  
  // Application Configuration
  readonly VITE_APP_NAME: string
  readonly VITE_APP_VERSION: string
  readonly VITE_APP_ENVIRONMENT: string
  
  // API Configuration
  readonly VITE_API_BASE_URL: string
  readonly VITE_CLOUD_FUNCTIONS_URL: string
  
  // Trading Configuration
  readonly VITE_DEFAULT_PAIRS: string
  readonly VITE_DEFAULT_STRATEGY: string
  readonly VITE_RISK_LEVEL: string
  
  // UI Configuration
  readonly VITE_THEME: string
  readonly VITE_LANGUAGE: string
  readonly VITE_CURRENCY: string
  
  // Security
  readonly VITE_ENABLE_2FA: string
  readonly VITE_SESSION_TIMEOUT: string
  
  // Encryption
  readonly VITE_ENCRYPTION_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}