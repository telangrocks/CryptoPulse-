# Back4App Optimized Dockerfile for CryptoPulse Trading Bot
FROM node:18-alpine

# Install system dependencies
RUN apk add --no-cache \
    curl \
    python3 \
    make \
    g++ \
    git

# Set working directory
WORKDIR /app

# Copy package files for dependency installation
COPY package.json ./
COPY frontend/package*.json ./frontend/

# Install root dependencies (production only)
RUN npm install --silent --production --no-optional

# Install frontend dependencies
WORKDIR /app/frontend
RUN npm install --silent --no-optional

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
COPY server.js ./

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

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
