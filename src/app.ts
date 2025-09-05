import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

import stockRoutes from './routes/stockRoutes';
import portfolioRoutes from './routes/portfolioRoutes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import Database from './config/database';

// Load environment variables
dotenv.config();

const app = express();

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.'
  }
});
app.use('/api', limiter);

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const dbConnected = await Database.testConnection();
    res.json({
      success: true,
      message: 'Server is running',
      timestamp: new Date().toISOString(),
      database: dbConnected ? 'connected' : 'disconnected'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Health check failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// API routes
app.use('/api/stocks', stockRoutes);
app.use('/api/portfolio', portfolioRoutes);

// Root endpoint
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

// Error handling middleware
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
