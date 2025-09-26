// Browser Compatibility Checker for CryptoPulse Frontend
// Ensures the application works across different browsers and environments

interface BrowserInfo {
  name: string;
  version: string;
  supported: boolean;
  features: {
    webSocket: boolean;
    localStorage: boolean;
    sessionStorage: boolean;
    fetch: boolean;
    promises: boolean;
    asyncAwait: boolean;
    modules: boolean;
    webWorkers: boolean;
    crypto: boolean;
  };
}

class BrowserCompatibilityChecker {
  private browserInfo: BrowserInfo;

  constructor() {
    this.browserInfo = this.detectBrowser();
    this.checkCompatibility();
  }

  private detectBrowser(): BrowserInfo {
    const userAgent = navigator.userAgent;
    let name = 'Unknown';
    let version = '0';

    // Detect browser
    if (userAgent.includes('Chrome')) {
      name = 'Chrome';
      const match = userAgent.match(/Chrome\/(\d+)/);
      version = match ? match[1] : '0';
    } else if (userAgent.includes('Firefox')) {
      name = 'Firefox';
      const match = userAgent.match(/Firefox\/(\d+)/);
      version = match ? match[1] : '0';
    } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
      name = 'Safari';
      const match = userAgent.match(/Version\/(\d+)/);
      version = match ? match[1] : '0';
    } else if (userAgent.includes('Edge')) {
      name = 'Edge';
      const match = userAgent.match(/Edge\/(\d+)/);
      version = match ? match[1] : '0';
    }

    return {
      name,
      version,
      supported: false, // Will be determined by feature checks
      features: {
        webSocket: typeof WebSocket !== 'undefined',
        localStorage: typeof localStorage !== 'undefined',
        sessionStorage: typeof sessionStorage !== 'undefined',
        fetch: typeof fetch !== 'undefined',
        promises: typeof Promise !== 'undefined',
        asyncAwait: this.checkAsyncAwaitSupport(),
        modules: this.checkModuleSupport(),
        webWorkers: typeof Worker !== 'undefined',
        crypto: typeof crypto !== 'undefined' && typeof crypto.subtle !== 'undefined'
      }
    };
  }

  private checkAsyncAwaitSupport(): boolean {
    try {
      // Test async/await support
      eval('(async () => {})()');
      return true;
    } catch {
      return false;
    }
  }

  private checkModuleSupport(): boolean {
    try {
      // Test ES6 module support
      return typeof import !== 'undefined';
    } catch {
      return false;
    }
  }

  private checkCompatibility(): void {
    const { features } = this.browserInfo;
    
    // Check if all required features are supported
    const requiredFeatures = [
      'webSocket',
      'localStorage',
      'sessionStorage',
      'fetch',
      'promises',
      'asyncAwait',
      'modules',
      'crypto'
    ];

    const unsupportedFeatures = requiredFeatures.filter(feature => !features[feature as keyof typeof features]);
    
    this.browserInfo.supported = unsupportedFeatures.length === 0;

    if (!this.browserInfo.supported) {
      this.showCompatibilityWarning(unsupportedFeatures);
    }

    // Log browser info for debugging
    console.log('🌐 Browser Compatibility Check:', {
      browser: `${this.browserInfo.name} ${this.browserInfo.version}`,
      supported: this.browserInfo.supported,
      unsupportedFeatures
    });
  }

  private showCompatibilityWarning(unsupportedFeatures: string[]): void {
    const warningElement = document.createElement('div');
    warningElement.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: #ff6b6b;
      color: white;
      padding: 12px;
      text-align: center;
      font-family: Arial, sans-serif;
      font-size: 14px;
      z-index: 10000;
      box-shadow: 0 2px 10px rgba(0,0,0,0.3);
    `;

    warningElement.innerHTML = `
      <strong>⚠️ Browser Compatibility Warning</strong><br>
      Your browser doesn't support some required features: ${unsupportedFeatures.join(', ')}<br>
      Please update your browser or use a modern browser like Chrome, Firefox, Safari, or Edge.
    `;

    document.body.insertBefore(warningElement, document.body.firstChild);

    // Auto-hide after 10 seconds
    setTimeout(() => {
      if (warningElement.parentNode) {
        warningElement.parentNode.removeChild(warningElement);
      }
    }, 10000);
  }

  public getBrowserInfo(): BrowserInfo {
    return this.browserInfo;
  }

  public isSupported(): boolean {
    return this.browserInfo.supported;
  }

  public getUnsupportedFeatures(): string[] {
    const { features } = this.browserInfo;
    return Object.entries(features)
      .filter(([_, supported]) => !supported)
      .map(([feature, _]) => feature);
  }
}

// Initialize browser compatibility checker
const browserChecker = new BrowserCompatibilityChecker();

// Export for use in other modules
export default browserChecker;
export { BrowserCompatibilityChecker, type BrowserInfo };