export interface Stock {
  id: string;
  stockName: string;
  symbol: string;
  purchasePrice: number;
  quantity: number;
  investment: number;
  portfolioPercentage: number;
  stockExchangeCode: string;
  currentMarketPrice: number;
  presentValue: number;
  gainLoss: number;
  peRatio: number;
  latestEarnings: number;
  sector: string;
  purchaseDate: string;
  lastUpdated: string;
  createdAt: string;
  updatedAt: string;
}

export interface StockCreateRequest {
  stockName: string;
  symbol: string;
  purchasePrice: number;
  quantity: number;
  stockExchangeCode: string;
  sector: string;
  purchaseDate: string;
}

export interface StockUpdateRequest {
  stockName?: string;
  symbol?: string;
  purchasePrice?: number;
  quantity?: number;
  stockExchangeCode?: string;
  sector?: string;
}

export interface MarketData {
  symbol: string;
  currentPrice: number;
  change?: number;
  changePercent?: number;
  peRatio?: number;
  latestEarnings?: number;
  lastUpdated: string;
  source: 'yahoo' | 'google' | 'fallback';
}

export interface Portfolio {
  totalInvestment: number;
  totalPresentValue: number;
  totalGainLoss: number;
  stocks: Stock[];
}

export interface SectorSummary {
  sector: string;
  totalInvestment: number;
  totalPresentValue: number;
  totalGainLoss: number;
  stocks: Stock[];
  stockCount: number;
  gainLossPercentage: number;
}

export interface PortfolioMetrics {
  totalReturn: number;
  totalReturnPercentage: number;
  dayGain: number;
  dayGainPercentage: number;
  bestPerformer: {
    stock: Stock;
    gainPercentage: number;
  } | null;
  worstPerformer: {
    stock: Stock;
    lossPercentage: number;
  } | null;
  diversification: {
    sectorCount: number;
    largestSectorWeight: number;
    concentration: 'Low' | 'Medium' | 'High';
  };
  averagePE: number;
  totalDividendYield: number;
}
