import { CheckCircle, AlertTriangle, TrendingUp, TrendingDown, Shield, Clock } from 'lucide-react';
import React, { useState, useEffect } from 'react';

import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

interface TradeSignal {
  id: string;
  symbol: string;
  action: 'BUY' | 'SELL';
  entry: number;
  stopLoss: number;
  takeProfit: number;
  confidence: number;
  riskReward: number;
  timeframe: string;
  strategy: string;
  timestamp: Date;
  expectedReturn?: number;
  maxDrawdown?: number;
}

interface EnhancedTradeConfirmationProps {
  signal: TradeSignal;
  onConfirm: (confirmed: boolean, tradeData?: any) => void;
  onCancel: () => void;
  isVisible: boolean;
}

export default function EnhancedTradeConfirmation({
  signal,
  onConfirm,
  onCancel,
  isVisible
}: EnhancedTradeConfirmationProps) {
  const [countdown, setCountdown] = useState(30);
  const [isConfirming, setIsConfirming] = useState(false);
  const [riskAssessment, setRiskAssessment] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');

  useEffect(() => {
    if (!isVisible) return;

    setCountdown(30);
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isVisible]);

  useEffect(() => {
    // Assess risk based on confidence and risk-reward ratio
    if (signal.confidence >= 80 && signal.riskReward >= 2) {
      setRiskAssessment('LOW');
    } else if (signal.confidence >= 60 && signal.riskReward >= 1.5) {
      setRiskAssessment('MEDIUM');
    } else {
      setRiskAssessment('HIGH');
    }
  }, [signal.confidence, signal.riskReward]);

  const handleConfirm = async () => {
    setIsConfirming(true);
    
    // Simulate trade execution delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    onConfirm(true, {
      ...signal,
      executedAt: new Date(),
      status: 'CONFIRMED'
    });
    
    setIsConfirming(false);
  };

  const handleReject = () => {
    onConfirm(false);
  };

  if (!isVisible) return null;

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'LOW': return 'text-green-400 bg-green-500/20 border-green-500/30';
      case 'MEDIUM': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30';
      case 'HIGH': return 'text-red-400 bg-red-500/20 border-red-500/30';
      default: return 'text-slate-400 bg-slate-500/20 border-slate-500/30';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-400';
    if (confidence >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${signal.action === 'BUY' ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
              {signal.action === 'BUY' ? (
                <TrendingUp className="h-6 w-6 text-green-400" />
              ) : (
                <TrendingDown className="h-6 w-6 text-red-400" />
              )}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Trade Confirmation</h2>
              <p className="text-slate-400">Review trade details before execution</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Clock className="h-5 w-5 text-slate-400" />
            <span className="text-slate-400 font-mono">{countdown}s</span>
          </div>
        </div>

        {/* Trade Details */}
        <div className="space-y-6">
          {/* Main Trade Info */}
          <Card className="bg-slate-800/50 border-slate-600">
            <CardContent className="p-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-slate-400 text-sm">Symbol</p>
                  <p className="text-white font-semibold text-lg">{signal.symbol}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-sm">Action</p>
                  <p className={`font-semibold text-lg ${signal.action === 'BUY' ? 'text-green-400' : 'text-red-400'}`}>
                    {signal.action}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 text-sm">Entry Price</p>
                  <p className="text-white font-semibold">${signal.entry.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-sm">Strategy</p>
                  <p className="text-white font-semibold">{signal.strategy}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Price Levels */}
          <Card className="bg-slate-800/50 border-slate-600">
            <CardHeader>
              <CardTitle className="text-white text-lg">Price Levels</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-slate-700/50 rounded-lg">
                  <span className="text-slate-300">Entry Price</span>
                  <span className="text-white font-semibold">${signal.entry.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                  <span className="text-red-300">Stop Loss</span>
                  <span className="text-red-400 font-semibold">${signal.stopLoss.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                  <span className="text-green-300">Take Profit</span>
                  <span className="text-green-400 font-semibold">${signal.takeProfit.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Risk Assessment */}
          <Card className="bg-slate-800/50 border-slate-600">
            <CardHeader>
              <CardTitle className="text-white text-lg flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <span>Risk Assessment</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-slate-400 text-sm">Confidence</p>
                  <p className={`text-xl font-bold ${getConfidenceColor(signal.confidence)}`}>
                    {signal.confidence}%
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 text-sm">Risk Level</p>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getRiskColor(riskAssessment)}`}>
                    {riskAssessment}
                  </span>
                </div>
                <div>
                  <p className="text-slate-400 text-sm">Risk/Reward Ratio</p>
                  <p className="text-white font-semibold text-lg">{signal.riskReward.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-sm">Timeframe</p>
                  <p className="text-white font-semibold">{signal.timeframe}</p>
                </div>
              </div>
              
              {signal.expectedReturn && (
                <div className="mt-4 p-3 bg-slate-700/50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300">Expected Return</span>
                    <span className="text-green-400 font-semibold">
                      +{signal.expectedReturn.toFixed(2)}%
                    </span>
                  </div>
                  {signal.maxDrawdown && (
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-slate-300">Max Drawdown</span>
                      <span className="text-red-400 font-semibold">
                        -{signal.maxDrawdown.toFixed(2)}%
                      </span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Risk Warnings */}
          {riskAssessment === 'HIGH' && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="h-5 w-5 text-red-400 mt-0.5" />
                <div>
                  <h4 className="text-red-400 font-semibold mb-1">High Risk Trade</h4>
                  <p className="text-red-300 text-sm">
                    This trade has a high risk profile. Please review the parameters carefully 
                    and ensure you understand the potential losses before proceeding.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-4 pt-4">
            <Button
              onClick={handleConfirm}
              disabled={isConfirming || countdown === 0}
              className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-slate-600 disabled:cursor-not-allowed"
            >
              {isConfirming ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Executing...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Confirm Trade
                </>
              )}
            </Button>
            
            <Button
              onClick={handleReject}
              disabled={isConfirming}
              variant="outline"
              className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Reject
            </Button>
          </div>

          {/* Countdown Warning */}
          {countdown <= 10 && countdown > 0 && (
            <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <p className="text-yellow-400 text-sm text-center">
                Trade will auto-cancel in {countdown} seconds
              </p>
            </div>
          )}

          {countdown === 0 && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-red-400 text-sm text-center">
                Trade confirmation has expired. Please request a new signal.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
