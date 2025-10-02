/**
 * @fileoverview Production-ready Error Boundary for CryptoPulse
 * @version 1.0.0
 * @author CryptoPulse Team
 */

import {
  AlertTriangle,
  RefreshCw,
  Home,
  Bug,
  Shield,
  Activity,
  Zap,
} from 'lucide-react';
import React, { Component, ErrorInfo, ReactNode } from 'react';

import { errorHandler, ErrorContext } from '../lib/errorHandler';
import { logError } from '../lib/logger';

import { Alert, AlertDescription } from './ui/alert';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showDetails?: boolean;
  resetOnPropsChange?: boolean;
  resetKeys?: Array<string | number>;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
  retryCount: number;
  isRetrying: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
  private resetTimeoutId: number | null = null;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: 0,
      isRetrying: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const errorContext: ErrorContext = {
      component: 'ErrorBoundary',
      action: 'componentDidCatch',
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    // Handle error through our error handler
    const errorReport = errorHandler.handleError(error, errorContext);

    // Log error
    logError('Error boundary caught error', 'ErrorBoundary', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorId: errorReport.id,
    });

    this.setState({
      error,
      errorInfo,
      errorId: errorReport.id,
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  componentDidUpdate(prevProps: Props) {
    const { resetKeys, resetOnPropsChange } = this.props;
    const { hasError } = this.state;

    if (hasError && resetOnPropsChange && resetKeys) {
      const hasResetKeyChanged = resetKeys.some((key, index) =>
        key !== prevProps.resetKeys?.[index],
      );

      if (hasResetKeyChanged) {
        this.resetErrorBoundary();
      }
    }
  }

  componentWillUnmount() {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }
  }

  resetErrorBoundary = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: 0,
      isRetrying: false,
    });
  };

  handleRetry = () => {
    this.setState({ isRetrying: true });

    // Simulate retry delay
    setTimeout(() => {
      this.resetErrorBoundary();
    }, 1000);
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  handleReportBug = () => {
    const { error, errorId } = this.state;
    const bugReport = {
      errorId,
      message: error?.message,
      stack: error?.stack,
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: new Date().toISOString(),
    };

    // In a real implementation, this would open a bug report form
    // For now, we'll copy to clipboard
    navigator.clipboard.writeText(JSON.stringify(bugReport, null, 2));
    alert('Bug report copied to clipboard. Please send this to support.');
  };

  render() {
    const { hasError, error, errorInfo, errorId, retryCount, isRetrying } = this.state;
    const { children, fallback, showDetails = false } = this.props;

    if (hasError) {
      // Use custom fallback if provided
      if (fallback) {
        return fallback;
      }

      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-red-900 to-slate-900 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl bg-slate-800/90 border-slate-700 text-white">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-red-500/20 rounded-full">
                  <AlertTriangle className="h-8 w-8 text-red-400" />
                </div>
              </div>
              <CardTitle className="text-2xl font-bold text-red-400 mb-2">
                Something went wrong
              </CardTitle>
              <p className="text-slate-300">
                We're sorry, but something unexpected happened. Our team has been notified.
              </p>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Error ID */}
              {errorId && (
                <Alert className="bg-blue-500/10 border-blue-500/20">
                  <Shield className="h-4 w-4 text-blue-400" />
                  <AlertDescription className="text-blue-400">
                    Error ID: {errorId}
                  </AlertDescription>
                </Alert>
              )}

              {/* Error Details */}
              {showDetails && error && (
                <div className="bg-slate-900/50 rounded-lg p-4">
                  <h3 className="font-semibold text-red-400 mb-2 flex items-center">
                    <Bug className="h-4 w-4 mr-2" />
                    Error Details
                  </h3>
                  <div className="text-sm text-slate-300 space-y-2">
                    <div>
                      <strong>Message:</strong> {error.message}
                    </div>
                    {error.stack && (
                      <div>
                        <strong>Stack:</strong>
                        <pre className="mt-1 p-2 bg-slate-800 rounded text-xs overflow-auto max-h-32">
                          {error.stack}
                        </pre>
                      </div>
                    )}
                    {errorInfo?.componentStack && (
                      <div>
                        <strong>Component Stack:</strong>
                        <pre className="mt-1 p-2 bg-slate-800 rounded text-xs overflow-auto max-h-32">
                          {errorInfo.componentStack}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={isRetrying}
                  onClick={this.handleRetry}
                >
                  {isRetrying ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Retrying...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Try Again
                    </>
                  )}
                </Button>

                <Button
                  className="flex-1 bg-slate-600 hover:bg-slate-700 text-white"
                  onClick={this.handleGoHome}
                >
                  <Home className="h-4 w-4 mr-2" />
                  Go Home
                </Button>

                <Button
                  className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
                  onClick={this.handleReportBug}
                >
                  <Bug className="h-4 w-4 mr-2" />
                  Report Bug
                </Button>
              </div>

              {/* Retry Count */}
              {retryCount > 0 && (
                <div className="text-center text-sm text-slate-400">
                  Retry attempts: {retryCount}
                </div>
              )}

              {/* Help Text */}
              <div className="text-center text-sm text-slate-400">
                <p>
                  If this problem persists, please contact our support team with the Error ID above.
                </p>
                <p className="mt-2">
                  <Activity className="h-4 w-4 inline mr-1" />
                  Our team is working to resolve this issue.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return children;
  }
}

// Higher-order component for easier usage
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>,
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
}

// Hook for functional components
export function useErrorHandler() {
  const handleError = (error: Error, context?: ErrorContext) => {
    return errorHandler.handleError(error, context);
  };

  const getErrorStatistics = () => {
    return errorHandler.getErrorStatistics();
  };

  return {
    handleError,
    getErrorStatistics,
  };
}