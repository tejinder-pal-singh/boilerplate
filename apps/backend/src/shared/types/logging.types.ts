export type LogLevel = 'error' | 'warn' | 'info' | 'http' | 'verbose' | 'debug' | 'silly';

export interface LogContext {
  requestId?: string;
  userId?: string;
  service?: string;
  environment?: string;
  timestamp?: Date;
  [key: string]: any;
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: Error;
  timestamp: Date;
  stack?: string;
}

export interface LoggerConfig {
  level: LogLevel;
  format?: 'json' | 'pretty';
  timestamp?: boolean;
  colorize?: boolean;
  service?: string;
}

export interface LogTransport {
  name: string;
  level: LogLevel;
  enabled: boolean;
  options?: Record<string, any>;
}

export interface RequestLogContext extends LogContext {
  method: string;
  url: string;
  statusCode: number;
  responseTime: number;
  userAgent?: string;
  ip?: string;
  correlationId?: string;
}

export interface ErrorLogContext extends LogContext {
  errorCode?: string;
  errorMessage?: string;
  stackTrace?: string;
  source?: string;
}
