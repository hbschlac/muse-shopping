-- Migration: Instagram Analysis System
-- Analyzes user's Instagram following to understand style preferences

-- Table: fashion_influencers
-- Stores known fashion influencers and their style profiles
CREATE TABLE IF NOT EXISTS fashion_influencers (
  id SERIAL PRIMARY KEY,
  instagram_user_id VARCHAR(255) UNIQUE NOT NULL, -- Instagram user ID
  username VARCHAR(255) UNIQUE NOT NULL, -- @username
  display_name VARCHAR(255),
  profile_picture_url TEXT,
  follower_count INT,
  following_count INT,
  media_count INT,
  biography TEXT,

  -- Fashion classification
  is_fashion_influencer BOOLEAN DEFAULT false,
  influencer_tier VARCHAR(50), -- 'mega' (1M+), 'macro' (100K-1M), 'micro' (10K-100K), 'nano' (1K-10K)
  confidence_score DECIMAL(5,2), -- 0-100, how confident we are they're fashion-focused

  -- Style profile (analyzed from their content)
  primary_categories JSONB, -- {"dresses": 45, "tops": 30, "shoes": 15}
  aesthetic_tags TEXT[], -- ["minimalist", "streetwear", "luxury", "vintage"]
  color_palette JSONB, -- {"black": 35, "white": 25, "beige": 20}
  price_tier VARCHAR(50), -- 'luxury', 'premium', 'mid-range', 'budget'
  brand_affiliations TEXT[], -- Brands they frequently feature

  -- Analysis metadata
  last_analyzed_at TIMESTAMP WITH TIME ZONE,
  posts_analyzed INT DEFAULT 0,
  analysis_version VARCHAR(20), -- Track which analysis algorithm version

  -- Engagement metrics
  avg_likes INT,
  avg_comments INT,
  engagement_rate DECIMAL(5,2),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: user_instagram_follows
-- Tracks which influencers each user follows
CREATE TABLE IF NOT EXISTS user_instagram_follows (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  influencer_id INT NOT NULL REFERENCES fashion_influencers(id) ON DELETE CASCADE,

  -- Following metadata
  followed_at TIMESTAMP WITH TIME ZONE,
  discovered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, -- When we discovered they follow this person

  -- Weight for recommendations (how much this should influence recommendations)
  influence_weight DECIMAL(5,2) DEFAULT 1.0, -- Can be adjusted based on engagement

  UNIQUE(user_id, influencer_id)
);

-- Table: instagram_style_insights
-- Aggregated style insights derived from users' Instagram follows
CREATE TABLE IF NOT EXISTS instagram_style_insights (
  id SERIAL PRIMARY KEY,
  user_id INT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Aggregated from followed influencers
  top_categories JSONB, -- {"dresses": 85, "tops": 72, "shoes": 45}
  aesthetic_preferences TEXT[], -- ["minimalist", "streetwear", "luxury"]
  preferred_colors JSONB, -- {"black": 65, "white": 55, "beige": 40}
  price_tier_preference VARCHAR(50), -- 'luxury', 'premium', 'mid-range', 'budget'
  favorite_brands TEXT[], -- Brands frequently featured by followed influencers

  -- Influence metrics
  total_influencers_followed INT DEFAULT 0,
  fashion_influencers_followed INT DEFAULT 0,
  avg_influencer_tier VARCHAR(50), -- Average tier of followed influencers

  -- Analysis metadata
  last_synced_at TIMESTAMP WITH TIME ZONE,
  sync_status VARCHAR(50), -- 'pending', 'in_progress', 'completed', 'failed'
  posts_analyzed INT DEFAULT 0,

  -- Confidence scores
  category_confidence DECIMAL(5,2), -- How confident we are in category preferences
  aesthetic_confidence DECIMAL(5,2),
  overall_confidence DECIMAL(5,2),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: instagram_sync_jobs
-- Tracks Instagram analysis jobs for async processing
CREATE TABLE IF NOT EXISTS instagram_sync_jobs (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_type VARCHAR(50) NOT NULL, -- 'full_analysis', 'incremental_update', 'influencer_discovery'

  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  progress INT DEFAULT 0, -- 0-100 percentage

  -- Job details
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,

  -- Results
  influencers_discovered INT DEFAULT 0,
  influencers_analyzed INT DEFAULT 0,
  posts_analyzed INT DEFAULT 0,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_fashion_influencers_username ON fashion_influencers(username);
CREATE INDEX IF NOT EXISTS idx_fashion_influencers_is_fashion ON fashion_influencers(is_fashion_influencer);
CREATE INDEX IF NOT EXISTS idx_fashion_influencers_tier ON fashion_influencers(influencer_tier);
CREATE INDEX IF NOT EXISTS idx_fashion_influencers_confidence ON fashion_influencers(confidence_score DESC);

CREATE INDEX IF NOT EXISTS idx_user_instagram_follows_user ON user_instagram_follows(user_id);
CREATE INDEX IF NOT EXISTS idx_user_instagram_follows_influencer ON user_instagram_follows(influencer_id);

CREATE INDEX IF NOT EXISTS idx_instagram_style_insights_user ON instagram_style_insights(user_id);
CREATE INDEX IF NOT EXISTS idx_instagram_style_insights_sync_status ON instagram_style_insights(sync_status);

CREATE INDEX IF NOT EXISTS idx_instagram_sync_jobs_user ON instagram_sync_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_instagram_sync_jobs_status ON instagram_sync_jobs(status);

-- Triggers for updated_at
CREATE TRIGGER update_fashion_influencers_updated_at
  BEFORE UPDATE ON fashion_influencers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_instagram_style_insights_updated_at
  BEFORE UPDATE ON instagram_style_insights
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_instagram_sync_jobs_updated_at
  BEFORE UPDATE ON instagram_sync_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function: Calculate user's style profile from Instagram follows
CREATE OR REPLACE FUNCTION calculate_instagram_style_profile(p_user_id INT)
RETURNS TABLE(
  categories JSONB,
  aesthetics TEXT[],
  colors JSONB,
  price_tier VARCHAR,
  brands TEXT[],
  confidence DECIMAL
) AS $$
DECLARE
  v_influencer_count INT;
BEGIN
  -- Get count of fashion influencers followed
  SELECT COUNT(*) INTO v_influencer_count
  FROM user_instagram_follows uif
  JOIN fashion_influencers fi ON uif.influencer_id = fi.id
  WHERE uif.user_id = p_user_id
    AND fi.is_fashion_influencer = true;

  -- Return aggregated style profile
  RETURN QUERY
  SELECT
    -- Aggregate categories (weighted average)
    jsonb_object_agg(
      category_key,
      ROUND(AVG(category_value::numeric) * uif.influence_weight, 2)
    ) AS categories,

    -- Aggregate aesthetic tags (unique, sorted by frequency)
    ARRAY_AGG(DISTINCT aesthetic ORDER BY aesthetic) AS aesthetics,

    -- Aggregate colors (weighted average)
    jsonb_object_agg(
      color_key,
      ROUND(AVG(color_value::numeric) * uif.influence_weight, 2)
    ) AS colors,

    -- Most common price tier
    MODE() WITHIN GROUP (ORDER BY fi.price_tier) AS price_tier,

    -- Aggregate brands (unique)
    ARRAY_AGG(DISTINCT brand) AS brands,

    -- Calculate confidence based on number of influencers
    CASE
      WHEN v_influencer_count >= 10 THEN 95.0
      WHEN v_influencer_count >= 5 THEN 80.0
      WHEN v_influencer_count >= 3 THEN 60.0
      WHEN v_influencer_count >= 1 THEN 40.0
      ELSE 0.0
    END AS confidence
  FROM user_instagram_follows uif
  JOIN fashion_influencers fi ON uif.influencer_id = fi.id
  CROSS JOIN LATERAL jsonb_each_text(fi.primary_categories) AS cats(category_key, category_value)
  CROSS JOIN LATERAL jsonb_each_text(fi.color_palette) AS cols(color_key, color_value)
  CROSS JOIN LATERAL UNNEST(fi.aesthetic_tags) AS aesthetic
  CROSS JOIN LATERAL UNNEST(fi.brand_affiliations) AS brand
  WHERE uif.user_id = p_user_id
    AND fi.is_fashion_influencer = true
  GROUP BY fi.price_tier;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE fashion_influencers IS 'Known fashion influencers with analyzed style profiles';
COMMENT ON TABLE user_instagram_follows IS 'Tracks which fashion influencers each user follows';
COMMENT ON TABLE instagram_style_insights IS 'Aggregated style insights from users Instagram follows';
COMMENT ON TABLE instagram_sync_jobs IS 'Async jobs for Instagram analysis';

COMMENT ON COLUMN fashion_influencers.influencer_tier IS 'mega: 1M+, macro: 100K-1M, micro: 10K-100K, nano: 1K-10K followers';
COMMENT ON COLUMN fashion_influencers.confidence_score IS 'Confidence (0-100) that this account is fashion-focused';
COMMENT ON COLUMN fashion_influencers.aesthetic_tags IS 'Style aesthetics: minimalist, streetwear, luxury, vintage, etc.';
COMMENT ON COLUMN fashion_influencers.price_tier IS 'Price range of featured items: luxury, premium, mid-range, budget';

COMMENT ON COLUMN instagram_style_insights.top_categories IS 'Weighted category preferences from followed influencers';
COMMENT ON COLUMN instagram_style_insights.overall_confidence IS 'Overall confidence (0-100) in the analysis accuracy';
