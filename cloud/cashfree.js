// =============================================================================
// Cashfree Payment Integration - Production Ready
// =============================================================================
// This module handles Cashfree payment integration with proper sandbox/live mode handling
// Supports both test and production environments with secure credential management

const crypto = require('crypto');
const https = require('https');

// Cashfree Configuration
const CASHFREE_CONFIG = {
  // Mode detection - defaults to SANDBOX for safety
  mode: process.env.CASHFREE_MODE || 'SANDBOX',
  
  // Sandbox credentials
  sandbox: {
    appId: process.env.CASHFREE_SANDBOX_APP_ID || 'YOUR_SANDBOX_APP_ID_HERE',
    secretKey: process.env.CASHFREE_SANDBOX_SECRET_KEY || 'YOUR_SANDBOX_SECRET_KEY_HERE',
    baseUrl: 'https://sandbox.cashfree.com/pg',
    apiUrl: 'https://sandbox.cashfree.com/pg/orders'
  },
  
  // Live credentials
  live: {
    appId: process.env.CASHFREE_LIVE_APP_ID || 'YOUR_LIVE_APP_ID_HERE',
    secretKey: process.env.CASHFREE_LIVE_SECRET_KEY || 'YOUR_LIVE_SECRET_KEY_HERE',
    baseUrl: 'https://api.cashfree.com/pg',
    apiUrl: 'https://api.cashfree.com/pg/orders'
  }
};

// Get current environment credentials
function getCurrentCredentials() {
  const isLive = CASHFREE_CONFIG.mode === 'LIVE' || CASHFREE_CONFIG.mode === 'PRODUCTION';
  return isLive ? CASHFREE_CONFIG.live : CASHFREE_CONFIG.sandbox;
}

// Generate secure signature for Cashfree API
function generateSignature(data, secretKey) {
  const message = Object.keys(data)
    .sort()
    .map(key => `${key}=${data[key]}`)
    .join('&');
  
  return crypto
    .createHmac('sha256', secretKey)
    .update(message)
    .digest('hex');
}

// Create Cashfree order
async function createOrder(orderData) {
  try {
    const credentials = getCurrentCredentials();
    const isLive = CASHFREE_CONFIG.mode === 'LIVE' || CASHFREE_CONFIG.mode === 'PRODUCTION';
    
    // Prepare order payload
    const payload = {
      order_id: orderData.orderId,
      order_amount: orderData.amount,
      order_currency: orderData.currency || 'INR',
      customer_details: {
        customer_id: orderData.customerId,
        customer_email: orderData.customerEmail,
        customer_name: orderData.customerName,
        customer_phone: orderData.customerPhone || ''
      },
      order_meta: {
        return_url: `${process.env.FRONTEND_URL || 'https://cryptopulse.b4a.app'}/payment-success`,
        notify_url: `${process.env.BACKEND_URL || 'https://cryptopulse.b4a.app'}/webhook/cashfree`,
        payment_methods: 'cc,dc,nb,upi,wallet,paypal'
      }
    };

    // Add environment-specific configurations
    if (isLive) {
      payload.order_meta.payment_methods = 'cc,dc,nb,upi,wallet,paypal';
    } else {
      // Sandbox mode - add test configurations
      payload.order_meta.payment_methods = 'cc,dc,nb,upi,wallet';
      payload.order_meta.test_mode = true;
    }

    // Generate signature
    const signature = generateSignature(payload, credentials.secretKey);
    
    // Prepare headers
    const headers = {
      'Content-Type': 'application/json',
      'x-api-version': '2022-09-01',
      'x-client-id': credentials.appId,
      'x-client-secret': credentials.secretKey,
      'x-signature': signature
    };

    // Make API call
    const response = await makeHttpRequest(credentials.apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    if (response.success) {
      return {
        success: true,
        orderId: response.cf_order_id,
        paymentUrl: response.payment_url,
        orderToken: response.order_token,
        environment: isLive ? 'LIVE' : 'SANDBOX',
        amount: orderData.amount,
        currency: orderData.currency || 'INR'
      };
    } else {
      throw new Error(response.message || 'Failed to create Cashfree order');
    }

  } catch (error) {
    console.error('Cashfree order creation error:', error);
    throw new Error(`Payment gateway error: ${error.message}`);
  }
}

// Verify payment status
async function verifyPayment(orderId) {
  try {
    const credentials = getCurrentCredentials();
    const isLive = CASHFREE_CONFIG.mode === 'LIVE' || CASHFREE_CONFIG.mode === 'PRODUCTION';
    
    const url = `${credentials.apiUrl}/${orderId}`;
    const headers = {
      'x-api-version': '2022-09-01',
      'x-client-id': credentials.appId,
      'x-client-secret': credentials.secretKey
    };

    const response = await makeHttpRequest(url, {
      method: 'GET',
      headers
    });

    return {
      success: true,
      orderId: response.cf_order_id,
      status: response.order_status,
      amount: response.order_amount,
      currency: response.order_currency,
      paymentTime: response.payment_time,
      environment: isLive ? 'LIVE' : 'SANDBOX'
    };

  } catch (error) {
    console.error('Cashfree payment verification error:', error);
    throw new Error(`Payment verification error: ${error.message}`);
  }
}

// Handle webhook notifications
function handleWebhook(webhookData, signature) {
  try {
    const credentials = getCurrentCredentials();
    
    // Verify webhook signature
    const expectedSignature = generateSignature(webhookData, credentials.secretKey);
    if (signature !== expectedSignature) {
      throw new Error('Invalid webhook signature');
    }

    return {
      success: true,
      orderId: webhookData.orderId,
      status: webhookData.status,
      amount: webhookData.amount,
      currency: webhookData.currency,
      paymentId: webhookData.paymentId,
      environment: CASHFREE_CONFIG.mode
    };

  } catch (error) {
    console.error('Cashfree webhook handling error:', error);
    throw new Error(`Webhook processing error: ${error.message}`);
  }
}

// Get payment methods for current environment
function getAvailablePaymentMethods() {
  const isLive = CASHFREE_CONFIG.mode === 'LIVE' || CASHFREE_CONFIG.mode === 'PRODUCTION';
  
  if (isLive) {
    return [
      { id: 'cc', name: 'Credit Card', enabled: true },
      { id: 'dc', name: 'Debit Card', enabled: true },
      { id: 'nb', name: 'Net Banking', enabled: true },
      { id: 'upi', name: 'UPI', enabled: true },
      { id: 'wallet', name: 'Digital Wallet', enabled: true },
      { id: 'paypal', name: 'PayPal', enabled: true }
    ];
  } else {
    return [
      { id: 'cc', name: 'Credit Card (Test)', enabled: true },
      { id: 'dc', name: 'Debit Card (Test)', enabled: true },
      { id: 'nb', name: 'Net Banking (Test)', enabled: true },
      { id: 'upi', name: 'UPI (Test)', enabled: true },
      { id: 'wallet', name: 'Digital Wallet (Test)', enabled: true }
    ];
  }
}

// Switch between sandbox and live mode
function switchMode(mode) {
  if (mode === 'LIVE' || mode === 'PRODUCTION') {
    CASHFREE_CONFIG.mode = 'LIVE';
    console.log('Cashfree mode switched to LIVE');
  } else {
    CASHFREE_CONFIG.mode = 'SANDBOX';
    console.log('Cashfree mode switched to SANDBOX');
  }
  
  return {
    success: true,
    currentMode: CASHFREE_CONFIG.mode,
    credentials: getCurrentCredentials()
  };
}

// Get current configuration status
function getConfigurationStatus() {
  const credentials = getCurrentCredentials();
  const isLive = CASHFREE_CONFIG.mode === 'LIVE' || CASHFREE_CONFIG.mode === 'PRODUCTION';
  
  return {
    mode: CASHFREE_CONFIG.mode,
    environment: isLive ? 'LIVE' : 'SANDBOX',
    appId: credentials.appId,
    baseUrl: credentials.baseUrl,
    paymentMethods: getAvailablePaymentMethods(),
    configured: !!(credentials.appId && credentials.secretKey)
  };
}

// HTTP request helper
function makeHttpRequest(url, options) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    };

    const req = https.request(requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(response);
          } else {
            reject(new Error(response.message || `HTTP ${res.statusCode}`));
          }
        } catch (error) {
          reject(new Error('Invalid JSON response'));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (options.body) {
      req.write(options.body);
    }

    req.end();
  });
}

// Export functions
module.exports = {
  createOrder,
  verifyPayment,
  handleWebhook,
  getAvailablePaymentMethods,
  switchMode,
  getConfigurationStatus,
  getCurrentCredentials,
  generateSignature
};
