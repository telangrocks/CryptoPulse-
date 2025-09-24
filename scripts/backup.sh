#!/bin/bash

# CryptoPulse Backup and Recovery Script
# Comprehensive backup solution for production deployment

set -euo pipefail

# Configuration
BACKUP_DIR="${BACKUP_DIR:-./backups}"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="cryptopulse_backup_${DATE}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] ✅${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] ⚠️${NC} $1"
}

log_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ❌${NC} $1"
}

# Create backup directory
create_backup_dir() {
    log "Creating backup directory: ${BACKUP_DIR}/${BACKUP_NAME}"
    mkdir -p "${BACKUP_DIR}/${BACKUP_NAME}"
}

# Backup MongoDB database
backup_mongodb() {
    log "Starting MongoDB backup..."
    
    if ! command -v mongodump &> /dev/null; then
        log_error "mongodump not found. Please install MongoDB tools."
        return 1
    fi
    
    local mongo_host="${MONGO_HOST:-localhost}"
    local mongo_port="${MONGO_PORT:-27017}"
    local mongo_db="${MONGO_DATABASE:-cryptopulse}"
    local mongo_user="${MONGO_USERNAME:-cryptopulse}"
    local mongo_password="${MONGO_PASSWORD:-cryptopulse_mongo_2024}"
    
    local backup_file="${BACKUP_DIR}/${BACKUP_NAME}/mongodb_backup"
    
    if mongodump --host "${mongo_host}:${mongo_port}" \
                 --db "${mongo_db}" \
                 --username "${mongo_user}" \
                 --password "${mongo_password}" \
                 --authenticationDatabase admin \
                 --out "${backup_file}" \
                 --gzip; then
        log_success "MongoDB backup completed successfully"
        return 0
    else
        log_error "MongoDB backup failed"
        return 1
    fi
}

# Backup Redis data
backup_redis() {
    log "Starting Redis backup..."
    
    if ! command -v redis-cli &> /dev/null; then
        log_error "redis-cli not found. Please install Redis tools."
        return 1
    fi
    
    local redis_host="${REDIS_HOST:-localhost}"
    local redis_port="${REDIS_PORT:-6379}"
    local redis_password="${REDIS_PASSWORD:-cryptopulse_redis_2024}"
    local backup_file="${BACKUP_DIR}/${BACKUP_NAME}/redis_backup.rdb"
    
    # Create Redis backup using BGSAVE
    if redis-cli -h "${redis_host}" -p "${redis_port}" -a "${redis_password}" BGSAVE; then
        # Wait for background save to complete
        while [ "$(redis-cli -h "${redis_host}" -p "${redis_port}" -a "${redis_password}" LASTSAVE)" = "$(redis-cli -h "${redis_host}" -p "${redis_port}" -a "${redis_password}" LASTSAVE)" ]; do
            sleep 1
        done
        
        # Copy RDB file
        if cp "/var/lib/redis/dump.rdb" "${backup_file}" 2>/dev/null; then
            log_success "Redis backup completed successfully"
            return 0
        else
            log_warning "Could not copy Redis RDB file, but backup was created"
            return 0
        fi
    else
        log_error "Redis backup failed"
        return 1
    fi
}

# Backup SSL certificates
backup_ssl_certificates() {
    log "Starting SSL certificates backup..."
    
    local ssl_dir="${SSL_DIR:-./ssl}"
    local letsencrypt_dir="${LETSENCRYPT_DIR:-./letsencrypt}"
    local backup_ssl_dir="${BACKUP_DIR}/${BACKUP_NAME}/ssl"
    
    mkdir -p "${backup_ssl_dir}"
    
    # Backup SSL certificates
    if [ -d "${ssl_dir}" ]; then
        cp -r "${ssl_dir}"/* "${backup_ssl_dir}/" 2>/dev/null || true
        log_success "SSL certificates backed up"
    fi
    
    # Backup Let's Encrypt certificates
    if [ -d "${letsencrypt_dir}" ]; then
        mkdir -p "${backup_ssl_dir}/letsencrypt"
        cp -r "${letsencrypt_dir}"/* "${backup_ssl_dir}/letsencrypt/" 2>/dev/null || true
        log_success "Let's Encrypt certificates backed up"
    fi
}

# Backup configuration files
backup_configuration() {
    log "Starting configuration backup..."
    
    local config_files=(
        "docker-compose.yml"
        "nginx.conf"
        "Dockerfile"
        ".env"
        "env.production.example"
        "backend/package.json"
        "frontend/package.json"
        "package.json"
    )
    
    local backup_config_dir="${BACKUP_DIR}/${BACKUP_NAME}/config"
    mkdir -p "${backup_config_dir}"
    
    for file in "${config_files[@]}"; do
        if [ -f "${file}" ]; then
            cp "${file}" "${backup_config_dir}/"
            log "Backed up: ${file}"
        else
            log_warning "Configuration file not found: ${file}"
        fi
    done
    
    log_success "Configuration backup completed"
}

# Backup application logs
backup_logs() {
    log "Starting logs backup..."
    
    local logs_dir="${BACKUP_DIR}/${BACKUP_NAME}/logs"
    mkdir -p "${logs_dir}"
    
    # Backup Docker container logs
    if command -v docker &> /dev/null; then
        local containers=("cryptopulse-frontend" "cryptopulse-backend" "cryptopulse-nginx" "cryptopulse-mongodb" "cryptopulse-redis")
        
        for container in "${containers[@]}"; do
            if docker ps -q -f name="${container}" | grep -q .; then
                docker logs "${container}" > "${logs_dir}/${container}.log" 2>&1 || true
                log "Backed up logs for: ${container}"
            fi
        done
    fi
    
    # Backup audit logs
    if [ -d "./logs/audit" ]; then
        cp -r "./logs/audit" "${logs_dir}/" 2>/dev/null || true
        log "Backed up audit logs"
    fi
    
    log_success "Logs backup completed"
}

# Create backup archive
create_backup_archive() {
    log "Creating backup archive..."
    
    local archive_file="${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"
    
    if tar -czf "${archive_file}" -C "${BACKUP_DIR}" "${BACKUP_NAME}"; then
        log_success "Backup archive created: ${archive_file}"
        
        # Get archive size
        local size=$(du -h "${archive_file}" | cut -f1)
        log "Backup size: ${size}"
        
        # Clean up temporary directory
        rm -rf "${BACKUP_DIR}/${BACKUP_NAME}"
        
        return 0
    else
        log_error "Failed to create backup archive"
        return 1
    fi
}

# Clean up old backups
cleanup_old_backups() {
    log "Cleaning up old backups (retention: ${RETENTION_DAYS} days)..."
    
    local deleted_count=0
    
    # Find and delete old backup files
    while IFS= read -r -d '' file; do
        rm "${file}"
        log "Deleted old backup: $(basename "${file}")"
        ((deleted_count++))
    done < <(find "${BACKUP_DIR}" -name "cryptopulse_backup_*.tar.gz" -type f -mtime +${RETENTION_DAYS} -print0)
    
    if [ ${deleted_count} -gt 0 ]; then
        log_success "Cleaned up ${deleted_count} old backup(s)"
    else
        log "No old backups to clean up"
    fi
}

# Verify backup integrity
verify_backup() {
    local archive_file="${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"
    
    log "Verifying backup integrity..."
    
    if tar -tzf "${archive_file}" > /dev/null 2>&1; then
        log_success "Backup integrity verified"
        return 0
    else
        log_error "Backup integrity check failed"
        return 1
    fi
}

# Send backup notification
send_notification() {
    local status="$1"
    local message="$2"
    
    # Email notification (if configured)
    if [ -n "${BACKUP_NOTIFICATION_EMAIL:-}" ]; then
        echo "${message}" | mail -s "CryptoPulse Backup ${status}" "${BACKUP_NOTIFICATION_EMAIL}" || true
    fi
    
    # Slack notification (if configured)
    if [ -n "${SLACK_WEBHOOK_URL:-}" ]; then
        local color="good"
        if [ "${status}" = "FAILED" ]; then
            color="danger"
        fi
        
        curl -X POST -H 'Content-type: application/json' \
             --data "{\"text\":\"CryptoPulse Backup ${status}\", \"attachments\":[{\"color\":\"${color}\", \"text\":\"${message}\"}]}" \
             "${SLACK_WEBHOOK_URL}" || true
    fi
}

# Main backup function
main() {
    log "Starting CryptoPulse backup process..."
    
    local start_time=$(date +%s)
    local backup_success=true
    
    # Create backup directory
    create_backup_dir
    
    # Perform backups
    backup_configuration || backup_success=false
    backup_ssl_certificates || backup_success=false
    backup_logs || backup_success=false
    
    # Database backups (optional - may fail in development)
    if [ "${BACKUP_DATABASES:-true}" = "true" ]; then
        backup_mongodb || log_warning "MongoDB backup failed (may not be running)"
        backup_redis || log_warning "Redis backup failed (may not be running)"
    fi
    
    # Create archive if at least some backups succeeded
    if [ "${backup_success}" = true ]; then
        if create_backup_archive && verify_backup; then
            local end_time=$(date +%s)
            local duration=$((end_time - start_time))
            
            log_success "Backup completed successfully in ${duration} seconds"
            send_notification "SUCCESS" "Backup completed successfully in ${duration} seconds"
            
            # Clean up old backups
            cleanup_old_backups
            
            exit 0
        else
            backup_success=false
        fi
    fi
    
    if [ "${backup_success}" = false ]; then
        log_error "Backup process failed"
        send_notification "FAILED" "Backup process failed. Check logs for details."
        exit 1
    fi
}

# Recovery function
recover() {
    local backup_file="$1"
    
    if [ -z "${backup_file}" ]; then
        log_error "Please specify backup file to restore"
        echo "Usage: $0 recover <backup_file.tar.gz>"
        exit 1
    fi
    
    if [ ! -f "${backup_file}" ]; then
        log_error "Backup file not found: ${backup_file}"
        exit 1
    fi
    
    log "Starting recovery from: ${backup_file}"
    
    # Extract backup
    local temp_dir="/tmp/cryptopulse_recovery_$(date +%s)"
    mkdir -p "${temp_dir}"
    
    if tar -xzf "${backup_file}" -C "${temp_dir}"; then
        log_success "Backup extracted successfully"
        
        # Restore configuration
        if [ -d "${temp_dir}/config" ]; then
            cp -r "${temp_dir}/config"/* ./
            log_success "Configuration restored"
        fi
        
        # Restore SSL certificates
        if [ -d "${temp_dir}/ssl" ]; then
            mkdir -p "./ssl"
            cp -r "${temp_dir}/ssl"/* ./ssl/
            log_success "SSL certificates restored"
        fi
        
        # Restore databases (if available)
        if [ -d "${temp_dir}/mongodb_backup" ]; then
            log "MongoDB backup found. To restore, run:"
            echo "mongorestore --host localhost:27017 --db cryptopulse --drop ${temp_dir}/mongodb_backup/cryptopulse"
        fi
        
        if [ -f "${temp_dir}/redis_backup.rdb" ]; then
            log "Redis backup found. To restore, run:"
            echo "cp ${temp_dir}/redis_backup.rdb /var/lib/redis/dump.rdb && sudo systemctl restart redis"
        fi
        
        # Clean up
        rm -rf "${temp_dir}"
        
        log_success "Recovery process completed"
    else
        log_error "Failed to extract backup file"
        exit 1
    fi
}

# List available backups
list_backups() {
    log "Available backups:"
    
    if [ -d "${BACKUP_DIR}" ]; then
        ls -la "${BACKUP_DIR}"/*.tar.gz 2>/dev/null | while read -r line; do
            echo "  ${line}"
        done
    else
        log "No backup directory found"
    fi
}

# Show usage
usage() {
    echo "CryptoPulse Backup and Recovery Script"
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  backup          Create a new backup"
    echo "  recover <file>  Restore from backup file"
    echo "  list           List available backups"
    echo "  help           Show this help message"
    echo ""
    echo "Environment Variables:"
    echo "  BACKUP_DIR              Backup directory (default: ./backups)"
    echo "  BACKUP_RETENTION_DAYS   Days to keep backups (default: 30)"
    echo "  BACKUP_DATABASES        Backup databases (default: true)"
    echo "  MONGO_HOST              MongoDB host (default: localhost)"
    echo "  MONGO_PORT              MongoDB port (default: 27017)"
    echo "  MONGO_DATABASE          MongoDB database name (default: cryptopulse)"
    echo "  MONGO_USERNAME          MongoDB username (default: cryptopulse)"
    echo "  MONGO_PASSWORD          MongoDB password (default: cryptopulse_mongo_2024)"
    echo "  REDIS_HOST              Redis host (default: localhost)"
    echo "  REDIS_PORT              Redis port (default: 6379)"
    echo "  REDIS_PASSWORD          Redis password (default: cryptopulse_redis_2024)"
    echo "  BACKUP_NOTIFICATION_EMAIL  Email for backup notifications"
    echo "  SLACK_WEBHOOK_URL       Slack webhook for notifications"
}

# Main script logic
case "${1:-backup}" in
    "backup")
        main
        ;;
    "recover")
        recover "$2"
        ;;
    "list")
        list_backups
        ;;
    "help"|"-h"|"--help")
        usage
        ;;
    *)
        log_error "Unknown command: ${1}"
        usage
        exit 1
        ;;
esac
