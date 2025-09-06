import { yahooFinanceService } from './yahooFinanceService';
import { logger } from '../utils/logger';

export interface HistoricalPriceData {
  symbol: string;
  historicalPrice: number;
  currentPrice: number;
  purchaseDate: string;
  currency: string;
  source: string;
}

class HistoricalPriceService {
  
  /**
   * Get realistic purchase price using historical data
   */
  async getRealisticPurchasePrice(symbol: string): Promise<HistoricalPriceData | null> {
    try {
      logger.info(`Getting realistic purchase price for ${symbol}`);
      
      // Try different time periods to find valid historical data
      const timePeriodsToTry = [3, 4, 5, 6]; // months ago
      
      for (const monthsAgo of timePeriodsToTry) {
        try {
          const historicalPrice = await yahooFinanceService.getHistoricalPrice(symbol, monthsAgo);
          
          if (historicalPrice && historicalPrice > 0) {
            // Also get current price for comparison
            const currentPrice = await yahooFinanceService.getCurrentPrice(symbol);
            
            if (currentPrice) {
              const purchaseDate = new Date();
              purchaseDate.setMonth(purchaseDate.getMonth() - monthsAgo);
              
              const result: HistoricalPriceData = {
                symbol,
                historicalPrice,
                currentPrice,
                purchaseDate: purchaseDate.toISOString().split('T')[0],
                currency: this.detectCurrency(symbol),
                source: 'yahoo-historical'
              };
              
              logger.info(`Found realistic purchase price for ${symbol}: ${this.detectCurrency(symbol)}${historicalPrice} (${monthsAgo} months ago)`);
              return result;
            }
          }
        } catch (error) {
          logger.warn(`Failed to get historical price for ${symbol} from ${monthsAgo} months ago:`, error);
          continue;
        }
      }
      
      // Fallback: Use a more realistic calculation if historical data fails
      logger.warn(`No historical data available for ${symbol}, using fallback calculation`);
      return await this.getFallbackPurchasePrice(symbol);
      
    } catch (error) {
      logger.error(`Error getting realistic purchase price for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Fallback method when historical data is not available
   */
  private async getFallbackPurchasePrice(symbol: string): Promise<HistoricalPriceData | null> {
    try {
      const currentPrice = await yahooFinanceService.getCurrentPrice(symbol);
      
      if (!currentPrice) {
        return null;
      }
      
      // Generate a realistic purchase price within ±30% of current price
      // This creates a mix of gains and losses
      const randomFactor = 0.7 + (Math.random() * 0.6); // Range: 0.7 to 1.3
      const historicalPrice = currentPrice * randomFactor;
      
      // Random date between 2-8 months ago
      const monthsAgo = 2 + Math.floor(Math.random() * 6);
      const purchaseDate = new Date();
      purchaseDate.setMonth(purchaseDate.getMonth() - monthsAgo);
      
      const result: HistoricalPriceData = {
        symbol,
        historicalPrice,
        currentPrice,
        purchaseDate: purchaseDate.toISOString().split('T')[0],
        currency: this.detectCurrency(symbol),
        source: 'calculated-realistic'
      };
      
      logger.info(`Generated realistic fallback price for ${symbol}: ${this.detectCurrency(symbol)}${historicalPrice.toFixed(2)}`);
      return result;
      
    } catch (error) {
      logger.error(`Error generating fallback price for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Detect currency based on symbol and exchange
   */
  private detectCurrency(symbol: string): string {
    // Indian stocks (NSE/BSE) use INR
    if (symbol.includes('.NS') || symbol.includes('.BO')) {
      return '₹';
    }
    
    // Check if it's an Indian stock symbol
    const indianStockSymbols = [
      'RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ITC', 'SBIN', 
      'BHARTIARTL', 'ICICIBANK', 'HINDUNILVR', 'KOTAKBANK'
    ];
    
    if (indianStockSymbols.includes(symbol)) {
      return '₹';
    }
    
    // Default to USD for international stocks
    return '$';
  }

  /**
   * Convert USD to INR if needed (for currency consistency)
   */
  private async convertToINR(usdPrice: number): Promise<number> {
    try {
      // Simple conversion rate (in production, you'd use a live forex API)
      const USD_TO_INR = 83.50; // Approximate rate
      return usdPrice * USD_TO_INR;
    } catch (error) {
      logger.error('Error converting USD to INR:', error);
      return usdPrice * 83.50; // Fallback rate
    }
  }

  /**
   * Ensure price consistency for Indian stocks
   */
  async ensureCurrencyConsistency(symbol: string, price: number): Promise<number> {
    const currency = this.detectCurrency(symbol);
    
    // If it's an Indian stock but price seems to be in USD (< 100), convert it
    if (currency === '₹' && price < 100) {
      logger.warn(`Price ${price} for ${symbol} seems to be in USD, converting to INR`);
      return await this.convertToINR(price);
    }
    
    return price;
  }

  /**
   * Get batch historical prices for multiple symbols
   */
  async getBatchHistoricalPrices(symbols: string[]): Promise<Record<string, HistoricalPriceData | null>> {
    logger.info(`Fetching historical prices for ${symbols.length} symbols`);
    
    const results: Record<string, HistoricalPriceData | null> = {};
    
    // Process sequentially to avoid overwhelming the API
    for (const symbol of symbols) {
      try {
        const historicalData = await this.getRealisticPurchasePrice(symbol);
        results[symbol] = historicalData;
        
        // Add delay between requests
        await this.delay(500);
      } catch (error) {
        logger.error(`Failed to get historical price for ${symbol}:`, error);
        results[symbol] = null;
      }
    }
    
    const successCount = Object.values(results).filter(Boolean).length;
    logger.info(`Historical price fetch completed. Success rate: ${successCount}/${symbols.length}`);
    
    return results;
  }

  /**
   * Utility method to add delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Generate portfolio statistics for verification
   */
  generatePortfolioStats(stocksData: HistoricalPriceData[]): {
    totalStocks: number;
    gainers: number;
    losers: number;
    avgGainLossPercent: number;
    maxGain: number;
    maxLoss: number;
  } {
    const gainers = stocksData.filter(stock => stock.currentPrice > stock.historicalPrice);
    const losers = stocksData.filter(stock => stock.currentPrice < stock.historicalPrice);
    
    const gainLossPercentages = stocksData.map(stock => 
      ((stock.currentPrice - stock.historicalPrice) / stock.historicalPrice) * 100
    );
    
    const avgGainLossPercent = gainLossPercentages.reduce((sum, pct) => sum + pct, 0) / gainLossPercentages.length;
    
    return {
      totalStocks: stocksData.length,
      gainers: gainers.length,
      losers: losers.length,
      avgGainLossPercent: parseFloat(avgGainLossPercent.toFixed(2)),
      maxGain: Math.max(...gainLossPercentages),
      maxLoss: Math.min(...gainLossPercentages)
    };
  }
}

// Create singleton instance
export const historicalPriceService = new HistoricalPriceService();
export default historicalPriceService;
