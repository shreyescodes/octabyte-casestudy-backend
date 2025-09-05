"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const dotenv_1 = __importDefault(require("dotenv"));
const stockRoutes_1 = __importDefault(require("./routes/stockRoutes"));
const portfolioRoutes_1 = __importDefault(require("./routes/portfolioRoutes"));
const errorHandler_1 = require("./middleware/errorHandler");
const database_1 = __importDefault(require("./config/database"));
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use((0, helmet_1.default)());
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: {
        success: false,
        error: 'Too many requests from this IP, please try again later.'
    }
});
app.use('/api', limiter);
app.use((0, cors_1.default)({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true
}));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
app.get('/health', async (req, res) => {
    try {
        const dbConnected = await database_1.default.testConnection();
        res.json({
            success: true,
            message: 'Server is running',
            timestamp: new Date().toISOString(),
            database: dbConnected ? 'connected' : 'disconnected'
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Health check failed',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
app.use('/api/stocks', stockRoutes_1.default);
app.use('/api/portfolio', portfolioRoutes_1.default);
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'Portfolio Dashboard API',
        version: '1.0.0',
        endpoints: {
            stocks: '/api/stocks',
            portfolio: '/api/portfolio',
            health: '/health'
        }
    });
});
app.use(errorHandler_1.notFoundHandler);
app.use(errorHandler_1.errorHandler);
exports.default = app;
//# sourceMappingURL=app.js.map