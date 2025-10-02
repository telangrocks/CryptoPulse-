import { Shield, AlertTriangle, CheckCircle } from 'lucide-react';
import React from 'react';
import { useNavigate } from 'react-router-dom';

import { Alert, AlertDescription } from './ui/alert';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

export default function DisclaimerScreen() {
  const navigate = useNavigate();

  const handleAccept = () => {
    navigate('/');
  };

  const handleDecline = () => {
    navigate('/auth');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <Card className="w-full max-w-4xl bg-slate-800/90 border-slate-700 text-white">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-yellow-500/20 rounded-full">
              <AlertTriangle className="h-8 w-8 text-yellow-400" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
            Important Disclaimer
          </CardTitle>
          <p className="text-slate-400 mt-2">Please read and understand the following terms</p>
        </CardHeader>

        <CardContent className="space-y-6">
          <Alert className="bg-red-500/10 border-red-500/20">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-red-400">
              <strong>Risk Warning:</strong> Cryptocurrency trading involves substantial risk of loss and is not suitable for all investors.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-white">Trading Risks</h3>
            <ul className="space-y-2 text-slate-300">
              <li className="flex items-start gap-2">
                <div className="w-2 h-2 bg-red-400 rounded-full mt-2 flex-shrink-0" />
                <span>Past performance does not guarantee future results</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="w-2 h-2 bg-red-400 rounded-full mt-2 flex-shrink-0" />
                <span>You may lose some or all of your invested capital</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="w-2 h-2 bg-red-400 rounded-full mt-2 flex-shrink-0" />
                <span>Cryptocurrency markets are highly volatile and unpredictable</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="w-2 h-2 bg-red-400 rounded-full mt-2 flex-shrink-0" />
                <span>Technical analysis and AI predictions are not foolproof</span>
              </li>
            </ul>
          </div>

          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-white">Terms of Service</h3>
            <ul className="space-y-2 text-slate-300">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                <span>You are responsible for your trading decisions</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                <span>We provide tools and analysis, not financial advice</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                <span>Always do your own research before trading</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                <span>Never invest more than you can afford to lose</span>
              </li>
            </ul>
          </div>

          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-blue-400 mb-2">Security Notice</h4>
                <p className="text-sm text-blue-300">
                  Your API keys are encrypted and stored securely. We never have access to your funds or trading accounts.
                  All trading decisions are made by you, not by our system.
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <Button
              className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700"
              onClick={handleDecline}
              variant="outline"
            >
              I Decline
            </Button>
            <Button
              className="flex-1 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
              onClick={handleAccept}
            >
              I Accept & Continue
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}