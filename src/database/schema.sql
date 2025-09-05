-- Portfolio Database Schema

-- Create extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Stocks table
CREATE TABLE IF NOT EXISTS stocks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stock_name VARCHAR(255) NOT NULL,
    purchase_price DECIMAL(10, 2) NOT NULL,
    quantity INTEGER NOT NULL,
    investment DECIMAL(12, 2) NOT NULL,
    portfolio_percentage DECIMAL(5, 2) NOT NULL DEFAULT 0,
    stock_exchange_code VARCHAR(10) NOT NULL,
    current_market_price DECIMAL(10, 2) NOT NULL,
    present_value DECIMAL(12, 2) NOT NULL,
    gain_loss DECIMAL(12, 2) NOT NULL,
    pe_ratio DECIMAL(8, 2),
    latest_earnings DECIMAL(12, 2),
    sector VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Portfolio snapshots table (for historical tracking)
CREATE TABLE IF NOT EXISTS portfolio_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    total_investment DECIMAL(15, 2) NOT NULL,
    total_present_value DECIMAL(15, 2) NOT NULL,
    total_gain_loss DECIMAL(15, 2) NOT NULL,
    snapshot_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sectors reference table
CREATE TABLE IF NOT EXISTS sectors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_stocks_sector ON stocks(sector);
CREATE INDEX IF NOT EXISTS idx_stocks_stock_name ON stocks(stock_name);
CREATE INDEX IF NOT EXISTS idx_stocks_created_at ON stocks(created_at);
CREATE INDEX IF NOT EXISTS idx_portfolio_snapshots_date ON portfolio_snapshots(snapshot_date);

-- Trigger to update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_stocks_updated_at 
    BEFORE UPDATE ON stocks 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Insert default sectors
INSERT INTO sectors (name, description) VALUES
    ('Technology', 'Technology and software companies'),
    ('Healthcare', 'Healthcare and pharmaceutical companies'),
    ('Finance', 'Banking and financial services'),
    ('Energy', 'Oil, gas, and renewable energy companies'),
    ('Consumer Goods', 'Consumer products and retail'),
    ('Industrials', 'Manufacturing and industrial companies'),
    ('Real Estate', 'Real estate and property companies'),
    ('Utilities', 'Utility and infrastructure companies'),
    ('Materials', 'Mining and materials companies'),
    ('Telecommunications', 'Telecom and communication services')
ON CONFLICT (name) DO NOTHING;
