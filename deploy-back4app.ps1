# Back4App Deployment Script for CryptoPulse Trading Bot (Windows)
# This script ensures a successful deployment to Back4App

param(
    [switch]$Force
)

# Set error action preference
$ErrorActionPreference = "Stop"

Write-Host "Starting Back4App deployment for CryptoPulse Trading Bot..." -ForegroundColor Blue

# Function to print colored output
function Write-Status {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

# Check if we're in the right directory
if (-not (Test-Path "package.json") -or -not (Test-Path "back4app.json")) {
    Write-Error "Please run this script from the project root directory"
    exit 1
}

# Check if frontend directory exists
if (-not (Test-Path "frontend")) {
    Write-Error "Frontend directory not found"
    exit 1
}

Write-Status "Preparing frontend for deployment..."

# Navigate to frontend directory
Set-Location "frontend"

# Check if setup-env.cjs exists
if (-not (Test-Path "setup-env.cjs")) {
    Write-Error "setup-env.cjs not found in frontend directory"
    exit 1
}

# Create environment files
Write-Status "Creating environment files..."
node setup-env.cjs

# Verify environment files were created
if (-not (Test-Path ".env") -or -not (Test-Path ".env.production")) {
    Write-Error "Failed to create environment files"
    exit 1
}

Write-Success "Environment files created successfully"

# Install dependencies
Write-Status "Installing frontend dependencies..."
npm install --silent

# Build for production
Write-Status "Building frontend for production..."
npm run build:production

# Verify build output
if (-not (Test-Path "dist") -or -not (Test-Path "dist/index.html")) {
    Write-Error "Frontend build failed - dist directory or index.html not found"
    exit 1
}

Write-Success "Frontend built successfully"

# Go back to root directory
Set-Location ".."

# Check if all required files exist
Write-Status "Verifying deployment files..."

$requiredFiles = @(
    "back4app.json",
    "server.js",
    "cloud/main.js",
    "frontend/dist/index.html",
    "Dockerfile.back4app"
)

foreach ($file in $requiredFiles) {
    if (-not (Test-Path $file)) {
        Write-Error "Required file not found: $file"
        exit 1
    }
}

Write-Success "All required files present"

# Create deployment package
Write-Status "Creating deployment package..."

# Create a temporary directory for deployment
$tempDir = "deploy-temp"
if (Test-Path $tempDir) {
    Remove-Item -Recurse -Force $tempDir
}
New-Item -ItemType Directory -Path $tempDir | Out-Null

# Copy necessary files
Copy-Item -Recurse "frontend/dist" "$tempDir/frontend-dist"
Copy-Item -Recurse "backend" "$tempDir/"
Copy-Item -Recurse "cloud" "$tempDir/"
Copy-Item "back4app.json" "$tempDir/"
Copy-Item "server.js" "$tempDir/"
Copy-Item "package.json" "$tempDir/"
Copy-Item "Dockerfile.back4app" "$tempDir/Dockerfile"

# Create a simple package.json for the deployment
$packageJson = @{
    name = "cryptopulse-back4app"
    version = "1.0.0"
    description = "CryptoPulse Trading Bot - Back4App Deployment"
    main = "server.js"
    scripts = @{
        start = "node server.js"
        dev = "node server.js"
    }
    dependencies = @{
        express = "^4.18.2"
        cors = "^2.8.5"
        helmet = "^7.1.0"
        compression = "^1.7.4"
        "express-rate-limit" = "^7.1.5"
        "http-proxy-middleware" = "^2.0.6"
        parse = "^3.5.1"
    }
    engines = @{
        node = ">=18.0.0"
    }
}

$packageJson | ConvertTo-Json -Depth 10 | Set-Content "$tempDir/package.json"

Write-Success "Deployment package created in $tempDir"

# Create deployment instructions
$instructions = @"
# Back4App Deployment Instructions

## Files Included
- `frontend-dist/` - Built frontend application
- `backend/` - Backend API and services
- `cloud/` - Back4App cloud functions
- `server.js` - Main server file
- `back4app.json` - Back4App configuration
- `Dockerfile` - Production Docker configuration
- `package.json` - Node.js dependencies

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
The application includes a health check endpoint at `/health`

## Support
For issues, check the logs in Back4App dashboard or contact support.
"@

$instructions | Set-Content "$tempDir/DEPLOYMENT_INSTRUCTIONS.md"

Write-Success "Deployment package ready!"
Write-Status "Files are in the '$tempDir' directory"
Write-Status "Upload these files to your Back4App repository"

# Display next steps
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "1. Upload all files from '$tempDir' to your Back4App repository" -ForegroundColor White
Write-Host "2. Set environment variables in Back4App dashboard:" -ForegroundColor White
Write-Host "   - BACK4APP_APP_ID" -ForegroundColor Gray
Write-Host "   - BACK4APP_JAVASCRIPT_KEY" -ForegroundColor Gray
Write-Host "   - BACK4APP_MASTER_KEY" -ForegroundColor Gray
Write-Host "   - BACK4APP_SERVER_URL" -ForegroundColor Gray
Write-Host "3. Deploy using Back4App deployment system" -ForegroundColor White
Write-Host "4. Monitor deployment logs for any issues" -ForegroundColor White

Write-Success "Deployment preparation completed successfully!"
