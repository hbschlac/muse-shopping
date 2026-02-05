-- Migration 025: Expand Style Profile from 4 to 16 Dimensions
-- Increases customer understanding granularity by 4x
-- Created: 2026-02-04

-- ============================================================================
-- EXPANDED 16-DIMENSIONAL STYLE PROFILE
-- ============================================================================

-- Add 12 new dimension columns to style_profiles table
ALTER TABLE style_profiles
  -- DIMENSION 5: Color Palette Preferences
  ADD COLUMN IF NOT EXISTS color_palette_layers JSONB DEFAULT '{
    "neutral": 0, "earth_tones": 0, "pastels": 0, "jewel_tones": 0,
    "monochrome": 0, "brights": 0, "metallics": 0, "prints": 0
  }'::jsonb,

  -- DIMENSION 6: Material & Fabric Preferences
  ADD COLUMN IF NOT EXISTS material_layers JSONB DEFAULT '{
    "cotton": 0, "silk": 0, "wool": 0, "cashmere": 0,
    "leather": 0, "synthetic": 0, "linen": 0, "denim": 0,
    "velvet": 0, "knit": 0
  }'::jsonb,

  -- DIMENSION 7: Fit & Silhouette Preferences
  ADD COLUMN IF NOT EXISTS silhouette_layers JSONB DEFAULT '{
    "oversized": 0, "tailored": 0, "bodycon": 0, "relaxed": 0,
    "structured": 0, "flowy": 0, "cropped": 0, "longline": 0
  }'::jsonb,

  -- DIMENSION 8: Brand Tier Affinity
  ADD COLUMN IF NOT EXISTS brand_tier_layers JSONB DEFAULT '{
    "contemporary": 0, "designer": 0, "luxury": 0, "fast_fashion": 0,
    "sustainable": 0, "indie": 0, "heritage": 0, "emerging": 0
  }'::jsonb,

  -- DIMENSION 9: Shopping Motivation
  ADD COLUMN IF NOT EXISTS motivation_layers JSONB DEFAULT '{
    "trend_driven": 0, "investment_piece": 0, "wardrobe_staple": 0,
    "statement_piece": 0, "sale_hunting": 0, "impulse": 0,
    "replacement": 0, "occasion_specific": 0
  }'::jsonb,

  -- DIMENSION 10: Seasonality Preferences
  ADD COLUMN IF NOT EXISTS season_layers JSONB DEFAULT '{
    "spring": 0, "summer": 0, "fall": 0, "winter": 0,
    "transitional": 0, "year_round": 0
  }'::jsonb,

  -- DIMENSION 11: Detail Preferences (embellishments, hardware, etc.)
  ADD COLUMN IF NOT EXISTS detail_layers JSONB DEFAULT '{
    "minimal_details": 0, "hardware": 0, "embroidery": 0, "sequins": 0,
    "ruffles": 0, "cutouts": 0, "lace": 0, "buttons": 0,
    "zippers": 0, "pleats": 0
  }'::jsonb,

  -- DIMENSION 12: Length & Coverage Preferences
  ADD COLUMN IF NOT EXISTS coverage_layers JSONB DEFAULT '{
    "mini": 0, "midi": 0, "maxi": 0, "ankle": 0,
    "knee": 0, "full_coverage": 0, "cropped": 0, "revealing": 0
  }'::jsonb,

  -- DIMENSION 13: Pattern Preferences
  ADD COLUMN IF NOT EXISTS pattern_layers JSONB DEFAULT '{
    "solid": 0, "stripes": 0, "florals": 0, "animal_print": 0,
    "geometric": 0, "polka_dots": 0, "abstract": 0, "plaid": 0,
    "paisley": 0, "tie_dye": 0
  }'::jsonb,

  -- DIMENSION 14: Versatility Score (how they mix/match)
  ADD COLUMN IF NOT EXISTS versatility_layers JSONB DEFAULT '{
    "capsule_wardrobe": 0, "maximalist": 0, "mix_high_low": 0,
    "monobrand": 0, "trend_mixer": 0, "classic_mixer": 0
  }'::jsonb,

  -- DIMENSION 15: Sustainability Values
  ADD COLUMN IF NOT EXISTS sustainability_layers JSONB DEFAULT '{
    "eco_conscious": 0, "secondhand": 0, "ethical_production": 0,
    "local_brands": 0, "vegan": 0, "circular_fashion": 0,
    "quality_over_quantity": 0, "fast_fashion": 0
  }'::jsonb,

  -- DIMENSION 16: Brand Loyalty Patterns
  ADD COLUMN IF NOT EXISTS loyalty_layers JSONB DEFAULT '{
    "brand_explorer": 0, "brand_loyal": 0, "influencer_driven": 0,
    "editor_picks": 0, "independent": 0, "trendsetter": 0,
    "classic_buyer": 0, "discount_driven": 0
  }'::jsonb;

-- ============================================================================
-- UPDATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Add GIN indexes for new JSONB columns to enable fast queries
CREATE INDEX IF NOT EXISTS idx_style_profiles_color_palette
  ON style_profiles USING GIN (color_palette_layers);

CREATE INDEX IF NOT EXISTS idx_style_profiles_material
  ON style_profiles USING GIN (material_layers);

CREATE INDEX IF NOT EXISTS idx_style_profiles_silhouette
  ON style_profiles USING GIN (silhouette_layers);

CREATE INDEX IF NOT EXISTS idx_style_profiles_brand_tier
  ON style_profiles USING GIN (brand_tier_layers);

CREATE INDEX IF NOT EXISTS idx_style_profiles_motivation
  ON style_profiles USING GIN (motivation_layers);

CREATE INDEX IF NOT EXISTS idx_style_profiles_season
  ON style_profiles USING GIN (season_layers);

CREATE INDEX IF NOT EXISTS idx_style_profiles_detail
  ON style_profiles USING GIN (detail_layers);

CREATE INDEX IF NOT EXISTS idx_style_profiles_coverage
  ON style_profiles USING GIN (coverage_layers);

CREATE INDEX IF NOT EXISTS idx_style_profiles_pattern
  ON style_profiles USING GIN (pattern_layers);

CREATE INDEX IF NOT EXISTS idx_style_profiles_versatility
  ON style_profiles USING GIN (versatility_layers);

CREATE INDEX IF NOT EXISTS idx_style_profiles_sustainability
  ON style_profiles USING GIN (sustainability_layers);

CREATE INDEX IF NOT EXISTS idx_style_profiles_loyalty
  ON style_profiles USING GIN (loyalty_layers);

-- ============================================================================
-- ADD NEW METADATA COLUMNS TO ITEMS TABLE
-- ============================================================================

-- Expand items table to support new dimensions
ALTER TABLE items
  ADD COLUMN IF NOT EXISTS color_palette VARCHAR(50),
  ADD COLUMN IF NOT EXISTS primary_material VARCHAR(50),
  ADD COLUMN IF NOT EXISTS silhouette_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS detail_tags TEXT[],
  ADD COLUMN IF NOT EXISTS pattern_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS coverage_level VARCHAR(50),
  ADD COLUMN IF NOT EXISTS sustainability_tags TEXT[],
  ADD COLUMN IF NOT EXISTS season_suitability TEXT[];

-- ============================================================================
-- ADD NEW METADATA COLUMNS TO FASHION_INFLUENCERS TABLE
-- ============================================================================

ALTER TABLE fashion_influencers
  ADD COLUMN IF NOT EXISTS color_palette_signature VARCHAR(50),
  ADD COLUMN IF NOT EXISTS material_preference VARCHAR(50),
  ADD COLUMN IF NOT EXISTS silhouette_signature VARCHAR(50),
  ADD COLUMN IF NOT EXISTS sustainability_focus BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS brand_tier_focus VARCHAR(50);

-- ============================================================================
-- ADD NEW METADATA COLUMNS TO BRANDS TABLE
-- ============================================================================

ALTER TABLE brands
  ADD COLUMN IF NOT EXISTS brand_tier VARCHAR(50),
  ADD COLUMN IF NOT EXISTS color_palette_signature TEXT[],
  ADD COLUMN IF NOT EXISTS material_specialties TEXT[],
  ADD COLUMN IF NOT EXISTS sustainability_certifications TEXT[],
  ADD COLUMN IF NOT EXISTS silhouette_focus TEXT[];

-- ============================================================================
-- CREATE HELPER VIEW: Customer Profile Summary
-- ============================================================================

CREATE OR REPLACE VIEW customer_profile_summary AS
SELECT
  sp.user_id,
  sp.confidence,
  sp.total_events,
  sp.commerce_intent,

  -- Original 4 dimensions (top preference from each)
  (SELECT key FROM jsonb_each_text(sp.style_layers) ORDER BY value::numeric DESC LIMIT 1) as top_style,
  (SELECT key FROM jsonb_each_text(sp.price_layers) ORDER BY value::numeric DESC LIMIT 1) as top_price,
  (SELECT key FROM jsonb_each_text(sp.category_layers) ORDER BY value::numeric DESC LIMIT 1) as top_category,
  (SELECT key FROM jsonb_each_text(sp.occasion_layers) ORDER BY value::numeric DESC LIMIT 1) as top_occasion,

  -- New 12 dimensions (top preference from each)
  (SELECT key FROM jsonb_each_text(sp.color_palette_layers) ORDER BY value::numeric DESC LIMIT 1) as top_color_palette,
  (SELECT key FROM jsonb_each_text(sp.material_layers) ORDER BY value::numeric DESC LIMIT 1) as top_material,
  (SELECT key FROM jsonb_each_text(sp.silhouette_layers) ORDER BY value::numeric DESC LIMIT 1) as top_silhouette,
  (SELECT key FROM jsonb_each_text(sp.brand_tier_layers) ORDER BY value::numeric DESC LIMIT 1) as top_brand_tier,
  (SELECT key FROM jsonb_each_text(sp.motivation_layers) ORDER BY value::numeric DESC LIMIT 1) as top_motivation,
  (SELECT key FROM jsonb_each_text(sp.season_layers) ORDER BY value::numeric DESC LIMIT 1) as top_season,
  (SELECT key FROM jsonb_each_text(sp.detail_layers) ORDER BY value::numeric DESC LIMIT 1) as top_detail,
  (SELECT key FROM jsonb_each_text(sp.coverage_layers) ORDER BY value::numeric DESC LIMIT 1) as top_coverage,
  (SELECT key FROM jsonb_each_text(sp.pattern_layers) ORDER BY value::numeric DESC LIMIT 1) as top_pattern,
  (SELECT key FROM jsonb_each_text(sp.versatility_layers) ORDER BY value::numeric DESC LIMIT 1) as top_versatility,
  (SELECT key FROM jsonb_each_text(sp.sustainability_layers) ORDER BY value::numeric DESC LIMIT 1) as top_sustainability,
  (SELECT key FROM jsonb_each_text(sp.loyalty_layers) ORDER BY value::numeric DESC LIMIT 1) as top_loyalty,

  sp.last_event_at,
  sp.created_at
FROM style_profiles sp;

-- ============================================================================
-- CREATE FUNCTION: Get Complete Customer Profile
-- ============================================================================

CREATE OR REPLACE FUNCTION get_complete_customer_profile(p_user_id INTEGER)
RETURNS TABLE (
  dimension_name TEXT,
  dimension_values JSONB,
  top_value TEXT,
  top_score NUMERIC,
  confidence NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    'style' as dimension_name,
    style_layers as dimension_values,
    (SELECT key FROM jsonb_each_text(style_layers) ORDER BY value::numeric DESC LIMIT 1) as top_value,
    (SELECT value::numeric FROM jsonb_each_text(style_layers) ORDER BY value::numeric DESC LIMIT 1) as top_score,
    sp.confidence
  FROM style_profiles sp WHERE sp.user_id = p_user_id

  UNION ALL

  SELECT
    'price',
    price_layers,
    (SELECT key FROM jsonb_each_text(price_layers) ORDER BY value::numeric DESC LIMIT 1),
    (SELECT value::numeric FROM jsonb_each_text(price_layers) ORDER BY value::numeric DESC LIMIT 1),
    sp.confidence
  FROM style_profiles sp WHERE sp.user_id = p_user_id

  UNION ALL

  SELECT
    'category',
    category_layers,
    (SELECT key FROM jsonb_each_text(category_layers) ORDER BY value::numeric DESC LIMIT 1),
    (SELECT value::numeric FROM jsonb_each_text(category_layers) ORDER BY value::numeric DESC LIMIT 1),
    sp.confidence
  FROM style_profiles sp WHERE sp.user_id = p_user_id

  UNION ALL

  SELECT
    'occasion',
    occasion_layers,
    (SELECT key FROM jsonb_each_text(occasion_layers) ORDER BY value::numeric DESC LIMIT 1),
    (SELECT value::numeric FROM jsonb_each_text(occasion_layers) ORDER BY value::numeric DESC LIMIT 1),
    sp.confidence
  FROM style_profiles sp WHERE sp.user_id = p_user_id

  UNION ALL

  SELECT 'color_palette', color_palette_layers,
    (SELECT key FROM jsonb_each_text(color_palette_layers) ORDER BY value::numeric DESC LIMIT 1),
    (SELECT value::numeric FROM jsonb_each_text(color_palette_layers) ORDER BY value::numeric DESC LIMIT 1),
    sp.confidence
  FROM style_profiles sp WHERE sp.user_id = p_user_id

  UNION ALL

  SELECT 'material', material_layers,
    (SELECT key FROM jsonb_each_text(material_layers) ORDER BY value::numeric DESC LIMIT 1),
    (SELECT value::numeric FROM jsonb_each_text(material_layers) ORDER BY value::numeric DESC LIMIT 1),
    sp.confidence
  FROM style_profiles sp WHERE sp.user_id = p_user_id

  UNION ALL

  SELECT 'silhouette', silhouette_layers,
    (SELECT key FROM jsonb_each_text(silhouette_layers) ORDER BY value::numeric DESC LIMIT 1),
    (SELECT value::numeric FROM jsonb_each_text(silhouette_layers) ORDER BY value::numeric DESC LIMIT 1),
    sp.confidence
  FROM style_profiles sp WHERE sp.user_id = p_user_id

  UNION ALL

  SELECT 'brand_tier', brand_tier_layers,
    (SELECT key FROM jsonb_each_text(brand_tier_layers) ORDER BY value::numeric DESC LIMIT 1),
    (SELECT value::numeric FROM jsonb_each_text(brand_tier_layers) ORDER BY value::numeric DESC LIMIT 1),
    sp.confidence
  FROM style_profiles sp WHERE sp.user_id = p_user_id

  UNION ALL

  SELECT 'motivation', motivation_layers,
    (SELECT key FROM jsonb_each_text(motivation_layers) ORDER BY value::numeric DESC LIMIT 1),
    (SELECT value::numeric FROM jsonb_each_text(motivation_layers) ORDER BY value::numeric DESC LIMIT 1),
    sp.confidence
  FROM style_profiles sp WHERE sp.user_id = p_user_id

  UNION ALL

  SELECT 'season', season_layers,
    (SELECT key FROM jsonb_each_text(season_layers) ORDER BY value::numeric DESC LIMIT 1),
    (SELECT value::numeric FROM jsonb_each_text(season_layers) ORDER BY value::numeric DESC LIMIT 1),
    sp.confidence
  FROM style_profiles sp WHERE sp.user_id = p_user_id

  UNION ALL

  SELECT 'detail', detail_layers,
    (SELECT key FROM jsonb_each_text(detail_layers) ORDER BY value::numeric DESC LIMIT 1),
    (SELECT value::numeric FROM jsonb_each_text(detail_layers) ORDER BY value::numeric DESC LIMIT 1),
    sp.confidence
  FROM style_profiles sp WHERE sp.user_id = p_user_id

  UNION ALL

  SELECT 'coverage', coverage_layers,
    (SELECT key FROM jsonb_each_text(coverage_layers) ORDER BY value::numeric DESC LIMIT 1),
    (SELECT value::numeric FROM jsonb_each_text(coverage_layers) ORDER BY value::numeric DESC LIMIT 1),
    sp.confidence
  FROM style_profiles sp WHERE sp.user_id = p_user_id

  UNION ALL

  SELECT 'pattern', pattern_layers,
    (SELECT key FROM jsonb_each_text(pattern_layers) ORDER BY value::numeric DESC LIMIT 1),
    (SELECT value::numeric FROM jsonb_each_text(pattern_layers) ORDER BY value::numeric DESC LIMIT 1),
    sp.confidence
  FROM style_profiles sp WHERE sp.user_id = p_user_id

  UNION ALL

  SELECT 'versatility', versatility_layers,
    (SELECT key FROM jsonb_each_text(versatility_layers) ORDER BY value::numeric DESC LIMIT 1),
    (SELECT value::numeric FROM jsonb_each_text(versatility_layers) ORDER BY value::numeric DESC LIMIT 1),
    sp.confidence
  FROM style_profiles sp WHERE sp.user_id = p_user_id

  UNION ALL

  SELECT 'sustainability', sustainability_layers,
    (SELECT key FROM jsonb_each_text(sustainability_layers) ORDER BY value::numeric DESC LIMIT 1),
    (SELECT value::numeric FROM jsonb_each_text(sustainability_layers) ORDER BY value::numeric DESC LIMIT 1),
    sp.confidence
  FROM style_profiles sp WHERE sp.user_id = p_user_id

  UNION ALL

  SELECT 'loyalty', loyalty_layers,
    (SELECT key FROM jsonb_each_text(loyalty_layers) ORDER BY value::numeric DESC LIMIT 1),
    (SELECT value::numeric FROM jsonb_each_text(loyalty_layers) ORDER BY value::numeric DESC LIMIT 1),
    sp.confidence
  FROM style_profiles sp WHERE sp.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS & DOCUMENTATION
-- ============================================================================

COMMENT ON COLUMN style_profiles.color_palette_layers IS 'Layer 5: Color palette preferences (8 values)';
COMMENT ON COLUMN style_profiles.material_layers IS 'Layer 6: Material and fabric preferences (10 values)';
COMMENT ON COLUMN style_profiles.silhouette_layers IS 'Layer 7: Fit and silhouette preferences (8 values)';
COMMENT ON COLUMN style_profiles.brand_tier_layers IS 'Layer 8: Brand tier affinity (8 values)';
COMMENT ON COLUMN style_profiles.motivation_layers IS 'Layer 9: Shopping motivation patterns (8 values)';
COMMENT ON COLUMN style_profiles.season_layers IS 'Layer 10: Seasonality preferences (6 values)';
COMMENT ON COLUMN style_profiles.detail_layers IS 'Layer 11: Detail and embellishment preferences (10 values)';
COMMENT ON COLUMN style_profiles.coverage_layers IS 'Layer 12: Length and coverage preferences (8 values)';
COMMENT ON COLUMN style_profiles.pattern_layers IS 'Layer 13: Pattern preferences (10 values)';
COMMENT ON COLUMN style_profiles.versatility_layers IS 'Layer 14: Versatility and mixing patterns (6 values)';
COMMENT ON COLUMN style_profiles.sustainability_layers IS 'Layer 15: Sustainability values (8 values)';
COMMENT ON COLUMN style_profiles.loyalty_layers IS 'Layer 16: Brand loyalty patterns (8 values)';
