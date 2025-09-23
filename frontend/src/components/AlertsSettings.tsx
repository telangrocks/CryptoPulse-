import { logError, logWarn, logInfo, logDebug } from '../lib/logger'

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { callBack4AppFunction } from '../firebase/config'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Alert, AlertDescription } from './ui/alert'
import { Switch } from './ui/switch'
import { Slider } from './ui/slider'
import { Bell, Volume2, Smartphone, Settings, ArrowLeft, CheckCircle } from 'lucide-react'

interface AlertSettings {
  voiceAlerts: boolean
  pushNotifications: boolean
  emailAlerts: boolean
  signalConfidenceThreshold: number
  tradingHours: {
    enabled: boolean
    start: string
    end: string
  }
  alertTypes: {
    newSignals: boolean
    tradeExecutions: boolean
    stopLossHit: boolean
    takeProfitHit: boolean
    systemWarnings: boolean
  }
}

export default function AlertsSettings() {
  const [settings, setSettings] = useState<AlertSettings>({
    voiceAlerts: true,
    pushNotifications: true,
    emailAlerts: false,
    signalConfidenceThreshold: 75,
    tradingHours: {
      enabled: false,
      start: '09:00',
      end: '17:00'
    },
    alertTypes: {
      newSignals: true,
      tradeExecutions: true,
      stopLossHit: true,
      takeProfitHit: true,
      systemWarnings: true
    }
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    fetchAlertSettings()
  }, [])

  const fetchAlertSettings = async () => {
    try {
      const data = await callBack4AppFunction('getAlertSettings')
      setSettings(data.settings || settings)
    } catch (error) {
      logError('Error fetching alert settings:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const saveSettings = async () => {
    setIsSaving(true)
    try {
      await callBack4AppFunction('saveAlertSettings', { settings })
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (error) {
      logError('Error saving alert settings:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const testVoiceAlert = () => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance('New Buy Signal for BTC/USDT detected with 85% confidence')
      utterance.rate = 0.8
      utterance.pitch = 1
      speechSynthesis.speak(utterance)
    }
  }

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission()
      if (permission === 'granted') {
        new Notification('CryptoPulse Alerts', {
          body: 'Push notifications are now enabled!',
          icon: '/favicon.ico'
        })
      }
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-400 mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold text-white mb-2">Loading Settings</h2>
          <p className="text-slate-400">Configuring your alert preferences...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto p-6">
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate('/dashboard')}
              className="border-slate-600 text-slate-300 hover:bg-slate-700 mr-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Bell className="h-6 w-6 text-purple-400" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Alerts & Automation</h1>
                <p className="text-slate-400">Configure your AI-powered trading alerts</p>
              </div>
            </div>
          </div>

          {saveSuccess && (
            <Alert className="bg-green-500/10 border-green-500/20 mb-6">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription className="text-green-400">
                Alert settings saved successfully!
              </AlertDescription>
            </Alert>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card className="bg-slate-800/90 border-slate-700 text-white">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Volume2 className="h-5 w-5 mr-2 text-blue-400" />
                Voice Alerts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">Enable Voice Alerts</p>
                  <p className="text-sm text-slate-400">Spoken notifications for trading signals</p>
                </div>
                <Switch
                  checked={settings.voiceAlerts}
                  onCheckedChange={(checked) => setSettings({...settings, voiceAlerts: checked})}
                />
              </div>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={testVoiceAlert}
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
                disabled={!settings.voiceAlerts}
              >
                Test Voice Alert
              </Button>

              <div className="bg-slate-700/30 rounded-lg p-3">
                <p className="text-xs text-slate-400 mb-2">Sample Voice Alerts:</p>
                <ul className="text-xs text-slate-300 space-y-1">
                  <li>• "New Buy Signal for BTC/USDT"</li>
                  <li>• "Stop Loss triggered for ETH/USDT"</li>
                  <li>• "Take Profit reached for SOL/USDT"</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/90 border-slate-700 text-white">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Smartphone className="h-5 w-5 mr-2 text-green-400" />
                Push Notifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">Enable Push Notifications</p>
                  <p className="text-sm text-slate-400">Browser notifications for signals</p>
                </div>
                <Switch
                  checked={settings.pushNotifications}
                  onCheckedChange={(checked) => setSettings({...settings, pushNotifications: checked})}
                />
              </div>

              <Button 
                variant="outline" 
                size="sm" 
                onClick={requestNotificationPermission}
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
                disabled={!settings.pushNotifications}
              >
                Enable Browser Notifications
              </Button>

              <div className="bg-slate-700/30 rounded-lg p-3">
                <p className="text-xs text-slate-400 mb-2">Notification Types:</p>
                <ul className="text-xs text-slate-300 space-y-1">
                  <li>• Trading signals with confidence levels</li>
                  <li>• Trade execution confirmations</li>
                  <li>• Risk management alerts</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-slate-800/90 border-slate-700 text-white mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Settings className="h-5 w-5 mr-2 text-purple-400" />
              Alert Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-semibold">Signal Confidence Threshold</p>
                  <p className="text-sm text-slate-400">Minimum confidence level for alerts</p>
                </div>
                <Badge className="bg-blue-500/20 text-blue-400">
                  {settings.signalConfidenceThreshold}%
                </Badge>
              </div>
              <Slider
                value={[settings.signalConfidenceThreshold]}
                onValueChange={(value) => setSettings({...settings, signalConfidenceThreshold: value[0]})}
                max={100}
                min={50}
                step={5}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-slate-400 mt-1">
                <span>50% (More alerts)</span>
                <span>100% (Fewer alerts)</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="font-semibold mb-3">Alert Types</p>
                <div className="space-y-3">
                  {Object.entries(settings.alertTypes).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between">
                      <span className="text-sm capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </span>
                      <Switch
                        checked={value}
                        onCheckedChange={(checked) => setSettings({
                          ...settings,
                          alertTypes: {...settings.alertTypes, [key]: checked}
                        })}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="font-semibold">Trading Hours Filter</p>
                  <Switch
                    checked={settings.tradingHours.enabled}
                    onCheckedChange={(checked) => setSettings({
                      ...settings,
                      tradingHours: {...settings.tradingHours, enabled: checked}
                    })}
                  />
                </div>
                {settings.tradingHours.enabled && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm text-slate-400">Start Time</label>
                      <input
                        type="time"
                        value={settings.tradingHours.start}
                        onChange={(e) => setSettings({
                          ...settings,
                          tradingHours: {...settings.tradingHours, start: e.target.value}
                        })}
                        className="w-full mt-1 p-2 bg-slate-700 border border-slate-600 rounded text-white"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-slate-400">End Time</label>
                      <input
                        type="time"
                        value={settings.tradingHours.end}
                        onChange={(e) => setSettings({
                          ...settings,
                          tradingHours: {...settings.tradingHours, end: e.target.value}
                        })}
                        className="w-full mt-1 p-2 bg-slate-700 border border-slate-600 rounded text-white"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-center space-x-4">
          <Button 
            onClick={() => navigate('/dashboard')}
            variant="outline"
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
          >
            Cancel
          </Button>
          <Button 
            onClick={saveSettings}
            disabled={isSaving}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
          >
            {isSaving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </div>
    </div>
  )
}
