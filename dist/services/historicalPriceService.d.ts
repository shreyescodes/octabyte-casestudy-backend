export interface HistoricalPriceData {
    symbol: string;
    historicalPrice: number;
    currentPrice: number;
    purchaseDate: string;
    currency: string;
    source: string;
}
declare class HistoricalPriceService {
    getRealisticPurchasePrice(symbol: string): Promise<HistoricalPriceData | null>;
    private getFallbackPurchasePrice;
    private detectCurrency;
    private convertToINR;
    ensureCurrencyConsistency(symbol: string, price: number): Promise<number>;
    getBatchHistoricalPrices(symbols: string[]): Promise<Record<string, HistoricalPriceData | null>>;
    private delay;
    generatePortfolioStats(stocksData: HistoricalPriceData[]): {
        totalStocks: number;
        gainers: number;
        losers: number;
        avgGainLossPercent: number;
        maxGain: number;
        maxLoss: number;
    };
}
export declare const historicalPriceService: HistoricalPriceService;
export default historicalPriceService;
//# sourceMappingURL=historicalPriceService.d.ts.map