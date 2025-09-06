import { Router } from 'express';
import { MarketController } from '../controllers/marketController';

const router = Router();

// Stock Discovery & Search
// GET /api/market/search?query=RELIANCE&limit=20 - Search across all exchanges
router.get('/search', MarketController.searchStock);

// GET /api/market/browse?sector=Technology&exchange=NSE&page=1&limit=50 - Browse stocks with filters
router.get('/browse', MarketController.browseStocks);

// GET /api/market/suggestions?sector=Technology&limit=20 - Get stock suggestions
router.get('/suggestions', MarketController.getPopularStocks);

// Market Information
// GET /api/market/info - Get all exchanges, sectors, and market stats
router.get('/info', MarketController.getMarketInfo);

// GET /api/market/status - Get market service status
router.get('/status', MarketController.getServiceStatus);

// Live Market Data
// GET /api/market/price/:symbol - Get current price for symbol
router.get('/price/:symbol', MarketController.getCurrentPrice);

// GET /api/market/data/:symbol - Get detailed market data for symbol
router.get('/data/:symbol', MarketController.getMarketData);

// Price Updates
// POST /api/market/update - Update all stock prices
router.post('/update', MarketController.updateAllPrices);

// POST /api/market/update/:stockId - Update specific stock price
router.post('/update/:stockId', MarketController.updateStockPrice);

// Legacy endpoint (for backward compatibility)
router.get('/popular', MarketController.getPopularStocks);

export default router;
