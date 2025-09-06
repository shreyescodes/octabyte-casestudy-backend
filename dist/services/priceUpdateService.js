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
        this.UPDATE_INTERVAL = 5 * 60 * 1000;
        this.isUpdating = false;
    }
    startAutoUpdate() {
        if (this.updateInterval) {
            logger_1.logger.warn('Price update service is already running');
            return;
        }
        logger_1.logger.info(`Starting automatic price updates every ${this.UPDATE_INTERVAL / 1000} seconds`);
        this.updateAllStockPrices();
        this.updateInterval = setInterval(() => {
            this.updateAllStockPrices();
        }, this.UPDATE_INTERVAL);
    }
    stopAutoUpdate() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
            logger_1.logger.info('Stopped automatic price updates');
        }
    }
    async updateAllStockPrices() {
        if (this.isUpdating) {
            logger_1.logger.debug('Price update already in progress, skipping');
            return;
        }
        this.isUpdating = true;
        const startTime = Date.now();
        try {
            logger_1.logger.info('🔄 Starting portfolio price update...');
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
            const symbols = stocks.map((stock) => this.extractStockSymbol(stock.stock_name));
            const marketDataResults = await marketDataService_1.marketDataService.getBatchMarketData(symbols);
            let updatedCount = 0;
            let totalInvestment = 0;
            let totalPresentValue = 0;
            for (const stock of stocks) {
                try {
                    const symbol = this.extractStockSymbol(stock.stock_name);
                    const marketData = marketDataResults[symbol];
                    let currentMarketPrice = stock.purchase_price;
                    let peRatio = 0;
                    let latestEarnings = 0;
                    if (marketData) {
                        currentMarketPrice = marketData.currentPrice;
                        peRatio = marketData.peRatio || 0;
                        latestEarnings = marketData.latestEarnings || 0;
                    }
                    const investment = stock.purchase_price * stock.quantity;
                    const presentValue = currentMarketPrice * stock.quantity;
                    const gainLoss = presentValue - investment;
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
            if (totalInvestment > 0) {
                await database_1.default.query(`
          UPDATE stocks 
          SET portfolio_percentage = (investment / $1) * 100
        `, [totalInvestment]);
            }
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
    async updateStockPrice(stockId) {
        try {
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
            const marketData = await marketDataService_1.marketDataService.getMarketData(symbol, stock.stock_exchange_code);
            let currentMarketPrice = stock.purchase_price;
            let peRatio = 0;
            let latestEarnings = 0;
            if (marketData) {
                currentMarketPrice = marketData.currentPrice;
                peRatio = marketData.peRatio || 0;
                latestEarnings = marketData.latestEarnings || 0;
            }
            const investment = stock.purchase_price * stock.quantity;
            const presentValue = currentMarketPrice * stock.quantity;
            const gainLoss = presentValue - investment;
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
    extractStockSymbol(stockName) {
        return stockName
            .replace(/\s+(Ltd|Limited|Corporation|Corp|Inc|Pvt)\.?$/i, '')
            .replace(/\s+(Industries|Bank|Services|Finance|Consultancy|Telecom|Motors)$/i, '')
            .split(' ')
            .map(word => word.substring(0, 4))
            .join('')
            .toUpperCase()
            .substring(0, 10);
    }
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
exports.priceUpdateService = new PriceUpdateService();
exports.priceUpdateService.startAutoUpdate();
exports.default = exports.priceUpdateService;
