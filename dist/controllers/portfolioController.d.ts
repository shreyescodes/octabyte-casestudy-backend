import { Request, Response } from 'express';
declare class PortfolioController {
    static getPortfolioSummary(req: Request, res: Response): Promise<void>;
    static getSectorSummary(req: Request, res: Response): Promise<void>;
    static getPortfolioMetrics(req: Request, res: Response): Promise<void>;
    private static updateStockPrices;
    private static calculatePortfolioMetrics;
    static updateAllStockPrices(req: Request, res: Response): Promise<void>;
    private static extractStockSymbol;
    private static recalculatePortfolioPercentages;
}
export default PortfolioController;
//# sourceMappingURL=portfolioController.d.ts.map