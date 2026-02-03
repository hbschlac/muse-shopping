-- Brand Aliases Seed Data
-- Created: 2026-02-02
-- Purpose: Populate brand_aliases with common email domains and name variations

-- =====================================================
-- NOTE: This assumes brands exist with these names
-- Run after your main brand seeds
-- =====================================================

-- =====================================================
-- ZARA - Fast fashion retailer
-- =====================================================
INSERT INTO brand_aliases (brand_id, alias_type, alias_value, confidence_score)
SELECT id, 'email_domain', 'zara.com', 100 FROM brands WHERE LOWER(name) = 'zara' LIMIT 1;

INSERT INTO brand_aliases (brand_id, alias_type, alias_value, confidence_score)
SELECT id, 'email_domain', 'orders@zara.com', 100 FROM brands WHERE LOWER(name) = 'zara' LIMIT 1;

INSERT INTO brand_aliases (brand_id, alias_type, alias_value, confidence_score)
SELECT id, 'email_domain', 'noreply@zara.com', 100 FROM brands WHERE LOWER(name) = 'zara' LIMIT 1;

INSERT INTO brand_aliases (brand_id, alias_type, alias_value, confidence_score)
SELECT id, 'store_name', 'ZARA', 100 FROM brands WHERE LOWER(name) = 'zara' LIMIT 1;

INSERT INTO brand_aliases (brand_id, alias_type, alias_value, confidence_score)
SELECT id, 'variation', 'Zara.com', 95 FROM brands WHERE LOWER(name) = 'zara' LIMIT 1;

-- =====================================================
-- H&M - Fashion retailer
-- =====================================================
INSERT INTO brand_aliases (brand_id, alias_type, alias_value, confidence_score)
SELECT id, 'email_domain', 'hm.com', 100 FROM brands WHERE LOWER(name) = 'h&m' LIMIT 1;

INSERT INTO brand_aliases (brand_id, alias_type, alias_value, confidence_score)
SELECT id, 'email_domain', 'email.hm.com', 100 FROM brands WHERE LOWER(name) = 'h&m' LIMIT 1;

INSERT INTO brand_aliases (brand_id, alias_type, alias_value, confidence_score)
SELECT id, 'email_domain', 'hm@email.hm.com', 100 FROM brands WHERE LOWER(name) = 'h&m' LIMIT 1;

INSERT INTO brand_aliases (brand_id, alias_type, alias_value, confidence_score)
SELECT id, 'store_name', 'H&M', 100 FROM brands WHERE LOWER(name) = 'h&m' LIMIT 1;

INSERT INTO brand_aliases (brand_id, alias_type, alias_value, confidence_score)
SELECT id, 'variation', 'H & M', 95 FROM brands WHERE LOWER(name) = 'h&m' LIMIT 1;

INSERT INTO brand_aliases (brand_id, alias_type, alias_value, confidence_score)
SELECT id, 'variation', 'HM.com', 90 FROM brands WHERE LOWER(name) = 'h&m' LIMIT 1;

-- =====================================================
-- NIKE - Athletic apparel
-- =====================================================
INSERT INTO brand_aliases (brand_id, alias_type, alias_value, confidence_score)
SELECT id, 'email_domain', 'nike.com', 100 FROM brands WHERE LOWER(name) = 'nike' LIMIT 1;

INSERT INTO brand_aliases (brand_id, alias_type, alias_value, confidence_score)
SELECT id, 'email_domain', 'email.nike.com', 100 FROM brands WHERE LOWER(name) = 'nike' LIMIT 1;

INSERT INTO brand_aliases (brand_id, alias_type, alias_value, confidence_score)
SELECT id, 'email_domain', 'nike@email.nike.com', 100 FROM brands WHERE LOWER(name) = 'nike' LIMIT 1;

INSERT INTO brand_aliases (brand_id, alias_type, alias_value, confidence_score)
SELECT id, 'store_name', 'NIKE', 100 FROM brands WHERE LOWER(name) = 'nike' LIMIT 1;

INSERT INTO brand_aliases (brand_id, alias_type, alias_value, confidence_score)
SELECT id, 'variation', 'Nike.com', 95 FROM brands WHERE LOWER(name) = 'nike' LIMIT 1;

-- =====================================================
-- ADIDAS - Athletic apparel
-- =====================================================
INSERT INTO brand_aliases (brand_id, alias_type, alias_value, confidence_score)
SELECT id, 'email_domain', 'adidas.com', 100 FROM brands WHERE LOWER(name) = 'adidas' LIMIT 1;

INSERT INTO brand_aliases (brand_id, alias_type, alias_value, confidence_score)
SELECT id, 'email_domain', 'email.adidas.com', 100 FROM brands WHERE LOWER(name) = 'adidas' LIMIT 1;

INSERT INTO brand_aliases (brand_id, alias_type, alias_value, confidence_score)
SELECT id, 'store_name', 'ADIDAS', 100 FROM brands WHERE LOWER(name) = 'adidas' LIMIT 1;

INSERT INTO brand_aliases (brand_id, alias_type, alias_value, confidence_score)
SELECT id, 'variation', 'Adidas.com', 95 FROM brands WHERE LOWER(name) = 'adidas' LIMIT 1;

-- =====================================================
-- NORDSTROM - Department store
-- =====================================================
INSERT INTO brand_aliases (brand_id, alias_type, alias_value, confidence_score)
SELECT id, 'email_domain', 'nordstrom.com', 100 FROM brands WHERE LOWER(name) = 'nordstrom' LIMIT 1;

INSERT INTO brand_aliases (brand_id, alias_type, alias_value, confidence_score)
SELECT id, 'email_domain', 'shop.nordstrom.com', 100 FROM brands WHERE LOWER(name) = 'nordstrom' LIMIT 1;

INSERT INTO brand_aliases (brand_id, alias_type, alias_value, confidence_score)
SELECT id, 'email_domain', 'email@shop.nordstrom.com', 100 FROM brands WHERE LOWER(name) = 'nordstrom' LIMIT 1;

INSERT INTO brand_aliases (brand_id, alias_type, alias_value, confidence_score)
SELECT id, 'store_name', 'Nordstrom', 100 FROM brands WHERE LOWER(name) = 'nordstrom' LIMIT 1;

-- =====================================================
-- MACY'S - Department store
-- =====================================================
INSERT INTO brand_aliases (brand_id, alias_type, alias_value, confidence_score)
SELECT id, 'email_domain', 'macys.com', 100 FROM brands WHERE LOWER(name) LIKE 'macy%' LIMIT 1;

INSERT INTO brand_aliases (brand_id, alias_type, alias_value, confidence_score)
SELECT id, 'email_domain', 'email.macys.com', 100 FROM brands WHERE LOWER(name) LIKE 'macy%' LIMIT 1;

INSERT INTO brand_aliases (brand_id, alias_type, alias_value, confidence_score)
SELECT id, 'store_name', 'Macys', 100 FROM brands WHERE LOWER(name) LIKE 'macy%' LIMIT 1;

INSERT INTO brand_aliases (brand_id, alias_type, alias_value, confidence_score)
SELECT id, 'variation', 'Macy''s', 100 FROM brands WHERE LOWER(name) LIKE 'macy%' LIMIT 1;

-- =====================================================
-- GAP - Casual apparel
-- =====================================================
INSERT INTO brand_aliases (brand_id, alias_type, alias_value, confidence_score)
SELECT id, 'email_domain', 'gap.com', 100 FROM brands WHERE LOWER(name) = 'gap' LIMIT 1;

INSERT INTO brand_aliases (brand_id, alias_type, alias_value, confidence_score)
SELECT id, 'email_domain', 'email.gap.com', 100 FROM brands WHERE LOWER(name) = 'gap' LIMIT 1;

INSERT INTO brand_aliases (brand_id, alias_type, alias_value, confidence_score)
SELECT id, 'store_name', 'GAP', 100 FROM brands WHERE LOWER(name) = 'gap' LIMIT 1;

-- =====================================================
-- OLD NAVY - Casual apparel
-- =====================================================
INSERT INTO brand_aliases (brand_id, alias_type, alias_value, confidence_score)
SELECT id, 'email_domain', 'oldnavy.com', 100 FROM brands WHERE LOWER(name) = 'old navy' LIMIT 1;

INSERT INTO brand_aliases (brand_id, alias_type, alias_value, confidence_score)
SELECT id, 'email_domain', 'email.oldnavy.com', 100 FROM brands WHERE LOWER(name) = 'old navy' LIMIT 1;

INSERT INTO brand_aliases (brand_id, alias_type, alias_value, confidence_score)
SELECT id, 'store_name', 'Old Navy', 100 FROM brands WHERE LOWER(name) = 'old navy' LIMIT 1;

-- =====================================================
-- BANANA REPUBLIC - Upscale casual
-- =====================================================
INSERT INTO brand_aliases (brand_id, alias_type, alias_value, confidence_score)
SELECT id, 'email_domain', 'bananarepublic.com', 100 FROM brands WHERE LOWER(name) = 'banana republic' LIMIT 1;

INSERT INTO brand_aliases (brand_id, alias_type, alias_value, confidence_score)
SELECT id, 'email_domain', 'email.bananarepublic.com', 100 FROM brands WHERE LOWER(name) = 'banana republic' LIMIT 1;

INSERT INTO brand_aliases (brand_id, alias_type, alias_value, confidence_score)
SELECT id, 'store_name', 'Banana Republic', 100 FROM brands WHERE LOWER(name) = 'banana republic' LIMIT 1;

-- =====================================================
-- UNIQLO - Japanese apparel
-- =====================================================
INSERT INTO brand_aliases (brand_id, alias_type, alias_value, confidence_score)
SELECT id, 'email_domain', 'uniqlo.com', 100 FROM brands WHERE LOWER(name) = 'uniqlo' LIMIT 1;

INSERT INTO brand_aliases (brand_id, alias_type, alias_value, confidence_score)
SELECT id, 'email_domain', 'email.uniqlo.com', 100 FROM brands WHERE LOWER(name) = 'uniqlo' LIMIT 1;

INSERT INTO brand_aliases (brand_id, alias_type, alias_value, confidence_score)
SELECT id, 'store_name', 'UNIQLO', 100 FROM brands WHERE LOWER(name) = 'uniqlo' LIMIT 1;

-- =====================================================
-- LULULEMON - Athletic apparel
-- =====================================================
INSERT INTO brand_aliases (brand_id, alias_type, alias_value, confidence_score)
SELECT id, 'email_domain', 'lululemon.com', 100 FROM brands WHERE LOWER(name) = 'lululemon' LIMIT 1;

INSERT INTO brand_aliases (brand_id, alias_type, alias_value, confidence_score)
SELECT id, 'email_domain', 'info.lululemon.com', 100 FROM brands WHERE LOWER(name) = 'lululemon' LIMIT 1;

INSERT INTO brand_aliases (brand_id, alias_type, alias_value, confidence_score)
SELECT id, 'store_name', 'lululemon', 100 FROM brands WHERE LOWER(name) = 'lululemon' LIMIT 1;

-- =====================================================
-- ANTHROPOLOGIE - Bohemian lifestyle
-- =====================================================
INSERT INTO brand_aliases (brand_id, alias_type, alias_value, confidence_score)
SELECT id, 'email_domain', 'anthropologie.com', 100 FROM brands WHERE LOWER(name) = 'anthropologie' LIMIT 1;

INSERT INTO brand_aliases (brand_id, alias_type, alias_value, confidence_score)
SELECT id, 'email_domain', 'email.anthropologie.com', 100 FROM brands WHERE LOWER(name) = 'anthropologie' LIMIT 1;

INSERT INTO brand_aliases (brand_id, alias_type, alias_value, confidence_score)
SELECT id, 'store_name', 'Anthropologie', 100 FROM brands WHERE LOWER(name) = 'anthropologie' LIMIT 1;

-- =====================================================
-- URBAN OUTFITTERS - Youth fashion
-- =====================================================
INSERT INTO brand_aliases (brand_id, alias_type, alias_value, confidence_score)
SELECT id, 'email_domain', 'urbanoutfitters.com', 100 FROM brands WHERE LOWER(name) = 'urban outfitters' LIMIT 1;

INSERT INTO brand_aliases (brand_id, alias_type, alias_value, confidence_score)
SELECT id, 'email_domain', 'email.urbanoutfitters.com', 100 FROM brands WHERE LOWER(name) = 'urban outfitters' LIMIT 1;

INSERT INTO brand_aliases (brand_id, alias_type, alias_value, confidence_score)
SELECT id, 'store_name', 'Urban Outfitters', 100 FROM brands WHERE LOWER(name) = 'urban outfitters' LIMIT 1;

-- =====================================================
-- ASOS - Online fashion
-- =====================================================
INSERT INTO brand_aliases (brand_id, alias_type, alias_value, confidence_score)
SELECT id, 'email_domain', 'asos.com', 100 FROM brands WHERE LOWER(name) = 'asos' LIMIT 1;

INSERT INTO brand_aliases (brand_id, alias_type, alias_value, confidence_score)
SELECT id, 'email_domain', 'noreply@asos.com', 100 FROM brands WHERE LOWER(name) = 'asos' LIMIT 1;

INSERT INTO brand_aliases (brand_id, alias_type, alias_value, confidence_score)
SELECT id, 'store_name', 'ASOS', 100 FROM brands WHERE LOWER(name) = 'asos' LIMIT 1;

-- =====================================================
-- FOREVER 21 - Fast fashion
-- =====================================================
INSERT INTO brand_aliases (brand_id, alias_type, alias_value, confidence_score)
SELECT id, 'email_domain', 'forever21.com', 100 FROM brands WHERE LOWER(name) = 'forever 21' LIMIT 1;

INSERT INTO brand_aliases (brand_id, alias_type, alias_value, confidence_score)
SELECT id, 'email_domain', 'email.forever21.com', 100 FROM brands WHERE LOWER(name) = 'forever 21' LIMIT 1;

INSERT INTO brand_aliases (brand_id, alias_type, alias_value, confidence_score)
SELECT id, 'store_name', 'Forever 21', 100 FROM brands WHERE LOWER(name) = 'forever 21' LIMIT 1;

INSERT INTO brand_aliases (brand_id, alias_type, alias_value, confidence_score)
SELECT id, 'variation', 'Forever21', 95 FROM brands WHERE LOWER(name) = 'forever 21' LIMIT 1;

-- =====================================================
-- TARGET - Mass retailer
-- =====================================================
INSERT INTO brand_aliases (brand_id, alias_type, alias_value, confidence_score)
SELECT id, 'email_domain', 'target.com', 100 FROM brands WHERE LOWER(name) = 'target' LIMIT 1;

INSERT INTO brand_aliases (brand_id, alias_type, alias_value, confidence_score)
SELECT id, 'email_domain', 'orders@target.com', 100 FROM brands WHERE LOWER(name) = 'target' LIMIT 1;

INSERT INTO brand_aliases (brand_id, alias_type, alias_value, confidence_score)
SELECT id, 'store_name', 'Target', 100 FROM brands WHERE LOWER(name) = 'target' LIMIT 1;

-- =====================================================
-- AMAZON FASHION - Note: Lower confidence for general domain
-- =====================================================
INSERT INTO brand_aliases (brand_id, alias_type, alias_value, confidence_score)
SELECT id, 'email_domain', 'amazon.com', 80 FROM brands WHERE LOWER(name) = 'amazon' LIMIT 1;

INSERT INTO brand_aliases (brand_id, alias_type, alias_value, confidence_score)
SELECT id, 'store_name', 'Amazon', 80 FROM brands WHERE LOWER(name) = 'amazon' LIMIT 1;

-- =====================================================
-- Add more brands as needed following the same pattern
-- =====================================================
