#!/bin/bash

# CryptoPulse Production Deployment Script
# This script handles the complete deployment process

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-production}
APP_ID=${2:-$BACK4APP_APP_ID}
MASTER_KEY=${3:-$BACK4APP_MASTER_KEY}

echo -e "${BLUE}🚀 CryptoPulse Deployment Script${NC}"
echo -e "${BLUE}================================${NC}"
echo "Environment: $ENVIRONMENT"
echo "App ID: $APP_ID"
echo ""

# Function to print status
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Function to check prerequisites
check_prerequisites() {
    echo -e "${BLUE}🔍 Checking prerequisites...${NC}"
    
    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed"
        exit 1
    fi
    print_status "Node.js is installed"
    
    # Check if npm is installed
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed"
        exit 1
    fi
    print_status "npm is installed"
    
    # Check if Back4App CLI is installed
    if ! command -v back4app &> /dev/null; then
        print_warning "Back4App CLI not found, installing..."
        npm install -g @back4app/cli
    fi
    print_status "Back4App CLI is available"
    
    # Check if required environment variables are set
    if [ -z "$APP_ID" ] || [ -z "$MASTER_KEY" ]; then
        print_error "Back4App credentials not provided"
        echo "Usage: $0 <environment> <app_id> <master_key>"
        echo "Or set BACK4APP_APP_ID and BACK4APP_MASTER_KEY environment variables"
        exit 1
    fi
    print_status "Back4App credentials provided"
}

# Function to validate secrets
validate_secrets() {
    echo -e "${BLUE}🔐 Validating secrets...${NC}"
    
    if [ -f "scripts/validate-secrets.js" ]; then
        node scripts/validate-secrets.js $ENVIRONMENT
        if [ $? -eq 0 ]; then
            print_status "Secrets validation passed"
        else
            print_error "Secrets validation failed"
            exit 1
        fi
    else
        print_warning "Secrets validation script not found, skipping..."
    fi
}

# Function to run tests
run_tests() {
    echo -e "${BLUE}🧪 Running tests...${NC}"
    
    # Run backend tests
    if [ -f "package.json" ]; then
        echo "Running backend tests..."
        npm test -- --passWithNoTests
        print_status "Backend tests completed"
    fi
    
    # Run frontend tests
    if [ -f "frontend/package.json" ]; then
        echo "Running frontend tests..."
        cd frontend
        npm test -- --run --passWithNoTests
        cd ..
        print_status "Frontend tests completed"
    fi
}

# Function to build frontend
build_frontend() {
    echo -e "${BLUE}🏗️  Building frontend...${NC}"
    
    if [ -d "frontend" ]; then
        cd frontend
        
        # Install dependencies
        echo "Installing frontend dependencies..."
        npm ci
        
        # Build for production
        echo "Building frontend for production..."
        npm run build
        
        if [ $? -eq 0 ]; then
            print_status "Frontend build completed successfully"
        else
            print_error "Frontend build failed"
            exit 1
        fi
        
        cd ..
    else
        print_warning "Frontend directory not found, skipping frontend build..."
    fi
}

# Function to deploy backend
deploy_backend() {
    echo -e "${BLUE}🚀 Deploying backend...${NC}"
    
    # Deploy cloud functions
    echo "Deploying cloud functions to Back4App..."
    back4app deploy cloud --app-id $APP_ID --master-key $MASTER_KEY --environment $ENVIRONMENT
    
    if [ $? -eq 0 ]; then
        print_status "Backend deployment completed successfully"
    else
        print_error "Backend deployment failed"
        exit 1
    fi
}

# Function to deploy frontend
deploy_frontend() {
    echo -e "${BLUE}🌐 Deploying frontend...${NC}"
    
    if [ -d "frontend/dist" ]; then
        # Deploy static files
        echo "Deploying frontend to Back4App static hosting..."
        back4app deploy static --app-id $APP_ID --master-key $MASTER_KEY --environment $ENVIRONMENT
        
        if [ $? -eq 0 ]; then
            print_status "Frontend deployment completed successfully"
        else
            print_error "Frontend deployment failed"
            exit 1
        fi
    else
        print_warning "Frontend build not found, skipping frontend deployment..."
    fi
}

# Function to run health checks
run_health_checks() {
    echo -e "${BLUE}🏥 Running health checks...${NC}"
    
    # Wait for deployment to complete
    echo "Waiting for deployment to complete..."
    sleep 30
    
    # Get the appropriate URL based on environment
    if [ "$ENVIRONMENT" = "production" ]; then
        URL=${PRODUCTION_URL:-"https://your-production-domain.com"}
    else
        URL=${STAGING_URL:-"https://your-staging-domain.com"}
    fi
    
    # Test health endpoints
    echo "Testing health endpoints..."
    
    # Basic health check
    if curl -f -s "$URL/parse/functions/healthCheck" > /dev/null; then
        print_status "Basic health check passed"
    else
        print_warning "Basic health check failed"
    fi
    
    # Production health check
    if curl -f -s "$URL/parse/functions/productionHealthCheck" > /dev/null; then
        print_status "Production health check passed"
    else
        print_warning "Production health check failed"
    fi
    
    # System status check
    if curl -f -s "$URL/parse/functions/getSystemStatus" > /dev/null; then
        print_status "System status check passed"
    else
        print_warning "System status check failed"
    fi
}

# Function to send notifications
send_notifications() {
    echo -e "${BLUE}📢 Sending notifications...${NC}"
    
    # Send Slack notification if webhook is configured
    if [ ! -z "$SLACK_WEBHOOK" ]; then
        MESSAGE="🚀 CryptoPulse deployment to $ENVIRONMENT completed successfully!"
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"$MESSAGE\"}" \
            $SLACK_WEBHOOK
        print_status "Slack notification sent"
    else
        print_warning "Slack webhook not configured, skipping notification"
    fi
}

# Main deployment function
main() {
    echo -e "${BLUE}Starting CryptoPulse deployment to $ENVIRONMENT...${NC}"
    echo ""
    
    # Step 1: Check prerequisites
    check_prerequisites
    echo ""
    
    # Step 2: Validate secrets
    validate_secrets
    echo ""
    
    # Step 3: Run tests
    run_tests
    echo ""
    
    # Step 4: Build frontend
    build_frontend
    echo ""
    
    # Step 5: Deploy backend
    deploy_backend
    echo ""
    
    # Step 6: Deploy frontend
    deploy_frontend
    echo ""
    
    # Step 7: Run health checks
    run_health_checks
    echo ""
    
    # Step 8: Send notifications
    send_notifications
    echo ""
    
    echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
    echo -e "${GREEN}Environment: $ENVIRONMENT${NC}"
    echo -e "${GREEN}App ID: $APP_ID${NC}"
    echo ""
    echo -e "${BLUE}Next steps:${NC}"
    echo "1. Monitor the application for any issues"
    echo "2. Check logs in Back4App dashboard"
    echo "3. Verify all features are working correctly"
    echo "4. Update monitoring dashboards"
}

# Run main function
main "$@"
