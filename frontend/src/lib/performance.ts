/**
 * Performance monitoring utilities
 */

interface PerformanceMetric {
  name: string
  value: number
  timestamp: number
  type: 'navigation' | 'measure' | 'mark' | 'custom'
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = []
  private observers: PerformanceObserver[] = []

  constructor() {
    this.initializeObservers()
  }

  private initializeObservers() {
    // Monitor navigation timing
    if ('PerformanceObserver' in window) {
      const navObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation') {
            this.recordMetric({
              name: 'page_load_time',
              value: entry.loadEventEnd - entry.loadEventStart,
              timestamp: Date.now(),
              type: 'navigation'
            })
          }
        }
      })
      
      try {
        navObserver.observe({ entryTypes: ['navigation'] })
        this.observers.push(navObserver)
      } catch (e) {
        console.warn('Navigation timing not supported')
      }

      // Monitor long tasks
      const longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.recordMetric({
            name: 'long_task',
            value: entry.duration,
            timestamp: Date.now(),
            type: 'measure'
          })
        }
      })

      try {
        longTaskObserver.observe({ entryTypes: ['longtask'] })
        this.observers.push(longTaskObserver)
      } catch (e) {
        console.warn('Long task timing not supported')
      }
    }
  }

  recordMetric(metric: PerformanceMetric) {
    this.metrics.push(metric)
    
    // Keep only last 1000 metrics to prevent memory leaks
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000)
    }

    // Send to analytics in production
    if (process.env.NODE_ENV === 'production') {
      this.sendToAnalytics(metric)
    }
  }

  mark(name: string) {
    if ('performance' in window && 'mark' in performance) {
      performance.mark(name)
    }
  }

  measure(name: string, startMark: string, endMark?: string) {
    if ('performance' in window && 'measure' in performance) {
      try {
        const measure = performance.measure(name, startMark, endMark)
        this.recordMetric({
          name,
          value: measure.duration,
          timestamp: Date.now(),
          type: 'measure'
        })
      } catch (e) {
        console.warn(`Failed to measure ${name}:`, e)
      }
    }
  }

  getMetrics(name?: string): PerformanceMetric[] {
    if (name) {
      return this.metrics.filter(m => m.name === name)
    }
    return [...this.metrics]
  }

  getAverageMetric(name: string): number {
    const metrics = this.getMetrics(name)
    if (metrics.length === 0) return 0
    
    const sum = metrics.reduce((acc, m) => acc + m.value, 0)
    return sum / metrics.length
  }

  private sendToAnalytics(metric: PerformanceMetric) {
    // In production, send to your analytics service
    // Example: Google Analytics, Mixpanel, etc.
    if (typeof gtag !== 'undefined') {
      gtag('event', 'performance_metric', {
        metric_name: metric.name,
        metric_value: metric.value,
        metric_type: metric.type
      })
    }
  }

  cleanup() {
    this.observers.forEach(observer => observer.disconnect())
    this.observers = []
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor()

// React hook for performance monitoring
export function usePerformanceMonitor() {
  const mark = (name: string) => performanceMonitor.mark(name)
  const measure = (name: string, startMark: string, endMark?: string) => 
    performanceMonitor.measure(name, startMark, endMark)
  const recordMetric = (name: string, value: number) => 
    performanceMonitor.recordMetric({
      name,
      value,
      timestamp: Date.now(),
      type: 'custom'
    })

  return { mark, measure, recordMetric }
}

// Utility functions
export function measureAsync<T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> {
  const startMark = `${name}_start`
  const endMark = `${name}_end`
  
  performanceMonitor.mark(startMark)
  
  return fn().finally(() => {
    performanceMonitor.mark(endMark)
    performanceMonitor.measure(name, startMark, endMark)
  })
}

export function measureSync<T>(
  name: string,
  fn: () => T
): T {
  const startMark = `${name}_start`
  const endMark = `${name}_end`
  
  performanceMonitor.mark(startMark)
  const result = fn()
  performanceMonitor.mark(endMark)
  performanceMonitor.measure(name, startMark, endMark)
  
  return result
}
