/**
 * Risk Monitor Component - Production-Ready Frontend Risk Management
 * 
 * This component provides real-time risk monitoring and management
 * for the frontend, complementing the backend risk management system.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Alert, AlertDescription } from './ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ScrollArea } from './ui/scroll-area';
import { 
  AlertTriangle, 
  Shield, 
  TrendingDown, 
  Activity, 
  Clock, 
  DollarSign,
  Users,
  Settings,
  RefreshCw,
  Eye,
  EyeOff,
  Zap,
  AlertCircle,
  CheckCircle,
  XCircle,
  Info
} from 'lucide-react';
import { cn } from '../lib/utils';

interface RiskMetrics {
  portfolioValue: number;
  totalExposure: number;
  currentDrawdown: number;
  dailyLoss: number;
  activeTrades: number;
  dailyTrades: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  circuitBreakerStatus: 'OPEN' | 'CLOSED';
  resourceStatus: {
    memory: number;
    cpu: number;
    connections: number;
    requestsPerMinute: number;
    status: 'NORMAL' | 'WARNING' | 'CRITICAL';
  };
  threatLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  alerts: Array<{
    id: string;
    level: string;
    message: string;
    timestamp: number;
    data?: any;
  }>;
  limits: {
    maxConcurrentTrades: number;
    maxDailyTrades: number;
    maxDrawdown: number;
    maxDailyLoss: number;
    maxRiskPerTrade: number;
  };
}

interface RiskMonitorProps {
  userId?: string;
  isVisible?: boolean;
  onToggleVisibility?: () => void;
  className?: string;
}

const RiskMonitor: React.FC<RiskMonitorProps> = ({
  userId,
  isVisible = true,
  onToggleVisibility,
  className,
}) => {
  const [riskMetrics, setRiskMetrics] = useState<RiskMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedTab, setSelectedTab] = useState('overview');

  // Fetch risk metrics
  const fetchRiskMetrics = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Mock API call - replace with actual API endpoint
      const response = await fetch(`/api/risk/summary${userId ? `?userId=${userId}` : ''}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch risk metrics');
      }

      const data = await response.json();
      setRiskMetrics(data);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch risk metrics');
      
      // Use mock data for demonstration
      setRiskMetrics({
        portfolioValue: 10000,
        totalExposure: 2500,
        currentDrawdown: 0.02,
        dailyLoss: 0.005,
        activeTrades: 3,
        dailyTrades: 8,
        riskLevel: 'MEDIUM',
        circuitBreakerStatus: 'CLOSED',
        resourceStatus: {
          memory: 0.65,
          cpu: 0.45,
          connections: 25,
          requestsPerMinute: 120,
          status: 'NORMAL',
        },
        threatLevel: 'LOW',
        alerts: [
          {
            id: 'risk_1',
            level: 'WARNING',
            message: 'High exposure detected in BTC/USDT position',
            timestamp: Date.now() - 300000,
          },
          {
            id: 'risk_2',
            level: 'INFO',
            message: 'Daily trade limit approaching',
            timestamp: Date.now() - 600000,
          },
        ],
        limits: {
          maxConcurrentTrades: 5,
          maxDailyTrades: 50,
          maxDrawdown: 0.1,
          maxDailyLoss: 0.05,
          maxRiskPerTrade: 0.02,
        },
      });
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefresh) return;

    fetchRiskMetrics();
    const interval = setInterval(fetchRiskMetrics, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [fetchRiskMetrics, autoRefresh]);

  // Get risk level color
  const getRiskLevelColor = useCallback((level: string) => {
    switch (level) {
      case 'LOW':
        return 'text-green-600 bg-green-100';
      case 'MEDIUM':
        return 'text-yellow-600 bg-yellow-100';
      case 'HIGH':
        return 'text-orange-600 bg-orange-100';
      case 'CRITICAL':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  }, []);

  // Get risk level icon
  const getRiskLevelIcon = useCallback((level: string) => {
    switch (level) {
      case 'LOW':
        return <CheckCircle className="h-4 w-4" />;
      case 'MEDIUM':
        return <Info className="h-4 w-4" />;
      case 'HIGH':
        return <AlertTriangle className="h-4 w-4" />;
      case 'CRITICAL':
        return <XCircle className="h-4 w-4" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  }, []);

  // Calculate risk progress
  const riskProgress = useMemo(() => {
    if (!riskMetrics) return 0;
    
    const { currentDrawdown, maxDrawdown } = riskMetrics;
    return Math.min((currentDrawdown / maxDrawdown) * 100, 100);
  }, [riskMetrics]);

  // Calculate daily loss progress
  const dailyLossProgress = useMemo(() => {
    if (!riskMetrics) return 0;
    
    const { dailyLoss, maxDailyLoss } = riskMetrics;
    return Math.min((dailyLoss / maxDailyLoss) * 100, 100);
  }, [riskMetrics]);

  // Calculate exposure progress
  const exposureProgress = useMemo(() => {
    if (!riskMetrics) return 0;
    
    const { totalExposure, portfolioValue } = riskMetrics;
    return Math.min((totalExposure / portfolioValue) * 100, 100);
  }, [riskMetrics]);

  if (!isVisible) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={onToggleVisibility}
        className="fixed bottom-4 right-4 z-50"
      >
        <Eye className="h-4 w-4 mr-2" />
        Show Risk Monitor
      </Button>
    );
  }

  return (
    <Card className={cn("w-full max-w-4xl mx-auto", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Risk Monitor
          {riskMetrics && (
            <Badge className={cn("ml-2", getRiskLevelColor(riskMetrics.riskLevel))}>
              {getRiskLevelIcon(riskMetrics.riskLevel)}
              <span className="ml-1">{riskMetrics.riskLevel}</span>
            </Badge>
          )}
        </CardTitle>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={autoRefresh ? 'text-green-600' : 'text-gray-400'}
          >
            <Activity className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchRiskMetrics}
            disabled={isLoading}
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </Button>
          {onToggleVisibility && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleVisibility}
            >
              <EyeOff className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            <span>Loading risk metrics...</span>
          </div>
        )}

        {error && (
          <Alert className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {riskMetrics && (
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="limits">Limits</TabsTrigger>
              <TabsTrigger value="resources">Resources</TabsTrigger>
              <TabsTrigger value="alerts">Alerts</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Portfolio Value</p>
                        <p className="text-2xl font-bold">${riskMetrics.portfolioValue.toLocaleString()}</p>
                      </div>
                      <DollarSign className="h-8 w-8 text-blue-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total Exposure</p>
                        <p className="text-2xl font-bold">${riskMetrics.totalExposure.toLocaleString()}</p>
                        <p className="text-xs text-gray-500">
                          {((riskMetrics.totalExposure / riskMetrics.portfolioValue) * 100).toFixed(1)}%
                        </p>
                      </div>
                      <TrendingDown className="h-8 w-8 text-orange-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Active Trades</p>
                        <p className="text-2xl font-bold">{riskMetrics.activeTrades}</p>
                        <p className="text-xs text-gray-500">
                          {riskMetrics.dailyTrades} today
                        </p>
                      </div>
                      <Users className="h-8 w-8 text-green-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Circuit Breaker</p>
                        <p className="text-2xl font-bold">
                          {riskMetrics.circuitBreakerStatus}
                        </p>
                        <p className="text-xs text-gray-500">
                          {riskMetrics.circuitBreakerStatus === 'OPEN' ? 'Trading suspended' : 'Active'}
                        </p>
                      </div>
                      <Zap className={cn(
                        "h-8 w-8",
                        riskMetrics.circuitBreakerStatus === 'OPEN' ? "text-red-600" : "text-green-600"
                      )} />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Current Drawdown</span>
                    <span className="text-sm text-gray-600">
                      {(riskMetrics.currentDrawdown * 100).toFixed(2)}%
                    </span>
                  </div>
                  <Progress 
                    value={riskProgress} 
                    className={cn(
                      "h-2",
                      riskProgress > 80 ? "bg-red-100" : riskProgress > 60 ? "bg-orange-100" : "bg-green-100"
                    )}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Daily Loss</span>
                    <span className="text-sm text-gray-600">
                      {(riskMetrics.dailyLoss * 100).toFixed(2)}%
                    </span>
                  </div>
                  <Progress 
                    value={dailyLossProgress} 
                    className={cn(
                      "h-2",
                      dailyLossProgress > 80 ? "bg-red-100" : dailyLossProgress > 60 ? "bg-orange-100" : "bg-green-100"
                    )}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Portfolio Exposure</span>
                    <span className="text-sm text-gray-600">
                      {(exposureProgress).toFixed(1)}%
                    </span>
                  </div>
                  <Progress 
                    value={exposureProgress} 
                    className={cn(
                      "h-2",
                      exposureProgress > 80 ? "bg-red-100" : exposureProgress > 60 ? "bg-orange-100" : "bg-green-100"
                    )}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="limits" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Trading Limits</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Max Concurrent Trades</span>
                      <span className="text-sm font-medium">
                        {riskMetrics.activeTrades}/{riskMetrics.limits.maxConcurrentTrades}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Daily Trade Limit</span>
                      <span className="text-sm font-medium">
                        {riskMetrics.dailyTrades}/{riskMetrics.limits.maxDailyTrades}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Risk Limits</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Max Drawdown</span>
                      <span className="text-sm font-medium">
                        {(riskMetrics.currentDrawdown * 100).toFixed(1)}% / {(riskMetrics.limits.maxDrawdown * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Max Daily Loss</span>
                      <span className="text-sm font-medium">
                        {(riskMetrics.dailyLoss * 100).toFixed(1)}% / {(riskMetrics.limits.maxDailyLoss * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Max Risk Per Trade</span>
                      <span className="text-sm font-medium">
                        {(riskMetrics.limits.maxRiskPerTrade * 100).toFixed(1)}%
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="resources" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">System Resources</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm">Memory Usage</span>
                        <span className="text-sm font-medium">
                          {(riskMetrics.resourceStatus.memory * 100).toFixed(1)}%
                        </span>
                      </div>
                      <Progress value={riskMetrics.resourceStatus.memory * 100} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm">CPU Usage</span>
                        <span className="text-sm font-medium">
                          {(riskMetrics.resourceStatus.cpu * 100).toFixed(1)}%
                        </span>
                      </div>
                      <Progress value={riskMetrics.resourceStatus.cpu * 100} className="h-2" />
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Active Connections</span>
                      <span className="text-sm font-medium">
                        {riskMetrics.resourceStatus.connections}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Requests/Minute</span>
                      <span className="text-sm font-medium">
                        {riskMetrics.resourceStatus.requestsPerMinute}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Threat Level</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-center py-8">
                      <Badge className={cn("text-lg px-4 py-2", getRiskLevelColor(riskMetrics.threatLevel))}>
                        {getRiskLevelIcon(riskMetrics.threatLevel)}
                        <span className="ml-2">{riskMetrics.threatLevel}</span>
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="alerts" className="space-y-4">
              <ScrollArea className="h-64">
                <div className="space-y-2">
                  {riskMetrics.alerts.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-600" />
                      <p>No active alerts</p>
                    </div>
                  ) : (
                    riskMetrics.alerts.map((alert) => (
                      <Alert key={alert.id} className={cn(
                        "border-l-4",
                        alert.level === 'CRITICAL' && "border-red-500",
                        alert.level === 'HIGH' && "border-orange-500",
                        alert.level === 'WARNING' && "border-yellow-500",
                        alert.level === 'INFO' && "border-blue-500"
                      )}>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              {alert.level === 'CRITICAL' && <XCircle className="h-4 w-4 text-red-600" />}
                              {alert.level === 'HIGH' && <AlertTriangle className="h-4 w-4 text-orange-600" />}
                              {alert.level === 'WARNING' && <AlertTriangle className="h-4 w-4 text-yellow-600" />}
                              {alert.level === 'INFO' && <Info className="h-4 w-4 text-blue-600" />}
                              <span className="font-medium text-sm">{alert.level}</span>
                            </div>
                            <AlertDescription className="text-sm">
                              {alert.message}
                            </AlertDescription>
                          </div>
                          <div className="text-xs text-gray-500 ml-2">
                            <Clock className="h-3 w-3 inline mr-1" />
                            {new Date(alert.timestamp).toLocaleTimeString()}
                          </div>
                        </div>
                      </Alert>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>

      <CardFooter className="text-xs text-gray-500">
        Last updated: {lastUpdated.toLocaleString()}
        {autoRefresh && <span className="ml-2">• Auto-refresh enabled</span>}
      </CardFooter>
    </Card>
  );
};

export default RiskMonitor;
