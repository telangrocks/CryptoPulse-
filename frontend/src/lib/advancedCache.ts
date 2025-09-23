/**
 * Advanced caching system with TTL, invalidation, and persistence
 */

interface CacheEntry<T = any> {
  data: T
  timestamp: number
  ttl: number
  key: string
}

interface CacheOptions {
  ttl?: number // Time to live in milliseconds
  maxSize?: number // Maximum number of entries
  persist?: boolean // Whether to persist to localStorage
  strategy?: 'lru' | 'fifo' | 'ttl' // Eviction strategy
}

class AdvancedCache {
  private cache = new Map<string, CacheEntry>()
  private maxSize: number
  private strategy: 'lru' | 'fifo' | 'ttl'
  private persist: boolean
  private defaultTTL: number

  constructor(options: CacheOptions = {}) {
    this.maxSize = options.maxSize || 1000
    this.strategy = options.strategy || 'lru'
    this.persist = options.persist || false
    this.defaultTTL = options.ttl || 5 * 60 * 1000 // 5 minutes

    if (this.persist) {
      this.loadFromStorage()
    }
  }

  set<T>(key: string, data: T, ttl?: number): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
      key
    }

    // Remove existing entry if it exists
    if (this.cache.has(key)) {
      this.cache.delete(key)
    }

    // Check if we need to evict entries
    if (this.cache.size >= this.maxSize) {
      this.evict()
    }

    this.cache.set(key, entry)

    if (this.persist) {
      this.saveToStorage()
    }
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    
    if (!entry) {
      return null
    }

    // Check if entry has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      if (this.persist) {
        this.saveToStorage()
      }
      return null
    }

    // Update access time for LRU
    if (this.strategy === 'lru') {
      entry.timestamp = Date.now()
    }

    return entry.data
  }

  has(key: string): boolean {
    const entry = this.cache.get(key)
    if (!entry) return false

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      if (this.persist) {
        this.saveToStorage()
      }
      return false
    }

    return true
  }

  delete(key: string): boolean {
    const deleted = this.cache.delete(key)
    if (this.persist) {
      this.saveToStorage()
    }
    return deleted
  }

  clear(): void {
    this.cache.clear()
    if (this.persist) {
      localStorage.removeItem('cryptopulse_cache')
    }
  }

  keys(): string[] {
    return Array.from(this.cache.keys())
  }

  size(): number {
    return this.cache.size
  }

  private evict(): void {
    if (this.cache.size === 0) return

    let keyToEvict: string | null = null

    switch (this.strategy) {
      case 'lru':
        // Find least recently used (oldest timestamp)
        keyToEvict = Array.from(this.cache.entries())
          .sort(([, a], [, b]) => a.timestamp - b.timestamp)[0][0]
        break

      case 'fifo':
        // Find first in (oldest by insertion order)
        keyToEvict = this.cache.keys().next().value
        break

      case 'ttl':
        // Find entry closest to expiration
        const now = Date.now()
        keyToEvict = Array.from(this.cache.entries())
          .sort(([, a], [, b]) => {
            const aTimeLeft = a.ttl - (now - a.timestamp)
            const bTimeLeft = b.ttl - (now - b.timestamp)
            return aTimeLeft - bTimeLeft
          })[0][0]
        break
    }

    if (keyToEvict) {
      this.cache.delete(keyToEvict)
    }
  }

  private saveToStorage(): void {
    try {
      const data = Array.from(this.cache.entries())
      localStorage.setItem('cryptopulse_cache', JSON.stringify(data))
    } catch (e) {
      console.warn('Failed to save cache to localStorage:', e)
    }
  }

  private loadFromStorage(): void {
    try {
      const data = localStorage.getItem('cryptopulse_cache')
      if (data) {
        const entries = JSON.parse(data)
        this.cache = new Map(entries)
      }
    } catch (e) {
      console.warn('Failed to load cache from localStorage:', e)
    }
  }

  // Utility methods
  getStats() {
    const now = Date.now()
    const entries = Array.from(this.cache.values())
    
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      strategy: this.strategy,
      expired: entries.filter(e => now - e.timestamp > e.ttl).length,
      averageAge: entries.reduce((acc, e) => acc + (now - e.timestamp), 0) / entries.length,
      memoryUsage: JSON.stringify(Array.from(this.cache.entries())).length
    }
  }

  // Clean expired entries
  cleanup(): number {
    const now = Date.now()
    let cleaned = 0

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key)
        cleaned++
      }
    }

    if (this.persist && cleaned > 0) {
      this.saveToStorage()
    }

    return cleaned
  }
}

// Create specialized cache instances
export const apiCache = new AdvancedCache({
  ttl: 5 * 60 * 1000, // 5 minutes
  maxSize: 500,
  persist: true,
  strategy: 'lru'
})

export const userCache = new AdvancedCache({
  ttl: 30 * 60 * 1000, // 30 minutes
  maxSize: 100,
  persist: true,
  strategy: 'lru'
})

export const marketDataCache = new AdvancedCache({
  ttl: 30 * 1000, // 30 seconds
  maxSize: 1000,
  persist: false,
  strategy: 'ttl'
})

// React hook for caching
export function useCache<T>(key: string, fetcher: () => Promise<T>, options?: CacheOptions) {
  const cache = new AdvancedCache(options)
  
  const get = (): T | null => cache.get(key)
  const set = (data: T, ttl?: number) => cache.set(key, data, ttl)
  const invalidate = () => cache.delete(key)
  
  return { get, set, invalidate, cache }
}

// Cache decorator for functions
export function cached<T extends (...args: any[]) => any>(
  fn: T,
  keyGenerator: (...args: Parameters<T>) => string,
  options?: CacheOptions
): T {
  const cache = new AdvancedCache(options)
  
  return ((...args: Parameters<T>) => {
    const key = keyGenerator(...args)
    const cached = cache.get(key)
    
    if (cached !== null) {
      return Promise.resolve(cached)
    }
    
    const result = fn(...args)
    
    if (result instanceof Promise) {
      return result.then(data => {
        cache.set(key, data)
        return data
      })
    } else {
      cache.set(key, result)
      return result
    }
  }) as T
}
