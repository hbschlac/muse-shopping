-- Seed Sample Data for New Retailers (The Commense, Sunfere, Shop Cider)
-- This populates the retailers with sample products so they appear in discovery/newsfeed

BEGIN;

-- 1. THE COMMENSE Sample Products
DELETE FROM commense_products; -- Clear existing bad data

INSERT INTO commense_products (product_id, product_name, brand_name, current_price, original_price, product_url, image_url, is_in_stock, category, subcategory, average_rating, review_count) VALUES
('COMM-DRESS-001', 'Tiered Ruffle Sleeveless Blazer Dress', 'The Commense', 89.99, 129.99, 'https://thecommense.com/products/tiered-ruffle-sleeveless-blazer-dress', 'https://thecommense.com/cdn/shop/files/B1767008333855_400x.png', true, 'Clothing', 'Dresses', 4.5, 24),
('COMM-DRESS-002', 'Lace Trim Satin Cut Out Capelet Mini Dress', 'The Commense', 79.99, 99.99, 'https://thecommense.com/products/lace-trim-satin-cut-out-capelet-mini-dress', 'https://thecommense.com/cdn/shop/files/B1767750739273_400x.jpg', true, 'Clothing', 'Dresses', 4.7, 18),
('COMM-SET-001', 'Metal Button Vest Wide Leg Pants Set', 'The Commense', 119.99, 149.99, 'https://thecommense.com/products/metal-button-vest-wide-leg-pants-set', 'https://thecommense.com/cdn/shop/files/B1770429489418_400x.jpg', true, 'Clothing', 'Sets', 4.3, 15),
('COMM-TOP-001', 'Satin Mock Neck Draped Blouse', 'The Commense', 59.99, 79.99, 'https://thecommense.com/products/satin-mock-neck-draped-blouse', 'https://thecommense.com/cdn/shop/files/B1768188320691_400x.jpg', true, 'Clothing', 'Tops', 4.6, 22),
('COMM-DRESS-003', 'Contrast Scalloped Trim Sleeveless Midi Dress', 'The Commense', 94.99, 119.99, 'https://thecommense.com/products/contrast-scalloped-trim-sleeveless-midi-dress', 'https://thecommense.com/cdn/shop/files/B1766399086271_400x.png', true, 'Clothing', 'Dresses', 4.8, 31),
('COMM-DRESS-004', 'Floral Print Wrap Maxi Dress', 'The Commense', 84.99, 109.99, 'https://thecommense.com/products/floral-print-wrap-maxi-dress', 'https://via.placeholder.com/400x500/FF6B9D/FFFFFF?text=Floral+Dress', true, 'Clothing', 'Dresses', 4.4, 19),
('COMM-TOP-002', 'Puff Sleeve Cropped Cardigan', 'The Commense', 49.99, 69.99, 'https://thecommense.com/products/puff-sleeve-cropped-cardigan', 'https://via.placeholder.com/400x500/C7A3D8/FFFFFF?text=Cardigan', true, 'Clothing', 'Tops', 4.5, 27),
('COMM-DRESS-005', 'One Shoulder Bodycon Mini Dress', 'The Commense', 69.99, 89.99, 'https://thecommense.com/products/one-shoulder-bodycon-mini-dress', 'https://via.placeholder.com/400x500/87CEEB/FFFFFF?text=Mini+Dress', true, 'Clothing', 'Dresses', 4.6, 33),
('COMM-PANT-001', 'High Waist Wide Leg Trousers', 'The Commense', 74.99, 94.99, 'https://thecommense.com/products/high-waist-wide-leg-trousers', 'https://via.placeholder.com/400x500/98D8C8/FFFFFF?text=Trousers', true, 'Clothing', 'Bottoms', 4.7, 21),
('COMM-TOP-003', 'Silk Touch Cami Top', 'The Commense', 39.99, 54.99, 'https://thecommense.com/products/silk-touch-cami-top', 'https://via.placeholder.com/400x500/F7DC6F/FFFFFF?text=Cami', true, 'Clothing', 'Tops', 4.3, 16);

-- 2. SUNFERE Sample Products
INSERT INTO sunfere_products (product_id, product_name, brand_name, current_price, original_price, product_url, image_url, is_in_stock, category, subcategory, average_rating, review_count) VALUES
('SUNF-DRESS-001', 'Floral Tie Back Midi Dress', 'Sunfere', 98.00, 128.00, 'https://sunfere.com/products/floral-tie-back-midi-dress', 'https://via.placeholder.com/400x500/FFB6C1/FFFFFF?text=Floral+Midi', true, 'Clothing', 'Dresses', 4.8, 42),
('SUNF-DRESS-002', 'Satin Cowl Neck Slip Dress', 'Sunfere', 89.00, 115.00, 'https://sunfere.com/products/satin-cowl-neck-slip-dress', 'https://via.placeholder.com/400x500/DDA0DD/FFFFFF?text=Slip+Dress', true, 'Clothing', 'Dresses', 4.6, 38),
('SUNF-DRESS-003', 'Lace Detail Wedding Guest Dress', 'Sunfere', 145.00, 189.00, 'https://sunfere.com/products/lace-detail-wedding-guest-dress', 'https://via.placeholder.com/400x500/F0E68C/FFFFFF?text=Wedding+Guest', true, 'Clothing', 'Dresses', 4.9, 56),
('SUNF-DRESS-004', 'Off Shoulder Cocktail Dress', 'Sunfere', 118.00, 148.00, 'https://sunfere.com/products/off-shoulder-cocktail-dress', 'https://via.placeholder.com/400x500/ADD8E6/FFFFFF?text=Cocktail', true, 'Clothing', 'Dresses', 4.7, 45),
('SUNF-DRESS-005', 'Ruffle Hem Maxi Dress', 'Sunfere', 132.00, 165.00, 'https://sunfere.com/products/ruffle-hem-maxi-dress', 'https://via.placeholder.com/400x500/FFE4B5/FFFFFF?text=Maxi', true, 'Clothing', 'Dresses', 4.5, 34),
('SUNF-TOP-001', 'Embroidered Peasant Blouse', 'Sunfere', 68.00, 88.00, 'https://sunfere.com/products/embroidered-peasant-blouse', 'https://via.placeholder.com/400x500/FFDAB9/FFFFFF?text=Blouse', true, 'Clothing', 'Tops', 4.4, 29),
('SUNF-DRESS-006', 'Halter Neck Party Dress', 'Sunfere', 95.00, 125.00, 'https://sunfere.com/products/halter-neck-party-dress', 'https://via.placeholder.com/400x500/E6E6FA/FFFFFF?text=Party+Dress', true, 'Clothing', 'Dresses', 4.6, 41),
('SUNF-DRESS-007', 'Flowy Chiffon Maxi Dress', 'Sunfere', 108.00, 138.00, 'https://sunfere.com/products/flowy-chiffon-maxi-dress', 'https://via.placeholder.com/400x500/FFC0CB/FFFFFF?text=Chiffon', true, 'Clothing', 'Dresses', 4.8, 52),
('SUNF-DRESS-008', 'Smocked Bodice Midi Dress', 'Sunfere', 82.00, 106.00, 'https://sunfere.com/products/smocked-bodice-midi-dress', 'https://via.placeholder.com/400x500/98FB98/FFFFFF?text=Smocked', true, 'Clothing', 'Dresses', 4.5, 37),
('SUNF-SKIRT-001', 'Pleated Midi Skirt', 'Sunfere', 72.00, 92.00, 'https://sunfere.com/products/pleated-midi-skirt', 'https://via.placeholder.com/400x500/AFEEEE/FFFFFF?text=Skirt', true, 'Clothing', 'Skirts', 4.3, 25);

-- 3. SHOP CIDER Sample Products
INSERT INTO shopcider_products (product_id, product_name, brand_name, current_price, original_price, product_url, image_url, is_in_stock, category, subcategory, average_rating, review_count) VALUES
('CIDR-DRESS-001', 'Y2K Butterfly Print Mini Dress', 'Shop Cider', 32.99, 45.99, 'https://shopcider.com/products/y2k-butterfly-print-mini-dress', 'https://via.placeholder.com/400x500/FF69B4/FFFFFF?text=Butterfly', true, 'Clothing', 'Dresses', 4.4, 128),
('CIDR-TOP-001', 'Cropped Cardigan Sweater', 'Shop Cider', 28.99, 38.99, 'https://shopcider.com/products/cropped-cardigan-sweater', 'https://via.placeholder.com/400x500/DDA0DD/FFFFFF?text=Cardigan', true, 'Clothing', 'Tops', 4.5, 95),
('CIDR-DRESS-002', 'Cottagecore Floral Midi Dress', 'Shop Cider', 36.99, 49.99, 'https://shopcider.com/products/cottagecore-floral-midi-dress', 'https://via.placeholder.com/400x500/98D8C8/FFFFFF?text=Cottagecore', true, 'Clothing', 'Dresses', 4.6, 142),
('CIDR-PANT-001', 'Low Rise Cargo Pants', 'Shop Cider', 34.99, 44.99, 'https://shopcider.com/products/low-rise-cargo-pants', 'https://via.placeholder.com/400x500/C0C0C0/FFFFFF?text=Cargo', true, 'Clothing', 'Bottoms', 4.3, 87),
('CIDR-TOP-002', 'Mesh Overlay Crop Top', 'Shop Cider', 24.99, 32.99, 'https://shopcider.com/products/mesh-overlay-crop-top', 'https://via.placeholder.com/400x500/E0BBE4/FFFFFF?text=Mesh+Top', true, 'Clothing', 'Tops', 4.4, 76),
('CIDR-DRESS-003', 'Cami Slip Dress', 'Shop Cider', 29.99, 39.99, 'https://shopcider.com/products/cami-slip-dress', 'https://via.placeholder.com/400x500/FFE4E1/FFFFFF?text=Slip', true, 'Clothing', 'Dresses', 4.5, 103),
('CIDR-SKIRT-001', 'Plaid Mini Skirt', 'Shop Cider', 26.99, 35.99, 'https://shopcider.com/products/plaid-mini-skirt', 'https://via.placeholder.com/400x500/FADADD/FFFFFF?text=Plaid', true, 'Clothing', 'Skirts', 4.6, 118),
('CIDR-TOP-003', 'Puff Sleeve Blouse', 'Shop Cider', 31.99, 42.99, 'https://shopcider.com/products/puff-sleeve-blouse', 'https://via.placeholder.com/400x500/B0E0E6/FFFFFF?text=Blouse', true, 'Clothing', 'Tops', 4.3, 69),
('CIDR-DRESS-004', 'Ribbed Bodycon Dress', 'Shop Cider', 27.99, 36.99, 'https://shopcider.com/products/ribbed-bodycon-dress', 'https://via.placeholder.com/400x500/F0E68C/FFFFFF?text=Bodycon', true, 'Clothing', 'Dresses', 4.4, 91),
('CIDR-SET-001', 'Two Piece Lounge Set', 'Shop Cider', 38.99, 52.99, 'https://shopcider.com/products/two-piece-lounge-set', 'https://via.placeholder.com/400x500/D8BFD8/FFFFFF?text=Lounge', true, 'Clothing', 'Sets', 4.5, 84);

COMMIT;
