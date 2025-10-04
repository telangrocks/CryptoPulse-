// =============================================================================
// Exchange Service Tests - Production Ready
// =============================================================================
// Comprehensive tests for exchange integration and trading operations

// Set up test environment before importing exchange module
process.env.NODE_ENV = 'test';
process.env.BINANCE_API_KEY = 'test-binance-api-key';
process.env.BINANCE_SECRET_KEY = 'test-binance-secret-key';
process.env.WAZIRX_API_KEY = 'test-wazirx-api-key';
process.env.WAZIRX_SECRET_KEY = 'test-wazirx-secret-key';
process.env.COINDCX_API_KEY = 'test-coindcx-api-key';
process.env.COINDCX_SECRET_KEY = 'test-coindcx-secret-key';

const ExchangeService = require('../lib/exchangeService');
const { BinanceExchange, WazirxExchange, CoinDCXExchange } = require('../lib/exchangeService');

const { createTestTrade, createTestMarketData } = require('./testHelpers');

// Mock logger to avoid console output during tests
jest.mock('../lib/logging', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
}));

// Mock axios for API calls
jest.mock('axios', () => ({
  create: jest.fn(() => ({
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() }
    }
  })),
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn()
}));

// Mock crypto for signature generation
jest.mock('crypto', () => ({
  createHmac: jest.fn(() => ({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn().mockReturnValue('mocked-signature')
  })),
  randomBytes: jest.fn(() => Buffer.alloc(16, '0'))
}));

describe('Exchange Service', () => {
  let exchangeService;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    exchangeService = new ExchangeService();
  });

  describe('Exchange Service Initialization', () => {
    test('should initialize with all supported exchanges', () => {
      expect(exchangeService.exchanges).toBeDefined();
      expect(exchangeService.exchanges.binance).toBeDefined();
      expect(exchangeService.exchanges.wazirx).toBeDefined();
      expect(exchangeService.exchanges.coindcx).toBeDefined();
    });

    test('should have executeTrade method', () => {
      expect(typeof exchangeService.executeTrade).toBe('function');
    });

    test('should have getBalance method', () => {
      expect(typeof exchangeService.getBalance).toBe('function');
    });

    test('should have getMarketData method', () => {
      expect(typeof exchangeService.getMarketData).toBe('function');
    });
  });

  describe('Trade Execution', () => {
    test('should execute trade on supported exchange', async () => {
      const tradeData = createTestTrade({
        symbol: 'BTC/USDT',
        side: 'buy',
        amount: 0.001,
        price: 50000,
        type: 'market'
      });

      // Mock successful trade execution
      const mockResult = {
        orderId: 'test-order-123',
        status: 'filled',
        executedQty: 0.001,
        executedPrice: 50000,
        timestamp: Date.now()
      };

      // Mock the exchange service
      exchangeService.exchanges.binance.executeTrade = jest.fn().mockResolvedValue(mockResult);

      const result = await exchangeService.executeTrade('binance', tradeData);

      expect(result).toEqual(mockResult);
      expect(exchangeService.exchanges.binance.executeTrade).toHaveBeenCalledWith(tradeData);
    });

    test('should throw error for unsupported exchange', async () => {
      const tradeData = createTestTrade();
      
      await expect(exchangeService.executeTrade('unsupported', tradeData))
        .rejects.toThrow('Unsupported exchange: unsupported');
    });

    test('should handle trade execution errors', async () => {
      const tradeData = createTestTrade();
      
      // Mock trade execution failure
      exchangeService.exchanges.binance.executeTrade = jest.fn().mockRejectedValue(
        new Error('Insufficient balance')
      );

      await expect(exchangeService.executeTrade('binance', tradeData))
        .rejects.toThrow('Insufficient balance');
    });

    test('should validate trade data before execution', async () => {
      const invalidTradeData = {
        symbol: '', // Invalid symbol
        side: 'invalid', // Invalid side
        amount: -1, // Invalid amount
        price: 0 // Invalid price
      };

      await expect(exchangeService.executeTrade('binance', invalidTradeData))
        .rejects.toThrow();
    });
  });

  describe('Balance Management', () => {
    test('should get account balance', async () => {
      const mockBalance = {
        BTC: { free: '0.001', locked: '0.000', total: '0.001' },
        USDT: { free: '100.00', locked: '0.00', total: '100.00' }
      };

      exchangeService.exchanges.binance.getBalance = jest.fn().mockResolvedValue(mockBalance);

      const balance = await exchangeService.getBalance('binance');

      expect(balance).toEqual(mockBalance);
      expect(exchangeService.exchanges.binance.getBalance).toHaveBeenCalled();
    });

    test('should handle balance retrieval errors', async () => {
      exchangeService.exchanges.binance.getBalance = jest.fn().mockRejectedValue(
        new Error('API key invalid')
      );

      await expect(exchangeService.getBalance('binance'))
        .rejects.toThrow('API key invalid');
    });
  });

  describe('Market Data', () => {
    test('should get market data for trading pair', async () => {
      const mockMarketData = createTestMarketData({
        symbol: 'BTC/USDT',
        price: 50000,
        volume: 1000,
        change: 2.5
      });

      exchangeService.exchanges.binance.getMarketData = jest.fn().mockResolvedValue(mockMarketData);

      const marketData = await exchangeService.getMarketData('binance', 'BTC/USDT');

      expect(marketData).toEqual(mockMarketData);
      expect(exchangeService.exchanges.binance.getMarketData).toHaveBeenCalledWith('BTC/USDT');
    });

    test('should get all market data', async () => {
      const mockAllMarketData = [
        createTestMarketData({ symbol: 'BTC/USDT', price: 50000 }),
        createTestMarketData({ symbol: 'ETH/USDT', price: 3000 }),
        createTestMarketData({ symbol: 'ADA/USDT', price: 1.5 })
      ];

      exchangeService.exchanges.binance.getAllMarketData = jest.fn().mockResolvedValue(mockAllMarketData);

      const allMarketData = await exchangeService.getAllMarketData('binance');

      expect(allMarketData).toEqual(mockAllMarketData);
      expect(allMarketData).toHaveLength(3);
    });

    test('should handle market data errors', async () => {
      exchangeService.exchanges.binance.getMarketData = jest.fn().mockRejectedValue(
        new Error('Market data unavailable')
      );

      await expect(exchangeService.getMarketData('binance', 'BTC/USDT'))
        .rejects.toThrow('Market data unavailable');
    });
  });

  describe('Binance Exchange', () => {
    let binanceExchange;

    beforeEach(() => {
      binanceExchange = new BinanceExchange();
    });

    test('should initialize Binance exchange', () => {
      expect(binanceExchange).toBeDefined();
      expect(binanceExchange.name).toBe('binance');
      expect(binanceExchange.baseUrl).toBe('https://api.binance.com');
    });

    test('should execute market buy order', async () => {
      const tradeData = createTestTrade({
        symbol: 'BTCUSDT',
        side: 'buy',
        type: 'market',
        amount: 0.001
      });

      const mockResponse = {
        data: {
          orderId: 12345,
          status: 'FILLED',
          executedQty: '0.001',
          fills: [{ price: '50000.00', qty: '0.001' }]
        }
      };

      const axios = require('axios');
      axios.post.mockResolvedValue(mockResponse);

      const result = await binanceExchange.executeTrade(tradeData);

      expect(result.orderId).toBe(12345);
      expect(result.status).toBe('filled');
      expect(result.executedQty).toBe(0.001);
      expect(result.executedPrice).toBe(50000);
    });

    test('should execute limit sell order', async () => {
      const tradeData = createTestTrade({
        symbol: 'BTCUSDT',
        side: 'sell',
        type: 'limit',
        amount: 0.001,
        price: 51000
      });

      const mockResponse = {
        data: {
          orderId: 12346,
          status: 'NEW',
          executedQty: '0.000'
        }
      };

      const axios = require('axios');
      axios.post.mockResolvedValue(mockResponse);

      const result = await binanceExchange.executeTrade(tradeData);

      expect(result.orderId).toBe(12346);
      expect(result.status).toBe('pending');
      expect(result.executedQty).toBe(0);
    });

    test('should get account balance', async () => {
      const mockResponse = {
        data: [
          { asset: 'BTC', free: '0.001', locked: '0.000' },
          { asset: 'USDT', free: '100.00', locked: '0.00' }
        ]
      };

      const axios = require('axios');
      axios.get.mockResolvedValue(mockResponse);

      const balance = await binanceExchange.getBalance();

      expect(balance.BTC).toEqual({ free: '0.001', locked: '0.000', total: '0.001' });
      expect(balance.USDT).toEqual({ free: '100.00', locked: '0.00', total: '100.00' });
    });

    test('should get ticker price', async () => {
      const mockResponse = {
        data: {
          symbol: 'BTCUSDT',
          price: '50000.00'
        }
      };

      const axios = require('axios');
      axios.get.mockResolvedValue(mockResponse);

      const price = await binanceExchange.getTickerPrice('BTCUSDT');

      expect(price).toBe(50000);
    });

    test('should handle API errors', async () => {
      const tradeData = createTestTrade();
      
      const axios = require('axios');
      axios.post.mockRejectedValue({
        response: {
          status: 400,
          data: { code: -1013, msg: 'Invalid quantity' }
        }
      });

      await expect(binanceExchange.executeTrade(tradeData))
        .rejects.toThrow('Invalid quantity');
    });

    test('should generate correct signature', () => {
      const params = { symbol: 'BTCUSDT', timestamp: 1234567890 };
      const signature = binanceExchange.generateSignature(params);
      
      expect(signature).toBe('mocked-signature');
    });
  });

  describe('WazirX Exchange', () => {
    let wazirxExchange;

    beforeEach(() => {
      wazirxExchange = new WazirxExchange();
    });

    test('should initialize WazirX exchange', () => {
      expect(wazirxExchange).toBeDefined();
      expect(wazirxExchange.name).toBe('wazirx');
      expect(wazirxExchange.baseUrl).toBe('https://api.wazirx.com');
    });

    test('should execute buy order', async () => {
      const tradeData = createTestTrade({
        symbol: 'btcusdt',
        side: 'buy',
        amount: 0.001,
        price: 50000
      });

      const mockResponse = {
        data: {
          id: 'order-123',
          status: 'complete',
          filled_quantity: '0.001',
          price: '50000'
        }
      };

      const axios = require('axios');
      axios.post.mockResolvedValue(mockResponse);

      const result = await wazirxExchange.executeTrade(tradeData);

      expect(result.orderId).toBe('order-123');
      expect(result.status).toBe('filled');
      expect(result.executedQty).toBe(0.001);
      expect(result.executedPrice).toBe(50000);
    });

    test('should get account balance', async () => {
      const mockResponse = {
        data: {
          btc: { free: '0.001', locked: '0.000' },
          usdt: { free: '100.00', locked: '0.00' }
        }
      };

      const axios = require('axios');
      axios.get.mockResolvedValue(mockResponse);

      const balance = await wazirxExchange.getBalance();

      expect(balance.BTC).toEqual({ free: '0.001', locked: '0.000', total: '0.001' });
      expect(balance.USDT).toEqual({ free: '100.00', locked: '0.00', total: '100.00' });
    });

    test('should get ticker price', async () => {
      const mockResponse = {
        data: {
          symbol: 'btcusdt',
          last: '50000.00'
        }
      };

      const axios = require('axios');
      axios.get.mockResolvedValue(mockResponse);

      const price = await wazirxExchange.getTickerPrice('btcusdt');

      expect(price).toBe(50000);
    });
  });

  describe('CoinDCX Exchange', () => {
    let coindcxExchange;

    beforeEach(() => {
      coindcxExchange = new CoinDCXExchange();
    });

    test('should initialize CoinDCX exchange', () => {
      expect(coindcxExchange).toBeDefined();
      expect(coindcxExchange.name).toBe('coindcx');
      expect(coindcxExchange.baseUrl).toBe('https://api.coindcx.com');
    });

    test('should execute buy order', async () => {
      const tradeData = createTestTrade({
        symbol: 'B-BTC_USDT',
        side: 'buy',
        amount: 0.001,
        price: 50000
      });

      const mockResponse = {
        data: {
          order_id: 'order-456',
          status: 'filled',
          filled_quantity: 0.001,
          price_per_unit: 50000
        }
      };

      const axios = require('axios');
      axios.post.mockResolvedValue(mockResponse);

      const result = await coindcxExchange.executeTrade(tradeData);

      expect(result.orderId).toBe('order-456');
      expect(result.status).toBe('filled');
      expect(result.executedQty).toBe(0.001);
      expect(result.executedPrice).toBe(50000);
    });

    test('should get account balance', async () => {
      const mockResponse = {
        data: {
          BTC: { balance: '0.001', locked_balance: '0.000' },
          USDT: { balance: '100.00', locked_balance: '0.00' }
        }
      };

      const axios = require('axios');
      axios.get.mockResolvedValue(mockResponse);

      const balance = await coindcxExchange.getBalance();

      expect(balance.BTC).toEqual({ free: '0.001', locked: '0.000', total: '0.001' });
      expect(balance.USDT).toEqual({ free: '100.00', locked: '0.00', total: '100.00' });
    });
  });

  describe('Error Handling', () => {
    test('should handle network errors', async () => {
      const axios = require('axios');
      axios.post.mockRejectedValue(new Error('Network error'));

      const tradeData = createTestTrade();
      
      await expect(exchangeService.executeTrade('binance', tradeData))
        .rejects.toThrow('Network error');
    });

    test('should handle API rate limiting', async () => {
      const axios = require('axios');
      axios.post.mockRejectedValue({
        response: {
          status: 429,
          data: { message: 'Rate limit exceeded' }
        }
      });

      const tradeData = createTestTrade();
      
      await expect(exchangeService.executeTrade('binance', tradeData))
        .rejects.toThrow();
    });

    test('should handle invalid API credentials', async () => {
      const axios = require('axios');
      axios.post.mockRejectedValue({
        response: {
          status: 401,
          data: { message: 'Invalid API key' }
        }
      });

      const tradeData = createTestTrade();
      
      await expect(exchangeService.executeTrade('binance', tradeData))
        .rejects.toThrow();
    });

    test('should handle insufficient balance', async () => {
      const axios = require('axios');
      axios.post.mockRejectedValue({
        response: {
          status: 400,
          data: { code: -2010, msg: 'Account has insufficient balance' }
        }
      });

      const tradeData = createTestTrade();
      
      await expect(exchangeService.executeTrade('binance', tradeData))
        .rejects.toThrow();
    });
  });

  describe('Data Validation', () => {
    test('should validate trade data structure', async () => {
      const invalidTradeData = {
        // Missing required fields
        amount: 0.001
      };

      await expect(exchangeService.executeTrade('binance', invalidTradeData))
        .rejects.toThrow();
    });

    test('should validate symbol format', async () => {
      const tradeData = createTestTrade({
        symbol: 'invalid-symbol-format'
      });

      await expect(exchangeService.executeTrade('binance', tradeData))
        .rejects.toThrow();
    });

    test('should validate amount values', async () => {
      const tradeData = createTestTrade({
        amount: 0 // Invalid amount
      });

      await expect(exchangeService.executeTrade('binance', tradeData))
        .rejects.toThrow();
    });

    test('should validate price values', async () => {
      const tradeData = createTestTrade({
        price: -100 // Invalid price
      });

      await expect(exchangeService.executeTrade('binance', tradeData))
        .rejects.toThrow();
    });
  });

  describe('Performance and Monitoring', () => {
    test('should track execution time', async () => {
      const tradeData = createTestTrade();
      
      // Mock slow response
      const axios = require('axios');
      axios.post.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ data: { orderId: 123 } }), 100))
      );

      const startTime = Date.now();
      await exchangeService.executeTrade('binance', tradeData);
      const endTime = Date.now();

      expect(endTime - startTime).toBeGreaterThanOrEqual(100);
    });

    test('should handle concurrent requests', async () => {
      const tradeData1 = createTestTrade({ amount: 0.001 });
      const tradeData2 = createTestTrade({ amount: 0.002 });

      const axios = require('axios');
      axios.post.mockResolvedValue({ data: { orderId: 123 } });

      const promises = [
        exchangeService.executeTrade('binance', tradeData1),
        exchangeService.executeTrade('binance', tradeData2)
      ];

      const results = await Promise.all(promises);

      expect(results).toHaveLength(2);
      expect(results[0].orderId).toBe(123);
      expect(results[1].orderId).toBe(123);
    });
  });
});
