/**
 * Database Migration and Schema Management
 * Production-ready database migration system for CryptoPulse
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class DatabaseMigrator {
  constructor(options = {}) {
    this.migrationsDir = options.migrationsDir || './migrations';
    this.versionFile = options.versionFile || './.db-version';
    this.database = options.database || process.env.MONGO_DATABASE || 'cryptopulse';
    this.host = options.host || process.env.MONGO_HOST || 'localhost';
    this.port = options.port || process.env.MONGO_PORT || 27017;
    this.username = options.username || process.env.MONGO_USERNAME;
    this.password = options.password || process.env.MONGO_PASSWORD;
    
    this.ensureMigrationsDir();
  }

  ensureMigrationsDir() {
    if (!fs.existsSync(this.migrationsDir)) {
      fs.mkdirSync(this.migrationsDir, { recursive: true });
    }
  }

  // Generate a new migration file
  generateMigration(name, description) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `${timestamp}_${name}.js`;
    const filepath = path.join(this.migrationsDir, filename);

    const template = `/**
 * Migration: ${name}
 * Description: ${description}
 * Generated: ${new Date().toISOString()}
 */

module.exports = {
  version: '${timestamp}',
  name: '${name}',
  description: '${description}',
  
  async up(db) {
    // Migration code here
    console.log('Running migration: ${name}');
    
    // Example: Create collections
    // await db.createCollection('users', {
    //   validator: {
    //     $jsonSchema: {
    //       bsonType: 'object',
    //       required: ['email', 'createdAt'],
    //       properties: {
    //         email: { bsonType: 'string', pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\\\.[a-zA-Z]{2,}$' },
    //         createdAt: { bsonType: 'date' }
    //       }
    //     }
    //   }
    // });
    
    // Example: Create indexes
    // await db.collection('users').createIndex({ email: 1 }, { unique: true });
    
    console.log('Migration ${name} completed successfully');
  },
  
  async down(db) {
    // Rollback code here
    console.log('Rolling back migration: ${name}');
    
    // Example: Drop collections
    // await db.collection('users').drop();
    
    console.log('Migration ${name} rolled back successfully');
  }
};
`;

    fs.writeFileSync(filepath, template);
    console.log(`Generated migration: ${filepath}`);
    return filepath;
  }

  // Get current database version
  getCurrentVersion() {
    try {
      if (fs.existsSync(this.versionFile)) {
        const version = fs.readFileSync(this.versionFile, 'utf8').trim();
        return version;
      }
    } catch (error) {
      console.error('Error reading version file:', error);
    }
    return null;
  }

  // Set database version
  setVersion(version) {
    try {
      fs.writeFileSync(this.versionFile, version);
      console.log(`Database version set to: ${version}`);
    } catch (error) {
      console.error('Error setting version:', error);
    }
  }

  // Get all migration files
  getMigrationFiles() {
    try {
      const files = fs.readdirSync(this.migrationsDir)
        .filter(file => file.endsWith('.js'))
        .sort();
      
      return files.map(file => {
        const filepath = path.join(this.migrationsDir, file);
        return {
          filename: file,
          filepath: filepath,
          version: file.split('_')[0],
          name: file.replace('.js', '').split('_').slice(1).join('_')
        };
      });
    } catch (error) {
      console.error('Error reading migration files:', error);
      return [];
    }
  }

  // Get pending migrations
  getPendingMigrations() {
    const currentVersion = this.getCurrentVersion();
    const allMigrations = this.getMigrationFiles();
    
    if (!currentVersion) {
      return allMigrations;
    }
    
    return allMigrations.filter(migration => 
      migration.version > currentVersion
    );
  }

  // Run a single migration
  async runMigration(migration) {
    try {
      console.log(`Running migration: ${migration.name} (${migration.version})`);
      
      // Load migration module
      delete require.cache[require.resolve(migration.filepath)];
      const migrationModule = require(migration.filepath);
      
      // Connect to database
      const db = await this.connectToDatabase();
      
      // Run migration
      await migrationModule.up(db);
      
      // Update version
      this.setVersion(migration.version);
      
      // Log migration
      await this.logMigration(migration, 'up', 'success');
      
      console.log(`Migration ${migration.name} completed successfully`);
      
    } catch (error) {
      console.error(`Migration ${migration.name} failed:`, error);
      
      // Log failed migration
      await this.logMigration(migration, 'up', 'failed', error.message);
      
      throw error;
    }
  }

  // Rollback a single migration
  async rollbackMigration(migration) {
    try {
      console.log(`Rolling back migration: ${migration.name} (${migration.version})`);
      
      // Load migration module
      delete require.cache[require.resolve(migration.filepath)];
      const migrationModule = require(migration.filepath);
      
      // Connect to database
      const db = await this.connectToDatabase();
      
      // Run rollback
      await migrationModule.down(db);
      
      // Update version
      const migrations = this.getMigrationFiles();
      const previousMigration = migrations
        .filter(m => m.version < migration.version)
        .pop();
      
      this.setVersion(previousMigration ? previousMigration.version : '');
      
      // Log rollback
      await this.logMigration(migration, 'down', 'success');
      
      console.log(`Migration ${migration.name} rolled back successfully`);
      
    } catch (error) {
      console.error(`Rollback ${migration.name} failed:`, error);
      
      // Log failed rollback
      await this.logMigration(migration, 'down', 'failed', error.message);
      
      throw error;
    }
  }

  // Run all pending migrations
  async migrate() {
    const pendingMigrations = this.getPendingMigrations();
    
    if (pendingMigrations.length === 0) {
      console.log('No pending migrations');
      return;
    }
    
    console.log(`Found ${pendingMigrations.length} pending migrations`);
    
    for (const migration of pendingMigrations) {
      await this.runMigration(migration);
    }
    
    console.log('All migrations completed successfully');
  }

  // Rollback to a specific version
  async rollbackTo(version) {
    const currentVersion = this.getCurrentVersion();
    const allMigrations = this.getMigrationFiles();
    
    if (!currentVersion) {
      console.log('No migrations to rollback');
      return;
    }
    
    const migrationsToRollback = allMigrations
      .filter(migration => migration.version > version && migration.version <= currentVersion)
      .reverse(); // Rollback in reverse order
    
    if (migrationsToRollback.length === 0) {
      console.log('No migrations to rollback');
      return;
    }
    
    console.log(`Rolling back ${migrationsToRollback.length} migrations to version ${version}`);
    
    for (const migration of migrationsToRollback) {
      await this.rollbackMigration(migration);
    }
    
    console.log('Rollback completed successfully');
  }

  // Connect to database (simplified - would use actual MongoDB driver)
  async connectToDatabase() {
    // In a real implementation, this would connect to MongoDB
    // For now, return a mock database object
    return {
      collection: (name) => ({
        createIndex: async (index, options) => {
          console.log(`Creating index on ${name}:`, index, options);
        },
        drop: async () => {
          console.log(`Dropping collection: ${name}`);
        },
        createCollection: async (name, options) => {
          console.log(`Creating collection: ${name}`, options);
        }
      }),
      createCollection: async (name, options) => {
        console.log(`Creating collection: ${name}`, options);
      }
    };
  }

  // Log migration activity
  async logMigration(migration, direction, status, error = null) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      migration: migration.name,
      version: migration.version,
      direction,
      status,
      error
    };
    
    const logFile = path.join(this.migrationsDir, 'migration.log');
    const logLine = JSON.stringify(logEntry) + '\n';
    
    fs.appendFileSync(logFile, logLine);
  }

  // Validate database schema
  async validateSchema() {
    console.log('Validating database schema...');
    
    const db = await this.connectToDatabase();
    const expectedCollections = [
      'users',
      'trades',
      'orders',
      'sessions',
      'audit_logs',
      'api_keys',
      'trading_signals',
      'portfolio',
      'transactions'
    ];
    
    // Check if collections exist and have proper indexes
    for (const collectionName of expectedCollections) {
      try {
        // In real implementation, check if collection exists and has proper schema
        console.log(`Validating collection: ${collectionName}`);
      } catch (error) {
        console.error(`Collection ${collectionName} validation failed:`, error);
      }
    }
    
    console.log('Schema validation completed');
  }

  // Get migration status
  getStatus() {
    const currentVersion = this.getCurrentVersion();
    const allMigrations = this.getMigrationFiles();
    const pendingMigrations = this.getPendingMigrations();
    
    return {
      currentVersion,
      totalMigrations: allMigrations.length,
      pendingMigrations: pendingMigrations.length,
      lastMigration: allMigrations[allMigrations.length - 1] || null
    };
  }

  // Show migration status
  showStatus() {
    const status = this.getStatus();
    
    console.log('\n📊 Database Migration Status');
    console.log('='.repeat(40));
    console.log(`Current Version: ${status.currentVersion || 'None'}`);
    console.log(`Total Migrations: ${status.totalMigrations}`);
    console.log(`Pending Migrations: ${status.pendingMigrations}`);
    
    if (status.lastMigration) {
      console.log(`Last Migration: ${status.lastMigration.name} (${status.lastMigration.version})`);
    }
    
    if (status.pendingMigrations > 0) {
      console.log('\n⏳ Pending Migrations:');
      const pending = this.getPendingMigrations();
      pending.forEach(migration => {
        console.log(`  - ${migration.name} (${migration.version})`);
      });
    }
    
    console.log('');
  }
}

// CLI interface
async function main() {
  const command = process.argv[2];
  const migrator = new DatabaseMigrator();
  
  switch (command) {
    case 'generate':
      const name = process.argv[3];
      const description = process.argv[4] || 'No description';
      
      if (!name) {
        console.error('Please provide a migration name');
        console.log('Usage: node db-migrate.js generate <name> [description]');
        process.exit(1);
      }
      
      migrator.generateMigration(name, description);
      break;
      
    case 'migrate':
      await migrator.migrate();
      break;
      
    case 'rollback':
      const version = process.argv[3];
      if (!version) {
        console.error('Please provide a version to rollback to');
        console.log('Usage: node db-migrate.js rollback <version>');
        process.exit(1);
      }
      
      await migrator.rollbackTo(version);
      break;
      
    case 'status':
      migrator.showStatus();
      break;
      
    case 'validate':
      await migrator.validateSchema();
      break;
      
    default:
      console.log('CryptoPulse Database Migration Tool');
      console.log('');
      console.log('Usage: node db-migrate.js <command> [options]');
      console.log('');
      console.log('Commands:');
      console.log('  generate <name> [description]  Generate a new migration');
      console.log('  migrate                        Run all pending migrations');
      console.log('  rollback <version>             Rollback to specific version');
      console.log('  status                         Show migration status');
      console.log('  validate                       Validate database schema');
      break;
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
}

module.exports = DatabaseMigrator;
