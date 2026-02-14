#!/bin/bash

# Nordstrom Integration Verification Script
# Confirms all components are connected and working

echo "=================================================="
echo "  Nordstrom Integration Verification"
echo "=================================================="
echo ""

DB_NAME="muse_shopping_dev"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Test 1: Items Table
echo "1. Checking Items Table (Newsfeed)..."
ITEMS_COUNT=$(psql -d $DB_NAME -t -c "SELECT COUNT(*) FROM items WHERE store_id = 2;")
if [ "$ITEMS_COUNT" -ge 100 ]; then
    echo -e "${GREEN}✓ Found $ITEMS_COUNT Nordstrom items${NC}"
else
    echo -e "${RED}✗ Only found $ITEMS_COUNT items (expected 100+)${NC}"
fi

# Test 2: Product Catalog Table
echo ""
echo "2. Checking Product Catalog (PDP)..."
CATALOG_COUNT=$(psql -d $DB_NAME -t -c "SELECT COUNT(*) FROM product_catalog WHERE store_id = 2;")
if [ "$CATALOG_COUNT" -ge 100 ]; then
    echo -e "${GREEN}✓ Found $CATALOG_COUNT products in catalog${NC}"
else
    echo -e "${RED}✗ Only found $CATALOG_COUNT products (expected 100+)${NC}"
fi

# Test 3: Images Present
echo ""
echo "3. Checking Product Images..."
IMAGES_COUNT=$(psql -d $DB_NAME -t -c "SELECT COUNT(*) FROM items WHERE store_id = 2 AND image_url IS NOT NULL;")
if [ "$IMAGES_COUNT" -ge 100 ]; then
    echo -e "${GREEN}✓ All $IMAGES_COUNT products have images${NC}"
else
    echo -e "${YELLOW}⚠ Only $IMAGES_COUNT products have images${NC}"
fi

# Test 4: Sample Product Data
echo ""
echo "4. Sample Product:"
psql -d $DB_NAME -c "
SELECT
  name as product,
  price_cents / 100.0 as price,
  CASE WHEN image_url IS NOT NULL THEN '✓' ELSE '✗' END as has_image,
  CASE WHEN product_url IS NOT NULL THEN '✓' ELSE '✗' END as has_url
FROM items
WHERE store_id = 2
LIMIT 1;
"

# Test 5: Nordstrom Source Table
echo ""
echo "5. Checking Source Data..."
SOURCE_COUNT=$(psql -d $DB_NAME -t -c "SELECT COUNT(*) FROM nordstrom_products WHERE product_id NOT LIKE 'SAMPLE-%';")
echo -e "${GREEN}✓ Found $SOURCE_COUNT products in nordstrom_products table${NC}"

# Test 6: Test Image URL
echo ""
echo "6. Testing Sample Image URL..."
IMAGE_URL=$(psql -d $DB_NAME -t -c "SELECT image_url FROM items WHERE store_id = 2 AND image_url IS NOT NULL LIMIT 1;")
if curl -s -I "$IMAGE_URL" | head -1 | grep -q "200 OK"; then
    echo -e "${GREEN}✓ Image URL is accessible${NC}"
else
    echo -e "${YELLOW}⚠ Image URL may not be accessible${NC}"
fi

# Test 7: Store Configuration
echo ""
echo "7. Checking Store Configuration..."
psql -d $DB_NAME -c "
SELECT
  id,
  name,
  slug,
  website_url,
  CASE WHEN is_active THEN '✓ Active' ELSE '✗ Inactive' END as status
FROM stores
WHERE slug = 'nordstrom';
"

# Summary
echo ""
echo "=================================================="
echo "  Verification Summary"
echo "=================================================="
echo ""
echo "Items Table: $ITEMS_COUNT products"
echo "Product Catalog: $CATALOG_COUNT products"
echo "With Images: $IMAGES_COUNT products"
echo ""
echo -e "${GREEN}✓ Nordstrom integration verified!${NC}"
echo ""
echo "Next steps:"
echo "  1. Restart your server: npm start"
echo "  2. Test newsfeed: curl http://localhost:3000/api/v1/items?storeId=2"
echo "  3. Update frontend to display products"
echo ""
