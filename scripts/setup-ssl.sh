#!/bin/bash

# CryptoPulse SSL Quick Setup Script
# This script provides a simple interface for SSL setup

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔒 CryptoPulse SSL Quick Setup${NC}"
echo "=================================="

# Check if running on Windows
if [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]] || [[ "$OSTYPE" == "win32" ]]; then
    echo -e "${YELLOW}⚠️  Windows detected. Using PowerShell script.${NC}"
    echo -e "${BLUE}📋 To set up SSL on Windows:${NC}"
    echo -e "${YELLOW}   1. Install OpenSSL for Windows${NC}"
    echo -e "${YELLOW}   2. Run: powershell -ExecutionPolicy Bypass -File scripts/ssl-setup.ps1${NC}"
    echo -e "${YELLOW}   3. Or run: docker-compose up -d (will use HTTP only)${NC}"
    exit 0
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  .env file not found. Creating from template...${NC}"
    cp env.production.example .env
    echo -e "${YELLOW}📝 Please edit .env file with your configuration values.${NC}"
    echo -e "${YELLOW}   Then run this script again.${NC}"
    exit 1
fi

# Source environment variables
source .env

# Check if domain is configured
if [ -z "$DOMAIN_NAME" ] || [ "$DOMAIN_NAME" = "your-domain.com" ]; then
    echo -e "${YELLOW}⚠️  Domain not configured. Using localhost with self-signed certificates.${NC}"
    DOMAIN_NAME="localhost"
fi

echo -e "${BLUE}🌐 Domain: $DOMAIN_NAME${NC}"

# Check if SSL certificates already exist
if [ -f "ssl/cert.pem" ] && [ -f "ssl/key.pem" ]; then
    echo -e "${GREEN}✅ SSL certificates already exist${NC}"
    echo -e "${BLUE}📋 Available options:${NC}"
    echo -e "${YELLOW}   1. Check SSL health: ./scripts/ssl-check.sh${NC}"
    echo -e "${YELLOW}   2. Renew certificates: ./scripts/ssl-renew.sh${NC}"
    echo -e "${YELLOW}   3. Deploy application: ./deploy.sh${NC}"
    exit 0
fi

# Determine SSL setup method
if [ "$DOMAIN_NAME" = "localhost" ]; then
    echo -e "${BLUE}🔐 Setting up self-signed certificates for development...${NC}"
    ./scripts/ssl-setup.sh
else
    echo -e "${BLUE}🔐 Setting up Let's Encrypt certificates for production...${NC}"
    echo -e "${YELLOW}⚠️  This requires root access and domain validation${NC}"
    echo -e "${YELLOW}   Make sure your domain points to this server${NC}"
    echo -e "${YELLOW}   Ports 80 and 443 must be accessible${NC}"
    echo ""
    read -p "Continue with Let's Encrypt setup? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        sudo ./scripts/ssl-setup.sh
    else
        echo -e "${YELLOW}⚠️  Skipping SSL setup. You can run it later with: sudo ./scripts/ssl-setup.sh${NC}"
        exit 0
    fi
fi

# Check if setup was successful
if [ -f "ssl/cert.pem" ] && [ -f "ssl/key.pem" ]; then
    echo -e "${GREEN}🎉 SSL setup completed successfully!${NC}"
    echo "=================================="
    echo -e "${BLUE}📋 Next steps:${NC}"
    echo -e "${YELLOW}   1. Deploy application: ./deploy.sh${NC}"
    echo -e "${YELLOW}   2. Test SSL: https://$DOMAIN_NAME${NC}"
    echo -e "${YELLOW}   3. Check SSL health: ./scripts/ssl-check.sh${NC}"
    
    if [ "$DOMAIN_NAME" != "localhost" ]; then
        echo -e "${YELLOW}   4. Set up auto-renewal: crontab -e${NC}"
        echo -e "${YELLOW}      Add: 0 2 * * * cd $(pwd) && ./scripts/ssl-renew.sh >> ssl-renewal.log 2>&1${NC}"
    fi
else
    echo -e "${RED}❌ SSL setup failed${NC}"
    echo -e "${YELLOW}💡 You can still deploy with HTTP only using: ./deploy.sh${NC}"
    exit 1
fi
