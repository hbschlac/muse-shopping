-- Create Style Profiles System
-- Migration: 022_create_style_profiles
-- Purpose: User style profiles based on influencer follows and shopping behavior

-- ========================================
-- 1. Create Style Profiles Table
-- ========================================

CREATE TABLE IF NOT EXISTS style_profiles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Style layers (aesthetic direction)
  style_layers JSONB DEFAULT '{"minimal": 0, "streetwear": 0, "glam": 0, "classic": 0, "boho": 0, "athleisure": 0, "romantic": 0, "edgy": 0, "preppy": 0, "avant_garde": 0}',

  -- Price layers (budget sensitivity)
  price_layers JSONB DEFAULT '{"budget": 0, "mid": 0, "premium": 0, "luxury": 0}',

  -- Category layers (product focus)
  category_layers JSONB DEFAULT '{"bags": 0, "shoes": 0, "denim": 0, "workwear": 0, "occasion": 0, "accessories": 0, "active": 0, "mixed": 0}',

  -- Occasion layers (lifestyle context)
  occasion_layers JSONB DEFAULT '{"work": 0, "event": 0, "casual": 0, "athleisure": 0}',

  -- Commerce intent score
  commerce_intent DECIMAL(5,2) DEFAULT 0,

  -- Confidence score (0-1)
  confidence DECIMAL(3,2) DEFAULT 0,

  -- Metadata
  total_events INTEGER DEFAULT 0,
  last_event_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(user_id)
);

CREATE INDEX idx_style_profiles_user_id ON style_profiles(user_id);
CREATE INDEX idx_style_profiles_confidence ON style_profiles(confidence);
CREATE INDEX idx_style_profiles_commerce_intent ON style_profiles(commerce_intent);

-- ========================================
-- 2. Create Style Profile Events Table
-- ========================================

CREATE TABLE IF NOT EXISTS style_profile_events (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Event details
  event_type VARCHAR(50) NOT NULL, -- 'follow', 'like', 'save', 'click', 'add_to_cart', 'purchase'
  source_type VARCHAR(50) NOT NULL, -- 'influencer', 'product', 'retailer'
  source_id INTEGER NOT NULL,

  -- Weight applied
  weight DECIMAL(3,2) NOT NULL,

  -- Source metadata (for debugging/analysis)
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_style_profile_events_user_id ON style_profile_events(user_id);
CREATE INDEX idx_style_profile_events_event_type ON style_profile_events(event_type);
CREATE INDEX idx_style_profile_events_source_type ON style_profile_events(source_type);
CREATE INDEX idx_style_profile_events_created_at ON style_profile_events(created_at DESC);

-- ========================================
-- 3. Create Style Profile Snapshots Table
-- ========================================
-- Track profile changes over time for analysis

CREATE TABLE IF NOT EXISTS style_profile_snapshots (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Snapshot of profile at this time
  style_layers JSONB,
  price_layers JSONB,
  category_layers JSONB,
  occasion_layers JSONB,
  commerce_intent DECIMAL(5,2),
  confidence DECIMAL(3,2),

  -- Metadata
  total_events INTEGER,
  snapshot_reason VARCHAR(100), -- 'weekly', 'milestone', 'manual'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_style_profile_snapshots_user_id ON style_profile_snapshots(user_id);
CREATE INDEX idx_style_profile_snapshots_created_at ON style_profile_snapshots(created_at DESC);

-- ========================================
-- 4. Add Style Profile Fields to Influencers
-- ========================================

-- Add style profile metadata to fashion_influencers table
ALTER TABLE fashion_influencers
  ADD COLUMN IF NOT EXISTS style_archetype VARCHAR(50), -- 'minimal', 'streetwear', 'glam', etc.
  ADD COLUMN IF NOT EXISTS price_tier VARCHAR(50), -- 'budget', 'mid', 'premium', 'luxury'
  ADD COLUMN IF NOT EXISTS category_focus VARCHAR(50), -- 'bags', 'shoes', 'denim', etc.
  ADD COLUMN IF NOT EXISTS commerce_readiness_score INTEGER DEFAULT 0; -- 0-100

CREATE INDEX IF NOT EXISTS idx_influencers_style_archetype ON fashion_influencers(style_archetype);
CREATE INDEX IF NOT EXISTS idx_influencers_price_tier ON fashion_influencers(price_tier);
CREATE INDEX IF NOT EXISTS idx_influencers_category_focus ON fashion_influencers(category_focus);
CREATE INDEX IF NOT EXISTS idx_influencers_commerce_score ON fashion_influencers(commerce_readiness_score);

-- ========================================
-- 5. Add Style Profile Fields to Products
-- ========================================

-- Add style metadata to items table
ALTER TABLE items
  ADD COLUMN IF NOT EXISTS style_tags TEXT[], -- ['minimal', 'classic', etc.]
  ADD COLUMN IF NOT EXISTS occasion_tag VARCHAR(50), -- 'work', 'event', 'casual', 'athleisure'
  ADD COLUMN IF NOT EXISTS price_tier VARCHAR(50); -- 'budget', 'mid', 'premium', 'luxury'

CREATE INDEX IF NOT EXISTS idx_items_style_tags ON items USING GIN(style_tags);
CREATE INDEX IF NOT EXISTS idx_items_occasion_tag ON items(occasion_tag);
CREATE INDEX IF NOT EXISTS idx_items_price_tier ON items(price_tier);

-- ========================================
-- 6. Functions for Style Profile Updates
-- ========================================

-- Function to normalize style profile layers
CREATE OR REPLACE FUNCTION normalize_style_profile_layers()
RETURNS TRIGGER AS $$
DECLARE
  max_style DECIMAL;
  max_price DECIMAL;
  max_category DECIMAL;
  max_occasion DECIMAL;
BEGIN
  -- Find max values in each layer group
  max_style := GREATEST(
    (NEW.style_layers->>'minimal')::DECIMAL,
    (NEW.style_layers->>'streetwear')::DECIMAL,
    (NEW.style_layers->>'glam')::DECIMAL,
    (NEW.style_layers->>'classic')::DECIMAL,
    (NEW.style_layers->>'boho')::DECIMAL,
    (NEW.style_layers->>'athleisure')::DECIMAL,
    (NEW.style_layers->>'romantic')::DECIMAL,
    (NEW.style_layers->>'edgy')::DECIMAL,
    (NEW.style_layers->>'preppy')::DECIMAL,
    (NEW.style_layers->>'avant_garde')::DECIMAL
  );

  max_price := GREATEST(
    (NEW.price_layers->>'budget')::DECIMAL,
    (NEW.price_layers->>'mid')::DECIMAL,
    (NEW.price_layers->>'premium')::DECIMAL,
    (NEW.price_layers->>'luxury')::DECIMAL
  );

  max_category := GREATEST(
    (NEW.category_layers->>'bags')::DECIMAL,
    (NEW.category_layers->>'shoes')::DECIMAL,
    (NEW.category_layers->>'denim')::DECIMAL,
    (NEW.category_layers->>'workwear')::DECIMAL,
    (NEW.category_layers->>'occasion')::DECIMAL,
    (NEW.category_layers->>'accessories')::DECIMAL,
    (NEW.category_layers->>'active')::DECIMAL,
    (NEW.category_layers->>'mixed')::DECIMAL
  );

  max_occasion := GREATEST(
    (NEW.occasion_layers->>'work')::DECIMAL,
    (NEW.occasion_layers->>'event')::DECIMAL,
    (NEW.occasion_layers->>'casual')::DECIMAL,
    (NEW.occasion_layers->>'athleisure')::DECIMAL
  );

  -- Calculate confidence based on total events
  -- confidence = min(1, log10(total_events + 1) / 2)
  IF NEW.total_events > 0 THEN
    NEW.confidence := LEAST(1.0, LOG(10, NEW.total_events + 1) / 2.0);
  ELSE
    NEW.confidence := 0;
  END IF;

  -- Update timestamp
  NEW.updated_at := CURRENT_TIMESTAMP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger
DROP TRIGGER IF EXISTS normalize_style_profile ON style_profiles;
CREATE TRIGGER normalize_style_profile
  BEFORE UPDATE ON style_profiles
  FOR EACH ROW
  EXECUTE FUNCTION normalize_style_profile_layers();

-- ========================================
-- 7. Views for Style Profile Analytics
-- ========================================

-- View: Top style preferences per user
CREATE OR REPLACE VIEW user_style_preferences AS
SELECT
  sp.user_id,
  u.email,
  u.username,
  sp.style_layers,
  sp.price_layers,
  sp.category_layers,
  sp.occasion_layers,
  sp.commerce_intent,
  sp.confidence,
  sp.total_events,
  sp.last_event_at,
  -- Extract top 3 style tags
  (SELECT array_agg(key ORDER BY value DESC)
   FROM jsonb_each_text(sp.style_layers)
   LIMIT 3) as top_styles,
  -- Extract top 2 categories
  (SELECT array_agg(key ORDER BY value DESC)
   FROM jsonb_each_text(sp.category_layers)
   LIMIT 2) as top_categories,
  -- Extract primary price tier
  (SELECT key
   FROM jsonb_each_text(sp.price_layers)
   ORDER BY value DESC
   LIMIT 1) as primary_price_tier
FROM style_profiles sp
JOIN users u ON sp.user_id = u.id
WHERE sp.confidence > 0.3; -- Only show profiles with some confidence

-- View: High commerce intent users
CREATE OR REPLACE VIEW high_intent_users AS
SELECT
  sp.user_id,
  u.email,
  u.username,
  sp.commerce_intent,
  sp.confidence,
  sp.total_events,
  sp.last_event_at
FROM style_profiles sp
JOIN users u ON sp.user_id = u.id
WHERE sp.commerce_intent > 5
  AND sp.confidence > 0.5
ORDER BY sp.commerce_intent DESC;

-- View: Style profile event summary
CREATE OR REPLACE VIEW style_event_summary AS
SELECT
  event_type,
  source_type,
  COUNT(*) as event_count,
  AVG(weight) as avg_weight,
  COUNT(DISTINCT user_id) as unique_users,
  DATE_TRUNC('day', created_at) as event_date
FROM style_profile_events
GROUP BY event_type, source_type, DATE_TRUNC('day', created_at)
ORDER BY event_date DESC, event_count DESC;

-- ========================================
-- 8. Grant Permissions
-- ========================================

GRANT ALL PRIVILEGES ON TABLE style_profiles TO muse_admin;
GRANT ALL PRIVILEGES ON TABLE style_profile_events TO muse_admin;
GRANT ALL PRIVILEGES ON TABLE style_profile_snapshots TO muse_admin;

GRANT USAGE, SELECT ON SEQUENCE style_profiles_id_seq TO muse_admin;
GRANT USAGE, SELECT ON SEQUENCE style_profile_events_id_seq TO muse_admin;
GRANT USAGE, SELECT ON SEQUENCE style_profile_snapshots_id_seq TO muse_admin;

-- ========================================
-- 9. Sample Data Initialization
-- ========================================

-- Initialize style profiles for existing users with Instagram connections
INSERT INTO style_profiles (user_id)
SELECT DISTINCT user_id
FROM user_instagram_follows
WHERE user_id NOT IN (SELECT user_id FROM style_profiles)
ON CONFLICT (user_id) DO NOTHING;

COMMENT ON TABLE style_profiles IS 'User style profiles based on influencer follows and shopping behavior';
COMMENT ON TABLE style_profile_events IS 'Events that update style profiles (follows, likes, purchases, etc.)';
COMMENT ON TABLE style_profile_snapshots IS 'Historical snapshots of style profiles for analysis';
