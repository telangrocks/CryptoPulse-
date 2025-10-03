/**
 * Risk Management API Routes - Production-Ready Risk/Safety/Validation Endpoints
 * 
 * This module provides comprehensive risk management API endpoints
 * for the backend, complementing the risk management system.
 */

const express = require('express');
const { riskManager } = require('../lib/riskManager');
const { authenticateToken, requireRole } = require('../lib/auth');
const { logger } = require('../lib/logging');
const { rateLimitByUser } = require('../lib/auth');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Apply rate limiting
router.use(rateLimitByUser(100, 3600000)); // 100 requests per hour per user

/**
 * GET /api/risk/summary
 * Get risk summary for a user
 */
router.get('/summary', async (req, res) => {
  try {
    const userId = req.user.id;
    const summary = await riskManager.getRiskSummary(userId);

    if (!summary) {
      return res.status(404).json({
        success: false,
        message: 'Risk summary not found',
      });
    }

    res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    logger.error('Risk summary API error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch risk summary',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    });
  }
});

/**
 * POST /api/risk/validate-signal
 * Validate a trading signal
 */
router.post('/validate-signal', async (req, res) => {
  try {
    const userId = req.user.id;
    const { signal, portfolioValue } = req.body;

    if (!signal || !portfolioValue) {
      return res.status(400).json({
        success: false,
        message: 'Signal and portfolio value are required',
      });
    }

    const validation = await riskManager.validateSignal(signal, userId, portfolioValue);

    res.json({
      success: true,
      data: validation,
    });
  } catch (error) {
    logger.error('Signal validation API error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to validate signal',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    });
  }
});

/**
 * GET /api/risk/alerts
 * Get risk alerts for a user
 */
router.get('/alerts', async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 10, offset = 0 } = req.query;

    // Get user's risk summary to access alerts
    const summary = await riskManager.getRiskSummary(userId);
    
    if (!summary) {
      return res.status(404).json({
        success: false,
        message: 'No risk data found',
      });
    }

    const alerts = summary.alerts.slice(offset, offset + parseInt(limit));

    res.json({
      success: true,
      data: {
        alerts,
        total: summary.alerts.length,
        limit: parseInt(limit),
        offset: parseInt(offset),
      },
    });
  } catch (error) {
    logger.error('Risk alerts API error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch risk alerts',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    });
  }
});

/**
 * GET /api/risk/limits
 * Get risk limits for a user
 */
router.get('/limits', async (req, res) => {
  try {
    const userId = req.user.id;
    const summary = await riskManager.getRiskSummary(userId);

    if (!summary) {
      return res.status(404).json({
        success: false,
        message: 'Risk data not found',
      });
    }

    const limits = {
      maxConcurrentTrades: summary.maxConcurrentTrades,
      maxDailyTrades: summary.maxDailyTrades,
      maxDrawdown: summary.maxDrawdown,
      maxDailyLoss: summary.maxDailyLoss,
      currentUsage: {
        activeTrades: summary.activeTrades,
        dailyTrades: summary.dailyTrades,
        currentDrawdown: summary.currentDrawdown,
        dailyLoss: summary.dailyLoss,
      },
    };

    res.json({
      success: true,
      data: limits,
    });
  } catch (error) {
    logger.error('Risk limits API error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch risk limits',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    });
  }
});

/**
 * GET /api/risk/health
 * Get risk management system health status
 */
router.get('/health', async (req, res) => {
  try {
    const healthCheck = await riskManager.healthCheck();

    res.json({
      success: true,
      data: healthCheck,
    });
  } catch (error) {
    logger.error('Risk health check API error:', error);
    res.status(500).json({
      success: false,
      message: 'Risk management system unhealthy',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    });
  }
});

/**
 * POST /api/risk/config
 * Update risk configuration (admin only)
 */
router.post('/config', requireRole('admin'), async (req, res) => {
  try {
    const { config } = req.body;

    if (!config || typeof config !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Configuration object is required',
      });
    }

    riskManager.updateConfig(config);

    res.json({
      success: true,
      message: 'Risk configuration updated successfully',
    });
  } catch (error) {
    logger.error('Risk config update API error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update risk configuration',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    });
  }
});

/**
 * POST /api/risk/reset-metrics
 * Reset daily risk metrics (admin only)
 */
router.post('/reset-metrics', requireRole('admin'), async (req, res) => {
  try {
    riskManager.resetDailyMetrics();

    res.json({
      success: true,
      message: 'Daily risk metrics reset successfully',
    });
  } catch (error) {
    logger.error('Risk metrics reset API error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset risk metrics',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    });
  }
});

/**
 * GET /api/risk/circuit-breaker
 * Get circuit breaker status
 */
router.get('/circuit-breaker', async (req, res) => {
  try {
    const summary = await riskManager.getRiskSummary(req.user.id);

    if (!summary) {
      return res.status(404).json({
        success: false,
        message: 'Risk data not found',
      });
    }

    res.json({
      success: true,
      data: {
        status: summary.circuitBreakerStatus,
        isOpen: summary.circuitBreakerStatus === 'OPEN',
      },
    });
  } catch (error) {
    logger.error('Circuit breaker status API error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch circuit breaker status',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    });
  }
});

/**
 * POST /api/risk/circuit-breaker/reset
 * Reset circuit breaker (admin only)
 */
router.post('/circuit-breaker/reset', requireRole('admin'), async (req, res) => {
  try {
    riskManager.resetCircuitBreaker();

    res.json({
      success: true,
      message: 'Circuit breaker reset successfully',
    });
  } catch (error) {
    logger.error('Circuit breaker reset API error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset circuit breaker',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    });
  }
});

/**
 * GET /api/risk/resources
 * Get resource usage metrics
 */
router.get('/resources', async (req, res) => {
  try {
    const summary = await riskManager.getRiskSummary(req.user.id);

    if (!summary) {
      return res.status(404).json({
        success: false,
        message: 'Risk data not found',
      });
    }

    res.json({
      success: true,
      data: summary.resourceStatus,
    });
  } catch (error) {
    logger.error('Resource metrics API error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch resource metrics',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    });
  }
});

/**
 * GET /api/risk/threats
 * Get threat detection metrics
 */
router.get('/threats', async (req, res) => {
  try {
    const summary = await riskManager.getRiskSummary(req.user.id);

    if (!summary) {
      return res.status(404).json({
        success: false,
        message: 'Risk data not found',
      });
    }

    res.json({
      success: true,
      data: {
        threatLevel: summary.threatLevel,
        alerts: summary.alerts.filter(alert => 
          alert.level === 'HIGH' || alert.level === 'CRITICAL'
        ),
      },
    });
  } catch (error) {
    logger.error('Threat metrics API error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch threat metrics',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    });
  }
});

/**
 * POST /api/risk/alert
 * Generate a custom risk alert (admin only)
 */
router.post('/alert', requireRole('admin'), async (req, res) => {
  try {
    const { level, message, data } = req.body;

    if (!level || !message) {
      return res.status(400).json({
        success: false,
        message: 'Alert level and message are required',
      });
    }

    const alert = riskManager.generateRiskAlert(level, message, data);

    res.json({
      success: true,
      data: alert,
      message: 'Risk alert generated successfully',
    });
  } catch (error) {
    logger.error('Risk alert generation API error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate risk alert',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    });
  }
});

/**
 * GET /api/risk/validation-rules
 * Get validation rules for frontend
 */
router.get('/validation-rules', async (req, res) => {
  try {
    const rules = {
      tradingSignal: {
        symbol: {
          pattern: '^[A-Z]{2,10}/[A-Z]{2,10}$',
          message: 'Invalid trading pair format',
        },
        action: {
          allowed: ['BUY', 'SELL'],
          message: 'Action must be BUY or SELL',
        },
        entry: {
          min: 0.0001,
          message: 'Entry price must be positive',
        },
        stopLoss: {
          min: 0.0001,
          message: 'Stop loss must be positive',
        },
        takeProfit: {
          min: 0.0001,
          message: 'Take profit must be positive',
        },
        confidence: {
          min: 0,
          max: 100,
          message: 'Confidence must be between 0 and 100',
        },
        amount: {
          min: 10,
          message: 'Minimum position size is $10',
        },
        leverage: {
          min: 1,
          max: 100,
          message: 'Leverage must be between 1x and 100x',
        },
      },
      portfolio: {
        riskPerTrade: {
          min: 0.001,
          max: 0.1,
          message: 'Risk per trade must be between 0.1% and 10%',
        },
        maxDrawdown: {
          min: 0.01,
          max: 0.5,
          message: 'Max drawdown must be between 1% and 50%',
        },
        concurrentTrades: {
          min: 1,
          max: 20,
          message: 'Concurrent trades must be between 1 and 20',
        },
        dailyTradeLimit: {
          min: 1,
          max: 100,
          message: 'Daily trade limit must be between 1 and 100',
        },
      },
      apiKey: {
        name: {
          minLength: 1,
          maxLength: 50,
          message: 'API key name must be between 1 and 50 characters',
        },
        key: {
          minLength: 10,
          maxLength: 200,
          message: 'API key must be between 10 and 200 characters',
        },
        secret: {
          minLength: 10,
          maxLength: 200,
          message: 'Secret key must be between 10 and 200 characters',
        },
        exchange: {
          allowed: ['binance', 'wazirx', 'coindcx', 'delta', 'coinbase'],
          message: 'Invalid exchange',
        },
      },
    };

    res.json({
      success: true,
      data: rules,
    });
  } catch (error) {
    logger.error('Validation rules API error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch validation rules',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    });
  }
});

/**
 * POST /api/risk/validate-portfolio
 * Validate portfolio configuration
 */
router.post('/validate-portfolio', async (req, res) => {
  try {
    const userId = req.user.id;
    const { portfolioConfig } = req.body;

    if (!portfolioConfig) {
      return res.status(400).json({
        success: false,
        message: 'Portfolio configuration is required',
      });
    }

    // Validate portfolio configuration using risk manager
    const validation = {
      valid: true,
      errors: [],
      warnings: [],
    };

    // Check risk per trade vs max drawdown
    if (portfolioConfig.riskPerTrade * portfolioConfig.maxConcurrentTrades > portfolioConfig.maxDrawdown) {
      validation.warnings.push({
        field: 'riskPerTrade',
        message: 'Total risk exposure may exceed maximum drawdown',
      });
    }

    // Check daily trade limit vs concurrent trades
    if (portfolioConfig.dailyTradeLimit < portfolioConfig.maxConcurrentTrades * 2) {
      validation.warnings.push({
        field: 'dailyTradeLimit',
        message: 'Daily trade limit should be at least 2x the concurrent trade limit',
      });
    }

    // Check individual limits
    if (portfolioConfig.riskPerTrade < 0.001 || portfolioConfig.riskPerTrade > 0.1) {
      validation.valid = false;
      validation.errors.push({
        field: 'riskPerTrade',
        message: 'Risk per trade must be between 0.1% and 10%',
      });
    }

    if (portfolioConfig.maxDrawdown < 0.01 || portfolioConfig.maxDrawdown > 0.5) {
      validation.valid = false;
      validation.errors.push({
        field: 'maxDrawdown',
        message: 'Max drawdown must be between 1% and 50%',
      });
    }

    if (portfolioConfig.maxConcurrentTrades < 1 || portfolioConfig.maxConcurrentTrades > 20) {
      validation.valid = false;
      validation.errors.push({
        field: 'maxConcurrentTrades',
        message: 'Concurrent trades must be between 1 and 20',
      });
    }

    if (portfolioConfig.dailyTradeLimit < 1 || portfolioConfig.dailyTradeLimit > 100) {
      validation.valid = false;
      validation.errors.push({
        field: 'dailyTradeLimit',
        message: 'Daily trade limit must be between 1 and 100',
      });
    }

    res.json({
      success: true,
      data: validation,
    });
  } catch (error) {
    logger.error('Portfolio validation API error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to validate portfolio configuration',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    });
  }
});

/**
 * GET /api/risk/statistics
 * Get risk management statistics (admin only)
 */
router.get('/statistics', requireRole('admin'), async (req, res) => {
  try {
    const { period = '24h' } = req.query;
    
    // Mock statistics - in production, this would query the database
    const statistics = {
      period,
      totalUsers: 1250,
      activeUsers: 890,
      totalTrades: 15678,
      successfulTrades: 14234,
      failedTrades: 1444,
      totalVolume: 12500000,
      averageRiskScore: 23.5,
      circuitBreakerTriggers: 3,
      riskAlerts: {
        low: 45,
        medium: 23,
        high: 8,
        critical: 2,
      },
      topRisks: [
        { symbol: 'BTC/USDT', riskScore: 85, count: 234 },
        { symbol: 'ETH/USDT', riskScore: 78, count: 189 },
        { symbol: 'BNB/USDT', riskScore: 72, count: 156 },
      ],
      systemHealth: {
        memoryUsage: 0.65,
        cpuUsage: 0.45,
        activeConnections: 25,
        requestsPerMinute: 120,
        status: 'HEALTHY',
      },
    };

    res.json({
      success: true,
      data: statistics,
    });
  } catch (error) {
    logger.error('Risk statistics API error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch risk statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    });
  }
});

module.exports = router;
