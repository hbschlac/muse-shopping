/**
 * Migration: Create Metrics & Analytics System
 * Purpose: Track user sessions, page views, conversion funnels, and cart analytics
 * Date: 2026-02-03
 */

-- ============================================
-- 1. USER SESSIONS TABLE
-- ============================================
-- Tracks complete user sessions with duration and engagement metrics

CREATE TABLE IF NOT EXISTS user_sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  session_id VARCHAR(255) NOT NULL UNIQUE,

  -- Device & browser info
  device_type VARCHAR(50), -- 'mobile', 'tablet', 'desktop'
  browser VARCHAR(100),
  platform VARCHAR(50), -- 'iOS', 'Android', 'Web'
  user_agent TEXT,

  -- Traffic source
  referrer TEXT,
  utm_source VARCHAR(100),
  utm_medium VARCHAR(100),
  utm_campaign VARCHAR(100),
  utm_content VARCHAR(100),
  utm_term VARCHAR(100),

  -- Session metrics
  session_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  session_end TIMESTAMP,
  session_duration_seconds INTEGER,
  pages_viewed INTEGER DEFAULT 0,
  interactions_count INTEGER DEFAULT 0,

  -- Conversion metrics
  cart_adds INTEGER DEFAULT 0,
  purchases INTEGER DEFAULT 0,
  total_revenue_cents INTEGER DEFAULT 0,

  -- Engagement quality
  bounce BOOLEAN DEFAULT false, -- true if only 1 page viewed
  exit_page_url TEXT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_session_user ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_session_date ON user_sessions(session_start DESC);
CREATE INDEX IF NOT EXISTS idx_session_id ON user_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_session_bounce ON user_sessions(bounce) WHERE bounce = true;
CREATE INDEX IF NOT EXISTS idx_session_utm ON user_sessions(utm_source, utm_medium, utm_campaign);

COMMENT ON TABLE user_sessions IS 'Tracks complete user sessions with engagement and conversion metrics';

-- ============================================
-- 2. PAGE VIEWS TABLE
-- ============================================
-- Tracks individual page views with time on page

CREATE TABLE IF NOT EXISTS page_views (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(255) NOT NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,

  -- Page info
  page_url TEXT NOT NULL,
  page_type VARCHAR(100), -- 'home', 'product', 'search', 'cart', 'newsfeed', 'brand', 'checkout'
  page_title VARCHAR(500),

  -- Context
  referrer_url TEXT,
  is_entry_page BOOLEAN DEFAULT false, -- first page in session
  is_exit_page BOOLEAN DEFAULT false,  -- last page in session

  -- Timing
  view_started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  view_ended_at TIMESTAMP,
  time_on_page_seconds INTEGER,

  -- Engagement
  scroll_depth_percent INTEGER, -- how far user scrolled (0-100)
  interactions_on_page INTEGER DEFAULT 0, -- clicks, hovers, etc

  -- Product-specific (if applicable)
  product_id INTEGER REFERENCES product_catalog(id) ON DELETE SET NULL,
  brand_id INTEGER REFERENCES brands(id) ON DELETE SET NULL,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_page_views_session ON page_views(session_id);
CREATE INDEX IF NOT EXISTS idx_page_views_user ON page_views(user_id);
CREATE INDEX IF NOT EXISTS idx_page_views_type ON page_views(page_type);
CREATE INDEX IF NOT EXISTS idx_page_views_started ON page_views(view_started_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_views_product ON page_views(product_id) WHERE product_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_page_views_entry ON page_views(is_entry_page) WHERE is_entry_page = true;
CREATE INDEX IF NOT EXISTS idx_page_views_exit ON page_views(is_exit_page) WHERE is_exit_page = true;

COMMENT ON TABLE page_views IS 'Tracks individual page views with timing and engagement metrics';

-- ============================================
-- 3. CONVERSION FUNNELS TABLE
-- ============================================
-- Tracks user progression through conversion funnel

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'funnel_stage') THEN
    CREATE TYPE funnel_stage AS ENUM (
      'browse',        -- viewing newsfeed/search results
      'view_product',  -- viewing PDP
      'add_to_cart',   -- added item to cart
      'view_cart',     -- viewed cart
      'checkout',      -- started checkout
      'purchase'       -- completed purchase
    );
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS conversion_funnels (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(255) NOT NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,

  -- Funnel stage
  funnel_stage funnel_stage NOT NULL,

  -- Product context (if applicable)
  product_id INTEGER REFERENCES product_catalog(id) ON DELETE SET NULL,
  brand_id INTEGER REFERENCES brands(id) ON DELETE SET NULL,

  -- Timing
  reached_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  time_since_previous_stage_seconds INTEGER,
  time_since_session_start_seconds INTEGER,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_funnel_session ON conversion_funnels(session_id);
CREATE INDEX IF NOT EXISTS idx_funnel_user ON conversion_funnels(user_id);
CREATE INDEX IF NOT EXISTS idx_funnel_stage ON conversion_funnels(funnel_stage);
CREATE INDEX IF NOT EXISTS idx_funnel_date ON conversion_funnels(reached_at DESC);
CREATE INDEX IF NOT EXISTS idx_funnel_product ON conversion_funnels(product_id) WHERE product_id IS NOT NULL;

COMMENT ON TABLE conversion_funnels IS 'Tracks user progression through conversion funnel stages';

-- ============================================
-- 4. CART EVENTS TABLE
-- ============================================
-- Tracks all cart-related events for analytics

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cart_event_type') THEN
    CREATE TYPE cart_event_type AS ENUM (
      'created',
      'item_added',
      'item_removed',
      'item_quantity_changed',
      'abandoned',
      'converted'
    );
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS cart_events (
  id SERIAL PRIMARY KEY,
  cart_id INTEGER,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  session_id VARCHAR(255),

  -- Event details
  event_type cart_event_type NOT NULL,

  -- Product context (if applicable)
  product_id INTEGER REFERENCES product_catalog(id) ON DELETE SET NULL,
  quantity INTEGER,
  value_cents INTEGER,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  occurred_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Backfill schema drift: ensure cart_id exists on older deployments
ALTER TABLE cart_events
  ADD COLUMN IF NOT EXISTS cart_id INTEGER;

-- Add FK to carts only if carts table exists and constraint is missing
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'carts') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE table_name = 'cart_events' AND constraint_type = 'FOREIGN KEY' AND constraint_name = 'cart_events_cart_id_fkey'
    ) THEN
      ALTER TABLE cart_events
        ADD CONSTRAINT cart_events_cart_id_fkey
        FOREIGN KEY (cart_id) REFERENCES carts(id) ON DELETE CASCADE;
    END IF;
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_cart_events_cart ON cart_events(cart_id);
CREATE INDEX IF NOT EXISTS idx_cart_events_user ON cart_events(user_id);
CREATE INDEX IF NOT EXISTS idx_cart_events_session ON cart_events(session_id);
CREATE INDEX IF NOT EXISTS idx_cart_events_type ON cart_events(event_type);
CREATE INDEX IF NOT EXISTS idx_cart_events_date ON cart_events(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_cart_events_product ON cart_events(product_id) WHERE product_id IS NOT NULL;

COMMENT ON TABLE cart_events IS 'Tracks all cart events for analytics and abandonment analysis';

-- ============================================
-- 5. ANALYTICS VIEWS
-- ============================================
-- Pre-computed views for common analytics queries

-- Session Stats View
DROP VIEW IF EXISTS session_stats_daily;
CREATE OR REPLACE VIEW session_stats_daily AS
SELECT
  DATE(session_start) as date,
  COUNT(DISTINCT session_id) as total_sessions,
  COUNT(DISTINCT user_id) as unique_users,
  AVG(session_duration_seconds) as avg_duration_seconds,
  AVG(pages_viewed) as avg_pages_per_session,
  AVG(interactions_count) as avg_interactions,
  SUM(CASE WHEN bounce = true THEN 1 ELSE 0 END)::FLOAT / COUNT(*)::FLOAT as bounce_rate,
  SUM(cart_adds) as total_cart_adds,
  SUM(purchases) as total_purchases,
  SUM(total_revenue_cents) as total_revenue_cents,
  SUM(purchases)::FLOAT / COUNT(*)::FLOAT as conversion_rate
FROM user_sessions
GROUP BY DATE(session_start);

COMMENT ON VIEW session_stats_daily IS 'Daily aggregated session statistics';

-- Page Performance View
DROP VIEW IF EXISTS page_performance;
CREATE OR REPLACE VIEW page_performance AS
SELECT
  page_type,
  COUNT(*) as total_views,
  AVG(time_on_page_seconds) as avg_time_seconds,
  AVG(scroll_depth_percent) as avg_scroll_depth,
  AVG(interactions_on_page) as avg_interactions,
  SUM(CASE WHEN is_exit_page = true THEN 1 ELSE 0 END)::FLOAT / COUNT(*)::FLOAT as exit_rate
FROM page_views
WHERE view_ended_at IS NOT NULL
GROUP BY page_type;

COMMENT ON VIEW page_performance IS 'Aggregated metrics by page type';

-- Funnel Analysis View
DROP VIEW IF EXISTS funnel_analysis;
CREATE OR REPLACE VIEW funnel_analysis AS
SELECT
  funnel_stage,
  COUNT(DISTINCT session_id) as sessions_reached,
  AVG(time_since_session_start_seconds) as avg_time_to_reach_seconds,
  COUNT(DISTINCT user_id) as unique_users
FROM conversion_funnels
GROUP BY funnel_stage
ORDER BY
  CASE funnel_stage
    WHEN 'browse' THEN 1
    WHEN 'view_product' THEN 2
    WHEN 'add_to_cart' THEN 3
    WHEN 'view_cart' THEN 4
    WHEN 'checkout' THEN 5
    WHEN 'purchase' THEN 6
  END;

COMMENT ON VIEW funnel_analysis IS 'Conversion funnel drop-off analysis';

-- Cart Abandonment View
DROP VIEW IF EXISTS cart_abandonment_stats;
CREATE OR REPLACE VIEW cart_abandonment_stats AS
SELECT
  DATE(occurred_at) as date,
  COUNT(DISTINCT CASE WHEN event_type = 'created' THEN cart_id END) as carts_created,
  COUNT(DISTINCT CASE WHEN event_type = 'abandoned' THEN cart_id END) as carts_abandoned,
  COUNT(DISTINCT CASE WHEN event_type = 'converted' THEN cart_id END) as carts_converted,
  COUNT(DISTINCT CASE WHEN event_type = 'abandoned' THEN cart_id END)::FLOAT /
    NULLIF(COUNT(DISTINCT CASE WHEN event_type = 'created' THEN cart_id END), 0)::FLOAT as abandonment_rate,
  AVG(CASE WHEN event_type = 'item_added' THEN value_cents END) as avg_item_value_cents
FROM cart_events
GROUP BY DATE(occurred_at);

COMMENT ON VIEW cart_abandonment_stats IS 'Daily cart abandonment statistics';

-- ============================================
-- 6. HELPER FUNCTIONS
-- ============================================

-- Function to update session metrics when it ends
CREATE OR REPLACE FUNCTION update_session_metrics()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate session duration
  IF NEW.session_end IS NOT NULL AND NEW.session_start IS NOT NULL THEN
    NEW.session_duration_seconds = EXTRACT(EPOCH FROM (NEW.session_end - NEW.session_start))::INTEGER;
  END IF;

  -- Mark as bounce if only 1 page viewed
  IF NEW.pages_viewed = 1 THEN
    NEW.bounce = true;
  END IF;

  -- Update timestamp
  NEW.updated_at = CURRENT_TIMESTAMP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_session_metrics ON user_sessions;
CREATE TRIGGER trigger_update_session_metrics
BEFORE UPDATE ON user_sessions
FOR EACH ROW
EXECUTE FUNCTION update_session_metrics();

-- Function to calculate time on page
CREATE OR REPLACE FUNCTION calculate_time_on_page()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.view_ended_at IS NOT NULL AND NEW.view_started_at IS NOT NULL THEN
    NEW.time_on_page_seconds = EXTRACT(EPOCH FROM (NEW.view_ended_at - NEW.view_started_at))::INTEGER;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_calculate_time_on_page ON page_views;
CREATE TRIGGER trigger_calculate_time_on_page
BEFORE UPDATE ON page_views
FOR EACH ROW
EXECUTE FUNCTION calculate_time_on_page();

-- ============================================
-- VERIFICATION
-- ============================================

-- Verify tables created
DO $$
BEGIN
  RAISE NOTICE 'Metrics system migration complete!';
  RAISE NOTICE 'Created tables: user_sessions, page_views, conversion_funnels, cart_events';
  RAISE NOTICE 'Created views: session_stats_daily, page_performance, funnel_analysis, cart_abandonment_stats';
END $$;
