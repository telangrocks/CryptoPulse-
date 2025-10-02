import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// Production-optimized Vite configuration
export default defineConfig({
  plugins: [react()],
  logLevel: 'warn',
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // ULTRA-OPTIMIZED build configuration for production
    minify: 'terser',
    sourcemap: false,
    chunkSizeWarningLimit: 1000,
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
            return 'vendor';
          }
          // Group our lib modules to avoid mixed import issues
          if (id.includes('/src/lib/')) {
            return 'lib-utils';
          }
        },
        // Optimize file names for caching
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    }
  },
  
  // Application configuration
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
    ],
    esbuildOptions: {
      target: 'es2018'
    }
  },
  
  // Browser compatibility
  define: {
    global: 'globalThis',
    'process.env.NODE_ENV': '"production"'
  },
  
  // Environment variables configuration
  envPrefix: 'VITE_',
  
  // Production server configuration
  server: {
    port: 3000,
    host: true,
    https: false
  },
  
  // Preview server configuration
  preview: {
    port: 4173,
    host: true,
    // Security headers for production preview
    headers: {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:;"
    }
  }
})
