# Simplified Dockerfile for Back4App deployment
FROM node:18-alpine

# Install system dependencies
RUN apk add --no-cache curl python3

# Set working directory
WORKDIR /app

# Copy frontend package files
COPY frontend/package*.json ./frontend/

# Install frontend dependencies (ignore warnings)
WORKDIR /app/frontend
RUN npm install --silent

# Copy frontend source code
COPY frontend/ ./

# Build frontend for production (ignore warnings)
RUN npm run build:production

# Go back to app root
WORKDIR /app

# Copy root package.json first
COPY package.json ./

# Copy backend files
COPY backend/ ./backend/

# Copy cloud functions
COPY cloud/ ./cloud/

# Install root dependencies (ignore warnings)
RUN npm install --silent

# Copy configuration files
COPY back4app.json ./
COPY server.js ./

# Expose port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Start the application
CMD ["node", "server.js"]
