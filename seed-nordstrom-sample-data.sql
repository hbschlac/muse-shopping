-- Sample data for Nordstrom Inventory System
-- This creates test data to demonstrate the system functionality

-- Clear any existing sample data
DELETE FROM nordstrom_products WHERE product_id LIKE 'SAMPLE-%';

-- Insert sample products
INSERT INTO nordstrom_products (
  product_id, product_name, brand_name, current_price, original_price,
  discount_percentage, image_url, product_url, is_in_stock,
  category, subcategory, average_rating, review_count
) VALUES
  ('SAMPLE-001', 'Essential Cotton T-Shirt', 'Madewell', 29.50, 35.00, 16,
   'https://example.com/img1.jpg', 'https://www.nordstrom.com/s/sample-001', true,
   'Clothing', 'Tops', 4.5, 127),

  ('SAMPLE-002', 'High-Rise Skinny Jeans', 'Good American', 169.00, 189.00, 11,
   'https://example.com/img2.jpg', 'https://www.nordstrom.com/s/sample-002', true,
   'Clothing', 'Denim', 4.7, 234),

  ('SAMPLE-003', 'Quilted Crossbody Bag', 'Rebecca Minkoff', 198.00, 248.00, 20,
   'https://example.com/img3.jpg', 'https://www.nordstrom.com/s/sample-003', true,
   'Accessories', 'Handbags', 4.3, 89),

  ('SAMPLE-004', 'Cashmere Crew Sweater', 'Halogen', 98.00, NULL, NULL,
   'https://example.com/img4.jpg', 'https://www.nordstrom.com/s/sample-004', true,
   'Clothing', 'Sweaters', 4.6, 156),

  ('SAMPLE-005', 'Leather Ankle Boots', 'Sam Edelman', 149.95, 200.00, 25,
   'https://example.com/img5.jpg', 'https://www.nordstrom.com/s/sample-005', false,
   'Shoes', 'Boots', 4.4, 312),

  ('SAMPLE-006', 'Floral Midi Dress', 'Free People', 128.00, 168.00, 24,
   'https://example.com/img6.jpg', 'https://www.nordstrom.com/s/sample-006', true,
   'Clothing', 'Dresses', 4.2, 67),

  ('SAMPLE-007', 'Active Leggings', 'Zella', 59.00, NULL, NULL,
   'https://example.com/img7.jpg', 'https://www.nordstrom.com/s/sample-007', true,
   'Activewear', 'Bottoms', 4.8, 891),

  ('SAMPLE-008', 'Statement Earrings', 'BaubleBar', 42.00, 58.00, 28,
   'https://example.com/img8.jpg', 'https://www.nordstrom.com/s/sample-008', true,
   'Accessories', 'Jewelry', 4.1, 45),

  ('SAMPLE-009', 'Silk Blouse', 'Equipment', 198.00, 268.00, 26,
   'https://example.com/img9.jpg', 'https://www.nordstrom.com/s/sample-009', true,
   'Clothing', 'Tops', 4.5, 78),

  ('SAMPLE-010', 'Wool Blend Coat', 'Cole Haan', 398.00, 495.00, 20,
   'https://example.com/img10.jpg', 'https://www.nordstrom.com/s/sample-010', false,
   'Outerwear', 'Coats', 4.7, 123);

-- Insert sample variants
INSERT INTO nordstrom_product_variants (
  product_id, variant_id, size, color, is_in_stock, sku
) VALUES
  ('SAMPLE-001', 'SAMPLE-001-S-WHT', 'S', 'White', true, 'MDW-001-S-WHT'),
  ('SAMPLE-001', 'SAMPLE-001-M-WHT', 'M', 'White', true, 'MDW-001-M-WHT'),
  ('SAMPLE-001', 'SAMPLE-001-L-WHT', 'L', 'White', true, 'MDW-001-L-WHT'),
  ('SAMPLE-001', 'SAMPLE-001-S-BLK', 'S', 'Black', true, 'MDW-001-S-BLK'),

  ('SAMPLE-002', 'SAMPLE-002-25', '25', 'Dark Wash', true, 'GA-002-25-DRK'),
  ('SAMPLE-002', 'SAMPLE-002-26', '26', 'Dark Wash', true, 'GA-002-26-DRK'),
  ('SAMPLE-002', 'SAMPLE-002-27', '27', 'Dark Wash', false, 'GA-002-27-DRK'),

  ('SAMPLE-007', 'SAMPLE-007-XS', 'XS', 'Black', true, 'ZEL-007-XS-BLK'),
  ('SAMPLE-007', 'SAMPLE-007-S', 'S', 'Black', true, 'ZEL-007-S-BLK'),
  ('SAMPLE-007', 'SAMPLE-007-M', 'M', 'Black', true, 'ZEL-007-M-BLK'),
  ('SAMPLE-007', 'SAMPLE-007-L', 'L', 'Black', true, 'ZEL-007-L-BLK');

-- Insert sample price history
INSERT INTO nordstrom_price_history (product_id, price, was_on_sale, recorded_at) VALUES
  ('SAMPLE-001', 35.00, false, NOW() - INTERVAL '30 days'),
  ('SAMPLE-001', 31.50, true, NOW() - INTERVAL '15 days'),
  ('SAMPLE-001', 29.50, true, NOW() - INTERVAL '1 day'),

  ('SAMPLE-002', 189.00, false, NOW() - INTERVAL '30 days'),
  ('SAMPLE-002', 169.00, true, NOW() - INTERVAL '5 days'),

  ('SAMPLE-007', 59.00, false, NOW() - INTERVAL '60 days'),
  ('SAMPLE-007', 59.00, false, NOW() - INTERVAL '30 days'),
  ('SAMPLE-007', 59.00, false, NOW() - INTERVAL '1 day');

-- Insert sample snapshot
INSERT INTO nordstrom_inventory_snapshots (
  snapshot_date, total_products, in_stock_products, out_of_stock_products,
  average_price, scrape_duration_seconds, scrape_status
) VALUES (
  CURRENT_DATE,
  10,
  8,
  2,
  136.95,
  145,
  'success'
);

-- Display summary
SELECT
  'Sample Data Inserted' as status,
  COUNT(*) as products,
  COUNT(DISTINCT brand_name) as brands,
  ROUND(AVG(current_price), 2) as avg_price
FROM nordstrom_products
WHERE product_id LIKE 'SAMPLE-%';
