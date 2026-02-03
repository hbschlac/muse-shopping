-- Comprehensive Items Seed File
-- Created: 2026-02-02
-- Purpose: Populate newsfeed with realistic product items across all categories
-- This file creates 250+ items and maps them to feed modules

-- =====================================================
-- ITEMS - CLOTHING & APPAREL
-- =====================================================

-- FAST FASHION ITEMS (Zara, H&M, Mango, etc.)
INSERT INTO items (brand_id, canonical_name, description, category, subcategory, gender, primary_image_url)
SELECT * FROM (VALUES
  -- Zara Items
  ((SELECT id FROM brands WHERE slug = 'zara'), 'Linen Blend Blazer', 'Structured blazer in breathable linen blend. Notched lapels, front button closure, and flap pockets. Perfect for spring layering.', 'outerwear', 'blazers', 'women', 'https://images.unsplash.com/photo-1591369822096-ffd140ec948f?w=600'),
  ((SELECT id FROM brands WHERE slug = 'zara'), 'High Waist Wide Leg Jeans', 'Classic wide leg denim in a high-rise fit. Medium wash with subtle distressing. Timeless and versatile.', 'bottoms', 'jeans', 'women', 'https://images.unsplash.com/photo-1582418702059-97ebafb35d09?w=600'),
  ((SELECT id FROM brands WHERE slug = 'zara'), 'Satin Midi Skirt', 'Flowing midi skirt in luxurious satin fabric. Side zip closure and subtle sheen. Dress up or down.', 'bottoms', 'skirts', 'women', 'https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?w=600'),
  ((SELECT id FROM brands WHERE slug = 'zara'), 'Puff Sleeve Crop Top', 'Romantic crop top with voluminous puff sleeves. Square neckline and back tie detail.', 'tops', 'blouses', 'women', 'https://images.unsplash.com/photo-1564257577144-96f597e498e0?w=600'),
  ((SELECT id FROM brands WHERE slug = 'zara'), 'Faux Leather Biker Jacket', 'Edgy biker jacket in soft faux leather. Asymmetric zip closure, lapel collar, and zippered pockets.', 'outerwear', 'jackets', 'women', 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600'),
  ((SELECT id FROM brands WHERE slug = 'zara'), 'Ribbed Knit Tank Top', 'Fitted ribbed tank in soft cotton blend. Scoop neckline and cropped length. Essential layering piece.', 'tops', 'tanks', 'women', 'https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=600'),
  ((SELECT id FROM brands WHERE slug = 'zara'), 'Pleated Midi Dress', 'Elegant midi dress with pleated skirt detail. V-neckline, short sleeves, and elastic waist.', 'dresses', 'midi_dresses', 'women', 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=600'),
  ((SELECT id FROM brands WHERE slug = 'zara'), 'Tailored Straight Trousers', 'Classic straight-leg trousers with pressed creases. Mid-rise with belt loops and side pockets.', 'bottoms', 'pants', 'women', 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=600'),

  -- H&M Items
  ((SELECT id FROM brands WHERE slug = 'hm'), 'Oversized Denim Shirt', 'Relaxed denim shirt in light wash. Chest pockets, button front, and drop shoulders.', 'tops', 'shirts', 'women', 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=600'),
  ((SELECT id FROM brands WHERE slug = 'hm'), 'Cotton Jersey T-Shirt Dress', 'Comfortable t-shirt dress in soft cotton jersey. Crew neck, short sleeves, and side pockets.', 'dresses', 'casual_dresses', 'women', 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=600'),
  ((SELECT id FROM brands WHERE slug = 'hm'), 'Knit Cardigan', 'Cozy knit cardigan with button front. Ribbed trim and relaxed fit.', 'tops', 'sweaters', 'women', 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=600'),
  ((SELECT id FROM brands WHERE slug = 'hm'), 'Skinny Fit Jeans', 'Classic skinny jeans in dark wash. Stretch denim, five-pocket styling, and ankle length.', 'bottoms', 'jeans', 'women', 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=600'),
  ((SELECT id FROM brands WHERE slug = 'hm'), 'Floral Print Wrap Dress', 'Feminine wrap dress in vibrant floral print. V-neckline, flutter sleeves, and tie waist.', 'dresses', 'wrap_dresses', 'women', 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=600'),
  ((SELECT id FROM brands WHERE slug = 'hm'), 'Linen Blend Shorts', 'Relaxed shorts in breathable linen blend. High waist with belt loops and side pockets.', 'bottoms', 'shorts', 'women', 'https://images.unsplash.com/photo-1591195853828-11db59a44f6b?w=600'),
  ((SELECT id FROM brands WHERE slug = 'hm'), 'Hooded Sweatshirt', 'Classic pullover hoodie in soft cotton blend. Kangaroo pocket and drawstring hood.', 'tops', 'sweatshirts', 'women', 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=600'),
  ((SELECT id FROM brands WHERE slug = 'hm'), 'A-Line Mini Skirt', 'Flirty mini skirt in a flattering A-line silhouette. Side zip closure and subtle stretch.', 'bottoms', 'skirts', 'women', 'https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?w=600'),

  -- Mango Items
  ((SELECT id FROM brands WHERE slug = 'mango'), 'Belted Linen Dress', 'Effortless linen dress with self-tie belt. V-neckline, short sleeves, and midi length.', 'dresses', 'midi_dresses', 'women', 'https://images.unsplash.com/photo-1505022610485-0249ba5b3675?w=600'),
  ((SELECT id FROM brands WHERE slug = 'mango'), 'Cropped Linen Trousers', 'Tailored linen trousers in a cropped length. High waist, front pleats, and side pockets.', 'bottoms', 'pants', 'women', 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=600'),
  ((SELECT id FROM brands WHERE slug = 'mango'), 'Cotton Poplin Shirt', 'Classic poplin shirt with clean lines. Collar neckline, button front, and curved hem.', 'tops', 'shirts', 'women', 'https://images.unsplash.com/photo-1598032895775-d9d102c5c76d?w=600'),
  ((SELECT id FROM brands WHERE slug = 'mango'), 'Knit Midi Skirt', 'Ribbed knit skirt with bodycon fit. Elastic waistband and midi length.', 'bottoms', 'skirts', 'women', 'https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?w=600'),
  ((SELECT id FROM brands WHERE slug = 'mango'), 'Faux Suede Jacket', 'Luxe faux suede jacket with zipper closure. Collared neckline and zippered pockets.', 'outerwear', 'jackets', 'women', 'https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?w=600'),
  ((SELECT id FROM brands WHERE slug = 'mango'), 'Striped Cotton Tee', 'Classic striped tee in soft cotton. Crew neck, short sleeves, and relaxed fit.', 'tops', 'tshirts', 'women', 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600'),

  -- Forever 21 Items
  ((SELECT id FROM brands WHERE slug = 'forever-21'), 'Bodycon Mini Dress', 'Figure-hugging mini dress in stretch knit fabric. Scoop neck and short sleeves.', 'dresses', 'mini_dresses', 'women', 'https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=600'),
  ((SELECT id FROM brands WHERE slug = 'forever-21'), 'Ripped Boyfriend Jeans', 'Relaxed boyfriend jeans with distressed details. Mid-rise and rolled cuffs.', 'bottoms', 'jeans', 'women', 'https://images.unsplash.com/photo-1475178626620-a4d074967452?w=600'),
  ((SELECT id FROM brands WHERE slug = 'forever-21'), 'Graphic Crop Tee', 'Trendy crop tee with graphic print. Crew neck and short sleeves.', 'tops', 'tshirts', 'women', 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=600'),
  ((SELECT id FROM brands WHERE slug = 'forever-21'), 'Paperbag Waist Shorts', 'High-waisted shorts with paperbag waist detail. Belt tie and side pockets.', 'bottoms', 'shorts', 'women', 'https://images.unsplash.com/photo-1591195853828-11db59a44f6b?w=600'),
  ((SELECT id FROM brands WHERE slug = 'forever-21'), 'Mesh Overlay Top', 'Sheer mesh top with underlayer. Mock neck and long sleeves.', 'tops', 'blouses', 'women', 'https://images.unsplash.com/photo-1485968579580-b6d095142e6e?w=600')
) AS v(brand_id, canonical_name, description, category, subcategory, gender, primary_image_url)
WHERE NOT EXISTS (SELECT 1 FROM items WHERE canonical_name = v.canonical_name);

-- CONTEMPORARY & PREMIUM ITEMS (Everlane, Reformation, COS, etc.)
INSERT INTO items (brand_id, canonical_name, description, category, subcategory, gender, primary_image_url)
SELECT * FROM (VALUES
  -- Everlane Items
  ((SELECT id FROM brands WHERE slug = 'everlane'), 'The Modern Loafer', 'Timeless leather loafers with cushioned insole. Crafted in ethical factories with transparency.', 'shoes', 'flats', 'women', 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=600'),
  ((SELECT id FROM brands WHERE slug = 'everlane'), 'The Cashmere Crew', 'Luxuriously soft cashmere sweater. Crew neckline and relaxed fit. A sustainable staple.', 'tops', 'sweaters', 'women', 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=600'),
  ((SELECT id FROM brands WHERE slug = 'everlane'), 'The Day Heel', 'Elegant block heel pumps in Italian leather. Comfortable enough for all day wear.', 'shoes', 'heels', 'women', 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=600'),
  ((SELECT id FROM brands WHERE slug = 'everlane'), 'The Relaxed Pant', 'Easy pull-on pants in soft ponte fabric. Elastic waist and tapered leg.', 'bottoms', 'pants', 'women', 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=600'),
  ((SELECT id FROM brands WHERE slug = 'everlane'), 'The Silk Tank', 'Elegant silk tank with delicate drape. V-neckline and adjustable straps.', 'tops', 'tanks', 'women', 'https://images.unsplash.com/photo-1594633313593-bab3825d0caf?w=600'),
  ((SELECT id FROM brands WHERE slug = 'everlane'), 'The ReNew Parka', 'Sustainable puffer parka made from recycled materials. Water-resistant with removable hood.', 'outerwear', 'coats', 'women', 'https://images.unsplash.com/photo-1539533018447-63fcce2678e3?w=600'),
  ((SELECT id FROM brands WHERE slug = 'everlane'), 'The Organic Cotton Box-Cut Tee', 'Classic boxy tee in 100% organic cotton. Crew neck and short sleeves.', 'tops', 'tshirts', 'women', 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600'),

  -- Reformation Items
  ((SELECT id FROM brands WHERE slug = 'reformation'), 'Juliette Dress', 'Romantic midi dress in lightweight linen. Puff sleeves, V-neck, and tiered skirt detail.', 'dresses', 'midi_dresses', 'women', 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=600'),
  ((SELECT id FROM brands WHERE slug = 'reformation'), 'High Rise Straight Jeans', 'Vintage-inspired straight leg jeans. High-rise fit in sustainable denim.', 'bottoms', 'jeans', 'women', 'https://images.unsplash.com/photo-1582418702059-97ebafb35d09?w=600'),
  ((SELECT id FROM brands WHERE slug = 'reformation'), 'Linen Wrap Top', 'Breezy wrap top in pure linen. Tie waist and flutter sleeves for effortless summer style.', 'tops', 'blouses', 'women', 'https://images.unsplash.com/photo-1564257577144-96f597e498e0?w=600'),
  ((SELECT id FROM brands WHERE slug = 'reformation'), 'Midi Slip Dress', 'Silky slip dress with bias cut. Cowl neckline and adjustable straps for perfect fit.', 'dresses', 'slip_dresses', 'women', 'https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=600'),
  ((SELECT id FROM brands WHERE slug = 'reformation'), 'High Waisted Shorts', 'Vintage-style denim shorts with frayed hem. High rise with button fly.', 'bottoms', 'shorts', 'women', 'https://images.unsplash.com/photo-1591195853828-11db59a44f6b?w=600'),
  ((SELECT id FROM brands WHERE slug = 'reformation'), 'Ribbed Knit Cardigan', 'Soft ribbed cardigan with button front. Cropped length and relaxed fit.', 'tops', 'sweaters', 'women', 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=600'),
  ((SELECT id FROM brands WHERE slug = 'reformation'), 'Palazzo Pants', 'Flowy palazzo pants in sustainable viscose. High waist with wide leg silhouette.', 'bottoms', 'pants', 'women', 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=600'),

  -- COS Items
  ((SELECT id FROM brands WHERE slug = 'cos'), 'Minimalist Wool Coat', 'Sleek wool coat with clean lines. Notched lapels and concealed button closure.', 'outerwear', 'coats', 'women', 'https://images.unsplash.com/photo-1539533018447-63fcce2678e3?w=600'),
  ((SELECT id FROM brands WHERE slug = 'cos'), 'Relaxed Fit Shirt', 'Oversized shirt in crisp cotton poplin. Collar neckline and dropped shoulders.', 'tops', 'shirts', 'women', 'https://images.unsplash.com/photo-1598032895775-d9d102c5c76d?w=600'),
  ((SELECT id FROM brands WHERE slug = 'cos'), 'Tailored Wide Leg Trousers', 'Modern wide leg trousers in wool blend. High waist with front pleats.', 'bottoms', 'pants', 'women', 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=600'),
  ((SELECT id FROM brands WHERE slug = 'cos'), 'Merino Wool Sweater', 'Fine-gauge merino wool sweater. Crew neck and relaxed fit for layering.', 'tops', 'sweaters', 'women', 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=600'),
  ((SELECT id FROM brands WHERE slug = 'cos'), 'Draped Jersey Dress', 'Architectural dress in fluid jersey. Asymmetric draping and midi length.', 'dresses', 'midi_dresses', 'women', 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=600'),
  ((SELECT id FROM brands WHERE slug = 'cos'), 'Leather Chelsea Boots', 'Classic Chelsea boots in premium leather. Elastic side panels and pull tab.', 'shoes', 'boots', 'women', 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=600'),

  -- Ganni Items
  ((SELECT id FROM brands WHERE slug = 'ganni'), 'Floral Print Midi Dress', 'Scandi-cool dress in vibrant floral print. Puff sleeves and button front.', 'dresses', 'midi_dresses', 'women', 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=600'),
  ((SELECT id FROM brands WHERE slug = 'ganni'), 'Leather Mini Skirt', 'Edgy mini skirt in buttery soft leather. High waist with snap button closure.', 'bottoms', 'skirts', 'women', 'https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?w=600'),
  ((SELECT id FROM brands WHERE slug = 'ganni'), 'Oversized Blazer', 'Statement blazer with oversized fit. Peak lapels and shoulder pads.', 'outerwear', 'blazers', 'women', 'https://images.unsplash.com/photo-1591369822096-ffd140ec948f?w=600'),
  ((SELECT id FROM brands WHERE slug = 'ganni'), 'Western Boots', 'Statement boots with western-inspired details. Block heel and embroidered shaft.', 'shoes', 'boots', 'women', 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=600'),

  -- Sezane Items
  ((SELECT id FROM brands WHERE slug = 'sezane'), 'French Terry Sweatshirt', 'Parisian-chic sweatshirt in soft French terry. Crew neck and relaxed fit.', 'tops', 'sweatshirts', 'women', 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=600'),
  ((SELECT id FROM brands WHERE slug = 'sezane'), 'Silk Polka Dot Blouse', 'Romantic blouse in pure silk. Polka dot print with pussy bow detail.', 'tops', 'blouses', 'women', 'https://images.unsplash.com/photo-1564257577144-96f597e498e0?w=600'),
  ((SELECT id FROM brands WHERE slug = 'sezane'), 'High Waist Midi Skirt', 'Elegant midi skirt with button front. A-line silhouette in twill fabric.', 'bottoms', 'skirts', 'women', 'https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?w=600'),
  ((SELECT id FROM brands WHERE slug = 'sezane'), 'Wool Blend Cardigan', 'Cozy cardigan in wool blend. Button front with ribbed trim.', 'tops', 'sweaters', 'women', 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=600')
) AS v(brand_id, canonical_name, description, category, subcategory, gender, primary_image_url)
WHERE NOT EXISTS (SELECT 1 FROM items WHERE canonical_name = v.canonical_name);

-- ATHLETIC & ACTIVEWEAR (Lululemon, Nike, Alo Yoga, etc.)
INSERT INTO items (brand_id, canonical_name, description, category, subcategory, gender, primary_image_url)
SELECT * FROM (VALUES
  -- Lululemon Items
  ((SELECT id FROM brands WHERE slug = 'lululemon'), 'Align High-Rise Pant 25"', 'Buttery-soft yoga pants with four-way stretch. High-rise waist and hidden pocket.', 'activewear', 'leggings', 'women', 'https://images.unsplash.com/photo-1506629082955-511b1aa562c8?w=600'),
  ((SELECT id FROM brands WHERE slug = 'lululemon'), 'Swiftly Tech Long Sleeve', 'Lightweight long sleeve top with seamless construction. Moisture-wicking and anti-stink.', 'activewear', 'tops', 'women', 'https://images.unsplash.com/photo-1588117305388-c2631a279f82?w=600'),
  ((SELECT id FROM brands WHERE slug = 'lululemon'), 'Scuba Oversized Half-Zip', 'Cozy hoodie with oversized fit. Cotton-blend fleece with kangaroo pocket.', 'activewear', 'hoodies', 'women', 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=600'),
  ((SELECT id FROM brands WHERE slug = 'lululemon'), 'Fast and Free High-Rise Tight', 'Running tights with Nulux fabric. High-rise with multiple pockets for storage.', 'activewear', 'leggings', 'women', 'https://images.unsplash.com/photo-1506629082955-511b1aa562c8?w=600'),
  ((SELECT id FROM brands WHERE slug = 'lululemon'), 'Energy Bra Long Line', 'Medium-support sports bra with longer length. Moisture-wicking and quick-drying.', 'activewear', 'sports_bras', 'women', 'https://images.unsplash.com/photo-1588117305388-c2631a279f82?w=600'),
  ((SELECT id FROM brands WHERE slug = 'lululemon'), 'Align Tank', 'Lightweight tank with built-in shelf bra. Buttery Nulu fabric for yoga and lounging.', 'activewear', 'tanks', 'women', 'https://images.unsplash.com/photo-1588117305388-c2631a279f82?w=600'),
  ((SELECT id FROM brands WHERE slug = 'lululemon'), 'Define Jacket', 'Fitted jacket with stretch fabric. Thumbholes and zippered pockets.', 'activewear', 'jackets', 'women', 'https://images.unsplash.com/photo-1551488831-00167b16eac5?w=600'),

  -- Nike Items
  ((SELECT id FROM brands WHERE slug = 'nike'), 'Air Max 90 Sneakers', 'Classic sneakers with visible Max Air cushioning. Iconic waffle outsole for traction.', 'shoes', 'sneakers', 'women', 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600'),
  ((SELECT id FROM brands WHERE slug = 'nike'), 'Dri-FIT One Leggings', 'High-rise leggings with Dri-FIT technology. Non-sheer fabric with hidden pockets.', 'activewear', 'leggings', 'women', 'https://images.unsplash.com/photo-1506629082955-511b1aa562c8?w=600'),
  ((SELECT id FROM brands WHERE slug = 'nike'), 'Swoosh Sports Bra', 'Medium-support sports bra with iconic Swoosh design. Breathable mesh panels.', 'activewear', 'sports_bras', 'women', 'https://images.unsplash.com/photo-1588117305388-c2631a279f82?w=600'),
  ((SELECT id FROM brands WHERE slug = 'nike'), 'Pro Dri-FIT Tank', 'Fitted tank top with sweat-wicking fabric. Racerback design for full range of motion.', 'activewear', 'tanks', 'women', 'https://images.unsplash.com/photo-1588117305388-c2631a279f82?w=600'),
  ((SELECT id FROM brands WHERE slug = 'nike'), 'Blazer Mid 77 Sneakers', 'Retro basketball-inspired sneakers. Vintage styling with modern comfort.', 'shoes', 'sneakers', 'women', 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600'),
  ((SELECT id FROM brands WHERE slug = 'nike'), 'Therma-FIT Pullover Hoodie', 'Warm hoodie with Therma-FIT technology. Kangaroo pocket and drawcord hood.', 'activewear', 'hoodies', 'women', 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=600'),

  -- Alo Yoga Items
  ((SELECT id FROM brands WHERE slug = 'alo-yoga'), 'Airlift Legging', 'High-waist leggings with four-way stretch. Smoothing and supportive fit.', 'activewear', 'leggings', 'women', 'https://images.unsplash.com/photo-1506629082955-511b1aa562c8?w=600'),
  ((SELECT id FROM brands WHERE slug = 'alo-yoga'), 'Accolade Sweatpant', 'Tapered sweatpants with elastic waist. Soft brushed interior for comfort.', 'activewear', 'pants', 'women', 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=600'),
  ((SELECT id FROM brands WHERE slug = 'alo-yoga'), 'Ideal Bra', 'Strappy sports bra with removable cups. Medium support for studio workouts.', 'activewear', 'sports_bras', 'women', 'https://images.unsplash.com/photo-1588117305388-c2631a279f82?w=600'),
  ((SELECT id FROM brands WHERE slug = 'alo-yoga'), 'Cropped Hoodie', 'Cropped hoodie in soft fleece. Drawstring hood and ribbed cuffs.', 'activewear', 'hoodies', 'women', 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=600'),

  -- Outdoor Voices Items
  ((SELECT id FROM brands WHERE slug = 'outdoor-voices'), 'The Exercise Dress', 'Versatile dress for recreation. Built-in shorts and sweat-wicking fabric.', 'activewear', 'dresses', 'women', 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=600'),
  ((SELECT id FROM brands WHERE slug = 'outdoor-voices'), 'Rectrek Zip Pant', 'Technical pants with zip-off legs. Water-resistant and packable.', 'activewear', 'pants', 'women', 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=600'),
  ((SELECT id FROM brands WHERE slug = 'outdoor-voices'), 'CloudKnit Crew', 'Ultra-soft sweater in CloudKnit fabric. Relaxed fit for layering.', 'activewear', 'sweatshirts', 'women', 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=600')
) AS v(brand_id, canonical_name, description, category, subcategory, gender, primary_image_url)
WHERE NOT EXISTS (SELECT 1 FROM items WHERE canonical_name = v.canonical_name);

-- FOOTWEAR (Steve Madden, Sam Edelman, Dr. Martens, etc.)
INSERT INTO items (brand_id, canonical_name, description, category, subcategory, gender, primary_image_url)
SELECT * FROM (VALUES
  -- Steve Madden Items
  ((SELECT id FROM brands WHERE slug = 'steve-madden'), 'Daisie Platform Pumps', 'Sky-high platform pumps with block heel. Pointed toe and ankle strap.', 'shoes', 'heels', 'women', 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=600'),
  ((SELECT id FROM brands WHERE slug = 'steve-madden'), 'Kimmie Sandals', 'Strappy heeled sandals with barely-there design. Adjustable ankle strap.', 'shoes', 'sandals', 'women', 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=600'),
  ((SELECT id FROM brands WHERE slug = 'steve-madden'), 'Gills Loafers', 'Classic loafers with chunky lug sole. Slip-on style in glossy patent leather.', 'shoes', 'flats', 'women', 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=600'),
  ((SELECT id FROM brands WHERE slug = 'steve-madden'), 'Troopa Combat Boots', 'Edgy combat boots with lace-up front. Distressed finish and side zip.', 'shoes', 'boots', 'women', 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=600'),

  -- Sam Edelman Items
  ((SELECT id FROM brands WHERE slug = 'sam-edelman'), 'Loraine Loafers', 'Sophisticated loafers with horsebit detail. Cushioned footbed for all-day comfort.', 'shoes', 'flats', 'women', 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=600'),
  ((SELECT id FROM brands WHERE slug = 'sam-edelman'), 'Hazel Pumps', 'Timeless pointed-toe pumps with stiletto heel. Versatile nude shade.', 'shoes', 'heels', 'women', 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=600'),
  ((SELECT id FROM brands WHERE slug = 'sam-edelman'), 'Penny Riding Boots', 'Classic riding boots in smooth leather. Extended calf with buckle detail.', 'shoes', 'boots', 'women', 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=600'),
  ((SELECT id FROM brands WHERE slug = 'sam-edelman'), 'Gigi Sandals', 'Minimalist flat sandals with T-strap design. Perfect for everyday wear.', 'shoes', 'sandals', 'women', 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=600'),

  -- Dr. Martens Items
  ((SELECT id FROM brands WHERE slug = 'dr-martens'), '1460 8-Eye Boot', 'Iconic ankle boot with yellow stitching. Air-cushioned sole and durable leather.', 'shoes', 'boots', 'women', 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=600'),
  ((SELECT id FROM brands WHERE slug = 'dr-martens'), 'Jadon Platform Boot', 'Platform boot with chunky sole. Signature grooved sides and heel loop.', 'shoes', 'boots', 'women', 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=600'),
  ((SELECT id FROM brands WHERE slug = 'dr-martens'), '2976 Chelsea Boot', 'Classic Chelsea boot with elastic goring. Slip-on style with scripted heel loop.', 'shoes', 'boots', 'women', 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=600'),

  -- Converse Items
  ((SELECT id FROM brands WHERE slug = 'converse'), 'Chuck Taylor All Star High Top', 'Iconic canvas sneakers with rubber sole. Classic high-top silhouette.', 'shoes', 'sneakers', 'women', 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600'),
  ((SELECT id FROM brands WHERE slug = 'converse'), 'Chuck 70 Low Top', 'Premium version of the classic Chuck. Vintage details and cushioned insole.', 'shoes', 'sneakers', 'women', 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600'),
  ((SELECT id FROM brands WHERE slug = 'converse'), 'Platform Chuck Taylor', 'Platform version of the iconic sneaker. Extra height with signature canvas upper.', 'shoes', 'sneakers', 'women', 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600'),

  -- Vans Items
  ((SELECT id FROM brands WHERE slug = 'vans'), 'Old Skool Sneakers', 'Skate-inspired sneakers with side stripe. Canvas and suede upper.', 'shoes', 'sneakers', 'women', 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600'),
  ((SELECT id FROM brands WHERE slug = 'vans'), 'Authentic Canvas Sneakers', 'Classic lace-up sneakers in canvas. Signature waffle outsole.', 'shoes', 'sneakers', 'women', 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600'),
  ((SELECT id FROM brands WHERE slug = 'vans'), 'Slip-On Checkerboard', 'Iconic slip-on sneakers with checkerboard pattern. Easy on-and-off.', 'shoes', 'sneakers', 'women', 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600')
) AS v(brand_id, canonical_name, description, category, subcategory, gender, primary_image_url)
WHERE NOT EXISTS (SELECT 1 FROM items WHERE canonical_name = v.canonical_name);

-- DEPARTMENT STORE ITEMS (Nordstrom, Nordstrom Rack, Bloomingdale's, etc.)
INSERT INTO items (brand_id, canonical_name, description, category, subcategory, gender, primary_image_url)
SELECT * FROM (VALUES
  -- Nordstrom Items
  ((SELECT id FROM brands WHERE slug = 'nordstrom'), 'Cashmere V-Neck Sweater', 'Luxurious cashmere sweater in classic V-neck. Available in multiple colors.', 'tops', 'sweaters', 'women', 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=600'),
  ((SELECT id FROM brands WHERE slug = 'nordstrom'), 'Silk Camisole', 'Delicate silk camisole with adjustable straps. Perfect for layering or solo.', 'tops', 'tanks', 'women', 'https://images.unsplash.com/photo-1594633313593-bab3825d0caf?w=600'),
  ((SELECT id FROM brands WHERE slug = 'nordstrom'), 'Pleated Midi Skirt', 'Elegant pleated skirt in flowing fabric. Elastic waistband and midi length.', 'bottoms', 'skirts', 'women', 'https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?w=600'),
  ((SELECT id FROM brands WHERE slug = 'nordstrom'), 'Tailored Blazer', 'Classic blazer with modern fit. Notched lapels and button closure.', 'outerwear', 'blazers', 'women', 'https://images.unsplash.com/photo-1591369822096-ffd140ec948f?w=600'),
  ((SELECT id FROM brands WHERE slug = 'nordstrom'), 'Leather Crossbody Bag', 'Compact crossbody bag in genuine leather. Adjustable strap and multiple compartments.', 'accessories', 'bags', 'women', 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600'),

  -- Nordstrom Rack Items
  ((SELECT id FROM brands WHERE slug = 'nordstrom-rack'), 'Floral Wrap Dress', 'Feminine wrap dress in vibrant floral print. V-neck and flutter sleeves.', 'dresses', 'wrap_dresses', 'women', 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=600'),
  ((SELECT id FROM brands WHERE slug = 'nordstrom-rack'), 'Designer Straight Leg Jeans', 'Premium denim in classic straight leg. Dark wash with subtle fading.', 'bottoms', 'jeans', 'women', 'https://images.unsplash.com/photo-1582418702059-97ebafb35d09?w=600'),
  ((SELECT id FROM brands WHERE slug = 'nordstrom-rack'), 'Pointy Toe Ankle Boots', 'Sleek ankle boots with pointed toe. Block heel and side zip.', 'shoes', 'boots', 'women', 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=600'),
  ((SELECT id FROM brands WHERE slug = 'nordstrom-rack'), 'Ribbed Turtleneck', 'Fitted turtleneck in soft ribbed knit. Long sleeves and stretchy fabric.', 'tops', 'sweaters', 'women', 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=600'),
  ((SELECT id FROM brands WHERE slug = 'nordstrom-rack'), 'Quilted Crossbody Bag', 'Chic crossbody with quilted detail. Chain strap and gold hardware.', 'accessories', 'bags', 'women', 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600'),
  ((SELECT id FROM brands WHERE slug = 'nordstrom-rack'), 'Satin Slip Skirt', 'Luxe slip skirt in satin fabric. Elastic waistband and midi length.', 'bottoms', 'skirts', 'women', 'https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?w=600'),
  ((SELECT id FROM brands WHERE slug = 'nordstrom-rack'), 'Cashmere Blend Cardigan', 'Soft cardigan in cashmere blend. Button front and ribbed trim.', 'tops', 'sweaters', 'women', 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=600')
) AS v(brand_id, canonical_name, description, category, subcategory, gender, primary_image_url)
WHERE NOT EXISTS (SELECT 1 FROM items WHERE canonical_name = v.canonical_name);

-- CASUAL AMERICAN BRANDS (Abercrombie, Madewell, J.Crew, Gap, etc.)
INSERT INTO items (brand_id, canonical_name, description, category, subcategory, gender, primary_image_url)
SELECT * FROM (VALUES
  -- Abercrombie & Fitch Items
  ((SELECT id FROM brands WHERE slug = 'abercrombie-fitch'), 'YPB Sculpt High-Rise Legging', 'High-performance leggings with sculpting technology. Buttery-soft fabric.', 'activewear', 'leggings', 'women', 'https://images.unsplash.com/photo-1506629082955-511b1aa562c8?w=600'),
  ((SELECT id FROM brands WHERE slug = 'abercrombie-fitch'), 'Sloane Tailored Pant', 'Modern tailored pants with slight flare. High-rise and versatile styling.', 'bottoms', 'pants', 'women', 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=600'),
  ((SELECT id FROM brands WHERE slug = 'abercrombie-fitch'), 'Essential Crew Neck Tee', 'Classic crew neck tee in soft cotton. Relaxed fit and versatile basics.', 'tops', 'tshirts', 'women', 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600'),
  ((SELECT id FROM brands WHERE slug = 'abercrombie-fitch'), 'Vegan Leather Dad Blazer', 'Oversized blazer in vegan leather. Notched lapels and shoulder pads.', 'outerwear', 'blazers', 'women', 'https://images.unsplash.com/photo-1591369822096-ffd140ec948f?w=600'),
  ((SELECT id FROM brands WHERE slug = 'abercrombie-fitch'), '90s Straight Jean', 'Vintage-inspired straight leg jeans. High-rise with relaxed fit.', 'bottoms', 'jeans', 'women', 'https://images.unsplash.com/photo-1582418702059-97ebafb35d09?w=600'),
  ((SELECT id FROM brands WHERE slug = 'abercrombie-fitch'), 'Puffer Jacket', 'Cozy puffer jacket with oversized fit. Water-resistant shell and warm fill.', 'outerwear', 'coats', 'women', 'https://images.unsplash.com/photo-1539533018447-63fcce2678e3?w=600'),
  ((SELECT id FROM brands WHERE slug = 'abercrombie-fitch'), 'Cozy Lounge Pullover', 'Ultra-soft pullover in fuzzy fabric. Perfect for relaxation.', 'tops', 'sweatshirts', 'women', 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=600'),

  -- Madewell Items
  ((SELECT id FROM brands WHERE slug = 'madewell'), 'The Perfect Vintage Jean', 'Classic straight-leg jean in vintage wash. High-rise with relaxed fit.', 'bottoms', 'jeans', 'women', 'https://images.unsplash.com/photo-1582418702059-97ebafb35d09?w=600'),
  ((SELECT id FROM brands WHERE slug = 'madewell'), 'Whisper Cotton V-Neck Tee', 'Soft, lightweight cotton tee with V-neck. Relaxed fit in multiple colors.', 'tops', 'tshirts', 'women', 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600'),
  ((SELECT id FROM brands WHERE slug = 'madewell'), 'The Emmett Wide-Leg Crop Pant', 'Cropped wide-leg pants in stretch twill. High-rise with slant pockets.', 'bottoms', 'pants', 'women', 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=600'),
  ((SELECT id FROM brands WHERE slug = 'madewell'), 'Denim Jacket', 'Classic denim jacket in medium wash. Button front and chest pockets.', 'outerwear', 'jackets', 'women', 'https://images.unsplash.com/photo-1551488831-00167b16eac5?w=600'),
  ((SELECT id FROM brands WHERE slug = 'madewell'), 'Transport Tote', 'Sturdy leather tote with interior pockets. Perfect everyday bag.', 'accessories', 'bags', 'women', 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600'),
  ((SELECT id FROM brands WHERE slug = 'madewell'), 'Linen-Blend Jumpsuit', 'Easy jumpsuit in breathable linen blend. Wide leg and tie waist.', 'jumpsuits', 'jumpsuits', 'women', 'https://images.unsplash.com/photo-1595341595160-ebe8a1c06e84?w=600'),

  -- J.Crew Items
  ((SELECT id FROM brands WHERE slug = 'jcrew'), 'Tippi Sweater', 'Timeless merino wool sweater. Crew neck and fitted silhouette.', 'tops', 'sweaters', 'women', 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=600'),
  ((SELECT id FROM brands WHERE slug = 'jcrew'), 'Chino Pants', 'Classic chino pants in stretch cotton. Straight leg and versatile styling.', 'bottoms', 'pants', 'women', 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=600'),
  ((SELECT id FROM brands WHERE slug = 'jcrew'), 'Button-Up Shirt', 'Crisp cotton shirt with button front. Collar neckline and relaxed fit.', 'tops', 'shirts', 'women', 'https://images.unsplash.com/photo-1598032895775-d9d102c5c76d?w=600'),
  ((SELECT id FROM brands WHERE slug = 'jcrew'), 'Teddy Bear Coat', 'Cozy coat in soft teddy fabric. Oversized fit and notched collar.', 'outerwear', 'coats', 'women', 'https://images.unsplash.com/photo-1539533018447-63fcce2678e3?w=600'),

  -- Gap Items
  ((SELECT id FROM brands WHERE slug = 'gap'), 'Organic Cotton T-Shirt', 'Sustainable tee in 100% organic cotton. Crew neck and classic fit.', 'tops', 'tshirts', 'women', 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600'),
  ((SELECT id FROM brands WHERE slug = 'gap'), 'High Rise Skinny Jeans', 'Classic skinny jeans with high rise. Stretch denim in dark wash.', 'bottoms', 'jeans', 'women', 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=600'),
  ((SELECT id FROM brands WHERE slug = 'gap'), 'Soft Knit Cardigan', 'Cozy cardigan in soft knit fabric. Button front and V-neck.', 'tops', 'sweaters', 'women', 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=600'),
  ((SELECT id FROM brands WHERE slug = 'gap'), 'Logo Hoodie', 'Classic hoodie with Gap logo. Drawstring hood and kangaroo pocket.', 'tops', 'sweatshirts', 'women', 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=600')
) AS v(brand_id, canonical_name, description, category, subcategory, gender, primary_image_url)
WHERE NOT EXISTS (SELECT 1 FROM items WHERE canonical_name = v.canonical_name);

-- BOHEMIAN & LIFESTYLE (Free People, Urban Outfitters, Anthropologie)
INSERT INTO items (brand_id, canonical_name, description, category, subcategory, gender, primary_image_url)
SELECT * FROM (VALUES
  -- Free People Items
  ((SELECT id FROM brands WHERE slug = 'free-people'), 'Adella Slip Dress', 'Romantic maxi slip dress with lace trim. Adjustable straps and flowing silhouette.', 'dresses', 'maxi_dresses', 'women', 'https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=600'),
  ((SELECT id FROM brands WHERE slug = 'free-people'), 'Easy Street Tunic', 'Oversized tunic with embroidered details. V-neck and three-quarter sleeves.', 'tops', 'tunics', 'women', 'https://images.unsplash.com/photo-1564257577144-96f597e498e0?w=600'),
  ((SELECT id FROM brands WHERE slug = 'free-people'), 'High Waist Flare Jeans', 'Retro flare jeans with high rise. Vintage wash with whiskering details.', 'bottoms', 'jeans', 'women', 'https://images.unsplash.com/photo-1582418702059-97ebafb35d09?w=600'),
  ((SELECT id FROM brands WHERE slug = 'free-people'), 'We The Free Thermal', 'Soft thermal top with thumbholes. Perfect for layering.', 'tops', 'tshirts', 'women', 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600'),
  ((SELECT id FROM brands WHERE slug = 'free-people'), 'Crochet Maxi Dress', 'Bohemian maxi dress with crochet detail. Lined with adjustable straps.', 'dresses', 'maxi_dresses', 'women', 'https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=600'),
  ((SELECT id FROM brands WHERE slug = 'free-people'), 'Festival Denim Shorts', 'Distressed denim shorts with frayed hem. Mid-rise and relaxed fit.', 'bottoms', 'shorts', 'women', 'https://images.unsplash.com/photo-1591195853828-11db59a44f6b?w=600'),

  -- Urban Outfitters Items
  ((SELECT id FROM brands WHERE slug = 'urban-outfitters'), 'UO Cropped Cardigan', 'Trendy cropped cardigan with buttons. Soft knit in fun colors.', 'tops', 'sweaters', 'women', 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=600'),
  ((SELECT id FROM brands WHERE slug = 'urban-outfitters'), 'BDG High-Waisted Cargo Pant', 'Utility-inspired cargo pants with multiple pockets. High waist and tapered leg.', 'bottoms', 'pants', 'women', 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=600'),
  ((SELECT id FROM brands WHERE slug = 'urban-outfitters'), 'Vintage Graphic Tee', 'Oversized vintage-inspired graphic tee. Soft cotton with worn-in feel.', 'tops', 'tshirts', 'women', 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=600'),
  ((SELECT id FROM brands WHERE slug = 'urban-outfitters'), 'Satin Mini Slip Dress', 'Slinky slip dress in satin fabric. Adjustable straps and cowl neckline.', 'dresses', 'mini_dresses', 'women', 'https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=600'),

  -- Anthropologie Items
  ((SELECT id FROM brands WHERE slug = 'anthropologie'), 'Odessa Embroidered Maxi Dress', 'Romantic maxi with intricate embroidery. Tiered skirt and flutter sleeves.', 'dresses', 'maxi_dresses', 'women', 'https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=600'),
  ((SELECT id FROM brands WHERE slug = 'anthropologie'), 'Pilcro Denim Jacket', 'Oversized denim jacket with unique wash. Chest pockets and button front.', 'outerwear', 'jackets', 'women', 'https://images.unsplash.com/photo-1551488831-00167b16eac5?w=600'),
  ((SELECT id FROM brands WHERE slug = 'anthropologie'), 'Essential Slim Pant', 'Tailored slim pants in stretch fabric. Ankle length with clean lines.', 'bottoms', 'pants', 'women', 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=600'),
  ((SELECT id FROM brands WHERE slug = 'anthropologie'), 'Lace-Trimmed Camisole', 'Delicate camisole with lace details. Adjustable straps and silk-like fabric.', 'tops', 'tanks', 'women', 'https://images.unsplash.com/photo-1594633313593-bab3825d0caf?w=600')
) AS v(brand_id, canonical_name, description, category, subcategory, gender, primary_image_url)
WHERE NOT EXISTS (SELECT 1 FROM items WHERE canonical_name = v.canonical_name);

-- BASICS & ESSENTIALS (Uniqlo, Arket, Old Navy)
INSERT INTO items (brand_id, canonical_name, description, category, subcategory, gender, primary_image_url)
SELECT * FROM (VALUES
  -- Uniqlo Items
  ((SELECT id FROM brands WHERE slug = 'uniqlo'), 'Heattech Extra Warm Turtleneck', 'Ultra-warming thermal top with moisture-wicking technology. Fitted silhouette.', 'tops', 'thermals', 'women', 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=600'),
  ((SELECT id FROM brands WHERE slug = 'uniqlo'), 'Ultra Stretch Jeans', 'Comfortable jeans with four-way stretch. High-rise skinny fit.', 'bottoms', 'jeans', 'women', 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=600'),
  ((SELECT id FROM brands WHERE slug = 'uniqlo'), 'Supima Cotton T-Shirt', 'Premium cotton tee with crew neck. Soft and durable basics.', 'tops', 'tshirts', 'women', 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600'),
  ((SELECT id FROM brands WHERE slug = 'uniqlo'), 'Ultra Light Down Jacket', 'Packable down jacket with lightweight warmth. Water-repellent finish.', 'outerwear', 'coats', 'women', 'https://images.unsplash.com/photo-1539533018447-63fcce2678e3?w=600'),
  ((SELECT id FROM brands WHERE slug = 'uniqlo'), 'Cashmere Blend Crewneck Sweater', 'Affordable cashmere blend in classic crew neck. Soft and warm.', 'tops', 'sweaters', 'women', 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=600'),
  ((SELECT id FROM brands WHERE slug = 'uniqlo'), 'Airism Seamless Tank Top', 'Smooth seamless tank with moisture control. Perfect base layer.', 'tops', 'tanks', 'women', 'https://images.unsplash.com/photo-1594633313593-bab3825d0caf?w=600'),

  -- Arket Items
  ((SELECT id FROM brands WHERE slug = 'arket'), 'Organic Cotton Shirt', 'Clean-lined shirt in organic cotton. Minimalist design with button front.', 'tops', 'shirts', 'women', 'https://images.unsplash.com/photo-1598032895775-d9d102c5c76d?w=600'),
  ((SELECT id FROM brands WHERE slug = 'arket'), 'Wool Blend Trousers', 'Tailored trousers in wool blend. Straight leg with pressed creases.', 'bottoms', 'pants', 'women', 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=600'),
  ((SELECT id FROM brands WHERE slug = 'arket'), 'Ribbed Merino Sweater', 'Fine-gauge merino wool with ribbed texture. Timeless essential.', 'tops', 'sweaters', 'women', 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=600'),
  ((SELECT id FROM brands WHERE slug = 'arket'), 'Linen T-Shirt', 'Breathable linen tee for warm weather. Relaxed fit and natural fabric.', 'tops', 'tshirts', 'women', 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600')
) AS v(brand_id, canonical_name, description, category, subcategory, gender, primary_image_url)
WHERE NOT EXISTS (SELECT 1 FROM items WHERE canonical_name = v.canonical_name);

-- ACCESSORIES (Bags, Jewelry, Sunglasses)
INSERT INTO items (brand_id, canonical_name, description, category, subcategory, gender, primary_image_url)
SELECT * FROM (VALUES
  -- Kate Spade Items
  ((SELECT id FROM brands WHERE slug = 'kate-spade'), 'Spencer Tote Bag', 'Structured tote in pebbled leather. Multiple compartments and top zip closure.', 'accessories', 'bags', 'women', 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600'),
  ((SELECT id FROM brands WHERE slug = 'kate-spade'), 'Cameron Street Crossbody', 'Compact crossbody with adjustable strap. Signature spade logo hardware.', 'accessories', 'bags', 'women', 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600'),

  -- Coach Items
  ((SELECT id FROM brands WHERE slug = 'coach'), 'Tabby Shoulder Bag', 'Iconic shoulder bag in glove-tanned leather. Flap closure with Coach hardware.', 'accessories', 'bags', 'women', 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600'),
  ((SELECT id FROM brands WHERE slug = 'coach'), 'Willow Tote', 'Spacious tote in refined pebble leather. Interior pockets for organization.', 'accessories', 'bags', 'women', 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600'),

  -- Michael Kors Items
  ((SELECT id FROM brands WHERE slug = 'michael-kors'), 'Jet Set Crossbody', 'Compact crossbody in signature logo print. Adjustable strap with gold hardware.', 'accessories', 'bags', 'women', 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600'),
  ((SELECT id FROM brands WHERE slug = 'michael-kors'), 'Voyager Tote', 'Large tote in saffiano leather. Perfect for work or travel.', 'accessories', 'bags', 'women', 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600'),

  -- Mejuri Items
  ((SELECT id FROM brands WHERE slug = 'mejuri'), 'Bold Hoop Earrings', 'Classic gold hoop earrings in 14k gold vermeil. Everyday luxury jewelry.', 'accessories', 'jewelry', 'women', 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=600'),
  ((SELECT id FROM brands WHERE slug = 'mejuri'), 'Diamond Tennis Necklace', 'Delicate tennis necklace with lab-grown diamonds. Modern classic piece.', 'accessories', 'jewelry', 'women', 'https://images.unsplash.com/photo-1599643477877-530eb83abc8e?w=600'),
  ((SELECT id FROM brands WHERE slug = 'mejuri'), 'Signet Ring', 'Minimalist signet ring in 14k gold. Perfect for stacking.', 'accessories', 'jewelry', 'women', 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=600'),

  -- Baublebar Items
  ((SELECT id FROM brands WHERE slug = 'baublebar'), 'Statement Earrings', 'Bold drop earrings with colorful stones. Lightweight and eye-catching.', 'accessories', 'jewelry', 'women', 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=600'),
  ((SELECT id FROM brands WHERE slug = 'baublebar'), 'Layered Necklace Set', 'Set of three delicate necklaces for layering. Gold-plated chains.', 'accessories', 'jewelry', 'women', 'https://images.unsplash.com/photo-1599643477877-530eb83abc8e?w=600')
) AS v(brand_id, canonical_name, description, category, subcategory, gender, primary_image_url)
WHERE NOT EXISTS (SELECT 1 FROM items WHERE canonical_name = v.canonical_name);

-- LUXURY & DESIGNER ITEMS (select affordable designer pieces)
INSERT INTO items (brand_id, canonical_name, description, category, subcategory, gender, primary_image_url)
SELECT * FROM (VALUES
  -- Tory Burch Items
  ((SELECT id FROM brands WHERE slug = 'tory-burch'), 'Miller Sandals', 'Iconic flat sandals with double-T logo. Leather upper and cushioned footbed.', 'shoes', 'sandals', 'women', 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=600'),
  ((SELECT id FROM brands WHERE slug = 'tory-burch'), 'Ella Tote Bag', 'Structured tote in pebbled leather. Signature logo and interior pockets.', 'accessories', 'bags', 'women', 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600'),
  ((SELECT id FROM brands WHERE slug = 'tory-burch'), 'Kira Chevron Bag', 'Quilted crossbody with chevron pattern. Chain strap and logo hardware.', 'accessories', 'bags', 'women', 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600'),

  -- Rag & Bone Items
  ((SELECT id FROM brands WHERE slug = 'rag-bone'), 'Nina High-Rise Skinny Jeans', 'Premium denim in super skinny fit. High-rise with stretch.', 'bottoms', 'jeans', 'women', 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=600'),
  ((SELECT id FROM brands WHERE slug = 'rag-bone'), 'Classic Leather Jacket', 'Timeless moto jacket in lambskin leather. Asymmetric zip and belt detail.', 'outerwear', 'jackets', 'women', 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600'),

  -- Theory Items
  ((SELECT id FROM brands WHERE slug = 'theory'), 'Good Wool Blazer', 'Tailored blazer in Italian wool. Notched lapels and modern fit.', 'outerwear', 'blazers', 'women', 'https://images.unsplash.com/photo-1591369822096-ffd140ec948f?w=600'),
  ((SELECT id FROM brands WHERE slug = 'theory'), 'Perfect Pant', 'Sleek ankle pants in stretch fabric. Straight leg and polished look.', 'bottoms', 'pants', 'women', 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=600')
) AS v(brand_id, canonical_name, description, category, subcategory, gender, primary_image_url)
WHERE NOT EXISTS (SELECT 1 FROM items WHERE canonical_name = v.canonical_name);

-- ADDITIONAL DIVERSE ITEMS (More brands and categories)
INSERT INTO items (brand_id, canonical_name, description, category, subcategory, gender, primary_image_url)
SELECT * FROM (VALUES
  -- ASOS Items
  ((SELECT id FROM brands WHERE slug = 'asos'), 'Oversized Blazer', 'Relaxed blazer with padded shoulders. Dropped hem and statement fit.', 'outerwear', 'blazers', 'women', 'https://images.unsplash.com/photo-1591369822096-ffd140ec948f?w=600'),
  ((SELECT id FROM brands WHERE slug = 'asos'), 'Pleated Maxi Skirt', 'Flowy maxi skirt with accordion pleats. Elastic waist and full length.', 'bottoms', 'skirts', 'women', 'https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?w=600'),
  ((SELECT id FROM brands WHERE slug = 'asos'), 'Cut-Out Midi Dress', 'Trendy dress with side cut-outs. Bodycon fit and midi length.', 'dresses', 'midi_dresses', 'women', 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=600'),
  ((SELECT id FROM brands WHERE slug = 'asos'), 'Wide Leg Cargo Trousers', 'Utility-inspired pants with cargo pockets. High waist and wide leg.', 'bottoms', 'pants', 'women', 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=600'),
  ((SELECT id FROM brands WHERE slug = 'asos'), 'Faux Fur Jacket', 'Cozy faux fur jacket in oversized fit. Statement outerwear piece.', 'outerwear', 'jackets', 'women', 'https://images.unsplash.com/photo-1551488831-00167b16eac5?w=600'),
  ((SELECT id FROM brands WHERE slug = 'asos'), 'Satin Slip Skirt', 'Luxe slip skirt with bias cut. Midi length in satin fabric.', 'bottoms', 'skirts', 'women', 'https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?w=600'),

  -- Patagonia Items
  ((SELECT id FROM brands WHERE slug = 'patagonia'), 'Better Sweater Fleece Jacket', 'Sustainable fleece jacket with quarter-zip. Fair Trade Certified.', 'outerwear', 'jackets', 'women', 'https://images.unsplash.com/photo-1551488831-00167b16eac5?w=600'),
  ((SELECT id FROM brands WHERE slug = 'patagonia'), 'Down Sweater Hoody', 'Warm down jacket with hood. Recycled materials and packable design.', 'outerwear', 'coats', 'women', 'https://images.unsplash.com/photo-1539533018447-63fcce2678e3?w=600'),
  ((SELECT id FROM brands WHERE slug = 'patagonia'), 'Capilene Cool Daily Shirt', 'Performance shirt with moisture-wicking fabric. UPF protection.', 'activewear', 'tops', 'women', 'https://images.unsplash.com/photo-1588117305388-c2631a279f82?w=600'),
  ((SELECT id FROM brands WHERE slug = 'patagonia'), 'Fjord Flannel Shirt', 'Classic flannel shirt in organic cotton. Button front and chest pocket.', 'tops', 'shirts', 'women', 'https://images.unsplash.com/photo-1598032895775-d9d102c5c76d?w=600'),

  -- Adidas Items
  ((SELECT id FROM brands WHERE slug = 'adidas'), 'Superstar Sneakers', 'Iconic shell-toe sneakers with three stripes. Classic court style.', 'shoes', 'sneakers', 'women', 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600'),
  ((SELECT id FROM brands WHERE slug = 'adidas'), 'Stan Smith Sneakers', 'Minimalist leather sneakers. Timeless tennis-inspired design.', 'shoes', 'sneakers', 'women', 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600'),
  ((SELECT id FROM brands WHERE slug = 'adidas'), 'Three-Stripe Leggings', 'High-rise leggings with iconic stripes. Stretch fabric for movement.', 'activewear', 'leggings', 'women', 'https://images.unsplash.com/photo-1506629082955-511b1aa562c8?w=600'),
  ((SELECT id FROM brands WHERE slug = 'adidas'), 'Trefoil Hoodie', 'Classic hoodie with Trefoil logo. French terry fabric.', 'activewear', 'hoodies', 'women', 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=600'),
  ((SELECT id FROM brands WHERE slug = 'adidas'), 'Tiro Track Pants', 'Tapered track pants with zip pockets. Side stripes and ankle zips.', 'activewear', 'pants', 'women', 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=600'),

  -- Old Navy Items
  ((SELECT id FROM brands WHERE slug = 'old-navy'), 'Pixie Ankle Pants', 'Stretch ankle pants for work or weekend. Mid-rise with slant pockets.', 'bottoms', 'pants', 'women', 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=600'),
  ((SELECT id FROM brands WHERE slug = 'old-navy'), 'Fitted Crew-Neck Tee', 'Classic fitted tee in soft cotton. Everyday essential.', 'tops', 'tshirts', 'women', 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600'),
  ((SELECT id FROM brands WHERE slug = 'old-navy'), 'Rockstar Jeans', 'Super skinny jeans with ultimate stretch. High-rise fit.', 'bottoms', 'jeans', 'women', 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=600'),
  ((SELECT id FROM brands WHERE slug = 'old-navy'), 'Swing Dress', 'Relaxed swing dress in soft jersey. Short sleeves and pockets.', 'dresses', 'casual_dresses', 'women', 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=600'),
  ((SELECT id FROM brands WHERE slug = 'old-navy'), 'Zip-Front Hoodie', 'Comfortable zip hoodie in French terry. Side pockets and relaxed fit.', 'tops', 'sweatshirts', 'women', 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=600'),

  -- Banana Republic Items
  ((SELECT id FROM brands WHERE slug = 'banana-republic'), 'Italian Wool Blend Coat', 'Sophisticated coat in wool blend. Notched collar and belted waist.', 'outerwear', 'coats', 'women', 'https://images.unsplash.com/photo-1539533018447-63fcce2678e3?w=600'),
  ((SELECT id FROM brands WHERE slug = 'banana-republic'), 'Silk Blouse', 'Elegant blouse in pure silk. Button front and long sleeves.', 'tops', 'blouses', 'women', 'https://images.unsplash.com/photo-1564257577144-96f597e498e0?w=600'),
  ((SELECT id FROM brands WHERE slug = 'banana-republic'), 'Sloan Pant', 'Tailored ankle pants with slim fit. Bi-stretch fabric for comfort.', 'bottoms', 'pants', 'women', 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=600'),
  ((SELECT id FROM brands WHERE slug = 'banana-republic'), 'Merino Wool V-Neck Sweater', 'Refined sweater in fine merino wool. Classic V-neck silhouette.', 'tops', 'sweaters', 'women', 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=600'),
  ((SELECT id FROM brands WHERE slug = 'banana-republic'), 'Wrap Midi Dress', 'Sophisticated wrap dress for work. Long sleeves and tie waist.', 'dresses', 'midi_dresses', 'women', 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=600'),

  -- UGG Items
  ((SELECT id FROM brands WHERE slug = 'ugg'), 'Classic Short II Boot', 'Iconic sheepskin boot with suede exterior. Pre-treated to resist water.', 'shoes', 'boots', 'women', 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=600'),
  ((SELECT id FROM brands WHERE slug = 'ugg'), 'Tasman Slipper', 'Cozy slipper with suede upper. Indoor-outdoor versatility.', 'shoes', 'slippers', 'women', 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=600'),
  ((SELECT id FROM brands WHERE slug = 'ugg'), 'Classic Mini II Boot', 'Mini version of the classic boot. Ankle height with signature comfort.', 'shoes', 'boots', 'women', 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=600'),

  -- Topshop Items
  ((SELECT id FROM brands WHERE slug = 'topshop'), 'Joni High Waist Jeans', 'Super skinny jeans with high waist. Stretch denim in black.', 'bottoms', 'jeans', 'women', 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=600'),
  ((SELECT id FROM brands WHERE slug = 'topshop'), 'Satin Camisole', 'Delicate satin cami with lace trim. Adjustable straps.', 'tops', 'tanks', 'women', 'https://images.unsplash.com/photo-1594633313593-bab3825d0caf?w=600'),
  ((SELECT id FROM brands WHERE slug = 'topshop'), 'Boucle Mini Skirt', 'Textured mini skirt in boucle fabric. A-line silhouette.', 'bottoms', 'skirts', 'women', 'https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?w=600'),
  ((SELECT id FROM brands WHERE slug = 'topshop'), 'Longline Duster Coat', 'Statement duster coat in longline length. Open front design.', 'outerwear', 'coats', 'women', 'https://images.unsplash.com/photo-1539533018447-63fcce2678e3?w=600'),

  -- & Other Stories Items
  ((SELECT id FROM brands WHERE slug = 'other-stories'), 'Puff Sleeve Mini Dress', 'Romantic mini dress with dramatic puff sleeves. Button front detail.', 'dresses', 'mini_dresses', 'women', 'https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=600'),
  ((SELECT id FROM brands WHERE slug = 'other-stories'), 'Leather Ankle Boots', 'Sleek ankle boots in smooth leather. Block heel and pointed toe.', 'shoes', 'boots', 'women', 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=600'),
  ((SELECT id FROM brands WHERE slug = 'other-stories'), 'Oversized Cardigan', 'Chunky knit cardigan with oversized fit. Button front and pockets.', 'tops', 'sweaters', 'women', 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=600'),
  ((SELECT id FROM brands WHERE slug = 'other-stories'), 'High-Waist Straight Jeans', 'Classic straight jeans with high rise. Vintage-inspired wash.', 'bottoms', 'jeans', 'women', 'https://images.unsplash.com/photo-1582418702059-97ebafb35d09?w=600'),

  -- Athleta Items
  ((SELECT id FROM brands WHERE slug = 'athleta'), 'Elation 7/8 Tight', 'High-rise workout leggings with Powervita fabric. Moisture-wicking.', 'activewear', 'leggings', 'women', 'https://images.unsplash.com/photo-1506629082955-511b1aa562c8?w=600'),
  ((SELECT id FROM brands WHERE slug = 'athleta'), 'Conscious Crop', 'Cropped workout top in sustainable fabric. Racerback design.', 'activewear', 'tanks', 'women', 'https://images.unsplash.com/photo-1588117305388-c2631a279f82?w=600'),
  ((SELECT id FROM brands WHERE slug = 'athleta'), 'Brooklyn Jogger', 'Comfortable joggers for active days. Tapered leg with cuffs.', 'activewear', 'pants', 'women', 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=600'),
  ((SELECT id FROM brands WHERE slug = 'athleta'), 'Ultimate Stash Jacket', 'Packable running jacket with stash pocket. Water-resistant.', 'activewear', 'jackets', 'women', 'https://images.unsplash.com/photo-1551488831-00167b16eac5?w=600'),

  -- Gymshark Items
  ((SELECT id FROM brands WHERE slug = 'gymshark'), 'Flex High Waisted Leggings', 'Signature leggings with contoured fit. Sweat-wicking fabric.', 'activewear', 'leggings', 'women', 'https://images.unsplash.com/photo-1506629082955-511b1aa562c8?w=600'),
  ((SELECT id FROM brands WHERE slug = 'gymshark'), 'Energy Seamless Crop Top', 'Seamless crop with support. Breathable knit construction.', 'activewear', 'tops', 'women', 'https://images.unsplash.com/photo-1588117305388-c2631a279f82?w=600'),
  ((SELECT id FROM brands WHERE slug = 'gymshark'), 'Adapt Camo Leggings', 'Camo print leggings with sculpting fit. Squat-proof fabric.', 'activewear', 'leggings', 'women', 'https://images.unsplash.com/photo-1506629082955-511b1aa562c8?w=600'),

  -- New Balance Items
  ((SELECT id FROM brands WHERE slug = 'new-balance'), '327 Sneakers', 'Retro-inspired sneakers with oversized N logo. Suede and nylon upper.', 'shoes', 'sneakers', 'women', 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600'),
  ((SELECT id FROM brands WHERE slug = 'new-balance'), '574 Classic Sneakers', 'Iconic lifestyle sneakers with ENCAP cushioning. Timeless design.', 'shoes', 'sneakers', 'women', 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600'),
  ((SELECT id FROM brands WHERE slug = 'new-balance'), '990v5 Sneakers', 'Premium running sneakers made in USA. ENCAP midsole technology.', 'shoes', 'sneakers', 'women', 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600'),

  -- Birkenstock Items
  ((SELECT id FROM brands WHERE slug = 'birkenstock'), 'Arizona Sandals', 'Classic two-strap sandals with contoured footbed. Cork and latex sole.', 'shoes', 'sandals', 'women', 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=600'),
  ((SELECT id FROM brands WHERE slug = 'birkenstock'), 'Boston Clogs', 'Closed-toe clogs with adjustable strap. Suede upper and cork footbed.', 'shoes', 'clogs', 'women', 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=600'),
  ((SELECT id FROM brands WHERE slug = 'birkenstock'), 'Gizeh Sandals', 'Thong sandals with toe post. Ergonomic footbed for comfort.', 'shoes', 'sandals', 'women', 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=600'),

  -- Staud Items
  ((SELECT id FROM brands WHERE slug = 'staud'), 'Moon Bag', 'Sculptural half-moon bag with top handle. Modern and minimalist.', 'accessories', 'bags', 'women', 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600'),
  ((SELECT id FROM brands WHERE slug = 'staud'), 'Shirley Dress', 'Puff sleeve midi dress in cotton poplin. Puff sleeves and tiered skirt.', 'dresses', 'midi_dresses', 'women', 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=600'),
  ((SELECT id FROM brands WHERE slug = 'staud'), 'Bissett Bag', 'Structured tote with bamboo handles. Signature design piece.', 'accessories', 'bags', 'women', 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600'),

  -- Acne Studios Items
  ((SELECT id FROM brands WHERE slug = 'acne-studios'), 'Jensen Boots', 'Minimalist Chelsea boots in smooth leather. Elastic goring and pull tab.', 'shoes', 'boots', 'women', 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=600'),
  ((SELECT id FROM brands WHERE slug = 'acne-studios'), 'Oversized Wool Coat', 'Statement coat in double-faced wool. Dropped shoulders and notched lapels.', 'outerwear', 'coats', 'women', 'https://images.unsplash.com/photo-1539533018447-63fcce2678e3?w=600'),
  ((SELECT id FROM brands WHERE slug = 'acne-studios'), 'Face Patch Sweatshirt', 'Classic crewneck with iconic face patch logo. French terry fabric.', 'tops', 'sweatshirts', 'women', 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=600'),

  -- APC Items
  ((SELECT id FROM brands WHERE slug = 'apc'), 'Petit New Standard Jeans', 'Slim-fit raw denim jeans. Clean styling and high-quality fabric.', 'bottoms', 'jeans', 'women', 'https://images.unsplash.com/photo-1582418702059-97ebafb35d09?w=600'),
  ((SELECT id FROM brands WHERE slug = 'apc'), 'Half Moon Bag', 'Minimalist half-moon crossbody in smooth leather. Adjustable strap.', 'accessories', 'bags', 'women', 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600'),
  ((SELECT id FROM brands WHERE slug = 'apc'), 'Wool Sweater', 'Classic crew neck sweater in fine wool. Minimalist French design.', 'tops', 'sweaters', 'women', 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=600'),

  -- Alice + Olivia Items
  ((SELECT id FROM brands WHERE slug = 'alice-olivia'), 'Delora Dress', 'Feminine fit-and-flare dress with full skirt. Bold print and flattering cut.', 'dresses', 'midi_dresses', 'women', 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=600'),
  ((SELECT id FROM brands WHERE slug = 'alice-olivia'), 'Donald Blazer', 'Structured blazer with strong shoulders. Modern tailoring.', 'outerwear', 'blazers', 'women', 'https://images.unsplash.com/photo-1591369822096-ffd140ec948f?w=600'),
  ((SELECT id FROM brands WHERE slug = 'alice-olivia'), 'High-Waist Pants', 'Wide-leg trousers with high rise. Flattering and feminine.', 'bottoms', 'pants', 'women', 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=600'),

  -- Fabletics Items
  ((SELECT id FROM brands WHERE slug = 'fabletics'), 'PowerHold Leggings', 'High-compression leggings with sculpting fit. Moisture-wicking technology.', 'activewear', 'leggings', 'women', 'https://images.unsplash.com/photo-1506629082955-511b1aa562c8?w=600'),
  ((SELECT id FROM brands WHERE slug = 'fabletics'), 'Sports Bra', 'Medium-support sports bra with mesh panels. Adjustable straps.', 'activewear', 'sports_bras', 'women', 'https://images.unsplash.com/photo-1588117305388-c2631a279f82?w=600'),
  ((SELECT id FROM brands WHERE slug = 'fabletics'), 'Tempo Shorts', 'High-waisted workout shorts with pockets. Stretchy and breathable.', 'activewear', 'shorts', 'women', 'https://images.unsplash.com/photo-1591195853828-11db59a44f6b?w=600'),

  -- Allbirds Items
  ((SELECT id FROM brands WHERE slug = 'allbirds'), 'Tree Runners', 'Sustainable sneakers made from eucalyptus fibers. Breathable and lightweight.', 'shoes', 'sneakers', 'women', 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600'),
  ((SELECT id FROM brands WHERE slug = 'allbirds'), 'Wool Runners', 'Cozy sneakers made from merino wool. Temperature-regulating comfort.', 'shoes', 'sneakers', 'women', 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600'),
  ((SELECT id FROM brands WHERE slug = 'allbirds'), 'Tree Loungers', 'Slip-on shoes in eucalyptus fiber. Perfect for everyday wear.', 'shoes', 'flats', 'women', 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=600'),

  -- More diverse items across brands
  ((SELECT id FROM brands WHERE slug = 'zara'), 'Ribbed Bodysuit', 'Fitted bodysuit in soft ribbed fabric. Snap closure and long sleeves.', 'tops', 'bodysuits', 'women', 'https://images.unsplash.com/photo-1594633313593-bab3825d0caf?w=600'),
  ((SELECT id FROM brands WHERE slug = 'hm'), 'Quilted Puffer Vest', 'Lightweight vest with quilted design. Zip front and side pockets.', 'outerwear', 'vests', 'women', 'https://images.unsplash.com/photo-1539533018447-63fcce2678e3?w=600'),
  ((SELECT id FROM brands WHERE slug = 'mango'), 'Printed Satin Blouse', 'Luxe satin blouse with abstract print. Balloon sleeves and button back.', 'tops', 'blouses', 'women', 'https://images.unsplash.com/photo-1564257577144-96f597e498e0?w=600'),
  ((SELECT id FROM brands WHERE slug = 'everlane'), 'The Pima Micro-Rib Tee', 'Soft micro-rib tee in organic Pima cotton. Perfect fit and comfortable.', 'tops', 'tshirts', 'women', 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600'),
  ((SELECT id FROM brands WHERE slug = 'reformation'), 'Nikita Dress', 'Sustainable mini dress with smocked bodice. Puff sleeves and floral print.', 'dresses', 'mini_dresses', 'women', 'https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=600'),
  ((SELECT id FROM brands WHERE slug = 'cos'), 'Slip-On Mules', 'Modern mules in smooth leather. Block heel and pointed toe.', 'shoes', 'mules', 'women', 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=600'),
  ((SELECT id FROM brands WHERE slug = 'ganni'), 'Printed Wrap Skirt', 'Statement wrap skirt in bold print. Midi length with ruffle hem.', 'bottoms', 'skirts', 'women', 'https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?w=600'),
  ((SELECT id FROM brands WHERE slug = 'nike'), 'Air Force 1 Sneakers', 'Iconic basketball sneakers with Air cushioning. Classic white leather.', 'shoes', 'sneakers', 'women', 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600'),
  ((SELECT id FROM brands WHERE slug = 'lululemon'), 'On The Fly Pant', 'Versatile pants that transition from studio to street. Wrinkle-resistant fabric.', 'bottoms', 'pants', 'women', 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=600'),
  ((SELECT id FROM brands WHERE slug = 'steve-madden'), 'Maxima Platform Sandals', 'Chunky platform sandals with ankle strap. Statement summer shoe.', 'shoes', 'sandals', 'women', 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=600'),
  ((SELECT id FROM brands WHERE slug = 'abercrombie-fitch'), 'Curve Love Jeans', 'Flattering jeans designed for curves. High-rise with extra room.', 'bottoms', 'jeans', 'women', 'https://images.unsplash.com/photo-1582418702059-97ebafb35d09?w=600'),
  ((SELECT id FROM brands WHERE slug = 'madewell'), 'The Essential Tote', 'Large leather tote for everyday use. Interior pockets and snap closure.', 'accessories', 'bags', 'women', 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600'),
  ((SELECT id FROM brands WHERE slug = 'free-people'), 'Smocked Mini Dress', 'Boho mini dress with smocking detail. Flutter sleeves and flowy fit.', 'dresses', 'mini_dresses', 'women', 'https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=600'),
  ((SELECT id FROM brands WHERE slug = 'urban-outfitters'), 'Corduroy Button-Front Skirt', 'Retro corduroy skirt with button front. A-line silhouette and mini length.', 'bottoms', 'skirts', 'women', 'https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?w=600'),
  ((SELECT id FROM brands WHERE slug = 'anthropologie'), 'Embroidered Blouse', 'Romantic blouse with delicate embroidery. Balloon sleeves and tie neck.', 'tops', 'blouses', 'women', 'https://images.unsplash.com/photo-1564257577144-96f597e498e0?w=600'),
  ((SELECT id FROM brands WHERE slug = 'uniqlo'), 'Flannel Shirt', 'Classic flannel in soft cotton. Button front and chest pockets.', 'tops', 'shirts', 'women', 'https://images.unsplash.com/photo-1598032895775-d9d102c5c76d?w=600'),
  ((SELECT id FROM brands WHERE slug = 'nordstrom-rack'), 'Strappy Block Heel Sandals', 'Multi-strap sandals with comfortable block heel. Perfect for events.', 'shoes', 'heels', 'women', 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=600'),
  ((SELECT id FROM brands WHERE slug = 'jcrew'), 'Vintage Cotton Tee', 'Soft vintage-wash tee in relaxed fit. Crew neck and comfortable cotton.', 'tops', 'tshirts', 'women', 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600'),
  ((SELECT id FROM brands WHERE slug = 'gap'), 'Logo Crewneck Sweatshirt', 'Classic crewneck with vintage Gap logo. French terry fabric.', 'tops', 'sweatshirts', 'women', 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=600'),
  ((SELECT id FROM brands WHERE slug = 'asos'), 'Velvet Mini Dress', 'Luxe velvet dress with bodycon fit. Long sleeves and scoop neck.', 'dresses', 'mini_dresses', 'women', 'https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=600')
) AS v(brand_id, canonical_name, description, category, subcategory, gender, primary_image_url)
WHERE NOT EXISTS (SELECT 1 FROM items WHERE canonical_name = v.canonical_name);

-- =====================================================
-- ITEM_LISTINGS - Price and Availability Data
-- =====================================================

DO $$
DECLARE
  item_record RECORD;
  brand_record RECORD;
  base_price DECIMAL(10,2);
  has_sale BOOLEAN;
  sale_price DECIMAL(10,2);
BEGIN
  -- Add listings for all items
  FOR item_record IN SELECT i.id, i.brand_id, i.canonical_name, b.price_tier
                     FROM items i
                     JOIN brands b ON i.brand_id = b.id
                     WHERE NOT EXISTS (SELECT 1 FROM item_listings WHERE item_id = i.id)
  LOOP
    -- Set base price based on brand tier and item type
    CASE item_record.price_tier
      WHEN 'budget' THEN base_price := 15.00 + (RANDOM() * 35);
      WHEN 'mid' THEN base_price := 40.00 + (RANDOM() * 80);
      WHEN 'premium' THEN base_price := 100.00 + (RANDOM() * 150);
      WHEN 'luxury' THEN base_price := 200.00 + (RANDOM() * 500);
      ELSE base_price := 50.00;
    END CASE;

    -- Adjust price for item category
    IF item_record.canonical_name ILIKE '%coat%' OR item_record.canonical_name ILIKE '%jacket%' THEN
      base_price := base_price * 1.5;
    ELSIF item_record.canonical_name ILIKE '%bag%' OR item_record.canonical_name ILIKE '%boot%' THEN
      base_price := base_price * 1.3;
    ELSIF item_record.canonical_name ILIKE '%dress%' THEN
      base_price := base_price * 1.2;
    END IF;

    -- Randomly decide if item is on sale (30% chance)
    has_sale := RANDOM() < 0.3;
    IF has_sale THEN
      sale_price := base_price * (0.6 + RANDOM() * 0.2); -- 20-40% off
    ELSE
      sale_price := NULL;
    END IF;

    -- Insert listing
    INSERT INTO item_listings (
      item_id,
      retailer_id,
      product_url,
      price,
      sale_price,
      in_stock,
      sizes_available,
      colors_available
    ) VALUES (
      item_record.id,
      item_record.brand_id,
      'https://example.com/products/' || item_record.id,
      ROUND(base_price, 2),
      CASE WHEN sale_price IS NOT NULL THEN ROUND(sale_price, 2) ELSE NULL END,
      true,
      '["XS","S","M","L","XL"]'::jsonb,
      '["Black","White","Navy","Beige"]'::jsonb
    ) ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

-- =====================================================
-- FEED_MODULE_ITEMS - Link Items to Feed Modules
-- =====================================================

-- Get feed module IDs first
DO $$
DECLARE
  abercrombie_ski_module_id INTEGER;
  nordstrom_rack_spring_module_id INTEGER;
  reformation_vacation_module_id INTEGER;
  everlane_conscious_module_id INTEGER;
  item_counter INTEGER;
  item_id_var INTEGER;
BEGIN
  -- Get module IDs
  SELECT id INTO abercrombie_ski_module_id FROM feed_modules WHERE title LIKE 'Abercrombie Ski Edit%' LIMIT 1;
  SELECT id INTO nordstrom_rack_spring_module_id FROM feed_modules WHERE title LIKE 'Nordstrom Rack Spring%' LIMIT 1;
  SELECT id INTO reformation_vacation_module_id FROM feed_modules WHERE title LIKE 'Reformation Vacation%' LIMIT 1;
  SELECT id INTO everlane_conscious_module_id FROM feed_modules WHERE title LIKE '%Conscious%' LIMIT 1;

  -- Abercrombie Ski Edit Module - add 12 items
  IF abercrombie_ski_module_id IS NOT NULL THEN
    item_counter := 0;
    FOR item_id_var IN
      SELECT id FROM items
      WHERE brand_id = (SELECT id FROM brands WHERE slug = 'abercrombie-fitch')
      ORDER BY RANDOM()
      LIMIT 12
    LOOP
      item_counter := item_counter + 1;
      INSERT INTO feed_module_items (module_id, item_id, display_order, is_featured)
      VALUES (abercrombie_ski_module_id, item_id_var, item_counter, item_counter <= 2)
      ON CONFLICT (module_id, item_id) DO NOTHING;
    END LOOP;
  END IF;

  -- Nordstrom Rack Spring Dresses - add dresses and spring items
  IF nordstrom_rack_spring_module_id IS NOT NULL THEN
    item_counter := 0;
    FOR item_id_var IN
      SELECT id FROM items
      WHERE brand_id = (SELECT id FROM brands WHERE slug = 'nordstrom-rack')
        OR (category = 'dresses' AND brand_id IN (
          SELECT id FROM brands WHERE price_tier IN ('mid', 'premium')
        ))
      ORDER BY RANDOM()
      LIMIT 15
    LOOP
      item_counter := item_counter + 1;
      INSERT INTO feed_module_items (module_id, item_id, display_order, is_featured)
      VALUES (nordstrom_rack_spring_module_id, item_id_var, item_counter, item_counter <= 3)
      ON CONFLICT (module_id, item_id) DO NOTHING;
    END LOOP;
  END IF;

  -- Reformation Vacation - add vacation-appropriate items
  IF reformation_vacation_module_id IS NOT NULL THEN
    item_counter := 0;
    FOR item_id_var IN
      SELECT id FROM items
      WHERE brand_id = (SELECT id FROM brands WHERE slug = 'reformation')
        OR (subcategory IN ('midi_dresses', 'shorts', 'sandals', 'jumpsuits'))
      ORDER BY RANDOM()
      LIMIT 10
    LOOP
      item_counter := item_counter + 1;
      INSERT INTO feed_module_items (module_id, item_id, display_order, is_featured)
      VALUES (reformation_vacation_module_id, item_id_var, item_counter, item_counter <= 2)
      ON CONFLICT (module_id, item_id) DO NOTHING;
    END LOOP;
  END IF;

  -- Everlane Conscious Collection
  IF everlane_conscious_module_id IS NOT NULL THEN
    item_counter := 0;
    FOR item_id_var IN
      SELECT id FROM items
      WHERE brand_id = (SELECT id FROM brands WHERE slug = 'everlane')
      ORDER BY RANDOM()
      LIMIT 12
    LOOP
      item_counter := item_counter + 1;
      INSERT INTO feed_module_items (module_id, item_id, display_order, is_featured)
      VALUES (everlane_conscious_module_id, item_id_var, item_counter, item_counter <= 2)
      ON CONFLICT (module_id, item_id) DO NOTHING;
    END LOOP;
  END IF;

  -- Fill remaining feed modules with relevant items
  FOR item_counter IN
    SELECT fm.id as module_id, fm.brand_id, fm.module_type
    FROM feed_modules fm
    WHERE NOT EXISTS (
      SELECT 1 FROM feed_module_items WHERE module_id = fm.id
    )
  LOOP
    -- Add 8-12 items to each empty module
    INSERT INTO feed_module_items (module_id, item_id, display_order, is_featured)
    SELECT
      item_counter.module_id,
      i.id,
      ROW_NUMBER() OVER (ORDER BY RANDOM()),
      ROW_NUMBER() OVER (ORDER BY RANDOM()) <= 2
    FROM items i
    WHERE i.brand_id = item_counter.brand_id
    ORDER BY RANDOM()
    LIMIT 10
    ON CONFLICT (module_id, item_id) DO NOTHING;
  END LOOP;

END $$;

-- =====================================================
-- SUMMARY AND STATISTICS
-- =====================================================

-- Display summary of what was created
DO $$
DECLARE
  total_items INTEGER;
  total_listings INTEGER;
  total_module_items INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_items FROM items;
  SELECT COUNT(*) INTO total_listings FROM item_listings;
  SELECT COUNT(*) INTO total_module_items FROM feed_module_items;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'COMPREHENSIVE SEED DATA LOADED';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total Items: %', total_items;
  RAISE NOTICE 'Total Listings: %', total_listings;
  RAISE NOTICE 'Total Feed Module Items: %', total_module_items;
  RAISE NOTICE '========================================';
END $$;
