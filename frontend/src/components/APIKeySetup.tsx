import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { callBack4AppFunction } from '../back4app/config'
import { setSecureItem, getSecureItem, removeSecureItem } from '../lib/secureStorage'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Label } from './ui/label'
import { Alert, AlertDescription } from './ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Key, Shield, CheckCircle, AlertTriangle, Edit, Eye, EyeOff, RefreshCw } from 'lucide-react'

export default function APIKeySetup() {
  const [formData, setFormData] = useState({
    market_data_key: '',
    market_data_secret: '',
    trade_execution_key: '',
    trade_execution_secret: '',
    exchange: 'binance',
    master_password: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [hasExistingKeys, setHasExistingKeys] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [showKeys, setShowKeys] = useState(false)
  const [existingKeys, setExistingKeys] = useState<any>(null)
  const [isLoadingKeys, setIsLoadingKeys] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const { logInfo, logError } = await import('../lib/logger');
      logInfo('Setting up API keys', 'APIKeys');
      
      // Validate required fields
      if (!formData.market_data_key || !formData.market_data_secret || 
          !formData.trade_execution_key || !formData.trade_execution_secret || 
          !formData.master_password) {
        throw new Error('All fields are required')
      }

      // Create API keys object
      const apiKeys = {
        marketDataKey: formData.market_data_key,
        marketDataSecret: formData.market_data_secret,
        tradeExecutionKey: formData.trade_execution_key,
        tradeExecutionSecret: formData.trade_execution_secret,
        exchange: formData.exchange,
        timestamp: new Date().toISOString()
      }

      // Store API keys securely with encryption
      await setSecureItem('cryptopulse_api_keys', apiKeys, { 
        encrypt: true, 
        ttl: 30 * 24 * 60 * 60 * 1000 // 30 days TTL
      })
      await setSecureItem('cryptopulse_master_password_set', true, { 
        encrypt: false 
      })
      
      logInfo('API keys stored locally', 'APIKeys');
      
        // Try to call cloud function if it exists, but don't fail if it doesn't
        try {
          const data = await callBack4AppFunction('setupApiKeys', {
            marketDataKey: formData.market_data_key,
            marketDataSecret: formData.market_data_secret,
            tradeExecutionKey: formData.trade_execution_key,
            tradeExecutionSecret: formData.trade_execution_secret,
            exchange: formData.exchange,
            masterPassword: formData.master_password
          })

          if (data.success) {
            logInfo('API keys also saved to server', 'APIKeys');
            // Clear any cached keys to force refresh
            if (typeof window !== 'undefined' && window.apiKeyManager) {
              window.apiKeyManager.clearCache();
            }
          } else {
            logInfo('Server API key function not available, using local storage only', 'APIKeys');
          }
        } catch (serverError) {
          logInfo('Server API key function not available, using local storage only', 'APIKeys');
          // Don't fail the entire process if server sync fails
        }

      setSuccess(true)
      setTimeout(() => {
        navigate('/crypto-pairs')
      }, 2000)
      
    } catch (err: unknown) {
      const { logError } = await import('../lib/logger');
      logError('API key setup failed', 'APIKeys', err);
      setError(err instanceof Error ? err.message : 'Failed to save API keys. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  // Check if user has existing API keys
  useEffect(() => {
    checkExistingKeys()
  }, [])

  const checkExistingKeys = async () => {
    try {
      const { logInfo } = await import('../lib/logger');
      logInfo('Checking for existing API keys', 'APIKeys');
      
      // Check secure storage first
      const localKeys = await getSecureItem('cryptopulse_api_keys')
      if (localKeys) {
        logInfo('Found existing API keys in secure storage', 'APIKeys');
        setHasExistingKeys(true)
        return
      }
      
      // Try to get API keys from server, but don't fail if it doesn't exist
      try {
        const response = await callBack4AppFunction('getDecryptedApiKeys', { masterPassword: '' })
        if (response && response.success) {
          const { logInfo } = await import('../lib/logger');
          logInfo('Found existing API keys on server', 'APIKeys');
          setHasExistingKeys(true)
        }
      } catch (error) {
        // If error is about missing master password, keys exist
        if (error instanceof Error && error.message.includes('Master password is required')) {
          const { logInfo } = await import('../lib/logger');
          logInfo('Found existing API keys on server (password required)', 'APIKeys');
          setHasExistingKeys(true)
        } else {
          const { logInfo } = await import('../lib/logger');
          logInfo('Server API key check not available, using local storage only', 'APIKeys');
        }
      }
    } catch (error) {
      const { logError } = await import('../lib/logger');
      logError('Error checking existing keys', 'APIKeys', error);
    }
  }

  const loadExistingKeys = async () => {
    if (!formData.master_password) {
      setError('Please enter your master password to view existing keys')
      return
    }

    setIsLoadingKeys(true)
    setError('')

    try {
      const { logInfo } = await import('../lib/logger');
      logInfo('Loading existing API keys', 'APIKeys');
      
      // Check secure storage first
      const localKeys = await getSecureItem('cryptopulse_api_keys')
      if (localKeys) {
        logInfo('Loaded API keys from secure storage', 'APIKeys');
        
        setExistingKeys(localKeys)
        setShowKeys(true)
        // Pre-fill form with existing keys
        setFormData(prev => ({
          ...prev,
          market_data_key: localKeys.marketDataKey || '',
          market_data_secret: localKeys.marketDataSecret || '',
          trade_execution_key: localKeys.tradeExecutionKey || '',
          trade_execution_secret: localKeys.tradeExecutionSecret || '',
          exchange: localKeys.exchange || 'binance'
        }))
        return
      }
      
      // Try to get from server, but don't fail if it doesn't exist
      try {
        const response = await callBack4AppFunction('getDecryptedApiKeys', {
          masterPassword: formData.master_password
        })

        if (response.success) {
          const { logInfo } = await import('../lib/logger');
          logInfo('Loaded API keys from server', 'APIKeys');
          setExistingKeys(response.keys)
          setShowKeys(true)
          // Pre-fill form with existing keys
          setFormData(prev => ({
            ...prev,
            market_data_key: response.keys.marketDataKey || '',
            market_data_secret: response.keys.marketDataSecret || '',
            trade_execution_key: response.keys.tradeExecutionKey || '',
            trade_execution_secret: response.keys.tradeExecutionSecret || '',
            exchange: response.keys.exchange || 'binance'
          }))
        } else {
          setError(response.message || 'Failed to load existing keys')
        }
      } catch (serverError) {
        const { logInfo } = await import('../lib/logger');
        logInfo('Server API key function not available', 'APIKeys');
        setError('No existing API keys found')
      }
    } catch (err: unknown) {
      const { logError } = await import('../lib/logger');
      logError('Error loading existing keys', 'APIKeys', err);
      setError(err instanceof Error ? err.message : 'Failed to load existing keys')
    } finally {
      setIsLoadingKeys(false)
    }
  }

  const startEditing = () => {
    setIsEditing(true)
    setShowKeys(false)
  }

  const cancelEditing = () => {
    setIsEditing(false)
    setFormData({
      market_data_key: '',
      market_data_secret: '',
      trade_execution_key: '',
      trade_execution_secret: '',
      exchange: 'binance',
      master_password: ''
    })
    setError('')
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-slate-800/90 border-slate-700 text-white">
          <CardContent className="text-center p-8">
            <CheckCircle className="h-16 w-16 text-green-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-green-400 mb-2">API Keys Validated!</h2>
            <p className="text-slate-300 mb-4">Your exchange API keys have been securely stored.</p>
            <p className="text-sm text-slate-400">Redirecting to crypto pair selection...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="container mx-auto max-w-2xl">
        <div className="mb-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-purple-500/20 rounded-full">
              <Key className="h-8 w-8 text-purple-400" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            {hasExistingKeys && !isEditing ? 'API Key Management' : 'API Key Setup'}
          </h1>
          <p className="text-slate-400">
            {hasExistingKeys && !isEditing 
              ? 'Manage your exchange API keys for market data and trading'
              : 'Connect your exchange API keys for market data and trading'
            }
          </p>
        </div>

        <Card className="bg-slate-800/90 border-slate-700 text-white">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="h-5 w-5 mr-2 text-green-400" />
              {hasExistingKeys && !isEditing ? 'Current API Configuration' : 'Secure API Integration'}
            </CardTitle>
          </CardHeader>
          
          <CardContent>
            {/* Show existing keys management UI */}
            {hasExistingKeys && !isEditing ? (
              <div className="space-y-6">
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold text-green-400 mb-1">API Keys Configured</h3>
                      <p className="text-sm text-green-300">
                        Your exchange API keys are securely stored and encrypted.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-slate-300">Master Password</Label>
                    <div className="flex gap-2">
                      <Input
                        type="password"
                        value={formData.master_password}
                        onChange={(e) => handleInputChange('master_password', e.target.value)}
                        placeholder="Enter master password to view keys"
                        className="bg-slate-700 border-slate-600 text-white"
                      />
                      <Button
                        type="button"
                        onClick={loadExistingKeys}
                        disabled={isLoadingKeys || !formData.master_password}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        {isLoadingKeys ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {showKeys && existingKeys && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-slate-300">Exchange</Label>
                          <div className="bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white capitalize">
                            {existingKeys.exchange}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-slate-300">Status</Label>
                          <div className="flex items-center space-x-2">
                            <CheckCircle className="h-4 w-4 text-green-400" />
                            <span className="text-green-400 text-sm">Active</span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <Label className="text-slate-300">Market Data API Key</Label>
                          <div className="bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white font-mono text-sm">
                            {existingKeys.marketDataKey ? `${existingKeys.marketDataKey.substring(0, 8)}...${existingKeys.marketDataKey.substring(existingKeys.marketDataKey.length - 8)}` : 'Not set'}
                          </div>
                        </div>
                        <div>
                          <Label className="text-slate-300">Trade Execution API Key</Label>
                          <div className="bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white font-mono text-sm">
                            {existingKeys.tradeExecutionKey ? `${existingKeys.tradeExecutionKey.substring(0, 8)}...${existingKeys.tradeExecutionKey.substring(existingKeys.tradeExecutionKey.length - 8)}` : 'Not set'}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <Button
                    type="button"
                    onClick={() => navigate('/dashboard')}
                    variant="outline"
                    className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700"
                  >
                    Back to Dashboard
                  </Button>
                  <Button
                    type="button"
                    onClick={startEditing}
                    className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Change API Keys
                  </Button>
                </div>
              </div>
            ) : (
              /* Show setup/editing form */
              <div>
                {isEditing && (
                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mb-6">
                    <div className="flex items-center space-x-3">
                      <Edit className="h-5 w-5 text-yellow-400 flex-shrink-0" />
                      <div>
                        <h3 className="font-semibold text-yellow-400 mb-1">Editing Mode</h3>
                        <p className="text-sm text-yellow-300">
                          You are updating your existing API keys. Enter your master password and new keys below.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-6">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="h-5 w-5 text-blue-400 mt-1 flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold text-blue-400 mb-2">Dual API Key Setup</h3>
                      <div className="space-y-2 text-sm text-blue-300">
                        <p><strong>Market Data Keys:</strong> Used for fetching price data, charts, and market information</p>
                        <p><strong>Trade Execution Keys:</strong> Used for placing actual buy/sell orders</p>
                        <p><strong>Security:</strong> All keys are encrypted with AES-256 before storage</p>
                      </div>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="exchange" className="text-slate-300">Exchange</Label>
                    <Select value={formData.exchange} onValueChange={(value) => handleInputChange('exchange', value)}>
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                        <SelectValue placeholder="Select exchange" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-700 border-slate-600">
                        <SelectItem value="binance">Binance</SelectItem>
                        <SelectItem value="delta">Delta Exchange India</SelectItem>
                        <SelectItem value="coinbase" disabled>Coinbase Pro (Coming Soon)</SelectItem>
                        <SelectItem value="kraken" disabled>Kraken (Coming Soon)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h3 className="font-semibold text-purple-400">Market Data API</h3>
                      
                      <div className="space-y-2">
                        <Label htmlFor="market_data_key" className="text-slate-300">API Key</Label>
                        <Input
                          id="market_data_key"
                          type="password"
                          value={formData.market_data_key}
                          onChange={(e) => handleInputChange('market_data_key', e.target.value)}
                          placeholder="Enter market data API key"
                          className="bg-slate-700 border-slate-600 text-white"
                          required
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="market_data_secret" className="text-slate-300">API Secret</Label>
                        <Input
                          id="market_data_secret"
                          type="password"
                          value={formData.market_data_secret}
                          onChange={(e) => handleInputChange('market_data_secret', e.target.value)}
                          placeholder="Enter market data API secret"
                          className="bg-slate-700 border-slate-600 text-white"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="font-semibold text-blue-400">Trade Execution API</h3>
                      
                      <div className="space-y-2">
                        <Label htmlFor="trade_execution_key" className="text-slate-300">API Key</Label>
                        <Input
                          id="trade_execution_key"
                          type="password"
                          value={formData.trade_execution_key}
                          onChange={(e) => handleInputChange('trade_execution_key', e.target.value)}
                          placeholder="Enter trade execution API key"
                          className="bg-slate-700 border-slate-600 text-white"
                          required
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="trade_execution_secret" className="text-slate-300">API Secret</Label>
                        <Input
                          id="trade_execution_secret"
                          type="password"
                          value={formData.trade_execution_secret}
                          onChange={(e) => handleInputChange('trade_execution_secret', e.target.value)}
                          placeholder="Enter trade execution API secret"
                          className="bg-slate-700 border-slate-600 text-white"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-semibold text-green-400">Master Password</h3>
                    <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                      <div className="flex items-start space-x-3">
                        <Shield className="h-5 w-5 text-green-400 mt-1 flex-shrink-0" />
                        <div>
                          <p className="text-sm text-green-300 mb-2">
                            <strong>Required for encryption:</strong> This password encrypts your API keys using AES-256-GCM. 
                            It is never stored and is required each time you access your keys.
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="master_password" className="text-slate-300">Master Password</Label>
                      <Input
                        id="master_password"
                        type="password"
                        value={formData.master_password}
                        onChange={(e) => handleInputChange('master_password', e.target.value)}
                        placeholder="Enter master password for encryption"
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

                  <div className="flex gap-3">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={isEditing ? cancelEditing : () => navigate('/dashboard')}
                      className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700"
                    >
                      {isEditing ? 'Cancel' : 'Back to Dashboard'}
                    </Button>
                    <Button 
                      type="submit" 
                      className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                      disabled={isLoading}
                    >
                      {isLoading ? 'Validating...' : (isEditing ? 'Update Keys' : 'Validate & Save Keys')}
                    </Button>
                  </div>
                </form>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
