#!/bin/bash

# Back4App Deployment Script for CryptoPulse Trading Bot
# This script ensures a successful deployment to Back4App

set -e  # Exit on any error

echo "🚀 Starting Back4App deployment for CryptoPulse Trading Bot..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -f "back4app.json" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

# Check if frontend directory exists
if [ ! -d "frontend" ]; then
    print_error "Frontend directory not found"
    exit 1
fi

print_status "Preparing frontend for deployment..."

# Navigate to frontend directory
cd frontend

# Check if setup-env.cjs exists
if [ ! -f "setup-env.cjs" ]; then
    print_error "setup-env.cjs not found in frontend directory"
    exit 1
fi

# Create environment files
print_status "Creating environment files..."
node setup-env.cjs

# Verify environment files were created
if [ ! -f ".env" ] || [ ! -f ".env.production" ]; then
    print_error "Failed to create environment files"
    exit 1
fi

print_success "Environment files created successfully"

# Install dependencies
print_status "Installing frontend dependencies..."
npm install --silent

# Build for production
print_status "Building frontend for production..."
npm run build:production

# Verify build output
if [ ! -d "dist" ] || [ ! -f "dist/index.html" ]; then
    print_error "Frontend build failed - dist directory or index.html not found"
    exit 1
fi

print_success "Frontend built successfully"

# Go back to root directory
cd ..

# Check if all required files exist
print_status "Verifying deployment files..."

required_files=(
    "back4app.json"
    "server.js"
    "cloud/main.js"
    "frontend/dist/index.html"
    "Dockerfile.back4app"
)

for file in "${required_files[@]}"; do
    if [ ! -f "$file" ]; then
        print_error "Required file not found: $file"
        exit 1
    fi
done

print_success "All required files present"

# Create deployment package
print_status "Creating deployment package..."

# Create a temporary directory for deployment
TEMP_DIR="deploy-temp"
rm -rf "$TEMP_DIR"
mkdir "$TEMP_DIR"

# Copy necessary files
cp -r frontend/dist "$TEMP_DIR/frontend-dist"
cp -r backend "$TEMP_DIR/"
cp -r cloud "$TEMP_DIR/"
cp back4app.json "$TEMP_DIR/"
cp server.js "$TEMP_DIR/"
cp package.json "$TEMP_DIR/"
cp Dockerfile.back4app "$TEMP_DIR/Dockerfile"
cp server-back4app.js "$TEMP_DIR/"

# Create a simple package.json for the deployment
cat > "$TEMP_DIR/package.json" << EOF
{
  "name": "cryptopulse-back4app",
  "version": "1.0.0",
  "description": "CryptoPulse Trading Bot - Back4App Deployment",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "node server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "compression": "^1.7.4",
    "express-rate-limit": "^7.1.5",
    "http-proxy-middleware": "^2.0.6",
    "parse": "^3.5.1"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
EOF

print_success "Deployment package created in $TEMP_DIR"

# Create deployment instructions
cat > "$TEMP_DIR/DEPLOYMENT_INSTRUCTIONS.md" << EOF
# Back4App Deployment Instructions

## Files Included
- \`frontend-dist/\` - Built frontend application
- \`backend/\` - Backend API and services
- \`cloud/\` - Back4App cloud functions
- \`server.js\` - Main server file
- \`back4app.json\` - Back4App configuration
- \`Dockerfile\` - Production Docker configuration
- \`package.json\` - Node.js dependencies

## Deployment Steps
1. Upload all files to your Back4App repository
2. Ensure environment variables are set in Back4App dashboard
3. Deploy using Back4App's deployment system

## Environment Variables Required
- BACK4APP_APP_ID
- BACK4APP_JAVASCRIPT_KEY  
- BACK4APP_MASTER_KEY
- BACK4APP_SERVER_URL

## Health Check
The application includes a health check endpoint at \`/health\`

## Support
For issues, check the logs in Back4App dashboard or contact support.
EOF

print_success "Deployment package ready!"
print_status "Files are in the '$TEMP_DIR' directory"
print_status "Upload these files to your Back4App repository"

# Display next steps
echo ""
echo "📋 Next Steps:"
echo "1. Upload all files from '$TEMP_DIR' to your Back4App repository"
echo "2. Set environment variables in Back4App dashboard:"
echo "   - BACK4APP_APP_ID"
echo "   - BACK4APP_JAVASCRIPT_KEY"
echo "   - BACK4APP_MASTER_KEY"
echo "   - BACK4APP_SERVER_URL"
echo "3. Deploy using Back4App's deployment system"
echo "4. Monitor deployment logs for any issues"

print_success "Deployment preparation completed successfully! 🎉"
