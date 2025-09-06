"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.yahooFinanceService = void 0;
const yahoo_finance2_1 = __importDefault(require("yahoo-finance2"));
const logger_1 = require("../utils/logger");
class YahooFinanceService {
    constructor() {
        this.maxRetries = 3;
        this.retryDelay = 1000; // 1 second
    }
    /**
     * Fetch current market price from Yahoo Finance
     */
    async getCurrentPrice(symbol) {
        try {
            logger_1.logger.info(`Fetching current price for ${symbol} from Yahoo Finance`);
            const quote = await this.getQuoteWithRetry(symbol);
            if (quote && quote.regularMarketPrice) {
                logger_1.logger.info(`Successfully fetched price for ${symbol}: $${quote.regularMarketPrice}`);
                return quote.regularMarketPrice;
            }
            logger_1.logger.warn(`No price data found for ${symbol} on Yahoo Finance`);
            return null;
        }
        catch (error) {
            logger_1.logger.error(`Error fetching price for ${symbol} from Yahoo Finance:`, error);
            return null;
        }
    }
    /**
     * Fetch historical price from 3-6 months ago
     */
    async getHistoricalPrice(symbol, monthsAgo = 4) {
        try {
            logger_1.logger.info(`Fetching historical price for ${symbol} from ${monthsAgo} months ago`);
            const endDate = new Date();
            const startDate = new Date();
            startDate.setMonth(startDate.getMonth() - monthsAgo);
            // Get historical data
            const historicalData = await yahoo_finance2_1.default.historical(symbol, {
                period1: startDate,
                period2: endDate,
                interval: '1d'
            });
            if (historicalData && historicalData.length > 0) {
                // Get price from the middle of the period for more realistic purchase price
                const middleIndex = Math.floor(historicalData.length / 2);
                const historicalPrice = historicalData[middleIndex].close;
                logger_1.logger.info(`Historical price for ${symbol} (${monthsAgo} months ago): $${historicalPrice}`);
                return historicalPrice;
            }
            logger_1.logger.warn(`No historical data found for ${symbol}`);
            return null;
        }
        catch (error) {
            logger_1.logger.error(`Error fetching historical price for ${symbol}:`, error);
            return null;
        }
    }
    /**
     * Fetch comprehensive market data including P/E ratio and earnings
     */
    async getMarketData(symbol) {
        try {
            logger_1.logger.info(`Fetching market data for ${symbol} from Yahoo Finance`);
            const quote = await this.getQuoteWithRetry(symbol);
            if (!quote || !quote.regularMarketPrice) {
                logger_1.logger.warn(`No market data found for ${symbol} on Yahoo Finance`);
                return null;
            }
            // Try multiple earnings fields from Yahoo Finance
            let latestEarnings;
            if (quote.epsTrailingTwelveMonths) {
                latestEarnings = quote.epsTrailingTwelveMonths;
            }
            else if (quote.epsForward) {
                latestEarnings = quote.epsForward;
            }
            else if (quote.earningsPerShare) {
                latestEarnings = quote.earningsPerShare;
            }
            else if (quote.epsCurrentYear) {
                latestEarnings = quote.epsCurrentYear;
            }
            const marketData = {
                symbol,
                currentPrice: quote.regularMarketPrice,
                peRatio: quote.trailingPE || quote.forwardPE || undefined,
                latestEarnings: latestEarnings,
                change: quote.regularMarketChange || undefined,
                changePercent: quote.regularMarketChangePercent || undefined,
                lastUpdated: new Date().toISOString(),
                source: 'yahoo'
            };
            logger_1.logger.info(`Successfully fetched market data for ${symbol}:`, marketData);
            return marketData;
        }
        catch (error) {
            logger_1.logger.error(`Error fetching market data for ${symbol} from Yahoo Finance:`, error);
            return null;
        }
    }
    /**
     * Fetch market data for multiple symbols in batch
     */
    async getBatchMarketData(symbols) {
        logger_1.logger.info(`Fetching batch market data for ${symbols.length} symbols from Yahoo Finance`);
        const results = {};
        // Process symbols in batches to avoid rate limiting
        const batchSize = 10;
        for (let i = 0; i < symbols.length; i += batchSize) {
            const batch = symbols.slice(i, i + batchSize);
            const batchPromises = batch.map(async (symbol) => {
                const data = await this.getMarketData(symbol);
                return { symbol, data };
            });
            const batchResults = await Promise.allSettled(batchPromises);
            batchResults.forEach((result) => {
                if (result.status === 'fulfilled') {
                    results[result.value.symbol] = result.value.data;
                }
                else {
                    logger_1.logger.error(`Failed to fetch data for symbol in batch:`, result.reason);
                }
            });
            // Add delay between batches to respect rate limits
            if (i + batchSize < symbols.length) {
                await this.delay(500);
            }
        }
        logger_1.logger.info(`Completed batch fetch for ${symbols.length} symbols. Success rate: ${Object.values(results).filter(Boolean).length / symbols.length * 100}%`);
        return results;
    }
    /**
     * Search for stock symbol by company name
     */
    async searchSymbol(companyName) {
        try {
            logger_1.logger.info(`Searching for symbols matching: ${companyName}`);
            const searchResults = await yahoo_finance2_1.default.search(companyName);
            if (searchResults && searchResults.quotes) {
                const symbols = searchResults.quotes
                    .filter((quote) => quote.symbol && quote.quoteType === 'EQUITY')
                    .map((quote) => quote.symbol)
                    .slice(0, 5); // Return top 5 matches
                logger_1.logger.info(`Found ${symbols.length} symbols for "${companyName}":`, symbols);
                return symbols;
            }
            return [];
        }
        catch (error) {
            logger_1.logger.error(`Error searching for symbols with name "${companyName}":`, error);
            return [];
        }
    }
    /**
     * Get quote with retry mechanism
     */
    async getQuoteWithRetry(symbol, attempt = 1) {
        try {
            const quote = await yahoo_finance2_1.default.quote(symbol);
            return quote;
        }
        catch (error) {
            if (attempt < this.maxRetries) {
                logger_1.logger.warn(`Attempt ${attempt} failed for ${symbol}, retrying in ${this.retryDelay}ms...`);
                await this.delay(this.retryDelay * attempt);
                return this.getQuoteWithRetry(symbol, attempt + 1);
            }
            throw error;
        }
    }
    /**
     * Utility method to add delays
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    /**
     * Check if Yahoo Finance service is available
     */
    async isServiceAvailable() {
        try {
            // Try to fetch a well-known stock (Apple) to test service availability
            const result = await this.getCurrentPrice('AAPL');
            return result !== null;
        }
        catch (error) {
            logger_1.logger.error('Yahoo Finance service availability check failed:', error);
            return false;
        }
    }
}
exports.yahooFinanceService = new YahooFinanceService();
exports.default = exports.yahooFinanceService;
