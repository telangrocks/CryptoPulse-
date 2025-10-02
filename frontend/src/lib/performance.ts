/**
 * Performance Monitoring and Optimization
 * World-class performance tracking and optimization utilities
 */

import { logInfo, logWarn, logError } from './logger';

// Performance metrics interface
interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  type: 'navigation' | 'paint' | 'measure' | 'custom';
  metadata?: Record<string, any>;
}

// Performance monitoring class
class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private observers: PerformanceObserver[] = [];
  private isInitialized = false;

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    if (typeof window === 'undefined' || this.isInitialized) return;
    
    try {
      // Monitor Core Web Vitals
      this.observeWebVitals();
      
      // Monitor resource loading
      this.observeResourceTiming();
      
      // Monitor user interactions
      this.observeUserTiming();
      
      this.isInitialized = true;
      logInfo('Performance monitoring initialized');
    } catch (error) {
      logError('Failed to initialize performance monitoring:', error);
    }
  }

  private observeWebVitals(): void {
    if (!('PerformanceObserver' in window)) return;

    try {
      // Largest Contentful Paint (LCP)
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        this.recordMetric({
          name: 'LCP',
          value: lastEntry.startTime,
          timestamp: Date.now(),
          type: 'paint'
        });
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      this.observers.push(lcpObserver);

      // First Input Delay (FID)
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          this.recordMetric({
            name: 'FID',
            value: entry.processingStart - entry.startTime,
            timestamp: Date.now(),
            type: 'custom'
          });
        });
      });
      fidObserver.observe({ entryTypes: ['first-input'] });
      this.observers.push(fidObserver);

      // Cumulative Layout Shift (CLS)
      const clsObserver = new PerformanceObserver((list) => {
        let clsValue = 0;
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        });
        this.recordMetric({
          name: 'CLS',
          value: clsValue,
          timestamp: Date.now(),
          type: 'custom'
        });
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });
      this.observers.push(clsObserver);
    } catch (error) {
      logWarn('Web vitals observation failed:', error);
    }
  }

  private observeResourceTiming(): void {
    if (!('PerformanceObserver' in window)) return;

    try {
      const resourceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          this.recordMetric({
            name: `Resource: ${entry.name}`,
            value: entry.duration,
            timestamp: Date.now(),
            type: 'measure',
            metadata: {
              initiatorType: entry.initiatorType,
              transferSize: entry.transferSize,
              decodedBodySize: entry.decodedBodySize
            }
          });
        });
      });
      resourceObserver.observe({ entryTypes: ['resource'] });
      this.observers.push(resourceObserver);
    } catch (error) {
      logWarn('Resource timing observation failed:', error);
    }
  }

  private observeUserTiming(): void {
    if (!('PerformanceObserver' in window)) return;

    try {
      const userObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          this.recordMetric({
            name: entry.name,
            value: entry.duration || entry.startTime,
            timestamp: Date.now(),
            type: 'measure'
          });
        });
      });
      userObserver.observe({ entryTypes: ['measure', 'mark'] });
      this.observers.push(userObserver);
    } catch (error) {
      logWarn('User timing observation failed:', error);
    }
  }

  public recordMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);
    
    // Keep only last 1000 metrics to prevent memory leaks
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }
  }

  public getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  public getMetricsByType(type: PerformanceMetric['type']): PerformanceMetric[] {
    return this.metrics.filter(metric => metric.type === type);
  }

  public getAverageMetric(name: string): number {
    const matchingMetrics = this.metrics.filter(metric => metric.name === name);
    if (matchingMetrics.length === 0) return 0;
    
    const sum = matchingMetrics.reduce((acc, metric) => acc + metric.value, 0);
    return sum / matchingMetrics.length;
  }

  public clearMetrics(): void {
    this.metrics = [];
  }

  public destroy(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    this.metrics = [];
    this.isInitialized = false;
  }
}

// Global performance monitor instance
let performanceMonitor: PerformanceMonitor | null = null;

/**
 * Get or create performance monitor instance
 */
export function getPerformanceMonitor(): PerformanceMonitor {
  if (!performanceMonitor) {
    performanceMonitor = new PerformanceMonitor();
  }
  return performanceMonitor;
}

/**
 * Measure function execution time
 */
export function measureExecutionTime<T>(
  name: string,
  fn: () => T
): T {
  const start = performance.now();
  const result = fn();
  const end = performance.now();
  
  getPerformanceMonitor().recordMetric({
    name: `Function: ${name}`,
    value: end - start,
    timestamp: Date.now(),
    type: 'custom'
  });
  
  return result;
}

/**
 * Measure async function execution time
 */
export async function measureAsyncExecutionTime<T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = performance.now();
  const result = await fn();
  const end = performance.now();
  
  getPerformanceMonitor().recordMetric({
    name: `Async Function: ${name}`,
    value: end - start,
    timestamp: Date.now(),
    type: 'custom'
  });
  
  return result;
}

/**
 * Mark performance milestone
 */
export function markPerformance(name: string): void {
  if (typeof performance !== 'undefined' && performance.mark) {
    performance.mark(name);
  }
}

/**
 * Measure performance between two marks
 */
export function measurePerformance(name: string, startMark: string, endMark: string): void {
  if (typeof performance !== 'undefined' && performance.measure) {
    try {
      performance.measure(name, startMark, endMark);
    } catch (error) {
      logWarn(`Failed to measure performance between ${startMark} and ${endMark}:`, error);
    }
  }
}
