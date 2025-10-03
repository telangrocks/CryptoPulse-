import { useState, useEffect } from 'react';

import { useAuth } from '../contexts/AuthContext';

import TrialLockScreen from './TrialLockScreen';

interface TrialProtectedRouteProps {
  children: React.ReactNode;
  feature?: string;
}
interface TrialInfo {
  daysRemaining: number;
  hasUsedTrial: boolean;
  subscriptionStatus: string;
}
interface FeatureAccess {
  canAccessTrading: boolean;
  canAccessAPIKeys: boolean;
  canAccessBotSetup: boolean;
  canAccessBacktesting: boolean;
  canAccessMonitoring: boolean;
  canAccessAI: boolean;
  reason?: string;
}
// Production trial management service
const getTrialManagementService = () => ({
  checkFeatureAccess: async (email: string, billingStatus?: string): Promise<FeatureAccess> => {
    try {
      // Server-side validation - never trust client-side data
      const response = await fetch('/api/check-feature-access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('cryptopulse-session') || ''}`,
        },
        body: JSON.stringify({ email, billingStatus }),
      });
      if (!response.ok) {
        throw new Error('Failed to verify access permissions');
      }
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || 'Access verification failed');
      }
      return {
        canAccessTrading: result.access.canAccessTrading || false,
        canAccessAPIKeys: result.access.canAccessAPIKeys || false,
        canAccessBotSetup: result.access.canAccessBotSetup || false,
        canAccessBacktesting: result.access.canAccessBacktesting || false,
        canAccessMonitoring: result.access.canAccessMonitoring || false,
        canAccessAI: result.access.canAccessAI || false,
        reason: result.access.reason,
      };
    } catch (error) {
      // Default to blocking access on error for security
      return {
        canAccessTrading: false,
        canAccessAPIKeys: false,
        canAccessBotSetup: false,
        canAccessBacktesting: false,
        canAccessMonitoring: false,
        canAccessAI: false,
        reason: 'Unable to verify access permissions',
      };
    }
  },
  getTrialInfo: async (email: string): Promise<TrialInfo> => {
    try {
      const response = await fetch('/api/trial-info', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('cryptopulse-session') || ''}`,
        },
        body: JSON.stringify({ email }),
      });
      if (!response.ok) {
        throw new Error('Failed to fetch trial information');
      }
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || 'Trial info fetch failed');
      }
      return {
        daysRemaining: result.trialInfo.daysRemaining || 0,
        hasUsedTrial: result.trialInfo.hasUsedTrial || false,
        subscriptionStatus: result.trialInfo.subscriptionStatus || 'expired',
      };
    } catch (error) {
      // Default to expired trial for security
      return {
        daysRemaining: 0,
        hasUsedTrial: true,
        subscriptionStatus: 'expired',
      };
    }
  },
});
const logInfo = (message: string, component: string) => {
};
const logError = (message: string, component: string, error: any) => {
};
export default function TrialProtectedRoute({ children, feature }: TrialProtectedRouteProps) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [trialInfo, setTrialInfo] = useState<TrialInfo | null>(null);
  const [featureAccess, setFeatureAccess] = useState<FeatureAccess | null>(null);
  useEffect(() => {
    const checkTrialStatus = async () => {
      try {
        if (!user?.email) {
          setIsLoading(false);
          return;
        }
        const trialService = getTrialManagementService();
        // Check if user can access features (now async)
        const access = await trialService.checkFeatureAccess(user.email, user.billingStatus);
        setFeatureAccess(access);
        // Get trial information (now async)
        const trial = await trialService.getTrialInfo(user.email);
        setTrialInfo(trial);
        logInfo(`Trial status checked for ${user.email}: ${access.canAccessTrading ? 'allowed' : 'blocked'}`, 'TrialProtectedRoute');
      } catch (error) {
        logError('Failed to check trial status', 'TrialProtectedRoute', error);
        // Default to blocking access on error for security
        setFeatureAccess({
          canAccessTrading: false,
          canAccessAPIKeys: false,
          canAccessBotSetup: false,
          canAccessBacktesting: false,
          canAccessMonitoring: false,
          canAccessAI: false,
          reason: 'Unable to verify access permissions',
        });
        setTrialInfo({
          daysRemaining: 0,
          hasUsedTrial: true,
          subscriptionStatus: 'expired',
        });
      } finally {
        setIsLoading(false);
      }
    };
    checkTrialStatus();
  }, [user]);
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4" />
          <p className="text-white">Checking access permissions...</p>
        </div>
      </div>
    );
  }
  // If user doesn't have access, show trial lock screen
  if (!featureAccess?.canAccessTrading) {
    return (
      <TrialLockScreen
        onSubscribe={() => {
          // Navigate to payment page
          window.location.href = '/payment';
        }}
        trialInfo={trialInfo}
      />
    );
  }
  // If user has access, render the protected content
  return <>{children}</>;
}
// Hook for checking specific feature access
export function useFeatureAccess(feature: string) {
  const { user } = useAuth();
  const [hasAccess, setHasAccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    const checkAccess = async () => {
      try {
        if (!user?.email) {
          setHasAccess(false);
          setIsLoading(false);
          return;
        }
        const trialService = getTrialManagementService();
        const access = await trialService.checkFeatureAccess(user.email, user.billingStatus);
        // Check specific feature access
        switch (feature) {
          case 'trading':
            setHasAccess(access.canAccessTrading);
            break;
          case 'apiKeys':
            setHasAccess(access.canAccessAPIKeys);
            break;
          case 'botSetup':
            setHasAccess(access.canAccessBotSetup);
            break;
          case 'backtesting':
            setHasAccess(access.canAccessBacktesting);
            break;
          case 'monitoring':
            setHasAccess(access.canAccessMonitoring);
            break;
          case 'ai':
            setHasAccess(access.canAccessAI);
            break;
          default:
            setHasAccess(access.canAccessTrading);
        }
      } catch (error) {
        logError('Failed to check feature access', 'useFeatureAccess', error);
        setHasAccess(false);
      } finally {
        setIsLoading(false);
      }
    };
    checkAccess();
  }, [user, feature]);
  return { hasAccess, isLoading };
}
