/**
 * Logging System
 * Centralized logging with different levels
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

class Logger {
  private logLevel: LogLevel = LogLevel.INFO;

  constructor() {
    // Set log level based on environment
    if (import.meta.env.MODE === 'development') {
      this.logLevel = LogLevel.DEBUG;
    } else if (import.meta.env.MODE === 'production') {
      this.logLevel = LogLevel.WARN;
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.logLevel;
  }

  private formatMessage(level: string, message: string, context?: any): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? JSON.stringify(context) : '';
    return `[${timestamp}] ${level}: ${message} ${contextStr}`;
  }

  debug(message: string, context?: any): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.debug(this.formatMessage('DEBUG', message, context));
    }
  }

  info(message: string, context?: any): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.info(this.formatMessage('INFO', message, context));
    }
  }

  warn(message: string, context?: any): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(this.formatMessage('WARN', message, context));
    }
  }

  error(message: string, error?: Error, context?: any): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      const errorInfo = error ? `\nError: ${error.message}\nStack: ${error.stack}` : '';
      console.error(this.formatMessage('ERROR', message, context) + errorInfo);
    }
  }
}

// Create singleton instance
const logger = new Logger();

// Export convenience functions
export const logDebug = (message: string, context?: any): void => {
  logger.debug(message, context);
};

export const logInfo = (message: string, context?: any): void => {
  logger.info(message, context);
};

export const logWarn = (message: string, context?: any): void => {
  logger.warn(message, context);
};

export const logError = (message: string, error?: Error, context?: any): void => {
  logger.error(message, error, context);
};

export default logger;