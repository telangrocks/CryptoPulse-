/**
 * Production-ready logging utility
 * Replaces all console.log statements with proper logging
 */

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  context?: string;
  data?: any;
}

class Logger {
  private logLevel: LogLevel;
  private logs: LogEntry[] = [];
  private maxLogs: number = 1000;

  constructor() {
    // Set log level based on environment
    this.logLevel = import.meta.env.PROD ? LogLevel.ERROR : LogLevel.DEBUG;
  }

  private shouldLog(level: LogLevel): boolean {
    return level <= this.logLevel;
  }

  private addLog(level: LogLevel, message: string, context?: string, data?: any): void {
    if (!this.shouldLog(level)) return;

    const logEntry: LogEntry = {
      level,
      message,
      timestamp: new Date(),
      context,
      data
    };

    this.logs.push(logEntry);

    // Keep only the last maxLogs entries
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // In development, also log to console
    if (!import.meta.env.PROD) {
      const levelNames = ['ERROR', 'WARN', 'INFO', 'DEBUG'];
      const levelName = levelNames[level];
      const contextStr = context ? `[${context}]` : '';
      
      switch (level) {
        case LogLevel.ERROR:
          console.error(`[${levelName}]${contextStr}`, message, data);
          break;
        case LogLevel.WARN:
          console.warn(`[${levelName}]${contextStr}`, message, data);
          break;
        case LogLevel.INFO:
          console.info(`[${levelName}]${contextStr}`, message, data);
          break;
        case LogLevel.DEBUG:
          console.debug(`[${levelName}]${contextStr}`, message, data);
          break;
      }
    }
  }

  error(message: string, context?: string, data?: any): void {
    this.addLog(LogLevel.ERROR, message, context, data);
  }

  warn(message: string, context?: string, data?: any): void {
    this.addLog(LogLevel.WARN, message, context, data);
  }

  info(message: string, context?: string, data?: any): void {
    this.addLog(LogLevel.INFO, message, context, data);
  }

  debug(message: string, context?: string, data?: any): void {
    this.addLog(LogLevel.DEBUG, message, context, data);
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  clearLogs(): void {
    this.logs = [];
  }

  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }
}

// Create singleton instance
export const logger = new Logger();

// Export convenience functions
export const logError = (message: string, context?: string, data?: any) => logger.error(message, context, data);
export const logWarn = (message: string, context?: string, data?: any) => logger.warn(message, context, data);
export const logInfo = (message: string, context?: string, data?: any) => logger.info(message, context, data);
export const logDebug = (message: string, context?: string, data?: any) => logger.debug(message, context, data);
