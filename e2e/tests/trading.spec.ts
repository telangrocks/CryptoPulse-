// =============================================================================
// Trading E2E Tests - Production Ready
// =============================================================================
// Comprehensive end-to-end tests for trading functionality

import { test, expect } from '@playwright/test';

test.describe('Trading Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.route('**/api/v1/auth/me', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            user: {
              id: 'user123',
              email: 'test@example.com',
              firstName: 'John',
              lastName: 'Doe'
            }
          }
        })
      });
    });

    // Navigate to dashboard
    await page.goto('/dashboard');
  });

  test('should display trading interface', async ({ page }) => {
    // Check if trading components are present
    await expect(page.locator('[data-testid="trade-execution"]')).toBeVisible();
    await expect(page.locator('[data-testid="advanced-charts"]')).toBeVisible();
    await expect(page.locator('[data-testid="performance-analytics"]')).toBeVisible();
  });

  test('should display exchange selection', async ({ page }) => {
    // Check if exchange selection is present
    await expect(page.locator('select[name="exchange"]')).toBeVisible();
    
    // Check if supported exchanges are listed
    await expect(page.locator('option[value="binance"]')).toBeVisible();
    await expect(page.locator('option[value="wazirx"]')).toBeVisible();
    await expect(page.locator('option[value="coindcx"]')).toBeVisible();
  });

  test('should display symbol selection', async ({ page }) => {
    // Select an exchange first
    await page.selectOption('select[name="exchange"]', 'binance');
    
    // Check if symbol selection is present
    await expect(page.locator('select[name="symbol"]')).toBeVisible();
    
    // Check if popular symbols are listed
    await expect(page.locator('option[value="BTCUSDT"]')).toBeVisible();
    await expect(page.locator('option[value="ETHUSDT"]')).toBeVisible();
  });

  test('should display trading form', async ({ page }) => {
    // Check if trading form elements are present
    await expect(page.locator('input[name="amount"]')).toBeVisible();
    await expect(page.locator('input[name="price"]')).toBeVisible();
    await expect(page.locator('select[name="side"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should validate trading form inputs', async ({ page }) => {
    // Try to submit empty form
    await page.click('button[type="submit"]');
    
    // Check for validation errors
    await expect(page.locator('text=Amount is required')).toBeVisible();
    await expect(page.locator('text=Price is required')).toBeVisible();
  });

  test('should validate amount input', async ({ page }) => {
    // Test invalid amount
    await page.fill('input[name="amount"]', '0.005');
    await page.click('button[type="submit"]');
    
    // Check for amount validation error
    await expect(page.locator('text=Amount must be at least 0.01')).toBeVisible();
  });

  test('should validate price input', async ({ page }) => {
    // Test invalid price
    await page.fill('input[name="price"]', '-100');
    await page.click('button[type="submit"]');
    
    // Check for price validation error
    await expect(page.locator('text=Price must be positive')).toBeVisible();
  });

  test('should execute buy order successfully', async ({ page }) => {
    // Mock successful trade execution
    await page.route('**/api/v1/trades/execute', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            tradeId: 'trade123',
            exchange: 'binance',
            symbol: 'BTCUSDT',
            side: 'buy',
            amount: 0.1,
            price: 50000,
            status: 'completed',
            timestamp: new Date().toISOString()
          }
        })
      });
    });

    // Fill in trading form
    await page.selectOption('select[name="exchange"]', 'binance');
    await page.selectOption('select[name="symbol"]', 'BTCUSDT');
    await page.selectOption('select[name="side"]', 'buy');
    await page.fill('input[name="amount"]', '0.1');
    await page.fill('input[name="price"]', '50000');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Check for success message
    await expect(page.locator('text=Trade executed successfully')).toBeVisible();
    
    // Check if trade details are displayed
    await expect(page.locator('text=Trade ID: trade123')).toBeVisible();
    await expect(page.locator('text=BTCUSDT')).toBeVisible();
    await expect(page.locator('text=Buy')).toBeVisible();
  });

  test('should execute sell order successfully', async ({ page }) => {
    // Mock successful trade execution
    await page.route('**/api/v1/trades/execute', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            tradeId: 'trade456',
            exchange: 'binance',
            symbol: 'ETHUSDT',
            side: 'sell',
            amount: 1.0,
            price: 3000,
            status: 'completed',
            timestamp: new Date().toISOString()
          }
        })
      });
    });

    // Fill in trading form
    await page.selectOption('select[name="exchange"]', 'binance');
    await page.selectOption('select[name="symbol"]', 'ETHUSDT');
    await page.selectOption('select[name="side"]', 'sell');
    await page.fill('input[name="amount"]', '1.0');
    await page.fill('input[name="price"]', '3000');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Check for success message
    await expect(page.locator('text=Trade executed successfully')).toBeVisible();
    
    // Check if trade details are displayed
    await expect(page.locator('text=Trade ID: trade456')).toBeVisible();
    await expect(page.locator('text=ETHUSDT')).toBeVisible();
    await expect(page.locator('text=Sell')).toBeVisible();
  });

  test('should handle trade execution failure', async ({ page }) => {
    // Mock failed trade execution
    await page.route('**/api/v1/trades/execute', async route => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'Insufficient balance'
        })
      });
    });

    // Fill in trading form
    await page.selectOption('select[name="exchange"]', 'binance');
    await page.selectOption('select[name="symbol"]', 'BTCUSDT');
    await page.selectOption('select[name="side"]', 'buy');
    await page.fill('input[name="amount"]', '0.1');
    await page.fill('input[name="price"]', '50000');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Check for error message
    await expect(page.locator('text=Insufficient balance')).toBeVisible();
  });

  test('should display trading history', async ({ page }) => {
    // Mock trading history
    await page.route('**/api/v1/trades/history', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            trades: [
              {
                tradeId: 'trade1',
                exchange: 'binance',
                symbol: 'BTCUSDT',
                side: 'buy',
                amount: 0.1,
                price: 50000,
                status: 'completed',
                timestamp: new Date().toISOString()
              },
              {
                tradeId: 'trade2',
                exchange: 'binance',
                symbol: 'ETHUSDT',
                side: 'sell',
                amount: 1.0,
                price: 3000,
                status: 'completed',
                timestamp: new Date().toISOString()
              }
            ]
          }
        })
      });
    });

    // Navigate to trading history
    await page.click('text=Trading History');
    
    // Check if trades are displayed
    await expect(page.locator('text=Trade ID: trade1')).toBeVisible();
    await expect(page.locator('text=Trade ID: trade2')).toBeVisible();
    await expect(page.locator('text=BTCUSDT')).toBeVisible();
    await expect(page.locator('text=ETHUSDT')).toBeVisible();
  });

  test('should display portfolio summary', async ({ page }) => {
    // Mock portfolio data
    await page.route('**/api/v1/portfolio/summary', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            totalValue: 10000,
            totalInvested: 8000,
            totalProfit: 2000,
            profitPercentage: 25,
            assets: [
              {
                symbol: 'BTC',
                amount: 0.1,
                value: 5000,
                profit: 1000
              },
              {
                symbol: 'ETH',
                amount: 1.0,
                value: 3000,
                profit: 500
              }
            ]
          }
        })
      });
    });

    // Navigate to portfolio
    await page.click('text=Portfolio');
    
    // Check if portfolio data is displayed
    await expect(page.locator('text=Total Value: $10,000')).toBeVisible();
    await expect(page.locator('text=Total Profit: $2,000')).toBeVisible();
    await expect(page.locator('text=Profit: 25%')).toBeVisible();
  });

  test('should handle real-time price updates', async ({ page }) => {
    // Mock WebSocket connection for real-time prices
    await page.route('**/ws/prices', async route => {
      // Simulate WebSocket message
      const ws = new WebSocket('ws://localhost:1337/ws/prices');
      ws.onopen = () => {
        ws.send(JSON.stringify({
          type: 'price_update',
          symbol: 'BTCUSDT',
          price: 50000,
          timestamp: new Date().toISOString()
        }));
      };
    });

    // Check if price is displayed
    await expect(page.locator('text=BTCUSDT')).toBeVisible();
    await expect(page.locator('text=$50,000')).toBeVisible();
  });

  test('should handle network errors gracefully', async ({ page }) => {
    // Mock network error
    await page.route('**/api/v1/trades/execute', async route => {
      await route.abort('failed');
    });

    // Fill in trading form
    await page.selectOption('select[name="exchange"]', 'binance');
    await page.selectOption('select[name="symbol"]', 'BTCUSDT');
    await page.selectOption('select[name="side"]', 'buy');
    await page.fill('input[name="amount"]', '0.1');
    await page.fill('input[name="price"]', '50000');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Check for network error message
    await expect(page.locator('text=Network error')).toBeVisible();
  });

  test('should handle session timeout during trading', async ({ page }) => {
    // Mock session timeout
    await page.route('**/api/v1/trades/execute', async route => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'Session expired'
        })
      });
    });

    // Fill in trading form
    await page.selectOption('select[name="exchange"]', 'binance');
    await page.selectOption('select[name="symbol"]', 'BTCUSDT');
    await page.selectOption('select[name="side"]', 'buy');
    await page.fill('input[name="amount"]', '0.1');
    await page.fill('input[name="price"]', '50000');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Check if redirected to login page
    await expect(page).toHaveURL('/auth');
  });
});
