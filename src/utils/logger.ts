import winston from 'winston';
import path from 'path';

const logLevel = process.env.LOG_LEVEL || 'info';
const nodeEnv = process.env.NODE_ENV || 'development';

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let logMessage = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    
    if (Object.keys(meta).length > 0) {
      logMessage += ` ${JSON.stringify(meta)}`;
    }
    
    if (stack) {
      logMessage += `\n${stack}`;
    }
    
    return logMessage;
  })
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let logMessage = `${timestamp} ${level}: ${message}`;
    
    if (Object.keys(meta).length > 0) {
      logMessage += ` ${JSON.stringify(meta, null, 2)}`;
    }
    
    if (stack) {
      logMessage += `\n${stack}`;
    }
    
    return logMessage;
  })
);

// Create transports
const transports: winston.transport[] = [];

// Console transport for all environments
transports.push(
  new winston.transports.Console({
    level: logLevel,
    format: nodeEnv === 'development' ? consoleFormat : logFormat,
  })
);

// File transports for production
if (nodeEnv === 'production') {
  // General log file
  transports.push(
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'app.log'),
      level: 'info',
      format: logFormat,
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
    })
  );

  // Error log file
  transports.push(
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'error.log'),
      level: 'error',
      format: logFormat,
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
    })
  );
}

// Create logger instance
export const logger = winston.createLogger({
  level: logLevel,
  format: logFormat,
  transports,
  // Don't exit on handled exceptions
  exitOnError: false,
});

// Handle uncaught exceptions and unhandled rejections
if (nodeEnv === 'production') {
  logger.exceptions.handle(
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'exceptions.log'),
      format: logFormat,
    })
  );

  logger.rejections.handle(
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'rejections.log'),
      format: logFormat,
    })
  );
}

// Add request logging helper
export const logRequest = (req: any, res: any, responseTime?: number) => {
  const { method, url, ip, headers } = req;
  const { statusCode } = res;
  
  const logData = {
    method,
    url,
    ip,
    userAgent: headers['user-agent'],
    statusCode,
    responseTime: responseTime ? `${responseTime}ms` : undefined,
  };
  
  if (statusCode >= 400) {
    logger.error('HTTP Request Error', logData);
  } else {
    logger.info('HTTP Request', logData);
  }
};

// Add API error logging helper
export const logApiError = (operation: string, error: any, context?: any) => {
  logger.error(`API Error in ${operation}`, {
    error: error.message || error,
    stack: error.stack,
    context,
  });
};

// Add market data logging helper
export const logMarketData = (symbol: string, source: string, success: boolean, data?: any) => {
  const logData = {
    symbol,
    source,
    success,
    timestamp: new Date().toISOString(),
    ...(data && { data }),
  };
  
  if (success) {
    logger.debug('Market Data Fetched', logData);
  } else {
    logger.warn('Market Data Fetch Failed', logData);
  }
};

export default logger;
