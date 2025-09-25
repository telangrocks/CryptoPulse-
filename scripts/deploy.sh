#!/bin/bash

# CryptoPulse Trading Bot - Production Deployment Script
# This script handles the complete deployment process with rollback capabilities

set -e  # Exit on any error

# Configuration
APP_NAME="cryptopulse-trading-bot"
DOCKER_COMPOSE_FILE="docker-compose.production.yml"
BACKUP_DIR="/opt/backups"
LOG_FILE="/var/log/cryptopulse/deploy.log"
HEALTH_CHECK_URL="http://localhost:3000/health"
ROLLBACK_TAG=""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
    exit 1
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

# Create log directory
mkdir -p "$(dirname "$LOG_FILE")"

log "Starting deployment process for $APP_NAME"

# Function to check if service is healthy
check_health() {
    local max_attempts=30
    local attempt=1
    
    log "Checking application health..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f -s "$HEALTH_CHECK_URL" > /dev/null 2>&1; then
            success "Application is healthy"
            return 0
        fi
        
        log "Health check attempt $attempt/$max_attempts failed, waiting 10 seconds..."
        sleep 10
        ((attempt++))
    done
    
    error "Application failed health check after $max_attempts attempts"
}

# Function to create backup
create_backup() {
    log "Creating backup before deployment..."
    
    local backup_timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_path="$BACKUP_DIR/$APP_NAME-$backup_timestamp"
    
    mkdir -p "$backup_path"
    
    # Backup database
    if docker-compose -f "$DOCKER_COMPOSE_FILE" exec -T postgres pg_dump -U postgres cryptopulse > "$backup_path/database.sql"; then
        success "Database backup created"
    else
        warning "Database backup failed, continuing with deployment"
    fi
    
    # Backup Redis data
    if docker-compose -f "$DOCKER_COMPOSE_FILE" exec -T redis redis-cli BGSAVE > /dev/null 2>&1; then
        success "Redis backup initiated"
    else
        warning "Redis backup failed, continuing with deployment"
    fi
    
    # Backup application data
    if docker-compose -f "$DOCKER_COMPOSE_FILE" exec -T backend tar -czf - /app/data > "$backup_path/app-data.tar.gz" 2>/dev/null; then
        success "Application data backup created"
    else
        warning "Application data backup failed, continuing with deployment"
    fi
    
    echo "$backup_timestamp" > "$BACKUP_DIR/latest_backup"
    success "Backup completed: $backup_path"
}

# Function to rollback deployment
rollback() {
    local backup_timestamp="$1"
    
    if [ -z "$backup_timestamp" ]; then
        backup_timestamp=$(cat "$BACKUP_DIR/latest_backup" 2>/dev/null || echo "")
    fi
    
    if [ -z "$backup_timestamp" ]; then
        error "No backup found for rollback"
    fi
    
    log "Starting rollback to backup: $backup_timestamp"
    
    # Stop current services
    docker-compose -f "$DOCKER_COMPOSE_FILE" down
    
    # Restore database
    if [ -f "$BACKUP_DIR/$APP_NAME-$backup_timestamp/database.sql" ]; then
        docker-compose -f "$DOCKER_COMPOSE_FILE" up -d postgres
        sleep 10
        docker-compose -f "$DOCKER_COMPOSE_FILE" exec -T postgres psql -U postgres -d cryptopulse < "$BACKUP_DIR/$APP_NAME-$backup_timestamp/database.sql"
        success "Database restored"
    fi
    
    # Start services
    docker-compose -f "$DOCKER_COMPOSE_FILE" up -d
    
    # Wait for services to start
    sleep 30
    
    # Check health
    if check_health; then
        success "Rollback completed successfully"
    else
        error "Rollback failed - application is not healthy"
    fi
}

# Function to deploy application
deploy() {
    log "Starting application deployment..."
    
    # Pull latest images
    log "Pulling latest Docker images..."
    docker-compose -f "$DOCKER_COMPOSE_FILE" pull
    
    # Build application
    log "Building application..."
    docker-compose -f "$DOCKER_COMPOSE_FILE" build --no-cache
    
    # Stop existing services
    log "Stopping existing services..."
    docker-compose -f "$DOCKER_COMPOSE_FILE" down
    
    # Start services
    log "Starting services..."
    docker-compose -f "$DOCKER_COMPOSE_FILE" up -d
    
    # Wait for services to start
    log "Waiting for services to start..."
    sleep 30
    
    # Check health
    if check_health; then
        success "Deployment completed successfully"
    else
        error "Deployment failed - application is not healthy"
    fi
}

# Function to run database migrations
run_migrations() {
    log "Running database migrations..."
    
    if docker-compose -f "$DOCKER_COMPOSE_FILE" exec -T backend npm run migrate; then
        success "Database migrations completed"
    else
        error "Database migrations failed"
    fi
}

# Function to run tests
run_tests() {
    log "Running pre-deployment tests..."
    
    if docker-compose -f "$DOCKER_COMPOSE_FILE" exec -T backend npm test; then
        success "Tests passed"
    else
        error "Tests failed - deployment aborted"
    fi
}

# Function to cleanup old images
cleanup() {
    log "Cleaning up old Docker images..."
    
    # Remove unused images
    docker image prune -f
    
    # Remove old application images
    docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.CreatedAt}}" | grep "$APP_NAME" | awk '$3 < "'$(date -d '7 days ago' --iso-8601)'" {print $1":"$2}' | xargs -r docker rmi
    
    success "Cleanup completed"
}

# Function to send notifications
send_notification() {
    local status="$1"
    local message="$2"
    
    # Slack notification
    if [ -n "$SLACK_WEBHOOK_URL" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"🚀 CryptoPulse Deployment $status: $message\"}" \
            "$SLACK_WEBHOOK_URL" > /dev/null 2>&1 || true
    fi
    
    # Email notification
    if [ -n "$ALERT_EMAIL" ]; then
        echo "CryptoPulse Deployment $status: $message" | mail -s "CryptoPulse Deployment $status" "$ALERT_EMAIL" || true
    fi
}

# Main deployment function
main() {
    local action="${1:-deploy}"
    
    case "$action" in
        "deploy")
            log "Starting deployment process..."
            create_backup
            run_tests
            deploy
            run_migrations
            cleanup
            send_notification "SUCCESS" "Deployment completed successfully"
            success "Deployment process completed"
            ;;
        "rollback")
            log "Starting rollback process..."
            rollback "$2"
            send_notification "ROLLBACK" "Rollback completed successfully"
            success "Rollback process completed"
            ;;
        "health")
            check_health
            ;;
        "backup")
            create_backup
            ;;
        "test")
            run_tests
            ;;
        "migrate")
            run_migrations
            ;;
        "cleanup")
            cleanup
            ;;
        *)
            echo "Usage: $0 {deploy|rollback|health|backup|test|migrate|cleanup}"
            echo ""
            echo "Commands:"
            echo "  deploy    - Deploy the application"
            echo "  rollback  - Rollback to previous version"
            echo "  health    - Check application health"
            echo "  backup    - Create backup"
            echo "  test      - Run tests"
            echo "  migrate   - Run database migrations"
            echo "  cleanup   - Clean up old images"
            exit 1
            ;;
    esac
}

# Trap errors and send notifications
trap 'error "Deployment failed at line $LINENO"; send_notification "FAILED" "Deployment failed at line $LINENO"' ERR

# Run main function
main "$@"

