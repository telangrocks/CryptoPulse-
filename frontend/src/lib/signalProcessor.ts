import crypto from 'crypto';

interface SignalProcessorConfig {
  minConfidence: number;
  maxSignalsPerMinute: number;
  cooldownPeriod: number; // in milliseconds
  priorityThreshold: number;
}

interface ProcessedSignal {
  id: string;
  pair: string;
  entry: number;
  stopLoss: number;
  takeProfit: number;
  confidence: number;
  priority: number;
  timestamp: Date;
  processedAt: Date;
  status: 'pending' | 'processed' | 'rejected';
}

interface RawSignal {
  pair: string;
  entry: number;
  stopLoss: number;
  takeProfit: number;
  confidence: number;
  strategy: string;
  timeframe: string;
}

export class SignalProcessor {
  private config: SignalProcessorConfig;
  private signalQueue: ProcessedSignal[] = [];
  private processedSignals: ProcessedSignal[] = [];
  private lastProcessingTime = 0;
  private signalCounts: Map<string, number> = new Map();

  constructor(config: Partial<SignalProcessorConfig> = {}) {
    this.config = {
      minConfidence: 70,
      maxSignalsPerMinute: 5,
      cooldownPeriod: 60000,
      priorityThreshold: 85,
      ...config,
    };
  }

  public processSignal(rawSignal: RawSignal): ProcessedSignal | null {
    // Validate signal
    if (!this.isValidSignal(rawSignal)) {
      return null;
    }

    // Check rate limits
    if (!this.checkRateLimit(rawSignal.pair)) {
      return null;
    }

    // Create processed signal
    const processedSignal: ProcessedSignal = {
      id: crypto.randomUUID(),
      ...rawSignal,
      priority: this.calculatePriority(rawSignal),
      timestamp: new Date(),
      processedAt: new Date(),
      status: 'pending',
    };

    // Add to queue if meets minimum confidence
    if (rawSignal.confidence >= this.config.minConfidence) {
      this.signalQueue.push(processedSignal);
      this.updateSignalCount(rawSignal.pair);
      processedSignal.status = 'processed';
    } else {
      processedSignal.status = 'rejected';
    }

    this.processedSignals.push(processedSignal);
    return processedSignal;
  }

  private isValidSignal(signal: RawSignal): boolean {
    return (
      typeof signal.pair === 'string' &&
      typeof signal.entry === 'number' &&
      typeof signal.stopLoss === 'number' &&
      typeof signal.takeProfit === 'number' &&
      typeof signal.confidence === 'number' &&
      signal.entry > 0 &&
      signal.stopLoss > 0 &&
      signal.takeProfit > 0 &&
      signal.confidence >= 0 &&
      signal.confidence <= 100
    );
  }

  private checkRateLimit(pair: string): boolean {
    const now = Date.now();
    const minute = Math.floor(now / 60000);
    const key = `${pair}_${minute}`;
    const count = this.signalCounts.get(key) || 0;

    return count < this.config.maxSignalsPerMinute;
  }

  private updateSignalCount(pair: string): void {
    const now = Date.now();
    const minute = Math.floor(now / 60000);
    const key = `${pair}_${minute}`;
    const count = this.signalCounts.get(key) || 0;
    this.signalCounts.set(key, count + 1);

    // Cleanup old counts
    this.cleanupOldCounts();
  }

  private cleanupOldCounts(): void {
    const now = Date.now();
    const currentMinute = Math.floor(now / 60000);

    for (const [key] of this.signalCounts) {
      const keyMinute = parseInt(key.split('_').pop() || '0');
      if (currentMinute - keyMinute > 5) {
        this.signalCounts.delete(key);
      }
    }
  }

  private calculatePriority(signal: RawSignal): number {
    let priority = signal.confidence;

    // Boost priority for high confidence signals
    if (signal.confidence >= this.config.priorityThreshold) {
      priority += 10;
    }

    // Adjust based on risk-reward ratio
    const risk = Math.abs(signal.entry - signal.stopLoss);
    const reward = Math.abs(signal.takeProfit - signal.entry);
    const riskRewardRatio = reward / risk;

    if (riskRewardRatio >= 2) {
      priority += 5;
    } else if (riskRewardRatio < 1) {
      priority -= 10;
    }

    return Math.min(100, Math.max(0, priority));
  }

  public getQueuedSignals(): ProcessedSignal[] {
    return this.signalQueue
      .filter(signal => signal.status === 'processed')
      .sort((a, b) => b.priority - a.priority);
  }

  public getProcessedSignals(limit = 100): ProcessedSignal[] {
    return this.processedSignals
      .slice(-limit)
      .sort((a, b) => b.processedAt.getTime() - a.processedAt.getTime());
  }

  public clearQueue(): void {
    this.signalQueue = [];
  }

  public getQueueSize(): number {
    return this.signalQueue.filter(signal => signal.status === 'processed').length;
  }

  public updateConfig(newConfig: Partial<SignalProcessorConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

// Global instance
let globalSignalProcessor: SignalProcessor | null = null;

export function getSignalProcessor(): SignalProcessor {
  if (!globalSignalProcessor) {
    globalSignalProcessor = new SignalProcessor();
  }
  return globalSignalProcessor;
}

export function createSignalProcessor(config?: Partial<SignalProcessorConfig>): SignalProcessor {
  return new SignalProcessor(config);
}
