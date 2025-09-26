import { logInfo, logError, logWarn } from './logger'

interface TrialInfo {
  email: string
  trialStartDate: Date
  trialEndDate: Date
  isActive: boolean
  hasUsedTrial: boolean
  subscriptionStatus: 'none' | 'active' | 'expired'
}

interface FeatureAccess {
  canAccessTrading: boolean
  canAccessAPIKeys: boolean
  canAccessBotSetup: boolean
  canAccessBacktesting: boolean
  canAccessMonitoring: boolean
  canAccessAI: boolean
  reason?: string
}

class TrialManagementService {
  private trialDuration = 5 * 24 * 60 * 60 * 1000 // 5 days in milliseconds
  private trialUsers = new Map<string, TrialInfo>()

  /**
   * Check if user can start a new trial
   */
  canStartTrial(email: string): { allowed: boolean; reason?: string } {
    try {
      const normalizedEmail = email.toLowerCase().trim()
      
      // Check if user already has an active trial
      const existingTrial = this.trialUsers.get(normalizedEmail)
      
      if (existingTrial) {
        if (existingTrial.isActive && new Date() < existingTrial.trialEndDate) {
          return {
            allowed: false,
            reason: 'You already have an active trial. Please wait for it to expire or subscribe to continue.'
          }
        }
        
        if (existingTrial.hasUsedTrial && existingTrial.subscriptionStatus !== 'active') {
          return {
            allowed: false,
            reason: 'You have already used your free trial. Please subscribe to continue using the app.'
          }
        }
      }
      
      return { allowed: true }
    } catch (error) {
      logError('Failed to check trial eligibility', 'TrialManagementService', error)
      return { allowed: false, reason: 'Unable to verify trial eligibility' }
    }
  }

  /**
   * Start a new trial for user
   */
  startTrial(email: string): TrialInfo {
    try {
      const normalizedEmail = email.toLowerCase().trim()
      const now = new Date()
      const trialEndDate = new Date(now.getTime() + this.trialDuration)
      
      const trialInfo: TrialInfo = {
        email: normalizedEmail,
        trialStartDate: now,
        trialEndDate: trialEndDate,
        isActive: true,
        hasUsedTrial: true,
        subscriptionStatus: 'none'
      }
      
      this.trialUsers.set(normalizedEmail, trialInfo)
      
      // Store in localStorage for persistence
      localStorage.setItem(`trial_${normalizedEmail}`, JSON.stringify(trialInfo))
      
      logInfo(`Trial started for ${normalizedEmail}`, 'TrialManagementService')
      return trialInfo
    } catch (error) {
      logError('Failed to start trial', 'TrialManagementService', error)
      throw error
    }
  }

  /**
   * Check if user's trial is still active
   */
  isTrialActive(email: string): boolean {
    try {
      const normalizedEmail = email.toLowerCase().trim()
      const trialInfo = this.trialUsers.get(normalizedEmail)
      
      if (!trialInfo) {
        // Try to load from localStorage
        const stored = localStorage.getItem(`trial_${normalizedEmail}`)
        if (stored) {
          const parsed = JSON.parse(stored)
          this.trialUsers.set(normalizedEmail, {
            ...parsed,
            trialStartDate: new Date(parsed.trialStartDate),
            trialEndDate: new Date(parsed.trialEndDate)
          })
          return this.isTrialActive(email)
        }
        return false
      }
      
      const now = new Date()
      const isActive = trialInfo.isActive && now < trialInfo.trialEndDate
      
      // Update trial status if expired
      if (!isActive && trialInfo.isActive) {
        trialInfo.isActive = false
        this.trialUsers.set(normalizedEmail, trialInfo)
        localStorage.setItem(`trial_${normalizedEmail}`, JSON.stringify(trialInfo))
      }
      
      return isActive
    } catch (error) {
      logError('Failed to check trial status', 'TrialManagementService', error)
      return false
    }
  }

  /**
   * Get trial information for user
   */
  getTrialInfo(email: string): TrialInfo | null {
    try {
      const normalizedEmail = email.toLowerCase().trim()
      let trialInfo = this.trialUsers.get(normalizedEmail)
      
      if (!trialInfo) {
        // Try to load from localStorage
        const stored = localStorage.getItem(`trial_${normalizedEmail}`)
        if (stored) {
          const parsed = JSON.parse(stored)
          trialInfo = {
            ...parsed,
            trialStartDate: new Date(parsed.trialStartDate),
            trialEndDate: new Date(parsed.trialEndDate)
          }
          this.trialUsers.set(normalizedEmail, trialInfo)
        }
      }
      
      return trialInfo
    } catch (error) {
      logError('Failed to get trial info', 'TrialManagementService', error)
      return null
    }
  }

  /**
   * Check feature access based on trial/subscription status
   */
  checkFeatureAccess(email: string, subscriptionStatus: string = 'none'): FeatureAccess {
    try {
      const normalizedEmail = email.toLowerCase().trim()
      const trialInfo = this.getTrialInfo(normalizedEmail)
      const isTrialActive = this.isTrialActive(normalizedEmail)
      const hasActiveSubscription = subscriptionStatus === 'active'
      
      // If user has active subscription, allow all features
      if (hasActiveSubscription) {
        return {
          canAccessTrading: true,
          canAccessAPIKeys: true,
          canAccessBotSetup: true,
          canAccessBacktesting: true,
          canAccessMonitoring: true,
          canAccessAI: true
        }
      }
      
      // If trial is active, allow all features
      if (isTrialActive) {
        return {
          canAccessTrading: true,
          canAccessAPIKeys: true,
          canAccessBotSetup: true,
          canAccessBacktesting: true,
          canAccessMonitoring: true,
          canAccessAI: true
        }
      }
      
      // If trial expired and no subscription, block all features
      return {
        canAccessTrading: false,
        canAccessAPIKeys: false,
        canAccessBotSetup: false,
        canAccessBacktesting: false,
        canAccessMonitoring: false,
        canAccessAI: false,
        reason: 'Your trial has expired. Please subscribe to continue using the app.'
      }
    } catch (error) {
      logError('Failed to check feature access', 'TrialManagementService', error)
      return {
        canAccessTrading: false,
        canAccessAPIKeys: false,
        canAccessBotSetup: false,
        canAccessBacktesting: false,
        canAccessMonitoring: false,
        canAccessAI: false,
        reason: 'Unable to verify access permissions'
      }
    }
  }

  /**
   * Update subscription status
   */
  updateSubscriptionStatus(email: string, status: 'active' | 'expired' | 'none') {
    try {
      const normalizedEmail = email.toLowerCase().trim()
      const trialInfo = this.getTrialInfo(normalizedEmail)
      
      if (trialInfo) {
        trialInfo.subscriptionStatus = status
        this.trialUsers.set(normalizedEmail, trialInfo)
        localStorage.setItem(`trial_${normalizedEmail}`, JSON.stringify(trialInfo))
        
        logInfo(`Subscription status updated for ${normalizedEmail}: ${status}`, 'TrialManagementService')
      }
    } catch (error) {
      logError('Failed to update subscription status', 'TrialManagementService', error)
    }
  }

  /**
   * Get days remaining in trial
   */
  getDaysRemaining(email: string): number {
    try {
      const trialInfo = this.getTrialInfo(email)
      if (!trialInfo || !trialInfo.isActive) return 0
      
      const now = new Date()
      const timeDiff = trialInfo.trialEndDate.getTime() - now.getTime()
      const daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24))
      
      return Math.max(0, daysRemaining)
    } catch (error) {
      logError('Failed to calculate days remaining', 'TrialManagementService', error)
      return 0
    }
  }

  /**
   * Check if user has used trial before
   */
  hasUsedTrial(email: string): boolean {
    try {
      const trialInfo = this.getTrialInfo(email)
      return trialInfo?.hasUsedTrial || false
    } catch (error) {
      logError('Failed to check trial usage', 'TrialManagementService', error)
      return false
    }
  }

  /**
   * Reset trial for testing purposes (admin only)
   */
  resetTrial(email: string) {
    try {
      const normalizedEmail = email.toLowerCase().trim()
      this.trialUsers.delete(normalizedEmail)
      localStorage.removeItem(`trial_${normalizedEmail}`)
      logInfo(`Trial reset for ${normalizedEmail}`, 'TrialManagementService')
    } catch (error) {
      logError('Failed to reset trial', 'TrialManagementService', error)
    }
  }
}

// Singleton instance
let trialManagementInstance: TrialManagementService | null = null

export function getTrialManagementService(): TrialManagementService {
  if (!trialManagementInstance) {
    trialManagementInstance = new TrialManagementService()
  }
  return trialManagementInstance
}

export function destroyTrialManagementService() {
  if (trialManagementInstance) {
    trialManagementInstance = null
  }
}

export default TrialManagementService
