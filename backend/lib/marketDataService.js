// =============================================================================
// Real Market Data Service - Production Ready
// =============================================================================
// Comprehensive market data integration with real exchange APIs

const axios = require('axios');
const WebSocket = require('ws');
const { logger } = require('./logging');

class MarketDataService {
  constructor() {
    this.exchanges = {
      binance: {
        baseUrl: 'https://api.binance.com',
        wsUrl: 'wss://stream.binance.com:9443/ws',
        rateLimit: 1200, // requests per minute
        lastRequest: 0
      },
      wazirx: {
        baseUrl: 'https://api.wazirx.com/api/v2',
        rateLimit: 100,
        lastRequest: 0
      },
      coindcx: {
        baseUrl: 'https://api.coindcx.com/exchange/v1',
        rateLimit: 100,
        lastRequest: 0
      }
    };
    
    this.wsConnections = new Map();
    this.priceData = new Map();
    this.klineData = new Map();
    this.orderBookData = new Map();
    this.subscribers = new Map();
    
    this.startDataCollection();
  }

  // Rate limiting helper
  async rateLimit(exchange) {
    const config = this.exchanges[exchange];
    if (!config) return;
    
    const now = Date.now();
    const timeSinceLastRequest = now - config.lastRequest;
    const minInterval = 60000 / config.rateLimit; // Convert to milliseconds
    
    if (timeSinceLastRequest < minInterval) {
      await new Promise(resolve => setTimeout(resolve, minInterval - timeSinceLastRequest));
    }
    
    config.lastRequest = Date.now();
  }

  // Fetch real-time ticker data
  async getTickerData(exchange, symbol) {
    try {
      await this.rateLimit(exchange);
      
      let url, response;
      
      switch (exchange) {
        case 'binance':
          url = `${this.exchanges.binance.baseUrl}/api/v3/ticker/24hr?symbol=${symbol}`;
          response = await axios.get(url);
          return this.parseBinanceTicker(response.data);
          
        case 'wazirx':
          url = `${this.exchanges.wazirx.baseUrl}/ticker/24hr`;
          response = await axios.get(url);
          const wazirxData = response.data.find(item => item.symbol === symbol);
          return wazirxData ? this.parseWazirxTicker(wazirxData) : null;
          
        case 'coindcx':
          url = `${this.exchanges.coindcx.baseUrl}/ticker`;
          response = await axios.get(url);
          const coindcxData = response.data.find(item => item.market === symbol);
          return coindcxData ? this.parseCoindcxTicker(coindcxData) : null;
          
        default:
          throw new Error(`Unsupported exchange: ${exchange}`);
      }
    } catch (error) {
      logger.error(`Failed to fetch ticker data from ${exchange}:`, error);
      throw error;
    }
  }

  // Fetch kline/candlestick data
  async getKlineData(exchange, symbol, interval = '1m', limit = 100) {
    try {
      await this.rateLimit(exchange);
      
      let url, response;
      
      switch (exchange) {
        case 'binance':
          url = `${this.exchanges.binance.baseUrl}/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
          response = await axios.get(url);
          return this.parseBinanceKlines(response.data, symbol, interval);
          
        case 'wazirx':
          // WazirX doesn't have kline API, use ticker data
          const ticker = await this.getTickerData('wazirx', symbol);
          return ticker ? [this.createKlineFromTicker(ticker, interval)] : [];
          
        case 'coindcx':
          url = `${this.exchanges.coindcx.baseUrl}/candles?market=${symbol}&interval=${interval}&limit=${limit}`;
          response = await axios.get(url);
          return this.parseCoindcxKlines(response.data, symbol, interval);
          
        default:
          throw new Error(`Unsupported exchange: ${exchange}`);
      }
    } catch (error) {
      logger.error(`Failed to fetch kline data from ${exchange}:`, error);
      throw error;
    }
  }

  // Fetch order book data
  async getOrderBookData(exchange, symbol, limit = 100) {
    try {
      await this.rateLimit(exchange);
      
      let url, response;
      
      switch (exchange) {
        case 'binance':
          url = `${this.exchanges.binance.baseUrl}/api/v3/depth?symbol=${symbol}&limit=${limit}`;
          response = await axios.get(url);
          return this.parseBinanceOrderBook(response.data);
          
        case 'wazirx':
          url = `${this.exchanges.wazirx.baseUrl}/depth?symbol=${symbol}`;
          response = await axios.get(url);
          return this.parseWazirxOrderBook(response.data);
          
        case 'coindcx':
          url = `${this.exchanges.coindcx.baseUrl}/orderbook?market=${symbol}`;
          response = await axios.get(url);
          return this.parseCoindcxOrderBook(response.data);
          
        default:
          throw new Error(`Unsupported exchange: ${exchange}`);
      }
    } catch (error) {
      logger.error(`Failed to fetch order book data from ${exchange}:`, error);
      throw error;
    }
  }

  // Start WebSocket connections for real-time data
  startWebSocketConnections(symbols = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT']) {
    // Binance WebSocket
    this.startBinanceWebSocket(symbols);
    
    // Add other exchange WebSockets as needed
  }

  startBinanceWebSocket(symbols) {
    const streams = symbols.map(symbol => `${symbol.toLowerCase()}@ticker`).join('/');
    const wsUrl = `${this.exchanges.binance.wsUrl}/${streams}`;
    
    const ws = new WebSocket(wsUrl);
    
    ws.on('open', () => {
      logger.info('Binance WebSocket connected');
    });
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        this.handleBinanceTickerUpdate(message);
      } catch (error) {
        logger.error('Error parsing WebSocket message:', error);
      }
    });
    
    ws.on('error', (error) => {
      logger.error('Binance WebSocket error:', error);
    });
    
    ws.on('close', () => {
      logger.info('Binance WebSocket disconnected, reconnecting...');
      setTimeout(() => this.startBinanceWebSocket(symbols), 5000);
    });
    
    this.wsConnections.set('binance', ws);
  }

  handleBinanceTickerUpdate(data) {
    const ticker = this.parseBinanceTicker(data);
    this.priceData.set(ticker.symbol, ticker);
    
    // Notify subscribers
    this.notifySubscribers('ticker', ticker);
  }

  // Parse exchange-specific data formats
  parseBinanceTicker(data) {
    return {
      symbol: data.symbol,
      price: parseFloat(data.lastPrice),
      priceChange: parseFloat(data.priceChange),
      priceChangePercent: parseFloat(data.priceChangePercent),
      high: parseFloat(data.highPrice),
      low: parseFloat(data.lowPrice),
      volume: parseFloat(data.volume),
      quoteVolume: parseFloat(data.quoteVolume),
      open: parseFloat(data.openPrice),
      close: parseFloat(data.lastPrice),
      bid: parseFloat(data.bidPrice),
      ask: parseFloat(data.askPrice),
      spread: parseFloat(data.askPrice) - parseFloat(data.bidPrice),
      timestamp: data.closeTime || Date.now(),
      exchange: 'binance'
    };
  }

  parseWazirxTicker(data) {
    return {
      symbol: data.symbol,
      price: parseFloat(data.lastPrice),
      priceChange: parseFloat(data.priceChange),
      priceChangePercent: parseFloat(data.priceChangePercent),
      high: parseFloat(data.highPrice),
      low: parseFloat(data.lowPrice),
      volume: parseFloat(data.volume),
      quoteVolume: parseFloat(data.quoteVolume),
      open: parseFloat(data.openPrice),
      close: parseFloat(data.lastPrice),
      bid: parseFloat(data.bidPrice),
      ask: parseFloat(data.askPrice),
      spread: parseFloat(data.askPrice) - parseFloat(data.bidPrice),
      timestamp: Date.now(),
      exchange: 'wazirx'
    };
  }

  parseCoindcxTicker(data) {
    return {
      symbol: data.market,
      price: parseFloat(data.last_price),
      priceChange: parseFloat(data.change),
      priceChangePercent: parseFloat(data.change_percent),
      high: parseFloat(data.high),
      low: parseFloat(data.low),
      volume: parseFloat(data.volume),
      quoteVolume: parseFloat(data.volume) * parseFloat(data.last_price),
      open: parseFloat(data.open),
      close: parseFloat(data.last_price),
      bid: parseFloat(data.bid),
      ask: parseFloat(data.ask),
      spread: parseFloat(data.ask) - parseFloat(data.bid),
      timestamp: Date.now(),
      exchange: 'coindcx'
    };
  }

  parseBinanceKlines(data, symbol, interval) {
    return data.map(kline => ({
      symbol,
      interval,
      openTime: kline[0],
      closeTime: kline[6],
      open: parseFloat(kline[1]),
      high: parseFloat(kline[2]),
      low: parseFloat(kline[3]),
      close: parseFloat(kline[4]),
      volume: parseFloat(kline[5]),
      quoteVolume: parseFloat(kline[7]),
      trades: kline[8],
      takerBuyBaseVolume: parseFloat(kline[9]),
      takerBuyQuoteVolume: parseFloat(kline[10]),
      ignore: kline[11]
    }));
  }

  parseWazirxOrderBook(data) {
    return {
      symbol: data.symbol,
      bids: data.bids.map(bid => [parseFloat(bid[0]), parseFloat(bid[1])]),
      asks: data.asks.map(ask => [parseFloat(ask[0]), parseFloat(ask[1])]),
      timestamp: Date.now()
    };
  }

  parseBinanceOrderBook(data) {
    return {
      symbol: data.symbol,
      bids: data.bids.map(bid => [parseFloat(bid[0]), parseFloat(bid[1])]),
      asks: data.asks.map(ask => [parseFloat(ask[0]), parseFloat(ask[1])]),
      timestamp: data.lastUpdateId
    };
  }

  parseCoindcxOrderBook(data) {
    return {
      symbol: data.market,
      bids: data.bids.map(bid => [parseFloat(bid[0]), parseFloat(bid[1])]),
      asks: data.asks.map(ask => [parseFloat(ask[0]), parseFloat(ask[1])]),
      timestamp: Date.now()
    };
  }

  // Start continuous data collection
  startDataCollection() {
    // Collect ticker data every 5 seconds
    setInterval(async () => {
      try {
        const symbols = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'ADAUSDT', 'XRPUSDT'];
        
        for (const symbol of symbols) {
          for (const exchange of Object.keys(this.exchanges)) {
            try {
              const ticker = await this.getTickerData(exchange, symbol);
              if (ticker) {
                this.priceData.set(`${exchange}_${symbol}`, ticker);
              }
            } catch (error) {
              logger.error(`Failed to fetch ${symbol} from ${exchange}:`, error);
            }
          }
        }
      } catch (error) {
        logger.error('Data collection error:', error);
      }
    }, 5000);

    // Start WebSocket connections
    this.startWebSocketConnections();
  }

  // Subscribe to real-time updates
  subscribe(type, symbol, callback) {
    const key = `${type}_${symbol}`;
    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, []);
    }
    this.subscribers.get(key).push(callback);
  }

  // Notify subscribers
  notifySubscribers(type, data) {
    const key = `${type}_${data.symbol}`;
    const subscribers = this.subscribers.get(key) || [];
    subscribers.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        logger.error('Subscriber callback error:', error);
      }
    });
  }

  // Get current price data
  getCurrentPrice(symbol, exchange = 'binance') {
    return this.priceData.get(`${exchange}_${symbol}`) || this.priceData.get(symbol);
  }

  // Get all price data
  getAllPrices() {
    return Array.from(this.priceData.values());
  }

  // Calculate technical indicators
  calculateRSI(prices, period = 14) {
    if (prices.length < period + 1) return null;
    
    let gains = 0;
    let losses = 0;
    
    for (let i = 1; i <= period; i++) {
      const change = prices[i] - prices[i - 1];
      if (change > 0) gains += change;
      else losses -= change;
    }
    
    const avgGain = gains / period;
    const avgLoss = losses / period;
    
    if (avgLoss === 0) return 100;
    
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  calculateMACD(prices, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
    if (prices.length < slowPeriod) return null;
    
    const emaFast = this.calculateEMA(prices, fastPeriod);
    const emaSlow = this.calculateEMA(prices, slowPeriod);
    
    if (!emaFast || !emaSlow) return null;
    
    const macdLine = emaFast - emaSlow;
    // For simplicity, we'll use a basic signal line calculation
    const signalLine = macdLine * 0.9; // Simplified signal line
    const histogram = macdLine - signalLine;
    
    return {
      macd: macdLine,
      signal: signalLine,
      histogram: histogram
    };
  }

  calculateEMA(prices, period) {
    if (prices.length < period) return null;
    
    const multiplier = 2 / (period + 1);
    let ema = prices[0];
    
    for (let i = 1; i < prices.length; i++) {
      ema = (prices[i] * multiplier) + (ema * (1 - multiplier));
    }
    
    return ema;
  }

  calculateBollingerBands(prices, period = 20, stdDev = 2) {
    if (prices.length < period) return null;
    
    const recentPrices = prices.slice(-period);
    const sma = recentPrices.reduce((sum, price) => sum + price, 0) / period;
    
    const variance = recentPrices.reduce((sum, price) => sum + Math.pow(price - sma, 2), 0) / period;
    const standardDeviation = Math.sqrt(variance);
    
    return {
      upper: sma + (stdDev * standardDeviation),
      middle: sma,
      lower: sma - (stdDev * standardDeviation)
    };
  }
}

// Export singleton instance
module.exports = new MarketDataService();
