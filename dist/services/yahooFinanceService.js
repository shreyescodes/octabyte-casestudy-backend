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
        this.retryDelay = 1000;
    }
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
    async getMarketData(symbol) {
        try {
            logger_1.logger.info(`Fetching market data for ${symbol} from Yahoo Finance`);
            const quote = await this.getQuoteWithRetry(symbol);
            if (!quote || !quote.regularMarketPrice) {
                logger_1.logger.warn(`No market data found for ${symbol} on Yahoo Finance`);
                return null;
            }
            const marketData = {
                symbol,
                currentPrice: quote.regularMarketPrice,
                peRatio: quote.trailingPE || undefined,
                latestEarnings: quote.earningsPerShare || undefined,
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
    async getBatchMarketData(symbols) {
        logger_1.logger.info(`Fetching batch market data for ${symbols.length} symbols from Yahoo Finance`);
        const results = {};
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
            if (i + batchSize < symbols.length) {
                await this.delay(500);
            }
        }
        logger_1.logger.info(`Completed batch fetch for ${symbols.length} symbols. Success rate: ${Object.values(results).filter(Boolean).length / symbols.length * 100}%`);
        return results;
    }
    async searchSymbol(companyName) {
        try {
            logger_1.logger.info(`Searching for symbols matching: ${companyName}`);
            const searchResults = await yahoo_finance2_1.default.search(companyName);
            if (searchResults && searchResults.quotes) {
                const symbols = searchResults.quotes
                    .filter((quote) => quote.symbol && quote.quoteType === 'EQUITY')
                    .map((quote) => quote.symbol)
                    .slice(0, 5);
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
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    async isServiceAvailable() {
        try {
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
//# sourceMappingURL=yahooFinanceService.js.map