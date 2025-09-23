# Multi-stage Dockerfile for CryptoPulse Trading Bot
# Production-ready containerization

# Stage 1: Build Frontend
FROM node:18-alpine AS frontend-builder

# Set working directory
WORKDIR /app/frontend

# Copy frontend package files
COPY frontend/package*.json ./

# Install frontend dependencies
RUN npm ci --only=production --silent

# Copy frontend source code
COPY frontend/ ./

# Build frontend for production
RUN npm run build

# Stage 2: Build Backend
FROM node:18-alpine AS backend-builder

# Set working directory
WORKDIR /app/backend

# Copy backend package files
COPY backend/package*.json ./

# Install backend dependencies
RUN npm ci --only=production --silent

# Copy backend source code
COPY backend/ ./

# Stage 3: Production Image
FROM node:18-alpine AS production

# Install system dependencies
RUN apk add --no-cache \
    dumb-init \
    curl \
    && rm -rf /var/cache/apk/*

# Create app user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S cryptopulse -u 1001

# Set working directory
WORKDIR /app

# Copy built frontend from builder stage
COPY --from=frontend-builder --chown=cryptopulse:nodejs /app/frontend/dist ./frontend/dist

# Copy backend from builder stage
COPY --from=backend-builder --chown=cryptopulse:nodejs /app/backend ./backend

# Copy cloud functions
COPY --chown=cryptopulse:nodejs cloud/ ./cloud

# Copy configuration files
COPY --chown=cryptopulse:nodejs back4app.json ./
COPY --chown=cryptopulse:nodejs package.json ./

# Copy environment files
COPY --chown=cryptopulse:nodejs frontend/env.example ./frontend/.env
COPY --chown=cryptopulse:nodejs backend/env.example ./backend/.env

# Install production dependencies
RUN npm ci --only=production --silent && \
    npm cache clean --force

# Create necessary directories
RUN mkdir -p /app/logs /app/tmp && \
    chown -R cryptopulse:nodejs /app

# Switch to non-root user
USER cryptopulse

# Expose ports
EXPOSE 3000 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV BACKEND_PORT=8080

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["sh", "-c", "cd frontend && npm run preview & cd ../backend && node cloud-functions.js & wait"]
