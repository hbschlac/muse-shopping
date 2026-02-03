-- Seed data for sample items
-- This provides test data for recommendations and personalization

-- Sample Items from Everlane (idempotent - only insert if not exists)
INSERT INTO items (brand_id, canonical_name, description, category, subcategory, gender, primary_image_url)
SELECT * FROM (VALUES
  ((SELECT id FROM brands WHERE slug = 'everlane'), 'The Linen Relaxed Shirt', 'Crafted from breezy linen in a relaxed, slightly oversized fit. Features a button-front closure and a single chest pocket. Perfect for warm weather.', 'tops', 'shirts', 'women', 'https://images.example.com/everlane-linen-shirt.jpg'),
  ((SELECT id FROM brands WHERE slug = 'everlane'), 'The Way-High Drape Pant', 'High-waisted pant in a draped, relaxed fit. Made from soft, breathable fabric. Ankle-length with a wide leg.', 'bottoms', 'pants', 'women', 'https://images.example.com/everlane-drape-pant.jpg'),
  ((SELECT id FROM brands WHERE slug = 'everlane'), 'The Cotton Box-Cut Tee', 'Classic boxy tee made from 100% organic cotton. Relaxed fit with a crew neck and short sleeves.', 'tops', 'tshirts', 'women', 'https://images.example.com/everlane-boxy-tee.jpg')
) AS v(brand_id, canonical_name, description, category, subcategory, gender, primary_image_url)
WHERE NOT EXISTS (SELECT 1 FROM items WHERE canonical_name = v.canonical_name);

-- Sample Items from Reformation (idempotent - only insert if not exists)
INSERT INTO items (brand_id, canonical_name, description, category, subcategory, gender, primary_image_url)
SELECT * FROM (VALUES
  ((SELECT id FROM brands WHERE slug = 'reformation'), 'Juliette Linen Dress', 'Flowy midi dress in lightweight linen. Features a V-neckline, puff sleeves, and tiered skirt. Perfect for summer.', 'dresses', 'midi_dresses', 'women', 'https://images.example.com/reformation-juliette-dress.jpg'),
  ((SELECT id FROM brands WHERE slug = 'reformation'), 'Relaxed Linen Short', 'High-waisted linen shorts with a relaxed fit. Side pockets and button closure.', 'bottoms', 'shorts', 'women', 'https://images.example.com/reformation-linen-short.jpg')
) AS v(brand_id, canonical_name, description, category, subcategory, gender, primary_image_url)
WHERE NOT EXISTS (SELECT 1 FROM items WHERE canonical_name = v.canonical_name);

-- Sample Items from Nordstrom (carrying other brands) (idempotent - only insert if not exists)
INSERT INTO items (brand_id, canonical_name, description, category, subcategory, gender, primary_image_url)
SELECT * FROM (VALUES
  ((SELECT id FROM brands WHERE slug = 'madewell'), 'Whisper Cotton V-Neck Tee', 'Soft, lightweight cotton tee with a flattering V-neck. Relaxed fit that works with everything.', 'tops', 'tshirts', 'women', 'https://images.example.com/madewell-whisper-tee.jpg'),
  ((SELECT id FROM brands WHERE slug = 'madewell'), 'The Perfect Vintage Jean', 'Classic straight-leg jean in a vintage wash. High-rise with a relaxed fit through the hip and thigh.', 'bottoms', 'jeans', 'women', 'https://images.example.com/madewell-perfect-vintage.jpg')
) AS v(brand_id, canonical_name, description, category, subcategory, gender, primary_image_url)
WHERE NOT EXISTS (SELECT 1 FROM items WHERE canonical_name = v.canonical_name);

-- Get the item IDs for adding listings and attributes
DO $$
DECLARE
  linen_shirt_id INTEGER;
  drape_pant_id INTEGER;
  boxy_tee_id INTEGER;
  juliette_dress_id INTEGER;
  linen_short_id INTEGER;
  whisper_tee_id INTEGER;
  perfect_jean_id INTEGER;
  everlane_id INTEGER;
  nordstrom_id INTEGER;
  reformation_id INTEGER;
  madewell_id INTEGER;
BEGIN
  -- Get brand IDs
  SELECT id INTO everlane_id FROM brands WHERE slug = 'everlane';
  SELECT id INTO nordstrom_id FROM brands WHERE slug = 'nordstrom';
  SELECT id INTO reformation_id FROM brands WHERE slug = 'reformation';
  SELECT id INTO madewell_id FROM brands WHERE slug = 'madewell';

  -- Get item IDs
  SELECT id INTO linen_shirt_id FROM items WHERE canonical_name = 'The Linen Relaxed Shirt';
  SELECT id INTO drape_pant_id FROM items WHERE canonical_name = 'The Way-High Drape Pant';
  SELECT id INTO boxy_tee_id FROM items WHERE canonical_name = 'The Cotton Box-Cut Tee';
  SELECT id INTO juliette_dress_id FROM items WHERE canonical_name = 'Juliette Linen Dress';
  SELECT id INTO linen_short_id FROM items WHERE canonical_name = 'Relaxed Linen Short';
  SELECT id INTO whisper_tee_id FROM items WHERE canonical_name = 'Whisper Cotton V-Neck Tee';
  SELECT id INTO perfect_jean_id FROM items WHERE canonical_name = 'The Perfect Vintage Jean';

  -- Add listings (where items are sold) - Skip if item doesn't exist
  IF linen_shirt_id IS NOT NULL THEN
    -- Everlane Linen Shirt
    INSERT INTO item_listings (item_id, retailer_id, product_url, price, in_stock, sizes_available, colors_available)
    SELECT linen_shirt_id, everlane_id, 'https://www.everlane.com/products/womens-linen-relaxed-shirt', 68.00, true, '["XS","S","M","L","XL"]', '["Navy","White","Black"]'
    WHERE NOT EXISTS (SELECT 1 FROM item_listings WHERE product_url = 'https://www.everlane.com/products/womens-linen-relaxed-shirt');

    INSERT INTO item_listings (item_id, retailer_id, product_url, price, in_stock, sizes_available, colors_available)
    SELECT linen_shirt_id, nordstrom_id, 'https://www.nordstrom.com/everlane-linen-shirt', 68.00, true, '["XS","S","M","L","XL"]', '["Navy","White"]'
    WHERE NOT EXISTS (SELECT 1 FROM item_listings WHERE product_url = 'https://www.nordstrom.com/everlane-linen-shirt');
  END IF;

  IF drape_pant_id IS NOT NULL THEN
    -- Everlane Drape Pant
    INSERT INTO item_listings (item_id, retailer_id, product_url, price, sale_price, in_stock, sizes_available, colors_available)
    SELECT drape_pant_id, everlane_id, 'https://www.everlane.com/products/womens-way-high-drape-pant', 88.00, null, true, '["0","2","4","6","8","10","12"]', '["Black","Navy","Olive"]'
    WHERE NOT EXISTS (SELECT 1 FROM item_listings WHERE product_url = 'https://www.everlane.com/products/womens-way-high-drape-pant');
  END IF;

  IF boxy_tee_id IS NOT NULL THEN
    -- Everlane Boxy Tee
    INSERT INTO item_listings (item_id, retailer_id, product_url, price, in_stock, sizes_available, colors_available)
    SELECT boxy_tee_id, everlane_id, 'https://www.everlane.com/products/womens-cotton-box-cut-tee', 30.00, true, '["XS","S","M","L","XL"]', '["White","Black","Grey","Navy"]'
    WHERE NOT EXISTS (SELECT 1 FROM item_listings WHERE product_url = 'https://www.everlane.com/products/womens-cotton-box-cut-tee');

    INSERT INTO item_listings (item_id, retailer_id, product_url, price, in_stock, sizes_available, colors_available)
    SELECT boxy_tee_id, nordstrom_id, 'https://www.nordstrom.com/everlane-box-tee', 30.00, true, '["XS","S","M","L"]', '["White","Black"]'
    WHERE NOT EXISTS (SELECT 1 FROM item_listings WHERE product_url = 'https://www.nordstrom.com/everlane-box-tee');
  END IF;

  IF juliette_dress_id IS NOT NULL THEN
    -- Reformation Juliette Dress
    INSERT INTO item_listings (item_id, retailer_id, product_url, price, in_stock, sizes_available, colors_available)
    SELECT juliette_dress_id, reformation_id, 'https://www.thereformation.com/juliette-dress', 218.00, true, '["0","2","4","6","8","10"]', '["Blue Floral","Pink Floral"]'
    WHERE NOT EXISTS (SELECT 1 FROM item_listings WHERE product_url = 'https://www.thereformation.com/juliette-dress');
  END IF;

  IF linen_short_id IS NOT NULL THEN
    -- Reformation Linen Short
    INSERT INTO item_listings (item_id, retailer_id, product_url, price, sale_price, in_stock, sizes_available, colors_available)
    SELECT linen_short_id, reformation_id, 'https://www.thereformation.com/linen-short', 78.00, 62.40, true, '["0","2","4","6","8"]', '["Natural","Black"]'
    WHERE NOT EXISTS (SELECT 1 FROM item_listings WHERE product_url = 'https://www.thereformation.com/linen-short');
  END IF;

  IF whisper_tee_id IS NOT NULL THEN
    -- Madewell Whisper Tee
    INSERT INTO item_listings (item_id, retailer_id, product_url, price, in_stock, sizes_available, colors_available)
    SELECT whisper_tee_id, madewell_id, 'https://www.madewell.com/whisper-tee', 29.50, true, '["XXS","XS","S","M","L","XL"]', '["White","Black","Navy","Stripe"]'
    WHERE NOT EXISTS (SELECT 1 FROM item_listings WHERE product_url = 'https://www.madewell.com/whisper-tee');

    INSERT INTO item_listings (item_id, retailer_id, product_url, price, in_stock, sizes_available, colors_available)
    SELECT whisper_tee_id, nordstrom_id, 'https://www.nordstrom.com/madewell-whisper-tee', 29.50, true, '["XS","S","M","L","XL"]', '["White","Black","Navy"]'
    WHERE NOT EXISTS (SELECT 1 FROM item_listings WHERE product_url = 'https://www.nordstrom.com/madewell-whisper-tee');
  END IF;

  IF perfect_jean_id IS NOT NULL THEN
    -- Madewell Perfect Vintage Jean
    INSERT INTO item_listings (item_id, retailer_id, product_url, price, in_stock, sizes_available, colors_available)
    SELECT perfect_jean_id, madewell_id, 'https://www.madewell.com/perfect-vintage-jean', 128.00, true, '["23","24","25","26","27","28","29","30","31","32"]', '["Fitzgerald Wash","Lunar Wash"]'
    WHERE NOT EXISTS (SELECT 1 FROM item_listings WHERE product_url = 'https://www.madewell.com/perfect-vintage-jean');
  END IF;

  -- Add attributes to items (idempotent - only if item exists and attribute not already assigned)
  IF linen_shirt_id IS NOT NULL THEN
    -- Linen Shirt attributes
    INSERT INTO item_attributes (item_id, attribute_id, confidence, source)
    SELECT linen_shirt_id, id, 1.0, 'manual'
    FROM attribute_taxonomy
    WHERE name IN ('relaxed', 'short_sleeve', 'linen', 'minimalist', 'coastal', 'casual')
    ON CONFLICT (item_id, attribute_id) DO NOTHING;
  END IF;

  IF drape_pant_id IS NOT NULL THEN
    -- Drape Pant attributes
    INSERT INTO item_attributes (item_id, attribute_id, confidence, source)
    SELECT drape_pant_id, id, 1.0, 'manual'
    FROM attribute_taxonomy
    WHERE name IN ('wide_leg', 'relaxed', 'minimalist', 'casual', 'work')
    ON CONFLICT (item_id, attribute_id) DO NOTHING;
  END IF;

  IF boxy_tee_id IS NOT NULL THEN
    -- Boxy Tee attributes
    INSERT INTO item_attributes (item_id, attribute_id, confidence, source)
    SELECT boxy_tee_id, id, 1.0, 'manual'
    FROM attribute_taxonomy
    WHERE name IN ('boxy', 'short_sleeve', 'crew', 'cotton', 'minimalist', 'casual')
    ON CONFLICT (item_id, attribute_id) DO NOTHING;
  END IF;

  IF juliette_dress_id IS NOT NULL THEN
    -- Juliette Dress attributes
    INSERT INTO item_attributes (item_id, attribute_id, confidence, source)
    SELECT juliette_dress_id, id, 1.0, 'manual'
    FROM attribute_taxonomy
    WHERE name IN ('midi', 'v_neck', 'puff_sleeve', 'linen', 'romantic', 'boho', 'vacation')
    ON CONFLICT (item_id, attribute_id) DO NOTHING;
  END IF;

  IF linen_short_id IS NOT NULL THEN
    -- Linen Short attributes
    INSERT INTO item_attributes (item_id, attribute_id, confidence, source)
    SELECT linen_short_id, id, 1.0, 'manual'
    FROM attribute_taxonomy
    WHERE name IN ('relaxed', 'linen', 'minimalist', 'casual', 'vacation')
    ON CONFLICT (item_id, attribute_id) DO NOTHING;
  END IF;

  IF whisper_tee_id IS NOT NULL THEN
    -- Whisper Tee attributes
    INSERT INTO item_attributes (item_id, attribute_id, confidence, source)
    SELECT whisper_tee_id, id, 1.0, 'manual'
    FROM attribute_taxonomy
    WHERE name IN ('relaxed', 'short_sleeve', 'v_neck', 'cotton', 'minimalist', 'casual')
    ON CONFLICT (item_id, attribute_id) DO NOTHING;
  END IF;

  IF perfect_jean_id IS NOT NULL THEN
    -- Perfect Vintage Jean attributes
    INSERT INTO item_attributes (item_id, attribute_id, confidence, source)
    SELECT perfect_jean_id, id, 1.0, 'manual'
    FROM attribute_taxonomy
    WHERE name IN ('straight', 'relaxed', 'denim', 'casual')
    ON CONFLICT (item_id, attribute_id) DO NOTHING;
  END IF;

  -- Note: item_matches table is for when we have duplicate item records
  -- that represent the same product. Since we model it correctly with
  -- one item + multiple listings, we don't need matches for our seed data.

END $$;
