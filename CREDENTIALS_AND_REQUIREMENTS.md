# 🔐 CREDENTIALS & REQUIREMENTS FOR PRODUCTION DEPLOYMENT

## 📋 OVERVIEW
This document provides a complete list of all credentials, environment variables, and infrastructure requirements needed to deploy CryptoPulse to production.

---

## 🏗️ INFRASTRUCTURE REQUIREMENTS

### 1. **Back4App Account Setup**
- [ ] Create Back4App production account
- [ ] Create new Parse app for production
- [ ] Configure app settings and security
- [ ] Set up web hosting (optional)

### 2. **Domain & SSL Requirements**
- [ ] Register production domain name
- [ ] Set up SSL certificate (HTTPS required)
- [ ] Configure DNS records
- [ ] Set up CDN (optional but recommended)

### 3. **External Services Setup**
- [ ] **MongoDB Database** (Back4App provides)
- [ ] **Redis Cache** (for session management)
- [ ] **Cashfree Payment Gateway** account
- [ ] **Exchange API Accounts** (Binance, WazirX, CoinDCX)
- [ ] **Monitoring Services** (DataDog, PagerDuty, Slack)

---

## 🔑 BACKEND CREDENTIALS (Server-side only)

### **File Location**: `.env.production` (root directory)

```bash
# ==============================================
# BACK4APP CONFIGURATION
# ==============================================
BACK4APP_APP_ID=your_actual_back4app_app_id
BACK4APP_MASTER_KEY=your_actual_back4app_master_key
BACK4APP_JAVASCRIPT_KEY=your_actual_back4app_javascript_key
BACK4APP_SERVER_URL=https://parseapi.back4app.com

# ==============================================
# EXCHANGE API CREDENTIALS
# ==============================================
# Binance Trading API
BINANCE_API_KEY=your_binance_api_key
BINANCE_SECRET_KEY=your_binance_secret_key

# WazirX Trading API
WAZIRX_API_KEY=your_wazirx_api_key
WAZIRX_SECRET_KEY=your_wazirx_secret_key

# CoinDCX Trading API
COINDCX_API_KEY=your_coindcx_api_key
COINDCX_SECRET_KEY=your_coindcx_secret_key

# Delta Exchange Trading API (India approved)
DELTA_API_KEY=your_delta_api_key
DELTA_SECRET_KEY=your_delta_secret_key

# ==============================================
# PAYMENT INTEGRATION (Cashfree)
# ==============================================
CASHFREE_APP_ID=your_cashfree_app_id
CASHFREE_SECRET_KEY=your_cashfree_secret_key
CASHFREE_MODE=live
CASHFREE_WEBHOOK_SECRET=your_webhook_secret

# ==============================================
# SECURITY KEYS (Generate strong random values)
# ==============================================
JWT_SECRET=your_32_character_jwt_secret_key
ENCRYPTION_KEY=your_32_character_encryption_key
CSRF_SECRET=your_csrf_secret_key
SESSION_SECRET=your_session_secret_key

# ==============================================
# DATABASE & CACHE
# ==============================================
MONGODB_URI=your_mongodb_connection_string
REDIS_URL=your_redis_connection_string

# ==============================================
# EXTERNAL SERVICES
# ==============================================
# Slack Notifications
SLACK_WEBHOOK=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK

# Monitoring & Alerting
DATADOG_API_KEY=your_datadog_api_key
PAGERDUTY_INTEGRATION_KEY=your_pagerduty_key
SNYK_TOKEN=your_snyk_security_token

# ==============================================
# APPLICATION CONFIGURATION
# ==============================================
NODE_ENV=production
LOG_LEVEL=info
APM_LOG_LEVEL=info
CACHE_TTL=300000
RATE_LIMIT_WINDOW=3600000
MAX_REQUESTS_PER_WINDOW=1000

# ==============================================
# TESTING & DEVELOPMENT
# ==============================================
TEST_BASE_URL=http://localhost:3000
API_BASE_URL=https://parseapi.back4app.com/parse/functions
PARSE_APP_ID=test_app_id
PARSE_REST_API_KEY=test_rest_key
TEST_DATA_SIZE=1000
BACKUP_DIR=./backups

# ==============================================
# DOCKER CONFIGURATION
# ==============================================
PARSE_SERVER_APPLICATION_ID=your_parse_app_id
PARSE_SERVER_MASTER_KEY=your_parse_master_key
PARSE_SERVER_URL=https://parseapi.back4app.com

# URL Configuration
FRONTEND_URL=https://your-production-domain.com
BACKEND_URL=https://your-backend-domain.com
PRODUCTION_URL=https://your-production-domain.com
STAGING_URL=https://your-staging-domain.com

# ==============================================
# TRADING CONFIGURATION
# ==============================================
DEFAULT_PAIRS=BTC/USDT,ETH/USDT,ADA/USDT
DEFAULT_STRATEGY=AI_POWERED
RISK_LEVEL=MEDIUM
MAX_ORDER_AMOUNT=1000000
MIN_ORDER_AMOUNT=0.001

# ==============================================
# SECURITY CONFIGURATION
# ==============================================
ENABLE_2FA=true
SESSION_TIMEOUT=3600
PASSWORD_MIN_LENGTH=8
REQUIRE_SPECIAL_CHARS=true
REQUIRE_UPPERCASE=true
REQUIRE_NUMBERS=true

# ==============================================
# PERFORMANCE CONFIGURATION
# ==============================================
ENABLE_CACHING=true
ENABLE_COMPRESSION=true
ENABLE_CDN=true
BUNDLE_ANALYZER=false

# ==============================================
# FEATURE FLAGS
# ==============================================
ENABLE_AI_ASSISTANT=true
ENABLE_AUTOMATION=true
ENABLE_BACKTESTING=true
ENABLE_REAL_TRADING=true
ENABLE_NOTIFICATIONS=true
```

---

## 🎨 FRONTEND CREDENTIALS (Client-safe only)

### **File Location**: `frontend/.env.production`

```bash
# ==============================================
# BACK4APP CONFIGURATION (Client-safe only)
# ==============================================
VITE_PARSE_SERVER_APPLICATION_ID=your_actual_back4app_app_id
VITE_PARSE_SERVER_JAVASCRIPT_KEY=your_actual_back4app_javascript_key
VITE_PARSE_SERVER_URL=https://parseapi.back4app.com

# ==============================================
# CASHFREE PAYMENT CONFIGURATION
# ==============================================
VITE_CASHFREE_MODE=live
VITE_CASHFREE_SANDBOX_APP_ID=your_cashfree_sandbox_app_id
VITE_CASHFREE_LIVE_APP_ID=your_cashfree_live_app_id

# ==============================================
# APPLICATION CONFIGURATION
# ==============================================
VITE_APP_NAME=CryptoPulse Trading Bot
VITE_APP_VERSION=2.0.0
VITE_APP_ENVIRONMENT=production

# ==============================================
# API CONFIGURATION
# ==============================================
VITE_API_BASE_URL=https://parseapi.back4app.com/parse
VITE_CLOUD_FUNCTIONS_URL=https://parseapi.back4app.com/parse/functions

# ==============================================
# TRADING CONFIGURATION
# ==============================================
VITE_DEFAULT_PAIRS=BTC/USDT,ETH/USDT,ADA/USDT
VITE_DEFAULT_STRATEGY=AI_POWERED
VITE_RISK_LEVEL=MEDIUM

# ==============================================
# UI CONFIGURATION
# ==============================================
VITE_THEME=dark
VITE_LANGUAGE=en
VITE_CURRENCY=USD

# ==============================================
# SECURITY CONFIGURATION
# ==============================================
VITE_ENABLE_2FA=true
VITE_SESSION_TIMEOUT=3600

# ==============================================
# ENCRYPTION (32-character key)
# ==============================================
VITE_ENCRYPTION_KEY=your_32_character_encryption_key

# ==============================================
# DEVELOPMENT & TESTING
# ==============================================
VITE_HTTPS=false
VITE_ENABLE_LIVE_TRADING=false

# ==============================================
# TEST CREDENTIALS (Optional - for testing)
# ==============================================
VITE_TEST_PASSWORD=TestPassword123!
VITE_TEST_MARKET_KEY=test_market_key
VITE_TEST_MARKET_SECRET=test_market_secret
VITE_TEST_TRADE_KEY=test_trade_key
VITE_TEST_TRADE_SECRET=test_trade_secret

# ==============================================
# TEST API KEYS (For exchange integration testing)
# ==============================================
BINANCE_TEST_API_KEY=test_binance_key
BINANCE_TEST_SECRET_KEY=test_binance_secret
WAZIRX_TEST_API_KEY=test_wazirx_key
WAZIRX_TEST_SECRET_KEY=test_wazirx_secret
```

---

## 🔐 SECURITY REQUIREMENTS

### **Critical Security Notes:**

1. **❌ NEVER expose these in frontend:**
   - `BACK4APP_MASTER_KEY`
   - `BINANCE_SECRET_KEY`
   - `WAZIRX_SECRET_KEY`
   - `COINDCX_SECRET_KEY`
   - `CASHFREE_SECRET_KEY`
   - `JWT_SECRET`
   - `ENCRYPTION_KEY`

2. **✅ Safe for frontend:**
   - `BACK4APP_APP_ID`
   - `BACK4APP_JAVASCRIPT_KEY`
   - `CASHFREE_APP_ID`
   - Application configuration variables

3. **🔒 Generate strong secrets:**
   ```bash
   # Generate 32-character random strings
   openssl rand -hex 16  # For JWT_SECRET
   openssl rand -hex 16  # For ENCRYPTION_KEY
   ```

---

## 📊 CREDENTIAL VALIDATION

### **Run Security Audit:**
```bash
npm run security:audit
```

### **Validate All Secrets:**
```bash
npm run security:validate
```

### **Expected Results:**
- ✅ Security audit: 0 issues found
- ✅ All secrets: Valid and properly configured
- ✅ No hardcoded credentials detected

---

## 🏢 EXTERNAL SERVICE ACCOUNTS REQUIRED

### 1. **Back4App**
- **Purpose**: Backend hosting and database
- **Required**: Production app created
- **Credentials**: APP_ID, MASTER_KEY, JAVASCRIPT_KEY

### 2. **Cashfree Payments**
- **Purpose**: Payment processing
- **Required**: Live account with API access
- **Credentials**: APP_ID, SECRET_KEY

### 3. **Exchange APIs**
- **Binance**: Trading API access
- **WazirX**: Indian exchange integration
- **CoinDCX**: Alternative Indian exchange
- **Delta Exchange**: India approved derivatives exchange
- **Credentials**: API_KEY, SECRET_KEY for each

### 4. **Monitoring Services**
- **DataDog**: Application performance monitoring
- **PagerDuty**: Incident management
- **Slack**: Team notifications
- **Credentials**: API keys and webhook URLs

---

## 📋 CREDENTIAL CHECKLIST

### **Backend Environment Variables (39 required):**
- [ ] BACK4APP_APP_ID
- [ ] BACK4APP_MASTER_KEY
- [ ] BACK4APP_JAVASCRIPT_KEY
- [ ] BINANCE_API_KEY
- [ ] BINANCE_SECRET_KEY
- [ ] WAZIRX_API_KEY
- [ ] WAZIRX_SECRET_KEY
- [ ] COINDCX_API_KEY
- [ ] COINDCX_SECRET_KEY
- [ ] DELTA_API_KEY
- [ ] DELTA_SECRET_KEY
- [ ] CASHFREE_APP_ID
- [ ] CASHFREE_SECRET_KEY
- [ ] JWT_SECRET
- [ ] ENCRYPTION_KEY
- [ ] CSRF_SECRET
- [ ] SESSION_SECRET
- [ ] MONGODB_URI
- [ ] REDIS_URL
- [ ] SLACK_WEBHOOK
- [ ] DATADOG_API_KEY
- [ ] PAGERDUTY_INTEGRATION_KEY
- [ ] SNYK_TOKEN
- [ ] FRONTEND_URL
- [ ] BACKEND_URL
- [ ] PRODUCTION_URL
- [ ] STAGING_URL
- [ ] NODE_ENV=production
- [ ] LOG_LEVEL=info
- [ ] APM_LOG_LEVEL=info
- [ ] TEST_BASE_URL
- [ ] API_BASE_URL
- [ ] PARSE_APP_ID
- [ ] PARSE_REST_API_KEY
- [ ] TEST_DATA_SIZE
- [ ] BACKUP_DIR
- [ ] PARSE_SERVER_APPLICATION_ID
- [ ] PARSE_SERVER_MASTER_KEY
- [ ] PARSE_SERVER_URL

### **Frontend Environment Variables (17 required):**
- [ ] VITE_PARSE_SERVER_APPLICATION_ID
- [ ] VITE_PARSE_SERVER_JAVASCRIPT_KEY
- [ ] VITE_PARSE_SERVER_URL
- [ ] VITE_CASHFREE_MODE
- [ ] VITE_CASHFREE_LIVE_APP_ID
- [ ] VITE_APP_NAME
- [ ] VITE_APP_VERSION
- [ ] VITE_APP_ENVIRONMENT
- [ ] VITE_API_BASE_URL
- [ ] VITE_CLOUD_FUNCTIONS_URL
- [ ] VITE_DEFAULT_PAIRS
- [ ] VITE_DEFAULT_STRATEGY
- [ ] VITE_RISK_LEVEL
- [ ] VITE_THEME
- [ ] VITE_ENCRYPTION_KEY
- [ ] VITE_HTTPS
- [ ] VITE_ENABLE_LIVE_TRADING

### **Test Environment Variables (Optional - for testing):**
- [ ] VITE_TEST_PASSWORD
- [ ] VITE_TEST_MARKET_KEY
- [ ] VITE_TEST_MARKET_SECRET
- [ ] VITE_TEST_TRADE_KEY
- [ ] VITE_TEST_TRADE_SECRET
- [ ] BINANCE_TEST_API_KEY
- [ ] BINANCE_TEST_SECRET_KEY
- [ ] WAZIRX_TEST_API_KEY
- [ ] WAZIRX_TEST_SECRET_KEY

---

## ⚠️ IMPORTANT NOTES

1. **Never commit `.env` files** to version control
2. **Use strong, unique passwords** for all services
3. **Enable 2FA** on all external service accounts
4. **Rotate secrets regularly** (every 90 days)
5. **Monitor for security breaches** continuously
6. **Backup credentials securely** (use password managers)

---

## 🆘 EMERGENCY PROCEDURES

### **If Credentials are Compromised:**
1. Immediately rotate all affected credentials
2. Update environment variables in all environments
3. Redeploy application with new credentials
4. Monitor for unauthorized access
5. Review access logs for suspicious activity

### **Credential Recovery:**
- **Back4App**: Contact support for master key reset
- **Exchanges**: Use API key regeneration features
- **Cashfree**: Contact support for secret key reset
- **Monitoring**: Regenerate API keys from service dashboards

---

**📞 Support**: For credential-related issues, contact the development team or service providers directly.

**🔄 Last Updated**: $(date)
**📝 Version**: 1.0.0
