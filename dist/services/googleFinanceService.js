"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.googleFinanceService = void 0;
const axios_1 = __importDefault(require("axios"));
const cheerio = __importStar(require("cheerio"));
const logger_1 = require("../utils/logger");
class GoogleFinanceService {
    constructor() {
        this.baseUrl = 'https://www.google.com/finance/quote';
        this.maxRetries = 3;
        this.retryDelay = 2000;
    }
    async getCurrentPrice(symbol, exchange = 'NSE') {
        try {
            logger_1.logger.info(`Fetching current price for ${symbol} from Google Finance`);
            const data = await this.scrapeGoogleFinance(symbol, exchange);
            if (data && data.currentPrice) {
                logger_1.logger.info(`Successfully fetched price for ${symbol}: $${data.currentPrice}`);
                return data.currentPrice;
            }
            logger_1.logger.warn(`No price data found for ${symbol} on Google Finance`);
            return null;
        }
        catch (error) {
            logger_1.logger.error(`Error fetching price for ${symbol} from Google Finance:`, error);
            return null;
        }
    }
    async getFinancialData(symbol, exchange = 'NSE') {
        try {
            logger_1.logger.info(`Fetching financial data for ${symbol} from Google Finance`);
            const data = await this.scrapeGoogleFinance(symbol, exchange);
            if (data) {
                const result = {
                    peRatio: data.peRatio,
                    latestEarnings: data.earningsPerShare
                };
                logger_1.logger.info(`Successfully fetched financial data for ${symbol}:`, result);
                return result;
            }
            logger_1.logger.warn(`No financial data found for ${symbol} on Google Finance`);
            return null;
        }
        catch (error) {
            logger_1.logger.error(`Error fetching financial data for ${symbol} from Google Finance:`, error);
            return null;
        }
    }
    async getMarketData(symbol, exchange = 'NSE') {
        try {
            logger_1.logger.info(`Fetching market data for ${symbol} from Google Finance`);
            const data = await this.scrapeGoogleFinance(symbol, exchange);
            if (!data || !data.currentPrice) {
                logger_1.logger.warn(`No market data found for ${symbol} on Google Finance`);
                return null;
            }
            const marketData = {
                symbol,
                currentPrice: data.currentPrice,
                peRatio: data.peRatio,
                latestEarnings: data.earningsPerShare,
                lastUpdated: new Date().toISOString(),
                source: 'google'
            };
            logger_1.logger.info(`Successfully fetched market data for ${symbol}:`, marketData);
            return marketData;
        }
        catch (error) {
            logger_1.logger.error(`Error fetching market data for ${symbol} from Google Finance:`, error);
            return null;
        }
    }
    async getBatchMarketData(symbols, exchange = 'NSE') {
        logger_1.logger.info(`Fetching batch market data for ${symbols.length} symbols from Google Finance`);
        const results = {};
        for (const symbol of symbols) {
            try {
                const data = await this.getMarketData(symbol, exchange);
                results[symbol] = data;
                await this.delay(1000);
            }
            catch (error) {
                logger_1.logger.error(`Failed to fetch data for ${symbol}:`, error);
                results[symbol] = null;
            }
        }
        logger_1.logger.info(`Completed batch fetch for ${symbols.length} symbols. Success rate: ${Object.values(results).filter(Boolean).length / symbols.length * 100}%`);
        return results;
    }
    async scrapeGoogleFinance(symbol, exchange = 'NSE', attempt = 1) {
        try {
            const url = `${this.baseUrl}/${symbol}:${exchange}`;
            logger_1.logger.debug(`Scraping Google Finance URL: ${url} (attempt ${attempt})`);
            const response = await axios_1.default.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'Accept-Encoding': 'gzip, deflate',
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                },
                timeout: 10000
            });
            if (response.status !== 200) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            const $ = cheerio.load(response.data);
            const data = { symbol };
            const priceElement = $('[data-source="BFP"] [jsname="ip4Tqd"]').first();
            if (priceElement.length > 0) {
                const priceText = priceElement.text().replace(/[₹,$\s]/g, '');
                const price = parseFloat(priceText);
                if (!isNaN(price)) {
                    data.currentPrice = price;
                }
            }
            const peElement = $('[data-test-id="P/E ratio"] .ZYVHBb').first();
            if (peElement.length > 0) {
                const peText = peElement.text().replace(/[,\s]/g, '');
                const pe = parseFloat(peText);
                if (!isNaN(pe)) {
                    data.peRatio = pe;
                }
            }
            const epsElement = $('[data-test-id="EPS"] .ZYVHBb').first();
            if (epsElement.length > 0) {
                const epsText = epsElement.text().replace(/[₹,$\s]/g, '');
                const eps = parseFloat(epsText);
                if (!isNaN(eps)) {
                    data.earningsPerShare = eps;
                }
            }
            if (!data.currentPrice) {
                const altPriceElement = $('.YMlKec.fxKbKc').first();
                if (altPriceElement.length > 0) {
                    const priceText = altPriceElement.text().replace(/[₹,$\s]/g, '');
                    const price = parseFloat(priceText);
                    if (!isNaN(price)) {
                        data.currentPrice = price;
                    }
                }
            }
            logger_1.logger.debug(`Scraped data for ${symbol}:`, data);
            return data.currentPrice ? data : null;
        }
        catch (error) {
            if (attempt < this.maxRetries) {
                logger_1.logger.warn(`Attempt ${attempt} failed for ${symbol}, retrying in ${this.retryDelay}ms...`);
                await this.delay(this.retryDelay * attempt);
                return this.scrapeGoogleFinance(symbol, exchange, attempt + 1);
            }
            logger_1.logger.error(`Failed to scrape Google Finance for ${symbol} after ${this.maxRetries} attempts:`, error);
            return null;
        }
    }
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    async isServiceAvailable() {
        try {
            const result = await this.getCurrentPrice('RELIANCE', 'NSE');
            return result !== null;
        }
        catch (error) {
            logger_1.logger.error('Google Finance service availability check failed:', error);
            return false;
        }
    }
    formatSymbolForExchange(symbol, exchange) {
        switch (exchange.toUpperCase()) {
            case 'NSE':
                return symbol.toUpperCase();
            case 'BSE':
                return symbol.toUpperCase();
            case 'NASDAQ':
            case 'NYSE':
                return symbol.toUpperCase();
            default:
                return symbol.toUpperCase();
        }
    }
}
exports.googleFinanceService = new GoogleFinanceService();
exports.default = exports.googleFinanceService;
//# sourceMappingURL=googleFinanceService.js.map