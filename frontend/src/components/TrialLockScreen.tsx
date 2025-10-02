import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Lock, 
  Crown, 
  Clock, 
  CreditCard, 
  CheckCircle, 
  XCircle,
  AlertTriangle,
  Star
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

interface TrialLockScreenProps {
  trialInfo?: {
    daysRemaining: number;
    hasUsedTrial: boolean;
    subscriptionStatus: string;
  };
  onSubscribe?: () => void;
}

export default function TrialLockScreen({ trialInfo, onSubscribe }: TrialLockScreenProps) {
  const navigate = useNavigate();
  
  const handleSubscribe = () => {
    if (onSubscribe) {
      onSubscribe();
    } else {
      navigate('/payment');
    }
  };

  const getStatusInfo = () => {
    if (trialInfo?.subscriptionStatus === 'active') {
      return {
        icon: <CheckCircle className="h-8 w-8 text-green-500" />,
        title: 'Active Subscription',
        message: 'You have full access to all features',
        color: 'text-green-500',
        bgColor: 'bg-green-50 dark:bg-green-900/20'
      };
    }
    
    if (trialInfo?.daysRemaining && trialInfo.daysRemaining > 0) {
      return {
        icon: <Clock className="h-8 w-8 text-blue-500" />,
        title: 'Trial Active',
        message: `${trialInfo.daysRemaining} days remaining in your trial`,
        color: 'text-blue-500',
        bgColor: 'bg-blue-50 dark:bg-blue-900/20'
      };
    }
    
    if (trialInfo?.hasUsedTrial) {
      return {
        icon: <XCircle className="h-8 w-8 text-red-500" />,
        title: 'Trial Expired',
        message: 'Your free trial has ended. Subscribe to continue using the app.',
        color: 'text-red-500',
        bgColor: 'bg-red-50 dark:bg-red-900/20'
      };
    }
    
    return {
      icon: <Lock className="h-8 w-8 text-gray-500" />,
      title: 'Access Restricted',
      message: 'Please subscribe to access this feature',
      color: 'text-gray-500',
      bgColor: 'bg-gray-50 dark:bg-gray-900/20'
    };
  };

  const statusInfo = getStatusInfo();
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {statusInfo.icon}
          </div>
          <CardTitle className="text-2xl font-bold">{statusInfo.title}</CardTitle>
          <p className={`text-lg ${statusInfo.color}`}>{statusInfo.message}</p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Trial Status Badge */}
          <div className="flex justify-center">
            <Badge 
              variant="outline" 
              className={`${statusInfo.color} border-current text-lg px-4 py-2`}
            >
              {trialInfo?.subscriptionStatus === 'active' ? 'Premium User' : 
               (trialInfo?.daysRemaining && trialInfo.daysRemaining > 0) ? 'Trial User' : 'Trial Expired'}
            </Badge>
          </div>

          {/* Feature Access Status */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-center">Feature Access</h3>
            <div className="grid grid-cols-2 gap-4">
              {[
                { name: 'Trading', icon: '📈' },
                { name: 'API Keys', icon: '🔑' },
                { name: 'Bot Setup', icon: '🤖' },
                { name: 'Backtesting', icon: '📊' },
                { name: 'Monitoring', icon: '📱' },
                { name: 'AI Assistant', icon: '🧠' }
              ].map((feature) => (
                <div key={feature.name} className="flex items-center space-x-2">
                  {trialInfo?.subscriptionStatus === 'active' || (trialInfo?.daysRemaining && trialInfo.daysRemaining > 0) ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                  <span className="text-sm">{feature.icon} {feature.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Subscription Benefits */}
          {trialInfo?.subscriptionStatus !== 'active' && (
            <div className={`p-4 rounded-lg ${statusInfo.bgColor}`}>
              <h3 className="text-lg font-semibold mb-3 flex items-center">
                <Crown className="h-5 w-5 mr-2 text-yellow-500" />
                Subscription Benefits
              </h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Unlimited API key integrations</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>All 10+ professional trading strategies</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Real-time alerts & notifications</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>AI-powered automation</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Advanced backtesting tools</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Priority customer support</span>
                </li>
              </ul>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            {trialInfo?.subscriptionStatus !== 'active' && (
              <Button 
                onClick={handleSubscribe}
                className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Subscribe Now - ₹999/month
              </Button>
            )}
            
            <Button 
              variant="outline" 
              onClick={() => navigate('/')}
              className="flex-1"
            >
              Back to Dashboard
            </Button>
          </div>

          {/* Trial Information */}
          {trialInfo?.hasUsedTrial && trialInfo.subscriptionStatus !== 'active' && (
            <div className="text-center text-sm text-muted-foreground">
              <AlertTriangle className="h-4 w-4 inline mr-1" />
              You have already used your free trial. Subscribe to continue using the app.
            </div>
          )}

          {/* Pricing Information */}
          <div className="text-center">
            <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-900/20 dark:to-blue-900/20 px-4 py-2 rounded-lg">
              <Star className="h-4 w-4 text-yellow-500" />
              <span className="text-sm font-medium">
                Special Launch Price: ₹999/month (Regular: ₹1,999/month)
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
