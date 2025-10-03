import {
  BarChart3,
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Target,
  DollarSign,
  Activity,
  Shield,
  Zap,
  Clock,
  Calendar,
  Download,
  RefreshCw,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { useNavigate } from 'react-router-dom';

import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

interface PerformanceMetrics {
  totalReturn: number;
  winRate: number;
  sharpeRatio: number;
  maxDrawdown: number;
  profitFactor: number;
  totalTrades: number;
  avgTradeReturn: number;
  bestTrade: number;
  worstTrade: number;
  avgHoldingPeriod: number;
}
interface TradeHistory {
  id: string;
  pair: string;
  action: 'BUY' | 'SELL';
  entry: number;
  exit: number;
  quantity: number;
  pnl: number;
  pnlPercent: number;
  timestamp: string;
  duration: string;
}
interface ChartData {
  date: string;
  portfolioValue: number;
  cumulativeReturn: number;
}
const PerformanceAnalytics = memo(function PerformanceAnalytics() {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    totalReturn: 0,
    winRate: 0,
    sharpeRatio: 0,
    maxDrawdown: 0,
    profitFactor: 0,
    totalTrades: 0,
    avgTradeReturn: 0,
    bestTrade: 0,
    worstTrade: 0,
    avgHoldingPeriod: 0,
  });
  const [tradeHistory, setTradeHistory] = useState<TradeHistory[]>([]);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('30d');
  const [showDetails, setShowDetails] = useState(false);
  const navigate = useNavigate();
  const periods = useMemo(() => [
    { value: '7d', label: '7 Days' },
    { value: '30d', label: '30 Days' },
    { value: '90d', label: '90 Days' },
    { value: '1y', label: '1 Year' },
  ], []);
  useEffect(() => {
    fetchPerformanceData();
  }, [selectedPeriod]);
  const fetchPerformanceData = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const [metricsData, tradesData, chartDataResponse] = await Promise.all([
        fetch('/api/performance/metrics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ period: selectedPeriod }),
        }),
        fetch('/api/performance/trades', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ period: selectedPeriod, limit: 50 }),
        }),
        fetch('/api/performance/chart', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ period: selectedPeriod }),
        }),
      ]);
      const [metricsResult, tradesResult, chartResult] = await Promise.all([
        metricsData.json(),
        tradesData.json(),
        chartDataResponse.json(),
      ]);
      if (metricsResult.success) {
        setMetrics(metricsResult.metrics || metrics);
      }
      if (tradesResult.success) {
        setTradeHistory(tradesResult.trades || []);
      }
      if (chartResult.success) {
        setChartData(chartResult.data || []);
      }
    } catch (error) {
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedPeriod, metrics]);
  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }, []);
  const formatPercentage = useCallback((value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  }, []);
  const getMetricColor = useCallback((value: number, type: 'return' | 'ratio' | 'drawdown') => {
    if (type === 'return') {
      return value >= 0 ? 'text-green-400' : 'text-red-400';
    } else if (type === 'ratio') {
      return value >= 1 ? 'text-green-400' : value >= 0.5 ? 'text-yellow-400' : 'text-red-400';
    } else if (type === 'drawdown') {
      return value <= 5 ? 'text-green-400' : value <= 15 ? 'text-yellow-400' : 'text-red-400';
    }
    return 'text-white';
  }, []);
  const exportData = useCallback(() => {
    const data = {
      metrics,
      tradeHistory,
      chartData,
      period: selectedPeriod,
      exportDate: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cryptopulse-performance-${selectedPeriod}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [metrics, tradeHistory, chartData, selectedPeriod]);
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Loading Analytics</h2>
          <p className="text-slate-400">Calculating performance metrics...</p>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto p-6">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <Button
                className="border-slate-600 text-slate-300 hover:bg-slate-700 mr-4"
                onClick={() => navigate('/dashboard')}
                size="sm"
                variant="outline"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <BarChart3 className="h-6 w-6 text-purple-400" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white">Performance Analytics</h1>
                  <p className="text-slate-400">Detailed trading performance analysis</p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <select
                className="px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white"
                onChange={(e) => setSelectedPeriod(e.target.value)}
                value={selectedPeriod}
              >
                {periods.map((period) => (
                  <option key={period.value} value={period.value}>
                    {period.label}
                  </option>
                ))}
              </select>
              <Button
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
                disabled={isRefreshing}
                onClick={fetchPerformanceData}
                size="sm"
                variant="outline"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
                onClick={() => setShowDetails(!showDetails)}
                size="sm"
                variant="outline"
              >
                {showDetails ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                {showDetails ? 'Hide Details' : 'Show Details'}
              </Button>
              <Button
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
                onClick={exportData}
                size="sm"
                variant="outline"
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </div>
        {/* Key Performance Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-slate-800/90 border-slate-700 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Return</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${getMetricColor(metrics.totalReturn, 'return')}`}>
                {formatPercentage(metrics.totalReturn)}
              </div>
              <p className="text-xs text-slate-400">Portfolio growth</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/90 border-slate-700 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${getMetricColor(metrics.winRate, 'ratio')}`}>
                {metrics.winRate.toFixed(1)}%
              </div>
              <p className="text-xs text-slate-400">Successful trades</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/90 border-slate-700 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sharpe Ratio</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${getMetricColor(metrics.sharpeRatio, 'ratio')}`}>
                {metrics.sharpeRatio.toFixed(2)}
              </div>
              <p className="text-xs text-slate-400">Risk-adjusted return</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/90 border-slate-700 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Max Drawdown</CardTitle>
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${getMetricColor(metrics.maxDrawdown, 'drawdown')}`}>
                -{metrics.maxDrawdown.toFixed(1)}%
              </div>
              <p className="text-xs text-slate-400">Largest loss</p>
            </CardContent>
          </Card>
        </div>
        {/* Additional Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card className="bg-slate-800/90 border-slate-700 text-white">
            <CardHeader>
              <CardTitle className="flex items-center">
                <DollarSign className="h-5 w-5 mr-2 text-green-400" />
                Trading Statistics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-slate-400">Total Trades:</span>
                <span className="text-white font-semibold">{metrics.totalTrades}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Avg Trade Return:</span>
                <span className={`font-semibold ${getMetricColor(metrics.avgTradeReturn, 'return')}`}>
                  {formatPercentage(metrics.avgTradeReturn)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Best Trade:</span>
                <span className="text-green-400 font-semibold">
                  {formatPercentage(metrics.bestTrade)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Worst Trade:</span>
                <span className="text-red-400 font-semibold">
                  {formatPercentage(metrics.worstTrade)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Avg Holding Period:</span>
                <span className="text-white font-semibold">{metrics.avgHoldingPeriod}h</span>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/90 border-slate-700 text-white">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Activity className="h-5 w-5 mr-2 text-blue-400" />
                Risk Metrics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-slate-400">Profit Factor:</span>
                <span className={`font-semibold ${getMetricColor(metrics.profitFactor, 'ratio')}`}>
                  {metrics.profitFactor.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Risk Level:</span>
                <Badge
                  className={
                    metrics.maxDrawdown <= 5 ? 'bg-green-500/20 text-green-400' :
                      metrics.maxDrawdown <= 15 ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-red-500/20 text-red-400'
                  }
                >
                  {metrics.maxDrawdown <= 5 ? 'Low' : metrics.maxDrawdown <= 15 ? 'Medium' : 'High'}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Consistency:</span>
                <Badge
                  className={
                    metrics.winRate >= 70 ? 'bg-green-500/20 text-green-400' :
                      metrics.winRate >= 50 ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-red-500/20 text-red-400'
                  }
                >
                  {metrics.winRate >= 70 ? 'High' : metrics.winRate >= 50 ? 'Medium' : 'Low'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
        {/* Trade History */}
        <Card className="bg-slate-800/90 border-slate-700 text-white">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="h-5 w-5 mr-2 text-purple-400" />
              Recent Trade History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {tradeHistory.length > 0 ? (
              <div className="space-y-3">
                {tradeHistory.map((trade) => (
                  <div className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg" key={trade.id}>
                    <div className="flex items-center space-x-3">
                      {trade.action === 'BUY' ? (
                        <TrendingUp className="h-4 w-4 text-green-400" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-400" />
                      )}
                      <div>
                        <p className="font-semibold text-white">{trade.action} {trade.pair}</p>
                        <p className="text-xs text-slate-400">
                          {new Date(trade.timestamp).toLocaleString()} • {trade.duration}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-white">
                        {formatCurrency(trade.entry)} → {formatCurrency(trade.exit)}
                      </p>
                      <p
                        className={`text-sm font-semibold ${
                          trade.pnl >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}
  >
                        {formatCurrency(trade.pnl)} ({formatPercentage(trade.pnlPercent)})
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <BarChart3 className="h-12 w-12 text-slate-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-300 mb-2">No Trade History</h3>
                <p className="text-slate-400">Start trading to see your performance analytics here</p>
              </div>
            )}
          </CardContent>
        </Card>
        {/* Performance Insights */}
        {metrics.totalTrades > 0 && (
          <Alert className="bg-blue-500/10 border-blue-500/20 mt-6">
            <Zap className="h-4 w-4" />
            <AlertDescription className="text-blue-400">
              <strong>Performance Insight:</strong> Your trading strategy shows a{' '}
              {metrics.winRate >= 60 ? 'strong' : metrics.winRate >= 40 ? 'moderate' : 'weak'}{' '}
              win rate of {metrics.winRate.toFixed(1)}% with a{' '}
              {metrics.sharpeRatio >= 1 ? 'good' : 'poor'} risk-adjusted return.
              {metrics.maxDrawdown > 20 && ' Consider reducing position sizes to manage risk better.'}
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
});
export default PerformanceAnalytics;
