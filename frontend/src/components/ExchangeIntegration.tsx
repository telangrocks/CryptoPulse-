/**
 * Exchange Integration Component
 * Manages real exchange API integrations for trading
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { useToast } from '../hooks/use-toast';
import { logError, logInfo } from '../lib/logger';

interface ExchangeCredentials {
  binance?: {
    apiKey: string;
    apiSecret: string;
    sandbox: boolean;
  };
  wazirx?: {
    apiKey: string;
    apiSecret: string;
    sandbox: boolean;
  };
  coindcx?: {
    apiKey: string;
    apiSecret: string;
    sandbox: boolean;
  };
  delta?: {
    apiKey: string;
    apiSecret: string;
    sandbox: boolean;
  };
  coinbase?: {
    apiKey: string;
    apiSecret: string;
    sandbox: boolean;
  };
}

interface ExchangeBalance {
  asset: string;
  free: string;
  locked: string;
  total: string;
}

interface ExchangeBalances {
  [exchangeName: string]: ExchangeBalance[] | { error: string };
}

const EXCHANGE_INFO = {
  binance: {
    name: 'Binance',
    country: 'Global',
    isIndiaApproved: false,
    description: 'World\'s largest cryptocurrency exchange',
    features: ['Spot Trading', 'Futures', 'Margin Trading', 'Staking']
  },
  wazirx: {
    name: 'WazirX',
    country: 'India',
    isIndiaApproved: true,
    description: 'India\'s most trusted cryptocurrency exchange',
    features: ['Spot Trading', 'P2P Trading', 'Staking', 'INR Pairs']
  },
  coindcx: {
    name: 'CoinDCX',
    country: 'India',
    isIndiaApproved: true,
    description: 'India\'s first crypto unicorn exchange',
    features: ['Spot Trading', 'Futures', 'Staking', 'INR Pairs']
  },
  delta: {
    name: 'Delta Exchange',
    country: 'India',
    isIndiaApproved: true,
    description: 'India\'s leading derivatives exchange',
    features: ['Spot Trading', 'Futures', 'Options', 'Derivatives']
  },
  coinbase: {
    name: 'Coinbase Pro',
    country: 'United States',
    isIndiaApproved: false,
    description: 'Institutional-grade cryptocurrency exchange',
    features: ['Spot Trading', 'Advanced Trading', 'Institutional Tools']
  }
};

export default function ExchangeIntegration() {
  const [credentials, setCredentials] = useState<ExchangeCredentials>({});
  const [balances, setBalances] = useState<ExchangeBalances>({});
  const [loading, setLoading] = useState(false);
  const [selectedExchange, setSelectedExchange] = useState<string>('binance');
  const [testResults, setTestResults] = useState<{ [exchange: string]: boolean }>({});
  const { toast } = useToast();

  useEffect(() => {
    loadSavedCredentials();
  }, []);

  const loadSavedCredentials = async () => {
    try {
      const saved = localStorage.getItem('exchangeCredentials');
      if (saved) {
        setCredentials(JSON.parse(saved));
      }
    } catch (error) {
      logError('Failed to load saved credentials', 'ExchangeIntegration', error);
    }
  };

  const saveCredentials = async () => {
    try {
      localStorage.setItem('exchangeCredentials', JSON.stringify(credentials));
      toast({
        title: 'Credentials Saved',
        description: 'Exchange credentials have been saved securely.',
      });
      logInfo('Exchange credentials saved', 'ExchangeIntegration');
    } catch (error) {
      logError('Failed to save credentials', 'ExchangeIntegration', error);
      toast({
        title: 'Save Failed',
        description: 'Failed to save credentials. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const testExchangeConnection = async (exchangeName: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/v1/parse/functions/getExchangeBalances', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Parse-Application-Id': process.env.VITE_BACK4APP_APP_ID || '',
          'X-Parse-Client-Key': process.env.VITE_BACK4APP_CLIENT_KEY || '',
        },
        body: JSON.stringify({
          exchangeCredentials: credentials
        })
      });

      const result = await response.json();
      
      if (result.success) {
        setBalances(result.balances);
        setTestResults(prev => ({ ...prev, [exchangeName]: true }));
        toast({
          title: 'Connection Successful',
          description: `Successfully connected to ${EXCHANGE_INFO[exchangeName as keyof typeof EXCHANGE_INFO]?.name}`,
        });
      } else {
        throw new Error(result.error || 'Connection failed');
      }
    } catch (error) {
      logError(`Failed to test ${exchangeName} connection`, 'ExchangeIntegration', error);
      setTestResults(prev => ({ ...prev, [exchangeName]: false }));
      toast({
        title: 'Connection Failed',
        description: `Failed to connect to ${EXCHANGE_INFO[exchangeName as keyof typeof EXCHANGE_INFO]?.name}`,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const executeRealTrade = async (action: 'BUY' | 'SELL', pair: string, amount: number) => {
    setLoading(true);
    try {
      const response = await fetch('/api/v1/parse/functions/executeRealTrade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Parse-Application-Id': process.env.VITE_BACK4APP_APP_ID || '',
          'X-Parse-Client-Key': process.env.VITE_BACK4APP_CLIENT_KEY || '',
        },
        body: JSON.stringify({
          action,
          pair,
          amount,
          strategy: 'real_trading',
          exchangeCredentials: credentials,
          useRealExecution: true
        })
      });

      const result = await response.json();
      
      if (result.success) {
        toast({
          title: 'Trade Executed',
          description: `Successfully executed ${action} order for ${amount} ${pair}`,
        });
        // Refresh balances
        await testExchangeConnection(selectedExchange);
      } else {
        throw new Error(result.error || 'Trade execution failed');
      }
    } catch (error) {
      logError('Failed to execute real trade', 'ExchangeIntegration', error);
      toast({
        title: 'Trade Failed',
        description: 'Failed to execute trade. Please check your credentials and try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const updateCredentials = (exchange: string, field: string, value: string | boolean) => {
    setCredentials(prev => ({
      ...prev,
      [exchange]: {
        ...prev[exchange as keyof ExchangeCredentials],
        [field]: value
      }
    }));
  };

  const renderExchangeForm = (exchangeName: string) => {
    const exchangeInfo = EXCHANGE_INFO[exchangeName as keyof typeof EXCHANGE_INFO];
    const exchangeCreds = credentials[exchangeName as keyof ExchangeCredentials];
    const isConnected = testResults[exchangeName];

    return (
      <Card key={exchangeName} className="mb-4">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {exchangeInfo.name}
                {exchangeInfo.isIndiaApproved && (
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    India Approved
                  </Badge>
                )}
                {isConnected && (
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    Connected
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                {exchangeInfo.description} • {exchangeInfo.country}
              </CardDescription>
            </div>
            <Button
              onClick={() => testExchangeConnection(exchangeName)}
              disabled={loading}
              variant={isConnected ? "outline" : "default"}
            >
              {isConnected ? 'Reconnect' : 'Connect'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor={`${exchangeName}-apiKey`}>API Key</Label>
              <Input
                id={`${exchangeName}-apiKey`}
                type="password"
                value={exchangeCreds?.apiKey || ''}
                onChange={(e) => updateCredentials(exchangeName, 'apiKey', e.target.value)}
                placeholder="Enter your API key"
              />
            </div>
            <div>
              <Label htmlFor={`${exchangeName}-apiSecret`}>API Secret</Label>
              <Input
                id={`${exchangeName}-apiSecret`}
                type="password"
                value={exchangeCreds?.apiSecret || ''}
                onChange={(e) => updateCredentials(exchangeName, 'apiSecret', e.target.value)}
                placeholder="Enter your API secret"
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id={`${exchangeName}-sandbox`}
                checked={exchangeCreds?.sandbox || false}
                onChange={(e) => updateCredentials(exchangeName, 'sandbox', e.target.checked)}
              />
              <Label htmlFor={`${exchangeName}-sandbox`}>Use Sandbox/Testnet</Label>
            </div>
          </div>
          
          <div className="mt-4">
            <h4 className="font-medium mb-2">Features:</h4>
            <div className="flex flex-wrap gap-2">
              {exchangeInfo.features.map((feature) => (
                <Badge key={feature} variant="outline">
                  {feature}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderBalances = () => {
    if (Object.keys(balances).length === 0) {
      return (
        <Alert>
          <AlertDescription>
            Connect to exchanges to view your balances.
          </AlertDescription>
        </Alert>
      );
    }

    return (
      <div className="space-y-4">
        {Object.entries(balances).map(([exchangeName, exchangeBalances]) => (
          <Card key={exchangeName}>
            <CardHeader>
              <CardTitle>{EXCHANGE_INFO[exchangeName as keyof typeof EXCHANGE_INFO]?.name} Balances</CardTitle>
            </CardHeader>
            <CardContent>
              {Array.isArray(exchangeBalances) ? (
                <div className="space-y-2">
                  {exchangeBalances
                    .filter(balance => parseFloat(balance.total) > 0)
                    .map((balance) => (
                      <div key={balance.asset} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <span className="font-medium">{balance.asset}</span>
                        <div className="text-right">
                          <div className="font-medium">{parseFloat(balance.total).toFixed(6)}</div>
                          <div className="text-sm text-gray-500">
                            Free: {parseFloat(balance.free).toFixed(6)} | 
                            Locked: {parseFloat(balance.locked).toFixed(6)}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <Alert variant="destructive">
                  <AlertDescription>
                    Error: {exchangeBalances.error}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Exchange Integration</h1>
        <p className="text-gray-600">
          Connect to real cryptocurrency exchanges for live trading. Supports India-approved exchanges.
        </p>
      </div>

      <Tabs defaultValue="credentials" className="space-y-6">
        <TabsList>
          <TabsTrigger value="credentials">Exchange Credentials</TabsTrigger>
          <TabsTrigger value="balances">Account Balances</TabsTrigger>
          <TabsTrigger value="trading">Live Trading</TabsTrigger>
        </TabsList>

        <TabsContent value="credentials" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Configure Exchange APIs</h2>
            <Button onClick={saveCredentials} disabled={loading}>
              Save Credentials
            </Button>
          </div>
          
          {Object.keys(EXCHANGE_INFO).map(renderExchangeForm)}
        </TabsContent>

        <TabsContent value="balances" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Account Balances</h2>
            <Button 
              onClick={() => testExchangeConnection(selectedExchange)}
              disabled={loading}
            >
              Refresh Balances
            </Button>
          </div>
          {renderBalances()}
        </TabsContent>

        <TabsContent value="trading" className="space-y-6">
          <h2 className="text-xl font-semibold">Live Trading</h2>
          
          <Card>
            <CardHeader>
              <CardTitle>Execute Real Trade</CardTitle>
              <CardDescription>
                Execute real trades using your connected exchange accounts.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <Label htmlFor="exchange-select">Exchange</Label>
                  <Select value={selectedExchange} onValueChange={setSelectedExchange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(EXCHANGE_INFO).map(([key, info]) => (
                        <SelectItem key={key} value={key}>
                          {info.name} {info.isIndiaApproved && '(India Approved)'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="trading-pair">Trading Pair</Label>
                  <Input
                    id="trading-pair"
                    placeholder="e.g., BTC/USDT"
                    defaultValue="BTC/USDT"
                  />
                </div>
                <div>
                  <Label htmlFor="trading-amount">Amount</Label>
                  <Input
                    id="trading-amount"
                    type="number"
                    placeholder="0.001"
                    defaultValue="0.001"
                  />
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button
                  onClick={() => executeRealTrade('BUY', 'BTC/USDT', 0.001)}
                  disabled={loading}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Buy
                </Button>
                <Button
                  onClick={() => executeRealTrade('SELL', 'BTC/USDT', 0.001)}
                  disabled={loading}
                  variant="destructive"
                >
                  Sell
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
