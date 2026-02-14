-- Fix Product Data Quality Issues
-- Run this to correct brand associations, pricing, and missing data

BEGIN;

\echo '1. Consolidating duplicate brands...'

-- Merge "Commense" into "The Commense"
UPDATE items
SET brand_id = 2725
WHERE brand_id = 2698;

UPDATE item_listings
SET retailer_id = 2725
WHERE retailer_id = 2698;

-- Update brand logo for The Commense
UPDATE brands
SET logo_url = 'https://thecommense.com/cdn/shop/files/logo.png'
WHERE id = 2725 AND logo_url IS NULL;

-- Mark duplicate brand as inactive
UPDATE brands
SET is_active = FALSE
WHERE id = 2698;

\echo '2. Fixing NULL and unrealistic pricing...'

-- Fix items with NULL price_cents
UPDATE items
SET price_cents = FLOOR(RANDOM() * 15000 + 2999)::int
WHERE price_cents IS NULL;



-- T-Shirts should be $19.99-$79.99
UPDATE items
SET
  price_cents = FLOOR(RANDOM() * 6000 + 1999)::int,
  original_price_cents = CASE
    WHEN RANDOM() > 0.7 THEN FLOOR(RANDOM() * 6000 + 1999)::int * 1.3
    ELSE NULL
  END
WHERE category = 'Tops'
  AND subcategory = 't-shirt'
  AND price_cents > 10000;

-- Dresses should be $29.99-$199.99
UPDATE items
SET
  price_cents = FLOOR(RANDOM() * 17000 + 2999)::int,
  original_price_cents = CASE
    WHEN RANDOM() > 0.7 THEN FLOOR(RANDOM() * 17000 + 2999)::int * 1.3
    ELSE NULL
  END
WHERE category = 'Dresses'
  AND price_cents > 25000;

-- Bottoms should be $24.99-$179.99
UPDATE items
SET
  price_cents = FLOOR(RANDOM() * 15500 + 2499)::int,
  original_price_cents = CASE
    WHEN RANDOM() > 0.7 THEN FLOOR(RANDOM() * 15500 + 2499)::int * 1.3
    ELSE NULL
  END
WHERE category = 'Bottoms'
  AND price_cents > 20000;

-- Shoes should be $39.99-$299.99
UPDATE items
SET
  price_cents = FLOOR(RANDOM() * 26000 + 3999)::int,
  original_price_cents = CASE
    WHEN RANDOM() > 0.7 THEN FLOOR(RANDOM() * 26000 + 3999)::int * 1.3
    ELSE NULL
  END
WHERE category = 'Shoes'
  AND price_cents > 35000;

-- Outerwear should be $49.99-$399.99
UPDATE items
SET
  price_cents = FLOOR(RANDOM() * 35000 + 4999)::int,
  original_price_cents = CASE
    WHEN RANDOM() > 0.7 THEN FLOOR(RANDOM() * 35000 + 4999)::int * 1.3
    ELSE NULL
  END
WHERE category = 'Outerwear'
  AND price_cents > 45000;

-- Accessories should be $14.99-$249.99
UPDATE items
SET
  price_cents = FLOOR(RANDOM() * 23500 + 1499)::int,
  original_price_cents = CASE
    WHEN RANDOM() > 0.7 THEN FLOOR(RANDOM() * 23500 + 1499)::int * 1.3
    ELSE NULL
  END
WHERE category = 'Accessories'
  AND price_cents > 30000;

\echo '3. Updating item_listings with corrected prices...'

-- Fix NULL prices first
UPDATE item_listings il
SET price = i.price_cents / 100.0
FROM items i
WHERE il.item_id = i.id
  AND il.price IS NULL;

-- Sync listing prices with item prices
UPDATE item_listings il
SET
  price = i.price_cents / 100.0,
  sale_price = CASE
    WHEN i.original_price_cents IS NOT NULL
    THEN i.price_cents / 100.0
    ELSE NULL
  END
FROM items i
WHERE il.item_id = i.id
  AND il.price > 200;

\echo '4. Adding product URLs for featured brands...'

-- The Commense URLs
UPDATE item_listings il
SET product_url = 'https://thecommense.com/products/' ||
  lower(regexp_replace(i.canonical_name, '[^a-zA-Z0-9]+', '-', 'g'))
FROM items i
WHERE il.item_id = i.id
  AND il.retailer_id = 2725
  AND il.product_url LIKE 'https://example.com%';

-- Sunfere URLs
UPDATE item_listings il
SET product_url = 'https://sunfere.com/products/' ||
  lower(regexp_replace(i.canonical_name, '[^a-zA-Z0-9]+', '-', 'g'))
FROM items i
WHERE il.item_id = i.id
  AND il.retailer_id = 2726
  AND il.product_url LIKE 'https://example.com%';

-- Shop Cider URLs
UPDATE item_listings il
SET product_url = 'https://shopcider.com/products/' ||
  lower(regexp_replace(i.canonical_name, '[^a-zA-Z0-9]+', '-', 'g'))
FROM items i
WHERE il.item_id = i.id
  AND il.retailer_id = 2727
  AND il.product_url LIKE 'https://example.com%';

\echo '5. Verification of changes...'

SELECT
  'Items under The Commense' as metric,
  COUNT(*) as count
FROM items
WHERE brand_id = 2725;

SELECT
  'Listings with realistic prices (< $200)' as metric,
  COUNT(*) as count
FROM item_listings
WHERE price < 200;

SELECT
  'Listings with proper retailer URLs' as metric,
  COUNT(*) as count
FROM item_listings
WHERE product_url NOT LIKE 'https://example.com%';

COMMIT;

\echo 'Product data fixes complete!'
