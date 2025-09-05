import { Request, Response } from 'express';
declare class StockController {
    static getAllStocks(req: Request, res: Response): Promise<void>;
    private static extractStockSymbol;
    static getStockById(req: Request, res: Response): Promise<void>;
    static createStock(req: Request, res: Response): Promise<void>;
    static updateStock(req: Request, res: Response): Promise<void>;
    static deleteStock(req: Request, res: Response): Promise<void>;
    private static recalculatePortfolioPercentages;
    static searchStocks(req: Request, res: Response): Promise<void>;
    static refreshStockData(req: Request, res: Response): Promise<void>;
}
export default StockController;
//# sourceMappingURL=stockController.d.ts.map