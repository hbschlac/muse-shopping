-- Seed initial fashion stores
-- Migration: 012_seed_initial_stores

-- Insert initial stores
INSERT INTO stores (name, slug, display_name, website_url, integration_type, supports_checkout, category) VALUES
('oldnavy', 'old-navy', 'Old Navy', 'https://oldnavy.gap.com', 'redirect', true, 'fashion'),
('nordstrom', 'nordstrom', 'Nordstrom', 'https://www.nordstrom.com', 'redirect', true, 'fashion'),
('nordstromrack', 'nordstrom-rack', 'Nordstrom Rack', 'https://www.nordstromrack.com', 'redirect', true, 'fashion'),
('target', 'target', 'Target', 'https://www.target.com', 'redirect', true, 'fashion'),
('walmart', 'walmart', 'Walmart', 'https://www.walmart.com', 'api', true, 'fashion'),
('amazon', 'amazon', 'Amazon', 'https://www.amazon.com', 'manual', false, 'fashion'),
('zara', 'zara', 'Zara', 'https://www.zara.com', 'redirect', true, 'fashion'),
('hm', 'h-m', 'H&M', 'https://www2.hm.com', 'redirect', true, 'fashion'),
('gap', 'gap', 'Gap', 'https://www.gap.com', 'redirect', true, 'fashion'),
('macys', 'macys', 'Macy''s', 'https://www.macys.com', 'redirect', true, 'fashion'),
('bloomingdales', 'bloomingdales', 'Bloomingdale''s', 'https://www.bloomingdales.com', 'redirect', true, 'fashion'),
('saks', 'saks', 'Saks Fifth Avenue', 'https://www.saksfifthavenue.com', 'redirect', true, 'fashion'),
('asos', 'asos', 'ASOS', 'https://www.asos.com', 'redirect', true, 'fashion'),
('forever21', 'forever-21', 'Forever 21', 'https://www.forever21.com', 'redirect', true, 'fashion'),
('urbanoutfitters', 'urban-outfitters', 'Urban Outfitters', 'https://www.urbanoutfitters.com', 'redirect', true, 'fashion'),
('freepeople', 'free-people', 'Free People', 'https://www.freepeople.com', 'redirect', true, 'fashion'),
('lulus', 'lulus', 'Lulus', 'https://www.lulus.com', 'redirect', true, 'fashion'),
('revolve', 'revolve', 'Revolve', 'https://www.revolve.com', 'redirect', true, 'fashion'),
('shein', 'shein', 'SHEIN', 'https://www.shein.com', 'redirect', true, 'fashion'),
('cider', 'cider', 'Cider', 'https://shopcider.com', 'redirect', true, 'fashion')
ON CONFLICT (name) DO NOTHING;

-- Insert store aliases for email matching
INSERT INTO store_aliases (store_id, alias_type, alias_value) VALUES
-- Old Navy
((SELECT id FROM stores WHERE slug = 'old-navy'), 'email_domain', 'oldnavy.com'),
((SELECT id FROM stores WHERE slug = 'old-navy'), 'email_domain', 'oldnavy.gap.com'),
((SELECT id FROM stores WHERE slug = 'old-navy'), 'email_domain', 'gap.com'),

-- Nordstrom
((SELECT id FROM stores WHERE slug = 'nordstrom'), 'email_domain', 'nordstrom.com'),
((SELECT id FROM stores WHERE slug = 'nordstrom'), 'email_domain', 'eml.nordstrom.com'),
((SELECT id FROM stores WHERE slug = 'nordstrom'), 'email_domain', 'emails.nordstrom.com'),

-- Nordstrom Rack
((SELECT id FROM stores WHERE slug = 'nordstrom-rack'), 'email_domain', 'nordstromrack.com'),
((SELECT id FROM stores WHERE slug = 'nordstrom-rack'), 'email_domain', 'eml.nordstromrack.com'),

-- Target
((SELECT id FROM stores WHERE slug = 'target'), 'email_domain', 'target.com'),
((SELECT id FROM stores WHERE slug = 'target'), 'email_domain', 'email.target.com'),

-- Walmart
((SELECT id FROM stores WHERE slug = 'walmart'), 'email_domain', 'walmart.com'),
((SELECT id FROM stores WHERE slug = 'walmart'), 'email_domain', 'info.walmart.com'),

-- Amazon
((SELECT id FROM stores WHERE slug = 'amazon'), 'email_domain', 'amazon.com'),
((SELECT id FROM stores WHERE slug = 'amazon'), 'email_domain', 'ship-confirm@amazon.com'),

-- Zara
((SELECT id FROM stores WHERE slug = 'zara'), 'email_domain', 'zara.com'),
((SELECT id FROM stores WHERE slug = 'zara'), 'email_domain', 'orders@zara.com'),

-- H&M
((SELECT id FROM stores WHERE slug = 'h-m'), 'email_domain', 'hm.com'),
((SELECT id FROM stores WHERE slug = 'h-m'), 'email_domain', 'email.hm.com'),

-- Gap
((SELECT id FROM stores WHERE slug = 'gap'), 'email_domain', 'gap.com'),
((SELECT id FROM stores WHERE slug = 'gap'), 'email_domain', 'email.gap.com'),

-- Macy's
((SELECT id FROM stores WHERE slug = 'macys'), 'email_domain', 'macys.com'),
((SELECT id FROM stores WHERE slug = 'macys'), 'email_domain', 'email.macys.com'),

-- Bloomingdale's
((SELECT id FROM stores WHERE slug = 'bloomingdales'), 'email_domain', 'bloomingdales.com'),
((SELECT id FROM stores WHERE slug = 'bloomingdales'), 'email_domain', 'email.bloomingdales.com'),

-- ASOS
((SELECT id FROM stores WHERE slug = 'asos'), 'email_domain', 'asos.com'),
((SELECT id FROM stores WHERE slug = 'asos'), 'email_domain', 'info@asos.com'),

-- SHEIN
((SELECT id FROM stores WHERE slug = 'shein'), 'email_domain', 'shein.com'),
((SELECT id FROM stores WHERE slug = 'shein'), 'email_domain', 'service@shein.com'),

-- Cider
((SELECT id FROM stores WHERE slug = 'cider'), 'email_domain', 'shopcider.com'),
((SELECT id FROM stores WHERE slug = 'cider'), 'email_domain', 'une.shopcider.com')

ON CONFLICT (alias_value, alias_type) DO NOTHING;
