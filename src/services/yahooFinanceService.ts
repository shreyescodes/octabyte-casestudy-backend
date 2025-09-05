import yahooFinance from 'yahoo-finance2';
import { MarketData } from '../types/stock';
import { logger } from '../utils/logger';

interface YahooQuoteResponse {
  symbol: string;
  regularMarketPrice?: number;
  trailingPE?: number;
  trailingAnnualDividendYield?: number;
  earningsPerShare?: number;
  marketCap?: number;
}

class YahooFinanceService {
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000; // 1 second

  /**
   * Fetch current market price from Yahoo Finance
   */
  async getCurrentPrice(symbol: string): Promise<number | null> {
    try {
      logger.info(`Fetching current price for ${symbol} from Yahoo Finance`);
      
      const quote = await this.getQuoteWithRetry(symbol);
      
      if (quote && quote.regularMarketPrice) {
        logger.info(`Successfully fetched price for ${symbol}: $${quote.regularMarketPrice}`);
        return quote.regularMarketPrice;
      }
      
      logger.warn(`No price data found for ${symbol} on Yahoo Finance`);
      return null;
    } catch (error) {
      logger.error(`Error fetching price for ${symbol} from Yahoo Finance:`, error);
      return null;
    }
  }

  /**
   * Fetch comprehensive market data including P/E ratio and earnings
   */
  async getMarketData(symbol: string): Promise<MarketData | null> {
    try {
      logger.info(`Fetching market data for ${symbol} from Yahoo Finance`);
      
      const quote = await this.getQuoteWithRetry(symbol);
      
      if (!quote || !quote.regularMarketPrice) {
        logger.warn(`No market data found for ${symbol} on Yahoo Finance`);
        return null;
      }

      const marketData: MarketData = {
        symbol,
        currentPrice: quote.regularMarketPrice,
        peRatio: quote.trailingPE || undefined,
        latestEarnings: quote.earningsPerShare || undefined,
        lastUpdated: new Date().toISOString(),
        source: 'yahoo'
      };

      logger.info(`Successfully fetched market data for ${symbol}:`, marketData);
      return marketData;
    } catch (error) {
      logger.error(`Error fetching market data for ${symbol} from Yahoo Finance:`, error);
      return null;
    }
  }

  /**
   * Fetch market data for multiple symbols in batch
   */
  async getBatchMarketData(symbols: string[]): Promise<Record<string, MarketData | null>> {
    logger.info(`Fetching batch market data for ${symbols.length} symbols from Yahoo Finance`);
    
    const results: Record<string, MarketData | null> = {};
    
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
        } else {
          logger.error(`Failed to fetch data for symbol in batch:`, result.reason);
        }
      });
      
      // Add delay between batches to respect rate limits
      if (i + batchSize < symbols.length) {
        await this.delay(500);
      }
    }
    
    logger.info(`Completed batch fetch for ${symbols.length} symbols. Success rate: ${
      Object.values(results).filter(Boolean).length / symbols.length * 100
    }%`);
    
    return results;
  }

  /**
   * Search for stock symbol by company name
   */
  async searchSymbol(companyName: string): Promise<string[]> {
    try {
      logger.info(`Searching for symbols matching: ${companyName}`);
      
      const searchResults = await yahooFinance.search(companyName);
      
      if (searchResults && searchResults.quotes) {
        const symbols = searchResults.quotes
          .filter((quote: any) => quote.symbol && quote.quoteType === 'EQUITY')
          .map((quote: any) => quote.symbol as string)
          .slice(0, 5); // Return top 5 matches
        
        logger.info(`Found ${symbols.length} symbols for "${companyName}":`, symbols);
        return symbols;
      }
      
      return [];
    } catch (error) {
      logger.error(`Error searching for symbols with name "${companyName}":`, error);
      return [];
    }
  }

  /**
   * Get quote with retry mechanism
   */
  private async getQuoteWithRetry(symbol: string, attempt = 1): Promise<YahooQuoteResponse | null> {
    try {
      const quote = await yahooFinance.quote(symbol);
      
      return quote as YahooQuoteResponse;
    } catch (error) {
      if (attempt < this.maxRetries) {
        logger.warn(`Attempt ${attempt} failed for ${symbol}, retrying in ${this.retryDelay}ms...`);
        await this.delay(this.retryDelay * attempt);
        return this.getQuoteWithRetry(symbol, attempt + 1);
      }
      throw error;
    }
  }

  /**
   * Utility method to add delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Check if Yahoo Finance service is available
   */
  async isServiceAvailable(): Promise<boolean> {
    try {
      // Try to fetch a well-known stock (Apple) to test service availability
      const result = await this.getCurrentPrice('AAPL');
      return result !== null;
    } catch (error) {
      logger.error('Yahoo Finance service availability check failed:', error);
      return false;
    }
  }
}

export const yahooFinanceService = new YahooFinanceService();
export default yahooFinanceService;
