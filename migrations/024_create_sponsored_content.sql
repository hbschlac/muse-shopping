-- Create Sponsored Content System
-- Migration: 024_create_sponsored_content
-- Purpose: Enable brands/retailers to sponsor content on homepage newsfeed with full campaign management

-- ========================================
-- 1. Create Sponsored Campaigns Table
-- ========================================

CREATE TABLE IF NOT EXISTS sponsored_campaigns (
  id SERIAL PRIMARY KEY,

  -- Campaign identification
  campaign_name VARCHAR(255) NOT NULL,
  campaign_code VARCHAR(100) UNIQUE NOT NULL, -- e.g., 'SPRING2026_NIKE'

  -- Sponsor information
  brand_id INTEGER REFERENCES brands(id) ON DELETE CASCADE,
  sponsor_type VARCHAR(50) NOT NULL, -- 'brand', 'retailer', 'designer'
  sponsor_contact_email VARCHAR(255),

  -- Campaign creative
  title VARCHAR(255) NOT NULL,
  subtitle TEXT,
  description TEXT,
  call_to_action VARCHAR(100) DEFAULT 'Shop Now',

  -- Media assets
  hero_image_url TEXT,
  logo_url TEXT,
  banner_image_url TEXT,
  video_url TEXT,

  -- Targeting
  target_audience JSONB DEFAULT '{}', -- {"age_range": "18-34", "style_profiles": ["minimal", "classic"], "price_tiers": ["mid", "premium"]}
  geographic_targeting TEXT[], -- ['US', 'UK', 'CA']

  -- Landing page configuration
  landing_page_type VARCHAR(50) DEFAULT 'collection', -- 'collection', 'product_list', 'external_url', 'brand_page'
  landing_page_config JSONB DEFAULT '{}', -- configuration for landing page (product IDs, filters, etc.)
  external_landing_url TEXT, -- if landing_page_type = 'external_url'

  -- Budget & Pricing
  budget_type VARCHAR(50) DEFAULT 'cpm', -- 'cpm' (cost per mille/1000 impressions), 'cpc' (cost per click), 'flat_fee'
  budget_amount DECIMAL(10,2) NOT NULL, -- total budget in USD
  cost_per_impression DECIMAL(6,4), -- for CPM campaigns
  cost_per_click DECIMAL(6,2), -- for CPC campaigns
  daily_budget_cap DECIMAL(10,2), -- optional daily spending limit

  -- Performance goals
  target_impressions INTEGER,
  target_clicks INTEGER,
  target_conversions INTEGER,

  -- Scheduling
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN DEFAULT false,

  -- Priority & Placement
  priority_score INTEGER DEFAULT 50, -- 0-100, higher = more prominent placement
  placement_slots TEXT[] DEFAULT ARRAY['homepage_hero', 'newsfeed_position_3'], -- where to show
  frequency_cap INTEGER DEFAULT 3, -- max times to show to same user per day

  -- Status & Approval
  status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'pending_approval', 'approved', 'active', 'paused', 'completed', 'rejected'
  approval_status VARCHAR(50) DEFAULT 'pending',
  approved_by INTEGER REFERENCES users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,

  -- Metadata
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- Notes
  internal_notes TEXT,
  campaign_tags TEXT[]
);

CREATE INDEX idx_sponsored_campaigns_brand ON sponsored_campaigns(brand_id);
CREATE INDEX idx_sponsored_campaigns_status ON sponsored_campaigns(status);
CREATE INDEX idx_sponsored_campaigns_active ON sponsored_campaigns(is_active) WHERE is_active = true;
CREATE INDEX idx_sponsored_campaigns_dates ON sponsored_campaigns(start_date, end_date);
CREATE INDEX idx_sponsored_campaigns_priority ON sponsored_campaigns(priority_score DESC);

-- ========================================
-- 2. Create Sponsored Content Impressions Table
-- ========================================

CREATE TABLE IF NOT EXISTS sponsored_impressions (
  id SERIAL PRIMARY KEY,
  campaign_id INTEGER NOT NULL REFERENCES sponsored_campaigns(id) ON DELETE CASCADE,

  -- User context
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  session_id VARCHAR(255),

  -- Impression details
  placement VARCHAR(100) NOT NULL, -- 'homepage_hero', 'newsfeed_position_3', etc.
  position_index INTEGER, -- position in feed (e.g., 3rd item)

  -- Device & Context
  device_type VARCHAR(50), -- 'mobile', 'tablet', 'desktop'
  user_agent TEXT,
  ip_address INET,
  country_code VARCHAR(10),

  -- Timestamp
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- User engagement
  view_duration_seconds INTEGER, -- how long user viewed
  scrolled_past BOOLEAN DEFAULT false, -- did user scroll past without engaging

  -- Cost
  impression_cost DECIMAL(6,4) -- cost of this impression
);

CREATE INDEX idx_sponsored_impressions_campaign ON sponsored_impressions(campaign_id);
CREATE INDEX idx_sponsored_impressions_user ON sponsored_impressions(user_id);
CREATE INDEX idx_sponsored_impressions_date ON sponsored_impressions(viewed_at);
CREATE INDEX idx_sponsored_impressions_placement ON sponsored_impressions(placement);

-- ========================================
-- 3. Create Sponsored Content Clicks Table
-- ========================================

CREATE TABLE IF NOT EXISTS sponsored_clicks (
  id SERIAL PRIMARY KEY,
  campaign_id INTEGER NOT NULL REFERENCES sponsored_campaigns(id) ON DELETE CASCADE,
  impression_id INTEGER REFERENCES sponsored_impressions(id) ON DELETE SET NULL,

  -- User context
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  session_id VARCHAR(255),

  -- Click details
  click_type VARCHAR(50) DEFAULT 'primary_cta', -- 'primary_cta', 'image', 'brand_logo', 'product_card'
  clicked_element VARCHAR(100), -- specific element clicked

  -- Destination
  destination_url TEXT,
  destination_type VARCHAR(50), -- 'landing_page', 'product', 'brand_page', 'external'

  -- Timestamp
  clicked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- Cost
  click_cost DECIMAL(6,2) -- cost of this click
);

CREATE INDEX idx_sponsored_clicks_campaign ON sponsored_clicks(campaign_id);
CREATE INDEX idx_sponsored_clicks_impression ON sponsored_clicks(impression_id);
CREATE INDEX idx_sponsored_clicks_user ON sponsored_clicks(user_id);
CREATE INDEX idx_sponsored_clicks_date ON sponsored_clicks(clicked_at);

-- ========================================
-- 4. Create Sponsored Content Conversions Table
-- ========================================

CREATE TABLE IF NOT EXISTS sponsored_conversions (
  id SERIAL PRIMARY KEY,
  campaign_id INTEGER NOT NULL REFERENCES sponsored_campaigns(id) ON DELETE CASCADE,
  click_id INTEGER REFERENCES sponsored_clicks(id) ON DELETE SET NULL,

  -- User context
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,

  -- Conversion details
  conversion_type VARCHAR(50) NOT NULL, -- 'add_to_cart', 'purchase', 'favorite', 'brand_follow'
  conversion_value DECIMAL(10,2), -- value in USD (for purchases)

  -- Product/Item context (if applicable)
  item_id INTEGER REFERENCES items(id) ON DELETE SET NULL,
  product_sku VARCHAR(255),

  -- Attribution
  time_to_conversion_minutes INTEGER, -- minutes from click to conversion
  attribution_model VARCHAR(50) DEFAULT 'last_click', -- 'last_click', 'first_click', 'linear'

  -- Timestamp
  converted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sponsored_conversions_campaign ON sponsored_conversions(campaign_id);
CREATE INDEX idx_sponsored_conversions_click ON sponsored_conversions(click_id);
CREATE INDEX idx_sponsored_conversions_user ON sponsored_conversions(user_id);
CREATE INDEX idx_sponsored_conversions_type ON sponsored_conversions(conversion_type);
CREATE INDEX idx_sponsored_conversions_date ON sponsored_conversions(converted_at);

-- ========================================
-- 5. Create Campaign Budget Tracking Table
-- ========================================

CREATE TABLE IF NOT EXISTS campaign_budget_tracking (
  id SERIAL PRIMARY KEY,
  campaign_id INTEGER NOT NULL REFERENCES sponsored_campaigns(id) ON DELETE CASCADE,

  -- Daily aggregates
  tracking_date DATE NOT NULL,

  -- Performance metrics
  total_impressions INTEGER DEFAULT 0,
  total_clicks INTEGER DEFAULT 0,
  total_conversions INTEGER DEFAULT 0,

  -- Financial metrics
  total_spent DECIMAL(10,2) DEFAULT 0,
  impression_spend DECIMAL(10,2) DEFAULT 0,
  click_spend DECIMAL(10,2) DEFAULT 0,

  -- Conversion value
  total_conversion_value DECIMAL(10,2) DEFAULT 0,

  -- Calculated metrics
  ctr DECIMAL(5,2), -- click-through rate (%)
  conversion_rate DECIMAL(5,2), -- conversion rate (%)
  cpm DECIMAL(8,2), -- cost per thousand impressions
  cpc DECIMAL(8,2), -- cost per click
  cpa DECIMAL(10,2), -- cost per acquisition
  roas DECIMAL(10,2), -- return on ad spend

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(campaign_id, tracking_date)
);

CREATE INDEX idx_budget_tracking_campaign ON campaign_budget_tracking(campaign_id);
CREATE INDEX idx_budget_tracking_date ON campaign_budget_tracking(tracking_date DESC);

-- ========================================
-- 6. Create User Frequency Cap Tracking Table
-- ========================================

CREATE TABLE IF NOT EXISTS user_campaign_frequency (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  campaign_id INTEGER NOT NULL REFERENCES sponsored_campaigns(id) ON DELETE CASCADE,

  -- Frequency tracking
  impression_count INTEGER DEFAULT 0,
  last_shown_at TIMESTAMP WITH TIME ZONE,
  tracking_date DATE DEFAULT CURRENT_DATE,

  UNIQUE(user_id, campaign_id, tracking_date)
);

CREATE INDEX idx_user_frequency_user ON user_campaign_frequency(user_id);
CREATE INDEX idx_user_frequency_campaign ON user_campaign_frequency(campaign_id);
CREATE INDEX idx_user_frequency_date ON user_campaign_frequency(tracking_date);

-- ========================================
-- 7. Create Views for Reporting
-- ========================================

-- Campaign Performance Summary
CREATE OR REPLACE VIEW campaign_performance_summary AS
SELECT
  c.id,
  c.campaign_name,
  c.campaign_code,
  c.status,
  c.budget_amount,
  c.start_date,
  c.end_date,

  -- Performance metrics
  COUNT(DISTINCT si.id) as total_impressions,
  COUNT(DISTINCT sc.id) as total_clicks,
  COUNT(DISTINCT scon.id) as total_conversions,

  -- Financial metrics
  COALESCE(SUM(si.impression_cost), 0) + COALESCE(SUM(sc.click_cost), 0) as total_spent,
  COALESCE(SUM(scon.conversion_value), 0) as total_revenue,

  -- Calculated metrics
  CASE WHEN COUNT(DISTINCT si.id) > 0
    THEN ROUND((COUNT(DISTINCT sc.id)::DECIMAL / COUNT(DISTINCT si.id)) * 100, 2)
    ELSE 0
  END as ctr_percent,

  CASE WHEN COUNT(DISTINCT sc.id) > 0
    THEN ROUND((COUNT(DISTINCT scon.id)::DECIMAL / COUNT(DISTINCT sc.id)) * 100, 2)
    ELSE 0
  END as conversion_rate_percent,

  CASE WHEN COALESCE(SUM(si.impression_cost), 0) + COALESCE(SUM(sc.click_cost), 0) > 0
    THEN ROUND(COALESCE(SUM(scon.conversion_value), 0) / (COALESCE(SUM(si.impression_cost), 0) + COALESCE(SUM(sc.click_cost), 0)), 2)
    ELSE 0
  END as roas,

  -- Budget tracking
  c.budget_amount - (COALESCE(SUM(si.impression_cost), 0) + COALESCE(SUM(sc.click_cost), 0)) as remaining_budget

FROM sponsored_campaigns c
LEFT JOIN sponsored_impressions si ON c.id = si.campaign_id
LEFT JOIN sponsored_clicks sc ON c.id = sc.campaign_id
LEFT JOIN sponsored_conversions scon ON c.id = scon.campaign_id
GROUP BY c.id, c.campaign_name, c.campaign_code, c.status, c.budget_amount, c.start_date, c.end_date;

-- Active campaigns ready to serve
CREATE OR REPLACE VIEW active_sponsored_campaigns AS
SELECT
  c.*,
  b.name as brand_name,
  b.logo_url as brand_logo_url,
  -- Calculate remaining budget
  c.budget_amount - COALESCE(
    (SELECT SUM(total_spent) FROM campaign_budget_tracking WHERE campaign_id = c.id),
    0
  ) as remaining_budget,
  -- Check if budget is exhausted
  CASE
    WHEN c.budget_amount <= COALESCE(
      (SELECT SUM(total_spent) FROM campaign_budget_tracking WHERE campaign_id = c.id),
      0
    ) THEN true
    ELSE false
  END as budget_exhausted
FROM sponsored_campaigns c
LEFT JOIN brands b ON c.brand_id = b.id
WHERE
  c.is_active = true
  AND c.status = 'active'
  AND c.start_date <= CURRENT_TIMESTAMP
  AND c.end_date >= CURRENT_TIMESTAMP
  AND c.approval_status = 'approved';

-- ========================================
-- 8. Create Functions
-- ========================================

-- Function to update campaign budget tracking daily
CREATE OR REPLACE FUNCTION update_campaign_budget_tracking()
RETURNS void AS $$
BEGIN
  INSERT INTO campaign_budget_tracking (
    campaign_id,
    tracking_date,
    total_impressions,
    total_clicks,
    total_conversions,
    impression_spend,
    click_spend,
    total_spent,
    total_conversion_value,
    ctr,
    conversion_rate,
    cpm,
    cpc,
    cpa,
    roas
  )
  SELECT
    c.id as campaign_id,
    CURRENT_DATE as tracking_date,

    -- Count metrics
    COUNT(DISTINCT si.id) as total_impressions,
    COUNT(DISTINCT sc.id) as total_clicks,
    COUNT(DISTINCT scon.id) as total_conversions,

    -- Cost metrics
    COALESCE(SUM(si.impression_cost), 0) as impression_spend,
    COALESCE(SUM(sc.click_cost), 0) as click_spend,
    COALESCE(SUM(si.impression_cost), 0) + COALESCE(SUM(sc.click_cost), 0) as total_spent,

    -- Revenue
    COALESCE(SUM(scon.conversion_value), 0) as total_conversion_value,

    -- CTR
    CASE WHEN COUNT(DISTINCT si.id) > 0
      THEN ROUND((COUNT(DISTINCT sc.id)::DECIMAL / COUNT(DISTINCT si.id)) * 100, 2)
      ELSE 0
    END as ctr,

    -- Conversion Rate
    CASE WHEN COUNT(DISTINCT sc.id) > 0
      THEN ROUND((COUNT(DISTINCT scon.id)::DECIMAL / COUNT(DISTINCT sc.id)) * 100, 2)
      ELSE 0
    END as conversion_rate,

    -- CPM
    CASE WHEN COUNT(DISTINCT si.id) > 0
      THEN ROUND((COALESCE(SUM(si.impression_cost), 0) / COUNT(DISTINCT si.id)) * 1000, 2)
      ELSE 0
    END as cpm,

    -- CPC
    CASE WHEN COUNT(DISTINCT sc.id) > 0
      THEN ROUND(COALESCE(SUM(sc.click_cost), 0) / COUNT(DISTINCT sc.id), 2)
      ELSE 0
    END as cpc,

    -- CPA
    CASE WHEN COUNT(DISTINCT scon.id) > 0
      THEN ROUND((COALESCE(SUM(si.impression_cost), 0) + COALESCE(SUM(sc.click_cost), 0)) / COUNT(DISTINCT scon.id), 2)
      ELSE 0
    END as cpa,

    -- ROAS
    CASE WHEN (COALESCE(SUM(si.impression_cost), 0) + COALESCE(SUM(sc.click_cost), 0)) > 0
      THEN ROUND(COALESCE(SUM(scon.conversion_value), 0) / (COALESCE(SUM(si.impression_cost), 0) + COALESCE(SUM(sc.click_cost), 0)), 2)
      ELSE 0
    END as roas

  FROM sponsored_campaigns c
  LEFT JOIN sponsored_impressions si ON c.id = si.campaign_id AND DATE(si.viewed_at) = CURRENT_DATE
  LEFT JOIN sponsored_clicks sc ON c.id = sc.campaign_id AND DATE(sc.clicked_at) = CURRENT_DATE
  LEFT JOIN sponsored_conversions scon ON c.id = scon.campaign_id AND DATE(scon.converted_at) = CURRENT_DATE
  WHERE c.is_active = true
  GROUP BY c.id
  ON CONFLICT (campaign_id, tracking_date)
  DO UPDATE SET
    total_impressions = EXCLUDED.total_impressions,
    total_clicks = EXCLUDED.total_clicks,
    total_conversions = EXCLUDED.total_conversions,
    impression_spend = EXCLUDED.impression_spend,
    click_spend = EXCLUDED.click_spend,
    total_spent = EXCLUDED.total_spent,
    total_conversion_value = EXCLUDED.total_conversion_value,
    ctr = EXCLUDED.ctr,
    conversion_rate = EXCLUDED.conversion_rate,
    cpm = EXCLUDED.cpm,
    cpc = EXCLUDED.cpc,
    cpa = EXCLUDED.cpa,
    roas = EXCLUDED.roas,
    updated_at = CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Function to check and pause campaigns that exceeded budget
CREATE OR REPLACE FUNCTION check_campaign_budgets()
RETURNS void AS $$
BEGIN
  UPDATE sponsored_campaigns
  SET
    is_active = false,
    status = 'paused',
    internal_notes = COALESCE(internal_notes || E'\n', '') || 'Auto-paused: Budget exceeded on ' || CURRENT_DATE::text
  WHERE
    is_active = true
    AND budget_amount <= (
      SELECT COALESCE(SUM(total_spent), 0)
      FROM campaign_budget_tracking
      WHERE campaign_id = sponsored_campaigns.id
    );
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 9. Grant Permissions
-- ========================================

GRANT ALL PRIVILEGES ON TABLE sponsored_campaigns TO muse_admin;
GRANT ALL PRIVILEGES ON TABLE sponsored_impressions TO muse_admin;
GRANT ALL PRIVILEGES ON TABLE sponsored_clicks TO muse_admin;
GRANT ALL PRIVILEGES ON TABLE sponsored_conversions TO muse_admin;
GRANT ALL PRIVILEGES ON TABLE campaign_budget_tracking TO muse_admin;
GRANT ALL PRIVILEGES ON TABLE user_campaign_frequency TO muse_admin;

GRANT USAGE, SELECT ON SEQUENCE sponsored_campaigns_id_seq TO muse_admin;
GRANT USAGE, SELECT ON SEQUENCE sponsored_impressions_id_seq TO muse_admin;
GRANT USAGE, SELECT ON SEQUENCE sponsored_clicks_id_seq TO muse_admin;
GRANT USAGE, SELECT ON SEQUENCE sponsored_conversions_id_seq TO muse_admin;
GRANT USAGE, SELECT ON SEQUENCE campaign_budget_tracking_id_seq TO muse_admin;
GRANT USAGE, SELECT ON SEQUENCE user_campaign_frequency_id_seq TO muse_admin;

COMMENT ON TABLE sponsored_campaigns IS 'Sponsored content campaigns from brands and retailers';
COMMENT ON TABLE sponsored_impressions IS 'Impressions/views of sponsored content';
COMMENT ON TABLE sponsored_clicks IS 'Clicks on sponsored content';
COMMENT ON TABLE sponsored_conversions IS 'Conversions attributed to sponsored content';
COMMENT ON TABLE campaign_budget_tracking IS 'Daily budget and performance tracking for campaigns';
COMMENT ON TABLE user_campaign_frequency IS 'Frequency capping: track how many times user saw each campaign';
