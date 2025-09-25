# Back4App Optimized Dockerfile for CryptoPulse Trading Bot
FROM node:18-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    python3 \
    make \
    g++ \
    git \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package.json for dependency installation
COPY package.json ./

# Install only essential production dependencies
RUN npm install --silent --production --no-optional

# Install frontend dependencies
WORKDIR /app/frontend
COPY frontend/package*.json ./

# Clean npm cache and remove lock files to fix Rollup binary issue
RUN npm cache clean --force && \
    rm -rf node_modules package-lock.json

# Install frontend dependencies with clean slate and force rebuild
RUN npm install --silent --no-optional --force

# Fix Rollup binary compatibility issue
RUN npm install @rollup/rollup-linux-x64-gnu --save-dev --force && \
    npm rebuild rollup --force

# Copy frontend source code
COPY frontend/ ./

# Create environment files
RUN node setup-env.cjs

# Build frontend for production
RUN npm run build:production

# Verify build output
RUN ls -la dist/

# Go back to app root
WORKDIR /app

# Copy backend files
COPY backend/ ./backend/

# Copy cloud functions
COPY cloud/ ./cloud/

# Copy configuration files
COPY back4app.json ./
COPY server-back4app.js ./server.js

# Create non-root user for security
RUN groupadd -g 1001 nodejs && \
    useradd -r -u 1001 -g nodejs nextjs

# Change ownership of the app directory
RUN chown -R nextjs:nodejs /app
USER nextjs

# Expose port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV BACK4APP_APP_ID=${BACK4APP_APP_ID}
ENV BACK4APP_JAVASCRIPT_KEY=${BACK4APP_JAVASCRIPT_KEY}
ENV BACK4APP_MASTER_KEY=${BACK4APP_MASTER_KEY}
ENV BACK4APP_SERVER_URL=${BACK4APP_SERVER_URL}

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start the application
CMD ["node", "server.js"]
