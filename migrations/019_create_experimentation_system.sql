-- Migration: Experimentation & A/B Testing System
-- Enables explore-exploit optimization for recommendations, item ordering, and user experience

-- Table: experiments
-- Defines A/B tests and multi-armed bandit experiments
CREATE TABLE IF NOT EXISTS experiments (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  experiment_type VARCHAR(50) NOT NULL, -- 'ab_test', 'multivariate', 'bandit'

  -- Experiment scope
  target VARCHAR(100) NOT NULL, -- 'newsfeed', 'item_ordering', 'brand_ranking', 'recommendation_algo', 'ui_layout'

  -- Status
  status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'running', 'paused', 'completed', 'archived'

  -- Timing
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,

  -- Traffic allocation
  traffic_allocation DECIMAL(5,2) DEFAULT 100.00, -- % of users in experiment (0-100)

  -- Metrics to track
  primary_metric VARCHAR(100), -- 'click_through_rate', 'conversion_rate', 'engagement_time', 'add_to_cart_rate'
  secondary_metrics TEXT[], -- Additional metrics to monitor

  -- Configuration
  config JSONB, -- Experiment-specific configuration

  -- Results
  winner_variant_id INT, -- ID of winning variant (null if ongoing)
  statistical_significance DECIMAL(5,2), -- Confidence level (0-100)

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by INT REFERENCES users(id)
);

-- Table: experiment_variants
-- Different versions being tested in an experiment
CREATE TABLE IF NOT EXISTS experiment_variants (
  id SERIAL PRIMARY KEY,
  experiment_id INT NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,

  name VARCHAR(255) NOT NULL, -- 'control', 'variant_a', 'variant_b', etc.
  description TEXT,

  -- Traffic split
  traffic_weight INT DEFAULT 1, -- Relative weight for traffic allocation

  -- Variant configuration
  config JSONB NOT NULL, -- Variant-specific settings

  -- Performance tracking
  is_control BOOLEAN DEFAULT false,

  -- Multi-armed bandit specific
  pulls INT DEFAULT 0, -- Number of times this variant was shown
  rewards DECIMAL(10,2) DEFAULT 0, -- Total reward accumulated
  average_reward DECIMAL(10,4), -- Average reward per pull
  confidence_bound DECIMAL(10,4), -- Upper confidence bound (UCB)

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(experiment_id, name)
);

-- Table: user_experiment_assignments
-- Tracks which variant each user sees
CREATE TABLE IF NOT EXISTS user_experiment_assignments (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  experiment_id INT NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
  variant_id INT NOT NULL REFERENCES experiment_variants(id) ON DELETE CASCADE,

  -- Assignment metadata
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  session_id VARCHAR(255), -- For tracking within session

  -- Sticky assignment (user always sees same variant)
  is_sticky BOOLEAN DEFAULT true,

  UNIQUE(user_id, experiment_id)
);

-- Table: experiment_events
-- Tracks all user interactions for experiment analysis
CREATE TABLE IF NOT EXISTS experiment_events (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE SET NULL,
  experiment_id INT NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
  variant_id INT NOT NULL REFERENCES experiment_variants(id) ON DELETE CASCADE,

  -- Event details
  event_type VARCHAR(100) NOT NULL, -- 'impression', 'click', 'add_to_cart', 'purchase', 'engagement'
  event_name VARCHAR(255), -- Specific event name

  -- Context
  item_id INT REFERENCES items(id) ON DELETE SET NULL,
  brand_id INT REFERENCES brands(id) ON DELETE SET NULL,
  position INT, -- Position in list (1-indexed)
  module_id INT REFERENCES feed_modules(id) ON DELETE SET NULL,

  -- Event data
  event_data JSONB, -- Additional event-specific data

  -- Value tracking
  value DECIMAL(10,2), -- Monetary value (for purchases) or engagement score

  -- Session tracking
  session_id VARCHAR(255),

  -- Timestamp
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_experiment_events_experiment ON experiment_events(experiment_id);
CREATE INDEX IF NOT EXISTS idx_experiment_events_variant ON experiment_events(variant_id);
CREATE INDEX IF NOT EXISTS idx_experiment_events_user ON experiment_events(user_id);
CREATE INDEX IF NOT EXISTS idx_experiment_events_type ON experiment_events(event_type);
CREATE INDEX IF NOT EXISTS idx_experiment_events_created ON experiment_events(created_at);
CREATE INDEX IF NOT EXISTS idx_experiment_events_item_position ON experiment_events(item_id, position);

-- Table: bandit_arms
-- Multi-armed bandit arms for different optimization targets
CREATE TABLE IF NOT EXISTS bandit_arms (
  id SERIAL PRIMARY KEY,
  experiment_id INT NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,

  -- Arm identifier
  arm_type VARCHAR(100) NOT NULL, -- 'item', 'brand', 'category', 'algorithm'
  arm_id VARCHAR(255) NOT NULL, -- ID of the entity (item_id, brand_id, etc.)
  arm_name VARCHAR(255), -- Human-readable name

  -- Performance metrics (Thompson Sampling)
  alpha DECIMAL(10,2) DEFAULT 1, -- Beta distribution alpha (successes + 1)
  beta DECIMAL(10,2) DEFAULT 1, -- Beta distribution beta (failures + 1)

  -- Performance metrics (UCB)
  total_pulls INT DEFAULT 0,
  total_reward DECIMAL(10,2) DEFAULT 0,
  average_reward DECIMAL(10,4),

  -- Metadata
  metadata JSONB,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(experiment_id, arm_type, arm_id)
);

CREATE INDEX IF NOT EXISTS idx_bandit_arms_experiment ON bandit_arms(experiment_id);
CREATE INDEX IF NOT EXISTS idx_bandit_arms_type ON bandit_arms(arm_type);
CREATE INDEX IF NOT EXISTS idx_bandit_arms_avg_reward ON bandit_arms(average_reward DESC);

-- Table: position_performance
-- Tracks performance by position in feed/list
CREATE TABLE IF NOT EXISTS position_performance (
  id SERIAL PRIMARY KEY,
  experiment_id INT REFERENCES experiments(id) ON DELETE CASCADE,

  position INT NOT NULL,

  -- Metrics
  impressions INT DEFAULT 0,
  clicks INT DEFAULT 0,
  conversions INT DEFAULT 0,
  total_value DECIMAL(10,2) DEFAULT 0,

  -- Calculated metrics
  click_through_rate DECIMAL(5,4), -- CTR
  conversion_rate DECIMAL(5,4), -- CVR
  average_value DECIMAL(10,2), -- Avg value per impression

  -- Time window
  date DATE DEFAULT CURRENT_DATE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(experiment_id, position, date)
);

CREATE INDEX IF NOT EXISTS idx_position_performance_experiment ON position_performance(experiment_id);
CREATE INDEX IF NOT EXISTS idx_position_performance_position ON position_performance(position);
CREATE INDEX IF NOT EXISTS idx_position_performance_date ON position_performance(date);

-- Indexes for experiments table
CREATE INDEX IF NOT EXISTS idx_experiments_status ON experiments(status);
CREATE INDEX IF NOT EXISTS idx_experiments_type ON experiments(experiment_type);
CREATE INDEX IF NOT EXISTS idx_experiments_target ON experiments(target);
CREATE INDEX IF NOT EXISTS idx_experiments_dates ON experiments(start_date, end_date);

-- Indexes for variants table
CREATE INDEX IF NOT EXISTS idx_experiment_variants_experiment ON experiment_variants(experiment_id);
CREATE INDEX IF NOT EXISTS idx_experiment_variants_avg_reward ON experiment_variants(average_reward DESC);

-- Indexes for assignments table
CREATE INDEX IF NOT EXISTS idx_user_experiment_assignments_user ON user_experiment_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_experiment_assignments_experiment ON user_experiment_assignments(experiment_id);
CREATE INDEX IF NOT EXISTS idx_user_experiment_assignments_variant ON user_experiment_assignments(variant_id);

-- Triggers (idempotent)
DROP TRIGGER IF EXISTS update_experiments_updated_at ON experiments;
DROP TRIGGER IF EXISTS update_experiment_variants_updated_at ON experiment_variants;
DROP TRIGGER IF EXISTS update_bandit_arms_updated_at ON bandit_arms;
DROP TRIGGER IF EXISTS update_position_performance_updated_at ON position_performance;

CREATE TRIGGER update_experiments_updated_at
  BEFORE UPDATE ON experiments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_experiment_variants_updated_at
  BEFORE UPDATE ON experiment_variants
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bandit_arms_updated_at
  BEFORE UPDATE ON bandit_arms
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_position_performance_updated_at
  BEFORE UPDATE ON position_performance
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function: Get experiment performance summary
CREATE OR REPLACE FUNCTION get_experiment_performance(p_experiment_id INT)
RETURNS TABLE(
  variant_id INT,
  variant_name VARCHAR,
  impressions BIGINT,
  clicks BIGINT,
  conversions BIGINT,
  click_through_rate DECIMAL,
  conversion_rate DECIMAL,
  total_value DECIMAL,
  avg_value_per_user DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ev.id as variant_id,
    ev.name as variant_name,
    COUNT(*) FILTER (WHERE ee.event_type = 'impression') as impressions,
    COUNT(*) FILTER (WHERE ee.event_type = 'click') as clicks,
    COUNT(*) FILTER (WHERE ee.event_type = 'conversion') as conversions,
    ROUND(
      COUNT(*) FILTER (WHERE ee.event_type = 'click')::DECIMAL /
      NULLIF(COUNT(*) FILTER (WHERE ee.event_type = 'impression'), 0) * 100,
      2
    ) as click_through_rate,
    ROUND(
      COUNT(*) FILTER (WHERE ee.event_type = 'conversion')::DECIMAL /
      NULLIF(COUNT(*) FILTER (WHERE ee.event_type = 'click'), 0) * 100,
      2
    ) as conversion_rate,
    COALESCE(SUM(ee.value), 0) as total_value,
    ROUND(
      COALESCE(SUM(ee.value), 0) /
      NULLIF(COUNT(DISTINCT ee.user_id), 0),
      2
    ) as avg_value_per_user
  FROM experiment_variants ev
  LEFT JOIN experiment_events ee ON ev.id = ee.variant_id
  WHERE ev.experiment_id = p_experiment_id
  GROUP BY ev.id, ev.name
  ORDER BY ev.is_control DESC, impressions DESC;
END;
$$ LANGUAGE plpgsql;

-- Function: Update bandit arm performance
CREATE OR REPLACE FUNCTION update_bandit_arm_performance(
  p_arm_id INT,
  p_reward DECIMAL,
  p_success BOOLEAN
)
RETURNS VOID AS $$
BEGIN
  UPDATE bandit_arms
  SET
    total_pulls = total_pulls + 1,
    total_reward = total_reward + p_reward,
    average_reward = (total_reward + p_reward) / (total_pulls + 1),
    alpha = CASE WHEN p_success THEN alpha + 1 ELSE alpha END,
    beta = CASE WHEN NOT p_success THEN beta + 1 ELSE beta END,
    updated_at = CURRENT_TIMESTAMP
  WHERE id = p_arm_id;
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON TABLE experiments IS 'A/B tests and multi-armed bandit experiments';
COMMENT ON TABLE experiment_variants IS 'Different versions being tested in an experiment';
COMMENT ON TABLE user_experiment_assignments IS 'Tracks which variant each user sees (sticky assignments)';
COMMENT ON TABLE experiment_events IS 'All user interactions for experiment analysis';
COMMENT ON TABLE bandit_arms IS 'Multi-armed bandit arms for optimization';
COMMENT ON TABLE position_performance IS 'Performance metrics by position in feed/list';

COMMENT ON COLUMN experiments.experiment_type IS 'ab_test: traditional A/B, multivariate: multiple factors, bandit: explore-exploit';
COMMENT ON COLUMN experiments.target IS 'What is being tested: newsfeed, item_ordering, brand_ranking, recommendation_algo, ui_layout';
COMMENT ON COLUMN experiments.traffic_allocation IS 'Percentage of users included in experiment (0-100)';
COMMENT ON COLUMN experiment_variants.traffic_weight IS 'Relative weight for traffic split (e.g., 1:1:1 for equal split)';
COMMENT ON COLUMN bandit_arms.alpha IS 'Beta distribution alpha parameter (successes + 1) for Thompson Sampling';
COMMENT ON COLUMN bandit_arms.beta IS 'Beta distribution beta parameter (failures + 1) for Thompson Sampling';
