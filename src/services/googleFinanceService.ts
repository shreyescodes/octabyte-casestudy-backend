
import axios from 'axios';
import * as cheerio from 'cheerio';
import { MarketData } from '../types/stock';
import { logger } from '../utils/logger';

interface GoogleFinanceData {
  symbol: string;
  currentPrice?: number;
  peRatio?: number;
  earningsPerShare?: number;
  marketCap?: string;
}

class GoogleFinanceService {
  private readonly baseUrl = 'https://www.google.com/finance/quote';
  private readonly maxRetries = 3;
  private readonly retryDelay = 2000; // 2 seconds

  /**
   * Fetch current market price from Google Finance
   */
  async getCurrentPrice(symbol: string, exchange = 'NSE'): Promise<number | null> {
    try {
      logger.info(`Fetching current price for ${symbol} from Google Finance`);
      
      const data = await this.scrapeGoogleFinance(symbol, exchange);
      
      if (data && data.currentPrice) {
        logger.info(`Successfully fetched price for ${symbol}: $${data.currentPrice}`);
        return data.currentPrice;
      }
      
      logger.warn(`No price data found for ${symbol} on Google Finance`);
      return null;
    } catch (error) {
      logger.error(`Error fetching price for ${symbol} from Google Finance:`, error);
      return null;
    }
  }

  /**
   * Fetch P/E ratio and earnings data from Google Finance
   */
  async getFinancialData(symbol: string, exchange = 'NSE'): Promise<{ peRatio?: number; latestEarnings?: number } | null> {
    try {
      logger.info(`Fetching financial data for ${symbol} from Google Finance`);
      
      const data = await this.scrapeGoogleFinance(symbol, exchange);
      
      if (data) {
        const result = {
          peRatio: data.peRatio,
          latestEarnings: data.earningsPerShare
        };
        
        logger.info(`Successfully fetched financial data for ${symbol}:`, result);
        return result;
      }
      
      logger.warn(`No financial data found for ${symbol} on Google Finance`);
      return null;
    } catch (error) {
      logger.error(`Error fetching financial data for ${symbol} from Google Finance:`, error);
      return null;
    }
  }

  /**
   * Fetch comprehensive market data from Google Finance
   */
  async getMarketData(symbol: string, exchange = 'NSE'): Promise<MarketData | null> {
    try {
      logger.info(`Fetching market data for ${symbol} from Google Finance`);
      
      const data = await this.scrapeGoogleFinance(symbol, exchange);
      
      if (!data || !data.currentPrice) {
        logger.warn(`No market data found for ${symbol} on Google Finance`);
        return null;
      }

      const marketData: MarketData = {
        symbol,
        currentPrice: data.currentPrice,
        peRatio: data.peRatio,
        latestEarnings: data.earningsPerShare,
        lastUpdated: new Date().toISOString(),
        source: 'google'
      };

      logger.info(`Successfully fetched market data for ${symbol}:`, marketData);
      return marketData;
    } catch (error) {
      logger.error(`Error fetching market data for ${symbol} from Google Finance:`, error);
      return null;
    }
  }

  /**
   * Fetch market data for multiple symbols in batch
   */
  async getBatchMarketData(symbols: string[], exchange = 'NSE'): Promise<Record<string, MarketData | null>> {
    logger.info(`Fetching batch market data for ${symbols.length} symbols from Google Finance`);
    
    const results: Record<string, MarketData | null> = {};
    
    // Process symbols sequentially to avoid being blocked by Google
    for (const symbol of symbols) {
      try {
        const data = await this.getMarketData(symbol, exchange);
        results[symbol] = data;
        
        // Add delay between requests to be respectful
        await this.delay(1000);
      } catch (error) {
        logger.error(`Failed to fetch data for ${symbol}:`, error);
        results[symbol] = null;
      }
    }
    
    logger.info(`Completed batch fetch for ${symbols.length} symbols. Success rate: ${
      Object.values(results).filter(Boolean).length / symbols.length * 100
    }%`);
    
    return results;
  }

  /**
   * Scrape Google Finance page for stock data
   */
  private async scrapeGoogleFinance(symbol: string, exchange = 'NSE', attempt = 1): Promise<GoogleFinanceData | null> {
    try {
      const url = `${this.baseUrl}/${symbol}:${exchange}`;
      
      logger.debug(`Scraping Google Finance URL: ${url} (attempt ${attempt})`);
      
      const response = await axios.get(url, {
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
      const data: GoogleFinanceData = { symbol };

      // Extract current price
      const priceElement = $('[data-source="BFP"] [jsname="ip4Tqd"]').first();
      if (priceElement.length > 0) {
        const priceText = priceElement.text().replace(/[₹,$\s]/g, '');
        const price = parseFloat(priceText);
        if (!isNaN(price)) {
          data.currentPrice = price;
        }
      }

      // Extract P/E ratio
      const peElement = $('[data-test-id="P/E ratio"] .ZYVHBb').first();
      if (peElement.length > 0) {
        const peText = peElement.text().replace(/[,\s]/g, '');
        const pe = parseFloat(peText);
        if (!isNaN(pe)) {
          data.peRatio = pe;
        }
      }

      // Extract EPS (Earnings Per Share)
      const epsElement = $('[data-test-id="EPS"] .ZYVHBb').first();
      if (epsElement.length > 0) {
        const epsText = epsElement.text().replace(/[₹,$\s]/g, '');
        const eps = parseFloat(epsText);
        if (!isNaN(eps)) {
          data.earningsPerShare = eps;
        }
      }

      // If no data found, try alternative selectors
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

      logger.debug(`Scraped data for ${symbol}:`, data);
      return data.currentPrice ? data : null;

    } catch (error) {
      if (attempt < this.maxRetries) {
        logger.warn(`Attempt ${attempt} failed for ${symbol}, retrying in ${this.retryDelay}ms...`);
        await this.delay(this.retryDelay * attempt);
        return this.scrapeGoogleFinance(symbol, exchange, attempt + 1);
      }
      
      logger.error(`Failed to scrape Google Finance for ${symbol} after ${this.maxRetries} attempts:`, error);
      return null;
    }
  }

  /**
   * Utility method to add delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Check if Google Finance service is available
   */
  async isServiceAvailable(): Promise<boolean> {
    try {
      // Try to fetch a well-known Indian stock to test service availability
      const result = await this.getCurrentPrice('RELIANCE', 'NSE');
      return result !== null;
    } catch (error) {
      logger.error('Google Finance service availability check failed:', error);
      return false;
    }
  }

  /**
   * Convert symbol format for different exchanges
   */
  private formatSymbolForExchange(symbol: string, exchange: string): string {
    // Handle different symbol formats for different exchanges
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

export const googleFinanceService = new GoogleFinanceService();
export default googleFinanceService;
