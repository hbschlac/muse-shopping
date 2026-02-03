-- Seed data for popular fashion brands
-- This provides initial brand data for testing and development

INSERT INTO brands (name, slug, description, category, price_tier, website_url, metadata) VALUES
('Zara', 'zara', 'Spanish fast-fashion retailer known for trendy, affordable clothing', 'fast-fashion', 'mid', 'https://www.zara.com', '{"country": "Spain", "founded": 1975}'),
('H&M', 'hm', 'Swedish multinational clothing company offering fashion and quality at the best price', 'fast-fashion', 'budget', 'https://www.hm.com', '{"country": "Sweden", "founded": 1947}'),
('Nordstrom', 'nordstrom', 'Upscale department store offering designer clothing, shoes and accessories', 'department-store', 'premium', 'https://www.nordstrom.com', '{"country": "USA", "founded": 1901}'),
('Nordstrom Rack', 'nordstrom-rack', 'Off-price retail division of Nordstrom offering discounted designer brands', 'outlet', 'mid', 'https://www.nordstromrack.com', '{"country": "USA", "parent": "Nordstrom"}'),
('Abercrombie & Fitch', 'abercrombie-fitch', 'Casual luxury brand for young adults', 'casual', 'mid', 'https://www.abercrombie.com', '{"country": "USA", "founded": 1892}'),
('Everlane', 'everlane', 'Ethical fashion brand known for radical transparency and sustainable practices', 'sustainable', 'mid', 'https://www.everlane.com', '{"country": "USA", "founded": 2010, "sustainability": true}'),
('Patagonia', 'patagonia', 'Outdoor clothing company committed to environmental responsibility', 'outdoor', 'premium', 'https://www.patagonia.com', '{"country": "USA", "founded": 1973, "sustainability": true}'),
('Reformation', 'reformation', 'Sustainable fashion brand creating vintage-inspired pieces', 'sustainable', 'premium', 'https://www.thereformation.com', '{"country": "USA", "founded": 2009, "sustainability": true}'),
('Madewell', 'madewell', 'American denim and apparel brand known for casual, everyday style', 'casual', 'mid', 'https://www.madewell.com', '{"country": "USA", "parent": "J.Crew Group"}'),
('Urban Outfitters', 'urban-outfitters', 'Lifestyle brand targeting young adults with trendy apparel', 'lifestyle', 'mid', 'https://www.urbanoutfitters.com', '{"country": "USA", "founded": 1970}'),
('Free People', 'free-people', 'Bohemian fashion brand for free-spirited individuals', 'boho', 'mid', 'https://www.freepeople.com', '{"country": "USA", "parent": "Urban Outfitters"}'),
('ASOS', 'asos', 'British online fashion retailer with wide variety of brands', 'online-retailer', 'mid', 'https://www.asos.com', '{"country": "UK", "founded": 2000}'),
('Anthropologie', 'anthropologie', 'Unique, feminine clothing and home décor', 'lifestyle', 'premium', 'https://www.anthropologie.com', '{"country": "USA", "parent": "Urban Outfitters"}'),
('J.Crew', 'jcrew', 'American multi-brand retailer of apparel and accessories', 'classic', 'mid', 'https://www.jcrew.com', '{"country": "USA", "founded": 1983}'),
('Banana Republic', 'banana-republic', 'Upscale clothing and accessories', 'classic', 'mid', 'https://www.bananarepublic.com', '{"country": "USA", "parent": "Gap Inc."}'),
('COS', 'cos', 'Contemporary fashion brand offering modern, functional, timeless design', 'minimalist', 'mid', 'https://www.cosstores.com', '{"country": "UK", "parent": "H&M Group"}'),
('& Other Stories', 'other-stories', 'Fashion and beauty from Paris, Stockholm and Los Angeles', 'contemporary', 'mid', 'https://www.stories.com', '{"country": "Sweden", "parent": "H&M Group"}'),
('Uniqlo', 'uniqlo', 'Japanese casual wear designer and retailer', 'basics', 'budget', 'https://www.uniqlo.com', '{"country": "Japan", "founded": 1949}'),
('Mango', 'mango', 'Spanish clothing design and manufacturing company', 'contemporary', 'mid', 'https://www.mango.com', '{"country": "Spain", "founded": 1984}'),
('Arket', 'arket', 'Modern-day market offering essential products for women, men, children and the home', 'minimalist', 'mid', 'https://www.arket.com', '{"country": "UK", "parent": "H&M Group"}')
ON CONFLICT (slug) DO NOTHING;
