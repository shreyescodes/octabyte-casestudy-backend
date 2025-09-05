"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const portfolioController_1 = __importDefault(require("../controllers/portfolioController"));
const router = express_1.default.Router();
router.get('/', portfolioController_1.default.getPortfolioSummary);
router.get('/summary', portfolioController_1.default.getPortfolioSummary);
router.get('/sectors', portfolioController_1.default.getSectorSummary);
router.get('/metrics', portfolioController_1.default.getPortfolioMetrics);
router.put('/prices', portfolioController_1.default.updateAllStockPrices);
exports.default = router;
//# sourceMappingURL=portfolioRoutes.js.map