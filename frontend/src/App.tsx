import React, { useState } from 'react';
import './App.css';

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const pages = {
    dashboard: 'Dashboard',
    trading: 'Trading Bot',
    analytics: 'Analytics',
    settings: 'Settings'
  };

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) {
    return (
      <div className="app">
        <div className="auth-container">
          <div className="auth-card">
            <div className="logo">🚀</div>
            <h1>CryptoPulse Trading Bot</h1>
            <p className="subtitle">AI-Powered Cryptocurrency Trading Platform</p>
            
            <div className="auth-form">
              <div className="input-group">
                <label>Email</label>
                <input type="email" placeholder="Enter your email" />
              </div>
              <div className="input-group">
                <label>Password</label>
                <input type="password" placeholder="Enter your password" />
              </div>
              <button className="btn-primary" onClick={handleLogin}>
                Sign In
              </button>
              <button className="btn-secondary" onClick={handleLogin}>
                Create Account
              </button>
            </div>
            
            <div className="features-preview">
              <h3>Features</h3>
              <div className="feature-grid">
                <div className="feature-item">🤖 AI Trading</div>
                <div className="feature-item">📊 Real-time Analysis</div>
                <div className="feature-item">⚡ Automation</div>
                <div className="feature-item">🔒 Security</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <div className="logo">🚀</div>
          <h1>CryptoPulse</h1>
          <nav className="nav">
            {Object.entries(pages).map(([key, name]) => (
              <button
                key={key}
                className={`nav-item ${currentPage === key ? 'active' : ''}`}
                onClick={() => setCurrentPage(key)}
              >
                {name}
              </button>
            ))}
          </nav>
          <button className="btn-logout" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      <main className="main">
        {currentPage === 'dashboard' && (
          <div className="page">
            <h2>Dashboard</h2>
            <div className="stats-grid">
              <div className="stat-card">
                <h3>Portfolio Value</h3>
                <div className="stat-value">$12,450.00</div>
                <div className="stat-change positive">+2.5%</div>
              </div>
              <div className="stat-card">
                <h3>Active Bots</h3>
                <div className="stat-value">3</div>
                <div className="stat-change">Running</div>
              </div>
              <div className="stat-card">
                <h3>Today's P&L</h3>
                <div className="stat-value">+$245.30</div>
                <div className="stat-change positive">+1.8%</div>
              </div>
              <div className="stat-card">
                <h3>Win Rate</h3>
                <div className="stat-value">78.5%</div>
                <div className="stat-change positive">+5.2%</div>
              </div>
            </div>
            
            <div className="chart-section">
              <h3>Portfolio Performance</h3>
              <div className="chart-placeholder">
                📈 Chart visualization would go here
              </div>
            </div>
          </div>
        )}

        {currentPage === 'trading' && (
          <div className="page">
            <h2>Trading Bot</h2>
            <div className="trading-panel">
              <div className="bot-controls">
                <h3>Bot Configuration</h3>
                <div className="form-group">
                  <label>Trading Pair</label>
                  <select>
                    <option>BTC/USDT</option>
                    <option>ETH/USDT</option>
                    <option>BNB/USDT</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Strategy</label>
                  <select>
                    <option>Scalping</option>
                    <option>Trend Following</option>
                    <option>Mean Reversion</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Investment Amount</label>
                  <input type="number" placeholder="1000" />
                </div>
                <button className="btn-primary">Start Bot</button>
              </div>
              
              <div className="bot-status">
                <h3>Bot Status</h3>
                <div className="status-indicator">
                  <div className="status-dot offline"></div>
                  <span>Offline</span>
                </div>
                <div className="bot-stats">
                  <div className="stat">
                    <span>Total Trades:</span>
                    <span>0</span>
                  </div>
                  <div className="stat">
                    <span>Success Rate:</span>
                    <span>0%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {currentPage === 'analytics' && (
          <div className="page">
            <h2>Analytics</h2>
            <div className="analytics-grid">
              <div className="analytics-card">
                <h3>Performance Metrics</h3>
                <div className="metric">
                  <span>Sharpe Ratio:</span>
                  <span>1.85</span>
                </div>
                <div className="metric">
                  <span>Max Drawdown:</span>
                  <span>5.2%</span>
                </div>
                <div className="metric">
                  <span>Volatility:</span>
                  <span>12.3%</span>
                </div>
              </div>
              
              <div className="analytics-card">
                <h3>Recent Trades</h3>
                <div className="trade-list">
                  <div className="trade-item">
                    <span>BTC/USDT</span>
                    <span className="trade-profit positive">+$45.20</span>
                  </div>
                  <div className="trade-item">
                    <span>ETH/USDT</span>
                    <span className="trade-profit negative">-$12.50</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {currentPage === 'settings' && (
          <div className="page">
            <h2>Settings</h2>
            <div className="settings-grid">
              <div className="settings-section">
                <h3>API Configuration</h3>
                <div className="form-group">
                  <label>Binance API Key</label>
                  <input type="password" placeholder="Enter API key" />
                </div>
                <div className="form-group">
                  <label>API Secret</label>
                  <input type="password" placeholder="Enter API secret" />
                </div>
                <button className="btn-primary">Save API Keys</button>
              </div>
              
              <div className="settings-section">
                <h3>Risk Management</h3>
                <div className="form-group">
                  <label>Max Position Size (%)</label>
                  <input type="number" placeholder="10" />
                </div>
                <div className="form-group">
                  <label>Stop Loss (%)</label>
                  <input type="number" placeholder="2" />
                </div>
                <button className="btn-primary">Save Settings</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;