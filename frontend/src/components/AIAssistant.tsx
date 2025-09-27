import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

import { logError, logWarn, logInfo, logDebug } from '../lib/logger';
import type { AIAssistantProps, Message } from '../types';
import { 
  Bot, 
  Send, 
  Mic, 
  MicOff, 
  Settings, 
  HelpCircle, 
  TrendingUp, 
  Shield, 
  Zap,
  BarChart3,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
  MessageSquare,
  Lightbulb,
  BookOpen,
  Target,
  Activity
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useAIAssistant } from '../hooks/useAIAssistant';

// Types are now imported from types/index.ts

const AIAssistant: React.FC<AIAssistantProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const { processQuery, getSuggestions, getUserRecommendations, getPlatformStatus, isLoading, error } = useAIAssistant();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [activeTab, setActiveTab] = useState('chat');
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Knowledge base for the AI assistant
  const knowledgeBase = {
    features: {
      trading: {
        title: "Trading Features",
        description: "Advanced crypto trading capabilities",
        items: [
          "Real-time market data from Binance and CoinGecko",
          "10+ professional trading strategies",
          "Multi-timeframe analysis (1M to 1D)",
          "Professional risk management system",
          "Real order execution with smart routing",
          "Advanced backtesting with real data",
          "Portfolio-level risk controls",
          "Dynamic position sizing"
        ]
      },
      strategies: {
        title: "Trading Strategies",
        description: "Available trading strategies",
        items: [
          "EMA Crossover + RSI Filter",
          "MACD Divergence Strategy",
          "Bollinger Bands Squeeze",
          "RSI Oversold/Overbought",
          "Moving Average Convergence",
          "Volume Breakout Strategy",
          "Support/Resistance Breakout",
          "Trend Following Strategy",
          "Mean Reversion Strategy",
          "Momentum Strategy"
        ]
      },
      risk: {
        title: "Risk Management",
        description: "Professional risk controls",
        items: [
          "2% maximum portfolio risk per trade",
          "10% maximum drawdown protection",
          "5% maximum daily loss limits",
          "Position correlation analysis",
          "Dynamic stop-loss management",
          "Real-time risk monitoring",
          "Portfolio heat mapping",
          "Kelly Criterion position sizing"
        ]
      },
      technical: {
        title: "Technical Analysis",
        description: "Advanced technical indicators",
        items: [
          "EMA, SMA, MACD, ADX",
          "RSI, Stochastic, CCI, Williams %R",
          "Bollinger Bands, ATR, Keltner Channels",
          "VWAP, OBV, Accumulation/Distribution",
          "Multi-timeframe analysis",
          "Market regime detection",
          "Volatility analysis",
          "Volume profile analysis"
        ]
      },
      ai: {
        title: "AI Automation",
        description: "Machine learning capabilities",
        items: [
          "Adaptive learning algorithms",
          "Signal optimization",
          "Market regime detection",
          "Pattern recognition",
          "Performance analytics",
          "Auto-trading capabilities",
          "Risk-adjusted optimization",
          "Continuous learning from trades"
        ]
      }
    },
    apis: {
      authentication: [
        "registerUser - Create new user account",
        "loginUser - User authentication",
        "requestPasswordReset - Password recovery",
        "resetPassword - Reset user password",
        "validateResetToken - Token validation"
      ],
      trading: [
        "getTopTradingPairs - Get optimized trading pairs",
        "getPairAnalysis - Detailed pair analysis",
        "executeTrade - Execute trading orders",
        "getAccountBalance - Check account balance",
        "runBacktesting - Run strategy backtests"
      ],
      apiKeys: [
        "setupApiKeys - Configure API keys",
        "getDecryptedApiKeys - Retrieve API keys",
        "testApiKeys - Validate API keys",
        "getApiKeyStatus - Check key configuration"
      ],
      payments: [
        "createSubscription - Create payment subscription",
        "getBillingStatus - Check billing status",
        "cashfreeWebhook - Payment webhook handler"
      ],
      monitoring: [
        "getSystemHealth - System health check",
        "getPerformanceMetrics - Performance data",
        "getErrorLogs - Error logging",
        "getUserActivity - User activity tracking"
      ]
    },
    troubleshooting: {
      common: [
        {
          issue: "API key validation failed",
          solution: "Check API key permissions and ensure keys are for the correct exchange",
          category: "api"
        },
        {
          issue: "Trade execution failed",
          solution: "Verify account balance, check risk limits, and ensure market is open",
          category: "trading"
        },
        {
          issue: "Backtesting shows unrealistic results",
          solution: "Ensure you're using real market data and appropriate timeframes",
          category: "backtesting"
        },
        {
          issue: "Session expired",
          solution: "Re-login to refresh your session token",
          category: "auth"
        },
        {
          issue: "Rate limit exceeded",
          solution: "Wait for the rate limit window to reset or upgrade your plan",
          category: "api"
        }
      ]
    }
  };

  // Initialize with welcome message and load recommendations
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{
        id: '1',
        type: 'assistant',
        content: `Welcome to CryptoPulse AI Assistant! 🤖\n\nI'm here to help you with:\n• Trading strategies and analysis\n• Risk management guidance\n• Technical indicators explanation\n• API key setup and troubleshooting\n• Platform features and navigation\n• Performance optimization tips\n\nWhat would you like to know?`,
        timestamp: new Date(),
        category: 'general',
        suggestions: [
          "How do I set up API keys?",
          "What trading strategies are available?",
          "How does risk management work?",
          "Show me backtesting features"
        ]
      }]);
    }

    // Load user recommendations
    const loadRecommendations = async () => {
      try {
        const response = await getUserRecommendations();
        if (response.success && response.recommendations) {
          setRecommendations(response.recommendations);
        }
      } catch (error) {
        logError('Failed to load recommendations:', 'AIAssistant', error);
      }
    };

    loadRecommendations();
  }, [getUserRecommendations]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Speech recognition setup
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputValue(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = () => {
        setIsListening(false);
      };
    }
  }, []);

  const startListening = () => {
    if (recognitionRef.current) {
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const processQueryWrapper = async (query: string): Promise<Message> => {
    try {
      // Call the backend AI Assistant service
      const response = await processQuery(query);
      
      if (response.success && response.result) {
        return {
          id: Date.now().toString(),
          type: 'assistant',
          content: response.result.response,
          timestamp: new Date(),
          category: response.result.category as Message['category'],
          suggestions: response.result.suggestions,
          relatedFeatures: response.result.relatedFeatures
        };
      } else {
        // Fallback to local processing if backend fails
        return await processQueryLocal(query);
      }
    } catch (error) {
      logError('AI Assistant error:', 'AIAssistant', error);
      // Fallback to local processing
      return await processQueryLocal(query);
    }
  };

  // Local fallback processing
  const processQueryLocal = async (query: string): Promise<Message> => {
    const lowerQuery = query.toLowerCase();
    
    // Categorize the query
    let category: Message['category'] = 'general';
    if (lowerQuery.includes('trade') || lowerQuery.includes('strategy') || lowerQuery.includes('backtest')) {
      category = 'trading';
    } else if (lowerQuery.includes('risk') || lowerQuery.includes('portfolio') || lowerQuery.includes('position')) {
      category = 'risk';
    } else if (lowerQuery.includes('api') || lowerQuery.includes('key') || lowerQuery.includes('setup')) {
      category = 'technical';
    } else if (lowerQuery.includes('error') || lowerQuery.includes('problem') || lowerQuery.includes('issue')) {
      category = 'troubleshooting';
    }

    // Generate response based on query
    let response = '';
    let suggestions: string[] = [];
    let relatedFeatures: string[] = [];

    if (lowerQuery.includes('api key') || lowerQuery.includes('setup api')) {
      response = `To set up API keys in CryptoPulse:\n\n1. Go to the API Keys section\n2. Enter your exchange API keys (Binance/Delta)\n3. Set a master password for encryption\n4. Choose key types: Market Data vs Trade Execution\n5. Test the keys to ensure they work\n\n**Important:** Use separate keys for market data and trading to maintain security. Market data keys can only read prices, while trading keys can execute orders.`;
      suggestions = ["How do I test my API keys?", "What's the difference between market data and trading keys?", "Which exchanges are supported?"];
      relatedFeatures = ["APIKeySetup", "getDecryptedApiKeys", "testApiKeys"];
    } else if (lowerQuery.includes('trading strategy') || lowerQuery.includes('strategies')) {
      response = `CryptoPulse offers 10+ professional trading strategies:\n\n**Scalping Strategies (1M-15M):**\n• EMA Crossover + RSI Filter\n• Bollinger Bands Squeeze\n• Volume Breakout Strategy\n\n**Day Trading Strategies (15M-4H):**\n• MACD Divergence Strategy\n• RSI Oversold/Overbought\n• Support/Resistance Breakout\n\n**Swing Trading Strategies (1H-1D):**\n• Moving Average Convergence\n• Trend Following Strategy\n• Mean Reversion Strategy\n\nEach strategy includes real-time backtesting and performance analytics.`;
      suggestions = ["How do I run backtesting?", "What's the best strategy for beginners?", "How does risk management work with strategies?"];
      relatedFeatures = ["BotSetup", "Backtesting", "runBacktesting"];
    } else if (lowerQuery.includes('risk management') || lowerQuery.includes('risk')) {
      response = `CryptoPulse includes enterprise-grade risk management:\n\n**Portfolio Controls:**\n• 2% maximum portfolio risk per trade\n• 10% maximum drawdown protection\n• 5% maximum daily loss limits\n• Maximum 5 concurrent positions\n\n**Position Management:**\n• Dynamic position sizing using Kelly Criterion\n• Correlation analysis between positions\n• Real-time risk monitoring\n• Automatic stop-loss management\n\n**Risk Metrics:**\n• Sharpe ratio calculation\n• Maximum drawdown tracking\n• Value at Risk (VaR) analysis\n• Portfolio heat mapping`;
      suggestions = ["How do I adjust risk parameters?", "What's the Kelly Criterion?", "How does correlation analysis work?"];
      relatedFeatures = ["ProfessionalRiskManager", "TradeExecution", "PerformanceAnalytics"];
    } else if (lowerQuery.includes('backtest') || lowerQuery.includes('backtesting')) {
      response = `CryptoPulse features advanced backtesting with real market data:\n\n**Real Data Integration:**\n• Live data from Binance and CoinGecko\n• Historical OHLC data for accurate testing\n• Multiple timeframe support (1M to 1D)\n\n**Backtesting Features:**\n• Walk-forward analysis\n• Monte Carlo simulation\n• Performance metrics calculation\n• Risk-adjusted returns\n• Drawdown analysis\n\n**Available Metrics:**\n• Win rate and profit factor\n• Sharpe ratio and Sortino ratio\n• Maximum drawdown\n• Risk-reward ratio\n• Total return and volatility`;
      suggestions = ["How do I run a backtest?", "What's walk-forward analysis?", "How accurate are the results?"];
      relatedFeatures = ["Backtesting", "RealBacktestingEngine", "runBacktesting"];
    } else if (lowerQuery.includes('ai') || lowerQuery.includes('automation')) {
      response = `CryptoPulse includes advanced AI automation:\n\n**Machine Learning Features:**\n• Adaptive learning algorithms\n• Signal optimization based on market conditions\n• Market regime detection\n• Pattern recognition and classification\n\n**AI Capabilities:**\n• Auto-trading with risk controls\n• Performance analytics and reporting\n• Continuous learning from trade outcomes\n• Risk-adjusted optimization\n\n**AI Settings:**\n• Learning mode (conservative/aggressive)\n• Risk level configuration\n• Maximum daily trades limit\n• Stop-loss and take-profit percentages`;
      suggestions = ["How do I enable AI automation?", "What's market regime detection?", "How does the AI learn?"];
      relatedFeatures = ["AIAutomation", "getAISettings", "getAIPerformance"];
    } else if (lowerQuery.includes('help') || lowerQuery.includes('how to')) {
      response = `Here's how to get started with CryptoPulse:\n\n**1. Setup & Authentication:**\n• Create account and verify email\n• Set up API keys for your exchange\n• Configure master password for security\n\n**2. Trading Configuration:**\n• Select trading pairs from the dashboard\n• Choose your preferred strategy\n• Set timeframe and risk parameters\n\n**3. Testing & Validation:**\n• Run backtests to validate strategies\n• Check risk metrics and performance\n• Adjust parameters as needed\n\n**4. Live Trading:**\n• Enable live trading when ready\n• Monitor positions and performance\n• Use AI automation for optimization\n\n**5. Monitoring:**\n• Track performance analytics\n• Review trade logs and alerts\n• Optimize based on results`;
      suggestions = ["How do I set up API keys?", "What's the best strategy to start with?", "How do I monitor my trades?"];
      relatedFeatures = ["Dashboard", "APIKeySetup", "BotSetup", "MonitoringDashboard"];
    } else {
      // General response with search through knowledge base
      response = `I understand you're asking about "${query}". Let me help you with that!\n\nBased on your question, here are some relevant features:\n\n**Trading Features:**\n• Real-time market data and analysis\n• Professional trading strategies\n• Advanced backtesting engine\n• Risk management system\n\n**Platform Features:**\n• AI automation and optimization\n• Performance monitoring\n• Alert system\n• Payment integration\n\nCould you be more specific about what you'd like to know? I can help with setup, troubleshooting, or explaining any feature in detail.`;
      suggestions = ["How do I get started?", "Show me trading strategies", "Explain risk management", "Help with API setup"];
      relatedFeatures = ["Dashboard", "BotSetup", "Backtesting", "AIAutomation"];
    }

    return {
      id: Date.now().toString(),
      type: 'assistant',
      content: response,
      timestamp: new Date(),
      category,
      suggestions,
      relatedFeatures
    };
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    // Process query with AI Assistant
    setIsTyping(true);
    try {
      const response = await processQueryWrapper(inputValue);
      setMessages(prev => [...prev, response]);
    } catch (error) {
      logError('Error processing query:', 'AIAssistant', error);
      const errorMessage: Message = {
        id: Date.now().toString(),
        type: 'assistant',
        content: 'I apologize, but I encountered an error processing your request. Please try again.',
        timestamp: new Date(),
        category: 'general'
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion);
  };

  const quickActions = [
    { label: "Setup Guide", icon: BookOpen, action: "How do I get started with CryptoPulse?" },
    { label: "API Keys", icon: Settings, action: "How do I set up API keys?" },
    { label: "Trading Strategies", icon: TrendingUp, action: "What trading strategies are available?" },
    { label: "Risk Management", icon: Shield, action: "How does risk management work?" },
    { label: "Backtesting", icon: BarChart3, action: "How do I run backtesting?" },
    { label: "AI Features", icon: Zap, action: "What AI automation features are available?" },
    { label: "Troubleshooting", icon: AlertTriangle, action: "I'm having issues with the platform" },
    { label: "Performance", icon: Activity, action: "How do I monitor my trading performance?" }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl h-[80vh] flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center space-x-2">
            <Bot className="h-6 w-6 text-blue-500" />
            <CardTitle>CryptoPulse AI Assistant</CardTitle>
            <Badge variant="secondary">Live</Badge>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <XCircle className="h-4 w-4" />
          </Button>
        </CardHeader>
        
        <CardContent className="flex-1 flex flex-col p-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="chat">Chat</TabsTrigger>
              <TabsTrigger value="help">Help Center</TabsTrigger>
            </TabsList>
            
            <TabsContent value="chat" className="flex-1 flex flex-col">
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg p-3 ${
                          message.type === 'user'
                            ? 'bg-blue-500 text-white'
                            : message.type === 'system'
                            ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                            : 'bg-gray-100 text-gray-900'
                        }`}
                      >
                        <div className="whitespace-pre-wrap">{message.content}</div>
                        <div className="text-xs opacity-70 mt-1">
                          {message.timestamp.toLocaleTimeString()}
                        </div>
                        
                        {message.suggestions && message.suggestions.length > 0 && (
                          <div className="mt-2 space-y-1">
                            <div className="text-xs font-medium">Suggestions:</div>
                            {message.suggestions.map((suggestion, index) => (
                              <Button
                                key={index}
                                variant="outline"
                                size="sm"
                                className="text-xs h-6 mr-1 mb-1"
                                onClick={() => handleSuggestionClick(suggestion)}
                              >
                                {suggestion}
                              </Button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {isTyping && (
                    <div className="flex justify-start">
                      <div className="bg-gray-100 rounded-lg p-3 flex items-center space-x-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm text-gray-600">AI is thinking...</span>
                      </div>
                    </div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>
              
              <div className="border-t p-4">
                <div className="flex space-x-2">
                  <Input
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Ask me anything about CryptoPulse..."
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={isListening ? stopListening : startListening}
                    className={isListening ? 'bg-red-100 text-red-600' : ''}
                  >
                    {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  </Button>
                  <Button onClick={handleSendMessage} disabled={!inputValue.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="help" className="flex-1 p-4">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {quickActions.map((action, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        className="h-auto p-3 flex flex-col items-start space-y-1"
                        onClick={() => {
                          setInputValue(action.action);
                          setActiveTab('chat');
                        }}
                      >
                        <action.icon className="h-4 w-4" />
                        <span className="text-sm">{action.label}</span>
                      </Button>
                    ))}
                  </div>
                </div>
                
                {recommendations.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Personalized Recommendations</h3>
                    <div className="space-y-2">
                      {recommendations.map((rec, index) => (
                        <Card key={index} className={`border-l-4 ${
                          rec.priority === 'high' ? 'border-l-red-500' : 
                          rec.priority === 'medium' ? 'border-l-yellow-500' : 
                          'border-l-green-500'
                        }`}>
                          <CardContent className="p-3">
                            <div className="flex items-start justify-between">
                              <div>
                                <h4 className="font-medium text-sm">{rec.title}</h4>
                                <p className="text-xs text-gray-600 mt-1">{rec.description}</p>
                                <p className="text-xs text-blue-600 mt-1">{rec.action}</p>
                              </div>
                              <Badge variant={rec.priority === 'high' ? 'destructive' : rec.priority === 'medium' ? 'default' : 'secondary'}>
                                {rec.priority}
                              </Badge>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
                
                <div>
                  <h3 className="text-lg font-semibold mb-4">Platform Features</h3>
                  <div className="space-y-4">
                    {Object.entries(knowledgeBase.features).map(([key, feature]) => (
                      <Card key={key}>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center space-x-2">
                            {feature.title === "Trading Features" && <TrendingUp className="h-4 w-4" />}
                            {feature.title === "Trading Strategies" && <Target className="h-4 w-4" />}
                            {feature.title === "Risk Management" && <Shield className="h-4 w-4" />}
                            {feature.title === "Technical Analysis" && <BarChart3 className="h-4 w-4" />}
                            {feature.title === "AI Automation" && <Zap className="h-4 w-4" />}
                            <span>{feature.title}</span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <p className="text-sm text-gray-600 mb-2">{feature.description}</p>
                          <ul className="text-xs space-y-1">
                            {feature.items.slice(0, 3).map((item, index) => (
                              <li key={index} className="flex items-start space-x-2">
                                <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                                <span>{item}</span>
                              </li>
                            ))}
                            {feature.items.length > 3 && (
                              <li className="text-gray-500">+{feature.items.length - 3} more features</li>
                            )}
                          </ul>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default AIAssistant;
