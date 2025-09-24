import { logError, logWarn, logInfo, logDebug } from '../lib/logger'

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Alert, AlertDescription } from './ui/alert'
import { 
  Activity, 
  ArrowLeft, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  Zap, 
  BarChart3,
  Bot,
  Shield,
  Eye,
  EyeOff,
  RefreshCw,
  Play,
  Pause,
  Square
} from 'lucide-react'
import { callBack4AppFunction } from '../back4app/config'

interface TradeSignal {
  id: string
  pair: string
  action: 'BUY' | 'SELL'
  entry: number
  stopLoss: number
  takeProfit: number
  confidence: number
  timestamp: string
  status: 'pending' | 'executed' | 'cancelled'
}

interface BotStatus {
  isRunning: boolean
  lastUpdate: string
  totalSignals: number
  successfulTrades: number
  errorCount: number
}

export default function MonitoringDashboard() {
  const [signals, setSignals] = useState<TradeSignal[]>([])
  const [botStatus, setBotStatus] = useState<BotStatus>({
    isRunning: false,
    lastUpdate: '',
    totalSignals: 0,
    successfulTrades: 0,
    errorCount: 0
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    fetchMonitoringData()
    const interval = setInterval(fetchMonitoringData, 30000) // Refresh every 30 seconds
    
    // TODO: Replace with WebSocket connection when available
    // websocketManager.connect()
    // websocketManager.subscribe(handleRealTimeUpdate)
    
    return () => {
      clearInterval(interval)
      // websocketManager.disconnect()
    }
  }, [])

  const fetchMonitoringData = async () => {
    try {
      setIsRefreshing(true)
      const [signalsData, botStatusData] = await Promise.all([
        callBack4AppFunction('getLiveSignals'),
        callBack4AppFunction('getBotStatus')
      ])

      if (signalsData.success) {
        setSignals(signalsData.signals || [])
      }

      if (botStatusData.success) {
        setBotStatus(botStatusData.status || botStatus)
      }
    } catch (error) {
      logError('Failed to fetch monitoring data:', error)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  const toggleBot = async () => {
    try {
      const response = await callBack4AppFunction('toggleBot', { 
        enabled: !botStatus.isRunning 
      })
      
      if (response.success) {
        setBotStatus(prev => ({ ...prev, isRunning: !prev.isRunning }))
      }
    } catch (error) {
      logError('Failed to toggle bot:', error)
    }
  }

  const formatDateTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'executed': return 'bg-green-500/20 text-green-400'
      case 'pending': return 'bg-yellow-500/20 text-yellow-400'
      case 'cancelled': return 'bg-red-500/20 text-red-400'
      default: return 'bg-slate-500/20 text-slate-400'
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-400 mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold text-white mb-2">Loading Monitoring</h2>
          <p className="text-slate-400">Initializing live monitoring dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto p-6">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigate('/dashboard')}
                className="border-slate-600 text-slate-300 hover:bg-slate-700 mr-4"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <Activity className="h-6 w-6 text-purple-400" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white">Live Monitoring</h1>
                  <p className="text-slate-400">Real-time trading bot monitoring</p>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchMonitoringData}
                disabled={isRefreshing}
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDetails(!showDetails)}
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                {showDetails ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                {showDetails ? 'Hide Details' : 'Show Details'}
              </Button>
            </div>
          </div>
        </div>

        {/* Bot Status Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-slate-800/90 border-slate-700 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Bot Status</CardTitle>
              <Bot className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${botStatus.isRunning ? 'bg-green-400' : 'bg-red-400'}`} />
                <span className="text-lg font-bold">
                  {botStatus.isRunning ? 'Running' : 'Stopped'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Last update: {botStatus.lastUpdate ? formatDateTime(botStatus.lastUpdate) : 'Never'}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/90 border-slate-700 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Signals</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-400">{botStatus.totalSignals}</div>
              <p className="text-xs text-slate-400">Generated today</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/90 border-slate-700 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Successful Trades</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-400">{botStatus.successfulTrades}</div>
              <p className="text-xs text-slate-400">Executed today</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/90 border-slate-700 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Errors</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-400">{botStatus.errorCount}</div>
              <p className="text-xs text-slate-400">Last 24 hours</p>
            </CardContent>
          </Card>
        </div>

        {/* Bot Controls */}
        <Card className="bg-slate-800/90 border-slate-700 text-white mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="h-5 w-5 mr-2 text-purple-400" />
              Bot Controls
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-lg">
                  {botStatus.isRunning ? 'Bot is Running' : 'Bot is Stopped'}
                </h3>
                <p className="text-slate-400">
                  {botStatus.isRunning 
                    ? 'Trading bot is actively monitoring markets and executing trades'
                    : 'Trading bot is paused and not executing any trades'
                  }
                </p>
              </div>
              <Button
                onClick={toggleBot}
                className={`${
                  botStatus.isRunning 
                    ? 'bg-red-600 hover:bg-red-700' 
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {botStatus.isRunning ? (
                  <>
                    <Pause className="h-4 w-4 mr-2" />
                    Stop Bot
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Start Bot
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Live Signals */}
        <Card className="bg-slate-800/90 border-slate-700 text-white">
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="h-5 w-5 mr-2 text-green-400" />
              Live Trading Signals
            </CardTitle>
          </CardHeader>
          <CardContent>
            {signals.length > 0 ? (
              <div className="space-y-4">
                {signals.map((signal) => (
                  <div key={signal.id} className="p-4 bg-slate-700/30 rounded-lg border border-slate-600">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        {signal.action === 'BUY' ? (
                          <TrendingUp className="h-5 w-5 text-green-400" />
                        ) : (
                          <TrendingDown className="h-5 w-5 text-red-400" />
                        )}
                        <div>
                          <h3 className="font-semibold text-white text-lg">
                            {signal.action} {signal.pair}
                          </h3>
                          <p className="text-sm text-slate-400">
                            {formatDateTime(signal.timestamp)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className={getStatusColor(signal.status)}>
                          {signal.status.toUpperCase()}
                        </Badge>
                        <Badge className="bg-blue-500/20 text-blue-400">
                          {signal.confidence}% Confidence
                        </Badge>
                      </div>
                    </div>

                    {showDetails && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                        <div className="text-center p-3 bg-slate-600/30 rounded">
                          <p className="text-slate-400 text-sm">Entry Price</p>
                          <p className="text-white font-semibold">${signal.entry.toFixed(4)}</p>
                        </div>
                        <div className="text-center p-3 bg-red-500/10 rounded">
                          <p className="text-slate-400 text-sm">Stop Loss</p>
                          <p className="text-red-400 font-semibold">${signal.stopLoss.toFixed(4)}</p>
                        </div>
                        <div className="text-center p-3 bg-green-500/10 rounded">
                          <p className="text-slate-400 text-sm">Take Profit</p>
                          <p className="text-green-400 font-semibold">${signal.takeProfit.toFixed(4)}</p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Activity className="h-12 w-12 text-slate-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-300 mb-2">No Live Signals</h3>
                <p className="text-slate-400">
                  {botStatus.isRunning 
                    ? 'Bot is running but no signals generated yet'
                    : 'Start the bot to begin generating trading signals'
                  }
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* System Alerts */}
        {botStatus.errorCount > 0 && (
          <Alert className="bg-red-500/10 border-red-500/20 mt-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-red-400">
              <strong>System Alert:</strong> {botStatus.errorCount} errors detected in the last 24 hours. 
              Please check the bot configuration and API connections.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  )
}
