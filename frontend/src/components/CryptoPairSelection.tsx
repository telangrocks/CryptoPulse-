import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { Alert, AlertDescription } from './ui/alert';
import { Target, Search, CheckCircle, TrendingUp } from 'lucide-react';

export default function CryptoPairSelection() {
  const [selectedPairs, setSelectedPairs] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const availablePairs = [
    'BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'ADA/USDT', 'SOL/USDT',
    'XRP/USDT', 'DOT/USDT', 'DOGE/USDT', 'AVAX/USDT', 'MATIC/USDT',
    'LINK/USDT', 'UNI/USDT', 'LTC/USDT', 'BCH/USDT', 'ATOM/USDT'
  ];

  const filteredPairs = availablePairs.filter(pair =>
    pair.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handlePairToggle = (pair: string) => {
    setSelectedPairs(prev =>
      prev.includes(pair)
        ? prev.filter(p => p !== pair)
        : [...prev, pair]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      if (selectedPairs.length === 0) {
        throw new Error('Please select at least one trading pair');
      }

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      setSuccess(`Successfully selected ${selectedPairs.length} trading pairs!`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save trading pairs');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-4xl mx-auto">
        <Card className="bg-slate-800/90 border-slate-700 text-white">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-green-500/20 rounded-full">
                <Target className="h-8 w-8 text-green-400" />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
              Select Trading Pairs
            </CardTitle>
            <p className="text-slate-400 mt-2">
              Choose which cryptocurrency pairs you want to trade
            </p>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <Alert className="bg-blue-500/10 border-blue-500/20">
              <TrendingUp className="h-4 w-4" />
              <AlertDescription className="text-blue-400">
                <strong>Tip:</strong> Start with 2-3 pairs to focus your trading strategy. 
                You can always add more later.
              </AlertDescription>
            </Alert>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="search" className="text-slate-300">Search Pairs</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      id="search"
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search for trading pairs..."
                      className="pl-10 bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-300">
                    Available Pairs ({filteredPairs.length})
                  </Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-64 overflow-y-auto">
                    {filteredPairs.map((pair) => (
                      <div key={pair} className="flex items-center space-x-2">
                        <Checkbox
                          id={pair}
                          checked={selectedPairs.includes(pair)}
                          onCheckedChange={() => handlePairToggle(pair)}
                        />
                        <Label
                          htmlFor={pair}
                          className="text-sm font-medium text-slate-300 cursor-pointer"
                        >
                          {pair}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                {selectedPairs.length > 0 && (
                  <div className="bg-slate-700/50 rounded-lg p-4">
                    <h3 className="font-semibold text-white mb-2">
                      Selected Pairs ({selectedPairs.length})
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedPairs.map((pair) => (
                        <span
                          key={pair}
                          className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm"
                        >
                          {pair}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {error && (
                <Alert className="bg-red-500/10 border-red-500/20">
                  <AlertDescription className="text-red-400">
                    {error}
                  </AlertDescription>
                </Alert>
              )}

              {success && (
                <Alert className="bg-green-500/10 border-green-500/20">
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription className="text-green-400">
                    {success}
                  </AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
                disabled={isLoading || selectedPairs.length === 0}
              >
                {isLoading ? 'Saving...' : `Save ${selectedPairs.length} Trading Pairs`}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}