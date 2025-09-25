/**
 * Database Migration System
 * 
 * This module handles database migrations, schema updates,
 * and data transformations for the CryptoPulse Trading Bot.
 * 
 * @author Shrikant Telang
 * @version 1.0.0
 */

const fs = require('fs');
const path = require('path');
const { structuredLogger } = require('../../structuredLogger');
const { getPostgreSQLConnection, getMongoDBDatabase } = require('../connection');

// Migration tracking
const MIGRATION_TABLE = 'migrations';
const MIGRATION_DIR = path.join(__dirname, 'files');

// Migration status
let migrations = [];
let currentVersion = 0;

/**
 * Initialize migration system
 */
async function initializeMigrations() {
  try {
    structuredLogger.info('Initializing migration system...');
    
    // Create migrations table if it doesn't exist
    await createMigrationsTable();
    
    // Load existing migrations
    await loadMigrations();
    
    // Get current version
    currentVersion = await getCurrentVersion();
    
    structuredLogger.info(`Migration system initialized. Current version: ${currentVersion}`);
    
  } catch (error) {
    structuredLogger.error('Failed to initialize migration system:', error);
    throw error;
  }
}

/**
 * Create migrations table
 */
async function createMigrationsTable() {
  try {
    const sequelize = getPostgreSQLConnection();
    
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS ${MIGRATION_TABLE} (
        id SERIAL PRIMARY KEY,
        version INTEGER NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        execution_time INTEGER,
        status VARCHAR(50) DEFAULT 'completed',
        error_message TEXT
      )
    `);
    
    structuredLogger.info('Migrations table created/verified');
    
  } catch (error) {
    structuredLogger.error('Failed to create migrations table:', error);
    throw error;
  }
}

/**
 * Load available migrations
 */
async function loadMigrations() {
  try {
    if (!fs.existsSync(MIGRATION_DIR)) {
      fs.mkdirSync(MIGRATION_DIR, { recursive: true });
      return;
    }
    
    const files = fs.readdirSync(MIGRATION_DIR)
      .filter(file => file.endsWith('.js'))
      .sort();
    
    migrations = files.map(file => {
      const version = parseInt(file.split('_')[0]);
      const name = file.replace('.js', '');
      const migration = require(path.join(MIGRATION_DIR, file));
      
      return {
        version,
        name,
        file,
        up: migration.up,
        down: migration.down,
        description: migration.description || ''
      };
    });
    
    structuredLogger.info(`Loaded ${migrations.length} migrations`);
    
  } catch (error) {
    structuredLogger.error('Failed to load migrations:', error);
    throw error;
  }
}

/**
 * Get current migration version
 */
async function getCurrentVersion() {
  try {
    const sequelize = getPostgreSQLConnection();
    
    const [results] = await sequelize.query(`
      SELECT MAX(version) as version FROM ${MIGRATION_TABLE} WHERE status = 'completed'
    `);
    
    return results[0]?.version || 0;
    
  } catch (error) {
    structuredLogger.error('Failed to get current version:', error);
    return 0;
  }
}

/**
 * Run all pending migrations
 */
async function migrate() {
  try {
    structuredLogger.info('Starting migration process...');
    
    const pendingMigrations = migrations.filter(m => m.version > currentVersion);
    
    if (pendingMigrations.length === 0) {
      structuredLogger.info('No pending migrations');
      return;
    }
    
    structuredLogger.info(`Found ${pendingMigrations.length} pending migrations`);
    
    for (const migration of pendingMigrations) {
      await runMigration(migration);
    }
    
    structuredLogger.info('Migration process completed');
    
  } catch (error) {
    structuredLogger.error('Migration process failed:', error);
    throw error;
  }
}

/**
 * Run a specific migration
 */
async function runMigration(migration) {
  const startTime = Date.now();
  let status = 'completed';
  let errorMessage = null;
  
  try {
    structuredLogger.info(`Running migration ${migration.version}: ${migration.name}`);
    
    // Record migration start
    await recordMigrationStart(migration);
    
    // Run migration
    await migration.up();
    
    // Record migration completion
    const executionTime = Date.now() - startTime;
    await recordMigrationCompletion(migration, executionTime, status);
    
    structuredLogger.info(`Migration ${migration.version} completed in ${executionTime}ms`);
    
  } catch (error) {
    status = 'failed';
    errorMessage = error.message;
    
    // Record migration failure
    const executionTime = Date.now() - startTime;
    await recordMigrationFailure(migration, executionTime, errorMessage);
    
    structuredLogger.error(`Migration ${migration.version} failed:`, error);
    throw error;
  }
}

/**
 * Rollback to a specific version
 */
async function rollback(targetVersion = null) {
  try {
    structuredLogger.info('Starting rollback process...');
    
    const sequelize = getPostgreSQLConnection();
    
    // Get migrations to rollback
    let query = `SELECT * FROM ${MIGRATION_TABLE} WHERE status = 'completed'`;
    if (targetVersion !== null) {
      query += ` AND version > ${targetVersion}`;
    }
    query += ' ORDER BY version DESC';
    
    const [results] = await sequelize.query(query);
    
    if (results.length === 0) {
      structuredLogger.info('No migrations to rollback');
      return;
    }
    
    structuredLogger.info(`Rolling back ${results.length} migrations`);
    
    for (const record of results) {
      const migration = migrations.find(m => m.version === record.version);
      if (migration && migration.down) {
        await rollbackMigration(migration);
      }
    }
    
    structuredLogger.info('Rollback process completed');
    
  } catch (error) {
    structuredLogger.error('Rollback process failed:', error);
    throw error;
  }
}

/**
 * Rollback a specific migration
 */
async function rollbackMigration(migration) {
  try {
    structuredLogger.info(`Rolling back migration ${migration.version}: ${migration.name}`);
    
    // Run rollback
    await migration.down();
    
    // Update migration status
    await updateMigrationStatus(migration.version, 'rolled_back');
    
    structuredLogger.info(`Migration ${migration.version} rolled back successfully`);
    
  } catch (error) {
    structuredLogger.error(`Failed to rollback migration ${migration.version}:`, error);
    throw error;
  }
}

/**
 * Record migration start
 */
async function recordMigrationStart(migration) {
  try {
    const sequelize = getPostgreSQLConnection();
    
    await sequelize.query(`
      INSERT INTO ${MIGRATION_TABLE} (version, name, status) 
      VALUES (${migration.version}, '${migration.name}', 'running')
      ON CONFLICT (version) DO UPDATE SET 
        status = 'running',
        executed_at = CURRENT_TIMESTAMP
    `);
    
  } catch (error) {
    structuredLogger.error('Failed to record migration start:', error);
    throw error;
  }
}

/**
 * Record migration completion
 */
async function recordMigrationCompletion(migration, executionTime, status) {
  try {
    const sequelize = getPostgreSQLConnection();
    
    await sequelize.query(`
      UPDATE ${MIGRATION_TABLE} 
      SET status = '${status}', execution_time = ${executionTime}
      WHERE version = ${migration.version}
    `);
    
  } catch (error) {
    structuredLogger.error('Failed to record migration completion:', error);
    throw error;
  }
}

/**
 * Record migration failure
 */
async function recordMigrationFailure(migration, executionTime, errorMessage) {
  try {
    const sequelize = getPostgreSQLConnection();
    
    await sequelize.query(`
      UPDATE ${MIGRATION_TABLE} 
      SET status = 'failed', execution_time = ${executionTime}, error_message = '${errorMessage}'
      WHERE version = ${migration.version}
    `);
    
  } catch (error) {
    structuredLogger.error('Failed to record migration failure:', error);
    throw error;
  }
}

/**
 * Update migration status
 */
async function updateMigrationStatus(version, status) {
  try {
    const sequelize = getPostgreSQLConnection();
    
    await sequelize.query(`
      UPDATE ${MIGRATION_TABLE} 
      SET status = '${status}'
      WHERE version = ${version}
    `);
    
  } catch (error) {
    structuredLogger.error('Failed to update migration status:', error);
    throw error;
  }
}

/**
 * Get migration status
 */
async function getMigrationStatus() {
  try {
    const sequelize = getPostgreSQLConnection();
    
    const [results] = await sequelize.query(`
      SELECT * FROM ${MIGRATION_TABLE} ORDER BY version DESC
    `);
    
    return {
      currentVersion,
      totalMigrations: migrations.length,
      executedMigrations: results.length,
      migrations: results
    };
    
  } catch (error) {
    structuredLogger.error('Failed to get migration status:', error);
    throw error;
  }
}

/**
 * Create a new migration file
 */
function createMigration(name, description = '') {
  try {
    const timestamp = Date.now();
    const version = migrations.length + 1;
    const fileName = `${version.toString().padStart(3, '0')}_${name}.js`;
    const filePath = path.join(MIGRATION_DIR, fileName);
    
    const template = `/**
 * Migration: ${name}
 * Description: ${description}
 * Version: ${version}
 * Created: ${new Date().toISOString()}
 */

module.exports = {
  description: '${description}',
  
  up: async function() {
    // Add your migration logic here
    console.log('Running migration: ${name}');
  },
  
  down: async function() {
    // Add your rollback logic here
    console.log('Rolling back migration: ${name}');
  }
};
`;
    
    fs.writeFileSync(filePath, template);
    
    structuredLogger.info(`Created migration file: ${fileName}`);
    
    return {
      version,
      name,
      fileName,
      filePath
    };
    
  } catch (error) {
    structuredLogger.error('Failed to create migration:', error);
    throw error;
  }
}

/**
 * Validate migration files
 */
function validateMigrations() {
  try {
    const errors = [];
    
    for (const migration of migrations) {
      if (!migration.up || typeof migration.up !== 'function') {
        errors.push(`Migration ${migration.name} is missing 'up' function`);
      }
      
      if (!migration.down || typeof migration.down !== 'function') {
        errors.push(`Migration ${migration.name} is missing 'down' function`);
      }
    }
    
    if (errors.length > 0) {
      structuredLogger.error('Migration validation failed:', errors);
      throw new Error('Migration validation failed');
    }
    
    structuredLogger.info('All migrations validated successfully');
    
  } catch (error) {
    structuredLogger.error('Failed to validate migrations:', error);
    throw error;
  }
}

module.exports = {
  initializeMigrations,
  migrate,
  rollback,
  getMigrationStatus,
  createMigration,
  validateMigrations
};
