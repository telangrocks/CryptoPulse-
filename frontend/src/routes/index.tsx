import React, { lazy, Suspense, useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { Routes, Route, Navigate } from 'react-router-dom';

import { useAuth } from '../contexts/AuthContext';
// Lazy load components for code splitting
const SplashScreen = lazy(() => import('../components/SplashScreen'));
const AuthScreen = lazy(() => import('../components/AuthScreen'));
const DisclaimerScreen = lazy(() => import('../components/DisclaimerScreen'));
const WorldClassDashboard = lazy(() => import('../components/WorldClassDashboard'));
const Dashboard = lazy(() => import('../components/Dashboard'));
const APIKeySetup = lazy(() => import('../components/APIKeySetup'));
const CryptoPairSelection = lazy(() => import('../components/CryptoPairSelection'));
const BotSetup = lazy(() => import('../components/BotSetup'));
const TradeExecution = lazy(() => import('../components/TradeExecution'));
const Backtesting = lazy(() => import('../components/Backtesting'));
const AlertsSettings = lazy(() => import('../components/AlertsSettings'));
const AIAutomation = lazy(() => import('../components/AIAutomation'));
const MonitoringDashboard = lazy(() => import('../components/MonitoringDashboard'));
const PerformanceAnalytics = lazy(() => import('../components/PerformanceAnalytics'));
const EndToEndAutomation = lazy(() => import('../components/EndToEndAutomation'));
const ExchangeIntegration = lazy(() => import('../components/ExchangeIntegration'));
const AIAssistant = lazy(() => import('../components/AIAssistant'));
const AutomationDashboard = lazy(() => import('../components/AutomationDashboard'));
const EnhancedTradeConfirmation = lazy(() => import('../components/EnhancedTradeConfirmation'));
const EnhancedNotificationCenter = lazy(() => import('../components/EnhancedNotificationCenter'));
const BalanceDashboard = lazy(() => import('../components/BalanceDashboard'));
const SubscriptionManagement = lazy(() => import('../components/SubscriptionManagement'));
const CashfreePayment = lazy(() => import('../components/CashfreePayment'));
const PaymentSuccess = lazy(() => import('../components/PaymentSuccess'));
const TrialProtectedRoute = lazy(() => import('../components/TrialProtectedRoute'));
const ErrorFallback = lazy(() => import('../components/ErrorFallback'));
// Loading component
const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="loading" />
  </div>
);
// Error boundary for routes
const RouteErrorBoundary = ({ children }: { children: React.ReactNode }) => (
  <ErrorBoundary
    fallbackRender={({ error, resetErrorBoundary }) => (
      <div className="error p-4 m-4 rounded">
        <h2>Something went wrong:</h2>
        <pre>{error?.message}</pre>
        <button
          className="btn-primary mt-2"
          onClick={resetErrorBoundary}
        >
          Try again
        </button>
      </div>
    )}
  >
    {children}
  </ErrorBoundary>
);
// Protected Route Component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return <SplashScreen />;
  }
  if (!user) {
    return <Navigate replace to="/auth" />;
  }
  return <>{children}</>;
}
// Wrapper components for components that need props
function AIAssistantWrapper() {
  const [isOpen, setIsOpen] = useState(true);
  return (
    <AIAssistant
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
    />
  );
}
function TradeConfirmationWrapper() {
  // Use environment variables instead of mock data
  const mockSignal = {
    pair: 'BTC/USDT',
    action: 'BUY' as const,
    entry: 45000,
    stopLoss: 43000,
    takeProfit: 47000,
    confidence: 85,
    timestamp: new Date().toISOString(),
  };
  // Get API keys from environment or secure storage
  const apiKeys = {
    marketDataKey: import.meta.env.VITE_MARKET_DATA_KEY || '',
    marketDataSecret: import.meta.env.VITE_MARKET_DATA_SECRET || '',
    tradeExecutionKey: import.meta.env.VITE_TRADE_EXECUTION_KEY || '',
    tradeExecutionSecret: import.meta.env.VITE_TRADE_EXECUTION_SECRET || '',
    exchange: import.meta.env.VITE_DEFAULT_EXCHANGE || 'wazirx',
  };
  const handleConfirm = (confirmed: boolean, tradeData?: unknown) => {
    console.log('Trade confirmed:', confirmed, tradeData);
  };
  const handleClose = () => {
    console.log('Trade confirmation closed');
  };
  return (
    <EnhancedTradeConfirmation
      onCancel={handleClose}
      onConfirm={handleConfirm}
      signal={{
        id: 'test_signal',
        symbol: mockSignal.pair,
        action: mockSignal.action,
        entry: mockSignal.entry,
        stopLoss: mockSignal.stopLoss,
        takeProfit: mockSignal.takeProfit,
        confidence: mockSignal.confidence,
        riskReward: 2.0,
        timeframe: '1h',
        strategy: 'Momentum',
        timestamp: new Date(mockSignal.timestamp),
        expectedReturn: 5.0,
        maxDrawdown: 2.5
      }}
      isVisible={false}
    />
  );
}
// Main Routes Component
export function AppRoutes() {
  return (
    <RouteErrorBoundary>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          {/* Public Routes */}
          <Route element={<AuthScreen />} path="/auth" />
          <Route element={<DisclaimerScreen />} path="/disclaimer" />
          {/* Protected Routes */}
          <Route
            element={
              <ProtectedRoute>
                <WorldClassDashboard />
              </ProtectedRoute>
            }
            path="/"
          />
          <Route
            element={
              <ProtectedRoute>
                <TrialProtectedRoute>
                  <Dashboard />
                </TrialProtectedRoute>
              </ProtectedRoute>
            }
            path="/dashboard"
          />
          <Route
            element={
              <ProtectedRoute>
                <APIKeySetup />
              </ProtectedRoute>
            }
            path="/api-keys"
          />
          <Route
            element={
              <ProtectedRoute>
                <CryptoPairSelection />
              </ProtectedRoute>
            }
            path="/crypto-pairs"
          />
          <Route
            element={
              <ProtectedRoute>
                <BotSetup />
              </ProtectedRoute>
            }
            path="/bot-setup"
          />
          <Route
            element={
              <ProtectedRoute>
                <TradeExecution />
              </ProtectedRoute>
            }
            path="/trade-execution"
          />
          <Route
            element={
              <ProtectedRoute>
                <Backtesting />
              </ProtectedRoute>
            }
            path="/backtesting"
          />
          <Route
            element={
              <ProtectedRoute>
                <AlertsSettings />
              </ProtectedRoute>
            }
            path="/alerts-settings"
          />
          <Route
            element={
              <ProtectedRoute>
                <AIAutomation />
              </ProtectedRoute>
            }
            path="/ai-automation"
          />
          <Route
            element={
              <ProtectedRoute>
                <MonitoringDashboard />
              </ProtectedRoute>
            }
            path="/monitoring"
          />
          <Route
            element={
              <ProtectedRoute>
                <PerformanceAnalytics />
              </ProtectedRoute>
            }
            path="/performance"
          />
          <Route
            element={
              <ProtectedRoute>
                <EndToEndAutomation />
              </ProtectedRoute>
            }
            path="/end-to-end-automation"
          />
          <Route
            element={
              <ProtectedRoute>
                <ExchangeIntegration />
              </ProtectedRoute>
            }
            path="/exchange-integration"
          />
          <Route
            element={
              <ProtectedRoute>
                <AIAssistantWrapper />
              </ProtectedRoute>
            }
            path="/ai-assistant"
          />
          <Route
            element={
              <ProtectedRoute>
                <AutomationDashboard />
              </ProtectedRoute>
            }
            path="/automation-dashboard"
          />
          <Route
            element={
              <ProtectedRoute>
                <TradeConfirmationWrapper />
              </ProtectedRoute>
            }
            path="/trade-confirmation"
          />
          <Route
            element={
              <ProtectedRoute>
                <EnhancedNotificationCenter />
              </ProtectedRoute>
            }
            path="/notifications"
          />
          <Route
            element={
              <ProtectedRoute>
                <BalanceDashboard />
              </ProtectedRoute>
            }
            path="/balance"
          />
          <Route
            element={
              <ProtectedRoute>
                <SubscriptionManagement />
              </ProtectedRoute>
            }
            path="/subscription"
          />
          <Route
            element={
              <ProtectedRoute>
                <CashfreePayment />
              </ProtectedRoute>
            }
            path="/payment"
          />
          <Route
            element={
              <ProtectedRoute>
                <PaymentSuccess />
              </ProtectedRoute>
            }
            path="/payment-success"
          />
          {/* Catch all route */}
          <Route element={<Navigate replace to="/" />} path="*" />
        </Routes>
      </Suspense>
    </RouteErrorBoundary>
  );
}
