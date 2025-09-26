/**
 * Comprehensive Input Validation for CryptoPulse Backend
 * Implements strict validation for all user inputs
 * 
 * @author Shrikant Telang
 * @version 2.0.0
 */

const Joi = require('joi');

/**
 * Input validation schemas
 */
const validationSchemas = {
  userRegistration: Joi.object({
    email: Joi.string().email().required().max(255),
    password: Joi.string()
      .min(8)
      .max(128)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .required()
      .messages({
        'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
      }),
    username: Joi.string().alphanum().min(3).max(30).required(),
    acceptTerms: Joi.boolean().valid(true).required()
  }),
  
  userLogin: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  }),
  
  tradingOrder: Joi.object({
    action: Joi.string().valid('BUY', 'SELL').required(),
    pair: Joi.string().pattern(/^[A-Z]{3,10}\/[A-Z]{3,10}$/).required(),
    amount: Joi.number().positive().max(1000000).required(),
    strategy: Joi.string().valid('conservative', 'moderate', 'aggressive').required(),
    stopLoss: Joi.number().positive().optional(),
    takeProfit: Joi.number().positive().optional()
  }),
  
  portfolioUpdate: Joi.object({
    name: Joi.string().min(1).max(100).required(),
    assets: Joi.array().items(
      Joi.object({
        pair: Joi.string().required(),
        amount: Joi.number().positive().required(),
        cost: Joi.number().positive().required()
      })
    ).max(50).required()
  }),
  
  marketDataRequest: Joi.object({
    pair: Joi.string().pattern(/^[A-Z]{3,10}\/[A-Z]{3,10}$/).required(),
    timeframe: Joi.string().valid('1m', '5m', '15m', '1h', '4h', '1d', '1w').required(),
    limit: Joi.number().integer().min(1).max(1000).optional()
  }),
  
  riskAssessment: Joi.object({
    portfolio: Joi.object({
      assets: Joi.array().items(
        Joi.object({
          pair: Joi.string().required(),
          amount: Joi.number().positive().required(),
          cost: Joi.number().positive().required()
        })
      ).required()
    }).required()
  })
};

/**
 * Input validation middleware
 */
const validateInput = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, { 
      abortEarly: false,
      stripUnknown: true 
    });
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Invalid input data',
        errors
      });
    }
    
    req.body = value;
    next();
  };
};

/**
 * Query parameter validation
 */
const validateQuery = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query, { 
      abortEarly: false,
      stripUnknown: true 
    });
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Invalid query parameters',
        errors
      });
    }
    
    req.query = value;
    next();
  };
};

/**
 * Sanitize input data
 */
const sanitizeInput = (input) => {
  if (typeof input === 'string') {
    return input
      .replace(/[<>]/g, '')
      .replace(/['"]/g, '')
      .replace(/[;]/g, '')
      .replace(/[--]/g, '')
      .replace(/[/*]/g, '')
      .trim();
  }
  return input;
};

/**
 * Sanitize HTML content
 */
const sanitizeHtml = (input) => {
  if (typeof input === 'string') {
    return input
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }
  return input;
};

module.exports = {
  validationSchemas,
  validateInput,
  validateQuery,
  sanitizeInput,
  sanitizeHtml
};
