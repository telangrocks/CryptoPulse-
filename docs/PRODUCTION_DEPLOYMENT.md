# CryptoPulse Trading Bot - Production Deployment Guide

## Overview

This guide provides comprehensive instructions for deploying the CryptoPulse Trading Bot to production environments. The application is designed to be highly scalable, secure, and maintainable.

## Prerequisites

### System Requirements

- **Operating System**: Linux (Ubuntu 20.04+ recommended)
- **CPU**: 4+ cores
- **RAM**: 8GB+ (16GB recommended)
- **Storage**: 100GB+ SSD
- **Network**: Stable internet connection with static IP

### Software Requirements

- Docker 20.10+
- Docker Compose 2.0+
- Node.js 18+ (for development)
- Git
- SSL certificate (Let's Encrypt recommended)

### External Services

- **Database**: PostgreSQL 15+ or MongoDB 7+
- **Cache**: Redis 7+
- **Monitoring**: Prometheus + Grafana
- **Email**: SMTP server (SendGrid, AWS SES, etc.)
- **SMS**: Twilio (optional)
- **Payments**: Stripe, PayPal, Razorpay, Cashfree
- **Trading APIs**: Binance, Coinbase, etc.

## Environment Configuration

### 1. Clone Repository

```bash
git clone https://github.com/your-org/cryptopulse-trading-bot.git
cd cryptopulse-trading-bot
```

### 2. Environment Variables

Create a `.env` file in the root directory:

```bash
# Application Configuration
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
LOG_LEVEL=info
ENABLE_CONSOLE_LOGS=false

# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/cryptopulse
POSTGRES_DB=cryptopulse
POSTGRES_USER=cryptopulse_user
POSTGRES_PASSWORD=your_secure_password

# Redis Configuration
REDIS_URL=redis://localhost:6379/0
REDIS_PASSWORD=your_redis_password

# Back4App Configuration
BACK4APP_APP_ID=your_app_id
BACK4APP_JAVASCRIPT_KEY=your_javascript_key
BACK4APP_MASTER_KEY=your_master_key
BACK4APP_SERVER_URL=https://parseapi.back4app.com/

# Security Configuration
JWT_SECRET=your_jwt_secret_32_chars_minimum
ENCRYPTION_KEY=your_encryption_key_64_chars_hex
SESSION_SECRET=your_session_secret_32_chars_minimum
CSRF_SECRET=your_csrf_secret_32_chars_minimum

# API Keys
BINANCE_API_KEY=your_binance_api_key
BINANCE_SECRET_KEY=your_binance_secret_key
COINBASE_API_KEY=your_coinbase_api_key
COINBASE_SECRET_KEY=your_coinbase_secret_key

# Email Configuration
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=your_sendgrid_api_key
SMTP_FROM=noreply@yourdomain.com

# Payment Configuration
STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_live_your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Monitoring Configuration
PROMETHEUS_PORT=9090
GRAFANA_PORT=3001
GRAFANA_PASSWORD=your_grafana_password

# SSL Configuration
DOMAIN_NAME=yourdomain.com
SSL_EMAIL=admin@yourdomain.com
LETSENCRYPT_STAGING=false

# Alert Configuration
ALERT_EMAIL=admin@yourdomain.com
ALERT_SLACK_WEBHOOK=https://hooks.slack.com/services/your/webhook/url
```

### 3. SSL Certificate Setup

#### Using Let's Encrypt (Recommended)

```bash
# Install certbot
sudo apt update
sudo apt install certbot

# Generate SSL certificate
sudo certbot certonly --standalone -d yourdomain.com

# Copy certificates to project directory
sudo cp -r /etc/letsencrypt ./ssl
sudo chown -R $USER:$USER ./ssl
```

#### Using Custom SSL Certificate

```bash
# Create ssl directory
mkdir -p ssl

# Copy your certificates
cp your-certificate.crt ssl/
cp your-private-key.key ssl/
cp your-ca-bundle.crt ssl/
```

## Deployment Steps

### 1. Database Setup

#### PostgreSQL

```bash
# Install PostgreSQL
sudo apt update
sudo apt install postgresql postgresql-contrib

# Create database and user
sudo -u postgres psql
CREATE DATABASE cryptopulse;
CREATE USER cryptopulse_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE cryptopulse TO cryptopulse_user;
\q
```

#### Redis

```bash
# Install Redis
sudo apt install redis-server

# Configure Redis
sudo nano /etc/redis/redis.conf
# Set: requirepass your_redis_password
# Set: maxmemory 2gb
# Set: maxmemory-policy allkeys-lru

# Restart Redis
sudo systemctl restart redis-server
```

### 2. Application Deployment

#### Using Docker Compose (Recommended)

```bash
# Build and start services
docker-compose -f docker-compose.production.yml up -d

# Check service status
docker-compose -f docker-compose.production.yml ps

# View logs
docker-compose -f docker-compose.production.yml logs -f
```

#### Manual Deployment

```bash
# Install dependencies
npm install --production

# Build frontend
cd frontend
npm install
npm run build
cd ..

# Run database migrations
npm run migrate

# Start application
npm start
```

### 3. Nginx Configuration

The application includes a production-ready Nginx configuration. Ensure the following:

- SSL certificates are properly configured
- Domain name is set correctly
- Rate limiting is configured
- Security headers are enabled

### 4. Firewall Configuration

```bash
# Allow necessary ports
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw allow 3000/tcp  # Application (if not behind proxy)
sudo ufw allow 9090/tcp  # Prometheus (optional)
sudo ufw allow 3001/tcp  # Grafana (optional)

# Enable firewall
sudo ufw enable
```

## Monitoring and Logging

### 1. Prometheus Metrics

Access Prometheus at `http://yourdomain.com:9090` to view metrics.

### 2. Grafana Dashboards

Access Grafana at `http://yourdomain.com:3001` with the configured password.

### 3. Application Logs

```bash
# View application logs
docker-compose -f docker-compose.production.yml logs -f backend

# View Nginx logs
docker-compose -f docker-compose.production.yml logs -f nginx
```

## Security Considerations

### 1. Environment Variables

- Never commit `.env` files to version control
- Use strong, unique passwords
- Rotate secrets regularly
- Use environment-specific configurations

### 2. Database Security

- Use strong passwords
- Enable SSL connections
- Restrict network access
- Regular backups

### 3. Application Security

- Keep dependencies updated
- Use HTTPS only
- Implement rate limiting
- Monitor for suspicious activity

### 4. Server Security

- Keep system updated
- Use SSH keys instead of passwords
- Configure fail2ban
- Regular security audits

## Backup and Recovery

### 1. Database Backup

```bash
# Create backup script
cat > backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/backup"
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump -h localhost -U cryptopulse_user -d cryptopulse > $BACKUP_DIR/backup_$DATE.sql
find $BACKUP_DIR -name "backup_*.sql" -mtime +7 -delete
EOF

chmod +x backup.sh

# Schedule daily backups
echo "0 2 * * * /path/to/backup.sh" | crontab -
```

### 2. Application Backup

```bash
# Backup application data
tar -czf cryptopulse_backup_$(date +%Y%m%d).tar.gz \
  --exclude=node_modules \
  --exclude=.git \
  --exclude=logs \
  .
```

## Scaling and Performance

### 1. Horizontal Scaling

- Use load balancers
- Implement database read replicas
- Use Redis clustering
- Implement microservices

### 2. Vertical Scaling

- Increase server resources
- Optimize database queries
- Implement caching strategies
- Use CDN for static assets

### 3. Performance Monitoring

- Monitor response times
- Track error rates
- Monitor resource usage
- Set up alerts

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Check database credentials
   - Verify network connectivity
   - Check firewall rules

2. **SSL Certificate Issues**
   - Verify certificate validity
   - Check file permissions
   - Renew certificates before expiry

3. **Memory Issues**
   - Monitor memory usage
   - Increase server RAM
   - Optimize application code

4. **Performance Issues**
   - Check database queries
   - Monitor network latency
   - Review application logs

### Health Checks

```bash
# Application health
curl -f http://yourdomain.com/health

# Database health
docker-compose -f docker-compose.production.yml exec postgres pg_isready

# Redis health
docker-compose -f docker-compose.production.yml exec redis redis-cli ping
```

## Maintenance

### 1. Regular Updates

- Update dependencies monthly
- Apply security patches immediately
- Monitor for new releases

### 2. Log Rotation

```bash
# Configure logrotate
sudo nano /etc/logrotate.d/cryptopulse

# Add configuration
/var/log/cryptopulse/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 root root
}
```

### 3. Monitoring

- Set up alerts for critical metrics
- Monitor disk space
- Check service health regularly
- Review security logs

## Support and Documentation

- **Documentation**: [docs/](./)
- **Issues**: [GitHub Issues](https://github.com/your-org/cryptopulse-trading-bot/issues)
- **Discord**: [Community Server](https://discord.gg/your-server)
- **Email**: support@yourdomain.com

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
