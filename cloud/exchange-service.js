/**
 * Unified Exchange Service for CryptoPulse
 * Eliminates code duplication across exchange integrations
 */

const https = require('https');
const crypto = require('crypto');
const winston = require('winston');

// Configure logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console()
  ]
});

// Exchange configurations
const EXCHANGE_CONFIGS = {
  binance: {
    name: 'Binance',
    baseUrl: 'https://api.binance.com',
    sandboxUrl: 'https://testnet.binance.vision',
    endpoints: {
      account: '/api/v3/account',
      order: '/api/v3/order',
      ticker: '/api/v3/ticker/price',
      exchangeInfo: '/api/v3/exchangeInfo'
    },
    authType: 'HMAC_SHA256',
    rateLimit: {
      requests: 1200,
      window: 60000 // 1 minute
    }
  },
  wazirx: {
    name: 'WazirX',
    baseUrl: 'https://api.wazirx.com',
    endpoints: {
      account: '/api/v2/account',
      order: '/api/v2/orders',
      ticker: '/api/v2/ticker/24hr',
      exchangeInfo: '/api/v2/exchangeInfo'
    },
    authType: 'API_KEY',
    rateLimit: {
      requests: 100,
      window: 60000 // 1 minute
    }
  },
  coindcx: {
    name: 'CoinDCX',
    baseUrl: 'https://api.coindcx.com',
    endpoints: {
      account: '/exchange/v1/users/balances',
      order: '/exchange/v1/orders/create',
      ticker: '/exchange/ticker',
      exchangeInfo: '/exchange/v1/markets'
    },
    authType: 'API_KEY',
    rateLimit: {
      requests: 100,
      window: 60000 // 1 minute
    }
  }
};

// Rate limiting storage
const rateLimits = new Map();

/**
 * Check if request is within rate limits
 * @param {string} exchange - Exchange name
 * @param {string} endpoint - API endpoint
 * @returns {boolean} - Whether request is allowed
 */
function checkRateLimit(exchange, endpoint) {
  const config = EXCHANGE_CONFIGS[exchange];
  if (!config) return true;

  const key = `${exchange}:${endpoint}`;
  const now = Date.now();
  const window = config.rateLimit.window;
  const maxRequests = config.rateLimit.requests;

  if (!rateLimits.has(key)) {
    rateLimits.set(key, { requests: [], window });
  }

  const limit = rateLimits.get(key);
  
  // Remove old requests outside the window
  limit.requests = limit.requests.filter(time => now - time < window);
  
  if (limit.requests.length >= maxRequests) {
    return false;
  }

  limit.requests.push(now);
  return true;
}

/**
 * Create signature for authenticated requests
 * @param {string} queryString - Query string to sign
 * @param {string} secret - API secret
 * @param {string} authType - Authentication type
 * @returns {string} - Signature
 */
function createSignature(queryString, secret, authType = 'HMAC_SHA256') {
  if (authType === 'HMAC_SHA256') {
    return crypto
      .createHmac('sha256', secret)
      .update(queryString)
      .digest('hex');
  }
  return '';
}

/**
 * Format symbol for exchange
 * @param {string} symbol - Trading pair symbol
 * @param {string} exchange - Exchange name
 * @returns {string} - Formatted symbol
 */
function formatSymbol(symbol, exchange) {
  switch (exchange) {
    case 'binance':
      return symbol.replace('/', '');
    case 'wazirx':
      return symbol.replace('/', '').toLowerCase();
    case 'coindcx':
      return symbol.replace('/', '').toUpperCase();
    default:
      return symbol;
  }
}

/**
 * Make HTTP request to exchange API
 * @param {string} method - HTTP method
 * @param {string} url - Request URL
 * @param {Object} data - Request data
 * @param {Object} headers - Request headers
 * @returns {Promise<Object>} - Response data
 */
function makeHttpRequest(method, url, data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'CryptoPulse/1.0',
        ...headers
      }
    };

    const req = https.request(url, options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const jsonData = JSON.parse(responseData);
          
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(jsonData);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${jsonData.msg || jsonData.message || responseData}`));
          }
        } catch (error) {
          reject(new Error(`Invalid JSON response: ${responseData}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`Request failed: ${error.message}`));
    });

    if (data && (method === 'POST' || method === 'PUT')) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

/**
 * Unified Exchange Service Class
 */
class ExchangeService {
  constructor(exchange, credentials, useSandbox = false) {
    this.exchange = exchange;
    this.credentials = credentials;
    this.useSandbox = useSandbox;
    this.config = EXCHANGE_CONFIGS[exchange];
    
    if (!this.config) {
      throw new Error(`Unsupported exchange: ${exchange}`);
    }

    this.baseUrl = useSandbox && this.config.sandboxUrl 
      ? this.config.sandboxUrl 
      : this.config.baseUrl;
  }

  /**
   * Get account information
   * @returns {Promise<Object>} - Account data
   */
  async getAccountInfo() {
    const endpoint = this.config.endpoints.account;
    return this.makeAuthenticatedRequest('GET', endpoint);
  }

  /**
   * Get current price for a trading pair
   * @param {string} symbol - Trading pair symbol
   * @returns {Promise<Object>} - Price data
   */
  async getCurrentPrice(symbol) {
    const endpoint = this.config.endpoints.ticker;
    const formattedSymbol = formatSymbol(symbol, this.exchange);
    
    let url;
    if (this.exchange === 'binance') {
      url = `${this.baseUrl}${endpoint}?symbol=${formattedSymbol}`;
    } else {
      url = `${this.baseUrl}${endpoint}`;
    }

    return makeHttpRequest('GET', url);
  }

  /**
   * Place a market order
   * @param {Object} orderData - Order parameters
   * @returns {Promise<Object>} - Order response
   */
  async placeMarketOrder(orderData) {
    const endpoint = this.config.endpoints.order;
    const formattedSymbol = formatSymbol(orderData.symbol, this.exchange);
    
    const orderParams = this.formatOrderParams(orderData, formattedSymbol);
    return this.makeAuthenticatedRequest('POST', endpoint, orderParams);
  }

  /**
   * Get open orders
   * @param {string} symbol - Optional symbol filter
   * @returns {Promise<Array>} - Open orders
   */
  async getOpenOrders(symbol = null) {
    const endpoint = this.config.endpoints.order;
    const params = {};
    
    if (symbol) {
      params.symbol = formatSymbol(symbol, this.exchange);
    }

    return this.makeAuthenticatedRequest('GET', endpoint, params);
  }

  /**
   * Get order history
   * @param {Object} params - Query parameters
   * @returns {Promise<Array>} - Order history
   */
  async getOrderHistory(params = {}) {
    const endpoint = this.config.endpoints.order;
    return this.makeAuthenticatedRequest('GET', endpoint, params);
  }

  /**
   * Format order parameters for specific exchange
   * @param {Object} orderData - Order data
   * @param {string} formattedSymbol - Formatted symbol
   * @returns {Object} - Formatted order parameters
   */
  formatOrderParams(orderData, formattedSymbol) {
    switch (this.exchange) {
      case 'binance':
        return {
          symbol: formattedSymbol,
          side: orderData.side.toUpperCase(),
          type: 'MARKET',
          quantity: orderData.quantity.toString(),
          timestamp: Date.now()
        };
        
      case 'wazirx':
        return {
          market: formattedSymbol,
          side: orderData.side.toLowerCase(),
          order_type: 'market',
          quantity: orderData.quantity.toString()
        };
        
      case 'coindcx':
        return {
          market: formattedSymbol,
          side: orderData.side.toLowerCase(),
          order_type: 'market_order',
          quantity: orderData.quantity.toString()
        };
        
      default:
        return orderData;
    }
  }

  /**
   * Make authenticated request to exchange
   * @param {string} method - HTTP method
   * @param {string} endpoint - API endpoint
   * @param {Object} data - Request data
   * @returns {Promise<Object>} - Response data
   */
  async makeAuthenticatedRequest(method, endpoint, data = null) {
    // Check rate limits
    if (!checkRateLimit(this.exchange, endpoint)) {
      throw new Error(`Rate limit exceeded for ${this.exchange}`);
    }

    const timestamp = Date.now();
    const queryParams = new URLSearchParams();
    
    // Add timestamp
    queryParams.append('timestamp', timestamp.toString());
    
    // Add data parameters to query string for signature
    if (data) {
      Object.keys(data).forEach(key => {
        queryParams.append(key, data[key].toString());
      });
    }
    
    const queryString = queryParams.toString();
    
    // Create signature
    const signature = createSignature(queryString, this.credentials.secret, this.config.authType);
    
    // Prepare headers
    const headers = this.getAuthHeaders(signature);
    
    // Build URL
    let url;
    if (method === 'GET') {
      url = `${this.baseUrl}${endpoint}?${queryString}&signature=${signature}`;
    } else {
      url = `${this.baseUrl}${endpoint}`;
    }
    
    // Prepare request body for POST requests
    let requestBody = null;
    if (method === 'POST' && data) {
      requestBody = {
        ...data,
        timestamp,
        signature
      };
    }
    
    try {
      const response = await makeHttpRequest(method, url, requestBody, headers);
      
      // Log successful request
      logger.debug('Exchange API request successful', {
        exchange: this.exchange,
        endpoint,
        method,
        status: 'success'
      });
      
      return response;
    } catch (error) {
      // Log failed request
      logger.error('Exchange API request failed', {
        exchange: this.exchange,
        endpoint,
        method,
        error: error.message
      });
      
      throw error;
    }
  }

  /**
   * Get authentication headers for exchange
   * @param {string} signature - Request signature
   * @returns {Object} - Headers object
   */
  getAuthHeaders(signature) {
    const headers = {
      'Content-Type': 'application/json'
    };

    switch (this.exchange) {
      case 'binance':
        headers['X-MBX-APIKEY'] = this.credentials.apiKey;
        break;
        
      case 'wazirx':
        headers['X-Api-Key'] = this.credentials.apiKey;
        break;
        
      case 'coindcx':
        headers['X-AUTH-APIKEY'] = this.credentials.apiKey;
        break;
    }

    return headers;
  }

  /**
   * Test exchange connection
   * @returns {Promise<boolean>} - Connection status
   */
  async testConnection() {
    try {
      await this.getAccountInfo();
      return true;
    } catch (error) {
      logger.error('Exchange connection test failed', {
        exchange: this.exchange,
        error: error.message
      });
      return false;
    }
  }

  /**
   * Get exchange information
   * @returns {Object} - Exchange configuration
   */
  getExchangeInfo() {
    return {
      name: this.config.name,
      exchange: this.exchange,
      baseUrl: this.baseUrl,
      useSandbox: this.useSandbox,
      rateLimit: this.config.rateLimit
    };
  }
}

/**
 * Factory function to create exchange service
 * @param {string} exchange - Exchange name
 * @param {Object} credentials - API credentials
 * @param {boolean} useSandbox - Use sandbox mode
 * @returns {ExchangeService} - Exchange service instance
 */
function createExchangeService(exchange, credentials, useSandbox = false) {
  return new ExchangeService(exchange, credentials, useSandbox);
}

/**
 * Get supported exchanges
 * @returns {Array} - List of supported exchanges
 */
function getSupportedExchanges() {
  return Object.keys(EXCHANGE_CONFIGS).map(exchange => ({
    exchange,
    name: EXCHANGE_CONFIGS[exchange].name,
    rateLimit: EXCHANGE_CONFIGS[exchange].rateLimit
  }));
}

/**
 * Validate exchange credentials
 * @param {string} exchange - Exchange name
 * @param {Object} credentials - API credentials
 * @returns {Object} - Validation result
 */
function validateCredentials(exchange, credentials) {
  const errors = [];
  
  if (!EXCHANGE_CONFIGS[exchange]) {
    errors.push(`Unsupported exchange: ${exchange}`);
    return { valid: false, errors };
  }
  
  if (!credentials.apiKey || credentials.apiKey.trim() === '') {
    errors.push('API key is required');
  }
  
  if (!credentials.secret || credentials.secret.trim() === '') {
    errors.push('API secret is required');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

module.exports = {
  ExchangeService,
  createExchangeService,
  getSupportedExchanges,
  validateCredentials,
  formatSymbol,
  checkRateLimit
};
