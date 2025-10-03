import { Wallet, TrendingUp, TrendingDown, DollarSign, PieChart, Eye, EyeOff } from 'lucide-react';
import React, { useState, useEffect } from 'react';

import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

interface Balance {
  asset: string;
  free: number;
  locked: number;
  total: number;
  usdValue: number;
  change24h: number;
  changePercent: number;
}

interface PortfolioSummary {
  totalBalance: number;
  totalPnl: number;
  pnlPercent: number;
  dayChange: number;
  dayChangePercent: number;
}

export default function BalanceDashboard() {
  const [balances, setBalances] = useState<Balance[]>([]);
  const [portfolioSummary, setPortfolioSummary] = useState<PortfolioSummary>({
    totalBalance: 0,
    totalPnl: 0,
    pnlPercent: 0,
    dayChange: 0,
    dayChangePercent: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [showBalances, setShowBalances] = useState(true);
  const [selectedExchange, setSelectedExchange] = useState('all');

  useEffect(() => {
    const loadBalances = async () => {
      try {
        setIsLoading(true);
        
        // Simulate API call to get balances
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Mock data - in production, this would come from the API
        const mockBalances: Balance[] = [
          {
            asset: 'BTC',
            free: 0.5,
            locked: 0.1,
            total: 0.6,
            usdValue: 27000,
            change24h: 1500,
            changePercent: 5.88
          },
          {
            asset: 'ETH',
            free: 2.0,
            locked: 0.5,
            total: 2.5,
            usdValue: 4000,
            change24h: -200,
            changePercent: -4.76
          },
          {
            asset: 'USDT',
            free: 5000,
            locked: 1000,
            total: 6000,
            usdValue: 6000,
            change24h: 0,
            changePercent: 0
          },
          {
            asset: 'BNB',
            free: 10,
            locked: 2,
            total: 12,
            usdValue: 3600,
            change24h: 180,
            changePercent: 5.26
          }
        ];

        setBalances(mockBalances);
        
        const totalBalance = mockBalances.reduce((sum, balance) => sum + balance.usdValue, 0);
        const totalPnl = mockBalances.reduce((sum, balance) => sum + balance.change24h, 0);
        const totalPnlPercent = totalBalance > 0 ? (totalPnl / (totalBalance - totalPnl)) * 100 : 0;
        
        setPortfolioSummary({
          totalBalance,
          totalPnl,
          pnlPercent: totalPnlPercent,
          dayChange: totalPnl,
          dayChangePercent: totalPnlPercent
        });
        
      } catch (error) {
        console.error('Failed to load balances:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadBalances();
  }, []);

  const formatCurrency = (amount: number) => {
    if (!showBalances) return '••••••';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const formatNumber = (amount: number, decimals = 4) => {
    if (!showBalances) return '••••••';
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(amount);
  };

  const formatPercent = (percent: number) => {
    const sign = percent >= 0 ? '+' : '';
    return `${sign}${percent.toFixed(2)}%`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-slate-800 rounded w-64 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-32 bg-slate-800 rounded"></div>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="h-96 bg-slate-800 rounded"></div>
              <div className="h-96 bg-slate-800 rounded"></div>
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
            <h1 className="text-3xl font-bold text-white mb-2">Balance Dashboard</h1>
            <p className="text-slate-400">
              Monitor your portfolio balances and performance
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <Button
              onClick={() => setShowBalances(!showBalances)}
              variant="outline"
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              {showBalances ? (
                <>
                  <EyeOff className="h-4 w-4 mr-2" />
                  Hide Balances
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4 mr-2" />
                  Show Balances
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Portfolio Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-slate-800/90 border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Total Balance</p>
                  <p className="text-2xl font-bold text-white">{formatCurrency(portfolioSummary.totalBalance)}</p>
                </div>
                <Wallet className="h-8 w-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/90 border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Total P&L</p>
                  <p className={`text-2xl font-bold ${
                    portfolioSummary.totalPnl >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {formatCurrency(Math.abs(portfolioSummary.totalPnl))}
                  </p>
                </div>
                {portfolioSummary.totalPnl >= 0 ? (
                  <TrendingUp className="h-8 w-8 text-green-400" />
                ) : (
                  <TrendingDown className="h-8 w-8 text-red-400" />
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/90 border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">P&L %</p>
                  <p className={`text-2xl font-bold ${
                    portfolioSummary.pnlPercent >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {formatPercent(portfolioSummary.pnlPercent)}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-purple-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/90 border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">24h Change</p>
                  <p className={`text-2xl font-bold ${
                    portfolioSummary.dayChange >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {formatPercent(portfolioSummary.dayChangePercent)}
                  </p>
                </div>
                <PieChart className="h-8 w-8 text-orange-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Asset Balances */}
          <Card className="bg-slate-800/90 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center space-x-2">
                <Wallet className="h-5 w-5" />
                <span>Asset Balances</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {balances.map((balance) => (
                  <div key={balance.asset} className="p-4 bg-slate-700/50 rounded-lg border border-slate-600">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-slate-600 rounded-full flex items-center justify-center">
                          <span className="text-white font-bold text-sm">{balance.asset}</span>
                        </div>
                        <div>
                          <h3 className="font-semibold text-white">{balance.asset}</h3>
                          <p className="text-slate-400 text-sm">
                            {formatNumber(balance.total, 4)} {balance.asset}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-white font-semibold">
                          {formatCurrency(balance.usdValue)}
                        </p>
                        <p className={`text-sm ${
                          balance.changePercent >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {formatPercent(balance.changePercent)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-slate-400">Free:</span>
                        <span className="text-white ml-2">{formatNumber(balance.free, 4)}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Locked:</span>
                        <span className="text-white ml-2">{formatNumber(balance.locked, 4)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Portfolio Distribution */}
          <Card className="bg-slate-800/90 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center space-x-2">
                <PieChart className="h-5 w-5" />
                <span>Portfolio Distribution</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {balances.map((balance) => {
                  const percentage = portfolioSummary.totalBalance > 0 
                    ? (balance.usdValue / portfolioSummary.totalBalance) * 100 
                    : 0;
                  
                  return (
                    <div key={balance.asset} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-3">
                          <div className="w-4 h-4 bg-blue-400 rounded-full"></div>
                          <span className="text-white font-medium">{balance.asset}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-white font-semibold">
                            {formatCurrency(balance.usdValue)}
                          </span>
                          <span className="text-slate-400 ml-2">
                            ({percentage.toFixed(1)}%)
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-700 rounded-full h-2">
                        <div
                          className="bg-blue-400 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              <div className="mt-6 p-4 bg-slate-700/50 rounded-lg">
                <h4 className="text-white font-semibold mb-2">Quick Actions</h4>
                <div className="grid grid-cols-2 gap-2">
                  <Button className="bg-green-600 hover:bg-green-700 text-sm">
                    Deposit
                  </Button>
                  <Button className="bg-red-600 hover:bg-red-700 text-sm">
                    Withdraw
                  </Button>
                  <Button className="bg-purple-600 hover:bg-purple-700 text-sm">
                    Transfer
                  </Button>
                  <Button className="bg-blue-600 hover:bg-blue-700 text-sm">
                    History
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
