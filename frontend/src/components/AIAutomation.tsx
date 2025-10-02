import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Brain, Zap } from 'lucide-react';

export default function AIAutomation() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-4xl mx-auto">
        <Card className="bg-slate-800/90 border-slate-700 text-white">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-purple-500/20 rounded-full">
                <Brain className="h-8 w-8 text-purple-400" />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              AI Automation
            </CardTitle>
            <p className="text-slate-400 mt-2">
              Let AI manage your trading automatically
            </p>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="text-center py-12">
              <Brain className="h-16 w-16 text-slate-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">AI Trading Automation</h3>
              <p className="text-slate-400 mb-6">
                Configure AI-powered trading automation
              </p>
              <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
                <Zap className="h-4 w-4 mr-2" />
                Enable AI Automation
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}