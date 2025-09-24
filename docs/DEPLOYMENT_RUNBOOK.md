# CryptoPulse Deployment Runbook

## Overview

This runbook provides comprehensive instructions for deploying, monitoring, and maintaining the CryptoPulse trading platform in production environments.

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Environment Setup](#environment-setup)
3. [Deployment Procedures](#deployment-procedures)
4. [Post-Deployment Verification](#post-deployment-verification)
5. [Monitoring and Alerting](#monitoring-and-alerting)
6. [Troubleshooting Guide](#troubleshooting-guide)
7. [Rollback Procedures](#rollback-procedures)
8. [Maintenance Procedures](#maintenance-procedures)

## Pre-Deployment Checklist

### Infrastructure Requirements

- [ ] **Server Specifications**
  - Minimum: 4 CPU cores, 8GB RAM, 100GB SSD
  - Recommended: 8 CPU cores, 16GB RAM, 200GB SSD
  - Network: 1Gbps connection with low latency

- [ ] **Dependencies**
  - [ ] Docker Engine 20.10+
  - [ ] Docker Compose 2.0+
  - [ ] Node.js 18+ (for local development)
  - [ ] SSL Certificate (Let's Encrypt or commercial)
  - [ ] Domain name configured

- [ ] **External Services**
  - [ ] MongoDB Atlas or self-hosted MongoDB 5.0+
  - [ ] Redis 6.0+ (Redis Cloud or self-hosted)
  - [ ] Binance API credentials
  - [ ] Email service (SendGrid, AWS SES, etc.)
  - [ ] Monitoring service (Prometheus + Grafana)

### Security Checklist

- [ ] **SSL/TLS Configuration**
  - [ ] SSL certificates installed and valid
  - [ ] HTTPS redirect configured
  - [ ] Security headers implemented
  - [ ] HSTS enabled

- [ ] **Access Control**
  - [ ] Firewall configured (ports 80, 443, 22)
  - [ ] SSH key-based authentication
  - [ ] Database access restricted
  - [ ] API rate limiting configured

- [ ] **Secrets Management**
  - [ ] Environment variables secured
  - [ ] Database credentials encrypted
  - [ ] API keys stored securely
  - [ ] Session secrets generated

## Environment Setup

### 1. Server Preparation

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Create application directory
sudo mkdir -p /opt/cryptopulse
sudo chown $USER:$USER /opt/cryptopulse
```

### 2. Environment Configuration

Create production environment file:

```bash
# Copy environment template
cp env.production.example .env.production

# Edit environment variables
nano .env.production
```

**Required Environment Variables:**

```bash
# Application
NODE_ENV=production
PORT=3000
DOMAIN_NAME=your-domain.com
SSL_EMAIL=admin@your-domain.com

# Database
MONGO_URL=mongodb://username:password@host:port/database
MONGO_INITDB_ROOT_USERNAME=admin
MONGO_INITDB_ROOT_PASSWORD=secure_password

# Redis
REDIS_URL=redis://username:password@host:port
REDIS_PASSWORD=secure_redis_password

# Security
SESSION_SECRET=your-super-secret-session-key
ENCRYPTION_KEY=your-32-character-encryption-key
JWT_SECRET=your-jwt-secret-key

# External APIs
BINANCE_API_KEY=your-binance-api-key
BINANCE_SECRET_KEY=your-binance-secret-key

# Email
EMAIL_SERVICE=sendgrid
EMAIL_API_KEY=your-sendgrid-api-key
EMAIL_FROM=noreply@your-domain.com

# Monitoring
PROMETHEUS_PORT=9090
GRAFANA_PORT=3001
```

### 3. SSL Certificate Setup

```bash
# Run SSL setup script
chmod +x scripts/ssl-setup.sh
./scripts/ssl-setup.sh

# Verify SSL configuration
./scripts/ssl-check.sh
```

## Deployment Procedures

### Blue-Green Deployment Strategy

#### 1. Prepare Green Environment

```bash
# Create green environment
cp docker-compose.yml docker-compose.green.yml

# Update green environment configuration
sed -i 's/cryptopulse-backend/cryptopulse-backend-green/g' docker-compose.green.yml
sed -i 's/cryptopulse-frontend/cryptopulse-frontend-green/g' docker-compose.green.yml
```

#### 2. Deploy to Green Environment

```bash
# Build and start green environment
docker-compose -f docker-compose.green.yml build
docker-compose -f docker-compose.green.yml up -d

# Run health checks
./scripts/health-check.sh green

# Run smoke tests
npm run test:smoke
```

#### 3. Switch Traffic to Green

```bash
# Update load balancer configuration
./scripts/switch-traffic.sh green

# Verify traffic is flowing to green
curl -f https://your-domain.com/health

# Monitor for 5 minutes
./scripts/monitor-deployment.sh 300
```

#### 4. Cleanup Blue Environment

```bash
# Stop blue environment after successful deployment
docker-compose down

# Clean up old images
docker image prune -f
```

### Rolling Deployment (Alternative)

```bash
# Deploy with rolling updates
docker-compose up -d --force-recreate

# Monitor deployment
docker-compose logs -f --tail=100
```

## Post-Deployment Verification

### 1. Health Checks

```bash
# Run comprehensive health checks
./scripts/health-check.sh

# Check individual services
curl -f https://your-domain.com/health
curl -f https://your-domain.com/metrics
```

### 2. Functional Testing

```bash
# Run API tests
npm run test:api

# Run integration tests
npm run test:integration

# Run end-to-end tests
npm run test:e2e
```

### 3. Performance Testing

```bash
# Run load tests
node tests/performance/load-test.js https://your-domain.com

# Check response times
curl -w "@curl-format.txt" -o /dev/null -s https://your-domain.com/api/trading/status
```

### 4. Security Verification

```bash
# Run security scan
./scripts/security-validation.js

# Check SSL configuration
./scripts/ssl-check.sh

# Verify security headers
curl -I https://your-domain.com
```

## Monitoring and Alerting

### 1. Prometheus Metrics

Access metrics at: `https://your-domain.com/metrics`

**Key Metrics to Monitor:**
- Response time percentiles (p50, p90, p95, p99)
- Error rates by endpoint
- Database connection pool usage
- Cache hit rates
- Trading volume and success rates

### 2. Grafana Dashboards

Access dashboards at: `http://your-server:3001`

**Available Dashboards:**
- System Overview
- Trading Performance
- User Activity
- Error Rates
- Database Performance

### 3. Alerting Rules

**Critical Alerts:**
- High error rate (>5%)
- Slow response time (>2s p95)
- Database connection issues
- SSL certificate expiration
- High memory usage (>90%)

**Warning Alerts:**
- Moderate error rate (>2%)
- Slow response time (>1s p95)
- Low cache hit rate (<80%)
- High CPU usage (>80%)

### 4. Log Monitoring

```bash
# View application logs
docker-compose logs -f backend

# View access logs
docker-compose logs -f nginx

# Search for errors
docker-compose logs backend | grep ERROR
```

## Troubleshooting Guide

### Common Issues

#### 1. Application Won't Start

**Symptoms:**
- Docker containers exit immediately
- Health checks fail
- 502 Bad Gateway errors

**Diagnosis:**
```bash
# Check container logs
docker-compose logs backend

# Check resource usage
docker stats

# Verify environment variables
docker-compose config
```

**Solutions:**
- Verify all required environment variables are set
- Check database connectivity
- Ensure sufficient system resources
- Review application logs for specific errors

#### 2. Database Connection Issues

**Symptoms:**
- Database connection timeouts
- High connection pool usage
- Slow database queries

**Diagnosis:**
```bash
# Check database connectivity
docker-compose exec backend node -e "
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGO_URL)
  .then(() => console.log('Connected'))
  .catch(err => console.error('Connection failed:', err));
"

# Check database metrics
curl http://localhost:9090/metrics | grep database
```

**Solutions:**
- Increase connection pool size
- Optimize database queries
- Add database indexes
- Consider read replicas for scaling

#### 3. High Memory Usage

**Symptoms:**
- Slow response times
- Out of memory errors
- Container restarts

**Diagnosis:**
```bash
# Check memory usage
docker stats

# Check for memory leaks
docker-compose exec backend node --inspect=0.0.0.0:9229
```

**Solutions:**
- Increase container memory limits
- Optimize application code
- Implement garbage collection tuning
- Add memory monitoring

#### 4. SSL Certificate Issues

**Symptoms:**
- SSL certificate errors
- HTTPS redirect failures
- Security warnings

**Diagnosis:**
```bash
# Check certificate validity
./scripts/ssl-check.sh

# Test SSL configuration
openssl s_client -connect your-domain.com:443 -servername your-domain.com
```

**Solutions:**
- Renew SSL certificates
- Update certificate paths
- Verify domain configuration
- Check certificate chain

### Emergency Procedures

#### 1. Service Degradation

```bash
# Enable maintenance mode
echo "MAINTENANCE_MODE=true" >> .env.production
docker-compose restart

# Scale down services
docker-compose scale backend=1 frontend=1

# Monitor resource usage
watch docker stats
```

#### 2. Security Incident

```bash
# Block suspicious IPs
iptables -A INPUT -s suspicious-ip -j DROP

# Rotate secrets
./scripts/rotate-secrets.sh

# Review audit logs
docker-compose logs audit-logger | grep "security"
```

#### 3. Data Corruption

```bash
# Stop services
docker-compose down

# Restore from backup
./scripts/restore-backup.sh latest

# Verify data integrity
./scripts/verify-data.sh

# Restart services
docker-compose up -d
```

## Rollback Procedures

### 1. Quick Rollback (Last Known Good Version)

```bash
# Stop current deployment
docker-compose down

# Restore previous version
git checkout previous-stable-tag
docker-compose up -d

# Verify rollback
./scripts/health-check.sh
```

### 2. Blue-Green Rollback

```bash
# Switch traffic back to blue
./scripts/switch-traffic.sh blue

# Stop green environment
docker-compose -f docker-compose.green.yml down

# Monitor blue environment
./scripts/monitor-deployment.sh 300
```

### 3. Database Rollback

```bash
# Stop application
docker-compose down

# Restore database
./scripts/restore-database.sh backup-timestamp

# Restart application
docker-compose up -d
```

## Maintenance Procedures

### 1. Regular Maintenance Tasks

#### Daily Tasks
```bash
# Check system health
./scripts/daily-health-check.sh

# Review logs
docker-compose logs --since 24h | grep ERROR

# Monitor metrics
curl -s http://localhost:9090/metrics | grep -E "(error|response_time)"
```

#### Weekly Tasks
```bash
# Update dependencies
npm audit fix
docker-compose build --no-cache

# Clean up old logs
./scripts/cleanup-logs.sh

# Review security alerts
./scripts/security-scan.sh
```

#### Monthly Tasks
```bash
# Update system packages
sudo apt update && sudo apt upgrade

# Rotate logs
./scripts/rotate-logs.sh

# Review performance metrics
./scripts/performance-review.sh
```

### 2. Backup Procedures

#### Automated Backups
```bash
# Schedule daily backups
crontab -e
# Add: 0 2 * * * /opt/cryptopulse/scripts/backup.sh

# Verify backup integrity
./scripts/verify-backup.sh
```

#### Manual Backups
```bash
# Create full backup
./scripts/backup.sh full

# Create incremental backup
./scripts/backup.sh incremental

# Test backup restoration
./scripts/test-restore.sh
```

### 3. Performance Optimization

#### Database Optimization
```bash
# Analyze slow queries
./scripts/analyze-queries.sh

# Optimize indexes
./scripts/optimize-indexes.sh

# Update statistics
./scripts/update-statistics.sh
```

#### Application Optimization
```bash
# Profile application
node --prof server.js

# Analyze memory usage
node --inspect server.js

# Optimize bundle size
npm run build:analyze
```

### 4. Security Maintenance

#### Regular Security Tasks
```bash
# Update dependencies
npm audit fix
docker-compose build --no-cache

# Scan for vulnerabilities
./scripts/vulnerability-scan.sh

# Review access logs
./scripts/analyze-access-logs.sh
```

#### Certificate Management
```bash
# Check certificate expiration
./scripts/ssl-check.sh

# Renew certificates
./scripts/ssl-renew.sh

# Update certificate monitoring
./scripts/update-cert-monitoring.sh
```

## Contact Information

### On-Call Rotation
- **Primary**: DevOps Team (devops@company.com)
- **Secondary**: Development Team (dev@company.com)
- **Escalation**: CTO (cto@company.com)

### Emergency Contacts
- **Infrastructure**: AWS Support, MongoDB Atlas Support
- **Security**: Security Team (security@company.com)
- **Legal**: Legal Team (legal@company.com)

### Documentation Updates
This runbook should be updated after each deployment and whenever procedures change. All team members should review and test procedures regularly.