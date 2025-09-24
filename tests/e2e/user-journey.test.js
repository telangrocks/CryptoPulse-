/**
 * End-to-End Tests for Critical User Journeys
 * Comprehensive testing of complete user workflows
 */

const puppeteer = require('puppeteer');
const axios = require('axios');

describe('Critical User Journeys', () => {
  let browser;
  let page;
  let baseUrl;

  beforeAll(async () => {
    baseUrl = process.env.E2E_BASE_URL || 'http://localhost:3000';
    browser = await puppeteer.launch({
      headless: process.env.CI === 'true',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  });

  afterAll(async () => {
    if (browser) {
      await browser.close();
    }
  });

  beforeEach(async () => {
    page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    
    // Set up request interception for API mocking if needed
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      // Allow all requests by default
      request.continue();
    });
  });

  afterEach(async () => {
    if (page) {
      await page.close();
    }
  });

  describe('User Registration and Onboarding Journey', () => {
    it('should complete user registration flow', async () => {
      // Navigate to registration page
      await page.goto(`${baseUrl}/register`);

      // Fill registration form
      await page.type('#email', 'test-user@example.com');
      await page.type('#password', 'SecurePassword123!');
      await page.type('#confirmPassword', 'SecurePassword123!');
      await page.type('#username', 'testuser');

      // Submit form
      await page.click('#register-button');

      // Wait for success message or redirect
      await page.waitForSelector('.success-message, .error-message', { timeout: 10000 });

      // Verify success
      const successMessage = await page.$('.success-message');
      expect(successMessage).toBeTruthy();
    });

    it('should handle registration validation errors', async () => {
      await page.goto(`${baseUrl}/register`);

      // Submit form with invalid data
      await page.type('#email', 'invalid-email');
      await page.type('#password', 'weak');
      await page.click('#register-button');

      // Wait for validation errors
      await page.waitForSelector('.error-message', { timeout: 5000 });

      // Verify validation errors are displayed
      const errorMessages = await page.$$eval('.error-message', elements => 
        elements.map(el => el.textContent)
      );
      
      expect(errorMessages.length).toBeGreaterThan(0);
      expect(errorMessages.some(msg => msg.includes('email'))).toBe(true);
      expect(errorMessages.some(msg => msg.includes('password'))).toBe(true);
    });
  });

  describe('User Login and Dashboard Journey', () => {
    beforeEach(async () => {
      // Create test user via API
      try {
        await axios.post(`${baseUrl}/api/auth/register`, {
          email: 'test-user@example.com',
          password: 'SecurePassword123!',
          username: 'testuser'
        });
      } catch (error) {
        // User might already exist, continue
      }
    });

    it('should complete user login and access dashboard', async () => {
      // Navigate to login page
      await page.goto(`${baseUrl}/login`);

      // Fill login form
      await page.type('#email', 'test-user@example.com');
      await page.type('#password', 'SecurePassword123!');

      // Submit form
      await page.click('#login-button');

      // Wait for redirect to dashboard
      await page.waitForNavigation({ waitUntil: 'networkidle0' });

      // Verify dashboard is loaded
      expect(page.url()).toContain('/dashboard');
      
      // Verify dashboard elements
      await page.waitForSelector('.dashboard-header', { timeout: 10000 });
      await page.waitForSelector('.trading-panel', { timeout: 10000 });
      await page.waitForSelector('.portfolio-summary', { timeout: 10000 });
    });

    it('should handle login with invalid credentials', async () => {
      await page.goto(`${baseUrl}/login`);

      // Fill form with invalid credentials
      await page.type('#email', 'test-user@example.com');
      await page.type('#password', 'wrongpassword');

      await page.click('#login-button');

      // Wait for error message
      await page.waitForSelector('.error-message', { timeout: 5000 });

      // Verify error message
      const errorMessage = await page.$eval('.error-message', el => el.textContent);
      expect(errorMessage).toContain('Invalid credentials');
    });
  });

  describe('Trading Journey', () => {
    beforeEach(async () => {
      // Login as test user
      await page.goto(`${baseUrl}/login`);
      await page.type('#email', 'test-user@example.com');
      await page.type('#password', 'SecurePassword123!');
      await page.click('#login-button');
      await page.waitForNavigation({ waitUntil: 'networkidle0' });
    });

    it('should complete market order placement', async () => {
      // Navigate to trading page
      await page.goto(`${baseUrl}/trading`);

      // Wait for trading interface to load
      await page.waitForSelector('.trading-interface', { timeout: 10000 });

      // Select trading pair
      await page.click('.symbol-selector');
      await page.click('[data-symbol="BTC/USDT"]');

      // Select order type
      await page.click('[data-order-type="market"]');

      // Select order side
      await page.click('[data-order-side="buy"]');

      // Enter quantity
      await page.type('#quantity', '0.001');

      // Place order
      await page.click('#place-order-button');

      // Wait for order confirmation
      await page.waitForSelector('.order-confirmation', { timeout: 10000 });

      // Verify order was placed
      const orderId = await page.$eval('.order-confirmation .order-id', el => el.textContent);
      expect(orderId).toBeTruthy();

      // Verify order appears in order history
      await page.waitForSelector('.order-history', { timeout: 5000 });
      const orderInHistory = await page.$eval('.order-history', el => 
        el.textContent.includes(orderId)
      );
      expect(orderInHistory).toBe(true);
    });

    it('should complete limit order placement', async () => {
      await page.goto(`${baseUrl}/trading`);
      await page.waitForSelector('.trading-interface', { timeout: 10000 });

      // Select limit order
      await page.click('[data-order-type="limit"]');

      // Fill order details
      await page.click('[data-symbol="BTC/USDT"]');
      await page.click('[data-order-side="sell"]');
      await page.type('#quantity', '0.001');
      await page.type('#price', '60000');

      // Place order
      await page.click('#place-order-button');

      // Wait for confirmation
      await page.waitForSelector('.order-confirmation', { timeout: 10000 });

      // Verify limit order was placed
      const orderStatus = await page.$eval('.order-confirmation .order-status', el => el.textContent);
      expect(orderStatus).toBe('OPEN');
    });

    it('should handle order validation errors', async () => {
      await page.goto(`${baseUrl}/trading`);
      await page.waitForSelector('.trading-interface', { timeout: 10000 });

      // Try to place invalid order (negative quantity)
      await page.click('[data-symbol="BTC/USDT"]');
      await page.click('[data-order-type="market"]');
      await page.click('[data-order-side="buy"]');
      await page.type('#quantity', '-0.001');

      await page.click('#place-order-button');

      // Wait for validation error
      await page.waitForSelector('.validation-error', { timeout: 5000 });

      // Verify error message
      const errorMessage = await page.$eval('.validation-error', el => el.textContent);
      expect(errorMessage).toContain('quantity');
    });
  });

  describe('Portfolio Management Journey', () => {
    beforeEach(async () => {
      // Login and navigate to portfolio
      await page.goto(`${baseUrl}/login`);
      await page.type('#email', 'test-user@example.com');
      await page.type('#password', 'SecurePassword123!');
      await page.click('#login-button');
      await page.waitForNavigation({ waitUntil: 'networkidle0' });
    });

    it('should view portfolio summary', async () => {
      await page.goto(`${baseUrl}/portfolio`);

      // Wait for portfolio to load
      await page.waitForSelector('.portfolio-summary', { timeout: 10000 });

      // Verify portfolio elements
      const totalValue = await page.$eval('.total-value', el => el.textContent);
      expect(totalValue).toBeTruthy();

      const holdings = await page.$$eval('.holding-item', elements => 
        elements.map(el => el.textContent)
      );
      expect(holdings.length).toBeGreaterThanOrEqual(0);
    });

    it('should view transaction history', async () => {
      await page.goto(`${baseUrl}/portfolio`);

      // Navigate to transaction history
      await page.click('#transaction-history-tab');

      // Wait for transaction history to load
      await page.waitForSelector('.transaction-list', { timeout: 10000 });

      // Verify transaction history elements
      const transactions = await page.$$eval('.transaction-item', elements => 
        elements.map(el => el.textContent)
      );
      expect(Array.isArray(transactions)).toBe(true);
    });
  });

  describe('Settings and Profile Management Journey', () => {
    beforeEach(async () => {
      // Login
      await page.goto(`${baseUrl}/login`);
      await page.type('#email', 'test-user@example.com');
      await page.type('#password', 'SecurePassword123!');
      await page.click('#login-button');
      await page.waitForNavigation({ waitUntil: 'networkidle0' });
    });

    it('should update user profile', async () => {
      await page.goto(`${baseUrl}/settings`);

      // Wait for settings page to load
      await page.waitForSelector('.profile-settings', { timeout: 10000 });

      // Update profile information
      await page.click('#edit-profile-button');
      await page.type('#firstName', 'John');
      await page.type('#lastName', 'Doe');
      await page.select('#timezone', 'America/New_York');

      // Save changes
      await page.click('#save-profile-button');

      // Wait for success message
      await page.waitForSelector('.success-message', { timeout: 5000 });

      // Verify changes were saved
      const firstName = await page.$eval('#firstName', el => el.value);
      expect(firstName).toBe('John');
    });

    it('should update notification preferences', async () => {
      await page.goto(`${baseUrl}/settings`);

      // Navigate to notification settings
      await page.click('#notification-settings-tab');

      // Update notification preferences
      await page.click('#email-notifications');
      await page.click('#push-notifications');

      // Save changes
      await page.click('#save-notifications-button');

      // Wait for success message
      await page.waitForSelector('.success-message', { timeout: 5000 });

      // Verify preferences were saved
      const emailNotifications = await page.$eval('#email-notifications', el => el.checked);
      const pushNotifications = await page.$eval('#push-notifications', el => el.checked);
      
      expect(emailNotifications).toBe(true);
      expect(pushNotifications).toBe(true);
    });
  });

  describe('Security Features Journey', () => {
    beforeEach(async () => {
      // Login
      await page.goto(`${baseUrl}/login`);
      await page.type('#email', 'test-user@example.com');
      await page.type('#password', 'SecurePassword123!');
      await page.click('#login-button');
      await page.waitForNavigation({ waitUntil: 'networkidle0' });
    });

    it('should enable two-factor authentication', async () => {
      await page.goto(`${baseUrl}/security`);

      // Wait for security page to load
      await page.waitForSelector('.security-settings', { timeout: 10000 });

      // Enable 2FA
      await page.click('#enable-2fa-button');

      // Wait for QR code or setup instructions
      await page.waitForSelector('.2fa-setup', { timeout: 10000 });

      // Complete 2FA setup (simplified for testing)
      await page.type('#2fa-code', '123456');
      await page.click('#confirm-2fa-button');

      // Wait for success message
      await page.waitForSelector('.success-message', { timeout: 5000 });

      // Verify 2FA is enabled
      const twoFactorStatus = await page.$eval('.2fa-status', el => el.textContent);
      expect(twoFactorStatus).toContain('Enabled');
    });

    it('should change password', async () => {
      await page.goto(`${baseUrl}/security`);

      // Navigate to password change
      await page.click('#change-password-tab');

      // Fill password change form
      await page.type('#current-password', 'SecurePassword123!');
      await page.type('#new-password', 'NewSecurePassword123!');
      await page.type('#confirm-new-password', 'NewSecurePassword123!');

      // Submit form
      await page.click('#change-password-button');

      // Wait for success message
      await page.waitForSelector('.success-message', { timeout: 5000 });

      // Verify password was changed
      const successMessage = await page.$eval('.success-message', el => el.textContent);
      expect(successMessage).toContain('Password changed successfully');
    });
  });

  describe('Error Handling and Recovery Journey', () => {
    it('should handle network errors gracefully', async () => {
      // Mock network failure
      await page.setRequestInterception(true);
      page.on('request', (request) => {
        if (request.url().includes('/api/')) {
          request.abort();
        } else {
          request.continue();
        }
      });

      await page.goto(`${baseUrl}/login`);

      // Try to login with network failure
      await page.type('#email', 'test-user@example.com');
      await page.type('#password', 'SecurePassword123!');
      await page.click('#login-button');

      // Wait for error handling
      await page.waitForSelector('.network-error, .error-message', { timeout: 10000 });

      // Verify error is displayed
      const errorElement = await page.$('.network-error, .error-message');
      expect(errorElement).toBeTruthy();
    });

    it('should handle session timeout', async () => {
      // Login first
      await page.goto(`${baseUrl}/login`);
      await page.type('#email', 'test-user@example.com');
      await page.type('#password', 'SecurePassword123!');
      await page.click('#login-button');
      await page.waitForNavigation({ waitUntil: 'networkidle0' });

      // Simulate session timeout by clearing cookies
      await page.evaluate(() => {
        document.cookie = 'cryptopulse.sid=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      });

      // Try to access protected page
      await page.goto(`${baseUrl}/dashboard`);

      // Should redirect to login
      await page.waitForNavigation({ waitUntil: 'networkidle0' });
      expect(page.url()).toContain('/login');
    });
  });

  describe('Mobile Responsiveness Journey', () => {
    beforeEach(async () => {
      // Set mobile viewport
      await page.setViewport({ width: 375, height: 667 });
    });

    it('should work on mobile devices', async () => {
      await page.goto(`${baseUrl}/login`);

      // Verify mobile layout
      const loginForm = await page.$('.login-form');
      expect(loginForm).toBeTruthy();

      // Test mobile interactions
      await page.type('#email', 'test-user@example.com');
      await page.type('#password', 'SecurePassword123!');
      await page.click('#login-button');

      // Should work on mobile
      await page.waitForNavigation({ waitUntil: 'networkidle0' });
      expect(page.url()).toContain('/dashboard');
    });

    it('should handle mobile trading interface', async () => {
      // Login on mobile
      await page.goto(`${baseUrl}/login`);
      await page.type('#email', 'test-user@example.com');
      await page.type('#password', 'SecurePassword123!');
      await page.click('#login-button');
      await page.waitForNavigation({ waitUntil: 'networkidle0' });

      // Navigate to trading on mobile
      await page.goto(`${baseUrl}/trading`);

      // Verify mobile trading interface
      await page.waitForSelector('.mobile-trading-interface', { timeout: 10000 });

      // Test mobile trading functionality
      await page.click('[data-symbol="BTC/USDT"]');
      await page.click('[data-order-type="market"]');
      await page.click('[data-order-side="buy"]');
      await page.type('#quantity', '0.001');

      // Should work on mobile
      await page.click('#place-order-button');
      await page.waitForSelector('.order-confirmation', { timeout: 10000 });
    });
  });
});
