# CryptoPulse SSL/HTTPS Deployment Guide

This comprehensive guide covers the complete SSL/HTTPS configuration for CryptoPulse Trading Bot, including Let's Encrypt integration, security hardening, and automated certificate management.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Quick Start](#quick-start)
4. [Detailed Configuration](#detailed-configuration)
5. [Security Features](#security-features)
6. [Certificate Management](#certificate-management)
7. [Monitoring & Maintenance](#monitoring--maintenance)
8. [Troubleshooting](#troubleshooting)
9. [Production Checklist](#production-checklist)

## Overview

CryptoPulse now includes comprehensive SSL/HTTPS support with:

- **Let's Encrypt Integration**: Automatic SSL certificate generation and renewal
- **Self-Signed Certificates**: For development and testing environments
- **Security Hardening**: Modern SSL protocols, cipher suites, and security headers
- **Automated Management**: Scripts for setup, renewal, and health monitoring
- **Docker Integration**: Seamless SSL configuration within Docker containers

## Prerequisites

### System Requirements

- **Operating System**: Linux (Ubuntu 20.04+, CentOS 8+, or similar)
- **Docker**: Version 20.10+ with Docker Compose
- **Domain Name**: For production deployments (optional for development)
- **OpenSSL**: For certificate management
- **Root Access**: Required for Let's Encrypt certificate generation

### Domain Configuration

For production deployments, ensure:

1. **DNS Records**: Point your domain to your server's IP address
2. **Port Access**: Ports 80 and 443 must be accessible from the internet
3. **Domain Validation**: Let's Encrypt will validate domain ownership

## Quick Start

### 1. Development Environment (Self-Signed Certificates)

```bash
# Clone and navigate to the project
git clone <repository-url>
cd cryptopulse

# Copy environment template
cp env.production.example .env

# Update .env with your configuration
# Set DOMAIN_NAME=localhost for self-signed certificates

# Run deployment with SSL
./deploy.sh
```

### 2. Production Environment (Let's Encrypt)

```bash
# Update .env file
DOMAIN_NAME=your-domain.com
SSL_EMAIL=admin@your-domain.com

# Run deployment (requires sudo for Let's Encrypt)
sudo ./deploy.sh
```

## Detailed Configuration

### Environment Variables

Update your `.env` file with the following SSL-related variables:

```bash
# Domain configuration
DOMAIN_NAME=your-domain.com
SSL_EMAIL=admin@your-domain.com

# SSL certificate paths (automatically managed)
SSL_CERT_PATH=/etc/nginx/ssl/fullchain.pem
SSL_KEY_PATH=/etc/nginx/ssl/key.pem

# Let's Encrypt configuration
LETSENCRYPT_EMAIL=admin@your-domain.com
LETSENCRYPT_STAGING=false
CERT_RENEWAL_THRESHOLD=30

# SSL security settings
SSL_PROTOCOLS=TLSv1.2,TLSv1.3
SSL_CIPHERS=ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512
SSL_SESSION_CACHE=shared:SSL:10m
SSL_SESSION_TIMEOUT=10m

# Security headers
HSTS_MAX_AGE=31536000
HSTS_INCLUDE_SUBDOMAINS=true
HSTS_PRELOAD=true
```

### Nginx Configuration

The SSL configuration is automatically applied to `nginx.conf` with:

- **HTTP to HTTPS Redirect**: All HTTP traffic redirected to HTTPS
- **Modern SSL Protocols**: TLS 1.2 and 1.3 only
- **Secure Cipher Suites**: Perfect Forward Secrecy enabled
- **Security Headers**: HSTS, CSP, and other security headers
- **OCSP Stapling**: Improved SSL performance

### Docker Compose Integration

The `docker-compose.yml` includes:

- **Certbot Service**: For Let's Encrypt certificate management
- **SSL Volume Mounts**: Persistent certificate storage
- **Webroot Configuration**: For Let's Encrypt validation

## Security Features

### SSL/TLS Configuration

- **Protocols**: TLS 1.2 and 1.3 only
- **Cipher Suites**: ECDHE with AES-GCM and ChaCha20-Poly1305
- **Perfect Forward Secrecy**: Enabled
- **OCSP Stapling**: Enabled for improved performance
- **Session Caching**: Optimized for performance

### Security Headers

```nginx
# HTTP Strict Transport Security
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload";

# Certificate Transparency
add_header Expect-CT "max-age=86400, enforce";

# Content Security Policy
add_header Content-Security-Policy "default-src 'self'; ...";

# Additional security headers
add_header X-Frame-Options DENY;
add_header X-Content-Type-Options nosniff;
add_header X-XSS-Protection "1; mode=block";
add_header Referrer-Policy "strict-origin-when-cross-origin";
```

### Rate Limiting

- **API Endpoints**: 10 requests/second with burst capacity
- **Authentication**: 1 request/second with burst capacity
- **DDoS Protection**: Built-in rate limiting zones

## Certificate Management

### SSL Management Scripts

#### 1. SSL Setup (`scripts/ssl-setup.sh`)

```bash
# For development (self-signed)
./scripts/ssl-setup.sh

# For production (Let's Encrypt)
sudo ./scripts/ssl-setup.sh
```

**Features:**
- Automatic certificate generation
- Nginx configuration update
- Certificate validation
- Domain verification

#### 2. SSL Renewal (`scripts/ssl-renew.sh`)

```bash
# Manual renewal
sudo ./scripts/ssl-renew.sh

# Check renewal status
./scripts/ssl-check.sh
```

**Features:**
- Automatic certificate renewal
- Nginx reload after renewal
- Backup management
- Notification system

#### 3. SSL Health Check (`scripts/ssl-check.sh`)

```bash
# Comprehensive health check
./scripts/ssl-check.sh
```

**Features:**
- Certificate expiration monitoring
- SSL configuration validation
- Connection testing
- Health report generation

### Automated Renewal

Set up a cron job for automatic certificate renewal:

```bash
# Add to crontab
crontab -e

# Add this line for daily checks at 2 AM
0 2 * * * cd /path/to/cryptopulse && ./scripts/ssl-renew.sh >> ssl-renewal.log 2>&1
```

## Monitoring & Maintenance

### Health Monitoring

The SSL configuration includes several health check endpoints:

- **HTTP Health**: `http://your-domain.com/health`
- **SSL Health**: `https://your-domain.com/ssl-health`
- **SSL Metrics**: `https://your-domain.com/metrics`

### Certificate Monitoring

Monitor certificate expiration:

```bash
# Check certificate expiration
openssl x509 -in ssl/cert.pem -noout -enddate

# Run health check
./scripts/ssl-check.sh
```

### Log Management

SSL-related logs are stored in:

- **Nginx Access**: `docker-compose logs nginx`
- **SSL Renewal**: `ssl-renewal.log`
- **SSL Health**: `ssl-health.log`

### Grafana Integration

SSL metrics are integrated with the existing monitoring stack:

- **Certificate Expiration**: Tracked in Prometheus
- **SSL Health**: Monitored via Grafana dashboards
- **Alert Rules**: Configure alerts for certificate expiration

## Troubleshooting

### Common Issues

#### 1. Certificate Generation Fails

**Problem**: Let's Encrypt certificate generation fails

**Solutions:**
```bash
# Check domain DNS resolution
nslookup your-domain.com

# Verify port 80 accessibility
telnet your-domain.com 80

# Check Let's Encrypt logs
docker-compose logs certbot

# Test with staging environment
LETSENCRYPT_STAGING=true ./scripts/ssl-setup.sh
```

#### 2. SSL Connection Issues

**Problem**: HTTPS connections fail

**Solutions:**
```bash
# Check certificate validity
openssl x509 -in ssl/cert.pem -text -noout

# Test SSL connection
openssl s_client -connect your-domain.com:443

# Check nginx configuration
docker-compose exec nginx nginx -t

# Restart nginx
docker-compose restart nginx
```

#### 3. Certificate Renewal Fails

**Problem**: Automatic renewal fails

**Solutions:**
```bash
# Check renewal logs
tail -f ssl-renewal.log

# Manual renewal
sudo ./scripts/ssl-renew.sh

# Check certificate expiration
./scripts/ssl-check.sh

# Verify cron job
crontab -l
```

### Debug Commands

```bash
# Check SSL configuration
docker-compose exec nginx nginx -T

# Test SSL grade
curl -I https://your-domain.com

# Check certificate details
openssl x509 -in ssl/cert.pem -text -noout

# Verify nginx is running
docker-compose ps nginx

# Check SSL health
curl -k https://your-domain.com/ssl-health
```

## Production Checklist

### Pre-Deployment

- [ ] Domain name configured and DNS pointing to server
- [ ] Ports 80 and 443 accessible from internet
- [ ] SSL_EMAIL configured in .env file
- [ ] Firewall rules configured
- [ ] Backup strategy in place

### Deployment

- [ ] Run `sudo ./deploy.sh` for production
- [ ] Verify SSL certificate generation
- [ ] Test HTTPS connections
- [ ] Run SSL health check
- [ ] Configure certificate renewal cron job

### Post-Deployment

- [ ] Monitor certificate expiration
- [ ] Set up SSL monitoring alerts
- [ ] Test certificate renewal process
- [ ] Verify security headers
- [ ] Document SSL configuration

### Security Verification

- [ ] SSL Labs test: https://www.ssllabs.com/ssltest/
- [ ] Security headers check
- [ ] Certificate transparency verification
- [ ] HSTS preload submission
- [ ] Regular security audits

## Advanced Configuration

### Custom SSL Certificates

To use custom SSL certificates:

1. Place certificates in `ssl/` directory:
   - `fullchain.pem` - Full certificate chain
   - `key.pem` - Private key
   - `cert.pem` - Certificate

2. Update nginx configuration if needed

3. Restart nginx:
   ```bash
   docker-compose restart nginx
   ```

### Load Balancer Configuration

For load balancer setups:

1. Configure SSL termination at load balancer
2. Update nginx configuration for HTTP backend
3. Adjust security headers for proxy setup
4. Configure health checks appropriately

### Multi-Domain Setup

For multiple domains:

1. Update nginx configuration with multiple server blocks
2. Generate certificates for each domain
3. Configure DNS for all domains
4. Update renewal scripts for multiple domains

## Support

For SSL-related issues:

1. Check the troubleshooting section
2. Review SSL logs: `ssl-renewal.log`, `ssl-health.log`
3. Run health checks: `./scripts/ssl-check.sh`
4. Check nginx logs: `docker-compose logs nginx`

## Security Best Practices

1. **Regular Updates**: Keep certificates and SSL configurations updated
2. **Monitoring**: Set up alerts for certificate expiration
3. **Backup**: Regularly backup SSL certificates and configurations
4. **Testing**: Regularly test SSL configuration and renewal process
5. **Documentation**: Keep SSL configuration documented and updated

---

**Note**: This SSL configuration is designed for production use with proper security hardening. Always test in a staging environment before deploying to production.
