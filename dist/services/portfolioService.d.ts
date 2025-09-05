import { Stock, Portfolio, SectorSummary } from '../types/stock';
export declare class PortfolioService {
    static getAllStocks(): Promise<Stock[]>;
    static getPortfolioSummary(): Promise<Portfolio>;
    static getSectorSummary(): Promise<SectorSummary[]>;
    static createStock(stockData: any): Promise<Stock>;
    static updateStock(id: string, updates: any): Promise<Stock>;
    static deleteStock(id: string): Promise<boolean>;
    static getStockById(id: string): Promise<Stock | null>;
}
export default PortfolioService;
//# sourceMappingURL=portfolioService.d.ts.map