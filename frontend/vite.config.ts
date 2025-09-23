import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "events": path.resolve(__dirname, "./src/polyfills/events.js"),
    },
  },
  build: {
    // Simplified build configuration
    minify: 'esbuild',
    sourcemap: false,
    chunkSizeWarningLimit: 1000
  },
  // GitHub Pages configuration
  base: '/Crypto-Test-/',
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
    exclude: ['events']
  },
  // Fix for Parse SDK browser compatibility
  define: {
    global: 'globalThis',
  },
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