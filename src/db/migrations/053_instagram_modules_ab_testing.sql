-- Migration: AB Testing Integration for Instagram-Style Modules
-- Version: 053
-- Description: Extends experimentation system to support module-level A/B testing
-- Created: 2026-02-04

-- ============================================================================
-- 1. Extend feed_modules table for experiment tracking
-- ============================================================================

-- Link modules to experiments
ALTER TABLE feed_modules
  ADD COLUMN experiment_id INTEGER REFERENCES experiments(id),
  ADD COLUMN default_variant_id INTEGER REFERENCES experiment_variants(id);

COMMENT ON COLUMN feed_modules.experiment_id IS 'Optional experiment this module participates in';
COMMENT ON COLUMN feed_modules.default_variant_id IS 'Default variant if user is not assigned to experiment';

-- Create index for experiment queries
CREATE INDEX idx_feed_modules_experiment ON feed_modules(experiment_id) WHERE experiment_id IS NOT NULL;

-- ============================================================================
-- 2. Module Performance Metrics Table
-- ============================================================================

CREATE TABLE module_performance_metrics (
  id SERIAL PRIMARY KEY,
  module_id INTEGER NOT NULL REFERENCES feed_modules(id) ON DELETE CASCADE,
  variant_id INTEGER REFERENCES experiment_variants(id) ON DELETE SET NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Engagement metrics
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  swipes INTEGER DEFAULT 0,
  items_clicked INTEGER DEFAULT 0,
  unique_viewers INTEGER DEFAULT 0,

  -- Time metrics
  avg_view_duration_seconds DECIMAL(10,2),
  total_view_time_seconds BIGINT DEFAULT 0,

  -- Conversion metrics
  conversions INTEGER DEFAULT 0,
  conversion_rate DECIMAL(5,4),
  revenue_cents BIGINT DEFAULT 0,

  -- Calculated fields
  click_through_rate DECIMAL(5,4),
  engagement_rate DECIMAL(5,4),

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(module_id, variant_id, date)
);

CREATE INDEX idx_module_metrics_module ON module_performance_metrics(module_id, date DESC);
CREATE INDEX idx_module_metrics_variant ON module_performance_metrics(variant_id, date DESC);
CREATE INDEX idx_module_metrics_date ON module_performance_metrics(date DESC);

COMMENT ON TABLE module_performance_metrics IS 'Daily aggregated performance metrics for feed modules by variant';

-- ============================================================================
-- 3. Recommendation Tab Metrics Table
-- ============================================================================

CREATE TABLE recommendation_tab_metrics (
  id SERIAL PRIMARY KEY,
  tab_key VARCHAR(50) NOT NULL,
  variant_id INTEGER REFERENCES experiment_variants(id) ON DELETE SET NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Engagement metrics
  views INTEGER DEFAULT 0,
  item_clicks INTEGER DEFAULT 0,
  unique_users INTEGER DEFAULT 0,

  -- Session metrics
  avg_items_per_session DECIMAL(10,2),
  avg_session_duration_seconds DECIMAL(10,2),

  -- Conversion metrics
  conversions INTEGER DEFAULT 0,
  conversion_rate DECIMAL(5,4),

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(tab_key, variant_id, date)
);

CREATE INDEX idx_tab_metrics_key ON recommendation_tab_metrics(tab_key, date DESC);
CREATE INDEX idx_tab_metrics_variant ON recommendation_tab_metrics(variant_id, date DESC);

COMMENT ON TABLE recommendation_tab_metrics IS 'Daily aggregated metrics for recommendation tabs by variant';

-- ============================================================================
-- 4. Module Interaction Events (Detailed Tracking)
-- ============================================================================

-- Extend existing user_module_interactions table
ALTER TABLE user_module_interactions
  ADD COLUMN variant_id INTEGER REFERENCES experiment_variants(id),
  ADD COLUMN experiment_id INTEGER REFERENCES experiments(id),
  ADD COLUMN session_id VARCHAR(100),
  ADD COLUMN duration_seconds INTEGER,
  ADD COLUMN metadata JSONB DEFAULT '{}';

CREATE INDEX idx_module_interactions_experiment ON user_module_interactions(experiment_id, variant_id);
CREATE INDEX idx_module_interactions_session ON user_module_interactions(session_id) WHERE session_id IS NOT NULL;

COMMENT ON COLUMN user_module_interactions.variant_id IS 'Variant shown to user during this interaction';
COMMENT ON COLUMN user_module_interactions.experiment_id IS 'Experiment active during this interaction';
COMMENT ON COLUMN user_module_interactions.session_id IS 'User session identifier for grouping interactions';
COMMENT ON COLUMN user_module_interactions.duration_seconds IS 'How long user viewed the module';
COMMENT ON COLUMN user_module_interactions.metadata IS 'Additional context (position, scroll depth, etc)';

-- ============================================================================
-- 5. Functions for Metric Aggregation
-- ============================================================================

-- Function to aggregate module metrics for a given date
CREATE OR REPLACE FUNCTION aggregate_module_metrics(target_date DATE DEFAULT CURRENT_DATE)
RETURNS void AS $$
BEGIN
  INSERT INTO module_performance_metrics (
    module_id,
    variant_id,
    date,
    impressions,
    clicks,
    swipes,
    items_clicked,
    unique_viewers,
    avg_view_duration_seconds,
    total_view_time_seconds,
    click_through_rate,
    engagement_rate
  )
  SELECT
    module_id,
    variant_id,
    target_date,
    COUNT(*) FILTER (WHERE interaction_type = 'view') as impressions,
    COUNT(*) FILTER (WHERE interaction_type = 'item_click') as clicks,
    COUNT(*) FILTER (WHERE interaction_type = 'swipe') as swipes,
    COUNT(DISTINCT item_id) FILTER (WHERE interaction_type = 'item_click') as items_clicked,
    COUNT(DISTINCT user_id) as unique_viewers,
    AVG(duration_seconds) FILTER (WHERE duration_seconds IS NOT NULL) as avg_view_duration_seconds,
    SUM(duration_seconds) FILTER (WHERE duration_seconds IS NOT NULL) as total_view_time_seconds,
    CASE
      WHEN COUNT(*) FILTER (WHERE interaction_type = 'view') > 0
      THEN CAST(COUNT(*) FILTER (WHERE interaction_type = 'item_click') AS DECIMAL) /
           COUNT(*) FILTER (WHERE interaction_type = 'view')
      ELSE 0
    END as click_through_rate,
    CASE
      WHEN COUNT(DISTINCT user_id) > 0
      THEN CAST(COUNT(*) FILTER (WHERE interaction_type IN ('item_click', 'swipe')) AS DECIMAL) /
           COUNT(DISTINCT user_id)
      ELSE 0
    END as engagement_rate
  FROM user_module_interactions
  WHERE DATE(interacted_at) = target_date
  GROUP BY module_id, variant_id
  ON CONFLICT (module_id, variant_id, date)
  DO UPDATE SET
    impressions = EXCLUDED.impressions,
    clicks = EXCLUDED.clicks,
    swipes = EXCLUDED.swipes,
    items_clicked = EXCLUDED.items_clicked,
    unique_viewers = EXCLUDED.unique_viewers,
    avg_view_duration_seconds = EXCLUDED.avg_view_duration_seconds,
    total_view_time_seconds = EXCLUDED.total_view_time_seconds,
    click_through_rate = EXCLUDED.click_through_rate,
    engagement_rate = EXCLUDED.engagement_rate,
    updated_at = CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION aggregate_module_metrics IS 'Aggregates daily module performance metrics from interaction events';

-- ============================================================================
-- 6. Helper Function: Get Module Experiment Assignment
-- ============================================================================

CREATE OR REPLACE FUNCTION get_module_experiment_assignment(
  p_user_id INTEGER,
  p_module_id INTEGER
)
RETURNS TABLE (
  experiment_id INTEGER,
  variant_id INTEGER,
  variant_name VARCHAR,
  variant_config JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id as experiment_id,
    uea.variant_id,
    ev.name as variant_name,
    ev.config as variant_config
  FROM feed_modules fm
  JOIN experiments e ON fm.experiment_id = e.id
  LEFT JOIN user_experiment_assignments uea ON
    uea.user_id = p_user_id AND
    uea.experiment_id = e.id
  LEFT JOIN experiment_variants ev ON uea.variant_id = ev.id
  WHERE fm.id = p_module_id
    AND fm.experiment_id IS NOT NULL
    AND e.status = 'active'
    AND e.start_date <= CURRENT_TIMESTAMP
    AND (e.end_date IS NULL OR e.end_date >= CURRENT_TIMESTAMP);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_module_experiment_assignment IS 'Get user''s experiment assignment for a specific module';

-- ============================================================================
-- 7. Sample Experiments for Testing
-- ============================================================================

-- Example: Layout Type Test
INSERT INTO experiments (
  name,
  description,
  experiment_type,
  status,
  start_date,
  target_sample_size,
  metadata
) VALUES (
  'Module Layout Test - Hero vs Grid',
  'Test whether hero_carousel or featured_grid layout performs better',
  'module_layout',
  'draft',
  CURRENT_TIMESTAMP,
  1000,
  '{"metric": "click_through_rate", "min_effect_size": 0.05}'::jsonb
) ON CONFLICT DO NOTHING;

-- Add variants for layout test
INSERT INTO experiment_variants (
  experiment_id,
  name,
  description,
  traffic_percentage,
  config
)
SELECT
  id,
  'Control - Hero Carousel',
  'Original hero carousel layout with large banner',
  50,
  '{"layout_type": "hero_carousel", "items_per_view": 3}'::jsonb
FROM experiments
WHERE name = 'Module Layout Test - Hero vs Grid'
ON CONFLICT DO NOTHING;

INSERT INTO experiment_variants (
  experiment_id,
  name,
  description,
  traffic_percentage,
  config
)
SELECT
  id,
  'Variant A - Featured Grid',
  'Asymmetric grid with featured item',
  50,
  '{"layout_type": "featured_grid", "items_per_view": 4}'::jsonb
FROM experiments
WHERE name = 'Module Layout Test - Hero vs Grid'
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 8. Trigger for Auto-updating Timestamps
-- ============================================================================

CREATE OR REPLACE FUNCTION update_module_metrics_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_module_metrics_timestamp
BEFORE UPDATE ON module_performance_metrics
FOR EACH ROW
EXECUTE FUNCTION update_module_metrics_timestamp();

CREATE TRIGGER trigger_update_tab_metrics_timestamp
BEFORE UPDATE ON recommendation_tab_metrics
FOR EACH ROW
EXECUTE FUNCTION update_module_metrics_timestamp();

-- ============================================================================
-- 9. Grants (if needed)
-- ============================================================================

-- Grant permissions to application user
-- GRANT SELECT, INSERT, UPDATE ON module_performance_metrics TO muse_app_user;
-- GRANT SELECT, INSERT, UPDATE ON recommendation_tab_metrics TO muse_app_user;
-- GRANT USAGE ON SEQUENCE module_performance_metrics_id_seq TO muse_app_user;
-- GRANT USAGE ON SEQUENCE recommendation_tab_metrics_id_seq TO muse_app_user;

-- ============================================================================
-- Migration Complete
-- ============================================================================

-- Verify migration
DO $$
BEGIN
  RAISE NOTICE 'Migration 053 completed successfully';
  RAISE NOTICE '- Added experiment_id and default_variant_id to feed_modules';
  RAISE NOTICE '- Created module_performance_metrics table';
  RAISE NOTICE '- Created recommendation_tab_metrics table';
  RAISE NOTICE '- Extended user_module_interactions with variant tracking';
  RAISE NOTICE '- Added aggregation functions';
  RAISE NOTICE '- Created sample experiment';
END $$;
