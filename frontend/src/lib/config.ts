/**
 * Configuration management for CryptoPulse
 */

export interface AppConfig {
  apiBaseUrl: string;
  wsBaseUrl: string;
  environment: 'development' | 'production' | 'test';
  features: {
    enableAdvancedCharts: boolean;
    enableAIAssistant: boolean;
    enableBacktesting: boolean;
  };
  limits: {
    maxAPIKeys: number;
    maxActiveStrategies: number;
    trialDurationDays: number;
  };
}

const defaultConfig: AppConfig = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:1337',
  wsBaseUrl: import.meta.env.VITE_WS_BASE_URL || 'ws://localhost:1337',
  environment: (import.meta.env.NODE_ENV as any) || 'development',
  features: {
    enableAdvancedCharts: true,
    enableAIAssistant: true,
    enableBacktesting: false
  },
  limits: {
    maxAPIKeys: 5,
    maxActiveStrategies: 10,
    trialDurationDays: 7
  }
};

let currentConfig: AppConfig = { ...defaultConfig };

export function getConfig(): AppConfig {
  return currentConfig;
}

export function updateConfig(updates: Partial<AppConfig>): void {
  currentConfig = { ...currentConfig, ...updates };
}

export function resetConfig(): void {
  currentConfig = { ...defaultConfig };
}

// Environment helpers
export const isDevelopment = () => getConfig().environment === 'development';
export const isProduction = () => getConfig().environment === 'production';
export const isTest = () => getConfig().environment === 'test';

export default getConfig;
