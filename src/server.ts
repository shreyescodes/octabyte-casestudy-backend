import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { logger, logRequest } from './utils/logger';
import marketDataService from './services/marketDataService';
import portfolioRoutes from './routes/portfolioRoutes';
import stockRoutes from './routes/stockRoutes';
import Database from './config/database';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Custom request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const responseTime = Date.now() - start;
    logRequest(req, res, responseTime);
  });
  next();
});

// Morgan for additional HTTP logging in development
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const [serviceHealth, dbHealth] = await Promise.all([
      marketDataService.checkServiceHealth(),
      Database.testConnection()
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
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(500).json({
      success: false,
      message: 'Health check failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// API Routes
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/stocks', stockRoutes);

// Market data endpoints
app.get('/api/market/price/:symbol', async (req, res): Promise<void> => {
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

    logger.info(`Fetching current price for ${symbol}`);
    
    const price = await marketDataService.getCurrentPrice(symbol, exchange as string);
    
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
  } catch (error) {
    logger.error(`Error fetching price for ${req.params.symbol}:`, error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch price data',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.get('/api/market/data/:symbol', async (req, res): Promise<void> => {
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

    logger.info(`Fetching market data for ${symbol}`);
    
    const marketData = await marketDataService.getMarketData(
      symbol, 
      exchange as string, 
      forceRefresh === 'true'
    );
    
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
  } catch (error) {
    logger.error(`Error fetching market data for ${req.params.symbol}:`, error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch market data',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.post('/api/market/batch', async (req, res): Promise<void> => {
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

    logger.info(`Fetching batch market data for ${symbols.length} symbols`);
    
    const batchData = await marketDataService.getBatchMarketData(symbols, exchange);
    
    // Transform the data to include success/failure status for each symbol
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
  } catch (error) {
    logger.error('Error in batch market data request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch batch market data',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Cache management endpoints
app.get('/api/cache/stats', async (req, res): Promise<void> => {
  try {
    const stats = marketDataService.getCacheStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Error fetching cache stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch cache statistics',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.post('/api/cache/clear', async (req, res): Promise<void> => {
  try {
    marketDataService.clearCache();
    logger.info('Cache cleared manually');
    res.json({
      success: true,
      message: 'Cache cleared successfully'
    });
  } catch (error) {
    logger.error('Error clearing cache:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear cache',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.post('/api/cache/refresh/:symbol', async (req, res): Promise<void> => {
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

    logger.info(`Force refreshing cache for ${symbol}`);
    
    const marketData = await marketDataService.refreshSymbol(symbol, exchange as string);
    
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
  } catch (error) {
    logger.error(`Error refreshing cache for ${req.params.symbol}:`, error);
    res.status(500).json({
      success: false,
      message: 'Failed to refresh cache',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    path: req.originalUrl
  });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);
  
  try {
    const serverInstance = await server;
    serverInstance.close(() => {
      logger.info('HTTP server closed');
      process.exit(0);
    });
    
    // Force close after 30 seconds
    setTimeout(() => {
      logger.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 30000);
  } catch (error) {
    logger.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
};

// Database initialization
async function initializeDatabase() {
  try {
    logger.info('Testing database connection...');
    const isConnected = await Database.testConnection();
    
    if (!isConnected) {
      logger.error('Database connection failed. Please check your database configuration.');
      logger.error('Make sure PostgreSQL is running and the database exists.');
      logger.error('You can create the database using: createdb portfolio_dashboard');
      return false;
    }
    
    logger.info('Database connection successful');
    return true;
  } catch (error) {
    logger.error('Database initialization failed:', error);
    return false;
  }
}

// Start server
const startServer = async () => {
  const dbInitialized = await initializeDatabase();
  
  if (!dbInitialized) {
    logger.warn('Server starting without database connection. Some features may not work.');
  }
  
  const server = app.listen(PORT, () => {
    logger.info(`Portfolio Dashboard API server running on port ${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`Health check: http://localhost:${PORT}/api/health`);
    logger.info(`Database status: ${dbInitialized ? 'Connected' : 'Disconnected'}`);
  });
  
  return server;
};

// Start the server
const server = startServer();

// Handle process signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

export default app;
