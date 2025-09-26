# 🚀 CryptoPulse Production Deployment Guide

## Overview

This guide provides step-by-step instructions for deploying CryptoPulse to production using Back4App and GitHub Actions.

## Prerequisites

- Back4App account with production app created
- GitHub repository with proper secrets configured
- Node.js 18+ installed locally
- Back4App CLI installed (`npm install -g @back4app/cli`)

## Environment Setup

### 1. Configure GitHub Secrets

Navigate to your GitHub repository → Settings → Secrets and variables → Actions, and add the following secrets:

#### Production Secrets
```
BACK4APP_APP_ID=your_production_app_id
BACK4APP_MASTER_KEY=your_production_master_key
BACK4APP_JAVASCRIPT_KEY=your_production_js_key
PRODUCTION_URL=https://your-production-domain.com
```

#### Staging Secrets
```
BACK4APP_STAGING_APP_ID=your_staging_app_id
BACK4APP_STAGING_MASTER_KEY=your_staging_master_key
BACK4APP_STAGING_JAVASCRIPT_KEY=your_staging_js_key
STAGING_URL=https://your-staging-domain.com
```

#### External Services
```
SLACK_WEBHOOK=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
SNYK_TOKEN=your_snyk_token
DATADOG_API_KEY=your_datadog_api_key
PAGERDUTY_INTEGRATION_KEY=your_pagerduty_key
```

### 2. Configure Environment Variables

Copy `env.production.example` to `.env.production` and update with your actual values:

```bash
cp env.production.example .env.production
# Edit .env.production with your production secrets
```

### 3. Validate Secrets

Run the secrets validation script to ensure all required secrets are properly configured:

```bash
# Validate production secrets
node scripts/validate-secrets.js production

# Validate staging secrets
node scripts/validate-secrets.js staging
```

## Deployment Process

### Automatic Deployment (Recommended)

The deployment is fully automated via GitHub Actions:

1. **Staging Deployment**: Push to `develop` branch
   - Triggers staging deployment
   - Runs smoke tests
   - Notifies on Slack

2. **Production Deployment**: Push to `main` branch
   - Triggers production deployment
   - Runs comprehensive health checks
   - Validates all secrets
   - Notifies on Slack

### Manual Deployment

If you need to deploy manually:

#### Backend Deployment
```bash
# Install Back4App CLI
npm install -g @back4app/cli

# Deploy cloud functions
back4app deploy cloud --app-id YOUR_APP_ID --master-key YOUR_MASTER_KEY
```

#### Frontend Deployment
```bash
# Build frontend
cd frontend
npm ci
npm run build

# Deploy to static hosting
back4app deploy static --app-id YOUR_APP_ID --master-key YOUR_MASTER_KEY
```

## Health Checks

### Production Health Endpoints

- **Basic Health**: `GET /parse/functions/healthCheck`
- **Production Health**: `GET /parse/functions/productionHealthCheck`
- **System Status**: `GET /parse/functions/getSystemStatus`

### Health Check Response

```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "responseTime": 150,
  "services": {
    "database": {
      "status": "healthy",
      "responseTime": 50,
      "lastCheck": "2024-01-01T00:00:00.000Z"
    },
    "exchanges": {
      "binance": { "status": "healthy", "responseTime": 100 },
      "wazirx": { "status": "healthy", "responseTime": 80 },
      "coindcx": { "status": "healthy", "responseTime": 120 }
    },
    "memory": {
      "rss": 50000000,
      "heapTotal": 20000000,
      "heapUsed": 15000000,
      "external": 1000000
    },
    "uptime": 3600
  },
  "metrics": {
    "requestCount": 1000,
    "errorCount": 5,
    "averageResponseTime": 200,
    "errorRate": 0.5
  }
}
```

## Monitoring & Alerting

### Monitoring Dashboard

Access the monitoring dashboard at: `https://your-domain.com/monitoring`

Features:
- Real-time system metrics
- Trading performance analytics
- Error rate monitoring
- User activity tracking

### Alerting Channels

- **Slack**: Deployment notifications and critical alerts
- **PagerDuty**: System down alerts
- **Email**: Security breach notifications

### Log Aggregation

All logs are automatically collected and can be viewed in:
- Back4App Dashboard → Logs
- External monitoring services (DataDog, New Relic)

## Troubleshooting

### Common Issues

#### 1. Deployment Fails
```bash
# Check secrets validation
node scripts/validate-secrets.js production

# Verify Back4App credentials
back4app apps list
```

#### 2. Health Checks Fail
```bash
# Test individual endpoints
curl -f https://your-domain.com/parse/functions/healthCheck
curl -f https://your-domain.com/parse/functions/productionHealthCheck
```

#### 3. Exchange API Issues
- Check API key validity
- Verify rate limits
- Test individual exchange endpoints

### Rollback Procedure

If deployment fails or issues are detected:

1. **Immediate Rollback**:
   ```bash
   # Revert to previous version
   git revert HEAD
   git push origin main
   ```

2. **Database Rollback**:
   - Use Back4App dashboard to restore from backup
   - Contact Back4App support if needed

3. **Frontend Rollback**:
   ```bash
   # Deploy previous frontend build
   back4app deploy static --app-id YOUR_APP_ID --master-key YOUR_MASTER_KEY --version PREVIOUS_VERSION
   ```

## Security Considerations

### Production Security Checklist

- [ ] All secrets properly configured
- [ ] API keys have appropriate permissions
- [ ] Rate limiting enabled
- [ ] CORS properly configured
- [ ] Security headers enabled
- [ ] Audit logging active
- [ ] Regular security scans scheduled

### Security Monitoring

- Monitor for unusual API usage patterns
- Track failed authentication attempts
- Alert on security-related errors
- Regular security audits

## Performance Optimization

### Backend Optimization

- Enable caching for frequently accessed data
- Optimize database queries
- Implement connection pooling
- Monitor memory usage

### Frontend Optimization

- Enable CDN for static assets
- Implement lazy loading
- Optimize bundle size
- Enable compression

## Maintenance

### Regular Tasks

- **Daily**: Monitor health checks and error rates
- **Weekly**: Review performance metrics and logs
- **Monthly**: Security audit and dependency updates
- **Quarterly**: Full system review and optimization

### Updates

- Keep dependencies up to date
- Monitor for security vulnerabilities
- Test updates in staging first
- Document all changes

## Support

### Internal Support

- Check monitoring dashboard first
- Review logs in Back4App dashboard
- Consult this documentation

### External Support

- Back4App Support: https://www.back4app.com/support
- GitHub Issues: Create issue in repository
- Emergency: Use PagerDuty escalation

## Emergency Procedures

### System Down

1. Check health endpoints
2. Review recent deployments
3. Check external service status
4. Initiate rollback if needed
5. Notify stakeholders via Slack

### Security Incident

1. Immediately disable affected services
2. Review audit logs
3. Notify security team
4. Document incident
5. Implement fixes
6. Post-incident review

---

**Last Updated**: January 2024  
**Version**: 2.0.0  
**Maintainer**: DevOps Team
