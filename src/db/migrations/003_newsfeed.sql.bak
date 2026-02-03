-- Newsfeed Schema
-- Created: 2026-01-31
-- Purpose: Brand stories (top carousel) and feed modules (personalized content)

-- =====================================================
-- BRAND_STORIES TABLE
-- Instagram-style stories for sales, edits, new arrivals
-- =====================================================
CREATE TABLE brand_stories (
  id SERIAL PRIMARY KEY,
  brand_id INTEGER NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  title VARCHAR(100) NOT NULL,
  story_type VARCHAR(50) NOT NULL, -- 'sale', 'edit', 'new_arrivals', 'collection'
  thumbnail_url TEXT NOT NULL,
  background_color VARCHAR(20) DEFAULT '#FFFFFF',
  text_color VARCHAR(20) DEFAULT '#000000',
  priority INTEGER DEFAULT 0, -- Higher priority = shown first
  starts_at TIMESTAMP WITH TIME ZONE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  metadata JSONB DEFAULT '{}', -- Sale percentage, collection name, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_stories_brand ON brand_stories(brand_id);
CREATE INDEX idx_stories_active ON brand_stories(is_active);
CREATE INDEX idx_stories_expires ON brand_stories(expires_at);
CREATE INDEX idx_stories_priority ON brand_stories(priority DESC);

-- =====================================================
-- BRAND_STORY_FRAMES TABLE
-- Individual frames/slides within a story
-- =====================================================
CREATE TABLE brand_story_frames (
  id SERIAL PRIMARY KEY,
  story_id INTEGER NOT NULL REFERENCES brand_stories(id) ON DELETE CASCADE,
  frame_order INTEGER NOT NULL,
  image_url TEXT NOT NULL,
  caption TEXT,
  cta_text VARCHAR(50), -- "Shop Now", "View Collection"
  cta_url TEXT,
  item_ids JSONB DEFAULT '[]', -- Array of item IDs featured in this frame
  duration_seconds INTEGER DEFAULT 5,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_story_frames_story ON brand_story_frames(story_id);
CREATE INDEX idx_story_frames_order ON brand_story_frames(story_id, frame_order);

-- =====================================================
-- FEED_MODULES TABLE
-- Time-based content modules for personalized feed
-- =====================================================
CREATE TABLE feed_modules (
  id SERIAL PRIMARY KEY,
  brand_id INTEGER NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL, -- "Abercrombie Ski Edit", "Nordstrom Rack Spring Dresses"
  subtitle VARCHAR(200), -- Additional context
  module_type VARCHAR(50) NOT NULL, -- 'seasonal_edit', 'new_arrivals', 'sale', 'trending', 'curated'
  starts_at TIMESTAMP WITH TIME ZONE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  priority INTEGER DEFAULT 0,
  target_audience JSONB DEFAULT '{}', -- Criteria for who should see this (style preferences, etc.)
  metadata JSONB DEFAULT '{}', -- Season, collection info, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_modules_brand ON feed_modules(brand_id);
CREATE INDEX idx_modules_active ON feed_modules(is_active);
CREATE INDEX idx_modules_dates ON feed_modules(starts_at, expires_at);
CREATE INDEX idx_modules_priority ON feed_modules(priority DESC);
CREATE INDEX idx_modules_audience ON feed_modules USING GIN(target_audience);

-- =====================================================
-- FEED_MODULE_ITEMS TABLE
-- Items displayed in feed module carousels
-- =====================================================
CREATE TABLE feed_module_items (
  id SERIAL PRIMARY KEY,
  module_id INTEGER NOT NULL REFERENCES feed_modules(id) ON DELETE CASCADE,
  item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  display_order INTEGER NOT NULL,
  is_featured BOOLEAN DEFAULT FALSE, -- Highlighted/hero item in carousel
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(module_id, item_id)
);

CREATE INDEX idx_module_items_module ON feed_module_items(module_id);
CREATE INDEX idx_module_items_item ON feed_module_items(item_id);
CREATE INDEX idx_module_items_order ON feed_module_items(module_id, display_order);
CREATE INDEX idx_module_items_featured ON feed_module_items(is_featured);

-- =====================================================
-- USER_STORY_VIEWS TABLE
-- Track which stories users have viewed
-- =====================================================
CREATE TABLE user_story_views (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  story_id INTEGER NOT NULL REFERENCES brand_stories(id) ON DELETE CASCADE,
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  frames_viewed INTEGER DEFAULT 0, -- How many frames they saw
  completed BOOLEAN DEFAULT FALSE, -- Whether they watched the whole story
  UNIQUE(user_id, story_id)
);

CREATE INDEX idx_story_views_user ON user_story_views(user_id);
CREATE INDEX idx_story_views_story ON user_story_views(story_id);
CREATE INDEX idx_story_views_timestamp ON user_story_views(viewed_at);

-- =====================================================
-- USER_MODULE_INTERACTIONS TABLE
-- Track engagement with feed modules
-- =====================================================
CREATE TABLE user_module_interactions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  module_id INTEGER NOT NULL REFERENCES feed_modules(id) ON DELETE CASCADE,
  interaction_type VARCHAR(50) NOT NULL, -- 'view', 'swipe', 'item_click', 'dismiss'
  item_id INTEGER REFERENCES items(id) ON DELETE SET NULL, -- If clicked on specific item
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_module_interactions_user ON user_module_interactions(user_id);
CREATE INDEX idx_module_interactions_module ON user_module_interactions(module_id);
CREATE INDEX idx_module_interactions_type ON user_module_interactions(interaction_type);
CREATE INDEX idx_module_interactions_timestamp ON user_module_interactions(created_at);

-- =====================================================
-- AUTOMATIC TIMESTAMP UPDATES
-- =====================================================
CREATE TRIGGER update_stories_updated_at
  BEFORE UPDATE ON brand_stories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_modules_updated_at
  BEFORE UPDATE ON feed_modules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to get active stories for brands user follows
CREATE OR REPLACE FUNCTION get_user_stories(p_user_id INTEGER)
RETURNS TABLE(
  story_id INTEGER,
  brand_id INTEGER,
  brand_name VARCHAR,
  brand_logo TEXT,
  title VARCHAR,
  story_type VARCHAR,
  thumbnail_url TEXT,
  background_color VARCHAR,
  text_color VARCHAR,
  priority INTEGER,
  expires_at TIMESTAMP WITH TIME ZONE,
  viewed BOOLEAN,
  frame_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id as story_id,
    s.brand_id,
    b.name as brand_name,
    b.logo_url as brand_logo,
    s.title,
    s.story_type,
    s.thumbnail_url,
    s.background_color,
    s.text_color,
    s.priority,
    s.expires_at,
    EXISTS(SELECT 1 FROM user_story_views usv WHERE usv.user_id = p_user_id AND usv.story_id = s.id) as viewed,
    COUNT(sf.id) as frame_count
  FROM brand_stories s
  JOIN brands b ON s.brand_id = b.id
  JOIN user_brand_follows ubf ON b.id = ubf.brand_id
  LEFT JOIN brand_story_frames sf ON s.id = sf.story_id
  WHERE ubf.user_id = p_user_id
    AND s.is_active = TRUE
    AND s.starts_at <= CURRENT_TIMESTAMP
    AND s.expires_at > CURRENT_TIMESTAMP
  GROUP BY s.id, b.id, b.name, b.logo_url
  ORDER BY
    -- Unviewed stories first
    (SELECT COUNT(*) FROM user_story_views usv2 WHERE usv2.user_id = p_user_id AND usv2.story_id = s.id) ASC,
    -- Then by priority
    s.priority DESC,
    -- Then by recency
    s.starts_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get personalized feed modules
CREATE OR REPLACE FUNCTION get_user_feed_modules(
  p_user_id INTEGER,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE(
  module_id INTEGER,
  brand_id INTEGER,
  brand_name VARCHAR,
  brand_logo TEXT,
  title VARCHAR,
  subtitle VARCHAR,
  module_type VARCHAR,
  expires_at TIMESTAMP WITH TIME ZONE,
  item_count BIGINT,
  priority INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id as module_id,
    m.brand_id,
    b.name as brand_name,
    b.logo_url as brand_logo,
    m.title,
    m.subtitle,
    m.module_type,
    m.expires_at,
    COUNT(DISTINCT fmi.item_id) as item_count,
    m.priority
  FROM feed_modules m
  JOIN brands b ON m.brand_id = b.id
  JOIN user_brand_follows ubf ON b.id = ubf.brand_id
  LEFT JOIN feed_module_items fmi ON m.id = fmi.module_id
  WHERE ubf.user_id = p_user_id
    AND m.is_active = TRUE
    AND m.starts_at <= CURRENT_TIMESTAMP
    AND m.expires_at > CURRENT_TIMESTAMP
  GROUP BY m.id, b.id, b.name, b.logo_url
  ORDER BY
    -- Priority first
    m.priority DESC,
    -- Then by recency
    m.starts_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Function to get items for a specific module
CREATE OR REPLACE FUNCTION get_module_items(p_module_id INTEGER)
RETURNS TABLE(
  item_id INTEGER,
  canonical_name VARCHAR,
  description TEXT,
  category VARCHAR,
  primary_image_url TEXT,
  min_price DECIMAL,
  sale_price DECIMAL,
  is_featured BOOLEAN,
  display_order INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    i.id as item_id,
    i.canonical_name,
    i.description,
    i.category,
    i.primary_image_url,
    MIN(il.price) as min_price,
    MIN(il.sale_price) as sale_price,
    fmi.is_featured,
    fmi.display_order
  FROM feed_module_items fmi
  JOIN items i ON fmi.item_id = i.id
  LEFT JOIN item_listings il ON i.id = il.item_id AND il.in_stock = TRUE
  WHERE fmi.module_id = p_module_id
    AND i.is_active = TRUE
  GROUP BY i.id, fmi.is_featured, fmi.display_order
  ORDER BY fmi.display_order ASC;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE brand_stories IS 'Instagram-style stories for brand announcements (sales, edits, new arrivals)';
COMMENT ON TABLE brand_story_frames IS 'Individual slides/frames within a brand story';
COMMENT ON TABLE feed_modules IS 'Time-based content modules for personalized feed (carousels)';
COMMENT ON TABLE feed_module_items IS 'Items displayed within feed module carousels';
COMMENT ON TABLE user_story_views IS 'Tracks which stories users have viewed';
COMMENT ON TABLE user_module_interactions IS 'Tracks user engagement with feed modules';

COMMENT ON COLUMN brand_stories.story_type IS 'Type: sale, edit, new_arrivals, collection';
COMMENT ON COLUMN brand_stories.priority IS 'Higher number = shown first in story carousel';
COMMENT ON COLUMN feed_modules.module_type IS 'Type: seasonal_edit, new_arrivals, sale, trending, curated';
COMMENT ON COLUMN feed_modules.target_audience IS 'JSONB criteria for targeting (style preferences, demographics)';
COMMENT ON COLUMN user_story_views.completed IS 'Whether user watched all frames of the story';
