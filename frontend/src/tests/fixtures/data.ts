// =============================================================================
// Test Data Fixtures - Production Ready
// =============================================================================
// Comprehensive test data factories and fixtures

// User data factory
export const userFactory = {
  // Basic user
  basic: (overrides: Partial<any> = {}) => ({
    id: 'user123',
    email: 'test@cryptopulse.com',
    name: 'Test User',
    firstName: 'Test',
    lastName: 'User',
    avatar: 'https://example.com/avatar.jpg',
    isEmailVerified: true,
    role: 'user',
    preferences: {
      theme: 'light',
      language: 'en',
      notifications: {
        email: true,
        push: false,
        sms: false
      }
    },
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    ...overrides
  }),

  // Admin user
  admin: (overrides: Partial<any> = {}) => 
    userFactory.basic({
      id: 'admin123',
      email: 'admin@cryptopulse.com',
      name: 'Admin User',
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      ...overrides
    }),

  // Trader user
  trader: (overrides: Partial<any> = {}) => 
    userFactory.basic({
      id: 'trader123',
      email: 'trader@cryptopulse.com',
      name: 'Trader User',
      firstName: 'Trader',
      lastName: 'User',
      role: 'trader',
      ...overrides
    }),

  // Multiple users
  multiple: (count: number, overrides: Partial<any> = {}) => 
    Array.from({ length: count }, (_, i) => 
      userFactory.basic({
        id: `user${i + 1}`,
        email: `user${i + 1}@cryptopulse.com`,
        name: `User ${i + 1}`,
        firstName: `User`,
        lastName: `${i + 1}`,
        ...overrides
      })
    )
};

// Trading session data factory
export const tradingSessionFactory = {
  // Basic session
  basic: (overrides: Partial<any> = {}) => ({
    id: 'session123',
    name: 'Test Trading Session',
    description: 'A test trading session',
    exchange: 'binance',
    strategy: 'test-strategy',
    status: 'active',
    userId: 'user123',
    config: {
      symbol: 'BTC/USDT',
      riskPercent: 2,
      maxPositions: 5,
      stopLoss: 5,
      takeProfit: 10,
      leverage: 1
    },
    statistics: {
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      totalPnL: 0,
      winRate: 0,
      averageWin: 0,
      averageLoss: 0
    },
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    ...overrides
  }),

  // Active session
  active: (overrides: Partial<any> = {}) => 
    tradingSessionFactory.basic({
      status: 'active',
      ...overrides
    }),

  // Paused session
  paused: (overrides: Partial<any> = {}) => 
    tradingSessionFactory.basic({
      status: 'paused',
      ...overrides
    }),

  // Stopped session
  stopped: (overrides: Partial<any> = {}) => 
    tradingSessionFactory.basic({
      status: 'stopped',
      stoppedAt: '2024-01-01T12:00:00Z',
      ...overrides
    }),

  // Session with positions
  withPositions: (overrides: Partial<any> = {}) => 
    tradingSessionFactory.basic({
      positions: [
        positionFactory.basic({ sessionId: 'session123' }),
        positionFactory.basic({ 
          sessionId: 'session123', 
          id: 'position456',
          symbol: 'ETH/USDT',
          side: 'short'
        })
      ],
      ...overrides
    }),

  // Multiple sessions
  multiple: (count: number, overrides: Partial<any> = {}) => 
    Array.from({ length: count }, (_, i) => 
      tradingSessionFactory.basic({
        id: `session${i + 1}`,
        name: `Trading Session ${i + 1}`,
        status: i % 3 === 0 ? 'active' : i % 3 === 1 ? 'paused' : 'stopped',
        ...overrides
      })
    )
};

// Position data factory
export const positionFactory = {
  // Basic position
  basic: (overrides: Partial<any> = {}) => ({
    id: 'position123',
    sessionId: 'session123',
    symbol: 'BTC/USDT',
    side: 'long',
    size: 0.1,
    entryPrice: 50000,
    currentPrice: 50000,
    status: 'open',
    pnl: 0,
    pnlPercent: 0,
    stopLoss: 47500,
    takeProfit: 55000,
    leverage: 1,
    margin: 5000,
    fees: 25,
    openedAt: '2024-01-01T00:00:00Z',
    closedAt: null,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    ...overrides
  }),

  // Long position
  long: (overrides: Partial<any> = {}) => 
    positionFactory.basic({
      side: 'long',
      ...overrides
    }),

  // Short position
  short: (overrides: Partial<any> = {}) => 
    positionFactory.basic({
      side: 'short',
      ...overrides
    }),

  // Winning position
  winning: (overrides: Partial<any> = {}) => 
    positionFactory.basic({
      currentPrice: 51000,
      pnl: 100,
      pnlPercent: 2,
      ...overrides
    }),

  // Losing position
  losing: (overrides: Partial<any> = {}) => 
    positionFactory.basic({
      currentPrice: 49000,
      pnl: -100,
      pnlPercent: -2,
      ...overrides
    }),

  // Closed position
  closed: (overrides: Partial<any> = {}) => 
    positionFactory.basic({
      status: 'closed',
      currentPrice: 51000,
      pnl: 100,
      pnlPercent: 2,
      closedAt: '2024-01-01T12:00:00Z',
      ...overrides
    }),

  // Multiple positions
  multiple: (count: number, overrides: Partial<any> = {}) => 
    Array.from({ length: count }, (_, i) => 
      positionFactory.basic({
        id: `position${i + 1}`,
        symbol: i % 2 === 0 ? 'BTC/USDT' : 'ETH/USDT',
        side: i % 2 === 0 ? 'long' : 'short',
        entryPrice: 50000 + (i * 1000),
        pnl: (Math.random() - 0.5) * 1000,
        ...overrides
      })
    )
};

// Market data factory
export const marketDataFactory = {
  // Basic market data
  basic: (overrides: Partial<any> = {}) => ({
    symbol: 'BTC/USDT',
    price: 50000,
    change24h: 2.5,
    changePercent24h: 0.05,
    volume24h: 1000000,
    high24h: 51000,
    low24h: 49000,
    marketCap: 1000000000000,
    circulatingSupply: 20000000,
    maxSupply: 21000000,
    timestamp: '2024-01-01T00:00:00Z',
    ...overrides
  }),

  // Bitcoin market data
  bitcoin: (overrides: Partial<any> = {}) => 
    marketDataFactory.basic({
      symbol: 'BTC/USDT',
      price: 50000,
      ...overrides
    }),

  // Ethereum market data
  ethereum: (overrides: Partial<any> = {}) => 
    marketDataFactory.basic({
      symbol: 'ETH/USDT',
      price: 3000,
      ...overrides
    }),

  // Cardano market data
  cardano: (overrides: Partial<any> = {}) => 
    marketDataFactory.basic({
      symbol: 'ADA/USDT',
      price: 0.5,
      ...overrides
    }),

  // Multiple market data
  multiple: (symbols: string[], overrides: Partial<any> = {}) => 
    symbols.reduce((acc, symbol) => {
      acc[symbol] = marketDataFactory.basic({
        symbol,
        price: Math.random() * 100000,
        change24h: (Math.random() - 0.5) * 10,
        ...overrides
      });
      return acc;
    }, {} as Record<string, any>)
};

// Order book data factory
export const orderBookFactory = {
  // Basic order book
  basic: (overrides: Partial<any> = {}) => ({
    symbol: 'BTC/USDT',
    bids: [
      [49999, 0.1],
      [49998, 0.2],
      [49997, 0.3],
      [49996, 0.4],
      [49995, 0.5]
    ],
    asks: [
      [50001, 0.1],
      [50002, 0.2],
      [50003, 0.3],
      [50004, 0.4],
      [50005, 0.5]
    ],
    timestamp: '2024-01-01T00:00:00Z',
    ...overrides
  }),

  // Deep order book
  deep: (overrides: Partial<any> = {}) => {
    const bids = [];
    const asks = [];
    
    for (let i = 0; i < 20; i++) {
      bids.push([49999 - i, Math.random() * 1]);
      asks.push([50001 + i, Math.random() * 1]);
    }
    
    return orderBookFactory.basic({
      bids,
      asks,
      ...overrides
    });
  },

  // Shallow order book
  shallow: (overrides: Partial<any> = {}) => 
    orderBookFactory.basic({
      bids: [[49999, 0.1]],
      asks: [[50001, 0.1]],
      ...overrides
    }),

  // Multiple order books
  multiple: (symbols: string[], overrides: Partial<any> = {}) => 
    symbols.reduce((acc, symbol) => {
      acc[symbol] = orderBookFactory.basic({
        symbol,
        ...overrides
      });
      return acc;
    }, {} as Record<string, any>)
};

// Trade data factory
export const tradeFactory = {
  // Basic trade
  basic: (overrides: Partial<any> = {}) => ({
    id: 'trade123',
    sessionId: 'session123',
    positionId: 'position123',
    symbol: 'BTC/USDT',
    side: 'buy',
    size: 0.1,
    price: 50000,
    fees: 25,
    timestamp: '2024-01-01T00:00:00Z',
    ...overrides
  }),

  // Buy trade
  buy: (overrides: Partial<any> = {}) => 
    tradeFactory.basic({
      side: 'buy',
      ...overrides
    }),

  // Sell trade
  sell: (overrides: Partial<any> = {}) => 
    tradeFactory.basic({
      side: 'sell',
      ...overrides
    }),

  // Multiple trades
  multiple: (count: number, overrides: Partial<any> = {}) => 
    Array.from({ length: count }, (_, i) => 
      tradeFactory.basic({
        id: `trade${i + 1}`,
        side: i % 2 === 0 ? 'buy' : 'sell',
        price: 50000 + (i * 100),
        timestamp: new Date(Date.now() - i * 60000).toISOString(),
        ...overrides
      })
    )
};

// Notification data factory
export const notificationFactory = {
  // Basic notification
  basic: (overrides: Partial<any> = {}) => ({
    id: 'notification123',
    userId: 'user123',
    type: 'info',
    title: 'Test Notification',
    message: 'This is a test notification',
    isRead: false,
    createdAt: '2024-01-01T00:00:00Z',
    ...overrides
  }),

  // Success notification
  success: (overrides: Partial<any> = {}) => 
    notificationFactory.basic({
      type: 'success',
      title: 'Success',
      message: 'Operation completed successfully',
      ...overrides
    }),

  // Error notification
  error: (overrides: Partial<any> = {}) => 
    notificationFactory.basic({
      type: 'error',
      title: 'Error',
      message: 'An error occurred',
      ...overrides
    }),

  // Warning notification
  warning: (overrides: Partial<any> = {}) => 
    notificationFactory.basic({
      type: 'warning',
      title: 'Warning',
      message: 'Please be careful',
      ...overrides
    }),

  // Trading notification
  trading: (overrides: Partial<any> = {}) => 
    notificationFactory.basic({
      type: 'trading',
      title: 'Trading Alert',
      message: 'Position opened successfully',
      ...overrides
    }),

  // Multiple notifications
  multiple: (count: number, overrides: Partial<any> = {}) => 
    Array.from({ length: count }, (_, i) => 
      notificationFactory.basic({
        id: `notification${i + 1}`,
        type: ['info', 'success', 'error', 'warning'][i % 4],
        title: `Notification ${i + 1}`,
        message: `This is notification number ${i + 1}`,
        isRead: i % 2 === 0,
        ...overrides
      })
    )
};

// Analytics data factory
export const analyticsFactory = {
  // Basic analytics
  basic: (overrides: Partial<any> = {}) => ({
    totalSessions: 5,
    activeSessions: 2,
    totalPositions: 10,
    openPositions: 3,
    totalTrades: 50,
    totalPnL: 1500,
    winRate: 75,
    averageWin: 200,
    averageLoss: -100,
    largestWin: 500,
    largestLoss: -300,
    profitFactor: 1.5,
    sharpeRatio: 1.2,
    maxDrawdown: -15,
    ...overrides
  }),

  // Profitable analytics
  profitable: (overrides: Partial<any> = {}) => 
    analyticsFactory.basic({
      totalPnL: 5000,
      winRate: 80,
      averageWin: 300,
      averageLoss: -150,
      profitFactor: 2.0,
      sharpeRatio: 1.5,
      maxDrawdown: -10,
      ...overrides
    }),

  // Losing analytics
  losing: (overrides: Partial<any> = {}) => 
    analyticsFactory.basic({
      totalPnL: -2000,
      winRate: 30,
      averageWin: 100,
      averageLoss: -300,
      profitFactor: 0.5,
      sharpeRatio: -0.5,
      maxDrawdown: -50,
      ...overrides
    }),

  // Performance metrics
  performance: (overrides: Partial<any> = {}) => ({
    responseTime: 150,
    throughput: 1000,
    errorRate: 0.01,
    uptime: 99.9,
    memoryUsage: 512,
    cpuUsage: 25,
    ...overrides
  })
};

// Export all factories
export const dataFactories = {
  user: userFactory,
  tradingSession: tradingSessionFactory,
  position: positionFactory,
  marketData: marketDataFactory,
  orderBook: orderBookFactory,
  trade: tradeFactory,
  notification: notificationFactory,
  analytics: analyticsFactory
};

// Export individual factories for convenience
export {
  userFactory,
  tradingSessionFactory,
  positionFactory,
  marketDataFactory,
  orderBookFactory,
  tradeFactory,
  notificationFactory,
  analyticsFactory
};

// Default export
export default dataFactories;
