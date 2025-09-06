"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const uuid_1 = require("uuid");
const marketDataService_1 = __importDefault(require("../services/marketDataService"));
const logger_1 = require("../utils/logger");
const database_1 = __importDefault(require("../config/database"));
const stockService_1 = require("../services/stockService");
class StockController {
    static async getAllStocks(req, res) {
        try {
            logger_1.logger.info('Fetching all stocks with live market data');
            const result = await database_1.default.query(`
        SELECT id, stock_name as "stockName", purchase_price as "purchasePrice", 
               quantity, investment, portfolio_percentage as "portfolioPercentage",
               stock_exchange_code as "stockExchangeCode", current_market_price as "currentMarketPrice",
               present_value as "presentValue", gain_loss as "gainLoss",
               pe_ratio as "peRatio", latest_earnings as "latestEarnings", sector,
               created_at as "createdAt", updated_at as "updatedAt"
        FROM stocks ORDER BY created_at DESC
      `);
            const stocks = [];
            for (const row of result.rows) {
                const symbol = StockController.extractStockSymbol(row.stockName);
                logger_1.logger.info(`Fetching live data for ${row.stockName} (${symbol})`);
                const marketData = await marketDataService_1.default.getMarketData(symbol, row.stockExchangeCode);
                let currentMarketPrice = parseFloat(row.currentMarketPrice);
                let peRatio = row.peRatio ? parseFloat(row.peRatio) : undefined;
                let latestEarnings = row.latestEarnings ? parseFloat(row.latestEarnings) : undefined;
                if (marketData) {
                    currentMarketPrice = marketData.currentPrice;
                    peRatio = marketData.peRatio || peRatio;
                    latestEarnings = marketData.latestEarnings || latestEarnings;
                }
                const investment = parseFloat(row.investment);
                const presentValue = currentMarketPrice * parseInt(row.quantity);
                const gainLoss = presentValue - investment;
                const stock = {
                    id: row.id,
                    stockName: row.stockName,
                    symbol: symbol,
                    purchasePrice: parseFloat(row.purchasePrice),
                    quantity: parseInt(row.quantity),
                    investment: investment,
                    portfolioPercentage: parseFloat(row.portfolioPercentage),
                    stockExchangeCode: row.stockExchangeCode,
                    currentMarketPrice: currentMarketPrice,
                    presentValue: presentValue,
                    gainLoss: gainLoss,
                    peRatio: peRatio || 0,
                    latestEarnings: latestEarnings || 0,
                    sector: row.sector,
                    purchaseDate: row.createdAt ? new Date(row.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                    lastUpdated: new Date().toISOString(),
                    createdAt: row.createdAt,
                    updatedAt: row.updatedAt
                };
                stocks.push(stock);
            }
            res.json({
                success: true,
                data: stocks
            });
        }
        catch (error) {
            logger_1.logger.error('Error fetching stocks:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch stocks',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    static extractStockSymbol(stockName) {
        const symbolMapping = {
            'Reliance Industries Ltd': 'RELIANCE.NS',
            'Tata Consultancy Services Ltd': 'TCS.NS',
            'HDFC Bank Ltd': 'HDFCBANK.NS',
            'Infosys Ltd': 'INFY.NS',
            'ITC Ltd': 'ITC.NS',
            'State Bank of India': 'SBIN.NS',
            'Bharti Airtel Ltd': 'BHARTIARTL.NS',
            'Kotak Mahindra Bank Ltd': 'KOTAKBANK.NS',
            'Hindustan Unilever Ltd': 'HINDUNILVR.NS',
            'Larsen & Toubro Ltd': 'LT.NS'
        };
        if (symbolMapping[stockName]) {
            return symbolMapping[stockName];
        }
        const firstWord = stockName.split(' ')[0].toUpperCase();
        return `${firstWord}.NS`;
    }
    static async getStockById(req, res) {
        try {
            const { id } = req.params;
            if (!id) {
                res.status(400).json({
                    success: false,
                    message: 'Stock ID is required'
                });
                return;
            }
            const result = await database_1.default.query(`
        SELECT id, stock_name as "stockName", purchase_price as "purchasePrice", 
               quantity, investment, portfolio_percentage as "portfolioPercentage",
               stock_exchange_code as "stockExchangeCode", current_market_price as "currentMarketPrice",
               present_value as "presentValue", gain_loss as "gainLoss",
               pe_ratio as "peRatio", latest_earnings as "latestEarnings", sector,
               created_at as "createdAt", updated_at as "updatedAt"
        FROM stocks WHERE id = $1
      `, [id]);
            if (result.rows.length === 0) {
                res.status(404).json({
                    success: false,
                    message: `Stock with ID ${id} not found`
                });
                return;
            }
            const row = result.rows[0];
            const symbol = StockController.extractStockSymbol(row.stockName);
            const marketData = await marketDataService_1.default.getMarketData(symbol, row.stockExchangeCode);
            let currentMarketPrice = parseFloat(row.currentMarketPrice);
            let peRatio = row.peRatio ? parseFloat(row.peRatio) : 0;
            let latestEarnings = row.latestEarnings ? parseFloat(row.latestEarnings) : 0;
            if (marketData) {
                currentMarketPrice = marketData.currentPrice;
                peRatio = marketData.peRatio || peRatio;
                latestEarnings = marketData.latestEarnings || latestEarnings;
            }
            const investment = parseFloat(row.investment);
            const presentValue = currentMarketPrice * parseInt(row.quantity);
            const gainLoss = presentValue - investment;
            const stock = {
                id: row.id,
                stockName: row.stockName,
                symbol: symbol,
                purchasePrice: parseFloat(row.purchasePrice),
                quantity: parseInt(row.quantity),
                investment: investment,
                portfolioPercentage: parseFloat(row.portfolioPercentage),
                stockExchangeCode: row.stockExchangeCode,
                currentMarketPrice: currentMarketPrice,
                presentValue: presentValue,
                gainLoss: gainLoss,
                peRatio: peRatio,
                latestEarnings: latestEarnings,
                sector: row.sector,
                purchaseDate: row.createdAt ? new Date(row.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                lastUpdated: new Date().toISOString(),
                createdAt: row.createdAt,
                updatedAt: row.updatedAt
            };
            res.json({
                success: true,
                data: stock
            });
        }
        catch (error) {
            logger_1.logger.error(`Error fetching stock ${req.params.id}:`, error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch stock',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    static async createStock(req, res) {
        try {
            const stockData = req.body;
            if (!stockData.stockName || !stockData.purchasePrice || !stockData.quantity) {
                res.status(400).json({
                    success: false,
                    message: 'Missing required fields: stockName, purchasePrice, quantity'
                });
                return;
            }
            const stockId = (0, uuid_1.v4)();
            const symbol = StockController.extractStockSymbol(stockData.stockName);
            let currentMarketPrice = stockData.purchasePrice;
            let peRatio = 0;
            let latestEarnings = 0;
            try {
                logger_1.logger.info(`Fetching live market data for new stock: ${stockData.stockName} (${symbol})`);
                const marketData = await marketDataService_1.default.getMarketData(symbol, stockData.stockExchangeCode || 'NSE');
                if (marketData) {
                    currentMarketPrice = marketData.currentPrice;
                    peRatio = marketData.peRatio || 0;
                    latestEarnings = marketData.latestEarnings || 0;
                }
            }
            catch (error) {
                logger_1.logger.warn(`Failed to fetch market data for ${stockData.stockName}, using purchase price`);
            }
            const investment = stockData.purchasePrice * stockData.quantity;
            const presentValue = currentMarketPrice * stockData.quantity;
            const gainLoss = presentValue - investment;
            await database_1.default.query(`
        INSERT INTO stocks (
          id, stock_name, purchase_price, quantity, investment, 
          stock_exchange_code, current_market_price, present_value, 
          gain_loss, pe_ratio, latest_earnings, sector, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
      `, [
                stockId, stockData.stockName, stockData.purchasePrice, stockData.quantity,
                investment, stockData.stockExchangeCode || 'NSE', currentMarketPrice,
                presentValue, gainLoss, peRatio, latestEarnings, stockData.sector || 'Technology'
            ]);
            await StockController.recalculatePortfolioPercentages();
            const result = await database_1.default.query(`
        SELECT id, stock_name as "stockName", purchase_price as "purchasePrice", 
               quantity, investment, portfolio_percentage as "portfolioPercentage",
               stock_exchange_code as "stockExchangeCode", current_market_price as "currentMarketPrice",
               present_value as "presentValue", gain_loss as "gainLoss",
               pe_ratio as "peRatio", latest_earnings as "latestEarnings", sector,
               created_at as "createdAt", updated_at as "updatedAt"
        FROM stocks WHERE id = $1
      `, [stockId]);
            const newStock = {
                id: result.rows[0].id,
                stockName: result.rows[0].stockName,
                symbol: symbol,
                purchasePrice: parseFloat(result.rows[0].purchasePrice),
                quantity: parseInt(result.rows[0].quantity),
                investment: parseFloat(result.rows[0].investment),
                portfolioPercentage: parseFloat(result.rows[0].portfolioPercentage),
                stockExchangeCode: result.rows[0].stockExchangeCode,
                currentMarketPrice: parseFloat(result.rows[0].currentMarketPrice),
                presentValue: parseFloat(result.rows[0].presentValue),
                gainLoss: parseFloat(result.rows[0].gainLoss),
                peRatio: parseFloat(result.rows[0].peRatio) || 0,
                latestEarnings: parseFloat(result.rows[0].latestEarnings) || 0,
                sector: result.rows[0].sector,
                purchaseDate: result.rows[0].createdAt ? new Date(result.rows[0].createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                lastUpdated: new Date().toISOString(),
                createdAt: result.rows[0].createdAt,
                updatedAt: result.rows[0].updatedAt
            };
            logger_1.logger.info(`Created new stock: ${newStock.stockName} (${symbol}) with live market data`);
            res.status(201).json({
                success: true,
                data: newStock,
                message: 'Stock added to portfolio successfully with live market data'
            });
        }
        catch (error) {
            logger_1.logger.error('Error creating stock:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to add stock to portfolio',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    static async updateStock(req, res) {
        try {
            const { id } = req.params;
            const updateData = req.body;
            if (!id) {
                res.status(400).json({
                    success: false,
                    message: 'Stock ID is required'
                });
                return;
            }
            logger_1.logger.info(`Updating stock ${id} with data:`, updateData);
            if (updateData.stockName || updateData.stockExchangeCode) {
                try {
                    const symbol = updateData.stockName || (await stockService_1.StockService.getStockById(id))?.stockName;
                    const exchange = updateData.stockExchangeCode || (await stockService_1.StockService.getStockById(id))?.stockExchangeCode || 'NSE';
                    if (symbol) {
                        const marketData = await marketDataService_1.default.getMarketData(symbol, exchange);
                        if (marketData) {
                            updateData.currentMarketPrice = marketData.currentPrice;
                            updateData.peRatio = marketData.peRatio;
                            updateData.latestEarnings = marketData.latestEarnings;
                        }
                    }
                }
                catch (marketError) {
                    logger_1.logger.warn(`Failed to fetch live market data for stock update: ${marketError}`);
                }
            }
            const updatedStock = await stockService_1.StockService.updateStock(id, updateData);
            if (!updatedStock) {
                res.status(404).json({
                    success: false,
                    message: 'Stock not found'
                });
                return;
            }
            logger_1.logger.info(`Successfully updated stock: ${updatedStock.stockName}`);
            res.json({
                success: true,
                data: updatedStock,
                message: 'Stock updated successfully'
            });
        }
        catch (error) {
            logger_1.logger.error('Error updating stock:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update stock',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    static async deleteStock(req, res) {
        try {
            const { id } = req.params;
            if (!id) {
                res.status(400).json({
                    success: false,
                    message: 'Stock ID is required'
                });
                return;
            }
            const checkResult = await database_1.default.query(`
        SELECT id, stock_name as "stockName", quantity, investment
        FROM stocks WHERE id = $1
      `, [id]);
            if (checkResult.rows.length === 0) {
                res.status(404).json({
                    success: false,
                    message: `Stock with ID ${id} not found`
                });
                return;
            }
            const stock = checkResult.rows[0];
            await database_1.default.query('DELETE FROM stocks WHERE id = $1', [id]);
            await StockController.recalculatePortfolioPercentages();
            logger_1.logger.info(`Deleted stock holding: ${stock.stockName} (Qty: ${stock.quantity}, Investment: ₹${stock.investment})`);
            res.json({
                success: true,
                message: 'Stock holding removed from portfolio successfully',
                data: {
                    id: stock.id,
                    stockName: stock.stockName,
                    quantity: stock.quantity,
                    investment: stock.investment
                }
            });
        }
        catch (error) {
            logger_1.logger.error(`Error deleting stock ${req.params.id}:`, error);
            res.status(500).json({
                success: false,
                message: 'Failed to remove stock holding',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    static async recalculatePortfolioPercentages() {
        try {
            const totalResult = await database_1.default.query('SELECT SUM(investment) as total FROM stocks');
            const totalInvestment = parseFloat(totalResult.rows[0]?.total || '0');
            if (totalInvestment > 0) {
                await database_1.default.query(`
          UPDATE stocks 
          SET portfolio_percentage = ROUND((investment / $1 * 100)::numeric, 2),
              updated_at = NOW()
        `, [totalInvestment]);
                logger_1.logger.info('Recalculated portfolio percentages after stock deletion');
            }
        }
        catch (error) {
            logger_1.logger.error('Error recalculating portfolio percentages:', error);
        }
    }
    static async searchStocks(req, res) {
        try {
            const { q } = req.query;
            if (!q || typeof q !== 'string' || q.length < 2) {
                res.status(400).json({
                    success: false,
                    message: 'Search query must be at least 2 characters'
                });
                return;
            }
            const query = q.toLowerCase().trim();
            const indianStocks = [
                { name: 'Reliance Industries Ltd', symbol: 'RELIANCE.NS', exchange: 'NSE', sector: 'Energy' },
                { name: 'Tata Consultancy Services Ltd', symbol: 'TCS.NS', exchange: 'NSE', sector: 'Technology' },
                { name: 'HDFC Bank Ltd', symbol: 'HDFCBANK.NS', exchange: 'NSE', sector: 'Financials' },
                { name: 'Infosys Ltd', symbol: 'INFY.NS', exchange: 'NSE', sector: 'Technology' },
                { name: 'ITC Ltd', symbol: 'ITC.NS', exchange: 'NSE', sector: 'Consumer Goods' },
                { name: 'State Bank of India', symbol: 'SBIN.NS', exchange: 'NSE', sector: 'Financials' },
                { name: 'Bharti Airtel Ltd', symbol: 'BHARTIARTL.NS', exchange: 'NSE', sector: 'Telecommunications' },
                { name: 'Kotak Mahindra Bank Ltd', symbol: 'KOTAKBANK.NS', exchange: 'NSE', sector: 'Financials' },
                { name: 'Hindustan Unilever Ltd', symbol: 'HINDUNILVR.NS', exchange: 'NSE', sector: 'Consumer Goods' },
                { name: 'Larsen & Toubro Ltd', symbol: 'LT.NS', exchange: 'NSE', sector: 'Industrials' },
                { name: 'ICICI Bank Ltd', symbol: 'ICICIBANK.NS', exchange: 'NSE', sector: 'Financials' },
                { name: 'Wipro Ltd', symbol: 'WIPRO.NS', exchange: 'NSE', sector: 'Technology' },
                { name: 'Maruti Suzuki India Ltd', symbol: 'MARUTI.NS', exchange: 'NSE', sector: 'Auto' },
                { name: 'Asian Paints Ltd', symbol: 'ASIANPAINT.NS', exchange: 'NSE', sector: 'Materials' },
                { name: 'Bajaj Finance Ltd', symbol: 'BAJFINANCE.NS', exchange: 'NSE', sector: 'Financials' },
                { name: 'HCL Technologies Ltd', symbol: 'HCLTECH.NS', exchange: 'NSE', sector: 'Technology' },
                { name: 'Axis Bank Ltd', symbol: 'AXISBANK.NS', exchange: 'NSE', sector: 'Financials' },
                { name: 'Mahindra & Mahindra Ltd', symbol: 'M&M.NS', exchange: 'NSE', sector: 'Auto' },
                { name: 'Sun Pharmaceutical Industries Ltd', symbol: 'SUNPHARMA.NS', exchange: 'NSE', sector: 'Healthcare' },
                { name: 'Bajaj Auto Ltd', symbol: 'BAJAJ-AUTO.NS', exchange: 'NSE', sector: 'Auto' },
                { name: 'Adani Enterprises Ltd', symbol: 'ADANIENT.NS', exchange: 'NSE', sector: 'Energy' },
                { name: 'Tata Motors Ltd', symbol: 'TATAMOTORS.NS', exchange: 'NSE', sector: 'Auto' },
                { name: 'Tech Mahindra Ltd', symbol: 'TECHM.NS', exchange: 'NSE', sector: 'Technology' },
                { name: 'Power Grid Corporation of India Ltd', symbol: 'POWERGRID.NS', exchange: 'NSE', sector: 'Utilities' },
                { name: 'Nestle India Ltd', symbol: 'NESTLEIND.NS', exchange: 'NSE', sector: 'Consumer Goods' }
            ];
            const filteredStocks = indianStocks.filter(stock => stock.name.toLowerCase().includes(query) ||
                stock.symbol.toLowerCase().includes(query)).slice(0, 10);
            logger_1.logger.info(`Stock search for "${query}" returned ${filteredStocks.length} results`);
            res.json({
                success: true,
                data: filteredStocks,
                message: `Found ${filteredStocks.length} stocks matching "${q}"`
            });
        }
        catch (error) {
            logger_1.logger.error('Error searching stocks:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to search stocks',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    static async refreshStockData(req, res) {
        try {
            const { id } = req.params;
            if (!id) {
                res.status(400).json({
                    success: false,
                    message: 'Stock ID is required'
                });
                return;
            }
            const result = await database_1.default.query(`
        SELECT id, stock_name as "stockName", stock_exchange_code as "stockExchangeCode"
        FROM stocks WHERE id = $1
      `, [id]);
            if (result.rows.length === 0) {
                res.status(404).json({
                    success: false,
                    message: `Stock with ID ${id} not found`
                });
                return;
            }
            const row = result.rows[0];
            const symbol = StockController.extractStockSymbol(row.stockName);
            const marketData = await marketDataService_1.default.refreshSymbol(symbol, row.stockExchangeCode);
            if (marketData) {
                await database_1.default.query(`
          UPDATE stocks 
          SET current_market_price = $1, pe_ratio = $2, latest_earnings = $3, updated_at = NOW()
          WHERE id = $4
        `, [marketData.currentPrice, marketData.peRatio, marketData.latestEarnings, id]);
                logger_1.logger.info(`Refreshed market data for ${row.stockName} (${symbol})`);
                res.json({
                    success: true,
                    data: {
                        id: id,
                        symbol: symbol,
                        currentPrice: marketData.currentPrice,
                        peRatio: marketData.peRatio,
                        latestEarnings: marketData.latestEarnings,
                        lastUpdated: marketData.lastUpdated
                    },
                    message: 'Market data refreshed successfully'
                });
            }
            else {
                res.status(404).json({
                    success: false,
                    message: `Failed to fetch market data for ${symbol}`
                });
            }
        }
        catch (error) {
            logger_1.logger.error(`Error refreshing stock data ${req.params.id}:`, error);
            res.status(500).json({
                success: false,
                message: 'Failed to refresh stock data',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
}
exports.default = StockController;
