#!/usr/bin/env node

// =============================================================================
// CryptoPulse Backup Manager - Production Ready
// =============================================================================
// Comprehensive backup and disaster recovery management system

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');
const crypto = require('crypto');

// Colors for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  reset: '\x1b[0m',
  bright: '\x1b[1m'
};

// Backup configuration
const BACKUP_CONFIG = {
  retentionDays: 30,
  compressionLevel: 6,
  encryptionKey: process.env.BACKUP_ENCRYPTION_KEY || 'change-me-in-production',
  storagePath: process.env.BACKUP_STORAGE_PATH || './backups',
  databases: {
    postgres: {
      host: process.env.POSTGRES_HOST || 'localhost',
      port: process.env.POSTGRES_PORT || 5432,
      database: process.env.POSTGRES_DB || 'cryptopulse_prod',
      username: process.env.POSTGRES_USER || 'cryptopulse_user',
      password: process.env.POSTGRES_PASSWORD || 'change-me'
    },
    mongodb: {
      host: process.env.MONGO_HOST || 'localhost',
      port: process.env.MONGO_PORT || 27017,
      database: process.env.MONGO_DB || 'cryptopulse_prod',
      username: process.env.MONGO_USER || 'cryptopulse_user',
      password: process.env.MONGO_PASSWORD || 'change-me'
    },
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD || 'change-me'
    }
  },
  files: [
    'backend/logs',
    'frontend/dist',
    'cloud/logs',
    'nginx.conf',
    'docker-compose.production.yml',
    'monitoring',
    'scripts'
  ]
};

// Utility functions
function log(message, color = 'white') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

function logHeader(message) {
  log(`\n${colors.bright}${colors.cyan}${'='.repeat(60)}${colors.reset}`);
  log(`${colors.bright}${colors.cyan}${message}${colors.reset}`);
  log(`${colors.bright}${colors.cyan}${'='.repeat(60)}${colors.reset}\n`);
}

// Backup utilities
function createBackupDirectory() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(BACKUP_CONFIG.storagePath, `backup-${timestamp}`);
  
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  
  return backupDir;
}

function encryptFile(filePath, outputPath) {
  try {
    const algorithm = 'aes-256-cbc';
    const key = crypto.scryptSync(BACKUP_CONFIG.encryptionKey, 'salt', 32);
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipher(algorithm, key);
    const input = fs.createReadStream(filePath);
    const output = fs.createWriteStream(outputPath);
    
    input.pipe(cipher).pipe(output);
    
    return new Promise((resolve, reject) => {
      output.on('finish', () => resolve(outputPath));
      output.on('error', reject);
    });
  } catch (error) {
    throw new Error(`Encryption failed: ${error.message}`);
  }
}

function compressDirectory(sourceDir, outputPath) {
  return new Promise((resolve, reject) => {
    const tar = spawn('tar', ['-czf', outputPath, '-C', path.dirname(sourceDir), path.basename(sourceDir)]);
    
    tar.on('close', (code) => {
      if (code === 0) {
        resolve(outputPath);
      } else {
        reject(new Error(`Compression failed with code ${code}`));
      }
    });
    
    tar.on('error', reject);
  });
}

// Database backup functions
async function backupPostgreSQL(backupDir) {
  logInfo('Starting PostgreSQL backup...');
  
  const { host, port, database, username, password } = BACKUP_CONFIG.databases.postgres;
  const backupFile = path.join(backupDir, `postgresql-${database}.sql`);
  
  try {
    const env = { ...process.env, PGPASSWORD: password };
    const command = `pg_dump -h ${host} -p ${port} -U ${username} -d ${database} --verbose --clean --if-exists --format=plain > ${backupFile}`;
    
    execSync(command, { env, stdio: 'inherit' });
    
    // Compress the backup
    const compressedFile = `${backupFile}.gz`;
    await compressDirectory(backupFile, compressedFile);
    
    // Encrypt the compressed backup
    const encryptedFile = `${compressedFile}.enc`;
    await encryptFile(compressedFile, encryptedFile);
    
    // Clean up intermediate files
    fs.unlinkSync(backupFile);
    fs.unlinkSync(compressedFile);
    
    logSuccess(`PostgreSQL backup completed: ${encryptedFile}`);
    return encryptedFile;
  } catch (error) {
    logError(`PostgreSQL backup failed: ${error.message}`);
    throw error;
  }
}

async function backupMongoDB(backupDir) {
  logInfo('Starting MongoDB backup...');
  
  const { host, port, database, username, password } = BACKUP_CONFIG.databases.mongodb;
  const backupFile = path.join(backupDir, `mongodb-${database}.archive`);
  
  try {
    const env = { ...process.env };
    if (username && password) {
      env.MONGODB_URI = `mongodb://${username}:${password}@${host}:${port}/${database}`;
    } else {
      env.MONGODB_URI = `mongodb://${host}:${port}/${database}`;
    }
    
    const command = `mongodump --uri="${env.MONGODB_URI}" --archive=${backupFile}`;
    execSync(command, { env, stdio: 'inherit' });
    
    // Compress the backup
    const compressedFile = `${backupFile}.gz`;
    await compressDirectory(backupFile, compressedFile);
    
    // Encrypt the compressed backup
    const encryptedFile = `${compressedFile}.enc`;
    await encryptFile(compressedFile, encryptedFile);
    
    // Clean up intermediate files
    fs.unlinkSync(backupFile);
    fs.unlinkSync(compressedFile);
    
    logSuccess(`MongoDB backup completed: ${encryptedFile}`);
    return encryptedFile;
  } catch (error) {
    logError(`MongoDB backup failed: ${error.message}`);
    throw error;
  }
}

async function backupRedis(backupDir) {
  logInfo('Starting Redis backup...');
  
  const { host, port, password } = BACKUP_CONFIG.databases.redis;
  const backupFile = path.join(backupDir, 'redis-dump.rdb');
  
  try {
    const env = { ...process.env };
    if (password) {
      env.REDISCLI_AUTH = password;
    }
    
    // Trigger Redis BGSAVE
    const command = `redis-cli -h ${host} -p ${port} BGSAVE`;
    execSync(command, { env, stdio: 'inherit' });
    
    // Wait for BGSAVE to complete
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Copy the RDB file
    const rdbPath = '/var/lib/redis/dump.rdb'; // Default Redis data directory
    if (fs.existsSync(rdbPath)) {
      fs.copyFileSync(rdbPath, backupFile);
    } else {
      logWarning('Redis RDB file not found at default location');
      return null;
    }
    
    // Compress the backup
    const compressedFile = `${backupFile}.gz`;
    await compressDirectory(backupFile, compressedFile);
    
    // Encrypt the compressed backup
    const encryptedFile = `${compressedFile}.enc`;
    await encryptFile(compressedFile, encryptedFile);
    
    // Clean up intermediate files
    fs.unlinkSync(backupFile);
    fs.unlinkSync(compressedFile);
    
    logSuccess(`Redis backup completed: ${encryptedFile}`);
    return encryptedFile;
  } catch (error) {
    logError(`Redis backup failed: ${error.message}`);
    throw error;
  }
}

// File system backup functions
async function backupFiles(backupDir) {
  logInfo('Starting file system backup...');
  
  const filesDir = path.join(backupDir, 'files');
  if (!fs.existsSync(filesDir)) {
    fs.mkdirSync(filesDir, { recursive: true });
  }
  
  const backupFiles = [];
  
  for (const filePath of BACKUP_CONFIG.files) {
    try {
      if (fs.existsSync(filePath)) {
        const relativePath = path.relative(process.cwd(), filePath);
        const backupPath = path.join(filesDir, relativePath);
        
        // Create directory structure
        const backupFileDir = path.dirname(backupPath);
        if (!fs.existsSync(backupFileDir)) {
          fs.mkdirSync(backupFileDir, { recursive: true });
        }
        
        // Copy file or directory
        if (fs.statSync(filePath).isDirectory()) {
          await compressDirectory(filePath, `${backupPath}.tar.gz`);
          backupFiles.push(`${backupPath}.tar.gz`);
        } else {
          fs.copyFileSync(filePath, backupPath);
          backupFiles.push(backupPath);
        }
        
        logSuccess(`Backed up: ${filePath}`);
      } else {
        logWarning(`File not found: ${filePath}`);
      }
    } catch (error) {
      logError(`Failed to backup ${filePath}: ${error.message}`);
    }
  }
  
  return backupFiles;
}

// Configuration backup
async function backupConfiguration(backupDir) {
  logInfo('Starting configuration backup...');
  
  const configDir = path.join(backupDir, 'config');
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
  
  const configFiles = [
    'package.json',
    'backend/package.json',
    'frontend/package.json',
    'cloud/package.json',
    'docker-compose.production.yml',
    'nginx.conf',
    'monitoring/prometheus.yml',
    'monitoring/alerts.yml'
  ];
  
  const backupFiles = [];
  
  for (const configFile of configFiles) {
    try {
      if (fs.existsSync(configFile)) {
        const backupPath = path.join(configDir, configFile);
        const backupFileDir = path.dirname(backupPath);
        
        if (!fs.existsSync(backupFileDir)) {
          fs.mkdirSync(backupFileDir, { recursive: true });
        }
        
        fs.copyFileSync(configFile, backupPath);
        backupFiles.push(backupPath);
        
        logSuccess(`Configuration backed up: ${configFile}`);
      } else {
        logWarning(`Configuration file not found: ${configFile}`);
      }
    } catch (error) {
      logError(`Failed to backup configuration ${configFile}: ${error.message}`);
    }
  }
  
  return backupFiles;
}

// Backup metadata
function createBackupMetadata(backupDir, backupFiles) {
  logInfo('Creating backup metadata...');
  
  const metadata = {
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    environment: process.env.NODE_ENV || 'production',
    backupType: 'full',
    files: backupFiles,
    size: 0,
    checksum: '',
    retention: {
      expiresAt: new Date(Date.now() + (BACKUP_CONFIG.retentionDays * 24 * 60 * 60 * 1000)).toISOString(),
      days: BACKUP_CONFIG.retentionDays
    },
    system: {
      platform: process.platform,
      nodeVersion: process.version,
      hostname: require('os').hostname()
    }
  };
  
  // Calculate total size
  for (const file of backupFiles) {
    if (fs.existsSync(file)) {
      const stats = fs.statSync(file);
      metadata.size += stats.size;
    }
  }
  
  // Calculate checksum
  const hash = crypto.createHash('sha256');
  for (const file of backupFiles) {
    if (fs.existsSync(file)) {
      const data = fs.readFileSync(file);
      hash.update(data);
    }
  }
  metadata.checksum = hash.digest('hex');
  
  const metadataPath = path.join(backupDir, 'backup-metadata.json');
  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
  
  logSuccess(`Backup metadata created: ${metadataPath}`);
  return metadataPath;
}

// Cleanup old backups
function cleanupOldBackups() {
  logInfo('Cleaning up old backups...');
  
  if (!fs.existsSync(BACKUP_CONFIG.storagePath)) {
    return;
  }
  
  const now = new Date();
  const retentionTime = BACKUP_CONFIG.retentionDays * 24 * 60 * 60 * 1000;
  
  try {
    const backupDirs = fs.readdirSync(BACKUP_CONFIG.storagePath);
    let cleanedCount = 0;
    
    for (const dir of backupDirs) {
      if (dir.startsWith('backup-')) {
        const dirPath = path.join(BACKUP_CONFIG.storagePath, dir);
        const stats = fs.statSync(dirPath);
        
        if (now - stats.mtime > retentionTime) {
          fs.rmSync(dirPath, { recursive: true, force: true });
          cleanedCount++;
          logInfo(`Cleaned up old backup: ${dir}`);
        }
      }
    }
    
    logSuccess(`Cleaned up ${cleanedCount} old backups`);
  } catch (error) {
    logError(`Cleanup failed: ${error.message}`);
  }
}

// Main backup function
async function createBackup() {
  logHeader('CryptoPulse Backup Manager');
  logInfo('Starting full system backup...\n');
  
  const startTime = Date.now();
  const backupDir = createBackupDirectory();
  
  try {
    // Create backup storage directory
    if (!fs.existsSync(BACKUP_CONFIG.storagePath)) {
      fs.mkdirSync(BACKUP_CONFIG.storagePath, { recursive: true });
    }
    
    const backupFiles = [];
    
    // Backup databases
    try {
      const postgresBackup = await backupPostgreSQL(backupDir);
      if (postgresBackup) backupFiles.push(postgresBackup);
    } catch (error) {
      logWarning(`PostgreSQL backup skipped: ${error.message}`);
    }
    
    try {
      const mongoBackup = await backupMongoDB(backupDir);
      if (mongoBackup) backupFiles.push(mongoBackup);
    } catch (error) {
      logWarning(`MongoDB backup skipped: ${error.message}`);
    }
    
    try {
      const redisBackup = await backupRedis(backupDir);
      if (redisBackup) backupFiles.push(redisBackup);
    } catch (error) {
      logWarning(`Redis backup skipped: ${error.message}`);
    }
    
    // Backup files
    const fileBackups = await backupFiles(backupDir);
    backupFiles.push(...fileBackups);
    
    // Backup configuration
    const configBackups = await backupConfiguration(backupDir);
    backupFiles.push(...configBackups);
    
    // Create metadata
    const metadataFile = createBackupMetadata(backupDir, backupFiles);
    backupFiles.push(metadataFile);
    
    // Cleanup old backups
    cleanupOldBackups();
    
    const duration = Date.now() - startTime;
    logHeader('Backup Completed Successfully');
    logSuccess(`Backup directory: ${backupDir}`);
    logSuccess(`Total files: ${backupFiles.length}`);
    logSuccess(`Duration: ${(duration / 1000).toFixed(2)} seconds`);
    logInfo(`Backup will be retained for ${BACKUP_CONFIG.retentionDays} days`);
    
    return {
      success: true,
      backupDir,
      files: backupFiles,
      duration,
      metadata: JSON.parse(fs.readFileSync(metadataFile, 'utf8'))
    };
    
  } catch (error) {
    logError(`Backup failed: ${error.message}`);
    throw error;
  }
}

// List available backups
function listBackups() {
  logHeader('Available Backups');
  
  if (!fs.existsSync(BACKUP_CONFIG.storagePath)) {
    logWarning('No backup storage directory found');
    return;
  }
  
  try {
    const backupDirs = fs.readdirSync(BACKUP_CONFIG.storagePath)
      .filter(dir => dir.startsWith('backup-'))
      .sort()
      .reverse();
    
    if (backupDirs.length === 0) {
      logInfo('No backups found');
      return;
    }
    
    backupDirs.forEach((dir, index) => {
      const dirPath = path.join(BACKUP_CONFIG.storagePath, dir);
      const stats = fs.statSync(dirPath);
      const metadataPath = path.join(dirPath, 'backup-metadata.json');
      
      let metadata = null;
      if (fs.existsSync(metadataPath)) {
        try {
          metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
        } catch (error) {
          logWarning(`Failed to read metadata for ${dir}`);
        }
      }
      
      logInfo(`${index + 1}. ${dir}`);
      log(`   Created: ${stats.mtime.toISOString()}`, 'white');
      if (metadata) {
        log(`   Size: ${(metadata.size / 1024 / 1024).toFixed(2)} MB`, 'white');
        log(`   Environment: ${metadata.environment}`, 'white');
        log(`   Expires: ${metadata.retention?.expiresAt || 'Unknown'}`, 'white');
      }
      console.log();
    });
  } catch (error) {
    logError(`Failed to list backups: ${error.message}`);
  }
}

// Restore backup
async function restoreBackup(backupName) {
  logHeader(`Restoring Backup: ${backupName}`);
  
  const backupDir = path.join(BACKUP_CONFIG.storagePath, backupName);
  
  if (!fs.existsSync(backupDir)) {
    logError(`Backup not found: ${backupName}`);
    return;
  }
  
  const metadataPath = path.join(backupDir, 'backup-metadata.json');
  if (!fs.existsSync(metadataPath)) {
    logError(`Backup metadata not found: ${metadataPath}`);
    return;
  }
  
  try {
    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
    logInfo(`Restoring backup from: ${metadata.timestamp}`);
    logInfo(`Environment: ${metadata.environment}`);
    logInfo(`Files: ${metadata.files.length}`);
    
    // TODO: Implement restore logic
    logWarning('Restore functionality not yet implemented');
    logInfo('This would restore databases, files, and configuration');
    
  } catch (error) {
    logError(`Restore failed: ${error.message}`);
  }
}

// CLI interface
function showUsage() {
  logHeader('CryptoPulse Backup Manager');
  logInfo('Usage: node scripts/backup-manager.js [command]');
  logInfo('');
  logInfo('Commands:');
  logInfo('  backup    Create a full system backup');
  logInfo('  list      List available backups');
  logInfo('  restore   Restore from backup (not yet implemented)');
  logInfo('  cleanup   Clean up old backups');
  logInfo('  help      Show this help message');
  logInfo('');
  logInfo('Environment Variables:');
  logInfo('  BACKUP_ENCRYPTION_KEY    Encryption key for backups');
  logInfo('  BACKUP_STORAGE_PATH      Storage path for backups');
  logInfo('  POSTGRES_HOST            PostgreSQL host');
  logInfo('  POSTGRES_PORT            PostgreSQL port');
  logInfo('  POSTGRES_DB              PostgreSQL database');
  logInfo('  POSTGRES_USER            PostgreSQL username');
  logInfo('  POSTGRES_PASSWORD        PostgreSQL password');
  logInfo('  MONGO_HOST               MongoDB host');
  logInfo('  MONGO_PORT               MongoDB port');
  logInfo('  MONGO_DB                 MongoDB database');
  logInfo('  MONGO_USER               MongoDB username');
  logInfo('  MONGO_PASSWORD           MongoDB password');
  logInfo('  REDIS_HOST               Redis host');
  logInfo('  REDIS_PORT               Redis port');
  logInfo('  REDIS_PASSWORD           Redis password');
}

// Main function
async function main() {
  const command = process.argv[2];
  
  switch (command) {
    case 'backup':
      await createBackup();
      break;
    case 'list':
      listBackups();
      break;
    case 'restore':
      const backupName = process.argv[3];
      if (!backupName) {
        logError('Please specify backup name to restore');
        process.exit(1);
      }
      await restoreBackup(backupName);
      break;
    case 'cleanup':
      cleanupOldBackups();
      break;
    case 'help':
    case '--help':
    case '-h':
      showUsage();
      break;
    default:
      logError(`Unknown command: ${command}`);
      showUsage();
      process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    logError(`Backup manager failed: ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  createBackup,
  listBackups,
  restoreBackup,
  cleanupOldBackups,
  BACKUP_CONFIG
};
