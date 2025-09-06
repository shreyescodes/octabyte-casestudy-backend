import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

import stockRoutes from './routes/stockRoutes';
import portfolioRoutes from './routes/portfolioRoutes';
import marketRoutes from './routes/marketRoutes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import Database from './config/database';
import './services/priceUpdateService'; // Start price update service

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
const allowedOrigins = [
  'http://localhost:3000',
  'https://frontend-lg9n2gwos-shreyas-projects-2b8608b2.vercel.app',
  'https://frontend-6spumjli9-shreyas-projects-2b8608b2.vercel.app',
  'https://frontend-hepl5od6c-shreyas-projects-2b8608b2.vercel.app',
  'https://frontend-73kwx05gl-shreyas-projects-2b8608b2.vercel.app',
  'https://frontend-sage-eight-46.vercel.app',
  process.env.CORS_ORIGIN
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // Allow any Vercel app domain for this project (more flexible)
    if (origin && (
      origin.includes('shreyas-projects-2b8608b2.vercel.app') ||
      origin.includes('.vercel.app')
    )) {
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
app.use('/api/market', marketRoutes);

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
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
