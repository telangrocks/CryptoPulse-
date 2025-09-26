# CryptoPulse API Documentation

Complete API reference for CryptoPulse trading bot deployed on Back4App.

## 🔗 Base URL

```
https://your-app-name.b4a.app/functions/
```

## 🔐 Authentication

All API endpoints require authentication using Parse User sessions or JWT tokens.

### Authentication Headers

```http
X-Parse-Application-Id: your-app-id
X-Parse-REST-API-Key: your-rest-api-key
X-Parse-Session-Token: your-session-token
```

### JWT Authentication

```http
Authorization: Bearer your-jwt-token
```

## 📊 Core Trading Functions

### 1. Trading Bot

Execute automated trading strategies.

**Endpoint:** `POST /tradingBot`

**Request Body:**
```json
{
  "action": "buy|sell|hold",
  "pair": "BTC/USDT",
  "amount": 1000,
  "strategy": "momentum|mean_reversion|arbitrage"
}
```

**Response:**
```json
{
  "success": true,
  "result": {
    "status": "executed|pending|failed",
    "orderId": "order_123",
    "price": 45000,
    "amount": 1000,
    "profit": 50.25,
    "timestamp": "2024-01-01T12:00:00Z"
  },
  "timestamp": "2024-01-01T12:00:00Z"
}
```

**Error Responses:**
- `400` - Invalid parameters
- `401` - Authentication required
- `429` - Rate limit exceeded
- `500` - Internal server error

### 2. Market Analysis

Get comprehensive market analysis for trading decisions.

**Endpoint:** `POST /marketAnalysis`

**Request Body:**
```json
{
  "pair": "BTC/USDT",
  "timeframe": "1h|4h|1d",
  "indicators": ["RSI", "MACD", "BB", "SMA"]
}
```

**Response:**
```json
{
  "success": true,
  "analysis": {
    "pair": "BTC/USDT",
    "currentPrice": 45000,
    "trend": "bullish|bearish|sideways",
    "confidence": 0.85,
    "indicators": {
      "RSI": 65.5,
      "MACD": 120.3,
      "BB": {
        "upper": 46000,
        "middle": 45000,
        "lower": 44000
      },
      "SMA": {
        "20": 44800,
        "50": 44500,
        "200": 42000
      }
    },
    "signals": [
      {
        "type": "buy|sell|hold",
        "strength": 0.8,
        "reason": "RSI oversold, MACD bullish crossover"
      }
    ],
    "timestamp": "2024-01-01T12:00:00Z"
  }
}
```

### 3. Get Current Price

Get real-time price for a trading pair.

**Endpoint:** `POST /getCurrentPrice`

**Request Body:**
```json
{
  "pair": "BTC/USDT"
}
```

**Response:**
```json
{
  "success": true,
  "price": 45000,
  "pair": "BTC/USDT",
  "timestamp": "2024-01-01T12:00:00Z",
  "source": "binance"
}
```

### 4. Get Market Data

Get historical market data for analysis.

**Endpoint:** `POST /getMarketData`

**Request Body:**
```json
{
  "pair": "BTC/USDT",
  "timeframe": "1h|4h|1d",
  "limit": 100,
  "startTime": "2024-01-01T00:00:00Z",
  "endTime": "2024-01-01T23:59:59Z"
}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "timestamp": "2024-01-01T12:00:00Z",
      "open": 44800,
      "high": 45200,
      "low": 44700,
      "close": 45000,
      "volume": 1250.5
    }
  ],
  "pair": "BTC/USDT",
  "timeframe": "1h",
  "count": 100
}
```

## 👤 User Management

### 1. User Authentication

**Endpoint:** `POST /userAuthentication`

**Request Body:**
```json
{
  "action": "login|register|logout",
  "username": "user@example.com",
  "password": "securepassword",
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "user_123",
    "username": "user@example.com",
    "email": "user@example.com",
    "sessionToken": "session_token_123",
    "createdAt": "2024-01-01T12:00:00Z"
  }
}
```

### 2. Accept Disclaimer

**Endpoint:** `POST /acceptDisclaimer`

**Request Body:**
```json
{
  "accepted": true,
  "version": "2.0.0"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Disclaimer accepted successfully",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

### 3. Get Disclaimer Status

**Endpoint:** `POST /getDisclaimerStatus`

**Response:**
```json
{
  "success": true,
  "accepted": true,
  "version": "2.0.0",
  "acceptedAt": "2024-01-01T12:00:00Z"
}
```

## 💼 Portfolio Management

### 1. Portfolio Management

**Endpoint:** `POST /portfolioManagement`

**Request Body:**
```json
{
  "action": "create|get|update|delete",
  "portfolioId": "portfolio_123",
  "name": "My Trading Portfolio",
  "description": "Main trading portfolio",
  "settings": {
    "riskLevel": "medium",
    "maxDrawdown": 0.1,
    "stopLoss": 0.05
  }
}
```

**Response:**
```json
{
  "success": true,
  "portfolio": {
    "id": "portfolio_123",
    "name": "My Trading Portfolio",
    "description": "Main trading portfolio",
    "userId": "user_123",
    "settings": {
      "riskLevel": "medium",
      "maxDrawdown": 0.1,
      "stopLoss": 0.05
    },
    "createdAt": "2024-01-01T12:00:00Z",
    "updatedAt": "2024-01-01T12:00:00Z"
  }
}
```

### 2. Get Portfolio Performance

**Endpoint:** `POST /getPortfolioPerformance`

**Request Body:**
```json
{
  "portfolioId": "portfolio_123",
  "timeframe": "1d|7d|30d|1y",
  "startDate": "2024-01-01T00:00:00Z",
  "endDate": "2024-01-31T23:59:59Z"
}
```

**Response:**
```json
{
  "success": true,
  "performance": {
    "portfolioId": "portfolio_123",
    "totalValue": 10000,
    "totalReturn": 0.15,
    "totalReturnPercent": 15.0,
    "dailyReturn": 0.02,
    "dailyReturnPercent": 2.0,
    "maxDrawdown": 0.05,
    "sharpeRatio": 1.2,
    "winRate": 0.65,
    "totalTrades": 50,
    "winningTrades": 32,
    "losingTrades": 18,
    "averageWin": 150,
    "averageLoss": -80,
    "profitFactor": 1.88,
    "timeframe": "30d",
    "timestamp": "2024-01-01T12:00:00Z"
  }
}
```

## 📈 Trading Signals

### 1. Get Trading Signals

**Endpoint:** `POST /getTradingSignals`

**Request Body:**
```json
{
  "pair": "BTC/USDT",
  "strategy": "momentum|mean_reversion|arbitrage",
  "timeframe": "1h|4h|1d",
  "limit": 10
}
```

**Response:**
```json
{
  "success": true,
  "signals": [
    {
      "id": "signal_123",
      "pair": "BTC/USDT",
      "action": "buy|sell|hold",
      "strength": 0.85,
      "confidence": 0.9,
      "price": 45000,
      "reason": "RSI oversold, MACD bullish crossover",
      "strategy": "momentum",
      "timeframe": "1h",
      "timestamp": "2024-01-01T12:00:00Z",
      "expiresAt": "2024-01-01T13:00:00Z"
    }
  ],
  "count": 10
}
```

## 📊 Order Management

### 1. Get Order History

**Endpoint:** `POST /getOrderHistory`

**Request Body:**
```json
{
  "portfolioId": "portfolio_123",
  "pair": "BTC/USDT",
  "status": "all|open|filled|cancelled",
  "limit": 50,
  "offset": 0,
  "startDate": "2024-01-01T00:00:00Z",
  "endDate": "2024-01-31T23:59:59Z"
}
```

**Response:**
```json
{
  "success": true,
  "orders": [
    {
      "id": "order_123",
      "portfolioId": "portfolio_123",
      "pair": "BTC/USDT",
      "action": "buy",
      "amount": 1000,
      "price": 45000,
      "status": "filled",
      "filledAt": "2024-01-01T12:00:00Z",
      "createdAt": "2024-01-01T11:59:00Z"
    }
  ],
  "count": 50,
  "total": 150
}
```

### 2. Execute Real Trade

**Endpoint:** `POST /executeRealTrade`

**Request Body:**
```json
{
  "pair": "BTC/USDT",
  "action": "buy|sell",
  "amount": 1000,
  "price": 45000,
  "orderType": "market|limit|stop",
  "portfolioId": "portfolio_123"
}
```

**Response:**
```json
{
  "success": true,
  "order": {
    "id": "order_123",
    "pair": "BTC/USDT",
    "action": "buy",
    "amount": 1000,
    "price": 45000,
    "status": "pending|filled|cancelled",
    "orderId": "exchange_order_123",
    "timestamp": "2024-01-01T12:00:00Z"
  }
}
```

## 🔄 Exchange Integration

### 1. Get Exchange Balances

**Endpoint:** `POST /getExchangeBalances`

**Request Body:**
```json
{
  "exchange": "binance|coinbase|coindcx"
}
```

**Response:**
```json
{
  "success": true,
  "balances": [
    {
      "asset": "BTC",
      "free": 0.5,
      "locked": 0.1,
      "total": 0.6
    },
    {
      "asset": "USDT",
      "free": 1000,
      "locked": 0,
      "total": 1000
    }
  ],
  "exchange": "binance",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

### 2. Get Exchange Order History

**Endpoint:** `POST /getExchangeOrderHistory`

**Request Body:**
```json
{
  "exchange": "binance|coinbase|coindcx",
  "pair": "BTC/USDT",
  "limit": 50,
  "startTime": "2024-01-01T00:00:00Z",
  "endTime": "2024-01-31T23:59:59Z"
}
```

**Response:**
```json
{
  "success": true,
  "orders": [
    {
      "id": "exchange_order_123",
      "pair": "BTC/USDT",
      "action": "buy",
      "amount": 1000,
      "price": 45000,
      "status": "filled",
      "filledAt": "2024-01-01T12:00:00Z",
      "exchange": "binance"
    }
  ],
  "count": 50
}
```

## 🛡️ Risk Management

### 1. Risk Assessment

**Endpoint:** `POST /riskAssessment`

**Request Body:**
```json
{
  "portfolioId": "portfolio_123",
  "pair": "BTC/USDT",
  "amount": 1000,
  "strategy": "momentum"
}
```

**Response:**
```json
{
  "success": true,
  "assessment": {
    "portfolioId": "portfolio_123",
    "pair": "BTC/USDT",
    "riskScore": 0.3,
    "riskLevel": "low|medium|high",
    "recommendations": [
      "Consider reducing position size",
      "Set stop loss at 2% below entry"
    ],
    "metrics": {
      "var95": 0.05,
      "maxDrawdown": 0.1,
      "sharpeRatio": 1.2,
      "beta": 0.8
    },
    "timestamp": "2024-01-01T12:00:00Z"
  }
}
```

## 🔍 System Monitoring

### 1. Health Check

**Endpoint:** `POST /healthCheck`

**Response:**
```json
{
  "success": true,
  "status": "healthy|degraded|critical",
  "uptime": 86400,
  "timestamp": "2024-01-01T12:00:00Z",
  "version": "2.0.0",
  "environment": "production",
  "memory": {
    "rss": 50000000,
    "heapTotal": 20000000,
    "heapUsed": 15000000,
    "external": 5000000
  },
  "services": {
    "database": "healthy",
    "marketData": "healthy",
    "trading": "healthy",
    "riskManagement": "healthy",
    "authentication": "healthy"
  },
  "metrics": {
    "totalRequests": 1000,
    "errorRate": 0.01,
    "averageResponseTime": 150,
    "activeConnections": 25,
    "cacheHitRate": 0.85
  },
  "alerts": []
}
```

### 2. Get System Status

**Endpoint:** `POST /getSystemStatus`

**Response:**
```json
{
  "success": true,
  "status": "healthy",
  "uptime": 86400,
  "timestamp": "2024-01-01T12:00:00Z",
  "version": "2.0.0",
  "environment": "production",
  "system": {
    "platform": "linux",
    "arch": "x64",
    "nodeVersion": "18.17.0",
    "cpuUsage": {
      "user": 1000000,
      "system": 500000
    },
    "memoryUsage": {
      "rss": 50000000,
      "heapTotal": 20000000,
      "heapUsed": 15000000,
      "external": 5000000
    },
    "loadAverage": [0.5, 0.6, 0.7]
  },
  "performance": {
    "requests": 1000,
    "errors": 10,
    "errorRate": 0.01,
    "averageResponseTime": 150,
    "cacheHitRate": 0.85
  }
}
```

## 📝 Error Handling

### Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": "Additional error details",
    "timestamp": "2024-01-01T12:00:00Z"
  }
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_PARAMETERS` | 400 | Invalid request parameters |
| `AUTHENTICATION_REQUIRED` | 401 | Authentication required |
| `INSUFFICIENT_PERMISSIONS` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `RATE_LIMIT_EXCEEDED` | 429 | Rate limit exceeded |
| `INTERNAL_ERROR` | 500 | Internal server error |
| `SERVICE_UNAVAILABLE` | 503 | Service temporarily unavailable |

## 🔒 Rate Limiting

### Rate Limits

- **General API**: 1000 requests per hour per user
- **Trading Functions**: 100 requests per hour per user
- **Market Data**: 500 requests per hour per user
- **System Functions**: 50 requests per hour per user

### Rate Limit Headers

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640995200
```

## 📊 Response Codes

| Code | Description |
|------|-------------|
| `200` | Success |
| `201` | Created |
| `400` | Bad Request |
| `401` | Unauthorized |
| `403` | Forbidden |
| `404` | Not Found |
| `429` | Too Many Requests |
| `500` | Internal Server Error |
| `503` | Service Unavailable |

## 🔧 SDK Examples

### JavaScript/Node.js

```javascript
const Parse = require('parse/node');

// Initialize Parse
Parse.initialize(
  'your-app-id',
  'your-javascript-key'
);
Parse.serverURL = 'https://your-app-name.b4a.app/';

// Execute trading bot
async function executeTradingBot() {
  try {
    const result = await Parse.Cloud.run('tradingBot', {
      action: 'buy',
      pair: 'BTC/USDT',
      amount: 1000,
      strategy: 'momentum'
    });
    console.log('Trading result:', result);
  } catch (error) {
    console.error('Trading error:', error);
  }
}

// Get market data
async function getMarketData() {
  try {
    const result = await Parse.Cloud.run('getMarketData', {
      pair: 'BTC/USDT',
      timeframe: '1h',
      limit: 100
    });
    console.log('Market data:', result);
  } catch (error) {
    console.error('Market data error:', error);
  }
}
```

### Python

```python
import requests
import json

class CryptoPulseAPI:
    def __init__(self, app_id, rest_api_key, server_url):
        self.app_id = app_id
        self.rest_api_key = rest_api_key
        self.server_url = server_url
        self.headers = {
            'X-Parse-Application-Id': app_id,
            'X-Parse-REST-API-Key': rest_api_key,
            'Content-Type': 'application/json'
        }
    
    def call_function(self, function_name, params):
        url = f"{self.server_url}/functions/{function_name}"
        response = requests.post(url, headers=self.headers, json=params)
        return response.json()
    
    def execute_trading_bot(self, action, pair, amount, strategy):
        return self.call_function('tradingBot', {
            'action': action,
            'pair': pair,
            'amount': amount,
            'strategy': strategy
        })
    
    def get_market_data(self, pair, timeframe, limit=100):
        return self.call_function('getMarketData', {
            'pair': pair,
            'timeframe': timeframe,
            'limit': limit
        })

# Usage
api = CryptoPulseAPI('your-app-id', 'your-rest-api-key', 'https://your-app-name.b4a.app')
result = api.execute_trading_bot('buy', 'BTC/USDT', 1000, 'momentum')
print(result)
```

### cURL Examples

```bash
# Execute trading bot
curl -X POST https://your-app-name.b4a.app/functions/tradingBot \
  -H "X-Parse-Application-Id: your-app-id" \
  -H "X-Parse-REST-API-Key: your-rest-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "buy",
    "pair": "BTC/USDT",
    "amount": 1000,
    "strategy": "momentum"
  }'

# Get market data
curl -X POST https://your-app-name.b4a.app/functions/getMarketData \
  -H "X-Parse-Application-Id: your-app-id" \
  -H "X-Parse-REST-API-Key: your-rest-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "pair": "BTC/USDT",
    "timeframe": "1h",
    "limit": 100
  }'

# Health check
curl -X POST https://your-app-name.b4a.app/functions/healthCheck \
  -H "X-Parse-Application-Id: your-app-id" \
  -H "X-Parse-REST-API-Key: your-rest-api-key" \
  -H "Content-Type: application/json"
```

## 📚 Additional Resources

- [Back4App Documentation](https://docs.back4app.com)
- [Parse Server Documentation](https://docs.parseplatform.org)
- [Trading Bot Strategies](docs/TRADING_STRATEGIES.md)
- [Security Best Practices](docs/SECURITY_GUIDE.md)
- [Performance Optimization](docs/PERFORMANCE_GUIDE.md)

---

**API Documentation v2.0.0**  
*Last updated: January 2024*