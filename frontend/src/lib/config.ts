/**
 * Application Configuration - Production Ready
 * Centralized configuration management with validation
 */

// Security patterns to detect weak or placeholder values
const WEAK_PATTERNS = [
  'your_', 'YOUR_', 'here', 'HERE', 'placeholder', 'PLACEHOLDER',
  'test_', 'TEST_', 'demo_', 'DEMO_', 'example_', 'EXAMPLE_',
  'localhost', '127.0.0.1', 'example.com', 'your-domain.com',
  'change_me', 'CHANGE_ME', 'replace_me', 'REPLACE_ME',
  'default_', 'DEFAULT_', 'admin_', 'ADMIN_'
];

// Configuration validation utilities
function validateUrl(url: string, name: string): string {
  if (!url || typeof url !== 'string') {
    throw new Error(`${name} URL is required`);
  }

  // Check for weak patterns
  const hasWeakPattern = WEAK_PATTERNS.some(pattern => 
    url.toLowerCase().includes(pattern.toLowerCase())
  );
  
  if (hasWeakPattern) {
    throw new Error(`${name} URL appears to contain placeholder values. Please set a real URL.`);
  }

  // Validate URL format
  try {
    new URL(url);
  } catch (error) {
    throw new Error(`Invalid ${name} URL format: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return url;
}

function validateApiKey(apiKey: string | undefined, name: string): string {
  if (!apiKey || apiKey === '') {
    return ''; // Allow empty for optional APIs
  }

  // Check for weak patterns
  const hasWeakPattern = WEAK_PATTERNS.some(pattern => 
    apiKey.toLowerCase().includes(pattern.toLowerCase())
  );
  
  if (hasWeakPattern) {
    throw new Error(`${name} API key appears to be a placeholder. Please set a real API key.`);
  }

  // Basic format validation
  if (!/^[a-zA-Z0-9_-]+$/.test(apiKey)) {
    throw new Error(`${name} API key contains invalid characters. Only alphanumeric characters, hyphens, and underscores are allowed.`);
  }

  return apiKey;
}

function validateSecret(secret: string | undefined, name: string): string {
  if (!secret || secret.length < 32) {
    throw new Error(`${name} must be at least 32 characters long`);
  }

  // Check for weak patterns
  const hasWeakPattern = WEAK_PATTERNS.some(pattern => 
    secret.toLowerCase().includes(pattern.toLowerCase())
  );
  
  if (hasWeakPattern) {
    throw new Error(`${name} appears to be a placeholder or weak pattern. Please set a cryptographically secure value.`);
  }

  return secret;
}

interface AppConfig {
  api: {
    baseUrl: string;
    timeout: number;
    retryAttempts: number;
    version: string;
  };
  app: {
    name: string;
    version: string;
    environment: string;
    description: string;
  };
  security: {
    encryptionKey: string;
    sessionTimeout: number;
    csrfTokenHeader: string;
  };
  features: {
    enableAnalytics: boolean;
    enableErrorReporting: boolean;
    enablePerformanceMonitoring: boolean;
    enableTrading: boolean;
    enableAiAssistant: boolean;
    enablePayments: boolean;
    enableNotifications: boolean;
  };
  external: {
    coingeckoApiUrl: string;
    coingeckoApiKey: string;
    newsApiUrl: string;
    newsApiKey: string;
  };
  ui: {
    defaultTheme: string;
    enableAnimations: boolean;
    enableSounds: boolean;
  };
  performance: {
    enableLazyLoading: boolean;
    enableVirtualScrolling: boolean;
    cacheStrategy: string;
    cacheTtl: number;
  };
}

// Validate and create configuration
let config: AppConfig;

try {
  config = {
    api: {
      baseUrl: validateUrl(
        import.meta.env.VITE_API_BASE_URL || 
        (import.meta.env.MODE === 'production' ? '' : 'http://localhost:1337'),
        'API Base'
      ),
      timeout: parseInt(import.meta.env.VITE_API_TIMEOUT || '30000'),
      retryAttempts: parseInt(import.meta.env.VITE_API_RETRY_ATTEMPTS || '3'),
      version: import.meta.env.VITE_API_VERSION || 'v1',
    },
    app: {
      name: import.meta.env.VITE_APP_NAME || 'CryptoPulse',
      version: import.meta.env.VITE_APP_VERSION || '2.0.0',
      environment: import.meta.env.MODE || 'development',
      description: import.meta.env.VITE_APP_DESCRIPTION || 'AI-Powered Cryptocurrency Trading Bot',
    },
    security: {
      encryptionKey: validateSecret(
        import.meta.env.VITE_ENCRYPTION_KEY,
        'Encryption Key'
      ),
      sessionTimeout: parseInt(import.meta.env.VITE_SESSION_TIMEOUT || '3600000'), // 1 hour
      csrfTokenHeader: import.meta.env.VITE_CSRF_TOKEN_HEADER || 'X-CSRF-Token',
    },
    features: {
      enableAnalytics: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
      enableErrorReporting: import.meta.env.VITE_ENABLE_ERROR_REPORTING === 'true',
      enablePerformanceMonitoring: import.meta.env.VITE_ENABLE_PERFORMANCE_MONITORING === 'true',
      enableTrading: import.meta.env.VITE_ENABLE_TRADING === 'true',
      enableAiAssistant: import.meta.env.VITE_ENABLE_AI_ASSISTANT === 'true',
      enablePayments: import.meta.env.VITE_ENABLE_PAYMENTS === 'true',
      enableNotifications: import.meta.env.VITE_ENABLE_NOTIFICATIONS === 'true',
    },
    external: {
      coingeckoApiUrl: validateUrl(
        import.meta.env.VITE_COINGECKO_API_URL || 'https://api.coingecko.com/api/v3',
        'CoinGecko API'
      ),
      coingeckoApiKey: validateApiKey(import.meta.env.VITE_COINGECKO_API_KEY, 'CoinGecko'),
      newsApiUrl: validateUrl(
        import.meta.env.VITE_NEWS_API_URL || 'https://newsapi.org/v2',
        'News API'
      ),
      newsApiKey: validateApiKey(import.meta.env.VITE_NEWS_API_KEY, 'News'),
    },
    ui: {
      defaultTheme: import.meta.env.VITE_DEFAULT_THEME || 'dark',
      enableAnimations: import.meta.env.VITE_ENABLE_ANIMATIONS === 'true',
      enableSounds: import.meta.env.VITE_ENABLE_SOUNDS === 'true',
    },
    performance: {
      enableLazyLoading: import.meta.env.VITE_ENABLE_LAZY_LOADING === 'true',
      enableVirtualScrolling: import.meta.env.VITE_ENABLE_VIRTUAL_SCROLLING === 'true',
      cacheStrategy: import.meta.env.VITE_CACHE_STRATEGY || 'stale-while-revalidate',
      cacheTtl: parseInt(import.meta.env.VITE_CACHE_TTL || '300000'), // 5 minutes
    },
  };

  // Production-specific validations
  if (config.app.environment === 'production') {
    const warnings: string[] = [];

    if (config.api.baseUrl.includes('localhost')) {
      warnings.push('API base URL should not use localhost in production');
    }

    if (config.security.encryptionKey === 'default-key-change-in-production') {
      warnings.push('Default encryption key detected - change for production');
    }

    if (config.features.enableAnalytics === false) {
      warnings.push('Analytics should be enabled in production for monitoring');
    }

    if (warnings.length > 0) {
      console.warn('⚠️ Production configuration warnings:');
      warnings.forEach(warning => console.warn(`  - ${warning}`));
    }
  }

} catch (error) {
  console.error('❌ Configuration validation failed:', error instanceof Error ? error.message : 'Unknown error');
  console.error('Please check your environment variables and configuration.');
  
  // In production, throw error to prevent app from starting with invalid config
  if (import.meta.env.MODE === 'production') {
    throw error;
  }
  
  // In development, use fallback values
  config = {
    api: {
      baseUrl: 'http://localhost:1337',
      timeout: 30000,
      retryAttempts: 3,
      version: 'v1',
    },
    app: {
      name: 'CryptoPulse',
      version: '2.0.0',
      environment: 'development',
      description: 'AI-Powered Cryptocurrency Trading Bot',
    },
    security: {
      encryptionKey: 'development-key-32-characters-long-for-dev-only',
      sessionTimeout: 3600000,
      csrfTokenHeader: 'X-CSRF-Token',
    },
    features: {
      enableAnalytics: false,
      enableErrorReporting: false,
      enablePerformanceMonitoring: false,
      enableTrading: true,
      enableAiAssistant: true,
      enablePayments: true,
      enableNotifications: true,
    },
    external: {
      coingeckoApiUrl: 'https://api.coingecko.com/api/v3',
      coingeckoApiKey: '',
      newsApiUrl: 'https://newsapi.org/v2',
      newsApiKey: '',
    },
    ui: {
      defaultTheme: 'dark',
      enableAnimations: true,
      enableSounds: true,
    },
    performance: {
      enableLazyLoading: true,
      enableVirtualScrolling: true,
      cacheStrategy: 'stale-while-revalidate',
      cacheTtl: 300000,
    },
  };
}

export default config;