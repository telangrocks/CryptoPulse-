import { logError, logWarn, logInfo, logDebug } from '../lib/logger'

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Label } from './ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Alert, AlertDescription } from './ui/alert'
import { Badge } from './ui/badge'
import { Settings, TrendingUp, Clock, Target, CheckCircle, Zap, BarChart3, Star, ArrowRight } from 'lucide-react'
import { callBack4AppFunction } from '../back4app/config'
// import { getMockData } from '../lib/cloud-functions' // Temporarily disabled for build

interface BotConfig {
  timeframe: string
  strategy_type: string
  strategy_name: string
}

interface SelectedPair {
  symbol: string
  category?: 'scalping' | 'day-trading'
  score?: number
  metrics?: {
    liquidity: number
    volume: number
    volatility: number
    price: number
    change24h: number
    volume24h: number
  }
}

export default function BotSetup() {
  const [config, setConfig] = useState<BotConfig>({
    timeframe: '15M',
    strategy_type: '',
    strategy_name: ''
  })
  const [selectedPairs, setSelectedPairs] = useState<SelectedPair[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [recommendedStrategy, setRecommendedStrategy] = useState<string>('')
  const [strategyRecommendations, setStrategyRecommendations] = useState<any>(null)
  const navigate = useNavigate()

  const timeframes = [
    { value: '5M', label: '5 Minutes', description: 'Ultra-fast scalping' },
    { value: '15M', label: '15 Minutes', description: 'Recommended for beginners' },
    { value: '30M', label: '30 Minutes', description: 'Balanced approach' },
    { value: '1H', label: '1 Hour', description: 'Medium-term trading' },
    { value: '4H', label: '4 Hours', description: 'Swing trading' }
  ]

  const scalpingStrategies = [
    { 
      value: 'ema_rsi_scalp', 
      name: 'EMA Crossover + RSI Filter', 
      description: 'Fast EMA crossovers with RSI confirmation',
      difficulty: 'Beginner',
      risk: 'Low',
      profitTarget: '0.5-1%',
      stopLoss: '0.3%'
    },
    { 
      value: 'vwap_macd_breakout', 
      name: 'Breakout (VWAP + MACD)', 
      description: 'Volume-weighted price breakouts with MACD',
      difficulty: 'Intermediate',
      risk: 'Medium',
      profitTarget: '1-2%',
      stopLoss: '0.5%'
    },
    { 
      value: 'bollinger_reversion', 
      name: 'Bollinger Band Reversion', 
      description: 'Mean reversion using Bollinger Bands',
      difficulty: 'Intermediate',
      risk: 'Medium',
      profitTarget: '0.8-1.5%',
      stopLoss: '0.4%'
    },
    { 
      value: 'stoch_ema_filter', 
      name: 'Stochastic Oscillator + EMA Filter', 
      description: 'Stochastic signals with EMA trend filter',
      difficulty: 'Advanced',
      risk: 'Medium',
      profitTarget: '1-2.5%',
      stopLoss: '0.6%'
    },
    { 
      value: 'parabolic_ema_confirm', 
      name: 'Parabolic SAR + EMA Confirmation', 
      description: 'SAR signals confirmed by EMA direction',
      difficulty: 'Advanced',
      risk: 'High',
      profitTarget: '1.5-3%',
      stopLoss: '0.8%'
    }
  ]

  const dayTradingStrategies = [
    { 
      value: 'ema_macd_reversal', 
      name: 'EMA + MACD Trend Reversal', 
      description: 'Trend reversal signals using EMA and MACD',
      difficulty: 'Beginner',
      risk: 'Low',
      profitTarget: '2-5%',
      stopLoss: '1%'
    },
    { 
      value: 'vwap_rsi_reversion', 
      name: 'VWAP Reversion + RSI Filter', 
      description: 'VWAP mean reversion with RSI confirmation',
      difficulty: 'Intermediate',
      risk: 'Medium',
      profitTarget: '3-6%',
      stopLoss: '1.5%'
    },
    { 
      value: 'opening_range_breakout', 
      name: 'Opening Range Breakout + ATR Stop', 
      description: 'First hour breakout with ATR-based stops',
      difficulty: 'Intermediate',
      risk: 'Medium',
      profitTarget: '4-8%',
      stopLoss: '2%'
    },
    { 
      value: 'macd_divergence_ema', 
      name: 'MACD Divergence + EMA Confirmation', 
      description: 'Divergence signals with EMA trend confirmation',
      difficulty: 'Advanced',
      risk: 'High',
      profitTarget: '5-10%',
      stopLoss: '2.5%'
    },
    { 
      value: 'bollinger_squeeze_stoch', 
      name: 'Bollinger Band Squeeze + Stochastic', 
      description: 'Volatility squeeze breakouts with stochastic',
      difficulty: 'Expert',
      risk: 'High',
      profitTarget: '6-12%',
      stopLoss: '3%'
    }
  ]

  useEffect(() => {
    fetchSelectedPairs()
  }, [])

  const fetchSelectedPairs = async () => {
    try {
      const data = await callBack4AppFunction('getSelectedPairs')
      const pairs = data.pairs || []
      
      // Check if we have enhanced pair data from the backend
      if (data.enhancedPairs && data.enhancedPairs.length > 0) {
        const enhancedPairs = data.enhancedPairs.map((pair: any) => ({
          symbol: pair.symbol,
          category: pair.category,
          score: pair.score,
          metrics: pair.metrics
        }))
        
        setSelectedPairs(enhancedPairs)
        
        // Get strategy recommendations
        await getStrategyRecommendations()
      } else {
        // Fallback to basic pairs and try to analyze them
        const basicPairs = pairs.map((symbol: string) => ({
          symbol,
          category: undefined,
          score: undefined
        }))
        
        setSelectedPairs(basicPairs)
        
        // Try to analyze pairs for recommendations
        await analyzePairsForRecommendations(basicPairs)
        await getStrategyRecommendations()
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const analyzePairsForRecommendations = async (pairs: SelectedPair[]) => {
    try {
      // Try to get detailed pair analysis
      const symbols = pairs.map(p => p.symbol)
      const analysisData = await callBack4AppFunction('getPairAnalysis', { symbols })
      
      if (analysisData.success && analysisData.analysis) {
        const updatedPairs = pairs.map(pair => {
          const analysis = analysisData.analysis.find((a: any) => a.symbol === pair.symbol)
          if (analysis) {
            // Determine category based on analysis
            const category = (analysis.score > 70 && analysis.volatility < 2 ? 'scalping' : 'day-trading') as 'scalping' | 'day-trading'
            return {
              ...pair,
              category,
              score: analysis.score,
              metrics: {
                liquidity: analysis.score, // Use score as proxy for liquidity
                volume: analysis.volume,
                volatility: parseFloat(analysis.volatility),
                price: analysis.price,
                change24h: analysis.priceChange,
                volume24h: analysis.volume
              }
            }
          }
          return pair
        })
        
        setSelectedPairs(updatedPairs)
      }
    } catch (error) {
      logInfo('Pair analysis failed, using default recommendations:', 'BotSetup', error)
    }
  }

  const getStrategyRecommendations = async () => {
    try {
      const data = await callBack4AppFunction('getStrategyRecommendations')
      
      if (data.success && data.recommendations) {
        setStrategyRecommendations(data.recommendations)
        
        // Set recommended strategy based on pair counts
        const scalpingCount = data.recommendations.pairCounts?.scalping || 0
        const dayTradingCount = data.recommendations.pairCounts?.dayTrading || 0
        
        if (scalpingCount > dayTradingCount) {
          setRecommendedStrategy(data.recommendations.scalping)
          setConfig(prev => ({ ...prev, strategy_type: 'scalping' }))
        } else if (dayTradingCount > scalpingCount) {
          setRecommendedStrategy(data.recommendations.dayTrading)
          setConfig(prev => ({ ...prev, strategy_type: 'day_trading' }))
        } else {
          // Equal counts or no data, use scalping as default
          setRecommendedStrategy(data.recommendations.scalping)
          setConfig(prev => ({ ...prev, strategy_type: 'scalping' }))
        }
      }
    } catch (error) {
      logInfo('Strategy recommendations failed, using mock data:', 'BotSetup', error)
      // Use mock data as fallback
      try {
        // const mockData = await getMockData('getStrategyRecommendations') // Temporarily disabled
        const mockData = { 
          success: true, 
          recommendations: {
            pairCounts: { scalping: 0, dayTrading: 0 },
            scalping: { strategy_type: 'scalping', risk_level: 'medium' },
            dayTrading: { strategy_type: 'day_trading', risk_level: 'low' }
          }
        } // Mock fallback
        if (mockData.success && mockData.recommendations) {
          setStrategyRecommendations(mockData.recommendations)
          
          const scalpingCount = mockData.recommendations.pairCounts?.scalping || 0
          const dayTradingCount = mockData.recommendations.pairCounts?.dayTrading || 0
          
          if (scalpingCount > dayTradingCount) {
            setRecommendedStrategy('scalping')
            setConfig(prev => ({ ...prev, strategy_type: 'scalping' }))
          } else if (dayTradingCount > scalpingCount) {
            setRecommendedStrategy('day-trading')
            setConfig(prev => ({ ...prev, strategy_type: 'day_trading' }))
          } else {
            setRecommendedStrategy('scalping')
            setConfig(prev => ({ ...prev, strategy_type: 'scalping' }))
          }
        }
      } catch (mockError) {
        logInfo('Mock strategy recommendations also failed:', 'BotSetup', mockError)
      }
    }
  }

  const handleConfigChange = (field: string, value: string) => {
    setConfig(prev => ({ ...prev, [field]: value }))
    if (field === 'strategy_type') {
      setConfig(prev => ({ ...prev, strategy_name: '' }))
    }
  }

  const handleSaveConfig = async () => {
    if (!config.strategy_type || !config.strategy_name) {
      setError('Please select both strategy type and specific strategy')
      return
    }

    setIsSaving(true)
    setError('')

    try {
      const data = await callBack4AppFunction('saveBotConfig', {
        timeframe: config.timeframe,
        strategyType: config.strategy_type,
        strategyName: config.strategy_name
      })
      
      if (data.success) {
        setSuccess(true)
        // Auto-trigger backtesting after saving configuration
        setTimeout(async () => {
          try {
            // Start backtesting immediately
            await callBack4AppFunction('runBacktesting', {})
            navigate('/backtesting')
          } catch (error) {
            logInfo('Auto-backtesting failed, navigating anyway:', 'BotSetup', error)
            navigate('/backtesting')
          }
        }, 1500)
      } else {
        setError(data.message || 'Failed to save bot configuration')
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Network error. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }


  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-slate-800/90 border-slate-700 text-white">
          <CardContent className="text-center p-8">
            <CheckCircle className="h-16 w-16 text-green-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-green-400 mb-2">Bot Configured!</h2>
            <p className="text-slate-300 mb-4">Your trading bot setup has been saved successfully.</p>
            <p className="text-sm text-slate-400">Redirecting to backtesting...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mx-auto mb-4"></div>
          <p className="text-slate-400">Loading bot configuration...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="container mx-auto max-w-4xl">
        <div className="mb-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-purple-500/20 rounded-full">
              <Settings className="h-8 w-8 text-purple-400" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Trading Bot Setup</h1>
          <p className="text-slate-400">Configure your AI-powered trading strategy</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Selected Pairs Summary */}
          <Card className="bg-slate-800/90 border-slate-700 text-white">
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="h-5 w-5 mr-2 text-green-400" />
                Selected Pairs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {selectedPairs.map((pair) => (
                  <div key={pair.symbol} className="flex items-center justify-between p-2 bg-slate-700/50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-white">{pair.symbol}</span>
                      {pair.category && (
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${
                            pair.category === 'scalping' 
                              ? 'border-blue-400 text-blue-400' 
                              : 'border-orange-400 text-orange-400'
                          }`}
                        >
                          {pair.category === 'scalping' ? (
                            <>
                              <Zap className="h-3 w-3 mr-1" />
                              Scalping
                            </>
                          ) : (
                            <>
                              <BarChart3 className="h-3 w-3 mr-1" />
                              Day Trading
                            </>
                          )}
                        </Badge>
                      )}
                    </div>
                    {pair.score && (
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${
                          pair.score > 80 ? 'border-green-400 text-green-400' :
                          pair.score > 60 ? 'border-yellow-400 text-yellow-400' :
                          'border-red-400 text-red-400'
                        }`}
                      >
                        {pair.score}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-slate-600">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Total Pairs:</span>
                  <span className="text-white font-medium">{selectedPairs.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Scalping:</span>
                  <span className="text-blue-400 font-medium">
                    {selectedPairs.filter(p => p.category === 'scalping').length}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Day Trading:</span>
                  <span className="text-orange-400 font-medium">
                    {selectedPairs.filter(p => p.category === 'day-trading').length}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bot Configuration */}
          <Card className="lg:col-span-2 bg-slate-800/90 border-slate-700 text-white">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="h-5 w-5 mr-2 text-purple-400" />
                Bot Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Timeframe Selection */}
              <div className="space-y-3">
                <Label className="text-slate-300 flex items-center">
                  <Clock className="h-4 w-4 mr-2" />
                  Trading Timeframe
                </Label>
                <Select value={config.timeframe} onValueChange={(value) => handleConfigChange('timeframe', value)}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue placeholder="Select timeframe" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 border-slate-600">
                    {timeframes.map((tf) => (
                      <SelectItem key={tf.value} value={tf.value}>
                        <div>
                          <div className="font-medium">{tf.label}</div>
                          <div className="text-sm text-slate-400">{tf.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Strategy Selection - Organized by Type */}
              <div className="space-y-6">
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-white mb-2">Choose Your Trading Strategy</h3>
                  <p className="text-sm text-slate-400">Select from professional strategies optimized for your selected pairs</p>
                </div>

                {/* AI Recommendations Banner */}
                {strategyRecommendations && (
                  <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <div className="p-2 bg-purple-500/20 rounded-full">
                        <Star className="h-5 w-5 text-purple-400" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-purple-400 mb-1">AI Recommendations</h4>
                        <p className="text-sm text-slate-300 mb-2">{strategyRecommendations.reason}</p>
                        <div className="flex flex-wrap gap-2 text-xs">
                          <Badge variant="outline" className="border-blue-400 text-blue-400">
                            <Zap className="h-3 w-3 mr-1" />
                            Scalping: {strategyRecommendations.scalping}
                          </Badge>
                          <Badge variant="outline" className="border-orange-400 text-orange-400">
                            <BarChart3 className="h-3 w-3 mr-1" />
                            Day Trading: {strategyRecommendations.dayTrading}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Scalping Strategies */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Zap className="h-5 w-5 text-blue-400" />
                    <h4 className="text-lg font-semibold text-blue-400">Scalping Strategies</h4>
                    <Badge variant="outline" className="border-blue-400 text-blue-400">
                      {selectedPairs.filter(p => p.category === 'scalping').length} pairs
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-3">
                    {scalpingStrategies.map((strategy) => (
                      <div 
                        key={strategy.value}
                        className={`p-4 rounded-lg border cursor-pointer transition-all ${
                          config.strategy_name === strategy.value
                            ? 'border-blue-400 bg-blue-500/10'
                            : 'border-slate-600 bg-slate-700/50 hover:border-slate-500'
                        }`}
                        onClick={() => {
                          setConfig(prev => ({ 
                            ...prev, 
                            strategy_type: 'scalping', 
                            strategy_name: strategy.value 
                          }))
                        }}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <h5 className="font-semibold text-white">{strategy.name}</h5>
                              {recommendedStrategy === strategy.value && (
                                <Badge variant="outline" className="border-yellow-400 text-yellow-400 text-xs">
                                  <Star className="h-3 w-3 mr-1" />
                                  Recommended
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-slate-400 mb-3">{strategy.description}</p>
                            <div className="flex flex-wrap gap-2 text-xs">
                              <Badge variant="outline" className="border-slate-500 text-slate-300">
                                {strategy.difficulty}
                              </Badge>
                              <Badge variant="outline" className="border-slate-500 text-slate-300">
                                Risk: {strategy.risk}
                              </Badge>
                              <Badge variant="outline" className="border-green-500 text-green-400">
                                Target: {strategy.profitTarget}
                              </Badge>
                              <Badge variant="outline" className="border-red-500 text-red-400">
                                Stop: {strategy.stopLoss}
                              </Badge>
                            </div>
                          </div>
                          {config.strategy_name === strategy.value && (
                            <CheckCircle className="h-5 w-5 text-blue-400 ml-2" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Day Trading Strategies */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <BarChart3 className="h-5 w-5 text-orange-400" />
                    <h4 className="text-lg font-semibold text-orange-400">Day Trading Strategies</h4>
                    <Badge variant="outline" className="border-orange-400 text-orange-400">
                      {selectedPairs.filter(p => p.category === 'day-trading').length} pairs
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-3">
                    {dayTradingStrategies.map((strategy) => (
                      <div 
                        key={strategy.value}
                        className={`p-4 rounded-lg border cursor-pointer transition-all ${
                          config.strategy_name === strategy.value
                            ? 'border-orange-400 bg-orange-500/10'
                            : 'border-slate-600 bg-slate-700/50 hover:border-slate-500'
                        }`}
                        onClick={() => {
                          setConfig(prev => ({ 
                            ...prev, 
                            strategy_type: 'day_trading', 
                            strategy_name: strategy.value 
                          }))
                        }}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <h5 className="font-semibold text-white">{strategy.name}</h5>
                              {recommendedStrategy === strategy.value && (
                                <Badge variant="outline" className="border-yellow-400 text-yellow-400 text-xs">
                                  <Star className="h-3 w-3 mr-1" />
                                  Recommended
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-slate-400 mb-3">{strategy.description}</p>
                            <div className="flex flex-wrap gap-2 text-xs">
                              <Badge variant="outline" className="border-slate-500 text-slate-300">
                                {strategy.difficulty}
                              </Badge>
                              <Badge variant="outline" className="border-slate-500 text-slate-300">
                                Risk: {strategy.risk}
                              </Badge>
                              <Badge variant="outline" className="border-green-500 text-green-400">
                                Target: {strategy.profitTarget}
                              </Badge>
                              <Badge variant="outline" className="border-red-500 text-red-400">
                                Stop: {strategy.stopLoss}
                              </Badge>
                            </div>
                          </div>
                          {config.strategy_name === strategy.value && (
                            <CheckCircle className="h-5 w-5 text-orange-400 ml-2" />
                          )}
                        </div>
                      </div>
                    ))}
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

              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => navigate('/crypto-pairs')}
                  className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  <ArrowRight className="h-4 w-4 mr-2 rotate-180" />
                  Back to Pairs
                </Button>
                <Button 
                  onClick={handleSaveConfig}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                  disabled={isSaving || !config.strategy_type || !config.strategy_name}
                >
                  {isSaving ? 'Saving...' : 'Save & Continue'}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
