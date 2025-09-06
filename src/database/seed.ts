import Database from '../config/database';
import { realTimeDataService } from '../services/realTimeDataService';
import { logger } from '../utils/logger';

// Dynamic sample stocks - completely dynamic, market data and purchase prices fetched live
const sampleStockSymbols = [
  {
    symbol: "RELIANCE",
    stockName: "Reliance Industries Ltd",
    quantity: 10,
    stockExchangeCode: "NSE",
    sector: "Energy"
  },
  {
    symbol: "TCS",
    stockName: "Tata Consultancy Services Ltd",
    quantity: 8,
    stockExchangeCode: "NSE",
    sector: "Technology"
  },
  {
    symbol: "HDFCBANK",
    stockName: "HDFC Bank Ltd",
    quantity: 15,
    stockExchangeCode: "NSE",
    sector: "Finance"
  },
  {
    symbol: "INFY",
    stockName: "Infosys Ltd",
    quantity: 12,
    stockExchangeCode: "NSE",
    sector: "Technology"
  },
  {
    symbol: "ITC",
    stockName: "ITC Ltd",
    quantity: 50,
    stockExchangeCode: "NSE",
    sector: "Consumer Goods"
  }
];

async function seedDatabase() {
  try {
    console.log('Starting database seeding with live market data...');

    // Clear existing data
    await Database.query('DELETE FROM stocks');
    await Database.query('DELETE FROM portfolio_snapshots');

    console.log('🔄 Fetching live market data for sample stocks...');
    
    const stocksWithLiveData = [];
    let totalInvestment = 0;
    let totalPresentValue = 0;
    let totalGainLoss = 0;

    // Fetch REAL-TIME market data with realistic purchase scenarios
    console.log('🔴 Fetching LIVE real-time market data...');
    
    const realTimeStockData = await realTimeDataService.getBatchRealTimeData(
      sampleStockSymbols.map(stock => ({
        symbol: stock.symbol,
        stockName: stock.stockName,
        exchange: stock.stockExchangeCode
      }))
    );

    // Process each stock with real-time data
    for (const realTimeData of realTimeStockData) {
      console.log(`📊 Processing ${realTimeData.stockName} (${realTimeData.symbol})...`);
      
      try {
        // Find the corresponding stock info
        const stockInfo = sampleStockSymbols.find(s => s.symbol === realTimeData.symbol);
        if (!stockInfo) continue;

        // Calculate derived values with real-time data
        const investment = realTimeData.purchasePrice * stockInfo.quantity;
        const presentValue = realTimeData.currentPrice * stockInfo.quantity;
        const gainLoss = presentValue - investment;
        const gainLossPercent = ((gainLoss / investment) * 100).toFixed(2);
        
        console.log(`✅ ${realTimeData.stockName}:`);
        console.log(`   Purchase: ${realTimeData.currency}${realTimeData.purchasePrice.toFixed(2)} (${realTimeData.purchaseDate})`);
        console.log(`   Current:  ${realTimeData.currency}${realTimeData.currentPrice.toFixed(2)} [LIVE]`);
        console.log(`   Gain/Loss: ${realTimeData.currency}${gainLoss.toFixed(2)} (${gainLossPercent}%)`);
        console.log(`   P/E Ratio: ${realTimeData.peRatio || 'N/A'}`);
        console.log(`   Earnings: ${realTimeData.currency}${realTimeData.latestEarnings || 'N/A'}`);
        console.log(`   Source: ${realTimeData.source}`);
        
        const stockData = {
          ...stockInfo,
          purchasePrice: realTimeData.purchasePrice,
          purchaseDate: realTimeData.purchaseDate,
          investment,
          currentMarketPrice: realTimeData.currentPrice,
          presentValue,
          gainLoss,
          peRatio: realTimeData.peRatio || 0,
          latestEarnings: realTimeData.latestEarnings || 0,
          change: realTimeData.change || 0,
          changePercent: realTimeData.changePercent || 0,
          source: realTimeData.source
        };
        
        stocksWithLiveData.push(stockData);
        totalInvestment += investment;
        totalPresentValue += presentValue;
        totalGainLoss += gainLoss;
        
      } catch (error) {
        console.error(`❌ Error processing ${realTimeData.symbol}:`, error);
        continue;
      }
    }

    console.log('💾 Inserting stocks into database...');

    // Insert stocks with live data and calculated portfolio percentages
    for (const stock of stocksWithLiveData) {
      const portfolioPercentage = totalInvestment > 0 ? (stock.investment / totalInvestment) * 100 : 0;
      
      await Database.query(`
        INSERT INTO stocks (
          stock_name, purchase_price, quantity, investment, portfolio_percentage,
          stock_exchange_code, current_market_price, present_value, gain_loss,
          pe_ratio, latest_earnings, sector
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `, [
        stock.stockName,
        stock.purchasePrice,
        stock.quantity,
        stock.investment,
        portfolioPercentage,
        stock.stockExchangeCode,
        stock.currentMarketPrice,
        stock.presentValue,
        stock.gainLoss,
        stock.peRatio,
        stock.latestEarnings,
        stock.sector
      ]);
    }

    // Create initial portfolio snapshot
    await Database.query(`
      INSERT INTO portfolio_snapshots (total_investment, total_present_value, total_gain_loss)
      VALUES ($1, $2, $3)
    `, [totalInvestment, totalPresentValue, totalGainLoss]);

    // Generate real-time portfolio statistics
    const portfolioStats = realTimeDataService.getPortfolioStatistics(
      stocksWithLiveData.map(stock => ({
        symbol: stock.symbol,
        stockName: stock.stockName || stock.symbol,
        currentPrice: stock.currentMarketPrice,
        purchasePrice: stock.purchasePrice,
        purchaseDate: stock.purchaseDate,
        currency: '₹',
        peRatio: stock.peRatio,
        latestEarnings: stock.latestEarnings,
        change: stock.change,
        changePercent: stock.changePercent,
        source: stock.source,
        gainLoss: stock.gainLoss,
        gainLossPercent: ((stock.gainLoss / (stock.purchasePrice * stock.quantity)) * 100)
      }))
    );

    // Get market status
    const marketStatus = await realTimeDataService.getMarketStatus();

    console.log('✅ Database seeding completed successfully with LIVE REAL-TIME data!');
    console.log(`📈 Portfolio Summary:`);
    console.log(`   Stocks inserted: ${stocksWithLiveData.length}`);
    console.log(`   Total Investment: ₹${totalInvestment.toLocaleString('en-IN')}`);
    console.log(`   Total Present Value: ₹${totalPresentValue.toLocaleString('en-IN')} [LIVE]`);
    console.log(`   Total Gain/Loss: ₹${totalGainLoss.toLocaleString('en-IN')} (${totalInvestment > 0 ? ((totalGainLoss/totalInvestment)*100).toFixed(2) : '0.00'}%)`);
    console.log(`🔴 Real-Time Portfolio Statistics:`);
    console.log(`   Gainers: ${portfolioStats.gainers} stocks`);
    console.log(`   Losers: ${portfolioStats.losers} stocks`);
    console.log(`   Neutral: ${portfolioStats.neutral} stocks`);
    console.log(`   Average Return: ${portfolioStats.avgGainLossPercent}%`);
    console.log(`   Best Performer: +${portfolioStats.maxGain}%`);
    console.log(`   Worst Performer: ${portfolioStats.maxLoss}%`);
    console.log(`📊 Market Status:`);
    console.log(`   Market Open: ${marketStatus.marketOpen ? 'YES' : 'NO'}`);
    console.log(`   Data Freshness: ${marketStatus.dataFreshness.toUpperCase()}`);
    console.log(`   Timestamp: ${marketStatus.timestamp}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

seedDatabase();
