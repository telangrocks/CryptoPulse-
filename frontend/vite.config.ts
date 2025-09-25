import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  logLevel: 'warn', // Reduce log verbosity during build
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "events": path.resolve(__dirname, "./src/polyfills/events.js"),
    },
  },
  build: {
    // ULTRA-OPTIMIZED build configuration for Back4App
    minify: 'terser',
    sourcemap: false,
    chunkSizeWarningLimit: 500,
    target: ['es2018', 'chrome70', 'firefox65', 'safari12', 'edge79'],
    // ESBuild configuration for better compatibility
    esbuild: {
      target: 'es2018',
      supported: {
        'destructuring': true,
        'dynamic-import': true
      }
    },
    // Optimize chunks for faster loading
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@radix-ui/react-accordion', '@radix-ui/react-alert-dialog', '@radix-ui/react-avatar'],
          charts: ['recharts'],
          forms: ['react-hook-form', '@hookform/resolvers', 'zod']
        }
      }
    },
      onwarn(warning, warn) {
        // Suppress mixed import warnings
        if (warning.code === 'MODULE_LEVEL_DIRECTIVE') return;
        if (warning.message.includes('dynamic import will not move module into another chunk')) return;
        warn(warning);
      },
      output: {
        manualChunks: (id) => {
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
            if (id.includes('parse')) {
              return 'parse-vendor';
            }
            return 'vendor';
          }
          // Group our lib modules to avoid mixed import issues
          if (id.includes('/src/lib/')) {
            return 'lib-utils';
          }
        }
      }
    }
  },
  // Back4App configuration
  base: '/',
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
      'parse'
    ],
    exclude: ['events'],
    esbuildOptions: {
      target: 'es2018'
    }
  },
  // Fix for Parse SDK browser compatibility
  define: {
    global: 'globalThis',
  },
  // Environment variables configuration
  envPrefix: 'VITE_',
  // Development server configuration
  server: {
    port: 3000,
    host: true,
    // Enable HTTPS in development for testing CDN features
    https: process.env.NODE_ENV === 'development' && process.env.VITE_HTTPS === 'true'
  },
  // Preview server configuration
  preview: {
    port: 4173,
    host: true
  }
})