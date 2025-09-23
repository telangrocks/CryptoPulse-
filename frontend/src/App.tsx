import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { AppStateProvider } from './contexts/AppStateContext'
import { Toaster } from './components/ui/toaster'
import ErrorBoundary from './components/ErrorBoundary'
import GlobalLoadingIndicator from './components/GlobalLoadingIndicator'
import SplashScreen from './components/SplashScreen'
import AuthScreen from './components/AuthScreen'
import Dashboard from './components/Dashboard'
import APIKeySetup from './components/APIKeySetup'
import CryptoPairSelection from './components/CryptoPairSelection'
import BotSetup from './components/BotSetup'
import TradeExecution from './components/TradeExecution'
import Backtesting from './components/Backtesting'
import AlertsSettings from './components/AlertsSettings'
import AIAutomation from './components/AIAutomation'
import MonitoringDashboard from './components/MonitoringDashboard'
import PerformanceAnalytics from './components/PerformanceAnalytics'
import EndToEndAutomation from './components/EndToEndAutomation'
import ComprehensiveTestPanel from './components/ComprehensiveTestPanel'
import SecurityTestPanel from './components/SecurityTestPanel'
import WorldClassDashboard from './components/WorldClassDashboard'
import AIAssistant from './components/AIAssistant'
import AutomationDashboard from './components/AutomationDashboard'
import EnhancedTradeConfirmation from './components/EnhancedTradeConfirmation'
import NotificationCenter from './components/NotificationCenter'
import PaymentSuccess from './components/PaymentSuccess'
import CashfreePayment from './components/CashfreePayment'
import DisclaimerScreen from './components/DisclaimerScreen'
import { AccessibilityProvider } from './components/AccessibilityProvider'
import { useAuth } from './contexts/AuthContext'
import { useDocumentHead } from './hooks/useDocumentHead'
import './App.css'

// Protected Route Component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  
  if (loading) {
    return <SplashScreen />
  }
  
  if (!user) {
    return <Navigate to="/auth" replace />
  }
  
  return <>{children}</>
}

// Main App Component
function AppContent() {
  const { user, loading } = useAuth()
  useDocumentHead()

  if (loading) {
    return <SplashScreen />
  }

  if (!user) {
    return <AuthScreen />
  }

  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/auth" element={<AuthScreen />} />
        <Route path="/disclaimer" element={<DisclaimerScreen />} />
        
        {/* Protected Routes */}
        <Route path="/" element={
          <ProtectedRoute>
            <WorldClassDashboard />
          </ProtectedRoute>
        } />
        
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />
        
        <Route path="/api-keys" element={
          <ProtectedRoute>
            <APIKeySetup />
          </ProtectedRoute>
        } />
        
        <Route path="/crypto-pairs" element={
          <ProtectedRoute>
            <CryptoPairSelection />
          </ProtectedRoute>
        } />
        
        <Route path="/bot-setup" element={
          <ProtectedRoute>
            <BotSetup />
          </ProtectedRoute>
        } />
        
        <Route path="/trade-execution" element={
          <ProtectedRoute>
            <TradeExecution />
          </ProtectedRoute>
        } />
        
        <Route path="/backtesting" element={
          <ProtectedRoute>
            <Backtesting />
          </ProtectedRoute>
        } />
        
        <Route path="/alerts-settings" element={
          <ProtectedRoute>
            <AlertsSettings />
          </ProtectedRoute>
        } />
        
        <Route path="/ai-automation" element={
          <ProtectedRoute>
            <AIAutomation />
          </ProtectedRoute>
        } />
        
        <Route path="/monitoring" element={
          <ProtectedRoute>
            <MonitoringDashboard />
          </ProtectedRoute>
        } />
        
        <Route path="/performance" element={
          <ProtectedRoute>
            <PerformanceAnalytics />
          </ProtectedRoute>
        } />
        
        <Route path="/end-to-end-automation" element={
          <ProtectedRoute>
            <EndToEndAutomation />
          </ProtectedRoute>
        } />
        
        <Route path="/comprehensive-test" element={
          <ProtectedRoute>
            <ComprehensiveTestPanel />
          </ProtectedRoute>
        } />
        
        <Route path="/security-test" element={
          <ProtectedRoute>
            <SecurityTestPanel />
          </ProtectedRoute>
        } />
        
        <Route path="/ai-assistant" element={
          <ProtectedRoute>
            <AIAssistant />
          </ProtectedRoute>
        } />
        
        <Route path="/automation-dashboard" element={
          <ProtectedRoute>
            <AutomationDashboard />
          </ProtectedRoute>
        } />
        
        <Route path="/trade-confirmation" element={
          <ProtectedRoute>
            <EnhancedTradeConfirmation />
          </ProtectedRoute>
        } />
        
        <Route path="/notifications" element={
          <ProtectedRoute>
            <NotificationCenter />
          </ProtectedRoute>
        } />
        
        <Route path="/payment" element={
          <ProtectedRoute>
            <CashfreePayment />
          </ProtectedRoute>
        } />
        
        <Route path="/payment-success" element={
          <ProtectedRoute>
            <PaymentSuccess />
          </ProtectedRoute>
        } />
        
        {/* Catch all route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  )
}

// Main App Component with Providers
function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <AppStateProvider>
            <AccessibilityProvider>
              <GlobalLoadingIndicator />
              <AppContent />
              <Toaster />
            </AccessibilityProvider>
          </AppStateProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}

export default App