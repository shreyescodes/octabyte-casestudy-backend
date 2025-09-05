import { yahooFinanceService } from './yahooFinanceService';
import { googleFinanceService } from './googleFinanceService';
import { MarketData } from '../types/stock';
import { logger } from '../utils/logger';

interface MarketDataCache {
  [symbol: string]: {
    data: MarketData;
    timestamp: number;
    ttl: number;
  };
}

class MarketDataService {
  private cache: MarketDataCache = {};
  private readonly defaultCacheTTL = 5 * 60 * 1000; // 5 minutes
  private readonly fallbackCacheTTL = 30 * 60 * 1000; // 30 minutes for fallback data

  /**
   * Get market data with fallback strategy:
   * 1. Try Yahoo Finance first (more reliable API)
   * 2. Fallback to Google Finance (web scraping)
   * 3. Return cached data if available
   */
  async getMarketData(symbol: string, exchange = 'NSE', forceRefresh = false): Promise<MarketData | null> {
    try {
      // Check cache first (unless force refresh)
      if (!forceRefresh) {
        const cachedData = this.getCachedData(symbol);
        if (cachedData) {
          logger.debug(`Returning cached data for ${symbol}`);
          return cachedData;
        }
      }

      logger.info(`Fetching fresh market data for ${symbol}`);

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
          logger.warn(`Returning stale cached data for ${symbol} - all APIs failed`);
          return staleData;
        }
        
        logger.error(`No market data available for ${symbol} from any source`);
        return null;
      }

      // Cache the successful result
      this.cacheData(symbol, marketData);
      
      return marketData;
    } catch (error) {
      logger.error(`Error in getMarketData for ${symbol}:`, error);
      
      // Return cached data as fallback
      const fallbackData = this.getStaleData(symbol);
      if (fallbackData) {
        logger.warn(`Returning fallback cached data for ${symbol} due to error`);
        return fallbackData;
      }
      
      return null;
    }
  }

  /**
   * Get current price only (optimized for speed)
   */
  async getCurrentPrice(symbol: string, exchange = 'NSE'): Promise<number | null> {
    try {
      // Check cache for recent price data
      const cachedData = this.getCachedData(symbol);
      if (cachedData && this.isDataFresh(cachedData, 1 * 60 * 1000)) { // 1 minute for price
        return cachedData.currentPrice;
      }

      // Try Yahoo Finance for price (faster than full market data)
      const yahooPrice = await yahooFinanceService.getCurrentPrice(symbol);
      if (yahooPrice !== null) {
        return yahooPrice;
      }

      // Fallback to Google Finance
      const googlePrice = await googleFinanceService.getCurrentPrice(symbol, exchange);
      if (googlePrice !== null) {
        return googlePrice;
      }

      // Return cached price if available
      if (cachedData) {
        logger.warn(`Returning cached price for ${symbol} - APIs unavailable`);
        return cachedData.currentPrice;
      }

      return null;
    } catch (error) {
      logger.error(`Error getting current price for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Get batch market data for multiple symbols
   */
  async getBatchMarketData(symbols: string[], exchange = 'NSE'): Promise<Record<string, MarketData | null>> {
    logger.info(`Fetching batch market data for ${symbols.length} symbols`);
    
    const results: Record<string, MarketData | null> = {};
    
    // Separate symbols into cached and uncached
    const uncachedSymbols: string[] = [];
    const cachedSymbols: string[] = [];
    
    for (const symbol of symbols) {
      const cachedData = this.getCachedData(symbol);
      if (cachedData) {
        results[symbol] = cachedData;
        cachedSymbols.push(symbol);
      } else {
        uncachedSymbols.push(symbol);
      }
    }
    
    logger.info(`Using cached data for ${cachedSymbols.length} symbols, fetching ${uncachedSymbols.length} symbols`);
    
    if (uncachedSymbols.length === 0) {
      return results;
    }

    // Try Yahoo Finance batch first
    try {
      const yahooResults = await yahooFinanceService.getBatchMarketData(uncachedSymbols);
      
      for (const symbol of uncachedSymbols) {
        const yahooData = yahooResults[symbol];
        if (yahooData) {
          results[symbol] = yahooData;
          this.cacheData(symbol, yahooData);
        }
      }
    } catch (error) {
      logger.error('Yahoo Finance batch request failed:', error);
    }

    // For symbols that Yahoo couldn't fetch, try Google Finance
    const remainingSymbols = uncachedSymbols.filter(symbol => !results[symbol]);
    
    if (remainingSymbols.length > 0) {
      logger.info(`Trying Google Finance for ${remainingSymbols.length} remaining symbols`);
      
      // Process Google Finance requests more conservatively (sequential with delays)
      for (const symbol of remainingSymbols) {
        try {
          const googleData = await googleFinanceService.getMarketData(symbol, exchange);
          if (googleData) {
            results[symbol] = googleData;
            this.cacheData(symbol, googleData);
          } else {
            results[symbol] = null;
          }
          
          // Add delay between Google requests
          await this.delay(500);
        } catch (error) {
          logger.error(`Error fetching ${symbol} from Google Finance:`, error);
          results[symbol] = null;
        }
      }
    }

    const successCount = Object.values(results).filter(Boolean).length;
    logger.info(`Batch operation completed. Success rate: ${successCount}/${symbols.length} (${(successCount/symbols.length*100).toFixed(1)}%)`);
    
    return results;
  }

  /**
   * Try Yahoo Finance
   */
  private async tryYahooFinance(symbol: string): Promise<MarketData | null> {
    try {
      return await yahooFinanceService.getMarketData(symbol);
    } catch (error) {
      logger.warn(`Yahoo Finance failed for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Try Google Finance
   */
  private async tryGoogleFinance(symbol: string, exchange: string): Promise<MarketData | null> {
    try {
      return await googleFinanceService.getMarketData(symbol, exchange);
    } catch (error) {
      logger.warn(`Google Finance failed for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Get cached data if still valid
   */
  private getCachedData(symbol: string): MarketData | null {
    const cached = this.cache[symbol];
    if (!cached) return null;
    
    if (this.isDataFresh(cached.data, cached.ttl)) {
      return cached.data;
    }
    
    return null;
  }

  /**
   * Get stale cached data (for fallback)
   */
  private getStaleData(symbol: string): MarketData | null {
    const cached = this.cache[symbol];
    return cached ? cached.data : null;
  }

  /**
   * Check if data is fresh within TTL
   */
  private isDataFresh(data: MarketData, ttl: number): boolean {
    const age = Date.now() - new Date(data.lastUpdated).getTime();
    return age < ttl;
  }

  /**
   * Cache market data
   */
  private cacheData(symbol: string, data: MarketData): void {
    this.cache[symbol] = {
      data,
      timestamp: Date.now(),
      ttl: this.defaultCacheTTL
    };
  }

  /**
   * Clear expired cache entries
   */
  private cleanupCache(): void {
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
  getCacheStats(): { totalEntries: number; freshEntries: number; staleEntries: number } {
    const now = Date.now();
    let freshEntries = 0;
    let staleEntries = 0;
    
    for (const symbol in this.cache) {
      const cached = this.cache[symbol];
      if (now - cached.timestamp < cached.ttl) {
        freshEntries++;
      } else {
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
  async checkServiceHealth(): Promise<{
    yahoo: boolean;
    google: boolean;
    cache: { totalEntries: number; freshEntries: number; staleEntries: number };
  }> {
    const [yahooAvailable, googleAvailable] = await Promise.all([
      yahooFinanceService.isServiceAvailable(),
      googleFinanceService.isServiceAvailable()
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
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Force refresh cache for a symbol
   */
  async refreshSymbol(symbol: string, exchange = 'NSE'): Promise<MarketData | null> {
    return this.getMarketData(symbol, exchange, true);
  }

  /**
   * Preload market data for symbols (for warming cache)
   */
  async preloadSymbols(symbols: string[], exchange = 'NSE'): Promise<void> {
    logger.info(`Preloading market data for ${symbols.length} symbols`);
    await this.getBatchMarketData(symbols, exchange);
  }

  /**
   * Clear all cached data
   */
  clearCache(): void {
    this.cache = {};
    logger.info('Market data cache cleared');
  }
}

// Start cache cleanup interval
const marketDataService = new MarketDataService();

// Clean up cache every 10 minutes
setInterval(() => {
  marketDataService['cleanupCache']();
}, 10 * 60 * 1000);

export { marketDataService };
export default marketDataService;
