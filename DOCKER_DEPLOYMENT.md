# 🐳 CryptoPulse Trading Bot - Docker Deployment Guide

This guide provides comprehensive instructions for deploying the CryptoPulse Trading Bot using Docker and Docker Compose.

## 📋 Prerequisites

- Docker 20.10+ installed
- Docker Compose 2.0+ installed
- At least 4GB RAM available
- At least 10GB disk space

## 🚀 Quick Start

### 1. Clone and Setup
```bash
git clone <your-repo-url>
cd cryptopulse-trading-bot
```

### 2. Environment Configuration
```bash
# Copy the production environment template
cp env.production.example .env

# Edit the .env file with your actual values
nano .env
```

**Required Environment Variables:**
- `VITE_BACK4APP_APP_ID` - Your Back4App Application ID
- `VITE_BACK4APP_CLIENT_KEY` - Your Back4App Client Key
- `VITE_BACK4APP_MASTER_KEY` - Your Back4App Master Key
- `BINANCE_API_KEY` - Your Binance API Key
- `BINANCE_SECRET_KEY` - Your Binance Secret Key

### 3. Deploy
```bash
# Option 1: Using the deployment script (recommended)
npm run deploy

# Option 2: Manual deployment
docker-compose up -d
```

## 🏗️ Architecture

The Docker setup includes:

- **Frontend**: React + TypeScript application (Port 3000)
- **Backend**: Node.js API server (Port 8080)
- **Database**: MongoDB (Port 27017)
- **Cache**: Redis (Port 6379)
- **Proxy**: Nginx reverse proxy (Port 80/443)
- **Monitoring**: Prometheus + Grafana (Ports 9090/3001)

## 📊 Services

| Service | Port | Description |
|---------|------|-------------|
| Frontend | 3000 | React application |
| Backend | 8080 | API server |
| MongoDB | 27017 | Database |
| Redis | 6379 | Cache |
| Nginx | 80/443 | Reverse proxy |
| Prometheus | 9090 | Metrics collection |
| Grafana | 3001 | Monitoring dashboard |

## 🔧 Management Commands

### Start Services
```bash
npm run docker:up
# or
docker-compose up -d
```

### Stop Services
```bash
npm run docker:down
# or
docker-compose down
```

### View Logs
```bash
npm run docker:logs
# or
docker-compose logs -f

# View specific service logs
docker-compose logs -f frontend
docker-compose logs -f backend
```

### Restart Services
```bash
npm run docker:restart
# or
docker-compose restart
```

### Health Check
```bash
npm run health
```

### Clean Everything
```bash
npm run docker:clean
# or
docker-compose down -v --rmi all
```

## 🔍 Monitoring

### Grafana Dashboard
- URL: http://localhost:3001
- Default username: `admin`
- Default password: `cryptopulse_grafana_2024`

### Prometheus Metrics
- URL: http://localhost:9090

### Service Health
- Frontend: http://localhost:3000/health
- Backend: http://localhost:8080/health

## 🛠️ Development

### Local Development
```bash
# Start only the database services
docker-compose up -d mongodb redis

# Run frontend in development mode
cd frontend && npm run dev

# Run backend in development mode
cd backend && npm start
```

### Building Images
```bash
# Build all images
npm run docker:build

# Build specific service
docker-compose build frontend
docker-compose build backend
```

## 🔒 Security

### Production Security Checklist
- [ ] Change all default passwords
- [ ] Use strong JWT secrets
- [ ] Enable HTTPS (uncomment SSL config in nginx.conf)
- [ ] Configure firewall rules
- [ ] Regular security updates
- [ ] Monitor logs for suspicious activity

### Environment Security
```bash
# Generate strong secrets
openssl rand -hex 32  # For JWT_SECRET
openssl rand -hex 32  # For ENCRYPTION_KEY
openssl rand -hex 32  # For SESSION_SECRET
```

## 📈 Scaling

### Horizontal Scaling
```bash
# Scale specific services
docker-compose up -d --scale frontend=3
docker-compose up -d --scale backend=2
```

### Load Balancing
The Nginx configuration includes load balancing for multiple instances.

## 🐛 Troubleshooting

### Common Issues

1. **Port Already in Use**
   ```bash
   # Check what's using the port
   netstat -tulpn | grep :3000
   
   # Kill the process
   sudo kill -9 <PID>
   ```

2. **Permission Denied**
   ```bash
   # Make deploy script executable
   chmod +x deploy.sh
   ```

3. **Out of Memory**
   ```bash
   # Check Docker memory usage
   docker stats
   
   # Increase Docker memory limit
   ```

4. **Database Connection Issues**
   ```bash
   # Check MongoDB logs
   docker-compose logs mongodb
   
   # Restart database
   docker-compose restart mongodb
   ```

### Logs Analysis
```bash
# View all logs
docker-compose logs

# View specific service logs
docker-compose logs frontend
docker-compose logs backend
docker-compose logs mongodb
docker-compose logs redis
docker-compose logs nginx
```

## 🔄 Updates

### Updating the Application
```bash
# Pull latest changes
git pull origin main

# Rebuild and restart
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Database Migrations
```bash
# Access MongoDB
docker-compose exec mongodb mongosh

# Run migrations if needed
# (Add your migration scripts here)
```

## 📞 Support

For issues and support:
1. Check the logs: `docker-compose logs -f`
2. Verify environment variables
3. Check service health endpoints
4. Review this documentation

## 🎯 Production Deployment

### Cloud Deployment
1. **AWS ECS**: Use the provided Dockerfile
2. **Google Cloud Run**: Deploy using Cloud Run
3. **Azure Container Instances**: Deploy using ACI
4. **DigitalOcean App Platform**: Deploy using App Platform

### VPS Deployment
1. Install Docker and Docker Compose
2. Clone the repository
3. Configure environment variables
4. Run the deployment script

---

**🎉 Your CryptoPulse Trading Bot is now ready for production deployment!**
