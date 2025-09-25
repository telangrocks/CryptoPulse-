/**
 * Feature Flag System for Safe Deployments
 * A/B testing and gradual rollout capabilities
 */

const redis = require('redis');
const { logger } = require('./structuredLogger');

class FeatureFlagSystem {
  constructor(config = {}) {
    this.config = {
      redisUrl: config.redisUrl || process.env.REDIS_URL,
      defaultTtl: config.defaultTtl || 3600, // 1 hour
      cachePrefix: config.cachePrefix || 'feature_flags:',
      ...config
    };

    this.flags = new Map();
    this.client = null;
    this.initializeRedis();
  }

  async initializeRedis() {
    try {
      this.client = redis.createClient({
        url: this.config.redisUrl
      });

      await this.client.connect();
      
      logger.info('Feature flag system initialized', {
        type: 'feature_flags',
        redisUrl: this.config.redisUrl
      });

    } catch (error) {
      logger.error('Failed to initialize Redis for feature flags', {
        type: 'feature_flags_error',
        error: error.message
      });
      this.client = null;
    }
  }

  // Feature flag management
  async createFlag(flagName, config) {
    const flagConfig = {
      name: flagName,
      enabled: config.enabled || false,
      rolloutPercentage: config.rolloutPercentage || 0,
      userSegments: config.userSegments || [],
      environment: config.environment || 'production',
      startDate: config.startDate || new Date().toISOString(),
      endDate: config.endDate || null,
      metadata: config.metadata || {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Validate configuration
    this.validateFlagConfig(flagConfig);

    // Store in memory and Redis
    this.flags.set(flagName, flagConfig);
    
    if (this.client) {
      await this.client.setex(
        `${this.config.cachePrefix}${flagName}`,
        this.config.defaultTtl,
        JSON.stringify(flagConfig)
      );
    }

    logger.info('Feature flag created', {
      type: 'feature_flag_created',
      flagName,
      config: flagConfig
    });

    return flagConfig;
  }

  async updateFlag(flagName, updates) {
    const existingFlag = this.flags.get(flagName);
    if (!existingFlag) {
      throw new Error(`Feature flag not found: ${flagName}`);
    }

    const updatedFlag = {
      ...existingFlag,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    // Validate updated configuration
    this.validateFlagConfig(updatedFlag);

    this.flags.set(flagName, updatedFlag);
    
    if (this.client) {
      await this.client.setex(
        `${this.config.cachePrefix}${flagName}`,
        this.config.defaultTtl,
        JSON.stringify(updatedFlag)
      );
    }

    logger.info('Feature flag updated', {
      type: 'feature_flag_updated',
      flagName,
      updates,
      updatedConfig: updatedFlag
    });

    return updatedFlag;
  }

  async deleteFlag(flagName) {
    this.flags.delete(flagName);
    
    if (this.client) {
      await this.client.del(`${this.config.cachePrefix}${flagName}`);
    }

    logger.info('Feature flag deleted', {
      type: 'feature_flag_deleted',
      flagName
    });
  }

  // Feature flag evaluation
  async isEnabled(flagName, context = {}) {
    try {
      // Get flag configuration
      const flagConfig = await this.getFlag(flagName);
      if (!flagConfig) {
        return false;
      }

      // Check if flag is enabled
      if (!flagConfig.enabled) {
        return false;
      }

      // Check date range
      const now = new Date();
      if (flagConfig.startDate && new Date(flagConfig.startDate) > now) {
        return false;
      }
      if (flagConfig.endDate && new Date(flagConfig.endDate) < now) {
        return false;
      }

      // Check environment
      if (flagConfig.environment && flagConfig.environment !== process.env.NODE_ENV) {
        return false;
      }

      // Check user segments
      if (flagConfig.userSegments && flagConfig.userSegments.length > 0) {
        if (!this.isUserInSegment(context.user, flagConfig.userSegments)) {
          return false;
        }
      }

      // Check rollout percentage
      if (flagConfig.rolloutPercentage > 0) {
        if (!this.isUserInRollout(context.user, flagName, flagConfig.rolloutPercentage)) {
          return false;
        }
      }

      // Log flag evaluation
      logger.debug('Feature flag evaluated', {
        type: 'feature_flag_evaluation',
        flagName,
        enabled: true,
        context: {
          userId: context.user?.id,
          environment: process.env.NODE_ENV
        }
      });

      return true;

    } catch (error) {
      logger.error('Feature flag evaluation failed', {
        type: 'feature_flag_evaluation_error',
        flagName,
        error: error.message,
        context
      });
      return false;
    }
  }

  async getFlagValue(flagName, context = {}, defaultValue = null) {
    const isEnabled = await this.isEnabled(flagName, context);
    
    if (!isEnabled) {
      return defaultValue;
    }

    const flagConfig = await this.getFlag(flagName);
    return flagConfig?.metadata?.value || true;
  }

  // A/B testing support
  async getVariant(flagName, context = {}) {
    const isEnabled = await this.isEnabled(flagName, context);
    
    if (!isEnabled) {
      return 'control';
    }

    const flagConfig = await this.getFlag(flagName);
    const variants = flagConfig?.metadata?.variants || ['control', 'treatment'];
    
    // Use user ID for consistent variant assignment
    const userId = context.user?.id || 'anonymous';
    const hash = this.hashString(`${flagName}:${userId}`);
    const variantIndex = hash % variants.length;
    
    const variant = variants[variantIndex];

    logger.debug('A/B test variant assigned', {
      type: 'ab_test_variant',
      flagName,
      variant,
      userId: context.user?.id
    });

    return variant;
  }

  // User segmentation
  isUserInSegment(user, segments) {
    if (!user) return false;

    for (const segment of segments) {
      if (this.evaluateSegment(user, segment)) {
        return true;
      }
    }

    return false;
  }

  evaluateSegment(user, segment) {
    switch (segment.type) {
      case 'user_id':
        return segment.values.includes(user.id);
      
      case 'user_email':
        return segment.values.some(email => user.email?.includes(email));
      
      case 'user_role':
        return segment.values.includes(user.role);
      
      case 'user_created_date':
        const userCreatedDate = new Date(user.createdAt);
        const startDate = new Date(segment.startDate);
        const endDate = new Date(segment.endDate);
        return userCreatedDate >= startDate && userCreatedDate <= endDate;
      
      case 'user_location':
        return segment.values.includes(user.country || user.region);
      
      case 'user_plan':
        return segment.values.includes(user.subscriptionPlan);
      
      case 'custom_attribute':
        return segment.values.includes(user[segment.attribute]);
      
      default:
        return false;
    }
  }

  // Rollout percentage
  isUserInRollout(user, flagName, percentage) {
    if (!user) return false;

    const userId = user.id || 'anonymous';
    const hash = this.hashString(`${flagName}:${userId}`);
    const userPercentage = hash % 100;
    
    return userPercentage < percentage;
  }

  // Utility methods
  async getFlag(flagName) {
    // Check memory cache first
    if (this.flags.has(flagName)) {
      return this.flags.get(flagName);
    }

    // Check Redis cache
    if (this.client) {
      try {
        const cached = await this.client.get(`${this.config.cachePrefix}${flagName}`);
        if (cached) {
          const flagConfig = JSON.parse(cached);
          this.flags.set(flagName, flagConfig);
          return flagConfig;
        }
      } catch (error) {
        logger.warn('Failed to get flag from Redis cache', {
          type: 'feature_flag_cache_error',
          flagName,
          error: error.message
        });
      }
    }

    return null;
  }

  async getAllFlags() {
    const allFlags = Array.from(this.flags.values());
    
    if (this.client) {
      try {
        const keys = await this.client.keys(`${this.config.cachePrefix}*`);
        for (const key of keys) {
          const flagName = key.replace(this.config.cachePrefix, '');
          if (!this.flags.has(flagName)) {
            const cached = await this.client.get(key);
            if (cached) {
              const flagConfig = JSON.parse(cached);
              this.flags.set(flagName, flagConfig);
              allFlags.push(flagConfig);
            }
          }
        }
      } catch (error) {
        logger.warn('Failed to get all flags from Redis', {
          type: 'feature_flag_cache_error',
          error: error.message
        });
      }
    }

    return allFlags;
  }

  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  validateFlagConfig(config) {
    if (!config.name) {
      throw new Error('Feature flag name is required');
    }

    if (config.rolloutPercentage < 0 || config.rolloutPercentage > 100) {
      throw new Error('Rollout percentage must be between 0 and 100');
    }

    if (config.startDate && config.endDate && new Date(config.startDate) > new Date(config.endDate)) {
      throw new Error('Start date must be before end date');
    }

    if (config.userSegments && !Array.isArray(config.userSegments)) {
      throw new Error('User segments must be an array');
    }
  }

  // Analytics and reporting
  async trackFlagUsage(flagName, context, result) {
    const usage = {
      flagName,
      userId: context.user?.id || 'anonymous',
      timestamp: new Date().toISOString(),
      result,
      context: {
        environment: process.env.NODE_ENV,
        userAgent: context.userAgent,
        ip: context.ip
      }
    };

    logger.info('Feature flag usage tracked', {
      type: 'feature_flag_usage',
      usage
    });

    // Store usage analytics in Redis or database
    if (this.client) {
      try {
        await this.client.lpush(
          `feature_flag_usage:${flagName}`,
          JSON.stringify(usage)
        );
        await this.client.expire(
          `feature_flag_usage:${flagName}`,
          86400 * 30 // 30 days
        );
      } catch (error) {
        logger.warn('Failed to store flag usage analytics', {
          type: 'feature_flag_analytics_error',
          flagName,
          error: error.message
        });
      }
    }
  }

  async getFlagUsageStats(flagName, days = 7) {
    if (!this.client) {
      return null;
    }

    try {
      const usageKey = `feature_flag_usage:${flagName}`;
      const usageData = await this.client.lrange(usageKey, 0, -1);
      
      const stats = {
        totalUsage: 0,
        enabledUsage: 0,
        disabledUsage: 0,
        uniqueUsers: new Set(),
        dailyBreakdown: {}
      };

      const cutoffDate = new Date(Date.now() - (days * 24 * 60 * 60 * 1000));

      for (const usageStr of usageData) {
        const usage = JSON.parse(usageStr);
        const usageDate = new Date(usage.timestamp);
        
        if (usageDate >= cutoffDate) {
          stats.totalUsage++;
          stats.uniqueUsers.add(usage.userId);
          
          const day = usageDate.toISOString().split('T')[0];
          if (!stats.dailyBreakdown[day]) {
            stats.dailyBreakdown[day] = { enabled: 0, disabled: 0 };
          }
          
          if (usage.result) {
            stats.enabledUsage++;
            stats.dailyBreakdown[day].enabled++;
          } else {
            stats.disabledUsage++;
            stats.dailyBreakdown[day].disabled++;
          }
        }
      }

      stats.uniqueUserCount = stats.uniqueUsers.size;
      delete stats.uniqueUsers;

      return stats;

    } catch (error) {
      logger.error('Failed to get flag usage stats', {
        type: 'feature_flag_stats_error',
        flagName,
        error: error.message
      });
      return null;
    }
  }

  // Bulk operations
  async createFlags(flags) {
    const results = [];
    
    for (const flag of flags) {
      try {
        const result = await this.createFlag(flag.name, flag.config);
        results.push({ success: true, flag: result });
      } catch (error) {
        results.push({ success: false, error: error.message, flag: flag });
      }
    }

    return results;
  }

  async updateFlags(updates) {
    const results = [];
    
    for (const update of updates) {
      try {
        const result = await this.updateFlag(update.name, update.changes);
        results.push({ success: true, flag: result });
      } catch (error) {
        results.push({ success: false, error: error.message, update: update });
      }
    }

    return results;
  }

  // Cleanup
  async cleanup() {
    if (this.client) {
      await this.client.quit();
    }
  }
}

// Middleware for Express
function featureFlagMiddleware(featureFlagSystem) {
  return (flagName, options = {}) => {
    return async (req, res, next) => {
      try {
        const context = {
          user: req.user,
          userAgent: req.get('User-Agent'),
          ip: req.ip,
          ...options.context
        };

        const isEnabled = await featureFlagSystem.isEnabled(flagName, context);
        
        // Track usage
        await featureFlagSystem.trackFlagUsage(flagName, context, isEnabled);
        
        // Add flag result to request
        req.featureFlags = req.featureFlags || {};
        req.featureFlags[flagName] = isEnabled;
        
        if (options.required && !isEnabled) {
          return res.status(404).json({
            success: false,
            error: {
              type: 'FeatureNotAvailable',
              message: 'This feature is not available'
            }
          });
        }
        
        next();
        
      } catch (error) {
        logger.error('Feature flag middleware error', {
          type: 'feature_flag_middleware_error',
          flagName,
          error: error.message
        });
        
        // Fail open - allow request to continue
        req.featureFlags = req.featureFlags || {};
        req.featureFlags[flagName] = false;
        next();
      }
    };
  };
}

// Create singleton instance
let featureFlagInstance;

function getFeatureFlagSystem() {
  if (!featureFlagInstance) {
    featureFlagInstance = new FeatureFlagSystem();
  }
  return featureFlagInstance;
}

module.exports = { 
  FeatureFlagSystem, 
  getFeatureFlagSystem,
  featureFlagMiddleware 
};
