-- Instagram-Style Brand Modules
-- Created: 2026-02-04
-- Purpose: Add hero images, layout configurations, and styling for engaging brand modules

-- =====================================================
-- ADD COLUMNS TO feed_modules TABLE
-- =====================================================

-- Layout & Display Configuration
ALTER TABLE feed_modules ADD COLUMN IF NOT EXISTS layout_type VARCHAR(50) DEFAULT 'carousel';
COMMENT ON COLUMN feed_modules.layout_type IS 'Layout type: hero_carousel, featured_grid, carousel (legacy)';

ALTER TABLE feed_modules ADD COLUMN IF NOT EXISTS items_per_view INTEGER DEFAULT 3;
COMMENT ON COLUMN feed_modules.items_per_view IS 'Number of product tiles visible at once (3-4 recommended)';

ALTER TABLE feed_modules ADD COLUMN IF NOT EXISTS aspect_ratio VARCHAR(20) DEFAULT 'portrait';
COMMENT ON COLUMN feed_modules.aspect_ratio IS 'Tile aspect ratio: portrait (3:4), square (1:1), landscape (16:9)';

-- Hero Visual Assets
ALTER TABLE feed_modules ADD COLUMN IF NOT EXISTS hero_image_url TEXT;
COMMENT ON COLUMN feed_modules.hero_image_url IS 'Large hero image displayed at top of module';

ALTER TABLE feed_modules ADD COLUMN IF NOT EXISTS hero_video_url TEXT;
COMMENT ON COLUMN feed_modules.hero_video_url IS 'Optional video background for hero section';

ALTER TABLE feed_modules ADD COLUMN IF NOT EXISTS video_poster_url TEXT;
COMMENT ON COLUMN feed_modules.video_poster_url IS 'Poster image for hero video';

ALTER TABLE feed_modules ADD COLUMN IF NOT EXISTS hero_source VARCHAR(20) DEFAULT 'manual';
COMMENT ON COLUMN feed_modules.hero_source IS 'Source: manual (uploaded), auto_generated (from products)';

-- Styling & Branding
ALTER TABLE feed_modules ADD COLUMN IF NOT EXISTS background_color VARCHAR(7) DEFAULT '#FFFFFF';
COMMENT ON COLUMN feed_modules.background_color IS 'Hex color for module background';

ALTER TABLE feed_modules ADD COLUMN IF NOT EXISTS text_color VARCHAR(7) DEFAULT '#000000';
COMMENT ON COLUMN feed_modules.text_color IS 'Hex color for text overlay on hero';

ALTER TABLE feed_modules ADD COLUMN IF NOT EXISTS gradient_overlay TEXT;
COMMENT ON COLUMN feed_modules.gradient_overlay IS 'Tailwind gradient classes: from-[#color1] to-[#color2]';

ALTER TABLE feed_modules ADD COLUMN IF NOT EXISTS overlay_opacity DECIMAL(3,2) DEFAULT 0.3;
COMMENT ON COLUMN feed_modules.overlay_opacity IS 'Opacity of gradient overlay (0.0-1.0)';

-- Module Content
ALTER TABLE feed_modules ADD COLUMN IF NOT EXISTS header_cta_text VARCHAR(50);
COMMENT ON COLUMN feed_modules.header_cta_text IS 'Call-to-action text: Shop Now, View All, etc.';

ALTER TABLE feed_modules ADD COLUMN IF NOT EXISTS show_brand_logo BOOLEAN DEFAULT TRUE;
COMMENT ON COLUMN feed_modules.show_brand_logo IS 'Display brand logo on hero section';

ALTER TABLE feed_modules ADD COLUMN IF NOT EXISTS show_item_details BOOLEAN DEFAULT TRUE;
COMMENT ON COLUMN feed_modules.show_item_details IS 'Show price/name under product tiles';

-- Featured Item (for featured_grid layout)
ALTER TABLE feed_modules ADD COLUMN IF NOT EXISTS featured_item_id INTEGER REFERENCES items(id) ON DELETE SET NULL;
COMMENT ON COLUMN feed_modules.featured_item_id IS 'Item to feature prominently in featured_grid layout';

-- Flexible metadata for future expansion
ALTER TABLE feed_modules ADD COLUMN IF NOT EXISTS display_config JSONB DEFAULT '{}';
COMMENT ON COLUMN feed_modules.display_config IS 'Flexible config: { hide_scrollbar, tile_gap, columns_mobile }';

-- =====================================================
-- CREATE INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_feed_modules_layout ON feed_modules(layout_type);
CREATE INDEX IF NOT EXISTS idx_feed_modules_featured ON feed_modules(featured_item_id) WHERE featured_item_id IS NOT NULL;

-- =====================================================
-- FUNCTION: Auto-generate hero image from module items
-- =====================================================
CREATE OR REPLACE FUNCTION get_module_hero_image(p_module_id INTEGER)
RETURNS TEXT AS $$
DECLARE
  v_hero_url TEXT;
BEGIN
  -- Try to get featured item's image first
  SELECT i.image_url INTO v_hero_url
  FROM feed_module_items fmi
  JOIN items i ON fmi.item_id = i.id
  WHERE fmi.module_id = p_module_id
    AND fmi.is_featured = TRUE
    AND i.image_url IS NOT NULL
  LIMIT 1;

  -- If no featured item, get first item's image
  IF v_hero_url IS NULL THEN
    SELECT i.image_url INTO v_hero_url
    FROM feed_module_items fmi
    JOIN items i ON fmi.item_id = i.id
    WHERE fmi.module_id = p_module_id
      AND i.image_url IS NOT NULL
    ORDER BY fmi.display_order ASC
    LIMIT 1;
  END IF;

  RETURN v_hero_url;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_module_hero_image IS 'Auto-generates hero image from featured or first product in module';

-- =====================================================
-- TRIGGER: Auto-set hero_source when hero generated
-- =====================================================
CREATE OR REPLACE FUNCTION set_hero_source()
RETURNS TRIGGER AS $$
BEGIN
  -- If hero_image_url is being set and hero_source is not specified
  IF NEW.hero_image_url IS NOT NULL AND NEW.hero_source IS NULL THEN
    NEW.hero_source := 'manual';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_hero_source
  BEFORE INSERT OR UPDATE ON feed_modules
  FOR EACH ROW
  EXECUTE FUNCTION set_hero_source();

-- =====================================================
-- SEED DATA: Update existing modules to hero_carousel
-- =====================================================
-- Convert existing modules to new hero_carousel layout with auto-generated heroes
UPDATE feed_modules
SET
  layout_type = 'hero_carousel',
  items_per_view = 3,
  aspect_ratio = 'portrait',
  hero_source = 'auto_generated'
WHERE layout_type IS NULL OR layout_type = 'carousel';

-- =====================================================
-- HELPER VIEW: Modules with complete hero data
-- =====================================================
CREATE OR REPLACE VIEW feed_modules_with_heroes AS
SELECT
  m.*,
  b.name as brand_name,
  b.logo_url as brand_logo,
  -- Auto-generate hero if not manually set
  COALESCE(m.hero_image_url, get_module_hero_image(m.id)) as computed_hero_url,
  CASE
    WHEN m.hero_image_url IS NOT NULL THEN 'manual'
    ELSE 'auto_generated'
  END as computed_hero_source
FROM feed_modules m
LEFT JOIN brands b ON m.brand_id = b.id;

COMMENT ON VIEW feed_modules_with_heroes IS 'Feed modules with auto-generated hero URLs when manual hero missing';

-- =====================================================
-- VALIDATION CONSTRAINTS
-- =====================================================
ALTER TABLE feed_modules ADD CONSTRAINT check_layout_type
  CHECK (layout_type IN ('hero_carousel', 'featured_grid', 'carousel'));

ALTER TABLE feed_modules ADD CONSTRAINT check_aspect_ratio
  CHECK (aspect_ratio IN ('portrait', 'square', 'landscape'));

ALTER TABLE feed_modules ADD CONSTRAINT check_hero_source
  CHECK (hero_source IN ('manual', 'auto_generated'));

ALTER TABLE feed_modules ADD CONSTRAINT check_overlay_opacity
  CHECK (overlay_opacity >= 0.0 AND overlay_opacity <= 1.0);

ALTER TABLE feed_modules ADD CONSTRAINT check_items_per_view
  CHECK (items_per_view >= 1 AND items_per_view <= 10);
