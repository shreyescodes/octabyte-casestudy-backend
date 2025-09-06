"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.marketDataService = void 0;
const yahooFinanceService_1 = require("./yahooFinanceService");
const googleFinanceService_1 = require("./googleFinanceService");
const logger_1 = require("../utils/logger");
class MarketDataService {
    constructor() {
        this.cache = {};
        this.defaultCacheTTL = 5 * 60 * 1000; // 5 minutes
        this.fallbackCacheTTL = 30 * 60 * 1000; // 30 minutes for fallback data
    }
    /**
     * Get market data with fallback strategy:
     * 1. Try Yahoo Finance first (more reliable API)
     * 2. Fallback to Google Finance (web scraping)
     * 3. Return cached data if available
     */
    async getMarketData(symbol, exchange = 'NSE', forceRefresh = false) {
        try {
            // Check cache first (unless force refresh)
            if (!forceRefresh) {
                const cachedData = this.getCachedData(symbol);
                if (cachedData) {
                    logger_1.logger.debug(`Returning cached data for ${symbol}`);
                    return cachedData;
                }
            }
            logger_1.logger.info(`Fetching fresh market data for ${symbol}`);
            // Try Yahoo Finance first
            let marketData = await this.tryYahooFinance(symbol);
            // If Yahoo fails, try Google Finance
            if (!marketData) {
                marketData = await this.tryGoogleFinance(symbol, exchange);
            }
            // If both fail, return cached data even if expired
            if (!marketData) {
                const staleData = this.getStaleData(symbol);
                if (staleData) {
                    logger_1.logger.warn(`Returning stale cached data for ${symbol} - all APIs failed`);
                    return staleData;
                }
                logger_1.logger.error(`No market data available for ${symbol} from any source`);
                return null;
            }
            // Cache the successful result
            this.cacheData(symbol, marketData);
            return marketData;
        }
        catch (error) {
            logger_1.logger.error(`Error in getMarketData for ${symbol}:`, error);
            // Return cached data as fallback
            const fallbackData = this.getStaleData(symbol);
            if (fallbackData) {
                logger_1.logger.warn(`Returning fallback cached data for ${symbol} due to error`);
                return fallbackData;
            }
            return null;
        }
    }
    /**
     * Get current price only (optimized for speed)
     */
    async getCurrentPrice(symbol, exchange = 'NSE') {
        try {
            // Check cache for recent price data
            const cachedData = this.getCachedData(symbol);
            if (cachedData && this.isDataFresh(cachedData, 1 * 60 * 1000)) { // 1 minute for price
                return cachedData.currentPrice;
            }
            // Try Yahoo Finance for price (faster than full market data)
            const yahooPrice = await yahooFinanceService_1.yahooFinanceService.getCurrentPrice(symbol);
            if (yahooPrice !== null) {
                return yahooPrice;
            }
            // Fallback to Google Finance
            const googlePrice = await googleFinanceService_1.googleFinanceService.getCurrentPrice(symbol, exchange);
            if (googlePrice !== null) {
                return googlePrice;
            }
            // Return cached price if available
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
    /**
     * Get batch market data for multiple symbols
     */
    async getBatchMarketData(symbols, exchange = 'NSE') {
        logger_1.logger.info(`Fetching batch market data for ${symbols.length} symbols`);
        const results = {};
        // Separate symbols into cached and uncached
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
        // Try Yahoo Finance batch first
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
        // For symbols that Yahoo couldn't fetch, try Google Finance
        const remainingSymbols = uncachedSymbols.filter(symbol => !results[symbol]);
        if (remainingSymbols.length > 0) {
            logger_1.logger.info(`Trying Google Finance for ${remainingSymbols.length} remaining symbols`);
            // Process Google Finance requests more conservatively (sequential with delays)
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
                    // Add delay between Google requests
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
    /**
     * Try Yahoo Finance
     */
    async tryYahooFinance(symbol) {
        try {
            return await yahooFinanceService_1.yahooFinanceService.getMarketData(symbol);
        }
        catch (error) {
            logger_1.logger.warn(`Yahoo Finance failed for ${symbol}:`, error);
            return null;
        }
    }
    /**
     * Try Google Finance
     */
    async tryGoogleFinance(symbol, exchange) {
        try {
            return await googleFinanceService_1.googleFinanceService.getMarketData(symbol, exchange);
        }
        catch (error) {
            logger_1.logger.warn(`Google Finance failed for ${symbol}:`, error);
            return null;
        }
    }
    /**
     * Get cached data if still valid
     */
    getCachedData(symbol) {
        const cached = this.cache[symbol];
        if (!cached)
            return null;
        if (this.isDataFresh(cached.data, cached.ttl)) {
            return cached.data;
        }
        return null;
    }
    /**
     * Get stale cached data (for fallback)
     */
    getStaleData(symbol) {
        const cached = this.cache[symbol];
        return cached ? cached.data : null;
    }
    /**
     * Check if data is fresh within TTL
     */
    isDataFresh(data, ttl) {
        const age = Date.now() - new Date(data.lastUpdated).getTime();
        return age < ttl;
    }
    /**
     * Cache market data
     */
    cacheData(symbol, data) {
        this.cache[symbol] = {
            data,
            timestamp: Date.now(),
            ttl: this.defaultCacheTTL
        };
    }
    /**
     * Clear expired cache entries
     */
    cleanupCache() {
        const now = Date.now();
        for (const symbol in this.cache) {
            const cached = this.cache[symbol];
            if (now - cached.timestamp > this.fallbackCacheTTL) {
                delete this.cache[symbol];
            }
        }
    }
    /**
     * Get cache statistics
     */
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
    /**
     * Check service health
     */
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
    /**
     * Utility method to add delays
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    /**
     * Force refresh cache for a symbol
     */
    async refreshSymbol(symbol, exchange = 'NSE') {
        return this.getMarketData(symbol, exchange, true);
    }
    /**
     * Preload market data for symbols (for warming cache)
     */
    async preloadSymbols(symbols, exchange = 'NSE') {
        logger_1.logger.info(`Preloading market data for ${symbols.length} symbols`);
        await this.getBatchMarketData(symbols, exchange);
    }
    /**
     * Clear all cached data
     */
    clearCache() {
        this.cache = {};
        logger_1.logger.info('Market data cache cleared');
    }
}
// Start cache cleanup interval
const marketDataService = new MarketDataService();
exports.marketDataService = marketDataService;
// Clean up cache every 10 minutes
setInterval(() => {
    marketDataService['cleanupCache']();
}, 10 * 60 * 1000);
exports.default = marketDataService;
