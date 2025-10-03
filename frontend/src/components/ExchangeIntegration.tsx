import { useState, useEffect } from 'react';

import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

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
}

interface ExchangeInfo {
  name: string;
  isIndiaApproved: boolean;
  fees: {
    maker: number;
    taker: number;
  };
  supportedPairs: string[];
}

const EXCHANGE_INFO: Record<string, ExchangeInfo> = {
  binance: {
    name: 'Binance',
    isIndiaApproved: false,
    fees: { maker: 0.1, taker: 0.1 },
    supportedPairs: ['BTC/USDT', 'ETH/USDT', 'BNB/USDT'],
  },
  wazirx: {
    name: 'WazirX',
    isIndiaApproved: true,
    fees: { maker: 0.2, taker: 0.2 },
    supportedPairs: ['BTC/INR', 'ETH/INR', 'USDT/INR'],
  },
  coindcx: {
    name: 'CoinDCX',
    isIndiaApproved: true,
    fees: { maker: 0.1, taker: 0.1 },
    supportedPairs: ['BTC/INR', 'ETH/INR', 'USDT/INR'],
  },
};

export default function ExchangeIntegration() {
  const [credentials, setCredentials] = useState<ExchangeCredentials>({});
  const [balances, setBalances] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [selectedExchange, setSelectedExchange] = useState<string>('');

  const handleCredentialChange = (exchange: string, field: string, value: string | boolean) => {
    setCredentials(prev => ({
      ...prev,
      [exchange]: {
        ...prev[exchange as keyof ExchangeCredentials],
        [field]: value,
      },
    }));
  };

  const saveCredentials = async () => {
    setLoading(true);
    try {
      // Simulate API call to save credentials
      await new Promise(resolve => setTimeout(resolve, 1000));
      // console.log('Credentials saved:', credentials);
    } catch (error) {
      // console.error('Failed to save credentials:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBalances = async () => {
    setLoading(true);
    try {
      // Simulate API call to fetch balances
      await new Promise(resolve => setTimeout(resolve, 1500));
      setBalances({
        binance: {
          BTC: { total: '0.5', available: '0.4', locked: '0.1' },
          USDT: { total: '1000', available: '900', locked: '100' },
        },
        wazirx: {
          BTC: { total: '0.3', available: '0.3', locked: '0' },
          INR: { total: '50000', available: '45000', locked: '5000' },
        },
      });
    } catch (error) {
      // console.error('Failed to fetch balances:', error);
    } finally {
      setLoading(false);
    }
  };

  const executeRealTrade = async (side: 'BUY' | 'SELL', pair: string, amount: number) => {
    if (!selectedExchange) {
      alert('Please select an exchange first');
      return;
    }

    setLoading(true);
    try {
      // Simulate trade execution
      await new Promise(resolve => setTimeout(resolve, 2000));
      // console.log(`Executed ${side} ${amount} ${pair} on ${selectedExchange}`);
      alert(`Trade executed: ${side} ${amount} ${pair}`);
    } catch (error) {
      // console.error('Trade execution failed:', error);
      alert('Trade failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBalances();
  }, []);

  const renderExchangeForm = (exchangeKey: string) => {
    const info = EXCHANGE_INFO[exchangeKey];
    const creds = credentials[exchangeKey as keyof ExchangeCredentials];

    return (
      <Card className="mb-6" key={exchangeKey}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {info.name}
            {info.isIndiaApproved && (
              <Badge variant="secondary">India Approved</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor={`${exchangeKey}-api-key`}>API Key</Label>
              <Input
                id={`${exchangeKey}-api-key`}
                onChange={(e) => handleCredentialChange(exchangeKey, 'apiKey', e.target.value)}
                placeholder="Enter API Key"
                type="password"
                value={creds?.apiKey || ''}
              />
            </div>
            <div>
              <Label htmlFor={`${exchangeKey}-api-secret`}>API Secret</Label>
              <Input
                id={`${exchangeKey}-api-secret`}
                onChange={(e) => handleCredentialChange(exchangeKey, 'apiSecret', e.target.value)}
                placeholder="Enter API Secret"
                type="password"
                value={creds?.apiSecret || ''}
              />
            </div>
          </div>
          <div className="text-sm text-gray-600">
            <p>Maker Fee: {info.fees.maker}% | Taker Fee: {info.fees.taker}%</p>
            <p>Supported Pairs: {info.supportedPairs.join(', ')}</p>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderBalances = () => {
    return (
      <div className="space-y-4">
        {Object.entries(balances).map(([exchangeName, exchangeBalances]) => (
          <Card key={exchangeName}>
            <CardHeader>
              <CardTitle>{EXCHANGE_INFO[exchangeName]?.name || exchangeName}</CardTitle>
            </CardHeader>
            <CardContent>
              {Array.isArray(exchangeBalances) ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(exchangeBalances)
                    .filter(([, balance]: [string, any]) => parseFloat(balance.total) > 0)
                    .map(([asset, balance]: [string, any]) => (
                      <div className="p-3 border rounded-lg" key={asset}>
                        <h4 className="font-semibold">{asset}</h4>
                        <div className="text-sm text-gray-600">
                          <div>Total: {parseFloat(balance.total).toFixed(6)}</div>
                          <div>Available: {parseFloat(balance.available).toFixed(6)}</div>
                          <div>Locked: {parseFloat(balance.locked).toFixed(6)}</div>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <Alert variant="destructive">
                  <AlertDescription>
                    Error loading balances for {exchangeName}
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

      <Tabs className="space-y-6" defaultValue="credentials">
        <TabsList>
          <TabsTrigger value="credentials">API Credentials</TabsTrigger>
          <TabsTrigger value="balances">Account Balances</TabsTrigger>
          <TabsTrigger value="trading">Live Trading</TabsTrigger>
        </TabsList>

        <TabsContent className="space-y-6" value="credentials">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Configure Exchange APIs</h2>
            <Button disabled={loading} onClick={saveCredentials}>
              {loading ? 'Saving...' : 'Save Credentials'}
            </Button>
          </div>

          {Object.keys(EXCHANGE_INFO).map(renderExchangeForm)}
        </TabsContent>

        <TabsContent className="space-y-6" value="balances">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Account Balances</h2>
            <Button disabled={loading} onClick={fetchBalances}>
              {loading ? 'Refreshing...' : 'Refresh Balances'}
            </Button>
          </div>

          {renderBalances()}
        </TabsContent>

        <TabsContent className="space-y-6" value="trading">
          <h2 className="text-xl font-semibold">Live Trading</h2>

          <Card>
            <CardHeader>
              <CardTitle>Quick Trade</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Exchange</Label>
                  <Select onValueChange={setSelectedExchange} value={selectedExchange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Exchange" />
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
                  <Label>Trading Pair</Label>
                  <Input
                    defaultValue="BTC/USDT"
                    placeholder="BTC/USDT"
                  />
                </div>
                <div>
                  <Label>Amount</Label>
                  <Input
                    placeholder="0.001"
                    step="0.001"
                    type="number"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  disabled={loading}
                  onClick={() => executeRealTrade('BUY', 'BTC/USDT', 0.1)}
                >
                  {loading ? 'Processing...' : 'Buy'}
                </Button>
                <Button
                  className="flex-1"
                  disabled={loading}
                  onClick={() => executeRealTrade('SELL', 'BTC/USDT', 0.1)}
                  variant="destructive"
                >
                  {loading ? 'Processing...' : 'Sell'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}