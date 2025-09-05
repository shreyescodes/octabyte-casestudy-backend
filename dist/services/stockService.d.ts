import { Stock, StockCreateRequest, StockUpdateRequest } from '../types';
export declare class StockService {
    static getAllStocks(): Promise<Stock[]>;
    static getStockById(id: string): Promise<Stock | null>;
    static createStock(stockData: StockCreateRequest): Promise<Stock>;
    static updateStock(id: string, stockData: StockUpdateRequest): Promise<Stock | null>;
    static deleteStock(id: string): Promise<boolean>;
    static getStocksBySector(sector: string): Promise<Stock[]>;
    private static recalculatePortfolioPercentages;
}
//# sourceMappingURL=stockService.d.ts.map