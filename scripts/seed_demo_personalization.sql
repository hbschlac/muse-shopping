-- Seed Demo Personalization Data for User 97 (Test User)
-- This creates realistic personalization data for demo purposes

-- 1. Create Style Profile (100D) with sample preferences
INSERT INTO style_profiles (
  user_id,
  confidence,
  total_events,
  style_layers,
  price_layers,
  category_layers,
  color_palette_layers,
  brand_tier_layers,
  occasion_layers,
  season_layers
) VALUES (
  97,
  0.75,  -- 75% confidence
  142,   -- 142 total interactions
  '{"casual": 0.8, "streetwear": 0.6, "minimalist": 0.7, "modern": 0.5}'::jsonb,
  '{"affordable": 0.4, "mid_range": 0.8, "premium": 0.3}'::jsonb,
  '{"tops": 0.9, "dresses": 0.7, "pants": 0.6, "shoes": 0.8, "accessories": 0.5}'::jsonb,
  '{"black": 0.9, "white": 0.8, "beige": 0.7, "navy": 0.6, "olive": 0.5}'::jsonb,
  '{"contemporary": 0.8, "affordable_luxury": 0.6, "fast_fashion": 0.4}'::jsonb,
  '{"everyday": 0.9, "work": 0.6, "weekend": 0.8, "date_night": 0.4}'::jsonb,
  '{"all_season": 0.7, "spring_summer": 0.6, "fall_winter": 0.8}'::jsonb
)
ON CONFLICT (user_id) DO UPDATE SET
  confidence = EXCLUDED.confidence,
  total_events = EXCLUDED.total_events,
  style_layers = EXCLUDED.style_layers,
  price_layers = EXCLUDED.price_layers,
  category_layers = EXCLUDED.category_layers,
  color_palette_layers = EXCLUDED.color_palette_layers,
  brand_tier_layers = EXCLUDED.brand_tier_layers,
  occasion_layers = EXCLUDED.occasion_layers,
  season_layers = EXCLUDED.season_layers;

-- 2. Create/Update Shopper Profile
INSERT INTO shopper_profiles (
  user_id,
  favorite_categories,
  common_sizes,
  price_range,
  interests,
  total_orders,
  total_spent_cents,
  avg_order_value_cents,
  created_at,
  updated_at
) VALUES (
  97,
  ARRAY['Tops', 'Dresses', 'Shoes', 'Accessories'],
  ARRAY['S', 'M', '6', '7'],
  '{"min": 3000, "max": 15000, "avg": 8500}'::jsonb,
  ARRAY['Sustainable Fashion', 'Minimalist Style', 'Quality Basics'],
  12,
  102000,
  8500,
  NOW(),
  NOW()
)
ON CONFLICT (user_id) DO UPDATE SET
  favorite_categories = EXCLUDED.favorite_categories,
  common_sizes = EXCLUDED.common_sizes,
  price_range = EXCLUDED.price_range,
  interests = EXCLUDED.interests,
  total_orders = EXCLUDED.total_orders,
  total_spent_cents = EXCLUDED.total_spent_cents,
  avg_order_value_cents = EXCLUDED.avg_order_value_cents,
  updated_at = NOW();

-- 3. Create Engagement Metrics
INSERT INTO shopper_engagement_metrics (
  user_id,
  sessions_count,
  products_viewed,
  products_clicked,
  items_added_to_cart,
  purchases_count,
  avg_session_duration,
  total_time_spent,
  last_active_at,
  created_at,
  updated_at
) VALUES (
  97,
  48,      -- 48 sessions
  256,     -- 256 products viewed
  84,      -- 84 products clicked
  32,      -- 32 items added to cart
  12,      -- 12 purchases
  420,     -- 7 minutes avg session
  20160,   -- 336 minutes total (5.6 hours)
  NOW(),
  NOW() - INTERVAL '30 days',
  NOW()
)
ON CONFLICT (user_id) DO UPDATE SET
  sessions_count = EXCLUDED.sessions_count,
  products_viewed = EXCLUDED.products_viewed,
  products_clicked = EXCLUDED.products_clicked,
  items_added_to_cart = EXCLUDED.items_added_to_cart,
  purchases_count = EXCLUDED.purchases_count,
  avg_session_duration = EXCLUDED.avg_session_duration,
  total_time_spent = EXCLUDED.total_time_spent,
  last_active_at = EXCLUDED.last_active_at,
  updated_at = NOW();

-- 4. Create Shopper Segments
INSERT INTO shopper_segments (id, name, description, criteria, is_active)
VALUES
  (1, 'Style Conscious', 'Users who value fashion and style', '{}'::jsonb, true),
  (2, 'Quality Seeker', 'Users who prefer quality over quantity', '{}'::jsonb, true),
  (3, 'Frequent Shopper', 'Users who shop regularly', '{}'::jsonb, true),
  (4, 'Trend Follower', 'Users who follow current trends', '{}'::jsonb, true),
  (5, 'Budget Conscious', 'Users who seek value and deals', '{}'::jsonb, true)
ON CONFLICT (id) DO NOTHING;

-- 5. Assign User to Segments
INSERT INTO shopper_segment_membership (user_id, segment_id, score, assigned_at)
VALUES
  (97, 1, 0.85, NOW()),  -- Style Conscious
  (97, 2, 0.78, NOW()),  -- Quality Seeker
  (97, 3, 0.65, NOW())   -- Frequent Shopper
ON CONFLICT (user_id, segment_id) DO UPDATE SET
  score = EXCLUDED.score,
  assigned_at = NOW();

-- 6. Add some sample activity events
INSERT INTO shopper_activity (
  user_id,
  activity_type,
  activity_category,
  page_url,
  session_id,
  created_at
) VALUES
  (97, 'product_view', 'browse', '/product/123', 'session_' || gen_random_uuid(), NOW() - INTERVAL '2 hours'),
  (97, 'product_view', 'browse', '/product/456', 'session_' || gen_random_uuid(), NOW() - INTERVAL '1 hour'),
  (97, 'add_to_cart', 'purchase_intent', '/product/123', 'session_' || gen_random_uuid(), NOW() - INTERVAL '1 hour'),
  (97, 'click', 'engagement', '/newsfeed', 'session_' || gen_random_uuid(), NOW() - INTERVAL '30 minutes'),
  (97, 'product_view', 'browse', '/product/789', 'session_' || gen_random_uuid(), NOW() - INTERVAL '15 minutes')
ON CONFLICT DO NOTHING;

-- Summary
SELECT
  'Demo personalization data created for user_id 97' as message,
  (SELECT confidence FROM style_profiles WHERE user_id = 97) as style_confidence,
  (SELECT total_events FROM style_profiles WHERE user_id = 97) as total_events,
  (SELECT sessions_count FROM shopper_engagement_metrics WHERE user_id = 97) as sessions,
  (SELECT COUNT(*) FROM shopper_segment_membership WHERE user_id = 97) as segments_count;
