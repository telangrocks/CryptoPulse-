// =============================================================================
// Real Exchange Integration Service - Production Ready
// =============================================================================
// Comprehensive exchange API integration for actual trading

const axios = require('axios');
const crypto = require('crypto');
const { logger } = require('./logging');

class ExchangeService {
  constructor() {
    this.exchanges = {
      binance: new BinanceExchange(),
      wazirx: new WazirxExchange(),
      coindcx: new CoinDCXExchange(),
      delta: new DeltaExchange(),
      coinbase: new CoinbaseExchange()
    };
  }

  // Execute trade on exchange
  async executeTrade(exchange, tradeData) {
    try {
      const exchangeService = this.exchanges[exchange];
      if (!exchangeService) {
        throw new Error(`Unsupported exchange: ${exchange}`);
      }

      logger.info(`Executing trade on ${exchange}:`, {
        symbol: tradeData.symbol,
        side: tradeData.side,
        amount: tradeData.amount,
        price: tradeData.price
      });

      const result = await exchangeService.executeTrade(tradeData);

      logger.info(`Trade executed successfully on ${exchange}:`, {
        orderId: result.orderId,
        status: result.status,
        executedQty: result.executedQty,
        executedPrice: result.executedPrice
      });

      return result;
    } catch (error) {
      logger.error(`Trade execution failed on ${exchange}:`, error);
      throw error;
    }
  }

  // Get account balance
  async getBalance(exchange, apiKey, secretKey) {
    try {
      const exchangeService = this.exchanges[exchange];
      if (!exchangeService) {
        throw new Error(`Unsupported exchange: ${exchange}`);
      }

      return await exchangeService.getBalance(apiKey, secretKey);
    } catch (error) {
      logger.error(`Failed to get balance from ${exchange}:`, error);
      throw error;
    }
  }

  // Get order status
  async getOrderStatus(exchange, orderId, symbol, apiKey, secretKey) {
    try {
      const exchangeService = this.exchanges[exchange];
      if (!exchangeService) {
        throw new Error(`Unsupported exchange: ${exchange}`);
      }

      return await exchangeService.getOrderStatus(orderId, symbol, apiKey, secretKey);
    } catch (error) {
      logger.error(`Failed to get order status from ${exchange}:`, error);
      throw error;
    }
  }

  // Cancel order
  async cancelOrder(exchange, orderId, symbol, apiKey, secretKey) {
    try {
      const exchangeService = this.exchanges[exchange];
      if (!exchangeService) {
        throw new Error(`Unsupported exchange: ${exchange}`);
      }

      return await exchangeService.cancelOrder(orderId, symbol, apiKey, secretKey);
    } catch (error) {
      logger.error(`Failed to cancel order on ${exchange}:`, error);
      throw error;
    }
  }
}

// Binance Exchange Implementation
class BinanceExchange {
  constructor() {
    this.baseUrl = 'https://api.binance.com';
    this.testnetUrl = 'https://testnet.binance.vision';
  }

  async executeTrade(tradeData) {
    const { symbol, side, amount, price, apiKey, secretKey, isTestnet = false } = tradeData;
    const baseUrl = isTestnet ? this.testnetUrl : this.baseUrl;

    const timestamp = Date.now();
    const params = {
      symbol: symbol.toUpperCase(),
      side: side.toUpperCase(),
      type: price ? 'LIMIT' : 'MARKET',
      quantity: amount.toString(),
      timestamp: timestamp
    };

    if (price) {
      params.price = price.toString();
      params.timeInForce = 'GTC';
    }

    const queryString = Object.keys(params)
      .map(key => `${key}=${encodeURIComponent(params[key])}`)
      .join('&');

    const signature = crypto
      .createHmac('sha256', secretKey)
      .update(queryString)
      .digest('hex');

    const url = `${baseUrl}/api/v3/order?${queryString}&signature=${signature}`;

    const response = await axios.post(url, {}, {
      headers: {
        'X-MBX-APIKEY': apiKey,
        'Content-Type': 'application/json'
      }
    });

    return {
      orderId: response.data.orderId.toString(),
      status: response.data.status,
      executedQty: parseFloat(response.data.executedQty),
      executedPrice: parseFloat(response.data.price || response.data.fills?.[0]?.price || 0),
      side: response.data.side,
      symbol: response.data.symbol,
      timestamp: response.data.transactTime,
      commission: response.data.fills?.reduce((sum, fill) => sum + parseFloat(fill.commission), 0) || 0,
      commissionAsset: response.data.fills?.[0]?.commissionAsset || 'USDT'
    };
  }

  async getBalance(apiKey, secretKey) {
    const timestamp = Date.now();
    const queryString = `timestamp=${timestamp}`;
    const signature = crypto
      .createHmac('sha256', secretKey)
      .update(queryString)
      .digest('hex');

    const url = `${this.baseUrl}/api/v3/account?${queryString}&signature=${signature}`;

    const response = await axios.get(url, {
      headers: {
        'X-MBX-APIKEY': apiKey
      }
    });

    return response.data.balances
      .filter(balance => parseFloat(balance.free) > 0 || parseFloat(balance.locked) > 0)
      .map(balance => ({
        asset: balance.asset,
        free: parseFloat(balance.free),
        locked: parseFloat(balance.locked),
        total: parseFloat(balance.free) + parseFloat(balance.locked)
      }));
  }

  async getOrderStatus(orderId, symbol, apiKey, secretKey) {
    const timestamp = Date.now();
    const params = {
      symbol: symbol.toUpperCase(),
      orderId: orderId,
      timestamp: timestamp
    };

    const queryString = Object.keys(params)
      .map(key => `${key}=${encodeURIComponent(params[key])}`)
      .join('&');

    const signature = crypto
      .createHmac('sha256', secretKey)
      .update(queryString)
      .digest('hex');

    const url = `${this.baseUrl}/api/v3/order?${queryString}&signature=${signature}`;

    const response = await axios.get(url, {
      headers: {
        'X-MBX-APIKEY': apiKey
      }
    });

    return {
      orderId: response.data.orderId.toString(),
      status: response.data.status,
      executedQty: parseFloat(response.data.executedQty),
      executedPrice: parseFloat(response.data.price || 0),
      side: response.data.side,
      symbol: response.data.symbol,
      timestamp: response.data.time
    };
  }

  async cancelOrder(orderId, symbol, apiKey, secretKey) {
    const timestamp = Date.now();
    const params = {
      symbol: symbol.toUpperCase(),
      orderId: orderId,
      timestamp: timestamp
    };

    const queryString = Object.keys(params)
      .map(key => `${key}=${encodeURIComponent(params[key])}`)
      .join('&');

    const signature = crypto
      .createHmac('sha256', secretKey)
      .update(queryString)
      .digest('hex');

    const url = `${this.baseUrl}/api/v3/order?${queryString}&signature=${signature}`;

    const response = await axios.delete(url, {
      headers: {
        'X-MBX-APIKEY': apiKey
      }
    });

    return {
      orderId: response.data.orderId.toString(),
      status: response.data.status,
      symbol: response.data.symbol
    };
  }
}

// WazirX Exchange Implementation
class WazirxExchange {
  constructor() {
    this.baseUrl = 'https://api.wazirx.com/api/v2';
  }

  async executeTrade(tradeData) {
    const { symbol, side, amount, price, apiKey, secretKey } = tradeData;

    const timestamp = Date.now();
    const params = {
      symbol: symbol.toUpperCase(),
      side: side.toLowerCase(),
      type: price ? 'limit' : 'market',
      quantity: amount.toString(),
      timestamp: timestamp
    };

    if (price) {
      params.price = price.toString();
    }

    const queryString = Object.keys(params)
      .map(key => `${key}=${encodeURIComponent(params[key])}`)
      .join('&');

    const signature = crypto
      .createHmac('sha256', secretKey)
      .update(queryString)
      .digest('hex');

    const url = `${this.baseUrl}/orders`;

    const response = await axios.post(url, params, {
      headers: {
        'X-Api-Key': apiKey,
        'X-Api-Signature': signature,
        'Content-Type': 'application/json'
      }
    });

    return {
      orderId: response.data.id.toString(),
      status: response.data.status,
      executedQty: parseFloat(response.data.executedQuantity || 0),
      executedPrice: parseFloat(response.data.price || 0),
      side: response.data.side,
      symbol: response.data.symbol,
      timestamp: response.data.createdAt,
      commission: 0, // WazirX doesn't provide commission in order response
      commissionAsset: 'USDT'
    };
  }

  async getBalance(apiKey, secretKey) {
    const timestamp = Date.now();
    const queryString = `timestamp=${timestamp}`;
    const signature = crypto
      .createHmac('sha256', secretKey)
      .update(queryString)
      .digest('hex');

    const url = `${this.baseUrl}/funds?${queryString}&signature=${signature}`;

    const response = await axios.get(url, {
      headers: {
        'X-Api-Key': apiKey,
        'X-Api-Signature': signature
      }
    });

    return response.data
      .filter(balance => parseFloat(balance.free) > 0 || parseFloat(balance.locked) > 0)
      .map(balance => ({
        asset: balance.currency,
        free: parseFloat(balance.free),
        locked: parseFloat(balance.locked),
        total: parseFloat(balance.free) + parseFloat(balance.locked)
      }));
  }

  async getOrderStatus(orderId, symbol, apiKey, secretKey) {
    const timestamp = Date.now();
    const params = {
      orderId: orderId,
      timestamp: timestamp
    };

    const queryString = Object.keys(params)
      .map(key => `${key}=${encodeURIComponent(params[key])}`)
      .join('&');

    const signature = crypto
      .createHmac('sha256', secretKey)
      .update(queryString)
      .digest('hex');

    const url = `${this.baseUrl}/orders?${queryString}&signature=${signature}`;

    const response = await axios.get(url, {
      headers: {
        'X-Api-Key': apiKey,
        'X-Api-Signature': signature
      }
    });

    const order = response.data.find(o => o.id.toString() === orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    return {
      orderId: order.id.toString(),
      status: order.status,
      executedQty: parseFloat(order.executedQuantity || 0),
      executedPrice: parseFloat(order.price || 0),
      side: order.side,
      symbol: order.symbol,
      timestamp: order.createdAt
    };
  }

  async cancelOrder(orderId, symbol, apiKey, secretKey) {
    const timestamp = Date.now();
    const params = {
      orderId: orderId,
      timestamp: timestamp
    };

    const queryString = Object.keys(params)
      .map(key => `${key}=${encodeURIComponent(params[key])}`)
      .join('&');

    const signature = crypto
      .createHmac('sha256', secretKey)
      .update(queryString)
      .digest('hex');

    const url = `${this.baseUrl}/orders?${queryString}&signature=${signature}`;

    const response = await axios.delete(url, {
      headers: {
        'X-Api-Key': apiKey,
        'X-Api-Signature': signature
      }
    });

    return {
      orderId: response.data.id.toString(),
      status: response.data.status,
      symbol: response.data.symbol
    };
  }
}

// CoinDCX Exchange Implementation
class CoinDCXExchange {
  constructor() {
    this.baseUrl = 'https://api.coindcx.com/exchange/v1';
  }

  async executeTrade(tradeData) {
    const { symbol, side, amount, price, apiKey, secretKey } = tradeData;

    const timestamp = Date.now();
    const body = {
      side: side.toLowerCase(),
      order_type: price ? 'limit_order' : 'market_order',
      market: symbol,
      total_quantity: amount.toString(),
      timestamp: timestamp
    };

    if (price) {
      body.price_per_unit = price.toString();
    }

    const payload = JSON.stringify(body);
    const signature = crypto
      .createHmac('sha256', secretKey)
      .update(payload)
      .digest('hex');

    const url = `${this.baseUrl}/orders/create`;

    const response = await axios.post(url, body, {
      headers: {
        'X-AUTH-APIKEY': apiKey,
        'X-AUTH-SIGNATURE': signature,
        'Content-Type': 'application/json'
      }
    });

    return {
      orderId: response.data.id.toString(),
      status: response.data.status,
      executedQty: parseFloat(response.data.quantity || 0),
      executedPrice: parseFloat(response.data.price || 0),
      side: response.data.side,
      symbol: response.data.market,
      timestamp: response.data.created_at,
      commission: 0,
      commissionAsset: 'USDT'
    };
  }

  async getBalance(apiKey, secretKey) {
    const timestamp = Date.now();
    const body = { timestamp };
    const payload = JSON.stringify(body);
    const signature = crypto
      .createHmac('sha256', secretKey)
      .update(payload)
      .digest('hex');

    const url = `${this.baseUrl}/users/balances`;

    const response = await axios.post(url, body, {
      headers: {
        'X-AUTH-APIKEY': apiKey,
        'X-AUTH-SIGNATURE': signature,
        'Content-Type': 'application/json'
      }
    });

    return response.data
      .filter(balance => parseFloat(balance.balance) > 0)
      .map(balance => ({
        asset: balance.currency,
        free: parseFloat(balance.balance),
        locked: 0,
        total: parseFloat(balance.balance)
      }));
  }

  async getOrderStatus(orderId, symbol, apiKey, secretKey) {
    const timestamp = Date.now();
    const body = {
      id: orderId,
      timestamp: timestamp
    };

    const payload = JSON.stringify(body);
    const signature = crypto
      .createHmac('sha256', secretKey)
      .update(payload)
      .digest('hex');

    const url = `${this.baseUrl}/orders/status`;

    const response = await axios.post(url, body, {
      headers: {
        'X-AUTH-APIKEY': apiKey,
        'X-AUTH-SIGNATURE': signature,
        'Content-Type': 'application/json'
      }
    });

    return {
      orderId: response.data.id.toString(),
      status: response.data.status,
      executedQty: parseFloat(response.data.quantity || 0),
      executedPrice: parseFloat(response.data.price || 0),
      side: response.data.side,
      symbol: response.data.market,
      timestamp: response.data.created_at
    };
  }

  async cancelOrder(orderId, symbol, apiKey, secretKey) {
    const timestamp = Date.now();
    const body = {
      id: orderId,
      timestamp: timestamp
    };

    const payload = JSON.stringify(body);
    const signature = crypto
      .createHmac('sha256', secretKey)
      .update(payload)
      .digest('hex');

    const url = `${this.baseUrl}/orders/cancel`;

    const response = await axios.post(url, body, {
      headers: {
        'X-AUTH-APIKEY': apiKey,
        'X-AUTH-SIGNATURE': signature,
        'Content-Type': 'application/json'
      }
    });

    return {
      orderId: response.data.id.toString(),
      status: response.data.status,
      symbol: response.data.market
    };
  }
}

// Delta Exchange Implementation (placeholder)
class DeltaExchange {
  async executeTrade(_tradeData) {
    throw new Error('Delta Exchange integration not implemented yet');
  }

  async getBalance(_apiKey, _secretKey) {
    throw new Error('Delta Exchange integration not implemented yet');
  }

  async getOrderStatus(_orderId, _symbol, _apiKey, _secretKey) {
    throw new Error('Delta Exchange integration not implemented yet');
  }

  async cancelOrder(_orderId, _symbol, _apiKey, _secretKey) {
    throw new Error('Delta Exchange integration not implemented yet');
  }
}

// Coinbase Exchange Implementation (placeholder)
class CoinbaseExchange {
  async executeTrade(_tradeData) {
    throw new Error('Coinbase Exchange integration not implemented yet');
  }

  async getBalance(_apiKey, _secretKey) {
    throw new Error('Coinbase Exchange integration not implemented yet');
  }

  async getOrderStatus(_orderId, _symbol, _apiKey, _secretKey) {
    throw new Error('Coinbase Exchange integration not implemented yet');
  }

  async cancelOrder(_orderId, _symbol, _apiKey, _secretKey) {
    throw new Error('Coinbase Exchange integration not implemented yet');
  }
}

module.exports = new ExchangeService();
