-- Items and Recommendations Schema
-- Created: 2026-01-31
-- Purpose: Item catalog, behavioral tracking, and personalization

-- =====================================================
-- ITEMS TABLE
-- Core product catalog (canonical items)
-- =====================================================
CREATE TABLE items (
  id SERIAL PRIMARY KEY,
  brand_id INTEGER REFERENCES brands(id),
  canonical_name VARCHAR(500) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  subcategory VARCHAR(100),
  gender VARCHAR(50),
  primary_image_url TEXT,
  additional_images JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_items_brand ON items(brand_id);
CREATE INDEX idx_items_category ON items(category);
CREATE INDEX idx_items_active ON items(is_active);
CREATE INDEX idx_items_created ON items(created_at);

-- =====================================================
-- RETAILERS TABLE
-- Rename brands to clarify stores vs manufacturers
-- =====================================================
ALTER TABLE brands ADD COLUMN IF NOT EXISTS is_retailer BOOLEAN DEFAULT FALSE;
UPDATE brands SET is_retailer = TRUE;

COMMENT ON COLUMN brands.is_retailer IS 'TRUE if this brand also sells products (e.g., Everlane), FALSE if only manufacturer';

-- =====================================================
-- ITEM_LISTINGS TABLE
-- Where items are sold (price comparison)
-- =====================================================
CREATE TABLE item_listings (
  id SERIAL PRIMARY KEY,
  item_id INTEGER REFERENCES items(id) ON DELETE CASCADE,
  retailer_id INTEGER REFERENCES brands(id),
  product_url TEXT NOT NULL,
  affiliate_url TEXT,
  price DECIMAL(10,2) NOT NULL,
  sale_price DECIMAL(10,2),
  currency VARCHAR(3) DEFAULT 'USD',
  in_stock BOOLEAN DEFAULT TRUE,
  sizes_available JSONB DEFAULT '[]',
  colors_available JSONB DEFAULT '[]',
  last_scraped_at TIMESTAMP WITH TIME ZONE,
  last_price_change TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_listings_item ON item_listings(item_id);
CREATE INDEX idx_listings_retailer ON item_listings(retailer_id);
CREATE INDEX idx_listings_price ON item_listings(price);
CREATE INDEX idx_listings_stock ON item_listings(in_stock);

-- =====================================================
-- ATTRIBUTE_TAXONOMY TABLE
-- Master list of all fashion attributes
-- =====================================================
CREATE TABLE attribute_taxonomy (
  id SERIAL PRIMARY KEY,
  category VARCHAR(100) NOT NULL,
  name VARCHAR(100) UNIQUE NOT NULL,
  display_name VARCHAR(100),
  parent_id INTEGER REFERENCES attribute_taxonomy(id),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_attr_category ON attribute_taxonomy(category);
CREATE INDEX idx_attr_name ON attribute_taxonomy(name);

-- Seed common attributes
INSERT INTO attribute_taxonomy (category, name, display_name) VALUES
-- Silhouettes (dresses)
('silhouette', 'a_line', 'A-Line'),
('silhouette', 'bodycon', 'Bodycon'),
('silhouette', 'shift', 'Shift'),
('silhouette', 'wrap', 'Wrap'),
('silhouette', 'maxi', 'Maxi'),
('silhouette', 'midi', 'Midi'),
('silhouette', 'mini', 'Mini'),
('silhouette', 'fit_and_flare', 'Fit and Flare'),

-- Necklines
('neckline', 'v_neck', 'V-Neck'),
('neckline', 'crew', 'Crew'),
('neckline', 'scoop', 'Scoop'),
('neckline', 'off_shoulder', 'Off-Shoulder'),
('neckline', 'halter', 'Halter'),
('neckline', 'square', 'Square'),
('neckline', 'boat', 'Boat'),
('neckline', 'cowl', 'Cowl'),
('neckline', 'turtleneck', 'Turtleneck'),

-- Sleeve lengths
('sleeve_length', 'sleeveless', 'Sleeveless'),
('sleeve_length', 'cap_sleeve', 'Cap Sleeve'),
('sleeve_length', 'short_sleeve', 'Short Sleeve'),
('sleeve_length', 'three_quarter', '3/4 Sleeve'),
('sleeve_length', 'long_sleeve', 'Long Sleeve'),
('sleeve_length', 'bell_sleeve', 'Bell Sleeve'),
('sleeve_length', 'puff_sleeve', 'Puff Sleeve'),

-- Fits
('fit', 'fitted', 'Fitted'),
('fit', 'relaxed', 'Relaxed'),
('fit', 'oversized', 'Oversized'),
('fit', 'slim', 'Slim'),
('fit', 'regular', 'Regular'),
('fit', 'loose', 'Loose'),
('fit', 'cropped', 'Cropped'),
('fit', 'boxy', 'Boxy'),

-- Materials
('material', 'cotton', 'Cotton'),
('material', 'linen', 'Linen'),
('material', 'silk', 'Silk'),
('material', 'polyester', 'Polyester'),
('material', 'rayon', 'Rayon'),
('material', 'wool', 'Wool'),
('material', 'cashmere', 'Cashmere'),
('material', 'denim', 'Denim'),
('material', 'leather', 'Leather'),
('material', 'jersey', 'Jersey'),

-- Aesthetics
('aesthetic', 'minimalist', 'Minimalist'),
('aesthetic', 'boho', 'Boho'),
('aesthetic', 'preppy', 'Preppy'),
('aesthetic', 'y2k', 'Y2K'),
('aesthetic', 'romantic', 'Romantic'),
('aesthetic', 'edgy', 'Edgy'),
('aesthetic', 'vintage', 'Vintage'),
('aesthetic', 'modern', 'Modern'),
('aesthetic', 'coastal', 'Coastal'),
('aesthetic', 'streetwear', 'Streetwear'),

-- Occasions
('occasion', 'casual', 'Casual'),
('occasion', 'work', 'Work'),
('occasion', 'formal', 'Formal'),
('occasion', 'cocktail', 'Cocktail'),
('occasion', 'date_night', 'Date Night'),
('occasion', 'vacation', 'Vacation'),
('occasion', 'wedding_guest', 'Wedding Guest'),

-- Pants/Jeans styles
('pants_style', 'skinny', 'Skinny'),
('pants_style', 'straight', 'Straight'),
('pants_style', 'wide_leg', 'Wide Leg'),
('pants_style', 'bootcut', 'Bootcut'),
('pants_style', 'flare', 'Flare'),
('pants_style', 'mom_jeans', 'Mom Jeans'),
('pants_style', 'boyfriend', 'Boyfriend');

-- =====================================================
-- ITEM_ATTRIBUTES TABLE
-- Links items to their attributes
-- =====================================================
CREATE TABLE item_attributes (
  id SERIAL PRIMARY KEY,
  item_id INTEGER REFERENCES items(id) ON DELETE CASCADE,
  attribute_id INTEGER REFERENCES attribute_taxonomy(id),
  confidence FLOAT DEFAULT 1.0,
  source VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(item_id, attribute_id)
);

CREATE INDEX idx_item_attrs_item ON item_attributes(item_id);
CREATE INDEX idx_item_attrs_attribute ON item_attributes(attribute_id);
CREATE INDEX idx_item_attrs_confidence ON item_attributes(confidence);

-- =====================================================
-- USER_ITEM_INTERACTIONS TABLE
-- Behavioral tracking
-- =====================================================
CREATE TABLE user_item_interactions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  item_id INTEGER REFERENCES items(id) ON DELETE CASCADE,
  interaction_type VARCHAR(50) NOT NULL,
  dwell_time_seconds INTEGER,
  scroll_depth FLOAT,
  session_id VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_interactions_user ON user_item_interactions(user_id);
CREATE INDEX idx_interactions_item ON user_item_interactions(item_id);
CREATE INDEX idx_interactions_type ON user_item_interactions(interaction_type);
CREATE INDEX idx_interactions_created ON user_item_interactions(created_at);
CREATE INDEX idx_interactions_session ON user_item_interactions(session_id);

-- =====================================================
-- USER_FAVORITES TABLE
-- Items users have hearted
-- =====================================================
CREATE TABLE user_favorites (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  item_id INTEGER REFERENCES items(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, item_id)
);

CREATE INDEX idx_favorites_user ON user_favorites(user_id);
CREATE INDEX idx_favorites_item ON user_favorites(item_id);
CREATE INDEX idx_favorites_created ON user_favorites(created_at);

-- =====================================================
-- USER_LEARNED_PREFERENCES TABLE
-- Auto-generated preferences from behavior
-- =====================================================
CREATE TABLE user_learned_preferences (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  preference_type VARCHAR(50) NOT NULL,
  preference_value VARCHAR(100) NOT NULL,
  confidence FLOAT DEFAULT 0.5,
  evidence_count INTEGER DEFAULT 1,
  source VARCHAR(50) DEFAULT 'behavior',
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, preference_type, preference_value)
);

CREATE INDEX idx_learned_prefs_user ON user_learned_preferences(user_id);
CREATE INDEX idx_learned_prefs_type ON user_learned_preferences(preference_type);
CREATE INDEX idx_learned_prefs_confidence ON user_learned_preferences(confidence);

-- =====================================================
-- ITEM_MATCHES TABLE
-- Items that are the same product (for price comparison)
-- =====================================================
CREATE TABLE item_matches (
  id SERIAL PRIMARY KEY,
  item_id_1 INTEGER REFERENCES items(id) ON DELETE CASCADE,
  item_id_2 INTEGER REFERENCES items(id) ON DELETE CASCADE,
  match_confidence FLOAT DEFAULT 1.0,
  match_method VARCHAR(50),
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(item_id_1, item_id_2),
  CHECK (item_id_1 < item_id_2)
);

CREATE INDEX idx_matches_item1 ON item_matches(item_id_1);
CREATE INDEX idx_matches_item2 ON item_matches(item_id_2);
CREATE INDEX idx_matches_verified ON item_matches(verified);

-- =====================================================
-- AUTOMATIC TIMESTAMP UPDATES
-- =====================================================
CREATE TRIGGER update_items_updated_at
  BEFORE UPDATE ON items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_listings_updated_at
  BEFORE UPDATE ON item_listings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to get all attributes for an item
CREATE OR REPLACE FUNCTION get_item_attributes(p_item_id INTEGER)
RETURNS TABLE(category VARCHAR, name VARCHAR, display_name VARCHAR, confidence FLOAT) AS $$
BEGIN
  RETURN QUERY
  SELECT
    at.category,
    at.name,
    at.display_name,
    ia.confidence
  FROM item_attributes ia
  JOIN attribute_taxonomy at ON ia.attribute_id = at.id
  WHERE ia.item_id = p_item_id
  ORDER BY at.category, ia.confidence DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to find similar items based on attributes
CREATE OR REPLACE FUNCTION find_similar_items(
  p_item_id INTEGER,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE(
  item_id INTEGER,
  match_score BIGINT,
  shared_attributes INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ia2.item_id,
    COUNT(*) as match_score,
    COUNT(DISTINCT ia2.attribute_id)::INTEGER as shared_attributes
  FROM item_attributes ia1
  JOIN item_attributes ia2 ON ia1.attribute_id = ia2.attribute_id
  WHERE ia1.item_id = p_item_id
    AND ia2.item_id != p_item_id
    AND EXISTS (
      SELECT 1 FROM items WHERE id = ia2.item_id AND is_active = TRUE
    )
  GROUP BY ia2.item_id
  ORDER BY match_score DESC, shared_attributes DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE items IS 'Canonical product catalog - one entry per unique item';
COMMENT ON TABLE item_listings IS 'Where items are sold - supports price comparison across retailers';
COMMENT ON TABLE item_attributes IS 'Links items to their fashion attributes for matching/recommendations';
COMMENT ON TABLE user_item_interactions IS 'Tracks all user interactions with items for learning';
COMMENT ON TABLE user_favorites IS 'Items users have explicitly hearted/favorited';
COMMENT ON TABLE user_learned_preferences IS 'Auto-generated preferences learned from user behavior';
COMMENT ON TABLE item_matches IS 'Same product sold by different retailers (for price comparison)';
COMMENT ON TABLE attribute_taxonomy IS 'Master taxonomy of all fashion attributes';

COMMENT ON COLUMN user_item_interactions.interaction_type IS 'view, heart, unheart, cart, purchase, share';
COMMENT ON COLUMN user_item_interactions.dwell_time_seconds IS 'How long user viewed the item';
COMMENT ON COLUMN user_item_interactions.scroll_depth IS '0.0 to 1.0 - how much of item page they scrolled';
COMMENT ON COLUMN user_learned_preferences.confidence IS '0.0 to 1.0 - strength of preference signal';
COMMENT ON COLUMN user_learned_preferences.evidence_count IS 'Number of interactions supporting this preference';
