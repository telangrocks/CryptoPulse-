/**
 * Migration: Initial Schema
 * Description: Create initial database schema for CryptoPulse Trading Bot
 * Version: 1
 * Created: 2024-01-01T00:00:00.000Z
 */

module.exports = {
  description: 'Create initial database schema for CryptoPulse Trading Bot',
  
  up: async function() {
    console.log('Running migration: Initial Schema');
    
    const sequelize = require('../../connection').getPostgreSQLConnection();
    
    // Create users table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        username VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(255),
        last_name VARCHAR(255),
        phone VARCHAR(20),
        country VARCHAR(100),
        is_verified BOOLEAN DEFAULT FALSE,
        kyc_status VARCHAR(50) DEFAULT 'pending',
        role VARCHAR(50) DEFAULT 'user',
        last_login TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create user_sessions table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        session_id VARCHAR(255) UNIQUE NOT NULL,
        encrypted_data TEXT,
        ip_address INET,
        user_agent TEXT,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create portfolios table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS portfolios (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        total_value DECIMAL(20,8) DEFAULT 0,
        total_cost DECIMAL(20,8) DEFAULT 0,
        total_return DECIMAL(20,8) DEFAULT 0,
        total_return_percentage DECIMAL(10,4) DEFAULT 0,
        risk_level VARCHAR(50) DEFAULT 'medium',
        max_drawdown DECIMAL(5,4) DEFAULT 0.2,
        stop_loss_percentage DECIMAL(5,4) DEFAULT 0.05,
        take_profit_percentage DECIMAL(5,4) DEFAULT 0.15,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create portfolio_assets table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS portfolio_assets (
        id SERIAL PRIMARY KEY,
        portfolio_id INTEGER REFERENCES portfolios(id) ON DELETE CASCADE,
        pair VARCHAR(50) NOT NULL,
        amount DECIMAL(20,8) NOT NULL,
        cost DECIMAL(20,8) NOT NULL,
        current_value DECIMAL(20,8) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create trades table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS trades (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        pair VARCHAR(50) NOT NULL,
        action VARCHAR(10) NOT NULL CHECK (action IN ('BUY', 'SELL')),
        amount DECIMAL(20,8) NOT NULL,
        price DECIMAL(20,8) NOT NULL,
        order_value DECIMAL(20,8) NOT NULL,
        fees DECIMAL(20,8) NOT NULL,
        total_cost DECIMAL(20,8) NOT NULL,
        strategy VARCHAR(100),
        stop_loss DECIMAL(20,8),
        take_profit DECIMAL(20,8),
        confidence DECIMAL(5,4),
        risk_level VARCHAR(50),
        status VARCHAR(50) DEFAULT 'pending',
        execution_price DECIMAL(20,8),
        execution_fees DECIMAL(20,8),
        executed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create market_data table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS market_data (
        id SERIAL PRIMARY KEY,
        pair VARCHAR(50) NOT NULL,
        timeframe VARCHAR(10) NOT NULL,
        timestamp BIGINT NOT NULL,
        open DECIMAL(20,8) NOT NULL,
        high DECIMAL(20,8) NOT NULL,
        low DECIMAL(20,8) NOT NULL,
        close DECIMAL(20,8) NOT NULL,
        volume DECIMAL(20,8) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(pair, timeframe, timestamp)
      )
    `);
    
    // Create trading_signals table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS trading_signals (
        id SERIAL PRIMARY KEY,
        pair VARCHAR(50) NOT NULL,
        timeframe VARCHAR(10) NOT NULL,
        signal_type VARCHAR(20) NOT NULL CHECK (signal_type IN ('BUY', 'SELL', 'HOLD')),
        confidence DECIMAL(5,4) NOT NULL,
        price DECIMAL(20,8) NOT NULL,
        stop_loss DECIMAL(20,8),
        take_profit DECIMAL(20,8),
        risk_level VARCHAR(50),
        analysis_data JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create api_keys table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS api_keys (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        exchange VARCHAR(50) NOT NULL,
        encrypted_api_key TEXT NOT NULL,
        encrypted_secret_key TEXT NOT NULL,
        permissions TEXT[],
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create audit_logs table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        event VARCHAR(100) NOT NULL,
        details JSONB,
        ip_address INET,
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create feature_flags table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS feature_flags (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        enabled BOOLEAN DEFAULT FALSE,
        config JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create indexes
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
      CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_sessions_session_id ON user_sessions(session_id);
      CREATE INDEX IF NOT EXISTS idx_portfolios_user_id ON portfolios(user_id);
      CREATE INDEX IF NOT EXISTS idx_portfolio_assets_portfolio_id ON portfolio_assets(portfolio_id);
      CREATE INDEX IF NOT EXISTS idx_trades_user_id ON trades(user_id);
      CREATE INDEX IF NOT EXISTS idx_trades_pair ON trades(pair);
      CREATE INDEX IF NOT EXISTS idx_trades_created_at ON trades(created_at);
      CREATE INDEX IF NOT EXISTS idx_market_data_pair_timeframe ON market_data(pair, timeframe);
      CREATE INDEX IF NOT EXISTS idx_market_data_timestamp ON market_data(timestamp);
      CREATE INDEX IF NOT EXISTS idx_trading_signals_pair ON trading_signals(pair);
      CREATE INDEX IF NOT EXISTS idx_trading_signals_created_at ON trading_signals(created_at);
      CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_event ON audit_logs(event);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
    `);
    
    console.log('Initial schema created successfully');
  },
  
  down: async function() {
    console.log('Rolling back migration: Initial Schema');
    
    const sequelize = require('../../connection').getPostgreSQLConnection();
    
    // Drop tables in reverse order
    await sequelize.query(`
      DROP TABLE IF EXISTS feature_flags CASCADE;
      DROP TABLE IF EXISTS audit_logs CASCADE;
      DROP TABLE IF EXISTS api_keys CASCADE;
      DROP TABLE IF EXISTS trading_signals CASCADE;
      DROP TABLE IF EXISTS market_data CASCADE;
      DROP TABLE IF EXISTS trades CASCADE;
      DROP TABLE IF EXISTS portfolio_assets CASCADE;
      DROP TABLE IF EXISTS portfolios CASCADE;
      DROP TABLE IF EXISTS user_sessions CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
    `);
    
    console.log('Initial schema rolled back successfully');
  }
};
