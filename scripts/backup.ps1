# CryptoPulse Backup and Recovery Script (PowerShell)
# Comprehensive backup solution for production deployment

param(
    [Parameter(Position=0)]
    [string]$Command = "backup",
    [Parameter(Position=1)]
    [string]$BackupFile = ""
)

# Configuration
$BackupDir = if ($env:BACKUP_DIR) { $env:BACKUP_DIR } else { "./backups" }
$Date = Get-Date -Format "yyyyMMdd_HHmmss"
$BackupName = "cryptopulse_backup_$Date"
$RetentionDays = if ($env:BACKUP_RETENTION_DAYS) { [int]$env:BACKUP_RETENTION_DAYS } else { 30 }

# Colors for output
$Red = "Red"
$Green = "Green"
$Yellow = "Yellow"
$Blue = "Blue"

# Logging functions
function Log {
    param([string]$Message)
    Write-Host "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $Message" -ForegroundColor $Blue
}

function Log-Success {
    param([string]$Message)
    Write-Host "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] ✅ $Message" -ForegroundColor $Green
}

function Log-Warning {
    param([string]$Message)
    Write-Host "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] ⚠️ $Message" -ForegroundColor $Yellow
}

function Log-Error {
    param([string]$Message)
    Write-Host "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] ❌ $Message" -ForegroundColor $Red
}

# Create backup directory
function New-BackupDirectory {
    Log "Creating backup directory: $BackupDir\$BackupName"
    New-Item -ItemType Directory -Path "$BackupDir\$BackupName" -Force | Out-Null
}

# Backup configuration files
function Backup-Configuration {
    Log "Starting configuration backup..."
    
    $configFiles = @(
        "docker-compose.yml",
        "nginx.conf",
        "Dockerfile",
        ".env",
        "env.production.example",
        "backend/package.json",
        "frontend/package.json",
        "package.json"
    )
    
    $backupConfigDir = "$BackupDir\$BackupName\config"
    New-Item -ItemType Directory -Path $backupConfigDir -Force | Out-Null
    
    foreach ($file in $configFiles) {
        if (Test-Path $file) {
            Copy-Item $file $backupConfigDir
            Log "Backed up: $file"
        } else {
            Log-Warning "Configuration file not found: $file"
        }
    }
    
    Log-Success "Configuration backup completed"
}

# Backup SSL certificates
function Backup-SSLCertificates {
    Log "Starting SSL certificates backup..."
    
    $sslDir = if ($env:SSL_DIR) { $env:SSL_DIR } else { "./ssl" }
    $letsencryptDir = if ($env:LETSENCRYPT_DIR) { $env:LETSENCRYPT_DIR } else { "./letsencrypt" }
    $backupSslDir = "$BackupDir\$BackupName\ssl"
    
    New-Item -ItemType Directory -Path $backupSslDir -Force | Out-Null
    
    # Backup SSL certificates
    if (Test-Path $sslDir) {
        Copy-Item "$sslDir\*" $backupSslDir -Recurse -Force -ErrorAction SilentlyContinue
        Log-Success "SSL certificates backed up"
    }
    
    # Backup Let's Encrypt certificates
    if (Test-Path $letsencryptDir) {
        $letsencryptBackupDir = "$backupSslDir\letsencrypt"
        New-Item -ItemType Directory -Path $letsencryptBackupDir -Force | Out-Null
        Copy-Item "$letsencryptDir\*" $letsencryptBackupDir -Recurse -Force -ErrorAction SilentlyContinue
        Log-Success "Let's Encrypt certificates backed up"
    }
}

# Backup application logs
function Backup-Logs {
    Log "Starting logs backup..."
    
    $logsDir = "$BackupDir\$BackupName\logs"
    New-Item -ItemType Directory -Path $logsDir -Force | Out-Null
    
    # Backup Docker container logs (if Docker is available)
    if (Get-Command docker -ErrorAction SilentlyContinue) {
        $containers = @("cryptopulse-frontend", "cryptopulse-backend", "cryptopulse-nginx", "cryptopulse-mongodb", "cryptopulse-redis")
        
        foreach ($container in $containers) {
            try {
                $containerExists = docker ps -q -f "name=$container" | Measure-Object | Select-Object -ExpandProperty Count
                if ($containerExists -gt 0) {
                    docker logs $container > "$logsDir\$container.log" 2>&1
                    Log "Backed up logs for: $container"
                }
            } catch {
                Log-Warning "Could not backup logs for: $container"
            }
        }
    }
    
    # Backup audit logs
    if (Test-Path "./logs/audit") {
        Copy-Item "./logs/audit" $logsDir -Recurse -Force -ErrorAction SilentlyContinue
        Log "Backed up audit logs"
    }
    
    Log-Success "Logs backup completed"
}

# Create backup archive
function New-BackupArchive {
    Log "Creating backup archive..."
    
    $archiveFile = "$BackupDir\$BackupName.zip"
    
    try {
        Compress-Archive -Path "$BackupDir\$BackupName\*" -DestinationPath $archiveFile -Force
        Log-Success "Backup archive created: $archiveFile"
        
        # Get archive size
        $size = (Get-Item $archiveFile).Length
        $sizeMB = [math]::Round($size / 1MB, 2)
        Log "Backup size: $sizeMB MB"
        
        # Clean up temporary directory
        Remove-Item "$BackupDir\$BackupName" -Recurse -Force
        
        return $true
    } catch {
        Log-Error "Failed to create backup archive: $($_.Exception.Message)"
        return $false
    }
}

# Clean up old backups
function Remove-OldBackups {
    Log "Cleaning up old backups (retention: $RetentionDays days)..."
    
    $cutoffDate = (Get-Date).AddDays(-$RetentionDays)
    $oldBackups = Get-ChildItem "$BackupDir\cryptopulse_backup_*.zip" | Where-Object { $_.LastWriteTime -lt $cutoffDate }
    
    $deletedCount = 0
    foreach ($backup in $oldBackups) {
        Remove-Item $backup.FullName -Force
        Log "Deleted old backup: $($backup.Name)"
        $deletedCount++
    }
    
    if ($deletedCount -gt 0) {
        Log-Success "Cleaned up $deletedCount old backup(s)"
    } else {
        Log "No old backups to clean up"
    }
}

# Verify backup integrity
function Test-BackupIntegrity {
    param([string]$ArchiveFile)
    
    Log "Verifying backup integrity..."
    
    try {
        # Try to open the archive
        $archive = [System.IO.Compression.ZipFile]::OpenRead($ArchiveFile)
        $archive.Dispose()
        Log-Success "Backup integrity verified"
        return $true
    } catch {
        Log-Error "Backup integrity check failed: $($_.Exception.Message)"
        return $false
    }
}

# Send backup notification
function Send-Notification {
    param(
        [string]$Status,
        [string]$Message
    )
    
    # Email notification (if configured)
    if ($env:BACKUP_NOTIFICATION_EMAIL) {
        try {
            Send-MailMessage -To $env:BACKUP_NOTIFICATION_EMAIL -Subject "CryptoPulse Backup $Status" -Body $Message -SmtpServer "localhost"
        } catch {
            Log-Warning "Failed to send email notification"
        }
    }
    
    # Slack notification (if configured)
    if ($env:SLACK_WEBHOOK_URL) {
        try {
            $color = if ($Status -eq "FAILED") { "danger" } else { "good" }
            $body = @{
                text = "CryptoPulse Backup $Status"
                attachments = @(@{
                    color = $color
                    text = $Message
                })
            } | ConvertTo-Json -Depth 3
            
            Invoke-RestMethod -Uri $env:SLACK_WEBHOOK_URL -Method Post -Body $body -ContentType "application/json"
        } catch {
            Log-Warning "Failed to send Slack notification"
        }
    }
}

# Main backup function
function Start-Backup {
    Log "Starting CryptoPulse backup process..."
    
    $startTime = Get-Date
    $backupSuccess = $true
    
    # Create backup directory
    New-BackupDirectory
    
    # Perform backups
    try {
        Backup-Configuration
    } catch {
        Log-Warning "Configuration backup failed: $($_.Exception.Message)"
        $backupSuccess = $false
    }
    
    try {
        Backup-SSLCertificates
    } catch {
        Log-Warning "SSL certificates backup failed: $($_.Exception.Message)"
        $backupSuccess = $false
    }
    
    try {
        Backup-Logs
    } catch {
        Log-Warning "Logs backup failed: $($_.Exception.Message)"
        $backupSuccess = $false
    }
    
    # Create archive if at least some backups succeeded
    if ($backupSuccess) {
        $archiveFile = "$BackupDir\$BackupName.zip"
        if (New-BackupArchive -and (Test-BackupIntegrity -ArchiveFile $archiveFile)) {
            $endTime = Get-Date
            $duration = ($endTime - $startTime).TotalSeconds
            
            Log-Success "Backup completed successfully in $([math]::Round($duration, 2)) seconds"
            Send-Notification -Status "SUCCESS" -Message "Backup completed successfully in $([math]::Round($duration, 2)) seconds"
            
            # Clean up old backups
            Remove-OldBackups
            
            return $true
        } else {
            $backupSuccess = $false
        }
    }
    
    if (-not $backupSuccess) {
        Log-Error "Backup process failed"
        Send-Notification -Status "FAILED" -Message "Backup process failed. Check logs for details."
        return $false
    }
}

# Recovery function
function Start-Recovery {
    param([string]$BackupFile)
    
    if (-not $BackupFile) {
        Log-Error "Please specify backup file to restore"
        Write-Host "Usage: .\backup.ps1 recover <backup_file.zip>"
        return $false
    }
    
    if (-not (Test-Path $BackupFile)) {
        Log-Error "Backup file not found: $BackupFile"
        return $false
    }
    
    Log "Starting recovery from: $BackupFile"
    
    # Extract backup
    $tempDir = "C:\temp\cryptopulse_recovery_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
    New-Item -ItemType Directory -Path $tempDir -Force | Out-Null
    
    try {
        Expand-Archive -Path $BackupFile -DestinationPath $tempDir -Force
        Log-Success "Backup extracted successfully"
        
        # Restore configuration
        if (Test-Path "$tempDir\config") {
            Copy-Item "$tempDir\config\*" . -Recurse -Force
            Log-Success "Configuration restored"
        }
        
        # Restore SSL certificates
        if (Test-Path "$tempDir\ssl") {
            New-Item -ItemType Directory -Path "./ssl" -Force | Out-Null
            Copy-Item "$tempDir\ssl\*" "./ssl/" -Recurse -Force
            Log-Success "SSL certificates restored"
        }
        
        # Clean up
        Remove-Item $tempDir -Recurse -Force
        
        Log-Success "Recovery process completed"
        return $true
    } catch {
        Log-Error "Failed to extract backup file: $($_.Exception.Message)"
        return $false
    }
}

# List available backups
function Get-Backups {
    Log "Available backups:"
    
    if (Test-Path $BackupDir) {
        $backups = Get-ChildItem "$BackupDir\cryptopulse_backup_*.zip" | Sort-Object LastWriteTime -Descending
        if ($backups) {
            foreach ($backup in $backups) {
                $size = [math]::Round($backup.Length / 1MB, 2)
                Write-Host "  $($backup.Name) ($size MB) - $($backup.LastWriteTime)"
            }
        } else {
            Log "No backups found"
        }
    } else {
        Log "No backup directory found"
    }
}

# Show usage
function Show-Usage {
    Write-Host "CryptoPulse Backup and Recovery Script (PowerShell)"
    Write-Host ""
    Write-Host "Usage: .\backup.ps1 [COMMAND] [PARAMETERS]"
    Write-Host ""
    Write-Host "Commands:"
    Write-Host "  backup          Create a new backup"
    Write-Host "  recover <file>  Restore from backup file"
    Write-Host "  list           List available backups"
    Write-Host "  help           Show this help message"
    Write-Host ""
    Write-Host "Environment Variables:"
    Write-Host "  BACKUP_DIR              Backup directory (default: ./backups)"
    Write-Host "  BACKUP_RETENTION_DAYS   Days to keep backups (default: 30)"
    Write-Host "  SSL_DIR                 SSL certificates directory (default: ./ssl)"
    Write-Host "  LETSENCRYPT_DIR         Let's Encrypt directory (default: ./letsencrypt)"
    Write-Host "  BACKUP_NOTIFICATION_EMAIL  Email for backup notifications"
    Write-Host "  SLACK_WEBHOOK_URL       Slack webhook for notifications"
}

# Main script logic
switch ($Command.ToLower()) {
    "backup" {
        $success = Start-Backup
        exit if ($success) { 0 } else { 1 }
    }
    "recover" {
        $success = Start-Recovery -BackupFile $BackupFile
        exit if ($success) { 0 } else { 1 }
    }
    "list" {
        Get-Backups
        exit 0
    }
    "help" {
        Show-Usage
        exit 0
    }
    default {
        Log-Error "Unknown command: $Command"
        Show-Usage
        exit 1
    }
}
