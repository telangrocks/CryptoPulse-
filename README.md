# 🚀 CryptoPulse Trading Bot

AI-Powered Cryptocurrency Trading Bot with Real-time Market Analysis

## 🎯 Live Test URL
**Your live test URL will be:** `https://YOUR_USERNAME.github.io/cryptopulse-trading-bot/`

## 🚀 Quick Start

### Development Environment
1. Follow the setup guide in `GITHUB_SETUP_GUIDE.md`
2. Set up SSL: `./scripts/setup-ssl.sh`
3. Deploy: `./deploy.sh`
4. Access: `https://localhost` (with self-signed certificate)

### Production Environment
1. Configure domain in `.env` file
2. Set up SSL: `sudo ./scripts/setup-ssl.sh`
3. Deploy: `sudo ./deploy.sh`
4. Access: `https://your-domain.com`

### SSL/HTTPS Features
- **Let's Encrypt Integration**: Automatic SSL certificates
- **Security Hardening**: Modern TLS, HSTS, CSP headers
- **Automated Renewal**: Certificate management
- **Health Monitoring**: SSL status checks

## 📱 Features
- AI-Powered Trading Strategies
- Real-time Market Analysis
- Automated Trading Bot
- Risk Management
- Performance Analytics
- Multi-Exchange Support

## 🔧 Tech Stack
- **Frontend**: React + TypeScript + Vite
- **Backend**: Parse Server (Back4App)
- **Styling**: Tailwind CSS
- **Deployment**: GitHub Pages
- **SSL/HTTPS**: Let's Encrypt + Nginx + Docker
- **Security**: Modern TLS, HSTS, CSP, Rate Limiting

## 📋 Testing Checklist
- [ ] App loads without errors
- [ ] All pages work correctly
- [ ] Forms and inputs work
- [ ] Navigation works
- [ ] Mobile responsiveness
- [ ] Error handling
- [ ] SSL/HTTPS works correctly
- [ ] Security headers are present
- [ ] Certificate renewal works

## 🚨 Issue Reporting
When you find issues, just tell me:
1. Your live test URL
2. What's broken
3. Steps to reproduce
4. Screenshot (if possible)

## 📚 Documentation
- **SSL Deployment Guide**: `SSL_DEPLOYMENT_GUIDE.md`
- **SSL Implementation Summary**: `SSL_IMPLEMENTATION_SUMMARY.md`
- **GitHub Setup Guide**: `GITHUB_SETUP_GUIDE.md`

## 🔒 SSL Management Commands
```bash
# Quick SSL setup
./scripts/setup-ssl.sh

# Check SSL health
./scripts/ssl-check.sh

# Renew certificates
./scripts/ssl-renew.sh

# Deploy with SSL
./deploy.sh
```

## 🎉 Ready to Test!
Follow the setup guide and start testing your live app with full SSL/HTTPS support!