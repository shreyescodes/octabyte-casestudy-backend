export declare class PriceUpdateService {
    private updateInterval;
    private readonly UPDATE_INTERVAL;
    private isUpdating;
    startAutoUpdate(): void;
    stopAutoUpdate(): void;
    updateAllStockPrices(): Promise<void>;
    updateStockPrice(stockId: string): Promise<boolean>;
    private extractStockSymbol;
    getStatus(): {
        isRunning: boolean;
        isUpdating: boolean;
        updateInterval: number;
        nextUpdate?: Date;
    };
}
export declare const priceUpdateService: PriceUpdateService;
export default priceUpdateService;
//# sourceMappingURL=priceUpdateService.d.ts.map