"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const stockController_1 = __importDefault(require("../controllers/stockController"));
const router = express_1.default.Router();
router.get('/', stockController_1.default.getAllStocks);
router.get('/search', stockController_1.default.searchStocks);
router.get('/:id', stockController_1.default.getStockById);
router.post('/', stockController_1.default.createStock);
router.put('/:id', stockController_1.default.updateStock);
router.delete('/:id', stockController_1.default.deleteStock);
router.post('/:id/refresh', stockController_1.default.refreshStockData);
exports.default = router;
//# sourceMappingURL=stockRoutes.js.map