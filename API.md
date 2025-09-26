# 📚 CryptoPulse API Documentation

## Overview

CryptoPulse provides a comprehensive REST API for cryptocurrency trading, market analysis, and portfolio management through Parse Cloud Functions.

## Base URL

```
Production: https://parseapi.back4app.com/parse/functions/
Staging: https://your-staging-domain.com/parse/functions/
```

## Authentication

### Session Token Authentication
```http
X-Parse-Session-Token: your_session_token
```

### Master Key Authentication (Admin only)
```http
X-Parse-Master-Key: your_master_key
```

### Headers
```http
X-Parse-Application-Id: your_app_id
X-Parse-REST-API-Key: your_rest_api_key
Content-Type: application/json
```

## Rate Limiting

- **Standard Users**: 1000 requests/hour
- **Burst Limit**: 100 requests/minute
- **Trading Functions**: 100 requests/hour
- **Market Data**: 500 requests/hour

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request - Invalid parameters |
| 401 | Unauthorized - Invalid or missing authentication |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource not found |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error - Server error |
| 503 | Service Unavailable - Service temporarily down |

## Core Functions

### 1. Authentication

#### User Login
```http
POST /userAuthentication
```

**Parameters:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "action": "login"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "username": "username",
    "sessionToken": "session_token"
  }
}
```

#### User Registration
```http
POST /userAuthentication
```

**Parameters:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "action": "register"
}
```

### 2. Market Data

#### Get Current Price
```http
POST /getCurrentPrice
```

**Parameters:**
```json
{
  "pair": "BTC/USDT"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "pair": "BTC/USDT",
    "price": 45000.50,
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

#### Get Market Data
```http
POST /getMarketData
```

**Parameters:**
```json
{
  "pair": "BTC/USDT",
  "timeframe": "1h"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "pair": "BTC/USDT",
    "timeframe": "1h",
    "data": [
      {
        "timestamp": 1640995200000,
        "open": 45000.00,
        "high": 46000.00,
        "low": 44000.00,
        "close": 45500.00,
        "volume": 1000.50
      }
    ],
    "lastUpdate": "2024-01-01T00:00:00.000Z"
  }
}
```

#### Get Trading Signals
```http
POST /getTradingSignals
```

**Parameters:**
```json
{
  "pair": "BTC/USDT",
  "timeframe": "1h"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "pair": "BTC/USDT",
    "timeframe": "1h",
    "analysis": {
      "currentPrice": 45000.50,
      "sma20": 44500.00,
      "sma50": 44000.00,
      "rsi": 65.5,
      "macd": {
        "macd": 150.0,
        "signal": 140.0,
        "histogram": 10.0
      },
      "bollingerBands": {
        "upper": 46000.00,
        "middle": 45000.00,
        "lower": 44000.00
      }
    },
    "signals": {
      "buy": true,
      "sell": false,
      "hold": false,
      "confidence": 0.75,
      "reasons": ["RSI indicates oversold condition", "Bullish moving average alignment"],
      "riskLevel": "medium",
      "stopLoss": 42750.00,
      "takeProfit": 51750.00
    },
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

### 3. Trading Operations

#### Execute Trade
```http
POST /tradingBot
```

**Parameters:**
```json
{
  "action": "BUY",
  "pair": "BTC/USDT",
  "amount": 0.1,
  "strategy": "conservative"
}
```

**Response:**
```json
{
  "success": true,
  "result": {
    "orderId": "order_1234567890",
    "status": "executed",
    "executionPrice": 45000.50,
    "executedAmount": 0.1,
    "fees": 4.50,
    "totalValue": 4500.05,
    "analysis": { /* technical analysis data */ },
    "signals": { /* trading signals */ },
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

#### Execute Real Trade
```http
POST /executeRealTrade
```

**Parameters:**
```json
{
  "action": "BUY",
  "pair": "BTC/USDT",
  "amount": 0.1,
  "strategy": "moderate",
  "exchangeCredentials": {
    "binance": {
      "apiKey": "your_api_key",
      "secretKey": "your_secret_key"
    }
  },
  "useRealExecution": true
}
```

#### Get Order History
```http
POST /getOrderHistory
```

**Parameters:**
```json
{
  "limit": 50,
  "offset": 0,
  "status": "executed"
}
```

**Response:**
```json
{
  "success": true,
  "orders": [
    {
      "id": "order_id",
      "pair": "BTC/USDT",
      "action": "BUY",
      "amount": 0.1,
      "price": 45000.50,
      "status": "executed",
      "confidence": 0.75,
      "riskLevel": "medium",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "executedAt": "2024-01-01T00:01:00.000Z"
    }
  ],
  "total": 1
}
```

### 4. Portfolio Management

#### Get Portfolio Performance
```http
POST /getPortfolioPerformance
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalValue": 10000.00,
    "totalCost": 9500.00,
    "totalReturn": 500.00,
    "totalReturnPercentage": 5.26,
    "portfolios": [
      {
        "id": "portfolio_id",
        "name": "Main Portfolio",
        "value": 10000.00,
        "cost": 9500.00,
        "return": 500.00,
        "returnPercentage": 5.26,
        "assets": 3
      }
    ]
  }
}
```

#### Portfolio Management
```http
POST /portfolioManagement
```

**Parameters:**
```json
{
  "action": "get",
  "data": {}
}
```

**Response:**
```json
{
  "success": true,
  "portfolios": [
    {
      "id": "portfolio_id",
      "name": "Main Portfolio",
      "balance": 10000.00,
      "assets": [
        {
          "pair": "BTC/USDT",
          "amount": 0.1,
          "value": 4500.00,
          "cost": 4000.00
        }
      ],
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### 5. Risk Assessment

#### Risk Assessment
```http
POST /riskAssessment
```

**Parameters:**
```json
{
  "portfolio": {
    "totalValue": 10000.00,
    "assets": [
      {
        "pair": "BTC/USDT",
        "value": 5000.00,
        "amount": 0.1
      }
    ]
  },
  "marketData": {
    "volatility": 0.25,
    "trend": "bullish"
  }
}
```

**Response:**
```json
{
  "success": true,
  "riskMetrics": {
    "volatility": 0.25,
    "sharpeRatio": 1.5,
    "maxDrawdown": 0.15,
    "var95": 0.05,
    "beta": 1.0,
    "riskLevel": "medium",
    "totalValue": 10000.00,
    "assetCount": 1
  },
  "recommendations": {
    "action": "hold",
    "confidence": 0.7,
    "recommendations": [
      {
        "type": "info",
        "message": "Portfolio is well-diversified",
        "action": "maintain"
      }
    ],
    "riskLevel": "medium",
    "nextReview": "2024-01-02T00:00:00.000Z"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 6. Exchange Integration

#### Get Exchange Balances
```http
POST /getExchangeBalances
```

**Parameters:**
```json
{
  "exchangeCredentials": {
    "binance": {
      "apiKey": "your_api_key",
      "secretKey": "your_secret_key"
    },
    "wazirx": {
      "apiKey": "your_api_key",
      "secretKey": "your_secret_key"
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "balances": {
    "binance": [
      {
        "asset": "BTC",
        "free": "0.1",
        "locked": "0.0"
      }
    ],
    "wazirx": [
      {
        "asset": "BTC",
        "free": "0.05",
        "locked": "0.0"
      }
    ]
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### Get Exchange Order History
```http
POST /getExchangeOrderHistory
```

**Parameters:**
```json
{
  "exchangeCredentials": {
    "binance": {
      "apiKey": "your_api_key",
      "secretKey": "your_secret_key"
    }
  },
  "exchange": "binance",
  "symbol": "BTCUSDT",
  "limit": 50
}
```

### 7. System Monitoring

#### Health Check
```http
POST /healthCheck
```

**Response:**
```json
{
  "success": true,
  "status": "healthy",
  "uptime": 3600,
  "memory": {
    "rss": 50000000,
    "heapTotal": 20000000,
    "heapUsed": 15000000,
    "external": 1000000
  },
  "services": {
    "database": "healthy",
    "api": "healthy",
    "cache": "healthy",
    "monitoring": "healthy"
  },
  "lastUpdate": "2024-01-01T00:00:00.000Z",
  "requestCount": 1000,
  "errorCount": 5,
  "averageResponseTime": 200,
  "errorRate": 0.5
}
```

#### Production Health Check
```http
POST /productionHealthCheck
```

**Response:**
```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "responseTime": 150,
  "services": {
    "database": {
      "status": "healthy",
      "responseTime": 50,
      "lastCheck": "2024-01-01T00:00:00.000Z"
    },
    "exchanges": {
      "binance": { "status": "healthy", "responseTime": 100 },
      "wazirx": { "status": "healthy", "responseTime": 80 },
      "coindcx": { "status": "healthy", "responseTime": 120 }
    },
    "memory": { /* memory usage data */ },
    "uptime": 3600
  },
  "metrics": {
    "requestCount": 1000,
    "errorCount": 5,
    "averageResponseTime": 200,
    "errorRate": 0.5
  },
  "environment": "production",
  "version": "2.0.0"
}
```

#### System Status
```http
POST /getSystemStatus
```

**Response:**
```json
{
  "success": true,
  "status": "healthy",
  "uptime": 3600,
  "memory": { /* memory usage data */ },
  "services": { /* service status */ },
  "lastUpdate": "2024-01-01T00:00:00.000Z",
  "requestCount": 1000,
  "errorCount": 5,
  "averageResponseTime": 200,
  "errorRate": 0.5,
  "nodeVersion": "v18.17.0",
  "platform": "linux",
  "arch": "x64",
  "cpuUsage": { /* CPU usage data */ },
  "environment": "production",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 8. Disclaimer Management

#### Accept Disclaimer
```http
POST /acceptDisclaimer
```

**Response:**
```json
{
  "success": true,
  "message": "Disclaimer accepted successfully"
}
```

#### Get Disclaimer Status
```http
POST /getDisclaimerStatus
```

**Response:**
```json
{
  "success": true,
  "result": {
    "accepted": true,
    "acceptedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

## WebSocket API

### Real-time Market Data
```javascript
const ws = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@ticker');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Price update:', data.c);
};
```

### Real-time Trading Signals
```javascript
const ws = new WebSocket('wss://your-domain.com/ws/trading-signals');

ws.onmessage = (event) => {
  const signal = JSON.parse(event.data);
  console.log('Trading signal:', signal);
};
```

## SDK Examples

### JavaScript/Node.js
```javascript
const Parse = require('parse/node');

Parse.initialize('YOUR_APP_ID', 'YOUR_JS_KEY');
Parse.serverURL = 'https://parseapi.back4app.com/parse';

// Get current price
const result = await Parse.Cloud.run('getCurrentPrice', {
  pair: 'BTC/USDT'
});

console.log(result.data.price);
```

### Python
```python
import requests

headers = {
    'X-Parse-Application-Id': 'YOUR_APP_ID',
    'X-Parse-REST-API-Key': 'YOUR_REST_API_KEY',
    'Content-Type': 'application/json'
}

data = {
    'pair': 'BTC/USDT'
}

response = requests.post(
    'https://parseapi.back4app.com/parse/functions/getCurrentPrice',
    headers=headers,
    json=data
)

result = response.json()
print(result['data']['price'])
```

### cURL Examples
```bash
# Get current price
curl -X POST \
  https://parseapi.back4app.com/parse/functions/getCurrentPrice \
  -H 'X-Parse-Application-Id: YOUR_APP_ID' \
  -H 'X-Parse-REST-API-Key: YOUR_REST_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"pair": "BTC/USDT"}'

# Execute trade
curl -X POST \
  https://parseapi.back4app.com/parse/functions/tradingBot \
  -H 'X-Parse-Application-Id: YOUR_APP_ID' \
  -H 'X-Parse-Session-Token: YOUR_SESSION_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{"action": "BUY", "pair": "BTC/USDT", "amount": 0.1, "strategy": "conservative"}'
```

## Best Practices

### Authentication
- Always use session tokens for user-specific operations
- Use master key only for administrative functions
- Implement proper token refresh mechanisms

### Error Handling
- Always check the `success` field in responses
- Handle rate limiting gracefully
- Implement retry logic with exponential backoff

### Performance
- Cache market data when possible
- Use appropriate timeframes for analysis
- Implement connection pooling for high-frequency requests

### Security
- Never expose API keys in client-side code
- Use HTTPS for all API calls
- Validate all input parameters
- Implement proper logging and monitoring

---

**Last Updated**: January 2024  
**Version**: 2.0.0  
**API Version**: v1
