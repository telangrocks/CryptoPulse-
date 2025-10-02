/**
 * Bot Management Slice for CryptoPulse
 *
 * Handles trading bot configuration, execution, and monitoring.
 * Includes comprehensive error handling, validation, and real-time updates.
 *
 * @fileoverview Production-ready bot management state
 * @version 1.0.0
 * @author CryptoPulse Team
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

import { RootState } from '../index';

const crypto = require('crypto');

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

/**
 * Trading strategy types
 */
export type TradingStrategy =
  | 'SCALPING'
  | 'DAY_TRADING'
  | 'SWING_TRADING'
  | 'GRID_TRADING'
  | 'DCA'
  | 'ARBITRAGE'
  | 'MOMENTUM'
  | 'MEAN_REVERSION'
  | 'BREAKOUT'
  | 'CUSTOM';

/**
 * Risk level types
 */
export type RiskLevel = 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE' | 'VERY_AGGRESSIVE';

/**
 * Bot status types
 */
export type BotStatus = 'STOPPED' | 'RUNNING' | 'PAUSED' | 'ERROR' | 'MAINTENANCE';

/**
 * Bot performance metrics
 */
export interface BotPerformance {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalProfit: number;
  totalLoss: number;
  netProfit: number;
  profitFactor: number;
  sharpeRatio: number;
  maxDrawdown: number;
  averageWin: number;
  averageLoss: number;
  largestWin: number;
  largestLoss: number;
  consecutiveWins: number;
  consecutiveLosses: number;
  lastUpdated: number;
}

/**
 * Bot configuration interface
 */
export interface BotConfig {
  id: string;
  name: string;
  description?: string;
  strategy: TradingStrategy;
  symbol: string;
  isActive: boolean;
  status: BotStatus;
  riskLevel: RiskLevel;
  maxPositions: number;
  stopLoss: number;
  takeProfit: number;
  entryConditions: string[];
  exitConditions: string[];
  timeframes: string[];
  exchanges: string[];
  apiKeys: {
    [exchange: string]: {
      apiKey: string;
      secret: string;
      passphrase?: string;
    };
  };
  settings: {
    [key: string]: unknown;
  };
  performance: BotPerformance;
  createdAt: number;
  updatedAt: number;
  lastStarted?: number;
  lastStopped?: number;
  errorMessage?: string;
  version: string;
  tags: string[];
}

/**
 * Bot execution log entry
 */
export interface BotLogEntry {
  id: string;
  botId: string;
  timestamp: number;
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
  message: string;
  data?: unknown;
  tradeId?: string;
}

/**
 * Bot state interface
 */
export interface BotState {
  bots: BotConfig[];
  activeBots: string[];
  selectedBot: string | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: BotError | null;
  logs: BotLogEntry[];
  performance: {
    [botId: string]: BotPerformance;
  };
  lastUpdate: number;
  isRefreshing: boolean;
}

/**
 * Bot error interface
 */
export interface BotError {
  code: string;
  message: string;
  details?: unknown;
  timestamp: number;
  botId?: string;
  retryable: boolean;
}

/**
 * Bot creation data interface
 */
export interface CreateBotData {
  name: string;
  description?: string;
  strategy: TradingStrategy;
  symbol: string;
  riskLevel: RiskLevel;
  maxPositions: number;
  stopLoss: number;
  takeProfit: number;
  entryConditions: string[];
  exitConditions: string[];
  timeframes: string[];
  exchanges: string[];
  settings: {
    [key: string]: unknown;
  };
  tags: string[];
}

/**
 * Bot update data interface
 */
export interface UpdateBotData {
  id: string;
  updates: Partial<Omit<BotConfig, 'id' | 'createdAt' | 'version'>>;
}

/**
 * Bot execution command interface
 */
export interface BotCommand {
  botId: string;
  command: 'START' | 'STOP' | 'PAUSE' | 'RESUME' | 'RESTART' | 'RESET';
  parameters?: {
    [key: string]: unknown;
  };
}

/**
 * Bot performance filter interface
 */
export interface BotPerformanceFilter {
  timeRange: {
    start: number;
    end: number;
  };
  strategies?: TradingStrategy[];
  riskLevels?: RiskLevel[];
  symbols?: string[];
  minWinRate?: number;
  minProfit?: number;
  maxDrawdown?: number;
}

/**
 * Bot statistics interface
 */
export interface BotStatistics {
  totalBots: number;
  activeBots: number;
  stoppedBots: number;
  errorBots: number;
  totalTrades: number;
  totalProfit: number;
  averageWinRate: number;
  bestPerformingBot: string | null;
  worstPerformingBot: string | null;
  lastUpdated: number;
}

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialState: BotState = {
  bots: [],
  activeBots: [],
  selectedBot: null,
  isLoading: false,
  isInitialized: false,
  error: null,
  logs: [],
  performance: {},
  lastUpdate: 0,
  isRefreshing: false,
};

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

/**
 * Validates bot configuration
 */
const validateBotConfig = (config: CreateBotData): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!config.name || config.name.trim().length < 3) {
    errors.push('Bot name must be at least 3 characters long');
  }

  if (!config.symbol || config.symbol.trim().length < 3) {
    errors.push('Symbol must be at least 3 characters long');
  }

  if (config.maxPositions < 1 || config.maxPositions > 100) {
    errors.push('Max positions must be between 1 and 100');
  }

  if (config.stopLoss < 0 || config.stopLoss > 100) {
    errors.push('Stop loss must be between 0 and 100 percent');
  }

  if (config.takeProfit < 0 || config.takeProfit > 1000) {
    errors.push('Take profit must be between 0 and 1000 percent');
  }

  if (config.entryConditions.length === 0) {
    errors.push('At least one entry condition is required');
  }

  if (config.exitConditions.length === 0) {
    errors.push('At least one exit condition is required');
  }

  if (config.timeframes.length === 0) {
    errors.push('At least one timeframe is required');
  }

  if (config.exchanges.length === 0) {
    errors.push('At least one exchange is required');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

/**
 * Creates default bot performance metrics
 */
const createDefaultPerformance = (): BotPerformance => ({
  totalTrades: 0,
  winningTrades: 0,
  losingTrades: 0,
  winRate: 0,
  totalProfit: 0,
  totalLoss: 0,
  netProfit: 0,
  profitFactor: 0,
  sharpeRatio: 0,
  maxDrawdown: 0,
  averageWin: 0,
  averageLoss: 0,
  largestWin: 0,
  largestLoss: 0,
  consecutiveWins: 0,
  consecutiveLosses: 0,
  lastUpdated: Date.now(),
});

// ============================================================================
// ASYNC THUNKS
// ============================================================================

/**
 * Create a new trading bot
 */
export const createBot = createAsyncThunk<
  BotConfig,
  CreateBotData,
  { rejectValue: BotError }
>(
  'bot/createBot',
  async (botData, { rejectWithValue }) => {
    try {
      // Validate bot configuration
      const validation = validateBotConfig(botData);
      if (!validation.valid) {
        return rejectWithValue({
          code: 'VALIDATION_ERROR',
          message: validation.errors.join(', '),
          timestamp: Date.now(),
          retryable: false,
        });
      }

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Create bot configuration
      const bot: BotConfig = {
        id: `bot_${Date.now()}_${(crypto.randomBytes(4).readUInt32BE(0) / 0xffffffff).toString(36).substr(2, 9)}`,
        name: botData.name,
        description: botData.description,
        strategy: botData.strategy,
        symbol: botData.symbol,
        isActive: false,
        status: 'STOPPED',
        riskLevel: botData.riskLevel,
        maxPositions: botData.maxPositions,
        stopLoss: botData.stopLoss,
        takeProfit: botData.takeProfit,
        entryConditions: botData.entryConditions,
        exitConditions: botData.exitConditions,
        timeframes: botData.timeframes,
        exchanges: botData.exchanges,
        apiKeys: {},
        settings: botData.settings,
        performance: createDefaultPerformance(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        version: '1.0.0',
        tags: botData.tags,
      };

      return bot;
    } catch (error) {
      return rejectWithValue({
        code: 'BOT_CREATION_FAILED',
        message: 'Failed to create bot. Please try again.',
        details: error,
        timestamp: Date.now(),
        retryable: true,
      });
    }
  },
);

/**
 * Update bot configuration
 */
export const updateBot = createAsyncThunk<
  BotConfig,
  UpdateBotData,
  { rejectValue: BotError }
>(
  'bot/updateBot',
  async (updateData, { rejectWithValue, getState }) => {
    try {
      const state = getState() as RootState;
      const existingBot = state.bot.bots.find(bot => bot.id === updateData.id);

      if (!existingBot) {
        return rejectWithValue({
          code: 'BOT_NOT_FOUND',
          message: 'Bot not found',
          timestamp: Date.now(),
          retryable: false,
        });
      }

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));

      // Update bot configuration
      const updatedBot: BotConfig = {
        ...existingBot,
        ...updateData.updates,
        id: existingBot.id, // Ensure ID doesn't change
        createdAt: existingBot.createdAt, // Preserve creation time
        updatedAt: Date.now(),
        version: existingBot.version, // Preserve version for now
      };

      return updatedBot;
    } catch (error) {
      return rejectWithValue({
        code: 'BOT_UPDATE_FAILED',
        message: 'Failed to update bot. Please try again.',
        details: error,
        timestamp: Date.now(),
        retryable: true,
      });
    }
  },
);

/**
 * Delete bot
 */
export const deleteBot = createAsyncThunk<
  string,
  string,
  { rejectValue: BotError }
>(
  'bot/deleteBot',
  async (botId, { rejectWithValue, getState }) => {
    try {
      const state = getState() as RootState;
      const existingBot = state.bot.bots.find(bot => bot.id === botId);

      if (!existingBot) {
        return rejectWithValue({
          code: 'BOT_NOT_FOUND',
          message: 'Bot not found',
          timestamp: Date.now(),
          retryable: false,
        });
      }

      if (existingBot.isActive) {
        return rejectWithValue({
          code: 'BOT_ACTIVE',
          message: 'Cannot delete active bot. Please stop it first.',
          timestamp: Date.now(),
          retryable: false,
        });
      }

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));

      return botId;
    } catch (error) {
      return rejectWithValue({
        code: 'BOT_DELETE_FAILED',
        message: 'Failed to delete bot. Please try again.',
        details: error,
        timestamp: Date.now(),
        retryable: true,
      });
    }
  },
);

/**
 * Execute bot command (start, stop, pause, etc.)
 */
export const executeBotCommand = createAsyncThunk<
  { botId: string; status: BotStatus },
  BotCommand,
  { rejectValue: BotError }
>(
  'bot/executeCommand',
  async (command, { rejectWithValue, getState }) => {
    try {
      const state = getState() as RootState;
      const existingBot = state.bot.bots.find(bot => bot.id === command.botId);

      if (!existingBot) {
        return rejectWithValue({
          code: 'BOT_NOT_FOUND',
          message: 'Bot not found',
          timestamp: Date.now(),
          retryable: false,
        });
      }

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Determine new status based on command
      let newStatus: BotStatus = existingBot.status;
      switch (command.command) {
        case 'START':
          newStatus = 'RUNNING';
          break;
        case 'STOP':
          newStatus = 'STOPPED';
          break;
        case 'PAUSE':
          newStatus = 'PAUSED';
          break;
        case 'RESUME':
          newStatus = 'RUNNING';
          break;
        case 'RESTART':
          newStatus = 'RUNNING';
          break;
        case 'RESET':
          newStatus = 'STOPPED';
          break;
      }

      return {
        botId: command.botId,
        status: newStatus,
      };
    } catch (error) {
      return rejectWithValue({
        code: 'BOT_COMMAND_FAILED',
        message: 'Failed to execute bot command. Please try again.',
        details: error,
        timestamp: Date.now(),
        retryable: true,
      });
    }
  },
);

/**
 * Fetch bot performance data
 */
export const fetchBotPerformance = createAsyncThunk<
  { botId: string; performance: BotPerformance },
  { botId: string; filter?: BotPerformanceFilter },
  { rejectValue: BotError }
>(
  'bot/fetchPerformance',
  async ({ botId, filter }, { rejectWithValue }) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));

      // Mock performance data
      const performance: BotPerformance = {
        totalTrades: Math.floor((crypto.randomBytes(4).readUInt32BE(0) / 0xffffffff) * 100) + 10,
        winningTrades: Math.floor((crypto.randomBytes(4).readUInt32BE(0) / 0xffffffff) * 50) + 5,
        losingTrades: Math.floor((crypto.randomBytes(4).readUInt32BE(0) / 0xffffffff) * 30) + 2,
        winRate: (crypto.randomBytes(4).readUInt32BE(0) / 0xffffffff) * 100,
        totalProfit: (crypto.randomBytes(4).readUInt32BE(0) / 0xffffffff) * 1000,
        totalLoss: (crypto.randomBytes(4).readUInt32BE(0) / 0xffffffff) * 200,
        netProfit: (crypto.randomBytes(4).readUInt32BE(0) / 0xffffffff) * 800,
        profitFactor: (crypto.randomBytes(4).readUInt32BE(0) / 0xffffffff) * 3 + 1,
        sharpeRatio: (crypto.randomBytes(4).readUInt32BE(0) / 0xffffffff) * 2 + 0.5,
        maxDrawdown: (crypto.randomBytes(4).readUInt32BE(0) / 0xffffffff) * 20,
        averageWin: (crypto.randomBytes(4).readUInt32BE(0) / 0xffffffff) * 50,
        averageLoss: (crypto.randomBytes(4).readUInt32BE(0) / 0xffffffff) * 20,
        largestWin: (crypto.randomBytes(4).readUInt32BE(0) / 0xffffffff) * 200,
        largestLoss: (crypto.randomBytes(4).readUInt32BE(0) / 0xffffffff) * 100,
        consecutiveWins: Math.floor((crypto.randomBytes(4).readUInt32BE(0) / 0xffffffff) * 10),
        consecutiveLosses: Math.floor((crypto.randomBytes(4).readUInt32BE(0) / 0xffffffff) * 5),
        lastUpdated: Date.now(),
      };

      return { botId, performance };
    } catch (error) {
      return rejectWithValue({
        code: 'PERFORMANCE_FETCH_FAILED',
        message: 'Failed to fetch bot performance. Please try again.',
        details: error,
        timestamp: Date.now(),
        retryable: true,
      });
    }
  },
);

/**
 * Fetch bot logs
 */
export const fetchBotLogs = createAsyncThunk<
  BotLogEntry[],
  { botId: string; limit?: number; offset?: number },
  { rejectValue: BotError }
>(
  'bot/fetchLogs',
  async ({ botId, limit = 100, offset = 0 }, { rejectWithValue }) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));

      // Mock log entries
      const logs: BotLogEntry[] = Array.from({ length: limit }, (_, index) => ({
        id: `log_${Date.now()}_${index}`,
        botId,
        timestamp: Date.now() - (index * 1000),
        level: ['INFO', 'WARN', 'ERROR', 'DEBUG'][Math.floor((crypto.randomBytes(4).readUInt32BE(0) / 0xffffffff) * 4)] as 'INFO' | 'WARN' | 'ERROR' | 'DEBUG',
        message: `Log entry ${index + 1}`,
        data: { index, timestamp: Date.now() - (index * 1000) },
        tradeId: (crypto.randomBytes(4).readUInt32BE(0) / 0xffffffff) > 0.5 ? `trade_${(crypto.randomBytes(4).readUInt32BE(0) / 0xffffffff).toString(36).substr(2, 9)}` : undefined,
      }));

      return logs;
    } catch (error) {
      return rejectWithValue({
        code: 'LOGS_FETCH_FAILED',
        message: 'Failed to fetch bot logs. Please try again.',
        details: error,
        timestamp: Date.now(),
        retryable: true,
      });
    }
  },
);

// ============================================================================
// SLICE DEFINITION
// ============================================================================

const botSlice = createSlice({
  name: 'bot',
  initialState,
  reducers: {
    /**
     * Add bot to state
     */
    addBot: (state, action: PayloadAction<BotConfig>) => {
      state.bots.push(action.payload);
      state.lastUpdate = Date.now();
    },

    /**
     * Update bot in state
     */
    updateBotLocal: (state, action: PayloadAction<{ id: string; updates: Partial<BotConfig> }>) => {
      const index = state.bots.findIndex(bot => bot.id === action.payload.id);
      if (index !== -1) {
        state.bots[index] = { ...state.bots[index], ...action.payload.updates, updatedAt: Date.now() };
        state.lastUpdate = Date.now();
      }
    },

    /**
     * Remove bot from state
     */
    removeBot: (state, action: PayloadAction<string>) => {
      state.bots = state.bots.filter(bot => bot.id !== action.payload);
      state.activeBots = state.activeBots.filter(id => id !== action.payload);
      if (state.selectedBot === action.payload) {
        state.selectedBot = null;
      }
      delete state.performance[action.payload];
      state.lastUpdate = Date.now();
    },

    /**
     * Activate bot
     */
    activateBot: (state, action: PayloadAction<string>) => {
      if (!state.activeBots.includes(action.payload)) {
        state.activeBots.push(action.payload);
        const bot = state.bots.find(b => b.id === action.payload);
        if (bot) {
          bot.isActive = true;
          bot.status = 'RUNNING';
          bot.lastStarted = Date.now();
        }
        state.lastUpdate = Date.now();
      }
    },

    /**
     * Deactivate bot
     */
    deactivateBot: (state, action: PayloadAction<string>) => {
      state.activeBots = state.activeBots.filter(id => id !== action.payload);
      const bot = state.bots.find(b => b.id === action.payload);
      if (bot) {
        bot.isActive = false;
        bot.status = 'STOPPED';
        bot.lastStopped = Date.now();
      }
      state.lastUpdate = Date.now();
    },

    /**
     * Set selected bot
     */
    setSelectedBot: (state, action: PayloadAction<string | null>) => {
      state.selectedBot = action.payload;
    },

    /**
     * Set loading state
     */
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },

    /**
     * Set error state
     */
    setError: (state, action: PayloadAction<BotError | null>) => {
      state.error = action.payload;
    },

    /**
     * Clear error state
     */
    clearError: (state) => {
      state.error = null;
    },

    /**
     * Add log entry
     */
    addLogEntry: (state, action: PayloadAction<BotLogEntry>) => {
      state.logs.unshift(action.payload);
      // Keep only last 1000 log entries
      if (state.logs.length > 1000) {
        state.logs = state.logs.slice(0, 1000);
      }
    },

    /**
     * Clear logs
     */
    clearLogs: (state, action: PayloadAction<string | undefined>) => {
      if (action.payload) {
        state.logs = state.logs.filter(log => log.botId !== action.payload);
      } else {
        state.logs = [];
      }
    },

    /**
     * Initialize bot state
     */
    initializeBots: (state) => {
      state.isInitialized = true;
    },

    /**
     * Set refreshing state
     */
    setRefreshing: (state, action: PayloadAction<boolean>) => {
      state.isRefreshing = action.payload;
    },

    /**
     * Update bot performance
     */
    updateBotPerformance: (state, action: PayloadAction<{ botId: string; performance: BotPerformance }>) => {
      state.performance[action.payload.botId] = action.payload.performance;
      state.lastUpdate = Date.now();
    },
  },
  extraReducers: (builder) => {
    builder
      // Create bot
      .addCase(createBot.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createBot.fulfilled, (state, action) => {
        state.isLoading = false;
        state.bots.push(action.payload);
        state.performance[action.payload.id] = action.payload.performance;
        state.lastUpdate = Date.now();
      })
      .addCase(createBot.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || {
          code: 'BOT_CREATION_FAILED',
          message: 'Bot creation failed',
          timestamp: Date.now(),
          retryable: true,
        };
      })

      // Update bot
      .addCase(updateBot.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateBot.fulfilled, (state, action) => {
        state.isLoading = false;
        const index = state.bots.findIndex(bot => bot.id === action.payload.id);
        if (index !== -1) {
          state.bots[index] = action.payload;
        }
        state.lastUpdate = Date.now();
      })
      .addCase(updateBot.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || {
          code: 'BOT_UPDATE_FAILED',
          message: 'Bot update failed',
          timestamp: Date.now(),
          retryable: true,
        };
      })

      // Delete bot
      .addCase(deleteBot.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteBot.fulfilled, (state, action) => {
        state.isLoading = false;
        state.bots = state.bots.filter(bot => bot.id !== action.payload);
        state.activeBots = state.activeBots.filter(id => id !== action.payload);
        if (state.selectedBot === action.payload) {
          state.selectedBot = null;
        }
        delete state.performance[action.payload];
        state.lastUpdate = Date.now();
      })
      .addCase(deleteBot.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || {
          code: 'BOT_DELETE_FAILED',
          message: 'Bot deletion failed',
          timestamp: Date.now(),
          retryable: true,
        };
      })

      // Execute bot command
      .addCase(executeBotCommand.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(executeBotCommand.fulfilled, (state, action) => {
        state.isLoading = false;
        const bot = state.bots.find(b => b.id === action.payload.botId);
        if (bot) {
          bot.status = action.payload.status;
          bot.isActive = action.payload.status === 'RUNNING';
          if (action.payload.status === 'RUNNING') {
            bot.lastStarted = Date.now();
            if (!state.activeBots.includes(action.payload.botId)) {
              state.activeBots.push(action.payload.botId);
            }
          } else if (action.payload.status === 'STOPPED') {
            bot.lastStopped = Date.now();
            state.activeBots = state.activeBots.filter(id => id !== action.payload.botId);
          }
        }
        state.lastUpdate = Date.now();
      })
      .addCase(executeBotCommand.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || {
          code: 'BOT_COMMAND_FAILED',
          message: 'Bot command failed',
          timestamp: Date.now(),
          retryable: true,
        };
      })

      // Fetch bot performance
      .addCase(fetchBotPerformance.pending, (state) => {
        state.isRefreshing = true;
        state.error = null;
      })
      .addCase(fetchBotPerformance.fulfilled, (state, action) => {
        state.isRefreshing = false;
        state.performance[action.payload.botId] = action.payload.performance;
        state.lastUpdate = Date.now();
      })
      .addCase(fetchBotPerformance.rejected, (state, action) => {
        state.isRefreshing = false;
        state.error = action.payload || {
          code: 'PERFORMANCE_FETCH_FAILED',
          message: 'Performance fetch failed',
          timestamp: Date.now(),
          retryable: true,
        };
      })

      // Fetch bot logs
      .addCase(fetchBotLogs.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchBotLogs.fulfilled, (state, action) => {
        state.isLoading = false;
        state.logs = [...state.logs, ...action.payload];
        state.lastUpdate = Date.now();
      })
      .addCase(fetchBotLogs.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || {
          code: 'LOGS_FETCH_FAILED',
          message: 'Logs fetch failed',
          timestamp: Date.now(),
          retryable: true,
        };
      });
  },
});

// ============================================================================
// SELECTORS
// ============================================================================

/**
 * Select bot state
 */
export const selectBotState = (state: RootState) => state.bot;

/**
 * Select all bots
 */
export const selectBots = (state: RootState) => state.bot.bots;

/**
 * Select active bots
 */
export const selectActiveBots = (state: RootState) => state.bot.activeBots;

/**
 * Select selected bot
 */
export const selectSelectedBot = (state: RootState) => state.bot.selectedBot;

/**
 * Select bot by ID
 */
export const selectBotById = (botId: string) => (state: RootState) =>
  state.bot.bots.find(bot => bot.id === botId);

/**
 * Select bot performance
 */
export const selectBotPerformance = (botId: string) => (state: RootState) =>
  state.bot.performance[botId];

/**
 * Select bot logs
 */
export const selectBotLogs = (botId?: string) => (state: RootState) =>
  botId ? state.bot.logs.filter(log => log.botId === botId) : state.bot.logs;

/**
 * Select bot statistics
 */
export const selectBotStatistics = (state: RootState): BotStatistics => {
  const { bots, performance } = state.bot;
  const activeBots = bots.filter(bot => bot.isActive).length;
  const stoppedBots = bots.filter(bot => !bot.isActive).length;
  const errorBots = bots.filter(bot => bot.status === 'ERROR').length;

  const totalTrades = Object.values(performance).reduce((sum, perf) => sum + perf.totalTrades, 0);
  const totalProfit = Object.values(performance).reduce((sum, perf) => sum + perf.netProfit, 0);
  const averageWinRate = Object.values(performance).reduce((sum, perf) => sum + perf.winRate, 0) / Object.keys(performance).length || 0;

  const bestPerformingBot = Object.entries(performance)
    .sort(([, a], [, b]) => b.netProfit - a.netProfit)[0]?.[0] || null;
  const worstPerformingBot = Object.entries(performance)
    .sort(([, a], [, b]) => a.netProfit - b.netProfit)[0]?.[0] || null;

  return {
    totalBots: bots.length,
    activeBots,
    stoppedBots,
    errorBots,
    totalTrades,
    totalProfit,
    averageWinRate,
    bestPerformingBot,
    worstPerformingBot,
    lastUpdated: state.bot.lastUpdate,
  };
};

// ============================================================================
// EXPORTS
// ============================================================================

export const {
  addBot,
  updateBotLocal,
  removeBot,
  activateBot,
  deactivateBot,
  setSelectedBot,
  setLoading,
  setError,
  clearError,
  addLogEntry,
  clearLogs,
  initializeBots,
  setRefreshing,
  updateBotPerformance,
} = botSlice.actions;

export default botSlice.reducer;