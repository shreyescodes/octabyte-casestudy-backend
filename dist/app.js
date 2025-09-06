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
const marketRoutes_1 = __importDefault(require("./routes/marketRoutes"));
const errorHandler_1 = require("./middleware/errorHandler");
const database_1 = __importDefault(require("./config/database"));
require("./services/priceUpdateService"); // Start price update service
// Load environment variables
dotenv_1.default.config();
const app = (0, express_1.default)();
// Security middleware
app.use((0, helmet_1.default)());
// Rate limiting
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: {
        success: false,
        error: 'Too many requests from this IP, please try again later.'
    }
});
app.use('/api', limiter);
// CORS configuration
const allowedOrigins = [
    'http://localhost:3000',
    'https://frontend-lg9n2gwos-shreyas-projects-2b8608b2.vercel.app',
    'https://frontend-6spumjli9-shreyas-projects-2b8608b2.vercel.app',
    'https://frontend-hepl5od6c-shreyas-projects-2b8608b2.vercel.app',
    'https://frontend-73kwx05gl-shreyas-projects-2b8608b2.vercel.app',
    'https://frontend-sage-eight-46.vercel.app',
    process.env.CORS_ORIGIN
].filter(Boolean);
app.use((0, cors_1.default)({
    origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, etc.)
        if (!origin)
            return callback(null, true);
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        // Allow any Vercel app domain for this project (more flexible)
        if (origin && (origin.includes('shreyas-projects-2b8608b2.vercel.app') ||
            origin.includes('.vercel.app'))) {
            return callback(null, true);
        }
        // Allow localhost for development
        if (origin && origin.includes('localhost')) {
            return callback(null, true);
        }
        const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
        return callback(new Error(msg), false);
    },
    credentials: true
}));
// Body parsing middleware
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// Health check endpoint
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
// API routes
app.use('/api/stocks', stockRoutes_1.default);
app.use('/api/portfolio', portfolioRoutes_1.default);
app.use('/api/market', marketRoutes_1.default);
// Root endpoint
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'Portfolio Dashboard API',
        version: '1.0.0',
        endpoints: {
            stocks: '/api/stocks',
            portfolio: '/api/portfolio',
            market: '/api/market',
            health: '/health'
        }
    });
});
// Error handling middleware
app.use(errorHandler_1.notFoundHandler);
app.use(errorHandler_1.errorHandler);
exports.default = app;
