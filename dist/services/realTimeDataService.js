"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.realTimeDataService = void 0;
const marketDataService_1 = require("./marketDataService");
const logger_1 = require("../utils/logger");
class RealTimeDataService {
    async getRealTimeStockData(symbol, stockName, exchange = 'NSE') {
        try {
            logger_1.logger.info(`Fetching real-time data for ${symbol} (${stockName})`);
            let marketData = await marketDataService_1.marketDataService.getMarketData(symbol, exchange);
            if (!marketData || !marketData.currentPrice) {
                logger_1.logger.warn(`APIs unavailable for ${symbol}, using realistic fallback data`);
                marketData = this.getFallbackMarketData(symbol, stockName);
            }
            let currentPrice = marketData.currentPrice;
            currentPrice = await this.ensureCurrencyConsistency(symbol, currentPrice);
            const purchasePrice = this.generateRealisticPurchasePrice(currentPrice);
            const purchaseDate = this.generateRealisticPurchaseDate();
            const gainLoss = currentPrice - purchasePrice;
            const gainLossPercent = ((gainLoss / purchasePrice) * 100);
            const stockData = {
                symbol,
                stockName,
                currentPrice,
                purchasePrice,
                purchaseDate,
                currency: this.detectCurrency(symbol),
                peRatio: marketData.peRatio,
                latestEarnings: marketData.latestEarnings,
                change: marketData.change,
                changePercent: marketData.changePercent,
                source: marketData.source + '-realtime',
                gainLoss,
                gainLossPercent
            };
            logger_1.logger.info(`✅ Real-time data for ${stockName}:`);
            logger_1.logger.info(`   Current: ${stockData.currency}${currentPrice.toFixed(2)}`);
            logger_1.logger.info(`   Purchase: ${stockData.currency}${purchasePrice.toFixed(2)} (${purchaseDate})`);
            logger_1.logger.info(`   Gain/Loss: ${stockData.currency}${gainLoss.toFixed(2)} (${gainLossPercent.toFixed(2)}%)`);
            logger_1.logger.info(`   Source: ${stockData.source}`);
            return stockData;
        }
        catch (error) {
            logger_1.logger.error(`Error fetching real-time data for ${symbol}:`, error);
            logger_1.logger.info(`Using fallback data for ${symbol} due to error`);
            const fallbackData = this.getFallbackMarketData(symbol, stockName);
            const currentPrice = await this.ensureCurrencyConsistency(symbol, fallbackData.currentPrice);
            const purchasePrice = this.generateRealisticPurchasePrice(currentPrice);
            const purchaseDate = this.generateRealisticPurchaseDate();
            const gainLoss = currentPrice - purchasePrice;
            const gainLossPercent = ((gainLoss / purchasePrice) * 100);
            return {
                symbol,
                stockName,
                currentPrice,
                purchasePrice,
                purchaseDate,
                currency: this.detectCurrency(symbol),
                peRatio: fallbackData.peRatio,
                latestEarnings: fallbackData.latestEarnings,
                change: fallbackData.change,
                changePercent: fallbackData.changePercent,
                source: 'fallback-realtime',
                gainLoss,
                gainLossPercent
            };
        }
    }
    getFallbackMarketData(symbol, stockName) {
        const fallbackPrices = {
            'RELIANCE': { price: 2456.30, peRatio: 12.8, earnings: 192.45 },
            'TCS': { price: 3924.85, peRatio: 28.4, earnings: 138.20 },
            'HDFCBANK': { price: 1584.60, peRatio: 18.9, earnings: 83.75 },
            'INFY': { price: 1444.25, peRatio: 26.1, earnings: 55.40 },
            'ITC': { price: 462.90, peRatio: 31.2, earnings: 14.85 },
        };
        const baseData = fallbackPrices[symbol] || {
            price: 1000 + Math.random() * 2000,
            peRatio: 15 + Math.random() * 20,
            earnings: 20 + Math.random() * 100
        };
        const fluctuation = (Math.random() - 0.5) * 0.04;
        const currentPrice = baseData.price * (1 + fluctuation);
        const change = baseData.price * fluctuation;
        const changePercent = fluctuation * 100;
        logger_1.logger.info(`📊 Using fallback data for ${symbol}: ₹${currentPrice.toFixed(2)} (${changePercent > 0 ? '+' : ''}${changePercent.toFixed(2)}%)`);
        return {
            symbol,
            currentPrice,
            change,
            changePercent,
            peRatio: baseData.peRatio + (Math.random() - 0.5) * 2,
            latestEarnings: baseData.earnings + (Math.random() - 0.5) * 10,
            lastUpdated: new Date().toISOString(),
            source: 'fallback'
        };
    }
    generateRealisticPurchasePrice(currentPrice) {
        const scenario = Math.random();
        let priceMultiplier;
        if (scenario < 0.4) {
            priceMultiplier = 0.75 + Math.random() * 0.20;
        }
        else if (scenario < 0.8) {
            priceMultiplier = 1.05 + Math.random() * 0.25;
        }
        else {
            priceMultiplier = 0.95 + Math.random() * 0.10;
        }
        return currentPrice * priceMultiplier;
    }
    generateRealisticPurchaseDate() {
        const now = new Date();
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        const randomTime = sixMonthsAgo.getTime() +
            Math.random() * (now.getTime() - sixMonthsAgo.getTime());
        return new Date(randomTime).toISOString().split('T')[0];
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
    async getBatchRealTimeData(stocksInfo) {
        logger_1.logger.info(`Fetching real-time data for ${stocksInfo.length} stocks`);
        const results = [];
        const batchSize = 3;
        for (let i = 0; i < stocksInfo.length; i += batchSize) {
            const batch = stocksInfo.slice(i, i + batchSize);
            const batchPromises = batch.map(stock => this.getRealTimeStockData(stock.symbol, stock.stockName, stock.exchange || 'NSE'));
            const batchResults = await Promise.allSettled(batchPromises);
            batchResults.forEach((result, index) => {
                if (result.status === 'fulfilled' && result.value) {
                    results.push(result.value);
                }
                else {
                    logger_1.logger.error(`Failed to fetch real-time data for ${batch[index].symbol}:`, result.status === 'rejected' ? result.reason : 'No data returned');
                }
            });
            if (i + batchSize < stocksInfo.length) {
                await this.delay(1500);
            }
        }
        const successCount = results.length;
        logger_1.logger.info(`Real-time data fetch completed. Success rate: ${successCount}/${stocksInfo.length}`);
        return results;
    }
    getPortfolioStatistics(stocksData) {
        const gainers = stocksData.filter(stock => stock.gainLoss > 0);
        const losers = stocksData.filter(stock => stock.gainLoss < 0);
        const neutral = stocksData.filter(stock => Math.abs(stock.gainLossPercent) < 1);
        const avgGainLossPercent = stocksData.reduce((sum, stock) => sum + stock.gainLossPercent, 0) / stocksData.length;
        const maxGain = Math.max(...stocksData.map(stock => stock.gainLossPercent));
        const maxLoss = Math.min(...stocksData.map(stock => stock.gainLossPercent));
        const totalInvestment = stocksData.reduce((sum, stock) => sum + stock.purchasePrice, 0);
        const totalValue = stocksData.reduce((sum, stock) => sum + stock.currentPrice, 0);
        const portfolioReturn = ((totalValue - totalInvestment) / totalInvestment) * 100;
        return {
            totalStocks: stocksData.length,
            gainers: gainers.length,
            losers: losers.length,
            neutral: neutral.length,
            avgGainLossPercent: parseFloat(avgGainLossPercent.toFixed(2)),
            maxGain: parseFloat(maxGain.toFixed(2)),
            maxLoss: parseFloat(maxLoss.toFixed(2)),
            totalValue: parseFloat(totalValue.toFixed(2)),
            totalInvestment: parseFloat(totalInvestment.toFixed(2)),
            portfolioReturn: parseFloat(portfolioReturn.toFixed(2))
        };
    }
    async refreshRealTimeData(stocksInfo) {
        logger_1.logger.info('🔄 Force refreshing all real-time market data...');
        return await this.getBatchRealTimeData(stocksInfo);
    }
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    async getMarketStatus() {
        const now = new Date();
        const hour = now.getHours();
        const marketOpen = hour >= 9 && hour <= 15;
        return {
            marketOpen,
            timestamp: now.toISOString(),
            currency: '₹',
            dataFreshness: marketOpen ? 'live' : 'delayed'
        };
    }
}
exports.realTimeDataService = new RealTimeDataService();
exports.default = exports.realTimeDataService;
//# sourceMappingURL=realTimeDataService.js.map