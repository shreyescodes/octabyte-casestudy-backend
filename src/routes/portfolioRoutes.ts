const express = require('express');
import PortfolioController from '../controllers/portfolioController';

const router = express.Router();

// Main portfolio endpoint (redirects to summary)
router.get('/', PortfolioController.getPortfolioSummary);

// Portfolio summary endpoint
router.get('/summary', PortfolioController.getPortfolioSummary);

// Sector summary endpoint
router.get('/sectors', PortfolioController.getSectorSummary);

// Portfolio metrics endpoint
router.get('/metrics', PortfolioController.getPortfolioMetrics);

// Update stock prices endpoint
router.put('/prices', PortfolioController.updateAllStockPrices);

export default router;