/**
 * Migration: Urban Outfitters Inventory System
 * Purpose: Academic research - tracking Urban Outfitters women's clothing inventory
 *
 * IMPORTANT: This migration supports academic research purposes only.
 * Users must ensure compliance with:
 * - Urban Outfitters's Terms of Service
 * - Urban Outfitters's robots.txt
 * - Applicable data protection regulations
 * - Academic institution's research ethics guidelines
 */

-- Main products table for Urban Outfitters inventory
CREATE TABLE IF NOT EXISTS urbanoutfitters_products (
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
CREATE TABLE IF NOT EXISTS urbanoutfitters_price_history (
  id SERIAL PRIMARY KEY,
  product_id VARCHAR(255) REFERENCES urbanoutfitters_products(product_id),
  price DECIMAL(10, 2) NOT NULL,
  was_on_sale BOOLEAN DEFAULT false,
  sale_price DECIMAL(10, 2),
  recorded_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT unique_urbanoutfitters_price_record UNIQUE (product_id, recorded_at)
);

-- Stock status history
CREATE TABLE IF NOT EXISTS urbanoutfitters_stock_history (
  id SERIAL PRIMARY KEY,
  product_id VARCHAR(255) REFERENCES urbanoutfitters_products(product_id),
  is_in_stock BOOLEAN NOT NULL,
  stock_status VARCHAR(50),
  available_variants INTEGER,
  recorded_at TIMESTAMP DEFAULT NOW()
);

-- Daily inventory snapshots for trend analysis
CREATE TABLE IF NOT EXISTS urbanoutfitters_inventory_snapshots (
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
  categories_breakdown JSONB, -- { "Clothing": 50, "Accessories": 100, ... }
  brands_breakdown JSONB, -- { "Urban Outfitters": 200, "Free People": 50, ... }

  -- Scrape metadata
  scrape_duration_seconds INTEGER,
  scrape_status VARCHAR(50) DEFAULT 'success',
  error_log TEXT,

  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_urbanoutfitters_products_brand ON urbanoutfitters_products(brand_name);
CREATE INDEX IF NOT EXISTS idx_urbanoutfitters_products_category ON urbanoutfitters_products(category);
CREATE INDEX IF NOT EXISTS idx_urbanoutfitters_products_price ON urbanoutfitters_products(current_price);
CREATE INDEX IF NOT EXISTS idx_urbanoutfitters_products_stock ON urbanoutfitters_products(is_in_stock);
CREATE INDEX IF NOT EXISTS idx_urbanoutfitters_products_last_seen ON urbanoutfitters_products(last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_urbanoutfitters_price_history_product ON urbanoutfitters_price_history(product_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_urbanoutfitters_stock_history_product ON urbanoutfitters_stock_history(product_id, recorded_at DESC);

-- Full-text search on product names
CREATE INDEX IF NOT EXISTS idx_urbanoutfitters_products_search ON urbanoutfitters_products USING gin(to_tsvector('english', product_name || ' ' || COALESCE(description, '')));

-- Grant permissions
GRANT ALL PRIVILEGES ON TABLE urbanoutfitters_products TO current_user;
GRANT ALL PRIVILEGES ON TABLE urbanoutfitters_price_history TO current_user;
GRANT ALL PRIVILEGES ON TABLE urbanoutfitters_stock_history TO current_user;
GRANT ALL PRIVILEGES ON TABLE urbanoutfitters_inventory_snapshots TO current_user;
GRANT USAGE, SELECT ON SEQUENCE urbanoutfitters_products_id_seq TO current_user;
GRANT USAGE, SELECT ON SEQUENCE urbanoutfitters_price_history_id_seq TO current_user;
GRANT USAGE, SELECT ON SEQUENCE urbanoutfitters_stock_history_id_seq TO current_user;
GRANT USAGE, SELECT ON SEQUENCE urbanoutfitters_inventory_snapshots_id_seq TO current_user;

COMMENT ON TABLE urbanoutfitters_products IS 'Academic research dataset: Urban Outfitters women''s clothing inventory tracking';
COMMENT ON TABLE urbanoutfitters_price_history IS 'Price changes over time for academic analysis';
COMMENT ON TABLE urbanoutfitters_stock_history IS 'Stock availability tracking for inventory research';
COMMENT ON TABLE urbanoutfitters_inventory_snapshots IS 'Daily snapshots for trend analysis and research';
