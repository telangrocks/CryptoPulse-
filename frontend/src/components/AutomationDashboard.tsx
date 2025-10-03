import { BarChart3, Bot, Play, Pause, Settings, TrendingUp, AlertTriangle } from 'lucide-react';
import React, { useState, useEffect } from 'react';

import { useAppSelector } from '../store/hooks';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

interface AutomationStatus {
  isRunning: boolean;
  totalBots: number;
  activeBots: number;
  totalTrades: number;
  totalProfit: number;
  winRate: number;
  lastUpdate: Date;
}

export default function AutomationDashboard() {
  const [automationStatus, setAutomationStatus] = useState<AutomationStatus>({
    isRunning: false,
    totalBots: 0,
    activeBots: 0,
    totalTrades: 0,
    totalProfit: 0,
    winRate: 0,
    lastUpdate: new Date()
  });

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { bots } = useAppSelector((state) => state.bot);
  const { trades } = useAppSelector((state) => state.trading);

  useEffect(() => {
    const loadAutomationStatus = async () => {
      try {
        setIsLoading(true);
        
        // Simulate API call to get automation status
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const activeBots = bots.filter(bot => bot.isActive).length;
        const completedTrades = trades.filter(trade => trade.status === 'FILLED');
        const profitableTrades = completedTrades.filter(trade => (trade.profit || 0) > 0);
        
        setAutomationStatus({
          isRunning: activeBots > 0,
          totalBots: bots.length,
          activeBots,
          totalTrades: completedTrades.length,
          totalProfit: completedTrades.reduce((sum, trade) => sum + (trade.profit || 0), 0),
          winRate: completedTrades.length > 0 ? (profitableTrades.length / completedTrades.length) * 100 : 0,
          lastUpdate: new Date()
        });
        
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load automation status');
      } finally {
        setIsLoading(false);
      }
    };

    loadAutomationStatus();
  }, [bots, trades]);

  const handleToggleAutomation = async () => {
    try {
      setIsLoading(true);
      
      // Simulate API call to toggle automation
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setAutomationStatus(prev => ({
        ...prev,
        isRunning: !prev.isRunning,
        lastUpdate: new Date()
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle automation');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-slate-800 rounded w-64 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-32 bg-slate-800 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Automation Dashboard</h1>
            <p className="text-slate-400">
              Monitor and control your AI-powered trading automation
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
              automationStatus.isRunning 
                ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                : 'bg-red-500/20 text-red-400 border border-red-500/30'
            }`}>
              {automationStatus.isRunning ? 'Running' : 'Stopped'}
            </div>
            <Button
              onClick={handleToggleAutomation}
              disabled={isLoading}
              className={`${
                automationStatus.isRunning
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {automationStatus.isRunning ? (
                <>
                  <Pause className="h-4 w-4 mr-2" />
                  Stop Automation
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Start Automation
                </>
              )}
            </Button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              <span className="text-red-400">{error}</span>
            </div>
          </div>
        )}

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-slate-800/90 border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Total Bots</p>
                  <p className="text-2xl font-bold text-white">{automationStatus.totalBots}</p>
                </div>
                <Bot className="h-8 w-8 text-purple-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/90 border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Active Bots</p>
                  <p className="text-2xl font-bold text-white">{automationStatus.activeBots}</p>
                </div>
                <Play className="h-8 w-8 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/90 border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Total Trades</p>
                  <p className="text-2xl font-bold text-white">{automationStatus.totalTrades}</p>
                </div>
                <BarChart3 className="h-8 w-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/90 border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Win Rate</p>
                  <p className="text-2xl font-bold text-white">{automationStatus.winRate.toFixed(1)}%</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Bot Management */}
          <div className="lg:col-span-2">
            <Card className="bg-slate-800/90 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center space-x-2">
                  <Bot className="h-5 w-5" />
                  <span>Bot Management</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {bots.length === 0 ? (
                    <div className="text-center py-8">
                      <Bot className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                      <p className="text-slate-400 mb-4">No bots configured yet</p>
                      <Button className="bg-purple-600 hover:bg-purple-700">
                        <Settings className="h-4 w-4 mr-2" />
                        Create Bot
                      </Button>
                    </div>
                  ) : (
                    bots.map((bot) => (
                      <div key={bot.id} className="p-4 bg-slate-700/50 rounded-lg border border-slate-600">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold text-white">{bot.name}</h3>
                          <div className={`px-2 py-1 rounded text-xs ${
                            bot.isActive 
                              ? 'bg-green-500/20 text-green-400' 
                              : 'bg-slate-500/20 text-slate-400'
                          }`}>
                            {bot.status}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-slate-400">Strategy:</span>
                            <span className="text-white ml-2">{bot.strategy}</span>
                          </div>
                          <div>
                            <span className="text-slate-400">Symbol:</span>
                            <span className="text-white ml-2">{bot.symbol}</span>
                          </div>
                          <div>
                            <span className="text-slate-400">Risk Level:</span>
                            <span className="text-white ml-2">{bot.riskLevel}</span>
                          </div>
                          <div>
                            <span className="text-slate-400">Performance:</span>
                            <span className={`ml-2 ${bot.performance.netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {bot.performance.netProfit.toFixed(2)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Performance Overview */}
          <div>
            <Card className="bg-slate-800/90 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5" />
                  <span>Performance</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <p className="text-slate-400 text-sm">Total Profit/Loss</p>
                    <p className={`text-3xl font-bold ${
                      automationStatus.totalProfit >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      ${automationStatus.totalProfit.toFixed(2)}
                    </p>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Win Rate</span>
                      <span className="text-white">{automationStatus.winRate.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Total Trades</span>
                      <span className="text-white">{automationStatus.totalTrades}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Active Bots</span>
                      <span className="text-white">{automationStatus.activeBots}</span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-600">
                    <p className="text-slate-400 text-xs">
                      Last updated: {automationStatus.lastUpdate.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
