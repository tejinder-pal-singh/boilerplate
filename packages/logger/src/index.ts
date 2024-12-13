import pino from 'pino';
import { createContext, useContext } from 'react';

interface LogEntry {
  level: string;
  message: string;
  timestamp: string;
  context?: Record<string, any>;
  error?: Error;
}

interface LoggerConfig {
  level?: string;
  enabled?: boolean;
  prettyPrint?: boolean;
  destination?: string;
  redact?: string[];
  serializers?: Record<string, (value: any) => any>;
  hooks?: {
    beforeLog?: (entry: LogEntry) => LogEntry;
    afterLog?: (entry: LogEntry) => void;
  };
}

class Logger {
  private static instance: Logger;
  private logger: pino.Logger;
  private config: LoggerConfig;
  private buffer: LogEntry[] = [];
  private bufferSize: number = 100;
  private flushInterval: number = 5000;
  private subscribers: Set<(entry: LogEntry) => void> = new Set();

  private constructor(config: LoggerConfig = {}) {
    this.config = {
      level: 'info',
      enabled: true,
      prettyPrint: process.env.NODE_ENV === 'development',
      redact: ['password', 'token', 'secret'],
      ...config,
    };

    this.logger = pino({
      level: this.config.level,
      enabled: this.config.enabled,
      redact: this.config.redact,
      serializers: {
        error: pino.stdSerializers.err,
        ...this.config.serializers,
      },
      transport: this.config.prettyPrint
        ? {
            target: 'pino-pretty',
            options: {
              colorize: true,
              translateTime: 'SYS:standard',
            },
          }
        : undefined,
    });

    if (this.config.destination) {
      this.logger = this.logger.destination(this.config.destination);
    }

    // Start buffer flush interval
    setInterval(() => this.flushBuffer(), this.flushInterval);

    // Handle unhandled errors and rejections
    this.setupGlobalErrorHandlers();
  }

  public static getInstance(config?: LoggerConfig): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger(config);
    }
    return Logger.instance;
  }

  private setupGlobalErrorHandlers(): void {
    if (typeof window !== 'undefined') {
      window.onerror = (message, source, lineno, colno, error) => {
        this.error('Unhandled error', {
          message,
          source,
          lineno,
          colno,
          error,
        });
      };

      window.onunhandledrejection = (event) => {
        this.error('Unhandled promise rejection', {
          reason: event.reason,
        });
      };
    }
  }

  private createLogEntry(
    level: string,
    message: string,
    context?: Record<string, any>,
    error?: Error
  ): LogEntry {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
      error,
    };

    if (this.config.hooks?.beforeLog) {
      return this.config.hooks.beforeLog(entry);
    }

    return entry;
  }

  private async processLogEntry(entry: LogEntry): Promise<void> {
    // Add to buffer
    this.buffer.push(entry);
    if (this.buffer.length >= this.bufferSize) {
      await this.flushBuffer();
    }

    // Notify subscribers
    this.subscribers.forEach(callback => callback(entry));

    // Call afterLog hook
    if (this.config.hooks?.afterLog) {
      this.config.hooks.afterLog(entry);
    }
  }

  private async flushBuffer(): Promise<void> {
    if (this.buffer.length === 0) return;

    const entries = [...this.buffer];
    this.buffer = [];

    try {
      // Write to logger
      entries.forEach(entry => {
        const logFn = this.logger[entry.level as keyof pino.Logger];
        if (typeof logFn === 'function') {
          if (entry.error) {
            logFn.call(this.logger, { ...entry.context, err: entry.error }, entry.message);
          } else {
            logFn.call(this.logger, entry.context || {}, entry.message);
          }
        }
      });

      // Send to remote logging service if configured
      if (this.config.destination) {
        await fetch(this.config.destination, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(entries),
        });
      }
    } catch (error) {
      console.error('Error flushing log buffer:', error);
      // Re-add failed entries to buffer
      this.buffer = [...entries, ...this.buffer];
    }
  }

  public trace(message: string, context?: Record<string, any>): void {
    const entry = this.createLogEntry('trace', message, context);
    this.processLogEntry(entry);
  }

  public debug(message: string, context?: Record<string, any>): void {
    const entry = this.createLogEntry('debug', message, context);
    this.processLogEntry(entry);
  }

  public info(message: string, context?: Record<string, any>): void {
    const entry = this.createLogEntry('info', message, context);
    this.processLogEntry(entry);
  }

  public warn(message: string, context?: Record<string, any>): void {
    const entry = this.createLogEntry('warn', message, context);
    this.processLogEntry(entry);
  }

  public error(message: string, context?: Record<string, any>, error?: Error): void {
    const entry = this.createLogEntry('error', message, context, error);
    this.processLogEntry(entry);
  }

  public fatal(message: string, context?: Record<string, any>, error?: Error): void {
    const entry = this.createLogEntry('fatal', message, context, error);
    this.processLogEntry(entry);
  }

  public child(bindings: Record<string, any>): Logger {
    const childLogger = new Logger(this.config);
    childLogger.logger = this.logger.child(bindings);
    return childLogger;
  }

  public subscribe(callback: (entry: LogEntry) => void): () => void {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  public async flush(): Promise<void> {
    await this.flushBuffer();
  }

  public setLevel(level: string): void {
    this.logger.level = level;
  }

  public getBuffer(): LogEntry[] {
    return [...this.buffer];
  }

  public clearBuffer(): void {
    this.buffer = [];
  }
}

// React Context
const LoggerContext = createContext<Logger | null>(null);

// React Provider
export const LoggerProvider: React.FC<{
  children,
  config,
}: {
  children: React.ReactNode;
  config?: LoggerConfig;
}) {
  const logger = Logger.getInstance(config);

  return (
    <LoggerContext.Provider value={logger}>
      {children}
    </LoggerContext.Provider>
  );
}

// React Hook
export function useLogger() {
  const logger = useContext(LoggerContext);
  if (!logger) {
    throw new Error('useLogger must be used within a LoggerProvider');
  }
  return logger;
}

export default Logger;
