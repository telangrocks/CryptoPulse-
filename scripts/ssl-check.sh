#!/bin/bash

# CryptoPulse SSL Health Check Script
# This script monitors SSL certificate health and configuration

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DOMAIN_NAME=${DOMAIN_NAME:-"localhost"}
SSL_DIR="./ssl"
NGINX_CONF="nginx.conf"
DOCKER_COMPOSE_FILE="docker-compose.yml"
LOG_FILE="./ssl-health.log"

echo -e "${BLUE}🔍 CryptoPulse SSL Health Check${NC}"
echo "===================================="

# Function to log messages
log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> "$LOG_FILE"
    echo -e "$1"
}

# Function to check certificate existence
check_certificate_files() {
    log_message "${BLUE}📁 Checking certificate files...${NC}"
    
    local missing_files=()
    
    if [ ! -f "$SSL_DIR/cert.pem" ]; then
        missing_files+=("cert.pem")
    fi
    
    if [ ! -f "$SSL_DIR/key.pem" ]; then
        missing_files+=("key.pem")
    fi
    
    if [ ! -f "$SSL_DIR/fullchain.pem" ]; then
        missing_files+=("fullchain.pem")
    fi
    
    if [ ${#missing_files[@]} -eq 0 ]; then
        log_message "${GREEN}✅ All certificate files present${NC}"
        return 0
    else
        log_message "${RED}❌ Missing certificate files: ${missing_files[*]}${NC}"
        return 1
    fi
}

# Function to check certificate validity
check_certificate_validity() {
    log_message "${BLUE}🔐 Checking certificate validity...${NC}"
    
    if [ ! -f "$SSL_DIR/cert.pem" ]; then
        log_message "${RED}❌ Certificate file not found${NC}"
        return 1
    fi
    
    # Check if certificate is valid
    if openssl x509 -in "$SSL_DIR/cert.pem" -text -noout &> /dev/null; then
        log_message "${GREEN}✅ Certificate is valid${NC}"
    else
        log_message "${RED}❌ Certificate is invalid${NC}"
        return 1
    fi
    
    # Check if private key matches certificate
    if openssl x509 -in "$SSL_DIR/cert.pem" -pubkey -noout | openssl rsa -pubin -pubout -outform PEM 2>/dev/null | \
       openssl rsa -pubin -pubout -outform PEM 2>/dev/null | \
       openssl rsa -in "$SSL_DIR/key.pem" -pubout -outform PEM 2>/dev/null | \
       diff -q - &> /dev/null; then
        log_message "${GREEN}✅ Private key matches certificate${NC}"
    else
        log_message "${RED}❌ Private key does not match certificate${NC}"
        return 1
    fi
    
    return 0
}

# Function to check certificate expiration
check_certificate_expiration() {
    log_message "${BLUE}📅 Checking certificate expiration...${NC}"
    
    if [ ! -f "$SSL_DIR/cert.pem" ]; then
        log_message "${RED}❌ Certificate file not found${NC}"
        return 1
    fi
    
    EXPIRY_DATE=$(openssl x509 -in "$SSL_DIR/cert.pem" -noout -enddate | cut -d= -f2)
    EXPIRY_EPOCH=$(date -d "$EXPIRY_DATE" +%s)
    CURRENT_EPOCH=$(date +%s)
    DAYS_UNTIL_EXPIRY=$(( (EXPIRY_EPOCH - CURRENT_EPOCH) / 86400 ))
    
    log_message "${BLUE}📅 Certificate expires: $EXPIRY_DATE${NC}"
    log_message "${BLUE}📅 Days until expiry: $DAYS_UNTIL_EXPIRY${NC}"
    
    if [ $DAYS_UNTIL_EXPIRY -lt 0 ]; then
        log_message "${RED}❌ Certificate has expired${NC}"
        return 1
    elif [ $DAYS_UNTIL_EXPIRY -lt 7 ]; then
        log_message "${RED}❌ Certificate expires in less than 7 days${NC}"
        return 1
    elif [ $DAYS_UNTIL_EXPIRY -lt 30 ]; then
        log_message "${YELLOW}⚠️  Certificate expires in less than 30 days${NC}"
        return 2
    else
        log_message "${GREEN}✅ Certificate is valid for more than 30 days${NC}"
        return 0
    fi
}

# Function to check SSL configuration
check_ssl_configuration() {
    log_message "${BLUE}⚙️  Checking SSL configuration...${NC}"
    
    if [ ! -f "$NGINX_CONF" ]; then
        log_message "${RED}❌ Nginx configuration file not found${NC}"
        return 1
    fi
    
    # Check if HTTPS server block exists
    if grep -q "listen 443 ssl" "$NGINX_CONF"; then
        log_message "${GREEN}✅ HTTPS server block found${NC}"
    else
        log_message "${RED}❌ HTTPS server block not found${NC}"
        return 1
    fi
    
    # Check if SSL certificate paths are correct
    if grep -q "ssl_certificate /etc/nginx/ssl/fullchain.pem" "$NGINX_CONF"; then
        log_message "${GREEN}✅ SSL certificate path configured${NC}"
    else
        log_message "${RED}❌ SSL certificate path not configured${NC}"
        return 1
    fi
    
    # Check if SSL protocols are secure
    if grep -q "ssl_protocols TLSv1.2 TLSv1.3" "$NGINX_CONF"; then
        log_message "${GREEN}✅ Secure SSL protocols configured${NC}"
    else
        log_message "${YELLOW}⚠️  SSL protocols may not be secure${NC}"
    fi
    
    # Check if HSTS header is present
    if grep -q "Strict-Transport-Security" "$NGINX_CONF"; then
        log_message "${GREEN}✅ HSTS header configured${NC}"
    else
        log_message "${YELLOW}⚠️  HSTS header not configured${NC}"
    fi
    
    return 0
}

# Function to check nginx status
check_nginx_status() {
    log_message "${BLUE}🌐 Checking nginx status...${NC}"
    
    # Check if nginx container is running
    if docker-compose -f "$DOCKER_COMPOSE_FILE" ps nginx | grep -q "Up"; then
        log_message "${GREEN}✅ Nginx container is running${NC}"
    else
        log_message "${RED}❌ Nginx container is not running${NC}"
        return 1
    fi
    
    # Check nginx configuration syntax
    if docker-compose -f "$DOCKER_COMPOSE_FILE" exec nginx nginx -t &> /dev/null; then
        log_message "${GREEN}✅ Nginx configuration is valid${NC}"
    else
        log_message "${RED}❌ Nginx configuration is invalid${NC}"
        return 1
    fi
    
    return 0
}

# Function to test SSL connection
test_ssl_connection() {
    log_message "${BLUE}🔗 Testing SSL connection...${NC}"
    
    # Wait for nginx to be ready
    sleep 5
    
    # Test HTTPS connection
    if curl -k -f "https://${DOMAIN_NAME}/ssl-health" &> /dev/null; then
        log_message "${GREEN}✅ SSL connection test passed${NC}"
        return 0
    else
        log_message "${RED}❌ SSL connection test failed${NC}"
        return 1
    fi
}

# Function to check SSL grade
check_ssl_grade() {
    log_message "${BLUE}🏆 Checking SSL grade...${NC}"
    
    # This is a placeholder for SSL grade checking
    # You can integrate with SSL Labs API or other services
    log_message "${BLUE}💡 SSL grade checking requires external service integration${NC}"
    log_message "${BLUE}   Consider integrating with SSL Labs API for detailed analysis${NC}"
    
    return 0
}

# Function to generate health report
generate_health_report() {
    local report_file="./ssl-health-report-$(date +%Y%m%d_%H%M%S).txt"
    
    log_message "${BLUE}📊 Generating health report...${NC}"
    
    {
        echo "CryptoPulse SSL Health Report"
        echo "Generated: $(date)"
        echo "Domain: $DOMAIN_NAME"
        echo "=================================="
        echo ""
        
        echo "Certificate Information:"
        if [ -f "$SSL_DIR/cert.pem" ]; then
            openssl x509 -in "$SSL_DIR/cert.pem" -text -noout | grep -E "(Subject:|Issuer:|Not Before:|Not After:)"
        else
            echo "Certificate file not found"
        fi
        echo ""
        
        echo "Certificate Expiration:"
        if [ -f "$SSL_DIR/cert.pem" ]; then
            EXPIRY_DATE=$(openssl x509 -in "$SSL_DIR/cert.pem" -noout -enddate | cut -d= -f2)
            EXPIRY_EPOCH=$(date -d "$EXPIRY_DATE" +%s)
            CURRENT_EPOCH=$(date +%s)
            DAYS_UNTIL_EXPIRY=$(( (EXPIRY_EPOCH - CURRENT_EPOCH) / 86400 ))
            echo "Expires: $EXPIRY_DATE"
            echo "Days until expiry: $DAYS_UNTIL_EXPIRY"
        else
            echo "Certificate file not found"
        fi
        echo ""
        
        echo "Nginx Status:"
        docker-compose -f "$DOCKER_COMPOSE_FILE" ps nginx
        echo ""
        
        echo "SSL Configuration:"
        grep -E "(ssl_certificate|ssl_protocols|ssl_ciphers)" "$NGINX_CONF" || echo "SSL configuration not found"
        
    } > "$report_file"
    
    log_message "${GREEN}✅ Health report generated: $report_file${NC}"
}

# Function to send alert
send_alert() {
    local message="$1"
    local severity="$2"
    
    log_message "${RED}🚨 ALERT: $message${NC}"
    
    # This is a placeholder for alert integration
    # You can integrate with email, Slack, Discord, etc.
    log_message "${BLUE}📧 Alert: $message (Severity: $severity)${NC}"
    
    # Example: Send email alert
    # echo "$message" | mail -s "CryptoPulse SSL Alert - $severity" "$EMAIL"
    
    # Example: Send Slack alert
    # curl -X POST -H 'Content-type: application/json' \
    #     --data "{\"text\":\"🚨 CryptoPulse SSL Alert: $message\"}" \
    #     "$SLACK_WEBHOOK_URL"
}

# Main health check function
main() {
    local overall_status=0
    local critical_issues=0
    local warnings=0
    
    log_message "${BLUE}🚀 Starting SSL health check${NC}"
    
    # Check certificate files
    if ! check_certificate_files; then
        overall_status=1
        critical_issues=$((critical_issues + 1))
    fi
    
    # Check certificate validity
    if ! check_certificate_validity; then
        overall_status=1
        critical_issues=$((critical_issues + 1))
    fi
    
    # Check certificate expiration
    local expiry_status
    check_certificate_expiration
    expiry_status=$?
    if [ $expiry_status -eq 1 ]; then
        overall_status=1
        critical_issues=$((critical_issues + 1))
        send_alert "SSL certificate has expired or expires soon" "CRITICAL"
    elif [ $expiry_status -eq 2 ]; then
        warnings=$((warnings + 1))
        send_alert "SSL certificate expires in less than 30 days" "WARNING"
    fi
    
    # Check SSL configuration
    if ! check_ssl_configuration; then
        overall_status=1
        critical_issues=$((critical_issues + 1))
    fi
    
    # Check nginx status
    if ! check_nginx_status; then
        overall_status=1
        critical_issues=$((critical_issues + 1))
    fi
    
    # Test SSL connection
    if ! test_ssl_connection; then
        overall_status=1
        critical_issues=$((critical_issues + 1))
    fi
    
    # Check SSL grade
    check_ssl_grade
    
    # Generate health report
    generate_health_report
    
    # Summary
    log_message "${BLUE}📊 Health Check Summary${NC}"
    log_message "${BLUE}======================${NC}"
    log_message "${BLUE}Critical Issues: $critical_issues${NC}"
    log_message "${BLUE}Warnings: $warnings${NC}"
    
    if [ $overall_status -eq 0 ]; then
        log_message "${GREEN}✅ SSL health check passed${NC}"
    else
        log_message "${RED}❌ SSL health check failed${NC}"
    fi
    
    return $overall_status
}

# Run main function
main "$@"
