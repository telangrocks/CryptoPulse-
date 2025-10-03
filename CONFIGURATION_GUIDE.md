# CryptoPulse Configuration Guide - Production Ready

## Overview

This guide provides comprehensive instructions for configuring CryptoPulse for production deployment. The configuration system includes secure secrets management, environment validation, and production-ready defaults.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Environment Configuration](#environment-configuration)
3. [Security Configuration](#security-configuration)
4. [Database Configuration](#database-configuration)
5. [External Services](#external-services)
6. [Production Deployment](#production-deployment)
7. [Secrets Management](#secrets-management)
8. [Validation & Testing](#validation--testing)
9. [Troubleshooting](#troubleshooting)

## Quick Start

### 1. Generate Secure Secrets

```bash
# Generate cryptographically secure secrets
node scripts/secrets-manager.js generate

# Setup development environment
node scripts/secrets-manager.js setup development

# Setup production environment
node scripts/secrets-manager.js setup production
```

### 2. Configure Environment

```bash
# Copy templates
cp env-templates/backend.env backend/.env.backend
cp env-templates/frontend.env frontend/.env.local

# Edit configuration files
# Replace all CHANGE_ME values with actual configuration
```

### 3. Validate Configuration

```bash
# Validate all configuration
node scripts/config-validator.js

# Run production readiness check
pnpm run verify:production
```

## Environment Configuration

### Backend Configuration

The backend uses a centralized environment validation system with the following structure:

#### Required Variables

```bash
# Server Configuration
NODE_ENV=production
PORT=1337
HOST=0.0.0.0

# Database Configuration (REQUIRED)
DATABASE_URL=postgresql://user:password@host:5432/database?sslmode=require

# Security Configuration (REQUIRED)
JWT_SECRET=<64-character-cryptographically-secure-secret>
ENCRYPTION_KEY=<64-character-cryptographically-secure-secret>
CSRF_SECRET=<64-character-cryptographically-secure-secret>
SESSION_SECRET=<64-character-cryptographically-secure-secret>
```

#### Optional Variables

```bash
# Exchange API Keys (for trading functionality)
BINANCE_API_KEY=<your-binance-api-key>
BINANCE_SECRET_KEY=<your-binance-secret-key>
WAZIRX_API_KEY=<your-wazirx-api-key>
WAZIRX_SECRET_KEY=<your-wazirx-secret-key>

# Payment Gateway (for payment processing)
CASHFREE_APP_ID=<your-cashfree-app-id>
CASHFREE_SECRET_KEY=<your-cashfree-secret-key>
CASHFREE_WEBHOOK_SECRET=<your-cashfree-webhook-secret>
CASHFREE_MODE=live

# Monitoring & Logging
LOG_LEVEL=info
SLACK_WEBHOOK_URL=<your-slack-webhook-url>

# Feature Flags
ENABLE_DEBUG=false
ENABLE_MOCK_DATA=false
ENABLE_ANALYTICS=true
```

### Frontend Configuration

The frontend uses Vite environment variables with the `VITE_` prefix:

#### Required Variables

```bash
# API Configuration
VITE_API_BASE_URL=https://api.cryptopulse.com
VITE_BACKEND_URL=https://api.cryptopulse.com

# Application Configuration
VITE_APP_NAME=CryptoPulse
VITE_APP_VERSION=2.0.0
VITE_APP_DESCRIPTION=AI-Powered Cryptocurrency Trading Bot
```

#### Optional Variables

```bash
# External Services
VITE_COINGECKO_API_KEY=<your-coingecko-api-key>
VITE_NEWS_API_KEY=<your-news-api-key>

# Analytics
VITE_GA_TRACKING_ID=<your-google-analytics-id>
VITE_SENTRY_DSN=<your-sentry-dsn>

# Feature Flags
VITE_ENABLE_TRADING=true
VITE_ENABLE_AI_ASSISTANT=true
VITE_ENABLE_PAYMENTS=true
VITE_ENABLE_DEBUG=false
```

## Security Configuration

### Secret Generation

All secrets must be cryptographically secure. Use the provided tools:

```bash
# Generate secure secrets
node scripts/secrets-manager.js generate

# Audit existing secrets
node scripts/secrets-manager.js audit

# Rotate secrets
node scripts/secrets-manager.js rotate

# Force rotate all secrets
node scripts/secrets-manager.js rotate --force
```

### Secret Requirements

- **Minimum Length**: 32 characters (64 recommended)
- **Entropy**: Minimum 4.5 bits per character
- **No Placeholders**: Cannot contain "your_", "placeholder", "test_", etc.
- **Unique**: Each secret must be unique across environments

### Security Validation

The system automatically validates:

1. **Secret Strength**: Length, entropy, and pattern detection
2. **Placeholder Detection**: Identifies weak or placeholder values
3. **Environment Consistency**: Ensures production-ready settings
4. **URL Validation**: Validates all URLs and endpoints

## Database Configuration

### PostgreSQL Setup

```bash
# Production Database URL Format
DATABASE_URL=postgresql://username:password@host:5432/database?sslmode=require

# Required Parameters
- sslmode=require (mandatory for production)
- Connection pooling enabled
- Backup strategy configured
```

### Redis Configuration

```bash
# Redis URL Format
REDIS_URL=redis://username:password@host:6379/0

# Production Requirements
- SSL/TLS enabled
- Authentication required
- Memory limits configured
```

## External Services

### Exchange APIs

Configure exchange APIs for trading functionality:

```bash
# Binance
BINANCE_API_KEY=<your-api-key>
BINANCE_SECRET_KEY=<your-secret-key>

# WazirX
WAZIRX_API_KEY=<your-api-key>
WAZIRX_SECRET_KEY=<your-secret-key>

# CoinDCX
COINDCX_API_KEY=<your-api-key>
COINDCX_SECRET_KEY=<your-secret-key>
```

### Payment Gateway

```bash
# Cashfree Configuration
CASHFREE_APP_ID=<your-app-id>
CASHFREE_SECRET_KEY=<your-secret-key>
CASHFREE_WEBHOOK_SECRET=<your-webhook-secret>
CASHFREE_MODE=live  # or 'sandbox' for testing
```

### Monitoring Services

```bash
# Slack Alerts
SLACK_WEBHOOK_URL=<your-slack-webhook-url>

# Sentry Error Tracking
SENTRY_DSN=<your-sentry-dsn>

# Google Analytics
VITE_GA_TRACKING_ID=<your-ga-tracking-id>
```

## Production Deployment

### Environment Setup

1. **Generate Secrets**:
   ```bash
   node scripts/secrets-manager.js setup production
   ```

2. **Configure Database**:
   ```bash
   # Update DATABASE_URL with production database
   # Ensure SSL is enabled: ?sslmode=require
   ```

3. **Configure External Services**:
   ```bash
   # Update all API keys and service URLs
   # Use production endpoints (not sandbox/testnet)
   ```

4. **Security Settings**:
   ```bash
   ENABLE_DEBUG=false
   ENABLE_MOCK_DATA=false
   HTTPS_ENABLED=true
   LOG_LEVEL=info
   ```

### Validation

```bash
# Validate configuration
node scripts/config-validator.js

# Production readiness check
pnpm run verify:production

# Security audit
pnpm run audit:security
```

## Secrets Management

### Rotation Policy

- **Automatic**: Secrets are rotated every 90 days
- **Manual**: Use `node scripts/secrets-manager.js rotate`
- **Emergency**: Use `--force` flag for immediate rotation

### Storage

- **Development**: Store in `.env.backend` (never commit)
- **Production**: Use secure secrets management service
- **Backup**: Automatic backups created before rotation

### Best Practices

1. **Never commit secrets** to version control
2. **Use different secrets** for each environment
3. **Rotate regularly** (every 90 days)
4. **Monitor access** and usage
5. **Use secure storage** for production

## Validation & Testing

### Configuration Validation

```bash
# Validate all configuration
node scripts/config-validator.js

# Generate validation report
node scripts/config-validator.js --generate-secrets
```

### Production Readiness

```bash
# Comprehensive production check
pnpm run verify:production

# Security audit
pnpm run audit:security

# Dependency audit
pnpm run audit:deps
```

### Testing

```bash
# Run all tests
pnpm run test:all

# Backend tests
pnpm run test:backend

# Frontend tests
pnpm run test:frontend

# E2E tests
pnpm run test:e2e
```

## Troubleshooting

### Common Issues

#### 1. Secret Validation Failed

**Error**: `Secret key appears to be a placeholder`

**Solution**:
```bash
# Generate new secure secrets
node scripts/secrets-manager.js generate

# Update environment file
# Replace placeholder values with generated secrets
```

#### 2. Database Connection Failed

**Error**: `Database URL validation failed`

**Solution**:
```bash
# Check database URL format
DATABASE_URL=postgresql://user:password@host:5432/database?sslmode=require

# Verify database is accessible
# Check firewall and network settings
```

#### 3. API Key Validation Failed

**Error**: `API key appears to be a placeholder`

**Solution**:
```bash
# Get real API keys from exchange
# Update environment configuration
# Use testnet keys for development
```

#### 4. Production Warnings

**Warning**: `Debug mode enabled in production`

**Solution**:
```bash
# Set production flags
ENABLE_DEBUG=false
ENABLE_MOCK_DATA=false
LOG_LEVEL=info
```

### Debug Mode

Enable debug mode for troubleshooting:

```bash
# Backend debug
LOG_LEVEL=debug
ENABLE_DEBUG=true

# Frontend debug
VITE_ENABLE_DEBUG=true
```

### Logs

Check logs for detailed error information:

```bash
# Backend logs
tail -f backend/logs/app.log

# Application logs
pnpm run logs
```

## Security Considerations

### Production Security

1. **HTTPS Only**: All production traffic must use HTTPS
2. **Secret Rotation**: Rotate secrets every 90 days
3. **Access Control**: Limit access to production secrets
4. **Monitoring**: Monitor for suspicious activity
5. **Backup**: Regular backups of configuration

### Development Security

1. **Separate Secrets**: Use different secrets for development
2. **Testnet APIs**: Use testnet/sandbox APIs only
3. **Local Database**: Use local development database
4. **Debug Mode**: Enable debug mode for development

## Support

For additional help:

1. **Documentation**: Check other guide files
2. **Issues**: Create GitHub issue
3. **Security**: Report security issues privately
4. **Community**: Join Discord community

## Changelog

- **v2.0.0**: Production-ready configuration system
- **v1.0.0**: Initial configuration setup

---

**Note**: This configuration system is designed for production use. Always test configuration changes in a development environment before deploying to production.
