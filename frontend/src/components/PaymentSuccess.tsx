import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Card, CardContent } from './ui/card'
import { CheckCircle, ArrowRight, AlertCircle } from 'lucide-react'
import { Button } from './ui/button'
import { callBack4AppFunction } from '../back4app/config'
import { useAuth } from '../contexts/AuthContext'

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [countdown, setCountdown] = useState(5)
  const [paymentStatus, setPaymentStatus] = useState<'loading' | 'success' | 'failed'>('loading')
  const [orderDetails, setOrderDetails] = useState<any>(null)

  useEffect(() => {
    const verifyPayment = async () => {
      try {
        // Get order details from URL params or localStorage
        const orderId = searchParams.get('order_id') || searchParams.get('orderId')
        const paymentStatus = searchParams.get('payment_status')
        
        if (orderId) {
          // Verify payment with backend
          const result = await callBack4AppFunction('getSubscriptionStatus', {})
          
          if (result.success && result.hasSubscription) {
            setPaymentStatus('success')
            setOrderDetails({
              orderId: orderId,
              amount: result.subscription.amount,
              currency: result.subscription.currency,
              status: result.subscription.status
            })
          } else {
            setPaymentStatus('failed')
          }
        } else {
          // Check localStorage for order details
          const storedOrder = localStorage.getItem('cryptopulse_payment_order')
          if (storedOrder) {
            const order = JSON.parse(storedOrder)
            setOrderDetails(order)
            setPaymentStatus('success')
            localStorage.removeItem('cryptopulse_payment_order')
          } else {
            setPaymentStatus('failed')
          }
        }
      } catch (error) {
        console.error('Error verifying payment:', error)
        setPaymentStatus('failed')
      }
    }

    verifyPayment()
  }, [searchParams, user])

  useEffect(() => {
    if (paymentStatus === 'success') {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer)
            navigate('/dashboard')
            return 0
          }
          return prev - 1
        })
      }, 1000)

      return () => clearInterval(timer)
    }
  }, [navigate, paymentStatus])

  const orderId = searchParams.get('order_id') || orderDetails?.orderId

  if (paymentStatus === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-slate-800/90 border-slate-700 text-white">
          <CardContent className="text-center p-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <h1 className="text-xl font-bold text-white mb-2">Verifying Payment...</h1>
            <p className="text-slate-400">Please wait while we confirm your subscription.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (paymentStatus === 'failed') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-slate-800/90 border-slate-700 text-white">
          <CardContent className="text-center p-8">
            <AlertCircle className="h-20 w-20 text-red-400 mx-auto mb-6" />
            <h1 className="text-3xl font-bold text-red-400 mb-4">Payment Failed</h1>
            <p className="text-slate-300 mb-6">
              We couldn't verify your payment. Please try again or contact support.
            </p>
            
            <div className="space-y-4">
              <Button 
                onClick={() => navigate('/payment')}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              >
                Try Again
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
              
              <Button 
                onClick={() => navigate('/dashboard')}
                variant="outline"
                className="w-full"
              >
                Back to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-slate-800/90 border-slate-700 text-white">
        <CardContent className="text-center p-8">
          <CheckCircle className="h-20 w-20 text-green-400 mx-auto mb-6" />
          <h1 className="text-3xl font-bold text-green-400 mb-4">Payment Successful!</h1>
          <p className="text-slate-300 mb-6">
            Your CryptoPulse subscription is now active. Welcome to unlimited AI-powered trading!
          </p>
          
          {orderDetails && (
            <div className="bg-slate-700/50 rounded-lg p-4 mb-6">
              <p className="text-sm text-slate-400 mb-1">Order ID</p>
              <p className="text-white font-mono text-sm">{orderDetails.orderId}</p>
              <p className="text-sm text-slate-400 mt-2">Amount: ₹{(orderDetails.amount / 100).toFixed(2)}</p>
            </div>
          )}

          <div className="space-y-4">
            <Button 
              onClick={() => navigate('/dashboard')}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              Go to Dashboard
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
            
            <p className="text-sm text-slate-400">
              Redirecting automatically in {countdown} seconds...
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
