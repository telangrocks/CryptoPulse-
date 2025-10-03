import { generateRandomId } from './utils';

interface TradeSignal {
  id: string;
  pair: string;
  entry: number;
  stopLoss: number;
  takeProfit: number;
  strategy: string;
  confidence: number;
  riskLevel: 'low' | 'medium' | 'high';
  quantity: number;
  side: 'BUY' | 'SELL';
  timestamp: Date;
  exchange: string;
  timeframe: string;
}

interface SignalFilter {
  minConfidence?: number;
  maxRiskLevel?: 'low' | 'medium' | 'high';
  exchanges?: string[];
  pairs?: string[];
  strategies?: string[];
}

interface SignalSubscription {
  id: string;
  filter: SignalFilter;
  callback: (signal: TradeSignal) => void;
}

export class RealTimeSignalService {
  private subscribers: Map<string, SignalSubscription> = new Map();
  private signalHistory: TradeSignal[] = [];
  private maxHistorySize = 1000;

  constructor() {
    this.initializeService();
  }

  private initializeService(): void {
    // Initialize the real-time signal service
    console.log('Real-time signal service initialized');
  }

  public subscribe(filter: SignalFilter, callback: (signal: TradeSignal) => void): string {
    const subscriptionId = generateRandomId();

    this.subscribers.set(subscriptionId, {
      id: subscriptionId,
      filter,
      callback,
    });

    return subscriptionId;
  }

  public unsubscribe(subscriptionId: string): boolean {
    return this.subscribers.delete(subscriptionId);
  }

  public publishSignal(signal: TradeSignal): void {
    // Add to history
    this.signalHistory.unshift(signal);
    if (this.signalHistory.length > this.maxHistorySize) {
      this.signalHistory = this.signalHistory.slice(0, this.maxHistorySize);
    }

    // Notify subscribers
    this.subscribers.forEach((subscription) => {
      if (this.matchesFilter(signal, subscription.filter)) {
        try {
          subscription.callback(signal);
        } catch (error) {
          console.error('Error in signal callback:', error);
        }
      }
    });
  }

  private matchesFilter(signal: TradeSignal, filter: SignalFilter): boolean {
    if (filter.minConfidence && signal.confidence < filter.minConfidence) {
      return false;
    }

    if (filter.maxRiskLevel) {
      const riskLevels = { low: 1, medium: 2, high: 3 };
      if (riskLevels[signal.riskLevel] > riskLevels[filter.maxRiskLevel]) {
        return false;
      }
    }

    if (filter.exchanges && !filter.exchanges.includes(signal.exchange)) {
      return false;
    }

    if (filter.pairs && !filter.pairs.includes(signal.pair)) {
      return false;
    }

    if (filter.strategies && !filter.strategies.includes(signal.strategy)) {
      return false;
    }

    return true;
  }

  public getSignalHistory(limit = 100): TradeSignal[] {
    return this.signalHistory.slice(0, limit);
  }

  public getFilteredSignals(filter: SignalFilter, limit = 100): TradeSignal[] {
    return this.signalHistory
      .filter(signal => this.matchesFilter(signal, filter))
      .slice(0, limit);
  }

  public clearHistory(): void {
    this.signalHistory = [];
  }

  public getSubscriberCount(): number {
    return this.subscribers.size;
  }
}

// Global instance
let globalSignalService: RealTimeSignalService | null = null;

export function getSignalService(): RealTimeSignalService {
  if (!globalSignalService) {
    globalSignalService = new RealTimeSignalService();
  }
  return globalSignalService;
}

export function createSignalService(): RealTimeSignalService {
  return new RealTimeSignalService();
}
