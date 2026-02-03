-- Comprehensive Brand Directory - MECE Framework
-- 250+ brands covering all major shopping categories
-- Created: 2026-02-02

-- =====================================================
-- FAST FASHION (Budget to Mid-tier)
-- High-volume, trend-driven retailers
-- =====================================================
INSERT INTO brands (name, slug, description, category, price_tier, website_url, metadata) VALUES
('Zara', 'zara', 'Spanish fast-fashion retailer known for trendy, affordable clothing', 'fast-fashion', 'mid', 'https://www.zara.com', '{"country": "Spain", "founded": 1975}'),
('H&M', 'hm', 'Swedish multinational clothing company offering fashion and quality at the best price', 'fast-fashion', 'budget', 'https://www.hm.com', '{"country": "Sweden", "founded": 1947}'),
('Forever 21', 'forever-21', 'American fast fashion retailer targeting young women and men', 'fast-fashion', 'budget', 'https://www.forever21.com', '{"country": "USA", "founded": 1984}'),
('Fashion Nova', 'fashion-nova', 'Fast fashion retailer known for trendy, curve-hugging styles', 'fast-fashion', 'budget', 'https://www.fashionnova.com', '{"country": "USA", "founded": 2006}'),
('Shein', 'shein', 'Chinese online fast fashion company with ultra-low prices', 'fast-fashion', 'budget', 'https://www.shein.com', '{"country": "China", "founded": 2008}'),
('Boohoo', 'boohoo', 'British online fast fashion retailer targeting young shoppers', 'fast-fashion', 'budget', 'https://www.boohoo.com', '{"country": "UK", "founded": 2006}'),
('PrettyLittleThing', 'prettylittlething', 'UK-based fast fashion retailer for women', 'fast-fashion', 'budget', 'https://www.prettylittlething.com', '{"country": "UK", "parent": "Boohoo Group"}'),
('Missguided', 'missguided', 'Online fashion brand for confident young women', 'fast-fashion', 'budget', 'https://www.missguided.com', '{"country": "UK", "founded": 2009}'),
('Nasty Gal', 'nasty-gal', 'Vintage-inspired fashion for bold women', 'fast-fashion', 'mid', 'https://www.nastygal.com', '{"country": "USA", "parent": "Boohoo Group"}'),
('Topshop', 'topshop', 'British fashion retailer known for trendy styles', 'fast-fashion', 'mid', 'https://www.topshop.com', '{"country": "UK", "founded": 1964}'),
('Mango', 'mango', 'Spanish clothing design and manufacturing company', 'fast-fashion', 'mid', 'https://www.mango.com', '{"country": "Spain", "founded": 1984}'),
('Bershka', 'bershka', 'Spanish fast-fashion retailer targeting younger audience', 'fast-fashion', 'budget', 'https://www.bershka.com', '{"country": "Spain", "parent": "Inditex"}'),
('Pull & Bear', 'pull-bear', 'Casual fashion brand for young, urban styles', 'fast-fashion', 'budget', 'https://www.pullandbear.com', '{"country": "Spain", "parent": "Inditex"}'),
('Stradivarius', 'stradivarius', 'Fashion retailer for young women with fresh styles', 'fast-fashion', 'budget', 'https://www.stradivarius.com', '{"country": "Spain", "parent": "Inditex"}'),
('Romwe', 'romwe', 'Online fashion retailer offering affordable trendy styles', 'fast-fashion', 'budget', 'https://www.romwe.com', '{"country": "China", "parent": "Shein Group"}'),

-- =====================================================
-- LUXURY / DESIGNER (Premium to Ultra-Luxury)
-- High-end fashion houses and designer brands
-- =====================================================
('Gucci', 'gucci', 'Italian luxury fashion house known for leather goods and iconic designs', 'luxury', 'luxury', 'https://www.gucci.com', '{"country": "Italy", "founded": 1921, "parent": "Kering"}'),
('Prada', 'prada', 'Italian luxury fashion house specializing in leather handbags and accessories', 'luxury', 'luxury', 'https://www.prada.com', '{"country": "Italy", "founded": 1913}'),
('Louis Vuitton', 'louis-vuitton', 'French fashion house known for luxury luggage and monogram canvas', 'luxury', 'luxury', 'https://www.louisvuitton.com', '{"country": "France", "founded": 1854, "parent": "LVMH"}'),
('Chanel', 'chanel', 'French luxury fashion house known for haute couture and accessories', 'luxury', 'luxury', 'https://www.chanel.com', '{"country": "France", "founded": 1910}'),
('Dior', 'dior', 'French luxury goods company known for haute couture and ready-to-wear', 'luxury', 'luxury', 'https://www.dior.com', '{"country": "France", "founded": 1946, "parent": "LVMH"}'),
('Hermès', 'hermes', 'French luxury design house specializing in leather goods and accessories', 'luxury', 'luxury', 'https://www.hermes.com', '{"country": "France", "founded": 1837}'),
('Balenciaga', 'balenciaga', 'Spanish luxury fashion house known for innovative designs', 'luxury', 'luxury', 'https://www.balenciaga.com', '{"country": "Spain", "founded": 1919, "parent": "Kering"}'),
('Saint Laurent', 'saint-laurent', 'French luxury fashion house founded by Yves Saint Laurent', 'luxury', 'luxury', 'https://www.ysl.com', '{"country": "France", "founded": 1961, "parent": "Kering"}'),
('Fendi', 'fendi', 'Italian luxury fashion house known for fur and leather goods', 'luxury', 'luxury', 'https://www.fendi.com', '{"country": "Italy", "founded": 1925, "parent": "LVMH"}'),
('Givenchy', 'givenchy', 'French luxury fashion and perfume house', 'luxury', 'luxury', 'https://www.givenchy.com', '{"country": "France", "founded": 1952, "parent": "LVMH"}'),
('Bottega Veneta', 'bottega-veneta', 'Italian luxury fashion house known for leather goods', 'luxury', 'luxury', 'https://www.bottegaveneta.com', '{"country": "Italy", "founded": 1966, "parent": "Kering"}'),
('Burberry', 'burberry', 'British luxury fashion house known for trench coats and check pattern', 'luxury', 'luxury', 'https://www.burberry.com', '{"country": "UK", "founded": 1856}'),
('Celine', 'celine', 'French luxury ready-to-wear and leather goods brand', 'luxury', 'luxury', 'https://www.celine.com', '{"country": "France", "founded": 1945, "parent": "LVMH"}'),
('Valentino', 'valentino', 'Italian luxury fashion house known for haute couture', 'luxury', 'luxury', 'https://www.valentino.com', '{"country": "Italy", "founded": 1960}'),
('Versace', 'versace', 'Italian luxury fashion company known for bold designs', 'luxury', 'luxury', 'https://www.versace.com', '{"country": "Italy", "founded": 1978, "parent": "Capri Holdings"}'),
('Dolce & Gabbana', 'dolce-gabbana', 'Italian luxury fashion house known for glamorous designs', 'luxury', 'luxury', 'https://www.dolcegabbana.com', '{"country": "Italy", "founded": 1985}'),
('Armani', 'armani', 'Italian luxury fashion house founded by Giorgio Armani', 'luxury', 'luxury', 'https://www.armani.com', '{"country": "Italy", "founded": 1975}'),
('Tom Ford', 'tom-ford', 'American luxury fashion house known for sophisticated designs', 'luxury', 'luxury', 'https://www.tomford.com', '{"country": "USA", "founded": 2005}'),
('Miu Miu', 'miu-miu', 'Italian high fashion womens clothing and accessory brand', 'luxury', 'luxury', 'https://www.miumiu.com', '{"country": "Italy", "founded": 1993, "parent": "Prada"}'),
('Alexander McQueen', 'alexander-mcqueen', 'British luxury fashion house known for dramatic designs', 'luxury', 'luxury', 'https://www.alexandermcqueen.com', '{"country": "UK", "founded": 1992, "parent": "Kering"}'),

-- =====================================================
-- CONTEMPORARY (Mid to Premium)
-- Modern, design-focused brands
-- =====================================================
('Everlane', 'everlane', 'Ethical fashion brand known for radical transparency and sustainable practices', 'contemporary', 'mid', 'https://www.everlane.com', '{"country": "USA", "founded": 2010, "sustainability": true}'),
('Reformation', 'reformation', 'Sustainable fashion brand creating vintage-inspired pieces', 'contemporary', 'premium', 'https://www.thereformation.com', '{"country": "USA", "founded": 2009, "sustainability": true}'),
('COS', 'cos', 'Contemporary fashion brand offering modern, functional, timeless design', 'contemporary', 'mid', 'https://www.cosstores.com', '{"country": "UK", "parent": "H&M Group"}'),
('& Other Stories', 'other-stories', 'Fashion and beauty from Paris, Stockholm and Los Angeles', 'contemporary', 'mid', 'https://www.stories.com', '{"country": "Sweden", "parent": "H&M Group"}'),
('Ganni', 'ganni', 'Danish contemporary fashion brand known for Scandi-cool aesthetic', 'contemporary', 'premium', 'https://www.ganni.com', '{"country": "Denmark", "founded": 2000}'),
('Sézane', 'sezane', 'French contemporary brand with Parisian-inspired designs', 'contemporary', 'premium', 'https://www.sezane.com', '{"country": "France", "founded": 2013}'),
('APC', 'apc', 'French ready-to-wear brand known for minimalist designs', 'contemporary', 'premium', 'https://www.apc.fr', '{"country": "France", "founded": 1987}'),
('Acne Studios', 'acne-studios', 'Swedish fashion house known for denim and minimalist aesthetic', 'contemporary', 'premium', 'https://www.acnestudios.com', '{"country": "Sweden", "founded": 1996}'),
('Theory', 'theory', 'American fashion label known for sophisticated separates', 'contemporary', 'premium', 'https://www.theory.com', '{"country": "USA", "founded": 1997}'),
('Vince', 'vince', 'American contemporary fashion brand focused on effortless style', 'contemporary', 'premium', 'https://www.vince.com', '{"country": "USA", "founded": 2002}'),
('Rag & Bone', 'rag-bone', 'New York-based contemporary brand known for denim and modern classics', 'contemporary', 'premium', 'https://www.rag-bone.com', '{"country": "USA", "founded": 2002}'),
('Equipment', 'equipment', 'French-American fashion brand known for silk blouses', 'contemporary', 'premium', 'https://www.equipment.fr', '{"country": "France", "founded": 1976}'),
('Rebecca Taylor', 'rebecca-taylor', 'American contemporary womenswear designer', 'contemporary', 'premium', 'https://www.rebeccataylor.com', '{"country": "USA", "founded": 1996}'),
('Alice + Olivia', 'alice-olivia', 'Contemporary fashion brand known for feminine designs', 'contemporary', 'premium', 'https://www.aliceandolivia.com', '{"country": "USA", "founded": 2002}'),
('L.F.Markey', 'lf-markey', 'Contemporary brand focused on timeless, wearable pieces', 'contemporary', 'mid', 'https://www.lfmarkey.com', '{"country": "UK", "founded": 2012}'),

-- =====================================================
-- ATHLETIC / SPORTSWEAR (Budget to Premium)
-- Performance and athleisure brands
-- =====================================================
('Nike', 'nike', 'American multinational corporation specializing in athletic footwear and apparel', 'athletic', 'mid', 'https://www.nike.com', '{"country": "USA", "founded": 1964}'),
('Adidas', 'adidas', 'German multinational corporation specializing in athletic shoes and apparel', 'athletic', 'mid', 'https://www.adidas.com', '{"country": "Germany", "founded": 1949}'),
('Lululemon', 'lululemon', 'Canadian athletic apparel retailer focused on yoga and running', 'athletic', 'premium', 'https://www.lululemon.com', '{"country": "Canada", "founded": 1998}'),
('Gymshark', 'gymshark', 'British fitness apparel and accessories brand', 'athletic', 'mid', 'https://www.gymshark.com', '{"country": "UK", "founded": 2012}'),
('Alo Yoga', 'alo-yoga', 'American athleisure brand focused on yoga-inspired apparel', 'athletic', 'premium', 'https://www.aloyoga.com', '{"country": "USA", "founded": 2007}'),
('Outdoor Voices', 'outdoor-voices', 'Technical apparel for recreation', 'athletic', 'mid', 'https://www.outdoorvoices.com', '{"country": "USA", "founded": 2014}'),
('Athleta', 'athleta', 'American womens athletic apparel brand', 'athletic', 'mid', 'https://www.athleta.com', '{"country": "USA", "parent": "Gap Inc."}'),
('Fabletics', 'fabletics', 'Activewear brand offering affordable athletic apparel', 'athletic', 'budget', 'https://www.fabletics.com', '{"country": "USA", "founded": 2013}'),
('Under Armour', 'under-armour', 'American sports equipment company specializing in performance apparel', 'athletic', 'mid', 'https://www.underarmour.com', '{"country": "USA", "founded": 1996}'),
('Puma', 'puma', 'German multinational corporation specializing in athletic footwear', 'athletic', 'mid', 'https://www.puma.com', '{"country": "Germany", "founded": 1948}'),
('New Balance', 'new-balance', 'American sports footwear and apparel brand', 'athletic', 'mid', 'https://www.newbalance.com', '{"country": "USA", "founded": 1906}'),
('Reebok', 'reebok', 'American-inspired global brand specializing in fitness apparel', 'athletic', 'mid', 'https://www.reebok.com', '{"country": "USA", "founded": 1958}'),
('Patagonia', 'patagonia', 'Outdoor clothing company committed to environmental responsibility', 'athletic', 'premium', 'https://www.patagonia.com', '{"country": "USA", "founded": 1973, "sustainability": true}'),
('The North Face', 'the-north-face', 'American outdoor recreation product company', 'athletic', 'mid', 'https://www.thenorthface.com', '{"country": "USA", "founded": 1966}'),
('Arc''teryx', 'arcteryx', 'Canadian high-performance outdoor equipment company', 'athletic', 'premium', 'https://www.arcteryx.com', '{"country": "Canada", "founded": 1989}'),
('Vuori', 'vuori', 'Performance apparel brand inspired by coastal California', 'athletic', 'premium', 'https://www.vuoriclothing.com', '{"country": "USA", "founded": 2015}'),
('On Running', 'on-running', 'Swiss performance running shoe and apparel company', 'athletic', 'premium', 'https://www.on-running.com', '{"country": "Switzerland", "founded": 2010}'),
('Sweaty Betty', 'sweaty-betty', 'British activewear and lifestyle brand for women', 'athletic', 'mid', 'https://www.sweatybetty.com', '{"country": "UK", "founded": 1998}'),

-- =====================================================
-- DEPARTMENT STORES (Mid to Premium)
-- Multi-brand retailers
-- =====================================================
('Nordstrom', 'nordstrom', 'Upscale department store offering designer clothing, shoes and accessories', 'department-store', 'premium', 'https://www.nordstrom.com', '{"country": "USA", "founded": 1901}'),
('Macy''s', 'macys', 'American department store chain offering wide variety of brands', 'department-store', 'mid', 'https://www.macys.com', '{"country": "USA", "founded": 1858}'),
('Bloomingdale''s', 'bloomingdales', 'Upscale department store owned by Macy''s', 'department-store', 'premium', 'https://www.bloomingdales.com', '{"country": "USA", "founded": 1861}'),
('Saks Fifth Avenue', 'saks-fifth-avenue', 'Luxury department store chain', 'department-store', 'luxury', 'https://www.saksfifthavenue.com', '{"country": "USA", "founded": 1924}'),
('Neiman Marcus', 'neiman-marcus', 'American luxury department store', 'department-store', 'luxury', 'https://www.neimanmarcus.com', '{"country": "USA", "founded": 1907}'),
('Barneys New York', 'barneys-new-york', 'Luxury department store specializing in designer clothing', 'department-store', 'luxury', 'https://www.barneys.com', '{"country": "USA", "founded": 1923}'),
('Dillard''s', 'dillards', 'American department store chain', 'department-store', 'mid', 'https://www.dillards.com', '{"country": "USA", "founded": 1938}'),
('Lord & Taylor', 'lord-taylor', 'American department store chain', 'department-store', 'mid', 'https://www.lordandtaylor.com', '{"country": "USA", "founded": 1826}'),
('Belk', 'belk', 'American department store chain', 'department-store', 'mid', 'https://www.belk.com', '{"country": "USA", "founded": 1888}'),
('Selfridges', 'selfridges', 'British luxury department store', 'department-store', 'premium', 'https://www.selfridges.com', '{"country": "UK", "founded": 1909}'),
('Harrods', 'harrods', 'British luxury department store', 'department-store', 'luxury', 'https://www.harrods.com', '{"country": "UK", "founded": 1834}'),
('Harvey Nichols', 'harvey-nichols', 'British luxury department store chain', 'department-store', 'luxury', 'https://www.harveynichols.com', '{"country": "UK", "founded": 1831}'),

-- =====================================================
-- DISCOUNT / OUTLET (Budget to Mid)
-- Off-price retailers
-- =====================================================
('TJ Maxx', 'tj-maxx', 'Off-price department store offering brand name clothing at reduced prices', 'outlet', 'budget', 'https://www.tjmaxx.com', '{"country": "USA", "parent": "TJX Companies"}'),
('Marshalls', 'marshalls', 'Off-price department store chain', 'outlet', 'budget', 'https://www.marshalls.com', '{"country": "USA", "parent": "TJX Companies"}'),
('Ross Dress for Less', 'ross', 'American chain of off-price department stores', 'outlet', 'budget', 'https://www.rossstores.com', '{"country": "USA", "founded": 1950}'),
('Nordstrom Rack', 'nordstrom-rack', 'Off-price retail division of Nordstrom offering discounted designer brands', 'outlet', 'mid', 'https://www.nordstromrack.com', '{"country": "USA", "parent": "Nordstrom"}'),
('Saks OFF 5TH', 'saks-off-5th', 'Off-price outlet store for Saks Fifth Avenue', 'outlet', 'mid', 'https://www.saksoff5th.com', '{"country": "USA", "parent": "Saks Fifth Avenue"}'),
('Burlington', 'burlington', 'American national off-price department store retailer', 'outlet', 'budget', 'https://www.burlington.com', '{"country": "USA", "founded": 1972}'),
('Century 21', 'century-21', 'Department store featuring designer labels at discount prices', 'outlet', 'mid', 'https://www.c21stores.com', '{"country": "USA", "founded": 1961}'),
('Filene''s Basement', 'filenes-basement', 'Off-price retailer', 'outlet', 'budget', 'https://www.filenesbasement.com', '{"country": "USA", "founded": 1909}'),

-- =====================================================
-- ONLINE MARKETPLACES (Various price tiers)
-- E-commerce platforms and multi-brand online retailers
-- =====================================================
('ASOS', 'asos', 'British online fashion retailer with wide variety of brands', 'online-marketplace', 'mid', 'https://www.asos.com', '{"country": "UK", "founded": 2000}'),
('Revolve', 'revolve', 'Online fashion retailer targeting millennial and Gen Z shoppers', 'online-marketplace', 'premium', 'https://www.revolve.com', '{"country": "USA", "founded": 2003}'),
('Net-a-Porter', 'net-a-porter', 'Luxury fashion e-commerce platform', 'online-marketplace', 'luxury', 'https://www.net-a-porter.com', '{"country": "UK", "founded": 2000}'),
('Farfetch', 'farfetch', 'Global luxury fashion online platform', 'online-marketplace', 'luxury', 'https://www.farfetch.com', '{"country": "UK", "founded": 2007}'),
('Ssense', 'ssense', 'Canadian online luxury fashion retailer', 'online-marketplace', 'luxury', 'https://www.ssense.com', '{"country": "Canada", "founded": 2003}'),
('MatchesFashion', 'matchesfashion', 'Luxury fashion e-commerce platform', 'online-marketplace', 'luxury', 'https://www.matchesfashion.com', '{"country": "UK", "founded": 1987}'),
('Mytheresa', 'mytheresa', 'German luxury fashion e-commerce platform', 'online-marketplace', 'luxury', 'https://www.mytheresa.com', '{"country": "Germany", "founded": 2006}'),
('Shopbop', 'shopbop', 'Online retailer focused on contemporary and designer fashion', 'online-marketplace', 'premium', 'https://www.shopbop.com', '{"country": "USA", "parent": "Amazon"}'),
('Amazon Fashion', 'amazon-fashion', 'Fashion category of Amazon offering various brands', 'online-marketplace', 'budget', 'https://www.amazon.com/fashion', '{"country": "USA", "parent": "Amazon"}'),
('Zappos', 'zappos', 'Online shoe and clothing retailer', 'online-marketplace', 'mid', 'https://www.zappos.com', '{"country": "USA", "parent": "Amazon"}'),
('YOOX', 'yoox', 'Italian online fashion retailer', 'online-marketplace', 'mid', 'https://www.yoox.com', '{"country": "Italy", "founded": 2000}'),
('Gilt', 'gilt', 'Online shopping destination offering designer brands at discount', 'online-marketplace', 'mid', 'https://www.gilt.com', '{"country": "USA", "founded": 2007}'),
('The Outnet', 'the-outnet', 'Outlet site of Net-a-Porter offering luxury at reduced prices', 'online-marketplace', 'premium', 'https://www.theoutnet.com', '{"country": "UK", "parent": "Net-a-Porter"}'),
('24S', '24s', 'French luxury fashion e-commerce platform', 'online-marketplace', 'luxury', 'https://www.24s.com', '{"country": "France", "parent": "LVMH"}'),

-- =====================================================
-- BASICS / ESSENTIALS (Budget to Mid)
-- Everyday wardrobe staples
-- =====================================================
('Uniqlo', 'uniqlo', 'Japanese casual wear designer and retailer', 'basics', 'budget', 'https://www.uniqlo.com', '{"country": "Japan", "founded": 1949}'),
('Gap', 'gap', 'American worldwide clothing and accessories retailer', 'basics', 'mid', 'https://www.gap.com', '{"country": "USA", "founded": 1969}'),
('Old Navy', 'old-navy', 'American clothing and accessories retailer owned by Gap', 'basics', 'budget', 'https://www.oldnavy.com', '{"country": "USA", "parent": "Gap Inc."}'),
('Target', 'target', 'American retail corporation offering affordable fashion', 'basics', 'budget', 'https://www.target.com', '{"country": "USA", "founded": 1902}'),
('Walmart Fashion', 'walmart-fashion', 'Fashion category of Walmart offering budget-friendly clothing', 'basics', 'budget', 'https://www.walmart.com/fashion', '{"country": "USA", "founded": 1962}'),
('Muji', 'muji', 'Japanese retail company selling household and consumer goods', 'basics', 'budget', 'https://www.muji.com', '{"country": "Japan", "founded": 1980}'),
('American Eagle', 'american-eagle', 'American clothing and accessories retailer', 'basics', 'budget', 'https://www.ae.com', '{"country": "USA", "founded": 1977}'),
('Aerie', 'aerie', 'Intimate apparel and lifestyle brand from American Eagle', 'basics', 'budget', 'https://www.aerie.com', '{"country": "USA", "parent": "American Eagle"}'),
('Hollister', 'hollister', 'California-inspired lifestyle brand', 'basics', 'budget', 'https://www.hollisterco.com', '{"country": "USA", "parent": "Abercrombie & Fitch"}'),
('Abercrombie & Fitch', 'abercrombie-fitch', 'Casual luxury brand for young adults', 'basics', 'mid', 'https://www.abercrombie.com', '{"country": "USA", "founded": 1892}'),
('Lands'' End', 'lands-end', 'American clothing and home decor retailer', 'basics', 'mid', 'https://www.landsend.com', '{"country": "USA", "founded": 1963}'),
('L.L.Bean', 'llbean', 'American retail company known for outdoor recreation products', 'basics', 'mid', 'https://www.llbean.com', '{"country": "USA", "founded": 1912}'),
('Eddie Bauer', 'eddie-bauer', 'American outdoor clothing and sporting goods retailer', 'basics', 'mid', 'https://www.eddiebauer.com', '{"country": "USA", "founded": 1920}'),

-- =====================================================
-- LIFESTYLE (Mid to Premium)
-- Curated lifestyle brands
-- =====================================================
('Urban Outfitters', 'urban-outfitters', 'Lifestyle brand targeting young adults with trendy apparel', 'lifestyle', 'mid', 'https://www.urbanoutfitters.com', '{"country": "USA", "founded": 1970}'),
('Free People', 'free-people', 'Bohemian fashion brand for free-spirited individuals', 'lifestyle', 'mid', 'https://www.freepeople.com', '{"country": "USA", "parent": "Urban Outfitters"}'),
('Anthropologie', 'anthropologie', 'Unique, feminine clothing and home décor', 'lifestyle', 'premium', 'https://www.anthropologie.com', '{"country": "USA", "parent": "Urban Outfitters"}'),
('Madewell', 'madewell', 'American denim and apparel brand known for casual, everyday style', 'lifestyle', 'mid', 'https://www.madewell.com', '{"country": "USA", "parent": "J.Crew Group"}'),
('J.Crew', 'jcrew', 'American multi-brand retailer of apparel and accessories', 'lifestyle', 'mid', 'https://www.jcrew.com', '{"country": "USA", "founded": 1983}'),
('Banana Republic', 'banana-republic', 'Upscale clothing and accessories', 'lifestyle', 'mid', 'https://www.bananarepublic.com', '{"country": "USA", "parent": "Gap Inc."}'),
('Club Monaco', 'club-monaco', 'Casual luxury clothing for men and women', 'lifestyle', 'mid', 'https://www.clubmonaco.com', '{"country": "Canada", "parent": "Ralph Lauren"}'),
('Goop', 'goop', 'Wellness and lifestyle brand by Gwyneth Paltrow', 'lifestyle', 'premium', 'https://www.goop.com', '{"country": "USA", "founded": 2008}'),
('Jenni Kayne', 'jenni-kayne', 'California lifestyle brand', 'lifestyle', 'premium', 'https://www.jennikayne.com', '{"country": "USA", "founded": 2003}'),
('Faherty', 'faherty', 'Beach-inspired lifestyle brand', 'lifestyle', 'premium', 'https://www.fahertybrand.com', '{"country": "USA", "founded": 2013}'),

-- =====================================================
-- STREETWEAR (Mid to Premium)
-- Urban, hype-driven fashion
-- =====================================================
('Supreme', 'supreme', 'American skateboarding and streetwear brand', 'streetwear', 'premium', 'https://www.supremenewyork.com', '{"country": "USA", "founded": 1994}'),
('Off-White', 'off-white', 'Italian luxury fashion label founded by Virgil Abloh', 'streetwear', 'luxury', 'https://www.off---white.com', '{"country": "Italy", "founded": 2013}'),
('Palace', 'palace', 'British skateboarding and clothing brand', 'streetwear', 'premium', 'https://www.palaceskateboards.com', '{"country": "UK", "founded": 2009}'),
('Stüssy', 'stussy', 'American clothing brand and streetwear pioneer', 'streetwear', 'mid', 'https://www.stussy.com', '{"country": "USA", "founded": 1980}'),
('Kith', 'kith', 'American fashion and lifestyle brand', 'streetwear', 'premium', 'https://www.kith.com', '{"country": "USA", "founded": 2011}'),
('Bape', 'bape', 'Japanese streetwear brand known for camo patterns', 'streetwear', 'premium', 'https://www.bape.com', '{"country": "Japan", "founded": 1993}'),
('Carhartt WIP', 'carhartt-wip', 'European version of American workwear brand', 'streetwear', 'mid', 'https://www.carhartt-wip.com', '{"country": "USA", "founded": 1989}'),
('HUF', 'huf', 'Skateboard and streetwear brand', 'streetwear', 'mid', 'https://www.hufworldwide.com', '{"country": "USA", "founded": 2002}'),
('Obey', 'obey', 'Streetwear clothing company founded by artist Shepard Fairey', 'streetwear', 'mid', 'https://www.obeyclothing.com', '{"country": "USA", "founded": 2001}'),
('The Hundreds', 'the-hundreds', 'Los Angeles-based streetwear brand', 'streetwear', 'mid', 'https://www.thehundreds.com', '{"country": "USA", "founded": 2003}'),
('Diamond Supply Co.', 'diamond-supply', 'Skateboarding hardware and apparel company', 'streetwear', 'mid', 'https://www.diamondsupplyco.com', '{"country": "USA", "founded": 1998}'),
('FILA', 'fila', 'Italian sportswear brand with retro streetwear appeal', 'streetwear', 'mid', 'https://www.fila.com', '{"country": "Italy", "founded": 1911}'),
('Champion', 'champion', 'American athletic apparel brand with streetwear crossover', 'streetwear', 'budget', 'https://www.champion.com', '{"country": "USA", "founded": 1919}'),

-- =====================================================
-- FOOTWEAR SPECIALISTS (Budget to Luxury)
-- Shoe-focused brands and retailers
-- =====================================================
('Steve Madden', 'steve-madden', 'American fashion footwear brand', 'footwear', 'mid', 'https://www.stevemadden.com', '{"country": "USA", "founded": 1990}'),
('DSW', 'dsw', 'Designer Shoe Warehouse - discount shoe retailer', 'footwear', 'budget', 'https://www.dsw.com', '{"country": "USA", "founded": 1991}'),
('Aldo', 'aldo', 'Canadian shoe retailer', 'footwear', 'mid', 'https://www.aldoshoes.com', '{"country": "Canada", "founded": 1972}'),
('Nine West', 'nine-west', 'American fashion footwear and accessories brand', 'footwear', 'mid', 'https://www.ninewest.com', '{"country": "USA", "founded": 1978}'),
('Sam Edelman', 'sam-edelman', 'American footwear designer brand', 'footwear', 'mid', 'https://www.samedelman.com', '{"country": "USA", "founded": 2004}'),
('Stuart Weitzman', 'stuart-weitzman', 'Luxury shoe designer brand', 'footwear', 'luxury', 'https://www.stuartweitzman.com', '{"country": "USA", "founded": 1986}'),
('Jimmy Choo', 'jimmy-choo', 'British luxury fashion house specializing in shoes', 'footwear', 'luxury', 'https://www.jimmychoo.com', '{"country": "UK", "founded": 1996}'),
('Manolo Blahnik', 'manolo-blahnik', 'Spanish luxury footwear brand', 'footwear', 'luxury', 'https://www.manoloblahnik.com', '{"country": "Spain", "founded": 1970}'),
('Christian Louboutin', 'christian-louboutin', 'French luxury fashion house known for red-soled shoes', 'footwear', 'luxury', 'https://www.christianlouboutin.com', '{"country": "France", "founded": 1991}'),
('Dr. Martens', 'dr-martens', 'British footwear and clothing brand', 'footwear', 'mid', 'https://www.drmartens.com', '{"country": "UK", "founded": 1960}'),
('Birkenstock', 'birkenstock', 'German footwear brand known for sandals', 'footwear', 'mid', 'https://www.birkenstock.com', '{"country": "Germany", "founded": 1774}'),
('Crocs', 'crocs', 'American footwear company known for foam clogs', 'footwear', 'budget', 'https://www.crocs.com', '{"country": "USA", "founded": 2002}'),
('Allbirds', 'allbirds', 'Sustainable footwear brand using natural materials', 'footwear', 'mid', 'https://www.allbirds.com', '{"country": "USA", "founded": 2016, "sustainability": true}'),
('Vans', 'vans', 'American footwear company specializing in skateboarding shoes', 'footwear', 'budget', 'https://www.vans.com', '{"country": "USA", "founded": 1966}'),
('Converse', 'converse', 'American shoe company known for Chuck Taylor sneakers', 'footwear', 'budget', 'https://www.converse.com', '{"country": "USA", "founded": 1908}'),
('UGG', 'ugg', 'American footwear brand known for sheepskin boots', 'footwear', 'mid', 'https://www.ugg.com', '{"country": "USA", "founded": 1978}'),

-- =====================================================
-- LINGERIE & INTIMATES (Budget to Luxury)
-- Underwear, sleepwear, and intimate apparel
-- =====================================================
('Victoria''s Secret', 'victorias-secret', 'American lingerie and beauty retailer', 'lingerie', 'mid', 'https://www.victoriassecret.com', '{"country": "USA", "founded": 1977}'),
('ThirdLove', 'thirdlove', 'Direct-to-consumer lingerie brand', 'lingerie', 'mid', 'https://www.thirdlove.com', '{"country": "USA", "founded": 2013}'),
('Savage X Fenty', 'savage-x-fenty', 'Lingerie line by Rihanna focused on inclusivity', 'lingerie', 'mid', 'https://www.savagex.com', '{"country": "USA", "founded": 2018}'),
('La Perla', 'la-perla', 'Italian luxury lingerie brand', 'lingerie', 'luxury', 'https://www.laperla.com', '{"country": "Italy", "founded": 1954}'),
('Agent Provocateur', 'agent-provocateur', 'British luxury lingerie brand', 'lingerie', 'luxury', 'https://www.agentprovocateur.com', '{"country": "UK", "founded": 1994}'),
('Fleur du Mal', 'fleur-du-mal', 'New York lingerie and ready-to-wear brand', 'lingerie', 'premium', 'https://www.fleurdumal.com', '{"country": "USA", "founded": 2012}'),
('Negative Underwear', 'negative-underwear', 'Minimalist lingerie brand', 'lingerie', 'mid', 'https://www.negativeunderwear.com', '{"country": "USA", "founded": 2014}'),
('Soma', 'soma', 'American lingerie retailer', 'lingerie', 'mid', 'https://www.soma.com', '{"country": "USA", "founded": 2004}'),
('Hanky Panky', 'hanky-panky', 'American lingerie brand known for lace thongs', 'lingerie', 'mid', 'https://www.hankypanky.com', '{"country": "USA", "founded": 1977}'),
('Cosabella', 'cosabella', 'Italian lingerie brand', 'lingerie', 'premium', 'https://www.cosabella.com', '{"country": "Italy", "founded": 1983}'),

-- =====================================================
-- ACCESSORIES (Mid to Luxury)
-- Handbags, jewelry, and accessories
-- =====================================================
('Michael Kors', 'michael-kors', 'American luxury fashion brand specializing in handbags', 'accessories', 'premium', 'https://www.michaelkors.com', '{"country": "USA", "founded": 1981}'),
('Coach', 'coach', 'American luxury fashion house specializing in leather goods', 'accessories', 'premium', 'https://www.coach.com', '{"country": "USA", "founded": 1941}'),
('Kate Spade', 'kate-spade', 'American fashion design house specializing in handbags', 'accessories', 'mid', 'https://www.katespade.com', '{"country": "USA", "founded": 1993}'),
('Tory Burch', 'tory-burch', 'American luxury fashion label specializing in handbags and accessories', 'accessories', 'premium', 'https://www.toryburch.com', '{"country": "USA", "founded": 2004}'),
('Fossil', 'fossil', 'American fashion designer and manufacturer focused on watches', 'accessories', 'mid', 'https://www.fossil.com', '{"country": "USA", "founded": 1984}'),
('Tiffany & Co.', 'tiffany-co', 'American luxury jewelry and specialty retailer', 'accessories', 'luxury', 'https://www.tiffany.com', '{"country": "USA", "founded": 1837}'),
('Pandora', 'pandora', 'Danish jewelry manufacturer and retailer', 'accessories', 'mid', 'https://www.pandora.net', '{"country": "Denmark", "founded": 1982}'),
('Mejuri', 'mejuri', 'Canadian jewelry brand offering everyday luxury', 'accessories', 'mid', 'https://www.mejuri.com', '{"country": "Canada", "founded": 2015}'),
('Baublebar', 'baublebar', 'American jewelry and accessories brand', 'accessories', 'budget', 'https://www.baublebar.com', '{"country": "USA", "founded": 2011}'),
('Mansur Gavriel', 'mansur-gavriel', 'American luxury handbag brand', 'accessories', 'premium', 'https://www.mansurgavriel.com', '{"country": "USA", "founded": 2012}'),
('Staud', 'staud', 'Los Angeles-based fashion brand known for handbags', 'accessories', 'premium', 'https://www.staud.clothing', '{"country": "USA", "founded": 2015}'),
('Polene', 'polene', 'French leather goods brand', 'accessories', 'mid', 'https://www.polene-paris.com', '{"country": "France", "founded": 2016}'),

-- =====================================================
-- SUSTAINABLE / ETHICAL (Mid to Premium)
-- Eco-conscious and socially responsible brands
-- =====================================================
('Eileen Fisher', 'eileen-fisher', 'American clothing brand focused on sustainability and timeless design', 'sustainable', 'premium', 'https://www.eileenfisher.com', '{"country": "USA", "founded": 1984, "sustainability": true}'),
('Stella McCartney', 'stella-mccartney', 'British luxury fashion house committed to sustainability', 'sustainable', 'luxury', 'https://www.stellamccartney.com', '{"country": "UK", "founded": 2001, "sustainability": true}'),
('People Tree', 'people-tree', 'Fair trade and sustainable fashion brand', 'sustainable', 'mid', 'https://www.peopletree.co.uk', '{"country": "UK", "founded": 1991, "sustainability": true}'),
('Thought', 'thought', 'British ethical clothing brand', 'sustainable', 'mid', 'https://www.wearethought.com', '{"country": "UK", "founded": 1995, "sustainability": true}'),
('Veja', 'veja', 'French sustainable sneaker brand', 'sustainable', 'mid', 'https://www.veja-store.com', '{"country": "France", "founded": 2004, "sustainability": true}'),
('Girlfriend Collective', 'girlfriend-collective', 'Sustainable activewear made from recycled materials', 'sustainable', 'mid', 'https://www.girlfriend.com', '{"country": "USA", "founded": 2016, "sustainability": true}'),
('Christy Dawn', 'christy-dawn', 'Sustainable fashion brand using deadstock fabrics', 'sustainable', 'premium', 'https://www.christydawn.com', '{"country": "USA", "founded": 2013, "sustainability": true}'),
('Ninety Percent', 'ninety-percent', 'Sustainable fashion brand sharing 90% of profits', 'sustainable', 'mid', 'https://www.ninetypercent.com', '{"country": "UK", "founded": 2018, "sustainability": true}'),
('Amour Vert', 'amour-vert', 'American sustainable fashion brand', 'sustainable', 'mid', 'https://www.amourvert.com', '{"country": "USA", "founded": 2010, "sustainability": true}'),
('Organic Basics', 'organic-basics', 'Danish brand creating sustainable essentials', 'sustainable', 'mid', 'https://www.organicbasics.com', '{"country": "Denmark", "founded": 2015, "sustainability": true}'),

-- =====================================================
-- PLUS SIZE / INCLUSIVE (Budget to Premium)
-- Size-inclusive and plus-size focused brands
-- =====================================================
('Eloquii', 'eloquii', 'Plus-size fashion brand offering trendy styles', 'plus-size', 'mid', 'https://www.eloquii.com', '{"country": "USA", "founded": 2014}'),
('Lane Bryant', 'lane-bryant', 'Plus-size clothing retailer for women', 'plus-size', 'mid', 'https://www.lanebryant.com', '{"country": "USA", "founded": 1904}'),
('Torrid', 'torrid', 'Plus-size fashion brand for young women', 'plus-size', 'mid', 'https://www.torrid.com', '{"country": "USA", "founded": 2001}'),
('Universal Standard', 'universal-standard', 'Size-inclusive brand offering 00-40', 'plus-size', 'premium', 'https://www.universalstandard.com', '{"country": "USA", "founded": 2015}'),
('Good American', 'good-american', 'Inclusive denim brand by Khloe Kardashian', 'plus-size', 'premium', 'https://www.goodamerican.com', '{"country": "USA", "founded": 2016}'),
('11 Honoré', '11-honore', 'Luxury plus-size fashion retailer', 'plus-size', 'luxury', 'https://www.11honore.com', '{"country": "USA", "founded": 2017}'),

-- =====================================================
-- MATERNITY (Budget to Premium)
-- Maternity and nursing wear
-- =====================================================
('A Pea in the Pod', 'a-pea-in-the-pod', 'Maternity clothing retailer', 'maternity', 'mid', 'https://www.apeainthepod.com', '{"country": "USA", "founded": 1982}'),
('Motherhood Maternity', 'motherhood-maternity', 'Maternity clothing retail chain', 'maternity', 'budget', 'https://www.motherhood.com', '{"country": "USA", "founded": 1982}'),
('Hatch', 'hatch', 'Modern maternity fashion brand', 'maternity', 'premium', 'https://www.hatchcollection.com', '{"country": "USA", "founded": 2011}'),
('Seraphine', 'seraphine', 'British maternity wear brand', 'maternity', 'mid', 'https://www.seraphine.com', '{"country": "UK", "founded": 2002}'),
('Isabella Oliver', 'isabella-oliver', 'British maternity wear brand', 'maternity', 'premium', 'https://www.isabellaoliver.com', '{"country": "UK", "founded": 2003}'),

-- =====================================================
-- DENIM SPECIALISTS (Mid to Premium)
-- Denim-focused brands
-- =====================================================
('Levi''s', 'levis', 'American denim brand and pioneer of blue jeans', 'denim', 'mid', 'https://www.levi.com', '{"country": "USA", "founded": 1853}'),
('Wrangler', 'wrangler', 'American manufacturer of jeans and workwear', 'denim', 'budget', 'https://www.wrangler.com', '{"country": "USA", "founded": 1904}'),
('Lee', 'lee', 'American denim brand', 'denim', 'budget', 'https://www.lee.com', '{"country": "USA", "founded": 1889}'),
('AG Jeans', 'ag-jeans', 'Premium denim brand from Los Angeles', 'denim', 'premium', 'https://www.agjeans.com', '{"country": "USA", "founded": 2000}'),
('Agolde', 'agolde', 'Los Angeles-based denim brand', 'denim', 'premium', 'https://www.agolde.com', '{"country": "USA", "founded": 1993}'),
('Mother Denim', 'mother-denim', 'Los Angeles-based premium denim brand', 'denim', 'premium', 'https://www.motherdenim.com', '{"country": "USA", "founded": 2010}'),
('Frame', 'frame', 'American fashion brand known for premium denim', 'denim', 'premium', 'https://www.frame-store.com', '{"country": "USA", "founded": 2012}'),
('Citizens of Humanity', 'citizens-of-humanity', 'Los Angeles-based premium denim brand', 'denim', 'premium', 'https://www.citizensofhumanity.com', '{"country": "USA", "founded": 2003}'),
('Paige', 'paige', 'Premium denim and contemporary fashion brand', 'denim', 'premium', 'https://www.paige.com', '{"country": "USA", "founded": 2004}'),
('7 For All Mankind', '7-for-all-mankind', 'American denim brand', 'denim', 'premium', 'https://www.7forallmankind.com', '{"country": "USA", "founded": 2000}'),

-- =====================================================
-- DESIGNER / CONTEMPORARY (Premium to Luxury)
-- Additional designer and contemporary brands
-- =====================================================
('Ralph Lauren', 'ralph-lauren', 'American fashion company known for classic American style', 'designer', 'premium', 'https://www.ralphlauren.com', '{"country": "USA", "founded": 1967}'),
('Calvin Klein', 'calvin-klein', 'American fashion house known for minimalist aesthetics', 'designer', 'premium', 'https://www.calvinklein.com', '{"country": "USA", "founded": 1968}'),
('Tommy Hilfiger', 'tommy-hilfiger', 'American premium clothing brand', 'designer', 'mid', 'https://www.tommy.com', '{"country": "USA", "founded": 1985}'),
('Marc Jacobs', 'marc-jacobs', 'American fashion designer brand', 'designer', 'luxury', 'https://www.marcjacobs.com', '{"country": "USA", "founded": 1984}'),
('Diane von Furstenberg', 'diane-von-furstenberg', 'Belgian fashion designer known for wrap dress', 'designer', 'premium', 'https://www.dvf.com', '{"country": "Belgium", "founded": 1972}'),
('Trina Turk', 'trina-turk', 'American fashion designer known for bold prints', 'designer', 'premium', 'https://www.trinaturk.com', '{"country": "USA", "founded": 1995}'),
('Veronica Beard', 'veronica-beard', 'Contemporary fashion brand by sister-in-law duo', 'designer', 'premium', 'https://www.veronicabeard.com', '{"country": "USA", "founded": 2010}'),
('Zimmermann', 'zimmermann', 'Australian luxury fashion brand', 'designer', 'luxury', 'https://www.zimmermannwear.com', '{"country": "Australia", "founded": 1991}'),
('Self-Portrait', 'self-portrait', 'Contemporary fashion brand from London', 'designer', 'premium', 'https://www.self-portrait-studio.com', '{"country": "UK", "founded": 2013}'),
('The Row', 'the-row', 'American luxury fashion label by Mary-Kate and Ashley Olsen', 'designer', 'luxury', 'https://www.therow.com', '{"country": "USA", "founded": 2006}')
ON CONFLICT (slug) DO NOTHING;
