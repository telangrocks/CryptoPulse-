#!/bin/bash

# CryptoPulse SSL Setup Script
# This script handles SSL certificate generation and configuration

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DOMAIN_NAME=${DOMAIN_NAME:-"localhost"}
EMAIL=${SSL_EMAIL:-"admin@${DOMAIN_NAME}"}
NGINX_CONF="nginx.conf"
DOCKER_COMPOSE_FILE="docker-compose.yml"
SSL_DIR="./ssl"
LETSENCRYPT_DIR="./letsencrypt"

echo -e "${BLUE}🔒 CryptoPulse SSL Setup${NC}"
echo "=================================="

# Check if domain is provided
if [ "$DOMAIN_NAME" = "localhost" ]; then
    echo -e "${YELLOW}⚠️  Using localhost domain. SSL certificates will be self-signed.${NC}"
    echo -e "${YELLOW}   For production, set DOMAIN_NAME environment variable.${NC}"
fi

# Create necessary directories
echo -e "${BLUE}📁 Creating SSL directories...${NC}"
mkdir -p "$SSL_DIR"
mkdir -p "$LETSENCRYPT_DIR"

# Function to generate self-signed certificates
generate_self_signed() {
    echo -e "${BLUE}🔐 Generating self-signed SSL certificates...${NC}"
    
    # Generate private key
    openssl genrsa -out "$SSL_DIR/key.pem" 2048
    
    # Generate certificate signing request
    openssl req -new -key "$SSL_DIR/key.pem" -out "$SSL_DIR/cert.csr" -subj "/C=US/ST=State/L=City/O=Organization/CN=${DOMAIN_NAME}"
    
    # Generate self-signed certificate
    openssl x509 -req -days 365 -in "$SSL_DIR/cert.csr" -signkey "$SSL_DIR/key.pem" -out "$SSL_DIR/cert.pem"
    
    # Clean up CSR
    rm "$SSL_DIR/cert.csr"
    
    echo -e "${GREEN}✅ Self-signed certificates generated${NC}"
}

# Function to generate Let's Encrypt certificates
generate_letsencrypt() {
    echo -e "${BLUE}🔐 Generating Let's Encrypt SSL certificates...${NC}"
    
    # Check if certbot is available
    if ! command -v certbot &> /dev/null; then
        echo -e "${RED}❌ Certbot is not installed. Installing...${NC}"
        
        # Install certbot based on OS
        if command -v apt-get &> /dev/null; then
            sudo apt-get update
            sudo apt-get install -y certbot
        elif command -v yum &> /dev/null; then
            sudo yum install -y certbot
        elif command -v brew &> /dev/null; then
            brew install certbot
        else
            echo -e "${RED}❌ Cannot install certbot automatically. Please install it manually.${NC}"
            exit 1
        fi
    fi
    
    # Stop nginx temporarily for certificate generation
    echo -e "${BLUE}⏸️  Stopping nginx for certificate generation...${NC}"
    docker-compose -f "$DOCKER_COMPOSE_FILE" stop nginx || true
    
    # Generate certificates using standalone mode
    echo -e "${BLUE}🔐 Generating certificates for ${DOMAIN_NAME}...${NC}"
    sudo certbot certonly \
        --standalone \
        --email "$EMAIL" \
        --agree-tos \
        --no-eff-email \
        --domains "$DOMAIN_NAME" \
        --cert-path "$SSL_DIR/cert.pem" \
        --key-path "$SSL_DIR/key.pem" \
        --fullchain-path "$SSL_DIR/fullchain.pem" \
        --config-dir "$LETSENCRYPT_DIR" \
        --work-dir "$LETSENCRYPT_DIR/work" \
        --logs-dir "$LETSENCRYPT_DIR/logs"
    
    # Copy certificates to SSL directory
    sudo cp "/etc/letsencrypt/live/${DOMAIN_NAME}/fullchain.pem" "$SSL_DIR/fullchain.pem"
    sudo cp "/etc/letsencrypt/live/${DOMAIN_NAME}/privkey.pem" "$SSL_DIR/key.pem"
    sudo cp "/etc/letsencrypt/live/${DOMAIN_NAME}/cert.pem" "$SSL_DIR/cert.pem"
    
    # Set proper permissions
    sudo chown $(whoami):$(whoami) "$SSL_DIR"/*
    chmod 600 "$SSL_DIR/key.pem"
    chmod 644 "$SSL_DIR/cert.pem"
    chmod 644 "$SSL_DIR/fullchain.pem"
    
    echo -e "${GREEN}✅ Let's Encrypt certificates generated${NC}"
}

# Function to update nginx configuration
update_nginx_config() {
    echo -e "${BLUE}🔧 Updating nginx configuration...${NC}"
    
    # Create backup of original nginx.conf
    cp "$NGINX_CONF" "${NGINX_CONF}.backup"
    
    # Update nginx.conf with SSL configuration
    cat > "$NGINX_CONF" << 'EOF'
events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    # Logging
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;
    error_log /var/log/nginx/error.log warn;

    # Basic Settings
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    client_max_body_size 10M;

    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;

    # Rate Limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=login:10m rate=1r/s;

    # Security Headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Referrer-Policy "strict-origin-when-cross-origin";
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://api.binance.com https://api.back4app.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload";
    add_header Expect-CT "max-age=86400, enforce";

    # Upstream servers
    upstream frontend {
        server frontend:3000;
    }

    upstream backend {
        server backend:8080;
    }

    # HTTP server block - redirect to HTTPS
    server {
        listen 80;
        server_name ${DOMAIN_NAME};

        # Let's Encrypt challenge location
        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }

        # Redirect all other traffic to HTTPS
        location / {
            return 301 https://$server_name$request_uri;
        }
    }

    # HTTPS server block
    server {
        listen 443 ssl http2;
        server_name ${DOMAIN_NAME};

        # SSL Configuration
        ssl_certificate /etc/nginx/ssl/fullchain.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-SHA384:DHE-RSA-AES256-SHA384:ECDHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-SHA256:DHE-RSA-AES128-SHA256;
        ssl_prefer_server_ciphers off;
        ssl_session_cache shared:SSL:10m;
        ssl_session_timeout 10m;
        ssl_session_tickets off;
        ssl_stapling on;
        ssl_stapling_verify on;

        # Frontend routes
        location / {
            proxy_pass http://frontend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto https;
            proxy_set_header X-Forwarded-SSL on;
            
            # Cache static assets
            location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
                expires 1y;
                add_header Cache-Control "public, immutable";
                proxy_pass http://frontend;
            }
        }

        # API routes
        location /api/ {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto https;
            proxy_set_header X-Forwarded-SSL on;
            
            # CORS headers
            add_header Access-Control-Allow-Origin *;
            add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS";
            add_header Access-Control-Allow-Headers "DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization";
            
            if ($request_method = 'OPTIONS') {
                add_header Access-Control-Allow-Origin *;
                add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS";
                add_header Access-Control-Allow-Headers "DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization";
                add_header Access-Control-Max-Age 1728000;
                add_header Content-Type 'text/plain; charset=utf-8';
                add_header Content-Length 0;
                return 204;
            }
        }

        # Authentication routes with stricter rate limiting
        location /api/auth/ {
            limit_req zone=login burst=5 nodelay;
            proxy_pass http://backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto https;
            proxy_set_header X-Forwarded-SSL on;
        }

        # Health check endpoint
        location /health {
            access_log off;
            return 200 "healthy\n";
            add_header Content-Type text/plain;
        }

        # SSL health check endpoint
        location /ssl-health {
            access_log off;
            return 200 "ssl-healthy\n";
            add_header Content-Type text/plain;
        }

        # Monitoring endpoints
        location /metrics {
            proxy_pass http://backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto https;
            proxy_set_header X-Forwarded-SSL on;
        }
    }
}
EOF

    # Replace domain placeholder
    sed -i "s/\${DOMAIN_NAME}/$DOMAIN_NAME/g" "$NGINX_CONF"
    
    echo -e "${GREEN}✅ Nginx configuration updated${NC}"
}

# Function to validate SSL configuration
validate_ssl_config() {
    echo -e "${BLUE}🔍 Validating SSL configuration...${NC}"
    
    # Check if certificates exist
    if [ ! -f "$SSL_DIR/cert.pem" ] || [ ! -f "$SSL_DIR/key.pem" ]; then
        echo -e "${RED}❌ SSL certificates not found${NC}"
        return 1
    fi
    
    # Validate certificate
    if openssl x509 -in "$SSL_DIR/cert.pem" -text -noout &> /dev/null; then
        echo -e "${GREEN}✅ SSL certificate is valid${NC}"
    else
        echo -e "${RED}❌ SSL certificate is invalid${NC}"
        return 1
    fi
    
    # Validate private key
    if openssl rsa -in "$SSL_DIR/key.pem" -check &> /dev/null; then
        echo -e "${GREEN}✅ SSL private key is valid${NC}"
    else
        echo -e "${RED}❌ SSL private key is invalid${NC}"
        return 1
    fi
    
    # Check certificate expiration
    EXPIRY_DATE=$(openssl x509 -in "$SSL_DIR/cert.pem" -noout -enddate | cut -d= -f2)
    EXPIRY_EPOCH=$(date -d "$EXPIRY_DATE" +%s)
    CURRENT_EPOCH=$(date +%s)
    DAYS_UNTIL_EXPIRY=$(( (EXPIRY_EPOCH - CURRENT_EPOCH) / 86400 ))
    
    echo -e "${BLUE}📅 Certificate expires in $DAYS_UNTIL_EXPIRY days${NC}"
    
    if [ $DAYS_UNTIL_EXPIRY -lt 30 ]; then
        echo -e "${YELLOW}⚠️  Certificate expires soon. Consider renewing.${NC}"
    fi
}

# Main execution
main() {
    # Check if running as root for Let's Encrypt
    if [ "$DOMAIN_NAME" != "localhost" ] && [ "$EUID" -ne 0 ]; then
        echo -e "${RED}❌ This script must be run as root for Let's Encrypt certificate generation${NC}"
        echo -e "${YELLOW}   Run: sudo $0${NC}"
        exit 1
    fi
    
    # Generate certificates
    if [ "$DOMAIN_NAME" = "localhost" ]; then
        generate_self_signed
    else
        generate_letsencrypt
    fi
    
    # Update nginx configuration
    update_nginx_config
    
    # Validate configuration
    validate_ssl_config
    
    echo -e "${GREEN}🎉 SSL setup completed successfully!${NC}"
    echo "=================================="
    echo -e "${BLUE}📋 Next steps:${NC}"
    echo "1. Update your .env file with DOMAIN_NAME=$DOMAIN_NAME"
    echo "2. Run: docker-compose up -d"
    echo "3. Test SSL: https://$DOMAIN_NAME"
    echo "4. Set up automatic renewal: ./scripts/ssl-renew.sh"
}

# Run main function
main "$@"
