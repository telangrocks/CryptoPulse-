import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

// Import browser compatibility checker
import './lib/browserCompatibility'

// Add error boundary for debugging
window.addEventListener('error', (e) => {
  // Global error handling - errors are logged via the logger system
  document.getElementById('root')!.innerHTML = `
    <div style="padding: 20px; color: white; background: #1a1a1a; min-height: 100vh; font-family: Arial;">
      <h1>🚀 CryptoPulse Trading Bot</h1>
      <p>Loading your trading application...</p>
      <p>Error: ${e.error?.message || 'Unknown error'}</p>
    </div>
  `;
});

// Fallback if app doesn't load within 5 seconds
setTimeout(() => {
  const root = document.getElementById('root');
  if (root && root.innerHTML.trim() === '') {
    root.innerHTML = `
      <div style="padding: 20px; color: white; background: #1a1a1a; min-height: 100vh; font-family: Arial;">
        <h1>🚀 CryptoPulse Trading Bot</h1>
        <p>Loading your trading application...</p>
        <p>If this message persists, there may be a configuration issue.</p>
      </div>
    `;
  }
}, 5000);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
