"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const uuid_1 = require("uuid");
const marketDataService_1 = __importDefault(require("../services/marketDataService"));
const logger_1 = require("../utils/logger");
const database_1 = __importDefault(require("../config/database"));
class StockController {
    static async getAllStocks(req, res) {
        try {
            logger_1.logger.info('Fetching all stocks with live market data');
            const result = await database_1.default.query(`
        SELECT id, stock_name as "stockName", purchase_price as "purchasePrice", 
               quantity, investment, portfolio_percentage as "portfolioPercentage",
               stock_exchange_code as "stockExchangeCode", current_market_price as "currentMarketPrice",
               present_value as "presentValue", gain_loss as "gainLoss",
               pe_ratio as "peRatio", latest_earnings as "latestEarnings", sector,
               created_at as "createdAt", updated_at as "updatedAt"
        FROM stocks ORDER BY created_at DESC
      `);
            const stocks = [];
            for (const row of result.rows) {
                const symbol = StockController.extractStockSymbol(row.stockName);
                logger_1.logger.info(`Fetching live data for ${row.stockName} (${symbol})`);
                const marketData = await marketDataService_1.default.getMarketData(symbol, row.stockExchangeCode);
                let currentMarketPrice = parseFloat(row.currentMarketPrice);
                let peRatio = row.peRatio ? parseFloat(row.peRatio) : undefined;
                let latestEarnings = row.latestEarnings ? parseFloat(row.latestEarnings) : undefined;
                if (marketData) {
                    currentMarketPrice = marketData.currentPrice;
                    peRatio = marketData.peRatio || peRatio;
                    latestEarnings = marketData.latestEarnings || latestEarnings;
                }
                const investment = parseFloat(row.investment);
                const presentValue = currentMarketPrice * parseInt(row.quantity);
                const gainLoss = presentValue - investment;
                const stock = {
                    id: row.id,
                    stockName: row.stockName,
                    symbol: symbol,
                    purchasePrice: parseFloat(row.purchasePrice),
                    quantity: parseInt(row.quantity),
                    investment: investment,
                    portfolioPercentage: parseFloat(row.portfolioPercentage),
                    stockExchangeCode: row.stockExchangeCode,
                    currentMarketPrice: currentMarketPrice,
                    presentValue: presentValue,
                    gainLoss: gainLoss,
                    peRatio: peRatio || 0,
                    latestEarnings: latestEarnings || 0,
                    sector: row.sector,
                    purchaseDate: row.createdAt ? new Date(row.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                    lastUpdated: new Date().toISOString(),
                    createdAt: row.createdAt,
                    updatedAt: row.updatedAt
                };
                stocks.push(stock);
            }
            res.json({
                success: true,
                data: stocks
            });
        }
        catch (error) {
            logger_1.logger.error('Error fetching stocks:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch stocks',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    static extractStockSymbol(stockName) {
        const symbolMapping = {
            'Reliance Industries Ltd': 'RELIANCE.NS',
            'Tata Consultancy Services Ltd': 'TCS.NS',
            'HDFC Bank Ltd': 'HDFCBANK.NS',
            'Infosys Ltd': 'INFY.NS',
            'ITC Ltd': 'ITC.NS',
            'State Bank of India': 'SBIN.NS',
            'Bharti Airtel Ltd': 'BHARTIARTL.NS',
            'Kotak Mahindra Bank Ltd': 'KOTAKBANK.NS',
            'Hindustan Unilever Ltd': 'HINDUNILVR.NS',
            'Larsen & Toubro Ltd': 'LT.NS'
        };
        if (symbolMapping[stockName]) {
            return symbolMapping[stockName];
        }
        const firstWord = stockName.split(' ')[0].toUpperCase();
        return `${firstWord}.NS`;
    }
    static async getStockById(req, res) {
        try {
            const { id } = req.params;
            if (!id) {
                res.status(400).json({
                    success: false,
                    message: 'Stock ID is required'
                });
                return;
            }
            const result = await database_1.default.query(`
        SELECT id, stock_name as "stockName", purchase_price as "purchasePrice", 
               quantity, investment, portfolio_percentage as "portfolioPercentage",
               stock_exchange_code as "stockExchangeCode", current_market_price as "currentMarketPrice",
               present_value as "presentValue", gain_loss as "gainLoss",
               pe_ratio as "peRatio", latest_earnings as "latestEarnings", sector,
               created_at as "createdAt", updated_at as "updatedAt"
        FROM stocks WHERE id = $1
      `, [id]);
            if (result.rows.length === 0) {
                res.status(404).json({
                    success: false,
                    message: `Stock with ID ${id} not found`
                });
                return;
            }
            const row = result.rows[0];
            const symbol = StockController.extractStockSymbol(row.stockName);
            const marketData = await marketDataService_1.default.getMarketData(symbol, row.stockExchangeCode);
            let currentMarketPrice = parseFloat(row.currentMarketPrice);
            let peRatio = row.peRatio ? parseFloat(row.peRatio) : 0;
            let latestEarnings = row.latestEarnings ? parseFloat(row.latestEarnings) : 0;
            if (marketData) {
                currentMarketPrice = marketData.currentPrice;
                peRatio = marketData.peRatio || peRatio;
                latestEarnings = marketData.latestEarnings || latestEarnings;
            }
            const investment = parseFloat(row.investment);
            const presentValue = currentMarketPrice * parseInt(row.quantity);
            const gainLoss = presentValue - investment;
            const stock = {
                id: row.id,
                stockName: row.stockName,
                symbol: symbol,
                purchasePrice: parseFloat(row.purchasePrice),
                quantity: parseInt(row.quantity),
                investment: investment,
                portfolioPercentage: parseFloat(row.portfolioPercentage),
                stockExchangeCode: row.stockExchangeCode,
                currentMarketPrice: currentMarketPrice,
                presentValue: presentValue,
                gainLoss: gainLoss,
                peRatio: peRatio,
                latestEarnings: latestEarnings,
                sector: row.sector,
                purchaseDate: row.createdAt ? new Date(row.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                lastUpdated: new Date().toISOString(),
                createdAt: row.createdAt,
                updatedAt: row.updatedAt
            };
            res.json({
                success: true,
                data: stock
            });
        }
        catch (error) {
            logger_1.logger.error(`Error fetching stock ${req.params.id}:`, error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch stock',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    static async createStock(req, res) {
        try {
            const stockData = req.body;
            if (!stockData.stockName || !stockData.purchasePrice || !stockData.quantity) {
                res.status(400).json({
                    success: false,
                    message: 'Missing required fields: stockName, purchasePrice, quantity'
                });
                return;
            }
            const stockId = (0, uuid_1.v4)();
            const symbol = StockController.extractStockSymbol(stockData.stockName);
            let currentMarketPrice = stockData.purchasePrice;
            let peRatio = 0;
            let latestEarnings = 0;
            try {
                logger_1.logger.info(`Fetching live market data for new stock: ${stockData.stockName} (${symbol})`);
                const marketData = await marketDataService_1.default.getMarketData(symbol, stockData.stockExchangeCode || 'NSE');
                if (marketData) {
                    currentMarketPrice = marketData.currentPrice;
                    peRatio = marketData.peRatio || 0;
                    latestEarnings = marketData.latestEarnings || 0;
                }
            }
            catch (error) {
                logger_1.logger.warn(`Failed to fetch market data for ${stockData.stockName}, using purchase price`);
            }
            const investment = stockData.purchasePrice * stockData.quantity;
            const presentValue = currentMarketPrice * stockData.quantity;
            const gainLoss = presentValue - investment;
            await database_1.default.query(`
        INSERT INTO stocks (
          id, stock_name, purchase_price, quantity, investment, 
          stock_exchange_code, current_market_price, present_value, 
          gain_loss, pe_ratio, latest_earnings, sector, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
      `, [
                stockId, stockData.stockName, stockData.purchasePrice, stockData.quantity,
                investment, stockData.stockExchangeCode || 'NSE', currentMarketPrice,
                presentValue, gainLoss, peRatio, latestEarnings, stockData.sector || 'Technology'
            ]);
            await StockController.recalculatePortfolioPercentages();
            const result = await database_1.default.query(`
        SELECT id, stock_name as "stockName", purchase_price as "purchasePrice", 
               quantity, investment, portfolio_percentage as "portfolioPercentage",
               stock_exchange_code as "stockExchangeCode", current_market_price as "currentMarketPrice",
               present_value as "presentValue", gain_loss as "gainLoss",
               pe_ratio as "peRatio", latest_earnings as "latestEarnings", sector,
               created_at as "createdAt", updated_at as "updatedAt"
        FROM stocks WHERE id = $1
      `, [stockId]);
            const newStock = {
                id: result.rows[0].id,
                stockName: result.rows[0].stockName,
                symbol: symbol,
                purchasePrice: parseFloat(result.rows[0].purchasePrice),
                quantity: parseInt(result.rows[0].quantity),
                investment: parseFloat(result.rows[0].investment),
                portfolioPercentage: parseFloat(result.rows[0].portfolioPercentage),
                stockExchangeCode: result.rows[0].stockExchangeCode,
                currentMarketPrice: parseFloat(result.rows[0].currentMarketPrice),
                presentValue: parseFloat(result.rows[0].presentValue),
                gainLoss: parseFloat(result.rows[0].gainLoss),
                peRatio: parseFloat(result.rows[0].peRatio) || 0,
                latestEarnings: parseFloat(result.rows[0].latestEarnings) || 0,
                sector: result.rows[0].sector,
                purchaseDate: result.rows[0].createdAt ? new Date(result.rows[0].createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                lastUpdated: new Date().toISOString(),
                createdAt: result.rows[0].createdAt,
                updatedAt: result.rows[0].updatedAt
            };
            logger_1.logger.info(`Created new stock: ${newStock.stockName} (${symbol}) with live market data`);
            res.status(201).json({
                success: true,
                data: newStock,
                message: 'Stock added to portfolio successfully with live market data'
            });
        }
        catch (error) {
            logger_1.logger.error('Error creating stock:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to add stock to portfolio',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    static async updateStock(req, res) {
        res.status(501).json({
            success: false,
            message: 'Stock update not implemented in live data demo',
            note: 'Focus is on live data fetching from external APIs'
        });
    }
    static async deleteStock(req, res) {
        try {
            const { id } = req.params;
            if (!id) {
                res.status(400).json({
                    success: false,
                    message: 'Stock ID is required'
                });
                return;
            }
            const checkResult = await database_1.default.query(`
        SELECT id, stock_name as "stockName", quantity, investment
        FROM stocks WHERE id = $1
      `, [id]);
            if (checkResult.rows.length === 0) {
                res.status(404).json({
                    success: false,
                    message: `Stock with ID ${id} not found`
                });
                return;
            }
            const stock = checkResult.rows[0];
            await database_1.default.query('DELETE FROM stocks WHERE id = $1', [id]);
            await StockController.recalculatePortfolioPercentages();
            logger_1.logger.info(`Deleted stock holding: ${stock.stockName} (Qty: ${stock.quantity}, Investment: ₹${stock.investment})`);
            res.json({
                success: true,
                message: 'Stock holding removed from portfolio successfully',
                data: {
                    id: stock.id,
                    stockName: stock.stockName,
                    quantity: stock.quantity,
                    investment: stock.investment
                }
            });
        }
        catch (error) {
            logger_1.logger.error(`Error deleting stock ${req.params.id}:`, error);
            res.status(500).json({
                success: false,
                message: 'Failed to remove stock holding',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    static async recalculatePortfolioPercentages() {
        try {
            const totalResult = await database_1.default.query('SELECT SUM(investment) as total FROM stocks');
            const totalInvestment = parseFloat(totalResult.rows[0]?.total || '0');
            if (totalInvestment > 0) {
                await database_1.default.query(`
          UPDATE stocks 
          SET portfolio_percentage = ROUND((investment / $1 * 100)::numeric, 2),
              updated_at = NOW()
        `, [totalInvestment]);
                logger_1.logger.info('Recalculated portfolio percentages after stock deletion');
            }
        }
        catch (error) {
            logger_1.logger.error('Error recalculating portfolio percentages:', error);
        }
    }
    static async searchStocks(req, res) {
        try {
            const { q } = req.query;
            if (!q || typeof q !== 'string' || q.length < 2) {
                res.status(400).json({
                    success: false,
                    message: 'Search query must be at least 2 characters'
                });
                return;
            }
            const query = q.toLowerCase().trim();
            const indianStocks = [
                { name: 'Reliance Industries Ltd', symbol: 'RELIANCE.NS', exchange: 'NSE', sector: 'Energy' },
                { name: 'Tata Consultancy Services Ltd', symbol: 'TCS.NS', exchange: 'NSE', sector: 'Technology' },
                { name: 'HDFC Bank Ltd', symbol: 'HDFCBANK.NS', exchange: 'NSE', sector: 'Financials' },
                { name: 'Infosys Ltd', symbol: 'INFY.NS', exchange: 'NSE', sector: 'Technology' },
                { name: 'ITC Ltd', symbol: 'ITC.NS', exchange: 'NSE', sector: 'Consumer Goods' },
                { name: 'State Bank of India', symbol: 'SBIN.NS', exchange: 'NSE', sector: 'Financials' },
                { name: 'Bharti Airtel Ltd', symbol: 'BHARTIARTL.NS', exchange: 'NSE', sector: 'Telecommunications' },
                { name: 'Kotak Mahindra Bank Ltd', symbol: 'KOTAKBANK.NS', exchange: 'NSE', sector: 'Financials' },
                { name: 'Hindustan Unilever Ltd', symbol: 'HINDUNILVR.NS', exchange: 'NSE', sector: 'Consumer Goods' },
                { name: 'Larsen & Toubro Ltd', symbol: 'LT.NS', exchange: 'NSE', sector: 'Industrials' },
                { name: 'ICICI Bank Ltd', symbol: 'ICICIBANK.NS', exchange: 'NSE', sector: 'Financials' },
                { name: 'Wipro Ltd', symbol: 'WIPRO.NS', exchange: 'NSE', sector: 'Technology' },
                { name: 'Maruti Suzuki India Ltd', symbol: 'MARUTI.NS', exchange: 'NSE', sector: 'Auto' },
                { name: 'Asian Paints Ltd', symbol: 'ASIANPAINT.NS', exchange: 'NSE', sector: 'Materials' },
                { name: 'Bajaj Finance Ltd', symbol: 'BAJFINANCE.NS', exchange: 'NSE', sector: 'Financials' },
                { name: 'HCL Technologies Ltd', symbol: 'HCLTECH.NS', exchange: 'NSE', sector: 'Technology' },
                { name: 'Axis Bank Ltd', symbol: 'AXISBANK.NS', exchange: 'NSE', sector: 'Financials' },
                { name: 'Mahindra & Mahindra Ltd', symbol: 'M&M.NS', exchange: 'NSE', sector: 'Auto' },
                { name: 'Sun Pharmaceutical Industries Ltd', symbol: 'SUNPHARMA.NS', exchange: 'NSE', sector: 'Healthcare' },
                { name: 'Bajaj Auto Ltd', symbol: 'BAJAJ-AUTO.NS', exchange: 'NSE', sector: 'Auto' },
                { name: 'Adani Enterprises Ltd', symbol: 'ADANIENT.NS', exchange: 'NSE', sector: 'Energy' },
                { name: 'Tata Motors Ltd', symbol: 'TATAMOTORS.NS', exchange: 'NSE', sector: 'Auto' },
                { name: 'Tech Mahindra Ltd', symbol: 'TECHM.NS', exchange: 'NSE', sector: 'Technology' },
                { name: 'Power Grid Corporation of India Ltd', symbol: 'POWERGRID.NS', exchange: 'NSE', sector: 'Utilities' },
                { name: 'Nestle India Ltd', symbol: 'NESTLEIND.NS', exchange: 'NSE', sector: 'Consumer Goods' },
                { name: 'UltraTech Cement Ltd', symbol: 'ULTRACEMCO.NS', exchange: 'NSE', sector: 'Materials' },
                { name: 'Titan Company Ltd', symbol: 'TITAN.NS', exchange: 'NSE', sector: 'Consumer Goods' },
                { name: 'Grasim Industries Ltd', symbol: 'GRASIM.NS', exchange: 'NSE', sector: 'Materials' },
                { name: 'JSW Steel Ltd', symbol: 'JSWSTEEL.NS', exchange: 'NSE', sector: 'Materials' },
                { name: 'Tata Steel Ltd', symbol: 'TATASTEEL.NS', exchange: 'NSE', sector: 'Materials' },
                { name: 'HDFC Life Insurance Company Ltd', symbol: 'HDFCLIFE.NS', exchange: 'NSE', sector: 'Financials' },
                { name: 'SBI Life Insurance Company Ltd', symbol: 'SBILIFE.NS', exchange: 'NSE', sector: 'Financials' },
                { name: 'ICICI Prudential Life Insurance Company Ltd', symbol: 'ICICIPRULI.NS', exchange: 'NSE', sector: 'Financials' },
                { name: 'Cipla Ltd', symbol: 'CIPLA.NS', exchange: 'NSE', sector: 'Healthcare' },
                { name: 'Dr Reddys Laboratories Ltd', symbol: 'DRREDDY.NS', exchange: 'NSE', sector: 'Healthcare' },
                { name: 'Divi\'s Laboratories Ltd', symbol: 'DIVISLAB.NS', exchange: 'NSE', sector: 'Healthcare' },
                { name: 'Coal India Ltd', symbol: 'COALINDIA.NS', exchange: 'NSE', sector: 'Energy' },
                { name: 'NTPC Ltd', symbol: 'NTPC.NS', exchange: 'NSE', sector: 'Utilities' },
                { name: 'Oil & Natural Gas Corporation Ltd', symbol: 'ONGC.NS', exchange: 'NSE', sector: 'Energy' },
                { name: 'Bharat Petroleum Corporation Ltd', symbol: 'BPCL.NS', exchange: 'NSE', sector: 'Energy' },
                { name: 'Indian Oil Corporation Ltd', symbol: 'IOC.NS', exchange: 'NSE', sector: 'Energy' },
                { name: 'Hindalco Industries Ltd', symbol: 'HINDALCO.NS', exchange: 'NSE', sector: 'Materials' },
                { name: 'Bajaj Finserv Ltd', symbol: 'BAJAJFINSV.NS', exchange: 'NSE', sector: 'Financials' },
                { name: 'Eicher Motors Ltd', symbol: 'EICHERMOT.NS', exchange: 'NSE', sector: 'Auto' },
                { name: 'Britannia Industries Ltd', symbol: 'BRITANNIA.NS', exchange: 'NSE', sector: 'Consumer Goods' },
                { name: 'Hero MotoCorp Ltd', symbol: 'HEROMOTOCO.NS', exchange: 'NSE', sector: 'Auto' },
                { name: 'Shree Cement Ltd', symbol: 'SHREECEM.NS', exchange: 'NSE', sector: 'Materials' },
                { name: 'HDFC Asset Management Company Ltd', symbol: 'HDFCAMC.NS', exchange: 'NSE', sector: 'Financials' },
                { name: 'IndusInd Bank Ltd', symbol: 'INDUSINDBK.NS', exchange: 'NSE', sector: 'Financials' },
                { name: 'Adani Ports and Special Economic Zone Ltd', symbol: 'ADANIPORTS.NS', exchange: 'NSE', sector: 'Industrials' },
                { name: 'Adani Green Energy Ltd', symbol: 'ADANIGREEN.NS', exchange: 'NSE', sector: 'Utilities' },
                { name: 'Apollo Hospitals Enterprise Ltd', symbol: 'APOLLOHOSP.NS', exchange: 'NSE', sector: 'Healthcare' },
                { name: 'Vedanta Ltd', symbol: 'VEDL.NS', exchange: 'NSE', sector: 'Materials' },
                { name: 'Godrej Consumer Products Ltd', symbol: 'GODREJCP.NS', exchange: 'NSE', sector: 'Consumer Goods' },
                { name: 'Dabur India Ltd', symbol: 'DABUR.NS', exchange: 'NSE', sector: 'Consumer Goods' },
                { name: 'Marico Ltd', symbol: 'MARICO.NS', exchange: 'NSE', sector: 'Consumer Goods' },
                { name: 'Colgate Palmolive India Ltd', symbol: 'COLPAL.NS', exchange: 'NSE', sector: 'Consumer Goods' },
                { name: 'Procter & Gamble Hygiene and Health Care Ltd', symbol: 'PGHH.NS', exchange: 'NSE', sector: 'Consumer Goods' },
                { name: 'United Spirits Ltd', symbol: 'UBL.NS', exchange: 'NSE', sector: 'Consumer Goods' },
                { name: 'Jubilant FoodWorks Ltd', symbol: 'JUBLFOOD.NS', exchange: 'NSE', sector: 'Consumer Services' },
                { name: 'Avenue Supermarts Ltd', symbol: 'DMART.NS', exchange: 'NSE', sector: 'Consumer Services' },
                { name: 'Page Industries Ltd', symbol: 'PAGEIND.NS', exchange: 'NSE', sector: 'Consumer Goods' },
                { name: 'MRF Ltd', symbol: 'MRF.NS', exchange: 'NSE', sector: 'Auto' },
                { name: 'Balkrishna Industries Ltd', symbol: 'BALKRISIND.NS', exchange: 'NSE', sector: 'Auto' },
                { name: 'Bosch Ltd', symbol: 'BOSCHLTD.NS', exchange: 'NSE', sector: 'Auto' },
                { name: 'Motherson Sumi Systems Ltd', symbol: 'MOTHERSUMI.NS', exchange: 'NSE', sector: 'Auto' },
                { name: 'Ashok Leyland Ltd', symbol: 'ASHOKLEY.NS', exchange: 'NSE', sector: 'Auto' },
                { name: 'TVS Motor Company Ltd', symbol: 'TVSMOTOR.NS', exchange: 'NSE', sector: 'Auto' },
                { name: 'Bajaj Holdings & Investment Ltd', symbol: 'BAJAJHLDNG.NS', exchange: 'NSE', sector: 'Financials' },
                { name: 'HDFC Ltd', symbol: 'HDFC.NS', exchange: 'NSE', sector: 'Financials' },
                { name: 'Housing Development Finance Corporation Ltd', symbol: 'HDFC.NS', exchange: 'NSE', sector: 'Financials' },
                { name: 'Yes Bank Ltd', symbol: 'YESBANK.NS', exchange: 'NSE', sector: 'Financials' },
                { name: 'Federal Bank Ltd', symbol: 'FEDERALBNK.NS', exchange: 'NSE', sector: 'Financials' },
                { name: 'IDFC First Bank Ltd', symbol: 'IDFCFIRSTB.NS', exchange: 'NSE', sector: 'Financials' },
                { name: 'Bank of Baroda', symbol: 'BANKBARODA.NS', exchange: 'NSE', sector: 'Financials' },
                { name: 'Punjab National Bank', symbol: 'PNB.NS', exchange: 'NSE', sector: 'Financials' },
                { name: 'Canara Bank', symbol: 'CANBK.NS', exchange: 'NSE', sector: 'Financials' },
                { name: 'Union Bank of India', symbol: 'UNIONBANK.NS', exchange: 'NSE', sector: 'Financials' },
                { name: 'Indian Bank', symbol: 'INDIANB.NS', exchange: 'NSE', sector: 'Financials' },
                { name: 'Muthoot Finance Ltd', symbol: 'MUTHOOTFIN.NS', exchange: 'NSE', sector: 'Financials' },
                { name: 'Manappuram Finance Ltd', symbol: 'MANAPPURAM.NS', exchange: 'NSE', sector: 'Financials' },
                { name: 'L&T Finance Holdings Ltd', symbol: 'L&TFH.NS', exchange: 'NSE', sector: 'Financials' },
                { name: 'PNB Housing Finance Ltd', symbol: 'PNBHOUSING.NS', exchange: 'NSE', sector: 'Financials' },
                { name: 'Indiabulls Housing Finance Ltd', symbol: 'IBULHSGFIN.NS', exchange: 'NSE', sector: 'Financials' },
                { name: 'Can Fin Homes Ltd', symbol: 'CANFINHOME.NS', exchange: 'NSE', sector: 'Financials' },
                { name: 'HDFC Bank Ltd', symbol: 'HDFCBANK.NS', exchange: 'NSE', sector: 'Financials' },
                { name: 'Mindtree Ltd', symbol: 'MINDTREE.NS', exchange: 'NSE', sector: 'Technology' },
                { name: 'Mphasis Ltd', symbol: 'MPHASIS.NS', exchange: 'NSE', sector: 'Technology' },
                { name: 'L&T Technology Services Ltd', symbol: 'LTTS.NS', exchange: 'NSE', sector: 'Technology' },
                { name: 'Persistent Systems Ltd', symbol: 'PERSISTENT.NS', exchange: 'NSE', sector: 'Technology' },
                { name: 'Cyient Ltd', symbol: 'CYIENT.NS', exchange: 'NSE', sector: 'Technology' },
                { name: 'KPIT Technologies Ltd', symbol: 'KPITTECH.NS', exchange: 'NSE', sector: 'Technology' },
                { name: 'Zensar Technologies Ltd', symbol: 'ZENSARTECH.NS', exchange: 'NSE', sector: 'Technology' },
                { name: 'Rolta India Ltd', symbol: 'ROLTA.NS', exchange: 'NSE', sector: 'Technology' },
                { name: 'NIIT Technologies Ltd', symbol: 'NIITTECH.NS', exchange: 'NSE', sector: 'Technology' },
                { name: 'Oracle Financial Services Software Ltd', symbol: 'OFSS.NS', exchange: 'NSE', sector: 'Technology' },
                { name: 'Tata Elxsi Ltd', symbol: 'TATAELXSI.NS', exchange: 'NSE', sector: 'Technology' },
                { name: 'Hexaware Technologies Ltd', symbol: 'HEXAWARE.NS', exchange: 'NSE', sector: 'Technology' },
                { name: 'Sonata Software Ltd', symbol: 'SONATSOFTW.NS', exchange: 'NSE', sector: 'Technology' },
                { name: 'Redington India Ltd', symbol: 'REDINGTON.NS', exchange: 'NSE', sector: 'Technology' },
                { name: 'Birlasoft Ltd', symbol: 'BSOFT.NS', exchange: 'NSE', sector: 'Technology' },
                { name: '3i Infotech Ltd', symbol: '3IINFOTECH.NS', exchange: 'NSE', sector: 'Technology' },
                { name: 'Vakrangee Ltd', symbol: 'VAKRANGEE.NS', exchange: 'NSE', sector: 'Technology' },
                { name: 'RCOM Ltd', symbol: 'RCOM.NS', exchange: 'NSE', sector: 'Telecommunications' },
                { name: 'Vodafone Idea Ltd', symbol: 'IDEA.NS', exchange: 'NSE', sector: 'Telecommunications' },
                { name: 'Bharti Infratel Ltd', symbol: 'INFRATEL.NS', exchange: 'NSE', sector: 'Telecommunications' },
                { name: 'Indus Towers Ltd', symbol: 'INDUSTOWER.NS', exchange: 'NSE', sector: 'Telecommunications' },
                { name: 'Tata Communications Ltd', symbol: 'TATACOMM.NS', exchange: 'NSE', sector: 'Telecommunications' },
                { name: 'Mahanagar Telephone Nigam Ltd', symbol: 'MTNL.NS', exchange: 'NSE', sector: 'Telecommunications' },
                { name: 'Bharti Hexacom Ltd', symbol: 'BHARTIHEXA.NS', exchange: 'NSE', sector: 'Telecommunications' }
            ];
            const filteredStocks = indianStocks.filter(stock => {
                const stockName = stock.name.toLowerCase();
                const stockSymbol = stock.symbol.toLowerCase();
                if (stockName.includes(query) || stockSymbol.includes(query)) {
                    return true;
                }
                const queryWords = query.split(' ');
                return queryWords.some(word => stockName.includes(word) || stockSymbol.includes(word));
            }).slice(0, 15);
            logger_1.logger.info(`Stock search for "${query}" returned ${filteredStocks.length} results`);
            res.json({
                success: true,
                data: filteredStocks,
                message: `Found ${filteredStocks.length} stocks matching "${q}"`
            });
        }
        catch (error) {
            logger_1.logger.error('Error searching stocks:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to search stocks',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    static async refreshStockData(req, res) {
        try {
            const { id } = req.params;
            if (!id) {
                res.status(400).json({
                    success: false,
                    message: 'Stock ID is required'
                });
                return;
            }
            const result = await database_1.default.query(`
        SELECT id, stock_name as "stockName", stock_exchange_code as "stockExchangeCode"
        FROM stocks WHERE id = $1
      `, [id]);
            if (result.rows.length === 0) {
                res.status(404).json({
                    success: false,
                    message: `Stock with ID ${id} not found`
                });
                return;
            }
            const row = result.rows[0];
            const symbol = StockController.extractStockSymbol(row.stockName);
            const marketData = await marketDataService_1.default.refreshSymbol(symbol, row.stockExchangeCode);
            if (marketData) {
                await database_1.default.query(`
          UPDATE stocks 
          SET current_market_price = $1, pe_ratio = $2, latest_earnings = $3, updated_at = NOW()
          WHERE id = $4
        `, [marketData.currentPrice, marketData.peRatio, marketData.latestEarnings, id]);
                logger_1.logger.info(`Refreshed market data for ${row.stockName} (${symbol})`);
                res.json({
                    success: true,
                    data: {
                        id: id,
                        symbol: symbol,
                        currentPrice: marketData.currentPrice,
                        peRatio: marketData.peRatio,
                        latestEarnings: marketData.latestEarnings,
                        lastUpdated: marketData.lastUpdated
                    },
                    message: 'Market data refreshed successfully'
                });
            }
            else {
                res.status(404).json({
                    success: false,
                    message: `Failed to fetch market data for ${symbol}`
                });
            }
        }
        catch (error) {
            logger_1.logger.error(`Error refreshing stock data ${req.params.id}:`, error);
            res.status(500).json({
                success: false,
                message: 'Failed to refresh stock data',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
}
exports.default = StockController;
//# sourceMappingURL=stockController.js.map