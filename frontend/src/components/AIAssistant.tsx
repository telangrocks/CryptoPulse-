import { Brain, MessageSquare, Send, X } from 'lucide-react';
import React, { useState, useCallback, useEffect } from 'react';

import { useAIAssistant } from '../hooks/useAIAssistant';

interface AIAssistantProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
  category?: 'trading' | 'technical' | 'risk' | 'general' | 'troubleshooting';
}

export default function AIAssistant({ isOpen, onClose }: AIAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { processQuery, getSuggestions, getUserRecommendations } = useAIAssistant();

  // Initialize with welcome message
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{
        id: 'welcome',
        content: 'Hello! I\'m your AI trading assistant. How can I help you today?',
        isUser: false,
        timestamp: new Date(),
        category: 'general'
      }]);
    }
  }, [isOpen, messages.length]);

  const handleSendMessage = useCallback(async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user_${Date.now()}`,
      content: inputValue.trim(),
      isUser: true,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await processQuery(inputValue.trim());
      
      const aiMessage: Message = {
        id: `ai_${Date.now()}`,
        content: response.success ? response.result?.response || 'I couldn\'t process your query.' : response.error || 'An error occurred.',
        isUser: false,
        timestamp: new Date(),
        category: response.result?.category
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: `error_${Date.now()}`,
        content: 'Sorry, I encountered an error processing your request. Please try again.',
        isUser: false,
        timestamp: new Date(),
        category: 'troubleshooting'
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [inputValue, isLoading, processQuery]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-slate-900 border border-slate-700 rounded-lg w-full max-w-4xl h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <div className="flex items-center space-x-2">
            <Brain className="h-6 w-6 text-purple-400" />
            <h2 className="text-xl font-semibold text-white">AI Trading Assistant</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-slate-400" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  message.isUser
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-800 text-slate-200 border border-slate-700'
                }`}
              >
                <div className="flex items-center space-x-2 mb-1">
                  {!message.isUser && (
                    <Brain className="h-4 w-4 text-purple-400" />
                  )}
                  <span className="text-xs text-slate-400">
                    {message.timestamp.toLocaleTimeString()}
                  </span>
                  {message.category && (
                    <span className="text-xs px-2 py-1 bg-slate-700 rounded">
                      {message.category}
                    </span>
                  )}
                </div>
                <p className="whitespace-pre-wrap">{message.content}</p>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-slate-800 text-slate-200 border border-slate-700 rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <Brain className="h-4 w-4 text-purple-400" />
                  <span className="text-sm">AI is thinking...</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="p-4 border-t border-slate-700">
          <div className="flex space-x-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me about trading strategies, market analysis, or risk management..."
              className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-purple-500"
              disabled={isLoading}
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isLoading}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center space-x-2"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
          
          {/* Quick suggestions */}
          <div className="mt-2 flex flex-wrap gap-2">
            {[
              'Analyze BTC/USDT trend',
              'Suggest risk management strategy',
              'Explain MACD indicator',
              'Help with position sizing'
            ].map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => setInputValue(suggestion)}
                className="text-xs px-2 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded text-slate-300 transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
