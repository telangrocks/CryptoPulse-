-- =============================================================================
-- CryptoPulse Database Schema - PostgreSQL
-- =============================================================================
-- Complete database schema for CryptoPulse trading bot backend

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- USERS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(50) DEFAULT 'user',
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);

-- =============================================================================
-- EXCHANGE CONFIGURATIONS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS exchange_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    exchange VARCHAR(50) NOT NULL,
    api_key VARCHAR(500) NOT NULL,
    secret_key VARCHAR(500) NOT NULL,
    passphrase VARCHAR(500),
    is_active BOOLEAN DEFAULT true,
    last_sync TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, exchange)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_exchange_configs_user_id ON exchange_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_exchange_configs_exchange ON exchange_configs(exchange);
CREATE INDEX IF NOT EXISTS idx_exchange_configs_active ON exchange_configs(is_active);

-- =============================================================================
-- TRADES TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS trades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    exchange VARCHAR(50) NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    side VARCHAR(10) NOT NULL CHECK (side IN ('buy', 'sell')),
    amount DECIMAL(20, 8) NOT NULL,
    price DECIMAL(20, 8),
    total DECIMAL(20, 8),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
    order_id VARCHAR(100),
    trade_id VARCHAR(100),
    fees DECIMAL(20, 8) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_trades_user_id ON trades(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_exchange ON trades(exchange);
CREATE INDEX IF NOT EXISTS idx_trades_symbol ON trades(symbol);
CREATE INDEX IF NOT EXISTS idx_trades_status ON trades(status);
CREATE INDEX IF NOT EXISTS idx_trades_created_at ON trades(created_at);

-- =============================================================================
-- PORTFOLIO TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS portfolio (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    symbol VARCHAR(20) NOT NULL,
    amount DECIMAL(20, 8) NOT NULL DEFAULT 0,
    average_price DECIMAL(20, 8) NOT NULL DEFAULT 0,
    total_invested DECIMAL(20, 8) NOT NULL DEFAULT 0,
    current_value DECIMAL(20, 8) NOT NULL DEFAULT 0,
    profit_loss DECIMAL(20, 8) NOT NULL DEFAULT 0,
    profit_loss_percentage DECIMAL(10, 4) NOT NULL DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, symbol)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_portfolio_user_id ON portfolio(user_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_symbol ON portfolio(symbol);
CREATE INDEX IF NOT EXISTS idx_portfolio_last_updated ON portfolio(last_updated);

-- =============================================================================
-- TRADING STRATEGIES TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS trading_strategies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    strategy_type VARCHAR(50) NOT NULL,
    parameters JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_trading_strategies_user_id ON trading_strategies(user_id);
CREATE INDEX IF NOT EXISTS idx_trading_strategies_type ON trading_strategies(strategy_type);
CREATE INDEX IF NOT EXISTS idx_trading_strategies_active ON trading_strategies(is_active);

-- =============================================================================
-- NOTIFICATIONS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    data JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

-- =============================================================================
-- API USAGE LOGS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS api_usage_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    endpoint VARCHAR(200) NOT NULL,
    method VARCHAR(10) NOT NULL,
    status_code INTEGER NOT NULL,
    response_time INTEGER NOT NULL,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_user_id ON api_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_endpoint ON api_usage_logs(endpoint);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_status_code ON api_usage_logs(status_code);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_created_at ON api_usage_logs(created_at);

-- =============================================================================
-- SYSTEM SETTINGS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(100) UNIQUE NOT NULL,
    value TEXT NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(key);
CREATE INDEX IF NOT EXISTS idx_system_settings_public ON system_settings(is_public);

-- =============================================================================
-- FUNCTIONS AND TRIGGERS
-- =============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_exchange_configs_updated_at BEFORE UPDATE ON exchange_configs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trades_updated_at BEFORE UPDATE ON trades
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_portfolio_updated_at BEFORE UPDATE ON portfolio
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trading_strategies_updated_at BEFORE UPDATE ON trading_strategies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON system_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- INITIAL DATA
-- =============================================================================

-- Insert default system settings
INSERT INTO system_settings (key, value, description, is_public) VALUES
('app_name', 'CryptoPulse', 'Application name', true),
('app_version', '2.0.0', 'Application version', true),
('maintenance_mode', 'false', 'Maintenance mode status', true),
('max_trades_per_day', '100', 'Maximum trades per user per day', false),
('min_trade_amount', '10', 'Minimum trade amount in USD', true),
('max_trade_amount', '10000', 'Maximum trade amount in USD', true),
('supported_exchanges', '["binance", "wazirx", "coindcx", "delta", "coinbase"]', 'List of supported exchanges', true)
ON CONFLICT (key) DO NOTHING;

-- =============================================================================
-- VIEWS
-- =============================================================================

-- User portfolio summary view
CREATE OR REPLACE VIEW user_portfolio_summary AS
SELECT 
    p.user_id,
    u.email,
    COUNT(p.symbol) as total_assets,
    SUM(p.amount) as total_amount,
    SUM(p.current_value) as total_value,
    SUM(p.total_invested) as total_invested,
    SUM(p.profit_loss) as total_profit_loss,
    AVG(p.profit_loss_percentage) as avg_profit_loss_percentage,
    MAX(p.last_updated) as last_updated
FROM portfolio p
JOIN users u ON p.user_id = u.id
WHERE u.is_active = true
GROUP BY p.user_id, u.email;

-- Trading performance view
CREATE OR REPLACE VIEW trading_performance AS
SELECT 
    t.user_id,
    u.email,
    t.exchange,
    COUNT(*) as total_trades,
    COUNT(CASE WHEN t.status = 'completed' THEN 1 END) as completed_trades,
    COUNT(CASE WHEN t.status = 'failed' THEN 1 END) as failed_trades,
    SUM(CASE WHEN t.side = 'buy' THEN t.total ELSE 0 END) as total_bought,
    SUM(CASE WHEN t.side = 'sell' THEN t.total ELSE 0 END) as total_sold,
    SUM(t.fees) as total_fees,
    MIN(t.created_at) as first_trade,
    MAX(t.created_at) as last_trade
FROM trades t
JOIN users u ON t.user_id = u.id
WHERE u.is_active = true
GROUP BY t.user_id, u.email, t.exchange;

-- =============================================================================
-- GRANTS AND PERMISSIONS
-- =============================================================================

-- Create application user (adjust as needed for your setup)
-- CREATE USER cryptopulse_app WITH PASSWORD 'your_secure_password_here';
-- GRANT CONNECT ON DATABASE cryptopulse TO cryptopulse_app;
-- GRANT USAGE ON SCHEMA public TO cryptopulse_app;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO cryptopulse_app;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO cryptopulse_app;

-- =============================================================================
-- ADDITIONAL INDEXES FOR PERFORMANCE
-- =============================================================================

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_trades_user_exchange ON trades(user_id, exchange);
CREATE INDEX IF NOT EXISTS idx_trades_user_status ON trades(user_id, status);
CREATE INDEX IF NOT EXISTS idx_trades_symbol_status ON trades(symbol, status);
CREATE INDEX IF NOT EXISTS idx_exchange_configs_user_active ON exchange_configs(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_user_endpoint ON api_usage_logs(user_id, endpoint);

-- Partial indexes for better performance
CREATE INDEX IF NOT EXISTS idx_trades_active ON trades(user_id, created_at) WHERE status = 'completed';
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, created_at) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_errors ON api_usage_logs(created_at) WHERE status_code >= 400;

-- =============================================================================
-- MAINTENANCE AND CLEANUP
-- =============================================================================

-- Function to clean up old API usage logs (older than 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_api_logs()
RETURNS void AS $$
BEGIN
    DELETE FROM api_usage_logs 
    WHERE created_at < NOW() - INTERVAL '90 days';
    
    -- Log the cleanup
    INSERT INTO api_usage_logs (endpoint, method, status_code, response_time, created_at)
    VALUES ('cleanup', 'INTERNAL', 200, 0, NOW());
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old notifications (older than 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS void AS $$
BEGIN
    DELETE FROM notifications 
    WHERE created_at < NOW() - INTERVAL '30 days' 
    AND is_read = true;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE users IS 'User accounts and authentication data';
COMMENT ON TABLE exchange_configs IS 'Exchange API credentials and configuration';
COMMENT ON TABLE trades IS 'Trading history and executed trades';
COMMENT ON TABLE portfolio IS 'User portfolio holdings and performance';
COMMENT ON TABLE trading_strategies IS 'User-defined trading strategies and parameters';
COMMENT ON TABLE notifications IS 'User notifications and alerts';
COMMENT ON TABLE api_usage_logs IS 'API usage tracking and analytics';
COMMENT ON TABLE system_settings IS 'System-wide configuration settings';

COMMENT ON COLUMN users.role IS 'User role: user, admin, moderator';
COMMENT ON COLUMN trades.side IS 'Trade side: buy or sell';
COMMENT ON COLUMN trades.status IS 'Trade status: pending, completed, failed, cancelled';
COMMENT ON COLUMN portfolio.profit_loss IS 'Current profit/loss in USD';
COMMENT ON COLUMN portfolio.profit_loss_percentage IS 'Current profit/loss percentage';
COMMENT ON COLUMN trading_strategies.parameters IS 'Strategy-specific parameters in JSON format';
COMMENT ON COLUMN notifications.data IS 'Additional notification data in JSON format';
