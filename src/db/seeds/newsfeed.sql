-- Newsfeed seed data
-- Brand stories and feed modules for testing

-- =====================================================
-- BRAND STORIES (Top carousel - Instagram style)
-- =====================================================

-- Abercrombie Winter Sale Story
INSERT INTO brand_stories (brand_id, title, story_type, thumbnail_url, background_color, text_color, priority, starts_at, expires_at, metadata)
SELECT
  id,
  'Winter Sale 40% Off',
  'sale',
  'https://images.example.com/abercrombie-sale-thumb.jpg',
  '#1A4D2E',
  '#FFFFFF',
  100,
  CURRENT_TIMESTAMP - INTERVAL '2 hours',
  CURRENT_TIMESTAMP + INTERVAL '5 days',
  '{"discount": "40%", "categories": ["outerwear", "sweaters"]}'::jsonb
FROM brands WHERE slug = 'abercrombie'
ON CONFLICT DO NOTHING;

-- Nordstrom Rack Spring Preview Story
INSERT INTO brand_stories (brand_id, title, story_type, thumbnail_url, background_color, text_color, priority, starts_at, expires_at, metadata)
SELECT
  id,
  'Spring Preview',
  'new_arrivals',
  'https://images.example.com/nordstrom-rack-spring-thumb.jpg',
  '#FFE5E5',
  '#2C1810',
  90,
  CURRENT_TIMESTAMP - INTERVAL '1 hour',
  CURRENT_TIMESTAMP + INTERVAL '7 days',
  '{"season": "Spring 2026", "focus": "dresses"}'::jsonb
FROM brands WHERE slug = 'nordstrom-rack'
ON CONFLICT DO NOTHING;

-- Everlane Conscious Collection Story
INSERT INTO brand_stories (brand_id, title, story_type, thumbnail_url, background_color, text_color, priority, starts_at, expires_at, metadata)
SELECT
  id,
  'Conscious Collection',
  'edit',
  'https://images.example.com/everlane-conscious-thumb.jpg',
  '#F5F5DC',
  '#2F4F2F',
  85,
  CURRENT_TIMESTAMP - INTERVAL '3 hours',
  CURRENT_TIMESTAMP + INTERVAL '14 days',
  '{"collection": "Conscious Basics", "sustainability": "100% organic cotton"}'::jsonb
FROM brands WHERE slug = 'everlane'
ON CONFLICT DO NOTHING;

-- Old Navy Flash Sale Story
INSERT INTO brand_stories (brand_id, title, story_type, thumbnail_url, background_color, text_color, priority, starts_at, expires_at, metadata)
SELECT
  id,
  'Flash Sale - Ends Tonight',
  'sale',
  'https://images.example.com/oldnavy-flash-thumb.jpg',
  '#FF6B6B',
  '#FFFFFF',
  95,
  CURRENT_TIMESTAMP - INTERVAL '6 hours',
  CURRENT_TIMESTAMP + INTERVAL '18 hours',
  '{"discount": "50%", "urgency": "ends tonight"}'::jsonb
FROM brands WHERE slug = 'old-navy'
ON CONFLICT DO NOTHING;

-- =====================================================
-- STORY FRAMES (Individual slides within stories)
-- =====================================================

-- Abercrombie Sale Story Frames
DO $$
DECLARE
  abercrombie_story_id INTEGER;
BEGIN
  SELECT id INTO abercrombie_story_id FROM brand_stories WHERE title = 'Winter Sale 40% Off';

  IF abercrombie_story_id IS NOT NULL THEN
    INSERT INTO brand_story_frames (story_id, frame_order, image_url, caption, cta_text, cta_url, duration_seconds)
    VALUES
      (abercrombie_story_id, 1, 'https://images.example.com/abercrombie-sale-1.jpg', '40% Off All Outerwear', 'Shop Outerwear', 'https://abercrombie.com/sale/outerwear', 5),
      (abercrombie_story_id, 2, 'https://images.example.com/abercrombie-sale-2.jpg', 'Cozy Sweaters on Sale', 'Shop Sweaters', 'https://abercrombie.com/sale/sweaters', 5),
      (abercrombie_story_id, 3, 'https://images.example.com/abercrombie-sale-3.jpg', 'Limited Time Only', 'Shop All Sale', 'https://abercrombie.com/sale', 5)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- =====================================================
-- FEED MODULES (Main feed content carousels)
-- =====================================================

-- Abercrombie Ski Edit Module
INSERT INTO feed_modules (brand_id, title, subtitle, module_type, starts_at, expires_at, priority, target_audience, metadata)
SELECT
  id,
  'Abercrombie Ski Edit',
  'Hit the slopes in style',
  'seasonal_edit',
  CURRENT_TIMESTAMP - INTERVAL '1 day',
  CURRENT_TIMESTAMP + INTERVAL '30 days',
  100,
  '{"occasions": ["vacation"], "categories": ["outerwear", "activewear"]}'::jsonb,
  '{"season": "Winter 2026", "theme": "ski"}'::jsonb
FROM brands WHERE slug = 'abercrombie'
ON CONFLICT DO NOTHING;

-- Nordstrom Rack Spring Dresses Module
INSERT INTO feed_modules (brand_id, title, subtitle, module_type, starts_at, expires_at, priority, target_audience, metadata)
SELECT
  id,
  'Nordstrom Rack Spring Dresses',
  'Fresh styles for the new season',
  'new_arrivals',
  CURRENT_TIMESTAMP - INTERVAL '12 hours',
  CURRENT_TIMESTAMP + INTERVAL '45 days',
  95,
  '{"categories": ["dresses"], "aesthetics": ["romantic", "minimalist"]}'::jsonb,
  '{"season": "Spring 2026"}'::jsonb
FROM brands WHERE slug = 'nordstrom-rack'
ON CONFLICT DO NOTHING;

-- DSW Spring Sandal Arrivals Module
INSERT INTO feed_modules (brand_id, title, subtitle, module_type, starts_at, expires_at, priority, target_audience, metadata)
SELECT
  id,
  'DSW Spring 2026 Sandal Arrivals',
  'Step into spring',
  'new_arrivals',
  CURRENT_TIMESTAMP - INTERVAL '6 hours',
  CURRENT_TIMESTAMP + INTERVAL '60 days',
  90,
  '{"categories": ["shoes"]}'::jsonb,
  '{"season": "Spring 2026", "category": "sandals"}'::jsonb
FROM brands WHERE slug = 'dsw'
ON CONFLICT DO NOTHING;

-- Reformation Summer Vacation Edit Module
INSERT INTO feed_modules (brand_id, title, subtitle, module_type, starts_at, expires_at, priority, target_audience, metadata)
SELECT
  id,
  'Reformation Vacation Shop',
  'Pack your bags in sustainable style',
  'curated',
  CURRENT_TIMESTAMP - INTERVAL '2 days',
  CURRENT_TIMESTAMP + INTERVAL '30 days',
  85,
  '{"occasions": ["vacation"], "aesthetics": ["boho", "romantic"]}'::jsonb,
  '{"theme": "vacation", "sustainability": true}'::jsonb
FROM brands WHERE slug = 'reformation'
ON CONFLICT DO NOTHING;

-- Everlane Work Essentials Module
INSERT INTO feed_modules (brand_id, title, subtitle, module_type, starts_at, expires_at, priority, target_audience, metadata)
SELECT
  id,
  'Everlane Work Essentials',
  'Timeless pieces for the office',
  'curated',
  CURRENT_TIMESTAMP - INTERVAL '1 day',
  CURRENT_TIMESTAMP + INTERVAL '90 days',
  80,
  '{"occasions": ["work"], "aesthetics": ["minimalist"]}'::jsonb,
  '{"collection": "Work Wardrobe"}'::jsonb
FROM brands WHERE slug = 'everlane'
ON CONFLICT DO NOTHING;

-- Old Navy Activewear Sale Module
INSERT INTO feed_modules (brand_id, title, subtitle, module_type, starts_at, expires_at, priority, target_audience, metadata)
SELECT
  id,
  'Old Navy Activewear Sale',
  'Up to 50% off workout gear',
  'sale',
  CURRENT_TIMESTAMP - INTERVAL '3 hours',
  CURRENT_TIMESTAMP + INTERVAL '7 days',
  92,
  '{"categories": ["activewear"]}'::jsonb,
  '{"discount": "up to 50%"}'::jsonb
FROM brands WHERE slug = 'old-navy'
ON CONFLICT DO NOTHING;

-- =====================================================
-- FEED MODULE ITEMS (Items in each carousel)
-- =====================================================

DO $$
DECLARE
  reformation_module_id INTEGER;
  everlane_module_id INTEGER;
  oldnavy_module_id INTEGER;
  juliette_dress_id INTEGER;
  linen_short_id INTEGER;
  linen_shirt_id INTEGER;
  drape_pant_id INTEGER;
  boxy_tee_id INTEGER;
  leggings_id INTEGER;
BEGIN
  -- Get module IDs
  SELECT id INTO reformation_module_id FROM feed_modules WHERE title = 'Reformation Vacation Shop';
  SELECT id INTO everlane_module_id FROM feed_modules WHERE title = 'Everlane Work Essentials';
  SELECT id INTO oldnavy_module_id FROM feed_modules WHERE title = 'Old Navy Activewear Sale';

  -- Get item IDs
  SELECT id INTO juliette_dress_id FROM items WHERE canonical_name = 'Juliette Linen Dress';
  SELECT id INTO linen_short_id FROM items WHERE canonical_name = 'Relaxed Linen Short';
  SELECT id INTO linen_shirt_id FROM items WHERE canonical_name = 'The Linen Relaxed Shirt';
  SELECT id INTO drape_pant_id FROM items WHERE canonical_name = 'The Way-High Drape Pant';
  SELECT id INTO boxy_tee_id FROM items WHERE canonical_name = 'The Cotton Box-Cut Tee';
  SELECT id INTO leggings_id FROM items WHERE canonical_name = 'High-Waisted PowerSoft Leggings';

  -- Reformation Vacation Shop items
  IF reformation_module_id IS NOT NULL AND juliette_dress_id IS NOT NULL THEN
    INSERT INTO feed_module_items (module_id, item_id, display_order, is_featured)
    VALUES
      (reformation_module_id, juliette_dress_id, 1, true),
      (reformation_module_id, linen_short_id, 2, false)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Everlane Work Essentials items
  IF everlane_module_id IS NOT NULL AND linen_shirt_id IS NOT NULL THEN
    INSERT INTO feed_module_items (module_id, item_id, display_order, is_featured)
    VALUES
      (everlane_module_id, linen_shirt_id, 1, false),
      (everlane_module_id, drape_pant_id, 2, true),
      (everlane_module_id, boxy_tee_id, 3, false)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Old Navy Activewear Sale items
  IF oldnavy_module_id IS NOT NULL AND leggings_id IS NOT NULL THEN
    INSERT INTO feed_module_items (module_id, item_id, display_order, is_featured)
    VALUES
      (oldnavy_module_id, leggings_id, 1, true)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
