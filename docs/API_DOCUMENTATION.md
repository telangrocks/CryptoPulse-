# CryptoPulse API Documentation

## Overview

The CryptoPulse API provides comprehensive endpoints for cryptocurrency trading, portfolio management, and user authentication. This document covers all available endpoints, request/response formats, authentication, and error handling.

## Base URL

- **Development**: `http://localhost:3000`
- **Production**: `https://your-domain.com`

## Authentication

### Session-Based Authentication

CryptoPulse uses secure session-based authentication with CSRF protection.

#### Login
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
    "username": "username"
  },
  "sessionId": "session_abc123",
  "csrfToken": "csrf_xyz789"
}
```

#### Logout
```http
POST /api/auth/logout
Cookie: cryptopulse.sid=session_abc123
X-CSRF-Token: csrf_xyz789
```

### CSRF Protection

All state-changing operations require a CSRF token in the request header:

```http
X-CSRF-Token: your_csrf_token_here
```

## Trading Endpoints

### Get Trading Status
```http
GET /api/trading/status
Cookie: cryptopulse.sid=session_abc123
X-CSRF-Token: csrf_xyz789
```

**Response:**
```json
{
  "tradingEnabled": true,
  "liveTrading": false,
  "demoMode": true,
  "activeStrategies": ["RSI", "Moving Average"],
  "totalTrades": 150,
  "successRate": 85.5
}
```

### Place Order
```http
POST /api/trading/order
Content-Type: application/json
Cookie: cryptopulse.sid=session_abc123
X-CSRF-Token: csrf_xyz789

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
  "orderId": "order_12345",
  "status": "FILLED",
  "symbol": "BTC/USDT",
  "side": "BUY",
  "quantity": 0.001,
  "price": 50000,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Get Order History
```http
GET /api/trading/orders?limit=10&offset=0&symbol=BTC/USDT&status=FILLED
Cookie: cryptopulse.sid=session_abc123
X-CSRF-Token: csrf_xyz789
```

**Query Parameters:**
- `limit` (optional): Number of orders to return (default: 20, max: 100)
- `offset` (optional): Number of orders to skip (default: 0)
- `symbol` (optional): Filter by trading pair
- `status` (optional): Filter by order status

**Response:**
```json
{
  "orders": [
    {
      "orderId": "order_12345",
      "symbol": "BTC/USDT",
      "side": "BUY",
      "type": "MARKET",
      "quantity": 0.001,
      "price": 50000,
      "status": "FILLED",
      "timestamp": "2024-01-15T10:30:00Z"
    }
  ],
  "total": 150,
  "limit": 10,
  "offset": 0
}
```

### Cancel Order
```http
DELETE /api/trading/orders/{orderId}
Cookie: cryptopulse.sid=session_abc123
X-CSRF-Token: csrf_xyz789
```

**Response:**
```json
{
  "success": true,
  "message": "Order cancelled successfully"
}
```

### Get Trading Performance
```http
GET /api/trading/performance?startDate=2024-01-01&endDate=2024-01-31
Cookie: cryptopulse.sid=session_abc123
X-CSRF-Token: csrf_xyz789
```

**Query Parameters:**
- `startDate` (optional): Start date in ISO format
- `endDate` (optional): End date in ISO format

**Response:**
```json
{
  "totalTrades": 150,
  "successfulTrades": 128,
  "failedTrades": 22,
  "successRate": 85.33,
  "totalProfit": 1250.50,
  "averageProfit": 8.34,
  "winRate": 78.5,
  "lossRate": 21.5
}
```

## Market Data Endpoints

### Get Market Data
```http
GET /api/market/data?symbols=BTC/USDT,ETH/USDT
Cookie: cryptopulse.sid=session_abc123
```

**Query Parameters:**
- `symbols`: Comma-separated list of trading pairs

**Response:**
```json
{
  "data": [
    {
      "symbol": "BTC/USDT",
      "price": 50000.00,
      "change24h": 2.5,
      "volume24h": 1500000,
      "timestamp": "2024-01-15T10:30:00Z"
    }
  ]
}
```

## Portfolio Endpoints

### Get Portfolio Summary
```http
GET /api/portfolio/summary
Cookie: cryptopulse.sid=session_abc123
X-CSRF-Token: csrf_xyz789
```

**Response:**
```json
{
  "totalValue": 25000.00,
  "totalProfit": 1500.00,
  "profitPercentage": 6.38,
  "holdings": [
    {
      "symbol": "BTC",
      "quantity": 0.5,
      "value": 25000.00,
      "profit": 1500.00
    }
  ]
}
```

## User Management Endpoints

### Get User Profile
```http
GET /api/user/profile
Cookie: cryptopulse.sid=session_abc123
X-CSRF-Token: csrf_xyz789
```

**Response:**
```json
{
  "id": "user123",
  "email": "user@example.com",
  "username": "username",
  "firstName": "John",
  "lastName": "Doe",
  "timezone": "America/New_York",
  "createdAt": "2024-01-01T00:00:00Z"
}
```

### Update User Profile
```http
PUT /api/user/profile
Content-Type: application/json
Cookie: cryptopulse.sid=session_abc123
X-CSRF-Token: csrf_xyz789

{
  "firstName": "John",
  "lastName": "Doe",
  "timezone": "America/New_York"
}
```

## Monitoring Endpoints

### Health Check
```http
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "services": {
    "database": "healthy",
    "redis": "healthy",
    "external_apis": "healthy"
  },
  "uptime": 86400,
  "version": "1.0.0"
}
```

### Metrics
```http
GET /metrics
```

Returns Prometheus-formatted metrics.

## Error Handling

### Error Response Format

All errors follow a consistent format:

```json
{
  "success": false,
  "error": {
    "type": "ValidationError",
    "message": "Invalid input data",
    "code": "VALIDATION_ERROR",
    "details": {
      "field": "email",
      "reason": "Invalid email format"
    },
    "timestamp": "2024-01-15T10:30:00Z",
    "requestId": "req_abc123"
  }
}
```

### HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `429` - Too Many Requests
- `500` - Internal Server Error

### Error Types

- `ValidationError` - Input validation failed
- `AuthenticationError` - Authentication failed
- `AuthorizationError` - Insufficient permissions
- `RateLimitError` - Rate limit exceeded
- `NotFoundError` - Resource not found
- `InternalServerError` - Server error

## Rate Limiting

The API implements rate limiting to prevent abuse:

- **Authentication endpoints**: 5 requests per minute
- **Trading endpoints**: 30 requests per minute
- **General endpoints**: 100 requests per minute

Rate limit headers are included in responses:

```http
X-RateLimit-Limit: 30
X-RateLimit-Remaining: 25
X-RateLimit-Reset: 1642248600
```

## WebSocket API

### Connection
```javascript
const ws = new WebSocket('wss://your-domain.com/ws');

ws.onopen = function() {
  // Send authentication
  ws.send(JSON.stringify({
    type: 'auth',
    sessionId: 'session_abc123',
    csrfToken: 'csrf_xyz789'
  }));
};
```

### Message Types

#### Market Data Updates
```json
{
  "type": "market_data",
  "data": {
    "symbol": "BTC/USDT",
    "price": 50000.00,
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

#### Order Updates
```json
{
  "type": "order_update",
  "data": {
    "orderId": "order_12345",
    "status": "FILLED",
    "price": 50000.00,
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

#### Portfolio Updates
```json
{
  "type": "portfolio_update",
  "data": {
    "totalValue": 25000.00,
    "profit": 1500.00,
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

## SDK Examples

### JavaScript/TypeScript
```javascript
class CryptoPulseAPI {
  constructor(baseUrl, sessionId, csrfToken) {
    this.baseUrl = baseUrl;
    this.sessionId = sessionId;
    this.csrfToken = csrfToken;
  }

  async request(endpoint, options = {}) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Cookie': `cryptopulse.sid=${this.sessionId}`,
        'X-CSRF-Token': this.csrfToken,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    return response.json();
  }

  async placeOrder(orderData) {
    return this.request('/api/trading/order', {
      method: 'POST',
      body: JSON.stringify(orderData)
    });
  }

  async getOrderHistory(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/api/trading/orders?${queryString}`);
  }
}
```

### Python
```python
import requests
from typing import Dict, Any

class CryptoPulseAPI:
    def __init__(self, base_url: str, session_id: str, csrf_token: str):
        self.base_url = base_url
        self.session_id = session_id
        self.csrf_token = csrf_token
        self.session = requests.Session()
        self.session.cookies.set('cryptopulse.sid', session_id)
        self.session.headers.update({
            'X-CSRF-Token': csrf_token,
            'Content-Type': 'application/json'
        })

    def request(self, endpoint: str, method: str = 'GET', **kwargs) -> Dict[str, Any]:
        response = self.session.request(
            method, 
            f"{self.base_url}{endpoint}", 
            **kwargs
        )
        return response.json()

    def place_order(self, order_data: Dict[str, Any]) -> Dict[str, Any]:
        return self.request('/api/trading/order', 'POST', json=order_data)

    def get_order_history(self, **params) -> Dict[str, Any]:
        return self.request('/api/trading/orders', params=params)
```

## Testing

### Postman Collection

A Postman collection is available for testing the API:
- Import the collection from `docs/postman/CryptoPulse-API.postman_collection.json`
- Set up environment variables for base URL, session ID, and CSRF token

### cURL Examples

#### Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "SecurePassword123!"}'
```

#### Place Order
```bash
curl -X POST http://localhost:3000/api/trading/order \
  -H "Content-Type: application/json" \
  -H "Cookie: cryptopulse.sid=session_abc123" \
  -H "X-CSRF-Token: csrf_xyz789" \
  -d '{"symbol": "BTC/USDT", "side": "BUY", "type": "MARKET", "quantity": 0.001}'
```

## Changelog

### Version 1.0.0
- Initial API release
- Authentication and session management
- Trading endpoints
- Market data endpoints
- Portfolio management
- WebSocket support
- Rate limiting
- Comprehensive error handling