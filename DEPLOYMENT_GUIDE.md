# 🚀 CryptoPulse Deployment Guide - Production Ready

This comprehensive guide covers all aspects of deploying CryptoPulse to production environments.

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Deployment Methods](#deployment-methods)
- [CI/CD Pipeline](#cicd-pipeline)
- [Automation Scripts](#automation-scripts)
- [Security & Compliance](#security--compliance)
- [Monitoring & Alerting](#monitoring--alerting)
- [Troubleshooting](#troubleshooting)
- [Best Practices](#best-practices)

## 🔧 Prerequisites

### System Requirements

- **Node.js**: v20.0.0 or higher
- **pnpm**: v10.18.0
- **Docker**: v20.10.0 or higher
- **Docker Compose**: v2.0.0 or higher
- **Git**: v2.30.0 or higher

### Cloud Platform Requirements

- **Northflank Account**: For production deployment
- **Domain**: Configured DNS settings
- **SSL Certificate**: Valid SSL/TLS certificate
- **Environment Variables**: Properly configured secrets

### Required Tools

```bash
# Install Node.js (if not already installed)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install pnpm
npm install -g pnpm@10.18.0

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install Northflank CLI
npm install -g @northflank/cli
```

## 🌍 Environment Setup

### 1. Clone Repository

```bash
git clone https://github.com/your-username/cryptopulse.git
cd cryptopulse
```

### 2. Install Dependencies

```bash
# Install all dependencies
pnpm install --frozen-lockfile

# Verify installation
pnpm run verify:installation
```

### 3. Environment Configuration

#### Backend Environment

```bash
# Copy environment template
cp env-templates/backend.env.production backend/.env.production

# Edit environment variables
nano backend/.env.production
```

**Required Environment Variables:**

```env
# Database Configuration
DATABASE_URL=postgresql://username:password@host:5432/cryptopulse_prod
REDIS_URL=redis://:password@host:6379
MONGODB_URL=mongodb://username:password@host:27017/cryptopulse_prod

# Security Configuration
JWT_SECRET=your-32-character-cryptographically-secure-jwt-secret
ENCRYPTION_KEY=your-32-character-cryptographically-secure-encryption-key
CSRF_SECRET=your-32-character-cryptographically-secure-csrf-secret
SESSION_SECRET=your-32-character-cryptographically-secure-session-secret

# API Keys
BINANCE_API_KEY=your-binance-api-key
BINANCE_SECRET_KEY=your-binance-secret-key
COINDCX_API_KEY=your-coindcx-api-key
COINDCX_SECRET_KEY=your-coindcx-secret-key
WAZIRX_API_KEY=your-wazirx-api-key
WAZIRX_SECRET_KEY=your-wazirx-secret-key

# Payment Gateway
CASHFREE_APP_ID=your-cashfree-app-id
CASHFREE_SECRET_KEY=your-cashfree-secret-key

# Production Settings
NODE_ENV=production
PORT=1337
HOST=0.0.0.0
HTTPS_ENABLED=true
ENABLE_DEBUG=false
ENABLE_MOCK_DATA=false
```

#### Frontend Environment

```bash
# Copy environment template
cp env-templates/frontend.env.production frontend/.env.production

# Edit environment variables
nano frontend/.env.production
```

**Required Environment Variables:**

```env
# API Configuration
VITE_API_BASE_URL=https://api.cryptopulse.com
VITE_WS_URL=wss://api.cryptopulse.com/ws

# Feature Flags
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_ERROR_REPORTING=true
VITE_ENABLE_PERFORMANCE_MONITORING=true

# Security
VITE_ENCRYPTION_KEY=your-frontend-encryption-key
```

### 4. Generate Secure Secrets

```bash
# Generate cryptographically secure secrets
pnpm run config:secrets:generate

# Validate configuration
pnpm run config:validate
```

### 5. Infrastructure Validation

```bash
# Validate infrastructure readiness
pnpm run infra:validate

# Check security configuration
pnpm run security:audit
```

## 🚀 Deployment Methods

### Method 1: Automated Deployment (Recommended)

#### Using GitHub Actions

```bash
# Trigger deployment via GitHub Actions
gh workflow run deploy-production.yml \
  --field environment=production \
  --field services=all
```

#### Using Deployment Scripts

```bash
# Deploy all services to production
pnpm run deploy:production

# Deploy specific services
pnpm run deploy:backend
pnpm run deploy:frontend
pnpm run deploy:cloud

# Deploy to staging
pnpm run deploy:staging
```

### Method 2: Manual Deployment

#### Step 1: Build Applications

```bash
# Build all applications
pnpm run build:production

# Verify builds
pnpm run verify:build
```

#### Step 2: Build Docker Images

```bash
# Build Docker images
docker build -t cryptopulse-backend:latest ./backend
docker build -t cryptopulse-frontend:latest ./frontend
docker build -t cryptopulse-cloud:latest ./cloud

# Verify images
docker images | grep cryptopulse
```

#### Step 3: Deploy to Northflank

```bash
# Login to Northflank
northflank auth login

# Deploy using deployment script
chmod +x scripts/deploy-northflank.sh
./scripts/deploy-northflank.sh -e production all
```

### Method 3: Docker Compose Deployment

#### Local Production Setup

```bash
# Start production environment
docker-compose -f docker-compose.production.yml up -d

# Check service status
docker-compose -f docker-compose.production.yml ps

# View logs
docker-compose -f docker-compose.production.yml logs -f
```

## 🔄 CI/CD Pipeline

### Pipeline Overview

The CI/CD pipeline includes:

1. **Security Audit**: Dependency and code security scanning
2. **Quality Checks**: Linting, formatting, and type checking
3. **Testing**: Unit, integration, and E2E tests
4. **Build**: Application and Docker image building
5. **Deployment**: Automated deployment to target environment
6. **Health Checks**: Post-deployment validation
7. **Rollback**: Automatic rollback on failure

### Pipeline Configuration

#### GitHub Actions Workflow

```yaml
name: CryptoPulse CI/CD Pipeline - Production Ready

on:
  push:
    branches: [ main, develop, staging ]
  pull_request:
    branches: [ main, develop ]
  release:
    types: [ published ]
  workflow_dispatch:
    inputs:
      environment:
        description: 'Environment to deploy to'
        required: true
        default: 'staging'
        type: choice
        options:
        - staging
        - production
      services:
        description: 'Services to deploy (comma-separated)'
        required: false
        default: 'all'
        type: string
```

#### Pipeline Jobs

1. **Security Audit**: Comprehensive security scanning
2. **Lint and Format**: Code quality checks
3. **Testing**: Comprehensive test suite
4. **Build**: Application building
5. **Docker**: Container building and security scanning
6. **Deploy**: Production deployment
7. **Health Checks**: Post-deployment validation

### Quality Gates

The pipeline includes quality gates that must pass:

- Security scan score > 95%
- Test coverage > 80%
- Performance tests pass
- Security tests pass
- Infrastructure validation passes

## 🛠️ Automation Scripts

### Available Scripts

```bash
# Deployment automation
pnpm run deploy:all                    # Deploy all services
pnpm run deploy:backend                # Deploy backend only
pnpm run deploy:frontend               # Deploy frontend only
pnpm run deploy:cloud                  # Deploy cloud functions only

# Infrastructure management
pnpm run infra:validate                # Validate infrastructure
pnpm run infra:backup                  # Create backup
pnpm run infra:backup:list             # List backups
pnpm run infra:backup:cleanup          # Cleanup old backups
pnpm run infra:scale:start             # Start auto-scaler
pnpm run infra:scale:status            # Check scaling status

# Testing automation
pnpm run test:all                      # Run all tests
pnpm run test:unit                     # Run unit tests
pnpm run test:integration              # Run integration tests
pnpm run test:e2e                      # Run E2E tests
pnpm run test:performance              # Run performance tests
pnpm run test:security                 # Run security tests
pnpm run test:smoke                    # Run smoke tests

# Security automation
pnpm run security:scan                 # Run security scan
pnpm run security:dependency           # Scan dependencies
pnpm run security:code                 # Scan code
pnpm run security:infrastructure       # Scan infrastructure
pnpm run security:compliance           # Scan compliance

# Configuration management
pnpm run config:validate               # Validate configuration
pnpm run config:secrets:generate       # Generate secrets
pnpm run config:secrets:audit          # Audit secrets
pnpm run config:secrets:rotate         # Rotate secrets
```

### Custom Deployment Automation

```bash
# Run custom deployment
node scripts/deployment-automation.js deploy production

# Run specific test suite
node scripts/testing-automation.js run e2e production

# Run security scan
node scripts/security-automation.js scan all
```

## 🔒 Security & Compliance

### Security Measures

1. **Environment Variables**: Secure secret management
2. **SSL/TLS**: End-to-end encryption
3. **Authentication**: JWT-based authentication
4. **Authorization**: Role-based access control
5. **Input Validation**: Comprehensive input sanitization
6. **Rate Limiting**: Protection against abuse
7. **Security Headers**: Enhanced security headers
8. **Dependency Scanning**: Regular vulnerability scanning

### Compliance Frameworks

- **OWASP Top 10**: Web application security
- **PCI DSS**: Payment card industry compliance
- **GDPR**: Data protection compliance
- **SOC 2**: Security and availability compliance

### Security Automation

```bash
# Run comprehensive security audit
pnpm run security:audit

# Scan dependencies for vulnerabilities
pnpm run security:dependency

# Scan code for security issues
pnpm run security:code

# Check compliance
pnpm run security:compliance
```

## 📊 Monitoring & Alerting

### Monitoring Stack

- **Prometheus**: Metrics collection
- **Grafana**: Visualization and dashboards
- **AlertManager**: Alert management
- **Custom Metrics**: Application-specific metrics

### Key Metrics

- **System Metrics**: CPU, memory, disk usage
- **Application Metrics**: Response time, error rate, throughput
- **Business Metrics**: Trading volume, user activity
- **Security Metrics**: Failed logins, suspicious activity

### Alerting Rules

```yaml
# Example alert rule
- alert: HighErrorRate
  expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
  for: 2m
  labels:
    severity: critical
  annotations:
    summary: "High error rate detected"
    description: "Error rate is {{ $value }} errors per second"
```

### Monitoring Automation

```bash
# Start monitoring stack
docker-compose -f docker-compose.production.yml up -d prometheus grafana

# Check monitoring status
pnpm run monitor:status

# View metrics
curl http://localhost:9090/metrics
```

## 🔍 Troubleshooting

### Common Issues

#### 1. Deployment Failures

**Issue**: Deployment fails during build step

**Solution**:
```bash
# Check build logs
pnpm run build:production --verbose

# Verify dependencies
pnpm install --frozen-lockfile

# Check Node.js version
node --version
```

#### 2. Environment Configuration

**Issue**: Environment variables not loaded

**Solution**:
```bash
# Validate environment configuration
pnpm run config:validate

# Check environment files
ls -la backend/.env*
ls -la frontend/.env*

# Regenerate secrets if needed
pnpm run config:secrets:generate
```

#### 3. Database Connection

**Issue**: Database connection failed

**Solution**:
```bash
# Check database URL
echo $DATABASE_URL

# Test database connection
pnpm run db:test:connection

# Check database status
docker-compose -f docker-compose.production.yml ps postgres
```

#### 4. SSL Certificate Issues

**Issue**: SSL certificate not valid

**Solution**:
```bash
# Check certificate
openssl x509 -in cert.pem -text -noout

# Verify certificate chain
openssl verify -CAfile ca.pem cert.pem

# Check certificate expiration
openssl x509 -in cert.pem -noout -dates
```

### Debugging Commands

```bash
# View application logs
docker-compose -f docker-compose.production.yml logs -f

# Check service health
curl -f http://localhost:1337/health

# Monitor resource usage
docker stats

# Check network connectivity
netstat -tuln | grep :1337
```

### Rollback Procedures

#### Automatic Rollback

```bash
# Trigger automatic rollback
pnpm run deploy:rollback

# Check rollback status
pnpm run deploy:status
```

#### Manual Rollback

```bash
# Rollback to previous version
node scripts/deployment-automation.js rollback production

# Verify rollback
pnpm run deploy:verify
```

## 📚 Best Practices

### Deployment Best Practices

1. **Always test in staging first**
2. **Use blue-green deployments**
3. **Implement proper monitoring**
4. **Have rollback procedures ready**
5. **Document all changes**
6. **Use infrastructure as code**
7. **Implement proper security measures**
8. **Monitor performance metrics**

### Security Best Practices

1. **Use strong, unique secrets**
2. **Enable HTTPS everywhere**
3. **Implement proper authentication**
4. **Regular security audits**
5. **Keep dependencies updated**
6. **Use security headers**
7. **Implement rate limiting**
8. **Monitor for suspicious activity**

### Monitoring Best Practices

1. **Set up comprehensive monitoring**
2. **Configure proper alerting**
3. **Monitor key business metrics**
4. **Regular performance testing**
5. **Log analysis and correlation**
6. **Capacity planning**
7. **Disaster recovery planning**

### Code Quality Best Practices

1. **Comprehensive testing**
2. **Code reviews**
3. **Static analysis**
4. **Dependency scanning**
5. **Performance testing**
6. **Security testing**
7. **Documentation**
8. **Version control**

## 📞 Support

### Getting Help

- **Documentation**: Check this guide and related docs
- **Issues**: Create GitHub issues for bugs
- **Discussions**: Use GitHub discussions for questions
- **Security**: Report security issues privately

### Emergency Contacts

- **Technical Lead**: tech-lead@cryptopulse.com
- **DevOps Team**: devops@cryptopulse.com
- **Security Team**: security@cryptopulse.com

### Useful Resources

- [CryptoPulse Documentation](https://docs.cryptopulse.com)
- [API Documentation](https://api.cryptopulse.com/docs)
- [Security Guidelines](https://security.cryptopulse.com)
- [Monitoring Dashboard](https://monitoring.cryptopulse.com)

---

**🎯 Ready for Production!**

This deployment guide ensures CryptoPulse is deployed securely, reliably, and efficiently to production environments. Follow the steps carefully and refer to the troubleshooting section if issues arise.