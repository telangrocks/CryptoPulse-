import React, { useState, useEffect, useCallback, useMemo, memo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Progress } from './ui/progress'
import { 
  DollarSign, 
  TrendingUp, 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  Info,
  RefreshCw,
  Target,
  BarChart3
} from 'lucide-react'
import { useBalanceMonitoring } from '../lib/balanceMonitoringService'
import { getBalanceBasedTradingService } from '../lib/balanceBasedTrading'

interface BalanceDashboardProps {
  className?: string
}

const BalanceDashboard = memo(function BalanceDashboard({ className }: BalanceDashboardProps) {
  const { isMonitoring, balanceStatus } = useBalanceMonitoring()
  const [tradingStrategies, setTradingStrategies] = useState<any[]>([])
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    // Load trading strategies
    const balanceService = getBalanceBasedTradingService()
    setTradingStrategies(balanceService.getTradingStrategies())
  }, [])

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    try {
      const service = getBalanceBasedTradingService()
      // Trigger balance check
      await service.processBalanceUpdate({
        totalBalance: balanceStatus?.totalBalance || 0,
        availableBalance: balanceStatus?.totalAvailable || 0,
        lockedBalance: balanceStatus?.totalLocked || 0,
        currency: 'USDT',
        exchange: 'combined',
        lastUpdated: new Date()
      })
    } catch (error) {
      // Failed to refresh balance - handled by error logging system
    } finally {
      setIsRefreshing(false)
    }
  }, [balanceStatus])

  const getBalanceLevel = useCallback((balance: number) => {
    if (balance < 100) return { level: 'Low', color: 'text-red-500', bgColor: 'bg-red-50 dark:bg-red-900/20' }
    if (balance < 500) return { level: 'Medium', color: 'text-yellow-500', bgColor: 'bg-yellow-50 dark:bg-yellow-900/20' }
    if (balance < 1000) return { level: 'High', color: 'text-blue-500', bgColor: 'bg-blue-50 dark:bg-blue-900/20' }
    return { level: 'Premium', color: 'text-green-500', bgColor: 'bg-green-50 dark:bg-green-900/20' }
  }, [])

  const getRecommendedStrategy = useCallback((balance: number) => {
    return tradingStrategies.find(strategy => balance >= strategy.minBalance) || tradingStrategies[0]
  }, [tradingStrategies])

  const balanceLevel = useMemo(() => getBalanceLevel(balanceStatus?.totalAvailable || 0), [getBalanceLevel, balanceStatus?.totalAvailable])
  const recommendedStrategy = useMemo(() => getRecommendedStrategy(balanceStatus?.totalAvailable || 0), [getRecommendedStrategy, balanceStatus?.totalAvailable])

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Balance Overview */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-lg font-semibold">Balance Overview</CardTitle>
          <div className="flex items-center space-x-2">
            <Badge variant={isMonitoring ? 'default' : 'secondary'}>
              {isMonitoring ? 'Monitoring' : 'Offline'}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <DollarSign className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">Available Balance</span>
              </div>
              <p className="text-2xl font-bold">${balanceStatus?.totalAvailable?.toFixed(2) || '0.00'}</p>
              <Badge variant="outline" className={balanceLevel.color}>
                {balanceLevel.level} Level
              </Badge>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Shield className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">Locked Balance</span>
              </div>
              <p className="text-2xl font-bold">${balanceStatus?.totalLocked?.toFixed(2) || '0.00'}</p>
              <p className="text-xs text-muted-foreground">In active trades</p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <BarChart3 className="h-4 w-4 text-purple-500" />
                <span className="text-sm font-medium">Total Balance</span>
              </div>
              <p className="text-2xl font-bold">${balanceStatus?.totalBalance?.toFixed(2) || '0.00'}</p>
              <p className="text-xs text-muted-foreground">Across all exchanges</p>
            </div>
          </div>

          {/* Balance Level Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Balance Level Progress</span>
              <span className="text-sm text-muted-foreground">{balanceLevel.level}</span>
            </div>
            <Progress 
              value={Math.min(100, (balanceStatus?.totalAvailable || 0) / 10)} 
              className="h-2"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Low ($0)</span>
              <span>Medium ($500)</span>
              <span>High ($1,000)</span>
              <span>Premium ($5,000+)</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recommended Trading Strategy */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Target className="h-5 w-5 text-blue-500" />
            <span>Recommended Trading Strategy</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className={`p-4 rounded-lg ${balanceLevel.bgColor}`}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">{recommendedStrategy?.name || 'Conservative'}</h3>
              <Badge variant="outline" className={balanceLevel.color}>
                {recommendedStrategy?.riskLevel || 'low'} risk
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              {recommendedStrategy?.description || 'Low-risk trading with small position sizes'}
            </p>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Max Position Size:</span>
                <span className="ml-2">{(recommendedStrategy?.maxPositionSize || 0.05) * 100}%</span>
              </div>
              <div>
                <span className="font-medium">Recommended Pairs:</span>
                <span className="ml-2">{(recommendedStrategy?.recommendedPairs || []).length} pairs</span>
              </div>
            </div>
          </div>

          {/* Trading Pairs */}
          <div className="space-y-2">
            <h4 className="font-medium">Recommended Trading Pairs</h4>
            <div className="flex flex-wrap gap-2">
              {(recommendedStrategy?.recommendedPairs || []).map((pair: string) => (
                <Badge key={pair} variant="secondary" className="text-xs">
                  {pair}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Balance-based Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            <span>Balance Alerts & Recommendations</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {balanceStatus?.totalAvailable < 100 && (
              <div className="flex items-start space-x-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                <div>
                  <h4 className="font-medium text-red-800 dark:text-red-200">Low Balance Alert</h4>
                  <p className="text-sm text-red-600 dark:text-red-300">
                    Your balance is below the recommended minimum. Consider depositing more funds for better trading opportunities.
                  </p>
                </div>
              </div>
            )}

            {balanceStatus?.totalAvailable >= 100 && balanceStatus?.totalAvailable < 500 && (
              <div className="flex items-start space-x-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <Info className="h-5 w-5 text-yellow-500 mt-0.5" />
                <div>
                  <h4 className="font-medium text-yellow-800 dark:text-yellow-200">Conservative Mode</h4>
                  <p className="text-sm text-yellow-600 dark:text-yellow-300">
                    With your current balance, we recommend conservative trading with small position sizes.
                  </p>
                </div>
              </div>
            )}

            {balanceStatus?.totalAvailable >= 1000 && (
              <div className="flex items-start space-x-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <h4 className="font-medium text-green-800 dark:text-green-200">Premium Trading Available</h4>
                  <p className="text-sm text-green-600 dark:text-green-300">
                    Your balance qualifies for premium trading strategies with larger position sizes.
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-start space-x-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <TrendingUp className="h-5 w-5 text-blue-500 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-800 dark:text-blue-200">Strategy Recommendation</h4>
                <p className="text-sm text-blue-600 dark:text-blue-300">
                  Based on your balance, we recommend the "{recommendedStrategy?.name}" strategy for optimal results.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Exchange Status */}
      <Card>
        <CardHeader>
          <CardTitle>Exchange Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Connected Exchanges</span>
              <span className="text-sm text-muted-foreground">{balanceStatus?.exchangeCount || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Last Update</span>
              <span className="text-sm text-muted-foreground">
                {balanceStatus?.lastUpdate 
                  ? new Date(balanceStatus.lastUpdate).toLocaleTimeString()
                  : 'Never'
                }
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Monitoring Status</span>
              <Badge variant={isMonitoring ? 'default' : 'secondary'}>
                {isMonitoring ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
})

export default BalanceDashboard
