import { logError, logWarn, logInfo, logDebug } from '../lib/logger'

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { callBack4AppFunction } from '../back4app/config'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Alert, AlertDescription } from './ui/alert'
import { Switch } from './ui/switch'
import { Brain, TrendingUp, BarChart3, ArrowLeft, Play, Pause, Settings2, Zap } from 'lucide-react'

interface AIAutomationSettings {
  enabled: boolean
  learningMode: boolean
  autoTrading: boolean
  riskLevel: 'conservative' | 'moderate' | 'aggressive'
  maxDailyTrades: number
  stopLossPercentage: number
  takeProfitPercentage: number
}

interface AIPerformance {
  totalSignals: number
  successfulTrades: number
  winRate: number
  totalProfit: number
  learningProgress: number
  strategiesOptimized: number
}

export default function AIAutomation() {
  const [settings, setSettings] = useState<AIAutomationSettings>({
    enabled: false,
    learningMode: true,
    autoTrading: false,
    riskLevel: 'moderate',
    maxDailyTrades: 10,
    stopLossPercentage: 2,
    takeProfitPercentage: 6
  })
  const [performance, setPerformance] = useState<AIPerformance>({
    totalSignals: 0,
    successfulTrades: 0,
    winRate: 0,
    totalProfit: 0,
    learningProgress: 0,
    strategiesOptimized: 0
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    fetchAISettings()
    fetchAIPerformance()
  }, [])

  const fetchAISettings = async () => {
    try {
      const data = await callBack4AppFunction('getAISettings')
      
      setSettings(data.settings || settings)
      setIsRunning(data.settings?.enabled || false)
    } catch (error) {
      logError('Error fetching AI settings:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchAIPerformance = async () => {
    try {
      const data = await callBack4AppFunction('getAIPerformance')
      
      setPerformance(data.performance || performance)
    } catch (error) {
      logError('Error fetching AI performance:', error)
    }
  }

  const saveSettings = async () => {
    setIsSaving(true)
    try {
      await callBack4AppFunction('saveAISettings', { settings })
      
      setIsRunning(settings.enabled)
    } catch (error) {
      logError('Error saving AI settings:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const toggleAI = async () => {
    const newSettings = { ...settings, enabled: !settings.enabled }
    setSettings(newSettings)
    
    try {
      const token = localStorage.getItem('token')
      await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/ai/toggle`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ enabled: newSettings.enabled })
      })
      
      setIsRunning(newSettings.enabled)
    } catch (error) {
      logError('Error toggling AI:', error)
    }
  }

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'conservative': return 'bg-green-500/20 text-green-400'
      case 'moderate': return 'bg-yellow-500/20 text-yellow-400'
      case 'aggressive': return 'bg-red-500/20 text-red-400'
      default: return 'bg-gray-500/20 text-gray-400'
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-400 mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold text-white mb-2">Loading AI System</h2>
          <p className="text-slate-400">Initializing artificial intelligence...</p>
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
                  <Brain className="h-6 w-6 text-purple-400" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white">AI Automation</h1>
                  <p className="text-slate-400">Intelligent trading with machine learning</p>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <Badge className={`${isRunning ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'} text-lg px-4 py-2`}>
                {isRunning ? (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    AI Active
                  </>
                ) : (
                  <>
                    <Pause className="h-4 w-4 mr-2" />
                    AI Paused
                  </>
                )}
              </Badge>
              <Button
                onClick={toggleAI}
                className={`${isRunning ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
              >
                {isRunning ? 'Stop AI' : 'Start AI'}
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <Card className="bg-slate-800/90 border-slate-700 text-white">
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="h-5 w-5 mr-2 text-green-400" />
                AI Performance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-400">{performance.totalSignals}</p>
                  <p className="text-xs text-slate-400">Total Signals</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-400">{performance.winRate}%</p>
                  <p className="text-xs text-slate-400">Win Rate</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-purple-400">{performance.successfulTrades}</p>
                  <p className="text-xs text-slate-400">Successful Trades</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-yellow-400">${performance.totalProfit.toFixed(2)}</p>
                  <p className="text-xs text-slate-400">Total Profit</p>
                </div>
              </div>
              
              <div className="bg-slate-700/30 rounded-lg p-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm">Learning Progress</span>
                  <span className="text-sm text-purple-400">{performance.learningProgress}%</span>
                </div>
                <div className="w-full bg-slate-600 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-purple-600 to-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${performance.learningProgress}%` }}
                  ></div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/90 border-slate-700 text-white">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings2 className="h-5 w-5 mr-2 text-blue-400" />
                AI Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">Learning Mode</p>
                  <p className="text-xs text-slate-400">AI learns from backtesting</p>
                </div>
                <Switch
                  checked={settings.learningMode}
                  onCheckedChange={(checked) => setSettings({...settings, learningMode: checked})}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">Auto Trading</p>
                  <p className="text-xs text-slate-400">Execute trades automatically</p>
                </div>
                <Switch
                  checked={settings.autoTrading}
                  onCheckedChange={(checked) => setSettings({...settings, autoTrading: checked})}
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <p className="font-semibold">Risk Level</p>
                  <Badge className={getRiskLevelColor(settings.riskLevel)}>
                    {settings.riskLevel.toUpperCase()}
                  </Badge>
                </div>
                <select
                  value={settings.riskLevel}
                  onChange={(e) => setSettings({...settings, riskLevel: e.target.value as 'conservative' | 'moderate' | 'aggressive'})}
                  className="w-full p-2 bg-slate-700 border border-slate-600 rounded text-white"
                >
                  <option value="conservative">Conservative</option>
                  <option value="moderate">Moderate</option>
                  <option value="aggressive">Aggressive</option>
                </select>
              </div>

              <div>
                <p className="font-semibold mb-2">Max Daily Trades</p>
                <input
                  type="number"
                  value={settings.maxDailyTrades}
                  onChange={(e) => setSettings({...settings, maxDailyTrades: parseInt(e.target.value)})}
                  min="1"
                  max="50"
                  className="w-full p-2 bg-slate-700 border border-slate-600 rounded text-white"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/90 border-slate-700 text-white">
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="h-5 w-5 mr-2 text-yellow-400" />
                Risk Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <p className="font-semibold">Stop Loss</p>
                  <Badge className="bg-red-500/20 text-red-400">
                    {settings.stopLossPercentage}%
                  </Badge>
                </div>
                <input
                  type="range"
                  value={settings.stopLossPercentage}
                  onChange={(e) => setSettings({...settings, stopLossPercentage: parseFloat(e.target.value)})}
                  min="0.5"
                  max="10"
                  step="0.5"
                  className="w-full"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <p className="font-semibold">Take Profit</p>
                  <Badge className="bg-green-500/20 text-green-400">
                    {settings.takeProfitPercentage}%
                  </Badge>
                </div>
                <input
                  type="range"
                  value={settings.takeProfitPercentage}
                  onChange={(e) => setSettings({...settings, takeProfitPercentage: parseFloat(e.target.value)})}
                  min="1"
                  max="20"
                  step="0.5"
                  className="w-full"
                />
              </div>

              <Alert className="bg-yellow-500/10 border-yellow-500/20">
                <Zap className="h-4 w-4" />
                <AlertDescription className="text-yellow-400 text-xs">
                  AI automatically adjusts risk parameters based on market conditions and learning data.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-slate-800/90 border-slate-700 text-white mb-6">
          <CardHeader>
            <CardTitle>AI Learning Insights</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-3 text-purple-400">Strategy Optimization</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">EMA Crossover + RSI</span>
                    <Badge className="bg-green-500/20 text-green-400 text-xs">Optimized</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Bollinger Band Reversion</span>
                    <Badge className="bg-blue-500/20 text-blue-400 text-xs">Learning</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">MACD Divergence</span>
                    <Badge className="bg-yellow-500/20 text-yellow-400 text-xs">Analyzing</Badge>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-3 text-blue-400">Market Adaptation</h4>
                <div className="space-y-2 text-sm text-slate-300">
                  <p>• Volatility patterns recognized across 3 timeframes</p>
                  <p>• Risk-reward ratios optimized for current market</p>
                  <p>• Signal confidence improved by 15% this week</p>
                  <p>• Auto-adjusted stop losses based on ATR analysis</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-center space-x-4">
          <Button 
            onClick={() => navigate('/alerts-settings')}
            variant="outline"
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
          >
            Configure Alerts
          </Button>
          <Button 
            onClick={saveSettings}
            disabled={isSaving}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
          >
            {isSaving ? 'Saving...' : 'Save AI Settings'}
          </Button>
        </div>
      </div>
    </div>
  )
}
