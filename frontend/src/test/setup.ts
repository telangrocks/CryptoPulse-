import '@testing-library/jest-dom'
import { expect, afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import * as matchers from '@testing-library/jest-dom/matchers'

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers)

// Cleanup after each test
afterEach(() => {
  cleanup()
})

// Mock environment variables
Object.defineProperty(import.meta, 'env', {
  value: {
    VITE_BACK4APP_APP_ID: 'test-app-id',
    VITE_BACK4APP_CLIENT_KEY: 'test-client-key',
    VITE_BACK4APP_MASTER_KEY: 'test-master-key',
    VITE_BACK4APP_SERVER_URL: 'https://test.back4app.com',
    VITE_APP_NAME: 'CryptoPulse Test',
    VITE_APP_VERSION: '2.0.0',
    VITE_APP_ENVIRONMENT: 'test'
  },
  writable: true
})

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {}
  })
})

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  observe() {}
  disconnect() {}
  unobserve() {}
}

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  observe() {}
  disconnect() {}
  unobserve() {}
}