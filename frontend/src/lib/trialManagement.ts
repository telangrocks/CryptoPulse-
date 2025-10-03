/**
 * Trial Management Service
 * Handles trial periods and subscription management
 */

interface TrialInfo {
  daysRemaining: number;
  hasUsedTrial: boolean;
  subscriptionStatus: string;
}

interface TrialManagementService {
  getTrialInfo(): TrialInfo;
  startTrial(): Promise<boolean>;
  endTrial(): void;
  isTrialActive(): boolean;
  canStartTrial(): boolean;
}

class TrialManager implements TrialManagementService {
  private trialKey = 'cryptopulse_trial_info';

  getTrialInfo(): TrialInfo {
    try {
      const stored = localStorage.getItem(this.trialKey);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Failed to get trial info:', error);
    }

    return {
      daysRemaining: 7,
      hasUsedTrial: false,
      subscriptionStatus: 'trial',
    };
  }

  async startTrial(): Promise<boolean> {
    try {
      const trialInfo = this.getTrialInfo();
      if (trialInfo.hasUsedTrial) {
        return false;
      }

      const newTrialInfo: TrialInfo = {
        daysRemaining: 7,
        hasUsedTrial: true,
        subscriptionStatus: 'trial',
      };

      localStorage.setItem(this.trialKey, JSON.stringify(newTrialInfo));
      return true;
    } catch (error) {
      console.error('Failed to start trial:', error);
      return false;
    }
  }

  endTrial(): void {
    try {
      const trialInfo = this.getTrialInfo();
      const updatedInfo: TrialInfo = {
        ...trialInfo,
        subscriptionStatus: 'expired',
        daysRemaining: 0,
      };
      localStorage.setItem(this.trialKey, JSON.stringify(updatedInfo));
    } catch (error) {
      console.error('Failed to end trial:', error);
    }
  }

  isTrialActive(): boolean {
    const trialInfo = this.getTrialInfo();
    return trialInfo.hasUsedTrial && trialInfo.daysRemaining > 0;
  }

  canStartTrial(): boolean {
    const trialInfo = this.getTrialInfo();
    return !trialInfo.hasUsedTrial;
  }
}

// Create singleton instance
const trialManager = new TrialManager();

// Export singleton and functions
export function getTrialManagementService(): TrialManagementService {
  return trialManager;
}

export const trialManagement = {
  getTrialInfo: () => trialManager.getTrialInfo(),
  startTrial: () => trialManager.startTrial(),
  endTrial: () => trialManager.endTrial(),
  isTrialActive: () => trialManager.isTrialActive(),
  canStartTrial: () => trialManager.canStartTrial(),
};

export default trialManager;