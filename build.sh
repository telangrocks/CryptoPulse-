#!/bin/bash

echo "🚀 Building CryptoPulse Frontend for Back4App..."

# Navigate to frontend directory
cd frontend

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build the application
echo "🔨 Building application..."
npm run build

# Verify build output
echo "✅ Build completed. Checking output..."
ls -la dist/

echo "🎉 Frontend build successful!"
