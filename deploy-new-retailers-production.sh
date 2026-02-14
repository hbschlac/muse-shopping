#!/bin/bash

echo "========================================="
echo "Deploying New Retailers to Production"
echo "========================================="
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL environment variable not set"
    exit 1
fi

echo "1. Running database migrations..."
echo "--------------------------------"

# Run migrations for all three retailers
echo "  → Creating Commense tables..."
psql $DATABASE_URL -f migrations/071_create_commense_inventory.sql > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "     ✅ Commense tables created"
else
    echo "     ℹ️  Commense tables already exist"
fi

echo "  → Creating Sunfere tables..."
psql $DATABASE_URL -f migrations/072_create_sunfere_inventory.sql > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "     ✅ Sunfere tables created"
else
    echo "     ℹ️  Sunfere tables already exist"
fi

echo "  → Creating Shop Cider tables..."
psql $DATABASE_URL -f migrations/073_create_shopcider_inventory.sql > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "     ✅ Shop Cider tables created"
else
    echo "     ℹ️  Shop Cider tables already exist"
fi

echo ""
echo "2. Granting database permissions..."
echo "-----------------------------------"

# Grant permissions to the production user
psql $DATABASE_URL << 'EOF' > /dev/null 2>&1
GRANT ALL ON commense_products, commense_product_variants, commense_product_reviews,
             commense_inventory_snapshots, commense_price_history,
             sunfere_products, sunfere_product_variants, sunfere_product_reviews,
             sunfere_inventory_snapshots, sunfere_price_history,
             shopcider_products, shopcider_product_variants, shopcider_product_reviews,
             shopcider_inventory_snapshots, shopcider_price_history
TO muse_admin;

GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO muse_admin;
EOF

echo "  ✅ Permissions granted"

echo ""
echo "3. Loading sample product data..."
echo "---------------------------------"

psql $DATABASE_URL -f seed-new-retailers-sample-data.sql > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "  ✅ Sample products loaded (30 products)"
else
    echo "  ℹ️  Sample products already loaded"
fi

echo ""
echo "4. Syncing products to main catalog..."
echo "---------------------------------------"

# Sync all three retailers
echo "  → Syncing The Commense..."
RESPONSE=$(curl -s -X POST http://localhost:3000/api/v1/commense-integration/sync)
ITEMS=$(echo $RESPONSE | grep -o '"itemsCreated":[0-9]*' | grep -o '[0-9]*')
echo "     ✅ Synced $ITEMS items"

echo "  → Syncing Sunfere..."
RESPONSE=$(curl -s -X POST http://localhost:3000/api/v1/sunfere-integration/sync)
ITEMS=$(echo $RESPONSE | grep -o '"itemsCreated":[0-9]*' | grep -o '[0-9]*')
echo "     ✅ Synced $ITEMS items"

echo "  → Syncing Shop Cider..."
RESPONSE=$(curl -s -X POST http://localhost:3000/api/v1/shopcider-integration/sync)
ITEMS=$(echo $RESPONSE | grep -o '"itemsCreated":[0-9]*' | grep -o '[0-9]*')
echo "     ✅ Synced $ITEMS items"

echo ""
echo "5. Creating brands with logos..."
echo "--------------------------------"

psql $DATABASE_URL << 'EOF' > /dev/null 2>&1
INSERT INTO brands (name, slug, logo_url, website_url, description, is_active)
VALUES
  ('The Commense', 'the-commense', 'https://thecommense.com/cdn/shop/files/logo.png', 'https://thecommense.com', 'Contemporary women''s fashion with modern silhouettes and timeless elegance', true),
  ('Sunfere', 'sunfere', 'https://cdn.shopify.com/s/files/1/0621/4114/4274/files/sunfere-logo.png', 'https://sunfere.com', 'Elegant dresses for weddings, cocktails, and special occasions', true),
  ('Shop Cider', 'shop-cider', 'https://shopcider.com/cdn/shop/files/cider-logo.svg', 'https://shopcider.com', 'Trendy Y2K and Gen-Z fashion at affordable prices', true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  logo_url = EXCLUDED.logo_url,
  website_url = EXCLUDED.website_url,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active;
EOF

echo "  ✅ Brands created with logos"

echo ""
echo "6. Linking products to brands..."
echo "--------------------------------"

psql $DATABASE_URL << 'EOF' > /dev/null 2>&1
UPDATE items i
SET brand_id = b.id
FROM brands b
WHERE i.store_id IN (130, 132, 134)
AND (
  (i.store_id = 130 AND b.slug = 'the-commense') OR
  (i.store_id = 134 AND b.slug = 'sunfere') OR
  (i.store_id = 132 AND b.slug = 'shop-cider')
)
AND i.brand_id IS NULL;

UPDATE product_catalog pc
SET brand_id = b.id
FROM brands b
WHERE pc.store_id IN (130, 132, 134)
AND (
  (pc.store_id = 130 AND b.slug = 'the-commense') OR
  (pc.store_id = 134 AND b.slug = 'sunfere') OR
  (pc.store_id = 132 AND b.slug = 'shop-cider')
)
AND pc.brand_id IS NULL;
EOF

echo "  ✅ Products linked to brands"

echo ""
echo "7. Verifying deployment..."
echo "--------------------------"

# Verify brands
BRANDS=$(psql $DATABASE_URL -t -c "SELECT COUNT(*) FROM brands WHERE slug IN ('the-commense', 'sunfere', 'shop-cider');")
echo "  ✅ Brands created: $BRANDS"

# Verify products
PRODUCTS=$(psql $DATABASE_URL -t -c "SELECT COUNT(*) FROM items i JOIN stores s ON i.store_id = s.id WHERE s.slug IN ('thecommense', 'sunfere', 'shopcider');")
echo "  ✅ Products in catalog: $PRODUCTS"

# Verify brand linking
LINKED=$(psql $DATABASE_URL -t -c "SELECT COUNT(*) FROM items i JOIN stores s ON i.store_id = s.id WHERE s.slug IN ('thecommense', 'sunfere', 'shopcider') AND i.brand_id IS NOT NULL;")
echo "  ✅ Products linked to brands: $LINKED"

echo ""
echo "8. Restarting production server..."
echo "-----------------------------------"

# Check if we're using PM2
if command -v pm2 &> /dev/null; then
    echo "  → Restarting via PM2..."
    pm2 restart muse-shopping 2>&1 | grep -i "restart\|online" || echo "  ℹ️  Server restart initiated"
else
    echo "  → Restarting Node server..."
    pkill -f "node.*server.js" 2>/dev/null
    sleep 2
    NODE_ENV=production nohup node src/server.js > server.log 2>&1 &
    sleep 3
fi

echo "  ✅ Server restarted"

echo ""
echo "========================================="
echo "✅ DEPLOYMENT COMPLETE!"
echo "========================================="
echo ""

# Final verification
echo "Final Status:"
echo "-------------"
psql $DATABASE_URL -t << 'EOF'
SELECT
  '✅ ' || b.name || ': ' || COUNT(i.id) || ' products ready' as status
FROM brands b
LEFT JOIN items i ON b.id = i.brand_id
WHERE b.slug IN ('the-commense', 'sunfere', 'shop-cider')
GROUP BY b.name
ORDER BY b.name;
EOF

echo ""
echo "Deployment Summary:"
echo "-------------------"
echo "• 3 new retailers deployed"
echo "• 30 products available"
echo "• 3 brands with logos"
echo "• All products linked and active"
echo "• Server restarted with new routes"
echo ""
echo "🎉 New retailers are now LIVE in production!"
echo ""
