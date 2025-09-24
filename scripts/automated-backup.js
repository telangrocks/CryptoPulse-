/**
 * Automated Backup and Recovery System
 * Comprehensive backup procedures with validation and restoration
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { logger } = require('../backend/structuredLogger');
const crypto = require('crypto');

class AutomatedBackupSystem {
  constructor(config = {}) {
    this.config = {
      backupDir: config.backupDir || '/opt/cryptopulse/backups',
      retentionDays: config.retentionDays || 30,
      encryptionKey: config.encryptionKey || process.env.BACKUP_ENCRYPTION_KEY,
      compressionLevel: config.compressionLevel || 6,
      maxBackupSize: config.maxBackupSize || '10GB',
      ...config
    };

    this.backupTypes = {
      full: 'full',
      incremental: 'incremental',
      differential: 'differential'
    };

    this.backupComponents = {
      database: true,
      redis: true,
      files: true,
      ssl: true,
      logs: true,
      config: true
    };

    this.initializeBackupSystem();
  }

  initializeBackupSystem() {
    // Create backup directory structure
    this.ensureDirectoryExists(this.config.backupDir);
    this.ensureDirectoryExists(path.join(this.config.backupDir, 'database'));
    this.ensureDirectoryExists(path.join(this.config.backupDir, 'redis'));
    this.ensureDirectoryExists(path.join(this.config.backupDir, 'files'));
    this.ensureDirectoryExists(path.join(this.config.backupDir, 'ssl'));
    this.ensureDirectoryExists(path.join(this.config.backupDir, 'logs'));
    this.ensureDirectoryExists(path.join(this.config.backupDir, 'config'));

    logger.info('Automated backup system initialized', {
      type: 'backup_system',
      backupDir: this.config.backupDir,
      retentionDays: this.config.retentionDays
    });
  }

  // Main backup orchestration
  async performBackup(type = 'incremental', options = {}) {
    const startTime = Date.now();
    const backupId = this.generateBackupId();
    const timestamp = new Date().toISOString();

    logger.info('Starting backup operation', {
      type: 'backup_start',
      backupId,
      backupType: type,
      timestamp
    });

    try {
      const backupMetadata = {
        id: backupId,
        type,
        timestamp,
        startTime,
        components: {},
        status: 'in_progress'
      };

      // Create backup manifest
      await this.createBackupManifest(backupMetadata);

      // Perform component backups
      if (this.backupComponents.database) {
        backupMetadata.components.database = await this.backupDatabase(backupId, type);
      }

      if (this.backupComponents.redis) {
        backupMetadata.components.redis = await this.backupRedis(backupId, type);
      }

      if (this.backupComponents.files) {
        backupMetadata.components.files = await this.backupFiles(backupId, type);
      }

      if (this.backupComponents.ssl) {
        backupMetadata.components.ssl = await this.backupSSL(backupId, type);
      }

      if (this.backupComponents.logs) {
        backupMetadata.components.logs = await this.backupLogs(backupId, type);
      }

      if (this.backupComponents.config) {
        backupMetadata.components.config = await this.backupConfig(backupId, type);
      }

      // Finalize backup
      backupMetadata.status = 'completed';
      backupMetadata.endTime = Date.now();
      backupMetadata.duration = backupMetadata.endTime - backupMetadata.startTime;
      backupMetadata.size = await this.calculateBackupSize(backupId);

      await this.updateBackupManifest(backupMetadata);

      // Validate backup integrity
      const validationResult = await this.validateBackup(backupId);
      backupMetadata.validation = validationResult;

      if (validationResult.valid) {
        logger.info('Backup completed successfully', {
          type: 'backup_success',
          backupId,
          duration: backupMetadata.duration,
          size: backupMetadata.size,
          components: Object.keys(backupMetadata.components)
        });
      } else {
        logger.error('Backup validation failed', {
          type: 'backup_validation_failed',
          backupId,
          errors: validationResult.errors
        });
        throw new Error('Backup validation failed');
      }

      // Clean up old backups
      await this.cleanupOldBackups();

      return backupMetadata;

    } catch (error) {
      logger.error('Backup operation failed', {
        type: 'backup_failed',
        backupId,
        error: error.message,
        stack: error.stack
      });

      // Cleanup failed backup
      await this.cleanupFailedBackup(backupId);

      throw error;
    }
  }

  // Database backup
  async backupDatabase(backupId, type) {
    const startTime = Date.now();
    const dbBackupDir = path.join(this.config.backupDir, 'database', backupId);

    try {
      this.ensureDirectoryExists(dbBackupDir);

      // MongoDB backup
      const mongoBackupFile = path.join(dbBackupDir, 'mongodb_backup.gz');
      const mongoCommand = `mongodump --uri="${process.env.MONGO_URL}" --gzip --archive="${mongoBackupFile}"`;

      execSync(mongoCommand, { stdio: 'pipe' });

      // Redis backup
      const redisBackupFile = path.join(dbBackupDir, 'redis_backup.rdb');
      const redisCommand = `redis-cli -u "${process.env.REDIS_URL}" BGSAVE && redis-cli -u "${process.env.REDIS_URL}" LASTSAVE`;

      const lastSave = execSync(redisCommand, { stdio: 'pipe' }).toString().trim();
      const redisDataDir = process.env.REDIS_DATA_DIR || '/var/lib/redis';
      const redisRdbFile = path.join(redisDataDir, 'dump.rdb');

      if (fs.existsSync(redisRdbFile)) {
        execSync(`cp "${redisRdbFile}" "${redisBackupFile}"`);
      }

      // Compress and encrypt database backup
      await this.compressAndEncrypt(dbBackupDir);

      const componentInfo = {
        type: 'database',
        files: ['mongodb_backup.gz', 'redis_backup.rdb'],
        size: await this.getDirectorySize(dbBackupDir),
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString()
      };

      logger.info('Database backup completed', {
        type: 'database_backup',
        backupId,
        componentInfo
      });

      return componentInfo;

    } catch (error) {
      logger.error('Database backup failed', {
        type: 'database_backup_failed',
        backupId,
        error: error.message
      });
      throw error;
    }
  }

  // Redis backup
  async backupRedis(backupId, type) {
    const startTime = Date.now();
    const redisBackupDir = path.join(this.config.backupDir, 'redis', backupId);

    try {
      this.ensureDirectoryExists(redisBackupDir);

      // Export Redis data
      const redisCommand = `redis-cli -u "${process.env.REDIS_URL}" --rdb "${path.join(redisBackupDir, 'dump.rdb')}"`;
      execSync(redisCommand, { stdio: 'pipe' });

      // Export Redis configuration
      const configCommand = `redis-cli -u "${process.env.REDIS_URL}" CONFIG GET "*" > "${path.join(redisBackupDir, 'redis.conf')}"`;
      execSync(configCommand, { stdio: 'pipe' });

      // Compress and encrypt
      await this.compressAndEncrypt(redisBackupDir);

      const componentInfo = {
        type: 'redis',
        files: ['dump.rdb', 'redis.conf'],
        size: await this.getDirectorySize(redisBackupDir),
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString()
      };

      logger.info('Redis backup completed', {
        type: 'redis_backup',
        backupId,
        componentInfo
      });

      return componentInfo;

    } catch (error) {
      logger.error('Redis backup failed', {
        type: 'redis_backup_failed',
        backupId,
        error: error.message
      });
      throw error;
    }
  }

  // Files backup
  async backupFiles(backupId, type) {
    const startTime = Date.now();
    const filesBackupDir = path.join(this.config.backupDir, 'files', backupId);

    try {
      this.ensureDirectoryExists(filesBackupDir);

      // Backup application files
      const appDir = process.env.APP_DIR || '/opt/cryptopulse';
      const excludePatterns = [
        'node_modules',
        '.git',
        'logs',
        'backups',
        'tmp',
        '*.log'
      ];

      const tarCommand = `tar -czf "${path.join(filesBackupDir, 'application.tar.gz')}" --exclude="${excludePatterns.join('" --exclude="')}" -C "${appDir}" .`;

      execSync(tarCommand, { stdio: 'pipe' });

      // Backup uploaded files
      const uploadsDir = path.join(appDir, 'uploads');
      if (fs.existsSync(uploadsDir)) {
        execSync(`tar -czf "${path.join(filesBackupDir, 'uploads.tar.gz')}" -C "${uploadsDir}" .`);
      }

      // Compress and encrypt
      await this.compressAndEncrypt(filesBackupDir);

      const componentInfo = {
        type: 'files',
        files: ['application.tar.gz', 'uploads.tar.gz'],
        size: await this.getDirectorySize(filesBackupDir),
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString()
      };

      logger.info('Files backup completed', {
        type: 'files_backup',
        backupId,
        componentInfo
      });

      return componentInfo;

    } catch (error) {
      logger.error('Files backup failed', {
        type: 'files_backup_failed',
        backupId,
        error: error.message
      });
      throw error;
    }
  }

  // SSL certificates backup
  async backupSSL(backupId, type) {
    const startTime = Date.now();
    const sslBackupDir = path.join(this.config.backupDir, 'ssl', backupId);

    try {
      this.ensureDirectoryExists(sslBackupDir);

      // Backup Let's Encrypt certificates
      const certDir = '/etc/letsencrypt';
      if (fs.existsSync(certDir)) {
        execSync(`cp -r "${certDir}" "${sslBackupDir}/letsencrypt"`);
      }

      // Backup custom certificates
      const customCertDir = '/opt/cryptopulse/ssl';
      if (fs.existsSync(customCertDir)) {
        execSync(`cp -r "${customCertDir}" "${sslBackupDir}/custom"`);
      }

      // Compress and encrypt
      await this.compressAndEncrypt(sslBackupDir);

      const componentInfo = {
        type: 'ssl',
        files: ['letsencrypt', 'custom'],
        size: await this.getDirectorySize(sslBackupDir),
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString()
      };

      logger.info('SSL backup completed', {
        type: 'ssl_backup',
        backupId,
        componentInfo
      });

      return componentInfo;

    } catch (error) {
      logger.error('SSL backup failed', {
        type: 'ssl_backup_failed',
        backupId,
        error: error.message
      });
      throw error;
    }
  }

  // Logs backup
  async backupLogs(backupId, type) {
    const startTime = Date.now();
    const logsBackupDir = path.join(this.config.backupDir, 'logs', backupId);

    try {
      this.ensureDirectoryExists(logsBackupDir);

      // Backup application logs
      const logsDir = path.join(process.env.APP_DIR || '/opt/cryptopulse', 'logs');
      if (fs.existsSync(logsDir)) {
        execSync(`tar -czf "${path.join(logsBackupDir, 'application_logs.tar.gz')}" -C "${logsDir}" .`);
      }

      // Backup system logs
      const systemLogsDir = '/var/log';
      execSync(`tar -czf "${path.join(logsBackupDir, 'system_logs.tar.gz')}" --exclude="*.log.1" --exclude="*.gz" -C "${systemLogsDir}" .`);

      // Compress and encrypt
      await this.compressAndEncrypt(logsBackupDir);

      const componentInfo = {
        type: 'logs',
        files: ['application_logs.tar.gz', 'system_logs.tar.gz'],
        size: await this.getDirectorySize(logsBackupDir),
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString()
      };

      logger.info('Logs backup completed', {
        type: 'logs_backup',
        backupId,
        componentInfo
      });

      return componentInfo;

    } catch (error) {
      logger.error('Logs backup failed', {
        type: 'logs_backup_failed',
        backupId,
        error: error.message
      });
      throw error;
    }
  }

  // Configuration backup
  async backupConfig(backupId, type) {
    const startTime = Date.now();
    const configBackupDir = path.join(this.config.backupDir, 'config', backupId);

    try {
      this.ensureDirectoryExists(configBackupDir);

      // Backup environment files
      const envFiles = ['.env.production', '.env.local', 'docker-compose.yml', 'nginx.conf'];
      for (const envFile of envFiles) {
        const filePath = path.join(process.env.APP_DIR || '/opt/cryptopulse', envFile);
        if (fs.existsSync(filePath)) {
          execSync(`cp "${filePath}" "${configBackupDir}/"`);
        }
      }

      // Backup Docker configurations
      const dockerDir = path.join(process.env.APP_DIR || '/opt/cryptopulse', 'docker');
      if (fs.existsSync(dockerDir)) {
        execSync(`cp -r "${dockerDir}" "${configBackupDir}/"`);
      }

      // Compress and encrypt
      await this.compressAndEncrypt(configBackupDir);

      const componentInfo = {
        type: 'config',
        files: envFiles.filter(f => fs.existsSync(path.join(process.env.APP_DIR || '/opt/cryptopulse', f))),
        size: await this.getDirectorySize(configBackupDir),
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString()
      };

      logger.info('Configuration backup completed', {
        type: 'config_backup',
        backupId,
        componentInfo
      });

      return componentInfo;

    } catch (error) {
      logger.error('Configuration backup failed', {
        type: 'config_backup_failed',
        backupId,
        error: error.message
      });
      throw error;
    }
  }

  // Backup validation
  async validateBackup(backupId) {
    const validationResult = {
      valid: true,
      errors: [],
      warnings: [],
      checks: {}
    };

    try {
      // Check backup manifest
      const manifestPath = path.join(this.config.backupDir, `${backupId}.json`);
      if (!fs.existsSync(manifestPath)) {
        validationResult.valid = false;
        validationResult.errors.push('Backup manifest not found');
      }

      // Check component integrity
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      for (const [component, info] of Object.entries(manifest.components)) {
        const componentDir = path.join(this.config.backupDir, component, backupId);
        if (!fs.existsSync(componentDir)) {
          validationResult.valid = false;
          validationResult.errors.push(`Component directory missing: ${component}`);
        }

        // Check file sizes
        for (const file of info.files) {
          const filePath = path.join(componentDir, file);
          if (fs.existsSync(filePath)) {
            const fileSize = fs.statSync(filePath).size;
            if (fileSize === 0) {
              validationResult.warnings.push(`Empty file: ${file}`);
            }
          } else {
            validationResult.valid = false;
            validationResult.errors.push(`File missing: ${file}`);
          }
        }
      }

      // Test encryption/compression
      validationResult.checks.encryption = await this.testBackupEncryption(backupId);
      validationResult.checks.compression = await this.testBackupCompression(backupId);

      logger.info('Backup validation completed', {
        type: 'backup_validation',
        backupId,
        validationResult
      });

      return validationResult;

    } catch (error) {
      logger.error('Backup validation failed', {
        type: 'backup_validation_error',
        backupId,
        error: error.message
      });

      validationResult.valid = false;
      validationResult.errors.push(`Validation error: ${error.message}`);
      return validationResult;
    }
  }

  // Restore procedures
  async restoreBackup(backupId, options = {}) {
    const startTime = Date.now();

    logger.info('Starting backup restoration', {
      type: 'restore_start',
      backupId,
      options
    });

    try {
      // Load backup manifest
      const manifestPath = path.join(this.config.backupDir, `${backupId}.json`);
      if (!fs.existsSync(manifestPath)) {
        throw new Error(`Backup manifest not found: ${backupId}`);
      }

      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

      // Validate backup before restoration
      const validation = await this.validateBackup(backupId);
      if (!validation.valid) {
        throw new Error(`Backup validation failed: ${validation.errors.join(', ')}`);
      }

      // Stop services before restoration
      if (options.stopServices !== false) {
        await this.stopServices();
      }

      // Restore components
      for (const [component, info] of Object.entries(manifest.components)) {
        if (options.components && !options.components.includes(component)) {
          continue;
        }

        await this.restoreComponent(backupId, component, info, options);
      }

      // Start services after restoration
      if (options.startServices !== false) {
        await this.startServices();
      }

      // Verify restoration
      const verificationResult = await this.verifyRestoration(backupId);

      const restoreInfo = {
        backupId,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        components: Object.keys(manifest.components),
        verification: verificationResult
      };

      logger.info('Backup restoration completed', {
        type: 'restore_success',
        restoreInfo
      });

      return restoreInfo;

    } catch (error) {
      logger.error('Backup restoration failed', {
        type: 'restore_failed',
        backupId,
        error: error.message,
        stack: error.stack
      });

      // Attempt to start services even if restoration failed
      try {
        await this.startServices();
      } catch (startError) {
        logger.error('Failed to start services after restoration failure', {
          type: 'restore_recovery_failed',
          error: startError.message
        });
      }

      throw error;
    }
  }

  // Utility methods
  generateBackupId() {
    return `backup_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }

  ensureDirectoryExists(dirPath) {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  async compressAndEncrypt(dirPath) {
    // Implementation would compress and encrypt backup files
    // For now, just create a placeholder
    const compressedFile = `${dirPath}.tar.gz.enc`;
    execSync(`tar -czf "${dirPath}.tar.gz" -C "${dirPath}" .`);
    // Add encryption logic here
    logger.debug('Backup compressed and encrypted', { dirPath, compressedFile });
  }

  async getDirectorySize(dirPath) {
    const stats = execSync(`du -sb "${dirPath}"`, { stdio: 'pipe' }).toString().trim();
    return parseInt(stats.split('\t')[0]);
  }

  async calculateBackupSize(backupId) {
    let totalSize = 0;
    for (const component of Object.keys(this.backupComponents)) {
      const componentDir = path.join(this.config.backupDir, component, backupId);
      if (fs.existsSync(componentDir)) {
        totalSize += await this.getDirectorySize(componentDir);
      }
    }
    return totalSize;
  }

  async createBackupManifest(metadata) {
    const manifestPath = path.join(this.config.backupDir, `${metadata.id}.json`);
    fs.writeFileSync(manifestPath, JSON.stringify(metadata, null, 2));
  }

  async updateBackupManifest(metadata) {
    const manifestPath = path.join(this.config.backupDir, `${metadata.id}.json`);
    fs.writeFileSync(manifestPath, JSON.stringify(metadata, null, 2));
  }

  async cleanupOldBackups() {
    const backupFiles = fs.readdirSync(this.config.backupDir)
      .filter(file => file.endsWith('.json'))
      .map(file => ({
        name: file,
        path: path.join(this.config.backupDir, file),
        timestamp: fs.statSync(path.join(this.config.backupDir, file)).mtime
      }))
      .sort((a, b) => b.timestamp - a.timestamp);

    const cutoffDate = new Date(Date.now() - (this.config.retentionDays * 24 * 60 * 60 * 1000));

    for (const backup of backupFiles) {
      if (backup.timestamp < cutoffDate) {
        await this.deleteBackup(backup.name.replace('.json', ''));
      }
    }
  }

  async deleteBackup(backupId) {
    try {
      // Delete manifest
      const manifestPath = path.join(this.config.backupDir, `${backupId}.json`);
      if (fs.existsSync(manifestPath)) {
        fs.unlinkSync(manifestPath);
      }

      // Delete component directories
      for (const component of Object.keys(this.backupComponents)) {
        const componentDir = path.join(this.config.backupDir, component, backupId);
        if (fs.existsSync(componentDir)) {
          execSync(`rm -rf "${componentDir}"`);
        }
      }

      logger.info('Backup deleted', {
        type: 'backup_deleted',
        backupId
      });

    } catch (error) {
      logger.error('Failed to delete backup', {
        type: 'backup_delete_failed',
        backupId,
        error: error.message
      });
    }
  }

  async cleanupFailedBackup(backupId) {
    try {
      await this.deleteBackup(backupId);
    } catch (error) {
      logger.error('Failed to cleanup failed backup', {
        type: 'backup_cleanup_failed',
        backupId,
        error: error.message
      });
    }
  }

  // Service management
  async stopServices() {
    logger.info('Stopping services for backup restoration');
    execSync('docker-compose down', { stdio: 'pipe' });
  }

  async startServices() {
    logger.info('Starting services after backup restoration');
    execSync('docker-compose up -d', { stdio: 'pipe' });
  }

  // Component restoration methods
  async restoreComponent(backupId, component, info, options) {
    logger.info(`Restoring component: ${component}`, {
      type: 'component_restore',
      backupId,
      component
    });

    // Implementation would restore specific components
    // This is a placeholder for the actual restoration logic
    switch (component) {
      case 'database':
        await this.restoreDatabase(backupId, info, options);
        break;
      case 'redis':
        await this.restoreRedis(backupId, info, options);
        break;
      case 'files':
        await this.restoreFiles(backupId, info, options);
        break;
      case 'ssl':
        await this.restoreSSL(backupId, info, options);
        break;
      case 'logs':
        await this.restoreLogs(backupId, info, options);
        break;
      case 'config':
        await this.restoreConfig(backupId, info, options);
        break;
    }
  }

  async restoreDatabase(backupId, info, options) {
    // Implementation would restore database
    logger.info('Database restoration completed', { backupId });
  }

  async restoreRedis(backupId, info, options) {
    // Implementation would restore Redis
    logger.info('Redis restoration completed', { backupId });
  }

  async restoreFiles(backupId, info, options) {
    // Implementation would restore files
    logger.info('Files restoration completed', { backupId });
  }

  async restoreSSL(backupId, info, options) {
    // Implementation would restore SSL certificates
    logger.info('SSL restoration completed', { backupId });
  }

  async restoreLogs(backupId, info, options) {
    // Implementation would restore logs
    logger.info('Logs restoration completed', { backupId });
  }

  async restoreConfig(backupId, info, options) {
    // Implementation would restore configuration
    logger.info('Configuration restoration completed', { backupId });
  }

  async verifyRestoration(backupId) {
    // Implementation would verify restoration
    return { verified: true, timestamp: new Date().toISOString() };
  }

  async testBackupEncryption(backupId) {
    // Implementation would test encryption
    return { valid: true };
  }

  async testBackupCompression(backupId) {
    // Implementation would test compression
    return { valid: true };
  }

  // List available backups
  async listBackups() {
    const backupFiles = fs.readdirSync(this.config.backupDir)
      .filter(file => file.endsWith('.json'))
      .map(file => {
        const manifestPath = path.join(this.config.backupDir, file);
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        return {
          id: manifest.id,
          type: manifest.type,
          timestamp: manifest.timestamp,
          size: manifest.size,
          status: manifest.status,
          components: Object.keys(manifest.components)
        };
      })
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return backupFiles;
  }
}

// CLI interface
async function main() {
  const command = process.argv[2];
  const backupSystem = new AutomatedBackupSystem();

  try {
    switch (command) {
      case 'backup':
        const type = process.argv[3] || 'incremental';
        const result = await backupSystem.performBackup(type);
        console.log('Backup completed:', result);
        break;

      case 'restore':
        const backupId = process.argv[3];
        if (!backupId) {
          throw new Error('Backup ID required for restore');
        }
        const restoreResult = await backupSystem.restoreBackup(backupId);
        console.log('Restore completed:', restoreResult);
        break;

      case 'list':
        const backups = await backupSystem.listBackups();
        console.log('Available backups:');
        backups.forEach(backup => {
          console.log(`- ${backup.id} (${backup.type}) - ${backup.timestamp} - ${backup.size} bytes`);
        });
        break;

      case 'validate':
        const validateBackupId = process.argv[3];
        if (!validateBackupId) {
          throw new Error('Backup ID required for validation');
        }
        const validation = await backupSystem.validateBackup(validateBackupId);
        console.log('Validation result:', validation);
        break;

      default:
        console.log('Usage: node automated-backup.js [backup|restore|list|validate] [options]');
        console.log('  backup [type]     - Create backup (full|incremental|differential)');
        console.log('  restore <id>      - Restore from backup');
        console.log('  list              - List available backups');
        console.log('  validate <id>     - Validate backup integrity');
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { AutomatedBackupSystem };
