import { WifiOff, Loader2 } from 'lucide-react';
import React, { useState, useEffect } from 'react';

// Custom hook for app state (you may need to adjust this based on your actual state management)
const useAppState = () => {
  const [state, setState] = useState({
    isLoading: false,
    isOnline: true,
    lastActivity: new Date(),
  });

  useEffect(() => {
    // Set up online/offline detection
    const handleOnline = () => setState(prev => ({ ...prev, isOnline: true }));
    const handleOffline = () => setState(prev => ({ ...prev, isOnline: false }));

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { state, setState };
};

export default function GlobalLoadingIndicator() {
  const { state } = useAppState();

  if (!state.isLoading) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 h-1">
        <div
          className="h-full bg-white/30 animate-pulse"
          style={{
            animation: 'loading-bar 2s ease-in-out infinite',
          }}
        />
      </div>

      <style>
        {`
          @keyframes loading-bar {
            0% { transform: translateX(-100%); }
            50% { transform: translateX(0%); }
            100% { transform: translateX(100%); }
          }
        `}
      </style>
    </div>
  );
}

export function ConnectionStatus() {
  const { state } = useAppState();

  if (state.isOnline) return null;

  return (
    <div className="fixed top-4 right-4 z-40 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2">
      <WifiOff className="h-4 w-4" />
      <span className="text-sm font-medium">No Internet Connection</span>
    </div>
  );
}

export function ActivityIndicator() {
  const { state } = useAppState();
  const [showIndicator, setShowIndicator] = React.useState(false);

  React.useEffect(() => {
    const now = new Date();
    const lastActivity = new Date(state.lastActivity);
    const timeDiff = now.getTime() - lastActivity.getTime();

    // Show indicator if no activity for 5 minutes
    if (timeDiff > 5 * 60 * 1000) {
      setShowIndicator(true);
    } else {
      setShowIndicator(false);
    }
  }, [state.lastActivity]);

  if (!showIndicator) return null;

  return (
    <div className="fixed bottom-20 right-6 z-40 bg-yellow-500 text-white px-3 py-2 rounded-lg shadow-lg flex items-center space-x-2">
      <Loader2 className="h-4 w-4 animate-spin" />
      <span className="text-sm font-medium">Session Active</span>
    </div>
  );
}