/**
 * @fileoverview Production-ready Cashfree Payment Integration for CryptoPulse
 * @version 1.0.0
 * @author CryptoPulse Team
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { 
  CreditCard, 
  Shield, 
  CheckCircle, 
  Loader2,
  Star,
  Zap,
  Brain,
  Target
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { logError, logInfo } from '../lib/logger';

interface PaymentOrder {
  orderId: string;
  amount: number;
  currency: string;
  subscriptionId: string;
  paymentUrl: string;
}

interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  features: string[];
  popular?: boolean;
}

const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'basic',
    name: 'Basic',
    price: 499,
    currency: 'INR',
    features: [
      '5 API key integrations',
      '3 trading strategies',
      'Basic alerts',
      'Email support',
      '1 month backtesting'
    ]
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 999,
    currency: 'INR',
    features: [
      'Unlimited API key integrations',
      'All 10 trading strategies',
      'Real-time alerts & notifications',
      'AI-powered automation',
      'Advanced backtesting',
      'Priority support',
      'Mobile app access'
    ],
    popular: true
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 1999,
    currency: 'INR',
    features: [
      'Everything in Pro',
      'Custom trading strategies',
      'Dedicated account manager',
      '24/7 phone support',
      'White-label options',
      'Advanced analytics',
      'API access'
    ]
  }
];

export default function CashfreePayment() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string>('pro');
  const [paymentOrder, setPaymentOrder] = useState<PaymentOrder | null>(null);

  useEffect(() => {
    // Check if returning from successful payment
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get('status');
    const orderId = urlParams.get('order_id');
    
    if (paymentStatus === 'success' && orderId) {
      setSuccess(true);
      logInfo('Payment completed successfully', 'CashfreePayment', { orderId });
    }
  }, []);

  const handleSubscription = async (planId: string) => {
    if (!user) {
      setError('Please login to subscribe');
      return;
    }

    setIsLoading(true);
    setError('');
    
    try {
      const plan = SUBSCRIPTION_PLANS.find(p => p.id === planId);
      if (!plan) {
        throw new Error('Invalid subscription plan');
      }

      logInfo('Initiating payment process', 'CashfreePayment', { planId, userId: user.id });

      const response = await fetch('/api/v1/payments/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('cryptopulse_token')}`
        },
        body: JSON.stringify({
          userId: user.id,
          planId: plan.id,
          amount: plan.price,
          currency: plan.currency
        })
      });

      const orderData = await response.json();
      
      if (orderData.success && orderData.data) {
        const order = orderData.data;
        
        // Store order details for success page
        localStorage.setItem('cryptopulse_payment_order', JSON.stringify({
          orderId: order.orderId,
          amount: order.amount,
          currency: order.currency,
          subscriptionId: order.subscriptionId,
          planId: plan.id
        }));
        
        setPaymentOrder(order);
        
        // Redirect to Cashfree payment page
        window.location.href = order.paymentUrl;
        
        logInfo('Payment order created successfully', 'CashfreePayment', { orderId: order.orderId });
      } else {
        throw new Error(orderData.message || 'Failed to create payment order');
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Payment initialization failed';
      setError(errorMessage);
      logError('Payment initialization failed', 'CashfreePayment', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlanSelect = (planId: string) => {
    setSelectedPlan(planId);
    setError('');
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-slate-800/90 border-slate-700 text-white">
          <CardContent className="text-center p-8">
            <CheckCircle className="h-16 w-16 text-green-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-green-400 mb-2">Subscription Active!</h2>
            <p className="text-slate-300 mb-4">Your CryptoPulse subscription is now active.</p>
            <p className="text-sm text-slate-400">Enjoy unlimited trading features!</p>
            <Button 
              onClick={() => window.location.href = '/dashboard'}
              className="mt-4 bg-green-600 hover:bg-green-700 text-white"
            >
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="container mx-auto max-w-6xl">
        <div className="mb-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-purple-500/20 rounded-full">
              <CreditCard className="h-8 w-8 text-purple-400" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Subscribe to CryptoPulse</h1>
          <p className="text-slate-400">Unlock unlimited AI-powered trading features</p>
        </div>

        {/* Pricing Plans */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {SUBSCRIPTION_PLANS.map((plan) => (
            <Card 
              key={plan.id} 
              className={`bg-slate-800/90 border-slate-700 text-white relative ${
                plan.popular ? 'ring-2 ring-purple-500' : ''
              } ${selectedPlan === plan.id ? 'bg-purple-500/10' : ''}`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <div className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-4 py-1 rounded-full text-sm font-semibold">
                    Most Popular
                  </div>
                </div>
              )}
              
              <CardHeader className="text-center">
                <CardTitle className="flex items-center justify-center">
                  {plan.id === 'basic' && <Target className="h-5 w-5 mr-2 text-blue-400" />}
                  {plan.id === 'pro' && <Zap className="h-5 w-5 mr-2 text-purple-400" />}
                  {plan.id === 'enterprise' && <Brain className="h-5 w-5 mr-2 text-green-400" />}
                  {plan.name}
                </CardTitle>
                <div className="text-4xl font-bold text-white">
                  ₹{plan.price}
                  <span className="text-lg text-slate-400">/month</span>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <ul className="space-y-2 text-sm text-slate-300">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-green-400 mr-2 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                
                <Button
                  onClick={() => handlePlanSelect(plan.id)}
                  className={`w-full ${
                    selectedPlan === plan.id
                      ? 'bg-purple-600 hover:bg-purple-700'
                      : 'bg-slate-700 hover:bg-slate-600'
                  } text-white`}
                >
                  {selectedPlan === plan.id ? 'Selected' : 'Select Plan'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Payment Security Info */}
        <Card className="bg-slate-800/90 border-slate-700 text-white mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="h-5 w-5 mr-2 text-green-400" />
              Secure Payment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                <Shield className="h-8 w-8 text-green-400 mx-auto mb-2" />
                <h3 className="font-semibold text-green-400 mb-1">256-bit SSL</h3>
                <p className="text-sm text-slate-400">Bank-level encryption</p>
              </div>
              <div className="text-center p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <CreditCard className="h-8 w-8 text-blue-400 mx-auto mb-2" />
                <h3 className="font-semibold text-blue-400 mb-1">PCI DSS</h3>
                <p className="text-sm text-slate-400">Compliant processing</p>
              </div>
              <div className="text-center p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                <Star className="h-8 w-8 text-purple-400 mx-auto mb-2" />
                <h3 className="font-semibold text-purple-400 mb-1">Trusted</h3>
                <p className="text-sm text-slate-400">By 100k+ traders</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Button */}
        <Card className="bg-slate-800/90 border-slate-700 text-white">
          <CardContent className="p-6">
            {error && (
              <Alert className="bg-red-500/10 border-red-500/20 mb-4">
                <AlertDescription className="text-red-400">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            <div className="text-center">
              <Button
                onClick={() => handleSubscription(selectedPlan)}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold py-4 text-lg"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  `Subscribe Now - ₹${SUBSCRIPTION_PLANS.find(p => p.id === selectedPlan)?.price}/month`
                )}
              </Button>

              <p className="text-xs text-slate-400 mt-4">
                By subscribing, you agree to our Terms of Service and Privacy Policy. 
                Cancel anytime from your account settings.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}