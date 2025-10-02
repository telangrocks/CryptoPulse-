import { BarChart3, Play, Settings } from 'lucide-react';
import React from 'react';

import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

export default function Backtesting() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-6xl mx-auto">
        <Card className="bg-slate-800/90 border-slate-700 text-white">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-blue-500/20 rounded-full">
                <BarChart3 className="h-8 w-8 text-blue-400" />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Backtesting
            </CardTitle>
            <p className="text-slate-400 mt-2">
              Test your trading strategies with historical data
            </p>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="text-center py-12">
              <BarChart3 className="h-16 w-16 text-slate-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Backtesting Interface</h3>
              <p className="text-slate-400 mb-6">
                Configure your strategy and run backtests to see how it would have performed
              </p>
              <div className="flex gap-4 justify-center">
                <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                  <Play className="h-4 w-4 mr-2" />
                  Run Backtest
                </Button>
                <Button className="border-slate-600 text-slate-300 hover:bg-slate-700" variant="outline">
                  <Settings className="h-4 w-4 mr-2" />
                  Configure Strategy
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}