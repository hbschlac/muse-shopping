-- Populate Style Profile Metadata
-- Migration: 023_populate_style_metadata
-- Purpose: Populate style_archetype, price_tier, category_focus for influencers and items

-- ========================================
-- 1. Populate Influencer Metadata
-- ========================================

-- Update style_archetype/price_tier/commerce_readiness with schema guards
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'fashion_influencers' AND column_name = 'creator_type'
  ) THEN
    -- Update style_archetype based on creator_type and existing aesthetic_tags
    UPDATE fashion_influencers
    SET style_archetype = CASE
      -- Map from aesthetic_tags if available
      WHEN aesthetic_tags @> ARRAY['minimalist'] THEN 'minimal'
      WHEN aesthetic_tags @> ARRAY['streetwear'] THEN 'streetwear'
      WHEN aesthetic_tags @> ARRAY['luxury'] OR aesthetic_tags @> ARRAY['high-end'] THEN 'glam'
      WHEN aesthetic_tags @> ARRAY['classic'] OR aesthetic_tags @> ARRAY['timeless'] THEN 'classic'
      WHEN aesthetic_tags @> ARRAY['bohemian'] OR aesthetic_tags @> ARRAY['boho'] THEN 'boho'
      WHEN aesthetic_tags @> ARRAY['athleisure'] OR aesthetic_tags @> ARRAY['sporty'] THEN 'athleisure'
      WHEN aesthetic_tags @> ARRAY['feminine'] OR aesthetic_tags @> ARRAY['romantic'] THEN 'romantic'
      WHEN aesthetic_tags @> ARRAY['edgy'] OR aesthetic_tags @> ARRAY['grunge'] THEN 'edgy'
      WHEN aesthetic_tags @> ARRAY['preppy'] OR aesthetic_tags @> ARRAY['collegiate'] THEN 'preppy'

      -- Fallback based on creator_type
      WHEN creator_type = 'celebrity' THEN 'glam'
      WHEN creator_type = 'model' THEN 'classic'
      WHEN creator_type = 'designer' THEN 'avant_garde'

      -- Default for fashion influencers
      ELSE 'minimal'
    END
    WHERE style_archetype IS NULL;

    -- Update price_tier for influencers based on luxury brand signals
    UPDATE fashion_influencers
    SET price_tier = CASE
      -- Luxury tier: celebrities, designers, high follower count
      WHEN creator_type IN ('celebrity', 'designer') THEN 'luxury'
      WHEN follower_count > 1000000 THEN 'luxury'

      -- Premium tier: models, high-engagement influencers
      WHEN creator_type = 'model' THEN 'premium'
      WHEN follower_count > 100000 THEN 'premium'

      -- Mid tier: regular fashion influencers
      WHEN creator_type = 'fashion_influencer' AND follower_count > 10000 THEN 'mid'

      -- Budget tier: micro-influencers
      ELSE 'mid'
    END
    WHERE price_tier IS NULL;

    -- Update commerce_readiness_score based on engagement and signals
    UPDATE fashion_influencers
    SET commerce_readiness_score = CASE
      -- High commerce readiness: strong engagement, retailer/publisher
      WHEN creator_type IN ('retailer', 'publisher') THEN 80
      WHEN engagement_rate > 5.0 THEN 70
      WHEN engagement_rate > 3.0 THEN 50
      WHEN engagement_rate > 1.0 THEN 30
      ELSE 10
    END
    WHERE commerce_readiness_score IS NULL OR commerce_readiness_score = 0;
  ELSE
    -- Fallback if creator_type column is missing
    UPDATE fashion_influencers
    SET style_archetype = CASE
      WHEN aesthetic_tags @> ARRAY['minimalist'] THEN 'minimal'
      WHEN aesthetic_tags @> ARRAY['streetwear'] THEN 'streetwear'
      WHEN aesthetic_tags @> ARRAY['luxury'] OR aesthetic_tags @> ARRAY['high-end'] THEN 'glam'
      WHEN aesthetic_tags @> ARRAY['classic'] OR aesthetic_tags @> ARRAY['timeless'] THEN 'classic'
      WHEN aesthetic_tags @> ARRAY['bohemian'] OR aesthetic_tags @> ARRAY['boho'] THEN 'boho'
      WHEN aesthetic_tags @> ARRAY['athleisure'] OR aesthetic_tags @> ARRAY['sporty'] THEN 'athleisure'
      WHEN aesthetic_tags @> ARRAY['feminine'] OR aesthetic_tags @> ARRAY['romantic'] THEN 'romantic'
      WHEN aesthetic_tags @> ARRAY['edgy'] OR aesthetic_tags @> ARRAY['grunge'] THEN 'edgy'
      WHEN aesthetic_tags @> ARRAY['preppy'] OR aesthetic_tags @> ARRAY['collegiate'] THEN 'preppy'
      ELSE 'minimal'
    END
    WHERE style_archetype IS NULL;

    UPDATE fashion_influencers
    SET price_tier = CASE
      WHEN follower_count > 1000000 THEN 'luxury'
      WHEN follower_count > 100000 THEN 'premium'
      WHEN follower_count > 10000 THEN 'mid'
      ELSE 'mid'
    END
    WHERE price_tier IS NULL;

    UPDATE fashion_influencers
    SET commerce_readiness_score = CASE
      WHEN engagement_rate > 5.0 THEN 70
      WHEN engagement_rate > 3.0 THEN 50
      WHEN engagement_rate > 1.0 THEN 30
      ELSE 10
    END
    WHERE commerce_readiness_score IS NULL OR commerce_readiness_score = 0;
  END IF;
END$$;


-- ========================================
-- 2. Populate Product Metadata
-- ========================================

-- Update item metadata with schema guards
DO $$
BEGIN
  -- price_tier based on current_price
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'items' AND column_name = 'current_price')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'items' AND column_name = 'price_tier') THEN
    EXECUTE $sql$
      UPDATE items
      SET price_tier = CASE
        WHEN current_price >= 500 THEN 'luxury'
        WHEN current_price >= 200 THEN 'premium'
        WHEN current_price >= 50 THEN 'mid'
        ELSE 'budget'
      END
      WHERE price_tier IS NULL;
    $sql$;
  END IF;

  -- occasion_tag based on category/subcategory
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'items' AND column_name = 'occasion_tag') THEN
    EXECUTE $sql$
      UPDATE items
      SET occasion_tag = CASE
        WHEN category IN ('Workwear', 'Blazers & Suits') THEN 'work'
        WHEN subcategory LIKE '%blazer%' OR subcategory LIKE '%suit%' THEN 'work'
        WHEN category = 'Dresses' AND subcategory LIKE '%evening%' THEN 'event'
        WHEN category = 'Dresses' AND subcategory LIKE '%cocktail%' THEN 'event'
        WHEN category = 'Dresses' AND subcategory LIKE '%formal%' THEN 'event'
        WHEN category IN ('Activewear', 'Athletic & Sneakers') THEN 'athleisure'
        WHEN subcategory LIKE '%athletic%' OR subcategory LIKE '%sport%' THEN 'athleisure'
        ELSE 'casual'
      END
      WHERE occasion_tag IS NULL;
    $sql$;
  END IF;

  -- style_tags based on category/subcategory
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'items' AND column_name = 'style_tags') THEN
    EXECUTE $sql$
      UPDATE items
      SET style_tags = CASE
        WHEN (subcategory LIKE '%minimal%' OR subcategory LIKE '%simple%' OR subcategory LIKE '%clean%') THEN ARRAY['minimal']
        WHEN (category = 'Athletic & Sneakers' OR subcategory LIKE '%sneaker%' OR subcategory LIKE '%hoodie%') THEN ARRAY['streetwear']
        WHEN (subcategory LIKE '%classic%' OR subcategory LIKE '%blazer%' OR category = 'Workwear') THEN ARRAY['classic']
        WHEN (subcategory LIKE '%evening%' OR subcategory LIKE '%cocktail%' OR subcategory LIKE '%sequin%') THEN ARRAY['glam']
        WHEN (subcategory LIKE '%boho%' OR subcategory LIKE '%folk%' OR subcategory LIKE '%flowy%') THEN ARRAY['boho']
        WHEN (category = 'Activewear' OR subcategory LIKE '%athletic%' OR subcategory LIKE '%sport%') THEN ARRAY['athleisure']
        WHEN (subcategory LIKE '%romantic%' OR subcategory LIKE '%lace%' OR subcategory LIKE '%floral%') THEN ARRAY['romantic']
        WHEN (subcategory LIKE '%leather%' OR subcategory LIKE '%moto%' OR subcategory LIKE '%studded%') THEN ARRAY['edgy']
        WHEN (subcategory LIKE '%preppy%' OR subcategory LIKE '%polo%' OR subcategory LIKE '%plaid%') THEN ARRAY['preppy']
        ELSE ARRAY['minimal', 'classic']
      END
      WHERE style_tags IS NULL OR style_tags = '{}';
    $sql$;
  END IF;
END$$;

-- ========================================
-- 3. Create Function to Auto-Populate on Insert
-- ========================================

-- Function to auto-populate item metadata on insert
CREATE OR REPLACE FUNCTION auto_populate_item_metadata()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-populate price_tier
  IF NEW.price_tier IS NULL AND NEW.current_price IS NOT NULL THEN
    NEW.price_tier := CASE
      WHEN NEW.current_price >= 500 THEN 'luxury'
      WHEN NEW.current_price >= 200 THEN 'premium'
      WHEN NEW.current_price >= 50 THEN 'mid'
      ELSE 'budget'
    END;
  END IF;

  -- Auto-populate occasion_tag
  IF NEW.occasion_tag IS NULL THEN
    NEW.occasion_tag := CASE
      WHEN NEW.category IN ('Workwear', 'Blazers & Suits') THEN 'work'
      WHEN NEW.category = 'Activewear' THEN 'athleisure'
      WHEN NEW.category = 'Dresses' AND NEW.subcategory LIKE '%evening%' THEN 'event'
      ELSE 'casual'
    END;
  END IF;

  -- Auto-populate style_tags
  IF NEW.style_tags IS NULL OR NEW.style_tags = '{}' THEN
    NEW.style_tags := CASE
      WHEN NEW.subcategory LIKE '%minimal%' THEN ARRAY['minimal']
      WHEN NEW.category = 'Athletic & Sneakers' THEN ARRAY['streetwear']
      WHEN NEW.category = 'Workwear' THEN ARRAY['classic']
      WHEN NEW.subcategory LIKE '%evening%' THEN ARRAY['glam']
      WHEN NEW.subcategory LIKE '%boho%' THEN ARRAY['boho']
      WHEN NEW.category = 'Activewear' THEN ARRAY['athleisure']
      WHEN NEW.subcategory LIKE '%lace%' THEN ARRAY['romantic']
      WHEN NEW.subcategory LIKE '%leather%' THEN ARRAY['edgy']
      ELSE ARRAY['minimal', 'classic']
    END;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to items table
DROP TRIGGER IF EXISTS auto_populate_metadata ON items;
CREATE TRIGGER auto_populate_metadata
  BEFORE INSERT OR UPDATE ON items
  FOR EACH ROW
  EXECUTE FUNCTION auto_populate_item_metadata();

-- ========================================
-- 4. Summary Statistics
-- ========================================

-- Count influencers by style archetype
DO $$
DECLARE
  total_influencers INTEGER;
  populated_style INTEGER;
  populated_price INTEGER;
  populated_category INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_influencers FROM fashion_influencers;
  SELECT COUNT(*) INTO populated_style FROM fashion_influencers WHERE style_archetype IS NOT NULL;
  SELECT COUNT(*) INTO populated_price FROM fashion_influencers WHERE price_tier IS NOT NULL;
  SELECT COUNT(*) INTO populated_category FROM fashion_influencers WHERE category_focus IS NOT NULL;

  RAISE NOTICE 'Influencer Metadata Population:';
  RAISE NOTICE '  Total Influencers: %', total_influencers;
  RAISE NOTICE '  Style Archetype populated: %/%', populated_style, total_influencers;
  RAISE NOTICE '  Price Tier populated: %/%', populated_price, total_influencers;
  RAISE NOTICE '  Category Focus populated: %/%', populated_category, total_influencers;
END $$;

-- Count items by price tier
DO $$
DECLARE
  total_items INTEGER;
  populated_price INTEGER;
  populated_occasion INTEGER;
  populated_style INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_items FROM items;
  SELECT COUNT(*) INTO populated_price FROM items WHERE price_tier IS NOT NULL;
  SELECT COUNT(*) INTO populated_occasion FROM items WHERE occasion_tag IS NOT NULL;
  SELECT COUNT(*) INTO populated_style FROM items WHERE style_tags IS NOT NULL AND style_tags <> '{}';

  RAISE NOTICE 'Item Metadata Population:';
  RAISE NOTICE '  Total Items: %', total_items;
  RAISE NOTICE '  Price Tier populated: %/%', populated_price, total_items;
  RAISE NOTICE '  Occasion Tag populated: %/%', populated_occasion, total_items;
  RAISE NOTICE '  Style Tags populated: %/%', populated_style, total_items;
END $$;

COMMENT ON FUNCTION auto_populate_item_metadata() IS 'Auto-populates style metadata for items on insert/update';
