/**
 * Application Configuration
 * Centralized configuration management
 */

interface AppConfig {
  api: {
    baseUrl: string;
    timeout: number;
    retryAttempts: number;
  };
  app: {
    name: string;
    version: string;
    environment: string;
  };
  security: {
    encryptionKey: string;
    sessionTimeout: number;
  };
  features: {
    enableAnalytics: boolean;
    enableErrorReporting: boolean;
    enablePerformanceMonitoring: boolean;
  };
}

const config: AppConfig = {
  api: {
    baseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001',
    timeout: 10000,
    retryAttempts: 3,
  },
  app: {
    name: 'CryptoPulse',
    version: '2.0.0',
    environment: import.meta.env.MODE || 'development',
  },
  security: {
    encryptionKey: import.meta.env.VITE_ENCRYPTION_KEY || 'default-key-change-in-production',
    sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours
  },
  features: {
    enableAnalytics: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
    enableErrorReporting: import.meta.env.VITE_ENABLE_ERROR_REPORTING === 'true',
    enablePerformanceMonitoring: import.meta.env.VITE_ENABLE_PERFORMANCE_MONITORING === 'true',
  },
};

export default config;