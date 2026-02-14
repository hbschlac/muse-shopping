/**
 * Migration: H&M Inventory System
 * Purpose: Academic research - tracking H&M women's clothing inventory
 *
 * IMPORTANT: This migration supports academic research purposes only.
 * Users must ensure compliance with:
 * - H&M's Terms of Service
 * - H&M's robots.txt
 * - Applicable data protection regulations
 * - Academic institution's research ethics guidelines
 */

-- Main products table for H&M inventory
CREATE TABLE IF NOT EXISTS hm_products (
  id SERIAL PRIMARY KEY,
  product_id VARCHAR(255) UNIQUE NOT NULL,
  product_name TEXT NOT NULL,
  brand_name VARCHAR(255),

  -- Pricing
  current_price DECIMAL(10, 2),
  original_price DECIMAL(10, 2),
  is_on_sale BOOLEAN DEFAULT false,
  sale_percentage INTEGER,

  -- Product Details
  category VARCHAR(255),
  subcategory VARCHAR(255),
  description TEXT,

  -- Media
  image_url TEXT,
  product_url TEXT,

  -- Availability
  is_in_stock BOOLEAN DEFAULT true,
  stock_status VARCHAR(50), -- 'In Stock', 'Low Stock', 'Out of Stock', 'Coming Soon'

  -- Ratings & Reviews
  average_rating DECIMAL(3, 2),
  review_count INTEGER DEFAULT 0,

  -- Variants (sizes, colors)
  available_sizes TEXT[], -- Array of available sizes
  available_colors TEXT[], -- Array of available colors
  total_variants INTEGER DEFAULT 0,

  -- Metadata
  first_seen_at TIMESTAMP DEFAULT NOW(),
  last_seen_at TIMESTAMP DEFAULT NOW(),
  last_scraped_at TIMESTAMP DEFAULT NOW(),
  raw_data JSONB, -- Store full scraped data for research

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Price history tracking
CREATE TABLE IF NOT EXISTS hm_price_history (
  id SERIAL PRIMARY KEY,
  product_id VARCHAR(255) REFERENCES hm_products(product_id),
  price DECIMAL(10, 2) NOT NULL,
  was_on_sale BOOLEAN DEFAULT false,
  sale_price DECIMAL(10, 2),
  recorded_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT unique_hm_price_record UNIQUE (product_id, recorded_at)
);

-- Stock status history
CREATE TABLE IF NOT EXISTS hm_stock_history (
  id SERIAL PRIMARY KEY,
  product_id VARCHAR(255) REFERENCES hm_products(product_id),
  is_in_stock BOOLEAN NOT NULL,
  stock_status VARCHAR(50),
  available_variants INTEGER,
  recorded_at TIMESTAMP DEFAULT NOW()
);

-- Daily inventory snapshots for trend analysis
CREATE TABLE IF NOT EXISTS hm_inventory_snapshots (
  id SERIAL PRIMARY KEY,
  snapshot_date DATE UNIQUE NOT NULL,

  -- Overall stats
  total_products INTEGER DEFAULT 0,
  in_stock_products INTEGER DEFAULT 0,
  out_of_stock_products INTEGER DEFAULT 0,

  -- Pricing stats
  average_price DECIMAL(10, 2),
  median_price DECIMAL(10, 2),
  products_on_sale INTEGER DEFAULT 0,
  average_discount_percentage DECIMAL(5, 2),

  -- Category breakdown
  categories_breakdown JSONB, -- { "Dresses": 50, "Tops": 100, ... }
  brands_breakdown JSONB, -- { "H&M": 200, "Other Brand": 50, ... }

  -- Scrape metadata
  scrape_duration_seconds INTEGER,
  scrape_status VARCHAR(50) DEFAULT 'success',
  error_log TEXT,

  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_hm_products_brand ON hm_products(brand_name);
CREATE INDEX IF NOT EXISTS idx_hm_products_category ON hm_products(category);
CREATE INDEX IF NOT EXISTS idx_hm_products_price ON hm_products(current_price);
CREATE INDEX IF NOT EXISTS idx_hm_products_stock ON hm_products(is_in_stock);
CREATE INDEX IF NOT EXISTS idx_hm_products_last_seen ON hm_products(last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_hm_price_history_product ON hm_price_history(product_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_hm_stock_history_product ON hm_stock_history(product_id, recorded_at DESC);

-- Full-text search on product names
CREATE INDEX IF NOT EXISTS idx_hm_products_search ON hm_products USING gin(to_tsvector('english', product_name || ' ' || COALESCE(description, '')));

-- Grant permissions
GRANT ALL PRIVILEGES ON TABLE hm_products TO current_user;
GRANT ALL PRIVILEGES ON TABLE hm_price_history TO current_user;
GRANT ALL PRIVILEGES ON TABLE hm_stock_history TO current_user;
GRANT ALL PRIVILEGES ON TABLE hm_inventory_snapshots TO current_user;
GRANT USAGE, SELECT ON SEQUENCE hm_products_id_seq TO current_user;
GRANT USAGE, SELECT ON SEQUENCE hm_price_history_id_seq TO current_user;
GRANT USAGE, SELECT ON SEQUENCE hm_stock_history_id_seq TO current_user;
GRANT USAGE, SELECT ON SEQUENCE hm_inventory_snapshots_id_seq TO current_user;

COMMENT ON TABLE hm_products IS 'Academic research dataset: H&M women''s clothing inventory tracking';
COMMENT ON TABLE hm_price_history IS 'Price changes over time for academic analysis';
COMMENT ON TABLE hm_stock_history IS 'Stock availability tracking for inventory research';
COMMENT ON TABLE hm_inventory_snapshots IS 'Daily snapshots for trend analysis and research';
