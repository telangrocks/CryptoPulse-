import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Alert, AlertDescription } from './ui/alert'
import { CreditCard, Shield, CheckCircle } from 'lucide-react'
import { callBack4AppFunction } from '../back4app/config'

export default function CashfreePayment() {
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success] = useState(false)

  const handleSubscription = async () => {
    if (!user) {
      setError('Please login to subscribe')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const orderData = await callBack4AppFunction('createSubscription', {
        userId: user.id
      })

      if (orderData.order_id) {
        window.location.href = `https://sandbox.cashfree.com/pg/orders/${orderData.order_id}/pay`
      } else {
        setError('Failed to create payment order')
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Payment initialization failed')
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-slate-800/90 border-slate-700 text-white">
          <CardContent className="text-center p-8">
            <CheckCircle className="h-16 w-16 text-green-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-green-400 mb-2">Subscription Active!</h2>
            <p className="text-slate-300 mb-4">Your CryptoPulse subscription is now active.</p>
            <p className="text-sm text-slate-400">Enjoy unlimited trading features!</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="container mx-auto max-w-2xl">
        <div className="mb-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-purple-500/20 rounded-full">
              <CreditCard className="h-8 w-8 text-purple-400" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Subscribe to CryptoPulse</h1>
          <p className="text-slate-400">Unlock unlimited AI-powered trading features</p>
        </div>

        <Card className="bg-slate-800/90 border-slate-700 text-white">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="h-5 w-5 mr-2 text-green-400" />
              Premium Subscription
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-lg p-6">
              <div className="text-center">
                <div className="text-4xl font-bold text-white mb-2">₹999</div>
                <div className="text-slate-400 mb-4">per month</div>
                <div className="space-y-2 text-sm text-slate-300">
                  <div>✓ Unlimited API key integrations</div>
                  <div>✓ All 10 trading strategies</div>
                  <div>✓ Real-time alerts & notifications</div>
                  <div>✓ AI-powered automation</div>
                  <div>✓ Advanced backtesting</div>
                  <div>✓ Priority support</div>
                </div>
              </div>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <Shield className="h-5 w-5 text-blue-400 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-blue-400 mb-2">Secure Payment</h3>
                  <div className="space-y-1 text-sm text-blue-300">
                    <p>Powered by Cashfree Payments</p>
                    <p>256-bit SSL encryption</p>
                    <p>PCI DSS compliant</p>
                  </div>
                </div>
              </div>
            </div>

            {error && (
              <Alert className="bg-red-500/10 border-red-500/20">
                <AlertDescription className="text-red-400">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            <Button 
              onClick={handleSubscription}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold py-3"
              disabled={isLoading}
            >
              {isLoading ? 'Processing...' : 'Subscribe Now - ₹999/month'}
            </Button>

            <p className="text-xs text-slate-400 text-center">
              By subscribing, you agree to our Terms of Service and Privacy Policy. 
              Cancel anytime from your account settings.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
