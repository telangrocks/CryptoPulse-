#!/bin/bash

# =============================================================================
# CryptoPulse Northflank Deployment Script
# =============================================================================
# Automated deployment script for CryptoPulse to Northflank cloud platform

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="cryptopulse"
FRONTEND_SERVICE="cryptopulse-frontend"
BACKEND_SERVICE="cryptopulse-backend"
CLOUD_FUNCTIONS_SERVICE="cryptopulse-cloud-functions"

# Default values
DEPLOY_TARGET="all"
ENVIRONMENT="production"
DRY_RUN=false
VERBOSE=false

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [OPTIONS] [TARGET]"
    echo ""
    echo "TARGETS:"
    echo "  frontend          Deploy only frontend service"
    echo "  backend           Deploy only backend service"
    echo "  cloud-functions   Deploy only cloud functions"
    echo "  all               Deploy all services (default)"
    echo ""
    echo "OPTIONS:"
    echo "  -e, --environment ENV    Set environment (production, staging, development)"
    echo "  -d, --dry-run           Show what would be deployed without actually deploying"
    echo "  -v, --verbose           Enable verbose output"
    echo "  -h, --help              Show this help message"
    echo ""
    echo "EXAMPLES:"
    echo "  $0                      # Deploy all services to production"
    echo "  $0 frontend             # Deploy only frontend"
    echo "  $0 -e staging all       # Deploy all services to staging"
    echo "  $0 -d backend           # Dry run backend deployment"
}

# Function to check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check if Northflank CLI is installed
    if ! command -v northflank &> /dev/null; then
        print_error "Northflank CLI is not installed. Please install it first:"
        print_error "  npm install -g @northflank/cli"
        exit 1
    fi
    
    # Check if logged in to Northflank
    if ! northflank auth status &> /dev/null; then
        print_error "Not logged in to Northflank. Please login first:"
        print_error "  northflank auth login"
        exit 1
    fi
    
    # Check if project exists
    if ! northflank project list | grep -q "$PROJECT_NAME"; then
        print_warning "Project '$PROJECT_NAME' not found. Creating project..."
        northflank project create "$PROJECT_NAME" --description "CryptoPulse Trading Platform"
    fi
    
    print_success "Prerequisites check passed"
}

# Function to build frontend
build_frontend() {
    print_status "Building frontend..."
    
    cd frontend
    
    # Install dependencies
    print_status "Installing frontend dependencies..."
    npm ci
    
    # Run tests
    print_status "Running frontend tests..."
    npm run test:run
    
    # Build for production
    print_status "Building frontend for production..."
    npm run build:production
    
    cd ..
    
    print_success "Frontend build completed"
}

# Function to build backend
build_backend() {
    print_status "Building backend..."
    
    cd backend
    
    # Install dependencies
    print_status "Installing backend dependencies..."
    npm ci
    
    # Run tests
    print_status "Running backend tests..."
    npm run test:ci
    
    # Build (if needed)
    print_status "Backend build completed"
    
    cd ..
    
    print_success "Backend build completed"
}

# Function to build cloud functions
build_cloud_functions() {
    print_status "Building cloud functions..."
    
    cd cloud
    
    # Install dependencies
    print_status "Installing cloud functions dependencies..."
    npm init -y
    npm install express cors helmet express-rate-limit axios crypto moment
    
    cd ..
    
    print_success "Cloud functions build completed"
}

# Function to deploy frontend
deploy_frontend() {
    print_status "Deploying frontend to Northflank..."
    
    if [ "$DRY_RUN" = true ]; then
        print_warning "DRY RUN: Would deploy frontend service"
        return
    fi
    
    # Create or update frontend service
    northflank service create-or-update \
        --project "$PROJECT_NAME" \
        --name "$FRONTEND_SERVICE" \
        --type "static" \
        --source "frontend/dist" \
        --environment "$ENVIRONMENT" \
        --domain "app.cryptopulse.com" \
        --https true
    
    print_success "Frontend deployed successfully"
}

# Function to deploy backend
deploy_backend() {
    print_status "Deploying backend to Northflank..."
    
    if [ "$DRY_RUN" = true ]; then
        print_warning "DRY RUN: Would deploy backend service"
        return
    fi
    
    # Create or update backend service
    northflank service create-or-update \
        --project "$PROJECT_NAME" \
        --name "$BACKEND_SERVICE" \
        --type "container" \
        --source "backend" \
        --environment "$ENVIRONMENT" \
        --port 1337 \
        --domain "api.cryptopulse.com" \
        --https true \
        --env-file "backend/.env.production"
    
    print_success "Backend deployed successfully"
}

# Function to deploy cloud functions
deploy_cloud_functions() {
    print_status "Deploying cloud functions to Northflank..."
    
    if [ "$DRY_RUN" = true ]; then
        print_warning "DRY RUN: Would deploy cloud functions service"
        return
    fi
    
    # Create or update cloud functions service
    northflank service create-or-update \
        --project "$PROJECT_NAME" \
        --name "$CLOUD_FUNCTIONS_SERVICE" \
        --type "serverless" \
        --source "cloud" \
        --environment "$ENVIRONMENT" \
        --runtime "nodejs18" \
        --timeout 30 \
        --memory 512
    
    print_success "Cloud functions deployed successfully"
}

# Function to run health checks
run_health_checks() {
    print_status "Running health checks..."
    
    # Wait for services to be ready
    sleep 30
    
    # Check frontend
    if curl -f -s "https://app.cryptopulse.com" > /dev/null; then
        print_success "Frontend health check passed"
    else
        print_error "Frontend health check failed"
        return 1
    fi
    
    # Check backend
    if curl -f -s "https://api.cryptopulse.com/health" > /dev/null; then
        print_success "Backend health check passed"
    else
        print_error "Backend health check failed"
        return 1
    fi
    
    print_success "All health checks passed"
}

# Function to cleanup
cleanup() {
    print_status "Cleaning up..."
    
    # Remove build artifacts
    rm -rf frontend/dist
    rm -rf backend/build
    
    print_success "Cleanup completed"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -d|--dry-run)
            DRY_RUN=true
            shift
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        frontend|backend|cloud-functions|all)
            DEPLOY_TARGET="$1"
            shift
            ;;
        *)
            print_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Main deployment function
main() {
    print_status "Starting CryptoPulse deployment to Northflank..."
    print_status "Target: $DEPLOY_TARGET"
    print_status "Environment: $ENVIRONMENT"
    print_status "Dry run: $DRY_RUN"
    
    # Check prerequisites
    check_prerequisites
    
    # Build services based on target
    case $DEPLOY_TARGET in
        frontend)
            build_frontend
            deploy_frontend
            ;;
        backend)
            build_backend
            deploy_backend
            ;;
        cloud-functions)
            build_cloud_functions
            deploy_cloud_functions
            ;;
        all)
            build_frontend
            build_backend
            build_cloud_functions
            deploy_frontend
            deploy_backend
            deploy_cloud_functions
            ;;
    esac
    
    # Run health checks (only if not dry run)
    if [ "$DRY_RUN" = false ]; then
        run_health_checks
    fi
    
    # Cleanup
    cleanup
    
    print_success "Deployment completed successfully!"
    
    if [ "$DRY_RUN" = false ]; then
        print_status "Services available at:"
        print_status "  Frontend: https://app.cryptopulse.com"
        print_status "  Backend API: https://api.cryptopulse.com"
        print_status "  Health Check: https://api.cryptopulse.com/health"
    fi
}

# Run main function
main "$@"

