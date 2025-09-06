"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.historicalPriceService = void 0;
const yahooFinanceService_1 = require("./yahooFinanceService");
const logger_1 = require("../utils/logger");
class HistoricalPriceService {
    async getRealisticPurchasePrice(symbol) {
        try {
            logger_1.logger.info(`Getting realistic purchase price for ${symbol}`);
            const timePeriodsToTry = [3, 4, 5, 6];
            for (const monthsAgo of timePeriodsToTry) {
                try {
                    const historicalPrice = await yahooFinanceService_1.yahooFinanceService.getHistoricalPrice(symbol, monthsAgo);
                    if (historicalPrice && historicalPrice > 0) {
                        const currentPrice = await yahooFinanceService_1.yahooFinanceService.getCurrentPrice(symbol);
                        if (currentPrice) {
                            const purchaseDate = new Date();
                            purchaseDate.setMonth(purchaseDate.getMonth() - monthsAgo);
                            const result = {
                                symbol,
                                historicalPrice,
                                currentPrice,
                                purchaseDate: purchaseDate.toISOString().split('T')[0],
                                currency: this.detectCurrency(symbol),
                                source: 'yahoo-historical'
                            };
                            logger_1.logger.info(`Found realistic purchase price for ${symbol}: ${this.detectCurrency(symbol)}${historicalPrice} (${monthsAgo} months ago)`);
                            return result;
                        }
                    }
                }
                catch (error) {
                    logger_1.logger.warn(`Failed to get historical price for ${symbol} from ${monthsAgo} months ago:`, error);
                    continue;
                }
            }
            logger_1.logger.warn(`No historical data available for ${symbol}, using fallback calculation`);
            return await this.getFallbackPurchasePrice(symbol);
        }
        catch (error) {
            logger_1.logger.error(`Error getting realistic purchase price for ${symbol}:`, error);
            return null;
        }
    }
    async getFallbackPurchasePrice(symbol) {
        try {
            const currentPrice = await yahooFinanceService_1.yahooFinanceService.getCurrentPrice(symbol);
            if (!currentPrice) {
                return null;
            }
            const randomFactor = 0.7 + (Math.random() * 0.6);
            const historicalPrice = currentPrice * randomFactor;
            const monthsAgo = 2 + Math.floor(Math.random() * 6);
            const purchaseDate = new Date();
            purchaseDate.setMonth(purchaseDate.getMonth() - monthsAgo);
            const result = {
                symbol,
                historicalPrice,
                currentPrice,
                purchaseDate: purchaseDate.toISOString().split('T')[0],
                currency: this.detectCurrency(symbol),
                source: 'calculated-realistic'
            };
            logger_1.logger.info(`Generated realistic fallback price for ${symbol}: ${this.detectCurrency(symbol)}${historicalPrice.toFixed(2)}`);
            return result;
        }
        catch (error) {
            logger_1.logger.error(`Error generating fallback price for ${symbol}:`, error);
            return null;
        }
    }
    detectCurrency(symbol) {
        if (symbol.includes('.NS') || symbol.includes('.BO')) {
            return '₹';
        }
        const indianStockSymbols = [
            'RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ITC', 'SBIN',
            'BHARTIARTL', 'ICICIBANK', 'HINDUNILVR', 'KOTAKBANK'
        ];
        if (indianStockSymbols.includes(symbol)) {
            return '₹';
        }
        return '$';
    }
    async convertToINR(usdPrice) {
        try {
            const USD_TO_INR = 83.50;
            return usdPrice * USD_TO_INR;
        }
        catch (error) {
            logger_1.logger.error('Error converting USD to INR:', error);
            return usdPrice * 83.50;
        }
    }
    async ensureCurrencyConsistency(symbol, price) {
        const currency = this.detectCurrency(symbol);
        if (currency === '₹' && price < 100) {
            logger_1.logger.warn(`Price ${price} for ${symbol} seems to be in USD, converting to INR`);
            return await this.convertToINR(price);
        }
        return price;
    }
    async getBatchHistoricalPrices(symbols) {
        logger_1.logger.info(`Fetching historical prices for ${symbols.length} symbols`);
        const results = {};
        for (const symbol of symbols) {
            try {
                const historicalData = await this.getRealisticPurchasePrice(symbol);
                results[symbol] = historicalData;
                await this.delay(500);
            }
            catch (error) {
                logger_1.logger.error(`Failed to get historical price for ${symbol}:`, error);
                results[symbol] = null;
            }
        }
        const successCount = Object.values(results).filter(Boolean).length;
        logger_1.logger.info(`Historical price fetch completed. Success rate: ${successCount}/${symbols.length}`);
        return results;
    }
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    generatePortfolioStats(stocksData) {
        const gainers = stocksData.filter(stock => stock.currentPrice > stock.historicalPrice);
        const losers = stocksData.filter(stock => stock.currentPrice < stock.historicalPrice);
        const gainLossPercentages = stocksData.map(stock => ((stock.currentPrice - stock.historicalPrice) / stock.historicalPrice) * 100);
        const avgGainLossPercent = gainLossPercentages.reduce((sum, pct) => sum + pct, 0) / gainLossPercentages.length;
        return {
            totalStocks: stocksData.length,
            gainers: gainers.length,
            losers: losers.length,
            avgGainLossPercent: parseFloat(avgGainLossPercent.toFixed(2)),
            maxGain: Math.max(...gainLossPercentages),
            maxLoss: Math.min(...gainLossPercentages)
        };
    }
}
exports.historicalPriceService = new HistoricalPriceService();
exports.default = exports.historicalPriceService;
//# sourceMappingURL=historicalPriceService.js.map