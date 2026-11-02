-- Migration: 079_create_store_new_arrivals
-- One table for the stores Hannah shops (Nordstrom Rack, TJ Maxx, and any
-- later feed), so Home can show "new in" carousels. An item is "new" from the
-- first time any source (scraper run, affiliate feed import) sees it.
-- Nordstrom keeps its own nordstrom_products table (migration 069); the feed
-- reads both.

INSERT INTO stores (name, slug, display_name, website_url, integration_type, supports_checkout, category)
VALUES ('tjmaxx', 'tjmaxx', 'TJ Maxx', 'https://tjmaxx.tjx.com', 'redirect', false, 'fashion')
ON CONFLICT (slug) DO NOTHING;

CREATE TABLE IF NOT EXISTS store_catalog_items (
  id SERIAL PRIMARY KEY,
  store_slug VARCHAR(100) NOT NULL,          -- stores.slug: 'tjmaxx', 'nordstrom-rack', ...
  external_id VARCHAR(255) NOT NULL,         -- the store's own product id
  name TEXT NOT NULL,
  brand_name VARCHAR(255),
  price_cents INTEGER,
  original_price_cents INTEGER,
  image_url TEXT,
  product_url TEXT NOT NULL,
  department VARCHAR(50),                    -- 'women', 'men', 'kids', 'home'
  category VARCHAR(100),                     -- the store's own category label, if any
  is_available BOOLEAN DEFAULT true,
  source VARCHAR(50) NOT NULL DEFAULT 'scraper', -- 'scraper', 'rakuten', ...
  first_seen_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (store_slug, external_id)
);

CREATE INDEX IF NOT EXISTS idx_store_catalog_items_new
  ON store_catalog_items (store_slug, department, first_seen_at DESC);
