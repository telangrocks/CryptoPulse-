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

# Display service URLs
echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
echo "=================================================="
echo -e "${BLUE}📱 Frontend:${NC} http://localhost:3000"
echo -e "${BLUE}🔧 Backend API:${NC} http://localhost:8080"
echo -e "${BLUE}📊 Grafana:${NC} http://localhost:3001"
echo -e "${BLUE}📈 Prometheus:${NC} http://localhost:9090"
echo -e "${BLUE}🗄️  MongoDB:${NC} mongodb://localhost:27017"
echo -e "${BLUE}🔴 Redis:${NC} redis://localhost:6379"
echo "=================================================="

# Show running containers
echo -e "${BLUE}📋 Running containers:${NC}"
docker-compose -f $DOCKER_COMPOSE_FILE ps

echo -e "${GREEN}✅ CryptoPulse Trading Bot is now running!${NC}"
echo -e "${YELLOW}💡 Use 'docker-compose logs -f' to view logs${NC}"
echo -e "${YELLOW}💡 Use 'docker-compose down' to stop services${NC}"
