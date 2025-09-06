export interface ListedStock {
    symbol: string;
    name: string;
    sector: string;
    exchange: string;
    marketCap?: number;
    lastPrice?: number;
    industry?: string;
    isin?: string;
}
export interface StockSearchResult {
    symbol: string;
    name: string;
    sector: string;
    exchange: string;
    currentPrice?: number;
    available: boolean;
    marketCap?: number;
    industry?: string;
}
declare class StockExchangeService {
    private stockListCache;
    private lastCacheUpdate;
    private readonly CACHE_DURATION;
    getAllListedStocks(forceRefresh?: boolean): Promise<ListedStock[]>;
    searchStocks(query: string, limit?: number): Promise<StockSearchResult[]>;
    getStockSuggestions(options?: {
        sector?: string;
        exchange?: string;
        minMarketCap?: number;
        maxMarketCap?: number;
        limit?: number;
    }): Promise<StockSearchResult[]>;
    private fetchNSEStocks;
    private fetchBSEStocks;
    private fetchUSStocks;
    private enrichNSEStocks;
    private getNSEFallbackList;
    private getBSEFallbackList;
    private getUSFallbackList;
    private removeDuplicates;
    private isCacheValid;
    getCacheStats(): {
        totalStocks: number;
        lastUpdated: Date | null;
        isValid: boolean;
        exchanges: string[];
    };
    refreshCache(): Promise<void>;
}
export declare const stockExchangeService: StockExchangeService;
export default stockExchangeService;
//# sourceMappingURL=stockExchangeService.d.ts.map