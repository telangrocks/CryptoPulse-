import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { 
  TrendingUp, 
  Settings, 
  LogOut, 
  Activity, 
  BarChart3,
  Zap,
  Shield,
  Target,
  DollarSign
} from 'lucide-react';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="bg-slate-800/50 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="flex items-center">
                  <TrendingUp className="h-8 w-8 text-purple-400" />
                  <span className="ml-2 text-2xl font-bold text-white">CryptoPulse</span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                onClick={() => navigate('/settings')}
                variant="outline"
                size="sm"
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
              <Button
                onClick={handleLogout}
                variant="outline"
                size="sm"
                className="border-red-600 text-red-400 hover:bg-red-600/10"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            Trading Dashboard
          </h1>
          <p className="text-slate-400 text-lg">
            Monitor your trading performance and manage your bots
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm font-medium">Total Portfolio</p>
                  <p className="text-2xl font-bold text-white">$0.00</p>
                </div>
                <div className="p-3 bg-green-500/20 rounded-full">
                  <DollarSign className="h-6 w-6 text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm font-medium">Active Bots</p>
                  <p className="text-2xl font-bold text-white">0</p>
                </div>
                <div className="p-3 bg-blue-500/20 rounded-full">
                  <Zap className="h-6 w-6 text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm font-medium">Win Rate</p>
                  <p className="text-2xl font-bold text-white">0%</p>
                </div>
                <div className="p-3 bg-purple-500/20 rounded-full">
                  <Target className="h-6 w-6 text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm font-medium">Total Trades</p>
                  <p className="text-2xl font-bold text-white">0</p>
                </div>
                <div className="p-3 bg-pink-500/20 rounded-full">
                  <Activity className="h-6 w-6 text-pink-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Button 
                  onClick={() => navigate('/api-keys')}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                >
                  <Shield className="h-4 w-4 mr-2" />
                  API Keys
                </Button>
                <Button 
                  onClick={() => navigate('/crypto-pairs')}
                  variant="outline"
                  className="border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  <Target className="h-4 w-4 mr-2" />
                  Pairs
                </Button>
                <Button 
                  onClick={() => navigate('/bot-setup')}
                  variant="outline"
                  className="border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  <Zap className="h-4 w-4 mr-2" />
                  Bot Setup
                </Button>
                <Button 
                  onClick={() => navigate('/trade-execution')}
                  variant="outline"
                  className="border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Trade
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Activity className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">No recent activity</p>
                <p className="text-slate-500 text-sm">Start trading to see your activity here</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}