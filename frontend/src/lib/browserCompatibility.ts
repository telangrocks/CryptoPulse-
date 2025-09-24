/**
 * Browser Compatibility Detection and Warnings
 * Provides comprehensive browser support checking and graceful degradation
 */

interface BrowserInfo {
  name: string
  version: string
  isSupported: boolean
  warnings: string[]
  features: {
    webCrypto: boolean
    webSocket: boolean
    fetch: boolean
    localStorage: boolean
    sessionStorage: boolean
    intersectionObserver: boolean
    resizeObserver: boolean
    matchMedia: boolean
    customEvent: boolean
    promise: boolean
    es6: boolean
  }
}

class BrowserCompatibility {
  private static instance: BrowserCompatibility
  private browserInfo: BrowserInfo | null = null

  static getInstance(): BrowserCompatibility {
    if (!BrowserCompatibility.instance) {
      BrowserCompatibility.instance = new BrowserCompatibility()
    }
    return BrowserCompatibility.instance
  }

  detectBrowser(): BrowserInfo {
    if (this.browserInfo) {
      return this.browserInfo
    }

    const userAgent = navigator.userAgent
    const warnings: string[] = []
    
    // Detect browser name and version
    let browserName = 'Unknown'
    let browserVersion = '0'
    
    if (userAgent.includes('Chrome')) {
      browserName = 'Chrome'
      const match = userAgent.match(/Chrome\/(\d+)/)
      browserVersion = match ? match[1] : '0'
    } else if (userAgent.includes('Firefox')) {
      browserName = 'Firefox'
      const match = userAgent.match(/Firefox\/(\d+)/)
      browserVersion = match ? match[1] : '0'
    } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
      browserName = 'Safari'
      const match = userAgent.match(/Version\/(\d+)/)
      browserVersion = match ? match[1] : '0'
    } else if (userAgent.includes('Edge')) {
      browserName = 'Edge'
      const match = userAgent.match(/Edge\/(\d+)/)
      browserVersion = match ? match[1] : '0'
    } else if (userAgent.includes('MSIE') || userAgent.includes('Trident')) {
      browserName = 'Internet Explorer'
      const match = userAgent.match(/(?:MSIE |rv:)(\d+)/)
      browserVersion = match ? match[1] : '0'
    }

    // Check feature support
    const features = this.checkFeatures()
    
    // Determine if browser is supported
    const isSupported = this.isBrowserSupported(browserName, parseInt(browserVersion), features)
    
    // Generate warnings for unsupported features
    if (!features.webCrypto) {
      warnings.push('Web Crypto API not supported - encryption features will be limited')
    }
    if (!features.webSocket) {
      warnings.push('WebSocket not supported - real-time features will be disabled')
    }
    if (!features.fetch) {
      warnings.push('Fetch API not supported - some network features may not work')
    }
    if (!features.localStorage) {
      warnings.push('Local Storage not supported - settings will not persist')
    }
    if (!features.intersectionObserver) {
      warnings.push('Intersection Observer not supported - some animations may not work')
    }
    if (!features.promise) {
      warnings.push('Promise not supported - some features may not work')
    }
    if (!features.es6) {
      warnings.push('ES6 features not fully supported - some functionality may be limited')
    }

    // Add browser-specific warnings
    if (browserName === 'Internet Explorer') {
      warnings.push('Internet Explorer is not supported - please use a modern browser')
    } else if (browserName === 'Safari' && parseInt(browserVersion) < 11) {
      warnings.push('Safari version is too old - please update to Safari 11 or later')
    } else if (browserName === 'Chrome' && parseInt(browserVersion) < 58) {
      warnings.push('Chrome version is too old - please update to Chrome 58 or later')
    } else if (browserName === 'Firefox' && parseInt(browserVersion) < 57) {
      warnings.push('Firefox version is too old - please update to Firefox 57 or later')
    }

    this.browserInfo = {
      name: browserName,
      version: browserVersion,
      isSupported,
      warnings,
      features
    }

    return this.browserInfo
  }

  private checkFeatures() {
    return {
      webCrypto: !!(window.crypto && window.crypto.subtle),
      webSocket: !!window.WebSocket,
      fetch: !!window.fetch,
      localStorage: this.testLocalStorage(),
      sessionStorage: this.testSessionStorage(),
      intersectionObserver: !!window.IntersectionObserver,
      resizeObserver: !!window.ResizeObserver,
      matchMedia: !!window.matchMedia,
      customEvent: !!window.CustomEvent,
      promise: !!window.Promise,
      es6: this.testES6Features()
    }
  }

  private testLocalStorage(): boolean {
    try {
      const test = '__localStorage_test__'
      localStorage.setItem(test, test)
      localStorage.removeItem(test)
      return true
    } catch {
      return false
    }
  }

  private testSessionStorage(): boolean {
    try {
      const test = '__sessionStorage_test__'
      sessionStorage.setItem(test, test)
      sessionStorage.removeItem(test)
      return true
    } catch {
      return false
    }
  }

  private testES6Features(): boolean {
    try {
      // Test arrow functions
      const arrow = () => true
      if (!arrow()) return false

      // Test template literals
      const template = `test${1}`
      if (template !== 'test1') return false

      // Test destructuring
      const { test } = { test: true }
      if (!test) return false

      // Test spread operator
      const arr = [...[1, 2, 3]]
      if (arr.length !== 3) return false

      // Test const/let
      const constTest = true
      let letTest = true
      if (!constTest || !letTest) return false

      return true
    } catch {
      return false
    }
  }

  private isBrowserSupported(name: string, version: number, features: any): boolean {
    // Internet Explorer is not supported
    if (name === 'Internet Explorer') {
      return false
    }

    // Check minimum version requirements
    const minVersions: { [key: string]: number } = {
      'Chrome': 58,
      'Firefox': 57,
      'Safari': 11,
      'Edge': 16
    }

    if (minVersions[name] && version < minVersions[name]) {
      return false
    }

    // Check critical features
    const criticalFeatures = ['promise', 'fetch', 'localStorage']
    for (const feature of criticalFeatures) {
      if (!features[feature]) {
        return false
      }
    }

    return true
  }

  showCompatibilityWarning(): void {
    const info = this.detectBrowser()
    
    if (!info.isSupported || info.warnings.length > 0) {
      const warningElement = document.createElement('div')
      warningElement.id = 'browser-compatibility-warning'
      warningElement.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        background: linear-gradient(135deg, #ff6b6b, #ff8e53);
        color: white;
        padding: 12px 20px;
        text-align: center;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        z-index: 10000;
        box-shadow: 0 2px 10px rgba(0,0,0,0.3);
      `

      let warningText = `⚠️ Browser Compatibility Warning: `
      
      if (!info.isSupported) {
        warningText += `Your browser (${info.name} ${info.version}) is not fully supported. `
        warningText += `Please update to a modern browser for the best experience.`
      } else if (info.warnings.length > 0) {
        warningText += `Some features may not work properly: ${info.warnings.slice(0, 2).join(', ')}`
        if (info.warnings.length > 2) {
          warningText += ` and ${info.warnings.length - 2} more issues.`
        }
      }

      warningElement.innerHTML = `
        <div style="max-width: 1200px; margin: 0 auto;">
          ${warningText}
          <button onclick="this.parentElement.parentElement.remove()" 
                  style="margin-left: 15px; background: rgba(255,255,255,0.2); 
                         border: 1px solid rgba(255,255,255,0.3); 
                         color: white; padding: 4px 8px; border-radius: 4px; 
                         cursor: pointer; font-size: 12px;">
            Dismiss
          </button>
        </div>
      `

      document.body.insertBefore(warningElement, document.body.firstChild)
      
      // Adjust body padding to account for warning
      document.body.style.paddingTop = '50px'
    }
  }

  getBrowserInfo(): BrowserInfo | null {
    return this.browserInfo
  }

  isFeatureSupported(feature: keyof BrowserInfo['features']): boolean {
    const info = this.detectBrowser()
    return info.features[feature]
  }

  getRecommendedBrowsers(): string[] {
    return [
      'Google Chrome 58+',
      'Mozilla Firefox 57+',
      'Safari 11+',
      'Microsoft Edge 16+'
    ]
  }
}

// Export singleton instance
export const browserCompatibility = BrowserCompatibility.getInstance()

// Auto-detect and show warnings on load
if (typeof window !== 'undefined') {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      browserCompatibility.showCompatibilityWarning()
    })
  } else {
    browserCompatibility.showCompatibilityWarning()
  }
}

export default browserCompatibility
