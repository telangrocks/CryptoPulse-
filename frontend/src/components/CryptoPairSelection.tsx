import { logError, logWarn, logInfo, logDebug } from '../lib/logger'

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { callBack4AppFunction } from '../back4app/config'
// import { getMockData } from '../lib/cloud-functions' // Temporarily disabled for build
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Checkbox } from './ui/checkbox'
import { Alert, AlertDescription } from './ui/alert'
import { Badge } from './ui/badge'
import { TrendingUp, CheckCircle, AlertTriangle, Zap, BarChart3, RefreshCw, Info } from 'lucide-react'

interface CryptoPair {
  symbol: string
  name: string
  selected: boolean
  score?: number
  category?: 'scalping' | 'day-trading'
  metrics?: {
    liquidity: number
    volume: number
    volatility: number
    price: number
    change24h: number
    volume24h: number
  }
}

interface PairAnalysis {
  symbol: string
  price: number
  volume: number
  priceChange: number
  high: number
  low: number
  spread: string
  volatility: string
  bidDepth: string
  askDepth: string
  recommendations: string[]
  score: number
}

export default function CryptoPairSelection() {
  const [pairs, setPairs] = useState<CryptoPair[]>([])
  const [selectedCount, setSelectedCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [dataSource, setDataSource] = useState<'real-time' | 'static' | 'loading'>('loading')
  const [pairAnalysis, setPairAnalysis] = useState<PairAnalysis[]>([])
  const [showAnalysis, setShowAnalysis] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    fetchCryptoPairs()
  }, [])

  useEffect(() => {
    setSelectedCount(pairs.filter(pair => pair.selected).length)
  }, [pairs])

  const fetchCryptoPairs = async () => {
    try {
      setIsLoading(true)
      setError('')
      
      // Try to get real-time trading pairs first
      try {
        const data = await callBack4AppFunction('getTopTradingPairs')
        
        if (data.success && data.pairs.length > 0) {
          const formattedPairs = data.pairs.map((symbol: string) => {
            const detailedPair = data.detailedPairs?.find(p => p.symbol === symbol)
            return {
              symbol,
              name: symbol.replace('/', ' / '),
              selected: false,
              score: detailedPair?.score,
              category: detailedPair?.category,
              metrics: detailedPair?.metrics
            }
          })
          
          setPairs(formattedPairs)
          setDataSource('real-time')
          return
        }
      } catch (error) {
        logInfo('Real-time pairs failed, trying mock data:', error)
        // Use mock data as fallback
        // const mockData = await getMockData('getTopTradingPairs') // Temporarily disabled
        const mockData = { success: true, pairs: [] } // Mock fallback
        if (mockData.success && mockData.pairs.length > 0) {
          const formattedPairs = mockData.pairs.map((symbol: string) => {
            const detailedPair = mockData.detailedPairs?.find(p => p.symbol === symbol)
            return {
              symbol,
              name: symbol.replace('/', ' / '),
              selected: false,
              score: detailedPair?.score,
              category: detailedPair?.category,
              metrics: detailedPair?.metrics
            }
          })
          
          setPairs(formattedPairs)
          setDataSource('static')
          return
        }
      }
      
      // Fallback to static pairs
      const data = await callBack4AppFunction('getCryptoPairs')
      
      const formattedPairs = data.pairs.map((symbol: string) => ({
        symbol,
        name: symbol.replace('/', ' / '),
        selected: false
      }))
      
      setPairs(formattedPairs)
      setDataSource('static')
    } catch (error) {
      setError('Network error. Please try again.')
      setDataSource('static')
    } finally {
      setIsLoading(false)
    }
  }

  const analyzeSelectedPairs = async () => {
    const selectedPairs = pairs.filter(pair => pair.selected).map(pair => pair.symbol)
    
    if (selectedPairs.length === 0) {
      setError('Please select at least one pair to analyze')
      return
    }

    logInfo('🔍 Analyzing selected pairs:', selectedPairs)
    setIsAnalyzing(true)
    setError('')

    try {
      // Try server first
      logInfo('🔄 Attempting server analysis...')
      const data = await callBack4AppFunction('getPairAnalysis', { symbols: selectedPairs })
      
      if (data.success) {
        logInfo('✅ Server analysis successful')
        setPairAnalysis(data.analysis)
        setShowAnalysis(true)
        return
      } else {
        logInfo('⚠️ Server analysis failed, trying mock data...')
      }
    } catch (error) {
      logInfo('⚠️ Server analysis error, trying mock data:', error)
    }

    // Use mock data as fallback
    try {
      logInfo('🔄 Using mock data for analysis...')
      // const mockData = await getMockData('getPairAnalysis', { symbols: selectedPairs }) // Temporarily disabled
      const mockData = { success: true, analysis: {} } // Mock fallback
      
      if (mockData.success) {
        logInfo('✅ Mock analysis successful')
        setPairAnalysis(mockData.analysis)
        setShowAnalysis(true)
      } else {
        logError('❌ Mock analysis failed:', mockData.error)
        setError('Analysis failed. Please try again.')
      }
    } catch (mockError) {
      logError('❌ Mock analysis error:', mockError)
      setError('Analysis failed. Please try again.')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handlePairToggle = (symbol: string) => {
    setPairs(prev => prev.map(pair => 
      pair.symbol === symbol 
        ? { ...pair, selected: !pair.selected }
        : pair
    ))
  }

  const handleSelectAll = () => {
    const allSelected = pairs.every(pair => pair.selected)
    setPairs(prev => prev.map(pair => ({ ...pair, selected: !allSelected })))
  }

  const handleSaveSelection = async () => {
    const selectedPairs = pairs.filter(pair => pair.selected).map(pair => pair.symbol)
    
    if (selectedPairs.length === 0) {
      setError('Please select at least one trading pair')
      return
    }

    setIsSaving(true)
    setError('')

    try {
      const data = await callBack4AppFunction('saveSelectedPairs', { pairs: selectedPairs })
      
      if (data.success) {
        setSuccess(true)
        setTimeout(() => {
          navigate('/bot-setup')
        }, 2000)
      } else {
        setError(data.message || 'Failed to save selection')
      }
    } catch {
      setError('Network error. Please try again.')
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
            <h2 className="text-2xl font-bold text-green-400 mb-2">Pairs Selected!</h2>
            <p className="text-slate-300 mb-4">
              {selectedCount} trading pairs have been saved successfully.
            </p>
            <p className="text-sm text-slate-400">Redirecting to bot setup...</p>
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
          <p className="text-slate-400">Loading crypto pairs...</p>
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
              <TrendingUp className="h-8 w-8 text-purple-400" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Select Trading Pairs</h1>
          <p className="text-slate-400">Choose cryptocurrency pairs to monitor and trade</p>
        </div>

        <Card className="bg-slate-800/90 border-slate-700 text-white">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <CardTitle>Available Trading Pairs</CardTitle>
                <Badge 
                  variant="outline" 
                  className={`${
                    dataSource === 'real-time' 
                      ? 'border-green-400 text-green-400' 
                      : 'border-yellow-400 text-yellow-400'
                  }`}
                >
                  {dataSource === 'real-time' ? 'Live Data' : 'Static List'}
                </Badge>
              </div>
              <div className="flex items-center space-x-3">
                <Badge variant="outline" className="border-purple-400 text-purple-400">
                  {selectedCount} Selected
                </Badge>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={fetchCryptoPairs}
                  disabled={isLoading}
                  className="border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleSelectAll}
                  className="border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  {pairs.every(pair => pair.selected) ? 'Deselect All' : 'Select All'}
                </Button>
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-6">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="h-5 w-5 text-blue-400 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-blue-400 mb-2">AI Bot Recommendations</h3>
                  <p className="text-sm text-blue-300">
                    Select at least one pair to continue. The AI bot will fetch real-time OHLC data 
                    for your selected pairs and generate trading signals based on your chosen strategies.
                  </p>
                  <div className="mt-2 text-xs text-blue-200">
                    <strong>Data Source:</strong> {dataSource === 'real-time' ? 'Live Market Data' : 'Demo/Static Data'} 
                    {dataSource === 'static' && ' (For demonstration purposes)'}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {pairs.map((pair) => (
                <div 
                  key={pair.symbol}
                  className={`p-4 rounded-lg border cursor-pointer transition-all ${
                    pair.selected 
                      ? 'border-purple-400 bg-purple-500/10' 
                      : 'border-slate-600 bg-slate-700/50 hover:border-slate-500'
                  }`}
                  onClick={() => handlePairToggle(pair.symbol)}
                >
                  <div className="flex items-center space-x-3">
                    <Checkbox 
                      checked={pair.selected}
                      onChange={() => handlePairToggle(pair.symbol)}
                      className="pointer-events-none"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div className="font-semibold text-white">{pair.symbol}</div>
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
                      <div className="text-sm text-slate-400">{pair.name}</div>
                      
                      {pair.category && (
                        <div className="flex items-center space-x-2 mt-2">
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
                        </div>
                      )}
                      
                      {pair.metrics && (
                        <div className="mt-2 space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-500">Liquidity:</span>
                            <span className="text-slate-300">{pair.metrics.liquidity}%</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-500">Volatility:</span>
                            <span className="text-slate-300">{pair.metrics.volatility}%</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-500">24h Change:</span>
                            <span className={`${
                              pair.metrics.change24h >= 0 ? 'text-green-400' : 'text-red-400'
                            }`}>
                              {pair.metrics.change24h >= 0 ? '+' : ''}{pair.metrics.change24h.toFixed(2)}%
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                    {pair.selected && (
                      <CheckCircle className="h-5 w-5 text-purple-400" />
                    )}
                  </div>
                </div>
              ))}
            </div>

            {error && (
              <Alert className="bg-red-500/10 border-red-500/20 mb-6">
                <AlertDescription className="text-red-400">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => navigate('/api-keys')}
                className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                Back to API Keys
              </Button>
              {selectedCount > 0 && (
                <Button 
                  variant="outline" 
                  onClick={analyzeSelectedPairs}
                  disabled={isAnalyzing}
                  className="flex-1 border-blue-600 text-blue-300 hover:bg-blue-700"
                >
                  {isAnalyzing ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <BarChart3 className="h-4 w-4 mr-2" />
                      Analyze Selected
                    </>
                  )}
                </Button>
              )}
              <Button 
                onClick={handleSaveSelection}
                className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                disabled={isSaving || selectedCount === 0}
              >
                {isSaving ? 'Saving...' : `Continue with ${selectedCount} Pairs`}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Pair Analysis Modal */}
        {showAnalysis && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-4xl max-h-[90vh] bg-slate-800/95 border-slate-700 text-white overflow-hidden">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center">
                    <BarChart3 className="h-5 w-5 mr-2 text-blue-400" />
                    Trading Pair Analysis
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAnalysis(false)}
                    className="border-slate-600 text-slate-300 hover:bg-slate-700"
                  >
                    Close
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="overflow-y-auto">
                <div className="space-y-6">
                  {pairAnalysis.map((analysis, index) => (
                    <div key={analysis.symbol} className="border border-slate-600 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-white">{analysis.symbol}</h3>
                        <Badge 
                          variant="outline" 
                          className={`${
                            analysis.score > 80 ? 'border-green-400 text-green-400' :
                            analysis.score > 60 ? 'border-yellow-400 text-yellow-400' :
                            'border-red-400 text-red-400'
                          }`}
                        >
                          Score: {analysis.score}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-white">${analysis.price.toFixed(4)}</div>
                          <div className="text-sm text-slate-400">Current Price</div>
                        </div>
                        <div className="text-center">
                          <div className={`text-2xl font-bold ${
                            analysis.priceChange >= 0 ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {analysis.priceChange >= 0 ? '+' : ''}{analysis.priceChange.toFixed(2)}%
                          </div>
                          <div className="text-sm text-slate-400">24h Change</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-white">${(analysis.volume / 1000000).toFixed(1)}M</div>
                          <div className="text-sm text-slate-400">24h Volume</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-white">{analysis.spread}%</div>
                          <div className="text-sm text-slate-400">Bid-Ask Spread</div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <h4 className="font-semibold text-slate-300 mb-2">Price Range (24h)</h4>
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-400">High: ${analysis.high.toFixed(4)}</span>
                            <span className="text-slate-400">Low: ${analysis.low.toFixed(4)}</span>
                          </div>
                        </div>
                        <div>
                          <h4 className="font-semibold text-slate-300 mb-2">Order Book Depth</h4>
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-400">Bid: ${analysis.bidDepth}</span>
                            <span className="text-slate-400">Ask: ${analysis.askDepth}</span>
                          </div>
                        </div>
                      </div>
                      
                      {analysis.recommendations.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-slate-300 mb-2">Trading Recommendations</h4>
                          <div className="flex flex-wrap gap-2">
                            {analysis.recommendations.map((rec, recIndex) => (
                              <Badge 
                                key={recIndex}
                                variant="outline" 
                                className="border-blue-400 text-blue-400 text-xs"
                              >
                                {rec}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
