"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const marketController_1 = require("../controllers/marketController");
const router = (0, express_1.Router)();
// Stock Discovery & Search
// GET /api/market/search?query=RELIANCE&limit=20 - Search across all exchanges
router.get('/search', marketController_1.MarketController.searchStock);
// GET /api/market/browse?sector=Technology&exchange=NSE&page=1&limit=50 - Browse stocks with filters
router.get('/browse', marketController_1.MarketController.browseStocks);
// GET /api/market/suggestions?sector=Technology&limit=20 - Get stock suggestions
router.get('/suggestions', marketController_1.MarketController.getPopularStocks);
// Market Information
// GET /api/market/info - Get all exchanges, sectors, and market stats
router.get('/info', marketController_1.MarketController.getMarketInfo);
// GET /api/market/status - Get market service status
router.get('/status', marketController_1.MarketController.getServiceStatus);
// Live Market Data
// GET /api/market/price/:symbol - Get current price for symbol
router.get('/price/:symbol', marketController_1.MarketController.getCurrentPrice);
// GET /api/market/data/:symbol - Get detailed market data for symbol
router.get('/data/:symbol', marketController_1.MarketController.getMarketData);
// Price Updates
// POST /api/market/update - Update all stock prices
router.post('/update', marketController_1.MarketController.updateAllPrices);
// POST /api/market/update/:stockId - Update specific stock price
router.post('/update/:stockId', marketController_1.MarketController.updateStockPrice);
// Legacy endpoint (for backward compatibility)
router.get('/popular', marketController_1.MarketController.getPopularStocks);
exports.default = router;
