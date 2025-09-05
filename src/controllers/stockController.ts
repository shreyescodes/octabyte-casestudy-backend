import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Stock, StockCreateRequest, StockUpdateRequest } from '../types/stock';
import marketDataService from '../services/marketDataService';
import { logger } from '../utils/logger';
import Database from '../config/database';

class StockController {
  /**
   * Get all stocks with live market data
   */
  static async getAllStocks(req: Request, res: Response): Promise<void> {
    try {
      logger.info('Fetching all stocks with live market data');
      
      // Fetch stocks from database
      const result = await Database.query(`
        SELECT id, stock_name as "stockName", purchase_price as "purchasePrice", 
               quantity, investment, portfolio_percentage as "portfolioPercentage",
               stock_exchange_code as "stockExchangeCode", current_market_price as "currentMarketPrice",
               present_value as "presentValue", gain_loss as "gainLoss",
               pe_ratio as "peRatio", latest_earnings as "latestEarnings", sector,
               created_at as "createdAt", updated_at as "updatedAt"
        FROM stocks ORDER BY created_at DESC
      `);
      
      const stocks: Stock[] = [];
      
      // Fetch live market data for each stock
      for (const row of result.rows) {
        const symbol = StockController.extractStockSymbol(row.stockName);
        
        // Get live market data
        logger.info(`Fetching live data for ${row.stockName} (${symbol})`);
        const marketData = await marketDataService.getMarketData(symbol, row.stockExchangeCode);
        
        let currentMarketPrice = parseFloat(row.currentMarketPrice);
        let peRatio = row.peRatio ? parseFloat(row.peRatio) : undefined;
        let latestEarnings = row.latestEarnings ? parseFloat(row.latestEarnings) : undefined;
        
        // Use live data if available
        if (marketData) {
          currentMarketPrice = marketData.currentPrice;
          peRatio = marketData.peRatio || peRatio;
          latestEarnings = marketData.latestEarnings || latestEarnings;
        }
        
        // Calculate derived values
        const investment = parseFloat(row.investment);
        const presentValue = currentMarketPrice * parseInt(row.quantity);
        const gainLoss = presentValue - investment;
        
        const stock: Stock = {
          id: row.id,
          stockName: row.stockName,
          symbol: symbol,
          purchasePrice: parseFloat(row.purchasePrice),
          quantity: parseInt(row.quantity),
          investment: investment,
          portfolioPercentage: parseFloat(row.portfolioPercentage),
          stockExchangeCode: row.stockExchangeCode,
          currentMarketPrice: currentMarketPrice,
          presentValue: presentValue,
          gainLoss: gainLoss,
          peRatio: peRatio || 0,
          latestEarnings: latestEarnings || 0,
          sector: row.sector,
          purchaseDate: row.createdAt ? new Date(row.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          lastUpdated: new Date().toISOString(),
          createdAt: row.createdAt,
          updatedAt: row.updatedAt
        };
        
        stocks.push(stock);
      }
      
      res.json({
        success: true,
        data: stocks
      });
    } catch (error) {
      logger.error('Error fetching stocks:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch stocks',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Extract stock symbol from stock name with proper mapping
   */
  private static extractStockSymbol(stockName: string): string {
    // Define mapping for common stock names to their trading symbols
    const symbolMapping: Record<string, string> = {
      'Reliance Industries Ltd': 'RELIANCE.NS',
      'Tata Consultancy Services Ltd': 'TCS.NS',
      'HDFC Bank Ltd': 'HDFCBANK.NS',
      'Infosys Ltd': 'INFY.NS',
      'ITC Ltd': 'ITC.NS',
      'State Bank of India': 'SBIN.NS',
      'Bharti Airtel Ltd': 'BHARTIARTL.NS',
      'Kotak Mahindra Bank Ltd': 'KOTAKBANK.NS',
      'Hindustan Unilever Ltd': 'HINDUNILVR.NS',
      'Larsen & Toubro Ltd': 'LT.NS'
    };
    
    // Check if we have a direct mapping
    if (symbolMapping[stockName]) {
      return symbolMapping[stockName];
    }
    
    // Fallback: Extract first word and append .NS for NSE
    const firstWord = stockName.split(' ')[0].toUpperCase();
    return `${firstWord}.NS`;
  }

  /**
   * Get stock by ID with live market data
   */
  static async getStockById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      if (!id) {
        res.status(400).json({
          success: false,
          message: 'Stock ID is required'
        });
        return;
      }

      // Fetch stock from database
      const result = await Database.query(`
        SELECT id, stock_name as "stockName", purchase_price as "purchasePrice", 
               quantity, investment, portfolio_percentage as "portfolioPercentage",
               stock_exchange_code as "stockExchangeCode", current_market_price as "currentMarketPrice",
               present_value as "presentValue", gain_loss as "gainLoss",
               pe_ratio as "peRatio", latest_earnings as "latestEarnings", sector,
               created_at as "createdAt", updated_at as "updatedAt"
        FROM stocks WHERE id = $1
      `, [id]);
      
      if (result.rows.length === 0) {
        res.status(404).json({
          success: false,
          message: `Stock with ID ${id} not found`
        });
        return;
      }

      const row = result.rows[0];
      const symbol = StockController.extractStockSymbol(row.stockName);

      // Update with live market data
      const marketData = await marketDataService.getMarketData(symbol, row.stockExchangeCode);
      
      let currentMarketPrice = parseFloat(row.currentMarketPrice);
      let peRatio = row.peRatio ? parseFloat(row.peRatio) : 0;
      let latestEarnings = row.latestEarnings ? parseFloat(row.latestEarnings) : 0;
      
      if (marketData) {
        currentMarketPrice = marketData.currentPrice;
        peRatio = marketData.peRatio || peRatio;
        latestEarnings = marketData.latestEarnings || latestEarnings;
      }

      const investment = parseFloat(row.investment);
      const presentValue = currentMarketPrice * parseInt(row.quantity);
      const gainLoss = presentValue - investment;

      const stock: Stock = {
        id: row.id,
        stockName: row.stockName,
        symbol: symbol,
        purchasePrice: parseFloat(row.purchasePrice),
        quantity: parseInt(row.quantity),
        investment: investment,
        portfolioPercentage: parseFloat(row.portfolioPercentage),
        stockExchangeCode: row.stockExchangeCode,
        currentMarketPrice: currentMarketPrice,
        presentValue: presentValue,
        gainLoss: gainLoss,
        peRatio: peRatio,
        latestEarnings: latestEarnings,
        sector: row.sector,
        purchaseDate: row.createdAt ? new Date(row.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        lastUpdated: new Date().toISOString(),
        createdAt: row.createdAt,
        updatedAt: row.updatedAt
      };

      res.json({
        success: true,
        data: stock
      });
    } catch (error) {
      logger.error(`Error fetching stock ${req.params.id}:`, error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch stock',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Create new stock with live market data
   */
  static async createStock(req: Request, res: Response): Promise<void> {
    try {
      const stockData: StockCreateRequest = req.body;
      
      // Validate required fields
      if (!stockData.stockName || !stockData.purchasePrice || !stockData.quantity) {
        res.status(400).json({
          success: false,
          message: 'Missing required fields: stockName, purchasePrice, quantity'
        });
        return;
      }

      // Generate unique ID
      const stockId = uuidv4();
      const symbol = StockController.extractStockSymbol(stockData.stockName);
      
      // Get current market data
      let currentMarketPrice = stockData.purchasePrice;
      let peRatio = 0;
      let latestEarnings = 0;
      
      try {
        logger.info(`Fetching live market data for new stock: ${stockData.stockName} (${symbol})`);
        const marketData = await marketDataService.getMarketData(symbol, stockData.stockExchangeCode || 'NSE');
        if (marketData) {
          currentMarketPrice = marketData.currentPrice;
          peRatio = marketData.peRatio || 0;
          latestEarnings = marketData.latestEarnings || 0;
        }
      } catch (error) {
        logger.warn(`Failed to fetch market data for ${stockData.stockName}, using purchase price`);
      }

      const investment = stockData.purchasePrice * stockData.quantity;
      const presentValue = currentMarketPrice * stockData.quantity;
      const gainLoss = presentValue - investment;

      // Insert into database
      await Database.query(`
        INSERT INTO stocks (
          id, stock_name, purchase_price, quantity, investment, 
          stock_exchange_code, current_market_price, present_value, 
          gain_loss, pe_ratio, latest_earnings, sector, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
      `, [
        stockId, stockData.stockName, stockData.purchasePrice, stockData.quantity,
        investment, stockData.stockExchangeCode || 'NSE', currentMarketPrice,
        presentValue, gainLoss, peRatio, latestEarnings, stockData.sector || 'Technology'
      ]);

      // Recalculate portfolio percentages
      await StockController.recalculatePortfolioPercentages();
      
      // Fetch the created stock with updated percentages
      const result = await Database.query(`
        SELECT id, stock_name as "stockName", purchase_price as "purchasePrice", 
               quantity, investment, portfolio_percentage as "portfolioPercentage",
               stock_exchange_code as "stockExchangeCode", current_market_price as "currentMarketPrice",
               present_value as "presentValue", gain_loss as "gainLoss",
               pe_ratio as "peRatio", latest_earnings as "latestEarnings", sector,
               created_at as "createdAt", updated_at as "updatedAt"
        FROM stocks WHERE id = $1
      `, [stockId]);

      const newStock: Stock = {
        id: result.rows[0].id,
        stockName: result.rows[0].stockName,
        symbol: symbol,
        purchasePrice: parseFloat(result.rows[0].purchasePrice),
        quantity: parseInt(result.rows[0].quantity),
        investment: parseFloat(result.rows[0].investment),
        portfolioPercentage: parseFloat(result.rows[0].portfolioPercentage),
        stockExchangeCode: result.rows[0].stockExchangeCode,
        currentMarketPrice: parseFloat(result.rows[0].currentMarketPrice),
        presentValue: parseFloat(result.rows[0].presentValue),
        gainLoss: parseFloat(result.rows[0].gainLoss),
        peRatio: parseFloat(result.rows[0].peRatio) || 0,
        latestEarnings: parseFloat(result.rows[0].latestEarnings) || 0,
        sector: result.rows[0].sector,
        purchaseDate: result.rows[0].createdAt ? new Date(result.rows[0].createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        lastUpdated: new Date().toISOString(),
        createdAt: result.rows[0].createdAt,
        updatedAt: result.rows[0].updatedAt
      };
      
      logger.info(`Created new stock: ${newStock.stockName} (${symbol}) with live market data`);

      res.status(201).json({
        success: true,
        data: newStock,
        message: 'Stock added to portfolio successfully with live market data'
      });
    } catch (error) {
      logger.error('Error creating stock:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add stock to portfolio',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Update stock (Not implemented in live data demo)
   */
  static async updateStock(req: Request, res: Response): Promise<void> {
    res.status(501).json({
      success: false,
      message: 'Stock update not implemented in live data demo',
      note: 'Focus is on live data fetching from external APIs'
    });
  }

  /**
   * Delete stock holding from portfolio
   */
  static async deleteStock(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      if (!id) {
        res.status(400).json({
          success: false,
          message: 'Stock ID is required'
        });
        return;
      }

      // First, check if the stock exists
      const checkResult = await Database.query(`
        SELECT id, stock_name as "stockName", quantity, investment
        FROM stocks WHERE id = $1
      `, [id]);
      
      if (checkResult.rows.length === 0) {
        res.status(404).json({
          success: false,
          message: `Stock with ID ${id} not found`
        });
        return;
      }

      const stock = checkResult.rows[0];
      
      // Delete the stock from database
      await Database.query('DELETE FROM stocks WHERE id = $1', [id]);
      
      // Recalculate portfolio percentages for remaining stocks
      await StockController.recalculatePortfolioPercentages();
      
      logger.info(`Deleted stock holding: ${stock.stockName} (Qty: ${stock.quantity}, Investment: ₹${stock.investment})`);

      res.json({
        success: true,
        message: 'Stock holding removed from portfolio successfully',
        data: { 
          id: stock.id, 
          stockName: stock.stockName,
          quantity: stock.quantity,
          investment: stock.investment
        }
      });
    } catch (error) {
      logger.error(`Error deleting stock ${req.params.id}:`, error);
      res.status(500).json({
        success: false,
        message: 'Failed to remove stock holding',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Recalculate portfolio percentages after stock deletion
   */
  private static async recalculatePortfolioPercentages(): Promise<void> {
    try {
      // Get total investment
      const totalResult = await Database.query('SELECT SUM(investment) as total FROM stocks');
      const totalInvestment = parseFloat(totalResult.rows[0]?.total || '0');
      
      if (totalInvestment > 0) {
        // Update each stock's portfolio percentage
        await Database.query(`
          UPDATE stocks 
          SET portfolio_percentage = ROUND((investment / $1 * 100)::numeric, 2),
              updated_at = NOW()
        `, [totalInvestment]);
        
        logger.info('Recalculated portfolio percentages after stock deletion');
      }
    } catch (error) {
      logger.error('Error recalculating portfolio percentages:', error);
    }
  }

  /**
   * Search stocks by name for autocomplete
   */
  static async searchStocks(req: Request, res: Response): Promise<void> {
    try {
      const { q } = req.query;
      
      if (!q || typeof q !== 'string' || q.length < 2) {
        res.status(400).json({
          success: false,
          message: 'Search query must be at least 2 characters'
        });
        return;
      }

      const query = q.toLowerCase().trim();
      
      // Common Indian stocks with their symbols for autocomplete
      const indianStocks = [
        { name: 'Reliance Industries Ltd', symbol: 'RELIANCE.NS', exchange: 'NSE', sector: 'Energy' },
        { name: 'Tata Consultancy Services Ltd', symbol: 'TCS.NS', exchange: 'NSE', sector: 'Technology' },
        { name: 'HDFC Bank Ltd', symbol: 'HDFCBANK.NS', exchange: 'NSE', sector: 'Financials' },
        { name: 'Infosys Ltd', symbol: 'INFY.NS', exchange: 'NSE', sector: 'Technology' },
        { name: 'ITC Ltd', symbol: 'ITC.NS', exchange: 'NSE', sector: 'Consumer Goods' },
        { name: 'State Bank of India', symbol: 'SBIN.NS', exchange: 'NSE', sector: 'Financials' },
        { name: 'Bharti Airtel Ltd', symbol: 'BHARTIARTL.NS', exchange: 'NSE', sector: 'Telecommunications' },
        { name: 'Kotak Mahindra Bank Ltd', symbol: 'KOTAKBANK.NS', exchange: 'NSE', sector: 'Financials' },
        { name: 'Hindustan Unilever Ltd', symbol: 'HINDUNILVR.NS', exchange: 'NSE', sector: 'Consumer Goods' },
        { name: 'Larsen & Toubro Ltd', symbol: 'LT.NS', exchange: 'NSE', sector: 'Industrials' },
        { name: 'ICICI Bank Ltd', symbol: 'ICICIBANK.NS', exchange: 'NSE', sector: 'Financials' },
        { name: 'Wipro Ltd', symbol: 'WIPRO.NS', exchange: 'NSE', sector: 'Technology' },
        { name: 'Maruti Suzuki India Ltd', symbol: 'MARUTI.NS', exchange: 'NSE', sector: 'Auto' },
        { name: 'Asian Paints Ltd', symbol: 'ASIANPAINT.NS', exchange: 'NSE', sector: 'Materials' },
        { name: 'Bajaj Finance Ltd', symbol: 'BAJFINANCE.NS', exchange: 'NSE', sector: 'Financials' },
        { name: 'HCL Technologies Ltd', symbol: 'HCLTECH.NS', exchange: 'NSE', sector: 'Technology' },
        { name: 'Axis Bank Ltd', symbol: 'AXISBANK.NS', exchange: 'NSE', sector: 'Financials' },
        { name: 'Mahindra & Mahindra Ltd', symbol: 'M&M.NS', exchange: 'NSE', sector: 'Auto' },
        { name: 'Sun Pharmaceutical Industries Ltd', symbol: 'SUNPHARMA.NS', exchange: 'NSE', sector: 'Healthcare' },
        { name: 'Bajaj Auto Ltd', symbol: 'BAJAJ-AUTO.NS', exchange: 'NSE', sector: 'Auto' },
        { name: 'Adani Enterprises Ltd', symbol: 'ADANIENT.NS', exchange: 'NSE', sector: 'Energy' },
        { name: 'Tata Motors Ltd', symbol: 'TATAMOTORS.NS', exchange: 'NSE', sector: 'Auto' },
        { name: 'Tech Mahindra Ltd', symbol: 'TECHM.NS', exchange: 'NSE', sector: 'Technology' },
        { name: 'Power Grid Corporation of India Ltd', symbol: 'POWERGRID.NS', exchange: 'NSE', sector: 'Utilities' },
        { name: 'Nestle India Ltd', symbol: 'NESTLEIND.NS', exchange: 'NSE', sector: 'Consumer Goods' }
      ];
      
      // Filter stocks based on search query
      const filteredStocks = indianStocks.filter(stock => 
        stock.name.toLowerCase().includes(query) ||
        stock.symbol.toLowerCase().includes(query)
      ).slice(0, 10); // Limit to 10 results
      
      logger.info(`Stock search for "${query}" returned ${filteredStocks.length} results`);

      res.json({
        success: true,
        data: filteredStocks,
        message: `Found ${filteredStocks.length} stocks matching "${q}"`
      });
    } catch (error) {
      logger.error('Error searching stocks:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to search stocks',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Refresh market data for a specific stock
   */
  static async refreshStockData(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      if (!id) {
        res.status(400).json({
          success: false,
          message: 'Stock ID is required'
        });
        return;
      }

      // Get stock from database
      const result = await Database.query(`
        SELECT id, stock_name as "stockName", stock_exchange_code as "stockExchangeCode"
        FROM stocks WHERE id = $1
      `, [id]);
      
      if (result.rows.length === 0) {
        res.status(404).json({
          success: false,
          message: `Stock with ID ${id} not found`
        });
        return;
      }

      const row = result.rows[0];
      const symbol = StockController.extractStockSymbol(row.stockName);
      
      // Force refresh market data
      const marketData = await marketDataService.refreshSymbol(symbol, row.stockExchangeCode);
      
      if (marketData) {
        // Update database with fresh market data
        await Database.query(`
          UPDATE stocks 
          SET current_market_price = $1, pe_ratio = $2, latest_earnings = $3, updated_at = NOW()
          WHERE id = $4
        `, [marketData.currentPrice, marketData.peRatio, marketData.latestEarnings, id]);
        
        logger.info(`Refreshed market data for ${row.stockName} (${symbol})`);

        res.json({
          success: true,
          data: {
            id: id,
            symbol: symbol,
            currentPrice: marketData.currentPrice,
            peRatio: marketData.peRatio,
            latestEarnings: marketData.latestEarnings,
            lastUpdated: marketData.lastUpdated
          },
          message: 'Market data refreshed successfully'
        });
      } else {
        res.status(404).json({
          success: false,
          message: `Failed to fetch market data for ${symbol}`
        });
      }
    } catch (error) {
      logger.error(`Error refreshing stock data ${req.params.id}:`, error);
      res.status(500).json({
        success: false,
        message: 'Failed to refresh stock data',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

export default StockController;