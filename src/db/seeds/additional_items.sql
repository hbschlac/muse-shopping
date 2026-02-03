-- Additional seed items from Cider, Bloomingdale's, AliExpress, and Old Navy
-- Demonstrates diverse price points and aesthetics

-- First, add the new retailers if they don't exist
INSERT INTO brands (name, slug, description, category, price_tier, website_url, is_retailer, metadata) VALUES
('Cider', 'cider', 'Gen Z fashion brand known for trendy, affordable styles', 'fast-fashion', 'budget', 'https://www.shopcider.com', true, '{"country": "China", "founded": 2020, "aesthetic": "Y2K"}'),
('Bloomingdale''s', 'bloomingdales', 'Upscale American department store chain', 'department-store', 'premium', 'https://www.bloomingdales.com', true, '{"country": "USA", "founded": 1861}'),
('AliExpress', 'aliexpress', 'Global online retail marketplace', 'marketplace', 'budget', 'https://www.aliexpress.com', true, '{"country": "China", "parent": "Alibaba Group"}'),
('Old Navy', 'old-navy', 'American clothing and accessories retailer offering affordable family fashion', 'fast-fashion', 'budget', 'https://www.oldnavy.com', true, '{"country": "USA", "founded": 1994, "parent": "Gap Inc."}')
ON CONFLICT (slug) DO NOTHING;

-- Add items (idempotent - only insert if not exists)
INSERT INTO items (brand_id, canonical_name, description, category, subcategory, gender, primary_image_url)
SELECT * FROM (VALUES
  ((SELECT id FROM brands WHERE slug = 'cider'), 'Y2K Butterfly Print Baby Tee', 'Cute baby tee with butterfly graphics and contrast trim. Fitted crop style perfect for layering. 100% cotton.', 'tops', 'tshirts', 'women', 'https://images.example.com/cider-butterfly-tee.jpg'),
  ((SELECT id FROM brands WHERE slug = 'bloomingdales'), 'Theory Essential Cashmere Crew Sweater', 'Luxurious cashmere crewneck sweater in a relaxed fit. Ribbed trim at neck, cuffs and hem. A timeless wardrobe essential.', 'tops', 'sweaters', 'women', 'https://images.example.com/theory-cashmere-sweater.jpg'),
  ((SELECT id FROM brands WHERE slug = 'aliexpress'), 'Korean Style Oversized Blazer', 'Trendy oversized blazer with notched lapels and single button closure. Relaxed boyfriend fit. Polyester blend.', 'outerwear', 'blazers', 'women', 'https://images.example.com/aliexpress-blazer.jpg'),
  ((SELECT id FROM brands WHERE slug = 'old-navy'), 'High-Waisted PowerSoft Leggings', 'Super-soft performance leggings with a high-rise waist. Moisture-wicking fabric perfect for workouts or everyday wear.', 'activewear', 'leggings', 'women', 'https://images.example.com/oldnavy-leggings.jpg')
) AS v(brand_id, canonical_name, description, category, subcategory, gender, primary_image_url)
WHERE NOT EXISTS (SELECT 1 FROM items WHERE canonical_name = v.canonical_name);

-- Add listings and attributes
DO $$
DECLARE
  cider_tee_id INTEGER;
  theory_sweater_id INTEGER;
  aliexpress_blazer_id INTEGER;
  oldnavy_leggings_id INTEGER;
  cider_id INTEGER;
  bloomingdales_id INTEGER;
  aliexpress_id INTEGER;
  oldnavy_id INTEGER;
BEGIN
  -- Get brand/retailer IDs
  SELECT id INTO cider_id FROM brands WHERE slug = 'cider';
  SELECT id INTO bloomingdales_id FROM brands WHERE slug = 'bloomingdales';
  SELECT id INTO aliexpress_id FROM brands WHERE slug = 'aliexpress';
  SELECT id INTO oldnavy_id FROM brands WHERE slug = 'old-navy';

  -- Get item IDs
  SELECT id INTO cider_tee_id FROM items WHERE canonical_name = 'Y2K Butterfly Print Baby Tee';
  SELECT id INTO theory_sweater_id FROM items WHERE canonical_name = 'Theory Essential Cashmere Crew Sweater';
  SELECT id INTO aliexpress_blazer_id FROM items WHERE canonical_name = 'Korean Style Oversized Blazer';
  SELECT id INTO oldnavy_leggings_id FROM items WHERE canonical_name = 'High-Waisted PowerSoft Leggings';

  -- Add listings (idempotent - only if item exists and listing doesn't)
  IF cider_tee_id IS NOT NULL THEN
    INSERT INTO item_listings (item_id, retailer_id, product_url, price, in_stock, sizes_available, colors_available)
    SELECT cider_tee_id, cider_id, 'https://www.shopcider.com/butterfly-baby-tee', 12.99, true, '["XS","S","M","L"]', '["White","Pink","Blue"]'
    WHERE NOT EXISTS (SELECT 1 FROM item_listings WHERE product_url = 'https://www.shopcider.com/butterfly-baby-tee');
  END IF;

  IF theory_sweater_id IS NOT NULL THEN
    INSERT INTO item_listings (item_id, retailer_id, product_url, price, sale_price, in_stock, sizes_available, colors_available)
    SELECT theory_sweater_id, bloomingdales_id, 'https://www.bloomingdales.com/theory-cashmere-sweater', 395.00, 276.50, true, '["XS","S","M","L","XL"]', '["Black","Camel","Navy","Grey"]'
    WHERE NOT EXISTS (SELECT 1 FROM item_listings WHERE product_url = 'https://www.bloomingdales.com/theory-cashmere-sweater');
  END IF;

  IF aliexpress_blazer_id IS NOT NULL THEN
    INSERT INTO item_listings (item_id, retailer_id, product_url, price, in_stock, sizes_available, colors_available)
    SELECT aliexpress_blazer_id, aliexpress_id, 'https://www.aliexpress.com/korean-blazer', 24.99, true, '["S","M","L","XL"]', '["Black","Grey","Khaki"]'
    WHERE NOT EXISTS (SELECT 1 FROM item_listings WHERE product_url = 'https://www.aliexpress.com/korean-blazer');
  END IF;

  IF oldnavy_leggings_id IS NOT NULL THEN
    INSERT INTO item_listings (item_id, retailer_id, product_url, price, sale_price, in_stock, sizes_available, colors_available)
    SELECT oldnavy_leggings_id, oldnavy_id, 'https://www.oldnavy.com/powersoft-leggings', 30.00, 19.99, true, '["XXS","XS","S","M","L","XL","XXL"]', '["Black","Navy","Grey","Burgundy"]'
    WHERE NOT EXISTS (SELECT 1 FROM item_listings WHERE product_url = 'https://www.oldnavy.com/powersoft-leggings');
  END IF;

  -- Add attributes (idempotent - only if item exists and attribute not already assigned)
  IF cider_tee_id IS NOT NULL THEN
    INSERT INTO item_attributes (item_id, attribute_id, confidence, source)
    SELECT cider_tee_id, id, 1.0, 'manual'
    FROM attribute_taxonomy
    WHERE name IN ('fitted', 'short_sleeve', 'crew', 'cotton', 'y2k', 'casual')
    ON CONFLICT (item_id, attribute_id) DO NOTHING;
  END IF;

  IF theory_sweater_id IS NOT NULL THEN
    INSERT INTO item_attributes (item_id, attribute_id, confidence, source)
    SELECT theory_sweater_id, id, 1.0, 'manual'
    FROM attribute_taxonomy
    WHERE name IN ('relaxed', 'long_sleeve', 'crew', 'cashmere', 'minimalist', 'work', 'casual')
    ON CONFLICT (item_id, attribute_id) DO NOTHING;
  END IF;

  IF aliexpress_blazer_id IS NOT NULL THEN
    INSERT INTO item_attributes (item_id, attribute_id, confidence, source)
    SELECT aliexpress_blazer_id, id, 1.0, 'manual'
    FROM attribute_taxonomy
    WHERE name IN ('oversized', 'work', 'casual')
    ON CONFLICT (item_id, attribute_id) DO NOTHING;
  END IF;

  IF oldnavy_leggings_id IS NOT NULL THEN
    INSERT INTO item_attributes (item_id, attribute_id, confidence, source)
    SELECT oldnavy_leggings_id, id, 1.0, 'manual'
    FROM attribute_taxonomy
    WHERE name IN ('fitted', 'casual')
    ON CONFLICT (item_id, attribute_id) DO NOTHING;
  END IF;

END $$;
