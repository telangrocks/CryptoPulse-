import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import { Bot, CheckCircle } from 'lucide-react';

export default function BotSetup() {
  const [botName, setBotName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      if (!botName) {
        throw new Error('Please enter a bot name');
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
      setSuccess('Bot configured successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to configure bot');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-2xl mx-auto">
        <Card className="bg-slate-800/90 border-slate-700 text-white">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-purple-500/20 rounded-full">
                <Bot className="h-8 w-8 text-purple-400" />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Configure Your Trading Bot
            </CardTitle>
            <p className="text-slate-400 mt-2">
              Set up your AI-powered trading bot parameters
            </p>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="bot-name" className="text-slate-300">Bot Name</Label>
                  <Input
                    id="bot-name"
                    type="text"
                    value={botName}
                    onChange={(e) => setBotName(e.target.value)}
                    placeholder="My Trading Bot"
                    className="bg-slate-700 border-slate-600 text-white"
                    required
                  />
                </div>
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
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                disabled={isLoading}
              >
                {isLoading ? 'Configuring...' : 'Configure Bot'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}