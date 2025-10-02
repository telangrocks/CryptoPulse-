/**
 * Service Worker for CryptoPulse Trading Bot
 * World-class PWA implementation with advanced caching strategies
 */

// Cache version - automatically updated during build
const CACHE_VERSION = process.env.SW_VERSION || '1.0.0';
const CACHE_NAME = `cryptopulse-v${CACHE_VERSION}`;
const STATIC_CACHE = `cryptopulse-static-v${CACHE_VERSION}`;
const DYNAMIC_CACHE = `cryptopulse-dynamic-v${CACHE_VERSION}`;
const API_CACHE = `cryptopulse-api-v${CACHE_VERSION}`;

// Cache configuration
const CACHE_CONFIG = {
  // Maximum cache sizes (in MB)
  STATIC_CACHE_SIZE: 50, // 50MB
  DYNAMIC_CACHE_SIZE: 100, // 100MB
  API_CACHE_SIZE: 25, // 25MB

  // Cache expiration times (in milliseconds)
  STATIC_EXPIRY: 7 * 24 * 60 * 60 * 1000, // 7 days
  DYNAMIC_EXPIRY: 24 * 60 * 60 * 1000, // 1 day
  API_EXPIRY: 5 * 60 * 1000, // 5 minutes

  // Cleanup thresholds
  CLEANUP_THRESHOLD: 0.8, // Clean when 80% full
  MAX_ENTRIES: 1000, // Maximum number of entries per cache
};

// Files to cache immediately
const STATIC_FILES = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg',
  '/sw.js',
];

// API endpoints that should be cached
const API_ENDPOINTS = [
  '/api/health',
  '/api/config',
  '/api/prices',
];

// Cache strategies
const CACHE_STRATEGIES = {
  // Static files - Cache First
  STATIC_FIRST: 'static-first',
  // API calls - Network First with fallback
  NETWORK_FIRST: 'network-first',
  // Images - Cache First with validation
  CACHE_FIRST: 'cache-first',
  // Real-time data - Network Only
  NETWORK_ONLY: 'network-only',
};

// Install event - cache static files
self.addEventListener('install', (event) => {
  if (typeof console !== 'undefined') {
    console.log('[SW] Installing version:', CACHE_VERSION);
  }

  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        return cache.addAll(STATIC_FILES);
      })
      .then(() => {
        return self.skipWaiting();
      })
      .catch((error) => {
        if (typeof console !== 'undefined') {
          console.error('[SW] Installation failed:', error);
        }
        throw error;
      }),
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  if (typeof console !== 'undefined') {
    console.log('[SW] Activating version:', CACHE_VERSION);
  }

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE &&
                cacheName !== DYNAMIC_CACHE &&
                cacheName !== API_CACHE) {
              if (typeof console !== 'undefined') {
                console.log('[SW] Deleting old cache:', cacheName);
              }
              return caches.delete(cacheName);
            }
          }),
        );
      })
      .then(() => {
        return self.clients.claim();
      })
      .catch((error) => {
        if (typeof console !== 'undefined') {
          console.error('[SW] Activation failed:', error);
        }
        throw error;
      }),
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and other non-http requests
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Determine cache strategy based on request type
  const strategy = getCacheStrategy(request);

  event.respondWith(handleRequest(request, strategy));
});

// Determine cache strategy for different types of requests
function getCacheStrategy(request) {
  const url = new URL(request.url);

  // Static assets (JS, CSS, images)
  if (url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|woff|woff2|ttf)$/)) {
    return CACHE_STRATEGIES.CACHE_FIRST;
  }

  // API endpoints
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/functions/')) {
    // Real-time endpoints that shouldn't be cached
    if (url.pathname.includes('/realtime/') || url.pathname.includes('/stream/')) {
      return CACHE_STRATEGIES.NETWORK_ONLY;
    }

    // Check if it's a cacheable API endpoint
    const isCacheable = API_ENDPOINTS.some(endpoint => url.pathname.startsWith(endpoint));
    return isCacheable ? CACHE_STRATEGIES.NETWORK_FIRST : CACHE_STRATEGIES.NETWORK_ONLY;
  }

  // HTML pages
  if (request.headers.get('accept')?.includes('text/html')) {
    return CACHE_STRATEGIES.NETWORK_FIRST;
  }

  // Default to network first
  return CACHE_STRATEGIES.NETWORK_FIRST;
}

// Handle requests based on cache strategy
async function handleRequest(request, strategy) {
  try {
    switch (strategy) {
      case CACHE_STRATEGIES.CACHE_FIRST:
        return await cacheFirst(request);

      case CACHE_STRATEGIES.NETWORK_FIRST:
        return await networkFirst(request);

      case CACHE_STRATEGIES.NETWORK_ONLY:
        return await networkOnly(request);

      default:
        return await networkFirst(request);
    }
  } catch (error) {
    console.error('Error handling request:', error);

    // Fallback to offline page for navigation requests
    if (request.headers.get('accept')?.includes('text/html')) {
      return new Response(
        `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Offline - CryptoPulse</title>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
              .offline { color: #666; }
            </style>
          </head>
          <body>
            <div class="offline">
              <h1>You're offline</h1>
              <p>CryptoPulse requires an internet connection to function.</p>
              <p>Please check your connection and try again.</p>
            </div>
          </body>
        </html>
        `,
        { headers: { 'Content-Type': 'text/html' } },
      );
    }

    throw error;
  }
}

// Cache First strategy - check cache first, then network
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);

  if (cachedResponse) {
    // Update last accessed time
    const cache = await getCacheForRequest(request);
    await updateLastAccessed(cache, request);

    // Update cache in background if stale
    updateCacheInBackground(request);
    return cachedResponse;
  }

  // Not in cache, fetch from network
  const networkResponse = await fetch(request);

  // Cache successful responses with metadata
  if (networkResponse.ok) {
    const cache = await getCacheForRequest(request);
    const responseWithMetadata = addCacheMetadata(networkResponse.clone(), 'network');
    await cache.put(request, responseWithMetadata);

    // Clean cache if needed
    const cacheName = cache === await caches.open(STATIC_CACHE) ? STATIC_CACHE :
      cache === await caches.open(API_CACHE) ? API_CACHE : DYNAMIC_CACHE;
    const maxSize = cacheName === STATIC_CACHE ? CACHE_CONFIG.STATIC_CACHE_SIZE :
      cacheName === API_CACHE ? CACHE_CONFIG.API_CACHE_SIZE : CACHE_CONFIG.DYNAMIC_CACHE_SIZE;
    await cleanCacheBySize(cacheName, maxSize);
  }

  return networkResponse;
}

// Network First strategy - try network first, fallback to cache
async function networkFirst(request) {
  try {
    // Add timeout to prevent hanging requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const networkResponse = await fetch(request, {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await getCacheForRequest(request);
      const responseWithMetadata = addCacheMetadata(networkResponse.clone(), 'network');
      cache.put(request, responseWithMetadata);
    }

    return networkResponse;
  } catch (error) {
    // Network failed, try cache
    const cachedResponse = await caches.match(request);

    if (cachedResponse) {
      // Update last accessed time
      const cache = await getCacheForRequest(request);
      await updateLastAccessed(cache, request);
      return cachedResponse;
    }

    throw error;
  }
}

// Network Only strategy - always fetch from network
async function networkOnly(request) {
  return await fetch(request);
}

// Update cache in background for stale content
async function updateCacheInBackground(request) {
  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      const cache = await getCacheForRequest(request);
      cache.put(request, networkResponse);
    }
  } catch (error) {
    // Silently fail background updates
    console.warn('Background cache update failed:', error);
  }
}

// Get appropriate cache for request type
async function getCacheForRequest(request) {
  const url = new URL(request.url);

  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/functions/')) {
    return await caches.open(API_CACHE);
  }

  return await caches.open(DYNAMIC_CACHE);
}

// Cache size management - optimized for performance
async function getCacheSize(cacheName) {
  try {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();

    // Use Promise.all for parallel processing to avoid blocking
    const sizePromises = keys.map(async (key) => {
      try {
        const response = await cache.match(key);
        if (response && response.headers.get('content-length')) {
          return parseInt(response.headers.get('content-length'));
        }
        return 0;
      } catch (error) {
        console.warn('Error getting size for key:', key.url, error);
        return 0;
      }
    });

    const sizes = await Promise.all(sizePromises);
    const totalSize = sizes.reduce((sum, size) => sum + size, 0);

    return totalSize / (1024 * 1024); // Return size in MB
  } catch (error) {
    console.warn('Error calculating cache size:', error);
    return 0;
  }
}

// Clean expired entries from cache
async function cleanExpiredEntries(cacheName, expiryTime) {
  try {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    const now = Date.now();

    for (const key of keys) {
      const response = await cache.match(key);
      if (response) {
        const cacheDate = response.headers.get('sw-cache-date');
        if (cacheDate && (now - parseInt(cacheDate)) > expiryTime) {
          await cache.delete(key);
          console.log('Deleted expired cache entry:', key.url);
        }
      }
    }
  } catch (error) {
    console.warn('Error cleaning expired entries:', error);
  }
}

// Clean cache by size (LRU strategy)
async function cleanCacheBySize(cacheName, maxSizeMB) {
  try {
    const currentSize = await getCacheSize(cacheName);
    if (currentSize <= maxSizeMB) return;

    const cache = await caches.open(cacheName);
    const keys = await cache.keys();

    // Sort by last accessed time (approximated by response date)
    const entries = [];
    for (const key of keys) {
      const response = await cache.match(key);
      if (response) {
        const lastAccessed = response.headers.get('sw-last-accessed') || '0';
        entries.push({
          key,
          lastAccessed: parseInt(lastAccessed),
          size: (await response.blob()).size,
        });
      }
    }

    // Sort by last accessed (oldest first)
    entries.sort((a, b) => a.lastAccessed - b.lastAccessed);

    // Remove oldest entries until under size limit
    let removedSize = 0;
    const targetSize = maxSizeMB * CACHE_CONFIG.CLEANUP_THRESHOLD * 1024 * 1024;

    for (const entry of entries) {
      if (currentSize * 1024 * 1024 - removedSize <= targetSize) break;

      await cache.delete(entry.key);
      removedSize += entry.size;
      console.log('Removed cache entry due to size limit:', entry.key.url);
    }
  } catch (error) {
    console.warn('Error cleaning cache by size:', error);
  }
}

// Add cache metadata to response
function addCacheMetadata(response, cacheType) {
  const headers = new Headers(response.headers);
  headers.set('sw-cache-date', Date.now().toString());
  headers.set('sw-last-accessed', Date.now().toString());
  headers.set('sw-cache-type', cacheType);

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: headers,
  });
}

// Update last accessed time
async function updateLastAccessed(cache, request) {
  try {
    const response = await cache.match(request);
    if (response) {
      const newResponse = addCacheMetadata(response, 'updated');
      await cache.put(request, newResponse);
    }
  } catch (error) {
    console.warn('Error updating last accessed time:', error);
  }
}

// Background sync for failed requests
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  // Implement background sync logic for failed requests
  console.log('Performing background sync...');
}

// Periodic cache cleanup
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CLEANUP_CACHE') {
    event.waitUntil(performCacheCleanup());
  }
});

async function performCacheCleanup() {
  console.log('Performing periodic cache cleanup...');

  try {
    // Clean expired entries
    await cleanExpiredEntries(STATIC_CACHE, CACHE_CONFIG.STATIC_EXPIRY);
    await cleanExpiredEntries(DYNAMIC_CACHE, CACHE_CONFIG.DYNAMIC_EXPIRY);
    await cleanExpiredEntries(API_CACHE, CACHE_CONFIG.API_EXPIRY);

    // Clean by size
    await cleanCacheBySize(STATIC_CACHE, CACHE_CONFIG.STATIC_CACHE_SIZE);
    await cleanCacheBySize(DYNAMIC_CACHE, CACHE_CONFIG.DYNAMIC_CACHE_SIZE);
    await cleanCacheBySize(API_CACHE, CACHE_CONFIG.API_CACHE_SIZE);

    console.log('Cache cleanup completed');
  } catch (error) {
    console.error('Error during cache cleanup:', error);
  }
}

// Schedule periodic cleanup (every hour) - with cleanup on unload
let cleanupInterval = null;

function startPeriodicCleanup() {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
  }

  cleanupInterval = setInterval(() => {
    performCacheCleanup();
  }, 60 * 60 * 1000);
}

// Start cleanup on activation
startPeriodicCleanup();

// Push notifications
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();

    const options = {
      body: data.body,
      icon: '/icon.svg',
      badge: '/icon.svg',
      tag: data.tag || 'cryptopulse-notification',
      data: data.data,
      actions: data.actions || [],
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'CryptoPulse', options),
    );
  }
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow('/'),
    );
  }
});

// Message handling from main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'GET_CACHE_STATUS') {
    event.ports[0].postMessage({
      cacheNames: Array.from(caches.keys()),
    });
  }
});

// Service Worker loaded successfully
if (typeof console !== 'undefined') {
  console.log('[SW] Loaded version:', CACHE_VERSION);
}
