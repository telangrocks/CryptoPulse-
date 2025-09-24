#!/bin/bash

# CryptoPulse SSL Certificate Renewal Script
# This script handles automatic SSL certificate renewal

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
LOG_FILE="./ssl-renewal.log"

echo -e "${BLUE}🔄 CryptoPulse SSL Certificate Renewal${NC}"
echo "============================================="

# Function to log messages
log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> "$LOG_FILE"
    echo -e "$1"
}

# Function to check certificate expiration
check_cert_expiry() {
    if [ ! -f "$SSL_DIR/cert.pem" ]; then
        log_message "${RED}❌ Certificate file not found${NC}"
        return 1
    fi
    
    EXPIRY_DATE=$(openssl x509 -in "$SSL_DIR/cert.pem" -noout -enddate | cut -d= -f2)
    EXPIRY_EPOCH=$(date -d "$EXPIRY_DATE" +%s)
    CURRENT_EPOCH=$(date +%s)
    DAYS_UNTIL_EXPIRY=$(( (EXPIRY_EPOCH - CURRENT_EPOCH) / 86400 ))
    
    log_message "${BLUE}📅 Certificate expires in $DAYS_UNTIL_EXPIRY days${NC}"
    
    if [ $DAYS_UNTIL_EXPIRY -lt 30 ]; then
        log_message "${YELLOW}⚠️  Certificate expires soon. Renewal needed.${NC}"
        return 0
    else
        log_message "${GREEN}✅ Certificate is still valid${NC}"
        return 1
    fi
}

# Function to renew Let's Encrypt certificate
renew_letsencrypt() {
    log_message "${BLUE}🔐 Renewing Let's Encrypt certificate...${NC}"
    
    # Check if certbot is available
    if ! command -v certbot &> /dev/null; then
        log_message "${RED}❌ Certbot is not installed${NC}"
        return 1
    fi
    
    # Create backup of current certificates
    log_message "${BLUE}💾 Creating backup of current certificates...${NC}"
    mkdir -p "$SSL_DIR/backup/$(date +%Y%m%d_%H%M%S)"
    cp "$SSL_DIR"/*.pem "$SSL_DIR/backup/$(date +%Y%m%d_%H%M%S)/" 2>/dev/null || true
    
    # Stop nginx temporarily for certificate renewal
    log_message "${BLUE}⏸️  Stopping nginx for certificate renewal...${NC}"
    docker-compose -f "$DOCKER_COMPOSE_FILE" stop nginx || true
    
    # Renew certificate
    log_message "${BLUE}🔄 Renewing certificate for ${DOMAIN_NAME}...${NC}"
    if sudo certbot renew \
        --standalone \
        --email "$EMAIL" \
        --agree-tos \
        --no-eff-email \
        --domains "$DOMAIN_NAME" \
        --config-dir "$LETSENCRYPT_DIR" \
        --work-dir "$LETSENCRYPT_DIR/work" \
        --logs-dir "$LETSENCRYPT_DIR/logs"; then
        
        # Copy renewed certificates
        sudo cp "/etc/letsencrypt/live/${DOMAIN_NAME}/fullchain.pem" "$SSL_DIR/fullchain.pem"
        sudo cp "/etc/letsencrypt/live/${DOMAIN_NAME}/privkey.pem" "$SSL_DIR/key.pem"
        sudo cp "/etc/letsencrypt/live/${DOMAIN_NAME}/cert.pem" "$SSL_DIR/cert.pem"
        
        # Set proper permissions
        sudo chown $(whoami):$(whoami) "$SSL_DIR"/*
        chmod 600 "$SSL_DIR/key.pem"
        chmod 644 "$SSL_DIR/cert.pem"
        chmod 644 "$SSL_DIR/fullchain.pem"
        
        log_message "${GREEN}✅ Certificate renewed successfully${NC}"
        return 0
    else
        log_message "${RED}❌ Certificate renewal failed${NC}"
        return 1
    fi
}

# Function to renew self-signed certificate
renew_self_signed() {
    log_message "${BLUE}🔐 Renewing self-signed certificate...${NC}"
    
    # Create backup
    mkdir -p "$SSL_DIR/backup/$(date +%Y%m%d_%H%M%S)"
    cp "$SSL_DIR"/*.pem "$SSL_DIR/backup/$(date +%Y%m%d_%H%M%S)/" 2>/dev/null || true
    
    # Generate new self-signed certificate
    openssl genrsa -out "$SSL_DIR/key.pem" 2048
    openssl req -new -key "$SSL_DIR/key.pem" -out "$SSL_DIR/cert.csr" -subj "/C=US/ST=State/L=City/O=Organization/CN=${DOMAIN_NAME}"
    openssl x509 -req -days 365 -in "$SSL_DIR/cert.csr" -signkey "$SSL_DIR/key.pem" -out "$SSL_DIR/cert.pem"
    rm "$SSL_DIR/cert.csr"
    
    log_message "${GREEN}✅ Self-signed certificate renewed${NC}"
}

# Function to reload nginx
reload_nginx() {
    log_message "${BLUE}🔄 Reloading nginx configuration...${NC}"
    
    # Start nginx
    docker-compose -f "$DOCKER_COMPOSE_FILE" up -d nginx
    
    # Wait for nginx to start
    sleep 5
    
    # Test nginx configuration
    if docker-compose -f "$DOCKER_COMPOSE_FILE" exec nginx nginx -t; then
        log_message "${GREEN}✅ Nginx configuration is valid${NC}"
        
        # Reload nginx
        docker-compose -f "$DOCKER_COMPOSE_FILE" exec nginx nginx -s reload
        log_message "${GREEN}✅ Nginx reloaded successfully${NC}"
        return 0
    else
        log_message "${RED}❌ Nginx configuration is invalid${NC}"
        return 1
    fi
}

# Function to test SSL connection
test_ssl_connection() {
    log_message "${BLUE}🔍 Testing SSL connection...${NC}"
    
    # Wait for nginx to be ready
    sleep 10
    
    # Test HTTPS connection
    if curl -k -f "https://${DOMAIN_NAME}/ssl-health" &> /dev/null; then
        log_message "${GREEN}✅ SSL connection test passed${NC}"
        return 0
    else
        log_message "${RED}❌ SSL connection test failed${NC}"
        return 1
    fi
}

# Function to send notification (placeholder)
send_notification() {
    local message="$1"
    local status="$2"
    
    # This is a placeholder for notification integration
    # You can integrate with email, Slack, Discord, etc.
    log_message "${BLUE}📧 Notification: $message${NC}"
    
    # Example: Send email notification
    # echo "$message" | mail -s "CryptoPulse SSL Renewal - $status" "$EMAIL"
    
    # Example: Send Slack notification
    # curl -X POST -H 'Content-type: application/json' \
    #     --data "{\"text\":\"$message\"}" \
    #     "$SLACK_WEBHOOK_URL"
}

# Function to cleanup old backups
cleanup_backups() {
    log_message "${BLUE}🧹 Cleaning up old backups...${NC}"
    
    # Keep only last 5 backups
    if [ -d "$SSL_DIR/backup" ]; then
        cd "$SSL_DIR/backup"
        ls -t | tail -n +6 | xargs -r rm -rf
        cd - > /dev/null
        log_message "${GREEN}✅ Old backups cleaned up${NC}"
    fi
}

# Main renewal function
main() {
    log_message "${BLUE}🚀 Starting SSL certificate renewal process${NC}"
    
    # Check if renewal is needed
    if ! check_cert_expiry; then
        log_message "${GREEN}✅ Certificate renewal not needed${NC}"
        exit 0
    fi
    
    # Renew certificate based on type
    if [ "$DOMAIN_NAME" = "localhost" ]; then
        renew_self_signed
    else
        if ! renew_letsencrypt; then
            log_message "${RED}❌ Certificate renewal failed${NC}"
            send_notification "SSL certificate renewal failed for $DOMAIN_NAME" "FAILED"
            exit 1
        fi
    fi
    
    # Reload nginx
    if ! reload_nginx; then
        log_message "${RED}❌ Failed to reload nginx${NC}"
        send_notification "Failed to reload nginx after SSL renewal for $DOMAIN_NAME" "FAILED"
        exit 1
    fi
    
    # Test SSL connection
    if ! test_ssl_connection; then
        log_message "${RED}❌ SSL connection test failed${NC}"
        send_notification "SSL connection test failed after renewal for $DOMAIN_NAME" "FAILED"
        exit 1
    fi
    
    # Cleanup old backups
    cleanup_backups
    
    # Send success notification
    send_notification "SSL certificate renewed successfully for $DOMAIN_NAME" "SUCCESS"
    
    log_message "${GREEN}🎉 SSL certificate renewal completed successfully!${NC}"
}

# Check if running as root for Let's Encrypt
if [ "$DOMAIN_NAME" != "localhost" ] && [ "$EUID" -ne 0 ]; then
    echo -e "${RED}❌ This script must be run as root for Let's Encrypt certificate renewal${NC}"
    echo -e "${YELLOW}   Run: sudo $0${NC}"
    exit 1
fi

# Run main function
main "$@"
