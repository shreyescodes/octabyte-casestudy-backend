"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.priceUpdateService = exports.PriceUpdateService = void 0;
const database_1 = __importDefault(require("../config/database"));
const marketDataService_1 = require("./marketDataService");
const logger_1 = require("../utils/logger");
class PriceUpdateService {
    constructor() {
        this.updateInterval = null;
        this.UPDATE_INTERVAL = 5 * 60 * 1000; // 5 minutes
        this.isUpdating = false;
    }
    /**
     * Start automatic price updates
     */
    startAutoUpdate() {
        if (this.updateInterval) {
            logger_1.logger.warn('Price update service is already running');
            return;
        }
        logger_1.logger.info(`Starting automatic price updates every ${this.UPDATE_INTERVAL / 1000} seconds`);
        // Initial update
        this.updateAllStockPrices();
        // Set up recurring updates
        this.updateInterval = setInterval(() => {
            this.updateAllStockPrices();
        }, this.UPDATE_INTERVAL);
    }
    /**
     * Stop automatic price updates
     */
    stopAutoUpdate() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
            logger_1.logger.info('Stopped automatic price updates');
        }
    }
    /**
     * Update prices for all stocks in the database
     */
    async updateAllStockPrices() {
        if (this.isUpdating) {
            logger_1.logger.debug('Price update already in progress, skipping');
            return;
        }
        this.isUpdating = true;
        const startTime = Date.now();
        try {
            logger_1.logger.info('🔄 Starting portfolio price update...');
            // Get all stocks from database
            const stocksResult = await database_1.default.query(`
        SELECT id, stock_name, purchase_price, quantity, stock_exchange_code, sector
        FROM stocks
      `);
            const stocks = stocksResult.rows;
            if (stocks.length === 0) {
                logger_1.logger.info('No stocks found in portfolio');
                return;
            }
            logger_1.logger.info(`Updating prices for ${stocks.length} stocks`);
            // Extract symbols for batch fetching
            const symbols = stocks.map((stock) => this.extractStockSymbol(stock.stock_name));
            // Fetch market data in batch
            const marketDataResults = await marketDataService_1.marketDataService.getBatchMarketData(symbols);
            let updatedCount = 0;
            let totalInvestment = 0;
            let totalPresentValue = 0;
            // Update each stock
            for (const stock of stocks) {
                try {
                    const symbol = this.extractStockSymbol(stock.stock_name);
                    const marketData = marketDataResults[symbol];
                    let currentMarketPrice = stock.purchase_price; // Fallback
                    let peRatio = 0;
                    let latestEarnings = 0;
                    if (marketData) {
                        currentMarketPrice = marketData.currentPrice;
                        peRatio = marketData.peRatio || 0;
                        latestEarnings = marketData.latestEarnings || 0;
                    }
                    // Calculate derived values
                    const investment = stock.purchase_price * stock.quantity;
                    const presentValue = currentMarketPrice * stock.quantity;
                    const gainLoss = presentValue - investment;
                    // Update stock in database
                    await database_1.default.query(`
            UPDATE stocks 
            SET 
              current_market_price = $1,
              present_value = $2,
              gain_loss = $3,
              pe_ratio = $4,
              latest_earnings = $5,
              updated_at = NOW()
            WHERE id = $6
          `, [currentMarketPrice, presentValue, gainLoss, peRatio, latestEarnings, stock.id]);
                    totalInvestment += investment;
                    totalPresentValue += presentValue;
                    updatedCount++;
                    if (marketData) {
                        const changeText = marketData.changePercent !== undefined
                            ? `${marketData.changePercent > 0 ? '+' : ''}${marketData.changePercent.toFixed(2)}%`
                            : 'N/A';
                        logger_1.logger.debug(`✅ Updated ${stock.stock_name}: ₹${currentMarketPrice} (${changeText})`);
                    }
                }
                catch (error) {
                    logger_1.logger.error(`Error updating stock ${stock.stock_name}:`, error);
                }
            }
            // Update portfolio percentages
            if (totalInvestment > 0) {
                await database_1.default.query(`
          UPDATE stocks 
          SET portfolio_percentage = (investment / $1) * 100
        `, [totalInvestment]);
            }
            // Create portfolio snapshot
            const totalGainLoss = totalPresentValue - totalInvestment;
            await database_1.default.query(`
        INSERT INTO portfolio_snapshots (total_investment, total_present_value, total_gain_loss)
        VALUES ($1, $2, $3)
      `, [totalInvestment, totalPresentValue, totalGainLoss]);
            const duration = Date.now() - startTime;
            const gainLossPercent = totalInvestment > 0 ? ((totalGainLoss / totalInvestment) * 100).toFixed(2) : '0.00';
            logger_1.logger.info(`✅ Portfolio update completed in ${duration}ms`);
            logger_1.logger.info(`📊 Updated ${updatedCount}/${stocks.length} stocks`);
            logger_1.logger.info(`💰 Total Value: ₹${totalPresentValue.toLocaleString('en-IN')} (${gainLossPercent}% ${totalGainLoss >= 0 ? 'gain' : 'loss'})`);
        }
        catch (error) {
            logger_1.logger.error('❌ Error during portfolio price update:', error);
        }
        finally {
            this.isUpdating = false;
        }
    }
    /**
     * Update price for a specific stock
     */
    async updateStockPrice(stockId) {
        try {
            // Get stock details
            const stockResult = await database_1.default.query(`
        SELECT id, stock_name, purchase_price, quantity, stock_exchange_code
        FROM stocks
        WHERE id = $1
      `, [stockId]);
            if (stockResult.rows.length === 0) {
                logger_1.logger.warn(`Stock with ID ${stockId} not found`);
                return false;
            }
            const stock = stockResult.rows[0];
            const symbol = this.extractStockSymbol(stock.stock_name);
            // Fetch live market data
            const marketData = await marketDataService_1.marketDataService.getMarketData(symbol, stock.stock_exchange_code);
            let currentMarketPrice = stock.purchase_price; // Fallback
            let peRatio = 0;
            let latestEarnings = 0;
            if (marketData) {
                currentMarketPrice = marketData.currentPrice;
                peRatio = marketData.peRatio || 0;
                latestEarnings = marketData.latestEarnings || 0;
            }
            // Calculate derived values
            const investment = stock.purchase_price * stock.quantity;
            const presentValue = currentMarketPrice * stock.quantity;
            const gainLoss = presentValue - investment;
            // Update stock in database
            await database_1.default.query(`
        UPDATE stocks 
        SET 
          current_market_price = $1,
          present_value = $2,
          gain_loss = $3,
          pe_ratio = $4,
          latest_earnings = $5,
          updated_at = NOW()
        WHERE id = $6
      `, [currentMarketPrice, presentValue, gainLoss, peRatio, latestEarnings, stockId]);
            // Update portfolio percentages for all stocks
            const totalInvestmentResult = await database_1.default.query('SELECT SUM(investment) as total FROM stocks');
            const totalInvestment = totalInvestmentResult.rows[0]?.total || 0;
            if (totalInvestment > 0) {
                await database_1.default.query(`
          UPDATE stocks 
          SET portfolio_percentage = (investment / $1) * 100
        `, [totalInvestment]);
            }
            logger_1.logger.info(`✅ Updated ${stock.stock_name}: ₹${currentMarketPrice}`);
            return true;
        }
        catch (error) {
            logger_1.logger.error(`Error updating price for stock ${stockId}:`, error);
            return false;
        }
    }
    /**
     * Extract stock symbol from stock name - completely dynamic approach
     */
    extractStockSymbol(stockName) {
        // Dynamic extraction without hardcoded mappings
        // Remove common company suffixes and extract symbol
        return stockName
            .replace(/\s+(Ltd|Limited|Corporation|Corp|Inc|Pvt)\.?$/i, '') // Remove company suffixes
            .replace(/\s+(Industries|Bank|Services|Finance|Consultancy|Telecom|Motors)$/i, '') // Remove business type words
            .split(' ') // Split by spaces
            .map(word => word.substring(0, 4)) // Take first 4 chars of each word
            .join('') // Join them
            .toUpperCase()
            .substring(0, 10); // Limit to 10 chars
    }
    /**
     * Get update service status
     */
    getStatus() {
        return {
            isRunning: this.updateInterval !== null,
            isUpdating: this.isUpdating,
            updateInterval: this.UPDATE_INTERVAL,
            nextUpdate: this.updateInterval ? new Date(Date.now() + this.UPDATE_INTERVAL) : undefined
        };
    }
}
exports.PriceUpdateService = PriceUpdateService;
// Create singleton instance
exports.priceUpdateService = new PriceUpdateService();
// Start price updates when the service is imported
exports.priceUpdateService.startAutoUpdate();
exports.default = exports.priceUpdateService;
