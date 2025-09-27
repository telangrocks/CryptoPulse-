import React, { useState, useEffect, useMemo, useCallback, memo } from 'react'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  ComposedChart,
  ReferenceLine,
  Legend
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  PieChart as PieChartIcon,
  Activity,
  Zap,
  Target,
  DollarSign
} from 'lucide-react'

interface ChartData {
  timestamp: number
  price: number
  volume: number
  high: number
  low: number
  open: number
  close: number
  change: number
  changePercent: number
}

interface AdvancedChartsProps {
  data: ChartData[]
  symbol: string
  timeframe: string
  onTimeframeChange: (timeframe: string) => void
}

const COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

const AdvancedCharts = memo(function AdvancedCharts({ data, symbol, timeframe, onTimeframeChange }: AdvancedChartsProps) {
  const [chartType, setChartType] = useState<'line' | 'area' | 'candlestick' | 'volume'>('line')
  const [indicators, setIndicators] = useState<string[]>(['sma', 'ema'])
  const [showVolume, setShowVolume] = useState(true)

  // Process data for different chart types
  const processedData = useMemo(() => {
    return data.map(item => ({
      ...item,
      time: new Date(item.timestamp).toLocaleTimeString(),
      date: new Date(item.timestamp).toLocaleDateString(),
      sma20: calculateSMA(data, 20, item.timestamp),
      ema12: calculateEMA(data, 12, item.timestamp),
      rsi: calculateRSI(data, item.timestamp),
      macd: calculateMACD(data, item.timestamp),
      bollingerUpper: calculateBollingerBands(data, 20, 2, item.timestamp).upper,
      bollingerLower: calculateBollingerBands(data, 20, 2, item.timestamp).lower,
    }))
  }, [data])

  // Calculate Simple Moving Average - memoized
  const calculateSMA = useCallback((data: ChartData[], period: number, timestamp: number): number => {
    const index = data.findIndex(item => item.timestamp === timestamp)
    if (index < period - 1) return 0
    
    const slice = data.slice(index - period + 1, index + 1)
    return slice.reduce((sum, item) => sum + item.close, 0) / period
  }, [])

  // Calculate Exponential Moving Average - memoized
  const calculateEMA = useCallback((data: ChartData[], period: number, timestamp: number): number => {
    const index = data.findIndex(item => item.timestamp === timestamp)
    if (index < period - 1) return 0
    
    const multiplier = 2 / (period + 1)
    let ema = data[index - period + 1].close
    
    for (let i = index - period + 2; i <= index; i++) {
      ema = (data[i].close * multiplier) + (ema * (1 - multiplier))
    }
    
    return ema
  }, [])

  // Calculate RSI - memoized
  const calculateRSI = useCallback((data: ChartData[], timestamp: number): number => {
    const index = data.findIndex(item => item.timestamp === timestamp)
    if (index < 14) return 50
    
    const slice = data.slice(index - 14, index + 1)
    let gains = 0
    let losses = 0
    
    for (let i = 1; i < slice.length; i++) {
      const change = slice[i].close - slice[i - 1].close
      if (change > 0) gains += change
      else losses += Math.abs(change)
    }
    
    const avgGain = gains / 14
    const avgLoss = losses / 14
    const rs = avgGain / avgLoss
    return 100 - (100 / (1 + rs))
  }, [])

  // Calculate MACD - memoized
  const calculateMACD = useCallback((data: ChartData[], timestamp: number): number => {
    const ema12 = calculateEMA(data, 12, timestamp)
    const ema26 = calculateEMA(data, 26, timestamp)
    return ema12 - ema26
  }, [calculateEMA])

  // Calculate Bollinger Bands - memoized
  const calculateBollingerBands = useCallback((data: ChartData[], period: number, stdDev: number, timestamp: number) => {
    const sma = calculateSMA(data, period, timestamp)
    const index = data.findIndex(item => item.timestamp === timestamp)
    
    if (index < period - 1) return { upper: 0, lower: 0, middle: 0 }
    
    const slice = data.slice(index - period + 1, index + 1)
    const variance = slice.reduce((sum, item) => sum + Math.pow(item.close - sma, 2), 0) / period
    const standardDeviation = Math.sqrt(variance)
    
    return {
      upper: sma + (standardDeviation * stdDev),
      lower: sma - (standardDeviation * stdDev),
      middle: sma
    }
  }, [calculateSMA])

  // Custom tooltip - memoized
  const CustomTooltip = useCallback(({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 shadow-lg">
          <p className="text-slate-300 text-sm">{`Time: ${label}`}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {`${entry.dataKey}: ${entry.value?.toFixed(2) || entry.value}`}
            </p>
          ))}
        </div>
      )
    }
    return null
  }, [])

  // Render chart based on type - memoized
  const renderChart = useCallback((): React.ReactElement => {
    switch (chartType) {
      case 'line':
        return (
          <LineChart data={processedData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="time" stroke="#9ca3af" />
            <YAxis stroke="#9ca3af" />
            <Tooltip content={<CustomTooltip />} />
            <Line 
              type="monotone" 
              dataKey="close" 
              stroke="#8b5cf6" 
              strokeWidth={2}
              dot={false}
            />
            {indicators.includes('sma') && (
              <Line 
                type="monotone" 
                dataKey="sma20" 
                stroke="#06b6d4" 
                strokeWidth={1}
                strokeDasharray="5 5"
                dot={false}
              />
            )}
            {indicators.includes('ema') && (
              <Line 
                type="monotone" 
                dataKey="ema12" 
                stroke="#10b981" 
                strokeWidth={1}
                strokeDasharray="5 5"
                dot={false}
              />
            )}
          </LineChart>
        )
      
      case 'area':
        return (
          <AreaChart data={processedData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="time" stroke="#9ca3af" />
            <YAxis stroke="#9ca3af" />
            <Tooltip content={<CustomTooltip />} />
            <Area 
              type="monotone" 
              dataKey="close" 
              stroke="#8b5cf6" 
              fill="url(#colorGradient)"
              strokeWidth={2}
            />
            <defs>
              <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1}/>
              </linearGradient>
            </defs>
          </AreaChart>
        )
      
      case 'candlestick':
        return (
          <ComposedChart data={processedData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="time" stroke="#9ca3af" />
            <YAxis stroke="#9ca3af" />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="high" fill="#10b981" />
            <Bar dataKey="low" fill="#ef4444" />
            {showVolume && (
              <Bar dataKey="volume" fill="#6b7280" opacity={0.3} />
            )}
          </ComposedChart>
        )
      
      case 'volume':
        return (
          <BarChart data={processedData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="time" stroke="#9ca3af" />
            <YAxis stroke="#9ca3af" />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="volume" fill="#8b5cf6" />
          </BarChart>
        )
      
      default:
        return (
          <LineChart data={processedData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="time" stroke="#9ca3af" />
            <YAxis stroke="#9ca3af" />
            <Tooltip content={<CustomTooltip />} />
            <Line 
              type="monotone" 
              dataKey="close" 
              stroke="#8b5cf6" 
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        )
    }
  }, [chartType, processedData, indicators, showVolume, CustomTooltip])

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            {symbol} - Advanced Charts
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={timeframe} onValueChange={onTimeframeChange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1m">1m</SelectItem>
                <SelectItem value="5m">5m</SelectItem>
                <SelectItem value="15m">15m</SelectItem>
                <SelectItem value="1h">1h</SelectItem>
                <SelectItem value="4h">4h</SelectItem>
                <SelectItem value="1d">1d</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <Tabs value={chartType} onValueChange={(value) => setChartType(value as any)}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="line" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Line
            </TabsTrigger>
            <TabsTrigger value="area" className="flex items-center gap-2">
              <AreaChart className="w-4 h-4" />
              Area
            </TabsTrigger>
            <TabsTrigger value="candlestick" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Candlestick
            </TabsTrigger>
            <TabsTrigger value="volume" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Volume
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value={chartType} className="mt-4">
            <div className="h-96 w-full">
              <ResponsiveContainer width="100%" height="100%">
                {renderChart()}
              </ResponsiveContainer>
            </div>
          </TabsContent>
        </Tabs>
        
        {/* Technical Indicators */}
        <div className="mt-6 space-y-4">
          <h3 className="text-lg font-semibold text-slate-200">Technical Indicators</h3>
          <div className="flex flex-wrap gap-2">
            {['sma', 'ema', 'rsi', 'macd', 'bollinger'].map(indicator => (
              <Button
                key={indicator}
                variant={indicators.includes(indicator) ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setIndicators(prev => 
                    prev.includes(indicator) 
                      ? prev.filter(i => i !== indicator)
                      : [...prev, indicator]
                  )
                }}
              >
                {indicator.toUpperCase()}
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
})

export default AdvancedCharts
