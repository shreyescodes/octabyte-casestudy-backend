import { MarketData } from '../types/stock';
declare class GoogleFinanceService {
    private readonly baseUrl;
    private readonly maxRetries;
    private readonly retryDelay;
    getCurrentPrice(symbol: string, exchange?: string): Promise<number | null>;
    getFinancialData(symbol: string, exchange?: string): Promise<{
        peRatio?: number;
        latestEarnings?: number;
    } | null>;
    getMarketData(symbol: string, exchange?: string): Promise<MarketData | null>;
    getBatchMarketData(symbols: string[], exchange?: string): Promise<Record<string, MarketData | null>>;
    private scrapeGoogleFinance;
    private delay;
    isServiceAvailable(): Promise<boolean>;
    private formatSymbolForExchange;
}
export declare const googleFinanceService: GoogleFinanceService;
export default googleFinanceService;
//# sourceMappingURL=googleFinanceService.d.ts.map