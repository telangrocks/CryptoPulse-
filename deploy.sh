#!/bin/bash

# CryptoPulse Trading Bot - Production Deployment Script
# This script handles the complete deployment process

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="cryptopulse"
DOCKER_COMPOSE_FILE="docker-compose.yml"
ENV_FILE=".env"
SSL_SETUP_SCRIPT="./scripts/ssl-setup.sh"
SSL_CHECK_SCRIPT="./scripts/ssl-check.sh"
SSL_RENEW_SCRIPT="./scripts/ssl-renew.sh"

echo -e "${BLUE}🚀 CryptoPulse Trading Bot - Production Deployment${NC}"
echo "=================================================="

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed. Please install Docker first.${NC}"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is not installed. Please install Docker Compose first.${NC}"
    exit 1
fi

# Check if .env file exists
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${YELLOW}⚠️  .env file not found. Creating from template...${NC}"
    cp env.production.example .env
    echo -e "${YELLOW}📝 Please edit .env file with your actual configuration values.${NC}"
    echo -e "${YELLOW}   Then run this script again.${NC}"
    exit 1
fi

# Validate environment file
echo -e "${BLUE}🔍 Validating environment configuration...${NC}"
if grep -q "your-" .env; then
    echo -e "${RED}❌ Please update .env file with your actual configuration values.${NC}"
    echo -e "${RED}   Found placeholder values that need to be replaced.${NC}"
    exit 1
fi

# Check SSL configuration
echo -e "${BLUE}🔒 Checking SSL configuration...${NC}"
if [ -f "$SSL_SETUP_SCRIPT" ]; then
    chmod +x "$SSL_SETUP_SCRIPT"
    echo -e "${GREEN}✅ SSL setup script found${NC}"
else
    echo -e "${YELLOW}⚠️  SSL setup script not found. SSL will not be configured.${NC}"
fi

# Check if domain is configured
if grep -q "DOMAIN_NAME=" .env && ! grep -q "DOMAIN_NAME=your-domain.com" .env; then
    DOMAIN_NAME=$(grep "DOMAIN_NAME=" .env | cut -d'=' -f2)
    echo -e "${GREEN}✅ Domain configured: $DOMAIN_NAME${NC}"
    
    # Check if SSL certificates exist
    if [ -f "./ssl/cert.pem" ] && [ -f "./ssl/key.pem" ]; then
        echo -e "${GREEN}✅ SSL certificates found${NC}"
    else
        echo -e "${YELLOW}⚠️  SSL certificates not found. Will generate during deployment.${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Domain not configured. Using localhost with self-signed certificates.${NC}"
fi

# Setup SSL certificates
echo -e "${BLUE}🔒 Setting up SSL certificates...${NC}"
if [ -f "$SSL_SETUP_SCRIPT" ]; then
    # Make scripts executable
    chmod +x "$SSL_SETUP_SCRIPT" "$SSL_CHECK_SCRIPT" "$SSL_RENEW_SCRIPT" 2>/dev/null || true
    
    # Run SSL setup
    if [ -f .env ]; then
        source .env
        export DOMAIN_NAME SSL_EMAIL
    fi
    
    if [ "$DOMAIN_NAME" != "your-domain.com" ] && [ -n "$DOMAIN_NAME" ]; then
        echo -e "${BLUE}🔐 Generating SSL certificates for $DOMAIN_NAME...${NC}"
        if [ "$DOMAIN_NAME" != "localhost" ]; then
            # For production domains, use Let's Encrypt
            sudo "$SSL_SETUP_SCRIPT" || {
                echo -e "${YELLOW}⚠️  SSL setup failed. Continuing with HTTP only.${NC}"
            }
        else
            # For localhost, generate self-signed certificates
            "$SSL_SETUP_SCRIPT" || {
                echo -e "${YELLOW}⚠️  SSL setup failed. Continuing with HTTP only.${NC}"
            }
        fi
    else
        echo -e "${YELLOW}⚠️  No domain configured. Skipping SSL setup.${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  SSL setup script not found. Skipping SSL configuration.${NC}"
fi

# Build and start services
echo -e "${BLUE}🏗️  Building Docker images...${NC}"
docker-compose -f $DOCKER_COMPOSE_FILE build --no-cache

echo -e "${BLUE}🚀 Starting services...${NC}"
docker-compose -f $DOCKER_COMPOSE_FILE up -d

# Wait for services to be ready
echo -e "${BLUE}⏳ Waiting for services to be ready...${NC}"
sleep 30

# Check service health
echo -e "${BLUE}🏥 Checking service health...${NC}"

# Check frontend
if curl -f http://localhost:3000/health &> /dev/null; then
    echo -e "${GREEN}✅ Frontend is healthy${NC}"
else
    echo -e "${RED}❌ Frontend health check failed${NC}"
fi

# Check backend
if curl -f http://localhost:8080/health &> /dev/null; then
    echo -e "${GREEN}✅ Backend is healthy${NC}"
else
    echo -e "${RED}❌ Backend health check failed${NC}"
fi

# Check Redis
if docker-compose -f $DOCKER_COMPOSE_FILE exec -T redis redis-cli ping | grep -q PONG; then
    echo -e "${GREEN}✅ Redis is healthy${NC}"
else
    echo -e "${RED}❌ Redis health check failed${NC}"
fi

# Check MongoDB
if docker-compose -f $DOCKER_COMPOSE_FILE exec -T mongodb mongosh --eval "db.runCommand('ping')" &> /dev/null; then
    echo -e "${GREEN}✅ MongoDB is healthy${NC}"
else
    echo -e "${RED}❌ MongoDB health check failed${NC}"
fi

# Check SSL health if certificates exist
if [ -f "./ssl/cert.pem" ] && [ -f "./ssl/key.pem" ]; then
    echo -e "${BLUE}🔒 Checking SSL health...${NC}"
    
    # Test HTTPS connection
    if curl -k -f "https://localhost/ssl-health" &> /dev/null; then
        echo -e "${GREEN}✅ SSL connection is healthy${NC}"
    else
        echo -e "${YELLOW}⚠️  SSL connection test failed (this may be normal for self-signed certificates)${NC}"
    fi
    
    # Run comprehensive SSL health check
    if [ -f "$SSL_CHECK_SCRIPT" ]; then
        echo -e "${BLUE}🔍 Running comprehensive SSL health check...${NC}"
        "$SSL_CHECK_SCRIPT" || echo -e "${YELLOW}⚠️  SSL health check completed with warnings${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  SSL certificates not found. Skipping SSL health checks.${NC}"
fi

# Display service URLs
echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
echo "=================================================="

# Determine protocol based on SSL configuration
if [ -f "./ssl/cert.pem" ] && [ -f "./ssl/key.pem" ]; then
    PROTOCOL="https"
    echo -e "${BLUE}🔒 SSL is enabled - using HTTPS${NC}"
else
    PROTOCOL="http"
    echo -e "${BLUE}🔓 SSL is disabled - using HTTP${NC}"
fi

# Get domain name from environment
if [ -f .env ]; then
    source .env
fi
DOMAIN=${DOMAIN_NAME:-localhost}

echo -e "${BLUE}📱 Frontend:${NC} $PROTOCOL://$DOMAIN"
echo -e "${BLUE}🔧 Backend API:${NC} $PROTOCOL://$DOMAIN/api"
echo -e "${BLUE}📊 Grafana:${NC} http://localhost:3001"
echo -e "${BLUE}📈 Prometheus:${NC} http://localhost:9090"
echo -e "${BLUE}🗄️  MongoDB:${NC} mongodb://localhost:27017"
echo -e "${BLUE}🔴 Redis:${NC} redis://localhost:6379"
echo "=================================================="

# SSL-specific information
if [ -f "./ssl/cert.pem" ] && [ -f "./ssl/key.pem" ]; then
    echo -e "${BLUE}🔒 SSL Certificate Information:${NC}"
    if command -v openssl &> /dev/null; then
        EXPIRY_DATE=$(openssl x509 -in "./ssl/cert.pem" -noout -enddate | cut -d= -f2)
        echo -e "${BLUE}   Expires:${NC} $EXPIRY_DATE"
        
        # Check if it's a Let's Encrypt certificate
        if openssl x509 -in "./ssl/cert.pem" -noout -issuer | grep -q "Let's Encrypt"; then
            echo -e "${BLUE}   Type:${NC} Let's Encrypt (Production)"
            echo -e "${BLUE}   Auto-renewal:${NC} Configured via cron job"
        else
            echo -e "${BLUE}   Type:${NC} Self-signed (Development)"
            echo -e "${YELLOW}   Note:${NC} Self-signed certificates will show security warnings in browsers"
        fi
    fi
    echo "=================================================="
fi

# Show running containers
echo -e "${BLUE}📋 Running containers:${NC}"
docker-compose -f $DOCKER_COMPOSE_FILE ps

echo -e "${GREEN}✅ CryptoPulse Trading Bot is now running!${NC}"
echo -e "${YELLOW}💡 Use 'docker-compose logs -f' to view logs${NC}"
echo -e "${YELLOW}💡 Use 'docker-compose down' to stop services${NC}"

# SSL management information
if [ -f "./ssl/cert.pem" ] && [ -f "./ssl/key.pem" ]; then
    echo -e "${BLUE}🔒 SSL Management Commands:${NC}"
    echo -e "${YELLOW}   Check SSL health:${NC} ./scripts/ssl-check.sh"
    echo -e "${YELLOW}   Renew certificates:${NC} ./scripts/ssl-renew.sh"
    echo -e "${YELLOW}   Setup SSL:${NC} ./scripts/ssl-setup.sh"
    echo ""
    
    # Check if it's a Let's Encrypt certificate and suggest cron job
    if openssl x509 -in "./ssl/cert.pem" -noout -issuer | grep -q "Let's Encrypt"; then
        echo -e "${BLUE}📅 Certificate Renewal:${NC}"
        echo -e "${YELLOW}   Add to crontab for automatic renewal:${NC}"
        echo -e "${YELLOW}   0 2 * * * cd $(pwd) && ./scripts/ssl-renew.sh >> ssl-renewal.log 2>&1${NC}"
        echo ""
    fi
fi
