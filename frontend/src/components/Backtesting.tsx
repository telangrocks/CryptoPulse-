import { logError, logWarn, logInfo, logDebug } from '../lib/logger'

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Alert, AlertDescription } from './ui/alert'
import { TrendingUp, TrendingDown, BarChart3, Target, Shield, Play, X, CheckCircle } from 'lucide-react'
import { callBack4AppFunction } from '../firebase/config'
import EnhancedTradeConfirmation from './EnhancedTradeConfirmation'

interface BacktestResult {
  pair: string
  strategy: string
  winRate: number
  avgPnL: number
  riskReward: number
  maxDrawdown: number
  sharpeRatio: number
  totalTrades: number
  winningTrades: number
  losingTrades: number
  timeframe?: string
  validSignals?: number
  dataPoints?: number
  period?: string
}

interface TradeSignal {
  pair: string
  action: 'BUY' | 'SELL'
  entry: number
  stopLoss: number
  takeProfit: number
  confidence: number
  timestamp: string
}

export default function Backtesting() {
  const [backtestResults, setBacktestResults] = useState<BacktestResult[]>([])
  const [currentSignal, setCurrentSignal] = useState<TradeSignal | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showTradeConfirmation, setShowTradeConfirmation] = useState(false)
  const [isRunningBacktest, setIsRunningBacktest] = useState(false)
  const [backtestProgress, setBacktestProgress] = useState<string>('')
  const [botConfig, setBotConfig] = useState<any>(null)
  const [selectedPairs, setSelectedPairs] = useState<string[]>([])
  const [userApiKeys, setUserApiKeys] = useState<any>(null)
  const navigate = useNavigate()

  useEffect(() => {
    loadUserConfiguration()
    runBacktesting()
  }, [])

  const loadUserConfiguration = async () => {
    try {
      const [botConfigData, pairsData, apiKeysData] = await Promise.all([
        callBack4AppFunction('getBotConfig'),
        callBack4AppFunction('getSelectedPairs'),
        callBack4AppFunction('getDecryptedApiKeys')
      ])
      
      if (botConfigData.success) {
        setBotConfig(botConfigData.config)
      }
      
      if (pairsData.success) {
        setSelectedPairs(pairsData.pairs || [])
      }

      if (apiKeysData.success) {
        setUserApiKeys(apiKeysData.keys)
      }
    } catch (error) {
      logInfo('Failed to load user configuration:', error)
    }
  }

  const runBacktesting = async () => {
    setIsRunningBacktest(true)
    setIsLoading(true)
    setBacktestProgress('Initializing backtesting engine...')

    try {
      // Simulate progress updates
      const progressSteps = [
        'Loading market data...',
        'Analyzing historical patterns...',
        'Running strategy calculations...',
        'Generating trading signals...',
        'Calculating performance metrics...',
        'Finalizing results...'
      ]

      let currentStep = 0
      const progressInterval = setInterval(() => {
        if (currentStep < progressSteps.length) {
          setBacktestProgress(progressSteps[currentStep])
          currentStep++
        } else {
          clearInterval(progressInterval)
        }
      }, 800)

      const data = await callBack4AppFunction('runBacktesting', {})

      clearInterval(progressInterval)
      setBacktestProgress('Backtesting completed!')

      if (data.success) {
        const result: BacktestResult = {
          pair: data.pair || 'BTC/USDT',
          strategy: data.strategy || 'Unknown Strategy',
          winRate: data.results.win_rate || 0,
          avgPnL: data.results.avg_profit_loss || 0,
          riskReward: data.results.risk_reward_ratio || 0,
          maxDrawdown: data.results.max_drawdown || 0,
          sharpeRatio: data.results.sharpe_ratio || 0,
          totalTrades: data.results.total_trades || 0,
          winningTrades: data.results.profitable_trades || 0,
          losingTrades: data.results.losing_trades || 0,
          timeframe: data.timeframe,
          validSignals: data.validSignals,
          dataPoints: data.dataPoints,
          period: data.period
        }
        
        setBacktestResults([result])
        
        // Generate trading signal if we have valid signals
        if (data.signals && data.signals.length > 0) {
          const bestSignal = data.signals[0] // Take the first (best) signal
          setCurrentSignal({
            pair: bestSignal.pair || data.pair,
            action: bestSignal.action || 'BUY',
            entry: bestSignal.entry || 45000,
            stopLoss: bestSignal.stopLoss || 42000,
            takeProfit: bestSignal.takeProfit || 48000,
            confidence: bestSignal.confidence || 75,
            timestamp: bestSignal.timestamp || new Date().toISOString()
          })
          
          // Auto-show trade confirmation after a short delay
          setTimeout(() => {
            setShowTradeConfirmation(true)
          }, 1000)
        } else {
          // No signals generated, show message
          setBacktestProgress('No trading opportunities detected at this time.')
        }
      } else {
        logError('Failed to run backtesting')
        setBacktestProgress('Backtesting failed. Please try again.')
      }
    } catch (error) {
      logError('Error running backtesting:', error)
      setBacktestProgress('Error occurred during backtesting.')
    } finally {
      setIsLoading(false)
      setIsRunningBacktest(false)
    }
  }

  const handleTradeConfirmation = async (confirmed: boolean, tradeData?: any) => {
    if (confirmed && currentSignal) {
      try {
        if (tradeData) {
          // Trade was executed successfully with enhanced validation
          navigate('/trade-execution', { 
            state: { 
              tradeExecuted: true, 
              tradeData: tradeData,
              signal: currentSignal 
            } 
          })
        } else {
          // Fallback to basic trade execution
          const data = await callBack4AppFunction('executeTrade', {
            pair: currentSignal.pair,
            action: currentSignal.action,
            entry: currentSignal.entry,
            stopLoss: currentSignal.stopLoss,
            takeProfit: currentSignal.takeProfit,
            confidence: currentSignal.confidence
          })
          
          if (data.success) {
            navigate('/trade-execution', { 
              state: { 
                tradeExecuted: true, 
                tradeData: data.trade,
                signal: currentSignal 
              } 
            })
          } else {
            logError('Trade execution failed:', data.message)
            navigate('/trade-execution', { 
              state: { 
                tradeExecuted: false, 
                error: data.message 
              } 
            })
          }
        }
      } catch (error) {
        logError('Error executing trade:', error)
        navigate('/trade-execution', { 
          state: { 
            tradeExecuted: false, 
            error: 'Failed to execute trade' 
          } 
        })
      }
    } else {
      // User cancelled, just close the modal
      setShowTradeConfirmation(false)
      setCurrentSignal(null)
    }
  }

  const getMetricColor = (value: number, type: 'percentage' | 'ratio' | 'drawdown') => {
    if (type === 'percentage') {
      return value >= 60 ? 'text-green-400' : value >= 40 ? 'text-yellow-400' : 'text-red-400'
    } else if (type === 'ratio') {
      return value >= 2 ? 'text-green-400' : value >= 1.5 ? 'text-yellow-400' : 'text-red-400'
    } else if (type === 'drawdown') {
      return value <= 10 ? 'text-green-400' : value <= 20 ? 'text-yellow-400' : 'text-red-400'
    }
    return 'text-white'
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="relative mb-8">
            <div className="animate-spin rounded-full h-20 w-20 border-4 border-purple-400/20 mx-auto"></div>
            <div className="animate-spin rounded-full h-20 w-20 border-4 border-transparent border-t-purple-400 absolute top-0 left-1/2 transform -translate-x-1/2"></div>
          </div>
          
          <h2 className="text-3xl font-bold text-white mb-4">Running Backtesting</h2>
          <p className="text-lg text-purple-400 mb-6">{backtestProgress}</p>
          
          {botConfig && (
            <div className="bg-slate-800/50 rounded-lg p-4 mb-6">
              <h3 className="text-white font-semibold mb-2">Strategy Configuration</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-400">Strategy:</span>
                  <p className="text-white font-medium">{botConfig.strategyName}</p>
                </div>
                <div>
                  <span className="text-slate-400">Timeframe:</span>
                  <p className="text-white font-medium">{botConfig.timeframe}</p>
                </div>
                <div>
                  <span className="text-slate-400">Type:</span>
                  <p className="text-white font-medium capitalize">{botConfig.strategyType}</p>
                </div>
                <div>
                  <span className="text-slate-400">Pairs:</span>
                  <p className="text-white font-medium">{selectedPairs.length}</p>
                </div>
              </div>
            </div>
          )}
          
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5 text-blue-400" />
              <span className="text-blue-400 font-medium">AI-Powered Analysis</span>
            </div>
            <p className="text-sm text-blue-300 mt-2">
              Analyzing market data with professional trading algorithms
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto p-6">
        <div className="mb-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-purple-500/20 rounded-full">
              <BarChart3 className="h-8 w-8 text-purple-400" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Signal Backtesting</h1>
          <p className="text-slate-400">Historical performance analysis of your trading strategy</p>
        </div>

        {backtestResults.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {backtestResults.map((result, index) => (
              <Card key={index} className="bg-slate-800/90 border-slate-700 text-white">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-xl font-bold">{result.pair}</span>
                      {result.timeframe && (
                        <Badge variant="outline" className="border-blue-400 text-blue-400">
                          {result.timeframe}
                        </Badge>
                      )}
                    </div>
                    <Badge className="bg-purple-500/20 text-purple-400">
                      {result.strategy}
                    </Badge>
                  </CardTitle>
                  {result.validSignals !== undefined && (
                    <div className="flex items-center space-x-4 text-sm text-slate-400 mt-2">
                      <span>Valid Signals: <span className="text-green-400 font-medium">{result.validSignals}</span></span>
                      {result.dataPoints && (
                        <span>Data Points: <span className="text-blue-400 font-medium">{result.dataPoints}</span></span>
                      )}
                      {result.period && (
                        <span>Period: <span className="text-purple-400 font-medium">{result.period}</span></span>
                      )}
                    </div>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Win Rate:</span>
                        <span className={`font-semibold ${getMetricColor(result.winRate, 'percentage')}`}>
                          {result.winRate.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Avg P/L:</span>
                        <span className={`font-semibold ${result.avgPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {result.avgPnL >= 0 ? '+' : ''}{result.avgPnL.toFixed(2)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Risk/Reward:</span>
                        <span className={`font-semibold ${getMetricColor(result.riskReward, 'ratio')}`}>
                          {result.riskReward.toFixed(2)}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Max Drawdown:</span>
                        <span className={`font-semibold ${getMetricColor(result.maxDrawdown, 'drawdown')}`}>
                          -{result.maxDrawdown.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Sharpe Ratio:</span>
                        <span className={`font-semibold ${getMetricColor(result.sharpeRatio, 'ratio')}`}>
                          {result.sharpeRatio.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Total Trades:</span>
                        <span className="font-semibold text-white">{result.totalTrades}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-slate-700">
                    <div className="flex justify-between text-sm">
                      <span className="text-green-400">
                        <TrendingUp className="h-4 w-4 inline mr-1" />
                        Wins: {result.winningTrades}
                      </span>
                      <span className="text-red-400">
                        <TrendingDown className="h-4 w-4 inline mr-1" />
                        Losses: {result.losingTrades}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="flex justify-center space-x-4">
          <Button 
            onClick={() => navigate('/bot-setup')} 
            variant="outline"
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
          >
            Back to Bot Setup
          </Button>
          <Button 
            onClick={runBacktesting}
            disabled={isRunningBacktest}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
          >
            {isRunningBacktest ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Running...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Run New Backtest
              </>
            )}
          </Button>
        </div>

        {showTradeConfirmation && currentSignal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-full max-w-2xl bg-slate-800/95 border-slate-700 text-white m-4">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center">
                    <Target className="h-6 w-6 mr-2 text-green-400" />
                    Trade Signal Confirmation
                  </span>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleTradeConfirmation(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="text-center">
                    <h3 className="text-2xl font-bold mb-2">
                      {currentSignal.action} {currentSignal.pair}
                    </h3>
                    <Badge className={`${currentSignal.action === 'BUY' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'} text-lg px-4 py-2`}>
                      {currentSignal.action} Signal
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-slate-700/50 rounded-lg">
                      <p className="text-slate-400 text-sm">Entry Price</p>
                      <p className="text-2xl font-bold text-white">${currentSignal.entry.toFixed(4)}</p>
                    </div>
                    <div className="text-center p-4 bg-red-500/10 rounded-lg">
                      <p className="text-slate-400 text-sm">Stop Loss</p>
                      <p className="text-2xl font-bold text-red-400">${currentSignal.stopLoss.toFixed(4)}</p>
                    </div>
                    <div className="text-center p-4 bg-green-500/10 rounded-lg">
                      <p className="text-slate-400 text-sm">Take Profit</p>
                      <p className="text-2xl font-bold text-green-400">${currentSignal.takeProfit.toFixed(4)}</p>
                    </div>
                  </div>

                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                    <div className="flex items-center space-x-3">
                      <Shield className="h-5 w-5 text-blue-400" />
                      <div>
                        <h4 className="font-semibold text-blue-400">Signal Confidence</h4>
                        <p className="text-blue-300">
                          {currentSignal.confidence}% confidence based on technical analysis
                        </p>
                      </div>
                    </div>
                  </div>

                  <Alert className="bg-yellow-500/10 border-yellow-500/20">
                    <AlertDescription className="text-yellow-400">
                      <strong>Risk Warning:</strong> Trading involves substantial risk. Only trade with funds you can afford to lose.
                    </AlertDescription>
                  </Alert>

                  <div className="flex space-x-3">
                    <Button 
                      onClick={() => handleTradeConfirmation(false)}
                      variant="outline"
                      className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700"
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={() => handleTradeConfirmation(true)}
                      className="flex-1 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Execute Trade
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Enhanced Trade Confirmation Modal */}
        {showTradeConfirmation && currentSignal && userApiKeys && (
          <EnhancedTradeConfirmation
            signal={currentSignal}
            userApiKeys={userApiKeys}
            onConfirm={handleTradeConfirmation}
            onClose={() => {
              setShowTradeConfirmation(false)
              setCurrentSignal(null)
            }}
          />
        )}
      </div>
    </div>
  )
}
