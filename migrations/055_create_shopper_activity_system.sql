-- Migration 055: Shopper Activity & Privacy System
-- Purpose: Organize shopper information with security, privacy, and activity tracking
-- Connected to experimentation system for A/B testing
-- Created: 2026-02-05

-- ============================================================================
-- PART 1: SHOPPER DATA ORGANIZATION
-- Extends existing users table with shopping-specific metadata
-- ============================================================================

-- Add shopping behavior metadata to users
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS shopping_metadata JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS privacy_consent JSONB DEFAULT '{
    "data_collection": false,
    "personalization": false,
    "marketing": false,
    "third_party_sharing": false,
    "analytics": false,
    "consented_at": null,
    "ip_address": null
  }'::jsonb,
  ADD COLUMN IF NOT EXISTS data_retention_preference VARCHAR(50) DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS gdpr_delete_request BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS gdpr_delete_requested_at TIMESTAMP WITH TIME ZONE;

-- Index for privacy queries
CREATE INDEX IF NOT EXISTS idx_users_privacy_consent ON users USING GIN (privacy_consent);
CREATE INDEX IF NOT EXISTS idx_users_gdpr_delete ON users(gdpr_delete_request) WHERE gdpr_delete_request = true;

-- ============================================================================
-- PART 2: SHOPPER ACTIVITY TRACKING
-- Real-time activity tracking for logged-in users
-- ============================================================================

CREATE TABLE IF NOT EXISTS shopper_activity (
  id BIGSERIAL PRIMARY KEY,

  -- User identification
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id VARCHAR(255) NOT NULL,

  -- Activity details
  activity_type VARCHAR(100) NOT NULL, -- 'page_view', 'product_view', 'search', 'filter', 'click', 'add_to_cart', 'purchase', 'wishlist_add', etc.
  activity_category VARCHAR(50) NOT NULL, -- 'browsing', 'engagement', 'conversion', 'social'

  -- Context
  page_url TEXT,
  page_type VARCHAR(50), -- 'newsfeed', 'product_detail', 'search_results', 'cart', 'checkout'
  referrer_url TEXT,

  -- Product context (if applicable)
  product_id INTEGER REFERENCES product_catalog(id) ON DELETE SET NULL,
  brand_id INTEGER REFERENCES brands(id) ON DELETE SET NULL,
  item_id INTEGER REFERENCES items(id) ON DELETE SET NULL,

  -- Search context (if applicable)
  search_query TEXT,
  search_filters JSONB,

  -- Interaction details
  interaction_data JSONB DEFAULT '{}', -- Click coordinates, scroll depth, time spent, etc.

  -- Experiment tracking (connected to A/B testing)
  experiment_id INTEGER REFERENCES experiments(id) ON DELETE SET NULL,
  variant_id INTEGER REFERENCES experiment_variants(id) ON DELETE SET NULL,

  -- Module/position tracking
  module_id INTEGER REFERENCES feed_modules(id) ON DELETE SET NULL,
  position_in_feed INTEGER,

  -- Device & context
  device_type VARCHAR(50),
  browser VARCHAR(100),
  platform VARCHAR(50),
  viewport_width INTEGER,
  viewport_height INTEGER,

  -- Timing
  duration_seconds INTEGER, -- How long they spent on this activity
  occurred_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- Privacy compliance
  anonymized BOOLEAN DEFAULT false, -- Set to true if PII stripped
  anonymized_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_shopper_activity_user ON shopper_activity(user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_shopper_activity_session ON shopper_activity(session_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_shopper_activity_type ON shopper_activity(activity_type);
CREATE INDEX IF NOT EXISTS idx_shopper_activity_category ON shopper_activity(activity_category);
CREATE INDEX IF NOT EXISTS idx_shopper_activity_product ON shopper_activity(product_id) WHERE product_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_shopper_activity_brand ON shopper_activity(brand_id) WHERE brand_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_shopper_activity_experiment ON shopper_activity(experiment_id, variant_id) WHERE experiment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_shopper_activity_occurred ON shopper_activity(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_shopper_activity_page_type ON shopper_activity(page_type);

-- Partial index for non-anonymized data (for privacy audits)
CREATE INDEX IF NOT EXISTS idx_shopper_activity_not_anonymized ON shopper_activity(user_id, occurred_at) WHERE anonymized = false;

-- ============================================================================
-- PART 3: SHOPPER ENGAGEMENT METRICS
-- Aggregated metrics for each shopper
-- ============================================================================

CREATE TABLE IF NOT EXISTS shopper_engagement_metrics (
  id SERIAL PRIMARY KEY,
  user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Session metrics
  total_sessions INTEGER DEFAULT 0,
  total_session_duration_seconds BIGINT DEFAULT 0,
  avg_session_duration_seconds INTEGER,
  last_session_at TIMESTAMP WITH TIME ZONE,

  -- Browsing metrics
  total_page_views INTEGER DEFAULT 0,
  total_product_views INTEGER DEFAULT 0,
  total_brand_views INTEGER DEFAULT 0,
  unique_products_viewed INTEGER DEFAULT 0,
  unique_brands_viewed INTEGER DEFAULT 0,

  -- Search metrics
  total_searches INTEGER DEFAULT 0,
  total_filter_applications INTEGER DEFAULT 0,

  -- Engagement metrics
  total_clicks INTEGER DEFAULT 0,
  total_wishlist_adds INTEGER DEFAULT 0,
  total_cart_adds INTEGER DEFAULT 0,

  -- Conversion metrics
  total_purchases INTEGER DEFAULT 0,
  total_revenue_cents BIGINT DEFAULT 0,
  avg_order_value_cents INTEGER,
  conversion_rate DECIMAL(5,4), -- Percentage of sessions that result in purchase

  -- Loyalty metrics
  days_since_first_activity INTEGER,
  days_since_last_activity INTEGER,
  engagement_score DECIMAL(10,4), -- Calculated score based on activity

  -- Experimentation metrics (aggregate)
  total_experiments_participated INTEGER DEFAULT 0,
  total_experiment_conversions INTEGER DEFAULT 0,

  -- Timestamps
  first_activity_at TIMESTAMP WITH TIME ZONE,
  last_activity_at TIMESTAMP WITH TIME ZONE,
  metrics_calculated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_engagement_metrics_user ON shopper_engagement_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_engagement_metrics_score ON shopper_engagement_metrics(engagement_score DESC);
CREATE INDEX IF NOT EXISTS idx_engagement_metrics_last_activity ON shopper_engagement_metrics(last_activity_at DESC);
CREATE INDEX IF NOT EXISTS idx_engagement_metrics_conversion_rate ON shopper_engagement_metrics(conversion_rate DESC);

-- ============================================================================
-- PART 4: SHOPPER SEGMENTS
-- Dynamic customer segmentation based on behavior
-- ============================================================================

CREATE TABLE IF NOT EXISTS shopper_segments (
  id SERIAL PRIMARY KEY,

  segment_name VARCHAR(255) UNIQUE NOT NULL,
  segment_key VARCHAR(100) UNIQUE NOT NULL, -- e.g., 'high_value_frequent', 'window_shopper', etc.
  description TEXT,

  -- Segment criteria (evaluated dynamically)
  criteria JSONB NOT NULL, -- Rules for segment membership

  -- Metadata
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0, -- Higher priority segments evaluated first

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Junction table for user segment membership
CREATE TABLE IF NOT EXISTS shopper_segment_membership (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  segment_id INTEGER NOT NULL REFERENCES shopper_segments(id) ON DELETE CASCADE,

  -- Membership details
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_evaluated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  confidence_score DECIMAL(5,4), -- How strongly they match segment (0-1)

  -- Metadata
  evaluation_data JSONB, -- Why they're in this segment

  UNIQUE(user_id, segment_id)
);

CREATE INDEX IF NOT EXISTS idx_segment_membership_user ON shopper_segment_membership(user_id);
CREATE INDEX IF NOT EXISTS idx_segment_membership_segment ON shopper_segment_membership(segment_id);
CREATE INDEX IF NOT EXISTS idx_segment_membership_confidence ON shopper_segment_membership(confidence_score DESC);

-- ============================================================================
-- PART 5: PRIVACY & CONSENT TRACKING
-- Audit trail for consent and data access
-- ============================================================================

CREATE TABLE IF NOT EXISTS privacy_consent_log (
  id BIGSERIAL PRIMARY KEY,

  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Consent details
  consent_type VARCHAR(100) NOT NULL, -- 'data_collection', 'personalization', 'marketing', etc.
  consent_given BOOLEAN NOT NULL,
  consent_version VARCHAR(50), -- Version of privacy policy

  -- Context
  ip_address INET,
  user_agent TEXT,
  consent_method VARCHAR(100), -- 'signup', 'settings_update', 'banner_accept', etc.

  -- Metadata
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_privacy_consent_user ON privacy_consent_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_privacy_consent_type ON privacy_consent_log(consent_type);
CREATE INDEX IF NOT EXISTS idx_privacy_consent_given ON privacy_consent_log(consent_given);

-- ============================================================================
-- PART 6: DATA ANONYMIZATION LOG
-- Track when and why data was anonymized
-- ============================================================================

CREATE TABLE IF NOT EXISTS data_anonymization_log (
  id SERIAL PRIMARY KEY,

  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  original_user_id INTEGER, -- Store original ID even after user deletion

  -- Anonymization details
  anonymization_reason VARCHAR(100) NOT NULL, -- 'gdpr_request', 'retention_policy', 'user_request'
  tables_affected TEXT[], -- List of tables where data was anonymized
  records_affected INTEGER,

  -- What was anonymized
  fields_anonymized TEXT[], -- List of fields that were anonymized

  -- Context
  requested_by INTEGER REFERENCES users(id) ON DELETE SET NULL, -- Admin who processed request
  automated BOOLEAN DEFAULT false,

  -- Metadata
  metadata JSONB DEFAULT '{}',

  anonymized_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_anonymization_user ON data_anonymization_log(original_user_id);
CREATE INDEX IF NOT EXISTS idx_anonymization_reason ON data_anonymization_log(anonymization_reason);
CREATE INDEX IF NOT EXISTS idx_anonymization_date ON data_anonymization_log(anonymized_at DESC);

-- ============================================================================
-- PART 7: EXPERIMENT ACTIVITY INTEGRATION
-- Connect shopper activity to experiment tracking
-- ============================================================================

-- Function to automatically track experiment events from shopper activity
CREATE OR REPLACE FUNCTION track_experiment_from_activity()
RETURNS TRIGGER AS $$
BEGIN
  -- If activity has experiment context, log to experiment_events
  IF NEW.experiment_id IS NOT NULL AND NEW.variant_id IS NOT NULL THEN

    -- Map activity types to experiment event types
    INSERT INTO experiment_events (
      user_id,
      experiment_id,
      variant_id,
      event_type,
      event_name,
      item_id,
      brand_id,
      position,
      module_id,
      event_data,
      value,
      session_id
    ) VALUES (
      NEW.user_id,
      NEW.experiment_id,
      NEW.variant_id,
      CASE
        WHEN NEW.activity_type IN ('page_view', 'product_view') THEN 'impression'
        WHEN NEW.activity_type = 'click' THEN 'click'
        WHEN NEW.activity_type = 'add_to_cart' THEN 'add_to_cart'
        WHEN NEW.activity_type = 'purchase' THEN 'conversion'
        ELSE 'engagement'
      END,
      NEW.activity_type,
      NEW.item_id,
      NEW.brand_id,
      NEW.position_in_feed,
      NEW.module_id,
      NEW.interaction_data,
      COALESCE((NEW.interaction_data->>'value_cents')::DECIMAL, 0),
      NEW.session_id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-log experiment events
DROP TRIGGER IF EXISTS trigger_track_experiment_from_activity ON shopper_activity;
CREATE TRIGGER trigger_track_experiment_from_activity
  AFTER INSERT ON shopper_activity
  FOR EACH ROW
  EXECUTE FUNCTION track_experiment_from_activity();

-- ============================================================================
-- PART 8: ENGAGEMENT METRICS UPDATE FUNCTION
-- Automatically update engagement metrics when activity is logged
-- ============================================================================

CREATE OR REPLACE FUNCTION update_shopper_engagement_metrics()
RETURNS TRIGGER AS $$
DECLARE
  v_user_metrics shopper_engagement_metrics%ROWTYPE;
BEGIN
  -- Get or create metrics record
  INSERT INTO shopper_engagement_metrics (user_id, first_activity_at, last_activity_at)
  VALUES (NEW.user_id, NEW.occurred_at, NEW.occurred_at)
  ON CONFLICT (user_id) DO UPDATE SET
    last_activity_at = NEW.occurred_at
  RETURNING * INTO v_user_metrics;

  -- Update metrics based on activity type
  UPDATE shopper_engagement_metrics
  SET
    total_page_views = total_page_views + CASE WHEN NEW.activity_type = 'page_view' THEN 1 ELSE 0 END,
    total_product_views = total_product_views + CASE WHEN NEW.activity_type = 'product_view' THEN 1 ELSE 0 END,
    total_brand_views = total_brand_views + CASE WHEN NEW.activity_type = 'brand_view' THEN 1 ELSE 0 END,
    total_searches = total_searches + CASE WHEN NEW.activity_type = 'search' THEN 1 ELSE 0 END,
    total_filter_applications = total_filter_applications + CASE WHEN NEW.activity_type = 'filter' THEN 1 ELSE 0 END,
    total_clicks = total_clicks + CASE WHEN NEW.activity_type = 'click' THEN 1 ELSE 0 END,
    total_wishlist_adds = total_wishlist_adds + CASE WHEN NEW.activity_type = 'wishlist_add' THEN 1 ELSE 0 END,
    total_cart_adds = total_cart_adds + CASE WHEN NEW.activity_type = 'add_to_cart' THEN 1 ELSE 0 END,
    total_purchases = total_purchases + CASE WHEN NEW.activity_type = 'purchase' THEN 1 ELSE 0 END,
    last_activity_at = NEW.occurred_at,
    updated_at = CURRENT_TIMESTAMP
  WHERE user_id = NEW.user_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update metrics
DROP TRIGGER IF EXISTS trigger_update_shopper_engagement ON shopper_activity;
CREATE TRIGGER trigger_update_shopper_engagement
  AFTER INSERT ON shopper_activity
  FOR EACH ROW
  EXECUTE FUNCTION update_shopper_engagement_metrics();

-- ============================================================================
-- PART 9: PRIVACY COMPLIANCE FUNCTIONS
-- ============================================================================

-- Function to anonymize user data (GDPR right to be forgotten)
CREATE OR REPLACE FUNCTION anonymize_user_data(p_user_id INTEGER, p_reason VARCHAR)
RETURNS VOID AS $$
DECLARE
  v_records_count INTEGER;
BEGIN
  -- Start transaction
  BEGIN
    -- Anonymize shopper_activity
    UPDATE shopper_activity
    SET
      interaction_data = '{}'::jsonb,
      search_query = NULL,
      search_filters = NULL,
      anonymized = true,
      anonymized_at = CURRENT_TIMESTAMP
    WHERE user_id = p_user_id AND anonymized = false;

    GET DIAGNOSTICS v_records_count = ROW_COUNT;

    -- Log anonymization
    INSERT INTO data_anonymization_log (
      user_id,
      original_user_id,
      anonymization_reason,
      tables_affected,
      records_affected,
      fields_anonymized,
      automated,
      anonymized_at
    ) VALUES (
      p_user_id,
      p_user_id,
      p_reason,
      ARRAY['shopper_activity', 'users'],
      v_records_count,
      ARRAY['interaction_data', 'search_query', 'search_filters', 'email', 'username'],
      false,
      CURRENT_TIMESTAMP
    );

    -- Update user record
    UPDATE users
    SET
      email = 'anonymized_' || id || '@deleted.local',
      username = 'anonymized_' || id,
      full_name = NULL,
      profile_image_url = NULL,
      shopping_metadata = '{}'::jsonb,
      gdpr_delete_request = true,
      gdpr_delete_requested_at = CURRENT_TIMESTAMP
    WHERE id = p_user_id;

    RAISE NOTICE 'User % anonymized successfully. Records affected: %', p_user_id, v_records_count;
  END;
END;
$$ LANGUAGE plpgsql;

-- Function to check if user has given consent for data collection
CREATE OR REPLACE FUNCTION has_privacy_consent(p_user_id INTEGER, p_consent_type VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
  v_consent BOOLEAN;
BEGIN
  SELECT (privacy_consent->>p_consent_type)::BOOLEAN INTO v_consent
  FROM users
  WHERE id = p_user_id;

  RETURN COALESCE(v_consent, false);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PART 10: ANALYTICS VIEWS
-- ============================================================================

-- View: Active shoppers by segment
CREATE OR REPLACE VIEW active_shoppers_by_segment AS
SELECT
  s.segment_name,
  s.segment_key,
  COUNT(DISTINCT ssm.user_id) as shopper_count,
  AVG(sem.engagement_score) as avg_engagement_score,
  AVG(sem.conversion_rate) as avg_conversion_rate,
  SUM(sem.total_revenue_cents)::BIGINT as total_revenue_cents
FROM shopper_segments s
LEFT JOIN shopper_segment_membership ssm ON s.id = ssm.segment_id
LEFT JOIN shopper_engagement_metrics sem ON ssm.user_id = sem.user_id
WHERE s.is_active = true
  AND sem.last_activity_at >= CURRENT_TIMESTAMP - INTERVAL '30 days'
GROUP BY s.id, s.segment_name, s.segment_key
ORDER BY shopper_count DESC;

-- View: Shopper activity summary (last 7 days)
CREATE OR REPLACE VIEW shopper_activity_summary_7d AS
SELECT
  DATE(occurred_at) as activity_date,
  activity_type,
  activity_category,
  COUNT(*) as activity_count,
  COUNT(DISTINCT user_id) as unique_shoppers,
  COUNT(DISTINCT session_id) as unique_sessions,
  AVG(duration_seconds) as avg_duration_seconds
FROM shopper_activity
WHERE occurred_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY DATE(occurred_at), activity_type, activity_category
ORDER BY activity_date DESC, activity_count DESC;

-- View: Top engaged shoppers
CREATE OR REPLACE VIEW top_engaged_shoppers AS
SELECT
  u.id as user_id,
  u.email,
  u.username,
  sem.engagement_score,
  sem.total_sessions,
  sem.total_purchases,
  sem.total_revenue_cents,
  sem.conversion_rate,
  sem.last_activity_at,
  ARRAY_AGG(DISTINCT ss.segment_name) as segments
FROM users u
JOIN shopper_engagement_metrics sem ON u.id = sem.user_id
LEFT JOIN shopper_segment_membership ssm ON u.id = ssm.user_id
LEFT JOIN shopper_segments ss ON ssm.segment_id = ss.id
WHERE sem.engagement_score > 0
  AND sem.last_activity_at >= CURRENT_TIMESTAMP - INTERVAL '30 days'
GROUP BY u.id, u.email, u.username, sem.engagement_score, sem.total_sessions,
         sem.total_purchases, sem.total_revenue_cents, sem.conversion_rate, sem.last_activity_at
ORDER BY sem.engagement_score DESC
LIMIT 100;

-- ============================================================================
-- PART 11: SEED DEFAULT SHOPPER SEGMENTS
-- ============================================================================

INSERT INTO shopper_segments (segment_name, segment_key, description, criteria, priority) VALUES
  ('High-Value Frequent Shoppers', 'high_value_frequent', 'Shoppers with multiple purchases and high AOV', '{"min_purchases": 5, "min_revenue_cents": 50000, "days_since_last_purchase": 30}', 100),
  ('Window Shoppers', 'window_shopper', 'High engagement but low conversion', '{"min_sessions": 10, "max_purchases": 1, "min_product_views": 50}', 80),
  ('New Shoppers', 'new_shopper', 'Recently joined, less than 7 days', '{"max_days_since_first_activity": 7}', 90),
  ('Lapsed Shoppers', 'lapsed', 'Previously active but not engaged recently', '{"min_purchases": 1, "min_days_since_last_activity": 90}', 70),
  ('Power Users', 'power_user', 'Highly engaged across multiple dimensions', '{"min_sessions": 20, "min_purchases": 3, "min_engagement_score": 0.8}', 95),
  ('Cart Abandoners', 'cart_abandoner', 'Frequently add to cart but don''t purchase', '{"min_cart_adds": 5, "max_purchases": 1}', 85),
  ('Sale Hunters', 'sale_hunter', 'Only purchase during sales', '{"min_purchases": 2, "sale_only": true}', 75),
  ('Brand Loyalists', 'brand_loyalist', 'Repeatedly purchase from same brands', '{"min_purchases": 3, "brand_diversity_score": 0.3}', 80)
ON CONFLICT (segment_key) DO NOTHING;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE shopper_activity IS 'Real-time activity tracking for all logged-in shoppers with experiment integration';
COMMENT ON TABLE shopper_engagement_metrics IS 'Aggregated engagement metrics per shopper for segmentation and analytics';
COMMENT ON TABLE shopper_segments IS 'Customer segments based on behavior patterns';
COMMENT ON TABLE shopper_segment_membership IS 'Junction table tracking which shoppers belong to which segments';
COMMENT ON TABLE privacy_consent_log IS 'Audit trail of all privacy consent changes';
COMMENT ON TABLE data_anonymization_log IS 'Log of data anonymization operations for compliance';

COMMENT ON COLUMN users.privacy_consent IS 'User privacy consent settings (JSONB) for GDPR compliance';
COMMENT ON COLUMN users.shopping_metadata IS 'Shopping-specific metadata and preferences';
COMMENT ON COLUMN shopper_activity.experiment_id IS 'Links activity to A/B test experiment for analysis';
COMMENT ON COLUMN shopper_activity.variant_id IS 'Links activity to specific experiment variant';
COMMENT ON COLUMN shopper_activity.anonymized IS 'Whether PII has been stripped from this record';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Shopper Activity System migration complete!';
  RAISE NOTICE 'Created tables: shopper_activity, shopper_engagement_metrics, shopper_segments';
  RAISE NOTICE 'Created privacy tables: privacy_consent_log, data_anonymization_log';
  RAISE NOTICE 'Created views: active_shoppers_by_segment, shopper_activity_summary_7d, top_engaged_shoppers';
  RAISE NOTICE 'Seeded % default segments', (SELECT COUNT(*) FROM shopper_segments);
  RAISE NOTICE 'Integrated with experiment tracking system ✓';
END $$;
