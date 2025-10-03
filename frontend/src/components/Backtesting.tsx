/**
 * Backtesting Component - Production-Ready Backtesting Interface
 * 
 * This component provides a comprehensive backtesting interface
 * for testing trading strategies with historical data.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  BarChart3, 
  Play, 
  Settings, 
  TrendingUp, 
  TrendingDown, 
  DollarSign,
  Clock,
  Target,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
  Download,
  RefreshCw,
  Eye,
  Zap,
  Activity,
  PieChart
} from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Alert, AlertDescription } from './ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ScrollArea } from './ui/scroll-area';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { cn } from '../lib/utils';

interface Strategy {
  id?: string;
  name: string;
  description?: string;
  parameters: Record<string, any>;
  entryConditions: string[];
  exitConditions: string[];
  symbol?: string;
}

interface BacktestOptions {
  symbol: string;
  timeframe: string;
  startDate: string;
  endDate: string;
  initialCapital: number;
  slippage: number;
  commission: number;
  maxRisk: number;
}

interface BacktestResult {
  success: boolean;
  backtestId: string;
  results?: {
    trades: any[];
    portfolio: any;
    metrics: any;
    performanceMetrics: any;
  };
  error?: string;
  executionTime?: number;
}

interface StrategyTemplate {
  id: string;
  name: string;
  description: string;
  parameters: Record<string, any>;
  entryConditions: string[];
  exitConditions: string[];
}

const Backtesting: React.FC = () => {
  // State management
  const [strategy, setStrategy] = useState<Strategy>({
    name: '',
    parameters: {},
    entryConditions: [],
    exitConditions: [],
  });
  
  const [options, setOptions] = useState<BacktestOptions>({
    symbol: 'BTC/USDT',
    timeframe: '1h',
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    initialCapital: 10000,
    slippage: 0.001,
    commission: 0.001,
    maxRisk: 0.02,
  });

  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [results, setResults] = useState<BacktestResult | null>(null);
  const [strategyTemplates, setStrategyTemplates] = useState<StrategyTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [activeTab, setActiveTab] = useState('configuration');
  const [validation, setValidation] = useState<{valid: boolean; errors: string[]; warnings: string[]}>({valid: true, errors: [], warnings: []});

  // Load strategy templates on component mount
  useEffect(() => {
    loadStrategyTemplates();
  }, []);

  // Load strategy templates
  const loadStrategyTemplates = useCallback(async () => {
    try {
      const response = await fetch('/api/backtesting/templates');
      const data = await response.json();
      
      if (data.success) {
        setStrategyTemplates(data.data);
      }
    } catch (error) {
      console.error('Failed to load strategy templates:', error);
    }
  }, []);

  // Validate strategy configuration
  const validateStrategy = useCallback(async () => {
    try {
      const response = await fetch('/api/backtesting/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ strategy, options }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setValidation(data.data);
      }
    } catch (error) {
      console.error('Failed to validate strategy:', error);
    }
  }, [strategy, options]);

  // Validate strategy when inputs change
  useEffect(() => {
    if (strategy.name && options.symbol) {
      validateStrategy();
    }
  }, [strategy, options, validateStrategy]);

  // Load template
  const loadTemplate = useCallback((templateId: string) => {
    const template = strategyTemplates.find(t => t.id === templateId);
    if (template) {
      setStrategy({
        name: template.name,
        parameters: { ...template.parameters },
        entryConditions: [...template.entryConditions],
        exitConditions: [...template.exitConditions],
      });
      setSelectedTemplate(templateId);
    }
  }, [strategyTemplates]);

  // Run backtest
  const runBacktest = useCallback(async () => {
    if (!validation.valid) {
      return;
    }

    setIsRunning(true);
    setProgress(0);
    setProgressMessage('Initializing backtest...');
    setResults(null);

    try {
      const response = await fetch('/api/backtesting/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ strategy, options }),
      });

      const data = await response.json();

      if (data.success) {
        setResults({
          success: true,
          backtestId: data.backtestId,
          results: data.data,
          executionTime: data.executionTime,
        });
        setActiveTab('results');
      } else {
        setResults({
          success: false,
          backtestId: data.backtestId || '',
          error: data.error || 'Backtest failed',
          executionTime: data.executionTime,
        });
      }
    } catch (error) {
      setResults({
        success: false,
        backtestId: '',
        error: error instanceof Error ? error.message : 'Backtest failed',
      });
    } finally {
      setIsRunning(false);
      setProgress(0);
      setProgressMessage('');
    }
  }, [strategy, options, validation]);

  // Update strategy parameter
  const updateStrategyParameter = useCallback((key: string, value: any) => {
    setStrategy(prev => ({
      ...prev,
      parameters: {
        ...prev.parameters,
        [key]: value,
      },
    }));
  }, []);

  // Update strategy condition
  const updateStrategyCondition = useCallback((type: 'entry' | 'exit', index: number, value: string) => {
    setStrategy(prev => ({
      ...prev,
      [`${type}Conditions`]: prev[`${type}Conditions`].map((condition, i) => 
        i === index ? value : condition
      ),
    }));
  }, []);

  // Add strategy condition
  const addStrategyCondition = useCallback((type: 'entry' | 'exit') => {
    setStrategy(prev => ({
      ...prev,
      [`${type}Conditions`]: [...prev[`${type}Conditions`], ''],
    }));
  }, []);

  // Remove strategy condition
  const removeStrategyCondition = useCallback((type: 'entry' | 'exit', index: number) => {
    setStrategy(prev => ({
      ...prev,
      [`${type}Conditions`]: prev[`${type}Conditions`].filter((_, i) => i !== index),
    }));
  }, []);

  // Format performance metrics
  const formatMetric = useCallback((value: number, type: 'percentage' | 'currency' | 'number' = 'number') => {
    if (type === 'percentage') {
      return `${(value * 100).toFixed(2)}%`;
    } else if (type === 'currency') {
      return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    } else {
      return value.toFixed(4);
    }
  }, []);

  // Get metric color
  const getMetricColor = useCallback((value: number, type: 'return' | 'drawdown' | 'ratio') => {
    if (type === 'return') {
      return value >= 0 ? 'text-green-600' : 'text-red-600';
    } else if (type === 'drawdown') {
      return value <= 0.05 ? 'text-green-600' : value <= 0.1 ? 'text-yellow-600' : 'text-red-600';
    } else if (type === 'ratio') {
      return value >= 1.5 ? 'text-green-600' : value >= 1.0 ? 'text-yellow-600' : 'text-red-600';
    }
    return 'text-gray-600';
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-7xl mx-auto">
        <Card className="bg-slate-800/90 border-slate-700 text-white">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-blue-500/20 rounded-full">
                <BarChart3 className="h-8 w-8 text-blue-400" />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Strategy Backtesting
            </CardTitle>
            <p className="text-slate-400 mt-2">
              Test your trading strategies with historical data and optimize performance
            </p>
          </CardHeader>

          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-4 mb-6">
                <TabsTrigger value="configuration">Configuration</TabsTrigger>
                <TabsTrigger value="strategy">Strategy</TabsTrigger>
                <TabsTrigger value="results">Results</TabsTrigger>
                <TabsTrigger value="templates">Templates</TabsTrigger>
              </TabsList>

              <TabsContent value="configuration" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="bg-slate-700/50">
                    <CardHeader>
                      <CardTitle className="text-lg">Market Settings</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor="symbol">Trading Pair</Label>
                        <Select value={options.symbol} onValueChange={(value) => setOptions(prev => ({ ...prev, symbol: value }))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="BTC/USDT">BTC/USDT</SelectItem>
                            <SelectItem value="ETH/USDT">ETH/USDT</SelectItem>
                            <SelectItem value="BNB/USDT">BNB/USDT</SelectItem>
                            <SelectItem value="ADA/USDT">ADA/USDT</SelectItem>
                            <SelectItem value="DOT/USDT">DOT/USDT</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="timeframe">Timeframe</Label>
                        <Select value={options.timeframe} onValueChange={(value) => setOptions(prev => ({ ...prev, timeframe: value }))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1m">1 Minute</SelectItem>
                            <SelectItem value="5m">5 Minutes</SelectItem>
                            <SelectItem value="15m">15 Minutes</SelectItem>
                            <SelectItem value="1h">1 Hour</SelectItem>
                            <SelectItem value="4h">4 Hours</SelectItem>
                            <SelectItem value="1d">1 Day</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="startDate">Start Date</Label>
                          <Input
                            id="startDate"
                            type="date"
                            value={options.startDate}
                            onChange={(e) => setOptions(prev => ({ ...prev, startDate: e.target.value }))}
                          />
                        </div>
                        <div>
                          <Label htmlFor="endDate">End Date</Label>
                          <Input
                            id="endDate"
                            type="date"
                            value={options.endDate}
                            onChange={(e) => setOptions(prev => ({ ...prev, endDate: e.target.value }))}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-slate-700/50">
                    <CardHeader>
                      <CardTitle className="text-lg">Portfolio Settings</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor="initialCapital">Initial Capital</Label>
                        <Input
                          id="initialCapital"
                          type="number"
                          value={options.initialCapital}
                          onChange={(e) => setOptions(prev => ({ ...prev, initialCapital: parseFloat(e.target.value) || 0 }))}
                        />
                      </div>

                      <div>
                        <Label htmlFor="slippage">Slippage (%)</Label>
                        <Input
                          id="slippage"
                          type="number"
                          step="0.001"
                          value={options.slippage * 100}
                          onChange={(e) => setOptions(prev => ({ ...prev, slippage: (parseFloat(e.target.value) || 0) / 100 }))}
                        />
                      </div>

                      <div>
                        <Label htmlFor="commission">Commission (%)</Label>
                        <Input
                          id="commission"
                          type="number"
                          step="0.001"
                          value={options.commission * 100}
                          onChange={(e) => setOptions(prev => ({ ...prev, commission: (parseFloat(e.target.value) || 0) / 100 }))}
                        />
                      </div>

                      <div>
                        <Label htmlFor="maxRisk">Max Risk per Trade (%)</Label>
                        <Input
                          id="maxRisk"
                          type="number"
                          step="0.001"
                          value={options.maxRisk * 100}
                          onChange={(e) => setOptions(prev => ({ ...prev, maxRisk: (parseFloat(e.target.value) || 0) / 100 }))}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {validation.errors.length > 0 && (
                  <Alert className="border-red-500">
                    <XCircle className="h-4 w-4" />
                    <AlertDescription>
                      <ul className="list-disc list-inside">
                        {validation.errors.map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                {validation.warnings.length > 0 && (
                  <Alert className="border-yellow-500">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <ul className="list-disc list-inside">
                        {validation.warnings.map((warning, index) => (
                          <li key={index}>{warning}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex justify-center">
                  <Button
                    onClick={runBacktest}
                    disabled={!validation.valid || isRunning}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  >
                    {isRunning ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Running Backtest...
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        Run Backtest
                      </>
                    )}
                  </Button>
                </div>

                {isRunning && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progress</span>
                      <span>{progress.toFixed(1)}%</span>
                    </div>
                    <Progress value={progress} className="w-full" />
                    <p className="text-sm text-slate-400">{progressMessage}</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="strategy" className="space-y-6">
                <Card className="bg-slate-700/50">
                  <CardHeader>
                    <CardTitle className="text-lg">Strategy Configuration</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <Label htmlFor="strategyName">Strategy Name</Label>
                      <Input
                        id="strategyName"
                        value={strategy.name}
                        onChange={(e) => setStrategy(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Enter strategy name"
                      />
                    </div>

                    <div>
                      <Label>Parameters</Label>
                      <div className="grid grid-cols-2 gap-4 mt-2">
                        <div>
                          <Label htmlFor="lookbackPeriod">Lookback Period</Label>
                          <Input
                            id="lookbackPeriod"
                            type="number"
                            value={strategy.parameters.lookbackPeriod || ''}
                            onChange={(e) => updateStrategyParameter('lookbackPeriod', parseInt(e.target.value) || 0)}
                          />
                        </div>
                        <div>
                          <Label htmlFor="stopLoss">Stop Loss (%)</Label>
                          <Input
                            id="stopLoss"
                            type="number"
                            step="0.001"
                            value={strategy.parameters.stopLoss ? (strategy.parameters.stopLoss * 100).toFixed(2) : ''}
                            onChange={(e) => updateStrategyParameter('stopLoss', (parseFloat(e.target.value) || 0) / 100)}
                          />
                        </div>
                        <div>
                          <Label htmlFor="takeProfit">Take Profit (%)</Label>
                          <Input
                            id="takeProfit"
                            type="number"
                            step="0.001"
                            value={strategy.parameters.takeProfit ? (strategy.parameters.takeProfit * 100).toFixed(2) : ''}
                            onChange={(e) => updateStrategyParameter('takeProfit', (parseFloat(e.target.value) || 0) / 100)}
                          />
                        </div>
                        <div>
                          <Label htmlFor="momentumThreshold">Momentum Threshold (%)</Label>
                          <Input
                            id="momentumThreshold"
                            type="number"
                            step="0.001"
                            value={strategy.parameters.momentumThreshold ? (strategy.parameters.momentumThreshold * 100).toFixed(2) : ''}
                            onChange={(e) => updateStrategyParameter('momentumThreshold', (parseFloat(e.target.value) || 0) / 100)}
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <Label>Entry Conditions</Label>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => addStrategyCondition('entry')}
                        >
                          Add Condition
                        </Button>
                      </div>
                      <div className="space-y-2">
                        {strategy.entryConditions.map((condition, index) => (
                          <div key={index} className="flex gap-2">
                            <Input
                              value={condition}
                              onChange={(e) => updateStrategyCondition('entry', index, e.target.value)}
                              placeholder="Enter entry condition"
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => removeStrategyCondition('entry', index)}
                            >
                              Remove
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <Label>Exit Conditions</Label>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => addStrategyCondition('exit')}
                        >
                          Add Condition
                        </Button>
                      </div>
                      <div className="space-y-2">
                        {strategy.exitConditions.map((condition, index) => (
                          <div key={index} className="flex gap-2">
                            <Input
                              value={condition}
                              onChange={(e) => updateStrategyCondition('exit', index, e.target.value)}
                              placeholder="Enter exit condition"
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => removeStrategyCondition('exit', index)}
                            >
                              Remove
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="results" className="space-y-6">
                {results ? (
                  <div className="space-y-6">
                    {results.success ? (
                      <>
                        {/* Performance Summary */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          <Card className="bg-slate-700/50">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm font-medium text-gray-400">Total Return</p>
                                  <p className={cn("text-2xl font-bold", getMetricColor(results.results?.performanceMetrics.totalReturn || 0, 'return'))}>
                                    {formatMetric(results.results?.performanceMetrics.totalReturn || 0, 'percentage')}
                                  </p>
                                </div>
                                <TrendingUp className="h-8 w-8 text-blue-600" />
                              </div>
                            </CardContent>
                          </Card>

                          <Card className="bg-slate-700/50">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm font-medium text-gray-400">Win Rate</p>
                                  <p className={cn("text-2xl font-bold", getMetricColor(results.results?.performanceMetrics.winRate || 0, 'ratio'))}>
                                    {formatMetric(results.results?.performanceMetrics.winRate || 0, 'percentage')}
                                  </p>
                                </div>
                                <Target className="h-8 w-8 text-green-600" />
                              </div>
                            </CardContent>
                          </Card>

                          <Card className="bg-slate-700/50">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm font-medium text-gray-400">Max Drawdown</p>
                                  <p className={cn("text-2xl font-bold", getMetricColor(results.results?.performanceMetrics.maxDrawdown || 0, 'drawdown'))}>
                                    {formatMetric(results.results?.performanceMetrics.maxDrawdown || 0, 'percentage')}
                                  </p>
                                </div>
                                <TrendingDown className="h-8 w-8 text-red-600" />
                              </div>
                            </CardContent>
                          </Card>

                          <Card className="bg-slate-700/50">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm font-medium text-gray-400">Sharpe Ratio</p>
                                  <p className={cn("text-2xl font-bold", getMetricColor(results.results?.performanceMetrics.sharpeRatio || 0, 'ratio'))}>
                                    {formatMetric(results.results?.performanceMetrics.sharpeRatio || 0)}
                                  </p>
                                </div>
                                <Activity className="h-8 w-8 text-purple-600" />
                              </div>
                            </CardContent>
                          </Card>
                        </div>

                        {/* Detailed Metrics */}
                        <Card className="bg-slate-700/50">
                          <CardHeader>
                            <CardTitle className="text-lg">Detailed Performance Metrics</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <div>
                                <p className="text-sm text-gray-400">Total Trades</p>
                                <p className="text-lg font-semibold">{results.results?.performanceMetrics.totalTrades || 0}</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-400">Profit Factor</p>
                                <p className="text-lg font-semibold">{formatMetric(results.results?.performanceMetrics.profitFactor || 0)}</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-400">Average Win</p>
                                <p className="text-lg font-semibold">{formatMetric(results.results?.performanceMetrics.averageWin || 0, 'currency')}</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-400">Average Loss</p>
                                <p className="text-lg font-semibold">{formatMetric(results.results?.performanceMetrics.averageLoss || 0, 'currency')}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Trade List */}
                        <Card className="bg-slate-700/50">
                          <CardHeader>
                            <CardTitle className="text-lg">Trade History</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <ScrollArea className="h-64">
                              <div className="space-y-2">
                                {results.results?.trades?.slice(0, 10).map((trade: any, index: number) => (
                                  <div key={index} className="flex justify-between items-center p-2 bg-slate-600/50 rounded">
                                    <div className="flex items-center gap-2">
                                      <Badge variant={trade.side === 'long' ? 'default' : 'secondary'}>
                                        {trade.side?.toUpperCase()}
                                      </Badge>
                                      <span className="text-sm">{trade.symbol}</span>
                                    </div>
                                    <div className="text-right">
                                      <p className={cn("text-sm font-medium", trade.netPnL >= 0 ? "text-green-400" : "text-red-400")}>
                                        {formatMetric(trade.netPnL || 0, 'currency')}
                                      </p>
                                      <p className="text-xs text-gray-400">
                                        {trade.entryPrice?.toFixed(2)} → {trade.exitPrice?.toFixed(2)}
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </ScrollArea>
                          </CardContent>
                        </Card>
                      </>
                    ) : (
                      <Alert className="border-red-500">
                        <XCircle className="h-4 w-4" />
                        <AlertDescription>
                          Backtest failed: {results.error}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <BarChart3 className="h-16 w-16 text-slate-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">No Results Yet</h3>
                    <p className="text-slate-400 mb-6">
                      Run a backtest to see the results here
                    </p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="templates" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {strategyTemplates.map((template) => (
                    <Card key={template.id} className="bg-slate-700/50 cursor-pointer hover:bg-slate-600/50 transition-colors">
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-lg">{template.name}</CardTitle>
                            <p className="text-sm text-gray-400 mt-1">{template.description}</p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => loadTemplate(template.id)}
                          >
                            Load
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div>
                            <p className="text-xs text-gray-400">Parameters</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {Object.entries(template.parameters).slice(0, 3).map(([key, value]) => (
                                <Badge key={key} variant="outline" className="text-xs">
                                  {key}: {typeof value === 'number' ? value.toFixed(2) : value}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400">Entry Conditions</p>
                            <p className="text-xs text-gray-300">{template.entryConditions.length} conditions</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400">Exit Conditions</p>
                            <p className="text-xs text-gray-300">{template.exitConditions.length} conditions</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>

          <CardFooter className="text-xs text-gray-500">
            Backtesting Engine v1.0.0 • Powered by CryptoPulse
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default Backtesting;