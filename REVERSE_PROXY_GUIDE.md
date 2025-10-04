# CryptoPulse Reverse Proxy & Process Management Guide

## Overview

This guide covers the production-ready reverse proxy and process management setup for CryptoPulse, including Nginx configuration, PM2 process management, Docker optimization, load balancing, SSL/TLS termination, and comprehensive health monitoring.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Nginx Configuration](#nginx-configuration)
3. [PM2 Process Management](#pm2-process-management)
4. [Docker Optimization](#docker-optimization)
5. [Load Balancing & Scaling](#load-balancing--scaling)
6. [SSL/TLS Termination](#ssltls-termination)
7. [Health Monitoring](#health-monitoring)
8. [Security Configuration](#security-configuration)
9. [Performance Optimization](#performance-optimization)
10. [Deployment Guide](#deployment-guide)
11. [Troubleshooting](#troubleshooting)
12. [Best Practices](#best-practices)

## Architecture Overview

### System Components

```
Internet → Nginx (Reverse Proxy) → Load Balancer → Application Servers
    ↓
SSL/TLS Termination
    ↓
Security Headers & Rate Limiting
    ↓
Static Asset Caching
    ↓
API Routing & Load Balancing
    ↓
Health Checks & Monitoring
```

### Key Features

- **Nginx Reverse Proxy**: High-performance web server with SSL termination
- **PM2 Process Management**: Node.js application process management with clustering
- **Docker Optimization**: Multi-stage builds and production-ready containers
- **Load Balancing**: Multiple backend instances with health checks
- **SSL/TLS Security**: Modern encryption and security headers
- **Health Monitoring**: Comprehensive system and service monitoring
- **Auto-scaling**: Dynamic scaling based on load and metrics

## Nginx Configuration

### Main Configuration (`nginx.conf`)

The main Nginx configuration provides:

- **SSL/TLS Termination**: Modern encryption protocols and ciphers
- **Security Headers**: Comprehensive security header implementation
- **Rate Limiting**: API and authentication endpoint protection
- **Load Balancing**: Multiple backend instances with health checks
- **Static Asset Caching**: Optimized caching for frontend assets
- **Gzip Compression**: Response compression for better performance

### Frontend Configuration (`nginx/nginx.frontend.conf`)

Optimized for React SPA with:

- **SPA Routing**: Proper handling of React Router routes
- **Static Asset Optimization**: Long-term caching for assets
- **Security Headers**: Content Security Policy and other security measures
- **Performance Optimization**: Gzip compression and caching strategies

### Key Configuration Features

```nginx
# SSL Configuration
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
ssl_prefer_server_ciphers off;

# Security Headers
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;

# Rate Limiting
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=auth:10m rate=5r/s;

# Load Balancing
upstream backend {
    server backend:1337 weight=3 max_fails=3 fail_timeout=30s;
    server backend-2:1337 weight=2 max_fails=3 fail_timeout=30s;
    least_conn;
}
```

## PM2 Process Management

### Configuration (`ecosystem.config.js`)

PM2 provides advanced process management with:

- **Clustering**: Multiple Node.js instances for better performance
- **Auto-restart**: Automatic restart on crashes or memory limits
- **Log Management**: Centralized logging with rotation
- **Monitoring**: Built-in monitoring and metrics
- **Environment Management**: Different configurations for different environments

### Key Features

```javascript
module.exports = {
  apps: [{
    name: 'cryptopulse-backend',
    script: './backend/server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'development',
      PORT: 1337
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 1337
    },
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=4096'
  }]
};
```

### PM2 Commands

```bash
# Start applications
pm2 start ecosystem.config.js --env production

# Monitor applications
pm2 monit

# View logs
pm2 logs

# Restart applications
pm2 restart all

# Stop applications
pm2 stop all

# Delete applications
pm2 delete all

# Save PM2 configuration
pm2 save

# Setup PM2 startup
pm2 startup
```

## Docker Optimization

### Multi-stage Dockerfiles

Optimized Docker builds with:

- **Multi-stage Builds**: Separate build and runtime environments
- **Non-root Users**: Security best practices
- **Health Checks**: Container health monitoring
- **Resource Limits**: Memory and CPU constraints
- **Security Scanning**: Vulnerability scanning in CI/CD

### Backend Dockerfile

```dockerfile
# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Production stage
FROM node:20-alpine AS production
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001
WORKDIR /app

# Copy built application
COPY --from=builder /app/node_modules ./node_modules
COPY --chown=nextjs:nodejs . .

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:1337/health || exit 1

USER nextjs
EXPOSE 1337
CMD ["node", "server.js"]
```

### Frontend Dockerfile

```dockerfile
# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine AS production
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx/nginx.frontend.conf /etc/nginx/nginx.conf

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost/health || exit 1

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## Load Balancing & Scaling

### Nginx Load Balancing

Configured with multiple strategies:

- **Round Robin**: Default distribution method
- **Least Connections**: Route to server with fewest active connections
- **Weighted Round Robin**: Custom weights for different servers
- **Health Checks**: Automatic failover for unhealthy servers

### Auto-scaling Configuration

```yaml
# docker-compose.yml
services:
  backend:
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 256M
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
        window: 120s
```

### Scaling Scripts

```bash
# Scale backend services
docker-compose up -d --scale backend=5

# Scale with resource limits
docker-compose up -d --scale backend=3 --scale frontend=2
```

## SSL/TLS Termination

### Certificate Management

- **Let's Encrypt**: Automated certificate renewal
- **Wildcard Certificates**: Support for multiple subdomains
- **Certificate Rotation**: Automated renewal process
- **Security Headers**: HSTS and other security measures

### SSL Configuration

```nginx
# SSL Configuration
ssl_certificate /etc/nginx/ssl/cert.pem;
ssl_certificate_key /etc/nginx/ssl/private-key.pem;
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
ssl_prefer_server_ciphers off;
ssl_session_cache shared:SSL:10m;
ssl_session_timeout 10m;

# Security Headers
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```

### Certificate Renewal

```bash
# Check certificate expiration
openssl x509 -in /etc/nginx/ssl/cert.pem -text -noout | grep "Not After"

# Renew Let's Encrypt certificate
certbot renew --nginx

# Reload Nginx
nginx -s reload
```

## Health Monitoring

### Health Monitor Script

The `scripts/health-monitor.js` provides comprehensive monitoring:

- **Service Health Checks**: HTTP, database, and cache health
- **System Metrics**: CPU, memory, disk, and network monitoring
- **Alerting**: Email, Slack, and webhook notifications
- **Performance Tracking**: Response times and error rates

### Health Check Endpoints

```javascript
// Backend health endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version
  });
});

// Detailed health endpoint
app.get('/health/detailed', async (req, res) => {
  const health = await getDetailedHealth();
  res.json(health);
});
```

### Monitoring Commands

```bash
# Start health monitoring
node scripts/health-monitor.js start

# Check health status
node scripts/health-monitor.js status

# View system metrics
node scripts/health-monitor.js metrics

# View alerts
node scripts/health-monitor.js alerts

# Stop monitoring
node scripts/health-monitor.js stop
```

## Security Configuration

### Security Headers

```nginx
# Security Headers
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://api.cryptopulse.com; frame-ancestors 'self';" always;
```

### Rate Limiting

```nginx
# Rate limiting zones
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=auth:10m rate=5r/s;
limit_req_zone $binary_remote_addr zone=upload:10m rate=1r/s;

# Apply rate limiting
location /api/ {
    limit_req zone=api burst=20 nodelay;
    proxy_pass http://backend;
}

location /api/auth/ {
    limit_req zone=auth burst=10 nodelay;
    proxy_pass http://backend;
}
```

### DDoS Protection

```nginx
# Connection limiting
limit_conn_zone $binary_remote_addr zone=conn_limit_per_ip:10m;
limit_conn conn_limit_per_ip 10;

# Request limiting
limit_req_zone $binary_remote_addr zone=req_limit_per_ip:10m rate=5r/s;
limit_req zone=req_limit_per_ip burst=10 nodelay;
```

## Performance Optimization

### Caching Strategy

```nginx
# Static asset caching
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
    add_header X-Content-Type-Options nosniff;
}

# API response caching
location /api/static/ {
    proxy_cache api_cache;
    proxy_cache_valid 200 5m;
    proxy_cache_valid 404 1m;
    proxy_cache_key $scheme$proxy_host$request_uri;
    proxy_pass http://backend;
}
```

### Gzip Compression

```nginx
# Gzip compression
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_proxied any;
gzip_comp_level 6;
gzip_types
    text/plain
    text/css
    text/xml
    text/javascript
    application/json
    application/javascript
    application/xml+rss
    application/atom+xml
    image/svg+xml;
```

### Connection Optimization

```nginx
# Connection settings
keepalive_timeout 65;
keepalive_requests 100;
tcp_nopush on;
tcp_nodelay on;
sendfile on;
```

## Deployment Guide

### Production Deployment

1. **Environment Setup**
   ```bash
   # Copy environment templates
   cp env-templates/backend.env .env.backend
   cp env-templates/frontend.env .env.frontend
   
   # Generate secrets
   node scripts/generate-secrets.js
   ```

2. **SSL Certificate Setup**
   ```bash
   # Generate self-signed certificates for testing
   openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
     -keyout /etc/nginx/ssl/private-key.pem \
     -out /etc/nginx/ssl/cert.pem
   
   # Or use Let's Encrypt for production
   certbot --nginx -d api.cryptopulse.com -d app.cryptopulse.com
   ```

3. **Docker Deployment**
   ```bash
   # Build and start services
   docker-compose up -d --build
   
   # Scale services
   docker-compose up -d --scale backend=3 --scale frontend=2
   
   # Check status
   docker-compose ps
   ```

4. **PM2 Deployment**
   ```bash
   # Start with PM2
   pm2 start ecosystem.config.js --env production
   
   # Save PM2 configuration
   pm2 save
   
   # Setup startup script
   pm2 startup
   ```

### Health Checks

```bash
# Check Nginx status
nginx -t
systemctl status nginx

# Check PM2 status
pm2 status
pm2 monit

# Check Docker containers
docker-compose ps
docker-compose logs -f

# Check health endpoints
curl -f http://localhost/health
curl -f http://localhost:1337/health
```

## Troubleshooting

### Common Issues

1. **Nginx Configuration Errors**
   ```bash
   # Test configuration
   nginx -t
   
   # Reload configuration
   nginx -s reload
   
   # Check error logs
   tail -f /var/log/nginx/error.log
   ```

2. **PM2 Process Issues**
   ```bash
   # Check PM2 logs
   pm2 logs
   
   # Restart specific process
   pm2 restart cryptopulse-backend
   
   # Check process details
   pm2 show cryptopulse-backend
   ```

3. **Docker Container Issues**
   ```bash
   # Check container logs
   docker-compose logs backend
   
   # Restart specific service
   docker-compose restart backend
   
   # Check container status
   docker-compose ps
   ```

4. **SSL Certificate Issues**
   ```bash
   # Check certificate validity
   openssl x509 -in /etc/nginx/ssl/cert.pem -text -noout
   
   # Test SSL connection
   openssl s_client -connect api.cryptopulse.com:443
   ```

### Performance Issues

1. **High Memory Usage**
   - Check PM2 memory limits
   - Monitor Docker container resources
   - Optimize Node.js heap size

2. **Slow Response Times**
   - Check Nginx access logs
   - Monitor backend performance
   - Verify database connections

3. **High CPU Usage**
   - Check system load
   - Monitor process CPU usage
   - Optimize application code

### Security Issues

1. **SSL/TLS Problems**
   - Verify certificate validity
   - Check cipher compatibility
   - Update security headers

2. **Rate Limiting Issues**
   - Adjust rate limits
   - Check for false positives
   - Monitor abuse patterns

## Best Practices

### Security Best Practices

1. **Keep Software Updated**
   - Regular Nginx updates
   - Node.js version management
   - Docker image updates

2. **Monitor Security Headers**
   - Regular security audits
   - CSP policy updates
   - HSTS configuration

3. **Implement Proper Authentication**
   - JWT token validation
   - Rate limiting on auth endpoints
   - Session management

### Performance Best Practices

1. **Optimize Caching**
   - Static asset caching
   - API response caching
   - Database query caching

2. **Monitor Resource Usage**
   - Memory usage tracking
   - CPU utilization monitoring
   - Disk space management

3. **Implement Load Balancing**
   - Multiple backend instances
   - Health check monitoring
   - Automatic failover

### Monitoring Best Practices

1. **Comprehensive Health Checks**
   - Service health monitoring
   - System metrics tracking
   - Performance monitoring

2. **Alerting Configuration**
   - Critical alert thresholds
   - Multiple notification channels
   - Escalation policies

3. **Log Management**
   - Centralized logging
   - Log rotation and archival
   - Security event monitoring

## Conclusion

This guide provides a comprehensive overview of the CryptoPulse reverse proxy and process management setup. The configuration is production-ready and includes:

- **High Performance**: Optimized Nginx configuration with caching and compression
- **Security**: Comprehensive security headers, rate limiting, and SSL/TLS
- **Scalability**: Load balancing and auto-scaling capabilities
- **Monitoring**: Health checks and performance monitoring
- **Reliability**: Process management and automatic recovery

For additional support or questions, refer to the troubleshooting section or contact the development team.

## Additional Resources

- [Nginx Documentation](https://nginx.org/en/docs/)
- [PM2 Documentation](https://pm2.keymetrics.io/docs/)
- [Docker Documentation](https://docs.docker.com/)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [SSL Labs SSL Test](https://www.ssllabs.com/ssltest/)
- [Security Headers](https://securityheaders.com/)
