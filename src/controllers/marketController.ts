import { Request, Response } from 'express';
import { marketDataService } from '../services/marketDataService';
import { priceUpdateService } from '../services/priceUpdateService';
import { stockExchangeService } from '../services/stockExchangeService';
import { logger } from '../utils/logger';
import Database from '../config/database';

export class MarketController {
  /**
   * Search for stocks across all exchanges - comprehensive search
   */
  static async searchStock(req: Request, res: Response): Promise<void> {
    try {
      const { query, limit = '20' } = req.query;

      if (!query || typeof query !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Search query is required'
        });
        return;
      }

      logger.info(`Searching across all exchanges for: ${query}`);

      // Search across all listed stocks
      const searchResults = await stockExchangeService.searchStocks(
        query.trim(), 
        parseInt(limit as string)
      );

      if (searchResults.length > 0) {
        // Enrich results with live market data (for top 5 results to avoid too many API calls)
        const enrichedResults = await Promise.all(
          searchResults.slice(0, 5).map(async (stock) => {
            try {
              const marketData = await marketDataService.getMarketData(stock.symbol, stock.exchange);
              return {
                ...stock,
                currentPrice: marketData?.currentPrice || stock.currentPrice,
                change: marketData?.change || 0,
                changePercent: marketData?.changePercent || 0,
                peRatio: marketData?.peRatio,
                latestEarnings: marketData?.latestEarnings,
                lastUpdated: marketData?.lastUpdated || new Date().toISOString(),
                hasLiveData: !!marketData
              };
            } catch (error) {
              logger.warn(`Failed to fetch live data for ${stock.symbol}:`, error);
              return {
                ...stock,
                hasLiveData: false
              };
            }
          })
        );

        // Add remaining results without live data (to avoid API rate limits)
        const remainingResults = searchResults.slice(5).map(stock => ({
          ...stock,
          hasLiveData: false
        }));

        const allResults = [...enrichedResults, ...remainingResults];

        res.json({
          success: true,
          data: allResults,
          totalResults: searchResults.length,
          message: `Found ${searchResults.length} stocks matching "${query}"`
        });
      } else {
        res.json({
          success: true,
          data: [],
          totalResults: 0,
          message: `No stocks found matching "${query}"`
        });
      }
    } catch (error) {
      logger.error('Error searching for stocks:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to search stocks'
      });
    }
  }

  /**
   * Get current market price for a symbol
   */
  static async getCurrentPrice(req: Request, res: Response): Promise<void> {
    try {
      const { symbol } = req.params;
      const { exchange = 'NSE' } = req.query;

      if (!symbol) {
        res.status(400).json({
          success: false,
          error: 'Stock symbol is required'
        });
        return;
      }

      const price = await marketDataService.getCurrentPrice(symbol, exchange as string);

      if (price !== null) {
        res.json({
          success: true,
          data: {
            symbol: symbol.toUpperCase(),
            currentPrice: price,
            timestamp: new Date().toISOString()
          }
        });
      } else {
        res.status(404).json({
          success: false,
          error: 'Price data not available'
        });
      }
    } catch (error) {
      logger.error('Error getting current price:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch current price'
      });
    }
  }

  /**
   * Get detailed market data for a symbol
   */
  static async getMarketData(req: Request, res: Response): Promise<void> {
    try {
      const { symbol } = req.params;
      const { exchange = 'NSE', refresh = 'false' } = req.query;

      if (!symbol) {
        res.status(400).json({
          success: false,
          error: 'Stock symbol is required'
        });
        return;
      }

      const forceRefresh = refresh === 'true';
      const marketData = await marketDataService.getMarketData(
        symbol, 
        exchange as string, 
        forceRefresh
      );

      if (marketData) {
        res.json({
          success: true,
          data: marketData
        });
      } else {
        res.status(404).json({
          success: false,
          error: 'Market data not available'
        });
      }
    } catch (error) {
      logger.error('Error getting market data:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch market data'
      });
    }
  }

  /**
   * Update all stock prices in portfolio
   */
  static async updateAllPrices(req: Request, res: Response): Promise<void> {
    try {
      logger.info('Manual price update requested');
      
      // Trigger price update (don't wait for completion)
      priceUpdateService.updateAllStockPrices().catch(error => {
        logger.error('Error in manual price update:', error);
      });

      res.json({
        success: true,
        message: 'Price update initiated'
      });
    } catch (error) {
      logger.error('Error initiating price update:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to initiate price update'
      });
    }
  }

  /**
   * Update specific stock price
   */
  static async updateStockPrice(req: Request, res: Response): Promise<void> {
    try {
      const { stockId } = req.params;

      if (!stockId) {
        res.status(400).json({
          success: false,
          error: 'Stock ID is required'
        });
        return;
      }

      const updated = await priceUpdateService.updateStockPrice(stockId);

      if (updated) {
        res.json({
          success: true,
          message: 'Stock price updated successfully'
        });
      } else {
        res.status(404).json({
          success: false,
          error: 'Stock not found or update failed'
        });
      }
    } catch (error) {
      logger.error('Error updating stock price:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update stock price'
      });
    }
  }

  /**
   * Get market service status
   */
  static async getServiceStatus(req: Request, res: Response): Promise<void> {
    try {
      const [serviceHealth, updateStatus] = await Promise.all([
        marketDataService.checkServiceHealth(),
        priceUpdateService.getStatus()
      ]);

      res.json({
        success: true,
        data: {
          marketDataServices: serviceHealth,
          priceUpdateService: updateStatus,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Error getting service status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get service status'
      });
    }
  }

  /**
   * Get stock suggestions from all exchanges
   */
  static async getPopularStocks(req: Request, res: Response): Promise<void> {
    try {
      const { 
        sector, 
        exchange, 
        limit = '20',
        minMarketCap,
        maxMarketCap 
      } = req.query;

      logger.info('Getting stock suggestions from all exchanges');

      // Get suggestions based on filters
      const suggestions = await stockExchangeService.getStockSuggestions({
        sector: sector as string,
        exchange: exchange as string,
        limit: parseInt(limit as string),
        minMarketCap: minMarketCap ? parseInt(minMarketCap as string) : undefined,
        maxMarketCap: maxMarketCap ? parseInt(maxMarketCap as string) : undefined,
      });

      // Enrich top suggestions with live market data
      const enrichedSuggestions = await Promise.all(
        suggestions.slice(0, 10).map(async (stock) => {
          try {
            const marketData = await marketDataService.getMarketData(stock.symbol, stock.exchange);
            return {
              ...stock,
              currentPrice: marketData?.currentPrice || stock.currentPrice,
              change: marketData?.change || 0,
              changePercent: marketData?.changePercent || 0,
              hasLiveData: !!marketData
            };
          } catch (error) {
            return {
              ...stock,
              hasLiveData: false
            };
          }
        })
      );

      // Add remaining without live data
      const remainingSuggestions = suggestions.slice(10).map(stock => ({
        ...stock,
        hasLiveData: false
      }));

      const allSuggestions = [...enrichedSuggestions, ...remainingSuggestions];

      res.json({
        success: true,
        data: allSuggestions,
        totalStocks: suggestions.length,
        filters: {
          sector: sector || 'all',
          exchange: exchange || 'all',
          limit: parseInt(limit as string)
        },
        message: `Found ${suggestions.length} stock suggestions`
      });
    } catch (error) {
      logger.error('Error getting stock suggestions:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get stock suggestions'
      });
    }
  }

  /**
   * Get all available exchanges and sectors
   */
  static async getMarketInfo(req: Request, res: Response): Promise<void> {
    try {
      const cacheStats = stockExchangeService.getCacheStats();
      const allStocks = await stockExchangeService.getAllListedStocks();
      
      // Get unique sectors and exchanges
      const sectors = [...new Set(allStocks.map(stock => stock.sector))].filter(Boolean).sort();
      const exchanges = [...new Set(allStocks.map(stock => stock.exchange))].filter(Boolean).sort();
      
      res.json({
        success: true,
        data: {
          totalStocks: allStocks.length,
          exchanges: exchanges.map(exchange => ({
            code: exchange,
            name: exchange,
            stockCount: allStocks.filter(stock => stock.exchange === exchange).length
          })),
          sectors: sectors.map(sector => ({
            name: sector,
            stockCount: allStocks.filter(stock => stock.sector === sector).length
          })),
          cacheInfo: cacheStats
        },
        message: 'Market information retrieved'
      });
    } catch (error) {
      logger.error('Error getting market info:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get market information'
      });
    }
  }

  /**
   * Browse stocks by sector or exchange
   */
  static async browseStocks(req: Request, res: Response): Promise<void> {
    try {
      const { 
        sector, 
        exchange, 
        page = '1', 
        limit = '50',
        sortBy = 'name',
        sortOrder = 'asc'
      } = req.query;

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const offset = (pageNum - 1) * limitNum;

      logger.info(`Browsing stocks - Sector: ${sector}, Exchange: ${exchange}, Page: ${pageNum}`);

      // Get all stocks first
      let allStocks = await stockExchangeService.getAllListedStocks();

      // Apply filters
      if (sector) {
        allStocks = allStocks.filter(stock => 
          stock.sector.toLowerCase() === (sector as string).toLowerCase()
        );
      }

      if (exchange) {
        allStocks = allStocks.filter(stock => 
          stock.exchange.toLowerCase() === (exchange as string).toLowerCase()
        );
      }

      // Sort
      allStocks.sort((a, b) => {
        let aValue: any, bValue: any;
        
        switch (sortBy) {
          case 'marketCap':
            aValue = a.marketCap || 0;
            bValue = b.marketCap || 0;
            break;
          case 'price':
            aValue = a.lastPrice || 0;
            bValue = b.lastPrice || 0;
            break;
          default:
            aValue = a.name.toLowerCase();
            bValue = b.name.toLowerCase();
        }

        if (sortOrder === 'desc') {
          return aValue < bValue ? 1 : -1;
        }
        return aValue > bValue ? 1 : -1;
      });

      // Paginate
      const totalStocks = allStocks.length;
      const paginatedStocks = allStocks.slice(offset, offset + limitNum);

      res.json({
        success: true,
        data: paginatedStocks,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: totalStocks,
          pages: Math.ceil(totalStocks / limitNum)
        },
        filters: {
          sector: sector || null,
          exchange: exchange || null,
          sortBy,
          sortOrder
        },
        message: `Found ${totalStocks} stocks`
      });
    } catch (error) {
      logger.error('Error browsing stocks:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to browse stocks'
      });
    }
  }
}
