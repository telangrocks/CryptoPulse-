# Back4App Deployment Instructions

## Files Included
- rontend-dist/ - Built frontend application
- ackend/ - Backend API and services
- cloud/ - Back4App cloud functions
- server.js - Main server file
- ack4app.json - Back4App configuration
- Dockerfile - Production Docker configuration
- package.json - Node.js dependencies

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
The application includes a health check endpoint at /health

## Support
For issues, check the logs in Back4App dashboard or contact support.
