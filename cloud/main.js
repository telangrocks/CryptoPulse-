// Back4App Cloud Functions for CryptoPulse Trading Bot
const Parse = require('parse/node');
const https = require('https');
const crypto = require('crypto');

// Initialize Parse with Back4App configuration
Parse.initialize(
  process.env.APP_ID || 'your-app-id',
  process.env.JAVASCRIPT_KEY || 'your-javascript-key',
  process.env.MASTER_KEY || 'your-master-key'
);
Parse.serverURL = process.env.SERVER_URL || 'https://parseapi.back4app.com/';

// External API Configuration
const BINANCE_API_URL = 'https://api.binance.com/api/v3';
const COINBASE_API_URL = 'https://api.exchange.coinbase.com';
const ALPHA_VANTAGE_API_URL = 'https://www.alphavantage.co/query';

// Rate limiting and caching
const rateLimitMap = new Map();
const cacheMap = new Map();
const CACHE_TTL = 60000; // 1 minute cache
const RATE_LIMIT_WINDOW = 60000; // 1 minute window
const MAX_REQUESTS_PER_WINDOW = 100;

// Trading Bot Cloud Function
Parse.Cloud.define('tradingBot', async (request) => {
  try {
    const { action, pair, amount, strategy } = request.params;
    
    // Validate user authentication
    if (!request.user) {
      throw new Error('User not authenticated');
    }
    
    // Trading bot logic
    const result = await executeTradingStrategy({
      action,
      pair,
      amount,
      strategy,
      userId: request.user.id
    });
    
    return {
      success: true,
      result,
      timestamp: new Date()
    };
  } catch (error) {
    throw new Parse.Error(Parse.Error.SCRIPT_FAILED, error.message);
  }
});

// Market Analysis Cloud Function
Parse.Cloud.define('marketAnalysis', async (request) => {
  try {
    const { pair, timeframe } = request.params;
    
    // Fetch market data
    const marketData = await fetchMarketData(pair, timeframe);
    
    // Perform technical analysis
    const analysis = await performTechnicalAnalysis(marketData);
    
    // Generate trading signals
    const signals = await generateTradingSignals(analysis);
    
    return {
      success: true,
      data: {
        pair,
        timeframe,
        analysis,
        signals,
        timestamp: new Date()
      }
    };
  } catch (error) {
    throw new Parse.Error(Parse.Error.SCRIPT_FAILED, error.message);
  }
});

// User Authentication Cloud Function
Parse.Cloud.define('userAuthentication', async (request) => {
  try {
    const { email, password, action } = request.params;
    
    if (action === 'login') {
      const user = await Parse.User.logIn(email, password);
      return {
        success: true,
        user: {
          id: user.id,
          email: user.get('email'),
          username: user.get('username'),
          sessionToken: user.getSessionToken()
        }
      };
    } else if (action === 'register') {
      const user = new Parse.User();
      user.set('username', email);
      user.set('email', email);
      user.set('password', password);
      
      const result = await user.signUp();
      return {
        success: true,
        user: {
          id: result.id,
          email: result.get('email'),
          username: result.get('username')
        }
      };
    }
  } catch (error) {
    throw new Parse.Error(Parse.Error.SCRIPT_FAILED, error.message);
  }
});

// Portfolio Management Cloud Function
Parse.Cloud.define('portfolioManagement', async (request) => {
  try {
    if (!request.user) {
      throw new Error('User not authenticated');
    }
    
    const { action, data } = request.params;
    
    const Portfolio = Parse.Object.extend('Portfolio');
    const query = new Parse.Query(Portfolio);
    query.equalTo('userId', request.user.id);
    
    if (action === 'get') {
      const portfolios = await query.find();
      return {
        success: true,
        portfolios: portfolios.map(p => ({
          id: p.id,
          name: p.get('name'),
          balance: p.get('balance'),
          assets: p.get('assets'),
          createdAt: p.createdAt
        }))
      };
    } else if (action === 'create') {
      const portfolio = new Portfolio();
      portfolio.set('userId', request.user.id);
      portfolio.set('name', data.name);
      portfolio.set('balance', data.balance || 0);
      portfolio.set('assets', data.assets || []);
      
      const result = await portfolio.save();
      return {
        success: true,
        portfolio: {
          id: result.id,
          name: result.get('name'),
          balance: result.get('balance'),
          assets: result.get('assets')
        }
      };
    }
  } catch (error) {
    throw new Parse.Error(Parse.Error.SCRIPT_FAILED, error.message);
  }
});

// Risk Assessment Cloud Function
Parse.Cloud.define('riskAssessment', async (request) => {
  try {
    const { portfolio, marketData } = request.params;
    
    // Calculate portfolio risk metrics
    const riskMetrics = await calculateRiskMetrics(portfolio, marketData);
    
    // Generate risk recommendations
    const recommendations = await generateRiskRecommendations(riskMetrics);
    
    return {
      success: true,
      riskMetrics,
      recommendations,
      timestamp: new Date()
    };
  } catch (error) {
    throw new Parse.Error(Parse.Error.SCRIPT_FAILED, error.message);
  }
});

// Get Current Price Cloud Function
Parse.Cloud.define('getCurrentPrice', async (request) => {
  try {
    const { pair } = request.params;
    
    if (!pair) {
      throw new Error('Pair parameter is required');
    }
    
    const priceData = await fetchCurrentPrice(pair);
    
    return {
      success: true,
      data: priceData
    };
  } catch (error) {
    throw new Parse.Error(Parse.Error.SCRIPT_FAILED, error.message);
  }
});

// Get Market Data Cloud Function
Parse.Cloud.define('getMarketData', async (request) => {
  try {
    const { pair, timeframe } = request.params;
    
    if (!pair) {
      throw new Error('Pair parameter is required');
    }
    
    const marketData = await fetchMarketData(pair, timeframe || '1h');
    
    return {
      success: true,
      data: marketData
    };
  } catch (error) {
    throw new Parse.Error(Parse.Error.SCRIPT_FAILED, error.message);
  }
});

// Get Trading Signals Cloud Function
Parse.Cloud.define('getTradingSignals', async (request) => {
  try {
    const { pair, timeframe } = request.params;
    
    if (!pair) {
      throw new Error('Pair parameter is required');
    }
    
    // Get market data and perform analysis
    const marketData = await fetchMarketData(pair, timeframe || '1h');
    const analysis = await performTechnicalAnalysis(marketData);
    const signals = await generateTradingSignals(analysis);
    
    return {
      success: true,
      data: {
        pair,
        timeframe: timeframe || '1h',
        analysis,
        signals,
        timestamp: new Date()
      }
    };
  } catch (error) {
    throw new Parse.Error(Parse.Error.SCRIPT_FAILED, error.message);
  }
});

// Get Order History Cloud Function
Parse.Cloud.define('getOrderHistory', async (request) => {
  try {
    if (!request.user) {
      throw new Error('User not authenticated');
    }
    
    const { limit = 50, offset = 0, status } = request.params;
    
    const Order = Parse.Object.extend('Order');
    const query = new Parse.Query(Order);
    query.equalTo('userId', request.user.id);
    query.descending('createdAt');
    query.limit(limit);
    query.skip(offset);
    
    if (status) {
      query.equalTo('status', status);
    }
    
    const orders = await query.find();
    
    return {
      success: true,
      orders: orders.map(order => ({
        id: order.id,
        pair: order.get('pair'),
        action: order.get('action'),
        amount: order.get('amount'),
        price: order.get('price'),
        status: order.get('status'),
        confidence: order.get('confidence'),
        riskLevel: order.get('riskLevel'),
        createdAt: order.createdAt,
        executedAt: order.get('executedAt')
      })),
      total: orders.length
    };
  } catch (error) {
    throw new Parse.Error(Parse.Error.SCRIPT_FAILED, error.message);
  }
});

// Get Portfolio Performance Cloud Function
Parse.Cloud.define('getPortfolioPerformance', async (request) => {
  try {
    if (!request.user) {
      throw new Error('User not authenticated');
    }
    
    const Portfolio = Parse.Object.extend('Portfolio');
    const query = new Parse.Query(Portfolio);
    query.equalTo('userId', request.user.id);
    
    const portfolios = await query.find();
    
    if (portfolios.length === 0) {
      return {
        success: true,
        data: {
          totalValue: 0,
          totalReturn: 0,
          totalReturnPercentage: 0,
          portfolios: []
        }
      };
    }
    
    let totalValue = 0;
    let totalCost = 0;
    const portfolioData = [];
    
    for (const portfolio of portfolios) {
      const assets = portfolio.get('assets') || [];
      let portfolioValue = 0;
      let portfolioCost = 0;
      
      for (const asset of assets) {
        try {
          const currentPrice = await fetchCurrentPrice(asset.pair);
          const currentValue = asset.amount * currentPrice.price;
          portfolioValue += currentValue;
          portfolioCost += asset.cost || 0;
        } catch (error) {
          console.error(`Error fetching price for ${asset.pair}:`, error);
        }
      }
      
      const returnValue = portfolioValue - portfolioCost;
      const returnPercentage = portfolioCost > 0 ? (returnValue / portfolioCost) * 100 : 0;
      
      portfolioData.push({
        id: portfolio.id,
        name: portfolio.get('name'),
        value: portfolioValue,
        cost: portfolioCost,
        return: returnValue,
        returnPercentage: returnPercentage,
        assets: assets.length
      });
      
      totalValue += portfolioValue;
      totalCost += portfolioCost;
    }
    
    const totalReturn = totalValue - totalCost;
    const totalReturnPercentage = totalCost > 0 ? (totalReturn / totalCost) * 100 : 0;
    
    return {
      success: true,
      data: {
        totalValue,
        totalCost,
        totalReturn,
        totalReturnPercentage,
        portfolios: portfolioData
      }
    };
  } catch (error) {
    throw new Parse.Error(Parse.Error.SCRIPT_FAILED, error.message);
  }
});

// Accept Disclaimer Cloud Function
Parse.Cloud.define('acceptDisclaimer', async (request) => {
  try {
    if (!request.user) {
      throw new Error('User not authenticated');
    }
    
    // Update user with disclaimer acceptance
    request.user.set('disclaimerAccepted', true);
    request.user.set('disclaimerAcceptedAt', new Date());
    await request.user.save();
    
    return {
      success: true,
      message: 'Disclaimer accepted successfully'
    };
  } catch (error) {
    throw new Parse.Error(Parse.Error.SCRIPT_FAILED, error.message);
  }
});

// Get Disclaimer Status Cloud Function
Parse.Cloud.define('getDisclaimerStatus', async (request) => {
  try {
    if (!request.user) {
      throw new Error('User not authenticated');
    }
    
    const accepted = request.user.get('disclaimerAccepted') || false;
    const acceptedAt = request.user.get('disclaimerAcceptedAt');
    
    return {
      success: true,
      result: {
        accepted,
        acceptedAt
      }
    };
  } catch (error) {
    throw new Parse.Error(Parse.Error.SCRIPT_FAILED, error.message);
  }
});

// ========================================
// PRODUCTION-READY HELPER FUNCTIONS
// ========================================

// Rate limiting utility
function checkRateLimit(identifier) {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW;
  
  if (!rateLimitMap.has(identifier)) {
    rateLimitMap.set(identifier, []);
  }
  
  const requests = rateLimitMap.get(identifier);
  const validRequests = requests.filter(time => time > windowStart);
  
  if (validRequests.length >= MAX_REQUESTS_PER_WINDOW) {
    throw new Error('Rate limit exceeded. Please try again later.');
  }
  
  validRequests.push(now);
  rateLimitMap.set(identifier, validRequests);
}

// Cache utility
function getCachedData(key) {
  const cached = cacheMap.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  return null;
}

function setCachedData(key, data) {
  cacheMap.set(key, {
    data,
    timestamp: Date.now()
  });
}

// HTTP request utility
function makeHttpRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve(jsonData);
        } catch (e) {
          resolve(data);
        }
      });
    });
    
    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

// Real market data fetching from Binance
async function fetchMarketData(pair, timeframe = '1h') {
  try {
    const cacheKey = `market_data_${pair}_${timeframe}`;
    const cached = getCachedData(cacheKey);
    if (cached) return cached;
    
    checkRateLimit('market_data');
    
    const symbol = pair.replace('/', '');
    const interval = timeframe === '1h' ? '1h' : timeframe === '1d' ? '1d' : '1h';
    const limit = 100;
    
    const url = `${BINANCE_API_URL}/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
    
    const klines = await makeHttpRequest(url);
    
    if (!Array.isArray(klines)) {
      throw new Error('Invalid market data response');
    }
    
    const marketData = {
      pair,
      timeframe,
      data: klines.map(k => ({
        timestamp: k[0],
        open: parseFloat(k[1]),
        high: parseFloat(k[2]),
        low: parseFloat(k[3]),
        close: parseFloat(k[4]),
        volume: parseFloat(k[5]),
        closeTime: k[6],
        quoteVolume: parseFloat(k[7]),
        trades: k[8],
        takerBuyBaseVolume: parseFloat(k[9]),
        takerBuyQuoteVolume: parseFloat(k[10])
      })),
      lastUpdate: new Date()
    };
    
    setCachedData(cacheKey, marketData);
    return marketData;
    
  } catch (error) {
    console.error('Error fetching market data:', error);
    throw new Error(`Failed to fetch market data: ${error.message}`);
  }
}

// Real-time price fetching
async function fetchCurrentPrice(pair) {
  try {
    const cacheKey = `current_price_${pair}`;
    const cached = getCachedData(cacheKey);
    if (cached) return cached;
    
    checkRateLimit('current_price');
    
    const symbol = pair.replace('/', '');
    const url = `${BINANCE_API_URL}/ticker/price?symbol=${symbol}`;
    
    const priceData = await makeHttpRequest(url);
    
    const result = {
      pair,
      price: parseFloat(priceData.price),
      timestamp: new Date()
    };
    
    setCachedData(cacheKey, result);
    return result;
    
  } catch (error) {
    console.error('Error fetching current price:', error);
    throw new Error(`Failed to fetch current price: ${error.message}`);
  }
}

// Technical Analysis Functions
function calculateSMA(prices, period) {
  if (prices.length < period) return null;
  const sum = prices.slice(-period).reduce((a, b) => a + b, 0);
  return sum / period;
}

function calculateEMA(prices, period) {
  if (prices.length < period) return null;
  const multiplier = 2 / (period + 1);
  let ema = prices[0];
  
  for (let i = 1; i < prices.length; i++) {
    ema = (prices[i] * multiplier) + (ema * (1 - multiplier));
  }
  
  return ema;
}

function calculateRSI(prices, period = 14) {
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

function calculateMACD(prices, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
  if (prices.length < slowPeriod) return null;
  
  const fastEMA = calculateEMA(prices, fastPeriod);
  const slowEMA = calculateEMA(prices, slowPeriod);
  
  if (!fastEMA || !slowEMA) return null;
  
  const macdLine = fastEMA - slowEMA;
  
  // For signal line, we'd need historical MACD values
  // This is a simplified version
  return {
    macd: macdLine,
    signal: macdLine * 0.9, // Simplified signal line
    histogram: macdLine - (macdLine * 0.9)
  };
}

function calculateBollingerBands(prices, period = 20, stdDev = 2) {
  if (prices.length < period) return null;
  
  const sma = calculateSMA(prices, period);
  if (!sma) return null;
  
  const recentPrices = prices.slice(-period);
  const variance = recentPrices.reduce((sum, price) => sum + Math.pow(price - sma, 2), 0) / period;
  const standardDeviation = Math.sqrt(variance);
  
  return {
    upper: sma + (stdDev * standardDeviation),
    middle: sma,
    lower: sma - (stdDev * standardDeviation)
  };
}

// Real technical analysis implementation
async function performTechnicalAnalysis(marketData) {
  try {
    const prices = marketData.data.map(d => d.close);
    const highs = marketData.data.map(d => d.high);
    const lows = marketData.data.map(d => d.low);
    const volumes = marketData.data.map(d => d.volume);
    
    const analysis = {
      pair: marketData.pair,
      timeframe: marketData.timeframe,
      currentPrice: prices[prices.length - 1],
      sma20: calculateSMA(prices, 20),
      sma50: calculateSMA(prices, 50),
      sma200: calculateSMA(prices, 200),
      ema12: calculateEMA(prices, 12),
      ema26: calculateEMA(prices, 26),
      rsi: calculateRSI(prices, 14),
      macd: calculateMACD(prices),
      bollingerBands: calculateBollingerBands(prices, 20, 2),
      volume: {
        current: volumes[volumes.length - 1],
        average: volumes.reduce((a, b) => a + b, 0) / volumes.length,
        trend: volumes[volumes.length - 1] > volumes[volumes.length - 2] ? 'increasing' : 'decreasing'
      },
      priceChange: {
        absolute: prices[prices.length - 1] - prices[0],
        percentage: ((prices[prices.length - 1] - prices[0]) / prices[0]) * 100
      },
      volatility: calculateVolatility(prices),
      support: Math.min(...lows.slice(-20)),
      resistance: Math.max(...highs.slice(-20)),
      timestamp: new Date()
    };
    
    return analysis;
    
  } catch (error) {
    console.error('Error in technical analysis:', error);
    throw new Error(`Technical analysis failed: ${error.message}`);
  }
}

function calculateVolatility(prices) {
  if (prices.length < 2) return 0;
  
  const returns = [];
  for (let i = 1; i < prices.length; i++) {
    returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
  }
  
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length;
  
  return Math.sqrt(variance) * Math.sqrt(252); // Annualized volatility
}

// Advanced trading signal generation
async function generateTradingSignals(analysis) {
  try {
    const signals = {
      buy: false,
      sell: false,
      hold: true,
      confidence: 0.5,
      reasons: [],
      riskLevel: 'medium',
      stopLoss: null,
      takeProfit: null
    };
    
    let score = 0;
    const maxScore = 10;
    
    // RSI Analysis
    if (analysis.rsi < 30) {
      score += 2;
      signals.reasons.push('RSI indicates oversold condition');
    } else if (analysis.rsi > 70) {
      score -= 2;
      signals.reasons.push('RSI indicates overbought condition');
    }
    
    // Moving Average Analysis
    if (analysis.sma20 > analysis.sma50 && analysis.sma50 > analysis.sma200) {
      score += 2;
      signals.reasons.push('Bullish moving average alignment');
    } else if (analysis.sma20 < analysis.sma50 && analysis.sma50 < analysis.sma200) {
      score -= 2;
      signals.reasons.push('Bearish moving average alignment');
    }
    
    // MACD Analysis
    if (analysis.macd && analysis.macd.macd > analysis.macd.signal) {
      score += 1;
      signals.reasons.push('MACD bullish crossover');
    } else if (analysis.macd && analysis.macd.macd < analysis.macd.signal) {
      score -= 1;
      signals.reasons.push('MACD bearish crossover');
    }
    
    // Bollinger Bands Analysis
    if (analysis.bollingerBands) {
      if (analysis.currentPrice < analysis.bollingerBands.lower) {
        score += 1.5;
        signals.reasons.push('Price below lower Bollinger Band (oversold)');
      } else if (analysis.currentPrice > analysis.bollingerBands.upper) {
        score -= 1.5;
        signals.reasons.push('Price above upper Bollinger Band (overbought)');
      }
    }
    
    // Volume Analysis
    if (analysis.volume.trend === 'increasing') {
      score += 1;
      signals.reasons.push('Increasing volume confirms trend');
    } else if (analysis.volume.trend === 'decreasing') {
      score -= 0.5;
      signals.reasons.push('Decreasing volume weakens signal');
    }
    
    // Price momentum
    if (analysis.priceChange.percentage > 2) {
      score += 1;
      signals.reasons.push('Strong positive momentum');
    } else if (analysis.priceChange.percentage < -2) {
      score -= 1;
      signals.reasons.push('Strong negative momentum');
    }
    
    // Volatility consideration
    if (analysis.volatility > 0.3) {
      score -= 0.5;
      signals.reasons.push('High volatility increases risk');
    }
    
    // Determine signal based on score
    signals.confidence = Math.abs(score) / maxScore;
    
    if (score >= 3) {
      signals.buy = true;
      signals.hold = false;
      signals.riskLevel = analysis.volatility > 0.2 ? 'high' : 'medium';
      signals.stopLoss = analysis.currentPrice * 0.95; // 5% stop loss
      signals.takeProfit = analysis.currentPrice * 1.15; // 15% take profit
    } else if (score <= -3) {
      signals.sell = true;
      signals.hold = false;
      signals.riskLevel = analysis.volatility > 0.2 ? 'high' : 'medium';
      signals.stopLoss = analysis.currentPrice * 1.05; // 5% stop loss for short
      signals.takeProfit = analysis.currentPrice * 0.85; // 15% take profit for short
    }
    
    return signals;
    
  } catch (error) {
    console.error('Error generating trading signals:', error);
    throw new Error(`Signal generation failed: ${error.message}`);
  }
}

// Real trading strategy execution
async function executeTradingStrategy(params) {
  try {
    const { action, pair, amount, strategy, userId } = params;
    
    // Validate parameters
    if (!action || !pair || !amount || !strategy) {
      throw new Error('Missing required parameters');
    }
    
    if (!['BUY', 'SELL'].includes(action)) {
      throw new Error('Invalid action. Must be BUY or SELL');
    }
    
    if (amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }
    
    // Get current market data
    const marketData = await fetchMarketData(pair, '1h');
    const currentPrice = await fetchCurrentPrice(pair);
    
    // Perform technical analysis
    const analysis = await performTechnicalAnalysis(marketData);
    const signals = await generateTradingSignals(analysis);
    
    // Check if signal aligns with action
    const signalAlignment = (action === 'BUY' && signals.buy) || (action === 'SELL' && signals.sell);
    
    if (!signalAlignment && signals.confidence > 0.3) {
      return {
        orderId: `order_${Date.now()}`,
        status: 'rejected',
        reason: 'Signal analysis does not support this action',
        analysis,
        signals,
        recommendedAction: signals.buy ? 'BUY' : signals.sell ? 'SELL' : 'HOLD'
      };
    }
    
    // Calculate order details
    const orderValue = amount * currentPrice.price;
    const fees = orderValue * 0.001; // 0.1% fee
    const totalCost = orderValue + fees;
    
    // Create order record
    const Order = Parse.Object.extend('Order');
    const order = new Order();
    order.set('userId', userId);
    order.set('pair', pair);
    order.set('action', action);
    order.set('amount', amount);
    order.set('price', currentPrice.price);
    order.set('orderValue', orderValue);
    order.set('fees', fees);
    order.set('totalCost', totalCost);
    order.set('strategy', strategy);
    order.set('status', 'pending');
    order.set('confidence', signals.confidence);
    order.set('riskLevel', signals.riskLevel);
    order.set('stopLoss', signals.stopLoss);
    order.set('takeProfit', signals.takeProfit);
    order.set('analysis', analysis);
    order.set('signals', signals);
    
    const savedOrder = await order.save();
    
    // Simulate order execution (in real implementation, this would call exchange API)
    const executionResult = await simulateOrderExecution(savedOrder, currentPrice);
    
    return {
      orderId: savedOrder.id,
      status: executionResult.status,
      executionPrice: executionResult.price,
      executedAmount: executionResult.amount,
      fees: executionResult.fees,
      totalValue: executionResult.totalValue,
      analysis,
      signals,
      timestamp: new Date()
    };
    
  } catch (error) {
    console.error('Error executing trading strategy:', error);
    throw new Error(`Trading strategy execution failed: ${error.message}`);
  }
}

// Simulate order execution (replace with real exchange integration)
async function simulateOrderExecution(order, currentPrice) {
  // Simulate 95% success rate
  const success = Math.random() > 0.05;
  
  if (success) {
    // Simulate price slippage
    const slippage = (Math.random() - 0.5) * 0.002; // ±0.1% slippage
    const executionPrice = currentPrice.price * (1 + slippage);
    
    order.set('status', 'executed');
    order.set('executionPrice', executionPrice);
    order.set('executedAt', new Date());
    await order.save();
    
    return {
      status: 'executed',
      price: executionPrice,
      amount: order.get('amount'),
      fees: order.get('fees'),
      totalValue: executionPrice * order.get('amount')
    };
  } else {
    order.set('status', 'failed');
    order.set('failureReason', 'Simulated execution failure');
    await order.save();
    
    return {
      status: 'failed',
      reason: 'Simulated execution failure'
    };
  }
}

// Real order execution with exchange APIs
async function executeRealOrder(order, currentPrice, exchangeCredentials) {
  try {
    const exchange = exchangeCredentials.primaryExchange || 'binance';
    const symbol = order.get('pair');
    const side = order.get('action');
    const quantity = order.get('amount');
    
    // Prepare order data based on exchange
    let orderData;
    let apiUrl;
    let headers;
    
    switch (exchange) {
      case 'binance':
        apiUrl = `${BINANCE_API_URL}/order`;
        orderData = {
          symbol: symbol.replace('/', ''),
          side: side,
          type: 'MARKET',
          quantity: quantity.toString(),
          timestamp: Date.now()
        };
        headers = {
          'X-MBX-APIKEY': exchangeCredentials.binance?.apiKey || '',
          'Content-Type': 'application/json'
        };
        break;
        
      case 'wazirx':
        apiUrl = 'https://api.wazirx.com/api/v2/orders';
        orderData = {
          market: symbol.replace('/', '').toLowerCase(),
          side: side.toLowerCase(),
          order_type: 'market',
          quantity: quantity.toString()
        };
        headers = {
          'X-Api-Key': exchangeCredentials.wazirx?.apiKey || '',
          'Content-Type': 'application/json'
        };
        break;
        
      case 'coindcx':
        apiUrl = 'https://api.coindcx.com/exchange/v1/orders/create';
        orderData = {
          market: symbol.replace('/', '').toUpperCase(),
          side: side.toLowerCase(),
          order_type: 'market_order',
          quantity: quantity.toString()
        };
        headers = {
          'X-AUTH-APIKEY': exchangeCredentials.coindcx?.apiKey || '',
          'Content-Type': 'application/json'
        };
        break;
        
      default:
        throw new Error(`Unsupported exchange: ${exchange}`);
    }
    
    // Make API call to exchange
    const response = await makeHttpRequest('POST', apiUrl, orderData, headers);
    
    if (response && response.orderId) {
      // Order created successfully
      order.set('status', 'executed');
      order.set('executionPrice', currentPrice.price);
      order.set('executedAt', new Date());
      order.set('exchangeOrderId', response.orderId);
      order.set('exchangeUsed', exchange);
      await order.save();
      
      return {
        status: 'executed',
        price: currentPrice.price,
        amount: quantity,
        fees: quantity * currentPrice.price * 0.001, // 0.1% fee
        totalValue: quantity * currentPrice.price,
        exchangeOrderId: response.orderId,
        exchangeUsed: exchange
      };
    } else {
      throw new Error('Failed to create order on exchange');
    }
    
  } catch (error) {
    console.error('Error executing real order:', error);
    
    // Update order as failed
    order.set('status', 'failed');
    order.set('failureReason', error.message);
    await order.save();
    
    throw new Error(`Real order execution failed: ${error.message}`);
  }
}

// Real risk assessment implementation
async function calculateRiskMetrics(portfolio, marketData) {
  try {
    const assets = portfolio.assets || [];
    const totalValue = portfolio.totalValue || 0;
    
    if (assets.length === 0) {
      return {
        volatility: 0,
        sharpeRatio: 0,
        maxDrawdown: 0,
        var95: 0,
        beta: 0,
        riskLevel: 'low'
      };
    }
    
    // Calculate portfolio volatility
    let portfolioVolatility = 0;
    let weightedReturns = [];
    
    for (const asset of assets) {
      const assetData = await fetchMarketData(asset.pair, '1d');
      const returns = [];
      
      for (let i = 1; i < assetData.data.length; i++) {
        returns.push((assetData.data[i].close - assetData.data[i-1].close) / assetData.data[i-1].close);
      }
      
      const assetVolatility = calculateVolatility(assetData.data.map(d => d.close));
      const weight = (asset.value || 0) / totalValue;
      
      portfolioVolatility += Math.pow(assetVolatility * weight, 2);
      
      // Add weighted returns for correlation analysis
      weightedReturns.push(...returns.map(r => r * weight));
    }
    
    portfolioVolatility = Math.sqrt(portfolioVolatility);
    
    // Calculate Sharpe ratio (simplified)
    const riskFreeRate = 0.02; // 2% annual risk-free rate
    const expectedReturn = 0.08; // 8% expected annual return
    const sharpeRatio = (expectedReturn - riskFreeRate) / portfolioVolatility;
    
    // Calculate Value at Risk (VaR) at 95% confidence
    const sortedReturns = weightedReturns.sort((a, b) => a - b);
    const varIndex = Math.floor(sortedReturns.length * 0.05);
    const var95 = Math.abs(sortedReturns[varIndex] || 0);
    
    // Calculate maximum drawdown
    let maxDrawdown = 0;
    let peak = 0;
    let currentValue = totalValue;
    
    for (const asset of assets) {
      const assetData = await fetchMarketData(asset.pair, '1d');
      const prices = assetData.data.map(d => d.close);
      
      for (let i = 0; i < prices.length; i++) {
        const value = (prices[i] / prices[0]) * (asset.value || 0);
        currentValue += value - (asset.value || 0);
        
        if (currentValue > peak) {
          peak = currentValue;
        }
        
        const drawdown = (peak - currentValue) / peak;
        if (drawdown > maxDrawdown) {
          maxDrawdown = drawdown;
        }
      }
    }
    
    // Determine risk level
    let riskLevel = 'low';
    if (portfolioVolatility > 0.3) riskLevel = 'high';
    else if (portfolioVolatility > 0.15) riskLevel = 'medium';
    
    return {
      volatility: portfolioVolatility,
      sharpeRatio: sharpeRatio || 0,
      maxDrawdown: maxDrawdown,
      var95: var95,
      beta: 1.0, // Simplified beta calculation
      riskLevel,
      totalValue,
      assetCount: assets.length
    };
    
  } catch (error) {
    console.error('Error calculating risk metrics:', error);
    throw new Error(`Risk calculation failed: ${error.message}`);
  }
}

// Real risk recommendations
async function generateRiskRecommendations(riskMetrics) {
  try {
    const recommendations = [];
    let overallAction = 'hold';
    let confidence = 0.5;
    
    // Volatility-based recommendations
    if (riskMetrics.volatility > 0.3) {
      recommendations.push({
        type: 'warning',
        message: 'Portfolio volatility is very high. Consider reducing position sizes.',
        action: 'reduce_exposure'
      });
      overallAction = 'reduce';
      confidence = 0.8;
    } else if (riskMetrics.volatility < 0.1) {
      recommendations.push({
        type: 'info',
        message: 'Portfolio volatility is low. Consider increasing diversification.',
        action: 'diversify'
      });
    }
    
    // Sharpe ratio recommendations
    if (riskMetrics.sharpeRatio < 0.5) {
      recommendations.push({
        type: 'warning',
        message: 'Low risk-adjusted returns. Consider rebalancing portfolio.',
        action: 'rebalance'
      });
      if (overallAction === 'hold') {
        overallAction = 'rebalance';
        confidence = 0.7;
      }
    } else if (riskMetrics.sharpeRatio > 2.0) {
      recommendations.push({
        type: 'success',
        message: 'Excellent risk-adjusted returns. Portfolio is well-optimized.',
        action: 'maintain'
      });
    }
    
    // Maximum drawdown recommendations
    if (riskMetrics.maxDrawdown > 0.2) {
      recommendations.push({
        type: 'critical',
        message: 'High maximum drawdown detected. Implement stop-losses immediately.',
        action: 'emergency_stop'
      });
      overallAction = 'emergency';
      confidence = 0.9;
    }
    
    // VaR recommendations
    if (riskMetrics.var95 > 0.05) {
      recommendations.push({
        type: 'warning',
        message: 'High Value at Risk. Consider reducing leverage or position sizes.',
        action: 'reduce_risk'
      });
      if (overallAction === 'hold') {
        overallAction = 'reduce_risk';
        confidence = 0.75;
      }
    }
    
    // Diversification recommendations
    if (riskMetrics.assetCount < 3) {
      recommendations.push({
        type: 'info',
        message: 'Low diversification. Consider adding more assets to reduce risk.',
        action: 'diversify'
      });
    }
    
    return {
      action: overallAction,
      confidence: confidence,
      recommendations: recommendations,
      riskLevel: riskMetrics.riskLevel,
      nextReview: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    };
    
  } catch (error) {
    console.error('Error generating risk recommendations:', error);
    throw new Error(`Risk recommendation generation failed: ${error.message}`);
  }
}

// Real exchange integration functions
Parse.Cloud.define('getExchangeBalances', async (request) => {
  try {
    const { exchangeCredentials } = request.params;
    
    if (!exchangeCredentials) {
      throw new Error('Exchange credentials are required');
    }
    
    // Get balances from all configured exchanges
    const balances = {};
    
    // Binance
    if (exchangeCredentials.binance) {
      try {
        const binanceBalances = await getBinanceBalances(exchangeCredentials.binance);
        balances.binance = binanceBalances;
      } catch (error) {
        console.warn('Failed to get Binance balances:', error);
        balances.binance = { error: error.message };
      }
    }
    
    // WazirX
    if (exchangeCredentials.wazirx) {
      try {
        const wazirxBalances = await getWazirXBalances(exchangeCredentials.wazirx);
        balances.wazirx = wazirxBalances;
      } catch (error) {
        console.warn('Failed to get WazirX balances:', error);
        balances.wazirx = { error: error.message };
      }
    }
    
    // CoinDCX
    if (exchangeCredentials.coindcx) {
      try {
        const coindcxBalances = await getCoinDCXBalances(exchangeCredentials.coindcx);
        balances.coindcx = coindcxBalances;
      } catch (error) {
        console.warn('Failed to get CoinDCX balances:', error);
        balances.coindcx = { error: error.message };
      }
    }
    
    return {
      success: true,
      balances,
      timestamp: new Date()
    };
  } catch (error) {
    console.error('Error getting exchange balances:', error);
    throw new Error(`Failed to get exchange balances: ${error.message}`);
  }
});

Parse.Cloud.define('executeRealTrade', async (request) => {
  try {
    const { 
      action, 
      pair, 
      amount, 
      strategy, 
      exchangeCredentials,
      useRealExecution = false 
    } = request.params;
    
    // Validate user authentication
    if (!request.user) {
      throw new Error('User not authenticated');
    }
    
    // Get current market data
    const marketData = await fetchMarketData(pair, '1h');
    const currentPrice = await fetchCurrentPrice(pair);
    
    // Perform technical analysis
    const analysis = await performTechnicalAnalysis(marketData);
    const signals = await generateTradingSignals(analysis);
    
    // Create order record
    const Order = Parse.Object.extend('Order');
    const order = new Order();
    order.set('userId', request.user.id);
    order.set('pair', pair);
    order.set('action', action);
    order.set('amount', amount);
    order.set('price', currentPrice.price);
    order.set('strategy', strategy);
    order.set('status', 'pending');
    order.set('confidence', signals.confidence);
    order.set('riskLevel', signals.riskLevel);
    order.set('analysis', analysis);
    order.set('signals', signals);
    const savedOrder = await order.save();
    
    // Execute order (real or simulated)
    let executionResult;
    if (useRealExecution && exchangeCredentials) {
      executionResult = await executeRealOrder(savedOrder, currentPrice, exchangeCredentials);
    } else {
      executionResult = await simulateOrderExecution(savedOrder, currentPrice);
    }
    
    return {
      success: true,
      orderId: savedOrder.id,
      executionResult,
      analysis,
      signals,
      timestamp: new Date()
    };
  } catch (error) {
    console.error('Error executing real trade:', error);
    throw new Error(`Failed to execute real trade: ${error.message}`);
  }
});

Parse.Cloud.define('getExchangeOrderHistory', async (request) => {
  try {
    const { exchangeCredentials, exchange, symbol, limit = 50 } = request.params;
    
    if (!exchangeCredentials || !exchange) {
      throw new Error('Exchange credentials and exchange name are required');
    }
    
    let orders = [];
    
    switch (exchange) {
      case 'binance':
        orders = await getBinanceOrderHistory(exchangeCredentials.binance, symbol, limit);
        break;
      case 'wazirx':
        orders = await getWazirXOrderHistory(exchangeCredentials.wazirx, symbol, limit);
        break;
      case 'coindcx':
        orders = await getCoinDCXOrderHistory(exchangeCredentials.coindcx, symbol, limit);
        break;
      default:
        throw new Error(`Unsupported exchange: ${exchange}`);
    }
    
    return {
      success: true,
      orders,
      exchange,
      timestamp: new Date()
    };
  } catch (error) {
    console.error('Error getting exchange order history:', error);
    throw new Error(`Failed to get exchange order history: ${error.message}`);
  }
});

// Helper functions for exchange API calls
async function getBinanceBalances(credentials) {
  const apiUrl = `${BINANCE_API_URL}/account`;
  const headers = {
    'X-MBX-APIKEY': credentials.apiKey,
    'Content-Type': 'application/json'
  };
  
  const response = await makeHttpRequest('GET', apiUrl, {}, headers);
  return response.balances || [];
}

async function getWazirXBalances(credentials) {
  const apiUrl = 'https://api.wazirx.com/api/v2/account';
  const headers = {
    'X-Api-Key': credentials.apiKey,
    'Content-Type': 'application/json'
  };
  
  const response = await makeHttpRequest('GET', apiUrl, {}, headers);
  return response.balances || [];
}

async function getCoinDCXBalances(credentials) {
  const apiUrl = 'https://api.coindcx.com/exchange/v1/users/balances';
  const headers = {
    'X-AUTH-APIKEY': credentials.apiKey,
    'Content-Type': 'application/json'
  };
  
  const response = await makeHttpRequest('GET', apiUrl, {}, headers);
  return response || [];
}

async function getBinanceOrderHistory(credentials, symbol, limit) {
  const apiUrl = `${BINANCE_API_URL}/allOrders`;
  const params = {
    symbol: symbol.replace('/', ''),
    limit: limit
  };
  const headers = {
    'X-MBX-APIKEY': credentials.apiKey,
    'Content-Type': 'application/json'
  };
  
  const response = await makeHttpRequest('GET', apiUrl, params, headers);
  return response || [];
}

async function getWazirXOrderHistory(credentials, symbol, limit) {
  const apiUrl = 'https://api.wazirx.com/api/v2/orders';
  const params = {
    market: symbol.replace('/', '').toLowerCase(),
    limit: limit
  };
  const headers = {
    'X-Api-Key': credentials.apiKey,
    'Content-Type': 'application/json'
  };
  
  const response = await makeHttpRequest('GET', apiUrl, params, headers);
  return response || [];
}

async function getCoinDCXOrderHistory(credentials, symbol, limit) {
  const apiUrl = 'https://api.coindcx.com/exchange/v1/orders/trade_history';
  const params = {
    market: symbol.replace('/', '').toUpperCase(),
    limit: limit
  };
  const headers = {
    'X-AUTH-APIKEY': credentials.apiKey,
    'Content-Type': 'application/json'
  };
  
  const response = await makeHttpRequest('GET', apiUrl, params, headers);
  return response || [];
}
