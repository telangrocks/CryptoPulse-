import { useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ParseCloud } from '../lib/parse-http';
import { callBack4AppFunction } from '../firebase/config';

/**
 * Hook for making authenticated API calls to Back4App cloud functions
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

    // Use callBack4AppFunction with session token for authenticated calls
    return await callBack4AppFunction(functionName, params, user.sessionToken);
  }, [user?.sessionToken]);

  const publicCall = useCallback(async (
    functionName: string, 
    params: Record<string, unknown> = {}
  ) => {
    return await ParseCloud.run(functionName, params);
  }, []);

  return {
    authenticatedCall,
    publicCall,
    isAuthenticated: !!user?.sessionToken
  };
}
