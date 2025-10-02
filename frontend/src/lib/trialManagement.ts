interface TrialInfo {
  email: string;
  trialStartDate: Date;
  trialEndDate: Date;
  isActive: boolean;
  hasUsedTrial: boolean;
  subscriptionStatus: 'none' | 'active' | 'expired';
}

interface FeatureAccess {
  canAccessTrading: boolean;
  canAccessAPIKeys: boolean;
  canAccessBotSetup: boolean;
  canAccessBacktesting: boolean;
  canAccessAdvancedFeatures: boolean;
  maxAPIKeys: number;
  maxActiveStrategies: number;
}

interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  features: FeatureAccess;
  trialDays: number;
}

export class TrialManager {
  private trialInfo: TrialInfo | null = null;
  private readonly TRIAL_DURATION_DAYS = 7;
  private readonly LOCAL_STORAGE_KEY = 'cryptopulse_trial_info';

  constructor() {
    this.loadTrialInfo();
  }

  public initializeTrial(email: string): TrialInfo {
    const now = new Date();
    const trialEndDate = new Date(now.getTime() + (this.TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000));

    this.trialInfo = {
      email,
      trialStartDate: now,
      trialEndDate,
      isActive: true,
      hasUsedTrial: true,
      subscriptionStatus: 'none',
    };

    this.saveTrialInfo();
    return this.trialInfo;
  }

  public getTrialInfo(): TrialInfo | null {
    return this.trialInfo;
  }

  public isTrialActive(): boolean {
    if (!this.trialInfo) return false;

    const now = new Date();
    return this.trialInfo.isActive &&
           now <= this.trialInfo.trialEndDate &&
           this.trialInfo.subscriptionStatus !== 'active';
  }

  public getTrialDaysRemaining(): number {
    if (!this.trialInfo || !this.isTrialActive()) return 0;

    const now = new Date();
    const timeDiff = this.trialInfo.trialEndDate.getTime() - now.getTime();
    return Math.max(0, Math.ceil(timeDiff / (24 * 60 * 60 * 1000)));
  }

  public getTrialHoursRemaining(): number {
    if (!this.trialInfo || !this.isTrialActive()) return 0;

    const now = new Date();
    const timeDiff = this.trialInfo.trialEndDate.getTime() - now.getTime();
    return Math.max(0, Math.ceil(timeDiff / (60 * 60 * 1000)));
  }

  public hasUsedTrial(email: string): boolean {
    return this.trialInfo?.email === email && this.trialInfo?.hasUsedTrial === true;
  }

  public activateSubscription(planId: string): void {
    if (this.trialInfo) {
      this.trialInfo.subscriptionStatus = 'active';
      this.saveTrialInfo();
    }
  }

  public getFeatureAccess(): FeatureAccess {
    const isSubscribed = this.trialInfo?.subscriptionStatus === 'active';
    const isTrialActive = this.isTrialActive();

    if (isSubscribed) {
      // Full access for subscribers
      return {
        canAccessTrading: true,
        canAccessAPIKeys: true,
        canAccessBotSetup: true,
        canAccessBacktesting: true,
        canAccessAdvancedFeatures: true,
        maxAPIKeys: 10,
        maxActiveStrategies: 20,
      };
    } else if (isTrialActive) {
      // Limited access for trial users
      return {
        canAccessTrading: true,
        canAccessAPIKeys: true,
        canAccessBotSetup: true,
        canAccessBacktesting: false,
        canAccessAdvancedFeatures: false,
        maxAPIKeys: 2,
        maxActiveStrategies: 3,
      };
    } else {
      // No access for non-subscribers/expired trials
      return {
        canAccessTrading: false,
        canAccessAPIKeys: false,
        canAccessBotSetup: false,
        canAccessBacktesting: false,
        canAccessAdvancedFeatures: false,
        maxAPIKeys: 0,
        maxActiveStrategies: 0,
      };
    }
  }

  public canAccessFeature(feature: keyof FeatureAccess): boolean {
    const access = this.getFeatureAccess();
    return Boolean(access[feature]);
  }

  public getSubscriptionPlans(): SubscriptionPlan[] {
    return [
      {
        id: 'basic',
        name: 'Basic Plan',
        price: 29.99,
        currency: 'USD',
        trialDays: 7,
        features: {
          canAccessTrading: true,
          canAccessAPIKeys: true,
          canAccessBotSetup: true,
          canAccessBacktesting: true,
          canAccessAdvancedFeatures: false,
          maxAPIKeys: 5,
          maxActiveStrategies: 10,
        },
      },
      {
        id: 'premium',
        name: 'Premium Plan',
        price: 59.99,
        currency: 'USD',
        trialDays: 7,
        features: {
          canAccessTrading: true,
          canAccessAPIKeys: true,
          canAccessBotSetup: true,
          canAccessBacktesting: true,
          canAccessAdvancedFeatures: true,
          maxAPIKeys: 10,
          maxActiveStrategies: 20,
        },
      },
    ];
  }

  public expireTrial(): void {
    if (this.trialInfo) {
      this.trialInfo.isActive = false;
      this.saveTrialInfo();
    }
  }

  private loadTrialInfo(): void {
    try {
      const stored = localStorage.getItem(this.LOCAL_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.trialInfo = {
          ...parsed,
          trialStartDate: new Date(parsed.trialStartDate),
          trialEndDate: new Date(parsed.trialEndDate),
        };
      }
    } catch (error) {
      console.warn('Failed to load trial info:', error);
      this.trialInfo = null;
    }
  }

  private saveTrialInfo(): void {
    try {
      if (this.trialInfo) {
        localStorage.setItem(this.LOCAL_STORAGE_KEY, JSON.stringify(this.trialInfo));
      }
    } catch (error) {
      console.warn('Failed to save trial info:', error);
    }
  }

  public clearTrialInfo(): void {
    this.trialInfo = null;
    localStorage.removeItem(this.LOCAL_STORAGE_KEY);
  }
}

// Global instance
let globalTrialManager: TrialManager | null = null;

export function getTrialManager(): TrialManager {
  if (!globalTrialManager) {
    globalTrialManager = new TrialManager();
  }
  return globalTrialManager;
}

export function createTrialManager(): TrialManager {
  return new TrialManager();
}
