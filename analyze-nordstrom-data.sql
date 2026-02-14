-- Nordstrom Inventory Data Analysis Queries
-- Sample SQL queries for academic research analysis

-- ============================================
-- BASIC STATISTICS
-- ============================================

-- Overall inventory summary
SELECT
  COUNT(*) as total_products,
  COUNT(DISTINCT brand_name) as unique_brands,
  COUNT(*) FILTER (WHERE is_in_stock = true) as in_stock,
  COUNT(*) FILTER (WHERE is_in_stock = false) as out_of_stock,
  ROUND(AVG(current_price), 2) as avg_price,
  ROUND(MIN(current_price), 2) as min_price,
  ROUND(MAX(current_price), 2) as max_price,
  ROUND(AVG(average_rating), 2) as avg_rating,
  SUM(review_count) as total_reviews
FROM nordstrom_products;

-- ============================================
-- BRAND ANALYSIS
-- ============================================

-- Top 20 brands by product count
SELECT
  brand_name,
  COUNT(*) as product_count,
  ROUND(AVG(current_price), 2) as avg_price,
  COUNT(*) FILTER (WHERE is_in_stock = true) as in_stock_count,
  ROUND(AVG(average_rating), 2) as avg_rating,
  SUM(review_count) as total_reviews
FROM nordstrom_products
WHERE brand_name IS NOT NULL
GROUP BY brand_name
ORDER BY product_count DESC
LIMIT 20;

-- Luxury vs. affordable brands (by price point)
SELECT
  CASE
    WHEN AVG(current_price) >= 200 THEN 'Luxury (>$200)'
    WHEN AVG(current_price) >= 100 THEN 'Premium ($100-$200)'
    WHEN AVG(current_price) >= 50 THEN 'Mid-range ($50-$100)'
    ELSE 'Affordable (<$50)'
  END as price_segment,
  COUNT(DISTINCT brand_name) as brand_count,
  COUNT(*) as product_count,
  ROUND(AVG(current_price), 2) as avg_price
FROM nordstrom_products
WHERE brand_name IS NOT NULL
GROUP BY
  CASE
    WHEN AVG(current_price) >= 200 THEN 'Luxury (>$200)'
    WHEN AVG(current_price) >= 100 THEN 'Premium ($100-$200)'
    WHEN AVG(current_price) >= 50 THEN 'Mid-range ($50-$100)'
    ELSE 'Affordable (<$50)'
  END
ORDER BY avg_price DESC;

-- ============================================
-- PRICE ANALYSIS
-- ============================================

-- Price distribution
SELECT
  CASE
    WHEN current_price < 25 THEN '$0-25'
    WHEN current_price < 50 THEN '$25-50'
    WHEN current_price < 100 THEN '$50-100'
    WHEN current_price < 200 THEN '$100-200'
    WHEN current_price < 500 THEN '$200-500'
    ELSE '$500+'
  END as price_range,
  COUNT(*) as product_count,
  ROUND((COUNT(*) * 100.0 / SUM(COUNT(*)) OVER ()), 2) as percentage
FROM nordstrom_products
WHERE current_price IS NOT NULL
GROUP BY
  CASE
    WHEN current_price < 25 THEN '$0-25'
    WHEN current_price < 50 THEN '$25-50'
    WHEN current_price < 100 THEN '$50-100'
    WHEN current_price < 200 THEN '$100-200'
    WHEN current_price < 500 THEN '$200-500'
    ELSE '$500+'
  END
ORDER BY MIN(current_price);

-- Products with biggest discounts
SELECT
  product_name,
  brand_name,
  original_price,
  current_price,
  discount_percentage,
  ROUND((original_price - current_price), 2) as savings
FROM nordstrom_products
WHERE discount_percentage > 0
ORDER BY discount_percentage DESC
LIMIT 20;

-- ============================================
-- INVENTORY ANALYSIS
-- ============================================

-- Stock status by brand
SELECT
  brand_name,
  COUNT(*) as total_products,
  COUNT(*) FILTER (WHERE is_in_stock = true) as in_stock,
  COUNT(*) FILTER (WHERE is_in_stock = false) as out_of_stock,
  ROUND(
    COUNT(*) FILTER (WHERE is_in_stock = true) * 100.0 / COUNT(*),
    2
  ) as stock_percentage
FROM nordstrom_products
WHERE brand_name IS NOT NULL
GROUP BY brand_name
HAVING COUNT(*) >= 10
ORDER BY stock_percentage DESC
LIMIT 20;

-- Recently out of stock items
SELECT
  product_id,
  product_name,
  brand_name,
  current_price,
  last_seen_at,
  EXTRACT(DAY FROM (CURRENT_TIMESTAMP - last_seen_at)) as days_since_stock_out
FROM nordstrom_products
WHERE is_in_stock = false
  AND last_seen_at IS NOT NULL
ORDER BY last_seen_at DESC
LIMIT 20;

-- ============================================
-- RATING & REVIEW ANALYSIS
-- ============================================

-- Highest rated products (with sufficient reviews)
SELECT
  product_name,
  brand_name,
  current_price,
  average_rating,
  review_count
FROM nordstrom_products
WHERE review_count >= 10
  AND average_rating IS NOT NULL
ORDER BY average_rating DESC, review_count DESC
LIMIT 20;

-- Most reviewed products
SELECT
  product_name,
  brand_name,
  current_price,
  average_rating,
  review_count
FROM nordstrom_products
WHERE review_count > 0
ORDER BY review_count DESC
LIMIT 20;

-- Rating distribution
SELECT
  CASE
    WHEN average_rating >= 4.5 THEN '4.5-5.0 (Excellent)'
    WHEN average_rating >= 4.0 THEN '4.0-4.5 (Very Good)'
    WHEN average_rating >= 3.5 THEN '3.5-4.0 (Good)'
    WHEN average_rating >= 3.0 THEN '3.0-3.5 (Average)'
    ELSE 'Below 3.0 (Poor)'
  END as rating_category,
  COUNT(*) as product_count,
  ROUND(AVG(current_price), 2) as avg_price
FROM nordstrom_products
WHERE average_rating IS NOT NULL
GROUP BY
  CASE
    WHEN average_rating >= 4.5 THEN '4.5-5.0 (Excellent)'
    WHEN average_rating >= 4.0 THEN '4.0-4.5 (Very Good)'
    WHEN average_rating >= 3.5 THEN '3.5-4.0 (Good)'
    WHEN average_rating >= 3.0 THEN '3.0-3.5 (Average)'
    ELSE 'Below 3.0 (Poor)'
  END
ORDER BY MIN(average_rating) DESC;

-- ============================================
-- TIME-BASED ANALYSIS
-- ============================================

-- Products by first seen date
SELECT
  DATE(first_seen_at) as date,
  COUNT(*) as new_products
FROM nordstrom_products
WHERE first_seen_at IS NOT NULL
GROUP BY DATE(first_seen_at)
ORDER BY date DESC
LIMIT 30;

-- Daily snapshot trends
SELECT
  snapshot_date,
  total_products,
  in_stock_products,
  out_of_stock_products,
  ROUND((in_stock_products * 100.0 / NULLIF(total_products, 0)), 2) as stock_rate,
  ROUND(average_price, 2) as avg_price,
  scrape_duration_seconds,
  scrape_status
FROM nordstrom_inventory_snapshots
ORDER BY snapshot_date DESC
LIMIT 30;

-- ============================================
-- PRICE HISTORY ANALYSIS
-- ============================================

-- Products with most price changes
SELECT
  p.product_id,
  p.product_name,
  p.brand_name,
  COUNT(DISTINCT h.price) as unique_prices,
  MIN(h.price) as lowest_price,
  MAX(h.price) as highest_price,
  ROUND(MAX(h.price) - MIN(h.price), 2) as price_range
FROM nordstrom_products p
JOIN nordstrom_price_history h ON p.product_id = h.product_id
GROUP BY p.product_id, p.product_name, p.brand_name
HAVING COUNT(DISTINCT h.price) > 1
ORDER BY unique_prices DESC
LIMIT 20;

-- Average price trends over time (last 30 days)
SELECT
  DATE(recorded_at) as date,
  COUNT(DISTINCT product_id) as products_tracked,
  ROUND(AVG(price), 2) as avg_price,
  ROUND(MIN(price), 2) as min_price,
  ROUND(MAX(price), 2) as max_price
FROM nordstrom_price_history
WHERE recorded_at >= CURRENT_TIMESTAMP - INTERVAL '30 days'
GROUP BY DATE(recorded_at)
ORDER BY date DESC;

-- ============================================
-- CATEGORY ANALYSIS
-- ============================================

-- Products by category (if populated)
SELECT
  category,
  COUNT(*) as product_count,
  COUNT(DISTINCT brand_name) as brand_count,
  ROUND(AVG(current_price), 2) as avg_price,
  COUNT(*) FILTER (WHERE is_in_stock = true) as in_stock
FROM nordstrom_products
WHERE category IS NOT NULL
GROUP BY category
ORDER BY product_count DESC;

-- Subcategory breakdown
SELECT
  category,
  subcategory,
  COUNT(*) as product_count,
  ROUND(AVG(current_price), 2) as avg_price
FROM nordstrom_products
WHERE category IS NOT NULL
  AND subcategory IS NOT NULL
GROUP BY category, subcategory
ORDER BY category, product_count DESC;

-- ============================================
-- COMPETITIVE ANALYSIS
-- ============================================

-- Price comparison between similar products
-- (Example: Compare products with similar names)
SELECT
  brand_name,
  product_name,
  current_price,
  average_rating,
  review_count,
  is_in_stock
FROM nordstrom_products
WHERE LOWER(product_name) LIKE '%dress%'
  AND current_price IS NOT NULL
ORDER BY current_price
LIMIT 30;

-- ============================================
-- DATA QUALITY CHECKS
-- ============================================

-- Missing data summary
SELECT
  COUNT(*) as total_products,
  COUNT(*) FILTER (WHERE brand_name IS NULL) as missing_brand,
  COUNT(*) FILTER (WHERE current_price IS NULL) as missing_price,
  COUNT(*) FILTER (WHERE image_url IS NULL) as missing_image,
  COUNT(*) FILTER (WHERE average_rating IS NULL) as missing_rating,
  COUNT(*) FILTER (WHERE category IS NULL) as missing_category
FROM nordstrom_products;

-- Products with complete data
SELECT
  product_name,
  brand_name,
  current_price,
  average_rating,
  review_count,
  category,
  subcategory
FROM nordstrom_products
WHERE brand_name IS NOT NULL
  AND current_price IS NOT NULL
  AND average_rating IS NOT NULL
  AND category IS NOT NULL
LIMIT 10;

-- ============================================
-- EXPORT QUERIES FOR RESEARCH
-- ============================================

-- Full product export with all metrics
\copy (SELECT product_id, product_name, brand_name, current_price, original_price, discount_percentage, is_in_stock, category, subcategory, average_rating, review_count, first_seen_at, last_seen_at FROM nordstrom_products ORDER BY brand_name, product_name) TO 'nordstrom_products_export.csv' WITH CSV HEADER;

-- Daily snapshot export
\copy (SELECT * FROM nordstrom_inventory_snapshots ORDER BY snapshot_date DESC) TO 'nordstrom_snapshots_export.csv' WITH CSV HEADER;

-- Price history export
\copy (SELECT h.product_id, p.product_name, p.brand_name, h.price, h.recorded_at FROM nordstrom_price_history h JOIN nordstrom_products p ON h.product_id = p.product_id ORDER BY h.recorded_at DESC) TO 'nordstrom_price_history_export.csv' WITH CSV HEADER;

-- ============================================
-- CUSTOM ANALYSIS TEMPLATES
-- ============================================

-- Template: Find products in specific price range and brand
SELECT *
FROM nordstrom_products
WHERE brand_name ILIKE '%YOUR_BRAND%'
  AND current_price BETWEEN 50 AND 150
  AND is_in_stock = true
ORDER BY current_price;

-- Template: Analyze brand performance
SELECT
  brand_name,
  COUNT(*) as products,
  ROUND(AVG(current_price), 2) as avg_price,
  ROUND(AVG(average_rating), 2) as avg_rating,
  SUM(review_count) as total_reviews,
  COUNT(*) FILTER (WHERE is_in_stock = true) as in_stock
FROM nordstrom_products
WHERE brand_name = 'YOUR_BRAND'
GROUP BY brand_name;

-- Template: Track price changes for specific product
SELECT
  p.product_name,
  p.brand_name,
  h.price,
  h.recorded_at
FROM nordstrom_price_history h
JOIN nordstrom_products p ON h.product_id = p.product_id
WHERE p.product_id = 'YOUR_PRODUCT_ID'
ORDER BY h.recorded_at DESC;
