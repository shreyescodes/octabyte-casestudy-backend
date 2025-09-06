"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const portfolioController_1 = __importDefault(require("../controllers/portfolioController"));
const router = express_1.default.Router();
// Main portfolio endpoint (redirects to summary)
router.get('/', portfolioController_1.default.getPortfolioSummary);
// Portfolio summary endpoint
router.get('/summary', portfolioController_1.default.getPortfolioSummary);
// Sector summary endpoint
router.get('/sectors', portfolioController_1.default.getSectorSummary);
// Portfolio metrics endpoint
router.get('/metrics', portfolioController_1.default.getPortfolioMetrics);
// Update stock prices endpoint
router.put('/prices', portfolioController_1.default.updateAllStockPrices);
exports.default = router;
