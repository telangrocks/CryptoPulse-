/**
 * Advanced analytics and monitoring system
 */

import { performanceMonitor } from './performance'
import { apiCache } from './advancedCache'

interface AnalyticsEvent {
  name: string
  properties: Record<string, any>
  timestamp: number
  userId?: string
  sessionId?: string
}

interface UserBehavior {
  pageViews: number
  timeOnPage: number
  clicks: number
  scrollDepth: number
  formInteractions: number
}

class AnalyticsManager {
  private events: AnalyticsEvent[] = []
  private userBehavior: UserBehavior = {
    pageViews: 0,
    timeOnPage: 0,
    clicks: 0,
    scrollDepth: 0,
    formInteractions: 0
  }
  private sessionStart: number = Date.now()
  private currentPage: string = ''
  private pageStartTime: number = Date.now()

  // Track page views
  trackPageView(page: string, properties: Record<string, any> = {}) {
    // Track previous page time
    if (this.currentPage) {
      const timeOnPage = Date.now() - this.pageStartTime
      this.userBehavior.timeOnPage += timeOnPage
    }

    this.currentPage = page
    this.pageStartTime = Date.now()
    this.userBehavior.pageViews++

    this.track('page_view', {
      page,
      ...properties,
      referrer: document.referrer,
      userAgent: navigator.userAgent
    })
  }

  // Track custom events
  track(eventName: string, properties: Record<string, any> = {}) {
    const event: AnalyticsEvent = {
      name: eventName,
      properties: {
        ...properties,
        url: window.location.href,
        timestamp: Date.now()
      },
      timestamp: Date.now(),
      userId: this.getUserId(),
      sessionId: this.getSessionId()
    }

    this.events.push(event)

    // Send to analytics service
    this.sendToAnalytics(event)

    // Keep only last 1000 events in memory
    if (this.events.length > 1000) {
      this.events = this.events.slice(-1000)
    }
  }

  // Track user interactions
  trackClick(element: string, properties: Record<string, any> = {}) {
    this.userBehavior.clicks++
    this.track('click', {
      element,
      ...properties
    })
  }

  trackScroll(depth: number) {
    this.userBehavior.scrollDepth = Math.max(this.userBehavior.scrollDepth, depth)
    this.track('scroll', {
      depth,
      percentage: Math.round((depth / document.body.scrollHeight) * 100)
    })
  }

  trackFormInteraction(formName: string, action: string, properties: Record<string, any> = {}) {
    this.userBehavior.formInteractions++
    this.track('form_interaction', {
      formName,
      action,
      ...properties
    })
  }

  // Track API calls
  trackAPICall(endpoint: string, method: string, duration: number, success: boolean, error?: string) {
    this.track('api_call', {
      endpoint,
      method,
      duration,
      success,
      error,
      cacheHit: apiCache.has(`api_${endpoint}_${method}`)
    })
  }

  // Track trading events
  trackTradeEvent(event: 'trade_initiated' | 'trade_executed' | 'trade_cancelled' | 'trade_failed', properties: Record<string, any> = {}) {
    this.track('trading_event', {
      event,
      ...properties
    })
  }

  // Track performance metrics
  trackPerformance(metricName: string, value: number, properties: Record<string, any> = {}) {
    this.track('performance_metric', {
      metricName,
      value,
      ...properties
    })
  }

  // Track errors
  trackError(error: Error, context: string, properties: Record<string, any> = {}) {
    this.track('error', {
      errorMessage: error.message,
      errorStack: error.stack,
      context,
      ...properties
    })
  }

  // Get user behavior summary
  getUserBehavior(): UserBehavior {
    return { ...this.userBehavior }
  }

  // Get session duration
  getSessionDuration(): number {
    return Date.now() - this.sessionStart
  }

  // Get events by name
  getEvents(eventName?: string): AnalyticsEvent[] {
    if (eventName) {
      return this.events.filter(e => e.name === eventName)
    }
    return [...this.events]
  }

  // Get analytics summary
  getSummary() {
    const sessionDuration = this.getSessionDuration()
    const events = this.getEvents()
    
    return {
      sessionDuration,
      totalEvents: events.length,
      userBehavior: this.userBehavior,
      pageViews: this.userBehavior.pageViews,
      averageTimeOnPage: this.userBehavior.timeOnPage / Math.max(this.userBehavior.pageViews, 1),
      eventTypes: [...new Set(events.map(e => e.name))],
      topEvents: this.getTopEvents(5)
    }
  }

  private getTopEvents(limit: number) {
    const eventCounts = this.events.reduce((acc, event) => {
      acc[event.name] = (acc[event.name] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return Object.entries(eventCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([name, count]) => ({ name, count }))
  }

  private getUserId(): string | undefined {
    // Get user ID from auth context or localStorage
    return localStorage.getItem('user_id') || undefined
  }

  private getSessionId(): string | undefined {
    // Get session ID from session manager
    return localStorage.getItem('session_id') || undefined
  }

  private sendToAnalytics(event: AnalyticsEvent) {
    // Send to analytics service (Google Analytics, Mixpanel, etc.)
    if (typeof window !== 'undefined' && 'gtag' in window) {
      (window as any).gtag('event', event.name, event.properties)
    }

    // Send to custom analytics endpoint
    if (process.env.NODE_ENV === 'production') {
      fetch('/api/analytics/track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(event)
      }).catch(e => {
        // Analytics event failed - handled by error logging system
      })
    }
  }

  // Clean up
  cleanup() {
    // Track session end
    this.track('session_end', {
      duration: this.getSessionDuration(),
      userBehavior: this.userBehavior
    })

    // Clear events
    this.events = []
  }
}

// Singleton instance
export const analytics = new AnalyticsManager()

// React hook for analytics
export function useAnalytics() {
  return {
    track: (eventName: string, properties?: Record<string, any>) => 
      analytics.track(eventName, properties),
    trackPageView: (page: string, properties?: Record<string, any>) => 
      analytics.trackPageView(page, properties),
    trackClick: (element: string, properties?: Record<string, any>) => 
      analytics.trackClick(element, properties),
    trackScroll: (depth: number) => 
      analytics.trackScroll(depth),
    trackFormInteraction: (formName: string, action: string, properties?: Record<string, any>) => 
      analytics.trackFormInteraction(formName, action, properties),
    trackAPICall: (endpoint: string, method: string, duration: number, success: boolean, error?: string) => 
      analytics.trackAPICall(endpoint, method, duration, success, error),
    trackTradeEvent: (event: 'trade_initiated' | 'trade_executed' | 'trade_cancelled' | 'trade_failed', properties?: Record<string, any>) => 
      analytics.trackTradeEvent(event, properties),
    trackError: (error: Error, context: string, properties?: Record<string, any>) => 
      analytics.trackError(error, context, properties)
  }
}

// Auto-track common events
export function initializeAnalytics() {
  // Track page visibility changes
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      analytics.track('page_hidden')
    } else {
      analytics.track('page_visible')
    }
  })

  // Track scroll depth
  let maxScrollDepth = 0
  window.addEventListener('scroll', () => {
    const scrollDepth = window.scrollY + window.innerHeight
    const documentHeight = document.body.scrollHeight
    const percentage = Math.round((scrollDepth / documentHeight) * 100)
    
    if (percentage > maxScrollDepth) {
      maxScrollDepth = percentage
      analytics.trackScroll(scrollDepth)
    }
  })

  // Track clicks
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement
    const element = target.tagName.toLowerCase()
    const className = target.className
    const id = target.id
    
    analytics.trackClick(element, {
      className,
      id,
      text: target.textContent?.slice(0, 100)
    })
  })

  // Track form interactions
  document.addEventListener('submit', (e) => {
    const form = e.target as HTMLFormElement
    analytics.trackFormInteraction(form.name || 'unnamed', 'submit', {
      action: form.action,
      method: form.method
    })
  })

  // Track performance metrics
  performanceMonitor.getMetrics().forEach(metric => {
    analytics.trackPerformance(metric.name, metric.value, {
      type: metric.type
    })
  })

  // Clean up on page unload
  window.addEventListener('beforeunload', () => {
    analytics.cleanup()
  })
}
