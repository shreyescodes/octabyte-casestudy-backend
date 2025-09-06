"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PortfolioService = void 0;
const database_1 = __importDefault(require("../config/database"));
const logger_1 = require("../utils/logger");
class PortfolioService {
    /**
     * Get all stocks from database
     */
    static async getAllStocks() {
        try {
            const query = `
        SELECT 
          id,
          stock_name,
          purchase_price,
          quantity,
          investment,
          portfolio_percentage,
          stock_exchange_code,
          current_market_price,
          present_value,
          gain_loss,
          pe_ratio,
          latest_earnings,
          sector,
          created_at,
          updated_at,
          created_at as purchase_date,
          updated_at as last_updated
        FROM stocks 
        ORDER BY created_at DESC
      `;
            const result = await database_1.default.query(query);
            return result.rows.map((row) => ({
                id: row.id,
                stockName: row.stock_name,
                symbol: row.stock_name, // We'll need to add symbol column later
                purchasePrice: parseFloat(row.purchase_price),
                quantity: parseInt(row.quantity),
                investment: parseFloat(row.investment),
                portfolioPercentage: parseFloat(row.portfolio_percentage),
                stockExchangeCode: row.stock_exchange_code,
                currentMarketPrice: parseFloat(row.current_market_price),
                presentValue: parseFloat(row.present_value),
                gainLoss: parseFloat(row.gain_loss),
                peRatio: parseFloat(row.pe_ratio || 0),
                latestEarnings: parseFloat(row.latest_earnings || 0),
                sector: row.sector,
                purchaseDate: row.purchase_date?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
                lastUpdated: row.last_updated?.toISOString() || new Date().toISOString(),
                createdAt: row.created_at?.toISOString() || new Date().toISOString(),
                updatedAt: row.updated_at?.toISOString() || new Date().toISOString()
            }));
        }
        catch (error) {
            logger_1.logger.error('Error fetching stocks from database:', error);
            throw new Error('Failed to fetch stocks from database');
        }
    }
    /**
     * Get portfolio summary
     */
    static async getPortfolioSummary() {
        const stocks = await this.getAllStocks();
        const totalInvestment = stocks.reduce((sum, stock) => sum + stock.investment, 0);
        const totalPresentValue = stocks.reduce((sum, stock) => sum + stock.presentValue, 0);
        const totalGainLoss = totalPresentValue - totalInvestment;
        // Update portfolio percentages
        const updatedStocks = stocks.map(stock => ({
            ...stock,
            portfolioPercentage: totalInvestment > 0 ? (stock.investment / totalInvestment) * 100 : 0
        }));
        return {
            totalInvestment,
            totalPresentValue,
            totalGainLoss,
            stocks: updatedStocks
        };
    }
    /**
     * Get sector summary
     */
    static async getSectorSummary() {
        const stocks = await this.getAllStocks();
        const sectorMap = new Map();
        stocks.forEach(stock => {
            if (!sectorMap.has(stock.sector)) {
                sectorMap.set(stock.sector, []);
            }
            sectorMap.get(stock.sector).push(stock);
        });
        return Array.from(sectorMap.entries()).map(([sector, sectorStocks]) => {
            const totalInvestment = sectorStocks.reduce((sum, stock) => sum + stock.investment, 0);
            const totalPresentValue = sectorStocks.reduce((sum, stock) => sum + stock.presentValue, 0);
            const totalGainLoss = totalPresentValue - totalInvestment;
            const gainLossPercentage = totalInvestment > 0 ? (totalGainLoss / totalInvestment) * 100 : 0;
            return {
                sector,
                totalInvestment,
                totalPresentValue,
                totalGainLoss,
                stocks: sectorStocks,
                stockCount: sectorStocks.length,
                gainLossPercentage
            };
        });
    }
    /**
     * Create new stock
     */
    static async createStock(stockData) {
        try {
            const query = `
        INSERT INTO stocks (
          stock_name, purchase_price, quantity, investment,
          stock_exchange_code, current_market_price, present_value,
          gain_loss, pe_ratio, latest_earnings, sector
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `;
            const investment = stockData.purchasePrice * stockData.quantity;
            const presentValue = stockData.currentMarketPrice * stockData.quantity;
            const gainLoss = presentValue - investment;
            const values = [
                stockData.stockName,
                stockData.purchasePrice,
                stockData.quantity,
                investment,
                stockData.stockExchangeCode,
                stockData.currentMarketPrice,
                presentValue,
                gainLoss,
                stockData.peRatio || 0,
                stockData.latestEarnings || 0,
                stockData.sector
            ];
            const result = await database_1.default.query(query, values);
            const row = result.rows[0];
            return {
                id: row.id,
                stockName: row.stock_name,
                symbol: row.stock_name,
                purchasePrice: parseFloat(row.purchase_price),
                quantity: parseInt(row.quantity),
                investment: parseFloat(row.investment),
                portfolioPercentage: 0,
                stockExchangeCode: row.stock_exchange_code,
                currentMarketPrice: parseFloat(row.current_market_price),
                presentValue: parseFloat(row.present_value),
                gainLoss: parseFloat(row.gain_loss),
                peRatio: parseFloat(row.pe_ratio || 0),
                latestEarnings: parseFloat(row.latest_earnings || 0),
                sector: row.sector,
                purchaseDate: row.created_at?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
                lastUpdated: row.updated_at?.toISOString() || new Date().toISOString(),
                createdAt: row.created_at?.toISOString() || new Date().toISOString(),
                updatedAt: row.updated_at?.toISOString() || new Date().toISOString()
            };
        }
        catch (error) {
            logger_1.logger.error('Error creating stock:', error);
            throw new Error('Failed to create stock');
        }
    }
    /**
     * Update stock
     */
    static async updateStock(id, updates) {
        try {
            // First get the current stock
            const currentStock = await this.getStockById(id);
            if (!currentStock) {
                throw new Error('Stock not found');
            }
            // Calculate new values
            const updatedStock = { ...currentStock, ...updates };
            const investment = updatedStock.purchasePrice * updatedStock.quantity;
            const presentValue = updatedStock.currentMarketPrice * updatedStock.quantity;
            const gainLoss = presentValue - investment;
            const query = `
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
        RETURNING *
      `;
            const values = [
                updatedStock.stockName,
                updatedStock.purchasePrice,
                updatedStock.quantity,
                investment,
                updatedStock.stockExchangeCode,
                updatedStock.currentMarketPrice,
                presentValue,
                gainLoss,
                updatedStock.peRatio,
                updatedStock.latestEarnings,
                updatedStock.sector,
                id
            ];
            const result = await database_1.default.query(query, values);
            const row = result.rows[0];
            return {
                id: row.id,
                stockName: row.stock_name,
                symbol: row.stock_name,
                purchasePrice: parseFloat(row.purchase_price),
                quantity: parseInt(row.quantity),
                investment: parseFloat(row.investment),
                portfolioPercentage: 0,
                stockExchangeCode: row.stock_exchange_code,
                currentMarketPrice: parseFloat(row.current_market_price),
                presentValue: parseFloat(row.present_value),
                gainLoss: parseFloat(row.gain_loss),
                peRatio: parseFloat(row.pe_ratio || 0),
                latestEarnings: parseFloat(row.latest_earnings || 0),
                sector: row.sector,
                purchaseDate: row.created_at?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
                lastUpdated: row.updated_at?.toISOString() || new Date().toISOString(),
                createdAt: row.created_at?.toISOString() || new Date().toISOString(),
                updatedAt: row.updated_at?.toISOString() || new Date().toISOString()
            };
        }
        catch (error) {
            logger_1.logger.error('Error updating stock:', error);
            throw new Error('Failed to update stock');
        }
    }
    /**
     * Delete stock
     */
    static async deleteStock(id) {
        try {
            const query = 'DELETE FROM stocks WHERE id = $1';
            const result = await database_1.default.query(query, [id]);
            return result.rowCount > 0;
        }
        catch (error) {
            logger_1.logger.error('Error deleting stock:', error);
            throw new Error('Failed to delete stock');
        }
    }
    /**
     * Get stock by ID
     */
    static async getStockById(id) {
        try {
            const query = 'SELECT * FROM stocks WHERE id = $1';
            const result = await database_1.default.query(query, [id]);
            if (result.rows.length === 0) {
                return null;
            }
            const row = result.rows[0];
            return {
                id: row.id,
                stockName: row.stock_name,
                symbol: row.stock_name,
                purchasePrice: parseFloat(row.purchase_price),
                quantity: parseInt(row.quantity),
                investment: parseFloat(row.investment),
                portfolioPercentage: parseFloat(row.portfolio_percentage),
                stockExchangeCode: row.stock_exchange_code,
                currentMarketPrice: parseFloat(row.current_market_price),
                presentValue: parseFloat(row.present_value),
                gainLoss: parseFloat(row.gain_loss),
                peRatio: parseFloat(row.pe_ratio || 0),
                latestEarnings: parseFloat(row.latest_earnings || 0),
                sector: row.sector,
                purchaseDate: row.created_at?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
                lastUpdated: row.updated_at?.toISOString() || new Date().toISOString(),
                createdAt: row.created_at?.toISOString() || new Date().toISOString(),
                updatedAt: row.updated_at?.toISOString() || new Date().toISOString()
            };
        }
        catch (error) {
            logger_1.logger.error('Error fetching stock by ID:', error);
            throw new Error('Failed to fetch stock');
        }
    }
}
exports.PortfolioService = PortfolioService;
exports.default = PortfolioService;
