export interface Stock {
  id?: string;
  stockName: string;
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
  createdAt?: Date;
  updatedAt?: Date;
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
}

export interface PortfolioSnapshot {
  id?: string;
  totalInvestment: number;
  totalPresentValue: number;
  totalGainLoss: number;
  snapshotDate?: Date;
  createdAt?: Date;
}

export interface Sector {
  id?: string;
  name: string;
  description?: string;
  createdAt?: Date;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface StockCreateRequest {
  stockName: string;
  purchasePrice: number;
  quantity: number;
  stockExchangeCode: string;
  currentMarketPrice: number;
  peRatio?: number;
  latestEarnings?: number;
  sector: string;
}

export interface StockUpdateRequest {
  stockName?: string;
  purchasePrice?: number;
  quantity?: number;
  stockExchangeCode?: string;
  currentMarketPrice?: number;
  peRatio?: number;
  latestEarnings?: number;
  sector?: string;
}
