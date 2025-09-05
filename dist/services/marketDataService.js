"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.marketDataService = void 0;
const yahooFinanceService_1 = require("./yahooFinanceService");
const googleFinanceService_1 = require("./googleFinanceService");
const logger_1 = require("../utils/logger");
class MarketDataService {
    constructor() {
        this.cache = {};
        this.defaultCacheTTL = 5 * 60 * 1000;
        this.fallbackCacheTTL = 30 * 60 * 1000;
    }
    async getMarketData(symbol, exchange = 'NSE', forceRefresh = false) {
        try {
            if (!forceRefresh) {
                const cachedData = this.getCachedData(symbol);
                if (cachedData) {
                    logger_1.logger.debug(`Returning cached data for ${symbol}`);
                    return cachedData;
                }
            }
            logger_1.logger.info(`Fetching fresh market data for ${symbol}`);
            let marketData = await this.tryYahooFinance(symbol);
            if (!marketData) {
                marketData = await this.tryGoogleFinance(symbol, exchange);
            }
            if (!marketData) {
                const staleData = this.getStaleData(symbol);
                if (staleData) {
                    logger_1.logger.warn(`Returning stale cached data for ${symbol} - all APIs failed`);
                    return staleData;
                }
                logger_1.logger.error(`No market data available for ${symbol} from any source`);
                return null;
            }
            this.cacheData(symbol, marketData);
            return marketData;
        }
        catch (error) {
            logger_1.logger.error(`Error in getMarketData for ${symbol}:`, error);
            const fallbackData = this.getStaleData(symbol);
            if (fallbackData) {
                logger_1.logger.warn(`Returning fallback cached data for ${symbol} due to error`);
                return fallbackData;
            }
            return null;
        }
    }
    async getCurrentPrice(symbol, exchange = 'NSE') {
        try {
            const cachedData = this.getCachedData(symbol);
            if (cachedData && this.isDataFresh(cachedData, 1 * 60 * 1000)) {
                return cachedData.currentPrice;
            }
            const yahooPrice = await yahooFinanceService_1.yahooFinanceService.getCurrentPrice(symbol);
            if (yahooPrice !== null) {
                return yahooPrice;
            }
            const googlePrice = await googleFinanceService_1.googleFinanceService.getCurrentPrice(symbol, exchange);
            if (googlePrice !== null) {
                return googlePrice;
            }
            if (cachedData) {
                logger_1.logger.warn(`Returning cached price for ${symbol} - APIs unavailable`);
                return cachedData.currentPrice;
            }
            return null;
        }
        catch (error) {
            logger_1.logger.error(`Error getting current price for ${symbol}:`, error);
            return null;
        }
    }
    async getBatchMarketData(symbols, exchange = 'NSE') {
        logger_1.logger.info(`Fetching batch market data for ${symbols.length} symbols`);
        const results = {};
        const uncachedSymbols = [];
        const cachedSymbols = [];
        for (const symbol of symbols) {
            const cachedData = this.getCachedData(symbol);
            if (cachedData) {
                results[symbol] = cachedData;
                cachedSymbols.push(symbol);
            }
            else {
                uncachedSymbols.push(symbol);
            }
        }
        logger_1.logger.info(`Using cached data for ${cachedSymbols.length} symbols, fetching ${uncachedSymbols.length} symbols`);
        if (uncachedSymbols.length === 0) {
            return results;
        }
        try {
            const yahooResults = await yahooFinanceService_1.yahooFinanceService.getBatchMarketData(uncachedSymbols);
            for (const symbol of uncachedSymbols) {
                const yahooData = yahooResults[symbol];
                if (yahooData) {
                    results[symbol] = yahooData;
                    this.cacheData(symbol, yahooData);
                }
            }
        }
        catch (error) {
            logger_1.logger.error('Yahoo Finance batch request failed:', error);
        }
        const remainingSymbols = uncachedSymbols.filter(symbol => !results[symbol]);
        if (remainingSymbols.length > 0) {
            logger_1.logger.info(`Trying Google Finance for ${remainingSymbols.length} remaining symbols`);
            for (const symbol of remainingSymbols) {
                try {
                    const googleData = await googleFinanceService_1.googleFinanceService.getMarketData(symbol, exchange);
                    if (googleData) {
                        results[symbol] = googleData;
                        this.cacheData(symbol, googleData);
                    }
                    else {
                        results[symbol] = null;
                    }
                    await this.delay(500);
                }
                catch (error) {
                    logger_1.logger.error(`Error fetching ${symbol} from Google Finance:`, error);
                    results[symbol] = null;
                }
            }
        }
        const successCount = Object.values(results).filter(Boolean).length;
        logger_1.logger.info(`Batch operation completed. Success rate: ${successCount}/${symbols.length} (${(successCount / symbols.length * 100).toFixed(1)}%)`);
        return results;
    }
    async tryYahooFinance(symbol) {
        try {
            return await yahooFinanceService_1.yahooFinanceService.getMarketData(symbol);
        }
        catch (error) {
            logger_1.logger.warn(`Yahoo Finance failed for ${symbol}:`, error);
            return null;
        }
    }
    async tryGoogleFinance(symbol, exchange) {
        try {
            return await googleFinanceService_1.googleFinanceService.getMarketData(symbol, exchange);
        }
        catch (error) {
            logger_1.logger.warn(`Google Finance failed for ${symbol}:`, error);
            return null;
        }
    }
    getCachedData(symbol) {
        const cached = this.cache[symbol];
        if (!cached)
            return null;
        if (this.isDataFresh(cached.data, cached.ttl)) {
            return cached.data;
        }
        return null;
    }
    getStaleData(symbol) {
        const cached = this.cache[symbol];
        return cached ? cached.data : null;
    }
    isDataFresh(data, ttl) {
        const age = Date.now() - new Date(data.lastUpdated).getTime();
        return age < ttl;
    }
    cacheData(symbol, data) {
        this.cache[symbol] = {
            data,
            timestamp: Date.now(),
            ttl: this.defaultCacheTTL
        };
    }
    cleanupCache() {
        const now = Date.now();
        for (const symbol in this.cache) {
            const cached = this.cache[symbol];
            if (now - cached.timestamp > this.fallbackCacheTTL) {
                delete this.cache[symbol];
            }
        }
    }
    getCacheStats() {
        const now = Date.now();
        let freshEntries = 0;
        let staleEntries = 0;
        for (const symbol in this.cache) {
            const cached = this.cache[symbol];
            if (now - cached.timestamp < cached.ttl) {
                freshEntries++;
            }
            else {
                staleEntries++;
            }
        }
        return {
            totalEntries: Object.keys(this.cache).length,
            freshEntries,
            staleEntries
        };
    }
    async checkServiceHealth() {
        const [yahooAvailable, googleAvailable] = await Promise.all([
            yahooFinanceService_1.yahooFinanceService.isServiceAvailable(),
            googleFinanceService_1.googleFinanceService.isServiceAvailable()
        ]);
        return {
            yahoo: yahooAvailable,
            google: googleAvailable,
            cache: this.getCacheStats()
        };
    }
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    async refreshSymbol(symbol, exchange = 'NSE') {
        return this.getMarketData(symbol, exchange, true);
    }
    async preloadSymbols(symbols, exchange = 'NSE') {
        logger_1.logger.info(`Preloading market data for ${symbols.length} symbols`);
        await this.getBatchMarketData(symbols, exchange);
    }
    clearCache() {
        this.cache = {};
        logger_1.logger.info('Market data cache cleared');
    }
}
const marketDataService = new MarketDataService();
exports.marketDataService = marketDataService;
setInterval(() => {
    marketDataService['cleanupCache']();
}, 10 * 60 * 1000);
exports.default = marketDataService;
//# sourceMappingURL=marketDataService.js.map