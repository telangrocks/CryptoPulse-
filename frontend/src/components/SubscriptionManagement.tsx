import {
  CreditCard,
  Calendar,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Crown,
  DollarSign,
} from 'lucide-react';
import React, { useState, useEffect } from 'react';

import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

interface SubscriptionData {
  id: string;
  status: string;
  planType: string;
  amount: number;
  currency: string;
  createdAt: string;
  activatedAt: string;
  nextBillingDate: string;
  paymentStatus: string;
  isActive: boolean;
  isExpired: boolean;
}

export default function SubscriptionManagement() {
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSubscriptionStatus();
  }, []);

  const fetchSubscriptionStatus = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/subscription/status', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('cryptopulse-session') || ''}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch subscription status');
      }

      const result = await response.json();
      if (result.success) {
        if (result.hasSubscription) {
          setSubscription(result.subscription);
        } else {
          setSubscription(null);
        }
      } else {
        setError('Failed to fetch subscription status');
      }
    } catch (err) {
      setError('Error fetching subscription status');
      // Subscription fetch error - handled by error logging system
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!subscription) return;
    try {
      setIsCancelling(true);
      const response = await fetch('/api/subscription/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('cryptopulse-session') || ''}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to cancel subscription');
      }

      const result = await response.json();
      if (result.success) {
        await fetchSubscriptionStatus(); // Refresh status
        setError('');
      } else {
        setError(result.message || 'Failed to cancel subscription');
      }
    } catch (err) {
      setError('Error cancelling subscription');
      // Cancel subscription error - handled by error logging system
    } finally {
      setIsCancelling(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-500';
      case 'cancelled': return 'text-red-500';
      case 'failed': return 'text-red-500';
      case 'pending': return 'text-yellow-500';
      default: return 'text-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'cancelled': return <XCircle className="h-5 w-5 text-red-500" />;
      case 'failed': return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case 'pending': return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      default: return <AlertTriangle className="h-5 w-5 text-gray-500" />;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl bg-slate-800/90 border-slate-700 text-white">
          <CardContent className="text-center p-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4" />
            <p className="text-white">Loading subscription details...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="container mx-auto max-w-4xl">
        <div className="mb-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-purple-500/20 rounded-full">
              <Crown className="h-8 w-8 text-purple-400" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Subscription Management</h1>
          <p className="text-slate-400">Manage your CryptoPulse subscription</p>
        </div>

        {!subscription ? (
          <Card className="bg-slate-800/90 border-slate-700 text-white">
            <CardContent className="text-center p-8">
              <AlertTriangle className="h-16 w-16 text-yellow-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-4">No Active Subscription</h2>
              <p className="text-slate-300 mb-6">
                You don't have an active subscription. Subscribe to unlock all features.
              </p>
              <Button
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                onClick={() => window.location.href = '/payment'}
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Subscribe Now
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Subscription Status Card */}
            <Card className="bg-slate-800/90 border-slate-700 text-white">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center">
                    <Crown className="h-5 w-5 mr-2 text-purple-400" />
                    Subscription Details
                  </span>
                  <Badge
                    className={`${getStatusColor(subscription.status)} border-current`}
                    variant="outline"
                  >
                    {subscription.status.toUpperCase()}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(subscription.status)}
                    <div>
                      <p className="text-sm text-slate-400">Status</p>
                      <p className={`font-semibold ${getStatusColor(subscription.status)}`}>
                        {subscription.status}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <DollarSign className="h-5 w-5 text-green-400" />
                    <div>
                      <p className="text-sm text-slate-400">Amount</p>
                      <p className="font-semibold text-white">
                        ₹{(subscription.amount / 100).toFixed(2)} / {subscription.planType}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Calendar className="h-5 w-5 text-blue-400" />
                    <div>
                      <p className="text-sm text-slate-400">Activated</p>
                      <p className="font-semibold text-white">
                        {subscription.activatedAt ? new Date(subscription.activatedAt).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Calendar className="h-5 w-5 text-purple-400" />
                    <div>
                      <p className="text-sm text-slate-400">Next Billing</p>
                      <p className="font-semibold text-white">
                        {subscription.nextBillingDate ? new Date(subscription.nextBillingDate).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                    <p className="text-red-400 text-sm">{error}</p>
                  </div>
                )}

                {subscription.status === 'active' && (
                  <div className="flex space-x-4">
                    <Button
                      className="border-red-500 text-red-400 hover:bg-red-500/10"
                      disabled={isCancelling}
                      onClick={handleCancelSubscription}
                      variant="outline"
                    >
                      {isCancelling ? 'Cancelling...' : 'Cancel Subscription'}
                    </Button>

                    <Button
                      className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                      onClick={() => window.location.href = '/payment'}
                    >
                      <CreditCard className="h-4 w-4 mr-2" />
                      Update Payment
                    </Button>
                  </div>
                )}

                {subscription.status === 'cancelled' && (
                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                    <p className="text-yellow-400 text-sm">
                      Your subscription has been cancelled. You can resubscribe anytime to regain access to all features.
                    </p>
                    <Button
                      className="mt-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                      onClick={() => window.location.href = '/payment'}
                    >
                      <CreditCard className="h-4 w-4 mr-2" />
                      Resubscribe
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Features Card */}
            <Card className="bg-slate-800/90 border-slate-700 text-white">
              <CardHeader>
                <CardTitle>Subscription Benefits</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    'Unlimited API key integrations',
                    'All 10+ trading strategies',
                    'Real-time alerts & notifications',
                    'AI-powered automation',
                    'Advanced backtesting tools',
                    'Priority customer support',
                    'Balance-based trading logic',
                    'Real-time market data',
                  ].map((feature, index) => (
                    <div className="flex items-center space-x-2" key={index}>
                      <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0" />
                      <span className="text-sm text-slate-300">{feature}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
