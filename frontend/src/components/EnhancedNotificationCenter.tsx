import React, { useState, useEffect } from 'react'
import { Bell, X, CheckCircle, AlertTriangle, Info, XCircle, TrendingUp, Shield, Target, DollarSign } from 'lucide-react'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { ScrollArea } from './ui/scroll-area'
import { useAppState } from '../contexts/AppStateContext'

interface TradeDetails {
  pair: string
  entry: number
  stopLoss: number
  takeProfit: number
  strategy: string
  confidence: number
  riskLevel: 'low' | 'medium' | 'high'
  quantity: number
  side: 'BUY' | 'SELL'
  timestamp: Date
}

interface Notification {
  id: string
  type: 'success' | 'warning' | 'error' | 'info'
  title: string
  message: string
  timestamp: Date
  read: boolean
  tradeDetails?: TradeDetails
  action?: {
    label: string
    onClick: () => void
  }
}

export default function EnhancedNotificationCenter() {
  const { state, markNotificationRead, removeNotification } = useAppState()
  const [isOpen, setIsOpen] = useState(false)
  const [selectedTradeDetails, setSelectedTradeDetails] = useState<TradeDetails | null>(null)

  const notifications = state.notifications
  const unreadCount = notifications.filter(n => !n.read).length

  const markAsRead = (id: string) => {
    markNotificationRead(id)
  }

  const markAllAsRead = () => {
    notifications.forEach(notification => {
      if (!notification.read) {
        markNotificationRead(notification.id)
      }
    })
  }

  const handleRemoveNotification = (id: string) => {
    removeNotification(id)
  }

  const handleViewTradeDetails = (tradeDetails: TradeDetails) => {
    setSelectedTradeDetails(tradeDetails)
  }

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />
      case 'info':
        return <Info className="w-5 h-5 text-blue-500" />
    }
  }

  const getTypeColor = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return 'border-l-green-500 bg-green-50 dark:bg-green-900/10'
      case 'warning':
        return 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-900/10'
      case 'error':
        return 'border-l-red-500 bg-red-50 dark:bg-red-900/10'
      case 'info':
        return 'border-l-blue-500 bg-blue-50 dark:bg-blue-900/10'
    }
  }

  const formatTime = (timestamp: Date) => {
    const now = new Date()
    const diff = now.getTime() - timestamp.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    return `${days}d ago`
  }

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low': return 'text-green-500'
      case 'medium': return 'text-yellow-500'
      case 'high': return 'text-red-500'
      default: return 'text-gray-500'
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-500'
    if (confidence >= 60) return 'text-yellow-500'
    return 'text-red-500'
  }

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className="relative"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <Badge 
            variant="destructive" 
            className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center text-xs"
          >
            {unreadCount}
          </Badge>
        )}
      </Button>

      {isOpen && (
        <Card className="absolute right-0 top-12 w-80 z-50 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium">Notifications</CardTitle>
            <div className="flex items-center space-x-2">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  className="text-xs"
                >
                  Mark all read
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="h-6 w-6"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-80">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <Bell className="h-8 w-8 mb-2" />
                  <p className="text-sm">No notifications</p>
                </div>
              ) : (
                <div className="space-y-0">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 border-b border-border/50 hover:bg-muted/50 transition-colors cursor-pointer ${
                        !notification.read ? 'bg-muted/30' : ''
                      }`}
                      onClick={() => markAsRead(notification.id)}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 mt-0.5">
                          {getIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-foreground">
                              {notification.title}
                            </p>
                            <div className="flex items-center space-x-2">
                              <span className="text-xs text-muted-foreground">
                                {formatTime(notification.timestamp)}
                              </span>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleRemoveNotification(notification.id)
                                }}
                                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {notification.message}
                          </p>
                          {notification.tradeDetails && (
                            <div className="mt-2 p-2 bg-muted/50 rounded-md">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-medium">{notification.tradeDetails.pair}</span>
                                <Badge variant="outline" className="text-xs">
                                  {notification.tradeDetails.side}
                                </Badge>
                              </div>
                              <div className="flex items-center justify-between mt-1 text-xs text-muted-foreground">
                                <span>Entry: ${notification.tradeDetails.entry.toFixed(2)}</span>
                                <span className={getConfidenceColor(notification.tradeDetails.confidence)}>
                                  {notification.tradeDetails.confidence}% confidence
                                </span>
                              </div>
                            </div>
                          )}
                          {notification.action && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="mt-2"
                              onClick={(e) => {
                                e.stopPropagation()
                                if (notification.tradeDetails) {
                                  handleViewTradeDetails(notification.tradeDetails)
                                } else {
                                  notification.action?.onClick()
                                }
                              }}
                            >
                              {notification.action.label}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Trade Details Popup Modal */}
      {selectedTradeDetails && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-96 max-h-[80vh] overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-lg font-semibold">Trade Signal Details</CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedTradeDetails(null)}
                className="h-6 w-6"
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="h-4 w-4 text-blue-500" />
                    <span className="text-sm font-medium">Pair</span>
                  </div>
                  <p className="text-lg font-bold">{selectedTradeDetails.pair}</p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <DollarSign className="h-4 w-4 text-green-500" />
                    <span className="text-sm font-medium">Side</span>
                  </div>
                  <Badge 
                    variant={selectedTradeDetails.side === 'BUY' ? 'default' : 'destructive'}
                    className="text-sm"
                  >
                    {selectedTradeDetails.side}
                  </Badge>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm font-medium">Entry Price</span>
                  <span className="text-lg font-bold">${selectedTradeDetails.entry.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <span className="text-sm font-medium">Stop Loss</span>
                  <span className="text-lg font-bold text-red-600">${selectedTradeDetails.stopLoss.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <span className="text-sm font-medium">Take Profit</span>
                  <span className="text-lg font-bold text-green-600">${selectedTradeDetails.takeProfit.toFixed(2)}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <span className="text-sm font-medium">Strategy</span>
                  <p className="text-sm text-muted-foreground">{selectedTradeDetails.strategy}</p>
                </div>
                <div className="space-y-2">
                  <span className="text-sm font-medium">Quantity</span>
                  <p className="text-sm font-bold">{selectedTradeDetails.quantity}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <span className="text-sm font-medium">Confidence</span>
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 bg-muted rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${selectedTradeDetails.confidence}%` }}
                      />
                    </div>
                    <span className={`text-sm font-bold ${getConfidenceColor(selectedTradeDetails.confidence)}`}>
                      {selectedTradeDetails.confidence}%
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <span className="text-sm font-medium">Risk Level</span>
                  <Badge 
                    variant="outline" 
                    className={`${getRiskColor(selectedTradeDetails.riskLevel)} border-current`}
                  >
                    <Shield className="h-3 w-3 mr-1" />
                    {selectedTradeDetails.riskLevel.toUpperCase()}
                  </Badge>
                </div>
              </div>

              <div className="flex space-x-2 pt-4">
                <Button 
                  className="flex-1" 
                  onClick={() => {
                    // Handle trade execution
                    console.log('Execute trade:', selectedTradeDetails)
                    setSelectedTradeDetails(null)
                  }}
                >
                  <Target className="h-4 w-4 mr-2" />
                  Execute Trade
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setSelectedTradeDetails(null)}
                >
                  Close
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
