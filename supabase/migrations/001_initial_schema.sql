-- Crypto Intelligence Database Schema
-- Run this in Supabase SQL Editor or via migrations

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================
-- COINS TABLE
-- =====================
CREATE TABLE IF NOT EXISTS coins (
    id TEXT PRIMARY KEY,  -- CoinGecko ID (e.g., "bitcoin")
    symbol TEXT NOT NULL,
    name TEXT NOT NULL,
    platforms JSONB DEFAULT '{}',
    categories JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_coins_symbol ON coins(symbol);
CREATE INDEX idx_coins_active ON coins(is_active);

-- =====================
-- PRICE SNAPSHOTS TABLE
-- =====================
CREATE TABLE IF NOT EXISTS price_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    coin_id TEXT NOT NULL REFERENCES coins(id) ON DELETE CASCADE,
    price DECIMAL NOT NULL,
    volume_24h DECIMAL NOT NULL,
    market_cap DECIMAL NOT NULL,
    price_change_1h DECIMAL,
    price_change_24h DECIMAL,
    price_change_7d DECIMAL,
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_price_snapshots_coin ON price_snapshots(coin_id);
CREATE INDEX idx_price_snapshots_time ON price_snapshots(recorded_at DESC);
CREATE INDEX idx_price_snapshots_coin_time ON price_snapshots(coin_id, recorded_at DESC);

-- =====================
-- MOVER EVENTS TABLE
-- =====================
CREATE TYPE move_type AS ENUM ('pump', 'dump', 'volume_spike', 'breakout', 'breakdown');

CREATE TABLE IF NOT EXISTS mover_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    coin_id TEXT NOT NULL,
    symbol TEXT NOT NULL,
    name TEXT NOT NULL,
    move_type move_type NOT NULL,
    magnitude DECIMAL NOT NULL,  -- Percentage change
    price DECIMAL NOT NULL,
    market_cap DECIMAL NOT NULL,
    volume_24h DECIMAL NOT NULL,
    volume_ratio DECIMAL,  -- Current volume / average volume
    btc_relative DECIMAL,  -- Performance relative to BTC
    rank INTEGER,
    metadata JSONB DEFAULT '{}',
    detected_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_mover_events_coin ON mover_events(coin_id);
CREATE INDEX idx_mover_events_type ON mover_events(move_type);
CREATE INDEX idx_mover_events_detected ON mover_events(detected_at DESC);
CREATE INDEX idx_mover_events_magnitude ON mover_events(ABS(magnitude) DESC);

-- =====================
-- RESEARCH REPORTS TABLE
-- =====================
CREATE TABLE IF NOT EXISTS research_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mover_event_id UUID NOT NULL REFERENCES mover_events(id) ON DELETE CASCADE,
    catalyst TEXT,
    catalyst_confidence DECIMAL,
    news_summary TEXT,
    sentiment_label TEXT,  -- 'bullish', 'bearish', 'neutral'
    sentiment_score DECIMAL,  -- -1 to 1
    key_factors JSONB DEFAULT '[]',
    risks JSONB DEFAULT '[]',
    full_analysis TEXT,
    similar_events JSONB DEFAULT '[]',
    news_articles JSONB DEFAULT '[]',
    tokens_used INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(mover_event_id)
);

CREATE INDEX idx_research_reports_event ON research_reports(mover_event_id);

-- =====================
-- PREDICTIONS TABLE
-- =====================
CREATE TYPE prediction_status AS ENUM ('pending', 'correct', 'incorrect', 'partial', 'expired');

CREATE TABLE IF NOT EXISTS predictions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    coin_id TEXT NOT NULL,
    mover_event_id UUID REFERENCES mover_events(id),
    predicted_direction TEXT NOT NULL,  -- 'up' or 'down'
    predicted_magnitude DECIMAL,
    confidence DECIMAL NOT NULL,  -- 0 to 1
    reasoning TEXT,
    horizon_hours INTEGER DEFAULT 24,
    status prediction_status DEFAULT 'pending',
    actual_change DECIMAL,
    predicted_at TIMESTAMPTZ DEFAULT NOW(),
    evaluated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_predictions_coin ON predictions(coin_id);
CREATE INDEX idx_predictions_status ON predictions(status);
CREATE INDEX idx_predictions_time ON predictions(predicted_at DESC);

-- =====================
-- DAILY STATS TABLE
-- =====================
CREATE TABLE IF NOT EXISTS daily_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE UNIQUE NOT NULL,
    total_movers INTEGER DEFAULT 0,
    pumps INTEGER DEFAULT 0,
    dumps INTEGER DEFAULT 0,
    volume_spikes INTEGER DEFAULT 0,
    research_count INTEGER DEFAULT 0,
    predictions_made INTEGER DEFAULT 0,
    predictions_correct INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_daily_stats_date ON daily_stats(date DESC);

-- =====================
-- HELPER FUNCTIONS
-- =====================

-- Function to clean old price snapshots (keep last 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_snapshots()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM price_snapshots
    WHERE recorded_at < NOW() - INTERVAL '30 days';

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get top movers
CREATE OR REPLACE FUNCTION get_top_movers(
    hours_back INTEGER DEFAULT 24,
    direction TEXT DEFAULT 'both',
    limit_count INTEGER DEFAULT 10
)
RETURNS TABLE (
    id UUID,
    coin_id TEXT,
    symbol TEXT,
    name TEXT,
    move_type move_type,
    magnitude DECIMAL,
    price DECIMAL,
    detected_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        me.id,
        me.coin_id,
        me.symbol,
        me.name,
        me.move_type,
        me.magnitude,
        me.price,
        me.detected_at
    FROM mover_events me
    WHERE me.detected_at > NOW() - (hours_back || ' hours')::INTERVAL
    AND (
        direction = 'both'
        OR (direction = 'up' AND me.magnitude > 0)
        OR (direction = 'down' AND me.magnitude < 0)
    )
    ORDER BY ABS(me.magnitude) DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- =====================
-- ROW LEVEL SECURITY
-- =====================
-- Enable RLS (optional, for public access control)
-- ALTER TABLE coins ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE price_snapshots ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE mover_events ENABLE ROW LEVEL SECURITY;

-- Allow public read access (if needed for dashboard)
-- CREATE POLICY "Public read access" ON mover_events FOR SELECT USING (true);
