import Database from '../config/database';
import { Stock, StockCreateRequest, StockUpdateRequest } from '../types';

export class StockService {
  static async getAllStocks(): Promise<Stock[]> {
    const result = await Database.query(`
      SELECT 
        id,
        stock_name as "stockName",
        purchase_price as "purchasePrice",
        quantity,
        investment,
        portfolio_percentage as "portfolioPercentage",
        stock_exchange_code as "stockExchangeCode",
        current_market_price as "currentMarketPrice",
        present_value as "presentValue",
        gain_loss as "gainLoss",
        pe_ratio as "peRatio",
        latest_earnings as "latestEarnings",
        sector,
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM stocks 
      ORDER BY created_at DESC
    `);
    return result.rows;
  }

  static async getStockById(id: string): Promise<Stock | null> {
    const result = await Database.query(`
      SELECT 
        id,
        stock_name as "stockName",
        purchase_price as "purchasePrice",
        quantity,
        investment,
        portfolio_percentage as "portfolioPercentage",
        stock_exchange_code as "stockExchangeCode",
        current_market_price as "currentMarketPrice",
        present_value as "presentValue",
        gain_loss as "gainLoss",
        pe_ratio as "peRatio",
        latest_earnings as "latestEarnings",
        sector,
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM stocks 
      WHERE id = $1
    `, [id]);
    
    return result.rows[0] || null;
  }

  static async createStock(stockData: StockCreateRequest): Promise<Stock> {
    // Calculate derived values
    const investment = stockData.purchasePrice * stockData.quantity;
    const presentValue = stockData.currentMarketPrice * stockData.quantity;
    const gainLoss = presentValue - investment;

    const result = await Database.query(`
      INSERT INTO stocks (
        stock_name, purchase_price, quantity, investment,
        stock_exchange_code, current_market_price, present_value, gain_loss,
        pe_ratio, latest_earnings, sector
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING 
        id,
        stock_name as "stockName",
        purchase_price as "purchasePrice",
        quantity,
        investment,
        portfolio_percentage as "portfolioPercentage",
        stock_exchange_code as "stockExchangeCode",
        current_market_price as "currentMarketPrice",
        present_value as "presentValue",
        gain_loss as "gainLoss",
        pe_ratio as "peRatio",
        latest_earnings as "latestEarnings",
        sector,
        created_at as "createdAt",
        updated_at as "updatedAt"
    `, [
      stockData.stockName,
      stockData.purchasePrice,
      stockData.quantity,
      investment,
      stockData.stockExchangeCode,
      stockData.currentMarketPrice,
      presentValue,
      gainLoss,
      stockData.peRatio || null,
      stockData.latestEarnings || null,
      stockData.sector
    ]);

    // Recalculate portfolio percentages after adding new stock
    await this.recalculatePortfolioPercentages();

    return result.rows[0];
  }

  static async updateStock(id: string, stockData: StockUpdateRequest): Promise<Stock | null> {
    const currentStock = await this.getStockById(id);
    if (!currentStock) return null;

    // Merge current data with updates
    const updatedData = { ...currentStock, ...stockData };

    // Recalculate derived values if necessary
    if (stockData.purchasePrice !== undefined || stockData.quantity !== undefined) {
      updatedData.investment = updatedData.purchasePrice * updatedData.quantity;
    }
    
    if (stockData.currentMarketPrice !== undefined || stockData.quantity !== undefined) {
      updatedData.presentValue = updatedData.currentMarketPrice * updatedData.quantity;
    }
    
    updatedData.gainLoss = updatedData.presentValue - updatedData.investment;

    const result = await Database.query(`
      UPDATE stocks SET
        stock_name = $1,
        purchase_price = $2,
        quantity = $3,
        investment = $4,
        stock_exchange_code = $5,
        current_market_price = $6,
        present_value = $7,
        gain_loss = $8,
        pe_ratio = $9,
        latest_earnings = $10,
        sector = $11
      WHERE id = $12
      RETURNING 
        id,
        stock_name as "stockName",
        purchase_price as "purchasePrice",
        quantity,
        investment,
        portfolio_percentage as "portfolioPercentage",
        stock_exchange_code as "stockExchangeCode",
        current_market_price as "currentMarketPrice",
        present_value as "presentValue",
        gain_loss as "gainLoss",
        pe_ratio as "peRatio",
        latest_earnings as "latestEarnings",
        sector,
        created_at as "createdAt",
        updated_at as "updatedAt"
    `, [
      updatedData.stockName,
      updatedData.purchasePrice,
      updatedData.quantity,
      updatedData.investment,
      updatedData.stockExchangeCode,
      updatedData.currentMarketPrice,
      updatedData.presentValue,
      updatedData.gainLoss,
      updatedData.peRatio,
      updatedData.latestEarnings,
      updatedData.sector,
      id
    ]);

    // Recalculate portfolio percentages after updating stock
    await this.recalculatePortfolioPercentages();

    return result.rows[0];
  }

  static async deleteStock(id: string): Promise<boolean> {
    const result = await Database.query('DELETE FROM stocks WHERE id = $1', [id]);
    
    if (result.rowCount > 0) {
      // Recalculate portfolio percentages after deleting stock
      await this.recalculatePortfolioPercentages();
      return true;
    }
    
    return false;
  }

  static async getStocksBySector(sector: string): Promise<Stock[]> {
    const result = await Database.query(`
      SELECT 
        id,
        stock_name as "stockName",
        purchase_price as "purchasePrice",
        quantity,
        investment,
        portfolio_percentage as "portfolioPercentage",
        stock_exchange_code as "stockExchangeCode",
        current_market_price as "currentMarketPrice",
        present_value as "presentValue",
        gain_loss as "gainLoss",
        pe_ratio as "peRatio",
        latest_earnings as "latestEarnings",
        sector,
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM stocks 
      WHERE sector = $1
      ORDER BY investment DESC
    `, [sector]);
    
    return result.rows;
  }

  private static async recalculatePortfolioPercentages(): Promise<void> {
    // Get total investment
    const totalResult = await Database.query('SELECT SUM(investment) as total FROM stocks');
    const totalInvestment = totalResult.rows[0]?.total || 0;

    if (totalInvestment > 0) {
      // Update portfolio percentages
      await Database.query(`
        UPDATE stocks 
        SET portfolio_percentage = (investment / $1) * 100
      `, [totalInvestment]);
    }
  }
}
