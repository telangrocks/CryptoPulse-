import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { TrendingUp, Activity, BarChart3 } from 'lucide-react';

export default function TradeExecution() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-6xl mx-auto">
        <Card className="bg-slate-800/90 border-slate-700 text-white">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-green-500/20 rounded-full">
                <TrendingUp className="h-8 w-8 text-green-400" />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
              Trade Execution
            </CardTitle>
            <p className="text-slate-400 mt-2">
              Execute trades and monitor your positions
            </p>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="text-center py-12">
              <Activity className="h-16 w-16 text-slate-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Trading Interface</h3>
              <p className="text-slate-400 mb-6">
                Configure your bot settings first to start trading
              </p>
              <Button className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700">
                <BarChart3 className="h-4 w-4 mr-2" />
                Start Trading
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}