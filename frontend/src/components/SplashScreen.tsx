import {
  Shield,
  BarChart3,
  TrendingUp,
  Zap,
} from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function SplashScreen() {
  const [showFlash, setShowFlash] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const navigate = useNavigate();

  const steps = [
    { icon: Shield, text: 'Initializing Security', color: 'text-blue-400' },
    { icon: BarChart3, text: 'Loading Market Data', color: 'text-green-400' },
    { icon: TrendingUp, text: 'Preparing Analytics', color: 'text-purple-400' },
    { icon: Zap, text: 'Activating Bot', color: 'text-yellow-400' },
  ];

  useEffect(() => {
    const flashTimer = setTimeout(() => {
      setShowFlash(true);
      setTimeout(() => setShowFlash(false), 300);
    }, 1000);

    // Progress animation
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          setIsComplete(true);
          return 100;
        }
        return prev + 1.5;
      });
    }, 30);

    // Step animation
    const stepInterval = setInterval(() => {
      setCurrentStep(prev => (prev + 1) % steps.length);
    }, 800);

    const navigationTimer = setTimeout(() => {
      navigate('/disclaimer');
    }, 4000);

    return () => {
      clearTimeout(flashTimer);
      clearTimeout(navigationTimer);
      clearInterval(progressInterval);
      clearInterval(stepInterval);
    };
  }, [navigate, steps.length]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      {/* Flash overlay */}
      {showFlash && (
        <div className="absolute inset-0 bg-white opacity-30 z-10 animate-pulse" />
      )}

      {/* Enhanced animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
        {/* Floating particles */}
        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-purple-400 rounded-full animate-ping opacity-20" />
        <div className="absolute top-3/4 right-1/4 w-1 h-1 bg-blue-400 rounded-full animate-ping opacity-30" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-1/4 left-1/3 w-1.5 h-1.5 bg-purple-300 rounded-full animate-ping opacity-25" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 right-1/3 w-1 h-1 bg-pink-400 rounded-full animate-ping opacity-20" style={{ animationDelay: '0.5s' }} />
      </div>

      <div className="text-center z-20 animate-fade-in opacity-0" style={{ animation: 'fadeIn 1s ease-out forwards' }}>
        {/* Enhanced Logo Section */}
        <div className="mb-12">
          <div className="relative mb-6">
            <div className="w-32 h-32 mx-auto bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 rounded-3xl flex items-center justify-center shadow-2xl animate-scale-in">
              <TrendingUp className="w-16 h-16 text-white" />
            </div>
            <div className="absolute inset-0 w-32 h-32 mx-auto bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 rounded-3xl blur-xl opacity-50 animate-pulse" />
          </div>

          <h1 className="text-6xl font-black text-white mb-4 bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent animate-slide-in">
            CryptoPulse
          </h1>
          <p className="text-xl text-slate-300 font-medium animate-slide-in" style={{ animationDelay: '0.2s' }}>
            Professional Trading Bot
          </p>
          <p className="text-sm text-slate-400 mt-2 animate-slide-in" style={{ animationDelay: '0.4s' }}>
            Institutional-Grade Cryptocurrency Trading
          </p>
        </div>

        {/* Loading Steps */}
        <div className="mb-8 animate-slide-in" style={{ animationDelay: '0.6s' }}>
          <div className="flex items-center justify-center space-x-4 mb-4">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = index === currentStep;
              const isCompleted = index < currentStep;
              return (
                <div className="flex flex-col items-center" key={index}>
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500 ${
                      isActive
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 shadow-lg scale-110'
                        : isCompleted
                          ? 'bg-green-500 shadow-md'
                          : 'bg-slate-700'
                    }`}
                  >
                    <Icon
                      className={`w-6 h-6 ${
                        isActive || isCompleted ? 'text-white' : 'text-slate-400'
                      }`}
                    />
                  </div>
                  <span
                    className={`text-xs mt-2 transition-all duration-500 ${
                      isActive ? step.color : isCompleted ? 'text-green-400' : 'text-slate-500'
                    }`}
                  >
                    {step.text}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Enhanced Progress Bar */}
        <div className="w-80 mx-auto animate-slide-in" style={{ animationDelay: '0.8s' }}>
          <div className="bg-slate-800/50 rounded-full h-3 mb-4 backdrop-blur-sm border border-slate-700/50">
            <div
              className="bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 h-3 rounded-full transition-all duration-300 relative overflow-hidden"
              style={{ width: `${progress}%` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400 text-sm font-medium">Loading System</span>
            <span className="text-white text-sm font-bold">{Math.round(progress)}%</span>
          </div>
        </div>

        {/* Completion Animation */}
        {isComplete && (
          <div className="mt-8 animate-bounce">
            <div className="inline-flex items-center space-x-2 text-green-400 font-semibold">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span>System Ready</span>
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }} />
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes fadeInUp {
          from {
            opacity: 0; 
            transform: translateY(20px); 
          }
          to {
            opacity: 1; 
            transform: translateY(0); 
          }
        }
      `}
      </style>
    </div>
  );
}
