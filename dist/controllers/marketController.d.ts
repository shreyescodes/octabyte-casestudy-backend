import { Request, Response } from 'express';
export declare class MarketController {
    static searchStock(req: Request, res: Response): Promise<void>;
    static getCurrentPrice(req: Request, res: Response): Promise<void>;
    static getMarketData(req: Request, res: Response): Promise<void>;
    static updateAllPrices(req: Request, res: Response): Promise<void>;
    static updateStockPrice(req: Request, res: Response): Promise<void>;
    static getServiceStatus(req: Request, res: Response): Promise<void>;
    static getPopularStocks(req: Request, res: Response): Promise<void>;
    static getMarketInfo(req: Request, res: Response): Promise<void>;
    static browseStocks(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=marketController.d.ts.map