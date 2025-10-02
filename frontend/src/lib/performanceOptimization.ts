/**
 * Performance optimization utilities
 */

import { debounce as lodashDebounce, throttle as lodashThrottle } from 'es-toolkit';

// Re-export from React for convenience
import React from 'react';

/**
 * Debounce function - delays execution until after delay has passed
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Throttle function - limits execution to once per interval
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number,
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Memoize function results
 */
export function memoize<T extends (...args: any[]) => any>(
  func: T,
  getKey?: (...args: Parameters<T>) => string,
): T {
  const cache = new Map();

  return ((...args: Parameters<T>) => {
    const key = getKey ? getKey(...args) : JSON.stringify(args);

    if (cache.has(key)) {
      return cache.get(key);
    }

    const result = func(...args);
    cache.set(key, result);
    return result;
  }) as T;
}

/**
 * Lazy load component
 */
export function lazyLoad<T extends React.ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
): React.LazyExoticComponent<T> {
  return React.lazy(importFunc);
}

/**
 * Optimize images with lazy loading
 */
export function optimizeImage(src: string, options?: {
  width?: number;
  height?: number;
  quality?: number;
}): string {
  if (!src) return '';

  // In a real app, you might use a service like Cloudinary or similar
  // For now, just return the original src
  return src;
}

/**
 * Batch DOM updates
 */
export function batchUpdates(callback: () => void): void {
  // Use requestAnimationFrame for better performance
  requestAnimationFrame(callback);
}

/**
 * Preload resources
 */
export function preloadResource(href: string, as: string = 'fetch'): void {
  const link = document.createElement('link');
  link.rel = 'preload';
  link.href = href;
  link.as = as;
  document.head.appendChild(link);
}

/**
 * Virtual scrolling helper
 */
export function calculateVisibleItems(
  containerHeight: number,
  itemHeight: number,
  scrollTop: number,
  totalItems: number,
  overscan: number = 5,
): { startIndex: number; endIndex: number } {
  const visibleStart = Math.floor(scrollTop / itemHeight);
  const visibleEnd = Math.min(
    visibleStart + Math.ceil(containerHeight / itemHeight),
    totalItems - 1,
  );

  return {
    startIndex: Math.max(0, visibleStart - overscan),
    endIndex: Math.min(totalItems - 1, visibleEnd + overscan),
  };
}
export const { memo, useMemo, useCallback, startTransition } = React;
