import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getTrialManagementService } from '../lib/trialManagement'
import TrialLockScreen from './TrialLockScreen'
import { logInfo, logError } from '../lib/logger'

interface TrialProtectedRouteProps {
  children: React.ReactNode
  feature?: string
}

export default function TrialProtectedRoute({ children, feature }: TrialProtectedRouteProps) {
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [trialInfo, setTrialInfo] = useState<any>(null)
  const [featureAccess, setFeatureAccess] = useState<any>(null)

  useEffect(() => {
    const checkTrialStatus = async () => {
      try {
        if (!user?.email) {
          setIsLoading(false)
          return
        }

        const trialService = getTrialManagementService()
        
        // Check if user can access features
        const access = trialService.checkFeatureAccess(user.email, user.billingStatus)
        setFeatureAccess(access)

        // Get trial information
        const trial = trialService.getTrialInfo(user.email)
        if (trial) {
          setTrialInfo({
            daysRemaining: trialService.getDaysRemaining(user.email),
            hasUsedTrial: trial.hasUsedTrial,
            subscriptionStatus: trial.subscriptionStatus
          })
        }

        logInfo(`Trial status checked for ${user.email}: ${access.canAccessTrading ? 'allowed' : 'blocked'}`, 'TrialProtectedRoute')
      } catch (error) {
        logError('Failed to check trial status', 'TrialProtectedRoute', error)
        // Default to blocking access on error
        setFeatureAccess({
          canAccessTrading: false,
          canAccessAPIKeys: false,
          canAccessBotSetup: false,
          canAccessBacktesting: false,
          canAccessMonitoring: false,
          canAccessAI: false,
          reason: 'Unable to verify access permissions'
        })
      } finally {
        setIsLoading(false)
      }
    }

    checkTrialStatus()
  }, [user])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white">Checking access permissions...</p>
        </div>
      </div>
    )
  }

  // If user doesn't have access, show trial lock screen
  if (!featureAccess?.canAccessTrading) {
    return (
      <TrialLockScreen 
        trialInfo={trialInfo}
        onSubscribe={() => {
          // Navigate to payment page
          window.location.href = '/payment'
        }}
      />
    )
  }

  // If user has access, render the protected content
  return <>{children}</>
}

// Hook for checking specific feature access
export function useFeatureAccess(feature: string) {
  const { user } = useAuth()
  const [hasAccess, setHasAccess] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const checkAccess = async () => {
      try {
        if (!user?.email) {
          setHasAccess(false)
          setIsLoading(false)
          return
        }

        const trialService = getTrialManagementService()
        const access = trialService.checkFeatureAccess(user.email, user.billingStatus)
        
        // Check specific feature access
        switch (feature) {
          case 'trading':
            setHasAccess(access.canAccessTrading)
            break
          case 'apiKeys':
            setHasAccess(access.canAccessAPIKeys)
            break
          case 'botSetup':
            setHasAccess(access.canAccessBotSetup)
            break
          case 'backtesting':
            setHasAccess(access.canAccessBacktesting)
            break
          case 'monitoring':
            setHasAccess(access.canAccessMonitoring)
            break
          case 'ai':
            setHasAccess(access.canAccessAI)
            break
          default:
            setHasAccess(access.canAccessTrading)
        }
      } catch (error) {
        logError('Failed to check feature access', 'useFeatureAccess', error)
        setHasAccess(false)
      } finally {
        setIsLoading(false)
      }
    }

    checkAccess()
  }, [user, feature])

  return { hasAccess, isLoading }
}
