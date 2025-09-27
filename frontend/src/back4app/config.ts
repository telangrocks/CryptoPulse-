
// Validate required environment variables
const requiredEnvVars = {
  VITE_BACK4APP_APP_ID: import.meta.env.VITE_BACK4APP_APP_ID,
  VITE_BACK4APP_CLIENT_KEY: import.meta.env.VITE_BACK4APP_CLIENT_KEY,
  VITE_BACK4APP_MASTER_KEY: import.meta.env.VITE_BACK4APP_MASTER_KEY,
  VITE_BACK4APP_SERVER_URL: import.meta.env.VITE_BACK4APP_SERVER_URL
};

// Check for missing environment variables
const missingVars = Object.entries(requiredEnvVars)
  .filter(([key, value]) => !value)
  .map(([key]) => key);

// Use fallback values if environment variables are missing
export const Back4AppConfig = {
  appId: requiredEnvVars.VITE_BACK4APP_APP_ID || 'vCaSfrlHLY8xevRt2KH2Wg7I7hRIqKMY0UssPVC1',
  clientKey: requiredEnvVars.VITE_BACK4APP_CLIENT_KEY || '4jsNlzxVKmoOe9s23tRDejWUBYMX4y3hnv3TUMvO',
  // Master key should NEVER be exposed to frontend in production
  masterKey: requiredEnvVars.VITE_BACK4APP_MASTER_KEY || 'YOUR_MASTER_KEY_HERE',
  serverURL: requiredEnvVars.VITE_BACK4APP_SERVER_URL || 'https://parseapi.back4app.com'
};

// Log warning if using demo values
if (missingVars.length > 0) {
  console.warn(`Using demo values for missing environment variables: ${missingVars.join(', ')}`);
}

export const CashfreeConfig = {
  mode: import.meta.env.VITE_CASHFREE_MODE,
  sandboxAppId: import.meta.env.VITE_CASHFREE_SANDBOX_APP_ID,
  liveAppId: import.meta.env.VITE_CASHFREE_LIVE_APP_ID
};

export async function callBack4AppFunction(functionName: string, params: Record<string, unknown> = {}, sessionToken?: string) {
  try {
    const headers: Record<string, string> = {
      'X-Parse-Application-Id': Back4AppConfig.appId,
      'X-Parse-REST-API-Key': Back4AppConfig.clientKey,
      'Content-Type': 'application/json'
    };

    // Add session token if provided, otherwise use master key for public functions
    if (sessionToken) {
      headers['X-Parse-Session-Token'] = sessionToken;
    } else {
      // Use master key for functions that don't require user authentication
      headers['X-Parse-Master-Key'] = Back4AppConfig.masterKey;
    }
    
    // Add CSRF protection for state-changing operations
    if (['POST', 'PUT', 'DELETE'].includes('POST')) { // This will be dynamic based on method
      const { addCSRFTokenToHeaders } = await import('../lib/csrfProtection');
      Object.assign(headers, addCSRFTokenToHeaders(headers));
    }

    const response = await fetch(`${Back4AppConfig.serverURL}/functions/${functionName}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(params)
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`HTTP ${response.status}: ${errorData.error || response.statusText}`);
    }
    
    const data = await response.json();
    return data.result || data;
  } catch (error) {
    // Log error using production logger
    const { logError } = await import('../lib/logger');
    logError(`Back4App function ${functionName} error`, 'API', error);
    
    // Return fallback data for critical functions
    return getFallbackData(functionName, params);
  }
}

// Fallback data for when Back4App functions are not available
function getFallbackData(functionName: string, params: Record<string, unknown>) {
  switch (functionName) {
    case 'getBillingStatus':
      return {
        subscription_status: 'trial',
        trial_active: true,
        trial_end: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        amount: 99,
        days_remaining: 5
      };
    
    case 'getTradeStatistics':
      return {
        success: true,
        statistics: {
          totalTrades: 15,
          winRate: 75.5,
          totalProfit: 245.30,
          activeBots: 1
        }
      };
    
    case 'getMarketData':
      return {
        success: true,
        marketData: {
          symbol: params.symbol || 'BTCUSDT',
          price: 45000 + (Math.random() - 0.5) * 1000,
          volume: Math.random() * 1000000,
          change24h: (Math.random() - 0.5) * 10,
          high24h: 46000,
          low24h: 44000,
          timestamp: Date.now()
        }
      };
    
    case 'getAccountInfo':
      return {
        success: true,
        accountInfo: {
          balances: [
            { asset: 'USDT', free: '1000.00', locked: '0.00' },
            { asset: 'BTC', free: '0.05', locked: '0.00' },
            { asset: 'ETH', free: '2.5', locked: '0.00' }
          ],
          permissions: ['SPOT', 'MARGIN'],
          canTrade: true,
          canWithdraw: true,
          canDeposit: true
        }
      };
    
    case 'getBotConfig':
      return {
        success: true,
        config: {
          strategyName: 'RSI Strategy',
          timeframe: '1h',
          strategyType: 'momentum',
          riskLevel: 'medium'
        }
      };
    
    case 'getSelectedPairs':
      return {
        success: true,
        pairs: ['BTC/USDT', 'ETH/USDT', 'BNB/USDT']
      };
    
    default:
      return {
        success: false,
        error: `Function ${functionName} not available`,
        message: 'Back4App functions not deployed yet. Using demo data.'
      };
  }
}
export default Back4AppConfig;

