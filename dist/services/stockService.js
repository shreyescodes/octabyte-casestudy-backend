"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StockService = void 0;
const database_1 = __importDefault(require("../config/database"));
class StockService {
    static async getAllStocks() {
        const result = await database_1.default.query(`
      SELECT 
        id,
        stock_name as "stockName",
        purchase_price as "purchasePrice",
        quantity,
        investment,
        portfolio_percentage as "portfolioPercentage",
        stock_exchange_code as "stockExchangeCode",
        current_market_price as "currentMarketPrice",
        present_value as "presentValue",
        gain_loss as "gainLoss",
        pe_ratio as "peRatio",
        latest_earnings as "latestEarnings",
        sector,
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM stocks 
      ORDER BY created_at DESC
    `);
        return result.rows;
    }
    static async getStockById(id) {
        const result = await database_1.default.query(`
      SELECT 
        id,
        stock_name as "stockName",
        purchase_price as "purchasePrice",
        quantity,
        investment,
        portfolio_percentage as "portfolioPercentage",
        stock_exchange_code as "stockExchangeCode",
        current_market_price as "currentMarketPrice",
        present_value as "presentValue",
        gain_loss as "gainLoss",
        pe_ratio as "peRatio",
        latest_earnings as "latestEarnings",
        sector,
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM stocks 
      WHERE id = $1
    `, [id]);
        return result.rows[0] || null;
    }
    static async createStock(stockData) {
        const investment = stockData.purchasePrice * stockData.quantity;
        const presentValue = stockData.currentMarketPrice * stockData.quantity;
        const gainLoss = presentValue - investment;
        const result = await database_1.default.query(`
      INSERT INTO stocks (
        stock_name, purchase_price, quantity, investment,
        stock_exchange_code, current_market_price, present_value, gain_loss,
        pe_ratio, latest_earnings, sector
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING 
        id,
        stock_name as "stockName",
        purchase_price as "purchasePrice",
        quantity,
        investment,
        portfolio_percentage as "portfolioPercentage",
        stock_exchange_code as "stockExchangeCode",
        current_market_price as "currentMarketPrice",
        present_value as "presentValue",
        gain_loss as "gainLoss",
        pe_ratio as "peRatio",
        latest_earnings as "latestEarnings",
        sector,
        created_at as "createdAt",
        updated_at as "updatedAt"
    `, [
            stockData.stockName,
            stockData.purchasePrice,
            stockData.quantity,
            investment,
            stockData.stockExchangeCode,
            stockData.currentMarketPrice,
            presentValue,
            gainLoss,
            stockData.peRatio || null,
            stockData.latestEarnings || null,
            stockData.sector
        ]);
        await this.recalculatePortfolioPercentages();
        return result.rows[0];
    }
    static async updateStock(id, stockData) {
        const currentStock = await this.getStockById(id);
        if (!currentStock)
            return null;
        const updatedData = { ...currentStock, ...stockData };
        if (stockData.purchasePrice !== undefined || stockData.quantity !== undefined) {
            updatedData.investment = updatedData.purchasePrice * updatedData.quantity;
        }
        if (stockData.currentMarketPrice !== undefined || stockData.quantity !== undefined) {
            updatedData.presentValue = updatedData.currentMarketPrice * updatedData.quantity;
        }
        updatedData.gainLoss = updatedData.presentValue - updatedData.investment;
        const result = await database_1.default.query(`
      UPDATE stocks SET
        stock_name = $1,
        purchase_price = $2,
        quantity = $3,
        investment = $4,
        stock_exchange_code = $5,
        current_market_price = $6,
        present_value = $7,
        gain_loss = $8,
        pe_ratio = $9,
        latest_earnings = $10,
        sector = $11,
        updated_at = NOW()
      WHERE id = $12
      RETURNING 
        id,
        stock_name as "stockName",
        purchase_price as "purchasePrice",
        quantity,
        investment,
        portfolio_percentage as "portfolioPercentage",
        stock_exchange_code as "stockExchangeCode",
        current_market_price as "currentMarketPrice",
        present_value as "presentValue",
        gain_loss as "gainLoss",
        pe_ratio as "peRatio",
        latest_earnings as "latestEarnings",
        sector,
        created_at as "createdAt",
        updated_at as "updatedAt"
    `, [
            updatedData.stockName,
            updatedData.purchasePrice,
            updatedData.quantity,
            updatedData.investment,
            updatedData.stockExchangeCode,
            updatedData.currentMarketPrice,
            updatedData.presentValue,
            updatedData.gainLoss,
            updatedData.peRatio,
            updatedData.latestEarnings,
            updatedData.sector,
            id
        ]);
        await this.recalculatePortfolioPercentages();
        return result.rows[0];
    }
    static async deleteStock(id) {
        const result = await database_1.default.query('DELETE FROM stocks WHERE id = $1', [id]);
        if (result.rowCount > 0) {
            await this.recalculatePortfolioPercentages();
            return true;
        }
        return false;
    }
    static async getStocksBySector(sector) {
        const result = await database_1.default.query(`
      SELECT 
        id,
        stock_name as "stockName",
        purchase_price as "purchasePrice",
        quantity,
        investment,
        portfolio_percentage as "portfolioPercentage",
        stock_exchange_code as "stockExchangeCode",
        current_market_price as "currentMarketPrice",
        present_value as "presentValue",
        gain_loss as "gainLoss",
        pe_ratio as "peRatio",
        latest_earnings as "latestEarnings",
        sector,
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM stocks 
      WHERE sector = $1
      ORDER BY investment DESC
    `, [sector]);
        return result.rows;
    }
    static async recalculatePortfolioPercentages() {
        const totalResult = await database_1.default.query('SELECT SUM(investment) as total FROM stocks');
        const totalInvestment = totalResult.rows[0]?.total || 0;
        if (totalInvestment > 0) {
            await database_1.default.query(`
        UPDATE stocks 
        SET portfolio_percentage = (investment / $1) * 100
      `, [totalInvestment]);
        }
    }
}
exports.StockService = StockService;
