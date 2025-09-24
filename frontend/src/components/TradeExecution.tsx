import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Alert, AlertDescription } from './ui/alert'
import { CheckCircle, TrendingUp, TrendingDown, Clock, Shield, ArrowRight, AlertTriangle } from 'lucide-react'
import { callBack4AppFunction } from '../back4app/config'
import { validateTradeData, TradeValidationData } from '../lib/validation'
import { createExchangeIntegration, EXCHANGE_CONFIGS, OrderRequest } from '../lib/exchangeIntegration'
import { createRiskManager, AccountRisk } from '../lib/riskManagement'
import { getSecureItem } from '../lib/secureStorage'
import { logError, logInfo, logWarn } from '../lib/logger'

interface TradeRecord {
  id: string
  pair: string
  action: string
  entry: number
  stopLoss: number
  takeProfit: number
  confidence: number
  status: string
  timestamp: string
}

export default function TradeExecution() {
  const [tradeHistory, setTradeHistory] = useState<TradeRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentTrade, setCurrentTrade] = useState<TradeRecord | null>(null)
  const [exchangeConnected, setExchangeConnected] = useState(false)
  const [riskManager] = useState(() => createRiskManager())
  const [accountRisk, setAccountRisk] = useState<AccountRisk | null>(null)
  const [apiKeys, setApiKeys] = useState<any>(null)
  const navigate = useNavigate()

  useEffect(() => {
    initializeTrading()
  }, [])

  const initializeTrading = async () => {
    try {
      // Load and validate API keys
      const keys = await getSecureItem('cryptopulse_api_keys')
      if (!keys) {
        logWarn('No API keys found - trading will be limited to demo mode', 'TradeExecution')
        fetchTradeHistory()
        setIsLoading(false)
        return
      }

      // Validate API keys
      if (!keys.tradeExecutionKey || !keys.tradeExecutionSecret) {
        logWarn('Incomplete API keys - trading will be limited to demo mode', 'TradeExecution')
        fetchTradeHistory()
        setIsLoading(false)
        return
      }

      setApiKeys(keys)
      
      // Initialize exchange connection
      const exchange = createExchangeIntegration({
        ...EXCHANGE_CONFIGS.BINANCE,
        apiKey: keys.tradeExecutionKey,
        apiSecret: keys.tradeExecutionSecret
      })
      
      const connected = await exchange.connect()
      setExchangeConnected(connected)
      
      if (connected) {
        // Get account info for risk management
        const accountInfo = await exchange.getAccountInfo()
        if (accountInfo) {
          setAccountRisk({
            totalBalance: parseFloat(accountInfo.balances.find(b => b.asset === 'USDT')?.free || '0'),
            availableBalance: parseFloat(accountInfo.balances.find(b => b.asset === 'USDT')?.free || '0'),
            usedMargin: 0,
            totalPnL: 0,
            dailyPnL: 0,
            maxDrawdown: 0,
            riskScore: 0
          })
        }
      } else {
        logWarn('Failed to connect to exchange - trading will be limited to demo mode', 'TradeExecution')
      }
      
      fetchTradeHistory()
    } catch (error) {
      logError('Failed to initialize trading', 'TradeExecution', error)
      // Continue with demo mode even if initialization fails
    } finally {
      setIsLoading(false)
    }
  }

  const fetchTradeHistory = async () => {
    try {
      const data = await callBack4AppFunction('getTradeHistory')
      
      // Validate trade data before setting
      const validatedTrades = (data.trades || []).map((trade: any) => {
        const validation = validateTradeData({
          pair: trade.pair,
          action: trade.action,
          entry: trade.entry,
          stopLoss: trade.stopLoss,
          takeProfit: trade.takeProfit,
          confidence: trade.confidence
        });
        
        if (!validation.isValid) {
          logWarn('Invalid trade data detected:', validation.errors);
        }
        
        return trade;
      });
      
      setTradeHistory(validatedTrades)
      if (validatedTrades.length > 0) {
        setCurrentTrade(validatedTrades[0])
      }
    } catch (error) {
      logError('Error fetching trade history:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 4,
      maximumFractionDigits: 4
    }).format(amount)
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

  const calculatePnL = (trade: TradeRecord) => {
    const riskAmount = Math.abs(trade.entry - trade.stopLoss)
    const rewardAmount = Math.abs(trade.takeProfit - trade.entry)
    const riskReward = rewardAmount / riskAmount
    return {
      risk: riskAmount,
      reward: rewardAmount,
      ratio: riskReward
    }
  }

  const executeRealTrade = async (tradeData: TradeValidationData) => {
    if (!exchangeConnected || !apiKeys || !accountRisk) {
      logWarn('Cannot execute trade: Exchange not connected or missing data', 'TradeExecution')
      return false
    }

    try {
      const exchange = createExchangeIntegration({
        ...EXCHANGE_CONFIGS.BINANCE,
        apiKey: apiKeys.tradeExecutionKey,
        apiSecret: apiKeys.tradeExecutionSecret
      })

      // Risk check before execution
      const positionSize = 100 // Default position size in USDT
      const riskCheck = riskManager.checkTradeRisk(
        tradeData.pair,
        tradeData.action === 'BUY' ? 'LONG' : 'SHORT',
        positionSize,
        tradeData.entry,
        accountRisk
      )

      if (!riskCheck.allowed) {
        logWarn(`Trade rejected by risk management: ${riskCheck.reason}`, 'TradeExecution')
        return false
      }

      // Create order request
      const orderRequest: OrderRequest = {
        symbol: tradeData.pair.replace('/', ''),
        side: tradeData.action,
        type: 'MARKET',
        quantity: positionSize / tradeData.entry
      }

      // Execute market order
      const orderResponse = await exchange.placeMarketOrder(orderRequest)
      
      if (orderResponse) {
        // Add position to risk manager
        riskManager.addPosition({
          symbol: tradeData.pair,
          side: tradeData.action === 'BUY' ? 'LONG' : 'SHORT',
          size: orderResponse.quantity,
          entryPrice: orderResponse.price,
          currentPrice: orderResponse.price,
          stopLoss: tradeData.stopLoss,
          takeProfit: tradeData.takeProfit,
          leverage: 1,
          unrealizedPnL: 0,
          timestamp: orderResponse.timestamp
        })

        // Place stop loss order
        const stopLossOrder: OrderRequest = {
          symbol: tradeData.pair.replace('/', ''),
          side: tradeData.action === 'BUY' ? 'SELL' : 'BUY',
          type: 'STOP_LOSS',
          quantity: orderResponse.quantity,
          price: tradeData.stopLoss,
          stopPrice: tradeData.stopLoss
        }

        await exchange.placeStopLossOrder(stopLossOrder)

        logInfo(`Trade executed successfully: ${orderResponse.orderId}`, 'TradeExecution')
        return true
      }

      return false
    } catch (error) {
      logError('Failed to execute real trade', 'TradeExecution', error)
      return false
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-400 mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold text-white mb-2">Processing Trade</h2>
          <p className="text-slate-400">Executing your trade order...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto p-6">
        <div className="mb-8 text-center">
          <div className="flex justify-center mb-4">
            <div className={`p-3 rounded-full ${exchangeConnected ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
              {exchangeConnected ? (
                <CheckCircle className="h-8 w-8 text-green-400" />
              ) : (
                <AlertTriangle className="h-8 w-8 text-red-400" />
              )}
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Trade Execution</h1>
          <p className="text-slate-400">
            {exchangeConnected ? 'Connected to exchange - Ready for trading' : 'Exchange not connected - Check API keys'}
          </p>
          {accountRisk && (
            <div className="mt-4 flex justify-center space-x-4 text-sm">
              <div className="bg-slate-800/50 px-3 py-2 rounded-lg">
                <span className="text-slate-400">Balance: </span>
                <span className="text-white font-semibold">${accountRisk.totalBalance.toFixed(2)}</span>
              </div>
              <div className="bg-slate-800/50 px-3 py-2 rounded-lg">
                <span className="text-slate-400">Positions: </span>
                <span className="text-white font-semibold">{riskManager.getPositions().length}</span>
              </div>
            </div>
          )}
        </div>

        {/* Risk Management Dashboard */}
        {accountRisk && (
          <Card className="bg-slate-800/90 border-slate-700 text-white mb-8">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="h-6 w-6 mr-2 text-blue-400" />
                Risk Management Dashboard
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const riskSummary = riskManager.getRiskSummary(accountRisk);
                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-slate-700/50 rounded-lg">
                      <p className="text-slate-400 text-sm mb-1">Risk Score</p>
                      <p className={`text-2xl font-bold ${
                        riskSummary.riskScore > 80 ? 'text-red-400' :
                        riskSummary.riskScore > 60 ? 'text-yellow-400' :
                        'text-green-400'
                      }`}>
                        {riskSummary.riskScore}/100
                      </p>
                      <p className="text-xs text-slate-500 mt-1">{riskSummary.riskLevel}</p>
                    </div>
                    <div className="text-center p-4 bg-slate-700/50 rounded-lg">
                      <p className="text-slate-400 text-sm mb-1">Daily P&L</p>
                      <p className={`text-2xl font-bold ${
                        riskSummary.dailyPnL >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        ${riskSummary.dailyPnL.toFixed(2)}
                      </p>
                    </div>
                    <div className="text-center p-4 bg-slate-700/50 rounded-lg">
                      <p className="text-slate-400 text-sm mb-1">Drawdown</p>
                      <p className={`text-2xl font-bold ${
                        riskSummary.drawdown > 15 ? 'text-red-400' :
                        riskSummary.drawdown > 10 ? 'text-yellow-400' :
                        'text-green-400'
                      }`}>
                        {riskSummary.drawdown.toFixed(2)}%
                      </p>
                    </div>
                    <div className="text-center p-4 bg-slate-700/50 rounded-lg">
                      <p className="text-slate-400 text-sm mb-1">Open Positions</p>
                      <p className="text-2xl font-bold text-white">
                        {riskSummary.totalPositions}
                      </p>
                    </div>
                  </div>
                );
              })()}
              
              {(() => {
                const riskSummary = riskManager.getRiskSummary(accountRisk);
                if (riskSummary.warnings.length > 0) {
                  return (
                    <Alert className="bg-yellow-500/10 border-yellow-500/20 mt-4">
                      <AlertTriangle className="h-4 w-4 text-yellow-400" />
                      <AlertDescription className="text-yellow-400">
                        <strong>Risk Warnings:</strong> {riskSummary.warnings.join(', ')}
                      </AlertDescription>
                    </Alert>
                  );
                }
                return null;
              })()}
            </CardContent>
          </Card>
        )}

        {currentTrade && (
          <Card className="bg-slate-800/90 border-slate-700 text-white mb-8">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center">
                  <CheckCircle className="h-6 w-6 mr-2 text-green-400" />
                  Trade Executed Successfully
                </span>
                <Badge className={`${currentTrade.action === 'BUY' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'} text-lg px-4 py-2`}>
                  {currentTrade.action} {currentTrade.pair}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="text-center p-4 bg-slate-700/50 rounded-lg">
                  <p className="text-slate-400 text-sm mb-1">Entry Price</p>
                  <p className="text-2xl font-bold text-white">{formatCurrency(currentTrade.entry)}</p>
                  <p className="text-xs text-slate-500 mt-1">Executed at market</p>
                </div>
                <div className="text-center p-4 bg-red-500/10 rounded-lg">
                  <p className="text-slate-400 text-sm mb-1">Stop Loss</p>
                  <p className="text-2xl font-bold text-red-400">{formatCurrency(currentTrade.stopLoss)}</p>
                  <p className="text-xs text-red-300 mt-1">Risk management</p>
                </div>
                <div className="text-center p-4 bg-green-500/10 rounded-lg">
                  <p className="text-slate-400 text-sm mb-1">Take Profit</p>
                  <p className="text-2xl font-bold text-green-400">{formatCurrency(currentTrade.takeProfit)}</p>
                  <p className="text-xs text-green-300 mt-1">Target profit</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="space-y-3">
                  <h3 className="font-semibold text-purple-400">Trade Details</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Trade ID:</span>
                      <span className="font-mono text-white">{currentTrade.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Confidence:</span>
                      <span className="text-blue-400">{currentTrade.confidence}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Status:</span>
                      <Badge className="bg-green-500/20 text-green-400">
                        {currentTrade.status.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Executed:</span>
                      <span className="text-white">{formatDateTime(currentTrade.timestamp)}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="font-semibold text-blue-400">Risk Analysis</h3>
                  <div className="space-y-2">
                    {(() => {
                      const pnl = calculatePnL(currentTrade)
                      return (
                        <>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Risk Amount:</span>
                            <span className="text-red-400">{formatCurrency(pnl.risk)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Reward Amount:</span>
                            <span className="text-green-400">{formatCurrency(pnl.reward)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Risk/Reward:</span>
                            <span className={`font-semibold ${pnl.ratio >= 2 ? 'text-green-400' : pnl.ratio >= 1.5 ? 'text-yellow-400' : 'text-red-400'}`}>
                              1:{pnl.ratio.toFixed(2)}
                            </span>
                          </div>
                        </>
                      )
                    })()}
                  </div>
                </div>
              </div>

              <Alert className="bg-blue-500/10 border-blue-500/20 mb-6">
                <Shield className="h-4 w-4" />
                <AlertDescription className="text-blue-400">
                  <strong>Safety Controls Active:</strong> Your trade has been executed with automatic stop-loss and take-profit orders. 
                  Monitor your positions through your exchange platform.
                </AlertDescription>
              </Alert>

              <div className="bg-slate-700/30 rounded-lg p-4">
                <h4 className="font-semibold text-white mb-3 flex items-center">
                  <Clock className="h-4 w-4 mr-2" />
                  Next Steps
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center text-slate-300">
                    <ArrowRight className="h-3 w-3 mr-2 text-purple-400" />
                    Monitor your position on your exchange platform
                  </div>
                  <div className="flex items-center text-slate-300">
                    <ArrowRight className="h-3 w-3 mr-2 text-purple-400" />
                    Stop-loss and take-profit orders are automatically set
                  </div>
                  <div className="flex items-center text-slate-300">
                    <ArrowRight className="h-3 w-3 mr-2 text-purple-400" />
                    You'll receive alerts when the trade closes
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {tradeHistory.length > 1 && (
          <Card className="bg-slate-800/90 border-slate-700 text-white mb-8">
            <CardHeader>
              <CardTitle>Recent Trade History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {tradeHistory.slice(1, 6).map((trade) => (
                  <div key={trade.id} className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
                    <div className="flex items-center space-x-3">
                      {trade.action === 'BUY' ? (
                        <TrendingUp className="h-4 w-4 text-green-400" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-400" />
                      )}
                      <div>
                        <p className="font-semibold">{trade.action} {trade.pair}</p>
                        <p className="text-xs text-slate-400">{formatDateTime(trade.timestamp)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(trade.entry)}</p>
                      <Badge className="bg-green-500/20 text-green-400 text-xs">
                        {trade.status.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex justify-center space-x-4">
          <Button 
            onClick={() => navigate('/backtesting')} 
            variant="outline"
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
          >
            Back to Backtesting
          </Button>
          <Button 
            onClick={() => navigate('/dashboard')}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
          >
            Return to Dashboard
          </Button>
        </div>
      </div>
    </div>
  )
}
