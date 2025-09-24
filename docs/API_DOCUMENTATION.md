# 📚 **CryptoPulse API Documentation**

## **Overview**

CryptoPulse provides a comprehensive REST API for cryptocurrency trading operations, user management, and system monitoring.

**Base URL**: `https://api.cryptopulse.com`  
**API Version**: `v1`  
**Authentication**: Session-based with CSRF protection

---

## **Authentication**

### **Login**
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "user123",
    "email": "user@example.com",
    "username": "trader123"
  },
  "session": {
    "sessionId": "sess_abc123",
    "csrfToken": "csrf_xyz789",
    "expires": "2024-12-31T23:59:59Z"
  }
}
```

### **Logout**
```http
POST /api/auth/logout
X-CSRF-Token: csrf_xyz789
Cookie: cryptopulse.sid=sess_abc123
```

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### **Session Validation**
```http
GET /api/auth/validate
Cookie: cryptopulse.sid=sess_abc123
```

**Response:**
```json
{
  "valid": true,
  "user": {
    "id": "user123",
    "email": "user@example.com"
  }
}
```

---

## **Trading Operations**

### **Get Trading Status**
```http
GET /api/trading/status
Cookie: cryptopulse.sid=sess_abc123
```

**Response:**
```json
{
  "tradingEnabled": true,
  "liveTrading": false,
  "demoMode": true,
  "activeStrategies": 3,
  "totalTrades": 150,
  "successRate": 85.5
}
```

### **Place Trade Order**
```http
POST /api/trading/order
Content-Type: application/json
X-CSRF-Token: csrf_xyz789
Cookie: cryptopulse.sid=sess_abc123

{
  "symbol": "BTC/USDT",
  "side": "BUY",
  "type": "MARKET",
  "quantity": 0.001,
  "price": 50000
}
```

**Response:**
```json
{
  "success": true,
  "orderId": "order_abc123",
  "status": "FILLED",
  "filledQuantity": 0.001,
  "averagePrice": 49995.50,
  "timestamp": "2024-01-01T12:00:00Z"
}
```

### **Get Order History**
```http
GET /api/trading/orders?limit=50&offset=0
Cookie: cryptopulse.sid=sess_abc123
```

**Response:**
```json
{
  "orders": [
    {
      "orderId": "order_abc123",
      "symbol": "BTC/USDT",
      "side": "BUY",
      "type": "MARKET",
      "quantity": 0.001,
      "filledQuantity": 0.001,
      "averagePrice": 49995.50,
      "status": "FILLED",
      "timestamp": "2024-01-01T12:00:00Z"
    }
  ],
  "total": 150,
  "limit": 50,
  "offset": 0
}
```

---

## **Strategy Management**

### **Get Strategies**
```http
GET /api/strategies
Cookie: cryptopulse.sid=sess_abc123
```

**Response:**
```json
{
  "strategies": [
    {
      "id": "strategy_123",
      "name": "RSI Strategy",
      "description": "RSI-based trading strategy",
      "isActive": true,
      "riskLevel": "MEDIUM",
      "parameters": {
        "rsiPeriod": 14,
        "oversold": 30,
        "overbought": 70
      },
      "performance": {
        "totalTrades": 45,
        "successRate": 82.2,
        "profitLoss": 1250.75
      }
    }
  ]
}
```

### **Create Strategy**
```http
POST /api/strategies
Content-Type: application/json
X-CSRF-Token: csrf_xyz789
Cookie: cryptopulse.sid=sess_abc123

{
  "name": "Custom Strategy",
  "description": "Custom trading strategy",
  "riskLevel": "LOW",
  "parameters": {
    "rsiPeriod": 14,
    "oversold": 25,
    "overbought": 75
  }
}
```

**Response:**
```json
{
  "success": true,
  "strategy": {
    "id": "strategy_456",
    "name": "Custom Strategy",
    "description": "Custom trading strategy",
    "isActive": false,
    "riskLevel": "LOW",
    "parameters": {
      "rsiPeriod": 14,
      "oversold": 25,
      "overbought": 75
    },
    "createdAt": "2024-01-01T12:00:00Z"
  }
}
```

---

## **Market Data**

### **Get Market Data**
```http
GET /api/market/data?symbols=BTC/USDT,ETH/USDT
Cookie: cryptopulse.sid=sess_abc123
```

**Response:**
```json
{
  "data": [
    {
      "symbol": "BTC/USDT",
      "price": 49995.50,
      "change24h": 2.5,
      "volume24h": 1500000.75,
      "high24h": 51000.00,
      "low24h": 48500.00,
      "timestamp": "2024-01-01T12:00:00Z"
    }
  ]
}
```

### **Get Price History**
```http
GET /api/market/history?symbol=BTC/USDT&interval=1h&limit=100
Cookie: cryptopulse.sid=sess_abc123
```

**Response:**
```json
{
  "symbol": "BTC/USDT",
  "interval": "1h",
  "data": [
    {
      "timestamp": "2024-01-01T12:00:00Z",
      "open": 49500.00,
      "high": 50000.00,
      "low": 49000.00,
      "close": 49995.50,
      "volume": 150.75
    }
  ]
}
```

---

## **User Management**

### **Get User Profile**
```http
GET /api/user/profile
Cookie: cryptopulse.sid=sess_abc123
```

**Response:**
```json
{
  "id": "user123",
  "email": "user@example.com",
  "username": "trader123",
  "profile": {
    "firstName": "John",
    "lastName": "Doe",
    "country": "US",
    "timezone": "America/New_York"
  },
  "preferences": {
    "theme": "dark",
    "language": "en",
    "notifications": {
      "email": true,
      "push": true,
      "sms": false
    }
  },
  "account": {
    "tier": "premium",
    "createdAt": "2024-01-01T00:00:00Z",
    "lastLogin": "2024-01-01T12:00:00Z"
  }
}
```

### **Update User Profile**
```http
PUT /api/user/profile
Content-Type: application/json
X-CSRF-Token: csrf_xyz789
Cookie: cryptopulse.sid=sess_abc123

{
  "profile": {
    "firstName": "John",
    "lastName": "Smith"
  },
  "preferences": {
    "theme": "light"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "user": {
    "id": "user123",
    "profile": {
      "firstName": "John",
      "lastName": "Smith"
    },
    "preferences": {
      "theme": "light"
    }
  }
}
```

---

## **Monitoring & Analytics**

### **Get System Health**
```http
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00Z",
  "services": {
    "database": "healthy",
    "redis": "healthy",
    "external_apis": "healthy"
  },
  "metrics": {
    "uptime": 86400,
    "memory_usage": 75.5,
    "cpu_usage": 45.2
  }
}
```

### **Get Prometheus Metrics**
```http
GET /metrics
```

**Response:**
```
# HELP http_requests_total Total number of HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",route="/health",status_code="200"} 150

# HELP auth_attempts_total Total authentication attempts
# TYPE auth_attempts_total counter
auth_attempts_total{type="login",status="success"} 45
```

### **Get Monitoring Dashboard**
```http
GET /api/monitoring/dashboard
Cookie: cryptopulse.sid=sess_abc123
```

**Response:**
```json
{
  "health": {
    "status": "healthy",
    "uptime": 86400,
    "services": {
      "database": "healthy",
      "redis": "healthy",
      "external_apis": "healthy"
    }
  },
  "metrics": {
    "requests": {
      "total": 1500,
      "successful": 1425,
      "failed": 75,
      "success_rate": 95.0
    },
    "trading": {
      "total_orders": 150,
      "successful_orders": 128,
      "failed_orders": 22,
      "success_rate": 85.3
    },
    "performance": {
      "average_response_time": 125.5,
      "p95_response_time": 250.0,
      "p99_response_time": 500.0
    }
  },
  "alerts": [
    {
      "id": "alert_123",
      "severity": "warning",
      "message": "High memory usage detected",
      "timestamp": "2024-01-01T12:00:00Z"
    }
  ]
}
```

---

## **Admin Operations**

### **Get Audit Logs**
```http
GET /api/admin/audit-logs?limit=100&offset=0&type=USER_LOGIN
Authorization: Bearer admin_token
```

**Response:**
```json
{
  "logs": [
    {
      "id": "log_123",
      "eventType": "USER_LOGIN",
      "userId": "user123",
      "ipAddress": "192.168.1.100",
      "userAgent": "Mozilla/5.0...",
      "timestamp": "2024-01-01T12:00:00Z",
      "details": {
        "success": true,
        "method": "email"
      }
    }
  ],
  "total": 1500,
  "limit": 100,
  "offset": 0
}
```

### **Get Session Statistics**
```http
GET /api/admin/session-stats
Authorization: Bearer admin_token
```

**Response:**
```json
{
  "totalActiveSessions": 45,
  "sessionsByUser": {
    "user123": 1,
    "user456": 1
  },
  "sessionsByIP": {
    "192.168.1.100": 2,
    "192.168.1.101": 1
  },
  "averageSessionDuration": 3600,
  "sessionsCreatedToday": 25
}
```

---

## **Error Responses**

### **Validation Error (400)**
```json
{
  "success": false,
  "error": {
    "type": "ValidationError",
    "message": "Invalid input provided",
    "code": "VALIDATION_ERROR",
    "validationErrors": [
      {
        "field": "email",
        "message": "Invalid email format"
      },
      {
        "field": "password",
        "message": "Password must be at least 8 characters long"
      }
    ],
    "timestamp": "2024-01-01T12:00:00Z",
    "requestId": "req_abc123"
  }
}
```

### **Authentication Error (401)**
```json
{
  "success": false,
  "error": {
    "type": "AuthenticationError",
    "message": "Authentication failed",
    "code": "AUTH_ERROR",
    "timestamp": "2024-01-01T12:00:00Z",
    "requestId": "req_abc123"
  }
}
```

### **Rate Limit Error (429)**
```json
{
  "success": false,
  "error": {
    "type": "RateLimitError",
    "message": "Too many requests",
    "code": "RATE_LIMIT_ERROR",
    "retryAfter": 900,
    "limit": 100,
    "timestamp": "2024-01-01T12:00:00Z",
    "requestId": "req_abc123"
  }
}
```

### **Internal Server Error (500)**
```json
{
  "success": false,
  "error": {
    "type": "InternalServerError",
    "message": "Internal server error",
    "code": "INTERNAL_ERROR",
    "timestamp": "2024-01-01T12:00:00Z",
    "requestId": "req_abc123"
  }
}
```

---

## **Rate Limiting**

| Endpoint Category | Limit | Window |
|------------------|-------|--------|
| General API | 100 requests | 15 minutes |
| Authentication | 10 requests | 15 minutes |
| Trading | 30 requests | 15 minutes |
| File Upload | 5 requests | 15 minutes |
| Admin | 50 requests | 15 minutes |

**Headers:**
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Remaining requests in current window
- `X-RateLimit-Reset`: Time when the rate limit resets
- `Retry-After`: Seconds to wait before retrying (when rate limited)

---

## **WebSocket API**

### **Connection**
```javascript
const ws = new WebSocket('wss://api.cryptopulse.com/ws');

ws.onopen = function() {
  // Subscribe to market data
  ws.send(JSON.stringify({
    type: 'subscribe',
    channel: 'market_data',
    symbols: ['BTC/USDT', 'ETH/USDT']
  }));
};

ws.onmessage = function(event) {
  const data = JSON.parse(event.data);
  console.log('Received:', data);
};
```

### **Message Types**

**Market Data Update:**
```json
{
  "type": "market_data",
  "symbol": "BTC/USDT",
  "price": 49995.50,
  "change24h": 2.5,
  "volume24h": 1500000.75,
  "timestamp": "2024-01-01T12:00:00Z"
}
```

**Trade Update:**
```json
{
  "type": "trade_update",
  "orderId": "order_abc123",
  "status": "FILLED",
  "filledQuantity": 0.001,
  "averagePrice": 49995.50,
  "timestamp": "2024-01-01T12:00:00Z"
}
```

---

## **SDK Examples**

### **JavaScript/Node.js**
```javascript
const CryptoPulseAPI = require('cryptopulse-api');

const client = new CryptoPulseAPI({
  baseURL: 'https://api.cryptopulse.com',
  email: 'user@example.com',
  password: 'SecurePassword123!'
});

// Login
await client.login();

// Place trade
const order = await client.trading.placeOrder({
  symbol: 'BTC/USDT',
  side: 'BUY',
  type: 'MARKET',
  quantity: 0.001
});

// Get market data
const marketData = await client.market.getData(['BTC/USDT', 'ETH/USDT']);
```

### **Python**
```python
from cryptopulse_api import CryptoPulseAPI

client = CryptoPulseAPI(
    base_url='https://api.cryptopulse.com',
    email='user@example.com',
    password='SecurePassword123!'
)

# Login
client.login()

# Place trade
order = client.trading.place_order(
    symbol='BTC/USDT',
    side='BUY',
    type='MARKET',
    quantity=0.001
)

# Get market data
market_data = client.market.get_data(['BTC/USDT', 'ETH/USDT'])
```

---

## **Changelog**

### **v1.0.0** (2024-01-01)
- Initial API release
- Authentication system
- Trading operations
- Strategy management
- Market data endpoints
- User management
- Monitoring and analytics

---

## **Support**

For API support and questions:
- **Email**: api-support@cryptopulse.com
- **Documentation**: https://docs.cryptopulse.com
- **Status Page**: https://status.cryptopulse.com
