import pino from 'pino';
import { createWriteStream } from 'pino-sentry';
import { createPinoBrowserSend, createWriteStream as createPinoBrowserStream } from 'pino-browser-send';

const isDevelopment = process.env.NODE_ENV === 'development';

// Common log configuration
const baseConfig = {
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label: string) => ({ level: label }),
    bindings: (bindings: object) => ({ pid: bindings.pid, hostname: bindings.hostname }),
  },
  timestamp: () => `,"time":"${new Date(Date.now()).toISOString()}"`,
};

// Backend logger configuration
export const createBackendLogger = (options = {}) => {
  const streams = [
    { stream: process.stdout },
    { stream: createWriteStream({ dsn: process.env.SENTRY_DSN }) },
  ];

  if (isDevelopment) {
    streams.push({ stream: pino.destination('./logs/development.log') });
  }

  return pino({
    ...baseConfig,
    ...options,
  }, pino.multistream(streams));
};

// Frontend logger configuration
export const createFrontendLogger = (options = {}) => {
  const browserSend = createPinoBrowserSend({
    url: '/api/logs',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  const streams = [
    { stream: createPinoBrowserStream(browserSend) },
  ];

  return pino({
    ...baseConfig,
    browser: {
      asObject: true,
      transmit: {
        level: 'info',
        send: browserSend,
      },
    },
    ...options,
  }, pino.multistream(streams));
};

// Create request logger middleware
export const createRequestLogger = (logger: pino.Logger) => {
  return (req: any, res: any, next: () => void) => {
    const startTime = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      logger.info({
        type: 'request',
        method: req.method,
        url: req.url,
        status: res.statusCode,
        duration,
        userAgent: req.get('user-agent'),
        ip: req.ip,
      });
    });

    next();
  };
};

// Error logger
export const logError = (logger: pino.Logger, error: Error, context = {}) => {
  logger.error({
    ...context,
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name,
    },
  });
};
export default ExperimentManager;
