"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const stockController_1 = __importDefault(require("../controllers/stockController"));
const router = express_1.default.Router();
// Get all stocks
router.get('/', stockController_1.default.getAllStocks);
// Search stocks
router.get('/search', stockController_1.default.searchStocks);
// Get stock by ID
router.get('/:id', stockController_1.default.getStockById);
// Create new stock
router.post('/', stockController_1.default.createStock);
// Update stock
router.put('/:id', stockController_1.default.updateStock);
// Delete stock
router.delete('/:id', stockController_1.default.deleteStock);
// Refresh stock market data
router.post('/:id/refresh', stockController_1.default.refreshStockData);
exports.default = router;
