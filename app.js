// CryptoPulse Trading Bot - Full React App
class CryptoPulseApp {
    constructor() {
        this.currentPage = 'dashboard';
        this.isAuthenticated = false;
        this.init();
    }

    init() {
        this.render();
        this.bindEvents();
    }

    render() {
        document.body.innerHTML = `
            <div class="app">
                <header class="header">
                    <div class="header-content">
                        <div class="logo">🚀</div>
                        <h1>CryptoPulse</h1>
                        <nav class="nav">
                            <button class="nav-item active" data-page="dashboard">Dashboard</button>
                            <button class="nav-item" data-page="trading">Trading Bot</button>
                            <button class="nav-item" data-page="analytics">Analytics</button>
                            <button class="nav-item" data-page="settings">Settings</button>
                        </nav>
                        <button class="btn-logout" onclick="app.logout()">Logout</button>
                    </div>
                </header>

                <main class="main">
                    <div id="dashboard" class="page">
                        <h2>Dashboard</h2>
                        <div class="stats-grid">
                            <div class="stat-card">
                                <h3>Portfolio Value</h3>
                                <div class="stat-value">$12,450.00</div>
                                <div class="stat-change positive">+2.5%</div>
                            </div>
                            <div class="stat-card">
                                <h3>Active Bots</h3>
                                <div class="stat-value">3</div>
                                <div class="stat-change">Running</div>
                            </div>
                            <div class="stat-card">
                                <h3>Today's P&L</h3>
                                <div class="stat-value">+$245.30</div>
                                <div class="stat-change positive">+1.8%</div>
                            </div>
                            <div class="stat-card">
                                <h3>Win Rate</h3>
                                <div class="stat-value">78.5%</div>
                                <div class="stat-change positive">+5.2%</div>
                            </div>
                        </div>
                        
                        <div class="chart-section">
                            <h3>Portfolio Performance</h3>
                            <div class="chart-placeholder">
                                📈 Chart visualization would go here
                            </div>
                        </div>
                    </div>

                    <div id="trading" class="page" style="display: none;">
                        <h2>Trading Bot</h2>
                        <div class="trading-panel">
                            <div class="bot-controls">
                                <h3>Bot Configuration</h3>
                                <div class="form-group">
                                    <label>Trading Pair</label>
                                    <select>
                                        <option>BTC/USDT</option>
                                        <option>ETH/USDT</option>
                                        <option>BNB/USDT</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label>Strategy</label>
                                    <select>
                                        <option>Scalping</option>
                                        <option>Trend Following</option>
                                        <option>Mean Reversion</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label>Investment Amount</label>
                                    <input type="number" placeholder="1000" />
                                </div>
                                <button class="btn-primary">Start Bot</button>
                            </div>
                            
                            <div class="bot-status">
                                <h3>Bot Status</h3>
                                <div class="status-indicator">
                                    <div class="status-dot offline"></div>
                                    <span>Offline</span>
                                </div>
                                <div class="bot-stats">
                                    <div class="stat">
                                        <span>Total Trades:</span>
                                        <span>0</span>
                                    </div>
                                    <div class="stat">
                                        <span>Success Rate:</span>
                                        <span>0%</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div id="analytics" class="page" style="display: none;">
                        <h2>Analytics</h2>
                        <div class="analytics-grid">
                            <div class="analytics-card">
                                <h3>Performance Metrics</h3>
                                <div class="metric">
                                    <span>Sharpe Ratio:</span>
                                    <span>1.85</span>
                                </div>
                                <div class="metric">
                                    <span>Max Drawdown:</span>
                                    <span>5.2%</span>
                                </div>
                                <div class="metric">
                                    <span>Volatility:</span>
                                    <span>12.3%</span>
                                </div>
                            </div>
                            
                            <div class="analytics-card">
                                <h3>Recent Trades</h3>
                                <div class="trade-list">
                                    <div class="trade-item">
                                        <span>BTC/USDT</span>
                                        <span class="trade-profit positive">+$45.20</span>
                                    </div>
                                    <div class="trade-item">
                                        <span>ETH/USDT</span>
                                        <span class="trade-profit negative">-$12.50</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div id="settings" class="page" style="display: none;">
                        <h2>Settings</h2>
                        <div class="settings-grid">
                            <div class="settings-section">
                                <h3>API Configuration</h3>
                                <div class="form-group">
                                    <label>Binance API Key</label>
                                    <input type="password" placeholder="Enter API key" />
                                </div>
                                <div class="form-group">
                                    <label>API Secret</label>
                                    <input type="password" placeholder="Enter API secret" />
                                </div>
                                <button class="btn-primary">Save API Keys</button>
                            </div>
                            
                            <div class="settings-section">
                                <h3>Risk Management</h3>
                                <div class="form-group">
                                    <label>Max Position Size (%)</label>
                                    <input type="number" placeholder="10" />
                                </div>
                                <div class="form-group">
                                    <label>Stop Loss (%)</label>
                                    <input type="number" placeholder="2" />
                                </div>
                                <button class="btn-primary">Save Settings</button>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        `;
    }

    bindEvents() {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const page = e.target.dataset.page;
                this.showPage(page);
            });
        });

        document.querySelectorAll('.btn-primary').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.target.style.transform = 'scale(0.95)';
                setTimeout(() => {
                    e.target.style.transform = 'scale(1)';
                }, 150);
            });
        });
    }

    showPage(page) {
        // Hide all pages
        document.querySelectorAll('.page').forEach(p => p.style.display = 'none');
        
        // Show selected page
        document.getElementById(page).style.display = 'block';
        
        // Update nav items
        document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
        document.querySelector(`[data-page="${page}"]`).classList.add('active');
        
        this.currentPage = page;
    }

    logout() {
        this.isAuthenticated = false;
        location.reload();
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.app = new CryptoPulseApp();
    console.log('CryptoPulse Trading Bot - Full App Loaded!');
});

