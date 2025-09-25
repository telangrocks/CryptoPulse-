#!/bin/bash

# CryptoPulse Trading Bot - Restore Script
# This script restores the application from backups

set -euo pipefail

# Configuration
BACKUP_DIR="/backup"
LOG_FILE="/var/log/restore.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

# Error handling
error_exit() {
    log "${RED}ERROR: $1${NC}"
    exit 1
}

# Success message
success() {
    log "${GREEN}SUCCESS: $1${NC}"
}

# Warning message
warning() {
    log "${YELLOW}WARNING: $1${NC}"
}

# Show usage
usage() {
    echo "Usage: $0 [OPTIONS] BACKUP_DATE"
    echo ""
    echo "Options:"
    echo "  -h, --help              Show this help message"
    echo "  -d, --database          Restore database only"
    echo "  -a, --application       Restore application only"
    echo "  -c, --config            Restore configuration only"
    echo "  -f, --force             Force restore without confirmation"
    echo "  -l, --list              List available backups"
    echo ""
    echo "Examples:"
    echo "  $0 --list"
    echo "  $0 20240101_120000"
    echo "  $0 --database 20240101_120000"
    echo "  $0 --force 20240101_120000"
    exit 1
}

# List available backups
list_backups() {
    log "Available backups:"
    
    if [[ ! -d "$BACKUP_DIR" ]]; then
        error_exit "Backup directory not found: $BACKUP_DIR"
    fi
    
    # List database backups
    echo "Database backups:"
    ls -la "$BACKUP_DIR"/database_*.sql.gz 2>/dev/null || echo "No database backups found"
    
    # List application backups
    echo "Application backups:"
    ls -la "$BACKUP_DIR"/application_*.tar.gz 2>/dev/null || echo "No application backups found"
    
    # List configuration backups
    echo "Configuration backups:"
    ls -la "$BACKUP_DIR"/config_*.tar.gz 2>/dev/null || echo "No configuration backups found"
    
    # List Redis backups
    echo "Redis backups:"
    ls -la "$BACKUP_DIR"/redis_*.rdb.gz 2>/dev/null || echo "No Redis backups found"
    
    # List MongoDB backups
    echo "MongoDB backups:"
    ls -la "$BACKUP_DIR"/mongodb_*.tar.gz 2>/dev/null || echo "No MongoDB backups found"
}

# Confirm restore
confirm_restore() {
    if [[ "$FORCE" != "true" ]]; then
        echo "This will restore the application from backup: $BACKUP_DATE"
        echo "WARNING: This will overwrite current data!"
        read -p "Are you sure you want to continue? (yes/no): " -r
        if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
            log "Restore cancelled by user"
            exit 0
        fi
    fi
}

# Restore database
restore_database() {
    log "Starting database restore..."
    
    local db_backup_file="$BACKUP_DIR/database_$BACKUP_DATE.sql.gz"
    
    if [[ ! -f "$db_backup_file" ]]; then
        error_exit "Database backup not found: $db_backup_file"
    fi
    
    # Stop application services
    log "Stopping application services..."
    docker-compose -f docker-compose.production.yml stop backend || true
    
    # Restore PostgreSQL
    log "Restoring PostgreSQL database..."
    gunzip -c "$db_backup_file" | psql -h localhost -U "$POSTGRES_USER" -d "$POSTGRES_DB" || error_exit "PostgreSQL restore failed"
    
    success "Database restore completed"
}

# Restore Redis
restore_redis() {
    log "Starting Redis restore..."
    
    local redis_backup_file="$BACKUP_DIR/redis_$BACKUP_DATE.rdb.gz"
    
    if [[ ! -f "$redis_backup_file" ]]; then
        warning "Redis backup not found: $redis_backup_file"
        return
    fi
    
    # Stop Redis
    log "Stopping Redis..."
    docker-compose -f docker-compose.production.yml stop redis || true
    
    # Restore Redis data
    log "Restoring Redis data..."
    gunzip -c "$redis_backup_file" > /var/lib/redis/dump.rdb || error_exit "Redis restore failed"
    
    # Start Redis
    log "Starting Redis..."
    docker-compose -f docker-compose.production.yml start redis || error_exit "Failed to start Redis"
    
    success "Redis restore completed"
}

# Restore MongoDB
restore_mongodb() {
    log "Starting MongoDB restore..."
    
    local mongo_backup_file="$BACKUP_DIR/mongodb_$BACKUP_DATE.tar.gz"
    
    if [[ ! -f "$mongo_backup_file" ]]; then
        warning "MongoDB backup not found: $mongo_backup_file"
        return
    fi
    
    # Stop MongoDB
    log "Stopping MongoDB..."
    docker-compose -f docker-compose.production.yml stop mongodb || true
    
    # Extract MongoDB backup
    local mongo_backup_dir="$BACKUP_DIR/mongodb_restore_$BACKUP_DATE"
    mkdir -p "$mongo_backup_dir"
    tar -xzf "$mongo_backup_file" -C "$BACKUP_DIR" || error_exit "MongoDB backup extraction failed"
    
    # Restore MongoDB data
    log "Restoring MongoDB data..."
    mongorestore --host localhost --db "$MONGO_DATABASE" "$mongo_backup_dir/mongodb_$BACKUP_DATE" || error_exit "MongoDB restore failed"
    
    # Cleanup
    rm -rf "$mongo_backup_dir"
    
    # Start MongoDB
    log "Starting MongoDB..."
    docker-compose -f docker-compose.production.yml start mongodb || error_exit "Failed to start MongoDB"
    
    success "MongoDB restore completed"
}

# Restore application
restore_application() {
    log "Starting application restore..."
    
    local app_backup_file="$BACKUP_DIR/application_$BACKUP_DATE.tar.gz"
    
    if [[ ! -f "$app_backup_file" ]]; then
        error_exit "Application backup not found: $app_backup_file"
    fi
    
    # Stop application
    log "Stopping application..."
    docker-compose -f docker-compose.production.yml stop backend || true
    
    # Create backup of current application
    log "Creating backup of current application..."
    tar -czf "$BACKUP_DIR/application_backup_before_restore_$(date +%Y%m%d_%H%M%S).tar.gz" \
        --exclude=node_modules \
        --exclude=.git \
        --exclude=logs \
        --exclude=coverage \
        --exclude=dist \
        --exclude=backup \
        . || warning "Failed to create backup of current application"
    
    # Restore application files
    log "Restoring application files..."
    tar -xzf "$app_backup_file" || error_exit "Application restore failed"
    
    # Reinstall dependencies
    log "Reinstalling dependencies..."
    npm install --production || error_exit "Failed to install dependencies"
    
    # Rebuild frontend
    log "Rebuilding frontend..."
    cd frontend
    npm install || error_exit "Failed to install frontend dependencies"
    npm run build || error_exit "Failed to build frontend"
    cd ..
    
    success "Application restore completed"
}

# Restore configuration
restore_configuration() {
    log "Starting configuration restore..."
    
    local config_backup_file="$BACKUP_DIR/config_$BACKUP_DATE.tar.gz"
    
    if [[ ! -f "$config_backup_file" ]]; then
        error_exit "Configuration backup not found: $config_backup_file"
    fi
    
    # Create backup of current configuration
    log "Creating backup of current configuration..."
    tar -czf "$BACKUP_DIR/config_backup_before_restore_$(date +%Y%m%d_%H%M%S).tar.gz" \
        .env* \
        docker-compose*.yml \
        nginx.conf \
        ssl/ \
        monitoring/ \
        scripts/ \
        docs/ || warning "Failed to create backup of current configuration"
    
    # Restore configuration files
    log "Restoring configuration files..."
    tar -xzf "$config_backup_file" || error_exit "Configuration restore failed"
    
    success "Configuration restore completed"
}

# Restore logs
restore_logs() {
    log "Starting logs restore..."
    
    local logs_backup_file="$BACKUP_DIR/logs_$BACKUP_DATE.tar.gz"
    
    if [[ ! -f "$logs_backup_file" ]]; then
        warning "Logs backup not found: $logs_backup_file"
        return
    fi
    
    # Restore logs
    log "Restoring logs..."
    tar -xzf "$logs_backup_file" || error_exit "Logs restore failed"
    
    success "Logs restore completed"
}

# Start services
start_services() {
    log "Starting services..."
    
    # Start all services
    docker-compose -f docker-compose.production.yml up -d || error_exit "Failed to start services"
    
    # Wait for services to be ready
    log "Waiting for services to be ready..."
    sleep 30
    
    # Check service health
    log "Checking service health..."
    docker-compose -f docker-compose.production.yml ps
    
    success "Services started successfully"
}

# Verify restore
verify_restore() {
    log "Verifying restore..."
    
    # Check database connectivity
    if command -v psql &> /dev/null; then
        psql -h localhost -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT 1;" || error_exit "Database connectivity check failed"
    fi
    
    # Check Redis connectivity
    if command -v redis-cli &> /dev/null; then
        redis-cli -a "$REDIS_PASSWORD" ping || error_exit "Redis connectivity check failed"
    fi
    
    # Check application health
    curl -f http://localhost:3000/health || error_exit "Application health check failed"
    
    success "Restore verification completed"
}

# Send notification
send_notification() {
    local status="$1"
    local message="$2"
    
    # Email notification
    if [[ -n "${ALERT_EMAIL:-}" ]]; then
        echo "$message" | mail -s "CryptoPulse Restore $status" "$ALERT_EMAIL" || true
    fi
    
    # Slack notification
    if [[ -n "${ALERT_SLACK_WEBHOOK:-}" ]]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"CryptoPulse Restore $status: $message\"}" \
            "$ALERT_SLACK_WEBHOOK" || true
    fi
}

# Main restore function
main() {
    # Parse command line arguments
    RESTORE_DATABASE="false"
    RESTORE_APPLICATION="false"
    RESTORE_CONFIG="false"
    FORCE="false"
    BACKUP_DATE=""
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                usage
                ;;
            -d|--database)
                RESTORE_DATABASE="true"
                shift
                ;;
            -a|--application)
                RESTORE_APPLICATION="true"
                shift
                ;;
            -c|--config)
                RESTORE_CONFIG="true"
                shift
                ;;
            -f|--force)
                FORCE="true"
                shift
                ;;
            -l|--list)
                list_backups
                exit 0
                ;;
            *)
                if [[ -z "$BACKUP_DATE" ]]; then
                    BACKUP_DATE="$1"
                else
                    error_exit "Unknown option: $1"
                fi
                shift
                ;;
        esac
    done
    
    # Validate backup date
    if [[ -z "$BACKUP_DATE" ]]; then
        error_exit "Backup date is required"
    fi
    
    # Load environment variables
    if [[ -f ".env" ]]; then
        source .env
    else
        error_exit "Environment file not found"
    fi
    
    # Confirm restore
    confirm_restore
    
    # Perform restore
    if [[ "$RESTORE_DATABASE" == "true" ]]; then
        restore_database
        restore_redis
        restore_mongodb
    elif [[ "$RESTORE_APPLICATION" == "true" ]]; then
        restore_application
    elif [[ "$RESTORE_CONFIG" == "true" ]]; then
        restore_configuration
    else
        # Full restore
        restore_database
        restore_redis
        restore_mongodb
        restore_application
        restore_configuration
        restore_logs
    fi
    
    # Start services
    start_services
    
    # Verify restore
    verify_restore
    
    # Send success notification
    send_notification "SUCCESS" "Restore completed successfully at $(date)"
    
    success "Restore process completed successfully"
}

# Error handling
trap 'error_exit "Restore process interrupted"' INT TERM

# Run main function
main "$@"
