-- Recommendation Tabs System
-- Created: 2026-02-04
-- Purpose: Brand-agnostic tabbed recommendation module for homepage (Nordstrom-style)

-- =====================================================
-- RECOMMENDATION_TABS TABLE
-- Defines tabs for the recommendation module
-- =====================================================
CREATE TABLE IF NOT EXISTS recommendation_tabs (
  id SERIAL PRIMARY KEY,
  tab_key VARCHAR(50) NOT NULL UNIQUE, -- 'recommended', 'new_arrivals', 'trending', 'sale', 'under_100'
  display_name VARCHAR(100) NOT NULL, -- "Recommended for You", "New Arrivals", "Trending Now"
  icon VARCHAR(50), -- Optional icon identifier
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  metadata JSONB DEFAULT '{}', -- Additional configuration
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_recommendation_tabs_active ON recommendation_tabs(is_active);
CREATE INDEX idx_recommendation_tabs_order ON recommendation_tabs(display_order ASC);

-- =====================================================
-- USER_TAB_PREFERENCES TABLE
-- Track which tabs users interact with most
-- =====================================================
CREATE TABLE IF NOT EXISTS user_tab_preferences (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tab_key VARCHAR(50) NOT NULL,
  view_count INTEGER DEFAULT 0,
  last_viewed_at TIMESTAMP WITH TIME ZONE,
  items_clicked INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, tab_key)
);

CREATE INDEX idx_user_tab_prefs_user ON user_tab_preferences(user_id);
CREATE INDEX idx_user_tab_prefs_tab ON user_tab_preferences(tab_key);

-- =====================================================
-- AUTOMATIC TIMESTAMP UPDATES
-- =====================================================
CREATE TRIGGER update_recommendation_tabs_updated_at
  BEFORE UPDATE ON recommendation_tabs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_tab_prefs_updated_at
  BEFORE UPDATE ON user_tab_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- SEED DATA - Default Tabs
-- =====================================================
INSERT INTO recommendation_tabs (tab_key, display_name, display_order, is_active) VALUES
  ('recommended', 'For You', 1, true),
  ('new_arrivals', 'New Arrivals', 2, true),
  ('trending', 'Trending', 3, true),
  ('sale', 'Sale', 4, true),
  ('under_100', 'Under $100', 5, true),
  ('designer', 'Designer', 6, true)
ON CONFLICT (tab_key) DO NOTHING;

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE recommendation_tabs IS 'Tabs for brand-agnostic homepage recommendation module';
COMMENT ON TABLE user_tab_preferences IS 'Tracks user interaction with recommendation tabs';
COMMENT ON COLUMN recommendation_tabs.tab_key IS 'Unique identifier for the tab';
COMMENT ON COLUMN recommendation_tabs.display_name IS 'User-facing tab label';
