"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logMarketData = exports.logApiError = exports.logRequest = exports.logger = void 0;
const winston_1 = __importDefault(require("winston"));
const path_1 = __importDefault(require("path"));
const logLevel = process.env.LOG_LEVEL || 'info';
const nodeEnv = process.env.NODE_ENV || 'development';
const logFormat = winston_1.default.format.combine(winston_1.default.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), winston_1.default.format.errors({ stack: true }), winston_1.default.format.json(), winston_1.default.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let logMessage = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    if (Object.keys(meta).length > 0) {
        logMessage += ` ${JSON.stringify(meta)}`;
    }
    if (stack) {
        logMessage += `\n${stack}`;
    }
    return logMessage;
}));
const consoleFormat = winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.timestamp({ format: 'HH:mm:ss' }), winston_1.default.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let logMessage = `${timestamp} ${level}: ${message}`;
    if (Object.keys(meta).length > 0) {
        logMessage += ` ${JSON.stringify(meta, null, 2)}`;
    }
    if (stack) {
        logMessage += `\n${stack}`;
    }
    return logMessage;
}));
const transports = [];
transports.push(new winston_1.default.transports.Console({
    level: logLevel,
    format: nodeEnv === 'development' ? consoleFormat : logFormat,
}));
if (nodeEnv === 'production') {
    transports.push(new winston_1.default.transports.File({
        filename: path_1.default.join(process.cwd(), 'logs', 'app.log'),
        level: 'info',
        format: logFormat,
        maxsize: 10 * 1024 * 1024,
        maxFiles: 5,
    }));
    transports.push(new winston_1.default.transports.File({
        filename: path_1.default.join(process.cwd(), 'logs', 'error.log'),
        level: 'error',
        format: logFormat,
        maxsize: 10 * 1024 * 1024,
        maxFiles: 5,
    }));
}
exports.logger = winston_1.default.createLogger({
    level: logLevel,
    format: logFormat,
    transports,
    exitOnError: false,
});
if (nodeEnv === 'production') {
    exports.logger.exceptions.handle(new winston_1.default.transports.File({
        filename: path_1.default.join(process.cwd(), 'logs', 'exceptions.log'),
        format: logFormat,
    }));
    exports.logger.rejections.handle(new winston_1.default.transports.File({
        filename: path_1.default.join(process.cwd(), 'logs', 'rejections.log'),
        format: logFormat,
    }));
}
const logRequest = (req, res, responseTime) => {
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
        exports.logger.error('HTTP Request Error', logData);
    }
    else {
        exports.logger.info('HTTP Request', logData);
    }
};
exports.logRequest = logRequest;
const logApiError = (operation, error, context) => {
    exports.logger.error(`API Error in ${operation}`, {
        error: error.message || error,
        stack: error.stack,
        context,
    });
};
exports.logApiError = logApiError;
const logMarketData = (symbol, source, success, data) => {
    const logData = {
        symbol,
        source,
        success,
        timestamp: new Date().toISOString(),
        ...(data && { data }),
    };
    if (success) {
        exports.logger.debug('Market Data Fetched', logData);
    }
    else {
        exports.logger.warn('Market Data Fetch Failed', logData);
    }
};
exports.logMarketData = logMarketData;
exports.default = exports.logger;
//# sourceMappingURL=logger.js.map