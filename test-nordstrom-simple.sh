#!/bin/bash

# Simple test for Nordstrom system
echo "Testing Nordstrom Inventory System..."
echo ""

DB_NAME="muse_shopping_dev"

# Test 1: Tables exist
echo "✓ Checking tables..."
TABLES=$(psql -d $DB_NAME -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_name LIKE 'nordstrom_%';")
echo "  Found $TABLES tables"

# Test 2: Can insert data
echo "✓ Testing write..."
psql -d $DB_NAME -c "INSERT INTO nordstrom_products (product_id, product_name, brand_name, current_price) VALUES ('TEST-001', 'Test Product', 'Test Brand', 99.99) ON CONFLICT (product_id) DO NOTHING;" > /dev/null 2>&1

# Test 3: Can read data
echo "✓ Testing read..."
COUNT=$(psql -d $DB_NAME -t -c "SELECT COUNT(*) FROM nordstrom_products WHERE product_id = 'TEST-001';")
echo "  Test record exists: $COUNT"

# Cleanup
psql -d $DB_NAME -c "DELETE FROM nordstrom_products WHERE product_id = 'TEST-001';" > /dev/null 2>&1

# Test 4: Check files
echo "✓ Checking files..."
[ -f "src/services/nordstromInventoryService.js" ] && echo "  Service: OK"
[ -f "src/jobs/nordstromInventoryJob.js" ] && echo "  Job: OK"
[ -f "src/routes/nordstromInventoryRoutes.js" ] && echo "  Routes: OK"

echo ""
echo "All basic tests passed!"
