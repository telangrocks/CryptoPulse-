import { Bell, Check, CheckCheck, X, AlertTriangle, Info, TrendingUp, TrendingDown } from 'lucide-react';
import React, { useState, useEffect } from 'react';

import { useAppSelector } from '../store/hooks';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

interface Notification {
  id: string;
  type: 'trade' | 'signal' | 'alert' | 'system' | 'performance';
  title: string;
  message: string;
  timestamp: Date;
  isRead: boolean;
  priority: 'low' | 'medium' | 'high' | 'critical';
  data?: any;
}

export default function EnhancedNotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread' | 'trade' | 'signal' | 'alert' | 'system' | 'performance'>('all');
  const [isExpanded, setIsExpanded] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const { notifications: reduxNotifications } = useAppSelector((state) => state.notification);

  useEffect(() => {
    // Convert Redux notifications to local format
    const convertedNotifications = reduxNotifications.map(notif => ({
      id: notif.id,
      type: notif.type as any,
      title: notif.title,
      message: notif.message,
      timestamp: new Date(notif.timestamp),
      isRead: notif.isRead,
      priority: notif.priority as any,
      data: notif.data
    }));

    setNotifications(convertedNotifications);
    setUnreadCount(convertedNotifications.filter(n => !n.isRead).length);
  }, [reduxNotifications]);

  const markAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === notificationId ? { ...notif, isRead: true } : notif
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notif => ({ ...notif, isRead: true }))
    );
    setUnreadCount(0);
  };

  const removeNotification = (notificationId: string) => {
    const wasUnread = notifications.find(n => n.id === notificationId)?.isRead === false;
    setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
    if (wasUnread) {
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  };

  const getNotificationIcon = (type: string, priority: string) => {
    const iconClass = priority === 'critical' ? 'text-red-400' : 
                     priority === 'high' ? 'text-orange-400' :
                     priority === 'medium' ? 'text-yellow-400' : 'text-blue-400';

    switch (type) {
      case 'trade':
        return <TrendingUp className={`h-5 w-5 ${iconClass}`} />;
      case 'signal':
        return <TrendingDown className={`h-5 w-5 ${iconClass}`} />;
      case 'alert':
        return <AlertTriangle className={`h-5 w-5 ${iconClass}`} />;
      case 'system':
        return <Bell className={`h-5 w-5 ${iconClass}`} />;
      case 'performance':
        return <TrendingUp className={`h-5 w-5 ${iconClass}`} />;
      default:
        return <Info className={`h-5 w-5 ${iconClass}`} />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'border-l-red-500 bg-red-500/5';
      case 'high': return 'border-l-orange-500 bg-orange-500/5';
      case 'medium': return 'border-l-yellow-500 bg-yellow-500/5';
      case 'low': return 'border-l-blue-500 bg-blue-500/5';
      default: return 'border-l-slate-500 bg-slate-500/5';
    }
  };

  const filteredNotifications = notifications.filter(notif => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !notif.isRead;
    return notif.type === filter;
  });

  const formatTimeAgo = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <div className="relative">
      {/* Notification Bell */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="relative p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
      >
        <Bell className="h-6 w-6 text-slate-300" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Panel */}
      {isExpanded && (
        <div className="absolute right-0 top-full mt-2 w-96 bg-slate-900 border border-slate-700 rounded-lg shadow-xl z-50 max-h-96 overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-slate-700">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Notifications</h3>
              <div className="flex items-center space-x-2">
                {unreadCount > 0 && (
                  <Button
                    onClick={markAllAsRead}
                    size="sm"
                    variant="ghost"
                    className="text-slate-400 hover:text-white"
                  >
                    <CheckCheck className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  onClick={() => setIsExpanded(false)}
                  size="sm"
                  variant="ghost"
                  className="text-slate-400 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Filters */}
            <div className="flex space-x-1 mt-3">
              {[
                { key: 'all', label: 'All' },
                { key: 'unread', label: 'Unread' },
                { key: 'trade', label: 'Trades' },
                { key: 'signal', label: 'Signals' },
                { key: 'alert', label: 'Alerts' }
              ].map(filterOption => (
                <button
                  key={filterOption.key}
                  onClick={() => setFilter(filterOption.key as any)}
                  className={`px-2 py-1 text-xs rounded ${
                    filter === filterOption.key
                      ? 'bg-purple-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {filterOption.label}
                </button>
              ))}
            </div>
          </div>

          {/* Notifications List */}
          <div className="overflow-y-auto max-h-80">
            {filteredNotifications.length === 0 ? (
              <div className="p-6 text-center">
                <Bell className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                <p className="text-slate-400">No notifications</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-700">
                {filteredNotifications.map(notification => (
                  <div
                    key={notification.id}
                    className={`p-4 border-l-4 transition-colors ${
                      notification.isRead 
                        ? 'bg-slate-800/30 border-l-slate-600' 
                        : getPriorityColor(notification.priority)
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-1">
                        {getNotificationIcon(notification.type, notification.priority)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className={`text-sm font-medium ${
                            notification.isRead ? 'text-slate-300' : 'text-white'
                          }`}>
                            {notification.title}
                          </p>
                          <div className="flex items-center space-x-1">
                            <span className="text-xs text-slate-400">
                              {formatTimeAgo(notification.timestamp)}
                            </span>
                            {!notification.isRead && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            )}
                          </div>
                        </div>
                        
                        <p className={`text-sm mt-1 ${
                          notification.isRead ? 'text-slate-400' : 'text-slate-300'
                        }`}>
                          {notification.message}
                        </p>

                        {notification.data && (
                          <div className="mt-2 text-xs text-slate-400">
                            {notification.type === 'trade' && (
                              <div className="flex space-x-4">
                                <span>Symbol: {notification.data.symbol}</span>
                                <span>Side: {notification.data.side}</span>
                                <span>Amount: {notification.data.amount}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center space-x-1">
                        {!notification.isRead && (
                          <button
                            onClick={() => markAsRead(notification.id)}
                            className="p-1 hover:bg-slate-700 rounded transition-colors"
                          >
                            <Check className="h-4 w-4 text-slate-400" />
                          </button>
                        )}
                        <button
                          onClick={() => removeNotification(notification.id)}
                          className="p-1 hover:bg-slate-700 rounded transition-colors"
                        >
                          <X className="h-4 w-4 text-slate-400" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {filteredNotifications.length > 0 && (
            <div className="p-3 border-t border-slate-700 bg-slate-800/50">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>{filteredNotifications.length} notifications</span>
                <span>{unreadCount} unread</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
