#!/bin/bash

# CryptoPulse Trading Bot - Backup Script
# This script creates comprehensive backups of the application data

set -euo pipefail

# Configuration
BACKUP_DIR="/backup"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30
LOG_FILE="/var/log/backup.log"

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

# Check if running as root
check_root() {
    if [[ $EUID -eq 0 ]]; then
        warning "Running as root. Consider using a dedicated backup user."
    fi
}

# Create backup directory
create_backup_dir() {
    if [[ ! -d "$BACKUP_DIR" ]]; then
        mkdir -p "$BACKUP_DIR" || error_exit "Failed to create backup directory"
        log "Created backup directory: $BACKUP_DIR"
    fi
}

# Database backup
backup_database() {
    log "Starting database backup..."
    
    local db_backup_file="$BACKUP_DIR/database_$DATE.sql"
    
    # PostgreSQL backup
    if command -v pg_dump &> /dev/null; then
        pg_dump -h localhost -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
            --no-password --verbose --format=custom \
            --file="$db_backup_file" || error_exit "PostgreSQL backup failed"
        
        # Compress the backup
        gzip "$db_backup_file"
        success "PostgreSQL backup completed: ${db_backup_file}.gz"
    else
        warning "pg_dump not found. Skipping PostgreSQL backup."
    fi
    
    # MongoDB backup
    if command -v mongodump &> /dev/null; then
        local mongo_backup_dir="$BACKUP_DIR/mongodb_$DATE"
        mongodump --host localhost --db "$MONGO_DATABASE" \
            --out "$mongo_backup_dir" || error_exit "MongoDB backup failed"
        
        # Compress the backup
        tar -czf "${mongo_backup_dir}.tar.gz" -C "$BACKUP_DIR" "mongodb_$DATE"
        rm -rf "$mongo_backup_dir"
        success "MongoDB backup completed: ${mongo_backup_dir}.tar.gz"
    else
        warning "mongodump not found. Skipping MongoDB backup."
    fi
}

# Redis backup
backup_redis() {
    log "Starting Redis backup..."
    
    local redis_backup_file="$BACKUP_DIR/redis_$DATE.rdb"
    
    if command -v redis-cli &> /dev/null; then
        # Trigger Redis save
        redis-cli -a "$REDIS_PASSWORD" BGSAVE || error_exit "Redis save failed"
        
        # Wait for save to complete
        while [[ $(redis-cli -a "$REDIS_PASSWORD" LASTSAVE) -eq $(redis-cli -a "$REDIS_PASSWORD" LASTSAVE) ]]; do
            sleep 1
        done
        
        # Copy RDB file
        cp /var/lib/redis/dump.rdb "$redis_backup_file" || error_exit "Redis backup copy failed"
        
        # Compress the backup
        gzip "$redis_backup_file"
        success "Redis backup completed: ${redis_backup_file}.gz"
    else
        warning "redis-cli not found. Skipping Redis backup."
    fi
}

# Application files backup
backup_application() {
    log "Starting application backup..."
    
    local app_backup_file="$BACKUP_DIR/application_$DATE.tar.gz"
    
    # Create application backup
    tar -czf "$app_backup_file" \
        --exclude=node_modules \
        --exclude=.git \
        --exclude=logs \
        --exclude=coverage \
        --exclude=dist \
        --exclude=backup \
        . || error_exit "Application backup failed"
    
    success "Application backup completed: $app_backup_file"
}

# Configuration backup
backup_configuration() {
    log "Starting configuration backup..."
    
    local config_backup_file="$BACKUP_DIR/config_$DATE.tar.gz"
    
    # Backup configuration files
    tar -czf "$config_backup_file" \
        .env* \
        docker-compose*.yml \
        nginx.conf \
        ssl/ \
        monitoring/ \
        scripts/ \
        docs/ || error_exit "Configuration backup failed"
    
    success "Configuration backup completed: $config_backup_file"
}

# Logs backup
backup_logs() {
    log "Starting logs backup..."
    
    local logs_backup_file="$BACKUP_DIR/logs_$DATE.tar.gz"
    
    # Backup application logs
    if [[ -d "logs" ]]; then
        tar -czf "$logs_backup_file" logs/ || error_exit "Logs backup failed"
        success "Logs backup completed: $logs_backup_file"
    else
        warning "No logs directory found. Skipping logs backup."
    fi
}

# Upload to cloud storage (optional)
upload_to_cloud() {
    if [[ -n "${CLOUD_STORAGE_URL:-}" ]]; then
        log "Uploading backups to cloud storage..."
        
        # Upload to AWS S3
        if command -v aws &> /dev/null; then
            aws s3 sync "$BACKUP_DIR" "s3://$S3_BUCKET/backups/" \
                --exclude "*" --include "*$DATE*" || warning "S3 upload failed"
        fi
        
        # Upload to Google Cloud Storage
        if command -v gsutil &> /dev/null; then
            gsutil -m cp "$BACKUP_DIR/*$DATE*" "gs://$GCS_BUCKET/backups/" || warning "GCS upload failed"
        fi
        
        success "Cloud upload completed"
    fi
}

# Cleanup old backups
cleanup_old_backups() {
    log "Cleaning up old backups..."
    
    # Remove backups older than retention period
    find "$BACKUP_DIR" -name "*.sql.gz" -mtime +$RETENTION_DAYS -delete
    find "$BACKUP_DIR" -name "*.rdb.gz" -mtime +$RETENTION_DAYS -delete
    find "$BACKUP_DIR" -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete
    
    success "Old backups cleaned up (retention: $RETENTION_DAYS days)"
}

# Verify backup integrity
verify_backups() {
    log "Verifying backup integrity..."
    
    local verification_failed=false
    
    # Verify compressed files
    for file in "$BACKUP_DIR"/*$DATE*.gz; do
        if [[ -f "$file" ]]; then
            if ! gzip -t "$file"; then
                error_exit "Backup file is corrupted: $file"
            fi
        fi
    done
    
    # Verify tar files
    for file in "$BACKUP_DIR"/*$DATE*.tar.gz; do
        if [[ -f "$file" ]]; then
            if ! tar -tzf "$file" > /dev/null; then
                error_exit "Backup file is corrupted: $file"
            fi
        fi
    done
    
    success "Backup integrity verified"
}

# Send notification
send_notification() {
    local status="$1"
    local message="$2"
    
    # Email notification
    if [[ -n "${ALERT_EMAIL:-}" ]]; then
        echo "$message" | mail -s "CryptoPulse Backup $status" "$ALERT_EMAIL" || true
    fi
    
    # Slack notification
    if [[ -n "${ALERT_SLACK_WEBHOOK:-}" ]]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"CryptoPulse Backup $status: $message\"}" \
            "$ALERT_SLACK_WEBHOOK" || true
    fi
}

# Main backup function
main() {
    log "Starting CryptoPulse backup process..."
    
    # Check prerequisites
    check_root
    create_backup_dir
    
    # Load environment variables
    if [[ -f ".env" ]]; then
        source .env
    else
        error_exit "Environment file not found"
    fi
    
    # Perform backups
    backup_database
    backup_redis
    backup_application
    backup_configuration
    backup_logs
    
    # Post-backup tasks
    verify_backups
    cleanup_old_backups
    upload_to_cloud
    
    # Send success notification
    send_notification "SUCCESS" "Backup completed successfully at $(date)"
    
    success "Backup process completed successfully"
    log "Backup files created in: $BACKUP_DIR"
}

# Error handling
trap 'error_exit "Backup process interrupted"' INT TERM

# Run main function
main "$@"