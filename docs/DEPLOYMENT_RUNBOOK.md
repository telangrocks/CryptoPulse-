# 🚀 **CryptoPulse Deployment Runbook**

## **Overview**

This runbook provides step-by-step procedures for deploying, monitoring, and maintaining the CryptoPulse trading bot in production environments.

---

## **Pre-Deployment Checklist**

### **Environment Preparation**
- [ ] Production server provisioned and configured
- [ ] Domain name configured with DNS
- [ ] SSL certificates obtained (Let's Encrypt or custom)
- [ ] Database and Redis instances provisioned
- [ ] Environment variables configured
- [ ] Monitoring and logging systems ready
- [ ] Backup procedures tested
- [ ] Rollback procedures tested

### **Security Checklist**
- [ ] All secrets rotated and secured
- [ ] Firewall rules configured
- [ ] SSL/TLS certificates valid
- [ ] Security headers configured
- [ ] Rate limiting enabled
- [ ] Audit logging enabled
- [ ] Vulnerability scan completed
- [ ] Penetration testing completed

---

## **Deployment Procedures**

### **1. Initial Deployment**

#### **Step 1: Environment Setup**
```bash
# Clone repository
git clone https://github.com/your-org/cryptopulse.git
cd cryptopulse

# Copy environment configuration
cp env.production.example .env
# Edit .env with production values

# Validate environment
node scripts/validate-env.js
```

#### **Step 2: SSL Certificate Setup**
```bash
# Generate SSL certificates
./scripts/ssl-setup.sh

# Verify SSL configuration
./scripts/ssl-check.sh
```

#### **Step 3: Database Setup**
```bash
# Run database migrations
node scripts/db-migrate.js

# Verify database connectivity
node scripts/db-health-check.js
```

#### **Step 4: Application Deployment**
```bash
# Build and deploy with Docker
docker-compose -f docker-compose.production.yml up -d

# Verify deployment
./scripts/production-validation.js https://your-domain.com
```

#### **Step 5: Health Checks**
```bash
# Check application health
curl -f https://your-domain.com/health

# Check SSL health
curl -f https://your-domain.com/ssl-health

# Check metrics endpoint
curl -f https://your-domain.com/metrics
```

### **2. Rolling Updates**

#### **Step 1: Prepare New Version**
```bash
# Pull latest changes
git pull origin main

# Build new image
docker-compose -f docker-compose.production.yml build

# Test new version
docker-compose -f docker-compose.production.yml up -d --scale backend=0
docker-compose -f docker-compose.production.yml up -d --scale backend=1
```

#### **Step 2: Deploy New Version**
```bash
# Deploy with zero downtime
docker-compose -f docker-compose.production.yml up -d

# Verify deployment
./scripts/production-validation.js https://your-domain.com
```

#### **Step 3: Post-Deployment Verification**
```bash
# Check application health
curl -f https://your-domain.com/health

# Check metrics
curl -f https://your-domain.com/metrics

# Check logs
docker-compose -f docker-compose.production.yml logs --tail=100 backend
```

### **3. Blue-Green Deployment**

#### **Step 1: Prepare Green Environment**
```bash
# Deploy to green environment
docker-compose -f docker-compose.production.yml -p green up -d

# Verify green environment
./scripts/production-validation.js https://green.your-domain.com
```

#### **Step 2: Switch Traffic**
```bash
# Update load balancer to point to green
# (Implementation depends on your load balancer)

# Verify traffic is flowing to green
curl -f https://your-domain.com/health
```

#### **Step 3: Cleanup Blue Environment**
```bash
# Wait for verification period
sleep 300

# Cleanup blue environment
docker-compose -f docker-compose.production.yml -p blue down
```

---

## **Monitoring and Alerting**

### **Key Metrics to Monitor**

#### **Application Metrics**
- Response time (< 2 seconds)
- Error rate (< 1%)
- Throughput (requests per second)
- Memory usage (< 80%)
- CPU usage (< 70%)

#### **Business Metrics**
- Active users
- Trading volume
- Success rate
- Revenue metrics

#### **Infrastructure Metrics**
- Database connections
- Redis memory usage
- Disk space
- Network latency

### **Alerting Rules**

#### **Critical Alerts**
- Application down (5 minutes)
- Database unavailable (2 minutes)
- Redis unavailable (2 minutes)
- SSL certificate expiring (30 days)
- High error rate (> 5% for 5 minutes)

#### **Warning Alerts**
- High response time (> 5 seconds for 10 minutes)
- High memory usage (> 85% for 15 minutes)
- High CPU usage (> 80% for 15 minutes)
- Low disk space (< 20% free)

### **Monitoring Commands**
```bash
# Check application health
curl -f https://your-domain.com/health

# Check Prometheus metrics
curl -f https://your-domain.com/metrics

# Check Grafana dashboard
open https://your-domain.com:3001

# Check logs
docker-compose -f docker-compose.production.yml logs -f backend
```

---

## **Backup and Recovery**

### **Backup Procedures**

#### **Daily Backups**
```bash
# Run automated backup
./scripts/backup.sh

# Verify backup
./scripts/backup-verify.sh
```

#### **Manual Backup**
```bash
# Database backup
docker-compose -f docker-compose.production.yml exec mongodb mongodump --out /backup/mongodb

# Configuration backup
tar -czf config-backup-$(date +%Y%m%d).tar.gz .env nginx.conf docker-compose.production.yml

# SSL certificates backup
tar -czf ssl-backup-$(date +%Y%m%d).tar.gz ssl/ letsencrypt/
```

### **Recovery Procedures**

#### **Database Recovery**
```bash
# Stop application
docker-compose -f docker-compose.production.yml down

# Restore database
docker-compose -f docker-compose.production.yml exec mongodb mongorestore /backup/mongodb

# Start application
docker-compose -f docker-compose.production.yml up -d
```

#### **Full System Recovery**
```bash
# Restore from backup
./scripts/restore.sh backup-20240101.tar.gz

# Verify recovery
./scripts/production-validation.js https://your-domain.com
```

---

## **Troubleshooting**

### **Common Issues**

#### **Application Won't Start**
```bash
# Check logs
docker-compose -f docker-compose.production.yml logs backend

# Check environment variables
docker-compose -f docker-compose.production.yml config

# Check resource usage
docker stats
```

#### **Database Connection Issues**
```bash
# Check database status
docker-compose -f docker-compose.production.yml exec mongodb mongosh --eval "db.adminCommand('ping')"

# Check network connectivity
docker-compose -f docker-compose.production.yml exec backend ping mongodb

# Check database logs
docker-compose -f docker-compose.production.yml logs mongodb
```

#### **SSL Certificate Issues**
```bash
# Check certificate validity
openssl x509 -in ssl/cert.pem -text -noout

# Check certificate chain
openssl verify -CAfile ssl/ca.pem ssl/cert.pem

# Renew certificates
./scripts/ssl-renew.sh
```

#### **High Memory Usage**
```bash
# Check memory usage
docker stats

# Check for memory leaks
docker-compose -f docker-compose.production.yml exec backend node --inspect=0.0.0.0:9229 server.js

# Restart application
docker-compose -f docker-compose.production.yml restart backend
```

#### **Rate Limiting Issues**
```bash
# Check rate limit status
curl -H "X-RateLimit-Limit: 100" https://your-domain.com/api/health

# Check Redis status
docker-compose -f docker-compose.production.yml exec redis redis-cli ping

# Clear rate limit cache
docker-compose -f docker-compose.production.yml exec redis redis-cli flushall
```

### **Performance Issues**

#### **Slow Response Times**
```bash
# Check application metrics
curl -f https://your-domain.com/metrics

# Check database performance
docker-compose -f docker-compose.production.yml exec mongodb mongosh --eval "db.stats()"

# Check Redis performance
docker-compose -f docker-compose.production.yml exec redis redis-cli info stats
```

#### **High Error Rates**
```bash
# Check error logs
docker-compose -f docker-compose.production.yml logs --tail=1000 backend | grep ERROR

# Check application health
curl -f https://your-domain.com/health

# Check external API status
curl -f https://api.binance.com/api/v3/ping
```

---

## **Maintenance Procedures**

### **Regular Maintenance Tasks**

#### **Daily Tasks**
- [ ] Check application health
- [ ] Review error logs
- [ ] Monitor performance metrics
- [ ] Verify backup completion
- [ ] Check SSL certificate validity

#### **Weekly Tasks**
- [ ] Review security logs
- [ ] Update dependencies
- [ ] Clean up old logs
- [ ] Review performance trends
- [ ] Test backup restoration

#### **Monthly Tasks**
- [ ] Security audit
- [ ] Performance optimization
- [ ] Dependency updates
- [ ] Disaster recovery testing
- [ ] Capacity planning review

### **Update Procedures**

#### **Security Updates**
```bash
# Update base images
docker-compose -f docker-compose.production.yml pull

# Rebuild with security updates
docker-compose -f docker-compose.production.yml build --no-cache

# Deploy updates
docker-compose -f docker-compose.production.yml up -d
```

#### **Application Updates**
```bash
# Pull latest code
git pull origin main

# Run tests
npm test

# Deploy with rolling update
docker-compose -f docker-compose.production.yml up -d
```

---

## **Emergency Procedures**

### **Incident Response**

#### **Severity 1: Critical (System Down)**
1. **Immediate Response (0-5 minutes)**
   - Check system status
   - Notify team
   - Start incident response

2. **Initial Assessment (5-15 minutes)**
   - Identify root cause
   - Implement immediate fix if possible
   - Document incident

3. **Resolution (15-60 minutes)**
   - Implement permanent fix
   - Verify system recovery
   - Monitor for stability

4. **Post-Incident (1-24 hours)**
   - Conduct post-mortem
   - Update procedures
   - Implement preventive measures

#### **Severity 2: High (Degraded Performance)**
1. **Immediate Response (0-15 minutes)**
   - Assess impact
   - Notify team
   - Begin troubleshooting

2. **Resolution (15-120 minutes)**
   - Implement fix
   - Verify resolution
   - Monitor performance

3. **Post-Incident (1-7 days)**
   - Review incident
   - Update monitoring
   - Implement improvements

### **Rollback Procedures**

#### **Application Rollback**
```bash
# Stop current version
docker-compose -f docker-compose.production.yml down

# Deploy previous version
git checkout previous-stable-tag
docker-compose -f docker-compose.production.yml up -d

# Verify rollback
./scripts/production-validation.js https://your-domain.com
```

#### **Database Rollback**
```bash
# Stop application
docker-compose -f docker-compose.production.yml down

# Restore previous database state
docker-compose -f docker-compose.production.yml exec mongodb mongorestore /backup/mongodb-previous

# Start application
docker-compose -f docker-compose.production.yml up -d
```

---

## **Contact Information**

### **Team Contacts**
- **On-Call Engineer**: +1-555-0123
- **DevOps Team**: devops@cryptopulse.com
- **Security Team**: security@cryptopulse.com
- **Product Team**: product@cryptopulse.com

### **External Contacts**
- **Hosting Provider**: support@hosting-provider.com
- **Domain Registrar**: support@domain-registrar.com
- **SSL Provider**: support@ssl-provider.com
- **Monitoring Service**: support@monitoring-service.com

---

## **Appendices**

### **A. Environment Variables Reference**
See `env.production.example` for complete list of environment variables.

### **B. Log File Locations**
- Application logs: `/app/logs/application.log`
- Error logs: `/app/logs/error.log`
- Audit logs: `/app/logs/audit.log`
- Nginx logs: `/var/log/nginx/`

### **C. Port Mappings**
- Application: 3000
- Nginx: 80, 443
- Prometheus: 9090
- Grafana: 3001
- MongoDB: 27017 (internal)
- Redis: 6379 (internal)

### **D. File Permissions**
- Application files: 755
- Log files: 700
- SSL certificates: 600
- Configuration files: 644

---

*Last Updated: 2024-01-01*
*Version: 1.0.0*
