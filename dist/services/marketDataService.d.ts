import { MarketData } from '../types/stock';
declare class MarketDataService {
    private cache;
    private readonly defaultCacheTTL;
    private readonly fallbackCacheTTL;
    getMarketData(symbol: string, exchange?: string, forceRefresh?: boolean): Promise<MarketData | null>;
    getCurrentPrice(symbol: string, exchange?: string): Promise<number | null>;
    getBatchMarketData(symbols: string[], exchange?: string): Promise<Record<string, MarketData | null>>;
    private tryYahooFinance;
    private tryGoogleFinance;
    private getCachedData;
    private getStaleData;
    private isDataFresh;
    private cacheData;
    private cleanupCache;
    getCacheStats(): {
        totalEntries: number;
        freshEntries: number;
        staleEntries: number;
    };
    checkServiceHealth(): Promise<{
        yahoo: boolean;
        google: boolean;
        cache: {
            totalEntries: number;
            freshEntries: number;
            staleEntries: number;
        };
    }>;
    private delay;
    refreshSymbol(symbol: string, exchange?: string): Promise<MarketData | null>;
    preloadSymbols(symbols: string[], exchange?: string): Promise<void>;
    clearCache(): void;
}
declare const marketDataService: MarketDataService;
export { marketDataService };
export default marketDataService;
//# sourceMappingURL=marketDataService.d.ts.map