"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const database_1 = __importDefault(require("./config/database"));
const PORT = process.env.PORT || 3001;
async function startServer() {
    try {
        // Test database connection
        console.log('Testing database connection...');
        const dbConnected = await database_1.default.testConnection();
        if (!dbConnected) {
            console.error('Failed to connect to database. Please check your database configuration.');
            process.exit(1);
        }
        // Start the server
        app_1.default.listen(PORT, () => {
            console.log(`🚀 Portfolio Dashboard API server running on port ${PORT}`);
            console.log(`📊 Health check: http://localhost:${PORT}/health`);
            console.log(`📈 API endpoints: http://localhost:${PORT}/api`);
            console.log(`🔗 CORS enabled for: ${process.env.CORS_ORIGIN || 'http://localhost:3000'}`);
        });
    }
    catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}
// Handle graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully...');
    process.exit(0);
});
process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully...');
    process.exit(0);
});
startServer();
