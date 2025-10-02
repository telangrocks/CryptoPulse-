import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Globe,
  Bot,
  Brain,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useAuthenticatedAPI } from '../hooks/useAuthenticatedAPI';
import { logError } from '../lib/logger';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

export default function WorldClassDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { authenticatedCall } = useAuthenticatedAPI();
  const [billingInfo, setBillingInfo] = useState<{
    subscription_status?: string;
    trial_active?: boolean;
    trial_end?: string;
    amount?: number;
    days_remaining?: number;
  } | null>(null);
  const [stats, setStats] = useState({
    totalTrades: 0,
    winRate: 0,
    totalProfit: 0,
    activeBots: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [recentTrades, setRecentTrades] = useState<any[]>([]);
  const [aiInsights, setAiInsights] = useState<any[]>([]);
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [billingData, statsData, tradesData, insightsData] = await Promise.all([
          authenticatedCall('getBillingStatus').catch(() => ({ success: true, data: {} })),
          authenticatedCall('getTradeStatistics', { period: '30d' }).catch(() => ({ success: true, data: {} })),
          authenticatedCall('getRecentTrades', { limit: 5 }).catch(() => ({ success: true, data: [] })),
          authenticatedCall('getAIInsights').catch(() => ({ success: true, data: [] }))
        ]);
        setBillingInfo(billingData.data);
        if (statsData.success) {
          setStats({
            totalTrades: statsData.data?.totalTrades || 0,
            winRate: statsData.data?.winRate || 0,
            totalProfit: statsData.data?.totalProfit || 0,
            activeBots: 1 // Assuming 1 active bot for now
          });
        }

        if (tradesData.success) {
          setRecentTrades(tradesData.data || []);
        }

        if (insightsData.success) {
          setAiInsights(insightsData.data || []);
        }
      } catch (error) {
        logError('Failed to fetch dashboard data:', 'WorldClassDashboard', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchData();
    }
  }, [user, authenticatedCall]);
  const handleLogout = () => {
    logout();
  };

  const getTrialStatus = () => {
    if (!billingInfo) return null;
    if (billingInfo.trial_active) {
      return {
        status: 'trial',
        message: `${billingInfo.days_remaining} days remaining`,
        color: 'bg-green-500'
      };
    } else if (billingInfo.subscription_status === 'active') {
      return {
        status: 'active',
        message: 'Active Subscription',
        color: 'bg-blue-500'
      };
    } else {
      return {
        status: 'expired',
        message: 'Trial Expired',
        color: 'bg-red-500'
      };
    }
  };

  const trialStatus = getTrialStatus();
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-400 mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold text-white mb-2">Loading Dashboard</h2>
          <p className="text-slate-400">Preparing your trading overview...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto p-6">
        {/* Header */}
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

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-slate-800/90 border-slate-700 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Trades</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-400">{stats.totalTrades}</div>
              <p className="text-xs text-slate-400">+12% from last month</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/90 border-slate-700 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-400">{stats.winRate}%</div>
              <p className="text-xs text-slate-400">+5% from last month</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/90 border-slate-700 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Profit</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-400">${stats.totalProfit}</div>
              <p className="text-xs text-slate-400">+23% from last month</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/90 border-slate-700 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Bots</CardTitle>
              <Bot className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-400">{stats.activeBots}</div>
              <p className="text-xs text-slate-400">Running strategies</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Quick Actions */}
          <Card className="bg-slate-800/90 border-slate-700 text-white">
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full bg-purple-600 hover:bg-purple-700" 
                onClick={() => navigate('/api-keys')}
              >
                Setup API Keys
              </Button>
              <Button className="w-full bg-blue-600 hover:bg-blue-700" 
                onClick={() => navigate('/crypto-pairs')}
              >
                Configure Bot
              </Button>
              <div className="flex space-x-2">
                <Button className="flex-1 bg-orange-600 hover:bg-orange-700" 
                  onClick={() => navigate('/ai-automation')}
                >
                  AI Automation
                </Button>
                <Button className="flex-1 bg-cyan-600 hover:bg-cyan-700" 
                  onClick={() => navigate('/alerts-settings')}
                >
                  Alerts
                </Button>
              </div>
              <div className="space-y-2">
                <Button className="w-full bg-green-600 hover:bg-green-700" 
                  onClick={() => navigate('/backtesting')}
                >
                  Start Trading
                </Button>
                <Button className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700" 
                  onClick={() => navigate('/monitoring')}
                >
                  <Activity className="h-4 w-4 mr-2" />
                  Live Monitoring
                </Button>
                <div className="flex space-x-2">
                  <Button className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700" 
                    onClick={() => navigate('/end-to-end-automation')}
                  >
                    <Bot className="h-4 w-4 mr-2" />
                    E2E Automation
                  </Button>
                  <Button className="flex-1 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700" 
                    onClick={() => navigate('/automation-dashboard')}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Auto Dashboard
                  </Button>
                </div>
                <Button className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700" 
                  onClick={() => navigate('/performance')}
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Performance Analytics
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Recent Trades */}
          <Card className="bg-slate-800/90 border-slate-700 text-white">
            <CardHeader>
              <CardTitle className="text-lg">Recent Trades</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentTrades.length > 0 ? (
                  recentTrades.map((trade, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-slate-700/50 rounded-lg">
                      <div className="flex items-center space-x-2">
                        {trade.action === 'BUY' ? (
                          <ArrowUpRight className="h-4 w-4 text-green-400" />
                        ) : (
                          <ArrowDownRight className="h-4 w-4 text-red-400" />
                        )}
                        <div>
                          <p className="font-medium text-white">{trade.pair}</p>
                          <p className="text-xs text-slate-400">{trade.timestamp}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-white">${trade.entry}</p>
                        <Badge className="bg-green-500/20 text-green-400 text-xs">
                          {trade.status}
                        </Badge>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4">
                    <p className="text-slate-400">No recent trades</p>
                    <p className="text-xs text-slate-500">Start trading to see your activity here</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* AI Insights */}
          <Card className="bg-slate-800/90 border-slate-700 text-white">
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Brain className="h-5 w-5 mr-2 text-purple-400" />
                AI Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {aiInsights.length > 0 ? (
                  aiInsights.map((insight, index) => (
                    <div key={index} className="p-3 bg-slate-700/30 rounded-lg">
                      <div className="flex items-start space-x-2">
                        <div className="p-1 bg-purple-500/20 rounded">
                          <Sparkles className="h-3 w-3 text-purple-400" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-white font-medium">{insight.title}</p>
                          <p className="text-xs text-slate-400 mt-1">{insight.description}</p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4">
                    <Brain className="h-8 w-8 text-slate-500 mx-auto mb-2" />
                    <p className="text-slate-400">No AI insights available</p>
                    <p className="text-xs text-slate-500">AI will provide insights as you trade</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Getting Started Guide */}
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
  );
}
