# Simplified Dockerfile for Back4App deployment
FROM node:18-alpine

# Install system dependencies
RUN apk add --no-cache curl

# Set working directory
WORKDIR /app

# Copy frontend package files
COPY frontend/package*.json ./frontend/

# Install frontend dependencies
WORKDIR /app/frontend
RUN npm install

# Copy frontend source code
COPY frontend/ ./

# Build frontend for production
RUN npm run build

# Go back to app root
WORKDIR /app

# Copy backend files
COPY backend/ ./backend/

# Copy cloud functions
COPY cloud/ ./cloud/

# Copy configuration files
COPY back4app.json ./
COPY package.json ./

# Expose port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Start the application (serve frontend)
CMD ["sh", "-c", "cd frontend && npm run preview"]
