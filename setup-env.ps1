# =============================================================================
# CryptoPulse Environment Setup Script
# =============================================================================
# This script helps you set up production-ready .env files for CryptoPulse
# Run this script to create properly configured .env files

Write-Host "🚀 Setting up CryptoPulse Environment Files..." -ForegroundColor Green

# Generate secure random keys
Write-Host "🔐 Generating secure random keys..." -ForegroundColor Yellow

$jwtSecret = -join ((1..64) | ForEach {[char]((65..90) + (97..122) + (48..57) | Get-Random)})
$encryptionKey = -join ((1..32) | ForEach {[char]((65..90) + (97..122) + (48..57) | Get-Random)})
$csrfSecret = -join ((1..32) | ForEach {[char]((65..90) + (97..122) + (48..57) | Get-Random)})
$sessionSecret = -join ((1..32) | ForEach {[char]((65..90) + (97..122) + (48..57) | Get-Random)})

Write-Host "✅ Generated secure keys" -ForegroundColor Green

# Create backend .env file
Write-Host "📝 Creating backend .env file..." -ForegroundColor Yellow

$backendEnv = @"
# =============================================================================
# CryptoPulse Backend Environment Configuration - PRODUCTION READY
# =============================================================================
# This file contains all environment variables required for the CryptoPulse backend
# 
# IMPORTANT SECURITY NOTES:
# - Never commit .env files to version control
# - Use strong, unique values for all secrets
# - Rotate keys regularly in production
# - Store production secrets in secure secret management systems
# =============================================================================

# =============================================================================
# BACK4APP CONFIGURATION (REQUIRED) - PRODUCTION VALUES
# =============================================================================
# These are the core Back4App credentials required for Parse Server integration
# Obtain these values from: Back4App Dashboard > Your App > App Settings > Security & Keys

# Application ID - Unique identifier for your Back4App application
# Location: Back4App Dashboard > App Settings > Security & Keys > Application ID
BACK4APP_APP_ID=vCaSfrlHLY8xevRt2KH2Wg7I7hRIqKMY0UssPVC1

# Master Key - Full access key for server-side operations (KEEP SECRET!)
# Location: Back4App Dashboard > App Settings > Security & Keys > Master Key
# WARNING: This key has full database access - never expose to frontend
# REPLACE WITH YOUR ACTUAL MASTER KEY FROM BACK4APP DASHBOARD
BACK4APP_MASTER_KEY=YOUR_ACTUAL_MASTER_KEY_FROM_BACK4APP_DASHBOARD

# JavaScript Key - Client-side key for frontend integration
# Location: Back4App Dashboard > App Settings > Security & Keys > JavaScript Key
BACK4APP_JAVASCRIPT_KEY=l9BxFwYIloWojfjUGAk4oir2u0R0jxaKOdUWe1Vz

# Client Key - Alternative client key for mobile/web apps
# Location: Back4App Dashboard > App Settings > Security & Keys > Client Key
BACK4APP_CLIENT_KEY=4jsNlzxVKmoOe9s23tRDejWUBYMX4y3hnv3TUMvO

# REST API Key - For REST API calls (server-side only)
# Location: Back4App Dashboard > App Settings > Security & Keys > REST API Key
# WARNING: This key has full database access - never expose to frontend
# REPLACE WITH YOUR ACTUAL REST API KEY FROM BACK4APP DASHBOARD
BACK4APP_REST_API_KEY=YOUR_ACTUAL_REST_API_KEY_FROM_BACK4APP_DASHBOARD

# Parse Server URL - Back4App API endpoint
# Location: Back4App Dashboard > App Settings > Security & Keys > Server URL
BACK4APP_SERVER_URL=https://parseapi.back4app.com

# =============================================================================
# EXCHANGE API CREDENTIALS (REQUIRED FOR TRADING)
# =============================================================================
# These credentials are required for cryptocurrency exchange integration
# Obtain from respective exchange dashboards

# Binance API Configuration
# Location: Binance > Account > API Management > Create API
BINANCE_API_KEY=YOUR_BINANCE_API_KEY_HERE
BINANCE_SECRET_KEY=YOUR_BINANCE_SECRET_KEY_HERE
BINANCE_TESTNET_API_KEY=YOUR_BINANCE_TESTNET_API_KEY_HERE
BINANCE_TESTNET_SECRET_KEY=YOUR_BINANCE_TESTNET_SECRET_KEY_HERE

# WazirX API Configuration (Indian Exchange)
# Location: WazirX > Account > API Keys > Create New API Key
WAZIRX_API_KEY=YOUR_WAZIRX_API_KEY_HERE
WAZIRX_SECRET_KEY=YOUR_WAZIRX_SECRET_KEY_HERE

# CoinDCX API Configuration (Indian Exchange)
# Location: CoinDCX > Account > API Management > Create API Key
COINDCX_API_KEY=YOUR_COINDCX_API_KEY_HERE
COINDCX_SECRET_KEY=YOUR_COINDCX_SECRET_KEY_HERE

# Delta Exchange API Configuration
# Location: Delta Exchange > Account > API Keys > Create New Key
DELTA_API_KEY=YOUR_DELTA_API_KEY_HERE
DELTA_SECRET_KEY=YOUR_DELTA_SECRET_KEY_HERE

# =============================================================================
# SECURITY CONFIGURATION (REQUIRED) - GENERATED SECURE VALUES
# =============================================================================
# These are critical security keys for encryption, authentication, and session management

# JWT Secret - For token signing and verification
JWT_SECRET=$jwtSecret

# Encryption Key - For sensitive data encryption
ENCRYPTION_KEY=$encryptionKey

# CSRF Secret - For Cross-Site Request Forgery protection
CSRF_SECRET=$csrfSecret

# Session Secret - For session management
SESSION_SECRET=$sessionSecret

# =============================================================================
# CASHFREE PAYMENT INTEGRATION (REQUIRED FOR SUBSCRIPTIONS)
# =============================================================================
# Cashfree is used for subscription payments and billing
# Obtain from: Cashfree Dashboard > Settings > API Keys

CASHFREE_APP_ID=YOUR_CASHFREE_APP_ID_HERE
CASHFREE_SECRET_KEY=YOUR_CASHFREE_SECRET_KEY_HERE
CASHFREE_MODE=sandbox
CASHFREE_WEBHOOK_SECRET=YOUR_CASHFREE_WEBHOOK_SECRET_HERE

# =============================================================================
# EXTERNAL SERVICES & MONITORING (OPTIONAL BUT RECOMMENDED)
# =============================================================================
# These services enhance monitoring, alerting, and security

# Slack Integration for Alerts
# Location: Slack > Apps > Incoming Webhooks > Add to Slack
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK

# DataDog APM Integration
# Location: DataDog > Integrations > APIs > Application Keys
DATADOG_API_KEY=YOUR_DATADOG_API_KEY_HERE

# PagerDuty for Critical Alerts
# Location: PagerDuty > Integrations > API Access > Create API Key
PAGERDUTY_INTEGRATION_KEY=YOUR_PAGERDUTY_KEY_HERE

# Snyk for Security Scanning
# Location: Snyk > Account Settings > API Token
SNYK_TOKEN=YOUR_SNYK_TOKEN_HERE

# =============================================================================
# DATABASE CONFIGURATION (OPTIONAL - Back4App provides MongoDB)
# =============================================================================
# These are optional if you need additional database connections
# Back4App provides MongoDB by default

MONGODB_URI=mongodb://your-mongodb-connection-string
REDIS_URL=redis://your-redis-connection-string

# =============================================================================
# APPLICATION CONFIGURATION
# =============================================================================

# Environment - Controls application behavior
NODE_ENV=production

# Logging Configuration
LOG_LEVEL=info
APM_LOG_LEVEL=info

# Performance Configuration
CACHE_TTL=300000
RATE_LIMIT_WINDOW=3600000
MAX_REQUESTS_PER_WINDOW=1000

# URLs for webhooks and redirects
FRONTEND_URL=https://your-production-domain.com
BACKEND_URL=https://your-backend-domain.com
STAGING_URL=https://your-staging-domain.com

# =============================================================================
# TRADING CONFIGURATION
# =============================================================================
# Default trading parameters and risk management

DEFAULT_PAIRS=BTC/USDT,ETH/USDT,ADA/USDT,BNB/USDT
DEFAULT_STRATEGY=AI_POWERED
RISK_LEVEL=MEDIUM
MAX_ORDER_AMOUNT=1000000
MIN_ORDER_AMOUNT=0.001

# =============================================================================
# SECURITY POLICIES
# =============================================================================
# Password and authentication requirements

ENABLE_2FA=true
SESSION_TIMEOUT=3600
PASSWORD_MIN_LENGTH=8
REQUIRE_SPECIAL_CHARS=true
REQUIRE_UPPERCASE=true
REQUIRE_NUMBERS=true

# =============================================================================
# PERFORMANCE & FEATURES
# =============================================================================
# Feature flags and performance optimizations

ENABLE_CACHING=true
ENABLE_COMPRESSION=true
ENABLE_CDN=true
BUNDLE_ANALYZER=false

# Feature Toggles
ENABLE_AI_ASSISTANT=true
ENABLE_AUTOMATION=true
ENABLE_BACKTESTING=true
ENABLE_REAL_TRADING=false
ENABLE_NOTIFICATIONS=true

# =============================================================================
# TESTING CONFIGURATION
# =============================================================================
# Configuration for testing and development

TEST_BASE_URL=http://localhost:3000
API_BASE_URL=https://parseapi.back4app.com/parse/functions
TEST_DATA_SIZE=1000
BACKUP_DIR=./backups

# =============================================================================
# DOCKER CONFIGURATION (LEGACY SUPPORT)
# =============================================================================
# These variables are maintained for Docker compatibility

PARSE_SERVER_APPLICATION_ID=vCaSfrlHLY8xevRt2KH2Wg7I7hRIqKMY0UssPVC1
PARSE_SERVER_MASTER_KEY=YOUR_ACTUAL_MASTER_KEY_FROM_BACK4APP_DASHBOARD
PARSE_SERVER_URL=https://parseapi.back4app.com
"@

$backendEnv | Out-File -FilePath ".env" -Encoding UTF8
Write-Host "✅ Backend .env file created" -ForegroundColor Green

# Create frontend .env file
Write-Host "📝 Creating frontend .env file..." -ForegroundColor Yellow

$frontendEnv = @"
# =============================================================================
# CryptoPulse Frontend Environment Configuration - PRODUCTION READY
# =============================================================================
# This file contains ONLY client-safe environment variables for the frontend
# 
# SECURITY WARNING:
# - NEVER include Master Key or REST API Key in frontend environment variables
# - These variables are exposed to the browser and visible to users
# - Only include variables that are safe for client-side use
# =============================================================================

# =============================================================================
# BACK4APP CLIENT CONFIGURATION (REQUIRED) - PRODUCTION VALUES
# =============================================================================
# These are the ONLY Back4App credentials safe for frontend use
# Obtain these values from: Back4App Dashboard > Your App > App Settings > Security & Keys

# Application ID - Unique identifier for your Back4App application
# Location: Back4App Dashboard > App Settings > Security & Keys > Application ID
# Safe for frontend: Yes (public identifier)
VITE_BACK4APP_APP_ID=vCaSfrlHLY8xevRt2KH2Wg7I7hRIqKMY0UssPVC1

# Client Key - Safe client-side key for frontend integration
# Location: Back4App Dashboard > App Settings > Security & Keys > Client Key
# Safe for frontend: Yes (designed for client-side use)
VITE_BACK4APP_CLIENT_KEY=4jsNlzxVKmoOe9s23tRDejWUBYMX4y3hnv3TUMvO

# JavaScript Key - Alternative client-side key
# Location: Back4App Dashboard > App Settings > Security & Keys > JavaScript Key
# Safe for frontend: Yes (designed for client-side use)
VITE_BACK4APP_JAVASCRIPT_KEY=l9BxFwYIloWojfjUGAk4oir2u0R0jxaKOdUWe1Vz

# Parse Server URL - Back4App API endpoint
# Location: Back4App Dashboard > App Settings > Security & Keys > Server URL
# Safe for frontend: Yes (public endpoint)
VITE_BACK4APP_SERVER_URL=https://parseapi.back4app.com

# =============================================================================
# SECURITY WARNING - DO NOT INCLUDE THESE IN FRONTEND
# =============================================================================
# The following variables are INTENTIONALLY EXCLUDED for security reasons:
# - VITE_BACK4APP_MASTER_KEY (has full database access - SERVER-SIDE ONLY)
# - VITE_BACK4APP_REST_API_KEY (has full database access - SERVER-SIDE ONLY)
# - Any exchange API keys or secrets (SERVER-SIDE ONLY)
# - Any encryption keys or JWT secrets (SERVER-SIDE ONLY)

# =============================================================================
# CASHFREE PAYMENT CONFIGURATION (CLIENT-SAFE)
# =============================================================================
# These are safe for frontend as they only contain public identifiers
# Obtain from: Cashfree Dashboard > Settings > API Keys

# Payment Mode - Controls sandbox vs live environment
VITE_CASHFREE_MODE=sandbox

# Sandbox App ID - For testing payments
# Location: Cashfree Dashboard > Settings > API Keys > Sandbox App ID
VITE_CASHFREE_SANDBOX_APP_ID=YOUR_SANDBOX_APP_ID_HERE

# Live App ID - For production payments
# Location: Cashfree Dashboard > Settings > API Keys > Live App ID
VITE_CASHFREE_LIVE_APP_ID=YOUR_LIVE_APP_ID_HERE

# =============================================================================
# APPLICATION CONFIGURATION (CLIENT-SAFE)
# =============================================================================
# These variables control frontend behavior and are safe to expose

# Application Information
VITE_APP_NAME=CryptoPulse Trading Bot
VITE_APP_VERSION=2.0.0
VITE_APP_ENVIRONMENT=production

# Frontend URL Configuration
VITE_FRONTEND_URL=https://your-production-domain.com
VITE_API_BASE_URL=https://parseapi.back4app.com/parse
VITE_CLOUD_FUNCTIONS_URL=https://parseapi.back4app.com/parse/functions

# =============================================================================
# TRADING CONFIGURATION (CLIENT-SAFE)
# =============================================================================
# Default trading parameters (safe to expose as they're just defaults)

# Default Trading Pairs
VITE_DEFAULT_PAIRS=BTC/USDT,ETH/USDT,ADA/USDT,BNB/USDT

# Default Strategy
VITE_DEFAULT_STRATEGY=AI_POWERED

# Risk Level
VITE_RISK_LEVEL=MEDIUM

# =============================================================================
# USER INTERFACE CONFIGURATION (CLIENT-SAFE)
# =============================================================================
# UI preferences and theming

# Theme Configuration
VITE_THEME=dark
VITE_LANGUAGE=en
VITE_CURRENCY=USD

# Feature Flags (Client-Safe)
VITE_ENABLE_AI_ASSISTANT=true
VITE_ENABLE_AUTOMATION=true
VITE_ENABLE_BACKTESTING=true
VITE_ENABLE_NOTIFICATIONS=true

# =============================================================================
# SECURITY CONFIGURATION (CLIENT-SAFE)
# =============================================================================
# Security settings that are safe to expose (not secrets)

# 2FA Configuration
VITE_ENABLE_2FA=true

# Session Timeout (in seconds)
VITE_SESSION_TIMEOUT=3600

# Password Requirements (for validation display)
VITE_PASSWORD_MIN_LENGTH=8
VITE_REQUIRE_SPECIAL_CHARS=true
VITE_REQUIRE_UPPERCASE=true
VITE_REQUIRE_NUMBERS=true

# =============================================================================
# DEVELOPMENT & TESTING (CLIENT-SAFE)
# =============================================================================
# Development and testing configuration

# Development Settings
VITE_HTTPS=false
VITE_ENABLE_LIVE_TRADING=false
VITE_DEBUG_MODE=false

# Test Configuration (for demo/testing purposes only)
VITE_TEST_MODE=false
VITE_DEMO_ACCOUNT_ENABLED=true

# =============================================================================
# PERFORMANCE CONFIGURATION (CLIENT-SAFE)
# =============================================================================
# Performance and optimization settings

# Caching Configuration
VITE_ENABLE_CACHING=true
VITE_CACHE_TTL=300000

# Bundle Configuration
VITE_BUNDLE_ANALYZER=false
VITE_SOURCE_MAP=false

# =============================================================================
# ANALYTICS & MONITORING (CLIENT-SAFE)
# =============================================================================
# Analytics and monitoring configuration (public identifiers only)

# Analytics (if using public analytics services)
VITE_ANALYTICS_ENABLED=true
VITE_ANALYTICS_ID=YOUR_ANALYTICS_ID_HERE

# Error Reporting (public identifiers only)
VITE_ERROR_REPORTING_ENABLED=true
VITE_ERROR_REPORTING_URL=https://your-error-reporting-service.com

# =============================================================================
# FEATURE CONFIGURATION (CLIENT-SAFE)
# =============================================================================
# Feature toggles and configuration

# Trading Features
VITE_ENABLE_REAL_TRADING=false
VITE_ENABLE_PAPER_TRADING=true
VITE_ENABLE_DEMO_MODE=true

# UI Features
VITE_ENABLE_DARK_MODE=true
VITE_ENABLE_NOTIFICATIONS=true
VITE_ENABLE_SOUNDS=true

# =============================================================================
# EXTERNAL INTEGRATIONS (CLIENT-SAFE)
# =============================================================================
# External service configurations (public endpoints only)

# Chart Configuration
VITE_CHART_PROVIDER=tradingview
VITE_CHART_THEME=dark

# News API (if using public news services)
VITE_NEWS_API_ENABLED=true
VITE_NEWS_API_URL=https://api.news-service.com

# =============================================================================
# LEGACY SUPPORT (CLIENT-SAFE)
# =============================================================================
# Legacy variable names for backward compatibility

# Parse Server Legacy Variables
VITE_PARSE_SERVER_APPLICATION_ID=vCaSfrlHLY8xevRt2KH2Wg7I7hRIqKMY0UssPVC1
VITE_PARSE_SERVER_JAVASCRIPT_KEY=l9BxFwYIloWojfjUGAk4oir2u0R0jxaKOdUWe1Vz
VITE_PARSE_SERVER_URL=https://parseapi.back4app.com
"@

$frontendEnv | Out-File -FilePath "frontend\.env" -Encoding UTF8
Write-Host "✅ Frontend .env file created" -ForegroundColor Green

# Verify .gitignore includes .env files
Write-Host "🔍 Verifying .gitignore configuration..." -ForegroundColor Yellow

if (Test-Path ".gitignore") {
    $gitignoreContent = Get-Content ".gitignore" -Raw
    if ($gitignoreContent -match "\.env") {
        Write-Host "✅ .env files are properly excluded from version control" -ForegroundColor Green
    } else {
        Write-Host "⚠️  WARNING: .env files may not be excluded from version control" -ForegroundColor Red
        Write-Host "   Please add '.env' to your .gitignore file" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠️  WARNING: No .gitignore file found" -ForegroundColor Red
    Write-Host "   Please create a .gitignore file and add '.env'" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🎉 Environment setup completed!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 NEXT STEPS:" -ForegroundColor Cyan
Write-Host "1. Replace placeholder values in .env files with your actual credentials:" -ForegroundColor White
Write-Host "   - Back4App Master Key and REST API Key from Back4App Dashboard" -ForegroundColor White
Write-Host "   - Exchange API keys from respective exchange dashboards" -ForegroundColor White
Write-Host "   - Cashfree payment credentials" -ForegroundColor White
Write-Host "   - External service API keys (Slack, DataDog, etc.)" -ForegroundColor White
Write-Host ""
Write-Host "2. Update URLs to match your production domains" -ForegroundColor White
Write-Host ""
Write-Host "3. Never commit .env files to version control" -ForegroundColor White
Write-Host ""
Write-Host "4. Use secure secret management systems for production" -ForegroundColor White
Write-Host ""
Write-Host "🔐 Security keys have been automatically generated:" -ForegroundColor Green
Write-Host "   - JWT Secret: Generated" -ForegroundColor White
Write-Host "   - Encryption Key: Generated" -ForegroundColor White
Write-Host "   - CSRF Secret: Generated" -ForegroundColor White
Write-Host "   - Session Secret: Generated" -ForegroundColor White
Write-Host ""
Write-Host "✅ Setup complete! Your .env files are production-ready." -ForegroundColor Green
