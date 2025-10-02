import path from 'path';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],

  // Logging
  logLevel: 'warn',

  // Path resolution
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  // Environment variable security
  define: {
    __DEV__: process.env['NODE_ENV'] === 'development',
    __PROD__: process.env['NODE_ENV'] === 'production',
    global: 'globalThis',
  },

  // Environment variables configuration
  envPrefix: 'VITE_',

  // Build configuration
  build: {
    // ULTRA-OPTIMIZED build configuration
    minify: 'terser',
    sourcemap: false,
    chunkSizeWarningLimit: 500,
    target: ['es2018', 'chrome70', 'firefox65', 'safari12', 'edge79'],

    // ESBuild configuration for better compatibility
    esbuild: {
      target: 'es2018',
      supported: {
        'destructuring': true,
        'dynamic-import': true,
      },
      // Production-ready optimizations
      minifyIdentifiers: process.env['NODE_ENV'] === 'production',
      minifySyntax: process.env['NODE_ENV'] === 'production',
      minifyWhitespace: process.env['NODE_ENV'] === 'production',
    },

    // Optimize chunks for faster loading
    rollupOptions: {
      onwarn(warning: any, warn: any) {
        // Suppress mixed import warnings
        if (warning.code === 'MODULE_LEVEL_DIRECTIVE') return;
        if (warning.message.includes('dynamic import will not move module into another chunk')) return;
        warn(warning);
      },
      output: {
        manualChunks: (id: string) => {
          // Group common libraries
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'react-vendor';
            }
            if (id.includes('@radix-ui')) {
              return 'ui-vendor';
            }
            if (id.includes('clsx') || id.includes('tailwind-merge') || id.includes('zod')) {
              return 'utils-vendor';
            }
            return 'vendor';
          }
          // Group our lib modules to avoid mixed import issues
          if (id.includes('/src/lib/')) {
            return 'lib-utils';
          }
          return undefined;
        },
      },
    },
  },

  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@radix-ui/react-accordion',
      '@radix-ui/react-alert-dialog',
      '@radix-ui/react-avatar',
      'recharts',
      'clsx',
      'tailwind-merge',
    ],
    esbuildOptions: {
      target: 'es2018',
    },
    // Add performance monitoring
    force: process.env['NODE_ENV'] === 'development',
  },

  // Application configuration
  base: '/',

  // Development server configuration
  server: {
    port: 3000,
    host: true,
    strictPort: true,

    // Enable HTTPS in development for testing CDN features
    https: process.env['NODE_ENV'] === 'development' && process.env['VITE_HTTPS'] === 'true',

    // CORS configuration for development
    cors: {
      origin: [process.env['VITE_BACKEND_URL'] || 'http://localhost:1337'],
      credentials: true,
    },

    // Security headers in development
    headers: {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    },

    // Proxy configuration for API calls with enhanced error handling
    proxy: {
      '/api': {
        target: process.env['VITE_BACKEND_URL'] || 'http://localhost:1337',
        changeOrigin: true,
        secure: false,
        timeout: 30000,
        configure: (proxy: any, _options: any) => {
          proxy.on('error', (err: any, req: any, res: any) => {
            console.error('Proxy error:', err.message);
            if (!res.headersSent) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Proxy error occurred' }));
            }
          });
          proxy.on('proxyReq', (proxyReq: any, req: any, _res: any) => {
            if (process.env['NODE_ENV'] === 'development') {
              console.log('Sending Request to the Target:', req.method, req.url);
            }
          });
          proxy.on('proxyRes', (proxyRes: any, req: any, _res: any) => {
            if (process.env['NODE_ENV'] === 'development') {
              console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
            }
          });
          proxy.on('timeout', (req: any, res: any) => {
            console.error('Proxy timeout for:', req.url);
            if (!res.headersSent) {
              res.writeHead(504, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Request timeout' }));
            }
          });
        },
      },
    },
  },

  // Preview server configuration
  preview: {
    port: 4173,
    host: true,
    strictPort: true,

    // Security headers for preview
    headers: {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    },
  },
});