"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stockExchangeService = void 0;
const axios_1 = __importDefault(require("axios"));
const logger_1 = require("../utils/logger");
class StockExchangeService {
    constructor() {
        this.stockListCache = [];
        this.lastCacheUpdate = null;
        this.CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
    }
    /**
     * Get comprehensive list of all listed stocks from multiple sources
     */
    async getAllListedStocks(forceRefresh = false) {
        try {
            // Check cache first
            if (!forceRefresh && this.isCacheValid()) {
                logger_1.logger.debug('Returning cached stock listings');
                return this.stockListCache;
            }
            logger_1.logger.info('Fetching comprehensive stock listings from multiple sources...');
            const allStocks = [];
            // Fetch from multiple sources in parallel
            const [nseStocks, bseStocks, usStocks] = await Promise.allSettled([
                this.fetchNSEStocks(),
                this.fetchBSEStocks(),
                this.fetchUSStocks()
            ]);
            // Combine results from all sources
            if (nseStocks.status === 'fulfilled') {
                allStocks.push(...nseStocks.value);
                logger_1.logger.info(`Added ${nseStocks.value.length} NSE stocks`);
            }
            else {
                logger_1.logger.warn('Failed to fetch NSE stocks:', nseStocks.reason);
            }
            if (bseStocks.status === 'fulfilled') {
                allStocks.push(...bseStocks.value);
                logger_1.logger.info(`Added ${bseStocks.value.length} BSE stocks`);
            }
            else {
                logger_1.logger.warn('Failed to fetch BSE stocks:', bseStocks.reason);
            }
            if (usStocks.status === 'fulfilled') {
                allStocks.push(...usStocks.value);
                logger_1.logger.info(`Added ${usStocks.value.length} US stocks`);
            }
            else {
                logger_1.logger.warn('Failed to fetch US stocks:', usStocks.reason);
            }
            // Remove duplicates based on symbol
            const uniqueStocks = this.removeDuplicates(allStocks);
            // Update cache
            this.stockListCache = uniqueStocks;
            this.lastCacheUpdate = new Date();
            logger_1.logger.info(`Successfully cached ${uniqueStocks.length} unique stocks from all exchanges`);
            return uniqueStocks;
        }
        catch (error) {
            logger_1.logger.error('Error fetching stock listings:', error);
            // Return cached data if available, otherwise empty array
            return this.stockListCache;
        }
    }
    /**
     * Search stocks by name or symbol across all exchanges
     */
    async searchStocks(query, limit = 20) {
        try {
            const allStocks = await this.getAllListedStocks();
            if (!query || query.length < 2) {
                return allStocks.slice(0, limit).map(stock => ({
                    ...stock,
                    available: true
                }));
            }
            const searchTerm = query.toLowerCase();
            // Search with scoring system
            const results = allStocks
                .map(stock => {
                let score = 0;
                const name = stock.name.toLowerCase();
                const symbol = stock.symbol.toLowerCase();
                // Exact matches get highest score
                if (symbol === searchTerm)
                    score += 100;
                if (name === searchTerm)
                    score += 90;
                // Starts with matches
                if (symbol.startsWith(searchTerm))
                    score += 80;
                if (name.startsWith(searchTerm))
                    score += 70;
                // Contains matches
                if (symbol.includes(searchTerm))
                    score += 60;
                if (name.includes(searchTerm))
                    score += 50;
                // Word boundary matches in name
                const words = name.split(' ');
                if (words.some(word => word.startsWith(searchTerm)))
                    score += 40;
                return { stock, score };
            })
                .filter(result => result.score > 0)
                .sort((a, b) => b.score - a.score)
                .slice(0, limit)
                .map(result => ({
                ...result.stock,
                available: true
            }));
            logger_1.logger.info(`Found ${results.length} stocks matching "${query}"`);
            return results;
        }
        catch (error) {
            logger_1.logger.error('Error searching stocks:', error);
            return [];
        }
    }
    /**
     * Get stock suggestions based on sector, market cap, etc.
     */
    async getStockSuggestions(options = {}) {
        try {
            const { sector, exchange, minMarketCap, maxMarketCap, limit = 20 } = options;
            const allStocks = await this.getAllListedStocks();
            let filteredStocks = allStocks;
            if (sector) {
                filteredStocks = filteredStocks.filter(stock => stock.sector.toLowerCase().includes(sector.toLowerCase()));
            }
            if (exchange) {
                filteredStocks = filteredStocks.filter(stock => stock.exchange.toUpperCase() === exchange.toUpperCase());
            }
            if (minMarketCap && filteredStocks.some(stock => stock.marketCap)) {
                filteredStocks = filteredStocks.filter(stock => stock.marketCap && stock.marketCap >= minMarketCap);
            }
            if (maxMarketCap && filteredStocks.some(stock => stock.marketCap)) {
                filteredStocks = filteredStocks.filter(stock => stock.marketCap && stock.marketCap <= maxMarketCap);
            }
            // Sort by market cap (descending) if available, otherwise by name
            filteredStocks.sort((a, b) => {
                if (a.marketCap && b.marketCap) {
                    return b.marketCap - a.marketCap;
                }
                return a.name.localeCompare(b.name);
            });
            return filteredStocks.slice(0, limit).map(stock => ({
                ...stock,
                available: true
            }));
        }
        catch (error) {
            logger_1.logger.error('Error getting stock suggestions:', error);
            return [];
        }
    }
    /**
     * Fetch NSE (National Stock Exchange of India) stocks
     */
    async fetchNSEStocks() {
        try {
            // Using NSE's official API endpoints
            const response = await axios_1.default.get('https://www.nseindia.com/api/equity-stockIndices?index=NIFTY%20500', {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'application/json',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Connection': 'keep-alive',
                    'Upgrade-Insecure-Requests': '1',
                },
                timeout: 10000
            });
            const stocks = response.data.data.map((item) => ({
                symbol: item.symbol,
                name: item.symbol, // NSE API doesn't always provide full names
                sector: 'Unknown', // Will be enriched later
                exchange: 'NSE',
                lastPrice: parseFloat(item.lastPrice) || undefined,
                marketCap: undefined
            }));
            // Enrich with additional data from a secondary source
            const enrichedStocks = await this.enrichNSEStocks(stocks);
            return enrichedStocks;
        }
        catch (error) {
            logger_1.logger.warn('Failed to fetch from NSE API, using fallback list');
            return this.getNSEFallbackList();
        }
    }
    /**
     * Fetch BSE (Bombay Stock Exchange) stocks
     */
    async fetchBSEStocks() {
        try {
            // Using BSE's API or scraping approach
            logger_1.logger.info('Fetching BSE stocks...');
            // For now, return a curated list of major BSE stocks
            return this.getBSEFallbackList();
        }
        catch (error) {
            logger_1.logger.warn('Failed to fetch BSE stocks:', error);
            return [];
        }
    }
    /**
     * Fetch major US stocks
     */
    async fetchUSStocks() {
        try {
            // Using a free API for US stocks
            logger_1.logger.info('Fetching US stocks...');
            // Return major US stocks list
            return this.getUSFallbackList();
        }
        catch (error) {
            logger_1.logger.warn('Failed to fetch US stocks:', error);
            return [];
        }
    }
    /**
     * Enrich NSE stocks with additional data
     */
    async enrichNSEStocks(stocks) {
        // This could integrate with additional APIs to get company names, sectors, etc.
        // For now, return the stocks as-is
        return stocks;
    }
    /**
     * NSE fallback list of major stocks
     */
    getNSEFallbackList() {
        return [
            // Banking & Financial Services
            { symbol: 'HDFCBANK', name: 'HDFC Bank Ltd', sector: 'Banking', exchange: 'NSE' },
            { symbol: 'ICICIBANK', name: 'ICICI Bank Ltd', sector: 'Banking', exchange: 'NSE' },
            { symbol: 'SBIN', name: 'State Bank of India', sector: 'Banking', exchange: 'NSE' },
            { symbol: 'KOTAKBANK', name: 'Kotak Mahindra Bank Ltd', sector: 'Banking', exchange: 'NSE' },
            { symbol: 'AXISBANK', name: 'Axis Bank Ltd', sector: 'Banking', exchange: 'NSE' },
            { symbol: 'BAJFINANCE', name: 'Bajaj Finance Ltd', sector: 'Finance', exchange: 'NSE' },
            { symbol: 'BAJAJFINSV', name: 'Bajaj Finserv Ltd', sector: 'Finance', exchange: 'NSE' },
            // IT & Technology
            { symbol: 'TCS', name: 'Tata Consultancy Services Ltd', sector: 'Technology', exchange: 'NSE' },
            { symbol: 'INFY', name: 'Infosys Ltd', sector: 'Technology', exchange: 'NSE' },
            { symbol: 'WIPRO', name: 'Wipro Ltd', sector: 'Technology', exchange: 'NSE' },
            { symbol: 'HCLTECH', name: 'HCL Technologies Ltd', sector: 'Technology', exchange: 'NSE' },
            { symbol: 'TECHM', name: 'Tech Mahindra Ltd', sector: 'Technology', exchange: 'NSE' },
            { symbol: 'LTI', name: 'Larsen & Toubro Infotech Ltd', sector: 'Technology', exchange: 'NSE' },
            // Energy & Oil
            { symbol: 'RELIANCE', name: 'Reliance Industries Ltd', sector: 'Energy', exchange: 'NSE' },
            { symbol: 'ONGC', name: 'Oil & Natural Gas Corporation Ltd', sector: 'Energy', exchange: 'NSE' },
            { symbol: 'IOC', name: 'Indian Oil Corporation Ltd', sector: 'Energy', exchange: 'NSE' },
            { symbol: 'BPCL', name: 'Bharat Petroleum Corporation Ltd', sector: 'Energy', exchange: 'NSE' },
            // Consumer Goods
            { symbol: 'ITC', name: 'ITC Ltd', sector: 'Consumer Goods', exchange: 'NSE' },
            { symbol: 'HINDUNILVR', name: 'Hindustan Unilever Ltd', sector: 'Consumer Goods', exchange: 'NSE' },
            { symbol: 'NESTLEIND', name: 'Nestle India Ltd', sector: 'Consumer Goods', exchange: 'NSE' },
            { symbol: 'BRITANNIA', name: 'Britannia Industries Ltd', sector: 'Consumer Goods', exchange: 'NSE' },
            { symbol: 'DABUR', name: 'Dabur India Ltd', sector: 'Consumer Goods', exchange: 'NSE' },
            // Automobiles
            { symbol: 'MARUTI', name: 'Maruti Suzuki India Ltd', sector: 'Automobiles', exchange: 'NSE' },
            { symbol: 'TATAMOTORS', name: 'Tata Motors Ltd', sector: 'Automobiles', exchange: 'NSE' },
            { symbol: 'M&M', name: 'Mahindra & Mahindra Ltd', sector: 'Automobiles', exchange: 'NSE' },
            { symbol: 'BAJAJ-AUTO', name: 'Bajaj Auto Ltd', sector: 'Automobiles', exchange: 'NSE' },
            { symbol: 'HEROMOTOCO', name: 'Hero MotoCorp Ltd', sector: 'Automobiles', exchange: 'NSE' },
            // Telecommunications
            { symbol: 'BHARTIARTL', name: 'Bharti Airtel Ltd', sector: 'Telecommunications', exchange: 'NSE' },
            { symbol: 'IDEA', name: 'Vodafone Idea Ltd', sector: 'Telecommunications', exchange: 'NSE' },
            // Pharmaceuticals
            { symbol: 'SUNPHARMA', name: 'Sun Pharmaceutical Industries Ltd', sector: 'Pharmaceuticals', exchange: 'NSE' },
            { symbol: 'DRREDDY', name: 'Dr Reddys Laboratories Ltd', sector: 'Pharmaceuticals', exchange: 'NSE' },
            { symbol: 'CIPLA', name: 'Cipla Ltd', sector: 'Pharmaceuticals', exchange: 'NSE' },
            { symbol: 'AUROPHARMA', name: 'Aurobindo Pharma Ltd', sector: 'Pharmaceuticals', exchange: 'NSE' },
            // Metals & Mining
            { symbol: 'TATASTEEL', name: 'Tata Steel Ltd', sector: 'Metals', exchange: 'NSE' },
            { symbol: 'JSWSTEEL', name: 'JSW Steel Ltd', sector: 'Metals', exchange: 'NSE' },
            { symbol: 'HINDALCO', name: 'Hindalco Industries Ltd', sector: 'Metals', exchange: 'NSE' },
            { symbol: 'COALINDIA', name: 'Coal India Ltd', sector: 'Mining', exchange: 'NSE' },
            // Infrastructure & Construction
            { symbol: 'LT', name: 'Larsen & Toubro Ltd', sector: 'Infrastructure', exchange: 'NSE' },
            { symbol: 'ULTRACEMCO', name: 'UltraTech Cement Ltd', sector: 'Cement', exchange: 'NSE' },
            { symbol: 'GRASIM', name: 'Grasim Industries Ltd', sector: 'Cement', exchange: 'NSE' },
            // Retail
            { symbol: 'DMART', name: 'Avenue Supermarts Ltd', sector: 'Retail', exchange: 'NSE' },
            { symbol: 'TRENT', name: 'Trent Ltd', sector: 'Retail', exchange: 'NSE' },
        ];
    }
    /**
     * BSE fallback list
     */
    getBSEFallbackList() {
        return [
            { symbol: 'SENSEX', name: 'BSE Sensex', sector: 'Index', exchange: 'BSE' },
            { symbol: 'RELIANCE', name: 'Reliance Industries Ltd', sector: 'Energy', exchange: 'BSE' },
            { symbol: 'TCS', name: 'Tata Consultancy Services Ltd', sector: 'Technology', exchange: 'BSE' },
            // Add more BSE specific stocks
        ];
    }
    /**
     * US stocks fallback list
     */
    getUSFallbackList() {
        return [
            // Tech Giants
            { symbol: 'AAPL', name: 'Apple Inc', sector: 'Technology', exchange: 'NASDAQ' },
            { symbol: 'GOOGL', name: 'Alphabet Inc', sector: 'Technology', exchange: 'NASDAQ' },
            { symbol: 'MSFT', name: 'Microsoft Corporation', sector: 'Technology', exchange: 'NASDAQ' },
            { symbol: 'AMZN', name: 'Amazon.com Inc', sector: 'Technology', exchange: 'NASDAQ' },
            { symbol: 'TSLA', name: 'Tesla Inc', sector: 'Automobiles', exchange: 'NASDAQ' },
            { symbol: 'META', name: 'Meta Platforms Inc', sector: 'Technology', exchange: 'NASDAQ' },
            { symbol: 'NFLX', name: 'Netflix Inc', sector: 'Entertainment', exchange: 'NASDAQ' },
            // Financial
            { symbol: 'JPM', name: 'JPMorgan Chase & Co', sector: 'Banking', exchange: 'NYSE' },
            { symbol: 'BAC', name: 'Bank of America Corp', sector: 'Banking', exchange: 'NYSE' },
            { symbol: 'WFC', name: 'Wells Fargo & Co', sector: 'Banking', exchange: 'NYSE' },
            // Industrial
            { symbol: 'JNJ', name: 'Johnson & Johnson', sector: 'Pharmaceuticals', exchange: 'NYSE' },
            { symbol: 'PG', name: 'Procter & Gamble Co', sector: 'Consumer Goods', exchange: 'NYSE' },
            { symbol: 'KO', name: 'Coca-Cola Co', sector: 'Beverages', exchange: 'NYSE' },
        ];
    }
    /**
     * Remove duplicate stocks based on symbol
     */
    removeDuplicates(stocks) {
        const unique = new Map();
        stocks.forEach(stock => {
            const key = `${stock.symbol}_${stock.exchange}`;
            if (!unique.has(key)) {
                unique.set(key, stock);
            }
        });
        return Array.from(unique.values());
    }
    /**
     * Check if cache is still valid
     */
    isCacheValid() {
        if (!this.lastCacheUpdate || this.stockListCache.length === 0) {
            return false;
        }
        const now = new Date().getTime();
        const cacheTime = this.lastCacheUpdate.getTime();
        return (now - cacheTime) < this.CACHE_DURATION;
    }
    /**
     * Get cache statistics
     */
    getCacheStats() {
        const exchanges = [...new Set(this.stockListCache.map(stock => stock.exchange))];
        return {
            totalStocks: this.stockListCache.length,
            lastUpdated: this.lastCacheUpdate,
            isValid: this.isCacheValid(),
            exchanges
        };
    }
    /**
     * Force refresh cache
     */
    async refreshCache() {
        await this.getAllListedStocks(true);
    }
}
// Create singleton instance
exports.stockExchangeService = new StockExchangeService();
exports.default = exports.stockExchangeService;
