import { Bell, Settings } from 'lucide-react';
import React from 'react';

import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

export default function AlertsSettings() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-4xl mx-auto">
        <Card className="bg-slate-800/90 border-slate-700 text-white">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-yellow-500/20 rounded-full">
                <Bell className="h-8 w-8 text-yellow-400" />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
              Alerts & Notifications
            </CardTitle>
            <p className="text-slate-400 mt-2">
              Configure your trading alerts and notifications
            </p>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="text-center py-12">
              <Bell className="h-16 w-16 text-slate-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Alert Settings</h3>
              <p className="text-slate-400 mb-6">
                Set up notifications for important trading events
              </p>
              <Button className="bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700">
                <Settings className="h-4 w-4 mr-2" />
                Configure Alerts
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}