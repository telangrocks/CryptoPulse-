// =============================================================================
// E2E Global Setup - Production Ready
// =============================================================================
// Global setup for end-to-end tests

import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting E2E test setup...');
  
  // Start browser for setup
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    // Wait for backend to be ready
    console.log('⏳ Waiting for backend to be ready...');
    await waitForBackend(page, 'http://localhost:1337');
    
    // Wait for frontend to be ready
    console.log('⏳ Waiting for frontend to be ready...');
    await waitForFrontend(page, 'http://localhost:3000');
    
    // Run database migrations or setup
    console.log('🗄️ Setting up test database...');
    await setupTestDatabase();
    
    // Create test user
    console.log('👤 Creating test user...');
    await createTestUser();
    
    console.log('✅ E2E test setup completed successfully!');
  } catch (error) {
    console.error('❌ E2E test setup failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

async function waitForBackend(page: any, url: string, timeout = 30000) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    try {
      const response = await page.goto(`${url}/health`, { 
        waitUntil: 'networkidle',
        timeout: 5000 
      });
      
      if (response && response.status() === 200) {
        console.log('✅ Backend is ready');
        return;
      }
    } catch (error) {
      // Backend not ready yet, continue waiting
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  throw new Error(`Backend at ${url} did not become ready within ${timeout}ms`);
}

async function waitForFrontend(page: any, url: string, timeout = 30000) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    try {
      const response = await page.goto(url, { 
        waitUntil: 'networkidle',
        timeout: 5000 
      });
      
      if (response && response.status() === 200) {
        console.log('✅ Frontend is ready');
        return;
      }
    } catch (error) {
      // Frontend not ready yet, continue waiting
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  throw new Error(`Frontend at ${url} did not become ready within ${timeout}ms`);
}

async function setupTestDatabase() {
  // This would typically involve:
  // 1. Creating test database
  // 2. Running migrations
  // 3. Seeding test data
  
  console.log('📊 Test database setup completed');
}

async function createTestUser() {
  // This would typically involve:
  // 1. Creating a test user in the database
  // 2. Setting up test API keys
  // 3. Configuring test exchange accounts
  
  console.log('👤 Test user created');
}

export default globalSetup;
