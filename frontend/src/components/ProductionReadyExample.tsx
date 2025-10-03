/**
 * Production-Ready Component Example
 * Demonstrates all security, performance, accessibility, and error handling optimizations
 */

import {
  Shield,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Eye,
  EyeOff,
  Activity,
  Zap,
} from 'lucide-react';
import React, { useState, useCallback, useMemo, useEffect, memo, lazy, Suspense } from 'react';

import {
  useAccessibility,
  useModalAccessibility,
  useFormAccessibility,
  useLoadingAccessibility,
  useErrorAccessibility,
  SkipLink,
} from '../lib/accessibilityEnhancements';
import { errorMonitoring, handleNetworkError, handleValidationError } from '../lib/errorMonitoring';
import {
  usePerformanceOptimization,
  createMemoizedCallback,
  createMemoizedValue,
  debounce,
  throttle,
} from '../lib/performanceOptimization';
import { secureStorage, validateAPIKey, apiRateLimiter } from '../lib/secureStorage';
import { generateRandomId } from '../lib/utils';

import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';

// Import all our optimization utilities

// Lazy load heavy components
const HeavyChart = lazy(() => import('./OptimizedAdvancedCharts'));
const DataTable = lazy(() => import('./DataTable'));

interface ProductionReadyExampleProps {
  className?: string;
}

// Memoized sub-components for performance
const MemoizedCard = memo(function MemoizedCard({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Shield className="h-5 w-5 mr-2 text-green-400" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {children}
      </CardContent>
    </Card>
  );
});

const MemoizedButton = memo(function MemoizedButton({
  onClick,
  children,
  disabled,
  loading,
  ...props
}: {
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
  loading?: boolean;
  [key: string]: any;
}) {
  return (
    <Button
      disabled={disabled || loading}
      onClick={onClick}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
      {children}
    </Button>
  );
});

const ProductionReadyExample = memo(function ProductionReadyExample({
  className,
}: ProductionReadyExampleProps) {
  // State management
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    apiKey: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);

  // Performance monitoring
  const { renderCount, optimizeRender } = usePerformanceOptimization();

  // Accessibility features
  const {
    isHighContrast,
    prefersReducedMotion,
    announce,
    createAriaAttributes,
  } = useAccessibility();

  // Form accessibility
  const {
    errors,
    setFieldError,
    clearFieldError,
    markFieldTouched,
    getFieldAriaAttributes,
  } = useFormAccessibility('example-form');

  // Modal accessibility
  const { modalRef, trapFocus, modalProps } = useModalAccessibility(showModal, () => setShowModal(false));

  // Loading accessibility
  const loadingAriaProps = useLoadingAccessibility(isLoading, 'Loading data...');

  // Error accessibility
  const errorAriaProps = useErrorAccessibility(error);

  // Memoized data processing
  const processedData = useMemo(() => {
    return data.map(item => ({
      ...item,
      id: item.id || generateRandomId(),
      processedAt: Date.now(),
    }));
  }, [data]);

  // Memoized validation function
  const validateForm = useCallback(() => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (formData.apiKey) {
      const keyValidation = validateAPIKey(formData.apiKey);
      if (!keyValidation.isValid) {
        newErrors.apiKey = keyValidation.error || 'Invalid API key';
      }
    }

    if (!formData.password.trim()) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    // Update errors
    Object.keys(newErrors).forEach(field => {
      setFieldError(field, newErrors[field]);
    });

    Object.keys(errors).forEach(field => {
      if (!newErrors[field]) {
        clearFieldError(field);
      }
    });

    return Object.keys(newErrors).length === 0;
  }, [formData, errors, setFieldError, clearFieldError]);

  // Debounced validation
  const debouncedValidate = useCallback(
    debounce(() => {
      validateForm();
    }, 300),
    [validateForm],
  );

  // Memoized data fetching with error handling
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Rate limiting check
      if (!apiRateLimiter.isAllowed('data-fetch')) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }

      // Simulate API call with retry logic
      const response = await errorMonitoring.retryOperation(
        async () => {
          const res = await fetch('/api/data', {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('cryptopulse-session') || ''}`,
              'Content-Type': 'application/json',
            },
          });

          if (!res.ok) {
            throw new Error(`HTTP ${res.status}: ${res.statusText}`);
          }

          return res.json();
        },
        { component: 'ProductionReadyExample', action: 'fetchData' },
      );

      setData(response.data || []);
      announce('Data loaded successfully', 'polite');
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch data');

      // Report error to monitoring
      await errorMonitoring.reportError(error, {
        component: 'ProductionReadyExample',
        action: 'fetchData',
      });

      setError(error.message);
      announce(`Error: ${error.message}`, 'assertive');
    } finally {
      setIsLoading(false);
    }
  }, [announce]);

  // Memoized form submission
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      announce('Please fix form errors', 'assertive');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Secure data storage
      await secureStorage.set('form-data', {
        ...formData,
        timestamp: Date.now(),
      });

      // Simulate API submission
      await errorMonitoring.retryOperation(
        async () => {
          const response = await fetch('/api/submit', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('cryptopulse-session') || ''}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData),
          });

          if (!response.ok) {
            throw new Error(`Submission failed: ${response.statusText}`);
          }

          return response.json();
        },
        { component: 'ProductionReadyExample', action: 'submitForm' },
      );

      announce('Form submitted successfully', 'polite');
      setFormData({ name: '', email: '', apiKey: '', password: '' });
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Form submission failed');

      await errorMonitoring.reportError(error, {
        component: 'ProductionReadyExample',
        action: 'submitForm',
      });

      setError(error.message);
      announce(`Error: ${error.message}`, 'assertive');
    } finally {
      setIsLoading(false);
    }
  }, [formData, validateForm, announce]);

  // Memoized input handlers
  const handleInputChange = useCallback((field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    markFieldTouched(field);
    debouncedValidate();
  }, [markFieldTouched, debouncedValidate]);

  // Memoized modal handlers
  const openModal = useCallback(() => {
    setShowModal(true);
    announce('Modal opened', 'polite');
  }, [announce]);

  const closeModal = useCallback(() => {
    setShowModal(false);
    announce('Modal closed', 'polite');
  }, [announce]);

  // Effect for focus management
  useEffect(() => {
    if (showModal) {
      const cleanup = trapFocus();
      return cleanup;
    }
  }, [showModal, trapFocus]);

  // Effect for loading data on mount
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Memoized styles based on accessibility preferences
  const containerStyles = useMemo(() => ({
    ...(isHighContrast && {
      border: '2px solid #000',
      backgroundColor: '#fff',
      color: '#000',
    }),
    ...(prefersReducedMotion && {
      transition: 'none',
    }),
  }), [isHighContrast, prefersReducedMotion]);

  return (
    <div className={`space-y-6 ${className}`} style={containerStyles}>
      {/* Skip Links */}
      <SkipLink href="#main-content">Skip to main content</SkipLink>
      <SkipLink href="#form-section">Skip to form</SkipLink>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Production-Ready Component</h1>
          <p className="text-slate-400">Demonstrating all optimizations</p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge className="border-slate-600 text-slate-300" variant="outline">
            Render #{renderCount}
          </Badge>
          {isHighContrast && (
            <Badge className="bg-yellow-600 text-white">
              High Contrast
            </Badge>
          )}
          {prefersReducedMotion && (
            <Badge className="bg-blue-600 text-white">
              Reduced Motion
            </Badge>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Alert className="bg-red-500/10 border-red-500/20" {...errorAriaProps}>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-red-400">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <main className="grid grid-cols-1 lg:grid-cols-2 gap-6" id="main-content">
        {/* Form Section */}
        <section id="form-section">
          <MemoizedCard className="h-fit" title="Secure Form">
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label className="text-slate-300" htmlFor="name">
                  Name *
                </Label>
                <Input
                  className="bg-slate-700 border-slate-600 text-white"
                  id="name"
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  type="text"
                  value={formData.name}
                  {...getFieldAriaAttributes('name')}
                />
                {errors.name && (
                  <p className="text-red-400 text-sm" id="name-error">
                    {errors.name}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300" htmlFor="email">
                  Email *
                </Label>
                <Input
                  className="bg-slate-700 border-slate-600 text-white"
                  id="email"
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  type="email"
                  value={formData.email}
                  {...getFieldAriaAttributes('email')}
                />
                {errors.email && (
                  <p className="text-red-400 text-sm" id="email-error">
                    {errors.email}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300" htmlFor="apiKey">
                  API Key
                </Label>
                <Input
                  className="bg-slate-700 border-slate-600 text-white"
                  id="apiKey"
                  onChange={(e) => handleInputChange('apiKey', e.target.value)}
                  type="text"
                  value={formData.apiKey}
                  {...getFieldAriaAttributes('apiKey')}
                />
                {errors.apiKey && (
                  <p className="text-red-400 text-sm" id="apiKey-error">
                    {errors.apiKey}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300" htmlFor="password">
                  Password *
                </Label>
                <div className="relative">
                  <Input
                    className="bg-slate-700 border-slate-600 text-white pr-10"
                    id="password"
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    {...getFieldAriaAttributes('password')}
                  />
                  <button
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-300"
                    onClick={() => setShowPassword(!showPassword)}
                    type="button"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-red-400 text-sm" id="password-error">
                    {errors.password}
                  </p>
                )}
              </div>

              <MemoizedButton
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                disabled={Object.keys(errors).length > 0}
                loading={isLoading}
                onClick={() => {}}
                type="submit"
                {...loadingAriaProps}
              >
                {isLoading ? 'Submitting...' : 'Submit Form'}
              </MemoizedButton>
            </form>
          </MemoizedCard>
        </section>

        {/* Data Display Section */}
        <section>
          <MemoizedCard title="Data Display">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Processed Data</h3>
                <MemoizedButton
                  className="border-slate-600 text-slate-300"
                  loading={isLoading}
                  onClick={fetchData}
                  variant="outline"
                >
                  Refresh
                </MemoizedButton>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-8 w-8 text-blue-400 animate-spin" />
                </div>
              ) : (
                <div className="space-y-2">
                  {processedData.length > 0 ? (
                    processedData.slice(0, 5).map((item, index) => (
                      <div className="p-3 bg-slate-700/50 rounded-lg" key={item.id || index}>
                        <p className="text-white font-medium">{item.name || `Item ${index + 1}`}</p>
                        <p className="text-slate-400 text-sm">{item.email || 'No email'}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-400 text-center py-8">No data available</p>
                  )}
                </div>
              )}
            </div>
          </MemoizedCard>
        </section>
      </main>

      {/* Actions Section */}
      <section className="flex flex-wrap gap-4">
        <MemoizedButton
          className="bg-green-600 hover:bg-green-700"
          onClick={openModal}
        >
          <Activity className="h-4 w-4 mr-2" />
          Open Modal
        </MemoizedButton>

        <MemoizedButton
          className="border-slate-600 text-slate-300"
          onClick={() => announce('Action completed', 'polite')}
          variant="outline"
        >
          <Zap className="h-4 w-4 mr-2" />
          Test Announcement
        </MemoizedButton>
      </section>

      {/* Lazy Loaded Heavy Components */}
      <section>
        <Suspense
          fallback={
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 text-blue-400 animate-spin" />
            </div>
          }
        >
          <HeavyChart data={processedData} onTimeframeChange={() => {}} symbol="BTC/USDT" timeframe="1h" />
        </Suspense>
      </section>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card
            className="w-full max-w-md bg-slate-800/95 border-slate-700 text-white"
            ref={modalRef}
            {...modalProps}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle id="modal-title">Example Modal</CardTitle>
                <Button
                  aria-label="Close modal"
                  onClick={closeModal}
                  size="sm"
                  variant="ghost"
                >
                  ×
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-slate-300 mb-4">
                This modal demonstrates proper focus management and accessibility.
              </p>
              <MemoizedButton
                className="w-full"
                onClick={closeModal}
              >
                Close Modal
              </MemoizedButton>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
});

export default ProductionReadyExample;
