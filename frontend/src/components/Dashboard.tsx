import { logError, logWarn, logInfo, logDebug } from '../lib/logger'

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { 
  TrendingUp, 
  Settings, 
  LogOut, 
  Clock, 
  CreditCard, 
  Activity, 
  BarChart3,
  Zap,
  Shield,
  Target,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Star,
  Trophy,
  Users,
  Globe
} from 'lucide-react'
import { callBack4AppFunction } from '../firebase/config'

export default function Dashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [billingInfo, setBillingInfo] = useState<{
    subscription_status?: string;
    trial_active?: boolean;
    trial_end?: string;
    amount?: number;
    days_remaining?: number;
  } | null>(null)
  const [stats, setStats] = useState({
    totalTrades: 0,
    winRate: 0,
    totalProfit: 0,
    activeBots: 0
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        const [billingData, statsData] = await Promise.all([
          callBack4AppFunction('getBillingStatus'),
          callBack4AppFunction('getTradeStatistics', { period: '30d' })
        ])
        
        setBillingInfo(billingData)
        
        if (statsData.success) {
          setStats({
            totalTrades: statsData.statistics?.totalTrades || 0,
            winRate: statsData.statistics?.winRate || 0,
            totalProfit: statsData.statistics?.totalProfit || 0,
            activeBots: 1 // Assuming 1 active bot for now
          })
        }
      } catch (error) {
        logError('Failed to fetch dashboard data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    if (user) {
      fetchData()
    }
  }, [user])

  const handleLogout = () => {
    logout()
  }

  const getTrialStatus = () => {
    if (!billingInfo) return null
    
    if (billingInfo.trial_active) {
      return {
        status: 'trial',
        message: `${billingInfo.days_remaining} days remaining`,
        color: 'bg-green-500'
      }
    } else if (billingInfo.subscription_status === 'active') {
      return {
        status: 'active',
        message: 'Active Subscription',
        color: 'bg-blue-500'
      }
    } else {
      return {
        status: 'expired',
        message: 'Trial Expired',
        color: 'bg-red-500'
      }
    }
  }

  const trialStatus = getTrialStatus()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <TrendingUp className="h-6 w-6 text-purple-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">CryptoPulse Dashboard</h1>
              <p className="text-slate-400">Welcome back, {user?.email}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            {trialStatus && (
              <Badge className={`${trialStatus.color} text-white`}>
                <Clock className="h-3 w-3 mr-1" />
                {trialStatus.message}
              </Badge>
            )}
            <Button variant="outline" size="sm" className="border-slate-600 text-slate-300">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
            <Button variant="outline" size="sm" onClick={handleLogout} className="border-slate-600 text-slate-300">
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Card className="bg-slate-800/90 border-slate-700 text-white">
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <CreditCard className="h-5 w-5 mr-2 text-green-400" />
                Subscription Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              {billingInfo ? (
                <div className="space-y-2">
                  <p className="text-slate-300">
                    Status: <span className="font-semibold text-white">{billingInfo.subscription_status}</span>
                  </p>
                  {billingInfo.trial_active && (
                    <p className="text-slate-300">
                      Trial ends: <span className="font-semibold text-white">
                        {billingInfo.trial_end ? new Date(billingInfo.trial_end).toLocaleDateString() : 'N/A'}
                      </span>
                    </p>
                  )}
                  <p className="text-slate-300">
                    Monthly fee: <span className="font-semibold text-white">₹{billingInfo.amount}</span>
                  </p>
                </div>
              ) : (
                <p className="text-slate-400">Loading...</p>
              )}
            </CardContent>
          </Card>

          <Card className="bg-slate-800/90 border-slate-700 text-white">
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                className="w-full bg-purple-600 hover:bg-purple-700" 
                onClick={() => navigate('/api-keys')}
              >
                Setup API Keys
              </Button>
              <Button 
                className="w-full bg-blue-600 hover:bg-blue-700" 
                onClick={() => navigate('/crypto-pairs')}
              >
                Configure Bot
              </Button>
              <div className="flex space-x-2">
                <Button 
                  className="flex-1 bg-orange-600 hover:bg-orange-700" 
                  onClick={() => navigate('/ai-automation')}
                >
                  AI Automation
                </Button>
                <Button 
                  className="flex-1 bg-cyan-600 hover:bg-cyan-700" 
                  onClick={() => navigate('/alerts-settings')}
                >
                  Alerts
                </Button>
              </div>
              <div className="space-y-2">
                <Button 
                  className="w-full bg-green-600 hover:bg-green-700" 
                  onClick={() => navigate('/backtesting')}
                >
                  Start Trading
                </Button>
                <Button 
                  className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700" 
                  onClick={() => navigate('/monitoring')}
                >
                  <Activity className="h-4 w-4 mr-2" />
                  Live Monitoring
                </Button>
                <Button 
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700" 
                  onClick={() => navigate('/performance')}
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Performance Analytics
                </Button>
                <Button 
                  className="w-full bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700" 
                  onClick={() => navigate('/exchange-integration')}
                >
                  <Globe className="h-4 w-4 mr-2" />
                  Exchange Integration
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/90 border-slate-700 text-white">
            <CardHeader>
              <CardTitle className="text-lg">Trading Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-slate-400">
                <p>Active Pairs: <span className="text-white">0</span></p>
                <p>Running Strategies: <span className="text-white">0</span></p>
                <p>Today's Signals: <span className="text-white">0</span></p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-slate-800/90 border-slate-700 text-white">
          <CardHeader>
            <CardTitle>Getting Started</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center space-x-3 p-3 bg-slate-700/50 rounded-lg">
                <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center text-xs font-bold">1</div>
                <div>
                  <p className="font-semibold">Setup API Keys</p>
                  <p className="text-sm text-slate-400">Connect your exchange API keys for market data and trading</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3 p-3 bg-slate-700/30 rounded-lg opacity-60">
                <div className="w-6 h-6 bg-slate-500 rounded-full flex items-center justify-center text-xs font-bold">2</div>
                <div>
                  <p className="font-semibold">Select Trading Pairs</p>
                  <p className="text-sm text-slate-400">Choose cryptocurrency pairs to monitor and trade</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3 p-3 bg-slate-700/30 rounded-lg opacity-60">
                <div className="w-6 h-6 bg-slate-500 rounded-full flex items-center justify-center text-xs font-bold">3</div>
                <div>
                  <p className="font-semibold">Configure Trading Bot</p>
                  <p className="text-sm text-slate-400">Set up timeframes and trading strategies</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3 p-3 bg-slate-700/30 rounded-lg opacity-60">
                <div className="w-6 h-6 bg-slate-500 rounded-full flex items-center justify-center text-xs font-bold">4</div>
                <div>
                  <p className="font-semibold">Start Trading</p>
                  <p className="text-sm text-slate-400">Begin receiving AI-powered trading signals</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
