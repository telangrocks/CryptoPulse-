/**
 * Backtesting API Routes - Production-Ready Backtesting/Simulation Endpoints
 * 
 * This module provides comprehensive backtesting API endpoints
 * for strategy testing and simulation.
 */

const express = require('express');
const { backtestingEngine } = require('../lib/backtestingEngine');
const { authenticateToken, requireRole } = require('../lib/auth');
const { logger } = require('../lib/logging');
const { rateLimitByUser } = require('../lib/auth');
const backtestingConfig = require('../config/backtesting.config');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Apply rate limiting
router.use(rateLimitByUser(50, 3600000)); // 50 requests per hour per user

/**
 * POST /api/backtesting/run
 * Run a backtest
 */
router.post('/run', async (req, res) => {
  try {
    const userId = req.user.id;
    const { strategy, options = {} } = req.body;

    if (!strategy) {
      return res.status(400).json({
        success: false,
        message: 'Strategy is required',
      });
    }

    // Add user-specific options
    const backtestOptions = {
      ...options,
      userId,
      timestamp: Date.now(),
    };

    // Run backtest
    const result = await backtestingEngine.runBacktest(strategy, backtestOptions);

    res.json({
      success: result.success,
      data: result.success ? result.results : null,
      error: result.success ? null : result.error,
      backtestId: result.backtestId,
      executionTime: result.executionTime,
    });
  } catch (error) {
    logger.error('Backtest API error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to run backtest',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    });
  }
});

/**
 * POST /api/backtesting/optimize
 * Run parameter optimization
 */
router.post('/optimize', async (req, res) => {
  try {
    const userId = req.user.id;
    const { strategy, parameterRanges, options = {} } = req.body;

    if (!strategy) {
      return res.status(400).json({
        success: false,
        message: 'Strategy is required',
      });
    }

    if (!parameterRanges || Object.keys(parameterRanges).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Parameter ranges are required',
      });
    }

    // Add user-specific options
    const optimizationOptions = {
      ...options,
      userId,
      timestamp: Date.now(),
    };

    // Run optimization
    const result = await backtestingEngine.runOptimization(
      strategy, 
      parameterRanges, 
      optimizationOptions
    );

    res.json({
      success: result.success,
      data: result.success ? {
        results: result.results,
        bestParameters: result.bestParameters,
        bestResult: result.bestResult,
      } : null,
      error: result.success ? null : result.error,
      optimizationId: result.optimizationId,
      totalCombinations: result.totalCombinations,
      successfulTests: result.successfulTests,
      executionTime: result.executionTime,
    });
  } catch (error) {
    logger.error('Optimization API error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to run optimization',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    });
  }
});

/**
 * POST /api/backtesting/walk-forward
 * Run walk-forward analysis
 */
router.post('/walk-forward', async (req, res) => {
  try {
    const userId = req.user.id;
    const { strategy, options = {} } = req.body;

    if (!strategy) {
      return res.status(400).json({
        success: false,
        message: 'Strategy is required',
      });
    }

    // Add user-specific options
    const analysisOptions = {
      ...options,
      userId,
      timestamp: Date.now(),
    };

    // Run walk-forward analysis
    const result = await backtestingEngine.runWalkForwardAnalysis(
      strategy, 
      analysisOptions
    );

    res.json({
      success: result.success,
      data: result.success ? {
        results: result.results,
        overallPerformance: result.overallPerformance,
      } : null,
      error: result.success ? null : result.error,
      analysisId: result.analysisId,
      totalPeriods: result.totalPeriods,
      executionTime: result.executionTime,
    });
  } catch (error) {
    logger.error('Walk-forward analysis API error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to run walk-forward analysis',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    });
  }
});

/**
 * GET /api/backtesting/results/:backtestId
 * Get backtest results
 */
router.get('/results/:backtestId', async (req, res) => {
  try {
    const { backtestId } = req.params;
    
    if (!backtestId) {
      return res.status(400).json({
        success: false,
        message: 'Backtest ID is required',
      });
    }

    const results = backtestingEngine.getBacktestResults(backtestId);
    
    if (!results) {
      return res.status(404).json({
        success: false,
        message: 'Backtest results not found',
      });
    }

    res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    logger.error('Get backtest results API error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get backtest results',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    });
  }
});

/**
 * GET /api/backtesting/results
 * Get all backtest results
 */
router.get('/results', async (req, res) => {
  try {
    const { limit = 10, offset = 0 } = req.query;
    const allResults = backtestingEngine.getAllResults();
    
    // Apply pagination
    const results = allResults.slice(offset, offset + parseInt(limit));

    res.json({
      success: true,
      data: {
        results,
        total: allResults.length,
        limit: parseInt(limit),
        offset: parseInt(offset),
      },
    });
  } catch (error) {
    logger.error('Get all backtest results API error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get backtest results',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    });
  }
});

/**
 * GET /api/backtesting/status
 * Get backtesting engine status
 */
router.get('/status', async (req, res) => {
  try {
    const status = backtestingEngine.getStatus();

    res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    logger.error('Get backtesting status API error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get backtesting status',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    });
  }
});

/**
 * POST /api/backtesting/cancel
 * Cancel running backtest
 */
router.post('/cancel', async (req, res) => {
  try {
    const cancelled = backtestingEngine.cancelBacktest();

    res.json({
      success: true,
      message: cancelled ? 'Backtest cancelled successfully' : 'No running backtest to cancel',
      data: { cancelled },
    });
  } catch (error) {
    logger.error('Cancel backtest API error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel backtest',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    });
  }
});

/**
 * DELETE /api/backtesting/results
 * Clear old backtest results
 */
router.delete('/results', async (req, res) => {
  try {
    const { olderThanHours = 24 } = req.query;
    const clearedCount = backtestingEngine.clearResults(parseInt(olderThanHours));

    res.json({
      success: true,
      message: `Cleared ${clearedCount} old backtest results`,
      data: { clearedCount },
    });
  } catch (error) {
    logger.error('Clear backtest results API error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear backtest results',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    });
  }
});

/**
 * GET /api/backtesting/templates
 * Get strategy templates
 */
router.get('/templates', async (req, res) => {
  try {
    const templates = Object.entries(backtestingConfig.strategyTemplates).map(([id, template]) => ({
      id,
      ...template,
    }));

    res.json({
      success: true,
      data: templates,
    });
  } catch (error) {
    logger.error('Get strategy templates API error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get strategy templates',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    });
  }
});

/**
 * POST /api/backtesting/validate
 * Validate strategy configuration
 */
router.post('/validate', async (req, res) => {
  try {
    const { strategy, options = {} } = req.body;

    if (!strategy) {
      return res.status(400).json({
        success: false,
        message: 'Strategy is required',
      });
    }

    // Validate strategy structure
    const validation = {
      valid: true,
      errors: [],
      warnings: [],
    };

    // Check required fields
    if (!strategy.name) {
      validation.valid = false;
      validation.errors.push('Strategy name is required');
    }

    if (!strategy.parameters) {
      validation.valid = false;
      validation.errors.push('Strategy parameters are required');
    }

    if (!strategy.entryConditions) {
      validation.valid = false;
      validation.errors.push('Strategy entry conditions are required');
    }

    if (!strategy.exitConditions) {
      validation.valid = false;
      validation.errors.push('Strategy exit conditions are required');
    }

    // Validate parameters
    if (strategy.parameters) {
      if (strategy.parameters.stopLoss && (strategy.parameters.stopLoss <= 0 || strategy.parameters.stopLoss > 0.5)) {
        validation.warnings.push('Stop loss should be between 0 and 50%');
      }

      if (strategy.parameters.takeProfit && (strategy.parameters.takeProfit <= 0 || strategy.parameters.takeProfit > 1)) {
        validation.warnings.push('Take profit should be between 0 and 100%');
      }

      if (strategy.parameters.stopLoss && strategy.parameters.takeProfit) {
        if (strategy.parameters.takeProfit <= strategy.parameters.stopLoss) {
          validation.warnings.push('Take profit should be greater than stop loss');
        }
      }
    }

    // Validate options
    if (options.initialCapital && options.initialCapital <= 0) {
      validation.valid = false;
      validation.errors.push('Initial capital must be positive');
    }

    if (options.startDate && options.endDate) {
      const startDate = new Date(options.startDate);
      const endDate = new Date(options.endDate);
      
      if (startDate >= endDate) {
        validation.valid = false;
        validation.errors.push('Start date must be before end date');
      }
      
      const daysDiff = (endDate - startDate) / (1000 * 60 * 60 * 24);
      if (daysDiff < 1) {
        validation.warnings.push('Backtest period is very short (less than 1 day)');
      }
    }

    res.json({
      success: true,
      data: validation,
    });
  } catch (error) {
    logger.error('Validate strategy API error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to validate strategy',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    });
  }
});

/**
 * GET /api/backtesting/metrics
 * Get backtesting engine metrics
 */
router.get('/metrics', async (req, res) => {
  try {
    const status = backtestingEngine.getStatus();
    const metrics = status.metrics;

    res.json({
      success: true,
      data: {
        ...metrics,
        utilization: {
          totalResults: status.totalResults,
          averageExecutionTime: metrics.averageExecutionTime,
          successRate: metrics.totalBacktests > 0 ? metrics.successfulBacktests / metrics.totalBacktests : 0,
        },
      },
    });
  } catch (error) {
    logger.error('Get backtesting metrics API error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get backtesting metrics',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    });
  }
});

/**
 * GET /api/backtesting/health
 * Health check for backtesting engine
 */
router.get('/health', async (req, res) => {
  try {
    const status = backtestingEngine.getStatus();
    
    const health = {
      status: 'healthy',
      timestamp: Date.now(),
      engine: {
        isRunning: status.isRunning,
        totalBacktests: status.metrics.totalBacktests,
        successRate: status.metrics.totalBacktests > 0 
          ? status.metrics.successfulBacktests / status.metrics.totalBacktests 
          : 0,
        averageExecutionTime: status.metrics.averageExecutionTime,
        totalResults: status.totalResults,
      },
    };

    // Check for issues
    if (status.metrics.failedBacktests > status.metrics.successfulBacktests) {
      health.status = 'degraded';
      health.issues = ['High failure rate detected'];
    }

    if (status.metrics.averageExecutionTime > 300000) { // 5 minutes
      health.status = 'degraded';
      health.issues = health.issues || [];
      health.issues.push('Slow execution times detected');
    }

    res.json({
      success: true,
      data: health,
    });
  } catch (error) {
    logger.error('Backtesting health check API error:', error);
    res.status(500).json({
      success: false,
      message: 'Backtesting engine unhealthy',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    });
  }
});

module.exports = router;
