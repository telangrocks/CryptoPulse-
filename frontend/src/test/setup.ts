import { expect, afterEach, vi, beforeAll, afterAll } from 'vitest'
import { cleanup } from '@testing-library/react'
import * as matchers from '@testing-library/jest-dom/matchers'

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers)

// Cleanup after each test case
afterEach(() => {
  cleanup()
})

// Mock Web Crypto API for tests
Object.defineProperty(global, 'crypto', {
  value: {
    subtle: {
      importKey: vi.fn(),
      encrypt: vi.fn(),
      decrypt: vi.fn(),
      deriveBits: vi.fn(),
    },
    getRandomValues: vi.fn((arr) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256)
      }
      return arr
    }),
  },
})

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

// Mock sessionStorage
const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
})

// Mock fetch
global.fetch = vi.fn()

// Mock WebSocket
global.WebSocket = vi.fn(() => ({
  close: vi.fn(),
  send: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  readyState: WebSocket.OPEN,
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3,
}))

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock ResizeObserver
global.ResizeObserver = vi.fn(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock environment variables
vi.mock('import.meta.env', () => ({
  VITE_BACK4APP_APP_ID: 'test-app-id',
  VITE_BACK4APP_CLIENT_KEY: 'test-client-key',
  VITE_BACK4APP_MASTER_KEY: 'test-master-key',
  VITE_BACK4APP_SERVER_URL: 'https://test.parseapi.back4app.com/parse',
  VITE_ENCRYPTION_KEY: 'test-encryption-key-32-chars',
  VITE_CASHFREE_MODE: 'sandbox',
  VITE_CASHFREE_SANDBOX_APP_ID: 'test-sandbox-app-id',
  VITE_CASHFREE_LIVE_APP_ID: 'test-live-app-id',
}))

// Suppress console errors in tests
const originalError = console.error
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is no longer supported')
    ) {
      return
    }
    originalError.call(console, ...args)
  }
})

afterAll(() => {
  console.error = originalError
})
