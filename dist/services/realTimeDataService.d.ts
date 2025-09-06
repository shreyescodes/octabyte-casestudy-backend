export interface RealTimeStockData {
    symbol: string;
    stockName: string;
    currentPrice: number;
    purchasePrice: number;
    purchaseDate: string;
    currency: string;
    peRatio?: number;
    latestEarnings?: number;
    change?: number;
    changePercent?: number;
    source: string;
    gainLoss: number;
    gainLossPercent: number;
}
declare class RealTimeDataService {
    getRealTimeStockData(symbol: string, stockName: string, exchange?: string): Promise<RealTimeStockData | null>;
    private getFallbackMarketData;
    private generateRealisticPurchasePrice;
    private generateRealisticPurchaseDate;
    private detectCurrency;
    private convertToINR;
    ensureCurrencyConsistency(symbol: string, price: number): Promise<number>;
    getBatchRealTimeData(stocksInfo: Array<{
        symbol: string;
        stockName: string;
        exchange?: string;
    }>): Promise<RealTimeStockData[]>;
    getPortfolioStatistics(stocksData: RealTimeStockData[]): {
        totalStocks: number;
        gainers: number;
        losers: number;
        neutral: number;
        avgGainLossPercent: number;
        maxGain: number;
        maxLoss: number;
        totalValue: number;
        totalInvestment: number;
        portfolioReturn: number;
    };
    refreshRealTimeData(stocksInfo: Array<{
        symbol: string;
        stockName: string;
        exchange?: string;
    }>): Promise<RealTimeStockData[]>;
    private delay;
    getMarketStatus(): Promise<{
        marketOpen: boolean;
        timestamp: string;
        currency: string;
        dataFreshness: string;
    }>;
}
export declare const realTimeDataService: RealTimeDataService;
export default realTimeDataService;
//# sourceMappingURL=realTimeDataService.d.ts.map