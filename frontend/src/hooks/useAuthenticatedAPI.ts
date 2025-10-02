import { useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

/**
 * Hook for making authenticated API calls to backend services
 * Automatically includes session token from authenticated user
 */
export function useAuthenticatedAPI() {
  const { user } = useAuth();

  const authenticatedCall = useCallback(async (
    functionName: string, 
    params: Record<string, unknown> = {}
  ) => {
    if (!user?.sessionToken) {
      throw new Error('User not authenticated. Please log in to access this feature.');
    }

    // Make authenticated API call
    const response = await fetch(`/api/${functionName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user.sessionToken}`
      },
      body: JSON.stringify(params),
    });
    
    if (!response.ok) {
      throw new Error(`API call failed: ${response.statusText}`);
    }
    
    return await response.json();
  }, [user?.sessionToken]);

  const publicCall = useCallback(async (
    functionName: string, 
    params: Record<string, unknown> = {}
  ) => {
    // For public calls, use standard fetch without authentication
    const response = await fetch(`/api/public/${functionName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });
    
    if (!response.ok) {
      throw new Error(`Public API call failed: ${response.statusText}`);
    }
    
    return await response.json();
  }, []);

  return {
    authenticatedCall,
    publicCall,
    isAuthenticated: !!user?.sessionToken,
  };
}
