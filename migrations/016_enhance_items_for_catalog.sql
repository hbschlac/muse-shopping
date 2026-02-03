-- Migration: Enhance items table to work with product catalog
-- Connect items to stores and add fields needed for recommendations

-- Add missing columns to items table
ALTER TABLE items
ADD COLUMN IF NOT EXISTS store_id INT REFERENCES stores(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS external_product_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS name VARCHAR(500), -- Alias for canonical_name
ADD COLUMN IF NOT EXISTS price_cents INT,
ADD COLUMN IF NOT EXISTS original_price_cents INT,
ADD COLUMN IF NOT EXISTS product_url TEXT,
ADD COLUMN IF NOT EXISTS colors TEXT[],
ADD COLUMN IF NOT EXISTS sizes TEXT[],
ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS image_url TEXT; -- Alias for primary_image_url

-- Create index on store_id
CREATE INDEX IF NOT EXISTS idx_items_store ON items(store_id);
CREATE INDEX IF NOT EXISTS idx_items_external_id ON items(external_product_id);
CREATE INDEX IF NOT EXISTS idx_items_price ON items(price_cents);
CREATE INDEX IF NOT EXISTS idx_items_available ON items(is_available);

-- Create function to sync product_catalog to items
-- This allows product_catalog (from retailers) to populate the items table (for newsfeed)
CREATE OR REPLACE FUNCTION sync_product_to_item(p_product_id INT)
RETURNS INT AS $$
DECLARE
  v_item_id INT;
  v_product RECORD;
BEGIN
  -- Get product from catalog
  SELECT * INTO v_product
  FROM product_catalog
  WHERE id = p_product_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product % not found', p_product_id;
  END IF;

  -- Upsert into items table
  INSERT INTO items (
    brand_id,
    store_id,
    external_product_id,
    canonical_name,
    name,
    description,
    category,
    subcategory,
    gender,
    primary_image_url,
    image_url,
    additional_images,
    price_cents,
    original_price_cents,
    product_url,
    colors,
    sizes,
    is_available,
    is_active
  )
  VALUES (
    v_product.brand_id,
    v_product.store_id,
    v_product.external_product_id,
    v_product.product_name,
    v_product.product_name,
    v_product.product_description,
    v_product.category,
    v_product.sub_category,
    v_product.gender,
    v_product.primary_image_url,
    v_product.primary_image_url,
    v_product.additional_images,
    v_product.price_cents,
    v_product.original_price_cents,
    v_product.product_url,
    v_product.colors,
    v_product.sizes,
    v_product.is_available,
    true
  )
  ON CONFLICT (external_product_id, store_id)
  DO UPDATE SET
    canonical_name = EXCLUDED.canonical_name,
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    category = EXCLUDED.category,
    subcategory = EXCLUDED.subcategory,
    price_cents = EXCLUDED.price_cents,
    original_price_cents = EXCLUDED.original_price_cents,
    colors = EXCLUDED.colors,
    sizes = EXCLUDED.sizes,
    is_available = EXCLUDED.is_available,
    updated_at = NOW()
  RETURNING id INTO v_item_id;

  IF v_item_id IS NULL THEN
    -- If update, get the ID
    SELECT id INTO v_item_id
    FROM items
    WHERE external_product_id = v_product.external_product_id
      AND store_id = v_product.store_id;
  END IF;

  RETURN v_item_id;
END;
$$ LANGUAGE plpgsql;

-- Add unique constraint for external_product_id + store_id
ALTER TABLE items
ADD CONSTRAINT unique_items_external_store
UNIQUE (external_product_id, store_id);

-- Update existing items to ensure name is populated from canonical_name
UPDATE items SET name = canonical_name WHERE name IS NULL;
UPDATE items SET image_url = primary_image_url WHERE image_url IS NULL;

COMMENT ON FUNCTION sync_product_to_item IS 'Syncs a product from product_catalog to items table for newsfeed display';
COMMENT ON COLUMN items.external_product_id IS 'External product ID from retailer (matches product_catalog)';
COMMENT ON COLUMN items.store_id IS 'Store where this item is sold';
