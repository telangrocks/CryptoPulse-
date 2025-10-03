// =============================================================================
// Trading E2E Tests - Production Ready
// =============================================================================
// Comprehensive end-to-end tests for trading functionality

import { test, expect } from '@playwright/test';

// Test data
const testUser = {
  email: 'trader@cryptopulse.com',
  password: 'SecurePassword123!',
  name: 'Test Trader'
};

const tradingSession = {
  name: 'E2E Test Session',
  exchange: 'binance',
  strategy: 'test-strategy',
  config: {
    symbol: 'BTC/USDT',
    riskPercent: 2,
    maxPositions: 5
  }
};

test.describe('Trading Flow', () => {
  let authToken: string;

  test.beforeEach(async ({ page }) => {
    // Clear storage
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    // Mock authentication
    await page.route('**/api/auth/login', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          user: {
            id: 'user123',
            email: testUser.email,
            name: testUser.name
          },
          tokens: {
            accessToken: 'mock-access-token',
            refreshToken: 'mock-refresh-token'
          }
        })
      });
    });

    await page.route('**/api/auth/profile', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          user: {
            id: 'user123',
            email: testUser.email,
            name: testUser.name
          }
        })
      });
    });

    // Login
    await page.goto('/auth');
    await page.fill('input[type="email"]', testUser.email);
    await page.fill('input[type="password"]', testUser.password);
    await page.click('button[type="submit"]');
    
    // Wait for dashboard
    await expect(page).toHaveURL('/dashboard');
    authToken = 'mock-access-token';
  });

  test('should create new trading session', async ({ page }) => {
    // Mock session creation
    await page.route('**/api/trading/sessions', async route => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            session: {
              id: 'session123',
              ...tradingSession,
              status: 'active',
              userId: 'user123',
              createdAt: new Date().toISOString()
            }
          })
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            sessions: []
          })
        });
      }
    });

    // Navigate to trading page
    await page.click('text=Trading');
    await expect(page).toHaveURL('/trading');

    // Click create session button
    await page.click('button:has-text("Create Session")');

    // Fill session form
    await page.fill('input[name="name"]', tradingSession.name);
    await page.selectOption('select[name="exchange"]', tradingSession.exchange);
    await page.selectOption('select[name="strategy"]', tradingSession.strategy);
    await page.fill('input[name="symbol"]', tradingSession.config.symbol);
    await page.fill('input[name="riskPercent"]', tradingSession.config.riskPercent.toString());

    // Submit form
    await page.click('button[type="submit"]');

    // Should show success message
    await expect(page.locator('text=Session created successfully')).toBeVisible();

    // Should redirect to session details
    await expect(page).toHaveURL(/\/trading\/sessions\/session123/);
  });

  test('should display trading sessions list', async ({ page }) => {
    // Mock sessions list
    await page.route('**/api/trading/sessions', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          sessions: [
            {
              id: 'session1',
              name: 'Test Session 1',
              exchange: 'binance',
              strategy: 'test-strategy',
              status: 'active',
              createdAt: new Date().toISOString()
            },
            {
              id: 'session2',
              name: 'Test Session 2',
              exchange: 'coinbase',
              strategy: 'test-strategy',
              status: 'paused',
              createdAt: new Date().toISOString()
            }
          ]
        })
      });
    });

    // Navigate to trading page
    await page.click('text=Trading');
    await expect(page).toHaveURL('/trading');

    // Should display sessions
    await expect(page.locator('text=Test Session 1')).toBeVisible();
    await expect(page.locator('text=Test Session 2')).toBeVisible();
    await expect(page.locator('text=active')).toBeVisible();
    await expect(page.locator('text=paused')).toBeVisible();
  });

  test('should open new position', async ({ page }) => {
    // Mock session details
    await page.route('**/api/trading/sessions/session123', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          session: {
            id: 'session123',
            ...tradingSession,
            status: 'active'
          }
        })
      });
    });

    // Mock position creation
    await page.route('**/api/trading/positions', async route => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            position: {
              id: 'position123',
              sessionId: 'session123',
              symbol: 'BTC/USDT',
              side: 'long',
              size: 0.1,
              price: 50000,
              status: 'open',
              createdAt: new Date().toISOString()
            }
          })
        });
      }
    });

    // Navigate to session details
    await page.goto('/trading/sessions/session123');

    // Click open position button
    await page.click('button:has-text("Open Position")');

    // Fill position form
    await page.selectOption('select[name="symbol"]', 'BTC/USDT');
    await page.selectOption('select[name="side"]', 'long');
    await page.fill('input[name="size"]', '0.1');
    await page.fill('input[name="price"]', '50000');

    // Submit form
    await page.click('button[type="submit"]');

    // Should show success message
    await expect(page.locator('text=Position opened successfully')).toBeVisible();

    // Should display new position
    await expect(page.locator('text=BTC/USDT')).toBeVisible();
    await expect(page.locator('text=long')).toBeVisible();
  });

  test('should close position', async ({ page }) => {
    // Mock session with positions
    await page.route('**/api/trading/sessions/session123', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          session: {
            id: 'session123',
            ...tradingSession,
            status: 'active'
          },
          positions: [
            {
              id: 'position123',
              sessionId: 'session123',
              symbol: 'BTC/USDT',
              side: 'long',
              size: 0.1,
              price: 50000,
              status: 'open',
              createdAt: new Date().toISOString()
            }
          ]
        })
      });
    });

    // Mock position close
    await page.route('**/api/trading/positions/position123/close', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          position: {
            id: 'position123',
            status: 'closed',
            closePrice: 51000,
            pnl: 100,
            closedAt: new Date().toISOString()
          }
        })
      });
    });

    // Navigate to session details
    await page.goto('/trading/sessions/session123');

    // Should display open position
    await expect(page.locator('text=BTC/USDT')).toBeVisible();

    // Click close position button
    await page.click('button:has-text("Close Position")');

    // Fill close price
    await page.fill('input[name="closePrice"]', '51000');

    // Submit
    await page.click('button[type="submit"]');

    // Should show success message
    await expect(page.locator('text=Position closed successfully')).toBeVisible();

    // Should update position status
    await expect(page.locator('text=closed')).toBeVisible();
  });

  test('should display market data', async ({ page }) => {
    // Mock market data
    await page.route('**/api/trading/market/prices', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          prices: {
            'BTC/USDT': 50000,
            'ETH/USDT': 3000,
            'ADA/USDT': 0.5
          }
        })
      });
    });

    await page.route('**/api/trading/market/depth', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          depth: {
            symbol: 'BTC/USDT',
            bids: [
              [49999, 0.1],
              [49998, 0.2],
              [49997, 0.3]
            ],
            asks: [
              [50001, 0.1],
              [50002, 0.2],
              [50003, 0.3]
            ]
          }
        })
      });
    });

    // Navigate to market data page
    await page.click('text=Market Data');
    await expect(page).toHaveURL('/market');

    // Should display prices
    await expect(page.locator('text=BTC/USDT')).toBeVisible();
    await expect(page.locator('text=50000')).toBeVisible();
    await expect(page.locator('text=ETH/USDT')).toBeVisible();
    await expect(page.locator('text=3000')).toBeVisible();

    // Click on BTC/USDT to see depth
    await page.click('text=BTC/USDT');

    // Should display order book
    await expect(page.locator('text=Bids')).toBeVisible();
    await expect(page.locator('text=Asks')).toBeVisible();
    await expect(page.locator('text=49999')).toBeVisible();
    await expect(page.locator('text=50001')).toBeVisible();
  });

  test('should display trading analytics', async ({ page }) => {
    // Mock analytics data
    await page.route('**/api/trading/statistics', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          statistics: {
            totalSessions: 5,
            activePositions: 3,
            totalPnL: 1500,
            winRate: 75,
            totalTrades: 20
          }
        })
      });
    });

    await page.route('**/api/trading/history', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          history: [
            {
              id: 'trade1',
              symbol: 'BTC/USDT',
              side: 'long',
              size: 0.1,
              entryPrice: 50000,
              exitPrice: 51000,
              pnl: 100,
              date: new Date().toISOString()
            },
            {
              id: 'trade2',
              symbol: 'ETH/USDT',
              side: 'short',
              size: 1.0,
              entryPrice: 3000,
              exitPrice: 2900,
              pnl: 100,
              date: new Date().toISOString()
            }
          ]
        })
      });
    });

    // Navigate to analytics page
    await page.click('text=Analytics');
    await expect(page).toHaveURL('/analytics');

    // Should display statistics
    await expect(page.locator('text=Total Sessions')).toBeVisible();
    await expect(page.locator('text=5')).toBeVisible();
    await expect(page.locator('text=Active Positions')).toBeVisible();
    await expect(page.locator('text=3')).toBeVisible();
    await expect(page.locator('text=Total P&L')).toBeVisible();
    await expect(page.locator('text=1500')).toBeVisible();
    await expect(page.locator('text=Win Rate')).toBeVisible();
    await expect(page.locator('text=75%')).toBeVisible();

    // Should display trade history
    await expect(page.locator('text=BTC/USDT')).toBeVisible();
    await expect(page.locator('text=ETH/USDT')).toBeVisible();
    await expect(page.locator('text=100')).toBeVisible();
  });

  test('should handle session management', async ({ page }) => {
    // Mock session management endpoints
    await page.route('**/api/trading/sessions/session123/stop', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          session: {
            id: 'session123',
            status: 'stopped',
            stoppedAt: new Date().toISOString()
          }
        })
      });
    });

    await page.route('**/api/trading/sessions/session123/start', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          session: {
            id: 'session123',
            status: 'active',
            startedAt: new Date().toISOString()
          }
        })
      });
    });

    // Navigate to session details
    await page.goto('/trading/sessions/session123');

    // Should show stop button for active session
    await expect(page.locator('button:has-text("Stop Session")')).toBeVisible();

    // Click stop session
    await page.click('button:has-text("Stop Session")');

    // Should show success message
    await expect(page.locator('text=Session stopped successfully')).toBeVisible();

    // Should show start button for stopped session
    await expect(page.locator('button:has-text("Start Session")')).toBeVisible();

    // Click start session
    await page.click('button:has-text("Start Session")');

    // Should show success message
    await expect(page.locator('text=Session started successfully')).toBeVisible();
  });

  test('should handle error scenarios gracefully', async ({ page }) => {
    // Mock server error
    await page.route('**/api/trading/sessions', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'Internal server error'
        })
      });
    });

    // Navigate to trading page
    await page.click('text=Trading');

    // Should show error message
    await expect(page.locator('text=Failed to load trading sessions')).toBeVisible();
    await expect(page.locator('text=Internal server error')).toBeVisible();
  });

  test('should handle network connectivity issues', async ({ page }) => {
    // Mock network error
    await page.route('**/api/trading/**', async route => {
      await route.abort('failed');
    });

    // Navigate to trading page
    await page.click('text=Trading');

    // Should show network error message
    await expect(page.locator('text=Network error')).toBeVisible();
    await expect(page.locator('text=Please check your connection')).toBeVisible();

    // Should show retry button
    await expect(page.locator('button:has-text("Retry")')).toBeVisible();
  });

  test('should validate trading form inputs', async ({ page }) => {
    // Navigate to trading page
    await page.click('text=Trading');

    // Click create session button
    await page.click('button:has-text("Create Session")');

    // Try to submit empty form
    await page.click('button[type="submit"]');

    // Should show validation errors
    await expect(page.locator('text=Session name is required')).toBeVisible();
    await expect(page.locator('text=Exchange is required')).toBeVisible();
    await expect(page.locator('text=Strategy is required')).toBeVisible();

    // Fill invalid data
    await page.fill('input[name="name"]', ''); // Empty name
    await page.fill('input[name="riskPercent"]', '101'); // Invalid risk percentage

    // Should show validation errors
    await expect(page.locator('text=Risk percentage must be between 0 and 100')).toBeVisible();
  });

  test('should handle real-time updates', async ({ page }) => {
    // Mock WebSocket connection for real-time updates
    await page.route('**/ws/trading', async route => {
      // Simulate WebSocket connection
      await route.fulfill({
        status: 101,
        headers: {
          'Upgrade': 'websocket',
          'Connection': 'Upgrade'
        }
      });
    });

    // Mock market data updates
    let priceUpdateCount = 0;
    await page.route('**/api/trading/market/prices', async route => {
      priceUpdateCount++;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          prices: {
            'BTC/USDT': 50000 + priceUpdateCount,
            'ETH/USDT': 3000 + priceUpdateCount
          }
        })
      });
    });

    // Navigate to market data page
    await page.click('text=Market Data');

    // Should display initial prices
    await expect(page.locator('text=50000')).toBeVisible();

    // Simulate price updates (this would normally come from WebSocket)
    await page.waitForTimeout(1000);

    // Should show updated prices
    await expect(page.locator('text=50001')).toBeVisible();
  });

  test('should handle large datasets efficiently', async ({ page }) => {
    // Mock large dataset
    const largeHistory = Array.from({ length: 1000 }, (_, i) => ({
      id: `trade${i}`,
      symbol: 'BTC/USDT',
      side: i % 2 === 0 ? 'long' : 'short',
      size: 0.1,
      entryPrice: 50000 + i,
      exitPrice: 50000 + i + 100,
      pnl: 100,
      date: new Date().toISOString()
    }));

    await page.route('**/api/trading/history', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          history: largeHistory
        })
      });
    });

    // Navigate to analytics page
    await page.click('text=Analytics');

    // Should load and display large dataset efficiently
    await expect(page.locator('text=1000 trades')).toBeVisible();

    // Should have pagination
    await expect(page.locator('button:has-text("Next")')).toBeVisible();
    await expect(page.locator('button:has-text("Previous")')).toBeVisible();
  });

  test('should handle concurrent trading operations', async ({ page }) => {
    let positionCount = 0;
    
    // Mock position creation with delay
    await page.route('**/api/trading/positions', async route => {
      if (route.request().method() === 'POST') {
        positionCount++;
        await new Promise(resolve => setTimeout(resolve, 500));
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            position: {
              id: `position${positionCount}`,
              sessionId: 'session123',
              symbol: 'BTC/USDT',
              side: 'long',
              size: 0.1,
              price: 50000,
              status: 'open',
              createdAt: new Date().toISOString()
            }
          })
        });
      }
    });

    // Navigate to session details
    await page.goto('/trading/sessions/session123');

    // Open multiple positions concurrently
    await page.click('button:has-text("Open Position")');
    await page.fill('input[name="size"]', '0.1');
    await page.fill('input[name="price"]', '50000');
    await page.click('button[type="submit"]');

    // Click again before first request completes
    await page.click('button:has-text("Open Position")');
    await page.fill('input[name="size"]', '0.2');
    await page.fill('input[name="price"]', '50100');
    await page.click('button[type="submit"]');

    // Should handle both requests
    await expect(page.locator('text=Position opened successfully')).toBeVisible();
    await expect(positionCount).toBe(2);
  });
});