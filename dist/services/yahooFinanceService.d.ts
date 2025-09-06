import { MarketData } from '../types/stock';
declare class YahooFinanceService {
    private readonly maxRetries;
    private readonly retryDelay;
    getCurrentPrice(symbol: string): Promise<number | null>;
    getHistoricalPrice(symbol: string, monthsAgo?: number): Promise<number | null>;
    getMarketData(symbol: string): Promise<MarketData | null>;
    getBatchMarketData(symbols: string[]): Promise<Record<string, MarketData | null>>;
    searchSymbol(companyName: string): Promise<string[]>;
    private getQuoteWithRetry;
    private delay;
    isServiceAvailable(): Promise<boolean>;
}
export declare const yahooFinanceService: YahooFinanceService;
export default yahooFinanceService;
//# sourceMappingURL=yahooFinanceService.d.ts.map