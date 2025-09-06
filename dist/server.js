"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const dotenv_1 = __importDefault(require("dotenv"));
const logger_1 = require("./utils/logger");
const marketDataService_1 = __importDefault(require("./services/marketDataService"));
const portfolioRoutes_1 = __importDefault(require("./routes/portfolioRoutes"));
const stockRoutes_1 = __importDefault(require("./routes/stockRoutes"));
const database_1 = __importDefault(require("./config/database"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
}));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const responseTime = Date.now() - start;
        (0, logger_1.logRequest)(req, res, responseTime);
    });
    next();
});
if (process.env.NODE_ENV === 'development') {
    app.use((0, morgan_1.default)('dev'));
}
app.get('/api/health', async (req, res) => {
    try {
        const [serviceHealth, dbHealth] = await Promise.all([
            marketDataService_1.default.checkServiceHealth(),
            database_1.default.testConnection()
        ]);
        res.json({
            success: true,
            message: 'Portfolio Dashboard API is running',
            timestamp: new Date().toISOString(),
            services: serviceHealth,
            database: dbHealth,
            environment: process.env.NODE_ENV || 'development',
            version: '1.0.0'
        });
    }
    catch (error) {
        logger_1.logger.error('Health check failed:', error);
        res.status(500).json({
            success: false,
            message: 'Health check failed',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
app.use('/api/portfolio', portfolioRoutes_1.default);
app.use('/api/stocks', stockRoutes_1.default);
app.get('/api/market/price/:symbol', async (req, res) => {
    try {
        const { symbol } = req.params;
        const { exchange = 'NSE' } = req.query;
        if (!symbol) {
            res.status(400).json({
                success: false,
                message: 'Symbol is required'
            });
            return;
        }
        logger_1.logger.info(`Fetching current price for ${symbol}`);
        const price = await marketDataService_1.default.getCurrentPrice(symbol, exchange);
        if (price === null) {
            res.status(404).json({
                success: false,
                message: `Price data not found for symbol: ${symbol}`
            });
            return;
        }
        res.json({
            success: true,
            data: {
                symbol,
                price,
                exchange,
                timestamp: new Date().toISOString()
            }
        });
    }
    catch (error) {
        logger_1.logger.error(`Error fetching price for ${req.params.symbol}:`, error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch price data',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
app.get('/api/market/data/:symbol', async (req, res) => {
    try {
        const { symbol } = req.params;
        const { exchange = 'NSE', forceRefresh = 'false' } = req.query;
        if (!symbol) {
            res.status(400).json({
                success: false,
                message: 'Symbol is required'
            });
            return;
        }
        logger_1.logger.info(`Fetching market data for ${symbol}`);
        const marketData = await marketDataService_1.default.getMarketData(symbol, exchange, forceRefresh === 'true');
        if (!marketData) {
            res.status(404).json({
                success: false,
                message: `Market data not found for symbol: ${symbol}`
            });
            return;
        }
        res.json({
            success: true,
            data: marketData
        });
    }
    catch (error) {
        logger_1.logger.error(`Error fetching market data for ${req.params.symbol}:`, error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch market data',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
app.post('/api/market/batch', async (req, res) => {
    try {
        const { symbols, exchange = 'NSE' } = req.body;
        if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
            res.status(400).json({
                success: false,
                message: 'Symbols array is required and must not be empty'
            });
            return;
        }
        if (symbols.length > 50) {
            res.status(400).json({
                success: false,
                message: 'Maximum 50 symbols allowed per batch request'
            });
            return;
        }
        logger_1.logger.info(`Fetching batch market data for ${symbols.length} symbols`);
        const batchData = await marketDataService_1.default.getBatchMarketData(symbols, exchange);
        const results = Object.entries(batchData).map(([symbol, data]) => ({
            symbol,
            success: data !== null,
            data: data || undefined,
            error: data === null ? 'Market data not available' : undefined
        }));
        const successCount = results.filter(r => r.success).length;
        res.json({
            success: true,
            data: {
                results,
                summary: {
                    total: symbols.length,
                    successful: successCount,
                    failed: symbols.length - successCount,
                    successRate: `${((successCount / symbols.length) * 100).toFixed(1)}%`
                }
            }
        });
    }
    catch (error) {
        logger_1.logger.error('Error in batch market data request:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch batch market data',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
app.get('/api/cache/stats', async (req, res) => {
    try {
        const stats = marketDataService_1.default.getCacheStats();
        res.json({
            success: true,
            data: stats
        });
    }
    catch (error) {
        logger_1.logger.error('Error fetching cache stats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch cache statistics',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
app.post('/api/cache/clear', async (req, res) => {
    try {
        marketDataService_1.default.clearCache();
        logger_1.logger.info('Cache cleared manually');
        res.json({
            success: true,
            message: 'Cache cleared successfully'
        });
    }
    catch (error) {
        logger_1.logger.error('Error clearing cache:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to clear cache',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
app.post('/api/cache/refresh/:symbol', async (req, res) => {
    try {
        const { symbol } = req.params;
        const { exchange = 'NSE' } = req.query;
        if (!symbol) {
            res.status(400).json({
                success: false,
                message: 'Symbol is required'
            });
            return;
        }
        logger_1.logger.info(`Force refreshing cache for ${symbol}`);
        const marketData = await marketDataService_1.default.refreshSymbol(symbol, exchange);
        if (!marketData) {
            res.status(404).json({
                success: false,
                message: `Failed to refresh data for symbol: ${symbol}`
            });
            return;
        }
        res.json({
            success: true,
            data: marketData,
            message: `Cache refreshed for ${symbol}`
        });
    }
    catch (error) {
        logger_1.logger.error(`Error refreshing cache for ${req.params.symbol}:`, error);
        res.status(500).json({
            success: false,
            message: 'Failed to refresh cache',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Endpoint not found',
        path: req.originalUrl
    });
});
app.use((err, req, res, next) => {
    logger_1.logger.error('Unhandled error:', err);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});
const gracefulShutdown = async (signal) => {
    logger_1.logger.info(`Received ${signal}. Starting graceful shutdown...`);
    try {
        const serverInstance = await server;
        serverInstance.close(() => {
            logger_1.logger.info('HTTP server closed');
            process.exit(0);
        });
        setTimeout(() => {
            logger_1.logger.error('Could not close connections in time, forcefully shutting down');
            process.exit(1);
        }, 30000);
    }
    catch (error) {
        logger_1.logger.error('Error during graceful shutdown:', error);
        process.exit(1);
    }
};
async function initializeDatabase() {
    try {
        logger_1.logger.info('Testing database connection...');
        const isConnected = await database_1.default.testConnection();
        if (!isConnected) {
            logger_1.logger.error('Database connection failed. Please check your database configuration.');
            logger_1.logger.error('Make sure PostgreSQL is running and the database exists.');
            logger_1.logger.error('You can create the database using: createdb portfolio_dashboard');
            return false;
        }
        logger_1.logger.info('Database connection successful');
        return true;
    }
    catch (error) {
        logger_1.logger.error('Database initialization failed:', error);
        return false;
    }
}
const startServer = async () => {
    const dbInitialized = await initializeDatabase();
    if (!dbInitialized) {
        logger_1.logger.warn('Server starting without database connection. Some features may not work.');
    }
    const server = app.listen(PORT, () => {
        logger_1.logger.info(`Portfolio Dashboard API server running on port ${PORT}`);
        logger_1.logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
        logger_1.logger.info(`Health check: http://localhost:${PORT}/api/health`);
        logger_1.logger.info(`Database status: ${dbInitialized ? 'Connected' : 'Disconnected'}`);
    });
    return server;
};
const server = startServer();
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('uncaughtException', (error) => {
    logger_1.logger.error('Uncaught Exception:', error);
    process.exit(1);
});
process.on('unhandledRejection', (reason, promise) => {
    logger_1.logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});
exports.default = app;
