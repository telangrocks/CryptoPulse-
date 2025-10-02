<<<<<<< HEAD
# 🚀 CryptoPulse Deployment Guide

This comprehensive guide will walk you through deploying CryptoPulse to production using Northflank cloud platform.

## 📋 Prerequisites

### Required Tools
- **Node.js** 20.x or higher
- **npm** 9.x or higher
- **Docker** (for local testing)
- **Git** (for version control)
- **Northflank CLI** (`npm install -g @northflank/cli`)

### Required Accounts
- **Northflank Account** - [Sign up here](https://northflank.com)
- **Database Provider** - PostgreSQL, MongoDB, Redis
- **Exchange APIs** - Binance, WazirX, CoinDCX, etc.
- **Payment Gateway** - Cashfree account

## 🏗️ Infrastructure Setup

### 1. Database Setup

#### PostgreSQL (Primary Database)
```bash
# Create database
createdb cryptopulse_production

# Create user
createuser -P cryptopulse_user

# Grant privileges
psql -c "GRANT ALL PRIVILEGES ON DATABASE cryptopulse_production TO cryptopulse_user;"
```

#### MongoDB (Optional - for logs and analytics)
```bash
# Install MongoDB
# Create database and user
use cryptopulse
db.createUser({
  user: "cryptopulse_user",
  pwd: "your_password",
  roles: ["readWrite"]
})
```

#### Redis (Caching)
```bash
# Install Redis
# Configure Redis with password
redis-cli
CONFIG SET requirepass your_redis_password
```

### 2. Exchange API Setup

#### Binance API
1. Go to [Binance API Management](https://www.binance.com/en/my/settings/api-management)
2. Create new API key
3. Enable "Enable Trading" and "Enable Futures"
4. Set IP restrictions for security
5. Save API key and secret

#### WazirX API
1. Go to [WazirX API](https://wazirx.com/in/api-keys)
2. Create new API key
3. Enable trading permissions
4. Save API key and secret

#### CoinDCX API
1. Go to [CoinDCX API](https://coindcx.com/api)
2. Create new API key
3. Enable trading permissions
4. Save API key and secret

### 3. Payment Gateway Setup

#### Cashfree Setup
1. Go to [Cashfree Dashboard](https://merchant.cashfree.com)
2. Create new application
3. Get App ID and Secret Key
4. Configure webhook URL: `https://api.cryptopulse.com/api/payment/webhook`
5. Test in sandbox mode first

## 🔧 Environment Configuration

### 1. Backend Environment
```bash
# Copy template
cp env-templates/backend.env backend/.env.production

# Edit configuration
nano backend/.env.production
```

**Key Configuration:**
```env
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@host:5432/cryptopulse_prod
REDIS_URL=redis://user:pass@host:6379/0
JWT_SECRET=your_strong_jwt_secret
ENCRYPTION_KEY=your_strong_encryption_key
BINANCE_API_KEY=your_binance_key
BINANCE_SECRET_KEY=your_binance_secret
CASHFREE_APP_ID=your_cashfree_app_id
CASHFREE_SECRET_KEY=your_cashfree_secret
```

### 2. Frontend Environment
```bash
# Copy template
cp env-templates/frontend.env frontend/.env.production

# Edit configuration
nano frontend/.env.production
```

**Key Configuration:**
```env
VITE_API_BASE_URL=https://api.cryptopulse.com
VITE_PRODUCTION_API_URL=https://api.cryptopulse.com
VITE_PRODUCTION_FRONTEND_URL=https://app.cryptopulse.com
VITE_CASHFREE_APP_ID=your_cashfree_app_id
VITE_CASHFREE_MODE=production
```

### 3. Cloud Functions Environment
```bash
# Copy template
cp env-templates/cloud.env cloud/.env

# Edit configuration
nano cloud/.env
```

## 🚀 Deployment Process

### 1. Northflank Setup

#### Login to Northflank
```bash
northflank auth login
```

#### Create Project
```bash
northflank project create cryptopulse --description "CryptoPulse Trading Platform"
```

### 2. Deploy Services

#### Option A: Automated Deployment
```bash
# Deploy all services
npm run deploy:all

# Deploy specific service
npm run deploy:frontend
npm run deploy:backend
npm run deploy:cloud-functions
```

#### Option B: Manual Deployment

**Deploy Backend:**
```bash
cd backend
northflank service create \
  --project cryptopulse \
  --name cryptopulse-backend \
  --type container \
  --source . \
  --port 1337 \
  --env-file .env.production
```

**Deploy Frontend:**
```bash
cd frontend
npm run build:production
northflank service create \
  --project cryptopulse \
  --name cryptopulse-frontend \
  --type static \
  --source dist \
  --domain app.cryptopulse.com
```

**Deploy Cloud Functions:**
```bash
cd cloud
northflank service create \
  --project cryptopulse \
  --name cryptopulse-cloud-functions \
  --type serverless \
  --source . \
  --runtime nodejs18
```

### 3. Domain Configuration

#### Configure Custom Domains
1. Go to Northflank Dashboard
2. Navigate to your project
3. Go to "Domains" section
4. Add custom domains:
   - `app.cryptopulse.com` → Frontend service
   - `api.cryptopulse.com` → Backend service

#### SSL Certificates
1. Northflank automatically provisions SSL certificates
2. Verify domain ownership
3. Wait for certificate provisioning (5-10 minutes)

## 🔍 Post-Deployment Verification

### 1. Health Checks
```bash
# Check backend health
curl https://api.cryptopulse.com/health

# Check frontend
curl https://app.cryptopulse.com

# Check cloud functions
curl https://your-cloud-functions-url/health
```

### 2. Database Connectivity
```bash
# Test database connection
curl https://api.cryptopulse.com/api/v1/health/detailed
```

### 3. Exchange API Testing
```bash
# Test exchange connectivity
curl -X POST https://api.cryptopulse.com/api/v1/exchanges/balances \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"exchange": "binance", "apiKey": "test", "secretKey": "test"}'
```

### 4. Payment Gateway Testing
```bash
# Test payment gateway
curl -X POST https://api.cryptopulse.com/api/v1/payment/create-order \
  -H "Content-Type: application/json" \
  -d '{"planId": "basic", "userId": "test", "customerDetails": {"name": "Test", "email": "test@example.com"}}'
```

## 🔒 Security Configuration

### 1. Environment Variables
- ✅ All secrets stored in environment variables
- ✅ No hardcoded credentials in code
- ✅ Strong, unique secrets for production
- ✅ Regular secret rotation

### 2. Database Security
- ✅ Database access restricted by IP
- ✅ Strong passwords for all database users
- ✅ SSL/TLS encryption enabled
- ✅ Regular backups configured

### 3. API Security
- ✅ Rate limiting enabled
- ✅ CORS properly configured
- ✅ JWT tokens with expiration
- ✅ Input validation and sanitization

### 4. Network Security
- ✅ HTTPS enforced
- ✅ Security headers configured
- ✅ DDoS protection enabled
- ✅ Firewall rules configured

## 📊 Monitoring Setup

### 1. Application Monitoring
```bash
# Enable monitoring in Northflank
northflank monitoring enable --project cryptopulse
```

### 2. Log Aggregation
- Configure log forwarding to external service
- Set up log retention policies
- Enable log search and filtering

### 3. Alerting
- Set up Slack notifications
- Configure email alerts
- Set up PagerDuty for critical issues

### 4. Performance Monitoring
- Enable APM (Application Performance Monitoring)
- Set up custom metrics
- Configure dashboards

## 🔄 CI/CD Pipeline

### 1. GitHub Actions Setup
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run test:ci
      - run: npm run deploy:all
        env:
          NORTHFLANK_API_KEY: ${{ secrets.NORTHFLANK_API_KEY }}
```

### 2. Automated Testing
- Unit tests run on every commit
- Integration tests run on pull requests
- E2E tests run before deployment
- Security scans run automatically

## 🚨 Troubleshooting

### Common Issues

#### 1. Database Connection Failed
```bash
# Check database URL
echo $DATABASE_URL

# Test connection
psql $DATABASE_URL -c "SELECT 1;"
```

#### 2. Exchange API Errors
- Verify API keys are correct
- Check IP restrictions
- Ensure sufficient permissions
- Test with sandbox first

#### 3. Payment Gateway Issues
- Verify webhook URL is accessible
- Check webhook signature validation
- Ensure proper SSL configuration
- Test with sandbox mode

#### 4. Frontend Build Errors
```bash
# Clear cache and rebuild
rm -rf node_modules package-lock.json
npm install
npm run build:production
```

### Debug Commands
```bash
# Check service logs
northflank logs --project cryptopulse --service cryptopulse-backend

# Check service status
northflank service status --project cryptopulse --service cryptopulse-backend

# Restart service
northflank service restart --project cryptopulse --service cryptopulse-backend
```

## 📈 Scaling Considerations

### 1. Horizontal Scaling
- Configure auto-scaling policies
- Set up load balancers
- Implement database read replicas
- Use CDN for static assets

### 2. Performance Optimization
- Enable Redis caching
- Implement database indexing
- Use connection pooling
- Optimize API responses

### 3. Cost Optimization
- Monitor resource usage
- Implement auto-scaling
- Use spot instances where possible
- Regular cost reviews

## 🔄 Maintenance

### 1. Regular Updates
- Keep dependencies updated
- Apply security patches
- Update Node.js version
- Monitor for vulnerabilities

### 2. Backup Strategy
- Daily database backups
- Configuration backups
- Code repository backups
- Test restore procedures

### 3. Monitoring
- Set up health checks
- Monitor error rates
- Track performance metrics
- Regular security audits

## 📞 Support

### Getting Help
- **Documentation**: Check this guide and README
- **Issues**: Create GitHub issues for bugs
- **Discussions**: Use GitHub discussions for questions
- **Email**: support@cryptopulse.app

### Emergency Contacts
- **Technical Lead**: tech-lead@cryptopulse.app
- **DevOps Team**: devops@cryptopulse.app
- **Security Team**: security@cryptopulse.app

---

**🎉 Congratulations!** Your CryptoPulse trading platform is now deployed and ready for production use.

**Next Steps:**
1. Configure monitoring and alerting
2. Set up user onboarding
3. Implement backup procedures
4. Plan for scaling
5. Regular security audits
=======
# 🚀 CryptoPulse Production Deployment Guide

**Version:** 2.0.0  
**Last Updated:** October 1, 2024

---

## 📋 Pre-Deployment Checklist

### ✅ **Critical Requirements (Must Complete)**
- [ ] All security vulnerabilities fixed
- [ ] Test coverage above 60%
- [ ] Environment variables configured
- [ ] Database migrations ready
- [ ] SSL certificates obtained
- [ ] Monitoring setup complete
- [ ] Backup strategy implemented

### ⚠️ **Security Checklist**
- [ ] All dependencies updated and audited
- [ ] Strong secrets generated (32+ characters)
- [ ] API keys encrypted and secured
- [ ] CSRF protection enabled
- [ ] Rate limiting configured
- [ ] Security headers implemented
- [ ] Input validation active

---

## 🏗️ Infrastructure Setup

### **1. Server Requirements**

#### **Minimum Specifications:**
- **CPU:** 4 cores, 2.4GHz+
- **RAM:** 8GB (16GB recommended)
- **Storage:** 100GB SSD
- **Network:** 1Gbps connection
- **OS:** Ubuntu 20.04 LTS or CentOS 8+

#### **Recommended Specifications:**
- **CPU:** 8 cores, 3.0GHz+
- **RAM:** 32GB
- **Storage:** 500GB NVMe SSD
- **Network:** 10Gbps connection
- **OS:** Ubuntu 22.04 LTS

### **2. Database Setup**

#### **PostgreSQL Configuration:**
```bash
# Install PostgreSQL 14+
sudo apt update
sudo apt install postgresql postgresql-contrib

# Create database and user
sudo -u postgres psql
CREATE DATABASE cryptopulse_prod;
CREATE USER cryptopulse_app WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE cryptopulse_prod TO cryptopulse_app;
\q
```

#### **Redis Configuration:**
```bash
# Install Redis
sudo apt install redis-server

# Configure Redis
sudo nano /etc/redis/redis.conf
# Set: requirepass your_redis_password
# Set: maxmemory 2gb
# Set: maxmemory-policy allkeys-lru

sudo systemctl restart redis-server
```

### **3. Load Balancer Setup (Nginx)**

```nginx
# /etc/nginx/sites-available/cryptopulse
upstream backend {
    server 127.0.0.1:1337;
    server 127.0.0.1:1338;
    server 127.0.0.1:1339;
}

server {
    listen 80;
    server_name api.cryptopulse.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.cryptopulse.com;

    ssl_certificate /etc/ssl/certs/cryptopulse.crt;
    ssl_certificate_key /etc/ssl/private/cryptopulse.key;
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload";

    location / {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 🔧 Application Deployment

### **1. Environment Setup**

#### **Backend Environment (.env.production):**
```bash
# Node Environment
NODE_ENV=production
PORT=1337
HOST=0.0.0.0

# Database
DATABASE_URL=postgresql://cryptopulse_app:your_password@localhost:5432/cryptopulse_prod
REDIS_URL=redis://:your_redis_password@localhost:6379

# Security (Generate strong secrets!)
JWT_SECRET=your_32_character_jwt_secret_here
ENCRYPTION_KEY=your_32_character_encryption_key_here
CSRF_SECRET=your_32_character_csrf_secret_here
SESSION_SECRET=your_32_character_session_secret_here

# Exchange APIs (Optional)
BINANCE_API_KEY=your_binance_api_key
BINANCE_SECRET_KEY=your_binance_secret_key
WAZIRX_API_KEY=your_wazirx_api_key
WAZIRX_SECRET_KEY=your_wazirx_secret_key

# Payment (Required for payments)
CASHFREE_APP_ID=your_cashfree_app_id
CASHFREE_SECRET_KEY=your_cashfree_secret_key
CASHFREE_WEBHOOK_SECRET=your_webhook_secret
CASHFREE_MODE=live

# URLs
FRONTEND_URL=https://app.cryptopulse.com
BACKEND_URL=https://api.cryptopulse.com

# Monitoring
LOG_LEVEL=info
SLACK_WEBHOOK_URL=your_slack_webhook_url
```

#### **Frontend Environment (.env.production):**
```bash
VITE_API_BASE_URL=https://api.cryptopulse.com
VITE_BACKEND_URL=https://api.cryptopulse.com
VITE_APP_NAME=CryptoPulse Trading Bot
VITE_APP_VERSION=2.0.0
VITE_APP_ENVIRONMENT=production
```

### **2. Database Migration**

```bash
# Run database migrations
cd backend
npm run migrate:prod

# Verify database setup
psql -h localhost -U cryptopulse_app -d cryptopulse_prod -c "\dt"
```

### **3. Application Deployment**

#### **Backend Deployment:**
```bash
# Clone repository
git clone https://github.com/your-org/cryptopulse.git
cd cryptopulse/backend

# Install dependencies
npm ci --production

# Set up environment
cp .env.production.example .env.production
# Edit .env.production with your values

# Run database migrations
npm run migrate:prod

# Start application with PM2
npm install -g pm2
pm2 start index.js --name "cryptopulse-backend" --instances 3
pm2 save
pm2 startup
```

#### **Frontend Deployment:**
```bash
cd frontend

# Install dependencies
npm ci

# Build for production
npm run build:production

# Deploy to web server
sudo cp -r dist/* /var/www/html/
sudo chown -R www-data:www-data /var/www/html/
```

---

## 🔒 Security Configuration

### **1. SSL/TLS Setup**

#### **Using Let's Encrypt:**
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d api.cryptopulse.com -d app.cryptopulse.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### **2. Firewall Configuration**

```bash
# Configure UFW
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### **3. Security Headers**

Add to your Nginx configuration:
```nginx
# Security headers
add_header X-Frame-Options DENY;
add_header X-Content-Type-Options nosniff;
add_header X-XSS-Protection "1; mode=block";
add_header Referrer-Policy "strict-origin-when-cross-origin";
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://api.cryptopulse.com;";
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload";
```

---

## 📊 Monitoring Setup

### **1. Application Monitoring**

#### **PM2 Monitoring:**
```bash
# Install PM2 monitoring
pm2 install pm2-server-monit

# View monitoring dashboard
pm2 monit
```

#### **Log Management:**
```bash
# Set up log rotation
sudo nano /etc/logrotate.d/cryptopulse

# Add:
/var/log/cryptopulse/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
}
```

### **2. Database Monitoring**

```sql
-- Enable query logging
ALTER SYSTEM SET log_statement = 'all';
ALTER SYSTEM SET log_min_duration_statement = 1000;
SELECT pg_reload_conf();

-- Monitor slow queries
SELECT query, mean_time, calls, total_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

### **3. System Monitoring**

#### **Install monitoring tools:**
```bash
# Install htop, iotop, nethogs
sudo apt install htop iotop nethogs

# Monitor system resources
htop
iotop
nethogs
```

---

## 🔄 Backup Strategy

### **1. Database Backup**

```bash
# Create backup script
sudo nano /usr/local/bin/backup-db.sh

#!/bin/bash
BACKUP_DIR="/var/backups/cryptopulse"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# Backup database
pg_dump -h localhost -U cryptopulse_app cryptopulse_prod > $BACKUP_DIR/cryptopulse_$DATE.sql

# Compress backup
gzip $BACKUP_DIR/cryptopulse_$DATE.sql

# Keep only last 30 days
find $BACKUP_DIR -name "cryptopulse_*.sql.gz" -mtime +30 -delete

# Make executable
sudo chmod +x /usr/local/bin/backup-db.sh

# Schedule daily backups
sudo crontab -e
# Add: 0 2 * * * /usr/local/bin/backup-db.sh
```

### **2. Application Backup**

```bash
# Backup application files
sudo tar -czf /var/backups/cryptopulse_app_$(date +%Y%m%d).tar.gz /opt/cryptopulse/
```

---

## 🚀 Deployment Scripts

### **1. Automated Deployment Script**

```bash
#!/bin/bash
# deploy.sh

set -e

echo "🚀 Starting CryptoPulse deployment..."

# Pull latest code
git pull origin main

# Install backend dependencies
cd backend
npm ci --production

# Run database migrations
npm run migrate:prod

# Restart backend services
pm2 restart cryptopulse-backend

# Build frontend
cd ../frontend
npm ci
npm run build:production

# Deploy frontend
sudo cp -r dist/* /var/www/html/
sudo chown -R www-data:www-data /var/www/html/

# Restart web server
sudo systemctl reload nginx

echo "✅ Deployment completed successfully!"
```

### **2. Health Check Script**

```bash
#!/bin/bash
# health-check.sh

# Check backend health
BACKEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://api.cryptopulse.com/health)
if [ $BACKEND_STATUS -ne 200 ]; then
    echo "❌ Backend health check failed: $BACKEND_STATUS"
    exit 1
fi

# Check database connection
DB_STATUS=$(psql -h localhost -U cryptopulse_app -d cryptopulse_prod -c "SELECT 1;" 2>/dev/null | grep -c "1")
if [ $DB_STATUS -ne 1 ]; then
    echo "❌ Database health check failed"
    exit 1
fi

# Check Redis connection
REDIS_STATUS=$(redis-cli ping 2>/dev/null | grep -c "PONG")
if [ $REDIS_STATUS -ne 1 ]; then
    echo "❌ Redis health check failed"
    exit 1
fi

echo "✅ All health checks passed"
```

---

## 🔧 Troubleshooting

### **Common Issues:**

#### **1. Database Connection Issues**
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Check connection
psql -h localhost -U cryptopulse_app -d cryptopulse_prod

# Check logs
sudo tail -f /var/log/postgresql/postgresql-14-main.log
```

#### **2. Application Crashes**
```bash
# Check PM2 logs
pm2 logs cryptopulse-backend

# Restart application
pm2 restart cryptopulse-backend

# Check system resources
htop
df -h
free -h
```

#### **3. SSL Certificate Issues**
```bash
# Check certificate status
sudo certbot certificates

# Renew certificate
sudo certbot renew --dry-run

# Check Nginx configuration
sudo nginx -t
```

---

## 📞 Support & Maintenance

### **Monitoring Dashboards:**
- **Application:** PM2 Monit
- **System:** htop, iotop
- **Database:** pgAdmin or similar
- **Logs:** /var/log/cryptopulse/

### **Emergency Contacts:**
- **System Admin:** admin@cryptopulse.com
- **Database Admin:** dba@cryptopulse.com
- **Security Team:** security@cryptopulse.com

### **Maintenance Windows:**
- **Weekly:** Sunday 2:00 AM - 4:00 AM UTC
- **Monthly:** First Saturday 1:00 AM - 3:00 AM UTC
- **Emergency:** As needed

---

## ✅ Post-Deployment Verification

### **1. Functional Tests**
- [ ] User registration works
- [ ] User login works
- [ ] API endpoints respond correctly
- [ ] Database operations work
- [ ] File uploads work
- [ ] Email notifications work

### **2. Performance Tests**
- [ ] Page load times < 3 seconds
- [ ] API response times < 500ms
- [ ] Database queries < 100ms
- [ ] Memory usage stable
- [ ] CPU usage < 80%

### **3. Security Tests**
- [ ] SSL certificate valid
- [ ] Security headers present
- [ ] Rate limiting working
- [ ] Input validation working
- [ ] Authentication secure

---

**🎉 Congratulations! Your CryptoPulse application is now deployed and ready for production use.**

*For additional support, please refer to the main README.md or contact the development team.*
>>>>>>> b69be33d8a2727c1f7d3135b8d84998776c27e7e
