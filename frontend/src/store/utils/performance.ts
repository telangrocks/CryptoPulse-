/**
 * @fileoverview Performance optimization utilities for Redux store
 * @version 1.0.0
 * @author CryptoPulse Team
 */

import { createSelector, createSelectorCreator } from '@reduxjs/toolkit';

// Simple memoize function for performance optimization
const defaultMemoize = (fn: Function) => {
  let lastArgs: any[] = [];
  let lastResult: any;
  
  return (...args: any[]) => {
    if (args.length !== lastArgs.length || 
        !args.every((arg, i) => arg === lastArgs[i])) {
      lastArgs = args;
      lastResult = fn(...args);
    }
    return lastResult;
  };
};

import { RootState } from '../types';

// ============================================================================
// MEMOIZATION UTILITIES
// ============================================================================

/**
 * Custom equality function for deep comparison
 * @param a - First value
 * @param b - Second value
 * @returns True if values are equal
 */
const deepEqual = (a: any, b: any): boolean => {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== typeof b) return false;

  if (typeof a === 'object') {
    if (Array.isArray(a) !== Array.isArray(b)) return false;

    if (Array.isArray(a)) {
      if (a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++) {
        if (!deepEqual(a[i], b[i])) return false;
      }
      return true;
    }

    const keysA = Object.keys(a);
    const keysB = Object.keys(b);

    if (keysA.length !== keysB.length) return false;

    for (const key of keysA) {
      if (!keysB.includes(key)) return false;
      if (!deepEqual(a[key], b[key])) return false;
    }

    return true;
  }

  return false;
};

/**
 * Creates a selector creator with custom memoization
 */
export const createDeepEqualSelector = createSelectorCreator(
  defaultMemoize,
  deepEqual,
);

/**
 * Creates a selector creator with shallow comparison
 */
export const createShallowEqualSelector = createSelectorCreator(
  defaultMemoize,
  (a: any, b: any) => a === b,
);

// ============================================================================
// AUTH SELECTORS
// ============================================================================

/**
 * Selects the entire auth state
 */
export const selectAuthState = (state: RootState) => state.auth;

/**
 * Selects the current user
 */
export const selectCurrentUser = (state: RootState) => state.auth.user;

/**
 * Selects authentication status
 */
export const selectIsAuthenticated = (state: RootState) => state.auth.isAuthenticated;

/**
 * Selects auth loading state
 */
export const selectAuthLoading = (state: RootState) => state.auth.isLoading;

/**
 * Selects auth error
 */
export const selectAuthError = (state: RootState) => state.auth.error;

/**
 * Selects user subscription info
 */
export const selectUserSubscription = createSelector(
  [selectCurrentUser],
  (user) => user?.subscription,
);

/**
 * Selects if user is in trial
 */
export const selectIsTrialUser = createSelector(
  [selectUserSubscription],
  (subscription) => subscription?.trialActive ?? false,
);

/**
 * Selects trial days remaining
 */
export const selectTrialDaysRemaining = createSelector(
  [selectUserSubscription],
  (subscription) => subscription?.daysRemaining ?? 0,
);

/**
 * Selects user preferences
 */
export const selectUserPreferences = createSelector(
  [selectCurrentUser],
  (user) => user?.preferences,
);

/**
 * Selects user trading preferences
 */
export const selectTradingPreferences = createSelector(
  [selectUserPreferences],
  (preferences) => preferences?.trading,
);

// ============================================================================
// TRADING SELECTORS
// ============================================================================

/**
 * Selects the entire trading state
 */
export const selectTradingState = (state: RootState) => state.trading;

/**
 * Selects all trades
 */
export const selectTrades = (state: RootState) => state.trading.trades;

/**
 * Selects all positions
 */
export const selectPositions = (state: RootState) => state.trading.positions;

/**
 * Selects active orders
 */
export const selectActiveOrders = (state: RootState) => state.trading.activeOrders;

/**
 * Selects selected trading symbol
 */
export const selectSelectedSymbol = (state: RootState) => state.trading.selectedSymbol;

/**
 * Selects trading enabled status
 */
export const selectTradingEnabled = (state: RootState) => state.trading.tradingEnabled;

/**
 * Selects risk level
 */
export const selectRiskLevel = (state: RootState) => state.trading.riskLevel;

/**
 * Selects trading loading state
 */
export const selectTradingLoading = (state: RootState) => state.trading.isLoading;

/**
 * Selects trading error
 */
export const selectTradingError = (state: RootState) => state.trading.error;

/**
 * Selects trades by symbol
 */
export const selectTradesBySymbol = createSelector(
  [selectTrades, selectSelectedSymbol],
  (trades, symbol) => trades.filter(trade => trade.symbol === symbol),
);

/**
 * Selects recent trades (last 24 hours)
 */
export const selectRecentTrades = createSelector(
  [selectTrades],
  (trades) => {
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    return trades.filter(trade => new Date(trade.timestamp).getTime() > oneDayAgo);
  },
);

/**
 * Selects winning trades
 */
export const selectWinningTrades = createSelector(
  [selectTrades],
  (trades) => trades.filter(trade => (trade.profit ?? 0) > 0),
);

/**
 * Selects losing trades
 */
export const selectLosingTrades = createSelector(
  [selectTrades],
  (trades) => trades.filter(trade => (trade.profit ?? 0) < 0),
);

/**
 * Selects total P&L
 */
export const selectTotalPnL = createSelector(
  [selectTrades],
  (trades) => trades.reduce((total, trade) => total + (trade.profit ?? 0), 0),
);

/**
 * Selects win rate
 */
export const selectWinRate = createSelector(
  [selectWinningTrades, selectTrades],
  (winningTrades, allTrades) =>
    allTrades.length > 0 ? (winningTrades.length / allTrades.length) * 100 : 0,
);

/**
 * Selects positions by symbol
 */
export const selectPositionsBySymbol = createSelector(
  [selectPositions, selectSelectedSymbol],
  (positions, symbol) => positions.filter(position => position.symbol === symbol),
);

/**
 * Selects total unrealized P&L
 */
export const selectTotalUnrealizedPnL = createSelector(
  [selectPositions],
  (positions) => positions.reduce((total, position) => total + position.unrealizedPnl, 0),
);

// ============================================================================
// MARKET DATA SELECTORS
// ============================================================================

/**
 * Selects the entire market data state
 */
export const selectMarketDataState = (state: RootState) => state.marketData;

/**
 * Selects all market data
 */
export const selectMarketData = (state: RootState) => state.marketData.data;

/**
 * Selects selected market symbol
 */
export const selectSelectedMarketSymbol = (state: RootState) => state.marketData.selectedSymbol;

/**
 * Selects market data loading state
 */
export const selectMarketDataLoading = (state: RootState) => state.marketData.loading;

/**
 * Selects market data error
 */
export const selectMarketDataError = (state: RootState) => state.marketData.error;

/**
 * Selects market data for selected symbol
 */
export const selectSelectedMarketData = createSelector(
  [selectMarketData, selectSelectedMarketSymbol],
  (data, symbol) => data.find(item => item.symbol === symbol),
);

/**
 * Selects top gainers
 */
export const selectTopGainers = createSelector(
  [selectMarketData],
  (data) => [...data]
    .sort((a, b) => b.changePercent - a.changePercent)
    .slice(0, 10),
);

/**
 * Selects top losers
 */
export const selectTopLosers = createSelector(
  [selectMarketData],
  (data) => [...data]
    .sort((a, b) => a.changePercent - b.changePercent)
    .slice(0, 10),
);

/**
 * Selects highest volume
 */
export const selectHighestVolume = createSelector(
  [selectMarketData],
  (data) => [...data]
    .sort((a, b) => b.volume - a.volume)
    .slice(0, 10),
);

// ============================================================================
// BOT SELECTORS
// ============================================================================

/**
 * Selects the entire bot state
 */
export const selectBotState = (state: RootState) => state.bot;

/**
 * Selects all bots
 */
export const selectBots = (state: RootState) => state.bot.bots;

/**
 * Selects active bots
 */
export const selectActiveBots = (state: RootState) => state.bot.activeBots;

/**
 * Selects selected bot
 */
export const selectSelectedBot = (state: RootState) => state.bot.selectedBot;

/**
 * Selects bot loading state
 */
export const selectBotLoading = (state: RootState) => state.bot.loading;

/**
 * Selects bot error
 */
export const selectBotError = (state: RootState) => state.bot.error;

/**
 * Selects bot by ID
 */
export const selectBotById = createSelector(
  [selectBots, (state: RootState, botId: string) => botId],
  (bots, botId) => bots.find(bot => bot.id === botId),
);

/**
 * Selects active bot configs
 */
export const selectActiveBotConfigs = createSelector(
  [selectBots, selectActiveBots],
  (bots, activeBotIds) => bots.filter(bot => activeBotIds.includes(bot.id)),
);

/**
 * Selects bots by strategy
 */
export const selectBotsByStrategy = createSelector(
  [selectBots, (state: RootState, strategy: string) => strategy],
  (bots, strategy) => bots.filter(bot => bot.strategy === strategy),
);

/**
 * Selects bot performance summary
 */
export const selectBotPerformanceSummary = createSelector(
  [selectBots],
  (bots) => {
    const totalBots = bots.length;
    const activeBots = bots.filter(bot => bot.isActive).length;
    const totalPnL = bots.reduce((sum, bot) => sum + (bot.performance?.totalPnL ?? 0), 0);
    const averageWinRate = bots.length > 0
      ? bots.reduce((sum, bot) => sum + (bot.performance?.winRate ?? 0), 0) / bots.length
      : 0;

    return {
      totalBots,
      activeBots,
      totalPnL,
      averageWinRate,
    };
  },
);

// ============================================================================
// UI SELECTORS
// ============================================================================

/**
 * Selects the entire UI state
 */
export const selectUIState = (state: RootState) => state.ui;

/**
 * Selects current theme
 */
export const selectTheme = (state: RootState) => state.ui.theme;

/**
 * Selects sidebar open state
 */
export const selectSidebarOpen = (state: RootState) => state.ui.sidebarOpen;

/**
 * Selects UI loading state
 */
export const selectUILoading = (state: RootState) => state.ui.loading;

/**
 * Selects UI notifications
 */
export const selectUINotifications = (state: RootState) => state.ui.notifications;

/**
 * Selects unread notification count
 */
export const selectUnreadNotificationCount = createSelector(
  [selectUINotifications],
  (notifications) => notifications.filter(n => !n.read).length,
);

// ============================================================================
// NOTIFICATION SELECTORS
// ============================================================================

/**
 * Selects the entire notification state
 */
export const selectNotificationState = (state: RootState) => state.notification;

/**
 * Selects all notifications
 */
export const selectNotifications = (state: RootState) => state.notification.notifications;

/**
 * Selects unread count
 */
export const selectUnreadCount = (state: RootState) => state.notification.unreadCount;

/**
 * Selects unread notifications
 */
export const selectUnreadNotifications = createSelector(
  [selectNotifications],
  (notifications) => notifications.filter(n => !n.read),
);

/**
 * Selects notifications by type
 */
export const selectNotificationsByType = createSelector(
  [selectNotifications, (state: RootState, type: string) => type],
  (notifications, type) => notifications.filter(n => n.type === type),
);

/**
 * Selects recent notifications (last 24 hours)
 */
export const selectRecentNotifications = createSelector(
  [selectNotifications],
  (notifications) => {
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    return notifications.filter(n => n.timestamp > oneDayAgo);
  },
);

// ============================================================================
// PERFORMANCE MONITORING
// ============================================================================

/**
 * Performance metrics tracking
 */
class PerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();
  private observers: Set<(metrics: Record<string, number[]>) => void> = new Set();

  /**
   * Records a performance metric
   * @param name - Metric name
   * @param value - Metric value
   */
  recordMetric(name: string, value: number): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    const values = this.metrics.get(name)!;
    values.push(value);

    // Keep only last 100 values
    if (values.length > 100) {
      values.shift();
    }

    this.notifyObservers();
  }

  /**
   * Gets average metric value
   * @param name - Metric name
   * @returns Average value
   */
  getAverageMetric(name: string): number {
    const values = this.metrics.get(name) || [];
    return values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0;
  }

  /**
   * Gets all metrics
   * @returns All metrics
   */
  getAllMetrics(): Record<string, number[]> {
    return Object.fromEntries(this.metrics);
  }

  /**
   * Clears all metrics
   */
  clearMetrics(): void {
    this.metrics.clear();
    this.notifyObservers();
  }

  /**
   * Adds an observer
   * @param observer - Observer function
   */
  addObserver(observer: (metrics: Record<string, number[]>) => void): void {
    this.observers.add(observer);
  }

  /**
   * Removes an observer
   * @param observer - Observer function
   */
  removeObserver(observer: (metrics: Record<string, number[]>) => void): void {
    this.observers.delete(observer);
  }

  /**
   * Notifies all observers
   */
  private notifyObservers(): void {
    this.observers.forEach(observer => observer(this.getAllMetrics()));
  }
}

/**
 * Global performance monitor instance
 */
export const performanceMonitor = new PerformanceMonitor();

// ============================================================================
// SELECTOR PERFORMANCE UTILITIES
// ============================================================================

/**
 * Wraps a selector with performance monitoring
 * @param selector - Selector function
 * @param name - Selector name for monitoring
 * @returns Wrapped selector with performance monitoring
 */
export const withPerformanceMonitoring = <T extends (...args: any[]) => any>(
  selector: T,
  name: string,
): T => {
  return ((...args: any[]) => {
    const start = performance.now();
    const result = selector(...args);
    const end = performance.now();

    performanceMonitor.recordMetric(`selector_${name}`, end - start);

    return result;
  }) as T;
};

/**
 * Creates a memoized selector with performance monitoring
 * @param selectors - Input selectors
 * @param resultFunc - Result function
 * @param name - Selector name
 * @returns Memoized selector with performance monitoring
 */
export const createMonitoredSelector = <T, R>(
  selectors: ((state: RootState) => any)[],
  resultFunc: (...args: any[]) => R,
  name: string,
) => {
  const selector = createSelector(selectors, resultFunc);
  return withPerformanceMonitoring(selector, name);
};
