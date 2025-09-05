import { Request, Response } from 'express';
import { Stock, Portfolio, SectorSummary, PortfolioMetrics } from '../types/stock';
import marketDataService from '../services/marketDataService';
import { logger } from '../utils/logger';
import Database from '../config/database';

class PortfolioController {
  /**
   * Get portfolio summary with live market data
   */
  static async getPortfolioSummary(req: Request, res: Response): Promise<void> {
    try {
      logger.info('Fetching portfolio summary from database with live market data');
      
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
      
      if (result.rows.length === 0) {
        res.json({
          success: true,
          data: {
            totalInvestment: 0,
            totalPresentValue: 0,
            totalGainLoss: 0,
            stocks: []
          }
        });
        return;
      }

      // Convert database rows to Stock objects and fetch live market data
      const portfolioStocks: Stock[] = [];
      
      for (const row of result.rows) {
        // Extract symbol from stock name (first word or use a symbol mapping)
        const symbol = PortfolioController.extractStockSymbol(row.stockName);
        
        // Fetch live market data from external APIs
        logger.info(`Fetching live market data for ${row.stockName} (${symbol})`);
        const marketData = await marketDataService.getMarketData(symbol, row.stockExchangeCode);
        
        let currentMarketPrice = parseFloat(row.currentMarketPrice);
        let peRatio = row.peRatio ? parseFloat(row.peRatio) : undefined;
        let latestEarnings = row.latestEarnings ? parseFloat(row.latestEarnings) : undefined;
        
        // Use live data if available, otherwise fall back to database values
        if (marketData) {
          currentMarketPrice = marketData.currentPrice;
          peRatio = marketData.peRatio || peRatio;
          latestEarnings = marketData.latestEarnings || latestEarnings;
          
          // Update database with latest market data
          await Database.query(`
            UPDATE stocks 
            SET current_market_price = $1, pe_ratio = $2, latest_earnings = $3, updated_at = NOW()
            WHERE id = $4
          `, [currentMarketPrice, peRatio, latestEarnings, row.id]);
        }
        
        // Calculate derived values with live data
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
        
        portfolioStocks.push(stock);
      }
      
      const updatedStocks = portfolioStocks;
      
      // Calculate portfolio metrics
      const portfolio = PortfolioController.calculatePortfolioMetrics(updatedStocks);
      
      res.json({
        success: true,
        data: portfolio
      });
    } catch (error) {
      logger.error('Error fetching portfolio summary:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch portfolio summary',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get sector-wise summary
   */
  static async getSectorSummary(req: Request, res: Response): Promise<void> {
    try {
      logger.info('Fetching sector summary from database');
      
      // Fetch stocks from database
      const result = await Database.query(`
        SELECT id, stock_name as "stockName", purchase_price as "purchasePrice", 
               quantity, investment, portfolio_percentage as "portfolioPercentage",
               stock_exchange_code as "stockExchangeCode", current_market_price as "currentMarketPrice",
               present_value as "presentValue", gain_loss as "gainLoss",
               pe_ratio as "peRatio", latest_earnings as "latestEarnings", sector,
               created_at as "createdAt", updated_at as "updatedAt"
        FROM stocks ORDER BY sector, created_at DESC
      `);
      
      if (result.rows.length === 0) {
        res.json({
          success: true,
          data: []
        });
        return;
      }

      // Convert database rows to Stock objects and fetch live market data
      const portfolioStocks: Stock[] = [];
      
      for (const row of result.rows) {
        // Extract symbol from stock name
        const symbol = PortfolioController.extractStockSymbol(row.stockName);
        
        // Fetch live market data from external APIs
        logger.info(`Fetching live market data for ${row.stockName} (${symbol})`);
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
        
        // Calculate derived values with live data
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
        
        portfolioStocks.push(stock);
      }
      
      const updatedStocks = portfolioStocks;
      
      // Group by sector
      const sectorMap = new Map<string, Stock[]>();
      updatedStocks.forEach(stock => {
        if (!sectorMap.has(stock.sector)) {
          sectorMap.set(stock.sector, []);
        }
        sectorMap.get(stock.sector)!.push(stock);
      });
      
      // Calculate sector summaries
      const sectorSummaries: SectorSummary[] = Array.from(sectorMap.entries()).map(([sector, stocks]) => {
        const totalInvestment = stocks.reduce((sum, stock) => sum + stock.investment, 0);
        const totalPresentValue = stocks.reduce((sum, stock) => sum + stock.presentValue, 0);
        const totalGainLoss = totalPresentValue - totalInvestment;
        const gainLossPercentage = totalInvestment > 0 ? (totalGainLoss / totalInvestment) * 100 : 0;
        
        return {
          sector,
          totalInvestment,
          totalPresentValue,
          totalGainLoss,
          stocks,
          stockCount: stocks.length,
          gainLossPercentage
        };
      });
      
      res.json({
        success: true,
        data: sectorSummaries
      });
    } catch (error) {
      logger.error('Error fetching sector summary:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch sector summary',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get portfolio metrics and analytics
   */
  static async getPortfolioMetrics(req: Request, res: Response): Promise<void> {
    try {
      logger.info('Fetching portfolio metrics from database');
      
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
      
      if (result.rows.length === 0) {
        res.json({
          success: true,
          data: {
            totalStocks: 0,
            totalSectors: 0,
            bestPerformingStock: null,
            worstPerformingStock: null,
            topSectorByValue: null
          }
        });
        return;
      }
      
      // Convert database rows to Stock objects and fetch live market data
      const portfolioStocks: Stock[] = [];
      
      for (const row of result.rows) {
        // Extract symbol from stock name
        const symbol = PortfolioController.extractStockSymbol(row.stockName);
        
        // Fetch FRESH live market data from external APIs for analytics
        logger.info(`Fetching live analytics data for ${row.stockName} (${symbol})`);
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
        
        // Calculate derived values with live data
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
        
        portfolioStocks.push(stock);
      }
      
      // Calculate metrics
      const totalStocks = portfolioStocks.length;
      const sectors = new Set(portfolioStocks.map(stock => stock.sector));
      const totalSectors = sectors.size;
      
      // Find best and worst performing stocks
      const stocksWithGainPercent = portfolioStocks.map(stock => ({
        ...stock,
        gainPercentage: stock.investment > 0 ? (stock.gainLoss / stock.investment) * 100 : 0
      }));
      
      const bestPerformingStock = stocksWithGainPercent.reduce((best, current) => 
        current.gainPercentage > best.gainPercentage ? current : best
      );
      
      const worstPerformingStock = stocksWithGainPercent.reduce((worst, current) => 
        current.gainPercentage < worst.gainPercentage ? current : worst
      );
      
      // Find top sector by value
      const sectorValues = new Map<string, number>();
      portfolioStocks.forEach(stock => {
        const currentValue = sectorValues.get(stock.sector) || 0;
        sectorValues.set(stock.sector, currentValue + stock.presentValue);
      });
      
      const topSectorByValue = Array.from(sectorValues.entries())
        .reduce((top, [sector, value]) => 
          value > (top?.value || 0) ? { sector, value } : top
        , null as { sector: string; value: number } | null);
      
      // Calculate comprehensive portfolio metrics with LIVE data
      const totalInvestment = portfolioStocks.reduce((sum, stock) => sum + stock.investment, 0);
      const totalPresentValue = portfolioStocks.reduce((sum, stock) => sum + stock.presentValue, 0);
      const totalReturn = totalPresentValue - totalInvestment;
      const totalReturnPercentage = totalInvestment > 0 ? (totalReturn / totalInvestment) * 100 : 0;
      
      // Calculate average P/E with live data
      const validPERatios = portfolioStocks.filter(stock => stock.peRatio > 0).map(stock => stock.peRatio);
      const averagePE = validPERatios.length > 0 ? validPERatios.reduce((sum, pe) => sum + pe, 0) / validPERatios.length : 0;
      
      // Calculate diversification metrics
      const largestSectorWeight = Math.max(...Array.from(sectorValues.values()).map(value => (value / totalPresentValue) * 100));
      const concentration = largestSectorWeight > 50 ? 'High' : largestSectorWeight > 30 ? 'Medium' : 'Low';
      
      logger.info(`Live Portfolio Analytics: Total Return ₹${totalReturn.toFixed(2)} (${totalReturnPercentage.toFixed(2)}%), Avg P/E: ${averagePE.toFixed(2)}`);
      
      const metrics = {
        totalReturn,
        totalReturnPercentage,
        dayGain: totalReturn, // Using total return as day gain
        dayGainPercentage: totalReturnPercentage,
        bestPerformer: bestPerformingStock.gainPercentage > 0 ? {
          stock: {
            id: bestPerformingStock.id,
            stockName: bestPerformingStock.stockName,
            symbol: bestPerformingStock.symbol,
            currentMarketPrice: bestPerformingStock.currentMarketPrice,
            gainLoss: bestPerformingStock.gainLoss,
            sector: bestPerformingStock.sector,
            purchasePrice: bestPerformingStock.purchasePrice,
            quantity: bestPerformingStock.quantity,
            investment: bestPerformingStock.investment,
            portfolioPercentage: bestPerformingStock.portfolioPercentage,
            stockExchangeCode: bestPerformingStock.stockExchangeCode,
            presentValue: bestPerformingStock.presentValue,
            peRatio: bestPerformingStock.peRatio,
            latestEarnings: bestPerformingStock.latestEarnings,
            purchaseDate: bestPerformingStock.purchaseDate,
            lastUpdated: bestPerformingStock.lastUpdated,
            createdAt: bestPerformingStock.createdAt,
            updatedAt: bestPerformingStock.updatedAt
          },
          gainPercentage: bestPerformingStock.gainPercentage
        } : null,
        worstPerformer: worstPerformingStock.gainPercentage < 0 ? {
          stock: {
            id: worstPerformingStock.id,
            stockName: worstPerformingStock.stockName,
            symbol: worstPerformingStock.symbol,
            currentMarketPrice: worstPerformingStock.currentMarketPrice,
            gainLoss: worstPerformingStock.gainLoss,
            sector: worstPerformingStock.sector,
            purchasePrice: worstPerformingStock.purchasePrice,
            quantity: worstPerformingStock.quantity,
            investment: worstPerformingStock.investment,
            portfolioPercentage: worstPerformingStock.portfolioPercentage,
            stockExchangeCode: worstPerformingStock.stockExchangeCode,
            presentValue: worstPerformingStock.presentValue,
            peRatio: worstPerformingStock.peRatio,
            latestEarnings: worstPerformingStock.latestEarnings,
            purchaseDate: worstPerformingStock.purchaseDate,
            lastUpdated: worstPerformingStock.lastUpdated,
            createdAt: worstPerformingStock.createdAt,
            updatedAt: worstPerformingStock.updatedAt
          },
          lossPercentage: Math.abs(worstPerformingStock.gainPercentage)
        } : null,
        diversification: {
          sectorCount: totalSectors,
          largestSectorWeight,
          concentration: concentration as 'Low' | 'Medium' | 'High'
        },
        averagePE,
        totalDividendYield: 0 // Can be enhanced with dividend data
      };
      
      res.json({
        success: true,
        data: metrics
      });
    } catch (error) {
      logger.error('Error fetching portfolio metrics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch portfolio metrics',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Update stock prices using market data service
   */
  private static async updateStockPrices(stocks: Stock[]): Promise<Stock[]> {
    try {
      const symbols = stocks.map(stock => stock.symbol);
      const marketDataMap = await marketDataService.getBatchMarketData(symbols, 'NSE');
      
      return stocks.map(stock => {
        const marketData = marketDataMap[stock.symbol];
        if (marketData) {
          const updatedStock = {
            ...stock,
            currentMarketPrice: marketData.currentPrice,
            peRatio: marketData.peRatio || stock.peRatio,
            latestEarnings: marketData.latestEarnings || stock.latestEarnings,
            lastUpdated: marketData.lastUpdated
          };
          
          // Recalculate derived values
          updatedStock.presentValue = updatedStock.currentMarketPrice * updatedStock.quantity;
          updatedStock.gainLoss = updatedStock.presentValue - updatedStock.investment;
          
          return updatedStock;
        }
        return stock;
      });
    } catch (error) {
      logger.error('Error updating stock prices:', error);
      return stocks; // Return original stocks if update fails
    }
  }

  /**
   * Calculate portfolio metrics
   */
  private static calculatePortfolioMetrics(stocks: Stock[]): Portfolio {
    const totalInvestment = stocks.reduce((sum, stock) => sum + stock.investment, 0);
    const totalPresentValue = stocks.reduce((sum, stock) => sum + stock.presentValue, 0);
    const totalGainLoss = totalPresentValue - totalInvestment;
    
    // Update portfolio percentages
    const updatedStocks = stocks.map(stock => ({
      ...stock,
      portfolioPercentage: totalInvestment > 0 ? (stock.investment / totalInvestment) * 100 : 0
    }));
    
    return {
      totalInvestment,
      totalPresentValue,
      totalGainLoss,
      stocks: updatedStocks
    };
  }

  /**
   * Update all stock prices manually
   */
  static async updateAllStockPrices(req: Request, res: Response): Promise<void> {
    try {
      logger.info('Manually updating all stock prices in database');
      
      // Fetch all stocks from database
      const result = await Database.query(`
        SELECT id, stock_name as "stockName", stock_exchange_code as "stockExchangeCode", 
               purchase_price as "purchasePrice", quantity
        FROM stocks
      `);
      
      if (result.rows.length === 0) {
        res.json({
          success: true,
          message: 'No stocks found to update',
          data: { updatedCount: 0, timestamp: new Date().toISOString() }
        });
        return;
      }

      let updatedCount = 0;
      const timestamp = new Date().toISOString();

      // Update each stock's price
      for (const row of result.rows) {
        try {
          // Extract symbol from stock name (first word)
          const symbol = row.stockName.split(' ')[0].toUpperCase();
          const marketData = await marketDataService.getMarketData(symbol, row.stockExchangeCode);
          
          if (marketData) {
            const newPresentValue = marketData.currentPrice * parseInt(row.quantity);
            const newGainLoss = newPresentValue - (parseFloat(row.purchasePrice) * parseInt(row.quantity));
            
            await Database.query(`
              UPDATE stocks 
              SET current_market_price = $1, 
                  present_value = $2, 
                  gain_loss = $3,
                  pe_ratio = $4,
                  latest_earnings = $5,
                  updated_at = $6
              WHERE id = $7
            `, [
              marketData.currentPrice,
              newPresentValue,
              newGainLoss,
              marketData.peRatio || null,
              marketData.latestEarnings || null,
              timestamp,
              row.id
            ]);
            updatedCount++;
          }
        } catch (error) {
          logger.warn(`Failed to update price for ${row.stockName}:`, error);
        }
      }

      // Recalculate portfolio percentages
      await PortfolioController.recalculatePortfolioPercentages();
      
      res.json({
        success: true,
        message: 'Stock prices updated successfully',
        data: {
          updatedCount,
          totalStocks: result.rows.length,
          timestamp
        }
      });
    } catch (error) {
      logger.error('Error updating stock prices:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update stock prices',
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
   * Recalculate portfolio percentages
   */
  private static async recalculatePortfolioPercentages(): Promise<void> {
    try {
      // Get total investment
      const totalResult = await Database.query('SELECT SUM(investment) as total FROM stocks');
      const totalInvestment = parseFloat(totalResult.rows[0]?.total || '0');
      
      if (totalInvestment > 0) {
        await Database.query(`
          UPDATE stocks 
          SET portfolio_percentage = (investment / $1) * 100,
              updated_at = NOW()
        `, [totalInvestment]);
      }
    } catch (error) {
      logger.error('Error recalculating portfolio percentages:', error);
    }
  }
}

export default PortfolioController;