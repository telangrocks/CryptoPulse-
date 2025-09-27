import React, { useState, useCallback, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Alert, AlertDescription } from './ui/alert'
import { Badge } from './ui/badge'
import { 
  CheckCircle, 
  X, 
  Shield, 
  Target, 
  AlertTriangle,
  DollarSign,
  TrendingUp,
  TrendingDown
} from 'lucide-react'

import type { TradeSignal, UserApiKeys, EnhancedTradeConfirmationProps } from '../types';

export default function EnhancedTradeConfirmation({
  signal,
  userApiKeys,
  onConfirm,
  onClose
}: EnhancedTradeConfirmationProps) {
  const [isValidating, setIsValidating] = useState(false)
  const [validationResult, setValidationResult] = useState<{
    isValid: boolean
    message: string
    details?: any
  } | null>(null)
  const [riskAssessment, setRiskAssessment] = useState<{
    riskLevel: 'low' | 'medium' | 'high'
    riskAmount: number
    potentialReward: number
    riskRewardRatio: number
  } | null>(null)

  React.useEffect(() => {
    // Calculate risk assessment
    const riskAmount = Math.abs(signal.entry - signal.stopLoss)
    const potentialReward = Math.abs(signal.takeProfit - signal.entry)
    const riskRewardRatio = potentialReward / riskAmount
    
    let riskLevel: 'low' | 'medium' | 'high' = 'low'
    if (riskRewardRatio < 1.5) riskLevel = 'high'
    else if (riskRewardRatio < 2) riskLevel = 'medium'
    
    setRiskAssessment({
      riskLevel,
      riskAmount,
      potentialReward,
      riskRewardRatio
    })
  }, [signal])

  const validateTrade = async () => {
    setIsValidating(true)
    try {
      // Simulate trade validation
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Mock validation result
      const isValid = Math.random() > 0.1 // 90% success rate for demo
      setValidationResult({
        isValid,
        message: isValid 
          ? 'Trade validation successful. All checks passed.' 
          : 'Trade validation failed. Please check your account balance and risk limits.',
        details: {
          accountBalance: 10000,
          availableMargin: 5000,
          requiredMargin: riskAssessment?.riskAmount || 0,
          exchangeStatus: 'online',
          marketStatus: 'open'
        }
      })
    } catch (error) {
      setValidationResult({
        isValid: false,
        message: 'Validation failed due to network error. Please try again.'
      })
    } finally {
      setIsValidating(false)
    }
  }

  const handleConfirm = () => {
    if (validationResult?.isValid) {
      onConfirm(true, {
        signal,
        validationResult,
        riskAssessment,
        timestamp: new Date().toISOString()
      })
    } else {
      onConfirm(false)
    }
  }

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low': return 'text-green-400'
      case 'medium': return 'text-yellow-400'
      case 'high': return 'text-red-400'
      default: return 'text-slate-400'
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl bg-slate-800/95 border-slate-700 text-white">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <Shield className="h-6 w-6 mr-2 text-green-400" />
              Enhanced Trade Confirmation
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Trade Signal Display */}
          <div className="text-center">
            <h3 className="text-2xl font-bold mb-2">
              {signal.action} {signal.pair}
            </h3>
            <Badge className={`${signal.action === 'BUY' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'} text-lg px-4 py-2`}>
              {signal.action} Signal
            </Badge>
          </div>

          {/* Price Information */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-slate-700/50 rounded-lg">
              <p className="text-slate-400 text-sm">Entry Price</p>
              <p className="text-2xl font-bold text-white">${signal.entry.toFixed(4)}</p>
            </div>
            <div className="text-center p-4 bg-red-500/10 rounded-lg">
              <p className="text-slate-400 text-sm">Stop Loss</p>
              <p className="text-2xl font-bold text-red-400">${signal.stopLoss.toFixed(4)}</p>
            </div>
            <div className="text-center p-4 bg-green-500/10 rounded-lg">
              <p className="text-slate-400 text-sm">Take Profit</p>
              <p className="text-2xl font-bold text-green-400">${signal.takeProfit.toFixed(4)}</p>
            </div>
          </div>

          {/* Risk Assessment */}
          {riskAssessment && (
            <div className="bg-slate-700/30 rounded-lg p-4">
              <h4 className="font-semibold text-white mb-3 flex items-center">
                <Target className="h-4 w-4 mr-2" />
                Risk Assessment
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-slate-400">Risk Level</p>
                  <p className={`font-semibold ${getRiskColor(riskAssessment.riskLevel)}`}>
                    {riskAssessment.riskLevel.toUpperCase()}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400">Risk Amount</p>
                  <p className="font-semibold text-red-400">${riskAssessment.riskAmount.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-slate-400">Potential Reward</p>
                  <p className="font-semibold text-green-400">${riskAssessment.potentialReward.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-slate-400">Risk/Reward</p>
                  <p className="font-semibold text-white">1:{riskAssessment.riskRewardRatio.toFixed(2)}</p>
                </div>
              </div>
            </div>
          )}

          {/* Validation Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-white">Pre-Trade Validation</h4>
              <Button
                onClick={validateTrade}
                disabled={isValidating}
                variant="outline"
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                {isValidating ? 'Validating...' : 'Validate Trade'}
              </Button>
            </div>

            {validationResult && (
              <Alert className={validationResult.isValid ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'}>
                {validationResult.isValid ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                <AlertDescription className={validationResult.isValid ? 'text-green-400' : 'text-red-400'}>
                  {validationResult.message}
                </AlertDescription>
              </Alert>
            )}

            {validationResult?.details && (
              <div className="bg-slate-700/30 rounded-lg p-4">
                <h5 className="font-semibold text-white mb-2">Validation Details</h5>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-slate-400">Account Balance</p>
                    <p className="text-white">${validationResult.details.accountBalance.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">Available Margin</p>
                    <p className="text-white">${validationResult.details.availableMargin.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">Required Margin</p>
                    <p className="text-white">${validationResult.details.requiredMargin.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">Exchange Status</p>
                    <Badge className="bg-green-500/20 text-green-400">
                      {validationResult.details.exchangeStatus}
                    </Badge>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <Button 
              onClick={onClose}
              variant="outline"
              className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleConfirm}
              disabled={!validationResult?.isValid}
              className="flex-1 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 disabled:opacity-50"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Execute Trade
            </Button>
          </div>

          {/* Warning */}
          <Alert className="bg-yellow-500/10 border-yellow-500/20">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-yellow-400">
              <strong>Risk Warning:</strong> Trading involves substantial risk. Only trade with funds you can afford to lose. 
              This trade will be executed with the risk parameters shown above.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  )
}
