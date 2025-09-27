import { logError, logWarn, logInfo, logDebug } from '../lib/logger'

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Button } from './ui/button'
import { Checkbox } from './ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { AlertTriangle, Shield } from 'lucide-react'

export default function DisclaimerScreen() {
  const [accepted, setAccepted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { user, acceptDisclaimer, checkDisclaimerStatus } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    logInfo('🔍 DisclaimerScreen useEffect - user:', 'DisclaimerScreen', user)
    if (user) {
      logInfo('🔄 Checking disclaimer status for user:', user.email)
      checkDisclaimerStatus().then(hasAccepted => {
        logInfo('📋 Disclaimer status:', 'DisclaimerScreen', hasAccepted)
        if (hasAccepted) {
          logInfo('✅ Disclaimer already accepted, navigating to dashboard...')
          navigate('/dashboard')
        }
      }).catch(error => {
        logError('❌ Error checking disclaimer status:', error)
      })
    }
  }, [user, checkDisclaimerStatus, navigate])

  const handleAccept = async () => {
    if (!accepted || !user) {
      logInfo('❌ Cannot accept disclaimer:', 'DisclaimerScreen', { accepted, user: !!user })
      return
    }

    logInfo('🔄 Accepting disclaimer...')
    setIsSubmitting(true)
    try {
      await acceptDisclaimer()
      logInfo('✅ Disclaimer accepted, navigating to dashboard...')
      navigate('/dashboard')
    } catch (error) {
      logError('❌ Failed to accept disclaimer:', 'DisclaimerScreen', error)
      // Still navigate to dashboard even if disclaimer acceptance fails
      logInfo('⚠️ Navigating to dashboard despite disclaimer error...')
      navigate('/dashboard')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSkipToAuth = () => {
    navigate('/auth')
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl bg-slate-800/90 border-slate-700 text-white">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-red-500/20 rounded-full">
              <AlertTriangle className="h-8 w-8 text-red-400" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-red-400">
            Trading Risk Disclaimer
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="bg-slate-700/50 p-6 rounded-lg border border-slate-600">
            <div className="flex items-start space-x-3 mb-4">
              <Shield className="h-5 w-5 text-yellow-400 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-yellow-400 mb-2">Important Risk Warning</h3>
                <div className="space-y-3 text-sm text-slate-300">
                  <p>
                    <strong>Cryptocurrency trading involves substantial risk of loss</strong> and is not suitable for all investors. 
                    The value of cryptocurrencies can be extremely volatile and may result in significant financial loss.
                  </p>
                  
                  <p>
                    <strong>Past performance does not guarantee future results.</strong> All trading strategies, signals, and 
                    recommendations provided by CryptoPulse are for educational purposes only and should not be considered 
                    as financial advice.
                  </p>
                  
                  <p>
                    <strong>Automated trading carries additional risks</strong> including technical failures, connectivity issues, 
                    and algorithmic errors that may result in unexpected losses.
                  </p>
                  
                  <p>
                    <strong>You should only trade with money you can afford to lose.</strong> Never invest borrowed money or 
                    funds needed for essential expenses.
                  </p>
                  
                  <p>
                    <strong>CryptoPulse is not responsible for any trading losses</strong> incurred while using our platform, 
                    signals, or automated trading features.
                  </p>
                  
                  <p>
                    By using CryptoPulse, you acknowledge that you understand these risks and agree to trade at your own 
                    discretion and responsibility.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-start space-x-3 p-4 bg-slate-700/30 rounded-lg border border-slate-600">
            <Checkbox 
              id="disclaimer-accept"
              checked={accepted}
              onCheckedChange={(checked) => setAccepted(checked === true)}
              className="mt-1"
            />
            <label 
              htmlFor="disclaimer-accept" 
              className="text-sm font-medium leading-relaxed cursor-pointer"
            >
              I understand and acknowledge all the risks associated with cryptocurrency trading. 
              I confirm that I am trading with money I can afford to lose and accept full responsibility 
              for any trading decisions made using CryptoPulse.
            </label>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            {user ? (
              <Button 
                onClick={handleAccept}
                disabled={!accepted || isSubmitting}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-slate-600"
              >
                {isSubmitting ? 'Processing...' : 'Accept & Continue'}
              </Button>
            ) : (
              <>
                <Button 
                  onClick={handleSkipToAuth}
                  variant="outline"
                  className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  Sign In / Register
                </Button>
                <Button 
                  disabled
                  className="flex-1 bg-slate-600 cursor-not-allowed"
                >
                  Accept & Continue (Login Required)
                </Button>
              </>
            )}
          </div>
          
          <p className="text-xs text-slate-400 text-center">
            This disclaimer must be accepted before accessing CryptoPulse trading features.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
