/**
 * Comprehensive Exchange Integration Testing Suite
 * Tests real exchange APIs with sandbox/live environments
 */

const axios = require('axios');
const crypto = require('crypto');

describe('Exchange Integration Tests', () => {
  let testConfig;
  
  beforeAll(() => {
    testConfig = {
      binance: {
        sandbox: {
          baseUrl: 'https://testnet.binance.vision/api/v3',
          apiKey: process.env.BINANCE_TEST_API_KEY,
          secretKey: process.env.BINANCE_TEST_SECRET_KEY
        },
        live: {
          baseUrl: 'https://api.binance.com/api/v3',
          apiKey: process.env.BINANCE_LIVE_API_KEY,
          secretKey: process.env.BINANCE_LIVE_SECRET_KEY
        }
      },
      wazirx: {
        sandbox: {
          baseUrl: 'https://api-sandbox.wazirx.com/api/v2',
          apiKey: process.env.WAZIRX_TEST_API_KEY,
          secretKey: process.env.WAZIRX_TEST_SECRET_KEY
        },
        live: {
          baseUrl: 'https://api.wazirx.com/api/v2',
          apiKey: process.env.WAZIRX_LIVE_API_KEY,
          secretKey: process.env.WAZIRX_LIVE_SECRET_KEY
        }
      }
    };
  });

  describe('Binance Exchange Testing', () => {
    test('Sandbox API Connection Test', async () => {
      const config = testConfig.binance.sandbox;
      if (!config.apiKey || !config.secretKey) {
        console.warn('Binance sandbox credentials not provided, skipping test');
        return;
      }

      try {
        const response = await axios.get(`${config.baseUrl}/ping`);
        expect(response.status).toBe(200);
        expect(response.data).toEqual({});
      } catch (error) {
        fail(`Binance sandbox connection failed: ${error.message}`);
      }
    });

    test('Sandbox Account Info Test', async () => {
      const config = testConfig.binance.sandbox;
      if (!config.apiKey || !config.secretKey) {
        console.warn('Binance sandbox credentials not provided, skipping test');
        return;
      }

      try {
        const timestamp = Date.now();
        const queryString = `timestamp=${timestamp}`;
        const signature = crypto
          .createHmac('sha256', config.secretKey)
          .update(queryString)
          .digest('hex');

        const response = await axios.get(
          `${config.baseUrl}/account?${queryString}&signature=${signature}`,
          {
            headers: {
              'X-MBX-APIKEY': config.apiKey
            }
          }
        );

        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('accountType');
        expect(response.data).toHaveProperty('balances');
      } catch (error) {
        fail(`Binance sandbox account info failed: ${error.message}`);
      }
    });

    test('Sandbox Order Placement Test', async () => {
      const config = testConfig.binance.sandbox;
      if (!config.apiKey || !config.secretKey) {
        console.warn('Binance sandbox credentials not provided, skipping test');
        return;
      }

      try {
        const timestamp = Date.now();
        const orderData = {
          symbol: 'BTCUSDT',
          side: 'BUY',
          type: 'MARKET',
          quantity: '0.001',
          timestamp: timestamp
        };

        const queryString = Object.keys(orderData)
          .map(key => `${key}=${orderData[key]}`)
          .join('&');

        const signature = crypto
          .createHmac('sha256', config.secretKey)
          .update(queryString)
          .digest('hex');

        const response = await axios.post(
          `${config.baseUrl}/order/test?${queryString}&signature=${signature}`,
          {},
          {
            headers: {
              'X-MBX-APIKEY': config.apiKey,
              'Content-Type': 'application/x-www-form-urlencoded'
            }
          }
        );

        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('symbol', 'BTCUSDT');
      } catch (error) {
        fail(`Binance sandbox order test failed: ${error.message}`);
      }
    });

    test('Live API Connection Test (if credentials provided)', async () => {
      const config = testConfig.binance.live;
      if (!config.apiKey || !config.secretKey) {
        console.warn('Binance live credentials not provided, skipping test');
        return;
      }

      try {
        const response = await axios.get(`${config.baseUrl}/ping`);
        expect(response.status).toBe(200);
        expect(response.data).toEqual({});
      } catch (error) {
        fail(`Binance live connection failed: ${error.message}`);
      }
    });
  });

  describe('WazirX Exchange Testing', () => {
    test('Sandbox API Connection Test', async () => {
      const config = testConfig.wazirx.sandbox;
      if (!config.apiKey || !config.secretKey) {
        console.warn('WazirX sandbox credentials not provided, skipping test');
        return;
      }

      try {
        const response = await axios.get(`${config.baseUrl}/ping`);
        expect(response.status).toBe(200);
      } catch (error) {
        fail(`WazirX sandbox connection failed: ${error.message}`);
      }
    });

    test('Sandbox Account Info Test', async () => {
      const config = testConfig.wazirx.sandbox;
      if (!config.apiKey || !config.secretKey) {
        console.warn('WazirX sandbox credentials not provided, skipping test');
        return;
      }

      try {
        const timestamp = Date.now();
        const queryString = `timestamp=${timestamp}`;
        const signature = crypto
          .createHmac('sha256', config.secretKey)
          .update(queryString)
          .digest('hex');

        const response = await axios.get(
          `${config.baseUrl}/account?${queryString}&signature=${signature}`,
          {
            headers: {
              'X-API-KEY': config.apiKey
            }
          }
        );

        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('status');
      } catch (error) {
        fail(`WazirX sandbox account info failed: ${error.message}`);
      }
    });
  });

  describe('Exchange Rate Limiting Tests', () => {
    test('Binance Rate Limit Handling', async () => {
      const config = testConfig.binance.sandbox;
      if (!config.apiKey) {
        console.warn('Binance credentials not provided, skipping rate limit test');
        return;
      }

      const requests = [];
      const startTime = Date.now();

      // Make 10 rapid requests to test rate limiting
      for (let i = 0; i < 10; i++) {
        requests.push(
          axios.get(`${config.baseUrl}/ping`).catch(error => ({
            status: error.response?.status,
            message: error.message
          }))
        );
      }

      const results = await Promise.all(requests);
      const endTime = Date.now();
      const duration = endTime - startTime;

      console.log(`Rate limit test completed in ${duration}ms`);
      
      // Should handle rate limiting gracefully
      const successCount = results.filter(r => r.status === 200).length;
      expect(successCount).toBeGreaterThan(0);
    });
  });

  describe('Exchange Error Handling Tests', () => {
    test('Invalid API Key Handling', async () => {
      const config = testConfig.binance.sandbox;
      
      try {
        const timestamp = Date.now();
        const queryString = `timestamp=${timestamp}`;
        const signature = crypto
          .createHmac('sha256', 'invalid-secret')
          .update(queryString)
          .digest('hex');

        await axios.get(
          `${config.baseUrl}/account?${queryString}&signature=${signature}`,
          {
            headers: {
              'X-MBX-APIKEY': 'invalid-key'
            }
          }
        );
        
        fail('Should have thrown an error for invalid credentials');
      } catch (error) {
        expect(error.response?.status).toBe(401);
      }
    });

    test('Invalid Symbol Handling', async () => {
      const config = testConfig.binance.sandbox;
      
      try {
        const response = await axios.get(`${config.baseUrl}/ticker/price?symbol=INVALIDPAIR`);
        fail('Should have thrown an error for invalid symbol');
      } catch (error) {
        expect(error.response?.status).toBe(400);
      }
    });
  });

  describe('Exchange Data Validation Tests', () => {
    test('Market Data Structure Validation', async () => {
      const config = testConfig.binance.sandbox;
      
      try {
        const response = await axios.get(`${config.baseUrl}/ticker/24hr?symbol=BTCUSDT`);
        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('symbol', 'BTCUSDT');
        expect(response.data).toHaveProperty('price');
        expect(response.data).toHaveProperty('volume');
        expect(response.data).toHaveProperty('count');
        expect(typeof response.data.price).toBe('string');
        expect(typeof response.data.volume).toBe('string');
      } catch (error) {
        fail(`Market data validation failed: ${error.message}`);
      }
    });

    test('Order Book Data Validation', async () => {
      const config = testConfig.binance.sandbox;
      
      try {
        const response = await axios.get(`${config.baseUrl}/depth?symbol=BTCUSDT&limit=5`);
        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('bids');
        expect(response.data).toHaveProperty('asks');
        expect(Array.isArray(response.data.bids)).toBe(true);
        expect(Array.isArray(response.data.asks)).toBe(true);
        expect(response.data.bids.length).toBeGreaterThan(0);
        expect(response.data.asks.length).toBeGreaterThan(0);
      } catch (error) {
        fail(`Order book validation failed: ${error.message}`);
      }
    });
  });
});
