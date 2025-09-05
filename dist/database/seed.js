"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = __importDefault(require("../config/database"));
const sampleStocks = [
    {
        stockName: "Reliance Industries Ltd",
        purchasePrice: 2450.00,
        quantity: 10,
        investment: 24500.00,
        stockExchangeCode: "NSE",
        currentMarketPrice: 2650.00,
        presentValue: 26500.00,
        gainLoss: 2000.00,
        peRatio: 12.5,
        latestEarnings: 15234.00,
        sector: "Energy"
    },
    {
        stockName: "Tata Consultancy Services Ltd",
        purchasePrice: 3200.00,
        quantity: 8,
        investment: 25600.00,
        stockExchangeCode: "NSE",
        currentMarketPrice: 3450.00,
        presentValue: 27600.00,
        gainLoss: 2000.00,
        peRatio: 28.3,
        latestEarnings: 9478.00,
        sector: "Technology"
    },
    {
        stockName: "HDFC Bank Ltd",
        purchasePrice: 1580.00,
        quantity: 15,
        investment: 23700.00,
        stockExchangeCode: "NSE",
        currentMarketPrice: 1620.00,
        presentValue: 24300.00,
        gainLoss: 600.00,
        peRatio: 18.7,
        latestEarnings: 8968.00,
        sector: "Finance"
    },
    {
        stockName: "Infosys Ltd",
        purchasePrice: 1420.00,
        quantity: 12,
        investment: 17040.00,
        stockExchangeCode: "NSE",
        currentMarketPrice: 1380.00,
        presentValue: 16560.00,
        gainLoss: -480.00,
        peRatio: 24.1,
        latestEarnings: 6586.00,
        sector: "Technology"
    },
    {
        stockName: "ITC Ltd",
        purchasePrice: 410.00,
        quantity: 50,
        investment: 20500.00,
        stockExchangeCode: "NSE",
        currentMarketPrice: 395.00,
        presentValue: 19750.00,
        gainLoss: -750.00,
        peRatio: 15.8,
        latestEarnings: 4512.00,
        sector: "Consumer Goods"
    }
];
async function seedDatabase() {
    try {
        console.log('Starting database seeding...');
        await database_1.default.query('DELETE FROM stocks');
        await database_1.default.query('DELETE FROM portfolio_snapshots');
        const totalInvestment = sampleStocks.reduce((sum, stock) => sum + stock.investment, 0);
        for (const stock of sampleStocks) {
            const portfolioPercentage = (stock.investment / totalInvestment) * 100;
            await database_1.default.query(`
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
        const totalPresentValue = sampleStocks.reduce((sum, stock) => sum + stock.presentValue, 0);
        const totalGainLoss = sampleStocks.reduce((sum, stock) => sum + stock.gainLoss, 0);
        await database_1.default.query(`
      INSERT INTO portfolio_snapshots (total_investment, total_present_value, total_gain_loss)
      VALUES ($1, $2, $3)
    `, [totalInvestment, totalPresentValue, totalGainLoss]);
        console.log('Database seeding completed successfully!');
        console.log(`Inserted ${sampleStocks.length} stocks`);
        console.log(`Total Investment: ₹${totalInvestment.toLocaleString()}`);
        console.log(`Total Present Value: ₹${totalPresentValue.toLocaleString()}`);
        console.log(`Total Gain/Loss: ₹${totalGainLoss.toLocaleString()}`);
        process.exit(0);
    }
    catch (error) {
        console.error('Seeding failed:', error);
        process.exit(1);
    }
}
seedDatabase();
//# sourceMappingURL=seed.js.map