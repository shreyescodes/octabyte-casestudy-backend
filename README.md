# Portfolio Dashboard Backend API

A robust Node.js/Express backend for managing stock portfolios with PostgreSQL database.

## Features

- **Stock Management**: CRUD operations for stocks
- **Portfolio Analytics**: Real-time portfolio calculations and metrics
- **Sector Analysis**: Group and analyze stocks by sector
- **Historical Tracking**: Portfolio snapshots over time
- **Price Updates**: Bulk update stock prices
- **TypeScript**: Full type safety
- **PostgreSQL**: Robust relational database with proper schema
- **Security**: Rate limiting, CORS, and security headers

## Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

## Installation

1. **Clone and navigate to backend directory**:
   ```bash
   cd backend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` with your database credentials:
   ```env
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=portfolio_db
   DB_USER=your_username
   DB_PASSWORD=your_password
   PORT=3001
   NODE_ENV=development
   CORS_ORIGIN=http://localhost:3000
   ```

4. **Create PostgreSQL database**:
   ```sql
   CREATE DATABASE portfolio_db;
   ```

5. **Run database migration**:
   ```bash
   npm run build
   npm run migrate
   ```

6. **Seed database with sample data** (optional):
   ```bash
   npm run seed
   ```

## Development

```bash
# Start development server with hot reload
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## API Endpoints

### Health Check
- `GET /health` - Server and database status

### Stocks
- `GET /api/stocks` - Get all stocks
- `GET /api/stocks/:id` - Get stock by ID
- `POST /api/stocks` - Create new stock
- `PUT /api/stocks/:id` - Update stock
- `DELETE /api/stocks/:id` - Delete stock
- `GET /api/stocks/sector/:sector` - Get stocks by sector

### Portfolio
- `GET /api/portfolio` - Get portfolio summary
- `GET /api/portfolio/sectors` - Get sector analysis
- `GET /api/portfolio/metrics` - Get portfolio metrics
- `GET /api/portfolio/snapshots` - Get historical snapshots
- `POST /api/portfolio/snapshots` - Create portfolio snapshot
- `PUT /api/portfolio/prices` - Bulk update stock prices

## API Response Format

All endpoints return responses in this format:

```json
{
  "success": boolean,
  "data": any,           // Present on success
  "message": string,     // Optional success message
  "error": string        // Present on error
}
```

## Example API Usage

### Create a Stock
```bash
curl -X POST http://localhost:3001/api/stocks \\
  -H "Content-Type: application/json" \\
  -d '{
    "stockName": "Apple Inc",
    "purchasePrice": 150.00,
    "quantity": 10,
    "stockExchangeCode": "NASDAQ",
    "currentMarketPrice": 155.00,
    "peRatio": 25.5,
    "latestEarnings": 95000000000,
    "sector": "Technology"
  }'
```

### Get Portfolio Summary
```bash
curl http://localhost:3001/api/portfolio
```

### Update Stock Prices
```bash
curl -X PUT http://localhost:3001/api/portfolio/prices \\
  -H "Content-Type: application/json" \\
  -d '{
    "priceUpdates": [
      {"stockName": "Apple Inc", "currentMarketPrice": 160.00},
      {"stockName": "Microsoft Corp", "currentMarketPrice": 300.00}
    ]
  }'
```

## Database Schema

The application uses the following main tables:

- **stocks**: Store individual stock information
- **portfolio_snapshots**: Historical portfolio data
- **sectors**: Reference table for stock sectors

See `src/database/schema.sql` for the complete schema.

## Security Features

- **Rate Limiting**: 100 requests per 15 minutes per IP
- **CORS**: Configurable cross-origin resource sharing
- **Helmet**: Security headers
- **Input Validation**: Request data validation
- **Error Handling**: Graceful error responses

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DB_HOST` | PostgreSQL host | `localhost` |
| `DB_PORT` | PostgreSQL port | `5432` |
| `DB_NAME` | Database name | `portfolio_db` |
| `DB_USER` | Database username | - |
| `DB_PASSWORD` | Database password | - |
| `PORT` | Server port | `3001` |
| `NODE_ENV` | Environment | `development` |
| `CORS_ORIGIN` | Allowed CORS origin | `http://localhost:3000` |

## Production Deployment

1. Set `NODE_ENV=production`
2. Use a process manager like PM2
3. Set up SSL/TLS termination
4. Configure proper database connection pooling
5. Set up monitoring and logging

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request
