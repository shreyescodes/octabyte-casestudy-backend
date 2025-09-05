import express from 'express';
import StockController from '../controllers/stockController';

const router = express.Router();

// Get all stocks
router.get('/', StockController.getAllStocks);

// Search stocks
router.get('/search', StockController.searchStocks);

// Get stock by ID
router.get('/:id', StockController.getStockById);

// Create new stock
router.post('/', StockController.createStock);

// Update stock
router.put('/:id', StockController.updateStock);

// Delete stock
router.delete('/:id', StockController.deleteStock);

// Refresh stock market data
router.post('/:id/refresh', StockController.refreshStockData);

export default router;