// =============================================================================
// Authentication E2E Tests - Production Ready
// =============================================================================
// Comprehensive end-to-end tests for authentication flow

import { test, expect } from '@playwright/test';

// Test data
const testUser = {
  email: 'test@cryptopulse.com',
  password: 'SecurePassword123!',
  name: 'Test User'
};

const existingUser = {
  email: 'existing@cryptopulse.com',
  password: 'ExistingPassword123!',
  name: 'Existing User'
};

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage and sessionStorage
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    
    // Navigate to the login page before each test
    await page.goto('/auth');
  });

  test('should display login form', async ({ page }) => {
    // Check if login form elements are present
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    
    // Check for login form title
    await expect(page.locator('h1, h2')).toContainText(/login|sign in/i);
  });

  test('should show validation errors for empty fields', async ({ page }) => {
    // Try to submit empty form
    await page.click('button[type="submit"]');
    
    // Check for validation errors
    await expect(page.locator('text=Email is required')).toBeVisible();
    await expect(page.locator('text=Password is required')).toBeVisible();
  });

  test('should show validation error for invalid email', async ({ page }) => {
    // Fill in invalid email
    await page.fill('input[type="email"]', 'invalid-email');
    await page.fill('input[type="password"]', 'password123');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Check for email validation error
    await expect(page.locator('text=Invalid email format')).toBeVisible();
  });

  test('should show validation error for weak password', async ({ page }) => {
    // Fill in weak password
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'weak');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Check for password validation error
    await expect(page.locator('text=Password must be at least 8 characters')).toBeVisible();
  });

  test('should handle login with valid credentials', async ({ page }) => {
    // Mock successful login response
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

    // Fill in valid credentials
    await page.fill('input[type="email"]', testUser.email);
    await page.fill('input[type="password"]', testUser.password);
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Wait for redirect to dashboard
    await expect(page).toHaveURL('/dashboard');
    
    // Check if user is logged in
    await expect(page.locator('text=Test User')).toBeVisible();
  });

  test('should handle login with invalid credentials', async ({ page }) => {
    // Mock failed login response
    await page.route('**/api/auth/login', async route => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'Invalid credentials'
        })
      });
    });

    // Fill in invalid credentials
    await page.fill('input[type="email"]', testUser.email);
    await page.fill('input[type="password"]', 'WrongPassword123!');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Check for error message
    await expect(page.locator('text=Invalid credentials')).toBeVisible();
    
    // Ensure user stays on login page
    await expect(page).toHaveURL('/auth');
  });

  test('should navigate to registration page', async ({ page }) => {
    // Click on registration link
    await page.click('text=Sign up');
    
    // Check if redirected to registration page
    await expect(page).toHaveURL('/auth/register');
    
    // Check if registration form is present
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('input[name="firstName"]')).toBeVisible();
    await expect(page.locator('input[name="lastName"]')).toBeVisible();
  });

  test('should handle registration with valid data', async ({ page }) => {
    // Navigate to registration page
    await page.goto('/auth/register');
    
    // Mock successful registration response
    await page.route('**/api/auth/register', async route => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          user: {
            id: 'user123',
            email: 'newuser@example.com',
            name: 'Jane Smith'
          },
          tokens: {
            accessToken: 'mock-access-token',
            refreshToken: 'mock-refresh-token'
          }
        })
      });
    });

    // Fill in registration form
    await page.fill('input[type="email"]', 'newuser@example.com');
    await page.fill('input[type="password"]', 'SecurePass123!');
    await page.fill('input[name="name"]', 'Jane Smith');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Wait for redirect to dashboard
    await expect(page).toHaveURL('/dashboard');
    
    // Check if user is logged in
    await expect(page.locator('text=Jane Smith')).toBeVisible();
  });

  test('should handle registration with existing email', async ({ page }) => {
    // Navigate to registration page
    await page.goto('/auth/register');
    
    // Mock failed registration response
    await page.route('**/api/auth/register', async route => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'User already exists with this email'
        })
      });
    });

    // Fill in registration form with existing email
    await page.fill('input[type="email"]', 'existing@example.com');
    await page.fill('input[type="password"]', 'SecurePass123!');
    await page.fill('input[name="name"]', 'Jane Smith');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Check for error message
    await expect(page.locator('text=User already exists with this email')).toBeVisible();
    
    // Ensure user stays on registration page
    await expect(page).toHaveURL('/auth/register');
  });

  test('should handle logout', async ({ page }) => {
    // First login
    await page.goto('/auth');
    
    // Mock successful login
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

    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'SecurePass123!');
    await page.click('button[type="submit"]');
    
    // Wait for dashboard
    await expect(page).toHaveURL('/dashboard');
    
    // Mock logout response
    await page.route('**/api/auth/logout', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Logout successful'
        })
      });
    });

    // Click logout button
    await page.click('button:has-text("Logout")');
    
    // Check if redirected to login page
    await expect(page).toHaveURL('/auth');
    
    // Check if user is logged out
    await expect(page.locator('text=Test User')).not.toBeVisible();
  });

  test('should handle network errors gracefully', async ({ page }) => {
    // Mock network error
    await page.route('**/api/auth/login', async route => {
      await route.abort('failed');
    });

    // Fill in credentials
    await page.fill('input[type="email"]', testUser.email);
    await page.fill('input[type="password"]', testUser.password);
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Check for network error message
    await expect(page.locator('text=Network error')).toBeVisible();
  });

  test('should handle session timeout', async ({ page }) => {
    // First login
    await page.goto('/auth');
    
    // Mock successful login
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

    await page.fill('input[type="email"]', testUser.email);
    await page.fill('input[type="password"]', testUser.password);
    await page.click('button[type="submit"]');
    
    // Wait for dashboard
    await expect(page).toHaveURL('/dashboard');
    
    // Mock session timeout
    await page.route('**/api/**', async route => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'Session expired'
        })
      });
    });

    // Try to access protected resource
    await page.goto('/dashboard');
    
    // Check if redirected to login page
    await expect(page).toHaveURL('/auth');
  });

  test('should handle password reset flow', async ({ page }) => {
    // Navigate to login page
    await page.goto('/auth');
    
    // Click forgot password link
    await page.click('text=Forgot Password?');
    
    // Should navigate to password reset page
    await expect(page).toHaveURL('/auth/forgot-password');
    
    // Mock password reset request
    await page.route('**/api/auth/password-reset-request', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Password reset email sent'
        })
      });
    });

    // Fill email
    await page.fill('input[type="email"]', testUser.email);
    
    // Submit
    await page.click('button[type="submit"]');
    
    // Check success message
    await expect(page.locator('text=Password reset email sent')).toBeVisible();
  });

  test('should handle MFA setup flow', async ({ page }) => {
    // Mock login with MFA required
    await page.route('**/api/auth/login', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          requiresMFA: true,
          mfaToken: 'mfa-token'
        })
      });
    });

    // Fill login form
    await page.fill('input[type="email"]', testUser.email);
    await page.fill('input[type="password"]', testUser.password);
    await page.click('button[type="submit"]');
    
    // Should show MFA form
    await expect(page.locator('input[name="mfaCode"]')).toBeVisible();
    
    // Mock MFA verification
    await page.route('**/api/auth/verify-mfa', async route => {
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

    // Fill MFA code
    await page.fill('input[name="mfaCode"]', '123456');
    await page.click('button[type="submit"]');
    
    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('text=Test User')).toBeVisible();
  });

  test('should handle concurrent login attempts', async ({ page }) => {
    // Mock slow login response
    await page.route('**/api/auth/login', async route => {
      await new Promise(resolve => setTimeout(resolve, 1000));
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

    // Fill login form
    await page.fill('input[type="email"]', testUser.email);
    await page.fill('input[type="password"]', testUser.password);
    
    // Click submit multiple times quickly
    await page.click('button[type="submit"]');
    await page.click('button[type="submit"]');
    await page.click('button[type="submit"]');
    
    // Should only process one request
    await expect(page).toHaveURL('/dashboard');
  });

  test('should persist authentication state across page reloads', async ({ page }) => {
    // Mock successful login
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

    // Mock profile endpoint
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
    await page.fill('input[type="email"]', testUser.email);
    await page.fill('input[type="password"]', testUser.password);
    await page.click('button[type="submit"]');
    
    // Wait for dashboard
    await expect(page).toHaveURL('/dashboard');
    
    // Reload page
    await page.reload();
    
    // Should still be logged in
    await expect(page.locator('text=Test User')).toBeVisible();
    await expect(page).toHaveURL('/dashboard');
  });

  test('should handle invalid token on page load', async ({ page }) => {
    // Set invalid token in localStorage
    await page.evaluate(() => {
      localStorage.setItem('authToken', 'invalid-token');
    });

    // Mock profile endpoint to return 401
    await page.route('**/api/auth/profile', async route => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'Invalid token'
        })
      });
    });

    // Navigate to dashboard
    await page.goto('/dashboard');
    
    // Should redirect to login
    await expect(page).toHaveURL('/auth');
    
    // Should clear invalid token
    const token = await page.evaluate(() => localStorage.getItem('authToken'));
    expect(token).toBeNull();
  });
});
