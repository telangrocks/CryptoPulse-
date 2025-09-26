# CryptoPulse Deployment Guide - Back4App

This guide provides step-by-step instructions for deploying CryptoPulse to Back4App in a production environment.

## 📋 Prerequisites

### Required Accounts
- [Back4App Account](https://back4app.com) (Free tier available)
- [GitHub Account](https://github.com) (for code repository)
- [Email Service](https://sendgrid.com) (for notifications - optional)

### Required Tools
- Node.js 18+ ([Download](https://nodejs.org))
- npm 9+ (comes with Node.js)
- Git ([Download](https://git-scm.com))
- Code Editor (VS Code recommended)

### System Requirements
- **Memory**: 512MB minimum, 1GB recommended
- **Storage**: 1GB minimum
- **Network**: Stable internet connection
- **OS**: Windows, macOS, or Linux

## 🚀 Step-by-Step Deployment

### Step 1: Prepare Your Environment

1. **Clone the Repository**
   ```bash
   git clone https://github.com/telangrocks/CryptoPulse-.git
   cd CryptoPulse-
   ```

2. **Install Dependencies**
   ```bash
   # Install root dependencies
   npm install
   
   # Install backend dependencies
   cd backend && npm install && cd ..
   
   # Install frontend dependencies
   cd frontend && npm install && cd ..
   ```

3. **Verify Installation**
   ```bash
   npm run health
   ```

### Step 2: Create Back4App Application

1. **Sign Up for Back4App**
   - Go to [Back4App](https://back4app.com)
   - Click "Sign Up" and create your account
   - Verify your email address

2. **Create New App**
   - Click "Create New App"
   - Choose "Build new app"
   - App Name: `CryptoPulse`
   - Description: `AI-Powered Cryptocurrency Trading Bot`
   - Choose your preferred region
   - Click "Create"

3. **Get Your Credentials**
   - Go to "App Settings" → "Security & Keys"
   - Copy the following:
     - Application ID
     - JavaScript Key
     - Master Key
     - Server URL

### Step 3: Configure Environment Variables

1. **Create Environment File**
   ```bash
   cp back4app-env.example .env
   ```

2. **Edit Environment Variables**
   ```bash
   nano .env
   ```

3. **Set Required Variables**
   ```env
   # Back4App Configuration
   BACK4APP_APP_ID=your-application-id-here
   BACK4APP_JAVASCRIPT_KEY=your-javascript-key-here
   BACK4APP_MASTER_KEY=your-master-key-here
   BACK4APP_SERVER_URL=https://parseapi.back4app.com/
   
   # Security Configuration
   JWT_SECRET=your-super-secret-jwt-key-change-in-production
   ENCRYPTION_KEY=your-encryption-key-32-chars-long
   CSRF_SECRET=your-csrf-secret-key
   
   # Application Configuration
   NODE_ENV=production
   LOG_LEVEL=info
   PORT=3000
   
   # External APIs
   BINANCE_API_URL=https://api.binance.com/api/v3
   COINBASE_API_URL=https://api.exchange.coinbase.com
   
   # Monitoring (Optional)
   EMAIL_ALERTS_ENABLED=false
   WEBHOOK_ALERTS_ENABLED=false
   SLACK_ALERTS_ENABLED=false
   ```

### Step 4: Configure Back4App Dashboard

1. **Set Environment Variables**
   - Go to "App Settings" → "Environment Variables"
   - Add all variables from your `.env` file
   - Click "Save" after adding each variable

2. **Configure Security Settings**
   - Go to "App Settings" → "Security & Keys"
   - Enable "Require Master Key"
   - Set "Client Class Creation" to "Disabled"
   - Set "Allow Custom Object ID" to "Disabled"
   - Set "Revoke Session on Password Reset" to "Enabled"

3. **Configure CORS**
   - Go to "App Settings" → "CORS"
   - Add your domain: `https://your-app-name.b4a.app`
   - Enable "Credentials"
   - Add methods: `GET, POST, PUT, DELETE, OPTIONS`

### Step 5: Deploy Cloud Functions

1. **Prepare Cloud Functions**
   ```bash
   # Ensure cloud functions are ready
   npm run validate
   ```

2. **Upload to Back4App**
   - Go to "Cloud Code" → "Functions"
   - Click "Upload" or "Deploy"
   - Upload the `cloud/main.js` file
   - Wait for deployment to complete

3. **Verify Deployment**
   - Go to "Cloud Code" → "Functions"
   - Check that all functions are listed:
     - `tradingBot`
     - `marketAnalysis`
     - `userAuthentication`
     - `portfolioManagement`
     - `riskAssessment`
     - `getCurrentPrice`
     - `getMarketData`
     - `getTradingSignals`
     - `getOrderHistory`
     - `getPortfolioPerformance`
     - `acceptDisclaimer`
     - `getDisclaimerStatus`
     - `getExchangeBalances`
     - `executeRealTrade`
     - `getExchangeOrderHistory`
     - `healthCheck`
     - `getSystemStatus`

### Step 6: Deploy Frontend

1. **Build Frontend**
   ```bash
   cd frontend
   npm run build:production
   cd ..
   ```

2. **Upload to Web Hosting**
   - Go to "Web Hosting" → "Files"
   - Upload the contents of `frontend/dist/` to the root directory
   - Ensure `index.html` is in the root

3. **Configure Web Hosting**
   - Go to "Web Hosting" → "Settings"
   - Set "Index File" to `index.html`
   - Enable "Single Page Application"
   - Set "Build Command" to `cd frontend && npm run build:production`

### Step 7: Configure Database

1. **Create Database Classes**
   - Go to "Database" → "Browser"
   - Create the following classes:
     - `User` (already exists)
     - `TradingBot`
     - `Portfolio`
     - `Transaction`
     - `Order`
     - `MarketData`
     - `TradingSignal`
     - `RiskAssessment`
     - `AuditLog`
     - `SystemHealth`

2. **Set Up Indexes**
   - Go to "Database" → "Indexes"
   - Create indexes for performance:
     - `Order`: `userId`, `createdAt`
     - `MarketData`: `pair`, `timestamp`
     - `AuditLog`: `userId`, `action`, `timestamp`

3. **Configure Permissions**
   - Go to "Database" → "Security"
   - Set appropriate read/write permissions for each class
   - Enable "Require Master Key" for sensitive operations

### Step 8: Set Up Monitoring

1. **Configure Health Checks**
   - Go to "Cloud Code" → "Jobs"
   - Create a new job:
     - Name: `healthCheck`
     - Schedule: `*/5 * * * *` (every 5 minutes)
     - Function: `healthCheck`

2. **Set Up Alerts**
   - Go to "App Settings" → "Notifications"
   - Configure email notifications for critical alerts
   - Set up webhook notifications (optional)

3. **Enable Analytics**
   - Go to "Analytics" → "Settings"
   - Enable "Parse Analytics"
   - Enable "Custom Events"

### Step 9: Test Deployment

1. **Test Health Check**
   ```bash
   curl https://your-app-name.b4a.app/health
   ```

2. **Test API Endpoints**
   ```bash
   # Test system status
   curl https://your-app-name.b4a.app/functions/getSystemStatus
   
   # Test market data
   curl -X POST https://your-app-name.b4a.app/functions/getCurrentPrice \
     -H "Content-Type: application/json" \
     -d '{"pair": "BTC/USDT"}'
   ```

3. **Test Frontend**
   - Open your app URL: `https://your-app-name.b4a.app`
   - Verify the app loads correctly
   - Test user registration and login
   - Test trading functionality

### Step 10: Production Optimization

1. **Enable CDN**
   - Go to "Web Hosting" → "CDN"
   - Enable CDN for static assets
   - Configure cache headers

2. **Set Up SSL**
   - SSL is automatically provided by Back4App
   - Verify HTTPS is working: `https://your-app-name.b4a.app`

3. **Configure Rate Limiting**
   - Go to "App Settings" → "Rate Limiting"
   - Set appropriate limits for your use case
   - Monitor usage in the dashboard

4. **Set Up Backup**
   - Go to "Database" → "Backup"
   - Enable automatic backups
   - Set backup frequency (daily recommended)

## 🔧 Configuration Reference

### Back4App Configuration (`back4app.json`)

```json
{
  "appName": "CryptoPulse",
  "version": "2.0.0",
  "parseVersion": "3.5.1",
  "cloudCode": {
    "main": "cloud/main.js",
    "functions": [
      "tradingBot",
      "marketAnalysis",
      "userAuthentication",
      "portfolioManagement",
      "riskAssessment",
      "getCurrentPrice",
      "getMarketData",
      "getTradingSignals",
      "getOrderHistory",
      "getPortfolioPerformance",
      "acceptDisclaimer",
      "getDisclaimerStatus",
      "getExchangeBalances",
      "executeRealTrade",
      "getExchangeOrderHistory",
      "healthCheck",
      "getSystemStatus"
    ],
    "jobs": [
      {
        "name": "marketDataSync",
        "schedule": "0 */5 * * * *",
        "description": "Sync market data every 5 minutes"
      },
      {
        "name": "riskAssessment",
        "schedule": "0 0 */6 * * *",
        "description": "Run risk assessment every 6 hours"
      },
      {
        "name": "cleanupOldData",
        "schedule": "0 0 2 * * *",
        "description": "Clean up old data daily at 2 AM"
      }
    ]
  },
  "webHosting": {
    "public": "frontend-dist",
    "index": "index.html",
    "spa": true,
    "buildCommand": "cd frontend && npm run build:production",
    "installCommand": "cd frontend && npm ci --production=false"
  },
  "database": {
    "adapter": "mongo",
    "collections": [
      "User",
      "TradingBot",
      "Portfolio",
      "Transaction",
      "Order",
      "MarketData",
      "TradingSignal",
      "RiskAssessment",
      "AuditLog",
      "SystemHealth"
    ],
    "indexes": [
      {
        "collection": "Order",
        "fields": ["userId", "createdAt"],
        "options": { "background": true }
      },
      {
        "collection": "MarketData",
        "fields": ["pair", "timestamp"],
        "options": { "background": true }
      },
      {
        "collection": "AuditLog",
        "fields": ["userId", "action", "timestamp"],
        "options": { "background": true }
      }
    ]
  },
  "security": {
    "cors": {
      "origin": ["https://cryptopulse.b4a.app", "https://cryptopulse.app"],
      "credentials": true,
      "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      "allowedHeaders": ["Content-Type", "Authorization", "X-Requested-With", "X-CSRF-Token"]
    },
    "rateLimit": {
      "requests": 1000,
      "window": 3600,
      "burst": 100
    },
    "apiSecurity": {
      "requireMasterKey": true,
      "allowClientClassCreation": false,
      "allowCustomObjectId": false,
      "allowExpiredAuthDataToken": false,
      "revokeSessionOnPasswordReset": true,
      "maxLimit": 1000
    },
    "passwordPolicy": {
      "minLength": 8,
      "requireUppercase": true,
      "requireLowercase": true,
      "requireNumbers": true,
      "requireSpecialChars": true
    }
  },
  "features": {
    "cloudCode": true,
    "webHosting": true,
    "pushNotifications": true,
    "analytics": true,
    "fileStorage": true,
    "liveQuery": true,
    "hooks": true,
    "jobs": true
  },
  "environment": {
    "NODE_ENV": "production",
    "LOG_LEVEL": "info",
    "CACHE_TTL": "300000",
    "RATE_LIMIT_WINDOW": "3600000",
    "MAX_REQUESTS_PER_WINDOW": "1000"
  },
  "monitoring": {
    "healthCheck": {
      "endpoint": "/health",
      "interval": 30000
    },
    "metrics": {
      "enabled": true,
      "retention": "30d"
    },
    "alerts": {
      "enabled": true,
      "channels": ["email", "webhook"]
    }
  }
}
```

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `BACK4APP_APP_ID` | Back4App Application ID | Yes | - |
| `BACK4APP_JAVASCRIPT_KEY` | Back4App JavaScript Key | Yes | - |
| `BACK4APP_MASTER_KEY` | Back4App Master Key | Yes | - |
| `BACK4APP_SERVER_URL` | Back4App Server URL | Yes | `https://parseapi.back4app.com/` |
| `JWT_SECRET` | JWT signing secret | Yes | - |
| `ENCRYPTION_KEY` | Data encryption key | Yes | - |
| `CSRF_SECRET` | CSRF protection secret | Yes | - |
| `NODE_ENV` | Environment | No | `production` |
| `LOG_LEVEL` | Logging level | No | `info` |
| `PORT` | Server port | No | `3000` |
| `BINANCE_API_URL` | Binance API URL | No | `https://api.binance.com/api/v3` |
| `COINBASE_API_URL` | Coinbase API URL | No | `https://api.exchange.coinbase.com` |
| `EMAIL_ALERTS_ENABLED` | Enable email alerts | No | `false` |
| `WEBHOOK_ALERTS_ENABLED` | Enable webhook alerts | No | `false` |
| `SLACK_ALERTS_ENABLED` | Enable Slack alerts | No | `false` |

## 🚨 Troubleshooting

### Common Issues

1. **Deployment Fails**
   - Check environment variables are set correctly
   - Verify all dependencies are installed
   - Check Back4App logs for errors

2. **Functions Not Working**
   - Verify cloud functions are deployed
   - Check function names match exactly
   - Verify environment variables are set

3. **Frontend Not Loading**
   - Check web hosting configuration
   - Verify build files are uploaded
   - Check CORS settings

4. **Database Issues**
   - Verify database classes are created
   - Check permissions are set correctly
   - Verify indexes are created

5. **Authentication Issues**
   - Check Parse configuration
   - Verify user registration is working
   - Check session management

### Debug Commands

```bash
# Check system health
npm run health

# Validate configuration
npm run validate

# Run tests
npm test

# Check logs
npm run logs

# Monitor performance
npm run monitor
```

### Getting Help

- **Back4App Documentation**: [docs.back4app.com](https://docs.back4app.com)
- **GitHub Issues**: [github.com/telangrocks/CryptoPulse-/issues](https://github.com/telangrocks/CryptoPulse-/issues)
- **Community Forum**: [community.back4app.com](https://community.back4app.com)

## 📊 Monitoring & Maintenance

### Health Monitoring

1. **Health Check Endpoint**
   - URL: `https://your-app-name.b4a.app/health`
   - Frequency: Every 5 minutes
   - Alerts: Email/Slack on failure

2. **System Status**
   - URL: `https://your-app-name.b4a.app/functions/getSystemStatus`
   - Monitor: CPU, memory, uptime
   - Alerts: High resource usage

3. **Trading Metrics**
   - Monitor: Trade success rate, volume, profit
   - Alerts: Unusual trading patterns

### Maintenance Tasks

1. **Daily**
   - Check health status
   - Review error logs
   - Monitor performance metrics

2. **Weekly**
   - Review security logs
   - Check backup status
   - Update dependencies

3. **Monthly**
   - Security audit
   - Performance review
   - Capacity planning

### Backup & Recovery

1. **Database Backup**
   - Automatic daily backups
   - Manual backup before major changes
   - Test restore procedures

2. **Code Backup**
   - Git repository backup
   - Cloud function backups
   - Configuration backups

3. **Disaster Recovery**
   - Document recovery procedures
   - Test recovery scenarios
   - Maintain recovery contacts

## 🔒 Security Checklist

- [ ] All secrets stored in environment variables
- [ ] No hardcoded credentials
- [ ] HTTPS enabled
- [ ] CORS configured correctly
- [ ] Rate limiting enabled
- [ ] Input validation implemented
- [ ] Authentication required for sensitive operations
- [ ] Audit logging enabled
- [ ] Security headers configured
- [ ] Regular security updates
- [ ] Penetration testing completed
- [ ] Incident response plan documented

## 📈 Performance Optimization

- [ ] CDN enabled for static assets
- [ ] Database indexes created
- [ ] Caching implemented
- [ ] Code splitting enabled
- [ ] Lazy loading implemented
- [ ] Bundle size optimized
- [ ] Image optimization enabled
- [ ] Gzip compression enabled
- [ ] Performance monitoring active
- [ ] Load testing completed

---

**Deployment completed successfully! 🎉**

Your CryptoPulse application is now running on Back4App with production-ready security, monitoring, and performance optimizations.
