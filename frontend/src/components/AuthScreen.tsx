import { TrendingUp, Mail, Lock, Phone, Eye, EyeOff, ArrowLeft, Shield, AlertTriangle, CheckCircle } from 'lucide-react';
import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../contexts/AuthContext';
import { errorMonitoring } from '../lib/errorMonitoring';
import { debounce } from '../lib/performanceOptimization';

import { Alert, AlertDescription } from './ui/alert';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

export default function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mobile, setMobile] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [rateLimitTime, setRateLimitTime] = useState(0);
  const [attemptCount, setAttemptCount] = useState(0);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [isValidating, setIsValidating] = useState(false);
  const { login, register, requestPasswordReset, resetPassword } = useAuth();
  const navigate = useNavigate();

  // Rate limiting: 5 attempts per 15 minutes
  const MAX_ATTEMPTS = 5;
  const RATE_LIMIT_DURATION = 15 * 60 * 1000; // 15 minutes

  // Enhanced password strength calculation
  const calculatePasswordStrength = useCallback((password: string): number => {
    let strength = 0;

    if (password.length >= 8) strength += 20;
    if (password.length >= 12) strength += 10;
    if (/[a-z]/.test(password)) strength += 10;
    if (/[A-Z]/.test(password)) strength += 10;
    if (/[0-9]/.test(password)) strength += 10;
    if (/[^A-Za-z0-9]/.test(password)) strength += 10;
    if (password.length >= 16) strength += 10;
    if (password.length >= 20) strength += 10;
    if (!/(.)\1{2,}/.test(password)) strength += 10; // No repeated characters

    return Math.min(strength, 100);
  }, []);

  // Enhanced validation with security checks
  const validateField = useCallback((field: string, value: string) => {
    let result: { isValid: boolean; sanitizedValue: string; error?: string };

    // Sanitize input
    const sanitizedValue = value.trim().replace(/[<>]/g, '');

    switch (field) {
      case 'email': {
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        const isValidEmail = emailRegex.test(sanitizedValue);
        result = {
          isValid: isValidEmail,
          sanitizedValue,
          error: !isValidEmail ? 'Please enter a valid email address' : undefined,
        };
        break;
      }

      case 'password': {
        const passwordErrors = [];
        if (sanitizedValue.length < 8) passwordErrors.push('at least 8 characters');
        if (!/[a-z]/.test(sanitizedValue)) passwordErrors.push('one lowercase letter');
        if (!/[A-Z]/.test(sanitizedValue)) passwordErrors.push('one uppercase letter');
        if (!/[0-9]/.test(sanitizedValue)) passwordErrors.push('one number');
        if (!/[^A-Za-z0-9]/.test(sanitizedValue)) passwordErrors.push('one special character');

        const isValidPassword = passwordErrors.length === 0;
        result = {
          isValid: isValidPassword,
          sanitizedValue,
          error: !isValidPassword ? `Password must contain ${passwordErrors.join(', ')}` : undefined,
        };

        // Update password strength
        setPasswordStrength(calculatePasswordStrength(sanitizedValue));
        break;
      }

      case 'mobile': {
        const mobileRegex = /^[+]?[1-9][\d]{9,14}$/;
        const isValidMobile = mobileRegex.test(sanitizedValue);
        result = {
          isValid: isValidMobile,
          sanitizedValue,
          error: !isValidMobile ? 'Please enter a valid mobile number' : undefined,
        };
        break;
      }

      case 'confirmPassword': {
        const passwordsMatch = sanitizedValue === password;
        result = {
          isValid: passwordsMatch,
          sanitizedValue,
          error: !passwordsMatch ? 'Passwords do not match' : undefined,
        };
        break;
      }

      default:
        result = { isValid: true, sanitizedValue };
    }

    // Update validation errors
    if (!result.isValid && result.error) {
      setValidationErrors(prev => ({ ...prev, [field]: result.error! }));
    } else {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }

    return result;
  }, [password, calculatePasswordStrength]);

  // Debounced validation
  const debouncedValidateField = useCallback(
    debounce((field: string, value: string) => {
      validateField(field, value);
    }, 300),
    [validateField],
  );

  // Rate limiting check
  const checkRateLimit = useCallback(() => {
    const now = Date.now();
    const lastAttempt = localStorage.getItem('lastAuthAttempt');
    const attemptCount = parseInt(localStorage.getItem('authAttemptCount') || '0');

    if (lastAttempt) {
      const timeSinceLastAttempt = now - parseInt(lastAttempt);
      if (timeSinceLastAttempt < RATE_LIMIT_DURATION) {
        if (attemptCount >= MAX_ATTEMPTS) {
          setIsRateLimited(true);
          setRateLimitTime(Math.ceil((RATE_LIMIT_DURATION - timeSinceLastAttempt) / 1000 / 60));
          return false;
        }
      } else {
        // Reset attempt count if enough time has passed
        localStorage.setItem('authAttemptCount', '0');
      }
    }

    return true;
  }, [RATE_LIMIT_DURATION, MAX_ATTEMPTS]);

  // Update attempt count
  const updateAttemptCount = useCallback(() => {
    const now = Date.now();
    const attemptCount = parseInt(localStorage.getItem('authAttemptCount') || '0');
    localStorage.setItem('authAttemptCount', (attemptCount + 1).toString());
    localStorage.setItem('lastAuthAttempt', now.toString());
    setAttemptCount(attemptCount + 1);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setIsLoading(true);
    setIsValidating(true);

    try {
      // Check rate limiting
      if (!checkRateLimit()) {
        setError(`Too many attempts. Please try again in ${rateLimitTime} minutes.`);
        return;
      }

      // Validate all fields
      const emailValidation = validateField('email', email);
      const passwordValidation = validateField('password', password);

      if (!isLogin) {
        const mobileValidation = validateField('mobile', mobile);
        const confirmPasswordValidation = validateField('confirmPassword', confirmPassword);

        if (!emailValidation.isValid || !passwordValidation.isValid ||
            !mobileValidation.isValid || !confirmPasswordValidation.isValid) {
          setError('Please fix all validation errors before submitting.');
          return;
        }
      } else {
        if (!emailValidation.isValid || !passwordValidation.isValid) {
          setError('Please fix all validation errors before submitting.');
          return;
        }
      }

      // CSRF protection - add token to request
      const csrfToken = localStorage.getItem('csrf-token') || '';

      if (isLogin) {
        await login(emailValidation.sanitizedValue, passwordValidation.sanitizedValue, csrfToken);
        // Reset attempt count on successful login
        localStorage.setItem('authAttemptCount', '0');
        navigate('/disclaimer');
      } else {
        await register(
          emailValidation.sanitizedValue,
          passwordValidation.sanitizedValue,
          mobileValidation.sanitizedValue,
          csrfToken,
        );
        setSuccessMessage('Account created successfully! Please check your email to verify your account.');
        // Reset attempt count on successful registration
        localStorage.setItem('authAttemptCount', '0');
        navigate('/disclaimer');
      }
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error('An error occurred');

      // Update attempt count on failure
      updateAttemptCount();

      // Report error to monitoring system
      await errorMonitoring.reportError(error, {
        component: 'AuthScreen',
        action: isLogin ? 'login' : 'register',
        props: { email, isLogin },
      });

      // Handle specific error types
      if (error.message.includes('rate limit') || error.message.includes('too many')) {
        setIsRateLimited(true);
        setRateLimitTime(15);
        setError('Too many attempts. Please try again in 15 minutes.');
      } else if (error.message.includes('invalid credentials') || error.message.includes('unauthorized')) {
        setError('Invalid email or password. Please try again.');
      } else if (error.message.includes('email already exists')) {
        setError('An account with this email already exists. Please try logging in instead.');
      } else if (error.message.includes('network') || error.message.includes('connection')) {
        setError('Connection failed. Please check your internet connection and try again.');
      } else {
        setError(error.message);
      }
    } finally {
      setIsLoading(false);
      setIsValidating(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setIsLoading(true);
    try {
      const response = await requestPasswordReset(email);
      setSuccessMessage(response.message);
      // For testing purposes, show the reset token
      if (response.resetToken) {
        setResetToken(response.resetToken);
        setShowResetPassword(true);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send reset email');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setIsLoading(true);
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      setIsLoading(false);
      return;
    }

    try {
      const response = await resetPassword(resetToken, newPassword);
      setSuccessMessage(response.message);
      setTimeout(() => {
        setShowResetPassword(false);
        setShowForgotPassword(false);
        setIsLogin(true);
        setResetToken('');
        setNewPassword('');
        setConfirmPassword('');
      }, 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to reset password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-slate-800/90 border-slate-700 text-white">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-purple-500/20 rounded-full">
              <TrendingUp className="h-8 w-8 text-purple-400" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
            CryptoPulse
          </CardTitle>
          <p className="text-slate-400">AI-Powered Crypto Trading</p>
        </CardHeader>

        <CardContent>
          <Tabs onValueChange={(value) => setIsLogin(value === 'login')} value={isLogin ? 'login' : 'register'}>
            <TabsList className="grid w-full grid-cols-2 bg-slate-700">
              <TabsTrigger className="data-[state=active]:bg-slate-600" value="login">
                Sign In
              </TabsTrigger>
              <TabsTrigger className="data-[state=active]:bg-slate-600" value="register">
                Register
              </TabsTrigger>
            </TabsList>

            <form className="space-y-4 mt-6" onSubmit={handleSubmit}>
              <TabsContent className="space-y-4 mt-0" value="login">
                <div className="space-y-2">
                  <Label className="text-slate-300" htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      className="pl-10 bg-slate-700 border-slate-600 text-white"
                      id="email"
                      onChange={(e) => {
                        setEmail(e.target.value);
                        debouncedValidateField('email', e.target.value);
                      }}
                      placeholder="Enter your email"
                      required
                      type="email"
                      value={email}
                    />
                    {validationErrors.email && (
                      <p className="text-red-400 text-sm mt-1">{validationErrors.email}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-300" htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      className="pl-10 pr-10 bg-slate-700 border-slate-600 text-white"
                      id="password"
                      onChange={(e) => {
                        setPassword(e.target.value);
                        debouncedValidateField('password', e.target.value);
                      }}
                      placeholder="Enter your password"
                      required
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                    />
                    <button
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-300"
                      onClick={() => setShowPassword(!showPassword)}
                      type="button"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                    {password && (
                      <div className="mt-2">
                        <div className="flex items-center space-x-2">
                          <div className="flex-1 bg-slate-700 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all duration-300 ${
                                passwordStrength < 30 ? 'bg-red-500' :
                                  passwordStrength < 60 ? 'bg-yellow-500' :
                                    passwordStrength < 80 ? 'bg-blue-500' : 'bg-green-500'
                              }`}
                              style={{ width: `${passwordStrength}%` }}
                            />
                          </div>
                          <span
                            className={`text-xs ${
                              passwordStrength < 30 ? 'text-red-400' :
                                passwordStrength < 60 ? 'text-yellow-400' :
                                  passwordStrength < 80 ? 'text-blue-400' : 'text-green-400'
                            }`}
                          >
                            {passwordStrength < 30 ? 'Weak' :
                              passwordStrength < 60 ? 'Fair' :
                                passwordStrength < 80 ? 'Good' : 'Strong'}
                          </span>
                        </div>
                      </div>
                    )}
                    {validationErrors.password && (
                      <p className="text-red-400 text-sm mt-1 flex items-center">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        {validationErrors.password}
                      </p>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent className="space-y-4 mt-0" value="register">
                <div className="space-y-2">
                  <Label className="text-slate-300" htmlFor="reg-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      className="pl-10 bg-slate-700 border-slate-600 text-white"
                      id="reg-email"
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      required
                      type="email"
                      value={email}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-300" htmlFor="reg-password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      className="pl-10 pr-10 bg-slate-700 border-slate-600 text-white"
                      id="reg-password"
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Create a password"
                      required
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                    />
                    <button
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-300"
                      onClick={() => setShowPassword(!showPassword)}
                      type="button"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-300" htmlFor="mobile">Mobile (Optional)</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      className="pl-10 bg-slate-700 border-slate-600 text-white"
                      id="mobile"
                      onChange={(e) => setMobile(e.target.value)}
                      placeholder="Enter your mobile number"
                      type="tel"
                      value={mobile}
                    />
                  </div>
                </div>

                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                  <p className="text-sm text-green-400 font-medium">🎉 5-Day Free Trial</p>
                  <p className="text-xs text-green-300 mt-1">
                    Start trading immediately with full access to all features.
                    Subscription (₹999/month) starts after trial period.
                  </p>
                </div>

                {isLogin && (
                  <div className="text-right">
                    <button
                      className="text-sm text-purple-400 hover:text-purple-300 underline"
                      onClick={() => setShowForgotPassword(true)}
                      type="button"
                    >
                      Forgot Password?
                    </button>
                  </div>
                )}
              </TabsContent>

              {error && (
                <Alert className="bg-red-500/10 border-red-500/20">
                  <AlertDescription className="text-red-400">
                    {error}
                  </AlertDescription>
                </Alert>
              )}

              {successMessage && (
                <Alert className="bg-green-500/10 border-green-500/20">
                  <AlertDescription className="text-green-400">
                    {successMessage}
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-3">
                {/* Rate limiting warning */}
                {isRateLimited && (
                  <Alert className="bg-red-500/10 border-red-500/20">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="text-red-400">
                      Too many attempts. Please try again in {rateLimitTime} minutes.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Security indicators */}
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center space-x-2">
                    <Shield className="h-3 w-3" />
                    <span>Secure Connection</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-3 w-3" />
                    <span>Encrypted</span>
                  </div>
                </div>

                <Button
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                  disabled={isLoading || isValidating || isRateLimited || Object.keys(validationErrors).length > 0}
                  type="submit"
                >
                  {isValidating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Validating...
                    </>
                  ) : isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Shield className="h-4 w-4 mr-2" />
                      {isLogin ? 'Sign In' : 'Start Free Trial'}
                    </>
                  )}
                </Button>

                {/* Attempt counter */}
                {attemptCount > 0 && !isRateLimited && (
                  <p className="text-xs text-yellow-400 text-center">
                    Attempt {attemptCount} of {MAX_ATTEMPTS}
                  </p>
                )}
              </div>
            </form>
          </Tabs>

          <div className="mt-6 text-center">
            <p className="text-xs text-slate-400">
              By continuing, you agree to our Terms of Service and Privacy Policy
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Forgot Password Modal */}
      {showForgotPassword && !showResetPassword && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md bg-slate-800/95 border-slate-700 text-white">
            <CardHeader>
              <div className="flex items-center gap-3">
                <button
                  className="p-1 hover:bg-slate-700 rounded"
                  onClick={() => setShowForgotPassword(false)}
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <CardTitle>Reset Password</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handleForgotPassword}>
                <div className="space-y-2">
                  <Label className="text-slate-300" htmlFor="forgot-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      className="pl-10 bg-slate-700 border-slate-600 text-white"
                      id="forgot-email"
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      required
                      type="email"
                      value={email}
                    />
                  </div>
                </div>

                <Button
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                  disabled={isLoading}
                  type="submit"
                >
                  {isLoading ? 'Sending...' : 'Send Reset Link'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetPassword && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md bg-slate-800/95 border-slate-700 text-white">
            <CardHeader>
              <div className="flex items-center gap-3">
                <button
                  className="p-1 hover:bg-slate-700 rounded"
                  onClick={() => {
                    setShowResetPassword(false);
                    setShowForgotPassword(false);
                    setResetToken('');
                    setNewPassword('');
                    setConfirmPassword('');
                  }}
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <CardTitle>Set New Password</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handleResetPassword}>
                <div className="space-y-2">
                  <Label className="text-slate-300" htmlFor="new-password">New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      className="pl-10 pr-10 bg-slate-700 border-slate-600 text-white"
                      id="new-password"
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      required
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                    />
                    <button
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-300"
                      onClick={() => setShowPassword(!showPassword)}
                      type="button"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-300" htmlFor="confirm-password">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      className="pl-10 bg-slate-700 border-slate-600 text-white"
                      id="confirm-password"
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      required
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                    />
                  </div>
                </div>

                <Button
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                  disabled={isLoading}
                  type="submit"
                >
                  {isLoading ? 'Resetting...' : 'Reset Password'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
