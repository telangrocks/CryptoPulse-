/**
 * Comprehensive Browser Polyfills for CryptoPulse
 * Ensures compatibility across different browsers and versions
 */

// =============================================================================
// Web APIs Polyfills
// =============================================================================

// IntersectionObserver polyfill
if (!window.IntersectionObserver) {
  window.IntersectionObserver = class IntersectionObserver {
    constructor(callback, options = {}) {
      this.callback = callback;
      this.options = options;
      this.observers = new Map();
    }

    observe(element) {
      // Simple fallback - just call callback immediately
      if (this.callback) {
        this.callback([{ target: element, isIntersecting: true }], this);
      }
    }

    unobserve(element) {
      this.observers.delete(element);
    }

    disconnect() {
      this.observers.clear();
    }
  };
}

// ResizeObserver polyfill
if (!window.ResizeObserver) {
  window.ResizeObserver = class ResizeObserver {
    constructor(callback) {
      this.callback = callback;
      this.observers = new Map();
    }

    observe(element) {
      // Simple fallback - just call callback with default size
      if (this.callback) {
        this.callback([{ target: element, contentRect: { width: 0, height: 0 } }], this);
      }
    }

    unobserve(element) {
      this.observers.delete(element);
    }

    disconnect() {
      this.observers.clear();
    }
  };
}

// matchMedia polyfill
if (!window.matchMedia) {
  window.matchMedia = function(query) {
    return {
      matches: false,
      media: query,
      onchange: null,
      addListener: function() {},
      removeListener: function() {},
      addEventListener: function() {},
      removeEventListener: function() {},
      dispatchEvent: function() { return false; }
    };
  };
}

// CustomEvent polyfill for older browsers
if (!window.CustomEvent) {
  window.CustomEvent = function(type, eventInitDict) {
    const event = document.createEvent('CustomEvent');
    event.initCustomEvent(type, eventInitDict.bubbles, eventInitDict.cancelable, eventInitDict.detail);
    return event;
  };
}

// =============================================================================
// Web Crypto API Polyfills
// =============================================================================

if (!window.crypto) {
  window.crypto = {};
}

if (!window.crypto.subtle) {
  window.crypto.subtle = {
    importKey: function() {
      return Promise.reject(new Error('Web Crypto API not supported'));
    },
    encrypt: function() {
      return Promise.reject(new Error('Web Crypto API not supported'));
    },
    decrypt: function() {
      return Promise.reject(new Error('Web Crypto API not supported'));
    },
    deriveBits: function() {
      return Promise.reject(new Error('Web Crypto API not supported'));
    },
    generateKey: function() {
      return Promise.reject(new Error('Web Crypto API not supported'));
    },
    sign: function() {
      return Promise.reject(new Error('Web Crypto API not supported'));
    },
    verify: function() {
      return Promise.reject(new Error('Web Crypto API not supported'));
    }
  };
}

if (!window.crypto.getRandomValues) {
  window.crypto.getRandomValues = function(array) {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
    return array;
  };
}

// =============================================================================
// WebSocket Polyfill (Basic)
// =============================================================================

if (!window.WebSocket) {
  window.WebSocket = class WebSocket {
    constructor(url, protocols) {
      this.url = url;
      this.protocols = protocols;
      this.readyState = WebSocket.CONNECTING;
      this.CONNECTING = 0;
      this.OPEN = 1;
      this.CLOSING = 2;
      this.CLOSED = 3;
      
      // Simulate connection
      setTimeout(() => {
        this.readyState = WebSocket.OPEN;
        if (this.onopen) this.onopen();
      }, 100);
    }

    close() {
      this.readyState = WebSocket.CLOSED;
      if (this.onclose) this.onclose();
    }

    send(data) {
      // Mock send - in real implementation this would send data
      console.log('WebSocket send (mock):', data);
    }

    addEventListener() {}
    removeEventListener() {}
  };
}

// =============================================================================
// Fetch API Polyfill
// =============================================================================

if (!window.fetch) {
  window.fetch = function(url, options = {}) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      xhr.open(options.method || 'GET', url);
      
      // Set headers
      if (options.headers) {
        Object.keys(options.headers).forEach(key => {
          xhr.setRequestHeader(key, options.headers[key]);
        });
      }
      
      xhr.onload = function() {
        resolve({
          ok: xhr.status >= 200 && xhr.status < 300,
          status: xhr.status,
          statusText: xhr.statusText,
          headers: {
            get: function(name) {
              return xhr.getResponseHeader(name);
            }
          },
          json: function() {
            return Promise.resolve(JSON.parse(xhr.responseText));
          },
          text: function() {
            return Promise.resolve(xhr.responseText);
          }
        });
      };
      
      xhr.onerror = function() {
        reject(new Error('Network error'));
      };
      
      xhr.send(options.body);
    });
  };
}

// =============================================================================
// Promise Polyfill
// =============================================================================

if (!window.Promise) {
  window.Promise = class Promise {
    constructor(executor) {
      this.state = 'pending';
      this.value = undefined;
      this.handlers = [];

      const resolve = (value) => {
        if (this.state === 'pending') {
          this.state = 'fulfilled';
          this.value = value;
          this.handlers.forEach(handler => handler.onFulfilled && handler.onFulfilled(value));
        }
      };

      const reject = (reason) => {
        if (this.state === 'pending') {
          this.state = 'rejected';
          this.value = reason;
          this.handlers.forEach(handler => handler.onRejected && handler.onRejected(reason));
        }
      };

      try {
        executor(resolve, reject);
      } catch (error) {
        reject(error);
      }
    }

    then(onFulfilled, onRejected) {
      return new Promise((resolve, reject) => {
        const handle = () => {
          if (this.state === 'fulfilled') {
            if (onFulfilled) {
              try {
                resolve(onFulfilled(this.value));
              } catch (error) {
                reject(error);
              }
            } else {
              resolve(this.value);
            }
          } else if (this.state === 'rejected') {
            if (onRejected) {
              try {
                resolve(onRejected(this.value));
              } catch (error) {
                reject(error);
              }
            } else {
              reject(this.value);
            }
          } else {
            this.handlers.push({ onFulfilled, onRejected });
          }
        };

        if (this.state !== 'pending') {
          handle();
        } else {
          this.handlers.push({ onFulfilled, onRejected });
        }
      });
    }

    catch(onRejected) {
      return this.then(null, onRejected);
    }

    static resolve(value) {
      return new Promise(resolve => resolve(value));
    }

    static reject(reason) {
      return new Promise((resolve, reject) => reject(reason));
    }

    static all(promises) {
      return new Promise((resolve, reject) => {
        const results = [];
        let completed = 0;

        promises.forEach((promise, index) => {
          Promise.resolve(promise).then(value => {
            results[index] = value;
            completed++;
            if (completed === promises.length) {
              resolve(results);
            }
          }).catch(reject);
        });
      });
    }
  };
}

// =============================================================================
// Array Methods Polyfills
// =============================================================================

if (!Array.prototype.includes) {
  Array.prototype.includes = function(searchElement, fromIndex) {
    return this.indexOf(searchElement, fromIndex) !== -1;
  };
}

if (!Array.prototype.find) {
  Array.prototype.find = function(predicate, thisArg) {
    for (let i = 0; i < this.length; i++) {
      if (predicate.call(thisArg, this[i], i, this)) {
        return this[i];
      }
    }
    return undefined;
  };
}

if (!Array.prototype.findIndex) {
  Array.prototype.findIndex = function(predicate, thisArg) {
    for (let i = 0; i < this.length; i++) {
      if (predicate.call(thisArg, this[i], i, this)) {
        return i;
      }
    }
    return -1;
  };
}

// =============================================================================
// Object Methods Polyfills
// =============================================================================

if (!Object.assign) {
  Object.assign = function(target, ...sources) {
    sources.forEach(source => {
      if (source) {
        Object.keys(source).forEach(key => {
          target[key] = source[key];
        });
      }
    });
    return target;
  };
}

if (!Object.keys) {
  Object.keys = function(obj) {
    const keys = [];
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        keys.push(key);
      }
    }
    return keys;
  };
}

// =============================================================================
// String Methods Polyfills
// =============================================================================

if (!String.prototype.startsWith) {
  String.prototype.startsWith = function(searchString, position) {
    position = position || 0;
    return this.substr(position, searchString.length) === searchString;
  };
}

if (!String.prototype.endsWith) {
  String.prototype.endsWith = function(searchString, length) {
    if (length === undefined || length > this.length) {
      length = this.length;
    }
    return this.substring(length - searchString.length, length) === searchString;
  };
}

if (!String.prototype.includes) {
  String.prototype.includes = function(search, start) {
    if (typeof start !== 'number') {
      start = 0;
    }
    if (start + search.length > this.length) {
      return false;
    } else {
      return this.indexOf(search, start) !== -1;
    }
  };
}

// =============================================================================
// Number Methods Polyfills
// =============================================================================

if (!Number.isNaN) {
  Number.isNaN = function(value) {
    return typeof value === 'number' && isNaN(value);
  };
}

if (!Number.isFinite) {
  Number.isFinite = function(value) {
    return typeof value === 'number' && isFinite(value);
  };
}

// =============================================================================
// Console Polyfills (for older browsers)
// =============================================================================

if (!window.console) {
  window.console = {
    log: function() {},
    warn: function() {},
    error: function() {},
    info: function() {},
    debug: function() {}
  };
}

// =============================================================================
// Local Storage Polyfill
// =============================================================================

if (!window.localStorage) {
  window.localStorage = {
    _data: {},
    getItem: function(key) {
      return this._data[key] || null;
    },
    setItem: function(key, value) {
      this._data[key] = value;
    },
    removeItem: function(key) {
      delete this._data[key];
    },
    clear: function() {
      this._data = {};
    },
    get length() {
      return Object.keys(this._data).length;
    },
    key: function(index) {
      return Object.keys(this._data)[index] || null;
    }
  };
}

// =============================================================================
// Session Storage Polyfill
// =============================================================================

if (!window.sessionStorage) {
  window.sessionStorage = {
    _data: {},
    getItem: function(key) {
      return this._data[key] || null;
    },
    setItem: function(key, value) {
      this._data[key] = value;
    },
    removeItem: function(key) {
      delete this._data[key];
    },
    clear: function() {
      this._data = {};
    },
    get length() {
      return Object.keys(this._data).length;
    },
    key: function(index) {
      return Object.keys(this._data)[index] || null;
    }
  };
}

// =============================================================================
// URL and URLSearchParams Polyfills
// =============================================================================

if (!window.URL) {
  window.URL = function(url, base) {
    this.href = url;
    this.protocol = url.split('://')[0] + ':';
    this.hostname = url.split('://')[1]?.split('/')[0] || '';
    this.pathname = url.split('://')[1]?.split('/').slice(1).join('/') || '/';
    this.search = url.includes('?') ? '?' + url.split('?')[1] : '';
    this.hash = url.includes('#') ? '#' + url.split('#')[1] : '';
  };
}

if (!window.URLSearchParams) {
  window.URLSearchParams = function(search) {
    this.params = {};
    if (search) {
      search.replace(/[?&]+([^=&]+)=([^&]*)/gi, (match, key, value) => {
        this.params[decodeURIComponent(key)] = decodeURIComponent(value);
      });
    }
  };

  window.URLSearchParams.prototype.get = function(name) {
    return this.params[name] || null;
  };

  window.URLSearchParams.prototype.set = function(name, value) {
    this.params[name] = value;
  };

  window.URLSearchParams.prototype.has = function(name) {
    return name in this.params;
  };

  window.URLSearchParams.prototype.delete = function(name) {
    delete this.params[name];
  };
}

// =============================================================================
// RequestAnimationFrame Polyfill
// =============================================================================

if (!window.requestAnimationFrame) {
  window.requestAnimationFrame = function(callback) {
    return setTimeout(callback, 16);
  };
}

if (!window.cancelAnimationFrame) {
  window.cancelAnimationFrame = function(id) {
    clearTimeout(id);
  };
}

// =============================================================================
// Performance API Polyfill
// =============================================================================

if (!window.performance) {
  window.performance = {
    now: function() {
      return Date.now();
    },
    mark: function() {},
    measure: function() {},
    getEntriesByType: function() { return []; },
    getEntriesByName: function() { return []; }
  };
}

// =============================================================================
// Export for module systems
// =============================================================================

export default {
  version: '1.0.0',
  description: 'Comprehensive browser polyfills for CryptoPulse'
};
